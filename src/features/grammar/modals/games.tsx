/**
 * Modal Verbs — the interactive checks: the original 14-question Bonus Stage,
 * a "Trap Spotter" (correct or wrong? three lives) and a function quiz.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { Check, Flame, Heart, HeartCrack, RotateCcw, Target, Trophy, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { Quiz, type QuizItem } from '@/components/learning/Quiz';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { cn } from '@/lib/cn';
import { BONUS, FUNCTION_BY_ID, FUNCTION_QUIZ, TRAPS, type BonusQuestion } from './data';
import { awardModals, shuffle, useModalsArcade, useSfx } from './arcade';
import { Ring } from './components';

/** Listens for keys while mounted, ignoring typing in inputs. */
function useKeys(handler: (key: string) => void) {
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.metaKey || e.ctrlKey || e.altKey || (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      handler(e.key);
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [handler]);
}

const fill = (text: string, word: string) => text.replace('___', word);

function Blanked({ text, word, state }: { text: string; word: string | null; state: 'idle' | 'ok' | 'bad' }) {
  const parts = text.split('___');
  return (
    <>
      {parts.map((p, k) => (
        <span key={k}>
          {k > 0 && (
            <span
              className={cn(
                'mx-1 inline-block min-w-20 rounded-[8px] border-b-[3px] px-2 text-center',
                state === 'idle' && 'border-[var(--label-3)]',
                state === 'ok' && 'text-ios-green border-[var(--green)]',
                state === 'bad' && 'text-ios-blue border-[var(--blue)]',
              )}
            >
              {word ?? ' '}
            </span>
          )}
          {p}
        </span>
      ))}
    </>
  );
}

// ------------------------------------------------------------- bonus stage --

/**
 * The original "Bonus Stage": one question at a time, a ring per correct
 * answer, explanation after each pick and a "Stage clear" screen.
 * Options are shuffled each run (in the legacy module the answer was never C).
 */
