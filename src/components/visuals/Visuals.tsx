import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ChevronLeft, ChevronRight, Download, ImageIcon, Images, Maximize2, Minus, Plus, X } from 'lucide-react';
import { LevelChip } from '@/components/ui/Misc';
import { visualUrl, type Visual } from '@/content/visuals';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';

const KIND_LABEL: Record<Visual['kind'], string> = { grammar: 'Gramática', vocabulary: 'Vocabulario', functions: 'Funciones' };

/** Thumbnail card that opens the full-screen viewer. */
export function VisualCard({ v, onOpen, focus, size = 'md' }: { v: Visual; onOpen: () => void; focus?: string; size?: 'sm' | 'md' | 'lg' }) {
  const portrait = v.h > v.w;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group bg-card shadow-card relative block overflow-hidden rounded-[20px] text-left transition-transform active:scale-[0.99]',
        size === 'sm' ? 'w-[180px] shrink-0' : size === 'lg' ? 'w-full' : 'w-[260px] shrink-0 sm:w-[300px]',
      )}
      aria-label={`Ver infografía: ${v.title}`}
    >
      <div className={cn('bg-fill-2 relative overflow-hidden', portrait ? 'aspect-[4/5]' : 'aspect-[3/2]')}>
        <img
          src={visualUrl(v, true)}
          alt=""
          loading="lazy"
          decoding="async"
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <span className="material absolute top-2.5 right-2.5 flex h-8 w-8 items-center justify-center rounded-full opacity-90">
          <Maximize2 size={15} />
        </span>
        <span className="material absolute bottom-2.5 left-2.5 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold">
          <ImageIcon size={12} /> {KIND_LABEL[v.kind]}
        </span>
      </div>
      <div className="p-3">
        <div className="line-clamp-1 text-[15px] font-semibold">{v.title}</div>
        <div className="text-label-2 line-clamp-2 text-[12px] leading-snug">{focus ? `Para: ${focus}` : v.titleEs}</div>
        {size !== 'sm' && (
          <div className="mt-2 flex flex-wrap gap-1">
            {v.levels.map((l) => (
              <LevelChip key={l} level={l} className="h-5 px-2 text-[10px]" />
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

/**
 * A titled set of visuals: a horizontal strip on phones, a grid on wide screens.
 * `featured` shows the first one large (used where it carries the explanation).
 */
export function VisualSet({
  title = 'Apoyo visual',
  subtitle,
  items,
  featured = false,
}: {
  title?: string;
  subtitle?: string;
  items: (Visual & { focus?: string })[];
  featured?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  if (!items.length) return null;
  return (
    <section className="mt-6" aria-label={title}>
      <div className="mb-3 flex items-baseline justify-between gap-3 px-1">
        <h3 className="text-title-3 flex items-center gap-2">
          <ImageIcon size={20} className="text-ink-pink" /> {title}
        </h3>
        {subtitle && <span className="text-label-2 text-[13px]">{subtitle}</span>}
      </div>
      {featured && items.length === 1 ? (
        <div className="max-w-xl">
          <VisualCard v={items[0]!} focus={items[0]!.focus} onOpen={() => setOpen(0)} size="lg" />
        </div>
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
          {items.map((v, i) => (
            <div key={v.id} className="snap-start">
              <VisualCard v={v} focus={v.focus} onOpen={() => setOpen(i)} />
            </div>
          ))}
        </div>
      )}
      <Lightbox items={items} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </section>
  );
}

/** Thumbs are 560 px on their longest side; offer them to small screens. */
function srcSet(v: Visual) {
  const tw = v.w >= v.h ? 560 : Math.round((560 * v.w) / v.h);
  return v.w > tw + 40 ? `${visualUrl(v, true)} ${tw}w, ${visualUrl(v)} ${v.w}w` : undefined;
}

/**
 * An infographic shown large inside a lesson, with its caption in Spanish.
 * Several items page one at a time (arrows, dots or swipe); tapping opens the
 * zoomable viewer, which also offers the whole infographics that cut panels come from.
 */
export function VisualFigure({
  items,
  title = 'En imágenes',
  color = 'var(--pink)',
  className,
}: {
  items: (Visual & { parent?: Visual })[];
  title?: string;
  color?: string;
  className?: string;
}) {
  const [i, setI] = useState(0);
  const [open, setOpen] = useState<number | null>(null);
  const swipe = useRef<{ x: number; moved: boolean } | null>(null);
  const reduce = useReducedMotion();
  const viewer = useMemo(() => {
    const out: Visual[] = [...items];
    for (const v of items) if (v.parent && !out.some((x) => x.id === v.parent!.id)) out.push(v.parent);
    return out;
  }, [items]);
  if (!items.length) return null;
  const k = Math.min(i, items.length - 1);
  const v = items[k]!;
  const n = items.length;
  const go = (d: number) => setI((k + d + n) % n);

  return (
    <figure className={cn('bg-card overflow-hidden rounded-[20px] shadow-[inset_0_0_0_1px_var(--separator)]', className)} aria-roledescription={n > 1 ? 'carrusel' : undefined}>
      <div className="flex items-center gap-2 px-3.5 pt-3 pb-2.5">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ background: tint(color, 16), color: ink(color) }} aria-hidden>
          <Images size={15} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[13px] font-bold tracking-[0.06em] uppercase" style={{ color: ink(color) }}>
          {title}
        </span>
        {n > 1 && (
          <span className="flex shrink-0 items-center gap-1">
            <span className="text-label-2 mr-1 text-[13px] tabular-nums">
              {k + 1} / {n}
            </span>
            <FigBtn label="Imagen anterior" onClick={() => go(-1)}>
              <ChevronLeft size={17} />
            </FigBtn>
            <FigBtn label="Imagen siguiente" onClick={() => go(1)}>
              <ChevronRight size={17} />
            </FigBtn>
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          if (swipe.current?.moved) return;
          setOpen(viewer.findIndex((x) => x.id === v.id));
        }}
        onPointerDown={(e) => (swipe.current = { x: e.clientX, moved: false })}
        onPointerUp={(e) => {
          const s = swipe.current;
          if (s && n > 1 && Math.abs(e.clientX - s.x) > 40) {
            s.moved = true;
            go(e.clientX < s.x ? 1 : -1);
          }
        }}
        className="group bg-fill-2 relative block w-full touch-pan-y overflow-hidden"
        style={{ aspectRatio: `${v.w} / ${v.h}`, maxHeight: 'min(68vh, 520px)', minHeight: 180 }}
        aria-label={`Ampliar imagen: ${v.title}`}
      >
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.img
            key={v.id}
            src={visualUrl(v)}
            srcSet={srcSet(v)}
            sizes="(max-width: 640px) 92vw, 720px"
            alt={`${v.title}. ${v.titleEs}`}
            loading="lazy"
            decoding="async"
            draggable={false}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={reduce ? undefined : { opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 h-full w-full object-contain p-1.5 transition-transform duration-500 group-hover:scale-[1.015]"
          />
        </AnimatePresence>
        <span className="material absolute right-2.5 bottom-2.5 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[12px] font-semibold">
          <Maximize2 size={13} aria-hidden /> Toca para ampliar
        </span>
      </button>
      <figcaption className="flex items-start gap-3 px-3.5 pt-2.5 pb-3">
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] leading-snug font-semibold">{v.titleEs}</span>
          <span className="text-label-2 block text-[13px] leading-snug">
            {v.title}
            {v.parent && v.parent.title !== v.title && ` · de “${v.parent.title}”`}
          </span>
        </span>
        {n > 1 && (
          <span className="mt-1.5 flex shrink-0 gap-1.5" role="group" aria-label="Elegir imagen">
            {items.map((x, j) => (
              <button
                key={x.id}
                type="button"
                onClick={() => setI(j)}
                aria-label={`Imagen ${j + 1}: ${x.title}`}
                aria-current={j === k}
                className="h-2 rounded-full transition-[width,background-color] duration-200"
                style={{ width: j === k ? 18 : 8, background: j === k ? color : 'var(--fill)' }}
              />
            ))}
          </span>
        )}
      </figcaption>
      <Lightbox items={viewer} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </figure>
  );
}

function FigBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} className="bg-fill-2 hover:bg-fill inline-flex h-8 w-8 items-center justify-center rounded-full transition-colors">
      {children}
    </button>
  );
}

/** Full-screen viewer: zoom (buttons, wheel, double-click, pinch), pan by dragging, arrows between items. */
export function Lightbox({ items, index, onClose, onIndex }: { items: Visual[]; index: number | null; onClose: () => void; onIndex: (i: number) => void }) {
  const v = index != null ? items[index] : undefined;
  const [scale, setScale] = useState(1);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; s: number } | null>(null);
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  const reset = useCallback(() => {
    setScale(1);
    setPos({ x: 0, y: 0 });
  }, []);
  const zoom = useCallback((f: number) => setScale((s) => Math.min(5, Math.max(1, +(s * f).toFixed(3)))), []);
  const go = useCallback(
    (d: number) => {
      if (index == null) return;
      onIndex((index + d + items.length) % items.length);
      reset();
    },
    [index, items.length, onIndex, reset],
  );

  useEffect(() => {
    if (index == null) return;
    const prev = document.activeElement as HTMLElement | null;
    closeBtn.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight' && items.length > 1) go(1);
      else if (e.key === 'ArrowLeft' && items.length > 1) go(-1);
      else if (e.key === '+' || e.key === '=') zoom(1.4);
      else if (e.key === '-') zoom(1 / 1.4);
    };
    window.addEventListener('keydown', onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, [index, items.length, go, onClose, zoom]);

  useEffect(() => {
    if (scale === 1) setPos({ x: 0, y: 0 });
  }, [scale]);

  const onPointerDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { d: Math.hypot(a!.x - b!.x, a!.y - b!.y), s: scale };
      drag.current = null;
    } else drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current && pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
      setScale(Math.min(5, Math.max(1, pinch.current.s * (d / pinch.current.d))));
    } else if (drag.current && scale > 1) {
      setPos({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) });
    }
  };
  const onPointerUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
    if (!pointers.current.size) drag.current = null;
  };

  return createPortal(
    <AnimatePresence>
      {v && (
        <motion.div
          key="lb"
          role="dialog"
          aria-modal="true"
          aria-label={v.title}
          className="fixed inset-0 z-[100] flex flex-col bg-black/92 text-white"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="pt-safe flex items-center gap-2 px-3 py-2 sm:px-5">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[16px] font-semibold">{v.title}</div>
              <div className="truncate text-[12px] text-white/65">{v.titleEs}</div>
            </div>
            <IconBtn label="Alejar" onClick={() => zoom(1 / 1.4)} disabled={scale <= 1}>
              <Minus size={18} />
            </IconBtn>
            <button type="button" onClick={reset} className="w-12 text-center text-[13px] tabular-nums text-white/80" aria-label="Restablecer zoom">
              {Math.round(scale * 100)}%
            </button>
            <IconBtn label="Acercar" onClick={() => zoom(1.4)} disabled={scale >= 5}>
              <Plus size={18} />
            </IconBtn>
            <a
              href={visualUrl(v)}
              download={`${v.id}.webp`}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 hover:bg-white/20"
              aria-label="Descargar"
            >
              <Download size={18} />
            </a>
            <button
              ref={closeBtn}
              type="button"
              onClick={onClose}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 hover:bg-white/20"
              aria-label="Cerrar"
            >
              <X size={20} />
            </button>
          </div>
          <div
            className={cn('relative flex-1 touch-none overflow-hidden select-none', scale > 1 ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in')}
            onWheel={(e) => zoom(e.deltaY < 0 ? 1.15 : 1 / 1.15)}
            onDoubleClick={() => (scale > 1 ? reset() : setScale(2.2))}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            <img
              src={visualUrl(v)}
              alt={`${v.title}. ${v.titleEs}`}
              draggable={false}
              className="absolute inset-0 m-auto max-h-full max-w-full object-contain p-2 sm:p-4"
              style={{ transform: `translate(${pos.x}px, ${pos.y}px) scale(${scale})`, transition: pinch.current || drag.current ? 'none' : 'transform .2s ease-out' }}
            />
            {items.length > 1 && (
              <>
                <NavBtn side="left" onClick={() => go(-1)} />
                <NavBtn side="right" onClick={() => go(1)} />
              </>
            )}
          </div>
          <div className="pb-safe px-4 py-2 text-center text-[12px] text-white/55">
            Doble toque o pellizca para acercar · arrastra para moverte
            {items.length > 1 && ` · ${index! + 1} de ${items.length}`}
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className="flex h-10 w-10 items-center justify-center rounded-full bg-white/12 hover:bg-white/20 disabled:opacity-35"
    >
      {children}
    </button>
  );
}

function NavBtn({ side, onClick }: { side: 'left' | 'right'; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onPointerDown={(e) => e.stopPropagation()}
      onDoubleClick={(e) => e.stopPropagation()}
      aria-label={side === 'left' ? 'Anterior' : 'Siguiente'}
      className={cn(
        'absolute top-1/2 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/14 hover:bg-white/25',
        side === 'left' ? 'left-3' : 'right-3',
      )}
    >
      {side === 'left' ? <ChevronLeft size={22} /> : <ChevronRight size={22} />}
    </button>
  );
}
