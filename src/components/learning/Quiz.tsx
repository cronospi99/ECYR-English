import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, RotateCcw, X, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { cn } from '@/lib/cn';

export interface QuizItem {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
  /** Optional context shown above the question (e.g. an emoji or sentence). */
  context?: string;
}

/**
 * One-question-at-a-time quiz with immediate feedback.
 * Calls `onFinish(score0to100)` once when the last question is answered.
 */
export function Quiz({
  items,
  onFinish,
  title,
  passMark = 70,
  onIndexChange,
  shuffle = true,
}: {
  items: QuizItem[];
  /** Shuffle each question's options (source banks often put the answer first). */
  shuffle?: boolean;
  onFinish?: (score: number) => void;
  title?: string;
  passMark?: number;
  onIndexChange?: (i: number) => void;
}) {
  const [round, setRound] = useState(0);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [finished, setFinished] = useState(false);
  const shuffled = useMemo(() => (shuffle ? items.map((it) => shuffleOptions(it, round)) : items), [items, shuffle, round]);

  if (!items.length) return null;
  const item = shuffled[i]!;

  const choose = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    if (k === item.answer) setCorrect((c) => c + 1);
  };

  const next = () => {
    if (i + 1 >= items.length) {
      const score = Math.round((correct / items.length) * 100);
      setFinished(true);
      onFinish?.(score);
      return;
    }
    setI(i + 1);
    onIndexChange?.(i + 1);
    setPicked(null);
  };

  const restart = () => {
    setRound((r) => r + 1);
    setI(0);
    onIndexChange?.(0);
    setPicked(null);
    setCorrect(0);
    setFinished(false);
  };

  if (finished) {
    const score = Math.round((correct / items.length) * 100);
    const passed = score >= passMark;
    return (
      <div className="flex flex-col items-center py-8 text-center">
        <ProgressRing value={score / 100} size={120} stroke={10} color={passed ? 'var(--green)' : 'var(--orange)'}>
          <span className="text-[28px] font-extrabold tabular-nums">{score}%</span>
        </ProgressRing>
        <h3 className="text-title-2 mt-5 flex items-center gap-2">
          {passed ? (
            <>
              <Trophy className="text-ios-yellow" /> ¡Excelente trabajo!
            </>
          ) : (
            'Buen intento'
          )}
        </h3>
        <p className="text-label-2 mt-1">
          {correct} de {items.length} correctas. {passed ? 'Has ganado XP y avanzado en la montaña.' : `Necesitas ${passMark}% para dominarlo. ¡Inténtalo de nuevo!`}
        </p>
        <Button variant="gray" className="mt-6" onClick={restart}>
          <RotateCcw size={16} /> Repetir
        </Button>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-5 flex items-center gap-3">
        <ProgressBar value={(i + (picked !== null ? 1 : 0)) / items.length} className="flex-1" />
        <span className="text-label-2 text-[13px] font-medium tabular-nums">
          {i + 1}/{items.length}
        </span>
      </div>
      {title && <div className="text-label-2 mb-1 text-[13px] font-semibold tracking-wide uppercase">{title}</div>}
      <AnimatePresence mode="wait">
        <motion.div
          key={`${round}-${i}`}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        >
          {item.context && <div className="bg-fill-2 mb-3 rounded-[14px] p-4 text-center text-[20px]">{item.context}</div>}
          <h3 className="text-title-3 mb-4 text-pretty">{item.q}</h3>
          <div className="space-y-2.5">
            {item.options.map((o, k) => {
              const isAnswer = k === item.answer;
              const isPicked = k === picked;
              const reveal = picked !== null;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => choose(k)}
                  disabled={reveal}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-[14px] border-[1.5px] px-4 py-3.5 text-left text-[16px] transition-all',
                    !reveal && 'bg-card border-transparent shadow-card hover:border-[color-mix(in_srgb,var(--blue)_40%,transparent)] active:scale-[0.99]',
                    reveal && isAnswer && 'border-ios-green bg-[color-mix(in_srgb,var(--green)_12%,transparent)]',
                    reveal && isPicked && !isAnswer && 'border-ios-red bg-[color-mix(in_srgb,var(--red)_10%,transparent)]',
                    reveal && !isAnswer && !isPicked && 'bg-card border-transparent opacity-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
                      reveal && isAnswer ? 'bg-ios-green text-white' : reveal && isPicked ? 'bg-ios-red text-white' : 'bg-fill text-label-2',
                    )}
                  >
                    {reveal && isAnswer ? <Check size={16} strokeWidth={3} /> : reveal && isPicked ? <X size={16} strokeWidth={3} /> : String.fromCharCode(65 + k)}
                  </span>
                  <span className="flex-1">{o}</span>
                </button>
              );
            })}
          </div>
          {picked !== null && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
              {item.explain && (
                <div
                  className={cn(
                    'rounded-[14px] p-4 text-[15px]',
                    picked === item.answer
                      ? 'bg-[color-mix(in_srgb,var(--green)_10%,transparent)]'
                      : 'bg-[color-mix(in_srgb,var(--orange)_12%,transparent)]',
                  )}
                >
                  <span className="font-semibold">{picked === item.answer ? '¡Correcto! ' : 'Ojo: '}</span>
                  {item.explain}
                </div>
              )}
              <Button className="mt-4 w-full" size="lg" onClick={next}>
                {i + 1 >= items.length ? 'Ver resultado' : 'Siguiente'}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

/** Deterministic per-question shuffle: stable while answering, new order on retry. */
function shuffleOptions(it: QuizItem, round: number): QuizItem {
  let seed = 2166136261 ^ round;
  for (let k = 0; k < it.q.length; k++) seed = Math.imul(seed ^ it.q.charCodeAt(k), 16777619);
  // mulberry32 — good distribution even for tiny ranges
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const order = it.options.map((_, k) => k);
  for (let k = order.length - 1; k > 0; k--) {
    const j = Math.floor(rand() * (k + 1));
    [order[k], order[j]] = [order[j]!, order[k]!];
  }
  return { ...it, options: order.map((k) => it.options[k]!), answer: order.indexOf(it.answer) };
}
