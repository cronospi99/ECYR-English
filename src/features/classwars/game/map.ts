/* Class Wars — the lawn arena. Generated from a seed so every device builds the same map
   (only the seed travels over the network), plus collision helpers shared by the host
   simulation and the clients' movement prediction. */
import { PLAYER_R, WORLD_H, WORLD_W, rng } from './constants';

export type PropKind =
  | 'tree' | 'pine' | 'bush' | 'pot' | 'rock' | 'crate' | 'barrel' | 'bench' | 'fenceH' | 'fenceV'
  | 'clover' | 'flowers' | 'stump' | 'mushroom' | 'lamp';

export interface Prop { k: PropKind; x: number; y: number; v: number; s: number }
/** c = circle, r = box (half sizes), e = ellipse (ponds). tall = blocks projectiles. */
export interface Collider { t: 'c' | 'r' | 'e'; x: number; y: number; r: number; hw: number; hh: number; tall: boolean }
export interface Pond { x: number; y: number; rx: number; ry: number; wob: number[] }
export interface Path { pts: [number, number][]; w: number }
export interface Burrow { id: number; x: number; y: number }

export interface GameMap {
  seed: number;
  w: number;
  h: number;
  props: Prop[]; // drawn, y-sorted when tall
  colliders: Collider[];
  ponds: Pond[];
  paths: Path[];
  burrows: Burrow[];
  bushes: { x: number; y: number; r: number }[];
  grid: Map<number, number[]>;
}

export const EDGE = 46; // hedge thickness around the world
const CELL = 128;
const key = (cx: number, cy: number) => cy * 1000 + cx;

/** Which props are solid, with their collider and visual footprint. */
export const PROP_INFO: Record<PropKind, { solid: boolean; tall: boolean; r?: number; hw?: number; hh?: number; flat?: boolean }> = {
  tree: { solid: true, tall: true, r: 24 },
  pine: { solid: true, tall: true, r: 20 },
  bush: { solid: false, tall: false },
  pot: { solid: true, tall: true, r: 17 },
  rock: { solid: true, tall: true, r: 30 },
  crate: { solid: true, tall: true, hw: 29, hh: 24 },
  barrel: { solid: true, tall: true, r: 21 },
  bench: { solid: true, tall: false, hw: 50, hh: 15 },
  fenceH: { solid: true, tall: true, hw: 34, hh: 7 },
  fenceV: { solid: true, tall: true, hw: 7, hh: 34 },
  clover: { solid: false, tall: false, flat: true },
  flowers: { solid: false, tall: false, flat: true },
  stump: { solid: true, tall: true, r: 20 },
  mushroom: { solid: false, tall: false, flat: true },
  lamp: { solid: true, tall: true, r: 10 },
};

function distToSeg(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax, dy = by - ay;
  const l2 = dx * dx + dy * dy || 1;
  let t = ((px - ax) * dx + (py - ay) * dy) / l2;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = ax + dx * t - px, y = ay + dy * t - py;
  return Math.sqrt(x * x + y * y);
}

export function distToPath(p: Path, x: number, y: number) {
  let d = Infinity;
  for (let i = 1; i < p.pts.length; i++) d = Math.min(d, distToSeg(x, y, p.pts[i - 1][0], p.pts[i - 1][1], p.pts[i][0], p.pts[i][1]));
  return d;
}

