import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDown, ArrowUp, BookOpen, Lock, Minus, Plus, RefreshCw, Trash2, Unlock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { loadDiagrams } from '@/content/diagrams';
import type { Unit } from '@/content/types';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';
import { KIND_LABEL } from '@/lib/thread/resources';
import { RESOURCE_KINDS, type ResourceKind, type Stage, type Thread } from '@/lib/thread/types';
import { ResourceCard } from './ResourceCard';
import type { Highlighter } from './highlight';
import { AutoText, GROUP_LABEL, IconBtn, Pill, anchorColor } from './ui';

export interface StageActions {
  patch: (p: Partial<Stage>) => void;
  minutes: (d: number) => void;
  lock: () => void;
  regen: () => void;
  move: (d: -1 | 1) => void;
  removeAnchor: () => void;
  book: (p: { book?: string; page?: string; exercises?: string }) => void;
  addResource: (k: ResourceKind, exerciseType?: 'gapfill' | 'matching' | 'transform' | 'order') => void;
  resource: (resId: string) => {
    onContent: (c: Record<string, unknown>) => void;
    onTitle: (t: string) => void;
    onLock: () => void;
    onRegen: () => void;
    onRemove: () => void;
    onMove: (d: -1 | 1) => void;
  };
}

const KIND_ES: Record<Stage['kind'], string> = { warmup: 'Calentamiento', presentation: 'Presentación', practice: 'Práctica', production: 'Producción', energizer: 'Energizante', closing: 'Cierre', homework: 'Tarea' };
const KIND_COLOR: Record<Stage['kind'], string> = { warmup: 'var(--orange)', presentation: 'var(--blue)', practice: 'var(--teal)', production: 'var(--purple)', energizer: 'var(--orange)', closing: 'var(--pink)', homework: 'var(--green)' };

