/** Small building blocks shared by every Time & Family tool. */
import type { ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, Flame, RotateCcw, Star, Trophy, Volume2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { ProgressRing } from '@/components/ui/Progress';
import { canSpeak, speak } from '@/lib/speech';
import { useSettings } from '@/store/settings';
import { useProgress } from '@/store/progress';
import type { Skill } from '@/content/types';
import { cn } from '@/lib/cn';
import { SAYING } from './data';
import { useTimeFamily } from './store';

export const REF = 'grammar:time-family';

export function shuffle<T>(a: readonly T[]): T[] {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

export const pick = <T,>(a: readonly T[]): T => a[Math.floor(Math.random() * a.length)]!;

/** English TTS with the learner's accent and rate. */
export function useSay() {
  const { accent, speechRate } = useSettings();
  return (text: string) => speak(text, { accent, rate: speechRate });
}

/** Spanish TTS (lib/speech only picks English voices). */
export function speakEs(text: string, rate = 0.95) {
  if (!canSpeak()) return;
  const synth = window.speechSynthesis;
  synth.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const v = synth.getVoices().find((x) => x.lang.replace('_', '-').toLowerCase().startsWith('es'));
  if (v) u.voice = v;
  u.lang = v?.lang ?? 'es-ES';
  u.rate = rate;
  synth.speak(u);
}

export function useShowEs() {
  return useSettings((s) => s.spanishHints);
}

/** Awards XP for a finished practice round. */
export function awardPractice(o: { tool: string; title: string; skill: Skill; correct: number; total: number }) {
  const score = o.total ? Math.round((o.correct / o.total) * 100) : 0;
  useProgress.getState().award({
    kind: 'topic',
    title: `Time & Family · ${o.title}`,
    skill: o.skill,
    xp: 5 + Math.round((score / 100) * 15),
    score,
    level: 'A1',
    ref: `${REF}:${o.tool}`,
  });
}

/** EN / ES listen buttons. */
export function ListenButtons({ en, es, className }: { en: string; es?: string; className?: string }) {
  const say = useSay();
  const rate = useSettings((s) => s.speechRate);
  const showEs = useShowEs();
  if (!canSpeak()) return null;
  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      <Button size="sm" variant="tinted" onClick={() => say(en)}>
        <Volume2 size={14} /> Listen
      </Button>
      {es && showEs && (
        <Button size="sm" variant="gray" onClick={() => speakEs(es, rate)}>
          <Volume2 size={14} /> Escuchar
        </Button>
      )}
    </div>
  );
}

export type OptState = 'idle' | 'right' | 'wrong' | 'dim';

export function optState(picked: string | null, option: string, answer: string): OptState {
  if (picked === null) return 'idle';
  if (option === answer) return 'right';
  if (option === picked) return 'wrong';
  return 'dim';
}

/** Answer button in the style of the platform Quiz. */
export function OptionButton({
  label,
  sub,
  state,
  letter,
  onClick,
}: {
  label: ReactNode;
  sub?: ReactNode;
  state: OptState;
  letter?: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={state !== 'idle'}
      className={cn(
        'flex w-full items-center gap-3 rounded-[14px] border-[1.5px] px-4 py-3 text-left text-[16px] transition-all',
        state === 'idle' && 'bg-card border-transparent shadow-card hover:border-[color-mix(in_srgb,var(--blue)_40%,transparent)] active:scale-[0.99]',
        state === 'right' && 'border-ios-green bg-[color-mix(in_srgb,var(--green)_12%,transparent)]',
        state === 'wrong' && 'border-ios-red bg-[color-mix(in_srgb,var(--red)_10%,transparent)]',
        state === 'dim' && 'bg-card border-transparent opacity-50',
      )}
    >
      <span
        className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold',
          state === 'right' ? 'bg-ios-green text-white' : state === 'wrong' ? 'bg-ios-red text-white' : 'bg-fill text-label-2',
        )}
      >
        {state === 'right' ? <Check size={16} strokeWidth={3} /> : state === 'wrong' ? <X size={16} strokeWidth={3} /> : letter}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-medium">{label}</span>
        {sub && <span className="text-label-2 block text-[13px]">{sub}</span>}
      </span>
    </button>
  );
}

