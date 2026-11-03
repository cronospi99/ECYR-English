/* Class Wars — drawing for the side-view modes: the Knockback stage (a starry night sky with
   parallax stars, soft clouds and faint far-away platforms, and chunky 3D block platforms cached
   per scale), the Color Clash level (pastel sky, riveted white blocks, painted blocks) and the
   spawn pedestal. */
import { PAINT_CELL, TEAM_COLORS, TEAM_DARK, TILE, rng } from '../game/constants';
import { paintCols, paintRows, type GameMap, type Plat } from '../game/map';
import type { VisualWorld } from '../game/vis';
import { INK } from './sprites';

type G = CanvasRenderingContext2D;

/* ------------------------------------------------------------ knockback */
export class Stage {
  private map: GameMap;
  private cache = new Map<string, HTMLCanvasElement>();
  private s = 0;
  constructor(map: GameMap) { this.map = map; }

  private stars: [number, number, number, number, number][] = [];
  private ghosts: [number, number, number, number][] = [];

  /** Screen-space sky with parallax (call before the world transform). */
  sky(g: G, w: number, h: number, camX: number, camY: number, z: number, now: number) {
    if (this.map.tiles) return this.pastel(g, w, h, camX, camY, now);
    if (!this.stars.length) {
      const R = rng(this.map.seed ^ 0x5f3a);
      // x, y in a 1600×1000 tile, size, layer (parallax), twinkle phase
      for (let i = 0; i < 230; i++) this.stars.push([R() * 1600, R() * 1000, R() < 0.12 ? 2 : R() < 0.45 ? 1 : 0, R() < 0.5 ? 0 : 1, R() * 6.3]);
      for (let i = 0; i < 9; i++) this.ghosts.push([R() * 2400, 120 + R() * 700, 160 + R() * 240, Math.floor(R() * 4)]);
    }
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#16187a'); gr.addColorStop(0.45, '#2a2fd0'); gr.addColorStop(1, '#5a43d6');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // soft violet glow drifting with the camera
    const gx = w * 0.7 - camX * 0.03, gy = h * 0.35 - camY * 0.03, gR = Math.max(w, h) * 0.55;
    const ng = g.createRadialGradient(gx, gy, 0, gx, gy, gR);
    ng.addColorStop(0, 'rgba(190,120,255,0.28)'); ng.addColorStop(1, 'rgba(190,120,255,0)');
    g.fillStyle = ng; g.fillRect(0, 0, w, h);
    // stars: two parallax layers, a few twinkling four-point sparkles
    const k = Math.max(1, z * 0.8);
    for (const [sx, sy, size, layer, ph] of this.stars) {
      const par = layer ? 0.12 : 0.05;
      const x = (((sx * k - camX * par) % (1600 * k)) + 1600 * k) % (1600 * k);
      const y = (((sy * k - camY * par) % (1000 * k)) + 1000 * k) % (1000 * k);
      for (let ox = x; ox < w; ox += 1600 * k) for (let oy = y; oy < h; oy += 1000 * k) {
        const tw = 0.55 + 0.45 * Math.sin(now * 0.002 + ph);
        if (size === 2) sparkle(g, ox, oy, 5 * k * (0.7 + tw * 0.5), `rgba(255,255,255,${0.6 + tw * 0.4})`);
        else { g.fillStyle = size ? `rgba(255,240,255,${0.5 + tw * 0.5})` : `rgba(200,210,255,${0.35 + tw * 0.4})`; const d = (size ? 2.4 : 1.6) * k; g.fillRect(ox - d / 2, oy - d / 2, d, d); }
      }
    }
    // faint far-away platforms and clouds
    g.save();
    for (const [bx, by, bw, v] of this.ghosts) {
      const x = ((bx * k - camX * 0.35) % (2600 * k) + 2600 * k) % (2600 * k) - 300 * k, y = by * k - camY * 0.2;
      if (x > w + 50 || x + bw * k < -50) continue;
      g.globalAlpha = 0.16;
      block3d(g, x, y, bw * k * 0.7, 60 * k * 0.7, v, k * 0.7, false);
    }
    g.globalAlpha = 1;
    const R = rng(this.map.seed);
    g.fillStyle = 'rgba(190,170,255,0.16)';
    for (let i = 0; i < 10; i++) {
      const base = R() * 2600, y = 80 + R() * h * 0.85, sc = 0.7 + R() * 0.9;
      const x = ((base - camX * (0.15 + sc * 0.08) + now * 0.006 * sc) % 2800 + 2800) % 2800 - 300;
      g.beginPath();
      for (const [dx, dy, r] of [[0, 0, 26], [32, -12, 32], [66, 0, 24], [34, 8, 24]]) { g.moveTo(x + dx * sc + r * sc, y + dy * sc - camY * 0.05); g.arc(x + dx * sc, y + dy * sc - camY * 0.05, r * sc, 0, 7); }
      g.fill();
    }
    g.restore();
  }

