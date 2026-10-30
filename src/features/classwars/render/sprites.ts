/* Class Wars — sprite factory. TeacherToon SVGs are rasterized once per character into
   offscreen canvases (normal, blink, white hit-flash); props, boxes, gems and weapons are drawn
   with canvas paths into cached canvases at the current render scale. Drawing a frame is then
   just drawImage calls. */
import { createElement } from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { TeacherToon } from '@/features/cards/TeacherToon';
import { TEACHERS } from '@/features/cards/teachers';
import { CHAR_SCALE } from '../game/constants';
import type { PropKind } from '../game/map';

export const INK = '#1d2a1f';

export interface Sprite { c: HTMLCanvasElement | OffscreenCanvas; ax: number; ay: number; w: number; h: number; s: number }

function canvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = Math.max(1, Math.ceil(w));
  c.height = Math.max(1, Math.ceil(h));
  return c;
}

/* ------------------------------------------------------------ characters */
// The toon is drawn around its feet at (0, 0); this box holds every hair style and height.
const VB = { x: -72, y: -196, w: 144, h: 210 };
const svgCache = new Map<string, string>();

function toonMarkup(ci: number, t: number): string {
  const key = `${ci}:${t}`;
  const hit = svgCache.get(key);
  if (hit) return hit;
  const host = document.createElement('div');
  const root = createRoot(host);
  flushSync(() => {
    root.render(createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: `${VB.x} ${VB.y} ${VB.w} ${VB.h}`, width: VB.w, height: VB.h }, createElement(TeacherToon, { look: TEACHERS[ci].look, t })));
  });
  const s = host.innerHTML;
  root.unmount();
  svgCache.set(key, s);
  return s;
}

export interface CharSprites { base: Sprite; blink: Sprite; white: Sprite; ready: boolean }
const charCache = new Map<string, CharSprites>();

function loadImage(svg: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => {
    const img = new Image();
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
  });
}

/** Character sprites at render scale s (world px → device px). Async: `ready` flips when loaded. */
const readyByChar = new Map<number, CharSprites>();
export function charSprites(ci: number, s: number): CharSprites {
  const key = `${ci}@${s}`;
  const hit = charCache.get(key);
  if (hit) return hit.ready ? hit : readyByChar.get(ci) ?? hit;
  const k = CHAR_SCALE * s;
  const mk = (): Sprite => ({ c: canvas(VB.w * k, VB.h * k), ax: -VB.x * CHAR_SCALE, ay: -VB.y * CHAR_SCALE, w: VB.w * CHAR_SCALE, h: VB.h * CHAR_SCALE, s });
  const entry: CharSprites = { base: mk(), blink: mk(), white: mk(), ready: false };
  charCache.set(key, entry);
  const fallback = readyByChar.get(ci);
  void (async () => {
    try {
      const [a, b] = await Promise.all([loadImage(toonMarkup(ci, 1)), loadImage(toonMarkup(ci, 4.2 * 3 + 0.04))]);
      for (const [img, sp] of [[a, entry.base], [b, entry.blink]] as const) {
        const g = (sp.c as HTMLCanvasElement).getContext('2d')!;
        g.drawImage(img, 0, 0, sp.c.width, sp.c.height);
      }
      const w = (entry.white.c as HTMLCanvasElement).getContext('2d')!;
      w.drawImage(entry.base.c as HTMLCanvasElement, 0, 0);
      w.globalCompositeOperation = 'source-atop';
      w.fillStyle = '#ffffff';
      w.fillRect(0, 0, entry.white.c.width, entry.white.c.height);
      entry.ready = true;
      readyByChar.set(ci, entry);
    } catch { /* keep placeholder */ }
  })();
  return fallback ?? entry;
}

export function clearSpriteCaches() { charCache.clear(); propCache.clear(); readyByChar.clear(); }

/* ------------------------------------------------------------- helpers */
type G = CanvasRenderingContext2D;
function blob(g: G, pts: [number, number, number][], fill: string, line = 4) {
  // union of circles with a thick outline: stroke every circle, then fill every circle
  g.lineWidth = line * 2;
  g.strokeStyle = INK;
  for (const [x, y, r] of pts) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.stroke(); }
  g.fillStyle = fill;
  for (const [x, y, r] of pts) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
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
function stroke(g: G, w = 4) { g.lineWidth = w; g.strokeStyle = INK; g.lineJoin = 'round'; g.lineCap = 'round'; g.stroke(); }

