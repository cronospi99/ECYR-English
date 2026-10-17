import { useEffect, useMemo, useRef, useState } from 'react';
import { Eraser, Lightbulb, Play, RotateCcw, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';
import type { CourseBlock } from '@/content/types';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Callout, DataTable } from '@/components/learning/Callout';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { Quiz } from '@/components/learning/Quiz';
import { speak } from '@/lib/speech';
import { cn } from '@/lib/cn';
import { arr, str, Es, Section, Done, Miss, norm, shuffle, type OnResult } from './kit';
import { FormulaBlock, PhrasebookBlock, SceneBlock, SpellerBlock } from './extras';
import { NumberChartBlock, NumberGameBlock } from './NumbersChart';
import { ClothesGameBlock, WardrobeBlock } from './Clothing';

export const INTERACTIVE = new Set(['match', 'order', 'blank', 'mc', 'quiz', 'numbergame', 'clothesgame']);

export function Block({ block, onResult }: { block: CourseBlock; onResult: OnResult }) {
  switch (block.t) {
    case 'rule':
      return <RuleBlock b={block} />;
    case 'cards':
      return <CardsBlock b={block} />;
    case 'phonics':
      return <PhonicsBlock b={block} />;
    case 'song':
      return <SongBlock b={block} />;
    case 'table':
      return (
        <Section b={block}>
          <DataTable cols={arr<string>(block.head)} rows={arr<string[]>(block.rows)} />
          {str(block.note) && <p className="text-label-2 mt-3 text-[14px]">{str(block.note)}</p>}
        </Section>
      );
    case 'trace':
      return <TraceBlock b={block} />;
    case 'match':
      return <MatchBlock b={block} onResult={onResult} />;
    case 'order':
      return <OrderBlock b={block} onResult={onResult} />;
    case 'blank':
      return <BlankBlock b={block} onResult={onResult} />;
    case 'mc':
      return <McBlock b={block} onResult={onResult} />;
    case 'quiz':
      return (
        <Section b={block}>
          <Quiz
            items={arr<{ d?: string; q: string; opts: string[]; a: number; why?: string }>(block.qs).map((q) => ({
              q: q.q,
              options: q.opts,
              answer: q.a,
              explain: q.why,
              context: q.d,
            }))}
            onFinish={onResult}
          />
        </Section>
      );
    case 'examples':
      return (
        <Section b={block}>
          <ul className="space-y-2">
            {arr<{ en: string; es: string }>(block.items).map((it) => (
              <li key={it.en} className="bg-fill-2 flex items-start gap-2 rounded-[12px] p-3">
                <SpeakButton text={it.en} size={16} className="-mt-0.5" />
                <div>
                  <div className="text-[15px] font-medium">{it.en}</div>
                  <Es text={it.es} />
                </div>
              </li>
            ))}
          </ul>
        </Section>
      );
    case 'dialogue':
      return <DialogueBlock b={block} />;
    case 'reading':
      return <ReadingBlock b={block} />;
    case 'phrasebook':
      return <PhrasebookBlock b={block} />;
    case 'formula':
      return <FormulaBlock b={block} />;
    case 'speller':
      return <SpellerBlock b={block} />;
    case 'scene':
      return <SceneBlock b={block} />;
    case 'numberchart':
      return <NumberChartBlock b={block} />;
    case 'numbergame':
      return <NumberGameBlock b={block} onResult={onResult} />;
    case 'wardrobe':
      return <WardrobeBlock b={block} />;
    case 'clothesgame':
      return <ClothesGameBlock b={block} onResult={onResult} />;
    default:
      return null;
  }
}

// ---------------------------------------------------------------- content ----

function RuleBlock({ b }: { b: CourseBlock }) {
  return (
    <Card className="relative overflow-hidden p-5 sm:p-6">
      {str(b.burst) && (
        <span className="bg-ios-red absolute top-4 right-4 rotate-3 rounded-[8px] px-2.5 py-1 text-[11px] font-extrabold tracking-wider text-white uppercase">
          {str(b.burst)}
        </span>
      )}
      <h3 className="text-title-3 pr-24">{b.title}</h3>
      <p className="mt-3 text-[16px] text-pretty">{str(b.en)}</p>
      <Es text={str(b.es)} className="mt-1 text-[15px]" />
      {str(b.formula) && (
        <div className="bg-fill-2 mt-4 rounded-[12px] px-4 py-3 text-center font-mono text-[15px] font-semibold whitespace-pre-wrap">
          {str(b.formula)}
        </div>
      )}
      {arr<string>(b.steps).length > 0 && (
        <ol className="mt-4 space-y-2">
          {arr<string>(b.steps).map((s, i) => (
            <li key={i} className="flex gap-3 text-[15px]">
              <span className="bg-ios-blue flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white">
                {i + 1}
              </span>
              <span className="text-pretty">{s}</span>
            </li>
          ))}
        </ol>
      )}
      {str(b.tip) && (
        <Callout tone="orange" icon={<Lightbulb size={16} />} title="Tip" className="mt-4">
          {str(b.tip)}
        </Callout>
      )}
    </Card>
  );
}

