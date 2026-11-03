/* Toons 3D — builds a teacher's animated 3D model from their card look (skin, hair, beard,
   glasses, outfit, props, height and build). Pure three.js: runs in the browser and in Node
   (scripts/build-toons.mts exports every teacher to public/toons3d/<id>.glb).

   Rig of rigid parts (no skinning, so it stays light and exports cleanly):
     toon → hips → legL, legR, chest → armL, armR, head → eyeL, eyeR
   Every part is ONE mesh with per-vertex colours. Feet at (0, 0, 0), facing +Z, 1 unit = 100
   toon units (the 2D card toon). Clips: idle, walk, run, jump, fall, slide, hit, cheer.

   Hair and beards are shaped, not stuck-on balls:
   - a hair "shell": a sphere around the head pushed out where the hair grows (each style has its
     own hairline: fringe, side part, receding temples, nape…) and sunk inside the head elsewhere;
     curly styles get round curls pushed out of it;
   - long hair: tapered locks hanging from the head (straight, wavy, styled with the ends turned
     in, or spring-like ringlets for curly hair), plus ponytail, bun, fringe and quiff pieces;
   - beards: a shell over the jaw with a hole for the mouth (stubble, short, full + moustache).
   Hair colour shades from darker at the ends to lighter on top, with a soft shine band.

   Look v2 (vinyl-toy style): every piece has a material class (skin, cloth, denim, hair, glossy,
   eye, metal, rubber, lip) stored in the vertex colour's alpha — roughness for non-metals (a < .5)
   and metals (a ≥ .5) — so one mesh per part still renders as soft PBR (runtime.ts reads it).
   Faces have expressions: open / shut ("^ ^") / heart eyes and normal, open-grin, "O", and frown
   mouths as their own nodes; the clips switch them (run = grin, hit = surprise, cheer = joy). */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { TeacherLook } from '../cards/teachers';

import { FACE_OFF, FACES, type Face, type ToonClip } from './meta.ts';

export type V3 = [number, number, number];
export interface SkinTone { c: string; d: string }

const INK = '#1d2a1f';
type Paint = string | ((x: number, y: number, z: number) => THREE.Color);
const col = (hex: string) => new THREE.Color(hex);
const mix = (a: string, b: string, k: number) => '#' + col(a).lerp(col(b), k).getHexString();
const darken = (hex: string, k: number) => '#' + col(hex).multiplyScalar(k).getHexString();
const clamp01 = (x: number) => Math.min(1, Math.max(0, x));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
/** Smooth 0→1 between a and b (works with a > b too). */
const ss = (a: number, b: number, x: number) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };
const ramp = (x: number, a: number, b: number) => clamp01((x - a) / (b - a));

