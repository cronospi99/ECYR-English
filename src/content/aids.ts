import type { CefrLevel } from './types';

/**
 * Extra graphic aids for each grammar point, keyed "A1-2-0" (level-unit-point).
 * Files: src/content/generated/aids-<level>.json. Each point has 2–3 aids of the
 * kinds that suit it. Text inside **double asterisks** is the part to highlight.
 * Spanish fields (es, note, label, if, title) explain; English fields exemplify.
 */
export type Aid =
  /** A sentence changing step by step (affirmative → negative → question, active → passive…), joined by arrows. */
  | { kind: 'transform'; title: string; steps: { label: string; sentence: string; change?: string }[] }
  /** Words placed on a scale (frequency 0–100 %, certainty, formality, intensity). */
  | { kind: 'scale'; title: string; from: string; to: string; items: { word: string; value: number; example: string; es?: string }[] }
  /** "Which one do I use?": a question in Spanish with branches, each leading to a form and an example. */
  | { kind: 'choose'; title: string; question: string; branches: { if: string; use: string; example: string }[] }
  /** Picture cards: emoji + English + Spanish (vocabulary-like points, prepositions, objects, actions). */
  | { kind: 'pictures'; title: string; items: { emoji: string; en: string; es: string }[] }
  /** Minimal pairs: two close sentences and what changes in meaning. */
  | { kind: 'pairs'; title: string; items: { a: string; b: string; note: string }[] };

const files = import.meta.glob<{ default: Record<string, Aid[]> }>('./generated/aids-*.json');
const cache = new Map<string, Promise<Record<string, Aid[]>>>();

export function loadAids(level: CefrLevel): Promise<Record<string, Aid[]>> {
  const key = level.toLowerCase();
  if (!cache.has(key)) {
    const load = files[`./generated/aids-${key}.json`];
    cache.set(key, load ? load().then((m) => m.default) : Promise.resolve({}));
  }
  return cache.get(key)!;
}

/**
 * Drills with model answers, keyed like the aids. For points whose book drill
 * exists, `items` repeat the book's items in order and `answers` give the
 * expected sentence for each; points without a book drill (all of C1) get a new one.
 * Files: src/content/generated/drills-<level>.json.
 */
export interface DrillExtra {
  name?: string;
  /** Spanish instruction. */
  prompt?: string;
  items: string[];
  answers: string[];
}

const drillFiles = import.meta.glob<{ default: Record<string, DrillExtra> }>('./generated/drills-*.json');
const drillCache = new Map<string, Promise<Record<string, DrillExtra>>>();

export function loadDrills(level: CefrLevel): Promise<Record<string, DrillExtra>> {
  const key = level.toLowerCase();
  if (!drillCache.has(key)) {
    const load = drillFiles[`./generated/drills-${key}.json`];
    drillCache.set(key, load ? load().then((m) => m.default) : Promise.resolve({}));
  }
  return drillCache.get(key)!;
}
