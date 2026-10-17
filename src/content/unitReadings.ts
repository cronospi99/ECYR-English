/**
 * Extra graded readings for every unit of the level books: two or more per
 * unit, written with that unit's theme, vocabulary and grammar. One file per
 * level (unit-readings-a1.json …), keyed by unit number; a level without its
 * file simply has none yet.
 */
import type { LibReading } from './library';
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

/** The readings for one unit (empty when the level or unit has none). */
export const loadUnitReadingList = (level: CefrLevel, unit: number) => loadUnitReadings(level).then((m) => m[String(unit)] ?? []);
