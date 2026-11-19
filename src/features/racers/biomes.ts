/* English Racers — the biome layer laid over every track's own scenery (art spec v1, section A):
   grandstands with a bouncing crowd, the trees of each biome, background silhouettes (hills, skylines,
   landmarks, mountain ranges), particles that follow the camera (snow, petals, dust, spray) and a few
   props. Rules: everything repeated is an InstancedMesh in ~250 m chunks (bounding sphere + frustum
   culling), one material per family coloured per instance, no shadows, animation only on the GPU
   (`uTime` + per-instance `aPh` in the vertex shader — no matrices touched per frame), half the
   amounts and a 350 m draw distance on phones and weak devices. Placement reads a height grid made
   from the track's own scenery, so nothing lands inside a building, on water or on the road. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { KERB, type Track } from './track';
import type { Scenery } from './scenery';
import type { TrackId } from './tracks';

/* ------------------------------------------------------------------ quality */
const nav = typeof navigator !== 'undefined' ? (navigator as Navigator & { deviceMemory?: number; connection?: { saveData?: boolean } }) : null;
/** Same test as the engine's FULL_RIVALS: a desktop with memory to spare gets the full biome. */
const FULL = !!nav && (nav.deviceMemory ?? 4) >= 8 && !nav.connection?.saveData && typeof matchMedia !== 'undefined' && matchMedia('(pointer: fine)').matches;
export const BIOME_LOW = !FULL;
const Q = BIOME_LOW ? 0.5 : 1;
/** Phones: chunks further than this from the camera are hidden. */
const DRAW = 350;
const CHUNK = 250;

/* ------------------------------------------------------------------ geometry kit */
const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
/** Parts with a colour and a tint weight (aTint: 0 keeps the vertex colour, 1 takes the instance
    colour, 2 = a light bar that blinks, −1 = skin picked per instance). */
class Parts {
  parts: THREE.BufferGeometry[] = [];
  add(g: THREE.BufferGeometry, color: number, tint: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0, noBottom = false) {
    let geo = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
    _m.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz));
    geo.applyMatrix4(_m);
    if (noBottom) geo = dropDown(geo);
    _c.setHex(color);
    const n = geo.getAttribute('position').count, col = new Float32Array(n * 3), t = new Float32Array(n).fill(tint);
    for (let i = 0; i < n; i++) col.set([_c.r, _c.g, _c.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.setAttribute('aTint', new THREE.BufferAttribute(t, 1));
    this.parts.push(geo);
    return this;
  }
  addM(g: THREE.BufferGeometry, color: number, tint: number, m: THREE.Matrix4) {
    this.add(g, color, tint, 0, 0, 0);
    this.parts[this.parts.length - 1].applyMatrix4(m);
    return this;
  }
  /** Shade the colour by height between y0 (k0) and y1 (k1): soft ambient occlusion for free. */
  grade(y0: number, y1: number, k0: number, k1 = 1) {
    const g = this.parts[this.parts.length - 1], P = g.getAttribute('position'), C = g.getAttribute('color') as THREE.BufferAttribute;
    for (let i = 0; i < P.count; i++) { const k = THREE.MathUtils.lerp(k0, k1, THREE.MathUtils.clamp((P.getY(i) - y0) / (y1 - y0), 0, 1)); C.setXYZ(i, C.getX(i) * k, C.getY(i) * k, C.getZ(i) * k); }
    return this;
  }
  build() {
    const g = mergeGeometries(this.parts, false);
    this.parts.forEach((p) => p.dispose());
    this.parts = [];
    g.computeBoundingSphere();
    return g;
  }
}
/** Drop the downward faces (bottoms nobody sees). */
function dropDown(g: THREE.BufferGeometry) {
  const P = g.getAttribute('position'), N = g.getAttribute('normal'), keep: number[] = [];
  for (let i = 0; i < P.count; i += 3) if (!N || N.getY(i) > -0.9 || N.getY(i + 1) > -0.9) keep.push(i);
  if (keep.length * 3 === P.count) return g;
  const out = new THREE.BufferGeometry();
  for (const name of ['position', 'normal']) {
    const a = g.getAttribute(name);
    if (!a) continue;
    const arr = new Float32Array(keep.length * 9);
    keep.forEach((i, k) => { for (let j = 0; j < 9; j++) arr[k * 9 + j] = (a.array as Float32Array)[i * 3 + j]; });
    out.setAttribute(name, new THREE.BufferAttribute(arr, 3));
  }
  g.dispose();
  return out;
}
const G = {
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl6: new THREE.CylinderGeometry(1, 1, 1, 6, 1, true),
  cyl8: new THREE.CylinderGeometry(1, 1, 1, 8, 1, true),
  cone8: new THREE.ConeGeometry(1, 1, 8, 1, true),
  cone7: new THREE.ConeGeometry(1, 1, 7, 1, true),
  ico: new THREE.IcosahedronGeometry(1, 0),
  dodeca: new THREE.DodecahedronGeometry(1, 0),
  dome: new THREE.SphereGeometry(1, 8, 3, 0, Math.PI * 2, 0, Math.PI / 2),
  hill: new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2),
  plane: new THREE.PlaneGeometry(1, 1),
};

/* ------------------------------------------------------------------ GPU animation */
type Anim = { kind: 'none' } | { kind: 'sway'; y0: number; k: number } | { kind: 'crowd'; blink?: boolean } | { kind: 'spin'; speed: number };
const SKIN = [0xf1c7a5, 0xd9a47e, 0xa8714d, 0x6b4430].map((h) => new THREE.Color(h));
const v3 = (c: THREE.Color) => `vec3(${c.r.toFixed(4)}, ${c.g.toFixed(4)}, ${c.b.toFixed(4)})`;
function famMat<M extends THREE.MeshLambertMaterial | THREE.MeshBasicMaterial>(mat: M, T: { value: number }, anim: Anim): M {
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = T;
    const crowd = anim.kind === 'crowd';
    let head = 'attribute float aTint;\nuniform float uTime;\n';
    if (crowd) head += 'attribute vec2 aPh;\nvarying float vBar;\nvarying float vBlink;\n';
    sh.vertexShader = head + sh.vertexShader.replace('#include <color_vertex>', `#include <color_vertex>
      #ifdef USE_INSTANCING_COLOR
        vColor.xyz = color.xyz * mix(vec3(1.0), instanceColor.xyz, clamp(aTint, 0.0, 1.0));
        ${crowd ? `if (aTint < -0.5) vColor.xyz = aPh.y < 1.0 ? ${v3(SKIN[0])} : aPh.y < 2.0 ? ${v3(SKIN[1])} : aPh.y < 3.0 ? ${v3(SKIN[2])} : ${v3(SKIN[3])};` : ''}
      #endif`);
    let body = '';
    if (anim.kind === 'crowd') body = `
      vec3 ip = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      // twice the bounce when the race (the camera that follows it) goes past
      float nearK = 1.0 + smoothstep(48.0, 14.0, distance(ip, cameraPosition));
      transformed.y += (0.5 + 0.5 * sin(uTime * 6.0 + aPh.x)) * 0.15 * nearK;
      vBar = step(1.5, aTint);
      vBlink = aPh.x;`;
    else if (anim.kind === 'sway') body = `
      vec3 ip = (modelMatrix * instanceMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
      float ph = dot(ip.xz, vec2(0.071, 0.113));
      float hh = max(0.0, position.y - ${anim.y0.toFixed(2)});
      float w = hh * hh * ${anim.k.toFixed(4)};
      transformed.x += sin(uTime * 1.4 + ph) * w;
      transformed.z += cos(uTime * 1.1 + ph * 1.7) * w * 0.6;`;
    else if (anim.kind === 'spin') body = `
      float a = uTime * ${anim.speed.toFixed(3)};
      transformed.xz = mat2(cos(a), sin(a), -sin(a), cos(a)) * transformed.xz;`;
    sh.vertexShader = sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>' + body);
    if (crowd && 'blink' in anim && anim.blink) {
      sh.fragmentShader = 'uniform float uTime;\nvarying float vBar;\nvarying float vBlink;\n' + sh.fragmentShader.replace('#include <emissivemap_fragment>',
        '#include <emissivemap_fragment>\n totalEmissiveRadiance += diffuseColor.rgb * vBar * (0.6 + 2.2 * step(0.45, fract(uTime * 1.7 + vBlink * 0.37)));');
    } else if (crowd) sh.fragmentShader = 'varying float vBar;\nvarying float vBlink;\n' + sh.fragmentShader;
  };
  mat.customProgramCacheKey = () => 'racers-biome-' + JSON.stringify(anim);
  return mat;
}

/* ------------------------------------------------------------------ height grid */
/** Built once from the scenery a track made: per 4 m cell the highest thing standing (hi), the
    ground (lowest / highest flat surface), water, and how far the nearest road edge is. */
