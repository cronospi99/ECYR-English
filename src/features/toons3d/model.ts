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
/** A rounded-rectangle ring (glasses frames): a tube around a superellipse of power `pw`. */
function ringGeo(w: number, h: number, t: number, pw = 4) {
  const pts: THREE.Vector3[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2, c = Math.cos(a), sn = Math.sin(a);
    pts.push(new THREE.Vector3(Math.sign(c) * Math.abs(c) ** (2 / pw) * w / 2, Math.sign(sn) * Math.abs(sn) ** (2 / pw) * h / 2, 0));
  }
  return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts, true), 64, t, 8, true);
}
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
function shell(cover: (el: number, az: number, d: THREE.Vector3) => number, thick: (el: number, az: number, d: THREE.Vector3) => number, w = 64, h = 44, inner = 0.86) {
  const g0 = new THREE.SphereGeometry(1, w, h);
  g0.deleteAttribute('uv'); g0.deleteAttribute('normal');
  const g = mergeVertices(g0);
  const p = g.getAttribute('position') as THREE.BufferAttribute;
  const d = new THREE.Vector3();
  for (let i = 0; i < p.count; i++) {
    d.fromBufferAttribute(p, i).normalize();
    const el = Math.asin(Math.max(-1, Math.min(1, d.y))), az = Math.atan2(d.x, d.z);
    const c = cover(el, az, d);
    const r = c <= 0 ? inner : inner + (1 + thick(el, az, d) - inner) * c;
    p.setXYZ(i, d.x * r * R * HS[0], d.y * r * R * HS[1], d.z * r * R * HS[2]);
  }
  g.computeVertexNormals();
  return g;
}

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
  return (d: THREE.Vector3) => { let m = 0; for (const q of pts) { const dd = d.distanceToSquared(q) / s2; if (dd < 1) m = Math.max(m, Math.sqrt(1 - dd)); } return m; };
}

/**
 * A tapered tube along a smooth curve (hair locks, ringlets, ponytail, brows, moustache).
 * The cross-section is flattened against the head by `depth` (< 1 → a ribbon).
 */
