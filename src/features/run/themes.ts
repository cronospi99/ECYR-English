/* English Run — the worlds. Each theme brings its sky, light, fog, the scenery beside the track
   (30 m chunks), the floor (a road, or lane tiles that can have gaps to jump), the obstacles
   (vehicle, low barrier, high barrier, ramp) and extras (sea, bloom). All geometry is built here
   with merged primitives and vertex colours; parts that glow go in a separate `glow` geometry. */
import * as THREE from 'three';
import {
  BUS, CHUNK, Geo, LANE, RAMP_L, U, busGeo, chunkGeo, headlightGeo, highBarrierGeo, horizonCard, lowBarrierGeo, pick, rampGeo, rnd, shade, skyline,
  type SkyColors,
} from './gfx';

export type ThemeId = 'city' | 'beach' | 'roofs' | 'neon';
/** Geometry for the normal (lit) material, plus optional glowing parts. */
export interface Parts { world: THREE.BufferGeometry; glow?: THREE.BufferGeometry; lights?: THREE.BufferGeometry }
export interface Theme {
  id: ThemeId;
  name: string;
  sky: SkyColors;
  /** Sky colour, ground colour, intensity. */
  hemi: [number, number, number];
  /** Sun colour, intensity. */
  sun: [number, number];
  env: number;
  exposure: number;
  fog: [number, number];
  clouds: number;
  cloudTint: number;
  horizon: () => THREE.Object3D;
  chunk: (variant: number) => Parts;
  /** Lane floor tiles (TILE m long); none = the road is part of the chunk. */
  tile?: (lane: number) => Parts;
  /** A plank across a gap (rooftops). */
  plank?: () => THREE.BufferGeometry;
  gaps: 'none' | 'lanes' | 'full';
  oncoming: boolean;
  vehicle: (kind: 0 | 1) => Parts;
  low: () => Parts;
  high: () => Parts;
  ramp: () => Parts;
  /** Sea colour (an animated water plane under the boardwalk). */
  water?: number;
  bloom?: boolean;
}
export const TILE = 2;

const build = (g: Geo) => g.build();
const opt = (g: Geo) => (g.parts.length ? g.build() : undefined);

/** A ramp up to the roof height, in any colours. */
function rampIn(top: number, tread: number, edge: number, glowEdge = false): Parts {
  const W = 1.8, L = RAMP_L, H = BUS.H;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const A = v(-W / 2, 0, 0), B = v(W / 2, 0, 0), C = v(W / 2, H, -L), D = v(-W / 2, H, -L), E = v(-W / 2, 0, -L), F = v(W / 2, 0, -L);
  const tri = new THREE.BufferGeometry().setFromPoints([A, B, C, A, C, D, B, F, C, A, D, E, E, D, C, E, C, F]);
  tri.computeVertexNormals();
  const g = new Geo(), gl = new Geo();
  g.raw(tri, top);
  for (let i = 1; i < 8; i++) { const t = i / 8; (glowEdge ? gl : g).add(U.box, tread, 0, H * t + 0.03, -L * t, W * 0.9, 0.05, 0.1, Math.atan2(H, L), 0, 0); }
  if (glowEdge) gl.boost = 2.2;
  for (const s of [-1, 1]) (glowEdge ? gl : g).add(U.box, edge, s * (W / 2 - 0.06), H / 2 + 0.05, -L / 2, 0.1, 0.07, Math.hypot(H, L), Math.atan2(H, L), 0, 0);
  return { world: build(g), glow: opt(gl) };
}

