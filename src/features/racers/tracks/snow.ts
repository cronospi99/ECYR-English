/* English Racers — "Snow Peak" (≈1.55 km), drawn from the student's doodle (start line on the long
   left straight): an E-shaped mountain course — the long straight and its hairpin, a twisty cup,
   a fast spine to the far side, a long hairpin finger, a run of gentle waves and a last hook home.
   Around it: snowy hills and peaks, snow-laden pines, a chairlift with moving chairs, skiers coming
   down the slopes, skaters on a frozen lake, cabins with smoking chimneys, snowmen and falling snow. */
import * as THREE from 'three';
import { Geo, U, shade } from '@/features/run/gfx';
import { KERB, withSpiral, type CP, type Track, type TrackDef } from '../track';
import { side, type TrackStyle } from '../trackMesh';
import { billboards, cloudRing, startGantry, type Scenery } from '../scenery';
import { birds, bunting, city, crowd, done, fallers, lamps, roadsideSpots, strollers, terrain, walkers } from './city';

const PTS: [number, number][] = [[-211.7,26],[-211.7,9],[-211.8,-9],[-212.2,-25.9],[-212.3,-42.9],[-212.5,-59.9],[-212.6,-77.9],[-212.9,-94.9],[-213,-111.9],[-212.8,-129.8],[-208.7,-143.4],[-201.4,-152.4],[-194.9,-156.5],[-189,-158.3],[-183,-158.5],[-177.1,-157.3],[-171.5,-154.5],[-165.1,-148.7],[-159.4,-137.9],[-157.8,-121.9],[-159,-104.9],[-160.3,-88],[-161.3,-71],[-160.8,-53.2],[-155.8,-40.9],[-149,-33.7],[-141.2,-29.6],[-132.5,-28.2],[-123.6,-29.5],[-113.3,-34.4],[-101.2,-41],[-89.9,-46.8],[-83.4,-53.1],[-79.2,-59.8],[-76.4,-67],[-75.4,-74.8],[-76.6,-85.2],[-78,-95.7],[-76.9,-103.3],[-74.6,-109.2],[-71.5,-113.7],[-67.3,-117.6],[-62.4,-120.3],[-55.8,-122],[-48,-121.6],[-38.2,-117.6],[-29.1,-109.4],[-20.9,-94],[-15,-78.1],[-5.3,-64.2],[6.8,-52.3],[21.1,-43.2],[37,-37.2],[53.6,-33.8],[70.6,-32.6],[87.6,-32.6],[105.6,-32.9],[122.5,-32.4],[139.5,-31.7],[156.5,-32.3],[169.8,-38.4],[179.2,-48.8],[184.9,-57.3],[191.5,-63.4],[196.6,-66.1],[201,-67.3],[204.5,-67.7],[207.9,-67.5],[211.7,-66.6],[215.2,-65.1],[219.9,-61.8],[224.7,-55.6],[228.1,-46.6],[228.6,-32.9],[228.7,-15.9],[229.1,1.1],[229.7,18.1],[230.4,36.1],[231.4,53.1],[232.4,67.1],[229.7,77.9],[225.1,85],[220.7,88.8],[216.7,91],[213.1,92.2],[209.4,92.8],[205.6,92.7],[200.3,91.7],[194.4,89.2],[187,83.6],[181.5,77.2],[175.2,71.1],[167.3,67.2],[158.6,65.1],[147.2,65.6],[132.4,67.4],[116.4,67.4],[100.7,70.4],[85,73.3],[69.1,71.9],[53.5,68.2],[37.6,66.4],[21.7,65.3],[6.3,60.8],[-8.1,59.8],[-18.5,63.2],[-27,69.8],[-33.5,79.7],[-39.7,88.4],[-46.5,93.9],[-52.7,96.9],[-58.6,98.2],[-65.5,98.4],[-72.4,96.9],[-81.4,92.7],[-87.8,89],[-95.1,86.8],[-101.7,86.1],[-108.9,86.8],[-116.6,89.2],[-125.6,94.9],[-134.3,105.9],[-138.4,121.6],[-139.1,138.6],[-139.8,156.6],[-142.2,173.4],[-147.3,188.5],[-156.5,201.4],[-170.3,209.4],[-185.1,209.5],[-198.5,202.9],[-208.6,190.7],[-214.4,174.7],[-216.5,157.9],[-216.7,140.9],[-216.1,123.9],[-215.2,106.9],[-213.9,89],[-212.9,72],[-212.2,55],[-211.7,38]];
/** The layout was scaled up by SC (and its tight curves smoothed open) after drawing; heights keep the drawing's coordinates. */
const SC = 1.44;
const roadH = (x: number, z: number) => 3 + 4 * Math.sin(x * 0.011 + 0.6) * Math.cos(z * 0.009);

