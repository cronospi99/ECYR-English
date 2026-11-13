/* Language Defenders → platform progress. Same messages the iframe games send, delivered
   directly because this game runs inside the app. */
import { reportNativeGame } from '@/lib/gameBridge';

const SLUG = 'language-defenders';

interface Meta { mode?: string; level?: string; unit?: string | number; meta?: Record<string, unknown> }
interface Result extends Meta { won?: boolean; asked?: number; correct?: number; stars?: number; score?: number }

let session: { id: string; startedAt: string; asked: number; correct: number; meta: Meta } | null = null;
const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
const ensure = (meta?: Meta) => (session ??= { id: newId(), startedAt: new Date().toISOString(), asked: 0, correct: 0, meta: meta ?? {} });
const post = (type: string, data: Record<string, unknown>) => reportNativeGame({ type, slug: SLUG, sessionId: session?.id, ...data });

export const bridge = {
  start(meta: Meta = {}) {
    session = null;
    const s = ensure(meta);
    post('start', { startedAt: s.startedAt, mode: meta.mode ?? 'solo', level: meta.level, unit: meta.unit, meta: meta.meta });
  },
  answer(correct: boolean, info: { topic?: string; unit?: string | number; level?: string; kind?: string } = {}) {
    const s = ensure();
    s.asked++;
    if (correct) s.correct++;
    post('answer', { correct: !!correct, topic: info.topic, unit: info.unit != null ? String(info.unit) : undefined, level: info.level, kind: info.kind, asked: s.asked, right: s.correct });
  },
  end(r: Result = {}) {
    const s = ensure();
    const asked = typeof r.asked === 'number' ? r.asked : s.asked;
    const correct = typeof r.correct === 'number' ? r.correct : s.correct;
    const unit = r.unit ?? s.meta.unit;
    post('result', {
      startedAt: s.startedAt, endedAt: new Date().toISOString(),
      mode: r.mode ?? s.meta.mode ?? 'solo', level: r.level ?? s.meta.level,
      unit: unit != null ? String(unit) : undefined,
      won: typeof r.won === 'boolean' ? r.won : undefined, asked, correct,
      score: typeof r.score === 'number' ? r.score : asked ? Math.round((correct / asked) * 100) : undefined,
      stars: typeof r.stars === 'number' ? r.stars : undefined, meta: r.meta,
    });
    session = null;
  },
};