function rng(seed: number) {
  let s = seed >>> 0 || 1;
  return () => { s = (s + 0x6d2b79f5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const hash = (s: string) => { let h = 2166136261; for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };

/* ---------------------------------------------------------------- builder */
export type Mat = 'skin' | 'cloth' | 'denim' | 'hair' | 'glossy' | 'eye' | 'metal' | 'rubber' | 'lip';
/** Alpha code per material: roughness / 2 for non-metals, 0.5 + roughness / 2 for metals. */
const MAT_A: Record<Mat, number> = { skin: 0.26, cloth: 0.42, denim: 0.46, hair: 0.2, glossy: 0.13, eye: 0.025, metal: 0.66, rubber: 0.39, lip: 0.18 };
interface Piece { geo: THREE.BufferGeometry; paint: Paint; mat: Mat }

/** Collects coloured pieces per rig node, then merges each node into one mesh. */
class Builder {
  pieces = new Map<string, Piece[]>();
  /** Material class for the pieces added from now on. */
  mat: Mat = 'cloth';
  /** A primitive placed with position / rotation / scale. */
  add(node: string, geo: THREE.BufferGeometry, paint: Paint, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
    this.put(node, geo.clone().applyMatrix4(m), paint);
  }
  /** Geometry already in the node's space. */
  put(node: string, geo: THREE.BufferGeometry, paint: Paint) {
    const g = geo;
    if (g.getAttribute('uv')) g.deleteAttribute('uv');
    if (!g.getAttribute('normal')) g.computeVertexNormals();
    if (!g.index) g.setIndex([...Array(g.getAttribute('position').count).keys()]);
    const list = this.pieces.get(node) ?? [];
    list.push({ geo: g, paint, mat: this.mat });
    this.pieces.set(node, list);
  }
  mesh(node: string, material: THREE.Material): THREE.Mesh | null {
    const list = this.pieces.get(node);
    if (!list?.length) return null;
    const geos = list.map(({ geo, paint, mat }) => {
      // colours as normalised bytes (linear), a quarter of the size of floats
      const p = geo.getAttribute('position'), n = p.count, arr = new Uint8Array(n * 4);
      const fixed = typeof paint === 'string' ? col(paint) : null;
      const alpha = Math.round(MAT_A[mat] * 255);
      for (let i = 0; i < n; i++) {
        const c = fixed ?? (paint as Exclude<Paint, string>)(p.getX(i), p.getY(i), p.getZ(i));
        arr[i * 4] = Math.round(clamp01(c.r) * 255); arr[i * 4 + 1] = Math.round(clamp01(c.g) * 255); arr[i * 4 + 2] = Math.round(clamp01(c.b) * 255); arr[i * 4 + 3] = alpha;
      }
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', p);
      g.setAttribute('normal', geo.getAttribute('normal'));
      g.setAttribute('color', new THREE.BufferAttribute(arr, 4, true));
      g.setIndex(geo.index);
      return g;
    });
    const merged = mergeGeometries(geos, false)!;
    merged.computeBoundingSphere();
    const m = new THREE.Mesh(merged, material);
    m.name = node + 'Mesh';
    return m;
  }
}

// primitives: smooth enough for soft PBR light (small square-ish tori keep their few segments on purpose)
const sphere = (r = 1, w = 14, h = 10) => new THREE.SphereGeometry(r, Math.min(Math.round(w * 1.35), 24), Math.min(Math.round(h * 1.35), 16));
const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 5, 16);
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
/** A box with rounded edges (buckles, pockets, soles). */
const rbox = (x: number, y: number, z: number, r = Math.min(x, y, z) * 0.35) => {
  const g = new THREE.BoxGeometry(x, y, z, 4, 4, 4);
  const p = g.getAttribute('position') as THREE.BufferAttribute, v = new THREE.Vector3(), c = new THREE.Vector3();
  const h = new THREE.Vector3(x / 2 - r, y / 2 - r, z / 2 - r);
  for (let i = 0; i < p.count; i++) {
    v.fromBufferAttribute(p, i);
    c.set(Math.max(-h.x, Math.min(h.x, v.x)), Math.max(-h.y, Math.min(h.y, v.y)), Math.max(-h.z, Math.min(h.z, v.z)));
    v.sub(c).normalize().multiplyScalar(r).add(c);
    p.setXYZ(i, v.x, v.y, v.z);
  }
  g.deleteAttribute('normal');
  const m = mergeVertices(g);
  m.computeVertexNormals();
  return m;
};
const cyl = (rt: number, rb: number, h: number, seg = 14) => new THREE.CylinderGeometry(rt, rb, h, Math.max(seg, seg >= 10 ? 22 : seg));
const torus = (r: number, t: number, rs = 8, ts = 20, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs >= 6 ? Math.max(rs, 8) : rs, ts >= 12 ? Math.max(ts, 24) : ts, arc);
/** A flat shape with bevelled edges, facing +z (collar flaps, hearts). */
const flat = (pts: [number, number][], depth: number, bevel: number) =>
  new THREE.ExtrudeGeometry(new THREE.Shape(pts.map(([x, y]) => new THREE.Vector2(x, y))), { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 8 });

/* ------------------------------------------------------------ head shapes */
const R = 0.29; // head radius
const HS: V3 = [1, 1.03, 0.92]; // head ellipsoid scale
/** A point on (k × the head ellipsoid) at elevation `el` and azimuth `az` (0 = front, ±π = back). */
const onHead = (el: number, az: number, k = 1) => new THREE.Vector3(Math.sin(az) * Math.cos(el) * R * k * HS[0], Math.sin(el) * R * k * HS[1], Math.cos(az) * Math.cos(el) * R * k * HS[2]);

/**
 * A sphere around the head, pushed out to (1 + thick) where `cover` is 1 and sunk inside the head
 * (radius `inner`) where it is 0 — hair or a beard with any outline.
 */
function shell(cover: (el: number, az: number, d: THREE.Vector3) => number, thick: (el: number, az: number, d: THREE.Vector3, c: number) => number, w = 128, h = 88, inner = 0.86) {
  const g0 = new THREE.SphereGeometry(1, w, h);
  g0.deleteAttribute('uv'); g0.deleteAttribute('normal');
  const g = mergeVertices(g0);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const d = new THREE.Vector3(), cov = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    const el = Math.asin(Math.max(-1, Math.min(1, d.y))), az = Math.atan2(d.x, d.z);
    const c = cover(el, az, d);
    cov[i] = c;
    // the edge eases in (c²·(3−2c)) so the rim meets the skin in a smooth curve, not in steps
    const e = c <= 0 ? 0 : c * c * (3 - 2 * c);
    const r = e <= 0 ? inner : inner + (1 + thick(el, az, d, c) - inner) * e;
    p.setXYZ(i, d.x * r * R * HS[0] * jawK(d.y), d.y * r * R * HS[1], d.z * r * R * HS[2]);
  }
  // keep only triangles that show (at least one corner outside the head), then compact
  const idx = g.index!.array, keep: number[] = [], map = new Int32Array(p.count).fill(-1), pos: number[] = [];
  for (let t = 0; t < idx.length; t += 3) {
    const a = idx[t], b = idx[t + 1], c = idx[t + 2];
    if (cov[a] <= 0 && cov[b] <= 0 && cov[c] <= 0) continue;
    for (const v of [a, b, c]) { if (map[v] < 0) { map[v] = pos.length / 3; pos.push(p.getX(v), p.getY(v), p.getZ(v)); } keep.push(map[v]); }
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setIndex(keep);
  out.computeVertexNormals();
  return out;
}

/**
 * Strand clumps: 0 in the grooves, 1 on the clumps, running away from the pole `w` (a crown, a
 * part or the brow line for hair combed back). `k` clumps around; they fade near the pole.
 */
function strands(w: THREE.Vector3, k: number, seed: number) {
  const W = w.clone().normalize();
  const ref = Math.abs(W.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1);
  const u = new THREE.Vector3().crossVectors(W, ref).normalize(), v = new THREE.Vector3().crossVectors(W, u);
  const r = rng(seed), p0 = r() * 6.28, p1 = r() * 6.28;
  return (d: THREE.Vector3) => {
    const a = Math.atan2(d.dot(v), d.dot(u)), along = d.dot(W);
    const g = Math.abs(Math.sin(a * k * 0.5 + Math.sin(a * 3 + p0) * 0.9 + along * 1.6 + p1));
    return 1 - (1 - Math.sqrt(g)) * ss(0.985, 0.9, along);
  };
}

/** Jaw width factor at height dy (−1…1 on the head): narrower chin for her, a squarer jaw for him. */
let jawK = (_dy: number) => 1;

/** Hairline: elevation where hair starts at the front, the sides (over the ears) and the back. */
function hairline(el: number, az: number, front: number, side: number, back: number, soft = 0.11) {
  const t = Math.abs(az) / Math.PI;
  // past the ears the line drops quickly to the nape (sqrt), so the back of the head is covered
  const line = t < 0.5 ? lerp(front, side, ss(0, 1, t / 0.5)) : lerp(side, back, ss(0, 1, Math.sqrt((t - 0.5) / 0.5)));
  return ss(line - soft, line + soft, el);
}

/** Round curls (cellular bumps) over the sphere: 0…1 at direction d. */
function curls(n: number, seed: number, size = 1) {
  const r = rng(seed), pts: THREE.Vector3[] = [], ga = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < n; i++) {
    const y = 1 - ((i + 0.5) / n) * 2, rr = Math.sqrt(1 - y * y), th = ga * i;
    pts.push(new THREE.Vector3(Math.cos(th) * rr + (r() - 0.5) * 0.25 / Math.sqrt(n) * 3, y + (r() - 0.5) * 0.25 / Math.sqrt(n) * 3, Math.sin(th) * rr + (r() - 0.5) * 0.25 / Math.sqrt(n) * 3).normalize());
  }
  const s2 = ((2.2 / Math.sqrt(n)) * size) ** 2;
  const fr = pts.map((q) => { const u = new THREE.Vector3().crossVectors(q, Math.abs(q.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)).normalize(); return { u, v: new THREE.Vector3().crossVectors(q, u), ph: r() * 6.28 }; });
  const t = new THREE.Vector3();
  return (d: THREE.Vector3) => {
    let m = 0;
    for (let i = 0; i < pts.length; i++) {
      const dd = d.distanceToSquared(pts[i]) / s2;
      if (dd >= 1) continue;
      t.subVectors(d, pts[i]);
      const a = Math.atan2(t.dot(fr[i].v), t.dot(fr[i].u)), rho = Math.sqrt(dd);
      const coil = 0.5 + 0.5 * Math.cos(a * 2 - rho * 10 + fr[i].ph);
      m = Math.max(m, Math.sqrt(1 - dd) * (0.74 + 0.26 * coil * ss(0.05, 0.3, rho)));
    }
    return m;
  };
}

/**
 * A tapered tube along a smooth curve (hair locks, ringlets, ponytail, brows, moustache).
 * The cross-section is flattened against the head by `depth` (< 1 → a ribbon).
 */
function lock(pts: THREE.Vector3[], radius: (t: number) => number, o: { radial?: number; segs?: number; depth?: number; flute?: number; flutes?: number } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const segs = o.segs ?? 18, rad = o.radial ?? 8, depth = o.depth ?? 1, fl = o.flute ?? 0, nf = o.flutes ?? 3;
  const pos: number[] = [], idx: number[] = [];
  const P = new THREE.Vector3(), T = new THREE.Vector3(), O = new THREE.Vector3(), S = new THREE.Vector3(), N = new THREE.Vector3();
  for (let i = 0; i <= segs; i++) {
    const t = i / segs;
    curve.getPointAt(t, P); curve.getTangentAt(t, T);
    O.set(P.x, 0, P.z); if (O.lengthSq() < 1e-8) O.set(0, 0, -1); O.normalize(); // outward from the head's axis
    S.crossVectors(T, O); if (S.lengthSq() < 1e-8) S.set(1, 0, 0); S.normalize();
    N.crossVectors(S, T).normalize();
    const r = Math.max(0.002, radius(t));
    for (let j = 0; j < rad; j++) {
      const a = (j / rad) * Math.PI * 2, rr = r * (1 + fl * Math.cos(a * nf) * Math.min(1, t * 6)), cs = Math.cos(a) * rr, sn = Math.sin(a) * rr * depth;
      pos.push(P.x + S.x * cs + N.x * sn, P.y + S.y * cs + N.y * sn, P.z + S.z * cs + N.z * sn);
    }
  }
  for (let i = 0; i < segs; i++) for (let j = 0; j < rad; j++) {
    const a = i * rad + j, b = i * rad + ((j + 1) % rad), c = (i + 1) * rad + j, d = (i + 1) * rad + ((j + 1) % rad);
    idx.push(a, c, b, b, c, d);
  }
  // caps: a flat start (hidden in the head) and a rounded tip
  const c0 = pos.length / 3; curve.getPointAt(0, P); pos.push(P.x, P.y, P.z);
  for (let j = 0; j < rad; j++) idx.push(c0, j, (j + 1) % rad);
  const c1 = pos.length / 3; curve.getPointAt(1, P); curve.getTangentAt(1, T);
  P.addScaledVector(T, radius(1) * 0.6); pos.push(P.x, P.y, P.z);
  const last = segs * rad;
  for (let j = 0; j < rad; j++) idx.push(c1, last + ((j + 1) % rad), last + j);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

/** An sRGB colour scaled (k < 1 darker) and lifted toward white by `w` — in sRGB, so black hair stays black. */
function tone(hex: string, k: number, w = 0) {
  const c = col(hex).convertLinearToSRGB();
  const f = (v: number) => Math.min(1, v * k + (1 - v * k) * w);
  return new THREE.Color().setRGB(f(c.r), f(c.g), f(c.b), THREE.SRGBColorSpace);
}
/**
 * Hair colour: darker at the ends, lighter on top, a soft shine band across the crown; with
 * `curl` (0…1 at a direction), the gaps between curls are darker so each curl reads.
 */
function hairPaint(base: string, curl?: (d: THREE.Vector3) => number, strand?: (d: THREE.Vector3) => number): Paint {
  const lum = col(base).getHSL({ h: 0, s: 0, l: 0 }, THREE.SRGBColorSpace).l, dark = lum < 0.13, light = lum > 0.33;
  const grey = lum > 0.55; // silver: keep it grey, not white
  const lo = tone(base, grey ? 0.62 : 0.72), hi = tone(base, grey ? 0.94 : 1.12, dark ? 0.08 : grey ? 0 : 0.05), shine = tone(base, grey ? 1.08 : 1.25, dark ? 0.3 : grey ? 0.12 : 0.24), deep = tone(base, grey ? 0.4 : 0.5), top = tone(base, grey ? 1.05 : 1.3, dark ? 0.22 : grey ? 0.05 : 0.14);
  const d = new THREE.Vector3();
  return (x, y, z) => {
    const c = lo.clone().lerp(hi, ss(-0.62, 0.32, y));
    d.set(x / HS[0], y / HS[1], z / HS[2]).normalize();
    if (curl) { const k = curl(d); c.lerp(deep, (1 - k) * 0.6).lerp(top, k * k * 0.5); }
    if (strand) { const k = strand(d); c.lerp(deep, (1 - k) * (light ? 0.62 : 0.42)).lerp(top, k ** 6 * 0.18); }
    const s = Math.exp(-(((y - 0.21) / 0.045) ** 2)) * clamp01(z / 0.22 + 0.45);
    return c.lerp(shine, s * (curl ? 0.3 : 0.55));
  };
}

/* ---------------------------------------------------------------- model */
export function buildToon(l: TeacherLook, skin: SkinTone, id = '') {
  const B = new Builder();
  const h = l.height;
  const fem = l.gender === 'f';
  jawK = fem ? (dy) => 1 - 0.065 * ss(-0.15, -0.85, dy) : (dy) => 1 + 0.04 * ss(-0.15, -0.75, dy) * (1 - ss(-0.8, -0.98, dy));
  const legLen = 0.30 * h, torsoLen = 0.42 * h;
  // shoulders: narrower for her, broader for him
  const sw = (l.build === 'slim' ? 21 : l.build === 'broad' ? 30 : 24) / 100 + (fem ? -0.012 : 0.01);
  const pants = l.outfit === 'hoodieBlack' ? '#141414' : l.outfit === 'suit' ? l.top : l.outfit === 'tracksuit' ? l.top : '#2b3a55';
  const armSkin = l.outfit === 'vest' || l.outfit === 'polo';
  const sleeve = l.outfit === 'vest' || l.outfit === 'stripes' ? '#f2efe6' : l.top;
  const has = (p: string) => (l.props as string[]).includes(p);
  const topD = darken(l.top, 0.72), topL = mix(l.top, '#ffffff', 0.35);
  const hair = l.hairColor;
  const hairD = l.hair === 'silverNeat' ? darken(hair, 0.55) : darken(hair, 0.7);
  const headY = torsoLen + 0.27; // head centre, in chest space
  const seed = hash(id || l.hair + l.top);

  /* legs (own node, pivot at the hip) */
  const lx = sw / 2 + 0.015;
  const denim = pants === '#2b3a55';
  for (const [node, s] of [['legL', -1], ['legR', 1]] as const) {
    B.mat = denim ? 'denim' : 'cloth';
    B.add(node, capsule(0.066, Math.max(0.02, legLen - 0.13)), pants, [0, -legLen / 2 + 0.035, 0]);
    B.add(node, torus(0.066, 0.012, 8, 20), darken(pants, 0.85), [0, -legLen + 0.11, 0], [Math.PI / 2, 0, 0]); // hem
    if (denim) B.add(node, box(0.006, legLen - 0.14, 0.006), mix(pants, '#c9a46a', 0.5), [s * 0.064, -legLen / 2 + 0.03, 0]); // seam
    if (l.outfit === 'tracksuit') B.add(node, box(0.012, legLen - 0.1, 0.02), '#f2efe6', [s * 0.062, -legLen / 2 + 0.03, 0.01]);
    // shoe: glossy upper, rubber sole, a lace strap
    B.mat = 'glossy';
    B.add(node, sphere(0.082, 16, 12), '#15181b', [0, -legLen + 0.05, 0.035], [0, 0, 0], [1, 0.66, 1.45]);
    B.add(node, sphere(0.03, 7, 6), '#22272c', [0, -legLen + 0.088, 0.07], [0.4, 0, 0], [1.25, 0.5, 1]);
    B.mat = 'rubber';
    B.add(node, rbox(0.17, 0.035, 0.25, 0.015), '#2c3137', [0, -legLen + 0.018, 0.035]);
  }
  B.mat = denim ? 'denim' : 'cloth';
  B.add('hips', sphere(1, 16, 10), pants, [0, 0.02, 0], [0, 0, 0], [sw * (fem ? 1.06 : 0.98), 0.1, fem ? 0.148 : 0.14]);

  /* torso: a pill scaled to the shoulders, plus outfit details */
  const tz = 0.155;
  B.mat = 'cloth';
  // capsule(1, 0.6) is 2 wide and 2.6 tall: scale it to the shoulders × torso (a little overlap)
  // a turned (lathe) body: waist, chest, round shoulders up to the neck; x and z scaled to the build
  // her: a waist and a softer bust line; him: a straighter, V-shaped chest
  const silhouette = fem
    ? [[0, -0.06], [0.88, -0.055], [0.98, 0.0], [0.95, 0.15], [0.85, 0.37], [0.9, 0.53], [0.98, 0.68], [0.95, 0.84], [0.8, 0.95], [0.55, 1.01], [0.27, 1.04], [0, 1.05]]
    : [[0, -0.06], [0.84, -0.055], [0.91, 0.0], [0.92, 0.18], [0.98, 0.46], [1.03, 0.7], [1.0, 0.86], [0.88, 0.96], [0.6, 1.02], [0.3, 1.045], [0, 1.05]];
  const prof = new THREE.SplineCurve(silhouette.map(([r, y]) => new THREE.Vector2(r, y))).getPoints(48);
  const rAt = (y: number) => { const v = y / torsoLen; for (let i = 1; i < prof.length; i++) if (prof[i].y >= v) { const a = prof[i - 1], b = prof[i]; return a.x + (b.x - a.x) * ((v - a.y) / Math.max(1e-6, b.y - a.y)); } return 0; };
  const body = new THREE.LatheGeometry(prof.map((q) => new THREE.Vector2(Math.max(0.001, q.x), q.y * torsoLen)), 48);
  B.add('chest', body, l.outfit === 'vest' ? '#f2efe6' : l.top, [0, 0, 0], [0, 0, 0], [sw * 1.04, 1, tz]);
  const front = (y: number) => tz * rAt(y) + 0.004;
  const band = (y: number, hgt: number, color: string, k = 1.035) => B.add('chest', cyl(1, 1, hgt, 18), color, [0, y, 0], [0, 0, 0], [sw * 1.04 * rAt(y) * k, 1, tz * rAt(y) * k]);
  switch (l.outfit) {
    case 'blazer': case 'suit':
      B.add('chest', box(0.09, torsoLen * 0.75, 0.02), '#f2efe6', [0, torsoLen * 0.58, front(torsoLen * 0.6)]);
      B.add('chest', box(0.07, torsoLen * 0.6, 0.025), topD, [-0.06, torsoLen * 0.6, front(torsoLen * 0.6) + 0.004], [0, 0, -0.28]);
      B.add('chest', box(0.07, torsoLen * 0.6, 0.025), topD, [0.06, torsoLen * 0.6, front(torsoLen * 0.6) + 0.004], [0, 0, 0.28]);
      if (l.outfit === 'suit') { // tie: knot and a tapered blade
        B.add('chest', rbox(0.04, 0.032, 0.02, 0.008), '#a8323e', [0, torsoLen - 0.03, front(torsoLen - 0.03) + 0.01]);
        B.add('chest', flat([[-0.016, 0], [0.016, 0], [0.026, -torsoLen * 0.5], [0, -torsoLen * 0.56], [-0.026, -torsoLen * 0.5]], 0.006, 0.003), '#c23a48', [0, torsoLen - 0.045, front(torsoLen * 0.6) + 0.008]);
      }
      break;
    case 'shirt': case 'polo': case 'blouse': case 'uniform': {
      const blouse = l.outfit === 'blouse';
      const collar = l.outfit === 'uniform' ? '#f2efe6' : topL;
      B.add('chest', torus(0.074, 0.018, 8, 20), collar, [0, torsoLen + 0.004, -0.005], [Math.PI / 2 - 0.15, 0, 0], [1.12, 1, 1]); // collar band
      for (const s of [-1, 1]) {
        // a blouse has soft rounded collar flaps; shirts and polos the pointed ones
        const pts: [number, number][] = blouse
          ? Array.from({ length: 9 }, (_, k) => { const a = (k / 8) * Math.PI; return [s * (0.045 - Math.cos(a) * 0.045), -Math.sin(a) * 0.06] as [number, number]; })
          : [[0, 0], [s * 0.088, 0.006], [s * 0.034, -0.085]];
        if (s < 0) pts.reverse();
        B.add('chest', flat(pts, 0.006, 0.004), collar, [s * 0.006, torsoLen + 0.02, front(torsoLen) - 0.004], [-0.42, 0, 0]);
      }
      if (blouse) { // a little bow at the neck
        for (const s of [-1, 1]) B.add('chest', flat([[0, 0], [s * 0.045, 0.022], [s * 0.045, -0.022]], 0.008, 0.005), topD, [0, torsoLen - 0.018, front(torsoLen - 0.018) + 0.012], [-0.3, 0, 0]);
        B.add('chest', sphere(0.014, 8, 6), topD, [0, torsoLen - 0.018, front(torsoLen - 0.018) + 0.02]);
      }
      // placket and buttons (the polo only has two, the blouse three small pearls)
      const n = l.outfit === 'polo' ? 2 : blouse ? 3 : 4;
      B.add('chest', box(0.034, torsoLen * (l.outfit === 'polo' ? 0.3 : 0.86), 0.006), mix(l.top, '#000000', 0.08), [0, torsoLen * (l.outfit === 'polo' ? 0.8 : 0.5), front(torsoLen * 0.62) - 0.001]);
      B.mat = 'glossy';
      for (let i = 0; i < n; i++) {
        const y = torsoLen * (blouse ? 0.7 - i * 0.18 : 0.86 - i * 0.2);
        if (blouse) B.add('chest', sphere(0.011, 10, 8), '#fbf7ee', [0, y, front(y) + 0.004]);
        else B.add('chest', cyl(0.0105, 0.0105, 0.006, 9), mix(l.top, '#ffffff', 0.7), [0, y, front(y) + 0.004], [Math.PI / 2, 0, 0]);
      }
      B.mat = 'cloth';
      if (l.outfit === 'shirt' || l.outfit === 'uniform') { // chest pocket
        const py = torsoLen * 0.66, px = -sw * 0.46;
        B.add('chest', rbox(0.075, 0.075, 0.01, 0.004), mix(l.top, '#000000', 0.06), [px, py, front(py) - 0.012], [-0.08, 0.35, 0]);
        B.add('chest', box(0.078, 0.008, 0.012), topD, [px, py + 0.037, front(py) - 0.01], [-0.08, 0.35, 0]);
      }
      if (l.outfit === 'uniform') for (const s of [-1, 1]) B.add('chest', box(0.06, torsoLen * 0.85, 0.02), '#f2efe6', [s * sw * 0.62, torsoLen * 0.5, front(torsoLen * 0.5) - 0.02], [0, s * 0.5, 0]);
      break;
    }
    case 'sweater': case 'cardigan':
      band(0.03, 0.05, topD);
      B.add('chest', torus(0.07, 0.024, 6, 16), topD, [0, torsoLen - 0.005, 0.01], [Math.PI / 2 - 0.25, 0, 0], [1.1, 1, 1]);
      if (l.outfit === 'cardigan') { B.add('chest', box(0.05, torsoLen * 0.85, 0.02), '#f2efe6', [0, torsoLen * 0.5, front(torsoLen * 0.5)]); for (const f of [0.35, 0.55, 0.75]) B.add('chest', sphere(0.014, 6, 5), topD, [0.035, torsoLen * f, front(torsoLen * f) + 0.01]); }
      break;
    case 'tracksuit':
      B.add('chest', box(0.012, torsoLen * 0.85, 0.02), '#d9d9d9', [0, torsoLen * 0.5, front(torsoLen * 0.5)]);
      B.add('chest', torus(0.07, 0.024, 6, 16), topD, [0, torsoLen - 0.005, 0.01], [Math.PI / 2 - 0.25, 0, 0], [1.1, 1, 1]);
      break;
    case 'stripes':
      for (let i = 0; i < 4; i++) band(torsoLen * (0.22 + i * 0.18), 0.035, l.top === '#f2efe6' ? '#2b3a55' : '#f2efe6');
      break;
    case 'vest':
      B.add('chest', body, l.top, [0, -0.01, 0.006], [0, 0, 0], [sw * 1.04 * 1.025, 0.93, tz * 1.04]);
      B.add('chest', box(0.07, torsoLen * 0.4, 0.02), '#f2efe6', [0, torsoLen * 0.78, front(torsoLen * 0.78) + 0.01]);
      break;
    case 'hoodieBlack':
      B.add('chest', torus(0.13, 0.05, 8, 18), '#1f1f1f', [0, torsoLen + 0.02, -0.06], [Math.PI / 2 + 0.5, 0, 0], [1.25, 1, 1]);
      B.add('chest', box(sw * 1.1, 0.09, 0.02), '#262626', [0, torsoLen * 0.3, front(torsoLen * 0.3)]);
      for (const s of [-1, 1]) B.add('chest', cyl(0.006, 0.006, 0.12, 5), '#d9d9d9', [s * 0.04, torsoLen * 0.82, front(torsoLen * 0.82) + 0.01]);
      break;
  }
  if (has('scarf')) { B.add('chest', torus(0.1, 0.04, 8, 18), '#e23d4f', [0, torsoLen, 0.01], [Math.PI / 2 - 0.2, 0, 0], [1.2, 1, 1]); B.add('chest', box(0.06, 0.16, 0.03), '#e23d4f', [0.06, torsoLen - 0.1, front(torsoLen - 0.1) + 0.01], [0, 0, -0.15]); }
  if (has('lanyard') || has('whistle')) {
    B.add('chest', torus(0.1, 0.008, 4, 20, Math.PI), '#f5c518', [0, torsoLen - 0.02, front(torsoLen * 0.8)], [0, 0, Math.PI], [1, 1.6, 1]);
    if (has('lanyard')) B.add('chest', box(0.09, 0.07, 0.012), '#ffffff', [0, torsoLen - 0.19, front(torsoLen - 0.19) + 0.012]);
    else B.add('chest', box(0.05, 0.03, 0.03), '#c9cfc9', [0, torsoLen - 0.18, front(torsoLen - 0.18) + 0.015]);
  }
  if (has('pinFR')) ['#3a5bc7', '#ffffff', '#e23d4f'].forEach((c, i) => B.add('chest', box(0.016, 0.04, 0.01), c, [-sw * 0.55 + i * 0.016, torsoLen * 0.72, front(torsoLen * 0.72) - 0.005]));
  if (!['hoodieBlack', 'tracksuit', 'sweater', 'cardigan'].includes(l.outfit)) {
    B.mat = 'glossy';
    const br = rAt(0.04);
    B.add('chest', cyl(1, 1, 0.045, 32), '#1f1b18', [0, 0.04, 0], [0, 0, 0], [sw * 1.04 * br + 0.008, 1, tz * br + 0.008]);
    B.mat = 'metal';
    B.add('chest', rbox(0.062, 0.044, 0.014, 0.006), '#c9ced6', [0, 0.04, tz * br + 0.012]);
    B.add('chest', rbox(0.04, 0.024, 0.01, 0.004), '#3a3f47', [0, 0.04, tz * br + 0.017]);
  }
  B.mat = 'skin';
  B.add('chest', fem ? cyl(0.053, 0.064, 0.08) : cyl(0.064, 0.074, 0.08), skin.c, [0, torsoLen + 0.01, 0]); // neck
  B.mat = 'cloth';

  /* arms (pivot at the shoulder), resting slightly out */
  const armLen = torsoLen * 0.82;
  for (const [node, s] of [['armL', -1], ['armR', 1]] as const) {
    const out = s * 0.16;
    const at = (d: number): V3 => [Math.sin(out) * d, -Math.cos(out) * d, 0];
    B.add(node, capsule(fem ? 0.052 : 0.058, Math.max(0.02, armLen - 0.11)), sleeve, at(armLen / 2 - 0.015), [0, 0, out]);
    if (l.outfit === 'blouse') B.add(node, sphere(1, 16, 12), sleeve, at(0.035), [0, 0, out], [0.074, 0.066, 0.072]); // puff sleeve
    if (armSkin) B.add(node, capsule(0.05, armLen * 0.3), skin.c, at(armLen * 0.68), [0, 0, out]);
    if (l.outfit === 'tracksuit') B.add(node, box(0.012, armLen - 0.1, 0.02), '#f2efe6', [at(armLen / 2)[0] + s * 0.05, at(armLen / 2)[1], 0], [0, 0, out]);
    if (has('tattoos') && node === 'armR') for (let i = 0; i < 3; i++) B.add(node, torus(0.057, 0.004, 4, 16), '#2b3a55', at(armLen * (0.5 + i * 0.08)), [Math.PI / 2, 0, out]);
    if (!armSkin) B.add(node, torus(0.057, 0.011, 8, 20), l.outfit === 'blazer' || l.outfit === 'suit' ? '#f2efe6' : darken(sleeve, 0.86), at(armLen - 0.07), [Math.PI / 2, 0, out]); // cuff
    B.mat = 'skin';
    B.add(node, sphere(1, 14, 11), skin.c, at(armLen - 0.005), [0, 0, out], [0.058, 0.066, 0.05]); // mitten hand
    B.add(node, sphere(0.024, 7, 6), skin.c, [at(armLen - 0.01)[0] - s * 0.04, at(armLen - 0.01)[1] + 0.012, 0.025]); // thumb
    B.mat = 'cloth';
    const hand = at(armLen + 0.02);
    if (node === 'armR') {
      if (has('book')) B.add(node, box(0.05, 0.2, 0.15), '#3a5bc7', [hand[0] + 0.05, hand[1] + 0.02, 0.03], [0.1, 0, -0.12]);
      if (has('coffee')) { B.add(node, cyl(0.045, 0.038, 0.12), '#f2efe6', [hand[0] + 0.03, hand[1] + 0.03, 0.06]); B.add(node, cyl(0.047, 0.047, 0.04), '#a8774a', [hand[0] + 0.03, hand[1] + 0.03, 0.06]); }
      if (has('pointer')) B.add(node, cyl(0.01, 0.012, 0.42, 6), '#6b4a2e', [hand[0] + 0.02, hand[1] + 0.12, 0.12], [0.9, 0, -0.2]);
      if (has('scanner')) { B.add(node, box(0.05, 0.2, 0.05), '#1b2023', [hand[0] + 0.03, hand[1] + 0.06, 0.06], [0.5, 0, 0]); B.add(node, box(0.07, 0.06, 0.07), '#3fa7d6', [hand[0] + 0.03, hand[1] + 0.16, 0.12], [0.5, 0, 0]); }
    } else if (has('clipboard')) {
      B.add(node, box(0.03, 0.24, 0.18), '#a8774a', [hand[0] - 0.04, hand[1] + 0.03, 0.04], [0.1, 0, 0.12]);
      B.add(node, box(0.034, 0.18, 0.13), '#ffffff', [hand[0] - 0.04, hand[1] + 0.03, 0.045], [0.1, 0, 0.12]);
    }
  }

  /* head: skin with painted blush on the cheeks and a soft shade under the chin */
  const H = 'head';
  const blush = mix(skin.c, fem ? '#ff6f86' : '#ff8a7a', l.smile === 'shy' ? 0.55 : fem ? 0.45 : 0.3);
  const stubble = l.beard === 'stubble' ? col(mix(skin.c, hair, 0.62)) : null;
  const bagC = col(mix(skin.d, '#7d5d70', 0.35));
  const dd = new THREE.Vector3();
  const headPaint: Paint = (x, y, z) => {
    const c = col(skin.c);
    const b = Math.max(...[-1, 1].map((sd) => Math.exp(-(((x - sd * 0.165) / 0.062) ** 2 + ((y + 0.08) / 0.048) ** 2)))) * clamp01(z / 0.12);
    c.lerp(col(blush), b * (fem ? 0.85 : 0.38));
    if (l.bags) { // tired eyes: soft shadows under them
      const e = Math.max(...[-1, 1].map((sd) => Math.exp(-(((x - sd * 0.108) / 0.055) ** 2 + ((y + 0.083) / 0.024) ** 2)))) * clamp01(z / 0.15);
      c.lerp(bagC, e * 0.6);
    }
    if (stubble) { // a painted shadow of stubble, same outline as a beard (smooth, no steps)
      dd.set(x / HS[0], y / HS[1], z / HS[2]).normalize();
      c.lerp(stubble, beardCover(Math.asin(dd.y), Math.atan2(dd.x, dd.z), 0.85, 2.6) * 0.78);
    }
    return c.lerp(col(skin.d), ss(-0.17, -0.29, y) * 0.3);
  };
  B.mat = 'skin';
  const headGeo = new THREE.SphereGeometry(R, 72, 54);
  { const p = headGeo.getAttribute('position'); for (let i = 0; i < p.count; i++) p.setX(i, p.getX(i) * jawK(p.getY(i) / R)); headGeo.computeVertexNormals(); }
  B.add(H, headGeo, headPaint, [0, 0, 0], [0, 0, 0], HS);
  for (const s of [-1, 1]) {
    B.add(H, sphere(0.062, 12, 10), skin.c, [s * R * 1.0, -0.01, -0.02], [0, 0, 0], [0.75, 1, 1]);
    B.add(H, sphere(0.034, 10, 8), mix(skin.c, skin.d, 0.6), [s * (R * 1.0 + 0.022), -0.01, -0.012], [0, 0, 0], [0.4, 1, 0.8]); // inner ear
  }
  if (has('earrings')) { // gold hoops with a small stud
    B.mat = 'metal';
    for (const s of [-1, 1]) { B.add(H, sphere(0.012, 10, 8), '#f5c518', [s * R * 1.0, -0.06, -0.015]); B.add(H, torus(0.022, 0.0055, 8, 24), '#f5c518', [s * R * 1.01, -0.085, -0.015], [0, Math.PI / 2, 0]); }
    B.mat = 'skin';
  }
  const surf = (x: number, y: number) => 0.92 * Math.sqrt(Math.max(0, R * R - x * x - y * y)); // head front z at (x, y)
  // nose: small and neat for her, a little larger for him
  B.add(H, sphere(1, 14, 12), mix(skin.c, skin.d, 0.35), [0, -0.055, surf(0, -0.055) + 0.008], [0, 0, 0], fem ? [0.025, 0.022, 0.022] : [0.033, 0.029, 0.029]);
  if (l.bags) for (const s of [-1, 1]) { // the crease under each tired eye
    const arc: THREE.Vector3[] = [];
    for (let k = 0; k <= 8; k++) { const a = Math.PI * (1.15 + (k / 8) * 0.7), x = s * 0.105 + Math.cos(a) * 0.046, y = -0.012 + Math.sin(a) * 0.07; arc.push(new THREE.Vector3(x, y, surf(x, y) + 0.001)); }
    B.put(H, lock(arc, (t) => 0.0042 * Math.sin(Math.PI * t) + 0.001, { segs: 14, radial: 6, depth: 0.35 }), mix(skin.d, '#6d4c5c', 0.3));
  }
  // brows: thin and arched for her, thicker and straighter for him
  B.mat = 'hair';
  const browR = fem ? 0.0125 : l.beard !== 'none' || l.build === 'broad' ? 0.024 : 0.021;
  for (const s of [-1, 1]) {
    const low = l.smile === 'serious' || l.smile === 'mysterious' ? 0.05 : 0;
    const pts = fem
      ? [onHead(0.355 - low, s * 0.14, 1.033), onHead(0.455, s * 0.31, 1.043), onHead(0.4, s * 0.53, 1.035), onHead(0.33, s * 0.6, 1.03)]
      : [onHead(0.33 - low, s * 0.13, 1.036), onHead(0.39, s * 0.3, 1.046), onHead(0.365, s * 0.52, 1.036)];
    B.put(H, lock(pts, (t) => browR * (1 - (fem ? 0.7 : 0.4) * t), { segs: 12, radial: 8, depth: 0.6 }), hairD);
  }

  /* mouths: the teacher's own smile (N), an open grin (O), a surprised "O" (S) and a frown (F) */
  const lip = l.lips ?? (fem ? '#c8506a' : '#8a3a3a');
  const lipT = fem ? 0.0135 : 0.011;
  const my = -0.15, mz = surf(0, my) - 0.004;
  B.mat = 'lip';
  if (l.smile === 'big') {
    B.add('mouthN', sphere(1, 18, 10), '#5a1d1d', [0, 0.008, 0], [0, 0, 0], [0.062, 0.042, 0.02]);
    B.add('mouthN', rbox(0.075, 0.018, 0.012, 0.005), '#fbfaf6', [0, 0.03, 0.012]);
    B.add('mouthN', sphere(1, 12, 8), '#ff8a8a', [0, -0.012, 0.01], [0, 0, 0], [0.032, 0.016, 0.012]);
    B.mat = 'skin';
    B.add('mouthN', box(0.15, 0.04, 0.03), '#' + (headPaint(0, my + 0.05, mz) as THREE.Color).getHexString(), [0, 0.058, -0.004]);
  } else if (l.smile === 'serious' || l.smile === 'mysterious') B.add('mouthN', rbox(0.085, 0.015, 0.015, 0.006), lip, [0, 0, 0.006]);
  else if (l.smile === 'smirk') B.add('mouthN', torus(0.055, lipT, 8, 16, Math.PI * 0.8), lip, [0.015, 0.035, 0.006], [0, 0, Math.PI + 0.35]);
  else B.add('mouthN', torus(0.058, lipT + 0.001, 8, 16, Math.PI), lip, [0, 0.04, 0.006], [0, 0, Math.PI]);
  if (fem && l.smile !== 'big') B.add('mouthN', sphere(1, 12, 8), lip, [0, -0.014, 0.004], [0, 0, 0], [0.026, 0.009, 0.008]); // a soft lower lip
  B.mat = 'lip';
  B.add('mouthO', new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#4a1416', [0, 0.03, 0.004], [0, 0, 0], [0.07, 0.068, 0.03]);
  B.add('mouthO', rbox(0.09, 0.022, 0.012, 0.006), '#fbfaf6', [0, 0.019, 0.016]);
  B.add('mouthO', sphere(1, 14, 10), '#ff7f8a', [0, -0.018, 0.014], [0, 0, 0], [0.036, 0.018, 0.012]);
  B.add('mouthS', torus(0.026, 0.009, 8, 20), lip, [0, 0, 0.006], [0, 0, 0], [1, 1.25, 1]);
  B.add('mouthS', sphere(1, 12, 8), '#4a1416', [0, 0, 0.002], [0, 0, 0], [0.024, 0.03, 0.008]);
  B.add('mouthF', torus(0.045, 0.011, 8, 16, Math.PI), lip, [0, -0.012, 0.006]);

  B.mat = 'hair';
  beard(B, l, hair, seed);
  hairdo(B, l, hair, seed);

  // glasses (over the hair and the fringe, in front of the big eyes)
  if (l.glasses !== 'none') glasses(B, l.glasses, surf);
  // hats
  B.mat = 'cloth';
  if (has('beretFR')) { B.add(H, sphere(1, 18, 10), '#22305a', [-0.03, 0.29, -0.02], [0, 0, 0.18], [0.31, 0.09, 0.29]); B.add(H, cyl(0.01, 0.01, 0.06, 5), INK, [-0.01, 0.39, -0.02]); }
  if (has('guardCap')) { B.add(H, new THREE.SphereGeometry(R * 1.12, 28, 12, 0, Math.PI * 2, 0, Math.PI * 0.45), '#22305a', [0, 0.03, 0], [-0.2, 0, 0]); B.add(H, rbox(0.34, 0.025, 0.16, 0.01), '#1b2023', [0, 0.13, 0.27], [0.25, 0, 0]); B.mat = 'metal'; B.add(H, box(0.05, 0.05, 0.01), '#f5c518', [0, 0.24, 0.27], [-0.3, 0, 0]); }

  /* eyes: big and glossy (sclera, iris with a darker rim, pupil, two highlights, lash line), plus a
     shut "^" eye and a heart eye for expressions. Own nodes, so the clips can blink and switch them. */
  const iris = l.hair === 'silverNeat' ? '#4a5a6a' : '#6b3e22', irisRim = '#2a150b';
  const eyeAt = (s: number): V3 => [s * 0.105, -0.008, surf(0.105, 0) - 0.017];
  for (const [node, s] of [['eyeL', -1], ['eyeR', 1]] as const) {
    const o = node + 'Open', c = node + 'Shut', hrt = node + 'Heart';
    B.mat = 'eye';
    B.add(o, sphere(1, 18, 14), '#ffffff', [0, 0, 0], [0, 0, 0], [0.05, 0.062, 0.03]);
    B.add(o, sphere(1, 14, 10), irisRim, [0, -0.004, 0.017], [0, 0, 0], [0.036, 0.044, 0.016]);
    B.add(o, sphere(1, 14, 10), iris, [0, -0.004, 0.0205], [0, 0, 0], [0.03, 0.038, 0.013]);
    B.add(o, sphere(1, 10, 8), '#0e0805', [0, -0.002, 0.026], [0, 0, 0], [0.016, 0.02, 0.009]);
    B.add(o, sphere(0.0115, 6, 5), '#ffffff', [0.012, 0.016, 0.033]);
    B.add(o, sphere(0.0055, 5, 4), '#ffffff', [-0.012, -0.017, 0.031]);
    if (l.smile === 'mysterious') { B.mat = 'skin'; B.add(o, new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.42), skin.c, [0, -0.006, 0.002], [0, 0, 0], [0.054, 0.068, 0.034]); }
    B.mat = 'hair';
    const lash: THREE.Vector3[] = [];
    for (let k = 0; k <= 8; k++) { const a = Math.PI * (0.98 - (k / 8) * 0.96); lash.push(new THREE.Vector3(Math.cos(a) * 0.052, Math.sin(a) * 0.063 - (l.smile === 'mysterious' ? 0.02 : 0), 0.012 + 0.012 * Math.sin(a))); }
    if (s > 0) lash.reverse();
    lash.push(lash[lash.length - 1].clone().add(new THREE.Vector3(s * 0.012, 0.008, -0.004))); // a little flick at the outer corner
    if (!fem) lash.pop(); // no winged flick for him
    B.put(o, lock(lash, (t) => (fem ? 0.0064 : 0.0046) + (fem ? 0.0034 : 0.0016) * t, { segs: 16, radial: 6 }), '#17110d');
    if (fem) for (const k of [0.07, 0.17, 0.27]) { // three lashes at the outer corner
      const a = s > 0 ? Math.PI * k : Math.PI * (1 - k);
      const b0 = new THREE.Vector3(Math.cos(a) * 0.052, Math.sin(a) * 0.063 - (l.smile === 'mysterious' ? 0.02 : 0), 0.012 + 0.012 * Math.sin(a));
      const dir = new THREE.Vector3(Math.cos(a) * 0.9, Math.sin(a) + 0.35, 0.25).normalize();
      B.put(o, lock([b0, b0.clone().addScaledVector(dir, 0.012), b0.clone().addScaledVector(dir, 0.022).add(new THREE.Vector3(s * 0.004, 0.002, 0))], (t) => 0.0042 * (1 - 0.8 * t), { segs: 6, radial: 5 }), '#17110d');
    }
    const arc: THREE.Vector3[] = [];
    for (let k = 0; k <= 8; k++) { const a = Math.PI * (k / 8); arc.push(new THREE.Vector3(Math.cos(a) * 0.04, Math.sin(a) * 0.026 - 0.006, 0.022)); }
    B.put(c, lock(arc, () => 0.008, { segs: 14, radial: 6 }), '#17110d');
    B.mat = 'glossy';
    const heart: [number, number][] = [];
    for (let k = 0; k < 24; k++) { const t = (k / 24) * Math.PI * 2; heart.push([(16 * Math.sin(t) ** 3) * 0.0034, (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) * 0.0034]); }
    B.add(hrt, flat(heart, 0.012, 0.006), '#ff3355', [0, 0.004, 0.012]);
  }

  /* assemble the rig */
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, name: 'toon' });
  const root = new THREE.Group(); root.name = 'toon';
  const node = (name: string, pos: V3, parent: THREE.Object3D, rest: V3 = [1, 1, 1]) => {
    const g = new THREE.Group(); g.name = name; g.position.set(...pos); g.scale.set(...rest); parent.add(g);
    const m = B.mesh(name, mat); if (m) g.add(m);
    return g;
  };
  const hips = node('hips', [0, legLen, 0], root);
  node('legL', [-lx, 0, 0], hips);
  node('legR', [lx, 0, 0], hips);
  const chest = node('chest', [0, 0, 0], hips);
  node('armL', [-(sw + 0.03), torsoLen - 0.08, 0], chest);
  node('armR', [sw + 0.03, torsoLen - 0.08, 0], chest);
  const head = node('head', [0, headY, 0], chest);
  const OFF: V3 = [FACE_OFF, FACE_OFF, FACE_OFF];
  for (const [n, s] of [['eyeL', -1], ['eyeR', 1]] as const) {
    const e = node(n, eyeAt(s), head);
    node(n + 'Open', [0, 0, 0], e);
    node(n + 'Shut', [0, 0, 0], e, OFF);
    node(n + 'Heart', [0, 0, 0], e, OFF);
  }
  node('lens', [0, 0, 0], head);
  const mouth = node('mouth', [0, my, mz], head);
  node('mouthN', [0, 0, 0], mouth);
  for (const m of ['mouthO', 'mouthS', 'mouthF']) node(m, [0, 0, 0], mouth, OFF);
  return { root, clips: toonClips(legLen), height: legLen + headY + R * 1.03 };
}

