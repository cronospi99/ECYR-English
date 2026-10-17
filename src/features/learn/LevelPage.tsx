import { useParams } from 'react-router-dom';
import { BookOpen, CheckCircle2 } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { ListGroup, ListRow } from '@/components/ui/List';
import { ProgressBar } from '@/components/ui/Progress';
import { ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Misc';
import { Card } from '@/components/ui/Card';
import { useAsync } from '@/hooks/useAsync';
import { loadLevel, levelMeta } from '@/content/levels';
import { useProgress, levelCompletion } from '@/store/progress';
import NotFound from '../NotFound';
import { cn } from '@/lib/cn';
import { deep } from '@/lib/color';

export const unitTitle = (t: string) => t.charAt(0) + t.slice(1).toLowerCase();

export default function LevelPage() {
  const { level = '' } = useParams();
  const meta = levelMeta(level);
  const units = useProgress((s) => s.units);
  const { data, loading } = useAsync(() => (meta ? loadLevel(meta.id) : Promise.resolve(null)), [meta?.id]);
  if (!meta) return <NotFound />;
  const c = levelCompletion(units, meta.id);

  return (
    <Page
      back={{ to: '/learn', label: 'Aprender' }}
      eyebrow={`${meta.book} · ${meta.name}`}
      title={`${meta.id} · ${meta.nameEs}`}
      subtitle={meta.description}
      actions={
        <ButtonLink to={`/play/${meta.module}`} variant="tinted">
          <BookOpen size={17} /> Libro interactivo
        </ButtonLink>
      }
    >
      <Card className="mb-6 p-5">
        <div className="flex items-center justify-between text-[15px]">
          <span className="font-semibold">Progreso del nivel</span>
          <span className="text-label-2 tabular-nums">
            {c.done}/{c.total} unidades · {Math.round(c.ratio * 100)}%
          </span>
        </div>
        <ProgressBar value={c.ratio} color={meta.color} className="mt-3" height={8} />
      </Card>

      {loading || !data ? (
        <PageLoader />
      ) : (
        <ListGroup header={`${data.units.length} unidades`}>
          {data.units.map((u) => {
            const done = units[`${meta.id}-${u.n}`];
            return (
              <ListRow
                key={u.n}
                to={`/learn/${level}/${u.n}`}
                leading={
                  <span
                    className="flex h-10 w-10 items-center justify-center rounded-[11px] text-[15px] font-bold text-white"
                    style={{ background: deep(u.color) }}
                  >
                    {u.n}
                  </span>
                }
                title={unitTitle(u.title)}
                subtitle={u.theme}
                trailing={
                  done ? (
                    <span className="text-ink-green inline-flex items-center gap-1 text-[14px] font-semibold">
                      <CheckCircle2 size={18} /> {done.score}%
                    </span>
                  ) : (
                    <span className={cn('text-[13px]')}>{u.vocab.length} palabras</span>
                  )
                }
              />
            );
          })}
        </ListGroup>
      )}
    </Page>
  );
}
