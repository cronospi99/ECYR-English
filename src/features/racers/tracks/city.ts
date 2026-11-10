/* English Racers — a kit for the city tracks (London, New York, Tokyo, Rio): textured facades by
   style, a ground with streets, rivers, trees and lamps, and the life that makes a city feel
   awake: cheering crowds, people walking along the track, traffic on the side streets, boats,
   birds, bunting that waves, animated screens and falling petals or confetti. Static parts merge
   into a few meshes; everything that moves is instanced and animated in one update. */
import * as THREE from 'three';
import { Geo, U, shade } from '@/features/run/gfx';
import { KERB, type Frame, type Track } from '../track';
import { side } from '../trackMesh';
import { MATS, disposeGroup, mergeInto, type Hazard, type Scenery } from '../scenery';

export type FacadeKind = 'brick' | 'stone' | 'glass' | 'office' | 'concrete' | 'pastel';
export interface City {
  track: Track;
  group: THREE.Group;
  M: ReturnType<typeof MATS>;
  world: Geo; glossy: Geo; glass: Geo; glow: Geo;
  rand: () => number;
  /** Frames every 2 m (for distance checks). */
  near: Frame[];
  /** Free of the road, its pavement and walls, plus r. */
  clear(x: number, z: number, r: number): boolean;
  facades: Facades;
  updates: ((dt: number, t: number) => void)[];
  /** Extra things to dispose (textures not owned by a mesh of the group…). */
  trash: { dispose(): void }[];
}

export function city(track: Track, seed: number): City {
  let s = seed;
  const rand = () => { s = (s * 16807) % 2147483647; return s / 2147483647; };
  const near = track.frames.filter((_, i) => i % 2 === 0);
  const glow = new Geo();
  glow.boost = 1.7;
  return {
    track, group: new THREE.Group(), M: MATS(), world: new Geo(), glossy: new Geo(), glass: new Geo(), glow, rand, near,
    clear: (x, z, r) => near.every((f) => Math.abs(x - f.p.x) > 60 || Math.abs(z - f.p.z) > 60 || Math.hypot(x - f.p.x, z - f.p.z) > f.w + KERB + f.apron + 2.5 + r),
    facades: new Facades(), updates: [], trash: [],
  };
}

/** Merge the static parts and return the track's Scenery. */
export function done(c: City, lamps: THREE.MeshStandardMaterial[], extra: { waterY: number; waters?: THREE.Mesh[]; oceans?: { uTime: { value: number } }[]; hazards?: Hazard[] }): Scenery {
  c.facades.build(c.group);
  mergeInto(c.group, c.M, { world: c.world, glossy: c.glossy, glass: c.glass, glow: c.glow });
  return {
    group: c.group, lamps, waters: extra.waters ?? [], oceans: extra.oceans, waterY: extra.waterY, hazards: extra.hazards,
    update(dt, t) { for (const u of c.updates) u(dt, t); },
    dispose() { disposeGroup(c.group); for (const x of c.trash) x.dispose(); },
  };
}

/* ------------------------------------------------------------------ textures */
function canvasTex(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void, repeat = true) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  if (repeat) t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** One facade tile (two floors × three bays, metres: TILE_W × TILE_H) and its lit windows. */
const TILE: Record<FacadeKind, [number, number]> = { brick: [9, 6.4], stone: [9, 7], glass: [6, 7.2], office: [9, 7.2], concrete: [9, 6.4], pastel: [7, 6] };
function facadeTex(kind: FacadeKind, lit: boolean) {
  return canvasTex(256, 256, (g) => {
    let r = kind.length * 7919;
    const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    const win = (x: number, y: number, w: number, h: number, frame: string, glass: string, on: boolean) => {
      if (lit) { if (on) { g.fillStyle = `hsl(${36 + rnd() * 14},95%,${58 + rnd() * 12}%)`; g.fillRect(x, y, w, h); } return; }
      g.fillStyle = frame; g.fillRect(x - 4, y - 4, w + 8, h + 8);
      g.fillStyle = on ? '#f6d68c' : glass; g.fillRect(x, y, w, h);
      g.fillStyle = 'rgba(255,255,255,.22)'; g.fillRect(x, y, w, h * 0.18);
    };
    g.fillStyle = lit ? '#000' : { brick: '#9c4a34', stone: '#e8dcc2', glass: '#5d8fc2', office: '#d9d4c8', concrete: '#d6d8dc', pastel: '#ffffff' }[kind];
    g.fillRect(0, 0, 256, 256);
    if (!lit && kind === 'brick') { // brick courses
      for (let y = 0; y < 256; y += 8) for (let x = (y / 8) % 2 ? -10 : 0; x < 256; x += 20) { g.fillStyle = `hsl(${10 + rnd() * 10},${45 + rnd() * 15}%,${33 + rnd() * 10}%)`; g.fillRect(x + 1, y + 1, 18, 6); }
    }
    if (!lit && kind === 'concrete') { g.fillStyle = 'rgba(0,0,0,.08)'; for (let y = 0; y < 256; y += 128) g.fillRect(0, y + 120, 256, 8); }
    for (let fl = 0; fl < 2; fl++) for (let b = 0; b < 3; b++) {
      const on = rnd() < 0.3, y0 = fl * 128;
      if (kind === 'glass') { // curtain wall: full-height glass with mullions
        if (lit) { if (on) { g.fillStyle = `hsl(${40 + rnd() * 10},90%,${62 + rnd() * 10}%)`; g.fillRect(b * 85 + 6, y0 + 10, 74, 104); } continue; }
        g.fillStyle = shadeCss(0x5d8fc2, (rnd() - 0.5) * 0.12); g.fillRect(b * 85 + 3, y0 + 4, 79, 118);
        g.fillStyle = on ? 'rgba(255,220,150,.55)' : 'rgba(255,255,255,.18)'; g.fillRect(b * 85 + 3, y0 + 4, 79, 30);
        g.fillStyle = '#2f3d52'; g.fillRect(b * 85, y0, 4, 128); g.fillRect(0, y0 + 122, 256, 6);
      } else if (kind === 'stone') win(b * 85 + 26, y0 + 18, 34, 84, '#f4ecd8', '#5f7da0', on);
      else if (kind === 'brick') { win(b * 85 + 24, y0 + 22, 38, 74, '#f2f2ee', '#4f6f93', on); if (!lit) { g.fillStyle = '#efe8dc'; g.fillRect(b * 85 + 18, y0 + 100, 50, 7); } }
      else if (kind === 'office') win(b * 85 + 10, y0 + 30, 66, 60, '#8a8f99', '#6d8fb8', on);
      else if (kind === 'concrete') { win(b * 85 + 12, y0 + 26, 62, 56, '#a9adb5', '#7aa0c8', on); if (!lit && fl === 1 && b === 1) { g.fillStyle = '#7a8088'; g.fillRect(b * 85 + 8, y0 + 96, 70, 18); } }
      else win(b * 85 + 26, y0 + 30, 32, 52, '#ffffff', '#6a8fb5', on); // pastel: small windows, white frames
    }
    if (!lit && kind === 'pastel') { g.fillStyle = 'rgba(0,0,0,.1)'; g.fillRect(0, 120, 256, 6); g.fillRect(0, 248, 256, 6); }
  });
}
function shadeCss(hex: number, l: number) { return '#' + shade(hex, l).toString(16).padStart(6, '0'); }

