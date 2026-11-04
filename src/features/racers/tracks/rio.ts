/* English Racers — "Rio Carnival" (≈0.9 km), inspired by Rio de Janeiro: the start along the beach
   avenue (wavy black-and-white promenade, umbrellas, volleyball, surfers in the waves, kites), a
   climb through a hillside of colourful houses with a jump off the crest, the carnival avenue
   between packed grandstands (dancers, giant floats, confetti) and back down a palm boulevard.
   In the bay, two rocky domes with a cable car; on the mountain, a statue with open arms. */
import * as THREE from 'three';
import { Geo, U } from '@/features/run/gfx';
import { makeOcean, oceanGeometry } from '@/features/run/ocean';
import { KERB, type Track, type TrackDef } from '../track';
import { side, type TrackStyle } from '../trackMesh';
import { billboards, cloudRing, startGantry, type Scenery } from '../scenery';
import { birds, boats, building, bunting, city, crowd, done, fallers, fillGrid, gridLanes, ground, lamps, roadsideSpots, strollers, traffic, tree, walkers } from './city';

export const RIO: TrackDef = {
  id: 'rio', name: 'Rio Carnival', laps: 3,
  cps: [
    { x: -120, z: 0 }, { x: -30, z: 2 }, { x: 60, z: 0 }, { x: 110, z: 10 }, { x: 135, z: 45, y: 2 }, { x: 120, z: 85, y: 6 }, { x: 80, z: 95, y: 9 }, { x: 55, z: 125, y: 11 }, { x: 40, z: 160, y: 11 },
    { x: 0, z: 185, y: 5 }, { x: -40, z: 195 }, { x: -150, z: 195 }, { x: -185, z: 170 }, { x: -195, z: 120 }, { x: -190, z: 60 }, { x: -170, z: 20 },
  ],
  features: [
    { kind: 'boost', at: 0, off: 40, d: -2.5 },
    { kind: 'boost', at: 1, off: 50, d: 2.5 },
    { kind: 'ramp', at: 8, off: 8, len: 10, h: 1.3 },
    { kind: 'boost', at: 10, off: 30, d: 0 },
  ],
  items: [{ at: 2, off: 20 }, { at: 6, off: 6 }, { at: 10, off: 60 }, { at: 13, off: 20 }],
  gates: [{ at: 1, off: 8 }, { at: 4, off: 24 }, { at: 10, off: 7 }, { at: 13, off: 0 }],
  coins: [
    { at: 0, off: 20, d: 2.5, n: 6 },
    { at: 3, off: 10, d: -1.5, n: 5, dd: 0.6 },
    { at: 7, off: 8, d: 0, n: 5 },
    { at: 9, off: 10, d: 2, n: 5 },
    { at: 11, off: 10, d: -2.5, n: 5, dd: 1 },
    { at: 14, off: 6, d: 0, n: 6 },
  ],
};

export const RIO_STYLE: TrackStyle = { road: 'asphalt', kerb: [0x009c3b, 0xffdf00], apron: [0xc4c0b6, 0xbab6ac], wall: 'barrier', edge: 'bank', bank: 0x9a8f7a, gapFace: 0xb9b2a3, baseY: -0.06 };

const SEA = -0.6;
/** The hill of colourful houses (the road climbs it) and the ground under the bay. */
const hill = (x: number, z: number) => 17 * Math.exp(-((x - 92) ** 2 + (z - 118) ** 2) / (2 * 48 * 48)) + 26 * THREE.MathUtils.smoothstep(z, 250, 420);

