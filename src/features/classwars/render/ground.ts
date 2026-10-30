/* Class Wars — the static ground layer (mowed-lawn stripes, paths, ponds, burrows, flat decor
   and baked prop shadows), rendered lazily in 256-px chunks at the current render scale. */
import { WORLD_H, WORLD_W, rng } from '../game/constants';
import { EDGE, type GameMap } from '../game/map';
import { INK, PROP_SHADOW } from './sprites';

export const CHUNK = 256;
const STRIPE = 96;
const G1 = '#4fcd4c', G2 = '#45c043';

export class Ground {
  private chunks = new Map<number, HTMLCanvasElement>();
  private order: number[] = [];
  private map: GameMap;
  s = 1;
  max = 64;
  constructor(map: GameMap) { this.map = map; }

  setScale(s: number) {
    if (Math.abs(s - this.s) < 0.01) return;
    this.s = s;
    this.chunks.clear();
    this.order = [];
  }

  has(cx: number, cy: number) { return this.chunks.has(cy * 100 + cx); }

  get(cx: number, cy: number): HTMLCanvasElement {
    const k = cy * 100 + cx;
    let c = this.chunks.get(k);
    if (c) return c;
    c = document.createElement('canvas');
    c.width = c.height = Math.ceil(CHUNK * this.s);
    const g = c.getContext('2d')!;
    g.scale(this.s, this.s);
    g.translate(-cx * CHUNK, -cy * CHUNK);
    this.paint(g, cx * CHUNK, cy * CHUNK);
    this.chunks.set(k, c);
    this.order.push(k);
    if (this.order.length > this.max) {
      const old = this.order.shift()!;
      this.chunks.delete(old);
    }
    return c;
  }

  /** Paint the world region [x0, x0+CHUNK) × [y0, y0+CHUNK). */
  private paint(g: CanvasRenderingContext2D, x0: number, y0: number) {
    const m = this.map;
    const x1 = x0 + CHUNK, y1 = y0 + CHUNK;
    const pad = 220;
    const near = (x: number, y: number, r = pad) => x > x0 - r && x < x1 + r && y > y0 - r && y < y1 + r;
    // stripes
    for (let x = Math.floor(x0 / STRIPE) * STRIPE; x < x1; x += STRIPE) {
      g.fillStyle = Math.floor(x / STRIPE) % 2 ? G1 : G2;
      g.fillRect(x, y0, STRIPE, CHUNK);
    }
    // grass flecks
    const R = rng((x0 * 73856093) ^ (y0 * 19349663) ^ m.seed);
    g.strokeStyle = 'rgba(30,110,40,0.28)';
    g.lineWidth = 2;
    g.lineCap = 'round';
    for (let i = 0; i < 22; i++) {
      const x = x0 + R() * CHUNK, y = y0 + R() * CHUNK;
      g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - 6); g.moveTo(x + 3, y); g.lineTo(x + 4, y - 7); g.stroke();
    }
    g.fillStyle = 'rgba(255,255,255,0.08)';
    for (let i = 0; i < 10; i++) { g.beginPath(); g.arc(x0 + R() * CHUNK, y0 + R() * CHUNK, 2 + R() * 2, 0, 7); g.fill(); }

