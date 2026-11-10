/* English Racers — "Sunny Bay" (≈0.9 km): the start on the seaside boardwalk, a sweeper onto the
   first pier, a hairpin around the end of the bay in front of the lighthouse, back along the second
   pier with a ramp jump over open water, then a sandy S where crabs scuttle across the road and a
   palm-lined loop back to the boardwalk. Scenery: dunes and wet sand, a living ocean (waves, foam
   on the crests and the shore), piers on timber piles, the lighthouse with a turning beam,
   palms, umbrellas and towels, a lifeguard tower, beach huts, sailboats and buoys that bob,
   seagulls circling and dolphins jumping in the bay. */
import * as THREE from 'three';
import { Geo, U, shade } from '@/features/run/gfx';
import { makeOcean, oceanGeometry } from '@/features/run/ocean';
import { KERB, type Track, type TrackDef } from '../track';
import { side, type TrackStyle } from '../trackMesh';
import { MATS, billboards, cloudRing, disposeGroup, mergeInto, startGantry, type Hazard, type Scenery } from '../scenery';

export const BEACH: TrackDef = {
  id: 'beach', name: 'Sunny Bay', laps: 3, waterY: -1.2,
  cps: [
    { x: -39.9, z: -38.7, y: 0.5 },
    { x: 19.1, z: -34.3, y: 0.5 },
    { x: 51.5, z: -23.7, y: 0.8 },
    { x: 66, z: 4, y: 1.6, apron: 2 },
    { x: 67, z: 50, y: 2.2, apron: 1.2 },
    { x: 69, z: 100, y: 2.2, apron: 1.2 },
    { x: 86.1, z: 125.7, y: 2.2, apron: 2 },
    { x: 108.4, z: 131.4, y: 2.2, apron: 2 },
    { x: 129.1, z: 121.9, y: 2.2, apron: 2 },
    { x: 140, z: 96, y: 2.2, apron: 1.2 },
    { x: 138, z: 52, y: 2.2, apron: 1.2 },
    { x: 134, z: 8, y: 1.6, apron: 2 },
    { x: 126, z: -38, y: 0.8 },
    { x: 104, z: -76, y: 0.5 },
    { x: 66, z: -92, y: 0.5 },
    { x: 29.3, z: -88.8, y: 0.5 },
    { x: -8, z: -100, y: 0.5 },
    { x: -46, z: -94.3, y: 0.5 },
    { x: -88, z: -101, y: 0.5 },
    { x: -105.3, z: -94.3, y: 0.5 },
    { x: -115.2, z: -80.3, y: 0.5 },
    { x: -115.9, z: -62.5, y: 0.5 },
    { x: -106.9, z: -47.2, y: 0.5 },
    { x: -91, z: -39, y: 0.5 },
  ],
  features: [
    { kind: 'boost', at: 1, off: 0, d: 0 },
    { kind: 'boost', at: 4, off: 10, d: -2.5 },
    { kind: 'boost', at: 4, off: 10, d: 2.5 },
    { kind: 'ramp', at: 9, off: 4, len: 12, h: 2.2 },
    { kind: 'gap', at: 9, off: 16, len: 12 },
    { kind: 'boost', at: 14, off: 4, d: 0 },
  ],
  items: [{ at: 3, off: 8 }, { at: 6, off: 4 }, { at: 13, off: 12 }, { at: 19, off: 6 }],
  gates: [{ at: 0, off: 26 }, { at: 11, off: 8 }],
  coins: [
    { at: 2, off: 6, d: -2, n: 5, dd: 0.8 },
    { at: 4, off: 26, d: 0, n: 6 },
    { at: 7, off: 0, d: -2, n: 5 },
    { at: 10, off: 4, d: 2.5, n: 5 },
    { at: 14, off: 16, d: -2.5, n: 5, dd: 1 },
    { at: 16, off: 10, d: 2, n: 4 },
    { at: 18, off: 10, d: 0, n: 5 },
    { at: 21, off: 6, d: -2, n: 4 },
  ],
};

