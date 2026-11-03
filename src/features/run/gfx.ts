/* English Run — everything that is drawn: the curved-world materials, ink outlines, the street
   chunks, buses, barriers, ramps, coins, power-up tokens, word gates, sky, skyline and clouds.
   Geometry is built in code (merged boxes, cylinders and blobs with vertex colours) and shaded
   with a stepped toon ramp, so there is nothing to download except the teachers' models. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { makeLensMaterial, makeToonMaterial } from '@/features/toons3d/runtime';

/* ------------------------------------------------------- curved world */
/** x: how fast the world drops away (Subway-Surfers-style horizon); y: sideways bend. */
export const CURVE = { value: new THREE.Vector2(0.0012, 0) };
const CURVE_GLSL = `
  mvPosition.y -= uCurve.x * mvPosition.z * mvPosition.z;
  mvPosition.x += uCurve.y * mvPosition.z * mvPosition.z;
  gl_Position = projectionMatrix * mvPosition;`;

/** Adds the world bend to a built-in shader (only where it lands on screen; shadows stay flat). */
export function curveShader(sh: { uniforms: Record<string, THREE.IUniform>; vertexShader: string }) {
  sh.uniforms.uCurve = CURVE;
  sh.vertexShader = 'uniform vec2 uCurve;\n' + sh.vertexShader.replace('#include <project_vertex>', '#include <project_vertex>' + CURVE_GLSL);
}
/** Bends any built-in material with the world. */
export function curved<T extends THREE.Material>(m: T): T {
  m.onBeforeCompile = (sh) => curveShader(sh);
  m.customProgramCacheKey = () => 'curved';
  return m;
}

function ramp(steps: number[]) {
  const d = new Uint8Array(steps.length * 4);
  steps.forEach((v, i) => d.set([v, v, v, 255], i * 4));
  const t = new THREE.DataTexture(d, steps.length, 1);
  t.minFilter = t.magFilter = THREE.NearestFilter;
  t.needsUpdate = true;
  return t;
}
const RAMP = ramp([120, 196, 255]);

/** Soft stylised PBR (lit by the sun, the sky and an environment map), bent with the world. */
export const MAT = {
  world: curved(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82, metalness: 0 })),
  glossy: curved(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.05 })),
  char: makeToonMaterial((sh) => curveShader(sh)),
  lens: makeLensMaterial((sh) => curveShader(sh)),
  coin: curved(new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.7, emissive: 0x3a2600 })),
  /** Unlit and brighter than white where needed: neon, lights (picked up by the bloom). */
  glow: curved(new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false })),
};

/* ---------------------------------------------------- geometry builder */
export const U = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  blob: new THREE.IcosahedronGeometry(1, 1),
  ball: new THREE.SphereGeometry(1, 12, 8),
};
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();

export class Geo {
  parts: THREE.BufferGeometry[] = [];
  /** Colours are multiplied by this (> 1 makes neon that blooms). */
  boost = 1;
  add(g: THREE.BufferGeometry, color: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0, jitter = 0) {
    const geo = g.index ? g.toNonIndexed() : g.clone();
    if (geo.getAttribute('uv')) geo.deleteAttribute('uv');
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    geo.applyMatrix4(_m);
    _c.setHex(color);
    if (jitter) _c.offsetHSL(0, 0, (Math.random() - 0.5) * jitter);
    const n = geo.getAttribute('position').count;
    const a = new Float32Array(n * 3);
    const k = this.boost;
    for (let i = 0; i < n; i++) { a[i * 3] = _c.r * k; a[i * 3 + 1] = _c.g * k; a[i * 3 + 2] = _c.b * k; }
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    this.parts.push(geo);
    return this;
  }
  /** Box with its bottom at y. */
  box(x: number, y: number, z: number, w: number, h: number, d: number, color: number, ry = 0, jitter = 0) { return this.add(U.box, color, x, y + h / 2, z, w, h, d, 0, ry, 0, jitter); }
  /** Upright cylinder with its bottom at y. */
  cyl(x: number, y: number, z: number, r: number, h: number, color: number, seg6 = false) { return this.add(seg6 ? U.cyl6 : U.cyl, color, x, y + h / 2, z, r, h, r); }
  blob(x: number, y: number, z: number, r: number, color: number, sy = 1) { return this.add(U.blob, color, x, y, z, r, r * sy, r, Math.random(), Math.random(), 0); }
  raw(g: THREE.BufferGeometry, color: number) { return this.add(g, color, 0, 0, 0, 1, 1, 1); }
  build() { const g = mergeGeometries(this.parts, false); this.parts.forEach((p) => p.dispose()); g.computeBoundingSphere(); return g; }
}

