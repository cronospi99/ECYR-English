// =============================================================================
// IELTS Academic Simulator — the class's shared Gemini key
// -----------------------------------------------------------------------------
// One Gemini key, held here as a server secret, used on behalf of every teacher
// and every student in a class. The browser never sees it: the app sends the
// request here with the signed-in user's session, and this forwards it to
// Google with the key attached.
//
// Why not just put the key in a file the site loads? Because anything a page
// loads, every visitor can read — and a Gemini key committed to a public repo is
// found by scanners within minutes and revoked by Google. Here it is a secret.
//
// Who may use it: a teacher, or a student who has joined a class. Not "anyone
// with an account": with email confirmation off (as the README recommends for
// classrooms) anybody on the internet can make one, and the key is yours.
// A student without a class — or anyone who prefers — can still paste a key of
// their own in ⚙ AI engine, and that key is then used instead of this one.
//
// DEPLOY (no command line needed)
//   Supabase dashboard → Edge Functions → Deploy a new function → Via editor.
//   Name it exactly   gemini   paste this file, deploy.
//   Then Edge Functions → Secrets → add   GEMINI_API_KEY = AIza…
//   Optional secret   GEMINI_DAILY_LIMIT  generations per user per day (default 60).
//   Optional secret   ALLOWED_ORIGINS  comma-separated sites allowed to call this
//                                    function (default: production + localhost).
//   Requires migration 22 (bump_gemini_usage).
//   Optional secret   GEMINI_MODEL   (default gemini-3.5-flash-lite)
//   Optional secret   GEMINI_MODELS  comma-separated extra models the app may
//                                    ask for; anything else gets GEMINI_MODEL.
//   Text only: this function never asks Gemini for audio. Voices are made by
//   the app's own /api/tts (Vercel), and audio sent here is only listened to
//   (transcription and speaking feedback), never generated.
//   With the CLI instead:  supabase functions deploy gemini
//                          supabase secrets set GEMINI_API_KEY=AIza…
//
// If the app reports "Invalid JWT": turn OFF "Verify JWT with legacy secret" /
// "Enforce JWT verification" for this function. It checks the session itself,
// below, which works with both the old and the new Supabase keys.
// =============================================================================

const GEMINI_BASE = Deno.env.get("GEMINI_API_BASE") || "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
// Listening generation sends a whole section's audio inline. The app already
// refuses files over 18 MB, which is ~24 MB once base64-encoded.
const MAX_BODY_BYTES = 30 * 1024 * 1024;

const CORS = {
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// ---- CORS: only the origins in ALLOWED_ORIGINS (comma-separated secret) ----------
// Default: the production site + local dev. Set ALLOWED_ORIGINS to replace the list
// (e.g. "https://ecyr-english.vercel.app,https://www.tudominio.com").
const ALLOWED_ORIGINS = (Deno.env.get("ALLOWED_ORIGINS") ||
  "https://ecyr-english.vercel.app,http://localhost:5173,http://127.0.0.1:5173,http://localhost:4173")
  .split(",").map((o) => o.trim().replace(/\/+$/, "")).filter(Boolean);

async function withCors(req: Request, handle: (req: Request) => Promise<Response>): Promise<Response> {
  const origin = req.headers.get("Origin");
  if (origin && !ALLOWED_ORIGINS.includes(origin)) {
    return new Response(JSON.stringify({ error: { message: "Origin not allowed.", code: "origin" } }), {
      status: 403,
      headers: { "Content-Type": "application/json", Vary: "Origin" },
    });
  }
  const res = await handle(req);
  if (origin) res.headers.set("Access-Control-Allow-Origin", origin);
  res.headers.set("Vary", "Origin");
  return res;
}

// Every error is shaped like one of Google's ({error:{message}}), so the app
// reads it the same way whichever side it came from.
function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
function fail(status: number, message: string, code?: string): Response {
  return reply(status, { error: { message, code: code || null } });
}
function passThrough(r: Response, text: string): Response {
  return new Response(text, { status: r.status, headers: { ...CORS, "Content-Type": "application/json" } });
}

// The model is the key owner's decision, not the caller's: without this a
// student could point the class key at the most expensive model there is.
function pickModel(asked: unknown): string {
  const fallback = (Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL).trim();
  const allowed = new Set(
    [fallback, ...(Deno.env.get("GEMINI_MODELS") || "").split(",")].map((m) => m.trim()).filter(Boolean),
  );
  const m = typeof asked === "string" ? asked.trim() : "";
  return allowed.has(m) ? m : fallback;
}

type Caller = { id: string; role: string; teacher_id: string | null; auth: string; apikey: string };

// Asks Supabase who this session belongs to, then reads their own profile row
// with their own token — so row-level security answers, not this function.
// Counts one generation for the caller (bump_gemini_usage, migration 22) and
// refuses past the daily limit. GEMINI_DAILY_LIMIT secret, default 60 per user.
async function countCall(c: Caller): Promise<Response | null> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const limit = Math.max(1, Math.min(2000, Number(Deno.env.get("GEMINI_DAILY_LIMIT") || 60) || 60));
  const r = await fetch(`${url}/rest/v1/rpc/bump_gemini_usage`, {
    method: "POST",
    headers: { Authorization: c.auth, apikey: c.apikey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_limit: limit }),
  });
  if (r.ok) return null;
  const t = await r.text();
  if (/daily Gemini limit/i.test(t)) {
    return fail(429, `You have used your ${limit} AI requests for today on the class key. Try again tomorrow, or add your own Gemini key in ⚙ AI engine.`, "limit");
  }
  // Migration 22 not applied yet: do not block the class, but say so in the logs.
  if (/PGRST202|Could not find the function|does not exist/i.test(t)) {
    console.error("bump_gemini_usage is missing (apply migration 22):", t.slice(0, 200));
    return null;
  }
  console.error("bump_gemini_usage failed:", r.status, t.slice(0, 300));
  return fail(503, "Could not check your daily AI limit. Try again in a moment.", "limit_check");
}

