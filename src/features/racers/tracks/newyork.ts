/* English Racers — "Big Apple Dash" (≈0.87 km), inspired by New York: the start through a square of
   giant animated screens and crowds, a twisting drive through a big park (pond, joggers, a horse
   carriage), a long avenue between glass skyscrapers next to an elevated train, and a suspension
   bridge over the bay, with a torch-bearing statue on its island. Yellow taxis everywhere, a
   helicopter, a blimp, ferries and sailboats. */
import * as THREE from 'three';
import { Geo, U } from '@/features/run/gfx';
import { makeOcean, oceanGeometry } from '@/features/run/ocean';
import { KERB, type Track, type TrackDef } from '../track';
import { side, type TrackStyle } from '../trackMesh';
import { billboards, cloudRing, rippleTex, startGantry, type Scenery } from '../scenery';
import { birds, boats, building, bunting, city, crowd, done, fillGrid, gridLanes, ground, lamps, patch, roadsideSpots, screens, traffic, tree, walkers, type City } from './city';

export const NEWYORK: TrackDef = {
  id: 'newyork', name: 'Big Apple Dash', laps: 3, waterY: -3,
  cps: [
    { x: 0, z: -90 }, { x: 0, z: -20 }, { x: 4, z: 40 }, { x: 10, z: 80 }, { x: 34, z: 106, apron: 5 }, { x: 30, z: 140, apron: 5 }, { x: 50, z: 175, apron: 5 }, { x: 90, z: 192 }, { x: 128, z: 185 }, { x: 150, z: 160 },
    { x: 152, z: 100 }, { x: 152, z: 20 }, { x: 150, z: -60 }, { x: 138, z: -105 }, { x: 110, z: -135, y: 2, apron: 2 }, { x: 75, z: -145, y: 5, apron: 1.5 }, { x: 35, z: -145, y: 5, apron: 1.5 }, { x: 8, z: -138, y: 2, apron: 2 }, { x: -6, z: -120 },
  ],
  features: [
    { kind: 'boost', at: 0, off: 30, d: -2.5 },
    { kind: 'boost', at: 0, off: 30, d: 2.5 },
    { kind: 'ramp', at: 6, off: 6, len: 10, h: 1.4 },
    { kind: 'boost', at: 10, off: 30, d: 0 },
    { kind: 'boost', at: 15, off: 16, d: 0 },
  ],
  items: [{ at: 2, off: 20 }, { at: 7, off: 10 }, { at: 11, off: 30 }, { at: 16, off: 14 }],
  coins: [
    { at: 1, off: 10, d: -2.5, n: 5 },
    { at: 4, off: 14, d: 1.5, n: 5, dd: -0.6 },
    { at: 8, off: 6, d: 0, n: 5 },
    { at: 10, off: 4, d: 2.5, n: 5 },
    { at: 12, off: 10, d: -2, n: 5, dd: 0.8 },
    { at: 17, off: 2, d: 0, n: 5 },
  ],
  clear: [{ at: 6, off: -20, len: 50 }],
};

export const NEWYORK_STYLE: TrackStyle = { road: 'asphalt', kerb: [0xffc61a, 0x2b2f3a], apron: [0xb4b6ba, 0xa8abb0], wall: 'barrier', edge: 'bank', bank: 0x9a948a, gapFace: 0xb9b2a3, baseY: -0.06 };

/** The bay: water south of the bridge, opening to the sea. */
const inBay = (x: number, z: number, m = 0) => z < -122 + m && Math.abs(x - 75) < 32 - m + Math.max(0, -150 - z) * 1.1;
const inPark = (x: number, z: number) => x > 22 && x < 175 && z > 92 && z < 250;

