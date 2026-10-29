import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowDown, ArrowUp, Minus, Plus, Scan } from 'lucide-react';
import { cn } from '@/lib/cn';
import { CANVAS_H, CANVAS_W, CARD_W, COLOR_STYLE, between, ordered, tilt, type BoardBundle, type LiveCard } from '@/lib/boards';
import { StickyCard } from './StickyCard';

export interface ViewProps {
  bundle: BoardBundle;
  images: Record<string, { rev: string; url: string }>;
  /** Show authors' names. */
  names: boolean;
  isTeacher: boolean;
  canAdd: boolean;
  canEdit: (c: LiveCard) => boolean;
  onOpen: (c: LiveCard) => void;
  onLike: (c: LiveCard) => void;
  onAdd: (opts?: { col?: number }) => void;
  big?: boolean;
}

/** Keyboard + click activation for a card wrapper (it holds a like button, so it cannot be a <button>). */
function activate(fn: () => void) {
  return {
    role: 'button' as const,
    tabIndex: 0,
    onClick: fn,
    onKeyDown: (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        fn();
      }
    },
  };
}

// ==================================================================== JAM ====
export function JamCanvas({
  bundle,
  images,
  names,
  canEdit,
  onOpen,
  onLike,
  moveLocal,
  commitMove,
  dragging,
  spotRef,
  big,
}: ViewProps & {
  moveLocal: (id: string, x: number, y: number) => void;
  commitMove: (id: string, x: number, y: number) => void;
  dragging: MutableRefObject<string | null>;
  /** Filled with a function that returns a free-ish spot in the visible area (for new cards). */
  spotRef: MutableRefObject<(() => { x: number; y: number }) | null>;
}) {
  const scroller = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(1024);
  const [zoom, setZoom] = useState(1);
  const [top, setTop] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const st = useRef<{ id: string; px: number; py: number; x: number; y: number; moved: boolean; can: boolean } | null>(null);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const auto = width >= 900 ? Math.min(1, (width - 48) / CANVAS_W) : big ? 0.7 : 0.8;
  const scale = Math.max(0.35, Math.min(1.6, auto * zoom));
  const pad = width >= 900 ? 24 : 16;

  spotRef.current = () => {
    const el = scroller.current;
    const cx = el ? (el.scrollLeft + el.clientWidth / 2 - pad) / scale : CANVAS_W / 2;
    const cy = el ? (el.scrollTop + el.clientHeight / 2 - pad) / scale : CANVAS_H / 2;
    const j = () => (Math.random() - 0.5) * 140;
    return {
      x: Math.round(Math.min(CANVAS_W - CARD_W, Math.max(0, cx - CARD_W / 2 + j()))),
      y: Math.round(Math.min(CANVAS_H - 160, Math.max(0, cy - 80 + j()))),
    };
  };

  const cards = ordered(bundle.cards);
  const clampX = (x: number) => Math.round(Math.min(CANVAS_W - CARD_W, Math.max(0, x)));
  const clampY = (y: number) => Math.round(Math.min(CANVAS_H - 80, Math.max(0, y)));

  const onDown = (e: React.PointerEvent, c: LiveCard) => {
    if (e.button !== 0) return;
    const can = canEdit(c) && !c.pending;
    st.current = { id: c.id, px: e.clientX, py: e.clientY, x: c.x, y: c.y, moved: false, can };
    setTop(c.id);
    if (can) (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onMove = (e: React.PointerEvent) => {
    const s = st.current;
    if (!s || !s.can) return;
    const dx = (e.clientX - s.px) / scale;
    const dy = (e.clientY - s.py) / scale;
    if (!s.moved && Math.hypot(dx, dy) * scale < 5) return;
    if (!s.moved) {
      s.moved = true;
      dragging.current = s.id;
      setDragId(s.id);
    }
    moveLocal(s.id, clampX(s.x + dx), clampY(s.y + dy));
  };
  const onUp = (e: React.PointerEvent, c: LiveCard) => {
    const s = st.current;
    st.current = null;
    if (!s) return;
    if (s.moved) {
      const x = clampX(s.x + (e.clientX - s.px) / scale);
      const y = clampY(s.y + (e.clientY - s.py) / scale);
      dragging.current = null;
      setDragId(null);
      commitMove(c.id, x, y);
    } else onOpen(c);
  };
  const onCancel = () => {
    if (st.current?.moved) {
      dragging.current = null;
      setDragId(null);
    }
    st.current = null;
  };

  return (
    <div className="relative h-full">
      <div ref={scroller} className="h-full overflow-auto overscroll-contain" style={{ padding: pad }}>
        <div className="relative mx-auto" style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}>
          <div
            className="bg-card/70 absolute top-0 left-0 origin-top-left rounded-[28px] shadow-[inset_0_0_0_1px_var(--separator)]"
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${scale})`,
              backgroundImage: 'radial-gradient(color-mix(in srgb, var(--label) 16%, transparent) 1.4px, transparent 1.6px)',
              backgroundSize: '28px 28px',
            }}
          >
            <AnimatePresence>
              {cards.map((c, i) => {
                const isDrag = dragId === c.id;
                const movable = canEdit(c) && !c.pending;
                return (
                  <motion.div
                    key={c.id}
                    data-card={c.id}
                    initial={{ opacity: 0, scale: 0.4, left: c.x, top: c.y }}
                    animate={{ opacity: 1, scale: isDrag ? 1.07 : 1, rotate: isDrag ? 0 : tilt(c.id), left: c.x, top: c.y }}
                    exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.2 } }}
                    transition={isDrag ? { left: { duration: 0 }, top: { duration: 0 }, default: { type: 'spring', stiffness: 400, damping: 26 } } : { type: 'spring', stiffness: 260, damping: 24 }}
                    whileHover={movable && !isDrag ? { scale: 1.03 } : undefined}
                    className={cn('absolute outline-none', movable ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-pointer')}
                    style={{ width: CARD_W, zIndex: isDrag ? 1000 : top === c.id ? 999 : i + 1 }}
                    onPointerDown={(e) => onDown(e, c)}
                    onPointerMove={onMove}
                    onPointerUp={(e) => onUp(e, c)}
                    onPointerCancel={onCancel}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onOpen(c)}
                    tabIndex={0}
                    role="button"
                    aria-label={c.text || 'Dibujo'}
                  >
                    <StickyCard
                      card={c}
                      image={images[c.id]?.url}
                      names={names}
                      onLike={() => onLike(c)}
                      tape
                      className={cn(isDrag && 'shadow-[0_2px_4px_rgb(0_0_0/0.1),0_30px_50px_-18px_rgb(0_0_0/0.5)]')}
                    />
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>
      <div className="material-strong shadow-float absolute bottom-[max(env(safe-area-inset-bottom),16px)] left-4 z-10 flex items-center gap-0.5 rounded-full p-1">
        <button type="button" aria-label="Alejar" onClick={() => setZoom((z) => Math.max(0.5, +(z - 0.15).toFixed(2)))} className="hover:bg-fill-2 flex h-10 w-10 items-center justify-center rounded-full">
          <Minus size={18} />
        </button>
        <button type="button" aria-label="Ajustar" onClick={() => setZoom(1)} className="hover:bg-fill-2 flex h-10 w-10 items-center justify-center rounded-full">
          <Scan size={17} />
        </button>
        <button type="button" aria-label="Acercar" onClick={() => setZoom((z) => Math.min(1.8, +(z + 0.15).toFixed(2)))} className="hover:bg-fill-2 flex h-10 w-10 items-center justify-center rounded-full">
          <Plus size={18} />
        </button>
      </div>
    </div>
  );
}

// ================================================================ COLUMNS ====
const COL_ACCENTS = ['var(--blue)', 'var(--orange)', 'var(--green)', 'var(--purple)', 'var(--pink)', 'var(--teal)', 'var(--yellow)', 'var(--indigo)'];

export function ColumnsView({ bundle, images, names, canAdd, onOpen, onLike, onAdd, big }: ViewProps) {
  const cols = bundle.board.columns.length ? bundle.board.columns : ['Ideas'];
  const cards = ordered(bundle.cards);
  return (
    <div className="flex h-full snap-x snap-mandatory gap-3 overflow-x-auto overscroll-x-contain px-4 py-4 sm:snap-none sm:gap-4 sm:px-6">
      {cols.map((name, i) => {
        const mine = cards.filter((c) => Math.min(c.col, cols.length - 1) === i);
        const accent = COL_ACCENTS[i % COL_ACCENTS.length]!;
        return (
          <section
            key={i}
            aria-label={name}
            className={cn(
              'bg-fill-2 flex h-full w-[84vw] max-w-[360px] shrink-0 snap-center flex-col rounded-[24px] sm:w-[300px]',
              cols.length <= 4 && 'lg:max-w-[460px] lg:min-w-[280px] lg:flex-1',
            )}
            style={{ boxShadow: `inset 0 3px 0 ${accent}` }}
          >
            <header className="flex items-center gap-2.5 px-4 pt-4 pb-2">
              <span className="h-3 w-3 shrink-0 rounded-full" style={{ background: accent }} />
              <h2 className={cn('min-w-0 flex-1 truncate font-bold', big ? 'text-[24px]' : 'text-[18px]')}>{name}</h2>
              <span className="bg-fill text-label-2 rounded-full px-2 py-0.5 text-[13px] font-semibold tabular-nums">{mine.length}</span>
              {canAdd && (
                <button
                  type="button"
                  aria-label={`Añadir en ${name}`}
                  onClick={() => onAdd({ col: i })}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-white transition-transform active:scale-90"
                  style={{ background: `color-mix(in srgb, ${accent} 78%, #000)` }}
                >
                  <Plus size={20} strokeWidth={2.6} />
                </button>
              )}
            </header>
            <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto overscroll-contain px-3 pt-1 pb-24">
              <AnimatePresence initial={false}>
                {mine.map((c) => (
                  <motion.div
                    key={c.id}
                    layout
                    initial={{ opacity: 0, y: 16, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1, rotate: tilt(c.id) / 4 }}
                    exit={{ opacity: 0, scale: 0.85 }}
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                    className="cursor-pointer rounded-[6px] outline-none"
                    {...activate(() => onOpen(c))}
                  >
                    <StickyCard card={c} image={images[c.id]?.url} names={names} onLike={() => onLike(c)} big={false} />
                  </motion.div>
                ))}
              </AnimatePresence>
              {canAdd && (
                <button
                  type="button"
                  onClick={() => onAdd({ col: i })}
                  className="text-label-2 hover:bg-fill flex h-14 shrink-0 items-center justify-center gap-1.5 rounded-[14px] border-2 border-dashed border-[var(--separator)] text-[15px] font-semibold transition-colors"
                >
                  <Plus size={18} /> Añadir
                </button>
              )}
            </div>
          </section>
        );
      })}
    </div>
  );
}