class Occ {
  readonly cs = 4;
  readonly x0: number; readonly z0: number; readonly nx: number; readonly nz: number;
  readonly hi: Float32Array; readonly lo: Float32Array; readonly sup: Float32Array; readonly wat: Float32Array; readonly road: Float32Array; readonly roadY: Float32Array;
  readonly yTop: number; readonly yLow: number;
  constructor(readonly track: Track, group: THREE.Group, margin = 340) {
    const b = track.box;
    this.x0 = b.x0 - margin; this.z0 = b.z0 - margin;
    this.nx = Math.ceil((b.x1 - b.x0 + margin * 2) / this.cs); this.nz = Math.ceil((b.z1 - b.z0 + margin * 2) / this.cs);
    const N = this.nx * this.nz;
    this.hi = new Float32Array(N).fill(-Infinity); this.lo = new Float32Array(N).fill(Infinity); this.sup = new Float32Array(N).fill(-Infinity);
    this.wat = new Float32Array(N).fill(-Infinity); this.road = new Float32Array(N).fill(99); this.roadY = new Float32Array(N).fill(NaN);
    let yTop = -Infinity, yLow = Infinity;
    for (const f of track.frames) { yTop = Math.max(yTop, f.p.y); yLow = Math.min(yLow, f.p.y); }
    this.yTop = yTop; this.yLow = yLow;
    // the road: distance from each cell to the nearest road edge (up to ~40 m)
    const R = 10;
    for (const f of track.frames) {
      const cx = Math.floor((f.p.x - this.x0) / this.cs), cz = Math.floor((f.p.z - this.z0) / this.cs), edge = f.w + KERB + f.apron;
      for (let j = cz - R; j <= cz + R; j++) for (let i = cx - R; i <= cx + R; i++) {
        if (i < 0 || j < 0 || i >= this.nx || j >= this.nz) continue;
        const k = j * this.nx + i, d = Math.hypot(this.x0 + (i + 0.5) * this.cs - f.p.x, this.z0 + (j + 0.5) * this.cs - f.p.z) - edge - this.cs * 0.71;
        if (d < this.road[k]) { this.road[k] = d; this.roadY[k] = f.p.y; }
      }
    }
    this.scan(group);
  }
  idx(x: number, z: number) {
    const i = Math.floor((x - this.x0) / this.cs), j = Math.floor((z - this.z0) / this.cs);
    return i < 0 || j < 0 || i >= this.nx || j >= this.nz ? -1 : j * this.nx + i;
  }
  private scan(group: THREE.Group) {
    group.updateMatrixWorld(true);
    const cap = this.yTop + 30, A = new THREE.Vector3(), B = new THREE.Vector3(), C = new THREE.Vector3(), n = new THREE.Vector3(), e1 = new THREE.Vector3(), e2 = new THREE.Vector3();
    const box = new THREE.Box3();
    group.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || !m.geometry?.getAttribute('position')) return;
      const mat = (Array.isArray(m.material) ? m.material[0] : m.material) as THREE.Material;
      if ((m as THREE.InstancedMesh).isInstancedMesh) {
        const im = m as THREE.InstancedMesh;
        if (!im.geometry.boundingBox) im.geometry.computeBoundingBox();
        for (let i = 0; i < im.count; i++) {
          im.getMatrixAt(i, _m);
          box.copy(im.geometry.boundingBox!).applyMatrix4(_m).applyMatrix4(im.matrixWorld);
          if (box.min.y > cap) continue;
          this.fill(box.min.x, box.min.z, box.max.x, box.max.z, (k) => { this.hi[k] = Math.max(this.hi[k], box.max.y); });
        }
        return;
      }
      // (clouds and other sky dressing: drawn without fog, before everything)
      if (m.renderOrder < 0 || ((mat as THREE.MeshStandardMaterial).fog === false && !(mat as THREE.ShaderMaterial).isShaderMaterial)) return;
      // (and anything floating wholly above the road: signs in the sky, rings, birds)
      if (!m.geometry.boundingBox) m.geometry.computeBoundingBox();
      if (box.copy(m.geometry.boundingBox!).applyMatrix4(m.matrixWorld).min.y > cap) return;
      const water = mat.transparent;
      const P = m.geometry.getAttribute('position'), I = m.geometry.index, mw = m.matrixWorld, ident = mw.equals(IDENT);
      const nt = I ? I.count / 3 : P.count / 3;
      for (let t = 0; t < nt; t++) {
        const a = I ? I.getX(t * 3) : t * 3, b = I ? I.getX(t * 3 + 1) : t * 3 + 1, c = I ? I.getX(t * 3 + 2) : t * 3 + 2;
        A.fromBufferAttribute(P, a); B.fromBufferAttribute(P, b); C.fromBufferAttribute(P, c);
        if (!ident) { A.applyMatrix4(mw); B.applyMatrix4(mw); C.applyMatrix4(mw); }
        const y0 = Math.min(A.y, B.y, C.y), y1 = Math.max(A.y, B.y, C.y);
        const flat = Math.abs(n.crossVectors(e1.subVectors(B, A), e2.subVectors(C, A)).normalize().y) > 0.6;
        const x0 = Math.min(A.x, B.x, C.x), x1 = Math.max(A.x, B.x, C.x), z0 = Math.min(A.z, B.z, C.z), z1 = Math.max(A.z, B.z, C.z);
        if (water) { if (flat) this.fill(x0, z0, x1, z1, (k) => { this.wat[k] = Math.max(this.wat[k], y1); }); continue; }
        this.fill(x0, z0, x1, z1, (k) => {
          if (y1 > this.hi[k]) this.hi[k] = y1;
          if (flat) { if (y1 > this.sup[k]) this.sup[k] = y1; if (y0 < this.lo[k]) this.lo[k] = y0; }
        });
      }
    });
  }
  private fill(x0: number, z0: number, x1: number, z1: number, f: (k: number) => void) {
    const i0 = Math.max(0, Math.floor((x0 - this.x0) / this.cs)), i1 = Math.min(this.nx - 1, Math.floor((x1 - this.x0) / this.cs));
    const j0 = Math.max(0, Math.floor((z0 - this.z0) / this.cs)), j1 = Math.min(this.nz - 1, Math.floor((z1 - this.z0) / this.cs));
    for (let j = j0; j <= j1; j++) for (let i = i0; i <= i1; i++) f(j * this.nx + i);
  }
  /** Ground height for something of radius r that may stand on a slope of `step` m, or null. */
  spot(x: number, z: number, r: number, step: number, clearRoad: number) {
    let top = -Infinity, low = Infinity;
    for (let dz = -r; dz <= r + 0.01; dz += Math.max(this.cs, r)) for (let dx = -r; dx <= r + 0.01; dx += Math.max(this.cs, r)) {
      const k = this.idx(x + dx, z + dz);
      if (k < 0 || this.road[k] < clearRoad || this.sup[k] === -Infinity || this.wat[k] > this.lo[k] - 0.05) return null;
      if (this.hi[k] - this.lo[k] > step) return null;
      top = Math.max(top, this.sup[k]); low = Math.min(low, this.lo[k]);
    }
    return top - low > step ? null : { top, low };
  }
  /** Water surface under (x, z) with no ground above it, or null. */
  water(x: number, z: number) { const k = this.idx(x, z); return k >= 0 && this.wat[k] > -Infinity && this.wat[k] > this.sup[k] + 0.05 && this.road[k] > 4 ? this.wat[k] : null; }
  hiAt(x: number, z: number) { const k = this.idx(x, z); return k < 0 ? Infinity : this.hi[k]; }
  roadAt(x: number, z: number) { const k = this.idx(x, z); return k < 0 ? 99 : this.road[k]; }
  /** Keep what was just placed out of the next placements. */
  mark(x: number, z: number, r: number, y: number) { this.fill(x - r, z - r, x + r, z + r, (k) => { this.hi[k] = Math.max(this.hi[k], y); }); }
}
const IDENT = new THREE.Matrix4();

/* ------------------------------------------------------------------ instanced families in chunks */
interface Inst { x: number; y: number; z: number; ry: number; s: number; sy?: number; c: number; ph?: [number, number] }
interface Ctx {
  track: Track; id: TrackId; group: THREE.Group; occ: Occ; rand: () => number; T: { value: number };
  chunks: { mesh: THREE.Object3D; x: number; z: number; r: number }[];
  trash: { dispose(): void }[];
  cx: number; cz: number; R: number; yBase: number;
  standsAt?: { x: number; y: number; z: number; ry: number }[];
}
function family(ctx: Ctx, base: THREE.BufferGeometry, mat: THREE.Material, list: Inst[], crowd = false, name = '') {
  ctx.trash.push(base, mat);
  if (!list.length) return;
  const by = new Map<string, Inst[]>();
  for (const it of list) { const k = `${Math.floor(it.x / CHUNK)},${Math.floor(it.z / CHUNK)}`; let a = by.get(k); if (!a) by.set(k, (a = [])); a.push(it); }
  const o = new THREE.Object3D(), col = new THREE.Color();
  for (const items of by.values()) {
    const g = new THREE.BufferGeometry();
    for (const [k, a] of Object.entries(base.attributes)) g.setAttribute(k, a);
    if (crowd) {
      const ph = new Float32Array(items.length * 2);
      items.forEach((it, i) => ph.set(it.ph ?? [0, 0], i * 2));
      g.setAttribute('aPh', new THREE.InstancedBufferAttribute(ph, 2));
    }
    const m = new THREE.InstancedMesh(g, mat, items.length);
    m.name = name;
    items.forEach((it, i) => {
      o.position.set(it.x, it.y, it.z); o.rotation.set(0, it.ry, 0); o.scale.set(it.s, it.s * (it.sy ?? 1), it.s); o.updateMatrix();
      m.setMatrixAt(i, o.matrix);
      m.setColorAt(i, col.setHex(it.c));
    });
    m.computeBoundingSphere();
    m.boundingSphere!.radius += 2;
    m.castShadow = false; m.receiveShadow = false;
    m.matrixAutoUpdate = false;
    ctx.group.add(m);
    ctx.chunks.push({ mesh: m, x: m.boundingSphere!.center.x, z: m.boundingSphere!.center.z, r: m.boundingSphere!.radius });
  }
}
const lambert = (T: { value: number }, anim: Anim = { kind: 'none' }, side: THREE.Side = THREE.FrontSide) => famMat(new THREE.MeshLambertMaterial({ vertexColors: true, side }), T, anim);
const pick = <X,>(r: () => number, a: readonly X[]) => a[Math.floor(r() * a.length) % a.length];

