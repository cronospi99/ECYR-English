// =============================================================================
// ECYR English — AI Coach
// -----------------------------------------------------------------------------
// Conversation partner, sentence corrector, grammar explainer, writing
// examiner and live voice-conversation partner (mode "voice") for the platform. Uses the same Gemini key as the IELTS Simulator's
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
// MODE "voice" (AI Coach → Conversación por voz): the learner's turn is a
// speech-recognition transcript; the answer is JSON
//   { text, reply, english_version, tip_es, student_spanish }
// where `reply` is plain spoken English for the natural voice. Each turn
// counts as one coach message toward COACH_DAILY_LIMIT.
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

type Mode = "chat" | "correct" | "explain" | "writing-feedback" | "voice";
const MODES: Mode[] = ["chat", "correct", "explain", "writing-feedback", "voice"];
type Msg = { role: "user" | "model"; text: string };

function systemPrompt(mode: Mode, level: string, spanish = false): string {
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
    case "voice":
      return `You are ECYR Coach, a friendly English conversation partner on a live voice call with a Spanish-speaking learner from Colombia. ` +
        `Their CEFR level is ${level}: adapt vocabulary, speed of ideas and grammar to ${level}. Never invent facts about the learner. ` +
        `Each learner turn is a speech-recognition transcript: it may lack punctuation or contain recognition errors, so interpret it charitably ` +
        `and never comment on spelling, punctuation or capital letters. ` +
        `Your "reply" is read aloud by a voice: plain spoken English only — no Markdown, no emojis, no lists, no stage directions — ` +
        `1 to 3 short sentences (at most 45 words) that react to what they said, and it ALWAYS ends with ONE natural question that keeps the conversation going. ` +
        `WHEN THE LEARNER SPEAKS SPANISH (all or part of the turn${spanish ? "; they have said they are answering in Spanish now" : ""}): ` +
        `set "student_spanish" to true; set "english_version" to a natural way to say what they meant in English at ${level} (one sentence); ` +
        `set "tip_es" to ONE short sentence in Spanish explaining the key word or structure; and make "reply" say ` +
        `"You can say: <english_version>", invite them to repeat it in English (e.g. "Try saying it!"), then continue in English with your question. ` +
        `WHEN THE LEARNER SPEAKS ENGLISH with one clear mistake that matters for meaning or is typical of Spanish speakers: ` +
        `set "english_version" to their sentence corrected and "tip_es" to the reason in Spanish (max 15 words), and in "reply" just recast it naturally ` +
        `(e.g. "Oh, you went to the beach!") without lecturing. Otherwise leave "english_version" and "tip_es" empty. ` +
        `If the turn is empty or unintelligible, kindly ask them to say it again. ` +
        `Answer ONLY with JSON: {"reply":"","english_version":"","tip_es":"","student_spanish":false}.`;
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

// The model is asked for JSON; this still copes with a fenced or chatty answer,
// and strips anything a voice should not read aloud.
function voiceTurn(raw: string) {
  let out: Record<string, unknown> = {};
  try {
    out = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
  } catch {
    out = { reply: raw };
  }
  const clean = (v: unknown, max: number) =>
    (typeof v === "string" ? v : "")
      .replace(/[*_#`>~\u200d\ufe0f]|\p{Extended_Pictographic}/gu, "")
      .replace(/\s+/g, " ")
      .replace(/\s+([.,!?;:])/g, "$1")
      .trim()
      .slice(0, max);
  const said = clean(out.reply, 600) || "Sorry, I didn't catch that. Could you say it again?";
  return {
    text: said,
    reply: said,
    english_version: clean(out.english_version, 300),
    tip_es: clean(out.tip_es, 300),
    student_spanish: out.student_spanish === true,
  };
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

  let body: { messages?: Msg[]; mode?: Mode; level?: string; spanish?: boolean };
  try {
    body = await req.json();
  } catch {
    return fail(400, "La solicitud no es JSON válido.");
  }

  const mode: Mode = MODES.includes(body.mode as Mode) ? (body.mode as Mode) : "chat";
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
      systemInstruction: { parts: [{ text: systemPrompt(mode, level, body.spanish === true) }] },
      contents: messages,
      generationConfig: mode === "voice"
        ? {
          temperature: 0.7,
          maxOutputTokens: 800,
          responseMimeType: "application/json",
          responseSchema: {
            type: "OBJECT",
            properties: {
              reply: { type: "STRING" },
              english_version: { type: "STRING" },
              tip_es: { type: "STRING" },
              student_spanish: { type: "BOOLEAN" },
            },
            required: ["reply"],
          },
        }
        : { temperature: mode === "chat" ? 0.8 : 0.4, maxOutputTokens: 1200 },
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
  if (mode === "voice") return reply(200, voiceTurn(text));
  return reply(200, { text: text || "Lo siento, no pude generar una respuesta. ¿Puedes reformular?" });
});
