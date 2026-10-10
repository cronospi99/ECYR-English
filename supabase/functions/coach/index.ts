// =============================================================================
// ECYR English — AI Coach
// -----------------------------------------------------------------------------
// Conversation partner, sentence corrector, grammar explainer and writing
// examiner for the platform. Uses the same Gemini key as the IELTS Simulator's
// `gemini` function (secret GEMINI_API_KEY); the browser never sees it.
//
// DEPLOY
//   supabase functions deploy coach --no-verify-jwt
//   supabase secrets set GEMINI_API_KEY=AIza…            (shared with `gemini`)
//   Dashboard alternative: Edge Functions → Deploy new function → Via editor,
//   name it exactly `coach`, paste this file, and turn OFF "Verify JWT"
//   (the function checks the session itself — works with old and new keys).
//
// OPTIONAL SECRETS
//   GEMINI_MODEL          model to use (default gemini-3.5-flash-lite)
//   COACH_DAILY_LIMIT     calls per user per day (default 40, max 500)
//   COACH_REQUIRE_CLASS   "on" → only teachers and students who joined a class
//
// Requires supabase/migrations/05_ecyr_platform.sql (bump_ai_usage).
// =============================================================================

const GEMINI_BASE = Deno.env.get("GEMINI_API_BASE") || "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const MAX_BODY_BYTES = 64 * 1024;
const LEVELS = new Set(["A1", "A2", "B1", "B2", "C1", "C2"]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
const fail = (status: number, message: string, code = "server") => reply(status, { error: { message, code } });

type Mode = "chat" | "correct" | "explain" | "writing-feedback";
type Msg = { role: "user" | "model"; text: string };

function systemPrompt(mode: Mode, level: string): string {
  const base =
    `You are ECYR Coach, the AI tutor of ECYR English, a platform for Spanish-speaking learners (mostly from Colombia). ` +
    `The learner's CEFR level is ${level}. Adapt vocabulary, sentence length and grammar to ${level}. ` +
    `Be warm, encouraging and concise. Use Markdown sparingly (short lists, **bold** for key forms). Never invent facts about the learner.`;
  switch (mode) {
    case "chat":
      return base +
        ` MODE: conversation practice. Reply in English only, in 2–4 short sentences, and end with ONE natural follow-up question. ` +
        `If the learner's last message has a clear mistake, add a final line starting with "💡 Tip:" that gives the corrected sentence and a 5–10 word reason (the reason may be in Spanish).`;
    case "correct":
      return base +
        ` MODE: correction. The learner sends a sentence or paragraph. Answer in Spanish with: ` +
        `1) "**Versión corregida:**" followed by the corrected English text; ` +
        `2) "**Correcciones:**" a bullet list "error → corrección — explicación breve"; ` +
        `3) one tip to sound more natural at ${level}. If the text is already correct, say so and offer one more natural alternative.`;
    case "explain":
      return base +
        ` MODE: grammar explanation. Explain in Spanish, clearly and briefly, with 3–5 English examples suited to ${level}, ` +
        `a common mistake Spanish speakers make, and finish with 2 quick practice questions (answers hidden at the end under "Respuestas").`;
    case "writing-feedback":
      return base +
        ` MODE: writing examiner. The message contains TASK, CRITERIA and MY TEXT. Answer in Spanish with: ` +
        `"**Puntuación:** X/10" (relative to ${level}); "**Lo que funciona:**" 2–3 bullets; ` +
        `"**Criterios:**" each criterion marked ✅ or ⚠️ with a short comment; ` +
        `"**Errores:**" bullets "frase original → corrección — por qué"; ` +
        `and "**Versión mejorada:**" a corrected, slightly improved version of the text that stays at ${level}.`;
  }
}

type Caller = { id: string; role: string; teacher_id: string | null; auth: string; apikey: string };

async function whoIsCalling(req: Request): Promise<Caller | Response> {
  const url = Deno.env.get("SUPABASE_URL");
  const auth = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!url) return fail(500, "SUPABASE_URL is not set for this function.");
  if (!/^Bearer\s+\S+/i.test(auth)) return fail(401, "Inicia sesión para usar el AI Coach.", "signed_out");

  const u = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
  if (!u.ok) return fail(401, "Tu sesión expiró. Vuelve a iniciar sesión.", "signed_out");
  const user = await u.json();
  if (!user?.id) return fail(401, "Inicia sesión para usar el AI Coach.", "signed_out");

  const p = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,teacher_id`, {
    headers: { Authorization: auth, apikey, Accept: "application/json" },
  });
  const rows = p.ok ? await p.json() : [];
  const me = Array.isArray(rows) ? rows[0] : null;
  if (!me) return fail(403, "No se pudo leer tu perfil. Recarga la página.", "no_profile");
  return { id: user.id, role: me.role, teacher_id: me.teacher_id, auth, apikey };
}

async function countCall(c: Caller): Promise<Response | null> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const limit = Math.max(1, Math.min(500, Number(Deno.env.get("COACH_DAILY_LIMIT") || 40)));
  const r = await fetch(`${url}/rest/v1/rpc/bump_ai_usage`, {
    method: "POST",
    headers: { Authorization: c.auth, apikey: c.apikey, "Content-Type": "application/json" },
    body: JSON.stringify({ p_limit: limit }),
  });
  if (r.ok) return null;
  const t = await r.text();
  if (/daily AI limit/i.test(t)) {
    return fail(429, `Has usado tus ${limit} mensajes de hoy con el coach. ¡Vuelve mañana!`, "limit");
  }
  // Missing migration: don't block learning, but say so in the logs.
  console.error("bump_ai_usage failed:", r.status, t.slice(0, 300));
  return null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "POST only.");
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) return fail(413, "El mensaje es demasiado largo.");

  const who = await whoIsCalling(req);
  if (who instanceof Response) return who;

  const requireClass = (Deno.env.get("COACH_REQUIRE_CLASS") || "").trim().toLowerCase() === "on";
  if (requireClass && who.role !== "teacher" && !who.teacher_id) {
    return fail(403, "El AI Coach es para docentes y estudiantes de una clase. Únete con el código de tu docente en Perfil.", "no_class");
  }

  const key = (Deno.env.get("GEMINI_API_KEY") || "").trim();
  if (!key) return fail(503, "Falta configurar la clave GEMINI_API_KEY en Supabase → Edge Functions → Secrets.", "no_key");

  let body: { messages?: Msg[]; mode?: Mode; level?: string };
  try {
    body = await req.json();
  } catch {
    return fail(400, "La solicitud no es JSON válido.");
  }

  const mode: Mode = ["chat", "correct", "explain", "writing-feedback"].includes(body.mode as string) ? (body.mode as Mode) : "chat";
  const level = LEVELS.has(String(body.level)) ? String(body.level) : "B1";
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => m && (m.role === "user" || m.role === "model") && typeof m.text === "string" && m.text.trim())
    .slice(-16)
    .map((m) => ({ role: m.role, parts: [{ text: m.text.slice(0, 6000) }] }));
  if (!messages.length || messages[messages.length - 1].role !== "user") return fail(400, "No hay mensaje para responder.");

  const limited = await countCall(who);
  if (limited) return limited;

  const model = (Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL).trim();
  const r = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": key },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemPrompt(mode, level) }] },
      contents: messages,
      generationConfig: { temperature: mode === "chat" ? 0.8 : 0.4, maxOutputTokens: 1200 },
    }),
  });
  const data = await r.json().catch(() => null);
  if (!r.ok) {
    const msg = data?.error?.message || `Gemini respondió ${r.status}.`;
    return fail(r.status === 429 ? 429 : 502, r.status === 429 ? "La IA está saturada en este momento. Intenta en un minuto." : msg, r.status === 429 ? "limit" : "server");
  }
  const text = (data?.candidates?.[0]?.content?.parts ?? [])
    .map((p: { text?: string }) => p.text || "")
    .join("")
    .trim();
  return reply(200, { text: text || "Lo siento, no pude generar una respuesta. ¿Puedes reformular?" });
});
