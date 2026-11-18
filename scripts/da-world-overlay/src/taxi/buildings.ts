/**
 * Taxi Rush — procedural buildings.
 *
 * A building is a stack of floors, each floor four walls, each wall a row of
 * bays, and every bay one quad showing one cell of the window atlas
 * (textures.ts). Variation comes from the kind (tower, block, hall, house), the
 * zone's palette, the number of floors, set-back tiers, pitched or flat roofs
 * and rooftop clutter. Towers rise in tiers, halls get saw-tooth or metal
 * roofs, houses get gables and chimneys.
 */
import { mulberry32 } from '../core/rng';
import { cellUV, type CellName } from './textures';
import { Mesher, rgb, shade, type RGB } from './city';
import type { District } from './places';

export type Kind = 'tower' | 'block' | 'hall' | 'house';
export type Zone = District | 'centre';
export type Landmark = 'stadium' | 'airport' | 'terminal';
/** What a place looks like at a glance (see icons.ts). */
export type Icon = 'hospital' | 'gas' | 'school' | 'service' | 'awning' | 'hotel' | 'church' | 'shop' | 'bank' | 'classic';

/** Top of the pavement slab, where every building stands. */
export const GROUND = 0.16;

export interface Lot {
  /** Footprint, already inset from the lot edges. */
  x0: number; x1: number; z0: number; z1: number;
  /** 'up' looks north (door on the z0 side), 'down' looks south (door on the z1 side). */
  face: 'up' | 'down';
  kind: Kind;
  zone: Zone;
  /** Takes the whole block interior. */
  big: boolean;
  landmark?: Landmark;
  /** Has a named place: its ground floor is a shopfront. */
  shop: boolean;
  seed: number;
  /** Type of the place that lives here, and the landmark look it gets. */
  type?: string;
  icon?: Icon;
}

interface Look {
  floors: number;
  floorH: number;
  groundH: number;
  upper: [CellName, CellName];
  ground: 'shop' | 'hall' | 'house' | 'plain';
  bayW: number;
  tint: RGB;
  roof: RGB;
  tiers: number;
  gable: boolean;
}

const COOL = ['#9db8cc', '#8fa9bd', '#b4c3cf', '#a2b7aa', '#c3ccd2', '#7f9ab0', '#8e9fb5'];
const WARM = ['#e8cfae', '#dbbf9d', '#d2a98a', '#ebdfc8', '#cfa98f', '#c8b08f', '#e3d5bd'];
const BRICK = ['#c98466', '#b9735a', '#d29a6c', '#c38f78', '#c07a5e'];
const PASTEL = ['#f0d9b5', '#e9c6c0', '#cfe0c6', '#f2e6a8', '#c6d9e8', '#e8c9a0', '#d9c6e8'];
const IND = ['#c8cdd2', '#b6c1c9', '#d8d2c0', '#a9b5ae', '#c9b58f', '#bfc7cf'];
const GRAVEL = ['#9a9a95', '#8c8f8f', '#a3a29a', '#84878a'];
const CLAY = ['#b5533c', '#8a4b3a', '#a85a3a', '#6d5a4e', '#9a6a4a'];
const METAL = ['#8f9aa3', '#9aa7a0', '#a39a8a'];

const pick = <T>(r: () => number, a: T[]): T => a[Math.floor(r() * a.length)];
const range = (r: () => number, a: number, b: number): number => a + Math.floor(r() * (b - a + 1));

