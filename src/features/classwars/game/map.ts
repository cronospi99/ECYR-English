/* Class Wars — the lawn arena. Generated from a seed so every device builds the same map
   (only the seed travels over the network), plus collision helpers shared by the host
   simulation and the clients' movement prediction. */
import { KB_H, KB_W, PAINT_CELL, PLAYER_R, TILE, WORLD_H, WORLD_W, rng, sideView, type Game } from './constants';

export type PropKind =
  | 'tree' | 'pine' | 'bush' | 'pot' | 'rock' | 'crate' | 'barrel' | 'bench' | 'fenceH' | 'fenceV'
  | 'clover' | 'flowers' | 'stump' | 'mushroom' | 'lamp';

export interface Prop { k: PropKind; x: number; y: number; v: number; s: number }
/** c = circle, r = box (half sizes), e = ellipse (ponds). tall = blocks projectiles. */
export interface Collider { t: 'c' | 'r' | 'e'; x: number; y: number; r: number; hw: number; hh: number; tall: boolean }
export interface Pond { x: number; y: number; rx: number; ry: number; wob: number[] }
export interface Path { pts: [number, number][]; w: number }
export interface Burrow { id: number; x: number; y: number }

/** Knockback platform: solid blocks stop you from every side; thin ones (`thin`) only from above. */
export interface Plat { x: number; y: number; w: number; h: number; thin: boolean; v: number }

export interface GameMap {
  seed: number;
  kind: Game;
  /** Side-view platforms (empty on the lawn). */
  plats: Plat[];
  /** Color Clash: the block grid (1 = solid), TILE px per block. */
  tiles?: { cols: number; rows: number; grid: Uint8Array };
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

export function generateMap(seed: number, portals = 7, kind: Game = 'arena'): GameMap {
  if (kind === 'kb') return generateStage(seed);
  if (kind === 'paint') return generateBlocks(seed);
  const R = rng(seed);
  const W = WORLD_W, H = WORLD_H;
  const rr = (a: number, b: number) => a + R() * (b - a);
  const map: GameMap = { seed, kind, plats: [], w: W, h: H, props: [], colliders: [], ponds: [], paths: [], burrows: [], bushes: [], grid: new Map() };

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

  indexColliders(map);
  return map;
}

function indexColliders(map: GameMap) {
  map.colliders.forEach((c2, i) => {
    const ex = c2.t === 'c' ? c2.r : c2.hw, ey = c2.t === 'c' ? c2.r : c2.hh;
    for (let cx = Math.floor((c2.x - ex - PLAYER_R) / CELL); cx <= Math.floor((c2.x + ex + PLAYER_R) / CELL); cx++)
      for (let cy = Math.floor((c2.y - ey - PLAYER_R) / CELL); cy <= Math.floor((c2.y + ey + PLAYER_R) / CELL); cy++) {
        const k = key(cx, cy);
        const arr = map.grid.get(k);
        if (arr) arr.push(i); else map.grid.set(k, [i]);
      }
  });
}

/* ------------------------------------------------------------ knockback */
/** The floating-islands stage: a big main island, two side islands and thin ledges above, with a
    few seeded variations. Spawn points (in `burrows`) sit above the ledges. */
function generateStage(seed: number): GameMap {
  const R = rng(seed);
  const rr = (a: number, b: number) => a + R() * (b - a);
  const W = KB_W, H = KB_H;
  const map: GameMap = { seed, kind: 'kb', plats: [], w: W, h: H, props: [], colliders: [], ponds: [], paths: [], burrows: [], bushes: [], grid: new Map() };
  const solid = (cx: number, top: number, w: number, h: number, v = 0) => map.plats.push({ x: Math.round(cx - w / 2), y: Math.round(top), w: Math.round(w), h: Math.round(h), thin: false, v });
  const ledge = (cx: number, top: number, w: number, v = 0) => map.plats.push({ x: Math.round(cx - w / 2), y: Math.round(top), w: Math.round(w), h: 26, thin: true, v });
  const layout = Math.floor(R() * 3);
  const mid = W / 2;
  // main island
  solid(mid, 1180, layout === 1 ? 1400 : 1560, 210);
  // side islands
  const side = layout === 2 ? 760 : 900;
  solid(mid - side, 1010 + rr(-30, 30), rr(320, 400), 150, 1);
  solid(mid + side, 1010 + rr(-30, 30), rr(320, 400), 150, 1);
  // ledges
  ledge(mid - 420, 900 + rr(-20, 20), rr(300, 360), 0);
  ledge(mid + 420, 900 + rr(-20, 20), rr(300, 360), 0);
  ledge(mid, 660 + rr(-25, 25), rr(360, 440), 1);
  ledge(mid - 860, 720 + rr(-30, 30), rr(240, 300), 2);
  ledge(mid + 860, 720 + rr(-30, 30), rr(240, 300), 2);
  if (layout !== 1) { ledge(mid - 420, 440 + rr(-20, 20), 240, 3); ledge(mid + 420, 440 + rr(-20, 20), 240, 3); }
  else ledge(mid, 420, 300, 3);
  if (layout === 1) { solid(mid - 600, 1260, 220, 120, 1); solid(mid + 600, 1260, 220, 120, 1); }
  // spawn points above the ledges
  map.plats.forEach((p, i) => map.burrows.push({ id: i, x: p.x + p.w / 2, y: p.y - 140 }));
  // solid blocks also block projectiles (thin ledges do not)
  for (const p of map.plats) if (!p.thin) map.colliders.push({ t: 'r', x: p.x + p.w / 2, y: p.y + p.h / 2, r: 0, hw: p.w / 2, hh: p.h / 2, tall: true });
  indexColliders(map);
  return map;
}

/* ---------------------------------------------------------- Color Clash */
/** A side-view level made of blocks, mirrored left/right so no team has a better side: a thick
    floor, walls, a ceiling and floating rows of blocks every few rows (reachable with a jump),
    with a few pillars and stairs. Team spawns (in `burrows`): bottom-left, bottom-right, then the
    top corners; the rest are platform tops. */
function generateBlocks(seed: number): GameMap {
  const R = rng(seed);
  const cols = 64, rows = 38;
  const grid = new Uint8Array(cols * rows);
  const set = (c: number, r: number) => { if (c >= 0 && c < cols && r >= 0 && r < rows) { grid[r * cols + c] = 1; grid[r * cols + (cols - 1 - c)] = 1; } };
  for (let c = 0; c < cols; c++) { set(c, 0); set(c, rows - 1); set(c, rows - 2); }
  for (let r = 0; r < rows; r++) { set(0, r); set(1, r); }
  const half = cols / 2;
  // floating rows: a band every 4 rows, segments of 3–9 blocks with gaps you can jump across
  for (let r = rows - 6, band = 0; r >= 4; r -= 4, band++) {
    let c = 3 + Math.floor(R() * 4) + (band % 2) * 2;
    while (c < half - 1) {
      const len = 3 + Math.floor(R() * 7);
      for (let k = 0; k < len && c + k < half; k++) set(c + k, r);
      // sometimes a block step under one end, as stairs
      if (R() < 0.25) set(c, r + 1);
      c += len + 3 + Math.floor(R() * 4);
    }
  }
  // pillars on the floor
  for (let i = 0; i < 3; i++) {
    const c = 6 + Math.floor(R() * (half - 9)), h = 1 + Math.floor(R() * 2);
    for (let k = 0; k < h; k++) set(c, rows - 3 - k);
  }
  const W = cols * TILE, H = rows * TILE;
  const map: GameMap = { seed, kind: 'paint', plats: [], tiles: { cols, rows, grid }, w: W, h: H, props: [], colliders: [], ponds: [], paths: [], burrows: [], bushes: [], grid: new Map() };
  // physics rectangles: runs of solid blocks per row
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols;) {
      if (!grid[r * cols + c]) { c++; continue; }
      let e = c;
      while (e < cols && grid[r * cols + e]) e++;
      map.plats.push({ x: c * TILE, y: r * TILE, w: (e - c) * TILE, h: TILE, thin: false, v: r });
      c = e;
    }
  // spawns: team corners first, then free platform tops
  const top = (c: number) => { for (let r = 1; r < rows; r++) if (grid[r * cols + c] && !grid[(r - 1) * cols + c]) return r; return rows - 2; };
  const highTop = (c: number) => { for (let r = 2; r < rows; r++) if (grid[r * cols + c] && !grid[(r - 1) * cols + c] && !grid[(r - 2) * cols + c]) return r; return rows - 2; };
  map.burrows.push({ id: 0, x: 4 * TILE, y: (rows - 2) * TILE - 2 });
  map.burrows.push({ id: 1, x: (cols - 4) * TILE, y: (rows - 2) * TILE - 2 });
  let tl = 4; while (tl < half && highTop(tl) > rows / 2) tl++;
  map.burrows.push({ id: 2, x: (tl + 0.5) * TILE, y: highTop(tl) * TILE - 2 });
  map.burrows.push({ id: 3, x: (cols - tl - 0.5) * TILE, y: highTop(tl) * TILE - 2 });
  for (let c = 4; c < cols - 4; c += 7) map.burrows.push({ id: map.burrows.length, x: (c + 0.5) * TILE, y: top(c) * TILE - 2 });
  return map;
}

