/* English Racers — pieces shared by the tracks' scenery: materials, painted signs, ripple normals,
   the start gantry with its countdown lamps, billboards facing the road, clouds, and the final
   merge-by-material step. A track's builder returns a Scenery: its group, the countdown lamps, the
   water surfaces to animate, optional moving hazards (in road coordinates) and an update hook. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Geo, U, cloud } from '@/features/run/gfx';
import { KERB, type Track } from './track';
import { side } from './trackMesh';

export const MATS = () => ({
  world: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0 }),
  glossy: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.05 }),
  glass: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.2, envMapIntensity: 1.4 }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
});

/** Something that moves across the road and spins out whoever touches it while it is `on`. */
export interface Hazard { s: number; d: number; hs: number; hd: number; on: boolean; kind: 'crab' | 'load' | 'laser' }

export interface Scenery {
  group: THREE.Group;
  /** The three countdown lamps on the start gantry. */
  lamps: THREE.MeshStandardMaterial[];
  /** Water surfaces whose ripples drift (normal map offset) or whose waves run (uTime). */
  waters: THREE.Mesh[];
  oceans?: { uTime: { value: number } }[];
  waterY: number;
  hazards?: Hazard[];
  update?(dt: number, t: number): void;
  dispose(): void;
}

export function textTex(lines: string[], bg: [string, string], fg = '#ffffff', w = 1024, h = 256) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16);
  c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowOffsetY = 6;
  const size = lines.length > 1 ? h * 0.3 : h * 0.5;
  c.font = `italic 900 ${size}px Inter, system-ui, sans-serif`;
  lines.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.1, w - 60));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Tileable ripple normals (sum of waves with whole periods across the tile). */
export function rippleTex() {
  const N = 128, cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const c = cv.getContext('2d')!, img = c.createImageData(N, N);
  const H = (x: number, y: number) => {
    const u = (x / N) * Math.PI * 2, v = (y / N) * Math.PI * 2;
    return Math.sin(u * 3 + v * 2) * 0.5 + Math.sin(u * -2 + v * 5 + 1.3) * 0.35 + Math.sin(u * 7 - v * 3 + 0.7) * 0.18 + Math.sin(u * 5 + v * 9 + 2.1) * 0.1;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 6, dy = (H(x, y + 1) - H(x, y - 1)) * 6;
    const l = Math.hypot(dx, dy, 1), o = (y * N + x) * 4;
    img.data[o] = (-dx / l * 0.5 + 0.5) * 255; img.data[o + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

/** Start gantry over frame 0 with a title sign on both faces and the three countdown lamps. */
export function startGantry(track: Track, group: THREE.Group, glossy: Geo, title: string, bg: [string, string], frame = 0x2b2f3a, accent = 0xffc61a) {
  const lamps: THREE.MeshStandardMaterial[] = [];
  const f = track.frames[0], ry = f.yaw;
  const span = f.w + KERB + f.apron + 1.4;
  const L = side(f, -span), R = side(f, span), C = side(f, 0);
  for (const P of [L, R]) {
    glossy.add(U.box, frame, P.x, P.y + 3.8, P.z, 0.8, 7.6, 0.8, 0, ry, 0);
    glossy.add(U.box, accent, P.x, P.y + 0.2, P.z, 1.2, 0.4, 1.2, 0, ry, 0);
  }
  glossy.add(U.box, frame, C.x, C.y + 7.6, C.z, span * 2 + 0.8, 1.6, 0.9, 0, ry, 0);
  const sign = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.2), new THREE.MeshStandardMaterial({ map: textTex([title], bg), roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.12 }));
  sign.material.emissiveMap = sign.material.map;
  sign.position.set(C.x - f.t.x * 0.47, C.y + 8.5, C.z - f.t.z * 0.47);
  sign.rotation.y = ry + Math.PI;
  group.add(sign);
  const back = sign.clone(); back.position.set(C.x + f.t.x * 0.47, C.y + 8.5, C.z + f.t.z * 0.47); back.rotation.y = ry; group.add(back);
  for (let k = 0; k < 3; k++) {
    const m = new THREE.MeshStandardMaterial({ color: 0x331111, emissive: 0x000000, roughness: 0.3 });
    lamps.push(m);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), m);
    const d = (k - 1) * 1.5;
    lamp.position.set(C.x + f.r.x * d - f.t.x * 0.55, C.y + 6.5, C.z + f.r.z * d - f.t.z * 0.55);
    group.add(lamp);
    glossy.add(U.box, 0x1b1d24, lamp.position.x + f.t.x * 0.2, lamp.position.y, lamp.position.z + f.t.z * 0.2, 1.1, 1.1, 0.5, 0, ry, 0);
  }
  return lamps;
}

