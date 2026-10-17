// =============================================================================
// ECYR English — AI questions for real podcast episodes
// -----------------------------------------------------------------------------
// Práctica → Listening → Podcasts streams episodes of real shows from Apple
// Podcasts. This function writes a listening quiz for one episode: it asks
// Apple's catalog for the episode's audio URL (never trusting a URL sent by the
// browser), downloads the first part of the MP3, sends it to Gemini with a
// prompt for the requested CEFR level, checks the JSON it returns and stores it
// in `podcast_quizzes`, where everyone in the platform can read it. A quiz is
// made once per (episode, level); later calls return the stored one without
// calling Gemini.
//
// Uses the same Gemini key as the `gemini` and `coach` functions (secret
// GEMINI_API_KEY); the browser never sees it. Writes with the service role key,
// which Supabase injects into every Edge Function (SUPABASE_SERVICE_ROLE_KEY).
//
// DEPLOY
//   supabase functions deploy podcast --no-verify-jwt
//   Dashboard alternative: Edge Functions → Deploy new function → Via editor,
//   name it exactly `podcast`, paste this file, and turn OFF "Verify JWT"
//   (the function checks the session itself — works with old and new keys).
//   Requires supabase/migrations/11_podcasts.sql.
//
// OPTIONAL SECRETS
//   GEMINI_MODEL          model to use (default gemini-3.5-flash-lite), shared
//   PODCAST_GEMINI_MODEL  a different model just for podcast quizzes
//   PODCAST_DAILY_LIMIT   quizzes a user may generate per day (default 10, max 100)
//   PODCAST_MAX_MB        audio sent to Gemini, in MB (default 12, max 18)
//   PODCAST_STUDENTS      "off" → only teachers generate (students still use
//                         the quizzes their teacher made)
// =============================================================================

const GEMINI_BASE = Deno.env.get("GEMINI_API_BASE") || "https://generativelanguage.googleapis.com/v1beta";
const DEFAULT_MODEL = "gemini-3.5-flash-lite";
const ITUNES = "https://itunes.apple.com";
const MB = 1024 * 1024;
const MAX_AUDIO = Math.round(Math.max(1, Math.min(18, Number(Deno.env.get("PODCAST_MAX_MB") || 12))) * MB);
// Podcast audio usually sits behind analytics prefixes (podtrac → chartable →
// the host's CDN), each one a redirect. Every hop is re-validated.
const MAX_REDIRECTS = 5;
const MAX_BODY_BYTES = 4 * 1024;
const LEVELS = new Set(["A1", "A2", "B1", "B2", "C1"]);

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Errors are shaped like Google's ({error:{message,code}}), like the other functions.
function reply(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });
}
const fail = (status: number, message: string, code = "server") => reply(status, { error: { message, code } });

class Stop extends Error {
  constructor(public status: number, message: string, public code = "server") {
    super(message);
  }
}

// ------------------------------------------------------------------- caller --

type Caller = { id: string; role: string; teacher_id: string | null };

// Asks Supabase who this session belongs to, then reads their own profile row
// with their own token — so row-level security answers, not this function.
async function whoIsCalling(req: Request): Promise<Caller | Response> {
  const url = Deno.env.get("SUPABASE_URL");
  const auth = req.headers.get("Authorization") || "";
  const apikey = req.headers.get("apikey") || Deno.env.get("SUPABASE_ANON_KEY") || "";
  if (!url) return fail(500, "SUPABASE_URL is not set for this function.");
  if (!/^Bearer\s+\S+/i.test(auth)) return fail(401, "Inicia sesión para generar preguntas con IA.", "signed_out");

  const u = await fetch(`${url}/auth/v1/user`, { headers: { Authorization: auth, apikey } });
  if (!u.ok) return fail(401, "Tu sesión expiró. Vuelve a iniciar sesión.", "signed_out");
  const user = await u.json();
  if (!user || !user.id) return fail(401, "Inicia sesión para generar preguntas con IA.", "signed_out");

  const p = await fetch(`${url}/rest/v1/profiles?id=eq.${encodeURIComponent(user.id)}&select=role,teacher_id`, {
    headers: { Authorization: auth, apikey, Accept: "application/json" },
  });
  const rows = p.ok ? await p.json() : [];
  const me = Array.isArray(rows) ? rows[0] : null;
  if (!me) return fail(403, "No se pudo leer tu perfil. Recarga la página.", "no_profile");
  return { id: user.id, role: me.role, teacher_id: me.teacher_id };
}

