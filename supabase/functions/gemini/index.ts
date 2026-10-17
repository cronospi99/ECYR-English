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
//   Optional secret   GEMINI_MODEL   (default gemini-3.5-flash-lite)
//   Optional secret   GEMINI_MODELS  comma-separated extra models the app may
//                                    ask for; anything else gets GEMINI_MODEL.
//   Optional secret   GEMINI_TTS_MODELS  the voice models for AI-voiced
//                                    Listening tests, tried in order
//                                    (default gemini-3.1-flash-tts-preview,
//                                    gemini-2.5-flash-preview-tts).
//   Optional secret   GEMINI_TTS_STUDENTS = on   lets students make voices too.
//                                    Off by default: the free voice quota is
//                                    small (a few tests a day), so the teacher
//                                    makes the tests and saves them to the
//                                    class library, where students use them.
//   Optional secret   VOICE_DAILY_LIMIT  new natural-voice clips each user
//                                    may generate per day (default 150).
//                                    Clips already in the shared cache are
//                                    free and unlimited.
//   The natural voice (op "voice") needs supabase/migrations/10_voice_cache.sql
//   (public bucket voice-cache + the per-user counter). It uploads with the
//   SUPABASE_SERVICE_ROLE_KEY that Supabase injects into every function —
//   nothing to set by hand, and it never leaves this function.
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
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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

// The voice models, in the order they are tried. Each has its own quota, so
// when the first is used up for the day the next still answers.
const DEFAULT_TTS_MODELS = ["gemini-3.1-flash-tts-preview", "gemini-2.5-flash-preview-tts"];
function ttsModels(): string[] {
  const set = (Deno.env.get("GEMINI_TTS_MODELS") || "").split(",").map((m) => m.trim()).filter(Boolean);
  return set.length ? set : DEFAULT_TTS_MODELS;
}
// Gemini's voices have one-word names ("Kore", "Charon"); anything else is
// dropped rather than forwarded.
function voiceName(v: unknown): string {
  const s = typeof v === "string" ? v.trim() : "";
  return /^[A-Z][a-z]{2,20}$/.test(s) ? s : "Kore";
}
function speechConfig(speakers: unknown): unknown {
  const list = Array.isArray(speakers) ? speakers.slice(0, 2) : [];
  if (list.length === 2) {
    return {
      multiSpeakerVoiceConfig: {
        speakerVoiceConfigs: list.map((sp: any) => ({
          speaker: String(sp && sp.speaker || "").replace(/[^\p{L}\p{N} .'-]/gu, "").slice(0, 40) || "Speaker",
          voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName(sp && sp.voice) } },
        })),
      },
    };
  }
  return { voiceConfig: { prebuiltVoiceConfig: { voiceName: voiceName(list[0] && (list[0] as any).voice) } } };
}

// ------------------------------------------------------------ natural voice --
// Short texts (a word, a sentence, a coach reply) read by one of a small cast
// of voices. Every clip is stored once in the public bucket voice-cache under
// the SHA-256 of persona + accent + text, so the whole platform shares it: the
// second learner who hears "How are you today?" from Emma costs nothing.
// The key leaves the model out on purpose — changing GEMINI_TTS_MODELS keeps
// the cache. Bump VOICE_VERSION to re-record everything.
const VOICE_BUCKET = "voice-cache";
const VOICE_VERSION = "v1";
const VOICE_MAX_CHARS = 600;
// Mirrors PERSONAS in src/lib/voice.ts. The server owns the mapping so a
// caller can only ask for these six, never an arbitrary voice or prompt.
const PERSONAS: Record<string, { voice: string; accent: string }> = {
  emma: { voice: "Kore", accent: "American" },
  liam: { voice: "Puck", accent: "American" },
  olivia: { voice: "Aoede", accent: "British" },
  harry: { voice: "Charon", accent: "British" },
  ruby: { voice: "Leda", accent: "Australian" },
  jack: { voice: "Orus", accent: "Australian" },
};

