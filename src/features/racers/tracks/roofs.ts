/* English Racers — "Skyline Rush" (≈0.8 km) at sunset, on the rooftops: the road runs along the tops
   of buildings 22–31 m above the street, jumps three gaps between them (ramps on the edge, a fall
   means a respawn) and passes under two tower cranes whose loads swing across the road. Around it a
   whole city: buildings with lit windows, water tanks, AC units, antennas with red lights, a
   helipad, rooftop billboards, streets with traffic far below, a helicopter and flocks of birds. */
import * as THREE from 'three';
import { Geo, U, shade } from '@/features/run/gfx';
import { KERB, type Track, type TrackDef } from '../track';
import { side, type TrackStyle } from '../trackMesh';
import { MATS, billboards, cloudRing, disposeGroup, mergeInto, startGantry, textTex, type Hazard, type Scenery } from '../scenery';

export const ROOFS: TrackDef = {
  id: 'roofs', name: 'Skyline Rush', laps: 3, waterY: 2,
  cps: [
    { x: 0, z: 0, y: 24 },
    { x: 0, z: 75.6, y: 24 },
    { x: 4.9, z: 136.6, y: 22, apron: 3 },
    { x: 34.2, z: 170.8, y: 22, apron: 3 },
    { x: 85.4, z: 180.6, y: 25 },
    { x: 136.6, z: 163.5, y: 28, w: 7.5 },
    { x: 161, z: 122, y: 28, w: 7.5 },
    { x: 148.8, z: 80.5, y: 28, apron: 3 },
    { x: 117.1, z: 61, y: 28, apron: 3, w: 6.5 },
    { x: 112.2, z: 19.5, y: 29, apron: 3, w: 6.5 },
    { x: 129.3, z: -29.3, y: 31 },
    { x: 122, z: -80.5, y: 31 },
    { x: 80.5, z: -104.9, y: 28 },
    { x: 31.7, z: -97.6, y: 25 },
    { x: 4.9, z: -58.6, y: 24 },
  ],
  features: [
    { kind: 'boost', at: 0, off: 20, d: 0 },
    { kind: 'ramp', at: 1, off: 8, len: 12, h: 2.2 },
    { kind: 'gap', at: 1, off: 20, len: 11 },
    { kind: 'boost', at: 5, off: 6, d: -2.5 },
    { kind: 'boost', at: 5, off: 6, d: 2.5 },
    { kind: 'ramp', at: 10, off: 8, len: 12, h: 2.0 },
    { kind: 'gap', at: 10, off: 20, len: 10 },
    { kind: 'ramp', at: 12, off: 14, len: 11, h: 2.0 },
    { kind: 'gap', at: 12, off: 25, len: 9 },
  ],
  items: [{ at: 3, off: 16 }, { at: 8, off: 10 }, { at: 13, off: 20 }],
  gates: [{ at: 2, off: 23 }, { at: 4, off: 30 }, { at: 11, off: 4 }],
  coins: [
    { at: 0, off: 34, d: -2.5, n: 5 },
    { at: 2, off: 30, d: 2, n: 5, dd: -0.8 },
    { at: 5, off: 24, d: 0, n: 6 },
    { at: 6, off: 20, d: -2.5, n: 5, dd: 1 },
    { at: 9, off: 12, d: 2, n: 4 },
    { at: 11, off: 40, d: -2, n: 5 },
    { at: 13, off: 2, d: 2.5, n: 4 },
  ],
};

export const ROOFS_STYLE: TrackStyle = { road: 'roof', kerb: [0xffc61a, 0x26282e], apron: [0x9aa0a8, 0x8f959d], wall: 'parapet', edge: 'sheer', side: 'windows', gapFace: 0xb8b0a2, baseY: 0 };

/** Facade texture (u along the wall, v down) with lit windows, and the glow of the lit ones. */
function facadeTex(lit: boolean, hue: number) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 256;
  const c = cv.getContext('2d')!;
  let r = 17 + hue;
  const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
  c.fillStyle = lit ? '#000' : '#e7e1d6'; c.fillRect(0, 0, 256, 256);
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) {
    const on = rand() < 0.32;
    if (lit) { if (on) { c.fillStyle = `hsl(${38 + rand() * 12}, 90%, ${55 + rand() * 15}%)`; c.fillRect(10 + x * 62, 12 + y * 62, 42, 40); } continue; }
    c.fillStyle = on ? '#f5d58a' : y % 2 ? '#6d8fb8' : '#7a9cc4';
    c.fillRect(10 + x * 62, 12 + y * 62, 42, 40);
    c.fillStyle = 'rgba(255,255,255,.28)'; c.fillRect(10 + x * 62, 12 + y * 62, 42, 6);
    c.fillStyle = '#c9c1b2'; c.fillRect(6 + x * 62, 52 + y * 62, 50, 5);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 4;
  return t;
}