const SCREEN_COLORS = ['#ff2d55', '#ffd60a', '#30d158', '#0a84ff', '#bf5af2', '#ff9f0a'];
const WORDS = ['HELLO NEW YORK!', 'WORD OF THE DAY: BRAVE', 'SPEAK ENGLISH!', 'BROADWAY TONIGHT', 'I ♥ ENGLISH', 'BIG APPLE DASH', 'PAST • PRESENT • FUTURE', 'HOW ARE YOU?', 'GO GO GO!'];
function drawScreen(seed: number) {
  return (g: CanvasRenderingContext2D, t0: number, w: number, h: number) => {
    const t = Number.isFinite(t0) ? Math.abs(t0) : 0, step = Math.floor(t / 3);
    const k = (step + seed) % 4, c1 = SCREEN_COLORS[(seed + step) % 6], c2 = SCREEN_COLORS[(seed + 2 + step) % 6];
    const gr = g.createLinearGradient(0, 0, w, h); gr.addColorStop(0, c1); gr.addColorStop(1, c2);
    g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.fillStyle = 'rgba(255,255,255,.18)';
    if (k === 0) for (let i = 0; i < 6; i++) { g.beginPath(); g.arc(((t * 40 + i * 60) % (w + 80)) - 40, h / 2 + Math.sin(t * 2 + i) * h * 0.3, h * 0.2, 0, Math.PI * 2); g.fill(); }
    if (k === 1) for (let i = 0; i < 10; i++) g.fillRect(0, ((i * h) / 10 + t * 30) % h, w, h / 20);
    if (k === 2) { g.save(); g.translate(w / 2, h / 2); g.rotate(t); for (let i = 0; i < 8; i++) { g.rotate(Math.PI / 4); g.fillRect(0, -4, w, 8); } g.restore(); }
    const txt = WORDS[(seed + step) % WORDS.length];
    g.font = `italic 900 ${Math.round(h * 0.34)}px Inter, system-ui, sans-serif`;
    g.textBaseline = 'middle';
    const tw = g.measureText(txt).width;
    const x = tw > w * 0.9 ? w - ((t * 70 + seed * 50) % (tw + w)) : (w - tw) / 2;
    g.fillStyle = 'rgba(0,0,0,.35)'; g.fillText(txt, x + 3, h / 2 + 3);
    g.fillStyle = '#fff'; g.fillText(txt, x, h / 2);
  };
}

/** A suspension bridge tower (two stone legs with gothic arches) at road position s. */
function bridgeTower(c: City, s: number) {
  const tr = c.track, f = tr.frame(Math.round(s / tr.ds)), span = f.w + KERB + f.apron + 2.2;
  const stone = 0xc9b48e, top = 42;
  for (const sg of [-1, 1]) { const P = side(f, sg * span); c.world.add(U.box, stone, P.x, top / 2 - 3, P.z, 4, top + 6, 6, 0, f.yaw, 0); }
  const C = side(f, 0);
  for (const y of [14, 30]) c.world.add(U.box, stone, C.x, y, C.z, span * 2 + 4, 3, 6, 0, f.yaw, 0);
  c.world.add(U.box, stone, C.x, top + 1, C.z, span * 2 + 5, 3, 6.4, 0, f.yaw, 0);
  return { f, span, top };
}

