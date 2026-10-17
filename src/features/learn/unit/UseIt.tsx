/**
 * "Úsalo": the practice end of a grammar lesson — dialogues as chats (book +
 * extra ones), the drill as self-check cards with model answers, the contrast
 * chart as side-by-side cards and the pronunciation note with playable chips.
 */
import { Fragment, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, ChevronRight, Eye, ListOrdered, MessagesSquare, Mic, Play, RotateCcw, Scale, Table2, Trophy, Volume2, X } from 'lucide-react';
import { SpeakButton } from '@/components/learning/SpeakButton';
import type { GrammarChart, GrammarPoint } from '@/content/types';
import type { DrillExtra } from '@/content/aids';
import type { ExtraDialogue } from '@/content/dialogues';
import { canSpeak, speak } from '@/lib/speech';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/cn';
import { deep, ink, tint } from '@/lib/color';
import type { KeySpec } from './formula';
import { ColorTable } from './ColorTable';
import { Dialogue } from './Dialogue';
import { Hl, Kicker, QuoteText } from './ui';

type UseTab = 'dialogue' | 'drill' | 'contrast' | 'sound';

export function UseIt({
  g,
  spec,
  color,
  drill,
  dialogues,
}: {
  g: GrammarPoint;
  spec: KeySpec;
  color: string;
  /** Drill with model answers (src/content/generated/drills-<level>.json). */
  drill?: DrillExtra;
  dialogues?: ExtraDialogue[];
}) {
  const nDlg = (g.dialogue?.length ? 1 : 0) + (dialogues?.length ?? 0);
  const drillItems = drill?.items.length ? drill.items : g.drill?.items;
  const opts = [
    nDlg > 0 && { value: 'dialogue' as const, label: nDlg > 1 ? `Diálogos · ${nDlg}` : 'Diálogo', icon: MessagesSquare },
    drillItems && drillItems.length > 0 && { value: 'drill' as const, label: 'Drill', icon: ListOrdered },
    g.contrast && { value: 'contrast' as const, label: 'Contraste', icon: Scale },
    g.sound && { value: 'sound' as const, label: 'Sonido', icon: Volume2 },
  ].filter(Boolean) as { value: UseTab; label: string; icon: typeof Mic }[];
  const [tab, setTab] = useState<UseTab | null>(null);
  if (!opts.length) return null;
  const cur = opts.find((o) => o.value === tab)?.value ?? opts[0]!.value;
  return (
    <section>
      <Kicker icon={MessagesSquare} color={color}>
        Úsalo
      </Kicker>
      {opts.length > 1 && (
        <div role="tablist" aria-label="Formas de practicar" className="no-scrollbar -mx-1 mb-3.5 flex gap-1.5 overflow-x-auto px-1 pb-0.5">
          {opts.map((o) => {
            const on = o.value === cur;
            return (
              <button
                key={o.value}
                role="tab"
                aria-selected={on}
                onClick={() => setTab(o.value)}
                className={cn('inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold transition-colors', !on && 'bg-fill-2 hover:bg-fill')}
                style={on ? { background: deep(color), color: '#fff' } : undefined}
              >
                <o.icon size={15} aria-hidden /> {o.label}
              </button>
            );
          })}
        </div>
      )}
      <div role="tabpanel">
        {cur === 'dialogue' && <Dialogues g={g} spec={spec} color={color} extra={dialogues} />}
        {cur === 'drill' && drillItems && <Drill g={g} extra={drill} items={drillItems} spec={spec} color={color} />}
        {cur === 'contrast' && g.contrast && <Contrast chart={g.contrast} spec={spec} />}
        {cur === 'sound' && g.sound && <Sound text={g.sound} />}
      </div>
    </section>
  );
}

// ------------------------------------------------------------- dialogues --

