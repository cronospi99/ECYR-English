/**
 * Card shapes (migration 18): the paper behind a card, tiny icons for the
 * pickers, where an arrow meets a shape's edge, and text that shrinks to fit.
 */
import { useId, useLayoutEffect, type RefObject } from 'react';
import { COLOR_STYLE, type CardColor, type CardShape } from '@/lib/boards';

// ------------------------------------------------------------------ paths ----
/** A bumpy cloud inside a 100 × 100 box. */
const CLOUD = (() => {
  const n = 9;
  const [cx, cy, rx, ry] = [50, 53, 40, 33];
  const pt = (a: number, k = 1) => [cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k].map((v) => v.toFixed(1)).join(' ');
  let d = `M${pt(0)}`;
  for (let i = 0; i < n; i++) {
    const a0 = (i / n) * Math.PI * 2;
    const a1 = ((i + 1) / n) * Math.PI * 2;
    d += ` Q${pt((a0 + a1) / 2, 1.34)} ${pt(a1)}`;
  }
  return d + ' Z';
})();

/** Shapes drawn as SVG (stretched to the card). 'note', 'round' and 'circle' are plain CSS. */
const SVG_PATH: Partial<Record<CardShape, string>> = {
  bubble: 'M9 0 H91 Q100 0 100 9 V71 Q100 80 91 80 H42 L20 99 L25 80 H9 Q0 80 0 71 V9 Q0 0 9 0 Z',
  cloud: CLOUD,
  hexagon: 'M25 1 H75 L99 50 L75 99 H25 L1 50 Z',
  diamond: 'M50 1 L99 50 L50 99 L1 50 Z',
};

const paperGradient = (color: CardColor) => {
  const c = COLOR_STYLE[color];
  return `linear-gradient(180deg, ${c.paper} 0%, ${c.paper} 80%, color-mix(in srgb, ${c.edge} 45%, ${c.paper}) 100%)`;
};

