/**
 * Telling the time: an analogue clock you can drag (pointer, touch, keyboard),
 * the "Spin the clock" explorer, the time quiz and a rules card.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Clock3, Dices, Minus, Plus, RotateCcw, Timer } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Toggle } from '@/components/ui/Misc';
import { ProgressBar } from '@/components/ui/Progress';
import { Callout, DataTable } from '@/components/learning/Callout';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { cn } from '@/lib/cn';
import {
  digital12,
  digital24,
  digitalAmPm,
  enDigital,
  enTime,
  enWithDayPart,
  esTime,
  meridiem,
  mod,
  timeAlternatives,
} from './timeWords';
import { Feedback, ListenButtons, OptionButton, RoundSummary, ToolHeader, awardPractice, optState, pick, shuffle, useSay, useShowEs } from './shared';
import { useTimeFamily } from './store';

// ------------------------------------------------------------- clock face --

type Hand = 'hour' | 'min';
const C = 100; // centre of the 200×200 viewBox

/**
 * Analogue clock. `abs` is an unwrapped minute counter (it may grow past 1440)
 * so the hands always turn the short way — or forwards when spinning.
 * Dragging the minute hand past 12 moves the hour too, like a real clock.
 */
export function ClockFace({
  abs,
  onChange,
  step = 5,
  animate = false,
  halves = false,
  className,
  label = 'Reloj',
}: {
  abs: number;
  /** Omit for a read-only clock. */
  onChange?: (abs: number) => void;
  step?: number;
  animate?: boolean;
  halves?: boolean;
  className?: string;
  label?: string;
}) {
  const reduce = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);
  const absRef = useRef(abs);
  absRef.current = abs;
  const drag = useRef<Hand | null>(null);
  const [focus, setFocus] = useState<Hand | null>(null);
  const t = mod(abs, 1440);
  const h = Math.floor(t / 60);
  const m = t % 60;
  const interactive = !!onChange;

  const angleOf = (e: PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    const a = (Math.atan2(e.clientX - (r.left + r.width / 2), -(e.clientY - (r.top + r.height / 2))) * 180) / Math.PI;
    return mod(a, 360);
  };

  const apply = (hand: Hand, a: number) => {
    if (!onChange) return;
    const cur = absRef.current;
    const ct = mod(cur, 1440);
    const cm = ct % 60;
    let next = cur;
    if (hand === 'min') {
      const target = mod(Math.round(a / (6 * step)) * step, 60);
      next = cur + (mod(target - cm + 30, 60) - 30);
    } else {
      // the hour hand sits between numbers (m × 0.5°), so remove that offset first
      const idx = mod(Math.round((a - cm * 0.5) / 30), 12);
      const cur12 = Math.floor(ct / 60) % 12;
      next = cur + (mod(idx - cur12 + 6, 12) - 6) * 60;
    }
    if (next !== cur) {
      absRef.current = next;
      onChange(next);
    }
  };

  const onDown = (e: PointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const a = angleOf(e);
    const target = (e.target as Element).closest('[data-hand]')?.getAttribute('data-hand') as Hand | null;
    let hand: Hand = target ?? 'min';
    if (!target) {
      const dist = (x: number) => Math.abs(mod(a - x + 180, 360) - 180);
      hand = dist((t % 720) * 0.5) + 8 < dist(m * 6) ? 'hour' : 'min';
    }
    drag.current = hand;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.preventDefault();
    apply(hand, a);
  };
  const onMove = (e: PointerEvent<SVGSVGElement>) => {
    if (drag.current) apply(drag.current, angleOf(e));
  };
  const onUp = () => {
    drag.current = null;
  };

  const onKey = (hand: Hand) => (e: KeyboardEvent) => {
    if (!onChange) return;
    const unit = hand === 'min' ? step : 60;
    const big = hand === 'min' ? 15 : 180;
    const map: Record<string, number> = { ArrowUp: unit, ArrowRight: unit, ArrowDown: -unit, ArrowLeft: -unit, PageUp: big, PageDown: -big };
    if (e.key in map) {
      e.preventDefault();
      onChange(abs + map[e.key]!);
    } else if (e.key === 'Home' && hand === 'min') {
      e.preventDefault();
      onChange(abs - m);
    }
  };

  const transition = animate && !reduce ? 'transform 1.1s cubic-bezier(.16,.84,.24,1)' : 'none';
  const handStyle = (deg: number) => ({ transform: `rotate(${deg}deg)`, transformOrigin: `${C}px ${C}px`, transition });
  const valueText = `${digital12(h, m)} — ${enTime(h, m)}`;

  return (
    <svg
      ref={svgRef}
      viewBox="0 0 200 200"
      role="group"
      aria-label={interactive ? `${label}: ${valueText}` : `${label}. ${valueText}`}
      className={cn('block aspect-square w-full touch-none select-none', interactive && 'cursor-grab active:cursor-grabbing', className)}
      onPointerDown={onDown}
      onPointerMove={onMove}
      onPointerUp={onUp}
      onPointerCancel={onUp}
      onLostPointerCapture={onUp}
    >
      <defs>
        <radialGradient id="tf-face" cx="35%" cy="28%" r="80%">
          <stop offset="0%" style={{ stopColor: 'var(--card)' }} />
          <stop offset="100%" style={{ stopColor: 'color-mix(in srgb, var(--card) 90%, var(--label))' }} />
        </radialGradient>
      </defs>
      <circle cx={C} cy={C} r={97} fill="url(#tf-face)" stroke="var(--label)" strokeOpacity={0.85} strokeWidth={3} />
      {halves && (
        <g aria-hidden>
          <path d={`M${C} ${C} L${C} 9 A91 91 0 0 1 ${C} 191 Z`} fill="var(--blue)" fillOpacity={0.09} />
          <path d={`M${C} ${C} L${C} 191 A91 91 0 0 1 ${C} 9 Z`} fill="var(--orange)" fillOpacity={0.1} />
          <text x={128} y={150} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--blue)" letterSpacing={1}>
            PAST
          </text>
          <text x={72} y={150} textAnchor="middle" fontSize={9} fontWeight={700} fill="var(--orange)" letterSpacing={1}>
            TO
          </text>
        </g>
      )}
      <g aria-hidden>
        {Array.from({ length: 60 }, (_, i) => {
          const major = i % 5 === 0;
          const a = (i * 6 * Math.PI) / 180;
          const r1 = major ? 80 : 85;
          return (
            <line
              key={i}
              x1={C + Math.sin(a) * r1}
              y1={C - Math.cos(a) * r1}
              x2={C + Math.sin(a) * 90}
              y2={C - Math.cos(a) * 90}
              stroke="var(--label)"
              strokeOpacity={major ? 0.9 : 0.35}
              strokeWidth={major ? 2.4 : 1.1}
              strokeLinecap="round"
            />
          );
        })}
        {Array.from({ length: 12 }, (_, i) => {
          const n = i + 1;
          const a = (n * 30 * Math.PI) / 180;
          return (
            <text key={n} x={C + Math.sin(a) * 67} y={C - Math.cos(a) * 67} textAnchor="middle" dominantBaseline="central" fontSize={16} fontWeight={600} fill="var(--label)">
              {n}
            </text>
          );
        })}
      </g>
      {/* hour hand */}
      <g
        data-hand="hour"
        style={handStyle(abs * 0.5)}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'slider' : undefined}
        aria-label={interactive ? 'Aguja de las horas (flechas: ±1 hora)' : undefined}
        aria-valuemin={interactive ? 1 : undefined}
        aria-valuemax={interactive ? 12 : undefined}
        aria-valuenow={interactive ? ((h + 11) % 12) + 1 : undefined}
        aria-valuetext={interactive ? valueText : undefined}
        onKeyDown={onKey('hour')}
        onFocus={() => setFocus('hour')}
        onBlur={() => setFocus(null)}
        className="outline-none"
      >
        {interactive && <line x1={C} y1={C} x2={C} y2={C - 52} stroke="transparent" strokeWidth={22} strokeLinecap="round" />}
        {focus === 'hour' && <circle cx={C} cy={C - 48} r={9} fill="none" stroke="var(--blue)" strokeWidth={2.5} />}
        <line x1={C} y1={C + 8} x2={C} y2={C - 48} stroke="var(--label)" strokeWidth={6.5} strokeLinecap="round" />
      </g>
      {/* minute hand */}
      <g
        data-hand="min"
        style={handStyle(abs * 6)}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'slider' : undefined}
        aria-label={interactive ? `Aguja de los minutos (flechas: ±${step} min)` : undefined}
        aria-valuemin={interactive ? 0 : undefined}
        aria-valuemax={interactive ? 59 : undefined}
        aria-valuenow={interactive ? m : undefined}
        aria-valuetext={interactive ? valueText : undefined}
        onKeyDown={onKey('min')}
        onFocus={() => setFocus('min')}
        onBlur={() => setFocus(null)}
        className="outline-none"
      >
        {interactive && <line x1={C} y1={C} x2={C} y2={C - 78} stroke="transparent" strokeWidth={18} strokeLinecap="round" />}
        {focus === 'min' && <circle cx={C} cy={C - 74} r={8} fill="none" stroke="var(--blue)" strokeWidth={2.5} />}
        <line x1={C} y1={C + 12} x2={C} y2={C - 76} stroke="var(--orange)" strokeWidth={3.6} strokeLinecap="round" />
      </g>
      <circle cx={C} cy={C} r={5.5} fill="var(--orange)" stroke="var(--card)" strokeWidth={2} aria-hidden />
    </svg>
  );
}

