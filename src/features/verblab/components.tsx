/**
 * Verb Lab — the teaching utilities of "Verb Quest", rebuilt natively.
 * Every tool is a self-contained component so lessons can embed exactly the
 * piece they need (see unitTools.ts); VerbLabPage puts them all together.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Check, ChevronDown, RotateCcw, Search, Star, Timer, Trophy, Volume2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip, PageLoader } from '@/components/ui/Misc';
import { ProgressBar } from '@/components/ui/Progress';
import { RichText, stripTags } from '@/components/learning/RichText';
import { useAsync } from '@/hooks/useAsync';
import { loadPhrasalVerbs, loadVerbLab } from '@/content/levels';
import { PhrasalExplorer, type MindFamily } from './mindmap';
import { VerbBubble } from './VerbBubble';
import type { EdSound, LabVerb, VerbLabData, VerbPattern } from '@/content/types';
import { speak } from '@/lib/speech';
import { useSettings } from '@/store/settings';
import { useProgress } from '@/store/progress';
import { cn } from '@/lib/cn';

// ------------------------------------------------------------------ shared --

export function useVerbLab() {
  return useAsync(loadVerbLab, []);
}

/** Renders children once the Verb Lab data is loaded. */
export function WithVerbLab({ children }: { children: (d: VerbLabData) => React.ReactNode }) {
  const { data, loading } = useVerbLab();
  if (loading || !data) return <PageLoader />;
  return <>{children(data)}</>;
}

function useStored<T>(key: string, initial: T) {
  const [v, setV] = useState<T>(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : initial;
    } catch {
      return initial;
    }
  });
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(v));
    } catch {
      /* storage unavailable */
    }
  }, [key, v]);
  return [v, setV] as const;
}

function useSpeak() {
  const { accent, speechRate } = useSettings();
  return (text: string) => speak(text, { accent, rate: speechRate });
}

const SOUND_LABEL: Record<EdSound, string> = { t: '/t/', d: '/d/', id: '/ɪd/' };
const SOUND_COLOR: Record<EdSound, string> = { t: 'var(--blue)', d: 'var(--green)', id: 'var(--orange)' };

function shuffle<T>(a: T[]) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

// --------------------------------------------------------------- explorer --

type Filter = 'all' | 'irregular' | 'regular' | 't' | 'd' | 'id' | 'saved';

