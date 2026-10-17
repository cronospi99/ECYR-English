/**
 * Extra graphic aids for a grammar point (src/content/aids.ts): a sentence that
 * changes step by step, words on a scale, a "¿cuál uso?" decision, picture cards
 * and minimal pairs. Text inside **double asterisks** is highlighted.
 */
import { Fragment, type ReactNode } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight, GitFork, Images, Lightbulb, Ruler, Shuffle, Split, Wand2, type LucideIcon } from 'lucide-react';
import { SpeakButton } from '@/components/learning/SpeakButton';
import type { Aid } from '@/content/aids';
import { cn } from '@/lib/cn';
import { deep, ink, tint } from '@/lib/color';

const PAL = ['var(--blue)', 'var(--green)', 'var(--orange)', 'var(--purple)', 'var(--teal)', 'var(--pink)'];
const pal = (k: number) => PAL[k % PAL.length]!;

/** Text without the ** marks, for speech. */
const plain = (s: string) => s.replace(/\*\*/g, '');

/** Renders **marked** fragments as coloured highlights. */
export function Marked({ text, color, className, invert = false }: { text: string; color: string; className?: string; /** On a dark fill. */ invert?: boolean }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  return (
    <span className={className}>
      {parts.map((p, i) =>
        i % 2 ? (
          <mark key={i} className="rounded-[5px] px-[3px] py-px font-bold [box-decoration-break:clone]" style={invert ? { background: 'rgb(255 255 255 / 0.22)', color: '#fff' } : { background: tint(color, 20), color: ink(color, 64) }}>
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </span>
  );
}

const KIND: Record<Aid['kind'], { label: string; icon: LucideIcon }> = {
  transform: { label: 'Paso a paso', icon: Shuffle },
  scale: { label: 'En una escala', icon: Ruler },
  choose: { label: '¿Cuál uso?', icon: GitFork },
  pictures: { label: 'En dibujos', icon: Images },
  pairs: { label: 'Parecidas, no iguales', icon: Split },
};

/** Fades children in once as they scroll into view (still when reduced motion is on). */
function Appear({ i = 0, className, children, as = 'div' }: { i?: number; className?: string; children: ReactNode; as?: 'div' | 'li' }) {
  const reduce = useReducedMotion();
  const M = as === 'li' ? motion.li : motion.div;
  return (
    <M
      className={className}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-40px' }}
      transition={{ delay: i * 0.07, duration: 0.3, ease: [0.32, 0.72, 0, 1] }}
    >
      {children}
    </M>
  );
}

export function Aids({ aids, color }: { aids?: Aid[]; color: string }) {
  if (!aids?.length) return null;
  return (
    <div className="space-y-4">
      {aids.map((a, k) => (
        <AidCard key={`${a.kind}-${k}`} aid={a} color={k === 0 ? color : pal(k + 2)} />
      ))}
    </div>
  );
}

function AidCard({ aid, color }: { aid: Aid; color: string }) {
  const { label, icon: Icon } = KIND[aid.kind] ?? { label: 'Ayuda visual', icon: Wand2 };
  return (
    <section className="overflow-hidden rounded-[20px]" style={{ background: tint(color, 5), boxShadow: `inset 0 0 0 1px ${tint(color, 20)}` }}>
      <header className="flex items-center gap-2.5 px-4 pt-3.5 pb-1">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-white" style={{ background: deep(color) }} aria-hidden>
          <Icon size={17} />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-bold tracking-[0.07em] uppercase" style={{ color: ink(color) }}>
            {label}
          </div>
          <h5 className="text-[16px] leading-snug font-semibold text-balance">
            <Marked text={aid.title} color={color} />
          </h5>
        </div>
      </header>
      <div className="px-3 pt-2 pb-3.5 sm:px-4">
        {aid.kind === 'transform' && <Transform aid={aid} color={color} />}
        {aid.kind === 'scale' && <Scale aid={aid} color={color} />}
        {aid.kind === 'choose' && <Choose aid={aid} color={color} />}
        {aid.kind === 'pictures' && <Pictures aid={aid} color={color} />}
        {aid.kind === 'pairs' && <Pairs aid={aid} />}
      </div>
    </section>
  );
}

// ------------------------------------------------------------ transform --

function Transform({ aid, color }: { aid: Extract<Aid, { kind: 'transform' }>; color: string }) {
  const row = aid.steps.length <= 3;
  return (
    <ol className={cn('flex flex-col', row && 'md:flex-row md:items-stretch')}>
      {aid.steps.map((s, k) => {
        const c = pal(k);
        return (
          <Fragment key={k}>
            {k > 0 && (
              <li aria-hidden className={cn('text-label-3 flex justify-center py-1', row && 'md:items-center md:px-1 md:py-0')}>
                <ArrowDown size={18} className={cn(row && 'md:hidden')} style={{ color: ink(color) }} />
                {row && <ArrowRight size={18} className="hidden md:block" style={{ color: ink(color) }} />}
              </li>
            )}
            <Appear as="li" i={k} className={cn('bg-card shadow-card flex min-w-0 flex-col rounded-[16px] p-3', row && 'md:flex-1')}>
              <span className="self-start rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase" style={{ background: tint(c, 15), color: ink(c) }}>
                {s.label}
              </span>
              <span className="mt-1.5 flex items-start gap-1">
                <span className="min-w-0 flex-1 text-[16px] leading-snug font-medium text-pretty">
                  <Marked text={s.sentence} color={c} />
                </span>
                <SpeakButton text={plain(s.sentence)} size={15} className="-mt-1" />
              </span>
              {s.change && (
                <span className="text-label-2 mt-auto flex items-start gap-1.5 pt-2 text-[13px] leading-snug">
                  <Wand2 size={13} className="mt-0.5 shrink-0" style={{ color: ink(c) }} aria-hidden />
                  <Marked text={s.change} color={c} />
                </span>
              )}
            </Appear>
          </Fragment>
        );
      })}
    </ol>
  );
}

// ---------------------------------------------------------------- scale --

function Scale({ aid, color }: { aid: Extract<Aid, { kind: 'scale' }>; color: string }) {
  const reduce = useReducedMotion();
  const items = aid.items.map((it, k) => ({ ...it, k, v: Math.max(0, Math.min(100, it.value)) }));
  const pos = (v: number) => `${3 + v * 0.94}%`;
  return (
    <div>
      <div className="bg-card shadow-card rounded-[16px] px-3 pt-3 pb-2.5 sm:px-4">
        <div className="relative h-[74px] sm:h-[92px]" role="img" aria-label={`Escala de ${aid.from} a ${aid.to}: ${items.map((x) => `${x.word} ${x.v}%`).join(', ')}`}>
          <div className="absolute inset-x-0 top-1/2 h-3 -translate-y-1/2 rounded-full" style={{ background: `linear-gradient(90deg, ${tint(color, 14)}, ${color})` }} />
          {items.map((x, j) => {
            const up = j % 2 === 0;
            return (
              <motion.div
                key={x.k}
                className="absolute top-1/2"
                style={{ left: pos(x.v) }}
                initial={reduce ? false : { opacity: 0, scale: 0.6 }}
                whileInView={{ opacity: 1, scale: 1 }}
                viewport={{ once: true }}
                transition={{ delay: 0.1 + j * 0.06, type: 'spring', stiffness: 360, damping: 22 }}
              >
                <span
                  className="absolute top-0 left-0 inline-flex h-6 w-6 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full text-[12px] font-bold text-white shadow-[0_0_0_2.5px_var(--card)]"
                  style={{ background: deep(color, 52 + x.v * 0.2) }}
                >
                  {j + 1}
                </span>
                <span
                  className={cn(
                    'absolute left-0 hidden -translate-x-1/2 text-[12.5px] font-semibold whitespace-nowrap sm:block',
                    up ? 'bottom-[18px]' : 'top-[18px]',
                  )}
                  style={{ color: ink(color) }}
                >
                  {x.word}
                </span>
              </motion.div>
            );
          })}
        </div>
        <div className="text-label-2 flex justify-between gap-4 text-[12px] font-semibold">
          <span>← {aid.from}</span>
          <span className="text-right">{aid.to} →</span>
        </div>
      </div>
      <ul className="mt-2.5 grid gap-2 sm:grid-cols-2">
        {items.map((x, j) => (
          <Appear as="li" key={x.k} i={j} className="bg-card flex items-start gap-2.5 rounded-[14px] py-2.5 pr-1.5 pl-3">
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-bold text-white" style={{ background: deep(color, 52 + x.v * 0.2) }}>
              {j + 1}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-baseline gap-x-2">
                <span className="text-[16px] font-bold">{x.word}</span>
                <span className="text-[12px] font-semibold tabular-nums" style={{ color: ink(color) }}>
                  {x.v}%
                </span>
                {x.es && <span className="text-label-2 text-[13px]">{x.es}</span>}
              </span>
              <span className="mt-0.5 block text-[15px] leading-snug text-pretty">
                <Marked text={x.example} color={color} />
              </span>
            </span>
            <SpeakButton text={plain(x.example)} size={15} />
          </Appear>
        ))}
      </ul>
    </div>
  );
}

// --------------------------------------------------------------- choose --

function Choose({ aid, color }: { aid: Extract<Aid, { kind: 'choose' }>; color: string }) {
  const n = aid.branches.length;
  return (
    <div>
      <div className="mx-auto flex max-w-lg items-center gap-2.5 rounded-[16px] px-3.5 py-3 text-white" style={{ background: deep(color) }}>
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/20 text-[18px] font-bold" aria-hidden>
          ?
        </span>
        <span className="text-[16px] leading-snug font-semibold text-pretty">
          <Marked text={aid.question} color={color} invert />
        </span>
      </div>
      <div className="flex justify-center py-1.5" aria-hidden>
        <GitFork size={20} className="rotate-180" style={{ color: ink(color) }} />
      </div>
      <ul className={cn('grid gap-2.5', n >= 2 && 'sm:grid-cols-2', n >= 3 && 'lg:grid-cols-3')}>
        {aid.branches.map((b, k) => {
          const c = pal(k);
          return (
            <Appear as="li" key={k} i={k} className="bg-card shadow-card flex flex-col rounded-[16px] p-3">
              <span className="text-[14px] leading-snug text-pretty">
                <span className="font-bold" style={{ color: ink(c) }}>
                  Si{' '}
                </span>
                <Marked text={b.if.replace(/^si\s+/i, '')} color={c} />
              </span>
              <ArrowDown size={16} className="my-1.5" style={{ color: ink(c) }} aria-hidden />
              <span className="self-start rounded-[10px] px-2.5 py-1 text-[15px] font-bold text-white" style={{ background: deep(c) }}>
                {plain(b.use)}
              </span>
              <span className="mt-2 flex items-start gap-1 border-t border-[var(--separator)] pt-2">
                <span className="min-w-0 flex-1 text-[15px] leading-snug text-pretty italic">
                  <Marked text={b.example} color={c} />
                </span>
                <SpeakButton text={plain(b.example)} size={15} className="-mt-1" />
              </span>
            </Appear>
          );
        })}
      </ul>
    </div>
  );
}

// ------------------------------------------------------------- pictures --

function Pictures({ aid, color }: { aid: Extract<Aid, { kind: 'pictures' }>; color: string }) {
  return (
    <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4">
      {aid.items.map((x, k) => (
        <Appear as="li" key={k} i={k} className="bg-card shadow-card relative flex flex-col items-center rounded-[16px] px-2 pt-3 pb-2.5 text-center">
          <span className="text-[40px] leading-none" aria-hidden>
            {x.emoji}
          </span>
          <span className="mt-2 text-[16px] leading-tight font-bold text-balance">
            <Marked text={x.en} color={color} />
          </span>
          <span className="text-label-2 mt-0.5 text-[13px] leading-snug text-balance">{x.es}</span>
          <SpeakButton text={plain(x.en)} size={15} className="absolute top-1 right-1" />
        </Appear>
      ))}
    </ul>
  );
}

// ---------------------------------------------------------------- pairs --

function Pairs({ aid }: { aid: Extract<Aid, { kind: 'pairs' }> }) {
  const A = 'var(--blue)';
  const B = 'var(--orange)';
  return (
    <ul className="space-y-3">
      {aid.items.map((p, k) => (
        <Appear as="li" key={k} i={k} className="bg-card shadow-card rounded-[16px] p-2.5">
          <div className="grid items-center gap-1.5 sm:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <PairSide text={p.a} color={A} tag="A" />
            <span
              className="bg-fill-2 text-label-2 mx-auto inline-flex h-8 w-8 items-center justify-center rounded-full text-[18px] font-bold"
              aria-label="no es igual a"
            >
              ≠
            </span>
            <PairSide text={p.b} color={B} tag="B" />
          </div>
          <p className="text-label-2 mt-2 flex items-start gap-1.5 px-1 text-[14px] leading-snug text-pretty">
            <Lightbulb size={15} className="text-ink-orange mt-0.5 shrink-0" aria-hidden />
            <Marked text={p.note} color="var(--orange)" />
          </p>
        </Appear>
      ))}
    </ul>
  );
}

function PairSide({ text, color, tag }: { text: string; color: string; tag: string }) {
  return (
    <div className="flex h-full items-start gap-2 rounded-[12px] py-2 pr-1 pl-2.5" style={{ background: tint(color, 10) }}>
      <span className="mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: deep(color) }} aria-hidden>
        {tag}
      </span>
      <span className="min-w-0 flex-1 text-[15.5px] leading-snug text-pretty">
        <Marked text={text} color={color} />
      </span>
      <SpeakButton text={plain(text)} size={15} className="-mt-1" />
    </div>
  );
}