export const SNOW: TrackDef = withSpiral({
  id: 'snow', name: 'Snow Peak', laps: 2, waterY: -30,
  cps: PTS.map(([x, z]) => ({ x, z, y: roadH(x / SC, z / SC), w: 6.5, apron: 3 } as CP)),
  features: [
    { kind: 'boost', at: 6, off: 0, d: 0 },
    { kind: 'boost', at: 60, off: 0, d: -2 },
    { kind: 'boost', at: 60, off: 0, d: 2 },
    { kind: 'ramp', at: 66, off: 0, len: 9, h: 1.3 },
    { kind: 'boost', at: 128, off: 0, d: 0 },
  ],
  items: [{ at: 12, off: 0 }, { at: 52, off: 0 }, { at: 86, off: 0 }, { at: 120, off: 0 }],
  coins: [
    { at: 3, off: 0, d: 2, n: 5 }, { at: 30, off: 0, d: 0, n: 5 }, { at: 48, off: 0, d: -2, n: 5 }, { at: 70, off: 0, d: 1.5, n: 5, dd: -0.6 },
    { at: 96, off: 0, d: 0, n: 5 }, { at: 110, off: 0, d: -2, n: 5 }, { at: 134, off: 0, d: 2, n: 5 },
  ],
}, 134, { side: -1, drop: 13 });

export const SNOW_STYLE: TrackStyle = { road: 'asphalt', kerb: [0xd32f2f, 0xf4f4f2], apron: [0xf2f6fb, 0xe8eef6], wall: 'barrier', edge: 'bank', bank: 0xdfe8f2, gapFace: 0xb9c4d0, baseY: -24 };

