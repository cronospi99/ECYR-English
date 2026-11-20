/**
 * Taxi Rush — building the coast (ECYR v2). See coast.ts for coast space and
 * the shared pieces; this file lays the geometry into the city's layers and
 * places the plants. Called once by TaxiWorld.build().
 */
import { BufferGeometry, CylinderGeometry, Group, Mesh, Quaternion, Vector3 } from 'three';
import { Layer, Mesher, mergeByCell, rgb, shade, type RGB, type V3 } from './city';
import { GROUND_LAYER as GL, cellUV, type CellName } from './textures';
import {
  ARC, BAND, COAST, COL, CURB, FACADES, SPOT, Plants,
  bigSignMaterial, bigSignQuad, buildLand, buildSea, buildWheel, coastBlocked, coastPoint, coastS, coastSteps, railOpen,
  type CoastPt,
} from './coast';
import { COAST_SHOPS, type CoastPlace } from './places';
import type { Lot } from './buildings';

export interface CoastCtx {
  ground: Layer; near: Layer; detail: Layer; keep: Layer;
  rand: () => number;
  plants: Plants;
  group: Group;
  u0: number; u1: number;
  corners: { x0: number; x1: number; z0: number; z1: number }[];
  /** Is (x, z) on the grid's own asphalt (an avenue or street running into the drive)? */
  onGridRoad: (x: number, z: number) => boolean;
  surfShop: Lot | null;
}

/* ------------------------------------------------------------------ *
 * Landmark places: their stops and signs                               *
 * ------------------------------------------------------------------ */

export interface CoastPlaceDef extends CoastPlace {
  at?: { x: number; z: number };
  sign?: { x: number; y: number; z: number; rotY: number; w: number; hue: number };
}

const P0: CoastPt = { x: 0, z: 0, tx: 1, tz: 0 };
const at = (u: number, s: number) => { const p = coastPoint(u, s, P0); return { x: p.x, z: p.z }; };
/** Yaw of something facing the land (towards -s) at u. */
const landYaw = (u: number) => { const p = coastPoint(u, 0, P0); return Math.atan2(-p.tz, p.tx); };
const signAt = (u: number, s: number, y: number, w: number, hue: number) => { const p = at(u, s); return { x: p.x, y, z: p.z, rotY: landYaw(u), w, hue }; };

/** Palm Fountain Plaza: the square the bend leaves inside its curve. */
export const CORNER_FOUNTAIN = { x: 195.5, z: -87, r: 2.4 };

export const COAST_PLACES: CoastPlaceDef[] = [
  ...COAST_SHOPS,
  {
    id: 'pier-arcade', name: 'Pier Arcade', type: 'an arcade', emoji: '🕹️', at: at(-89.5, 101),
    sign: { ...at(-92 + 0.08, 101.5), y: CURB + 3.35, rotY: Math.PI / 2, w: 3.6, hue: 320 },
  },
  { id: 'old-point-lighthouse', name: 'Old Point Lighthouse', type: 'a lighthouse', emoji: '🗼', at: at(SPOT.lighthouse.u, 27), sign: signAt(SPOT.lighthouse.u + 3.2, 31.5, 2.2, 3.4, 0) },
  { id: 'beach-plaza', name: 'Beach Plaza', type: 'a square', emoji: '⛲', at: at(-138, 26), sign: signAt(-131, 23.2, 2.4, 3.4, 190) },
  { id: 'clock-tower-square', name: 'Old Clock Tower', type: 'a clock tower', emoji: '🕰️', at: at(-35, 26), sign: signAt(-28, 23.2, 2.4, 3.6, 40) },
  { id: 'palm-fountain-plaza', name: 'Palm Fountain Plaza', type: 'a square', emoji: '🌴', at: { x: 199.5, z: -84 }, sign: { x: 201.8, y: 2.4, z: -82.6, rotY: 0, w: 3.6, hue: 140 } },
  { id: 'lifeguard-station', name: 'Lifeguard Station', type: 'a lifeguard station', emoji: '🛟', at: at(-110, 27.5), sign: signAt(-110, 31.2, 2.9, 2.8, 0) },
  { id: 'sandy-amphitheatre', name: 'Sandy Amphitheatre', type: 'an open-air theatre', emoji: '🎭', at: at(-222, 25), sign: signAt(-226, 23.2, 2.4, 3.6, 30) },
];

/* ------------------------------------------------------------------ *
 * Helpers in coast space                                               *
 * ------------------------------------------------------------------ */

const UVN: [number, number, number, number] = [0, 0, 1, 1];
const PA: CoastPt = { x: 0, z: 0, tx: 1, tz: 0 }, PB: CoastPt = { x: 0, z: 0, tx: 1, tz: 0 };
const vary = (c: RGB, r: () => number, k = 0.06): RGB => shade(c, 1 - k + r() * k * 2);