/** Bake a drawing (world units, anchor at 0,0) into a sprite at scale s. */
function bake(bx: number, by: number, bw: number, bh: number, s: number, draw: (g: G) => void): Sprite {
  const c = canvas(bw * s, bh * s);
  const g = c.getContext('2d')!;
  g.scale(s, s);
  g.translate(-bx, -by);
  draw(g);
  return { c, ax: -bx, ay: -by, w: bw, h: bh, s };
}

const propCache = new Map<string, Sprite>();
const LEAF = ['#3f9a3a', '#4aa83f', '#3a8f45'];
const LEAF_HI = ['#63c457', '#72cf5a', '#5cbf63'];

export function propSprite(k: PropKind, v: number, sc: number, s: number): Sprite {
  const key = `${k}:${v}:${sc.toFixed(2)}@${s}`;
  const hit = propCache.get(key);
  if (hit) return hit;
  let sp: Sprite;
  const z = sc;
  switch (k) {
    case 'tree':
      sp = bake(-80 * z, -150 * z, 160 * z, 165 * z, s, (g) => {
        g.scale(z, z);
        rr(g, -12, -52, 24, 56, 8); g.fillStyle = '#8a5a35'; g.fill(); stroke(g);
        g.fillStyle = '#6e4428'; g.fillRect(-4, -46, 4, 40);
        const L = LEAF[v % 3], H = LEAF_HI[v % 3];
        blob(g, [[-36, -82, 34], [34, -82, 34], [0, -104, 42], [-18, -66, 30], [20, -64, 30]], L);
        g.fillStyle = H;
        for (const [x, y, r] of [[-30, -92, 16], [8, -118, 18], [30, -92, 12]] as const) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fill(); }
        if (v === 2) { g.fillStyle = '#ff5a5a'; for (const [x, y] of [[-20, -78], [16, -96], [32, -70], [-6, -66]]) { g.beginPath(); g.arc(x, y, 5, 0, 7); g.fill(); g.lineWidth = 2; g.strokeStyle = INK; g.stroke(); } }
      });
      break;
    case 'pine':
      sp = bake(-62 * z, -170 * z, 124 * z, 182 * z, s, (g) => {
        g.scale(z, z);
        rr(g, -9, -36, 18, 40, 5); g.fillStyle = '#7a4b2c'; g.fill(); stroke(g);
        const tiers: [number, number][] = [[-30, 52], [-72, 44], [-110, 34]];
        for (const [y, w] of tiers) {
          g.beginPath(); g.moveTo(-w, y); g.quadraticCurveTo(0, y + 12, w, y); g.lineTo(0, y - 62); g.closePath();
          g.fillStyle = v % 2 ? '#2f7d3b' : '#2d8a46'; g.fill(); stroke(g);
          g.beginPath(); g.moveTo(-w * 0.35, y - 6); g.lineTo(0, y - 52); g.lineTo(w * 0.1, y - 30); g.closePath(); g.fillStyle = 'rgba(255,255,255,0.12)'; g.fill();
        }
      });
      break;
    case 'bush':
      sp = bake(-56 * z, -62 * z, 112 * z, 74 * z, s, (g) => {
        g.scale(z, z);
        const L = ['#45a843', '#3d9e4a', '#4fae3c'][v % 3];
        blob(g, [[-24, -18, 22], [22, -18, 22], [0, -30, 26], [-6, -10, 22], [12, -8, 20]], L);
        g.fillStyle = 'rgba(255,255,255,0.18)';
        for (const [x, y, r] of [[-22, -26, 9], [4, -40, 10], [24, -26, 7]] as const) { g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
        if (v === 1) { g.fillStyle = '#ffffff'; for (const [x, y] of [[-18, -14], [10, -30], [24, -12], [-4, -34]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); g.fillStyle = '#ffd34d'; g.beginPath(); g.arc(x, y, 1.6, 0, 7); g.fill(); g.fillStyle = '#ffffff'; } }
        if (v === 2) { g.fillStyle = '#e8364f'; for (const [x, y] of [[-20, -20], [14, -26], [2, -12], [26, -16]]) { g.beginPath(); g.arc(x, y, 4, 0, 7); g.fill(); } }
      });
      break;
    case 'pot':
      sp = bake(-34 * z, -78 * z, 68 * z, 86 * z, s, (g) => {
        g.scale(z, z);
        // leaves + flowers
        g.fillStyle = '#3f9a3a';
        for (const a of [-1.2, -0.6, 0, 0.6, 1.2]) { g.save(); g.translate(0, -36); g.rotate(a); g.beginPath(); g.ellipse(0, -16, 7, 16, 0, 0, 7); g.fill(); stroke(g, 3); g.restore(); }
        const col = ['#ff6b8a', '#ffd34d', '#ff8a3d'][v % 3];
        for (const [x, y] of [[-14, -58], [12, -60], [0, -68], [-4, -50], [18, -46]]) {
          g.fillStyle = col;
          for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; g.beginPath(); g.arc(x + Math.cos(a) * 4.5, y + Math.sin(a) * 4.5, 3.6, 0, 7); g.fill(); }
          g.fillStyle = '#fff3b0'; g.beginPath(); g.arc(x, y, 2.6, 0, 7); g.fill();
        }
        g.beginPath(); g.moveTo(-20, -34); g.lineTo(20, -34); g.lineTo(15, 0); g.lineTo(-15, 0); g.closePath();
        g.fillStyle = '#d8743f'; g.fill(); stroke(g);
        rr(g, -24, -40, 48, 12, 4); g.fillStyle = '#e88752'; g.fill(); stroke(g);
        g.fillStyle = 'rgba(255,255,255,0.22)'; g.fillRect(-12, -26, 5, 20);
      });
      break;
    case 'rock':
      sp = bake(-44 * z, -56 * z, 88 * z, 66 * z, s, (g) => {
        g.scale(z, z);
        g.beginPath(); g.moveTo(-36, 0); g.lineTo(-38, -22); g.lineTo(-22, -42); g.lineTo(6, -48); g.lineTo(30, -36); g.lineTo(38, -12); g.lineTo(30, 2); g.closePath();
        g.fillStyle = ['#9aa3ab', '#a4a09a', '#8f9aa6'][v % 3]; g.fill(); stroke(g);
        g.beginPath(); g.moveTo(-26, -24); g.lineTo(-16, -38); g.lineTo(6, -42); g.lineTo(20, -32); g.lineTo(2, -24); g.closePath();
        g.fillStyle = 'rgba(255,255,255,0.32)'; g.fill();
        g.beginPath(); g.moveTo(6, -16); g.lineTo(18, -8); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 3; g.stroke();
      });
      break;
    case 'crate':
      sp = bake(-36, -66, 72, 76, s, (g) => {
        rr(g, -30, -60, 60, 22, 4); g.fillStyle = '#e0a764'; g.fill(); stroke(g);
        rr(g, -30, -40, 60, 42, 4); g.fillStyle = '#c98a4b'; g.fill(); stroke(g);
        g.beginPath(); g.moveTo(-26, -36); g.lineTo(26, -2); g.moveTo(26, -36); g.lineTo(-26, -2); g.lineWidth = 4; g.strokeStyle = '#9c6431'; g.stroke();
        g.lineWidth = 2; g.strokeStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.moveTo(-28, -52); g.lineTo(28, -52); g.stroke();
      });
      break;
    case 'barrel':
      sp = bake(-30, -66, 60, 74, s, (g) => {
        rr(g, -22, -50, 44, 52, 10); g.fillStyle = '#a8673a'; g.fill(); stroke(g);
        g.fillStyle = '#7f8a92'; g.fillRect(-22, -40, 44, 5); g.fillRect(-22, -14, 44, 5);
        g.beginPath(); g.ellipse(0, -50, 22, 9, 0, 0, 7); g.fillStyle = '#c4834f'; g.fill(); stroke(g);
        g.beginPath(); g.ellipse(0, -50, 13, 4.5, 0, 0, 7); g.strokeStyle = 'rgba(0,0,0,0.25)'; g.lineWidth = 2; g.stroke();
        g.fillStyle = 'rgba(255,255,255,0.18)'; g.fillRect(-14, -42, 5, 40);
      });
      break;
    case 'bench':
      sp = bake(-58, -46, 116, 56, s, (g) => {
        g.fillStyle = '#5a4030';
        for (const x of [-42, 36]) { rr(g, x, -16, 7, 18, 2); g.fill(); stroke(g, 3); }
        rr(g, -52, -40, 104, 12, 4); g.fillStyle = '#d99a52'; g.fill(); stroke(g);
        rr(g, -52, -24, 104, 12, 4); g.fillStyle = '#c4843f'; g.fill(); stroke(g);
      });
      break;
    case 'fenceH':
      sp = bake(-40, -44, 80, 52, s, (g) => {
        rr(g, -36, -32, 72, 8, 3); g.fillStyle = '#f2ead9'; g.fill(); stroke(g, 3);
        rr(g, -36, -18, 72, 8, 3); g.fill(); stroke(g, 3);
        for (const x of [-30, 22]) { rr(g, x, -40, 9, 42, 3); g.fillStyle = '#ffffff'; g.fill(); stroke(g, 3); }
      });
      break;
    case 'fenceV':
      sp = bake(-14, -82, 28, 124, s, (g) => {
        rr(g, -4, -70, 8, 104, 3); g.fillStyle = '#f2ead9'; g.fill(); stroke(g, 3);
        for (const y of [-34, 34]) { rr(g, -6, y - 40, 12, 44, 3); g.fillStyle = '#ffffff'; g.fill(); stroke(g, 3); }
      });
      break;
    case 'stump':
      sp = bake(-30, -46, 60, 54, s, (g) => {
        rr(g, -22, -30, 44, 32, 8); g.fillStyle = '#8a5a35'; g.fill(); stroke(g);
        g.beginPath(); g.ellipse(0, -30, 22, 10, 0, 0, 7); g.fillStyle = '#e2b47a'; g.fill(); stroke(g);
        g.beginPath(); g.ellipse(0, -30, 12, 5, 0, 0, 7); g.strokeStyle = '#a8773f'; g.lineWidth = 2; g.stroke();
      });
      break;
    case 'lamp':
      sp = bake(-22, -112, 44, 120, s, (g) => {
        rr(g, -4, -90, 8, 92, 3); g.fillStyle = '#2f3b45'; g.fill(); stroke(g, 3);
        rr(g, -14, -108, 28, 22, 6); g.fillStyle = '#ffe58a'; g.fill(); stroke(g, 3);
        rr(g, -8, 0 - 6, 16, 8, 3); g.fillStyle = '#2f3b45'; g.fill(); stroke(g, 3);
      });
      break;
    default:
      sp = bake(-1, -1, 2, 2, s, () => {});
  }
  propCache.set(key, sp);
  return sp;
}