/** Facade walls by style: one mesh per style (texture + glowing windows), tinted per building. */
export class Facades {
  private sets = new Map<FacadeKind, { pos: number[]; uv: number[]; col: number[] }>();
  private c = new THREE.Color();
  /** A box building's four walls (centre x z, size w d, from y0 to y0 + h, turned ry). */
  add(kind: FacadeKind, x: number, z: number, w: number, d: number, h: number, ry: number, tint = 0xffffff, y0 = 0) {
    const set = this.sets.get(kind) ?? { pos: [], uv: [], col: [] };
    this.sets.set(kind, set);
    const cs = Math.cos(ry), sn = Math.sin(ry), [TW, TH] = TILE[kind];
    const P = (lx: number, lz: number) => [x + lx * cs + lz * sn, z - lx * sn + lz * cs];
    const k = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
    this.c.setHex(tint);
    for (let i = 0; i < 4; i++) {
      const a = k[i], b = k[(i + 1) % 4], len = Math.hypot(b[0] - a[0], b[1] - a[1]);
      const q = [[a[0], y0, a[1]], [b[0], y0, b[1]], [b[0], y0 + h, b[1]], [a[0], y0 + h, a[1]]];
      const u = [[0, 0], [len / TW, 0], [len / TW, h / TH], [0, h / TH]];
      for (const j of [0, 1, 2, 0, 2, 3]) { set.pos.push(...q[j]); set.uv.push(u[j][0], u[j][1]); set.col.push(this.c.r, this.c.g, this.c.b); }
    }
  }
  build(group: THREE.Group) {
    for (const [kind, set] of this.sets) {
      const g = new THREE.BufferGeometry();
      g.setAttribute('position', new THREE.Float32BufferAttribute(set.pos, 3));
      g.setAttribute('uv', new THREE.Float32BufferAttribute(set.uv, 2));
      g.setAttribute('color', new THREE.Float32BufferAttribute(set.col, 3));
      g.computeVertexNormals();
      const glass = kind === 'glass';
      const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: facadeTex(kind, false), vertexColors: true, roughness: glass ? 0.2 : 0.8, metalness: glass ? 0.35 : 0, emissive: 0xffffff, emissiveMap: facadeTex(kind, true), emissiveIntensity: 0.5, side: THREE.DoubleSide }));
      m.castShadow = true; m.receiveShadow = true;
      group.add(m);
    }
  }
}

/** A building: facades plus a roof (flat with clutter, pitched, or a spire). */
export function building(c: City, kind: FacadeKind, x: number, z: number, w: number, d: number, h0: number, ry = 0, opts: { tint?: number; roof?: 'flat' | 'pitched' | 'spire' | 'none'; roofColor?: number; y0?: number } = {}) {
  const y0 = opts.y0 ?? 0, h = h0 + y0;
  c.facades.add(kind, x, z, w, d, h0, ry, opts.tint, y0);
  const roof = opts.roof ?? 'flat', rc = opts.roofColor ?? 0x8c8f96;
  if (roof === 'flat') {
    c.world.add(U.box, rc, x, h + 0.25, z, w + 0.4, 0.5, d + 0.4, 0, ry, 0);
    if (c.rand() < 0.5) c.glossy.add(U.box, 0xc9ced6, x + (c.rand() - 0.5) * w * 0.5, h + 1.0, z + (c.rand() - 0.5) * d * 0.5, 2.4, 1.2, 1.8, 0, ry, 0);
  } else if (roof === 'pitched') {
    // a gable: a box turned 45° about the ridge, half inside the building (grid buildings are not turned)
    const k = Math.min(w, d) / Math.SQRT2;
    if (w >= d) c.world.add(U.box, rc, x, h, z, w + 0.6, k, k, Math.PI / 4, 0, 0);
    else c.world.add(U.box, rc, x, h, z, k, k, d + 0.6, 0, 0, Math.PI / 4);
  } else if (roof === 'spire') {
    c.world.add(U.box, rc, x, h + 0.25, z, w + 0.4, 0.5, d + 0.4, 0, ry, 0);
    c.glossy.add(new THREE.ConeGeometry(1, 1, 4), 0xc9d2de, x, h + w * 0.6, z, w * 0.35, w * 1.2, w * 0.35, 0, ry + Math.PI / 4, 0);
  }
}

/** Fill a rectangle with a grid of buildings off the road (`pick` decides each one, or null). */
export function fillGrid(c: City, a: { x0: number; x1: number; z0: number; z1: number; step: number; street?: number }, pick: (x: number, z: number) => { kind: FacadeKind; h: number; tint?: number; roof?: 'flat' | 'pitched' | 'spire' | 'none'; roofColor?: number } | null) {
  const st = a.street ?? 8;
  for (let x = a.x0; x <= a.x1; x += a.step) for (let z = a.z0; z <= a.z1; z += a.step) {
    const w = a.step - st - c.rand() * 3, d = a.step - st - c.rand() * 3;
    if (!c.clear(x, z, Math.max(w, d) * 0.72)) continue;
    const p = pick(x, z);
    if (p) building(c, p.kind, x, z, w, d, p.h, 0, p);
  }
}

