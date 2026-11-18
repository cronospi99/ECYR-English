/**
 * Taxi Rush — the big city.
 *
 * Taxi Rush has its own city, drawn here from scratch and independent of the
 * walking city of Da World. The map is one regular grid — a street every 19
 * tiles, an avenue every 21, six-tile roads and three-tile pavements — and the
 * ninety-one places of the old city centre live in its middle blocks, with the
 * eight districts around them (downtown, harbour, old town, campus, airport,
 * suburbs, market, parkside) and a six-lane highway along the south edge.
 *
 * Cheap on purpose: roads, pavements and lawns use the three ground materials;
 * buildings, lamps, trees and street furniture share one atlas material (see
 * textures.ts, buildings.ts); lane marks one more. Every static mesh is merged
 * per map cell (city.ts), so the whole map is a few hundred draw calls at
 * most and the camera only pays for what is in front of it.
 *
 * Everything gameplay needs is derived from the same grid: where a car may
 * drive (roads and pavements — this is Crazy Taxi), where the intersections are
 * (the arrow's route), and where the quiz traffic lights stand.
 */
import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Float32BufferAttribute,
  DoubleSide,
  Group,
  Mesh,
  MeshStandardMaterial,
  PlaneGeometry,
  SRGBColorSpace,
  SphereGeometry,
  Sprite,
  SpriteMaterial,
} from 'three';
import { PALETTE } from '../city/palette';
import { mulberry32 } from '../core/rng';
import { CENTRE_PLACES, NEW_PLACES, type District } from './places';
import { CELL, Layer, Mesher, mergeByCell, rgb, tree, lamp } from './city';
import { GROUND, emitBuilding, type Kind, type Lot, type Zone } from './buildings';
import { emitIcon, iconFor, planLot, signHeight } from './icons';
import { furnishBlock } from './furniture';
import { GROUND_LAYER as GL, cityMaterial, groundMaterial, lensMaterial } from './textures';

export { CELL, mergeByCell };

/* ------------------------------------------------------------------ *
 * The grid                                                            *
 * ------------------------------------------------------------------ */

/** Road width in tiles (two generous lanes plus margin). */
const ROAD_W = 6;
/** Pavement kerb height. */
const CURB = GROUND;
/** Pavement width. */
const SW = 3;

export const K_MIN = -5, K_MAX = 9; // avenues (x)
export const J_MIN = -5, J_MAX = 10; // streets (z)
export const VX = (k: number): number => 15 + 21 * k;
export const HZ = (j: number): number => 13 + 19 * j;
export const MIN_X = VX(K_MIN) - 15;
export const MAX_X = VX(K_MAX) + ROAD_W + 15;
export const MIN_Z = HZ(J_MIN) - 13;
/** ECYR rebuild: a six-lane highway along the south edge of the city. */
export const HWY_Z0 = HZ(J_MAX) + ROAD_W + 15;
const HWY_SHOULDER = 1.5, HWY_LANE = 3.2, HWY_GAP = 0.6, HWY_MEDIAN = 0.8;
export const HWY_W = HWY_SHOULDER * 2 + HWY_LANE * 6 + HWY_GAP * 2 + HWY_MEDIAN;
export const HWY_MID = HWY_Z0 + HWY_SHOULDER + HWY_LANE * 3 + HWY_GAP + HWY_MEDIAN / 2;
/** Lane centres: three westbound (north half), three eastbound (south half). */
export const HWY_LANES = [0, 1, 2].map((i) => HWY_Z0 + HWY_SHOULDER + HWY_LANE * (i + 0.5))
  .concat([0, 1, 2].map((i) => HWY_MID + HWY_MEDIAN / 2 + HWY_GAP + HWY_LANE * (i + 0.5)));
export const MAX_Z = HWY_Z0 + HWY_W + 12;

/** On an avenue's carriageway (the x-columns of the grid)? */
const avenueColumn = (tx: number): boolean => ((((tx - 15) % 21) + 21) % 21) < ROAD_W;
const mod = (a: number, n: number): number => ((a % n) + n) % n;
/** Is this tile on the road grid? */
const gridRoad = (tx: number, tz: number): boolean => mod(tx - 15, 21) < ROAD_W || mod(tz - 13, 19) < ROAD_W;
const gridSidewalk = (tx: number, tz: number): boolean => {
  if (gridRoad(tx, tz)) return false;
  const ax = mod(tx - 15, 21), az = mod(tz - 13, 19);
  return ax < ROAD_W + SW || ax >= 21 - SW || az < ROAD_W + SW || az >= 19 - SW;
};

export interface Place {
  id: string;
  name: string;
  type: string;
  emoji: string;
  /** Where the taxi stops for it: the pavement in front of the door. */
  x: number;
  z: number;
  district: District | 'centre';
}

export interface QuizLight {
  id: number;
  /** Centre of the intersection. */
  x: number;
  z: number;
  red: boolean;
  timer: number;
  /** Seconds of red forced after a wrong answer. */
  hold: number;
  /** Answered on this red phase (correct). */
  cleared: boolean;
  lampR: Lamp;
  lampG: Lamp;
  badge: Sprite;
}

/** The red or green lenses of one light: setting `emissiveIntensity` rewrites their glow. */
export class Lamp {
  private v = NaN;
  constructor(private readonly layer: Layer, private readonly mesher: Mesher, private readonly ranges: [number, number][], v: number) {
    this.emissiveIntensity = v;
  }
  get emissiveIntensity(): number { return this.v; }
  set emissiveIntensity(v: number) {
    if (v === this.v) return;
    this.v = v;
    const mesh = this.layer.built.get(this.mesher);
    const attr = mesh?.geometry.getAttribute('aLayer');
    if (!mesh || !attr) return; // the city is still being built: the first flush picks the value up
    for (const [a, n] of this.ranges) (attr.array as Float32Array).fill(v, a, a + n);
    attr.needsUpdate = true;
  }
}

export interface Node {
  k: number;
  j: number;
  x: number;
  z: number;
}

/** Footprint of a building, for tests: no destination may stand inside one. */
export interface Footprint { x0: number; x1: number; z0: number; z1: number; placeId?: string }

/* ------------------------------------------------------------------ *
 * Sign atlas: one texture for every place name                         *
 * ------------------------------------------------------------------ */

const SIGN_W = 352, SIGN_H = 66, ATLAS_COLS = 4;

interface Sign { name: string; emoji: string; hue: number; x: number; y: number; z: number; rotY: number; w: number }

const AVENUES = ['Oak', 'Maple', 'Cedar', 'Pine', 'Elm', 'Birch', 'Willow', 'Aspen', 'Poplar', 'Spruce', 'Hazel', 'Walnut', 'Cherry', 'Laurel', 'Linden'].map((n) => n + ' Ave');
const STREETS = ['Hill St', 'Mill St', 'Union St', 'Lake St', 'Queen St', 'Main St', 'Oak St', 'River Rd', 'Market St', 'Sunset Blvd', 'Park St', 'Church St', 'Bridge St', 'Garden St', 'King St', 'Harbour Rd'];
const STREET_NAMES = [...AVENUES, ...STREETS];