/** Visual height (for y-sort shadows) and shadow size of each prop. */
export const PROP_SHADOW: Partial<Record<PropKind, [number, number, number]>> = {
  tree: [8, 64, 26], pine: [4, 50, 20], pot: [2, 24, 9], rock: [2, 40, 14], crate: [4, 36, 12], barrel: [2, 26, 10],
  bench: [4, 54, 10], fenceH: [2, 38, 7], fenceV: [0, 10, 40], stump: [2, 26, 10], lamp: [0, 14, 6], bush: [2, 50, 14],
};

/* --------------------------------------------------------- items + boxes */
/** The mystery box; `grey` is the opened one waiting to refill. */
export function boxSprite(s: number, grey = false): Sprite {
  const key = `box${grey ? 'g' : ''}@${s}`;
  const hit = propCache.get(key);
  if (hit) return hit;
  const c = grey
    ? { top: '#b8bcc8', bot: '#8b909e', lid: '#cdd1db', gold: '#e6e8ee', mark: '#8b909e' }
    : { top: '#8f6bff', bot: '#5b3fd6', lid: '#a78bff', gold: '#ffd23f', mark: '#5b3fd6' };
  const sp = bake(-34, -70, 68, 76, s, (g) => {
    rr(g, -28, -54, 56, 52, 10);
    const gr = g.createLinearGradient(0, -54, 0, -2);
    gr.addColorStop(0, c.top); gr.addColorStop(1, c.bot);
    g.fillStyle = gr; g.fill(); stroke(g, 4.5);
    g.fillStyle = c.gold; g.fillRect(-5, -54, 10, 52);
    g.lineWidth = 2; g.strokeStyle = INK; g.strokeRect(-5, -54, 10, 52);
    rr(g, -31, -62, 62, 14, 6); g.fillStyle = c.lid; g.fill(); stroke(g, 4);
    g.fillStyle = c.gold; g.fillRect(-5, -62, 10, 14); g.strokeRect(-5, -62, 10, 14);
    // bow
    g.fillStyle = c.gold;
    for (const d of [-1, 1]) { g.beginPath(); g.ellipse(d * 11, -66, 10, 6, d * 0.5, 0, 7); g.fill(); stroke(g, 3); }
    // question mark badge
    g.beginPath(); g.arc(0, -30, 13, 0, 7); g.fillStyle = '#ffffff'; g.fill(); stroke(g, 3);
    g.fillStyle = c.mark; g.font = '900 20px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('?', 0, -29);
    g.fillStyle = 'rgba(255,255,255,0.25)'; g.fillRect(-22, -46, 6, 36);
  });
  propCache.set(key, sp);
  return sp;
}

