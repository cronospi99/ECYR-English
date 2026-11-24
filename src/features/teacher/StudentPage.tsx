import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { FileUp, Mail } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card, CardHeader } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { LevelChip, Spinner, EmptyState } from '@/components/ui/Misc';
import { Avatar } from '@/components/layout/Avatar';
import { currentLevel } from '@/store/progress';
import { evaluatePlan, GOAL_INFO, SKILL_INFO, ALL_SKILLS } from '@/lib/planner';
import { supabase } from '@/lib/supabase';
import { relativeTime } from '@/lib/date';
import { ProgressOverview } from '@/features/progress/ProgressPage';
import { IeltsSummary } from '@/features/progress/IeltsSummary';
import { GameProgressView } from '@/features/games/GameProgress';
import { PortfolioList } from '@/features/portfolio/PortfolioList';
import { PlanWeek } from '@/features/plan/PlanWeek';
import { ProgressBar } from '@/components/ui/Progress';
import NotFound from '../NotFound';
import { useClass } from './useClass';
import { StudentAssignments } from '@/features/tasks/teacher';
import { AssignButton } from '@/features/tasks/AssignButton';
import { StudentWork } from './WorkList';

type Tab = 'overview' | 'tasks' | 'plan' | 'games' | 'ielts' | 'work';

export default function StudentPage() {
  const { id = '' } = useParams();
  const { isTeacher, students, loading } = useClass();
  const [params, setParams] = useSearchParams();
  const tab: Tab = (['tasks', 'plan', 'games', 'ielts', 'work'] as const).find((t) => t === params.get('tab')) ?? 'overview';

  if (!isTeacher) return <NotFound />;
  if (!students)
    return (
      <Page back={{ to: '/teacher', label: 'My class' }}>
        <div className="text-label-2 flex items-center justify-center gap-2 py-20">{loading && <Spinner className="h-5 w-5" />} Loading…</div>
      </Page>
    );
  const s = students.find((x) => x.profile.id === id);
  if (!s) return <NotFound />;
  const name = s.profile.full_name || s.profile.email || 'Student';
  const level = currentLevel(s.progress.units);

  return (
    <Page back={{ to: '/teacher', label: 'My class' }} wide>
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <Avatar name={name} config={s.avatar} size={72} />
        <div className="min-w-0 flex-1">
          <h1 className="text-large-title truncate">{name}</h1>
          <div className="text-label-2 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[14px]">
            <LevelChip level={level} />
            {s.profile.email && (
              <a href={`mailto:${s.profile.email}`} className="text-ink-blue inline-flex items-center gap-1">
                <Mail size={14} /> {s.profile.email}
              </a>
            )}
            <span>{s.syncedAt ? `Sincronizado ${relativeTime(s.syncedAt)}` : 'Hasn’t synced progress yet'}</span>
          </div>
        </div>
        <AssignButton
          variant="brand"
          size="md"
          label={`Assign a task to ${name.split(/[\s@]/)[0] || 'this student'}`}
          preset={{ students: [s.profile.id] }}
          onSaved={() => tab === 'tasks' && setParams({ tab: 'tasks', r: String(Date.now()) })}
        />
      </div>
      <div className="no-scrollbar mb-5 overflow-x-auto">
        <Segmented<Tab>
          value={tab}
          onChange={(t) => setParams(t === 'overview' ? {} : { tab: t })}
          options={[
            { value: 'overview', label: 'Progress' },
            { value: 'tasks', label: 'Tasks' },
            { value: 'plan', label: 'Plan' },
            { value: 'games', label: 'Games' },
            { value: 'ielts', label: 'IELTS' },
            { value: 'work', label: 'Work' },
          ]}
        />
      </div>
      {tab === 'overview' && (
        <>
          <ProgressOverview p={s.progress} />
          <Migrations userId={s.profile.id} />
        </>
      )}
      {tab === 'tasks' && <StudentAssignments key={params.get('r') ?? ''} studentId={s.profile.id} />}
      {tab === 'plan' && <PlanTab s={s} />}
      {tab === 'games' && <GameProgressView sessions={s.games} defenders={s.defenders} />}
      {tab === 'ielts' && (
        <div className="space-y-5">
          <IeltsSummary data={s.ielts} />
          <StudentWork studentId={s.profile.id} source="ielts" />
        </div>
      )}
      {tab === 'work' && (
        <div className="space-y-6">
          <StudentWork studentId={s.profile.id} />
          <section>
            <h2 className="text-title-3 mb-3 px-1">Files and hand-ins (My work)</h2>
            <PortfolioList userId={s.profile.id} canReview />
          </section>
        </div>
      )}
    </Page>
  );
}

