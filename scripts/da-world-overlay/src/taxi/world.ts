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
export const MAX_Z = HZ(J_MAX) + ROAD_W + 13;
const SW = 3; // pavement width

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

function flush(bag: Bag, parent: Group, shadows = true): void {
  for (const { mat: m, geos } of bag.values()) {
    if (!geos.length) continue;
    // merge in chunks so one buffer never gets enormous
    for (let i = 0; i < geos.length; i += 400) {
      const merged = mergeGeometries(geos.slice(i, i + 400), false);
      if (!merged) continue;
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
        const ok = inOriginal(x, z) ? isRoad(x, z) || isSidewalk(x, z) : gridRoad(x, z) || gridSidewalk(x, z);
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
        const za = j < J_MIN ? MIN_Z : HZ(j) + ROAD_W, zb = j >= J_MAX ? MAX_Z : HZ(j + 1);
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
      for (let i = 0; i < geos.length; i += 120) {
        const merged = mergeGeometries(geos.slice(i, i + 120), false);
        if (!merged) continue;
        const mesh = new Mesh(merged, kitMaterial(kit, { variation, litWindows: true }));
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

    /* ---- quiz traffic lights ---- */
    this.buildLights(rand);
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

  private buildLights(rand: () => number): void {
    const poleGeo = new CylinderGeometry(0.09, 0.11, 5.2, 10);
    const armGeo = new BoxGeometry(0.12, 0.12, 3.2);
    const headGeo = new BoxGeometry(0.5, 1.25, 0.42);
    const lampGeo = new SphereGeometry(0.15, 14, 10);
    const metal = mat('#2f343c', { roughness: 0.4, metalness: 0.6 });
    const housing = mat('#1c1f24', { roughness: 0.5, metalness: 0.3 });
    const badgeTex = (() => {
      const cv = document.createElement('canvas'); cv.width = 128; cv.height = 128;
      const c = cv.getContext('2d')!;
      c.fillStyle = '#ffd21f'; c.beginPath(); c.arc(64, 64, 58, 0, Math.PI * 2); c.fill();
      c.lineWidth = 8; c.strokeStyle = '#1b1035'; c.stroke();
      c.fillStyle = '#1b1035'; c.font = '900 84px "Trebuchet MS",Arial'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('?', 64, 70);
      const t = new CanvasTexture(cv); t.colorSpace = SRGBColorSpace; return t;
    })();
    let id = 0;
    for (const n of this.nodes) {
      // about one junction in four, never two side by side
      if (mod(n.k * 3 + n.j * 2, 4) !== 0) continue;
      const g = new Group();
      const px = n.x + ROAD_W / 2 + 0.6, pz = n.z - ROAD_W / 2 - 0.6;
      const pole = new Mesh(poleGeo, metal); pole.position.set(px, 2.6, pz); pole.castShadow = true;
      const arm = new Mesh(armGeo, metal); arm.position.set(px - 1.5, 5.1, pz); arm.rotation.y = Math.PI / 2;
      const head = new Mesh(headGeo, housing); head.position.set(px - 2.9, 4.5, pz); head.castShadow = true;
      const lampR = new MeshStandardMaterial({ color: '#4a0d0d', emissive: new Color('#ff2a1a'), emissiveIntensity: 0.05, roughness: 0.3 });
      const lampG = new MeshStandardMaterial({ color: '#0d3a14', emissive: new Color('#2bff6a'), emissiveIntensity: 2.6, roughness: 0.3 });
      for (const [m, dy] of [[lampR, 0.36], [lampG, -0.36]] as const) {
        for (const s of [-1, 1]) {
          const l = new Mesh(lampGeo, m); l.position.set(px - 2.9, 4.5 + dy, pz + s * 0.22); l.scale.set(1, 1, 0.5); g.add(l);
        }
      }
      const badge = new Sprite(new SpriteMaterial({ map: badgeTex, depthTest: true }));
      badge.scale.set(2.2, 2.2, 1);
      badge.position.set(n.x, 6.6, n.z);
      g.add(pole, arm, head, badge);
      this.group.add(g);
      this.lights.push({ id: id++, x: n.x, z: n.z, red: rand() < 0.5, timer: 2 + rand() * 7, hold: 0, cleared: false, lampR, lampG, badge });
    }
  }
}
