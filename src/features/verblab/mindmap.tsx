import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Volume2, X } from 'lucide-react';
import { LevelChip } from '@/components/ui/Misc';
import { useAsync } from '@/hooks/useAsync';
import { loadPhrasalExamples } from '@/content/levels';
import type { CefrLevel } from '@/content/types';
import { speak } from '@/lib/speech';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/cn';
import { Highlight, phrasalTerms } from './highlight';

/**
 * Phrasal-verb mind maps, as in the original Verb Quest: a grid of base verbs;
 * tapping one opens its map (the verb in the middle, its phrasal verbs as
 * bubbles on animated branches); tapping a bubble opens its meaning and examples.
 */
export interface MindItem {
  pv: string;
  emoji: string;
  def: string;
  ex: string;
  es?: string;
  level?: CefrLevel;
  ctx?: string[];
}

export interface MindFamily {
  verb: string;
  emoji: string;
  grad: string;
  color: string;
  items: MindItem[];
}

const sayAll = (texts: string[]) => speak(texts.join('. '), { rate: 0.92 });

// ------------------------------------------------------------------- hub ---

export function PhrasalExplorer({ families, intro }: { families: MindFamily[]; intro?: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const fam = families.find((f) => f.verb === open) ?? null;
  return (
    <>
      {intro && <p className="text-label-2 mb-4 px-1 text-[15px]">{intro}</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6">
        {families.map((f, i) => (
          <FamilyCard key={f.verb} f={f} i={i} onOpen={() => setOpen(f.verb)} />
        ))}
      </div>
      <AnimatePresence>{fam && <MindMap key={fam.verb} family={fam} onClose={() => setOpen(null)} />}</AnimatePresence>
    </>
  );
}

function FamilyCard({ f, i, onOpen }: { f: MindFamily; i: number; onOpen: () => void }) {
  const reduce = useReducedMotion();
  const particles = [...new Set(f.items.map((it) => it.pv.split(/\s+/).slice(1).join(' ')).filter(Boolean))];
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={reduce ? false : { opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay: Math.min(i * 0.02, 0.4), type: 'spring', stiffness: 380, damping: 26 }}
      whileHover={reduce ? undefined : { y: -6, scale: 1.03 }}
      whileTap={{ scale: 0.95 }}
      className="group relative flex aspect-[4/3.4] flex-col items-center justify-center gap-1 overflow-hidden rounded-[22px] p-3 text-white shadow-[0_10px_24px_-12px_rgb(0_0_0/0.45)]"
      style={{ background: f.grad }}
      aria-label={`${f.verb}: ${f.items.length} phrasal verbs`}
    >
      <span className="pointer-events-none absolute -top-6 -right-6 h-20 w-20 rounded-full bg-white/15" aria-hidden />
      <span className="pointer-events-none absolute -bottom-8 -left-4 h-16 w-16 rounded-full bg-black/10" aria-hidden />
      <span className="text-[34px] leading-none drop-shadow-[0_2px_4px_rgb(0_0_0/0.25)]">{f.emoji}</span>
      <span className="text-[21px] leading-tight font-extrabold tracking-tight drop-shadow-[0_1px_3px_rgb(0_0_0/0.25)]">{f.verb}</span>
      <span className="text-[12px] font-medium opacity-90">{f.items.length} phrasal verbs</span>
      {particles.length > 0 && (
        <span className="mt-1 line-clamp-1 max-w-full text-[11px] font-semibold opacity-0 transition-opacity group-hover:opacity-95">
          {particles.slice(0, 5).join(' · ')}
        </span>
      )}
    </motion.button>
  );
}

// ------------------------------------------------------------- mind map ---

interface Pt {
  x: number;
  y: number;
}

/** Whether `n` bubbles fit on the two rings without overlapping (points are spaced by angle). */
function ringsFit(n: number, w: number, h: number, node: { w: number; h: number }) {
  const rx = w / 2 - node.w / 2 - 20;
  const ry = h / 2 - node.h / 2 - 18;
  const max = (sx: number, sy: number) => Math.floor((Math.PI * 2) / Math.max((node.w + 10) / sx, (node.h + 8) / sy));
  const inner = n > 9 ? Math.floor(n * 0.4) : 0;
  return n - inner <= max(rx, ry) && inner <= max(rx * 0.52, ry * 0.55);
}

function layout(n: number, w: number, h: number, wide: boolean, node: { w: number; h: number }) {
  if (!wide) {
    // Phones, and families too big for the rings: the verb on top, bubbles in
    // rows below, branches curving down to each.
    const cols = Math.max(2, Math.min(6, Math.floor((w - 24) / (node.w + 16))));
    const gapX = (w - 24) / cols;
    const top = 150;
    const rowH = node.h + 34;
    const pts: Pt[] = Array.from({ length: n }, (_, i) => ({
      x: 12 + gapX * (i % cols) + gapX / 2,
      y: top + Math.floor(i / cols) * rowH + node.h / 2,
    }));
    return { center: { x: w / 2, y: 64 }, pts, height: top + Math.ceil(n / cols) * rowH + 24 };
  }
  const center = { x: w / 2, y: h / 2 };
  const rx = w / 2 - node.w / 2 - 20;
  const ry = h / 2 - node.h / 2 - 18;
  const inner = n > 9 ? Math.floor(n * 0.4) : 0;
  const outer = n - inner;
  const pts: Pt[] = [];
  for (let i = 0; i < outer; i++) {
    const a = -Math.PI / 2 + (i / outer) * Math.PI * 2;
    pts.push({ x: center.x + Math.cos(a) * rx, y: center.y + Math.sin(a) * ry });
  }
  for (let i = 0; i < inner; i++) {
    const a = -Math.PI / 2 + ((i + 0.5) / inner) * Math.PI * 2;
    pts.push({ x: center.x + Math.cos(a) * rx * 0.52, y: center.y + Math.sin(a) * ry * 0.55 });
  }
  return { center, pts, height: h };
}

function MindMap({ family, onClose }: { family: MindFamily; onClose: () => void }) {
  const canvas = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [sel, setSel] = useState<number | null>(null);
  const reduce = useReducedMotion();
  const closeBtn = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    const el = canvas.current;
    if (!el) return;
    const fit = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (sel != null) setSel(null);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, sel]);

  const ring = { w: 132, h: 70 };
  const wide = size.w >= 720 && size.h >= 460 && ringsFit(family.items.length, size.w, size.h, ring);
  const node = wide ? ring : { w: Math.min(170, (size.w - 48) / (size.w >= 460 ? 3 : 2)), h: 66 };
  const { center, pts, height } = useMemo(() => layout(family.items.length, size.w, size.h, wide, node), [family.items.length, size.w, size.h, wide, node.w, node.h]);

  return createPortal(
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-label={`Mapa de phrasal verbs con ${family.verb}`}
      className="fixed inset-0 z-[90] flex flex-col text-white"
      style={{ background: `radial-gradient(120% 90% at 50% 40%, color-mix(in srgb, ${family.color} 55%, #0b1026), #0b1026)` }}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="pt-safe flex items-center gap-3 px-4 py-3 sm:px-6">
        <button
          ref={closeBtn}
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 hover:bg-white/22"
          aria-label="Volver"
        >
          <ArrowLeft size={20} />
        </button>
        <div className="min-w-0">
          <div className="text-[20px] leading-tight font-extrabold">{family.verb}</div>
          <div className="text-[12px] text-white/70">{family.items.length} phrasal verbs</div>
        </div>
        <div className="ml-auto hidden text-[13px] text-white/70 sm:block">Toca una burbuja para ver significado y ejemplos</div>
      </div>
      <div ref={canvas} className={cn('relative flex-1', wide ? 'overflow-hidden' : 'overflow-y-auto overscroll-contain')}>
        {size.w > 0 && (
          <div className="relative" style={{ height: wide ? '100%' : height }}>
            <svg className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
              {pts.map((p, i) => {
                const d = wide
                  ? `M${center.x} ${center.y} L${p.x} ${p.y}`
                  : `M${center.x} ${center.y + 40} C${center.x} ${(center.y + p.y) / 2 + 20} ${p.x} ${(center.y + p.y) / 2} ${p.x} ${p.y - node.h / 2}`;
                return (
                  <motion.path
                    key={i}
                    d={d}
                    fill="none"
                    stroke="rgba(255,255,255,.42)"
                    strokeWidth={2}
                    strokeLinecap="round"
                    initial={reduce ? false : { pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 0.5, delay: 0.1 + i * 0.03, ease: 'easeOut' }}
                  />
                );
              })}
            </svg>
            <motion.div
              className="absolute flex flex-col items-center justify-center rounded-full text-center shadow-[0_18px_40px_-12px_rgb(0_0_0/0.6)]"
              style={{ left: center.x, top: center.y, width: wide ? 128 : 104, height: wide ? 128 : 104, x: '-50%', y: '-50%', background: family.grad }}
              initial={reduce ? false : { scale: 0.3, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18 }}
            >
              <span className="text-[34px] leading-none">{family.emoji}</span>
              <span className="text-[20px] font-extrabold drop-shadow-[0_2px_6px_rgb(0_0_0/0.3)]">{family.verb}</span>
            </motion.div>
            {pts.map((p, i) => {
              const it = family.items[i]!;
              return (
                <motion.button
                  key={it.pv + i}
                  type="button"
                  onClick={() => setSel(i)}
                  className="absolute flex flex-col items-center justify-center rounded-[16px] bg-[#fffdf7] px-2 py-1.5 text-center text-[#1c1c1e] shadow-[0_8px_20px_-8px_rgb(0_0_0/0.5)] outline-offset-2"
                  style={{ left: p.x, top: p.y, width: node.w, minHeight: node.h, x: '-50%', y: '-50%' }}
                  initial={reduce ? false : { scale: 0.25, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  whileHover={reduce ? undefined : { scale: 1.08 }}
                  whileTap={{ scale: 0.95 }}
                  transition={{ type: 'spring', stiffness: 360, damping: 20, delay: reduce ? 0 : 0.18 + i * 0.035 }}
                  aria-label={`${it.pv}: ${it.def}`}
                >
                  <span className="text-[22px] leading-none">{it.emoji}</span>
                  <span className="mt-0.5 text-[14px] leading-tight font-bold">{it.pv}</span>
                  {it.level && <span className="text-[10px] font-semibold text-black/45">{it.level}</span>}
                </motion.button>
              );
            })}
          </div>
        )}
      </div>
      <AnimatePresence>
        {sel != null && (
          <PhrasalDetail
            key={sel}
            family={family}
            index={sel}
            onIndex={setSel}
            onClose={() => setSel(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>,
    document.body,
  );
}

// ---------------------------------------------------------------- detail ---

function PhrasalDetail({ family, index, onIndex, onClose }: { family: MindFamily; index: number; onIndex: (i: number) => void; onClose: () => void }) {
  const it = family.items[index]!;
  const { data: extra } = useAsync(loadPhrasalExamples, []);
  const showEs = useSettings((s) => s.spanishHints);
  const examples = [it.ex, ...(extra?.[`${it.pv}|${it.def}`] ?? [])].filter(Boolean);
  const terms = phrasalTerms(it.pv);
  const n = family.items.length;

  return (
    <>
      <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
      <motion.section
        role="dialog"
        aria-label={it.pv}
        className="bg-card text-label pb-safe absolute inset-x-0 bottom-0 mx-auto max-h-[82dvh] w-full max-w-xl overflow-y-auto rounded-t-[28px] px-5 pt-3 pb-6 shadow-[0_-12px_40px_rgb(0_0_0/0.3)] sm:bottom-6 sm:rounded-[28px]"
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', stiffness: 380, damping: 36 }}
      >
        <div className="bg-separator mx-auto mb-3 h-1 w-10 rounded-full sm:hidden" />
        <div className="flex items-start gap-4">
          <span className="flex h-[72px] w-[72px] shrink-0 items-center justify-center rounded-[20px] text-[38px] shadow-inner" style={{ background: family.grad }}>
            {it.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-[28px] leading-tight font-extrabold">{it.pv}</h3>
              {it.level && <LevelChip level={it.level} />}
            </div>
            <button
              type="button"
              onClick={() => sayAll([it.pv, ...examples])}
              className="text-ios-blue mt-1 inline-flex items-center gap-1.5 text-[14px] font-semibold"
            >
              <Volume2 size={15} /> Escuchar todo
            </button>
          </div>
          <button type="button" onClick={onClose} className="bg-fill-2 hover:bg-fill flex h-9 w-9 shrink-0 items-center justify-center rounded-full" aria-label="Cerrar">
            <X size={18} />
          </button>
        </div>

        <div className="mt-4 rounded-[16px] p-4" style={{ background: `color-mix(in srgb, ${family.color} 12%, var(--card))` }}>
          <div className="text-[11px] font-bold tracking-wide uppercase" style={{ color: family.color }}>
            Significado
          </div>
          <p className="mt-0.5 text-[17px] font-semibold">{it.def}</p>
          {it.es && showEs && <p className="text-label-2 mt-1 text-[14px]">🇪🇸 {it.es}</p>}
        </div>

        <div className="text-label-2 mt-4 mb-2 text-[11px] font-bold tracking-wide uppercase">Ejemplos</div>
        <ul className="space-y-2">
          {examples.map((e, k) => (
            <motion.li
              key={k}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 + k * 0.06 }}
              className="bg-fill-2 flex items-start gap-3 rounded-[14px] py-2.5 pr-2 pl-3"
              style={{ borderLeft: `4px solid ${family.color}` }}
            >
              <span className="flex-1 text-[16px] leading-snug">
                <Highlight text={e} terms={terms} color={family.color} />
              </span>
              <button type="button" onClick={() => speak(e, { rate: 0.92 })} className="text-ios-blue shrink-0 rounded-full p-1.5 hover:bg-fill" aria-label={`Escuchar: ${e}`}>
                <Volume2 size={16} />
              </button>
            </motion.li>
          ))}
        </ul>

        {it.ctx && it.ctx.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {it.ctx.map((c) => (
              <span key={c} className="bg-fill-2 text-label-2 rounded-full px-2.5 py-1 text-[12px] font-medium">
                #{c}
              </span>
            ))}
          </div>
        )}

        {n > 1 && (
          <div className="mt-5 flex items-center justify-between gap-3">
            <button type="button" onClick={() => onIndex((index - 1 + n) % n)} className="bg-fill-2 hover:bg-fill inline-flex h-10 items-center gap-1 rounded-full px-4 text-[14px] font-semibold">
              <ChevronLeft size={16} /> {family.items[(index - 1 + n) % n]!.pv}
            </button>
            <span className="text-label-3 text-[12px] tabular-nums">
              {index + 1}/{n}
            </span>
            <button type="button" onClick={() => onIndex((index + 1) % n)} className="bg-fill-2 hover:bg-fill inline-flex h-10 items-center gap-1 rounded-full px-4 text-[14px] font-semibold">
              {family.items[(index + 1) % n]!.pv} <ChevronRight size={16} />
            </button>
          </div>
        )}
      </motion.section>
    </>
  );
}

/** Builds mind-map families from the full phrasal-verb list, grouped by base verb. */
export function familiesFromList(list: { pv: string; emoji: string; def: string; ex: string; es?: string; level?: CefrLevel; ctx?: string[]; family: string; color: string }[]): MindFamily[] {
  const map = new Map<string, MindFamily>();
  for (const v of list) {
    let f = map.get(v.family);
    if (!f) {
      f = { verb: v.family, emoji: v.emoji, color: v.color, grad: `linear-gradient(135deg, ${v.color}, color-mix(in srgb, ${v.color} 55%, #5b2bd9))`, items: [] };
      map.set(v.family, f);
    }
    f.items.push({ pv: v.pv, emoji: v.emoji, def: v.def, ex: v.ex, es: v.es, level: v.level, ctx: v.ctx });
  }
  return [...map.values()].sort((a, b) => b.items.length - a.items.length || a.verb.localeCompare(b.verb));
}
