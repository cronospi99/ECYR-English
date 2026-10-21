import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CefrLevel, Skill } from '@/content/types';
import { CEFR_LEVELS } from '@/content/types';
import { LEVELS, TOTAL_UNITS } from '@/content/levels';
import { dayKey, daysBetween } from '@/lib/date';
import { useSettings } from '@/store/settings';

export type ActivityKind = 'unit' | 'topic' | 'game' | 'reading' | 'listening' | 'speaking' | 'writing' | 'flashcards' | 'ielts' | 'coach' | 'exam';

export interface Activity {
  id: string;
  kind: ActivityKind;
  title: string;
  skill: Skill;
  xp: number;
  score?: number; // 0–100
  level?: CefrLevel;
  /** What was practised, e.g. "unit:A1-3", "reading:<id>", "game:<slug>" — lets study plans tick tasks off. */
  ref?: string;
  at: string; // ISO
}

export interface Completion {
  score: number; // best score 0–100
  at: string;
}

export interface ProgressData {
  xp: number;
  skillXp: Record<Skill, number>;
  dailyXp: Record<string, number>; // dayKey → xp
  streak: { current: number; best: number; lastDay: string | null };
  units: Record<string, Completion>; // "A1-3"
  topics: Record<string, Completion>; // foundations topic id
  readings: Record<string, Completion>;
  games: Record<string, { plays: number; lastAt: string }>;
  activity: Activity[];
  targetLevel: CefrLevel;
  dailyGoal: number;
  updatedAt: string;
}

interface ProgressActions {
  award: (a: Omit<Activity, 'id' | 'at'>) => void;
  completeUnit: (level: CefrLevel, n: number, score: number, title: string) => void;
  completeTopic: (id: string, score: number, title: string) => void;
  completeReading: (id: string, score: number, title: string, level?: CefrLevel) => void;
  playGame: (slug: string, title: string) => void;
  setTargetLevel: (l: CefrLevel) => void;
  setDailyGoal: (n: number) => void;
  replace: (d: ProgressData) => void;
  reset: () => void;
}

const emptySkills = (): Record<Skill, number> => ({
  listening: 0,
  reading: 0,
  writing: 0,
  speaking: 0,
  grammar: 0,
  vocabulary: 0,
});

export const initialProgress = (): ProgressData => ({
  xp: 0,
  skillXp: emptySkills(),
  dailyXp: {},
  streak: { current: 0, best: 0, lastDay: null },
  units: {},
  topics: {},
  readings: {},
  games: {},
  activity: [],
  targetLevel: 'B2',
  dailyGoal: 50,
  updatedAt: new Date(0).toISOString(),
});

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

function bumpStreak(s: ProgressData['streak']): ProgressData['streak'] {
  const today = dayKey();
  if (s.lastDay === today) return s;
  const current = s.lastDay && daysBetween(s.lastDay, today) === 1 ? s.current + 1 : 1;
  return { current, best: Math.max(s.best, current), lastDay: today };
}

export const useProgress = create<ProgressData & ProgressActions>()(
  persist(
    (set) => ({
      ...initialProgress(),

      award: (a) =>
        set((s) => {
          // Teacher free practice: nothing is recorded.
          if (useSettings.getState().practiceSandbox) return {};
          const today = dayKey();
          const entry: Activity = { ...a, id: uid(), at: new Date().toISOString() };
          return {
            xp: s.xp + a.xp,
            skillXp: { ...s.skillXp, [a.skill]: (s.skillXp[a.skill] ?? 0) + a.xp },
            dailyXp: { ...s.dailyXp, [today]: (s.dailyXp[today] ?? 0) + a.xp },
            streak: a.xp > 0 ? bumpStreak(s.streak) : s.streak,
            activity: [entry, ...s.activity].slice(0, 150),
            updatedAt: entry.at,
          };
        }),

      completeUnit: (level, n, score, title) => {
        if (useSettings.getState().practiceSandbox) return;
        const key = `${level}-${n}`;
        const prev = useProgress.getState().units[key];
        // Full XP the first time, a smaller review bonus afterwards.
        const xp = prev ? Math.round(score / 10) : 40 + Math.round(score / 5);
        set((s) => ({
          units: { ...s.units, [key]: { score: Math.max(prev?.score ?? 0, score), at: new Date().toISOString() } },
        }));
        useProgress.getState().award({ kind: 'unit', title, skill: 'grammar', xp, score, level, ref: `unit:${key}` });
      },

      completeTopic: (id, score, title) => {
        if (useSettings.getState().practiceSandbox) return;
        const prev = useProgress.getState().topics[id];
        const xp = prev ? Math.round(score / 10) : 20 + Math.round(score / 5);
        set((s) => ({
          topics: { ...s.topics, [id]: { score: Math.max(prev?.score ?? 0, score), at: new Date().toISOString() } },
        }));
        useProgress.getState().award({ kind: 'topic', title, skill: 'grammar', xp, score, level: 'A1', ref: `topic:${id}` });
      },

      completeReading: (id, score, title, level) => {
        if (useSettings.getState().practiceSandbox) return;
        const prev = useProgress.getState().readings[id];
        const xp = prev ? 5 : 15 + Math.round(score / 10);
        set((s) => ({
          readings: { ...s.readings, [id]: { score: Math.max(prev?.score ?? 0, score), at: new Date().toISOString() } },
        }));
        useProgress.getState().award({ kind: 'reading', title, skill: 'reading', xp, score, level, ref: `reading:${id}` });
      },

      playGame: (slug, title) => {
        if (useSettings.getState().practiceSandbox) return;
        set((s) => ({
          games: { ...s.games, [slug]: { plays: (s.games[slug]?.plays ?? 0) + 1, lastAt: new Date().toISOString() } },
        }));
        useProgress.getState().award({ kind: 'game', title, skill: 'speaking', xp: 10, ref: `game:${slug}` });
      },

      setTargetLevel: (targetLevel) => set({ targetLevel, updatedAt: new Date().toISOString() }),
      setDailyGoal: (dailyGoal) => set({ dailyGoal, updatedAt: new Date().toISOString() }),
      replace: (d) => set({ ...initialProgress(), ...d }),
      reset: () => set(initialProgress()),
    }),
    { name: 'ecyr:progress', version: 1 },
  ),
);

