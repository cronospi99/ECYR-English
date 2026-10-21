import type { ComponentType } from 'react';
import { DoMakeLesson, DoMakeQuiz, DoMakeSorter } from './DoMakePage';

/** Do vs Make pieces that lessons embed (src/features/grammar/unitTools.tsx). */
export const DO_MAKE_TOOLS: Record<string, { title: string; Component: ComponentType }> = {
  lesson: { title: 'Do vs Make', Component: DoMakeLesson },
  sort: { title: '¿DO o MAKE?', Component: DoMakeSorter },
  quiz: { title: 'Práctica', Component: DoMakeQuiz },
};