export const rnd = Math.random;
export const pick = <T,>(a: readonly T[]) => a[Math.floor(rnd() * a.length)];
export const shade = (hex: number, l: number) => _c.setHex(hex).offsetHSL(0, 0, l).getHex();

/* -------------------------------------------------------------- street */
export const LANE = 2;
export const CHUNK = 30;
const FACADE = 7.6;
const WALLS = [0xc4553f, 0xb34a36, 0xefe2c4, 0x9fc3d9, 0xa8d8b9, 0xe8a7a7, 0xf2d27a, 0xc9c2b4, 0x41587f, 0xe9b87a, 0x8fb39a, 0xf4f0e6];
const AWNINGS = [0xe53935, 0x1e88e5, 0x43a047, 0xfb8c00, 0x8e24aa, 0x00897b];

function building(g: Geo, side: number, z0: number, w: number) {
  const floors = 2 + Math.floor(rnd() * 4);
  const fh = 2.9;
  const h = floors * fh + 1.1;
  const depth = 8;
  const wall = pick(WALLS);
  const trim = shade(wall, wall === 0xf4f0e6 || wall === 0xefe2c4 ? -0.2 : 0.18);
  const zc = z0 - w / 2;
  const fx = side * FACADE;
  g.box(side * (FACADE + depth / 2), 0, zc, depth, h, w - 0.08, wall, 0, 0.04);
  g.box(fx - side * 0.15, h - 0.45, zc, 0.45, 0.4, w, trim); // cornice
  g.box(fx - side * 0.06, 0, zc, 0.2, 0.55, w, shade(wall, -0.18)); // plinth
  // roof: parapet, or a slate pitched roof
  if (rnd() < 0.45) {
    const roof = new THREE.CylinderGeometry(1, 1, 1, 3);
    g.add(roof, pick([0x4a4f5c, 0x5d4037, 0x37474f]), side * (FACADE + depth / 2), h + 1.1, zc, depth * 0.62, w - 0.2, 1.6, Math.PI / 2, 0, Math.PI / 2);
  } else g.box(side * (FACADE + depth / 2), h, zc, depth, 0.5, w - 0.08, trim);
  if (rnd() < 0.6) g.box(side * (FACADE + depth * 0.6), h, zc - w * (rnd() - 0.5) * 0.6, 0.8, 1.6 + rnd(), 0.9, 0x8d5a46);
  // windows
  const cols = Math.max(1, Math.floor((w - 1.0) / 2.1));
  const shop = rnd() < 0.55;
  const glass = pick([0x5b86b8, 0x4f7aa8, 0x6b95c2]);
  for (let f = shop ? 1 : 0; f < floors; f++) {
    for (let c = 0; c < cols; c++) {
      const z = z0 - 0.5 - ((c + 0.5) * (w - 1.0)) / cols;
      const y = 0.85 + f * fh;
      g.box(fx - side * 0.02, y - 0.1, z, 0.12, 1.75, 1.25, 0xf5f1e8);
      g.box(fx - side * 0.06, y, z, 0.1, 1.55, 1.05, glass);
      g.box(fx - side * 0.09, y + 0.95, z, 0.06, 0.5, 1.05, shade(glass, 0.18));
      g.box(fx - side * 0.1, y + 0.72, z, 0.05, 0.08, 1.05, 0xf5f1e8);
      g.box(fx - side * 0.18, y - 0.2, z, 0.3, 0.1, 1.35, trim);
    }
  }
  if (shop) {
    const aw = pick(AWNINGS);
    g.box(fx - side * 0.05, 0.4, zc, 0.12, 2.1, w - 1.2, 0x8fc1e8); // shop window
    g.box(fx - side * 0.08, 0.4, z0 - 1.0, 0.12, 2.2, 0.9, 0x6d4c41); // door
    for (let i = 0; i < Math.floor(w / 0.8); i++) g.add(U.box, i % 2 ? 0xffffff : aw, fx - side * 0.75, 2.75, z0 - 0.4 - i * 0.8, 1.5, 0.08, 0.8, 0, 0, side * 0.35);
    g.box(fx - side * 0.06, 2.75, zc, 0.14, 0.45, w - 0.6, shade(aw, -0.15)); // sign band
  } else {
    g.box(fx - side * 0.08, 0.15, zc, 0.12, 2.3, 1.1, pick([0x2e5d4b, 0x7b1f2b, 0x1d3557, 0x3e2723]));
    g.box(fx - side * 0.3, 0, zc, 0.6, 0.15, 1.6, 0xb0aba3);
  }
}

