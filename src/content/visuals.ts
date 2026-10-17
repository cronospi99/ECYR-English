import type { CefrLevel } from './types';
import cutSpec from './visual-cuts.json';

/**
 * Infographics and visual aids, and where each one belongs pedagogically.
 * Files live in public/visuals (`<id>.webp` + `<id>-thumb.webp`, made with
 * `node scripts/add-visual.mjs <image> <id>`). To add one: run the script, paste
 * its entry here and declare its places — units, sections, grammar modules,
 * reading guides or practice pages. Everything else picks it up.
 */
export type UnitSection = 'overview' | 'vocab' | 'grammar';

export type VisualPlace =
  /** A unit tab, e.g. { unit: 'A1-9', section: 'vocab' }. `focus` names the grammar point it explains. */
  | { unit: string; section: UnitSection; focus?: string }
  /** A grammar module page (/learn/grammar/<slug>). */
  | { module: 'modals' | 'time-machine' | 'time-family' | 'verbs' }
  /** A travel guide in Reading (by country name as in travel-guides.json). */
  | { guide: string }
  /** A practice page (/practice/<page>). */
  | { practice: 'reading' | 'listening' | 'speaking' | 'writing' | 'phrasal-verbs' };

export interface Visual {
  id: string;
  title: string;
  /** Spanish one-liner shown under the title: what it helps with. */
  titleEs: string;
  w: number;
  h: number;
  levels: CefrLevel[];
  kind: 'grammar' | 'vocabulary' | 'functions';
  tags: string[];
  places: VisualPlace[];
}

