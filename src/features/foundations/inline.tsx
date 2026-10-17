import { Link } from 'react-router-dom';
import { CheckCircle2, GraduationCap, Puzzle } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { loadFoundations } from '@/content/levels';
import type { CourseTopic } from '@/content/types';
import { useProgress } from '@/store/progress';
import { Disclosure } from '@/features/learn/unit/ui';
import { ProgressBar } from '@/components/ui/Progress';
import { ink, tint } from '@/lib/color';
import { Block, INTERACTIVE } from './blocks';
import { useTopicRun } from './run';
import { PREA1_REVIEW, topicsForPoint } from './meta';

const PREA1_TITLES: Record<string, string> = {
  'verb-be': 'Verb to be',
  possessives: 'Possessive adjectives',
  'wh-questions': 'Wh- questions',
  'this-that': 'This · that · these · those',
  numbers: 'Numbers',
  clothing: 'Clothes',
};

/**
 * Interactive lessons from the former English Foundations course, shown inside
 * the A1/A2 grammar lessons they belong to (mapping in ./meta.ts), plus links to
 * the Pre-A1 topics a grammar point builds on.
 */
export function FoundationExtras({ unitKey, pointIndex, color }: { unitKey: string; pointIndex: number; pointName: string; color: string }) {
  const ids = topicsForPoint(unitKey, pointIndex);
  const review = PREA1_REVIEW[`${unitKey}-${pointIndex}`] ?? [];
  const { data } = useAsync(() => (ids.length ? loadFoundations() : Promise.resolve([])), [ids.join()]);
  if (!ids.length && !review.length) return null;
  const topics = (data ?? []).flatMap((u) => u.topics).filter((t) => ids.includes(t.id));

  return (
    <div className="space-y-3">
      {topics.map((t) => (
        <InlineTopic key={t.id} topic={t} color={color} />
      ))}
      {review.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-[14px]">
          <span className="text-label-2 inline-flex items-center gap-1.5">
            <GraduationCap size={16} aria-hidden /> Repasa en Pre-A1:
          </span>
          {review.map((id) => (
            <Link
              key={id}
              to={`/learn/foundations/${id}`}
              className="rounded-full px-3 py-1 text-[13px] font-semibold transition-opacity hover:opacity-80"
              style={{ background: tint(color, 14), color: ink(color) }}
            >
              {PREA1_TITLES[id] ?? id}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function InlineTopic({ topic, color }: { topic: CourseTopic; color: string }) {
  const done = useProgress((s) => s.topics[topic.id]);
  const exercises = topic.blocks.filter((b) => INTERACTIVE.has(b.t)).length;
  return (
    <Disclosure
      summary={
        <span className="inline-flex items-center gap-2">
          Práctica interactiva · {topic.title}
          {done && <CheckCircle2 size={16} className="text-ink-green" aria-label={`Completado ${done.score}%`} />}
        </span>
      }
      icon={Puzzle}
      color={color}
      meta={`${exercises} ${exercises === 1 ? 'ejercicio' : 'ejercicios'} con corrección · tablas y ejemplos en español`}
    >
      <TopicBody topic={topic} color={color} />
    </Disclosure>
  );
}

function TopicBody({ topic, color }: { topic: CourseTopic; color: string }) {
  const { interactive, answered, allDone, avg, onResult } = useTopicRun(topic, `A1 · ${topic.title}`);
  return (
    <div className="space-y-3">
      {interactive.length > 0 && (
        <div>
          <div className="text-label-2 mb-1 flex justify-between text-[12px]">
            <span>Ejercicios</span>
            <span className="tabular-nums">
              {answered}/{interactive.length}
            </span>
          </div>
          <ProgressBar value={answered / interactive.length} color={color} />
        </div>
      )}
      {topic.blocks.map((b, i) => (
        <Block key={`${topic.id}-${i}`} block={b} onResult={onResult(i)} />
      ))}
      {allDone && <p className="text-ink-green text-[14px] font-semibold">¡Práctica completada! · {avg}%</p>}
    </div>
  );
}
