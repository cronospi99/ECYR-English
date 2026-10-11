import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CefrLevel, Skill } from '@/content/types';
import { CEFR_LEVELS } from '@/content/types';

/**
 * Per-game progress. Games report through public/modules/_bridge/ecyr-bridge.js
 * (start → answers → result); every result is checked before it counts:
 *   valid      solo play that passes every check → XP and stats
 *   class      teacher-led / group play → recorded, never graded
 *   abandoned  left midway → recorded, no XP
 *   invalid    failed a check (impossible numbers, too fast, answers don't match)
 */
export type SessionStatus = 'valid' | 'class' | 'abandoned' | 'invalid';
export type MetaValue = string | number | boolean | null | MetaValue[] | { [k: string]: MetaValue };

export interface GameSession {
  id: string;
  slug: string;
  startedAt: string;
  endedAt: string;
  mode: 'solo' | 'class';
  level?: CefrLevel;
  unit?: string;
  won?: boolean;
  asked: number;
  correct: number;
  score?: number;
  stars?: number;
  /** Answers the platform saw live, per topic. */
  topics?: Record<string, { a: number; c: number }>;
  meta?: Record<string, MetaValue>;
  status: SessionStatus;
  reasons?: string[];
  xp: number;
}

export interface LiveSession {
  slug: string;
  startedAt: string;
  mode: 'solo' | 'class';
  level?: CefrLevel;
  unit?: string;
  asked: number;
  correct: number;
  topics: Record<string, { a: number; c: number }>;
}

/** Games that report results, with what they train and their validity rules. */
export const TRACKED_GAMES: Record<
  string,
  { skill: Skill; graded: boolean; minAnswers: number; minSeconds: number; maxPerMinute: number }
> = {
  'english-defenders': { skill: 'grammar', graded: true, minAnswers: 5, minSeconds: 45, maxPerMinute: 30 },
  'two-truths-colombia': { skill: 'reading', graded: true, minAnswers: 3, minSeconds: 30, maxPerMinute: 20 },
  'too-good-to-be-true': { skill: 'vocabulary', graded: true, minAnswers: 3, minSeconds: 30, maxPerMinute: 20 },
  'would-you-rather': { skill: 'speaking', graded: false, minAnswers: 2, minSeconds: 60, maxPerMinute: 10 },
  'earth-modals': { skill: 'reading', graded: false, minAnswers: 2, minSeconds: 30, maxPerMinute: 15 },
};

const MAX_SESSIONS = 300;
const isLevel = (v: unknown): v is CefrLevel => typeof v === 'string' && (CEFR_LEVELS as readonly string[]).includes(v);
const num = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi ? v : undefined);
const str = (v: unknown, max = 80) => (typeof v === 'string' ? v.slice(0, max) : undefined);

/** Keeps only small, plain JSON from a game's meta (it comes from game code). */
function cleanMeta(v: unknown, depth = 0): Record<string, MetaValue> | undefined {
  if (!v || typeof v !== 'object' || Array.isArray(v) || depth > 2) return undefined;
  const out: Record<string, MetaValue> = {};
  let n = 0;
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
    if (n++ >= 24 || k.length > 40) continue;
    if (typeof x === 'string') out[k] = x.slice(0, 120);
    else if (typeof x === 'number' && Number.isFinite(x)) out[k] = x;
    else if (typeof x === 'boolean' || x === null) out[k] = x;
    else if (Array.isArray(x)) out[k] = x.slice(0, 12).filter((y) => ['string', 'number', 'boolean'].includes(typeof y)) as MetaValue[];
    else if (typeof x === 'object') {
      const m = cleanMeta(x, depth + 1);
      if (m) out[k] = m;
    }
  }
  return out;
}