function lamp(g: Geo, x: number, z: number) {
  const s = Math.sign(x);
  g.cyl(x, 0.15, z, 0.08, 4.4, 0x2f4a3a);
  g.box(x - s * 0.45, 4.35, z, 0.9, 0.08, 0.08, 0x2f4a3a);
  g.box(x - s * 0.85, 4.05, z, 0.34, 0.32, 0.34, 0x2f4a3a);
  g.box(x - s * 0.85, 3.98, z, 0.26, 0.12, 0.26, 0xfff1b0);
}
function tree(g: Geo, x: number, z: number) {
  g.box(x, 0.15, z, 1.0, 0.45, 1.0, 0xa1887f);
  g.cyl(x, 0.5, z, 0.13, 1.8, 0x7a4f2a);
  const greens = [0x5cb85c, 0x4caf50, 0x3f9b46, 0x66bb6a];
  g.blob(x, 2.6, z, 1.05, pick(greens), 0.9);
  g.blob(x + 0.5, 2.25, z + 0.3, 0.7, pick(greens));
  g.blob(x - 0.45, 2.35, z - 0.35, 0.72, pick(greens));
}
function phoneBox(g: Geo, x: number, z: number) {
  const s = Math.sign(x);
  g.box(x, 0.15, z, 0.95, 2.35, 0.95, 0xd32f2f);
  g.box(x, 2.5, z, 1.05, 0.18, 1.05, 0xb71c1c);
  g.box(x - s * 0.49, 0.9, z, 0.04, 1.2, 0.7, 0xcfe7f5);
  g.box(x - s * 0.5, 2.15, z, 0.04, 0.22, 0.7, 0xfafafa);
}
function postBox(g: Geo, x: number, z: number) { g.cyl(x, 0.15, z, 0.3, 1.15, 0xd32f2f); g.add(U.ball, 0xc62828, x, 1.3, z, 0.31, 0.16, 0.31); g.box(x - Math.sign(x) * 0.29, 0.95, z, 0.04, 0.06, 0.3, 0x212121); }
function bench(g: Geo, x: number, z: number) {
  g.box(x, 0.55, z, 0.5, 0.08, 1.8, 0x8d6e63);
  g.box(x + Math.sign(x) * 0.25, 0.6, z, 0.08, 0.5, 1.8, 0x8d6e63);
  for (const dz of [-0.75, 0.75]) g.box(x, 0.15, z + dz, 0.45, 0.42, 0.08, 0x37474f);
}
function hydrant(g: Geo, x: number, z: number) { g.cyl(x, 0.15, z, 0.14, 0.55, 0xfdd835); g.add(U.ball, 0xf9a825, x, 0.72, z, 0.15, 0.12, 0.15); }