// ------------------------------------------------------------ clock tool --

function StepPicker() {
  const { minuteStep, setMinuteStep } = useTimeFamily();
  return (
    <Segmented<'5' | '1'>
      size="sm"
      value={String(minuteStep) as '5' | '1'}
      onChange={(v) => setMinuteStep(v === '1' ? 1 : 5)}
      options={[
        { value: '5', label: 'De 5 en 5' },
        { value: '1', label: 'Minuto a minuto' },
      ]}
    />
  );
}

/** "Spin the clock": drag the hands and read the time in English and Spanish. */
export function ClockTool({ initial = 15 * 60, compact = false }: { initial?: number; compact?: boolean }) {
  const step = useTimeFamily((s) => s.minuteStep);
  const [abs, setAbs] = useState(initial);
  const [anim, setAnim] = useState(false);
  const [halves, setHalves] = useState(false);
  const reduce = useReducedMotion();
  const say = useSay();
  const showEs = useShowEs();
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const t = mod(abs, 1440);
  const h = Math.floor(t / 60);
  const m = t % 60;

  const go = (next: number, animate: boolean) => {
    setAnim(animate);
    setAbs(next);
  };
  const spin = () => {
    const target = Math.floor(Math.random() * 24) * 60 + Math.floor(Math.random() * (60 / step)) * step;
    const delta = mod(target - t, 1440) || 1440;
    go(abs + delta, true);
    window.clearTimeout(timer.current);
    const th = Math.floor(target / 60);
    const tm = target % 60;
    timer.current = window.setTimeout(() => say(enTime(th, tm)), reduce ? 50 : 1150);
  };
  const now = () => {
    const d = new Date();
    const target = d.getHours() * 60 + d.getMinutes();
    go(abs + (mod(target - t + 720, 1440) - 720), true);
  };
  const setPeriod = (p: 'a.m.' | 'p.m.') => {
    if (meridiem(h) !== p) go(abs + (p === 'p.m.' ? 720 : -720), false);
  };
  const alts = useMemo(() => timeAlternatives(h, m), [h, m]);

  return (
    <div className={cn('grid grid-cols-1 items-start gap-5', !compact && 'lg:grid-cols-[minmax(0,440px)_minmax(0,1fr)]')}>
      <Card className="flex flex-col items-center gap-4 p-5">
        <div className="flex w-full flex-wrap items-center justify-between gap-2">
          <h3 className="text-headline">Spin the clock · Gira el reloj</h3>
          <StepPicker />
        </div>
        <div className="w-full max-w-[360px]">
          <ClockFace abs={abs} onChange={(n) => go(n, false)} step={step} animate={anim} halves={halves} label="Reloj interactivo" />
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          <Button variant="brand" onClick={spin}>
            <Dices size={17} /> Spin!
          </Button>
          <Button variant="gray" onClick={now}>
            <Clock3 size={16} /> Ahora
          </Button>
        </div>
        <div className="grid w-full grid-cols-2 gap-2 sm:max-w-[360px]">
          <div className="bg-fill-2 flex items-center justify-between rounded-[12px] p-1">
            <button type="button" aria-label="Restar una hora" onClick={() => go(abs - 60, true)} className="hover:bg-fill flex h-9 w-9 items-center justify-center rounded-[9px]">
              <Minus size={16} />
            </button>
            <span className="text-[14px] font-semibold">1 hour</span>
            <button type="button" aria-label="Sumar una hora" onClick={() => go(abs + 60, true)} className="hover:bg-fill flex h-9 w-9 items-center justify-center rounded-[9px]">
              <Plus size={16} />
            </button>
          </div>
          <div className="bg-fill-2 flex items-center justify-between rounded-[12px] p-1">
            <button type="button" aria-label={`Restar ${step} minutos`} onClick={() => go(abs - step, true)} className="hover:bg-fill flex h-9 w-9 items-center justify-center rounded-[9px]">
              <Minus size={16} />
            </button>
            <span className="text-[14px] font-semibold">{step} min</span>
            <button type="button" aria-label={`Sumar ${step} minutos`} onClick={() => go(abs + step, true)} className="hover:bg-fill flex h-9 w-9 items-center justify-center rounded-[9px]">
              <Plus size={16} />
            </button>
          </div>
        </div>
        <div className="flex w-full flex-wrap items-center justify-center gap-x-5 gap-y-3">
          <Segmented<'a.m.' | 'p.m.'>
            size="sm"
            value={meridiem(h)}
            onChange={setPeriod}
            options={[
              { value: 'a.m.', label: 'a.m.' },
              { value: 'p.m.', label: 'p.m.' },
            ]}
          />
          <label className="flex items-center gap-2 text-[14px]">
            <Toggle checked={halves} onChange={setHalves} label="Mostrar past / to" /> past / to
          </label>
        </div>
        <p className="text-label-2 text-center text-[13px]">Arrastra las agujas (la corta marca la hora, la larga los minutos) o usa el teclado: Tab y flechas.</p>
      </Card>

      <div className="space-y-4">
        <div className="flex items-end gap-2">
          <motion.img
            src="/grammar/time-family/penguin.webp"
            alt=""
            width={120}
            height={120}
            animate={reduce ? undefined : { y: [0, -8, 0], rotate: [-1.5, 1.5, -1.5] }}
            transition={{ duration: 4.5, repeat: Infinity, ease: 'easeInOut' }}
            className="hidden w-[96px] shrink-0 sm:block lg:w-[120px]"
          />
          <Card className="min-w-0 flex-1 rounded-bl-[6px] p-5" aria-live="polite">
            <div className="text-[26px] leading-tight font-bold tracking-tight sm:text-[30px]">{enTime(h, m)}</div>
            <div className="text-ink-blue mt-1 text-[18px] font-semibold">{enDigital(h, m)}</div>
            {showEs && <div className="text-label-2 mt-1 text-[17px]">{esTime(h, m)}</div>}
            <div className="mt-3 flex flex-wrap gap-1.5 text-[13px] font-semibold tabular-nums">
              <span className="bg-fill-2 rounded-full px-2.5 py-1">{digitalAmPm(h, m)}</span>
              <span className="bg-fill-2 rounded-full px-2.5 py-1">{digital24(h, m)}</span>
              <span className="bg-fill-2 rounded-full px-2.5 py-1">{enWithDayPart(h, m)}</span>
            </div>
            <ListenButtons className="mt-4" en={`${enTime(h, m)} ${enDigital(h, m)}`} es={esTime(h, m, true)} />
          </Card>
        </div>

        <Card className="p-5">
          <h3 className="text-headline mb-2">Other ways to say it · Otras formas</h3>
          <ul>
            {alts.map((a) => (
              <li key={a.kind} className="flex items-start gap-3 py-2.5 [&:not(:last-child)]:shadow-[inset_0_-0.5px_0_var(--separator)]">
                <span className="text-label-2 w-[92px] shrink-0 pt-0.5 text-[13px] font-semibold">{a.kind}</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-medium">{a.text}</span>
                  {a.note && <span className="text-label-2 block text-[13px]">{a.note}</span>}
                </span>
                <SpeakButton text={a.text} size={16} />
              </li>
            ))}
          </ul>
          {showEs && <p className="text-label-2 mt-2 text-[14px]">Con parte del día: {esTime(h, m, true)}</p>}
          <Callout tone="purple" className="mt-3">
            Ask informally: <b>What time is it?</b> · Politely: <b>Excuse me, do you have the time?</b> · Formally: <b>Could you please tell me the time?</b>
          </Callout>
        </Card>
      </div>
    </div>
  );
}

