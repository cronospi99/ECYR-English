/* English Racers — "Campus ECYR", the first track (≈1 km): the start straight by the grandstand,
   a banked sweeper, the east straight with boost pads, a wide hairpin around the fountain, an S
   through the school, a hill with a crest, and a ramp jump over the pond back to the start.
   All the scenery is built in code (merged by material): school buildings with a clock tower,
   sports fields, grandstand with a crowd, trees, lamps, flags, billboards and rolling hills. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Geo, U, busGeo, cloud, shade } from '@/features/run/gfx';
import { KERB, Track, type TrackDef } from './track';
import { BASE_Y, side } from './trackMesh';

export const CAMPUS: TrackDef = {
  id: 'campus',
  name: 'Campus ECYR',
  laps: 3,
  waterY: -2.4,
  cps: [
    { x: 0, z: 0 },
    { x: 0, z: 80 },
    { x: 8, z: 135 },
    { x: 38, z: 170 },
    { x: 90, z: 184 },
    { x: 150, z: 182 },
    { x: 188, z: 158, w: 7.5 },
    { x: 202, z: 128, w: 8 },
    { x: 192, z: 100, w: 8 },
    { x: 166, z: 86, w: 7 },
    { x: 150, z: 35, w: 6.5 },
    { x: 172, z: 4, w: 6.5 },
    { x: 162, z: -32, w: 7 },
    { x: 166, z: -72, y: 2.5, apron: 3 },
    { x: 150, z: -112, y: 6, apron: 2.5 },
    { x: 114, z: -136, y: 3.2, apron: 3 },
    { x: 70, z: -142, y: 0.7 },
    { x: 24, z: -140, y: 0.6, apron: 4 },
    { x: -22, z: -132, y: 0.5 },
    { x: -50, z: -108, y: 0.2, w: 7.5 },
    { x: -34, z: -72 },
    { x: -4, z: -40 },
  ],
  features: [
    { kind: 'boost', at: 1, off: 6, d: 0 },
    { kind: 'boost', at: 4, off: 22, d: -3.2 },
    { kind: 'boost', at: 4, off: 22, d: 3.2 },
    { kind: 'boost', at: 9, off: 4, d: 2 },
    { kind: 'boost', at: 16, off: 6, d: -2.6 },
    { kind: 'boost', at: 16, off: 6, d: 2.6 },
    { kind: 'ramp', at: 17, off: -16, len: 13, h: 2.3 },
    { kind: 'gap', at: 17, off: -3, len: 13 },
  ],
};

const MATS = () => ({
  world: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.86, metalness: 0 }),
  glossy: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.32, metalness: 0.05 }),
  glass: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.08, metalness: 0.2, envMapIntensity: 1.4 }),
  glow: new THREE.MeshBasicMaterial({ vertexColors: true, toneMapped: false }),
});

function textTex(lines: string[], bg: [string, string], fg = '#ffffff', w = 1024, h = 256) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  const c = cv.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, w, h);
  g.addColorStop(0, bg[0]); g.addColorStop(1, bg[1]);
  c.fillStyle = g; c.fillRect(0, 0, w, h);
  c.strokeStyle = 'rgba(255,255,255,.85)'; c.lineWidth = 10; c.strokeRect(8, 8, w - 16, h - 16);
  c.fillStyle = fg; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.shadowColor = 'rgba(0,0,0,.35)'; c.shadowOffsetY = 6;
  const size = lines.length > 1 ? h * 0.3 : h * 0.5;
  c.font = `italic 900 ${size}px Inter, system-ui, sans-serif`;
  lines.forEach((l, i) => c.fillText(l, w / 2, h / 2 + (i - (lines.length - 1) / 2) * size * 1.1, w - 60));
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Tileable ripple normals (sum of waves with whole periods across the tile). */
function rippleTex() {
  const N = 128, cv = document.createElement('canvas');
  cv.width = cv.height = N;
  const c = cv.getContext('2d')!, img = c.createImageData(N, N);
  const H = (x: number, y: number) => {
    const u = (x / N) * Math.PI * 2, v = (y / N) * Math.PI * 2;
    return Math.sin(u * 3 + v * 2) * 0.5 + Math.sin(u * -2 + v * 5 + 1.3) * 0.35 + Math.sin(u * 7 - v * 3 + 0.7) * 0.18 + Math.sin(u * 5 + v * 9 + 2.1) * 0.1;
  };
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const dx = (H(x + 1, y) - H(x - 1, y)) * 6, dy = (H(x, y + 1) - H(x, y - 1)) * 6;
    const l = Math.hypot(dx, dy, 1), o = (y * N + x) * 4;
    img.data[o] = (-dx / l * 0.5 + 0.5) * 255; img.data[o + 1] = (-dy / l * 0.5 + 0.5) * 255; img.data[o + 2] = (1 / l * 0.5 + 0.5) * 255; img.data[o + 3] = 255;
  }
  c.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export interface Scenery {
  group: THREE.Group;
  /** The three countdown lamps on the start gantry. */
  lamps: THREE.MeshStandardMaterial[];
  water: THREE.Mesh;
  waterY: number;
  dispose(): void;
}

