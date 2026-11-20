/**
 * Taxi Rush — street furniture.
 *
 * Benches, bins, hydrants, bollards at the corners, bus shelters and newsstand
 * kiosks, scattered along the pavements — never on the road, and never where a
 * passenger waits (the stops are kept clear). Placement is deterministic and
 * depends on the district: plenty in the centre and the old town, a little in
 * the suburbs, almost none around the harbour and the airport. Everything is
 * drawn with the shared atlas material into the detail layer.
 */
import { Mesher, rgb } from './city';
import { GROUND } from './buildings';
import type { Zone } from './buildings';

const DENSITY: Record<Zone, number> = {
  centre: 1, oldtown: 1, downtown: 0.8, market: 0.6, campus: 0.5, parkside: 0.5, suburbs: 0.35, harbour: 0.12, airport: 0.12, coast: 0.5,
};

const WOOD = rgb('#8a5a3a'), IRON = rgb('#30343a'), BIN = rgb('#3d5a46'), HYD = rgb('#c8302a'), GLASS = rgb('#9fc4d8');
const KIOSK = ['#e8b84a', '#6fa8c8', '#c97a6a', '#8fbf8a'].map(rgb);

interface Side { z: number; s: 1 | -1 }

export interface FurnitureBlock {
  k: number; j: number; bx0: number; bx1: number; bz0: number; bz1: number; zone: Zone;
}

function bench(m: Mesher, x: number, z: number, s: number): void {
  const y = GROUND;
  m.box(x - 0.7, x + 0.7, y + 0.42, y + 0.5, z - 0.22, z + 0.22, WOOD);
  m.box(x - 0.7, x + 0.7, y + 0.55, y + 0.95, z - s * 0.24 - 0.02, z - s * 0.24 + 0.02, WOOD);
  for (const dx of [-0.6, 0.6]) m.box(x + dx - 0.04, x + dx + 0.04, y, y + 0.42, z - 0.2, z + 0.2, IRON);
}
function bin(m: Mesher, x: number, z: number): void {
  m.cyl(x, z, GROUND, GROUND + 0.85, 0.22, 7, BIN, 'solid', true);
  m.box(x - 0.12, x + 0.12, GROUND + 0.85, GROUND + 0.9, z - 0.12, z + 0.12, IRON);
}
function hydrant(m: Mesher, x: number, z: number): void {
  m.cyl(x, z, GROUND, GROUND + 0.7, 0.13, 6, HYD, 'solid', true);
  m.box(x - 0.2, x + 0.2, GROUND + 0.42, GROUND + 0.52, z - 0.06, z + 0.06, HYD);
}
function bollards(m: Mesher, x: number, z: number, dir: number): void {
  for (let i = 0; i < 3; i++) m.cyl(x + dir * i * 0.55, z, GROUND, GROUND + 0.75, 0.09, 6, i % 2 ? rgb('#e8c030') : IRON, 'solid', true);
}
function shelter(m: Mesher, x: number, z: number, s: number): void {
  const y = GROUND, w = 1.4;
  m.box(x - w * 1, x + w * 1, y + 2.4, y + 2.55, z - 0.7, z + 0.7, rgb('#4a6fa5'));
  for (const dx of [-w + 0.05, w - 0.05]) m.box(x + dx - 0.05, x + dx + 0.05, y, y + 2.4, z - 0.65, z - 0.55, IRON);
  m.box(x - w, x + w, y + 0.5, y + 2.2, z - s * 0.66 - 0.02, z - s * 0.66 + 0.02, GLASS);
  m.box(x - 0.7, x + 0.7, y + 0.4, y + 0.47, z - s * 0.15 - 0.2, z - s * 0.15 + 0.2, WOOD);
}
function kiosk(m: Mesher, x: number, z: number, s: number, c: number): void {
  const y = GROUND;
  m.box(x - 0.8, x + 0.8, y, y + 2.3, z - 0.7, z + 0.7, KIOSK[c % KIOSK.length], 'wall');
  m.box(x - 0.95, x + 0.95, y + 2.3, y + 2.5, z - 0.85, z + 0.85, rgb('#c9503a'), 'stripes');
  m.box(x - 0.55, x + 0.55, y + 0.9, y + 1.8, z + s * 0.7, z + s * 0.72, rgb('#3d566d'));
}

/**
 * Furnish both pavements of one block. `stops` are the places' stopping points
 * (x, z) so nothing is put where a passenger waits.
 */
export function furnishBlock(m: Mesher, b: FurnitureBlock, stops: { x: number; z: number }[], rand: () => number): void {
  const d = DENSITY[b.zone];
  const sides: Side[] = [{ z: b.bz0, s: -1 }, { z: b.bz1, s: 1 }];
  const clear = (x: number, z: number, r: number) => stops.every((p) => Math.hypot(p.x - x, p.z - z) > r);
  const shelterHere = d >= 0.5 && (b.k * 7 + b.j * 3 + 100) % 5 === 0;
  for (const sd of sides) {
    const at = (t: number) => sd.z - sd.s * t;
    // corner bollards, on the corner nearest each crossing
    if (rand() < d) { bollards(m, b.bx0 + 0.5, at(0.5), 1); bollards(m, b.bx1 - 0.5, at(0.5), -1); }
    if (shelterHere && sd.s === -1 && clear(b.bx0 + 7.5, at(1.2), 2.6)) shelter(m, b.bx0 + 7.5, at(1.4), sd.s);
    for (let x = b.bx0 + 2.6; x < b.bx1 - 1.6; x += 3.1) {
      const r = rand();
      if (r > d * 0.55) continue;
      const kind = rand();
      const lampNear = Math.abs(((x - b.bx0 - 2 + 3.5) % 7) - 3.5) < 0.9; // lamps stand at bx0+2+7n on the kerb
      if (kind < 0.3 && clear(x, at(2.3), 1.7)) bench(m, x, at(2.3), sd.s);
      else if (kind < 0.6 && !lampNear && clear(x, at(0.9), 1.1)) bin(m, x, at(0.9));
      else if (kind < 0.8 && !lampNear && clear(x, at(0.7), 1.1)) hydrant(m, x, at(0.7));
      else if (kind < 0.88 && d >= 0.6 && clear(x, at(1.7), 2.4)) kiosk(m, x, at(1.7), sd.s, Math.floor(rand() * 4));
    }
  }
}