    // paths
    for (const p of m.paths) {
      if (!p.pts.some(([x, y]) => near(x, y, p.w + 120))) continue;
      const line = (w: number, c: string) => {
        g.beginPath();
        g.moveTo(p.pts[0][0], p.pts[0][1]);
        for (let i = 1; i < p.pts.length; i++) g.lineTo(p.pts[i][0], p.pts[i][1]);
        g.lineWidth = w; g.strokeStyle = c; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke();
      };
      line(p.w + 10, '#2f8f35');
      line(p.w + 6, '#c4955a');
      line(p.w, '#e3bb82');
      line(p.w * 0.35, 'rgba(255,255,255,0.10)');
    }
    // pebbles on paths
    // ponds
    for (const pd of m.ponds) {
      if (!near(pd.x, pd.y, Math.max(pd.rx, pd.ry) + 40)) continue;
      const shape = (k: number) => {
        g.beginPath();
        const n = pd.wob.length * 3;
        for (let i = 0; i <= n; i++) {
          const a = (i / n) * Math.PI * 2;
          const wi = i / 3, w0 = pd.wob[Math.floor(wi) % pd.wob.length], w1 = pd.wob[Math.ceil(wi) % pd.wob.length];
          const w = w0 + (w1 - w0) * (wi % 1);
          const x = pd.x + Math.cos(a) * pd.rx * w * k, y = pd.y + Math.sin(a) * pd.ry * w * k;
          if (i) g.lineTo(x, y); else g.moveTo(x, y);
        }
        g.closePath();
      };
      shape(1.08); g.fillStyle = '#d9c08a'; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
      shape(0.98); g.fillStyle = '#3db3e8'; g.fill(); g.lineWidth = 3; g.strokeStyle = '#1f6f99'; g.stroke();
      shape(0.7); g.fillStyle = '#5cc6f2'; g.fill();
      g.strokeStyle = 'rgba(255,255,255,0.55)'; g.lineWidth = 3;
      for (const [dx, dy, w] of [[-0.3, -0.25, 26], [0.2, 0.15, 18], [0.35, -0.3, 14]]) { g.beginPath(); g.moveTo(pd.x + dx * pd.rx - w / 2, pd.y + dy * pd.ry); g.lineTo(pd.x + dx * pd.rx + w / 2, pd.y + dy * pd.ry); g.stroke(); }
      const PR = rng(Math.round(pd.x * 7 + pd.y));
      for (let i = 0; i < 3; i++) {
        const a = PR() * Math.PI * 2, d = 0.35 + PR() * 0.35;
        const lx = pd.x + Math.cos(a) * pd.rx * d, ly = pd.y + Math.sin(a) * pd.ry * d;
        g.beginPath(); g.moveTo(lx, ly); g.arc(lx, ly, 13, a + 0.3, a + 0.3 + Math.PI * 1.75); g.closePath();
        g.fillStyle = '#4fae3c'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
        if (i === 0) { g.fillStyle = '#ff8fb8'; g.beginPath(); g.arc(lx + 4, ly - 3, 4, 0, 7); g.fill(); }
      }
    }
    // baked soft shadows of tall props
    for (const p of m.props) {
      const sh = PROP_SHADOW[p.k];
      if (!sh || !near(p.x, p.y, 120)) continue;
      const [dy, rx, ry] = sh;
      g.fillStyle = 'rgba(16,60,20,0.22)';
      g.beginPath(); g.ellipse(p.x + 4, p.y + dy, rx * p.s * (p.k === 'tree' ? 1 : 0.8), ry * p.s, 0, 0, 7); g.fill();
      if (p.k === 'tree') { g.fillStyle = 'rgba(16,60,20,0.14)'; g.beginPath(); g.ellipse(p.x + 10, p.y + dy + 4, rx * p.s * 1.15, ry * p.s * 1.3, 0, 0, 7); g.fill(); }
    }
    // flat decor
    for (const p of m.props) {
      if (!near(p.x, p.y, 40)) continue;
      if (p.k === 'clover') clover(g, p.x, p.y, p.s);
      else if (p.k === 'flowers') flowers(g, p.x, p.y, p.v, p.s);
      else if (p.k === 'mushroom') mushroom(g, p.x, p.y, p.s);
    }
    // burrows
    for (const b of m.burrows) if (near(b.x, b.y, 120)) burrow(g, b.x, b.y);
    // hedge border
    if (x0 < EDGE + 40 || y0 < EDGE + 40 || x1 > WORLD_W - EDGE - 40 || y1 > WORLD_H - EDGE - 40) hedge(g, x0, y0, x1, y1);
  }
}

