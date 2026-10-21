import { lazy, Suspense, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Expand, Headphones, Image as ImageIcon, PenLine, Shuffle, Sparkles, Volume2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip, LevelChip } from '@/components/ui/Misc';
import { Segmented } from '@/components/ui/Segmented';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { QuestionSet, questionsToSections } from '@/components/learning/QuestionSet';
import { PdfButton } from '@/components/learning/PdfButton';
import type { LibQuestion } from '@/content/library';
import { VISUAL_CREDIT, type VisualTopic, type VisualWord } from '@/content/vocabVisual';
import { speak } from '@/lib/speech';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import type { Worksheet } from '@/lib/worksheet';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';

const WearingVerbs = lazy(() => import('@/features/learn/inserts/Themes').then((m) => ({ default: m.WearingVerbs })));
const SpellingDictation = lazy(() => import('@/features/learn/inserts/Themes').then((m) => ({ default: m.SpellingDictation })));
const WeatherForecast = lazy(() => import('@/features/learn/inserts/Themes').then((m) => ({ default: m.WeatherForecast })));
const TemperatureScale = lazy(() => import('@/features/learn/inserts/Themes').then((m) => ({ default: m.TemperatureScale })));

export function shuffle<T>(a: T[]) {
  const b = [...a];
  for (let i = b.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [b[i], b[j]] = [b[j]!, b[i]!];
  }
  return b;
}

/** Spanish copy in the data may carry <b>/<i>; render it as HTML (it is our own content). */
export function Rich({ html, className }: { html: string; className?: string }) {
  return <span className={className} dangerouslySetInnerHTML={{ __html: html }} />;
}

const said = (w: VisualWord) => w.say ?? w.en.replace(/\s*\(.*?\)\s*/g, ' ').split(' / ')[0]!.trim();

/** The picture of a card: an image on white, or a large emoji. */
export function Picture({ w, className, size = 'md' }: { w: VisualWord; className?: string; size?: 'sm' | 'md' | 'lg' }) {
  return (
    <div className={cn('relative flex items-center justify-center overflow-hidden rounded-[14px] bg-white', className)}>
      {w.img ? (
        <img src={w.img} alt="" loading="lazy" decoding="async" draggable={false} className="h-full w-full object-contain p-1.5" />
      ) : (
        <span className={cn('leading-none select-none', size === 'lg' ? 'text-[64px]' : size === 'sm' ? 'text-[34px]' : 'text-[46px]')} aria-hidden>
          {w.emoji ?? '🖼️'}
        </span>
      )}
      {w.flag && (
        <img src={w.flag} alt="" loading="lazy" className="absolute right-1.5 bottom-1.5 h-[30%] max-h-12 w-auto rounded-[4px] object-contain drop-shadow" />
      )}
    </div>
  );
}

/** "Imágenes e íconos: Freepik / Flaticon". */
export function VisualCredit({ className }: { className?: string }) {
  return <p className={cn('text-label-3 text-[11.5px] leading-snug', className)}>{VISUAL_CREDIT}</p>;
}

// ---------------------------------------------------------------- cards --