/** Everything around the road for this track. */
export function buildCampus(track: Track): Scenery {
  const M = MATS();
  const group = new THREE.Group();
  const F = track.frames;
  const near = F.filter((_, i) => i % 2 === 0);
  /** Free of the road, its grass and its walls (plus r). */
  const clear = (x: number, z: number, r: number) => near.every((f) => Math.hypot(x - f.p.x, z - f.p.z) > f.w + KERB + f.apron + 2 + r);
  const distRoad = (x: number, z: number) => { let m = Infinity; for (const f of near) m = Math.min(m, Math.hypot(x - f.p.x, z - f.p.z) - f.w); return m; };
  let seed = 11;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };

  const world = new Geo(), glossy = new Geo(), glass = new Geo(), glow = new Geo();
  glow.boost = 1.6;

  /* ---------------- pond under the jump ---------------- */
  const gp = track.gaps[0];
  const gs = (gp.s0 + gp.s1) / 2, gf = track.frame(Math.round(gs / track.ds));
  const pond = { x: gf.p.x, z: gf.p.z, t: gf.t.clone(), r: gf.r.clone(), a: (gp.s1 - gp.s0) / 2 + 0.5, b: 30 };
  const inPond = (x: number, z: number) => {
    const dx = x - pond.x, dz = z - pond.z;
    const u = (dx * pond.t.x + dz * pond.t.z) / pond.a, w = (dx * pond.r.x + dz * pond.r.z) / pond.b;
    return u * u + w * w;
  };
  const waterY = -1.3;

  /* ---------------- terrain: grass, rolling hills away from the road, the pond basin ---------------- */
  {
    const S = 1100, n = 150;
    const geo = new THREE.PlaneGeometry(S, S, n, n);
    geo.rotateX(-Math.PI / 2);
    const cx = 80, cz = 20;
    geo.translate(cx, 0, cz);
    const pos = geo.getAttribute('position');
    const col = new Float32Array(pos.count * 3);
    const c = new THREE.Color();
    const sparse = F.filter((_, i) => i % 4 === 0);
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i), z = pos.getZ(i);
      let dmin = Infinity;
      for (const f of sparse) dmin = Math.min(dmin, Math.hypot(x - f.p.x, z - f.p.z) - f.w - f.apron);
      const hill = THREE.MathUtils.smoothstep(dmin, 25, 140) * (Math.sin(x * 0.011) * Math.cos(z * 0.013) * 9 + Math.sin(x * 0.027 + z * 0.019) * 4 + 7);
      let y = BASE_Y + Math.max(0, hill);
      const pd = inPond(x, z);
      if (pd < 1.3) y = Math.min(y, THREE.MathUtils.lerp(-3.6, BASE_Y, THREE.MathUtils.smoothstep(pd, 0.7, 1.15)));
      pos.setY(i, y);
      const n1 = Math.sin(x * 0.15) * Math.cos(z * 0.13) * 0.5 + Math.sin(x * 0.041 + z * 0.037) * 0.5;
      c.setHex(0x5aa646).offsetHSL(0.01 * n1, 0.03 * n1, 0.05 * n1 + Math.min(0.08, hill * 0.004));
      if (pd < 1.5) c.lerp(new THREE.Color(0xd8c48c), THREE.MathUtils.smoothstep(1.5 - pd, 0, 0.5));
      if (pd < 0.95) c.setHex(0x6f6a4a);
      col[i * 3] = c.r; col[i * 3 + 1] = c.g; col[i * 3 + 2] = c.b;
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
    geo.computeVertexNormals();
    const m = new THREE.Mesh(geo, M.world);
    m.receiveShadow = true;
    group.add(m);
  }

  /* ---------------- water ---------------- */
  const waterMat = new THREE.MeshPhysicalMaterial({ color: 0x2c9fc0, roughness: 0.06, metalness: 0, transparent: true, opacity: 0.88, clearcoat: 1, clearcoatRoughness: 0.05, normalMap: rippleTex(), normalScale: new THREE.Vector2(0.12, 0.12) });
  const wgeo = new THREE.CircleGeometry(1, 48);
  wgeo.rotateX(-Math.PI / 2);
  {
    // uv in metres / 6 so the ripples keep their size on the stretched disc
    const uv = wgeo.getAttribute('uv') as THREE.BufferAttribute, P = wgeo.getAttribute('position');
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (P.getX(i) * pond.b * 1.2) / 6, (P.getZ(i) * pond.a * 1.35) / 6);
  }
  const water = new THREE.Mesh(wgeo, waterMat);
  water.scale.set(pond.b * 1.2, 1, pond.a * 1.35);
  water.rotation.y = Math.atan2(pond.t.x, pond.t.z);
  water.position.set(pond.x, waterY, pond.z);
  group.add(water);
  // lily pads, rocks, reeds
  for (let i = 0; i < 26; i++) {
    const a = rand() * Math.PI * 2, rr = 0.3 + rand() * 0.6;
    const x = pond.x + (Math.cos(a) * pond.b * rr) * pond.r.x + (Math.sin(a) * pond.a * rr) * pond.t.x;
    const z = pond.z + (Math.cos(a) * pond.b * rr) * pond.r.z + (Math.sin(a) * pond.a * rr) * pond.t.z;
    if (Math.abs(Math.cos(a) * pond.b * rr) < 11) continue; // keep the jump clear
    world.add(U.cyl, rand() < 0.2 ? 0xf7a8c8 : 0x3f9a3a, x, waterY + 0.03, z, 0.6 + rand() * 0.5, 0.04, 0.6 + rand() * 0.5);
  }
  for (let i = 0; i < 40; i++) {
    const a = rand() * Math.PI * 2;
    const x = pond.x + Math.cos(a) * pond.b * 1.05 * pond.r.x + Math.sin(a) * pond.a * 1.25 * pond.t.x;
    const z = pond.z + Math.cos(a) * pond.b * 1.05 * pond.r.z + Math.sin(a) * pond.a * 1.25 * pond.t.z;
    if (!clear(x, z, 0.5)) continue;
    if (rand() < 0.6) world.blob(x, -0.4, z, 0.6 + rand() * 0.9, 0x9a9488, 0.6);
    else for (let k = 0; k < 4; k++) world.add(U.cyl6, 0x4e8a2e, x + rand() - 0.5, 0.2, z + rand() - 0.5, 0.05, 1.4 + rand(), 0.05);
  }

  /* ---------------- buildings ---------------- */
  const parts: THREE.BufferGeometry[] = [];
  const place = (g: Geo, x: number, z: number, ry: number) => { const geo = g.build(); geo.rotateY(ry); geo.translate(x, 0, z); return geo; };
  const school = (x: number, z: number, w: number, d: number, floors: number, ry: number, wall: number, trim: number, tower = false) => {
    const g = new Geo(), gl = new Geo();
    const H = floors * 3.6;
    g.box(0, 0, 0, w, H, d, wall);
    g.box(0, H, 0, w + 0.6, 0.5, d + 0.6, trim);
    g.box(0, 0, 0, w + 0.3, 0.6, d + 0.3, shade(wall, -0.12));
    for (let f = 0; f < floors; f++) {
      g.box(0, f * 3.6 + 0.05, 0, w + 0.12, 0.22, d + 0.12, trim);
      for (let k = 0; k < Math.floor(w / 3.4); k++) {
        const wx = -w / 2 + 1.7 + k * 3.4;
        for (const sz of [-1, 1]) {
          gl.box(wx, f * 3.6 + 1.0, (sz * d) / 2 + sz * 0.04, 2.0, 1.7, 0.1, 0x5f8fc2);
          g.box(wx, f * 3.6 + 0.85, (sz * d) / 2 + sz * 0.1, 2.3, 0.14, 0.24, 0xf2f2ee);
        }
      }
      for (let k = 0; k < Math.floor(d / 3.4); k++) {
        const wz = -d / 2 + 1.7 + k * 3.4;
        for (const sx of [-1, 1]) gl.box((sx * w) / 2 + sx * 0.04, f * 3.6 + 1.0, wz, 0.1, 1.7, 2.0, 0x5f8fc2);
      }
    }
    // entrance with canopy and steps
    g.box(0, 0, -d / 2 - 0.05, 4.2, 3.1, 0.2, 0x7a4b2a);
    g.box(0, 3.2, -d / 2 - 1.6, 6, 0.25, 3.4, trim);
    for (const sx of [-1, 1]) g.cyl(sx * 2.7, 0, -d / 2 - 3, 0.16, 3.2, 0xf2f2ee);
    g.box(0, 0, -d / 2 - 2.4, 7, 0.3, 2.2, 0xcfcac0);
    // roof details
    g.box(-w * 0.28, H + 0.5, d * 0.1, 3, 1.4, 2.4, 0xc9ced6);
    g.box(w * 0.3, H + 0.5, -d * 0.15, 2.2, 1.1, 2.2, 0xb8bec8);
    if (tower) {
      g.box(0, H, 0, 5.2, 9, 5.2, wall);
      g.box(0, H + 9, 0, 5.8, 0.5, 5.8, trim);
      g.add(U.cyl, 0x2e5fa7, 0, H + 12.2, 0, 3.9, 6, 3.9, 0, Math.PI / 4, 0);
      g.add(new THREE.ConeGeometry(1, 1, 4), 0x2e5fa7, 0, H + 11.3, 0, 4.4, 4.6, 4.4, 0, Math.PI / 4, 0);
      for (const [dx, dz, ry2] of [[0, -2.62, 0], [0, 2.62, 0], [-2.62, 0, Math.PI / 2], [2.62, 0, Math.PI / 2]] as const) {
        g.add(U.cyl, 0xfdfbf2, dx, H + 6, dz, 1.5, 0.12, 1.5, Math.PI / 2, ry2, 0);
        g.add(U.box, 0x1b1b1b, dx * 1.02, H + 6.35, dz * 1.02, 0.12, 0.9, 0.06, 0, ry2, 0);
        g.add(U.box, 0x1b1b1b, dx * 1.02 + (ry2 ? 0 : 0.3), H + 6, dz * 1.02 + (ry2 ? 0.3 : 0), ry2 ? 0.06 : 0.7, 0.1, ry2 ? 0.7 : 0.06, 0, 0, 0);
      }
    }
    parts.push(place(g, x, z, ry));
    glass.parts.push(place(gl, x, z, ry));
  };
  const okB = (x: number, z: number, r: number) => clear(x, z, r);
  if (okB(78, 42, 20)) school(78, 42, 46, 18, 3, Math.PI / 2, 0xf3dcc0, 0xc0392b, true);
  if (okB(92, 112, 14)) school(92, 112, 30, 14, 2, Math.PI / 2 + 0.05, 0xd9e6f2, 0x2e5fa7);
  if (okB(118, -60, 12)) school(118, -62, 22, 12, 2, 0.15, 0xf6efd8, 0x2f9a6a);

  // school bus parked by the main building
  {
    const bus = busGeo(0);
    bus.rotateY(-0.2); bus.translate(52, 0, 18);
    parts.push(bus);
  }

  /* ---------------- sports: football pitch, basketball court ---------------- */
  {
    const g = new Geo();
    const W = 50, D = 30;
    for (let k = 0; k < 10; k++) g.box(-W / 2 + W / 20 + (k * W) / 10, 0, 0, W / 10, 0.05, D, k % 2 ? 0x4fae45 : 0x5cbd50);
    const line = (x: number, z: number, w: number, d: number) => g.box(x, 0.05, z, w, 0.02, d, 0xffffff);
    line(0, -D / 2, W, 0.18); line(0, D / 2, W, 0.18); line(-W / 2, 0, 0.18, D); line(W / 2, 0, 0.18, D); line(0, 0, 0.18, D);
    for (let k = 0; k < 24; k++) { const a = (k / 24) * Math.PI * 2; line(Math.cos(a) * 4.5, Math.sin(a) * 4.5, 0.6, 0.18); }
    for (const sx of [-1, 1]) {
      line(sx * (W / 2 - 4), 0, 0.18, 12); line(sx * (W / 2 - 2), -6, 4, 0.18); line(sx * (W / 2 - 2), 6, 4, 0.18);
      const gx = sx * (W / 2 + 0.6);
      for (const sz of [-1, 1]) g.cyl(gx, 0, sz * 3.6, 0.09, 2.4, 0xffffff);
      g.add(U.cyl, 0xffffff, gx, 2.4, 0, 0.09, 7.2, 0.09, Math.PI / 2, 0, 0);
      g.box(gx + sx * 0.9, 0, 0, 0.05, 2.3, 7.1, 0xdfe5ea);
    }
    if (okB(66, -40, 26)) parts.push(place(g, 66, -40, 0.12));
  }
  {
    const g = new Geo();
    g.box(0, 0, 0, 28, 0.06, 15, 0xd9773a);
    g.box(0, 0.06, 0, 26, 0.02, 13, 0xe68a4c);
    for (const [x, z, w, d] of [[0, -6.5, 26, 0.12], [0, 6.5, 26, 0.12], [-13, 0, 0.12, 13], [13, 0, 0.12, 13], [0, 0, 0.12, 13]]) g.box(x, 0.08, z, w, 0.01, d, 0xffffff);
    for (const sx of [-1, 1]) {
      g.cyl(sx * 13.8, 0, 0, 0.12, 3.6, 0x2b2f3a);
      g.box(sx * 13.3, 3.2, 0, 0.12, 1.1, 1.8, 0xffffff);
      g.add(new THREE.TorusGeometry(0.24, 0.03, 6, 16), 0xff5a1f, sx * 12.9, 3.05, 0, 1, 1, 1, Math.PI / 2, 0, 0);
    }
    if (okB(40, 108, 15)) parts.push(place(g, 40, 108, 0.25));
  }

  /* ---------------- fountain inside the hairpin ---------------- */
  {
    const cx = 176, cz = 124;
    if (okB(cx, cz, 5)) {
      world.cyl(cx, 0, cz, 5, 0.7, 0xd8d2c4);
      glass.cyl(cx, 0.4, cz, 4.4, 0.4, 0x3aa6c9);
      world.cyl(cx, 0, cz, 0.9, 2.2, 0xe4dfd2);
      world.cyl(cx, 2.2, cz, 2, 0.3, 0xd8d2c4);
      world.cyl(cx, 2.5, cz, 0.4, 1.4, 0xe4dfd2);
      glow.blob(cx, 3.8, cz, 0.5, 0xbfefff, 1.4);
      for (let k = 0; k < 10; k++) {
        const a = (k / 10) * Math.PI * 2, bx = cx + Math.cos(a) * 6.6, bz = cz + Math.sin(a) * 6.6;
        world.blob(bx, 0.35, bz, 0.95, 0x4f9e3c, 0.75);
        for (let j = 0; j < 4; j++) world.add(U.ball, [0xff6fa8, 0xffd23f, 0xffffff][j % 3], bx + (rand() - 0.5) * 1.2, 0.95 + rand() * 0.2, bz + (rand() - 0.5) * 1.2, 0.16, 0.16, 0.16);
      }
    }
  }

  /* ---------------- grandstand with a crowd on the start straight ---------------- */
  {
    const g = new Geo();
    const L = 64;
    for (let k = 0; k < 6; k++) {
      g.box(-k * 1.2, 0, 0, 1.2, 0.7 + k * 0.7, L, 0x9aa3ae);
      g.box(-k * 1.2 + 0.2, 0.7 + k * 0.7, 0, 0.5, 0.35, L, k % 2 ? 0x2e5fa7 : 0xc0392b);
    }
    g.box(-8.2, 0, 0, 0.6, 9, L, 0x7d8692);
    for (let z = -L / 2; z <= L / 2; z += 8) g.cyl(-8.2, 0, z, 0.25, 9.6, 0xb8bec8);
    g.add(U.box, 0xf2f2ee, -3.6, 9.6, 0, 10.6, 0.3, L + 2, 0, 0, -0.18);
    for (let i = 0; i < 260; i++) {
      const k = Math.floor(rand() * 6), z = -L / 2 + 1 + rand() * (L - 2);
      const shirt = [0xff6b6b, 0x4dabf7, 0xffd43b, 0x69db7c, 0xda77f2, 0xffa94d, 0xf8f9fa][Math.floor(rand() * 7)];
      const x = -k * 1.2 + 0.1, y = 0.7 + k * 0.7 + 0.35;
      g.add(U.cyl, shirt, x, y + 0.35, z, 0.22, 0.6, 0.22);
      g.add(U.ball, [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524][Math.floor(rand() * 4)], x, y + 0.85, z, 0.17, 0.19, 0.17);
    }
    const fs = track.frame(Math.round(30 / track.ds));
    const p = side(fs, -(fs.w + KERB + fs.apron + 4));
    if (okB(p.x, p.z, 1)) parts.push(place(g, p.x, p.z, fs.yaw + Math.PI));
  }

  /* ---------------- start gantry with the countdown lamps ---------------- */
  const lamps: THREE.MeshStandardMaterial[] = [];
  {
    const f = F[0], ry = f.yaw;
    const span = f.w + KERB + f.apron + 1.4;
    const L = side(f, -span), R = side(f, span), C = side(f, 0);
    for (const P of [L, R]) {
      glossy.add(U.box, 0x2b2f3a, P.x, 3.8, P.z, 0.8, 7.6, 0.8, 0, ry, 0);
      glossy.add(U.box, 0xffc61a, P.x, 0.2, P.z, 1.2, 0.4, 1.2, 0, ry, 0);
    }
    glossy.add(U.box, 0x2b2f3a, C.x, 7.6, C.z, span * 2 + 0.8, 1.6, 0.9, 0, ry, 0);
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(13, 3.2), new THREE.MeshStandardMaterial({ map: textTex(['ENGLISH RACERS'], ['#ff3d6e', '#ff9f1c']), roughness: 0.5, emissive: 0xffffff, emissiveIntensity: 0.12 }));
    sign.material.emissiveMap = sign.material.map;
    sign.position.set(C.x - f.t.x * 0.47, 8.5, C.z - f.t.z * 0.47);
    sign.rotation.y = ry + Math.PI;
    group.add(sign);
    const back = sign.clone(); back.position.set(C.x + f.t.x * 0.47, 8.5, C.z + f.t.z * 0.47); back.rotation.y = ry; group.add(back);
    for (let k = 0; k < 3; k++) {
      const m = new THREE.MeshStandardMaterial({ color: 0x331111, emissive: 0x000000, roughness: 0.3 });
      lamps.push(m);
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.42, 18, 12), m);
      const d = (k - 1) * 1.5;
      lamp.position.set(C.x + f.r.x * d - f.t.x * 0.55, 6.5, C.z + f.r.z * d - f.t.z * 0.55);
      group.add(lamp);
      glossy.add(U.box, 0x1b1d24, lamp.position.x + f.t.x * 0.2, 6.5, lamp.position.z + f.t.z * 0.2, 1.1, 1.1, 0.5, 0, ry, 0);
    }
  }

  /* ---------------- billboards facing the road ---------------- */
  const boards: [number, string[], [string, string]][] = [
    [Math.round(track.cpS[3] / track.ds), ['LEARN • PLAY • WIN'], ['#2e5fa7', '#36c2ff']],
    [Math.round(track.cpS[7] / track.ds), ['GO! GO! GO!'], ['#ff3d6e', '#ffb02e']],
    [Math.round(track.cpS[11] / track.ds), ['ECYR ENGLISH'], ['#14915f', '#7ee08a']],
    [Math.round(track.cpS[15] / track.ds), ['JUMP!', 'HOLD TO DRIFT'], ['#6a2fb8', '#ff5ce1']],
    [Math.round(track.cpS[20] / track.ds), ['FINAL STRETCH'], ['#c0392b', '#ff9f1c']],
  ];
  for (const [i, text, bg] of boards) {
    const f = track.frame(i);
    const sg = f.curv > 0 ? 1 : -1; // outside of the bend
    const P = side(f, sg * (f.w + KERB + f.apron + 3));
    if (!clear(P.x, P.z, -2)) continue;
    const tex = textTex(text, bg);
    const m = new THREE.Mesh(new THREE.PlaneGeometry(12, 3), new THREE.MeshStandardMaterial({ map: tex, roughness: 0.55 }));
    m.position.set(P.x, 4.6, P.z);
    // face the road and the karts coming towards it
    const ry = Math.atan2(-f.r.x * sg * 10 - f.t.x * 6, -f.r.z * sg * 10 - f.t.z * 6);
    m.rotation.set(0, ry, 0);
    m.translateZ(0.13);
    group.add(m);
    world.add(U.box, 0x2b2f3a, P.x, 4.6, P.z, 12.4, 3.4, 0.2, 0, ry, 0);
    for (const k of [-1, 1]) {
      const dx = Math.cos(ry) * 4.5 * k, dz = -Math.sin(ry) * 4.5 * k;
      world.cyl(P.x + dx, 0, P.z + dz, 0.18, 3.0, 0x8a919c);
    }
  }

  /* ---------------- lamps, flags, tyre stacks ---------------- */
  for (let i = 8; i < F.length; i += 26) {
    const f = F[i];
    if (track.gapAt(f.s)) continue;
    for (const sg of [-1, 1]) {
      if (sg * f.curv > 0.01) continue;
      const P = side(f, sg * (f.w + KERB + f.apron + 1.6));
      if (!clear(P.x, P.z, -1.8)) continue;
      glossy.cyl(P.x, Math.max(0, P.y - 0.1), P.z, 0.12, 6, 0x59606b);
      glossy.add(U.box, 0x59606b, P.x - f.r.x * sg * 0.8, P.y + 6, P.z - f.r.z * sg * 0.8, 0.2, 0.16, 1.7, 0, f.yaw + Math.PI / 2, 0);
      glow.add(U.box, 0xfff1c4, P.x - f.r.x * sg * 1.45, P.y + 5.88, P.z - f.r.z * sg * 1.45, 0.5, 0.08, 0.3, 0, f.yaw + Math.PI / 2, 0);
    }
  }
  const flagCols = [0xff3d6e, 0x2e9bff, 0xffd23f, 0x2fd17a, 0xb46bff];
  for (let k = 0; k < 10; k++) {
    const f = track.frame(Math.round((-30 + k * 13) / track.ds));
    const P = side(f, f.w + KERB + f.apron + 2.2);
    if (!clear(P.x, P.z, -2.2)) continue;
    world.cyl(P.x, 0, P.z, 0.08, 7, 0xe8ecf0);
    world.add(U.box, flagCols[k % 5], P.x + f.t.x * 1.0, 6.2, P.z + f.t.z * 1.0, 0.04, 1.2, 2, 0, f.yaw, 0);
  }
  const hp = track.frame(Math.round(track.cpS[7] / track.ds));
  for (let k = -6; k <= 6; k++) {
    const f = track.frame(Math.round(hp.s / track.ds) + k * 3);
    const P = side(f, -(f.w + KERB + f.apron + 1.2));
    for (let h = 0; h < 3; h++) glossy.add(new THREE.TorusGeometry(0.42, 0.2, 8, 14), h % 2 ? 0x1d1f24 : (k % 2 ? 0xe23b3b : 0xf5f6f8), P.x, P.y + 0.2 + h * 0.38, P.z, 1, 1, 1, Math.PI / 2, 0, 0);
  }

  /* ---------------- trees ---------------- */
  const tree = (x: number, z: number, s: number) => {
    const y = 0;
    if (rand() < 0.3) {
      world.cyl(x, y, z, 0.25 * s, 1.6 * s, 0x6b4a2b);
      for (let k = 0; k < 3; k++) world.add(new THREE.ConeGeometry(1, 1, 8), shade(0x2f7d3a, (rand() - 0.5) * 0.06), x, y + (2.2 + k * 1.4) * s, z, (2.4 - k * 0.6) * s, 2.4 * s, (2.4 - k * 0.6) * s);
    } else {
      world.cyl(x, y, z, 0.28 * s, 2.4 * s, 0x7a5233);
      const green = [0x4caf50, 0x5cb85c, 0x3d9a48, 0x77c35a][Math.floor(rand() * 4)];
      world.blob(x, y + 3.4 * s, z, 1.9 * s, green, 0.95);
      world.blob(x + 0.9 * s, y + 3.0 * s, z + 0.4 * s, 1.3 * s, shade(green, 0.04), 0.9);
      world.blob(x - 0.8 * s, y + 3.9 * s, z - 0.3 * s, 1.2 * s, shade(green, -0.04), 0.9);
    }
  };
  let trees = 0;
  for (let tries = 0; tries < 2600 && trees < 240; tries++) {
    const x = -140 + rand() * 420, z = -230 + rand() * 470;
    const dr = distRoad(x, z);
    if (dr < 12 || dr > 120 || inPond(x, z) < 1.7 || !clear(x, z, 2)) continue;
    // keep the buildings' and fields' plots clear
    if (Math.abs(x - 78) < 16 && Math.abs(z - 42) < 30) continue;
    if (Math.abs(x - 92) < 12 && Math.abs(z - 112) < 22) continue;
    if (Math.abs(x - 66) < 30 && Math.abs(z + 40) < 21) continue;
    if (Math.abs(x - 40) < 17 && Math.abs(z - 108) < 12) continue;
    if (Math.abs(x - 118) < 16 && Math.abs(z + 62) < 12) continue;
    if (Math.abs(x - 52) < 8 && Math.abs(z - 18) < 8) continue;
    if (x < -14 && x > -40 && z > -10 && z < 70) continue;
    tree(x, z, 0.8 + rand() * 0.6);
    trees++;
  }

  /* ---------------- far hills and clouds ---------------- */
  for (let k = 0; k < 26; k++) {
    const a = (k / 26) * Math.PI * 2 + rand() * 0.1, r = 560 + rand() * 120;
    world.add(U.blob, shade(0x6aa86a, (rand() - 0.5) * 0.08), 80 + Math.cos(a) * r, -20, 20 + Math.sin(a) * r, 90 + rand() * 70, 50 + rand() * 45, 90 + rand() * 70);
  }
  for (let k = 0; k < 16; k++) {
    const c = cloud() as THREE.Mesh<THREE.BufferGeometry, THREE.Material>;
    c.material.dispose();
    c.material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, emissive: 0xdfe9f5, emissiveIntensity: 0.55, fog: false });
    const a = rand() * Math.PI * 2, r = 220 + rand() * 480;
    c.position.set(80 + Math.cos(a) * r, 110 + rand() * 80, 20 + Math.sin(a) * r);
    c.scale.setScalar(2.2 + rand() * 2.4);
    c.rotation.y = rand() * 6;
    group.add(c);
  }

  // merge by material
  const add = (geo: THREE.BufferGeometry | null, mat: THREE.Material, shadow = true) => {
    if (!geo) return;
    const m = new THREE.Mesh(geo, mat);
    m.castShadow = shadow; m.receiveShadow = true;
    group.add(m);
  };
  if (parts.length) { parts.push(world.build()); add(mergeGeometries(parts.map((p) => (p.index ? p.toNonIndexed() : p)), false), M.world); }
  else add(world.build(), M.world);
  if (glossy.parts.length) add(glossy.build(), M.glossy);
  if (glass.parts.length) add(glass.build(), M.glass, false);
  if (glow.parts.length) add(glow.build(), M.glow, false);

  return {
    group, lamps, water, waterY,
    dispose() {
      group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); const mm = m.material as THREE.MeshStandardMaterial; mm.map?.dispose(); mm.normalMap?.dispose(); mm.dispose(); } });
    },
  };
}