export function generateMap(seed: number, portals = 7): GameMap {
  const R = rng(seed);
  const W = WORLD_W, H = WORLD_H;
  const rr = (a: number, b: number) => a + R() * (b - a);
  const map: GameMap = { seed, w: W, h: H, props: [], colliders: [], ponds: [], paths: [], burrows: [], bushes: [], grid: new Map() };

  // Portals (spawn + teleport tunnels): corners, sides and the centre plaza; bigger matches get
  // more of them, between those, so nobody is far from one.
  const spots: [number, number][] = [
    [0.13, 0.16], [0.5, 0.12], [0.87, 0.16], [0.12, 0.84], [0.5, 0.88], [0.88, 0.84], [0.5, 0.5],
    [0.29, 0.33], [0.71, 0.67], [0.71, 0.33], [0.29, 0.67], [0.08, 0.5], [0.92, 0.5], [0.31, 0.1], [0.69, 0.9], [0.69, 0.1], [0.31, 0.9],
  ];
  spots.slice(0, Math.max(7, Math.min(spots.length, portals))).forEach(([fx, fy], i) => {
    const x = fx * W + (i === 6 ? 0 : rr(-60, 60)), y = fy * H + (i === 6 ? 0 : rr(-40, 40));
    map.burrows.push({ id: i, x, y });
  });

  // Dirt paths from the plaza to some burrows (curvy polylines).
  const c = map.burrows[6];
  for (const i of [0, 2, 3, 5, 1]) {
    const b = map.burrows[i];
    const pts: [number, number][] = [];
    const nx = -(b.y - c.y), ny = b.x - c.x;
    const nl = Math.hypot(nx, ny) || 1;
    const bend = rr(-0.22, 0.22) * Math.hypot(b.x - c.x, b.y - c.y);
    const steps = 14;
    for (let s = 0; s <= steps; s++) {
      const t = s / steps;
      const k = Math.sin(t * Math.PI) * bend;
      pts.push([c.x + (b.x - c.x) * t + (nx / nl) * k, c.y + (b.y - c.y) * t + (ny / nl) * k]);
    }
    map.paths.push({ pts, w: rr(54, 70) });
  }

  // Occupancy for spacing (x, y, radius).
  const occ: [number, number, number][] = [];
  const clearOf = (x: number, y: number, r: number, gap: number) => {
    if (x < EDGE + r + 30 || y < EDGE + r + 30 || x > W - EDGE - r - 30 || y > H - EDGE - r - 30) return false;
    for (const b of map.burrows) if (Math.hypot(b.x - x, b.y - y) < 150 + r) return false;
    for (const p of map.paths) if (distToPath(p, x, y) < p.w / 2 + r + 8) return false;
    for (const pd of map.ponds) if (((x - pd.x) / (pd.rx + r + gap)) ** 2 + ((y - pd.y) / (pd.ry + r + gap)) ** 2 < 1) return false;
    for (const [ox, oy, or] of occ) if (Math.hypot(ox - x, oy - y) < or + r + gap) return false;
    return true;
  };

  // Ponds.
  for (let n = 0, tries = 0; n < 3 && tries < 200; tries++) {
    const rx = rr(120, 190), ry = rr(80, 125);
    const x = rr(300, W - 300), y = rr(300, H - 300);
    if (!clearOf(x, y, Math.max(rx, ry), 60)) continue;
    map.ponds.push({ x, y, rx, ry, wob: Array.from({ length: 12 }, () => rr(0.9, 1.08)) });
    n++;
  }

  const place = (k: PropKind, x: number, y: number, gap: number, v = 0, s = 1) => {
    const info = PROP_INFO[k];
    const r = (info.r ?? Math.max(info.hw ?? 20, info.hh ?? 20)) * s;
    if (info.solid && !clearOf(x, y, r, gap)) return false;
    if (!info.solid && (x < EDGE + 30 || y < EDGE + 30 || x > W - EDGE - 30 || y > H - EDGE - 30)) return false;
    map.props.push({ k, x, y, v, s });
    if (info.solid) occ.push([x, y, r]);
    return true;
  };
  const tryPlace = (k: PropKind, n: number, gap: number, area?: [number, number, number]) => {
    let placed = 0;
    for (let t = 0; t < n * 30 && placed < n; t++) {
      const x = area ? area[0] + rr(-area[2], area[2]) : rr(EDGE, W - EDGE);
      const y = area ? area[1] + rr(-area[2], area[2]) : rr(EDGE, H - EDGE);
      if (place(k, x, y, gap, Math.floor(R() * 3), rr(0.9, 1.12))) placed++;
    }
    return placed;
  };

  // Groves: trees with bushes, pots and flowers around them.
  for (let g = 0; g < 13; g++) {
    const gx = rr(200, W - 200), gy = rr(200, H - 200);
    if (!clearOf(gx, gy, 40, 40)) continue;
    tryPlace(R() < 0.7 ? 'tree' : 'pine', 2 + Math.floor(R() * 3), 46, [gx, gy, 170]);
    tryPlace('pot', R() < 0.6 ? 1 : 0, 40, [gx, gy, 150]);
    tryPlace('stump', R() < 0.3 ? 1 : 0, 46, [gx, gy, 170]);
  }
  tryPlace('tree', 10, 60);
  tryPlace('rock', 20, 54);
  // Crate / barrel piles.
  for (let g = 0; g < 8; g++) {
    const gx = rr(240, W - 240), gy = rr(240, H - 240);
    tryPlace('crate', 1 + Math.floor(R() * 2), 6, [gx, gy, 70]);
    tryPlace('barrel', 1 + Math.floor(R() * 2), 6, [gx, gy, 80]);
  }
  // Benches and lamps beside the paths.
  for (const p of map.paths) {
    for (let i = 3; i < p.pts.length - 2; i += 4 + Math.floor(R() * 3)) {
      const [ax, ay] = p.pts[i - 1], [bx, by] = p.pts[i];
      const dx = bx - ax, dy = by - ay, l = Math.hypot(dx, dy) || 1;
      const side = R() < 0.5 ? -1 : 1;
      const off = p.w / 2 + 34;
      const x = bx + (-dy / l) * off * side, y = by + (dx / l) * off * side;
      if (R() < 0.55) place('bench', x, y, 30); else place('lamp', x, y, 40);
    }
  }
  // Fence runs.
  for (let f = 0; f < 7; f++) {
    const horiz = R() < 0.55;
    const n = 3 + Math.floor(R() * 4);
    const x0 = rr(260, W - 260 - (horiz ? n * 68 : 0)), y0 = rr(260, H - 260 - (horiz ? 0 : n * 68));
    let ok = true;
    for (let i = 0; i < n && ok; i++) if (!clearOf(horiz ? x0 + i * 68 : x0, horiz ? y0 : y0 + i * 68, 36, 26)) ok = false;
    if (!ok) continue;
    for (let i = 0; i < n; i++) place(horiz ? 'fenceH' : 'fenceV', horiz ? x0 + i * 68 : x0, horiz ? y0 : y0 + i * 68, -80);
  }
  tryPlace('pot', 12, 70);
  tryPlace('barrel', 4, 60);
  // Bushes (walk-through hiding spots).
  for (let t = 0; t < 400 && map.bushes.length < 34; t++) {
    const x = rr(EDGE + 40, W - EDGE - 40), y = rr(EDGE + 40, H - EDGE - 40);
    if (!clearOf(x, y, 34, 10)) continue;
    if (map.bushes.some((b) => Math.hypot(b.x - x, b.y - y) < 90)) continue;
    const s = rr(0.9, 1.25);
    map.bushes.push({ x, y, r: 34 * s });
    map.props.push({ k: 'bush', x, y, v: Math.floor(R() * 3), s });
  }
  // Flat decoration.
  for (let i = 0; i < 70; i++) map.props.push({ k: R() < 0.45 ? 'clover' : R() < 0.85 ? 'flowers' : 'mushroom', x: rr(EDGE + 20, W - EDGE - 20), y: rr(EDGE + 20, H - EDGE - 20), v: Math.floor(R() * 4), s: rr(0.8, 1.2) });

  // Colliders.
  for (const p of map.props) {
    const info = PROP_INFO[p.k];
    if (!info.solid) continue;
    if (info.r) map.colliders.push({ t: 'c', x: p.x, y: p.y, r: info.r * p.s, hw: 0, hh: 0, tall: info.tall });
    else map.colliders.push({ t: 'r', x: p.x, y: p.y, r: 0, hw: info.hw ?? 20, hh: info.hh ?? 20, tall: info.tall });
  }
  for (const pd of map.ponds) map.colliders.push({ t: 'e', x: pd.x, y: pd.y, r: 0, hw: pd.rx * 0.94, hh: pd.ry * 0.92, tall: false });

  map.colliders.forEach((c2, i) => {
    const ex = c2.t === 'c' ? c2.r : c2.hw, ey = c2.t === 'c' ? c2.r : c2.hh;
    for (let cx = Math.floor((c2.x - ex - PLAYER_R) / CELL); cx <= Math.floor((c2.x + ex + PLAYER_R) / CELL); cx++)
      for (let cy = Math.floor((c2.y - ey - PLAYER_R) / CELL); cy <= Math.floor((c2.y + ey + PLAYER_R) / CELL); cy++) {
        const k = key(cx, cy);
        const arr = map.grid.get(k);
        if (arr) arr.push(i); else map.grid.set(k, [i]);
      }
  });
  return map;
}

