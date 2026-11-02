/* Class Wars — drawing for the two newer modes: the Knockback stage (sky, parallax hills and
   clouds, floating islands and ledges, all cached per scale) and the Color Clash paint layer (a
   quarter-scale canvas of soft round blobs, redrawn only where cells changed). */
import { PAINT_CELL, TEAM_COLORS, rng } from '../game/constants';
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

  /** Screen-space sky with parallax (call before the world transform). */
  sky(g: G, w: number, h: number, camX: number, camY: number, z: number, now: number) {
    const gr = g.createLinearGradient(0, 0, 0, h);
    gr.addColorStop(0, '#5ab8ff'); gr.addColorStop(0.62, '#a9e0ff'); gr.addColorStop(1, '#e6f7ff');
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    // sun
    const sx = w * 0.8 - camX * 0.02, sy = h * 0.2 - camY * 0.02;
    const sg = g.createRadialGradient(sx, sy, 10, sx, sy, 150);
    sg.addColorStop(0, 'rgba(255,250,210,0.95)'); sg.addColorStop(0.25, 'rgba(255,240,170,0.55)'); sg.addColorStop(1, 'rgba(255,240,170,0)');
    g.fillStyle = sg; g.fillRect(sx - 150, sy - 150, 300, 300);
    // far hills, near hills (two parallax layers)
    this.hills(g, w, h, camX * 0.12, camY * 0.05, h * 0.62, 90, '#9ad7c9', 0.0021, 3);
    this.hills(g, w, h, camX * 0.25, camY * 0.1, h * 0.74, 70, '#7cc8a6', 0.0034, 7);
    // clouds drifting
    const R = rng(this.map.seed);
    for (let i = 0; i < 9; i++) {
      const base = R() * 2400, y = 40 + R() * h * 0.45, sc = 0.6 + R() * 0.8;
      const x = ((base - camX * (0.15 + sc * 0.1) + now * 0.008 * sc) % 2600 + 2600) % 2600 - 300;
      this.cloud(g, x * Math.max(1, w / 2000), y - camY * 0.04, sc * Math.max(0.8, z));
    }
  }

  private hills(g: G, w: number, h: number, ox: number, oy: number, base: number, amp: number, color: string, f: number, seed: number) {
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w + 20; x += 20) {
      const wx = x + ox;
      const y = base - oy + Math.sin(wx * f + seed) * amp * 0.6 + Math.sin(wx * f * 2.3 + seed * 2) * amp * 0.3;
      g.lineTo(x, y);
    }
    g.lineTo(w, h); g.closePath();
    g.fillStyle = color; g.fill();
  }

  private cloud(g: G, x: number, y: number, s: number) {
    g.fillStyle = 'rgba(255,255,255,0.9)';
    g.beginPath();
    for (const [dx, dy, r] of [[0, 0, 28], [30, -12, 34], [64, 0, 26], [34, 8, 26]]) { g.moveTo(x + dx * s + r * s, y + dy * s); g.arc(x + dx * s, y + dy * s, r * s, 0, 7); }
    g.fill();
  }

  /** Platforms in world space. */
  draw(g: G, S: number, x0: number, x1: number, y0: number, y1: number) {
    if (S !== this.s) { this.cache.clear(); this.s = S; }
    for (const p of this.map.plats) {
      if (p.x > x1 || p.x + p.w < x0 || p.y > y1 + 40 || p.y + p.h + 160 < y0) continue;
      const key = `${p.x},${p.y}`;
      let c = this.cache.get(key);
      if (!c) { c = this.bake(p, S); this.cache.set(key, c); }
      g.drawImage(c, p.x - PAD, p.y - PAD, p.w + PAD * 2, p.h + PAD * 2 + (p.thin ? 0 : HANG));
    }
  }

  private bake(p: Plat, S: number): HTMLCanvasElement {
    const c = document.createElement('canvas');
    const w = p.w + PAD * 2, h = p.h + PAD * 2 + (p.thin ? 0 : HANG);
    c.width = Math.ceil(w * S); c.height = Math.ceil(h * S);
    const g = c.getContext('2d')!;
    g.scale(S, S);
    g.translate(PAD - p.x, PAD - p.y);
    if (p.thin) ledge(g, p); else island(g, p);
    return c;
  }
}
const PAD = 8, HANG = 120;

