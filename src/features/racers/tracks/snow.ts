/* English Racers — "Snow Peak" (≈1.55 km), drawn from the student's doodle (start line on the long
   left straight): an E-shaped mountain course — the long straight and its hairpin, a twisty cup,
   a fast spine to the far side, a long hairpin finger, a run of gentle waves and a last hook home.
   Around it: snowy hills and peaks, snow-laden pines, a chairlift with moving chairs, skiers coming
   down the slopes, skaters on a frozen lake, cabins with smoking chimneys, snowmen and falling snow. */
import * as THREE from 'three';
import { Geo, U, shade } from '@/features/run/gfx';
import { KERB, type CP, type Track, type TrackDef } from '../track';
import { side, type TrackStyle } from '../trackMesh';
import { billboards, cloudRing, startGantry, type Scenery } from '../scenery';
import { birds, bunting, city, crowd, done, fallers, lamps, roadsideSpots, strollers, terrain, walkers } from './city';

const PTS: [number, number][] = [[-147,18.1],[-147,6.1],[-147.1,-5.9],[-147.3,-17.9],[-147.4,-29.9],[-147.6,-41.9],[-147.7,-53.9],[-147.8,-65.9],[-147.9,-77.9],[-147.9,-89.9],[-147.3,-101.8],[-145.4,-113.5],[-141.4,-124.1],[-134.5,-131.6],[-125.5,-133.5],[-117.1,-129],[-111.6,-119.9],[-109.2,-108.7],[-108.9,-96.8],[-109.5,-84.9],[-110.4,-72.9],[-111.3,-61],[-112,-49],[-112,-37],[-110.9,-25.4],[-107.4,-15],[-100.7,-8.6],[-92.5,-8.8],[-85.2,-15.3],[-78.7,-23.9],[-70.6,-29.6],[-60.7,-30.5],[-50.6,-30.3],[-42.5,-34.1],[-39.3,-42.6],[-41.7,-52.4],[-48.7,-60.7],[-58,-67.1],[-66.4,-74],[-70.9,-83],[-69.4,-92.6],[-62.5,-99.9],[-52.5,-102.9],[-41.9,-101.3],[-32.8,-95.3],[-26.2,-86.1],[-21.1,-75.5],[-16,-64.7],[-10.4,-54.2],[-3.6,-44.5],[4.7,-36.3],[14.6,-30],[25.6,-25.8],[37.2,-23.5],[49.1,-22.7],[61.1,-22.7],[73,-22.8],[85,-22.5],[96.9,-22],[108.6,-22.4],[119.2,-25.6],[127.1,-32.7],[131.5,-42.8],[133,-54.3],[133.3,-66.1],[134.7,-77.3],[138.8,-85.4],[145.5,-86.7],[151.9,-80.7],[156.2,-70.6],[158.3,-59],[159,-47.1],[158.8,-35.1],[158.7,-23.1],[158.8,-11.1],[159.1,0.9],[159.5,12.8],[160,24.8],[160.7,36.8],[161.5,48.8],[162.1,60.7],[162.1,72.7],[160.8,84.4],[157.5,94.9],[152,101.4],[145.6,100.4],[140.7,92.6],[138.1,81.6],[136.9,69.8],[135.9,57.9],[133.6,46.9],[128.4,39],[120.4,37.4],[111.6,41.4],[102.2,45.7],[91.8,46.8],[80.8,46.8],[69.8,48.9],[59,50.9],[48.1,49.9],[37.2,47.3],[26,46.1],[14.9,45.3],[4.2,42.2],[-6.2,38.8],[-15.9,39.1],[-22.5,45.2],[-24.9,55.3],[-25.1,66.8],[-26.2,78],[-30.8,86.6],[-38.4,89.6],[-45.8,85.5],[-50.2,76.3],[-51.8,64.9],[-53.5,53.7],[-57.9,45.1],[-65.6,42.3],[-74.6,45.8],[-83.1,53.1],[-90,62.2],[-94.3,72.9],[-96.1,84.5],[-96.6,96.4],[-97.1,108.4],[-98.7,120.1],[-102.3,131],[-108.8,140],[-118,145.3],[-128.4,145.5],[-137.9,140.8],[-144.9,132.3],[-148.8,121.5],[-150.3,109.8],[-150.5,97.9],[-150.1,85.9],[-149.4,74],[-148.6,62],[-147.8,50],[-147.3,38],[-147,26.1]];
const roadH = (x: number, z: number) => 3 + 4 * Math.sin(x * 0.011 + 0.6) * Math.cos(z * 0.009);