export const BEACH_STYLE: TrackStyle = { road: 'planks', kerb: [0x2a8fd6, 0xf6f4ee], apron: [0xeedba8, 0xe6d29c], wall: 'rail', edge: 'sheer', side: 'pier', gapFace: 0x6b4a2e, baseY: -6.5 };

const ISLE = { x: 108, z: 186 };

export function buildBeach(track: Track): Scenery {
  const M = MATS();
  const group = new THREE.Group();
  const F = track.frames;
  const near = F.filter((_, i) => i % 2 === 0), sparse = F.filter((_, i) => i % 4 === 0);
  const clear = (x: number, z: number, r: number) => near.every((f) => Math.hypot(x - f.p.x, z - f.p.z) > f.w + KERB + f.apron + 2 + r);
  let seed = 23;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const world = new Geo(), glossy = new Geo(), glow = new Geo();
  glow.boost = 1.7;
  const waterY = -1.2;

  /* ---------------- the ground: dunes, beach, the slope into the sea, the lighthouse rock ---------------- */
  const shoreZ = (x: number) => 14 + 8 * Math.sin(x * 0.011 + 0.6);
  const nearRoad = (x: number, z: number) => { let m = Infinity, y = 0; for (const f of sparse) { const d = Math.hypot(x - f.p.x, z - f.p.z) - f.w - KERB - f.apron; if (d < m) { m = d; y = f.p.y; } } return { d: m, y }; };
  const groundY = (x: number, z: number) => {
    const sz = shoreZ(x);
    let y = THREE.MathUtils.lerp(0.06, -6, THREE.MathUtils.smoothstep(z, sz - 6, sz + 50));
    const nr = nearRoad(x, z);
    const dune = THREE.MathUtils.smoothstep(-z, 112, 160) * (2.4 + Math.sin(x * 0.05) * 1.4 + Math.cos(x * 0.023 + z * 0.04) * 1.1) + THREE.MathUtils.smoothstep(Math.abs(x - 10), 150, 230) * 3 * THREE.MathUtils.smoothstep(-z + sz, 0, 40);
    y += dune * THREE.MathUtils.smoothstep(nr.d, 10, 40);
    const isl = Math.hypot(x - ISLE.x, z - ISLE.z);
    if (isl < 26) y = Math.max(y, -6 + (1 - isl / 26) * 8 + Math.sin(x * 0.7) * Math.cos(z * 0.6) * 0.5);
    // the land under the boardwalk sections comes up to the road
    const flat = THREE.MathUtils.clamp((1.3 - nr.y) / 0.6, 0, 1) * (1 - THREE.MathUtils.smoothstep(nr.d, 1, 7));
    if (flat > 0) y = THREE.MathUtils.lerp(y, nr.y - 0.06, flat);
    return y;
  };
  {
    const S = 1200, n = 170, cx = 10, cz = 30;
    const geo = new THREE.PlaneGeometry(S, S, n, n);
    geo.rotateX(-Math.PI / 2);
    geo.translate(cx, 0, cz);
    const pos = geo.getAttribute('position'), col = new Float32Array(pos.count * 3), c = new THREE.Color();
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i), y = groundY(x, z);
      pos.setY(i, y);
      const n1 = Math.sin(x * 0.19) * Math.cos(z * 0.17) * 0.5 + Math.sin(x * 0.05 + z * 0.043) * 0.5;
      c.setHex(0xf0dca8).offsetHSL(0.005 * n1, 0.02 * n1, 0.03 * n1);
      if (y < 0.4 && y > waterY - 0.2) c.lerp(new THREE.Color(0xc8ac78), THREE.MathUtils.smoothstep(0.4 - y, 0, 1.2) * 0.85);
      if (y <= waterY - 0.2) c.setHex(0xd6c08a).lerp(new THREE.Color(0x6aa6a0), THREE.MathUtils.smoothstep(waterY - y, 0.5, 5));
      if (y > 1.5 && Math.sin(x * 0.3 + z * 0.2) > 0.2) c.lerp(new THREE.Color(0x8db45a), 0.55);
      if (Math.hypot(x - ISLE.x, z - ISLE.z) < 20 && y > waterY - 0.5) c.setHex(0x8f8a80).offsetHSL(0, 0, n1 * 0.06);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, M.world);
    m.receiveShadow = true;
    group.add(m);
  }

  /* ---------------- the ocean ---------------- */
  const ocean = makeOcean({ deep: 0x0b5d92, shallow: 0x35dccc, amp: 0.32, scale: 1.1, dir: [0.15, -1] });
  {
    const geo = oceanGeometry(20, 330, 1500, 820, 150, 82, (x, z) => waterY - groundY(x, z));
    const m = new THREE.Mesh(geo, ocean.material);
    m.position.y = waterY;
    m.receiveShadow = true;
    m.renderOrder = 1;
    group.add(m);
  }

  /* ---------------- pier piles and braces ---------------- */
  for (let i = 0; i < F.length; i += 4) {
    const f = F[i];
    if (f.p.y < 1.2 || track.gapAt(f.s)) continue;
    for (const sg of [-1, 1]) {
      const P = side(f, sg * (f.w + KERB + f.apron + 0.3));
      const gy = groundY(P.x, P.z);
      const h = P.y - gy + 0.2;
      if (h < 0.5) continue;
      world.add(U.cyl, 0x5d3f26, P.x, gy + h / 2 - 0.2, P.z, 0.26, h, 0.26);
      if (i % 8 === 0) world.add(U.box, 0x6b4a2e, P.x, P.y - 1.1, P.z, 0.16, 0.22, 4.2, 0, f.yaw, 0);
    }
    if (i % 8 === 0) {
      const A = side(f, -(f.w + KERB + f.apron + 0.3)), B = side(f, f.w + KERB + f.apron + 0.3);
      world.add(U.box, 0x5a3c24, (A.x + B.x) / 2, A.y - 0.9, (A.z + B.z) / 2, Math.hypot(A.x - B.x, A.z - B.z), 0.2, 0.2, 0, f.yaw, 0);
    }
    // bunting poles along the piers
    if (i % 24 === 0) for (const sg of [-1, 1]) {
      const P = side(f, sg * (f.w + KERB + f.apron + 0.3));
      glossy.cyl(P.x, P.y, P.z, 0.06, 3.2, 0xf4f4f2);
      glossy.add(U.box, [0xff4d6d, 0xffc531, 0x3d8bff, 0x2fd27a][(i / 24 + (sg > 0 ? 1 : 0)) % 4], P.x + f.t.x * 0.55, P.y + 2.8, P.z + f.t.z * 0.55, 0.03, 0.6, 1.1, 0, f.yaw, 0);
    }
  }

  /* ---------------- the lighthouse on its rock ---------------- */
  const beam = new THREE.Group();
  {
    const { x, z } = ISLE, base = 1.2;
    for (let k = 0; k < 7; k++) world.add(U.cyl, k % 2 ? 0xe23b3b : 0xf6f4ee, x, base + k * 2.2 + 1.1, z, 2.6 - k * 0.16, 2.2, 2.6 - k * 0.16);
    world.cyl(x, base + 15.4, z, 2.2, 0.5, 0x2b2f3a);
    glossy.add(U.cyl, 0x2b2f3a, x, base + 18.7, z, 1.2, 0.3, 1.2);
    glow.cyl(x, base + 15.9, z, 1.1, 2.4, 0xfff1b0);
    world.add(new THREE.ConeGeometry(1, 1, 16), 0xe23b3b, x, base + 19.4, z, 1.6, 1.4, 1.6);
    world.box(x, base - 0.4, z, 9, 1.6, 9, 0xd0cbc0);
    world.box(x + 4, base, z - 3, 3.5, 2.6, 3, 0xf6f4ee);
    world.add(new THREE.ConeGeometry(1, 1, 4), 0x3b6fb6, x + 4, base + 3.2, z - 3, 2.8, 1.4, 2.6, 0, Math.PI / 4, 0);
    for (let k = 0; k < 18; k++) { const a = rand() * Math.PI * 2, r = 9 + rand() * 12; world.blob(x + Math.cos(a) * r, waterY + rand() * 1.2, z + Math.sin(a) * r, 1.2 + rand() * 2, shade(0x7f7a72, (rand() - 0.5) * 0.1), 0.6); }
    const cone = new THREE.Mesh(new THREE.ConeGeometry(4, 34, 24, 1, true), new THREE.MeshBasicMaterial({ color: new THREE.Color(1.4, 1.3, 0.8), transparent: true, opacity: 0.16, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false, fog: false }));
    cone.rotation.z = Math.PI / 2;
    cone.position.x = 17;
    beam.add(cone);
    beam.position.set(x, base + 16.9, z);
    group.add(beam);
  }

  /* ---------------- palms ---------------- */
  const palm = (x: number, z: number, h: number) => {
    const y = groundY(x, z) - 0.2, dir = rand() * Math.PI * 2, lean = 0.12 + rand() * 0.18, segs = 7;
    for (let i = 0; i < segs; i++) {
      const tt = (i + 0.5) / segs, ox = Math.cos(dir) * lean * tt * tt * h, oz = Math.sin(dir) * lean * tt * tt * h;
      world.add(U.cyl, i % 2 ? 0x9b7a52 : 0x86663f, x + ox, y + tt * h, z + oz, 0.24 - tt * 0.08, (h / segs) * 1.08, 0.24 - tt * 0.08, Math.sin(dir) * lean * tt, 0, -Math.cos(dir) * lean * tt);
    }
    const tx = x + Math.cos(dir) * lean * h, tz = z + Math.sin(dir) * lean * h, ty = y + h;
    const green = [0x3f9a3a, 0x4caf50, 0x2f8a3f][Math.floor(rand() * 3)];
    for (let k = 0; k < 8; k++) {
      const a = (k / 8) * Math.PI * 2 + rand() * 0.3;
      for (let j = 0; j < 4; j++) {
        const r = 0.5 + j * 0.75, droop = 0.15 + j * 0.28;
        world.add(U.box, shade(green, j * 0.03), tx + Math.cos(a) * r, ty + 0.25 - j * j * 0.16, tz + Math.sin(a) * r, 0.85, 0.06, 0.5 - j * 0.09, 0, -a, -droop);
      }
    }
    for (let k = 0; k < 3; k++) world.add(U.ball, 0x6b4a2b, tx + Math.cos(k * 2.1) * 0.3, ty - 0.25, tz + Math.sin(k * 2.1) * 0.3, 0.2, 0.2, 0.2);
  };
  let palms = 0;
  for (let tries = 0; tries < 2400 && palms < 120; tries++) {
    const x = -170 + rand() * 360, z = -190 + rand() * 210;
    if (z > shoreZ(x) - 6 || !clear(x, z, 2.5)) continue;
    if (nearRoad(x, z).d > 70) continue;
    palm(x, z, 6 + rand() * 4);
    palms++;
  }
  // a line of palms on the boardwalk side of the start straight
  for (let k = 0; k < 9; k++) { const f = track.frame(Math.round((track.length - 40 + k * 14) / track.ds) % F.length); const P = side(f, -(f.w + KERB + f.apron + 3)); if (clear(P.x, P.z, 0.5)) palm(P.x, P.z, 7.5); }

  /* ---------------- the beach: umbrellas, towels, balls, a sandcastle, lifeguard tower, volleyball ---------------- */
  const stripes = [[0xff4d6d, 0xffffff], [0x3d8bff, 0xffffff], [0xffc531, 0xff7a1a], [0x2fd27a, 0xffffff], [0xb46bff, 0xffd23f]];
  for (let i = 0; i < 46; i++) {
    const x = -150 + rand() * 330, sz = shoreZ(x), z = -20 + rand() * (sz - 22);
    if (!clear(x, z, 2)) continue;
    const y = groundY(x, z), s = stripes[Math.floor(rand() * stripes.length)];
    glossy.cyl(x, y, z, 0.05, 2.4, 0xf4f4f2);
    for (let k = 0; k < 8; k++) glossy.add(new THREE.ConeGeometry(1.4, 0.55, 3, 1, true, 0, Math.PI / 4), s[k % 2], x, y + 2.35, z, 1, 1, 1, 0, (k * Math.PI) / 4, 0);
    world.add(U.box, [0xffffff, 0x36c2ff, 0xff8fb0, 0xffe066][i % 4], x + 1.1, y + 0.03, z + 0.6, 0.9, 0.04, 1.8, 0, rand() * 3, 0);
    if (i % 5 === 0) world.add(U.ball, 0xff4d6d, x - 1.2, y + 0.25, z + 0.8, 0.25, 0.25, 0.25);
  }
  {
    const x = 0, z = -6, y = groundY(x, z);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) world.add(U.box, 0xf4f4f2, x + dx * 1.1, y + 1.6, z + dz * 1.1, 0.16, 3.2, 0.16);
    world.box(x, y + 3.2, z, 2.8, 0.25, 2.8, 0xf4f4f2);
    world.box(x, y + 3.45, z, 2.2, 1.6, 2.2, 0xe23b3b);
    world.add(new THREE.ConeGeometry(1, 1, 4), 0xf6f4ee, x, y + 5.6, z, 2.2, 1.1, 2.2, 0, Math.PI / 4, 0);
    glossy.cyl(x + 1.2, y + 3.4, z, 0.04, 2.2, 0xd0d0d0);
    glossy.add(U.box, 0xff3d3d, x + 1.2, y + 5.3, z + 0.35, 0.02, 0.45, 0.7);
    // sandcastle
    const sx = 30, sz = -2, sy = groundY(sx, sz);
    world.box(sx, sy, sz, 2.4, 0.6, 2.4, 0xe2c88e);
    for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { world.cyl(sx + dx, sy + 0.6, sz + dz, 0.38, 0.8, 0xe2c88e); world.add(new THREE.ConeGeometry(1, 1, 8), 0xd9bd82, sx + dx, sy + 1.6, sz + dz, 0.42, 0.4, 0.42); }
    // volleyball net
    const vx = -60, vz = -8, vy = groundY(vx, vz);
    for (const s of [-1, 1]) world.cyl(vx + s * 5, vy, vz, 0.07, 2.6, 0xf4f4f2);
    world.box(vx, vy + 1.6, vz, 10, 0.9, 0.04, 0xeeeeee);
  }

  /* ---------------- beach huts behind the sandy S ---------------- */
  const hutCols = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xda77f2, 0xffa94d];
  for (let k = 0; k < 14; k++) {
    const x = -130 + k * 18 + rand() * 4, z = -136 - rand() * 10;
    if (!clear(x, z, 4)) continue;
    const y = groundY(x, z), c = hutCols[k % hutCols.length];
    world.box(x, y - 0.3, z, 3.4, 3.2, 3, c);
    for (let j = 0; j < 4; j++) world.box(x - 1.3 + j * 0.86, y - 0.3, z + 1.52, 0.4, 3.2, 0.04, 0xffffff);
    world.add(new THREE.ConeGeometry(1, 1, 4), shade(c, -0.15), x, y + 3.5, z, 2.9, 1.6, 2.6, 0, Math.PI / 4, 0);
    world.box(x, y - 0.3, z + 1.6, 1, 2.1, 0.1, 0x7a4b2a);
  }

  /* ---------------- boardwalk lamps ---------------- */
  for (let i = 6; i < F.length; i += 22) {
    const f = F[i];
    if (track.gapAt(f.s)) continue;
    const sg = f.curv > 0 ? 1 : -1;
    const P = side(f, sg * (f.w + KERB + f.apron + 0.7));
    if (!clear(P.x, P.z, -2.5)) continue;
    glossy.cyl(P.x, P.y, P.z, 0.08, 4.6, 0x2e5f9a);
    glossy.add(U.ball, 0x2e5f9a, P.x, P.y + 4.6, P.z, 0.18, 0.18, 0.18);
    glow.add(U.ball, 0xfff3c4, P.x, P.y + 4.9, P.z, 0.26, 0.3, 0.26);
  }

  /* ---------------- distant headlands ---------------- */
  for (let k = 0; k < 14; k++) {
    const a = Math.PI * 0.1 + (k / 13) * Math.PI * 0.8, r = 780 + rand() * 120;
    world.add(U.blob, shade(0x6aa86a, (rand() - 0.5) * 0.08), 20 + Math.cos(a) * r * 1.2, -30, 30 - Math.sin(a) * r, 120 + rand() * 80, 60 + rand() * 50, 110 + rand() * 60);
  }
  for (const [x, z, s] of [[-420, 520, 1], [520, 560, 1.3], [80, 760, 0.8]] as const) world.add(U.blob, 0x5e9a62, x, -18, z, 70 * s, 34 * s, 50 * s);

  /* ---------------- start gantry, billboards, clouds ---------------- */
  const lamps = startGantry(track, group, glossy, 'SUNNY BAY', ['#0aa5d8', '#36e0c8'], 0x2e5f9a, 0xffc531);
  billboards(track, group, world, [
    [3, ["SURF'S UP!"], ['#0aa5d8', '#36e0c8']],
    [8, ['LIGHTHOUSE', 'HAIRPIN'], ['#e23b3b', '#ff9f1c']],
    [12, ['SPEAK ENGLISH', 'EVERY DAY'], ['#2e5fa7', '#7cc8ff']],
    [19, ['MIND THE CRABS!'], ['#ff6b4a', '#ffc531']],
  ], clear, 0x5d3f26);
  cloudRing(group, 20, 40, 18, rand);

  /* ---------------- life: sailboats, buoys, gulls, dolphins ---------------- */
  const live = new THREE.Group();
  group.add(live);
  const lifeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.05 });
  const boats: { m: THREE.Mesh; x: number; z: number; ph: number; vx: number }[] = [];
  for (let k = 0; k < 6; k++) {
    const g = new Geo();
    const hull = [0xffffff, 0x2e5fa7, 0xe23b3b][k % 3];
    g.add(U.box, hull, 0, 0.4, 0, 1.8, 0.8, 5.5);
    g.add(new THREE.ConeGeometry(0.9, 1.6, 4), hull, 0, 0.4, 3.4, 1.0, 1, 0.5, Math.PI / 2, Math.PI / 4, 0);
    g.add(U.box, 0x8a6a45, 0, 0.82, 0, 1.6, 0.06, 5);
    g.add(U.cyl, 0xdddddd, 0, 4.4, 0.3, 0.07, 7, 0.07);
    const sail = new THREE.BufferGeometry();
    sail.setAttribute('position', new THREE.Float32BufferAttribute([0, 1.2, 0.4, 0, 7.6, 0.35, 0, 1.2, -2.4, 0, 1.2, 0.8, 0, 6.2, 0.55, 0, 1.2, 3.2], 3));
    sail.computeVertexNormals();
    g.add(sail, [0xffffff, 0xffe066, 0xff8fb0][k % 3], 0, 0, 0, 1, 1, 1);
    const m = new THREE.Mesh(g.build(), lifeMat);
    m.castShadow = true;
    const a = -0.6 + rand() * 1.2, r = 230 + rand() * 260;
    boats.push({ m, x: 60 + Math.sin(a) * r, z: 120 + Math.cos(a) * r * 0.8, ph: rand() * 6, vx: (rand() - 0.5) * 1.2 });
    m.rotation.y = rand() * 6;
    live.add(m);
  }
  const buoys: { m: THREE.Mesh; x: number; z: number; ph: number }[] = [];
  for (let k = 0; k < 10; k++) {
    const g = new Geo();
    g.add(U.cyl, k % 2 ? 0xe23b3b : 0xffc531, 0, 0.3, 0, 0.55, 1.2, 0.55);
    g.add(U.box, 0xffffff, 0, 0.5, 0, 1.12, 0.25, 1.12);
    g.add(U.cyl, 0x2b2f3a, 0, 1.2, 0, 0.05, 0.8, 0.05);
    const m = new THREE.Mesh(g.build(), lifeMat);
    const x = 30 + rand() * 160, z = 40 + rand() * 150;
    if (!clear(x, z, 3) || Math.hypot(x - ISLE.x, z - ISLE.z) < 28) continue;
    buoys.push({ m, x, z, ph: rand() * 6 });
    live.add(m);
  }
  const gullGeo = new Geo();
  gullGeo.add(U.ball, 0xf6f4ee, 0, 0, 0, 0.18, 0.16, 0.5);
  gullGeo.add(U.ball, 0xffc531, 0, 0.02, 0.48, 0.05, 0.05, 0.12);
  const bodyG = gullGeo.build();
  const wingG = new Geo().add(U.box, 0xe9ecef, 0.55, 0, 0, 1.1, 0.03, 0.34).add(U.box, 0x3a3f4b, 1.15, 0, -0.04, 0.2, 0.031, 0.3).build();
  const gulls: { g: THREE.Group; wl: THREE.Mesh; wr: THREE.Mesh; cx: number; cz: number; r: number; y: number; sp: number; ph: number }[] = [];
  for (let k = 0; k < 14; k++) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(bodyG, lifeMat), wl = new THREE.Mesh(wingG, lifeMat), wr = new THREE.Mesh(wingG, lifeMat);
    wr.scale.x = -1;
    g.add(b, wl, wr);
    g.scale.setScalar(1.3);
    gulls.push({ g, wl, wr, cx: 40 + rand() * 120, cz: -10 + rand() * 160, r: 14 + rand() * 30, y: 12 + rand() * 14, sp: (0.25 + rand() * 0.3) * (rand() < 0.5 ? -1 : 1), ph: rand() * 6 });
    live.add(g);
  }
  const dolG = new Geo();
  dolG.add(U.ball, 0x6f8fa8, 0, 0, 0, 0.45, 0.42, 1.3);
  dolG.add(U.ball, 0xdfe7ee, 0, -0.15, 0.1, 0.36, 0.28, 1.1);
  dolG.add(U.ball, 0x6f8fa8, 0, -0.05, 1.3, 0.14, 0.12, 0.35);
  dolG.add(new THREE.ConeGeometry(0.3, 0.6, 4), 0x5d7d96, 0, 0.5, -0.1, 0.4, 1, 1, -0.5, 0, 0);
  dolG.add(U.box, 0x5d7d96, 0, 0, -1.35, 1.1, 0.06, 0.32);
  const dolGeo = dolG.build();
  const dolphins: { m: THREE.Mesh; x: number; z: number; ph: number; dir: number }[] = [];
  for (let k = 0; k < 3; k++) {
    const m = new THREE.Mesh(dolGeo, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.1 }));
    m.scale.setScalar(1.25);
    dolphins.push({ m, x: 92 + k * 9, z: 70 + k * 18, ph: k * 2.3, dir: k % 2 ? 0 : Math.PI });
    live.add(m);
  }

  /* ---------------- crabs on the sandy S (moving hazards) ---------------- */
  const hazards: Hazard[] = [];
  const crabs: { m: THREE.Mesh; h: Hazard; w: number; ph: number; sp: number }[] = [];
  const crabG = new Geo();
  crabG.add(U.ball, 0xe8452c, 0, 0.32, 0, 0.55, 0.28, 0.42);
  for (const sg of [-1, 1]) {
    for (let j = 0; j < 3; j++) crabG.add(U.box, 0xc8361f, sg * 0.62, 0.2, -0.2 + j * 0.2, 0.5, 0.06, 0.06, 0, 0, sg * -0.6);
    crabG.add(U.ball, 0xe8452c, sg * 0.45, 0.42, 0.55, 0.2, 0.14, 0.24);
    crabG.add(U.cyl, 0xc8361f, sg * 0.16, 0.66, 0.25, 0.03, 0.25, 0.03);
    crabG.add(U.ball, 0xffffff, sg * 0.16, 0.8, 0.27, 0.07, 0.07, 0.07);
    crabG.add(U.ball, 0x10204a, sg * 0.16, 0.81, 0.32, 0.035, 0.035, 0.035);
  }
  const crabGeo = crabG.build();
  for (const [cp, off] of [[15, 8], [16, 2], [17, 6]] as const) {
    const s = (track.oS[cp] + off) % track.length, f = track.frame(Math.round(s / track.ds));
    const h: Hazard = { s, d: 0, hs: 0.5, hd: 0.6, on: true, kind: 'crab' };
    const m = new THREE.Mesh(crabGeo, lifeMat);
    m.castShadow = true;
    m.scale.setScalar(1.2);
    hazards.push(h);
    crabs.push({ m, h, w: f.w + KERB + 1.2, ph: rand() * 10, sp: 0.16 + rand() * 0.06 });
    live.add(m);
  }

  mergeInto(group, M, { world, glossy, glow });
  const v = new THREE.Vector3();
  return {
    group, lamps, waters: [], oceans: [ocean.uniforms], waterY, hazards,
    update(dt, t) {
      beam.rotation.y = t * 0.7;
      for (const b of boats) {
        b.x += b.vx * dt;
        b.m.position.set(b.x, waterY + Math.sin(t * 1.1 + b.ph) * 0.25 - 0.1, b.z);
        b.m.rotation.z = Math.sin(t * 0.9 + b.ph) * 0.06;
        b.m.rotation.x = Math.sin(t * 0.7 + b.ph * 2) * 0.04;
      }
      for (const b of buoys) { b.m.position.set(b.x, waterY - 0.3 + Math.sin(t * 1.6 + b.ph) * 0.22, b.z); b.m.rotation.set(Math.sin(t * 1.3 + b.ph) * 0.15, 0, Math.cos(t * 1.1 + b.ph) * 0.15); }
      for (const g of gulls) {
        const a = t * g.sp + g.ph;
        g.g.position.set(g.cx + Math.cos(a) * g.r, g.y + Math.sin(t * 0.5 + g.ph) * 1.5, g.cz + Math.sin(a) * g.r);
        g.g.rotation.set(0, -a + (g.sp > 0 ? Math.PI : 0), (g.sp > 0 ? -1 : 1) * 0.25);
        const flap = Math.sin(t * 7 + g.ph * 3) * 0.55 * (0.5 + 0.5 * Math.sin(t * 0.8 + g.ph));
        g.wl.rotation.z = flap; g.wr.rotation.z = -flap;
      }
      for (const d of dolphins) {
        const cyc = (t + d.ph) % 7, jump = cyc < 1.5;
        d.m.visible = jump;
        if (jump) {
          const u = cyc / 1.5, along = (u - 0.5) * 9;
          const dir = d.dir + Math.floor((t + d.ph) / 7) * 1.3;
          d.m.position.set(d.x + Math.sin(dir) * along, waterY - 0.8 + Math.sin(u * Math.PI) * 3.4, d.z + Math.cos(dir) * along);
          d.m.rotation.set(-Math.cos(u * Math.PI) * 1.0, dir, 0);
        }
      }
      for (const c of crabs) {
        // walk across, pause at the edge, walk back
        const cyc = (t * c.sp + c.ph) % 2, u = cyc < 1 ? cyc : 2 - cyc;
        const e = THREE.MathUtils.smoothstep(u, 0.08, 0.92);
        c.h.d = (e * 2 - 1) * c.w;
        track.pointAt(c.h.s, c.h.d, v);
        const f = track.frame(Math.round(c.h.s / track.ds));
        c.m.position.set(v.x, v.y + Math.abs(Math.sin(t * 14 + c.ph)) * 0.05, v.z);
        c.m.rotation.y = f.yaw + Math.sin(t * 14 + c.ph) * 0.08;
      }
    },
    dispose: () => { disposeGroup(group); lifeMat.dispose(); },
  };
}