function Dialogues({ g, spec, color, extra = [] }: { g: GrammarPoint; spec: KeySpec; color: string; extra?: ExtraDialogue[] }) {
  const list = useMemo(
    () => [
      ...(g.dialogue?.length ? [{ key: 'book', label: '📖 Del libro', title: undefined, subtitle: undefined, scene: undefined, cast: undefined, lines: g.dialogue }] : []),
      ...extra.map((d, k) => {
        const emoji = d.scene.match(/^\p{Extended_Pictographic}️?/u)?.[0];
        return { key: `x${k}`, label: `${emoji ?? '💬'} ${d.titleEs || d.title}`, title: d.title, subtitle: d.titleEs, scene: d.scene, cast: d.cast, lines: d.lines };
      }),
    ],
    [g.dialogue, extra],
  );
  const [i, setI] = useState(0);
  const d = list[Math.min(i, list.length - 1)];
  if (!d) return null;
  return (
    <div>
      {list.length > 1 && (
        <div className="no-scrollbar -mx-1 mb-3 flex gap-1.5 overflow-x-auto px-1 pb-0.5" role="group" aria-label="Elegir diálogo">
          {list.map((x, k) => {
            const on = x.key === d.key;
            return (
              <button
                key={x.key}
                type="button"
                aria-pressed={on}
                onClick={() => setI(k)}
                className={cn('h-8 max-w-[240px] shrink-0 truncate rounded-[10px] px-3 text-[13px] font-semibold transition-colors', !on && 'bg-fill-2 hover:bg-fill')}
                style={on ? { background: tint(color, 18), color: ink(color), boxShadow: `inset 0 0 0 1.5px ${tint(color, 50)}` } : undefined}
              >
                {x.label}
              </button>
            );
          })}
        </div>
      )}
      <div className="bg-fill-2/60 rounded-[20px] p-3 sm:p-4">
        <Dialogue key={d.key} lines={d.lines} spec={spec} bare cast={d.cast} title={d.title} subtitle={d.subtitle} scene={d.scene} />
      </div>
    </div>
  );
}

// ----------------------------------------------------------------- drill --

const tokens = (s: string) => s.split(/(\s+)/).filter(Boolean);
const normWord = (w: string) => w.toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}']/gu, '');

/** Marks the words of `answer` that are not in `item` (longest common subsequence on words). */
function diffWords(item: string, answer: string): { text: string; changed: boolean }[] {
  const a = item.split(/\s+/).map(normWord).filter(Boolean);
  const parts = tokens(answer);
  const b = parts.map((p) => (/^\s+$/.test(p) ? null : normWord(p)));
  const words = b.map((w, k) => ({ w, k })).filter((x) => x.w);
  const n = a.length;
  const m = words.length;
  const L = Array.from({ length: n + 1 }, () => new Array<number>(m + 1).fill(0));
  for (let x = n - 1; x >= 0; x--) for (let y = m - 1; y >= 0; y--) L[x]![y] = a[x] === words[y]!.w ? L[x + 1]![y + 1]! + 1 : Math.max(L[x + 1]![y]!, L[x]![y + 1]!);
  const keep = new Set<number>();
  for (let x = 0, y = 0; x < n && y < m; ) {
    if (a[x] === words[y]!.w) {
      keep.add(words[y]!.k);
      x++;
      y++;
    } else if (L[x + 1]![y]! >= L[x]![y + 1]!) x++;
    else y++;
  }
  return parts.map((p, k) => ({ text: p, changed: b[k] != null && b[k] !== '' && !keep.has(k) }));
}

