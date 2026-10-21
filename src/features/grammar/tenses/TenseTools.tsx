import { useDeferredValue, useMemo, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Check, ChevronLeft, ChevronRight, Eye, RotateCcw, Search, Shuffle, Wand2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { PageLoader, Toggle } from '@/components/ui/Misc';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { useAsync } from '@/hooks/useAsync';
import { loadVerbLab } from '@/content/levels';
import { useProgress } from '@/store/progress';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';
import {
  BUILD_ORDER,
  DEFAULT_TIME,
  EXAMPLES,
  FAMILY_COLOR,
  KIND_INFO,
  MISTAKE_EXAMPLES,
  SUBJECTS,
  TENSES,
  TIME_PRESETS,
  kindFamily,
  type ClauseKind,
  type TenseId,
} from './data';
import { buildLexicon, parseSentence, type Clause, type Lexicon, type ParseResult, type Role, type VerbEntry } from './parser';
import { conjugate, type Polarity } from './conjugate';
import { buildTimeline, type TimelineModel } from './timeline';
import { TenseTimeline } from './TenseTimeline';

// ------------------------------------------------------------------ shared --

let lexPromise: Promise<Lexicon> | null = null;
const loadLexicon = () => (lexPromise ??= loadVerbLab().then((d) => buildLexicon(d.verbs)));

/** Renders children once the Verb Lab bank is loaded and indexed. */
export function WithLexicon({ children }: { children: (lex: Lexicon) => ReactNode }) {
  const { data, error } = useAsync(loadLexicon, []);
  if (error) return <Card className="text-label-2 p-6 text-center">No se pudo cargar el banco de verbos.</Card>;
  if (!data) return <PageLoader />;
  return <>{children(data)}</>;
}

export const ROLE_COLOR: Record<Role, string> = {
  subject: 'var(--blue)',
  aux: 'var(--orange)',
  verb: 'var(--green)',
  neg: 'var(--red)',
  time: 'var(--purple)',
  conn: 'var(--indigo)',
  other: 'var(--label-3)',
};
const ROLE_LABEL: [Role, string][] = [
  ['subject', 'Sujeto'],
  ['aux', 'Auxiliar'],
  ['verb', 'Verbo principal'],
  ['neg', 'Negación'],
  ['time', 'Tiempo'],
];

const pick = <T,>(a: T[], n: number) => [...a].sort(() => Math.random() - 0.5).slice(0, n);

export function RoleLegend({ className }: { className?: string }) {
  return (
    <div className={cn('text-label-2 flex flex-wrap gap-x-3 gap-y-1 text-[12px] font-medium', className)}>
      {ROLE_LABEL.map(([r, l]) => (
        <span key={r} className="inline-flex items-center gap-1">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: ROLE_COLOR[r] }} />
          {l}
        </span>
      ))}
    </div>
  );
}

/** The sentence split into colour-coded chips. */
function PieceChips({ r }: { r: ParseResult }) {
  const pieces = r.pieces.filter((p) => !p.hidden && !p.punct);
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {pieces.map((p, i) => {
        const joinPrev = i > 0 && pieces[i - 1]!.end === p.start;
        const c = ROLE_COLOR[p.role];
        return (
          <motion.span
            layout
            key={`${p.start}-${p.surface}`}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn('rounded-[8px] px-2 py-1 text-[15px] font-semibold', joinPrev && '-ml-1.5 rounded-l-none', p.role === 'other' && 'font-medium')}
            style={p.role === 'other' ? { background: 'var(--fill-2)', color: 'var(--label)' } : { background: tint(c, 18), color: ink(c, 62) }}
          >
            {p.surface}
          </motion.span>
        );
      })}
    </div>
  );
}

const nameOf = (k: ClauseKind) => (k === 'modal' || k === 'imperative' ? KIND_INFO[k] : TENSES[k]);