// ------------------------------------------------------------- service role --

function serviceHeaders(): Record<string, string> {
  const key = (Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "").trim();
  if (!key) throw new Stop(500, "SUPABASE_SERVICE_ROLE_KEY is not available to this function.");
  // New-style secret keys (sb_secret_…) are not JWTs: they go only in `apikey`.
  return key.startsWith("sb_") ? { apikey: key } : { apikey: key, Authorization: `Bearer ${key}` };
}
const rest = (path: string) => `${Deno.env.get("SUPABASE_URL")}/rest/v1/${path}`;

async function storedQuiz(episodeKey: string, level: string): Promise<unknown | null> {
  const r = await fetch(
    rest(`podcast_quizzes?episode_key=eq.${encodeURIComponent(episodeKey)}&level=eq.${level}&select=quiz&limit=1`),
    { headers: { ...serviceHeaders(), Accept: "application/json" } },
  );
  if (!r.ok) {
    console.error("podcast_quizzes read failed:", r.status, (await r.text()).slice(0, 300));
    return null;
  }
  const rows = await r.json();
  return Array.isArray(rows) && rows[0] ? rows[0].quiz : null;
}

async function countGeneration(userId: string): Promise<void> {
  const limit = Math.max(1, Math.min(100, Number(Deno.env.get("PODCAST_DAILY_LIMIT") || 10)));
  const r = await fetch(rest("rpc/bump_podcast_usage"), {
    method: "POST",
    headers: { ...serviceHeaders(), "Content-Type": "application/json" },
    body: JSON.stringify({ p_user: userId, p_limit: limit }),
  });
  if (r.ok) return;
  const t = await r.text();
  if (/daily podcast limit/i.test(t)) {
    throw new Stop(429, `Ya generaste ${limit} quizzes de podcast hoy. Vuelve mañana o usa los que ya existen.`, "limit");
  }
  // Missing migration: don't block learning, but say so in the logs.
  console.error("bump_podcast_usage failed:", r.status, t.slice(0, 300));
}

async function store(row: Record<string, unknown>): Promise<unknown | null> {
  const r = await fetch(rest("podcast_quizzes?on_conflict=episode_key,level"), {
    method: "POST",
    headers: {
      ...serviceHeaders(),
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=representation",
    },
    body: JSON.stringify(row),
  });
  if (!r.ok) {
    console.error("podcast_quizzes insert failed:", r.status, (await r.text()).slice(0, 300));
    return null;
  }
  const rows = await r.json();
  // Empty = someone else stored one first: theirs is the shared one.
  return Array.isArray(rows) && rows[0] ? rows[0].quiz : await storedQuiz(String(row.episode_key), String(row.level));
}

// ------------------------------------------------------------------- iTunes --

type Episode = { title: string; show: string; url: string; durationMs: number; ext: string };

async function lookupEpisode(collectionId: number, trackId: number): Promise<Episode> {
  const q = new URLSearchParams({ id: String(collectionId), media: "podcast", entity: "podcastEpisode", limit: "200", country: "US" });
  let r: Response;
  try {
    r = await fetch(`${ITUNES}/lookup?${q}`, { signal: AbortSignal.timeout(12000), headers: { Accept: "application/json" } });
  } catch {
    throw new Stop(502, "Apple Podcasts no respondió. Inténtalo de nuevo en un momento.", "server");
  }
  if (!r.ok) throw new Stop(502, `Apple Podcasts respondió con un error (${r.status}). Inténtalo más tarde.`, "server");
  const data = await r.json().catch(() => null);
  const rows: any[] = Array.isArray(data?.results) ? data.results : [];
  const head = rows.find((x) => x && x.wrapperType !== "podcastEpisode" && x.kind !== "podcast-episode");
  const ep = rows.find((x) => x && Number(x.trackId) === trackId && Number(x.collectionId) === collectionId);
  if (!ep) throw new Stop(404, "Este episodio ya no aparece en Apple Podcasts.", "not_found");
  const url = String(ep.episodeUrl || "").replace(/^http:\/\//i, "https://");
  if (!url) throw new Stop(404, "Este episodio no tiene un archivo de audio público.", "not_found");
  if (ep.episodeContentType && ep.episodeContentType !== "audio") {
    throw new Stop(422, "Este episodio es un video: elige un episodio de audio.", "audio");
  }
  return {
    title: String(ep.trackName || "").slice(0, 500),
    show: String(ep.collectionName || head?.collectionName || "").slice(0, 300),
    url,
    durationMs: Number(ep.trackTimeMillis) || 0,
    ext: String(ep.episodeFileExtension || "").toLowerCase(),
  };
}

// ----------------------------------------------------------- safe download --

function privateV4(ip: string): boolean {
  const p = ip.split(".").map(Number);
  if (p.length !== 4 || p.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a, b] = p as [number, number, number, number];
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19));
}
function privateV6(ip: string): boolean {
  const s = ip.toLowerCase();
  if (s === "::" || s === "::1") return true;
  const mapped = s.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return privateV4(mapped[1]!);
  return /^(fc|fd|fe8|fe9|fea|feb|ff)/.test(s) || s.startsWith("64:ff9b:") || s.startsWith("2001:db8");
}