function PlanTab({ s }: { s: NonNullable<ReturnType<typeof useClass>['students']>[number] }) {
  const plan = s.plan?.current;
  if (!plan) return <EmptyState icon={<FileUp size={40} />} title="No active plan" body="This student hasn’t created a weekly plan." />;
  const ev = evaluatePlan(plan, s.progress.activity, s.plan!.manual);
  return (
    <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
      <div className="min-w-0 space-y-5">
        <Card className="p-5">
          <div className="text-label-2 text-[13px]">
            {GOAL_INFO[plan.prefs.goal].label} · {plan.start} → {plan.end}
          </div>
          <h2 className="text-title-2 mt-0.5">{plan.title}</h2>
          <div className="mt-3 flex items-center gap-3">
            <ProgressBar value={ev.ratio} height={8} color="linear-gradient(90deg,var(--brand-from),var(--brand-to))" />
            <span className="shrink-0 font-bold tabular-nums">{Math.round(ev.ratio * 100)}%</span>
          </div>
          <div className="text-label-2 mt-2 text-[13px]">
            {ev.done}/{ev.total} tasks · {ev.minutesDone}/{ev.minutesPlanned} min · {ev.activeDays} active days {ev.avgScore != null ? ` · ${ev.avgScore}% accuracy` : ''} </div>
        </Card>
        <PlanWeek plan={plan} ev={ev} readOnly />
      </div>
      <Card className="pb-5">
        <CardHeader title="By skill" />
        <ul className="mt-3 space-y-3 px-5">
          {ALL_SKILLS.filter((k) => ev.bySkill[k].planned).map((k) => (
            <li key={k}>
              <div className="mb-1 flex justify-between text-[13px]">
                <span className="font-semibold">{SKILL_INFO[k].label}</span>
                <span className="text-label-2 tabular-nums">
                  {ev.bySkill[k].done}/{ev.bySkill[k].planned}
                </span>
              </div>
              <ProgressBar value={ev.bySkill[k].done / ev.bySkill[k].planned} color={SKILL_INFO[k].color} height={6} />
            </li>
          ))}
        </ul>
        {s.plan!.history.length > 0 && (
          <>
            <div className="text-label-2 mt-5 px-5 text-[12px] font-semibold uppercase">Previous weeks</div>
            <ul className="mt-1">
              {s.plan!.history.slice(0, 6).map((h) => (
                <li key={h.id} className="flex justify-between gap-2 px-5 py-1.5 text-[13px]">
                  <span className="truncate">{h.title}</span>
                  <span className="text-label-2 tabular-nums">{h.total ? Math.round((h.done / h.total) * 100) : 0}%</span>
                </li>
              ))}
            </ul>
          </>
        )}
      </Card>
    </div>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  'ielts-account': 'IELTS Simulator account',
  'ielts-session-file': 'IELTS session file',
  'ecyr-progress-file': 'ECYR progress file',
};

/** Imports and migrations the student ran (from public.migrations_log). */
function Migrations({ userId }: { userId: string }) {
  const [rows, setRows] = useState<{ id: string; source: string; summary: Record<string, unknown>; created_at: string }[]>([]);
  useEffect(() => {
    if (!supabase) return;
    let alive = true;
    void supabase
      .from('migrations_log')
      .select('id,source,summary,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10)
      .then(({ data }) => alive && setRows((data ?? []) as typeof rows));
    return () => {
      alive = false;
    };
  }, [userId]);
  if (!rows.length) return null;
  return (
    <Card className="mt-5 pb-2">
      <CardHeader title="Imported progress" subtitle="Migrations and imports of this student" />
      <ul className="mt-2">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center justify-between gap-3 px-5 py-2 text-[14px]">
            <span className="font-medium">{SOURCE_LABEL[r.source] ?? r.source}</span>
            <span className="text-label-2 truncate text-[12px]">
              {Object.entries(r.summary ?? {})
                .filter(([, v]) => typeof v === 'number')
                .slice(0, 4)
                .map(([k, v]) => `${k}: ${v as number}`)
                .join(' · ')}
            </span>
            <span className="text-label-2 shrink-0 text-[12px]">{relativeTime(r.created_at)}</span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