export function buildSnow(track: Track): Scenery {
  const c = city(track, 1924);
  const { world, glossy, group, rand } = c;
  const F = track.frames, sparse = F.filter((_, i) => i % 3 === 0);
  // (under a bridge the ground follows the lower road)
  const nearest = (x: number, z: number) => {
    let best = Infinity, f0 = sparse[0], low: typeof f0 | null = null;
    for (const f of sparse) { const d = Math.hypot(x - f.p.x, z - f.p.z); if (d < best) { best = d; f0 = f; } if (d < f.w + KERB + f.apron + 5 && (!low || f.p.y < low.p.y)) low = f; }
    const g = low ?? f0;
    return { d: best - (f0.w + KERB + f0.apron), y: g.p.y - Math.abs(g.bank) * (g.w + KERB) - 0.35 };
  };
  // the frozen lake sits in the widest gap between the roads (never under one)
  const lake = { x: -40, z: 0, r: 26 };
  { let bd = 0; for (let x = -120; x <= 120; x += 10) for (let z = -100; z <= 100; z += 10) { const d = nearest(x, z).d - Math.hypot(x, z) * 0.1; if (d > bd) { bd = d; lake.x = x; lake.z = z; } } lake.r = Math.min(26, bd - 14); }
  const hills = (x: number, z: number) => 6 * Math.sin(x * 0.018) * Math.cos(z * 0.021) + 10 + Math.max(0, Math.hypot(x, z * 1.2) - 220) * 0.35;
  const natural = (x: number, z: number) => { const n = nearest(x, z); return n.y - 0.25 + (hills(x, z) - n.y) * THREE.MathUtils.smoothstep(n.d, 4, 30); };
  // the ice lies below the lowest point of the shore; the lake bed dips under it
  let iceY = natural(lake.x, lake.z);
  for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; iceY = Math.min(iceY, natural(lake.x + Math.cos(a) * (lake.r + 8), lake.z + Math.sin(a) * (lake.r + 8))); }
  iceY -= 0.3;
  const ground = (x: number, z: number) => {
    const lk = Math.hypot(x - lake.x, z - lake.z);
    let y = natural(x, z);
    if (lk < lake.r + 8) y = Math.min(y, THREE.MathUtils.lerp(iceY - 1.2, y, THREE.MathUtils.smoothstep(lk, lake.r + 1, lake.r + 8)));
    return y;
  };

  /* ---------------- snowy ground, the frozen lake, far peaks ---------------- */
  terrain(c, { cx: track.box.cx, cz: track.box.cz, size: Math.max(1000, track.box.span + 300), n: 215, y: ground, rough: 0.7, color: (x, z, y) => { const n = nearest(x, z); return n.d < 1.5 ? 0xd9e2ec : y > 22 ? 0xf8fbff : shade(0xf0f5fb, Math.sin(x * 0.07 + z * 0.05) * 0.02 - 0.01); } });
  {
    const ly = iceY;
    const ice = new THREE.Mesh(new THREE.CircleGeometry(lake.r, 40).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xbfe4f5, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 }));
    ice.position.set(lake.x, ly, lake.z);
    ice.receiveShadow = true;
    group.add(ice);
    const ring: [number, number, number, number][] = [];
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, b = a + Math.PI * 0.6; ring.push([lake.x + Math.cos(a) * 14, lake.z + Math.sin(a) * 14, lake.x + Math.cos(b) * 18, lake.z + Math.sin(b) * 18]); }
    strollers(c, ring, 18, () => ly);
  }
  for (let k = 0; k < 18; k++) {
    const a = rand() * Math.PI * 2, h = 90 + rand() * 110, w = 70 + rand() * 60;
    // (far enough out that no slope of the peak reaches the road)
    let r = 330 + rand() * 150, x = 0, z = 0;
    for (; r < 900; r += 25) { x = Math.cos(a) * r; z = Math.sin(a) * r; if (sparse.every((f) => Math.hypot(f.p.x - x, f.p.z - z) > w + 45)) break; }
    world.add(new THREE.ConeGeometry(1, 1, 9), 0x8e9db4, x, h / 2, z, w, h, w * 0.9);
    world.add(new THREE.ConeGeometry(1, 1, 9), 0xf8fbff, x, h * 0.78, z, w * 0.45, h * 0.44, w * 0.41);
  }

  /* ---------------- snowy pines, cabins with smoke, snowmen ---------------- */
  const pine = (x: number, z: number, s: number) => {
    const y = ground(x, z);
    world.add(U.cyl, 0x5b3f2c, x, y + 1 * s, z, 0.25 * s, 2 * s, 0.25 * s);
    for (let k = 0; k < 3; k++) {
      const h = y + (1.6 + k * 1.5) * s, r = (2.4 - k * 0.65) * s;
      world.add(new THREE.ConeGeometry(1, 1, 8), shade(0x2f6b4a, (rand() - 0.5) * 0.05), x, h, z, r, 2.4 * s, r);
      world.add(new THREE.ConeGeometry(1, 1, 8), 0xf8fbff, x, h + 0.55 * s, z, r * 0.7, 1.1 * s, r * 0.7);
    }
  };
  for (let k = 0; k < 520; k++) {
    const x = (rand() - 0.5) * 640, z = (rand() - 0.5) * 520, n = nearest(x, z);
    if (n.d < 4 || Math.hypot(x - lake.x, z - lake.z) < lake.r + 3 || rand() < Math.min(0.6, n.d / 120)) continue;
    pine(x, z, 0.9 + rand() * 0.8);
  }
  // a rocky snow peak in the middle of the spiral, with a flag on top
  for (const sp of track.def.spirals ?? []) {
    const gy = ground(sp.x, sp.z), h = sp.top - gy + 16;
    world.add(new THREE.ConeGeometry(1, 1, 11), 0x8e9db4, sp.x, gy + h / 2 - 1, sp.z, 13, h, 12);
    world.add(new THREE.ConeGeometry(1, 1, 11), 0xf8fbff, sp.x, gy + h * 0.8 - 1, sp.z, 6.6, h * 0.42, 6.2);
    world.add(U.cyl, 0x3a3f4b, sp.x, gy + h + 1.4, sp.z, 0.12, 5, 0.12);
    world.add(U.box, 0xd32f2f, sp.x + 1.1, gy + h + 3.2, sp.z, 2.2, 1.3, 0.06);
  }
  const smokes: THREE.Vector3[] = [];
  for (const [x0, z0] of [[-90, -60], [120, -120], [-40, 150], [160, 80], [10, -150]] as const) {
    const x = x0 * SC, z = z0 * SC;
    if (nearest(x, z).d < 8) continue;
    const y = ground(x, z);
    world.add(U.box, 0x7a4a2c, x, y + 2, z, 8, 4, 6);
    world.add(new THREE.CylinderGeometry(0.5, 0.5, 1, 3), 0xf8fbff, x, y + 5.2, z, 4.8, 9, 3.4, 0, 0, Math.PI / 2);
    world.add(U.box, 0x5a3a24, x + 2.5, y + 6, z, 1, 3, 1);
    c.glow.add(U.box, 0xffd890, x, y + 2, z + 3.02, 1.4, 1.2, 0.05);
    smokes.push(new THREE.Vector3(x + 2.5, y + 7.6, z));
  }
  {
    const puffs = new THREE.InstancedMesh(new THREE.SphereGeometry(1, 10, 8), new THREE.MeshStandardMaterial({ color: 0xdfe4ea, roughness: 1, transparent: true, opacity: 0.55, depthWrite: false }), smokes.length * 6);
    group.add(puffs);
    const o = new THREE.Object3D();
    c.updates.push((_, t) => { smokes.forEach((p, i) => { for (let k = 0; k < 6; k++) { const a = (t * 0.25 + k / 6) % 1; o.position.set(p.x + a * 4, p.y + a * 9, p.z + Math.sin(t + k) * a); o.scale.setScalar(0.4 + a * 1.6); o.updateMatrix(); puffs.setMatrixAt(i * 6 + k, o.matrix); } }); puffs.instanceMatrix.needsUpdate = true; });
  }
  for (let i = 0; i < F.length; i += 60) { const f = F[i], P = side(f, -(f.w + KERB + f.apron + 3.5)); if (!c.clear(P.x, P.z, 0.5)) continue; const y = ground(P.x, P.z); world.add(U.ball, 0xf8fbff, P.x, y + 0.8, P.z, 0.9, 0.9, 0.9).add(U.ball, 0xf8fbff, P.x, y + 2.0, P.z, 0.65, 0.65, 0.65).add(U.ball, 0xf8fbff, P.x, y + 2.9, P.z, 0.45, 0.45, 0.45); world.add(new THREE.ConeGeometry(1, 1, 8), 0xff7a1a, P.x + Math.sin(f.yaw) * 0.45, y + 2.9, P.z + Math.cos(f.yaw) * 0.45, 0.08, 0.5, 0.08, Math.PI / 2, f.yaw, 0); }

  /* ---------------- chairlift and skiers on the slope ---------------- */
  {
    const A = new THREE.Vector3(-260 * SC, 0, -230 * SC), B = new THREE.Vector3(-150 * SC, 0, -330 * SC);
    A.y = ground(A.x, A.z) + 9; B.y = ground(B.x, B.z) + 9;
    for (let k = 0; k <= 6; k++) { const u = k / 6, x = A.x + (B.x - A.x) * u, z = A.z + (B.z - A.z) * u, gy = ground(x, z), top = A.y + (B.y - A.y) * u; world.add(U.box, 0x6b7280, x, (gy + top) / 2, z, 0.6, top - gy, 0.6); world.add(U.box, 0x6b7280, x, top, z, 4, 0.4, 0.4, 0, Math.atan2(B.x - A.x, B.z - A.z) + Math.PI / 2, 0); }
    const n = 16, chairs = new THREE.InstancedMesh(new Geo().add(U.box, 0x2f6fd0, 0, -1.6, 0, 1.6, 0.2, 0.8).add(U.box, 0x2f6fd0, 0, -1.2, -0.35, 1.6, 0.8, 0.1).add(U.box, 0x3a3f4b, 0, -0.8, 0, 0.06, 1.6, 0.06).build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), n);
    group.add(chairs);
    const o = new THREE.Object3D(), ry = Math.atan2(B.x - A.x, B.z - A.z);
    c.updates.push((_, t) => { for (let k = 0; k < n; k++) { const u = ((t * 0.02 + k / n) % 1), up = u < 0.5, w = up ? u * 2 : 2 - u * 2, side2 = up ? 1.6 : -1.6; o.position.set(A.x + (B.x - A.x) * w + Math.cos(ry) * side2, A.y + (B.y - A.y) * w, A.z + (B.z - A.z) * w - Math.sin(ry) * side2); o.rotation.set(0, ry + (up ? 0 : Math.PI), Math.sin(t * 2 + k) * 0.05); o.updateMatrix(); chairs.setMatrixAt(k, o.matrix); } chairs.instanceMatrix.needsUpdate = true; });
    strollers(c, ([[-150, -320, -250, -240], [-170, -330, -240, -230], [-140, -300, -230, -250]] as const).map((r) => r.map((v) => v * SC) as [number, number, number, number]), 14, (x, z) => ground(x, z));
  }
  fallers(c, { x: 0, z: 0, w: 520 * SC, d: 420 * SC, y0: 0, h: 40 }, 2600, [0xffffff, 0xf2f8ff], 0.24, 1.6);

  /* ---------------- start, people, signs ---------------- */
  const lampsM = startGantry(track, group, glossy, 'SNOW PEAK', ['#2f6fd0', '#7fd3ff'], 0x1b1d24, 0xd32f2f);
  billboards(track, group, world, [
    [14, ['ICY HAIRPIN'], ['#2f6fd0', '#7fd3ff']],
    [44, ['SLOW DOWN?', 'NO WAY!'], ['#d32f2f', '#ff8a80']],
    [80, ['BRRR!'], ['#6a2fb8', '#7fd3ff']],
    [118, ['HOT COCOA', 'AHEAD'], ['#7a4a2c', '#d9a24a']],
  ], c.clear);
  crowd(c, roadsideSpots(c, 6, track.oS[8], { rows: 3, sides: [1] }), true);
  bunting(c, 8, track.oS[8], 18, [0xd32f2f, 0xf4f4f2, 0x2f6fd0]);
  lamps(c, 32, 0x2b2f3a, 0xfff0c8);
  walkers(c, 30);
  birds(c, 0, 0, 140, 50, 10, 0x2b2f3a);
  cloudRing(group, 0, 0, 22, rand, { tint: 0xf4f8ff, glow: 0.6, y0: 120 });

  return done(c, lampsM, { waterY: -30 });
}