async function sha256Hex(s: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function fromBase64(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
}
// Gemini answers with raw 16-bit mono PCM ("audio/L16;codec=pcm;rate=24000");
// a 44-byte RIFF header makes it a WAV every browser plays.
function pcmToWav(pcm: Uint8Array, rate: number): Uint8Array {
  const out = new Uint8Array(44 + pcm.length);
  const v = new DataView(out.buffer);
  const tag = (o: number, t: string) => { for (let i = 0; i < 4; i++) out[o + i] = t.charCodeAt(i); };
  tag(0, "RIFF"); v.setUint32(4, 36 + pcm.length, true); tag(8, "WAVE");
  tag(12, "fmt "); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
  v.setUint32(24, rate, true); v.setUint32(28, rate * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
  tag(36, "data"); v.setUint32(40, pcm.length, true);
  out.set(pcm, 44);
  return out;
}

// Storage and the counter are written with the service-role key Supabase
// injects into every function. Users have no write access to either.
function serviceHeaders(): Record<string, string> | null {
  const k = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  return k ? { Authorization: `Bearer ${k}`, apikey: k } : null;
}
async function voiceCounter(userId: string, delta: 1 | -1): Promise<"ok" | "limit"> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const h = serviceHeaders();
  if (!h) return "ok";
  const limit = Math.max(1, Math.min(5000, Number(Deno.env.get("VOICE_DAILY_LIMIT") || 150) || 150));
  const r = await fetch(`${url}/rest/v1/rpc/bump_voice_usage`, {
    method: "POST",
    headers: { ...h, "Content-Type": "application/json" },
    body: JSON.stringify({ p_user: userId, p_limit: limit, p_delta: delta }),
  });
  if (r.ok) return "ok";
  const t = await r.text();
  if (/daily voice limit/i.test(t)) return "limit";
  // Missing migration: don't block learning, but say so in the logs.
  console.error("bump_voice_usage failed:", r.status, t.slice(0, 300));
  return "ok";
}

async function naturalVoice(who: { id: string }, body: any, key: string): Promise<Response> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const text = (typeof body.text === "string" ? body.text : "").replace(/\s+/g, " ").trim();
  if (!text) return fail(400, "Nothing to read aloud.");
  if (text.length > VOICE_MAX_CHARS) return fail(400, `The natural voice reads up to ${VOICE_MAX_CHARS} characters at a time.`, "too_long");
  const id = typeof body.persona === "string" && PERSONAS[body.persona] ? body.persona : "emma";
  const persona = PERSONAS[id];
  const hash = await sha256Hex(`${VOICE_VERSION}|${id}|${persona.accent}|${text}`);
  const path = `${VOICE_BUCKET}/${hash}.wav`;
  const publicUrl = `${url}/storage/v1/object/public/${path}`;
  const h = serviceHeaders();

  // 1. Already recorded? (Asked of Storage directly, not through the CDN.)
  const head = await fetch(h ? `${url}/storage/v1/object/${path}` : publicUrl, { method: "HEAD", headers: h || {} }).catch(() => null);
  if (head && head.ok) return reply(200, { url: publicUrl, key: hash, cached: true });

  // 2. Record it: counted against the user's day, refunded if Google fails.
  if (!key) {
    return fail(503, "The class's Gemini key has not been set yet.", "no_key");
  }
  if ((await voiceCounter(who.id, 1)) === "limit") {
    return fail(429, "You've used today's natural-voice clips. The device voice takes over until tomorrow.", "voice_limit");
  }
  const payload = JSON.stringify({
    contents: [{ parts: [{ text: `Say clearly, at a relaxed pace, in a natural, warm ${persona.accent} English accent: ${text}` }] }],
    generationConfig: { responseModalities: ["AUDIO"], speechConfig: speechConfig([{ voice: persona.voice }]) },
  });
  let audio: any = null;
  let lastStatus = 502, lastMessage = "";
  for (const model of ttsModels()) {
    const r = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: payload,
    });
    const data = await r.json().catch(() => null);
    if (r.ok) {
      const parts = data?.candidates?.[0]?.content?.parts ?? [];
      audio = parts.map((p: any) => p?.inlineData || p?.inline_data).find((d: any) => d && d.data) || null;
      if (audio) break;
      lastStatus = 502; lastMessage = "Gemini returned no audio.";
      continue;
    }
    lastStatus = r.status; lastMessage = data?.error?.message || `Gemini answered ${r.status}.`;
    if (r.status !== 404 && r.status !== 429 && r.status !== 400) break;
  }
  if (!audio || !audio.data) {
    await voiceCounter(who.id, -1);
    return lastStatus === 429
      ? fail(429, "The class's voice quota is used up for now.", "tts_quota")
      : fail(502, lastMessage || "The voice could not be generated.", "tts_failed");
  }

  const raw = fromBase64(audio.data);
  const mime = String(audio.mimeType || audio.mime_type || "");
  const wav = /wav/i.test(mime) ? raw : pcmToWav(raw, Number((/rate=(\d+)/i.exec(mime) || [])[1]) || 24000);

  // 3. Keep it for everyone. If Storage refuses (bucket missing), the clip is
  //    still returned inline so this learner hears it anyway.
  if (h) {
    const up = await fetch(`${url}/storage/v1/object/${path}`, {
      method: "POST",
      headers: { ...h, "Content-Type": "audio/wav", "x-upsert": "true", "cache-control": "max-age=31536000" },
      body: wav.buffer as ArrayBuffer, // exactly the WAV: both arrays are allocated to size
    }).catch((e) => { console.error("voice upload failed:", e); return null; });
    if (up && up.ok) return reply(200, { url: publicUrl, key: hash, cached: false });
    if (up) console.error("voice upload failed:", up.status, (await up.text()).slice(0, 300));
  } else {
    console.error("SUPABASE_SERVICE_ROLE_KEY is not available: voice clips are not cached.");
  }
  return reply(200, { url: null, key: hash, cached: false, audio: toBase64(wav), mimeType: "audio/wav" });
}