function clover(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.strokeStyle = '#2b7a2e'; g.lineWidth = 3; g.beginPath(); g.moveTo(0, 0); g.quadraticCurveTo(3, 10, -2, 18); g.stroke();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI * 2 + 0.4;
    g.beginPath(); g.arc(Math.cos(a) * 7, Math.sin(a) * 7, 7.5, 0, 7);
    g.fillStyle = '#3fae47'; g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke();
  }
  g.fillStyle = 'rgba(255,255,255,0.25)'; g.beginPath(); g.arc(-3, -4, 3, 0, 7); g.fill();
  g.restore();
}
function flowers(g: CanvasRenderingContext2D, x: number, y: number, v: number, s: number) {
  const col = ['#ffffff', '#ffd34d', '#ff8fb8', '#b48cff'][v % 4];
  const R = rng(Math.round(x * 13 + y));
  for (let i = 0; i < 4; i++) {
    const fx = x + (R() - 0.5) * 30 * s, fy = y + (R() - 0.5) * 20 * s;
    g.fillStyle = col;
    for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; g.beginPath(); g.arc(fx + Math.cos(a) * 3.4 * s, fy + Math.sin(a) * 3.4 * s, 2.8 * s, 0, 7); g.fill(); }
    g.fillStyle = '#ffb02e'; g.beginPath(); g.arc(fx, fy, 2 * s, 0, 7); g.fill();
  }
}
function mushroom(g: CanvasRenderingContext2D, x: number, y: number, s: number) {
  g.save(); g.translate(x, y); g.scale(s, s);
  g.fillStyle = '#f4ead2'; g.fillRect(-3, -6, 6, 9); g.lineWidth = 2; g.strokeStyle = INK; g.strokeRect(-3, -6, 6, 9);
  g.beginPath(); g.arc(0, -6, 9, Math.PI, 0); g.closePath(); g.fillStyle = '#e8463f'; g.fill(); g.stroke();
  g.fillStyle = '#fff'; g.beginPath(); g.arc(-3, -9, 1.8, 0, 7); g.arc(4, -8, 1.5, 0, 7); g.fill();
  g.restore();
}
export function burrow(g: CanvasRenderingContext2D, x: number, y: number) {
  g.save(); g.translate(x, y);
  g.fillStyle = 'rgba(16,60,20,0.25)'; g.beginPath(); g.ellipse(6, 26, 84, 30, 0, 0, 7); g.fill();
  // mound
  g.beginPath(); g.ellipse(0, 0, 78, 56, 0, 0, 7);
  const gr = g.createRadialGradient(-20, -24, 10, 0, 0, 80);
  gr.addColorStop(0, '#6fd96a'); gr.addColorStop(1, '#3aa53e');
  g.fillStyle = gr; g.fill(); g.lineWidth = 4.5; g.strokeStyle = INK; g.stroke();
  // mowing stripes on the mound
  g.save(); g.beginPath(); g.ellipse(0, 0, 76, 54, 0, 0, 7); g.clip();
  g.fillStyle = 'rgba(255,255,255,0.07)'; for (let i = -80; i < 80; i += 32) g.fillRect(i, -60, 16, 120);
  g.restore();
  // tunnel opening: orange rings
  const rings = ['#f29a4a', '#d9732f', '#a8521f', '#5b2a10'];
  rings.forEach((c, i) => {
    g.beginPath(); g.ellipse(0, 18, 46 - i * 10, 30 - i * 7, 0, Math.PI, 0); g.lineTo(46 - i * 10, 26); g.lineTo(-(46 - i * 10), 26); g.closePath();
    g.fillStyle = c; g.fill(); g.lineWidth = i === 0 ? 4 : 2; g.strokeStyle = INK; g.stroke();
  });
  g.restore();
}
function hedge(g: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  g.fillStyle = '#2f8a3a';
  const W = WORLD_W, H = WORLD_H;
  g.fillRect(0, 0, W, EDGE); g.fillRect(0, H - EDGE, W, EDGE); g.fillRect(0, 0, EDGE, H); g.fillRect(W - EDGE, 0, EDGE, H);
  g.lineWidth = 4; g.strokeStyle = INK;
  const bump = (x: number, y: number) => { g.beginPath(); g.arc(x, y, 18, 0, 7); g.fillStyle = '#3a9c43'; g.fill(); g.stroke(); g.fillStyle = 'rgba(255,255,255,0.14)'; g.beginPath(); g.arc(x - 5, y - 6, 7, 0, 7); g.fill(); };
  for (let x = Math.floor(x0 / 30) * 30; x < x1 + 30; x += 30) { if (y0 < EDGE + 30) bump(x, EDGE); if (y1 > H - EDGE - 30) bump(x, H - EDGE); }
  for (let y = Math.floor(y0 / 30) * 30; y < y1 + 30; y += 30) { if (x0 < EDGE + 30) bump(EDGE, y); if (x1 > W - EDGE - 30) bump(W - EDGE, y); }
}