function lookFor(lot: Lot, r: () => number): Look {
  const z = lot.zone;
  const base: Look = {
    floors: 3, floorH: 3, groundH: 3.4, upper: ['resiA', 'resiB'], ground: 'plain', bayW: 2.2,
    tint: rgb(pick(r, WARM)), roof: rgb(pick(r, GRAVEL)), tiers: 1, gable: false,
  };
  const shopZone = z === 'centre' || z === 'downtown' || z === 'market' || z === 'oldtown' || z === 'harbour';
  switch (lot.kind) {
    case 'tower': {
      base.floors = z === 'downtown' ? range(r, 10, 18) : z === 'centre' ? range(r, 7, 12) : range(r, 6, 10);
      base.upper = r() < 0.5 ? ['officeStripA', 'officeStripB'] : ['officeGridA', 'officeGridB'];
      base.tint = rgb(pick(r, COOL));
      base.groundH = 3.8;
      base.bayW = 2.0;
      base.ground = 'shop';
      base.tiers = base.floors > 13 ? 3 : base.floors > 8 ? 2 : 1;
      break;
    }
    case 'block': {
      base.floors = z === 'centre' ? range(r, 3, 7) : z === 'downtown' ? range(r, 4, 8) : range(r, 3, 5);
      const kinds: [CellName, CellName][] = z === 'oldtown' ? [['tallA', 'tallB']]
        : z === 'downtown' ? [['officeGridA', 'officeGridB'], ['officeStripA', 'officeStripB']]
          : z === 'centre' ? [['resiA', 'resiB'], ['officeGridA', 'officeGridB'], ['tallA', 'tallB']]
            : [['resiA', 'resiB'], ['officeGridA', 'officeGridB']];
      base.upper = pick(r, kinds);
      base.tint = rgb(pick(r, z === 'oldtown' || z === 'campus' ? BRICK.concat(WARM) : z === 'downtown' ? COOL.concat(WARM) : z === 'market' ? PASTEL.concat(WARM) : WARM.concat(COOL, PASTEL)));
      base.ground = shopZone || lot.shop ? 'shop' : 'plain';
      base.gable = z === 'oldtown' && r() < 0.5;
      if (base.gable) base.roof = rgb(pick(r, CLAY));
      break;
    }
    case 'hall': {
      base.floors = 1;
      base.floorH = 4.4; base.groundH = 4.4;
      base.upper = ['indA', 'indB'];
      base.bayW = 3.0;
      base.tint = rgb(pick(r, z === 'market' ? PASTEL : IND));
      base.ground = 'hall';
      base.gable = true;
      base.roof = rgb(pick(r, METAL));
      break;
    }
    default: { // house
      base.floors = range(r, 1, 2);
      base.floorH = 2.7; base.groundH = 2.9;
      base.upper = ['resiA', 'resiB'];
      base.tint = rgb(pick(r, z === 'oldtown' ? BRICK.concat(WARM) : PASTEL));
      base.ground = lot.shop ? 'shop' : 'house';
      base.gable = true;
      base.roof = rgb(pick(r, CLAY));
      break;
    }
  }
  if (lot.shop && base.ground === 'plain') base.ground = 'shop';
  switch (lot.icon) {
    case 'hospital':
      base.floors = Math.min(6, Math.max(4, base.floors)); base.tint = rgb('#eef2f5'); base.upper = ['officeGridA', 'officeGridB']; base.gable = false; base.tiers = 1; base.ground = 'shop';
      break;
    case 'gas':
      base.floors = 1; base.floorH = 3.6; base.groundH = 3.6; base.tint = rgb('#ece8dc'); base.ground = 'shop'; base.gable = false; base.tiers = 1;
      break;
    case 'school':
      base.floors = 2; base.tint = rgb(pick(r, ['#d9a05a', '#c98466', '#e2c27a'])); base.upper = ['resiA', 'resiB']; base.ground = 'plain'; base.gable = false; base.tiers = 1;
      break;
    case 'service':
      base.floors = range(r, 2, 3); base.ground = 'hall'; base.tint = rgb(lot.type?.includes('fire') ? '#d88a7a' : '#9fb3d6'); base.gable = false; base.tiers = 1;
      break;
    case 'church':
      base.floors = 2; base.floorH = 3.4; base.tint = rgb('#dcd3c3'); base.upper = ['tallA', 'tallB']; base.ground = 'plain'; base.gable = true; base.roof = rgb('#7a5a4a');
      break;
    case 'hotel':
      if (lot.kind !== 'tower') base.floors = Math.max(5, base.floors);
      break;
    default:
  }
  return base;
}

interface Rect { x0: number; x1: number; z0: number; z1: number }

/** Height of the ground floor, the sign band sits just under its top. */
export function groundHeight(lot: Lot): number {
  if (lot.landmark) return 4.4;
  if (lot.icon === 'gas') return 3.6;
  if (lot.kind === 'hall') return 4.4;
  if (lot.kind === 'house') return 2.9;
  if (lot.kind === 'tower') return 3.8;
  return 3.4;
}