export function VerbExplorer({ data, initialFilter = 'all' }: { data: VerbLabData; initialFilter?: Filter }) {
  const [q, setQ] = useState('');
  const [filter, setFilter] = useState<Filter>(initialFilter);
  const [saved, setSaved] = useStored<string[]>('ecyr:verblab:saved', []);
  const [open, setOpen] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [limit, setLimit] = useState(60);
  const showEs = useSettings((s) => s.spanishHints);
  const openVerb = open ? (data.verbs.find((v) => v.en === open) ?? null) : null;

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return data.verbs.filter((v) => {
      if (filter === 'irregular' && v.type !== 'irregular') return false;
      if (filter === 'regular' && v.type !== 'regular') return false;
      if ((filter === 't' || filter === 'd' || filter === 'id') && v.sound !== filter) return false;
      if (filter === 'saved' && !saved.includes(v.en)) return false;
      if (!n) return true;
      return [v.en, v.past, v.part, v.es].some((x) => x.toLowerCase().includes(n));
    });
  }, [data, q, filter, saved]);

  const toggleSaved = (en: string) => setSaved((s) => (s.includes(en) ? s.filter((x) => x !== en) : [...s, en]));
  const FILTERS: [Filter, string][] = [
    ['all', `Todos · ${data.verbs.length}`],
    ['irregular', 'Irregulares'],
    ['regular', 'Regulares'],
    ['t', '-ed /t/'],
    ['d', '-ed /d/'],
    ['id', '-ed /ɪd/'],
    ['saved', `★ Mi lista · ${saved.length}`],
  ];

  return (
    <div>
      <label className="bg-card mb-3 flex h-11 items-center gap-2 rounded-[12px] px-3 shadow-card">
        <Search size={18} className="text-label-3" />
        <input
          value={q}
          onChange={(e) => {
            setQ(e.target.value);
            setLimit(60);
          }}
          placeholder="Busca un verbo en inglés o español…"
          className="placeholder:text-label-3 h-full flex-1 bg-transparent text-[16px] outline-none"
        />
      </label>
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-1">
        {FILTERS.map(([f, label]) => (
          <Chip key={f} active={filter === f} onClick={() => (setFilter(f), setLimit(60))}>
            {label}
          </Chip>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {list.slice(0, limit).map((v, i) => {
          const isOpen = open === v.en;
          const tint = v.type === 'irregular' ? 'var(--purple)' : 'var(--teal)';
          return (
            <motion.button
              key={v.en}
              type="button"
              onClick={(e) => {
                setAnchor(e.currentTarget);
                setOpen(isOpen ? null : v.en);
              }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min((i % 60) * 0.012, 0.5) }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.96 }}
              className={cn(
                'bg-card shadow-card relative flex flex-col items-center rounded-[20px] px-2 pt-4 pb-3 text-center transition-shadow',
                isOpen && 'shadow-[0_0_0_2.5px_var(--blue)]',
              )}
              style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${tint} 10%, var(--card)), var(--card) 70%)` }}
              aria-expanded={isOpen}
              aria-label={`${v.en}: ${v.past}, ${v.part}`}
            >
              <span className="absolute top-2 left-2 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase" style={{ color: tint, background: `color-mix(in srgb, ${tint} 14%, transparent)` }}>
                {v.type === 'irregular' ? 'Irr' : 'Reg'}
              </span>
              {saved.includes(v.en) && <Star size={13} fill="currentColor" className="text-ios-yellow absolute top-2 right-2" aria-label="En mi lista" />}
              <span className="text-[40px] leading-none drop-shadow-[0_2px_3px_rgb(0_0_0/0.12)]">{v.emoji}</span>
              <span className="mt-1.5 max-w-full truncate text-[17px] font-bold">{v.en}</span>
              <span className="text-label-2 max-w-full truncate text-[12px]">
                {v.past} · {v.part}
              </span>
              {showEs && <span className="text-label-3 mt-0.5 max-w-full truncate text-[11px]">{v.es}</span>}
            </motion.button>
          );
        })}
      </div>
      {openVerb && (
        <VerbBubble
          verb={openVerb}
          anchor={anchor}
          saved={saved.includes(openVerb.en)}
          onToggleSaved={() => toggleSaved(openVerb.en)}
          onClose={() => setOpen(null)}
        />
      )}
      {list.length > limit && (
        <div className="mt-4 text-center">
          <Button variant="gray" onClick={() => setLimit((l) => l + 90)}>
            Ver más ({list.length - limit})
          </Button>
        </div>
      )}
      {!list.length && <p className="text-label-2 py-10 text-center">No hay verbos con ese filtro.</p>}
    </div>
  );
}

// ------------------------------------------------------- -ed pronunciation --

const ED_RULES: { sound: EdSound; title: string; rule: string; desc: string }[] = [
  {
    sound: 't',
    title: 'Final sordo',
    rule: 'Si el verbo termina en un sonido sordo: p, k, s, ch, sh, f, x.',
    desc: 'La garganta no vibra en la última letra: la "-ed" suena como una T seca.',
  },
  {
    sound: 'd',
    title: 'Final sonoro',
    rule: 'Si el verbo termina en vocal o en un sonido sonoro: b, g, l, m, n, r, v, z…',
    desc: 'Las cuerdas vocales vibran: la "-ed" suena como una D suave, sin sílaba extra.',
  },
  {
    sound: 'id',
    title: 'Sílaba extra',
    rule: 'Solo si el verbo termina en sonido t o d.',
    desc: 'Se añade una sílaba: want → wan-ted, decide → deci-ded.',
  },
];

export function EdSoundRules({ data }: { data: VerbLabData }) {
  const say = useSpeak();
  const samples = useMemo(() => {
    const by: Record<EdSound, LabVerb[]> = { t: [], d: [], id: [] };
    for (const v of data.verbs) if (v.sound && by[v.sound].length < 6) by[v.sound].push(v);
    return by;
  }, [data]);
  return (
    <div className="grid gap-3 md:grid-cols-3">
      {ED_RULES.map((r) => (
        <Card key={r.sound} className="p-5">
          <div className="flex items-center justify-between">
            <h4 className="text-headline">{r.title}</h4>
            <span className="rounded-full px-2.5 py-0.5 text-[13px] font-bold text-white" style={{ background: SOUND_COLOR[r.sound] }}>
              {SOUND_LABEL[r.sound]}
            </span>
          </div>
          <p className="mt-2 text-[14px] font-medium">{r.rule}</p>
          <p className="text-label-2 mt-1 text-[14px]">{r.desc}</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {samples[r.sound].map((v) => (
              <button key={v.en} type="button" onClick={() => say(v.past)} className="bg-fill-2 hover:bg-fill inline-flex items-center gap-1 rounded-full px-3 py-1 text-[14px]">
                {v.past} <Volume2 size={12} className="text-ios-blue" />
              </button>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}

/** Hear a regular past form, choose its -ed sound. */
export function EdSoundDrill({ data, rounds = 10, title = 'Clasifica el sonido de -ed' }: { data: VerbLabData; rounds?: number; title?: string }) {
  const say = useSpeak();
  const award = useProgress((s) => s.award);
  const [seed, setSeed] = useState(0);
  const pool = useMemo(() => shuffle(data.verbs.filter((v) => v.sound)).slice(0, rounds), [data, rounds, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<EdSound | null>(null);
  const [score, setScore] = useState(0);
  const v = pool[i];

  useEffect(() => {
    if (v) say(v.past);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [v]);

  const choose = (s: EdSound) => {
    if (picked || !v) return;
    setPicked(s);
    if (s === v.sound) setScore((x) => x + 1);
  };
  const next = () => {
    if (i + 1 >= pool.length) {
      award({ kind: 'flashcards', title: 'Verb Lab · sonidos de -ed', skill: 'vocabulary', xp: 5 + score, ref: 'verblab:ed' });
    }
    setI(i + 1);
    setPicked(null);
  };

  if (!v)
    return (
      <Card className="flex flex-col items-center p-6 text-center">
        <Trophy className="text-ios-yellow" size={36} />
        <p className="text-title-3 mt-2">
          {score}/{pool.length} correctas
        </p>
        <Button className="mt-4" variant="gray" onClick={() => (setSeed((x) => x + 1), setI(0), setScore(0))}>
          <RotateCcw size={15} /> Otra ronda
        </Button>
      </Card>
    );

  return (
    <Card className="p-5">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-headline">{title}</h4>
        <span className="text-label-2 text-[13px] tabular-nums">
          {i + 1}/{pool.length} · ✓ {score}
        </span>
      </div>
      <ProgressBar value={i / pool.length} className="mb-4" />
      <div className="flex items-center justify-center gap-3 py-2">
        <span className="text-[30px]">{v.emoji}</span>
        <span className="text-[30px] font-bold tracking-tight">{v.past}</span>
        <button type="button" onClick={() => say(v.past)} className="text-ios-blue rounded-full p-2 hover:bg-fill-2" aria-label="Escuchar">
          <Volume2 size={22} />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {(['t', 'd', 'id'] as EdSound[]).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => choose(s)}
            className={cn(
              'rounded-[14px] py-3 text-[18px] font-bold transition-colors',
              !picked && 'bg-fill-2 hover:bg-fill',
              picked && s === v.sound && 'bg-ios-green text-white',
              picked === s && s !== v.sound && 'bg-ios-red text-white',
              picked && s !== v.sound && picked !== s && 'bg-fill-2 opacity-50',
            )}
          >
            {SOUND_LABEL[s]}
          </button>
        ))}
      </div>
      {picked && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-label-2 text-[14px]">
            <b className="text-label">{v.en}</b> → {v.past} suena {SOUND_LABEL[v.sound!]}
          </p>
          <Button size="sm" onClick={next}>
            Siguiente
          </Button>
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------- timed forms quiz --

const QUIZ_MS = 12_000;

/** "Time-travel" quiz: a verb appears, pick its past or participle before the clock runs out. */
export function VerbFormsQuiz({ data, only = 'all', field: fixedField }: { data: VerbLabData; only?: 'all' | 'irregular'; field?: 'past' | 'part' }) {
  const award = useProgress((s) => s.award);
  const say = useSpeak();
  const pool = useMemo(() => data.verbs.filter((v) => (only === 'irregular' ? v.type === 'irregular' : true)), [data, only]);
  const [hi, setHi] = useStored('ecyr:verblab:hi', { score: 0, streak: 0 });
  const [state, setState] = useState({ score: 0, streak: 0, round: 0 });
  const [q, setQ] = useState<{ v: LabVerb; field: 'past' | 'part'; options: string[] } | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [left, setLeft] = useState(1);
  const timer = useRef<number | undefined>(undefined);

  const newQuestion = () => {
    const v = pool[Math.floor(Math.random() * pool.length)]!;
    const field = fixedField ?? (Math.random() < 0.5 ? 'past' : 'part');
    const right = v[field];
    const wrong = new Set<string>();
    // plausible distractors: the other form, a regularised form, other verbs' forms
    if (v[field === 'past' ? 'part' : 'past'] !== right) wrong.add(v[field === 'past' ? 'part' : 'past']);
    if (v.type === 'irregular') wrong.add(v.en.endsWith('e') ? `${v.en}d` : `${v.en}ed`);
    while (wrong.size < 3) {
      const o = pool[Math.floor(Math.random() * pool.length)]!;
      if (o[field] !== right) wrong.add(o[field]);
    }
    setQ({ v, field, options: shuffle([right, ...[...wrong].filter((w) => w !== right).slice(0, 3)]) });
    setPicked(null);
    setLeft(1);
  };

  useEffect(() => {
    if (!q || picked) return;
    const start = Date.now();
    timer.current = window.setInterval(() => {
      const l = 1 - (Date.now() - start) / QUIZ_MS;
      if (l <= 0) {
        window.clearInterval(timer.current);
        setLeft(0);
        setPicked('__timeout__');
        setState((s) => ({ ...s, streak: 0, round: s.round + 1 }));
      } else setLeft(l);
    }, 100);
    return () => window.clearInterval(timer.current);
  }, [q, picked]);

  const choose = (o: string) => {
    if (!q || picked) return;
    window.clearInterval(timer.current);
    setPicked(o);
    const ok = o === q.v[q.field];
    say(`${q.v.en}, ${q.v.past}, ${q.v.part}`);
    setState((s) => {
      const n = { score: s.score + (ok ? 10 + Math.round(left * 10) : 0), streak: ok ? s.streak + 1 : 0, round: s.round + 1 };
      if (n.score > hi.score || n.streak > hi.streak) setHi({ score: Math.max(hi.score, n.score), streak: Math.max(hi.streak, n.streak) });
      if (n.round % 10 === 0) award({ kind: 'flashcards', title: 'Verb Lab · quiz de formas', skill: 'grammar', xp: Math.round(n.score / 20) + 5, ref: 'verblab:quiz' });
      return n;
    });
  };

  return (
    <Card className="overflow-hidden">
      <div className="text-label-2 flex flex-wrap items-center gap-x-4 gap-y-1 px-5 pt-4 text-[13px]">
        <span>
          Puntos <b className="text-label tabular-nums">{state.score}</b> (máx. {hi.score})
        </span>
        <span>
          Racha <b className="text-label tabular-nums">{state.streak}</b> (máx. {hi.streak})
        </span>
        <span>
          Ronda <b className="text-label tabular-nums">{state.round + (q ? 1 : 0)}</b>
        </span>
      </div>
      {!q ? (
        <div className="flex flex-col items-center px-6 py-10 text-center">
          <Timer size={40} className="text-ios-blue" />
          <h4 className="text-title-3 mt-3">Viaje en el tiempo</h4>
          <p className="text-label-2 mt-1 max-w-sm text-[15px]">
            Aparece un verbo: elige su {fixedField === 'part' ? 'participio' : fixedField === 'past' ? 'pasado' : 'pasado o participio'} antes de 12 segundos. Responder rápido suma más puntos.
          </p>
          <Button className="mt-5" variant="brand" onClick={newQuestion}>
            Empezar
          </Button>
        </div>
      ) : (
        <div className="p-5">
          <div className="bg-fill mb-4 h-1.5 overflow-hidden rounded-full">
            <div className="h-full rounded-full transition-[width] duration-100" style={{ width: `${left * 100}%`, background: left < 0.3 ? 'var(--red)' : 'var(--blue)' }} />
          </div>
          <div className="text-center">
            <div className="text-[40px] leading-none">{q.v.emoji}</div>
            <div className="mt-2 text-[30px] font-bold tracking-tight">{q.v.en}</div>
            <div className="text-label-2 text-[14px]">{q.v.es}</div>
            <div className="text-ios-blue mt-2 text-[15px] font-semibold">¿{q.field === 'past' ? 'Pasado simple' : 'Participio pasado'}?</div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-2">
            {q.options.map((o) => {
              const right = o === q.v[q.field];
              return (
                <button
                  key={o}
                  type="button"
                  onClick={() => choose(o)}
                  className={cn(
                    'rounded-[14px] px-3 py-3 text-[16px] font-semibold transition-colors',
                    !picked && 'bg-fill-2 hover:bg-fill',
                    picked && right && 'bg-ios-green text-white',
                    picked === o && !right && 'bg-ios-red text-white',
                    picked && !right && picked !== o && 'bg-fill-2 opacity-50',
                  )}
                >
                  {o}
                </button>
              );
            })}
          </div>
          {picked && (
            <div className="mt-4 flex items-center justify-between gap-3">
              <p className="text-[14px]">
                {picked === '__timeout__' ? <X size={15} className="text-ios-red mr-1 inline" /> : picked === q.v[q.field] ? <Check size={15} className="text-ios-green mr-1 inline" /> : <X size={15} className="text-ios-red mr-1 inline" />}
                {q.v.en} → <b>{q.v.past}</b> → <b>{q.v.part}</b>
              </p>
              <Button size="sm" onClick={newQuestion}>
                Siguiente
              </Button>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

// ------------------------------------------------------ phrasal families --

export function PhrasalFamilies({ data, family }: { data: VerbLabData; family?: string }) {
  // Spanish gloss, level and contexts come from the full phrasal-verb list when it has the same verb.
  const { data: all } = useAsync(loadPhrasalVerbs, []);
  const families: MindFamily[] = useMemo(() => {
    const extra = new Map((all ?? []).map((v) => [`${v.pv}|${v.def}`, v]));
    return data.phrasalFamilies
      .filter((f) => !family || f.verb === family)
      .map((f) => ({
        verb: f.verb,
        emoji: f.emoji,
        grad: f.grad,
        color: f.color,
        items: f.items.map((it) => {
          const x = extra.get(`${it.pv}|${it.def}`);
          return { ...it, es: x?.es, level: x?.level, ctx: x?.ctx };
        }),
      }));
  }, [data, family, all]);
  return <PhrasalExplorer families={families} intro={family ? undefined : 'Toca un verbo para abrir su mapa: cada burbuja es un phrasal verb con su significado y ejemplos.'} />;
}

// ---------------------------------------------------------- verb patterns --

const FORMULA_COLOR: Record<string, string> = {
  verb: 'var(--blue)',
  inf: 'var(--orange)',
  ger: 'var(--green)',
  obj: 'var(--purple)',
  prep: 'var(--teal)',
  conj: 'var(--pink)',
  that: 'var(--pink)',
  wh: 'var(--green)',
};

export function PatternCard({ p, compact = false }: { p: VerbPattern; compact?: boolean }) {
  const [listOpen, setListOpen] = useState(false);
  const say = useSpeak();
  return (
    <Card className="overflow-hidden">
      <div className="p-5" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${p.color} 16%, var(--card)), var(--card))` }}>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-[12px] text-[22px]" style={{ background: `color-mix(in srgb, ${p.color} 22%, transparent)` }}>
            {p.icon}
          </span>
          <div className="min-w-0">
            <div className="text-label-2 text-[12px] font-semibold">PATRÓN {p.id}</div>
            <h4 className="text-title-3">
              <RichText html={p.title} />
            </h4>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {p.formula.map(([kind, text], i) =>
            kind === 'plus' ? (
              <span key={i} className="text-label-2 text-[15px] font-semibold">
                <RichText html={text} />
              </span>
            ) : (
              <span
                key={i}
                className="rounded-[8px] px-2.5 py-1 text-[13px] font-semibold"
                style={{
                  opacity: kind.startsWith('opt') ? 0.75 : 1,
                  color: FORMULA_COLOR[kind.split(' ').pop()!] ?? 'var(--label)',
                  background: `color-mix(in srgb, ${FORMULA_COLOR[kind.split(' ').pop()!] ?? 'var(--label)'} 14%, transparent)`,
                }}
              >
                <RichText html={text} />
              </span>
            ),
          )}
        </div>
        <p className="mt-3 text-[15px] text-pretty">
          <RichText html={p.desc} />
        </p>
      </div>

      <div className="space-y-4 p-5">
        <ul className="space-y-2">
          {p.examples.map(([ex, why], i) => (
            <li key={i} className="bg-fill-2 flex items-start gap-2 rounded-[12px] p-3">
              <button type="button" onClick={() => say(stripTags(ex))} className="text-ios-blue mt-0.5" aria-label="Escuchar ejemplo">
                <Volume2 size={15} />
              </button>
              <div>
                <div className="text-[15px]">
                  <RichText html={ex} />
                </div>
                <div className="text-label-2 text-[13px]">
                  <RichText html={why} />
                </div>
              </div>
            </li>
          ))}
        </ul>

        {!compact && p.groups.length > 0 && (
          <div>
            <button type="button" onClick={() => setListOpen((o) => !o)} className="text-ios-blue inline-flex items-center gap-1 text-[15px] font-semibold">
              {p.listTitle?.replace(/^\S+\s/, '') ?? 'Lista completa'} {p.count && <span className="text-label-2 font-normal">· {p.count}</span>}
              <ChevronDown size={16} className={cn('transition-transform', listOpen && 'rotate-180')} />
            </button>
            {listOpen && (
              <div className="mt-3 space-y-3">
                {p.groups.map(([label, verbs], gi) => (
                  <div key={gi}>
                    {label && (
                      <div className="text-label-2 mb-1.5 text-[12px] font-semibold uppercase">
                        <RichText html={label} />
                      </div>
                    )}
                    <div className="flex flex-wrap gap-1.5">
                      {verbs.map((v) => (
                        <span key={v} className="bg-fill-2 rounded-full px-2.5 py-1 text-[13px]">
                          <RichText html={v} />
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
                {p.legend && (
                  <p className="text-label-2 text-[13px]">
                    <RichText html={p.legend} />
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        {p.bothCards && p.bothCards.length > 0 && (
          <div className="overflow-x-auto rounded-[12px] shadow-[inset_0_0_0_0.5px_var(--separator)]">
            <table className="w-full min-w-[420px] text-left text-[14px]">
              <tbody>
                {p.bothCards.map((row, i) => (
                  <tr key={i} className="[&:not(:last-child)]:shadow-[inset_0_-0.5px_0_var(--separator)]">
                    {row.map((c, j) => (
                      <td key={j} className={cn('px-3 py-2 align-top', j === 0 && 'font-semibold')}>
                        <RichText html={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {p.table && p.table.length > 0 && (
          <div className="overflow-x-auto rounded-[12px] shadow-[inset_0_0_0_0.5px_var(--separator)]">
            <table className="w-full min-w-[420px] text-left text-[14px]">
              <tbody>
                {p.table.map((row, i) => (
                  <tr key={i} className={cn(i === 0 && 'bg-fill-2 font-semibold', '[&:not(:last-child)]:shadow-[inset_0_-0.5px_0_var(--separator)]')}>
                    {row.map((c, j) => (
                      <td key={j} className="px-3 py-2 align-top">
                        <RichText html={c} />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!compact && p.notes && p.notes.length > 0 && (
          <div>
            <div className="text-label-2 mb-2 text-[12px] font-semibold uppercase">{p.noteTitle?.replace(/^\S+\s/, '') ?? 'Notas'}</div>
            <ul className="space-y-1.5">
              {p.notes.map((n, i) => (
                <li key={i} className="flex gap-2 text-[14px]">
                  <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: p.color }} />
                  <span>
                    <RichText html={n} />
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {p.exceptions && p.exceptions.length > 0 && (
          <div className="space-y-2">
            <div className="text-label-2 text-[12px] font-semibold uppercase">Errores comunes</div>
            {(compact ? p.exceptions.slice(0, 3) : p.exceptions).map(([wrong, right, why], i) => (
              <div key={i} className="bg-fill-2 rounded-[12px] p-3 text-[14px]">
                <div className="text-ios-red">
                  <RichText html={wrong} />
                </div>
                <div className="text-ios-green font-semibold">
                  <RichText html={right} />
                </div>
                <div className="text-label-2 mt-0.5 text-[13px]">
                  <RichText html={why} />
                </div>
              </div>
            ))}
          </div>
        )}

        {p.tip && (
          <div className="rounded-[12px] p-3 text-[14px]" style={{ background: `color-mix(in srgb, ${p.color} 12%, transparent)` }}>
            <RichText html={p.tip} />
          </div>
        )}
      </div>
    </Card>
  );
}

export function PatternQuizCard({ data, quizId }: { data: VerbLabData; quizId: string }) {
  const quiz = data.patterns.quizzes.find((q) => q.id === quizId);
  const fb = data.patternFeedback[quizId] ?? {};
  const award = useProgress((s) => s.award);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  if (!quiz) return null;
  const letters = ['A', 'B', 'C', 'D', 'E'];
  const done = Object.keys(answers).length === quiz.questions.length;
  const score = Object.entries(answers).filter(([n, l]) => fb[n]?.correct === l).length;
  return (
    <Card className="p-5">
      <h4 className="text-headline">
        <RichText html={quiz.title} />
      </h4>
      <p className="text-label-2 text-[14px]">
        <RichText html={quiz.desc} />
      </p>
      <ol className="mt-4 space-y-4">
        {quiz.questions.map((q, qi) => {
          const n = qi + 1;
          const picked = answers[n];
          const correct = fb[n]?.correct;
          return (
            <li key={qi}>
              <div className="mb-2 text-[15px]">
                {n}. <RichText html={q.text} />
              </div>
              <div className="flex flex-wrap gap-2">
                {q.opts.map((o, oi) => {
                  const L = letters[oi]!;
                  return (
                    <button
                      key={oi}
                      type="button"
                      disabled={!!picked}
                      onClick={() => {
                        const next = { ...answers, [n]: L };
                        setAnswers(next);
                        if (Object.keys(next).length === quiz.questions.length) {
                          const s = Object.entries(next).filter(([k, l]) => fb[k]?.correct === l).length;
                          award({ kind: 'flashcards', title: `Verb Lab · ${stripTags(quiz.title)}`, skill: 'grammar', xp: 5 + s * 2, ref: 'verblab:patterns' });
                        }
                      }}
                      className={cn(
                        'rounded-[12px] px-3.5 py-2 text-[14px] transition-colors',
                        !picked && 'bg-fill-2 hover:bg-fill',
                        picked && L === correct && 'bg-ios-green text-white',
                        picked === L && L !== correct && 'bg-ios-red text-white',
                        picked && L !== correct && picked !== L && 'bg-fill-2 opacity-50',
                      )}
                    >
                      {o}
                    </button>
                  );
                })}
              </div>
              {picked && fb[n]?.[picked] && <p className="text-label-2 mt-1.5 text-[13px]">{fb[n]![picked]}</p>}
            </li>
          );
        })}
      </ol>
      {done && (
        <div className="mt-4 flex items-center justify-between">
          <span className="text-headline">
            {score}/{quiz.questions.length} correctas
          </span>
          <Button size="sm" variant="gray" onClick={() => setAnswers({})}>
            <RotateCcw size={14} /> Repetir
          </Button>
        </div>
      )}
    </Card>
  );
}

export function VerbPatterns({ data }: { data: VerbLabData }) {
  const [sel, setSel] = useState(1);
  const p = data.patterns.patterns.find((x) => x.id === sel)!;
  return (
    <div className="grid gap-5 lg:grid-cols-[260px_minmax(0,1fr)]">
      <Card className="h-fit p-2 lg:sticky lg:top-6">
        {data.patterns.patterns.map((x) => (
          <button
            key={x.id}
            type="button"
            onClick={() => setSel(x.id)}
            className={cn('flex w-full items-center gap-2.5 rounded-[12px] px-3 py-2.5 text-left text-[14px] transition-colors', x.id === sel ? 'bg-fill font-semibold' : 'hover:bg-fill-2')}
          >
            <span className="text-[18px]">{x.icon}</span>
            <span className="min-w-0 flex-1 truncate">
              {x.id}. {stripTags(x.title)}
            </span>
          </button>
        ))}
      </Card>
      <div className="space-y-5">
        <PatternCard p={p} />
        <h3 className="text-title-3 px-1">Practica los patrones</h3>
        <div className="grid gap-4 xl:grid-cols-2">
          {data.patterns.quizzes.map((q) => (
            <PatternQuizCard key={q.id} data={data} quizId={q.id} />
          ))}
        </div>
      </div>
    </div>
  );
}