function mosaicTex() {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#f4f1ea'; g.fillRect(0, 0, 512, 128);
  g.fillStyle = '#1b1d24';
  for (let k = 0; k < 2; k++) {
    g.beginPath();
    for (let x = 0; x <= 512; x += 4) g.lineTo(x, 34 + k * 56 + Math.sin((x / 512) * Math.PI * 4) * 22);
    for (let x = 512; x >= 0; x -= 4) g.lineTo(x, 52 + k * 56 + Math.sin((x / 512) * Math.PI * 4) * 22);
    g.fill();
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function buildRio(track: Track): Scenery {
  const c = city(track, 1565);
  const { world, glossy, group, rand } = c;
  const F = track.frames, sparse = F.filter((_, i) => i % 8 === 0);

  /* ---------------- terrain (cut where the road climbs), beach, sea ---------------- */
  const terrain = (x: number, z: number) => {
    let y = hill(x, z);
    if (z < -16) y = THREE.MathUtils.lerp(-0.3, -6, THREE.MathUtils.smoothstep(-z, 40, 70));
    let best = Infinity, fy = 0, fw = 14;
    for (const f of sparse) { const d = Math.hypot(x - f.p.x, z - f.p.z); if (d < best) { best = d; fy = f.p.y; fw = f.w + KERB + f.apron + 1; } }
    const dRoad = best - fw;
    if (dRoad < 40) y = Math.min(y, fy - 0.4 + Math.max(0, dRoad) * 0.55);
    return Math.max(y, z < -16 ? -6 : -0.08);
  };
  ground(c, { cx: 0, cz: 80, size: 1150, step: 30, gx: 0, gz: 0, y: terrain, color: (x, z) => (z < -14 ? 0xf0dcae : hill(x, z) > 3 ? 0xc9e0a8 : 0xffffff), walk: '#c9c4b8', asphalt: '#45484e' });
  {
    const sand = new THREE.Mesh(new THREE.PlaneGeometry(1100, 30).rotateX(-Math.PI / 2), new THREE.MeshStandardMaterial({ color: 0xf0dcae, roughness: 1 }));
    sand.position.set(0, -0.12, -31);
    sand.receiveShadow = true;
    group.add(sand);
    const mz = new THREE.PlaneGeometry(520, 6).rotateX(-Math.PI / 2);
    const uv = mz.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setX(i, uv.getX(i) * 520 / 24);
    const mosaic = new THREE.Mesh(mz, new THREE.MeshStandardMaterial({ map: mosaicTex(), roughness: 0.8 }));
    mosaic.position.set(-30, -0.03, -18);
    mosaic.receiveShadow = true;
    group.add(mosaic);
  }
  const sea = makeOcean({ deep: 0x0f6fa8, shallow: 0x3fd8d0, amp: 0.32, scale: 1.4, dir: [0.1, 1] });
  const sgeo = oceanGeometry(80, -380, 1300, 680, 150, 90, (_, z) => Math.max(0, (-40 - z) * 0.12));
  const sm = new THREE.Mesh(sgeo, sea.material);
  sm.position.y = SEA;
  group.add(sm);

  /* ---------------- beach life: umbrellas, nets, palms, surfers, kites ---------------- */
  const UMB = [0xff3b30, 0xffd60a, 0x30d158, 0x0a84ff, 0xff9f0a, 0xbf5af2, 0xffffff];
  for (let k = 0; k < 70; k++) {
    const x = -300 + rand() * 600, z = -24 - rand() * 14;
    world.cyl(x, -0.1, z, 0.06, 2.4, 0xf4f4f2);
    world.add(new THREE.ConeGeometry(1, 1, 8), UMB[k % UMB.length], x, 2.4, z, 1.5, 0.7, 1.5);
    if (rand() < 0.5) world.add(U.box, UMB[(k + 3) % UMB.length], x + 1.4, 0.0, z, 0.8, 0.1, 1.8);
  }
  for (const x of [-180, -60, 70, 190]) { world.cyl(x - 4.5, -0.1, -30, 0.08, 2.6, 0xf4f4f2); world.cyl(x + 4.5, -0.1, -30, 0.08, 2.6, 0xf4f4f2); world.add(U.box, 0xf4f4f2, x, 2.2, -30, 9, 0.8, 0.04); }
  for (let x = -260; x < 260; x += 13) if (c.clear(x, -15.5, -1)) tree(c, x + (rand() - 0.5) * 3, -16, 'palm', 1);
  strollers(c, [[-280, -26, 280, -26], [-280, -34, 280, -34], [-250, -18, 250, -18], [-150, -36, -150, -24], [60, -36, 60, -24]], 90, () => -0.1);
  crowd(c, Array.from({ length: 40 }, (_, i) => { const x = [-180, -60, 70, 190][i % 4] + (rand() - 0.5) * 8; return { x, y: -0.1, z: -30 + (i % 2 ? 2.5 : -2.5) + (rand() - 0.5), ry: i % 2 ? Math.PI : 0 }; }));
  {
    const sg = new Geo();
    sg.add(U.box, 0xffd60a, 0, 0.05, 0, 0.6, 0.1, 2.2).add(U.box, 0x2b2f3a, 0, 0.75, 0, 0.3, 1.0, 0.25).add(U.ball, 0xd9a47e, 0, 1.4, 0, 0.18, 0.2, 0.18).add(U.box, 0x2b2f3a, 0, 1.0, 0, 1.2, 0.1, 0.1);
    const geo = sg.build(), mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 });
    const surfers = Array.from({ length: 6 }, (_, i) => { const m = new THREE.Mesh(geo, mat); group.add(m); return { m, x: -220 + i * 85, ph: rand() * 20 }; });
    const kites = Array.from({ length: 6 }, (_, i) => {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(2.2, 2.8), new THREE.MeshStandardMaterial({ color: UMB[i], side: THREE.DoubleSide, roughness: 0.6 }));
      m.rotation.z = Math.PI / 4;
      group.add(m);
      return { m, x: -200 + i * 80, ph: rand() * 6 };
    });
    c.updates.push((_, t) => {
      for (const s of surfers) { const u = ((t * 0.07 + s.ph) % 1); s.m.position.set(s.x + Math.sin(t * 0.5 + s.ph) * 6, SEA + 0.15 + Math.sin(t * 2 + s.ph) * 0.15, -150 + u * 100); s.m.rotation.set(0, Math.PI + Math.sin(t * 0.7 + s.ph) * 0.4, Math.sin(t * 2.3 + s.ph) * 0.1); s.m.visible = u < 0.92; }
      for (const k of kites) { k.m.position.set(k.x + Math.sin(t * 0.6 + k.ph) * 4, 24 + Math.sin(t * 0.9 + k.ph) * 3, -45 + Math.cos(t * 0.5 + k.ph) * 3); k.m.rotation.set(0.2 * Math.sin(t + k.ph), 0, Math.PI / 4 + Math.sin(t * 1.3 + k.ph) * 0.3); }
    });
  }

  /* ---------------- the bay: two rock domes with a cable car, boats ---------------- */
  {
    const domes: [number, number, number, number][] = [[250, -170, 36, 58], [372, -262, 40, 122]];
    for (const [x, z, r, h] of domes) {
      world.add(U.ball, 0x8a7f72, x, -2, z, r, h, r * 1.1);
      for (let k = 0; k < 10; k++) { const a = rand() * Math.PI * 2; world.blob(x + Math.cos(a) * r * 0.5, h * 0.85 + rand() * h * 0.1, z + Math.sin(a) * r * 0.5, r * 0.35, 0x3f8a3a, 0.6); }
    }
    const stops = [new THREE.Vector3(190, 6, -32), new THREE.Vector3(250, 56, -170), new THREE.Vector3(372, 119, -262)];
    for (let s = 0; s < 2; s++) {
      const A = stops[s], B = stops[s + 1];
      for (let k = 1; k < 60; k++) { const u = k / 60, y = A.y + (B.y - A.y) * u - Math.sin(u * Math.PI) * 6; glossy.add(U.box, 0x3a3f4b, A.x + (B.x - A.x) * u, y, A.z + (B.z - A.z) * u, 0.12, 0.12, 2.6, 0, Math.atan2(B.x - A.x, B.z - A.z), 0); }
    }
    world.add(U.box, 0xf4f4f2, 190, 2.5, -30, 8, 7, 6);
    const cars = [0, 1, 2, 3].map(() => { const m = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.2, 3.4), new THREE.MeshStandardMaterial({ color: 0xffd23f, roughness: 0.3 })); group.add(m); return m; });
    c.updates.push((_, t) => cars.forEach((m, i) => {
      const s = i % 2, A = stops[s], B = stops[s + 1], u = (Math.sin(t * 0.08 + i * 1.7) * 0.5 + 0.5);
      m.position.set(A.x + (B.x - A.x) * u, A.y + (B.y - A.y) * u - Math.sin(u * Math.PI) * 6 - 1.8, A.z + (B.z - A.z) * u);
      m.rotation.y = Math.atan2(B.x - A.x, B.z - A.z);
    }));
    boats(c, [[-200, -160], [100, -130], [320, -150], [300, -380], [-50, -420], [-280, -300]], SEA - 0.05, [
      { color: 0xffffff, len: 10, kind: 'sail' }, { color: 0x0a84ff, len: 8, kind: 'speed' }, { color: 0xffffff, len: 11, kind: 'sail' }, { color: 0xff3b30, len: 20, kind: 'tour' },
    ]);
  }

  /* ---------------- the mountain with the open-armed statue ---------------- */
  {
    const x = -330, z = 470;
    world.add(U.blob, 0x3f7a3a, x, 20, z, 170, 120, 150, 0.3, 0.6, 0);
    world.add(U.blob, 0x4a8340, x + 60, 30, z + 60, 120, 110, 120, 0.8, 0.2, 0);
    world.add(U.blob, 0x4f8a42, x + 20, 120, z - 10, 60, 72, 55, 0.4, 1.1, 0);
    world.add(U.blob, 0x8a7f72, x + 20, 172, z - 10, 16, 20, 16, 0.2, 0.4, 0);
    world.add(U.box, 0xd8d4cc, x + 20, 191, z - 10, 8, 4, 8);
    world.add(new THREE.ConeGeometry(1, 1, 12), 0xf4f2ee, x + 20, 205, z - 10, 3.2, 26, 3.2);
    world.add(U.box, 0xf4f2ee, x + 20, 212, z - 10, 28, 2.4, 2.2);
    world.add(U.ball, 0xf4f2ee, x + 20, 220, z - 10, 1.8, 2.1, 1.8);
  }

  /* ---------------- the hill of colourful houses ---------------- */
  const PASTEL = [0xff8a80, 0xffd180, 0xa5d6a7, 0x81d4fa, 0xce93d8, 0xfff59d, 0xffab91, 0x80cbc4, 0xf48fb1];
  for (let k = 0; k < 420; k++) {
    const a = rand() * Math.PI * 2, r = Math.sqrt(rand()) * 85, x = 92 + Math.cos(a) * r, z = 118 + Math.sin(a) * r;
    if (z < 25 || !c.clear(x, z, 3)) continue;
    const y = terrain(x, z);
    if (y < 1.5) continue;
    const w = 4 + rand() * 3, d = 4 + rand() * 3;
    building(c, 'pastel', x, z, w, d, 3 + rand() * 4, 0, { tint: PASTEL[Math.floor(rand() * PASTEL.length)], roof: 'flat', roofColor: 0x9a8f7a, y0: y - 1 });
  }

  /* ---------------- the city: beachfront towers and blocks ---------------- */
  fillGrid(c, { x0: -420, x1: 480, z0: 30, z1: 460, step: 30, street: 8 }, (x, z) => {
    if (hill(x, z) > 2 || (x > -160 && x < -20 && z > 160 && z < 235)) return null;
    const front = z < 70, r = rand();
    return { kind: front ? (r < 0.6 ? 'office' : 'pastel') : r < 0.5 ? 'pastel' : 'concrete', h: front ? 28 + rand() * 26 : 10 + rand() * 14, roof: 'flat', tint: front ? [0xffffff, 0xf4f0e6, 0xe8f2f6][Math.floor(rand() * 3)] : PASTEL[Math.floor(rand() * PASTEL.length)] };
  });

  /* ---------------- the carnival avenue: grandstands, dancers, floats, confetti ---------------- */
  const s0 = track.cpS[10] + 2, s1 = track.cpS[11] - 2;
  for (let s = s0; s < s1; s += 4) {
    const f = track.frame(Math.round(s / track.ds));
    for (const sg of [-1, 1]) for (let r = 0; r < 7; r++) {
      const P = side(f, sg * (f.w + KERB + f.apron + 2.1 + r * 1.1));
      world.add(U.box, r % 2 ? 0xf4f4f2 : 0xe8e4dc, P.x, (r + 1) * 0.45 / 2 - 0.1, P.z, 1.15, (r + 1) * 0.45, 4.05, 0, f.yaw, 0);
    }
  }
  crowd(c, roadsideSpots(c, s0, s1, { rows: 7, every: 1.0, extra: 0.5, y: 0.35 }));
  bunting(c, s0, s1, 14, [0x009c3b, 0xffdf00, 0x002776, 0xff3b30, 0xffffff], 9);
  fallers(c, { x: (track.frame(Math.round(s0 / track.ds)).p.x + track.frame(Math.round(s1 / track.ds)).p.x) / 2, z: 195, w: 130, d: 40, y0: 0, h: 16 }, 1200, [0xff3b30, 0xffdf00, 0x30d158, 0x0a84ff, 0xff2bd6, 0xffffff], 0.32, 2.2);
  {
    // giant floats turning at both ends of the avenue
    const mkFloat = (x: number, z: number, col: number, i: number) => {
      const g = new Geo();
      g.add(U.box, col, 0, 1.4, 0, 9, 2.2, 14).add(U.box, 0xffdf00, 0, 2.6, 0, 9.4, 0.3, 14.4);
      if (i % 2) { g.add(U.ball, 0x30a0ff, 0, 7, 0, 3.6, 3.8, 3.6).add(new THREE.ConeGeometry(1, 1, 10), 0xff9f0a, 0, 7, 4.2, 1.2, 3.5, 1.2, Math.PI / 2, 0, 0).add(U.ball, 0xffffff, 1.6, 8.2, 2.4, 0.7, 0.7, 0.7).add(U.ball, 0x1b1d24, 1.9, 8.3, 2.8, 0.32, 0.32, 0.32); }
      else { g.add(U.ball, 0xffdf00, 0, 6, 0, 3, 4, 1.4).add(U.box, 0xff2bd6, 0, 6.5, 0.8, 4.4, 1.2, 0.3).add(U.ball, 0x1b1d24, -0.9, 6.6, 1.0, 0.45, 0.45, 0.2).add(U.ball, 0x1b1d24, 0.9, 6.6, 1.0, 0.45, 0.45, 0.2); }
      for (let k = 0; k < 9; k++) { const a = -1.2 + k * 0.3; g.add(U.box, [0xff3b30, 0x30d158, 0x0a84ff, 0xff2bd6][k % 4], Math.sin(a) * 3.5, 6 + Math.cos(a) * 3.5, -3, 0.5, 5, 0.1, 0, 0, -a); }
      const m = new THREE.Mesh(g.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4, metalness: 0.15 }));
      m.position.set(x, 0, z);
      m.castShadow = true;
      group.add(m);
      return m;
    };
    const fA = track.frame(Math.round((s0 - 22) / track.ds)), fB = track.frame(Math.round((s1 + 20) / track.ds));
    const floats: THREE.Mesh[] = [];
    for (const [f, sg, i] of [[fA, 1, 0], [fB, -1, 1], [fA, -1, 2], [fB, 1, 3]] as const) {
      const P = side(f, sg * (f.w + KERB + f.apron + 14));
      if (c.clear(P.x, P.z, 6)) floats.push(mkFloat(P.x, P.z, [0x6a2fb8, 0x009c3b, 0xff3b30, 0x0a84ff][i], i));
    }
    c.updates.push((_, t) => floats.forEach((m, i) => { m.rotation.y = t * 0.25 + i; m.position.y = Math.abs(Math.sin(t * 2.4 + i)) * 0.15; }));
    for (const m of floats) crowd(c, Array.from({ length: 26 }, (_, k) => { const a = (k / 26) * Math.PI * 2; return { x: m.position.x + Math.cos(a) * 11, y: 0, z: m.position.z + Math.sin(a) * 11, ry: -a - Math.PI / 2 }; }));
  }

  /* ---------------- start, signs, lamps, life ---------------- */
  const lampsM = startGantry(track, group, glossy, 'RIO CARNIVAL', ['#009c3b', '#ffdf00'], 0x1b1d24, 0xffdf00);
  billboards(track, group, world, [
    [3, ['UP THE HILL!'], ['#ff3b30', '#ff9f0a']],
    [8, ['JUMP!'], ['#002776', '#0a84ff']],
    [12, ['OBRIGADO!', 'THANK YOU!'], ['#009c3b', '#ffdf00']],
    [15, ['BEACH TIME'], ['#ff2bd6', '#ff9f0a']],
  ], c.clear);
  for (let i = 0; i < F.length; i += 12) {
    const f = F[i];
    if (f.p.z > 30 || f.p.z < -30) continue;
    const P = side(f, f.w + KERB + f.apron + 3);
    if (c.clear(P.x, P.z, 1)) tree(c, P.x, P.z, 'palm', 1.1);
  }
  lamps(c, 26, 0x2b2f3a, 0xffe7b0);
  walkers(c, 70);
  traffic(c, gridLanes(c, { x0: -420, x1: 480, z0: 30, z1: 460, step: 30 }, (x, z) => hill(x, z) > 1.5 || (x > -170 && x < -10 && z > 150 && z < 240)), [
    { kind: 'car', colors: [0xf4f4f2, 0xffd60a, 0x30d158, 0x0a84ff, 0xff3b30], n: 30 },
    { kind: 'bus', colors: [0x009c3b, 0xffdf00, 0xf4f4f2], n: 8, speed: 8 },
    { kind: 'van', colors: [0xf4f4f2, 0xff9f0a], n: 8 },
  ]);
  birds(c, 0, -60, 120, 30, 16, 0x2b2f3a);
  birds(c, 300, -220, 60, 70, 10, 0x1b1d24);
  cloudRing(group, 0, 80, 14, rand, { tint: 0xffffff, glow: 0.6, y0: 140 });

  return done(c, lampsM, { waterY: -3, oceans: [sea.uniforms] });
}
