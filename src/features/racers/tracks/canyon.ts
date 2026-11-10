/* English Racers — "Canyon Run" (≈1.3 km), drawn from the student's doodle (start line on the top
   straight): a T-shaped course carved into a red-rock desert — a long top straight, a hairpin at
   the far end, two fingers that dive down into the canyon and climb back out, and three humps
   on the way back. Around it: layered canyon walls and mesas, hoodoos, cacti, tumbleweeds
   rolling across, a steam train on a trestle high over the road, hot-air balloons, eagles and a
   dust devil. */
import * as THREE from 'three';
import { Geo, U } from '@/features/run/gfx';
import { KERB, withSpiral, type CP, type Track, type TrackDef } from '../track';
import { side, type TrackStyle } from '../trackMesh';
import { billboards, cloudRing, startGantry, type Scenery } from '../scenery';
import { birds, bunting, city, crowd, done, lamps, roadsideSpots, terrain, walkers } from './city';

const PTS: [number, number][] = [[125,-133.4],[141.9,-135.3],[158.7,-137.4],[175.6,-139.4],[193.5,-141.2],[210.2,-141.9],[223.2,-138],[232.8,-131],[238.7,-122.1],[240.9,-113.5],[240.2,-104.5],[236.2,-95.2],[227.5,-85.7],[214.7,-79.3],[198.7,-73.6],[186.1,-63.8],[177.8,-50.2],[173.9,-34.7],[172.6,-17.8],[173.1,-0.8],[174.4,17.1],[175.9,34.1],[177.7,51],[179.5,67.9],[181.3,84.8],[180.6,100.9],[174.8,113.2],[167.1,121.2],[159.1,125.1],[150.6,126.3],[141.4,124.4],[132.8,119.1],[125.1,109.9],[120.2,95.5],[118.7,77.7],[116.4,61.3],[110.9,49.4],[103.5,41.7],[97.7,38.1],[92.6,36.2],[87.9,35.3],[83.2,35.2],[78.4,35.7],[71.9,37.5],[64,41.3],[57.3,43.4],[51.7,44.1],[46.7,43.9],[42.4,43],[38.2,41.4],[33.4,38.5],[28.3,33.7],[22.8,24.7],[19.7,11.7],[19.2,-5.9],[13.9,-18.7],[7.5,-25.7],[1,-29.7],[-6.3,-31.6],[-14.1,-31.7],[-22.8,-29.3],[-35.2,-21.4],[-49.2,-13.8],[-65.6,-9.4],[-82.2,-6],[-98.6,-1.3],[-112.5,6.5],[-123.1,18.4],[-130.7,32.5],[-139.6,47],[-150.7,58.4],[-165.7,66.3],[-181.4,69.1],[-198.3,67.5],[-213.3,62.1],[-227.7,53.2],[-239.7,41.2],[-249,27],[-252.8,13],[-251.6,0.4],[-248.3,-7.5],[-243.3,-13.8],[-238.6,-17.5],[-234.3,-19.8],[-229.7,-21.5],[-223.3,-22.6],[-215.5,-22.5],[-208.6,-21.7],[-201.1,-22.5],[-194.2,-24.8],[-187.4,-29.1],[-181.3,-35.8],[-175.9,-48.8],[-175.4,-65.2],[-171.2,-79.5],[-165,-87.8],[-158.7,-92.3],[-152.2,-94.8],[-144.3,-95.9],[-135.9,-95],[-126.3,-91.8],[-117.6,-90.5],[-110,-91.5],[-102.2,-95.1],[-95,-101.6],[-88,-115.1],[-80.6,-129.1],[-70.1,-139.5],[-56.5,-142.1],[-42.4,-137.2],[-29.3,-128.1],[-15,-121.1],[0.8,-119.2],[16.7,-121.4],[33.4,-124.4],[51.2,-127],[68.1,-128.7],[85.1,-130.1],[102,-131.4],[119,-132.9]];
/** Road height: the fingers go down into the canyon, the humps rise a little. */
/** The layout was scaled up by SC (and its tight curves smoothed open) after drawing; heights keep the drawing's coordinates. */
const SC = 1.43;
const roadH = (x: number, z: number) => -7 * THREE.MathUtils.smoothstep(z, -45, 70) + 3.5 * Math.exp(-((x + 125) ** 2 + (z + 35) ** 2) / 2600);