// ================================================================== STORY ====
export function StoryView({ bundle, images, names, isTeacher, canAdd, onOpen, onLike, onAdd, onReorder, big }: ViewProps & { onReorder: (c: LiveCard, position: number) => void }) {
  const cards = ordered(bundle.cards);
  const end = useRef<HTMLDivElement>(null);
  const count = useRef(cards.length);
  useEffect(() => {
    // Follow the story as it grows.
    if (cards.length > count.current) end.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    count.current = cards.length;
  }, [cards.length]);

  const move = (i: number, dir: -1 | 1) => {
    const c = cards[i]!;
    const pos = dir < 0 ? between(cards[i - 2]?.position, cards[i - 1]!.position) : between(cards[i + 1]!.position, cards[i + 2]?.position);
    onReorder(c, pos);
  };

  const Connector = () => (
    <div aria-hidden className="ml-[19px] h-7 w-0 border-l-[3px] border-dotted border-[color-mix(in_srgb,var(--purple)_45%,transparent)] sm:ml-[23px]" />
  );

  return (
    <div className="h-full overflow-y-auto overscroll-contain">
      <div className={cn('mx-auto px-4 pt-6 pb-32', big ? 'max-w-[900px]' : 'max-w-[660px]')}>
        {bundle.board.prompt && (
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--purple)_80%,#000)] text-[18px] text-white sm:h-12 sm:w-12 sm:text-[22px]">📖</span>
            <div className="bg-card shadow-card min-w-0 flex-1 rounded-[18px] px-5 py-4">
              <div className="text-ink-purple text-[12px] font-bold tracking-wide uppercase">Inicio</div>
              <p className={cn('font-rounded mt-1 font-semibold italic', big ? 'text-[30px] leading-[1.3]' : 'text-[19px] leading-[1.35]')}>{bundle.board.prompt}</p>
            </div>
          </div>
        )}
        <AnimatePresence initial={false}>
          {cards.map((c, i) => (
            <motion.div key={c.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, x: -30 }} transition={{ type: 'spring', stiffness: 360, damping: 32 }}>
              {(i > 0 || bundle.board.prompt) && <Connector />}
              <div className="flex items-start gap-3">
                <span
                  className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[16px] font-bold tabular-nums shadow-[0_2px_8px_-2px_rgb(0_0_0/0.25)] sm:h-12 sm:w-12 sm:text-[18px]"
                  style={{ background: COLOR_STYLE[c.color].edge, color: '#1f1f24' }}
                >
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 cursor-pointer rounded-[6px] outline-none" {...activate(() => onOpen(c))}>
                  <StickyCard
                    card={c}
                    image={images[c.id]?.url}
                    names={names}
                    onLike={() => onLike(c)}
                    badge={<span className="rounded-full bg-black/[0.07] px-2 py-0.5 text-[11px] font-bold tracking-wide text-black/55 uppercase">Parte {i + 1}</span>}
                    style={big ? { fontSize: 22 } : undefined}
                  />
                </div>
                {isTeacher && cards.length > 1 && (
                  <div className="flex shrink-0 flex-col gap-1">
                    <button type="button" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)} className="bg-fill hover:bg-fill-2 flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30">
                      <ArrowUp size={17} />
                    </button>
                    <button type="button" aria-label="Bajar" disabled={i === cards.length - 1} onClick={() => move(i, 1)} className="bg-fill hover:bg-fill-2 flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30">
                      <ArrowDown size={17} />
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {canAdd && (
          <>
            {(cards.length > 0 || bundle.board.prompt) && <Connector />}
            <button
              type="button"
              onClick={() => onAdd()}
              className="text-ink-purple flex h-16 w-full items-center justify-center gap-2 rounded-[18px] border-2 border-dashed border-[color-mix(in_srgb,var(--purple)_45%,transparent)] text-[17px] font-bold transition-colors hover:bg-[color-mix(in_srgb,var(--purple)_8%,transparent)]"
            >
              <Plus size={20} strokeWidth={2.6} /> {cards.length ? 'Continúa la historia' : 'Escribe la primera parte'}
            </button>
          </>
        )}
        <div ref={end} />
      </div>
    </div>
  );
}