/** Scatter a family around the track where the ground is free. */
function scatter(ctx: Ctx, n: number, o: { r: number; step?: number; road?: [number, number]; h: [number, number]; h0: number; colors: number[]; within?: (x: number, z: number) => boolean; sink?: number }) {
  const out: Inst[] = [], b = ctx.track.box, rand = ctx.rand, rr = o.road ?? [6, 260];
  for (let tries = 0; tries < n * 40 && out.length < n; tries++) {
    const x = b.x0 - rr[1] + rand() * (b.x1 - b.x0 + rr[1] * 2), z = b.z0 - rr[1] + rand() * (b.z1 - b.z0 + rr[1] * 2);
    const d = ctx.occ.roadAt(x, z);
    if (d < rr[0] + o.r || d > rr[1] || (o.within && !o.within(x, z))) continue;
    const g = ctx.occ.spot(x, z, o.r, o.step ?? 2.5, rr[0] + o.r);
    if (!g) continue;
    const h = o.h[0] + rand() * (o.h[1] - o.h[0]), s = h / o.h0;
    out.push({ x, y: g.low - (o.sink ?? 0.2), z, ry: rand() * Math.PI * 2, s, c: pick(rand, o.colors) });
    ctx.occ.mark(x, z, o.r, g.top + h);
  }
  return out;
}

/* ------------------------------------------------------------------ tree and prop shapes */
function oakGeo(kind: 'oak' | 'plane' | 'maple' | 'cherry' | 'round') {
  const p = new Parts();
  p.add(new THREE.CylinderGeometry(0.2, 0.3, 2.6, 6, 1, true), 0x6b4a2b, 0, 0, 1.3, 0);
  if (kind === 'cherry') {
    p.add(G.ico, 0xffffff, 1, 0, 3.2, 0, 2.3, 1.3, 2.1).grade(2.2, 4.4, 0.78);
    p.add(G.ico, 0xffffff, 1, 0.7, 3.9, -0.3, 1.5, 1.0, 1.4).grade(3, 4.9, 0.85);
  } else if (kind === 'plane') {
    p.add(G.ico, 0xffffff, 1, 0, 3.3, 0, 1.9, 1.6, 1.9).grade(1.8, 4.9, 0.72);
    p.add(G.ico, 0xffffff, 1, 0.9, 4.3, 0.4, 1.3, 1.2, 1.3).grade(3.1, 5.5, 0.8);
    p.add(G.ico, 0xffffff, 1, -0.8, 4.6, -0.4, 1.1, 1.0, 1.1).grade(3.6, 5.6, 0.8);
  } else {
    p.add(G.ico, 0xffffff, 1, 0, 3.4, 0, 1.8, kind === 'maple' ? 1.9 : 1.6, 1.8).grade(1.8, 5.2, 0.72);
    p.add(G.ico, 0xffffff, 1, 0.5, 4.5, 0.2, 1.25, 1.2, 1.25).grade(3.3, 5.7, 0.82);
  }
  return p.build();
}
/** Curved trunk in five segments and six double-quad fronds. */
function palmGeo() {
  const p = new Parts();
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k <= 5; k++) { const u = k / 5; pts.push(new THREE.Vector3(u * u * 1.4, u * 8, 0)); }
  for (let k = 0; k < 5; k++) {
    const a = pts[k], b = pts[k + 1], L = a.distanceTo(b), ang = Math.atan2(b.x - a.x, b.y - a.y);
    p.add(new THREE.CylinderGeometry(0.2 - k * 0.02, 0.24 - k * 0.02, L, 6, 1, true), k % 2 ? 0x8a6a46 : 0x7a5b3a, 0, (a.x + b.x) / 2, (a.y + b.y) / 2, 0, 1, 1, 1, 0, 0, -ang);
  }
  const top = pts[5], M = new THREE.Matrix4(), R = new THREE.Matrix4();
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2 + 0.4;
    // a frond: two quads folded in a V along its rib, drooping outwards
    for (const sg of [-1, 1]) {
      M.makeTranslation(1.7, 0, sg * 0.36)                       // 3.4 m long, 0.72 m wide half, beside the rib
        .premultiply(R.makeRotationX(sg * 0.38))                  // folded up along the rib
        .premultiply(R.makeRotationZ(-0.42))                      // drooping
        .premultiply(R.makeRotationY(a))
        .premultiply(R.makeTranslation(top.x, top.y - 0.1, top.z));
      M.multiply(R.makeRotationX(-Math.PI / 2)).multiply(R.makeScale(3.4, 0.72, 1));
      p.addM(G.plane, k % 2 ? 0xffffff : 0xe6f0e0, 1, M);
    }
  }
  return p.build();
}
function firGeo() {
  const p = new Parts();
  p.add(G.cyl6, 0x5b3f2c, 0, 0, 1, 0, 0.3, 2, 0.3);
  for (let k = 0; k < 3; k++) {
    const r = 2.6 - k * 0.72, y = 2.6 + k * 1.85;
    p.add(G.cone8, 0xffffff, 1, 0, y, 0, r, 3.0, r).grade(y - 1.5, y + 1.5, 0.7);
    p.add(G.cone8, 0xffffff, 0, 0, y + 0.75, 0, r * 0.66, 1.5, r * 0.66).grade(y, y + 1.5, 0.86);
  }
  return p.build();
}
function saguaroGeo() {
  const p = new Parts();
  p.add(G.cyl8, 0xffffff, 1, 0, 3.4, 0, 0.42, 6.8, 0.42).grade(0, 7, 0.8);
  p.add(G.dome, 0xffffff, 1, 0, 6.8, 0, 0.42, 0.4, 0.42);
  for (const [sx, y0, h] of [[1, 2.6, 2.4], [-1, 3.4, 1.8]] as const) {
    p.add(G.cyl8, 0xffffff, 1, sx * 0.7, y0, 0, 0.26, 1.2, 0.26, 0, 0, Math.PI / 2);
    p.add(G.cyl8, 0xffffff, 1, sx * 1.25, y0 + h / 2 - 0.1, 0, 0.27, h, 0.27);
    p.add(G.dome, 0xffffff, 1, sx * 1.25, y0 + h - 0.1, 0, 0.27, 0.25, 0.27);
  }
  return p.build();
}
function rockGeo(snow: boolean) {
  const p = new Parts();
  p.add(G.dodeca, 0xffffff, 1, 0, 0.45, 0, 1.2, 0.85, 1).grade(-0.4, 1.3, 0.7);
  if (snow) p.add(G.dome, 0xffffff, 0, 0, 0.9, 0, 1.05, 0.45, 0.88);
  return p.build();
}
function shrubGeo() { return new Parts().add(G.ico, 0xffffff, 1, 0, 0.45, 0, 1, 0.7, 1).grade(-0.2, 1.1, 0.6).build(); }
function bushGeo() {
  const p = new Parts();
  p.add(new THREE.CylinderGeometry(0.42, 0.32, 0.6, 7, 1, false), 0xb5603a, 0, 0, 0.3, 0, 1, 1, 1, 0, 0, 0, true);
  p.add(G.cone8, 0xffffff, 1, 0, 1.3, 0, 0.55, 1.6, 0.55).grade(0.5, 2.1, 0.75);
  return p.build();
}
function parasolGeo() {
  const p = new Parts();
  p.add(G.cyl6, 0xf4f4f2, 0, 0, 1.2, 0, 0.05, 2.4, 0.05);
  p.add(new THREE.ConeGeometry(1.6, 0.6, 8, 1, true), 0xffffff, 1, 0, 2.5, 0);
  return p.build();
}
function floatGeo() { return new Parts().add(new THREE.TorusGeometry(0.6, 0.24, 6, 12), 0xffffff, 1, 0, 0.05, 0, 1, 1, 1, Math.PI / 2, 0, 0).build(); }
/** A snow bank: a squashed half-capsule, white on top and blue-grey in its shadow. */
function bankGeo() { return new Parts().add(G.hill, 0xffffff, 0, 0, 0, 0, 1, 1, 1).grade(0, 0.8, 0.86).build(); }