function WordCard({ w, color, open, onToggle }: { w: VisualWord; color: string; open: boolean; onToggle: () => void }) {
  const showEs = useSettings((s) => s.spanishHints);
  return (
    <motion.div
      layout
      className={cn('bg-card shadow-card overflow-hidden rounded-[18px]', open && 'col-span-2')}
      style={open ? { boxShadow: `0 0 0 2px ${color}` } : undefined}
    >
      <div className={cn(open && 'sm:flex')}>
        <button
          type="button"
          onClick={() => {
            onToggle();
            if (!open) speak(said(w));
          }}
          aria-expanded={open}
          aria-label={`${w.en}: ver ejemplo`}
          className={cn('block w-full p-2 text-left', open && 'sm:w-1/2')}
        >
          <Picture w={w} className="aspect-[4/3] w-full" />
          <div className="px-1.5 pt-2 pb-1">
            <div className="text-[16px] leading-tight font-bold">{w.en}</div>
            {w.nat && (
              <div className="text-[13.5px] font-semibold" style={{ color: ink(color) }}>
                {w.nat}
              </div>
            )}
            {(showEs || open) && <div className="text-label-2 mt-0.5 text-[12.5px] leading-snug">{w.es}</div>}
          </div>
        </button>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className={cn('overflow-hidden px-3 pb-3 sm:w-1/2 sm:pt-3')}
            >
              {w.def && <p className="text-[13.5px] leading-snug italic">= {w.def}</p>}
              <div className="mt-2 flex items-start gap-1.5 rounded-[12px] px-2.5 py-2 text-[14.5px] leading-snug" style={{ background: tint(color, 10) }}>
                <span className="min-w-0 flex-1">{w.ex}</span>
                <SpeakButton text={w.ex} size={16} />
              </div>
              {w.note && <p className="text-label-2 mt-2 text-[12.5px] leading-snug">💡 {w.note}</p>}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function Figures({ topic }: { topic: VisualTopic }) {
  const [open, setOpen] = useState(0);
  const figs = topic.figures ?? [];
  if (!figs.length) return null;
  const f = figs[Math.min(open, figs.length - 1)]!;
  return (
    <Card className="overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 p-4 pb-3">
        <h4 className="text-headline flex items-center gap-2">
          <ImageIcon size={18} style={{ color: ink(topic.color) }} /> Mira la infografía
        </h4>
        {figs.length > 1 && (
          <div className="no-scrollbar -mx-1 flex max-w-full gap-1.5 overflow-x-auto px-1 py-0.5">
            {figs.map((x, i) => (
              <Chip key={x.src} active={i === open} onClick={() => setOpen(i)} className="h-7 px-3 text-[13px]">
                {x.title}
              </Chip>
            ))}
          </div>
        )}
      </div>
      <a href={f.src} target="_blank" rel="noreferrer" className="group relative block bg-white" aria-label={`Abrir en grande: ${f.title}`}>
        <img src={f.src} alt={f.title} loading="lazy" width={f.w} height={f.h} className="mx-auto block h-auto max-h-[70vh] w-auto max-w-full" />
        <span className="material absolute right-3 bottom-3 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[12px] font-semibold opacity-90">
          <Expand size={13} /> Ver en grande
        </span>
      </a>
      <div className="text-label-2 px-4 py-2.5 text-[13px]">
        <b className="text-label">{f.title}</b>
        {f.titleEs && <> · {f.titleEs}</>}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------- practice --

type Mode = 'picture' | 'listen' | 'meaning' | 'gap';

function useAwardOnce(topic: VisualTopic, title: string) {
  const award = useProgress((s) => s.award);
  return (right: number, total: number) =>
    award({
      kind: 'flashcards',
      title: `Vocabulario visual · ${topic.title} · ${title}`,
      skill: 'vocabulary',
      xp: 3 + right,
      score: Math.round((right / Math.max(1, total)) * 100),
      level: topic.level,
      ref: `vocab-visual:${topic.id}`,
    });
}

interface Round {
  target: VisualWord;
  options: VisualWord[];
  /** Countries: ask for the nationality from the flag. */
  flagQ?: boolean;
}

function makeRounds(items: VisualWord[], n = 8, k = 4): Round[] {
  return shuffle(items)
    .slice(0, n)
    .map((target, i) => ({
      target,
      options: shuffle([target, ...shuffle(items.filter((x) => x.id !== target.id && x.en !== target.en)).slice(0, k - 1)]),
      flagQ: !!target.flag && i % 2 === 1,
    }));
}

/** One question at a time with instant feedback: picture → word, sound → picture, definition → expression. */
function PickGame({ topic, mode }: { topic: VisualTopic; mode: Exclude<Mode, 'gap'> }) {
  const [seed, setSeed] = useState(0);
  const rounds = useMemo(() => makeRounds(topic.items), [seed, topic.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [pick, setPick] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const done = useAwardOnce(topic, mode === 'picture' ? 'imagen → palabra' : mode === 'listen' ? 'escucha y elige' : 'significado');
  const r = rounds[i];
  const color = topic.color;
  const label = (w: VisualWord, flagQ?: boolean) => (flagQ ? w.nat! : w.en);

  const choose = (w: VisualWord) => {
    if (pick || !r) return;
    setPick(w.id);
    if (w.id === r.target.id) setScore((s) => s + 1);
    speak(r.flagQ ? `${r.target.nat}` : said(r.target));
  };
  const next = () => {
    const n = i + 1;
    setPick(null);
    setI(n);
    if (n >= rounds.length) done(score, rounds.length);
  };
  const restart = () => (setSeed((s) => s + 1), setI(0), setScore(0), setPick(null));

  if (!r)
    return (
      <div className="flex flex-wrap items-center gap-3 py-2">
        <span className="text-[18px] font-bold">
          {score}/{rounds.length} {score === rounds.length ? '🏆' : score >= rounds.length * 0.7 ? '👏' : '💪'}
        </span>
        <Button variant="gray" onClick={restart}>
          <Shuffle size={16} /> Jugar otra vez
        </Button>
      </div>
    );

  const verdict = (w: VisualWord) => (pick ? (w.id === r.target.id ? 'right' : w.id === pick ? 'wrong' : 'idle') : 'idle');
  return (
    <div>
      <div className="text-label-2 mb-3 flex items-center justify-between text-[13px] font-semibold">
        <span>
          {i + 1} / {rounds.length}
        </span>
        <span className="tabular-nums">✓ {score}</span>
      </div>
      {mode === 'listen' ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <Button onClick={() => speak(said(r.target))} style={{ background: color }} className="text-white">
              <Volume2 size={17} /> Escuchar
            </Button>
            <span className="text-label-2 text-[14px]">{r.target.def ? 'Escucha y elige el significado.' : 'Escucha y toca la imagen correcta.'}</span>
          </div>
          {r.target.def ? (
            <div className="grid gap-2 sm:grid-cols-2">
              {r.options.map((w) => (
                <OptionButton key={w.id} state={verdict(w)} onClick={() => choose(w)} disabled={!!pick}>
                  {w.es}
                </OptionButton>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {r.options.map((w) => {
                const v = verdict(w);
                return (
                  <button
                    key={w.id}
                    type="button"
                    disabled={!!pick}
                    onClick={() => choose(w)}
                    className={cn(
                      'bg-fill-2 rounded-[16px] p-1.5 text-left transition',
                      v === 'right' && 'ring-ios-green ring-[3px]',
                      v === 'wrong' && 'ring-ios-red ring-[3px]',
                    )}
                  >
                    <Picture w={w} className="aspect-[4/3] w-full" size="sm" />
                    {pick && <div className="px-1 pt-1 text-[13.5px] font-semibold">{w.en}</div>}
                  </button>
                );
              })}
            </div>
          )}
        </>
      ) : (
        <div className="grid gap-3 sm:grid-cols-[minmax(0,260px)_1fr] sm:items-start">
          {mode === 'picture' ? (
            <Picture
              w={r.flagQ ? { ...r.target, img: r.target.flag, flag: undefined } : { ...r.target, flag: undefined }}
              className="aspect-[4/3] w-full max-w-[320px] sm:max-w-none"
              size="lg"
            />
          ) : (
            <div className="rounded-[16px] p-4" style={{ background: tint(color, 10) }}>
              <div className="text-label-2 text-[12px] font-bold tracking-wide uppercase">Significado</div>
              <div className="mt-1 text-[18px] leading-snug font-semibold">{r.target.def ?? r.target.es}</div>
              <div className="mt-2 text-[28px] leading-none">{r.target.emoji ?? ''}</div>
            </div>
          )}
          <div>
            <p className="text-label-2 mb-2 text-[14px]">{r.flagQ ? 'What nationality is this flag?' : mode === 'picture' ? 'What’s this?' : 'Which expression is it?'}</p>
            <div className="grid gap-2">
              {r.options.map((w) => (
                <OptionButton key={w.id} state={verdict(w)} onClick={() => choose(w)} disabled={!!pick}>
                  {label(w, r.flagQ)}
                </OptionButton>
              ))}
            </div>
          </div>
        </div>
      )}
      {pick && (
        <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <p className="min-w-0 flex-1 text-[14px]">
            <b>{r.flagQ ? `${r.target.en} → ${r.target.nat}` : r.target.en}</b> <span className="text-label-2">= {r.target.es}</span>
          </p>
          <Button size="sm" onClick={next}>
            {i + 1 < rounds.length ? 'Siguiente' : 'Ver resultado'}
          </Button>
        </motion.div>
      )}
    </div>
  );
}

function OptionButton({ state, children, ...p }: { state: 'right' | 'wrong' | 'idle'; children: ReactNode; onClick: () => void; disabled: boolean }) {
  return (
    <button
      type="button"
      {...p}
      className={cn(
        'flex min-h-11 items-center justify-between gap-2 rounded-[12px] px-3.5 py-2 text-left text-[15.5px] font-medium transition-colors',
        state === 'right' ? 'bg-ios-green text-white' : state === 'wrong' ? 'bg-ios-red text-white' : 'bg-fill-2 hover:bg-fill',
      )}
    >
      <span>{children}</span>
      {state === 'right' && <Check size={17} />}
      {state === 'wrong' && <X size={17} />}
    </button>
  );
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Gap-fill from the example sentences: the word is blanked, the options are other words of the topic. */
export function gapQuestions(topic: VisualTopic, n = 8): LibQuestion[] {
  const pool = topic.items.filter((x) => !x.nogap && x.form);
  // Forms as they would appear mid-sentence ("Gale" → "gale", but "Europe" stays).
  const mid = (y: VisualWord) => (/^[a-z]/.test(y.en) ? y.form!.charAt(0).toLowerCase() + y.form!.slice(1) : y.form!);
  const cap = (f: string) => f.charAt(0).toUpperCase() + f.slice(1);
  return shuffle(pool)
    .slice(0, n)
    .map((x) => {
      const q = x.ex.replace(new RegExp(esc(x.form!)), '____');
      const start = q.startsWith('____');
      const fit = (y: VisualWord) => (start ? cap(mid(y)) : mid(y));
      const right = fit(x);
      const wrong = shuffle(pool.filter((y) => y.id !== x.id))
        .map(fit)
        .filter((f, i, a) => f.toLowerCase() !== right.toLowerCase() && a.indexOf(f) === i)
        .slice(0, 3);
      const options = shuffle([right, ...wrong]);
      return { type: 'mc' as const, q, options, answer: options.indexOf(right), explain_es: `${x.en} = ${x.es}` };
    });
}

function GapPractice({ topic }: { topic: VisualTopic }) {
  const [round, setRound] = useState(0);
  const qs = useMemo(() => gapQuestions(topic), [round, topic.id]); // eslint-disable-line react-hooks/exhaustive-deps
  const done = useAwardOnce(topic, 'completa');
  if (qs.length < 3) return <p className="text-label-2 text-[14px]">Este tema se practica mejor escuchando: prueba «Escucha y elige».</p>;
  return (
    <div>
      <div className="mb-2 flex justify-end">
        <Button size="sm" variant="plain" onClick={() => setRound((r) => r + 1)}>
          <Shuffle size={15} /> Otras frases
        </Button>
      </div>
      <QuestionSet key={round} questions={qs} color={topic.color} onChecked={done} />
    </div>
  );
}

export function topicWorksheet(topic: VisualTopic): Worksheet {
  return {
    title: `${topic.title}`,
    subtitle: `${topic.titleEs} · Vocabulario visual`,
    level: topic.level,
    intro: 'Study the words, then complete the sentences.',
    sections: [
      { kind: 'words', title: 'Word bank', items: topic.items.map((x) => ({ en: x.nat ? `${x.en} – ${x.nat}` : x.en, es: x.es, note: x.def ?? x.ex })) },
      ...questionsToSections(gapQuestions(topic, 10)),
    ],
    credits: topic.credit ? `Material de ECYR English. ${VISUAL_CREDIT}` : 'Material original de ECYR English.',
  };
}

function Practice({ topic }: { topic: VisualTopic }) {
  const abstract = topic.items.filter((x) => x.def).length > topic.items.length / 2;
  const canGap = topic.items.filter((x) => !x.nogap && x.form).length >= 3;
  const modes: { value: Mode; label: ReactNode }[] = [
    abstract
      ? { value: 'meaning', label: <span className="inline-flex items-center gap-1.5"><Sparkles size={14} /> Significado</span> }
      : topic.extra !== 'spelling' && { value: 'picture' as Mode, label: <span className="inline-flex items-center gap-1.5"><ImageIcon size={14} /> Imagen</span> },
    { value: 'listen', label: <span className="inline-flex items-center gap-1.5"><Headphones size={14} /> Escucha</span> },
    canGap && { value: 'gap' as Mode, label: <span className="inline-flex items-center gap-1.5"><PenLine size={14} /> Completa</span> },
  ].filter(Boolean) as { value: Mode; label: ReactNode }[];
  const [mode, setMode] = useState<Mode>(modes[0]!.value);
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-title-3 flex items-center gap-2">
          <Sparkles size={20} style={{ color: ink(topic.color) }} /> Practica
        </h4>
        <div className="no-scrollbar max-w-full overflow-x-auto">
          <Segmented<Mode> size="sm" value={mode} onChange={setMode} options={modes} />
        </div>
      </div>
      {mode === 'gap' ? <GapPractice topic={topic} /> : <PickGame key={mode} topic={topic} mode={mode} />}
    </Card>
  );
}

// --------------------------------------------------------------- lesson --

/**
 * A visual vocabulary lesson: picture cards with sound, meaning and example,
 * the infographic, the topic's own activity and practice.
 */
export function VisualLesson({ topic, header = true }: { topic: VisualTopic; header?: boolean }) {
  const groups = useMemo(() => [...new Set(topic.items.map((x) => x.group).filter(Boolean))] as string[], [topic]);
  const [group, setGroup] = useState<string>('all');
  const [open, setOpen] = useState<string | null>(null);
  const items = topic.items.filter((x) => group === 'all' || x.group === group);
  const color = topic.color;
  return (
    <div className="space-y-4">
      <Card
        className="overflow-hidden"
        style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 16%, var(--card)), var(--card) 72%)` }}
      >
        <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:p-5">
          {topic.cover && (
            <div className="hidden h-28 w-36 shrink-0 overflow-hidden rounded-[16px] bg-white sm:block">
              <img src={topic.cover} alt="" className="h-full w-full object-contain p-1.5" />
            </div>
          )}
          <div className="min-w-0 flex-1">
            {header && (
              <div className="flex flex-wrap items-center gap-2">
                <LevelChip level={topic.level} />
                <span className="text-label-2 text-[13px] font-semibold">{topic.items.length} palabras</span>
              </div>
            )}
            <h3 className="mt-1 text-[22px] leading-tight font-extrabold" style={{ color: ink(color) }}>
              {topic.emoji} {topic.title} <span className="text-label-2 text-[15px] font-semibold">· {topic.titleEs}</span>
            </h3>
            <p className="mt-1.5 text-[15px] leading-snug">
              <Rich html={topic.intro_es} />
            </p>
            {topic.tip_es && (
              <p className="text-label-2 mt-2 text-[13.5px] leading-snug">
                💡 <Rich html={topic.tip_es} />
              </p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Button size="sm" variant="tinted" onClick={() => speak(topic.items.map((x) => said(x)).join('. ') + '.')}>
                <Volume2 size={15} /> Escuchar todas
              </Button>
              <PdfButton build={() => topicWorksheet(topic)} />
            </div>
          </div>
        </div>
      </Card>

      {groups.length > 1 && (
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
          <Chip active={group === 'all'} onClick={() => setGroup('all')}>
            Todas · {topic.items.length}
          </Chip>
          {groups.map((g) => (
            <Chip key={g} active={group === g} onClick={() => setGroup(g)}>
              {g}
            </Chip>
          ))}
        </div>
      )}
      <p className="text-label-2 px-1 text-[13px]">Toca una tarjeta para escucharla y ver el ejemplo.</p>
      <motion.div layout className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {items.map((w) => (
          <WordCard key={w.id} w={w} color={color} open={open === w.id} onToggle={() => setOpen(open === w.id ? null : w.id)} />
        ))}
      </motion.div>
      {topic.credit && <VisualCredit className="px-1" />}

      <Figures topic={topic} />

      {topic.extra && (
        <Suspense fallback={null}>
          {topic.extra === 'wearing' && <WearingVerbs groups={false} />}
          {topic.extra === 'spelling' && <SpellingDictation />}
          {topic.extra === 'forecast' && <WeatherForecast />}
          {topic.extra === 'weather' && <TemperatureScale />}
        </Suspense>
      )}

      <Practice topic={topic} />
    </div>
  );
}
