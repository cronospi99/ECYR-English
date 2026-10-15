/**
 * Practice library: original graded readings and listening tracks, grammar
 * workshops and vocabulary banks, all written for ECYR English. Each bank may
 * be split over several generated files (library-readings-1.json, -2…), so
 * they are gathered with a glob: adding a file needs no code change.
 */
import type { CefrLevel } from './types';

// --------------------------------------------------------------- questions --

export type LibQuestion =
  | { type: 'mc' | 'vocab' | 'heading'; q: string; options: string[]; answer: number; explain_es?: string }
  | { type: 'tf'; q: string; answer: 'T' | 'F' | 'NG'; explain_es?: string }
  | { type: 'gap' | 'transform' | 'error' | 'order'; q: string; answer: string; accept?: string[]; explain_es?: string };

// ----------------------------------------------------------------- reading --

export interface LibReading {
  id: string;
  title: string;
  level: CefrLevel;
  genre: string;
  topic: string;
  emoji: string;
  words: number;
  paragraphs: string[];
  glossary: [string, string][];
  questions: LibQuestion[];
}

// --------------------------------------------------------------- listening --

export interface LibTrack {
  id: string;
  title: string;
  level: CefrLevel;
  kind: string;
  topic: string;
  emoji: string;
  speakers: { name: string; voice: 'male' | 'female'; accent: 'us' | 'uk' | 'au' }[];
  lines: { s: number; text: string }[];
  questions: LibQuestion[];
  dictation?: string[];
}

// --------------------------------------------------------------- workshops --

export interface Workshop {
  id: string;
  level: CefrLevel;
  title: string;
  titleEs: string;
  emoji: string;
  summary_es: string;
  rules: { h: string; body_es: string; table?: string[][]; examples?: string[] }[];
  mistakes: { wrong: string; right: string; why_es: string }[];
  sets: { type: 'mc' | 'gap' | 'order' | 'error' | 'transform'; title: string; items: LibQuestion[] }[];
}

// -------------------------------------------------------------- vocabulary --

export interface LinkingCategory {
  id: string;
  en: string;
  es: string;
  emoji: string;
  color: string;
  use_es: string;
  tip_es: string;
  items: { w: string; es: string; ex: string; pos: 'start' | 'mid' | 'both'; register: 'formal' | 'neutral' | 'informal'; level: CefrLevel; note_es?: string }[];
}

export interface AdverbType {
  id: string;
  en: string;
  es: string;
  emoji: string;
  color: string;
  q: string;
  q_es: string;
  rule_es: string;
  formation_es?: string;
  items: { w: string; es: string; ex: string; level: CefrLevel; from?: string; expr?: boolean }[];
}

export interface AdjectiveCategory {
  id: string;
  en: string;
  es: string;
  emoji: string;
  color: string;
  tip_es?: string;
  items: { w: string; es: string; emoji: string; opp?: string; ex: string; level: CefrLevel; comp?: string }[];
}

// ----------------------------------------------------------------- loaders --

type Mod<T> = { default: T };
const readings = import.meta.glob<Mod<LibReading[]>>('./generated/library-readings-*.json');
const tracks = import.meta.glob<Mod<LibTrack[]>>('./generated/library-listening-*.json');
const workshops = import.meta.glob<Mod<Workshop[]>>('./generated/workshops-*.json');
const vocab = import.meta.glob<Mod<unknown>>('./generated/vocab-*.json');

const cache = new Map<string, Promise<unknown>>();
function once<T>(key: string, load: () => Promise<T>): Promise<T> {
  if (!cache.has(key)) cache.set(key, load());
  return cache.get(key) as Promise<T>;
}
const LEVEL_ORDER = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const byLevel = <T extends { level: CefrLevel }>(a: T, b: T) => LEVEL_ORDER.indexOf(a.level) - LEVEL_ORDER.indexOf(b.level);
async function all<T extends { level: CefrLevel }>(files: Record<string, () => Promise<Mod<T[]>>>): Promise<T[]> {
  const parts = await Promise.all(Object.keys(files).sort().map((k) => files[k]!()));
  return parts.flatMap((m) => m.default).sort(byLevel);
}

export const loadLibReadings = () => once('lib-readings', () => all(readings));
export const loadLibTracks = () => once('lib-tracks', () => all(tracks));
export const loadWorkshops = () => once('workshops', () => all(workshops));

async function vocabFile<T>(name: string, pick: (d: never) => T, empty: T): Promise<T> {
  const load = vocab[`./generated/vocab-${name}.json`];
  return load ? pick((await load()).default as never) : empty;
}
export const loadLinking = () => once('vocab-linking', () => vocabFile<LinkingCategory[]>('linking', (d: { categories: LinkingCategory[] }) => d.categories, []));
export const loadAdverbs = () => once('vocab-adverbs', () => vocabFile<AdverbType[]>('adverbs', (d: { types: AdverbType[] }) => d.types, []));
export const loadAdjectives = () => once('vocab-adjectives', () => vocabFile<AdjectiveCategory[]>('adjectives', (d: { categories: AdjectiveCategory[] }) => d.categories, []));

// --------------------------------------------------------------- checking --

const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[‘’`´]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[.,!?;:"]+$/g, '')
    .replace(/^[¿¡"]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();

function lev(a: string, b: string) {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array<number>(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0]![j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      d[i]![j] = Math.min(d[i - 1]![j]! + 1, d[i]![j - 1]! + 1, d[i - 1]![j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
  return d[a.length]![b.length]!;
}

/** Checks a typed answer: case, punctuation and accepted alternatives; one-letter slips on long words count as "almost". */
export function checkTyped(given: string, answer: string, accept: string[] = []): 'right' | 'almost' | 'wrong' {
  const g = norm(given);
  if (!g) return 'wrong';
  const ok = [answer, ...accept].map(norm);
  if (ok.includes(g)) return 'right';
  if (ok.some((a) => a.length >= 5 && lev(a, g) === 1)) return 'almost';
  return 'wrong';
}