function lock(pts: THREE.Vector3[], radius: (t: number) => number, o: { radial?: number; segs?: number; depth?: number } = {}) {
  const curve = new THREE.CatmullRomCurve3(pts, false, 'catmullrom', 0.5);
  const segs = o.segs ?? 18, rad = o.radial ?? 8, depth = o.depth ?? 1;
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
      const a = (j / rad) * Math.PI * 2, cs = Math.cos(a) * r, sn = Math.sin(a) * r * depth;
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
function hairPaint(base: string, curl?: (d: THREE.Vector3) => number): Paint {
  const lo = tone(base, 0.72), hi = tone(base, 1.12, 0.05), shine = tone(base, 1.25, 0.24), deep = tone(base, 0.5), top = tone(base, 1.3, 0.14);
  const d = new THREE.Vector3();
  return (x, y, z) => {
    const c = lo.clone().lerp(hi, ss(-0.62, 0.32, y));
    if (curl) { const k = curl(d.set(x / HS[0], y / HS[1], z / HS[2]).normalize()); c.lerp(deep, (1 - k) * 0.6).lerp(top, k * k * 0.45); }
    const s = Math.exp(-(((y - 0.21) / 0.045) ** 2)) * clamp01(z / 0.22 + 0.45);
    return c.lerp(shine, s * (curl ? 0.3 : 0.6));
  };
}

/* ---------------------------------------------------------------- model */
export function buildToon(l: TeacherLook, skin: SkinTone, id = '') {
  const B = new Builder();
  const h = l.height;
  const legLen = 0.30 * h, torsoLen = 0.42 * h;
  const sw = (l.build === 'slim' ? 21 : l.build === 'broad' ? 30 : 24) / 100;
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
  B.add('hips', sphere(1, 16, 10), pants, [0, 0.02, 0], [0, 0, 0], [sw * 0.98, 0.1, 0.14]);

  /* torso: a pill scaled to the shoulders, plus outfit details */
  const tz = 0.155;
  B.mat = 'cloth';
  // capsule(1, 0.6) is 2 wide and 2.6 tall: scale it to the shoulders × torso (a little overlap)
  // a turned (lathe) body: waist, chest, round shoulders up to the neck; x and z scaled to the build
  const prof = new THREE.SplineCurve([[0, -0.06], [0.84, -0.055], [0.93, 0.0], [0.95, 0.18], [0.99, 0.48], [1.0, 0.7], [0.96, 0.85], [0.84, 0.95], [0.58, 1.01], [0.28, 1.04], [0, 1.05]].map(([r, y]) => new THREE.Vector2(r, y))).getPoints(40);
  const rAt = (y: number) => { const v = y / torsoLen; for (let i = 1; i < prof.length; i++) if (prof[i].y >= v) { const a = prof[i - 1], b = prof[i]; return a.x + (b.x - a.x) * ((v - a.y) / Math.max(1e-6, b.y - a.y)); } return 0; };
  const body = new THREE.LatheGeometry(prof.map((q) => new THREE.Vector2(Math.max(0.001, q.x), q.y * torsoLen)), 40);
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
      const collar = l.outfit === 'uniform' ? '#f2efe6' : topL;
      B.add('chest', torus(0.074, 0.018, 8, 20), collar, [0, torsoLen + 0.004, -0.005], [Math.PI / 2 - 0.15, 0, 0], [1.12, 1, 1]); // collar band
      for (const s of [-1, 1]) {
        const pts: [number, number][] = [[0, 0], [s * 0.088, 0.006], [s * 0.034, -0.085]];
        if (s < 0) pts.reverse();
        B.add('chest', flat(pts, 0.006, 0.004), collar, [s * 0.006, torsoLen + 0.02, front(torsoLen) - 0.004], [-0.42, 0, 0]);
      }
      // placket and buttons (the polo only has two)
      const n = l.outfit === 'polo' ? 2 : 4;
      B.add('chest', box(0.034, torsoLen * (l.outfit === 'polo' ? 0.3 : 0.86), 0.006), mix(l.top, '#000000', 0.08), [0, torsoLen * (l.outfit === 'polo' ? 0.8 : 0.5), front(torsoLen * 0.62) - 0.001]);
      B.mat = 'glossy';
      for (let i = 0; i < n; i++) { const y = torsoLen * (0.86 - i * 0.2); B.add('chest', cyl(0.0105, 0.0105, 0.006, 9), mix(l.top, '#ffffff', 0.7), [0, y, front(y) + 0.004], [Math.PI / 2, 0, 0]); }
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
  B.add('chest', cyl(0.06, 0.07, 0.08), skin.c, [0, torsoLen + 0.01, 0]); // neck
  B.mat = 'cloth';

  /* arms (pivot at the shoulder), resting slightly out */
  const armLen = torsoLen * 0.82;
  for (const [node, s] of [['armL', -1], ['armR', 1]] as const) {
    const out = s * 0.16;
    const at = (d: number): V3 => [Math.sin(out) * d, -Math.cos(out) * d, 0];
    B.add(node, capsule(0.056, Math.max(0.02, armLen - 0.11)), sleeve, at(armLen / 2 - 0.015), [0, 0, out]);
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
  const blush = mix(skin.c, '#ff7a7a', l.smile === 'shy' ? 0.55 : 0.4);
  const headPaint: Paint = (x, y, z) => {
    const c = col(skin.c);
    const b = Math.max(...[-1, 1].map((sd) => Math.exp(-(((x - sd * 0.165) / 0.062) ** 2 + ((y + 0.08) / 0.048) ** 2)))) * clamp01(z / 0.12);
    c.lerp(col(blush), b * 0.8);
    return c.lerp(col(skin.d), ss(-0.17, -0.29, y) * 0.3);
  };
  B.mat = 'skin';
  B.add(H, new THREE.SphereGeometry(R, 40, 28), headPaint, [0, 0, 0], [0, 0, 0], HS);
  for (const s of [-1, 1]) {
    B.add(H, sphere(0.062, 12, 10), skin.c, [s * R * 1.0, -0.01, -0.02], [0, 0, 0], [0.75, 1, 1]);
    B.add(H, sphere(0.034, 10, 8), mix(skin.c, skin.d, 0.6), [s * (R * 1.0 + 0.022), -0.01, -0.012], [0, 0, 0], [0.4, 1, 0.8]); // inner ear
  }
  if (has('earrings')) { B.mat = 'metal'; for (const s of [-1, 1]) B.add(H, sphere(0.026, 8, 6), '#f5c518', [s * R * 1.02, -0.09, -0.01]); B.mat = 'skin'; }
  const surf = (x: number, y: number) => 0.92 * Math.sqrt(Math.max(0, R * R - x * x - y * y)); // head front z at (x, y)
  B.add(H, sphere(1, 12, 10), mix(skin.c, skin.d, 0.35), [0, -0.055, surf(0, -0.055) + 0.008], [0, 0, 0], [0.03, 0.026, 0.026]); // nose
  // brows: tapered arcs
  B.mat = 'hair';
  const browR = l.beard !== 'none' || l.build === 'broad' ? 0.022 : 0.017;
  for (const s of [-1, 1]) {
    const inner = l.smile === 'serious' || l.smile === 'mysterious' ? 0.29 : 0.34;
    B.put(H, lock([onHead(inner, s * 0.14, 1.035), onHead(0.41, s * 0.32, 1.045), onHead(0.36, s * 0.53, 1.035)], (t) => browR * (1 - 0.5 * t), { segs: 10, radial: 8, depth: 0.6 }), hairD);
  }

  /* mouths: the teacher's own smile (N), an open grin (O), a surprised "O" (S) and a frown (F) */
  const lip = l.lips ?? '#8a3a3a';
  const my = -0.15, mz = surf(0, my) - 0.004;
  B.mat = 'lip';
  if (l.smile === 'big') {
    B.add('mouthN', sphere(1, 18, 10), '#5a1d1d', [0, 0.008, 0], [0, 0, 0], [0.062, 0.042, 0.02]);
    B.add('mouthN', rbox(0.075, 0.018, 0.012, 0.005), '#fbfaf6', [0, 0.03, 0.012]);
    B.add('mouthN', sphere(1, 12, 8), '#ff8a8a', [0, -0.012, 0.01], [0, 0, 0], [0.032, 0.016, 0.012]);
    B.mat = 'skin';
    B.add('mouthN', box(0.15, 0.04, 0.03), '#' + (headPaint(0, my + 0.05, mz) as THREE.Color).getHexString(), [0, 0.058, -0.004]);
  } else if (l.smile === 'serious' || l.smile === 'mysterious') B.add('mouthN', rbox(0.085, 0.015, 0.015, 0.006), lip, [0, 0, 0.006]);
  else if (l.smile === 'smirk') B.add('mouthN', torus(0.055, 0.011, 8, 16, Math.PI * 0.8), lip, [0.015, 0.035, 0.006], [0, 0, Math.PI + 0.35]);
  else B.add('mouthN', torus(0.058, 0.012, 8, 16, Math.PI), lip, [0, 0.04, 0.006], [0, 0, Math.PI]);
  B.mat = 'lip';
  B.add('mouthO', new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), '#4a1416', [0, 0.03, 0.004], [0, 0, 0], [0.07, 0.068, 0.03]);
  B.add('mouthO', rbox(0.09, 0.022, 0.012, 0.006), '#fbfaf6', [0, 0.019, 0.016]);
  B.add('mouthO', sphere(1, 14, 10), '#ff7f8a', [0, -0.018, 0.014], [0, 0, 0], [0.036, 0.018, 0.012]);
  B.add('mouthS', torus(0.026, 0.009, 8, 20), lip, [0, 0, 0.006], [0, 0, 0], [1, 1.25, 1]);
  B.add('mouthS', sphere(1, 12, 8), '#4a1416', [0, 0, 0.002], [0, 0, 0], [0.024, 0.03, 0.008]);
  B.add('mouthF', torus(0.045, 0.011, 8, 16, Math.PI), lip, [0, -0.012, 0.006]);

  B.mat = 'hair';
  beard(B, l, skin, hair, seed);
  hairdo(B, l, hair, seed);

  // glasses (over the hair and the fringe, in front of the big eyes)
  if (l.glasses !== 'none') {
    B.mat = 'glossy';
    const frame = l.glasses === 'cat' ? '#3a1f3a' : '#16191c';
    for (const s of [-1, 1]) {
      const z = surf(0.11, 0) + 0.04;
      if (l.glasses === 'round') B.add(H, torus(0.082, 0.014, 10, 32), frame, [s * 0.108, 0.0, z]);
      else B.add(H, ringGeo(0.17, 0.13, 0.014, l.glasses === 'cat' ? 3.2 : 4.5), frame, [s * 0.108, 0.0, z], [0, 0, l.glasses === 'cat' ? s * 0.14 : 0]);
      B.add(H, cyl(0.009, 0.009, 0.16, 8), frame, [s * 0.215, 0.02, z - 0.08], [Math.PI / 2, 0, 0]);
    }
    B.add(H, cyl(0.009, 0.009, 0.05, 8), frame, [0, 0.012, surf(0, 0) + 0.04], [0, 0, Math.PI / 2]);
  }
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
    B.put(o, lock(lash, (t) => 0.0055 + 0.003 * t, { segs: 16, radial: 6 }), '#17110d');
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
  const mouth = node('mouth', [0, my, mz], head);
  node('mouthN', [0, 0, 0], mouth);
  for (const m of ['mouthO', 'mouthS', 'mouthF']) node(m, [0, 0, 0], mouth, OFF);
  return { root, clips: toonClips(legLen), height: legLen + headY + R * 1.03 };
}

/* ---------------------------------------------------------------- beards */
function beard(B: Builder, l: TeacherLook, skin: SkinTone, hair: string, seed: number) {
  if (l.beard === 'none') return;
  const kind = l.beard;
  // top edge of the beard: low in front, up the cheeks, to the sideburns at the ears
  const top = (az: number) => { const a = Math.abs(az); return a < 0.6 ? lerp(-0.36, -0.3, a / 0.6) : a < 1.35 ? lerp(-0.3, 0.12, ss(0, 1, (a - 0.6) / 0.75)) : 0.12; };
  const mouth = (el: number, az: number) => { const q = ((el + 0.5) / 0.11) ** 2 + (az / 0.34) ** 2; return 1 - ss(0.7, 1.05, q); };
  const curly = curls(70, seed + 7, 1.1);
  const cover = (el: number, az: number) => ss(1.72, 1.6, Math.abs(az)) * ss(top(az) + 0.06, top(az) - 0.06, el) * (kind === 'stubble' ? 1 - mouth(el, az) * 0.85 : 1 - mouth(el, az));
  const thick = (el: number, _az: number, d: THREE.Vector3) =>
    kind === 'stubble' ? 0.012
      : kind === 'short' ? 0.03 + 0.04 * ramp(el, -0.6, -1.2)
        : 0.045 + 0.13 * ramp(el, -0.55, -1.25) + 0.022 * curly(d);
  const paint = kind === 'stubble' ? mix(skin.c, hair, 0.42) : hairPaint(hair, kind === 'full' ? curly : undefined);
  B.put('head', shell(cover, thick, kind === 'full' ? 72 : 64, kind === 'full' ? 50 : 44, 0.9), paint);
  if (kind !== 'stubble') {
    // moustache: thick in the middle, thin at the tips
    const m = lock([onHead(-0.42, -0.36, 1.03), onHead(-0.35, -0.16, 1.07), onHead(-0.34, 0, 1.08), onHead(-0.35, 0.16, 1.07), onHead(-0.42, 0.36, 1.03)], (t) => 0.012 + 0.022 * Math.sin(Math.PI * t) ** 0.7, { segs: 14, radial: 8, depth: 0.7 });
    B.put('head', m, darken(hair, 0.85));
  }
}

/* ----------------------------------------------------------------- hair */
function hairdo(B: Builder, l: TeacherLook, hair: string, seed: number) {
  const paint = hairPaint(hair);
  const deepPaint = '#' + tone(hair, 0.55).getHexString();
  const put = (g: THREE.BufferGeometry) => B.put('head', g, paint);
  const crown = (el: number) => 1 - ss(1.25, 1.45, el); // parts and grooves fade out at the top of the head
  const partAt = (el: number, az: number, at: number, w = 0.06) => 1 - 0.5 * Math.exp(-(((az - at) / w) ** 2)) * ss(0.45, 0.85, el) * crown(el);
  const longLocks = (o: { len: number; r0: number; r1: number; wave: number; waves: number; depth: number; curlIn?: number; ringlets?: boolean; flare?: number }) => {
    const r = rng(seed + 3);
    const frontAz = o.ringlets ? [0.92, 1.07, 1.22] : [0.98, 1.16];
    const backAz = o.ringlets ? [2.0, 2.28, 2.56, 2.84] : [2.05, 2.42, 2.79];
    const all = [...frontAz, ...backAz].flatMap((a) => [a, -a]).concat([Math.PI]);
    for (const az of all) {
      const isFront = Math.abs(az) < 1.5;
      const startEl = isFront ? 0.14 : 0.3;
      const out = new THREE.Vector3(Math.sin(az), 0, Math.cos(az));
      const tan = new THREE.Vector3(Math.cos(az), 0, -Math.sin(az));
      const start = onHead(startEl, az, 1.06);
      const len = o.len * (isFront ? 0.92 : 1) * (0.94 + r() * 0.1);
      const phase = r() * Math.PI * 2;
      const at = (f: number, wave: number) => {
        const fl = (o.flare ?? 0.02) * f;
        const p = new THREE.Vector3(Math.sin(az) * (R * 1.08 + fl), start.y - len * f, Math.cos(az) * (R * 1.08 * 0.92 + fl));
        if (f < 0.25) p.lerp(start, 1 - f / 0.25); // leave the head smoothly
        return p.addScaledVector(tan, wave);
      };
      if (o.ringlets) {
        // a spring-like curl: a helix around the hanging axis
        const pts = [onHead(startEl + 0.28, az, 0.95)];
        const turns = 4.5 + r(), rc = 0.03;
        for (let k = 0; k <= 48; k++) {
          const f = k / 48, w = ss(0.05, 0.22, f) * rc, a = f * turns * Math.PI * 2 + phase;
          pts.push(at(f, Math.cos(a) * w).addScaledVector(out, Math.sin(a) * w));
        }
        put(lock(pts, (t) => 0.034 * (1 - 0.25 * t), { segs: 56, radial: 7 }));
        if (!isFront) {
          // a flat, darker layer of hair behind the back ringlets
          const back = [onHead(startEl + 0.2, az, 0.95)];
          for (let k = 0; k <= 5; k++) back.push(at(k / 5 * 0.92, 0).multiplyScalar(0.97));
          B.put('head', lock(back, (t) => 0.075 * (1 - 0.3 * t), { segs: 14, radial: 8, depth: 0.45 }), deepPaint);
        }
      } else {
        const pts = [onHead(startEl + 0.3, az, 0.95)];
        const K = 7;
        for (let k = 0; k <= K; k++) { const f = k / K; pts.push(at(f, o.wave * Math.sin(f * o.waves * Math.PI + phase) * ss(0.1, 0.4, f))); }
        if (o.curlIn) { const end = pts[pts.length - 1]; pts.push(end.clone().addScaledVector(out, -o.curlIn).add(new THREE.Vector3(0, 0.03, 0))); }
        put(lock(pts, (t) => lerp(o.r0, o.r1, t) * (t > 0.88 ? 1 - ((t - 0.88) / 0.12) * 0.55 : 1), { segs: 20, radial: 8, depth: o.depth }));
      }
    }
  };
  const curlShell = (n: number, size: number, amp: number, base: (el: number) => number, line: [number, number, number], w = 84, hh = 58) => {
    const c = curls(n, seed, size);
    B.put('head', shell((el, az) => hairline(el, az, ...line), (el, _az, d) => base(el) + amp * c(d), w, hh), hairPaint(hair, c));
  };

  switch (l.hair) {
    case 'shortNeat':
    case 'silverNeat': {
      // neat: side part, a little lift at the front, combed lines for the silver one
      const combed = l.hair === 'silverNeat';
      put(shell((el, az) => hairline(el, az, combed ? 0.66 : 0.6, 0.14, -1.0), (el, az, d) =>
        (0.04 + 0.04 * ss(0.2, 1.1, el) + 0.035 * Math.exp(-((az / 0.55) ** 2)) * ss(0.45, 0.8, el) * crown(el) + (combed ? 0.005 * Math.sin(d.x * 60) * ss(0.3, 0.8, el) : 0)) * partAt(el, az, 0.42)));
      break;
    }
    case 'slick':
      // slicked back: flat at the front, combed grooves, a little volume at the back
      put(shell((el, az) => hairline(el, az, 0.6, 0.12, -1.05), (el, _az, d) => 0.045 + 0.025 * ss(0.4, 1.2, el) + 0.02 * ss(-0.2, -0.8, d.z) * ss(-0.3, 0.4, el) + 0.006 * Math.sin(d.x * 55) * ss(0.3, 0.8, el)));
      break;
    case 'sporty': {
      // short faded sides and spiky tips on top
      put(shell((el, az) => hairline(el, az, 0.6, 0.2, -0.95), (el) => 0.025 + 0.04 * ss(0.5, 1.0, el)));
      const r = rng(seed + 11);
      for (let i = 0; i < 7; i++) {
        const az = -0.6 + (i / 6) * 1.2 + (r() - 0.5) * 0.08, el = 0.92 + Math.abs(i - 3) * 0.04 + r() * 0.04;
        const base = onHead(el, az, 1.02), dir = onHead(el + 0.2, az, 1.0).sub(onHead(el - 0.6, az, 0.0)).normalize();
        const cone = new THREE.ConeGeometry(0.045, 0.12, 7).translate(0, 0.05, 0);
        cone.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir)).translate(base.x, base.y, base.z);
        put(cone);
      }
      break;
    }
    case 'receding':
      // bald crown and temples, hair around the sides and the back
      put(shell((el, az) => hairline(el, az, 1.18, 0.18, -0.95) * (1 - ss(1.25, 1.42, el) * ss(1.6, 0.6, Math.abs(az))), (el) => 0.032 + 0.01 * ss(0.4, 0.9, el)));
      break;
    case 'bob':
      // chin-length bob with straight bangs; fuller at the bottom
      put(shell((el, az) => hairline(el, az, 0.38, -0.45, -0.85, 0.06), (el, az) => (0.05 + 0.1 * ramp(el, 0.25, -0.45) + 0.015 * ss(0.6, 0.9, el)) * partAt(el, az, 0.0, 0.05)));
      break;
    case 'emoFringe': {
      put(shell((el, az) => hairline(el, az, 0.6, -0.32, -0.9), (el) => 0.06 + 0.05 * ramp(el, 0.2, -0.4)));
      // a side-swept fringe over the forehead
      for (let i = 0; i < 5; i++) {
        const f = i / 4;
        const pts = [onHead(1.05, 0.55 - f * 0.15, 0.96), onHead(0.85 - f * 0.05, 0.42 - f * 0.25, 1.08), onHead(0.52, 0.12 - f * 0.45, 1.09), onHead(0.3 - f * 0.08, -0.25 - f * 0.45, 1.07), onHead(0.16 - f * 0.08, -0.55 - f * 0.4, 1.04)];
        put(lock(pts, (t) => 0.05 * (1 - 0.7 * t), { segs: 16, radial: 7, depth: 0.55 }));
      }
      break;
    }
    case 'straightLong':
      put(shell((el, az) => hairline(el, az, 0.6, 0.02, -1.1), (el, az) => (0.055 + 0.02 * ss(0.3, 1.1, el)) * partAt(el, az, 0, 0.05)));
      longLocks({ len: 0.68, r0: 0.08, r1: 0.068, wave: 0.006, waves: 2, depth: 0.62 });
      break;
    case 'wavyLong':
      put(shell((el, az) => hairline(el, az, 0.6, 0.02, -1.1), (el, az, d) => (0.06 + 0.025 * ss(0.3, 1.1, el) + 0.008 * Math.sin(d.y * 26 + d.x * 8)) * partAt(el, az, 0.12, 0.05)));
      longLocks({ len: 0.66, r0: 0.078, r1: 0.055, wave: 0.038, waves: 3, depth: 0.78, flare: 0.04 });
      break;
    case 'styledLong': {
      // glossy, voluminous, deep side part, ends turned in, a swoop across the forehead
      put(shell((el, az) => hairline(el, az, 0.62, 0.02, -1.1), (el, az) => (0.07 + 0.035 * ss(0.3, 1.1, el)) * partAt(el, az, 0.5, 0.05)));
      longLocks({ len: 0.62, r0: 0.088, r1: 0.07, wave: 0.012, waves: 1.5, depth: 0.7, curlIn: 0.07, flare: 0.03 });
      put(lock([onHead(1.0, 0.5, 0.97), onHead(0.95, 0.38, 1.1), onHead(0.62, -0.05, 1.12), onHead(0.4, -0.55, 1.1), onHead(0.1, -0.95, 1.08)], (t) => 0.07 * (1 - 0.5 * t), { segs: 18, radial: 8, depth: 0.55 }));
      break;
    }
    case 'afro':
      // big rounded volume made of curls
      curlShell(40, 1.05, 0.13, (el) => 0.18 + 0.3 * ss(-0.3, 1.0, el), [0.52, 0.14, -0.75], 96, 64);
      break;
    case 'midCurly':
      curlShell(64, 1.0, 0.1, (el) => 0.04 + 0.03 * ss(0.2, 1.0, el), [0.6, 0.12, -0.95], 96, 64);
      break;
    case 'shortCurly':
      curlShell(64, 1.0, 0.1, (el) => 0.055 + 0.02 * ss(0.2, 1.0, el), [0.5, -0.22, -0.9], 96, 64);
      break;
    case 'longCurly':
      curlShell(64, 1.0, 0.1, (el) => 0.055 + 0.03 * ss(0.2, 1.0, el), [0.58, 0.0, -1.1], 84, 56);
      longLocks({ len: l.height > 1.15 ? 0.74 : 0.66, r0: 0.034, r1: 0.026, wave: 0, waves: 0, depth: 1, ringlets: true, flare: 0.03 });
      break;
    case 'ponytail': {
      put(shell((el, az) => hairline(el, az, 0.62, 0.1, -1.0), (el) => 0.035 + 0.01 * ss(0.4, 1.1, el)));
      const tail = [onHead(0.5, Math.PI, 0.9), onHead(0.42, Math.PI, 1.12), new THREE.Vector3(0, 0.02, -0.4), new THREE.Vector3(0.01, -0.16, -0.44), new THREE.Vector3(-0.01, -0.32, -0.41), new THREE.Vector3(0.02, -0.46, -0.36)];
      put(lock(tail, (t) => (0.055 + 0.03 * Math.sin(Math.PI * Math.min(1, t * 1.6))) * (1 - 0.75 * t), { segs: 24, radial: 9 }));
      const tie = onHead(0.42, Math.PI, 1.1);
      B.add('head', torus(0.045, 0.016, 6, 14), '#e23d4f', [tie.x, tie.y, tie.z], [0.3, 0, 0]);
      break;
    }
    case 'bun': {
      put(shell((el, az) => hairline(el, az, 0.62, 0.1, -1.0), (el) => 0.035 + 0.01 * ss(0.4, 1.1, el)));
      const c = onHead(0.82, Math.PI, 1.3);
      B.add('head', sphere(0.115, 16, 12), paint, [c.x, c.y, c.z]);
      for (let i = 0; i < 3; i++) B.add('head', torus(0.085 - i * 0.025, 0.028, 6, 18), paint, [c.x, c.y + 0.03 + i * 0.03, c.z], [Math.PI / 2 - 0.9, 0, i * 0.7]);
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