/** Street lines of a grid that stay clear of the road: lanes for traffic (both directions). */
export function gridLanes(c: City, a: { x0: number; x1: number; z0: number; z1: number; step: number }, avoid: (x: number, z: number) => boolean = () => false) {
  const lanes: Lane[] = [];
  const run = (pts: THREE.Vector2[]) => {
    let cur: THREE.Vector2[] = [];
    const flush = () => { if (cur.length > 18) { lanes.push({ pts: cur.map((p) => p.clone()), off: 1.8 }); lanes.push({ pts: [...cur].reverse().map((p) => p.clone()), off: 1.8 }); } cur = []; };
    for (const p of pts) { if (c.clear(p.x, p.y, 3) && !avoid(p.x, p.y)) cur.push(p); else flush(); }
    flush();
  };
  const h = a.step / 2;
  for (let x = a.x0 - h; x <= a.x1 + h; x += a.step) { const pts: THREE.Vector2[] = []; for (let z = a.z0 - h; z <= a.z1 + h; z += 4) pts.push(new THREE.Vector2(x, z)); run(pts); }
  for (let z = a.z0 - h; z <= a.z1 + h; z += a.step) { const pts: THREE.Vector2[] = []; for (let x = a.x0 - h; x <= a.x1 + h; x += 4) pts.push(new THREE.Vector2(x, z)); run(pts); }
  return lanes;
}

/** Ground: a big plane with streets painted on (aligned with a building grid), tinted by colour(x, z). */
export function ground(c: City, o: { cx: number; cz: number; size: number; step: number; gx: number; gz: number; y?: (x: number, z: number) => number; color?: (x: number, z: number) => number; asphalt?: string; walk?: string }) {
  const n = Math.max(160, Math.round(o.size / 6.5)), g = new THREE.PlaneGeometry(o.size, o.size, n, n);
  g.rotateX(-Math.PI / 2);
  g.translate(o.cx, -0.08, o.cz);
  const P = g.getAttribute('position'), uv = g.getAttribute('uv') as THREE.BufferAttribute, col = new Float32Array(P.count * 3), cc = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i);
    if (o.y) P.setY(i, o.y(x, z));
    uv.setXY(i, (x - o.gx - o.step / 2) / o.step, (z - o.gz - o.step / 2) / o.step);
    cc.setHex(o.color ? o.color(x, z) : 0xffffff);
    col.set([cc.r, cc.g, cc.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const tex = canvasTex(512, 512, (x) => {
    x.fillStyle = o.walk ?? '#b9b6ae'; x.fillRect(0, 0, 512, 512);
    x.fillStyle = 'rgba(0,0,0,.05)'; for (let k = 0; k < 512; k += 32) { x.fillRect(k, 0, 2, 512); x.fillRect(0, k, 512, 2); }
    x.fillStyle = o.asphalt ?? '#4a4d55'; x.fillRect(0, 0, 512, 70); x.fillRect(0, 442, 512, 70); x.fillRect(0, 0, 70, 512); x.fillRect(442, 0, 70, 512);
    x.fillStyle = '#f4f4f2'; for (let k = 0; k < 6; k++) { x.fillRect(80 + k * 14, 8, 8, 54); x.fillRect(8, 80 + k * 14, 54, 8); }
    x.fillStyle = '#ffd23f'; for (let k = 90; k < 512; k += 40) { x.fillRect(k, 0, 20, 3); x.fillRect(0, k, 3, 20); }
  });
  tex.anisotropy = 8;
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: tex, vertexColors: true, roughness: 0.92 }));
  m.receiveShadow = true;
  c.group.add(m);
  return m;
}

/** A flat patch (park lawn, plaza, sand) between the ground and the road, as a polygon. */
export function patch(c: City, pts: [number, number][], color: number, y = -0.05) {
  const sh = new THREE.Shape(pts.map(([x, z]) => new THREE.Vector2(x, -z)));
  const g = new THREE.ShapeGeometry(sh, 6);
  g.rotateX(-Math.PI / 2);
  g.translate(0, y, 0);
  c.world.add(g, color, 0, 0, 0, 1, 1, 1);
}

/* ------------------------------------------------------------------ static dressing */
export function tree(c: City, x: number, z: number, kind: 'round' | 'sakura' | 'palm' | 'pine' = 'round', s = 1, y = 0) {
  const r = c.rand;
  if (kind === 'palm') {
    const h = (7 + r() * 4) * s, lean = (r() - 0.5) * 0.5, la = r() * Math.PI * 2;
    for (let k = 0; k < 6; k++) { const f = k / 6; c.world.add(U.cyl, k % 2 ? 0x8a6a46 : 0x7a5b3a, x + Math.cos(la) * lean * f * h * 0.4, y + f * h + h / 12, z + Math.sin(la) * lean * f * h * 0.4, 0.28 - f * 0.08, h / 6 + 0.05, 0.28 - f * 0.08); }
    const tx = x + Math.cos(la) * lean * h * 0.4, tz = z + Math.sin(la) * lean * h * 0.4;
    for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2 + r(); c.world.add(U.box, k % 2 ? 0x3f9a3a : 0x2f8a34, tx + Math.cos(a) * 2, y + h - 0.2, tz + Math.sin(a) * 2, 4.2 * s, 0.12, 0.9 * s, 0, -a, -0.35); }
    c.world.add(U.ball, 0x6b4a2b, tx, y + h + 0.1, tz, 0.5, 0.5, 0.5);
    return;
  }
  const h = (2.4 + r() * 1.2) * s;
  c.world.add(U.cyl, kind === 'sakura' ? 0x5b3f35 : 0x6b4a2b, x, y + h / 2, z, 0.22 * s, h, 0.22 * s);
  if (kind === 'pine') { for (let k = 0; k < 3; k++) c.world.add(new THREE.ConeGeometry(1, 1, 8), shade(0x2f6b3a, (r() - 0.5) * 0.06), x, y + h + k * 1.3 * s, z, (2.2 - k * 0.55) * s, 2.2 * s, (2.2 - k * 0.55) * s); return; }
  const base = kind === 'sakura' ? 0xffb7d0 : 0x4f9a3e;
  for (let k = 0; k < 4; k++) c.world.blob(x + (r() - 0.5) * 2 * s, y + h + 0.8 * s + r() * 1.2 * s, z + (r() - 0.5) * 2 * s, (1.3 + r() * 0.7) * s, shade(base, (r() - 0.5) * 0.1), 0.85);
}