/** One 30 m stretch of street (local z 0 → −30): road, pavements, buildings, street furniture. */
export function chunkGeo(variant: number) {
  const g = new Geo();
  const L = CHUNK;
  // road and markings
  g.box(0, -0.3, -L / 2, 7.2, 0.3, L, 0x4a5163);
  for (let i = 0; i < 6; i++) for (const x of [-LANE / 2, LANE / 2]) g.box(x, 0, -2.5 - i * 5, 0.14, 0.012, 2.2, 0xf4f4f4);
  for (const x of [-3.35, 3.35]) g.box(x, 0, -L / 2, 0.12, 0.012, L, 0xf6d45a);
  if (variant % 4 === 1) for (let i = 0; i < 9; i++) g.box(-3 + i * 0.75, 0, -15, 0.45, 0.014, 2.6, 0xfafafa); // zebra crossing
  if (rnd() < 0.6) g.cyl((rnd() - 0.5) * 5, 0, -rnd() * L, 0.35, 0.012, 0x353a47);
  // kerbs and pavements (tiles in two shades)
  for (const s of [-1, 1]) {
    g.box(s * 3.75, -0.3, -L / 2, 0.3, 0.48, L, 0xd7d3cb);
    for (let i = 0; i < L / 1.5; i++) g.box(s * 5.75, -0.3, -0.75 - i * 1.5, 3.7, 0.45, 1.5, i % 2 ? 0xc9c3b8 : 0xbdb6aa);
  }
  // buildings
  for (const s of [-1, 1]) {
    let z = 0;
    while (z > -L + 0.5) {
      const rem = L + z;
      const w = rem <= 10 ? rem : Math.min(rem - 5, 5 + rnd() * 5);
      building(g, s, z, w);
      z -= w;
    }
  }
  // street furniture
  for (const s of [-1, 1]) {
    for (let z = -4 - rnd() * 3; z > -L + 1; z -= 6 + rnd() * 6) {
      const x = s * (4.35 + rnd() * 0.3);
      const r = rnd();
      if (r < 0.28) tree(g, s * 5.2, z);
      else if (r < 0.48) lamp(g, x, z);
      else if (r < 0.58) phoneBox(g, s * 6.6, z);
      else if (r < 0.68) postBox(g, x, z);
      else if (r < 0.8) bench(g, s * 6.5, z);
      else if (r < 0.88) hydrant(g, x, z);
    }
  }
  return g.build();
}

/* ----------------------------------------------------------- obstacles */
export const BUS = { L: 10, W: 1.8, H: 2.5 };
export function busGeo(kind: 0 | 1) {
  const g = new Geo();
  const { L, W, H } = BUS;
  const body = kind ? 0xd93a2f : 0xf6b81a;
  const dark = 0x22262e, glass = 0x2f4f6f;
  g.box(0, 0.2, -L / 2, W * 0.96, 0.4, L * 0.98, dark);
  g.box(0, 0.45, -L / 2, W, H - 0.6, L, body);
  g.box(0, H - 0.15, -L / 2, W * 0.95, 0.15, L * 0.98, kind ? 0xb8302a : 0xe5a915);
  g.box(0, H - 0.05, -L * 0.55, W * 0.6, 0.18, 2.2, 0xd5d9e0);
  for (const s of [-1, 1]) {
    for (let i = 0; i < 6; i++) g.box(s * (W / 2 + 0.005), 1.35, -1.9 - i * 1.35, 0.03, 0.75, 1.15, glass);
    g.box(s * (W / 2 + 0.008), 1.05, -L / 2, 0.02, 0.1, L * 0.96, kind ? 0xffffff : dark);
    for (const z of [-1.9, -L + 1.9]) {
      g.add(U.cyl, dark, s * (W / 2 - 0.12), 0.45, z, 0.45, 0.32, 0.45, 0, 0, Math.PI / 2);
      g.add(U.cyl, 0xb0b6c0, s * (W / 2 + 0.02), 0.45, z, 0.2, 0.06, 0.2, 0, 0, Math.PI / 2);
    }
  }
  g.box(0, 1.0, 0.005, W * 0.86, 1.15, 0.04, glass);
  g.box(0, 1.85, 0.0, W * 0.7, 0.26, 0.05, dark);
  g.box(0, 1.88, 0.02, W * 0.5, 0.16, 0.04, 0xffb74d);
  g.box(0, 0.22, 0.04, W * 1.02, 0.28, 0.14, dark);
  for (const s of [-1, 1]) g.box(s * 0.62, 0.58, 0.03, 0.34, 0.2, 0.05, 0xfff6c8);
  g.box(0, 1.1, -L - 0.005, W * 0.8, 0.8, 0.04, glass);
  return g.build();
}
/** Headlights (unlit, bright) for oncoming buses. */
export function headlightGeo() {
  const g = new Geo();
  for (const s of [-1, 1]) g.box(s * 0.62, 0.58, 0.07, 0.38, 0.24, 0.02, 0xffffd8);
  return g.build();
}