export const CANYON: TrackDef = withSpiral({
  id: 'canyon', name: 'Canyon Run', laps: 2, waterY: -30,
  cps: PTS.map(([x, z]) => ({ x, z, y: roadH(x / SC, z / SC), w: 6.5, apron: 3 } as CP)),
  features: [
    { kind: 'boost', at: 4, off: 0, d: 0 },
    { kind: 'boost', at: 30, off: 0, d: -2 },
    { kind: 'ramp', at: 62, off: 0, len: 9, h: 1.3 },
    { kind: 'boost', at: 72, off: 0, d: 2 },
    { kind: 'ramp', at: 100, off: 0, len: 9, h: 1.2 },
  ],
  items: [{ at: 10, off: 0 }, { at: 46, off: 0 }, { at: 80, off: 0 }, { at: 108, off: 0 }],
  coins: [
    { at: 2, off: 0, d: -2, n: 5 }, { at: 24, off: 0, d: 2, n: 5 }, { at: 40, off: 0, d: 0, n: 5 }, { at: 56, off: 0, d: -1.5, n: 5, dd: 0.6 },
    { at: 68, off: 0, d: 1.5, n: 5 }, { at: 88, off: 0, d: 0, n: 5 }, { at: 114, off: 0, d: 2, n: 5 },
  ],
}, 113, { side: -1, drop: 13 });

export const CANYON_STYLE: TrackStyle = { road: 'asphalt', kerb: [0xff7a1a, 0xf4f4f2], apron: [0xe2b27c, 0xd9a670], wall: 'rail', edge: 'bank', bank: 0xc8643c, gapFace: 0xb5502e, baseY: -24 };

const STRATA = [0xc8643c, 0xd9844e, 0xb5502e, 0xe6a35f, 0xcf7448, 0xa94a2c];