/** A horizontal-ish quad over [ua, ub] × [s0, s1], at y0 on the s0 side and y1 on the s1 side. */
function sQuad(m: Mesher, ua: number, ub: number, s0: number, s1: number, y0: number, y1: number, col: RGB, uv = UVN): void {
  coastPoint(ua, s0, PA); const a: V3 = [PA.x, y0, PA.z];
  coastPoint(ub, s0, PA); const b: V3 = [PA.x, y0, PA.z];
  coastPoint(ub, s1, PB); const c: V3 = [PB.x, y1, PB.z];
  coastPoint(ua, s1, PB); const d: V3 = [PB.x, y1, PB.z];
  m.quad(a, b, c, d, uv, col);
}
/** A vertical face along the drive at s, from y0 to y1, looking towards +s (seaward) or -s. */
function sFace(m: Mesher, ua: number, ub: number, s: number, y0: number, y1: number, col: RGB, seaward: boolean, uv = UVN): void {
  coastPoint(ua, s, PA); coastPoint(ub, s, PB);
  const a: V3 = [PA.x, y0, PA.z], b: V3 = [PB.x, y0, PB.z], c: V3 = [PB.x, y1, PB.z], d: V3 = [PA.x, y1, PA.z];
  if (seaward) m.quad(b, a, d, c, uv, col); else m.quad(a, b, c, d, uv, col);
}
/** Which per-cell mesher a piece at (u, s) belongs to. */
const cellOf = (L: Layer, u: number, s: number, layer?: number) => { const p = coastPoint(u, s, PA); return L.at(p.x, p.z, layer); };
/** A box standing at (u, s), turned to the drive's tangent; `w` across (along s), `d` along u. */
function sBox(L: Layer, u: number, s: number, w: number, d: number, y0: number, y1: number, col: RGB, cell: CellName = 'solid'): void {
  const p = coastPoint(u, s, PA);
  L.at(p.x, p.z).boxRot(p.x, p.z, w / 2, d / 2, y0, y1, Math.atan2(p.tx, p.tz), col, cell);
}
/** A cylinder (pole) from p to q, into a mesher. */
const _q = new Quaternion(), _up = new Vector3(0, 1, 0), _d = new Vector3();
function pole(m: Mesher, ax: number, ay: number, az: number, bx: number, by: number, bz: number, r: number, col: RGB, segs = 6): void {
  _d.set(bx - ax, by - ay, bz - az);
  const len = _d.length();
  const g = new CylinderGeometry(r, r, len, segs, 1, true);
  _q.setFromUnitVectors(_up, _d.normalize());
  g.applyQuaternion(_q);
  g.translate((ax + bx) / 2, (ay + by) / 2, (az + bz) / 2);
  m.addGeometry(g, col);
}
/** Sand height across the beach: flat and drivable, then down to the water line. */
export function sandY(s: number): number {
  if (s <= BAND.driveBeach) return -0.02 - 0.08 * Math.max(0, s - BAND.board) / (BAND.driveBeach - BAND.board);
  return -0.1 - 0.95 * Math.min(1, (s - BAND.driveBeach) / (BAND.shore - BAND.driveBeach));
}

/* ------------------------------------------------------------------ *
 * The builder                                                          *
 * ------------------------------------------------------------------ */

