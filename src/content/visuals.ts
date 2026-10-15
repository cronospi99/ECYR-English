import type { CefrLevel } from './types';

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