/** The paper of a non-note card, filling its (relative) parent. */
export function ShapeBg({ shape, color }: { shape: CardShape; color: CardColor }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const c = COLOR_STYLE[color];
  if (shape === 'note' || shape === 'round' || shape === 'circle') {
    return (
      <div
        aria-hidden
        className="absolute inset-0 shadow-[0_1px_1px_rgb(0_0_0/0.08),0_10px_20px_-10px_rgb(0_0_0/0.35)]"
        style={{ background: paperGradient(color), borderRadius: shape === 'circle' ? '50%' : shape === 'round' ? 9999 : 6 }}
      />
    );
  }
  const d = SVG_PATH[shape]!;
  return (
    <svg
      aria-hidden
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      className="absolute inset-0 h-full w-full overflow-visible"
      style={{ filter: 'drop-shadow(0 1px 1px rgb(0 0 0 / 0.08)) drop-shadow(0 7px 8px rgb(0 0 0 / 0.16))' }}
    >
      <defs>
        <linearGradient id={`g${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={c.paper} />
          <stop offset={shape === 'bubble' ? 0.66 : 0.8} stopColor={c.paper} />
          <stop offset="1" style={{ stopColor: `color-mix(in srgb, ${c.edge} 45%, ${c.paper})` }} />
        </linearGradient>
      </defs>
      {/* The thick stroke in the same paper rounds the corners. */}
      <path d={d} fill={`url(#g${id})`} stroke={`url(#g${id})`} strokeWidth={shape === 'cloud' ? 2 : 9} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

/** A small outline of a shape for the pickers. */
export function ShapeIcon({ shape, fill = 'currentColor', stroke = 'none', size = 26 }: { shape: CardShape; fill?: string; stroke?: string; size?: number }) {
  const common = { fill, stroke, strokeWidth: 6, strokeLinejoin: 'round' as const };
  return (
    <svg viewBox="-6 -6 112 112" width={size} height={size} aria-hidden>
      {shape === 'note' && <rect x="8" y="8" width="84" height="84" rx="8" {...common} />}
      {shape === 'round' && <rect x="0" y="24" width="100" height="52" rx="26" {...common} />}
      {shape === 'circle' && <ellipse cx="50" cy="50" rx="48" ry="48" {...common} />}
      {shape !== 'note' && shape !== 'round' && shape !== 'circle' && <path d={SVG_PATH[shape]} {...common} />}
    </svg>
  );
}

// --------------------------------------------------------------- geometry ----
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Smallest positive t where the ray t·(dx,dy) from the origin leaves the polygon. */
function rayPolygon(pts: [number, number][], dx: number, dy: number): number {
  let best = Infinity;
  for (let i = 0; i < pts.length; i++) {
    const [ax, ay] = pts[i]!;
    const [bx, by] = pts[(i + 1) % pts.length]!;
    const ex = bx - ax;
    const ey = by - ay;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-9) continue;
    const t = (ax * ey - ay * ex) / den;
    const u = (ax * dy - ay * dx) / den;
    if (t > 0 && u >= -1e-6 && u <= 1 + 1e-6) best = Math.min(best, t);
  }
  return best === Infinity ? 0 : best;
}

/** Where the line from the box's centre towards (tx, ty) crosses the shape's edge. */
export function edgePoint(shape: CardShape, b: Box, tx: number, ty: number): [number, number] {
  const cx = b.x + b.w / 2;
  const cy = b.y + b.h / 2;
  const dx = tx - cx;
  const dy = ty - cy;
  if (!dx && !dy) return [cx, cy];
  const a = b.w / 2;
  const c = b.h / 2;
  let t: number;
  switch (shape) {
    case 'circle':
    case 'cloud': {
      const k = shape === 'cloud' ? 0.9 : 1;
      t = 1 / Math.sqrt((dx / (a * k)) ** 2 + (dy / (c * k)) ** 2);
      break;
    }
    case 'diamond':
      t = 1 / (Math.abs(dx) / a + Math.abs(dy) / c);
      break;
    case 'hexagon':
      t = rayPolygon([[-a, 0], [-a / 2, -c], [a / 2, -c], [a, 0], [a / 2, c], [-a / 2, c]], dx, dy);
      break;
    case 'bubble':
      // The body is the top 80 % (the tail is left out).
      t = rayPolygon([[-a, -c], [a, -c], [a, c * 0.6], [-a, c * 0.6]], dx, dy);
      break;
    case 'round': {
      // A stadium: straight sides plus two half circles.
      const r = Math.min(a, c);
      const wide = a >= c;
      const [px, py] = wide ? [dx, dy] : [dy, dx];
      const half = (wide ? a : c) - r;
      const tFlat = r / Math.abs(py || 1e-9);
      if (Math.abs(px * tFlat) <= half) t = tFlat;
      else {
        const ox = Math.sign(px) * half;
        // |t·p − (ox, 0)| = r  →  (px² + py²) t² − 2 ox px t + ox² − r² = 0
        const A = px * px + py * py;
        const B = -2 * ox * px;
        const C = ox * ox - r * r;
        t = (-B + Math.sqrt(Math.max(0, B * B - 4 * A * C))) / (2 * A);
      }
      break;
    }
    default:
      t = Math.min(a / Math.abs(dx || 1e-9), c / Math.abs(dy || 1e-9));
  }
  return [cx + dx * t, cy + dy * t];
}

// ------------------------------------------------------------------- text ----
/**
 * Shrinks (or grows) the text in `textRef` until `boxRef` (a fixed-size,
 * overflow-hidden box) does not overflow. Re-fits when the box is resized.
 */
export function useFitText(boxRef: RefObject<HTMLElement | null>, textRef: RefObject<HTMLElement | null>, deps: unknown[], max = 30, min = 10) {
  useLayoutEffect(() => {
    const box = boxRef.current;
    const text = textRef.current;
    if (!text) return;
    if (!box) {
      // Not fitting (any more): back to the size the classes give.
      text.style.fontSize = '';
      text.style.overflowWrap = '';
      return;
    }
    const fits = () => box.scrollHeight <= box.clientHeight + 1 && box.scrollWidth <= box.clientWidth + 1 && text.scrollWidth <= text.clientWidth + 1;
    const fit = () => {
      const top = Math.max(min, Math.min(max, box.clientHeight / 2.4));
      // Words are not split while searching: a long word makes the text smaller instead.
      text.style.overflowWrap = 'normal';
      let lo = min;
      let hi = top;
      let best = min;
      for (let i = 0; i < 7; i++) {
        const mid = (lo + hi) / 2;
        text.style.fontSize = `${mid}px`;
        if (fits()) {
          best = mid;
          lo = mid;
        } else hi = mid;
      }
      text.style.fontSize = `${Math.floor(best * 2) / 2}px`;
      // Still too long at the smallest size: now it may break inside words.
      text.style.overflowWrap = fits() ? '' : 'anywhere';
    };
    fit();
    let w = box.clientWidth;
    let h = box.clientHeight;
    const ro = new ResizeObserver(() => {
      if (box.clientWidth === w && box.clientHeight === h) return;
      w = box.clientWidth;
      h = box.clientHeight;
      fit();
    });
    ro.observe(box);
    return () => ro.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
