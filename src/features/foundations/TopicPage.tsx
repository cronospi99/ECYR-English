import { useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, ChevronRight, Trophy } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { PageLoader } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Progress';
import { useAsync } from '@/hooks/useAsync';
import { loadFoundations, loadPreA1 } from '@/content/levels';
import type { CourseTopic, CourseUnit } from '@/content/types';
import { useProgress } from '@/store/progress';
import { Block } from './blocks';
import { useTopicRun } from './run';
import { FOUNDATION_MAP, unitPath } from './meta';
import NotFound from '../NotFound';

interface Found {
  unit: CourseUnit;
  topic: CourseTopic;
  next?: { unit: CourseUnit; topic: CourseTopic };
  /** false: a topic of the old course bank, now part of an A1/A2 unit. */
  course: boolean;
}

export default function TopicPage() {
  const { topicId = '' } = useParams();
  const { data, loading } = useAsync(() => Promise.all([loadPreA1(), loadFoundations()]), []);

  const found = useMemo((): Found | null => {
    if (!data) return null;
    const [course, bank] = data;
    const flat = course.flatMap((u) => u.topics.map((t) => ({ unit: u, topic: t })));
    const i = flat.findIndex((x) => x.topic.id === topicId);
    if (i >= 0) return { ...flat[i]!, next: flat[i + 1], course: true };
    for (const u of bank) {
      const t = u.topics.find((x) => x.id === topicId);
      if (t) return { unit: u, topic: t, course: false };
    }
    return null;
  }, [data, topicId]);

  if (loading || !data) return <PageLoader />;
  if (!found) return <NotFound />;
  return <TopicView key={topicId} {...found} />;
}

function TopicView({ unit, topic, next, course }: Found) {
  const done = useProgress((s) => s.topics[topic.id]);
  const { interactive, answered, allDone, avg, onResult } = useTopicRun(topic, `${course ? 'Pre-A1' : 'A1'} · ${topic.title}`);
  const home = FOUNDATION_MAP[topic.id];

  return (
    <Page
      back={{ to: '/learn/foundations', label: 'Foundations' }}
      eyebrow={course ? `Pre-A1 · Unidad ${Number(unit.n)} · ${unit.es}` : 'A1 · Tema de práctica'}
      title={topic.title}
      subtitle={topic.kicker}
      actions={
        done && (
          <span className="text-ink-green inline-flex items-center gap-1.5 text-[15px] font-semibold">
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
        {home && (
          <Link to={unitPath(home.unitKey)} className="bg-card flex items-center gap-3 rounded-[18px] p-4 shadow-card transition-transform active:scale-[0.99]">
            <div className="min-w-0 flex-1">
              <div className="text-label-2 text-[13px]">Este tema ahora forma parte de</div>
              <div className="text-headline">
                {home.unitKey.replace('-', ' · Unidad ')} · lección de gramática {home.point + 1}
              </div>
            </div>
            <ArrowRight className="text-ink-blue shrink-0" size={20} />
          </Link>
        )}

        {topic.blocks.map((b, i) => (
          <Block key={`${topic.id}-${i}`} block={b} onResult={onResult(i)} />
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
          <Link to={`/learn/foundations/${next.topic.id}`} className="bg-card flex items-center gap-3 rounded-[18px] p-4 shadow-card transition-transform active:scale-[0.99]">
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
