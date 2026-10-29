/**
 * Pure canvas-2D helpers for the drawing board: backgrounds, flood fill,
 * shapes, smoothing and export. Everything works in two coordinate systems:
 *  - board units: the board is always UNITS wide (height = UNITS / aspect);
 *  - canvas pixels: units × k, where k = canvas.width / UNITS (hi-DPI aware).
 */

export const UNITS = 1000;

export type Tool =
  | 'pencil'
  | 'brush'
  | 'highlighter'
  | 'eraser'
  | 'fill'
  | 'line'
  | 'arrow'
  | 'rect'
  | 'ellipse'
  | 'text'
  | 'eyedropper';

export type Background = 'white' | 'grid' | 'lined' | 'none';

export interface Pt {
  x: number;
  y: number;
  p: number; // pressure 0..1
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const FREEHAND: Tool[] = ['pencil', 'brush', 'highlighter', 'eraser'];
export const SHAPES: Tool[] = ['line', 'arrow', 'rect', 'ellipse'];

/* ------------------------------------------------------------------ colour */

export function hexToRgb(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  const n = parseInt(h.slice(0, 6), 16) || 0;
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number) {
  return '#' + [r, g, b].map((v) => Math.round(v).toString(16).padStart(2, '0')).join('');
}

/* -------------------------------------------------------------- background */

/** Paints the paper. `w`/`h` are canvas pixels; spacing scales with the board. */
export function paintBackground(ctx: CanvasRenderingContext2D, w: number, h: number, bg: Background) {
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, w, h);
  if (bg !== 'none') {
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, w, h);
  }
  const k = w / UNITS;
  const step = 40 * k;
  ctx.lineWidth = Math.max(1, 1.2 * k);
  if (bg === 'grid') {
    ctx.strokeStyle = '#dde5f0';
    ctx.beginPath();
    for (let x = step; x < w; x += step) {
      ctx.moveTo(Math.round(x) + 0.5, 0);
      ctx.lineTo(Math.round(x) + 0.5, h);
    }
    for (let y = step; y < h; y += step) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
    }
    ctx.stroke();
  } else if (bg === 'lined') {
    ctx.strokeStyle = '#c9d8ef';
    ctx.beginPath();
    for (let y = step * 2; y < h; y += step) {
      ctx.moveTo(0, Math.round(y) + 0.5);
      ctx.lineTo(w, Math.round(y) + 0.5);
    }
    ctx.stroke();
    ctx.strokeStyle = '#f3a7a7';
    ctx.beginPath();
    const mx = Math.round(80 * k) + 0.5;
    ctx.moveTo(mx, 0);
    ctx.lineTo(mx, h);
    ctx.stroke();
  }
  ctx.restore();
}

/* -------------------------------------------------------------- freehand */

export interface StrokeStyle {
  tool: Tool;
  color: string;
  size: number; // units
  k: number;
}

/** Width in units for a point, using pen pressure when available. */
export function widthAt(style: StrokeStyle, p: number, pen: boolean) {
  if (!pen || style.tool !== 'pencil') return style.size;
  return Math.max(0.6, style.size * (0.25 + p * 1.25));
}

export function applyStrokeStyle(ctx: CanvasRenderingContext2D, s: StrokeStyle) {
  ctx.lineCap = s.tool === 'highlighter' ? 'square' : 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = s.color;
  ctx.fillStyle = s.color;
  ctx.globalCompositeOperation = s.tool === 'eraser' ? 'destination-out' : 'source-over';
  if (s.tool === 'brush') {
    // Soft edge: a coloured blur around a slimmer core. shadowBlur ignores the transform → scale by k.
    ctx.shadowColor = s.color;
    ctx.shadowBlur = Math.max(2, s.size * 0.55 * s.k);
  } else {
    ctx.shadowColor = 'transparent';
    ctx.shadowBlur = 0;
  }
}

/** The core width actually stroked (the brush gets its body from the blur). */
export function coreWidth(s: StrokeStyle, w: number) {
  return s.tool === 'brush' ? Math.max(1, w * 0.6) : w;
}

/** A single dot (tap without moving). */
export function drawDot(ctx: CanvasRenderingContext2D, s: StrokeStyle, pt: Pt, w: number) {
  const r = coreWidth(s, w) / 2;
  ctx.beginPath();
  if (s.tool === 'highlighter') ctx.rect(pt.x - r, pt.y - r, r * 2, r * 2);
  else ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
  ctx.fill();
}

const mid = (a: Pt, b: Pt): Pt => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, p: (a.p + b.p) / 2 });

