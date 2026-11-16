/**
 * Taxi Rush — the big city.
 *
 * The walking city stays exactly where it is, in the middle: same streets, same
 * ninety-one doors. Around it, the same grid simply carries on — a street every
 * 19 tiles, an avenue every 21, six-tile roads and three-tile pavements — into
 * eight new districts, so the whole map is about ten times the original. The
 * districts are built from the same Kenney kits with the same (now PBR)
 * materials, merged per kit and colour scheme, so the new streets look like the
 * old ones and cost a handful of draw calls each.
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
  DoubleSide,
  Group,
  InstancedMesh,
  Mesh,
  MeshBasicMaterial,
  MeshStandardMaterial,
  Object3D,
  PlaneGeometry,
  SRGBColorSpace,
  SphereGeometry,
  CylinderGeometry,
  Sprite,
  SpriteMaterial,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { GH, GW, ROAD_W, isRoad, isSidewalk } from '../city/layout';
import { BUILDINGS } from '../city/buildings';
import { CURB } from '../city/city';
import { SHELLS, TREES } from '../city/kit';
import { kitMaterial, localGeometry, model, placedGeometry, variationCount, type KitName } from '../city/kits';
import { PALETTE, mat } from '../city/palette';
import { uvScaleBox } from '../city/textures';
import { mulberry32 } from '../core/rng';
import { NEW_PLACES, type District } from './places';

/* ------------------------------------------------------------------ *
 * The grid                                                            *
 * ------------------------------------------------------------------ */

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
const SW = 3; // pavement width
/** On an avenue's carriageway (the x-columns of the grid)? */
const avenueColumn = (tx: number): boolean => ((((tx - 15) % 21) + 21) % 21) < ROAD_W;

const inOriginal = (x: number, z: number): boolean => x >= 0 && x < GW && z >= 0 && z < GH;
const mod = (a: number, n: number): number => ((a % n) + n) % n;
/** Is this tile on the extended road grid? */
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
  lampR: MeshStandardMaterial;
  lampG: MeshStandardMaterial;
  badge: Sprite;
}

export interface Node {
  k: number;
  j: number;
  x: number;
  z: number;
}

/* ------------------------------------------------------------------ *
 * Helpers                                                             *
 * ------------------------------------------------------------------ */

type Bag = Map<string, { mat: MeshStandardMaterial | MeshBasicMaterial; geos: BufferGeometry[] }>;

function slab(bag: Bag, key: string, m: MeshStandardMaterial | MeshBasicMaterial, w: number, h: number, d: number, x: number, y: number, z: number, uv = true): void {
  const b = new BoxGeometry(w, h, d);
  if (uv) uvScaleBox(b, w, h, d);
  const g = b.toNonIndexed();
  b.dispose();
  g.deleteAttribute('color');
  g.translate(x, y, z);
  let e = bag.get(key);
  if (!e) bag.set(key, (e = { mat: m, geos: [] }));
  e.geos.push(g);
}

/**
 * ECYR perf: merge by city cell, not by list order. Merging "the next 400 pieces" made buffers that
 * spanned the whole map, so the camera could never leave any of them out (and neither could the
 * sun's shadow pass): every frame drew the entire city, ~7 million triangles. Grouped into cells of
 * a block or so, whatever is behind the camera or past the fog is skipped.
 */
export const CELL = 44;
export function mergeByCell(geos: BufferGeometry[], cap = 600): BufferGeometry[] {
  const cells = new Map<string, BufferGeometry[]>();
  for (const g of geos) {
    if (!g.boundingBox) g.computeBoundingBox();
    const b = g.boundingBox!;
    const key = Math.floor((b.min.x + b.max.x) / 2 / CELL) + ',' + Math.floor((b.min.z + b.max.z) / 2 / CELL);
    let l = cells.get(key);
    if (!l) cells.set(key, (l = []));
    l.push(g);
  }
  const out: BufferGeometry[] = [];
  for (const l of cells.values()) {
    for (let i = 0; i < l.length; i += cap) {
      const m = mergeGeometries(l.slice(i, i + cap), false);
      if (m) { m.computeBoundingSphere(); out.push(m); }
    }
  }
  return out;
}

function flush(bag: Bag, parent: Group, shadows = true): void {
  for (const { mat: m, geos } of bag.values()) {
    if (!geos.length) continue;
    for (const merged of mergeByCell(geos)) {
      const mesh = new Mesh(merged, m);
      mesh.receiveShadow = true;
      mesh.castShadow = shadows;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
    }
    geos.forEach((g) => g.dispose());
  }
}

/* ------------------------------------------------------------------ *
 * Sign atlas: one texture for every new place name                    *
 * ------------------------------------------------------------------ */

const SIGN_W = 512, SIGN_H = 96, ATLAS_COLS = 4, ATLAS_ROWS = 24;

