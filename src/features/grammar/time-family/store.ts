/**
 * Feature-local state for Time & Family: the family tree, the playbook's
 * points / streak and a couple of preferences. Persisted to localStorage and
 * migrated once from the legacy single-file app's key.
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { HOMEWORK, LEGACY_STORAGE_KEY, SAMPLE } from './data';

export interface Member {
  id: string;
  name: string;
  rel: string;
}

interface TimeFamilyState {
  members: Member[];
  score: number;
  streak: number;
  bestStreak: number;
  minuteStep: 1 | 5;
  homeworkMin: number;
  /** Records an answer: +10 points, +5 per streak step (max +25 bonus). */
  answer: (correct: boolean) => void;
  addMember: (name: string, rel: string) => void;
  removeMember: (id: string) => void;
  loadSample: () => void;
  clearTree: () => void;
  setMinuteStep: (s: 1 | 5) => void;
  setHomeworkMin: (n: number) => void;
}

const uid = () => Math.random().toString(36).slice(2, 9) + Date.now().toString(36).slice(-4);

function legacy(): Pick<TimeFamilyState, 'members' | 'score' | 'streak'> {
  const empty = { members: [], score: 0, streak: 0 };
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return empty;
    const d = JSON.parse(raw) as { members?: { name?: unknown; rel?: unknown }[]; score?: unknown; streak?: unknown };
    const members = (Array.isArray(d.members) ? d.members : [])
      .filter((m) => typeof m?.name === 'string' && typeof m?.rel === 'string')
      .map((m) => ({ id: uid(), name: String(m.name).slice(0, 40), rel: String(m.rel) }));
    return { members, score: Number(d.score) || 0, streak: Number(d.streak) || 0 };
  } catch {
    return empty;
  }
}

export const useTimeFamily = create<TimeFamilyState>()(
  persist(
    (set) => ({
      ...legacy(),
      bestStreak: 0,
      minuteStep: 5,
      homeworkMin: HOMEWORK.defaultMin,
      answer: (correct) =>
        set((s) => {
          const streak = correct ? s.streak + 1 : 0;
          const score = correct ? s.score + 10 + Math.min(streak - 1, 5) * 5 : s.score;
          return { streak, score, bestStreak: Math.max(s.bestStreak, streak) };
        }),
      addMember: (name, rel) =>
        set((s) => {
          const clean = name.trim().replace(/\s+/g, ' ').slice(0, 40);
          if (!clean) return s;
          // Only one "Me": adding it again renames it.
          if (rel === 'Me' && s.members.some((m) => m.rel === 'Me'))
            return { members: s.members.map((m) => (m.rel === 'Me' ? { ...m, name: clean } : m)) };
          return { members: [...s.members, { id: uid(), name: clean, rel }] };
        }),
      removeMember: (id) => set((s) => ({ members: s.members.filter((m) => m.id !== id) })),
      loadSample: () => set({ members: SAMPLE.map(([rel, name]) => ({ id: uid(), rel, name })) }),
      clearTree: () => set({ members: [] }),
      setMinuteStep: (minuteStep) => set({ minuteStep }),
      setHomeworkMin: (n) => set({ homeworkMin: Math.max(HOMEWORK.minRange[0], Math.min(HOMEWORK.minRange[1], Math.round(n))) }),
    }),
    { name: 'ecyr:time-family', version: 1 },
  ),
);
