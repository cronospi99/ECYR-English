import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CalendarRange, Lightbulb, Plus, Sparkles, Star, TrendingUp, Trophy } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/Progress';
import { ProgressBar } from '@/components/ui/Progress';
import { usePlan } from '@/store/plan';
import {
  ALL_SKILLS,
  GOAL_INFO,
  SKILL_INFO,
  adaptPrefs,
  defaultPrefs,
  summarize,
  type PlanEvaluation,
  type PlanPrefs,
  type PlanSummary,
  type Recommendation,
  type SkillInsight,
  type WeekPlan,
} from '@/lib/planner';
import { cn } from '@/lib/cn';
import { PlanWizard } from './PlanWizard';
import { PlanWeek } from './PlanWeek';
import { usePlanState } from './usePlanState';
import { ink } from '@/lib/color';

const STATUS: Record<PlanEvaluation['status'], { label: string; color: string }> = {
  upcoming: { label: 'Por empezar', color: 'var(--label-2)' },
  'on-track': { label: 'Al día', color: 'var(--green)' },
  behind: { label: 'Vas atrás', color: 'var(--orange)' },
  complete: { label: '¡Completado!', color: 'var(--blue)' },
  finished: { label: 'Semana terminada', color: 'var(--purple)' },
};

const fmt = (k: string) => new Date(k + 'T00:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });

export default function PlanPage() {
  const { plan, ev, profile, recs, history, level } = usePlanState();
  const lastPrefs = usePlan((s) => s.lastPrefs);
  const archive = usePlan((s) => s.archive);
  const [wizard, setWizard] = useState<PlanPrefs | null>(null);

  const startNew = (adapted: boolean) => {
    if (plan && ev && adapted) setWizard(adaptPrefs(plan, ev, profile, level));
    else setWizard({ ...(lastPrefs ?? defaultPrefs(level)), level, reviewUnits: [] });
  };

  const showWizard = wizard ?? (!plan ? { ...(lastPrefs ?? defaultPrefs(level)), level } : null);

  return (
    <Page
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <CalendarRange size={15} className="text-ink-blue" /> Plan de estudio semanal
        </span>
      }
      title={showWizard ? (plan ? 'Nuevo plan' : 'Crea tu plan') : 'Tu semana'}
      subtitle={
        showWizard
          ? 'Dinos qué quieres crear o repasar y armamos tu semana con tareas reales de la plataforma. Medimos tu avance solo.'
          : undefined
      }
      actions={
        plan && !showWizard ? (
          <Button variant="gray" size="sm" onClick={() => startNew(false)}>
            <Plus size={16} /> Nuevo plan
          </Button>
        ) : undefined
      }
      wide
    >
      {showWizard ? (
        <PlanWizard
          key={JSON.stringify(showWizard)}
          initial={showWizard}
          archive={plan && ev ? summarize(plan, ev) : undefined}
          onDone={() => setWizard(null)}
          onCancel={plan ? () => setWizard(null) : undefined}
        />
      ) : (
        plan &&
        ev && (
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
            <div className="min-w-0 space-y-5">
              <Overview plan={plan} ev={ev} onNext={() => startNew(true)} onClose={() => archive(summarize(plan, ev))} />
              <PlanWeek plan={plan} ev={ev} />
              <SkillBreakdown ev={ev} />
            </div>
            <div className="min-w-0 space-y-5">
              <Recommendations recs={recs} />
              <Strengths profile={profile} />
              <History history={history} />
            </div>
          </div>
        )
      )}
    </Page>
  );
}