/**
 * Incremental quadratic smoothing: draws the newest segment of `pts`
 * (from the midpoint of the previous pair, curving through the previous point).
 * Call after pushing each new point; call with `final` on pointer up.
 */
export function drawSegment(
  ctx: CanvasRenderingContext2D,
  s: StrokeStyle,
  pts: Pt[],
  pen: boolean,
  final = false,
) {
  const n = pts.length;
  if (n < 2) return;
  ctx.beginPath();
  if (final) {
    const a = n >= 3 ? mid(pts[n - 2], pts[n - 1]) : pts[0];
    const b = pts[n - 1];
    if (n >= 3) {
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.lineWidth = coreWidth(s, widthAt(s, b.p, pen));
      ctx.stroke();
    }
    return;
  }
  if (n === 2) {
    const m = mid(pts[0], pts[1]);
    ctx.moveTo(pts[0].x, pts[0].y);
    ctx.lineTo(m.x, m.y);
    ctx.lineWidth = coreWidth(s, widthAt(s, (pts[0].p + m.p) / 2, pen));
  } else {
    const a = mid(pts[n - 3], pts[n - 2]);
    const c = pts[n - 2];
    const b = mid(pts[n - 2], pts[n - 1]);
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(c.x, c.y, b.x, b.y);
    ctx.lineWidth = coreWidth(s, widthAt(s, c.p, pen));
  }
  ctx.stroke();
}

/* -------------------------------------------------------------- shapes */

export interface ShapeOpts {
  tool: Tool;
  color: string;
  size: number;
  filled: boolean;
  constrain: boolean;
}

/** Applies Shift constraints (square / circle / 45° snaps). */
export function constrainEnd(tool: Tool, a: { x: number; y: number }, b: { x: number; y: number }) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  if (tool === 'rect' || tool === 'ellipse') {
    const m = Math.max(Math.abs(dx), Math.abs(dy));
    return { x: a.x + Math.sign(dx || 1) * m, y: a.y + Math.sign(dy || 1) * m };
  }
  const ang = Math.round(Math.atan2(dy, dx) / (Math.PI / 4)) * (Math.PI / 4);
  const len = Math.hypot(dx, dy);
  return { x: a.x + Math.cos(ang) * len, y: a.y + Math.sin(ang) * len };
}

/** Draws a shape in board units (the context must carry the k transform). Returns its bounds in units. */
export function drawShape(
  ctx: CanvasRenderingContext2D,
  o: ShapeOpts,
  a: { x: number; y: number },
  bIn: { x: number; y: number },
): Rect {
  const b = o.constrain ? constrainEnd(o.tool, a, bIn) : bIn;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.lineWidth = o.size;
  ctx.strokeStyle = o.color;
  ctx.fillStyle = o.color;
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'source-over';
  let pad = o.size;
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  const w = Math.abs(b.x - a.x);
  const h = Math.abs(b.y - a.y);
  ctx.beginPath();
  if (o.tool === 'line') {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
  } else if (o.tool === 'arrow') {
    const ang = Math.atan2(b.y - a.y, b.x - a.x);
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const head = Math.min(Math.max(o.size * 3.2, 16), Math.max(len * 0.6, 4));
    const spread = Math.PI / 7;
    const bx = b.x - Math.cos(ang) * head * 0.8;
    const by = b.y - Math.sin(ang) * head * 0.8;
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(bx, by);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(b.x, b.y);
    ctx.lineTo(b.x - Math.cos(ang - spread) * head, b.y - Math.sin(ang - spread) * head);
    ctx.lineTo(b.x - Math.cos(ang + spread) * head, b.y - Math.sin(ang + spread) * head);
    ctx.closePath();
    ctx.lineWidth = Math.max(1, o.size * 0.5);
    ctx.fill();
    ctx.stroke();
    pad += head;
  } else if (o.tool === 'rect') {
    ctx.rect(x, y, w, h);
    if (o.filled) ctx.fill();
    else ctx.stroke();
  } else if (o.tool === 'ellipse') {
    ctx.ellipse(x + w / 2, y + h / 2, Math.max(w / 2, 0.5), Math.max(h / 2, 0.5), 0, 0, Math.PI * 2);
    if (o.filled) ctx.fill();
    else ctx.stroke();
  }
  ctx.restore();
  return { x: x - pad, y: y - pad, w: w + pad * 2, h: h + pad * 2 };
}

/* -------------------------------------------------------------- flood fill */

