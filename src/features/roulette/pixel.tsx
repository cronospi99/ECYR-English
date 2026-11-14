/* 8-bit drawing kit for Phrasal Verb Roulette. Nothing here loads an image: the scenery is painted
   on a small canvas (480×270, shown four times larger with hard pixels), and sprites come from
   character maps kept in code. */
import { useEffect, useRef } from 'react';
import { TEACHER_H, TEACHER_PALETTE, TEACHER_ROWS, TEACHER_W } from './teacherSprite';

const B36 = '0123456789abcdefghijklmnopqrstuvwxyz';

/** Draws a character map ('.' is empty) with a letter → colour palette. */
function drawMap(ctx: CanvasRenderingContext2D, rows: string[], pal: Record<string, string>, x = 0, y = 0, s = 1) {
  rows.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const c = pal[row[i]]; if (c) { ctx.fillStyle = c; ctx.fillRect(x + i * s, y + j * s, s, s); } } });
}

let teacherCanvas: [HTMLCanvasElement, HTMLCanvasElement] | null = null;
/* The pointer stick (sprite pixels above the hand, x ≥ 95 and y ≤ 56) goes on its own layer so it
   can swing around the grip at STICK_PIVOT. */
const STICK_X = 95, STICK_Y = 56, STICK_PIVOT = [99, 58];
function teacherSource(): [HTMLCanvasElement, HTMLCanvasElement] {
  if (teacherCanvas) return teacherCanvas;
  const mk = () => { const c = document.createElement('canvas'); c.width = TEACHER_W; c.height = TEACHER_H; return c; };
  const body = mk(), stick = mk(), bc = body.getContext('2d')!, sc = stick.getContext('2d')!;
  TEACHER_ROWS.forEach((row, y) => {
    let x = 0;
    for (let i = 0; i < row.length; i++) {
      let n = 1, ch = row[i];
      if (ch === '~') { n = B36.indexOf(row[i + 1]); ch = row[i + 2]; i += 2; }
      if (ch !== '.') {
        const col = TEACHER_PALETTE[B36.indexOf(ch) - 1];
        for (let k = 0; k < n; k++) { const ctx = y <= STICK_Y && x + k >= STICK_X ? sc : bc; ctx.fillStyle = col; ctx.fillRect(x + k, y, 1, 1); }
      }
      x += n;
    }
  });
  return (teacherCanvas = [body, stick]);
}

function Layer({ src, scale, className }: { src: 0 | 1; scale: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => { const c = ref.current!; c.getContext('2d')!.drawImage(teacherSource()[src], 0, 0); }, [src]);
  return <canvas ref={ref} width={TEACHER_W} height={TEACHER_H} className={`pv-px ${className || ''}`} style={{ width: TEACHER_W * scale, height: TEACHER_H * scale }} />;
}

/** The teacher who hosts the game, waving his pointer stick. `scale` is the size of one sprite
    pixel in stage pixels. */
export function Teacher({ scale = 4, className = '', style }: { scale?: number; className?: string; style?: React.CSSProperties }) {
  const origin = `${(STICK_PIVOT[0] / TEACHER_W) * 100}% ${(STICK_PIVOT[1] / TEACHER_H) * 100}%`;
  return (
    <div className={`pv-teach ${className}`} style={{ width: TEACHER_W * scale, height: TEACHER_H * scale, ...style }} aria-hidden="true">
      <div className="pv-stick" style={{ transformOrigin: origin }}><Layer src={1} scale={scale} /></div>
      <Layer src={0} scale={scale} className="pv-body" />
    </div>
  );
}