export function buildCoast(c: CoastCtx): { wheel: Mesh } {
  const { ground, near, detail, keep, rand, plants, u0, u1 } = c;
  const steps = coastSteps(u0, u1);
  const fine = coastSteps(u0, u1, 4.8, 2.4);

  /* ---- Ocean Drive: asphalt, markings, kerbs ---- */
  for (let i = 0; i < steps.length - 1; i++) {
    const ua = steps[i], ub = steps[i + 1], um = (ua + ub) / 2;
    sQuad(cellOf(ground, um, 0, GL.asphalt), ua, ub, -BAND.road - 0.4, BAND.road, 0.004, 0.004, vary(COL.asphalt, rand, 0.04));
    // median: two solid yellow lines; edge lines in white
    const pm = cellOf(ground, um, 0, GL.paint);
    for (const s of [-0.33, 0.18]) sQuad(pm, ua, ub, s, s + 0.15, 0.018, 0.018, COL.yellow);
    sQuad(pm, ua, ub, BAND.road - 0.55, BAND.road - 0.4, 0.018, 0.018, COL.white);
  }
  // the inner edge line breaks for every avenue or street that runs into the drive
  for (let i = 0; i < fine.length - 1; i++) {
    const ua = fine[i], ub = fine[i + 1], um = (ua + ub) / 2;
    const p = coastPoint(um, -BAND.road - 1.2, PA);
    if (!c.onGridRoad(p.x, p.z)) sQuad(cellOf(ground, um, 0, GL.paint), ua, ub, -BAND.road + 0.4, -BAND.road + 0.55, 0.018, 0.018, COL.white);
  }
  // lane dividers: 3 m dashes every 9 m
  for (let u = u0 + 2; u < u1 - 3; u += 9) {
    const pm = cellOf(ground, u, 0, GL.paint);
    const ub = u + 3, step = u >= 0 && u <= ARC ? 1 : 3;
    for (let a = u; a < ub - 1e-6; a += step) {
      const b = Math.min(ub, a + step);
      for (const s of [-6.75, -3.5, 3.5, 6.75]) sQuad(pm, a, b, s - 0.075, s + 0.075, 0.018, 0.018, COL.white);
    }
  }
  // seaward pavement (kerb in red and white), and the inner kerb round the bend
  for (let i = 0; i < fine.length - 1; i++) {
    const ua = fine[i], ub = fine[i + 1], um = (ua + ub) / 2;
    const m = cellOf(ground, um, BAND.road + 1.5, GL.paving);
    sQuad(m, ua, ub, BAND.road, BAND.side, CURB, CURB, vary(COL.pave, rand, 0.04));
    sFace(cellOf(ground, um, BAND.road, GL.paint), ua, ub, BAND.road, 0, CURB, i % 2 ? COL.kerbRed : COL.white, false);
    if (um > -2 && um < ARC + 2) {
      const p = coastPoint(um, -BAND.road - 1.5, PA);
      if (!c.onGridRoad(p.x, p.z)) {
        sQuad(cellOf(ground, um, -11.5, GL.paving), ua, ub, -BAND.side, -BAND.road, CURB, CURB, vary(COL.pave, rand, 0.04));
        sFace(cellOf(ground, um, -BAND.road, GL.paint), ua, ub, -BAND.road, 0, CURB, i % 2 ? COL.kerbRed : COL.white, true);
      }
    }
  }

  /* ---- the square inside the bend: paved, a fountain, a ring of palms ---- */
  for (const k of c.corners) {
    for (let z = Math.floor(k.z0); z < k.z1; z++) {
      let run = -1;
      for (let x = Math.floor(k.x0); x <= k.x1; x++) {
        const inside = x < k.x1 && Math.max(coastS(x, z), coastS(x + 1, z), coastS(x, z + 1), coastS(x + 1, z + 1)) < -12;
        if (inside && run < 0) run = x;
        if (!inside && run >= 0) {
          ground.at((run + x) / 2, z, GL.paving).top(run, x, z, Math.min(z + 1, k.z1), CURB - 0.004, UVN, COL.pave);
          run = -1;
        }
      }
    }
  }
  {
    const F = CORNER_FOUNTAIN, m = near.at(F.x, F.z);
    fountain(m, F.x, F.z, CURB);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      plants.add('palm', { x: F.x + Math.cos(a) * 7, y: CURB, z: F.z + Math.sin(a) * 7, yaw: rand() * 6.28, scale: 0.85 + rand() * 0.25, tint: rand() });
      plants.add('bush', { x: F.x + Math.cos(a + 0.4) * 4.5, y: CURB, z: F.z + Math.sin(a + 0.4) * 4.5, yaw: rand() * 6.28, scale: 0.8 + rand() * 0.4, tint: rand() });
    }
  }

  /* ---- boardwalk, railing, beach ---- */
  const woodUV = cellUV('planks');
  const halfUV: [number, number, number, number] = [woodUV[0], woodUV[1], (woodUV[0] + woodUV[2]) / 2, woodUV[3]];
  for (let i = 0; i < fine.length - 1; i++) {
    const ua = fine[i], ub = fine[i + 1], um = (ua + ub) / 2;
    const m = cellOf(keep, um, 17);
    sQuad(m, ua, ub, BAND.side, BAND.board, CURB + 0.01, CURB + 0.01, vary(COL.wood, rand, 0.05), ub - ua < 3 ? halfUV : woodUV);
    sFace(m, ua, ub, BAND.board, -0.1, CURB + 0.01, COL.woodDark, true);
    // the beach: dry sand, damp sand, the wet slope to the water
    const g = cellOf(ground, um, 30, GL.paint);
    const bands = [BAND.board, 30, BAND.driveBeach, 43.5, BAND.shore + 0.4];
    for (let b = 0; b < bands.length - 1; b++) {
      const s0 = bands[b], s1 = bands[b + 1];
      const col = b < 2 ? COL.sand : b === 2 ? shade(COL.sand, 0.93) : COL.wetSand;
      sQuad(g, ua, ub, s0, s1, sandY(s0), sandY(s1), vary(col, rand, 0.03));
    }
  }
  // railing: posts every 4, a top rail and a mid rail, gaps for the ramps, the pier and the squares
  for (let u = Math.ceil(u0 / 4) * 4; u < u1; u += 4) {
    if (railOpen(u) || railOpen(u + 4) || railOpen(u + 2)) continue;
    sBox(near, u, BAND.rail, 0.14, 0.14, CURB, CURB + 1.05, COL.rail);
    for (const y of [0.55, 1.0]) {
      const a = coastPoint(u, BAND.rail, PA), b = coastPoint(u + 4, BAND.rail, PB);
      const cx = (a.x + b.x) / 2, cz = (a.z + b.z) / 2, len = Math.hypot(b.x - a.x, b.z - a.z);
      near.at(cx, cz).boxRot(cx, cz, 0.045, len / 2, CURB + y - 0.045, CURB + y + 0.045, Math.atan2(b.x - a.x, b.z - a.z), COL.rail);
    }
  }
  // street lamps along the seaward pavement, arms over the drive
  for (let u = u0 + 6; u < u1 - 4; u += 24) {
    if (Math.abs(u - SPOT.pier.u) < 6) continue;
    const p = coastPoint(u, BAND.road + 1.4, PA), q = coastPoint(u, BAND.road - 0.4, PB);
    const m = near.at(p.x, p.z);
    m.cyl(p.x, p.z, CURB, CURB + 6.2, 0.09, 6, COL.dark, 'solid', false);
    pole(m, p.x, CURB + 6.1, p.z, q.x, CURB + 6.4, q.z, 0.05, COL.dark, 5);
    m.box(q.x - 0.22, q.x + 0.22, CURB + 6.18, CURB + 6.34, q.z - 0.22, q.z + 0.22, COL.lamp, 'lamp');
  }
  // benches facing the sea, bins, surf stands and ice-cream carts on the boardwalk
  for (let u = u0 + 10; u < u1 - 6; u += 20) {
    if (railOpen(u) || railOpen(u + 1.5) || railOpen(u - 1.5)) continue;
    bench(detail, u, BAND.board - 1.6);
    if (Math.round(u / 20) % 2 === 0) { const p = coastPoint(u + 3, BAND.board - 1.4, PA); detail.at(p.x, p.z).cyl(p.x, p.z, CURB, CURB + 0.85, 0.22, 7, rgb('#2bb6a0'), 'solid', true); }
  }
  for (const u of [-170, -60, 20, 120, 200]) surfStand(near, u, 16.5, rand);
  for (const u of [-200, -105, -15, 60]) cart(near, u, 17.2, rand);

  /* ---- the pier and its plaza ---- */
  pier(c);

  /* ---- squares on the beach ---- */
  for (const [P, tower] of [[SPOT.plazaA, false], [SPOT.plazaB, true]] as const) {
    const uc = (P.u0 + P.u1) / 2, sc = (P.s0 + P.s1) / 2 + 1;
    const g = cellOf(ground, uc, sc, GL.paving);
    for (let u = P.u0; u < P.u1 - 1e-6; u += 7.5) sQuad(g, u, Math.min(P.u1, u + 7.5), P.s0, P.s1, CURB, CURB, vary(COL.cobble, rand, 0.04));
    sFace(g, P.u0, P.u1, P.s1, -0.4, CURB, shade(COL.cobble, 0.8), true);
    const m = cellOf(near, uc, sc);
    const cp = coastPoint(uc, sc, PA);
    if (tower) clockTower(m, cp.x, cp.z, landYaw(uc)); else fountain(m, cp.x, cp.z, CURB);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + Math.PI / 8;
      const p = coastPoint(uc + Math.cos(a) * 10, sc + Math.sin(a) * 8.5, PA);
      plants.add('palm', { x: p.x, y: CURB, z: p.z, yaw: rand() * 6.28, scale: 0.9 + rand() * 0.25, tint: rand() });
      if (i % 2) plants.add('pot', { x: p.x + 1.2, y: CURB, z: p.z, yaw: 0, scale: 1, tint: rand() });
    }
    for (const du of [-6, 6]) bench(detail, uc + du, sc - 5.5);
  }

  /* ---- landmarks: lighthouse, amphitheatre, lifeguard towers ---- */
  lighthouse(c);
  amphitheatre(c);
  for (const u of SPOT.lifeguards) lifeguard(near, u, 33, landYaw(u));

  /* ---- plants ---- */
  placePlants(c);

  /* ---- the sea, the land, the wheel, the big signs ---- */
  c.group.add(buildSea(u0, u1));
  c.group.add(buildLand((COAST.CX + -40) / 2, 40, 1700));
  const W = SPOT.wheel, wp = coastPoint(W.u, W.s, PA);
  const wheel = buildWheel(W.r);
  wheel.position.set(wp.x, CURB + W.hub, wp.z);
  wheel.updateMatrix();
  wheel.matrixAutoUpdate = false;
  c.group.add(wheel);
  bigSigns(c);
  return { wheel };
}