/* ------------------------------------------------------------------ grandstands and crowd */
interface StandLook {
  a: number; b: number; frame: number; awning?: [number, number]; flags?: number[]; crowd: number[]; dark?: boolean; n: number; scale?: number;
  /** Front of the stand from the road edge (m), slope it may stand on, how far below / above the road, spacing in a row. */
  gap?: [number, number]; step?: number; dy?: number; below?: number; every?: number;
  /** On scaffolding level with the road, this deep (m), wherever nothing below reaches up to it (rooftops). */
  perch?: number;
  /** Depth of the base under the steps (sloping ground). */
  foot?: number;
}
const SL = 20;
function standGeo(L: StandLook) {
  const p = new Parts();
  for (let i = 0; i < 3; i++) {
    const top = (i + 1) * 0.833;
    const foot = i === 2 && L.perch ? L.perch : L.foot ?? 3;
    p.add(G.box, i % 2 ? L.b : L.a, 0, 0, (top - foot) / 2, -(2 * i + 1), SL, top + foot, 2, 0, 0, 0, true);
    p.add(G.box, 0xffffff, 0, 0, top + 0.02, -(2 * i) - 0.12, SL, 0.04, 0.2); // white edge on each step
  }
  p.add(G.box, L.frame, 0, 0, 0.6, -6.15, SL + 0.4, 7.2, 0.3, 0, 0, 0, true);
  if (L.perch) for (const sx of [-1, -0.33, 0.33, 1]) for (const z of [-0.4, -3]) p.add(G.box, L.frame, 0, sx * (SL / 2 - 0.4), -L.perch / 2, z, 0.35, L.perch, 0.35, 0, 0, 0, true);
  for (const sx of [-1, 1]) p.add(G.box, L.frame, 0, sx * (SL / 2 + 0.1), 0, -3, 0.2, 6.6, 6.3, 0, 0, 0, true);
  if (L.awning) {
    for (const sx of [-1, 0, 1]) p.add(G.box, L.frame, 0, sx * (SL / 2 - 0.3), 3.8, -6.0, 0.16, 7.6, 0.16);
    for (let k = 0; k < 10; k++) {
      const x = -SL / 2 + (k + 0.5) * (SL / 10);
      p.add(G.box, k % 2 ? L.awning[0] : L.awning[1], 0, x, 6.95, -3.2, SL / 10, 0.08, 6.6, 0.2, 0, 0);
    }
  }
  if (L.flags) L.flags.forEach((c, k) => {
    const x = -SL / 2 + 1 + (k / Math.max(1, L.flags!.length - 1)) * (SL - 2);
    p.add(G.cyl6, 0x3a3f4b, 0, x, 5.4, -6.15, 0.05, 3.6, 0.05);
    p.add(G.box, c, 0, x + 0.55, 6.8, -6.15, 1.1, 0.7, 0.04);
  });
  return p.build();
}
function personGeo(neon: boolean) {
  const p = new Parts();
  p.add(G.box, neon ? 0x1a1330 : 0xffffff, neon ? 0 : 1, 0, 0.45, 0, 0.5, 0.9, 0.3, 0, 0, 0, true);
  p.add(G.box, neon ? 0x1a1330 : 0xffffff, neon ? 0 : -1, 0, 1.03, 0, 0.26, 0.26, 0.26, 0, 0, 0, true);
  if (neon) p.add(G.box, 0xffffff, 2, 0, 0.62, 0.02, 0.52, 0.07, 0.32, 0, 0, 0, true);
  return p.build();
}
function stands(ctx: Ctx, L: StandLook) {
  const tr = ctx.track, F = tr.frames, N = F.length, rand = ctx.rand;
  const want = Math.max(2, Math.round(L.n * Q));
  const avgCurv = (i: number) => { let c = 0; for (let k = -10; k <= 10; k++) c += Math.abs(F[(((i + k) % N) + N) % N].curv); return c / 21; };
  const busy = (s: number) => tr.gapAt(s) || tr.loops.some((l) => Math.min(tr.ahead(l.s, s), tr.ahead(s, l.s)) < 40) || tr.ramps.some((r) => tr.ahead(r.s0 - 15, s) < r.s1 - r.s0 + 30);
  const placed: { x: number; y: number; z: number; ry: number }[] = [];
  const sc = L.scale ?? 1;
  const tryAt = (s: number) => {
    const i = Math.round(s / tr.ds), f = tr.frame(i);
    if (busy(f.s) || avgCurv(i) > 0.014) return false;
    const sides = rand() < 0.5 ? [1, -1] : [-1, 1];
    for (const sg of sides) {
      const gap = L.gap ?? [14, 18], edge = f.w + KERB + f.apron, front = edge + gap[0] + rand() * (gap[1] - gap[0]), mid = front + 3 * sc;
      const cx = f.p.x + f.r.x * sg * mid, cz = f.p.z + f.r.z * sg * mid;
      // the footprint: 20 × 6 m (sampled every 4 m)
      let top = -Infinity, ok = true;
      for (let a = -SL / 2 * sc; a <= SL / 2 * sc + 0.01 && ok; a += 4 * sc) for (const b of [-3 * sc, 0, 3 * sc]) {
        const x = cx + f.t.x * a + f.r.x * sg * b, z = cz + f.t.z * a + f.r.z * sg * b;
        const clear = Math.min(10, gap[0] - 4);
        if (ctx.occ.roadAt(x, z) < clear) { ok = false; break; }
        if (L.perch) { if (ctx.occ.hiAt(x, z) > f.p.y - 0.6) { ok = false; break; } top = f.p.y - 0.25; continue; }
        const g = ctx.occ.spot(x, z, 0, L.step ?? 1.6, clear);
        if (!g) { ok = false; break; }
        top = Math.max(top, g.top);
      }
      if (!ok || top - f.p.y > (L.dy ?? 30) || f.p.y - top > (L.below ?? 30)) continue;
      const dx = -f.r.x * sg, dz = -f.r.z * sg;
      const st = { x: cx + f.r.x * sg * 3 * sc, y: top, z: cz + f.r.z * sg * 3 * sc, ry: Math.atan2(dx, dz) };
      placed.push(st);
      for (let a = -SL / 2; a <= SL / 2; a += 4) ctx.occ.mark(cx + f.t.x * a * sc, cz + f.t.z * a * sc, 4, top + 7);
      return true;
    }
    return false;
  };
  // evenly round the lap: look for a free stretch near each slot (the start straight first)
  const L0 = tr.length, step = L0 / want;
  for (let k = 0; k < want; k++) {
    const s0 = (tr.length - 60 + k * step) % L0;
    for (let d = 0; d < step * 0.8; d += 12) if (tryAt((s0 + d) % L0) || (d && tryAt((s0 - d + L0) % L0))) break;
  }
  if (!placed.length) return;
  const T = ctx.T;
  family(ctx, standGeo(L), lambert(T), placed.map((p) => ({ ...p, y: p.y - 0.05, s: sc, c: 0xffffff })), false, 'stands');
  // the crowd: three rows a stand, 6 tones per track and 15 % in white
  const people: Inst[] = [];
  const cs = Math.cos, sn = Math.sin;
  for (const st of placed) for (let row = 0; row < 3; row++) for (let x = -SL / 2 + 0.5; x <= SL / 2 - 0.5; x += L.every ?? 0.74) {
    if (rand() < 0.12) continue;
    const lx = (x + (rand() - 0.5) * 0.15) * sc, lz = (-(2 * row + 1) + (rand() - 0.5) * 0.5) * sc;
    people.push({
      x: st.x + cs(st.ry) * lx + sn(st.ry) * lz, y: st.y + (row + 1) * 0.833 * sc, z: st.z - sn(st.ry) * lx + cs(st.ry) * lz,
      ry: st.ry + (rand() - 0.5) * 0.5, s: sc, c: rand() < 0.15 ? 0xffffff : pick(rand, L.crowd), ph: [rand() * Math.PI * 2, Math.floor(rand() * 4)],
    });
  }
  family(ctx, personGeo(!!L.dark), lambert(T, { kind: 'crowd', blink: !!L.dark }), people, true, 'crowd');
  return placed;
}

/* ------------------------------------------------------------------ particles that follow the camera */
function camBox(ctx: Ctx, n: number, o: { box: [number, number, number]; below: number; colors: number[]; fall: [number, number]; drift: number; wind?: [number, number]; size: number; opacity: number; flutter?: boolean }) {
  const pos = new Float32Array(n * 3), seed = new Float32Array(n * 4), col = new Float32Array(n * 3), c = new THREE.Color();
  for (let i = 0; i < n; i++) {
    pos.set([ctx.rand() * o.box[0], ctx.rand() * o.box[1], ctx.rand() * o.box[2]], i * 3);
    seed.set([ctx.rand(), ctx.rand(), ctx.rand(), ctx.rand()], i * 4);
    c.setHex(pick(ctx.rand, o.colors), THREE.LinearSRGBColorSpace); col.set([c.r, c.g, c.b], i * 3);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 4));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: ctx.T, uBox: { value: new THREE.Vector3(...o.box) }, uBelow: { value: o.below }, uFall: { value: new THREE.Vector2(...o.fall) }, uDrift: { value: o.drift }, uWind: { value: new THREE.Vector2(...(o.wind ?? [0, 0])) }, uSize: { value: o.size * dpr }, uOp: { value: o.opacity } },
    vertexShader: `uniform float uTime, uBelow, uDrift, uSize, uOp; uniform vec3 uBox; uniform vec2 uFall, uWind;
      attribute vec4 aSeed; attribute vec3 color; varying vec3 vC; varying float vA, vF;
      void main(){
        vec3 p = position;
        p.y -= uTime * mix(uFall.x, uFall.y, aSeed.x);
        p.x += sin(uTime * (0.5 + aSeed.y * 0.6) + aSeed.z * 6.283) * uDrift + uTime * uWind.x;
        p.z += cos(uTime * (0.4 + aSeed.z * 0.5) + aSeed.w * 6.283) * uDrift + uTime * uWind.y;
        // recycled inside a box that follows the camera
        vec3 c0 = cameraPosition - uBox * vec3(0.5, uBelow, 0.5);
        p = c0 + mod(p - c0, uBox);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        float d = -mv.z;
        gl_PointSize = clamp(uSize * 40.0 / max(d, 0.1), uSize * 0.8, uSize * 3.0);
        vec3 q = (p - cameraPosition) / (uBox * 0.5);
        vA = uOp * (1.0 - smoothstep(0.7, 1.0, max(abs(q.x), abs(q.z)))) * smoothstep(0.4, 2.0, d);
        vC = color; vF = sin(uTime * 4.0 + aSeed.w * 20.0);
      }`,
    fragmentShader: `varying vec3 vC; varying float vA, vF; uniform float uTime;
      void main(){ vec2 q = gl_PointCoord - 0.5; ${o.flutter ? 'q.x /= 0.45 + 0.55 * abs(vF);' : ''} float r = dot(q, q); if (r > 0.25) discard; gl_FragColor = vec4(vC, vA * (1.0 - r * 2.2)); }`,
    transparent: true, depthWrite: false, fog: false,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  pts.renderOrder = 5;
  ctx.group.add(pts);
  ctx.trash.push(g, mat);
}
/** Spray jets: drops thrown up in arcs from a few emitters (one Points). */
function jets(ctx: Ctx, at: THREE.Vector3[], n: number) {
  if (!at.length) return;
  const pos = new Float32Array(n * 3), seed = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const e = at[i % at.length]; pos.set([e.x, e.y, e.z], i * 3); seed.set([ctx.rand(), ctx.rand(), ctx.rand()], i * 3); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1;
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: ctx.T, uSize: { value: 3.2 * dpr } },
    vertexShader: `uniform float uTime, uSize; attribute vec3 aSeed; varying float vA;
      void main(){
        float T = 1.6 + aSeed.z * 0.6, t = mod(uTime + aSeed.x * T, T), k = t / T;
        float a = aSeed.y * 6.283, sp = 1.5 + aSeed.z * 2.5;
        vec3 p = position + vec3(cos(a) * sp * t, (7.0 + aSeed.x * 3.0) * t - 4.9 * t * t, sin(a) * sp * t);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = clamp(uSize * 14.0 / max(-mv.z, 0.1), 1.5, uSize * 3.0);
        vA = (1.0 - k) * 0.9;
      }`,
    fragmentShader: `varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float r = dot(q, q); if (r > 0.25) discard; gl_FragColor = vec4(0.88, 0.97, 1.0, vA * (1.0 - r * 2.5)); }`,
    transparent: true, depthWrite: false,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  ctx.group.add(pts);
  ctx.trash.push(g, mat);
}