  /** Color Clash sky: a warm pastel wash with soft brush swirls and cream clouds. */
  private pastel(g: G, w: number, h: number, camX: number, camY: number, now: number) {
    const gr = g.createLinearGradient(0, 0, w, h);
    gr.addColorStop(0, '#ffc7d9'); gr.addColorStop(0.5, '#ffd9c2'); gr.addColorStop(1, '#f7c3e6');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.save();
    g.globalAlpha = 0.22; g.strokeStyle = '#ffffff'; g.lineWidth = 10; g.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const y = ((i * 170 - camY * 0.08) % (h + 200) + h + 200) % (h + 200) - 100;
      g.beginPath();
      for (let x = -40; x <= w + 40; x += 30) g.lineTo(x, y + Math.sin((x + camX * 0.08) * 0.012 + i) * 26);
      g.stroke();
    }
    g.restore();
    const R = rng(this.map.seed);
    for (let i = 0; i < 12; i++) {
      const base = R() * 3000, y = R() * h, sc = 0.7 + R() * 0.9;
      const x = ((base - camX * 0.2 * sc + now * 0.006 * sc) % 3200 + 3200) % 3200 - 300;
      g.fillStyle = 'rgba(255,240,170,0.75)';
      g.beginPath();
      for (const [dx, dy, r] of [[0, 0, 30], [34, -14, 38], [72, 0, 30], [36, 10, 30]]) { g.moveTo(x + dx * sc + r * sc, y + dy * sc - camY * 0.05); g.arc(x + dx * sc, y + dy * sc - camY * 0.05, r * sc, 0, 7); }
      g.fill();
    }
  }

  /** Color Clash: painted blocks drawn over the white ones (only the visible ones). */
  paint(g: G, vis: VisualWorld, x0: number, x1: number, y0: number, y1: number) {
    const t = this.map.tiles, grid = vis.paint;
    if (!t || !grid) return;
    const c0 = Math.max(0, Math.floor(x0 / TILE)), c1 = Math.min(t.cols - 1, Math.floor(x1 / TILE));
    const r0 = Math.max(0, Math.floor(y0 / TILE)), r1 = Math.min(t.rows - 1, Math.floor(y1 / TILE));
    for (let r = r0; r <= r1; r++)
      for (let c = c0; c <= c1; c++) {
        const v = grid[r * t.cols + c];
        if (!v) continue;
        const x = c * TILE, y = r * TILE;
        g.fillStyle = TEAM_COLORS[v - 1];
        g.fillRect(x + 2, y + 2, TILE - 4, TILE - 4);
        g.fillStyle = 'rgba(255,255,255,0.28)'; g.fillRect(x + 4, y + 4, TILE - 8, 5);
        g.strokeStyle = TEAM_DARK[v - 1]; g.lineWidth = 2; g.strokeRect(x + 3, y + 3, TILE - 6, TILE - 6);
        g.fillStyle = TEAM_DARK[v - 1];
        for (const [dx, dy] of [[9, 9], [TILE - 9, 9], [9, TILE - 9], [TILE - 9, TILE - 9]]) { g.beginPath(); g.arc(x + dx, y + dy, 2, 0, 7); g.fill(); }
      }
  }

  /** Platforms in world space. */
  draw(g: G, S: number, x0: number, x1: number, y0: number, y1: number) {
    if (S !== this.s) { this.cache.clear(); this.s = S; }
    for (const p of this.map.plats) {
      if (p.x > x1 || p.x + p.w + PAD < x0 || p.y - PAD > y1 || p.y + p.h + PAD < y0) continue;
      const key = `${p.x},${p.y}`;
      let c = this.cache.get(key);
      if (!c) { c = this.bake(p, S); this.cache.set(key, c); }
      g.drawImage(c, p.x - PAD, p.y - PAD, p.w + PAD * 2, p.h + PAD * 2);
    }
  }

  private bake(p: Plat, S: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    const w = p.w + PAD * 2, h = p.h + PAD * 2;
    c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
    const g = c.getContext('2d')!;
    g.scale(S, S);
    g.translate(PAD - p.x, PAD - p.y);
    if (this.map.tiles) blocks(g, p, this.map); else block3d(g, p.x, p.y, p.w, p.h, p.v, 1, true);
    return c;
  }
}
const PAD = 26;

