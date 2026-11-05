/* English Racers — "Splash Loops" (≈1 km + six 360° loops), drawn from the student's doodle: two big
   loops on the top side, four small ones in a row on the bottom side, and every landing splashes
   into shallow water (arches of water jets over the road). It runs round a water park: a lagoon
   with an island, a tower of twisting slides with riders, waterfalls, fountains, inflatable rings,
   swimmers, jet skis, palm trees, umbrellas and a packed grandstand. */
import * as THREE from 'three';
import { U } from '@/features/run/gfx';
import { makeOcean, oceanGeometry } from '@/features/run/ocean';
import { KERB, type CP, type Track, type TrackDef } from '../track';
import { side, type TrackStyle } from '../trackMesh';
import { billboards, cloudRing, startGantry, type Scenery } from '../scenery';
import { birds, boats, bunting, city, crowd, done, fountain, lamps, roadsideSpots, strollers, terrain, tree, walkers } from './city';

/** The doodle, traced (pixels of the 2× drawing; the start is on the top straight). */
const PX: [number, number, number?, number?][] = [
  [760, 382], [900, 365], [985, 325], [1040, 262, 2], [1091, 224, 5], [1143, 216, 6], [1200, 236, 5], [1260, 295, 2], [1335, 324], [1400, 316, 0, 8], [1470, 306, 0, 8], [1540, 308], [1615, 356],
  [1645, 430], [1652, 520], [1612, 589], [1520, 628], [1380, 640], [1250, 645, 0, 8], [1150, 662], [1080, 680, 0, 8], [980, 705], [880, 716, 0, 8], [780, 728], [680, 736, 0, 8], [560, 746],
  [420, 752], [300, 728], [200, 676], [125, 613], [105, 559], [111, 514], [134, 476], [178, 446], [270, 434], [380, 402], [505, 385, 0, 8], [620, 384],
];
const SC = 0.28;

/** Loops: control point, offset, radius and tilt (rad, + leans the top over to the right). */
const LOOPS: [number, number, number, number][] = [[9, 10, 11, 0.34], [18, 0, 7, 0], [20, 0, 7, 0.3], [22, 0, 7, 0], [24, 0, 7, -0.3], [35, 14, 11, -0.34]];

export const SPLASH: TrackDef = {
  id: 'splash', name: 'Splash Loops', laps: 2, waterY: -2.5,
  cps: PX.map(([x, z, y, w]) => ({ x: (x - 850) * SC, z: (z - 480) * SC, ...(y ? { y } : {}), ...(w ? { w, apron: 2 } : {}) } as CP)),
  features: [
    ...LOOPS.map(([at, off, r, tilt]) => ({ kind: 'loop' as const, at, off, r, tilt })),
    ...LOOPS.map(([at, off, r]) => ({ kind: 'splash' as const, at, off: off + (r > 8 ? 3 : 2), len: r > 8 ? 16 : 12 })),
    { kind: 'boost', at: 9, off: -4, d: -3.9 },
    { kind: 'boost', at: 35, off: 2, d: -3.9 },
    { kind: 'boost', at: 17, off: -10, d: -3.9 },
    { kind: 'ramp', at: 5, off: -6, len: 9, h: 1.2 },
  ],
  items: [{ at: 1, off: 10 }, { at: 13, off: 6 }, { at: 27, off: 10 }, { at: 32, off: 6 }],
  coins: [
    { at: 0, off: 18, d: 2.5, n: 5 },
    { at: 7, off: 4, d: -1.5, n: 5, dd: 0.6 },
    { at: 14, off: 10, d: 0, n: 6 },
    { at: 26, off: 6, d: -2.5, n: 5, dd: 1 },
    { at: 30, off: 4, d: 0, n: 5 },
  ],
};

export const SPLASH_STYLE: TrackStyle = { road: 'asphalt', kerb: [0x1e90ff, 0xf4f4f2], apron: [0x7dd36a, 0x6fc75c], wall: 'barrier', edge: 'bank', bank: 0x5fae4a, gapFace: 0xb9b2a3, baseY: -0.06 };