/* ---------------------------------------------------------------- beards */
/** Beard outline: low in front, up the cheeks to the sideburns, with the mouth left clear (0…1). */
function beardCover(el: number, az: number, mouthClear = 1, soft = 1) {
  const a = Math.abs(az);
  const top = a < 0.6 ? lerp(-0.36, -0.3, a / 0.6) : a < 1.35 ? lerp(-0.3, 0.12, ss(0, 1, (a - 0.6) / 0.75)) : 0.12;
  const q = ((el + 0.5) / 0.11) ** 2 + (az / 0.34) ** 2, mouth = 1 - ss(0.7, 1.05, q);
  return ss(1.66 + 0.06 * soft, 1.66 - 0.06 * soft, a) * ss(top + 0.07 * soft, top - 0.07 * soft, el) * (1 - mouth * mouthClear);
}

function beard(B: Builder, l: TeacherLook, hair: string, seed: number) {
  // stubble is painted on the skin (see headPaint); short and full beards are a shell with strands
  if (l.beard === 'none' || l.beard === 'stubble') return;
  const full = l.beard === 'full';
  const curly = curls(90, seed + 7, 1.0);
  const st = strands(new THREE.Vector3(0, -1, 0.15), 70, seed + 9);
  const thick = (el: number, _az: number, d: THREE.Vector3) =>
    (full ? 0.045 + 0.13 * ramp(el, -0.55, -1.25) + 0.022 * curly(d) : 0.03 + 0.042 * ramp(el, -0.6, -1.2)) - 0.009 * (1 - st(d));
  B.put('head', shell((el, az) => beardCover(el, az), thick, 128, 96, 0.9), hairPaint(hair, full ? curly : undefined, st));
  // moustache joined to the beard: fuller in the middle, groomed thin at the tips
  const m = lock([onHead(-0.43, -0.37, 1.03), onHead(-0.355, -0.17, 1.065), onHead(-0.335, 0, 1.075), onHead(-0.355, 0.17, 1.065), onHead(-0.43, 0.37, 1.03)],
    (t) => (full ? 0.011 : 0.008) + (full ? 0.019 : 0.012) * Math.sin(Math.PI * t) ** 0.7, { segs: 20, radial: 10, depth: 0.62, flute: 0.12, flutes: 4 });
  B.put('head', m, darken(hair, 0.85));
}