function ClauseInfo({ c, n, total }: { c: Clause; n?: number; total: number }) {
  const info = nameOf(c.kind);
  const color = c.futureRef ? FAMILY_COLOR.future : FAMILY_COLOR[kindFamily(c.kind)];
  const formula = c.kind in TENSES ? TENSES[c.kind as TenseId].formula : '';
  const notes: string[] = [];
  if (c.passive) notes.push('voz pasiva (be + participio)');
  if (c.futureRef && c.kind === 'presentContinuous') notes.push('aquí con valor de futuro: un plan ya acordado');
  else if (c.futureRef) notes.push('presente con valor de futuro (horario o tras when/if/as soon as)');
  if (c.note === 'haveGot') notes.push('have got = tener (posesión)');
  if (c.note === 'haveTo') notes.push('have to = tener que (obligación)');
  if (c.note === 'wasGoingTo') notes.push('was/were going to = un plan del pasado que quizá no se cumplió');
  const pol = c.polarity === 'q' ? 'Pregunta' : c.polarity === 'neg' ? 'Negativa' : 'Afirmativa';
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-[14px] p-3" style={{ background: tint(color, 10), boxShadow: `inset 3px 0 0 ${color}` }}>
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {total > 1 && n !== undefined && (
          <span className="flex h-5 w-5 items-center justify-center rounded-full text-[11px] font-extrabold text-white" style={{ background: color }}>
            {n}
          </span>
        )}
        <span className="text-[17px] font-bold" style={{ color: ink(color, 66) }}>
          {info.en}
        </span>
        <span className="text-label-2 text-[14px] font-medium">· {info.es}</span>
        <span className="bg-fill text-label-2 ml-auto rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase">{pol}</span>
      </div>
      <p className="mt-1 text-[14px] leading-snug">{info.use_es}</p>
      {formula && <p className="text-label-2 mt-1 font-mono text-[12.5px]">{formula}</p>}
      {notes.length > 0 && <p className="text-label-2 mt-1 text-[12.5px] italic">{notes.join(' · ')}</p>}
    </motion.div>
  );
}