// https only, a public host name (no IP literals, no localhost or internal
// names, no odd ports or credentials) that does not resolve to a private address.
async function checkUrl(raw: string): Promise<URL> {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    throw new Stop(422, "El enlace del audio no es válido.", "audio");
  }
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  const bad = u.protocol !== "https:" || !!u.username || !!u.password || (u.port !== "" && u.port !== "443") ||
    host.startsWith("[") || /^[\d.]+$/.test(host) || /^[0-9a-f:]+$/.test(host) || !host.includes(".") ||
    host === "localhost" || /\.(localhost|local|internal|lan|home|arpa|test|invalid|corp)$/.test(host);
  if (bad) throw new Stop(422, "El audio de este episodio está en un servidor no permitido.", "audio");

  // DNS check, where the runtime offers it (defence in depth against a public
  // name pointing at a private address).
  for (const type of ["A", "AAAA"] as const) {
    let ips: string[] = [];
    try {
      ips = await Deno.resolveDns(host, type);
    } catch {
      continue; // no record of this type, or DNS lookups not available here
    }
    if (ips.some((ip) => (type === "A" ? privateV4(ip) : privateV6(ip)))) {
      throw new Stop(422, "El audio de este episodio está en un servidor no permitido.", "audio");
    }
  }
  return u;
}

const MIME_BY_EXT: Record<string, string> = {
  mp3: "audio/mp3",
  m4a: "audio/mp4",
  mp4: "audio/mp4",
  aac: "audio/aac",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  wav: "audio/wav",
  flac: "audio/flac",
};
function audioMime(contentType: string, url: string, ext: string): string {
  const ct = contentType.split(";")[0]!.trim().toLowerCase();
  if (ct === "audio/mpeg" || ct === "audio/mpeg3" || ct === "audio/x-mpeg" || ct === "audio/mp3") return "audio/mp3";
  if (ct === "audio/x-m4a" || ct === "audio/m4a" || ct === "audio/mp4") return "audio/mp4";
  if (/^audio\/(aac|ogg|wav|x-wav|flac)$/.test(ct)) return ct.replace("x-wav", "wav");
  const e = ext || (new URL(url).pathname.split(".").pop() || "").toLowerCase();
  return MIME_BY_EXT[e] || "audio/mp3";
}

type Audio = { bytes: Uint8Array; mime: string; truncated: boolean; total: number };