/**
 * Scanline flood fill on the full-resolution canvas (pixel coordinates).
 * Colours are compared premultiplied so transparent areas behave, and the
 * filled area is grown by 1–2 px *under* the existing pixels, which hides the
 * anti-aliasing halo around strokes. Returns the changed rect in pixels.
 */
export function floodFill(
  ctx: CanvasRenderingContext2D,
  sx: number,
  sy: number,
  color: [number, number, number, number],
  tolerance: number,
  grow = 1,
): Rect | null {
  const { width: w, height: h } = ctx.canvas;
  sx = Math.floor(sx);
  sy = Math.floor(sy);
  if (sx < 0 || sy < 0 || sx >= w || sy >= h) return null;
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const i0 = (sy * w + sx) * 4;
  const ta = d[i0 + 3];
  const tr = (d[i0] * ta) / 255;
  const tg = (d[i0 + 1] * ta) / 255;
  const tb = (d[i0 + 2] * ta) / 255;
  const [fr, fg, fb, fa] = color;
  if (ta === fa && d[i0] === fr && d[i0 + 1] === fg && d[i0 + 2] === fb) return null;
  const tol = Math.max(0, Math.min(100, tolerance)) * 2.55;

  const match = (p: number) => {
    const i = p * 4;
    const a = d[i + 3];
    if (Math.abs(a - ta) > tol) return false;
    return (
      Math.abs((d[i] * a) / 255 - tr) <= tol &&
      Math.abs((d[i + 1] * a) / 255 - tg) <= tol &&
      Math.abs((d[i + 2] * a) / 255 - tb) <= tol
    );
  };

  const mask = new Uint8Array(w * h);
  let minX = sx,
    maxX = sx,
    minY = sy,
    maxY = sy;
  const stack: number[] = [sx, sy];
  while (stack.length) {
    const y = stack.pop()!;
    let x = stack.pop()!;
    const row = y * w;
    if (mask[row + x] || !match(row + x)) continue;
    while (x > 0 && !mask[row + x - 1] && match(row + x - 1)) x--;
    let upOpen = false;
    let downOpen = false;
    for (; x < w && !mask[row + x] && match(row + x); x++) {
      mask[row + x] = 1;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y > 0) {
        const up = row - w + x;
        const ok = !mask[up] && match(up);
        if (ok && !upOpen) stack.push(x, y - 1);
        upOpen = ok;
      }
      if (y < h - 1) {
        const dn = row + w + x;
        const ok = !mask[dn] && match(dn);
        if (ok && !downOpen) stack.push(x, y + 1);
        downOpen = ok;
      }
    }
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }

  // Grow the region by `grow` px (marked 2) to tuck the fill under anti-aliased edges.
  for (let g = 0; g < grow; g++) {
    const mark = 2 + g;
    const x0 = Math.max(0, minX - 1),
      x1 = Math.min(w - 1, maxX + 1);
    const y0 = Math.max(0, minY - 1),
      y1 = Math.min(h - 1, maxY + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const p = y * w + x;
        if (mask[p]) continue;
        if (
          (x > 0 && mask[p - 1] && mask[p - 1] < mark) ||
          (x < w - 1 && mask[p + 1] && mask[p + 1] < mark) ||
          (y > 0 && mask[p - w] && mask[p - w] < mark) ||
          (y < h - 1 && mask[p + w] && mask[p + w] < mark)
        ) {
          mask[p] = mark;
        }
      }
    }
    minX = x0;
    maxX = x1;
    minY = y0;
    maxY = y1;
  }

  const fA = fa / 255;
  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const p = y * w + x;
      const m = mask[p];
      if (!m) continue;
      const i = p * 4;
      if (m === 1) {
        d[i] = fr;
        d[i + 1] = fg;
        d[i + 2] = fb;
        d[i + 3] = fa;
      } else {
        // existing OVER fill
        const ea = d[i + 3] / 255;
        const oa = ea + fA * (1 - ea);
        if (oa <= 0) continue;
        d[i] = (d[i] * ea + fr * fA * (1 - ea)) / oa;
        d[i + 1] = (d[i + 1] * ea + fg * fA * (1 - ea)) / oa;
        d[i + 2] = (d[i + 2] * ea + fb * fA * (1 - ea)) / oa;
        d[i + 3] = oa * 255;
      }
    }
  }
  const rect = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  ctx.putImageData(img, 0, 0, rect.x, rect.y, rect.w, rect.h);
  return rect;
}

/* -------------------------------------------------------------- text */

