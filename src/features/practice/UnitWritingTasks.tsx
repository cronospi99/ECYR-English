import { useEffect, useRef, useState } from 'react';
import { BookOpen, Eye, EyeOff, Languages, PenLine, Ruler } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { Spinner } from '@/components/ui/Misc';
import { WritingPad } from '@/components/learning/WritingPad';
import { useAsync } from '@/hooks/useAsync';
import { loadUnitWriting, type UnitWriting, type UnitWritingTask } from '@/content/writing';
import type { CefrLevel } from '@/content/types';
import { cn } from '@/lib/cn';
import { deep, ink, tint } from '@/lib/color';

const TASK_COLORS = ['var(--purple)', 'var(--blue)', 'var(--teal)', 'var(--orange)', 'var(--pink)'];
export const taskColor = (k: number) => TASK_COLORS[k % TASK_COLORS.length]!;

const countWords = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);
const draftWords = (key: string) => {
  try {
    return countWords(localStorage.getItem(key) ?? '');
  } catch {
    return 0;
  }
};

/** Pills to switch between a unit's writing tasks. */
export function WritingTaskTabs({ tasks, value, onChange }: { tasks: UnitWritingTask[]; value: number; onChange: (k: number) => void }) {
  const box = useRef<HTMLDivElement>(null);
  // On phones the tabs scroll sideways: keep the selected one in view.
  useEffect(() => {
    const el = box.current;
    const on = el?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!el || !on || el.scrollWidth <= el.clientWidth) return;
    const d = on.getBoundingClientRect().left - el.getBoundingClientRect().left;
    if (d < 0 || d + on.offsetWidth > el.clientWidth) el.scrollLeft += d - 4;
  }, [value]);
  return (
    <div ref={box} role="tablist" aria-label="Tareas de writing" className="no-scrollbar -mx-1 flex snap-x gap-2 overflow-x-auto px-1 py-1 sm:grid sm:grid-cols-2 sm:overflow-visible">
      {tasks.map((t, i) => {
        const active = t.k === value;
        const c = taskColor(t.k);
        const started = draftWords(t.storageKey) > 0;
        return (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t.k)}
            className={cn(
              'flex w-[210px] shrink-0 snap-start items-start sm:w-auto gap-2.5 rounded-[14px] p-2.5 text-left transition-colors',
              active ? 'bg-card shadow-card' : 'bg-fill-2 hover:bg-fill',
            )}
            style={active ? { boxShadow: `inset 0 0 0 2px ${c}` } : undefined}
          >
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: deep(c) }}>
              {i + 1}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 text-[11px] font-bold tracking-wide uppercase" style={{ color: ink(c) }}>
                <span className="truncate">{t.book ? 'Tarea principal' : (t.genre ?? 'Writing')}</span>
                {started && <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: c }} aria-label="Borrador guardado" />}
              </span>
              <span className="line-clamp-2 text-[14px] leading-snug font-medium">{t.title}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** The model answer, hidden until the student asks — with a nudge to write first. */
function ModelAnswer({ model, storageKey, color }: { model: string; storageKey: string; color: string }) {
  const [state, setState] = useState<'hidden' | 'confirm' | 'shown'>('hidden');
  const reveal = () => setState(draftWords(storageKey) >= 20 ? 'shown' : 'confirm');

  if (state === 'shown')
    return (
      <div className="mt-5 rounded-[14px] p-4" style={{ background: tint(color, 10) }}>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-[13px] font-bold tracking-wide uppercase" style={{ color: ink(color) }}>
            Respuesta modelo
          </span>
          <Button variant="plain" size="sm" onClick={() => setState('hidden')} className="px-2">
            <EyeOff size={15} /> Ocultar
          </Button>
        </div>
        <p className="text-[15px] leading-relaxed whitespace-pre-line text-pretty">{model}</p>
        <p className="text-label-2 mt-3 text-[13px]">Es un ejemplo, no la única respuesta correcta. Compara la estructura y las expresiones con tu texto.</p>
      </div>
    );

  return (
    <div className="border-separator mt-5 rounded-[14px] border border-dashed p-4">
      {state === 'confirm' ? (
        <>
          <p className="text-[14px] text-pretty">
            Aún no has escrito mucho. Aprendes más si intentas tu propia versión primero y luego la comparas. ¿Quieres ver el modelo de todos modos?
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button variant="gray" size="sm" onClick={() => setState('shown')}>
              <Eye size={15} /> Ver de todos modos
            </Button>
            <Button variant="plain" size="sm" onClick={() => setState('hidden')}>
              Seguir escribiendo
            </Button>
          </div>
        </>
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-label-2 min-w-0 flex-1 text-[14px] text-pretty">Escribe tu versión primero; después compárala con una respuesta modelo.</p>
          <Button variant="tinted" size="sm" onClick={reveal}>
            <Eye size={15} /> Ver modelo
          </Button>
        </div>
      )}
    </div>
  );
}