/* ------------------------------------------------------------------ silhouettes */
/** Everything far away merges into one unlit mesh (one draw call), coloured as painted layers. */
class Sil {
  p = new Parts();
  constructor(private ctx: Ctx) {}
  /** Point at angle a (rad) and distance r from the track's middle. */
  at(a: number, r: number): [number, number] { return [this.ctx.cx + Math.cos(a) * r, this.ctx.cz + Math.sin(a) * r]; }
  /** Distance from the middle: the spec's distance, never closer than 250 m beyond the track. */
  d(r: number) { return Math.max(r, this.ctx.R + 250 + (r - 600) * 0.6); }
  box(x: number, z: number, w: number, h: number, d: number, c: number, ry = 0, y = this.ctx.yBase) { this.p.add(G.box, c, 0, x, y + h / 2, z, w, h, d, 0, ry, 0, true); return this; }
  geo(g: THREE.BufferGeometry, c: number, x: number, y: number, z: number, sx: number, sy: number, sz: number, rx = 0, ry = 0, rz = 0) { this.p.add(g, c, 0, x, y, z, sx, sy, sz, rx, ry, rz, true); return this; }
  /** A ring of hills (half-domes) at radius r. */
  hills(r: number, n: number, h: [number, number], w: [number, number], c: number, a0 = 0, span = Math.PI * 2) {
    const R = this.d(r), rand = this.ctx.rand;
    for (let k = 0; k < n; k++) {
      const a = a0 + (k + rand() * 0.6) / n * span, [x, z] = this.at(a, R + (rand() - 0.5) * 60);
      const ww = w[0] + rand() * (w[1] - w[0]);
      this.geo(G.hill, c, x, this.ctx.yBase - 4, z, ww, h[0] + rand() * (h[1] - h[0]), ww * (0.6 + rand() * 0.3), 0, rand() * 6, 0);
    }
  }
  /** Peaks with a white cap. */
  peaks(r: number, n: number, h: [number, number], c: number, cap: number | null, a0 = 0, span = Math.PI * 2, seg: THREE.BufferGeometry = G.cone7) {
    const R = this.d(r), rand = this.ctx.rand;
    for (let k = 0; k < n; k++) {
      const a = a0 + (k + rand() * 0.6) / n * span, [x, z] = this.at(a, R + (rand() - 0.5) * 80);
      const hh = h[0] + rand() * (h[1] - h[0]), w = hh * (0.9 + rand() * 0.5), y = this.ctx.yBase - 10;
      this.geo(seg, c, x, y + hh / 2, z, w, hh, w * 0.85, 0, rand() * 6, 0);
      if (cap !== null) this.geo(seg, cap, x, y + hh * 0.8, z, w * 0.42, hh * 0.4 + 0.5, w * 0.36, 0, rand() * 6, 0);
    }
  }
  /** A skyline: n prisms in a band at radius r with lit windows (and roof details). */
  skyline(r: number, n: number, h: [number, number], c: number, win: number | null, opts: { a0?: number; span?: number; tanks?: boolean; bands?: number[] } = {}) {
    const R = this.d(r), rand = this.ctx.rand, a0 = opts.a0 ?? 0, span = opts.span ?? Math.PI * 2;
    for (let k = 0; k < n; k++) {
      const a = a0 + (k + rand()) / n * span, [x, z] = this.at(a, R + (rand() - 0.5) * 120);
      const w = 14 + rand() * 22, d = 14 + rand() * 18, hh = h[0] + Math.pow(rand(), 1.6) * (h[1] - h[0]), ry = -a, y = this.ctx.yBase;
      this.box(x, z, w, hh, d, c, ry);
      const fx = -Math.cos(a), fz = -Math.sin(a), off = d / 2 + 0.3;
      if (win !== null) for (let j = 0; j < 3; j++) if (rand() < 0.75) {
        const wy = y + hh * (0.25 + j * 0.25 + rand() * 0.08);
        this.geo(G.box, win, x + fx * off, wy, z + fz * off, w * (0.5 + rand() * 0.35), 1.6 + rand() * 1.5, 0.4, 0, ry, 0);
      }
      if (opts.bands) this.geo(G.box, pick(rand, opts.bands), x + fx * off, y + hh - 3, z + fz * off, w * 0.96, 1.4, 0.5, 0, ry, 0);
      if (opts.tanks && rand() < 0.35) {
        this.geo(G.cyl6, 0x3a3048, x + (rand() - 0.5) * w * 0.5, y + hh + 3, z, 2.6, 4.5, 2.6);
        this.geo(G.cone7, 0x3a3048, x, y + hh + 6, z, 3, 2.2, 3);
      } else if (opts.tanks && rand() < 0.5) this.box(x + w * 0.3, z, 1.6, 7, 1.6, c, ry, y + hh);
    }
  }
  build() {
    if (!this.p.parts.length) return;
    const mat = new THREE.MeshBasicMaterial({ vertexColors: true, fog: false, toneMapped: false });
    const m = new THREE.Mesh(this.p.build(), mat);
    m.renderOrder = -7;
    m.matrixAutoUpdate = false;
    this.ctx.group.add(m);
    this.ctx.trash.push(m.geometry, mat);
  }
}

/* ------------------------------------------------------------------ props (merged, one or two calls) */
class Props {
  lit = new Parts(); glow = new Parts();
  constructor(private ctx: Ctx) {}
  build() {
    if (this.lit.parts.length) { const mat = lambert(this.ctx.T); const m = new THREE.Mesh(this.lit.build(), mat); m.matrixAutoUpdate = false; this.ctx.group.add(m); this.ctx.trash.push(m.geometry, mat); }
    if (this.glow.parts.length) { const mat = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }); const m = new THREE.Mesh(this.glow.build(), mat); m.matrixAutoUpdate = false; this.ctx.group.add(m); this.ctx.trash.push(m.geometry, mat); }
  }
}
/** Strings of pennants or lanterns along the road on posts (outside the walls), from s0 for len m. */
function strings(ctx: Ctx, pr: Props, s0: number, len: number, o: { every: number; h: number; colors: number[]; lantern?: boolean; sides?: number[] }) {
  const tr = ctx.track;
  for (const sg of o.sides ?? [-1, 1]) {
    let prev: THREE.Vector3 | null = null;
    for (let s = s0; s <= s0 + len; s += o.every) {
      const f = tr.frame(Math.round((s % tr.length) / tr.ds));
      if (tr.gapAt(f.s) || f.bridge) { prev = null; continue; }
      const d = f.w + KERB + f.apron + 2.2, P = new THREE.Vector3(f.p.x + f.r.x * sg * d, f.p.y, f.p.z + f.r.z * sg * d);
      pr.lit.add(G.cyl6, 0x3a3f4b, 0, P.x, P.y + o.h / 2, P.z, 0.07, o.h, 0.07);
      if (prev) {
        const n = o.lantern ? 4 : 7;
        for (let k = 1; k < n; k++) {
          const u = k / n, x = prev.x + (P.x - prev.x) * u, z = prev.z + (P.z - prev.z) * u, y = prev.y + (P.y - prev.y) * u + o.h - 0.15 - Math.sin(u * Math.PI) * 0.8;
          const c = o.colors[k % o.colors.length];
          if (o.lantern) { pr.glow.add(G.ico, c, 0, x, y - 0.45, z, 0.32, 0.42, 0.32); pr.lit.add(G.box, 0x2a1d1a, 0, x, y - 0.05, z, 0.12, 0.2, 0.12); }
          else pr.lit.add(G.cone7, c, 0, x, y - 0.35, z, 0.28, 0.6, 0.05, Math.PI, Math.atan2(P.x - prev.x, P.z - prev.z) + Math.PI / 2, 0);
        }
      }
      prev = P;
    }
  }
}

/* ------------------------------------------------------------------ the biomes */
const TAU = Math.PI * 2;
type Builder = (ctx: Ctx, sil: Sil, pr: Props) => void;
const STAND: Record<TrackId, StandLook> = {
  campus: { a: 0x3b82f6, b: 0xf4f6fb, frame: 0x2b3a5c, flags: [0x2fd27a, 0xffd23f, 0x3b82f6, 0xff3d6e], crowd: [0x2fd27a, 0x3b82f6, 0xffd23f, 0xb5483a, 0x8b5cf6, 0xff8a3d], n: 12 },
  beach: { a: 0xff7a59, b: 0xffe6a8, frame: 0x5b6470, awning: [0xff7a59, 0xffffff], crowd: [0x36c2ff, 0xff7a59, 0x2fb57a, 0xffd23f, 0xff5a9e, 0x8b5cf6], n: 12 },
  roofs: { a: 0x3b4fa8, b: 0xf0a070, frame: 0x2a2f4a, crowd: [0xffb347, 0x3b4fa8, 0xf0a070, 0xff6b6b, 0x7dd3fc, 0xa78bfa], n: 9, scale: 0.7, gap: [2.5, 4], perch: 24 },
  neon: { a: 0x1c1238, b: 0x2a1a50, frame: 0xff2bd6, crowd: [0xff2bd6, 0x19e3ff, 0x7b2cff, 0xffe14a, 0x19e3ff, 0xff2bd6], n: 12, dark: true },
  london: { a: 0xc8102e, b: 0xf4f6fb, frame: 0x2b3245, flags: [0xc8102e, 0xffffff, 0x1d3f8f, 0xc8102e], crowd: [0xc8102e, 0x4f7fb8, 0x7a6a5a, 0x2b3245, 0xffd23f, 0x2fb57a], n: 12 },
  newyork: { a: 0x3f6fc0, b: 0xffc61a, frame: 0x1f2a44, crowd: [0xffc61a, 0x3f6fc0, 0xf0b884, 0xe53935, 0x1f2a44, 0x2fd27a], n: 12 },
  tokyo: { a: 0xff4d8d, b: 0x2a2a78, frame: 0x1a1a3a, crowd: [0xff4d8d, 0xffb48a, 0x2a2a78, 0xb8609a, 0x19e3ff, 0xffe14a], n: 12 },
  rio: { a: 0x009c3b, b: 0xffdf00, frame: 0x002776, flags: [0x009c3b, 0xffdf00, 0x002776], crowd: [0x009c3b, 0xffdf00, 0x002776, 0xff3d6e, 0xff8a3d, 0x8b5cf6], n: 18, every: 0.58 },
  splash: { a: 0x00d2ff, b: 0xffe14a, frame: 0x1786e6, awning: [0xff5a9e, 0xffffff], crowd: [0x00d2ff, 0x1786e6, 0xffe14a, 0xff5a9e, 0x2fd27a, 0xff8a3d], n: 12 },
  canyon: { a: 0x9a6a42, b: 0xb88a5a, frame: 0x6a4a2e, awning: [0xc85a2a, 0xffe0b0], crowd: [0xff7a1a, 0xc85a2a, 0xffe0b0, 0x3b82f6, 0x2fb57a, 0x8a3a1e], n: 5, step: 8, foot: 10, gap: [24, 44], dy: 40 },
  snow: { a: 0x3f7fd8, b: 0xf4f8ff, frame: 0x2b3a5c, flags: [0xd32f2f, 0xf4f4f2, 0x3f7fd8], crowd: [0xd32f2f, 0x3f7fd8, 0x2fb57a, 0xffd23f, 0x8b5cf6, 0xff8a3d], n: 12, step: 3.2, foot: 4.5 },
};

