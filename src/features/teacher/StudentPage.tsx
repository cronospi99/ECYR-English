import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { ChevronDown, FileUp, Mail } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card, CardHeader } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { LevelChip, Spinner, EmptyState } from '@/components/ui/Misc';
import { Avatar } from '@/components/layout/Avatar';
import { currentLevel } from '@/store/progress';
import { evaluatePlan, GOAL_INFO, SKILL_INFO, ALL_SKILLS } from '@/lib/planner';
import { loadSubmissions, type Submission } from '@/lib/teacher';
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

type Tab = 'overview' | 'tasks' | 'plan' | 'games' | 'ielts' | 'work';

export default function StudentPage() {
  const { id = '' } = useParams();
  const { isTeacher, students, loading } = useClass();
  const [params, setParams] = useSearchParams();
  const tab: Tab = (['tasks', 'plan', 'games', 'ielts', 'work'] as const).find((t) => t === params.get('tab')) ?? 'overview';

  if (!isTeacher) return <NotFound />;
  if (!students)
    return (
      <Page back={{ to: '/teacher', label: 'Mi clase' }}>
        <div className="text-label-2 flex items-center justify-center gap-2 py-20">{loading && <Spinner className="h-5 w-5" />} Cargando…</div>
      </Page>
    );
  const s = students.find((x) => x.profile.id === id);
  if (!s) return <NotFound />;
  const name = s.profile.full_name || s.profile.email || 'Estudiante';
  const level = currentLevel(s.progress.units);

  return (
    <Page back={{ to: '/teacher', label: 'Mi clase' }} wide>
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
            <span>{s.syncedAt ? `Sincronizado ${relativeTime(s.syncedAt)}` : 'Aún no ha sincronizado progreso'}</span>
          </div>
        </div>
      </div>
      <div className="no-scrollbar mb-5 overflow-x-auto">
        <Segmented<Tab>
          value={tab}
          onChange={(t) => setParams(t === 'overview' ? {} : { tab: t })}
          options={[
            { value: 'overview', label: 'Progreso' },
            { value: 'tasks', label: 'Tareas' },
            { value: 'plan', label: 'Plan' },
            { value: 'games', label: 'Juegos' },
            { value: 'ielts', label: 'IELTS' },
            { value: 'work', label: 'Trabajos' },
          ]}
        />
      </div>
      {tab === 'overview' && (
        <>
          <ProgressOverview p={s.progress} />
          <Migrations userId={s.profile.id} />
        </>
      )}
      {tab === 'tasks' && <StudentAssignments studentId={s.profile.id} />}
      {tab === 'plan' && <PlanTab s={s} />}
      {tab === 'games' && <GameProgressView sessions={s.games} defenders={s.defenders} />}
      {tab === 'ielts' && (
        <div className="space-y-5">
          <IeltsSummary data={s.ielts} />
          <Submissions studentId={s.profile.id} />
        </div>
      )}
      {tab === 'work' && <PortfolioList userId={s.profile.id} canReview />}
    </Page>
  );
}

function PlanTab({ s }: { s: NonNullable<ReturnType<typeof useClass>['students']>[number] }) {
  const plan = s.plan?.current;
  if (!plan) return <EmptyState icon={<FileUp size={40} />} title="Sin plan activo" body="Este estudiante no ha creado un plan semanal." />;
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
            {ev.done}/{ev.total} tareas · {ev.minutesDone}/{ev.minutesPlanned} min · {ev.activeDays} días activos
            {ev.avgScore != null ? ` · acierto ${ev.avgScore}%` : ''}
          </div>
        </Card>
        <PlanWeek plan={plan} ev={ev} readOnly />
      </div>
      <Card className="pb-5">
        <CardHeader title="Por destreza" />
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
            <div className="text-label-2 mt-5 px-5 text-[12px] font-semibold uppercase">Semanas anteriores</div>
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

function Submissions({ studentId }: { studentId: string }) {
  const [list, setList] = useState<Submission[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    let alive = true;
    void loadSubmissions(studentId).then((r) => alive && setList(r));
    return () => {
      alive = false;
    };
  }, [studentId]);
  return (
    <Card className="pb-2">
      <CardHeader title="Writings y speakings corregidos" subtitle="Incluye los migrados del IELTS Simulator original" />
      {list === null ? (
        <div className="py-8 text-center">
          <Spinner className="mx-auto h-5 w-5" />
        </div>
      ) : list.length === 0 ? (
        <p className="text-label-2 px-5 py-4 text-[14px]">Sin entregas registradas.</p>
      ) : (
        <ul className="mt-2">
          {list.map((x) => (
            <li key={x.id} className="border-separator border-t first:border-t-0">
              <button
                type="button"
                className="hover:bg-fill-2 flex w-full items-center gap-3 px-5 py-2.5 text-left"
                aria-expanded={open === x.id}
                onClick={() => setOpen(open === x.id ? null : x.id)}
              >
                <span className="w-20 shrink-0 text-[14px] font-semibold capitalize">{x.module}</span>
                <span className="text-label-2 min-w-0 flex-1 truncate text-[13px]">{x.task ? `${x.task} · ` : ''}{x.prompt}</span>
                <span className="text-label-2 shrink-0 text-[12px]">{relativeTime(x.created_at)}</span>
                <span className="w-9 shrink-0 text-right font-bold tabular-nums">{x.band != null ? Number(x.band).toFixed(1) : '–'}</span>
                <ChevronDown size={16} className={open === x.id ? 'rotate-180 transition-transform' : 'transition-transform'} />
              </button>
              {open === x.id && x.content && (
                <p className="bg-fill-2 mx-5 mb-3 max-h-80 overflow-y-auto rounded-[12px] p-3 text-[14px] whitespace-pre-wrap">{x.content}</p>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

const SOURCE_LABEL: Record<string, string> = {
  'ielts-account': 'Cuenta del IELTS Simulator',
  'ielts-session-file': 'Archivo de sesión IELTS',
  'ecyr-progress-file': 'Archivo de progreso ECYR',
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
      <CardHeader title="Progreso importado" subtitle="Migraciones e importaciones de este estudiante" />
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
