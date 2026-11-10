/* English Racers — "Tokyo Drift Lights" (≈0.86 km) at dusk, inspired by Tokyo: the start through a
   huge scramble crossing (crowds crossing every way), a street of glowing paper lanterns and neon
   signs, a long straight beside a viaduct where bullet trains whoosh by, a hairpin around a red
   lattice tower, a jump over a canal, and a park of cherry trees (falling petals) with a giant
   red gate over the road and a five-storey pagoda. A snowy volcano on the horizon. */
import * as THREE from 'three';
import { Geo, U } from '@/features/run/gfx';
import { KERB, type Track, type TrackDef } from '../track';
import { side, type TrackStyle } from '../trackMesh';
import { billboards, cloudRing, rippleTex, startGantry, type Scenery } from '../scenery';
import { birds, building, city, crowd, done, fallers, fillGrid, gridLanes, ground, lamps, lanterns, patch, roadsideSpots, screens, strollers, traffic, tree, walkers } from './city';

export const TOKYO: TrackDef = {
  id: 'tokyo', name: 'Tokyo Drift Lights', laps: 3, waterY: -1.6,
  cps: [
    { x: -5, z: -41 }, { x: 0, z: 46 }, { x: 5, z: 109 }, { x: 29, z: 140 }, { x: 81, z: 152 }, { x: 132, z: 147 }, { x: 163, z: 121 }, { x: 173, z: 69 }, { x: 173, z: -23 }, { x: 170, z: -98 },
    { x: 155.4, z: -132.4 }, { x: 128.5, z: -140.6 }, { x: 106, z: -129.4 }, { x: 92, z: -106 }, { x: 66.9, z: -88 }, { x: 37, z: -87 }, { x: 11.1, z: -77.4 },
  ],
  features: [
    { kind: 'boost', at: 0, off: 50, d: 0 },
    { kind: 'boost', at: 7, off: 20, d: -2.5 },
    { kind: 'boost', at: 7, off: 20, d: 2.5 },
    { kind: 'ramp', at: 12, off: 16, len: 10, h: 1.7 },
    { kind: 'gap', at: 12, off: 27, len: 8 },
  ],
  items: [{ at: 1, off: 30 }, { at: 5, off: 10 }, { at: 8, off: 30 }, { at: 14, off: 8 }],
  gates: [{ at: 2, off: 19 }, { at: 4, off: 30 }, { at: 8, off: -3 }, { at: 9, off: 32 }],
  coins: [
    { at: 0, off: 20, d: -2.5, n: 5 },
    { at: 3, off: 10, d: 2, n: 5, dd: -0.8 },
    { at: 6, off: 8, d: 0, n: 5 },
    { at: 9, off: 4, d: -2, n: 5 },
    { at: 11, off: 2, d: 0, n: 5 },
    { at: 15, off: 4, d: 2, n: 5 },
  ],
  clear: [{ at: 12, off: -10, len: 50 }],
};

export const TOKYO_STYLE: TrackStyle = { road: 'asphalt', kerb: [0xe53935, 0xf4f4f2], apron: [0xa9aab2, 0x9fa1a9], wall: 'barrier', edge: 'bank', bank: 0x8f8a7c, gapFace: 0xb4ab98, baseY: -0.06 };

const NEON = ['#ff2bd6', '#00e5ff', '#ffd23f', '#7dff6a', '#ff5a3c', '#b46bff'];
const SIGNS = ['RAMEN', 'KARAOKE', 'SUSHI', 'ARCADE', 'MANGA', 'CAFE', 'BOOKS', 'GAMES', 'NOODLES', 'TOYS', 'MUSIC', 'HOTEL'];