export const VISUALS: Visual[] = [
  {
    id: 'english-tenses',
    title: 'English Tenses',
    titleEs: 'Los 5 tiempos clave: uso, estructura y línea de tiempo',
    w: 1536,
    h: 1024,
    levels: ['A1', 'A2'],
    kind: 'grammar',
    tags: ['present simple', 'past simple', 'present continuous', 'past continuous', 'present perfect', 'tenses'],
    places: [
      { unit: 'A1-2', section: 'grammar', focus: 'Present simple' },
      { unit: 'A1-5', section: 'grammar', focus: 'Present continuous' },
      { unit: 'A1-16', section: 'grammar', focus: 'Comparing tenses' },
      { unit: 'A2-9', section: 'grammar', focus: 'Time contrast' },
    ],
  },
  {
    id: 'past-tenses',
    title: 'Past Tenses in English',
    titleEs: 'Los 4 pasados: uso, estructura, ejemplos y línea de tiempo',
    w: 1199,
    h: 1312,
    levels: ['A1', 'A2', 'B1', 'B2'],
    kind: 'grammar',
    tags: ['past simple', 'past continuous', 'past perfect', 'past perfect continuous', 'narrative tenses'],
    places: [
      { unit: 'A1-7', section: 'grammar', focus: 'Past simple' },
      { unit: 'A2-1', section: 'grammar', focus: 'Simple past' },
      { unit: 'A2-12', section: 'grammar', focus: 'Past continuous vs simple past' },
      { unit: 'B1-4', section: 'grammar', focus: 'Past perfect' },
      { unit: 'B2-6', section: 'grammar', focus: 'Past perfect and time adverbs' },
      { module: 'time-machine' },
    ],
  },
  {
    id: 'present-perfect-vs-past-simple',
    title: 'Present Perfect vs Past Simple',
    titleEs: 'Cuándo usar cada uno, con marcadores de tiempo y ejemplos',
    w: 1024,
    h: 1536,
    levels: ['A1', 'A2', 'B1', 'B2'],
    kind: 'grammar',
    tags: ['present perfect', 'past simple', 'already', 'yet', 'ever', 'since', 'for'],
    places: [
      { unit: 'A1-10', section: 'grammar', focus: 'Present perfect vs past simple' },
      { unit: 'A2-4', section: 'grammar', focus: 'Simple past vs present perfect' },
      { unit: 'B1-16', section: 'grammar', focus: 'Accomplishments' },
      { unit: 'B2-6', section: 'grammar', focus: 'Present perfect vs. simple past' },
    ],
  },
  {
    id: 'all-conditionals',
    title: 'All the Conditionals',
    titleEs: 'Cero, primero, segundo, tercero y mixtos en una sola vista',
    w: 1024,
    h: 1536,
    levels: ['A2', 'B1', 'B2', 'C1'],
    kind: 'grammar',
    tags: ['conditionals', 'if clauses', 'zero conditional', 'first conditional', 'second conditional', 'third conditional', 'mixed conditionals'],
    places: [
      { unit: 'A2-9', section: 'grammar', focus: 'first conditional' },
      { unit: 'A2-15', section: 'grammar', focus: 'second conditional' },
      { unit: 'B1-11', section: 'grammar', focus: 'hypothetical past' },
      { unit: 'B2-11', section: 'grammar', focus: 'Present unreal conditional' },
      { unit: 'B2-12', section: 'grammar', focus: 'Mixed conditionals' },
      { unit: 'C1-12', section: 'grammar', focus: 'inversion in conditionals' },
    ],
  },
  {
    id: 'second-conditional',
    title: 'The Second Conditional',
    titleEs: 'Situaciones imaginarias: estructura, ejemplos y respuestas cortas',
    w: 1181,
    h: 1331,
    levels: ['A2', 'B1', 'B2'],
    kind: 'grammar',
    tags: ['second conditional', 'if + past simple', 'would'],
    places: [
      { unit: 'A2-15', section: 'grammar', focus: 'second conditional' },
      { unit: 'B2-11', section: 'grammar', focus: 'Present unreal conditional' },
    ],
  },
  {
    id: 'could',
    title: 'Could',
    titleEs: 'Habilidad pasada, posibilidad, peticiones y sugerencias',
    w: 1024,
    h: 1536,
    levels: ['A1', 'A2', 'B1'],
    kind: 'grammar',
    tags: ['could', 'modals', 'requests', 'suggestions', 'possibility', 'ability'],
    places: [
      { unit: 'A1-12', section: 'grammar', focus: 'Suggestions and requests with can, could and should' },
      { unit: 'A2-6', section: 'grammar', focus: 'Requests with modals' },
      { unit: 'A2-14', section: 'grammar', focus: 'degrees of certainty' },
      { unit: 'B1-3', section: 'grammar', focus: 'Requests with modals' },
      { module: 'modals' },
    ],
  },
  {
    id: 'modals-machu-picchu',
    title: 'Can, Should & Must · Machu Picchu',
    titleEs: 'Permiso, consejo y obligación en un destino real',
    w: 1536,
    h: 1024,
    levels: ['A1', 'A2'],
    kind: 'functions',
    tags: ['can', 'should', 'must', 'travel', 'rules', 'advice'],
    places: [
      { unit: 'A1-11', section: 'grammar', focus: 'Modals “can” and “should”' },
      { unit: 'A2-14', section: 'grammar', focus: 'Permission, obligation and prohibition' },
      { module: 'modals' },
    ],
  },
  {
    id: 'modals-santorini',
    title: 'Can, Should & Must · Santorini',
    titleEs: 'Permiso, consejo y obligación en un destino real',
    w: 1536,
    h: 1024,
    levels: ['A1', 'A2'],
    kind: 'functions',
    tags: ['can', 'should', 'must', 'travel', 'rules', 'advice'],
    places: [
      { unit: 'A2-5', section: 'grammar', focus: 'Modals for necessity and suggestion' },
      { unit: 'A1-11', section: 'grammar', focus: 'Modals “can” and “should”' },
      { guide: 'Greece' },
      { module: 'modals' },
    ],
  },
  {
    id: 'modals-kyoto',
    title: 'Can, Should & Must · Kyoto',
    titleEs: 'Permiso, consejo y obligación en un destino real',
    w: 1536,
    h: 1024,
    levels: ['A1', 'A2'],
    kind: 'functions',
    tags: ['can', 'should', 'must', 'travel', 'rules', 'advice', 'culture'],
    places: [
      { unit: 'A2-14', section: 'grammar', focus: 'Permission, obligation and prohibition' },
      { unit: 'A2-5', section: 'grammar', focus: 'Modals for necessity and suggestion' },
      { guide: 'Japan' },
      { module: 'modals' },
    ],
  },
  {
    id: 'uses-of-get',
    title: 'The Many Uses of GET',
    titleEs: '12 significados de get con ejemplos y combinaciones frecuentes',
    w: 1024,
    h: 1536,
    levels: ['A2', 'B1', 'B2'],
    kind: 'vocabulary',
    tags: ['get', 'phrasal verbs', 'collocations', 'get something done'],
    places: [
      { unit: 'B1-9', section: 'grammar', focus: 'Get or have something done' },
      { practice: 'phrasal-verbs' },
      { module: 'verbs' },
    ],
  },
  {
    id: 'describing-problems',
    title: 'Describing Problems',
    titleEs: 'Daños y averías: participios como adjetivos, sustantivos, need + -ing / to be done y keep + -ing',
    w: 1536,
    h: 1024,
    levels: ['B1'],
    kind: 'grammar',
    tags: ['describing problems', 'past participles as adjectives', 'need + gerund', 'need + passive infinitive', 'keep + gerund', 'broken', 'repairs'],
    places: [
      { unit: 'B1-6', section: 'grammar', focus: 'Describing problems with past participles as adjectives and with nouns' },
      { unit: 'B1-6', section: 'overview' },
      { module: 'verbs' },
    ],
  },
  {
    id: 'physical-appearance',
    title: 'Physical Appearance Adjectives',
    titleEs: '42 formas de describir a una persona, con dibujos',
    w: 1024,
    h: 1536,
    levels: ['A1', 'A2'],
    kind: 'vocabulary',
    tags: ['appearance', 'describing people', 'hair', 'adjectives'],
    places: [
      { unit: 'A1-9', section: 'vocab' },
      { unit: 'A1-9', section: 'overview' },
      { unit: 'A2-13', section: 'vocab' },
      { unit: 'C1-2', section: 'vocab' },
    ],
  },
  {
    id: 'house-appliances-furniture',
    title: 'Parts of the House · Appliances & Furniture',
    titleEs: 'Electrodomésticos y muebles con sus partes señaladas',
    w: 1536,
    h: 1024,
    levels: ['A1', 'A2', 'B1'],
    kind: 'vocabulary',
    tags: ['house', 'home', 'furniture', 'appliances', 'there is / there are'],
    places: [
      { unit: 'A1-8', section: 'vocab' },
      { unit: 'A1-5', section: 'vocab' },
      { unit: 'B1-6', section: 'vocab' },
    ],
  },
  {
    id: 'clothing-winter',
    title: 'Winter Clothing Vocabulary',
    titleEs: '25 prendas de invierno con su nombre en inglés de EE. UU. y del Reino Unido',
    w: 1536,
    h: 1024,
    levels: ['A1'],
    kind: 'vocabulary',
    tags: ['clothes', 'clothing', 'winter', 'US vs UK English', 'to wear'],
    places: [{ unit: 'A1-9', section: 'vocab' }],
  },
  {
    id: 'clothing-autumn',
    title: 'Autumn Clothing Vocabulary',
    titleEs: 'Ropa de otoño: suéteres, chaquetas, pantalones y botas (US / UK)',
    w: 1536,
    h: 1024,
    levels: ['A1'],
    kind: 'vocabulary',
    tags: ['clothes', 'clothing', 'autumn', 'fall', 'US vs UK English', 'to wear'],
    places: [{ unit: 'A1-9', section: 'vocab' }],
  },
  {
    id: 'clothing-spring',
    title: 'Spring Clothing Vocabulary',
    titleEs: 'Ropa de primavera: chaquetas ligeras, vestidos, faldas y zapatos (US / UK)',
    w: 1536,
    h: 1024,
    levels: ['A1'],
    kind: 'vocabulary',
    tags: ['clothes', 'clothing', 'spring', 'US vs UK English', 'shopping'],
    places: [{ unit: 'A1-3', section: 'vocab' }],
  },
  {
    id: 'clothing-summer',
    title: 'Summer Clothing Vocabulary',
    titleEs: 'Ropa de verano y de playa: camisetas, shorts, vestidos de baño y sandalias (US / UK)',
    w: 1536,
    h: 1024,
    levels: ['A1'],
    kind: 'vocabulary',
    tags: ['clothes', 'clothing', 'summer', 'beach', 'US vs UK English', 'shopping'],
    places: [{ unit: 'A1-3', section: 'vocab' }],
  },
  {
    id: 'clothing-colombia',
    title: 'Colombian Clothing Outfits',
    titleEs: 'Prendas y trajes típicos de Colombia en inglés: vueltiao, ruana, pollera, llanero, palenquera',
    w: 1536,
    h: 1024,
    levels: ['A1'],
    kind: 'vocabulary',
    tags: ['clothes', 'clothing', 'Colombia', 'traditional outfits', 'culture', 'US vs UK English'],
    places: [
      { unit: 'A1-3', section: 'vocab' },
      { unit: 'A1-9', section: 'vocab' },
    ],
  },
];

