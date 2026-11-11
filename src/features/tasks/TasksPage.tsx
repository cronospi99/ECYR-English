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
import { isTasksMissing } from '@/lib/assignments';

export { TasksWidget } from './TasksWidget';

const eyebrow = (
  <span className="inline-flex items-center gap-1.5">
    <ClipboardList size={15} className="text-ink-blue" aria-hidden /> Tasks
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
      setSubmitErr(`Your work was saved in "My work", but the task could not be marked: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  return (
    <Page
      eyebrow={eyebrow}
      title="My tasks"
      subtitle="What your teacher assigned you. Many are ticked off automatically when you complete the activity on the platform."
      actions={
        <Button variant="gray" size="sm" onClick={() => void t.reload()} disabled={t.loading} aria-label="Refresh tasks">
          <RefreshCw size={15} className={t.loading ? 'animate-spin' : undefined} aria-hidden /> Refresh
        </Button>
      }
    >
      {t.loading && !t.pending.length && !t.finished.length ? (
        <PageLoader />
      ) : t.error ? (
        <Card className="mx-auto max-w-xl p-6 text-center">
          <p className="text-ink-red text-body" role="alert">
            {isTasksMissing(t.error) ? 'Your teacher hasn’t enabled Tasks on the platform yet. Let them know: a setup step is missing (09_assignments.sql).' : t.error}
          </p>
          <Button className="mt-4" variant="tinted" onClick={() => void t.reload()}>
            Retry
          </Button>
        </Card>
      ) : (
        <div className="space-y-8">
          <div className="grid grid-cols-3 gap-3 sm:max-w-[520px]">
            <Stat value={t.pending.length} label="Earrings" color="var(--blue)" />
            <Stat value={overdue} label="Overdue" color={overdue ? 'var(--red)' : 'var(--label-3)'} />
            <Stat value={t.finished.length} label="Handed in" color="var(--green)" />
          </div>

          {submitErr && (
            <p role="alert" className="text-ink-red text-subhead">
              {submitErr}
            </p>
          )}

          <section aria-labelledby="tasks-pending">
            <SectionTitle>
              <span id="tasks-pending">Earrings</span>
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
                  title="All caught up!"
                  body={t.finished.length ? 'You have no pending tasks. Good job.' : 'Your teacher hasn’t assigned you tasks yet. They will appear here.'}
                />
              </Card>
            )}
          </section>

          {t.finished.length > 0 && (
            <section aria-labelledby="tasks-done">
              <SectionTitle>
                <span id="tasks-done">Handed in</span>
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
      title: 'Needs a connection to the server',
      body: 'This deployment works without accounts, so there are no teacher tasks. Your progress is still saved in this browser.',
      cta: 'Go to my profile',
      to: '/profile',
    },
    'signed-out': {
      icon: <Lock size={22} aria-hidden />,
      title: 'Sign in to see your tasks',
      body: 'Your teacher can assign you units, games, practice or hand-ins. You’ll see them here, and many are ticked off automatically when you complete them.',
      cta: 'Sign in or create an account',
      to: '/profile',
    },
    'no-class': {
      icon: <Users size={22} aria-hidden />,
      title: 'Join your teacher’s class',
      body: 'Ask your teacher for their class code and type it in your profile. Then you’ll see the tasks they assign you here.',
      cta: 'Join with a code',
      to: '/profile',
    },
    teacher: {
      icon: <School size={22} aria-hidden />,
      title: 'Tasks are created from the Teacher room',
      body: 'Assign tasks to your whole class or to specific students and follow who completed them.',
      cta: 'Go to the Teacher room',
      to: '/teacher',
    },
  }[kind];
  const kinds = ['unit', 'game', 'writing', 'listening', 'grammar', 'ielts'] as const;
  return (
    <Page eyebrow={eyebrow} title="My tasks">
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
