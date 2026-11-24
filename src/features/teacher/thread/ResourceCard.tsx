import { useState } from 'react';
import { AlertTriangle, ArrowDown, ArrowUp, Eye, EyeOff, Loader2, Lock, Pencil, RefreshCw, Trash2, Unlock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { KIND_LABEL } from '@/lib/thread/resources';
import type { Resource } from '@/lib/thread/types';
import { ContentView } from './ContentView';
import type { Highlighter } from './highlight';
import { AutoText, IconBtn, Pill } from './ui';

export interface ResourceActions {
  onContent: (c: Record<string, unknown>) => void;
  onTitle: (t: string) => void;
  onLock: () => void;
  onRegen: () => void;
  onRemove: () => void;
  onMove: (d: -1 | 1) => void;
}

/** Una pieza independiente del plan: se edita en línea, se regenera, se bloquea, se mueve y se quita. */
export function ResourceCard({ r, hl, busy, actions, first, last }: { r: Resource; hl: Highlighter; busy: boolean; actions: ResourceActions; first: boolean; last: boolean }) {
  const [editing, setEditing] = useState(false);
  const [answers, setAnswers] = useState(true);
  const hasAnswers = ['exercise', 'ccq', 'comprehension'].includes(r.kind);
  const warns = r.validation?.warnings ?? [];
  const errs = r.validation?.errors ?? [];
  const draft = r.source === 'local' && (r.kind === 'story' || r.kind === 'news');
  return (
    <Card className="p-3 sm:p-4" aria-busy={busy}>
      <div className="flex flex-wrap items-center gap-1.5">
        <Pill tone="blue">{KIND_LABEL[r.kind]}</Pill>
        {r.source === 'ia' && <Pill tone="green">IA</Pill>}
        {r.source === 'local' && <Pill>Local</Pill>}
        {r.source === 'user' && <Pill>Tuyo</Pill>}
        {draft && <Pill tone="amber">Borrador</Pill>}
        {r.edited && <Pill tone="gray">Editado</Pill>}
        {r.fallback && <Pill tone="amber" title="La IA no dio un resultado válido: se usó la plantilla local">Respaldo local</Pill>}
        {(warns.length > 0 || errs.length > 0) && (
          <Pill tone={errs.length ? 'red' : 'amber'} title={[...errs, ...warns].join('\n')}>
            <AlertTriangle size={11} /> {errs.length + warns.length}
          </Pill>
        )}
        <span className="ml-auto flex items-center">
          {hasAnswers && <IconBtn label={answers ? 'Ocultar respuestas' : 'Mostrar respuestas'} onClick={() => setAnswers(!answers)}>{answers ? <Eye size={16} /> : <EyeOff size={16} />}</IconBtn>}
          <IconBtn label={editing ? 'Terminar de editar' : 'Editar contenido'} active={editing} onClick={() => setEditing(!editing)}><Pencil size={15} /></IconBtn>
          <IconBtn label={r.locked ? 'Desbloquear tarjeta' : 'Bloquear tarjeta'} active={r.locked} onClick={actions.onLock}>{r.locked ? <Lock size={15} /> : <Unlock size={15} />}</IconBtn>
          <IconBtn label="Otra versión de esta tarjeta" onClick={actions.onRegen} disabled={r.locked || busy}><RefreshCw size={15} className={busy ? 'animate-spin' : ''} /></IconBtn>
          <IconBtn label="Subir tarjeta" onClick={() => actions.onMove(-1)} disabled={first}><ArrowUp size={15} /></IconBtn>
          <IconBtn label="Bajar tarjeta" onClick={() => actions.onMove(1)} disabled={last}><ArrowDown size={15} /></IconBtn>
          <IconBtn label="Quitar tarjeta" onClick={actions.onRemove}><Trash2 size={15} /></IconBtn>
        </span>
      </div>
      <AutoText aria-label="Título de la tarjeta" value={r.title} onChange={(e) => actions.onTitle(e.target.value)} className="text-headline mt-1 font-semibold" />
      <div className="mt-2">
        {busy ? (
          <p role="status" className="text-label-2 flex items-center gap-2 py-4 text-[14px]">
            <Loader2 size={16} className="animate-spin" /> Generando con IA… (mientras tanto ves el borrador local)
          </p>
        ) : null}
        <div className={busy ? 'opacity-50' : ''}>
          <ContentView content={r.content} editing={editing} onChange={actions.onContent} answers={answers} hl={hl} />
        </div>
      </div>
    </Card>
  );
}