export const visualUrl = (v: Visual, thumb = false) => `/visuals/${v.id}${thumb ? '-thumb' : ''}.webp`;

/** Visuals declared for a unit tab, in declaration order. */
export function visualsForUnit(unitKey: string, section: UnitSection): (Visual & { focus?: string })[] {
  const out: (Visual & { focus?: string })[] = [];
  for (const v of VISUALS)
    for (const p of v.places)
      if ('unit' in p && p.unit === unitKey && p.section === section) out.push({ ...v, focus: p.focus });
  return out;
}

export const visualsWhere = (pred: (p: VisualPlace) => boolean) => VISUALS.filter((v) => v.places.some(pred));

// ------------------------------------------------------------------- cuts --


/** One panel of an infographic (scripts/cut-visuals.mjs), shown inside the lesson it explains. */
export interface VisualCut {
  id: string;
  /** The infographic it was cut from. */
  of: string;
  rects: number[][];
  title: string;
  titleEs: string;
  /** Regex tested against grammar point / workshop names. */
  match: string;
  /** Lower comes first when several cuts match. */
  prio: number;
  w: number;
  h: number;
  /** Unit vocabulary tabs it also illustrates. */
  vocab?: string[];
  /** Adjective category in Práctica → Vocabulario. */
  adjectives?: string;
}

