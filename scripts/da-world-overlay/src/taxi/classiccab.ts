/**
 * Taxi Rush — the classic cab: a 1950s convertible, built here from code.
 *
 * Crazy-Taxi style (docs/taxi-arte-v2.md §B): a long lofted body with a hood
 * crown and two ribs, fish-tail fins with teardrop tail-lights, tube bumpers
 * with bullet guards, a seven-bar grille between four round lamps, white-wall
 * tyres, a chrome-framed wrap-around windshield, red bench seats and a TAXI
 * sign on a chrome hoop over the back seat.
 *
 * Budget: 6 draw calls (paint, palette, glass, lamps, tail-lights, the four
 * wheels instanced), 5 materials, ~13 k triangles. Chrome, rubber, the seats,
 * the dash, the checker band and the plate all share ONE "palette" material: a
 * small atlas whose roughness/metalness live in a second texture, so every one
 * of them is a different texel of the same draw. Only the hull and the wheels
 * cast the sun's shadow (the hull is the shadow proxy for everything on it).
 *
 * Everything is modelled in metres at the spec's size (4.6 m long) and the
 * root is scaled to the game's car size.
 */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { CAR_LENGTH, type DriverSeat, type Livery, type RimFinish, type Sign } from './sportcar';

export interface ClassicLook {
  color: string;
  stripe: Livery;
  rims: RimFinish;
  roof: Sign;
  number: string;
}

export interface ClassicCab {
  /** Scaled to the game; add it to the taxi's group. */
  root: THREE.Group;
  /** The body on its springs (rolls, pitches, heaves); people sit in here, in metres. */
  sprung: THREE.Group;
  /** Driver's seat, in `sprung` space (metres); `scale` makes a 1.7 m adult of the 1.58-unit rig. */
  driver: DriverSeat;
  /** The back bench: up to two passengers, in `sprung` space. */
  rear: DriverSeat[];
  /** Where the exhaust pipe ends, in `sprung` space. */
  exhaust: THREE.Vector3;
  wheelRadius: number;
  /** Per frame. `roll`/`pitch` in radians (three.js axes), `heave` in metres: the body on its springs. */
  animate(speed: number, steer: number, dt: number, braking: boolean, night: number, roll: number, pitch: number, heave: number): void;
  dispose(): void;
}

/* ------------------------------------------------------------ dimensions -- */

const HL = 2.3; // half length
const AXLE = 1.35; // wheelbase 2.7
const TRACK = 0.78; // wheel centre, either side
const WR = 0.37; // wheel radius (Ø 0.74)
const WW = 0.24;
const ARCH_R = 0.47;
const FLOOR = 0.34;
const WALL = 0.075; // door thickness
const COCKPIT_F = 0.45; // the cowl
const COCKPIT_R = -1.22; // behind the back seat
/** The fins: the top edge is a quadratic from p0 over p1 to the tip p2 (z, y); `x` at the base. */
const FIN = { p0: [-1.3, 0.9], p1: [-1.8, 0.93], p2: [-2.2, 1.25], cant: 0.08, x: 0.86 - 0.08 * 0.88 } as const;
const finX = (y: number): number => FIN.x + FIN.cant * y;
/** Where the springs pivot: about the centre of mass. */
const PIVOT_Y = 0.55;
/** The game's scale: the same as the sports car, so the physics and the people fit. */
export const CAB_SCALE = CAR_LENGTH / 4.36;

const sstep = (a: number, b: number, x: number): number => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};

/** Piecewise cubic through (z, y) keys, sorted by z. */
function curve(keys: [number, number][], z: number): number {
  if (z <= keys[0][0]) return keys[0][1];
  const n = keys.length;
  if (z >= keys[n - 1][0]) return keys[n - 1][1];
  let i = 0;
  while (z > keys[i + 1][0]) i++;
  const [z0, y0] = keys[i], [z1, y1] = keys[i + 1];
  const h = z1 - z0, t = (z - z0) / h;
  const m = (k: number): number => {
    const a = keys[Math.max(0, k - 1)], b = keys[Math.min(n - 1, k + 1)];
    return (b[1] - a[1]) / (b[0] - a[0]);
  };
  const m0 = m(i) * h, m1 = m(i + 1) * h;
  const t2 = t * t, t3 = t2 * t;
  return (2 * t3 - 3 * t2 + 1) * y0 + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * y1 + (t3 - t2) * m1;
}