export function lowBarrierGeo() {
  const g = new Geo();
  for (const s of [-1, 1]) {
    g.box(s * 0.78, 0, 0, 0.34, 0.12, 0.6, 0x37474f);
    g.box(s * 0.78, 0.1, 0, 0.1, 0.85, 0.1, 0xeceff1);
  }
  for (let i = 0; i < 6; i++) g.box(-0.8 + 0.27 + i * 0.27 - 0.135 + 0.135 * 0, 0.5, 0, 0.27, 0.36, 0.12, i % 2 ? 0xffffff : 0xe53935);
  g.box(0, 0.22, 0, 1.6, 0.12, 0.08, 0xffffff);
  g.box(-0.6, 0.86, 0, 0.16, 0.12, 0.16, 0xffa000);
  return g.build();
}
export function highBarrierGeo() {
  const g = new Geo();
  for (const s of [-1, 1]) { g.box(s * 0.9, 0, 0, 0.14, 2.45, 0.14, 0x90a4ae); g.box(s * 0.9, 0, 0, 0.36, 0.1, 0.5, 0x455a64); }
  for (let i = 0; i < 8; i++) g.box(-0.84 + 0.105 + i * 0.21, 1.15, 0, 0.21, 0.6, 0.16, i % 2 ? 0x212121 : 0xffca28);
  g.box(0, 1.75, 0, 1.94, 0.1, 0.18, 0x546e7a);
  g.box(0, 1.85, 0, 1.0, 0.5, 0.1, 0x1565c0);
  // a white "slide under" arrow on the blue sign
  const arrow = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-0.2, 2.25, 0.06), new THREE.Vector3(0, 1.93, 0.06), new THREE.Vector3(0.2, 2.25, 0.06)]);
  arrow.computeVertexNormals();
  g.raw(arrow, 0xffffff);
  return g.build();
}
export const RAMP_L = 5;
export function rampGeo() {
  const W = 1.8, L = RAMP_L, H = BUS.H;
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
  const A = v(-W / 2, 0, 0), B = v(W / 2, 0, 0), C = v(W / 2, H, -L), D = v(-W / 2, H, -L), E = v(-W / 2, 0, -L), F = v(W / 2, 0, -L);
  const tris = [A, B, C, A, C, D, B, F, C, A, D, E, E, D, C, E, C, F];
  const top = new THREE.BufferGeometry().setFromPoints(tris);
  top.computeVertexNormals();
  const g = new Geo();
  g.raw(top, 0x7f93a8);
  for (let i = 1; i < 8; i++) { const t = i / 8; g.add(U.box, 0xb8c6d4, 0, H * t + 0.03, -L * t, W * 0.9, 0.06, 0.12, Math.atan2(H, L), 0, 0); }
  for (const s of [-1, 1]) g.add(U.box, 0xffca28, s * (W / 2 - 0.06), H / 2 + 0.05, -L / 2, 0.12, 0.08, Math.hypot(H, L), Math.atan2(H, L), 0, 0);
  return g.build();
}

/* --------------------------------------------------------------- coins */
export function coinGeo() {
  const g = new Geo();
  g.add(U.cyl, 0xf5b300, 0, 0, 0, 0.34, 0.08, 0.34, Math.PI / 2, 0, 0);
  g.add(U.cyl, 0xffe17a, 0, 0, 0, 0.24, 0.1, 0.24, Math.PI / 2, 0, 0);
  return g.build();
}

