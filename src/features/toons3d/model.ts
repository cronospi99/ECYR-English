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
   Hair colour shades from darker at the ends to lighter on top, with a soft shine band. */
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import type { TeacherLook } from '../cards/teachers';

import type { ToonClip } from './meta.ts';

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
interface Piece { geo: THREE.BufferGeometry; paint: Paint }

/** Collects coloured pieces per rig node, then merges each node into one mesh. */
class Builder {
  pieces = new Map<string, Piece[]>();
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
    list.push({ geo: g, paint });
    this.pieces.set(node, list);
  }
  mesh(node: string, material: THREE.Material): THREE.Mesh | null {
    const list = this.pieces.get(node);
    if (!list?.length) return null;
    const geos = list.map(({ geo, paint }) => {
      // colours as normalised bytes (linear), a quarter of the size of floats
      const p = geo.getAttribute('position'), n = p.count, arr = new Uint8Array(n * 4);
      const fixed = typeof paint === 'string' ? col(paint) : null;
      for (let i = 0; i < n; i++) {
        const c = fixed ?? (paint as Exclude<Paint, string>)(p.getX(i), p.getY(i), p.getZ(i));
        arr[i * 4] = Math.round(clamp01(c.r) * 255); arr[i * 4 + 1] = Math.round(clamp01(c.g) * 255); arr[i * 4 + 2] = Math.round(clamp01(c.b) * 255); arr[i * 4 + 3] = 255;
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

// primitives (low poly; smooth enough with toon shading)
const sphere = (r = 1, w = 14, h = 10) => new THREE.SphereGeometry(r, Math.min(w, 16), Math.min(h, 12));
const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 3, 10);
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const cyl = (rt: number, rb: number, h: number, seg = 14) => new THREE.CylinderGeometry(rt, rb, h, seg);
const torus = (r: number, t: number, rs = 8, ts = 20, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc);

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
  for (const [node, s] of [['legL', -1], ['legR', 1]] as const) {
    B.add(node, capsule(0.062, Math.max(0.02, legLen - 0.13)), pants, [0, -legLen / 2 + 0.035, 0]);
    if (l.outfit === 'tracksuit') B.add(node, box(0.012, legLen - 0.1, 0.02), '#f2efe6', [s * 0.058, -legLen / 2 + 0.03, 0.01]);
    B.add(node, sphere(0.08, 14, 10), '#1b2023', [0, -legLen + 0.045, 0.035], [0, 0, 0], [1, 0.62, 1.45]);
    B.add(node, sphere(0.03, 8, 6), '#4a5257', [0, -legLen + 0.075, 0.075], [0, 0, 0], [1, 0.5, 1]);
  }
  B.add('hips', sphere(1, 16, 10), pants, [0, 0.02, 0], [0, 0, 0], [sw * 0.98, 0.1, 0.14]);

  /* torso: a pill scaled to the shoulders, plus outfit details */
  const tz = 0.155;
  // capsule(1, 0.6) is 2 wide and 2.6 tall: scale it to the shoulders × torso (a little overlap)
  B.add('chest', capsule(1, 0.6), l.outfit === 'vest' ? '#f2efe6' : l.top, [0, torsoLen / 2, 0], [0, 0, 0], [sw * 1.04, (torsoLen * 1.12) / 2.6, tz]);
  const front = (y: number) => tz * Math.sqrt(Math.max(0, 1 - ((y - torsoLen / 2) / (torsoLen * 0.62)) ** 2)) + 0.004;
  const band = (y: number, hgt: number, color: string, k = 1.035) => B.add('chest', cyl(1, 1, hgt, 18), color, [0, y, 0], [0, 0, 0], [sw * 1.04 * k, 1, tz * k]);
  switch (l.outfit) {
    case 'blazer': case 'suit':
      B.add('chest', box(0.09, torsoLen * 0.75, 0.02), '#f2efe6', [0, torsoLen * 0.58, front(torsoLen * 0.6)]);
      B.add('chest', box(0.07, torsoLen * 0.6, 0.025), topD, [-0.06, torsoLen * 0.6, front(torsoLen * 0.6) + 0.004], [0, 0, -0.28]);
      B.add('chest', box(0.07, torsoLen * 0.6, 0.025), topD, [0.06, torsoLen * 0.6, front(torsoLen * 0.6) + 0.004], [0, 0, 0.28]);
      if (l.outfit === 'suit') B.add('chest', box(0.035, torsoLen * 0.5, 0.02), '#c23a48', [0, torsoLen * 0.6, front(torsoLen * 0.6) + 0.01]);
      break;
    case 'shirt': case 'polo': case 'blouse': case 'uniform':
      B.add('chest', torus(0.075, 0.022, 6, 16), l.outfit === 'uniform' ? '#f2efe6' : topL, [0, torsoLen - 0.005, 0.01], [Math.PI / 2 - 0.25, 0, 0], [1.1, 1, 1]);
      for (const f of [0.55, 0.72]) B.add('chest', sphere(0.013, 6, 5), topD, [0, torsoLen * f, front(torsoLen * f)]);
      if (l.outfit === 'uniform') for (const s of [-1, 1]) B.add('chest', box(0.06, torsoLen * 0.85, 0.02), '#f2efe6', [s * sw * 0.62, torsoLen * 0.5, front(torsoLen * 0.5) - 0.02], [0, s * 0.5, 0]);
      break;
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
      B.add('chest', capsule(1, 0.6), l.top, [0, torsoLen / 2 - 0.02, 0.012], [0, 0, 0], [sw * 1.02, torsoLen / 2.6, tz * 0.95]);
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
  B.add('chest', cyl(0.06, 0.07, 0.08), skin.c, [0, torsoLen + 0.01, 0]); // neck

  /* arms (pivot at the shoulder), resting slightly out */
  const armLen = torsoLen * 0.82;
  for (const [node, s] of [['armL', -1], ['armR', 1]] as const) {
    const out = s * 0.16;
    const at = (d: number): V3 => [Math.sin(out) * d, -Math.cos(out) * d, 0];
    B.add(node, capsule(0.056, Math.max(0.02, armLen - 0.11)), sleeve, at(armLen / 2 - 0.015), [0, 0, out]);
    if (armSkin) B.add(node, capsule(0.05, armLen * 0.3), skin.c, at(armLen * 0.68), [0, 0, out]);
    if (l.outfit === 'tracksuit') B.add(node, box(0.012, armLen - 0.1, 0.02), '#f2efe6', [at(armLen / 2)[0] + s * 0.05, at(armLen / 2)[1], 0], [0, 0, out]);
    if (has('tattoos') && node === 'armR') for (let i = 0; i < 3; i++) B.add(node, torus(0.057, 0.004, 4, 16), '#2b3a55', at(armLen * (0.5 + i * 0.08)), [Math.PI / 2, 0, out]);
    B.add(node, sphere(0.062, 12, 9), skin.c, at(armLen - 0.01));
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

  /* head */
  const H = 'head';
  B.add(H, new THREE.SphereGeometry(R, 26, 18), skin.c, [0, 0, 0], [0, 0, 0], HS);
  for (const s of [-1, 1]) B.add(H, sphere(0.062, 10, 8), skin.c, [s * R * 1.0, -0.01, -0.02]);
  if (has('earrings')) for (const s of [-1, 1]) B.add(H, sphere(0.026, 8, 6), '#f5c518', [s * R * 1.02, -0.09, -0.01]);
  const surf = (x: number, y: number) => 0.92 * Math.sqrt(Math.max(0, R * R - x * x - y * y)); // head front z at (x, y)
  B.add(H, sphere(0.032, 10, 8), skin.d, [0, -0.06, surf(0, -0.06) + 0.012]); // nose
  for (const s of [-1, 1]) B.add(H, sphere(0.045, 10, 8), mix(skin.c, '#ff8f8f', l.smile === 'shy' ? 0.7 : 0.45), [s * 0.17, -0.1, surf(0.17, -0.1) - 0.012], [0, 0, 0], [1, 0.75, 0.4]); // cheeks
  // brows: little tapered arcs
  const browR = l.beard !== 'none' || l.build === 'broad' ? 0.024 : 0.019;
  for (const s of [-1, 1]) {
    const inner = l.smile === 'serious' || l.smile === 'mysterious' ? 0.25 : 0.3;
    B.put(H, lock([onHead(inner, s * 0.15, 1.035), onHead(0.365, s * 0.33, 1.04), onHead(0.31, s * 0.52, 1.03)], (t) => browR * (1 - 0.45 * t), { segs: 8, radial: 6, depth: 0.6 }), hairD);
  }
  // mouth
  const lip = l.lips ?? '#7a2e2e';
  const my = -0.15, mz = surf(0, my) + 0.003;
  if (l.smile === 'big') { B.add(H, cyl(0.075, 0.075, 0.012, 14), '#5a1d1d', [0, my + 0.015, mz - 0.004], [Math.PI / 2, 0, 0], [1, 1, 0.75]); B.add(H, box(0.15, 0.03, 0.02), skin.c, [0, my + 0.045, mz - 0.002]); B.add(H, sphere(0.03, 8, 6), '#ff8f8f', [0, my - 0.02, mz - 0.002], [0, 0, 0], [1.3, 0.6, 0.4]); }
  else if (l.smile === 'serious' || l.smile === 'mysterious') B.add(H, box(0.09, 0.016, 0.016), lip, [0, my, mz]);
  else if (l.smile === 'smirk') B.add(H, torus(0.055, 0.011, 6, 12, Math.PI * 0.8), lip, [0.015, my + 0.035, mz], [0, 0, Math.PI + 0.35]);
  else B.add(H, torus(0.06, 0.012, 6, 12, Math.PI), lip, [0, my + 0.04, mz], [0, 0, Math.PI]);

  beard(B, l, skin, hair, seed);
  hairdo(B, l, hair, seed);

  // glasses (over the hair and the fringe)
  if (l.glasses !== 'none') {
    for (const s of [-1, 1]) {
      const z = surf(0.11, 0) + 0.02;
      if (l.glasses === 'round') B.add(H, torus(0.078, 0.012, 6, 20), INK, [s * 0.11, 0.0, z]);
      else B.add(H, torus(0.085, 0.012, 4, 4), l.glasses === 'cat' ? '#3a1f3a' : INK, [s * 0.11, 0.0, z], [0, 0, Math.PI / 4 + (l.glasses === 'cat' ? s * 0.12 : 0)], [1.25, 0.85, 1]);
      B.add(H, cyl(0.008, 0.008, 0.14, 5), INK, [s * 0.22, 0.02, z - 0.07], [Math.PI / 2, 0, 0]);
    }
    B.add(H, cyl(0.008, 0.008, 0.05, 5), INK, [0, 0.01, surf(0, 0) + 0.02], [0, 0, Math.PI / 2]);
  }
  // hats
  if (has('beretFR')) { B.add(H, sphere(1, 18, 10), '#22305a', [-0.03, 0.29, -0.02], [0, 0, 0.18], [0.31, 0.09, 0.29]); B.add(H, cyl(0.01, 0.01, 0.06, 5), INK, [-0.01, 0.39, -0.02]); }
  if (has('guardCap')) { B.add(H, new THREE.SphereGeometry(R * 1.12, 20, 9, 0, Math.PI * 2, 0, Math.PI * 0.45), '#22305a', [0, 0.03, 0], [-0.2, 0, 0]); B.add(H, box(0.34, 0.025, 0.16), '#1b2023', [0, 0.13, 0.27], [0.25, 0, 0]); B.add(H, box(0.05, 0.05, 0.01), '#f5c518', [0, 0.24, 0.27], [-0.3, 0, 0]); }

  /* eyes: own nodes, so the idle clip can blink */
  const eyes: THREE.Object3D[] = [];
  for (const [node, s] of [['eyeL', -1], ['eyeR', 1]] as const) {
    const e = new THREE.Group(); e.name = node; e.position.set(s * 0.11, 0, surf(0.11, 0) - 0.012);
    if (l.smile === 'mysterious') B.add(node, sphere(1, 12, 8), INK, [0, 0, 0], [0, 0, 0], [0.04, 0.026, 0.02]);
    else {
      B.add(node, sphere(1, 12, 8), INK, [0, 0, 0], [0, 0, 0], [0.04, 0.054, 0.025]);
      B.add(node, sphere(1, 10, 8), '#4a2d1c', [0, -0.008, 0.014], [0, 0, 0], [0.026, 0.034, 0.014]);
      B.add(node, sphere(0.016, 8, 6), '#ffffff', [0.013, 0.02, 0.026]);
    }
    eyes.push(e);
  }

  /* assemble the rig */
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, name: 'toon' });
  const root = new THREE.Group(); root.name = 'toon';
  const node = (name: string, pos: V3, parent: THREE.Object3D) => { const g = new THREE.Group(); g.name = name; g.position.set(...pos); parent.add(g); const m = B.mesh(name, mat); if (m) g.add(m); return g; };
  const hips = node('hips', [0, legLen, 0], root);
  node('legL', [-lx, 0, 0], hips);
  node('legR', [lx, 0, 0], hips);
  const chest = node('chest', [0, 0, 0], hips);
  node('armL', [-(sw + 0.03), torsoLen - 0.08, 0], chest);
  node('armR', [sw + 0.03, torsoLen - 0.08, 0], chest);
  const head = node('head', [0, headY, 0], chest);
  for (const e of eyes) { const m = B.mesh(e.name, mat); if (m) e.add(m); head.add(e); }
  return { root, clips: toonClips(legLen), height: legLen + headY + R * 1.03 };
}

/* ---------------------------------------------------------------- beards */
function beard(B: Builder, l: TeacherLook, skin: SkinTone, hair: string, seed: number) {
  if (l.beard === 'none') return;
  const kind = l.beard;
  // top edge of the beard: low in front, up the cheeks, to the sideburns at the ears
  const top = (az: number) => { const a = Math.abs(az); return a < 0.55 ? lerp(-0.3, -0.12, a / 0.55) : a < 1.4 ? lerp(-0.12, 0.2, (a - 0.55) / 0.85) : 0.2; };
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
        put(lock(pts, (t) => 0.034 * (1 - 0.25 * t), { segs: 72, radial: 7 }));
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
      curlShell(64, 1.0, 0.1, (el) => 0.055 + 0.03 * ss(0.2, 1.0, el), [0.58, 0.0, -1.1], 96, 64);
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
export function toonClips(legLen: number) {
  const r = (x: number, y: number, z: number): V3 => [x, y, z];
  const blink = { t: [0, 1.9, 1.96, 2.04, 2.4], scl: [[1, 1, 1], [1, 1, 1], [1, 0.1, 1], [1, 1, 1], [1, 1, 1]] as V3[] };
  const hipsAt = (dy: number): V3 => [0, legLen + dy, 0];
  return [
    clip('idle', 2.4, {
      chest: { t: [0, 1.2, 2.4], pos: [[0, 0, 0], [0, 0.008, 0], [0, 0, 0]], rot: [r(0, 0, 0), r(0, 0, 0), r(0, 0, 0)] },
      armL: { t: [0, 1.2, 2.4], rot: [r(0, 0, -0.04), r(0.04, 0, -0.1), r(0, 0, -0.04)] },
      armR: { t: [0, 1.2, 2.4], rot: [r(0, 0, 0.04), r(-0.04, 0, 0.1), r(0, 0, 0.04)] },
      head: { t: [0, 1.2, 2.4], rot: [r(0, 0, 0.03), r(0.03, 0, -0.03), r(0, 0, 0.03)] },
      legL: { t: [0, 2.4], rot: [r(0, 0, 0), r(0, 0, 0)] }, legR: { t: [0, 2.4], rot: [r(0, 0, 0), r(0, 0, 0)] },
      eyeL: blink, eyeR: blink,
    }),
    clip('walk', 0.62, {
      legL: { t: [0, 0.31, 0.62], rot: [r(0.62, 0, 0), r(-0.62, 0, 0), r(0.62, 0, 0)] },
      legR: { t: [0, 0.31, 0.62], rot: [r(-0.62, 0, 0), r(0.62, 0, 0), r(-0.62, 0, 0)] },
      armL: { t: [0, 0.31, 0.62], rot: [r(-0.55, 0, -0.08), r(0.55, 0, -0.08), r(-0.55, 0, -0.08)] },
      armR: { t: [0, 0.31, 0.62], rot: [r(0.55, 0, 0.08), r(-0.55, 0, 0.08), r(0.55, 0, 0.08)] },
      chest: { t: [0, 0.155, 0.31, 0.465, 0.62], pos: [[0, 0, 0], [0, 0.028, 0], [0, 0, 0], [0, 0.028, 0], [0, 0, 0]], rot: [r(0.08, 0, 0.03), r(0.08, 0, 0), r(0.08, 0, -0.03), r(0.08, 0, 0), r(0.08, 0, 0.03)] },
      head: { t: [0, 0.62], rot: [r(-0.05, 0, 0), r(-0.05, 0, 0)] },
    }),
    // run: big strides, arms pumping, leaning forward (for a runner game)
    clip('run', 0.44, {
      legL: { t: [0, 0.22, 0.44], rot: [r(1.0, 0, 0), r(-0.95, 0, 0), r(1.0, 0, 0)] },
      legR: { t: [0, 0.22, 0.44], rot: [r(-0.95, 0, 0), r(1.0, 0, 0), r(-0.95, 0, 0)] },
      armL: { t: [0, 0.22, 0.44], rot: [r(-0.95, 0, -0.18), r(0.85, 0, -0.18), r(-0.95, 0, -0.18)] },
      armR: { t: [0, 0.22, 0.44], rot: [r(0.85, 0, 0.18), r(-0.95, 0, 0.18), r(0.85, 0, 0.18)] },
      chest: { t: [0, 0.11, 0.22, 0.33, 0.44], pos: [[0, 0, 0], [0, 0.045, 0], [0, 0, 0], [0, 0.045, 0], [0, 0, 0]], rot: [r(0.24, 0.06, 0), r(0.24, 0, 0), r(0.24, -0.06, 0), r(0.24, 0, 0), r(0.24, 0.06, 0)] },
      head: { t: [0, 0.44], rot: [r(-0.18, 0, 0), r(-0.18, 0, 0)] },
    }),
    clip('jump', 0.3, {
      legL: { t: [0, 0.3], rot: [r(0.2, 0, 0), r(1.0, 0, -0.05)] },
      legR: { t: [0, 0.3], rot: [r(-0.1, 0, 0), r(-0.45, 0, 0.05)] },
      armL: { t: [0, 0.3], rot: [r(0, 0, -0.4), r(0, 0, -2.55)] },
      armR: { t: [0, 0.3], rot: [r(0, 0, 0.4), r(0, 0, 2.55)] },
      chest: { t: [0, 0.3], rot: [r(-0.05, 0, 0), r(-0.12, 0, 0)] },
      head: { t: [0, 0.3], rot: [r(0, 0, 0), r(-0.15, 0, 0)] },
    }),
    clip('fall', 0.8, {
      legL: { t: [0, 0.4, 0.8], rot: [r(0.25, 0, -0.25), r(0.15, 0, -0.34), r(0.25, 0, -0.25)] },
      legR: { t: [0, 0.4, 0.8], rot: [r(-0.1, 0, 0.25), r(0.05, 0, 0.34), r(-0.1, 0, 0.25)] },
      armL: { t: [0, 0.2, 0.4, 0.6, 0.8], rot: [r(0, 0, -1.35), r(0, 0, -1.6), r(0, 0, -1.35), r(0, 0, -1.6), r(0, 0, -1.35)] },
      armR: { t: [0, 0.2, 0.4, 0.6, 0.8], rot: [r(0, 0, 1.35), r(0, 0, 1.6), r(0, 0, 1.35), r(0, 0, 1.6), r(0, 0, 1.35)] },
      head: { t: [0, 0.8], rot: [r(0.12, 0, 0), r(0.12, 0, 0)] },
      chest: { t: [0, 0.8], rot: [r(0.05, 0, 0), r(0.05, 0, 0)] },
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
    }),
    clip('hit', 0.45, {
      chest: { t: [0, 0.12, 0.45], rot: [r(0, 0, 0), r(-0.4, 0, 0.1), r(0, 0, 0)] },
      head: { t: [0, 0.12, 0.45], rot: [r(0, 0, 0), r(-0.35, 0, -0.15), r(0, 0, 0)] },
      armL: { t: [0, 0.12, 0.3, 0.45], rot: [r(0, 0, -0.1), r(-0.3, 0, -2.1), r(0, 0, -1.6), r(0, 0, -0.3)] },
      armR: { t: [0, 0.12, 0.3, 0.45], rot: [r(0, 0, 0.1), r(-0.3, 0, 2.1), r(0, 0, 1.6), r(0, 0, 0.3)] },
      legL: { t: [0, 0.12, 0.45], rot: [r(0, 0, 0), r(-0.5, 0, -0.15), r(0, 0, 0)] },
      legR: { t: [0, 0.12, 0.45], rot: [r(0, 0, 0), r(0.45, 0, 0.15), r(0, 0, 0)] },
    }),
    // cheer: arms up waving, little hops (a win screen)
    clip('cheer', 1.0, {
      hips: { t: [0, 0.25, 0.5, 0.75, 1.0], pos: [hipsAt(0), hipsAt(0.07), hipsAt(0), hipsAt(0.07), hipsAt(0)] },
      armL: { t: [0, 0.25, 0.5, 0.75, 1.0], rot: [r(0, 0, -2.5), r(0, 0, -2.85), r(0, 0, -2.5), r(0, 0, -2.85), r(0, 0, -2.5)] },
      armR: { t: [0, 0.25, 0.5, 0.75, 1.0], rot: [r(0, 0, 2.85), r(0, 0, 2.5), r(0, 0, 2.85), r(0, 0, 2.5), r(0, 0, 2.85)] },
      head: { t: [0, 0.5, 1.0], rot: [r(-0.1, 0, 0.1), r(-0.1, 0, -0.1), r(-0.1, 0, 0.1)] },
      legL: { t: [0, 0.25, 0.5, 0.75, 1.0], rot: [r(0, 0, 0), r(0.3, 0, -0.1), r(0, 0, 0), r(0.3, 0, -0.1), r(0, 0, 0)] },
      legR: { t: [0, 0.25, 0.5, 0.75, 1.0], rot: [r(0, 0, 0), r(0.3, 0, 0.1), r(0, 0, 0), r(0.3, 0, 0.1), r(0, 0, 0)] },
    }),
  ];
}
