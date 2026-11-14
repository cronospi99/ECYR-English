/* Language Defenders — the haunted set. Everything here is made in code: physically based ground,
   board slabs and cobbles (colour, normal and roughness maps computed from height fields), a
   wrought-iron fence, graves, dead trees, a neon coffin gate where the horde arrives, a repainted
   house with lit windows, mist, embers, bats and lightning. One "mood" per scenario drives the
   lighting, the reflections and the colours. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { environment, type EnvPalette } from './look';
import { LOOK } from './characters/builder';

export interface Mood {
  env: EnvPalette;
  key: [number, number]; rim: [number, number]; fill: [number, number]; hemi: [number, number, number];
  fog: [number, number, number];
  ground: [string, string]; wet: number;
  slab: [string, string]; moss: string; cobble: [string, string];
  mist: number; neon: number; window: number; embers: number; rimChar: number;
  exposure: number; bats: boolean; lightning: boolean;
}

export const MOODS: Record<string, Mood> = {
  dusk: {
    env: { top: 0x2a0f4a, horizon: 0xff5a8a, ground: 0x160a26, key: 0xffc890, rim: 0xff3f9a, fill: 0x6a5aff },
    key: [0xffc49a, 2.1], rim: [0xff3f9a, 2.4], fill: [0x7a6aff, 0.5], hemi: [0xffb0d0, 0x1a0a2e, 0.42],
    fog: [0x6a2460, 18, 50], ground: ['#1c0c2e', '#3a1a4e'], wet: 0.34,
    slab: ['#75608f', '#5d4a78'], moss: '#3fd0b8', cobble: ['#4a3a62', '#7a6a92'],
    mist: 0xff7aa8, neon: 0x39e6ff, window: 0xffb648, embers: 0xffa24a, rimChar: 0xff4fa8, exposure: 1.0, bats: true, lightning: false,
  },
  grave: {
    env: { top: 0x080a24, horizon: 0x2a6a8a, ground: 0x06080f, key: 0xbfefff, rim: 0x35e0d0, fill: 0x5a4aa0 },
    key: [0xb8ecff, 1.9], rim: [0x35e0d0, 2.2], fill: [0x6a5ab8, 0.45], hemi: [0x9ad8f0, 0x0a0c1a, 0.4],
    fog: [0x16304a, 14, 42], ground: ['#0c1220', '#1c2c40'], wet: 0.4,
    slab: ['#56707c', '#435a68'], moss: '#6dffb0', cobble: ['#2c3c4c', '#5c7484'],
    mist: 0x8fe0f0, neon: 0x39e6ff, window: 0xffd27a, embers: 0x9af0ff, rimChar: 0x4ff0e0, exposure: 1.05, bats: true, lightning: true,
  },
  neon: {
    env: { top: 0x04060f, horizon: 0x24308a, ground: 0x04040a, key: 0xa8c0ff, rim: 0xff3fd0, fill: 0x39d9ff },
    key: [0xa8bcff, 1.7], rim: [0xff3fd0, 2.6], fill: [0x39d9ff, 0.6], hemi: [0x8a9aff, 0x06060c, 0.38],
    fog: [0x0c1436, 14, 40], ground: ['#080a16', '#171a30'], wet: 0.62,
    slab: ['#3f4c78', '#30395e'], moss: '#39d9ff', cobble: ['#1c2038', '#44507a'],
    mist: 0x6a7aff, neon: 0xff3fd0, window: 0x39e6ff, embers: 0xff6ad0, rimChar: 0xff4fd8, exposure: 1.1, bats: false, lightning: false,
  },
  toxic: {
    env: { top: 0x1a0733, horizon: 0x7a2ad0, ground: 0x0a0416, key: 0xe0ffc0, rim: 0xb6ff3d, fill: 0x8a4aff },
    key: [0xdcffb8, 1.8], rim: [0xb6ff3d, 2.2], fill: [0x9a5aff, 0.5], hemi: [0xc8a8ff, 0x10061e, 0.42],
    fog: [0x3a1a70, 14, 42], ground: ['#140a26', '#2a1646'], wet: 0.46,
    slab: ['#5e4e8c', '#493a72'], moss: '#b6ff3d', cobble: ['#2e2050', '#5e4e8a'],
    mist: 0xa8ff6a, neon: 0xb6ff3d, window: 0xb6ff3d, embers: 0xb6ff3d, rimChar: 0xb6ff3d, exposure: 1.02, bats: true, lightning: true,
  },
  ruins2: {
    env: { top: 0x5a1a4a, horizon: 0xff8a2a, ground: 0x180a1e, key: 0xffd08a, rim: 0xff5a1e, fill: 0x8a4aff },
    key: [0xffc47a, 2.2], rim: [0xff5a1e, 2.3], fill: [0x8a5aff, 0.5], hemi: [0xffc0a0, 0x1c0a24, 0.44],
    fog: [0xa04a3a, 16, 46], ground: ['#26122c', '#46203e'], wet: 0.26,
    slab: ['#86687a', '#6c5264'], moss: '#ffb23d', cobble: ['#4a2a44', '#8a6474'],
    mist: 0xffa860, neon: 0xff5a8a, window: 0xff7a2a, embers: 0xffb24a, rimChar: 0xff6a3a, exposure: 1.0, bats: true, lightning: false,
  },
};

/* ------------------------------------------------------------------ procedural PBR maps */