// ------------------------------------------------------------- time quiz --

type Style = 'pastTo' | 'digital';
const say12 = (style: Style, t: number) => (style === 'pastTo' ? enTime : enDigital)(Math.floor(t / 60), t % 60);

/** Builds a "read the clock" question with plausible distractors. */
export function makeTimeQuestion(step: number, style: Style) {
  const h = Math.floor(Math.random() * 12);
  const m = Math.floor(Math.random() * (60 / step)) * step;
  const t = h * 60 + m;
  const correct = say12(style, t);
  const cands: number[] = [];
  // wrong hour with "to" / "past" (the classic error: 3:40 → "twenty to three")
  cands.push(m > 30 ? t - 60 : t + 60);
  // past ↔ to swapped ("twenty past three" vs "twenty to three")
  if (m && m !== 30) cands.push(m < 30 ? t - 2 * m : t + 2 * (60 - m));
  // hands swapped (minute hand read as the hour)
  if (m % 5 === 0) cands.push((Math.round(m / 5) % 12) * 60 + (h % 12) * 5);
  cands.push(...shuffle([t + 15, t - 15, t + 30, t + 5, t - 5, m > 30 ? t + 60 : t - 60]));
  const wrong: string[] = [];
  for (const c of cands) {
    const s = say12(style, mod(c, 720));
    if (s !== correct && !wrong.includes(s)) wrong.push(s);
    if (wrong.length === 3) break;
  }
  return { t, correct, options: shuffle([correct, ...wrong]) };
}

