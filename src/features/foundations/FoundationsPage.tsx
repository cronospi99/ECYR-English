import { CheckCircle2, MonitorPlay } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { ListGroup, ListRow } from '@/components/ui/List';
import { ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Misc';
import { ProgressBar } from '@/components/ui/Progress';
import { Card } from '@/components/ui/Card';
import { useAsync } from '@/hooks/useAsync';
import { loadFoundations } from '@/content/levels';
import { useProgress } from '@/store/progress';

export default function FoundationsPage() {
  const { data, loading } = useAsync(loadFoundations, []);
  const topics = useProgress((s) => s.topics);
  const total = data?.reduce((n, u) => n + u.topics.length, 0) ?? 0;
  const done = data?.reduce((n, u) => n + u.topics.filter((t) => topics[t.id]).length, 0) ?? 0;

  return (
    <Page
      back={{ to: '/learn', label: 'Aprender' }}
      eyebrow="A1 · Curso de cómic"
      title="English Foundations"
      subtitle="Las bases del inglés explicadas en español, con lecturas, diálogos y ejercicios interactivos."
      actions={
        <ButtonLink to="/play/a1-foundations" variant="tinted">
          <MonitorPlay size={17} /> Versión cómic
        </ButtonLink>
      }
    >
      {loading || !data ? (
        <PageLoader />
      ) : (
        <>
          <Card className="mb-6 p-5">
            <div className="flex items-center justify-between text-[15px]">
              <span className="font-semibold">Progreso del curso</span>
              <span className="text-label-2 tabular-nums">
                {done}/{total} temas
              </span>
            </div>
            <ProgressBar value={total ? done / total : 0} color="var(--red)" className="mt-3" height={8} />
          </Card>
          <div className="grid gap-6 lg:grid-cols-2">
            {data.map((u) => (
              <ListGroup key={u.id} header={`Unidad ${u.n} · ${u.title} — ${u.es}`} footer={u.blurb}>
                {u.topics.map((t) => (
                  <ListRow
                    key={t.id}
                    to={`/learn/foundations/${t.id}`}
                    leading={
                      <span
                        className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[13px] font-extrabold text-white"
                        style={{ background: u.color }}
                      >
                        {t.icon}
                      </span>
                    }
                    title={t.title}
                    subtitle={t.kicker}
                    trailing={topics[t.id] ? <CheckCircle2 size={20} className="text-ios-green" /> : undefined}
                  />
                ))}
              </ListGroup>
            ))}
          </div>
        </>
      )}
    </Page>
  );
}
