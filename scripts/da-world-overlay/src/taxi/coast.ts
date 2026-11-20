/**
 * Taxi Rush — the coast (ECYR v2, docs/taxi-arte-v2.md §A).
 *
 * The city's north edge becomes a seafront and its north-east corner a wide
 * bend: Ocean Drive (three lanes each way and a double yellow median) runs
 * along the north of the grid, turns south through a 50-unit-radius curve and
 * carries on down the east side to the Coast Highway. Seaward of it: a
 * pavement, the boardwalk with its railing, the beach, and the sea with waves.
 * Off the boardwalk a pier runs out over the water to a plaza with a Ferris
 * wheel under a "PIER ARCADE" arch; three squares, a lighthouse, a clock tower,
 * an open-air theatre and lifeguard towers dot the beach.
 *
 * Everything coastal is laid out in "coast space": `u` runs along Ocean Drive's
 * centre line (0 where the bend starts, negative to the west) and `s` is the
 * signed distance from it (positive towards the sea). One function maps (u, s)
 * to the map and two map back, so the road, the kerbs, the boardwalk, the beach
 * and the drivable grid all follow the same curve with no seams.
 *
 * Draw-call budget: the strips go into the city's per-cell layers (ground,
 * near, detail); the sea, the land under the map, the Ferris wheel, the big
 * signs and each of the five kinds of plant (InstancedMesh, filled each frame
 * with what is near the taxi) are one draw call each.
 */
import {
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  InstancedBufferAttribute,
  InstancedMesh,
  Matrix4,
  Mesh,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  DynamicDrawUsage,
  type Material,
} from 'three';
import { Mesher, rgb, shade, type RGB } from './city';
import { cityMaterial } from './textures';

/* ------------------------------------------------------------------ *
 * Coast space                                                          *
 * ------------------------------------------------------------------ */

/** Ocean Drive: centre of the bend, its radius, the straight's z and the east straight's x. */
// (the drive's inner edge is the grid's own edge: z = MIN_Z = -95 along the north, x = MAX_X = 225 down the east)
export const COAST = { CX: 185, CZ: -55, R: 50, ZN: -105, XE: 235 } as const;
/** Arc length of the bend. */
export const ARC = (COAST.R * Math.PI) / 2;
/** Bands, as distances from the centre line (positive = seaward). */
export const BAND = {
  road: 10, side: 13, board: 21, rail: 20.7, driveBeach: 39, shore: 47,
  /** Lane centres of one direction (the other is the negative). */
  lanes: [1.875, 5.125, 8.375],
} as const;
export const CURB = 0.16;
export const WATER_Y = -1.0;

/** Signed distance from Ocean Drive's centre line (positive towards the sea). */
export function coastS(x: number, z: number): number {
  const { CX, CZ, R, ZN, XE } = COAST;
  if (x <= CX) return z <= CZ ? ZN - z : Math.max(ZN - z, x - XE);
  if (z >= CZ) return x - XE;
  return Math.hypot(x - CX, z - CZ) - R;
}

/** Distance along Ocean Drive (0 at the start of the bend, negative to the west). */
export function coastU(x: number, z: number): number {
  const { CX, CZ, R } = COAST;
  if (x <= CX) return x - CX;
  if (z >= CZ) return ARC + (z - CZ);
  return R * (Math.atan2(z - CZ, x - CX) + Math.PI / 2);
}

export interface CoastPt { x: number; z: number; tx: number; tz: number }
/** Map point and unit tangent (direction of growing u) of (u, s). */
export function coastPoint(u: number, s: number, out: CoastPt = { x: 0, z: 0, tx: 1, tz: 0 }): CoastPt {
  const { CX, CZ, R, ZN, XE } = COAST;
  if (u < 0) { out.x = CX + u; out.z = ZN - s; out.tx = 1; out.tz = 0; }
  else if (u <= ARC) {
    const th = -Math.PI / 2 + u / R, r = R + s;
    out.x = CX + r * Math.cos(th); out.z = CZ + r * Math.sin(th);
    out.tx = -Math.sin(th); out.tz = Math.cos(th);
  } else { out.x = XE + s; out.z = CZ + (u - ARC); out.tx = 0; out.tz = 1; }
  return out;
}
/** Yaw (three.js: forward = (sin, cos)) of the tangent at u. */
export const coastYaw = (u: number): number => { const p = coastPoint(u, 0, TMP); return Math.atan2(p.tx, p.tz); };
const TMP: CoastPt = { x: 0, z: 0, tx: 1, tz: 0 };