const TOP_KEYS: [number, number][] = [
  [-2.3, 0.76], [-2.18, 0.86], [-1.85, 0.91], [-1.3, 0.93], [-1.0, 0.95],
  [0.45, 0.95], [0.75, 0.93], [1.4, 0.9], [1.95, 0.87], [2.2, 0.84], [2.3, 0.78],
];
const halfWidth = (z: number): number => { const e = Math.max(0, (Math.abs(z) - 1.85) / 0.45); return 0.95 - 0.13 * e * e; };
const topY = (z: number): number => curve(TOP_KEYS, z);
const crown = (z: number): number => sstep(0.5, 0.85, z) * 0.06 + (1 - sstep(-1.6, -1.3, z)) * 0.035;
const bottomY = (z: number): number => { const e = Math.max(0, (Math.abs(z) - 1.85) / 0.45); return 0.24 + 0.1 * e * e; };
function archY(z: number): number {
  let y = 0;
  for (const zc of [AXLE, -AXLE]) {
    const d = Math.abs(z - zc);
    if (d < ARCH_R) y = Math.max(y, WR + Math.sqrt(ARCH_R * ARCH_R - d * d));
  }
  return y;
}
/** 0 where the body is closed (hood, deck), 1 over the open cockpit. */
const openness = (z: number): number => sstep(COCKPIT_R - 0.12, COCKPIT_R, z) * (1 - sstep(COCKPIT_F, COCKPIT_F + 0.12, z));
/** Top of the hull at (z, x), crown included. */
const hullTop = (z: number, x: number): number => { const w = halfWidth(z); return topY(z) + crown(z) * Math.max(0, 1 - (x / w) ** 2); };
const _sec: number[] = [];
/** The outside of the hull at (z, y): its x on the left flank. */
function flankX(z: number, y: number): number {
  section(z, _sec);
  // shoulder, flank and rocker run from point 7 to point 17, top to bottom
  for (let k = 7; k < 17; k++) {
    const y0 = _sec[k * 2 + 1], y1 = _sec[k * 2 + 3];
    if ((y <= y0 && y >= y1) || (y >= y0 && y <= y1)) {
      const t = Math.abs(y1 - y0) < 1e-6 ? 0 : (y - y0) / (y1 - y0);
      return _sec[k * 2] + (_sec[k * 2 + 2] - _sec[k * 2]) * t;
    }
  }
  return halfWidth(z);
}

/** The left half (x ≥ 0) of the hull's cross-section at z: top centre round to bottom centre. */
function section(z: number, out: number[]): void {
  out.length = 0;
  const w = halfWidth(z), t = topY(z), c = crown(z), b = bottomY(z);
  const sb = Math.max(b, archY(z));
  const h = t - sb;
  const o = openness(z);
  const rT = THREE.MathUtils.lerp(Math.min(0.09, h * 0.4), WALL - 0.02, o);
  const rB = Math.min(0.07, h * 0.3);
  // top (or, over the cockpit, the floor and the inner face of the doors)
  for (let i = 0; i < 8; i++) {
    const cx = (i / 7) * (w - rT), cy = t + c * Math.max(0, 1 - (cx / w) ** 2);
    let ox: number, oy: number;
    if (i <= 3) { ox = (i / 3) * (w - WALL - 0.1); oy = FLOOR; }
    else { const k = (i - 3) / 4; ox = w - WALL - 0.03 * (1 - k); oy = FLOOR + (t - FLOOR) * Math.pow(k, 0.85); }
    out.push(cx + (ox - cx) * o, cy + (oy - cy) * o);
  }
  // the rounded shoulder
  for (let k = 1; k <= 3; k++) { const a = (1 - k / 3) * Math.PI / 2; out.push(w - rT + rT * Math.cos(a), t - rT + rT * Math.sin(a)); }
  // the flank
  for (let k = 1; k <= 3; k++) { const f = k / 4; out.push(w + 0.018 * Math.sin(Math.PI * f), (t - rT) * (1 - f) + (sb + rB) * f); }
  // the rocker
  for (let k = 0; k <= 3; k++) { const a = -(k / 3) * Math.PI / 2; out.push(w - rB + rB * Math.cos(a), sb + rB + rB * Math.sin(a)); }
  // the wheel housing (zero length away from the arches), then the floor pan
  out.push(w - 0.32, sb, w - 0.32, b, 0, b);
}

/** Loft the half sections along z, then mirror: the paint hull. */
function hullGeometry(): THREE.BufferGeometry {
  const zs: number[] = [];
  for (let z = -HL; z < HL - 1e-6;) {
    zs.push(z);
    const nearArch = Math.abs(Math.abs(z) - AXLE) < ARCH_R + 0.08;
    const nearEdge = Math.abs(z - COCKPIT_F - 0.06) < 0.1 || Math.abs(z - COCKPIT_R + 0.06) < 0.1 || Math.abs(z) > HL - 0.25;
    z += nearArch || nearEdge ? 0.055 : 0.11;
  }
  zs.push(HL);
  const sec: number[] = [];
  section(0, sec);
  const n = sec.length / 2, m = zs.length;
  const pos: number[] = [];
  for (const z of zs) { section(z, sec); for (let i = 0; i < n; i++) pos.push(sec[i * 2], sec[i * 2 + 1], z); }
  const idx: number[] = [];
  // which way round? the quad at the middle of the hood's crown must face up
  const jh = Math.floor(m * 0.85);
  const P3 = (v: number): THREE.Vector3 => new THREE.Vector3(pos[v * 3], pos[v * 3 + 1], pos[v * 3 + 2]);
  const o0 = P3(jh * n), up = P3(jh * n + 1).sub(o0).cross(P3((jh + 1) * n).sub(o0));
  const flip = up.y < 0;
  for (let j = 0; j < m - 1; j++) for (let i = 0; i < n - 1; i++) {
    const a = j * n + i, b = (j + 1) * n + i, c = b + 1, d = a + 1;
    if (flip) idx.push(a, b, d, b, c, d); else idx.push(a, d, b, b, d, c);
  }
  // end caps: fans from the section's centroid
  const cap = (j: number, front: boolean): void => {
    let cx = 0, cy = 0;
    for (let i = 0; i < n; i++) { cx += pos[(j * n + i) * 3]; cy += pos[(j * n + i) * 3 + 1]; }
    const base = pos.length / 3;
    const z = zs[j];
    for (let i = 0; i < n; i++) pos.push(pos[(j * n + i) * 3], pos[(j * n + i) * 3 + 1], z);
    pos.push(cx / n, cy / n, z + (front ? 0.012 : -0.012));
    const ctr = base + n;
    const tri = (a: number, b: number): void => {
      // keep the fan facing out of the car (+z at the nose, −z at the tail)
      const pa = P3(a), nz = P3(b).sub(pa).cross(P3(ctr).sub(pa)).z;
      if ((nz > 0) === front) idx.push(a, b, ctr); else idx.push(b, a, ctr);
    };
    for (let i = 0; i < n - 1; i++) tri(base + i, base + i + 1);
    tri(base + n - 1, base); // close along the centre line
  };
  const capStart = pos.length / 3;
  cap(m - 1, true);
  cap(0, false);
  const half = new THREE.BufferGeometry();
  half.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  half.setIndex(idx);
  half.computeVertexNormals();
  // the cap vertices get the cap's own flat normal (a crisp edge where the bumper sits)
  const nrm = half.getAttribute('normal') as THREE.BufferAttribute;
  for (let v = capStart; v < pos.length / 3; v++) nrm.setXYZ(v, 0, 0, pos[v * 3 + 2] > 0 ? 1 : -1);
  return withMirror(half);
}