function CardsBlock({ b }: { b: CourseBlock }) {
  const items = arr<{ k: string; w: string; s?: string; es?: string; v?: number }>(b.items);
  const [open, setOpen] = useState<Set<number>>(new Set());
  return (
    <Section b={b}>
      <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 lg:grid-cols-6">
        {items.map((it, i) => {
          const flipped = open.has(i);
          return (
            <button
              key={i}
              type="button"
              onClick={() =>
                setOpen((s) => {
                  const n = new Set(s);
                  if (n.has(i)) n.delete(i);
                  else n.add(i);
                  return n;
                })
              }
              className={cn(
                'relative flex aspect-square flex-col items-center justify-center rounded-[16px] p-2 text-center transition-all active:scale-95',
                flipped ? 'bg-ios-blue text-white' : it.v ? 'bg-[color-mix(in_srgb,var(--red)_12%,transparent)]' : 'bg-fill-2',
              )}
            >
              {flipped ? (
                <>
                  <span className={cn('leading-tight font-semibold', it.w.length > 22 ? 'text-[12px]' : it.w.length > 12 ? 'text-[14px]' : 'text-[16px]')}>{it.w}</span>
                  {it.s && <span className="mt-0.5 text-[12px] opacity-80">{it.s}</span>}
                  {it.es && <span className="mt-0.5 text-[11px] opacity-70">{it.es}</span>}
                </>
              ) : (
                <span className={cn('font-extrabold', it.k.length > 6 ? 'text-[15px]' : it.k.length > 3 ? 'text-[18px]' : 'text-[30px]')}>{it.k}</span>
              )}
              {flipped && (
                <span className="absolute top-1 right-1" onClick={(e) => e.stopPropagation()}>
                  <SpeakButton text={it.w} size={14} className="text-white hover:bg-white/20" />
                </span>
              )}
            </button>
          );
        })}
      </div>
    </Section>
  );
}

function PhonicsBlock({ b }: { b: CourseBlock }) {
  const items = arr<{ k: string; s: string; e: string; w: string }>(b.items);
  return (
    <Section b={b}>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
        {items.map((it) => (
          <button
            key={it.k}
            type="button"
            onClick={() => speak(it.w.split('–').pop()!.trim())}
            className="bg-fill-2 hover:bg-fill flex items-center gap-3 rounded-[14px] p-3 text-left transition-colors"
          >
            <span className="text-[28px]">{it.e}</span>
            <span>
              <span className="block text-[20px] leading-none font-extrabold">{it.k}</span>
              <span className="text-label-2 block text-[12px]">
                {it.s} · {it.w}
              </span>
            </span>
          </button>
        ))}
      </div>
    </Section>
  );
}

function SongBlock({ b }: { b: CourseBlock }) {
  const lines = arr<{ letters: string[] }>(b.lines);
  const [active, setActive] = useState<number | null>(null);
  const play = (k = 0) => {
    if (k >= lines.length) return setActive(null);
    setActive(k);
    speak(lines[k]!.letters.join(', '), { rate: 0.85, onEnd: () => play(k + 1) });
  };
  return (
    <Section b={b}>
      <Button size="sm" variant="tinted" onClick={() => play()}>
        <Play size={14} fill="currentColor" /> Reproducir
      </Button>
      <div className="mt-4 space-y-2">
        {lines.map((l, i) => (
          <div key={i} className={cn('flex flex-wrap gap-1.5 rounded-[12px] p-1.5 transition-colors', active === i && 'bg-[color-mix(in_srgb,var(--yellow)_25%,transparent)]')}>
            {l.letters.map((x, j) => (
              <span key={j} className="bg-card flex h-10 min-w-10 items-center justify-center rounded-[10px] px-2 text-[18px] font-bold shadow-card">
                {x}
              </span>
            ))}
          </div>
        ))}
      </div>
      {str(b.note) && <p className="text-label-2 mt-3 text-[14px] italic">{str(b.note)}</p>}
    </Section>
  );
}

