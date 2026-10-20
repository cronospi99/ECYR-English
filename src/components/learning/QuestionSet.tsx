import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { Check, RotateCcw, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { checkTyped, type LibQuestion } from '@/content/library';
import type { WsSection } from '@/lib/worksheet';
import { cn } from '@/lib/cn';
import { ink } from '@/lib/color';

export type Answer = number | string | string[] | undefined;
export type Verdict = 'right' | 'almost' | 'wrong';

const TF_LABEL = { T: 'True', F: 'False', NG: 'Not given' } as const;
const KIND_TITLE: Record<LibQuestion['type'], string> = {
  mc: 'Choose the correct answer',
  vocab: 'Vocabulary in context',
  heading: 'Choose the best heading',
  tf: 'True, false or not given?',
  gap: 'Complete the sentences',
  order: 'Put the words in order',
  error: 'Find and correct the mistake',
  transform: 'Rewrite the sentences',
};

/** "you / are / where / from / ?" → "you are where from?" (punctuation sticks to the word before it). */
const joinTiles = (t: string[]) => t.join(' ').replace(/\s+([?.!,])/g, '$1');

export function grade(q: LibQuestion, a: Answer): Verdict {
  if (a === undefined || a === '' || (Array.isArray(a) && !a.length)) return 'wrong';
  switch (q.type) {
    case 'mc':
    case 'vocab':
    case 'heading':
      return a === q.answer ? 'right' : 'wrong';
    case 'tf':
      return a === q.answer ? 'right' : 'wrong';
    case 'order': {
      const words = q.q.split(/\s*\/\s*/).filter(Boolean);
      // Clause order may vary ("If it rains, …" / "… if it rains"): commas don't count.
      const nc = (s: string) => s.replace(/,/g, '');
      const given = nc(joinTiles((a as string[]).map((k) => words[Number(k)]!)));
      return checkTyped(given, nc(q.answer), (q.accept ?? []).map(nc)) === 'right' ? 'right' : 'wrong';
    }
    default:
      return checkTyped(String(a), q.answer, q.accept);
  }
}

export const rightAnswer = (q: LibQuestion) =>
  q.type === 'mc' || q.type === 'vocab' || q.type === 'heading' ? q.options[q.answer] : q.type === 'tf' ? TF_LABEL[q.answer] : q.answer;

/**
 * A set of questions answered like a worksheet: everything on one page, one
 * "Comprobar" for all, then marks, the right answers and why.
 */
export function QuestionSet({
  questions,
  color = 'var(--blue)',
  onChecked,
  numberFrom = 1,
}: {
  questions: LibQuestion[];
  color?: string;
  /** Called once per check with the number right (an "almost" counts). */
  onChecked?: (right: number, total: number) => void;
  numberFrom?: number;
}) {
  const [answers, setAnswers] = useState<Answer[]>(() => questions.map(() => undefined));
  const [checked, setChecked] = useState(false);
  const verdicts = useMemo(() => questions.map((q, i) => grade(q, answers[i])), [questions, answers]);
  const right = verdicts.filter((v) => v !== 'wrong').length;
  const answered = answers.filter((a) => a !== undefined && a !== '' && !(Array.isArray(a) && !a.length)).length;
  const ng = questions.some((q) => q.type === 'tf' && q.answer === 'NG');
  const set = (i: number, a: Answer) => !checked && setAnswers((s) => s.map((x, k) => (k === i ? a : x)));

  return (
    <div className="space-y-3">
      {questions.map((q, i) => {
        const v = verdicts[i]!;
        const showKind = i === 0 || questions[i - 1]!.type !== q.type;
        return (
          <div key={i}>
            {showKind && <div className="text-label-2 mt-2 mb-2 text-[12px] font-bold tracking-wide uppercase">{KIND_TITLE[q.type]}</div>}
            <div
              className={cn('bg-card shadow-card rounded-[16px] p-4', checked && (v === 'wrong' ? 'ring-ios-red/60 ring-2' : 'ring-ios-green/60 ring-2'))}
            >
              <div className="flex gap-2.5">
                <span
                  className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                  style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color: ink(color) }}
                >
                  {i + numberFrom}
                </span>
                <div className="min-w-0 flex-1">
                  <Body q={q} a={answers[i]} set={(a) => set(i, a)} checked={checked} ng={ng} color={color} />
                  {checked && (
                    <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="mt-2.5 text-[13.5px] leading-snug">
                      <span className={cn('inline-flex items-center gap-1 font-semibold', v === 'wrong' ? 'text-ink-red' : 'text-ink-green')}>
                        {v === 'wrong' ? <X size={15} /> : <Check size={15} />}
                        {v === 'right' ? 'Correcto' : v === 'almost' ? 'Casi: revisa la ortografía' : 'Respuesta:'}
                      </span>{' '}
                      {v !== 'right' && <b>{rightAnswer(q)}</b>}
                      {q.explain_es && <span className="text-label-2 block">{q.explain_es}</span>}
                    </motion.div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap items-center gap-3 pt-1">
        {!checked ? (
          <Button
            onClick={() => {
              setChecked(true);
              onChecked?.(right, questions.length);
            }}
            disabled={!answered}
          >
            <Check size={16} /> Comprobar ({answered}/{questions.length})
          </Button>
        ) : (
          <>
            <span className="text-[17px] font-bold">
              {right}/{questions.length} {right === questions.length ? '🏆' : right >= questions.length * 0.7 ? '👏' : '💪'}
            </span>
            <Button variant="gray" onClick={() => (setAnswers(questions.map(() => undefined)), setChecked(false))}>
              <RotateCcw size={16} /> Intentar de nuevo
            </Button>
          </>
        )}
      </div>
    </div>
  );
}

/**
 * The same questions, controlled from outside and without their own check
 * button: an exam keeps every section's answers and marks them all at the end.
 */
export function QuestionList({
  questions,
  answers,
  onAnswer,
  checked,
  color = 'var(--blue)',
  numberFrom = 1,
}: {
  questions: LibQuestion[];
  answers: Answer[];
  onAnswer: (i: number, a: Answer) => void;
  checked: boolean;
  color?: string;
  numberFrom?: number;
}) {
  const ng = questions.some((q) => q.type === 'tf' && q.answer === 'NG');
  return (
    <div className="space-y-3">
      {questions.map((q, i) => {
        const v = grade(q, answers[i]);
        const showKind = i === 0 || questions[i - 1]!.type !== q.type;
        return (
          <div key={i}>
            {showKind && <div className="text-label-2 mt-2 mb-2 text-[12px] font-bold tracking-wide uppercase">{KIND_TITLE[q.type]}</div>}
            <div className={cn('bg-card shadow-card rounded-[16px] p-4', checked && (v === 'wrong' ? 'ring-ios-red/60 ring-2' : 'ring-ios-green/60 ring-2'))}>
              <div className="flex gap-2.5">
                <span
                  className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold"
                  style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color: ink(color) }}
                >
                  {i + numberFrom}
                </span>
                <div className="min-w-0 flex-1">
                  <Body q={q} a={answers[i]} set={(a) => !checked && onAnswer(i, a)} checked={checked} ng={ng} color={color} />
                  {checked && (
                    <div className="mt-2.5 text-[13.5px] leading-snug">
                      <span className={cn('inline-flex items-center gap-1 font-semibold', v === 'wrong' ? 'text-ink-red' : 'text-ink-green')}>
                        {v === 'wrong' ? <X size={15} /> : <Check size={15} />}
                        {v === 'right' ? 'Correcto' : v === 'almost' ? 'Casi: revisa la ortografía' : 'Respuesta:'}
                      </span>{' '}
                      {v !== 'right' && <b>{rightAnswer(q)}</b>}
                      {q.explain_es && <span className="text-label-2 block">{q.explain_es}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Body({ q, a, set, checked, ng, color }: { q: LibQuestion; a: Answer; set: (a: Answer) => void; checked: boolean; ng: boolean; color: string }) {
  switch (q.type) {
    case 'mc':
    case 'vocab':
    case 'heading':
      return (
        <>
          <p className="text-[15.5px] leading-snug">{q.q}</p>
          <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
            {q.options.map((o, k) => {
              const on = a === k;
              const good = checked && k === q.answer;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => set(k)}
                  className={cn(
                    'rounded-[12px] px-3 py-2.5 text-left text-[14.5px] transition-colors',
                    good ? 'bg-ios-green text-white' : on ? (checked ? 'bg-ios-red text-white' : 'text-white') : 'bg-fill-2 hover:bg-fill',
                  )}
                  style={on && !checked ? { background: color } : undefined}
                >
                  <b className="mr-1.5 opacity-70">{'abcdef'[k]})</b>
                  {o}
                </button>
              );
            })}
          </div>
        </>
      );
    case 'tf':
      return (
        <>
          <p className="text-[15.5px] leading-snug">{q.q}</p>
          <div className="mt-2.5 flex flex-wrap gap-2">
            {(ng ? (['T', 'F', 'NG'] as const) : (['T', 'F'] as const)).map((k) => {
              const on = a === k;
              const good = checked && k === q.answer;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => set(k)}
                  className={cn(
                    'rounded-full px-4 py-2 text-[14px] font-semibold',
                    good ? 'bg-ios-green text-white' : on ? (checked ? 'bg-ios-red text-white' : 'text-white') : 'bg-fill-2 hover:bg-fill',
                  )}
                  style={on && !checked ? { background: color } : undefined}
                >
                  {TF_LABEL[k]}
                </button>
              );
            })}
          </div>
        </>
      );
    case 'gap': {
      const parts = q.q.split(/_{2,}/);
      if (parts.length === 2)
        return (
          <p className="text-[15.5px] leading-[2.1]">
            {parts[0]}
            <input
              value={(a as string) ?? ''}
              onChange={(e) => set(e.target.value)}
              disabled={checked}
              aria-label="Respuesta"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="bg-fill-2 mx-1 inline-block w-[150px] rounded-[8px] px-2 py-0.5 text-[15px] font-semibold outline-none focus:ring-2"
              style={{ color: ink(color) }}
            />
            {parts[1]}
          </p>
        );
      return <Typed q={q} a={a} set={set} checked={checked} />;
    }
    case 'order':
      return <Tiles q={q} a={(a as string[]) ?? []} set={set} checked={checked} color={color} />;
    default:
      return <Typed q={q} a={a} set={set} checked={checked} />;
  }
}

function Typed({ q, a, set, checked }: { q: LibQuestion; a: Answer; set: (a: Answer) => void; checked: boolean }) {
  return (
    <>
      <p className="text-[15.5px] leading-snug">{q.q}</p>
      <input
        value={(a as string) ?? ''}
        onChange={(e) => set(e.target.value)}
        disabled={checked}
        placeholder="Escribe tu respuesta…"
        autoCapitalize="off"
        autoCorrect="off"
        spellCheck={false}
        className="bg-fill-2 placeholder:text-label-3 mt-2.5 w-full rounded-[10px] px-3 py-2 text-[15px] outline-none focus:ring-2"
      />
    </>
  );
}

function Tiles({ q, a, set, checked, color }: { q: LibQuestion; a: string[]; set: (a: Answer) => void; checked: boolean; color: string }) {
  const words = useMemo(() => q.q.split(/\s*\/\s*/).filter(Boolean), [q.q]);
  // Tiles are tracked by index so repeated words ("the … the") stay separate.
  const left = words.map((w, k) => ({ w, k })).filter(({ k }) => !a.includes(`${k}`));
  const built = a.map((k) => words[Number(k)]!);
  return (
    <>
      <div className="bg-fill-2 flex min-h-[44px] flex-wrap gap-1.5 rounded-[12px] p-2">
        {built.length ? (
          built.map((w, i) => (
            <button
              key={i}
              type="button"
              disabled={checked}
              onClick={() => set(a.filter((_, j) => j !== i))}
              className="rounded-[8px] px-2.5 py-1 text-[14.5px] font-semibold text-white"
              style={{ background: color }}
            >
              {w}
            </button>
          ))
        ) : (
          <span className="text-label-3 px-1 py-1 text-[13px]">Toca las palabras en orden…</span>
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {left.map(({ w, k }) => (
          <button
            key={k}
            type="button"
            disabled={checked}
            onClick={() => set([...a, `${k}`])}
            className="bg-card shadow-card rounded-[8px] px-2.5 py-1 text-[14.5px] font-medium"
          >
            {w}
          </button>
        ))}
      </div>
    </>
  );
}

/** The same questions as worksheet sections for the homework PDF. */
export function questionsToSections(questions: LibQuestion[]): WsSection[] {
  const out: WsSection[] = [];
  for (const q of questions) {
    const last = out[out.length - 1];
    const title = KIND_TITLE[q.type];
    if (q.type === 'mc' || q.type === 'vocab' || q.type === 'heading') {
      const item = { q: q.q, options: q.options, answer: q.answer };
      if (last?.kind === 'mc' && last.title === title) last.items.push(item);
      else out.push({ kind: 'mc', title, items: [item] });
    } else if (q.type === 'tf') {
      const item = { q: q.q, answer: q.answer };
      if (last?.kind === 'tf') last.items.push(item);
      else out.push({ kind: 'tf', title, ng: questions.some((x) => x.type === 'tf' && x.answer === 'NG'), items: [item] });
    } else {
      const item = { q: q.type === 'order' ? q.q.replace(/\s*\/\s*/g, '  /  ') : q.q, answer: String(q.answer) };
      if (last?.kind === 'write' && last.title === title) last.items.push(item);
      else out.push({ kind: 'write', title, items: [item], lines: q.type === 'gap' ? 0 : 1 });
    }
  }
  return out;
}
