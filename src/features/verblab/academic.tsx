/**
 * C1 academic verbs: the verbs of essays, reports and IELTS Task 1/2, grouped by
 * what they do in a text. Same card + bubble as the main explorer, plus each
 * verb's meaning, pattern, collocations and the everyday word it upgrades.
 */
import { useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { ArrowUpRight, Check, RotateCcw, Search, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip, PageLoader } from '@/components/ui/Misc';
import { ProgressBar } from '@/components/ui/Progress';
import { useAsync } from '@/hooks/useAsync';
import { loadAcademicVerbs } from '@/content/levels';
import type { AcademicGroup, AcademicVerb } from '@/content/types';
import { useSettings } from '@/store/settings';
import { useProgress } from '@/store/progress';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/cn';
import { VerbBubble } from './VerbBubble';

export const ACADEMIC_GROUPS: {
  id: AcademicGroup;
  emoji: string;
  es: string;
  en: string;
  color: string;
}[] = [
  {
    id: 'research',
    emoji: '🔬',
    es: 'Investigar',
    en: 'Research process',
    color: 'var(--blue)',
  },
  {
    id: 'analysis',
    emoji: '🧩',
    es: 'Analizar e interpretar',
    en: 'Analysis',
    color: 'var(--indigo)',
  },
  {
    id: 'trends',
    emoji: '📈',
    es: 'Tendencias y cifras',
    en: 'Change & trends',
    color: 'var(--teal)',
  },
  {
    id: 'cause',
    emoji: '⚙️',
    es: 'Causa y efecto',
    en: 'Cause & effect',
    color: 'var(--orange)',
  },
  {
    id: 'argument',
    emoji: '⚖️',
    es: 'Argumentar y evaluar',
    en: 'Argument',
    color: 'var(--red)',
  },
  {
    id: 'reporting',
    emoji: '📚',
    es: 'Citar y reportar',
    en: 'Reporting sources',
    color: 'var(--purple)',
  },
  {
    id: 'comparison',
    emoji: '🔀',
    es: 'Comparar y relacionar',
    en: 'Comparison',
    color: 'var(--green)',
  },
  {
    id: 'structure',
    emoji: '🧱',
    es: 'Organizar y concluir',
    en: 'Structuring a text',
    color: 'var(--pink)',
  },
];
const GROUP = Object.fromEntries(ACADEMIC_GROUPS.map((g) => [g.id, g])) as Record<AcademicGroup, (typeof ACADEMIC_GROUPS)[number]>;

export function AcademicVerbs() {
  const { data, loading } = useAsync(loadAcademicVerbs, []);
  const [group, setGroup] = useState<AcademicGroup | 'all'>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);
  const [anchor, setAnchor] = useState<HTMLElement | null>(null);
  const [saved, setSaved] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('ecyr:verblab:saved') || '[]') as string[];
    } catch {
      return [];
    }
  });
  const [limit, setLimit] = useState(60);
  const showEs = useSettings((s) => s.spanishHints);

  const list = useMemo(() => {
    const n = q.trim().toLowerCase();
    return (data ?? []).filter(
      (v) =>
        (group === 'all' || v.group === group) &&
        (!n || [v.en, v.es, v.def, v.informal, v.us ?? '', ...v.collocations].some((x) => x.toLowerCase().includes(n))),
    );
  }, [data, group, q]);

  if (loading || !data) return <PageLoader />;
  const openVerb = open ? (data.find((v) => v.en === open) ?? null) : null;
  const toggleSaved = (en: string) =>
    setSaved((s) => {
      const next = s.includes(en) ? s.filter((x) => x !== en) : [...s, en];
      try {
        localStorage.setItem('ecyr:verblab:saved', JSON.stringify(next));
      } catch {
        /* storage unavailable */
      }
      return next;
    });

  return (
    <div className="space-y-5">
      <div className="brand-gradient relative overflow-hidden rounded-[24px] p-5 text-white sm:p-6">
        <div className="text-[13px] font-semibold tracking-wide uppercase opacity-85">C1 · Academic English</div>
        <h2 className="mt-1 text-[24px] leading-tight font-extrabold sm:text-[28px]">{data.length} verbos para escribir y hablar como en la universidad</h2>
        <p className="mt-1.5 max-w-2xl text-[15px] opacity-90">
          Agrupados por lo que hacen en un texto. Toca uno para ver su significado, su patrón, colocaciones y la palabra común que reemplaza.
        </p>
        <span className="pointer-events-none absolute -right-3 -bottom-6 text-[110px] leading-none opacity-20 select-none" aria-hidden>
          🎓
        </span>
      </div>

      {/* function groups */}
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        {ACADEMIC_GROUPS.map((g) => {
          const n = data.filter((v) => v.group === g.id).length;
          const on = group === g.id;
          return (
            <motion.button
              key={g.id}
              type="button"
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => (setGroup(on ? 'all' : g.id), setLimit(60))}
              aria-pressed={on}
              className={cn('flex items-center gap-3 rounded-[18px] p-3 text-left transition-shadow', on ? 'text-white' : 'bg-card shadow-card')}
              style={
                on
                  ? {
                      background: `linear-gradient(135deg, ${g.color}, color-mix(in srgb, ${g.color} 60%, #5b2bd9))`,
                    }
                  : undefined
              }
            >
              <span
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[14px] text-[24px]"
                style={{
                  background: on ? 'rgb(255 255 255 / 0.2)' : `color-mix(in srgb, ${g.color} 14%, transparent)`,
                }}
              >
                {g.emoji}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[14.5px] leading-tight font-bold">{g.es}</span>
                <span className={cn('block truncate text-[12px]', on ? 'opacity-85' : 'text-label-2')}>
                  {g.en} · {n}
                </span>
              </span>
            </motion.button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="bg-card flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-[12px] px-3 shadow-card">
          <Search size={18} className="text-label-3" />
          <input
            value={q}
            onChange={(e) => (setQ(e.target.value), setLimit(60))}
            placeholder="Busca: verbo, significado, colocación o palabra común…"
            className="placeholder:text-label-3 h-full flex-1 bg-transparent text-[16px] outline-none"
          />
        </label>
        {group !== 'all' && <Chip onClick={() => setGroup('all')}>Ver todos · {data.length}</Chip>}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
        {list.slice(0, limit).map((v, i) => {
          const g = GROUP[v.group];
          const isOpen = open === v.en;
          return (
            <motion.button
              key={v.en}
              type="button"
              onClick={(e) => (setAnchor(e.currentTarget), setOpen(isOpen ? null : v.en))}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min((i % 60) * 0.012, 0.5) }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.96 }}
              className={cn(
                'bg-card shadow-card relative flex flex-col items-center rounded-[20px] px-2 pt-4 pb-3 text-center',
                isOpen && 'shadow-[0_0_0_2.5px_var(--blue)]',
              )}
              style={{
                background: `linear-gradient(180deg, color-mix(in srgb, ${g.color} 12%, var(--card)), var(--card) 72%)`,
              }}
              aria-expanded={isOpen}
              aria-label={`${v.en}: ${v.def}`}
            >
              <span className="absolute top-2 left-2 text-[13px]" title={g.es} aria-hidden>
                {g.emoji}
              </span>
              <span className="text-[40px] leading-none drop-shadow-[0_2px_3px_rgb(0_0_0/0.12)]">{v.emoji}</span>
              <span className="mt-1.5 max-w-full truncate text-[17px] font-bold">{v.en}</span>
              {showEs && <span className="text-label-2 max-w-full truncate text-[12px]">{v.es}</span>}
              {v.informal && (
                <span className="text-label-3 mt-1 inline-flex max-w-full items-center gap-0.5 truncate text-[11px]">
                  <ArrowUpRight size={11} className="shrink-0" style={{ color: g.color }} /> <span className="truncate">{v.informal}</span>
                </span>
              )}
            </motion.button>
          );
        })}
      </div>
      {list.length > limit && (
        <div className="text-center">
          <Button variant="gray" onClick={() => setLimit((l) => l + 90)}>
            Ver más ({list.length - limit})
          </Button>
        </div>
      )}
      {!list.length && <p className="text-label-2 py-10 text-center">No hay verbos con esa búsqueda.</p>}
      {openVerb && (
        <VerbBubble
          verb={openVerb}
          academic={openVerb}
          anchor={anchor}
          saved={saved.includes(openVerb.en)}
          onToggleSaved={() => toggleSaved(openVerb.en)}
          onClose={() => setOpen(null)}
        />
      )}

      <div className="mx-auto max-w-xl pt-2">
        <RegisterQuiz verbs={data} group={group} />
      </div>
    </div>
  );
}

