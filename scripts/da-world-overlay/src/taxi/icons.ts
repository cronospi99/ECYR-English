/**
 * Taxi Rush — landmarks by kind of place.
 *
 * A passenger asks for "a hospital" or "a gas station"; the building should say
 * so at a glance. `iconFor` maps a place's type to a look, `planLot` carves the
 * yard out of lots that have one (petrol forecourt, school playground), and
 * `emitIcon` adds the telltale pieces — red cross, canopy with pumps, flag and
 * clock, garage door stripe, awnings, a church tower, columns and pediments —
 * to the detail layer, which is switched off at a distance. Types with no look
 * of their own keep the shopfront the atlas already gives them.
 */
import { cellUV } from './textures';
import { Mesher, rgb } from './city';
import { GROUND, groundHeight, type Icon, type Lot } from './buildings';

export function iconFor(type: string): Icon | undefined {
  const t = type.toLowerCase();
  if (/hospital|health centre|clinic|pharmacy/.test(t)) return 'hospital';
  if (/gas station/.test(t)) return 'gas';
  if (/school|kindergarten|university/.test(t)) return 'school';
  if (/police|fire station/.test(t)) return 'service';
  if (/church/.test(t)) return 'church';
  if (/hotel|hostel/.test(t)) return 'hotel';
  if (/\bbank\b/.test(t)) return 'bank';
  if (/library|museum|gallery|theatre|cinema|concert|courthouse|city hall|observatory|planetarium/.test(t)) return 'classic';
  if (/coffee|restaurant|pizzeria|diner|bakery|sushi|steakhouse|burger|fast food|tea house|juice|ice cream|empanada|delicatessen|canteen|bar\b/.test(t)) return 'awning';
  if (/supermarket|grocery|store|shop|market|mall|greengrocer|newsstand|butcher/.test(t)) return 'shop';
  return undefined;
}

/** Depth of the open yard in front of the building, for the types that have one. */
function yardOf(lot: Lot): number {
  const depth = lot.z1 - lot.z0;
  const want = lot.icon === 'gas' ? 1.9 : lot.icon === 'school' ? 1.5 : 0;
  return Math.max(0, Math.min(want, depth - 1.4));
}

/** The lot as the building sees it: pushed back behind its yard. */
export function planLot(lot: Lot): Lot {
  const y = yardOf(lot);
  if (!y) return lot;
  return lot.face === 'up' ? { ...lot, z0: lot.z0 + y } : { ...lot, z1: lot.z1 - y };
}

/** Height of the name sign over the door. */
export function signHeight(lot: Lot): number {
  if (lot.icon === 'school') return GROUND + 1.2;
  return GROUND + groundHeight(lot) - 0.5;
}

const WHITE = rgb('#f2f0ea'), RED = rgb('#d83a3a'), DARK = rgb('#2c3036'), STONE = rgb('#efe9dc');
const AWNINGS = ['#c9503a', '#2f7d5b', '#2f6aa8', '#d6a12e', '#8a4b8f', '#d9703a'].map(rgb);