async function download(start: string, ext: string): Promise<Audio> {
  let url = start;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const u = await checkUrl(url);
    let r: Response;
    try {
      r = await fetch(u.href, {
        redirect: "manual",
        signal: AbortSignal.timeout(45000),
        headers: { Range: `bytes=0-${MAX_AUDIO - 1}`, Accept: "audio/*;q=1, */*;q=0.5", "User-Agent": "ECYR-English/1.0 (+podcast listening quiz)" },
      });
    } catch {
      throw new Stop(502, "No se pudo descargar el audio del episodio desde su fuente.", "audio");
    }
    if ([301, 302, 303, 307, 308].includes(r.status)) {
      const loc = r.headers.get("location");
      await r.body?.cancel();
      if (!loc) break;
      url = new URL(loc, u).href;
      continue;
    }
    if (r.status !== 200 && r.status !== 206) {
      await r.body?.cancel();
      throw new Stop(502, `El servidor del podcast no entregó el audio (HTTP ${r.status}).`, "audio");
    }
    const ct = r.headers.get("content-type") || "";
    if (/^(text\/|application\/(json|xml|xhtml))/i.test(ct)) {
      await r.body?.cancel();
      throw new Stop(422, "El enlace del episodio no lleva a un archivo de audio.", "audio");
    }
    const range = (r.headers.get("content-range") || "").match(/\/(\d+)\s*$/);
    const total = range ? Number(range[1]) : r.status === 200 ? Number(r.headers.get("content-length") || 0) : 0;

    // Read at most MAX_AUDIO bytes, whatever the server sends (some ignore Range).
    const chunks: Uint8Array[] = [];
    let size = 0;
    let truncated = false;
    const reader = r.body!.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (size + value.length >= MAX_AUDIO) {
        chunks.push(value.subarray(0, MAX_AUDIO - size));
        size = MAX_AUDIO;
        truncated = true;
        await reader.cancel().catch(() => {});
        break;
      }
      chunks.push(value);
      size += value.length;
    }
    if (total && size < total) truncated = true;
    if (size < 16 * 1024) throw new Stop(422, "El archivo de audio está vacío o es demasiado corto.", "audio");
    const bytes = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) {
      bytes.set(c, at);
      at += c.length;
    }
    return { bytes, mime: audioMime(ct, u.href, ext), truncated, total };
  }
  throw new Stop(502, "El audio del episodio pasa por demasiadas redirecciones.", "audio");
}

function toBase64(bytes: Uint8Array): string {
  let s = "";
  for (let i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(s);
}

// ------------------------------------------------------------------- Gemini --

const LEVEL_GUIDE: Record<string, string> = {
  A1: "Very short, simple questions in the present simple with basic vocabulary. Ask about the topic, names, numbers, places and simple facts said clearly. 3 short options in multiple choice.",
  A2: "Simple sentences and everyday vocabulary. Ask about the main ideas and explicit details (who, what, where, when, how many).",
  B1: "Ask about main ideas, important details, reasons and examples, and the speakers' feelings when stated.",
  B2: "Mix gist, specific detail, the speakers' opinions and attitude, simple inference, and vocabulary in context. Plausible distractors.",
  C1: "Focus on inference, implied meaning, attitude, purpose, nuance and idiomatic language. Subtle distractors that a careless listener would choose.",
};

function prompt(level: string, show: string, title: string, coveredMin: number | null, truncated: boolean): string {
  return `You are an expert ESL teacher writing a listening comprehension quiz for Spanish-speaking learners in Colombia at CEFR level ${level}.
The audio is an episode of the podcast "${show}" titled "${title}".
${truncated ? `IMPORTANT: the file was cut, so you only hear roughly the first ${coveredMin ?? "few"} minutes of the episode. Ask ONLY about what you actually hear, never about later parts.\n` : ""}Listen to the whole audio you received. Questions must be answerable only by listening (not from the title or general knowledge), and follow the order of the audio.
Level ${level}: ${LEVEL_GUIDE[level]}
Respond ONLY with raw JSON, no markdown, exactly this shape:
{"summary_es":"","vocab":[["english word or phrase as heard","traducción al español"]],"questions":[],"covered_minutes":0}
Write 8 to 10 questions mixing these three types, at least 2 of each:
- {"type":"mc","q":"question in English","options":["…","…","…","…"],"answer":0,"explain_es":"…"}  3 or 4 options, exactly one correct; "answer" is the 0-based index of the correct option; vary its position.
- {"type":"tf","q":"a statement in English about the audio","answer":"T","explain_es":"…"}  "answer" is "T" or "F".
- {"type":"gap","q":"a sentence close to what a speaker said, with the missing word(s) written as ___","answer":"missing word(s)","accept":["other correct spellings"],"explain_es":"…"}  1 to 3 words that are actually spoken.
"explain_es": one short sentence in Spanish saying what the speaker said, with the approximate minute, e.g. "(min 3) Dice que…".
"summary_es": 2 to 4 sentences in Spanish summarising what you heard.
"vocab": 6 to 10 useful words or expressions actually used in the audio, at or slightly above ${level}, each with a Spanish translation.
"covered_minutes": how many minutes of audio your questions cover.
If the audio has no intelligible English speech, respond {"error":"no_speech"}.`;
}

function pickModel(): string {
  return (Deno.env.get("PODCAST_GEMINI_MODEL") || Deno.env.get("GEMINI_MODEL") || DEFAULT_MODEL).trim();
}

async function askGemini(key: string, text: string, audio: Audio): Promise<string> {
  let r: Response;
  try {
    r = await fetch(`${GEMINI_BASE}/models/${encodeURIComponent(pickModel())}:generateContent`, {
      method: "POST",
      signal: AbortSignal.timeout(140000),
      headers: { "Content-Type": "application/json", "x-goog-api-key": key },
      body: JSON.stringify({
        contents: [{ parts: [{ text }, { inline_data: { mime_type: audio.mime, data: toBase64(audio.bytes) } }] }],
        generationConfig: { responseMimeType: "application/json", temperature: 0.4, maxOutputTokens: 8192 },
      }),
    });
  } catch {
    throw new Stop(504, "La IA tardó demasiado en escuchar el episodio. Inténtalo de nuevo o elige uno más corto.", "ai");
  }
  const body = await r.text();
  if (!r.ok) {
    console.error("Gemini error:", r.status, body.slice(0, 500));
    if (r.status === 429) throw new Stop(429, "La IA de la clase alcanzó su límite por ahora. Inténtalo más tarde.", "ai");
    if (r.status === 400 && /audio|mime|inline|decode|unsupported/i.test(body)) {
      throw new Stop(422, "La IA no pudo procesar el audio de este episodio. Prueba con otro.", "audio");
    }
    if (r.status === 401 || r.status === 403) throw new Stop(503, "La clave de Gemini de la clase no es válida. Avísale a tu profesor.", "no_key");
    throw new Stop(502, "El servicio de IA no respondió bien. Inténtalo de nuevo.", "ai");
  }
  let data: any;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Stop(502, "La IA respondió en un formato inesperado. Inténtalo de nuevo.", "ai");
  }
  return ((data?.candidates?.[0]?.content?.parts ?? []) as { text?: string }[]).map((p) => p.text ?? "").join("");
}