function walls(m: Mesher, t: Rect, y: number, floors: number, look: Look, r: () => number, front: '+z' | '-z', groundTier: boolean, simple: boolean): number {
  const faces: ('+z' | '-z' | '+x' | '-x')[] = ['+z', '-z', '+x', '-x'];
  const shutterBay = Math.floor(r() * 3);
  for (let f = 0; f < floors;) {
    const ground = groundTier && f === 0;
    // far version: one bay per wall and two floors per quad
    const n = simple && !ground ? Math.min(2, floors - f) : 1;
    const fh = (ground ? look.groundH : look.floorH) * n;
    for (const face of faces) {
      const len = face === '+z' || face === '-z' ? t.x1 - t.x0 : t.z1 - t.z0;
      const bays = simple ? 1 : Math.max(1, Math.round(len / look.bayW));
      const isFront = face === front;
      const upper = (): CellName => (r() < 0.5 ? look.upper[0] : look.upper[1]);
      const uvFor = (i: number): [number, number, number, number] => {
        let c: CellName;
        if (!ground) c = upper();
        else if (look.ground === 'shop') c = isFront ? (i % 2 ? 'shopB' : 'shopA') : upper();
        else if (look.ground === 'hall') c = isFront && i === shutterBay % bays ? 'shutter' : i % 2 ? 'indB' : 'indA';
        else if (look.ground === 'house') c = isFront && i === 0 ? 'door' : upper();
        else c = upper();
        return cellUV(c);
      };
      m.wall(face, t.x0, t.x1, t.z0, t.z1, y, y + fh, bays, uvFor, look.tint);
    }
    y += fh;
    f += n;
  }
  return y;
}

function flatRoof(m: Mesher, t: Rect, y: number, look: Look): void {
  m.top(t.x0, t.x1, t.z0, t.z1, y, cellUV('roof'), look.roof);
}

/** Ridge along x. Rise as a fraction of the depth. */
function gableRoof(m: Mesher, t: Rect, y: number, rise: number, look: Look, wallCol: RGB, cell: CellName = 'tiles'): void {
  const zc = (t.z0 + t.z1) / 2, yr = y + rise;
  const uv = cellUV(cell);
  // front (+z) and back (-z) slopes
  m.quad([t.x0, y, t.z1], [t.x1, y, t.z1], [t.x1, yr, zc], [t.x0, yr, zc], uv, look.roof);
  m.quad([t.x1, y, t.z0], [t.x0, y, t.z0], [t.x0, yr, zc], [t.x1, yr, zc], uv, look.roof);
  // gable ends
  const w = cellUV('wall'), mid: [number, number] = [(w[0] + w[2]) / 2, w[3]];
  m.tri([t.x1, y, t.z1], [t.x1, y, t.z0], [t.x1, yr, zc], [w[0], w[1]], [w[2], w[1]], mid, wallCol);
  m.tri([t.x0, y, t.z0], [t.x0, y, t.z1], [t.x0, yr, zc], [w[0], w[1]], [w[2], w[1]], mid, wallCol);
}

function sawtooth(m: Mesher, t: Rect, y: number, teeth: number, look: Look): void {
  const td = (t.z1 - t.z0) / teeth, rise = 1.1;
  const uv = cellUV('indA');
  const slope = cellUV('tiles');
  for (let i = 0; i < teeth; i++) {
    const zs = t.z0 + i * td;
    // glazed face looking north, then the slope down to the next tooth
    m.quad([t.x1, y, zs], [t.x0, y, zs], [t.x0, y + rise, zs], [t.x1, y + rise, zs], uv, shade(look.tint, 1));
    m.quad([t.x0, y, zs + td], [t.x1, y, zs + td], [t.x1, y + rise, zs], [t.x0, y + rise, zs], slope, look.roof);
  }
  // end caps
  const w = cellUV('wall');
  for (const [x, nx] of [[t.x0, -1], [t.x1, 1]] as const) {
    for (let i = 0; i < teeth; i++) {
      const zs = t.z0 + i * td;
      if (nx > 0) m.tri([x, y, zs + td], [x, y, zs], [x, y + rise, zs], [w[0], w[1]], [w[2], w[1]], [w[0], w[3]], look.tint);
      else m.tri([x, y, zs], [x, y, zs + td], [x, y + rise, zs], [w[0], w[1]], [w[2], w[1]], [w[0], w[3]], look.tint);
    }
  }
}