function signTex(text: string, col: string) {
  const cv = document.createElement('canvas');
  cv.width = 128; cv.height = 512;
  const g = cv.getContext('2d')!;
  g.fillStyle = '#120a1e'; g.fillRect(0, 0, 128, 512);
  g.strokeStyle = col; g.lineWidth = 10; g.strokeRect(8, 8, 112, 496);
  g.fillStyle = col; g.font = '900 60px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
  const letters = text.split('');
  letters.forEach((ch, i) => g.fillText(ch, 64, 256 + (i - (letters.length - 1) / 2) * Math.min(70, 470 / letters.length)));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildTokyo(track: Track): Scenery {
  const c = city(track, 1964);
  const { world, glossy, glass, glow, group, rand } = c;

  /* ---------------- canal under the jump ---------------- */
  const gp = track.gaps[0], gs = (gp.s0 + gp.s1) / 2, gf = track.frame(Math.round(gs / track.ds));
  const canalZ = gf.p.z, inCanal = (x: number, z: number, m = 0) => Math.abs(z - canalZ) < 7 + m && x > 40 && x < 150;
  ground(c, { cx: track.box.cx, cz: track.box.cz, size: Math.max(1300, track.box.span + 520), step: 30, gx: 0, gz: 0, y: (x, z) => (inCanal(x, z, -2) ? -4 : -0.08), color: (x, z) => (inCanal(x, z, 1) ? 0x8f8a80 : 0xffffff), walk: '#b3b1ad', asphalt: '#3d3f46' });
  {
    const w = new THREE.Mesh(new THREE.PlaneGeometry(110, 14).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x2f6f86, roughness: 0.05, clearcoat: 1, normalMap: rippleTex(), normalScale: new THREE.Vector2(0.2, 0.2), transparent: true, opacity: 0.9 }));
    w.position.set(95, -1.6, canalZ);
    group.add(w);
    for (const sg of [-1, 1]) for (let x = 40; x < 150; x += 5) if (c.clear(x, canalZ + sg * 7.5, -4)) world.add(U.box, 0x9a948a, x + 2.5, -1.2, canalZ + sg * 7.5, 5, 2.8, 1, 0, 0, 0);
  }

  /* ---------------- the city: concrete blocks with neon signs ---------------- */
  const park = (x: number, z: number) => x > 20 && x < 160 && z > -150 && z < -40;
  const plaza = (x: number, z: number) => Math.abs(x) < 46 && z > 20 && z < 80;
  fillGrid(c, { x0: -420, x1: 520, z0: -330, z1: 650, step: 30, street: 9 }, (x, z) => {
    if (park(x, z) || plaza(x, z) || inCanal(x, z, 6) || Math.abs(x - 205) < 10) return null;
    const d = Math.hypot(x - 60, z), r = rand();
    return { kind: r < 0.55 ? 'concrete' : r < 0.8 ? 'office' : 'glass', h: 12 + rand() * 18 + Math.max(0, 250 - d) * 0.12 + (rand() < 0.08 ? 40 : 0), roof: 'flat', tint: [0xffffff, 0xf0e8f4, 0xe6eef6, 0xf6eee4][Math.floor(rand() * 4)] };
  });
  // vertical neon signs along the start and the lantern street (facing the road)
  const signMats: THREE.MeshBasicMaterial[] = [];
  const signAt = (s: number, sg: number, i: number) => {
    const f = track.frame(Math.round(s / track.ds)), P = side(f, sg * (f.w + KERB + f.apron + 4.5));
    if (!c.clear(P.x, P.z, -2)) return;
    const col = NEON[i % NEON.length];
    const mat = new THREE.MeshBasicMaterial({ map: signTex(SIGNS[i % SIGNS.length], col), toneMapped: false, side: THREE.DoubleSide });
    signMats.push(mat);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 6.4), mat);
    m.position.set(P.x, 6.5 + (i % 3), P.z);
    m.rotation.y = f.yaw + Math.PI;
    group.add(m);
    world.add(U.box, 0x2b2f3a, P.x + f.t.x * 0.15, 6.5 + (i % 3), P.z + f.t.z * 0.15, 1.8, 6.8, 0.25, 0, f.yaw, 0);
    world.cyl(P.x, 0, P.z, 0.12, 3.3 + (i % 3), 0x3a3f4b);
  };
  let si = 0;
  for (let s = 10; s < track.oS[2]; s += 11) { signAt(s, -1, si++); signAt(s + 5, 1, si++); }
  // (the lantern street: the first stretch of the long way round)
  const lan0 = track.oS[2] + 40, lan1 = lan0 + 170;
  for (let s = lan0; s < lan1; s += 12) { signAt(s, -1, si++); signAt(s + 6, 1, si++); }
  c.updates.push((_, t) => { signMats.forEach((m, i) => { const f = 0.75 + 0.25 * Math.sin(t * (2 + (i % 3)) + i) * (i % 5 === 0 ? (Math.sin(t * 13 + i) > 0.6 ? 0 : 1) : 1); m.color.setScalar(f); }); });

  /* ---------------- the scramble crossing: zebra stripes, screens, crowds crossing ---------------- */
  {
    const zs = [28, 72];
    for (const z of zs) for (let k = -10; k <= 10; k++) if (Math.abs(k) > 3) patch(c, [[k * 4 - 1.2, z - 4], [k * 4 + 1.2, z - 4], [k * 4 + 1.2, z + 4], [k * 4 - 1.2, z + 4]], 0xf4f4f2, -0.04);
    for (const sx of [-1, 1]) for (let k = 0; k < 6; k++) patch(c, [[sx * 26 - 4, 34 + k * 6], [sx * 26 + 4, 34 + k * 6], [sx * 26 + 4, 37 + k * 6], [sx * 26 - 4, 37 + k * 6]], 0xf4f4f2, -0.04);
    const paths: [number, number, number, number][] = [];
    for (const sx of [-1, 1]) { paths.push([sx * 18, 26, sx * 44, 26], [sx * 18, 74, sx * 44, 74], [sx * 26, 30, sx * 26, 70], [sx * 18, 30, sx * 42, 70], [sx * 42, 30, sx * 18, 70]); }
    strollers(c, paths, 140);
    crowd(c, Array.from({ length: 90 }, () => { const sx = rand() < 0.5 ? -1 : 1, sz = rand() < 0.5 ? 22 : 78; return { x: sx * (20 + rand() * 6), y: 0, z: sz + (rand() - 0.5) * 6, ry: rand() * 6 }; }), false);
    const draw = (seed: number) => (g: CanvasRenderingContext2D, t: number, w: number, h: number) => {
      const hue = (t * 40 + seed * 70) % 360;
      g.fillStyle = `hsl(${hue},85%,45%)`; g.fillRect(0, 0, w, h);
      for (let i = 0; i < 5; i++) { g.fillStyle = `hsla(${(hue + i * 60) % 360},90%,60%,.7)`; g.beginPath(); g.arc(w * (0.2 + 0.15 * i) + Math.sin(t * 2 + i) * 20, h / 2 + Math.cos(t * 3 + i) * h * 0.25, h * 0.18, 0, Math.PI * 2); g.fill(); }
      g.fillStyle = '#fff'; g.font = `italic 900 ${Math.round(h * 0.3)}px Inter, system-ui, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(['KONNICHIWA!', 'HELLO TOKYO', 'LET\'S GO!', 'NICE DRIFT!', 'ENGLISH • TOKYO'][(seed + Math.floor(t / 3)) % 5], w / 2, h / 2);
    };
    building(c, 'glass', -60, 50, 26, 30, 48, 0, { roof: 'flat', tint: 0xd8e2f0 });
    building(c, 'concrete', 60, 52, 26, 30, 40, 0, { roof: 'flat' });
    building(c, 'glass', -56, 100, 22, 22, 60, 0, { roof: 'flat', tint: 0xe0d8f0 });
    screens(c, [
      { x: -46.8, y: 30, z: 50, w: 20, h: 11, ry: Math.PI / 2, draw: draw(0) },
      { x: 46.8, y: 26, z: 52, w: 20, h: 11, ry: -Math.PI / 2, draw: draw(1) },
      { x: -44.8, y: 40, z: 100, w: 14, h: 8, ry: Math.PI / 2, draw: draw(2) },
    ], 10);
  }

  /* ---------------- lantern street ---------------- */
  lanterns(c, lan0 - 10, lan1 + 6, 9, [0xff3b30, 0xffffff, 0xff3b30, 0xffb020]);
  crowd(c, roadsideSpots(c, lan0, lan1, { rows: 2, every: 1.6 }));

  /* ---------------- viaduct and bullet trains ---------------- */
  {
    const x = 205, z0 = -260, z1 = 300, y = 11;
    for (let z = z0; z <= z1; z += 18) world.add(U.box, 0xb9bcc2, x, y / 2, z, 3, y, 2);
    world.add(U.box, 0xc9ccd2, x, y + 0.5, (z0 + z1) / 2, 12, 1, z1 - z0);
    for (const sx of [-1, 1]) world.add(U.box, 0xd8dbe0, x + sx * 5.8, y + 1.5, (z0 + z1) / 2, 0.3, 1.2, z1 - z0);
    for (let z = z0; z <= z1; z += 30) for (const sx of [-1, 1]) world.add(U.box, 0x7a7f88, x + sx * 6.2, y + 4, z, 0.2, 6, 0.2);
    const mk = (dir: number) => {
      const g = new Geo();
      for (let k = 0; k < 6; k++) { g.add(U.box, 0xf6f8fa, 0, 1.8, k * 21, 3.4, 3.2, 20.5); g.add(U.box, 0x1f4fb8, 0, 1.0, k * 21, 3.44, 0.35, 20.6); g.add(U.box, 0x24324a, 0, 2.3, k * 21, 3.44, 0.7, 19); }
      g.add(new THREE.ConeGeometry(1, 1, 16), 0xf6f8fa, 0, 1.8, -14, 1.7, 9, 1.6, -Math.PI / 2, 0, 0);
      g.add(new THREE.ConeGeometry(1, 1, 16), 0xf6f8fa, 0, 1.8, 5 * 21 + 14, 1.7, 9, 1.6, Math.PI / 2, 0, 0);
      const m = new THREE.Mesh(g.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 0.3 }));
      m.castShadow = true;
      group.add(m);
      return { m, dir, off: rand() * 40 };
    };
    const trains = [mk(1), mk(-1)];
    c.updates.push((_, t) => {
      for (const tn of trains) {
        const L = z1 - z0 + 400, u = ((t * 70 + tn.off * 30) % L) - 200;
        tn.m.position.set(x + tn.dir * 2.6, y + 1, tn.dir > 0 ? z0 + u : z1 - u - 126);
        tn.m.visible = u > -150 && u < L - 250;
      }
    });
  }

  /* ---------------- the red lattice tower inside the hairpin ---------------- */
  {
    let tx = 128, tz = -128;
    for (const [x, z] of [[128, -128], [130, -122], [122, -118], [135, -115]]) if (c.clear(x, z, 9)) { tx = x; tz = z; break; }
    const H = 110, red = 0xe8452c, white = 0xf4f4f2;
    for (let k = 0; k < 22; k++) {
      const y = (k / 22) * H, w = 14 * (1 - k / 26) + 1.5, col = Math.floor(k / 3) % 2 ? white : red;
      for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) glossy.add(U.box, col, tx + dx * w / 2, y + H / 44, tz + dz * w / 2, 0.7, H / 22 + 0.1, 0.7);
      if (k % 2 === 0) for (let e = 0; e < 4; e++) { const a = (e * Math.PI) / 2; glossy.add(U.box, col, tx + Math.sin(a) * w / 2, y, tz + Math.cos(a) * w / 2, 0.3, 0.3, w, 0, a + Math.PI / 2, 0); }
    }
    glossy.add(U.box, white, tx, H * 0.42, tz, 9, 3, 9);
    glass.add(U.box, 0x6fa0d0, tx, H * 0.42, tz, 9.2, 1.6, 9.2);
    glossy.add(U.box, red, tx, H * 0.72, tz, 5, 2, 5);
    glossy.add(U.cyl, white, tx, H + 8, tz, 0.4, 18, 0.4);
    glow.add(U.ball, 0xff2a2a, tx, H + 17.5, tz, 0.5, 0.5, 0.5);
  }

  /* ---------------- cherry park: trees, petals, gate, pagoda, koi pond ---------------- */
  patch(c, [[20, -150], [160, -150], [160, -40], [20, -40]], 0x6aa84f);
  for (let k = 0; k < 120; k++) { const x = 24 + rand() * 132, z = -146 + rand() * 102; if (c.clear(x, z, 1.5) && !inCanal(x, z, 3)) tree(c, x, z, rand() < 0.75 ? 'sakura' : 'round', 1.1 + rand() * 0.5); }
  fallers(c, { x: 90, z: -95, w: 150, d: 120, y0: 0, h: 14 }, 900, [0xffc4d8, 0xffb0cc, 0xffffff, 0xffd6e4], 0.3, 1.0);
  {
    // the big red gate over the road
    const s = track.oS[14] + 4, f = track.frame(Math.round(s / track.ds)), span = f.w + KERB + f.apron + 1.5;
    const red = 0xe23a24;
    for (const sg of [-1, 1]) { const P = side(f, sg * span); world.add(U.cyl, red, P.x, 5.5, P.z, 0.7, 11, 0.7); world.add(U.cyl, 0x1b1d24, P.x, 0.4, P.z, 0.85, 0.8, 0.85); }
    const C = side(f, 0);
    world.add(U.box, red, C.x, 9.2, C.z, span * 2 + 1.4, 0.9, 1.1, 0, f.yaw, 0).add(U.box, 0x1b1d24, C.x, 11.2, C.z, span * 2 + 4.5, 0.9, 1.5, 0, f.yaw, 0).add(U.box, red, C.x, 10.5, C.z, span * 2 + 3, 0.6, 1.2, 0, f.yaw, 0);
  }
  {
    // five-storey pagoda and a small shrine
    let px = 60, pz = -125;
    for (const [x, z] of [[60, -125], [50, -130], [40, -120], [45, -60]]) if (c.clear(x, z, 8) && !inCanal(x, z, 4)) { px = x; pz = z; break; }
    for (let k = 0; k < 5; k++) {
      const y = k * 4.2, w = 9 - k * 1.1;
      world.add(U.box, 0xd84a2a, px, y + 1.6, pz, w * 0.7, 3.2, w * 0.7);
      world.add(new THREE.ConeGeometry(1, 1, 4), 0x2b2f3a, px, y + 3.8, pz, w * 0.82, 1.4, w * 0.82, 0, Math.PI / 4, 0);
    }
    glossy.add(U.cyl, 0xd4af37, px, 24, pz, 0.2, 5, 0.2);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; world.add(U.box, 0xa9a59c, px + Math.cos(a) * 12, 0.9, pz + Math.sin(a) * 12, 0.6, 1.8, 0.6); glow.add(U.box, 0xffd890, px + Math.cos(a) * 12, 1.95, pz + Math.sin(a) * 12, 0.5, 0.4, 0.5); }
  }
  {
    // koi pond with fish swimming
    let kx = 120, kz = -70;
    for (const [x, z] of [[120, -70], [130, -60], [110, -55], [70, -55]]) if (c.clear(x, z, 10)) { kx = x; kz = z; break; }
    const pond = new THREE.Mesh(new THREE.CircleGeometry(9, 32).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x2f7f8e, roughness: 0.05, clearcoat: 1, normalMap: rippleTex(), normalScale: new THREE.Vector2(0.15, 0.15), transparent: true, opacity: 0.85 }));
    pond.position.set(kx, 0.05, kz);
    group.add(pond);
    const fish = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 8, 6).scale(0.18, 0.1, 0.5), new THREE.MeshStandardMaterial({ roughness: 0.4 }), 9);
    const cc = new THREE.Color();
    for (let k = 0; k < 9; k++) fish.setColorAt(k, cc.setHex([0xff7a1a, 0xffffff, 0xff3b30][k % 3]));
    group.add(fish);
    const o = new THREE.Object3D();
    c.updates.push((_, t) => { for (let k = 0; k < 9; k++) { const a = t * (0.3 + k * 0.03) + k; o.position.set(kx + Math.cos(a) * (3 + k % 4), -0.05, kz + Math.sin(a) * (3 + k % 4)); o.rotation.y = -a; o.updateMatrix(); fish.setMatrixAt(k, o.matrix); } fish.instanceMatrix.needsUpdate = true; });
  }
  strollers(c, [[30, -140, 150, -140], [30, -45, 150, -45], [25, -140, 25, -50]], 40);

  /* ---------------- the snowy volcano on the horizon ---------------- */
  world.add(new THREE.ConeGeometry(1, 1, 40, 1, true), 0x6a6f8c, -420, 70, 560, 260, 150, 260);
  world.add(new THREE.ConeGeometry(1, 1, 40, 1, true), 0xf4f6fb, -420, 128, 560, 80, 36, 80);

  /* ---------------- start, signs, lamps, life ---------------- */
  const lampsM = startGantry(track, group, glossy, 'TOKYO DRIFT LIGHTS', ['#ff2bd6', '#6a2fb8'], 0x1b1d24, 0xff2bd6);
  billboards(track, group, world, [
    [6, ['BULLET TRAIN', 'AHEAD'], ['#1f4fb8', '#00e5ff']],
    [10, ['DRIFT HERE!'], ['#ff2bd6', '#ffd23f']],
    [12, ['JUMP THE CANAL'], ['#e23a24', '#ff9f1c']],
    [16, ['ARIGATO!', 'THANK YOU!'], ['#6a2fb8', '#ff2bd6']],
  ], c.clear);
  lamps(c, 24, 0x2b2f3a, 0xfff0d0);
  walkers(c, 70);
  traffic(c, gridLanes(c, { x0: -420, x1: 520, z0: -330, z1: 650, step: 30 }, (x, z) => park(x, z) || plaza(x, z) || inCanal(x, z, 4)), [
    { kind: 'car', colors: [0xf4f4f2, 0x2b2f3a, 0xd32f2f, 0x9aa0a8, 0x3d8bff], n: 34 },
    { kind: 'taxi', colors: [0x1b5e20, 0x1b1d24, 0xffc61a], n: 16, speed: 10 },
    { kind: 'bus', colors: [0x3fa9f5, 0xf4f4f2], n: 6, speed: 8 },
    { kind: 'van', colors: [0xf4f4f2], n: 6 },
  ]);
  birds(c, 90, -95, 60, 26, 12, 0x2b2f3a);
  cloudRing(group, 60, 0, 16, rand, { tint: 0xffb8c8, glow: 0.8, y0: 120 });

  return done(c, lampsM, { waterY: -1.6 });
}