function near(map: GameMap, x: number, y: number): number[] {
  return map.grid.get(key(Math.floor(x / CELL), Math.floor(y / CELL))) ?? [];
}

/** Push a circle out of every solid collider and keep it inside the hedge. */
export function resolve(map: GameMap, x: number, y: number, r = PLAYER_R): [number, number] {
  for (let it = 0; it < 3; it++) {
    let moved = false;
    for (const i of near(map, x, y)) {
      const c = map.colliders[i];
      if (c.t === 'c') {
        const dx = x - c.x, dy = y - c.y, d = Math.hypot(dx, dy), m = c.r + r;
        if (d < m) {
          const k = d < 0.001 ? 1 : d;
          x = c.x + (dx / k) * m;
          y = c.y + (dy / k) * m;
          moved = true;
        }
      } else if (c.t === 'r') {
        const nx = Math.max(c.x - c.hw, Math.min(x, c.x + c.hw)), ny = Math.max(c.y - c.hh, Math.min(y, c.y + c.hh));
        const dx = x - nx, dy = y - ny, d = Math.hypot(dx, dy);
        if (d < r) {
          if (d > 0.001) {
            x = nx + (dx / d) * r;
            y = ny + (dy / d) * r;
          } else {
            // centre inside the box: leave by the nearest side
            const l = x - (c.x - c.hw), rt = c.x + c.hw - x, t = y - (c.y - c.hh), b = c.y + c.hh - y;
            const m = Math.min(l, rt, t, b);
            if (m === l) x = c.x - c.hw - r; else if (m === rt) x = c.x + c.hw + r; else if (m === t) y = c.y - c.hh - r; else y = c.y + c.hh + r;
          }
          moved = true;
        }
      } else {
        const ax = c.hw + r, ay = c.hh + r;
        const dx = x - c.x, dy = y - c.y;
        const d = (dx / ax) ** 2 + (dy / ay) ** 2;
        if (d < 1) {
          const s = 1 / Math.sqrt(Math.max(d, 0.0001));
          x = c.x + dx * s;
          y = c.y + dy * s;
          moved = true;
        }
      }
    }
    if (!moved) break;
  }
  const m = EDGE + r;
  x = x < m ? m : x > WORLD_W - m ? WORLD_W - m : x;
  y = y < m ? m : y > WORLD_H - m ? WORLD_H - m : y;
  return [x, y];
}

