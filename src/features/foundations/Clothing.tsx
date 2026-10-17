import { useMemo, useRef, useState } from 'react';
import { ExternalLink, RotateCcw, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { CourseBlock } from '@/content/types';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Misc';
import { useAsync } from '@/hooks/useAsync';
import { loadClothing } from '@/content/levels';
import { speak } from '@/lib/speech';
import { tint } from '@/lib/color';
import { cn } from '@/lib/cn';
import { Section, Done, pick, randomOrder, type OnResult } from './kit';

export interface ClothingSet {
  id: string;
  en: string;
  es: string;
  e: string;
  color: string;
  /** Full infographic in public/visuals (VISUALS in content/visuals.ts). */
  visual: string;
}
export interface ClothingItem {
  id: string;
  set: string;
  /** Number on the infographic card. */
  n: number;
  us: string;
  /** British name when it differs. */
  uk?: string;
  es: string;
  cat: 'outer' | 'top' | 'bottom' | 'dress' | 'shoes' | 'acc' | 'swim' | 'outfit';
  /** Plural noun (jeans, gloves…): no article. */
  pl?: boolean;
  art?: 'a' | 'an';
  artUk?: 'a' | 'an';
  note?: string;
}
export interface ClothingData {
  sets: ClothingSet[];
  items: ClothingItem[];
}

const useClothing = () => useAsync(() => loadClothing<ClothingData>(), []);
export const tileUrl = (it: ClothingItem) => `/visuals/clothing/${it.id}.webp`;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
/** "a sweater", "an overcoat", "jeans". */
export const phrase = (it: ClothingItem, uk = false) => {
  const w = uk && it.uk ? it.uk : it.us;
  if (it.pl) return w;
  return `${(uk && it.artUk) || it.art || 'a'} ${w}`;
};

function Tile({ it, className, alt = '' }: { it: ClothingItem; className?: string; alt?: string }) {
  return <img src={tileUrl(it)} alt={alt} loading="lazy" decoding="async" className={cn('h-full w-full rounded-[12px] bg-white object-contain', className)} />;
}

function Loading() {
  return (
    <div className="flex justify-center py-10">
      <Spinner />
    </div>
  );
}

// ------------------------------------------------------- picture dictionary --

export function WardrobeBlock({ b }: { b: CourseBlock }) {
  const { data } = useClothing();
  const [set, setSet] = useState('winter');
  const [onlyDiff, setOnlyDiff] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);

  if (!data) return <Section b={b}><Loading /></Section>;
  const meta = data.sets.find((s) => s.id === set)!;
  const items = data.items.filter((it) => it.set === set && (!onlyDiff || it.uk));
  const sel = data.items.find((it) => it.id === selId && it.set === set) ?? items[0];
  const diffCount = data.items.filter((it) => it.set === set && it.uk).length;

  const open = (it: ClothingItem) => {
    setSelId(it.id);
    speak(it.us, { accent: 'en-US', rate: 0.9 });
  };

  return (
    <Section b={b}>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        {data.sets.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => {
              setSet(s.id);
              setSelId(null);
            }}
            className={cn('h-9 shrink-0 rounded-full px-3.5 text-[14px] font-semibold transition-colors', set === s.id ? 'text-white' : 'bg-fill-2 hover:bg-fill')}
            style={set === s.id ? { background: `color-mix(in srgb, ${s.color} 62%, #000)` } : undefined}
          >
            <span aria-hidden>{s.e}</span> {s.es}
          </button>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap items-center justify-between gap-2">
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" checked={onlyDiff} onChange={(e) => setOnlyDiff(e.target.checked)} className="accent-[var(--orange)] h-4 w-4" />
          Solo las que cambian US ≠ UK ({diffCount})
        </label>
        <a href={`/visuals/${meta.visual}.webp`} target="_blank" rel="noreferrer" className="text-ink-blue inline-flex items-center gap-1 text-[14px] font-medium hover:opacity-70">
          Infografía completa <ExternalLink size={14} />
        </a>
      </div>

      {set === 'colombia' && (
        <p className="mt-3 rounded-[14px] p-3 text-[14px] text-pretty" style={{ background: tint('var(--yellow)', 16) }}>
          🇨🇴 Prendas y trajes típicos de Colombia. Los nombres propios como <b>sombrero vueltiao</b>, <b>ruana</b> o <b>pollera</b> se dicen igual en inglés: son palabras de nuestra cultura. Toca los trajes 21–25 para conocer su historia.
        </p>
      )}

      {sel && (
        <motion.div key={sel.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="bg-fill-2 mt-4 grid grid-cols-[110px_1fr] gap-4 rounded-[18px] p-3 sm:grid-cols-[150px_1fr]">
          <div className="aspect-[4/5]">
            <Tile it={sel} alt={sel.us} />
          </div>
          <div className="min-w-0 py-1">
            <div className="text-label-2 text-[12px] font-semibold tracking-wide uppercase">
              {meta.e} {meta.en} · {sel.n}
            </div>
            <button type="button" onClick={() => speak(sel.us, { accent: 'en-US', rate: 0.9 })} className="mt-1 flex items-center gap-2 text-left">
              <span className="text-[13px]" aria-hidden>🇺🇸</span>
              <span className="text-[20px] leading-tight font-bold">{cap(sel.us)}</span>
              <Volume2 size={16} className="text-ink-blue shrink-0" aria-label="Escuchar en inglés americano" />
            </button>
            <button type="button" onClick={() => speak(sel.uk ?? sel.us, { accent: 'en-GB', rate: 0.9 })} className="mt-1 flex items-center gap-2 text-left">
              <span className="text-[13px]" aria-hidden>🇬🇧</span>
              <span className={cn('text-[18px] leading-tight font-semibold', sel.uk && 'text-ink-orange')}>{cap(sel.uk ?? sel.us)}</span>
              <Volume2 size={16} className="text-ink-blue shrink-0" aria-label="Escuchar en inglés británico" />
            </button>
            <div className="text-label-2 mt-1 text-[14px]">{sel.es}</div>
            {sel.cat !== 'outfit' && (
              <div className="mt-1 text-[13px]">
                She's wearing <b>{phrase(sel)}</b>
                {sel.pl && <span className="text-label-2"> (plural: sin a / an)</span>}
              </div>
            )}
            {sel.note && <p className="text-label-2 mt-2 text-[13px] text-pretty">{sel.note}</p>}
          </div>
        </motion.div>
      )}

      <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => open(it)}
            className={cn('bg-fill-2 flex flex-col overflow-hidden rounded-[14px] p-1.5 text-left transition-all active:scale-[0.97]', sel?.id === it.id && 'ring-ios-blue ring-2')}
          >
            <div className={cn('relative w-full', it.cat === 'outfit' ? 'aspect-[4/3]' : 'aspect-[4/5]')}>
              <Tile it={it} alt={it.us} />
              {it.uk && (
                <span className="absolute right-1 bottom-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-white" style={{ background: 'color-mix(in srgb, var(--orange) 62%, #000)' }}>
                  US≠UK
                </span>
              )}
            </div>
            <span className="mt-1 px-0.5 text-[13px] leading-tight font-semibold">{cap(it.us)}</span>
            {it.uk && <span className="text-ink-orange px-0.5 text-[12px] leading-tight">UK: {it.uk}</span>}
          </button>
        ))}
      </div>
    </Section>
  );
}

