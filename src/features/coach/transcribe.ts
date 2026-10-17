import { supabase } from '@/lib/supabase';
import { audioMime } from '@/lib/speakingAi';

/** Speech recognition for browsers without SpeechRecognition (Firefox): a recorded turn, transcribed by the class's `gemini` function. */
export interface Transcript {
  text: string;
  lang: 'en' | 'es';
}

function toBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

const PROMPT = `Transcribe exactly what the speaker says in this short recording. They are a Spanish-speaking learner of English, so it may be English, Spanish or a mix.
Keep their mistakes; do not translate or correct. Respond ONLY with raw JSON, no markdown: {"text":"","lang":"en|es"}
"lang" is "es" when most of it is Spanish. If there is no intelligible speech, return {"text":"","lang":"en"}.`;

export async function transcribeTurn(audio: Blob): Promise<Transcript> {
  if (!supabase) throw new Error('La IA necesita conexión con el servidor.');
  const data = await toBase64(audio);
  const { data: res, error } = await supabase.functions.invoke('gemini', {
    body: { op: 'generate', contents: [{ parts: [{ text: PROMPT }, { inline_data: { mime_type: audioMime(audio), data } }] }] },
  });
  if (error) {
    let message = 'No se pudo transcribir tu voz.';
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
  try {
    const out = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Partial<Transcript>;
    return { text: String(out.text ?? '').trim(), lang: out.lang === 'es' ? 'es' : 'en' };
  } catch {
    return { text: text.replace(/[{}"]/g, '').trim(), lang: 'en' };
  }
}

/** Rough check for a Spanish turn (accents, ¿¡, frequent function words). */
export function looksSpanish(s: string): boolean {
  if (/[ñáéíóú¿¡]/i.test(s)) return true;
  const words = s.toLowerCase().match(/\p{L}+/gu) ?? [];
  if (!words.length) return false;
  const es = new Set('que el los las es yo tengo quiero pero porque muy esta estoy fui también como mi mis una uno del con para por pues entonces bueno hola gracias sí creo hice voy vamos tiene hay eso ese esa nosotros ellos ustedes'.split(' '));
  const hits = words.filter((w) => es.has(w)).length;
  return hits >= 2 && hits / words.length >= 0.25;
}