export function buildNewYork(track: Track): Scenery {
  const c = city(track, 1625);
  const { world, glossy, glow, group, rand } = c;

  /* ---------------- ground, bay and sea ---------------- */
  ground(c, { cx: 60, cz: 0, size: 1200, step: 34, gx: 0, gz: 0, y: (x, z) => (inBay(x, z, 6) || z < -300 ? -7 : -0.08), color: (x, z) => (inBay(x, z, -3) || z < -296 ? 0x9a9488 : 0xffffff), walk: '#bab7b0', asphalt: '#3f4248' });
  const sea = makeOcean({ deep: 0x1f5d86, shallow: 0x3f8fae, amp: 0.22, scale: 1.1, dir: [0.2, 1] });
  const sgeo = oceanGeometry(75, -460, 1200, 680, 120, 70, (x, z) => (inBay(x, z) || z < -300 ? 3 + Math.min(20, (-120 - z) * 0.1) : 0));
  const sm = new THREE.Mesh(sgeo, sea.material);
  sm.position.y = -3;
  group.add(sm);
  // quay walls along the bay
  for (let z = -124; z > -310; z -= 4) for (const sg of [-1, 1]) {
    const x = 75 + sg * (32 + Math.max(0, -150 - z) * 1.1);
    if (c.clear(x, z, -3)) world.add(U.box, 0x8d8a82, x, -1.5, z, 1.4, 3.4, 4.2, 0, sg * -0.6 * (z < -150 ? 1 : 0), 0);
  }

  /* ---------------- the suspension bridge ---------------- */
  for (let s = track.cpS[14] - 6; s < track.cpS[17] + 6; s += 2) {
    const f = track.frame(Math.round(s / track.ds));
    if (!inBay(f.p.x, f.p.z, -2)) continue;
    const C = side(f, 0);
    world.add(U.box, 0x6d6a63, C.x, C.y - 0.8, C.z, (f.w + KERB + f.apron + 0.6) * 2, 1.4, 2.1, 0, f.yaw, 0);
  }
  const T1 = bridgeTower(c, track.cpS[14] + 10), T2 = bridgeTower(c, track.cpS[15] + 25);
  {
    // main cables (strings of links) and vertical suspenders, both sides
    const steps = 40;
    for (const sg of [-1, 1]) {
      const A = side(T1.f, sg * T1.span), B = side(T2.f, sg * T2.span);
      for (let k = 0; k <= steps; k++) {
        const u = k / steps, x = A.x + (B.x - A.x) * u, z = A.z + (B.z - A.z) * u;
        const y = 8 + (T1.top - 8) * Math.pow(2 * u - 1, 2);
        glossy.add(U.box, 0x7d8794, x, y, z, 0.4, 0.4, 1.4, 0, T1.f.yaw, 0);
        if (k % 2 === 0 && k && k < steps) glossy.add(U.box, 0x9aa3ad, x, (y + 6) / 2, z, 0.08, y - 6, 0.08);
      }
      // side spans down to the anchors on land
      for (const [P, dir] of [[A, -1], [B, 1]] as const) for (let k = 1; k <= 14; k++) {
        const u = k / 14, f = dir < 0 ? T1.f : T2.f;
        glossy.add(U.box, 0x7d8794, P.x + f.t.x * dir * 26 * u, T1.top - (T1.top - 4) * u, P.z + f.t.z * dir * 26 * u, 0.4, 0.4, 2.2, 0, f.yaw, 0);
      }
    }
  }

  /* ---------------- the statue on its island ---------------- */
  {
    const x = 75, z = -330, g = 0x5fa38c;
    world.add(U.cyl, 0x8d8a82, x, -1, z, 30, 4, 30);
    world.add(U.box, 0xb5a98e, x, 6, z, 14, 14, 14);
    world.add(U.box, 0xb5a98e, x, 18, z, 9, 10, 9);
    world.add(new THREE.ConeGeometry(1, 1, 16), g, x, 31, z, 4.2, 18, 4.2);
    world.add(U.cyl, g, x, 41.5, z, 1.4, 4, 1.4);
    world.add(U.ball, g, x, 44.6, z, 1.6, 1.8, 1.6);
    for (let k = 0; k < 7; k++) { const a = -Math.PI / 2 + (k - 3) * 0.32; world.add(new THREE.ConeGeometry(1, 1, 4), g, x + Math.sin(a) * 1.6, 46.4, z + Math.cos(a) * 1.6, 0.25, 1.6, 0.25, Math.cos(a) * 0.5, 0, -Math.sin(a) * 0.5); }
    world.add(U.box, g, x + 1.8, 46, z, 0.9, 8, 0.9, 0, 0, -0.15);
    world.add(U.cyl, 0xd4af37, x + 2.4, 50.6, z, 0.6, 1.4, 0.6);
    glow.add(U.ball, 0xffb030, x + 2.4, 52, z, 0.9, 1.3, 0.9);
    world.add(U.box, 0x7fb3a0, x - 1.6, 37, z - 1.2, 1.4, 3, 0.6, 0.2, 0, 0.3);
  }

  /* ---------------- the city: glass towers, a few landmarks, the square of screens ---------------- */
  const square = (x: number, z: number) => Math.abs(x) < 40 && z > -30 && z < 75;
  fillGrid(c, { x0: -440, x1: 520, z0: -280, z1: 460, step: 34, street: 10 }, (x, z) => {
    if (inBay(x, z, 12) || z < -290 || inPark(x, z) || square(x, z) || Math.abs(x - 188) < 9) return null;
    const d = Math.hypot(x - 80, z - 20), r = rand();
    const h = 22 + rand() * 30 + Math.max(0, 260 - d) * 0.22 + (rand() < 0.1 ? 60 : 0);
    if (r < 0.5) return { kind: 'glass', h, roof: rand() < 0.15 ? 'spire' : 'flat', tint: [0xffffff, 0xd8ecff, 0xcfe0f0, 0xe8f4ff][Math.floor(rand() * 4)] };
    if (r < 0.85) return { kind: 'office', h: h * 0.8, roof: 'flat', tint: [0xffffff, 0xf2e6d4, 0xe2e6ea][Math.floor(rand() * 3)] };
    return { kind: 'brick', h: 12 + rand() * 10, roof: 'flat', roofColor: 0x6b5a50 };
  });
  // an art-deco giant with stepped tiers and a mast, and one with a shiny crown
  { const x = 240, z = 60; building(c, 'office', x, z, 30, 30, 90, 0, { roof: 'none', tint: 0xf2ead8 }); building(c, 'office', x, z, 22, 22, 125, 0, { roof: 'none', tint: 0xf2ead8 }); building(c, 'office', x, z, 14, 14, 150, 0, { roof: 'flat', tint: 0xf2ead8 }); glossy.add(U.cyl, 0xd8dde4, x, 165, z, 1.6, 30, 1.6); glow.add(U.ball, 0xff3030, x, 181, z, 0.6, 0.6, 0.6); }
  { const x = 220, z = 180; building(c, 'office', x, z, 22, 22, 110, 0, { roof: 'none', tint: 0xeef2f6 }); for (let k = 0; k < 6; k++) glossy.add(new THREE.ConeGeometry(1, 1, 4), 0xe8eef6, x, 114 + k * 4, z, 10 - k * 1.5, 6, 10 - k * 1.5, 0, Math.PI / 4, 0); glossy.add(U.cyl, 0xe8eef6, x, 145, z, 0.4, 14, 0.4); }
  // the square: billboard towers with animated screens and a crowd
  {
    const list: Parameters<typeof screens>[1] = [];
    for (const [z, sg, i] of [[-6, -1, 0], [10, 1, 1], [24, -1, 2], [40, 1, 3], [52, -1, 4], [66, 1, 5]] as const) {
      const f = track.frame(Math.round((track.cpS[0] + 90 + z) / track.ds)), dd = sg * (f.w + KERB + f.apron + 9);
      const P = side(f, dd);
      building(c, 'glass', P.x + f.r.x * sg * 8, P.z + f.r.z * sg * 8, 16, 14, 46 + i * 6, 0, { roof: 'flat', tint: 0xd8e6f4 });
      const ry = f.yaw + (sg > 0 ? Math.PI / 2 : -Math.PI / 2);
      list.push({ x: P.x, y: 12, z: P.z, w: 14, h: 7, ry, draw: drawScreen(i) });
      list.push({ x: P.x, y: 21, z: P.z, w: 11, h: 5.5, ry, draw: drawScreen(i + 3) });
      list.push({ x: P.x, y: 29, z: P.z, w: 12, h: 4, ry, draw: drawScreen(i + 6) });
      world.add(U.box, 0x2b2f3a, P.x + f.r.x * sg * 0.6, 17, P.z + f.r.z * sg * 0.6, 1, 34, 14, 0, f.yaw, 0);
    }
    screens(c, list, 10);
    crowd(c, roadsideSpots(c, track.cpS[0] + 70, track.cpS[3] - 4, { rows: 3, every: 1.1 }));
    bunting(c, track.cpS[0] + 60, track.cpS[3], 18, [0xff2d55, 0xffd60a, 0x0a84ff, 0x30d158]);
  }

  /* ---------------- the park: lawn, trees, pond, joggers, a horse carriage ---------------- */
  patch(c, [[22, 92], [175, 92], [175, 250], [22, 250]], 0x5aa646);
  for (let k = 0; k < 160; k++) { const x = 26 + rand() * 146, z = 96 + rand() * 150; if (c.clear(x, z, 1.5) && Math.hypot(x - 95, z - 140) > 22) tree(c, x, z, rand() < 0.2 ? 'pine' : 'round', 1.2 + rand() * 0.5); }
  {
    const pond = new THREE.Mesh(new THREE.CircleGeometry(19, 40).rotateX(-Math.PI / 2), new THREE.MeshPhysicalMaterial({ color: 0x3f8fae, roughness: 0.05, clearcoat: 1, normalMap: rippleTex(), normalScale: new THREE.Vector2(0.15, 0.15) }));
    pond.position.set(95, 0.06, 140);
    group.add(pond);
    for (let k = 0; k < 30; k++) { const a = (k / 30) * Math.PI * 2; world.add(U.blob, 0x8a8478, 95 + Math.cos(a) * 19.5, 0.1, 140 + Math.sin(a) * 19.5, 1.0, 0.5, 1.0); }
    // a horse carriage and joggers going round the pond
    const cg = new Geo();
    cg.add(U.box, 0x8a5a36, 0, 1.0, 0, 1.4, 1.0, 1.8, 0, 0, 0).add(U.box, 0x2b2f3a, 0, 1.9, -0.3, 1.5, 0.9, 1.2).add(U.cyl, 0x2b2f3a, -0.8, 0.6, 0.6, 0.55, 0.12, 0.55, 0, 0, Math.PI / 2).add(U.cyl, 0x2b2f3a, 0.8, 0.6, 0.6, 0.55, 0.12, 0.55, 0, 0, Math.PI / 2);
    cg.add(U.box, 0xf4f4f2, 0, 1.4, 2.6, 0.6, 0.8, 1.8).add(U.box, 0xf4f4f2, 0, 2.0, 3.4, 0.4, 0.7, 0.5);
    for (const [lx, lz] of [[-0.2, 1.9], [0.2, 1.9], [-0.2, 3.3], [0.2, 3.3]]) cg.add(U.box, 0xe8e8e4, lx, 0.5, lz, 0.14, 1.0, 0.14);
    const carriage = new THREE.Mesh(cg.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.6 }));
    carriage.castShadow = true;
    group.add(carriage);
    c.updates.push((_, t) => { const a = t * 0.12; carriage.position.set(95 + Math.cos(a) * 25, Math.abs(Math.sin(t * 6)) * 0.05, 140 + Math.sin(a) * 25); carriage.rotation.y = -a; });
  }
  crowd(c, roadsideSpots(c, track.cpS[5], track.cpS[7], { rows: 1, every: 2.6 }), false);

  /* ---------------- elevated train next to the east avenue ---------------- */
  {
    const x = 188, z0 = -90, z1 = 230, y = 9;
    for (let z = z0; z <= z1; z += 16) { world.add(U.box, 0x5a5f6a, x - 2, y / 2, z, 0.8, y, 0.8); world.add(U.box, 0x5a5f6a, x + 2, y / 2, z, 0.8, y, 0.8); }
    world.add(U.box, 0x4a4f5a, x, y + 0.3, (z0 + z1) / 2, 6, 0.8, z1 - z0);
    const tg = new Geo();
    for (let k = 0; k < 5; k++) { tg.add(U.box, 0xb8c0cc, 0, 1.6, k * 15.5, 3, 3, 15); tg.add(U.box, 0x24324a, 0, 2.1, k * 15.5, 3.04, 1.0, 13.6); tg.add(U.box, 0x7a2f8f, 0, 0.9, k * 15.5, 3.04, 0.3, 15); }
    const train = new THREE.Mesh(tg.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.4 }));
    train.castShadow = true;
    group.add(train);
    c.updates.push((_, t) => { const u = (Math.sin(t * 0.09) * 0.5 + 0.5); train.position.set(x, y + 0.7, z0 + u * (z1 - z0 - 80)); });
  }

  /* ---------------- start, signs, lamps, people ---------------- */
  const lampsM = startGantry(track, group, glossy, 'BIG APPLE DASH', ['#ff2d55', '#ffd60a'], 0x2b2f3a, 0xffd60a);
  billboards(track, group, world, [
    [4, ['WELCOME TO', 'THE PARK'], ['#14915f', '#7ee08a']],
    [9, ['NEXT STOP:', 'ENGLISH!'], ['#0a84ff', '#5ac8fa']],
    [12, ['SLOW DOWN?', 'NEVER!'], ['#ff2d55', '#ff9f0a']],
    [18, ['LAST TURN'], ['#bf5af2', '#ff2d55']],
  ], c.clear);
  lamps(c, 26, 0x2b2f3a, 0xfff0c8, (f) => !inBay(f.p.x, f.p.z, -4));
  walkers(c, 80, (f) => !inBay(f.p.x, f.p.z, -6));
  crowd(c, roadsideSpots(c, track.cpS[10], track.cpS[12], { rows: 1, every: 3 }), false);

  /* ---------------- life: taxis, ferries, helicopter, blimp, birds ---------------- */
  traffic(c, gridLanes(c, { x0: -440, x1: 520, z0: -280, z1: 460, step: 34 }, (x, z) => inBay(x, z, 10) || z < -290 || inPark(x, z)), [
    { kind: 'taxi', colors: [0xffc61a, 0xffcf33], n: 40, speed: 10 },
    { kind: 'bus', colors: [0x2f6fd0, 0xf4f4f2], n: 8, speed: 8 },
    { kind: 'car', colors: [0x2b2f3a, 0xf4f4f2, 0x9aa0a8, 0xd32f2f], n: 22 },
    { kind: 'van', colors: [0xf4f4f2, 0x8d5a2b], n: 6 },
  ]);
  boats(c, [[30, -220], [120, -220], [200, -380], [75, -440], [-60, -380]], -3.1, [
    { color: 0xff7a1a, len: 22, kind: 'tour' }, { color: 0xffffff, len: 9, kind: 'sail' }, { color: 0x1e3a6e, len: 8, kind: 'speed' }, { color: 0xffffff, len: 10, kind: 'sail' },
  ]);
  {
    const heli = new THREE.Group();
    const hb = new Geo().add(U.ball, 0x2f6fd0, 0, 0, 0, 1.3, 1.1, 2.2).add(U.ball, 0x8fd0ff, 0, 0.25, 1.2, 0.95, 0.75, 1.0).add(U.box, 0x2f6fd0, 0, 0.3, -3, 0.35, 0.35, 3.6);
    heli.add(new THREE.Mesh(hb.build(), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.4 })));
    const rotor = new THREE.Mesh(new THREE.BoxGeometry(8, 0.06, 0.35), new THREE.MeshStandardMaterial({ color: 0x2b2f3a }));
    rotor.position.y = 1.35; heli.add(rotor);
    const blimp = new THREE.Group();
    const bm = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14).scale(7, 7, 22), new THREE.MeshStandardMaterial({ color: 0xf2f4f7, roughness: 0.5 }));
    const side2 = new THREE.Mesh(new THREE.PlaneGeometry(22, 5), new THREE.MeshBasicMaterial({ map: null, color: 0xffffff, side: THREE.DoubleSide, toneMapped: false }));
    blimp.add(bm);
    {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 128;
      const g = cv.getContext('2d')!; g.fillStyle = '#ff2d55'; g.fillRect(0, 0, 512, 128); g.fillStyle = '#fff'; g.font = 'italic 900 70px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('SPEAK ENGLISH!', 256, 68);
      const tx = new THREE.CanvasTexture(cv); tx.colorSpace = THREE.SRGBColorSpace;
      (side2.material as THREE.MeshBasicMaterial).map = tx;
      side2.rotation.y = Math.PI / 2; side2.position.x = 7.05; blimp.add(side2);
      const s3 = side2.clone(); s3.position.x = -7.05; blimp.add(s3);
    }
    group.add(heli, blimp);
    c.updates.push((_, t) => {
      const a = t * 0.1;
      heli.position.set(80 + Math.cos(a) * 200, 70 + Math.sin(t * 0.4) * 4, 40 + Math.sin(a) * 180); heli.rotation.set(0.08, -a + Math.PI, 0.12); rotor.rotation.y = t * 26;
      const b = t * 0.025; blimp.position.set(60 + Math.cos(b) * 260, 110, 60 + Math.sin(b) * 220); blimp.rotation.y = -b + Math.PI;
    });
  }
  birds(c, 95, 160, 70, 30, 14);
  birds(c, 75, -260, 90, 25, 12, 0xf4f4f2);
  cloudRing(group, 60, 0, 18, rand, { tint: 0xffe6c8, glow: 0.7, y0: 130 });

  return done(c, lampsM, { waterY: -3, oceans: [sea.uniforms] });
}
