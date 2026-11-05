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

const PTS: [number, number][] = [[113.6,-121.3],[129.1,-123],[144.6,-124.9],[160,-126.8],[175.6,-128.3],[191.1,-129.5],[206.3,-129.1],[220.3,-125.5],[230.9,-116.9],[235.1,-104.9],[232.3,-92.3],[222.8,-82.3],[209.6,-76],[194.9,-72],[180.8,-67],[169.4,-58.2],[161.7,-45.8],[158,-31.2],[156.9,-15.9],[157.4,-0.4],[158.5,15.2],[159.9,30.7],[161.5,46.3],[163.2,61.8],[164.8,77.2],[165.5,92.7],[163.8,107.8],[158.5,121.2],[148.6,129.7],[136.3,131.9],[124.4,127.1],[116,116],[111.3,101.8],[109.1,86.6],[107.9,71],[106.3,55.5],[103.7,40.2],[100.5,25.1],[94.6,15.7],[86.9,11.2],[79,9.6],[71.5,11.9],[65,17.5],[60.5,27.5],[60.5,40.8],[57.3,52.6],[51,59.9],[43.4,63.8],[35.2,63.9],[27.5,60.1],[21.1,53.2],[17.7,41.5],[17.7,25.9],[17.9,10.3],[18.1,-5.3],[16.8,-20.2],[11.3,-29.6],[4.1,-35.3],[-4.2,-37.1],[-12.8,-35],[-21.5,-29.9],[-31.6,-19.5],[-44.6,-12.6],[-59.4,-8.6],[-74.5,-5.5],[-89.2,-1.4],[-102,5.7],[-111.7,16.5],[-119,29.8],[-126.8,42.6],[-137.2,53.2],[-150.3,60.2],[-164.8,62.8],[-179.8,61.5],[-194.1,56.4],[-207,48.4],[-217.8,37.6],[-226.2,24.8],[-232.1,10.8],[-235.9,-3.8],[-236.6,-15.9],[-231.8,-26],[-224.9,-31.4],[-217.5,-33.5],[-210.1,-31.8],[-202.9,-27.1],[-197.4,-19.3],[-190.1,-14.1],[-181.6,-11.7],[-172.9,-13.4],[-165,-18.8],[-159.4,-28.9],[-159,-44.2],[-159.6,-59.7],[-159.8,-75.1],[-155.1,-85.3],[-148,-91.1],[-139.8,-93.4],[-131.2,-91.8],[-123,-87.5],[-115.3,-81.4],[-107.1,-78.2],[-98.9,-78.8],[-91.2,-83.3],[-84.5,-90.8],[-80.1,-104.4],[-73.7,-117.7],[-63.8,-126.8],[-51.3,-129.2],[-38.7,-124.8],[-26.7,-116.5],[-13.8,-110.1],[0.5,-108.4],[15.6,-110.4],[30.8,-113.2],[46.3,-115.4],[61.8,-117],[77.4,-118.3],[92.8,-119.5],[108.4,-120.8]];
/** Road height: the fingers go down into the canyon, the humps rise a little. */
/** The layout was scaled up by SC (and its tightest curves opened) after drawing; heights keep the drawing's coordinates. */
const SC = 1.3;
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
    cx: 0, cz: 0, size: 1000, n: 190, y: ground,
    color: (x, z, y) => { const n = nearest(x, z); if (n.d < 4) return 0xe0b07a; if (y > 23 + noise(x, z) * 8 - 0.5) return 0xd29a5c; return STRATA[Math.abs(Math.floor(y / 2.6)) % STRATA.length]; },
  });
  // hoodoos and mesas far away
  for (let k = 0; k < 26; k++) {
    const a = rand() * Math.PI * 2, r = 280 + rand() * 180, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 40 + rand() * 50, w = 25 + rand() * 40;
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
  crowd(c, roadsideSpots(c, 6, track.cpS[6], { rows: 3, sides: [-1] }));
  bunting(c, 8, track.cpS[6], 18, [0xff7a1a, 0xffc61a, 0xb5302e, 0x2f6fd0]);
  lamps(c, 34, 0x3a2a24, 0xffd890);
  walkers(c, 30);
  void glow;
  cloudRing(group, 0, 0, 10, rand, { tint: 0xffe2c0, glow: 0.7, y0: 140 });

  return done(c, lampsM, { waterY: -30 });
}