/** A geometry plus its mirror image across x = 0 (winding fixed). */
function withMirror(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const m = g.clone();
  m.scale(-1, 1, 1);
  const ix = m.getIndex();
  if (ix) { const a = ix.array as Uint16Array | Uint32Array; for (let k = 0; k < a.length; k += 3) { const t = a[k + 1]; a[k + 1] = a[k + 2]; a[k + 2] = t; } ix.needsUpdate = true; }
  const out = merge([g, m], !!g.getAttribute('uv'));
  g.dispose(); m.dispose();
  return out;
}

/* ------------------------------------------------------------ geometry utils -- */

function ensureIndex(g: THREE.BufferGeometry): THREE.BufferGeometry {
  if (!g.index) { const n = g.getAttribute('position').count; const a: number[] = new Array(n); for (let i = 0; i < n; i++) a[i] = i; g.setIndex(a); }
  return g;
}
/** Merge, keeping position + normal (+ uv when `uv`). Disposes the inputs. */
function merge(parts: THREE.BufferGeometry[], uv = false): THREE.BufferGeometry {
  for (const g of parts) {
    ensureIndex(g);
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal' && !(uv && k === 'uv')) g.deleteAttribute(k);
    if (uv && !g.getAttribute('uv')) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
    if (!g.getAttribute('normal')) g.computeVertexNormals();
  }
  const out = mergeGeometries(parts, false)!;
  for (const g of parts) g.dispose();
  return out;
}
const at = (g: THREE.BufferGeometry, x: number, y: number, z: number): THREE.BufferGeometry => g.translate(x, y, z);
/** Every vertex samples the same texel. */
function flat(g: THREE.BufferGeometry, uv: [number, number]): THREE.BufferGeometry {
  const n = g.getAttribute('position').count, a = new Float32Array(n * 2);
  for (let i = 0; i < n; i++) { a[i * 2] = uv[0]; a[i * 2 + 1] = uv[1]; }
  g.setAttribute('uv', new THREE.BufferAttribute(a, 2));
  return g;
}
/** Map the geometry's own 0..1 uvs into a pixel rectangle of an atlas (W×H, flipY). */
function remapUV(g: THREE.BufferGeometry, W: number, H: number, x0: number, y0: number, x1: number, y1: number): THREE.BufferGeometry {
  const uv = g.getAttribute('uv') as THREE.BufferAttribute;
  for (let i = 0; i < uv.count; i++) uv.setXY(i, (x0 + uv.getX(i) * (x1 - x0)) / W, 1 - (y0 + (1 - uv.getY(i)) * (y1 - y0)) / H);
  return g;
}
function tube(points: THREE.Vector3[], r: number, seg: number, radial = 8): THREE.BufferGeometry {
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), seg, r, radial, false);
}
const V = (x: number, y: number, z: number): THREE.Vector3 => new THREE.Vector3(x, y, z);
const mirrorPts = (pts: THREE.Vector3[]): THREE.Vector3[] => [...pts, ...pts.slice(0, -1).reverse().map((p) => V(-p.x, p.y, p.z))];