function Warnings({ r, onFix }: { r: ParseResult; onFix?: (s: string) => void }) {
  if (!r.warnings.length) return null;
  return (
    <div className="space-y-2">
      {r.warnings.map((w) => (
        <motion.div
          key={w.msg}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-start gap-2 rounded-[14px] p-3 text-[14px]"
          style={{ background: tint('var(--orange)', 14) }}
        >
          <AlertTriangle size={17} className="text-ink-orange mt-0.5 shrink-0" />
          <div className="min-w-0 flex-1">
            <div>{w.msg}</div>
            {w.fixed && onFix && (
              <button type="button" onClick={() => onFix(w.fixed!)} className="text-ink-green mt-1 inline-flex items-center gap-1 text-left font-semibold">
                <Wand2 size={14} className="shrink-0" /> {w.fixed}
              </button>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
}

const realClauses = (r: ParseResult) => r.clauses.filter((c) => c.note !== 'noverb' && c.lemma);

/** Chronological numbers, the same the timeline badges use. */
function badgeOrder(model: TimelineModel) {
  const out = new Map<number, number>();
  for (const m of model.marks) if (m.type === 'bar' && m.badge !== undefined) out.set(Number(m.id.slice(1).split(':')[0]), m.badge);
  return out;
}

/** Timeline without the time-expression labels (Practice shows the shape only). */
function canonicalModel(lex: Lexicon, t: TenseId): TimelineModel {
  const m = buildTimeline(parseSentence(TENSES[t].example, lex));
  return { ...m, marks: m.marks.filter((x) => x.type !== 'tag') };
}

// -------------------------------------------------------------- Write mode --

export function WriteMode({ lex, focus, compact = false, initial }: { lex: Lexicon; focus?: TenseId[]; compact?: boolean; initial?: string }) {
  const pool = useMemo(() => EXAMPLES.filter((e) => !focus || focus.includes(e.tense)), [focus]);
  const [text, setText] = useState(() => initial ?? pool[0]?.text ?? 'I have already seen that movie.');
  const [samples, setSamples] = useState(() => pick(pool, compact ? 3 : 5));
  const deferred = useDeferredValue(text);
  const r = useMemo(() => parseSentence(deferred, lex), [deferred, lex]);
  const model = useMemo(() => buildTimeline(r), [r]);
  const cs = realClauses(r);
  const order = badgeOrder(model);
  return (
    <Card className={cn('space-y-4', compact ? 'p-4' : 'p-5')}>
      <div>
        <label className="text-label-2 text-[12px] font-bold tracking-wide uppercase" htmlFor="tt-input">
          Escribe una frase en inglés
        </label>
        <div className="bg-fill-2 mt-1.5 flex items-center gap-1 rounded-[14px] pr-1.5 focus-within:ring-2 focus-within:ring-[var(--blue)]">
          <input
            id="tt-input"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="When I arrived, she had left."
            autoComplete="off"
            autoCapitalize="sentences"
            spellCheck={false}
            className="placeholder:text-label-3 h-12 min-w-0 flex-1 bg-transparent px-3.5 text-[17px] outline-none"
          />
          {text && <SpeakButton text={text} />}
          {text && (
            <button type="button" aria-label="Borrar" onClick={() => setText('')} className="text-label-3 rounded-full p-1.5">
              <X size={18} />
            </button>
          )}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <span className="text-label-2 text-[12.5px] font-semibold">Prueba:</span>
          {samples.map((s) => (
            <button key={s.text} type="button" onClick={() => setText(s.text)} className="bg-fill-2 hover:bg-fill rounded-full px-2.5 py-1 text-left text-[13px]">
              {s.text}
            </button>
          ))}
          <button type="button" aria-label="Otras frases" onClick={() => setSamples(pick(pool, compact ? 3 : 5))} className="text-ink-blue rounded-full p-1">
            <Shuffle size={15} />
          </button>
        </div>
        {!compact && (
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
            <span className="text-label-2 text-[12.5px] font-semibold">Errores típicos:</span>
            {MISTAKE_EXAMPLES.map((s) => (
              <button key={s} type="button" onClick={() => setText(s)} className="rounded-full px-2.5 py-1 text-left text-[13px]" style={{ background: tint('var(--orange)', 12) }}>
                {s}
              </button>
            ))}
          </div>
        )}
      </div>

      <TenseTimeline model={model} compact={compact} label={cs.map((c) => nameOf(c.kind).en).join(', ')} />

      {cs.length ? (
        <>
          <div className="space-y-2">
            <PieceChips r={r} />
            <RoleLegend />
          </div>
          <div className={cn('grid gap-2', cs.length > 1 && 'md:grid-cols-2')}>
            {cs.map((c, i) => (
              <ClauseInfo key={`${i}-${c.kind}`} c={c} n={order.get(i)} total={cs.length} />
            ))}
          </div>
        </>
      ) : (
        <p className="text-label-2 text-[14.5px]">{text.trim() ? 'No encuentro un verbo todavía… sigue escribiendo.' : 'Escribe o elige una frase para ver su línea del tiempo.'}</p>
      )}
      <Warnings r={r} onFix={setText} />
    </Card>
  );
}

// -------------------------------------------------------------- Build mode --

type TimeChoice = 'auto' | 'none' | string;

function VerbPicker({ lex, value, onChange }: { lex: Lexicon; value: VerbEntry; onChange: (v: VerbEntry) => void }) {
  const [q, setQ] = useState('');
  const [open, setOpen] = useState(false);
  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    const starts = lex.list.filter((v) => v.en.startsWith(s));
    const rest = lex.list.filter((v) => !v.en.startsWith(s) && (v.en.includes(s) || v.es.toLowerCase().includes(s)));
    return [...starts, ...rest].slice(0, 30);
  }, [q, lex]);
  const quick = ['go', 'eat', 'play', 'study', 'write', 'see', 'work', 'live'].map((w) => lex.base.get(w)).filter((v): v is VerbEntry => !!v);
  return (
    <div className="relative">
      <label className="bg-fill-2 flex h-11 items-center gap-2 rounded-[12px] px-3 focus-within:ring-2 focus-within:ring-[var(--blue)]">
        <Search size={17} className="text-label-3 shrink-0" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={`${value.emoji} ${value.en} — busca otro verbo (inglés o español)`}
          className="placeholder:text-label-2 h-full min-w-0 flex-1 bg-transparent text-[16px] outline-none"
          aria-label="Buscar verbo"
        />
      </label>
      {open && matches.length > 0 && (
        <div className="bg-elevated shadow-card absolute top-12 right-0 left-0 z-20 max-h-64 overflow-y-auto rounded-[12px] p-1">
          {matches.map((v) => (
            <button
              key={v.en}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                onChange(v);
                setQ('');
                setOpen(false);
              }}
              className="hover:bg-fill-2 flex w-full items-center gap-2 rounded-[8px] px-2.5 py-2 text-left text-[14.5px]"
            >
              <span>{v.emoji}</span>
              <b>{v.en}</b>
              <span className="text-label-2 min-w-0 flex-1 truncate">{v.es}</span>
              <span className="text-label-3 shrink-0 text-[12px]">
                {v.past.join('/')} · {v.part.join('/')}
              </span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-2 flex flex-wrap gap-1.5">
        {quick.map((v) => (
          <button
            key={v.en}
            type="button"
            onClick={() => onChange(v)}
            className={cn('rounded-full px-2.5 py-1 text-[13px] font-medium', v.en === value.en ? 'bg-label text-bg' : 'bg-fill-2')}
          >
            {v.en}
          </button>
        ))}
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="min-w-0">
      <div className="text-label-2 mb-1.5 text-[12px] font-bold tracking-wide uppercase">{label}</div>
      {children}
    </div>
  );
}

export function BuildMode({ lex, focus, compact = false, passiveDefault = false }: { lex: Lexicon; focus?: TenseId[]; compact?: boolean; passiveDefault?: boolean }) {
  const order = BUILD_ORDER;
  const [subject, setSubject] = useState(SUBJECTS[3]!);
  const [verb, setVerb] = useState<VerbEntry>(() => lex.base.get(passiveDefault ? 'write' : 'eat') ?? lex.list[0]!);
  const [tense, setTense] = useState<TenseId>(focus?.find((t) => order.includes(t)) ?? 'presentSimple');
  const [polarity, setPolarity] = useState<Polarity>('pos');
  const [passiveWanted, setPassive] = useState(passiveDefault);
  const [contractions, setContractions] = useState(false);
  const [time, setTime] = useState<TimeChoice>('auto');
  const passive = passiveWanted && TENSES[tense].passive && verb.en !== 'be';
  const timeText = time === 'auto' ? DEFAULT_TIME[tense] : time === 'none' ? '' : time;
  const built = useMemo(() => conjugate({ subject, verb, tense, polarity, passive, contractions, time: timeText }), [subject, verb, tense, polarity, passive, contractions, timeText]);
  const model = useMemo(() => {
    const r = parseSentence(built.text, lex);
    // The tense is known here: trust it over the parser for ambiguous forms ("They read.").
    if (r.clauses[0] && r.clauses[0].kind !== tense) r.clauses[0].kind = tense;
    return buildTimeline(r);
  }, [built.text, lex, tense]);
  const step = (d: number) => setTense(order[(order.indexOf(tense) + d + order.length) % order.length]!);
  const info = TENSES[tense];
  const color = FAMILY_COLOR[info.family];
  const presets = TIME_PRESETS.filter((p) => p.fits.includes(tense));

  return (
    <Card className={cn('space-y-4', compact ? 'p-4' : 'p-5')}>
      <div className={cn('grid gap-4', !compact && 'lg:grid-cols-2')}>
        <Field label="Sujeto">
          <div className="flex flex-wrap gap-1.5">
            {SUBJECTS.map((s) => (
              <button key={s.en} type="button" onClick={() => setSubject(s)} className={cn('h-8 rounded-full px-3 text-[14px] font-medium', s.en === subject.en ? 'bg-label text-bg' : 'bg-fill-2')}>
                {s.en}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Verbo (Verb Lab)">
          <VerbPicker lex={lex} value={verb} onChange={setVerb} />
        </Field>
        <Field label="Tiempo verbal">
          <select
            value={tense}
            onChange={(e) => setTense(e.target.value as TenseId)}
            className="bg-fill-2 h-11 w-full rounded-[12px] px-3 text-[16px] font-medium outline-none"
            aria-label="Tiempo verbal"
          >
            {order.map((t) => (
              <option key={t} value={t}>
                {TENSES[t].en} — {TENSES[t].es}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Expresión de tiempo">
          <select value={time} onChange={(e) => setTime(e.target.value)} className="bg-fill-2 h-11 w-full rounded-[12px] px-3 text-[16px] outline-none" aria-label="Expresión de tiempo">
            <option value="auto">Automática ({DEFAULT_TIME[tense]})</option>
            <option value="none">Sin expresión de tiempo</option>
            {presets.map((p) => (
              <option key={p.text} value={p.text}>
                {p.text} — {p.es}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <div className="flex flex-wrap items-center gap-x-5 gap-y-3">
        <Segmented<Polarity>
          value={polarity}
          onChange={setPolarity}
          options={[
            { value: 'pos', label: '＋ Afirmativa' },
            { value: 'neg', label: '− Negativa' },
            { value: 'q', label: '? Pregunta' },
          ]}
        />
        <label className={cn('flex items-center gap-2 text-[14.5px] font-medium', !info.passive && 'opacity-40')}>
          <Toggle checked={passive} onChange={(v) => info.passive && setPassive(v)} label="Voz pasiva" /> Pasiva
        </label>
        <label className="flex items-center gap-2 text-[14.5px] font-medium">
          <Toggle checked={contractions} onChange={setContractions} label="Contracciones" /> Contracciones
        </label>
      </div>

      <div className="rounded-[18px] p-4" style={{ background: tint(color, 9) }}>
        <div className="flex items-center gap-2">
          <Button variant="gray" size="sm" className="h-9 w-9 shrink-0 px-0" onClick={() => step(-1)} aria-label="Tiempo anterior">
            <ChevronLeft size={18} />
          </Button>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-label-2 text-[11px] font-bold tracking-wide uppercase">Cambiar tiempo</div>
            <AnimatePresence mode="popLayout" initial={false}>
              <motion.div key={tense} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="truncate text-[16px] font-bold" style={{ color: ink(color, 66) }}>
                {info.en} <span className="text-label-2 font-medium">· {info.es}</span>
              </motion.div>
            </AnimatePresence>
          </div>
          <Button variant="gray" size="sm" className="h-9 w-9 shrink-0 px-0" onClick={() => step(1)} aria-label="Tiempo siguiente">
            <ChevronRight size={18} />
          </Button>
        </div>
        <div className="mt-3 flex items-start gap-2">
          <motion.p layout className="min-w-0 flex-1 text-[22px] leading-[1.35] font-bold tracking-[-0.01em]">
            <AnimatePresence mode="popLayout" initial={false}>
              {built.parts.map((p, i) => (
                <motion.span
                  key={`${p.role}-${p.text}-${built.parts.slice(0, i).filter((q) => q.text === p.text).length}`}
                  layout
                  initial={{ opacity: 0, y: 8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.9 }}
                  transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  className="inline-block"
                  style={{ color: p.role === 'other' ? 'var(--label)' : ink(ROLE_COLOR[p.role], 64), marginLeft: i && !p.join ? '0.28em' : 0 }}
                >
                  {p.text}
                </motion.span>
              ))}
            </AnimatePresence>
          </motion.p>
          <SpeakButton text={built.text} className="mt-1" />
        </div>
        <RoleLegend className="mt-2" />
      </div>

      <TenseTimeline model={model} compact={compact} label={info.en} />
      <p className="text-[14px]">
        <b>Uso:</b> {info.use_es} <span className="text-label-2 font-mono text-[12.5px]">· {info.formula}</span>
      </p>
    </Card>
  );
}

// ---------------------------------------------------------------- Practice --

const SIMILAR: TenseId[][] = [
  ['usedTo', 'wouldHabit'],
  ['futureSimple', 'goingTo'],
];
function distractors(t: TenseId, n: number) {
  const all = [...BUILD_ORDER, 'wouldHabit' as TenseId].filter((x) => x !== t && !SIMILAR.some((g) => g.includes(t) && g.includes(x)));
  return pick(all, n);
}

function useScore(title: string) {
  const award = useProgress((s) => s.award);
  return (right: number, total: number) => award({ kind: 'game', title: `Tense Timeline · ${title}`, skill: 'grammar', xp: 10, score: Math.round((right / total) * 100), ref: 'grammar:tenses' });
}

function PickTimeline({ lex, focus, rounds = 8 }: { lex: Lexicon; focus?: TenseId[]; rounds?: number }) {
  const makeRound = () =>
    pick(
      EXAMPLES.filter((e) => !focus || focus.includes(e.tense)),
      rounds,
    ).map((e) => ({ ...e, options: pick([e.tense, ...distractors(e.tense, 2)], 3) }));
  const [round, setRound] = useState(makeRound);
  const [i, setI] = useState(0);
  const [chosen, setChosen] = useState<TenseId | null>(null);
  const [right, setRight] = useState(0);
  const save = useScore('Elige la línea');
  const q = round[i];
  const models = useMemo(() => (q ? q.options.map((t) => canonicalModel(lex, t)) : []), [q, lex]);
  const done = i >= round.length;
  if (done || !q)
    return (
      <Card className="p-6 text-center">
        <div className="text-[34px]">{right === round.length ? '🏆' : right >= round.length * 0.7 ? '👏' : '💪'}</div>
        <div className="text-title-3 mt-1">
          {right}/{round.length} correctas
        </div>
        <Button
          className="mt-4"
          variant="gray"
          onClick={() => {
            setRound(makeRound());
            setI(0);
            setRight(0);
            setChosen(null);
          }}
        >
          <RotateCcw size={16} /> Otra ronda
        </Button>
      </Card>
    );
  const choose = (t: TenseId) => {
    if (chosen) return;
    setChosen(t);
    const ok = t === q.tense;
    if (ok) setRight((x) => x + 1);
    if (i === round.length - 1) save(right + (ok ? 1 : 0), round.length);
  };
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="text-label-2 flex items-center justify-between text-[13px] font-semibold">
        <span>
          Frase {i + 1} de {round.length}
        </span>
        <span className="tabular-nums">✓ {right}</span>
      </div>
      <div className="flex items-start gap-2">
        <p className="min-w-0 flex-1 text-[20px] leading-snug font-bold">{q.text}</p>
        <SpeakButton text={q.text} />
      </div>
      <p className="text-label-2 text-[14px]">¿Qué línea del tiempo corresponde a esta frase?</p>
      <div className="grid gap-3 md:grid-cols-3">
        {q.options.map((t, k) => {
          const isRight = t === q.tense;
          const state = chosen ? (isRight ? 'right' : t === chosen ? 'wrong' : 'idle') : 'idle';
          return (
            <button
              key={t}
              type="button"
              onClick={() => choose(t)}
              disabled={!!chosen}
              className={cn('bg-fill-2 rounded-[16px] p-2 text-left transition-shadow', !chosen && 'hover:ring-2 hover:ring-[var(--blue)]')}
              style={state === 'right' ? { boxShadow: 'inset 0 0 0 2.5px var(--green)' } : state === 'wrong' ? { boxShadow: 'inset 0 0 0 2.5px var(--red)' } : undefined}
            >
              <div className="text-label-2 px-1 text-[12px] font-bold">Opción {String.fromCharCode(65 + k)}</div>
              <TenseTimeline model={models[k]!} compact />
              {chosen && (
                <div className={cn('px-1 pb-1 text-[13px] font-semibold', isRight ? 'text-ink-green' : 'text-label-2')}>
                  {TENSES[t].en} · {TENSES[t].es}
                </div>
              )}
            </button>
          );
        })}
      </div>
      {chosen && (
        <div className="flex flex-wrap items-center gap-3">
          <span className={cn('flex items-center gap-1.5 text-[15px] font-semibold', chosen === q.tense ? 'text-ink-green' : 'text-ink-red')}>
            {chosen === q.tense ? <Check size={18} /> : <X size={18} />}
            {chosen === q.tense ? '¡Exacto!' : `Era ${TENSES[q.tense].en}.`} <span className="text-label-2 font-normal">{TENSES[q.tense].use_es}</span>
          </span>
          <Button
            size="sm"
            className="ml-auto"
            onClick={() => {
              setI((x) => x + 1);
              setChosen(null);
            }}
          >
            Siguiente <ChevronRight size={16} />
          </Button>
        </div>
      )}
    </Card>
  );
}

function WriteForTimeline({ lex, focus, rounds = 6 }: { lex: Lexicon; focus?: TenseId[]; rounds?: number }) {
  const makeRound = () => pick(focus ?? [...BUILD_ORDER], Math.min(rounds, (focus ?? BUILD_ORDER).length)).concat(focus && focus.length < rounds ? pick(focus, rounds - focus.length) : []);
  const [targets, setTargets] = useState(makeRound);
  const [i, setI] = useState(0);
  const [text, setText] = useState('');
  const [checked, setChecked] = useState<ParseResult | null>(null);
  const [hint, setHint] = useState(false);
  const [right, setRight] = useState(0);
  const save = useScore('Escribe la frase');
  const target = targets[i];
  const model = useMemo(() => (target ? canonicalModel(lex, target) : null), [target, lex]);
  if (!target || !model)
    return (
      <Card className="p-6 text-center">
        <div className="text-[34px]">{right === targets.length ? '🏆' : '💪'}</div>
        <div className="text-title-3 mt-1">
          {right}/{targets.length} frases correctas
        </div>
        <Button
          className="mt-4"
          variant="gray"
          onClick={() => {
            setTargets(makeRound());
            setI(0);
            setRight(0);
            setChecked(null);
            setText('');
          }}
        >
          <RotateCcw size={16} /> Otra ronda
        </Button>
      </Card>
    );
  const kinds = checked ? realClauses(checked).map((c) => c.kind) : [];
  const ok = checked ? kinds.includes(target) : false;
  const check = () => {
    if (!text.trim() || checked) return;
    const r = parseSentence(text, lex);
    setChecked(r);
    const good = realClauses(r).some((c) => c.kind === target);
    if (good) setRight((x) => x + 1);
    if (i === targets.length - 1) save(right + (good ? 1 : 0), targets.length);
  };
  const info = TENSES[target];
  return (
    <Card className="space-y-4 p-4 sm:p-5">
      <div className="text-label-2 flex items-center justify-between text-[13px] font-semibold">
        <span>
          Línea {i + 1} de {targets.length}
        </span>
        <span className="tabular-nums">✓ {right}</span>
      </div>
      <p className="text-[15px]">Escribe una frase en inglés que encaje con esta línea del tiempo.</p>
      <div className="bg-fill-2 rounded-[16px] p-2">
        <TenseTimeline model={model} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setHint((h) => !h)} className="text-ink-blue inline-flex items-center gap-1 text-[14px] font-semibold">
          <Eye size={15} /> {hint ? 'Ocultar pista' : 'Ver pista'}
        </button>
        {hint && (
          <span className="text-label-2 text-[13.5px]">
            {info.es} · <span className="font-mono">{info.formula}</span>
          </span>
        )}
      </div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          check();
        }}
        className="flex gap-2"
      >
        <input
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            if (checked) setChecked(null);
          }}
          placeholder="Tu frase…"
          autoComplete="off"
          spellCheck={false}
          className="bg-fill-2 placeholder:text-label-3 h-11 min-w-0 flex-1 rounded-[12px] px-3 text-[16px] outline-none focus:ring-2 focus:ring-[var(--blue)]"
        />
        <Button type="submit" disabled={!text.trim() || !!checked}>
          Comprobar
        </Button>
      </form>
      {checked && (
        <div className="space-y-3">
          <div className={cn('flex items-start gap-2 text-[15px] font-semibold', ok ? 'text-ink-green' : 'text-ink-red')}>
            {ok ? <Check size={18} className="mt-0.5 shrink-0" /> : <X size={18} className="mt-0.5 shrink-0" />}
            <span>
              {ok
                ? `¡Bien! Es ${info.en}.`
                : kinds.length
                  ? `Tu frase está en ${kinds.map((k) => nameOf(k).en).join(' + ')}. Buscábamos ${info.en} (${info.formula}).`
                  : 'No encontré un verbo en tu frase.'}
            </span>
          </div>
          {kinds.length > 0 && !ok && <TenseTimeline model={buildTimeline(checked)} compact />}
          <Warnings r={checked} />
          <div className="flex justify-end">
            <Button
              size="sm"
              onClick={() => {
                setI((x) => x + 1);
                setChecked(null);
                setText('');
                setHint(false);
              }}
            >
              Siguiente <ChevronRight size={16} />
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}

export function PracticeMode({ lex, focus, compact = false }: { lex: Lexicon; focus?: TenseId[]; compact?: boolean }) {
  const [mode, setMode] = useState<'pick' | 'write'>('pick');
  return (
    <div className="space-y-3">
      <div className="no-scrollbar overflow-x-auto">
        <Segmented
          size={compact ? 'sm' : 'md'}
          value={mode}
          onChange={setMode}
          options={[
            { value: 'pick', label: 'Elige la línea' },
            { value: 'write', label: 'Escribe la frase' },
          ]}
        />
      </div>
      {mode === 'pick' ? <PickTimeline lex={lex} focus={focus} rounds={compact ? 5 : 8} /> : <WriteForTimeline lex={lex} focus={focus} rounds={compact ? 4 : 6} />}
    </div>
  );
}

// --------------------------------------------------------------------- Map --

export function TenseMap({ lex, onOpen }: { lex: Lexicon; onOpen?: (sentence: string) => void }) {
  const items = useMemo(
    () =>
      [...BUILD_ORDER, 'wouldHabit' as TenseId].map((t) => {
        const r = parseSentence(TENSES[t].example, lex);
        return { t, model: buildTimeline(r) };
      }),
    [lex],
  );
  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map(({ t, model }) => {
        const info = TENSES[t];
        const color = FAMILY_COLOR[info.family];
        return (
          <Card key={t} className="p-4" style={{ boxShadow: `inset 3px 0 0 ${color}` }}>
            <div className="flex items-baseline justify-between gap-2">
              <div className="min-w-0">
                <div className="text-[16px] font-bold" style={{ color: ink(color, 66) }}>
                  {info.en}
                </div>
                <div className="text-label-2 text-[13px]">{info.es}</div>
              </div>
              {onOpen && (
                <button type="button" onClick={() => onOpen(info.example)} className="text-ink-blue shrink-0 text-[13px] font-semibold">
                  Probar →
                </button>
              )}
            </div>
            <TenseTimeline model={model} compact className="mt-1" label={info.en} />
            <p className="mt-1 text-[14px] font-semibold italic">{info.example}</p>
            <p className="text-label-2 mt-0.5 text-[13px] leading-snug">{info.use_es}</p>
          </Card>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------- compact (units) --

type LabTab = 'write' | 'build' | 'practice';

/** Write / Build / Practice in one card, focused on a unit's tenses. */
export function TenseLab({ focus, passiveDefault = false, title = 'Tense Timeline' }: { focus?: TenseId[]; passiveDefault?: boolean; title?: string }) {
  const [tab, setTab] = useState<LabTab>('write');
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 px-1">
        <h4 className="text-headline">{title}</h4>
        <div className="no-scrollbar max-w-full overflow-x-auto">
          <Segmented<LabTab>
            size="sm"
            value={tab}
            onChange={setTab}
            options={[
              { value: 'write', label: 'Escribe' },
              { value: 'build', label: 'Construye' },
              { value: 'practice', label: 'Practica' },
            ]}
          />
        </div>
      </div>
      <WithLexicon>
        {(lex) => (
          <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}>
            {tab === 'write' && <WriteMode lex={lex} focus={focus} compact />}
            {tab === 'build' && <BuildMode lex={lex} focus={focus} compact passiveDefault={passiveDefault} />}
            {tab === 'practice' && <PracticeMode lex={lex} focus={focus} compact />}
          </motion.div>
        )}
      </WithLexicon>
    </div>
  );
}