export function StageCard({ stage, thread, unit, hl, busy, actions, index, canMove }: { stage: Stage; thread: Thread; unit?: Unit; hl: Highlighter; busy: Set<string>; actions: StageActions; index: number; canMove: boolean }) {
  const color = KIND_COLOR[stage.kind];
  const aIdx = thread.anchors.findIndex((a) => a.id === stage.anchorId);
  const [hasDiagram, setHasDiagram] = useState(false);
  const key = stage.grammarRef?.diagramKey;
  useEffect(() => {
    let alive = true;
    if (!key) return;
    void loadDiagrams(thread.level).then((d) => alive && setHasDiagram(!!d[key]));
    return () => {
      alive = false;
    };
  }, [key, thread.level]);
  const gp = stage.kind === 'presentation' && stage.grammarRef ? unit?.grammar[stage.grammarRef.point] : undefined;
  const [menu, setMenu] = useState<ResourceKind | ''>('');
  const anyBusy = stage.resources.some((r) => busy.has(r.id));

  return (
    <Card className="overflow-hidden" style={aIdx >= 0 ? { boxShadow: `inset 4px 0 0 ${anchorColor(aIdx)}` } : undefined}>
      <section aria-label={stage.title} className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[12.5px] font-bold text-white" style={{ background: ink(color, 80) }} aria-hidden>
            {index + 1}
          </span>
          <Pill tone="gray">{KIND_ES[stage.kind]}</Pill>
          <AutoText aria-label="Título de la etapa" value={stage.title} onChange={(e) => actions.patch({ title: e.target.value })} className="text-headline min-w-40 flex-1 font-semibold" />
          <span className="flex items-center gap-0.5" role="group" aria-label="Minutos">
            <IconBtn label="Menos tiempo" onClick={() => actions.minutes(-1)}><Minus size={14} /></IconBtn>
            <span className="min-w-[3.4rem] text-center text-[14px] font-bold tabular-nums">{stage.minutes} min</span>
            <IconBtn label="Más tiempo" onClick={() => actions.minutes(1)}><Plus size={14} /></IconBtn>
          </span>
          <select
            aria-label="Agrupación"
            value={stage.grouping}
            onChange={(e) => actions.patch({ grouping: e.target.value as Stage['grouping'] })}
            className="bg-fill-2 h-8 rounded-full px-2.5 text-[13px] outline-none"
          >
            {Object.entries(GROUP_LABEL).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <IconBtn label={stage.locked ? 'Desbloquear etapa' : 'Bloquear etapa'} active={stage.locked} onClick={actions.lock}>{stage.locked ? <Lock size={15} /> : <Unlock size={15} />}</IconBtn>
          {stage.resources.length > 0 && <IconBtn label="Otra versión de esta etapa" onClick={actions.regen} disabled={stage.locked || anyBusy}><RefreshCw size={15} className={anyBusy ? 'animate-spin' : ''} /></IconBtn>}
          {canMove && (
            <>
              <IconBtn label="Subir bloque" onClick={() => actions.move(-1)}><ArrowUp size={15} /></IconBtn>
              <IconBtn label="Bajar bloque" onClick={() => actions.move(1)}><ArrowDown size={15} /></IconBtn>
            </>
          )}
          {stage.kind === 'presentation' && thread.anchors.length > 1 && <IconBtn label="Quitar esta ancla del plan" onClick={actions.removeAnchor}><Trash2 size={15} /></IconBtn>}
        </div>

        {stage.transition && (
          <div className="mt-2 rounded-[12px] px-3 py-2 text-[13.5px]" style={{ background: tint('var(--yellow, #ffcc00)', 14) }}>
            <div className="text-label-2 mb-0.5 text-[11px] font-semibold tracking-wide uppercase">Transición</div>
            <AutoText aria-label="Transición para el docente" value={stage.transition.teacher_es} onChange={(e) => actions.patch({ transition: { ...stage.transition!, teacher_es: e.target.value } })} />
            <AutoText aria-label="Frase en inglés para el alumno" lang="en" value={stage.transition.student_en} onChange={(e) => actions.patch({ transition: { ...stage.transition!, student_en: e.target.value } })} className="italic" />
          </div>
        )}

        {stage.kind !== 'practice' && (
          <div className="mt-2">
            <div className="text-label-2 text-[11px] font-semibold tracking-wide uppercase">Rol del docente</div>
            <AutoText aria-label="Rol del docente" value={stage.teacherRole} onChange={(e) => actions.patch({ teacherRole: e.target.value })} className="text-[14px]" />
          </div>
        )}

        {gp && (
          <div className="bg-fill-2/60 mt-3 rounded-[14px] p-3 text-[14px]">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="text-label-2 text-[11px] font-semibold tracking-wide uppercase">Form / Use</span>
              {hasDiagram && stage.grammarRef && (
                <Link to={`/learn/${thread.level.toLowerCase()}/${stage.grammarRef.unit}`} target="_blank" className="text-ink-blue text-[12.5px] font-semibold underline">
                  Ver diagrama en la unidad
                </Link>
              )}
            </div>
            {gp.rule && <p lang="en">{gp.rule}</p>}
            {gp.form && gp.form.length > 0 && (
              <ul className="mt-1.5 list-disc space-y-0.5 pl-5" lang="en">
                {gp.form.slice(0, 5).map((f) => (
                  <li key={f}>{f}</li>
                ))}
              </ul>
            )}
            {gp.watch && <p className="text-label-2 mt-1.5 text-[13px]" lang="en">Watch: {gp.watch}</p>}
          </div>
        )}

        {stage.kind === 'practice' && (
          <div className="mt-3 rounded-[16px] p-3 sm:p-4" style={{ background: tint('var(--teal)', 12), boxShadow: `inset 0 0 0 1.5px ${tint('var(--teal)', 40)}` }}>
            <div className="mb-2 flex items-center gap-2 font-semibold"><BookOpen size={18} /> Práctica del libro <span className="text-label-2 text-[12.5px] font-normal">(no se genera nada: tú indicas los ejercicios)</span></div>
            <div className="grid gap-2 sm:grid-cols-3">
              <label className="block text-[12px] font-semibold">
                Libro
                <input value={stage.book?.book ?? ''} onChange={(e) => actions.book({ book: e.target.value })} placeholder="Grammar Starmap" className="bg-card mt-0.5 block h-10 w-full rounded-[10px] px-3 text-[15px] font-normal outline-none focus:ring-2" />
              </label>
              <label className="block text-[12px] font-semibold">
                Página
                <input value={stage.book?.page ?? ''} onChange={(e) => actions.book({ page: e.target.value })} placeholder="34" className="bg-card mt-0.5 block h-10 w-full rounded-[10px] px-3 text-[15px] font-normal outline-none focus:ring-2" />
              </label>
              <label className="block text-[12px] font-semibold">
                Ejercicios
                <input value={stage.book?.exercises ?? ''} onChange={(e) => actions.book({ exercises: e.target.value })} placeholder="1, 2 y 4" className="bg-card mt-0.5 block h-10 w-full rounded-[10px] px-3 text-[15px] font-normal outline-none focus:ring-2" />
              </label>
            </div>
            <div className="mt-2 text-[12px] font-semibold">Nota</div>
            <AutoText aria-label="Nota de la práctica" value={stage.notes ?? ''} placeholder="Ej.: corregir en parejas; los que terminen, ejercicio 5" onChange={(e) => actions.patch({ notes: e.target.value })} className="bg-card/70 text-[14px]" />
          </div>
        )}

        {stage.successCriteria && (
          <div className="mt-3">
            <div className="text-label-2 text-[11px] font-semibold tracking-wide uppercase">Criterios de éxito</div>
            <ul className="mt-0.5 space-y-0.5">
              {stage.successCriteria.map((c, i) => (
                <li key={i} className="flex items-start gap-1.5">
                  <span aria-hidden className="mt-1 text-[13px]">☐</span>
                  <AutoText aria-label={`Criterio ${i + 1}`} value={c} onChange={(e) => actions.patch({ successCriteria: stage.successCriteria!.map((x, j) => (j === i ? e.target.value : x)) })} className="text-[14px]" />
                </li>
              ))}
            </ul>
          </div>
        )}

        {stage.resources.length > 0 && (
          <div className="mt-3 space-y-3">
            {stage.resources.map((r, i) => (
              <ResourceCard key={r.id} r={r} hl={hl} busy={busy.has(r.id)} actions={actions.resource(r.id)} first={i === 0} last={i === stage.resources.length - 1} />
            ))}
          </div>
        )}

        {stage.kind !== 'homework' && stage.kind !== 'energizer' && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <select aria-label="Añadir recurso" value={menu} onChange={(e) => setMenu(e.target.value as ResourceKind)} className="bg-fill-2 h-9 rounded-full px-3 text-[13.5px] outline-none">
              <option value="">Añadir recurso…</option>
              {RESOURCE_KINDS.map((k) => (
                <option key={k} value={k}>{KIND_LABEL[k]}</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!menu}
              onClick={() => {
                if (menu) actions.addResource(menu, menu === 'exercise' ? 'gapfill' : undefined);
                setMenu('');
              }}
              className={cn('text-ink-blue inline-flex h-9 items-center gap-1 rounded-full px-3 text-[13.5px] font-semibold disabled:opacity-40')}
            >
              <Plus size={15} /> Añadir
            </button>
            {stage.kind === 'practice' && <span className="text-label-2 text-[12px]">Los ejercicios solo aparecen si los añades tú.</span>}
          </div>
        )}
      </section>
    </Card>
  );
}