const BIOME: Record<TrackId, Builder> = {
  campus(ctx, sil, pr) {
    family(ctx, oakGeo('oak'), lambert(ctx.T, { kind: 'sway', y0: 2.5, k: 0.004 }), scatter(ctx, 120 * Q, { r: 2.4, h: [5, 9], h0: 5.6, colors: [0x3fae5a, 0x4fbf5f, 0x5cc865, 0x6bd068, 0x7bd86a] }), false, 'oakGeooak');
    sil.hills(900, 12, [70, 120], [160, 260], 0xb5e0be);
    sil.hills(800, 12, [50, 95], [130, 210], 0x8fd3a2, 0.2);
    sil.hills(700, 11, [35, 70], [100, 170], 0x6fc48a, 0.45);
    for (const a of [0.6, 2.4]) {
      const [x, z] = sil.at(a, sil.d(650));
      sil.box(x, z, 60, 34, 24, 0xb5483a, -a).geo(G.cone7, 0x8a3428, x, ctx.yBase + 40, z, 34, 12, 14, 0, -a + Math.PI / 4, 0);
      sil.box(x + 18, z, 6, 46, 6, 0xa03e32, -a);
    }
    strings(ctx, pr, ctx.track.length - 90, 160, { every: 14, h: 5.5, colors: [0x2fd27a, 0xffd23f, 0x3b82f6, 0xff3d6e, 0xffffff] });
  },
  beach(ctx, sil, pr) {
    family(ctx, palmGeo(), lambert(ctx.T, { kind: 'sway', y0: 3, k: 0.006 }, THREE.DoubleSide), scatter(ctx, 90 * Q, { r: 2, h: [7, 10], h0: 8, colors: [0x2fb57a, 0x3fc27a, 0x26a06a, 0x48c070] }), false, 'palmGeo');
    // the island and the lighthouse out at sea (the sea lies towards +z)
    const a = Math.PI / 2 + 0.25, [x, z] = sil.at(a, sil.d(900));
    sil.geo(G.hill, 0x5ca9a0, x, ctx.yBase - 4, z, 170, 46, 90).geo(G.hill, 0x6fb8ad, x + 90, ctx.yBase - 4, z + 30, 90, 26, 60);
    sil.geo(new THREE.CylinderGeometry(3.2, 5, 1, 8), 0xf4f4f2, x - 40, ctx.yBase + 54, z, 1, 28, 1).geo(new THREE.CylinderGeometry(3.2, 5, 1, 8), 0xff7a59, x - 40, ctx.yBase + 62, z, 1.02, 6, 1.02);
    sil.geo(G.cone7, 0x5ca9a0, x - 40, ctx.yBase + 72, z, 4, 4, 4);
    sil.hills(1000, 8, [30, 60], [140, 220], 0x8cc7c0, Math.PI + 0.3, Math.PI * 0.9);
    void pr;
  },
  roofs(ctx, sil) {
    family(ctx, bushGeo(), lambert(ctx.T, { kind: 'sway', y0: 0.8, k: 0.02 }), scatter(ctx, 60 * Q, { r: 1, step: 0.8, road: [3, 200], h: [1.5, 3], h0: 2.1, colors: [0x4e8f5a, 0x5a9f62, 0x437f4e] }), false, 'bushGeo');
    sil.skyline(900, Math.round(80 * (BIOME_LOW ? 0.7 : 1)), [60, 170], 0x6a5f92, 0xffb347, { tanks: true });
    sil.skyline(600, Math.round(70 * (BIOME_LOW ? 0.7 : 1)), [30, 110], 0x4a4a7a, 0xffb347, { tanks: true });
  },
  neon(ctx, sil) {
    holoTrees(ctx, Math.round(40 * Q));
    sil.skyline(900, 100, [70, 220], 0x1a0f3a, 0x7b2cff, { bands: [0xff2bd6, 0x19e3ff, 0x7b2cff, 0xffe14a] });
    sil.skyline(620, 100, [40, 140], 0x120a2a, 0x19e3ff, { bands: [0xff2bd6, 0x19e3ff, 0xffe14a] });
    // two rings of light turning in the sky
    for (const [r, y, tilt, sp, c] of [[150, 230, 0.35, 0.12, 0xff2bd6], [210, 280, -0.25, -0.08, 0x19e3ff]] as const) {
      const mat = famMat(new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(2.2), toneMapped: false, fog: false }), ctx.T, { kind: 'spin', speed: sp });
      const geo = new THREE.TorusGeometry(r, 1.6, 4, 96);
      geo.rotateX(Math.PI / 2);
      // a bead every so often so the turning shows
      const beads: THREE.BufferGeometry[] = [geo];
      for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU; beads.push(new THREE.BoxGeometry(9, 4, 4).translate(Math.cos(a) * r, 0, Math.sin(a) * r)); }
      const all = mergeGeometries(beads.map((b) => b.index ? b.toNonIndexed() : b).map((b) => { for (const k of Object.keys(b.attributes)) if (k !== 'position') b.deleteAttribute(k); return b; }));
      beads.forEach((b) => b.dispose());
      const m = new THREE.Mesh(all, mat);
      m.position.set(ctx.cx, ctx.yBase + y, ctx.cz);
      m.rotation.set(tilt, 0, tilt * 0.5);
      m.frustumCulled = false;
      ctx.group.add(m);
      ctx.trash.push(all, mat);
    }
  },
  london(ctx, sil, pr) {
    family(ctx, oakGeo('plane'), lambert(ctx.T, { kind: 'sway', y0: 2.5, k: 0.003 }), scatter(ctx, 100 * Q, { r: 2.4, h: [7, 11], h0: 5.8, colors: [0x8fa83a, 0xa3a83a, 0xc9892b, 0xb5973a, 0x9aa83a] }), false, 'oakGeoplane');
    const C = 0x8c9aaa, y = ctx.yBase;
    { // Big Ben
      const [x, z] = sil.at(0.4, sil.d(700));
      sil.box(x, z, 14, 96, 14, C).box(x, z, 17, 18, 17, C, 0, y + 96).geo(G.cone7, C, x, y + 128, z, 11, 28, 11, 0, Math.PI / 4, 0);
      sil.geo(new THREE.CircleGeometry(5.5, 12), 0xe8eef3, x, y + 104, z - 8.6, 1, 1, 1, 0, Math.PI, 0);
      sil.box(x + 60, z + 10, 110, 34, 24, C, 0.3);
    }
    { // the London Eye: ring, spokes and 16 cabins
      const [x, z] = sil.at(1.25, sil.d(820)), R = 60, cy = y + 76, ry = -1.25 + Math.PI / 2;
      const ring = new THREE.TorusGeometry(R, 1.4, 4, 48);
      sil.geo(ring, C, x, cy, z, 1, 1, 1, 0, ry, 0);
      ring.dispose();
      for (let k = 0; k < 16; k++) {
        const a = (k / 16) * TAU, ox = Math.cos(a) * R, oy = Math.sin(a) * R;
        sil.geo(G.box, C, x + Math.cos(ry) * ox, cy + oy, z - Math.sin(ry) * ox, 4.5, 3.6, 4.5, 0, ry, 0);
        if (k % 2 === 0) sil.geo(G.box, C, x + Math.cos(ry) * ox / 2, cy + oy / 2, z - Math.sin(ry) * ox / 2, 0.8, R, 0.8, 0, ry, a - Math.PI / 2);
      }
      for (const s of [-1, 1]) sil.geo(G.box, C, x + Math.cos(ry) * s * 22, y + 38, z - Math.sin(ry) * s * 22, 2, 80, 2, 0, ry, s * 0.28);
    }
    { // Tower Bridge: two towers, the walkway and the road deck
      const [x, z] = sil.at(2.3, sil.d(880)), ry = -2.3 + Math.PI / 2, dx = Math.cos(ry), dz = -Math.sin(ry);
      for (const s of [-1, 1]) {
        const tx = x + dx * s * 40, tz = z + dz * s * 40;
        sil.box(tx, tz, 16, 70, 16, C, ry).geo(G.cone7, C, tx, y + 78, tz, 9, 16, 9, 0, Math.PI / 4, 0);
        for (const c of [-1, 1]) sil.geo(G.cone7, C, tx + dx * c * 7, y + 74, tz + dz * c * 7, 2.4, 9, 2.4);
      }
      sil.geo(G.box, C, x, y + 60, z, 80, 5, 6, 0, ry, 0).geo(G.box, C, x, y + 24, z, 200, 4, 12, 0, ry, 0);
    }
    sil.skyline(950, 50, [20, 60], 0xa6b2c0, null);
    // umbrellas over the crowd and flags on the stands come from the stand look
    for (const st of ctx.standsAt ?? []) for (let k = 0; k < 5; k++) {
      const lx = (ctx.rand() - 0.5) * 18, lz = -(1 + 2 * Math.floor(ctx.rand() * 3)), row = (-lz - 1) / 2;
      const x = st.x + Math.cos(st.ry) * lx + Math.sin(st.ry) * lz, z = st.z - Math.sin(st.ry) * lx + Math.cos(st.ry) * lz;
      pr.lit.add(G.cyl6, 0x2b2f3a, 0, x, st.y + (row + 1) * 0.833 + 1.0, z, 0.03, 2.0, 0.03);
      pr.lit.add(new THREE.ConeGeometry(0.75, 0.45, 8, 1, true), pick(ctx.rand, [0xc8102e, 0x2b3245, 0xffd23f, 0x4f7fb8, 0x2fb57a]), 0, x, st.y + (row + 1) * 0.833 + 2.1, z);
    }
  },
  newyork(ctx, sil) {
    family(ctx, oakGeo('maple'), lambert(ctx.T, { kind: 'sway', y0: 2.5, k: 0.003 }), scatter(ctx, 80 * Q, { r: 2.4, h: [6, 9], h0: 5.8, colors: [0xe0742b, 0xf0b83a, 0xd8602a, 0xe89a30] }), false, 'oakGeomaple');
    sil.skyline(950, 130, [80, 260], 0x5b6c90, 0xffc61a, { a0: -0.3, span: Math.PI * 1.4 });
    sil.skyline(700, 120, [50, 170], 0x3a4a6e, 0xffe0b8, { a0: -0.4, span: Math.PI * 1.5 });
    { // two spires that read as Manhattan
      const [x, z] = sil.at(0.5, sil.d(900));
      sil.box(x, z, 30, 300, 30, 0x4a5a80).box(x, z, 18, 40, 18, 0x4a5a80, 0, ctx.yBase + 300).geo(G.cone7, 0xd8dfe8, x, ctx.yBase + 360, z, 2.5, 40, 2.5);
    }
  },
  tokyo(ctx, sil, pr) {
    family(ctx, oakGeo('cherry'), lambert(ctx.T, { kind: 'sway', y0: 2.5, k: 0.003 }), scatter(ctx, 110 * Q, { r: 2.4, h: [4.5, 7], h0: 5.0, colors: [0xffb7d0, 0xff8fb8, 0xffc8da, 0xffa6c6] }), false, 'oakGeocherry');
    camBox(ctx, Math.round(300 * Q), { box: [70, 30, 70], below: 0.3, colors: [0xffc4d8, 0xffb0cc, 0xffffff, 0xffd6e4], fall: [0.9, 1.5], drift: 1.6, wind: [0.4, 0.2], size: 4, opacity: 0.95, flutter: true });
    { // Fuji: a truncated cone with a white top, far away
      const [x, z] = sil.at(-0.9, sil.d(1200)), y = ctx.yBase - 20;
      sil.geo(new THREE.CylinderGeometry(0.18, 1, 1, 14, 1, true), 0x5a5a9a, x, y + 160, z, 330, 320, 330);
      sil.geo(new THREE.CylinderGeometry(0.18, 0.44, 1, 14, 1, true), 0xf4f6fb, x, y + 274, z, 330, 93, 330);
      sil.geo(new THREE.CircleGeometry(1, 14), 0xf4f6fb, x, y + 320.5, z, 59, 59, 59, -Math.PI / 2, 0, 0);
    }
    { // a pagoda
      const [x, z] = sil.at(0.9, sil.d(700)), y = ctx.yBase;
      for (let k = 0; k < 5; k++) {
        const w = 26 - k * 3.6, h0 = y + 10 + k * 13;
        sil.box(x, z, w * 0.62, 13, w * 0.62, 0x3a2a58, 0, h0 - 3);
        sil.geo(new THREE.ConeGeometry(1, 1, 4, 1, true), 0x2a2048, x, h0 + 10.5, z, w * 0.82, 5, w * 0.82, 0, Math.PI / 4, 0);
      }
      sil.geo(G.cyl6, 0x2a2048, x, y + 85, z, 0.8, 20, 0.8);
    }
    sil.skyline(900, 60, [30, 90], 0x6a5a98, 0xffb48a, { a0: 1.6, span: Math.PI * 1.1 });
    strings(ctx, pr, 30, 110, { every: 12, h: 6, colors: [0xff3b30, 0xff5a3a, 0xff2a2a], lantern: true });
  },
  rio(ctx, sil) {
    family(ctx, palmGeo(), lambert(ctx.T, { kind: 'sway', y0: 3, k: 0.006 }, THREE.DoubleSide), scatter(ctx, 70 * Q, { r: 2, h: [7, 10], h0: 8, colors: [0x1f9f4a, 0x24a852, 0x2fb05a] }), false, 'palmGeo');
    family(ctx, oakGeo('round'), lambert(ctx.T, { kind: 'sway', y0: 2.5, k: 0.003 }), scatter(ctx, 60 * Q, { r: 2.4, h: [5, 8], h0: 5.6, colors: [0x0e7a3a, 0x168a42, 0x1f9f4a] }), false, 'oakGeoround');
    const y = ctx.yBase;
    { // Sugarloaf by the sea (the sea is towards −z)
      const [x, z] = sil.at(-Math.PI / 2 - 0.3, sil.d(950));
      sil.geo(new THREE.SphereGeometry(1, 12, 8, 0, TAU, 0, Math.PI * 0.62), 0x4c8f6a, x, y - 20, z, 70, 210, 80);
      sil.geo(new THREE.SphereGeometry(1, 10, 6, 0, TAU, 0, Math.PI / 2), 0x5a9f78, x + 120, y - 10, z + 30, 60, 110, 60);
    }
    { // Corcovado with the Christ on top
      const [x, z] = sil.at(Math.PI / 2 + 0.4, sil.d(1150)), top = y + 250;
      sil.geo(G.cone7, 0x4c8f6a, x, y + 115, z, 220, 270, 190);
      sil.box(x, z, 4, 26, 4, 0xffffff, 0, top - 6).box(x, z, 30, 3.6, 3.6, 0xffffff, -(Math.PI / 2 + 0.4), top + 14).box(x, z, 5, 5, 5, 0xffffff, 0, top + 20);
    }
    { // morros with favelas: little boxes of colour on the slopes
      for (const a of [0.3, 2.6]) {
        const [x, z] = sil.at(a, sil.d(780));
        sil.geo(G.hill, 0x5a9a70, x, y - 6, z, 200, 110, 140);
        for (let k = 0; k < 70; k++) {
          const u = ctx.rand() * TAU, rr = Math.sqrt(ctx.rand()) * 0.85, px = x + Math.cos(u) * rr * 200, pz = z + Math.sin(u) * rr * 140;
          const hy = y - 6 + 110 * Math.sqrt(Math.max(0, 1 - rr * rr));
          sil.geo(G.box, pick(ctx.rand, [0xff5a5a, 0xffd23f, 0x3b82f6, 0xff8a3d, 0xf4f4f2, 0x2fd27a, 0xff5a9e]), px, hy + 2, pz, 8 + ctx.rand() * 6, 6 + ctx.rand() * 4, 8);
        }
      }
    }
  },
  splash(ctx, sil, pr) {
    family(ctx, palmGeo(), lambert(ctx.T, { kind: 'sway', y0: 3, k: 0.006 }, THREE.DoubleSide), scatter(ctx, 50 * Q, { r: 2, h: [7, 10], h0: 8, colors: [0x2fb57a, 0x3fc27a] }), false, 'palmGeo');
    family(ctx, parasolGeo(), lambert(ctx.T, { kind: 'none' }, THREE.DoubleSide), scatter(ctx, 40 * Q, { r: 1.6, step: 1.2, road: [4, 120], h: [2.6, 3.2], h0: 2.8, colors: [0xff5a9e, 0xffe14a, 0x00d2ff, 0xff8a3d, 0x7dff9a] }), false, 'parasolGeo');
    { // rubber rings floating on the water near the road
      const out: Inst[] = [], b = ctx.track.box;
      for (let t = 0; t < 4000 && out.length < 30 * Q; t++) {
        const x = b.x0 - 80 + ctx.rand() * (b.x1 - b.x0 + 160), z = b.z0 - 80 + ctx.rand() * (b.z1 - b.z0 + 160), w = ctx.occ.water(x, z);
        if (w === null || ctx.occ.roadAt(x, z) < 6) continue;
        out.push({ x, y: w + 0.05, z, ry: ctx.rand() * TAU, s: 1 + ctx.rand() * 0.4, c: pick(ctx.rand, [0xff5a9e, 0xffe14a, 0x00d2ff, 0xff8a3d]) });
      }
      family(ctx, floatGeo(), lambert(ctx.T), out, false, 'floatGeo');
    }
    { // tube slides and a water wheel in the background
      const y = ctx.yBase;
      for (const [a, c] of [[0.4, 0xff5a9e], [0.7, 0xffe14a], [1.0, 0x00d2ff]] as const) {
        const [x, z] = sil.at(a, sil.d(700)), pts: THREE.Vector3[] = [];
        for (let k = 0; k <= 24; k++) { const u = k / 24; pts.push(new THREE.Vector3(x + Math.cos(u * 9) * 26, y + 80 - u * 78, z + Math.sin(u * 9) * 26 + u * 40)); }
        const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, 3.2, 6, false);
        sil.geo(tube, c, 0, 0, 0, 1, 1, 1);
        tube.dispose();
        sil.box(x, z, 8, 82, 8, 0xd8e6ee);
      }
      const [x, z] = sil.at(1.9, sil.d(820)), R = 55;
      const ring = new THREE.TorusGeometry(R, 2.2, 4, 40);
      sil.geo(ring, 0x1786e6, x, y + R + 12, z, 1, 1, 1, 0, -1.9 + Math.PI / 2, 0);
      ring.dispose();
      for (let k = 0; k < 12; k++) { const u = (k / 12) * TAU, ry = -1.9 + Math.PI / 2; sil.geo(G.box, pick(ctx.rand, [0xff5a9e, 0xffe14a, 0x00d2ff]), x + Math.cos(ry) * Math.cos(u) * R, y + R + 12 + Math.sin(u) * R, z - Math.sin(ry) * Math.cos(u) * R, 6, 5, 6, 0, ry, 0); }
      sil.hills(950, 10, [30, 60], [140, 220], 0x9ccf7a);
    }
    // spray thrown up beside the road (one Points)
    const at: THREE.Vector3[] = [], tr = ctx.track;
    for (let k = 0; k < 10; k++) { const f = tr.frame(Math.round(((k + 0.5) / 10) * tr.frames.length)), sg = k % 2 ? 1 : -1, d = f.w + KERB + f.apron + 6; at.push(new THREE.Vector3(f.p.x + f.r.x * sg * d, f.p.y - 0.5, f.p.z + f.r.z * sg * d)); }
    jets(ctx, at, Math.round(400 * Q));
    void pr;
  },
  canyon(ctx, sil) {
    family(ctx, saguaroGeo(), lambert(ctx.T), scatter(ctx, 70 * Q, { r: 1.8, step: 6, h: [5, 9], h0: 7.2, sink: 0.8, colors: [0x4e9a5a, 0x5aa866, 0x438a50] }), false, 'saguaroGeo');
    family(ctx, shrubGeo(), lambert(ctx.T, { kind: 'sway', y0: 0.2, k: 0.05 }), scatter(ctx, 80 * Q, { r: 1, step: 6, h: [0.6, 1.3], h0: 0.9, colors: [0xb5a05a, 0x9a8a4a, 0xc8b070] }), false, 'shrubGeo');
    family(ctx, rockGeo(false), lambert(ctx.T), scatter(ctx, 50 * Q, { r: 2, step: 6, h: [1.2, 3.5], h0: 1.3, colors: [0xc85a2a, 0x8a3a1e, 0xb0522a], sink: 0.8 }), false, 'rockGeofalse');
    const mesa = new THREE.CylinderGeometry(0.85, 1, 1, 7, 1, false);
    for (const [r, c, h] of [[1200, 0xd98a5a, [90, 150]], [1050, 0xc86a3a, [70, 120]], [900, 0xb0522a, [50, 90]]] as const) {
      const R = sil.d(r), n = 9;
      for (let k = 0; k < n; k++) {
        const a = (k + ctx.rand() * 0.7) / n * TAU, [x, z] = sil.at(a, R + (ctx.rand() - 0.5) * 80), hh = h[0] + ctx.rand() * (h[1] - h[0]), w = 60 + ctx.rand() * 110;
        sil.geo(mesa, c, x, ctx.yBase - 10 + hh / 2, z, w, hh, w * 0.6, 0, ctx.rand() * 6, 0);
      }
    }
    mesa.dispose();
    camBox(ctx, Math.round(200 * Q), { box: [80, 12, 80], below: 0.7, colors: [0xe8c9a0, 0xd8b088, 0xf0dcc0], fall: [-0.15, 0.25], drift: 1.2, wind: [2.6, 0.8], size: 3.2, opacity: 0.45 });
  },
  snow(ctx, sil) {
    family(ctx, firGeo(), lambert(ctx.T, { kind: 'sway', y0: 3, k: 0.0012 }), scatter(ctx, 160 * Q, { r: 2.6, step: 4.5, sink: 0.6, h: [6, 12], h0: 8.2, road: [8, 280], colors: [0x1f5a3a, 0x2a6a44, 0x245f3e, 0x1a5034] }), false, 'firGeo');
    family(ctx, rockGeo(true), lambert(ctx.T), scatter(ctx, 40 * Q, { r: 2, step: 4.5, h: [1.2, 3], h0: 1.3, colors: [0x8e9db4, 0x7a889e, 0x9aa7bb], sink: 0.6 }), false, 'rockGeotrue');
    // banks of ploughed snow along the edges, and mounds a little further out
    const tr = ctx.track, banks: Inst[] = [], n = Math.round(200 * Q), stp = tr.length / n;
    for (let k = 0; k < n; k++) {
      const s = k * stp + ctx.rand() * stp * 0.5, f = tr.frame(Math.round(s / tr.ds));
      if (tr.gapAt(f.s) || f.bridge || Math.abs(f.bank) > 0.12) continue;
      const sg = k % 2 ? 1 : -1, d = f.w + KERB + f.apron + 1.2 + ctx.rand() * 0.8, x = f.p.x + f.r.x * sg * d, z = f.p.z + f.r.z * sg * d;
      banks.push({ x, y: f.p.y - 0.25, z, ry: f.yaw + Math.PI / 2, s: 0.8 + ctx.rand() * 0.5, c: 0xffffff });
    }
    const bank = bankGeo();
    family(ctx, bank.clone().scale(2.6, 0.55, 1.1), lambert(ctx.T), banks, false, 'banks');
    const mounds = scatter(ctx, 80 * Q, { r: 1.6, road: [1.5, 6.5], step: 1.5, h: [0.6, 1.2], h0: 1, colors: [0xffffff, 0xf6faff], sink: 0.1 });
    family(ctx, bank.clone().scale(2.2, 1, 1.8), lambert(ctx.T), mounds, false, 'mounds');
    bank.dispose();
    // the range: three layers, white tops
    sil.peaks(1400, 14, [260, 380], 0x9dbbe0, 0xf4f8ff);
    sil.peaks(1100, 13, [190, 290], 0x8fb0d8, 0xf8fbff, 0.25);
    sil.peaks(820, 12, [120, 200], 0x6f94c4, 0xffffff, 0.5);
    // falling snow round the camera: one Points
    camBox(ctx, BIOME_LOW ? 700 : 1500, { box: [120, 60, 120], below: 0.35, colors: [0xffffff, 0xf2f8ff, 0xeaf3ff], fall: [3, 5], drift: 1.4, wind: [0.6, 0.3], size: 2.5, opacity: 0.85 });
  },
};