function Overview({ plan, ev, onNext, onClose }: { plan: WeekPlan; ev: PlanEvaluation; onNext: () => void; onClose: () => void }) {
  const st = STATUS[ev.status];
  const over = ev.status === 'finished' || ev.status === 'complete';
  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
        <ProgressRing value={ev.ratio} size={112} stroke={11} color="url(#plan-grad)" label={`${Math.round(ev.ratio * 100)}% completado`}>
          <div className="text-center">
            <div className="text-[28px] leading-none font-extrabold tabular-nums">{Math.round(ev.ratio * 100)}%</div>
            <div className="text-label-2 mt-0.5 text-[11px]">completado</div>
          </div>
        </ProgressRing>
        <svg width="0" height="0" className="absolute" aria-hidden>
          <defs>
            <linearGradient id="plan-grad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#0E70FF" />
              <stop offset="1" stopColor="#A962FD" />
            </linearGradient>
          </defs>
        </svg>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className="inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-bold"
              style={{ color: ink(st.color), background: `color-mix(in srgb, ${st.color} 14%, transparent)` }}
            >
              {st.label}
            </span>
            <span className="text-label-2 text-[13px]">
              {fmt(plan.start)} – {fmt(plan.end)} · {GOAL_INFO[plan.prefs.goal].label}
            </span>
          </div>
          <h2 className="text-title-2 mt-1.5">{plan.title}</h2>
          {plan.prefs.note && <p className="text-label-2 text-subhead mt-0.5">Propósito: {plan.prefs.note}</p>}
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Stat label="Tareas" value={`${ev.done}/${ev.total}`} />
            <Stat label="Minutos" value={`${ev.minutesDone}/${ev.minutesPlanned}`} />
            <Stat label="Días activos" value={String(ev.activeDays)} />
            <Stat label="Acierto medio" value={ev.avgScore != null ? `${ev.avgScore}%` : '–'} />
          </dl>
        </div>
      </div>
      {over && (
        <div className="bg-fill-2 mt-5 flex flex-col gap-3 rounded-[16px] p-4 sm:flex-row sm:items-center">
          <Trophy className="text-ios-yellow shrink-0" size={26} />
          <p className="flex-1 text-[15px]">
            {ev.status === 'complete'
              ? '¡Cumpliste todo el plan! Genera la próxima semana: el motor ajusta minutos y destrezas a tus resultados.'
              : `La semana terminó con ${Math.round(ev.ratio * 100)}% completado. Arma la siguiente, adaptada a cómo te fue.`}
          </p>
          <div className="flex gap-2">
            <Button variant="brand" size="sm" onClick={onNext}>
              <Sparkles size={15} /> Próxima semana
            </Button>
            {ev.status === 'finished' && (
              <Button variant="gray" size="sm" onClick={onClose}>
                Archivar
              </Button>
            )}
          </div>
        </div>
      )}
    </Card>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-fill-2 rounded-[14px] px-3 py-2.5">
      <dt className="text-label-2 text-[12px]">{label}</dt>
      <dd className="text-[19px] font-bold tabular-nums">{value}</dd>
    </div>
  );
}

