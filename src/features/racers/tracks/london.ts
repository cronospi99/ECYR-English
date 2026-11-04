/* English Racers — "London Loop" (≈0.84 km), inspired by London: the start on the north embankment
   in front of a long gothic parliament, a bascule bridge over the river whose open middle you jump
   (miss it: splash!), the south bank past a giant observation wheel, a block of brick streets, and
   back over a stone bridge by the clock tower. Around it: the river with tour boats, red
   double-deckers and black cabs, phone boxes, a domed cathedral and glass towers on the skyline,
   plane trees, pigeons, bunting, and crowds cheering on the embankment. */
import * as THREE from 'three';
import { U } from '@/features/run/gfx';
import { makeOcean, oceanGeometry } from '@/features/run/ocean';
import { KERB, type Track, type TrackDef } from '../track';
import { side, type TrackStyle } from '../trackMesh';
import { billboards, cloudRing, startGantry, type Scenery } from '../scenery';
import { birds, boats, building, bunting, city, crowd, done, fillGrid, gridLanes, ground, lamps, patch, roadsideSpots, traffic, tree, walkers } from './city';

export const LONDON: TrackDef = {
  id: 'london', name: 'London Loop', laps: 3, waterY: -2.5,
  cps: [
    { x: -90, z: 45 }, { x: -20, z: 45 }, { x: 40, z: 44 }, { x: 78, z: 36 }, { x: 98, z: 15, y: 1.6, apron: 2 }, { x: 102, z: -5, y: 3.2, apron: 1.5 }, { x: 100, z: -28, y: 2, apron: 2 }, { x: 88, z: -55 },
    { x: 60, z: -72 }, { x: 10, z: -76 }, { x: -25, z: -95 }, { x: -32, z: -140 }, { x: -55, z: -165 }, { x: -100, z: -168 }, { x: -130, z: -150 }, { x: -140, z: -110 },
    { x: -160, z: -75 }, { x: -175, z: -45, y: 1.5, apron: 2 }, { x: -176, z: -10, y: 3, apron: 1.5 }, { x: -172, z: 20, y: 1.5, apron: 2 }, { x: -160, z: 42 }, { x: -130, z: 47 },
  ],
  features: [
    { kind: 'boost', at: 1, off: 10, d: 0 },
    { kind: 'ramp', at: 4, off: 8, len: 11, h: 1.8 },
    { kind: 'gap', at: 5, off: 0, len: 9 },
    { kind: 'boost', at: 9, off: 8, d: -2.5 },
    { kind: 'boost', at: 13, off: 4, d: 2.5 },
  ],
  items: [{ at: 2, off: 10 }, { at: 8, off: 4 }, { at: 14, off: 6 }, { at: 19, off: 12 }],
  coins: [
    { at: 0, off: 30, d: 2.5, n: 5 },
    { at: 7, off: 6, d: -2, n: 5, dd: 0.6 },
    { at: 10, off: 10, d: 2, n: 5 },
    { at: 12, off: 8, d: 0, n: 6 },
    { at: 15, off: 10, d: -2.5, n: 5, dd: 1 },
    { at: 20, off: 4, d: 0, n: 5 },
  ],
  clear: [{ at: 4, off: -30, len: 75 }, { at: 17, off: -20, len: 80 }],
};

export const LONDON_STYLE: TrackStyle = { road: 'asphalt', kerb: [0xd32f2f, 0xf4f4f2], apron: [0xb6b8bd, 0xadb0b6], wall: 'barrier', edge: 'bank', bank: 0x8f8a7c, gapFace: 0xbfb6a0, baseY: -0.06 };

/** The river's centre line (a gentle meander) and its half width. */
const riverZ = (x: number) => Math.sin(x / 95) * 5;
const RW = 22;
const inRiver = (x: number, z: number, m = 0) => Math.abs(z - riverZ(x)) < RW + m;