/** Coloured feedback panel shown after answering. */
export function Feedback({ ok, children, className }: { ok: boolean; children: ReactNode; className?: string }) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      role="status"
      className={cn(
        'rounded-[14px] p-4 text-[15px] leading-relaxed',
        ok ? 'bg-[color-mix(in_srgb,var(--green)_11%,transparent)]' : 'bg-[color-mix(in_srgb,var(--orange)_13%,transparent)]',
        className,
      )}
    >
      {children}
    </motion.div>
  );
}

/** End-of-round summary. */
export function RoundSummary({ correct, total, onAgain, label = 'Otra ronda' }: { correct: number; total: number; onAgain: () => void; label?: string }) {
  const score = total ? Math.round((correct / total) * 100) : 0;
  const passed = score >= 70;
  return (
    <div className="flex flex-col items-center py-6 text-center">
      <ProgressRing value={score / 100} size={104} stroke={9} color={passed ? 'var(--green)' : 'var(--orange)'}>
        <span className="text-[24px] font-extrabold tabular-nums">{score}%</span>
      </ProgressRing>
      <h4 className="text-title-3 mt-4 flex items-center gap-2">
        {passed && <Trophy size={20} className="text-ios-yellow" />}
        {passed ? '¡Muy bien!' : 'Buen intento'}
      </h4>
      <p className="text-label-2 mt-1 text-[15px]">
        {correct} de {total} correctas · XP añadida a tu progreso
      </p>
      <Button variant="gray" className="mt-5" onClick={onAgain}>
        <RotateCcw size={15} /> {label}
      </Button>
    </div>
  );
}

/** Points and streak of the playbook (shared by every tool). */
export function ScorePills({ className }: { className?: string }) {
  const { score, streak, bestStreak } = useTimeFamily();
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <span className="bg-card shadow-card inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold tabular-nums" title="Puntos">
        <Star size={15} className="text-ios-yellow" fill="currentColor" /> {score}
        <span className="text-label-2 font-normal">pts</span>
      </span>
      <span className="bg-card shadow-card inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold tabular-nums" title={`Racha · mejor ${bestStreak}`}>
        <Flame size={15} className="text-ink-orange" /> {streak > 0 ? `×${streak}` : '—'}
      </span>
    </div>
  );
}

/** Header row of a tool card: title, optional counter. */
export function ToolHeader({ title, sub, right }: { title: ReactNode; sub?: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
      <div className="min-w-0">
        <h3 className="text-headline">{title}</h3>
        {sub && <p className="text-label-2 text-[14px]">{sub}</p>}
      </div>
      {right}
    </div>
  );
}

/** "Hoy por ti, mañana por mí" — saying of the class with its English equivalent. */
export function SayingCard() {
  const showEs = useShowEs();
  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-6" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--orange) 14%, var(--card)), var(--card) 70%)' }}>
        <div className="text-label-2 text-[13px] font-semibold tracking-wide uppercase">Saying of the class · El dicho de la clase</div>
        <p className="mt-1 text-[26px] leading-tight font-bold tracking-tight sm:text-[30px]">“{SAYING.es}”</p>
        <details className="group mt-4">
          <summary className="text-ink-blue inline-flex cursor-pointer list-none items-center gap-1 text-[16px] font-semibold [&::-webkit-details-marker]:hidden">
            <span className="group-open:hidden">What does it mean in English?</span>
            <span className="hidden group-open:inline">Hide the English · Ocultar</span>
          </summary>
          <div className="bg-fill-2 mt-3 rounded-[14px] p-4">
            <p className="text-[21px] leading-snug font-semibold">“{SAYING.en}”</p>
            <p className="text-label-2 mt-1 text-[15px]">
              Also: <i>{SAYING.enAlt}</i>
            </p>
            <p className="mt-2 text-[15px]">{SAYING.meaning}</p>
            {showEs && <p className="text-label-2 text-[14px]">{SAYING.meaningEs}</p>}
            <ListenButtons className="mt-3" en={`${SAYING.en} ${SAYING.enAlt}`} es={SAYING.es} />
          </div>
        </details>
      </div>
    </Card>
  );
}