function SkillBreakdown({ ev }: { ev: PlanEvaluation }) {
  const rows = ALL_SKILLS.filter((s) => ev.bySkill[s].planned > 0);
  return (
    <Card className="pb-5">
      <CardHeader title="Avance por destreza" subtitle="Tareas hechas y acierto de esta semana" />
      <ul className="mt-4 space-y-3.5 px-5">
        {rows.map((s) => {
          const st = ev.bySkill[s];
          const avg = st.scores.length ? Math.round(st.scores.reduce((x, y) => x + y, 0) / st.scores.length) : null;
          return (
            <li key={s}>
              <div className="mb-1.5 flex items-baseline justify-between gap-2 text-[14px]">
                <span className="font-semibold">{SKILL_INFO[s].label}</span>
                <span className="text-label-2 tabular-nums">
                  {st.done}/{st.planned} tareas{avg != null ? ` · ${avg}%` : ''}
                </span>
              </div>
              <ProgressBar value={st.done / st.planned} color={SKILL_INFO[s].color} height={8} />
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

const TONE: Record<Recommendation['tone'], { icon: typeof Star; color: string; label: string }> = {
  strength: { icon: Star, color: 'var(--green)', label: 'Fortaleza' },
  improve: { icon: TrendingUp, color: 'var(--orange)', label: 'A mejorar' },
  tip: { icon: Lightbulb, color: 'var(--blue)', label: 'Sugerencia' },
};

function Recommendations({ recs }: { recs: Recommendation[] }) {
  return (
    <Card className="pb-3">
      <CardHeader title="Recomendaciones" subtitle="Según tu plan y tus resultados" />
      {recs.length === 0 ? (
        <p className="text-label-2 px-5 pt-3 pb-2 text-[15px]">Completa algunas tareas y aquí verás tus puntos fuertes y qué reforzar.</p>
      ) : (
        <ul className="mt-2">
          {recs.map((r) => {
            const t = TONE[r.tone];
            const Icon = t.icon;
            return (
              <li key={r.title} className="flex gap-3 px-5 py-3">
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
                  style={{ color: ink(t.color), background: `color-mix(in srgb, ${t.color} 15%, transparent)` }}
                  aria-label={t.label}
                >
                  <Icon size={16} />
                </span>
                <div className="min-w-0">
                  <div className="text-[15px] font-semibold">{r.title}</div>
                  <p className="text-label-2 text-[13px] leading-snug">{r.text}</p>
                  {r.to && (
                    <Link to={r.to} className="text-ink-blue mt-1 inline-flex items-center gap-1 text-[13px] font-semibold">
                      {r.cta ?? 'Ir'} <ArrowRight size={13} />
                    </Link>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function Strengths({ profile }: { profile: SkillInsight[] }) {
  const sorted = [...profile].sort((a, b) => (b.strength ?? -1) - (a.strength ?? -1));
  return (
    <Card className="pb-5">
      <CardHeader title="Tu perfil de destrezas" subtitle="Últimos 30 días · acierto y práctica" />
      <ul className="mt-4 space-y-3 px-5">
        {sorted.map((p) => (
          <li key={p.skill} className="grid grid-cols-[92px_minmax(0,1fr)_40px] items-center gap-3 text-[13px]">
            <span className="font-medium">{SKILL_INFO[p.skill].label}</span>
            <ProgressBar value={(p.strength ?? 0) / 100} color={SKILL_INFO[p.skill].color} height={6} />
            <span className={cn('text-right font-semibold tabular-nums', p.strength == null && 'text-label-3')}>{p.strength ?? '–'}</span>
          </li>
        ))}
      </ul>
      <p className="text-label-3 mt-3 px-5 text-[12px]">“–” = aún no hay suficientes datos.</p>
    </Card>
  );
}

function History({ history }: { history: PlanSummary[] }) {
  if (!history.length) return null;
  const weeks = history.slice(0, 8).reverse();
  return (
    <Card className="pb-4">
      <CardHeader title="Semanas anteriores" subtitle="% del plan completado" />
      <div className="mt-4 flex h-28 items-end gap-2 px-5" role="img" aria-label="Historial de cumplimiento semanal">
        {weeks.map((h) => {
          const r = h.total ? h.done / h.total : 0;
          return (
            <div key={h.id} className="flex flex-1 flex-col items-center gap-1">
              <span className="text-label-2 text-[10px] tabular-nums">{Math.round(r * 100)}</span>
              <div className="bg-fill-2 relative w-full max-w-[28px] flex-1 overflow-hidden rounded-[6px]" style={{ height: 80 }}>
                <div className="brand-gradient absolute inset-x-0 bottom-0 rounded-[6px]" style={{ height: `${Math.max(4, r * 100)}%` }} />
              </div>
              <span className="text-label-3 text-[10px]">{fmt(h.start)}</span>
            </div>
          );
        })}
      </div>
      <ul className="mt-3">
        {history.slice(0, 4).map((h) => (
          <li key={h.id} className="flex items-center justify-between gap-3 px-5 py-1.5 text-[13px]">
            <span className="truncate">{h.title}</span>
            <span className="text-label-2 shrink-0 tabular-nums">
              {h.done}/{h.total} · {h.minutesDone} min
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
