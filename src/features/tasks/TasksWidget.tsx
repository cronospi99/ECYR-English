import { Link } from 'react-router-dom';
import { CheckCheck, ChevronRight, ClipboardList } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { IconTile } from '@/components/ui/IconTile';
import { dueInfo } from '@/lib/assignments';
import { DUE_COLOR, KIND_META } from './meta';
import { useMyTasks } from './useMyTasks';
import { ink } from '@/lib/color';

/**
 * Home widget: the next 3 pending tasks. Renders nothing for visitors,
 * teachers or students without a class; a slim "nothing yet" row when the
 * teacher has not assigned anything, so students know where tasks appear.
 */
export function TasksWidget({ className }: { className?: string }) {
  const t = useMyTasks();
  if (!t.enabled || t.error || (t.loading && !t.pending.length)) return null;
  if (!t.pending.length && !t.finished.length)
    return (
      <Card className={className}>
        <Link to="/tasks" className="flex items-center gap-3 px-5 py-4">
          <IconTile icon={ClipboardList} color="var(--blue)" size={36} />
          <div className="min-w-0 flex-1">
            <h3 className="text-headline">Tareas</h3>
            <p className="text-subhead text-label-2">Tu docente aún no te ha asignado tareas. Aparecerán aquí.</p>
          </div>
          <ChevronRight size={20} className="text-label-3" aria-hidden />
        </Link>
      </Card>
    );
  const top = t.pending.slice(0, 3);
  const overdue = t.pending.filter((v) => v.eff === 'overdue').length;

  return (
    <Card className={className ? `pb-2 ${className}` : 'pb-2'}>
      <Link to="/tasks" className="flex items-center gap-3 px-5 pt-5">
        <IconTile icon={ClipboardList} color="var(--blue)" size={36} />
        <div className="min-w-0 flex-1">
          <h3 className="text-title-3">Tareas</h3>
          <p className="text-subhead text-label-2">
            {t.pending.length
              ? `${t.pending.length} pendiente${t.pending.length === 1 ? '' : 's'}${overdue ? ` · ${overdue} vencida${overdue === 1 ? '' : 's'}` : ''}`
              : 'Todo al día'}
          </p>
        </div>
        <ChevronRight size={20} className="text-label-3" aria-hidden />
      </Link>
      {top.length ? (
        <ul className="mt-2">
          {top.map(({ a }) => {
            const due = dueInfo(a.due_at);
            const k = KIND_META[a.kind];
            return (
              <li key={a.id}>
                <Link to="/tasks" className="hover:bg-fill-2/60 flex items-center gap-3 px-5 py-2 transition-colors">
                  <IconTile icon={k.icon} color={k.color} size={28} soft />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-semibold">{a.title}</span>
                    <span className="block text-[13px] font-medium" style={{ color: ink(DUE_COLOR[due.tone]) }}>
                      {due.label}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-subhead text-label-2 flex items-center gap-2 px-5 py-3">
          <CheckCheck size={18} className="text-ink-green" aria-hidden /> No tienes tareas pendientes.
        </p>
      )}
    </Card>
  );
}