/** Split [u0, u1] into pieces: short on the bend (smooth), up to `straight` long elsewhere. */
export function coastSteps(u0: number, u1: number, straight = 22, bend = 2.5): number[] {
  const cuts = [u0];
  let u = u0;
  while (u < u1 - 1e-6) {
    const onBend = u >= -1e-6 && u < ARC - 1e-6;
    let next = u + (onBend ? bend : straight);
    if (u < 0 && next > 0) next = 0;
    if (onBend && next > ARC) next = ARC;
    if (!onBend && u >= ARC && next > u1) next = u1;
    cuts.push(Math.min(next, u1));
    u = Math.min(next, u1);
  }
  return cuts;
}

/* ------------------------------------------------------------------ *
 * Places along the coast                                               *
 * ------------------------------------------------------------------ */

/** Where things are, in coast space. */
export const SPOT = {
  pier: { u: -90, half: 3, s0: BAND.board, s1: 91 },
  pierPlaza: { u0: -99, u1: -81, s0: 91, s1: 109 },
  plazaA: { u0: -153, u1: -123, s0: BAND.board, s1: 45 },
  plazaB: { u0: -50, u1: -20, s0: BAND.board, s1: 45 },
  lighthouse: { u: ARC / 2, s: 37, r: 4.2 },
  amph: { u: -240, s: 36 },
  lifeguards: [-196, -110, -64, 150, 230] as number[],
  /** The Ferris wheel's centre (u, s) and the arcade hall on the pier plaza. */
  wheel: { u: -84, s: 102, r: 6.4, hub: 8.2 },
  arcade: { u0: -98.5, u1: -92, s0: 95, s1: 108.5 },
} as const;

/** Is (u, s) inside an obstacle on the coast side (fountain, tower, wheel legs...)? */
export function coastBlocked(u: number, s: number): boolean {
  const near = (cu: number, cs: number, r: number) => (u - cu) ** 2 + (s - cs) ** 2 < r * r;
  const A = SPOT.plazaA, B = SPOT.plazaB, W = SPOT.wheel, C = SPOT.arcade;
  if (near((A.u0 + A.u1) / 2, (A.s0 + A.s1) / 2 + 1, 2.8)) return true; // fountain
  if (near((B.u0 + B.u1) / 2, (B.s0 + B.s1) / 2 + 1, 2.8)) return true; // clock tower
  if (near(SPOT.lighthouse.u, SPOT.lighthouse.s, SPOT.lighthouse.r + 1.4)) return true;
  if (near(SPOT.amph.u, SPOT.amph.s, 13.5) && s < SPOT.amph.s + 1) return true;
  for (const lu of SPOT.lifeguards) if (near(lu, 33, 1.6)) return true;
  if (u > W.u - 2.6 && u < W.u + 2.6 && s > W.s - 2.4 && s < W.s + 2.4) return true; // wheel legs
  if (u > C.u0 && u < C.u1 && s > C.s0 && s < C.s1) return true; // arcade hall
  return false;
}

/** Can a car be at (u, s) on the seaward side (s > -10)? */
export function coastDrivable(u: number, s: number, u0: number, u1: number): boolean {
  const P = SPOT.pier, PP = SPOT.pierPlaza;
  if (u < u0 + 1 || u > u1 - 1) return false;
  if (Math.abs(u - P.u) <= P.half && s >= P.s0 - 0.5 && s <= P.s1 + 0.5) return true;
  if (u >= PP.u0 && u <= PP.u1 && s >= PP.s0 && s <= PP.s1 - 0.6) return !coastBlocked(u, s);
  if (s <= BAND.rail - 0.4) return true;
  if (s <= BAND.rail + 0.6 && !railOpen(u)) return false;
  if (s > BAND.driveBeach) return false;
  return !coastBlocked(u, s);
}

/** Gaps in the boardwalk railing: the pier, the two squares, and a ramp every 36 units. */
export function railOpen(u: number): boolean {
  const A = SPOT.plazaA, B = SPOT.plazaB;
  if (Math.abs(u - SPOT.pier.u) < SPOT.pier.half + 0.6) return true;
  if ((u > A.u0 + 1 && u < A.u1 - 1) || (u > B.u0 + 1 && u < B.u1 - 1)) return true;
  return ((u % 36) + 36) % 36 < 4.5;
}