type Caller = { id: string; role: string; teacher_id: string | null };

// Asks Supabase who this session belongs to, then reads their own profile row
// with their own token — so row-level security answers, not this function.
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
  return { id: user.id, role: me.role, teacher_id: me.teacher_id };
}

Deno.serve(async (req: Request) => {
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

  let body: any;
  try { body = await req.json(); } catch { return fail(400, "The request was not valid JSON."); }

  const key = (Deno.env.get("GEMINI_API_KEY") || "").trim();
  const op = body && body.op;

  // Lets the app decide, once per sign-in, whether to offer AI features on
  // the shared key — without spending a call to Google to find out.
  if (op === "status") {
    return reply(200, { ok: true, configured: !!key, model: pickModel(null), role: who.role });
  }
  // The natural voice for short texts (words, sentences, coach replies): for
  // teachers and class members alike — the shared cache keeps it cheap.
  // Before the key check, so clips already recorded play even without one.
  if (op === "voice") return naturalVoice(who, body, key);

  if (!key) {
    return fail(503, "The class's Gemini key has not been set yet. Your teacher adds it under Supabase → Edge Functions → Secrets as GEMINI_API_KEY.", "no_key");
  }

  if (op === "models") {
    const r = await fetch(`${GEMINI_BASE}/models?pageSize=1000`, { headers: { "x-goog-api-key": key } });
    return passThrough(r, await r.text());
  }

  if (op === "generate") {
    if (!Array.isArray(body.contents) || !body.contents.length) return fail(400, "Nothing to send to Gemini.");
    const model = pickModel(body.model);
    const r = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({ contents: body.contents }),
    });
    return passThrough(r, await r.text());
  }

  // A section of an AI-voiced Listening test, read aloud. Answers with
  // Google's own response: base64 PCM in candidates[0].content.parts[0].
  if (op === "speak") {
    const studentsToo = (Deno.env.get("GEMINI_TTS_STUDENTS") || "").trim().toLowerCase() === "on";
    if (who.role !== "teacher" && !studentsToo) {
      return fail(403,
        "The class's AI voices are made by your teacher, who saves the tests to the class library. You'll hear this test in your device's voice instead.",
        "tts_teacher_only");
    }
    const text = typeof body.text === "string" ? body.text.slice(0, 12000) : "";
    if (!text.trim()) return fail(400, "Nothing to read aloud.");
    const payload = JSON.stringify({
      contents: [{ parts: [{ text }] }],
      generationConfig: { responseModalities: ["AUDIO"], speechConfig: speechConfig(body.speakers) },
    });
    let last: Response | null = null, lastText = "";
    for (const model of ttsModels()) {
      const r = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": key },
        body: payload,
      });
      const t = await r.text();
      if (r.ok) return passThrough(r, t);
      last = r; lastText = t;
      // A model this key cannot use, or whose quota is spent: try the next.
      if (r.status !== 404 && r.status !== 429 && r.status !== 400) break;
    }
    return passThrough(last as Response, lastText);
  }

  return fail(400, "Unknown request.");
});