/* -------------------------------------------------------------- glasses */
/** Lens outline (centred, +x = the outer side): round, rectangular or cat-eye with upswept corners. */
function lensShape(kind: 'round' | 'rect' | 'cat'): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    if (kind === 'round') { pts.push([c * 0.074, sn * 0.072]); continue; }
    const pw = kind === 'rect' ? 5 : 3.2, w = kind === 'rect' ? 0.152 : 0.158, h = kind === 'rect' ? 0.106 : 0.1;
    let x = Math.sign(c) * Math.abs(c) ** (2 / pw) * w / 2, y = Math.sign(sn) * Math.abs(sn) ** (2 / pw) * h / 2;
    if (kind === 'cat') { const o = Math.max(0, x / (w / 2)); if (y > 0) y += 0.03 * o ** 2.2; else y *= 0.86 + 0.14 * (1 - o); }
    pts.push([x, y]);
  }
  return pts;
}

function glasses(B: Builder, kind: 'round' | 'rect' | 'cat', surf: (x: number, y: number) => number) {
  const frame = kind === 'cat' ? '#4a1f45' : '#17191d';
  const t = kind === 'round' ? 0.0078 : kind === 'cat' ? 0.0105 : 0.0092;
  const shape = lensShape(kind), half = Math.max(...shape.map((p) => p[0]));
  const cx = 0.106, cy = -0.004, cz = surf(0.105, 0) + 0.034, wrap = 0.2;
  B.mat = 'glossy';
  for (const s of [-1, 1]) {
    const pts = shape.map(([x, y]) => new THREE.Vector3(x * s, y, 0));
    // frame: a tube around the outline, the lens wrapped back a little at the temples
    B.add('head', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 120, t, 8, true), frame, [s * cx, cy, cz], [0, s * wrap, 0]);
    if (kind === 'cat') B.add('head', new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.filter((p) => p.y > 0.004), false), 60, t * 0.9, 8, false), frame, [s * cx, cy + 0.004, cz + 0.003], [0, s * wrap, 0]); // bolder brow line
    // lens: a gently domed disc inside the frame (see-through material at runtime)
    const lens = new THREE.ShapeGeometry(new THREE.Shape(shape.map(([x, y]) => new THREE.Vector2(x * s, y))), 12);
    const lp = lens.getAttribute('position');
    for (let i = 0; i < lp.count; i++) lp.setZ(i, -0.002 - (lp.getX(i) ** 2 + lp.getY(i) ** 2) * 0.9);
    lens.computeVertexNormals();
    B.add('lens', lens, '#e8f4ff', [s * cx, cy, cz], [0, s * wrap, 0]);
    // temple arm: from the hinge, along the side of the head, over the ear and hooked behind it
    const hx = s * (cx + half * Math.cos(wrap)), hz = cz - half * Math.sin(wrap);
    const arm = [new THREE.Vector3(hx, cy + 0.024, hz), new THREE.Vector3(s * 0.236, 0.03, hz - 0.07), new THREE.Vector3(s * 0.276, 0.046, 0.115), new THREE.Vector3(s * 0.303, 0.057, 0.0), new THREE.Vector3(s * 0.298, 0.012, -0.075)];
    B.add('head', lock(arm, () => t * 0.78, { segs: 24, radial: 8, depth: 0.55 }), frame);
    B.add('head', rbox(0.016, 0.022, 0.012, 0.004), frame, [hx, cy + 0.024, hz]); // hinge
  }
  // bridge (a small arch) and nose pads
  const ix = cx - half * Math.cos(wrap) + 0.003, iz = cz + half * Math.sin(wrap);
  B.add('head', lock([new THREE.Vector3(-ix, 0.014, iz), new THREE.Vector3(0, 0.026, iz + 0.006), new THREE.Vector3(ix, 0.014, iz)], () => t * 0.85, { segs: 12, radial: 8 }), frame);
  B.mat = 'glossy';
  for (const s of [-1, 1]) B.add('head', sphere(0.0075, 8, 6), '#dfe6ee', [s * 0.026, -0.03, surf(0.026, -0.03) + 0.006]);
}

