/**
 * Extra graded readings for every unit of the level books: two or more per
 * unit, written with that unit's theme, vocabulary and grammar. One file per
 * level (unit-readings-a1.json …), keyed by unit number; a level without its
 * file simply has none yet.
 */
import { loadLibReadings, type LibReading } from './library';
import type { CefrLevel } from './types';

export type UnitReadingMap = Record<string, LibReading[]>;

const files = import.meta.glob<{ default: UnitReadingMap }>('./generated/unit-readings-*.json');
const cache = new Map<CefrLevel, Promise<UnitReadingMap>>();

export function loadUnitReadings(level: CefrLevel): Promise<UnitReadingMap> {
  if (!cache.has(level)) {
    const load = files[`./generated/unit-readings-${level.toLowerCase()}.json`];
    const empty: UnitReadingMap = {};
    // A failed chunk load (e.g. offline) is not cached, so the next visit retries.
    cache.set(level, load ? load().then((m) => m.default, () => (cache.delete(level), empty)) : Promise.resolve(empty));
  }
  return cache.get(level)!;
}

/** Practice-library readings that also belong in a unit, by id (the stories with tense highlighting). */
const LIBRARY_LINKS: Record<string, string[]> = {
  'A2-1': ['r4-a2-cellphone-case-past'],
  'A2-12': ['r4-b1-cellphone-case-four-tenses'],
  'B1-4': ['r4-b1-cellphone-case-four-tenses'],
  'B2-6': ['r4-b2-short-circuit', 'r4-b1-cellphone-case-four-tenses'],
  'C1-1': ['r4-b2-short-circuit'],
};

/** The readings for one unit (empty when the level or unit has none). */
export async function loadUnitReadingList(level: CefrLevel, unit: number): Promise<LibReading[]> {
  const own = (await loadUnitReadings(level))[String(unit)] ?? [];
  const ids = LIBRARY_LINKS[`${level}-${unit}`];
  if (!ids) return own;
  const lib = await loadLibReadings();
  return [...own, ...ids.map((id) => lib.find((r) => r.id === id)).filter((r): r is LibReading => !!r)];
}
