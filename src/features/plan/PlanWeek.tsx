import { useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, ChevronRight, Clock, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ProgressRing } from '@/components/ui/Progress';
import { usePlan } from '@/store/plan';
import { dayKey } from '@/lib/date';
import { SKILL_INFO, WEEKDAYS, type PlanEvaluation, type PlanTask, type WeekPlan } from '@/lib/planner';
import { cn } from '@/lib/cn';

const dateOf = (k: string) => new Date(k + 'T00:00:00');
const sentence = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** The 7-day strip and the selected day's tasks. Read-only without `ev`. */
export function PlanWeek({ plan, ev }: { plan: WeekPlan; ev?: PlanEvaluation }) {
  const today = dayKey();
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = dateOf(plan.start);
    d.setDate(d.getDate() + i);
    return dayKey(d);
  });
  const firstStudy = days.find((d) => d >= today && plan.tasks.some((t) => t.day === d)) ?? days.find((d) => plan.tasks.some((t) => t.day === d));
  const [sel, setSel] = useState(days.includes(today) && plan.tasks.some((t) => t.day === today) ? today : (firstStudy ?? days[0]!));
  const tasks = plan.tasks.filter((t) => t.day === sel);
  const overdue = ev ? plan.tasks.filter((t) => t.day < today && t.day !== sel && !ev.states[t.id]?.done) : [];

  return (
    <Card className="overflow-hidden">
      <div className="no-scrollbar flex gap-1.5 overflow-x-auto p-3 sm:justify-between sm:p-4" role="tablist" aria-label="Días del plan">
        {days.map((d) => {
          const dt = dateOf(d);
          const list = plan.tasks.filter((t) => t.day === d);
          const done = ev ? list.filter((t) => ev.states[t.id]?.done).length : 0;
          const active = d === sel;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setSel(d)}
              className={cn(
                'flex min-w-[52px] flex-1 flex-col items-center gap-1 rounded-[16px] px-1 py-2 transition-colors',
                active ? 'bg-label text-bg' : 'hover:bg-fill-2',
                !list.length && !active && 'opacity-45',
              )}
            >
              <span className={cn('text-[11px] font-semibold uppercase', !active && (d === today ? 'text-ios-red' : 'text-label-2'))}>
                {WEEKDAYS[dt.getDay()]}
              </span>
              <span className="text-[19px] leading-none font-bold tabular-nums">{dt.getDate()}</span>
              {list.length ? (
                ev ? (
                  <ProgressRing value={done / list.length} size={18} stroke={3} color={active ? 'var(--bg)' : 'var(--green)'} label={`${done}/${list.length}`} />
                ) : (
                  <span className="text-[11px] font-medium opacity-70">{list.length}</span>
                )
              ) : (
                <span className="h-[18px] text-[11px] opacity-60">—</span>
              )}
            </button>
          );
        })}
      </div>
      <div className="border-separator border-t">
        <div className="flex items-baseline justify-between px-5 pt-4 pb-1">
          <h3 className="text-headline">{sentence(dateOf(sel).toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' }))}</h3>
          {tasks.length > 0 && (
            <span className="text-label-2 text-[13px] tabular-nums">{tasks.reduce((n, t) => n + t.minutes, 0)} min</span>
          )}
        </div>
        {tasks.length ? (
          <ul className="pb-2">
            <AnimatePresence initial={false}>
              {tasks.map((t) => (
                <TaskRow key={t.id} t={t} ev={ev} />
              ))}
            </AnimatePresence>
          </ul>
        ) : (
          <p className="text-label-2 px-5 pt-1 pb-5 text-[15px]">Día libre. ¡Descansar también es parte del plan!</p>
        )}
        {overdue.length > 0 && (
          <div className="border-separator border-t pt-3 pb-2">
            <div className="text-ios-orange px-5 pb-1 text-[13px] font-semibold">Pendientes de días anteriores</div>
            <ul>
              {overdue.map((t) => (
                <TaskRow key={t.id} t={t} ev={ev} showDay />
              ))}
            </ul>
          </div>
        )}
      </div>
    </Card>
  );
}

function TaskRow({ t, ev, showDay }: { t: PlanTask; ev?: PlanEvaluation; showDay?: boolean }) {
  const toggle = usePlan((s) => s.toggle);
  const remove = usePlan((s) => s.removeTask);
  const st = ev?.states[t.id];
  const done = Boolean(st?.done);
  const auto = st?.via === 'auto';
  const info = SKILL_INFO[t.skill];
  return (
    <motion.li layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, height: 0 }} className="group flex items-center gap-3 px-5 py-2.5">
      {ev ? (
        <button
          type="button"
          onClick={() => !auto && toggle(t.id)}
          aria-pressed={done}
          aria-label={done ? (auto ? 'Completada automáticamente' : 'Marcar como pendiente') : 'Marcar como hecha'}
          title={auto ? 'Detectada automáticamente' : undefined}
          className={cn(
            'flex h-[26px] w-[26px] shrink-0 items-center justify-center rounded-full border-[1.5px] transition-colors',
            done ? 'border-transparent text-white' : 'border-label-3 hover:border-ios-blue',
            auto && 'cursor-default',
          )}
          style={done ? { background: auto ? 'var(--green)' : 'var(--blue)' } : undefined}
        >
          {done && <Check size={15} strokeWidth={3} />}
        </button>
      ) : (
        <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: info.color }} />
      )}
      <Link to={t.to} className="min-w-0 flex-1">
        <span className={cn('block text-[15px] leading-snug font-medium', done && 'text-label-2 line-through decoration-1')}>{t.title}</span>
        <span className="text-label-2 mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[12px]">
          <span className="font-semibold" style={{ color: info.color }}>
            {info.label}
          </span>
          <span className="inline-flex items-center gap-0.5">
            <Clock size={11} /> {t.minutes} min
          </span>
          {showDay && <span>{dateOf(t.day).toLocaleDateString('es', { weekday: 'short', day: 'numeric' })}</span>}
          {auto && <span className="text-ios-green font-medium">Detectada{typeof st?.score === 'number' ? ` · ${st.score}%` : ''}</span>}
          {t.detail && !done && <span className="hidden truncate sm:inline">{t.detail}</span>}
        </span>
      </Link>
      {ev && !done && (
        <button
          type="button"
          onClick={() => remove(t.id)}
          aria-label={`Quitar «${t.title}» del plan`}
          className="text-label-3 hover:text-label-2 rounded-full p-1 opacity-60 transition-opacity group-hover:opacity-100 focus-visible:opacity-100"
        >
          <X size={16} />
        </button>
      )}
      <Link to={t.to} aria-hidden tabIndex={-1} className="text-label-3">
        <ChevronRight size={18} />
      </Link>
    </motion.li>
  );
}