/** One canvas for every sign in the city: place names, street plates, and a stop and a yield sign. */
function signAtlas(names: Sign[], streets: string[]): { tex: CanvasTexture; rows: number } {
  const total = names.length + streets.length + 1;
  const rows = Math.max(1, Math.ceil(total / ATLAS_COLS));
  const cv = document.createElement('canvas');
  cv.width = SIGN_W * ATLAS_COLS;
  cv.height = SIGN_H * rows;
  const c = cv.getContext('2d')!;
  names.forEach((n, i) => {
    const x = (i % ATLAS_COLS) * SIGN_W, y = Math.floor(i / ATLAS_COLS) * SIGN_H;
    c.fillStyle = `hsl(${n.hue},70%,22%)`;
    c.fillRect(x, y, SIGN_W, SIGN_H);
    c.strokeStyle = `hsl(${n.hue},85%,62%)`;
    c.lineWidth = 6;
    c.strokeRect(x + 3, y + 3, SIGN_W - 6, SIGN_H - 6);
    c.font = '38px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    c.textBaseline = 'middle';
    c.fillText(n.emoji, x + 12, y + SIGN_H / 2 + 2);
    c.fillStyle = '#fff6dc';
    let size = 28;
    c.font = `800 ${size}px "Trebuchet MS",Arial,sans-serif`;
    while (c.measureText(n.name).width > SIGN_W - 78 && size > 13) { size -= 1; c.font = `800 ${size}px "Trebuchet MS",Arial,sans-serif`; }
    c.fillText(n.name, x + 62, y + SIGN_H / 2 + 1);
  });
  streets.forEach((name, k) => {
    const i = names.length + k, x = (i % ATLAS_COLS) * SIGN_W, y = Math.floor(i / ATLAS_COLS) * SIGN_H;
    c.fillStyle = '#17623a'; c.fillRect(x, y, SIGN_W, SIGN_H);
    c.strokeStyle = '#ffffff'; c.lineWidth = 5; c.strokeRect(x + 4, y + 4, SIGN_W - 8, SIGN_H - 8);
    c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
    c.font = '800 34px Arial,sans-serif'; c.fillText(name.toUpperCase(), x + SIGN_W / 2, y + SIGN_H / 2 + 2, SIGN_W - 24);
    c.textAlign = 'left';
  });
  {
    const i = names.length + streets.length, x = (i % ATLAS_COLS) * SIGN_W, y = Math.floor(i / ATLAS_COLS) * SIGN_H;
    c.fillStyle = '#444'; c.fillRect(x, y, SIGN_W, SIGN_H);
    // stop: red octagon in the first 66x66 square
    c.beginPath();
    STOP_POLY.forEach(([nx, ny], q) => { const px = x + (nx + 0.5) * SIGN_H, py = y + (0.5 - ny) * SIGN_H; if (q) c.lineTo(px, py); else c.moveTo(px, py); });
    c.closePath(); c.fillStyle = '#c8281e'; c.fill(); c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
    c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = '900 17px Arial,sans-serif'; c.fillText('STOP', x + SIGN_H / 2, y + SIGN_H / 2 + 1);
    // yield: white triangle with a red border, pointing down
    c.beginPath();
    YIELD_POLY.forEach(([nx, ny], q) => { const px = x + SIGN_H + (nx + 0.5) * SIGN_H, py = y + (0.5 - ny) * SIGN_H; if (q) c.lineTo(px, py); else c.moveTo(px, py); });
    c.closePath(); c.fillStyle = '#fff'; c.fill(); c.strokeStyle = '#c8281e'; c.lineWidth = 7; c.lineJoin = 'round'; c.stroke();
    c.textAlign = 'left';
  }
  const tex = new CanvasTexture(cv);
  tex.colorSpace = SRGBColorSpace;
  tex.anisotropy = 4;
  return { tex, rows };
}

/** Octagon and triangle, in a unit square centred on the origin (also the texture layout). */
const STOP_POLY: [number, number][] = Array.from({ length: 8 }, (_, i) => [0.47 * Math.cos((i + 0.5) * Math.PI / 4), 0.47 * Math.sin((i + 0.5) * Math.PI / 4)]);
const YIELD_POLY: [number, number][] = [[-0.47, 0.4], [0.47, 0.4], [0, -0.42]];

function signQuad(i: number, rows: number, w: number, x: number, y: number, z: number, rotY: number): BufferGeometry {
  const h = w * (SIGN_H / SIGN_W);
  const g = new PlaneGeometry(w, h);
  const uv = g.getAttribute('uv');
  const u0 = (i % ATLAS_COLS) / ATLAS_COLS, u1 = u0 + 1 / ATLAS_COLS;
  const row = Math.floor(i / ATLAS_COLS);
  const v1 = 1 - row / rows, v0 = v1 - 1 / rows;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) ? u1 : u0, uv.getY(k) ? v1 : v0);
  g.rotateY(rotY);
  g.translate(x, y, z);
  return g;
}

/** A road sign cut to its shape (stop or yield): a triangle fan over the shape's own atlas square. */
function shapeSign(cell: number, rows: number, second: boolean, poly: [number, number][], size: number, x: number, y: number, z: number, rotY: number): BufferGeometry {
  const col = cell % ATLAS_COLS, row = Math.floor(cell / ATLAS_COLS);
  const pos: number[] = [], nor: number[] = [], uv: number[] = [], idx: number[] = [];
  poly.forEach(([nx, ny]) => {
    pos.push(nx * size, ny * size, 0); nor.push(0, 0, 1);
    uv.push((col + (second ? SIGN_H / SIGN_W : 0) + (nx + 0.5) * (SIGN_H / SIGN_W)) / ATLAS_COLS, 1 - (row + 1) / rows + (ny + 0.5) / rows);
  });
  for (let i = 1; i < poly.length - 1; i++) idx.push(0, i, i + 1);
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  g.rotateY(rotY); g.translate(x, y, z);
  return g;
}

/* ------------------------------------------------------------------ *
 * The world                                                           *
 * ------------------------------------------------------------------ */

const DISTRICT_OF = (dx: number, dz: number): District =>
  dz < 0 ? (dx < 0 ? 'campus' : dx > 0 ? 'parkside' : 'downtown')
    : dz > 0 ? (dx < 0 ? 'market' : dx > 0 ? 'airport' : 'suburbs')
      : dx < 0 ? 'oldtown' : 'harbour';

export const DISTRICT_LABEL: Record<District | 'centre', string> = {
  centre: 'City Centre',
  downtown: 'Downtown',
  harbour: 'The Harbour',
  oldtown: 'Old Town',
  campus: 'University Campus',
  airport: 'Airport District',
  suburbs: 'The Suburbs',
  market: 'Market Quarter',
  parkside: 'Parkside',
};