/** Billboards on the outside of the bends at the given control points. */
export function billboards(track: Track, group: THREE.Group, world: Geo, list: [number, string[], [string, string]][], clear: (x: number, z: number, r: number) => boolean, pole = 0x8a919c) {
  for (const [cp, text, bg] of list) {
    const f = track.frame(Math.round(track.cpS[cp % track.cpS.length] / track.ds));
    const sg = f.curv > 0 ? 1 : -1;
    const P = side(f, sg * (f.w + KERB + f.apron + 3));
    if (!clear(P.x, P.z, -2)) continue;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshStandardMaterial({ map: textTex(text, bg), roughness: 0.55 }));
    m.position.set(P.x, P.y + 4.6, P.z);
    const ry = Math.atan2(-f.r.x * sg * 10 - f.t.x * 6, -f.r.z * sg * 10 - f.t.z * 6);
    m.rotation.set(0, ry, 0);
    m.translateZ(0.13);
    group.add(m);
    world.add(U.box, 0x2b2f3a, P.x, P.y + 4.6, P.z, 12.4, 3.4, 0.2, 0, ry, 0);
    for (const k of [-1, 1]) {
      const dx = Math.cos(ry) * 4.5 * k, dz = -Math.sin(ry) * 4.5 * k;
      world.cyl(P.x + dx, P.y - 6, P.z + dz, 0.18, 9.0, pole);
    }
  }
}

/** A ring of soft clouds around (cx, cz). */
export function cloudRing(group: THREE.Group, cx: number, cz: number, n: number, rand: () => number, opts: { r0?: number; r1?: number; y0?: number; tint?: number; glow?: number } = {}) {
  for (let k = 0; k < n; k++) {
    const c = cloud() as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
    c.material.dispose();
    c.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: opts.tint ?? 0xdfe9f5, emissiveIntensity: opts.glow ?? 0.55, fog: false });
    const a = rand() * Math.PI * 2, r = (opts.r0 ?? 220) + rand() * ((opts.r1 ?? 700) - (opts.r0 ?? 220));
    c.position.set(cx + Math.cos(a) * r, (opts.y0 ?? 110) + rand() * 80, cz + Math.sin(a) * r);
    c.scale.setScalar(2.2 + rand() * 2.4);
    c.rotation.y = rand() * 6;
    group.add(c);
  }
}

/** Merge each geometry set into one mesh per material and add them to the group. */
export function mergeInto(group: THREE.Group, M: ReturnType<typeof MATS>, sets: { world?: Geo; parts?: THREE.BufferGeometry[]; glossy?: Geo; glass?: Geo; glow?: Geo }) {
  const add = (geo: THREE.BufferGeometry | null, mat: THREE.Material, shadow = true) => {
    if (!geo) return;
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadow; m.receiveShadow = true;
    group.add(m);
  };
  const parts = sets.parts ?? [];
  if (sets.world?.parts.length) parts.push(sets.world.build());
  if (parts.length) add(mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false), M.world);
  if (sets.glossy?.parts.length) add(sets.glossy.build(), M.glossy);
  if (sets.glass?.parts.length) add(sets.glass.build(), M.glass, false);
  if (sets.glow?.parts.length) add(sets.glow.build(), M.glow, false);
}

export function disposeGroup(group: THREE.Group) {
  group.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    m.geometry.dispose();
    const mats = Array.isArray(m.material) ? m.material : [m.material];
    for (const mm of mats as THREE.MeshStandardMaterial[]) { mm.map?.dispose(); mm.normalMap?.dispose(); mm.emissiveMap?.dispose(); mm.dispose(); }
  });
}
