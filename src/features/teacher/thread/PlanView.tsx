import { useMemo, useRef, useState } from 'react';
import { Check, Clipboard, Copy, Download, Monitor, Printer, RefreshCw, Save, Trash2, Upload, Wand2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { Unit } from '@/content/types';
import { cn } from '@/lib/cn';
import { ink } from '@/lib/color';
import { anchorLabel } from '@/lib/thread/bridges';
import { addMinutes, addResource, duplicateThread, moveBlock, moveResource, planToText, planWarnings, regenerateLocal, removeAnchor, removeResource, setBook, setContent, swapBridge, totalMinutes, updateResource, updateStage, allowedWords } from '@/lib/thread/plan';
import { deleteThread, exportFilename, exportThread, importThread, listThreads, saveThread } from '@/lib/thread/storage';
import type { PlanContext, Stage, Thread } from '@/lib/thread/types';
import { validateResource } from '@/lib/thread/validate';
import { ContentView } from './ContentView';
import { makeHighlighter } from './highlight';
import { StageCard, type StageActions } from './StageCard';
import { AutoText, GROUP_LABEL, anchorColor } from './ui';
import { KIND_LABEL } from '@/lib/thread/resources';

export interface PlanViewProps {
  thread: Thread;
  units: Unit[];
  ctx: PlanContext;
  known: Set<string>;
  update: (f: (t: Thread) => Thread) => void;
  busy: Set<string>;
  useAi: boolean;
  onAi: (only?: { stageId?: string; resId?: string }) => void;
  onPresent: () => void;
  onChallenge: () => void;
  onOpen: (t: Thread) => void;
  onNotice: (m: string) => void;
  color: string;
}

export function PlanView({ thread: t, units, ctx, known, update, busy, useAi, onAi, onPresent, onChallenge, onOpen, onNotice, color }: PlanViewProps) {
  const order = useMemo(() => t.anchors.map((a) => a.id), [t.anchors]);
  const hl = useMemo(() => makeHighlighter(ctx.targets, order), [ctx.targets, order]);
  const [saved, setSaved] = useState<Thread[]>(() => listThreads());
  const [openId, setOpenId] = useState('');
  const [copied, setCopied] = useState(false);
  const [printMode, setPrintMode] = useState<'teacher' | 'student'>('teacher');
  const fileRef = useRef<HTMLInputElement>(null);
  const warnings = planWarnings(t);
  const total = totalMinutes(t);
  const over = total > t.duration + 2;
  const allowed = useMemo(() => allowedWords(ctx), [ctx]);

  const revalidate = (th: Thread, sid: string, rid: string): Thread =>
    updateResource(th, sid, rid, (r) => ({ ...r, validation: validateResource(r, { level: th.level, targets: ctx.targets, known, allowed }) }));
  const freshCtx = (th: Thread) => ({ ...ctx, bridge: th.bridge });

  const actionsFor = (s: Stage): StageActions => ({
    patch: (p) => update((th) => updateStage(th, s.id, p)),
    minutes: (d) => update((th) => addMinutes(th, s.id, d)),
    lock: () => update((th) => updateStage(th, s.id, { locked: !s.locked })),
    regen: () => (useAi ? onAi({ stageId: s.id }) : update((th) => regenerateLocal(th, units, s.id))),
    move: (d) => update((th) => moveBlock(th, s.id, d, units)),
    removeAnchor: () => s.anchorId && update((th) => removeAnchor(th, s.anchorId!, units)),
    book: (p) => update((th) => setBook(th, s.id, p)),
    addResource: (k, et) =>
      update((th) => {
        const next = addResource(th, s.id, k, freshCtx(th), { exerciseType: et });
        const st = next.stages.find((x) => x.id === s.id)!;
        return revalidate(next, s.id, st.resources[st.resources.length - 1]!.id);
      }),
    resource: (rid) => ({
      onContent: (c) => update((th) => revalidate(setContent(th, s.id, rid, c), s.id, rid)),
      onTitle: (title) => update((th) => updateResource(th, s.id, rid, (r) => ({ ...r, title, edited: true }))),
      onLock: () => update((th) => updateResource(th, s.id, rid, (r) => ({ ...r, locked: !r.locked }))),
      onRegen: () => (useAi ? onAi({ stageId: s.id, resId: rid }) : update((th) => regenerateLocal(th, units, s.id, rid))),
      onRemove: () => update((th) => removeResource(th, s.id, rid)),
      onMove: (d) => update((th) => moveResource(th, s.id, rid, d)),
    }),
  });

  const refreshSaved = () => setSaved(listThreads());
  const doSave = () => {
    const name = t.name.trim() || window.prompt('Nombre del hilo', t.bridge.title)?.trim();
    if (!name) return;
    const s = saveThread({ ...t, name }, name);
    update((th) => ({ ...th, name: s.name, id: s.id }));
    refreshSaved();
    onNotice(`Guardado como «${s.name}».`);
  };
  const doDownload = () => {
    const blob = new Blob([exportThread(t)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = exportFilename(t);
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const doImport = async (f?: File) => {
    if (!f) return;
    try {
      onOpen(importThread(await f.text()));
      onNotice('Hilo importado: guárdalo con nombre para conservarlo.');
    } catch (e) {
      onNotice((e as Error).message);
    }
    if (fileRef.current) fileRef.current.value = '';
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(planToText(t));
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      onNotice('El navegador bloqueó el portapapeles.');
    }
  };
  const regenAll = () => {
    if (useAi) onAi();
    else update((th) => th.stages.reduce((acc, s) => regenerateLocal(acc, units, s.id), th));
  };

  return (
    <div className="space-y-4">
      {/* Cabecera: contexto puente */}
      <div className="relative overflow-hidden rounded-[22px] p-4 text-white sm:p-5" style={{ background: `linear-gradient(135deg, ${ink(color)}, color-mix(in srgb, ${ink(color)} 55%, #000))` }}>
        <div className="text-[12px] font-semibold tracking-wide uppercase opacity-80">
          {t.level} · {t.duration} min · contexto puente {t.bridge.source === 'ia' && '· IA'}
        </div>
        <AutoText aria-label="Título del contexto" value={t.bridge.title} onChange={(e) => update((th) => ({ ...th, bridge: { ...th.bridge, title: e.target.value, source: 'user' } }))} className="text-[24px] leading-tight font-bold !text-white hover:!bg-white/10 focus:!bg-white/15" />
        <AutoText aria-label="Escenario" lang="en" value={t.bridge.setting} onChange={(e) => update((th) => ({ ...th, bridge: { ...th.bridge, setting: e.target.value, source: 'user' } }))} className="text-[15px] !text-white/90 hover:!bg-white/10 focus:!bg-white/15" />
        <AutoText aria-label="Conflicto" lang="en" value={t.bridge.conflict} onChange={(e) => update((th) => ({ ...th, bridge: { ...th.bridge, conflict: e.target.value, source: 'user' } }))} className="text-[14px] !text-white/85 italic hover:!bg-white/10 focus:!bg-white/15" />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {t.bridge.characters.map((c) => (
            <span key={c.name + c.role} className="rounded-full bg-white/15 px-2.5 py-0.5 text-[12.5px]">{c.name}, {c.role}</span>
          ))}
        </div>
        <div className="mt-3 rounded-[14px] bg-white/15 px-3 py-2 text-[14px]">
          <b>Gancho (30 s):</b>{' '}
          <AutoText aria-label="Gancho" value={t.hook} onChange={(e) => update((th) => ({ ...th, hook: e.target.value }))} className="inline-block !text-white hover:!bg-white/10 focus:!bg-white/15" />
        </div>
        <details className="mt-2 text-[13.5px]">
          <summary className="cursor-pointer font-semibold">Por qué encaja cada ancla</summary>
          <ul className="mt-1 space-y-0.5">
            {t.anchors.map((a) => (
              <li key={a.id}>• {t.bridge.rationale[a.id] || `${anchorLabel(a)} encaja en ${t.bridge.title}.`}</li>
            ))}
          </ul>
        </details>
        {t.alternatives.length > 0 && (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
            <span className="opacity-80">Otros contextos:</span>
            {t.alternatives.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  update((th) => swapBridge(th, b, units));
                  onNotice(`Contexto cambiado a «${b.title}». Se conservaron las tarjetas bloqueadas o editadas.`);
                }}
                className="rounded-full bg-white/20 px-3 py-1 font-semibold hover:bg-white/30"
              >
                Usar «{b.title}»
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Barra de acciones */}
      <Card className="no-print p-3">
        <div className="flex flex-wrap items-center gap-2">
          <input
            value={t.name}
            onChange={(e) => update((th) => ({ ...th, name: e.target.value }))}
            aria-label="Nombre del hilo"
            placeholder="Nombre del hilo"
            className="bg-fill-2 h-10 min-w-0 flex-1 basis-44 rounded-[12px] px-3 text-[15px] outline-none focus:ring-2"
          />
          <Button size="sm" onClick={doSave}><Save size={15} /> Guardar</Button>
          <select aria-label="Abrir hilo guardado" value={openId} onChange={(e) => { const x = saved.find((s) => s.id === e.target.value); setOpenId(''); if (x) onOpen(x); }} className="bg-fill-2 h-8 max-w-44 rounded-full px-2.5 text-[13px] outline-none">
            <option value="">Abrir… ({saved.length})</option>
            {saved.map((s) => (
              <option key={s.id} value={s.id}>{s.name} · {s.level}</option>
            ))}
          </select>
          <Button size="sm" variant="gray" onClick={() => { const d = duplicateThread(t); onOpen(d); onNotice('Duplicado: es una copia nueva sin guardar.'); }}><Copy size={15} /> Duplicar</Button>
          <Button size="sm" variant="destructive" disabled={!saved.some((s) => s.id === t.id)} onClick={() => { if (window.confirm('¿Eliminar este hilo guardado?')) { deleteThread(t.id); refreshSaved(); onNotice('Hilo eliminado de los guardados.'); } }}><Trash2 size={15} /> Eliminar</Button>
          <Button size="sm" variant="gray" onClick={doDownload}><Download size={15} /> Exportar</Button>
          <Button size="sm" variant="gray" onClick={() => fileRef.current?.click()}><Upload size={15} /> Importar</Button>
          <input ref={fileRef} type="file" accept="application/json,.json" className="hidden" aria-label="Importar hilo JSON" onChange={(e) => void doImport(e.target.files?.[0])} />
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <Button size="sm" onClick={onPresent}><Monitor size={15} /> Presentar</Button>
          <Button size="sm" variant="tinted" onClick={() => void copy()}>{copied ? <Check size={15} /> : <Clipboard size={15} />} Copiar plan</Button>
          <select aria-label="Versión para imprimir" value={printMode} onChange={(e) => setPrintMode(e.target.value as 'teacher' | 'student')} className="bg-fill-2 h-8 rounded-full px-2.5 text-[13px] outline-none">
            <option value="teacher">Versión docente</option>
            <option value="student">Versión alumno</option>
          </select>
          <Button size="sm" variant="tinted" onClick={() => { const prev = document.title; document.title = t.name || 'Hilo de la clase'; window.print(); document.title = prev; }}><Printer size={15} /> Imprimir</Button>
          <Button size="sm" variant="gray" onClick={regenAll}><RefreshCw size={15} /> Regenerar plan</Button>
          <span className="text-label-2 text-[12px]">No toca tarjetas ni etapas bloqueadas.</span>
        </div>
        <div className="mt-3">
          <div className="flex items-center justify-between text-[12.5px] font-semibold">
            <span>Tiempo del plan</span>
            <span className={cn(over && 'text-ink-red')}>{total} / {t.duration} min</span>
          </div>
          <div className="bg-fill-2 mt-1 h-2 overflow-hidden rounded-full" role="progressbar" aria-valuemin={0} aria-valuemax={t.duration} aria-valuenow={total} aria-label="Minutos del plan">
            <div className="h-full rounded-full" style={{ width: `${Math.min(100, (total / t.duration) * 100)}%`, background: over ? 'var(--red)' : ink(color, 80) }} />
          </div>
        </div>
        <div aria-live="polite">
          {warnings.map((w) => (
            <p key={w} className="mt-1.5 flex items-start gap-1.5 text-[13px]" style={{ color: 'color-mix(in srgb, var(--orange) 60%, var(--label))' }}>
              <Wand2 size={14} className="mt-0.5 shrink-0" /> {w}
            </p>
          ))}
        </div>
        <AddAnchorHint t={t} />
      </Card>

      {/* Etapas */}
      <ol className="no-print space-y-3">
        {t.stages
          .filter((s) => s.kind !== 'homework')
          .map((s, i) => (
            <li key={s.id}>
              <StageCard stage={s} thread={t} unit={units.find((u) => u.n === s.grammarRef?.unit)} hl={hl} busy={busy} actions={actionsFor(s)} index={i} canMove={s.kind === 'presentation' || s.kind === 'energizer'} />
            </li>
          ))}
        <li>
          <Card className="p-4">
            <h3 className="text-headline">Tarea</h3>
            <AutoText aria-label="Título de la tarea" value={t.homework.title} onChange={(e) => update((th) => ({ ...th, homework: { ...th.homework, title: e.target.value } }))} className="font-semibold" />
            <AutoText aria-label="Tarea" lang="en" value={t.homework.task} onChange={(e) => update((th) => ({ ...th, homework: { ...th.homework, task: e.target.value } }))} className="text-[14.5px]" />
          </Card>
        </li>
        <li>
          <button type="button" onClick={onChallenge} className="group flex w-full items-center gap-4 rounded-[18px] p-4 text-left text-white transition-transform active:scale-[0.99]" style={{ background: 'linear-gradient(120deg, #5e2bff, #ff2d8a)' }}>
            <span className="text-[40px] leading-none" aria-hidden>🏆</span>
            <span className="min-w-0">
              <span className="block text-[18px] font-bold">Reto por equipos</span>
              <span className="block text-[14px] opacity-85">Mímica, tabú, dibujo, duelos… con el vocabulario de hoy. Proyéctalo.</span>
            </span>
          </button>
        </li>
      </ol>
      <PrintView t={t} ctx={ctx} mode={printMode} />
      <style>{PRINT_CSS}</style>
    </div>
  );
}

const PRINT_CSS = `
#thread-print{display:none}
@media print{
  body *{visibility:hidden}
  #thread-print,#thread-print *{visibility:visible}
  #thread-print{display:block!important;position:absolute;left:0;top:0;width:100%;color:#000;background:#fff;font-size:12pt}
  .no-print{display:none!important}
  #thread-print .pr-stage{break-inside:avoid;margin:0 0 14pt;padding:0 0 8pt;border-bottom:1px solid #999}
  #thread-print .pr-answers{break-before:page}
  #thread-print mark{background:#eee;box-shadow:none;text-decoration:underline}
}`;

function AddAnchorHint({ t }: { t: Thread }) {
  return (
    <p className="text-label-2 mt-2 text-[12px]">
      {t.anchors.length} {t.anchors.length === 1 ? 'ancla' : 'anclas'}: {t.anchors.map((a, i) => (
        <span key={a.id} className="mr-1.5 inline-flex items-center gap-1"><span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: anchorColor(i) }} />{anchorLabel(a)}</span>
      ))}
      · Para añadir otra, usa el panel de arriba y «Añadir al plan».
    </p>
  );
}

/** Vista de impresión: una etapa por bloque; respuestas al final en hoja separada. */
function PrintView({ t, ctx, mode }: { t: Thread; ctx: PlanContext; mode: 'teacher' | 'student' }) {
  const order = t.anchors.map((a) => a.id);
  const hl = makeHighlighter(ctx.targets, order);
  const teacher = mode === 'teacher';
  const withAnswers = t.stages.flatMap((s) => s.resources.filter((r) => ['exercise', 'ccq', 'comprehension'].includes(r.kind)).map((r) => ({ s, r })));
  return (
    <div id="thread-print" aria-hidden>
      <h1 style={{ fontSize: '18pt', fontWeight: 700 }}>{t.name || t.bridge.title} · {t.level} · {t.duration} min {teacher ? '(docente)' : '(alumno)'}</h1>
      <p><b>{t.bridge.title}</b>: {t.bridge.setting}. {t.bridge.conflict}</p>
      {t.stages.map((s) => (
        <div key={s.id} className="pr-stage">
          <h2 style={{ fontSize: '14pt', fontWeight: 700 }}>{s.title} · {s.minutes} min · {GROUP_LABEL[s.grouping]}</h2>
          {teacher && s.transition && <p><i>{s.transition.teacher_es}</i> “{s.transition.student_en}”</p>}
          {!teacher && s.transition && <p>“{s.transition.student_en}”</p>}
          {teacher && s.kind !== 'practice' && s.teacherRole && <p>{s.teacherRole}</p>}
          {s.kind === 'practice' && <p><b>Libro:</b> {s.book?.book || '________'} · p. {s.book?.page || '____'} · ej. {s.book?.exercises || '____'} {s.notes ? `· ${s.notes}` : ''}</p>}
          {s.successCriteria && <ul>{s.successCriteria.map((c) => <li key={c}>☐ {c}</li>)}</ul>}
          {s.resources.map((r) => (
            <div key={r.id} style={{ marginTop: 6 }}>
              <h3 style={{ fontWeight: 600 }}>{r.title} ({KIND_LABEL[r.kind]})</h3>
              <ContentView content={r.content} answers={teacher} hl={hl} />
            </div>
          ))}
        </div>
      ))}
      <p><b>Tarea:</b> {t.homework.task}</p>
      {!teacher && withAnswers.length > 0 && (
        <div className="pr-answers">
          <h2 style={{ fontSize: '14pt', fontWeight: 700 }}>Respuestas</h2>
          {withAnswers.map(({ s, r }) => (
            <div key={r.id}>
              <h3 style={{ fontWeight: 600 }}>{s.title} · {r.title}</h3>
              <ContentView content={r.content} answers hl={hl} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