/** The old city centre: five avenues wide, six streets deep, in the middle of the grid. */
const CENTRE = { k0: -1, k1: 3, j0: -1, j1: 4 };
/** Blocks that hold the three big landmarks, along the south edge of the centre. */
const LANDMARK_BLOCKS: [number, number, 'stadium' | 'airport' | 'terminal'][] = [[1, 4, 'stadium'], [2, 4, 'airport'], [3, 4, 'terminal']];

interface Block {
  k: number; j: number;
  bx0: number; bx1: number; bz0: number; bz1: number;
  lx0: number; lx1: number; lz0: number; lz1: number;
  zone: Zone;
  fringe: boolean;
  park: boolean;
  lots: Lot[];
  /** Back-garden strip between the two rows of houses. */
  garden: boolean;
}

function rollKind(zone: Zone, r: number): Kind {
  switch (zone) {
    case 'downtown': return r < 0.55 ? 'tower' : 'block';
    case 'harbour': case 'airport': return r < 0.6 ? 'hall' : r < 0.85 ? 'block' : 'house';
    case 'suburbs': return r < 0.85 ? 'house' : 'block';
    case 'oldtown': return r < 0.55 ? 'house' : 'block';
    case 'market': return r < 0.45 ? 'hall' : r < 0.8 ? 'house' : 'block';
    case 'campus': return r < 0.5 ? 'block' : r < 0.75 ? 'tower' : 'house';
    case 'parkside': return r < 0.5 ? 'house' : r < 0.9 ? 'block' : 'hall';
    default: return r < 0.22 ? 'tower' : r < 0.77 ? 'block' : r < 0.9 ? 'house' : 'hall'; // centre
  }
}