export const SNOW: TrackDef = {
  id: 'snow', name: 'Snow Peak', laps: 2, waterY: -30,
  cps: PTS.map(([x, z]) => ({ x, z, y: roadH(x, z), w: 6.5, apron: 3 } as CP)),
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
};

export const SNOW_STYLE: TrackStyle = { road: 'asphalt', kerb: [0xd32f2f, 0xf4f4f2], apron: [0xf2f6fb, 0xe8eef6], wall: 'barrier', edge: 'bank', bank: 0xdfe8f2, gapFace: 0xb9c4d0, baseY: -24 };

export function buildSnow(track: Track): Scenery {
  const c = city(track, 1924);
  const { world, glossy, group, rand } = c;
  const F = track.frames, sparse = F.filter((_, i) => i % 6 === 0);
  const nearest = (x: number, z: number) => { let best = Infinity, f0 = sparse[0]; for (const f of sparse) { const d = Math.hypot(x - f.p.x, z - f.p.z); if (d < best) { best = d; f0 = f; } } return { d: best - (f0.w + KERB + f0.apron), y: f0.p.y }; };
  const lake = { x: 40, z: 40, r: 26 };
  const hills = (x: number, z: number) => 6 * Math.sin(x * 0.018) * Math.cos(z * 0.021) + 10 + Math.max(0, Math.hypot(x, z * 1.2) - 220) * 0.35;
  const ground = (x: number, z: number) => {
    const n = nearest(x, z), lk = Math.hypot(x - lake.x, z - lake.z);
    let y = n.y - 0.25 + (hills(x, z) - n.y) * THREE.MathUtils.smoothstep(n.d, 4, 30);
    if (lk < lake.r + 8) y = Math.min(y, THREE.MathUtils.lerp(n.y - 1.5, y, THREE.MathUtils.smoothstep(lk, lake.r, lake.r + 8)));
    return y;
  };

  /* ---------------- snowy ground, the frozen lake, far peaks ---------------- */
  terrain(c, { cx: 0, cz: 0, size: 1000, n: 190, y: ground, rough: 0.7, color: (x, z, y) => { const n = nearest(x, z); return n.d < 1.5 ? 0xd9e2ec : y > 22 ? 0xf8fbff : shade(0xf0f5fb, Math.sin(x * 0.07 + z * 0.05) * 0.02 - 0.01); } });
  {
    const ly = ground(lake.x, lake.z) + 0.05;
    const ice = new THREE.Mesh(new THREE.CircleGeometry(lake.r, 40).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0xbfe4f5, roughness: 0.08, metalness: 0, clearcoat: 1, clearcoatRoughness: 0.05 }));
    ice.position.set(lake.x, ly, lake.z);
    ice.receiveShadow = true;
    group.add(ice);
    const ring: [number, number, number, number][] = [];
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2, b = a + Math.PI * 0.6; ring.push([lake.x + Math.cos(a) * 14, lake.z + Math.sin(a) * 14, lake.x + Math.cos(b) * 18, lake.z + Math.sin(b) * 18]); }
    strollers(c, ring, 18, () => ly);
  }
  for (let k = 0; k < 18; k++) {
    const a = rand() * Math.PI * 2, r = 330 + rand() * 150, x = Math.cos(a) * r, z = Math.sin(a) * r, h = 90 + rand() * 110, w = 70 + rand() * 60;
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
  const smokes: THREE.Vector3[] = [];
  for (const [x, z] of [[-90, -60], [120, -120], [-40, 150], [160, 80], [10, -150]] as const) {
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
    const A = new THREE.Vector3(-260, 0, -230), B = new THREE.Vector3(-150, 0, -330);
    A.y = ground(A.x, A.z) + 9; B.y = ground(B.x, B.z) + 9;
    for (let k = 0; k <= 6; k++) { const u = k / 6, x = A.x + (B.x - A.x) * u, z = A.z + (B.z - A.z) * u, gy = ground(x, z), top = A.y + (B.y - A.y) * u; world.add(U.box, 0x6b7280, x, (gy + top) / 2, z, 0.6, top - gy, 0.6); world.add(U.box, 0x6b7280, x, top, z, 4, 0.4, 0.4, 0, Math.atan2(B.x - A.x, B.z - A.z) + Math.PI / 2, 0); }
    const n = 16, chairs = new THREE.InstancedMesh(new Geo().add(U.box, 0x2f6fd0, 0, -1.6, 0, 1.6, 0.2, 0.8).add(U.box, 0x2f6fd0, 0, -1.2, -0.35, 1.6, 0.8, 0.1).add(U.box, 0x3a3f4b, 0, -0.8, 0, 0.06, 1.6, 0.06).build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5 }), n);
    group.add(chairs);
    const o = new THREE.Object3D(), ry = Math.atan2(B.x - A.x, B.z - A.z);
    c.updates.push((_, t) => { for (let k = 0; k < n; k++) { const u = ((t * 0.02 + k / n) % 1), up = u < 0.5, w = up ? u * 2 : 2 - u * 2, side2 = up ? 1.6 : -1.6; o.position.set(A.x + (B.x - A.x) * w + Math.cos(ry) * side2, A.y + (B.y - A.y) * w, A.z + (B.z - A.z) * w - Math.sin(ry) * side2); o.rotation.set(0, ry + (up ? 0 : Math.PI), Math.sin(t * 2 + k) * 0.05); o.updateMatrix(); chairs.setMatrixAt(k, o.matrix); } chairs.instanceMatrix.needsUpdate = true; });
    strollers(c, [[-150, -320, -250, -240], [-170, -330, -240, -230], [-140, -300, -230, -250]], 14, (x, z) => ground(x, z));
  }
  fallers(c, { x: 0, z: 0, w: 520, d: 420, y0: 0, h: 40 }, 4200, [0xffffff, 0xf2f8ff], 0.32, 1.6);

  /* ---------------- start, people, signs ---------------- */
  const lampsM = startGantry(track, group, glossy, 'SNOW PEAK', ['#2f6fd0', '#7fd3ff'], 0x1b1d24, 0xd32f2f);
  billboards(track, group, world, [
    [14, ['ICY HAIRPIN'], ['#2f6fd0', '#7fd3ff']],
    [44, ['SLOW DOWN?', 'NO WAY!'], ['#d32f2f', '#ff8a80']],
    [80, ['BRRR!'], ['#6a2fb8', '#7fd3ff']],
    [118, ['HOT COCOA', 'AHEAD'], ['#7a4a2c', '#d9a24a']],
  ], c.clear);
  crowd(c, roadsideSpots(c, 6, track.cpS[8], { rows: 3, sides: [1] }), true);
  bunting(c, 8, track.cpS[8], 18, [0xd32f2f, 0xf4f4f2, 0x2f6fd0]);
  lamps(c, 32, 0x2b2f3a, 0xfff0c8);
  walkers(c, 30);
  birds(c, 0, 0, 140, 50, 10, 0x2b2f3a);
  cloudRing(group, 0, 0, 22, rand, { tint: 0xf4f8ff, glow: 0.6, y0: 120 });

  return done(c, lampsM, { waterY: -30 });
}
