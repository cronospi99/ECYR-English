import { CheckCircle2, MonitorPlay } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { ListGroup, ListRow } from '@/components/ui/List';
import { ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Misc';
import { ProgressRing } from '@/components/ui/Progress';
import { Card } from '@/components/ui/Card';
import { useAsync } from '@/hooks/useAsync';
import { loadFoundations, loadPreA1 } from '@/content/levels';
import { useProgress } from '@/store/progress';
import { deep } from '@/lib/color';
import { cn } from '@/lib/cn';
import { FOUNDATION_MAP, PREA1, unitPath } from './meta';

export default function FoundationsPage() {
  const { data, loading } = useAsync(() => Promise.all([loadPreA1(), loadFoundations()]), []);
  const topics = useProgress((s) => s.topics);
  const course = data?.[0];
  const total = course?.reduce((n, u) => n + u.topics.length, 0) ?? 0;
  const done = course?.reduce((n, u) => n + u.topics.filter((t) => topics[t.id]).length, 0) ?? 0;

  // Old course topics, grouped by the A1/A2 unit they live in now.
  const moved = new Map<string, { id: string; title: string; point: number }[]>();
  for (const u of data?.[1] ?? [])
    for (const t of u.topics) {
      const p = FOUNDATION_MAP[t.id];
      if (!p) continue;
      moved.set(p.unitKey, [...(moved.get(p.unitKey) ?? []), { id: t.id, title: t.title, point: p.point }]);
    }
  const movedUnits = [...moved.entries()].sort(([a], [b]) => {
    const [la, na] = a.split('-');
    const [lb, nb] = b.split('-');
    return la === lb ? Number(na) - Number(nb) : la! < lb! ? -1 : 1;
  });

  return (
    <Page
      back={{ to: '/learn', label: 'Aprender' }}
      eyebrow="Pre-A1 · Antes de empezar A1"
      title="Foundations"
      subtitle="Las bases del inglés explicadas en español: alfabeto, saludos, to be, posesivos, números, signos, demostrativos, preguntas, la ropa y el genitivo sajón."
      actions={
        <ButtonLink to="/play/a1-foundations" variant="tinted">
          <MonitorPlay size={17} /> Versión cómic
        </ButtonLink>
      }
    >
      {loading || !course ? (
        <PageLoader />
      ) : (
        <>
          <Card className="mb-6 overflow-hidden">
            <div className={cn('flex items-center gap-4 bg-gradient-to-br p-5 text-white', PREA1.tint)}>
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-bold tracking-wide uppercase opacity-90">Progreso del curso</div>
                <div className="text-[28px] leading-tight font-extrabold tabular-nums">
                  {done}/{total} temas
                </div>
                <p className="mt-1 text-[14px] opacity-90">{PREA1.description}</p>
              </div>
              <ProgressRing value={total ? done / total : 0} size={64} stroke={6} color="#fff" className="[&_circle:first-child]:stroke-white/25">
                <span className="text-[14px] font-bold">{Math.round((total ? done / total : 0) * 100)}%</span>
              </ProgressRing>
            </div>
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            {course.map((u) => (
              <ListGroup key={u.id} header={`Unidad ${Number(u.n)} · ${u.title} — ${u.es}`} footer={u.blurb}>
                {u.topics.map((t, k) => (
                  <ListRow
                    key={t.id}
                    to={`/learn/foundations/${t.id}`}
                    leading={
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[13px] font-extrabold text-white"
                        style={{ background: deep(u.color) }}
                        aria-label={`Tema ${(Number(u.n) - 1) * 2 + k + 1}`}
                      >
                        {t.icon}
                      </span>
                    }
                    title={t.title}
                    subtitle={t.kicker}
                    trailing={topics[t.id] ? <CheckCircle2 size={20} className="text-ink-green" /> : undefined}
                  />
                ))}
              </ListGroup>
            ))}
          </div>

          {movedUnits.length > 0 && (
            <div className="mt-8">
              <h2 className="text-title-3">¿Y los otros temas del curso anterior?</h2>
              <p className="text-label-2 mt-1 mb-4 text-[15px] text-pretty">
                Present simple, pasado, comparativos, can, there is… ahora están dentro de la lección de gramática de A1 o A2 donde se estudian, como «Práctica
                interactiva».
              </p>
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                {movedUnits.map(([key, list]) => (
                  <ListGroup key={key} header={key.replace('-', ' · Unidad ')}>
                    {list.map((t) => (
                      <ListRow
                        key={t.id}
                        to={unitPath(key)}
                        title={t.title}
                        subtitle={`Lección de gramática ${t.point + 1}`}
                        trailing={topics[t.id] ? <CheckCircle2 size={18} className="text-ink-green" /> : undefined}
                      />
                    ))}
                  </ListGroup>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </Page>
  );
}