/** A ribbon laid on a surface: `fn(u, v)` gives the point for u, v ∈ [0, 1]. */
function ribbon(nu: number, nv: number, fn: (u: number, v: number, out: THREE.Vector3) => void): THREE.BufferGeometry {
  const pos: number[] = [], uv: number[] = [], idx: number[] = [];
  const p = new THREE.Vector3();
  for (let j = 0; j <= nv; j++) for (let i = 0; i <= nu; i++) {
    fn(i / nu, j / nv, p);
    pos.push(p.x, p.y, p.z); uv.push(i / nu, j / nv);
  }
  for (let j = 0; j < nv; j++) for (let i = 0; i < nu; i++) {
    const a = j * (nu + 1) + i, b = a + 1, c = a + nu + 2, d = a + nu + 1;
    idx.push(a, b, c, a, c, d);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}
/** Flip a geometry's winding (for ribbons whose parametrisation faces in). */
function flipWinding(g: THREE.BufferGeometry): THREE.BufferGeometry {
  const ix = g.getIndex()!; const a = ix.array as Uint16Array | Uint32Array;
  for (let k = 0; k < a.length; k += 3) { const t = a[k + 1]; a[k + 1] = a[k + 2]; a[k + 2] = t; }
  ix.needsUpdate = true;
  g.computeVertexNormals();
  return g;
}

/* ------------------------------------------------------------ the atlases -- */

const PW = 512, PH = 128;
/** Palette swatches: colour, roughness, metalness. Row y 48..63, 16 px each. */
const SW = {
  chrome: ['#e8edf2', 0.12, 1], tyre: ['#1b1c20', 0.9, 0], wall: ['#f4f4f4', 0.55, 0], seat: ['#c0272d', 0.75, 0],
  cream: ['#f1e6c8', 0.6, 0], dash: ['#e8d9b0', 0.6, 0], dark: ['#1e2024', 0.5, 0.2], gold: ['#e0b24a', 0.2, 1],
  black: ['#15171a', 0.35, 0.6], grille: ['#26282c', 0.4, 0.5], carpet: ['#6e1418', 0.95, 0], ivory: ['#f3ead2', 0.35, 0],
  // hub caps face the verge: a satin chrome so they read white, not as a mirror of the grass
  hub: ['#f2f4f6', 0.3, 0.7],
} as const;
type Swatch = keyof typeof SW;
const SW_KEYS = Object.keys(SW) as Swatch[];
const sw = (k: Swatch): [number, number] => [(SW_KEYS.indexOf(k) * 16 + 8) / PW, 1 - 56 / PH];

function paletteTextures(livery: Livery, number: string): { map: THREE.CanvasTexture; orm: THREE.CanvasTexture } {
  const a = document.createElement('canvas'); a.width = PW; a.height = PH;
  const b = document.createElement('canvas'); b.width = PW; b.height = PH;
  const c = a.getContext('2d')!, o = b.getContext('2d')!;
  o.fillStyle = 'rgb(0,140,0)'; o.fillRect(0, 0, PW, PH);
  c.fillStyle = '#808080'; c.fillRect(0, 0, PW, PH);
  // the livery band: 3 rows × 32 cells of 16 px (cells of 0.14 m on the car)
  if (livery === 'checker') {
    for (let x = 0; x < 32; x++) for (let y = 0; y < 3; y++) { c.fillStyle = (x + y) % 2 ? '#14151a' : '#f4f4f4'; c.fillRect(x * 16, y * 16, 16, 16); }
  } else if (livery === 'stripe') {
    c.fillStyle = '#14151a'; c.fillRect(0, 0, PW, 48);
    c.fillStyle = '#f4f4f4'; c.fillRect(0, 20, PW, 8);
  } else if (livery === 'flames') {
    c.fillStyle = '#c4161c'; c.fillRect(0, 0, PW, 48);
    const g = c.createLinearGradient(0, 0, PW, 0);
    g.addColorStop(0, '#ffe45c'); g.addColorStop(0.5, '#ff8a1f'); g.addColorStop(1, '#ff4a1a');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(PW, 6);
    for (let i = 0; i <= 8; i++) { const x = PW - i * 64; c.quadraticCurveTo(x - 20, 2 + (i % 2) * 10, x - 64, 16 + (i % 3) * 6); }
    c.lineTo(0, 40); c.lineTo(PW, 44); c.closePath(); c.fill();
  }
  o.fillStyle = 'rgb(0,115,0)'; o.fillRect(0, 0, PW, 48);
  // swatches
  SW_KEYS.forEach((k, i) => {
    const [col, r, m] = SW[k];
    c.fillStyle = col; c.fillRect(i * 16, 48, 16, 16);
    o.fillStyle = `rgb(0,${Math.round(r * 255)},${Math.round(m * 255)})`; o.fillRect(i * 16, 48, 16, 16);
  });
  // the plate (x 0..127, y 64..127)
  c.fillStyle = '#ffd21a'; c.fillRect(0, 64, 128, 64);
  c.strokeStyle = '#14151a'; c.lineWidth = 4; c.strokeRect(4, 68, 120, 56);
  c.fillStyle = '#14151a'; c.font = '900 30px "Arial Black",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(`TX·${number}`, 64, 98);
  o.fillStyle = 'rgb(0,128,0)'; o.fillRect(0, 64, 128, 64);
  const map = new THREE.CanvasTexture(a); map.colorSpace = THREE.SRGBColorSpace; map.anisotropy = 4;
  const orm = new THREE.CanvasTexture(b); orm.anisotropy = 4;
  return { map, orm };
}

const LW = 256, LH = 64;
/** The lamps: the TAXI face (x 0..199), a cream lens (x 208..255, top) and the sign's body (bottom). */
function lampTexture(kind: Sign): THREE.CanvasTexture {
  const cv = document.createElement('canvas'); cv.width = LW; cv.height = LH;
  const c = cv.getContext('2d')!;
  const neon = kind === 'neon';
  c.fillStyle = neon ? '#22093d' : '#ffd21a'; c.fillRect(0, 0, 200, LH);
  c.font = '900 52px "Arial Black","Trebuchet MS",Arial,sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (neon) { c.shadowColor = '#ff3df2'; c.shadowBlur = 10; c.fillStyle = '#ff9af8'; } else c.fillStyle = '#111111';
  c.fillText('TAXI', 100, 35);
  c.shadowBlur = 0;
  c.fillStyle = '#fff6dc'; c.fillRect(200, 0, 56, 32);
  c.fillStyle = neon ? '#3a1466' : '#ffd21a'; c.fillRect(200, 32, 56, 32);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/* ------------------------------------------------------------ the cab -- */

export function buildClassicCab(look: ClassicLook): ClassicCab {
  const root = new THREE.Group();
  root.name = 'classic-cab';
  root.scale.setScalar(CAB_SCALE);
  const sprung = new THREE.Group();
  root.add(sprung);

  /* ---- materials (5) ---- */
  const paint = new THREE.MeshPhysicalMaterial({ color: look.color, metalness: 0.15, roughness: 0.35, clearcoat: 0.6, clearcoatRoughness: 0.2 });
  const { map, orm } = paletteTextures(look.stripe, look.number);
  const palette = new THREE.MeshStandardMaterial({ map, roughnessMap: orm, metalnessMap: orm, roughness: 1, metalness: 1 });
  const glass = new THREE.MeshStandardMaterial({ color: '#9bd3ff', metalness: 0.1, roughness: 0.05, transparent: true, opacity: 0.35, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.5 });
  const lampTex = lampTexture(look.roof);
  const lamps = new THREE.MeshStandardMaterial({ map: lampTex, emissiveMap: lampTex, emissive: new THREE.Color('#ffffff'), emissiveIntensity: 0.6, roughness: 0.25 });
  const tail = new THREE.MeshStandardMaterial({ color: '#d3202b', emissive: new THREE.Color('#ff2030'), emissiveIntensity: 0.6, roughness: 0.25 });
  const materials: THREE.Material[] = [paint, palette, glass, lamps, tail];
  const textures: THREE.Texture[] = [map, orm, lampTex];

  /* ---- paint: hull, fins, hood ribs ---- */
  const paintParts: THREE.BufferGeometry[] = [hullGeometry()];
  {
    // fish-tail fins: a side-view blade rising 0.35 m off the deck, raked 18° back at the tail
    const s = new THREE.Shape();
    s.moveTo(FIN.p0[0], FIN.p0[1] - 0.06);
    s.lineTo(FIN.p0[0], FIN.p0[1]);
    s.quadraticCurveTo(FIN.p1[0], FIN.p1[1], FIN.p2[0], FIN.p2[1]);
    s.lineTo(-2.3, FIN.p2[1] - 0.02);
    s.lineTo(-2.3 + Math.tan((18 * Math.PI) / 180) * 0.45, FIN.p2[1] - 0.47);
    s.lineTo(-2.2, 0.72);
    s.closePath();
    // drawn side-on (shape x = car z, shape y = car y), extruded across the car
    const fin = new THREE.ExtrudeGeometry(s, { depth: 0.07, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 2, curveSegments: 10 });
    fin.rotateY(-Math.PI / 2); // (sx, sy, sz) → (x −sz, y sy, z sx)
    fin.translate(0.035, 0, 0).rotateZ(-FIN.cant).translate(FIN.x, 0, 0);
    paintParts.push(withMirror(fin));
    // two ribs along the hood
    for (const x of [0.3]) {
      const pts: THREE.Vector3[] = [];
      for (let z = 0.66; z <= 2.12; z += 0.12) pts.push(V(x, hullTop(z, x) + 0.004, z));
      paintParts.push(withMirror(tube(pts, 0.02, 14, 5)));
    }
  }
  const hull = new THREE.Mesh(merge(paintParts), paint);
  hull.castShadow = true; hull.receiveShadow = true;
  sprung.add(hull);

  /* ---- palette: chrome, interior, livery, plate ---- */
  const pal: THREE.BufferGeometry[] = [];
  const P = (g: THREE.BufferGeometry, s: Swatch): void => { pal.push(flat(g, sw(s))); };
  // bumpers: 0.14 m tubes wrapping the corners
  P(tube(mirrorPts([V(0.9, 0.42, 2.0), V(0.9, 0.39, 2.26), V(0.62, 0.37, 2.4), V(0, 0.37, 2.44)]), 0.07, 24, 7), 'chrome');
  P(tube(mirrorPts([V(0.9, 0.42, -2.0), V(0.9, 0.39, -2.26), V(0.62, 0.37, -2.4), V(0, 0.37, -2.44)]), 0.07, 24, 7), 'chrome');
  // bullet guards
  for (const x of [-0.42, 0.42]) {
    const bullet = new THREE.LatheGeometry([[0, 0], [0.07, 0], [0.068, 0.06], [0.05, 0.13], [0, 0.18]].map(([r, y]) => new THREE.Vector2(r, y)), 12).rotateX(Math.PI / 2);
    P(at(bullet, x, 0.46, 2.36), 'chrome');
  }
  // the grille: a dark mouth and seven bars
  P(at(new THREE.BoxGeometry(0.54, 0.22, 0.04), 0, 0.565, 2.3), 'grille');
  for (let i = 0; i < 7; i++) P(at(new THREE.CylinderGeometry(0.012, 0.012, 0.52, 6).rotateZ(Math.PI / 2), 0, 0.47 + i * 0.032, 2.33), 'chrome');
  // the lamp rings: 0.26 m outboard, 0.18 m inboard
  for (const s of [-1, 1]) {
    P(at(new THREE.TorusGeometry(0.13, 0.022, 6, 20), s * 0.6, 0.6, 2.31), 'chrome');
    P(at(new THREE.TorusGeometry(0.09, 0.018, 6, 16), s * 0.39, 0.6, 2.31), 'chrome');
  }
  // side moulding (0.05 m) the whole length, the livery band (0.28 m) between the arches
  {
    // the moulding runs under the shoulder, the whole length (over the arches too)
    const pts: THREE.Vector3[] = [];
    for (let z = -2.1; z <= 2.1001; z += 0.14) { const y = topY(z) - 0.045; pts.push(V(flankX(z, y) + 0.008, y, z)); }
    pal.push(withMirror(flat(tube(pts, 0.025, 34, 5), sw('chrome'))));
    // chrome along the top edge of each fin
    const fpts: THREE.Vector3[] = [];
    for (let k = 0; k <= 10; k++) {
      const t = k / 10, a = (1 - t) * (1 - t), b = 2 * (1 - t) * t, c = t * t;
      const z = a * FIN.p0[0] + b * FIN.p1[0] + c * FIN.p2[0], y = a * FIN.p0[1] + b * FIN.p1[1] + c * FIN.p2[1] + 0.012;
      fpts.push(V(finX(y), y, z));
    }
    pal.push(withMirror(flat(tube(fpts, 0.02, 14, 5), sw('chrome'))));
  }
  if (look.stripe !== 'none') {
    const len = 1.82, cells = len / 0.14;
    const band = ribbon(16, 2, (u, v, out) => {
      const z = -0.91 + u * len, y = 0.56 + v * 0.28;
      out.set(flankX(z, y) + 0.006, y, z);
    });
    flipWinding(band);
    remapUV(band, PW, PH, 0, 0, cells * 16, 32);
    pal.push(withMirror(band));
    // the hood stripe: 0.42 m (three cells) down the middle
    const hl = 1.5, hcells = hl / 0.14;
    const hood = ribbon(3, 12, (u, v, out) => {
      const x = -0.21 + u * 0.42, z = 0.66 + v * hl;
      out.set(x, hullTop(z, x) + 0.006, z);
    });
    flipWinding(hood);
    // u runs across (3 cells = 3 rows of the atlas band), v along: swap into the atlas
    const huv = hood.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < huv.count; i++) { const u = huv.getX(i), v = huv.getY(i); huv.setXY(i, (v * hcells * 16) / PW, 1 - (u * 48) / PH); }
    pal.push(hood);
  }
  // plates: rear on the trunk, front under the grille
  {
    const plate = new THREE.PlaneGeometry(0.3, 0.15);
    remapUV(plate, PW, PH, 0, 64, 128, 128);
    pal.push(at(plate.clone().rotateY(Math.PI), 0, 0.54, -2.315));
    pal.push(at(plate, 0, 0.31, 2.43));
    P(at(new THREE.BoxGeometry(0.32, 0.17, 0.02), 0, 0.31, 2.418), 'chrome');
  }
  // the exhaust
  const exhaust = V(-0.5, 0.25, -2.48);
  P(at(new THREE.CylinderGeometry(0.04, 0.04, 0.2, 10).rotateX(Math.PI / 2), -0.5, 0.25, -2.36), 'chrome');
  // hood ornament
  P(at(new THREE.SphereGeometry(0.04, 8, 6).scale(0.8, 0.7, 3), 0, hullTop(2.08, 0) + 0.02, 2.08), 'chrome');
  // windshield frame and the glass itself (wrap-around, raked 28°)
  const WS = { z: 0.47, y0: 0.95, h: 0.4, w: 0.84, rake: Math.tan((28 * Math.PI) / 180) };
  const ws = (u: number, v: number, out: THREE.Vector3): void => {
    const x = (-1 + 2 * u) * WS.w * (1 - 0.06 * v);
    out.set(x, WS.y0 + WS.h * v, WS.z - WS.rake * WS.h * v - 0.16 * Math.pow(Math.abs(x) / WS.w, 4));
  };
  const glassGeo = ribbon(12, 2, ws);
  {
    const tmp = new THREE.Vector3();
    const edge = (fn: (k: number) => [number, number], n: number): THREE.Vector3[] => { const pts: THREE.Vector3[] = []; for (let k = 0; k <= n; k++) { const [u, v] = fn(k / n); ws(u, v, tmp); pts.push(tmp.clone()); } return pts; };
    P(tube(edge((t) => [t, 1], 12), 0.02, 20, 6), 'chrome');
    P(tube(edge((t) => [0, t], 3), 0.022, 4, 6), 'chrome');
    P(tube(edge((t) => [1, t], 3), 0.022, 4, 6), 'chrome');
  }
  // interior: the dash, the wheel, two red benches with cream rolls, carpet, arm-rests
  P(at(new RoundedBoxGeometry(1.66, 0.2, 0.2, 1, 0.05), 0, 0.86, 0.4), 'dash');
  const wheelC = V(0.38, 0.88, 0.17), wheelTilt = 0.5;
  {
    const ring = new THREE.TorusGeometry(0.19, 0.016, 6, 22).rotateX(wheelTilt);
    P(at(ring, wheelC.x, wheelC.y, wheelC.z), 'ivory');
    for (const a of [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3]) {
      const sp = new THREE.CylinderGeometry(0.008, 0.008, 0.19, 4).translate(0, 0.095, 0).rotateZ(a + Math.PI).rotateX(wheelTilt);
      P(at(sp, wheelC.x, wheelC.y, wheelC.z), 'ivory');
    }
    const col = new THREE.CylinderGeometry(0.02, 0.025, 0.3, 6).translate(0, 0.15, 0).rotateX(Math.PI / 2 + wheelTilt);
    P(at(col, wheelC.x, wheelC.y, wheelC.z), 'dark');
  }
  // backs: 0.55 m in front; the back bench a little lower so its riders show over it
  for (const [z, back, bh] of [[-0.06, -0.37, 0.55], [-0.92, -1.17, 0.46]] as const) {
    const cy = 0.58 + bh / 2 - 0.01, lean = -0.2;
    P(at(new RoundedBoxGeometry(1.7, 0.24, 0.5, 1, 0.06), 0, 0.46, z), 'seat');
    P(at(new RoundedBoxGeometry(1.7, bh, 0.14, 2, 0.06).rotateX(lean), 0, cy, back), 'seat');
    // the cream roll along the top, and tuck-and-roll piping
    const topY = cy + (bh / 2) * Math.cos(lean), topZ = back + (bh / 2) * Math.sin(lean);
    P(at(new THREE.CylinderGeometry(0.055, 0.055, 1.7, 10).rotateZ(Math.PI / 2), 0, topY, topZ - 0.01), 'cream');
    for (const x of [-0.42, 0, 0.42]) P(at(new THREE.BoxGeometry(0.03, bh - 0.06, 0.02).rotateX(lean), x, cy, back - 0.075), 'cream');
  }
  P(at(new THREE.BoxGeometry(1.72, 0.02, 1.62), 0, FLOOR + 0.01, -0.4), 'carpet');
  // the TAXI sign's chrome hoop over the back seat
  const SIGN_Z = -1.3, HOOP_TOP = 1.5;
  P(tube(mirrorPts([V(0.86, 0.9, SIGN_Z), V(0.84, 1.22, SIGN_Z), V(0.64, HOOP_TOP - 0.04, SIGN_Z), V(0.3, HOOP_TOP, SIGN_Z), V(0, HOOP_TOP, SIGN_Z)]), 0.022, 26, 6), 'chrome');

  // chrome rings for the round tail lamps (the lenses are with the tail-lights below)
  for (const x of [0.4, 0.6]) pal.push(withMirror(flat(at(new THREE.TorusGeometry(0.075, 0.016, 6, 16), x, 0.62, -2.31), sw('chrome'))));
  const palMesh = new THREE.Mesh(merge(pal, true), palette);
  palMesh.receiveShadow = true;
  sprung.add(palMesh);

  /* ---- glass ---- */
  const glassMesh = new THREE.Mesh(merge([glassGeo]), glass);
  glassMesh.renderOrder = 2;
  sprung.add(glassMesh);

  /* ---- lamps: four headlights and the sign ---- */
  const lampParts: THREE.BufferGeometry[] = [];
  const lens = (ring: number, x: number): THREE.BufferGeometry => {
    const r = ring / Math.sin(Math.PI * 0.32);
    const g = new THREE.SphereGeometry(r, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.32).rotateX(Math.PI / 2).scale(1, 1, 0.6);
    return flat(at(g, x, 0.6, 2.3 - r * Math.cos(Math.PI * 0.32) * 0.6), [228 / LW, 1 - 16 / LH]);
  };
  for (const s of [-1, 1]) { lampParts.push(lens(0.12, s * 0.6), lens(0.08, s * 0.39)); }
  if (look.roof !== 'none') {
    const box = new THREE.BoxGeometry(0.9, 0.28, 0.22);
    // faces: +x, −x, +y, −y, +z, −z (4 vertices each): text on ±z, the sign's body elsewhere
    const uv = box.getAttribute('uv') as THREE.BufferAttribute;
    for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) {
      const i = f * 4 + k, u = uv.getX(i), v = uv.getY(i);
      if (f >= 4) uv.setXY(i, (2 + u * 196) / LW, 1 - (2 + (1 - v) * 60) / LH);
      else uv.setXY(i, 228 / LW, 1 - 48 / LH);
    }
    lampParts.push(at(box, 0, HOOP_TOP + 0.15, SIGN_Z));
  }
  const lampMesh = new THREE.Mesh(merge(lampParts, true), lamps);
  sprung.add(lampMesh);

  /* ---- tail-lights: teardrops at the end of each fin ---- */
  const drop = new THREE.SphereGeometry(0.075, 12, 8).scale(1, 0.85, 2.0);
  // squeeze the front half into a teardrop's tail
  {
    const p = drop.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < p.count; i++) { const z = p.getZ(i); if (z > 0) { const k = 1 - 0.75 * (z / 0.15); p.setX(i, p.getX(i) * k); p.setY(i, p.getY(i) * k); } }
    drop.computeVertexNormals();
  }
  // and two round lamps a side on the tail panel, ringed in chrome: the cab's rear signature
  const tailParts: THREE.BufferGeometry[] = [at(drop, finX(1.02), 1.02, -2.18)];
  for (const x of [0.4, 0.6]) {
    const r = 0.075;
    const lensG = new THREE.SphereGeometry(r / Math.sin(Math.PI * 0.32), 12, 5, 0, Math.PI * 2, 0, Math.PI * 0.32).rotateX(-Math.PI / 2).scale(1, 1, 0.6);
    tailParts.push(at(lensG, x, 0.62, -2.3 + (r / Math.sin(Math.PI * 0.32)) * Math.cos(Math.PI * 0.32) * 0.6));
  }
  const tailMesh = new THREE.Mesh(withMirror(merge(tailParts)), tail);
  sprung.add(tailMesh);

  /* ---- wheels: one instanced draw for all four ---- */
  const wheelGeo = (() => {
    const parts: THREE.BufferGeometry[] = [];
    // the tyre (lathe around y, turned so the axle runs along x)
    const prof = [[0.25, -0.12], [0.32, -WW / 2], [0.355, -0.105], [WR, -0.065], [WR, 0.065], [0.355, 0.105], [0.32, WW / 2], [0.25, 0.12]].map(([r, y]) => new THREE.Vector2(r, y));
    parts.push(flat(new THREE.LatheGeometry(prof, 18).rotateZ(Math.PI / 2), sw('tyre')));
    for (const s of [-1, 1]) {
      // the white wall
      parts.push(flat(new THREE.RingGeometry(0.262, 0.322, 18, 1).rotateY((s * Math.PI) / 2).translate(s * 0.121, 0, 0), sw('wall')));
      // the hub cap: a dome with a three-bar spinner, so the wheel visibly turns
      const cap = new THREE.LatheGeometry([V(0.258, 0.118, 0), V(0.24, 0.125, 0), V(0.17, 0.138, 0), V(0.08, 0.15, 0), V(0.0, 0.155, 0)].map((p) => new THREE.Vector2(p.x, p.y)), 14);
      cap.rotateZ((-s * Math.PI) / 2);
      const rimSw: Swatch = look.rims === 'gold' ? 'gold' : look.rims === 'black' ? 'black' : 'hub';
      parts.push(flat(cap, sw(rimSw)));
      for (let k = 0; k < 3; k++) {
        const bar = new THREE.BoxGeometry(0.02, 0.2, 0.025).rotateX((k * Math.PI) / 3).translate(s * 0.158, 0, 0);
        parts.push(flat(bar, sw(rimSw === 'hub' ? 'dark' : 'chrome')));
      }
    }
    return merge(parts, true);
  })();
  const wheels = new THREE.InstancedMesh(wheelGeo, palette, 4);
  wheels.castShadow = true;
  wheels.receiveShadow = true;
  wheels.frustumCulled = false;
  root.add(wheels);
  const WHEEL_AT: [number, number][] = [[TRACK, AXLE], [-TRACK, AXLE], [TRACK, -AXLE], [-TRACK, -AXLE]];
  const spin = [0, 0, 0, 0];

  /* ---- seats for people (sprung space, metres) ---- */
  const k = 1.7 / 1.58;
  const hand = (side: number): THREE.Vector3 => {
    const a = side * 1.0; // ten to two
    return V(Math.sin(a) * 0.19, Math.cos(a) * 0.19, -0.02).applyAxisAngle(V(1, 0, 0), wheelTilt).add(wheelC);
  };
  const driver: DriverSeat = {
    hips: V(0.38, 0.7, -0.14),
    hands: [hand(1), hand(-1)],
    feet: [V(0.5, 0.38, 0.46), V(0.27, 0.38, 0.46)],
    recline: 0.22,
    scale: k,
  };
  // the first passenger sits behind the empty seat, so the driver stays in view
  // (out by the doors, clear of the TAXI sign seen from the chase camera)
  const rear: DriverSeat[] = [-0.5, 0.5].map((x) => ({
    hips: V(x, 0.7, -0.95),
    hands: [V(x + 0.12, 0.74, -0.62), V(x - 0.12, 0.74, -0.62)] as [THREE.Vector3, THREE.Vector3],
    feet: [V(x + 0.12, 0.38, -0.36), V(x - 0.12, 0.38, -0.36)] as [THREE.Vector3, THREE.Vector3],
    recline: 0.18,
    scale: k,
  }));

  /* ---- per frame (no allocations) ---- */
  const q = new THREE.Quaternion(), e = new THREE.Euler(), m4 = new THREE.Matrix4(), one = new THREE.Vector3(1, 1, 1);
  const pv = new THREE.Vector3(), wp = new THREE.Vector3();
  const bodyQ = new THREE.Quaternion();
  let lastEnv: boolean | null = null;

  const writeWheels = (steerA: number): void => {
    for (let i = 0; i < 4; i++) {
      const [x, z] = WHEEL_AT[i];
      // where the arch is now, with the body on its springs; the wheel stays on the road
      // until the arch has risen past the spring's travel (±0.06 m), then it hangs
      const rise = wp.set(x, WR, z).applyQuaternion(bodyQ).y + sprung.position.y - WR;
      const lift = Math.max(0, rise - 0.06) + Math.min(0, rise + 0.06) * 0.5;
      e.set(spin[i], i < 2 ? steerA : 0, 0, 'YXZ');
      q.setFromEuler(e);
      m4.compose(pv.set(x, WR + lift, z), q, one);
      wheels.setMatrixAt(i, m4);
    }
    wheels.instanceMatrix.needsUpdate = true;
  };
  bodyQ.identity();
  writeWheels(0);

  return {
    root,
    sprung,
    driver,
    rear,
    exhaust,
    wheelRadius: WR * CAB_SCALE,
    animate(speed, steer, dt, braking, night, roll, pitch, heave) {
      // the body on its springs, pivoting about its centre of mass
      e.set(pitch, 0, roll, 'XYZ');
      bodyQ.setFromEuler(e);
      sprung.quaternion.copy(bodyQ);
      pv.set(0, PIVOT_Y, 0).applyQuaternion(bodyQ);
      sprung.position.set(-pv.x, PIVOT_Y - pv.y + heave, -pv.z);
      // wheels roll (in metres: the game's speed is in scaled units) and the fronts steer up to 28°
      const turn = (speed * dt) / (WR * CAB_SCALE);
      for (let i = 0; i < 4; i++) spin[i] = (spin[i] + turn) % (Math.PI * 2);
      writeWheels(-steer * (28 * Math.PI) / 180);
      lamps.emissiveIntensity = 0.6 + night * 2.2;
      tail.emissiveIntensity = braking ? 3 : 0.6 + night * 1.2;
      // no reflection map (no PMREM): flat light-grey chrome instead of black metal
      let s: THREE.Object3D = root;
      while (s.parent) s = s.parent;
      const env = !!(s as THREE.Scene).environment;
      if (env !== lastEnv) { lastEnv = env; palette.metalness = env ? 1 : 0; }
    },
    dispose() {
      root.removeFromParent();
      for (const o of [hull, palMesh, glassMesh, lampMesh, tailMesh]) o.geometry.dispose();
      wheelGeo.dispose();
      wheels.dispose();
      for (const mt of materials) mt.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