/* ----------------------------------------------------------------- hair */
function hairdo(B: Builder, l: TeacherLook, hair: string, seed: number) {
  const deepPaint = '#' + tone(hair, 0.55).getHexString();
  const dir = (el: number, az: number) => onHead(el, az, 1).normalize();
  /** Strand clumps flowing from a pole: a groove in the shell and a darker line in the colour. */
  const flow = (pole: THREE.Vector3, k = 44, wave = 0) => { const f = strands(pole, k, seed + 21); return wave ? (d: THREE.Vector3) => f(d.clone().applyAxisAngle(pole, Math.sin(d.dot(pole) * 9) * wave)) : f; };
  const put = (g: THREE.BufferGeometry, st?: (d: THREE.Vector3) => number) => B.put('head', g, hairPaint(hair, undefined, st));
  const crown = (el: number) => 1 - ss(1.25, 1.45, el); // parts and grooves fade out at the top of the head
  const partAt = (el: number, az: number, at: number, w = 0.06) => 1 - 0.5 * Math.exp(-(((az - at) / w) ** 2)) * ss(0.45, 0.85, el) * crown(el);
  const groove = (st: (d: THREE.Vector3) => number, amp: number) => (d: THREE.Vector3, c: number) => amp * (st(d) - 1) * ss(0.25, 0.85, c);
  const longLocks = (o: { len: number; r0: number; r1: number; wave: number; waves: number; depth: number; curlIn?: number; ringlets?: boolean; flare?: number }) => {
    const r = rng(seed + 3);
    const front = o.ringlets ? [0.92, 1.07, 1.22] : [0.86, 0.98, 1.1, 1.22];
    const back = o.ringlets ? [1.55, 1.74, 1.93, 2.12, 2.31, 2.5, 2.69, 2.88] : [1.42, 1.62, 1.82, 2.02, 2.22, 2.42, 2.62, 2.82, 3.0];
    const all = [...front, ...back].flatMap((a) => [a + (r() - 0.5) * 0.05, -a - (r() - 0.5) * 0.05]).concat([Math.PI]);
    const at = (az: number, start: THREE.Vector3, len: number, f: number, wave: number, outWave = 0) => {
      const out = new THREE.Vector3(Math.sin(az), 0, Math.cos(az)), tan = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
      const fl = (o.flare ?? 0.02) * f;
      const p = new THREE.Vector3(Math.sin(az) * (R * 1.08 + fl), start.y - len * f, Math.cos(az) * (R * 1.08 * 0.92 + fl));
      if (f < 0.25) p.lerp(start, 1 - f / 0.25); // leave the head smoothly
      return p.addScaledVector(tan, wave).addScaledVector(out, outWave);
    };
    if (!o.ringlets) // a darker under-layer first, so no gaps show between the locks
      for (const az of [1.3, 1.75, 2.2, 2.65, 3.05].flatMap((a) => [a, -a])) {
        const start = onHead(0.12, az, 1.0), pts = [onHead(0.3, az, 0.9)];
        for (let k = 0; k <= 5; k++) pts.push(at(az, start, o.len * 0.9, k / 5, 0).multiplyScalar(0.97));
        B.put('head', lock(pts, (t) => 0.085 * (1 - 0.25 * t), { segs: 14, radial: 8, depth: 0.4 }), deepPaint);
      }
    for (const az of all) {
      const isFront = Math.abs(az) < 1.5;
      const startEl = isFront ? 0.14 : 0.3;
      const start = onHead(startEl, az, 1.06);
      const len = o.len * (isFront ? 0.92 : 1) * (0.93 + r() * 0.12);
      const phase = r() * Math.PI * 2, rk = 0.88 + r() * 0.24;
      const paint = hairPaint('#' + tone(hair, 0.9 + r() * 0.2).getHexString());
      const out = new THREE.Vector3(Math.sin(az), 0, Math.cos(az));
      if (o.ringlets) {
        // a spring-like curl: a helix around the hanging axis
        const pts = [onHead(startEl + 0.28, az, 0.95)];
        const turns = 4.5 + r(), rc = 0.03;
        for (let k = 0; k <= 56; k++) {
          const f = k / 56, w = ss(0.05, 0.22, f) * rc, a = f * turns * Math.PI * 2 + phase;
          pts.push(at(az, start, len, f, Math.cos(a) * w).addScaledVector(out, Math.sin(a) * w));
        }
        B.put('head', lock(pts, (t) => 0.034 * rk * (0.6 + 0.4 * ss(0, 0.12, t)) * (1 - 0.25 * t), { segs: 72, radial: 9, flute: 0.12, flutes: 3 }), paint);
        if (!isFront) {
          // a flat, darker layer of hair behind the back ringlets
          const back = [onHead(startEl + 0.2, az, 0.95)];
          for (let k = 0; k <= 5; k++) back.push(at(az, start, len, k / 5 * 0.92, 0).multiplyScalar(0.97));
          B.put('head', lock(back, (t) => 0.075 * (1 - 0.3 * t), { segs: 14, radial: 8, depth: 0.45 }), hairPaint('#' + tone(hair, 0.78).getHexString()));
        }
      } else {
        const pts = [onHead(startEl + 0.3, az, 0.95)];
        const K = 9;
        for (let k = 0; k <= K; k++) {
          const f = k / K, e = ss(0.1, 0.4, f);
          pts.push(at(az, start, len, f, o.wave * Math.sin(f * o.waves * Math.PI + phase) * e, o.wave * 0.45 * Math.cos(f * o.waves * Math.PI + phase) * e));
        }
        if (o.curlIn) { const end = pts[pts.length - 1]; pts.push(end.clone().addScaledVector(out, -o.curlIn).add(new THREE.Vector3(0, 0.03, 0))); }
        B.put('head', lock(pts, (t) => lerp(o.r0, o.r1, t) * rk * (0.45 + 0.55 * ss(0, 0.28, t)) * (t > 0.86 ? 1 - ((t - 0.86) / 0.14) * 0.6 : 1), { segs: 28, radial: 12, depth: o.depth * (0.8 + 0.2 * rk), flute: 0.14, flutes: 3 }), paint);
      }
    }
  };
  /** Curly volume: big curls plus small ones between them; gaps darker, tops lighter. */
  const curlShell = (n: number, amp: number, base: (el: number) => number, line: [number, number, number], w = 144, hh = 100) => {
    const c1 = curls(n, seed, 1.0), c2 = curls(n * 3, seed + 5, 0.85);
    const c = (d: THREE.Vector3) => Math.max(c1(d), 0.6 * c2(d));
    B.put('head', shell((el, az) => hairline(el, az, ...line), (el, _az, d) => base(el) + amp * c(d), w, hh), hairPaint(hair, c));
  };

  switch (l.hair) {
    case 'shortNeat': {
      // neat cut: side part, a little lift at the front, strands combed away from the part
      const st = flow(dir(1.0, 0.42), 46), g = groove(st, 0.016);
      put(shell((el, az) => hairline(el, az, 0.6, 0.14, -1.0), (el, az, d, c) =>
        (0.04 + 0.04 * ss(0.2, 1.1, el) + 0.035 * Math.exp(-((az / 0.55) ** 2)) * ss(0.45, 0.8, el) * crown(el)) * partAt(el, az, 0.42) + g(d, c)), st);
      break;
    }
    case 'silverNeat': {
      // silver hair combed back from a side part: clear comb lines so it reads as hair, not a cap
      const st = flow(dir(0.75, 0.5), 54), g = groove(st, 0.022);
      const salt = (d: THREE.Vector3) => { const h = Math.sin(d.x * 412.7 + d.y * 271.3 + d.z * 197.1) * 43758.5; return st(d) * (0.55 + 0.45 * (h - Math.floor(h))); };
      put(shell((el, az) => hairline(el, az, 0.68 + 0.1 * Math.exp(-(((Math.abs(az) - 0.55) / 0.2) ** 2)), 0.14, -1.0), (el, az, d, c) => (0.045 + 0.035 * ss(0.2, 1.1, el)) * partAt(el, az, 0.5) + g(d, c)), salt);
      break;
    }
    case 'slick': {
      // slicked back: strands run from the brow line to the nape, a little volume over the forehead
      const st = flow(dir(0.45, 0), 48), g = groove(st, 0.018);
      put(shell((el, az) => hairline(el, az, 0.6, 0.12, -1.05), (el, _az, d, c) => 0.045 + 0.03 * ss(0.4, 1.0, el) * ss(-0.1, 0.6, d.z) + 0.02 * ss(-0.2, -0.8, d.z) * ss(-0.3, 0.4, el) + g(d, c)), st);
      break;
    }
    case 'sporty': {
      // athletic short cut: faded sides, a textured top of short tufts
      const st = flow(dir(1.2, Math.PI), 40), g = groove(st, 0.01);
      put(shell((el, az) => hairline(el, az, 0.62, 0.22, -0.95), (el, _az, d, c) => 0.022 + 0.035 * ss(0.5, 1.0, el) + g(d, c)), st);
      const r = rng(seed + 11), paint = hairPaint(hair);
      for (let i = 0; i < 90; i++) {
        const el = 0.72 + r() * 0.75, az = (r() - 0.5) * 2 * Math.min(1.25, 2.05 - el), base = onHead(el, az, 1.045);
        const d0 = onHead(el + 0.55, az * 0.9, 1).sub(onHead(el - 0.25, az, 0.3)).normalize();
        const cone = new THREE.ConeGeometry(0.02 + r() * 0.008, 0.03 + r() * 0.016, 6).translate(0, 0.012, 0);
        cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), d0)).translate(base.x, base.y, base.z);
        B.put('head', cone, paint);
      }
      break;
    }
    case 'receding': {
      // bald crown and temples, short hair around the sides and the back
      const st = flow(dir(1.4, 0), 40), g = groove(st, 0.01);
      put(shell((el, az) => hairline(el, az, 1.18, 0.18, -0.95) * (1 - ss(1.25, 1.42, el) * ss(1.6, 0.6, Math.abs(az))), (el, _az, d, c) => 0.032 + 0.01 * ss(0.4, 0.9, el) + g(d, c)), st);
      break;
    }
    case 'bob': {
      // chin-length bob with straight bangs, fuller and turned in at the ends, straight comb lines
      const st = flow(new THREE.Vector3(0, 1, 0), 56), g = groove(st, 0.016);
      put(shell((el, az) => hairline(el, az, 0.38, -0.45, -0.85, 0.1), (el, az, d, c) => (0.05 + 0.1 * ramp(el, 0.25, -0.45) + 0.015 * ss(0.6, 0.9, el)) * partAt(el, az, 0.0, 0.05) + g(d, c)), st);
      break;
    }
    case 'emoFringe': {
      const st = flow(new THREE.Vector3(0, 1, 0), 48), g = groove(st, 0.014);
      put(shell((el, az) => hairline(el, az, 0.6, -0.32, -0.9), (el, _az, d, c) => 0.06 + 0.05 * ramp(el, 0.2, -0.4) + g(d, c)), st);
      // a side-swept fringe over the forehead, in layered pointed locks
      for (let i = 0; i < 7; i++) {
        const f = i / 6;
        const pts = [onHead(1.05, 0.55 - f * 0.15, 0.96), onHead(0.85 - f * 0.05, 0.42 - f * 0.25, 1.08), onHead(0.52, 0.12 - f * 0.45, 1.09), onHead(0.3 - f * 0.08, -0.25 - f * 0.45, 1.07), onHead(0.16 - f * 0.08, -0.55 - f * 0.4, 1.04)];
        B.put('head', lock(pts, (t) => 0.046 * (1 - 0.85 * t), { segs: 20, radial: 10, depth: 0.5, flute: 0.15, flutes: 3 }), hairPaint('#' + tone(hair, 0.95 + (i % 3) * 0.05).getHexString()));
      }
      break;
    }
    case 'straightLong': {
      const st = flow(new THREE.Vector3(0, 1, 0), 52), g = groove(st, 0.014);
      put(shell((el, az) => hairline(el, az, 0.6, 0.02, -1.1), (el, az, d, c) => (0.055 + 0.02 * ss(0.3, 1.1, el)) * partAt(el, az, 0, 0.05) + g(d, c)), st);
      longLocks({ len: 0.68, r0: 0.07, r1: 0.06, wave: 0.005, waves: 2, depth: 0.6 });
      break;
    }
    case 'wavyLong': {
      const st = flow(new THREE.Vector3(0, 1, 0), 48, 0.35), g = groove(st, 0.016);
      put(shell((el, az) => hairline(el, az, 0.6, 0.02, -1.1), (el, az, d, c) => (0.06 + 0.025 * ss(0.3, 1.1, el)) * partAt(el, az, 0.12, 0.05) + g(d, c)), st);
      longLocks({ len: 0.66, r0: 0.07, r1: 0.05, wave: 0.05, waves: 2.6, depth: 0.78, flare: 0.05 });
      break;
    }
    case 'styledLong': {
      // a glossy blow-out: volume on top, a deep side part, a swept bang, ends turned in
      const st = flow(dir(1.0, 0.5), 50), g = groove(st, 0.016);
      const sweep = (az: number) => 0.13 * Math.exp(-(((az + 0.3) / 0.38) ** 2));
      put(shell((el, az) => hairline(el, az, 0.62 - sweep(az), 0.02, -1.1), (el, az, d, c) => (0.075 + 0.04 * ss(0.3, 1.1, el) + 0.6 * sweep(az) * ss(0.95, 0.5, el)) * partAt(el, az, 0.5, 0.05) + g(d, c)), st);
      longLocks({ len: 0.62, r0: 0.078, r1: 0.066, wave: 0.014, waves: 1.5, depth: 0.7, curlIn: 0.07, flare: 0.035 });
      break;
    }
    case 'afro':
      // big rounded volume made of curls
      curlShell(190, 0.075, (el) => 0.26 + 0.34 * ss(-0.35, 1.05, el), [0.62, 0.1, -0.75], 160, 112);
      break;
    case 'midCurly':
      curlShell(120, 0.08, (el) => 0.045 + 0.035 * ss(0.2, 1.0, el), [0.6, 0.12, -0.95]);
      break;
    case 'shortCurly':
      curlShell(120, 0.08, (el) => 0.06 + 0.025 * ss(0.2, 1.0, el), [0.5, -0.22, -0.9]);
      break;
    case 'longCurly':
      curlShell(110, 0.08, (el) => 0.06 + 0.04 * ss(0.2, 1.0, el), [0.58, 0.0, -1.1]);
      longLocks({ len: l.height > 1.15 ? 0.74 : 0.66, r0: 0.034, r1: 0.026, wave: 0, waves: 0, depth: 1, ringlets: true, flare: 0.03 });
      break;
    case 'ponytail': {
      // pulled back: the strands meet at the hair tie
      const st = flow(dir(0.42, Math.PI), 50), g = groove(st, 0.014);
      put(shell((el, az) => hairline(el, az, 0.62, 0.1, -1.0), (el, _az, d, c) => 0.035 + 0.012 * ss(0.4, 1.1, el) + g(d, c)), st);
      const tail = [onHead(0.5, Math.PI, 0.9), onHead(0.42, Math.PI, 1.12), new THREE.Vector3(0, 0.02, -0.4), new THREE.Vector3(0.01, -0.16, -0.44), new THREE.Vector3(-0.01, -0.32, -0.41), new THREE.Vector3(0.02, -0.46, -0.36)];
      B.put('head', lock(tail, (t) => (0.055 + 0.03 * Math.sin(Math.PI * Math.min(1, t * 1.6))) * (1 - 0.75 * t), { segs: 32, radial: 14, flute: 0.16, flutes: 5 }), hairPaint(hair));
      const rr = rng(seed + 31);
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2, ox = Math.cos(a) * 0.03, oz = Math.sin(a) * 0.02;
        const sub = tail.slice(2).map((q, k) => q.clone().add(new THREE.Vector3(ox * (1 + k * 0.3), -rr() * 0.02, oz)));
        B.put('head', lock([tail[1].clone(), ...sub], (t) => 0.026 * (1 - 0.8 * t) * (0.6 + 0.4 * ss(0, 0.15, t)), { segs: 26, radial: 9, flute: 0.15, flutes: 3 }), hairPaint('#' + tone(hair, 0.9 + rr() * 0.2).getHexString()));
      }
      const tie = onHead(0.42, Math.PI, 1.1);
      B.add('head', torus(0.045, 0.016, 8, 18), '#e23d4f', [tie.x, tie.y, tie.z], [0.3, 0, 0]);
      break;
    }
    case 'bun': {
      // pulled up into a bun: strands meet at it; the bun is wrapped coils
      const st = flow(dir(0.82, Math.PI), 50), g = groove(st, 0.014);
      put(shell((el, az) => hairline(el, az, 0.62, 0.1, -1.0), (el, _az, d, c) => 0.035 + 0.012 * ss(0.4, 1.1, el) + g(d, c)), st);
      const c = onHead(0.82, Math.PI, 1.3), paint = hairPaint(hair);
      B.add('head', sphere(0.112, 18, 14), paint, [c.x, c.y, c.z]);
      for (let i = 0; i < 4; i++) B.add('head', torus(0.09 - i * 0.022, 0.026, 8, 24), paint, [c.x, c.y + 0.02 + i * 0.026, c.z], [Math.PI / 2 - 0.9, 0, i * 0.7]);
      break;
    }
  }
}