/** Street texture: asphalt with lane lines and zebra crossings (one block per tile). */
function streetTex() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#9b9a96'; c.fillRect(0, 0, 512, 512);
  c.fillStyle = '#4a4d55'; c.fillRect(0, 200, 512, 112); c.fillRect(200, 0, 112, 512);
  c.fillStyle = '#ffd23f'; for (let x = 0; x < 512; x += 40) { c.fillRect(x, 254, 22, 4); c.fillRect(254, x, 4, 22); }
  c.fillStyle = '#f4f4f2'; for (let k = 0; k < 7; k++) { c.fillRect(180 - 14, 206 + k * 15, 14, 8); c.fillRect(206 + k * 15, 180 - 14, 8, 14); }
  c.fillStyle = '#b8b6b0'; c.fillRect(0, 190, 512, 10); c.fillRect(0, 312, 512, 10); c.fillRect(190, 0, 10, 512); c.fillRect(312, 0, 10, 512);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = 8;
  return t;
}

export function buildRoofs(track: Track): Scenery {
  const M = MATS();
  const group = new THREE.Group();
  const F = track.frames;
  const near = F.filter((_, i) => i % 2 === 0);
  const clear = (x: number, z: number, r: number) => near.every((f) => Math.hypot(x - f.p.x, z - f.p.z) > f.w + KERB + f.apron + 2.5 + r);
  let seed = 41;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const world = new Geo(), glossy = new Geo(), glow = new Geo();
  glow.boost = 1.8;

  /* ---------------- street level ---------------- */
  {
    const g = new THREE.PlaneGeometry(1400, 1400);
    g.rotateX(-Math.PI / 2);
    const uv = g.getAttribute('uv') as THREE.BufferAttribute;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * 1400 / 48, uv.getY(i) * 1400 / 48);
    const m = new THREE.Mesh(g, new THREE.MeshStandardMaterial({ map: streetTex(), roughness: 0.92 }));
    m.position.set(70, 0, 40);
    m.receiveShadow = true;
    group.add(m);
  }

  /* ---------------- buildings: facades textured, roofs with details ---------------- */
  const facade = { pos: [] as number[], uv: [] as number[], col: [] as number[] };
  const quad = (a: THREE.Vector3, b: THREE.Vector3, h0: number, h1: number, tint: THREE.Color) => {
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    const P = [[a.x, h0, a.z], [b.x, h0, b.z], [b.x, h1, b.z], [a.x, h1, a.z]];
    const T = [[0, h0 / 6.4], [len / 8, h0 / 6.4], [len / 8, h1 / 6.4], [0, h1 / 6.4]];
    for (const k of [0, 1, 2, 0, 2, 3]) { facade.pos.push(...P[k]); facade.uv.push(T[k][0], T[k][1]); facade.col.push(tint.r, tint.g, tint.b); }
  };
  const tints = [0xffffff, 0xf2e3cf, 0xdfe8f2, 0xf5d9c8, 0xe2e6d4, 0xd8d2ea].map((h) => new THREE.Color(h));
  const building = (x: number, z: number, w: number, d: number, h: number, ry: number) => {
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx: number, lz: number) => new THREE.Vector3(x + lx * c + lz * s, 0, z - lx * s + lz * c);
    const k = [P(-w / 2, -d / 2), P(w / 2, -d / 2), P(w / 2, d / 2), P(-w / 2, d / 2)];
    const tint = tints[Math.floor(rand() * tints.length)];
    for (let i = 0; i < 4; i++) quad(k[i], k[(i + 1) % 4], 0, h, tint);
    world.add(U.box, 0x8c8f96, x, h + 0.2, z, w, 0.4, d, 0, ry, 0);
    world.add(U.box, 0xb9bdc4, x, h + 0.45, z, w + 0.3, 0.5, d + 0.3, 0, ry, 0);
    world.add(U.box, 0x9aa0a8, x, h + 0.5, z, w - 0.8, 0.1, d - 0.8, 0, ry, 0);
    // roof clutter
    const n = 1 + Math.floor(rand() * 3);
    for (let j = 0; j < n; j++) {
      const lx = (rand() - 0.5) * (w - 4), lz = (rand() - 0.5) * (d - 4), q = P(lx, lz), kind = rand();
      if (kind < 0.35) { // water tank on legs
        for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) world.add(U.box, 0x5a4a3a, q.x + ax * 0.9, h + 1.6, q.z + az * 0.9, 0.15, 2.2, 0.15);
        world.add(U.cyl, 0x8a5a36, q.x, h + 3.8, q.z, 1.5, 2.6, 1.5);
        world.add(new THREE.ConeGeometry(1, 1, 14), 0x6b4a2b, q.x, h + 5.5, q.z, 1.6, 0.9, 1.6);
      } else if (kind < 0.7) { // AC units
        for (let a = 0; a < 3; a++) { glossy.add(U.box, 0xc9ced6, q.x + a * 1.4 * c, h + 1.1, q.z - a * 1.4 * s, 1.2, 1.2, 1.2, 0, ry, 0); glossy.add(U.cyl, 0x3a3f4b, q.x + a * 1.4 * c, h + 1.72, q.z - a * 1.4 * s, 0.45, 0.04, 0.45); }
      } else if (kind < 0.85) { // antenna with a red light
        const ah = 6 + rand() * 8;
        glossy.add(U.cyl, 0xb8bec8, q.x, h + ah / 2, q.z, 0.08, ah, 0.08);
        for (let a = 1; a < 4; a++) glossy.add(U.box, 0xb8bec8, q.x, h + ah * a / 4, q.z, 1.4 - a * 0.3, 0.05, 0.05, 0, ry, 0);
        blinks.push(new THREE.Vector3(q.x, h + ah + 0.2, q.z));
      } else { // stair housing
        world.add(U.box, 0xb4b0a6, q.x, h + 1.8, q.z, 3, 2.6, 3.4, 0, ry, 0);
        world.add(U.box, 0x6d4c33, q.x + 1.71 * s, h + 1.6, q.z + 1.71 * c, 1.1, 2.1, 0.06, 0, ry, 0);
      }
    }
  };
  const blinks: THREE.Vector3[] = [];
  // a city block grid around the track (kept clear of it)
  for (let gx = -260; gx <= 420; gx += 26) for (let gz = -320; gz <= 400; gz += 26) {
    if (rand() < 0.12) continue;
    const x = gx + (rand() - 0.5) * 4, z = gz + (rand() - 0.5) * 4;
    const w = 13 + rand() * 7, d = 13 + rand() * 7;
    if (!clear(x, z, Math.max(w, d) * 0.72)) continue;
    const dist = Math.hypot(x - 70, z - 40);
    const h = 10 + rand() * 18 + (dist < 140 ? 8 : 0) + (rand() < 0.08 ? 30 + rand() * 30 : 0);
    building(x, z, w, d, h, 0);
  }
  // under the track: support columns where the road crosses open space between facades
  // (the facades of the road's own buildings come from the track style)
  {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(facade.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(facade.uv, 2));
    g.setAttribute('color', new THREE.Float32BufferAttribute(facade.col, 3));
    g.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({ map: facadeTex(false, 0), vertexColors: true, roughness: 0.7, emissive: 0xffffff, emissiveMap: facadeTex(true, 0), emissiveIntensity: 0.55, side: THREE.DoubleSide });
    const m = new THREE.Mesh(g, mat);
    m.castShadow = true; m.receiveShadow = true;
    group.add(m);
  }
  for (const b of blinks) glow.add(U.ball, 0xff2a2a, b.x, b.y, b.z, 0.22, 0.22, 0.22);

  // a helipad on a tall building near the hairpin
  {
    const x = 196, z = 128, h = 34;
    if (clear(x, z, 12)) {
      building(x, z, 22, 22, h, 0);
      world.cyl(x, h + 0.7, z, 8, 0.12, 0x3a3f4b);
      world.cyl(x, h + 0.82, z, 7.2, 0.02, 0xffc61a);
      world.cyl(x, h + 0.84, z, 6.8, 0.02, 0x3a3f4b);
      world.box(x - 1.6, h + 0.86, z, 0.7, 0.02, 4.6, 0xffffff); world.box(x + 1.6, h + 0.86, z, 0.7, 0.02, 4.6, 0xffffff); world.box(x, h + 0.86, z, 2.6, 0.02, 0.7, 0xffffff);
      for (let k = 0; k < 8; k++) { const a = (k / 8) * Math.PI * 2; glow.add(U.ball, 0x5cff8a, x + Math.cos(a) * 8.2, h + 0.85, z + Math.sin(a) * 8.2, 0.14, 0.1, 0.14); }
    }
  }

  /* ---------------- the road's own rooftops: vents, skylights and planters on the aprons' far side ---------------- */
  for (let i = 10; i < F.length; i += 18) {
    const f = F[i];
    if (track.gapAt(f.s) || track.rampAt(f.s, 0, 9) > 0) continue;
    for (const sg of [-1, 1]) {
      if (rand() < 0.5) continue;
      const P = side(f, sg * (f.w + KERB + f.apron * 0.55));
      if (f.apron < 2.5) continue;
      if (rand() < 0.5) glossy.add(U.cyl, 0xb8bec8, P.x, P.y + 0.6, P.z, 0.35, 1.2, 0.35);
      else { world.add(U.box, 0x7a5a3a, P.x, P.y + 0.3, P.z, 1.4, 0.6, 1.4, 0, f.yaw, 0); world.blob(P.x, P.y + 0.8, P.z, 0.7, 0x4caf50, 0.8); }
    }
  }

  /* ---------------- far skyline ---------------- */
  for (let k = 0; k < 70; k++) {
    const a = rand() * Math.PI * 2, r = 520 + rand() * 260;
    const w = 20 + rand() * 30, h = 40 + rand() * 110;
    world.add(U.box, shade(0x8c7f94, (rand() - 0.5) * 0.12), 70 + Math.cos(a) * r, h / 2, 40 + Math.sin(a) * r, w, h, w * (0.7 + rand() * 0.6));
  }

  /* ---------------- start gantry, rooftop billboards, clouds ---------------- */
  const lamps = startGantry(track, group, glossy, 'SKYLINE RUSH', ['#ff7a1a', '#ff3d6e'], 0x2b2f3a, 0xffc61a);
  billboards(track, group, world, [
    [2, ['MIND THE GAP!'], ['#ff3d6e', '#ff9f1c']],
    [6, ['CITY OF ENGLISH'], ['#2e5fa7', '#36c2ff']],
    [9, ['JUMP!'], ['#6a2fb8', '#ff5ce1']],
    [13, ['ALMOST THERE'], ['#14915f', '#7ee08a']],
  ], clear, 0x6b7280);
  for (const [x, z, ry, text] of [[60, 60, 0.4, ['ECYR', 'ENGLISH']], [-40, 110, -0.6, ['LEARN', 'FASTER']], [210, -20, 2.2, ['GO', 'GO GO!']]] as const) {
    if (!clear(x, z, 6)) continue;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(16, 6), new THREE.MeshStandardMaterial({ map: textTex([...text], ['#ffb02e', '#ff3d6e']), roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.25 }));
    (m.material as THREE.MeshStandardMaterial).emissiveMap = (m.material as THREE.MeshStandardMaterial).map;
    m.position.set(x, 44, z);
    m.rotation.y = ry;
    group.add(m);
    world.add(U.box, 0x2b2f3a, x, 44, z, 16.4, 6.4, 0.3, 0, ry, 0);
    world.cyl(x - Math.cos(ry) * 5, 30, z + Math.sin(ry) * 5, 0.25, 11, 0x6b7280);
    world.cyl(x + Math.cos(ry) * 5, 30, z - Math.sin(ry) * 5, 0.25, 11, 0x6b7280);
  }
  cloudRing(group, 70, 40, 16, rand, { tint: 0xffd2b0, glow: 0.7, y0: 120 });

  /* ---------------- life: cranes, traffic, helicopter, birds ---------------- */
  const live = new THREE.Group();
  group.add(live);
  const lifeMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.15, side: THREE.DoubleSide });
  const hazards: Hazard[] = [];
  const cranes: { jib: THREE.Mesh; cable: THREE.Mesh; load: THREE.Mesh; h: Hazard; tower: THREE.Vector3; top: number; w: number; ph: number; sp: number }[] = [];
  for (const [cp, off, sg] of [[2, 14, 1], [7, 6, -1]] as const) {
    const s = (track.cpS[cp] + off) % track.length, f = track.frame(Math.round(s / track.ds));
    const T = side(f, sg * (f.w + KERB + f.apron + 7));
    const top = f.p.y + 16;
    const tg = new Geo();
    for (let y = 0; y < top; y += 3) {
      tg.add(U.box, 0xffc61a, 0, y + 1.5, 0, 1.6, 0.14, 0.14).add(U.box, 0xffc61a, 0, y + 1.5, 0, 0.14, 0.14, 1.6);
      for (const [ax, az] of [[-0.75, -0.75], [0.75, -0.75], [-0.75, 0.75], [0.75, 0.75]]) tg.add(U.box, 0xf0b400, ax, y + 1.5, az, 0.16, 3, 0.16);
    }
    tg.add(U.box, 0x2b2f3a, 0, top + 1, 0, 2.6, 2, 2.6);
    const tower = new THREE.Mesh(tg.build(), lifeMat);
    tower.position.set(T.x, 0, T.z);
    tower.castShadow = true;
    live.add(tower);
    const jg = new Geo().add(U.box, 0xffc61a, 0.5, 0, 0, 1, 0.8, 0.8).add(U.box, 0xe6a800, -0.08, 0, 0, 0.16, 0.6, 1.2);
    const jib = new THREE.Mesh(jg.build(), lifeMat);
    jib.position.set(T.x, top + 2.4, T.z);
    jib.castShadow = true;
    live.add(jib);
    const cable = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 1, 6).translate(0, -0.5, 0), new THREE.MeshStandardMaterial({ color: 0x2b2f3a }));
    live.add(cable);
    const lg = new Geo();
    lg.add(U.box, 0x3d8bff, 0, 0, 0, 2.6, 1.6, 1.6).add(U.box, 0x2e6fd0, 0, 0.82, 0, 2.7, 0.08, 1.7);
    for (let k = 0; k < 6; k++) lg.add(U.box, 0x2a5fb8, -1.1 + k * 0.44, 0, 0.81, 0.08, 1.5, 0.02);
    const load = new THREE.Mesh(lg.build(), lifeMat);
    load.castShadow = true;
    live.add(load);
    const h: Hazard = { s, d: 0, hs: 1.0, hd: 1.4, on: true, kind: 'load' };
    hazards.push(h);
    cranes.push({ jib, cable, load, h, tower: new THREE.Vector3(T.x, 0, T.z), top: top + 2.4, w: f.w + 2, ph: rand() * 6, sp: 0.55 + rand() * 0.15 });
  }
  // traffic on the streets below (instanced)
  const carG = new Geo();
  carG.add(U.box, 0xffffff, 0, 0.55, 0, 1.8, 0.7, 4).add(U.box, 0xffffff, 0, 1.15, -0.2, 1.6, 0.6, 2.2).add(U.box, 0x2b2f3a, 0, 1.15, -0.2, 1.62, 0.45, 2.0);
  for (const sx of [-0.8, 0.8]) for (const sz of [-1.3, 1.3]) carG.add(U.cyl, 0x1b1d24, sx, 0.35, sz, 0.35, 0.25, 0.35, 0, 0, Math.PI / 2);
  const carMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.35, metalness: 0.3 });
  const nCars = 70;
  const cars = new THREE.InstancedMesh(carG.build(), carMat, nCars);
  const carCols = [0xe23b3b, 0x3d8bff, 0xffc531, 0xf4f4f2, 0x2b2f3a, 0x2fd27a, 0xff7a1a];
  const lanes: { axis: 0 | 1; at: number; dir: number; off: number; sp: number }[] = [];
  for (let k = 0; k < nCars; k++) {
    const axis = (k % 2) as 0 | 1, street = Math.floor(rand() * 26) - 10;
    lanes.push({ axis, at: street * 26 + 13 + (rand() < 0.5 ? -1.6 : 1.6), dir: rand() < 0.5 ? 1 : -1, off: rand() * 700, sp: 8 + rand() * 6 });
    cars.setColorAt(k, new THREE.Color(carCols[k % carCols.length]));
  }
  cars.frustumCulled = false;
  live.add(cars);
  // helicopter
  const heli = new THREE.Group();
  const hb = new Geo();
  hb.add(U.ball, 0xe23b3b, 0, 0, 0, 1.3, 1.1, 2.2).add(U.ball, 0x8fd0ff, 0, 0.25, 1.2, 0.95, 0.75, 1.0).add(U.box, 0xe23b3b, 0, 0.3, -3, 0.35, 0.35, 3.6).add(U.box, 0xf4f4f2, 0, 0.9, -4.6, 0.1, 1.2, 0.6);
  for (const sx of [-0.8, 0.8]) hb.add(U.box, 0x2b2f3a, sx, -1.2, 0, 0.1, 0.1, 3);
  heli.add(new THREE.Mesh(hb.build(), lifeMat));
  const rotor = new THREE.Mesh(new Geo().add(U.box, 0x2b2f3a, 0, 0, 0, 8, 0.06, 0.35).add(U.box, 0x2b2f3a, 0, 0, 0, 0.35, 0.06, 8).build(), lifeMat);
  rotor.position.y = 1.35;
  heli.add(rotor);
  live.add(heli);
  // birds
  const birdG = new Geo().add(U.box, 0x3a3f4b, 0, 0, 0, 0.9, 0.05, 0.25).add(U.ball, 0x4a4f5b, 0, 0, 0.05, 0.12, 0.1, 0.25).build();
  const flock: { m: THREE.Mesh; ox: number; oy: number; oz: number }[] = [];
  for (let k = 0; k < 16; k++) { const m = new THREE.Mesh(birdG, lifeMat); flock.push({ m, ox: (rand() - 0.5) * 14, oy: (rand() - 0.5) * 4, oz: (rand() - 0.5) * 14 }); live.add(m); }

  mergeInto(group, M, { world, glossy, glow });
  const v = new THREE.Vector3(), dm = new THREE.Object3D();
  return {
    group, lamps, waters: [], waterY: -40, hazards,
    update(dt, t) {
      for (const c of cranes) {
        // the load swings across the road like a pendulum, slowing at each end
        const sw = Math.sin(t * c.sp + c.ph);
        c.h.d = sw * c.w;
        track.pointAt(c.h.s, c.h.d, v);
        const f = track.frame(Math.round(c.h.s / track.ds));
        const ly = v.y + 1.25;
        c.load.position.set(v.x, ly, v.z);
        c.load.rotation.set(0, f.yaw + sw * 0.2, sw * 0.08);
        const dx = v.x - c.tower.x, dz = v.z - c.tower.z, len = Math.hypot(dx, dz);
        c.jib.rotation.y = Math.atan2(-dz, dx);
        c.jib.scale.set(len + 3, 1, 1);
        c.cable.position.set(v.x, c.top - 0.4, v.z);
        c.cable.scale.y = c.top - 0.4 - ly - 0.8;
      }
      for (let k = 0; k < nCars; k++) {
        const L = lanes[k], p = ((L.off + t * L.sp * L.dir) % 700 + 700) % 700 - 280;
        if (L.axis === 0) { dm.position.set(p, 0, L.at); dm.rotation.set(0, L.dir > 0 ? Math.PI / 2 : -Math.PI / 2, 0); }
        else { dm.position.set(L.at, 0, p); dm.rotation.set(0, L.dir > 0 ? 0 : Math.PI, 0); }
        dm.updateMatrix();
        cars.setMatrixAt(k, dm.matrix);
      }
      cars.instanceMatrix.needsUpdate = true;
      const ha = t * 0.12;
      heli.position.set(70 + Math.cos(ha) * 190, 62 + Math.sin(t * 0.4) * 4, 40 + Math.sin(ha) * 160);
      heli.rotation.set(0.08, -ha + Math.PI, 0.12);
      rotor.rotation.y = t * 26;
      const fa = t * 0.09;
      const fx = 70 + Math.cos(fa) * 260, fz = 40 + Math.sin(fa * 1.3) * 200;
      for (let k = 0; k < flock.length; k++) {
        const b = flock[k];
        b.m.position.set(fx + b.ox + Math.sin(t + k) * 1.5, 48 + b.oy + Math.sin(t * 1.3 + k) * 1.2, fz + b.oz);
        b.m.rotation.set(0, -fa, Math.sin(t * 10 + k) * 0.5);
      }
      void dt;
    },
    dispose: () => { disposeGroup(group); },
  };
}
