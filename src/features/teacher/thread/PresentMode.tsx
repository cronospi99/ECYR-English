import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Eye, EyeOff, Pause, Play, StickyNote, X } from 'lucide-react';
import { ink, tint } from '@/lib/color';
import { KIND_LABEL } from '@/lib/thread/resources';
import type { PlanContext, Resource, Stage, Thread } from '@/lib/thread/types';
import { ContentView } from './ContentView';
import { makeHighlighter } from './highlight';
import { GROUP_LABEL, anchorColor } from './ui';

type Slide =
  | { type: 'cover' }
  | { type: 'stage'; stage: Stage }
  | { type: 'book'; stage: Stage }
  | { type: 'resource'; stage: Stage; resource: Resource };

const READING = ['story', 'news', 'dialogue', 'message', 'announcement', 'interview'];

export function buildSlides(t: Thread): Slide[] {
  const out: Slide[] = [{ type: 'cover' }];
  for (const s of t.stages) {
    if (s.kind === 'homework') continue;
    if (s.kind === 'practice') {
      out.push({ type: 'book', stage: s });
      continue;
    }
    out.push({ type: 'stage', stage: s });
    for (const r of s.resources) out.push({ type: 'resource', stage: s, resource: r });
  }
  return out;
}

export const bookLine = (s: Stage) => `${s.book?.book?.trim() || 'Book'} · p. ${s.book?.page?.trim() || '__'} · ex. ${s.book?.exercises?.trim() || '__'}`;

const CSS = `
.pm-big *{font-size:inherit!important;line-height:1.38!important;overflow-wrap:anywhere}
.pm-big mark{padding:0 .1em}
`;