export function buildSplash(track: Track): Scenery {
  const c = city(track, 2026);
  const { world, glossy, group, rand } = c;
  const F = track.frames;

  /* ---------------- the lagoon inside the circuit ---------------- */
  const poly: [number, number][] = [];
  for (let i = 0; i < F.length; i += 4) { const f = F[i], P = side(f, f.w + KERB + f.apron + 9); poly.push([P.x, P.z]); }
  const inside = (x: number, z: number) => { let k = false; for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) { const [xi, zi] = poly[i], [xj, zj] = poly[j]; if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) k = !k; } return k; };
  const edgeDist = (x: number, z: number) => { let m = Infinity; for (let i = 0; i < poly.length; i += 2) m = Math.min(m, Math.hypot(x - poly[i][0], z - poly[i][1])); return m; };
  terrain(c, {
    cx: 0, cz: 20, size: 900,
    y: (x, z) => (inside(x, z) ? -0.4 - Math.min(2.6, edgeDist(x, z) * 0.18) : -0.08 + Math.max(0, Math.hypot(x, z * 1.6) - 260) * 0.08),
    color: (x, z, y) => (y < -0.3 ? 0xd9c79a : inside(x, z) || edgeDist(x, z) < 5 ? 0xeedcae : 0x6cc35a),
  });
  let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity;
  for (const [x, z] of poly) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); z0 = Math.min(z0, z); z1 = Math.max(z1, z); }
  const lag = makeOcean({ deep: 0x0f8fc0, shallow: 0x47e3e0, amp: 0.1, scale: 0.5, dir: [1, 0.4], opacity: 0.9 });
  const lg = new THREE.Mesh(oceanGeometry((x0 + x1) / 2, (z0 + z1) / 2, x1 - x0 + 10, z1 - z0 + 10, 140, 60, (x, z) => (inside(x, z) ? Math.min(3, edgeDist(x, z) * 0.25) : 0)), lag.material);
  lg.position.y = -0.55;
  group.add(lg);
  for (let i = 0; i < poly.length; i++) { const [ax, az] = poly[i], [bx, bz] = poly[(i + 1) % poly.length]; world.add(U.box, 0xf4f6f8, (ax + bx) / 2, -0.12, (az + bz) / 2, 0.8, 0.3, Math.hypot(bx - ax, bz - az) + 0.3, 0, Math.atan2(bx - ax, bz - az), 0); }

  /* ---------------- the island: rocks, waterfall, palms and the slide tower ---------------- */
  const ix = -40, iz = 22;
  world.add(U.blob, 0x9c8a6e, ix, -1, iz, 22, 7, 14, 0.2, 0.4, 0);
  world.add(U.blob, 0xa89478, ix + 8, 4, iz - 2, 9, 9, 7, 0.5, 0.1, 0);
  for (let k = 0; k < 7; k++) tree(c, ix - 16 + rand() * 30, iz - 8 + rand() * 14, 'palm', 1.1, 3);
  {
    // waterfall: a scrolling sheet from the rock into the lagoon, with mist
    const cv = document.createElement('canvas'); cv.width = 64; cv.height = 256;
    const g = cv.getContext('2d')!;
    for (let y = 0; y < 256; y++) for (let x = 0; x < 64; x += 2) { const v = 180 + Math.random() * 75; g.fillStyle = `rgba(${v},${v + 10},255,${0.5 + Math.random() * 0.4})`; g.fillRect(x, y, 2, 1 + Math.random() * 6); }
    const tex = new THREE.CanvasTexture(cv); tex.wrapS = tex.wrapT = THREE.RepeatWrapping; tex.colorSpace = THREE.SRGBColorSpace;
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(6, 11), new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.85, side: THREE.DoubleSide, depthWrite: false }));
    fall.position.set(ix + 8, 4.5, iz + 5.2);
    group.add(fall);
    c.updates.push((dt) => { tex.offset.y += dt * 1.6; });
    fountain(c, ix + 8, -0.4, iz + 6.5, { n: 160, h: 1.6, spread: 1.4, size: 0.5 });
  }
  {
    // slide tower and three twisting tubes with riders
    const tx = ix - 10, tz = iz - 2, H = 16;
    for (const [dx, dz] of [[-2, -2], [2, -2], [-2, 2], [2, 2]]) world.add(U.box, 0xf4f4f2, tx + dx, H / 2, tz + dz, 0.5, H, 0.5);
    world.add(U.box, 0x1e90ff, tx, H, tz, 6, 0.5, 6);
    world.add(new THREE.ConeGeometry(1, 1, 4), 0xff3b30, tx, H + 3, tz, 4.8, 3, 4.8, 0, Math.PI / 4, 0);
    const colors = [0xffc61a, 0xff3b30, 0x2fd27a];
    const riders: { curve: THREE.CatmullRomCurve3; m: THREE.Mesh; u: number; sp: number }[] = [];
    colors.forEach((col, k) => {
      const pts: THREE.Vector3[] = [];
      const a0 = (k / 3) * Math.PI * 2;
      for (let j = 0; j <= 24; j++) { const u = j / 24, a = a0 + u * Math.PI * 3.2, r = 4 + u * 10; pts.push(new THREE.Vector3(tx + Math.cos(a) * r, H - u * (H + 0.2), tz + Math.sin(a) * r * 0.8)); }
      const curve = new THREE.CatmullRomCurve3(pts);
      const tube = new THREE.Mesh(new THREE.TubeGeometry(curve, 120, 0.9, 10, false), new THREE.MeshStandardMaterial({ color: col, roughness: 0.25, metalness: 0.05, side: THREE.DoubleSide, transparent: true, opacity: 0.92 }));
      tube.castShadow = true;
      group.add(tube);
      for (let r = 0; r < 2; r++) { const m = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), new THREE.MeshStandardMaterial({ color: [0xf1c7a5, 0x8a5636, 0xd9a47e][(k + r) % 3], roughness: 0.6 })); group.add(m); riders.push({ curve, m, u: r * 0.5, sp: 0.18 + rand() * 0.06 }); }
    });
    const p = new THREE.Vector3();
    c.updates.push((dt) => { for (const r of riders) { r.u = (((r.u + r.sp * dt) % 1) + 1) % 1; r.curve.getPointAt(r.u, p); r.m.position.set(p.x, p.y + 0.3, p.z); } });
  }

  /* ---------------- lagoon life: rings, swimmers, jet skis, fountains ---------------- */
  {
    const spots: { x: number; z: number; ph: number }[] = [];
    for (let k = 0; k < 120 && spots.length < 46; k++) { const x = x0 + rand() * (x1 - x0), z = z0 + rand() * (z1 - z0); if (inside(x, z) && edgeDist(x, z) > 6 && Math.hypot(x - ix, (z - iz) * 1.4) > 26) spots.push({ x, z, ph: rand() * 6 }); }
    const ringG = new THREE.TorusGeometry(0.75, 0.3, 8, 18).rotateX(Math.PI / 2);
    const rings = new THREE.InstancedMesh(ringG, new THREE.MeshStandardMaterial({ roughness: 0.35 }), spots.length);
    const heads = new THREE.InstancedMesh(new THREE.SphereGeometry(0.3, 10, 8), new THREE.MeshStandardMaterial({ roughness: 0.6 }), spots.length);
    const cc = new THREE.Color();
    spots.forEach((_, i) => { rings.setColorAt(i, cc.setHex([0xff3b30, 0xffc61a, 0x2fd27a, 0x1e90ff, 0xff2bd6, 0xff9f0a][i % 6])); heads.setColorAt(i, cc.setHex([0xf1c7a5, 0xd9a47e, 0x8a5636, 0x5e3a24][i % 4])); });
    group.add(rings, heads);
    const o = new THREE.Object3D();
    c.updates.push((_, t) => {
      spots.forEach((s, i) => {
        const y = -0.5 + Math.sin(t * 1.6 + s.ph) * 0.12, dx = Math.sin(t * 0.2 + s.ph) * 2;
        o.position.set(s.x + dx, y, s.z); o.rotation.set(Math.sin(t + s.ph) * 0.08, 0, Math.cos(t * 1.2 + s.ph) * 0.08); o.updateMatrix(); rings.setMatrixAt(i, o.matrix);
        o.position.set(s.x + dx, y + 0.45, s.z); o.updateMatrix(); heads.setMatrixAt(i, o.matrix);
      });
      rings.instanceMatrix.needsUpdate = heads.instanceMatrix.needsUpdate = true;
    });
    const loopPath: [number, number][] = [];
    for (let i = 0; i < F.length; i += 24) { const f = F[i], P = side(f, f.w + KERB + f.apron + 24); if (inside(P.x, P.z)) loopPath.push([P.x, P.z]); }
    if (loopPath.length > 6) boats(c, loopPath, -0.6, [{ color: 0xff3b30, len: 3, kind: 'speed' }, { color: 0xffc61a, len: 3, kind: 'speed' }, { color: 0x1e90ff, len: 3, kind: 'speed' }]);
    for (const [x, z] of [[40, 25], [-110, 35], [120, 18]]) if (inside(x, z)) fountain(c, x, -0.5, z, { n: 260, h: 9, spread: 0.35, size: 0.32 });
  }

  /* ---------------- every loop: arches of water over the splash zone, fountains by the towers ---------------- */
  for (const w of track.splashes) {
    for (const s of [w.s0 + 2, (w.s0 + w.s1) / 2, w.s1 - 2]) {
      const f = track.frame(Math.round(s / track.ds)), span = f.w + KERB + f.apron + 0.6;
      for (const sg of [-1, 1]) { const A = side(f, sg * span), B = side(f, -sg * span); fountain(c, A.x, A.y + 0.4, A.z, { n: 70, h: 4.2, spread: 0.2, to: [B.x, B.z], size: 0.3 }); glossy.add(U.cyl, 0x9aa3ad, A.x, A.y + 0.2, A.z, 0.25, 0.5, 0.25); }
    }
  }
  for (const lp of track.loops) {
    const f = track.frame(Math.round(lp.s / track.ds)), out = f.w + KERB + f.apron + 3;
    for (const sg of [-1, 1]) { const P = side(f, sg * out); fountain(c, P.x, P.y, P.z, { n: 120, h: lp.r * 1.4, spread: 0.25, size: 0.34 }); world.add(U.cyl, 0x3a4152, P.x, P.y, P.z, 1.2, 0.4, 1.2); }
  }

  /* ---------------- beach, palms, umbrellas, people, grandstand ---------------- */
  const UMB = [0xff3b30, 0xffd60a, 0x30d158, 0x0a84ff, 0xff9f0a, 0xbf5af2];
  for (let i = 0; i < F.length; i += 7) {
    const f = F[i];
    for (const sg of [-1, 1]) {
      const P = side(f, sg * (f.w + KERB + f.apron + 4 + rand() * 3));
      if (!c.clear(P.x, P.z, 0.5) || inside(P.x, P.z)) continue;
      const r = rand();
      if (r < 0.35) tree(c, P.x, P.z, 'palm', 1);
      else if (r < 0.6) { world.cyl(P.x, -0.1, P.z, 0.06, 2.4, 0xf4f4f2); world.add(new THREE.ConeGeometry(1, 1, 8), UMB[i % UMB.length], P.x, 2.4, P.z, 1.5, 0.7, 1.5); world.add(U.box, UMB[(i + 2) % UMB.length], P.x + 1.2, 0.05, P.z, 0.8, 0.1, 1.8); }
    }
  }
  const sands: [number, number, number, number][] = [];
  for (let i = 0; i < poly.length; i += 6) { const [ax, az] = poly[i], [bx, bz] = poly[(i + 6) % poly.length]; sands.push([ax, az, bx, bz]); }
  strollers(c, sands, 70);
  crowd(c, roadsideSpots(c, 4, track.cpS[2], { sides: [-1], rows: 4 }));
  crowd(c, roadsideSpots(c, track.cpS[17], track.cpS[25], { sides: [-1], rows: 2, every: 1.6 }));
  bunting(c, 6, track.cpS[2], 16, [0x1e90ff, 0xffc61a, 0xff3b30, 0x2fd27a]);
  walkers(c, 50, (f) => !track.splashAt(f.s));
  lamps(c, 30, 0xf4f4f2, 0xfff2c0);

  /* ---------------- start, signs, sky ---------------- */
  const lampsM = startGantry(track, group, glossy, 'SPLASH LOOPS', ['#1e90ff', '#00d2ff'], 0x1b1d24, 0xffc61a);
  billboards(track, group, world, [
    [8, ['LOOP AHEAD!'], ['#ff2bd6', '#1e90ff']],
    [16, ['FOUR LOOPS', 'IN A ROW'], ['#ff9f0a', '#ff3b30']],
    [29, ['GET WET!'], ['#00d2ff', '#1e90ff']],
    [33, ['360° LOOP'], ['#2fd27a', '#1e90ff']],
  ], c.clear);
  birds(c, 0, 20, 140, 35, 16, 0xf4f4f2);
  cloudRing(group, 0, 20, 16, rand, { tint: 0xffffff, glow: 0.65, y0: 130 });

  return done(c, lampsM, { waterY: -2.5, oceans: [lag.uniforms] });
}