export function BonusStage({
  items = BONUS,
  tool = 'bonus',
  title = 'Bonus stage',
}: {
  items?: BonusQuestion[];
  /** Used for the XP ref (grammar:modals:<tool>) and the record. */
  tool?: string;
  title?: string;
}) {
  const sfx = useSfx();
  const reduce = useReducedMotion();
  const setBest = useModalsArcade((s) => s.setBest);
  const [run, setRun] = useState(0);
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [streak, setStreak] = useState(0);
  const [missed, setMissed] = useState<number[]>([]);
  const qs = useMemo(
    () =>
      items.map((q) => {
        const order = shuffle([0, 1, 2]);
        return { ...q, options: order.map((k) => q.o[k]!), answer: order.indexOf(0) };
      }),
    [items, run],
  );
  const finished = qi >= qs.length;
  const q = qs[Math.min(qi, qs.length - 1)]!;
  const answered = picked !== null;
  const correct = answered && picked === q.answer;

  const pick = useCallback(
    (k: number) => {
      if (picked !== null || finished) return;
      setPicked(k);
      const ok = k === q.answer;
      sfx(ok ? 'ring' : 'wrong');
      if (ok) {
        setScore((s) => s + 1);
        setStreak((s) => s + 1);
      } else {
        setStreak(0);
        setMissed((m) => [...m, qi]);
      }
    },
    [picked, finished, q, qi, sfx],
  );

  const next = useCallback(() => {
    if (picked === null) return;
    if (qi + 1 >= qs.length) {
      const pct = Math.round((score / qs.length) * 100);
      awardModals(tool, title, 5 + score, pct);
      if (tool === 'bonus') setBest('bonus', score);
      sfx('clear');
    } else sfx('select');
    setQi(qi + 1);
    setPicked(null);
  }, [picked, qi, qs.length, score, tool, title, setBest, sfx]);

  const restart = () => {
    sfx('ring');
    setRun((r) => r + 1);
    setQi(0);
    setPicked(null);
    setScore(0);
    setStreak(0);
    setMissed([]);
  };

  useKeys(
    useCallback(
      (key: string) => {
        if (finished) return;
        const n = '123'.indexOf(key) >= 0 ? '123'.indexOf(key) : 'abc'.indexOf(key.toLowerCase());
        if (n >= 0 && key.length === 1) pick(n);
        else if ((key === 'Enter' || key === 'ArrowRight') && picked !== null) next();
      },
      [finished, pick, next, picked],
    ),
  );

  if (finished) {
    const pct = Math.round((score / qs.length) * 100);
    const note =
      pct === 100
        ? 'Partida perfecta. Ya no queda nada que enseñarte sobre los modales.'
        : pct >= 70
          ? 'Sólido. Repasa las zonas de peligro de los modales que fallaste.'
          : 'Vuelve a Reglas y Trampas y juega otra vez.';
    return (
      <Card className="overflow-hidden">
        <div className="brand-gradient px-5 py-6 text-center text-white">
          <motion.div initial={reduce ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-[34px] font-extrabold tracking-tight">
            STAGE CLEAR
          </motion.div>
          <div className="mt-3 flex justify-center gap-3">
            <Ring size={30} />
            <Ring size={30} />
            <Ring size={30} />
          </div>
        </div>
        <div className="flex flex-col items-center p-6 text-center">
          <ProgressRing value={pct / 100} size={112} stroke={10} color={pct >= 70 ? 'var(--green)' : 'var(--orange)'}>
            <span className="text-[26px] font-extrabold tabular-nums">{pct}%</span>
          </ProgressRing>
          <p className="text-title-3 mt-4 tabular-nums">
            {score} / {qs.length} anillos
          </p>
          <p className="text-label-2 mt-1 max-w-md">{note}</p>
          {missed.length > 0 && (
            <div className="mt-5 w-full max-w-xl text-left">
              <h4 className="text-label-2 mb-2 text-[13px] font-semibold uppercase">Para repasar</h4>
              <ul className="space-y-1.5">
                {missed.map((k) => {
                  const m = qs[k]!;
                  return (
                    <li key={k} className="bg-fill-2 flex items-start gap-2 rounded-[12px] px-3 py-2 text-[15px]">
                      <span className="min-w-0 flex-1">{fill(m.text, m.o[0])}</span>
                      <SpeakButton text={fill(m.text, m.o[0])} size={16} className="-my-1" />
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
          <Button className="mt-6" variant="brand" size="lg" onClick={restart}>
            <RotateCcw size={17} /> Jugar otra vez
          </Button>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-title-3 flex items-center gap-2">
          <Target size={20} className="text-ios-red" /> {title}
        </h3>
        <div className="flex items-center gap-3 text-[14px] font-semibold tabular-nums">
          {streak >= 2 && (
            <span className="text-ios-orange inline-flex items-center gap-1">
              <Flame size={16} /> ×{streak}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <Ring size={15} /> {score}
          </span>
          <span className="text-label-2">
            P {qi + 1}/{qs.length}
          </span>
        </div>
      </div>
      <ProgressBar value={(qi + (answered ? 1 : 0)) / qs.length} className="mt-3 mb-5" height={8} color="linear-gradient(90deg, var(--yellow), var(--orange))" />
      <AnimatePresence mode="wait">
        <motion.div
          key={`${run}-${qi}`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, x: -30 }}
          transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
        >
          <div className="text-ios-blue text-[13px] font-bold tracking-wide uppercase">{q.hint}</div>
          <p className="mt-2 text-[22px] leading-snug font-semibold text-pretty sm:text-[26px]">
            <Blanked text={q.text} word={answered ? q.options[q.answer]! : null} state={!answered ? 'idle' : correct ? 'ok' : 'bad'} />
          </p>
          <div className="mt-5 grid gap-2.5 sm:grid-cols-3" role="group" aria-label="Opciones">
            {q.options.map((o, k) => {
              const isAns = k === q.answer;
              const isPick = k === picked;
              return (
                <motion.button
                  key={o}
                  type="button"
                  disabled={answered}
                  onClick={() => pick(k)}
                  animate={answered && isPick && !isAns && !reduce ? { x: [0, -8, 8, -5, 5, 0] } : undefined}
                  transition={{ duration: 0.35 }}
                  className={cn(
                    'flex min-h-[56px] items-center gap-3 rounded-[16px] border-[1.5px] px-4 py-3 text-left text-[17px] font-semibold transition-colors',
                    !answered && 'bg-card shadow-card border-transparent hover:border-[color-mix(in_srgb,var(--blue)_45%,transparent)] active:scale-[0.98]',
                    answered && isAns && 'border-ios-green bg-[color-mix(in_srgb,var(--green)_14%,transparent)]',
                    answered && isPick && !isAns && 'border-ios-red bg-[color-mix(in_srgb,var(--red)_12%,transparent)]',
                    answered && !isAns && !isPick && 'bg-fill-2 border-transparent opacity-50',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
                      answered && isAns ? 'bg-ios-green text-white' : answered && isPick ? 'bg-ios-red text-white' : 'bg-fill text-label-2',
                    )}
                    aria-hidden
                  >
                    {answered && isAns ? <Check size={15} strokeWidth={3} /> : answered && isPick ? <X size={15} strokeWidth={3} /> : String.fromCharCode(65 + k)}
                  </span>
                  <span className="min-w-0 flex-1">{o}</span>
                  {answered && isAns && <span className="sr-only">(respuesta correcta)</span>}
                  {answered && isPick && !isAns && <span className="sr-only">(tu respuesta, incorrecta)</span>}
                </motion.button>
              );
            })}
          </div>
          {answered && (
            <motion.div
              role="status"
              aria-live="polite"
              initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mt-5 rounded-[16px] p-4"
              style={{ background: `color-mix(in srgb, ${correct ? 'var(--green)' : 'var(--orange)'} 12%, transparent)` }}
            >
              <div className="mb-1 flex items-center gap-2 text-[14px] font-bold tracking-wide uppercase" style={{ color: correct ? 'var(--green)' : 'var(--orange)' }}>
                {correct ? (
                  <>
                    <Ring size={14} /> ¡Anillo conseguido!
                  </>
                ) : (
                  'Casi… sigue intentándolo'
                )}
              </div>
              <p className="text-[15px] leading-relaxed">{q.why}</p>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <span className="text-label-2 flex min-w-0 flex-1 items-center gap-1 text-[14px] italic">
                  {fill(q.text, q.options[q.answer]!)}
                  <SpeakButton text={fill(q.text, q.options[q.answer]!)} size={16} />
                </span>
                <Button onClick={next} autoFocus>
                  {qi === qs.length - 1 ? 'Terminar' : 'Siguiente'}
                </Button>
              </div>
            </motion.div>
          )}
          {!answered && <p className="text-label-3 mt-4 hidden text-[12px] sm:block">Atajos: 1 · 2 · 3 para responder, Enter para seguir.</p>}
        </motion.div>
      </AnimatePresence>
    </Card>
  );
}

// ------------------------------------------------------------ trap spotter --

/** Correct or wrong? Spot the classic modal mistakes before you run out of lives. */
export function TrapSpotter({ rounds = 12, lives: maxLives = 3 }: { rounds?: number; lives?: number }) {
  const sfx = useSfx();
  const reduce = useReducedMotion();
  const best = useModalsArcade((s) => s.best.traps ?? 0);
  const setBest = useModalsArcade((s) => s.setBest);
  const [run, setRun] = useState(0);
  const pool = useMemo(() => shuffle(TRAPS).slice(0, rounds), [rounds, run]);
  const [i, setI] = useState(0);
  const [lives, setLives] = useState(maxLives);
  const [points, setPoints] = useState(0);
  const [right, setRight] = useState(0);
  const [streak, setStreak] = useState(0);
  const [picked, setPicked] = useState<boolean | null>(null);
  const [over, setOver] = useState(false);
  const item = pool[i];
  const combo = 1 + Math.floor(streak / 3);

  const answer = useCallback(
    (saysOk: boolean) => {
      if (picked !== null || over || !item) return;
      setPicked(saysOk);
      if (saysOk === item.ok) {
        sfx('right');
        setPoints((p) => p + 10 * combo);
        setRight((r) => r + 1);
        setStreak((s) => s + 1);
      } else {
        sfx('wrong');
        setStreak(0);
        setLives((l) => l - 1);
      }
    },
    [picked, over, item, combo, sfx],
  );

  const next = useCallback(() => {
    if (picked === null) return;
    if (lives <= 0 || i + 1 >= pool.length) {
      setOver(true);
      setBest('traps', points);
      awardModals('traps', 'cazador de trampas', 5 + right, Math.round((right / pool.length) * 100));
      sfx(lives > 0 ? 'clear' : 'wrong');
      return;
    }
    setI(i + 1);
    setPicked(null);
  }, [picked, lives, i, pool.length, points, right, setBest, sfx]);

  const restart = () => {
    setRun((r) => r + 1);
    setI(0);
    setLives(maxLives);
    setPoints(0);
    setRight(0);
    setStreak(0);
    setPicked(null);
    setOver(false);
  };

  useKeys(
    useCallback(
      (key: string) => {
        if (over) return;
        if (key === '1' || key.toLowerCase() === 'c') answer(true);
        else if (key === '2' || key.toLowerCase() === 'i') answer(false);
        else if ((key === 'Enter' || key === 'ArrowRight') && picked !== null) next();
      },
      [over, answer, next, picked],
    ),
  );

  const hearts = (
    <span className="inline-flex items-center gap-0.5" aria-label={`${lives} vidas`}>
      {Array.from({ length: maxLives }).map((_, k) =>
        k < lives ? <Heart key={k} size={18} className="text-ios-red" fill="currentColor" /> : <HeartCrack key={k} size={18} className="text-label-3" />,
      )}
    </span>
  );

  if (over)
    return (
      <Card className="flex flex-col items-center p-6 text-center">
        <div className="text-[30px] font-extrabold tracking-tight">{lives > 0 ? '¡Trampas superadas!' : 'GAME OVER'}</div>
        <div className="mt-2">{hearts}</div>
        <p className="text-title-3 mt-4 tabular-nums">{points} puntos</p>
        <p className="text-label-2 mt-1">
          {right} aciertos de {i + 1} frases · récord {Math.max(best, points)}
        </p>
        <Button className="mt-5" variant="brand" size="lg" onClick={restart}>
          <RotateCcw size={17} /> Otra partida
        </Button>
      </Card>
    );
  if (!item) return null;

  const wasRight = picked !== null && picked === item.ok;
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-title-3">Cazador de trampas</h3>
        <div className="flex items-center gap-3 text-[14px] font-semibold tabular-nums">
          {hearts}
          {combo > 1 && (
            <span className="text-ios-orange inline-flex items-center gap-1">
              <Flame size={16} /> ×{combo}
            </span>
          )}
          <span>{points} pts</span>
        </div>
      </div>
      <ProgressBar value={(i + (picked !== null ? 1 : 0)) / pool.length} className="mt-3 mb-5" color="var(--red)" />
      <p className="text-label-2 text-[14px]">
        Frase {i + 1} de {pool.length}: ¿es correcta en inglés estándar?
      </p>
      <AnimatePresence mode="wait">
        <motion.p
          key={`${run}-${i}`}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          className={cn('bg-fill-2 mt-2 rounded-[16px] px-4 py-5 text-center text-[22px] leading-snug font-semibold', picked !== null && !item.ok && 'text-label-2 line-through decoration-[var(--red)]')}
        >
          {item.s}
        </motion.p>
      </AnimatePresence>
      <div className="mt-4 grid grid-cols-2 gap-2.5">
        {[true, false].map((v) => {
          const isTruth = v === item.ok;
          const isPick = picked === v;
          return (
            <button
              key={String(v)}
              type="button"
              disabled={picked !== null}
              onClick={() => answer(v)}
              className={cn(
                'flex min-h-[52px] items-center justify-center gap-2 rounded-[14px] text-[16px] font-semibold transition-colors',
                picked === null && (v ? 'bg-[color-mix(in_srgb,var(--green)_14%,transparent)] text-ios-green hover:bg-[color-mix(in_srgb,var(--green)_22%,transparent)]' : 'bg-[color-mix(in_srgb,var(--red)_12%,transparent)] text-ios-red hover:bg-[color-mix(in_srgb,var(--red)_20%,transparent)]'),
                picked !== null && isTruth && 'bg-ios-green text-white',
                picked !== null && isPick && !isTruth && 'bg-ios-red text-white',
                picked !== null && !isPick && !isTruth && 'bg-fill-2 opacity-50',
              )}
            >
              {v ? <Check size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}
              {v ? 'Correcta' : 'Incorrecta'}
            </button>
          );
        })}
      </div>
      {picked !== null && (
        <motion.div role="status" aria-live="polite" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mt-4">
          <div className="rounded-[14px] p-4 text-[15px]" style={{ background: `color-mix(in srgb, ${wasRight ? 'var(--green)' : 'var(--orange)'} 12%, transparent)` }}>
            <b>{wasRight ? '¡Bien visto! ' : lives > 0 ? 'Pierdes una vida. ' : 'Sin vidas. '}</b>
            {item.ok ? 'La frase es correcta. ' : 'La frase tiene un error. '}
            {item.why}
            {item.fix && (
              <span className="mt-2 flex items-center gap-1 font-semibold">
                <Check size={15} className="text-ios-green shrink-0" /> {item.fix}
                <SpeakButton text={item.fix} size={16} />
              </span>
            )}
          </div>
          <Button className="mt-3 w-full" size="lg" onClick={next} autoFocus>
            {lives <= 0 || i + 1 >= pool.length ? 'Ver resultado' : 'Siguiente'}
          </Button>
        </motion.div>
      )}
      {picked === null && <p className="text-label-3 mt-3 hidden text-[12px] sm:block">Atajos: 1 / C = correcta · 2 / I = incorrecta · Enter = seguir.</p>}
    </Card>
  );
}

// ------------------------------------------------------------ function quiz --

/** "What does the modal express here?" — built on the shared Quiz (shuffled). */
export function FunctionQuiz() {
  const sfx = useSfx();
  const items: QuizItem[] = useMemo(
    () =>
      FUNCTION_QUIZ.map((f) => ({
        context: f.s,
        q: '¿Qué expresa el modal en esta frase?',
        options: [f.answer, ...f.distractors].map((id) => FUNCTION_BY_ID[id].es),
        answer: 0,
        explain: f.why,
      })),
    [],
  );
  return (
    <Card className="p-5 sm:p-6">
      <h3 className="text-title-3 mb-4 flex items-center gap-2">
        <Trophy size={20} className="text-ios-orange" /> ¿Qué expresa?
      </h3>
      <Quiz
        items={items}
        onFinish={(score) => {
          sfx('clear');
          awardModals('functions', 'funciones de los modales', 5 + Math.round(score / 10), score);
        }}
      />
    </Card>
  );
}