export function emitIcon(m: Mesher, lot: Lot, top: number, seed: number): void {
  if (!lot.icon) return;
  const up = lot.face === 'up';
  const s = up ? -1 : 1; // outward
  const yard = yardOf(lot);
  const zf = up ? lot.z0 + yard : lot.z1 - yard; // facade plane
  const zl = up ? lot.z0 : lot.z1; // lot front edge
  const x0 = lot.x0, x1 = lot.x1, cx = (x0 + x1) / 2, w = x1 - x0;
  const gh = groundHeight(lot);
  const zr = (a: number, b: number): [number, number] => (s > 0 ? [zf + a, zf + b] : [zf - b, zf - a]);
  const box = (xa: number, xb: number, ya: number, yb: number, a: number, b: number, col = WHITE, cell: 'solid' | 'stripes' | 'lamp' | 'shutter' = 'solid') => {
    const [za, zb] = zr(a, b);
    m.box(xa, xb, ya, yb, za, zb, col, cell);
  };
  const column = (x: number, depth: number, y1: number) => { const z = zf + s * depth; m.cyl(x, z, GROUND, y1, 0.17, 6, STONE, 'solid', true); };
  const pick = AWNINGS[seed % AWNINGS.length];

  switch (lot.icon) {
    case 'hospital': {
      const cy = GROUND + gh + 1.6;
      box(cx - 0.17, cx + 0.17, cy - 0.65, cy + 0.65, 0, 0.07, RED);
      box(cx - 0.65, cx + 0.65, cy - 0.17, cy + 0.17, 0, 0.07, RED);
      // emergency entrance: a canopy with a red edge and lamps under it
      const cw = Math.min(w - 0.3, 3.2);
      box(cx - cw / 2, cx + cw / 2, GROUND + 3.0, GROUND + 3.18, 0, 1.7, WHITE);
      box(cx - cw / 2, cx + cw / 2, GROUND + 2.78, GROUND + 3.0, 1.55, 1.7, RED);
      box(cx - 0.3, cx + 0.3, GROUND + 2.9, GROUND + 2.96, 0.6, 0.9, rgb('#fff0c8'), 'lamp');
      break;
    }
    case 'gas': {
      const y0 = GROUND + 3.7, depth = Math.max(yard, 1.6);
      m.box(x0, x1, y0, y0 + 0.28, ...(up ? [zl, zf] : [zf, zl]) as [number, number], WHITE);
      m.box(x0, x1, y0 - 0.12, y0, ...(up ? [zl, zl + 0.12] : [zl - 0.12, zl]) as [number, number], RED);
      for (const x of [x0 + 0.25, x1 - 0.25]) m.box(x - 0.09, x + 0.09, GROUND, y0, zl - 0.09, zl + 0.09, rgb('#c8c8c0'));
      for (const dx of [-0.7, 0.7]) {
        const z = zf + s * (depth / 2);
        m.box(cx + dx - 0.22, cx + dx + 0.22, GROUND, GROUND + 1.15, z - 0.17, z + 0.17, rgb('#d8d8d0'));
        m.box(cx + dx - 0.23, cx + dx + 0.23, GROUND + 0.75, GROUND + 1.0, z - 0.18, z + 0.18, RED);
      }
      break;
    }
    case 'school': {
      const zs = [zl, zl + s * 0.04].sort((a, b) => a - b) as [number, number];
      m.box(x0, x1, GROUND, GROUND + 0.55, zs[0] - 0.03, zs[1] + 0.03, rgb('#6b7a8a')); // fence
      const sw = Math.min(4.2, Math.max(2.6, w * 1.05));
      for (const x of [cx - sw * 0.4, cx + sw * 0.4]) m.box(x - 0.05, x + 0.05, GROUND, GROUND + 0.8, zl - 0.05, zl + 0.05, DARK);
      // flagpole and flag on the roof corner of the yard
      const fx = x1 - 0.3, fz = zf + s * 0.6;
      m.box(fx - 0.04, fx + 0.04, GROUND, GROUND + 6.2, fz - 0.04, fz + 0.04, rgb('#c8c8c0'));
      m.box(fx - 0.9, fx, GROUND + 5.5, GROUND + 6.1, fz - 0.015, fz + 0.015, rgb('#d8453a'));
      // clock over the door
      const ky = top - 0.9;
      box(cx - 0.45, cx + 0.45, ky - 0.45, ky + 0.45, 0, 0.06, WHITE);
      box(cx - 0.03, cx + 0.03, ky, ky + 0.34, 0.06, 0.1, DARK);
      box(cx, cx + 0.26, ky - 0.03, ky + 0.03, 0.06, 0.1, DARK);
      break;
    }
    case 'service': {
      const col = lot.type?.includes('fire') ? rgb('#c43a2c') : rgb('#2f5fb0');
      box(x0, x1, GROUND + gh - 0.4, GROUND + gh + 0.05, 0, 0.08, col);
      box(x0, x1, top - 0.35, top, 0, 0.08, col);
      // beacon on the roof
      m.box(cx - 0.25, cx + 0.25, top, top + 0.3, (lot.z0 + lot.z1) / 2 - 0.2, (lot.z0 + lot.z1) / 2 + 0.2, col);
      break;
    }
    case 'awning': case 'shop': {
      const aw = w - 0.2, ya = GROUND + 2.75;
      box(cx - aw / 2, cx + aw / 2, ya, ya + 0.1, 0, 1.15, pick, 'stripes');
      box(cx - aw / 2, cx + aw / 2, ya - 0.28, ya + 0.1, 1.05, 1.15, pick, 'stripes');
      if (lot.icon === 'shop') box(x0, x1, GROUND + gh - 0.1, GROUND + gh + 0.45, 0, 0.1, pick);
      break;
    }
    case 'hotel': {
      const cw = Math.min(w - 0.2, 3.4);
      box(cx - cw / 2, cx + cw / 2, GROUND + 3.3, GROUND + 3.55, 0, 2.3, rgb('#7a2630'));
      box(cx - cw / 2, cx + cw / 2, GROUND + 3.0, GROUND + 3.3, 2.15, 2.3, rgb('#7a2630'));
      box(cx - 0.2, cx + 0.2, GROUND + 3.2, GROUND + 3.3, 1.0, 1.4, rgb('#fff0c8'), 'lamp');
      break;
    }
    case 'church': {
      const tw = 0.75;
      const [za, zb] = zr(-0.2, 1.4);
      m.box(cx - tw, cx + tw, GROUND, top + 4, za, zb, rgb('#d3c9b8'), 'wall');
      const zc = (za + zb) / 2;
      m.cone(cx, zc, top + 4, 3.2, 1.05, 4, rgb('#6d5a4e'));
      m.box(cx - 0.04, cx + 0.04, top + 7.1, top + 7.9, zc - 0.04, zc + 0.04, rgb('#d8b84a'));
      m.box(cx - 0.25, cx + 0.25, top + 7.5, top + 7.58, zc - 0.04, zc + 0.04, rgb('#d8b84a'));
      box(cx - 0.35, cx + 0.35, GROUND, GROUND + 1.7, 1.38, 1.44, rgb('#4a3426'));
      break;
    }
    case 'bank': case 'classic': {
      const n = Math.max(3, Math.round(w / 0.9));
      const ch = GROUND + gh + (lot.icon === 'classic' ? 0.4 : 0);
      for (let i = 0; i < n; i++) column(x0 + 0.3 + (w - 0.6) * (i / (n - 1)), 0.55, ch);
      box(x0 + 0.05, x1 - 0.05, ch, ch + 0.4, 0, 0.8, STONE);
      box(x0 - 0.05, x1 + 0.05, GROUND, GROUND + 0.2, 0, 1.2, STONE);
      if (lot.icon === 'classic') {
        // pediment: a triangle on the front and a gable block behind it
        const ph = 0.9, [za, zb] = zr(0.8, 0.84);
        const mid: [number, number] = [(cellUV('wall')[0] + cellUV('wall')[2]) / 2, cellUV('wall')[3]];
        const uv = cellUV('wall');
        const y = ch + 0.4;
        if (s > 0) m.tri([x0 - 0.05, y, zb], [x1 + 0.05, y, zb], [cx, y + ph, zb], [uv[0], uv[1]], [uv[2], uv[1]], mid, STONE);
        else m.tri([x1 + 0.05, y, za], [x0 - 0.05, y, za], [cx, y + ph, za], [uv[0], uv[1]], [uv[2], uv[1]], mid, STONE);
      }
      break;
    }
    default:
  }
}
