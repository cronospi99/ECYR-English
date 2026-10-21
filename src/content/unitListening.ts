/**
 * Listening tracks for every unit of the level books, written with that
 * unit's theme, vocabulary and grammar. One file per level
 * (unit-listening-a1.json …), keyed by unit number, each track shaped like a
 * library track (LibTrack). A level without its file simply has none yet.
 */
import type { LibTrack } from './library';
import type { CefrLevel } from './types';

export type UnitListeningMap = Record<string, LibTrack[]>;

const files = import.meta.glob<{ default: UnitListeningMap }>('./generated/unit-listening-*.json');
const cache = new Map<CefrLevel, Promise<UnitListeningMap>>();

function loadLevelFile(level: CefrLevel): Promise<UnitListeningMap> {
  if (!cache.has(level)) {
    const load = files[`./generated/unit-listening-${level.toLowerCase()}.json`];
    const empty: UnitListeningMap = {};
    // A failed chunk load (e.g. offline) is not cached, so the next visit retries.
    cache.set(level, load ? load().then((m) => (m.default && typeof m.default === 'object' ? m.default : empty), () => (cache.delete(level), empty)) : Promise.resolve(empty));
  }
  return cache.get(level)!;
}

/** The listening tracks of one unit (empty when the level or the unit has none). */
export async function loadUnitListenings(level: CefrLevel, unit: number): Promise<LibTrack[]> {
  const list = (await loadLevelFile(level))[String(unit)];
  // Only well-formed tracks: a half-written entry must not break the unit page.
  return Array.isArray(list) ? list.filter((t) => t && t.id && Array.isArray(t.lines) && t.lines.length && Array.isArray(t.speakers) && t.speakers.length).map((t) => ({ ...t, level: t.level ?? level, questions: t.questions ?? [] })) : [];
}
