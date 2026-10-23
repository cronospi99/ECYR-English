import { useMemo, useRef, useState } from 'react';
import { Check, MessageSquarePlus, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Misc';
import { EXAM_SECTIONS, PASS_PCT, toGrade } from '@/content/exams';
import { examPct, saveReview, type Review, type ReviewNote } from '@/lib/reviews';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';

const fmt = (g: number) => g.toFixed(1).replace('.', ',');

// ------------------------------------------------------ annotated text --

/** Where each note sits in the text: its own offset when the quote is still there, else the first match. */
function placeNotes(text: string, notes: ReviewNote[]) {
  return notes
    .map((n, i) => {
      const at = text.slice(n.at, n.at + n.quote.length) === n.quote ? n.at : text.indexOf(n.quote);
      return { i, start: at, end: at + n.quote.length };
    })
    .filter((x) => x.start >= 0)
    .sort((a, b) => a.start - b.start);
}

/** Offset of a DOM point inside `root`, counting only text. */
function offsetIn(root: HTMLElement, node: Node, off: number) {
  const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let n = 0;
  for (let t = w.nextNode(); t; t = w.nextNode()) {
    if (t === node) return n + off;
    if ((t.parentElement as HTMLElement | null)?.dataset.marker) continue;
    n += t.nodeValue?.length ?? 0;
  }
  return n;
}

/**
 * The student's text with the teacher's comments highlighted and numbered.
 * Selecting words shows "Comentar"; the comment is anchored to that quote.
 */
export function AnnotatedText({ text, notes, onAdd, active, onPick, color }: { text: string; notes: ReviewNote[]; onAdd?: (n: ReviewNote) => void; active: number | null; onPick: (i: number | null) => void; color: string }) {
  const box = useRef<HTMLParagraphElement>(null);
  const [sel, setSel] = useState<{ start: number; end: number; x: number; y: number } | null>(null);
  const [draft, setDraft] = useState('');
  const [writing, setWriting] = useState(false);
  const placed = useMemo(() => placeNotes(text, notes), [text, notes]);

  const onUp = () => {
    if (!onAdd || writing) return;
    const s = window.getSelection();
    const root = box.current;
    if (!s || s.isCollapsed || !root || !root.contains(s.anchorNode) || !root.contains(s.focusNode)) return setSel(null);
    let a = offsetIn(root, s.anchorNode!, s.anchorOffset);
    let b = offsetIn(root, s.focusNode!, s.focusOffset);
    if (a > b) [a, b] = [b, a];
    while (a < b && /\s/.test(text[a]!)) a++;
    while (b > a && /\s/.test(text[b - 1]!)) b--;
    if (b - a < 1) return setSel(null);
    const r = s.getRangeAt(0).getBoundingClientRect();
    const host = root.getBoundingClientRect();
    setSel({ start: a, end: b, x: r.left - host.left + r.width / 2, y: r.bottom - host.top + 6 });
  };

  const add = () => {
    if (!sel || !draft.trim() || !onAdd) return;
    onAdd({ quote: text.slice(sel.start, sel.end), note: draft.trim(), at: sel.start });
    setDraft('');
    setWriting(false);
    setSel(null);
    window.getSelection()?.removeAllRanges();
  };

  const parts: React.ReactNode[] = [];
  let pos = 0;
  for (const p of placed) {
    if (p.start < pos) continue; // overlapping quotes: the first one wins the highlight
    if (p.start > pos) parts.push(text.slice(pos, p.start));
    const on = active === p.i;
    parts.push(
      <mark
        key={`m${p.i}`}
        onClick={() => onPick(on ? null : p.i)}
        className="cursor-pointer rounded-[3px] px-[1px] text-inherit"
        style={{ background: on ? tint(color, 45) : 'color-mix(in srgb, #ffd60a 45%, transparent)', boxDecorationBreak: 'clone', WebkitBoxDecorationBreak: 'clone' }}
      >
        {text.slice(p.start, p.end)}
        <sup data-marker="1" className="ml-0.5 rounded-full px-1 text-[10px] font-bold text-white select-none" style={{ background: ink(color) }}>
          {p.i + 1}
        </sup>
      </mark>,
    );
    pos = p.end;
  }
  if (pos < text.length) parts.push(text.slice(pos));

  return (
    <div className="relative">
      <p ref={box} onMouseUp={onUp} onTouchEnd={() => setTimeout(onUp, 50)} className="bg-fill-2 max-h-[460px] overflow-y-auto rounded-[12px] p-3 text-[15px] leading-relaxed whitespace-pre-wrap">
        {parts.length ? parts : '—'}
      </p>
      {sel && onAdd && (
        <div className="absolute z-10 -translate-x-1/2" style={{ left: Math.max(90, Math.min(sel.x, (box.current?.clientWidth ?? 300) - 90)), top: sel.y }}>
          {writing ? (
            <div className="bg-card shadow-float border-separator flex w-[260px] items-center gap-1 rounded-[12px] border p-1.5">
              <input
                autoFocus
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') add();
                  if (e.key === 'Escape') setSel(null);
                }}
                placeholder="Tu comentario…"
                maxLength={500}
                className="min-w-0 flex-1 bg-transparent px-1.5 text-[14px] outline-none"
              />
              <button type="button" onClick={add} aria-label="Guardar comentario" className="inline-flex h-7 w-7 items-center justify-center rounded-full text-white" style={{ background: ink(color) }}>
                <Check size={15} />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => setWriting(true)}
              className="shadow-float inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-semibold text-white"
              style={{ background: ink(color) }}
            >
              <MessageSquarePlus size={15} /> Comentar
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------- panel --

interface ExamReport {
  exam: string;
  sections: Record<string, number | null>;
  grade?: number;
  pct?: number;
}

const isExamReport = (r: unknown): r is ExamReport => !!r && typeof r === 'object' && typeof (r as ExamReport).exam === 'string' && !!(r as ExamReport).sections;

/**
 * The teacher's review of one piece of work: comments on the text (select
 * words), a general comment and the score — per skill for level exams, with
 * the grade recomputed live.
 */
export function ReviewPanel({
  id,
  text,
  report,
  review,
  title,
  onSaved,
}: {
  id: string;
  text: string;
  report: unknown;
  review: Review | undefined;
  title: string;
  onSaved: (r: Review | null) => void;
}) {
  const exam = isExamReport(report) ? report : null;
  const color = 'var(--indigo)';
  const [notes, setNotes] = useState<ReviewNote[]>(review?.notes ?? []);
  const [comment, setComment] = useState(review?.comment ?? '');
  const [score, setScore] = useState<string>(review?.score != null ? String(review.score) : '');
  const [sections, setSections] = useState<Record<string, number | null>>(() => ({ ...(exam?.sections ?? {}), ...(review?.sections ?? {}) }));
  const [notify, setNotify] = useState(review?.shared ?? true);
  const [active, setActive] = useState<number | null>(null);
  const [state, setState] = useState<'idle' | 'saving' | 'saved' | string>('idle');

  const pct = exam ? examPct(sections) : null;
  const grade = pct != null ? toGrade(pct) : null;
  const aiGrade = exam?.grade;
  const scoreNum = score.trim() === '' ? null : Math.max(0, Math.min(100, Math.round(Number(score))));

  const save = async () => {
    setState('saving');
    try {
      const saved = await saveReview(id, { comment: comment.trim() || null, notes, score: exam ? pct : scoreNum, sections: exam ? sections : null, grade: exam ? grade : null, shared: notify }, title);
      onSaved(saved);
      setState('saved');
      setTimeout(() => setState('idle'), 1800);
    } catch (e) {
      setState((e as Error).message);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <div className="text-label-2 mb-1 flex items-center justify-between text-[12px] font-semibold uppercase">
          <span>Texto del estudiante</span>
          <span className="font-normal normal-case">Selecciona palabras para comentar</span>
        </div>
        <AnnotatedText text={text} notes={notes} onAdd={(n) => setNotes((l) => [...l, n])} active={active} onPick={setActive} color={color} />
      </div>

      {notes.length > 0 && (
        <ol className="space-y-1.5">
          {notes.map((n, i) => (
            <li
              key={i}
              onMouseEnter={() => setActive(i)}
              onMouseLeave={() => setActive(null)}
              className={cn('flex items-start gap-2 rounded-[12px] p-2 text-[14px] transition-colors', active === i ? 'bg-fill-2' : '')}
            >
              <span className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: ink(color) }}>
                {i + 1}
              </span>
              <span className="min-w-0 flex-1">
                <span className="text-label-2 italic">“{n.quote.length > 60 ? `${n.quote.slice(0, 60)}…` : n.quote}”</span> <span className="font-medium">{n.note}</span>
              </span>
              <button type="button" onClick={() => setNotes((l) => l.filter((_, k) => k !== i))} aria-label="Borrar comentario" className="text-label-3 hover:text-ink-red shrink-0">
                <Trash2 size={15} />
              </button>
            </li>
          ))}
        </ol>
      )}

      <div className="rounded-[16px] p-3" style={{ background: tint(color, 8) }}>
        <div className="mb-2 text-[12px] font-bold tracking-wide uppercase" style={{ color: ink(color) }}>
          Revisión del docente
        </div>
        {exam ? (
          <>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {EXAM_SECTIONS.map((s) => {
                const v = sections[s.id];
                const ai = exam.sections[s.id];
                return (
                  <label key={s.id} className={cn('bg-card flex items-center gap-2 rounded-[12px] px-2.5 py-1.5', v == null && 'ring-ink-orange/50 ring-2')}>
                    <span aria-hidden>{s.emoji}</span>
                    <span className="min-w-0 flex-1 text-[13px] leading-tight">
                      <span className="block font-semibold">{s.label}</span>
                      <span className="text-label-2 block text-[11px]">{ai == null ? 'IA: pendiente' : `IA: ${ai}%`}</span>
                    </span>
                    <input
                      value={v ?? ''}
                      onChange={(e) => {
                        const raw = e.target.value.replace(/\D/g, '');
                        setSections((x) => ({ ...x, [s.id]: raw === '' ? null : Math.min(100, Number(raw)) }));
                      }}
                      inputMode="numeric"
                      placeholder="—"
                      aria-label={`${s.label} (%)`}
                      className="bg-fill-2 w-12 rounded-[8px] py-1 text-center text-[15px] font-bold tabular-nums outline-none focus:ring-2"
                    />
                    <span className="text-label-2 -ml-1 text-[12px]">%</span>
                  </label>
                );
              })}
            </div>
            {grade != null && (
              <div className="mt-2.5 flex flex-wrap items-baseline gap-x-3">
                <span className="text-[26px] font-bold tabular-nums" style={{ color: pct! >= PASS_PCT ? 'var(--green)' : 'var(--red)' }}>
                  {fmt(grade)}
                </span>
                <span className="text-label-2 text-[14px]">/ 5,0 · {pct}%</span>
                {aiGrade != null && Math.abs(aiGrade - grade) >= 0.05 && <span className="text-label-2 text-[13px] line-through">IA: {fmt(aiGrade)}</span>}
              </div>
            )}
          </>
        ) : (
          <label className="flex items-center gap-2 text-[14px]">
            Nota (opcional)
            <input
              value={score}
              onChange={(e) => setScore(e.target.value.replace(/\D/g, '').slice(0, 3))}
              inputMode="numeric"
              placeholder="0–100"
              className="bg-card w-20 rounded-[8px] px-2 py-1 text-center font-bold tabular-nums outline-none focus:ring-2"
            />
            <span className="text-label-2">/ 100</span>
          </label>
        )}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          maxLength={4000}
          rows={3}
          placeholder="Comentario general para el estudiante…"
          className="bg-card placeholder:text-label-3 mt-2.5 w-full resize-y rounded-[12px] p-2.5 text-[14.5px] outline-none focus:ring-2"
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-[13.5px]">
            <Toggle checked={notify} onChange={setNotify} label="Visible para el estudiante" /> {notify ? 'Visible para el estudiante' : 'Borrador (solo tú)'}
          </label>
          <span className="ml-auto flex items-center gap-2">
            {review && (
              <Button
                variant="gray"
                size="sm"
                onClick={() => {
                  setNotes([]);
                  setComment('');
                  setScore('');
                  setSections({ ...(exam?.sections ?? {}) });
                }}
                title="Vaciar la revisión (luego guarda)"
              >
                <X size={15} /> Vaciar
              </Button>
            )}
            <Button size="sm" onClick={() => void save()} disabled={state === 'saving'}>
              {state === 'saved' ? <Check size={15} /> : null} {state === 'saving' ? 'Guardando…' : state === 'saved' ? 'Guardado' : 'Guardar revisión'}
            </Button>
          </span>
        </div>
        {state !== 'idle' && state !== 'saving' && state !== 'saved' && (
          <p role="alert" className="text-ink-red mt-2 text-[13px]">
            {state}
          </p>
        )}
      </div>
    </div>
  );
}