export const FONT_STACK = `ui-rounded, 'SF Pro Rounded', -apple-system, 'Segoe UI', Roboto, system-ui, sans-serif`;
export const TEXT_LINE = 1.2;

export function textFont(size: number) {
  return `600 ${size}px ${FONT_STACK}`;
}

/** Draws multi-line text with its top-left at (x, y), in units. Returns bounds in units. */
export function drawText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  size: number,
  color: string,
): Rect {
  ctx.save();
  ctx.font = textFont(size);
  ctx.textBaseline = 'top';
  ctx.fillStyle = color;
  ctx.shadowBlur = 0;
  ctx.globalCompositeOperation = 'source-over';
  const lines = text.split('\n');
  let maxW = 0;
  lines.forEach((ln, i) => {
    // Centre the glyphs in the line box, like the textarea does.
    ctx.fillText(ln, x, y + i * size * TEXT_LINE + size * (TEXT_LINE - 1) * 0.5);
    maxW = Math.max(maxW, ctx.measureText(ln).width);
  });
  ctx.restore();
  return { x: x - 4, y: y - 4, w: maxW + 8, h: lines.length * size * TEXT_LINE + 8 };
}

/* -------------------------------------------------------------- rect utils */

export function unionRect(a: Rect | null, b: Rect): Rect {
  if (!a) return { ...b };
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return { x, y, w: Math.max(a.x + a.w, b.x + b.w) - x, h: Math.max(a.y + a.h, b.y + b.h) - y };
}

/** Units → integer pixel rect, clamped to the canvas. */
export function toPixelRect(r: Rect, k: number, cw: number, ch: number): Rect | null {
  const x0 = Math.max(0, Math.floor(r.x * k) - 2);
  const y0 = Math.max(0, Math.floor(r.y * k) - 2);
  const x1 = Math.min(cw, Math.ceil((r.x + r.w) * k) + 2);
  const y1 = Math.min(ch, Math.ceil((r.y + r.h) * k) + 2);
  if (x1 <= x0 || y1 <= y0) return null;
  return { x: x0, y: y0, w: x1 - x0, h: y1 - y0 };
}

/* -------------------------------------------------------------- export */

/** Paper + ink composited at `scale` of the ink canvas. */
export function composite(ink: HTMLCanvasElement, bg: Background, scale = 1): HTMLCanvasElement {
  const w = Math.max(1, Math.round(ink.width * scale));
  const h = Math.max(1, Math.round(ink.height * scale));
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  paintBackground(ctx, w, h, bg);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(ink, 0, 0, w, h);
  return c;
}

const dataUrlBytes = (u: string) => Math.ceil(((u.length - u.indexOf(',') - 1) * 3) / 4);

/**
 * Compressed data URL: webp (quality stepped down) ≤ maxBytes and ≤ maxSide px
 * on the long side; falls back to png (downscaled until it fits), then jpeg
 * as a last resort when the paper is opaque.
 */
export function exportCompressed(
  ink: HTMLCanvasElement,
  bg: Background,
  maxSide = 1200,
  maxBytes = 300_000,
): string {
  let scale = Math.min(1, maxSide / Math.max(ink.width, ink.height));
  let canvas = composite(ink, bg, scale);
  const probe = canvas.toDataURL('image/webp', 0.9);
  const webp = probe.startsWith('data:image/webp');
  if (webp) {
    let best = probe;
    for (const q of [0.9, 0.82, 0.74, 0.66, 0.58, 0.5, 0.42]) {
      best = q === 0.9 ? probe : canvas.toDataURL('image/webp', q);
      if (dataUrlBytes(best) <= maxBytes) return best;
    }
    for (let i = 0; i < 4; i++) {
      scale *= 0.75;
      canvas = composite(ink, bg, scale);
      best = canvas.toDataURL('image/webp', 0.6);
      if (dataUrlBytes(best) <= maxBytes) return best;
    }
    return best;
  }
  let png = canvas.toDataURL('image/png');
  for (let i = 0; i < 4 && dataUrlBytes(png) > maxBytes; i++) {
    scale *= 0.75;
    canvas = composite(ink, bg, scale);
    png = canvas.toDataURL('image/png');
  }
  if (dataUrlBytes(png) > maxBytes && bg !== 'none') {
    const jpg = canvas.toDataURL('image/jpeg', 0.8);
    if (dataUrlBytes(jpg) < dataUrlBytes(png)) return jpg;
  }
  return png;
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (!src.startsWith('data:') && !src.startsWith('blob:')) img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('No se pudo cargar la imagen'));
    img.src = src;
  });
}