export function buildLondon(track: Track): Scenery {
  const c = city(track, 1851);
  const { world, glossy, glass, glow, group, rand } = c;
  const F = track.frames;

  /* ---------------- ground, river, embankments ---------------- */
  ground(c, { cx: 0, cz: 0, size: 1100, step: 30, gx: 0, gz: 0, y: (x, z) => (inRiver(x, z, -7) ? -6 : -0.08), color: (x, z) => (inRiver(x, z, 2) ? 0x9a9488 : 0xffffff), walk: '#bdb8ad', asphalt: '#474a51' });
  const water = makeOcean({ deep: 0x3b5d66, shallow: 0x5f8a86, foam: 0xdfe8e6, amp: 0.12, scale: 0.55, dir: [1, 0.15], opacity: 0.96 });
  const wgeo = oceanGeometry(0, 0, 1000, 70, 200, 14, (x, z) => 2 + (RW - Math.abs(z - riverZ(x))) * 0.4);
  { const P = wgeo.getAttribute('position'); for (let i = 0; i < P.count; i++) P.setZ(i, P.getZ(i) * (RW + 1) / 35 + riverZ(P.getX(i))); }
  const wm = new THREE.Mesh(wgeo, water.material);
  wm.position.y = -2.5;
  wm.receiveShadow = true;
  group.add(wm);
  // stone embankment walls with a balustrade and lamps
  for (let x = -480; x < 480; x += 6) for (const sg of [-1, 1]) {
    const z = riverZ(x + 3) + sg * (RW + 0.5), ry = Math.atan2(riverZ(x + 6) - riverZ(x), 6);
    if (c.clear(x + 3, z, -4)) {
      world.add(U.box, 0xb8ad94, x + 3, -1.2, z, 6.05, 3.6, 1.4, 0, -ry, 0);
      world.add(U.box, 0xd2c8b0, x + 3, 0.75, z, 6.05, 0.3, 1.0, 0, -ry, 0);
      if (x % 24 === 0) { world.cyl(x + 3, 0.6, z, 0.1, 4, 0x2b3a2f); glow.add(U.ball, 0xffe2a0, x + 3, 4.7, z, 0.3, 0.3, 0.3); }
    }
  }

  /* ---------------- the two bridges: deck underside, piers, the bascule towers ---------------- */
  const bridgeS = (cp0: number, cp1: number) => [track.cpS[cp0] - 12, track.cpS[cp1] + 12];
  for (const [a, b] of [bridgeS(3, 7), bridgeS(16, 20)]) {
    for (let s = a; s < b; s += 2) {
      const f = track.frame(Math.round(s / track.ds));
      if (!inRiver(f.p.x, f.p.z, 1) || track.gapAt(s)) continue;
      const C = side(f, 0);
      world.add(U.box, 0x8d8576, C.x, C.y - 0.75, C.z, (f.w + KERB + f.apron + 0.6) * 2, 1.3, 2.1, 0, f.yaw, 0);
    }
  }
  // stone bridge piers (west bridge) and the bascule bridge's two towers (east)
  for (const z of [-12, 12]) {
    const s = track.cpS[18] + z * -1;
    const f = track.frame(Math.round(s / track.ds)), C = side(f, 0);
    world.add(U.box, 0xb8ad94, C.x, C.y / 2 - 2.2, C.z, (f.w + KERB + f.apron) * 2 + 2, C.y + 1.6, 3.2, 0, f.yaw, 0);
    world.add(new THREE.CylinderGeometry(0.5, 0.5, 1, 3), 0xb8ad94, C.x, -2.2, C.z, 3.2, (f.w + KERB + f.apron) * 2 + 2, 2.2, 0, f.yaw, Math.PI / 2);
  }
  const towerAt = (s: number) => {
    const f = track.frame(Math.round(s / track.ds)), span = f.w + KERB + f.apron + 2.8;
    const stone = 0xd9cdb4, slate = 0x46525e, blue = 0x86b8d8;
    for (const sg of [-1, 1]) {
      const P = side(f, sg * span);
      world.add(U.box, stone, P.x, 11, P.z, 4.4, 28, 4.4, 0, f.yaw, 0);
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
        const q = new THREE.Vector3(P.x + (f.r.x * dx + f.t.x * dz) * 2.1, 0, P.z + (f.r.z * dx + f.t.z * dz) * 2.1);
        world.add(U.box, stone, q.x, 26.5, q.z, 1.2, 5, 1.2, 0, f.yaw, 0);
        world.add(new THREE.ConeGeometry(1, 1, 4), slate, q.x, 30.2, q.z, 0.9, 2.6, 0.9, 0, f.yaw + Math.PI / 4, 0);
      }
      world.add(new THREE.ConeGeometry(1, 1, 4), slate, P.x, 31, P.z, 3.4, 6, 3.4, 0, f.yaw + Math.PI / 4, 0);
      glossy.add(U.ball, 0xffd23f, P.x, 34.2, P.z, 0.35, 0.35, 0.35);
      // tall gothic windows
      for (const h of [6, 12, 18]) for (const k of [-1, 1]) glass.add(U.box, 0x35506e, P.x + f.t.x * k * 2.22, h, P.z + f.t.z * k * 2.22, 1.0, 2.6, 0.06, 0, f.yaw, 0);
      // suspension chains down to the banks (a curve of links)
      for (const dir of [-1, 1]) {
        for (let k = 1; k < 44; k++) {
          const u = k / 44, y = 7 + 15 * Math.pow(1 - u, 1.7);
          glossy.add(U.box, blue, P.x + f.t.x * dir * 30 * u, y, P.z + f.t.z * dir * 30 * u, 0.35, 0.45, 1.0, 0, f.yaw, 0);
        }
        const bx = P.x + f.t.x * dir * 30, bz = P.z + f.t.z * dir * 30;
        if (c.clear(bx, bz, -1)) { world.add(U.box, stone, bx, 3, bz, 2.2, 9, 2.2, 0, f.yaw, 0); world.add(new THREE.ConeGeometry(1, 1, 4), slate, bx, 8.6, bz, 1.7, 2.4, 1.7, 0, f.yaw + Math.PI / 4, 0); }
      }
    }
    // the arch over the road
    const C = side(f, 0);
    world.add(U.box, stone, C.x, C.y + 9.5, C.z, span * 2, 2.4, 3.6, 0, f.yaw, 0);
    return f;
  };
  const tA = towerAt(track.cpS[4] + 3), tB = towerAt(track.cpS[5] + 14);
  // high walkways between the towers (blue lattice)
  for (const sg of [-1, 1]) for (const y of [22, 25]) {
    const P = side(tA, sg * (tA.w + KERB + tA.apron + 2.8)), Q = side(tB, sg * (tB.w + KERB + tB.apron + 2.8));
    glossy.add(U.box, 0x86b8d8, (P.x + Q.x) / 2, y, (P.z + Q.z) / 2, 1.4, 1.2, Math.hypot(Q.x - P.x, Q.z - P.z), 0, Math.atan2(Q.x - P.x, Q.z - P.z), 0);
  }
  // warning lights at the open bascule
  const warn = new THREE.MeshBasicMaterial({ color: 0xff2020, toneMapped: false });
  for (const g of track.gaps) for (const s of [g.s0 - 1, g.s1 + 1]) for (const sg of [-1, 1]) {
    const f = track.frame(Math.round(s / track.ds)), P = side(f, sg * (f.w + KERB + 0.6));
    const m = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), warn);
    m.position.set(P.x, P.y + 1.4, P.z);
    group.add(m);
  }
  c.updates.push((_, t) => { warn.color.setRGB(Math.sin(t * 6) > 0 ? 2.5 : 0.3, 0.05, 0.05); });

  /* ---------------- the clock tower with moving hands ---------------- */
  {
    const x = -136, z = 30, gold = 0xd8c08a;
    world.add(U.box, gold, x, 24, z, 8, 48, 8);
    for (const h of [8, 16, 24, 32, 40]) for (let k = 0; k < 4; k++) { const a = (k * Math.PI) / 2; glass.add(U.box, 0x2f4660, x + Math.sin(a) * 4.02, h, z + Math.cos(a) * 4.02, 1.2, 4, 0.06, 0, a, 0); glass.add(U.box, 0x2f4660, x + Math.sin(a) * 4.02 + Math.cos(a) * 2.2, h, z + Math.cos(a) * 4.02 - Math.sin(a) * 2.2, 1.2, 4, 0.06, 0, a, 0); glass.add(U.box, 0x2f4660, x + Math.sin(a) * 4.02 - Math.cos(a) * 2.2, h, z + Math.cos(a) * 4.02 + Math.sin(a) * 2.2, 1.2, 4, 0.06, 0, a, 0); }
    world.add(U.box, gold, x, 54, z, 9.4, 12, 9.4);
    world.add(U.box, 0x6a5a3a, x, 61.5, z, 8.6, 3, 8.6);
    world.add(new THREE.ConeGeometry(1, 1, 4), 0x3d4752, x, 69, z, 6.4, 12, 6.4, 0, Math.PI / 4, 0);
    glossy.add(U.cyl, 0xd4af37, x, 76.5, z, 0.25, 4, 0.25);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) world.add(new THREE.ConeGeometry(1, 1, 4), 0x3d4752, x + dx * 4.4, 63.5, z + dz * 4.4, 0.8, 3.5, 0.8, 0, Math.PI / 4, 0);
    const hands: THREE.Mesh[] = [];
    const handMat = new THREE.MeshStandardMaterial({ color: 0x1b1d24, roughness: 0.4 });
    for (let k = 0; k < 4; k++) {
      const a = (k * Math.PI) / 2, fx = x + Math.sin(a) * 4.75, fz = z + Math.cos(a) * 4.75;
      glow.add(U.cyl, 0xfff3d0, fx, 54, fz, 3.4, 0.1, 3.4, 0, a + Math.PI / 2, Math.PI / 2);
      world.add(U.cyl, 0xd4af37, fx - Math.sin(a) * 0.05, 54, fz - Math.cos(a) * 0.05, 3.8, 0.12, 3.8, 0, a + Math.PI / 2, Math.PI / 2);
      for (const [len, w] of [[2.9, 0.22], [2.0, 0.32]] as const) {
        const m = new THREE.Mesh(new THREE.BoxGeometry(w, len, 0.08).translate(0, len / 2 - 0.3, 0), handMat);
        m.position.set(fx + Math.sin(a) * 0.12, 54, fz + Math.cos(a) * 0.12);
        m.rotation.order = 'YXZ'; m.rotation.y = a;
        group.add(m); hands.push(m);
      }
    }
    // a little faster than real time, so you can see it move
    c.updates.push((_, t) => { hands.forEach((m, i) => { m.rotation.z = -(i % 2 ? t * 0.008 : t * 0.1); }); });
    birds(c, x, z, 30, 58, 18, 0x6b6f78);
  }

  /* ---------------- parliament: a long gothic front with pinnacles ---------------- */
  {
    const z0 = 78;
    for (let x = -150; x < -30; x += 12) {
      building(c, 'stone', x + 6, z0, 12, 16, 18 + (x % 36 === 0 ? 4 : 0), 0, { tint: 0xf0dcae, roof: 'pitched', roofColor: 0x4a5560 });
      for (const dx of [-5.5, 0, 5.5]) world.add(new THREE.ConeGeometry(1, 1, 4), 0xe1cc9a, x + 6 + dx, 23.5, z0 - 8, 0.5, 4, 0.5, 0, Math.PI / 4, 0);
    }
    building(c, 'stone', -160, z0, 16, 16, 46, 0, { tint: 0xf0dcae, roof: 'flat', roofColor: 0xb5a37a });
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) world.add(new THREE.ConeGeometry(1, 1, 4), 0xe1cc9a, -160 + dx * 7.5, 49, z0 + dz * 7.5, 0.9, 5, 0.9, 0, Math.PI / 4, 0);
  }

  /* ---------------- observation wheel on the south bank ---------------- */
  {
    const hx = -40, hz = -36, hy = 34, R = 30;
    const wheel = new THREE.Group();
    wheel.position.set(hx, hy, hz);
    const wm2 = new THREE.MeshStandardMaterial({ color: 0xf4f6f8, roughness: 0.35, metalness: 0.5 });
    wheel.add(new THREE.Mesh(new THREE.TorusGeometry(R, 0.35, 8, 96), wm2), new THREE.Mesh(new THREE.TorusGeometry(R - 1.6, 0.18, 6, 96), wm2));
    for (let k = 0; k < 32; k++) { const sp = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, R, 4).translate(0, R / 2, 0), wm2); sp.rotation.z = (k / 32) * Math.PI * 2; wheel.add(sp); }
    wheel.add(new THREE.Mesh(new THREE.CylinderGeometry(1.6, 1.6, 2.4, 16).rotateX(Math.PI / 2), wm2));
    group.add(wheel);
    // the A-frame legs from the bank
    for (const dx of [-9, 9]) glossy.add(U.box, 0xe8ebef, hx + dx / 2, hy / 2, hz + 5, 1.1, Math.hypot(hy, 9.5), 1.1, -0.27, 0, dx > 0 ? -0.14 : 0.14);
    const capG = new THREE.CapsuleGeometry(1.1, 2.2, 4, 10).rotateZ(Math.PI / 2);
    const caps = new THREE.InstancedMesh(capG, new THREE.MeshStandardMaterial({ color: 0xcfe8ff, roughness: 0.1, metalness: 0.3, transparent: true, opacity: 0.85 }), 32);
    caps.frustumCulled = false;
    group.add(caps);
    const o = new THREE.Object3D();
    c.updates.push((_, t) => {
      const a0 = t * 0.03;
      wheel.rotation.z = a0;
      for (let k = 0; k < 32; k++) {
        const a = a0 + (k / 32) * Math.PI * 2;
        o.position.set(hx + Math.cos(a) * (R + 0.6), hy + Math.sin(a) * (R + 0.6), hz - 1.4);
        o.updateMatrix();
        caps.setMatrixAt(k, o.matrix);
      }
      caps.instanceMatrix.needsUpdate = true;
    });
  }

  /* ---------------- the city: brick and stone blocks, a park, the skyline ---------------- */
  const park = (x: number, z: number) => x > -330 && x < -200 && z > 60 && z < 200;
  const busy = (x: number, z: number) => inRiver(x, z, 10) || park(x, z) || (x > -175 && x < -20 && z > 60 && z < 98) || (Math.hypot(x + 40, z + 36) < 34) || (Math.hypot(x + 136, z - 30) < 14);
  fillGrid(c, { x0: -420, x1: 420, z0: -420, z1: 420, step: 30, street: 9 }, (x, z) => {
    if (busy(x, z)) return null;
    const far = Math.hypot(x, z) > 300, r = rand();
    if (r < 0.55) return { kind: 'brick', h: 9 + rand() * 7 + (far ? 8 : 0), roof: rand() < 0.6 ? 'pitched' : 'flat', roofColor: 0x5a4a44, tint: [0xffffff, 0xf0d8c8, 0xe0c8b8][Math.floor(rand() * 3)] };
    return { kind: rand() < 0.75 ? 'stone' : 'office', h: 14 + rand() * 12 + (far ? 14 : 0), roof: 'flat', roofColor: 0x8c8f96, tint: [0xffffff, 0xf5ecd8, 0xe8e2d4][Math.floor(rand() * 3)] };
  });
  patch(c, [[-330, 60], [-200, 60], [-200, 200], [-330, 200]], 0x5aa646);
  for (let k = 0; k < 40; k++) tree(c, -320 + rand() * 110, 70 + rand() * 120, 'round', 1.4);
  // embankment plane trees and benches
  for (let i = 0; i < F.length; i += 9) {
    const f = F[i];
    for (const sg of [-1, 1]) {
      const P = side(f, sg * (f.w + KERB + f.apron + 5));
      if (!c.clear(P.x, P.z, 0.8) || inRiver(P.x, P.z, 3) || busy(P.x, P.z) && !inRiver(P.x, P.z, 10)) continue;
      if (rand() < 0.55) tree(c, P.x, P.z, 'round', 1.15);
      else if (rand() < 0.4) { world.add(U.box, 0xd32f2f, P.x, 1.25, P.z, 1.0, 2.5, 1.0, 0, f.yaw, 0); glass.add(U.box, 0x2a3a50, P.x, 1.5, P.z, 1.02, 1.4, 0.8, 0, f.yaw, 0); world.add(U.box, 0xb71c1c, P.x, 2.6, P.z, 1.1, 0.25, 1.1, 0, f.yaw, 0); } // phone box
    }
  }
  // dome cathedral and glass towers on the skyline
  { const x = 170, z = 175; building(c, 'stone', x, z, 40, 60, 22, 0, { tint: 0xf3eee4, roof: 'flat', roofColor: 0xd8d2c4 }); world.add(U.cyl, 0xf3eee4, x, 30, z, 12, 16, 12); world.add(U.ball, 0x8a9aa6, x, 38, z, 12.5, 11, 12.5); world.add(U.cyl, 0xf3eee4, x, 50, z, 2, 4, 2); glossy.add(U.ball, 0xd4af37, x, 53, z, 1.2, 1.2, 1.2); }
  glass.add(new THREE.ConeGeometry(1, 1, 4), 0x8fb6d6, 250, 85, -190, 24, 170, 24, 0, Math.PI / 4, 0);
  glass.add(U.ball, 0x4f8a9a, 280, 50, 140, 14, 50, 14);
  for (let k = 0; k < 8; k++) building(c, 'glass', 240 + k * 22, -260 + (k % 3) * 30, 18, 18, 50 + rand() * 50, 0, { roof: 'flat' });

  /* ---------------- start, signs, crowds, bunting, lamps ---------------- */
  const lampsM = startGantry(track, group, glossy, 'LONDON LOOP', ['#c8102e', '#012169'], 0x2b2f3a, 0xffffff);
  billboards(track, group, world, [
    [3, ['MIND THE GAP!'], ['#c8102e', '#ff5a5a']],
    [10, ['WELCOME TO', 'LONDON'], ['#012169', '#3d6bd4']],
    [14, ['FANCY A CUPPA?'], ['#14915f', '#7ee08a']],
    [16, ['KEEP CALM', 'AND DRIVE ON'], ['#c8102e', '#012169']],
  ], c.clear);
  crowd(c, roadsideSpots(c, 6, track.cpS[2], { sides: [-1], rows: 3 }));
  crowd(c, roadsideSpots(c, track.cpS[9], track.cpS[10] + 10, { rows: 2 }));
  crowd(c, roadsideSpots(c, track.cpS[12], track.cpS[13] + 20, { sides: [1], rows: 2 }));
  bunting(c, 10, track.cpS[2], 22, [0xc8102e, 0xffffff, 0x012169]);
  bunting(c, track.cpS[11], track.cpS[13], 24, [0xc8102e, 0xffffff, 0x012169]);
  lamps(c, 28, 0x1f2a24, 0xffe2a0, (f) => !inRiver(f.p.x, f.p.z, 2));
  walkers(c, 70, (f) => !inRiver(f.p.x, f.p.z, 4));

  /* ---------------- life: buses and cabs, boats, pigeons ---------------- */
  traffic(c, gridLanes(c, { x0: -420, x1: 420, z0: -420, z1: 420, step: 30 }, (x, z) => inRiver(x, z, 8) || park(x, z)), [
    { kind: 'double', colors: [0xd32f2f], n: 16, speed: 8 },
    { kind: 'cab', colors: [0x1b1d24, 0x22252c], n: 22, speed: 10 },
    { kind: 'car', colors: [0xf4f4f2, 0x3d8bff, 0x2b2f3a, 0x9aa0a8, 0x14915f], n: 30 },
  ]);
  boats(c, [[-460, 7], [0, 9], [460, 7], [460, -7], [0, -9], [-460, -7]], -2.6, [
    { color: 0xf4f4f2, len: 18, kind: 'tour' }, { color: 0xd32f2f, len: 8, kind: 'speed' }, { color: 0x1e3a6e, len: 16, kind: 'tour' }, { color: 0xffc61a, len: 7, kind: 'speed' },
  ]);
  birds(c, 0, 60, 120, 40, 16);
  cloudRing(group, 0, 0, 22, rand, { tint: 0xe6edf5, glow: 0.6, y0: 105 });

  return done(c, lampsM, { waterY: -2.5, oceans: [water.uniforms] });
}