/** Modo presentación: pantalla completa, una etapa/recurso por diapositiva, letra grande, ←/→/Esc, N = notas, A = respuestas. */
export function PresentMode({ thread: t, ctx, color, onClose }: { thread: Thread; ctx: PlanContext; color: string; onClose: () => void }) {
  const slides = useMemo(() => buildSlides(t), [t]);
  const [i, setI] = useState(0);
  const [notes, setNotes] = useState(false);
  const [answers, setAnswers] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const hl = useMemo(() => makeHighlighter(ctx.targets, t.anchors.map((a) => a.id)), [ctx.targets, t.anchors]);
  const slide = slides[Math.min(i, slides.length - 1)]!;
  const stage = slide.type === 'cover' ? undefined : slide.stage;
  const aIdx = stage?.anchorId ? t.anchors.findIndex((a) => a.id === stage.anchorId) : -1;

  // temporizador por etapa
  const [left, setLeft] = useState(0);
  const [running, setRunning] = useState(false);
  const stageId = stage?.id;
  useEffect(() => {
    setLeft((stage?.minutes ?? 0) * 60);
    setRunning(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stageId]);
  useEffect(() => {
    if (!running) return;
    const h = setInterval(() => setLeft((l) => Math.max(0, l - 1)), 1000);
    return () => clearInterval(h);
  }, [running]);

  const go = useCallback((d: number) => setI((x) => Math.max(0, Math.min(slides.length - 1, x + d))), [slides.length]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (/input|textarea|select/i.test(target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') (e.preventDefault(), go(1));
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') (e.preventDefault(), go(-1));
      else if (e.key === 'Escape') onClose();
      else if (e.key === 'n' || e.key === 'N') setNotes((v) => !v);
      else if (e.key === 'a' || e.key === 'A') setAnswers((v) => !v);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [go, onClose]);
  useEffect(() => {
    rootRef.current?.focus();
    void rootRef.current?.requestFullscreen?.().catch(() => undefined);
    return () => {
      if (document.fullscreenElement) void document.exitFullscreen().catch(() => undefined);
    };
  }, []);

  const mmss = `${String(Math.floor(left / 60)).padStart(2, '0')}:${String(left % 60).padStart(2, '0')}`;
  const accent = aIdx >= 0 ? anchorColor(aIdx) : color;

  return (
    <div ref={rootRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Modo presentación" className="bg-bg fixed inset-0 z-[100] flex flex-col outline-none" style={{ color: 'var(--label)' }}>
      <style>{CSS}</style>
      <header className="flex items-center gap-3 border-b px-4 py-2" style={{ borderColor: tint(accent, 40), background: tint(accent, 12) }}>
        <div className="min-w-0 flex-1 truncate text-[18px] font-bold" aria-live="polite">
          {slide.type === 'cover' ? t.bridge.title : stage!.title}
        </div>
        {stage && stage.minutes > 0 && (
          <button type="button" onClick={() => setRunning(!running)} aria-label={running ? 'Pausar temporizador' : 'Iniciar temporizador'} className="inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[18px] font-bold tabular-nums" style={{ background: left === 0 ? 'var(--red)' : ink(accent, 80), color: '#fff' }}>
            {running ? <Pause size={16} /> : <Play size={16} />} {mmss}
          </button>
        )}
        <button type="button" onClick={() => setAnswers(!answers)} aria-pressed={answers} aria-label="Mostrar respuestas (A)" className="bg-fill-2 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[16px]">
          {answers ? <Eye size={16} /> : <EyeOff size={16} />} Respuestas
        </button>
        <button type="button" onClick={() => setNotes(!notes)} aria-pressed={notes} aria-label="Notas del docente (N)" className="bg-fill-2 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[16px]">
          <StickyNote size={16} /> Notas
        </button>
        <span className="text-label-2 text-[16px] tabular-nums">{Math.min(i, slides.length - 1) + 1} / {slides.length}</span>
        <button type="button" onClick={onClose} aria-label="Salir de la presentación (Esc)" className="bg-fill-2 inline-flex h-9 w-9 items-center justify-center rounded-full"><X size={18} /></button>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden px-6 py-6 sm:px-14" data-testid="slide">
        <SlideBody slide={slide} t={t} hl={hl} answers={answers} accent={accent} />
      </main>

      <footer className="flex items-center justify-between gap-3 border-t px-4 py-2" style={{ borderColor: 'var(--separator)' }}>
        <button type="button" onClick={() => go(-1)} disabled={i === 0} aria-label="Anterior (←)" className="bg-fill-2 inline-flex h-11 items-center gap-1 rounded-full px-4 text-[16px] font-semibold disabled:opacity-40"><ChevronLeft size={18} /> Anterior</button>
        <div className="no-scrollbar hidden flex-1 justify-center gap-1 overflow-x-auto sm:flex" aria-hidden>
          {slides.map((_, k) => (
            <span key={k} className="h-2 w-2 shrink-0 rounded-full" style={{ background: k === i ? ink(accent, 90) : 'var(--fill)' }} />
          ))}
        </div>
        <button type="button" onClick={() => go(1)} disabled={i >= slides.length - 1} aria-label="Siguiente (→)" className="inline-flex h-11 items-center gap-1 rounded-full px-4 text-[16px] font-semibold text-white disabled:opacity-40" style={{ background: ink(accent, 85) }}>Siguiente <ChevronRight size={18} /></button>
      </footer>

      {notes && stage && (
        <aside className="bg-card shadow-card fixed right-3 bottom-16 z-10 max-h-[45vh] w-[min(440px,92vw)] overflow-y-auto rounded-[18px] p-4 text-[15px]" aria-label="Notas del docente">
          <div className="mb-1 font-bold">Notas del docente · {GROUP_LABEL[stage.grouping]} · {stage.minutes} min</div>
          <p>{stage.teacherRole}</p>
          {stage.transition && <p className="mt-2"><i>{stage.transition.teacher_es}</i></p>}
          {stage.notes && <p className="mt-2">{stage.notes}</p>}
          {stage.successCriteria && <ul className="mt-2 list-disc pl-5">{stage.successCriteria.map((c) => <li key={c}>{c}</li>)}</ul>}
        </aside>
      )}
    </div>
  );
}

function SlideBody({ slide, t, hl, answers, accent }: { slide: Slide; t: Thread; hl: ReturnType<typeof makeHighlighter>; answers: boolean; accent: string }) {
  if (slide.type === 'cover')
    return (
      <div className="pm-big mx-auto max-w-5xl" style={{ fontSize: 34 }}>
        <p style={{ color: ink(accent) }} className="font-bold">{t.level} · {t.duration} min</p>
        <h1 className="mt-2 font-bold">{t.bridge.title}</h1>
        <p className="mt-4" lang="en">{t.bridge.setting}</p>
        <p className="mt-4 italic" lang="en">{t.bridge.conflict}</p>
        {t.hook && <p className="mt-8"><b>Gancho:</b> {t.hook}</p>}
      </div>
    );
  if (slide.type === 'book')
    return (
      <div className="pm-big flex h-full flex-col items-center justify-center text-center" style={{ fontSize: 64 }} data-testid="book-slide">
        <div className="mb-4 font-bold" style={{ fontSize: 30, color: ink('var(--teal)') }}>Práctica del libro · {slide.stage.minutes} min</div>
        <div className="font-bold" style={{ color: ink(accent, 80) }}>{bookLine(slide.stage)}</div>
        {slide.stage.notes && <div className="mt-6" style={{ fontSize: 30 }}>{slide.stage.notes}</div>}
      </div>
    );
  if (slide.type === 'stage') {
    const s = slide.stage;
    return (
      <div className="pm-big mx-auto max-w-5xl" style={{ fontSize: 32 }}>
        <p className="font-bold" style={{ color: ink(accent) }}>{s.minutes} min · {GROUP_LABEL[s.grouping]}</p>
        <h2 className="mt-2 font-bold">{s.title}</h2>
        {s.transition && <p className="mt-6 italic" lang="en">“{s.transition.student_en}”</p>}
        {s.kind === 'energizer' && <p className="mt-6">{s.teacherRole}</p>}
        {s.kind === 'warmup' && t.hook && <p className="mt-6">{t.hook}</p>}
        {s.successCriteria && (
          <ul className="mt-6 list-disc space-y-2 pl-8">
            {s.successCriteria.map((c) => <li key={c}>{c}</li>)}
          </ul>
        )}
      </div>
    );
  }
  const r = slide.resource;
  const big = READING.includes(r.kind) ? 36 : 30;
  return (
    <div className="pm-big mx-auto max-w-5xl" style={{ fontSize: big }}>
      <p className="font-bold" style={{ color: ink(accent) }}>{KIND_LABEL[r.kind]} · {r.title}</p>
      <div className="mt-4"><ContentView content={r.content} answers={answers} hl={hl} big /></div>
    </div>
  );
}