const ICON_PAL: Record<string, string> = { r: '#e52521', w: '#ffffff', k: '#1b1035', b: '#2a6fe0', y: '#ffd21f', o: '#e8780c', s: '#ffc79a', p: '#a56bff', g: '#43b047' };
export const ICONS: Record<string, string[]> = {
  practice: ['....rrrr....', '..rrwwwwrr..', '.rwwrrrrwwr.', '.rwrwwwwrwr.', 'rwrwrrrrwrwr', 'rwrwrwwrwrwr', 'rwrwrwwrwrwr', 'rwrwrrrrwrwr', '.rwrwwwwrwr.', '.rwwrrrrwwr.', '..rrwwwwrr..', '....rrrr....'],
  learn: ['............', '.bbbbb.bbbbb', 'bwwwwwbwwwwb', 'bwkkkwbwkkwb', 'bwwwwwbwwwwb', 'bwkkkwbwkkwb', 'bwwwwwbwwwwb', 'bwkkwwbwkkwb', 'bwwwwwbwwwwb', 'bbbbbbbbbbbb', '.bbbbb.bbbbb', '............'],
  compete: ['.kyyyyyyyyk.', 'kkyyyyyyyykk', 'k.yyyyyyyy.k', 'k.yywyyyyy.k', '.kyywyyyyyk.', '..yyyyyyyy..', '...yyyyyy...', '....yyyy....', '.....yy.....', '.....yy.....', '...oooooo...', '..oooooooo..'],
  teams: ['..rrr..bbb..', '.rrrrrbbbbb.', '.rsssrbsssb.', '.rsksrbsksb.', '.rsssrbsssb.', '..sss..sss..', '.rrrrrbbbbb.', 'rrrrrrbbbbbb', 'rrrrrrbbbbbb', 'rrrrrrbbbbbb', 'rrrrrrbbbbbb', '............'],
  rewards: ['...rr..rr...', '..r..rr..r..', '..r..rr..r..', '.pppprrpppp.', '.pppprrpppp.', '.rrrrrrrrrr.', '.pppprrpppp.', '.pppprrpppp.', '.pppprrpppp.', '.pppprrpppp.', '.pppprrpppp.', '............'],
  heart: ['.rr..rr.', 'rwrrrrrr', 'rrrrrrrr', 'rrrrrrrr', '.rrrrrr.', '..rrrr..', '...rr...'],
  coin: ['..yyyy..', '.ywwyyo.', 'ywyyyyyo', 'ywyyyyyo', 'yyyyyyyo', 'yyyyyyyo', '.yyyyoo.', '..oooo..'],
  star: ['...yy...', '...yy...', 'yyyyyyyy', '.yyyyyy.', '..yyyy..', '.yyyyyy.', '.yy..yy.', 'y......y'],
};

/** A small pixel icon from the maps above. */
export function PixelIcon({ name, scale = 6, style }: { name: keyof typeof ICONS | string; scale?: number; style?: React.CSSProperties }) {
  const ref = useRef<HTMLCanvasElement>(null), rows = ICONS[name];
  useEffect(() => { const c = ref.current!, ctx = c.getContext('2d')!; ctx.clearRect(0, 0, c.width, c.height); drawMap(ctx, rows, ICON_PAL); }, [rows]);
  return <canvas ref={ref} width={rows[0].length} height={rows.length} className="pv-px" style={{ width: rows[0].length * scale, height: rows.length * scale, ...style }} aria-hidden="true" />;
}

/* ---------- the title scene ---------- */
const W = 480, H = 270;
function rnd(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }

function cloud(c: CanvasRenderingContext2D, x: number, y: number, k: number) {
  x = Math.round(x); y = Math.round(y);
  c.fillStyle = '#cfe6ff'; c.fillRect(x + 2 * k, y + 5 * k, 22 * k, 3 * k);
  c.fillStyle = '#ffffff';
  c.fillRect(x + 4 * k, y + 2 * k, 8 * k, 5 * k); c.fillRect(x + 10 * k, y, 8 * k, 7 * k); c.fillRect(x + 16 * k, y + 3 * k, 7 * k, 4 * k); c.fillRect(x, y + 4 * k, 26 * k, 3 * k);
}
function brick(c: CanvasRenderingContext2D, x: number, y: number, w = 16, h = 16) {
  c.fillStyle = '#7a2f10'; c.fillRect(x, y, w, h);
  for (let j = 0; j < h; j += 4) for (let i = (j / 4) % 2 ? -4 : 0; i < w; i += 8) {
    const bx = Math.max(x, x + i), bw = Math.min(x + w, x + i + 7) - bx;
    if (bw <= 0) continue;
    c.fillStyle = '#d0622a'; c.fillRect(bx, y + j, bw, 3);
    c.fillStyle = '#f08a4a'; c.fillRect(bx, y + j, bw, 1);
  }
  c.fillStyle = '#000'; c.fillRect(x - 1, y - 1, w + 2, 1); c.fillRect(x - 1, y + h, w + 2, 1); c.fillRect(x - 1, y, 1, h); c.fillRect(x + w, y, 1, h);
}
function ground(c: CanvasRenderingContext2D, x: number, y: number, w: number) {
  c.fillStyle = '#a4582a'; c.fillRect(x, y, w, H - y);
  for (let j = y + 8; j < H; j += 8) for (let i = ((j - y) / 8) % 2 ? -8 : 0; i < w; i += 16) {
    c.fillStyle = '#7a3d17'; c.fillRect(Math.max(x, x + i), j, Math.min(15, w - i), 1); c.fillRect(Math.max(x, x + i + 15), j - 7, 1, 8);
    c.fillStyle = '#c97a42'; c.fillRect(Math.max(x, x + i + 2), j - 5, 3, 1);
  }
  c.fillStyle = '#2a7a1c'; c.fillRect(x, y, w, 7);
  c.fillStyle = '#3fae2a'; c.fillRect(x, y, w, 5);
  c.fillStyle = '#7be04a'; c.fillRect(x, y, w, 2);
  for (let i = 3; i < w; i += 7) { c.fillStyle = '#2a7a1c'; c.fillRect(x + i, y + 6, 3, 2); }
  c.fillStyle = '#000'; c.fillRect(x, y - 1, w, 1);
}
function bush(c: CanvasRenderingContext2D, x: number, y: number) {
  c.fillStyle = '#1f7a2a'; c.fillRect(x, y - 6, 22, 6); c.fillRect(x + 3, y - 10, 16, 4); c.fillRect(x + 7, y - 13, 8, 3);
  c.fillStyle = '#3fae2a'; c.fillRect(x + 2, y - 7, 8, 3); c.fillRect(x + 8, y - 11, 6, 3); c.fillRect(x + 14, y - 6, 5, 2);
}
function coin(c: CanvasRenderingContext2D, x: number, y: number, f: number) {
  const w = [8, 6, 2, 6][f % 4], o = (8 - w) / 2;
  c.fillStyle = '#000'; c.fillRect(x + o - 1, y - 1, w + 2, 10);
  c.fillStyle = '#e8a00c'; c.fillRect(x + o, y, w, 8);
  c.fillStyle = '#ffd21f'; c.fillRect(x + o, y, Math.max(1, w - 1), 7);
  if (w > 3) { c.fillStyle = '#fff3a0'; c.fillRect(x + o + 1, y + 1, 1, 5); }
}

