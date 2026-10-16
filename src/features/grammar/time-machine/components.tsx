/**
 * Time Machine — dates, months, years, days and the four past tenses, rebuilt
 * natively from the legacy single-file module. Every section is a
 * self-contained component so lessons can embed exactly the piece they need
 * (see TIME_MACHINE_TOOLS in tools.tsx); TimeMachinePage puts them together.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowRight,
  BookOpen,
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  Eye,
  EyeOff,
  Film,
  History,
  Lightbulb,
  NotebookPen,
  Pause,
  Play,
  Puzzle,
  Quote,
  RotateCcw,
  Search,
  Shuffle,
  Sparkles,
  Trophy,
  Wand2,
  X,
} from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { ProgressBar } from '@/components/ui/Progress';
import { IconTile } from '@/components/ui/IconTile';
import { Chip } from '@/components/ui/Misc';
import { Quiz, type QuizItem } from '@/components/learning/Quiz';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { Callout } from '@/components/learning/Callout';
import { speak } from '@/lib/speech';
import { useSettings } from '@/store/settings';
import { useProgress } from '@/store/progress';
import { cn } from '@/lib/cn';
import { ALL, DATE_ROUNDS, IRREG, MONTHS, SAYING, TIME_WORDS, WEEKDAYS, WEEKDAYS_ES, type Stage, type StageId, type StageTable, type VideoItem } from './data';
import {
  buildTimeline,
  continuousOf,
  datePieces,
  daysInMonth,
  formatDate,
  ingInfo,
  ordinalSuffix,
  ordinalWords,
  pastInfo,
  perfectOf,
  ppOf,
  readYear,
  simpleOf,
  splitPhrase,
  subjectMid,
  wasWereInfo,
  weekdayIndex,
  wrongOrdinal,
  type Variety,
} from './engine';
import { useTimeMachine } from './useTimeMachine';
import { ink, deep } from '@/lib/color';

// ------------------------------------------------------------------ shared --

export const stageById = (id: StageId) => ALL.find((s) => s.id === id) ?? ALL[0]!;

function useEs() {
  return useSettings((s) => s.spanishHints);
}
function useVariety(): Variety {
  return useSettings((s) => (s.accent === 'en-GB' ? 'UK' : 'US'));
}
function useSpeak() {
  const { accent, speechRate } = useSettings();
  return (text: string) => speak(text, { accent, rate: speechRate });
}

/** XP for a finished practice, tagged so study plans can tick it off. */
function awardTM(tool: string, title: string, xp: number, score?: number) {
  useProgress.getState().award({ kind: 'topic', title: `Time Machine · ${title}`, skill: 'grammar', xp, score, ref: `grammar:time-machine:${tool}` });
}

function shuffle<T>(a: T[]) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

const mix = (color: string, pct: number) => `color-mix(in srgb, ${color} ${pct}%, transparent)`;

/** Spanish hint line (shown only when "Pistas ES" is on). */
function Es({ children, className }: { children: React.ReactNode; className?: string }) {
  const on = useEs();
  if (!on) return null;
  return (
    <p lang="es" className={cn('text-label-2 text-[13px] leading-snug', className)}>
      <span className="text-ink-teal mr-1 text-[11px] font-bold">ES</span>
      {children}
    </p>
  );
}

function SectionHead({ icon: Icon, color, title, sub }: { icon: typeof Clock; color: string; title: string; sub?: string }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <IconTile icon={Icon} color={color} size={32} />
      <div className="min-w-0">
        <h3 className="text-title-3 text-balance">{title}</h3>
        {sub && <p className="text-label-2 text-[14px]">{sub}</p>}
      </div>
    </div>
  );
}

function Formula({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[14px] px-4 py-3 font-mono text-[13px] leading-relaxed break-words whitespace-pre-wrap sm:text-[14px]"
      style={{ background: mix('var(--orange)', 11), color: 'var(--label)' }}
    >
      {children}
    </div>
  );
}

