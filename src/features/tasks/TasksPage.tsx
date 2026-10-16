import { useState } from 'react';
import { CheckCheck, ClipboardList, CloudOff, Lock, RefreshCw, School, Users } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { EmptyState, PageLoader, SectionTitle } from '@/components/ui/Misc';
import { isSupabaseConfigured } from '@/lib/supabase';
import { UploadSheet } from '@/features/portfolio/UploadSheet';
import type { PortfolioItem } from '@/lib/portfolio';
import { KIND_META } from './meta';
import { TaskCard } from './TaskCard';
import { useMyTasks, type TaskView } from './useMyTasks';
import { ink } from '@/lib/color';

export { TasksWidget } from './TasksWidget';

const eyebrow = (
  <span className="inline-flex items-center gap-1.5">
    <ClipboardList size={15} className="text-ink-blue" aria-hidden /> Tareas
  </span>
);

export default function TasksPage() {
  const t = useMyTasks();
  const [submitFor, setSubmitFor] = useState<TaskView | null>(null);
  const [submitErr, setSubmitErr] = useState<string | null>(null);

  if (!isSupabaseConfigured || (t.ready && !t.uid)) return <Gate kind={!isSupabaseConfigured ? 'offline' : 'signed-out'} />;
  if (!t.ready || (t.uid && !t.profile)) return <PageLoader />;
  if (t.profile?.role === 'teacher') return <Gate kind="teacher" />;
  if (!t.profile?.teacher_id) return <Gate kind="no-class" />;

  const overdue = t.pending.filter((v) => v.eff === 'overdue').length;

  const onSaved = async (item: PortfolioItem) => {
    const v = submitFor;
    setSubmitFor(null);
    if (!v) return;
    try {
      setSubmitErr(null);
      await t.markDone(v.a.id, { via: 'submission', portfolioItemId: item.id });
    } catch (e) {
      setSubmitErr(`Tu trabajo quedó guardado en "Mis trabajos", pero no se pudo marcar la tarea: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Page
      eyebrow={eyebrow}
      title="Mis tareas"
      subtitle="Lo que te asignó tu profesor. Muchas se marcan solas cuando completas la actividad en la plataforma."
      actions={
        <Button variant="gray" size="sm" onClick={() => void t.reload()} disabled={t.loading} aria-label="Actualizar tareas">
          <RefreshCw size={15} className={t.loading ? 'animate-spin' : undefined} aria-hidden /> Actualizar
        </Button>
      }
    >
      {t.loading && !t.pending.length && !t.finished.length ? (
        <PageLoader />
      ) : t.error ? (
        <Card className="mx-auto max-w-xl p-6 text-center">
          <p className="text-ink-red text-body" role="alert">
            {t.error}
          </p>
          <Button className="mt-4" variant="tinted" onClick={() => void t.reload()}>
            Reintentar
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-3 sm:max-w-[520px]">
            <Stat value={t.pending.length} label="Pendientes" color="var(--blue)" />
            <Stat value={overdue} label="Vencidas" color={overdue ? 'var(--red)' : 'var(--label-3)'} />
            <Stat value={t.finished.length} label="Entregadas" color="var(--green)" />
          </div>

          {submitErr && (
            <p role="alert" className="text-ink-red text-subhead">
              {submitErr}
            </p>
          )}

          <section aria-labelledby="tasks-pending">
            <SectionTitle>
              <span id="tasks-pending">Pendientes</span>
            </SectionTitle>
            {t.pending.length ? (
              <div className="grid gap-3 lg:grid-cols-2">
                {t.pending.map((v) => (
                  <TaskCard
                    key={v.a.id}
                    view={v}
                    onMarkDone={() => t.markDone(v.a.id, { via: 'manual' })}
                    onUndo={() => t.markPending(v.a.id)}
                    onSubmit={() => setSubmitFor(v)}
                  />
                ))}
              </div>
            ) : (
              <Card>
                <EmptyState
                  icon={<CheckCheck size={44} strokeWidth={1.6} />}
                  title="¡Todo al día!"
                  body={t.finished.length ? 'No tienes tareas pendientes. Buen trabajo.' : 'Tu profesor aún no te ha asignado tareas. Aparecerán aquí.'}
                />
              </Card>
            )}
          </section>

          {t.finished.length > 0 && (
            <section aria-labelledby="tasks-done">
              <SectionTitle>
                <span id="tasks-done">Entregadas</span>
              </SectionTitle>
              <div className="grid gap-3 lg:grid-cols-2">
                {t.finished.map((v) => (
                  <TaskCard
                    key={v.a.id}
                    view={v}
                    onMarkDone={() => t.markDone(v.a.id, { via: 'manual' })}
                    onUndo={() => t.markPending(v.a.id)}
                    onSubmit={() => setSubmitFor(v)}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      <UploadSheet open={Boolean(submitFor)} onClose={() => setSubmitFor(null)} onSaved={(item) => void onSaved(item)} />
    </Page>
  );
}

function Stat({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <Card className="px-4 py-3">
      <div className="text-[28px] leading-none font-bold tabular-nums" style={{ color: ink(color) }}>
        {value}
      </div>
      <div className="text-footnote text-label-2 mt-1">{label}</div>
    </Card>
  );
}

function Gate({ kind }: { kind: 'offline' | 'signed-out' | 'teacher' | 'no-class' }) {
  const copy = {
    offline: {
      icon: <CloudOff size={22} aria-hidden />,
      title: 'Necesita conexión con el servidor',
      body: 'Este despliegue funciona sin cuentas, así que no hay tareas de profesor. Tu progreso sigue guardado en este navegador.',
      cta: 'Ir a mi perfil',
      to: '/profile',
    },
    'signed-out': {
      icon: <Lock size={22} aria-hidden />,
      title: 'Inicia sesión para ver tus tareas',
      body: 'Tu profesor puede asignarte unidades, juegos, prácticas o entregas. Las verás aquí, y muchas se marcan solas cuando las completas.',
      cta: 'Iniciar sesión o crear cuenta',
      to: '/profile',
    },
    'no-class': {
      icon: <Users size={22} aria-hidden />,
      title: 'Únete a la clase de tu profesor',
      body: 'Pídele a tu profesor el código de su clase y escríbelo en tu perfil. Después verás aquí las tareas que te asigne.',
      cta: 'Unirme con un código',
      to: '/profile',
    },
    teacher: {
      icon: <School size={22} aria-hidden />,
      title: 'Las tareas se crean desde la Sala del docente',
      body: 'Asigna tareas a toda tu clase o a estudiantes concretos y sigue quién las completó.',
      cta: 'Ir a la Sala del docente',
      to: '/teacher',
    },
  }[kind];
  const kinds = ['unit', 'game', 'writing', 'listening', 'grammar', 'ielts'] as const;
  return (
    <Page eyebrow={eyebrow} title="Mis tareas">
      <Card className="mx-auto max-w-[560px] overflow-hidden">
        <div className="brand-gradient relative flex h-32 items-end justify-center gap-2 overflow-hidden pb-5" aria-hidden>
          {kinds.map((k, i) => (
            <span key={k} style={{ transform: `translateY(${[6, -6, 2, -10, 0, 8][i]}px) rotate(${[-8, 4, -3, 6, -5, 9][i]}deg)` }}>
              <IconTile icon={KIND_META[k].icon} color="rgb(255 255 255 / 0.22)" size={42} />
            </span>
          ))}
        </div>
        <div className="p-6 text-center">
          <span className="bg-card text-label-2 relative z-10 mx-auto -mt-12 mb-3 flex h-12 w-12 items-center justify-center rounded-full shadow-card ring-4 ring-[var(--card)]">
            {copy.icon}
          </span>
          <h2 className="text-title-2">{copy.title}</h2>
          <p className="text-body text-label-2 mx-auto mt-2 max-w-[420px] text-pretty">{copy.body}</p>
          <ButtonLink to={copy.to} variant="brand" size="lg" className="mt-5 w-full sm:w-auto">
            {copy.cta}
          </ButtonLink>
        </div>
      </Card>
    </Page>
  );
}