const cleanItem = (s: string) => s.replace(/\s*(→|->)\s*$/, '').trim();
const same = (a: string, b: string) => {
  const f = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[^\p{L}\p{N}' ]/gu, '').replace(/\s+/g, ' ').trim();
  return f(a) === f(b);
};

function Drill({ g, extra, items, spec, color }: { g: GrammarPoint; extra?: DrillExtra; items: string[]; spec: KeySpec; color: string }) {
  const answers = extra?.answers?.length === items.length ? extra.answers : null;
  const name = extra?.name || g.drill?.name;
  const prompt = extra?.prompt || g.drill?.prompt;
  return (
    <div>
      {(name || prompt) && (
        <p className="mb-3 flex items-start gap-2 text-[15px] text-pretty">
          <ListOrdered size={17} className="mt-0.5 shrink-0" style={{ color: ink(color) }} aria-hidden />
          <span>
            {name && <strong className="font-semibold">{name}. </strong>}
            {prompt && <QuoteText text={prompt} color={color} />}
          </span>
        </p>
      )}
      {answers ? (
        <DrillCards items={items} answers={answers} color={color} />
      ) : (
        <ol className="space-y-1.5">
          {items.map((d, k) => (
            <li key={d} className="bg-fill-2 flex items-start gap-2.5 rounded-[12px] py-2 pr-1.5 pl-2.5 text-[15px]">
              <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: deep(color) }}>
                {k + 1}
              </span>
              <span className="min-w-0 flex-1 pt-0.5 text-pretty">
                <Hl text={d} spec={spec} />
              </span>
              <SpeakButton text={cleanItem(d)} size={15} />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

/** Blanks ("___") as dashed slots. */
function ItemText({ text }: { text: string }) {
  return (
    <>
      {text.split(/(_{2,}|…{1,}|\.{3,})/).map((p, k) =>
        /^(_{2,}|…+|\.{3,})$/.test(p) ? (
          <span key={k} className="mx-0.5 inline-block w-12 translate-y-[3px] rounded-[5px] border-b-2 border-dashed border-[var(--purple)] bg-[color-mix(in_srgb,var(--purple)_10%,transparent)] align-baseline" aria-label="hueco">
            &nbsp;
          </span>
        ) : (
          <Fragment key={k}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function DrillCards({ items, answers, color }: { items: string[]; answers: string[]; color: string }) {
  const reduce = useReducedMotion();
  const [k, setK] = useState(0);
  const [shown, setShown] = useState(false);
  const [typed, setTyped] = useState('');
  const [res, setRes] = useState<(boolean | undefined)[]>([]);
  const n = items.length;
  const done = res.filter((r) => r !== undefined).length;
  const ok = res.filter(Boolean).length;
  const finished = k >= n;

  const mark = (good: boolean) => {
    setRes((r) => {
      const c = [...r];
      c[k] = good;
      return c;
    });
    setShown(false);
    setTyped('');
    setK((x) => x + 1);
  };
  const restart = () => {
    setK(0);
    setRes([]);
    setShown(false);
    setTyped('');
  };

  const item = items[Math.min(k, n - 1)]!;
  const answer = answers[Math.min(k, n - 1)]!;
  const diff = useMemo(() => diffWords(cleanItem(item).replace(/_{2,}/g, ' '), answer), [item, answer]);
  const match = typed.trim() && same(typed, answer);

  return (
    <div>
      {/* progress */}
      <div className="mb-2.5 flex items-center gap-3">
        <ol className="flex flex-1 gap-1" aria-label={`Progreso: ${done} de ${n}`}>
          {items.map((_, j) => (
            <li
              key={j}
              className="h-1.5 flex-1 rounded-full transition-colors duration-300"
              style={{ background: res[j] === true ? 'var(--green)' : res[j] === false ? 'var(--red)' : j === k ? tint(color, 60) : 'var(--fill)' }}
            />
          ))}
        </ol>
        <span className="text-label-2 shrink-0 text-[13px] font-semibold tabular-nums">
          {done}/{n} · <span className="text-ink-green">✓ {ok}</span>
        </span>
      </div>

      <AnimatePresence mode="wait" initial={false}>
        {finished ? (
          <motion.div
            key="end"
            initial={reduce ? false : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center rounded-[20px] px-4 py-6 text-center"
            style={{ background: tint(ok / n >= 0.7 ? 'var(--green)' : 'var(--orange)', 11) }}
          >
            <Trophy size={30} style={{ color: ink(ok / n >= 0.7 ? 'var(--green)' : 'var(--orange)') }} aria-hidden />
            <div className="mt-2 text-[20px] font-bold">
              {ok} de {n} bien
            </div>
            <p className="text-label-2 mt-1 text-[14px]">{ok === n ? '¡Perfecto! Ya lo dominas.' : ok / n >= 0.7 ? 'Muy bien. Repite las que fallaste.' : 'Vuelve a intentarlo: mira bien la parte resaltada.'}</p>
            <button type="button" onClick={restart} className="bg-card shadow-card mt-4 inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[15px] font-semibold">
              <RotateCcw size={16} aria-hidden /> Repetir
            </button>
          </motion.div>
        ) : (
          <motion.div
            key={k}
            initial={reduce ? false : { opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? undefined : { opacity: 0, x: -16 }}
            transition={{ duration: 0.22 }}
            className="bg-card shadow-card overflow-hidden rounded-[20px]"
            style={{ boxShadow: `inset 0 0 0 1px ${tint(color, 22)}` }}
          >
            <div className="px-4 pt-3.5 pb-3">
              <div className="text-[12px] font-bold tracking-[0.06em] uppercase" style={{ color: ink(color) }}>
                Frase {k + 1} de {n}
              </div>
              <div className="mt-1.5 flex items-start gap-1">
                <p className="min-w-0 flex-1 text-[18px] leading-snug font-semibold text-pretty">
                  <ItemText text={cleanItem(item)} />
                </p>
                {!/_{2,}/.test(item) && <SpeakButton text={cleanItem(item)} size={16} />}
              </div>
              <div className="text-label-2 mt-2.5 flex items-center gap-1.5 text-[13px]">
                <Mic size={14} aria-hidden /> Dilo en voz alta o escríbelo:
              </div>
              <input
                value={typed}
                onChange={(e) => setTyped(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && setShown(true)}
                placeholder="Escribe tu respuesta (opcional)"
                aria-label="Tu respuesta"
                autoComplete="off"
                autoCapitalize="off"
                spellCheck={false}
                className="bg-fill-2 placeholder:text-label-3 mt-1.5 h-11 w-full rounded-[12px] px-3.5 text-[16px] outline-none focus:shadow-[inset_0_0_0_2px_var(--blue)]"
              />
            </div>
            {shown ? (
              <motion.div initial={reduce ? false : { opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="px-4 pt-3 pb-4" style={{ background: tint('var(--green)', 8) }}>
                <div className="text-ink-green flex items-center gap-1.5 text-[12px] font-bold tracking-[0.06em] uppercase">
                  <Check size={14} aria-hidden /> Respuesta modelo
                </div>
                <div className="mt-1 flex items-start gap-1">
                  <p className="min-w-0 flex-1 text-[18px] leading-snug font-semibold text-pretty">
                    {diff.map((d, j) =>
                      d.changed ? (
                        <mark key={j} className="rounded-[5px] px-[3px] [box-decoration-break:clone]" style={{ background: tint('var(--green)', 24), color: ink('var(--green)', 70) }}>
                          {d.text}
                        </mark>
                      ) : (
                        <Fragment key={j}>{d.text}</Fragment>
                      ),
                    )}
                  </p>
                  <SpeakButton text={answer} size={16} />
                </div>
                {typed.trim() && (
                  <p className={cn('mt-1.5 text-[14px] font-semibold', match ? 'text-ink-green' : 'text-label-2')}>
                    {match ? '¡Escribiste exactamente eso!' : (
                      <>
                        Tú: <span className="font-normal">{typed}</span>
                      </>
                    )}
                  </p>
                )}
                <div className="mt-3 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => mark(true)}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[12px] text-[15px] font-semibold text-white"
                    style={{ background: deep('var(--green)') }}
                  >
                    <Check size={17} aria-hidden /> Lo dije bien
                  </button>
                  <button
                    type="button"
                    onClick={() => mark(false)}
                    className="inline-flex h-11 items-center justify-center gap-1.5 rounded-[12px] text-[15px] font-semibold"
                    style={{ background: tint('var(--red)', 13), color: ink('var(--red)') }}
                  >
                    <X size={17} aria-hidden /> Me equivoqué
                  </button>
                </div>
              </motion.div>
            ) : (
              <div className="flex items-center gap-2 px-4 pb-4">
                <button
                  type="button"
                  onClick={() => setShown(true)}
                  className="inline-flex h-11 flex-1 items-center justify-center gap-1.5 rounded-[12px] text-[15px] font-semibold text-white"
                  style={{ background: deep(color) }}
                >
                  <Eye size={17} aria-hidden /> Ver respuesta
                </button>
                <button type="button" onClick={() => mark(false)} className="text-label-2 inline-flex h-11 items-center gap-0.5 rounded-[12px] px-3 text-[14px] font-semibold">
                  Saltar <ChevronRight size={15} aria-hidden />
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// -------------------------------------------------------------- contrast --

const CONTRAST = ['var(--blue)', 'var(--orange)', 'var(--green)', 'var(--purple)', 'var(--teal)', 'var(--pink)', 'var(--indigo)', 'var(--red)'];
const isSentence = (s: string) => s.trim().split(/\s+/).length >= 3 && /[.?!…]$|^[A-Z‘“]/.test(s.trim());

function Contrast({ chart, spec }: { chart: GrammarChart; spec: KeySpec }) {
  const [table, setTable] = useState(false);
  const { cols, rows } = chart;
  const exampleCols = useMemo(
    () =>
      new Set(
        cols
          .map((c, j) => ({ c, j }))
          .filter(({ c, j }) => j > 0 && (/example|ejemplo|sentence/i.test(c) || rows.filter((r) => r[j] && isSentence(r[j]!)).length >= Math.ceil(rows.length * 0.6)))
          .map((x) => x.j),
      ),
    [cols, rows],
  );
  // Without sentences the columns are the things compared (Defining vs Non-defining…).
  const byColumn = exampleCols.size === 0 && cols.length >= 3 && cols.length <= 4;
  return (
    <figure>
      <div className="mb-3 flex items-center justify-between gap-3">
        {chart.title ? <figcaption className="text-[16px] leading-snug font-semibold">{chart.title}</figcaption> : <span />}
        <button
          type="button"
          aria-pressed={table}
          onClick={() => setTable((t) => !t)}
          className="bg-fill-2 hover:bg-fill inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors"
        >
          <Table2 size={14} aria-hidden /> {table ? 'Ver tarjetas' : 'Ver tabla'}
        </button>
      </div>
      {table ? (
        <ColorTable chart={{ ...chart, title: undefined }} color="var(--teal)" spec={spec} />
      ) : byColumn ? (
        <ByColumn chart={chart} />
      ) : (
        <ByRow chart={chart} spec={spec} exampleCols={exampleCols} />
      )}
    </figure>
  );
}

function ByColumn({ chart }: { chart: GrammarChart }) {
  const { cols, rows } = chart;
  const sides = cols.slice(1).map((c, j) => ({ c, j: j + 1, color: CONTRAST[j]! }));
  return (
    <div className={cn('grid items-stretch gap-2', sides.length === 2 ? 'sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]' : 'sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)_auto_minmax(0,1fr)]')}>
      {sides.map((s, k) => (
        <Fragment key={s.j}>
          {k > 0 && <Vs />}
          <div className="bg-card shadow-card overflow-hidden rounded-[18px]" style={{ boxShadow: `inset 0 0 0 1.5px ${tint(s.color, 35)}` }}>
            <div className="px-3.5 py-2.5 text-[15px] font-bold text-white" style={{ background: deep(s.color) }}>
              {s.c}
            </div>
            <dl className="divide-y divide-[var(--separator)] px-3.5">
              {rows.map((r, i) => (
                <div key={i} className="py-2">
                  <dt className="text-label-2 text-[11.5px] font-bold tracking-wide uppercase">{r[0]}</dt>
                  <dd className="mt-0.5 text-[15px] font-semibold text-pretty" style={{ color: ink(s.color, 64) }}>
                    <QuoteText text={r[s.j] ?? ''} color={s.color} subtle />
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </Fragment>
      ))}
    </div>
  );
}

function Vs() {
  return (
    <div className="flex items-center justify-center" aria-hidden>
      <span className="shadow-card inline-flex h-8 w-8 items-center justify-center rounded-full text-[12px] font-extrabold tracking-wide uppercase" style={{ background: 'var(--label)', color: 'var(--card)' }}>
        vs
      </span>
    </div>
  );
}

function ByRow({ chart, spec, exampleCols }: { chart: GrammarChart; spec: KeySpec; exampleCols: Set<number> }) {
  const { cols, rows } = chart;
  const reduce = useReducedMotion();
  return (
    <ul className={cn('grid gap-2.5', rows.length >= 2 && 'sm:grid-cols-2', rows.length >= 5 && 'lg:grid-cols-3')}>
      {rows.map((r, i) => {
        const c = CONTRAST[i % CONTRAST.length]!;
        return (
          <motion.li
            key={i}
            initial={reduce ? false : { opacity: 0, y: 8 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.05, duration: 0.28 }}
            className="bg-card shadow-card flex flex-col overflow-hidden rounded-[18px]"
            style={{ boxShadow: `inset 0 0 0 1.5px ${tint(c, 30)}` }}
          >
            <div className="flex items-start gap-2 px-3.5 py-2.5" style={{ background: tint(c, 14) }}>
              <span className="mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: deep(c) }} aria-hidden>
                {i + 1}
              </span>
              <span className="min-w-0 text-[15px] leading-snug font-bold text-pretty" style={{ color: ink(c, 66) }}>
                <span className="sr-only">{cols[0]}: </span>
                <QuoteText text={r[0] ?? ''} color={c} subtle />
              </span>
            </div>
            <div className="flex flex-1 flex-col gap-2 px-3.5 pt-2.5 pb-3">
              {r.slice(1).map((cell, j) => {
                const col = j + 1;
                if (!cell) return null;
                return exampleCols.has(col) ? (
                  <div key={col} className="bg-fill-2 flex items-start gap-1 rounded-[11px] py-1.5 pr-1 pl-2.5">
                    <span className="min-w-0 flex-1 text-[15px] leading-snug text-pretty">
                      <span className="sr-only">{cols[col]}: </span>
                      <Hl text={cell} spec={spec} />
                    </span>
                    {isSentence(cell) && !/^not\b/i.test(cell) && <SpeakButton text={cell.replace(/[“”‘’]/g, '')} size={15} className="-mt-0.5" />}
                  </div>
                ) : (
                  <div key={col} className="flex items-start gap-1.5">
                    <ArrowRight size={15} className="mt-[3px] shrink-0" style={{ color: ink(c) }} aria-hidden />
                    <span className="min-w-0">
                      <span className="text-label-2 block text-[11px] font-bold tracking-wide uppercase">{cols[col]}</span>
                      <span className="text-[16px] leading-snug font-bold text-pretty" style={{ color: ink(c, 66) }}>
                        <QuoteText text={cell} color={c} subtle />
                      </span>
                    </span>
                  </div>
                );
              })}
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}

// ----------------------------------------------------------------- sound --

const IPA_CHARS = /[ˈˌːəɪʊʌɒɔæɜθðʃʒŋɑɛ̩]/;
const unstress = (s: string) => s.replace(/[A-Z]{2,}/g, (m) => m.toLowerCase()).replace(/\s+/g, ' ');

/** Stressed syllables (written in CAPITALS) in a bolder colour with a dot above. */
function Stressed({ text, color }: { text: string; color: string }) {
  return (
    <>
      {text.split(/([A-Z]{2,})/).map((p, k) =>
        /^[A-Z]{2,}$/.test(p) ? (
          <span key={k} className="relative font-extrabold" style={{ color: ink(color, 70) }}>
            <span className="absolute -top-1.5 left-1/2 h-1.5 w-1.5 -translate-x-1/2 rounded-full" style={{ background: color }} aria-hidden />
            {p}
          </span>
        ) : (
          <Fragment key={k}>{p}</Fragment>
        ),
      )}
    </>
  );
}

function Sound({ text }: { text: string }) {
  const { accent, speechRate } = useSettings();
  const [on, setOn] = useState<number | null>(null);
  const purple = 'var(--purple)';
  const { phrases, ipa } = useMemo(() => {
    const q = [...text.matchAll(/“([^”]{1,80})”/g)].map((m) => m[1]!.trim()).filter((s) => /[a-z]/i.test(s));
    const ip = [...text.matchAll(/(^|[\s(“])(\/[^/\n]{1,40}\/)/g)]
      .map((m) => m[2]!)
      .filter((s) => IPA_CHARS.test(s) || !/\s/.test(s));
    return { phrases: [...new Set(q)].slice(0, 5), ipa: [...new Set(ip)].slice(0, 5) };
  }, [text]);
  const play = (k: number, s: string) => {
    setOn(k);
    speak(unstress(s), { accent, rate: Math.min(speechRate, 0.9), onEnd: () => setOn(null) });
    setTimeout(() => setOn((x) => (x === k ? null : x)), Math.max(1800, s.length * 110));
  };
  return (
    <div className="overflow-hidden rounded-[20px]" style={{ background: tint(purple, 8), boxShadow: `inset 0 0 0 1px ${tint(purple, 22)}` }}>
      {(phrases.length > 0 || ipa.length > 0) && (
        <div className="space-y-3 px-4 pt-4">
          {phrases.length > 0 && (
            <div>
              <div className="text-ink-purple mb-1.5 text-[11px] font-bold tracking-[0.07em] uppercase">Escucha y repite</div>
              <div className="flex flex-wrap gap-2">
                {phrases.map((p, k) => (
                  <button
                    key={p}
                    type="button"
                    disabled={!canSpeak()}
                    onClick={() => play(k, p)}
                    aria-label={`Escuchar: ${unstress(p)}`}
                    className="bg-card shadow-card inline-flex min-h-10 items-center gap-2 rounded-full py-1.5 pr-3.5 pl-1.5 text-left text-[16px] font-semibold transition-transform active:scale-[0.97]"
                  >
                    <span className={cn('inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-white', on === k && 'animate-pulse')} style={{ background: deep(purple) }} aria-hidden>
                      <Play size={13} fill="currentColor" />
                    </span>
                    <span className="pt-1">
                      <Stressed text={p} color={purple} />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {ipa.length > 0 && (
            <div>
              <div className="text-ink-purple mb-1.5 text-[11px] font-bold tracking-[0.07em] uppercase">Así suena</div>
              <div className="flex flex-wrap gap-1.5">
                {ipa.map((s) => (
                  <span key={s} className="rounded-[10px] px-2.5 py-1 font-mono text-[15px] font-semibold" style={{ background: tint(purple, 16), color: ink(purple, 66) }}>
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      <p className="flex items-start gap-2.5 px-4 py-3.5 text-[15px] leading-relaxed">
        <Volume2 size={18} className="text-ink-purple mt-0.5 shrink-0" aria-hidden />
        <span className="text-pretty">
          <QuoteText text={text} color={purple} subtle />
        </span>
      </p>
    </div>
  );
}