// Keeps only well-formed questions (the app's LibQuestion shape: mc / tf / gap).
function cleanQuiz(raw: any, coveredMin: number | null, truncated: boolean) {
  const text = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "");
  const questions: Record<string, unknown>[] = [];
  for (const q of Array.isArray(raw?.questions) ? raw.questions : []) {
    if (!q || typeof q !== "object") continue;
    const stem = text(q.q, 400);
    const explain_es = text(q.explain_es, 400) || undefined;
    if (!stem) continue;
    if (q.type === "mc") {
      const options = Array.isArray(q.options) ? q.options.map((o: unknown) => text(o, 200)).filter(Boolean) : [];
      const answer = Number(q.answer);
      if (options.length >= 2 && options.length <= 5 && Number.isInteger(answer) && answer >= 0 && answer < options.length &&
        new Set(options.map((o: string) => o.toLowerCase())).size === options.length) {
        questions.push({ type: "mc", q: stem, options, answer, explain_es });
      }
    } else if (q.type === "tf") {
      const a = String(q.answer).trim().toUpperCase();
      const answer = a === "TRUE" ? "T" : a === "FALSE" ? "F" : a;
      if (answer === "T" || answer === "F" || answer === "NG") questions.push({ type: "tf", q: stem, answer, explain_es });
    } else if (q.type === "gap") {
      const answer = text(q.answer, 80);
      const gq = /_{2,}/.test(stem) ? stem.replace(/_{2,}/g, "___") : "";
      // One gap per sentence, so it renders as an inline blank.
      if (answer && gq && gq.split("___").length === 2) {
        const accept = Array.isArray(q.accept) ? q.accept.map((x: unknown) => text(x, 80)).filter(Boolean).slice(0, 6) : [];
        questions.push({ type: "gap", q: gq, answer, ...(accept.length ? { accept } : {}), explain_es });
      }
    }
  }
  if (questions.length < 5) return null;
  // Group by type, as the app's worksheets do (one heading per kind).
  const order = { mc: 0, tf: 1, gap: 2 } as Record<string, number>;
  questions.sort((a, b) => order[String(a.type)]! - order[String(b.type)]!);
  const vocab = (Array.isArray(raw?.vocab) ? raw.vocab : [])
    .filter((v: unknown) => Array.isArray(v) && v.length >= 2)
    .map((v: unknown[]) => [text(v[0], 80), text(v[1], 120)])
    .filter(([en, es]: string[]) => en && es)
    .slice(0, 12);
  const said = Number(raw?.covered_minutes);
  const covered = coveredMin ?? (Number.isFinite(said) && said > 0 ? Math.round(said) : null);
  return {
    summary_es: text(raw?.summary_es, 1500),
    vocab,
    questions: questions.slice(0, 10),
    covered_minutes: covered,
    partial: truncated,
  };
}