const GREY = rgb('#9aa0a6');
const WHITE = rgb('#f2f2ee');
const RED = rgb('#c2392f');

function roofClutter(m: Mesher, t: Rect, y: number, r: () => number, kind: Kind, tall: boolean): void {
  const w = t.x1 - t.x0, d = t.z1 - t.z0;
  const px = () => t.x0 + 0.5 + r() * Math.max(0.1, w - 1.4);
  const pz = () => t.z0 + 0.5 + r() * Math.max(0.1, d - 1.4);
  if (kind === 'tower' && tall) {
    const x = (t.x0 + t.x1) / 2, z = (t.z0 + t.z1) / 2;
    m.box(x - 0.06, x + 0.06, y, y + 3.2 + r() * 2, z - 0.06, z + 0.06, WHITE);
    m.box(x - 0.1, x + 0.1, y + 3.1, y + 3.3, z - 0.1, z + 0.1, RED);
  }
  const n = kind === 'house' ? 0 : range(r, 1, 3);
  for (let i = 0; i < n; i++) {
    const x = px(), z = pz();
    if (r() < 0.35 && kind !== 'tower') m.cyl(x + 0.35, z + 0.35, y, y + 1.0, 0.4, 7, shade(rgb('#9a7a5a'), 1), 'solid', true);
    else m.box(x, x + 0.7 + r() * 0.5, y, y + 0.5 + r() * 0.5, z, z + 0.7 + r() * 0.4, GREY);
  }
}

/** Emit a regular lot. `simple` is the far version: plain boxes, no tiers' clutter, no gables. */
export function emitBuilding(m: Mesher, lot: Lot, simple = false): number {
  const r = mulberry32(lot.seed);
  if (lot.landmark) { emitLandmark(m, lot, r); return GROUND + 8; }
  const look = lookFor(lot, r);
  const front: '+z' | '-z' = lot.face === 'up' ? '-z' : '+z';
  let t: Rect = { x0: lot.x0, x1: lot.x1, z0: lot.z0, z1: lot.z1 };
  let y = GROUND;
  if (lot.kind === 'tower' && look.tiers > 1) {
    const totals = look.tiers === 3 ? [0.5, 0.3, 0.2] : [0.62, 0.38];
    let left = look.floors;
    for (let i = 0; i < look.tiers; i++) {
      const f = i === look.tiers - 1 ? left : Math.max(1, Math.round(look.floors * totals[i]));
      left -= f;
      y = walls(m, t, y, f, look, r, front, i === 0, simple);
      if (i < look.tiers - 1) {
        flatRoof(m, t, y, look);
        const ix = Math.min(0.5, (t.x1 - t.x0) * 0.14), iz = 0.4;
        t = { x0: t.x0 + ix, x1: t.x1 - ix, z0: t.z0 + iz, z1: t.z1 - iz };
      }
      if (left <= 0 && i < look.tiers - 1) break;
    }
    flatRoof(m, t, y, look);
    if (!simple) roofClutter(m, t, y, r, lot.kind, true);
    return y;
  }
  y = walls(m, t, y, look.floors, look, r, front, true, simple);
  if (look.gable && !simple) {
    const d = t.z1 - t.z0;
    const rise = lot.kind === 'hall' ? 0.9 : d * (lot.kind === 'house' ? 0.5 : 0.35);
    // the roof reads as a metal hall roof for halls, tiles otherwise
    gableRoof(m, t, y, rise, look, look.tint, lot.kind === 'hall' ? 'roof' : 'tiles');
    if (lot.kind === 'house' && r() < 0.7) {
      const cx = t.x0 + (t.x1 - t.x0) * (0.2 + r() * 0.6), cz = (t.z0 + t.z1) / 2 + (r() < 0.5 ? -0.5 : 0.5);
      m.box(cx - 0.18, cx + 0.18, y, y + rise + 0.7, cz - 0.18, cz + 0.18, rgb('#9a6a5a'));
    }
    return y + rise;
  }
  if (lot.kind === 'hall' && lot.big && !simple) sawtooth(m, t, y, 3, look);
  else {
    flatRoof(m, t, y, look);
    if (!simple) roofClutter(m, t, y, r, lot.kind, false);
  }
  return y;
}