function DialogueBlock({ b }: { b: CourseBlock }) {
  const lines = arr<{ who: string; text: string; es?: string }>(b.lines);
  const [playing, setPlaying] = useState<number | null>(null);
  const speakers = [...new Set(lines.map((l) => l.who))];
  const play = (k = 0) => {
    if (k >= lines.length) return setPlaying(null);
    setPlaying(k);
    speak(lines[k]!.text, { accent: speakers.indexOf(lines[k]!.who) % 2 ? 'en-GB' : 'en-US', onEnd: () => play(k + 1) });
  };
  return (
    <Section b={b}>
      <Button size="sm" variant="tinted" onClick={() => play()}>
        <Volume2 size={14} /> Escuchar diálogo
      </Button>
      <div className="mt-4 space-y-2">
        {lines.map((l, k) => {
          const right = speakers.indexOf(l.who) % 2 === 1;
          return (
            <div key={k} className={cn('flex', right ? 'justify-end' : 'justify-start')}>
              <div
                className={cn(
                  'max-w-[85%] rounded-[18px] px-4 py-2.5',
                  right ? 'bg-ios-blue rounded-br-[6px] text-white' : 'bg-fill rounded-bl-[6px]',
                  playing === k && 'ring-ios-orange ring-2',
                )}
              >
                <div className={cn('text-[11px] font-semibold', right ? 'text-white/70' : 'text-label-2')}>{l.who}</div>
                <div className="text-[15px]">{l.text}</div>
                {l.es && <Es text={l.es} className={cn(right && 'text-white/70')} />}
              </div>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function ReadingBlock({ b }: { b: CourseBlock }) {
  const paras = arr<string>(b.paras);
  const vocab = arr<[string, string]>(b.vocab);
  return (
    <Section b={b}>
      <Button size="sm" variant="tinted" onClick={() => speak(paras.join(' '), { rate: 0.9 })}>
        <Volume2 size={14} /> Leer en voz alta
      </Button>
      <div className="mt-4 space-y-3 text-[17px] leading-[1.7]">
        {paras.map((p, i) => (
          <p key={i} className="text-pretty">
            {p}
          </p>
        ))}
      </div>
      {vocab.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2">
          {vocab.map(([en, es]) => (
            <span key={en} className="bg-fill-2 rounded-full px-3 py-1 text-[13px]">
              <b>{en}</b> <span className="text-label-2">· {es}</span>
            </span>
          ))}
        </div>
      )}
    </Section>
  );
}

// ------------------------------------------------------------ trace (canvas) --

function TraceBlock({ b }: { b: CourseBlock }) {
  const letters = arr<string>(b.letters);
  const [letter, setLetter] = useState(letters[0] ?? 'A');
  const canvas = useRef<HTMLCanvasElement>(null);
  const drawing = useRef(false);

  const clear = () => {
    const c = canvas.current;
    if (!c) return;
    const ctx = c.getContext('2d')!;
    ctx.clearRect(0, 0, c.width, c.height);
  };
  useEffect(clear, [letter]);

  const pos = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * e.currentTarget.width, y: ((e.clientY - r.top) / r.height) * e.currentTarget.height };
  };

  return (
    <Section b={b}>
      <div className="mb-3 flex flex-wrap gap-1.5">
        {letters.map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLetter(l)}
            className={cn('h-9 w-9 rounded-[10px] text-[16px] font-bold', l === letter ? 'bg-ios-blue text-white' : 'bg-fill-2')}
          >
            {l}
          </button>
        ))}
      </div>
      <div className="bg-fill-2 relative mx-auto aspect-[2/1] max-w-lg overflow-hidden rounded-[20px]">
        <div className="text-label-3 pointer-events-none absolute inset-0 flex items-center justify-center gap-8 font-[ui-rounded,system-ui] text-[150px] leading-none font-bold opacity-50 select-none">
          <span>{letter}</span>
          <span>{letter.toLowerCase()}</span>
        </div>
        <canvas
          ref={canvas}
          width={800}
          height={400}
          className="absolute inset-0 h-full w-full touch-none"
          onPointerDown={(e) => {
            drawing.current = true;
            e.currentTarget.setPointerCapture(e.pointerId);
            const ctx = e.currentTarget.getContext('2d')!;
            const p = pos(e);
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
          }}
          onPointerMove={(e) => {
            if (!drawing.current) return;
            const ctx = e.currentTarget.getContext('2d')!;
            const p = pos(e);
            ctx.lineTo(p.x, p.y);
            ctx.strokeStyle = getComputedStyle(document.documentElement).getPropertyValue('--blue') || '#007aff';
            ctx.lineWidth = 14;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            ctx.stroke();
          }}
          onPointerUp={() => (drawing.current = false)}
        />
      </div>
      <div className="mt-3 flex justify-center gap-2">
        <Button size="sm" variant="gray" onClick={clear}>
          <Eraser size={14} /> Borrar
        </Button>
        <Button size="sm" variant="tinted" onClick={() => speak(letter)}>
          <Volume2 size={14} /> Escuchar
        </Button>
      </div>
    </Section>
  );
}