function signAtlas(names: { emoji: string; name: string; hue: number }[]): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = SIGN_W * ATLAS_COLS;
  cv.height = SIGN_H * ATLAS_ROWS;
  const c = cv.getContext('2d')!;
  names.forEach((n, i) => {
    const x = (i % ATLAS_COLS) * SIGN_W, y = Math.floor(i / ATLAS_COLS) * SIGN_H;
    const bg = `hsl(${n.hue},70%,22%)`;
    c.fillStyle = bg;
    c.fillRect(x, y, SIGN_W, SIGN_H);
    c.strokeStyle = `hsl(${n.hue},85%,62%)`;
    c.lineWidth = 8;
    c.strokeRect(x + 4, y + 4, SIGN_W - 8, SIGN_H - 8);
    c.font = '54px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    c.textBaseline = 'middle';
    c.fillText(n.emoji, x + 18, y + SIGN_H / 2 + 3);
    c.fillStyle = '#fff6dc';
    let size = 40;
    c.font = `800 ${size}px "Trebuchet MS",Arial,sans-serif`;
    while (c.measureText(n.name).width > SIGN_W - 110 && size > 18) { size -= 2; c.font = `800 ${size}px "Trebuchet MS",Arial,sans-serif`; }
    c.fillText(n.name, x + 92, y + SIGN_H / 2 + 2);
  });
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