/* ================================================================ CITY */
const city: Theme = {
  id: 'city', name: 'Ciudad',
  sky: { top: 0x3b86f0, mid: 0x8cc4ff, horizon: 0xe4f2ff, fog: 0xd9ecff, sun: [0.35, 0.32, -1] },
  hemi: [0xd8ecff, 0x8d8266, 1.0], sun: [0xfff1d6, 2.6], env: 0.55, exposure: 1.05, fog: [40, 190], clouds: 9, cloudTint: 0xffffff,
  horizon: skyline,
  chunk: (v) => ({ world: chunkGeo(v) }),
  gaps: 'none', oncoming: true,
  vehicle: (k) => ({ world: busGeo(k), lights: headlightGeo() }),
  low: () => ({ world: lowBarrierGeo() }),
  high: () => ({ world: highBarrierGeo() }),
  ramp: () => ({ world: rampGeo() }),
};

/* ================================================================ BEACH */
const WOOD = [0xc8935a, 0xbb8450, 0xd3a06a, 0xc28a52];
function palm(g: Geo, x: number, y: number, z: number) {
  let px = x, py = y, lean = (rnd() - 0.5) * 0.5;
  for (let i = 0; i < 7; i++) { g.add(U.cyl, i % 2 ? 0x9a6b3f : 0x8a5d34, px, py + 0.45, z, 0.2 - i * 0.015, 0.9, 0.2 - i * 0.015, 0, 0, -lean); px += Math.sin(lean) * 0.9; py += Math.cos(lean) * 0.9; lean *= 1.15; }
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    g.add(U.box, i % 2 ? 0x3f9b46 : 0x52b257, px + Math.cos(a) * 1.3, py - 0.35, z + Math.sin(a) * 1.3, 2.8, 0.06, 0.5, 0, -a, -0.45);
  }
  for (let i = 0; i < 3; i++) g.add(U.ball, 0x6b4a2a, px + (i - 1) * 0.22, py - 0.3, z + 0.15, 0.16, 0.16, 0.16);
}
function umbrella(g: Geo, x: number, y: number, z: number) {
  const c = pick([0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xff7043]);
  g.cyl(x, y, z, 0.05, 2.3, 0xf5f5f5);
  const cone = new THREE.ConeGeometry(1.4, 0.55, 10);
  g.add(cone, c, x, y + 2.35, z, 1, 1, 1);
  g.add(cone, 0xffffff, x, y + 2.36, z, 0.5, 1.02, 0.5);
  g.box(x + 0.9, y, z, 0.9, 0.04, 1.8, pick([0xff8a80, 0x80d8ff, 0xffe57f, 0xb9f6ca])); // towel
}
function hut(g: Geo, x: number, y: number, z: number) {
  const c = pick([0xff8a65, 0x4fc3f7, 0xfff176, 0x81c784, 0xf48fb1]);
  g.box(x, y, z, 2.6, 2.3, 2.4, c);
  g.add(new THREE.CylinderGeometry(1, 1, 1, 3), 0xffffff, x, y + 2.75, z, 1.6, 2.6, 1.4, Math.PI / 2, 0, Math.PI / 2);
  g.box(x + Math.sign(-x) * 1.31, y, z, 0.05, 1.7, 0.9, 0x6d4c41);
}
function beachChunk(variant: number): Parts {
  const g = new Geo();
  const L = CHUNK;
  // left: wet sand by the water, then dry sand with small dunes
  g.box(-14, -2.6, -L / 2, 16, 0.6, L, 0xd9c08f);
  g.box(-42, -2.6, -L / 2, 40, 1.5, L, 0xf2dfae);
  for (let i = 0; i < 4; i++) g.blob(-26 - rnd() * 30, -1.3, -rnd() * L, 2 + rnd() * 3, 0xeedaa6, 0.35);
  for (let z = -3 - rnd() * 4; z > -L; z -= 7 + rnd() * 6) {
    const r = rnd();
    if (r < 0.4) palm(g, -23 - rnd() * 12, -1.1, z);
    else if (r < 0.75) umbrella(g, -24 - rnd() * 10, -1.1, z);
    else hut(g, -30 - rnd() * 6, -1.1, z);
  }
  if (variant % 3 === 0) { // lifeguard tower
    const x = -19, z = -15;
    for (const dx of [-0.8, 0.8]) for (const dz of [-0.8, 0.8]) g.cyl(x + dx, -1.1, z + dz, 0.09, 3, 0xfafafa);
    g.box(x, 1.9, z, 2.2, 1.6, 2.2, 0xe53935);
    g.box(x, 3.5, z, 2.6, 0.2, 2.6, 0xfafafa);
  }
  // right: open sea with rocks, buoys and a sailboat far out
  for (let i = 0; i < 2; i++) g.blob(13 + rnd() * 18, -2.2, -rnd() * L, 0.8 + rnd() * 1.8, pick([0x8d8f94, 0x7b7f86]), 0.7);
  for (let z = -6; z > -L; z -= 12) { g.cyl(5.2, -2.6, z, 0.25, 0.7, 0xffffff); g.cyl(5.2, -1.95, z, 0.26, 0.3, 0xe53935); }
  if (variant % 2) { const x = 40 + rnd() * 20, z = -rnd() * L; g.box(x, -2.5, z, 2.2, 0.8, 6, 0xffffff); g.add(new THREE.ConeGeometry(2, 7, 3), 0xfafafa, x, 2.5, z, 0.4, 1, 1.4); }
  // boardwalk lamps on their own pylons
  for (const s of [-1, 1]) { g.cyl(s * 3.35, -3, -L / 2, 0.12, 7.2, 0xf5f5f5); g.box(s * 3.35, 4.1, -L / 2, 0.45, 0.5, 0.45, 0xfff3c4); }
  return { world: build(g) };
}
function beachTile(lane: number): Parts {
  const g = new Geo();
  for (let i = 0; i < 4; i++) g.box(0, -0.18, -0.25 - i * 0.5, 1.94, 0.18, 0.46, pick(WOOD), 0, 0.05);
  for (const x of [-0.72, 0.72]) g.box(x, -0.46, -TILE / 2, 0.16, 0.28, TILE, 0x8a5a33);
  for (const x of [-0.8, 0.8]) g.cyl(x, -3.6, -0.25, 0.12, 3.2, 0x7a4f2a);
  if (lane !== 1) { const s = lane === 0 ? -1 : 1; g.cyl(s * 0.97, -0.05, -0.25, 0.06, 1.0, 0x8a5a33); g.add(U.cyl, 0xe0cfa8, s * 0.97, 0.82, -TILE / 2, 0.035, TILE, 0.035, Math.PI / 2, 0, 0); }
  return { world: build(g) };
}
function tram(kind: 0 | 1): Parts {
  const g = new Geo();
  const { L, W, H } = BUS;
  const body = kind ? 0xff8f3a : 0x26b5b0, dark = 0x23313a;
  g.box(0, 0.2, -L / 2, W * 0.96, 0.35, L * 0.98, dark);
  g.box(0, 0.45, -L / 2, W, 0.75, L, body);
  for (let i = 0; i < 5; i++) { g.box(0, 1.2, -1.2 - i * 1.8, W * 0.9, 0.35, 0.6, 0xc62828); g.box(0, 1.2, -1.45 - i * 1.8, W * 0.9, 0.7, 0.12, 0xc62828); }
  for (const s of [-1, 1]) for (let i = 0; i <= 5; i++) g.box(s * (W / 2 - 0.08), 1.2, -0.3 - i * ((L - 0.6) / 5), 0.08, H - 1.32, 0.08, 0xf5f5f5);
  for (let i = 0; i < 10; i++) g.box(0, H - 0.14, -0.5 - i * 0.92, W * 1.04, 0.14, 0.92, i % 2 ? 0xffffff : kind ? 0xe53935 : 0x1e88e5);
  g.box(0, 0.6, 0.02, W * 0.9, 0.55, 0.05, 0x9be7ff);
  for (const s of [-1, 1]) { g.add(U.cyl, dark, s * (W / 2 - 0.1), 0.42, -1.6, 0.42, 0.3, 0.42, 0, 0, Math.PI / 2); g.add(U.cyl, dark, s * (W / 2 - 0.1), 0.42, -L + 1.6, 0.42, 0.3, 0.42, 0, 0, Math.PI / 2); }
  return { world: build(g), lights: headlightGeo() };
}
function beachLow(): Parts {
  const g = new Geo();
  for (const s of [-1, 1]) g.box(s * 0.8, 0, 0, 0.14, 0.9, 0.14, 0x8a5a33);
  for (const y of [0.3, 0.7]) g.box(0, y, 0, 1.75, 0.14, 0.08, pick(WOOD));
  g.add(U.box, 0xb88452, 0, 0.45, 0.02, 1.7, 0.1, 0.06, 0, 0, 0.42);
  g.add(new THREE.TorusGeometry(0.22, 0.07, 8, 18), 0xe53935, 0.45, 0.55, 0.08, 1, 1, 1);
  return { world: build(g) };
}
function beachHigh(): Parts {
  const g = new Geo();
  for (const s of [-1, 1]) { g.box(s * 0.92, 0, 0, 0.12, 2.45, 0.12, 0xfafafa); g.box(s * 0.92, 0, 0, 0.4, 0.12, 0.4, 0x1e88e5); }
  for (let i = 0; i < 9; i++) g.box(-0.84 + i * 0.21, 1.12, 0, 0.025, 0.7, 0.025, 0x263238);
  for (let j = 0; j < 4; j++) g.box(0, 1.15 + j * 0.2, 0, 1.78, 0.025, 0.025, 0x263238);
  g.box(0, 1.8, 0, 1.84, 0.12, 0.06, 0xffffff);
  g.add(U.ball, 0xfff176, 0.4, 2.15, 0, 0.18, 0.18, 0.18);
  return { world: build(g) };
}
const beach: Theme = {
  id: 'beach', name: 'Playa',
  sky: { top: 0x1f8ef0, mid: 0x6cc7ff, horizon: 0xd8f6ff, fog: 0xcff1ff, sun: [-0.4, 0.55, -1], sunGlow: 1.2 },
  hemi: [0xe2f6ff, 0xd8c08f, 1.1], sun: [0xfff4dc, 2.8], env: 0.6, exposure: 1.05, fog: [45, 200], clouds: 7, cloudTint: 0xffffff,
  horizon: () => horizonCard((c) => {
    c.fillStyle = '#7fb8c9';
    c.beginPath(); c.moveTo(0, 360); c.quadraticCurveTo(300, 150, 620, 300); c.quadraticCurveTo(820, 210, 1000, 330); c.lineTo(1000, 360); c.fill();
    c.fillStyle = '#93c7d4';
    c.beginPath(); c.moveTo(1150, 360); c.quadraticCurveTo(1450, 190, 1800, 320); c.lineTo(2048, 340); c.lineTo(2048, 360); c.fill();
    c.fillStyle = '#e8f6fa'; c.fillRect(1480, 230, 16, 70); c.fillStyle = '#e57373'; c.fillRect(1480, 250, 16, 12); // lighthouse
  }, 0.9),
  chunk: beachChunk, tile: beachTile, gaps: 'lanes', oncoming: true,
  vehicle: tram, low: beachLow, high: beachHigh,
  ramp: () => rampIn(0xb9824b, 0xd6a46c, 0xffffff),
  water: 0x19aec4,
};