// -------------------------------------------------------------- interactive --

function MatchBlock({ b, onResult }: { b: CourseBlock; onResult: OnResult }) {
  const pairs = arr<[string, string]>(b.pairs);
  const right = useMemo(() => shuffle(pairs.map((p) => p[1]), pairs.length), [pairs]);
  const [sel, setSel] = useState<number | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<string | null>(null);
  const [mistakes, setMistakes] = useState(0);
  const reported = useRef(false);

  const pick = (r: string) => {
    if (sel === null) return;
    if (pairs[sel]![1] === r) {
      const n = new Set(matched).add(sel);
      setMatched(n);
      setSel(null);
      if (n.size === pairs.length && !reported.current) {
        reported.current = true;
        onResult(Math.round((pairs.length / (pairs.length + mistakes)) * 100));
      }
    } else {
      setMistakes((m) => m + 1);
      setWrong(r);
      setTimeout(() => setWrong(null), 450);
    }
  };

  return (
    <Section b={b}>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-2">
          {pairs.map(([l], i) => (
            <button
              key={i}
              type="button"
              disabled={matched.has(i)}
              onClick={() => setSel(i)}
              className={cn(
                'w-full rounded-[12px] px-3 py-3 text-[16px] font-semibold transition-all',
                matched.has(i) ? 'bg-[color-mix(in_srgb,var(--green)_15%,transparent)] text-ink-green' : sel === i ? 'bg-ios-blue text-white' : 'bg-fill-2 hover:bg-fill',
              )}
            >
              {l}
            </button>
          ))}
        </div>
        <div className="space-y-2">
          {right.map((r) => {
            const done = [...matched].some((i) => pairs[i]![1] === r);
            return (
              <motion.button
                key={r}
                type="button"
                disabled={done}
                onClick={() => pick(r)}
                animate={wrong === r ? { x: [0, -6, 6, -4, 4, 0] } : {}}
                transition={{ duration: 0.4 }}
                className={cn(
                  'w-full rounded-[12px] px-3 py-3 text-[15px] transition-colors',
                  done ? 'bg-[color-mix(in_srgb,var(--green)_15%,transparent)] text-ink-green' : wrong === r ? 'bg-[color-mix(in_srgb,var(--red)_14%,transparent)]' : 'bg-fill-2 hover:bg-fill',
                )}
              >
                {r}
              </motion.button>
            );
          })}
        </div>
      </div>
      {matched.size === pairs.length && <Done text={`¡Completado! ${mistakes} ${mistakes === 1 ? 'error' : 'errores'}.`} />}
    </Section>
  );
}

function OrderBlock({ b, onResult }: { b: CourseBlock; onResult: OnResult }) {
  const words = arr<string>(b.words);
  const answer = str(b.answer);
  const pool = useMemo(() => shuffle(words.map((w, i) => ({ w, i })), words.length + answer.length), [words, answer]);
  const [built, setBuilt] = useState<number[]>([]);
  const [result, setResult] = useState<boolean | null>(null);
  const [tries, setTries] = useState(0);

  const check = () => {
    const ok = norm(built.map((i) => words[i]).join(' ')) === norm(answer);
    setResult(ok);
    setTries((t) => t + 1);
    if (ok) onResult(tries === 0 ? 100 : tries === 1 ? 70 : 50);
  };

  return (
    <Section b={b}>
      {str(b.prompt) && <p className="mb-3 text-[15px] font-medium">{str(b.prompt)}</p>}
      <div className="bg-fill-2 flex min-h-[56px] flex-wrap gap-2 rounded-[14px] p-2.5">
        {built.map((i, k) => (
          <button
            key={k}
            type="button"
            onClick={() => {
              setBuilt(built.filter((_, j) => j !== k));
              setResult(null);
            }}
            className="bg-ios-blue rounded-[10px] px-3 py-2 text-[15px] font-semibold text-white"
          >
            {words[i]}
          </button>
        ))}
        {!built.length && <span className="text-label-3 self-center px-2 text-[14px]">Toca las palabras en orden…</span>}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {pool.map(({ w, i }) =>
          built.includes(i) ? null : (
            <button
              key={i}
              type="button"
              onClick={() => {
                setBuilt([...built, i]);
                setResult(null);
              }}
              className="bg-card rounded-[10px] px-3 py-2 text-[15px] font-medium shadow-card active:scale-95"
            >
              {w}
            </button>
          ),
        )}
      </div>
      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={check} disabled={built.length !== words.length || result === true}>
          Comprobar
        </Button>
        <Button size="sm" variant="gray" onClick={() => (setBuilt([]), setResult(null))}>
          <RotateCcw size={14} /> Reiniciar
        </Button>
      </div>
      {result === true && <Done text={str(b.why) || '¡Correcto!'} />}
      {result === false && <Miss text="Casi. Revisa el orden e inténtalo otra vez." />}
    </Section>
  );
}