function rng(seed: number) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const hex = (c: string): [number, number, number] => { const n = parseInt(c.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const sstep = (a: number, b: number, x: number) => { const t = Math.min(Math.max((x - a) / (b - a), 0), 1); return t * t * (3 - 2 * t); };

/** Tileable value-noise fbm over a size×size grid. */
function fbm(size: number, period: number, octaves: number, seed: number): Float32Array {
  const out = new Float32Array(size * size);
  let amp = 0.5, norm = 0;
  for (let o = 0; o < octaves; o++) {
    const P = period << o, r = rng(seed + o * 101), lat = new Float32Array(P * P);
    for (let i = 0; i < lat.length; i++) lat[i] = r();
    const k = P / size;
    for (let y = 0; y < size; y++) {
      const fy = y * k, y0 = Math.floor(fy), ty = fy - y0, wy = ty * ty * (3 - 2 * ty), ya = (y0 % P) * P, yb = ((y0 + 1) % P) * P;
      for (let x = 0; x < size; x++) {
        const fx = x * k, x0 = Math.floor(fx), tx = fx - x0, wx = tx * tx * (3 - 2 * tx), xa = x0 % P, xb = (x0 + 1) % P;
        const a = lat[ya + xa] + (lat[ya + xb] - lat[ya + xa]) * wx, b = lat[yb + xa] + (lat[yb + xb] - lat[yb + xa]) * wx;
        out[y * size + x] += (a + (b - a) * wy) * amp;
      }
    }
    norm += amp; amp *= 0.5;
  }
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

interface Maps { map: THREE.Texture; normalMap: THREE.Texture; roughnessMap: THREE.Texture }

/** Packs colour, height and roughness arrays into the three textures a standard material needs. */
function pack(w: number, h: number, col: Uint8ClampedArray, height: Float32Array, rough: Float32Array, strength: number, tile: boolean): Maps {
  const tex = (data: Uint8ClampedArray, srgb: boolean) => {
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d')!.putImageData(new ImageData(data as unknown as Uint8ClampedArray<ArrayBuffer>, w, h), 0, 0);
    const t = new THREE.CanvasTexture(c);
    if (srgb) t.colorSpace = THREE.SRGBColorSpace;
    if (tile) t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.anisotropy = 8;
    return t;
  };
  const nrm = new Uint8ClampedArray(w * h * 4), rgh = new Uint8ClampedArray(w * h * 4);
  const at = (x: number, y: number) => height[(tile ? (y + h) % h : Math.min(Math.max(y, 0), h - 1)) * w + (tile ? (x + w) % w : Math.min(Math.max(x, 0), w - 1))];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    let nx = -(at(x + 1, y) - at(x - 1, y)) * strength, ny = (at(x, y + 1) - at(x, y - 1)) * strength;
    const l = Math.sqrt(nx * nx + ny * ny + 1);
    nx /= l; ny /= l;
    nrm[i] = nx * 127.5 + 127.5; nrm[i + 1] = ny * 127.5 + 127.5; nrm[i + 2] = (1 / l) * 127.5 + 127.5; nrm[i + 3] = 255;
    const r = Math.min(Math.max(rough[y * w + x], 0.03), 1) * 255;
    rgh[i] = 255; rgh[i + 1] = r; rgh[i + 2] = 0; rgh[i + 3] = 255;
  }
  return { map: tex(col, true), normalMap: tex(nrm, false), roughnessMap: tex(rgh, false) };
}

/** Wet, cracked earth with standing puddles that mirror the sky. */
function mudMaps(m: Mood, seed: number): Maps {
  const S = 512, base = fbm(S, 4, 6, seed), low = fbm(S, 6, 3, seed + 7), cr = fbm(S, 9, 3, seed + 13), fine = fbm(S, 64, 2, seed + 21);
  const c0 = hex(m.ground[0]), c1 = hex(m.ground[1]);
  const col = new Uint8ClampedArray(S * S * 4), height = new Float32Array(S * S), rough = new Float32Array(S * S);
  for (let i = 0; i < S * S; i++) {
    const pud = sstep(0.47 - m.wet * 0.16, 0.41 - m.wet * 0.16, low[i]);
    const crack = sstep(0.9, 0.985, 1 - Math.abs(cr[i] * 2 - 1)) * (1 - pud);
    const h = base[i] * 0.8 + fine[i] * 0.2;
    height[i] = (h - crack * 0.35) * (1 - pud) + 0.3 * pud;
    const k = (0.6 + h * 0.75) * (1 - crack * 0.6) * (1 - pud * 0.2);
    col[i * 4] = (c0[0] + (c1[0] - c0[0]) * h) * k; col[i * 4 + 1] = (c0[1] + (c1[1] - c0[1]) * h) * k; col[i * 4 + 2] = (c0[2] + (c1[2] - c0[2]) * h) * k; col[i * 4 + 3] = 255;
    rough[i] = (0.96 - h * 0.2) * (1 - pud) + 0.3 * pud;
  }
  return pack(S, S, col, height, rough, 9, true);
}

/** Rounded cobbles with wet joints. */
function cobbleMaps(m: Mood, seed: number): Maps {
  const S = 512, K = 10, r = rng(seed), sites: number[] = [], tone: number[] = [];
  for (let i = 0; i < K * K; i++) { sites.push(((i % K) + 0.2 + r() * 0.6) / K, (Math.floor(i / K) + 0.2 + r() * 0.6) / K); tone.push(r()); }
  const n = fbm(S, 16, 4, seed + 3), c0 = hex(m.cobble[0]), c1 = hex(m.cobble[1]);
  const col = new Uint8ClampedArray(S * S * 4), height = new Float32Array(S * S), rough = new Float32Array(S * S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) {
    const u = x / S, v = y / S, cx = Math.floor(u * K), cy = Math.floor(v * K);
    let f1 = 9, f2 = 9, id = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = (cx + i + K) % K, gy = (cy + j + K) % K, s = gy * K + gx;
      let dx = Math.abs(sites[s * 2] - u), dy = Math.abs(sites[s * 2 + 1] - v);
      if (dx > 0.5) dx = 1 - dx; if (dy > 0.5) dy = 1 - dy;
      const d = Math.sqrt(dx * dx + dy * dy * 1.6);
      if (d < f1) { f2 = f1; f1 = d; id = s; } else if (d < f2) f2 = d;
    }
    const i = y * S + x, edge = sstep(0.002, 0.016, f2 - f1), dome = edge * (0.72 + 0.28 * sstep(0.09, 0, f1)) * (0.85 + n[i] * 0.3);
    height[i] = dome;
    const t = tone[id] * 0.7 + n[i] * 0.3, k = 0.5 + edge * 0.6;
    col[i * 4] = (c0[0] + (c1[0] - c0[0]) * t) * k; col[i * 4 + 1] = (c0[1] + (c1[1] - c0[1]) * t) * k; col[i * 4 + 2] = (c0[2] + (c1[2] - c0[2]) * t) * k; col[i * 4 + 3] = 255;
    rough[i] = edge * (0.55 + n[i] * 0.4) + (1 - edge) * 0.3;
  }
  return pack(S, S, col, height, rough, 7, true);
}

/** The board: worn stone slabs in a checker, bevelled joints, cracks, moss, puddles and an engraved letter each. */
function slabMaps(m: Mood, cols: number, rows: number, seed: number): Maps {
  const CELL = 112, W = cols * CELL, H = rows * CELL, r = rng(seed);
  const paint = (draw: (ctx: CanvasRenderingContext2D) => void) => {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    draw(ctx);
    return ctx.getImageData(0, 0, W, H).data;
  };
  const cracks: number[][] = [], letters: [string, number, number, number][] = [];
  for (let ry = 0; ry < rows; ry++) for (let cx = 0; cx < cols; cx++) {
    letters.push(['ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(r() * 26)], cx * CELL + CELL / 2, ry * CELL + CELL / 2, (r() - 0.5) * 0.3]);
    if (r() < 0.34) {
      const p: number[] = []; let x = cx * CELL + r() * CELL, y = ry * CELL + 6;
      while (y < (ry + 1) * CELL - 6) { p.push(x, y); x += (r() - 0.5) * 26; y += 8 + r() * 16; x = Math.min(Math.max(x, cx * CELL + 6), (cx + 1) * CELL - 6); }
      cracks.push(p);
    }
  }
  const strokeCracks = (ctx: CanvasRenderingContext2D, w: number, style: string) => {
    ctx.strokeStyle = style; ctx.lineWidth = w; ctx.lineJoin = 'round';
    for (const p of cracks) { ctx.beginPath(); ctx.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) ctx.lineTo(p[i], p[i + 1]); ctx.stroke(); }
  };
  const heightPx = paint((ctx) => {
    ctx.fillStyle = '#2a2a2a'; ctx.fillRect(0, 0, W, H);
    for (let ry = 0; ry < rows; ry++) for (let cx = 0; cx < cols; cx++) {
      const x = cx * CELL, y = ry * CELL;
      for (let b = 0; b < 7; b++) { ctx.fillStyle = `rgb(${90 + b * 20},${90 + b * 20},${90 + b * 20})`; ctx.beginPath(); ctx.roundRect(x + 3 + b, y + 3 + b, CELL - 6 - b * 2, CELL - 6 - b * 2, 8); ctx.fill(); }
    }
    ctx.font = `900 ${CELL * 0.52}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [ch, x, y, a] of letters) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.strokeStyle = '#8a8a8a'; ctx.lineWidth = 3; ctx.strokeText(ch, 0, 2); ctx.restore(); }
    strokeCracks(ctx, 3, '#404040');
  });
  const colPx = paint((ctx) => {
    for (let ry = 0; ry < rows; ry++) for (let cx = 0; cx < cols; cx++) {
      const x = cx * CELL, y = ry * CELL, c = hex(m.slab[(ry + cx) % 2]), j = 0.9 + r() * 0.2;
      ctx.fillStyle = `rgb(${c[0] * j},${c[1] * j},${c[2] * j})`; ctx.fillRect(x, y, CELL, CELL);
      const g = ctx.createRadialGradient(x + CELL / 2, y + CELL / 2, CELL * 0.2, x + CELL / 2, y + CELL / 2, CELL * 0.75);
      g.addColorStop(0, 'rgba(255,255,255,0.07)'); g.addColorStop(1, 'rgba(0,0,0,0.3)');
      ctx.fillStyle = g; ctx.fillRect(x, y, CELL, CELL);
      for (let k = 0; k < 3; k++) {            // moss creeping in from the joints
        if (r() < 0.5) continue;
        const mx = x + (r() < 0.5 ? r() * 18 : CELL - r() * 18), my = y + r() * CELL, mr = 8 + r() * 16;
        const mg = ctx.createRadialGradient(mx, my, 0, mx, my, mr);
        mg.addColorStop(0, m.moss + 'aa'); mg.addColorStop(1, m.moss + '00');
        ctx.fillStyle = mg; ctx.fillRect(mx - mr, my - mr, mr * 2, mr * 2);
      }
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineWidth = 5;
    for (let cx = 0; cx <= cols; cx++) { ctx.beginPath(); ctx.moveTo(cx * CELL, 0); ctx.lineTo(cx * CELL, H); ctx.stroke(); }
    for (let ry = 0; ry <= rows; ry++) { ctx.beginPath(); ctx.moveTo(0, ry * CELL); ctx.lineTo(W, ry * CELL); ctx.stroke(); }
    ctx.font = `900 ${CELL * 0.52}px Georgia, serif`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    for (const [ch, x, y, a] of letters) { ctx.save(); ctx.translate(x, y); ctx.rotate(a); ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 3; ctx.strokeText(ch, 0, 2); ctx.restore(); }
    strokeCracks(ctx, 2, 'rgba(0,0,0,0.6)');
  });
  const n = fbm(1024, 32, 4, seed + 5), low = fbm(1024, 5, 3, seed + 9);
  const col = new Uint8ClampedArray(W * H * 4), height = new Float32Array(W * H), rough = new Float32Array(W * H);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const i = y * W + x, ni = (y % 1024) * 1024 + (x % 1024), g = heightPx[i * 4] / 255;
    const wet = sstep(0.5 - m.wet * 0.2, 0.42 - m.wet * 0.2, low[ni]) * sstep(0.5, 0.8, g);
    height[i] = g * 0.8 + n[ni] * 0.2 * (1 - wet);
    const k = (0.8 + n[ni] * 0.4) * (1 - wet * 0.3);
    col[i * 4] = colPx[i * 4] * k; col[i * 4 + 1] = colPx[i * 4 + 1] * k; col[i * 4 + 2] = colPx[i * 4 + 2] * k; col[i * 4 + 3] = 255;
    rough[i] = (0.62 + n[ni] * 0.34) * (1 - wet) + 0.07 * wet;
  }
  // soften the height once so bevels read as bevels, not steps
  const blur = new Float32Array(W * H);
  for (let y = 1; y < H - 1; y++) for (let x = 1; x < W - 1; x++) { const i = y * W + x; blur[i] = (height[i] * 4 + height[i - 1] + height[i + 1] + height[i - W] + height[i + W]) / 8; }
  return pack(W, H, col, blur, rough, 5, false);
}

/* ------------------------------------------------------------------ props */

const soft = (() => {
  let t: THREE.CanvasTexture | null = null;
  return () => {
    if (t) return t;
    const c = document.createElement('canvas'); c.width = c.height = 128;
    const ctx = c.getContext('2d')!, g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, 128, 128);
    return (t = new THREE.CanvasTexture(c));
  };
})();

function batTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas'); c.width = 128; c.height = 64;
  const x = c.getContext('2d')!;
  x.fillStyle = '#0a0412';
  x.beginPath();
  x.moveTo(64, 26); x.quadraticCurveTo(50, 8, 30, 14); x.quadraticCurveTo(14, 16, 2, 30); x.quadraticCurveTo(14, 26, 20, 38);
  x.quadraticCurveTo(28, 30, 36, 40); x.quadraticCurveTo(44, 32, 54, 42); x.quadraticCurveTo(60, 50, 64, 46);
  x.quadraticCurveTo(68, 50, 74, 42); x.quadraticCurveTo(84, 32, 92, 40); x.quadraticCurveTo(100, 30, 108, 38);
  x.quadraticCurveTo(114, 26, 126, 30); x.quadraticCurveTo(114, 16, 98, 14); x.quadraticCurveTo(78, 8, 64, 26);
  x.fill();
  x.beginPath(); x.moveTo(58, 26); x.lineTo(60, 16); x.lineTo(64, 24); x.lineTo(68, 16); x.lineTo(70, 26); x.fill();
  return new THREE.CanvasTexture(c);
}

function ironFence(x0: number, x1: number, z: number, r: () => number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const bar = new THREE.CylinderGeometry(0.02, 0.022, 1, 6), tip = new THREE.ConeGeometry(0.045, 0.16, 4), post = new THREE.BoxGeometry(0.11, 1.25, 0.11), ball = new THREE.SphereGeometry(0.085, 10, 8);
  const mat4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
  const put = (g: THREE.BufferGeometry, x: number, y: number, zz: number, sy = 1, rz = 0, rx = 0) => {
    mat4.compose(new THREE.Vector3(x, y, zz), q.setFromEuler(e.set(rx, 0, rz)), new THREE.Vector3(1, sy, 1));
    parts.push(g.clone().applyMatrix4(mat4));
  };
  let i = 0;
  for (let x = x0; x <= x1; x += 0.17, i++) {
    if (i % 9 === 0) { put(post, x, 0.62, z); put(ball, x, 1.3, z); continue; }
    if (r() < 0.06) continue;                       // a missing bar here and there
    const h = 0.86 + (i % 2) * 0.1 + r() * 0.04, lean = (r() - 0.5) * 0.09;
    put(bar, x, h / 2, z, h, lean);
    put(tip, x + Math.sin(-lean) * h, h + 0.07, z, 1, lean);
  }
  for (const y of [0.22, 0.78]) {
    const rail = new THREE.BoxGeometry(x1 - x0, 0.045, 0.035);
    rail.translate((x0 + x1) / 2, y, z);
    parts.push(rail);
  }
  const g = mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false)!;
  parts.forEach((p) => p.dispose());
  return g;
}

function tombstone(kind: number, r: () => number): THREE.BufferGeometry {
  if (kind === 2) {                                   // cross
    const a = new THREE.BoxGeometry(0.16, 1.0, 0.13).translate(0, 0.5, 0), b = new THREE.BoxGeometry(0.56, 0.15, 0.13).translate(0, 0.68, 0), c = new THREE.BoxGeometry(0.42, 0.12, 0.3).translate(0, 0.06, 0);
    return mergeGeometries([a, b, c].map((g) => g.toNonIndexed()), false)!;
  }
  const w = 0.5 + r() * 0.16, h = 0.62 + r() * 0.3, s = new THREE.Shape();
  s.moveTo(-w / 2, 0); s.lineTo(-w / 2, h);
  if (kind === 0) s.absarc(0, h, w / 2, Math.PI, 0, true);
  else { s.lineTo(-w / 4, h + 0.16); s.lineTo(w / 4, h + 0.16); s.lineTo(w / 2, h); }
  s.lineTo(w / 2, 0); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.13, bevelEnabled: true, bevelSize: 0.022, bevelThickness: 0.022, bevelSegments: 2, curveSegments: 10 });
  g.translate(0, 0, -0.065);
  return g;
}

function deadTree(r: () => number, height: number): THREE.BufferGeometry {
  const parts: THREE.BufferGeometry[] = [];
  const grow = (from: THREE.Vector3, dir: THREE.Vector3, len: number, rad: number, depth: number) => {
    const to = from.clone().addScaledVector(dir, len);
    const g = new THREE.CylinderGeometry(rad * 0.62, rad, len, 6, 1);
    g.translate(0, len / 2, 0);
    g.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir));
    g.translate(from.x, from.y, from.z);
    parts.push(g.toNonIndexed());
    if (depth <= 0) return;
    const n = depth > 2 ? 2 : 2 + (r() < 0.5 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const d = dir.clone().add(new THREE.Vector3((r() - 0.5) * 1.5, r() * 0.5 - 0.05, (r() - 0.5) * 0.7)).normalize();
      grow(to, d, len * (0.6 + r() * 0.2), rad * 0.62, depth - 1);
    }
  };
  grow(new THREE.Vector3(), new THREE.Vector3((r() - 0.5) * 0.25, 1, 0).normalize(), height * 0.36, height * 0.05, 4);
  const g = mergeGeometries(parts, false)!;
  parts.forEach((p) => p.dispose());
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------------ the set */

interface Hooks {
  ground: THREE.Mesh; board: THREE.Mesh; stones: THREE.Mesh[]; fences: THREE.Object3D[]; clouds: THREE.Object3D[];
  hemi: THREE.HemisphereLight; sun: THREE.DirectionalLight; wall: THREE.Mesh;
}

export class Scenery {
  readonly group = new THREE.Group();
  private mats = new Map<string, { mud: Maps; cobble: Maps; slab: Maps; env: THREE.Texture }>();
  private original: { ground: THREE.Material; board: THREE.Material; stones: THREE.Material[] };
  private pbr: { ground: THREE.MeshStandardMaterial; board: THREE.MeshStandardMaterial; stone: THREE.MeshStandardMaterial };
  private rim = new THREE.DirectionalLight(0xffffff, 0);
  private fill = new THREE.DirectionalLight(0xffffff, 0);
  private gateLight = new THREE.PointLight(0xffffff, 0, 9, 1.6);
  private mood: Mood | null = null;
  private veil: THREE.ShaderMaterial | null = null;
  private gate: { pos: THREE.Vector3; color: number } | null = null;
  private gatePulse = 0;
  private mist: THREE.Sprite[] = [];
  private bats: THREE.Sprite[] = [];
  private embers: THREE.Points | null = null;
  private neon: THREE.MeshBasicMaterial[] = [];
  private house: THREE.MeshStandardMaterial[] = [];
  private t = 0;
  private flash = 0;
  private spill: THREE.PointLight | null = null;
  private nextFlash = 6;
  active = false;

  constructor(private scene: THREE.Scene, private renderer: THREE.WebGLRenderer, private cols: number, private rows: number, private h: Hooks) {
    this.original = { ground: h.ground.material as THREE.Material, board: h.board.material as THREE.Material, stones: h.stones.map((s) => s.material as THREE.Material) };
    this.pbr = {
      ground: new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, envMapIntensity: 1.25 }),
      board: new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, envMapIntensity: 1.1 }),
      stone: new THREE.MeshStandardMaterial({ roughness: 1, metalness: 0, envMapIntensity: 1.1 }),
    };
    this.rim.position.set(-5, 6, -11);
    this.fill.position.set(-6, 3, 8);
    scene.add(this.rim, this.fill, this.group);
  }

  /** Dresses the set for a painted scenario; any other id restores the classic look. */
  apply(id: string): void {
    this.clear();
    const m = MOODS[id];
    this.active = !!m;
    this.mood = m ?? null;
    const h = this.h;
    for (const f of h.fences) f.visible = !m;
    for (const c of h.clouds) c.visible = !m;
    if (!m) {
      h.ground.material = this.original.ground; h.board.material = this.original.board;
      h.stones.forEach((s, i) => (s.material = this.original.stones[i]));
      this.rim.intensity = this.fill.intensity = 0;
      this.scene.environment = null;
      this.renderer.toneMappingExposure = 1.05;
      LOOK.rimK.value = 0;
      return;
    }
    let set = this.mats.get(id);
    if (!set) {
      set = { mud: mudMaps(m, 11), cobble: cobbleMaps(m, 23), slab: slabMaps(m, this.cols, this.rows, 37), env: environment(this.renderer, m.env) };
      this.mats.set(id, set);
    }
    const use = (mat: THREE.MeshStandardMaterial, maps: Maps, rx: number, ry: number, ns: number) => {
      mat.map = maps.map; mat.normalMap = maps.normalMap; mat.roughnessMap = maps.roughnessMap;
      mat.normalScale.set(ns, ns);
      for (const t of [maps.map, maps.normalMap, maps.roughnessMap]) { t.repeat.set(rx, ry); t.needsUpdate = true; }
      mat.needsUpdate = true;
    };
    use(this.pbr.ground, set.mud, 12, 7.3, 1.2);
    use(this.pbr.board, set.slab, 1, 1, 1.5);
    use(this.pbr.stone, set.cobble, 1, 1, 1.3);
    h.ground.material = this.pbr.ground; h.board.material = this.pbr.board;
    h.stones.forEach((s) => {
      // one material per piece so the cobbles keep their size on long and short strips
      const p = (s.geometry as THREE.BoxGeometry).parameters, mat = this.pbr.stone.clone();
      mat.map = set!.cobble.map.clone(); mat.normalMap = set!.cobble.normalMap.clone(); mat.roughnessMap = set!.cobble.roughnessMap.clone();
      for (const t of [mat.map, mat.normalMap, mat.roughnessMap]) { t!.repeat.set(p.width / 2.6, p.depth / 2.6); t!.needsUpdate = true; }
      s.material = mat;
    });
    this.scene.environment = set.env;
    this.scene.environmentIntensity = 0.55;
    this.renderer.toneMappingExposure = m.exposure;
    h.hemi.color.set(m.hemi[0]); h.hemi.groundColor.set(m.hemi[1]); h.hemi.intensity = m.hemi[2];
    h.sun.color.set(m.key[0]); h.sun.intensity = m.key[1];
    this.rim.color.set(m.rim[0]); this.rim.intensity = m.rim[1];
    this.fill.color.set(m.fill[0]); this.fill.intensity = m.fill[1];
    const fog = this.scene.fog as THREE.Fog | null;
    if (fog) { fog.color.set(m.fog[0]); fog.near = m.fog[1]; fog.far = m.fog[2]; }
    LOOK.rim.value.set(m.rimChar); LOOK.rimK.value = 0.5;
    LOOK.aoTint.value.set(m.env.ground).lerp(new THREE.Color(m.rimChar), 0.12);
    this.build(m);
  }

  private clear(): void {
    for (const c of [...this.group.children]) {
      c.traverse((o) => {
        const ms = o as THREE.Mesh;
        ms.geometry?.dispose?.();
        const mat = ms.material as THREE.Material | THREE.Material[] | undefined;
        (Array.isArray(mat) ? mat : mat ? [mat] : []).forEach((x) => x.dispose());
      });
      this.group.remove(c);
    }
    for (const s of this.h.stones) if (s.material !== this.original.stones[this.h.stones.indexOf(s)] && (s.material as THREE.Material).dispose) {
      const mm = s.material as THREE.MeshStandardMaterial;
      mm.map?.dispose(); mm.normalMap?.dispose(); mm.roughnessMap?.dispose(); mm.dispose();
    }
    this.mist = []; this.bats = []; this.embers = null; this.neon = []; this.house = []; this.spill = null;
  }

  private build(m: Mood): void {
    const r = rng(77), g = this.group, north = -(this.rows / 2) - 0.85;
    const iron = new THREE.MeshStandardMaterial({ color: 0x241a30, metalness: 0.85, roughness: 0.42, envMapIntensity: 1.6 });
    const stone = new THREE.MeshStandardMaterial({ color: new THREE.Color(m.cobble[1]).multiplyScalar(0.9), roughness: 0.85, normalMap: this.pbr.ground.normalMap, normalScale: new THREE.Vector2(0.6, 0.6) });
    const bark = new THREE.MeshStandardMaterial({ color: 0x140a1e, roughness: 0.95 });
    const add = (mesh: THREE.Object3D, shadow = true) => { mesh.traverse((o) => { o.castShadow = shadow; o.receiveShadow = shadow; }); g.add(mesh); return mesh; };

    add(new THREE.Mesh(ironFence(-13, 14, north, r), iron));

    // dark rise behind the fence so the graves and trees stand on something
    const back = new THREE.Mesh(new THREE.PlaneGeometry(60, 2.2), this.pbr.ground);
    back.rotation.x = -Math.PI / 2; back.position.set(0, -0.015, north - 1.0);
    add(back);

    const graves: [number, number, number][] = [[-10.2, north - 0.6, 0], [-6.4, north - 0.75, 1], [-3.1, north - 0.55, 2], [-0.6, north - 0.8, 0], [2.6, north - 0.6, 1], [5.4, north - 0.75, 2], [8.4, north - 0.6, 0], [10.6, north - 0.9, 1],
      [8.9, -1.6, 0], [9.6, 0.4, 2], [8.7, 2.3, 1], [-9.6, 3.0, 0]];
    for (const [x, z, kind] of graves) {
      const t = new THREE.Mesh(tombstone(kind, r), stone);
      t.position.set(x + (r() - 0.5) * 0.4, -0.04, z);
      t.rotation.set((r() - 0.5) * 0.14, (r() - 0.5) * 0.5 + (x > 8 ? -0.7 : 0), (r() - 0.5) * 0.2);
      t.scale.setScalar(0.85 + r() * 0.4);
      add(t);
    }
    for (const [x, hgt] of [[-11.2, 4.6], [-4.6, 3.4], [1.1, 4.2], [6.8, 3.6], [11.4, 4.8]] as const) {
      const t = new THREE.Mesh(deadTree(r, hgt), bark);
      t.position.set(x, 0, north - 1.2 - r() * 0.5);
      t.rotation.y = r() * 6;
      add(t);
    }

    /* neon coffin gate: where the horde walks in */
    const gate = new THREE.Group(), neon = new THREE.MeshBasicMaterial({ color: new THREE.Color(m.neon).multiplyScalar(2.6), toneMapped: false });
    this.neon.push(neon);
    const pts: [number, number][] = [[-0.52, 3.3], [0.52, 3.3], [1.0, 2.45], [0.56, 0.06], [-0.56, 0.06], [-1.0, 2.45]];
    pts.forEach((p, i) => {
      const q = pts[(i + 1) % pts.length], a = new THREE.Vector3(p[0], p[1], 0), b = new THREE.Vector3(q[0], q[1], 0), len = a.distanceTo(b);
      const tube = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 10), neon);
      tube.position.copy(a).add(b).multiplyScalar(0.5);
      tube.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      const joint = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), neon);
      joint.position.copy(a);
      gate.add(tube, joint);
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.14, 0.09), iron);
      clamp.position.copy(tube.position); clamp.quaternion.copy(tube.quaternion);
      gate.add(clamp);
    });
    const shape = new THREE.Shape(pts.map((p) => new THREE.Vector2(p[0], p[1])));
    // the mouth of the coffin is a sheet of slow neon liquid; it boils over when someone climbs out
    this.veil = new THREE.ShaderMaterial({
      transparent: true, toneMapped: false, fog: false,
      uniforms: { t: { value: 0 }, pulse: { value: 0 }, col: { value: new THREE.Color(m.neon) } },
      vertexShader: 'varying vec2 p; void main(){ p = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
      fragmentShader: `varying vec2 p; uniform float t, pulse; uniform vec3 col;
        float h(vec2 v){ return fract(sin(dot(v, vec2(127.1, 311.7))) * 43758.5453); }
        float n(vec2 v){ vec2 i = floor(v), f = fract(v); f = f*f*(3.0-2.0*f); return mix(mix(h(i), h(i+vec2(1,0)), f.x), mix(h(i+vec2(0,1)), h(i+vec2(1,1)), f.x), f.y); }
        void main(){
          vec2 q = p * vec2(1.6, 1.1);
          float w = n(q * 1.7 + vec2(0.0, -t * 0.5)) + 0.5 * n(q * 3.9 + vec2(t * 0.3, -t * 0.9));
          float bands = smoothstep(0.62, 0.9, sin((q.y + w * 0.9) * 5.0 - t * 2.2) * 0.5 + 0.5);
          float drips = smoothstep(0.8, 1.0, n(vec2(p.x * 9.0, p.y * 0.9 + t * 1.3))) * smoothstep(3.3, 1.2, p.y);
          float lum = 0.10 + bands * 0.55 + drips * 0.9 + pulse * (0.9 + w * 0.8);
          gl_FragColor = vec4(mix(vec3(0.02, 0.008, 0.04), col * 2.2, clamp(lum, 0.0, 1.6)), 0.92);
        }`,
    });
    const veil = new THREE.Mesh(new THREE.ShapeGeometry(shape), this.veil);
    veil.position.z = -0.06;
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: m.neon, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }));
    glow.position.set(0, 1.7, -0.1); glow.scale.set(5, 6, 1);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.16, 0.5), stone);
    frame.position.y = 0.02;
    gate.add(veil, glow, frame);
    gate.position.set(this.cols / 2 + 2.35, 0, -0.4);
    this.gate = { pos: new THREE.Vector3(this.cols / 2 + 2.05, 0, -0.25), color: m.neon };
    gate.rotation.y = -Math.PI / 2 + 0.62;
    gate.scale.setScalar(0.86);
    g.add(gate);
    this.gateLight.color.set(m.neon); this.gateLight.intensity = 26; this.gateLight.position.set(this.cols / 2 + 1.6, 1.5, 0);
    g.add(this.gateLight);

    /* mist, embers, bats */
    for (let i = 0; i < 14; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: m.mist, transparent: true, opacity: 0.07 + r() * 0.07, depthWrite: false, fog: false }));
      const back = i < 8;
      s.position.set(-13 + r() * 26, back ? 0.5 + r() * 0.9 : 0.25 + r() * 0.4, back ? north - 0.4 - r() * 1.2 : (r() < 0.5 ? this.rows / 2 + 0.9 + r() : -6.5 + (r() < 0.5 ? 0 : 13.5)));
      const k = 5 + r() * 5; s.scale.set(k, k * (0.28 + r() * 0.16), 1);
      s.userData.v = (0.12 + r() * 0.22) * (r() < 0.5 ? -1 : 1);
      g.add(s); this.mist.push(s);
    }
    const N = 110, pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) { pos[i * 3] = -12 + r() * 24; pos[i * 3 + 1] = r() * 5.5; pos[i * 3 + 2] = -5 + r() * 9; }
    const eg = new THREE.BufferGeometry(); eg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    this.embers = new THREE.Points(eg, new THREE.PointsMaterial({ map: soft(), color: new THREE.Color(m.embers).multiplyScalar(1.8), size: 0.085, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, fog: false }));
    g.add(this.embers);
    if (m.bats) {
      const tex = batTexture();
      for (let i = 0; i < 7; i++) {
        const b = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, fog: false, depthWrite: false }));
        b.userData = { x: -16 + r() * 32, y: 4.2 + r() * 3.4, v: (1.2 + r() * 1.6) * (r() < 0.5 ? -1 : 1), s: 0.34 + r() * 0.3, p: r() * 6 };
        b.position.z = -4.9;
        g.add(b); this.bats.push(b);
      }
    }
  }

  /** Repaints the farmhouse's own texture: weathered boards, dead shrubs, windows lit from inside. */
  haunt(house: THREE.Object3D): void {
    const m = this.mood;
    if (!m) return;
    house.traverse((o) => {
      const mesh = o as THREE.Mesh, src = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!mesh.isMesh || !src?.map?.image) return;
      const img = src.map.image as HTMLImageElement, S = 1024, k = S / 2048;
      const base = document.createElement('canvas'), glow = document.createElement('canvas');
      base.width = base.height = glow.width = glow.height = S;
      const b = base.getContext('2d')!, e = glow.getContext('2d')!;
      b.drawImage(img, 0, 0, S, S);
      // grade the whole atlas towards a cold, dirty violet
      b.globalCompositeOperation = 'multiply'; b.fillStyle = '#7a6a96'; b.fillRect(0, 0, S, S);
      b.globalCompositeOperation = 'source-over';
      const r = rng(5);
      for (let i = 0; i < 260; i++) {              // rain streaks and grime
        const x = r() * S, y = r() * S, len = 20 + r() * 90;
        const gr = b.createLinearGradient(0, y, 0, y + len);
        gr.addColorStop(0, 'rgba(10,4,20,0.28)'); gr.addColorStop(1, 'rgba(10,4,20,0)');
        b.fillStyle = gr; b.fillRect(x, y, 1.5 + r() * 3, len);
      }
      const rect = (x: number, y: number, w: number, h: number) => [x * k, y * k, w * k, h * k] as const;
      b.fillStyle = 'rgba(8,4,16,0.82)'; b.fillRect(...rect(287, 553, 212, 180));       // shutters: charred
      b.fillStyle = 'rgba(30,10,36,0.78)'; b.fillRect(...rect(0, 707, 262, 205));       // shrubs: dead
      e.fillStyle = '#000'; e.fillRect(0, 0, S, S);
      for (const [x, y, w, h] of [rect(0, 557, 150, 150), rect(645, 590, 56, 40)]) {    // window and door glass
        const c = '#' + new THREE.Color(m.window).getHexString();
        b.fillStyle = c; b.fillRect(x, y, w, h);
        const gr = e.createLinearGradient(0, y, 0, y + h);
        gr.addColorStop(0, '#ffffff'); gr.addColorStop(1, '#8a8a8a');
        e.fillStyle = gr; e.fillRect(x, y, w, h);
      }
      const mat = src.clone();
      const map = new THREE.CanvasTexture(base), em = new THREE.CanvasTexture(glow);
      map.flipY = em.flipY = false; map.colorSpace = THREE.SRGBColorSpace; em.colorSpace = THREE.SRGBColorSpace;
      map.wrapS = map.wrapT = em.wrapS = em.wrapT = THREE.RepeatWrapping;
      mat.map = map; mat.emissiveMap = em; mat.emissive = new THREE.Color(m.window); mat.emissiveIntensity = 2.4;
      mat.roughness = 0.9; mat.color.set(0xffffff);
      mesh.material = mat;
      this.house.push(mat);
    });
    // light spilling from the house onto the lawn
    if (this.spill) this.group.remove(this.spill);
    this.spill = new THREE.PointLight(m.window, 9, 7, 1.7);
    this.spill.position.set(-5.6, 1.2, 0.4);
    this.group.add(this.spill);
  }

  /** Where the horde climbs out (null when the classic set is on). */
  gateMouth(): { pos: THREE.Vector3; color: number } | null { return this.active && this.gate ? { pos: this.gate.pos.clone(), color: this.gate.color } : null; }
  /** The liquid in the gate boils over for a moment. */
  pulseGate(): void { this.gatePulse = 1; }

  update(dt: number): void {
    const m = this.mood;
    if (!m) return;
    this.t += dt;
    const t = this.t;
    for (const s of this.mist) { s.position.x += s.userData.v * dt; if (s.position.x > 15) s.position.x = -15; else if (s.position.x < -15) s.position.x = 15; }
    if (this.embers) {
      const p = this.embers.geometry.attributes.position as THREE.BufferAttribute;
      for (let i = 0; i < p.count; i++) {
        let y = p.getY(i) + dt * (0.22 + (i % 5) * 0.06);
        if (y > 5.8) y = 0;
        p.setY(i, y); p.setX(i, p.getX(i) + Math.sin(t * 0.8 + i) * dt * 0.12);
      }
      p.needsUpdate = true;
    }
    for (const b of this.bats) {
      const u = b.userData;
      u.x += u.v * dt;
      if (u.x > 17) u.x = -17; else if (u.x < -17) u.x = 17;
      b.position.x = u.x; b.position.y = u.y + Math.sin(t * 1.3 + u.p) * 0.4;
      b.scale.set(u.s * 2, u.s * (0.45 + Math.abs(Math.sin(t * 11 + u.p)) * 0.75), 1);
    }
    // neon hum and the odd flicker
    const hum = 0.9 + Math.sin(t * 31) * 0.04 + (Math.sin(t * 2.3) > 0.985 ? -0.5 : 0);
    this.gatePulse = Math.max(0, this.gatePulse - dt * 1.6);
    this.gateLight.intensity = 26 * hum + this.gatePulse * 60;
    if (this.veil) { this.veil.uniforms.t!.value += dt; this.veil.uniforms.pulse!.value = this.gatePulse; }
    for (const n of this.neon) n.color.set(m.neon).multiplyScalar(2.6 * hum);
    for (const hm of this.house) hm.emissiveIntensity = 2.2 + Math.sin(t * 7.3) * 0.15 + (Math.sin(t * 1.7 + 2) > 0.97 ? -1.2 : 0);
    if (m.lightning) {
      this.nextFlash -= dt;
      if (this.nextFlash <= 0) { this.flash = 1; this.nextFlash = 7 + Math.random() * 12; }
      if (this.flash > 0) {
        this.flash = Math.max(0, this.flash - dt * 2.6);
        const f = this.flash > 0.72 || (this.flash > 0.3 && this.flash < 0.48) ? 1 : 0;
        this.h.hemi.intensity = m.hemi[2] + f * 1.5;
        (this.h.wall.material as THREE.MeshBasicMaterial).color.setScalar(1 + f * 0.7);
      }
    }
  }

  dispose(): void {
    this.clear();
    for (const s of this.mats.values()) { for (const mp of [s.mud, s.cobble, s.slab]) { mp.map.dispose(); mp.normalMap.dispose(); mp.roughnessMap.dispose(); } s.env.dispose(); }
    this.mats.clear();
  }
}
