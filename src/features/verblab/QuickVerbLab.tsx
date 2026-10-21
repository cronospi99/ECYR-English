import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ChevronDown, ChevronLeft, Play, Search, Volume2, X } from 'lucide-react';
import { Segmented } from '@/components/ui/Segmented';
import { LevelChip, PageLoader } from '@/components/ui/Misc';
import { useAsync } from '@/hooks/useAsync';
import { loadPhrasalVerbs, loadVerbExamples, loadVerbLab } from '@/content/levels';
import type { LabVerb } from '@/content/types';
import { speak } from '@/lib/speech';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/cn';
import { ink } from '@/lib/color';
import { VerbFormExamples, VerbFormsTrack, spoken } from './VerbBubble';
import { PhrasalInfo, familiesFromList, type MindFamily, type MindItem } from './mindmap';
import { PERSONS, conjugate, ingForm, thirdPerson, type Person } from './conjugate';

/**
 * Quick Verb Lab, opened from the floating dock: only the two look-up tools —
 * conjugation of any verb and phrasal verbs by family — with a link to the
 * full Verb Lab. Lazy-loaded by NotesDock.
 */
type Tab = 'conj' | 'phrasal';

const read = <T,>(key: string, fallback: T): T => {
  try {
    const v = localStorage.getItem(key);
    return v ? (JSON.parse(v) as T) : fallback;
  } catch {
    return fallback;
  }
};
const write = (key: string, v: unknown) => {
  try {
    localStorage.setItem(key, JSON.stringify(v));
  } catch {
    /* storage unavailable */
  }
};

const fold = (s: string) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();

export default function QuickVerbLab({ onNavigate }: { onNavigate?: () => void }) {
  const [tab, setTab] = useState<Tab>(() => read<Tab>('ecyr:quickverblab:tab', 'conj'));
  useEffect(() => write('ecyr:quickverblab:tab', tab), [tab]);
  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="shrink-0 px-4 pt-3">
        <Segmented<Tab>
          value={tab}
          onChange={setTab}
          options={[
            { value: 'conj', label: 'Conjugación' },
            { value: 'phrasal', label: 'Phrasal verbs' },
          ]}
          className="flex w-full"
        />
      </div>
      {tab === 'conj' ? <ConjugationPane /> : <PhrasalPane />}
      <div className="hairline-t shrink-0 px-4 py-2.5 text-center">
        <Link
          to={tab === 'phrasal' ? '/practice/verbs?tab=phrasal' : '/practice/verbs'}
          onClick={onNavigate}
          className="text-ink-blue inline-flex items-center gap-1 text-[15px] font-medium hover:opacity-70"
        >
          Abrir Verb Lab completo <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </div>
  );
}

function SearchBox({ value, onChange, placeholder, onEnter }: { value: string; onChange: (v: string) => void; placeholder: string; onEnter?: () => void }) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <label className="bg-fill-2 flex h-10 items-center gap-2 rounded-[11px] px-3">
      <Search size={16} className="text-label-2 shrink-0" aria-hidden />
      <input
        ref={ref}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') onEnter?.();
          if (e.key === 'Escape' && value) {
            e.stopPropagation();
            onChange('');
          }
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className="placeholder:text-label-3 min-w-0 flex-1 bg-transparent text-[16px] outline-none"
        type="text"
        autoComplete="off"
        autoCapitalize="none"
        spellCheck={false}
      />
      {value && (
        <button type="button" onClick={() => (onChange(''), ref.current?.focus())} className="text-label-2 -mr-1 rounded-full p-1 hover:bg-fill" aria-label="Borrar búsqueda">
          <X size={15} />
        </button>
      )}
    </label>
  );
}

// ----------------------------------------------------------- conjugation --

const COMMON = ['be', 'have', 'do', 'go', 'get', 'make', 'take', 'say', 'see', 'come', 'know', 'think', 'want', 'give', 'study', 'work'];

/** Bank verbs matching a query (English forms or Spanish), best matches first. */
function searchVerbs(verbs: LabVerb[], q: string, max = 8) {
  const n = fold(q);
  if (!n) return [];
  const score = (v: LabVerb) => {
    if (v.en === n) return 0;
    if (v.past.split(/\s*\/\s*/).includes(n) || v.part.split(/\s*\/\s*/).includes(n)) return 1;
    if (v.en.startsWith(n)) return 2;
    if (fold(v.es).split(/[\s,/;]+/).includes(n)) return 3;
    if ([v.past, v.part].some((x) => x.startsWith(n))) return 4;
    if (fold(v.es).includes(n)) return 5;
    if (v.en.includes(n)) return 6;
    return 99;
  };
  return verbs
    .map((v) => [v, score(v)] as const)
    .filter(([, s]) => s < 99)
    .sort((a, b) => a[1] - b[1] || a[0].en.length - b[0].en.length || a[0].en.localeCompare(b[0].en))
    .slice(0, max)
    .map(([v]) => v);
}