export const paintCols = (map: GameMap) => Math.ceil(map.w / PAINT_CELL);
export const paintRows = (map: GameMap) => Math.ceil(map.h / PAINT_CELL);
/** 1 = this block can be painted: a solid block with air above it (you can stand on it). */
export function paintMask(map: GameMap): Uint8Array {
  const cols = paintCols(map), rows = paintRows(map);
  const m = new Uint8Array(cols * rows);
  const g = map.tiles?.grid;
  if (!g) return m;
  for (let r = 1; r < rows; r++) for (let c = 0; c < cols; c++) if (g[r * cols + c] && !g[(r - 1) * cols + c]) m[r * cols + c] = 1;
  return m;
}
/** Is the block at (x, y) solid? */
export const solidAt = (map: GameMap, x: number, y: number) => {
  const t = map.tiles;
  if (!t) return false;
  const c = Math.floor(x / TILE), r = Math.floor(y / TILE);
  return c < 0 || r < 0 || c >= t.cols || r >= t.rows || !!t.grid[r * t.cols + c];
};

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
  if (sideView(map.kind)) return [x, y];
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
  if (map.tiles) return solidAt(map, x, y);
  if (map.kind === 'kb') { if (x < -400 || x > map.w + 400 || y < -600 || y > map.h + 200) return true; }
  else if (x < EDGE || y < EDGE || x > WORLD_W - EDGE || y > WORLD_H - EDGE) return true;
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