/* ------------------------------------------------------- canvas labels */
function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  draw(c);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}
function roundRect(c: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
}
/** Writes text on a board canvas: shrinks and wraps to two lines when needed. */
export function paintBoard(c: CanvasRenderingContext2D, text: string, bg: string, ink: string, border: string) {
  const W = c.canvas.width, H = c.canvas.height;
  c.clearRect(0, 0, W, H);
  roundRect(c, 6, 6, W - 12, H - 12, H * 0.16);
  c.fillStyle = bg; c.fill();
  c.lineWidth = 12; c.strokeStyle = border; c.stroke();
  c.fillStyle = ink; c.textAlign = 'center'; c.textBaseline = 'middle';
  let size = H * 0.5;
  const fit = (s: number) => { c.font = `900 ${s}px Inter, system-ui, sans-serif`; return c.measureText(text).width <= W * 0.86; };
  while (size > H * 0.3 && !fit(size)) size -= 2;
  if (fit(size)) { c.fillText(text, W / 2, H / 2 + size * 0.04); return; }
  // two lines
  const words = text.split(' ');
  let best = 1, diff = Infinity;
  for (let i = 1; i < words.length; i++) { const a = words.slice(0, i).join(' '), b = words.slice(i).join(' '); const d = Math.abs(a.length - b.length); if (d < diff) { diff = d; best = i; } }
  const l1 = words.slice(0, best).join(' '), l2 = words.slice(best).join(' ');
  size = H * 0.36;
  const fit2 = (s: number) => { c.font = `900 ${s}px Inter, system-ui, sans-serif`; return Math.max(c.measureText(l1).width, c.measureText(l2).width) <= W * 0.88; };
  while (size > 14 && !fit2(size)) size -= 2;
  c.fillText(l1, W / 2, H / 2 - size * 0.55);
  c.fillText(l2, W / 2, H / 2 + size * 0.6);
}

/* ---------------------------------------------------------- power-ups */
export type PowerKind = 'magnet' | 'double' | 'shield' | 'jump';
export const POWER_COLORS: Record<PowerKind, string> = { magnet: '#e53935', double: '#8e24aa', shield: '#1e88e5', jump: '#43a047' };
function powerIcon(kind: PowerKind) {
  return canvasTex(256, 256, (c) => {
    c.fillStyle = '#ffffff'; c.beginPath(); c.arc(128, 128, 122, 0, Math.PI * 2); c.fill();
    c.fillStyle = POWER_COLORS[kind]; c.beginPath(); c.arc(128, 128, 104, 0, Math.PI * 2); c.fill();
    c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = '#ffffff'; c.fillStyle = '#ffffff';
    if (kind === 'magnet') {
      c.lineWidth = 34; c.beginPath(); c.arc(128, 120, 46, Math.PI, 0, true); c.lineTo(174, 70); c.moveTo(82, 120); c.lineTo(82, 70); c.stroke();
      c.fillStyle = '#cfd8dc'; c.fillRect(65, 52, 34, 26); c.fillRect(157, 52, 34, 26);
    } else if (kind === 'double') {
      c.font = '900 120px Inter, system-ui, sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('x2', 128, 136);
    } else if (kind === 'shield') {
      c.beginPath(); c.moveTo(128, 46); c.lineTo(196, 72); c.quadraticCurveTo(196, 170, 128, 210); c.quadraticCurveTo(60, 170, 60, 72); c.closePath(); c.fill();
      c.fillStyle = POWER_COLORS.shield; c.beginPath(); c.moveTo(128, 76); c.lineTo(172, 92); c.quadraticCurveTo(170, 158, 128, 184); c.closePath(); c.fill();
    } else {
      c.beginPath(); c.moveTo(60, 170); c.lineTo(70, 108); c.quadraticCurveTo(100, 112, 112, 92); c.lineTo(150, 128); c.quadraticCurveTo(200, 138, 200, 170); c.closePath(); c.fill();
      c.lineWidth = 14; c.beginPath(); c.moveTo(150, 80); c.lineTo(196, 60); c.moveTo(160, 100); c.lineTo(212, 92); c.stroke();
    }
  });
}
/** A spinning token: coloured rim and the icon on both faces. */
export function powerToken(kind: PowerKind) {
  const grp = new THREE.Group();
  const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.46, 0.14, 28).rotateX(Math.PI / 2), curved(new THREE.MeshStandardMaterial({ color: POWER_COLORS[kind], roughness: 0.3, metalness: 0.2 })));
  const face = curved(new THREE.MeshBasicMaterial({ map: powerIcon(kind), toneMapped: false }));
  const disc = new THREE.CircleGeometry(0.44, 28);
  const f1 = new THREE.Mesh(disc, face); f1.position.z = 0.072;
  const f2 = new THREE.Mesh(disc, face); f2.position.z = -0.072; f2.rotation.y = Math.PI;
  grp.add(rim, f1, f2);
  return grp;
}

