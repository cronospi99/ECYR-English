import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { CheckCircle2, ChevronRight, Trophy } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { PageLoader } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Progress';
import { useAsync } from '@/hooks/useAsync';
import { loadFoundations } from '@/content/levels';
import { useProgress } from '@/store/progress';
import { Block, INTERACTIVE } from './blocks';
import NotFound from '../NotFound';

export default function TopicPage() {
  const { topicId = '' } = useParams();
  const { data, loading } = useAsync(loadFoundations, []);
  const [results, setResults] = useState<Record<number, number>>({});
  const completeTopic = useProgress((s) => s.completeTopic);
  const done = useProgress((s) => s.topics[topicId]);

  const found = useMemo(() => {
    if (!data) return null;
    const flat = data.flatMap((u) => u.topics.map((t) => ({ unit: u, topic: t })));
    const i = flat.findIndex((x) => x.topic.id === topicId);
    return i < 0 ? null : { ...flat[i]!, next: flat[i + 1] };
  }, [data, topicId]);

  if (loading || !data) return <PageLoader />;
  if (!found) return <NotFound />;
  const { unit, topic, next } = found;
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
      completeTopic(topic.id, a, `A1 · ${topic.title}`);
    }
  };

  return (
    <Page
      key={topicId}
      back={{ to: '/learn/foundations', label: 'Foundations' }}
      eyebrow={`Unidad ${unit.n} · ${unit.title}`}
      title={topic.title}
      subtitle={topic.kicker}
      actions={
        done && (
          <span className="text-ios-green inline-flex items-center gap-1.5 text-[15px] font-semibold">
            <CheckCircle2 size={20} /> {done.score}%
          </span>
        )
      }
    >
      {interactive.length > 0 && (
        <div className="material sticky top-12 z-20 -mx-4 mb-5 px-4 py-3 sm:-mx-6 sm:px-6 lg:top-0 lg:mx-0 lg:rounded-[14px]">
          <div className="text-label-2 mb-1.5 flex justify-between text-[13px]">
            <span>Ejercicios</span>
            <span className="tabular-nums">
              {answered}/{interactive.length}
            </span>
          </div>
          <ProgressBar value={answered / interactive.length} color={unit.color} />
        </div>
      )}

      <div className="mx-auto max-w-3xl space-y-5">
        {topic.blocks.map((b, i) => (
          <Block key={`${topicId}-${i}`} block={b} onResult={onResult(i)} />
        ))}

        {allDone && (
          <Card className="flex items-center gap-4 p-5">
            <Trophy className="text-ios-yellow shrink-0" size={36} />
            <div className="flex-1">
              <div className="text-headline">¡Tema completado! · {avg}%</div>
              <div className="text-label-2 text-[14px]">Has ganado XP y avanzado en tu racha.</div>
            </div>
          </Card>
        )}

        {next && (
          <Link
            to={`/learn/foundations/${next.topic.id}`}
            onClick={() => setResults({})}
            className="bg-card flex items-center gap-3 rounded-[18px] p-4 shadow-card transition-transform active:scale-[0.99]"
          >
            <div className="flex-1">
              <div className="text-label-2 text-[13px]">Siguiente tema</div>
              <div className="text-headline">{next.topic.title}</div>
            </div>
            <ChevronRight className="text-label-3" />
          </Link>
        )}
      </div>
    </Page>
  );
}