/* ----------------------------------------------------------------- clips */
type Keys = Record<string, { t: number[]; rot?: V3[]; pos?: V3[]; scl?: V3[] }>;
function clip(name: ToonClip, dur: number, k: Keys) {
  const tracks: THREE.KeyframeTrack[] = [];
  for (const [n, v] of Object.entries(k)) {
    if (v.rot) tracks.push(new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, v.t, v.rot.flatMap((e) => new THREE.Quaternion().setFromEuler(new THREE.Euler(...e)).toArray())));
    if (v.pos) tracks.push(new THREE.VectorKeyframeTrack(`${n}.position`, v.t, v.pos.flat()));
    if (v.scl) tracks.push(new THREE.VectorKeyframeTrack(`${n}.scale`, v.t, v.scl.flat()));
  }
  return new THREE.AnimationClip(name, dur, tracks);
}
/** Tracks that hold one expression for the whole clip (every clip sets all pieces, so cross-fades are clean). */
function faceKeys(f: Face, dur: number, blinkEyes = false): Keys {
  const on: V3 = [1, 1, 1], off: V3 = [FACE_OFF, FACE_OFF, FACE_OFF];
  const d = FACES[f], k: Keys = {};
  for (const e of ['eyeL', 'eyeR'] as const) {
    for (const v of ['Open', 'Shut', 'Heart'] as const) k[e + v] = { t: [0, dur], scl: [d[e] === v ? on : off, d[e] === v ? on : off] };
    const w = d.wide ?? 1;
    k[e] = blinkEyes ? { t: [0, 1.9, 1.96, 2.04, 2.4], scl: [[1, 1, 1], [1, 1, 1], [1, 0.1, 1], [1, 1, 1], [1, 1, 1]] } : { t: [0, dur], scl: [[w, w, 1], [w, w, 1]] };
  }
  for (const m of ['N', 'O', 'S', 'F'] as const) k['mouth' + m] = { t: [0, dur], scl: [d.mouth === m ? on : off, d.mouth === m ? on : off] };
  return k;
}
export function toonClips(legLen: number) {
  const r = (x: number, y: number, z: number): V3 => [x, y, z];
  const hipsAt = (dy: number): V3 => [0, legLen + dy, 0];
  return [
    clip('idle', 2.4, {
      chest: { t: [0, 1.2, 2.4], pos: [[0, 0, 0], [0, 0.008, 0], [0, 0, 0]], rot: [r(0, 0, 0), r(0, 0, 0), r(0, 0, 0)] },
      armL: { t: [0, 1.2, 2.4], rot: [r(0, 0, -0.04), r(0.04, 0, -0.1), r(0, 0, -0.04)] },
      armR: { t: [0, 1.2, 2.4], rot: [r(0, 0, 0.04), r(-0.04, 0, 0.1), r(0, 0, 0.04)] },
      head: { t: [0, 1.2, 2.4], rot: [r(0, 0, 0.03), r(0.03, 0, -0.03), r(0, 0, 0.03)] },
      legL: { t: [0, 2.4], rot: [r(0, 0, 0), r(0, 0, 0)] }, legR: { t: [0, 2.4], rot: [r(0, 0, 0), r(0, 0, 0)] },
      ...faceKeys('smile', 2.4, true),
    }),
    clip('walk', 0.62, {
      legL: { t: [0, 0.31, 0.62], rot: [r(0.62, 0, 0), r(-0.62, 0, 0), r(0.62, 0, 0)] },
      legR: { t: [0, 0.31, 0.62], rot: [r(-0.62, 0, 0), r(0.62, 0, 0), r(-0.62, 0, 0)] },
      armL: { t: [0, 0.31, 0.62], rot: [r(-0.55, 0, -0.08), r(0.55, 0, -0.08), r(-0.55, 0, -0.08)] },
      armR: { t: [0, 0.31, 0.62], rot: [r(0.55, 0, 0.08), r(-0.55, 0, 0.08), r(0.55, 0, 0.08)] },
      chest: { t: [0, 0.155, 0.31, 0.465, 0.62], pos: [[0, 0, 0], [0, 0.028, 0], [0, 0, 0], [0, 0.028, 0], [0, 0, 0]], rot: [r(0.08, 0, 0.03), r(0.08, 0, 0), r(0.08, 0, -0.03), r(0.08, 0, 0), r(0.08, 0, 0.03)] },
      head: { t: [0, 0.62], rot: [r(-0.05, 0, 0), r(-0.05, 0, 0)] },
      ...faceKeys('smile', 0.62),
    }),
    // run: big strides, arms pumping, leaning forward (for a runner game)
    clip('run', 0.44, {
      legL: { t: [0, 0.22, 0.44], rot: [r(1.0, 0, 0), r(-0.95, 0, 0), r(1.0, 0, 0)] },
      legR: { t: [0, 0.22, 0.44], rot: [r(-0.95, 0, 0), r(1.0, 0, 0), r(-0.95, 0, 0)] },
      armL: { t: [0, 0.22, 0.44], rot: [r(-0.95, 0, -0.18), r(0.85, 0, -0.18), r(-0.95, 0, -0.18)] },
      armR: { t: [0, 0.22, 0.44], rot: [r(0.85, 0, 0.18), r(-0.95, 0, 0.18), r(0.85, 0, 0.18)] },
      chest: { t: [0, 0.11, 0.22, 0.33, 0.44], pos: [[0, 0, 0], [0, 0.045, 0], [0, 0, 0], [0, 0.045, 0], [0, 0, 0]], rot: [r(0.24, 0.06, 0), r(0.24, 0, 0), r(0.24, -0.06, 0), r(0.24, 0, 0), r(0.24, 0.06, 0)] },
      head: { t: [0, 0.44], rot: [r(-0.18, 0, 0), r(-0.18, 0, 0)] },
      ...faceKeys('grin', 0.44),
    }),
    clip('jump', 0.3, {
      legL: { t: [0, 0.3], rot: [r(0.2, 0, 0), r(1.0, 0, -0.05)] },
      legR: { t: [0, 0.3], rot: [r(-0.1, 0, 0), r(-0.45, 0, 0.05)] },
      armL: { t: [0, 0.3], rot: [r(0, 0, -0.4), r(0, 0, -2.55)] },
      armR: { t: [0, 0.3], rot: [r(0, 0, 0.4), r(0, 0, 2.55)] },
      chest: { t: [0, 0.3], rot: [r(-0.05, 0, 0), r(-0.12, 0, 0)] },
      head: { t: [0, 0.3], rot: [r(0, 0, 0), r(-0.15, 0, 0)] },
      ...faceKeys('grin', 0.3),
    }),
    clip('fall', 0.8, {
      legL: { t: [0, 0.4, 0.8], rot: [r(0.25, 0, -0.25), r(0.15, 0, -0.34), r(0.25, 0, -0.25)] },
      legR: { t: [0, 0.4, 0.8], rot: [r(-0.1, 0, 0.25), r(0.05, 0, 0.34), r(-0.1, 0, 0.25)] },
      armL: { t: [0, 0.2, 0.4, 0.6, 0.8], rot: [r(0, 0, -1.35), r(0, 0, -1.6), r(0, 0, -1.35), r(0, 0, -1.6), r(0, 0, -1.35)] },
      armR: { t: [0, 0.2, 0.4, 0.6, 0.8], rot: [r(0, 0, 1.35), r(0, 0, 1.6), r(0, 0, 1.35), r(0, 0, 1.6), r(0, 0, 1.35)] },
      head: { t: [0, 0.8], rot: [r(0.12, 0, 0), r(0.12, 0, 0)] },
      chest: { t: [0, 0.8], rot: [r(0.05, 0, 0), r(0.05, 0, 0)] },
      ...faceKeys('surprised', 0.8),
    }),
    // slide: drop low, lean back, legs forward (held at the end; for a runner game)
    clip('slide', 0.45, {
      hips: { t: [0, 0.15, 0.45], pos: [hipsAt(0), hipsAt(-legLen * 0.55), hipsAt(-legLen * 0.55)] },
      legL: { t: [0, 0.15, 0.45], rot: [r(0, 0, 0), r(-1.4, 0, -0.05), r(-1.4, 0, -0.05)] },
      legR: { t: [0, 0.15, 0.45], rot: [r(0, 0, 0), r(-1.2, 0, 0.05), r(-1.2, 0, 0.05)] },
      chest: { t: [0, 0.15, 0.45], rot: [r(0, 0, 0), r(-0.6, 0, 0), r(-0.6, 0, 0)] },
      armL: { t: [0, 0.15, 0.45], rot: [r(0, 0, -0.1), r(-0.4, 0, -1.0), r(-0.4, 0, -1.0)] },
      armR: { t: [0, 0.15, 0.45], rot: [r(0, 0, 0.1), r(-0.4, 0, 1.0), r(-0.4, 0, 1.0)] },
      head: { t: [0, 0.15, 0.45], rot: [r(0, 0, 0), r(0.45, 0, 0), r(0.45, 0, 0)] },
      ...faceKeys('grin', 0.45),
    }),
    clip('hit', 0.45, {
      chest: { t: [0, 0.12, 0.45], rot: [r(0, 0, 0), r(-0.4, 0, 0.1), r(0, 0, 0)] },
      head: { t: [0, 0.12, 0.45], rot: [r(0, 0, 0), r(-0.35, 0, -0.15), r(0, 0, 0)] },
      armL: { t: [0, 0.12, 0.3, 0.45], rot: [r(0, 0, -0.1), r(-0.3, 0, -2.1), r(0, 0, -1.6), r(0, 0, -0.3)] },
      armR: { t: [0, 0.12, 0.3, 0.45], rot: [r(0, 0, 0.1), r(-0.3, 0, 2.1), r(0, 0, 1.6), r(0, 0, 0.3)] },
      legL: { t: [0, 0.12, 0.45], rot: [r(0, 0, 0), r(-0.5, 0, -0.15), r(0, 0, 0)] },
      legR: { t: [0, 0.12, 0.45], rot: [r(0, 0, 0), r(0.45, 0, 0.15), r(0, 0, 0)] },
      ...faceKeys('surprised', 0.45),
    }),
    // cheer: arms up waving, little hops (a win screen)
    clip('cheer', 1.0, {
      hips: { t: [0, 0.25, 0.5, 0.75, 1.0], pos: [hipsAt(0), hipsAt(0.07), hipsAt(0), hipsAt(0.07), hipsAt(0)] },
      armL: { t: [0, 0.25, 0.5, 0.75, 1.0], rot: [r(0, 0, -2.5), r(0, 0, -2.85), r(0, 0, -2.5), r(0, 0, -2.85), r(0, 0, -2.5)] },
      armR: { t: [0, 0.25, 0.5, 0.75, 1.0], rot: [r(0, 0, 2.85), r(0, 0, 2.5), r(0, 0, 2.85), r(0, 0, 2.5), r(0, 0, 2.85)] },
      head: { t: [0, 0.5, 1.0], rot: [r(-0.1, 0, 0.1), r(-0.1, 0, -0.1), r(-0.1, 0, 0.1)] },
      legL: { t: [0, 0.25, 0.5, 0.75, 1.0], rot: [r(0, 0, 0), r(0.3, 0, -0.1), r(0, 0, 0), r(0.3, 0, -0.1), r(0, 0, 0)] },
      legR: { t: [0, 0.25, 0.5, 0.75, 1.0], rot: [r(0, 0, 0), r(0.3, 0, 0.1), r(0, 0, 0), r(0.3, 0, 0.1), r(0, 0, 0)] },
      ...faceKeys('happy', 1.0),
    }),
  ];
}