/** A floating island: grass top, layered dirt, rocks hanging underneath. */
function island(g: G, p: Plat) {
  const R = rng(p.x * 31 + p.y);
  const { x, y, w, h } = p;
  // hanging rock underside
  g.beginPath();
  g.moveTo(x + 6, y + h - 10);
  const n = Math.max(4, Math.round(w / 90));
  for (let i = 0; i <= n; i++) {
    const px = x + 6 + ((w - 12) * i) / n;
    const depth = i === 0 || i === n ? 0 : 30 + R() * (HANG - 40) * Math.sin((i / n) * Math.PI);
    g.lineTo(px - (w / n) * 0.25, y + h + depth * 0.6);
    g.lineTo(px, y + h + depth);
  }
  g.lineTo(x + w - 6, y + h - 10);
  g.closePath();
  g.fillStyle = '#8a6a55'; g.fill();
  g.lineWidth = 4; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke();
  // dirt body
  rr(g, x, y + 10, w, h - 10, 22);
  const dg = g.createLinearGradient(0, y, 0, y + h);
  dg.addColorStop(0, '#c08a55'); dg.addColorStop(1, '#94603a');
  g.fillStyle = dg; g.fill(); g.lineWidth = 4.5; g.strokeStyle = INK; g.stroke();
  // strata + pebbles
  g.save(); rr(g, x, y + 10, w, h - 10, 22); g.clip();
  g.strokeStyle = 'rgba(80,45,20,0.35)'; g.lineWidth = 3;
  for (let k = 1; k < 4; k++) {
    g.beginPath();
    const yy = y + 30 + k * (h - 30) / 4;
    for (let px = x; px <= x + w; px += 30) g.lineTo(px, yy + Math.sin(px * 0.03 + k) * 5);
    g.stroke();
  }
  for (let i = 0; i < w / 40; i++) {
    g.beginPath(); g.ellipse(x + R() * w, y + 40 + R() * (h - 50), 6 + R() * 6, 4 + R() * 3, 0, 0, 7);
    g.fillStyle = R() < 0.5 ? '#d9b07a' : '#7e5434'; g.fill(); g.lineWidth = 2; g.strokeStyle = 'rgba(29,42,31,0.6)'; g.stroke();
  }
  g.restore();
  // grass cap with mowed stripes
  rr(g, x - 4, y - 4, w + 8, 34, 16);
  g.fillStyle = '#4cc24a'; g.fill();
  g.save(); rr(g, x - 4, y - 4, w + 8, 34, 16); g.clip();
  for (let sx = x - 4; sx < x + w + 4; sx += 64) { g.fillStyle = Math.floor((sx - x) / 64) % 2 ? '#43b641' : '#52cc4f'; g.fillRect(sx, y - 4, 32, 34); }
  g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(x - 4, y - 4, w + 8, 7);
  g.restore();
  rr(g, x - 4, y - 4, w + 8, 34, 16); g.lineWidth = 4.5; g.strokeStyle = INK; g.stroke();
  // grass tufts dripping over the edge
  g.fillStyle = '#43b641';
  for (let px = x + 14; px < x + w - 10; px += 26 + R() * 30) {
    g.beginPath(); g.moveTo(px - 9, y + 28); g.quadraticCurveTo(px, y + 44 + R() * 8, px + 9, y + 28); g.closePath(); g.fill();
    g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
  }
  // decoration on top: flowers and clover
  for (let px = x + 40; px < x + w - 40; px += 90 + R() * 120) {
    if (R() < 0.5) flower(g, px, y - 2, R() < 0.5 ? '#ff8fb8' : '#ffe14d');
    else clover(g, px, y - 2);
  }
}

/** Thin ledge you can jump through from below: bricks with a gold trim, or a wooden plank. */
function ledge(g: G, p: Plat) {
  const { x, y, w, h } = p;
  const brick = p.v % 2 === 0;
  rr(g, x, y, w, h, 8);
  g.fillStyle = brick ? '#ef5a6f' : '#c98b4f'; g.fill();
  g.save(); rr(g, x, y, w, h, 8); g.clip();
  if (brick) {
    g.fillStyle = '#ffcf4a'; g.fillRect(x, y, w, 7);
    g.strokeStyle = 'rgba(120,20,40,0.55)'; g.lineWidth = 2.5;
    for (let r = 0; r < 2; r++) {
      const yy = y + 7 + r * ((h - 7) / 2);
      g.beginPath(); g.moveTo(x, yy); g.lineTo(x + w, yy); g.stroke();
      for (let bx = x + (r ? 22 : 0); bx < x + w; bx += 44) { g.beginPath(); g.moveTo(bx, yy); g.lineTo(bx, yy + (h - 7) / 2); g.stroke(); }
    }
  } else {
    g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(x, y, w, 6);
    g.strokeStyle = 'rgba(90,50,20,0.5)'; g.lineWidth = 2.5;
    for (let bx = x + 60; bx < x + w; bx += 60) { g.beginPath(); g.moveTo(bx, y + 3); g.lineTo(bx, y + h - 3); g.stroke(); }
    g.fillStyle = 'rgba(60,35,15,0.7)';
    for (let bx = x + 12; bx < x + w; bx += 60) { g.beginPath(); g.arc(bx, y + h / 2, 2.6, 0, 7); g.arc(bx + 36, y + h / 2, 2.6, 0, 7); g.fill(); }
  }
  g.restore();
  rr(g, x, y, w, h, 8); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
}

function flower(g: G, x: number, y: number, petal: string) {
  g.strokeStyle = INK; g.lineWidth = 2.5;
  g.beginPath(); g.moveTo(x, y); g.lineTo(x, y - 18); g.stroke();
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    g.beginPath(); g.arc(x + Math.cos(a) * 6, y - 20 + Math.sin(a) * 6, 5, 0, 7); g.fillStyle = petal; g.fill(); g.stroke();
  }
  g.beginPath(); g.arc(x, y - 20, 4, 0, 7); g.fillStyle = '#ffb020'; g.fill(); g.stroke();
}
function clover(g: G, x: number, y: number) {
  g.strokeStyle = INK; g.lineWidth = 2.5;
  for (const [dx, dy] of [[-7, -8], [7, -8], [0, -16]]) { g.beginPath(); g.arc(x + dx, y + dy, 7, 0, 7); g.fillStyle = '#5fd25a'; g.fill(); g.stroke(); }
}

function rr(g: G, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
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