/* ------------------------------------------------------------------ *
 * Pieces                                                               *
 * ------------------------------------------------------------------ */

function bench(L: Layer, u: number, s: number): void {
  const WOOD = rgb('#9a6a42'), IRON = rgb('#30343a');
  sBox(L, u, s, 0.5, 1.6, CURB + 0.42, CURB + 0.5, WOOD);
  sBox(L, u, s - 0.27, 0.06, 1.6, CURB + 0.55, CURB + 0.95, WOOD);
  for (const du of [-0.65, 0.65]) sBox(L, u + du, s, 0.44, 0.08, CURB, CURB + 0.42, IRON);
}

function fountain(m: Mesher, x: number, z: number, y: number): void {
  const stone = rgb('#efe3c8'), water = rgb('#5fc8e8');
  m.cyl(x, z, y, y + 0.55, 2.4, 14, stone);
  m.cyl(x, z, y + 0.5, y + 0.56, 2.15, 14, water);
  m.cyl(x, z, y + 0.55, y + 1.5, 0.35, 8, stone);
  m.cyl(x, z, y + 1.5, y + 1.75, 1.0, 10, stone);
  m.cyl(x, z, y + 1.72, y + 1.78, 0.85, 10, water);
  m.cone(x, z, y + 1.75, 1.1, 0.22, 6, rgb('#dff6ff'));
}

function clockTower(m: Mesher, x: number, z: number, yaw: number): void {
  const wall = rgb('#f6e3b8'), trim = rgb('#c0583a'), face = rgb('#ffffff'), hand = rgb('#2a2d33');
  m.box(x - 1.9, x + 1.9, CURB, CURB + 1.2, z - 1.9, z + 1.9, trim);
  m.box(x - 1.3, x + 1.3, CURB + 1.2, CURB + 19.5, z - 1.3, z + 1.3, wall, 'wall');
  m.box(x - 1.55, x + 1.55, CURB + 19.5, CURB + 20.0, z - 1.55, z + 1.55, trim);
  m.box(x - 1.15, x + 1.15, CURB + 20.0, CURB + 21.6, z - 1.15, z + 1.15, wall);
  m.cone(x, z, CURB + 21.6, 2.6, 1.6, 4, trim);
  // four clock faces near the top
  for (let i = 0; i < 4; i++) {
    const a = yaw + (i * Math.PI) / 2, fx = Math.sin(a), fz = Math.cos(a);
    const cx = x + fx * 1.32, cz = z + fz * 1.32, y = CURB + 17.6;
    const g = new CylinderGeometry(0.95, 0.95, 0.06, 18).rotateX(Math.PI / 2).rotateY(a).translate(cx, y, cz);
    m.addGeometry(g, face);
    m.boxRot(cx + fx * 0.05, cz + fz * 0.05, 0.05, 0.03, y - 0.05, y + 0.62, a, hand);
    m.boxRot(cx + fx * 0.06 + Math.cos(a) * 0.2, cz + fz * 0.06 - Math.sin(a) * 0.2, 0.25, 0.03, y - 0.04, y + 0.04, a, hand);
  }
}