/** Move by (dx, dy) in small steps so fast movement cannot tunnel through props. */
export function moveCircle(map: GameMap, x: number, y: number, dx: number, dy: number, r = PLAYER_R): [number, number] {
  const dist = Math.hypot(dx, dy);
  const steps = Math.max(1, Math.ceil(dist / (r * 0.8)));
  for (let i = 0; i < steps; i++) [x, y] = resolve(map, x + dx / steps, y + dy / steps, r);
  return [x, y];
}

/** Does a projectile at (x, y) hit something tall (or leave the arena)? */
export function hitsWall(map: GameMap, x: number, y: number, r = 4): boolean {
  if (x < EDGE || y < EDGE || x > WORLD_W - EDGE || y > WORLD_H - EDGE) return true;
  for (const i of near(map, x, y)) {
    const c = map.colliders[i];
    if (!c.tall) continue;
    if (c.t === 'c') {
      if (Math.hypot(x - c.x, y - c.y) < c.r + r - 4) return true;
    } else if (c.t === 'r') {
      if (Math.abs(x - c.x) < c.hw + r - 2 && Math.abs(y - c.y) < c.hh + r - 2) return true;
    }
  }
  return false;
}

export function inBush(map: GameMap, x: number, y: number) {
  for (const b of map.bushes) if ((x - b.x) ** 2 + (y - b.y) ** 2 < (b.r * 0.85) ** 2) return true;
  return false;
}

/** A random free spot (not inside props, ponds or on a burrow). */
export function freeSpot(map: GameMap, rand: () => number, margin = 120): [number, number] {
  for (let t = 0; t < 80; t++) {
    const x = margin + rand() * (map.w - margin * 2), y = margin + rand() * (map.h - margin * 2);
    const [rx, ry] = resolve(map, x, y, 30);
    if (Math.hypot(rx - x, ry - y) > 1) continue;
    if (map.burrows.some((b) => Math.hypot(b.x - x, b.y - y) < 110)) continue;
    return [x, y];
  }
  return [map.w / 2 + 200, map.h / 2];
}