/** Street lamps on both sides of the road every `every` m (outside the walls). */
export function lamps(c: City, every: number, col = 0x2b2f3a, light = 0xffe2a0, keep: (f: Frame) => boolean = () => true) {
  const F = c.track.frames;
  for (let i = 0; i < F.length; i += Math.round(every / c.track.ds)) {
    const f = F[i];
    if (!keep(f) || c.track.gapAt(f.s)) continue;
    for (const sg of [-1, 1]) {
      if ((i / Math.round(every / c.track.ds)) % 2 && sg > 0) continue;
      const P = side(f, sg * (f.w + KERB + f.apron + 1.2));
      c.world.cyl(P.x, P.y, P.z, 0.12, 5.6, col);
      const hx = P.x - f.r.x * sg * 1.1, hz = P.z - f.r.z * sg * 1.1;
      c.world.add(U.box, col, (P.x + hx) / 2, P.y + 5.6, (P.z + hz) / 2, 0.1, 0.1, 1.2, 0, f.yaw + Math.PI / 2, 0);
      c.glow.add(U.ball, light, hx, P.y + 5.45, hz, 0.28, 0.2, 0.28);
    }
  }
}

/* ------------------------------------------------------------------ people */
const SKIN = [0xf1c7a5, 0xd9a47e, 0xb97a55, 0x8a5636, 0x5e3a24, 0xffd9bd];
const SHIRT = [0xe53935, 0x1e88e5, 0xfdd835, 0x43a047, 0xfb8c00, 0x8e24aa, 0xffffff, 0x00acc1, 0xf06292, 0x3949ab, 0x2b2f3a];
function personGeo(arms: boolean) {
  const g = new Geo();
  g.add(U.box, 0x3a3f4b, -0.1, 0.4, 0, 0.15, 0.8, 0.18).add(U.box, 0x3a3f4b, 0.1, 0.4, 0, 0.15, 0.8, 0.18); // legs (dark)
  g.add(U.cyl, 0xffffff, 0, 1.08, 0, 0.26, 0.62, 0.2); // shirt (tinted per person)
  if (arms) for (const sx of [-1, 1]) g.add(U.box, 0xffffff, sx * 0.32, 1.5, 0, 0.11, 0.6, 0.11, 0, 0, sx * -0.45);
  else for (const sx of [-1, 1]) g.add(U.box, 0xffffff, sx * 0.3, 1.02, 0, 0.1, 0.55, 0.1);
  return g.build();
}
const headGeo = () => new Geo().add(U.ball, 0xffffff, 0, 1.55, 0, 0.17, 0.19, 0.17).build();

/** People standing at spots: cheering (bounce, arms up) or just chatting (gentle sway). */
export function crowd(c: City, spots: { x: number; y: number; z: number; ry: number }[], cheer = true) {
  if (!spots.length) return;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  const body = new THREE.InstancedMesh(personGeo(cheer), mat, spots.length), head = new THREE.InstancedMesh(headGeo(), mat, spots.length);
  const col = new THREE.Color(), ph = spots.map(() => c.rand() * 10), sp = spots.map(() => 5 + c.rand() * 4);
  spots.forEach((_, i) => { body.setColorAt(i, col.setHex(SHIRT[Math.floor(c.rand() * SHIRT.length)])); head.setColorAt(i, col.setHex(SKIN[Math.floor(c.rand() * SKIN.length)])); });
  body.frustumCulled = head.frustumCulled = false;
  body.castShadow = true;
  c.group.add(body, head);
  const o = new THREE.Object3D();
  let k = 0;
  c.updates.push((_, t) => {
    // half of them per frame (still smooth at 60 fps, half the cost)
    k ^= 1;
    for (let i = k; i < spots.length; i += 2) {
      const s = spots[i], b = cheer ? Math.max(0, Math.sin(t * sp[i] + ph[i])) * 0.28 : 0;
      o.position.set(s.x, s.y + b, s.z);
      o.rotation.set(0, s.ry + Math.sin(t * 1.3 + ph[i]) * 0.3, cheer ? Math.sin(t * sp[i] * 0.5 + ph[i]) * 0.08 : 0);
      o.updateMatrix();
      body.setMatrixAt(i, o.matrix); head.setMatrixAt(i, o.matrix);
    }
    body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = true;
  });
}

/** Spots for a crowd along the road (behind the wall), on the frames that `keep` allows. */
export function roadsideSpots(c: City, from: number, to: number, opts: { rows?: number; every?: number; sides?: (-1 | 1)[]; extra?: number; y?: number } = {}) {
  const out: { x: number; y: number; z: number; ry: number }[] = [];
  const tr = c.track, every = opts.every ?? 1.3;
  for (let s = from; s < to; s += every) {
    const f = tr.frame(Math.round(s / tr.ds));
    for (const sg of opts.sides ?? [-1, 1]) for (let r = 0; r < (opts.rows ?? 2); r++) {
      if (c.rand() < 0.25) continue;
      const P = side(f, sg * (f.w + KERB + f.apron + 1.6 + (opts.extra ?? 0) + r * 1.1 + c.rand() * 0.4));
      out.push({ x: P.x + (c.rand() - 0.5) * 0.5, y: (opts.y ?? 0) + r * 0.45, z: P.z + (c.rand() - 0.5) * 0.5, ry: f.yaw + (sg > 0 ? -Math.PI / 2 : Math.PI / 2) });
    }
  }
  return out;
}

