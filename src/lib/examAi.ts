/**
 * AI marking of an exam's production sections (writing text, spoken answers)
 * through the class's `gemini` Edge Function: Gemini returns a 0–100 score with
 * feedback in Spanish. Text only out — audio goes in only to be transcribed.
 */
import { supabase } from './supabase';
import { audioMime } from './speakingAi';

export interface ExamMark {
  /** 0–100 for this task at the exam's level. */
  score: number;
  level: string;
  summary: string;
  corrections: { original: string; correction: string; why: string }[];
  /** Speaking only: what the learner said. */
  transcript?: string;
}

async function generate(parts: unknown[]): Promise<string> {
  if (!supabase) throw new Error('La calificación con IA necesita conexión con el servidor.');
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) throw new Error('Inicia sesión para que la IA califique esta parte.');
  const { data, error } = await supabase.functions.invoke('gemini', { body: { op: 'generate', contents: [{ parts }] } });
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
  return ((data as { candidates?: { content?: { parts?: { text?: string }[] } }[] })?.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('');
}

function parse(text: string): ExamMark {
  const json = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1);
  try {
    const o = JSON.parse(json) as Partial<ExamMark>;
    const score = Math.max(0, Math.min(100, Math.round(Number(o.score) || 0)));
    return {
      score,
      level: String(o.level ?? ''),
      summary: String(o.summary ?? ''),
      corrections: Array.isArray(o.corrections)
        ? o.corrections.slice(0, 6).map((c) => ({ original: String(c.original ?? ''), correction: String(c.correction ?? ''), why: String(c.why ?? '') }))
        : [],
      transcript: o.transcript === undefined ? undefined : String(o.transcript),
    };
  } catch {
    throw new Error('La IA respondió en un formato inesperado.');
  }
}

const SHAPE = `{"score":0,"level":"A1|A2|B1|B2|C1|C2","summary":"3 sentences in Spanish: what went well, what lowered the score, the one thing to practise","corrections":[{"original":"exact words","correction":"corrected","why":"short reason in Spanish"}]}`;

const RUBRIC = (level: string) => `Score 0–100 against what a ${level} learner should achieve (not against a native speaker):
task achievement 30%, grammar range and accuracy 30%, vocabulary 25%, organisation/coherence 15%.
70–100 = clearly meets the level; 60–69 = meets it with noticeable errors; 40–59 = partly; below 40 = does not answer the task or far below the level. An empty, off-topic or Spanish answer scores under 20.`;

export async function markWriting(o: { text: string; prompt: string; level: string; criteria: string[]; minWords: number; maxWords: number }): Promise<ExamMark> {
  const text = await generate([
    {
      text: `You are marking the writing part of an English exam for a Spanish-speaking learner (exam level ${o.level}).
Task: "${o.prompt}"
Expected length: ${o.minWords}–${o.maxWords} words. Checklist the student was given: ${o.criteria.join(' | ')}.
${RUBRIC(o.level)} Deduct for being far outside the word range.
The student's text:
"""${o.text.slice(0, 6000)}"""
Respond ONLY with raw JSON, no markdown: ${SHAPE}
At most 6 corrections, the most important first.`,
    },
  ]);
  return parse(text);
}

export async function markSpeaking(o: { audio?: Blob; transcript?: string; prompt: string; level: string; seconds: number }): Promise<ExamMark> {
  const base = `You are marking the speaking part of an English exam for a Spanish-speaking learner (exam level ${o.level}).
Question: "${o.prompt}" (expected answer: about ${o.seconds} seconds).
${RUBRIC(o.level)} For speaking, "organisation" means fluency and how well the ideas connect; also consider pronunciation if you hear audio.`;
  if (o.audio) {
    const data = await blobToBase64(o.audio);
    const text = await generate([
      {
        text: `${base}
1. Transcribe exactly what they said in English, keeping mistakes and fillers — never correct the transcript.
2. Mark it. Respond ONLY with raw JSON, no markdown: ${SHAPE.replace('{"score"', '{"transcript":"","score"')}
If there is no intelligible speech, set transcript to "" and score to 0.`,
      },
      { inline_data: { mime_type: audioMime(o.audio), data } },
    ]);
    return parse(text);
  }
  const text = await generate([
    {
      text: `${base}
There is no audio: this is the browser's live transcript of the answer (it may miss words; do not judge pronunciation).
"""${(o.transcript ?? '').slice(0, 4000)}"""
Respond ONLY with raw JSON, no markdown: ${SHAPE}`,
    },
  ]);
  return { ...parse(text), transcript: o.transcript };
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onloadend = () => resolve(String(r.result).split(',')[1] ?? '');
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

export function markMarkdown(m: ExamMark): string {
  const out = [`**Puntaje IA:** ${m.score}/100${m.level ? ` · nivel estimado ${m.level}` : ''}`];
  if (m.summary) out.push(m.summary);
  if (m.corrections.length) {
    out.push('### Correcciones');
    for (const c of m.corrections) out.push(`- *${c.original}* → **${c.correction}**${c.why ? ` — ${c.why}` : ''}`);
  }
  return out.join('\n');
}