/** Neon: wireframe trees of light (one additive LineSegments). */
function holoTrees(ctx: Ctx, n: number) {
  const pos: number[] = [], col: number[] = [], c = new THREE.Color();
  const spots = scatter(ctx, n, { r: 2, h: [6, 9], h0: 1, colors: [0xff2bd6, 0x19e3ff, 0x7b2cff], step: 3 });
  for (const s of spots) {
    c.setHex(s.c).multiplyScalar(1.8);
    const h = s.s, r = h * 0.3, seg = 8;
    const line = (a: number[], b: number[]) => { pos.push(...a, ...b); col.push(c.r, c.g, c.b, c.r, c.g, c.b); };
    for (let k = 0; k < seg; k++) {
      const a = (k / seg) * TAU, b = ((k + 1) / seg) * TAU;
      line([s.x + Math.cos(a) * r, s.y + 1, s.z + Math.sin(a) * r], [s.x, s.y + h + 1, s.z]);
      for (const f of [0, 0.45]) line([s.x + Math.cos(a) * r * (1 - f), s.y + 1 + h * f, s.z + Math.sin(a) * r * (1 - f)], [s.x + Math.cos(b) * r * (1 - f), s.y + 1 + h * f, s.z + Math.sin(b) * r * (1 - f)]);
    }
    line([s.x, s.y, s.z], [s.x, s.y + 1, s.z]);
  }
  if (!pos.length) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeBoundingSphere();
  const mat = new THREE.LineBasicMaterial({ vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false });
  const m = new THREE.LineSegments(g, mat);
  ctx.group.add(m);
  ctx.trash.push(g, mat);
}