type QuizMode = 'read' | 'set';
const ROUND = 10;

/** Read the clock (choose the sentence) or set the clock to a sentence. */
export function TimeQuiz({ initialMode = 'read', rounds = ROUND }: { initialMode?: QuizMode; rounds?: number }) {
  const step = useTimeFamily((s) => s.minuteStep);
  const answer = useTimeFamily((s) => s.answer);
  const say = useSay();
  const showEs = useShowEs();
  const [mode, setMode] = useState<QuizMode>(initialMode);
  const [styleSel, setStyleSel] = useState<'mix' | Style>('mix');
  const newQ = () => {
    const style: Style = styleSel === 'mix' ? pick(['pastTo', 'digital'] as const) : styleSel;
    return { ...makeTimeQuestion(step, style), style };
  };
  const [q, setQ] = useState(newQ);
  const [picked, setPicked] = useState<string | null>(null);
  const [setAbsV, setSetAbs] = useState(0);
  const [checked, setChecked] = useState<boolean | null>(null);
  const [i, setI] = useState(0);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);

  const reset = (nextMode = mode) => {
    setMode(nextMode);
    setQ(newQ());
    setPicked(null);
    setChecked(null);
    setSetAbs(0);
    setI(0);
    setRight(0);
    setDone(false);
  };
  // new question set when the step or style changes
  useEffect(() => {
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, styleSel]);

  const record = (ok: boolean) => {
    answer(ok);
    if (ok) setRight((r) => r + 1);
    say(q.correct);
  };
  const choose = (o: string) => {
    if (picked) return;
    setPicked(o);
    record(o === q.correct);
  };
  const check = () => {
    if (checked !== null) return;
    const ok = mod(setAbsV, 720) === q.t;
    setChecked(ok);
    record(ok);
  };
  const answered = mode === 'read' ? picked !== null : checked !== null;
  const ok = mode === 'read' ? picked === q.correct : checked === true;
  const next = () => {
    if (i + 1 >= rounds) {
      const total = rounds;
      const correct = right;
      awardPractice({ tool: 'time-quiz', title: mode === 'read' ? 'Read the clock' : 'Set the clock', skill: 'grammar', correct, total });
      setDone(true);
      return;
    }
    setI(i + 1);
    setQ(newQ());
    setPicked(null);
    setChecked(null);
  };
  const qh = Math.floor(q.t / 60);
  const qm = q.t % 60;

  return (
    <Card className="p-5">
      <ToolHeader
        title="What time is it? · ¿Qué hora es?"
        sub={mode === 'read' ? 'Mira el reloj y elige la frase correcta.' : 'Arrastra las agujas hasta la hora que lees.'}
        right={<Segmented<QuizMode> size="sm" value={mode} onChange={(v) => reset(v)} options={[{ value: 'read', label: 'Lee el reloj' }, { value: 'set', label: 'Pon la hora' }]} />}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Segmented<'mix' | Style>
          size="sm"
          value={styleSel}
          onChange={setStyleSel}
          options={[
            { value: 'mix', label: 'Mezcla' },
            { value: 'pastTo', label: 'past / to' },
            { value: 'digital', label: 'Digital' },
          ]}
        />
        <StepPicker />
      </div>
      {done ? (
        <RoundSummary correct={right} total={rounds} onAgain={() => reset()} />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <ProgressBar value={(i + (answered ? 1 : 0)) / rounds} className="flex-1" />
            <span className="text-label-2 text-[13px] font-medium tabular-nums">
              {i + 1}/{rounds} · ✓ {right}
            </span>
          </div>
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
            <div className="mx-auto w-full max-w-[300px]">
              {mode === 'read' ? (
                <ClockFace abs={q.t} label="¿Qué hora marca?" />
              ) : (
                <ClockFace
                  abs={checked !== null ? setAbsV + (mod(q.t - mod(setAbsV, 720) + 360, 720) - 360) : setAbsV}
                  onChange={checked === null ? setSetAbs : undefined}
                  step={step}
                  animate={checked !== null}
                  label="Pon esta hora"
                />
              )}
            </div>
            <div className="space-y-2.5">
              {mode === 'read' ? (
                q.options.map((o, k) => <OptionButton key={o} label={o} letter={String.fromCharCode(65 + k)} state={optState(picked, o, q.correct)} onClick={() => choose(o)} />)
              ) : (
                <div className="bg-fill-2 rounded-[14px] p-4">
                  <div className="text-label-2 text-[13px] font-semibold uppercase">Set the clock to</div>
                  <div className="mt-1 flex items-center gap-1 text-[22px] leading-snug font-bold">
                    {q.correct}
                    <SpeakButton text={q.correct} />
                  </div>
                  <Button className="mt-3" onClick={check} disabled={checked !== null}>
                    <Timer size={16} /> Comprobar
                  </Button>
                </div>
              )}
              {answered && (
                <Feedback ok={ok}>
                  <b>{ok ? 'Correct! ' : 'Not quite — '}</b>
                  {q.correct} <span className="text-label-2">({digital12(qh, qm)})</span>
                  {showEs && <div className="text-label-2 text-[14px]">{esTime(qh, qm)}</div>}
                  {!ok && mode === 'set' && <div className="text-label-2 text-[14px]">Tu reloj marcaba {digital12(Math.floor(mod(setAbsV, 720) / 60), mod(setAbsV, 60))}.</div>}
                </Feedback>
              )}
              {answered && (
                <Button className="w-full" size="lg" onClick={next}>
                  {i + 1 >= rounds ? 'Ver resultado' : 'Next clock · Siguiente'}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

// ----------------------------------------------------------- rules card --

const KEY_TIMES: [number, number][] = [
  [3, 0],
  [3, 5],
  [3, 15],
  [3, 25],
  [3, 30],
  [3, 35],
  [3, 45],
  [3, 55],
  [3, 7],
  [3, 52],
];

/** How to tell the time: past/to, digital, a.m./p.m., Spanish contrast and typical errors. */
export function TimeRules() {
  const showEs = useShowEs();
  const [demo, setDemo] = useState(3 * 60 + 20);
  const dh = Math.floor(mod(demo, 1440) / 60);
  const dm = mod(demo, 60);
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <Card className="p-5">
        <h3 className="text-headline">Past or to? · ¿past o to?</h3>
        <p className="text-label-2 mt-1 text-[15px]">
          Del minuto 1 al 30 se dice <b className="text-ink-blue">past</b> + la hora actual. Del 31 al 59 se dice <b className="text-ink-orange">to</b> + la hora siguiente.
        </p>
        <div className="mx-auto mt-4 w-full max-w-[260px]">
          <ClockFace abs={demo} onChange={setDemo} halves label="Reloj de ejemplo" />
        </div>
        <p className="mt-3 text-center text-[18px] font-semibold">{enTime(dh, dm)}</p>
        {showEs && <p className="text-label-2 text-center text-[15px]">{esTime(dh, dm)}</p>}
        <Callout tone="blue" className="mt-4" title="Minutes">
          Con 5, 10, 20 y 25 no hace falta decir <i>minutes</i>. Con los demás números sí: <b>seven minutes past three</b>, <b>one minute to four</b>.
        </Callout>
      </Card>
      <div className="space-y-5">
        <DataTable
          title="Key times · Horas clave"
          cols={['Hora', 'past / to', 'Digital']}
          rows={KEY_TIMES.map(([h, m]) => [digital12(h, m), enTime(h, m).replace(/^It’s |\.$/g, ''), enDigital(h, m).replace(/^It’s |\.$/g, '')])}
        />
        <Card className="space-y-3 p-5">
          <h3 className="text-headline">a.m. / p.m.</h3>
          <p className="text-[15px]">
            <b>a.m.</b> = de las 12 de la noche a las 11:59 de la mañana · <b>p.m.</b> = de las 12 del mediodía a las 11:59 de la noche.
          </p>
          <ul className="text-[15px]">
            <li>
              <b>12:00 a.m.</b> = midnight (medianoche) · <b>12:00 p.m.</b> = noon / midday (mediodía)
            </li>
            <li>
              7:30 a.m. = <i>half past seven in the morning</i> · 7:30 p.m. = <i>half past seven in the evening</i>
            </li>
            <li>No se usa a.m./p.m. con o’clock: ✗ <s>seven o’clock p.m.</s> → ✓ seven o’clock in the evening / 7 p.m.</li>
          </ul>
        </Card>
        <Card className="space-y-2 p-5">
          <h3 className="text-headline">English vs. español</h3>
          <DataTable
            cols={['English', 'Español']}
            rows={[
              ['It’s one o’clock.', 'Es la una en punto.'],
              ['It’s a quarter past two.', 'Son las dos y cuarto.'],
              ['It’s half past two.', 'Son las dos y media.'],
              ['It’s a quarter to three.', 'Son las tres menos cuarto.'],
              ['It’s twenty to one.', 'Es la una menos veinte.'],
            ]}
          />
          <Callout tone="orange" title="Errores típicos" className="mt-2">
            ✗ <s>It’s three and a quarter</s> → ✓ It’s a quarter past three · ✗ <s>Are the three</s> → ✓ It’s three o’clock · ✗ <s>It’s half three past</s> → ✓ It’s half past three. Usa siempre <b>It’s</b> (singular), aunque en español digamos “son las”.
          </Callout>
          <p className="text-label-2 text-[14px]">
            Para decir <i>a qué hora</i> usa <b>at</b>: <i>The class starts at seven o’clock.</i>
          </p>
        </Card>
        <Button variant="gray" size="sm" onClick={() => setDemo(3 * 60 + 20)}>
          <RotateCcw size={14} /> Reiniciar ejemplo
        </Button>
      </div>
    </div>
  );
}
