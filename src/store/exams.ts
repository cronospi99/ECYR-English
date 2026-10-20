import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { ExamSection } from '@/content/exams';

/**
 * Exam results on this device (the teacher gets each attempt as student work,
 * src/lib/work.ts). Keeps the best and the latest attempt of every exam.
 */
export interface ExamResult {
  pct: number;
  grade: number;
  /** Section → percent; null = waiting for the teacher (no AI marking). */
  sections: Partial<Record<ExamSection, number | null>>;
  at: string;
}

interface ExamStore {
  results: Record<string, { best: ExamResult; last: ExamResult; attempts: number }>;
  record: (id: string, r: ExamResult) => void;
}

export const useExamResults = create<ExamStore>()(
  persist(
    (set) => ({
      results: {},
      record: (id, r) =>
        set((s) => {
          const prev = s.results[id];
          return {
            results: {
              ...s.results,
              [id]: { best: !prev || r.pct >= prev.best.pct ? r : prev.best, last: r, attempts: (prev?.attempts ?? 0) + 1 },
            },
          };
        }),
    }),
    { name: 'ecyr:exams', version: 1 },
  ),
);