/* ------------------------------------------------------------------ *
 * Palette (spec)                                                       *
 * ------------------------------------------------------------------ */

export const COL = {
  asphalt: rgb('#4a4d55'), worn: rgb('#3d3f46'), yellow: rgb('#f2c200'), white: rgb('#f4f4f4'),
  pave: rgb('#c9c6bd'), kerbRed: rgb('#d94a4a'), wood: rgb('#b98a5a'), woodDark: rgb('#8a6440'),
  rail: rgb('#f4efe6'), sand: rgb('#f0d9a0'), wetSand: rgb('#d9bd82'), cobble: rgb('#e6d3b0'),
  steel: rgb('#8f969d'), dark: rgb('#2a2d33'), red: rgb('#d9302b'), lamp: rgb('#fff1d6'),
};
export const FACADES = ['#f6e3b8', '#ff8a65', '#4fc3d9', '#f2c94c', '#e8588a', '#8bd17c'];

/* ------------------------------------------------------------------ *
 * Sea and land                                                         *
 * ------------------------------------------------------------------ */

const GLSL_COAST = /* glsl */ `
  float coastS(vec2 p) {
    if (p.x <= ${COAST.CX.toFixed(1)}) return p.y <= ${COAST.CZ.toFixed(1)} ? (${COAST.ZN.toFixed(1)} - p.y) : max(${COAST.ZN.toFixed(1)} - p.y, p.x - ${COAST.XE.toFixed(1)});
    if (p.y >= ${COAST.CZ.toFixed(1)}) return p.x - ${COAST.XE.toFixed(1)};
    return length(p - vec2(${COAST.CX.toFixed(1)}, ${COAST.CZ.toFixed(1)})) - ${COAST.R.toFixed(1)};
  }
`;

/** Shared clock for the waves (world.update writes it). */
export const seaTime = { value: 0 };

/**
 * The sea: one swept mesh from the shore outwards, coloured by the distance to
 * the shore (turquoise in the shallows, deep blue further out), rolling foam
 * bands that break on the sand, and a moving normal ripple for the sun's glints.
 */