export function validateSession(raw: Record<string, unknown>, live: LiveSession | undefined): Omit<GameSession, 'xp'> {
  const slug = String(raw.slug);
  const rules = TRACKED_GAMES[slug];
  const reasons: string[] = [];
  const startedAt = str(raw.startedAt, 40) ?? live?.startedAt ?? new Date().toISOString();
  const endedAt = str(raw.endedAt, 40) ?? new Date().toISOString();
  const meta = cleanMeta(raw.meta);
  let asked = num(raw.asked, 0, 1000);
  let correct = num(raw.correct, 0, 1000);
  if (asked === undefined || correct === undefined) {
    reasons.push('Datos incompletos');
    asked = asked ?? live?.asked ?? 0;
    correct = correct ?? live?.correct ?? 0;
  }
  if (correct > asked) reasons.push('Más aciertos que preguntas');
  const seconds = (Date.parse(endedAt) - Date.parse(startedAt)) / 1000;
  if (!Number.isFinite(seconds) || seconds < 0) reasons.push('Fechas inválidas');
  const participation = meta?.kind === 'participation';
  // Live answers are the platform's own record: the final numbers must agree.
  if (live && !participation && live.asked > 0 && (Math.abs(live.asked - asked) > 1 || Math.abs(live.correct - correct) > 1))
    reasons.push('El resultado no coincide con las respuestas registradas');
  if (rules && Number.isFinite(seconds) && seconds > 0 && asked / (seconds / 60) > rules.maxPerMinute && asked >= 5)
    reasons.push('Respuestas demasiado rápidas');
  const score = participation ? undefined : num(raw.score, 0, 100);
  const stars = num(raw.stars, 0, 3);
  const mode = raw.mode === 'class' || live?.mode === 'class' ? 'class' : 'solo';
  const abandoned = meta?.abandoned === true;

  let status: SessionStatus = 'valid';
  if (reasons.length) status = 'invalid';
  else if (mode === 'class') status = 'class';
  else if (abandoned) status = 'abandoned';
  else if (rules && (asked < rules.minAnswers || seconds < rules.minSeconds)) {
    status = 'invalid';
    reasons.push(asked < rules.minAnswers ? `Menos de ${rules.minAnswers} respuestas` : `Partida de menos de ${rules.minSeconds} s`);
  }

  return {
    id: String(raw.sessionId).slice(0, 40),
    slug,
    startedAt,
    endedAt,
    mode,
    level: isLevel(raw.level) ? raw.level : live?.level,
    unit: str(raw.unit, 12) ?? live?.unit,
    won: typeof raw.won === 'boolean' ? raw.won : undefined,
    asked,
    correct: Math.min(correct, asked),
    score,
    stars,
    topics: live && Object.keys(live.topics).length ? live.topics : undefined,
    meta,
    status,
    reasons: reasons.length ? reasons : undefined,
  };
}

/** XP for a valid solo session; nothing for the rest. */
export function sessionXp(s: Omit<GameSession, 'xp'>): number {
  if (s.status !== 'valid') return 0;
  if (s.meta?.kind === 'participation') return Math.min(15, 5 + s.asked);
  return Math.min(40, 10 + Math.round((s.score ?? 0) / 10) + (s.stars ?? 0) * 5);
}

interface GamesState {
  sessions: GameSession[];
  live: Record<string, LiveSession>;
  /** English Defenders' own per-unit stars ('ed:progress'), mirrored for sync and teachers. */
  defenders: { stars: Record<string, Record<string, number>>; asked: number; correct: number } | null;
  updatedAt: string;
  start: (id: string, s: LiveSession) => void;
  answer: (id: string, correct: boolean, topic?: string) => void;
  finish: (s: GameSession) => void;
  drop: (id: string) => void;
  setDefenders: (d: GamesState['defenders']) => void;
  replace: (d: Pick<GamesState, 'sessions' | 'defenders' | 'updatedAt'>) => void;
}

