import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Check, ClipboardPlus } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Misc';
import { useAuth } from '@/store/auth';
import { Sheet } from '@/features/portfolio/Sheet';
import { isTasksMissing, listMyStudents, tasksReady, type Assignment, type StudentLite } from '@/lib/assignments';
import { AssignmentSheet, type AssignPreset } from './AssignmentSheet';
import { MissingTasksCard } from './MissingTasks';

export type { AssignPreset } from './AssignmentSheet';

/** A title to start from, when the caller did not give one. */
function suggestTitle(p?: AssignPreset | null) {
  if (!p) return undefined;
  if (p.title) return p.title;
  if (p.source === 'unit' && p.level && p.unit) return `${p.level} · Unidad ${p.unit}`;
  if (p.source === 'practice' && p.practice) return `Práctica de ${p.practice === 'phrasal' ? 'phrasal verbs' : p.practice === 'verbs' ? 'verbos' : p.practice}`;
  if (p.source === 'ielts' && p.ielts) return `IELTS · ${p.ielts}`;
  return undefined;
}

type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'ready'; students: StudentLite[] } | { kind: 'missing' } | { kind: 'error'; message: string };

/**
 * "Asignar tarea" for teachers: opens the assignment sheet prefilled with
 * `preset` (unit / practice / grammar / game / IELTS target, title, students).
 * Renders nothing for students and visitors.
 */
export function AssignButton({
  preset,
  label = 'Asignar tarea',
  variant = 'tinted',
  size = 'sm',
  className,
  onSaved,
}: {
  preset?: AssignPreset | null;
  label?: string;
  variant?: 'tinted' | 'brand' | 'filled' | 'gray';
  size?: 'sm' | 'md';
  className?: string;
  onSaved?: (a: Assignment) => void;
}) {
  const isTeacher = useAuth((s) => s.profile?.role === 'teacher');
  const [state, setState] = useState<State>({ kind: 'idle' });
  const [open, setOpen] = useState(false);
  const [done, setDone] = useState(false);

  if (!isTeacher) return null;

  const start = async () => {
    setDone(false);
    setState({ kind: 'loading' });
    try {
      const [students] = await Promise.all([listMyStudents(), tasksReady()]);
      setState({ kind: 'ready', students });
    } catch (e) {
      setState(isTasksMissing(e) ? { kind: 'missing' } : { kind: 'error', message: e instanceof Error ? e.message : String(e) });
    }
    setOpen(true);
  };

  const close = () => setOpen(false);

  return (
    <>
      <span className="inline-flex flex-wrap items-center gap-2">
        <Button variant={variant} size={size} className={className} onClick={() => void start()} disabled={state.kind === 'loading'}>
          {state.kind === 'loading' ? <Spinner className="h-4 w-4" /> : <ClipboardPlus size={16} aria-hidden />} {label}
        </Button>
        {done && (
          <span role="status" className="text-ink-green inline-flex items-center gap-1 text-[13px] font-semibold">
            <Check size={14} aria-hidden /> Tarea asignada ·{' '}
            <Link to="/teacher?tab=tasks" className="text-ink-blue">
              Ver
            </Link>
          </span>
        )}
      </span>

      {state.kind === 'ready' && (
        <AssignmentSheet
          open={open}
          onClose={close}
          students={state.students}
          preset={preset ? { ...preset, title: suggestTitle(preset) } : null}
          onSaved={(a) => {
            setDone(true);
            onSaved?.(a);
          }}
        />
      )}
      {(state.kind === 'missing' || state.kind === 'error') && (
        <Sheet open={open} onClose={close} title="Asignar tarea">
          <div className="p-4 sm:p-5">
            {state.kind === 'missing' ? (
              <MissingTasksCard bare onRetry={() => void start()} />
            ) : (
              <div className="text-center">
                <p className="text-ink-red text-subhead" role="alert">
                  {state.message}
                </p>
                <Button className="mt-3" size="sm" variant="tinted" onClick={() => void start()}>
                  Reintentar
                </Button>
              </div>
            )}
          </div>
        </Sheet>
      )}
    </>
  );
}