function ConjugationPane() {
  const { data, loading } = useAsync(loadVerbLab, []);
  const [q, setQ] = useState('');
  const [sel, setSel] = useState<string | null>(() => read<string | null>('ecyr:quickverblab:verb', null));
  const showEs = useSettings((s) => s.spanishHints);
  const verbs = data?.verbs ?? [];
  const results = useMemo(() => searchVerbs(verbs, q), [verbs, q]);
  const verb = sel ? (verbs.find((v) => v.en === sel) ?? null) : null;
  const scroller = useRef<HTMLDivElement>(null);

  const pick = (en: string) => {
    setSel(en);
    write('ecyr:quickverblab:verb', en);
    setQ('');
    scroller.current?.scrollTo({ top: 0 });
  };

  return (
    <>
      <div className="shrink-0 px-4 pt-3 pb-2">
        <SearchBox value={q} onChange={setQ} placeholder="Busca un verbo: go, went, comer…" onEnter={() => results[0] && pick(results[0].en)} />
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {loading || !data ? (
          <PageLoader />
        ) : q.trim() ? (
          results.length ? (
            <ul className="space-y-1 pt-1" aria-label="Resultados">
              {results.map((v) => (
                <li key={v.en}>
                  <button type="button" onClick={() => pick(v.en)} className="hover:bg-fill-2 flex w-full items-center gap-3 rounded-[12px] px-2.5 py-2 text-left">
                    <span className="text-[24px] leading-none">{v.emoji}</span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[16px] font-semibold">{v.en}</span>
                      <span className="text-label-2 block truncate text-[13px]">
                        {v.past} · {v.part}
                        {showEs && ` — ${v.es}`}
                      </span>
                    </span>
                    <TypeBadge v={v} />
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-label-2 py-10 text-center text-[15px]">No encontré ese verbo. Prueba con su forma base (go, eat…) o en español.</p>
          )
        ) : verb ? (
          <VerbConjugation key={verb.en} verb={verb} />
        ) : (
          <div className="pt-2">
            <p className="text-label-2 mb-3 text-[15px]">Escribe un verbo en inglés (cualquier forma) o en español, o elige uno:</p>
            <div className="flex flex-wrap gap-2">
              {COMMON.filter((en) => verbs.some((v) => v.en === en)).map((en) => (
                <button key={en} type="button" onClick={() => pick(en)} className="bg-fill-2 hover:bg-fill h-9 rounded-full px-3.5 text-[15px] font-medium">
                  {en}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

function TypeBadge({ v }: { v: LabVerb }) {
  const irr = v.type === 'irregular';
  const c = irr ? 'var(--purple)' : 'var(--teal)';
  return (
    <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: ink(c), background: `color-mix(in srgb, ${c} 14%, transparent)` }}>
      {irr ? 'Irregular' : 'Regular'}
    </span>
  );
}

function VerbConjugation({ verb }: { verb: LabVerb }) {
  const { data: examples } = useAsync(loadVerbExamples, []);
  const showEs = useSettings((s) => s.spanishHints);
  const [person, setPerson] = useState<Person>(() => read<Person>('ecyr:quickverblab:person', 'I'));
  useEffect(() => write('ecyr:quickverblab:person', person), [person]);
  const rows = useMemo(() => conjugate(verb, person), [verb, person]);
  const ing = ingForm(verb.en);
  const s3 = thirdPerson(verb.en);
  const ex = examples?.[verb.en];

  return (
    <div className="pt-1">
      <div className="flex items-center gap-3">
        <span className="bg-fill-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-[28px]">{verb.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[22px] leading-tight font-extrabold">{verb.en}</span>
            <TypeBadge v={verb} />
          </div>
          {showEs && <div className="text-label-2 truncate text-[14px]">{verb.es}</div>}
        </div>
        <button
          type="button"
          onClick={() => speak(`${spoken(verb.en)}. ${spoken(verb.past)}. ${spoken(verb.part)}.`, { rate: 0.85 })}
          className="brand-gradient inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-white"
          aria-label="Escuchar las 3 formas"
        >
          <Play size={13} fill="currentColor" /> 3 formas
        </button>
      </div>

      <VerbFormsTrack verb={verb} className="mt-3" />

      <div className="mt-2 grid grid-cols-2 gap-1.5">
        <FormPill label="3.ª persona" sub="he / she / it" word={s3} />
        <FormPill label="-ing" sub={ing.why} word={ing.form} />
      </div>

      <h3 className="text-label-2 mt-5 mb-2 text-[12px] font-bold tracking-wide uppercase">Conjugación</h3>
      <div className="no-scrollbar -mx-4 mb-2 flex gap-1.5 overflow-x-auto px-4" role="radiogroup" aria-label="Sujeto">
        {PERSONS.map((p) => (
          <button
            key={p.id}
            type="button"
            role="radio"
            aria-checked={person === p.id}
            onClick={() => setPerson(p.id)}
            className={cn(
              'h-8 shrink-0 rounded-full px-3 text-[14px] font-semibold whitespace-nowrap transition-colors',
              person === p.id ? 'bg-ios-blue text-white' : 'bg-fill-2 hover:bg-fill',
            )}
          >
            {p.label}
          </button>
        ))}
      </div>
      <ul className="divide-separator bg-card shadow-card divide-y overflow-hidden rounded-[14px]">
        {rows.map((r) => (
          <li key={r.id} className="px-3 py-2.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-[14px] font-semibold">{r.en}</span>
              <span className="text-label-2 truncate text-[12px]">{r.es}</span>
            </div>
            <div className="mt-1 grid gap-0.5 text-[15px] leading-snug">
              <Line sign="+" color="var(--green)" text={r.aff} speakable />
              <Line sign="−" color="var(--red)" text={r.neg} />
              <Line sign="?" color="var(--blue)" text={r.q} />
            </div>
          </li>
        ))}
      </ul>

      {ex && (
        <>
          <h3 className="text-label-2 mt-5 mb-2 text-[12px] font-bold tracking-wide uppercase">Ejemplos</h3>
          <VerbFormExamples verb={verb} ex={ex} />
        </>
      )}
    </div>
  );
}

function FormPill({ label, sub, word }: { label: string; sub: string; word: string }) {
  return (
    <button
      type="button"
      onClick={() => speak(word, { rate: 0.85 })}
      title={sub}
      className="bg-fill-2 hover:bg-fill flex min-w-0 items-center gap-2 rounded-[12px] px-3 py-2 text-left"
      aria-label={`${label}: ${word}. Escuchar`}
    >
      <span className="text-label-2 shrink-0 text-[11px] font-bold uppercase">{label}</span>
      <span className="min-w-0 flex-1 truncate text-[16px] font-bold">{word}</span>
      <Volume2 size={13} className="text-ink-blue shrink-0" aria-hidden />
    </button>
  );
}

function Line({ sign, color, text, speakable }: { sign: string; color: string; text: string; speakable?: boolean }) {
  return (
    <div className="flex items-start gap-2">
      <span className="mt-[3px] flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full text-[12px] font-bold" style={{ color: ink(color), background: `color-mix(in srgb, ${color} 14%, transparent)` }} aria-hidden>
        {sign}
      </span>
      <span className="min-w-0 flex-1">{text}</span>
      {speakable && (
        <button type="button" onClick={() => speak(text.replace(/…/g, ''), { rate: 0.9 })} className="text-ink-blue -my-1 shrink-0 rounded-full p-1.5 hover:bg-fill-2" aria-label={`Escuchar: ${text}`}>
          <Volume2 size={14} />
        </button>
      )}
    </div>
  );
}

// --------------------------------------------------------- phrasal verbs --

interface FlatItem {
  item: MindItem;
  family: MindFamily;
}

function PhrasalPane() {
  const { data, loading } = useAsync(loadPhrasalVerbs, []);
  const [q, setQ] = useState('');
  const [fam, setFam] = useState<string | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  const [limit, setLimit] = useState(40);
  const scroller = useRef<HTMLDivElement>(null);
  const families = useMemo(() => (data ? familiesFromList(data) : []), [data]);
  const flat = useMemo<FlatItem[]>(() => families.flatMap((f) => f.items.map((item) => ({ item, family: f }))), [families]);
  const n = fold(q);

  const results = useMemo(() => {
    if (!n) return [];
    const score = ({ item }: FlatItem) => {
      const pv = item.pv.toLowerCase();
      if (pv === n) return 0;
      if (pv.startsWith(n)) return 1;
      if (pv.includes(n)) return 2;
      if (fold(item.es ?? '').includes(n)) return 3;
      if (item.def.toLowerCase().includes(n)) return 4;
      return 99;
    };
    return flat
      .map((x) => [x, score(x)] as const)
      .filter(([, s]) => s < 99)
      .sort((a, b) => a[1] - b[1] || a[0].item.pv.localeCompare(b[0].item.pv))
      .map(([x]) => x);
  }, [flat, n]);
  const famMatch = n ? families.find((f) => f.verb.toLowerCase() === n) : undefined;
  const current = fam ? families.find((f) => f.verb === fam) : undefined;

  useEffect(() => {
    setLimit(40);
    setOpen(null);
  }, [n, fam]);

  const goFamily = (verb: string | null) => {
    setFam(verb);
    setQ('');
    scroller.current?.scrollTo({ top: 0 });
  };

  const list = (items: FlatItem[]) => (
    <>
      <ul className="space-y-1.5">
        {items.slice(0, limit).map(({ item, family }) => {
          const key = `${item.pv}|${item.def}`;
          return <PhrasalRow key={key} item={item} family={family} open={open === key} onToggle={() => setOpen(open === key ? null : key)} />;
        })}
      </ul>
      {items.length > limit && (
        <div className="mt-3 text-center">
          <button type="button" onClick={() => setLimit((l) => l + 60)} className="bg-fill-2 hover:bg-fill h-9 rounded-full px-4 text-[14px] font-semibold">
            Ver más ({items.length - limit})
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      <div className="shrink-0 px-4 pt-3 pb-2">
        <SearchBox value={q} onChange={setQ} placeholder="Busca: give up, rendirse, look…" />
      </div>
      <div ref={scroller} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4">
        {loading || !data ? (
          <PageLoader />
        ) : n ? (
          <>
            {famMatch && (
              <button
                type="button"
                onClick={() => goFamily(famMatch.verb)}
                className="mb-2 flex w-full items-center gap-3 rounded-[14px] px-3 py-2.5 text-left text-white"
                style={{ background: famMatch.grad }}
              >
                <span className="text-[22px] leading-none">{famMatch.emoji}</span>
                <span className="flex-1 text-[15px] font-bold">Familia «{famMatch.verb.toLowerCase()}» · {famMatch.items.length}</span>
                <ArrowRight size={16} aria-hidden />
              </button>
            )}
            {results.length ? list(results) : <p className="text-label-2 py-10 text-center text-[15px]">Sin coincidencias. Prueba con el verbo base (get, look…) o en español.</p>}
          </>
        ) : current ? (
          <>
            <div className="mb-3 flex items-center gap-2">
              <button type="button" onClick={() => goFamily(null)} className="text-ink-blue -ml-1 inline-flex h-9 items-center gap-0.5 rounded-[10px] pr-2 text-[15px] hover:opacity-70">
                <ChevronLeft size={20} strokeWidth={2.4} aria-hidden /> Familias
              </button>
              <span className="ml-auto flex items-center gap-2 rounded-full py-1 pr-3 pl-1.5 text-[14px] font-bold text-white" style={{ background: current.grad }}>
                <span className="text-[18px] leading-none">{current.emoji}</span> {current.verb.toLowerCase()} · {current.items.length}
              </span>
            </div>
            {list(current.items.map((item) => ({ item, family: current })))}
          </>
        ) : (
          <>
            <p className="text-label-2 mb-3 text-[15px]">Elige un verbo base para ver su familia, o busca arriba.</p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
              {families.map((f) => (
                <button
                  key={f.verb}
                  type="button"
                  onClick={() => goFamily(f.verb)}
                  className="flex min-w-0 flex-col items-center rounded-[14px] px-1.5 py-2 text-white transition-transform active:scale-95"
                  style={{ background: f.grad }}
                  aria-label={`${f.verb.toLowerCase()}: ${f.items.length} phrasal verbs`}
                >
                  <span className="text-[20px] leading-none">{f.emoji}</span>
                  <span className="mt-1 max-w-full truncate text-[14px] font-bold">{f.verb.toLowerCase()}</span>
                  <span className="text-[11px] opacity-85">{f.items.length}</span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </>
  );
}

function PhrasalRow({ item, family, open, onToggle }: { item: MindItem; family: MindFamily; open: boolean; onToggle: () => void }) {
  const showEs = useSettings((s) => s.spanishHints);
  return (
    <li className={cn('rounded-[14px] transition-colors', open ? 'bg-card shadow-card' : 'hover:bg-fill-2')}>
      <button type="button" onClick={onToggle} aria-expanded={open} className="flex w-full items-center gap-3 px-2.5 py-2 text-left">
        <span className="text-[22px] leading-none">{item.emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-[16px] font-bold">{item.pv}</span>
            {item.level && <LevelChip level={item.level} className="h-5 px-2 text-[11px]" />}
          </span>
          <span className={cn('text-label-2 block text-[13px]', !open && 'truncate')}>
            {item.def}
            {showEs && item.es && !open && ` — ${item.es}`}
          </span>
        </span>
        <ChevronDown size={16} className={cn('text-label-3 shrink-0 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div className="px-3 pb-3">
          <button type="button" onClick={() => speak(item.pv, { rate: 0.85 })} className="text-ink-blue mb-2 inline-flex items-center gap-1.5 text-[14px] font-semibold">
            <Volume2 size={15} /> Escuchar
          </button>
          <PhrasalInfo item={item} color={family.color} />
        </div>
      )}
    </li>
  );
}