function surfStand(L: Layer, u: number, s: number, rand: () => number): void {
  const p = coastPoint(u, s, PA), yaw = Math.atan2(p.tx, p.tz), m = L.at(p.x, p.z);
  const BOARDS = ['#ff8a65', '#4fc3d9', '#f2c94c', '#e8588a', '#8bd17c'].map(rgb);
  m.boxRot(p.x, p.z, 0.9, 1.3, CURB, CURB + 1.0, yaw, rgb('#f4f4f4'));
  m.boxRot(p.x, p.z, 1.05, 1.45, CURB + 2.2, CURB + 2.35, yaw, rgb('#2bb6a0'));
  for (const [du, ds] of [[-1.2, -0.8], [1.2, -0.8], [-1.2, 0.8], [1.2, 0.8]]) {
    const q = coastPoint(u + du, s + ds, PB); m.box(q.x - 0.04, q.x + 0.04, CURB, CURB + 2.2, q.z - 0.04, q.z + 0.04, rgb('#e8e2d6'));
  }
  for (let i = 0; i < 3; i++) {
    const q = coastPoint(u - 0.8 + i * 0.8, s + 1.45, PB);
    m.boxRot(q.x, q.z, 0.03, 0.27, CURB, CURB + 2.1, yaw + 0.08 * (i - 1), BOARDS[Math.floor(rand() * BOARDS.length)]);
  }
}

function cart(L: Layer, u: number, s: number, rand: () => number): void {
  const p = coastPoint(u, s, PA), yaw = Math.atan2(p.tx, p.tz), m = L.at(p.x, p.z);
  const body = rgb(FACADES[Math.floor(rand() * FACADES.length)]);
  m.boxRot(p.x, p.z, 0.55, 0.9, CURB + 0.35, CURB + 1.15, yaw, body);
  m.cyl(p.x, p.z, CURB + 1.15, CURB + 2.1, 0.04, 4, rgb('#e8e2d6'), 'solid', false);
  m.cone(p.x, p.z, CURB + 1.95, 0.5, 1.15, 8, rgb('#e8384f'));
  m.cyl(p.x, p.z, CURB, CURB + 0.35, 0.18, 6, rgb('#30343a'));
}

function lifeguard(L: Layer, u: number, s: number, yaw: number): void {
  const p = coastPoint(u, s, PA), m = L.at(p.x, p.z), y0 = -0.06;
  const WHITE = COL.white, RED = rgb('#e8384f'), WOOD = rgb('#c99a62');
  for (const [dx, dz] of [[-0.8, -0.8], [0.8, -0.8], [-0.8, 0.8], [0.8, 0.8]]) {
    const c = Math.cos(yaw), sn = Math.sin(yaw);
    const x = p.x + dx * c + dz * sn, z = p.z - dx * sn + dz * c;
    m.box(x - 0.07, x + 0.07, y0, y0 + 1.7, z - 0.07, z + 0.07, WOOD);
  }
  m.boxRot(p.x, p.z, 1.15, 1.15, y0 + 1.7, y0 + 1.85, yaw, WOOD);
  m.boxRot(p.x, p.z, 0.85, 0.85, y0 + 1.85, y0 + 3.0, yaw, WHITE);
  m.boxRot(p.x, p.z, 0.87, 0.87, y0 + 2.35, y0 + 2.55, yaw, RED);
  m.boxRot(p.x, p.z, 1.1, 1.1, y0 + 3.0, y0 + 3.15, yaw, RED);
  // the ramp down to the sand, on the land side
  const r = coastPoint(u, s - 1.9, PB);
  m.boxRot(r.x, r.z, 0.45, 0.9, y0 + 0.4, y0 + 0.55, yaw, WOOD);
}

function lighthouse(c: CoastCtx): void {
  const L = SPOT.lighthouse, p = coastPoint(L.u, L.s, PA), m = c.near.at(p.x, p.z);
  const RED = rgb('#d9302b'), WHITE = rgb('#f4f4f4'), ROCK = rgb('#8d8a82'), DARK = rgb('#2a2d33');
  m.blob(p.x, -0.4, p.z, L.r + 1.2, 1.6, 9, ROCK);
  m.cyl(p.x, p.z, -0.2, 1.4, L.r - 0.6, 12, rgb('#e8e2d6'));
  const H = 22, bands = 8;
  for (let i = 0; i < bands; i++) {
    const t0 = i / bands, t1 = (i + 1) / bands;
    m.cyl(p.x, p.z, 1.4 + H * t0, 1.4 + H * t1, 2.3 - 0.9 * (t0 + t1) / 2, 12, i % 2 ? WHITE : RED, 'solid', false);
  }
  const top = 1.4 + H;
  m.cyl(p.x, p.z, top, top + 0.35, 2.05, 12, DARK);
  m.cyl(p.x, p.z, top + 0.35, top + 2.3, 1.15, 10, rgb('#fff6d0'), 'lamp');
  m.cone(p.x, p.z, top + 2.3, 1.9, 1.45, 10, RED);
  // the door, on the land side
  const yaw = landYaw(L.u), dx = Math.sin(yaw), dz = Math.cos(yaw);
  m.boxRot(p.x + dx * (L.r - 0.55), p.z + dz * (L.r - 0.55), 0.6, 0.1, 1.4, 3.3, yaw, rgb('#6c4b34'));
  // a little path across the sand to the door
  for (let s = 27.5; s < L.s - L.r + 0.5; s += 1.9) {
    const q = coastPoint(L.u, s, PB);
    c.near.at(q.x, q.z).boxRot(q.x, q.z, 0.8, 0.7, -0.05, 0.02, yaw, rgb('#e8e2d6'));
  }
}

