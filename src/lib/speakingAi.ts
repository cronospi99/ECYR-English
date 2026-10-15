import { supabase } from './supabase';

/** Gemini takes inline audio up to ~20 MB; the `gemini` function allows 30 MB of JSON (base64 adds a third). */
export const MAX_ANSWER_AUDIO = 18 * 1024 * 1024;

export interface SpeakingFeedback {
  transcript: string;
  /** CEFR estimate of this answer, e.g. "B1". */
  level: string;
  summary: string;
  corrections: { original: string; correction: string; why: string }[];
  better: string;
}

const AUDIO_EXT = /\.(mp3|m4a|mp4|aac|wav|ogg|oga|opus|webm|flac|amr|3gp)$/i;

export function isAudioFile(f: File) {
  return /^audio\//.test(f.type) || /^video\/(mp4|webm|3gpp)/.test(f.type) || AUDIO_EXT.test(f.name);
}

export function audioMime(f: Blob & { name?: string }) {
  if (f.type) return f.type.replace(/^video\//, 'audio/');
  const ext = (f.name ?? '').split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = {
    mp3: 'audio/mpeg',
    m4a: 'audio/mp4',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
    opus: 'audio/ogg',
    webm: 'audio/webm',
    aac: 'audio/aac',
    flac: 'audio/flac',
  };
  return map[ext] ?? 'audio/mpeg';
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

const prompt = (question: string, level: string) => `You are a friendly English speaking tutor for Spanish-speaking learners (target level ${level}).
The audio is the learner's spoken answer to this question: "${question}".
1. Transcribe exactly what they said in English, keeping their mistakes, repetitions and filler words — never correct the transcript.
2. Evaluate the answer for a ${level} learner.
Respond ONLY with raw JSON, no markdown:
{"transcript":"","level":"A1|A2|B1|B2|C1|C2","summary":"2 encouraging sentences in Spanish on what went well and the one thing to improve","corrections":[{"original":"exact words they said","correction":"corrected words","why":"short reason in Spanish"}],"better":"a natural improved version of their answer in English, at ${level}, 2-4 sentences"}
Give at most 5 corrections, the most important first; [] if there are none. If there is no intelligible speech, set "transcript" to "" and explain it in "summary".`;

/** Transcribes and comments a recorded answer through the class's `gemini` Edge Function. */
export async function assessSpokenAnswer(audio: Blob, question: string, level: string): Promise<SpeakingFeedback> {
  if (!supabase) throw new Error('La IA necesita conexión con el servidor (Supabase no está configurado).');
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) throw new Error('Inicia sesión para que la IA escuche tu respuesta.');
  if (audio.size > MAX_ANSWER_AUDIO) throw new Error('El audio supera 18 MB. Recórtalo o expórtalo como MP3.');

  const data = await toBase64(audio);
  const { data: res, error } = await supabase.functions.invoke('gemini', {
    body: {
      op: 'generate',
      contents: [
        {
          parts: [{ text: prompt(question, level) }, { inline_data: { mime_type: audioMime(audio), data } }],
        },
      ],
    },
  });
  if (error) {
    let message = 'No se pudo contactar al servicio de IA de la clase.';
    try {
      const body = await (error as { context?: Response }).context?.json();
      if (body?.error?.message) message = body.error.message;
    } catch {
      /* not JSON */
    }
    throw new Error(message);
  }
  const text: string = ((res as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content?.parts ?? [])
    .map((p) => p.text ?? '')
    .join('');
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  try {
    const out = JSON.parse(json) as Partial<SpeakingFeedback>;
    return {
      transcript: String(out.transcript ?? ''),
      level: String(out.level ?? ''),
      summary: String(out.summary ?? ''),
      corrections: Array.isArray(out.corrections)
        ? out.corrections.slice(0, 5).map((c) => ({
            original: String(c.original ?? ''),
            correction: String(c.correction ?? ''),
            why: String(c.why ?? ''),
          }))
        : [],
      better: String(out.better ?? ''),
    };
  } catch {
    throw new Error('La IA respondió en un formato inesperado. Inténtalo de nuevo.');
  }
}
