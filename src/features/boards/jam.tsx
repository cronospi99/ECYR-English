import { useEffect, useLayoutEffect, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeftRight, ArrowRight, ArrowRightLeft, Check, Minus, MoveDiagonal2, Plus, Scan, Tag, Trash2, Waypoints, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import {
  CANVAS_H,
  CANVAS_W,
  CARD_W,
  LINK_INK,
  MAX_H,
  MAX_LINK_LABEL,
  MAX_W,
  MIN_H,
  MIN_W,
  cardBox,
  ordered,
  tilt,
  type LinkColor,
  type LinkDraft,
  type LinkKind,
  type LinkPatch,
  type LiveCard,
  type LiveLink,
} from '@/lib/boards';
import { StickyCard } from './StickyCard';
import { edgePoint, type Box } from './shapes';
import type { ViewProps } from './layouts';

const SPRING = { type: 'spring' as const, stiffness: 260, damping: 24 };
const PICK_COLORS: LinkColor[] = ['ink', 'blue', 'red', 'green', 'orange', 'purple'];
const KIND_ICON: Record<LinkKind, { icon: ReactNode; label: string }> = {
  arrow: { icon: <ArrowRight size={18} strokeWidth={2.6} />, label: 'Flecha' },
  line: { icon: <Minus size={18} strokeWidth={2.6} />, label: 'Línea' },
  double: { icon: <ArrowLeftRight size={18} strokeWidth={2.4} />, label: 'Doble flecha' },
};

const f1 = (n: number) => n.toFixed(1);
const snap = (v: number) => Math.round(v / 10) * 10;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

export interface JamProps extends ViewProps {
  moveLocal: (id: string, x: number, y: number) => void;
  commitMove: (id: string, x: number, y: number) => void;
  resizeLocal: (id: string, w: number, h: number) => void;
  commitResize: (id: string, w: number, h: number) => void;
  dragging: MutableRefObject<string | null>;
  /** Filled with a function that returns a free-ish spot in the visible area (for new cards). */
  spotRef: MutableRefObject<((w?: number, h?: number) => { x: number; y: number }) | null>;
  /** Filled with a function that selects a card (shows its resize handle). */
  selectRef: MutableRefObject<((id: string) => void) | null>;
  canResize: (c: LiveCard) => boolean;
  canLink: boolean;
  canEditLink: (l: LiveLink) => boolean;
  onLink: (d: LinkDraft) => void;
  onPatchLink: (id: string, p: LinkPatch) => void;
  onUnlink: (id: string) => void;
  say: (m: string) => void;
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
  resizeLocal,
  commitResize,
  dragging,
  spotRef,
  selectRef,
  canResize,
  canLink,
  canEditLink,
  onLink,
  onPatchLink,
  onUnlink,
  say,
  big,
}: JamProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLDivElement>(null);
  const preview = useRef<SVGLineElement>(null);
  const [width, setWidth] = useState(1024);
  const [zoom, setZoom] = useState(1);
  const [top, setTop] = useState<string | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [resizeId, setResizeId] = useState<string | null>(null);
  const [sel, setSel] = useState<string | null>(null);
  const [selLink, setSelLink] = useState<string | null>(null);
  const [tool, setTool] = useState(false);
  const [from, setFrom] = useState<string | null>(null);
  const [kind, setKind] = useState<LinkKind>('arrow');
  const [color, setColor] = useState<LinkColor>('ink');
  const st = useRef<{ id: string; px: number; py: number; x: number; y: number; w: number; moved: boolean; can: boolean } | null>(null);
  const rs = useRef<{ id: string; px: number; py: number; w: number; h: number; x: number; y: number; square: boolean } | null>(null);

  useLayoutEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setWidth(el.clientWidth));
    ro.observe(el);
    setWidth(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Measured card sizes (notes grow with their text), for anchoring arrows.
  const [sizes, setSizes] = useState<Record<string, { w: number; h: number }>>({});
  const ro = useRef<ResizeObserver | null>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const refFns = useRef(new Map<string, (el: HTMLElement | null) => void>());
  useEffect(() => {
    const o = new ResizeObserver((entries) => {
      setSizes((prev) => {
        let next = prev;
        for (const e of entries) {
          const el = e.target as HTMLElement;
          const id = el.dataset.card;
          if (!id) continue;
          const w = el.offsetWidth;
          const h = el.offsetHeight;
          const p = prev[id];
          if (!p || Math.abs(p.w - w) > 0.5 || Math.abs(p.h - h) > 0.5) {
            if (next === prev) next = { ...prev };
            next[id] = { w, h };
          }
        }
        return next;
      });
    });
    ro.current = o;
    els.current.forEach((el) => o.observe(el));
    return () => o.disconnect();
  }, []);
  const cardRef = (id: string) => {
    let fn = refFns.current.get(id);
    if (!fn) {
      fn = (el: HTMLElement | null) => {
        const old = els.current.get(id);
        if (old && old !== el) ro.current?.unobserve(old);
        if (el) {
          els.current.set(id, el);
          ro.current?.observe(el);
        } else els.current.delete(id);
      };
      refFns.current.set(id, fn);
    }
    return fn;
  };

  const auto = width >= 900 ? Math.min(1, (width - 48) / CANVAS_W) : big ? 0.7 : 0.8;
  const scale = Math.max(0.35, Math.min(1.6, auto * zoom));
  const pad = width >= 900 ? 24 : 16;

  spotRef.current = (w = CARD_W, h = 160) => {
    const el = scroller.current;
    const cx = el ? (el.scrollLeft + el.clientWidth / 2 - pad) / scale : CANVAS_W / 2;
    const cy = el ? (el.scrollTop + el.clientHeight / 2 - pad) / scale : CANVAS_H / 2;
    const j = () => (Math.random() - 0.5) * 140;
    return {
      x: Math.round(clamp(cx - w / 2 + j(), 0, CANVAS_W - w)),
      y: Math.round(clamp(cy - h / 2 + j(), 0, CANVAS_H - Math.min(h, 160))),
    };
  };
  selectRef.current = (id: string) => {
    setTool(false);
    setSelLink(null);
    setSel(id);
    setTop(id);
  };

  const cards = ordered(bundle.cards);
  const byId = new Map(cards.map((c) => [c.id, c]));
  const geom = (c: LiveCard): Box => {
    const b = cardBox(c);
    return { x: c.x, y: c.y, w: b.w, h: b.h ?? sizes[c.id]?.h ?? 140 };
  };
  const clampX = (x: number, w: number) => Math.round(clamp(x, 0, CANVAS_W - Math.min(w, CANVAS_W)));
  const clampY = (y: number) => Math.round(clamp(y, 0, CANVAS_H - 80));

  // Leave the connect tool when it is no longer allowed (locked, presenting…).
  useEffect(() => {
    if (!canLink) {
      setTool(false);
      setFrom(null);
    }
  }, [canLink]);
  // The dashed preview follows the mouse only while a first card is picked.
  useEffect(() => {
    if (!from && preview.current) preview.current.style.display = 'none';
  }, [from, tool]);
  const selectedLink = bundle.links.find((l) => l.id === selLink) ?? null;
  useEffect(() => {
    if (selLink && (!selectedLink || !canEditLink(selectedLink))) setSelLink(null);
  }, [selLink, selectedLink, canEditLink]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (from) setFrom(null);
      else if (tool) setTool(false);
      setSelLink(null);
      setSel(null);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [from, tool]);

  // ------------------------------------------------------------ connect ----
  const tapConnect = (c: LiveCard) => {
    if (c.pending) return;
    if (!from) return setFrom(c.id);
    if (from === c.id) return setFrom(null);
    const exists = bundle.links.some((l) => (l.from === from && l.to === c.id) || (l.from === c.id && l.to === from));
    setFrom(null);
    if (exists) return say('Ya están conectadas');
    if (bundle.links.length >= 300) return say('Demasiadas flechas (300).');
    onLink({ from, to: c.id, kind, color });
  };

  const onCanvasMove = (e: React.PointerEvent) => {
    const line = preview.current;
    if (!line) return;
    const src = from ? byId.get(from) : null;
    if (!src || e.pointerType !== 'mouse' || !canvas.current) {
      line.style.display = 'none';
      return;
    }
    const r = canvas.current.getBoundingClientRect();
    const px = (e.clientX - r.left) / scale;
    const py = (e.clientY - r.top) / scale;
    const [ax, ay] = edgePoint(src.shape, geom(src), px, py);
    line.setAttribute('x1', f1(ax));
    line.setAttribute('y1', f1(ay));
    line.setAttribute('x2', f1(px));
    line.setAttribute('y2', f1(py));
    line.style.display = '';
  };

  // ---------------------------------------------------------- card drag ----
  const onDown = (e: React.PointerEvent, c: LiveCard) => {
    if (e.button !== 0) return;
    const can = !tool && canEdit(c) && !c.pending;
    st.current = { id: c.id, px: e.clientX, py: e.clientY, x: c.x, y: c.y, w: cardBox(c).w, moved: false, can };
    setTop(c.id);
    if (!tool) setSel(c.id);
    setSelLink(null);
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
    moveLocal(s.id, clampX(s.x + dx, s.w), clampY(s.y + dy));
  };
  const onUp = (e: React.PointerEvent, c: LiveCard) => {
    const s = st.current;
    st.current = null;
    if (!s) return;
    if (s.moved) {
      const x = clampX(s.x + (e.clientX - s.px) / scale, s.w);
      const y = clampY(s.y + (e.clientY - s.py) / scale);
      dragging.current = null;
      setDragId(null);
      commitMove(c.id, x, y);
    } else if (tool) tapConnect(c);
    else onOpen(c);
  };
  const onCancel = () => {
    if (st.current?.moved) {
      dragging.current = null;
      setDragId(null);
    }
    st.current = null;
  };

  // -------------------------------------------------------- card resize ----
  const onResizeDown = (e: React.PointerEvent, c: LiveCard) => {
    e.stopPropagation();
    e.preventDefault();
    if (e.button !== 0) return;
    const g = geom(c);
    rs.current = { id: c.id, px: e.clientX, py: e.clientY, w: g.w, h: g.h, x: c.x, y: c.y, square: c.shape === 'circle' || c.shape === 'diamond' };
    dragging.current = c.id;
    setResizeId(c.id);
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };
  const resizeTo = (s: NonNullable<typeof rs.current>, clientX: number, clientY: number) => {
    let w = snap(clamp(s.w + (clientX - s.px) / scale, MIN_W, Math.min(MAX_W, CANVAS_W - s.x)));
    let h = snap(clamp(s.h + (clientY - s.py) / scale, MIN_H, Math.min(MAX_H, CANVAS_H - s.y)));
    // Circles and diamonds click into a perfect shape when nearly square.
    if (s.square && Math.abs(w - h) <= 20) h = w = Math.min(Math.max(w, h), MAX_H, CANVAS_H - s.y);
    return { w, h };
  };
  const onResizeMove = (e: React.PointerEvent) => {
    const s = rs.current;
    if (!s) return;
    e.stopPropagation();
    const { w, h } = resizeTo(s, e.clientX, e.clientY);
    resizeLocal(s.id, w, h);
  };
  const onResizeUp = (e: React.PointerEvent) => {
    const s = rs.current;
    rs.current = null;
    if (!s) return;
    e.stopPropagation();
    const { w, h } = resizeTo(s, e.clientX, e.clientY);
    dragging.current = null;
    setResizeId(null);
    if (w !== Math.round(s.w) || h !== Math.round(s.h)) commitResize(s.id, w, h);
  };
  const onResizeKey = (e: React.KeyboardEvent, c: LiveCard) => {
    const step = { ArrowRight: [10, 0], ArrowLeft: [-10, 0], ArrowDown: [0, 10], ArrowUp: [0, -10] }[e.key];
    if (!step) return;
    e.preventDefault();
    e.stopPropagation();
    const g = geom(c);
    commitResize(c.id, snap(clamp(g.w + step[0]!, MIN_W, MAX_W)), snap(clamp(g.h + step[1]!, MIN_H, MAX_H)));
  };

  // -------------------------------------------------------------- links ----
  const linkGeo = (l: LiveLink) => {
    const A = byId.get(l.from);
    const B = byId.get(l.to);
    if (!A || !B) return null;
    const ga = geom(A);
    const gb = geom(B);
    const ca: [number, number] = [ga.x + ga.w / 2, ga.y + ga.h / 2];
    const cb: [number, number] = [gb.x + gb.w / 2, gb.y + gb.h / 2];
    let pa = edgePoint(A.shape, ga, cb[0], cb[1]);
    let pb = edgePoint(B.shape, gb, ca[0], ca[1]);
    let dx = pb[0] - pa[0];
    let dy = pb[1] - pa[1];
    let len = Math.hypot(dx, dy);
    // Overlapping cards: join the centres instead (still visible around them).
    if (len < 18 || (dx * (cb[0] - ca[0]) + dy * (cb[1] - ca[1])) < 0) {
      pa = ca;
      pb = cb;
      dx = pb[0] - pa[0];
      dy = pb[1] - pa[1];
      len = Math.hypot(dx, dy) || 1;
    }
    const ux = dx / len;
    const uy = dy / len;
    const GAP = 6;
    pa = [pa[0] + ux * GAP, pa[1] + uy * GAP];
    pb = [pb[0] - ux * GAP, pb[1] - uy * GAP];
    const HL = 17;
    const HW = 15;
    const head = (tip: [number, number], vx: number, vy: number) => {
      const bx = tip[0] - vx * HL;
      const by = tip[1] - vy * HL;
      return `M${f1(tip[0])} ${f1(tip[1])} L${f1(bx - vy * HW * 0.5)} ${f1(by + vx * HW * 0.5)} L${f1(bx + vy * HW * 0.5)} ${f1(by - vx * HW * 0.5)} Z`;
    };
    const endB = l.kind !== 'line';
    const endA = l.kind === 'double';
    const la = endA ? [pa[0] + ux * HL * 0.6, pa[1] + uy * HL * 0.6] : pa;
    const lb = endB ? [pb[0] - ux * HL * 0.6, pb[1] - uy * HL * 0.6] : pb;
    return {
      d: `M${f1(la[0]!)} ${f1(la[1]!)} L${f1(lb[0]!)} ${f1(lb[1]!)}`,
      headB: endB ? head(pb, ux, uy) : null,
      headA: endA ? head(pa, -ux, -uy) : null,
      mid: [(pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2] as [number, number],
    };
  };
  const geos = bundle.links.flatMap((l) => {
    const g = linkGeo(l);
    return g ? [{ l, g }] : [];
  });
  const moving = dragId ?? resizeId;
  const linkTransition = (l: LiveLink) => (moving && (l.from === moving || l.to === moving) ? { duration: 0 } : SPRING);
  const pickLink = (l: LiveLink) => {
    if (tool) return;
    if (!canEditLink(l)) return say('Solo quien la dibujó puede cambiarla');
    setSel(null);
    setSelLink(l.id);
  };

  return (
    <div className="relative h-full">
      <div ref={scroller} className="h-full overflow-auto overscroll-contain" style={{ padding: pad }}>
        <div className="relative mx-auto" style={{ width: CANVAS_W * scale, height: CANVAS_H * scale }}>
          <div
            ref={canvas}
            className={cn('bg-card/70 absolute top-0 left-0 origin-top-left rounded-[28px] shadow-[inset_0_0_0_1px_var(--separator)]', tool && 'cursor-crosshair')}
            style={{
              width: CANVAS_W,
              height: CANVAS_H,
              transform: `scale(${scale})`,
              backgroundImage: 'radial-gradient(color-mix(in srgb, var(--label) 16%, transparent) 1.4px, transparent 1.6px)',
              backgroundSize: '28px 28px',
            }}
            onPointerDown={(e) => {
              if (e.target !== e.currentTarget) return;
              setSel(null);
              setSelLink(null);
              if (from) setFrom(null);
            }}
            onPointerMove={tool ? onCanvasMove : undefined}
          >
            {/* Arrows: under the cards, anchored on their edges. */}
            <svg width={CANVAS_W} height={CANVAS_H} className="pointer-events-none absolute top-0 left-0 overflow-visible" style={{ zIndex: 0 }} aria-hidden>
              {geos.map(({ l, g }) => {
                const ink = LINK_INK[l.color];
                const on = selLink === l.id;
                const tr = linkTransition(l);
                return (
                  <g key={l.id} opacity={l.pending ? 0.55 : 1}>
                    {on && <motion.path initial={false} animate={{ d: g.d }} transition={tr} stroke={ink} strokeOpacity={0.22} strokeWidth={16} strokeLinecap="round" fill="none" />}
                    <motion.path
                      initial={{ d: g.d, pathLength: 0 }}
                      animate={{ d: g.d, pathLength: 1 }}
                      transition={{ d: tr, pathLength: { duration: 0.45, ease: 'easeOut' } }}
                      stroke={ink}
                      strokeWidth={on ? 5 : 4}
                      strokeLinecap="round"
                      fill="none"
                    />
                    {g.headB && (
                      <motion.path initial={{ d: g.headB, opacity: 0 }} animate={{ d: g.headB, opacity: 1 }} transition={{ d: tr, opacity: { delay: 0.3 } }} fill={ink} stroke={ink} strokeWidth={3} strokeLinejoin="round" />
                    )}
                    {g.headA && (
                      <motion.path initial={{ d: g.headA, opacity: 0 }} animate={{ d: g.headA, opacity: 1 }} transition={{ d: tr, opacity: { delay: 0.3 } }} fill={ink} stroke={ink} strokeWidth={3} strokeLinejoin="round" />
                    )}
                    <path
                      d={g.d}
                      data-link={l.id}
                      stroke="transparent"
                      strokeWidth={26}
                      fill="none"
                      style={{ pointerEvents: tool ? 'none' : 'stroke', cursor: 'pointer' }}
                      onPointerDown={(e) => e.stopPropagation()}
                      onClick={() => pickLink(l)}
                    />
                  </g>
                );
              })}
              <line ref={preview} stroke="var(--blue)" strokeWidth={4} strokeDasharray="10 9" strokeLinecap="round" style={{ display: 'none' }} />
            </svg>

            {geos
              .filter(({ l }) => l.label)
              .map(({ l, g }) => (
                <motion.button
                  key={`label-${l.id}`}
                  type="button"
                  initial={false}
                  animate={{ left: g.mid[0], top: g.mid[1] }}
                  transition={linkTransition(l)}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => pickLink(l)}
                  className="bg-card text-label absolute max-w-[180px] -translate-x-1/2 -translate-y-1/2 truncate rounded-full px-2.5 py-0.5 text-[13px] font-bold shadow-[0_2px_6px_-2px_rgb(0_0_0/0.3)]"
                  style={{ zIndex: 0, boxShadow: `inset 0 0 0 2px ${LINK_INK[l.color]}` }}
                >
                  {l.label}
                </motion.button>
              ))}

            <AnimatePresence>
              {cards.map((c, i) => {
                const isDrag = dragId === c.id;
                const isResize = resizeId === c.id;
                const movable = !tool && canEdit(c) && !c.pending;
                const resizable = !tool && canResize(c) && !c.pending;
                const box = cardBox(c);
                const showHandle = resizable && (sel === c.id || isResize);
                const S = 34 / scale;
                return (
                  <motion.div
                    key={c.id}
                    ref={cardRef(c.id)}
                    data-card={c.id}
                    initial={{ opacity: 0, scale: 0.4, left: c.x, top: c.y }}
                    animate={{ opacity: 1, scale: isDrag ? 1.07 : 1, rotate: isDrag || c.shape !== 'note' ? 0 : tilt(c.id), left: c.x, top: c.y }}
                    exit={{ opacity: 0, scale: 0.4, transition: { duration: 0.2 } }}
                    transition={isDrag ? { left: { duration: 0 }, top: { duration: 0 }, default: { type: 'spring', stiffness: 400, damping: 26 } } : SPRING}
                    whileHover={movable && !isDrag && !isResize ? { scale: 1.03 } : undefined}
                    className={cn('group absolute outline-none', tool ? 'cursor-pointer' : movable ? 'cursor-grab touch-none active:cursor-grabbing' : 'cursor-pointer')}
                    style={{ width: box.w, height: box.h ?? undefined, zIndex: isDrag || isResize ? 1000 : top === c.id ? 999 : i + 1 }}
                    onPointerDown={(e) => onDown(e, c)}
                    onPointerMove={onMove}
                    onPointerUp={(e) => onUp(e, c)}
                    onPointerCancel={onCancel}
                    onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (tool ? tapConnect(c) : onOpen(c))}
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
                      fill={box.h !== null}
                      className={cn(isDrag && c.shape === 'note' && 'shadow-[0_2px_4px_rgb(0_0_0/0.1),0_30px_50px_-18px_rgb(0_0_0/0.5)]')}
                    />
                    {(showHandle || from === c.id) && (
                      <motion.span
                        aria-hidden
                        className="pointer-events-none absolute -inset-2 rounded-[16px] border-[3px]"
                        style={{ borderColor: 'var(--blue)', borderStyle: from === c.id ? 'solid' : 'dashed' }}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: from === c.id ? [1, 0.35, 1] : 0.7 }}
                        transition={from === c.id ? { duration: 1.1, repeat: Infinity } : { duration: 0.15 }}
                      />
                    )}
                    {resizable && (
                      <button
                        type="button"
                        aria-label="Cambiar tamaño"
                        title="Arrastra para cambiar el tamaño"
                        tabIndex={showHandle ? 0 : -1}
                        className={cn(
                          'absolute z-[3] flex cursor-nwse-resize touch-none items-center justify-center rounded-full bg-white text-[#1f1f24] shadow-[0_2px_8px_-1px_rgb(0_0_0/0.35)] transition-opacity duration-150',
                          showHandle ? 'opacity-100' : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100',
                        )}
                        style={{ width: S, height: S, right: -S * 0.42, bottom: -S * 0.42, boxShadow: `0 0 0 ${2 / scale}px var(--blue), 0 ${2 / scale}px ${8 / scale}px -1px rgb(0 0 0 / 0.35)` }}
                        onPointerDown={(e) => onResizeDown(e, c)}
                        onPointerMove={onResizeMove}
                        onPointerUp={onResizeUp}
                        onPointerCancel={onResizeUp}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => onResizeKey(e, c)}
                      >
                        <MoveDiagonal2 size={17 / scale} strokeWidth={2.6} />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* Top: the connect tool's hints, or the selected arrow's options. */}
      <div className="pointer-events-none absolute inset-x-0 top-3 z-20 flex justify-center px-3">
        <AnimatePresence mode="wait">
          {tool && (
            <motion.div
              key="connect"
              initial={{ opacity: 0, y: -12, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -12, scale: 0.96 }}
              className="material-strong shadow-float pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1.5 rounded-[22px] px-3 py-2"
            >
              <span className="flex items-center gap-2 px-1 text-[15px] font-bold">
                <motion.span key={from ? 'b' : 'a'} initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--blue)] text-[14px] text-white">
                  {from ? '2' : '1'}
                </motion.span>
                {from ? 'Ahora toca otra' : 'Toca una tarjeta'}
              </span>
              <KindPicker value={kind} onChange={setKind} />
              <ColorDots value={color} onChange={setColor} />
              <button type="button" onClick={() => setTool(false)} className="bg-label text-bg flex h-9 items-center gap-1 rounded-full px-3.5 text-[14px] font-bold">
                <Check size={16} strokeWidth={3} /> Listo
              </button>
            </motion.div>
          )}
          {!tool && selectedLink && (
            <LinkBar
              key={`link-${selectedLink.id}`}
              link={selectedLink}
              onPatch={(p) => onPatchLink(selectedLink.id, p)}
              onDelete={() => {
                onUnlink(selectedLink.id);
                setSelLink(null);
              }}
              onClose={() => setSelLink(null)}
            />
          )}
        </AnimatePresence>
      </div>

      <div className="absolute bottom-[max(env(safe-area-inset-bottom),16px)] left-4 z-10 flex items-center gap-2">
        <div className="material-strong shadow-float flex items-center gap-0.5 rounded-full p-1">
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
        {canLink && (
          <motion.button
            type="button"
            aria-pressed={tool}
            onClick={() => {
              setTool((t) => !t);
              setFrom(null);
              setSel(null);
              setSelLink(null);
            }}
            whileTap={{ scale: 0.93 }}
            className={cn('shadow-float flex h-12 items-center gap-2 rounded-full pr-4 pl-3 text-[15px] font-bold transition-colors', tool ? 'bg-[var(--blue)] text-white' : 'material-strong text-label')}
          >
            <Waypoints size={20} strokeWidth={2.4} />
            Conectar
          </motion.button>
        )}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ link tools ----
function KindPicker({ value, onChange }: { value: LinkKind; onChange: (k: LinkKind) => void }) {
  return (
    <div role="radiogroup" aria-label="Tipo de conexión" className="bg-fill-2 flex rounded-full p-0.5">
      {(Object.keys(KIND_ICON) as LinkKind[]).map((k) => (
        <button
          key={k}
          type="button"
          role="radio"
          aria-checked={value === k}
          aria-label={KIND_ICON[k].label}
          title={KIND_ICON[k].label}
          onClick={() => onChange(k)}
          className={cn('flex h-8 w-9 items-center justify-center rounded-full transition-colors', value === k ? 'bg-card text-label shadow-[0_1px_3px_rgb(0_0_0/0.18)]' : 'text-label-2')}
        >
          {KIND_ICON[k].icon}
        </button>
      ))}
    </div>
  );
}

function ColorDots({ value, onChange }: { value: LinkColor; onChange: (c: LinkColor) => void }) {
  return (
    <div role="radiogroup" aria-label="Color de la flecha" className="flex items-center gap-1">
      {PICK_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={c === 'ink' ? 'Negro' : c}
          onClick={() => onChange(c)}
          className={cn('h-7 w-7 rounded-full transition-transform active:scale-90', value === c && 'scale-110 ring-[2.5px] ring-[var(--label)] ring-offset-2 ring-offset-[var(--bg)]')}
          style={{ background: LINK_INK[c] }}
        />
      ))}
    </div>
  );
}

