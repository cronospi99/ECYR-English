import { Link } from 'react-router-dom';
import { CalendarRange, Check, ChevronRight, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/Progress';
import { usePlan } from '@/store/plan';
import { dayKey } from '@/lib/date';
import { SKILL_INFO } from '@/lib/planner';
import { cn } from '@/lib/cn';
import { usePlanState } from './usePlanState';
import { ink } from '@/lib/color';

/** Home widget: today's tasks from the weekly plan, or an invitation to create one. */
export function WeekPlanCard() {
  const { plan, ev } = usePlanState();
  const toggle = usePlan((s) => s.toggle);
  const today = dayKey();

  if (!plan || !ev)
    return (
      <Card className="relative overflow-hidden p-5">
        <div className="flex items-center gap-2">
          <CalendarRange size={20} className="text-ink-blue" />
          <h3 className="text-title-3">Tu plan semanal</h3>
        </div>
        <p className="text-label-2 text-subhead mt-1 max-w-[34ch]">
          Elige qué quieres avanzar o repasar, cuántos días y minutos. Armamos tu semana y medimos tu avance.
        </p>
        <ol className="mt-4 space-y-2.5">
          {[
            ['Elige tu objetivo', 'Avanzar, repasar, IELTS o equilibrado'],
            ['Ajusta tu semana', 'Destrezas, días y minutos por día'],
            ['Estudia y mide', 'Las tareas se marcan solas y recibes recomendaciones'],
          ].map(([t, d], i) => (
            <li key={t} className="flex items-start gap-3">
              <span className="bg-fill-2 text-ink-blue flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold">{i + 1}</span>
              <span className="min-w-0">
                <span className="block text-[15px] font-semibold">{t}</span>
                <span className="text-label-2 block text-[13px]">{d}</span>
              </span>
            </li>
          ))}
        </ol>
        <ButtonLink to="/plan" variant="brand" className="mt-5">
          <Wand2 size={17} /> Crear mi plan
        </ButtonLink>
      </Card>
    );

  const todays = plan.tasks.filter((t) => t.day === today);
  const pending = plan.tasks.filter((t) => t.day < today && !ev.states[t.id]?.done);
  const list = [...todays, ...pending].slice(0, 4);
  const doneToday = todays.filter((t) => ev.states[t.id]?.done).length;
  const ended = ev.status === 'finished' || ev.status === 'complete';

  return (
    <Card className="pb-2">
      <Link to="/plan" className="flex items-center gap-4 px-5 pt-5">
        <ProgressRing value={ev.ratio} size={52} stroke={6} color="var(--blue)" label={`${Math.round(ev.ratio * 100)}% del plan`}>
          <span className="text-[13px] font-bold tabular-nums">{Math.round(ev.ratio * 100)}%</span>
        </ProgressRing>
        <div className="min-w-0 flex-1">
          <h3 className="text-title-3 truncate">{plan.title}</h3>
          <p className="text-label-2 text-subhead">
            {ended
              ? 'Semana terminada · arma la siguiente'
              : todays.length
                ? `Hoy: ${doneToday} de ${todays.length} tareas`
                : 'Hoy es día libre'}
          </p>
        </div>
        <ChevronRight size={20} className="text-label-3" />
      </Link>
      {list.length > 0 && !ended && (
        <ul className="mt-2">
          {list.map((t) => {
            const st = ev.states[t.id];
            const done = Boolean(st?.done);
            return (
              <li key={t.id} className="flex items-center gap-3 px-5 py-2">
                <button
                  type="button"
                  onClick={() => st?.via !== 'auto' && toggle(t.id)}
                  aria-pressed={done}
                  aria-label={done ? 'Hecha' : 'Marcar como hecha'}
                  className={cn(
                    'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px]',
                    done ? 'border-transparent text-white' : 'border-label-3',
                  )}
                  style={done ? { background: st?.via === 'auto' ? 'var(--green)' : 'var(--blue)' } : undefined}
                >
                  {done && <Check size={13} strokeWidth={3} />}
                </button>
                <Link to={t.to} className="min-w-0 flex-1">
                  <span className={cn('block truncate text-[15px]', done && 'text-label-2 line-through')}>{t.title}</span>
                  <span className="text-[12px] font-medium" style={{ color: ink(SKILL_INFO[t.skill].color) }}>
                    {SKILL_INFO[t.skill].label} · {t.minutes} min{t.day < today ? ' · pendiente' : ''}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
