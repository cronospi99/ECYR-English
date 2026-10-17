import { useState } from 'react';
import type { CourseTopic } from '@/content/types';
import { useProgress } from '@/store/progress';
import { INTERACTIVE } from './blocks';

/** Exercise results of one topic; completes the topic (XP, streak) when every exercise is answered. */
export function useTopicRun(topic: CourseTopic, title: string) {
  const [results, setResults] = useState<Record<number, number>>({});
  const completeTopic = useProgress((s) => s.completeTopic);
  const interactive = topic.blocks.map((b, i) => (INTERACTIVE.has(b.t) ? i : -1)).filter((i) => i >= 0);
  const answered = interactive.filter((i) => results[i] !== undefined).length;
  const allDone = interactive.length > 0 && answered === interactive.length;
  const avg = allDone ? Math.round(interactive.reduce((s, i) => s + results[i]!, 0) / interactive.length) : 0;

  const isComplete = (r: Record<number, number>) => interactive.every((k) => r[k] !== undefined);
  const onResult = (i: number) => (score: number) => {
    const n = { ...results, [i]: score };
    setResults(n);
    if (isComplete(n) && !isComplete(results)) {
      const a = Math.round(interactive.reduce((s, k) => s + n[k]!, 0) / interactive.length);
      completeTopic(topic.id, a, title);
    }
  };
  return { interactive, answered, allDone, avg, onResult };
}
