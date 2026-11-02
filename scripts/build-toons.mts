/* Class Wars — builds one animated 3D model (.glb) per teacher from their card look (skin, hair,
   outfit, glasses, beard, props, height and build), so the game can show the same characters in 3D.

   Each model is a small rig of rigid parts: hips → legL/legR, chest → armL/armR/head → eyeL/eyeR.
   Every part is ONE mesh with vertex colours (few draw calls), feet at (0, 0, 0), facing +Z,
   1 unit = 100 toon units (≈ 56 world px in the game). Clips: idle, walk, jump, fall, hit.

   Run:  node --experimental-strip-types scripts/build-toons.mts
   Out:  public/classwars/toons/<id>.glb  (+ index.json with the ids and sizes) */
import { mkdirSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { SKIN, TEACHERS, type TeacherLook } from '../src/features/cards/teachers.ts';

// GLTFExporter (binary) reads Blobs with FileReader, which Node does not have.
class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(b: Blob) { void b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.(); }); }
  readAsDataURL(b: Blob) { void b.arrayBuffer().then((r) => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend?.(); }); }
}
(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader;

const OUT = new URL('../public/classwars/toons/', import.meta.url);
mkdirSync(OUT, { recursive: true });

const INK = '#1d2a1f';
const col = (hex: string) => new THREE.Color(hex);
const mix = (a: string, b: string, k: number) => '#' + col(a).lerp(col(b), k).getHexString();
const darken = (hex: string, k: number) => '#' + col(hex).multiplyScalar(k).getHexString();

type V3 = [number, number, number];
interface Piece { geo: THREE.BufferGeometry; color: string }

/** Collects coloured pieces per rig node, then merges each node into one mesh. */
class Builder {
  pieces = new Map<string, Piece[]>();
  add(node: string, geo: THREE.BufferGeometry, color: string, pos: V3 = [0, 0, 0], rot: V3 = [0, 0, 0], scale: V3 = [1, 1, 1]) {
    const m = new THREE.Matrix4().compose(new THREE.Vector3(...pos), new THREE.Quaternion().setFromEuler(new THREE.Euler(...rot)), new THREE.Vector3(...scale));
    const g = (geo.index ? geo : geo).clone();
    g.applyMatrix4(m);
    g.deleteAttribute('uv');
    if (!g.index) g.setIndex([...Array(g.getAttribute('position').count).keys()]);
    const list = this.pieces.get(node) ?? [];
    list.push({ geo: g, color });
    this.pieces.set(node, list);
  }
  mesh(node: string, material: THREE.Material): THREE.Mesh | null {
    const list = this.pieces.get(node);
    if (!list?.length) return null;
    const geos = list.map(({ geo, color }) => {
      // colours as normalised bytes (linear), a quarter of the size of floats
      const c = col(color), n = geo.getAttribute('position').count, arr = new Uint8Array(n * 4);
      for (let i = 0; i < n; i++) { arr[i * 4] = Math.round(c.r * 255); arr[i * 4 + 1] = Math.round(c.g * 255); arr[i * 4 + 2] = Math.round(c.b * 255); arr[i * 4 + 3] = 255; }
      geo.setAttribute('color', new THREE.BufferAttribute(arr, 4, true));
      return geo;
    });
    const merged = mergeGeometries(geos, false)!;
    merged.computeBoundingSphere();
    const m = new THREE.Mesh(merged, material);
    m.name = node + 'Mesh';
    return m;
  }
}

// shared primitive shapes (low poly, smooth enough with toon shading)
const sphere = (r = 1, w = 14, h = 10) => new THREE.SphereGeometry(r, Math.min(w, 16), Math.min(h, 12));
const capsule = (r: number, len: number) => new THREE.CapsuleGeometry(r, len, 3, 10);
const box = (x: number, y: number, z: number) => new THREE.BoxGeometry(x, y, z);
const cyl = (rt: number, rb: number, h: number, seg = 14) => new THREE.CylinderGeometry(rt, rb, h, seg);
const torus = (r: number, t: number, rs = 8, ts = 20, arc = Math.PI * 2) => new THREE.TorusGeometry(r, t, rs, ts, arc);
const cap = (r: number, theta: number, thetaStart = 0, phiStart = 0, phiLen = Math.PI * 2) => new THREE.SphereGeometry(r, 20, 9, phiStart, phiLen, thetaStart, theta);

function build(l: TeacherLook) {
  const B = new Builder();
  const skin = SKIN[l.skin];
  const h = l.height;
  const legLen = 0.30 * h, torsoLen = 0.42 * h;
  const sw = (l.build === 'slim' ? 21 : l.build === 'broad' ? 30 : 24) / 100;
  const pants = l.outfit === 'hoodieBlack' ? '#141414' : l.outfit === 'suit' ? l.top : l.outfit === 'tracksuit' ? l.top : '#2b3a55';
  const armSkin = l.outfit === 'vest' || l.outfit === 'polo';
  const sleeve = l.outfit === 'vest' || l.outfit === 'stripes' ? '#f2efe6' : l.top;
  const has = (p: string) => (l.props as string[]).includes(p);
  const topD = darken(l.top, 0.72), topL = mix(l.top, '#ffffff', 0.35);
  const hair = l.hairColor, hairD = darken(l.hairColor, 0.7);
  const R = 0.29; // head radius
  const headY = torsoLen + 0.27; // head centre, in chest space

  /* legs (in their own node, pivot at the hip) */
  const lx = sw / 2 + 0.015;
  for (const [node, s] of [['legL', -1], ['legR', 1]] as const) {
    B.add(node, capsule(0.062, Math.max(0.02, legLen - 0.13)), pants, [0, -legLen / 2 + 0.035, 0]);
    if (l.outfit === 'tracksuit') B.add(node, box(0.012, legLen - 0.1, 0.02), '#f2efe6', [s * 0.058, -legLen / 2 + 0.03, 0.01]);
    B.add(node, sphere(0.08, 14, 10), '#1b2023', [0, -legLen + 0.045, 0.035], [0, 0, 0], [1, 0.62, 1.45]);
    B.add(node, sphere(0.03, 8, 6), '#4a5257', [0, -legLen + 0.075, 0.075], [0, 0, 0], [1, 0.5, 1]);
  }
  /* pelvis (does not bob) */
  B.add('hips', sphere(1, 16, 10), pants, [0, 0.02, 0], [0, 0, 0], [sw * 0.98, 0.1, 0.14]);

  /* torso: a pill scaled to the shoulders, plus outfit details */
  const tz = 0.155; // torso half depth
  // capsule(1, 0.6) is 2 wide and 2.6 tall: scale it to the shoulders × torso (a little overlap)
  const torsoS: V3 = [sw * 1.04, (torsoLen * 1.12) / 2.6, tz];
  B.add('chest', capsule(1, 0.6), l.outfit === 'vest' ? '#f2efe6' : l.top, [0, torsoLen / 2, 0], [0, 0, 0], torsoS);
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
      if (l.outfit === 'uniform') { B.add('chest', box(0.06, torsoLen * 0.85, 0.02), '#f2efe6', [-sw * 0.62, torsoLen * 0.5, front(torsoLen * 0.5) - 0.02], [0, -0.5, 0]); B.add('chest', box(0.06, torsoLen * 0.85, 0.02), '#f2efe6', [sw * 0.62, torsoLen * 0.5, front(torsoLen * 0.5) - 0.02], [0, 0.5, 0]); }
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
      B.add('chest', capsule(1, 0.6), l.top, [0, torsoLen / 2 - 0.02, 0.012], [0, 0, 0], [sw * 1.02, (torsoLen * 1.0) / 2.6, tz * 0.95]);
      B.add('chest', box(0.07, torsoLen * 0.4, 0.02), '#f2efe6', [0, torsoLen * 0.78, front(torsoLen * 0.78) + 0.01]);
      break;
    case 'hoodieBlack':
      B.add('chest', torus(0.13, 0.05, 8, 18), '#1f1f1f', [0, torsoLen + 0.02, -0.06], [Math.PI / 2 + 0.5, 0, 0], [1.25, 1, 1]);
      B.add('chest', box(sw * 1.1, 0.09, 0.02), '#262626', [0, torsoLen * 0.3, front(torsoLen * 0.3)]);
      for (const s of [-1, 1]) B.add('chest', cyl(0.006, 0.006, 0.12, 5), '#d9d9d9', [s * 0.04, torsoLen * 0.82, front(torsoLen * 0.82) + 0.01]);
      break;
  }
  // props on the body
  if (has('scarf')) { B.add('chest', torus(0.1, 0.04, 8, 18), '#e23d4f', [0, torsoLen, 0.01], [Math.PI / 2 - 0.2, 0, 0], [1.2, 1, 1]); B.add('chest', box(0.06, 0.16, 0.03), '#e23d4f', [0.06, torsoLen - 0.1, front(torsoLen - 0.1) + 0.01], [0, 0, -0.15]); }
  if (has('lanyard') || has('whistle')) {
    B.add('chest', torus(0.1, 0.008, 4, 20, Math.PI), '#f5c518', [0, torsoLen - 0.02, front(torsoLen * 0.8)], [0, 0, Math.PI], [1, 1.6, 1]);
    if (has('lanyard')) B.add('chest', box(0.09, 0.07, 0.012), '#ffffff', [0, torsoLen - 0.19, front(torsoLen - 0.19) + 0.012]);
    else B.add('chest', box(0.05, 0.03, 0.03), '#c9cfc9', [0, torsoLen - 0.18, front(torsoLen - 0.18) + 0.015]);
  }
  if (has('pinFR')) ['#3a5bc7', '#ffffff', '#e23d4f'].forEach((c, i) => B.add('chest', box(0.016, 0.04, 0.01), c, [-sw * 0.55 + i * 0.016, torsoLen * 0.72, front(torsoLen * 0.72) - 0.005]));
  // neck
  B.add('chest', cyl(0.06, 0.07, 0.08), skin.c, [0, torsoLen + 0.01, 0]);

  /* arms (pivot at the shoulder), resting slightly out */
  const armLen = torsoLen * 0.82;
  for (const [node, s] of [['armL', -1], ['armR', 1]] as const) {
    const out = s * 0.16;
    const at = (d: number): V3 => [Math.sin(out) * d, -Math.cos(out) * d, 0];
    B.add(node, capsule(0.056, Math.max(0.02, armLen - 0.11)), sleeve, at(armLen / 2 - 0.015), [0, 0, out]);
    if (armSkin) B.add(node, capsule(0.05, armLen * 0.3), skin.c, at(armLen * 0.68), [0, 0, out]);
    if (l.outfit === 'tracksuit') B.add(node, box(0.012, armLen - 0.1, 0.02), '#f2efe6', [at(armLen / 2)[0] + s * 0.05, at(armLen / 2)[1], 0], [0, 0, out]);
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
  B.add(H, new THREE.SphereGeometry(R, 22, 16), skin.c, [0, 0, 0], [0, 0, 0], [1, 1.03, 0.92]);
  for (const s of [-1, 1]) B.add(H, sphere(0.062, 10, 8), skin.c, [s * R * 1.0, -0.01, -0.02]);
  if (has('earrings')) for (const s of [-1, 1]) B.add(H, sphere(0.026, 8, 6), '#f5c518', [s * R * 1.02, -0.09, -0.01]);
  const surf = (x: number, y: number) => 0.92 * Math.sqrt(Math.max(0, R * R - x * x - y * y)); // head front z at (x, y)
  // nose, cheeks, brows
  B.add(H, sphere(0.032, 10, 8), skin.d, [0, -0.06, surf(0, -0.06) + 0.012]);
  for (const s of [-1, 1]) {
    B.add(H, sphere(0.045, 10, 8), mix(skin.c, '#ff8f8f', l.smile === 'shy' ? 0.7 : 0.45), [s * 0.17, -0.1, surf(0.17, -0.1) - 0.012], [0, 0, 0], [1, 0.75, 0.4]);
    B.add(H, box(0.08, 0.018, 0.02), hairD, [s * 0.11, 0.095, surf(0.11, 0.095) + 0.004], [0, s * -0.3, l.smile === 'serious' ? s * 0.18 : s * -0.08]);
  }
  // mouth
  const lip = l.lips ?? '#7a2e2e';
  const my = -0.15, mz = surf(0, my) + 0.003;
  if (l.smile === 'big') { B.add(H, cyl(0.075, 0.075, 0.012, 14), '#5a1d1d', [0, my + 0.015, mz - 0.004], [Math.PI / 2, 0, 0], [1, 1, 0.75]); B.add(H, box(0.15, 0.03, 0.02), skin.c, [0, my + 0.045, mz - 0.002]); B.add(H, sphere(0.03, 8, 6), '#ff8f8f', [0, my - 0.02, mz - 0.002], [0, 0, 0], [1.3, 0.6, 0.4]); }
  else if (l.smile === 'serious' || l.smile === 'mysterious') B.add(H, box(0.09, 0.016, 0.016), lip, [0, my, mz]);
  else if (l.smile === 'smirk') B.add(H, torus(0.055, 0.011, 6, 12, Math.PI * 0.8), lip, [0.015, my + 0.035, mz], [0, 0, Math.PI + 0.35]);
  else B.add(H, torus(0.06, 0.012, 6, 12, Math.PI), lip, [0, my + 0.04, mz], [0, 0, Math.PI]);
  // beard
  if (l.beard !== 'none') {
    const bc = l.beard === 'stubble' ? mix(skin.c, hair, 0.35) : hair;
    B.add(H, cap(R * 1.015, l.beard === 'full' ? Math.PI * 0.42 : Math.PI * 0.3, l.beard === 'full' ? Math.PI * 0.55 : Math.PI * 0.64, 0.25, Math.PI - 0.5), bc, [0, 0, 0], [0, 0, 0], [1, 1.03, 0.92]);
    if (l.beard !== 'stubble') B.add(H, capsule(0.022, 0.08), hairD, [0, my + 0.05, mz + 0.004], [0, 0, Math.PI / 2]);
  }
  // glasses
  if (l.glasses !== 'none') {
    for (const s of [-1, 1]) {
      const z = surf(0.11, 0) + 0.02;
      if (l.glasses === 'round') B.add(H, torus(0.078, 0.012, 6, 20), INK, [s * 0.11, 0.0, z]);
      else B.add(H, torus(0.085, 0.012, 4, 4), l.glasses === 'cat' ? '#3a1f3a' : INK, [s * 0.11, 0.0, z], [0, 0, Math.PI / 4 + (l.glasses === 'cat' ? s * 0.12 : 0)], [1.25, 0.85, 1]);
      B.add(H, cyl(0.008, 0.008, 0.14, 5), INK, [s * 0.22, 0.02, z - 0.07], [Math.PI / 2, 0, 0]);
    }
    B.add(H, cyl(0.008, 0.008, 0.05, 5), INK, [0, 0.01, surf(0, 0) + 0.02], [0, 0, Math.PI / 2]);
  }
  // hair
  const hairCap = (theta: number, tilt: number, k = 1.07) => B.add(H, cap(R * k, theta), hair, [0, 0.005, 0], [-tilt, 0, 0], [1, 1.03, 0.95]);
  // capsule(1, 0.5) is 2 wide, 2.5 tall, 2 deep: scale it to w × hh × d
  const back = (w: number, hh: number, y: number, z = -0.13, d = 0.24) => B.add(H, capsule(1, 0.5), hair, [0, y, z], [0, 0, 0], [w / 2, hh / 2.5, d / 2]);
  const bumps = (n: number, r: number, spread: number) => { for (let i = 0; i < n; i++) { const a = (i / (n - 1) - 0.5) * spread; B.add(H, sphere(r, 10, 8), hair, [Math.sin(a) * R * 1.02, Math.cos(a) * R * 0.98, -0.05]); } };
  switch (l.hair) {
    case 'shortNeat': case 'slick': case 'sporty': case 'silverNeat': hairCap(Math.PI * 0.42, 0.35); if (l.hair === 'slick') back(0.5, 0.2, 0.02, -0.16, 0.2); break;
    case 'receding': hairCap(Math.PI * 0.3, 0.75); back(0.56, 0.18, 0.0, -0.17, 0.2); break;
    case 'bob': hairCap(Math.PI * 0.5, 0.25, 1.09); back(0.7, 0.42, -0.06, -0.06, 0.4); break;
    case 'wavyLong': case 'straightLong': case 'styledLong': case 'longCurly':
      hairCap(Math.PI * 0.5, 0.22, 1.08); back(0.64, 0.78, -0.2, -0.12, 0.26);
      if (l.hair === 'wavyLong' || l.hair === 'longCurly') for (const s of [-1, 1]) for (let i = 0; i < 4; i++) B.add(H, sphere(l.hair === 'longCurly' ? 0.075 : 0.06, 10, 8), hair, [s * (0.27 - i * 0.01), -0.08 - i * 0.12, -0.04]);
      else for (const s of [-1, 1]) B.add(H, capsule(0.05, 0.32), hair, [s * 0.27, -0.2, -0.03]);
      break;
    case 'afro': B.add(H, cap(R * 1.36, Math.PI * 0.58), hair, [0, 0.06, -0.07], [-0.5, 0, 0], [1, 1, 0.95]); bumps(11, 0.11, 2.9); break;
    case 'midCurly': case 'shortCurly': hairCap(Math.PI * 0.42, 0.35); bumps(l.hair === 'midCurly' ? 9 : 7, l.hair === 'midCurly' ? 0.085 : 0.07, 2.4); break;
    case 'emoFringe': hairCap(Math.PI * 0.5, 0.2, 1.08); back(0.6, 0.4, -0.05, -0.12, 0.26); B.add(H, sphere(1, 12, 8), hair, [-0.06, 0.12, surf(-0.06, 0.12) + 0.01], [0, 0, 0.45], [0.2, 0.07, 0.05]); break;
    case 'ponytail': hairCap(Math.PI * 0.45, 0.3); B.add(H, capsule(0.075, 0.28), hair, [0, -0.08, -0.33], [0.55, 0, 0]); B.add(H, sphere(0.04, 8, 6), '#e23d4f', [0, 0.06, -0.3]); break;
    case 'bun': hairCap(Math.PI * 0.45, 0.3); B.add(H, sphere(0.12, 14, 10), hair, [0, 0.27, -0.13]); break;
  }
  // hats
  if (has('beretFR')) { B.add(H, sphere(1, 18, 10), '#22305a', [-0.03, 0.27, -0.02], [0, 0, 0.18], [0.3, 0.09, 0.28]); B.add(H, cyl(0.01, 0.01, 0.06, 5), INK, [-0.01, 0.37, -0.02]); }
  if (has('guardCap')) { B.add(H, cap(R * 1.1, Math.PI * 0.45), '#22305a', [0, 0.03, 0], [-0.2, 0, 0]); B.add(H, box(0.34, 0.025, 0.16), '#1b2023', [0, 0.13, 0.27], [0.25, 0, 0]); B.add(H, box(0.05, 0.05, 0.01), '#f5c518', [0, 0.24, 0.27], [-0.3, 0, 0]); }

  /* eyes: own nodes, so the idle clip can blink */
  const ey = 0.0;
  const eyes: THREE.Object3D[] = [];
  for (const [node, s] of [['eyeL', -1], ['eyeR', 1]] as const) {
    const e = new THREE.Group(); e.name = node; e.position.set(s * 0.11, ey, surf(0.11, ey) - 0.012);
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
  return { root, clips: clips(), height: legLen + headY + R * 1.03 };
}

/* --------------------------------------------------------------- clips */
type Keys = Record<string, { t: number[]; rot?: V3[]; pos?: V3[]; scl?: V3[] }>;
function clip(name: string, dur: number, k: Keys) {
  const tracks: THREE.KeyframeTrack[] = [];
  for (const [n, v] of Object.entries(k)) {
    if (v.rot) tracks.push(new THREE.QuaternionKeyframeTrack(`${n}.quaternion`, v.t, v.rot.flatMap((e) => new THREE.Quaternion().setFromEuler(new THREE.Euler(...e)).toArray())));
    if (v.pos) tracks.push(new THREE.VectorKeyframeTrack(`${n}.position`, v.t, v.pos.flat()));
    if (v.scl) tracks.push(new THREE.VectorKeyframeTrack(`${n}.scale`, v.t, v.scl.flat()));
  }
  return new THREE.AnimationClip(name, dur, tracks);
}
function clips() {
  const r = (x: number, y: number, z: number): V3 => [x, y, z];
  const blink = { t: [0, 1.9, 1.96, 2.04, 2.4], scl: [[1, 1, 1], [1, 1, 1], [1, 0.1, 1], [1, 1, 1], [1, 1, 1]] as V3[] };
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
    clip('hit', 0.45, {
      chest: { t: [0, 0.12, 0.45], rot: [r(0, 0, 0), r(-0.4, 0, 0.1), r(0, 0, 0)] },
      head: { t: [0, 0.12, 0.45], rot: [r(0, 0, 0), r(-0.35, 0, -0.15), r(0, 0, 0)] },
      armL: { t: [0, 0.12, 0.3, 0.45], rot: [r(0, 0, -0.1), r(-0.3, 0, -2.1), r(0, 0, -1.6), r(0, 0, -0.3)] },
      armR: { t: [0, 0.12, 0.3, 0.45], rot: [r(0, 0, 0.1), r(-0.3, 0, 2.1), r(0, 0, 1.6), r(0, 0, 0.3)] },
      legL: { t: [0, 0.12, 0.45], rot: [r(0, 0, 0), r(-0.5, 0, -0.15), r(0, 0, 0)] },
      legR: { t: [0, 0.12, 0.45], rot: [r(0, 0, 0), r(0.45, 0, 0.15), r(0, 0, 0)] },
    }),
  ];
}

/* --------------------------------------------------------------- export */
const exporter = new GLTFExporter();
const index: { id: string; bytes: number; height: number }[] = [];
for (const tc of TEACHERS) {
  const { root, clips: cl, height } = build(tc.look);
  const scene = new THREE.Scene(); scene.add(root);
  const glb = await exporter.parseAsync(scene, { binary: true, animations: cl, onlyVisible: true });
  const buf = Buffer.from(glb as ArrayBuffer);
  let verts = 0; root.traverse((o) => { if ((o as THREE.Mesh).isMesh) verts += (o as THREE.Mesh).geometry.getAttribute('position').count; });
  if (tc.id === TEACHERS[0].id) console.log('vertices per toon ≈', verts);
  writeFileSync(new URL(`${tc.id}.glb`, OUT), buf);
  index.push({ id: tc.id, bytes: buf.length, height: +height.toFixed(3) });
}
writeFileSync(new URL('index.json', OUT), JSON.stringify(index));
console.log(`${index.length} toons, ${(index.reduce((s, x) => s + x.bytes, 0) / 1024).toFixed(0)} KB in all`);