// Reads the body counting the bytes that really arrive (content-length can be
// absent or a lie) and stops as soon as it passes the limit. null = too large.
async function readBodyLimited(req: Request, max: number): Promise<Uint8Array | null> {
  if (!req.body) return new Uint8Array(0);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let off = 0;
  for (const c of chunks) { out.set(c, off); off += c.byteLength; }
  return out;
}

async function whoIsCalling(req: Request): Promise<Caller | Response> {
  const url = Deno.env.get("SUPABASE_URL");
  const auth = req.headers.get("Authorization") || "";
  // supabase-js sends the project's public key as `apikey` on every call; the
  // env var covers a client that does not.
  const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!url) return fail(500, "SUPABASE_URL is not set for this function.");
  if (!/^Bearer\s+\S+/i.test(auth)) return fail(401, "Sign in to use the class's AI key.", "signed_out");

  const u = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
  if (!u.ok) return fail(401, "Your session has expired. Sign in again.", "signed_out");
  const user = await u.json();
  if (!user || !user.id) return fail(401, "Sign in to use the class's AI key.", "signed_out");

  const p = await fetch(
    `${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,teacher_id`,
    { headers: { Authorization: auth, apikey, Accept: "application/json" } },
  );
  const rows = p.ok ? await p.json() : [];
  const me = Array.isArray(rows) ? rows[0] : null;
  if (!me) return fail(403, "Your profile could not be read. Reload the page and try again.", "no_profile");
  return { id: user.id, role: me.role, teacher_id: me.teacher_id, auth, apikey };
}

async function handle(req: Request): Promise<Response> {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "POST only.");

  const size = Number(req.headers.get("content-length") || 0);
  if (size > MAX_BODY_BYTES) {
    return fail(413, "That request is too large for the shared key — compress the audio (mono, 64 kbps MP3) and try again.");
  }

  const who = await whoIsCalling(req);
  if (who instanceof Response) return who;
  if (who.role !== "teacher" && !who.teacher_id) {
    return fail(403,
      "The class's AI key is for teachers and for students who have joined a class. Join yours with its class code, or add your own Gemini key in ⚙ AI engine.",
      "no_class");
  }

  const raw = await readBodyLimited(req, MAX_BODY_BYTES);
  if (raw === null) {
    return fail(413, "That request is too large for the shared key — compress the audio (mono, 64 kbps MP3) and try again.");
  }
  let body: any;
  try { body = JSON.parse(new TextDecoder().decode(raw)); } catch { return fail(400, "The request was not valid JSON."); }

  const key = (Deno.env.get("GEMINI_API_KEY") || "").trim();
  const op = body && body.op;

  // Lets the app decide, once per sign-in, whether to offer AI features on
  // the shared key — without spending a call to Google to find out.
  if (op === "status") {
    return reply(200, { ok: true, configured: !!key, model: pickModel(null), role: who.role });
  }
  if (!key) {
    return fail(503, "The class's Gemini key has not been set yet. Your teacher adds it under Supabase → Edge Functions → Secrets as GEMINI_API_KEY.", "no_key");
  }

  if (op === "models") {
    const r = await fetch(`${GEMINI_BASE}/models?pageSize=1000`, { headers: { "x-goog-api-key": key } });
    return passThrough(r, await r.text());
  }

  if (op === "generate") {
    if (!Array.isArray(body.contents) || !body.contents.length) return fail(400, "Nothing to send to Gemini.");
    const limited = await countCall(who);
    if (limited) return limited;
    const model = pickModel(body.model);
    const r = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      // Only the contents are forwarded (no generationConfig), so the answer is always text.
      body: JSON.stringify({ contents: body.contents }),
    });
    return passThrough(r, await r.text());
  }

  return fail(400, "Unknown request.");
}

Deno.serve((req: Request) => withCors(req, handle));