/* --------------------------------------------------------------- gates */
export interface GateMesh { group: THREE.Group; q: CanvasRenderingContext2D; qTex: THREE.CanvasTexture; a: CanvasRenderingContext2D[]; aTex: THREE.CanvasTexture[] }
export function gateMesh(): GateMesh {
  const group = new THREE.Group();
  const g = new Geo();
  for (const s of [-1, 1]) { g.box(s * 4.3, -0.3, 0, 0.45, 6.4, 0.45, 0x00897b); g.box(s * 4.3, -0.3, 0, 0.8, 0.5, 0.8, 0x00695c); }
  g.box(0, 5.4, 0, 9.0, 0.45, 0.4, 0x00897b);
  for (let i = 0; i < 3; i++) for (const s of [-0.75, 0.75]) g.box((i - 1) * LANE + s, 4.7, 0, 0.05, 0.75, 0.05, 0x263238);
  g.box(0, 0, 0.6, 7.0, 0.02, 0.5, 0xffffff);
  const frame = new THREE.Mesh(g.build(), MAT.glossy);
  frame.castShadow = true;
  group.add(frame);
  const mk = (w: number, h: number, pw: number, ph: number) => {
    const cv = document.createElement('canvas'); cv.width = pw; cv.height = ph;
    const ctx = cv.getContext('2d')!;
    const tex = new THREE.CanvasTexture(cv); tex.colorSpace = THREE.SRGBColorSpace; tex.anisotropy = 4;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), curved(new THREE.MeshBasicMaterial({ map: tex, transparent: true, toneMapped: false })));
    return { ctx, tex, m };
  };
  const q = mk(7.6, 1.5, 1024, 202);
  q.m.position.set(0, 6.45, 0.05);
  group.add(q.m);
  const a: CanvasRenderingContext2D[] = [], aTex: THREE.CanvasTexture[] = [];
  for (let i = 0; i < 3; i++) {
    const b = mk(1.9, 1.0, 512, 270);
    b.m.position.set((i - 1) * LANE, 3.85, 0.05);
    group.add(b.m);
    a.push(b.ctx); aTex.push(b.tex);
  }
  return { group, q: q.ctx, qTex: q.tex, a, aTex };
}