function signQuad(i: number, w: number, x: number, y: number, z: number, rotY: number): BufferGeometry {
  const h = w * (SIGN_H / SIGN_W);
  const g = new PlaneGeometry(w, h);
  const uv = g.getAttribute('uv');
  const u0 = (i % ATLAS_COLS) / ATLAS_COLS, u1 = u0 + 1 / ATLAS_COLS;
  const row = Math.floor(i / ATLAS_COLS);
  const v1 = 1 - row / ATLAS_ROWS, v0 = v1 - 1 / ATLAS_ROWS;
  for (let k = 0; k < uv.count; k++) uv.setXY(k, uv.getX(k) ? u1 : u0, uv.getY(k) ? v1 : v0);
  g.rotateY(rotY);
  g.translate(x, y, z);
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

export class TaxiWorld {
  readonly group = new Group();
  readonly places: Place[] = [];
  readonly lights: QuizLight[] = [];
  readonly nodes: Node[] = [];
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
        else ok = inOriginal(x, z) ? isRoad(x, z) || isSidewalk(x, z) : gridRoad(x, z) || gridSidewalk(x, z);
        this.grid[(z - MIN_Z) * this.gw + (x - MIN_X)] = ok ? 1 : 0;
      }
    }
    for (let k = K_MIN; k <= K_MAX; k++) for (let j = J_MIN; j <= J_MAX; j++) this.nodes.push({ k, j, x: VX(k) + ROAD_W / 2, z: HZ(j) + ROAD_W / 2 });

    // the city's own places, at their doors
    for (const b of BUILDINGS) {
      const x = b.x + b.w / 2;
      const z = b.face === 'up' ? b.y - 1.6 : b.y + b.h + 1.6;
      this.places.push({ id: b.id, name: b.name, type: b.type, emoji: b.emoji, x, z, district: 'centre' });
    }
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

  private build(): void {
    const rand = mulberry32(2026);
    const ground: Bag = new Map();
    const asphalt = mat(PALETTE.asphalt, { map: 'asphalt' });
    const paving = mat(PALETTE.sidewalk, { map: 'paving' });
    const kerb = mat(PALETTE.curb, { map: 'paving' });
    const park = mat(PALETTE.park, { map: 'grass' });
    const line = new MeshBasicMaterial({ color: PALETTE.laneMark });
    const zebra = new MeshBasicMaterial({ color: PALETTE.crosswalk });

    /* ---- roads outside the original city (it draws its own, plus a 16-tile overrun) ---- */
    const OV = 16;
    for (let k = K_MIN; k <= K_MAX; k++) {
      const x0 = VX(k), cx = x0 + ROAD_W / 2;
      for (let j = J_MIN - 1; j <= J_MAX; j++) {
        // the stretch between two streets (or the map edge)
        const za = j < J_MIN ? MIN_Z : HZ(j) + ROAD_W, zb = j >= J_MAX ? HWY_Z0 : HZ(j + 1);
        if (zb <= za) continue;
        const original = k >= 0 && k <= 3;
        let s0 = za, s1 = zb;
        if (original) { if (s0 < GH + OV && s1 > -OV) { if (s0 >= -OV) s0 = Math.max(s0, GH + OV); else s1 = Math.min(s1, -OV); } }
        if (s1 - s0 > 0.01) {
          slab(ground, 'asphalt', asphalt, ROAD_W, 0.18, s1 - s0, cx, -0.09, (s0 + s1) / 2);
          for (let z = s0 + 1.3; z < s1 - 1.3; z += 2.6) slab(ground, 'line', line, 0.12, 0.01, 1.3, cx, 0.006, z, false);
        }
      }
    }
    for (let j = J_MIN; j <= J_MAX; j++) {
      const z0 = HZ(j), cz = z0 + ROAD_W / 2;
      const original = j >= 0 && j <= 4;
      const segs: [number, number][] = original ? [[MIN_X, -OV], [GW + OV, MAX_X]] : [[MIN_X, MAX_X]];
      for (const [a, b] of segs) {
        slab(ground, 'asphalt', asphalt, b - a, 0.18, ROAD_W, (a + b) / 2, -0.088, cz);
        for (let x = a + 1.3; x < b - 1.3; x += 2.6) {
          if (mod(Math.floor(x) - 15, 21) < ROAD_W) continue; // not through the junctions
          slab(ground, 'line', line, 1.3, 0.01, 0.12, x, 0.008, cz, false);
        }
      }
    }
    /* ---- zebra crossings at the new junctions ---- */
    for (const n of this.nodes) {
      if (inOriginal(n.x, n.z) || (n.x > -OV && n.x < GW + OV && n.z > -OV && n.z < GH + OV)) continue;
      for (let i = 0; i < 5; i++) {
        const o = -2.4 + i * 1.2;
        slab(ground, 'zebra', zebra, 0.55, 0.012, 1.4, n.x + o, 0.012, n.z - 3.9, false);
        slab(ground, 'zebra', zebra, 0.55, 0.012, 1.4, n.x + o, 0.012, n.z + 3.9, false);
        slab(ground, 'zebra', zebra, 1.4, 0.012, 0.55, n.x - 3.9, 0.012, n.z + o, false);
        slab(ground, 'zebra', zebra, 1.4, 0.012, 0.55, n.x + 3.9, 0.012, n.z + o, false);
      }
    }

    /* ---- the new blocks ---- */
    const buildings: Map<string, { kit: KitName; variation: number; geos: BufferGeometry[] }> = new Map();
    const addShell = (kind: keyof typeof SHELLS, x: number, z: number, w: number, d: number, h: number, face: 'up' | 'down', seed: number): void => {
      const { kit, models } = SHELLS[kind];
      const r = mulberry32(seed);
      let best = models[0], bestP = Infinity;
      for (const name of models) {
        const m = model(kit, name);
        const sx = w / m.size.x, sz = d / m.size.z, even = Math.sqrt(sx * sz);
        const p = Math.abs(Math.log(sx / sz)) + Math.abs(Math.log(h / m.size.y / even)) + r() * 0.12;
        if (p < bestP) { bestP = p; best = name; }
      }
      const m = model(kit, best);
      const sx = w / m.size.x, sz = d / m.size.z, even = Math.sqrt(sx * sz);
      const sy = Math.min(even * 1.3, Math.max(even * 0.75, h / m.size.y));
      const variation = Math.floor(r() * variationCount(kit));
      const key = kit + '|' + variation;
      let e = buildings.get(key);
      if (!e) buildings.set(key, (e = { kit, variation, geos: [] }));
      e.geos.push(placedGeometry(m, { x, y: CURB, z, rotY: face === 'up' ? 0 : Math.PI, scale: { x: sx, y: sy, z: sz } }));
    };

    const treeSpots: { x: number; z: number; s: number; kind: number }[] = [];
    const lampSpots: { x: number; z: number; rot: number }[] = [];
    const placeQueue = new Map<District, typeof NEW_PLACES>();
    for (const p of NEW_PLACES) { const l = placeQueue.get(p.district) ?? []; l.push(p); placeQueue.set(p.district, l); }
    const named: { name: string; emoji: string; hue: number; x: number; y: number; z: number; rotY: number; w: number }[] = [];

    for (let k = K_MIN; k < K_MAX; k++) {
      for (let j = J_MIN; j < J_MAX; j++) {
        const bx0 = VX(k) + ROAD_W, bx1 = VX(k + 1); // block land, x
        const bz0 = HZ(j) + ROAD_W, bz1 = HZ(j + 1);
        const cx = (bx0 + bx1) / 2, cz = (bz0 + bz1) / 2;
        if (inOriginal(cx, cz)) continue;
        const dx = cx < 0 ? -1 : cx > GW ? 1 : 0, dz = cz < 0 ? -1 : cz > GH ? 1 : 0;
        const district = DISTRICT_OF(dx, dz);
        // pavement slab over the whole block, then the land in the middle
        slab(ground, 'kerb', kerb, bx1 - bx0, CURB, bz1 - bz0, cx, CURB / 2, cz);
        const lx0 = bx0 + SW, lx1 = bx1 - SW, lz0 = bz0 + SW, lz1 = bz1 - SW;
        // street lamps along the north and south kerbs
        for (let x = bx0 + 2; x < bx1 - 1; x += 7) { lampSpots.push({ x, z: bz0 + 0.5, rot: Math.PI }); lampSpots.push({ x, z: bz1 - 0.5, rot: 0 }); }

        const isPark = (district === 'parkside' && rand() < 0.45) || (district === 'suburbs' && rand() < 0.18) || (district === 'campus' && rand() < 0.22) || rand() < 0.05;
        if (isPark) {
          slab(ground, 'park', park, lx1 - lx0, 0.06, lz1 - lz0, (lx0 + lx1) / 2, CURB + 0.03, cz);
          for (let i = 0; i < 9; i++) treeSpots.push({ x: lx0 + 1 + rand() * (lx1 - lx0 - 2), z: lz0 + 1 + rand() * (lz1 - lz0 - 2), s: 0.9 + rand() * 0.6, kind: Math.floor(rand() * 2) });
          continue;
        }
        slab(ground, 'paving', paving, lx1 - lx0, 0.04, lz1 - lz0, (lx0 + lx1) / 2, CURB + 0.02, cz);

        // two rows of buildings, back to back: one faces the street to the north, one the south
        const rows: { z0: number; z1: number; face: 'up' | 'down' }[] = [
          { z0: lz0, z1: lz0 + 3.4, face: 'up' },
          { z0: lz1 - 3.4, z1: lz1, face: 'down' },
        ];
        for (const row of rows) {
          let x = lx0;
          while (x < lx1 - 0.5) {
            let kind: keyof typeof SHELLS;
            const r = rand();
            switch (district) {
              case 'downtown': kind = r < 0.55 ? 'tower' : 'block'; break;
              case 'harbour': case 'airport': kind = r < 0.6 ? 'hall' : r < 0.85 ? 'block' : 'house'; break;
              case 'suburbs': kind = r < 0.85 ? 'house' : 'block'; break;
              case 'oldtown': kind = r < 0.55 ? 'house' : 'block'; break;
              case 'market': kind = r < 0.45 ? 'hall' : r < 0.8 ? 'house' : 'block'; break;
              case 'campus': kind = r < 0.5 ? 'block' : r < 0.75 ? 'tower' : 'house'; break;
              default: kind = r < 0.5 ? 'hall' : 'block';
            }
            const wide = kind === 'tower' ? 4.5 : kind === 'hall' ? (rand() < 0.5 ? 4.5 : 3) : kind === 'block' ? (rand() < 0.5 ? 3 : 2.25) : 2.25;
            const w = Math.min(wide, lx1 - x);
            if (w < 1.8) break;
            const h = kind === 'tower' ? 9 + rand() * 9 : kind === 'block' ? 3.2 + rand() * 3 : kind === 'hall' ? 2.4 + rand() * 1.4 : 2 + rand() * 0.8;
            const bxc = x + w / 2, bzc = (row.z0 + row.z1) / 2;
            addShell(kind, bxc, bzc, w - 0.08, row.z1 - row.z0, h, row.face, Math.floor(rand() * 1e9));
            // a named place here?
            const queue = placeQueue.get(district);
            const want = queue && queue.length && rand() < 0.42;
            if (want) {
              const idx = queue.findIndex((p) => p.kind === kind) >= 0 ? queue.findIndex((p) => p.kind === kind) : 0;
              const p = queue.splice(idx, 1)[0];
              const doorZ = row.face === 'up' ? row.z0 - 1.6 : row.z1 + 1.6;
              this.places.push({ id: 'tx-' + this.places.length, name: p.name, type: p.type, emoji: p.emoji, x: bxc, z: doorZ, district });
              const sz = row.face === 'up' ? row.z0 - 0.06 : row.z1 + 0.06;
              named.push({ name: p.name, emoji: p.emoji, hue: Math.floor(rand() * 360), x: bxc, y: CURB + 2.45, z: sz, rotY: row.face === 'up' ? Math.PI : 0, w: Math.max(2.6, w * 1.05) });
            }
            x += w;
          }
        }
        // suburbs and parkside: a few trees on the land behind
        if (district === 'suburbs' || district === 'parkside' || district === 'campus') for (let i = 0; i < 2; i++) treeSpots.push({ x: lx0 + 1 + rand() * (lx1 - lx0 - 2), z: cz + (rand() - 0.5) * 0.4, s: 0.7 + rand() * 0.4, kind: Math.floor(rand() * 2) });
      }
    }
    // any place still waiting gets a stand-alone kiosk on a free pavement corner of its district
    for (const [district, queue] of placeQueue) {
      for (const p of queue) {
        const spot = this.findKiosk(district, rand);
        if (!spot) continue;
        addShell('house', spot.x, spot.z, 2.2, 2.2, 2.2, 'down', Math.floor(rand() * 1e9));
        this.places.push({ id: 'tx-' + this.places.length, name: p.name, type: p.type, emoji: p.emoji, x: spot.x, z: spot.z + 2.8, district });
        named.push({ name: p.name, emoji: p.emoji, hue: Math.floor(rand() * 360), x: spot.x, y: CURB + 2.6, z: spot.z + 1.16, rotY: 0, w: 2.8 });
      }
    }

    flush(ground, this.group, false);
    for (const { kit, variation, geos } of buildings.values()) {
      const mat = kitMaterial(kit, { variation, litWindows: true });
      for (const merged of mergeByCell(geos, 160)) {
        const mesh = new Mesh(merged, mat);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.matrixAutoUpdate = false;
        this.group.add(mesh);
      }
      geos.forEach((g) => g.dispose());
    }

    /* ---- signs over every new door ---- */
    const atlas = signAtlas(named);
    const signMat = new MeshStandardMaterial({ map: atlas, emissiveMap: atlas, emissive: new Color('#ffffff'), emissiveIntensity: 0.55, roughness: 0.4, side: DoubleSide });
    const geos = named.map((n, i) => signQuad(i, n.w, n.x, n.y, n.z, n.rotY));
    if (geos.length) {
      const merged = mergeGeometries(geos, false);
      geos.forEach((g) => g.dispose());
      if (merged) this.group.add(new Mesh(merged, signMat));
    }

    /* ---- trees and lamps ---- */
    const dummy = new Object3D();
    const variations = variationCount('suburban');
    const byKind = new Map<string, typeof treeSpots>();
    for (const s of treeSpots) { const key = `${s.kind}|${Math.floor(rand() * variations)}`; const l = byKind.get(key) ?? []; l.push(s); byKind.set(key, l); }
    for (const [key, list] of byKind) {
      const [which, variation] = key.split('|').map(Number);
      const tm = new InstancedMesh(localGeometry(model('suburban', TREES[which])), kitMaterial('suburban', { variation }), list.length);
      tm.castShadow = true;
      list.forEach((s, i) => { dummy.position.set(s.x, CURB, s.z); dummy.scale.setScalar(s.s * 2.7); dummy.rotation.set(0, rand() * 6.28, 0); dummy.updateMatrix(); tm.setMatrixAt(i, dummy.matrix); });
      this.group.add(tm);
    }
    const lampModel = model('roads', 'light-curved');
    const lamps = new InstancedMesh(localGeometry(lampModel, 'origin'), kitMaterial('roads', { glow: 'lamp' }), lampSpots.length);
    lampSpots.forEach((s, i) => { dummy.position.set(s.x, CURB, s.z); dummy.scale.setScalar(2.1); dummy.rotation.set(0, s.rot, 0); dummy.updateMatrix(); lamps.setMatrixAt(i, dummy.matrix); });
    lamps.castShadow = true;
    this.group.add(lamps);

    /* ---- the sea, east of the harbour ---- */
    const sea = new Mesh(new PlaneGeometry(400, 900).rotateX(-Math.PI / 2), new MeshStandardMaterial({ color: '#2f8fc4', roughness: 0.08, metalness: 0.25, envMapIntensity: 1.4 }));
    sea.position.set(MAX_X + 200 - 2, -0.25, (MIN_Z + MAX_Z) / 2);
    sea.receiveShadow = true;
    this.group.add(sea);

    /* ---- the highway ---- */
    this.buildHighway();

    /* ---- quiz traffic lights ---- */
    this.buildLights(rand);
  }

  /**
   * Highway 1: six lanes, three each way, a concrete median barrier, steel
   * guard rails, overhead gantries with green signs, and lamp posts on the
   * median. The avenues meet it at grade, so a taxi can swing on and off.
   */
  private buildHighway(): void {
    const bag: Bag = new Map();
    const asphalt = mat(PALETTE.asphalt, { map: 'asphalt' });
    const white = new MeshBasicMaterial({ color: PALETTE.laneMark });
    const yellow = new MeshBasicMaterial({ color: '#f2c230' });
    const concrete = mat('#b9b6ad', { roughness: 0.88 });
    const steel = mat('#a7aeb5', { roughness: 0.35, metalness: 0.85 });
    const dark = mat('#2c3036', { roughness: 0.5, metalness: 0.5 });
    const x0 = MIN_X, x1 = MAX_X, w = x1 - x0, cx = (x0 + x1) / 2;
    slab(bag, 'asphalt', asphalt, w, 0.18, HWY_W, cx, -0.09, HWY_Z0 + HWY_W / 2);
    // links from the last street down to the highway are the avenues themselves (built above)
    const north = HWY_Z0 + HWY_SHOULDER, south = HWY_Z0 + HWY_W - HWY_SHOULDER;
    const medN = HWY_MID - HWY_MEDIAN / 2 - HWY_GAP, medS = HWY_MID + HWY_MEDIAN / 2 + HWY_GAP;
    const onAvenue = (x: number) => avenueColumn(Math.floor(x));
    // edge lines (solid white outside, solid yellow along the median)
    for (const [z, m, key] of [[north, white, 'w'], [south, white, 'w'], [medN, yellow, 'y'], [medS, yellow, 'y']] as const) {
      slab(bag, 'mark-' + key, m, w, 0.012, 0.16, cx, 0.012, z, false);
    }
    // dashed lane dividers
    for (let i = 1; i < 3; i++) {
      for (const z of [north + HWY_LANE * i, medS + HWY_LANE * i]) {
        for (let x = x0 + 2; x < x1 - 2; x += 9) if (!onAvenue(x)) slab(bag, 'mark-w', white, 3.2, 0.012, 0.14, x, 0.012, z, false);
      }
    }
    // the median barrier (New Jersey profile, approximated in two steps) with gaps at the avenues
    let runStart: number | null = null;
    const flushRun = (a: number, b: number) => {
      if (b - a < 0.5) return;
      slab(bag, 'concrete', concrete, b - a, 0.32, HWY_MEDIAN, (a + b) / 2, 0.16, HWY_MID);
      slab(bag, 'concrete', concrete, b - a, 0.55, HWY_MEDIAN * 0.45, (a + b) / 2, 0.6, HWY_MID);
    };
    for (let x = x0; x <= x1; x += 1) {
      const gap = onAvenue(x) || x === x1;
      if (!gap && runStart === null) runStart = x;
      if (gap && runStart !== null) { flushRun(runStart, x); runStart = null; }
    }
    // guard rails: continuous on the south edge, cut for the avenues on the north edge
    const rail = (a: number, b: number, z: number) => {
      if (b - a < 1) return;
      slab(bag, 'steel', steel, b - a, 0.32, 0.08, (a + b) / 2, 0.62, z);
      for (let x = a + 0.5; x < b; x += 3) slab(bag, 'dark', dark, 0.12, 0.7, 0.12, x, 0.35, z + (z > HWY_MID ? 0.12 : -0.12));
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
      slab(bag, 'steel', steel, 0.16, 7, 0.16, x, 3.5, HWY_MID);
      slab(bag, 'steel', steel, 0.1, 0.1, 3.2, x, 6.95, HWY_MID);
      slab(bag, 'lamp', mat('#fff6dc', { glow: 'lamp', roughness: 0.3 }), 0.5, 0.12, 0.3, x, 6.85, HWY_MID - 1.55);
      slab(bag, 'lamp', mat('#fff6dc', { glow: 'lamp', roughness: 0.3 }), 0.5, 0.12, 0.3, x, 6.85, HWY_MID + 1.55);
    }
    flush(bag, this.group, true);

    // overhead gantries with green signs, both directions
    const signs: { text: string; sub: string; x: number; z: number; rot: number }[] = [];
    const DEST_W = [['DOWNTOWN', 'Next exit · 1 km'], ['OLD TOWN', 'Exit 9 · keep left'], ['STADIUM', 'Exit 7 · 2 km'], ['AIRPORT', 'Exit 4 · 5 km']];
    const DEST_E = [['HARBOUR', 'Next exit · 1 km'], ['BEACH', 'Exit 12 · 3 km'], ['UNIVERSITY', 'Exit 14 · 2 km'], ['TECH PARK', 'Exit 15 · 4 km']];
    const gBag: Bag = new Map();
    let gi = 0;
    for (let k = K_MIN; k < K_MAX; k += 3) {
      const x = VX(k) + ROAD_W + 9;
      // two posts and a truss beam across all six lanes
      for (const z of [HWY_Z0 + 0.3, HWY_Z0 + HWY_W - 0.3]) slab(gBag, 'steel', steel, 0.3, 7.2, 0.3, x, 3.6, z);
      slab(gBag, 'steel', steel, 0.22, 0.22, HWY_W, x, 7.1, HWY_Z0 + HWY_W / 2);
      slab(gBag, 'steel', steel, 0.22, 0.22, HWY_W, x, 6.3, HWY_Z0 + HWY_W / 2);
      for (let z = HWY_Z0; z < HWY_Z0 + HWY_W; z += 1.2) slab(gBag, 'steel', steel, 0.08, 0.85, 0.08, x, 6.7, z);
      const [wt, ws] = DEST_W[gi % DEST_W.length], [et, es] = DEST_E[gi % DEST_E.length];
      signs.push({ text: '◀ ' + wt, sub: ws, x: x + 0.18, z: (HWY_Z0 + medN) / 2, rot: Math.PI / 2 });
      signs.push({ text: et + ' ▶', sub: es, x: x - 0.18, z: (medS + HWY_Z0 + HWY_W) / 2, rot: -Math.PI / 2 });
      gi++;
    }
    flush(gBag, this.group, true);
    const backMat = new MeshStandardMaterial({ color: '#5d6b63', roughness: 0.6, metalness: 0.4 });
    for (const sg of signs) {
      const cv = document.createElement('canvas'); cv.width = 512; cv.height = 200;
      const c = cv.getContext('2d')!;
      c.fillStyle = '#0d6b3c'; c.fillRect(0, 0, 512, 200);
      c.strokeStyle = '#ffffff'; c.lineWidth = 8; c.strokeRect(10, 10, 492, 180);
      c.fillStyle = '#ffffff'; c.textAlign = 'center'; c.textBaseline = 'middle';
      c.font = '700 26px "Arial Narrow",Arial,sans-serif'; c.fillText('HIGHWAY 1', 256, 42);
      c.font = '900 64px "Arial Narrow",Arial,sans-serif'; c.fillText(sg.text, 256, 104, 470);
      c.font = '700 28px Arial,sans-serif'; c.fillText(sg.sub, 256, 160, 470);
      const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; t.anisotropy = 8;
      const m = new MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new Color('#ffffff'), emissiveIntensity: 0.35, roughness: 0.5 });
      const sign = new Mesh(new PlaneGeometry(7.2, 2.8), m);
      sign.position.set(sg.x, 6.7, sg.z);
      sign.rotation.y = sg.rot;
      // the back of the panel: plain green-grey, not the text mirrored
      const back = new Mesh(new PlaneGeometry(7.2, 2.8), backMat);
      back.position.copy(sign.position);
      back.rotation.y = sg.rot + Math.PI;
      this.group.add(sign, back);
    }
  }

  private findKiosk(district: District, rand: () => number): { x: number; z: number } | null {
    for (let tries = 0; tries < 200; tries++) {
      const k = K_MIN + Math.floor(rand() * (K_MAX - K_MIN)), j = J_MIN + Math.floor(rand() * (J_MAX - J_MIN));
      const cx = (VX(k) + ROAD_W + VX(k + 1)) / 2, cz = (HZ(j) + ROAD_W + HZ(j + 1)) / 2;
      if (inOriginal(cx, cz)) continue;
      const dx = cx < 0 ? -1 : cx > GW ? 1 : 0, dz = cz < 0 ? -1 : cz > GH ? 1 : 0;
      if (DISTRICT_OF(dx, dz) !== district) continue;
      return { x: VX(k) + ROAD_W + SW + 1.3 + rand() * 2, z: HZ(j + 1) - SW - 3.4 - 1.1 };
    }
    return null;
  }

  /**
   * The quiz lights, modelled properly: a concrete footing, a tapered
   * galvanised pole with a braced mast arm over the road, two double-faced
   * signal heads with yellow-bordered backplates, three lenses each under
   * their visors, and a push-button box for pedestrians. Two poles per
   * junction — one arm over the avenue, one over the street — so the light is
   * in front of the taxi whichever way it comes. Static steel is merged across
   * the whole city; only the lenses are per light, so they can change.
   */
  private buildLights(rand: () => number): void {
    const galv = new MeshStandardMaterial({ color: '#8f969d', metalness: 0.85, roughness: 0.36 });
    const black = new MeshStandardMaterial({ color: '#15171a', metalness: 0.25, roughness: 0.5 });
    const concrete = mat('#a9a69e', { roughness: 0.9 });
    const plateTex = (() => {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 256;
      const c = cv.getContext('2d')!;
      c.fillStyle = '#111214'; c.fillRect(0, 0, 128, 256);
      c.strokeStyle = '#ffd21a'; c.lineWidth = 12; c.strokeRect(6, 6, 116, 244);
      const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; return t;
    })();
    const plate = new MeshStandardMaterial({ map: plateTex, roughness: 0.55, emissiveMap: plateTex, emissive: new Color('#ffffff'), emissiveIntensity: 0.08 });
    const statics = new Map<MeshStandardMaterial, BufferGeometry[]>();
    const put = (m: MeshStandardMaterial, g: BufferGeometry) => { const l = statics.get(m) ?? []; l.push(g); statics.set(m, l); };
    const badgeTex = (() => {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
      const c = cv.getContext('2d')!;
      c.fillStyle = '#ffd21f'; c.beginPath(); c.arc(64, 64, 58, 0, Math.PI * 2); c.fill();
      c.lineWidth = 8; c.strokeStyle = '#1b1035'; c.stroke();
      c.fillStyle = '#1b1035'; c.font = '900 84px "Trebuchet MS",Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 64, 70);
      const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; return t;
    })();
    const Y0 = CURB;
    let id = 0;
    for (const n of this.nodes) {
      // about one junction in four, never two side by side
      if (mod(n.k * 3 + n.j * 2, 4) !== 0) continue;
      if (inOriginal(n.x, n.z)) continue;
      const g = new Group();
      const lampR = new MeshStandardMaterial({ color: '#3a0a08', emissive: new Color('#ff2a1a'), emissiveIntensity: 0.05, roughness: 0.15 });
      const lampY = new MeshStandardMaterial({ color: '#3a2a06', emissive: new Color('#ffb21a'), emissiveIntensity: 0.05, roughness: 0.15 });
      const lampG = new MeshStandardMaterial({ color: '#06301a', emissive: new Color('#2bff8a'), emissiveIntensity: 2.6, roughness: 0.15 });
      const lenses = new Map<MeshStandardMaterial, BufferGeometry[]>([[lampR, []], [lampY, []], [lampG, []]]);
      // pole at a corner; the arm reaches along `d` over the road; lenses face ±`f`
      const poles: { px: number; pz: number; dx: number; dz: number }[] = [
        { px: n.x + ROAD_W / 2 + 0.8, pz: n.z - ROAD_W / 2 - 0.8, dx: -1, dz: 0 },
        { px: n.x - ROAD_W / 2 - 0.8, pz: n.z + ROAD_W / 2 + 0.8, dx: 0, dz: -1 },
      ];
      for (const { px, pz, dx, dz } of poles) {
        const yaw = Math.atan2(dx, dz); // the arm's direction
        const at = (along: number, y: number, side = 0) => [px + dx * along + dz * side, Y0 + y, pz + dz * along - dx * side] as const;
        put(concrete, new CylinderGeometry(0.28, 0.34, 0.3, 18).translate(px, Y0 + 0.15, pz));
        put(galv, new CylinderGeometry(0.2, 0.22, 0.06, 18).translate(px, Y0 + 0.33, pz));
        put(galv, new CylinderGeometry(0.1, 0.14, 5.5, 18).translate(px, Y0 + 3.05, pz));
        put(galv, new SphereGeometry(0.115, 14, 8).translate(px, Y0 + 5.8, pz));
        // the mast arm and its brace
        const armL = 4.9;
        const arm = new CylinderGeometry(0.055, 0.09, armL, 14).rotateX(Math.PI / 2).rotateY(yaw);
        put(galv, arm.translate(...at(armL / 2, 5.45)));
        const braceL = Math.hypot(1.7, 0.9);
        const brace = new CylinderGeometry(0.035, 0.035, braceL, 10).rotateX(Math.PI / 2 - Math.atan2(0.9, 1.7)).rotateY(yaw);
        put(galv, brace.translate(...at(0.85, 5.0)));
        // pedestrian push-button box
        put(black, new BoxGeometry(0.2, 0.3, 0.16).rotateY(yaw).translate(...at(-0.17, 1.35)));
        // two signal heads on the arm, double-faced (one side for each direction)
        for (const along of [2.5, 4.2]) {
          const [hx, hy, hz] = at(along, 4.5);
          put(galv, new CylinderGeometry(0.03, 0.03, 0.4, 8).translate(hx, hy + 0.75, hz));
          put(black, new BoxGeometry(0.4, 1.12, 0.5).rotateY(yaw + Math.PI / 2).translate(hx, hy, hz));
          put(plate, new BoxGeometry(0.66, 1.44, 0.03).rotateY(yaw + Math.PI / 2).translate(hx, hy, hz));
          for (const side of [-1, 1]) {
            for (const [m, dy] of [[lampR, 0.34], [lampY, 0], [lampG, -0.34]] as const) {
              // lens: a shallow disc facing out of the head; visor: half a tube over it
              const lens = new CylinderGeometry(0.125, 0.125, 0.03, 24).rotateX(Math.PI / 2).rotateY(yaw + Math.PI / 2);
              const [lx, ly, lz] = at(along, 4.5 + dy, side * 0.26);
              lenses.get(m)!.push(lens.translate(lx, ly, lz));
              const visor = new CylinderGeometry(0.15, 0.15, 0.22, 18, 1, true, Math.PI / 2, Math.PI).rotateX(Math.PI / 2).rotateY(yaw + Math.PI / 2);
              const [vx, vy, vz] = at(along, 4.5 + dy, side * 0.37);
              put(black, visor.translate(vx, vy, vz));
            }
          }
        }
      }
      for (const [m, list] of lenses) {
        const merged = mergeGeometries(list, false);
        list.forEach((x) => x.dispose());
        if (merged) g.add(new Mesh(merged, m));
      }
      const badge = new Sprite(new SpriteMaterial({ map: badgeTex, depthTest: true }));
      badge.scale.set(2.2, 2.2, 1);
      badge.position.set(n.x, 7.2, n.z);
      g.add(badge);
      this.group.add(g);
      this.lights.push({ id: id++, x: n.x, z: n.z, red: rand() < 0.5, timer: 2 + rand() * 7, hold: 0, cleared: false, lampR, lampG, badge });
    }
    for (const [m, list] of statics) {
      for (const merged of mergeByCell(list.map((g) => (g.index ? g.toNonIndexed() : g)), 400)) {
        const mesh = new Mesh(merged, m);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        this.group.add(mesh);
      }
      list.forEach((g) => g.dispose());
    }
  }
}