/* ------------------------------------------------------------------ *
 * Landmarks                                                            *
 * ------------------------------------------------------------------ */

function emitLandmark(m: Mesher, lot: Lot, r: () => number): void {
  const t = { x0: lot.x0, x1: lot.x1, z0: lot.z0, z1: lot.z1 };
  const wallCol = rgb('#d9d4c6');
  if (lot.landmark === 'stadium') {
    const H = 6.2, th = 1.3;
    const y0 = GROUND;
    m.box(t.x0, t.x1, y0, y0 + H, t.z0, t.z0 + th, wallCol, 'wall');
    m.box(t.x0, t.x1, y0, y0 + H, t.z1 - th, t.z1, wallCol, 'wall');
    m.box(t.x0, t.x0 + th, y0, y0 + H, t.z0 + th, t.z1 - th, wallCol, 'wall');
    m.box(t.x1 - th, t.x1, y0, y0 + H, t.z0 + th, t.z1 - th, wallCol, 'wall');
    m.box(t.x0 - 0.05, t.x1 + 0.05, y0 + 3.2, y0 + 3.5, t.z0 - 0.05, t.z0 + 0.1, rgb('#4a86b8'), 'solid');
    m.top(t.x0 + th, t.x1 - th, t.z0 + th, t.z1 - th, y0 + 0.4, cellUV('pitch'), rgb('#ffffff'));
    for (const [x, z] of [[t.x0, t.z0], [t.x1, t.z0], [t.x0, t.z1], [t.x1, t.z1]] as const) {
      m.box(x - 0.12, x + 0.12, y0, y0 + 10.5, z - 0.12, z + 0.12, GREY);
      m.box(x - 0.55, x + 0.55, y0 + 10.2, y0 + 10.55, z - 0.3, z + 0.3, rgb('#fff6dc'), 'lamp');
    }
    return;
  }
  const front: '+z' | '-z' = lot.face === 'up' ? '-z' : '+z';
  const look: Look = {
    floors: 1, floorH: 4.4, groundH: 4.4, upper: ['indA', 'indB'], ground: 'hall', bayW: 3,
    tint: rgb(lot.landmark === 'airport' ? '#a8c3d8' : '#d8bf8a'), roof: rgb('#8f9aa3'), tiers: 1, gable: false,
  };
  const y = walls(m, t, GROUND, 1, look, r, front, true, false);
  flatRoof(m, t, y, look);
  const fz0 = lot.face === 'up' ? t.z0 - 1.4 : t.z1, fz1 = lot.face === 'up' ? t.z0 : t.z1 + 1.4;
  m.box(t.x0, t.x1, y - 0.5, y - 0.3, fz0, fz1, WHITE, 'stripes');
  if (lot.landmark === 'airport') {
    const cx = lot.x1 - 1.4, cz = (t.z0 + t.z1) / 2;
    m.box(cx - 0.6, cx + 0.6, y, y + 8, cz - 0.6, cz + 0.6, rgb('#e6e2d8'), 'wall');
    m.wall('+z', cx - 1, cx + 1, cz - 1, cz + 1, y + 8, y + 9.6, 2, () => cellUV('officeStripA'), rgb('#dfe9f0'));
    m.wall('-z', cx - 1, cx + 1, cz - 1, cz + 1, y + 8, y + 9.6, 2, () => cellUV('officeStripA'), rgb('#dfe9f0'));
    m.wall('+x', cx - 1, cx + 1, cz - 1, cz + 1, y + 8, y + 9.6, 2, () => cellUV('officeStripB'), rgb('#dfe9f0'));
    m.wall('-x', cx - 1, cx + 1, cz - 1, cz + 1, y + 8, y + 9.6, 2, () => cellUV('officeStripB'), rgb('#dfe9f0'));
    m.box(cx - 1.1, cx + 1.1, y + 9.6, y + 9.8, cz - 1.1, cz + 1.1, GREY);
  } else {
    roofClutter(m, t, y, r, 'hall', false);
  }
}