/* ------------------------------------------------------------------ entry point */
/** Lay the biome over a track's scenery: returns the same Scenery with the extra group inside, its
    update (uTime, draw distance) and its dispose chained. */
export function dress(sc: Scenery, track: Track, id: TrackId): Scenery {
  let seed = 7919 + id.length * 104729 + id.charCodeAt(0) * 31;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const occ = new Occ(track, sc.group);
  const group = new THREE.Group();
  group.name = 'biome';
  const b = track.box;
  const ctx: Ctx = {
    track, id, group, occ, rand, T: { value: 0 }, chunks: [], trash: [], cx: b.cx, cz: b.cz, R: b.r, yBase: occ.yLow - 6,
  };
  ctx.standsAt = stands(ctx, STAND[id]);
  const sil = new Sil(ctx), pr = new Props(ctx);
  BIOME[id](ctx, sil, pr);
  sil.build();
  pr.build();
  sc.group.add(group);
  // the camera, read when the scene renders (for the draw distance on phones)
  const eye = new THREE.Vector3(0, 1e6, 0);
  if (BIOME_LOW && ctx.chunks.length) {
    const probe = new THREE.Points(new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0], 3)), new THREE.PointsMaterial({ size: 0 }));
    probe.geometry.setDrawRange(0, 0);
    probe.frustumCulled = false;
    probe.onBeforeRender = (_r, _s, cam) => { eye.copy(cam.position); };
    group.add(probe);
    ctx.trash.push(probe.geometry, probe.material as THREE.Material);
  }
  const prevUpdate = sc.update?.bind(sc), prevDispose = sc.dispose.bind(sc);
  // (keep only what update and dispose need: the height grid goes)
  const { chunks, trash, T } = ctx;
  let at = 0;
  return {
    ...sc,
    update(dt, t) {
      prevUpdate?.(dt, t);
      T.value = t;
      if (BIOME_LOW && eye.y < 1e5 && t - at > 0.25) {
        at = t;
        for (const c of chunks) c.mesh.visible = Math.hypot(c.x - eye.x, c.z - eye.z) < DRAW + c.r;
      }
    },
    dispose() {
      for (const c of chunks) { (c.mesh as THREE.InstancedMesh).geometry.dispose(); (c.mesh as THREE.InstancedMesh).dispose(); }
      for (const x of trash) x.dispose();
      group.removeFromParent();
      prevDispose();
    },
  };
}