export function TableCard({ table }: { table: StageTable }) {
  return (
    <Card className="p-4 sm:p-5">
      <h4 className="text-headline">{table.title}</h4>
      <p className="text-label-2 mt-0.5 mb-3 text-[14px]">{table.note}</p>
      <div className="overflow-x-auto rounded-[12px] shadow-[inset_0_0_0_0.5px_var(--separator)]">
        <table className="w-full min-w-[460px] text-left text-[14px]">
          <thead>
            <tr className="bg-fill-2">
              {table.cols.map((c, i) => (
                <th key={i} className="text-label-2 px-3 py-2 text-[11px] font-semibold tracking-wide whitespace-nowrap uppercase">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {table.rows.map((r, i) => (
              <tr key={i} className="shadow-[inset_0_0.5px_0_var(--separator)]">
                {r.map((cell, j) => (
                  <td key={j} className={cn('px-3 py-2.5 align-top', j === 0 && 'font-semibold')}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

// ------------------------------------------------------- generic lesson --

export function StageIntro({ stage }: { stage: Stage }) {
  return (
    <Card className="overflow-hidden">
      <div className="p-5 sm:p-6" style={{ background: `linear-gradient(135deg, ${mix('var(--indigo)', 12)}, transparent 70%)` }}>
        <div className="mb-2 flex items-center gap-2">
          <span className="bg-ios-indigo inline-flex h-7 min-w-7 items-center justify-center rounded-full px-2 text-[13px] font-bold text-white tabular-nums">{stage.num}</span>
          <span className="text-label-2 text-[13px] font-medium">{stage.es}</span>
        </div>
        <h2 className="text-title-1 text-balance">{stage.title}</h2>
        <p className="text-callout text-label-2 mt-2 max-w-3xl text-pretty">{stage.intro}</p>
        <Es className="mt-2 max-w-3xl">{stage.introEs}</Es>
        <div className="mt-4">
          <Formula>{stage.formula}</Formula>
        </div>
      </div>
    </Card>
  );
}

export function StepsCard({ stage }: { stage: Stage }) {
  return (
    <Card className="p-4 sm:p-5">
      <SectionHead icon={ArrowRight} color="var(--blue)" title="Paso a paso" />
      <ol className={cn('grid gap-3 sm:grid-cols-2', stage.steps.length === 4 ? 'lg:grid-cols-4' : 'lg:grid-cols-3')}>
        {stage.steps.map((s) => (
          <li key={s.n} className="bg-fill-2 flex flex-col gap-1 rounded-[14px] p-4">
            <span className="text-ink-blue text-[12px] font-bold tracking-wide">PASO {s.n}</span>
            <span className="text-headline">{s.h}</span>
            <span className="text-[14px] leading-snug">{s.body}</span>
            <Es>{s.es}</Es>
          </li>
        ))}
      </ol>
    </Card>
  );
}

export function RulesAndExamples({ stage }: { stage: Stage }) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="p-4 sm:p-5">
        <SectionHead icon={Lightbulb} color="var(--yellow)" title="La regla" />
        <ul className="space-y-3">
          {stage.points.map((p, i) => (
            <li key={i} className="flex gap-3">
              <span className="bg-ios-orange mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
              <div className="min-w-0">
                <p className="text-[15px] leading-snug">{p.en}</p>
                <Es className="mt-0.5">{p.es}</Es>
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card className="p-4 sm:p-5">
        <SectionHead icon={BookOpen} color="var(--green)" title="Ejemplos" />
        <ul className="space-y-2">
          {stage.examples.map((ex, i) => (
            <li key={i} className="bg-fill-2 flex items-start gap-2 rounded-[12px] p-3">
              <SpeakButton text={ex.en.replace(/→/g, ',')} size={16} className="-mt-0.5 -ml-1" />
              <div className="min-w-0">
                <p className="text-[15px] leading-snug">{ex.en}</p>
                <Es className="mt-0.5">{ex.es}</Es>
              </div>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}

export function MistakesCard({ stage }: { stage: Stage }) {
  return (
    <Card className="p-4 sm:p-5" style={{ background: `linear-gradient(160deg, ${mix('var(--red)', 7)}, var(--card) 60%)` }}>
      <SectionHead icon={AlertTriangle} color="var(--red)" title="Errores comunes" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {stage.mistakes.map((m, i) => (
          <div key={i} className="bg-card rounded-[14px] p-4 shadow-[inset_0_0_0_0.5px_var(--separator)]">
            <p className="text-ink-red flex items-start gap-1.5 text-[15px]">
              <X size={16} strokeWidth={3} className="mt-0.5 shrink-0" />
              <s className="decoration-[1.5px]">{m.wrong}</s>
            </p>
            <p className="text-ink-green mt-1 flex items-start gap-1.5 text-[15px] font-semibold">
              <Check size={16} strokeWidth={3} className="mt-0.5 shrink-0" />
              {m.right}
            </p>
            <p className="text-label-2 mt-1.5 text-[13px] leading-snug">{m.why}</p>
            <Es className="mt-1">{m.es}</Es>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** The special widget(s) each stage shows between the steps and the tables. */
function StageWidgets({ id }: { id: StageId }) {
  switch (id) {
    case 'months':
      return <MonthsGallery />;
    case 'dates':
      return (
        <>
          <OrdinalsTool />
          <DateFormatsTool />
        </>
      );
    case 'years':
      return <YearReader />;
    case 'days':
      return <DaysOfWeek />;
    case 'past':
      return (
        <>
          <PastSimpleEdRules />
          <IrregularVerbsTable />
          <TimeWords />
        </>
      );
    case 'tobe':
      return <WasWereTool />;
    case 'cont':
      return <IngSpellingTool />;
    case 'perfect':
    case 'timeline':
      return <TenseTimelineChart />;
    case 'video':
      return <VideoActivity />;
  }
}

/** The whole "Learn" side of a stage: intro, steps, widgets, tables, rules, examples and mistakes. */
export function StageLesson({ id, widgets = true }: { id: StageId; widgets?: boolean }) {
  const stage = stageById(id);
  return (
    <div className="space-y-4">
      <StageIntro stage={stage} />
      <StepsCard stage={stage} />
      {widgets && <StageWidgets id={id} />}
      {stage.tables.map((t) => (
        <TableCard key={t.title} table={t} />
      ))}
      <RulesAndExamples stage={stage} />
      <MistakesCard stage={stage} />
    </div>
  );
}

/** A stage's quiz, shuffled, with XP on completion. */
export function StageQuiz({ id, onFinish }: { id: StageId; onFinish?: (score: number) => void }) {
  const stage = stageById(id);
  const es = useEs();
  const clear = useTimeMachine((s) => s.clear);
  const items: QuizItem[] = useMemo(
    () => stage.quiz.map((q) => ({ q: q.prompt, options: q.options, answer: q.answer, explain: es ? `${q.why} (${q.whyEs})` : q.why })),
    [stage, es],
  );
  if (!items.length) return null;
  return (
    <Card className="p-4 sm:p-6">
      <Quiz
        key={id}
        items={items}
        title={`${stage.title} · quiz`}
        onFinish={(score) => {
          const correct = Math.round((score / 100) * items.length);
          clear(id, correct, items.length);
          awardTM(id, stage.title, 5 + Math.round(score / 10), score);
          onFinish?.(score);
        }}
      />
    </Card>
  );
}

// ------------------------------------------------------------------ months --

let monthAudio: HTMLAudioElement | null = null;

/** The twelve months with picture, recorded audio, pronunciation and Colombian celebration. */
export function MonthsGallery() {
  const [playing, setPlaying] = useState<string | null>(null);
  const say = useSpeak();
  useEffect(() => () => monthAudio?.pause(), []);

  const play = (key: string, src: string, name: string) => {
    if (monthAudio && playing === key) {
      monthAudio.pause();
      setPlaying(null);
      return;
    }
    monthAudio?.pause();
    const a = new Audio(src);
    monthAudio = a;
    setPlaying(key);
    a.onended = () => setPlaying((p) => (p === key ? null : p));
    a.play().catch(() => {
      setPlaying(null);
      say(name);
    });
  };

  return (
    <Card className="p-4 sm:p-5">
      <SectionHead icon={CalendarDays} color="var(--pink)" title="The twelve months" sub="Toca ▶ para escuchar la grabación de clase" />
      <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
        {MONTHS.map((m, i) => (
          <div key={m.key} className="bg-fill-2 flex min-w-0 flex-col overflow-hidden rounded-[16px]">
            <div className="relative aspect-[4/3] overflow-hidden bg-white">
              <img src={m.img} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-110 object-cover opacity-50 blur-xl" loading="lazy" />
              <img src={m.img} alt={`${m.name}: ${m.fest}`} className="relative h-full w-full object-contain" loading="lazy" />
              <span className="absolute top-2 left-2 rounded-full bg-black/55 px-2 py-0.5 text-[11px] font-bold text-white tabular-nums">{String(i + 1).padStart(2, '0')}</span>
            </div>
            <div className="flex flex-1 flex-col gap-1 p-3">
              <div className="flex items-center gap-2">
                <span className="text-title-3">{m.name}</span>
                <button
                  type="button"
                  onClick={() => play(m.key, m.audio, m.name)}
                  aria-label={playing === m.key ? `Pausar ${m.name}` : `Escuchar ${m.name}`}
                  className="bg-ios-blue ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white transition-transform active:scale-90"
                >
                  {playing === m.key ? <Pause size={14} fill="currentColor" /> : <Play size={14} fill="currentColor" className="ml-0.5" />}
                </button>
              </div>
              <div className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
                <span className="text-ink-orange font-semibold">{m.say}</span>
                <span className="text-label-2 font-mono text-[12px]">{m.ipa}</span>
              </div>
              <p className="text-[14px] leading-snug">{m.fest}</p>
              <p className="text-ink-indigo text-[13px] font-medium">{m.date}</p>
              <Es className="mt-auto pt-1">{m.es}</Es>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------- ordinals --

const SUFFIX_COLOR: Record<string, string> = { st: 'var(--blue)', nd: 'var(--green)', rd: 'var(--purple)', th: 'var(--label-2)' };

/** Any number → ordinal (1st, 22nd, 113th) and its words, plus the 1–31 calendar chart. */
export function OrdinalsTool() {
  const [n, setN] = useState(21);
  const say = useSpeak();
  const safe = Math.max(1, Math.min(999999, Math.floor(n) || 1));
  const suffix = ordinalSuffix(safe);
  const t = safe % 100;
  const reason =
    t >= 11 && t <= 13
      ? `Termina en ${t}: 11, 12 y 13 son excepciones → siempre -th.`
      : suffix === 'th'
        ? `Termina en ${safe % 10}: todo lo que no termina en 1, 2 o 3 lleva -th.`
        : `Termina en ${safe % 10} → -${suffix}.`;
  return (
    <Card className="p-4 sm:p-5">
      <SectionHead icon={Sparkles} color="var(--blue)" title="Ordinal numbers lab" sub="Escribe un número y mira su ordinal" />
      <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <div className="bg-fill-2 flex flex-col items-center justify-center rounded-[16px] p-5 text-center">
          <label className="text-label-2 mb-1 text-[13px]" htmlFor="tm-ord">
            Número
          </label>
          <input
            id="tm-ord"
            type="number"
            inputMode="numeric"
            min={1}
            max={999999}
            value={n}
            onChange={(e) => setN(Number(e.target.value))}
            className="bg-card w-36 rounded-[12px] px-3 py-2 text-center text-[22px] font-bold tabular-nums shadow-card outline-none"
          />
          <div className="mt-4 text-[48px] leading-none font-extrabold tracking-tight tabular-nums">
            {safe}
            <sup className="ml-0.5 text-[24px]" style={{ color: ink(SUFFIX_COLOR[suffix]) }}>
              {suffix}
            </sup>
          </div>
          <div className="mt-2 flex items-center gap-1 text-[17px] font-semibold">
            {ordinalWords(safe)}
            <SpeakButton text={ordinalWords(safe)} size={17} />
          </div>
          <p className="text-label-2 mt-2 text-[13px]">{reason}</p>
          <div className="mt-3 flex flex-wrap justify-center gap-1.5">
            {[1, 2, 3, 11, 12, 13, 21, 22, 23, 31, 101, 112].map((x) => (
              <Chip key={x} active={x === safe} onClick={() => setN(x)}>
                {x}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="text-label-2 mb-2 text-[13px]">Los días del mes (toca para escuchar). Colores: st · nd · rd · th</p>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({ length: 31 }, (_, i) => i + 1).map((d) => {
              const s = ordinalSuffix(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => (setN(d), say(ordinalWords(d)))}
                  className={cn('bg-fill-2 hover:bg-fill rounded-[10px] py-2 text-center text-[13px] font-semibold tabular-nums transition-colors', d === safe && 'ring-ios-blue ring-2')}
                >
                  {d}
                  <sup style={{ color: ink(SUFFIX_COLOR[s]) }}>{s}</sup>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- years --

/** "The two roads of a year": split vs whole number, with an interactive year reader. */
export function YearReader() {
  const [y, setY] = useState(1983);
  const say = useSpeak();
  const es = useEs();
  const safe = Math.max(1, Math.min(9999, Math.floor(y) || 1));
  const r = readYear(safe);
  return (
    <Card className="p-4 sm:p-5">
      <SectionHead icon={History} color="var(--orange)" title="Reading tip · the two roads of a year" sub="¿Sabes cómo pronunciar los años?" />
      <div className="flex flex-wrap items-center justify-center gap-3 py-2">
        <input
          aria-label="Año"
          type="number"
          inputMode="numeric"
          min={1}
          max={9999}
          value={y}
          onChange={(e) => setY(Number(e.target.value))}
          className="bg-fill-2 w-[150px] rounded-[14px] px-3 py-2 text-center text-[40px] leading-none font-extrabold tracking-tight tabular-nums outline-none"
        />
        {r.split && (
          <>
            <ArrowRight className="text-label-3" />
            <div className="flex gap-2">
              <span className="rounded-[14px] px-4 py-2 text-[32px] leading-none font-extrabold text-white tabular-nums" style={{ background: deep('var(--orange)') }}>
                {r.split[0]}
              </span>
              <span className="rounded-[14px] px-4 py-2 text-[32px] leading-none font-extrabold text-white tabular-nums" style={{ background: deep('var(--teal)') }}>
                {r.split[1]}
              </span>
            </div>
          </>
        )}
      </div>
      <div className="mt-2 flex flex-wrap justify-center gap-1.5">
        {[1492, 1810, 1900, 1905, 1983, 2000, 2005, 2010, 2020, 2026].map((x) => (
          <Chip key={x} active={x === safe} onClick={() => setY(x)}>
            {x}
          </Chip>
        ))}
      </div>
      <p className="text-label-2 mt-3 text-center text-[14px]">{r.rule}</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-[16px] p-4" style={{ background: mix('var(--orange)', 10) }}>
          <div className="text-ink-orange text-[12px] font-bold tracking-wide">ROAD 1 · SPLIT THE YEAR (natural)</div>
          <p className="mt-1 text-[14px]">You separate the year in two parts and read each pair as one number.</p>
          {es && <p className="text-label-2 mt-0.5 text-[13px]">Divides el año en dos partes. Es la forma natural.</p>}
          <ul className="mt-2 space-y-1">
            {r.natural.map((t, i) => (
              <li key={t} className={cn('flex items-center gap-1', i === 0 ? 'text-[20px] font-bold' : 'text-label-2 text-[15px]')}>
                “{t}” <SpeakButton text={t} size={16} />
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-[16px] p-4" style={{ background: mix('var(--teal)', 10) }}>
          <div className="text-ink-teal text-[12px] font-bold tracking-wide">ROAD 2 · WHOLE NUMBER (formal)</div>
          <p className="mt-1 text-[14px]">You read the whole number, without splitting it. More formal, and longer.</p>
          {es && <p className="text-label-2 mt-0.5 text-[13px]">Lees el número completo, sin dividirlo. Más formal.</p>}
          <p className="mt-2 flex items-center gap-1 text-[17px] font-bold">
            <span className="text-label-2 mr-1 text-[11px] font-bold">US</span>“{r.formalUS}” <SpeakButton text={r.formalUS} size={16} />
          </p>
          {r.formalUK !== r.formalUS && (
            <p className="text-label-2 flex items-center gap-1 text-[15px]">
              <span className="mr-1 text-[11px] font-bold">UK</span>“{r.formalUK}”
            </p>
          )}
        </div>
      </div>
      <div className="mt-3 text-center">
        <Button size="sm" variant="tinted" onClick={() => say(`${r.natural[0]}. ${r.formalUS}.`)}>
          Escuchar las dos formas
        </Button>
      </div>
    </Card>
  );
}

// ---------------------------------------------------------------- dates --

/** Pick any date: weekday, American vs British written / numeric / spoken forms. */
export function DateFormatsTool() {
  const today = new Date();
  const [y, setY] = useState(today.getFullYear());
  const [m, setM] = useState(today.getMonth() + 1);
  const [d, setD] = useState(today.getDate());
  const year = Math.max(1600, Math.min(2199, Math.floor(y) || 2000));
  const day = Math.min(d, daysInMonth(year, m));
  const f = formatDate(year, m, day);
  const es = useEs();
  const rows: [string, string, string, string][] = [
    ['Written', f.usWritten, f.ukWritten, 'Escrita'],
    ['Short', f.usShort, f.ukShort, 'Corta'],
    ['Numbers', f.usNumeric, f.ukNumeric, 'En números'],
    ['Spoken', f.usSpoken, f.ukSpoken, 'Hablada'],
  ];
  return (
    <Card className="p-4 sm:p-5">
      <SectionHead icon={CalendarDays} color="var(--indigo)" title="Date formats · US vs UK" sub="Elige una fecha y compara las dos variedades" />
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col text-[13px]">
          <span className="text-label-2 mb-1">Month</span>
          <select value={m} onChange={(e) => setM(Number(e.target.value))} className="bg-fill-2 h-10 rounded-[10px] px-2 text-[15px] outline-none">
            {MONTHS.map((x, i) => (
              <option key={x.key} value={i + 1}>
                {x.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-[13px]">
          <span className="text-label-2 mb-1">Day</span>
          <select value={day} onChange={(e) => setD(Number(e.target.value))} className="bg-fill-2 h-10 rounded-[10px] px-2 text-[15px] outline-none">
            {Array.from({ length: daysInMonth(year, m) }, (_, i) => i + 1).map((x) => (
              <option key={x} value={x}>
                {x}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col text-[13px]">
          <span className="text-label-2 mb-1">Year</span>
          <input
            type="number"
            inputMode="numeric"
            min={1600}
            max={2199}
            value={y}
            onChange={(e) => setY(Number(e.target.value))}
            className="bg-fill-2 h-10 w-24 rounded-[10px] px-2 text-[15px] tabular-nums outline-none"
          />
        </label>
        <Button size="sm" variant="gray" onClick={() => (setY(today.getFullYear()), setM(today.getMonth() + 1), setD(today.getDate()))}>
          Hoy
        </Button>
        <Button
          size="sm"
          variant="gray"
          onClick={() => {
            const r = DATE_ROUNDS[Math.floor(Math.random() * DATE_ROUNDS.length)]!;
            setY(r.y);
            setM(r.m);
            setD(r.d);
          }}
        >
          <Shuffle size={14} /> Fecha histórica
        </Button>
      </div>
      <p className="mt-3 text-[15px]">
        That day was / is a <b>{f.weekday}</b>
        {es && <span className="text-label-2"> ({WEEKDAYS_ES[weekdayIndex(year, m, day)]})</span>}.
      </p>
      <div className="mt-3 space-y-3 sm:hidden">
        {(['US', 'UK'] as const).map((v) => (
          <div key={v} className="bg-fill-2 rounded-[14px] p-3">
            <div className="text-label-2 mb-1 text-[12px] font-bold tracking-wide uppercase">{v === 'US' ? '🇺🇸 American' : '🇬🇧 British'}</div>
            <dl className="space-y-1.5">
              {rows.map(([label, us, uk]) => (
                <div key={label} className="flex items-start gap-2">
                  <dt className="text-label-2 w-[68px] shrink-0 pt-0.5 text-[12px] font-semibold">{label}</dt>
                  <dd className="min-w-0 flex-1 text-[15px]">
                    {v === 'US' ? us : uk}
                    {label === 'Spoken' && <SpeakButton text={v === 'US' ? us : uk} size={14} className="ml-0.5 align-middle" />}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        ))}
      </div>
      <div className="mt-3 hidden overflow-x-auto rounded-[12px] shadow-[inset_0_0_0_0.5px_var(--separator)] sm:block">
        <table className="w-full min-w-[520px] text-left text-[14px]">
          <thead>
            <tr className="bg-fill-2 text-label-2 text-[11px] font-semibold tracking-wide uppercase">
              <th className="px-3 py-2" />
              <th className="px-3 py-2">🇺🇸 American</th>
              <th className="px-3 py-2">🇬🇧 British</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(([label, us, uk, labelEs]) => (
              <tr key={label} className="shadow-[inset_0_0.5px_0_var(--separator)]">
                <td className="px-3 py-2.5 font-semibold whitespace-nowrap">
                  {label}
                  {es && <span className="text-label-2 block text-[11px] font-normal">{labelEs}</span>}
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-0.5">
                    {us}
                    {label === 'Spoken' && <SpeakButton text={us} size={15} />}
                  </span>
                </td>
                <td className="px-3 py-2.5">
                  <span className="inline-flex items-center gap-0.5">
                    {uk}
                    {label === 'Spoken' && <SpeakButton text={uk} size={15} />}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {f.ambiguous && (
        <Callout tone="orange" className="mt-3" icon={<AlertTriangle size={16} />} title="¡Cuidado con los números!">
          {f.usNumeric.replace(/\/\d+$/, '')} en EE. UU. y {f.ukNumeric.replace(/\/\d+$/, '')} en el Reino Unido son la misma fecha. Escribe el mes con letras para evitar confusiones.
        </Callout>
      )}
      <p className="text-label-2 mt-2 text-[12px]">ISO (internacional): {f.iso}</p>
    </Card>
  );
}

/** Mini game: tap the pieces of a date in the right order (one piece is a trap). */
export function DateBuilderGame({ rounds = 5 }: { rounds?: number }) {
  const [seed, setSeed] = useState(0);
  const list = useMemo(() => [DATE_ROUNDS[0]!, ...shuffle(DATE_ROUNDS.slice(1))].slice(0, rounds), [rounds, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [ri, setRi] = useState(0);
  const [built, setBuilt] = useState<number[]>([]);
  const [result, setResult] = useState<null | boolean>(null);
  const [score, setScore] = useState(0);
  const [tries, setTries] = useState(0);
  const round = list[ri];
  const target = useMemo(() => (round ? datePieces(round.y, round.m, round.d) : []), [round]);
  const chips = useMemo(() => (round ? shuffle([...target, `${wrongOrdinal(round.d)},`]) : []), [round, target]);

  if (!round)
    return (
      <Card className="flex flex-col items-center p-6 text-center">
        <Trophy className="text-ios-yellow" size={36} />
        <p className="text-title-3 mt-2">
          {score}/{list.length} fechas al primer intento
        </p>
        <Button className="mt-4" variant="gray" onClick={() => (setSeed((s) => s + 1), setRi(0), setScore(0), setBuilt([]), setResult(null), setTries(0))}>
          <RotateCcw size={15} /> Jugar otra vez
        </Button>
      </Card>
    );

  const check = () => {
    const ok = built.length === target.length && built.every((ci, i) => chips[ci] === target[i]);
    setResult(ok);
    if (ok && tries === 0) setScore((s) => s + 1);
    if (!ok) setTries((t) => t + 1);
  };
  const next = () => {
    const last = ri + 1 >= list.length;
    if (last) {
      const pct = Math.round((score / list.length) * 100);
      awardTM('date-builder', 'Build the date', 4 + score * 2, pct);
    }
    setRi(ri + 1);
    setBuilt([]);
    setResult(null);
    setTries(0);
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <SectionHead icon={Puzzle} color="var(--purple)" title="Mini game · build the date" sub="Toca las piezas en orden (hay una trampa)" />
        <span className="text-label-2 shrink-0 text-[13px] tabular-nums">
          {ri + 1}/{list.length} · ✓ {score}
        </span>
      </div>
      <ProgressBar value={ri / list.length} color="var(--purple)" className="mb-4" />
      <p className="text-[15px]">
        Write {round.what} in American English: <b className="tabular-nums">{formatDate(round.y, round.m, round.d).ukNumeric}</b>{' '}
        <span className="text-label-2 text-[13px]">(día/mes/año)</span>
      </p>
      <div
        className={cn(
          'mt-3 flex min-h-[56px] flex-wrap items-center gap-2 rounded-[14px] border-[1.5px] border-dashed p-2.5',
          result === true ? 'border-ios-green' : result === false ? 'border-ios-red' : 'border-separator',
        )}
      >
        {built.length === 0 && <span className="text-label-3 px-1 text-[14px]">Day of the week, Month ordinal day, year</span>}
        {built.map((ci, pos) => (
          <button
            key={`${ci}-${pos}`}
            type="button"
            onClick={() => (setBuilt((b) => b.filter((_, k) => k !== pos)), setResult(null))}
            className="bg-ios-blue rounded-[10px] px-3 py-1.5 text-[16px] font-semibold text-white"
          >
            {chips[ci]}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {chips.map((c, ci) => {
          const used = built.includes(ci);
          return (
            <button
              key={ci}
              type="button"
              disabled={used || result === true}
              onClick={() => (setBuilt((b) => [...b, ci]), setResult(null))}
              className={cn('bg-fill-2 hover:bg-fill rounded-[10px] px-3 py-1.5 text-[16px] font-semibold transition-opacity', used && 'opacity-30')}
            >
              {c}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-2">
        {result !== true ? (
          <>
            <Button size="sm" onClick={check} disabled={built.length !== target.length}>
              Comprobar
            </Button>
            <Button size="sm" variant="gray" onClick={() => (setBuilt([]), setResult(null))}>
              <RotateCcw size={14} /> Borrar
            </Button>
          </>
        ) : (
          <Button size="sm" onClick={next}>
            {ri + 1 >= list.length ? 'Ver resultado' : 'Siguiente fecha'}
          </Button>
        )}
        {result === true && (
          <span className="text-ink-green inline-flex items-center gap-1 text-[14px] font-semibold">
            <Check size={16} /> {target.join(' ')} — correct order.
            <SpeakButton text={formatDate(round.y, round.m, round.d).usSpoken} size={15} />
          </span>
        )}
        {result === false && <span className="text-ink-red text-[14px]">Not yet: day of the week, month, ordinal day, year — and check the ordinal ending.</span>}
      </div>
    </Card>
  );
}

// ----------------------------------------------------------------- days --

/** The seven days with audio, today's day and the class question. */
export function DaysOfWeek() {
  const say = useSpeak();
  const es = useEs();
  const todayIdx = new Date().getDay();
  const order = [1, 2, 3, 4, 5, 6, 0];
  return (
    <Card className="p-4 sm:p-5">
      <SectionHead icon={CalendarDays} color="var(--green)" title="The seven days" sub={`Hoy es ${WEEKDAYS[todayIdx]} (${WEEKDAYS_ES[todayIdx]})`} />
      <div className="grid grid-cols-2 gap-2 min-[480px]:grid-cols-4 lg:grid-cols-7">
        {order.map((i) => (
          <button
            key={i}
            type="button"
            onClick={() => say(`${WEEKDAYS[i]}. What do you do on ${WEEKDAYS[i]}?`)}
            className={cn('bg-fill-2 hover:bg-fill flex flex-col items-start rounded-[14px] p-3 text-left transition-colors', i === todayIdx && 'ring-ios-green ring-2')}
          >
            <span className="text-headline">{WEEKDAYS[i]}</span>
            {es && <span className="text-label-2 text-[13px]">{WEEKDAYS_ES[i]}</span>}
            <span className="text-ink-blue mt-1 text-[12px] font-medium">on {WEEKDAYS[i]} · on {WEEKDAYS[i]}s</span>
          </button>
        ))}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------- spelling --

const ED_SAMPLES: Record<'ed' | 'ing', string[]> = {
  ed: ['work', 'like', 'study', 'play', 'stop', 'visit', 'prefer', 'travel', 'open', 'admit', 'fix', 'panic', 'go', 'be'],
  ing: ['watch', 'drive', 'run', 'mop', 'lie', 'see', 'be', 'begin', 'visit', 'open', 'travel', 'play', 'fix', 'panic'],
};

function SpellingLab({ mode }: { mode: 'ed' | 'ing' }) {
  const defVariety = useVariety();
  const [variety, setVariety] = useState<Variety>(defVariety);
  const [verb, setVerb] = useState(mode === 'ed' ? 'stop' : 'run');
  const k = verb.trim().toLowerCase().replace(/[^a-z]/g, '');
  const info = k ? (mode === 'ed' ? pastInfo(k, variety) : ingInfo(k, variety)) : null;
  const pp = k ? ppOf(k, variety) : '';
  const isIrr = !!IRREG[k];
  return (
    <Card className="p-4 sm:p-5">
      <SectionHead
        icon={Wand2}
        color={mode === 'ed' ? 'var(--orange)' : 'var(--teal)'}
        title={mode === 'ed' ? 'Spelling lab · past simple (-ed)' : 'Spelling lab · the -ing form'}
        sub="Escribe cualquier verbo en forma base"
      />
      <div className="flex flex-wrap items-center gap-2">
        <label className="bg-fill-2 flex h-11 min-w-0 flex-1 items-center gap-2 rounded-[12px] px-3">
          <Search size={17} className="text-label-3 shrink-0" />
          <input
            value={verb}
            onChange={(e) => setVerb(e.target.value)}
            placeholder="travel, stop, study…"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck={false}
            aria-label="Verbo en forma base"
            className="placeholder:text-label-3 h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none"
          />
        </label>
        <Segmented<Variety> size="sm" value={variety} onChange={setVariety} options={[{ value: 'US', label: '🇺🇸 US' }, { value: 'UK', label: '🇬🇧 UK' }]} />
      </div>
      <div className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 py-1">
        {ED_SAMPLES[mode].map((s) => (
          <Chip key={s} active={k === s} onClick={() => setVerb(s)}>
            {s}
          </Chip>
        ))}
      </div>
      {info && (
        <motion.div key={`${k}-${variety}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="bg-fill-2 mt-3 rounded-[16px] p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-[22px] font-semibold">{info.base}</span>
            <ArrowRight size={18} className="text-label-3" />
            <span className="text-[28px] font-extrabold tracking-tight" style={{ color: mode === 'ed' ? 'var(--orange-ink)' : 'var(--teal-ink)' }}>
              {info.form}
            </span>
            <SpeakButton text={`${info.base}, ${info.form.replace(' / ', ', ')}`} />
            {isIrr && <span className="text-ink-purple rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ background: mix('var(--purple)', 14) }}>IRREGULAR</span>}
          </div>
          <p className="mt-1 text-[14px]">{info.why}</p>
          {info.other && (
            <p className="text-label-2 mt-1 text-[13px]">
              {variety === 'US' ? '🇬🇧 UK' : '🇺🇸 US'}: <b>{info.other}</b>
            </p>
          )}
          {mode === 'ed' && (
            <p className="text-label-2 mt-1 text-[13px]">
              Past participle: <b className="text-label">{pp}</b>
              {isIrr && ' (tercera columna)'}
            </p>
          )}
        </motion.div>
      )}
      <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {(mode === 'ed'
          ? [
              ['+ ed', 'work → worked · visit → visited'],
              ['-e → + d', 'like → liked · agree → agreed'],
              ['consonant + y → ied', 'study → studied (but play → played)'],
              ['C-V-C, 1 syllable → double', 'stop → stopped · plan → planned'],
              ['C-V-C, stressed last syllable → double', 'prefer → preferred · admit → admitted'],
              ['never double w, x, y', 'fix → fixed · snow → snowed'],
            ]
          : [
              ['+ ing', 'watch → watching · play → playing'],
              ['consonant + e → drop e', 'drive → driving · make → making'],
              ['-ee, -ye, -oe, be → keep e', 'see → seeing · be → being'],
              ['-ie → y', 'lie → lying · die → dying'],
              ['C-V-C, 1 syllable → double', 'run → running · mop → mopping'],
              ['C-V-C, stress not final → no double', 'visit → visiting · open → opening'],
            ]
        ).map(([rule, ex]) => (
          <div key={rule} className="rounded-[12px] p-3 shadow-[inset_0_0_0_0.5px_var(--separator)]">
            <div className="text-[14px] font-semibold">{rule}</div>
            <div className="text-label-2 text-[13px]">{ex}</div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/** -ed spelling engine: doubling (with stress), y → ied, e → d, w/x/y, -ic, US vs UK -l. */
export function PastSimpleEdRules() {
  return <SpellingLab mode="ed" />;
}
/** -ing spelling engine for the past continuous. */
export function IngSpellingTool() {
  return <SpellingLab mode="ing" />;
}

const DRILL_VERBS = ['stop', 'study', 'play', 'visit', 'prefer', 'travel', 'like', 'plan', 'open', 'admit', 'cry', 'fix', 'try', 'rob', 'listen', 'occur', 'stay', 'hope', 'hop', 'control', 'happen', 'panic', 'agree', 'enjoy', 'carry', 'drop', 'offer', 'commit'];

function edDistractors(base: string, right: string) {
  const set = new Set<string>();
  const last = base[base.length - 1]!;
  set.add(right.endsWith(`${last}${last}ed`) ? `${base}ed` : `${base}${last}ed`);
  if (base.endsWith('y')) {
    set.add(right.endsWith('ied') ? `${base}ed` : `${base.slice(0, -1)}ied`);
  }
  if (base.endsWith('e')) set.add(`${base}ed`);
  set.add(`${base}t`);
  set.delete(right);
  return [...set].slice(0, 2);
}

/** Choose the right spelling of the past form — 8 rounds, XP at the end. */
export function EdSpellingDrill({ rounds = 8 }: { rounds?: number }) {
  const variety = useVariety();
  const [seed, setSeed] = useState(0);
  const pool = useMemo(() => shuffle(DRILL_VERBS).slice(0, rounds), [rounds, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const v = pool[i];
  const info = v ? pastInfo(v, variety) : null;
  const options = useMemo(() => (v && info ? shuffle([info.form, ...edDistractors(v, info.form)]) : []), [v, info?.form]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!v || !info)
    return (
      <Card className="flex flex-col items-center p-6 text-center">
        <Trophy className="text-ios-yellow" size={36} />
        <p className="text-title-3 mt-2">
          {score}/{pool.length} correctas
        </p>
        <Button className="mt-4" variant="gray" onClick={() => (setSeed((s) => s + 1), setI(0), setScore(0), setPicked(null))}>
          <RotateCcw size={15} /> Otra ronda
        </Button>
      </Card>
    );

  const choose = (o: string) => {
    if (picked) return;
    setPicked(o);
    if (o === info.form) setScore((s) => s + 1);
  };
  const next = () => {
    if (i + 1 >= pool.length) awardTM('ed-spelling', 'Spell the past (-ed)', 4 + score, Math.round((score / pool.length) * 100));
    setI(i + 1);
    setPicked(null);
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h4 className="text-headline">Spell the past ({variety})</h4>
        <span className="text-label-2 text-[13px] tabular-nums">
          {i + 1}/{pool.length} · ✓ {score}
        </span>
      </div>
      <ProgressBar value={i / pool.length} color="var(--orange)" className="mb-4" />
      <p className="text-center text-[15px]">Yesterday I…</p>
      <p className="text-center text-[30px] font-bold tracking-tight">{v}</p>
      <div className="mt-3 grid grid-cols-1 gap-2 min-[400px]:grid-cols-3">
        {options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => choose(o)}
            className={cn(
              'rounded-[14px] px-3 py-3 text-[17px] font-semibold transition-colors',
              !picked && 'bg-fill-2 hover:bg-fill',
              picked && o === info.form && 'bg-ios-green text-white',
              picked === o && o !== info.form && 'bg-ios-red text-white',
              picked && o !== info.form && picked !== o && 'bg-fill-2 opacity-50',
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {picked && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-label-2 min-w-0 flex-1 text-[14px]">
            <b className="text-label">
              {v} → {info.form}
            </b>
            . {info.why}
          </p>
          <Button size="sm" onClick={next}>
            {i + 1 >= pool.length ? 'Ver resultado' : 'Siguiente'}
          </Button>
        </div>
      )}
    </Card>
  );
}

// -------------------------------------------------------- irregular verbs --

/** Searchable base / past / participle list with audio. */
export function IrregularVerbsTable() {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const variety = useVariety();
  const say = useSpeak();
  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return Object.entries(IRREG)
      .sort(([a], [b]) => a.localeCompare(b))
      .filter(([base, [p, pp]]) => !n || [base, p, pp].some((x) => x.includes(n)));
  }, [q]);
  const shown = open || q ? list : list.slice(0, 12);
  return (
    <Card className="p-4 sm:p-5">
      <SectionHead icon={Sparkles} color="var(--purple)" title="Irregular verbs" sub={`${Object.keys(IRREG).length} verbos · toca una fila para escuchar las tres formas`} />
      <label className="bg-fill-2 mb-3 flex h-10 items-center gap-2 rounded-[12px] px-3">
        <Search size={16} className="text-label-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Busca: go, bought, written…" aria-label="Buscar verbo irregular" className="placeholder:text-label-3 h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none" />
      </label>
      <div className="grid gap-1.5 sm:grid-cols-2 lg:grid-cols-3">
        {shown.map(([base, [p, pp]]) => {
          const part = variety === 'UK' ? pp.replace(' / gotten', '') : pp;
          return (
            <button key={base} type="button" onClick={() => say(`${base}, ${p.replace(' / ', ', ')}, ${part.replace(' / ', ', ')}`)} className="bg-fill-2 hover:bg-fill grid grid-cols-3 gap-2 rounded-[10px] px-3 py-2 text-left text-[14px] transition-colors">
              <span className="font-semibold">{base}</span>
              <span>{p}</span>
              <span className="text-label-2">{part}</span>
            </button>
          );
        })}
      </div>
      {!q && list.length > 12 && (
        <div className="mt-3 text-center">
          <Button size="sm" variant="gray" onClick={() => setOpen((o) => !o)}>
            {open ? 'Ver menos' : `Ver los ${list.length}`}
          </Button>
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------------ time words --

/** Adverbs of time, connectors and "ago / for" phrases (from the class poster). */
export function TimeWords() {
  const say = useSpeak();
  const es = useEs();
  return (
    <Card className="p-4 sm:p-5">
      <SectionHead icon={Clock} color="var(--cyan)" title="Time words" sub="Toca una palabra para escuchar un ejemplo" />
      <div className="grid gap-4 md:grid-cols-3">
        {TIME_WORDS.map((g) => (
          <div key={g.group}>
            <div className="text-[14px] font-semibold">{g.group}</div>
            {es && <div className="text-label-2 mb-1 text-[12px]">{g.es}</div>}
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {g.words.map((w) => (
                <button key={w.w} type="button" title={w.ex} onClick={() => say(w.ex)} className="bg-fill-2 hover:bg-fill rounded-full px-3 py-1 text-[14px] transition-colors">
                  {w.w}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

// -------------------------------------------------------------- was/were --

function shortAnswer(s: string, form: 'was' | 'were') {
  const l = s.toLowerCase();
  if (l === 'i') return 'you were';
  if (l === 'you') return 'I was / we were';
  if (l === 'we') return 'you were';
  if (['he', 'she', 'it', 'they'].includes(l)) return `${l} ${form}`;
  return form === 'were' ? 'they were' : 'he / she / it was';
}

/** Type any subject: was or were, with the reason and the three sentence forms. */
export function WasWereTool() {
  const [subject, setSubject] = useState('My parents');
  const info = wasWereInfo(subject || 'I');
  const s = subjectMid(subject || 'I');
  const S = s.charAt(0).toUpperCase() + s.slice(1);
  const neg = info.form === 'was' ? 'wasn’t' : 'weren’t';
  const Q = info.form === 'was' ? 'Was' : 'Were';
  return (
    <Card className="p-4 sm:p-5">
      <SectionHead icon={Wand2} color="var(--indigo)" title="Was or were?" sub="Escribe un sujeto: I, my parents, James, the children…" />
      <input
        value={subject}
        onChange={(e) => setSubject(e.target.value)}
        aria-label="Sujeto"
        placeholder="I"
        className="bg-fill-2 h-11 w-full rounded-[12px] px-3 text-[16px] outline-none"
      />
      <div className="no-scrollbar -mx-1 mt-2 flex gap-1.5 overflow-x-auto px-1 py-1">
        {['I', 'You', 'She', 'We', 'They', 'My parents', 'James', 'The children', 'My friend and I', 'The news'].map((x) => (
          <Chip key={x} active={subject === x} onClick={() => setSubject(x)}>
            {x}
          </Chip>
        ))}
      </div>
      <div className="mt-3 grid gap-3 md:grid-cols-[auto_minmax(0,1fr)]">
        <div className="flex flex-col items-center justify-center rounded-[16px] px-8 py-4 text-white" style={{ background: deep(info.form === 'was' ? 'var(--indigo)' : 'var(--pink)') }}>
          <span className="text-[40px] leading-none font-extrabold">{info.form}</span>
        </div>
        <div className="bg-fill-2 rounded-[16px] p-4">
          <p className="text-[14px]">{info.why}</p>
          <ul className="mt-2 space-y-1 text-[15px]">
            <li>
              <span className="text-ink-green mr-1 font-bold">+</span>
              {S} {info.form} at home last night.
            </li>
            <li>
              <span className="text-ink-red mr-1 font-bold">−</span>
              {S} {info.form} not ({neg}) at home last night.
            </li>
            <li>
              <span className="text-ink-blue mr-1 font-bold">?</span>
              {Q} {s} at home last night? — Yes, {shortAnswer(s, info.form)}.
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}

// --------------------------------------------------------- tense chart --

const TENSE_COLOR = { perfect: 'var(--teal)', continuous: 'var(--indigo)', simple: 'var(--orange)' } as const;

/** Where each past tense sits in time: past perfect, past continuous, past simple. */
export function TenseTimelineChart() {
  const es = useEs();
  const rows = [
    { k: 'perfect' as const, label: 'PAST PERFECT', left: 0, width: 26, text: <>I <b>had finished</b> my homework <em>before</em> the other action.</> },
    { k: 'continuous' as const, label: 'PAST CONTINUOUS', left: 22, width: 34, text: <>I <b>was walking</b> to school: an action in progress, still open.</> },
    { k: 'simple' as const, label: 'PAST SIMPLE', left: 46, width: 0, text: <>I <b>met</b> my friend: one finished point.</> },
  ];
  return (
    <Card className="p-4 sm:p-5">
      <SectionHead icon={History} color="var(--teal)" title="Chart · where each tense sits in time" sub="Lee la línea de izquierda (antes) a derecha (ahora)" />
      <div className="space-y-4">
        {rows.map((r, i) => (
          <div key={r.k}>
            <div className="bg-fill-2 relative h-8 rounded-[10px]">
              <motion.div
                initial={{ opacity: 0, scaleX: 0.3 }}
                whileInView={{ opacity: 1, scaleX: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5, delay: i * 0.12 }}
                className="absolute top-0 h-8 origin-left rounded-[10px]"
                style={{
                  left: `${r.left}%`,
                  width: r.width ? `${r.width}%` : 14,
                  background:
                    r.k === 'continuous'
                      ? `repeating-linear-gradient(115deg, ${mix(TENSE_COLOR[r.k], 75)} 0 8px, ${mix(TENSE_COLOR[r.k], 35)} 8px 16px)`
                      : TENSE_COLOR[r.k]}}
              />
            </div>
            <p className="mt-1.5 text-[14px]">
              <span className="mr-1.5 text-[11px] font-bold tracking-wide" style={{ color: ink(TENSE_COLOR[r.k]) }}>
                {r.label}
              </span>
              {r.text}
            </p>
          </div>
        ))}
        <div className="text-label-2 relative flex justify-between pt-3 text-[11px] font-semibold tracking-wide uppercase">
          <span className="absolute top-0 right-0 left-0 h-[2px] rounded-full" style={{ background: 'linear-gradient(90deg, var(--teal), var(--orange), var(--label-3))' }} />
          <span>earlier past</span>
          <span>later past</span>
          <span>now</span>
        </div>
      </div>
      {es && <Es className="mt-3">El pasado perfecto ocurre antes; el continuo estaba en progreso; el simple es el punto que ya terminó.</Es>}
    </Card>
  );
}

// ------------------------------------------------------ sentence timeline --

const NODES = [
  { k: 't1' as const, tense: 'perfect' as const, name: 'Past perfect', label: 'Earlier action', hint: 'What was already finished before everything else.', ph: 'finish my homework' },
  { k: 't2' as const, tense: 'continuous' as const, name: 'Past continuous', label: 'Background action', hint: 'What was in progress when it happened.', ph: 'walk to school' },
  { k: 't3' as const, tense: 'simple' as const, name: 'Past simple', label: 'Main event', hint: 'The finished action that cut the scene.', ph: 'meet my friend' },
];

/** Type three moments in base form → one sentence mixing past perfect, continuous and simple. */
export function SentenceTimeline() {
  const variety = useVariety();
  const es = useEs();
  const clear = useTimeMachine((s) => s.clear);
  const [f, setF] = useState({ subject: 'I', when: '', t1: '', t2: '', t3: '' });
  const [out, setOut] = useState<ReturnType<typeof buildTimeline>>(null);
  const [empty, setEmpty] = useState(false);
  const awarded = useRef(false);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((p) => ({ ...p, [k]: e.target.value }));

  const preview = (k: 't1' | 't2' | 't3') => {
    const p = splitPhrase(f[k]);
    if (!p) return 'base form → conjugated here';
    const subj = subjectMid(f.subject);
    return k === 't1' ? perfectOf(p, variety) : k === 't2' ? continuousOf(p, subj, variety) : simpleOf(p, subj, variety);
  };

  const build = () => {
    const o = buildTimeline(f, variety);
    setOut(o);
    setEmpty(!o);
    if (o && o.parts.length === 3 && !awarded.current) {
      awarded.current = true;
      clear('timeline', 1, 1);
      awardTM('timeline', 'Sentence Timeline', 10, 100);
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <SectionHead icon={History} color="var(--teal)" title="Type your three moments" sub="Escribe cada acción con el verbo en forma base" />
      <p className="text-label-2 text-[14px]">
        “finish my homework”, “walk to school”, “meet my friend”. The app conjugates them and returns one full sentence that mixes the three past tenses.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <label className="text-[13px]">
          <span className="text-label-2 mb-1 block">Subject</span>
          <input value={f.subject} onChange={set('subject')} placeholder="I" className="bg-fill-2 h-11 w-full rounded-[12px] px-3 text-[16px] outline-none" />
        </label>
        <label className="text-[13px]">
          <span className="text-label-2 mb-1 block">When (optional)</span>
          <input value={f.when} onChange={set('when')} placeholder="yesterday · last Friday · in 1983" className="bg-fill-2 h-11 w-full rounded-[12px] px-3 text-[16px] outline-none" />
        </label>
      </div>
      <ol className="relative mt-4 space-y-3 pl-7">
        <span className="absolute top-2 bottom-2 left-[9px] w-[2px] rounded-full" style={{ background: 'linear-gradient(180deg, var(--teal), var(--indigo), var(--orange))' }} />
        {NODES.map((n) => (
          <li key={n.k} className="relative">
            <span className="absolute top-3 -left-7 h-5 w-5 rounded-full border-[3px] border-[var(--card)]" style={{ background: TENSE_COLOR[n.tense] }} />
            <div className="bg-fill-2 rounded-[14px] p-3">
              <div className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[11px] font-bold tracking-wide uppercase" style={{ color: ink(TENSE_COLOR[n.tense]) }}>
                  {n.name}
                </span>
                <span className="text-headline">{n.label}</span>
              </div>
              <p className="text-label-2 text-[13px]">{n.hint}</p>
              <input value={f[n.k]} onChange={set(n.k)} placeholder={n.ph} aria-label={n.label} autoCapitalize="none" className="bg-card mt-2 h-10 w-full rounded-[10px] px-3 text-[16px] shadow-card outline-none" />
              <p className="mt-1.5 font-mono text-[13px]" style={{ color: f[n.k].trim() ? TENSE_COLOR[n.tense] : 'var(--label-3)' }}>
                {preview(n.k)}
              </p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button onClick={build}>
          <Sparkles size={16} /> Construir mi oración
        </Button>
        <Button variant="gray" onClick={() => (setF({ subject: 'I', when: 'yesterday', t1: 'finish my homework', t2: 'walk to school', t3: 'meet my friend' }), setOut(null))}>
          Cargar un ejemplo
        </Button>
        <Button variant="plain" onClick={() => (setF((p) => ({ ...p, t1: '', t2: '', t3: '', when: '' })), setOut(null), setEmpty(false))}>
          Borrar
        </Button>
      </div>
      {empty && <p className="text-ink-red mt-3 text-[14px]">Escribe al menos una acción.</p>}
      {out && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-4 rounded-[16px] p-4" style={{ background: mix('var(--teal)', 10) }}>
          <div className="text-ink-teal text-[12px] font-bold tracking-wide uppercase">Your full sentence</div>
          <p className="mt-1 flex items-start gap-1 text-[20px] leading-snug font-semibold">
            <span className="min-w-0">{out.main}</span>
            <SpeakButton text={out.main} />
          </p>
          {out.alts.map((a) => (
            <p key={a} className="text-label-2 mt-1 text-[14px]">
              Another way to say it: <span className="text-label">{a}</span>
            </p>
          ))}
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {out.parts.map((p) => (
              <div key={p.tense} className="bg-card rounded-[12px] p-3">
                <div className="text-[11px] font-bold tracking-wide uppercase" style={{ color: ink(TENSE_COLOR[p.tense]) }}>
                  {NODES.find((n) => n.tense === p.tense)!.name}
                </div>
                <div className="text-[15px]">{p.text}</div>
                <div className="text-label-2 font-mono text-[12px]">{p.formula}</div>
              </div>
            ))}
          </div>
          {es && <Es className="mt-2">Cada bloque es un tiempo distinto: had + participio (antes), was/were + -ing (en progreso), y el pasado simple con when (la acción que terminó).</Es>}
          {out.irregulars.length > 0 && (
            <p className="mt-2 text-[14px]">
              Irregular verbs used: <b>{out.irregulars.join('  ·  ')}</b>
            </p>
          )}
        </motion.div>
      )}
    </Card>
  );
}

// ---------------------------------------------------------------- video --

function VideoCard({ v }: { v: VideoItem }) {
  const [open, setOpen] = useState(false);
  const [play, setPlay] = useState(false);
  return (
    <Card className="overflow-hidden">
      <div className="grid gap-0 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <div className="p-4 sm:p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h4 className="text-title-3">{v.title}</h4>
            <span className="text-label-2 text-[12px] font-semibold tracking-wide uppercase">{v.tag}</span>
          </div>
          <p className="text-label-2 mt-1 text-[14px]">{v.brief}</p>
          {v.embed ? (
            <div className="bg-fill relative mt-3 aspect-video overflow-hidden rounded-[14px]">
              {play ? (
                <iframe
                  src={`${v.embed}?autoplay=1&rel=0`}
                  title={v.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
                  allowFullScreen
                  className="absolute inset-0 h-full w-full"
                />
              ) : (
                <button type="button" onClick={() => setPlay(true)} className="group absolute inset-0 flex flex-col items-center justify-center gap-2" aria-label={`Reproducir ${v.title}`}>
                  <span className="bg-ios-red flex h-14 w-14 items-center justify-center rounded-full text-white shadow-float transition-transform motion-safe:group-hover:scale-105">
                    <Play size={24} fill="currentColor" className="ml-1" />
                  </span>
                  <span className="text-label-2 text-[13px]">Reproducir aquí (YouTube)</span>
                </button>
              )}
            </div>
          ) : (
            <div className="bg-fill-2 mt-3 flex aspect-video flex-col items-center justify-center gap-2 rounded-[14px] p-4 text-center">
              <Film size={32} className="text-label-3" />
              <p className="text-label-2 text-[14px]">Este video no se puede insertar: búscalo en YouTube.</p>
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            <a href={v.link} target="_blank" rel="noopener noreferrer" className="text-ink-blue inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold" style={{ background: mix('var(--blue)', 14) }}>
              <ExternalLink size={14} /> {v.linkLabel}
            </a>
            <Button size="sm" variant="gray" onClick={() => setOpen((o) => !o)}>
              {open ? <EyeOff size={14} /> : <Eye size={14} />} {open ? 'Ocultar respuestas' : 'Ver respuestas'}
            </Button>
          </div>
        </div>
        <ol className="space-y-2 p-4 pt-0 sm:p-5 lg:pt-5">
          {v.questions.map((q) => (
            <li key={q.n} className="bg-fill-2 rounded-[12px] p-3">
              <div className="flex gap-2">
                <span className="text-ink-indigo text-[13px] font-bold tabular-nums">{q.n}</span>
                <span className="text-[15px] font-medium">{q.q}</span>
              </div>
              {open && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-1.5 flex items-start gap-1 pl-6 text-[14px]">
                  <span className="text-ink-green min-w-0">{q.a}</span>
                  <SpeakButton text={q.a} size={14} className="-mt-1" />
                </motion.div>
              )}
            </li>
          ))}
        </ol>
      </div>
    </Card>
  );
}

/** The two "Draw My Life" videos with the class questions and model answers. */
export function VideoActivity() {
  const stage = stageById('video');
  return (
    <div className="space-y-4">
      {(stage.videos ?? []).map((v) => (
        <VideoCard key={v.id} v={v} />
      ))}
    </div>
  );
}

/** Notebook for the video answers — saved on this device. */
export function VideoNotebook() {
  const notes = useTimeMachine((s) => s.notes);
  const setNotes = useTimeMachine((s) => s.setNotes);
  const clear = useTimeMachine((s) => s.clear);
  const words = notes.trim() ? notes.trim().split(/\s+/).length : 0;
  useEffect(() => {
    if (words >= 40) clear('video', 1, 1);
  }, [words, clear]);
  return (
    <Card className="p-4 sm:p-5">
      <SectionHead icon={NotebookPen} color="var(--orange)" title="Your notebook" sub="Se guarda en este dispositivo" />
      <p className="text-label-2 text-[14px]">Answer in the simple past. Write the dates in the English order, and mark every irregular verb you hear.</p>
      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="Lebron was born on December 30th, 1984…"
        rows={9}
        className="bg-fill-2 placeholder:text-label-3 mt-3 w-full resize-y rounded-[14px] p-3 text-[16px] leading-relaxed outline-none"
      />
      <p className="text-label-2 mt-1 text-[12px] tabular-nums">
        {words} palabras · {words >= 40 ? 'etapa completada ✓' : 'escribe al menos 40 palabras para completar la etapa'}
      </p>
    </Card>
  );
}

// ------------------------------------------------------------------ hub --

const STAGE_COLORS = ['var(--pink)', 'var(--indigo)', 'var(--orange)', 'var(--green)', 'var(--blue)', 'var(--purple)', 'var(--teal)', 'var(--cyan)', 'var(--mint)', 'var(--red)'];

/** Overview: hero, today's saying and the ten stages with their progress. */
export function TimeMachineHub({ onOpen }: { onOpen: (id: StageId) => void }) {
  const cleared = useTimeMachine((s) => s.cleared);
  const es = useEs();
  const done = ALL.filter((s) => cleared[s.id]).length;
  const hits = Object.values(cleared).reduce((a, c) => a + (c?.correct ?? 0), 0);
  return (
    <div className="space-y-6">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <Card className="overflow-hidden">
          <div className="p-5 sm:p-7" style={{ background: `linear-gradient(135deg, ${mix('var(--indigo)', 16)}, ${mix('var(--teal)', 8)} 60%, transparent)` }}>
            <div className="text-ink-indigo text-[12px] font-bold tracking-wide uppercase">Learning quest · 10 stages</div>
            <h2 className="text-title-1 mt-1 text-balance">Travel through time in English</h2>
            <p className="text-callout text-label-2 mt-2 max-w-xl text-pretty">
              Months, dates, years, days of the week, and the four ways English talks about the past. Every stage explains the rule step by step, shows it in a table, warns you about the common mistakes, and then challenges you.
            </p>
            <Es className="mt-2 max-w-xl">Meses, fechas, años, días y las cuatro formas de hablar del pasado: cada etapa explica, muestra, advierte y luego te reta.</Es>
            <div className="mt-4 flex flex-wrap gap-2">
              <Button variant="brand" onClick={() => onOpen('months')}>
                Empezar la etapa 1 <ArrowRight size={16} />
              </Button>
              <Button variant="gray" onClick={() => onOpen('timeline')}>
                <History size={16} /> Línea de tiempo
              </Button>
              <Button variant="gray" onClick={() => onOpen('video')}>
                <Film size={16} /> Actividad de video
              </Button>
            </div>
            <div className="mt-5 flex items-center gap-3">
              <ProgressBar value={done / ALL.length} color="var(--indigo)" className="max-w-[240px]" />
              <span className="text-label-2 text-[13px] tabular-nums">
                {done}/{ALL.length} etapas · {hits} aciertos
              </span>
            </div>
          </div>
        </Card>
        <Card className="flex flex-col gap-3 p-5 sm:p-6">
          <div className="text-label-2 flex items-center gap-2 text-[12px] font-bold tracking-wide uppercase">
            <Quote size={14} /> Today’s saying
          </div>
          <p className="text-[20px] leading-snug font-semibold text-pretty">“{SAYING.en}”</p>
          <SpeakButton text={SAYING.en} className="-ml-1.5 self-start" />
          <div className="mt-auto rounded-[14px] p-3" style={{ background: mix('var(--teal)', 10) }}>
            <div className="text-ink-teal text-[11px] font-bold tracking-wide uppercase">En español</div>
            <p className="text-[15px]">“{SAYING.es}”</p>
          </div>
        </Card>
      </div>

      <div>
        <h3 className="text-title-2 mb-3 px-1">Stages</h3>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
          {ALL.map((s, i) => {
            const c = cleared[s.id];
            return (
              <motion.button
                key={s.id}
                type="button"
                onClick={() => onOpen(s.id)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-card shadow-card flex flex-col gap-2 rounded-[18px] p-4 text-left transition-transform motion-safe:hover:-translate-y-0.5"
              >
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[13px] font-bold text-white tabular-nums" style={{ background: deep(STAGE_COLORS[i]) }}>
                    {s.num}
                  </span>
                  <span className={cn('ml-auto text-[11px] font-bold tracking-wide uppercase', c ? 'text-ink-green' : 'text-label-3')}>
                    {c ? (c.total > 1 ? `✓ ${c.correct}/${c.total}` : '✓ Hecho') : s.quiz.length ? `${s.quiz.length} preguntas` : s.tool === 'timeline' ? 'Constructor' : 'Cuaderno'}
                  </span>
                </div>
                <span className="text-headline">{s.title}</span>
                <span className="text-label-2 text-[13px] leading-snug">{s.blurb}</span>
                {es && <span className="text-ink-teal text-[12px] font-medium">{s.es}</span>}
              </motion.button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ------------------------------------------------------------ stage panel --

export type StageMode = 'learn' | 'practice';

/** One stage with its Learn / Practice switch, as in the legacy module. */
export function StagePanel({ id, mode, onMode, onNext }: { id: StageId; mode: StageMode; onMode: (m: StageMode) => void; onNext?: (next: StageId | null) => void }) {
  const stage = stageById(id);
  const idx = ALL.findIndex((s) => s.id === id);
  const next = ALL[idx + 1] ?? null;
  const [finished, setFinished] = useState(false);
  useEffect(() => setFinished(false), [id, mode]);
  const practiceLabel = stage.quiz.length ? 'Practicar' : stage.tool === 'timeline' ? 'Construir' : 'Cuaderno';

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<StageMode>
          value={mode}
          onChange={onMode}
          options={[
            { value: 'learn', label: id === 'video' ? 'Ver' : 'Aprender' },
            { value: 'practice', label: practiceLabel },
          ]}
        />
        <span className="text-label-2 ml-auto text-[13px] font-medium tabular-nums">Etapa {stage.num} / 10</span>
      </div>
      {mode === 'learn' ? (
        <div className="space-y-4">
          <StageLesson id={id} />
          <div className="flex justify-center pt-2">
            <Button size="lg" onClick={() => (onMode('practice'), window.scrollTo({ top: 0, behavior: 'smooth' }))}>
              {stage.quiz.length ? 'Practicar esta etapa' : stage.tool === 'timeline' ? 'Abrir la línea de tiempo' : 'Abrir mi cuaderno'} <ArrowRight size={18} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="mx-auto max-w-3xl space-y-4">
          {id === 'dates' && <DateBuilderGame />}
          {id === 'past' && <EdSpellingDrill />}
          {stage.tool === 'timeline' && (
            <>
              <SentenceTimeline />
              <TenseTimelineChart />
            </>
          )}
          {stage.tool === 'notebook' && (
            <>
              <VideoNotebook />
              <VideoActivity />
            </>
          )}
          {stage.quiz.length > 0 && <StageQuiz id={id} onFinish={() => setFinished(true)} />}
          {(finished || !stage.quiz.length) && onNext && (
            <div className="flex justify-center">
              <Button variant="gray" onClick={() => onNext(next?.id ?? null)}>
                {next ? `Etapa ${next.num}: ${next.title}` : 'Volver a las etapas'} <ArrowRight size={16} />
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