/* ================================================================ ROOFTOPS */
const BRICK = [0xb5523b, 0xa2492f, 0xc96f4b, 0x8e5a4c, 0x9b8b7d, 0xd8b98c, 0x6f7d8c];
function roofTile(lane: number): Parts {
  const g = new Geo();
  g.box(0, -0.3, -TILE / 2, 2.0, 0.3, TILE, 0x6a6f78);
  g.box(0, -0.02, -0.05, 2.0, 0.02, 0.1, 0x80858e);
  g.box(0, -14, -TILE / 2, 2.0, 13.7, TILE, 0xffffff); // the building below (tinted per building)
  if (lane !== 1) {
    const s = lane === 0 ? -1 : 1;
    g.box(s * 0.92, -0.05, -TILE / 2, 0.24, 0.6, TILE, 0xd7cfc4);
    for (const y of [-3, -6.2, -9.4]) g.box(s * 1.01, y, -1, 0.04, 1.4, 1.1, 0x34506e);
  }
  return { world: build(g) };
}
function roofPlank() {
  const g = new Geo();
  g.box(0, -0.12, -TILE / 2, 0.8, 0.1, TILE + 0.3, 0xa77a4a);
  for (let i = 0; i < 4; i++) g.box(0, -0.03, -0.25 - i * 0.5, 0.82, 0.02, 0.06, 0x8a5f36);
  return build(g);
}
function waterTower(g: Geo, x: number, y: number, z: number) {
  for (const dx of [-0.8, 0.8]) for (const dz of [-0.8, 0.8]) g.cyl(x + dx, y, z + dz, 0.08, 2.2, 0x4e4e4e);
  g.cyl(x, y + 2.2, z, 1.25, 2.4, 0x9a6b45);
  for (let i = 0; i < 3; i++) g.cyl(x, y + 2.5 + i * 0.8, z, 1.27, 0.07, 0x5d4037);
  g.add(new THREE.ConeGeometry(1.4, 0.9, 12), 0x5d4037, x, y + 5.05, z, 1, 1, 1);
}
function acUnit(g: Geo, x: number, y: number, z: number) {
  g.box(x, y, z, 1.4, 0.8, 1.0, 0xc9ced4);
  g.cyl(x, y + 0.8, z, 0.38, 0.03, 0x37474f);
}
function roofsChunk(variant: number): Parts {
  const g = new Geo();
  const L = CHUNK;
  for (const s of [-1, 1]) {
    let z = 0;
    while (z > -L + 0.5) {
      const rem = L + z, w = rem <= 9 ? rem : Math.min(rem - 5, 5 + rnd() * 6);
      const top = rnd() < 0.18 ? 6 + rnd() * 10 : -3 - rnd() * 7; // now and then a taller neighbour
      const x0 = s * (5 + rnd() * 1.5), depth = 9 + rnd() * 8, cx = x0 + s * depth / 2, zc = z - w / 2;
      const wall = pick(BRICK);
      g.box(cx, -20, zc, depth, top + 20, w - 0.4, wall, 0, 0.04);
      g.box(cx, top, zc, depth + 0.3, 0.35, w - 0.1, shade(wall, 0.15));
      if (top > 0) for (let f = -1; f * 3 < top - 1; f++) for (let k = 0; k < Math.floor(w / 2.2); k++) g.box(x0 - s * 0.05, f * 3 + 0.8, z - 1.1 - k * 2.2, 0.1, 1.4, 1.1, 0x5a7a9a);
      else {
        const r = rnd();
        if (r < 0.35) waterTower(g, cx + (rnd() - 0.5) * 3, top + 0.35, zc);
        else if (r < 0.7) for (let k = 0; k < 3; k++) acUnit(g, cx + (rnd() - 0.5) * depth * 0.6, top + 0.35, zc + (rnd() - 0.5) * w * 0.6);
        else { g.cyl(cx, top + 0.35, zc, 0.05, 4 + rnd() * 3, 0x9e9e9e); g.box(cx, top + 0.35, zc + 1, 1.6, 0.5, 1.6, 0x90caf9); }
      }
      z -= w;
    }
  }
  if (variant % 3 === 0) { // a billboard on a frame, high above the track
    const s = variant % 2 ? -1 : 1;
    g.box(s * 5.8, 0, -15, 0.2, 7, 0.2, 0x616161);
    g.box(s * 5.8, 5, -15, 0.3, 3, 6, pick([0xffca28, 0x26c6da, 0xff7043]));
  }
  return { world: build(g) };
}
function roofBlock(kind: 0 | 1): Parts {
  const g = new Geo();
  const { L, W, H } = BUS;
  if (kind === 0) { // shipping container
    const c = pick([0x1565c0, 0xc62828, 0x2e7d32, 0xef6c00]);
    g.box(0, 0, -L / 2, W, H, L, c);
    for (let i = 0; i < 24; i++) for (const s of [-1, 1]) g.box(s * (W / 2 + 0.01), 0.1, -0.2 - i * 0.4, 0.03, H - 0.2, 0.12, shade(c, -0.1));
    g.box(0, 0.1, 0.01, W * 0.9, H - 0.2, 0.03, shade(c, -0.15));
    for (const s of [-0.3, 0.3]) g.box(s, 0.3, 0.04, 0.05, H - 0.6, 0.05, 0x9e9e9e);
  } else { // brick stair-house with a door
    g.box(0, 0, -L / 2, W, H, L, 0xb5523b);
    g.box(0, H - 0.15, -L / 2, W + 0.15, 0.15, L + 0.15, 0x8d6e63);
    g.box(0, 0, 0.01, 0.9, 1.9, 0.05, 0x5d4037);
    g.box(0.3, 0.95, 0.05, 0.08, 0.08, 0.05, 0xffd54f);
  }
  return { world: build(g) };
}
function roofLow(): Parts { const g = new Geo(); acUnit(g, 0, 0, 0); g.box(0, 0, 0, 1.7, 0.12, 1.0, 0x78909c); g.add(U.cyl, 0x90a4ae, 0.75, 0.55, -0.3, 0.07, 0.8, 0.07, Math.PI / 2, 0, 0); return { world: build(g) }; }
function roofHigh(): Parts {
  const g = new Geo();
  for (const s of [-1, 1]) g.box(s * 0.92, 0, 0, 0.1, 2.45, 0.1, 0x8d6e63);
  g.add(U.cyl, 0xe0e0e0, 0, 1.75, 0, 0.02, 1.86, 0.02, 0, 0, Math.PI / 2);
  for (let i = 0; i < 5; i++) g.box(-0.72 + i * 0.36, 1.08, 0, 0.3, 0.66, 0.03, pick([0xffffff, 0xff8a80, 0x80d8ff, 0xffe57f, 0xb9f6ca, 0xce93d8]));
  g.box(0, 2.2, 0, 1.0, 0.4, 0.06, 0xffca28);
  return { world: build(g) };
}
const roofs: Theme = {
  id: 'roofs', name: 'Tejados',
  sky: { top: 0x2c3e8f, mid: 0xf2885b, horizon: 0xffd59e, fog: 0xf3c79c, sun: [0.15, 0.08, -1], sunGlow: 1.5 },
  hemi: [0xffd8b0, 0x6a4f6e, 0.95], sun: [0xffc58a, 2.6], env: 0.55, exposure: 1.0, fog: [35, 175], clouds: 6, cloudTint: 0xffd9c2,
  horizon: () => horizonCard((c) => {
    for (const [col, base, k] of [['#e89c84', 360, 1], ['#d8836f', 360, 0.6]] as const) {
      c.fillStyle = col;
      let r = 7 * k;
      for (let x = 0; x < 2048;) { r = (r * 9301 + 49297) % 233280; const w = 30 + (r / 233280) * 80, h = 40 + ((r * 7) % 233280) / 233280 * 150 * k; c.fillRect(x, base - h, w, h); x += w + 6; }
    }
  }, 0.8),
  chunk: roofsChunk, tile: roofTile, plank: roofPlank, gaps: 'full', oncoming: false,
  vehicle: roofBlock, low: roofLow, high: roofHigh,
  ramp: () => rampIn(0x7d8692, 0xa8b2bd, 0xffca28),
};