/** People walking along the pavements beside the road (both ways), where `keep` allows. */
export function walkers(c: City, n: number, keep: (f: Frame) => boolean = () => true) {
  const tr = c.track, L = tr.length;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  const body = new THREE.InstancedMesh(personGeo(false), mat, n), head = new THREE.InstancedMesh(headGeo(), mat, n);
  const col = new THREE.Color();
  const ws = Array.from({ length: n }, (_, i) => {
    body.setColorAt(i, col.setHex(SHIRT[Math.floor(c.rand() * SHIRT.length)])); head.setColorAt(i, col.setHex(SKIN[Math.floor(c.rand() * SKIN.length)]));
    return { s: c.rand() * L, dir: c.rand() < 0.5 ? 1 : -1, sg: c.rand() < 0.5 ? 1 : -1, sp: 1.1 + c.rand() * 0.6, off: 2.2 + c.rand() * 2.2, ph: c.rand() * 6 };
  });
  body.frustumCulled = head.frustumCulled = false;
  c.group.add(body, head);
  const o = new THREE.Object3D(), P = new THREE.Vector3();
  c.updates.push((dt, t) => {
    for (let i = 0; i < n; i++) {
      const w = ws[i];
      w.s = (((w.s + w.dir * w.sp * dt) % L) + L) % L;
      const f = tr.frame(Math.round(w.s / tr.ds));
      const ok = keep(f) && !tr.gapAt(w.s);
      side(f, w.sg * (f.w + KERB + f.apron + w.off), 0, P);
      o.position.set(P.x, Math.max(0, P.y - Math.abs(f.bank) * (f.w + KERB) * 2) + Math.abs(Math.sin(t * 7 + w.ph)) * 0.06, P.z);
      o.rotation.set(0, f.yaw + (w.dir < 0 ? Math.PI : 0), 0);
      o.scale.setScalar(ok ? 1 : 0.001);
      o.updateMatrix();
      body.setMatrixAt(i, o.matrix); head.setMatrixAt(i, o.matrix);
    }
    body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = true;
  });
}

/* ------------------------------------------------------------------ traffic, boats, birds */
export interface Lane { pts: THREE.Vector2[]; off: number; y?: number }
export type VehicleKind = 'car' | 'taxi' | 'cab' | 'bus' | 'double' | 'van';
function vehicleGeo(kind: VehicleKind) {
  const g = new Geo(), dark = 0x2b2f3a, glass = 0x24324a;
  const wheels = (z: number[], x = 0.85) => { for (const sx of [-x, x]) for (const sz of z) g.add(U.cyl, 0x1b1d24, sx, 0.38, sz, 0.38, 0.28, 0.38, 0, 0, Math.PI / 2); };
  if (kind === 'double' || kind === 'bus') {
    const H = kind === 'double' ? 4.2 : 2.9;
    g.add(U.box, 0xffffff, 0, H / 2 + 0.35, 0, 2.5, H, 10.5);
    for (const y of kind === 'double' ? [1.7, 3.6] : [1.9]) g.add(U.box, glass, 0, y, 0, 2.54, 0.8, 9.6);
    g.add(U.box, glass, 0, kind === 'double' ? 2.6 : 1.9, 5.26, 2.2, 1.4, 0.04);
    g.add(U.box, 0xfff4c0, 0.8, 0.9, 5.27, 0.4, 0.25, 0.04).add(U.box, 0xfff4c0, -0.8, 0.9, 5.27, 0.4, 0.25, 0.04);
    wheels([-3.6, 3.6], 1.1);
  } else if (kind === 'van') {
    g.add(U.box, 0xffffff, 0, 1.35, -0.3, 2.0, 2.0, 4.6).add(U.box, 0xffffff, 0, 0.95, 2.4, 1.9, 1.2, 1.0).add(U.box, glass, 0, 1.75, 2.0, 1.86, 0.6, 0.5);
    wheels([-1.6, 1.8]);
  } else {
    g.add(U.box, 0xffffff, 0, 0.62, 0, 1.8, 0.62, 4.2);
    if (kind === 'cab') g.add(U.box, 0xffffff, 0, 1.3, -0.3, 1.66, 0.85, 2.4).add(U.box, glass, 0, 1.35, -0.3, 1.7, 0.5, 2.2);
    else g.add(U.box, 0xffffff, 0, 1.18, -0.25, 1.6, 0.58, 2.2).add(U.box, glass, 0, 1.2, -0.25, 1.64, 0.42, 2.0);
    if (kind === 'taxi') g.add(U.box, 0xfff6c8, 0, 1.58, -0.25, 0.7, 0.2, 0.3);
    g.add(U.box, 0xfff4c0, 0.6, 0.7, 2.11, 0.35, 0.18, 0.03).add(U.box, 0xfff4c0, -0.6, 0.7, 2.11, 0.35, 0.18, 0.03);
    g.add(U.box, 0xff3030, 0.6, 0.7, -2.11, 0.35, 0.16, 0.03).add(U.box, 0xff3030, -0.6, 0.7, -2.11, 0.35, 0.16, 0.03);
    g.add(U.box, dark, 0, 0.36, 0, 1.84, 0.12, 4.24);
    wheels([-1.35, 1.35]);
  }
  return g.build();
}