/** One task: genre, length, brief (EN + ES), the pad and the model answer. */
export function WritingTaskDetail({ unit, task, taskRef }: { unit: UnitWriting; task: UnitWritingTask; taskRef: string }) {
  const c = taskColor(task.k);
  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        <span className="rounded-full px-2.5 py-0.5 text-[12px] font-bold tracking-wide uppercase" style={{ background: tint(c, 14), color: ink(c) }}>
          {task.genre ?? 'Tarea principal'}
        </span>
        {task.book && task.genre && (
          <span className="text-label-2 bg-fill-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
            <BookOpen size={12} /> Principal
          </span>
        )}
        {task.length && (
          <span className="text-label-2 bg-fill-2 inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[12px] font-semibold">
            <Ruler size={12} /> {task.length}
          </span>
        )}
      </div>
      <h3 className="text-title-3 mt-3 flex items-start gap-2">
        <PenLine size={20} className="mt-1 shrink-0" style={{ color: ink(c) }} /> {task.title}
      </h3>
      <p className="mt-2 text-[16px] text-pretty">{task.brief}</p>
      {task.briefEs && (
        <p className="text-label-2 mt-2 flex items-start gap-2 text-[14px] text-pretty">
          <Languages size={15} className="mt-0.5 shrink-0" aria-label="En español" /> {task.briefEs}
        </p>
      )}
      <WritingPad
        key={task.id}
        taskRef={taskRef}
        storageKey={task.storageKey}
        criteria={task.criteria}
        prompt={`${task.title}${task.length ? ` (${task.length})` : ''}: ${task.brief}`}
        level={unit.level}
        title={`Writing ${unit.level} · U${unit.n} · ${task.title}`}
      />
      {task.model && <ModelAnswer key={`${task.id}-model`} model={task.model} storageKey={task.storageKey} color={c} />}
    </div>
  );
}

/** Task tabs + the selected task. `k` can be controlled (e.g. from the URL). */
export function WritingTasksPanel({
  unit,
  taskRef,
  k,
  onK,
}: {
  unit: UnitWriting;
  taskRef: (k: number) => string;
  k?: number;
  onK?: (k: number) => void;
}) {
  const [own, setOwn] = useState(unit.tasks[0]?.k ?? 0);
  const value = k ?? own;
  const task = unit.tasks.find((t) => t.k === value) ?? unit.tasks[0];
  if (!task) return <p className="text-label-2 text-[15px]">Esta unidad todavía no tiene tareas de writing.</p>;
  return (
    <div>
      {unit.tasks.length > 1 && (
        <div className="mb-5">
          <WritingTaskTabs tasks={unit.tasks} value={task.k} onChange={onK ?? setOwn} />
        </div>
      )}
      <WritingTaskDetail unit={unit} task={task} taskRef={taskRef(task.k)} />
    </div>
  );
}

/** Self-contained Writing card for a unit's "Producción" tab: every writing task of the unit. */
export function UnitWritingTasks({ level, unit }: { level: CefrLevel; unit: number }) {
  const { data, loading } = useAsync(() => loadUnitWriting(level, unit), [level, unit]);
  if (!loading && !data?.tasks.length) return null;
  return (
    <Card className="p-6">
      <div className="mb-4 flex items-center gap-3">
        <IconTile icon={PenLine} color="var(--purple)" size={34} />
        <div className="min-w-0">
          <h3 className="text-title-3 leading-tight">Writing</h3>
          {data && <p className="text-label-2 text-[13px]">{data.tasks.length} {data.tasks.length === 1 ? 'tarea' : 'tareas'} · con respuesta modelo</p>}
        </div>
      </div>
      {loading || !data ? (
        <div className="text-label-2 flex justify-center py-10">
          <Spinner className="h-6 w-6" />
        </div>
      ) : <WritingTasksPanel key={`${level}-${unit}`} unit={data} taskRef={(k) => `unit:${level}-${unit}:writing-${k}`} />}
    </Card>
  );
}