function amphitheatre(c: CoastCtx): void {
  const A = SPOT.amph, SEAT = rgb('#ecd29a'), STAGE = rgb('#d9bd82');
  // the stage on the sea side, seats rising towards the boardwalk
  {
    const g = cellOf(c.near, A.u, A.s);
    for (let i = 0; i < 6; i++) sQuad(g, A.u - 7 + i * 2.33, A.u - 7 + (i + 1) * 2.33, A.s - 0.5, A.s + 3, 0.5, 0.5, STAGE);
    sFace(g, A.u - 7, A.u + 7, A.s - 0.5, -0.05, 0.5, shade(STAGE, 0.8), false);
  }
  for (let tier = 0; tier < 3; tier++) {
    const r = 6.5 + tier * 2.6, h = 0.45 + tier * 0.45, n = 9 + tier * 2;
    for (let i = 0; i < n; i++) {
      const a0 = (i / n) * Math.PI, a1 = ((i + 1) / n) * Math.PI, a = (a0 + a1) / 2;
      const p = coastPoint(A.u + Math.cos(a) * r, A.s - Math.sin(a) * r, PA);
      const len = 2 * r * Math.sin((a1 - a0) / 2) + 0.1;
      const t = coastPoint(A.u + Math.cos(a) * (r + 1), A.s - Math.sin(a) * (r + 1), PB);
      const yaw = Math.atan2(t.x - p.x, t.z - p.z);
      c.near.at(p.x, p.z).boxRot(p.x, p.z, len / 2, 1.25, -0.05, h, yaw + Math.PI / 2, SEAT);
    }
  }
}

function pier(c: CoastCtx): void {
  const P = SPOT.pier, PP = SPOT.pierPlaza, { near, rand } = c;
  const x0 = COAST.CX + P.u - P.half, x1 = COAST.CX + P.u + P.half;
  const zOf = (s: number) => COAST.ZN - s;
  const WOOD = COL.wood, DARK = COL.woodDark, RAIL = COL.rail, plank = cellUV('planks');
  // deck, in pieces of 10 so each map cell gets its own
  for (let s = P.s0; s < P.s1 - 1e-6; s += 10) {
    const s1 = Math.min(P.s1, s + 10), za = zOf(s1), zb = zOf(s);
    const m = near.at((x0 + x1) / 2, (za + zb) / 2);
    m.box(x0, x1, -0.35, CURB + 0.01, za, zb, vary(WOOD, rand, 0.04));
    m.top(x0, x1, za, zb, CURB + 0.012, [plank[0], plank[1], plank[2], plank[3]], vary(WOOD, rand, 0.04));
  }
  // the plaza at the end
  {
    const px0 = COAST.CX + PP.u0, px1 = COAST.CX + PP.u1, za = zOf(PP.s1), zb = zOf(PP.s0);
    const m = near.at((px0 + px1) / 2, (za + zb) / 2);
    m.box(px0, px1, -0.35, CURB + 0.01, za, zb, WOOD);
    for (let x = px0; x < px1 - 1e-6; x += 4.5) m.top(x, Math.min(px1, x + 4.5), za, zb, CURB + 0.012, plank, vary(WOOD, rand, 0.04));
    // railing round the three sea sides, wooden barriers across the end
    const rail = (ax: number, az: number, bx: number, bz: number) => {
      const len = Math.hypot(bx - ax, bz - az), n = Math.max(1, Math.round(len / 3));
      for (let i = 0; i <= n; i++) { const x = ax + (bx - ax) * i / n, z = az + (bz - az) * i / n; m.box(x - 0.07, x + 0.07, CURB, CURB + 1.05, z - 0.07, z + 0.07, RAIL); }
      const cx = (ax + bx) / 2, cz = (az + bz) / 2, yaw = Math.atan2(bx - ax, bz - az);
      m.boxRot(cx, cz, 0.05, len / 2, CURB + 0.96, CURB + 1.06, yaw, RAIL);
      m.boxRot(cx, cz, 0.04, len / 2, CURB + 0.5, CURB + 0.58, yaw, RAIL);
    };
    rail(px0 + 0.2, za + 0.2, px1 - 0.2, za + 0.2);
    rail(px0 + 0.2, za + 0.2, px0 + 0.2, zb - 0.2);
    rail(px1 - 0.2, za + 0.2, px1 - 0.2, zb - 0.2);
    rail(px0 + 0.2, zb - 0.2, x0 - 0.1, zb - 0.2);
    rail(x1 + 0.1, zb - 0.2, px1 - 0.2, zb - 0.2);
    for (const bx of [px0 + 4, (px0 + px1) / 2, px1 - 4]) {
      m.box(bx - 1.6, bx + 1.6, CURB + 0.55, CURB + 0.85, za + 0.7, za + 0.82, rgb('#e8384f'));
      m.box(bx - 1.6, bx + 1.6, CURB + 0.95, CURB + 1.2, za + 0.7, za + 0.82, COL.white);
      for (const dx of [-1.4, 1.4]) m.box(bx + dx - 0.07, bx + dx + 0.07, CURB, CURB + 1.25, za + 0.7, za + 0.82, DARK);
    }
    // pilings under the plaza
    for (const x of [px0 + 0.6, (px0 + px1) / 2, px1 - 0.6]) for (const z of [za + 0.6, zb - 0.6]) m.cyl(x, z, -2.4, -0.35, 0.32, 7, DARK, 'solid', false);
    // the arcade hall: purple, neon-trimmed, its shopfront facing the pier
    const A = SPOT.arcade, ax0 = COAST.CX + A.u0, ax1 = COAST.CX + A.u1, az0 = zOf(A.s1), az1 = zOf(A.s0);
    const PURPLE = rgb('#4a2c7a'), NEON = rgb('#ff4fa3');
    m.box(ax0, ax1, CURB, CURB + 4.6, az0, az1, PURPLE, 'wall');
    m.wall('+x', ax0, ax1, az0, az1, CURB, CURB + 3.4, 3, () => cellUV('shopA'), rgb('#f4e8ff'));
    m.box(ax0 - 0.1, ax1 + 0.1, CURB + 4.6, CURB + 4.85, az0 - 0.1, az1 + 0.1, NEON, 'lamp');
    m.box(ax1 + 0.02, ax1 + 0.12, CURB + 3.5, CURB + 3.65, az0, az1, NEON, 'lamp');
    // the wheel's A-frame legs
    const W = SPOT.wheel, wx = COAST.CX + W.u, wz = zOf(W.s), hy = CURB + W.hub;
    for (const dz of [-1.2, 1.2]) {
      for (const dx of [-3.2, 3.2]) pole(m, wx + dx, CURB, wz + dz * 1.6, wx, hy, wz + dz * 0.75, 0.16, rgb('#f4efe6'), 6);
    }
    m.box(wx - 3.6, wx + 3.6, CURB, CURB + 0.3, wz - 2.2, wz + 2.2, rgb('#2a1b4d'));
  }
  // pilings under the pier: seven pairs
  const m0 = near.at((x0 + x1) / 2, zOf(50));
  for (let i = 0; i < 7; i++) {
    const s = 26 + i * 10.5, z = zOf(s);
    const mm = near.at((x0 + x1) / 2, z);
    for (const x of [x0 + 0.35, x1 - 0.35]) mm.cyl(x, z, -2.6, -0.35, 0.28, 7, DARK, 'solid', false);
    mm.box(x0 + 0.2, x1 - 0.2, -0.75, -0.55, z - 0.12, z + 0.12, DARK);
  }
  void m0;
  // side railings and old-fashioned lamps
  for (let s = P.s0 + 1; s < P.s1 - 1; s += 3.5) {
    const z = zOf(s), mm = near.at((x0 + x1) / 2, z);
    for (const x of [x0 + 0.12, x1 - 0.12]) mm.box(x - 0.06, x + 0.06, CURB, CURB + 1.05, z - 0.06, z + 0.06, RAIL);
  }
  for (let s = P.s0; s < P.s1 - 1e-6; s += 10) {
    const za = zOf(Math.min(P.s1, s + 10)), zb = zOf(s), mm = near.at((x0 + x1) / 2, (za + zb) / 2);
    for (const x of [x0 + 0.12, x1 - 0.12]) {
      mm.box(x - 0.05, x + 0.05, CURB + 0.96, CURB + 1.06, za, zb, RAIL);
      mm.box(x - 0.04, x + 0.04, CURB + 0.5, CURB + 0.58, za, zb, RAIL);
    }
  }
  for (let s = P.s0 + 6; s < P.s1; s += 14) {
    const z = zOf(s);
    for (const x of [x0 + 0.12, x1 - 0.12]) {
      const mm = near.at(x, z);
      mm.cyl(x, z, CURB + 1.05, CURB + 3.6, 0.06, 6, COL.dark, 'solid', false);
      mm.blob(x, CURB + 3.8, z, 0.26, 0.26, 7, COL.lamp, 'lamp');
    }
  }
}