/** Platform colours (front, top, side, line): mint, lilac, coral, sky. Trim is gold. */
const PAL = [
  ['#33c9a6', '#7df0d2', '#23947c', '#1d7d69'],
  ['#9b6bff', '#c7a6ff', '#6e48c4', '#5a3aa6'],
  ['#ff5a86', '#ff9db8', '#c43f66', '#a3304f'],
  ['#3fa6ff', '#9bd2ff', '#2a77c2', '#215f9e'],
];
const GOLD = '#ffd23f', GOLD_D = '#c9980f';

/**
 * A chunky block platform seen slightly from above: a tiled top face (where feet stand, at y), a
 * front of blocks, a gold trim, an inset base with gold plates, and a darker right side. Also
 * used for the faint background platforms (detail = false) and the spawn pedestal.
 */
export function block3d(g: G, x: number, y: number, w: number, h: number, v: number, s: number, detail: boolean) {
  const [front, top, side, line] = PAL[((v % 4) + 4) % 4];
  const T = 12 * s, K = 18 * s, base = Math.min(22 * s, h * 0.3);
  const fy = y + T, fh = Math.max(10 * s, h - T - base), by = fy + fh;
  const bi = Math.min(16 * s, w * 0.08);
  // base (inset, under the trim)
  g.fillStyle = front; g.fillRect(x + bi, by, w - bi * 2, base);
  g.fillStyle = side; g.beginPath(); g.moveTo(x + w - bi, by); g.lineTo(x + w - bi + K * 0.6, by - T * 0.6); g.lineTo(x + w - bi + K * 0.6, by + base - T * 0.6); g.lineTo(x + w - bi, by + base); g.closePath(); g.fill();
  // right side
  g.fillStyle = side;
  g.beginPath(); g.moveTo(x + w, fy); g.lineTo(x + w + K, y - T); g.lineTo(x + w + K, by - T * 2 + 6 * s); g.lineTo(x + w, by + 6 * s); g.closePath(); g.fill();
  // front
  g.fillStyle = front; g.fillRect(x, fy, w, fh);
  // top
  g.fillStyle = top;
  g.beginPath(); g.moveTo(x, fy); g.lineTo(x + w, fy); g.lineTo(x + w + K, y - T); g.lineTo(x + K, y - T); g.closePath(); g.fill();
  // gold trim between the front and the base
  g.fillStyle = GOLD; g.fillRect(x, by, w, 6 * s);
  g.fillStyle = GOLD_D; g.beginPath(); g.moveTo(x + w, by); g.lineTo(x + w + K, by - T * 2); g.lineTo(x + w + K, by - T * 2 + 6 * s); g.lineTo(x + w, by + 6 * s); g.closePath(); g.fill();
  if (detail) {
    const n = Math.max(1, Math.round(w / (46 * s))), cw = w / n;
    g.strokeStyle = line; g.lineWidth = 2.5 * s;
    g.beginPath();
    for (let i = 1; i < n; i++) {
      const cx = x + i * cw;
      g.moveTo(cx, fy); g.lineTo(cx, by); // front seams
      g.moveTo(cx, fy); g.lineTo(cx + K, y - T); // top seams
    }
    const rows = Math.max(1, Math.round(fh / (40 * s)));
    for (let r = 1; r < rows; r++) { g.moveTo(x, fy + (fh * r) / rows); g.lineTo(x + w, fy + (fh * r) / rows); }
    g.moveTo(x + K * 0.5, y); g.lineTo(x + w + K * 0.5, y); // middle line of the top
    g.stroke();
    // light edge on the top front, rivets, plates on the base
    g.fillStyle = 'rgba(255,255,255,0.35)'; g.fillRect(x, fy, w, 3 * s);
    g.fillStyle = line;
    for (let i = 0; i < n; i++) { const cx = x + i * cw; g.beginPath(); g.arc(cx + 7 * s, fy + 8 * s, 1.8 * s, 0, 7); g.arc(cx + cw - 7 * s, fy + 8 * s, 1.8 * s, 0, 7); g.fill(); }
    const plates = Math.max(1, Math.round((w - bi * 2) / (110 * s)));
    for (let i = 0; i < plates; i++) {
      const px = x + bi + ((w - bi * 2) * (i + 0.5)) / plates - 13 * s;
      g.fillStyle = GOLD; g.fillRect(px, by + 9 * s, 26 * s, base - 12 * s);
      g.strokeStyle = INK; g.lineWidth = 2 * s; g.strokeRect(px, by + 9 * s, 26 * s, base - 12 * s);
      g.fillStyle = INK; g.beginPath(); g.arc(px + 5 * s, by + 9 * s + (base - 12 * s) / 2, 1.5 * s, 0, 7); g.arc(px + 21 * s, by + 9 * s + (base - 12 * s) / 2, 1.5 * s, 0, 7); g.fill();
    }
  }
  // ink outline: the silhouette plus the edges between faces
  g.strokeStyle = INK; g.lineWidth = (detail ? 4 : 3) * s; g.lineJoin = 'round';
  g.beginPath();
  g.moveTo(x, fy); g.lineTo(x + K, y - T); g.lineTo(x + w + K, y - T); g.lineTo(x + w + K, by - T * 2 + 6 * s); g.lineTo(x + w, by + 6 * s);
  g.lineTo(x + w - bi, by + 6 * s); g.lineTo(x + w - bi, by + base); g.lineTo(x + bi, by + base); g.lineTo(x + bi, by + 6 * s); g.lineTo(x, by + 6 * s); g.closePath();
  g.moveTo(x, fy); g.lineTo(x + w, fy); g.lineTo(x + w + K, y - T);
  g.moveTo(x + w, fy); g.lineTo(x + w, by + 6 * s);
  g.moveTo(x, by); g.lineTo(x + w, by);
  g.stroke();
}