// --------------------------------------------------------------------- main --

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return fail(405, "POST only.");
  if (Number(req.headers.get("content-length") || 0) > MAX_BODY_BYTES) return fail(413, "Solicitud demasiado grande.");

  const who = await whoIsCalling(req);
  if (who instanceof Response) return who;

  let body: any;
  try {
    body = await req.json();
  } catch {
    return fail(400, "La solicitud no es JSON válido.");
  }
  if (!body || body.op !== "generate") return fail(400, "Solicitud desconocida.");
  const collectionId = Number(body.collectionId);
  const trackId = Number(body.trackId);
  const level = String(body.level || "");
  if (!Number.isSafeInteger(collectionId) || collectionId <= 0 || !Number.isSafeInteger(trackId) || trackId <= 0) {
    return fail(400, "Episodio no válido.");
  }
  if (!LEVELS.has(level)) return fail(400, "Nivel no válido (A1–C1).");
  const episodeKey = `itunes:${collectionId}:${trackId}`;

  try {
    // Already made (by anyone): free, no AI call.
    const existing = await storedQuiz(episodeKey, level);
    if (existing) return reply(200, { quiz: existing, cached: true, stored: true });

    const studentsToo = (Deno.env.get("PODCAST_STUDENTS") || "on").trim().toLowerCase() !== "off";
    if (who.role !== "teacher" && !who.teacher_id) {
      return fail(403, "Las preguntas con IA son para profesores y estudiantes que se unieron a una clase. Únete con el código de tu clase.", "no_class");
    }
    if (who.role !== "teacher" && !studentsToo) {
      return fail(403, "Tu profesor genera las preguntas de los podcasts. Pídele que las prepare para este episodio.", "no_class");
    }

    const key = (Deno.env.get("GEMINI_API_KEY") || "").trim();
    if (!key) return fail(503, "La clave de Gemini de la clase aún no está configurada (Supabase → Edge Functions → Secrets → GEMINI_API_KEY).", "no_key");

    await countGeneration(who.id);
    const ep = await lookupEpisode(collectionId, trackId);
    const audio = await download(ep.url, ep.ext);

    let coveredMin: number | null = ep.durationMs ? Math.max(1, Math.round(ep.durationMs / 60000)) : null;
    if (audio.truncated) {
      coveredMin = audio.total && ep.durationMs
        ? Math.max(1, Math.floor((ep.durationMs / 60000) * (audio.bytes.length / audio.total)))
        : Math.max(1, Math.floor((audio.bytes.length * 8) / 128000 / 60)); // assume 128 kbps
    }

    const raw = await askGemini(key, prompt(level, ep.show, ep.title, coveredMin, audio.truncated), audio);
    let parsed: any = null;
    try {
      parsed = JSON.parse(raw.slice(raw.indexOf("{"), raw.lastIndexOf("}") + 1));
    } catch {
      /* handled below */
    }
    if (parsed?.error === "no_speech") return fail(422, "La IA no escuchó voz en inglés en este episodio. Prueba con otro.", "audio");
    const quiz = cleanQuiz(parsed, coveredMin, audio.truncated);
    if (!quiz) return fail(502, "La IA no devolvió preguntas válidas. Inténtalo de nuevo.", "ai");

    const saved = await store({
      episode_key: episodeKey,
      level,
      show_name: ep.show,
      episode_title: ep.title,
      episode_url: ep.url.slice(0, 2000),
      quiz,
      created_by: who.id,
    });
    return reply(200, { quiz: saved ?? quiz, cached: false, stored: !!saved });
  } catch (e) {
    if (e instanceof Stop) return fail(e.status, e.message, e.code);
    console.error("podcast function error:", e);
    return fail(500, "Algo falló al preparar las preguntas. Inténtalo de nuevo.");
  }
});