function bigSigns(c: CoastCtx): void {
  const mat = bigSignMaterial(), geos: BufferGeometry[] = [];
  const P = SPOT.pier, zOf = (s: number) => COAST.ZN - s, px = COAST.CX + P.u;
  const posts = (m: Mesher, xs: number[], z: number, h: number) => { for (const x of xs) m.box(x - 0.2, x + 0.2, CURB, CURB + h, z - 0.2, z + 0.2, rgb('#2a1b4d')); };
  // PIER ARCADE: an arch at the pier's foot, and the same sign over the plaza's arcade
  {
    const z = zOf(P.s0 + 1.5), m = c.near.at(px, z);
    posts(m, [px - P.half - 0.5, px + P.half + 0.5], z, 7.6);
    m.box(px - P.half - 0.7, px + P.half + 0.7, CURB + 7.2, CURB + 7.6, z - 0.25, z + 0.25, rgb('#ff4fa3'), 'lamp');
    geos.push(bigSignQuad(0, 11, 2.06, px, CURB + 8.75, z + 0.02, 0));
    geos.push(bigSignQuad(0, 11, 2.06, px, CURB + 8.75, z - 0.02, Math.PI));
    m.box(px - 5.6, px + 5.6, CURB + 7.6, CURB + 7.7, z - 0.1, z + 0.1, rgb('#2a1b4d'));
    const A = SPOT.arcade, az = zOf(A.s0) + 0.0, ax = COAST.CX + (A.u0 + A.u1) / 2;
    const mm = c.near.at(ax, az);
    posts(mm, [ax - 2.4, ax + 2.4], zOf(A.s0 + 0.6), 6.2);
    geos.push(bigSignQuad(0, 7.6, 1.42, ax, CURB + 6.0, zOf(A.s0 + 0.6) + 0.25, 0));
  }
  // SURF SHOP: on the roof of the surf shop, facing Ocean Drive
  if (c.surfShop) {
    const l = c.surfShop, x = (l.x0 + l.x1) / 2, z = l.z0 + 0.9, m = c.near.at(x, z);
    posts(m, [x - 1.6, x + 1.6], z + 0.3, 7.6);
    geos.push(bigSignQuad(1, 5.8, 1.09, x, CURB + 7.3, z - 0.05, Math.PI));
  }
  // OCEAN DRIVE: over the boardwalk near the start, readable driving east
  {
    const u = -168, p = coastPoint(u, 17, PA), m = c.near.at(p.x, p.z);
    for (const s of [13.6, 20.4]) { const q = coastPoint(u, s, PB); m.box(q.x - 0.15, q.x + 0.15, CURB, CURB + 4.6, q.z - 0.15, q.z + 0.15, rgb('#2a1b4d')); }
    geos.push(bigSignQuad(2, 7.4, 1.39, p.x - 0.18, CURB + 4.9, p.z, -Math.PI / 2));
    geos.push(bigSignQuad(2, 7.4, 1.39, p.x + 0.18, CURB + 4.9, p.z, Math.PI / 2));
  }
  for (const g of mergeByCell(geos, 50)) {
    const mesh = new Mesh(g, mat);
    mesh.matrixAutoUpdate = false;
    c.group.add(mesh);
  }
  geos.forEach((g) => g.dispose());
}