/** Vehicles driving along lanes (they ease in and out at the ends of each lane). */
export function traffic(c: City, lanes: Lane[], fleet: { kind: VehicleKind; colors: number[]; n: number; speed?: number }[]) {
  if (!lanes.length) return;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.3 });
  const lens = lanes.map((l) => { let s = 0; for (let i = 1; i < l.pts.length; i++) s += l.pts[i].distanceTo(l.pts[i - 1]); return s; });
  const o = new THREE.Object3D(), col = new THREE.Color();
  for (const f of fleet) {
    const m = new THREE.InstancedMesh(vehicleGeo(f.kind), mat, f.n);
    m.frustumCulled = false; m.castShadow = true;
    const vs = Array.from({ length: f.n }, (_, i) => { m.setColorAt(i, col.setHex(f.colors[i % f.colors.length])); const li = Math.floor(c.rand() * lanes.length); return { li, d: c.rand() * lens[li], sp: (f.speed ?? 9) * (0.8 + c.rand() * 0.4) }; });
    c.group.add(m);
    c.updates.push((dt) => {
      for (let i = 0; i < f.n; i++) {
        const v = vs[i], L = lanes[v.li], len = lens[v.li];
        v.d += v.sp * dt;
        if (v.d > len) { v.li = Math.floor(c.rand() * lanes.length); v.d = 0; continue; }
        let d = v.d, k = 1;
        while (k < L.pts.length - 1 && d > L.pts[k].distanceTo(L.pts[k - 1])) { d -= L.pts[k].distanceTo(L.pts[k - 1]); k++; }
        const a = L.pts[k - 1], b = L.pts[k], sl = a.distanceTo(b) || 1, f2 = Math.min(1, d / sl);
        const dx = (b.x - a.x) / sl, dz = (b.y - a.y) / sl;
        o.position.set(a.x + (b.x - a.x) * f2 - dz * L.off, L.y ?? 0, a.y + (b.y - a.y) * f2 + dx * L.off);
        o.rotation.set(0, Math.atan2(dx, dz), 0);
        o.scale.setScalar(Math.min(1, v.d / 6, (len - v.d) / 6) * 0.999 + 0.001);
        o.updateMatrix();
        m.setMatrixAt(i, o.matrix);
      }
      m.instanceMatrix.needsUpdate = true;
    });
  }
}

/** Boats going round a closed path on the water (bobbing a little). */
export function boats(c: City, path: [number, number][], y: number, list: { color: number; len: number; kind: 'tour' | 'sail' | 'speed' }[]) {
  const pts = path.map(([x, z]) => new THREE.Vector3(x, y, z));
  const curve = new THREE.CatmullRomCurve3(pts, true, 'centripetal');
  const len = curve.getLength();
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, side: THREE.DoubleSide });
  const ms = list.map((b, i) => {
    const g = new Geo();
    g.add(U.box, b.color, 0, 0.5, 0, b.len * 0.3, 1, b.len).add(U.box, 0xffffff, 0, 1.05, 0, b.len * 0.3 + 0.05, 0.12, b.len + 0.05);
    if (b.kind === 'tour') g.add(U.box, 0xf4f4f2, 0, 1.8, -b.len * 0.05, b.len * 0.26, 1.4, b.len * 0.7).add(U.box, 0x24324a, 0, 1.9, -b.len * 0.05, b.len * 0.265, 0.6, b.len * 0.66);
    if (b.kind === 'sail') g.add(U.cyl, 0xd8d8d8, 0, 4, 0, 0.08, 7, 0.08).add(new THREE.ConeGeometry(1, 1, 3), 0xffffff, 0, 4.2, -0.6, 0.15, 6, b.len * 0.35);
    if (b.kind === 'speed') g.add(U.box, 0x24324a, 0, 1.3, 0.2, b.len * 0.24, 0.4, b.len * 0.25);
    const m = new THREE.Mesh(g.build(), mat);
    m.castShadow = true;
    c.group.add(m);
    return { m, u: i / list.length, sp: (b.kind === 'speed' ? 9 : 3.5) / len };
  });
  const p = new THREE.Vector3(), q = new THREE.Vector3();
  c.updates.push((dt, t) => {
    for (const b of ms) {
      b.u = (b.u + b.sp * dt) % 1;
      curve.getPointAt(b.u, p); curve.getPointAt((b.u + 0.002) % 1, q);
      b.m.position.set(p.x, y + Math.sin(t * 1.4 + b.u * 40) * 0.12, p.z);
      b.m.rotation.set(Math.sin(t * 1.1 + b.u * 30) * 0.03, Math.atan2(q.x - p.x, q.z - p.z), Math.sin(t * 1.3 + b.u * 20) * 0.04);
    }
  });
}

/** A flock of birds circling over (cx, cz). */
export function birds(c: City, cx: number, cz: number, r: number, y: number, n = 14, color = 0x3a3f4b) {
  const g = new Geo().add(U.box, color, 0, 0, 0, 0.9, 0.05, 0.25).add(U.ball, shade(color, 0.05), 0, 0, 0.05, 0.12, 0.1, 0.25).build();
  const m = new THREE.InstancedMesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }), n);
  m.frustumCulled = false;
  c.group.add(m);
  const off = Array.from({ length: n }, () => [(c.rand() - 0.5) * 14, (c.rand() - 0.5) * 4, (c.rand() - 0.5) * 14]);
  const o = new THREE.Object3D(), ph = c.rand() * 6;
  c.updates.push((_, t) => {
    const a = t * 0.12 + ph, fx = cx + Math.cos(a) * r, fz = cz + Math.sin(a * 1.2) * r * 0.8;
    for (let k = 0; k < n; k++) {
      o.position.set(fx + off[k][0] + Math.sin(t + k) * 1.5, y + off[k][1] + Math.sin(t * 1.3 + k) * 1.2, fz + off[k][2]);
      o.rotation.set(0, -a, Math.sin(t * 10 + k) * 0.5);
      o.updateMatrix();
      m.setMatrixAt(k, o.matrix);
    }
    m.instanceMatrix.needsUpdate = true;
  });
}