/** Paints one frame of the title scenery. `f` counts 10 steps per second. */
function paint(c: CanvasRenderingContext2D, f: number) {
  const bands = ['#1663d8', '#1c74ea', '#2386f6', '#3a9bff', '#5cb2ff', '#86caff'];
  bands.forEach((col, i) => {
    c.fillStyle = col; c.fillRect(0, i * 36, W, 37);
    if (i) { c.fillStyle = bands[i - 1]; for (let x = (i % 2) * 2; x < W; x += 4) c.fillRect(x, i * 36, 2, 2); }
  });
  // far city and hills
  const r = rnd(9);
  for (let x = 0; x < W;) { const w = 10 + Math.floor(r() * 16), h = 18 + Math.floor(r() * 46); c.fillStyle = '#3d8df0'; c.fillRect(x, 232 - h, w, h); c.fillStyle = '#6fb0ff'; for (let j = 232 - h + 4; j < 226; j += 7) for (let i = x + 2; i < x + w - 2; i += 5) if (r() < 0.45) c.fillRect(i, j, 2, 3); x += w + 2; }
  for (const [hx, hw, hh] of [[40, 120, 40], [210, 150, 30], [400, 130, 46]]) for (let j = 0; j < hh; j += 2) { const k = Math.sqrt(1 - (1 - j / hh) ** 2); c.fillStyle = j % 8 < 4 ? '#2f9e4f' : '#35ab57'; c.fillRect(Math.round(hx - (hw / 2) * k), 232 - hh + j, Math.round(hw * k), 2); }
  // clouds drift at different speeds (nearer = faster); birds flap across now and then
  const drift = (sp: number, x0: number, k: number) => ((f * sp + x0) % (W + 30 + 26 * k)) - 26 * k;
  cloud(c, drift(1.1, 30, 2), 28, 2); cloud(c, drift(0.55, 300, 1), 58, 1); cloud(c, drift(0.8, 420, 1), 20, 1); cloud(c, drift(0.4, 170, 1), 96, 1);
  cloud(c, drift(0.9, 250, 2), 120, 2); cloud(c, drift(0.65, 90, 1), 150, 1);
  for (const [sp, x0, y0, ph] of [[2.2, 0, 70, 0], [2.2, 14, 76, 1], [2.2, 26, 66, 2], [1.7, 300, 44, 1]]) {
    const bx = Math.round(((f * sp + x0) % (W * 2)) - 30), by = Math.round(y0 + Math.sin((f + ph * 3) / 6) * 3), up = (f + ph) % 4 < 2;
    if (bx < -10 || bx > W) continue;
    c.fillStyle = '#1b1035';
    c.fillRect(bx + 2, by, 1, 1);
    if (up) { c.fillRect(bx, by - 2, 1, 1); c.fillRect(bx + 1, by - 1, 1, 1); c.fillRect(bx + 3, by - 1, 1, 1); c.fillRect(bx + 4, by - 2, 1, 1); }
    else { c.fillRect(bx, by + 1, 1, 1); c.fillRect(bx + 1, by, 1, 1); c.fillRect(bx + 3, by, 1, 1); c.fillRect(bx + 4, by + 1, 1, 1); }
  }
  // twinkles
  for (const [sx, sy, p] of [[160, 14, 0], [308, 30, 5], [28, 112, 9], [455, 122, 3], [236, 108, 7]]) if ((f + p) % 12 < 6) { c.fillStyle = '#fff'; c.fillRect(sx, sy - 2, 1, 5); c.fillRect(sx - 2, sy, 5, 1); }
  // terrain: two raised platforms and a lower lane, like a first level
  ground(c, 136, 250, 212); ground(c, 0, 232, 140); ground(c, 344, 232, 136);
  bush(c, 140, 250); bush(c, 318, 250); bush(c, 96, 232);
  // blocks, with the middle one bumping now and then
  const bump = f % 34 < 3 ? -3 : 0;
  brick(c, 6, 84); brick(c, 22, 84 + bump); brick(c, 54, 84); brick(c, 462, 54); brick(c, 440, 242, 32, 12);
  c.fillStyle = '#000'; c.fillRect(61, 207, 34, 14); c.fillStyle = '#e8a00c'; c.fillRect(62, 208, 32, 12); c.fillStyle = '#ffd21f'; c.fillRect(62, 208, 31, 9); c.fillStyle = '#fff3a0'; c.fillRect(64, 210, 12, 2);
  const cf = Math.floor(f / 2);
  coin(c, 26, 66 + (bump ? -4 : 0), cf); coin(c, 452, 216, cf + 1); coin(c, 190, 232 + (Math.floor(f / 5) % 2), cf + 2); coin(c, 290, 228 + (Math.floor(f / 5 + 1) % 2), cf + 3);
}

export function Scene() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const ctx = ref.current!.getContext('2d')!;
    let f = 0;
    paint(ctx, 0);
    const id = window.setInterval(() => paint(ctx, ++f), 100);
    return () => window.clearInterval(id);
  }, []);
  return <canvas ref={ref} width={W} height={H} className="pv-px" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }} aria-hidden="true" />;
}