/** The spawn pedestal: a small block under a player who just came back (fades out at the end). */
export function pedestal(g: G, x: number, y: number, alpha: number, v: number) {
  g.save();
  g.globalAlpha = alpha;
  block3d(g, x - 46, y, 92, 64, v, 1, true);
  g.restore();
}

function sparkle(g: G, x: number, y: number, r: number, color: string) {
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x, y - r); g.quadraticCurveTo(x, y, x + r, y); g.quadraticCurveTo(x, y, x, y + r); g.quadraticCurveTo(x, y, x - r, y); g.quadraticCurveTo(x, y, x, y - r);
  g.fill();
}

/** A run of white riveted blocks (Color Clash); the outline only on sides that face the air. */
function blocks(g: G, p: Plat, map: GameMap) {
  const t = map.tiles!;
  const solid = (c: number, r: number) => c < 0 || r < 0 || c >= t.cols || r >= t.rows || !!t.grid[r * t.cols + c];
  const r = Math.round(p.y / TILE);
  for (let x = p.x; x < p.x + p.w; x += TILE) {
    const c = Math.round(x / TILE);
    g.fillStyle = '#f4f2fb'; g.fillRect(x, p.y, TILE, TILE);
    g.fillStyle = '#dcd8ec'; g.fillRect(x, p.y + TILE - 7, TILE, 7);
    g.strokeStyle = '#c3bedb'; g.lineWidth = 2; g.strokeRect(x + 3, p.y + 3, TILE - 6, TILE - 6);
    g.fillStyle = '#a9a3c6';
    for (const [dx, dy] of [[9, 9], [TILE - 9, 9], [9, TILE - 9], [TILE - 9, TILE - 9]]) { g.beginPath(); g.arc(x + dx, p.y + dy, 2.2, 0, 7); g.fill(); }
    g.strokeStyle = INK; g.lineWidth = 4; g.lineCap = 'square';
    g.beginPath();
    if (!solid(c, r - 1)) { g.moveTo(x, p.y); g.lineTo(x + TILE, p.y); }
    if (!solid(c, r + 1)) { g.moveTo(x, p.y + TILE); g.lineTo(x + TILE, p.y + TILE); }
    if (!solid(c - 1, r)) { g.moveTo(x, p.y); g.lineTo(x, p.y + TILE); }
    if (!solid(c + 1, r)) { g.moveTo(x + TILE, p.y); g.lineTo(x + TILE, p.y + TILE); }
    g.stroke();
  }
}