/* ------------------------------------------------------------------ bunting, screens, falling bits */
/** Strings of little flags across the road (every `every` m between s0 and s1), waving in the wind. */
export function bunting(c: City, s0: number, s1: number, every: number, colors: number[], h = 7) {
  const tr = c.track, pos: number[] = [], col: number[] = [], tip: number[] = [], cc = new THREE.Color();
  for (let s = s0; s < s1; s += every) {
    const f = tr.frame(Math.round(s / tr.ds)), span = f.w + KERB + f.apron + 1.2;
    const A = side(f, -span), B = side(f, span);
    c.world.cyl(A.x, A.y, A.z, 0.1, h + 0.4, 0x6b7280); c.world.cyl(B.x, B.y, B.z, 0.1, h + 0.4, 0x6b7280);
    const n = Math.round((span * 2) / 0.9);
    for (let k = 0; k < n; k++) {
      const u0 = k / n, u1 = (k + 0.8) / n, sag = (u: number) => -Math.sin(u * Math.PI) * 1.2;
      const p0 = [A.x + (B.x - A.x) * u0, A.y + h + sag(u0), A.z + (B.z - A.z) * u0], p1 = [A.x + (B.x - A.x) * u1, A.y + h + sag(u1), A.z + (B.z - A.z) * u1];
      const pm = [(p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2 - 0.75, (p0[2] + p1[2]) / 2];
      cc.setHex(colors[k % colors.length]);
      pos.push(...p0, ...p1, ...pm);
      for (let j = 0; j < 3; j++) col.push(cc.r, cc.g, cc.b);
      tip.push(0, 0, 1);
    }
  }
  if (!pos.length) return;
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.setAttribute('aTip', new THREE.Float32BufferAttribute(tip, 1));
  g.computeVertexNormals();
  const uTime = { value: 0 };
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6, side: THREE.DoubleSide });
  mat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform float uTime; attribute float aTip;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\ntransformed.x += aTip * sin(uTime * 4.0 + position.x * 0.7 + position.z * 0.5) * 0.25;\ntransformed.z += aTip * cos(uTime * 3.3 + position.x * 0.5) * 0.25;');
  };
  mat.customProgramCacheKey = () => 'bunting';
  c.group.add(new THREE.Mesh(g, mat));
  c.updates.push((_, t) => { uTime.value = t; });
}

/** Screens whose picture is redrawn several times a second (`draw(ctx, t, w, h)`). */
export function screens(c: City, list: { x: number; y: number; z: number; w: number; h: number; ry: number; draw: (g: CanvasRenderingContext2D, t: number, w: number, h: number) => void; frame?: boolean }[], fps = 8) {
  const items = list.map((s) => {
    const cv = document.createElement('canvas');
    cv.width = 256; cv.height = Math.max(64, Math.round((256 * s.h) / s.w / 32) * 32);
    const g = cv.getContext('2d')!;
    const tex = new THREE.CanvasTexture(cv);
    tex.colorSpace = THREE.SRGBColorSpace;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(s.w, s.h), new THREE.MeshBasicMaterial({ map: tex, toneMapped: false }));
    m.position.set(s.x, s.y, s.z);
    m.rotation.y = s.ry;
    c.group.add(m);
    if (s.frame !== false) c.world.add(U.box, 0x1b1d24, s.x - Math.sin(s.ry) * 0.12, s.y, s.z - Math.cos(s.ry) * 0.12, s.w + 0.5, s.h + 0.5, 0.2, 0, s.ry, 0);
    s.draw(g, 0, cv.width, cv.height); tex.needsUpdate = true;
    return { s, g, tex, w: cv.width, h: cv.height };
  });
  let acc = 0, idx = 0;
  c.updates.push((dt, t) => {
    acc += dt;
    if (acc < 1 / (fps * Math.max(1, items.length / 3))) return;
    acc = 0;
    // a few screens per tick, round robin
    for (let k = 0; k < Math.min(3, items.length); k++) {
      const it = items[idx++ % items.length];
      it.s.draw(it.g, t, it.w, it.h);
      it.tex.needsUpdate = true;
    }
  });
}

/** Petals or confetti falling and drifting inside a box (they loop). */
export function fallers(c: City, box: { x: number; z: number; w: number; d: number; y0: number; h: number }, n: number, colors: number[], size = 0.35, speed = 1.2) {
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3), seed = new Float32Array(n), cc = new THREE.Color();
  for (let i = 0; i < n; i++) {
    pos.set([box.x + (c.rand() - 0.5) * box.w, c.rand() * box.h, box.z + (c.rand() - 0.5) * box.d], i * 3);
    cc.setHex(colors[i % colors.length]); col.set([cc.r, cc.g, cc.b], i * 3); seed[i] = c.rand() * 100;
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uH: { value: box.h }, uY0: { value: box.y0 }, uSize: { value: size * 320 }, uSp: { value: speed } },
    vertexShader: `uniform float uTime, uH, uY0, uSize, uSp; attribute float aSeed; attribute vec3 color; varying vec3 vC; varying float vA;
      void main(){
        vec3 p = position;
        p.y = uY0 + uH - mod(position.y + uTime * uSp * (0.7 + fract(aSeed) * 0.6), uH);
        p.x += sin(uTime * 1.3 + aSeed) * 1.6; p.z += cos(uTime * 1.1 + aSeed * 1.7) * 1.6;
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        // never a huge blob right in front of the camera
        gl_PointSize = min(uSize / -mv.z, 14.0) * smoothstep(1.2, 4.0, -mv.z);
        vC = color; vA = 0.5 + 0.5 * sin(uTime * 5.0 + aSeed * 3.0);
      }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main(){ vec2 q = gl_PointCoord - 0.5; q.x *= 0.55 + vA * 0.45; if (dot(q, q) > 0.25) discard; gl_FragColor = vec4(vC * (0.75 + vA * 0.4), 1.0); }`,
    transparent: false,
  });
  const pts = new THREE.Points(g, mat);
  pts.frustumCulled = false;
  c.group.add(pts);
  c.updates.push((_, t) => { mat.uniforms.uTime.value = t; });
}