function shuffle<T>(a: T[], rand: () => number): T[] {
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

/**
 * Level of detail, decided per map cell and per layer, never per object.
 * keep: always (ground, highway) · near: full buildings and trees up to NEAR_R ·
 * far: the same buildings as plain boxes beyond it · detail: furniture, signs,
 * awnings, signals and facade extras up to DETAIL_R.
 */
type ChunkKind = 'keep' | 'near' | 'far' | 'detail';
export const LOD = { detail: 75, near: 120 };

export class TaxiWorld {
  readonly group = new Group();
  readonly places: Place[] = [];
  readonly lights: QuizLight[] = [];
  readonly nodes: Node[] = [];
  /** Every building's footprint (for tests and tooling). */
  readonly footprints: Footprint[] = [];
  /** Merged static meshes, kept so far-away ones can be switched off. */
  private chunks: { mesh: Mesh; x: number; z: number; r: number; kind: ChunkKind }[] = [];
  private lightGroups: { g: Group; x: number; z: number }[] = [];
  /** 1 = a car may be here. */
  private grid: Uint8Array;
  private gw = MAX_X - MIN_X;
  private gh = MAX_Z - MIN_Z;

  constructor() {
    this.group.name = 'taxi-world';
    this.grid = new Uint8Array(this.gw * this.gh);
    for (let z = MIN_Z; z < MAX_Z; z++) {
      for (let x = MIN_X; x < MAX_X; x++) {
        let ok: boolean;
        if (z >= HWY_Z0) {
          // the highway: everything but the median barrier, which avenues cut through
          const onHwy = z < HWY_Z0 + HWY_W;
          const median = Math.abs(z + 0.5 - HWY_MID) < HWY_MEDIAN / 2 + 0.3;
          ok = onHwy && (!median || avenueColumn(x));
        } else if (z >= HZ(J_MAX) + ROAD_W) ok = avenueColumn(x) || gridSidewalk(x, z) && z < HZ(J_MAX) + ROAD_W + SW;
        else ok = gridRoad(x, z) || gridSidewalk(x, z);
        this.grid[(z - MIN_Z) * this.gw + (x - MIN_X)] = ok ? 1 : 0;
      }
    }
    for (let k = K_MIN; k <= K_MAX; k++) for (let j = J_MIN; j <= J_MAX; j++) this.nodes.push({ k, j, x: VX(k) + ROAD_W / 2, z: HZ(j) + ROAD_W / 2 });
    this.build();
  }

  /** Can a car be here? Roads and pavements yes; buildings, parks and the sea no. */
  drivable(x: number, z: number): boolean {
    const tx = Math.floor(x), tz = Math.floor(z);
    if (tx < MIN_X || tz < MIN_Z || tx >= MAX_X || tz >= MAX_Z) return false;
    return this.grid[(tz - MIN_Z) * this.gw + (tx - MIN_X)] === 1;
  }

  nodeAt(k: number, j: number): Node {
    return this.nodes[(k - K_MIN) * (J_MAX - J_MIN + 1) + (j - J_MIN)];
  }

  nearestNode(x: number, z: number): Node {
    const k = Math.max(K_MIN, Math.min(K_MAX, Math.round((x - 3 - 15) / 21)));
    const j = Math.max(J_MIN, Math.min(J_MAX, Math.round((z - 3 - 13) / 19)));
    return this.nodeAt(k, j);
  }

  /**
   * Where the arrow should point to get from (x,z) to the target: the next
   * intersection on a shortest route, or the target itself once it is close.
   */
  waypoint(x: number, z: number, heading: number, tx: number, tz: number): { x: number; z: number } {
    if (Math.hypot(tx - x, tz - z) < 26) return { x: tx, z: tz };
    const goal = this.nearestNode(tx, tz);
    const here = this.nearestNode(x, z);
    if (here.k === goal.k && here.j === goal.j) return { x: tx, z: tz };
    // standing near a junction: pick the exit that heads towards the goal, preferring
    // the one most in line with where the car already points (fewer U-turns)
    const fx = Math.sin(heading), fz = Math.cos(heading);
    const opts: Node[] = [];
    if (goal.k !== here.k) opts.push(this.nodeAt(here.k + Math.sign(goal.k - here.k), here.j));
    if (goal.j !== here.j) opts.push(this.nodeAt(here.k, here.j + Math.sign(goal.j - here.j)));
    // still far from the junction we are nearest to and it is behind us? aim at the next one
    let best = opts[0], bestScore = -Infinity;
    for (const o of opts) {
      const dx = o.x - x, dz = o.z - z, d = Math.hypot(dx, dz) || 1;
      const s = (dx * fx + dz * fz) / d;
      if (s > bestScore) { bestScore = s; best = o; }
    }
    // if the car is not yet at `here` and `here` is ahead, go through it first
    const toHere = Math.hypot(here.x - x, here.z - z);
    if (toHere > 9) {
      const ahead = ((here.x - x) * fx + (here.z - z) * fz) / toHere;
      const onRoute = Math.abs(best.x - here.x) + Math.abs(best.z - here.z) > 0;
      if (ahead > 0.3 && onRoute) return { x: here.x, z: here.z };
    }
    return { x: best.x, z: best.z };
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  /**
   * Switch off whatever is too far to matter (past the fog). Cheap: a few hundred
   * distance checks. Call once per frame with the camera's focus (the taxi).
   */
  focus(x: number, z: number, radius = 165): void {
    const half = CELL / 2;
    for (const c of this.chunks) {
      const d = Math.hypot(c.x - x, c.z - z);
      switch (c.kind) {
        case 'keep': c.mesh.visible = d - c.r < radius; break;
        case 'detail': c.mesh.visible = d - half < LOD.detail; break;
        case 'near': c.mesh.visible = d < LOD.near; break;
        default: c.mesh.visible = d >= LOD.near && d < radius + half;
      }
    }
    for (const l of this.lightGroups) l.g.visible = Math.hypot(l.x - x, l.z - z) < LOD.detail + half;
  }

  update(dt: number, elapsed: number): void {
    for (const L of this.lights) {
      L.timer -= dt;
      if (L.hold > 0) { L.hold -= dt; L.red = true; }
      else if (L.timer <= 0) {
        L.red = !L.red;
        L.cleared = false;
        L.timer = L.red ? 9 : 7;
      }
      L.lampR.emissiveIntensity = L.red ? 3.2 : 0.05;
      L.lampG.emissiveIntensity = L.red ? 0.05 : 2.6;
      L.badge.visible = L.red && !L.cleared;
      if (L.badge.visible) L.badge.position.y = 6.6 + Math.sin(elapsed * 3 + L.id) * 0.25;
    }
  }

  /* ---------------------------------------------------------------- */

  private track(layer: Layer, kind: ChunkKind): void {
    for (const mesh of layer.flush(this.group)) {
      const c = layer.centre.get(mesh)!;
      this.chunks.push({ mesh, x: c[0], z: c[1], r: mesh.geometry.boundingSphere!.radius, kind });
    }
  }

  private addChunk(mesh: Mesh, kind: ChunkKind): void {
    const s = mesh.geometry.boundingSphere!;
    this.chunks.push({ mesh, x: s.center.x, z: s.center.z, r: s.radius, kind });
  }

  private build(): void {
    const rand = mulberry32(2026);
    const ground = new Layer(groundMaterial(), false, true);
    // the same atlas material in four layers: LOD switches whole layers of a cell on and off
    const near = new Layer(cityMaterial(), true);
    const far = new Layer(cityMaterial(), false);
    const detail = new Layer(cityMaterial(), false);
    const keep = new Layer(cityMaterial(), true);
    const ASPH = rgb(PALETTE.asphalt), PAVE = rgb(PALETTE.sidewalk), PARK = rgb(PALETTE.park);
    const LANE = rgb(PALETTE.laneMark);
    const ZEBRA = rgb(PALETTE.crosswalk);
    const UVN: [number, number, number, number] = [0, 0, 1, 1];
    const road = (x0: number, x1: number, z0: number, z1: number): void => {
      if (x1 - x0 < 0.01 || z1 - z0 < 0.01) return;
      ground.at((x0 + x1) / 2, (z0 + z1) / 2, GL.asphalt).box(x0, x1, -0.09, 0, z0, z1, ASPH);
    };
    const dash = (x: number, z: number, along: 'x' | 'z'): void => {
      const w = along === 'x' ? 1.3 : 0.12, d = along === 'x' ? 0.12 : 1.3;
      ground.at(x, z, GL.paint).top(x - w / 2, x + w / 2, z - d / 2, z + d / 2, 0.008, UVN, LANE);
    };

    /* ---- roads: avenue and street segments between junctions, and the junctions ---- */
    for (let k = K_MIN; k <= K_MAX; k++) {
      const x0 = VX(k), cx = x0 + ROAD_W / 2;
      const spans: [number, number][] = [[MIN_Z, HZ(J_MIN)], [HZ(J_MAX) + ROAD_W, HWY_Z0]];
      for (let j = J_MIN; j < J_MAX; j++) spans.push([HZ(j) + ROAD_W, HZ(j + 1)]);
      for (const [za, zb] of spans) {
        road(x0, x0 + ROAD_W, za, zb);
        for (let z = za + 1.3; z < zb - 1.3; z += 2.6) dash(cx, z, 'z');
      }
    }
    for (let j = J_MIN; j <= J_MAX; j++) {
      const z0 = HZ(j), cz = z0 + ROAD_W / 2;
      const spans: [number, number][] = [[MIN_X, VX(K_MIN)], [VX(K_MAX) + ROAD_W, MAX_X]];
      for (let k = K_MIN; k < K_MAX; k++) spans.push([VX(k) + ROAD_W, VX(k + 1)]);
      for (const [xa, xb] of spans) {
        road(xa, xb, z0, z0 + ROAD_W);
        for (let x = xa + 1.3; x < xb - 1.3; x += 2.6) dash(x, cz, 'x');
      }
    }
    for (const n of this.nodes) {
      road(n.x - ROAD_W / 2, n.x + ROAD_W / 2, n.z - ROAD_W / 2, n.z + ROAD_W / 2);
      // zebra crossings on all four arms
      const m = ground.at(n.x, n.z, GL.paint);
      for (let i = 0; i < 5; i++) {
        const o = -2.4 + i * 1.2;
        for (const s of [-3.9, 3.9]) {
          m.top(n.x + o - 0.275, n.x + o + 0.275, n.z + s - 0.7, n.z + s + 0.7, 0.012, UVN, ZEBRA);
          m.top(n.x + s - 0.7, n.x + s + 0.7, n.z + o - 0.275, n.z + o + 0.275, 0.012, UVN, ZEBRA);
        }
      }
    }

    /* ---- plan the blocks ---- */
    const blocks: Block[] = [];
    for (let k = K_MIN - 1; k <= K_MAX; k++) {
      for (let j = J_MIN - 1; j <= J_MAX; j++) {
        const bx0 = Math.max(VX(k) + ROAD_W, MIN_X), bx1 = Math.min(VX(k + 1), MAX_X);
        const bz0 = Math.max(HZ(j) + ROAD_W, MIN_Z), bz1 = j >= J_MAX ? HWY_Z0 : HZ(j + 1);
        const fringe = k < K_MIN || k >= K_MAX || j < J_MIN || j >= J_MAX;
        const dx = k < CENTRE.k0 ? -1 : k > CENTRE.k1 ? 1 : 0, dz = j < CENTRE.j0 ? -1 : j > CENTRE.j1 ? 1 : 0;
        const zone: Zone = dx === 0 && dz === 0 ? 'centre' : DISTRICT_OF(dx, dz);
        const landmark = LANDMARK_BLOCKS.find(([lk, lj]) => lk === k && lj === j);
        const pr = rand();
        const park = !fringe && !landmark && pr < (zone === 'parkside' ? 0.45 : zone === 'suburbs' ? 0.18 : zone === 'campus' ? 0.22 : zone === 'centre' ? 0.06 : 0.05);
        blocks.push({
          k, j, bx0, bx1, bz0, bz1, lx0: bx0 + SW, lx1: bx1 - SW, lz0: bz0 + SW, lz1: j >= J_MAX ? bz1 : bz1 - SW,
          zone, fringe, park, lots: [], garden: !fringe && !park && !landmark && (zone === 'suburbs' || zone === 'parkside'),
        });
      }
    }
    const lotOf = (b: Block, x0: number, x1: number, z0: number, z1: number, face: 'up' | 'down', kind: Kind, big = false, landmark?: Lot['landmark']): Lot => ({
      x0: x0 + 0.04, x1: x1 - 0.04, z0, z1, face, kind, zone: b.zone, big, landmark, shop: false, seed: Math.floor(rand() * 1e9),
    });
    for (const b of blocks) {
      if (b.fringe || b.park) continue;
      const landmark = LANDMARK_BLOCKS.find(([lk, lj]) => lk === b.k && lj === b.j);
      if (landmark) { b.lots.push(lotOf(b, b.lx0, b.lx1, b.lz0, b.lz1, 'up', 'hall', true, landmark[2])); continue; }
      if ((b.zone === 'harbour' || b.zone === 'airport') && rand() < 0.3) {
        b.lots.push(lotOf(b, b.lx0 + 0.2, b.lx1 - 0.2, b.lz0, b.lz1, rand() < 0.5 ? 'up' : 'down', 'hall', true));
        continue;
      }
      const rowD = b.garden ? 2.8 : 3.4;
      const rows: { z0: number; z1: number; face: 'up' | 'down' }[] = [
        { z0: b.lz0, z1: b.lz0 + rowD, face: 'up' },
        { z0: b.lz1 - rowD, z1: b.lz1, face: 'down' },
      ];
      for (const row of rows) {
        let x = b.lx0;
        while (x < b.lx1 - 0.5) {
          const kind = rollKind(b.zone, rand());
          const wide = kind === 'tower' ? 4.5 : kind === 'hall' ? (rand() < 0.5 ? 4.5 : 3) : kind === 'block' ? (rand() < 0.5 ? 3 : 2.25) : 2.25;
          let w = Math.min(wide, b.lx1 - x);
          if (b.lx1 - (x + w) < 1.8) w = b.lx1 - x;
          if (w < 1.8) break;
          b.lots.push(lotOf(b, x, x + w, row.z0, row.z1, row.face, kind));
          x += w;
        }
      }
    }

    /* ---- hand the places their buildings ---- */
    const signs: Sign[] = [];
    const stopOf = (l: Lot): { x: number; z: number } => ({ x: (l.x0 + l.x1) / 2, z: l.face === 'up' ? l.z0 - 1.6 : l.z1 + 1.6 });
    const claim = (l: Lot, p: { id: string; name: string; type: string; emoji: string }, district: District | 'centre'): void => {
      l.shop = true;
      l.type = p.type;
      l.icon = iconFor(p.type);
      const s = stopOf(l);
      this.places.push({ id: p.id, name: p.name, type: p.type, emoji: p.emoji, x: s.x, z: s.z, district });
      const front = l.face === 'up' ? l.z0 - 0.05 : l.z1 + 0.05;
      const w = Math.min(4.2, Math.max(2.6, (l.x1 - l.x0) * 1.05));
      signs.push({ name: p.name, emoji: p.emoji, hue: Math.floor(rand() * 360), x: s.x, y: signHeight(l), z: front, rotY: l.face === 'up' ? Math.PI : 0, w });
    };
    // centre: landmarks first onto their big lots, the rest spread block by block
    const centreBlocks = blocks.filter((b) => b.zone === 'centre' && !b.fringe && !b.park);
    const normal: typeof CENTRE_PLACES = [];
    for (const p of CENTRE_PLACES) {
      if (p.landmark) {
        const lot = centreBlocks.flatMap((b) => b.lots).find((l) => l.landmark === p.landmark && !l.shop);
        if (lot) { claim(lot, p, 'centre'); continue; }
      }
      normal.push(p);
    }
    const queues = centreBlocks.filter((b) => !b.lots.some((l) => l.landmark)).map((b) => shuffle(b.lots.filter((l) => !l.big), rand));
    let qi = 0, spun = 0;
    for (const p of normal) {
      while (spun < queues.length * 2 && !queues[qi % queues.length].length) { qi++; spun++; }
      const q = queues[qi % queues.length];
      qi++;
      const lot = q.shift();
      if (!lot) throw new Error('taxi city: not enough centre lots for ' + p.id);
      spun = 0;
      claim(lot, p, 'centre');
    }
    // districts: a lot of the right kind where there is one, else the nearest free lot grows into it
    for (const district of new Set(NEW_PLACES.map((p) => p.district))) {
      const free = shuffle(blocks.filter((b) => b.zone === district && !b.fringe && !b.park).flatMap((b) => b.lots).filter((l) => !l.big), rand);
      for (const p of NEW_PLACES.filter((q) => q.district === district)) {
        let i = free.findIndex((l) => l.kind === p.kind);
        if (i < 0) { i = 0; free[0].kind = p.kind; }
        const [lot] = free.splice(i, 1);
        claim(lot, { id: 'tx-' + this.places.length, name: p.name, type: p.type, emoji: p.emoji }, district);
      }
    }

    /* ---- build the blocks ---- */
    const tail = (l: Lot) => ({ x0: l.x0, x1: l.x1, z0: l.z0, z1: l.z1 });
    for (const b of blocks) {
      const cx = (b.bx0 + b.bx1) / 2, cz = (b.bz0 + b.bz1) / 2;
      // pavement slab over the whole block, lawn or paving in the middle
      ground.at(cx, cz, GL.paving).box(b.bx0, b.bx1, 0, CURB, b.bz0, b.bz1, PAVE);
      const green = b.fringe || b.park;
      if (green) {
        ground.at(cx, cz, GL.grass).top(b.lx0, b.lx1, b.lz0, b.lz1, CURB + 0.03, UVN, PARK);
        const m = near.at(cx, cz);
        const n = b.park ? 9 : b.fringe ? 4 : 0;
        for (let i = 0; i < n; i++) tree(m, b.lx0 + 1 + rand() * Math.max(0.1, b.lx1 - b.lx0 - 2), b.lz0 + 1 + rand() * Math.max(0.1, b.lz1 - b.lz0 - 2), 0.9 + rand() * 0.6, rand);
      }
      if (b.fringe) continue;
      // street lamps along the north and south kerbs
      const lm = near.at(cx, cz);
      for (let x = b.bx0 + 2; x < b.bx1 - 1; x += 7) { lamp(lm, x, b.bz0 + 0.5, -1); lamp(lm, x, b.bz1 - 0.5, 1); }
      if (b.garden) {
        const gz0 = b.lz0 + 2.8, gz1 = b.lz1 - 2.8;
        ground.at(cx, cz, GL.grass).top(b.lx0, b.lx1, gz0, gz1, CURB + 0.03, UVN, PARK);
        for (let x = b.lx0 + 1.2; x < b.lx1 - 0.5; x += 2.6 + rand()) tree(lm, x, (gz0 + gz1) / 2, 0.55 + rand() * 0.25, rand);
      }
      for (const l of b.lots) {
        const lx = (l.x0 + l.x1) / 2, lz = (l.z0 + l.z1) / 2;
        const built = planLot(l); // pushed back behind its yard, for forecourts and playgrounds
        const top = emitBuilding(near.at(lx, lz), built);
        emitBuilding(far.at(lx, lz), built, true);
        emitIcon(detail.at(lx, lz), l, top, l.seed);
        this.footprints.push(tail(l));
      }
      const stops = this.places.filter((p) => p.x >= b.bx0 && p.x <= b.bx1 && p.z >= b.bz0 && p.z <= b.bz1);
      furnishBlock(detail.at(cx, cz), b, stops, rand);
    }
    // tag the footprints that belong to a place, for the tests
    for (const p of this.places) {
      const f = this.footprints.find((q) => p.x >= q.x0 - 0.01 && p.x <= q.x1 + 0.01 && (Math.abs(p.z - (q.z0 - 1.6)) < 0.01 || Math.abs(p.z - (q.z1 + 1.6)) < 0.01));
      if (f) f.placeId = p.id;
    }

    /* ---- signs over every door ---- */
    const { tex, rows } = signAtlas(signs, STREET_NAMES);
    const signMat = new MeshStandardMaterial({ map: tex, emissiveMap: tex, emissive: new Color('#ffffff'), emissiveIntensity: 0.55, roughness: 0.4, side: DoubleSide });
    const sgeos = signs.map((n, i) => signQuad(i, rows, n.w, n.x, n.y, n.z, n.rotY));
    // street-name plates at every junction, stop and yield signs where there is no light
    const lit = new Set(this.nodes.filter((n) => mod(n.k * 3 + n.j * 2, 4) === 0));
    const stopCell = signs.length + STREET_NAMES.length;
    for (const n of this.nodes) {
      const px = n.x + ROAD_W / 2 + 0.8, pz = n.z + ROAD_W / 2 + 0.8;
      const dm = detail.at(px, pz);
      dm.box(px - 0.04, px + 0.04, CURB, CURB + 3.75, pz - 0.04, pz + 0.04, rgb('#6d747b'));
      sgeos.push(signQuad(signs.length + (n.k - K_MIN), rows, 1.5, px, CURB + 3.6, pz, 0));
      sgeos.push(signQuad(signs.length + AVENUES.length + (n.j - J_MIN), rows, 1.5, px, CURB + 3.25, pz, Math.PI / 2));
      if (lit.has(n)) continue;
      const yieldSign = mod(n.k + n.j, 2) === 1;
      const poly = yieldSign ? YIELD_POLY : STOP_POLY;
      // one facing each approach that has no pole of its own: north-west corner looks north, the plate pole looks south
      const qx = n.x - ROAD_W / 2 - 0.8, qz = n.z - ROAD_W / 2 - 0.8;
      detail.at(qx, qz).box(qx - 0.04, qx + 0.04, CURB, CURB + 2.5, qz - 0.04, qz + 0.04, rgb('#6d747b'));
      sgeos.push(shapeSign(stopCell, rows, yieldSign, poly, 0.8, qx, CURB + 2.35, qz - 0.06, Math.PI));
      sgeos.push(shapeSign(stopCell, rows, yieldSign, poly, 0.8, px, CURB + 2.35, pz + 0.06, 0));
    }
    for (const merged of mergeByCell(sgeos, 400)) {
      const mesh = new Mesh(merged, signMat);
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
      this.addChunk(mesh, 'detail');
    }
    sgeos.forEach((g) => g.dispose());

    /* ---- the sea, east of the harbour ---- */
    const sea = new Mesh(new PlaneGeometry(400, 900).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: '#2f8fc4', roughness: 0.08, metalness: 0.25, envMapIntensity: 1.4 }));
    sea.position.set(MAX_X + 200 - 2, -0.25, (MIN_Z + MAX_Z) / 2);
    sea.receiveShadow = true;
    this.group.add(sea);

    this.buildHighway(ground, keep);
    this.buildLights(detail, rand);

    this.track(ground, 'keep'); this.track(keep, 'keep'); this.track(near, 'near'); this.track(far, 'far'); this.track(detail, 'detail');
  }

  /**
   * Highway 1: six lanes, three each way, a concrete median barrier, steel
   * guard rails, overhead gantries with green signs, and lamp posts on the
   * median. The avenues meet it at grade, so a taxi can swing on and off.
   */
  private buildHighway(ground: Layer, city: Layer): void {
    const x0 = MIN_X, x1 = MAX_X;
    const ASPH = rgb(PALETTE.asphalt), LANE = rgb(PALETTE.laneMark), YELLOW = rgb('#f2c230');
    const UVN: [number, number, number, number] = [0, 0, 1, 1];
    const concrete = rgb('#b9b6ad'), steel = rgb('#a7aeb5'), dark = rgb('#2c3036'), lampCol = rgb('#fff6dc');
    const STEP = 40;
    for (let x = x0; x < x1; x += STEP) {
      const xe = Math.min(x + STEP, x1);
      ground.at((x + xe) / 2, HWY_Z0, GL.asphalt).box(x, xe, -0.09, 0, HWY_Z0, HWY_Z0 + HWY_W, ASPH);
    }
    const north = HWY_Z0 + HWY_SHOULDER, south = HWY_Z0 + HWY_W - HWY_SHOULDER;
    const medN = HWY_MID - HWY_MEDIAN / 2 - HWY_GAP, medS = HWY_MID + HWY_MEDIAN / 2 + HWY_GAP;
    const onAvenue = (x: number) => avenueColumn(Math.floor(x));
    // edge lines (solid white outside, solid yellow along the median)
    for (const [z, col] of [[north, LANE], [south, LANE], [medN, YELLOW], [medS, YELLOW]] as const) {
      for (let x = x0; x < x1; x += STEP) {
        const xe = Math.min(x + STEP, x1);
        ground.at((x + xe) / 2, z, GL.paint).top(x, xe, z - 0.08, z + 0.08, 0.012, UVN, col);
      }
    }
    // dashed lane dividers
    for (let i = 1; i < 3; i++) {
      for (const z of [north + HWY_LANE * i, medS + HWY_LANE * i]) {
        for (let x = x0 + 2; x < x1 - 2; x += 9) if (!onAvenue(x)) ground.at(x, z, GL.paint).top(x, x + 3.2, z - 0.07, z + 0.07, 0.012, UVN, LANE);
      }
    }
    // the median barrier (New Jersey profile, approximated in two steps) with gaps at the avenues
    let runStart: number | null = null;
    const flushRun = (a: number, b: number) => {
      if (b - a < 0.5) return;
      for (let x = a; x < b; x += STEP) {
        const xe = Math.min(x + STEP, b), m = city.at((x + xe) / 2, HWY_MID);
        m.box(x, xe, 0, 0.32, HWY_MID - HWY_MEDIAN / 2, HWY_MID + HWY_MEDIAN / 2, concrete);
        m.box(x, xe, 0.32, 0.87, HWY_MID - HWY_MEDIAN * 0.225, HWY_MID + HWY_MEDIAN * 0.225, concrete);
      }
    };
    for (let x = x0; x <= x1; x += 1) {
      const gap = onAvenue(x) || x === x1;
      if (!gap && runStart === null) runStart = x;
      if (gap && runStart !== null) { flushRun(runStart, x); runStart = null; }
    }
    // guard rails: continuous on the south edge, cut for the avenues on the north edge
    const rail = (a: number, b: number, z: number) => {
      if (b - a < 1) return;
      for (let x = a; x < b; x += STEP) {
        const xe = Math.min(x + STEP, b), m = city.at((x + xe) / 2, z);
        m.box(x, xe, 0.46, 0.78, z - 0.04, z + 0.04, steel);
        for (let px = x + 0.5; px < xe; px += 3) { const pz = z + (z > HWY_MID ? 0.12 : -0.12); m.box(px - 0.06, px + 0.06, 0, 0.7, pz - 0.06, pz + 0.06, dark); }
      }
    };
    rail(x0, x1, HWY_Z0 + HWY_W - 0.35);
    runStart = null;
    for (let x = x0; x <= x1; x += 1) {
      const gap = onAvenue(x) || x === x1;
      if (!gap && runStart === null) runStart = x;
      if (gap && runStart !== null) { rail(runStart, x, HWY_Z0 + 0.35); runStart = null; }
    }
    // median lamp posts
    for (let x = x0 + 6; x < x1; x += 21) {
      if (onAvenue(x)) continue;
      const m = city.at(x, HWY_MID);
      m.box(x - 0.08, x + 0.08, 0, 7, HWY_MID - 0.08, HWY_MID + 0.08, steel);
      m.box(x - 0.05, x + 0.05, 6.9, 7.0, HWY_MID - 1.6, HWY_MID + 1.6, steel);
      m.box(x - 0.25, x + 0.25, 6.79, 6.91, HWY_MID - 1.7, HWY_MID - 1.4, lampCol, 'lamp');
      m.box(x - 0.25, x + 0.25, 6.79, 6.91, HWY_MID + 1.4, HWY_MID + 1.7, lampCol, 'lamp');
    }

    // overhead gantries with green signs, both directions
    const gantries: { text: string; sub: string; x: number; z: number; rot: number }[] = [];
    const DEST_W = [['DOWNTOWN', 'Next exit · 1 km'], ['OLD TOWN', 'Exit 9 · keep left'], ['STADIUM', 'Exit 7 · 2 km'], ['AIRPORT', 'Exit 4 · 5 km']];
    const DEST_E = [['HARBOUR', 'Next exit · 1 km'], ['BEACH', 'Exit 12 · 3 km'], ['UNIVERSITY', 'Exit 14 · 2 km'], ['TECH PARK', 'Exit 15 · 4 km']];
    let gi = 0;
    for (let k = K_MIN; k < K_MAX; k += 3) {
      const x = VX(k) + ROAD_W + 9;
      const m = city.at(x, HWY_Z0);
      // two posts and a truss beam across all six lanes
      for (const z of [HWY_Z0 + 0.3, HWY_Z0 + HWY_W - 0.3]) m.box(x - 0.15, x + 0.15, 0, 7.2, z - 0.15, z + 0.15, steel);
      m.box(x - 0.11, x + 0.11, 7.0, 7.22, HWY_Z0, HWY_Z0 + HWY_W, steel);
      m.box(x - 0.11, x + 0.11, 6.2, 6.42, HWY_Z0, HWY_Z0 + HWY_W, steel);
      for (let z = HWY_Z0; z < HWY_Z0 + HWY_W; z += 1.2) m.box(x - 0.04, x + 0.04, 6.28, 7.14, z - 0.04, z + 0.04, steel);
      const [wt, ws] = DEST_W[gi % DEST_W.length], [et, es] = DEST_E[gi % DEST_E.length];
      gantries.push({ text: '◀ ' + wt, sub: ws, x: x + 0.18, z: (HWY_Z0 + medN) / 2, rot: Math.PI / 2 });
      gantries.push({ text: et + ' ▶', sub: es, x: x - 0.18, z: (medS + HWY_Z0 + HWY_W) / 2, rot: -Math.PI / 2 });
      gi++;
    }
    // every panel on one canvas: two columns of 512x200 cells
    const rows = Math.ceil(gantries.length / 2);
    const cv = document.createElement('canvas'); cv.width = 1024; cv.height = 200 * rows;
    const c = cv.getContext('2d')!;
    gantries.forEach((sg, i) => {
      const ox = (i % 2) * 512, oy = Math.floor(i / 2) * 200;
      c.fillStyle = '#0d6b3c'; c.fillRect(ox, oy, 512, 200);
      c.strokeStyle = '#ffffff'; c.lineWidth = 8; c.strokeRect(ox + 10, oy + 10, 492, 180);
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '700 26px "Arial Narrow",Arial,sans-serif'; c.fillText('HIGHWAY 1', ox + 256, oy + 42);
      c.font = '900 64px "Arial Narrow",Arial,sans-serif'; c.fillText(sg.text, ox + 256, oy + 104, 470);
      c.font = '700 28px Arial,sans-serif'; c.fillText(sg.sub, ox + 256, oy + 160, 470);
    });
    const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; t.anisotropy = 8;
    const signMat = new MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new Color('#ffffff'), emissiveIntensity: 0.35, roughness: 0.5 });
    const panels: BufferGeometry[] = [];
    gantries.forEach((sg, i) => {
      const g = new PlaneGeometry(7.2, 2.8);
      const uv = g.getAttribute('uv');
      const u0 = (i % 2) * 0.5, v1 = 1 - Math.floor(i / 2) / rows, v0 = v1 - 1 / rows;
      for (let q = 0; q < uv.count; q++) uv.setXY(q, u0 + uv.getX(q) * 0.5, v0 + uv.getY(q) * (v1 - v0));
      g.rotateY(sg.rot); g.translate(sg.x, 6.7, sg.z);
      panels.push(g);
      // the back of the panel: plain steel, not the text mirrored
      const bx = sg.x - Math.sign(sg.rot) * 0.05;
      city.at(sg.x, HWY_Z0).box(bx - 0.03, bx + 0.03, 5.3, 8.1, sg.z - 3.6, sg.z + 3.6, rgb('#5d6b63'));
    });
    for (const merged of mergeByCell(panels, 40)) {
      const mesh = new Mesh(merged, signMat);
      mesh.matrixAutoUpdate = false;
      this.group.add(mesh);
    }
    panels.forEach((g) => g.dispose());
  }

  /**
   * The quiz lights, modelled properly: a concrete footing, a tapered
   * galvanised pole with a braced mast arm over the road, two double-faced
   * signal heads with yellow-bordered backplates, three lenses each under
   * their visors, and a push-button box for pedestrians. Two poles per
   * junction — one arm over the avenue, one over the street — so the light is
   * in front of the taxi whichever way it comes. The steel goes into the
   * city's shared geometry; only the red and green lenses are per light, so
   * they can change, and the amber ones are shared by all.
   */
  private buildLights(city: Layer, rand: () => number): void {
    const galv = rgb('#8f969d'), black = rgb('#15171a'), concrete = rgb('#a9a69e'), yellow = rgb('#ffd21a');
    const RED = rgb('#ff2a1a'), AMBER = rgb('#ffb21a'), GREEN = rgb('#2bff8a');
    const badgeTex = (() => {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
      const c = cv.getContext('2d')!;
      c.fillStyle = '#ffd21f'; c.beginPath(); c.arc(64, 64, 58, 0, Math.PI * 2); c.fill();
      c.lineWidth = 8; c.strokeStyle = '#1b1035'; c.stroke();
      c.fillStyle = '#1b1035'; c.font = '900 84px "Trebuchet MS",Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 64, 70);
      const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; return t;
    })();
    const badgeMat = new SpriteMaterial({ map: badgeTex, depthTest: true });
    // every lens of every light lives in one layer and one material; a light owns only the
    // vertex ranges of its red and green lenses
    const lens = new Layer(lensMaterial(), false, true);
    const Y0 = CURB;
    let id = 0;
    for (const n of this.nodes) {
      // about one junction in four, never two side by side
      if (mod(n.k * 3 + n.j * 2, 4) !== 0) continue;
      const g = new Group();
      const m: Mesher = city.at(n.x, n.z);
      const lm: Mesher = lens.at(n.x, n.z);
      const rangeR: [number, number][] = [], rangeG: [number, number][] = [];
      const red = rand() < 0.5;
      // pole at a corner; the arm reaches along `d` over the road; lenses face ±`f`
      const poles: { px: number; pz: number; dx: number; dz: number }[] = [
        { px: n.x + ROAD_W / 2 + 0.8, pz: n.z - ROAD_W / 2 - 0.8, dx: -1, dz: 0 },
        { px: n.x - ROAD_W / 2 - 0.8, pz: n.z + ROAD_W / 2 + 0.8, dx: 0, dz: -1 },
      ];
      for (const { px, pz, dx, dz } of poles) {
        const yaw = Math.atan2(dx, dz); // the arm's direction
        const at = (along: number, y: number, side = 0) => [px + dx * along + dz * side, Y0 + y, pz + dz * along - dx * side] as const;
        m.addGeometry(new CylinderGeometry(0.28, 0.34, 0.3, 10).translate(px, Y0 + 0.15, pz), concrete);
        m.addGeometry(new CylinderGeometry(0.1, 0.14, 5.5, 8).translate(px, Y0 + 3.05, pz), galv);
        m.addGeometry(new SphereGeometry(0.115, 8, 5).translate(px, Y0 + 5.8, pz), galv);
        // the mast arm and its brace
        const armL = 4.9;
        const arm = new CylinderGeometry(0.055, 0.09, armL, 8).rotateX(Math.PI / 2).rotateY(yaw);
        m.addGeometry(arm.translate(...at(armL / 2, 5.45)), galv);
        const braceL = Math.hypot(1.7, 0.9);
        const brace = new CylinderGeometry(0.035, 0.035, braceL, 6).rotateX(Math.PI / 2 - Math.atan2(0.9, 1.7)).rotateY(yaw);
        m.addGeometry(brace.translate(...at(0.85, 5.0)), galv);
        // pedestrian push-button box
        m.addGeometry(new BoxGeometry(0.2, 0.3, 0.16).rotateY(yaw).translate(...at(-0.17, 1.35)), black);
        // two signal heads on the arm, double-faced (one side for each direction)
        for (const along of [2.5, 4.2]) {
          const [hx, hy, hz] = at(along, 4.5);
          m.addGeometry(new CylinderGeometry(0.03, 0.03, 0.4, 5).translate(hx, hy + 0.75, hz), galv);
          m.addGeometry(new BoxGeometry(0.4, 1.12, 0.5).rotateY(yaw + Math.PI / 2).translate(hx, hy, hz), black);
          m.addGeometry(new BoxGeometry(0.66, 1.44, 0.03).rotateY(yaw + Math.PI / 2).translate(hx, hy, hz), yellow);
          for (const side of [-1, 1]) {
            for (const [col, dy, ranges] of [[RED, 0.34, rangeR], [AMBER, 0, null], [GREEN, -0.34, rangeG]] as const) {
              // lens: a shallow disc facing out of the head; visor: half a tube over it
              const lensG = new CylinderGeometry(0.125, 0.125, 0.03, 12).rotateX(Math.PI / 2).rotateY(yaw + Math.PI / 2);
              const [lx, ly, lz] = at(along, 4.5 + dy, side * 0.26);
              const start = lm.vertexCount;
              lm.layer = ranges === null ? 0.05 : ranges === rangeR ? (red ? 3.2 : 0.05) : (red ? 0.05 : 2.6);
              lm.addGeometry(lensG.translate(lx, ly, lz), col);
              ranges?.push([start, lm.vertexCount - start]);
              const visor = new CylinderGeometry(0.15, 0.15, 0.22, 8, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateY(yaw + Math.PI / 2);
              const [vx, vy, vz] = at(along, 4.5 + dy, side * 0.37);
              m.addGeometry(visor.translate(vx, vy, vz), black);
            }
          }
        }
      }
      const badge = new Sprite(badgeMat);
      badge.scale.set(2.2, 2.2, 1);
      badge.position.set(n.x, 7.2, n.z);
      g.add(badge);
      this.group.add(g);
      this.lightGroups.push({ g, x: n.x, z: n.z });
      this.lights.push({
        id: id++, x: n.x, z: n.z, red, timer: 2 + rand() * 7, hold: 0, cleared: false, badge,
        lampR: new Lamp(lens, lm, rangeR, red ? 3.2 : 0.05), lampG: new Lamp(lens, lm, rangeG, red ? 0.05 : 2.6),
      });
    }
    for (const mesh of lens.flush(this.group)) this.addChunk(mesh, 'detail');
  }
}