/* --------------------------------------------------------------- paint */
const PK = 0.25; // paint canvas scale (world px → canvas px)
const BLOCK = 3; // cells redrawn together

export class PaintLayer {
  c: HTMLCanvasElement;
  private g: G;
  private cols: number;
  private rows: number;
  constructor(map: GameMap) {
    this.cols = paintCols(map);
    this.rows = paintRows(map);
    this.c = document.createElement('canvas');
    this.c.width = Math.ceil(map.w * PK);
    this.c.height = Math.ceil(map.h * PK);
    this.g = this.c.getContext('2d')!;
  }

  /** Bring the canvas up to date with the visual world's paint grid. */
  sync(vis: VisualWorld) {
    const grid = vis.paint;
    if (!grid) return;
    if (vis.paintAll) {
      vis.paintAll = false;
      vis.paintDirty.length = 0;
      this.g.clearRect(0, 0, this.c.width, this.c.height);
      this.blob(grid, 0, 0, this.cols, this.rows);
      return;
    }
    if (!vis.paintDirty.length) return;
    const blocks = new Set<number>();
    for (const i of vis.paintDirty) blocks.add(Math.floor((i % this.cols) / BLOCK) + Math.floor(Math.floor(i / this.cols) / BLOCK) * 1000);
    vis.paintDirty.length = 0;
    const g = this.g, cs = PAINT_CELL * PK;
    for (const b of blocks) {
      const bx = (b % 1000) * BLOCK, by = Math.floor(b / 1000) * BLOCK;
      g.save();
      g.beginPath(); g.rect(bx * cs, by * cs, BLOCK * cs, BLOCK * cs); g.clip();
      g.clearRect(bx * cs, by * cs, BLOCK * cs, BLOCK * cs);
      this.blob(grid, bx - 1, by - 1, bx + BLOCK + 1, by + BLOCK + 1);
      g.restore();
    }
  }

  private blob(grid: Uint8Array, c0: number, r0: number, c1: number, r1: number) {
    const g = this.g, cs = PAINT_CELL * PK, rad = cs * 0.8;
    for (let t = 1; t <= TEAM_COLORS.length; t++) {
      g.fillStyle = TEAM_COLORS[t - 1];
      g.beginPath();
      for (let cy = Math.max(0, r0); cy < Math.min(this.rows, r1); cy++)
        for (let cx = Math.max(0, c0); cx < Math.min(this.cols, c1); cx++) {
          if (grid[cy * this.cols + cx] !== t) continue;
          const x = (cx + 0.5) * cs, y = (cy + 0.5) * cs;
          g.moveTo(x + rad, y); g.arc(x, y, rad, 0, 7);
        }
      g.fill();
    }
  }
}