export function buildCanyon(track: Track): Scenery {
  const c = city(track, 1880);
  const { world, glossy, glow, group, rand } = c;
  const F = track.frames, sparse = F.filter((_, i) => i % 3 === 0);
  // (under a bridge the ground follows the lower road)
  const nearest = (x: number, z: number) => {
    let best = Infinity, f0 = sparse[0], low: typeof f0 | null = null;
    for (const f of sparse) { const d = Math.hypot(x - f.p.x, z - f.p.z); if (d < best) { best = d; f0 = f; } if (d < f.w + KERB + f.apron + 5 && (!low || f.p.y < low.p.y)) low = f; }
    const g = low ?? f0;
    return { d: best - (f0.w + KERB + f0.apron), y: g.p.y - Math.abs(g.bank) * (g.w + KERB) - 0.35 };
  };
  const noise = (x: number, z: number) => Math.sin(x * 0.045) * Math.cos(z * 0.052) * 0.5 + Math.sin(x * 0.013 + z * 0.017) * 0.5;

  /* ---------------- the canyon: walls rise from the road to the mesa tops ---------------- */
  const ground = (x: number, z: number) => {
    const n = nearest(x, z), plateau = 24 + noise(x, z) * 8;
    const wall = THREE.MathUtils.smoothstep(n.d, 7, 24);
    return n.y - 0.25 + (plateau - n.y) * wall * (0.85 + 0.15 * Math.sin(x * 0.3 + z * 0.2));
  };
  terrain(c, {
    cx: track.box.cx, cz: track.box.cz, size: Math.max(1000, track.box.span + 300), n: 215, y: ground,
    color: (x, z, y) => { const n = nearest(x, z); if (n.d < 4) return 0xe0b07a; if (y > 23 + noise(x, z) * 8 - 0.5) return 0xd29a5c; return STRATA[Math.abs(Math.floor(y / 2.6)) % STRATA.length]; },
  });
  // hoodoos and mesas far away
  for (let k = 0; k < 26; k++) {
    const a = rand() * Math.PI * 2, r = track.box.r + 20 + rand() * 180, x = track.box.cx + Math.cos(a) * r, z = track.box.cz + Math.sin(a) * r, h = 40 + rand() * 50, w = 25 + rand() * 40;
    world.add(U.cyl, STRATA[k % STRATA.length], x, h / 2, z, w, h, w * (0.7 + rand() * 0.5));
    world.add(U.cyl, 0xd29a5c, x, h + 0.5, z, w * 1.02, 1, w * (0.72 + rand() * 0.5));
  }
  for (let k = 0; k < 40; k++) {
    const x = (rand() - 0.5) * 420, z = (rand() - 0.5) * 300, n = nearest(x, z);
    if (n.d < 10 || n.d > 26) continue;
    const y0 = ground(x, z), hh = 6 + rand() * 8;
    for (let j = 0; j < 4; j++) world.add(U.blob, STRATA[(k + j) % STRATA.length], x, y0 + (j + 0.5) * hh / 4, z, 1.6 - j * 0.2, hh / 7, 1.6 - j * 0.2);
    world.add(U.blob, 0x8a4a2c, x, y0 + hh + 0.4, z, 2.2, 0.8, 2.2);
  }
  // a striped rock tower in the middle of the spiral
  for (const sp of track.def.spirals ?? []) {
    const gy = ground(sp.x, sp.z), h = sp.top - gy + 14;
    for (let j = 0; j < 7; j++) world.add(U.cyl, STRATA[j % STRATA.length], sp.x, gy + (j + 0.5) * h / 7, sp.z, 12 - j * 0.7, h / 7 + 0.05, 11 - j * 0.6);
    world.add(U.cyl, 0xd29a5c, sp.x, gy + h + 0.4, sp.z, 8.4, 0.8, 7.6);
  }
  // cacti on the canyon floor and the mesas
  const cactus = (x: number, z: number, s: number) => {
    const y = ground(x, z), h = (4 + rand() * 3) * s, g = 0x3f8a46;
    world.add(U.cyl, g, x, y + h / 2, z, 0.45 * s, h, 0.45 * s);
    world.add(U.ball, g, x, y + h, z, 0.45 * s, 0.45 * s, 0.45 * s);
    for (const sg of [-1, 1]) if (rand() < 0.8) { const ah = h * (0.35 + rand() * 0.25); world.add(U.box, g, x + sg * 0.9 * s, y + ah, z, 1.4 * s, 0.6 * s, 0.6 * s); world.add(U.cyl, g, x + sg * 1.5 * s, y + ah + 1.1 * s, z, 0.35 * s, 2.2 * s, 0.35 * s); }
  };
  for (let i = 0; i < F.length; i += 9) { const f = F[i]; for (const sg of [-1, 1]) { if (rand() < 0.55) continue; const P = side(f, sg * (f.w + KERB + f.apron + 3 + rand() * 4)); if (c.clear(P.x, P.z, 0.5)) cactus(P.x, P.z, 0.8 + rand() * 0.4); } }

  /* ---------------- steam train on a trestle high over the road ---------------- */
  {
    const z = 10, y = 30, x0 = -320, x1 = 320;
    for (let x = x0; x <= x1; x += 12) {
      const gy = ground(x, z);
      if (gy > y - 2) continue;
      const P = new THREE.Vector3(x, 0, z);
      if (!c.clear(P.x, P.z, 1)) continue;
      for (const dz of [-2.2, 2.2]) world.add(U.box, 0x8a5a36, x, (gy + y) / 2, z + dz, 0.6, y - gy, 0.6);
      for (let hh = gy + 4; hh < y; hh += 6) world.add(U.box, 0x7a4a2c, x, hh, z, 0.3, 0.3, 4.8);
    }
    world.add(U.box, 0x6b4a2b, 0, y + 0.3, z, x1 - x0, 0.6, 5.2);
    const tg = new Geo();
    tg.add(U.cyl, 0x2b2f3a, 0, 2.2, 3, 1.3, 6, 1.3, Math.PI / 2, 0, 0).add(U.box, 0x2b2f3a, 0, 2.6, -1.2, 2.6, 3.4, 3.2).add(U.cyl, 0x2b2f3a, 0, 4.6, 5, 0.4, 1.6, 0.4).add(U.box, 0xb5302e, 0, 0.9, 1.5, 2.8, 0.5, 9);
    for (let k = 1; k <= 3; k++) tg.add(U.box, [0xb5302e, 0x3a6ea5, 0xd9a24a][k - 1], 0, 1.9, -k * 9, 2.6, 2.4, 8.2).add(U.box, 0x24324a, 0, 2.2, -k * 9, 2.64, 0.8, 7);
    const train = new THREE.Mesh(tg.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.3 }));
    train.castShadow = true;
    group.add(train);
    const puffs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xf2f2f2, roughness: 1, transparent: true, opacity: 0.7 }), 10);
    group.add(puffs);
    const o = new THREE.Object3D();
    c.updates.push((_, t) => {
      const u = ((t * 0.035) % 1), x = x0 + u * (x1 - x0);
      train.position.set(x, y + 0.6, z); train.rotation.y = Math.PI / 2;
      for (let k = 0; k < 10; k++) { const a = ((t * 1.2 + k / 10) % 1); o.position.set(x + 5 - a * 14, y + 6 + a * 6, z + Math.sin(k) * a); o.scale.setScalar(0.6 + a * 2.2); o.updateMatrix(); puffs.setMatrixAt(k, o.matrix); }
      puffs.instanceMatrix.needsUpdate = true;
    });
  }

  /* ---------------- tumbleweeds, balloons, dust devil, eagles ---------------- */
  {
    const n = 14, tw = new THREE.InstancedMesh(new THREE.IcosahedronGeometry(0.9, 1), new THREE.MeshStandardMaterial({ color: 0xa8824e, roughness: 1, wireframe: true }), n);
    group.add(tw);
    const ws = Array.from({ length: n }, () => ({ x: (rand() - 0.5) * 400, z: (rand() - 0.5) * 260, sp: 3 + rand() * 4, ph: rand() * 6 }));
    const o = new THREE.Object3D();
    c.updates.push((dt, t) => {
      ws.forEach((w, i) => { w.x += w.sp * dt; if (w.x > 220) w.x = -220; const y = ground(w.x, w.z); o.position.set(w.x, y + 0.9 + Math.abs(Math.sin(t * 3 + w.ph)) * 0.8, w.z + Math.sin(t * 0.5 + w.ph) * 3); o.rotation.set(t * 3 + w.ph, 0, -t * 2); o.updateMatrix(); tw.setMatrixAt(i, o.matrix); });
      tw.instanceMatrix.needsUpdate = true;
    });
    const balloons = [0xff3b30, 0xffc61a, 0x2f6fd0, 0x2fd27a, 0xff2bd6].map((col, i) => {
      const g = new Geo();
      g.add(U.ball, col, 0, 6, 0, 4, 4.8, 4).add(U.ball, 0xffffff, 0, 6, 0, 4.05, 1.0, 4.05).add(U.box, 0x8a5a36, 0, 0, 0, 1.4, 1.1, 1.4);
      for (const [dx, dz] of [[-0.6, -0.6], [0.6, -0.6], [-0.6, 0.6], [0.6, 0.6]]) g.add(U.box, 0x3a2a24, dx * 1.6, 1.6, dz * 1.6, 0.05, 2.6, 0.05);
      const m = new THREE.Mesh(g.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
      group.add(m);
      return { m, a: i * 1.3, r: 160 + i * 40, h: 60 + i * 12 };
    });
    c.updates.push((_, t) => balloons.forEach((b) => { const a = b.a + t * 0.02; b.m.position.set(Math.cos(a) * b.r, b.h + Math.sin(t * 0.3 + b.a) * 4, Math.sin(a) * b.r * 0.8); }));
    // a dust devil: specks spinning up a column
    const dn = 400, pos = new Float32Array(dn * 3), seed = new Float32Array(dn);
    for (let i = 0; i < dn; i++) seed[i] = rand();
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xc89a66, size: 0.5, transparent: true, opacity: 0.6, depthWrite: false }));
    dust.frustumCulled = false;
    group.add(dust);
    c.updates.push((_, t) => {
      const cx = Math.sin(t * 0.05) * 120, cz = -60 + Math.cos(t * 0.04) * 40, gy = ground(cx, cz);
      for (let i = 0; i < dn; i++) { const s = seed[i], h = ((s * 17 + t * 0.6) % 1) * 22, r = 0.8 + h * 0.35, a = s * 60 + t * (4 - h * 0.1); pos[i * 3] = cx + Math.cos(a) * r; pos[i * 3 + 1] = gy + h; pos[i * 3 + 2] = cz + Math.sin(a) * r; }
      dg.attributes.position.needsUpdate = true;
    });
  }
  birds(c, 0, 0, 120, 45, 8, 0x3a2a24);
  birds(c, -120, 40, 60, 38, 5, 0x2b2016);

  /* ---------------- start, people, signs ---------------- */
  const lampsM = startGantry(track, group, glossy, 'CANYON RUN', ['#ff7a1a', '#b5302e'], 0x3a2a24, 0xffc61a);
  billboards(track, group, world, [
    [12, ['HOWDY!'], ['#b5302e', '#ff7a1a']],
    [34, ['INTO THE', 'CANYON'], ['#6a2fb8', '#ff7a1a']],
    [64, ['HUMP!'], ['#2f6fd0', '#36c2ff']],
    [96, ['HANG ON!'], ['#14915f', '#7ee08a']],
  ], c.clear, 0x8a5a36);
  crowd(c, roadsideSpots(c, 6, track.oS[6], { rows: 3, sides: [-1] }));
  bunting(c, 8, track.oS[6], 18, [0xff7a1a, 0xffc61a, 0xb5302e, 0x2f6fd0]);
  lamps(c, 34, 0x3a2a24, 0xffd890);
  walkers(c, 30);
  void glow;
  cloudRing(group, 0, 0, 10, rand, { tint: 0xffe2c0, glow: 0.7, y0: 140 });

  return done(c, lampsM, { waterY: -30 });
}