/** Strips actions so the state can be serialised / synced. */
export function snapshot(): ProgressData {
  const s = useProgress.getState();
  return {
    xp: s.xp,
    skillXp: s.skillXp,
    dailyXp: s.dailyXp,
    streak: s.streak,
    units: s.units,
    topics: s.topics,
    readings: s.readings,
    games: s.games,
    activity: s.activity,
    targetLevel: s.targetLevel,
    dailyGoal: s.dailyGoal,
    updatedAt: s.updatedAt,
  };
}

/** Merges two progress records (e.g. this device vs the cloud) without losing work. */
export function mergeProgress(a: ProgressData, b: ProgressData): ProgressData {
  const pickBest = (x: Record<string, Completion>, y: Record<string, Completion>) => {
    const out: Record<string, Completion> = { ...x };
    for (const [k, v] of Object.entries(y)) if (!out[k] || v.score > out[k].score) out[k] = v;
    return out;
  };
  const maxMap = (x: Record<string, number>, y: Record<string, number>) => {
    const out = { ...x };
    for (const [k, v] of Object.entries(y)) out[k] = Math.max(out[k] ?? 0, v);
    return out;
  };
  const newer = a.updatedAt >= b.updatedAt ? a : b;
  const seen = new Set<string>();
  const activity = [...a.activity, ...b.activity]
    .filter((x) => (seen.has(x.id) ? false : (seen.add(x.id), true)))
    .sort((x, y) => y.at.localeCompare(x.at))
    .slice(0, 150);
  const games = { ...a.games };
  for (const [k, v] of Object.entries(b.games))
    games[k] = !games[k] || v.plays > games[k].plays ? v : games[k];
  return {
    xp: Math.max(a.xp, b.xp),
    skillXp: maxMap(a.skillXp, b.skillXp) as Record<Skill, number>,
    dailyXp: maxMap(a.dailyXp, b.dailyXp),
    streak: a.streak.best >= b.streak.best && (a.streak.lastDay ?? '') >= (b.streak.lastDay ?? '') ? a.streak : b.streak,
    units: pickBest(a.units, b.units),
    topics: pickBest(a.topics, b.topics),
    readings: pickBest(a.readings, b.readings),
    games,
    activity,
    targetLevel: newer.targetLevel,
    dailyGoal: newer.dailyGoal,
    updatedAt: newer.updatedAt,
  };
}

// ------------------------------------------------------------- selectors ----

export function levelCompletion(units: Record<string, Completion>, level: CefrLevel) {
  const meta = LEVELS.find((l) => l.id === level)!;
  const done = Object.keys(units).filter((k) => k.startsWith(level + '-')).length;
  return { done, total: meta.units, ratio: meta.units ? done / meta.units : 0 };
}

/**
 * Overall climb (0–1). Each CEFR level is an equal stretch of the mountain, so
 * the climber reaches the "B1 camp" when A1 and A2 are complete.
 */
export function climbProgress(units: Record<string, Completion>) {
  const per = 1 / CEFR_LEVELS.length;
  return CEFR_LEVELS.reduce((acc, l) => acc + levelCompletion(units, l).ratio * per, 0);
}

/** Current working level: the first level that is not yet ≥ 80% complete. */
export function currentLevel(units: Record<string, Completion>): CefrLevel {
  for (const l of CEFR_LEVELS) if (levelCompletion(units, l).ratio < 0.8) return l;
  return 'C1';
}

export const unitsDone = (units: Record<string, Completion>) => Object.keys(units).length;
export { TOTAL_UNITS };

/** Level-of-XP for gamification badges. */
export function xpLevel(xp: number) {
  // Each rank needs 20% more XP than the previous; rank 1 needs 100.
  let rank = 1;
  let need = 100;
  let rest = xp;
  while (rest >= need) {
    rest -= need;
    rank++;
    need = Math.round(need * 1.2);
  }
  return { rank, into: rest, need, ratio: rest / need };
}