const ROUNDS = 10;

/** "Sube de registro": pick the academic verb that replaces an everyday word in context. */
function RegisterQuiz({ verbs, group }: { verbs: AcademicVerb[]; group: AcademicGroup | 'all' }) {
  const award = useProgress((s) => s.award);
  const [seed, setSeed] = useState(0);
  const pool = useMemo(() => {
    const ok = verbs.filter((v) => v.informal && (group === 'all' || v.group === group));
    return shuffle(ok.length >= 4 ? ok : verbs.filter((v) => v.informal)).slice(0, ROUNDS);
  }, [verbs, group, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);

  const v = pool[i];
  const options = useMemo(() => {
    if (!v) return [];
    const same = verbs.filter((x) => x.en !== v.en && x.group === v.group);
    const rest = verbs.filter((x) => x.en !== v.en && x.group !== v.group);
    return shuffle([v, ...shuffle(same).slice(0, 2), ...shuffle(rest).slice(0, 1)]);
  }, [v, verbs]);

  const restart = () => (setSeed((s) => s + 1), setI(0), setPicked(null), setScore(0));
  if (!pool.length) return null;
  if (!v) {
    return (
      <Card className="p-6 text-center">
        <div className="text-[44px]">{score >= 8 ? '🏆' : score >= 5 ? '👏' : '💪'}</div>
        <div className="mt-1 text-[22px] font-bold">
          {score}/{pool.length}
        </div>
        <p className="text-label-2 mt-1 text-[15px]">{score >= 8 ? '¡Escribes con registro académico!' : 'Repasa las tarjetas y vuelve a intentarlo.'}</p>
        <Button className="mt-4" onClick={restart}>
          <RotateCcw size={16} /> Otra ronda
        </Button>
      </Card>
    );
  }

  // The academic sentence with the verb swapped for its everyday equivalent.
  const forms = [v.part, v.past, v.en].flatMap((f) => f.split(/\s*\/\s*/));
  const sentence = v.ex.base;
  const hit = forms.map((f) => new RegExp(`\\b${f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\w*\\b`, 'i')).find((re) => re.test(sentence));
  const [before, after] = hit ? sentence.split(hit) : [sentence, ''];

  const choose = (en: string) => {
    if (picked) return;
    setPicked(en);
    const right = en === v.en;
    if (right) setScore((s) => s + 1);
    speak(v.ex.base, { rate: 0.95 });
    if (i + 1 === pool.length) {
      const final = score + (right ? 1 : 0);
      award({
        kind: 'flashcards',
        title: 'Verb Lab · verbos académicos C1',
        skill: 'vocabulary',
        xp: 5 + final * 2,
        level: 'C1',
        ref: 'verblab:academic',
      });
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-[17px] font-bold">Sube de registro</div>
          <div className="text-label-2 text-[13px]">¿Qué verbo académico reemplaza la palabra común?</div>
        </div>
        <span className="text-label-2 text-[13px] tabular-nums">
          {i + 1}/{pool.length} · ✓ {score}
        </span>
      </div>
      <ProgressBar className="mt-3" value={(i / pool.length) * 100} />
      <p className="mt-4 text-[17px] leading-relaxed">
        {before}
        <span
          className="rounded-[8px] px-1.5 py-0.5 font-semibold"
          style={{
            background: 'color-mix(in srgb, var(--orange) 16%, transparent)',
            color: 'var(--orange)',
          }}
        >
          {picked ? (picked === v.en ? v.en : v.informal) : v.informal}
        </span>
        {after}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-2">
        {options.map((o) => {
          const right = picked && o.en === v.en;
          const wrong = picked === o.en && o.en !== v.en;
          return (
            <button
              key={o.en}
              type="button"
              onClick={() => choose(o.en)}
              disabled={!!picked}
              className={cn(
                'flex items-center justify-center gap-1.5 rounded-[14px] px-3 py-3 text-[16px] font-semibold transition-colors',
                right ? 'bg-ios-green text-white' : wrong ? 'bg-ios-red text-white' : 'bg-fill-2 hover:bg-fill',
              )}
            >
              <span aria-hidden>{o.emoji}</span> {o.en}
              {right && <Check size={16} />}
              {wrong && <X size={16} />}
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-label-2 text-[13.5px]">
            <b className="text-label">{v.en}</b> — {v.def}
          </p>
          <Button size="sm" onClick={() => (setI((n) => n + 1), setPicked(null))}>
            {i + 1 === pool.length ? 'Ver resultado' : 'Siguiente'}
          </Button>
        </div>
      )}
    </Card>
  );
}

function shuffle<T>(a: T[]) {
  const out = [...a];
  for (let k = out.length - 1; k > 0; k--) {
    const j = Math.floor(Math.random() * (k + 1));
    [out[k], out[j]] = [out[j]!, out[k]!];
  }
  return out;
}