// ------------------------------------------------------------------ games --

type Mode = 'listen' | 'match' | 'wearing';

/** Items with a distinct US name (the same hoodie appears in several seasons). */
function unique(items: ClothingItem[]) {
  const seen = new Set<string>();
  return items.filter((it) => {
    const k = it.us.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

export function ClothesGameBlock({ b, onResult }: { b: CourseBlock; onResult: OnResult }) {
  const { data } = useClothing();
  const mode = (b.mode as Mode) ?? 'listen';
  if (!data) return <Section b={b}><Loading /></Section>;
  const pool = unique(data.items.filter((it) => it.cat !== 'outfit'));
  const rounds = typeof b.rounds === 'number' ? b.rounds : 6;
  if (mode === 'match') return <MatchGame b={b} pool={pool} size={rounds} onResult={onResult} />;
  if (mode === 'wearing') return <WearingGame b={b} items={data.items} rounds={rounds} onResult={onResult} />;
  return <ListenGame b={b} pool={pool} rounds={rounds} onResult={onResult} />;
}

function Finish({ score, total, onAgain }: { score: number; total: number; onAgain: () => void }) {
  return (
    <div className="text-center">
      <div className="text-[44px] font-extrabold tabular-nums">
        {score}/{total}
      </div>
      <Done text={score === total ? '¡Perfecto!' : 'Buen trabajo. Juega otra vez con prendas nuevas.'} />
      <Button className="mt-4" variant="tinted" onClick={onAgain}>
        <RotateCcw size={16} /> Jugar otra vez
      </Button>
    </div>
  );
}

function useRounds<T>(make: () => T[], deps: unknown[]) {
  const [seed, setSeed] = useState(0);
  const list = useMemo(make, [seed, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps
  return { list, again: () => setSeed((s) => s + 1) };
}

function ListenGame({ b, pool, rounds, onResult }: { b: CourseBlock; pool: ClothingItem[]; rounds: number; onResult: OnResult }) {
  const { list, again } = useRounds(
    () =>
      randomOrder(pool)
        .slice(0, rounds)
        .map((target) => {
          const others = randomOrder(pool.filter((x) => x.us !== target.us)).slice(0, 3);
          const uk = !!target.uk && Math.random() < 0.5;
          return { target, uk, options: randomOrder([target, ...others]) };
        }),
    [pool, rounds],
  );
  const [k, setK] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const reported = useRef(false);
  const r = list[k];
  const say = (x = r) => x && speak(x.uk ? x.target.uk! : x.target.us, { accent: x.uk ? 'en-GB' : 'en-US', rate: 0.9 });

  const next = () => {
    const n = k + 1;
    setK(n);
    setPicked(null);
    if (n >= list.length && !reported.current) {
      reported.current = true;
      onResult(Math.round((score / list.length) * 100));
    } else setTimeout(() => say(list[n]), 150);
  };
  if (!r)
    return (
      <Section b={b}>
        <Finish
          score={score}
          total={list.length}
          onAgain={() => {
            again();
            setK(0);
            setScore(0);
          }}
        />
      </Section>
    );
  return (
    <Section b={b}>
      <div className="text-label-2 flex justify-between text-[13px]">
        <span>
          Ronda {k + 1} de {list.length}
        </span>
        <span className="tabular-nums">Aciertos: {score}</span>
      </div>
      <div className="mt-3 flex items-center justify-center gap-3">
        <Button size="lg" onClick={() => say()}>
          <Volume2 size={20} /> Escuchar
        </Button>
        <span className="text-label-2 text-[13px]">{r.uk ? '🇬🇧 British English' : '🇺🇸 American English'}</span>
      </div>
      <div className="mx-auto mt-4 grid max-w-md grid-cols-2 gap-2">
        {r.options.map((o) => {
          const right = o.id === r.target.id;
          return (
            <button
              key={o.id}
              type="button"
              onClick={() => {
                if (picked) return;
                setPicked(o.id);
                if (right) setScore((s) => s + 1);
              }}
              aria-label={picked ? o.us : `Opción ${r.options.indexOf(o) + 1}`}
              className={cn(
                'bg-fill-2 aspect-square rounded-[16px] p-1.5 transition-all',
                picked && right && 'ring-ios-green ring-4',
                picked === o.id && !right && 'ring-ios-red ring-4',
                picked && !right && picked !== o.id && 'opacity-50',
              )}
            >
              <Tile it={o} />
            </button>
          );
        })}
      </div>
      {picked && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-[14px]">
            {picked === r.target.id ? '¡Correcto! ' : 'Era: '}
            <b>{r.uk ? r.target.uk : r.target.us}</b>
            {r.target.uk && <span className="text-label-2"> · US {r.target.us} / UK {r.target.uk}</span>} · {r.target.es}
          </p>
          <Button size="sm" onClick={next}>
            {k + 1 < list.length ? 'Siguiente' : 'Ver resultado'}
          </Button>
        </div>
      )}
    </Section>
  );
}

function MatchGame({ b, pool, size, onResult }: { b: CourseBlock; pool: ClothingItem[]; size: number; onResult: OnResult }) {
  const { list, again } = useRounds(() => {
    const items = randomOrder(pool).slice(0, size);
    return [{ items, words: randomOrder(items) }];
  }, [pool, size]);
  const { items, words } = list[0]!;
  const [sel, setSel] = useState<string | null>(null);
  const [done, setDone] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const reported = useRef(false);

  const tryWord = (w: ClothingItem) => {
    if (!sel || done.has(w.id)) return;
    if (w.id === sel) {
      const n = new Set(done).add(w.id);
      setDone(n);
      setSel(null);
      speak(w.us, { rate: 0.9 });
      if (n.size === items.length && !reported.current) {
        reported.current = true;
        onResult(Math.round((items.length / (items.length + mistakes)) * 100));
      }
    } else {
      setMistakes((m) => m + 1);
      setWrong(w.id);
      setTimeout(() => setWrong(null), 450);
    }
  };
  const restart = () => {
    again();
    setDone(new Set());
    setSel(null);
    setMistakes(0);
  };

  return (
    <Section b={b}>
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            disabled={done.has(it.id)}
            onClick={() => setSel(it.id)}
            aria-label={done.has(it.id) ? it.us : 'Imagen de una prenda'}
            className={cn('bg-fill-2 aspect-[4/5] rounded-[14px] p-1 transition-all', sel === it.id && 'ring-ios-blue ring-4', done.has(it.id) && 'opacity-40')}
          >
            <Tile it={it} />
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {words.map((w) => (
          <motion.button
            key={w.id}
            type="button"
            disabled={done.has(w.id)}
            onClick={() => tryWord(w)}
            animate={wrong === w.id ? { x: [0, -6, 6, -4, 4, 0] } : {}}
            transition={{ duration: 0.4 }}
            className={cn(
              'rounded-[12px] px-3 py-2 text-[15px] font-semibold transition-colors',
              done.has(w.id) ? 'text-ink-green bg-[color-mix(in_srgb,var(--green)_15%,transparent)]' : wrong === w.id ? 'bg-[color-mix(in_srgb,var(--red)_14%,transparent)]' : 'bg-card shadow-card hover:bg-fill-2',
            )}
          >
            {w.us}
          </motion.button>
        ))}
      </div>
      {!sel && done.size < items.length && <p className="text-label-2 mt-3 text-[13px]">Primero toca una imagen.</p>}
      {done.size === items.length && (
        <>
          <Done text={`¡Completado! ${mistakes} ${mistakes === 1 ? 'error' : 'errores'}.`} />
          <Button className="mt-3" size="sm" variant="tinted" onClick={restart}>
            <RotateCcw size={14} /> Otra ronda
          </Button>
        </>
      )}
    </Section>
  );
}

const PEOPLE = [
  { name: 'Sofía', pro: 'she', e: '👩🏽' },
  { name: 'Mateo', pro: 'he', e: '👨🏻' },
  { name: 'Valentina', pro: 'she', e: '👧🏾' },
  { name: 'Santiago', pro: 'he', e: '🧑🏽' },
  { name: 'Isabella', pro: 'she', e: '👩🏻' },
  { name: 'Samuel', pro: 'he', e: '👦🏽' },
] as const;

const list = (xs: string[]) => (xs.length < 2 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

function WearingGame({ b, items, rounds, onResult }: { b: CourseBlock; items: ClothingItem[]; rounds: number; onResult: OnResult }) {
  const pool = useMemo(() => unique(items.filter((it) => it.set !== 'colombia' || ['top', 'outer', 'bottom', 'shoes'].includes(it.cat))), [items]);
  const { list: game, again } = useRounds(() => {
    const by = (cats: string[]) => pool.filter((it) => cats.includes(it.cat) && it.us !== 'top');
    return randomOrder(PEOPLE)
      .slice(0, rounds)
      .map((p) => {
        const dress = p.pro === 'she' && Math.random() < 0.35;
        const outfit = dress ? [pick(by(['dress'])), pick(by(['shoes']))] : [pick(by(['top', 'outer'])), pick(by(['bottom'])), pick(by(['shoes']))];
        const swapOne = () => {
          const i = Math.floor(Math.random() * outfit.length);
          const alts = by([outfit[i]!.cat]).filter((x) => !outfit.some((o) => o.us === x.us));
          return alts.length ? outfit.map((o, k) => (k === i ? pick(alts) : o)) : outfit;
        };
        const sentence = (o: ClothingItem[]) => `${cap(p.pro)}'s wearing ${list(o.map((x) => phrase(x)))}.`;
        const right = sentence(outfit);
        const wrongs = new Set<string>();
        for (let guard = 0; wrongs.size < 2 && guard < 40; guard++) {
          const s = sentence(swapOne());
          if (s !== right) wrongs.add(s);
        }
        return { p, outfit, right, options: randomOrder([right, ...wrongs]) };
      });
  }, [pool, rounds]);
  const [k, setK] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const reported = useRef(false);
  const r = game[k];

  if (!r)
    return (
      <Section b={b}>
        <Finish
          score={score}
          total={game.length}
          onAgain={() => {
            again();
            setK(0);
            setScore(0);
          }}
        />
      </Section>
    );
  const q = `What is ${r.p.name} wearing?`;
  const next = () => {
    const n = k + 1;
    setK(n);
    setPicked(null);
    if (n >= game.length && !reported.current) {
      reported.current = true;
      onResult(Math.round((score / game.length) * 100));
    }
  };
  return (
    <Section b={b}>
      <div className="text-label-2 flex justify-between text-[13px]">
        <span>
          Persona {k + 1} de {game.length}
        </span>
        <span className="tabular-nums">Aciertos: {score}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[34px]" style={{ background: tint('var(--purple)', 14) }} aria-hidden>
          {r.p.e}
        </span>
        <button type="button" onClick={() => speak(q)} className="flex items-center gap-2 text-left">
          <span className="text-title-3">{q}</span>
          <Volume2 size={18} className="text-ink-blue shrink-0" aria-label="Escuchar la pregunta" />
        </button>
      </div>
      <div className="mt-3 grid max-w-md grid-cols-3 gap-2">
        {r.outfit.map((it) => (
          <div key={it.id} className="bg-fill-2 aspect-[4/5] rounded-[14px] p-1">
            <Tile it={it} alt={picked ? it.us : ''} />
          </div>
        ))}
      </div>
      <div className="mt-4 space-y-2">
        {r.options.map((o) => (
          <button
            key={o}
            type="button"
            onClick={() => {
              if (picked) return;
              setPicked(o);
              if (o === r.right) setScore((s) => s + 1);
              speak(r.right);
            }}
            className={cn(
              'w-full rounded-[12px] px-4 py-3 text-left text-[15px] font-medium transition-colors',
              !picked && 'bg-fill-2 hover:bg-fill',
              picked && o === r.right && 'bg-ios-green text-white',
              picked === o && o !== r.right && 'bg-ios-red text-white',
              picked && o !== r.right && picked !== o && 'bg-fill-2 opacity-50',
            )}
          >
            {o}
          </button>
        ))}
      </div>
      {picked && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-label-2 text-[14px]">
            {r.p.pro === 'she' ? 'She' : 'He'} is wearing… = {r.p.pro === 'she' ? 'Ella' : 'Él'} lleva puesto… Plurales sin a / an.
          </p>
          <Button size="sm" onClick={next}>
            {k + 1 < game.length ? 'Siguiente' : 'Ver resultado'}
          </Button>
        </div>
      )}
    </Section>
  );
}