export const useGames = create<GamesState>()(
  persist(
    (set) => ({
      sessions: [],
      live: {},
      defenders: null,
      updatedAt: new Date(0).toISOString(),
      start: (id, s) => set((st) => ({ live: { ...st.live, [id]: s } })),
      answer: (id, ok, topic) =>
        set((st) => {
          const l = st.live[id];
          if (!l) return {};
          const topics = { ...l.topics };
          if (topic) {
            const t = topics[topic] ?? { a: 0, c: 0 };
            topics[topic] = { a: t.a + 1, c: t.c + (ok ? 1 : 0) };
          }
          return { live: { ...st.live, [id]: { ...l, asked: l.asked + 1, correct: l.correct + (ok ? 1 : 0), topics } } };
        }),
      finish: (s) =>
        set((st) => {
          const live = { ...st.live };
          delete live[s.id];
          if (st.sessions.some((x) => x.id === s.id)) return { live };
          return { live, sessions: [s, ...st.sessions].slice(0, MAX_SESSIONS), updatedAt: new Date().toISOString() };
        }),
      drop: (id) =>
        set((st) => {
          const live = { ...st.live };
          delete live[id];
          return { live };
        }),
      setDefenders: (defenders) => set({ defenders, updatedAt: new Date().toISOString() }),
      replace: (d) => set(d),
    }),
    {
      name: 'ecyr:games',
      version: 1,
      partialize: (s) => ({ sessions: s.sessions, live: s.live, defenders: s.defenders, updatedAt: s.updatedAt }),
    },
  ),
);

// ------------------------------------------------------------- selectors ----

export interface GameStats {
  slug: string;
  sessions: GameSession[];
  valid: GameSession[];
  plays: number;
  best: number | null;
  avg: number | null;
  accuracy: number | null;
  answered: number;
  wins: number;
  lastAt: string | null;
  trend: number[];
  classSessions: number;
  flagged: number;
}

export function statsFor(slug: string, sessions: GameSession[]): GameStats {
  const mine = sessions.filter((s) => s.slug === slug);
  const valid = mine.filter((s) => s.status === 'valid');
  const scored = valid.filter((s) => typeof s.score === 'number');
  const asked = valid.reduce((n, s) => n + s.asked, 0);
  const correct = valid.reduce((n, s) => n + s.correct, 0);
  return {
    slug,
    sessions: mine,
    valid,
    plays: valid.length,
    best: scored.length ? Math.max(...scored.map((s) => s.score!)) : null,
    avg: scored.length ? Math.round(scored.reduce((n, s) => n + s.score!, 0) / scored.length) : null,
    accuracy: asked && TRACKED_GAMES[slug]?.graded ? Math.round((correct / asked) * 100) : null,
    answered: asked,
    wins: valid.filter((s) => s.won).length,
    lastAt: mine[0]?.endedAt ?? null,
    trend: scored.slice(0, 10).map((s) => s.score!).reverse(),
    classSessions: mine.filter((s) => s.status === 'class').length,
    flagged: mine.filter((s) => s.status === 'invalid').length,
  };
}

/** Union of two session lists (this device vs the cloud), newest first. */
export function mergeSessions(a: GameSession[], b: GameSession[]): GameSession[] {
  const seen = new Set<string>();
  return [...a, ...b]
    .filter((s) => s && typeof s.id === 'string' && (seen.has(s.id) ? false : (seen.add(s.id), true)))
    .sort((x, y) => y.endedAt.localeCompare(x.endedAt))
    .slice(0, MAX_SESSIONS);
}

/** Accepts a synced list only if each entry has the expected shape. */
export function sanitizeSessions(v: unknown): GameSession[] {
  if (!Array.isArray(v)) return [];
  return v
    .filter(
      (s): s is GameSession =>
        !!s &&
        typeof s === 'object' &&
        typeof (s as GameSession).id === 'string' &&
        typeof (s as GameSession).slug === 'string' &&
        typeof (s as GameSession).endedAt === 'string' &&
        ['valid', 'class', 'abandoned', 'invalid'].includes((s as GameSession).status) &&
        typeof (s as GameSession).asked === 'number' &&
        typeof (s as GameSession).correct === 'number',
    )
    .slice(0, MAX_SESSIONS);
}

export function sanitizeDefenders(v: unknown): GamesState['defenders'] {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  const stars: Record<string, Record<string, number>> = {};
  if (o.stars && typeof o.stars === 'object')
    for (const [lv, units] of Object.entries(o.stars as Record<string, unknown>)) {
      if (!isLevel(lv) || !units || typeof units !== 'object') continue;
      stars[lv] = {};
      for (const [u, n] of Object.entries(units as Record<string, unknown>)) {
        const k = num(n, 0, 3);
        if (k !== undefined && u.length <= 6) stars[lv]![u] = k;
      }
    }
  return { stars, asked: num(o.asked, 0, 1e7) ?? 0, correct: num(o.correct, 0, 1e7) ?? 0 };
}