export const GEM_TIERS: { v: number; color: string; hi: string; r: number }[] = [
  { v: 50, color: '#ffc928', hi: '#fff1a8', r: 16 },
  { v: 25, color: '#ff4fa3', hi: '#ffc2e1', r: 14 },
  { v: 10, color: '#a259ff', hi: '#e2c9ff', r: 12.5 },
  { v: 5, color: '#2f8cff', hi: '#bfe0ff', r: 11 },
  { v: 1, color: '#2fd3e8', hi: '#c9f7ff', r: 9.5 },
];
export const gemTier = (v: number) => GEM_TIERS.find((t) => v >= t.v) ?? GEM_TIERS[GEM_TIERS.length - 1];

export function gemSprite(v: number, s: number): Sprite {
  const t = gemTier(v);
  const key = `gem${t.v}@${s}`;
  const hit = propCache.get(key);
  if (hit) return hit;
  const r = t.r;
  const sp = bake(-r - 4, -r * 1.3 - 4, r * 2 + 8, r * 2.3 + 8, s, (g) => {
    g.beginPath(); g.moveTo(0, -r * 1.25); g.lineTo(r, -r * 0.35); g.lineTo(0, r); g.lineTo(-r, -r * 0.35); g.closePath();
    g.fillStyle = t.color; g.fill(); stroke(g, 3);
    g.beginPath(); g.moveTo(0, -r * 1.25); g.lineTo(r * 0.45, -r * 0.35); g.lineTo(0, r * 0.2); g.lineTo(-r * 0.45, -r * 0.35); g.closePath();
    g.fillStyle = t.hi; g.globalAlpha = 0.85; g.fill(); g.globalAlpha = 1;
    g.beginPath(); g.moveTo(-r, -r * 0.35); g.lineTo(r, -r * 0.35); g.strokeStyle = 'rgba(29,42,31,0.45)'; g.lineWidth = 1.5; g.stroke();
  });
  propCache.set(key, sp);
  return sp;
}