export function buildSea(u0: number, u1: number): Mesh {
  const pos: number[] = [], dist: number[] = [], idx: number[] = [];
  const S0 = BAND.shore - 1.5, S1 = 520;
  const rings = [S0, S0 + 3, S0 + 8, S0 + 18, S0 + 40, S0 + 90, S0 + 200, S1];
  const cuts = coastSteps(u0 - 500, u1 + 500, 60, 4);
  const p: CoastPt = { x: 0, z: 0, tx: 1, tz: 0 };
  for (const u of cuts) for (const s of rings) {
    coastPoint(u, s, p);
    pos.push(p.x, WATER_Y, p.z); dist.push(s - (BAND.shore - 0.6));
  }
  const n = rings.length;
  for (let i = 0; i < cuts.length - 1; i++) for (let j = 0; j < n - 1; j++) {
    const a = i * n + j, b = (i + 1) * n + j, c = (i + 1) * n + j + 1, d = i * n + j + 1;
    idx.push(a, b, c, a, c, d);
  }
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('aShore', new Float32BufferAttribute(dist, 1));
  const nor = new Float32Array(pos.length); for (let i = 1; i < nor.length; i += 3) nor[i] = 1;
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setIndex(idx);
  g.computeBoundingSphere();
  const m = new MeshStandardMaterial({ color: '#ffffff', roughness: 0.16, metalness: 0.05, envMapIntensity: 1.15 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.uSeaTime = seaTime;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute float aShore;\nvarying float vShore;\nvarying vec2 vSeaW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvShore = aShore;\nvSeaW = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform float uSeaTime;\nvarying float vShore;\nvarying vec2 vSeaW;')
      .replace('#include <color_fragment>', `#include <color_fragment>
        {
          float d = max(vShore, 0.0);
          vec3 nearC = vec3(0.0137, 0.381, 0.584), farC = vec3(0.0048, 0.159, 0.392);
          vec3 col = mix(nearC, farC, smoothstep(4.0, 110.0, d));
          float wob = sin(vSeaW.x * 0.045 + vSeaW.y * 0.037) * 2.2;
          float roll = sin(d * 0.6 - uSeaTime * 1.7 + wob);
          float band = smoothstep(0.86, 0.985, roll) * (1.0 - smoothstep(1.5, 16.0, d));
          float shore = 1.0 - smoothstep(0.4, 1.9, d + 0.55 * sin(uSeaTime * 1.25 + vSeaW.x * 0.31 + vSeaW.y * 0.27));
          diffuseColor.rgb = mix(col, vec3(0.82, 0.97, 1.0), clamp(max(band * 0.8, shore), 0.0, 1.0));
        }`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        {
          vec2 q = vSeaW * 0.33; float t = uSeaTime;
          vec2 gr = vec2(cos(q.x * 1.3 + t * 1.1) * 0.5 + cos((q.x + q.y) * 0.9 - t * 0.8) * 0.35,
                         cos(q.y * 1.7 + t * 1.3) * 0.5 + cos((q.x - q.y) * 1.1 + t * 0.7) * 0.3);
          float fade = 1.0 - smoothstep(50.0, 170.0, length(vViewPosition));
          normal = normalize(normal + mat3(viewMatrix) * vec3(gr.x, 0.0, gr.y) * 0.14 * fade);
        }`);
  };
  m.customProgramCacheKey = () => 'taxi-sea';
  const mesh = new Mesh(g, m);
  mesh.receiveShadow = false;
  mesh.matrixAutoUpdate = false;
  mesh.name = 'taxi-sea';
  return mesh;
}

/**
 * The land around and under the map (instead of the walking city's endless lawn,
 * which would cover the sea): one big lawn that cuts itself off at the beach.
 */
export function buildLand(cx: number, cz: number, size: number): Mesh {
  const m = new MeshStandardMaterial({ color: '#5fae4a', roughness: 1 });
  m.onBeforeCompile = (sh) => {
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vLandW;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvLandW = (modelMatrix * vec4(transformed, 1.0)).xz;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\nvarying vec2 vLandW;\n' + GLSL_COAST)
      .replace('void main() {', 'void main() {\n  if (coastS(vLandW) > 21.5) discard;');
  };
  m.customProgramCacheKey = () => 'taxi-land';
  const mesh = new Mesh(new PlaneGeometry(size, size).rotateX(-Math.PI / 2), m);
  mesh.position.set(cx, -0.09, cz);
  mesh.updateMatrix();
  mesh.matrixAutoUpdate = false;
  mesh.receiveShadow = true;
  mesh.name = 'taxi-land';
  return mesh;
}

/* ------------------------------------------------------------------ *
 * Big signs: PIER ARCADE, SURF SHOP, OCEAN DRIVE                       *
 * ------------------------------------------------------------------ */

export interface BigSign { text: string; fg: string; bg: string; edge: string }
export const BIG_SIGNS: BigSign[] = [
  { text: 'PIER ARCADE', fg: '#ff4fa3', bg: '#2a1b4d', edge: '#ffd21a' },
  { text: 'SURF SHOP', fg: '#ffffff', bg: '#0f8fa8', edge: '#ffd21a' },
  { text: 'OCEAN DRIVE', fg: '#2a1b4d', bg: '#ffd21a', edge: '#2a1b4d' },
];

/** All the big signs on one canvas, one row each; returns the material and the row height. */
export function bigSignMaterial(): MeshStandardMaterial {
  const W = 1024, H = 192;
  const cv = document.createElement('canvas');
  cv.width = W; cv.height = H * BIG_SIGNS.length;
  const c = cv.getContext('2d')!;
  BIG_SIGNS.forEach((s, i) => {
    const y = i * H;
    c.fillStyle = s.bg; c.fillRect(0, y, W, H);
    c.strokeStyle = s.edge; c.lineWidth = 14; c.strokeRect(10, y + 10, W - 20, H - 20);
    c.font = '900 italic 128px "Arial Black","Trebuchet MS",Arial,sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 10; c.strokeStyle = 'rgba(0,0,0,0.55)'; c.strokeText(s.text, W / 2, y + H / 2 + 6, W - 60);
    c.shadowColor = s.fg; c.shadowBlur = 18;
    c.fillStyle = s.fg; c.fillText(s.text, W / 2, y + H / 2 + 6, W - 60);
    c.shadowBlur = 0;
  });
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 8;
  return new MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new Color('#ffffff'), emissiveIntensity: 0.55, roughness: 0.45, side: DoubleSide });
}

/** A quad showing row `row` of the big-sign canvas, centred at (x, y, z), facing yaw. */
export function bigSignQuad(row: number, w: number, h: number, x: number, y: number, z: number, yaw: number): BufferGeometry {
  const g = new PlaneGeometry(w, h);
  const uv = g.getAttribute('uv');
  const n = BIG_SIGNS.length, v1 = 1 - row / n, v0 = v1 - 1 / n;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k), uv.getY(k) ? v1 : v0);
  g.rotateY(yaw);
  g.translate(x, y, z);
  return g;
}

/* ------------------------------------------------------------------ *
 * The Ferris wheel (turns slowly: its own mesh)                        *
 * ------------------------------------------------------------------ */

export function buildWheel(radius: number): Mesh {
  const m = new Mesher();
  const steel = rgb('#f4efe6'), pink = rgb('#ff4fa3'), cab = ['#ffd21a', '#4fc3d9', '#ff8a65', '#8bd17c', '#e8588a', '#ffffff'].map(rgb);
  const segs = 28, spokes = 14;
  // two rims (front and back), as thin boxes between points on the circle
  for (const zz of [-0.55, 0.55]) {
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
      const ax = Math.cos(a0) * radius, ay = Math.sin(a0) * radius, bx = Math.cos(a1) * radius, by = Math.sin(a1) * radius;
      const len = Math.hypot(bx - ax, by - ay);
      const g = new PlaneGeometry(len, 0.22);
      // a flat bar facing ±z: two planes back to back are cheaper than a box and read the same
      g.rotateZ(Math.atan2(by - ay, bx - ax)); g.translate((ax + bx) / 2, (ay + by) / 2, zz + 0.01);
      m.addGeometry(g, i % 2 ? steel : pink);
      const g2 = new PlaneGeometry(len, 0.22);
      g2.rotateY(Math.PI); g2.rotateZ(Math.atan2(by - ay, bx - ax)); g2.translate((ax + bx) / 2, (ay + by) / 2, zz - 0.01);
      m.addGeometry(g2, i % 2 ? steel : pink);
    }
    for (let i = 0; i < spokes; i++) {
      const a = (i / spokes) * Math.PI * 2;
      const g = new PlaneGeometry(radius, 0.09);
      g.translate(radius / 2, 0, 0); g.rotateZ(a); g.translate(0, 0, zz);
      m.addGeometry(g, steel);
      const g2 = new PlaneGeometry(radius, 0.09);
      g2.rotateY(Math.PI); g2.translate(radius / 2, 0, 0); g2.rotateZ(a); g2.translate(0, 0, zz);
      m.addGeometry(g2, steel);
    }
  }
  // hub and the gondolas
  m.box(-0.45, 0.45, -0.45, 0.45, -0.75, 0.75, pink);
  for (let i = 0; i < spokes; i++) {
    const a = (i / spokes) * Math.PI * 2, x = Math.cos(a) * radius, y = Math.sin(a) * radius;
    m.box(x - 0.5, x + 0.5, y - 1.15, y - 0.25, -0.5, 0.5, cab[i % cab.length]);
    m.box(x - 0.56, x + 0.56, y - 0.3, y - 0.2, -0.56, 0.56, shade(cab[i % cab.length], 0.7));
  }
  const g = m.build();
  const mesh = new Mesh(g, cityMaterial());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'taxi-wheel';
  return mesh;
}

/* ------------------------------------------------------------------ *
 * Plants: instanced, one draw call per kind                            *
 * ------------------------------------------------------------------ */

export type PlantKind = 'palm' | 'coco' | 'bush' | 'pot' | 'grass';

function vtx(pos: number[], col: number[], x: number, y: number, z: number, c: RGB): void {
  pos.push(x, y, z); col.push(c[0], c[1], c[2]);
}
function geom(pos: number[], col: number[]): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  g.computeBoundingSphere();
  return g;
}

/** A palm: a ringed, gently curving trunk of `h` and ten drooping fronds; `lean` bends it over. */
function palmGeometry(h: number, lean: number, fronds = 10): BufferGeometry {
  const pos: number[] = [], col: number[] = [];
  const BARK = rgb('#a67b52'), BARK2 = rgb('#8a6440'), LEAF = rgb('#3f9a3d'), LEAF2 = rgb('#62b84a'), NUT = rgb('#6b4a2a');
  const sides = 7, rings = 6;
  const at = (t: number): [number, number] => [lean * h * t * t, h * t];
  for (let r = 0; r < rings; r++) {
    const t0 = r / rings, t1 = (r + 1) / rings;
    const [x0, y0] = at(t0), [x1, y1] = at(t1);
    const r0 = 0.27 - 0.1 * t0, r1 = 0.27 - 0.1 * t1;
    const c = r % 2 ? BARK : BARK2;
    for (let i = 0; i < sides; i++) {
      const a0 = (i / sides) * Math.PI * 2, a1 = ((i + 1) / sides) * Math.PI * 2;
      const p = (x: number, y: number, rr: number, a: number): [number, number, number] => [x + Math.cos(a) * rr, y, Math.sin(a) * rr];
      const A = p(x0, y0, r0, a0), B = p(x0, y0, r0, a1), C = p(x1, y1, r1, a1), D = p(x1, y1, r1, a0);
      vtx(pos, col, ...A, c); vtx(pos, col, ...D, c); vtx(pos, col, ...C, c);
      vtx(pos, col, ...A, c); vtx(pos, col, ...C, c); vtx(pos, col, ...B, c);
    }
  }
  const [tx, ty] = at(1);
  // a few coconuts under the crown
  for (let i = 0; i < 3; i++) {
    const a = (i / 3) * Math.PI * 2, cx = tx + Math.cos(a) * 0.22, cz = Math.sin(a) * 0.22, cy = ty - 0.25;
    const rr = 0.16;
    vtx(pos, col, cx - rr, cy, cz, NUT); vtx(pos, col, cx, cy + rr, cz, NUT); vtx(pos, col, cx + rr, cy, cz, NUT);
    vtx(pos, col, cx, cy, cz - rr, NUT); vtx(pos, col, cx, cy + rr, cz, NUT); vtx(pos, col, cx, cy, cz + rr, NUT);
  }
  // fronds: a V-folded strip of four segments, drooping
  const L = 2.7 * Math.min(1.15, h / 9);
  for (let f = 0; f < fronds; f++) {
    const a = (f / fronds) * Math.PI * 2 + (f % 2) * 0.18;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz, pz = dx;
    const segs = 4;
    let prev: [number, number, number][] | null = null;
    for (let k = 0; k <= segs; k++) {
      const t = k / segs;
      const along = L * t, drop = (0.35 - 1.05 * t) * L * t * (f % 3 === 0 ? 1.15 : 1);
      const w = 0.46 * Math.sin(Math.PI * Math.min(1, t * 1.1)) + 0.04;
      const cx = tx + dx * along, cy = ty + drop + 0.05, cz = dz * along;
      const row: [number, number, number][] = [[cx + px * w, cy - 0.12 * w, cz + pz * w], [cx, cy + 0.06, cz], [cx - px * w, cy - 0.12 * w, cz - pz * w]];
      if (prev) {
        const c = k % 2 ? LEAF : LEAF2;
        for (const [i0, i1] of [[0, 1], [1, 2]] as const) {
          vtx(pos, col, ...prev[i0], c); vtx(pos, col, ...row[i0], c); vtx(pos, col, ...row[i1], c);
          vtx(pos, col, ...prev[i0], c); vtx(pos, col, ...row[i1], c); vtx(pos, col, ...prev[i1], c);
        }
      }
      prev = row;
    }
  }
  return geom(pos, col);
}

function blobGeometry(r: number, h: number, c: RGB, c2: RGB, segs = 7): BufferGeometry {
  const pos: number[] = [], col: number[] = [];
  const ring = (y: number, rr: number, i: number): [number, number, number] => { const a = (i / segs) * Math.PI * 2; return [Math.cos(a) * rr, y, Math.sin(a) * rr]; };
  const top: [number, number, number] = [0, h, 0], bot: [number, number, number] = [0, 0, 0];
  for (let i = 0; i < segs; i++) {
    const A = ring(h * 0.45, r, i), B = ring(h * 0.45, r, i + 1);
    const A2 = ring(h * 0.85, r * 0.6, i), B2 = ring(h * 0.85, r * 0.6, i + 1);
    vtx(pos, col, ...bot, c2); vtx(pos, col, ...B, c); vtx(pos, col, ...A, c);
    vtx(pos, col, ...A, c); vtx(pos, col, ...B, c); vtx(pos, col, ...B2, c);
    vtx(pos, col, ...A, c); vtx(pos, col, ...B2, c); vtx(pos, col, ...A2, c);
    vtx(pos, col, ...A2, c); vtx(pos, col, ...B2, c); vtx(pos, col, ...top, c);
  }
  return geom(pos, col);
}

function potGeometry(): BufferGeometry {
  const pos: number[] = [], col: number[] = [];
  const W = rgb('#ffffff'), Wd = rgb('#d8d8d8');
  const segs = 8, r0 = 0.32, r1 = 0.42, h = 0.62;
  for (let i = 0; i < segs; i++) {
    const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
    const A: [number, number, number] = [Math.cos(a0) * r0, 0, Math.sin(a0) * r0], B: [number, number, number] = [Math.cos(a1) * r0, 0, Math.sin(a1) * r0];
    const C: [number, number, number] = [Math.cos(a1) * r1, h, Math.sin(a1) * r1], D: [number, number, number] = [Math.cos(a0) * r1, h, Math.sin(a0) * r1];
    vtx(pos, col, ...A, W); vtx(pos, col, ...D, W); vtx(pos, col, ...C, W);
    vtx(pos, col, ...A, W); vtx(pos, col, ...C, W); vtx(pos, col, ...B, W);
    // the soil
    vtx(pos, col, 0, h - 0.06, 0, Wd); vtx(pos, col, Math.cos(a0) * r1 * 0.95, h - 0.06, Math.sin(a0) * r1 * 0.95, Wd); vtx(pos, col, Math.cos(a1) * r1 * 0.95, h - 0.06, Math.sin(a1) * r1 * 0.95, Wd);
  }
  return geom(pos, col);
}

function grassGeometry(): BufferGeometry {
  const pos: number[] = [], col: number[] = [];
  const G = rgb('#9bbf5a'), G2 = rgb('#7fa64a');
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2 + (i % 2) * 0.4, lean = 0.25 + (i % 3) * 0.12, h = 0.55 + (i % 3) * 0.18;
    const dx = Math.cos(a), dz = Math.sin(a), px = -dz * 0.06, pz = dx * 0.06;
    vtx(pos, col, px, 0, pz, G2); vtx(pos, col, -px, 0, -pz, G2); vtx(pos, col, dx * lean, h, dz * lean, G);
  }
  return geom(pos, col);
}

export interface PlantSpot { x: number; y: number; z: number; yaw: number; scale: number; tint: number }

const PLANT_DEF: Record<PlantKind, { shadow: boolean; tint: (t: number) => RGB }> = {
  palm: { shadow: true, tint: (t) => [0.94 + t * 0.12, 0.94 + t * 0.12, 0.94 + t * 0.12] },
  coco: { shadow: true, tint: (t) => [0.94 + t * 0.12, 0.94 + t * 0.12, 0.94 + t * 0.12] },
  bush: { shadow: false, tint: (t) => [0.88 + t * 0.2, 0.92 + t * 0.14, 0.88 + t * 0.2] },
  pot: { shadow: false, tint: (t) => (t < 0.5 ? rgb('#ff5d8f') : rgb('#ffd23f')) },
  grass: { shadow: false, tint: (t) => [0.9 + t * 0.15, 0.9 + t * 0.15, 0.9 + t * 0.15] },
};

/**
 * Every plant of one kind, as one InstancedMesh. The instance buffer holds only
 * what is near the taxi (refilled when it has moved a few units), nearest first,
 * so the shadow pass can draw just the ones within `shadowR`.
 */
class PlantSet {
  readonly mesh: InstancedMesh;
  private readonly mats: Float32Array;
  private readonly cols: Float32Array;
  private readonly xs: Float32Array;
  private readonly zs: Float32Array;
  private shadowCount = 0;
  private order: Int32Array;
  constructor(readonly kind: PlantKind, geo: BufferGeometry, mat: Material, spots: PlantSpot[]) {
    const n = Math.max(1, spots.length);
    this.mesh = new InstancedMesh(geo, mat, n);
    this.mesh.instanceMatrix.setUsage(DynamicDrawUsage);
    this.mesh.frustumCulled = false;
    this.mesh.castShadow = PLANT_DEF[kind].shadow;
    this.mesh.receiveShadow = true;
    this.mesh.count = 0;
    this.mats = new Float32Array(n * 16);
    this.cols = new Float32Array(n * 3);
    this.xs = new Float32Array(n); this.zs = new Float32Array(n);
    this.order = new Int32Array(n);
    const o = new Object3D();
    spots.forEach((p, i) => {
      o.position.set(p.x, p.y, p.z); o.rotation.set(0, p.yaw, 0); o.scale.setScalar(p.scale); o.updateMatrix();
      o.matrix.toArray(this.mats, i * 16);
      const c = PLANT_DEF[kind].tint(p.tint);
      this.cols[i * 3] = c[0]; this.cols[i * 3 + 1] = c[1]; this.cols[i * 3 + 2] = c[2];
      this.xs[i] = p.x; this.zs[i] = p.z;
    });
    this.mesh.instanceColor = new InstancedBufferAttribute(new Float32Array(n * 3).fill(1), 3);
    this.mesh.instanceColor.setUsage(DynamicDrawUsage);
    this.count = spots.length;
    let full = 0;
    this.mesh.onBeforeShadow = () => { full = this.mesh.count; this.mesh.count = Math.min(full, this.shadowCount); };
    this.mesh.onAfterShadow = () => { this.mesh.count = full; };
  }
  private readonly count: number;

  fill(x: number, z: number, radius: number, shadowR: number): void {
    const R2 = radius * radius, S2 = shadowR * shadowR;
    const dst = this.mesh.instanceMatrix.array as Float32Array, cdst = this.mesh.instanceColor!.array as Float32Array;
    let n = 0;
    for (let pass = 0; pass < 2; pass++) {
      for (let i = 0; i < this.count; i++) {
        const dx = this.xs[i] - x, dz = this.zs[i] - z, d2 = dx * dx + dz * dz;
        if (d2 > R2 || (pass === 0) !== (d2 <= S2)) continue;
        this.order[n] = i;
        dst.set(this.mats.subarray(i * 16, i * 16 + 16), n * 16);
        cdst[n * 3] = this.cols[i * 3]; cdst[n * 3 + 1] = this.cols[i * 3 + 1]; cdst[n * 3 + 2] = this.cols[i * 3 + 2];
        n++;
      }
      if (pass === 0) this.shadowCount = n;
    }
    this.mesh.count = n;
    this.mesh.instanceMatrix.needsUpdate = true;
    this.mesh.instanceColor!.needsUpdate = true;
  }
}

/** All five kinds of plant. `add` while building, then `finish`, then `update` every frame. */
export class Plants {
  readonly group = new Group();
  private spots: Record<PlantKind, PlantSpot[]> = { palm: [], coco: [], bush: [], pot: [], grass: [] };
  private sets: PlantSet[] = [];
  private lastX = 1e9;
  private lastZ = 1e9;
  radius = 150;
  shadowR = 60;
  readonly material = new MeshStandardMaterial({ vertexColors: true, roughness: 0.78, metalness: 0, side: DoubleSide });

  constructor() { this.group.name = 'taxi-plants'; }

  add(kind: PlantKind, p: PlantSpot): void { this.spots[kind].push(p); }
  total(kind: PlantKind): number { return this.spots[kind].length; }

  finish(): void {
    const geos: Record<PlantKind, BufferGeometry> = {
      palm: palmGeometry(10, 0.06),
      coco: palmGeometry(5.6, 0.32, 9),
      bush: blobGeometry(0.62, 1.0, rgb('#3f9a3d'), rgb('#2f7a2f')),
      pot: potGeometry(),
      grass: grassGeometry(),
    };
    for (const k of Object.keys(geos) as PlantKind[]) {
      const set = new PlantSet(k, geos[k], this.material, this.spots[k]);
      this.sets.push(set);
      this.group.add(set.mesh);
    }
  }

  /** Refill the instance buffers around (x, z) once the taxi has moved a little. */
  update(x: number, z: number, force = false): void {
    if (!force && (x - this.lastX) ** 2 + (z - this.lastZ) ** 2 < 16) return;
    this.lastX = x; this.lastZ = z;
    for (const s of this.sets) s.fill(x, z, s.kind === 'palm' ? this.radius : this.radius * 0.7, this.shadowR);
  }

  dispose(): void {
    for (const s of this.sets) { s.mesh.geometry.dispose(); s.mesh.dispose(); }
    this.material.dispose();
  }
}

/** Matrix scratch for callers that place props by yaw. */
export const tmpMatrix = new Matrix4();