/* ================================================================ NEON */
const NEON = [0x00e5ff, 0xff2bd6, 0xffd400, 0x7c4dff, 0x00ff9c];
function neonTile(lane: number): Parts {
  const g = new Geo(), gl = new Geo();
  g.box(0, -0.25, -TILE / 2, 1.96, 0.25, TILE, 0x1a1236);
  g.box(0, -6, -TILE / 2, 0.5, 5.75, 0.5, 0x120c26);
  gl.boost = 2.4;
  for (const s of [-1, 1]) gl.box(s * 0.95, 0.0, -TILE / 2, 0.06, 0.03, TILE, s === (lane === 0 ? -1 : lane === 2 ? 1 : 0) ? 0x00e5ff : 0xff2bd6);
  gl.box(0, 0.0, -0.02, 1.9, 0.02, 0.04, 0x5b2bff);
  return { world: build(g), glow: build(gl) };
}
function neonChunk(variant: number): Parts {
  const g = new Geo(), gl = new Geo();
  const L = CHUNK;
  gl.boost = 2.2;
  // the grid far below
  g.box(0, -13, -L / 2, 140, 0.5, L, 0x0d0820);
  for (let x = -66; x <= 66; x += 6) gl.box(x, -12.48, -L / 2, 0.08, 0.02, L, 0xff2bd6);
  for (let z = 0; z > -L; z -= 6) gl.box(0, -12.48, z, 132, 0.02, 0.08, 0x7c4dff);
  for (const s of [-1, 1]) {
    let z = 0;
    while (z > -L + 0.5) {
      const rem = L + z, w = rem <= 8 ? rem : Math.min(rem - 4, 4 + rnd() * 5);
      const h = 12 + rnd() * 45, x0 = s * (6.5 + rnd() * 4), d = 6 + rnd() * 6, cx = x0 + s * d / 2, zc = z - w / 2;
      g.box(cx, -13, zc, d, h + 13, w - 0.6, pick([0x1d1540, 0x241a52, 0x18123a, 0x2a1a4a]));
      const c = pick(NEON);
      for (let k = 0; k < 3; k++) gl.box(x0 - s * 0.04, 0, z - 0.6 - k * ((w - 1.2) / 2), 0.06, h, 0.08, c);
      gl.box(x0 - s * 0.05, h - 0.4, zc, 0.08, 0.15, w - 0.8, c);
      if (rnd() < 0.45) gl.box(x0 - s * 0.3, 3 + rnd() * 8, zc, 0.15, 1.2 + rnd(), Math.min(w - 1, 3 + rnd() * 2), pick(NEON)); // sign
      z -= w;
    }
  }
  if (variant % 2 === 0) { // a glowing arch over the track
    const arch = new THREE.TorusGeometry(5.2, 0.12, 6, 40, Math.PI);
    gl.add(arch, pick(NEON), 0, 0, -18, 1, 1.1, 1);
  }
  return { world: build(g), glow: build(gl) };
}
function hover(kind: 0 | 1): Parts {
  const g = new Geo(), gl = new Geo(), li = new Geo();
  const { L, W, H } = BUS;
  const c = kind ? 0xff9100 : 0x00e5ff;
  g.box(0, 0.4, -L / 2, W, H - 0.4, L, 0x221b3d);
  g.box(0, H - 0.1, -L / 2, W * 0.9, 0.1, L * 0.96, 0x2e2552);
  g.box(0, 1.2, 0.02, W * 0.85, 0.9, 0.04, 0x3a2f6a);
  gl.boost = 2.3;
  for (const s of [-1, 1]) { gl.box(s * (W / 2 + 0.01), 0.5, -L / 2, 0.04, 0.08, L, c); gl.box(s * (W / 2 + 0.01), H - 0.25, -L / 2, 0.04, 0.06, L, c); }
  gl.box(0, 0.33, -L / 2, W * 0.8, 0.04, L * 0.9, 0xff2bd6);
  li.boost = 2.5;
  for (const s of [-1, 1]) li.box(s * 0.6, 0.75, 0.06, 0.4, 0.14, 0.02, 0xd8f6ff);
  return { world: build(g), glow: build(gl), lights: build(li) };
}
function neonLow(): Parts {
  const g = new Geo(), gl = new Geo();
  for (const s of [-1, 1]) g.box(s * 0.88, 0, 0, 0.14, 0.95, 0.14, 0x2a2440);
  gl.boost = 2.6;
  for (const y of [0.25, 0.5, 0.75]) gl.box(0, y, 0, 1.66, 0.05, 0.05, 0xff1744);
  return { world: build(g), glow: build(gl) };
}
function neonHigh(): Parts {
  const g = new Geo(), gl = new Geo();
  for (const s of [-1, 1]) g.box(s * 0.92, 0, 0, 0.14, 2.45, 0.14, 0x2a2440);
  g.box(0, 2.3, 0, 1.98, 0.15, 0.16, 0x2a2440);
  gl.boost = 2.4;
  gl.box(0, 1.15, 0, 1.7, 0.4, 0.1, 0xff2bd6);
  gl.box(0, 1.62, 0, 1.7, 0.06, 0.1, 0x00e5ff);
  return { world: build(g), glow: build(gl) };
}
const neon: Theme = {
  id: 'neon', name: 'Neón',
  sky: { top: 0x07031c, mid: 0x2b0b52, horizon: 0xff4f8b, fog: 0x2a0b4a, sun: [0, 0.05, -1], sunGlow: 0, stars: true },
  hemi: [0xa58bff, 0x2a1450, 1.15], sun: [0xffa6e4, 1.9], env: 0.55, exposure: 1.05, fog: [30, 170], clouds: 0, cloudTint: 0xffffff,
  horizon: () => horizonCard((c) => {
    // synthwave sun with stripes, mountains with glowing ridges
    const gr = c.createLinearGradient(0, 40, 0, 300);
    gr.addColorStop(0, '#ffe066'); gr.addColorStop(0.5, '#ff7a59'); gr.addColorStop(1, '#ff2bd6');
    c.fillStyle = gr; c.beginPath(); c.arc(1024, 250, 190, Math.PI, 0); c.fill();
    c.globalCompositeOperation = 'destination-out';
    for (let i = 0; i < 7; i++) c.fillRect(800, 160 + i * 14 + i * i * 1.2, 450, 3 + i * 1.3);
    c.globalCompositeOperation = 'source-over';
    c.fillStyle = '#1a0838';
    c.beginPath(); c.moveTo(0, 360);
    for (let x = 0; x <= 2048; x += 64) c.lineTo(x, 300 - Math.abs(Math.sin(x * 0.011) * 90) - (x % 128 ? 0 : 30));
    c.lineTo(2048, 360); c.fill();
    c.strokeStyle = '#ff2bd6'; c.lineWidth = 3; c.beginPath();
    for (let x = 0; x <= 2048; x += 64) c.lineTo(x, 300 - Math.abs(Math.sin(x * 0.011) * 90) - (x % 128 ? 0 : 30));
    c.stroke();
  }, 1),
  chunk: neonChunk, tile: neonTile, gaps: 'lanes', oncoming: true,
  vehicle: hover, low: neonLow, high: neonHigh,
  ramp: () => rampIn(0x2a2148, 0x00e5ff, 0xff2bd6, true),
  bloom: true,
};

export const THEMES: Record<ThemeId, Theme> = { city, beach, roofs, neon };
export const THEME_LIST: Theme[] = [city, beach, roofs, neon];
export { LANE };