function LinkBar({ link, onPatch, onDelete, onClose }: { link: LiveLink; onPatch: (p: LinkPatch) => void; onDelete: () => void; onClose: () => void }) {
  const [label, setLabel] = useState(link.label ?? '');
  useEffect(() => setLabel(link.label ?? ''), [link.label]);
  const ends = (
    <>
      <button type="button" aria-label="Borrar flecha" onClick={onDelete} disabled={link.pending} className="text-ink-red flex h-9 w-9 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--red)_13%,transparent)] disabled:opacity-35">
        <Trash2 size={17} />
      </button>
      <button type="button" aria-label="Cerrar" onClick={onClose} className="text-label-2 hover:bg-fill-2 flex h-9 w-9 items-center justify-center rounded-full">
        <X size={18} />
      </button>
    </>
  );
  const commit = () => {
    const v = label.trim().slice(0, MAX_LINK_LABEL);
    if (v !== (link.label ?? '')) onPatch({ label: v || null });
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -12, scale: 0.96 }}
      className="material-strong shadow-float pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-x-2 gap-y-1.5 rounded-[22px] px-2.5 py-2"
      role="toolbar"
      aria-label="Flecha"
    >
      <div className="flex items-center gap-2">
        <KindPicker value={link.kind} onChange={(kind) => onPatch({ kind })} />
        <button type="button" aria-label="Invertir dirección" title="Invertir" disabled={link.kind === 'line' || link.pending} onClick={() => onPatch({ flip: true })} className="bg-fill-2 text-label flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-35">
          <ArrowRightLeft size={17} />
        </button>
        <span className="flex items-center gap-2 sm:hidden">{ends}</span>
      </div>
      <ColorDots value={link.color} onChange={(color) => onPatch({ color })} />
      <label className="bg-fill-2 flex h-9 items-center gap-1.5 rounded-full pr-1 pl-2.5">
        <Tag size={15} className="text-label-2 shrink-0" />
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value.slice(0, MAX_LINK_LABEL))}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
          }}
          placeholder="Etiqueta"
          aria-label="Etiqueta"
          disabled={link.pending}
          className="placeholder:text-label-3 w-[92px] bg-transparent text-[14px] font-semibold outline-none sm:w-[120px]"
        />
      </label>
      <span className="hidden items-center gap-2 sm:flex">{ends}</span>
    </motion.div>
  );
}