/* ----------------------------------------------------------------- sky */
export interface SkyColors { top: number; mid: number; horizon: number; fog: number; sun: [number, number, number]; sunGlow?: number; stars?: boolean }
export function skyDome(sky: SkyColors) {
  const m = new THREE.ShaderMaterial({
    uniforms: { top: { value: new THREE.Color(sky.top) }, mid: { value: new THREE.Color(sky.mid) }, hor: { value: new THREE.Color(sky.horizon) }, sun: { value: new THREE.Vector3(...sky.sun).normalize() }, glow: { value: sky.sunGlow ?? 1 }, stars: { value: sky.stars ? 1 : 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform vec3 top, mid, hor, sun; uniform float glow, stars; varying vec3 vD;
      float hash(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
      void main(){
        float h = clamp(vD.y, -0.2, 1.0);
        vec3 c = h < 0.12 ? mix(hor, mid, smoothstep(-0.02, 0.12, h)) : mix(mid, top, smoothstep(0.12, 0.7, h));
        float s = max(0.0, dot(vD, sun));
        c += vec3(1.0, 0.92, 0.75) * (pow(s, 600.0) * 1.4 + pow(s, 12.0) * 0.18) * glow;
        if (stars > 0.5) { vec3 q = floor(vD * 260.0); float st = step(0.996, hash(q)) * smoothstep(0.05, 0.4, h); c += vec3(st) * 0.9; }
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    side: THREE.BackSide, depthWrite: false, fog: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 16), m);
  mesh.renderOrder = -10;
  return mesh;
}

/** A painted card at the horizon (far city, islands, mountains…). */
export function horizonCard(draw: (c: CanvasRenderingContext2D) => void, opacity = 0.85) {
  const tex = canvasTex(2048, 360, draw);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(1100, 150), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity, fog: false, depthWrite: false, toneMapped: false }));
  m.renderOrder = -9;
  return m;
}
/** Far city (clock tower, dome, big wheel, towers) painted on a card at the horizon. */
export function skyline() {
  return horizonCard((c) => {
    const layer = (col: string, base: number, hMin: number, hMax: number, seed: number) => {
      c.fillStyle = col;
      let r = seed * 9301 + 49297;
      const rand = () => { r = (r * 9301 + 49297) % 233280; return r / 233280; };
      for (let x = 0; x < 2048;) {
        const w = 40 + rand() * 90;
        const h = hMin + rand() * (hMax - hMin);
        c.fillRect(x, base - h, w, h + 2);
        if (rand() < 0.2) c.fillRect(x + w * 0.4, base - h - 40, w * 0.2, 42);
        x += w + rand() * 46;
      }
    };
    layer('#cfe3f6', 360, 40, 130, 3);
    // landmarks
    c.fillStyle = '#b2cdea';
    c.fillRect(560, 120, 54, 240); c.beginPath(); c.moveTo(552, 122); c.lineTo(587, 40); c.lineTo(622, 122); c.fill(); // clock tower
    c.fillStyle = '#e8f2fc'; c.beginPath(); c.arc(587, 160, 18, 0, Math.PI * 2); c.fill();
    c.fillStyle = '#b2cdea'; c.beginPath(); c.arc(1260, 250, 90, Math.PI, 0); c.fill(); c.fillRect(1170, 250, 180, 110); c.fillRect(1252, 140, 16, 30); // dome
    c.strokeStyle = '#b2cdea'; c.lineWidth = 6; c.beginPath(); c.arc(1640, 200, 120, 0, Math.PI * 2); c.stroke(); // big wheel
    for (let i = 0; i < 12; i++) { const a = (i / 12) * Math.PI * 2; c.beginPath(); c.moveTo(1640, 200); c.lineTo(1640 + Math.cos(a) * 120, 200 + Math.sin(a) * 120); c.lineWidth = 2; c.stroke(); }
    c.lineWidth = 8; c.beginPath(); c.moveTo(1600, 360); c.lineTo(1640, 200); c.lineTo(1680, 360); c.stroke();
    layer('#bcd5ee', 360, 20, 80, 41);
  });
}

export function cloud(tint = 0xffffff) {
  const g = new Geo();
  const n = 5 + Math.floor(rnd() * 3);
  for (let i = 0; i < n; i++) g.blob((i - n / 2) * 4.2 + rnd() * 2, rnd() * 2.5, rnd() * 3, 4 + rnd() * 3, i % 2 ? tint : shade(tint, -0.03), 0.75);
  const mesh = new THREE.Mesh(g.build(), new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: RAMP, fog: false }));
  mesh.renderOrder = -8;
  return mesh;
}

/* ----------------------------------------------------------- particles */
export function softDot() {
  return canvasTex(64, 64, (c) => {
    const g = c.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,.8)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  });
}
