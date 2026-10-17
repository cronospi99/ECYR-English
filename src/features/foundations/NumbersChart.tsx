import { useMemo, useRef, useState } from 'react';
import { RotateCcw, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { CourseBlock } from '@/content/types';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/cn';
import { Section, Done, pick, randomOrder, type OnResult } from './kit';
import { cardinal, digits, ES, ordinal, stress, suffix } from './numbers';

type Mode = 'card' | 'ord';
type Range = 'small' | 'tens' | 'hundred' | 'big' | 'teen' | 'build';

const RANGES: { value: Range; label: string }[] = [
  { value: 'small', label: '0–20' },
  { value: 'tens', label: 'Decenas' },
  { value: 'hundred', label: '1–100' },
  { value: 'big', label: 'Grandes' },
  { value: 'teen', label: '-teen / -ty' },
  { value: 'build', label: 'Construir' },
];

const NUMS: Record<Exclude<Range, 'teen' | 'build'>, number[]> = {
  small: Array.from({ length: 21 }, (_, i) => i),
  tens: [10, 20, 30, 40, 50, 60, 70, 80, 90, 100],
  hundred: Array.from({ length: 100 }, (_, i) => i + 1),
  big: [100, 200, 500, 1000, 2000, 10000, 50000, 100000, 1000000, 2500000, 1000000000],
};

const label = (n: number, mode: Mode) => (mode === 'ord' ? `${digits(n)}${suffix(n)}` : digits(n));
const word = (n: number, mode: Mode, uk = false) => (mode === 'ord' ? ordinal(n, uk) : cardinal(n, uk));

/** The numbers chart: tap a number to hear it and see it written (cardinal or ordinal). */
export function NumberChartBlock({ b }: { b: CourseBlock }) {
  const [mode, setMode] = useState<Mode>('card');
  const [range, setRange] = useState<Range>('small');
  const [sel, setSel] = useState(13);
  const [typed, setTyped] = useState('2026');

  const tap = (n: number) => {
    setSel(n);
    speak(word(n, mode), { rate: 0.85 });
  };
  const built = Math.min(Math.max(0, parseInt(typed.replace(/\D/g, ''), 10) || 0), 999_999_999_999);
  const ordinalOk = !(mode === 'ord' && sel === 0);
  const st = stress(sel);

  return (
    <Section b={b}>
      <div className="flex flex-wrap items-center gap-2">
        <Segmented
          value={mode}
          onChange={(m) => {
            setMode(m);
            if (m === 'ord' && sel === 0) setSel(1);
          }}
          options={[
            { value: 'card', label: 'Cardinales · 1, 2, 3' },
            { value: 'ord', label: 'Ordinales · 1st, 2nd' },
          ]}
        />
      </div>
      <div className="-mx-1 mt-3 flex gap-1.5 overflow-x-auto px-1 pb-1">
        {RANGES.map((r) => (
          <button
            key={r.value}
            type="button"
            onClick={() => setRange(r.value)}
            className={cn('h-8 shrink-0 rounded-full px-3.5 text-[14px] font-medium transition-colors', range === r.value ? 'bg-label text-bg' : 'bg-fill-2 hover:bg-fill')}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* Detail of the selected number */}
      {range !== 'build' && ordinalOk && (
        <motion.div key={`${sel}-${mode}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} className="bg-fill-2 mt-4 flex items-center gap-4 rounded-[18px] p-4">
          <div className="bg-ios-blue flex h-16 min-w-16 shrink-0 items-center justify-center rounded-[14px] px-3 text-[26px] font-extrabold text-white tabular-nums">{label(sel, mode)}</div>
          <div className="min-w-0 flex-1">
            <div className="text-[20px] leading-tight font-bold text-balance break-words">{word(sel, mode)}</div>
            <div className="text-label-2 mt-0.5 text-[13px]">
              {mode === 'ord' ? `Cardinal: ${cardinal(sel)}` : sel > 0 ? `Ordinal: ${ordinal(sel)} (${digits(sel)}${suffix(sel)})` : 'En teléfonos también «oh».'}
              {ES[sel] && mode === 'card' && ` · ${ES[sel]}`}
            </div>
            {st && mode === 'card' && (
              <div className="mt-1 text-[14px]">
                Acento: <span className={st.strong === 0 ? 'text-ink-red font-extrabold uppercase' : ''}>{st.a}</span>·
                <span className={st.strong === 1 ? 'text-ink-red font-extrabold uppercase' : ''}>{st.b}</span>
              </div>
            )}
            {cardinal(sel, true) !== cardinal(sel) && <div className="text-label-2 mt-0.5 text-[12px]">UK: {word(sel, mode, true)}</div>}
          </div>
          <div className="flex shrink-0 flex-col gap-1">
            <Button size="sm" variant="tinted" onClick={() => speak(word(sel, mode), { accent: 'en-US', rate: 0.85 })} aria-label="Escuchar en inglés americano">
              <Volume2 size={14} /> US
            </Button>
            <Button size="sm" variant="gray" onClick={() => speak(word(sel, mode, true), { accent: 'en-GB', rate: 0.85 })} aria-label="Escuchar en inglés británico">
              <Volume2 size={14} /> UK
            </Button>
          </div>
        </motion.div>
      )}

      {range === 'teen' ? (
        <div className="mt-4 space-y-2">
          <p className="text-label-2 text-[14px]">
            En -teen el acento va al final (thir<b>TEEN</b>); en -ty va al principio (<b>THIR</b>ty). Toca y compara.
          </p>
          {[13, 14, 15, 16, 17, 18, 19].map((t) => {
            const ty = (t - 10) * 10;
            return (
              <div key={t} className="grid grid-cols-2 gap-2">
                {[t, ty].map((n) => {
                  const s = stress(n)!;
                  return (
                    <button
                      key={n}
                      type="button"
                      onClick={() => tap(n)}
                      className={cn('flex items-center gap-3 rounded-[14px] p-3 text-left transition-colors', sel === n ? 'bg-ios-blue text-white' : 'bg-fill-2 hover:bg-fill')}
                    >
                      <span className="w-9 text-[22px] font-extrabold tabular-nums">{n}</span>
                      <span className="text-[16px]">
                        <span className={s.strong === 0 ? 'font-extrabold uppercase' : 'opacity-70'}>{s.a}</span>
                        <span className={s.strong === 1 ? 'font-extrabold uppercase' : 'opacity-70'}>{s.b}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>
      ) : range === 'build' ? (
        <div className="mt-4">
          <label className="text-label-2 text-[13px] font-medium" htmlFor="num-build">
            Escribe un número (hasta 999,999,999,999)
          </label>
          <div className="mt-1 flex gap-2">
            <input
              id="num-build"
              inputMode="numeric"
              value={typed}
              onChange={(e) => setTyped(e.target.value.replace(/[^\d]/g, '').slice(0, 12))}
              className="bg-fill-2 h-12 min-w-0 flex-1 rounded-[12px] px-4 text-[22px] font-bold tabular-nums outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--blue)_40%,transparent)]"
            />
            <Button onClick={() => speak(word(built, mode), { rate: 0.85 })}>
              <Volume2 size={16} /> Oír
            </Button>
          </div>
          <div className="mt-4 space-y-2">
            {[
              ['Se escribe', label(built, mode)],
              ['🇺🇸 US', word(built, mode)],
              ['🇬🇧 UK', word(built, mode, true)],
              ...(mode === 'card' && built > 0 ? [['Ordinal', `${ordinal(built)} · ${digits(built)}${suffix(built)}`]] : []),
              ...(mode === 'card' && built >= 1100 && built <= 2099 && built % 100 !== 0 ? [['Como año', yearWords(built)]] : []),
            ].map(([k, v]) => (
              <button key={k} type="button" onClick={() => speak(v!.replace(/\d+(st|nd|rd|th)?/g, ''), { rate: 0.85, accent: k === '🇬🇧 UK' ? 'en-GB' : 'en-US' })} className="bg-fill-2 hover:bg-fill flex w-full items-start gap-3 rounded-[12px] p-3 text-left">
                <span className="text-label-2 w-20 shrink-0 text-[13px] font-semibold">{k}</span>
                <span className="min-w-0 text-[16px] font-medium break-words">{v}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className={cn('mt-4 grid gap-1.5', range === 'hundred' ? 'grid-cols-5 sm:grid-cols-10' : range === 'big' ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4' : 'grid-cols-3 sm:grid-cols-5 lg:grid-cols-7')}>
          {NUMS[range]
            .filter((n) => !(mode === 'ord' && n === 0))
            .map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => tap(n)}
                className={cn(
                  'flex flex-col items-center justify-center rounded-[12px] px-1 text-center transition-all active:scale-95',
                  range === 'hundred' ? 'h-12' : 'h-[74px]',
                  sel === n ? 'bg-ios-blue text-white' : n % 10 === 0 && range === 'hundred' ? 'bg-[color-mix(in_srgb,var(--blue)_12%,transparent)]' : 'bg-fill-2 hover:bg-fill',
                )}
              >
                <span className={cn('font-extrabold tabular-nums', range === 'hundred' ? 'text-[15px]' : range === 'big' ? 'text-[18px]' : 'text-[24px]')}>{label(n, mode)}</span>
                {range !== 'hundred' && <span className={cn('mt-0.5 line-clamp-2 text-[11px] leading-tight', sel === n ? 'text-white/85' : 'text-label-2')}>{word(n, mode)}</span>}
              </button>
            ))}
        </div>
      )}
    </Section>
  );
}

/** 1999 → "nineteen ninety-nine", 2005 → "two thousand five", 2026 → "twenty twenty-six". */
export function yearWords(y: number) {
  if (y >= 2000 && y <= 2009) return cardinal(y);
  const hi = Math.floor(y / 100);
  const lo = y % 100;
  if (lo === 0) return `${cardinal(hi)} hundred`;
  return `${cardinal(hi)} ${lo < 10 ? `oh ${cardinal(lo)}` : cardinal(lo)}`;
}

// ------------------------------------------------------------------ game ----

interface Round {
  say: string;
  options: string[];
  answer: string;
  hint: string;
}

const rand = (a: number, b: number) => a + Math.floor(Math.random() * (b - a + 1));

function makeRound(): Round {
  const kind = pick(['teen', 'teen', 'tens', 'price', 'year', 'ordinal', 'big'] as const);
  if (kind === 'teen') {
    const t = rand(13, 19);
    const ty = (t - 10) * 10;
    const target = Math.random() < 0.5 ? t : ty;
    const opts = [t, ty, t + 1 > 19 ? t - 1 : t + 1, ty + 10 > 90 ? ty - 10 : ty + 10];
    return { say: cardinal(target), options: randomOrder([...new Set(opts)].map(String)), answer: String(target), hint: target < 20 ? '-teen: acento al final.' : '-ty: acento al principio.' };
  }
  if (kind === 'tens') {
    const n = rand(21, 99);
    const swap = Number(String(n).split('').reverse().join(''));
    const opts = [n, swap % 10 === 0 || swap < 21 ? n + 1 : swap, n + 10 > 99 ? n - 10 : n + 10, n - 1];
    return { say: cardinal(n), options: randomOrder([...new Set(opts)].map(String)), answer: String(n), hint: `${cardinal(n)}: decena + unidad.` };
  }
  if (kind === 'price') {
    const d = rand(2, 19);
    const c = pick([25, 50, 75, 99, 15, 40]);
    const s = `$${d}.${c}`;
    const alt = [`$${d}.${c === 99 ? 90 : c + 5}`, `$${d < 13 ? d + 10 : d - 10}.${c}`, `$${c}.${String(d).padStart(2, '0')}`];
    return { say: `${cardinal(d)} dollars and ${cardinal(c)} cents`, options: randomOrder([s, ...alt]), answer: s, hint: 'Primero los dólares, luego los centavos.' };
  }
  if (kind === 'year') {
    const y = pick([1492, 1810, 1819, 1948, 1991, 1999, 2005, 2010, 2014, 2026, 2030]);
    const alt = [y + 10, y - 10, y + 1].map(String);
    return { say: yearWords(y), options: randomOrder([String(y), ...alt]), answer: String(y), hint: `${y}: ${yearWords(y)}.` };
  }
  if (kind === 'big') {
    const n = pick([1500, 2300, 15000, 50000, 120000, 1000000, 3500000, 45000]);
    const alt = [n * 10, n / 10, n + (n >= 10000 ? 5000 : 500)].map((x) => digits(Math.round(x)));
    return { say: cardinal(n), options: randomOrder([digits(n), ...alt]), answer: digits(n), hint: `${digits(n)}: ${cardinal(n)}.` };
  }
  const n = pick([1, 2, 3, 5, 8, 9, 12, 13, 20, 21, 22, 23, 30, 31]);
  const near = [n + 1, n === 1 ? 4 : n - 1, n + 10].map((x) => `${x}${suffix(x)}`);
  return { say: `the ${ordinal(n)}`, options: randomOrder([...new Set([`${n}${suffix(n)}`, ...near])]), answer: `${n}${suffix(n)}`, hint: `${n}${suffix(n)} = ${ordinal(n)}.` };
}

/** Listening game: hear a number, choose it. */
export function NumberGameBlock({ b, onResult }: { b: CourseBlock; onResult: OnResult }) {
  const total = typeof b.rounds === 'number' ? b.rounds : 10;
  const [seed, setSeed] = useState(0);
  const rounds = useMemo(() => Array.from({ length: total }, makeRound), [total, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  const [k, setK] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const reported = useRef(false);
  const r = rounds[k];
  const finished = k >= total;

  const play = (say = r?.say) => say && speak(say, { rate: 0.85 });
  const choose = (o: string) => {
    if (picked || !r) return;
    setPicked(o);
    if (o === r.answer) setScore((s) => s + 1);
  };
  const next = () => {
    const n = k + 1;
    setK(n);
    setPicked(null);
    if (n >= total && !reported.current) {
      reported.current = true;
      onResult(Math.round((score / total) * 100));
    } else if (rounds[n]) setTimeout(() => play(rounds[n]!.say), 150);
  };
  const restart = () => {
    setSeed((s) => s + 1);
    setK(0);
    setPicked(null);
    setScore(0);
  };

  return (
    <Section b={b}>
      {finished ? (
        <div className="text-center">
          <div className="text-[44px] font-extrabold tabular-nums">
            {score}/{total}
          </div>
          <Done text={score === total ? '¡Perfecto! Tienes muy buen oído para los números.' : 'Buen trabajo. Repite el juego para mejorar tu oído.'} />
          <Button className="mt-4" variant="tinted" onClick={restart}>
            <RotateCcw size={16} /> Jugar otra vez
          </Button>
        </div>
      ) : (
        r && (
          <>
            <div className="text-label-2 flex justify-between text-[13px]">
              <span>
                Ronda {k + 1} de {total}
              </span>
              <span className="tabular-nums">Aciertos: {score}</span>
            </div>
            <div className="mt-3 flex justify-center">
              <Button size="lg" onClick={() => play()}>
                <Volume2 size={20} /> Escuchar
              </Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {r.options.map((o) => (
                <button
                  key={o}
                  type="button"
                  onClick={() => choose(o)}
                  className={cn(
                    'h-14 rounded-[14px] text-[20px] font-bold tabular-nums transition-colors',
                    !picked && 'bg-fill-2 hover:bg-fill',
                    picked && o === r.answer && 'bg-ios-green text-white',
                    picked && o === picked && o !== r.answer && 'bg-ios-red text-white',
                    picked && o !== r.answer && o !== picked && 'bg-fill-2 opacity-50',
                  )}
                >
                  {o}
                </button>
              ))}
            </div>
            {picked && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                <p className="text-label-2 text-[14px]">
                  {picked === r.answer ? '¡Correcto! ' : `Era ${r.answer}. `}
                  {r.hint}
                </p>
                <Button size="sm" onClick={next}>
                  {k + 1 < total ? 'Siguiente' : 'Ver resultado'}
                </Button>
              </div>
            )}
          </>
        )
      )}
    </Section>
  );
}