export const VISUAL_CUTS = cutSpec as VisualCut[];
const PARENT = new Map(VISUALS.map((v) => [v.id, v]));
const RE = new Map(VISUAL_CUTS.map((c) => [c.id, new RegExp(c.match, 'i')]));

/** A cut as a Visual, so cards and the lightbox treat it like any infographic. */
export function cutVisual(c: VisualCut): Visual & { parent: Visual } {
  const parent = PARENT.get(c.of)!;
  return { ...parent, id: `cuts/${c.id}`, title: c.title, titleEs: c.titleEs, w: c.w, h: c.h, places: [], parent };
}

/** Cuts whose `match` fits any of the given names (a grammar point, a workshop…), best first. */
export function cutsFor(...names: (string | undefined)[]): (Visual & { parent: Visual })[] {
  const text = names.filter(Boolean).join(' · ');
  if (!text) return [];
  return VISUAL_CUTS.filter((c) => RE.get(c.id)!.test(text))
    .sort((a, b) => a.prio - b.prio)
    .map(cutVisual);
}

export const cutsWhere = (pred: (c: VisualCut) => boolean) => VISUAL_CUTS.filter(pred).sort((a, b) => a.prio - b.prio).map(cutVisual);

// ------------------------------------------------------------ unit plan --

const STOP = new Set('a an the and or of to in on at for with vs versus by as is are be from about into using use'.split(' '));
const words = (s: string) =>
  s
    .toLowerCase()
    .replace(/[“”"‘’'().,:;!?/+…-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 1 && !STOP.has(w));

/** How well `phrase` describes `name`: 2 when it is contained in it, else the share of its words found there (0–1). */
export function matchScore(phrase: string, name: string): number {
  const a = words(phrase);
  const b = new Set(words(name));
  if (!a.length || !b.size) return 0;
  if (` ${words(name).join(' ')} `.includes(` ${a.join(' ')} `)) return 2;
  return a.filter((w) => b.has(w)).length / a.length;
}

/** Index of the point a phrase belongs to (first best match), or -1 under `min`. */
function bestPoint(phrases: string[], names: string[], min: number): number {
  let best = -1;
  let score = min;
  names.forEach((n, i) => {
    const s = Math.max(0, ...phrases.map((p) => matchScore(p, n)));
    if (s > score || (best < 0 && s >= score && s > 0)) {
      best = i;
      score = s;
    }
  });
  return best;
}

export interface UnitVisualPlan {
  /** Infographics to show inside each grammar lesson (same order as the points). */
  points: Visual[][];
  /** "Mira y aprende" figures for the vocabulary tab: the cut panels first, then the whole infographics. */
  vocab: Visual[];
  /** Overview infographics that no lesson or the vocabulary tab already shows. */
  overview: Visual[];
}

/**
 * Where each infographic declared for a unit goes: grammar ones into the lesson
 * whose name fits their `focus` (else the most related point, else the first),
 * vocabulary ones next to the words, overview ones into a lesson they clearly
 * explain or else the overview.
 */
export function unitVisualPlan(unitKey: string, pointNames: string[]): UnitVisualPlan {
  const points: Visual[][] = pointNames.map(() => []);
  const placed = new Set<string>();
  const put = (i: number, v: Visual) => {
    if (!points[i] || points[i]!.some((x) => x.id === v.id)) return;
    points[i]!.push(v);
    placed.add(v.id);
  };
  for (const v of visualsForUnit(unitKey, 'grammar')) {
    const i = v.focus ? bestPoint([v.focus], pointNames, 0.3) : -1;
    put(i >= 0 ? i : Math.max(0, bestPoint([...v.tags, v.title], pointNames, 0.3)), v);
  }
  const vocab: Visual[] = [];
  for (const v of [...cutsWhere((c) => !!c.vocab?.includes(unitKey)), ...visualsForUnit(unitKey, 'vocab')])
    if (!vocab.some((x) => x.id === v.id)) vocab.push(v);
  vocab.forEach((v) => placed.add(v.id));
  const overview: Visual[] = [];
  for (const v of visualsForUnit(unitKey, 'overview')) {
    if (placed.has(v.id)) continue;
    const i = bestPoint(v.focus ? [v.focus] : [...v.tags, v.title], pointNames, 0.99);
    if (i >= 0) put(i, v);
    else overview.push(v);
  }
  return { points, vocab, overview };
}