/** People strolling back and forth along short paths (plazas, crossings, the beach). */
export function strollers(c: City, paths: [number, number, number, number][], n: number, y: (x: number, z: number) => number = () => 0) {
  if (!paths.length) return;
  const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.7 });
  const body = new THREE.InstancedMesh(personGeo(false), mat, n), head = new THREE.InstancedMesh(headGeo(), mat, n);
  const col = new THREE.Color();
  const ws = Array.from({ length: n }, (_, i) => {
    body.setColorAt(i, col.setHex(SHIRT[Math.floor(c.rand() * SHIRT.length)])); head.setColorAt(i, col.setHex(SKIN[Math.floor(c.rand() * SKIN.length)]));
    const p = paths[i % paths.length];
    return { p, u: c.rand(), sp: (1.1 + c.rand() * 0.6) / Math.max(1, Math.hypot(p[2] - p[0], p[3] - p[1])), off: (c.rand() - 0.5) * 3, ph: c.rand() * 6 };
  });
  body.frustumCulled = head.frustumCulled = false;
  c.group.add(body, head);
  const o = new THREE.Object3D();
  c.updates.push((dt, t) => {
    for (let i = 0; i < n; i++) {
      const w = ws[i], [x0, z0, x1, z1] = w.p;
      w.u += w.sp * dt;
      const k = w.u % 2, f = k < 1 ? k : 2 - k, dir = k < 1 ? 1 : -1;
      const L = Math.hypot(x1 - x0, z1 - z0) || 1, nx = -(z1 - z0) / L, nz = (x1 - x0) / L;
      const x = x0 + (x1 - x0) * f + nx * w.off, z = z0 + (z1 - z0) * f + nz * w.off;
      o.position.set(x, y(x, z) + Math.abs(Math.sin(t * 7 + w.ph)) * 0.06, z);
      o.rotation.set(0, Math.atan2((x1 - x0) * dir, (z1 - z0) * dir), 0);
      o.updateMatrix();
      body.setMatrixAt(i, o.matrix); head.setMatrixAt(i, o.matrix);
    }
    body.instanceMatrix.needsUpdate = head.instanceMatrix.needsUpdate = true;
  });
}

/** Glowing paper lanterns strung across the road between s0 and s1 (they sway). */
export function lanterns(c: City, s0: number, s1: number, every: number, colors: number[], h = 6.5) {
  const tr = c.track, m = new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false });
  const strings: { mesh: THREE.Mesh }[] = [];
  for (let s = s0; s < s1; s += every) {
    const f = tr.frame(Math.round(s / tr.ds)), span = f.w + KERB + f.apron + 1;
    const A = side(f, -span), B = side(f, span);
    c.world.cyl(A.x, A.y, A.z, 0.1, h + 0.4, 0x3a2a24); c.world.cyl(B.x, B.y, B.z, 0.1, h + 0.4, 0x3a2a24);
    const sg = new Geo(); sg.boost = 1.15;
    const n = Math.round(span * 2 / 2.2);
    for (let k = 1; k < n; k++) {
      const u = k / n, y = A.y + h - Math.sin(u * Math.PI) * 1.1 - 0.7;
      sg.add(U.ball, colors[k % colors.length], A.x + (B.x - A.x) * u, y, A.z + (B.z - A.z) * u, 0.34, 0.46, 0.34);
    }
    const mesh = new THREE.Mesh(sg.build(), m);
    c.group.add(mesh);
    strings.push({ mesh });
  }
  c.updates.push((_, t) => { strings.forEach((s, i) => { s.mesh.position.y = Math.sin(t * 1.6 + i) * 0.08; }); });
}

/** Natural ground: a vertex-coloured plane with a height function (hills, valleys, snow, sand). */
export function terrain(c: City, o: { cx: number; cz: number; size: number; n?: number; y: (x: number, z: number) => number; color: (x: number, z: number, y: number) => number; rough?: number }) {
  const n = o.n ?? 170, g = new THREE.PlaneGeometry(o.size, o.size, n, n);
  g.rotateX(-Math.PI / 2);
  g.translate(o.cx, 0, o.cz);
  const P = g.getAttribute('position'), col = new Float32Array(P.count * 3), cc = new THREE.Color();
  for (let i = 0; i < P.count; i++) {
    const x = P.getX(i), z = P.getZ(i), y = o.y(x, z);
    P.setY(i, y);
    const k = Math.sin(x * 0.13) * Math.cos(z * 0.11) * 0.5 + Math.sin(x * 0.037 + z * 0.041) * 0.5;
    cc.setHex(o.color(x, z, y)).offsetHSL(0, 0, k * 0.035);
    col.set([cc.r, cc.g, cc.b], i * 3);
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: o.rough ?? 0.95 }));
  m.receiveShadow = true;
  c.group.add(m);
  return m;
}

/** Fountain jets: drops flying in arcs from (x, y, z) — straight up, or towards (tx, tz). */
export function fountain(c: City, x: number, y: number, z: number, opts: { n?: number; h?: number; spread?: number; to?: [number, number]; color?: number; size?: number } = {}) {
  const n = opts.n ?? 220, h = opts.h ?? 8, sp = opts.spread ?? 0.6;
  const seed = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) seed.set([c.rand(), c.rand(), c.rand()], i * 3);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(n * 3), 3));
  g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 3));
  const to = opts.to ? new THREE.Vector2(opts.to[0] - x, opts.to[1] - z) : new THREE.Vector2();
  const col = new THREE.Color(opts.color ?? 0xdff6ff);
  const mat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uH: { value: h }, uSp: { value: sp }, uTo: { value: to }, uC: { value: col }, uSize: { value: (opts.size ?? 0.28) * 320 } },
    vertexShader: `uniform float uTime, uH, uSp, uSize; uniform vec2 uTo; attribute vec3 aSeed; varying float vA;
      void main(){
        float T = 2.0 * sqrt(2.0 * uH / 9.8);              // time in the air
        float t = mod(uTime + aSeed.x * T, T), k = t / T;
        float vy = sqrt(2.0 * 9.8 * uH) * (0.85 + aSeed.y * 0.15);
        vec2 dir = uTo + vec2(aSeed.y - 0.5, aSeed.z - 0.5) * uSp * 4.0;
        vec3 p = position + vec3(dir.x * k, vy * t - 4.9 * t * t, dir.y * k);
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_Position = projectionMatrix * mv;
        gl_PointSize = min(uSize * (0.6 + aSeed.z * 0.8) / -mv.z, 24.0) * smoothstep(1.0, 3.5, -mv.z);
        vA = 1.0 - k * 0.6;
      }`,
    fragmentShader: `uniform vec3 uC; varying float vA; void main(){ vec2 q = gl_PointCoord - 0.5; float d = dot(q, q); if (d > 0.25) discard; gl_FragColor = vec4(uC * (1.1 - d * 2.0), vA * (1.0 - d * 3.0)); }`,
    transparent: true, depthWrite: false,
  });
  const pts = new THREE.Points(g, mat);
  pts.position.set(x, y, z);
  pts.frustumCulled = false;
  c.group.add(pts);
  c.updates.push((_, t) => { mat.uniforms.uTime.value = t; });
}