function BlankBlock({ b, onResult }: { b: CourseBlock; onResult: OnResult }) {
  const items = arr<{ pre: string; post: string; a: string; why?: string; alt?: string | string[] }>(b.items);
  const [vals, setVals] = useState<string[]>(() => items.map(() => ''));
  const [checked, setChecked] = useState(false);
  const ok = (i: number) => {
    const it = items[i]!;
    const accepted = [it.a, ...(Array.isArray(it.alt) ? it.alt : it.alt ? [it.alt] : [])].map(norm);
    return accepted.includes(norm(vals[i] ?? ''));
  };
  const check = () => {
    setChecked(true);
    onResult(Math.round((items.filter((_, i) => ok(i)).length / items.length) * 100));
  };
  return (
    <Section b={b}>
      <ol className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="text-[16px]">
            <div className="flex flex-wrap items-center gap-2">
              {it.pre && <span>{it.pre}</span>}
              <input
                value={vals[i]}
                onChange={(e) => {
                  const n = [...vals];
                  n[i] = e.target.value;
                  setVals(n);
                  setChecked(false);
                }}
                aria-label={`Respuesta ${i + 1}`}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                className={cn(
                  'bg-fill-2 h-9 w-28 rounded-[10px] px-3 text-center font-semibold outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--blue)_40%,transparent)]',
                  checked && (ok(i) ? 'ring-ios-green text-ink-green ring-2' : 'ring-ios-red ring-2'),
                )}
              />
              {it.post && <span>{it.post}</span>}
            </div>
            {checked && !ok(i) && (
              <div className="text-label-2 mt-1 text-[13px]">
                Respuesta: <b className="text-label">{it.a}</b>
                {it.why && ` — ${it.why}`}
              </div>
            )}
          </li>
        ))}
      </ol>
      <Button size="sm" className="mt-4" onClick={check}>
        Comprobar
      </Button>
    </Section>
  );
}

function McBlock({ b, onResult }: { b: CourseBlock; onResult: OnResult }) {
  const qs = arr<{ q: string; opts: string[]; a: number; why?: string }>(b.qs);
  const [ans, setAns] = useState<(number | null)[]>(() => qs.map(() => null));
  const reported = useRef(false);
  const choose = (qi: number, k: number) => {
    if (ans[qi] !== null) return;
    const n = [...ans];
    n[qi] = k;
    setAns(n);
    if (n.every((x) => x !== null) && !reported.current) {
      reported.current = true;
      onResult(Math.round((n.filter((x, i) => x === qs[i]!.a).length / qs.length) * 100));
    }
  };
  return (
    <Section b={b}>
      <div className="space-y-5">
        {qs.map((q, qi) => (
          <div key={qi}>
            <div className="mb-2 text-[16px] font-semibold">
              {qi + 1}. {q.q}
            </div>
            <div className="flex flex-wrap gap-2">
              {q.opts.map((o, k) => {
                const picked = ans[qi];
                const reveal = picked !== null;
                return (
                  <button
                    key={k}
                    type="button"
                    onClick={() => choose(qi, k)}
                    className={cn(
                      'rounded-[12px] px-4 py-2 text-[15px] transition-colors',
                      !reveal && 'bg-fill-2 hover:bg-fill',
                      reveal && k === q.a && 'bg-ios-green text-white',
                      reveal && k === picked && k !== q.a && 'bg-ios-red text-white',
                      reveal && k !== q.a && k !== picked && 'bg-fill-2 opacity-50',
                    )}
                  >
                    {o}
                  </button>
                );
              })}
            </div>
            {ans[qi] !== null && q.why && <p className="text-label-2 mt-2 text-[13px]">{q.why}</p>}
          </div>
        ))}
      </div>
    </Section>
  );
}
