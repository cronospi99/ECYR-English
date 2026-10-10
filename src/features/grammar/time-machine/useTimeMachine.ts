import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StageId } from './data';

/** Per-device progress of the Time Machine stages (best result per stage) and the video notebook. */
interface TimeMachineState {
  cleared: Partial<Record<StageId, { correct: number; total: number }>>;
  notes: string;
  clear: (id: StageId, correct: number, total: number) => void;
  setNotes: (v: string) => void;
}

export const useTimeMachine = create<TimeMachineState>()(
  persist(
    (set) => ({
      cleared: {},
      notes: '',
      clear: (id, correct, total) =>
        set((s) => {
          const prev = s.cleared[id];
          if (prev && prev.total > 0 && prev.correct / prev.total >= correct / Math.max(1, total)) return s;
          return { cleared: { ...s.cleared, [id]: { correct, total } } };
        }),
      setNotes: (notes) => set({ notes }),
    }),
    { name: 'ecyr:time-machine' },
  ),
);