/* ------------------------------------------------------------------ *
 * Plants                                                               *
 * ------------------------------------------------------------------ */

function placePlants(c: CoastCtx): void {
  const { plants, rand, u0, u1 } = c;
  const P = SPOT.pier, A = SPOT.plazaA, B = SPOT.plazaB;
  const inPlaza = (u: number) => (u > A.u0 - 2 && u < A.u1 + 2) || (u > B.u0 - 2 && u < B.u1 + 2);
  const palm = (x: number, y: number, z: number, k = 1) => plants.add('palm', { x, y, z, yaw: rand() * 6.28, scale: (0.9 + rand() * 0.3) * k, tint: rand() });
  // tall palms along the seaward pavement, every 12 (between the lamps)
  for (let u = u0 + 12; u < u1 - 4; u += 12) {
    if (Math.abs(u - P.u) < 5) continue;
    const p = coastPoint(u, BAND.road + 1.6, PA);
    palm(p.x, CURB, p.z);
  }
  // ...and on the city side of Ocean Drive, where no avenue or street runs in
  for (let u = u0 + 6; u < u1 - 4; u += 12) {
    if (u > -4 && u < ARC + 4) continue;
    const p = coastPoint(u, -BAND.road - 1.6, PA);
    if (c.onGridRoad(p.x, p.z) || c.onGridRoad(p.x + 2, p.z) || c.onGridRoad(p.x - 2, p.z) || c.onGridRoad(p.x, p.z + 2) || c.onGridRoad(p.x, p.z - 2)) continue;
    palm(p.x, CURB, p.z);
  }
  // avenues: every other one, both pavements, for the first blocks inland
  for (let k = -5; k <= 7; k += 2) {
    const vx = 15 + 21 * k;
    for (const x of [vx - 1.3, vx + 6 + 1.3]) {
      for (let z = -92; z < -12; z += 12) if (!c.onGridRoad(x, z) && !c.onGridRoad(x, z - 1.5) && !c.onGridRoad(x, z + 1.5)) palm(x, CURB, z);
    }
  }
  // coconut palms leaning over the beach
  let tries = 0;
  while (plants.total('coco') < 52 && tries++ < 2000) {
    const u = u0 + 10 + rand() * (u1 - u0 - 20), s = 24 + rand() * 18;
    if (Math.abs(u - P.u) < 7 || inPlaza(u) || coastBlocked(u, s) || near(u, s)) continue;
    const p = coastPoint(u, s, PA);
    // leaning towards the sea, more or less
    plants.add('coco', { x: p.x, y: -0.06, z: p.z, yaw: Math.atan2(p.tz, -p.tx) + (rand() - 0.5) * 1.4 - Math.PI / 2, scale: 0.9 + rand() * 0.25, tint: rand() });
  }
  function near(u: number, s: number): boolean {
    for (const q of SPOT.lifeguards) if (Math.abs(q - u) < 4) return true;
    return Math.abs(u - SPOT.lighthouse.u) < 9 || Math.abs(u - SPOT.amph.u) < 16 && s > 20;
  }
  // bushes and pots along the boardwalk's inner edge; grass on the dunes
  for (let u = u0 + 3; u < u1 - 3; u += 7) {
    if (railOpen(u)) continue;
    const p = coastPoint(u, BAND.side + 0.7, PA);
    if (Math.round(u / 7) % 3 === 0) {
      plants.add('pot', { x: p.x, y: CURB, z: p.z, yaw: rand() * 6.28, scale: 1, tint: rand() });
      plants.add('bush', { x: p.x, y: CURB + 0.5, z: p.z, yaw: rand() * 6.28, scale: 0.5 + rand() * 0.15, tint: rand() });
    } else plants.add('bush', { x: p.x, y: CURB, z: p.z, yaw: rand() * 6.28, scale: 0.75 + rand() * 0.45, tint: rand() });
  }
  tries = 0;
  while (plants.total('grass') < 120 && tries++ < 3000) {
    const u = u0 + 4 + rand() * (u1 - u0 - 8), s = BAND.board + 0.6 + rand() * 5;
    if (Math.abs(u - P.u) < 5 || inPlaza(u) || railOpen(u) || coastBlocked(u, s)) continue;
    const p = coastPoint(u, s, PA);
    plants.add('grass', { x: p.x, y: -0.03, z: p.z, yaw: rand() * 6.28, scale: 0.8 + rand() * 0.7, tint: rand() });
  }
  void COAST_SHOPS;
}