/** Weapon held in the hand, drawn pointing to +x from the grip at (0,0). */
export function weaponSprite(w: number, s: number): Sprite {
  const key = `wpn${w}@${s}`;
  const hit = propCache.get(key);
  if (hit) return hit;
  let sp: Sprite;
  switch (w) {
    case 1: // prickler: spiky ball on a stick
      sp = bake(-8, -26, 70, 52, s, (g) => {
        rr(g, -4, -4, 30, 8, 3); g.fillStyle = '#8a5a35'; g.fill(); stroke(g, 3);
        g.fillStyle = '#5fb43a';
        for (let i = 0; i < 10; i++) { const a = (i / 10) * Math.PI * 2; g.beginPath(); g.moveTo(42 + Math.cos(a) * 10, Math.sin(a) * 10); g.lineTo(42 + Math.cos(a + 0.3) * 22, Math.sin(a + 0.3) * 22); g.lineTo(42 + Math.cos(a + 0.6) * 10, Math.sin(a + 0.6) * 10); g.closePath(); g.fill(); stroke(g, 2.5); }
        g.beginPath(); g.arc(42, 0, 13, 0, 7); g.fillStyle = '#78c94a'; g.fill(); stroke(g, 3);
        g.fillStyle = INK; g.beginPath(); g.arc(38, -3, 2, 0, 7); g.arc(46, -3, 2, 0, 7); g.fill();
      });
      break;
    case 2: // bubble blaster
      sp = bake(-8, -22, 64, 40, s, (g) => {
        rr(g, -2, -2, 12, 16, 3); g.fillStyle = '#2f6fd6'; g.fill(); stroke(g, 3);
        rr(g, -4, -12, 46, 14, 6); g.fillStyle = '#4aa3ff'; g.fill(); stroke(g, 3);
        rr(g, 40, -9, 10, 8, 2); g.fillStyle = '#2f6fd6'; g.fill(); stroke(g, 3);
        g.beginPath(); g.arc(14, -16, 7, 0, 7); g.fillStyle = 'rgba(160,230,255,0.9)'; g.fill(); stroke(g, 2.5);
      });
      break;
    case 3: // eraser launcher
      sp = bake(-10, -20, 76, 38, s, (g) => {
        rr(g, -6, -10, 62, 18, 6); g.fillStyle = '#ff7aa8'; g.fill(); stroke(g, 3.5);
        rr(g, 50, -12, 12, 22, 3); g.fillStyle = '#e04f86'; g.fill(); stroke(g, 3);
        rr(g, 8, 4, 10, 12, 3); g.fillStyle = '#c23a6f'; g.fill(); stroke(g, 3);
        g.fillStyle = '#ffffff'; g.fillRect(14, -7, 22, 4);
      });
      break;
    case 4: // highlighter
      sp = bake(-6, -12, 66, 24, s, (g) => {
        rr(g, -2, -7, 44, 14, 5); g.fillStyle = '#d7ff3a'; g.fill(); stroke(g, 3);
        rr(g, 40, -5, 12, 10, 2); g.fillStyle = '#2f3b45'; g.fill(); stroke(g, 3);
        g.beginPath(); g.moveTo(52, -4); g.lineTo(60, 0); g.lineTo(52, 4); g.closePath(); g.fillStyle = '#b8f000'; g.fill(); stroke(g, 2);
      });
      break;
    case 5: // clips
      sp = bake(-6, -16, 56, 30, s, (g) => {
        rr(g, -2, -9, 40, 16, 5); g.fillStyle = '#7f8a92'; g.fill(); stroke(g, 3);
        rr(g, 8, -14, 32, 8, 3); g.fillStyle = '#cfd8dc'; g.fill(); stroke(g, 3);
        g.fillStyle = '#ff5a5a'; g.fillRect(2, -4, 8, 6);
      });
      break;
    case 6: // glitter bomb
      sp = bake(-4, -18, 40, 36, s, (g) => {
        g.beginPath(); g.arc(16, 0, 13, 0, 7); g.fillStyle = '#ff5ce1'; g.fill(); stroke(g, 3);
        g.fillStyle = '#ffffff'; for (const [x, y] of [[12, -5], [20, 3], [18, -7]]) { g.beginPath(); g.arc(x, y, 1.8, 0, 7); g.fill(); }
        rr(g, 10, -18, 10, 7, 2); g.fillStyle = '#2f3b45'; g.fill(); stroke(g, 2);
      });
      break;
    default: // chalk
      sp = bake(-4, -10, 40, 20, s, (g) => {
        rr(g, 0, -5, 30, 10, 4); g.fillStyle = '#ffffff'; g.fill(); stroke(g, 3);
        g.fillStyle = '#d9e7f2'; g.fillRect(4, -2, 22, 3);
      });
  }
  propCache.set(key, sp);
  return sp;
}
