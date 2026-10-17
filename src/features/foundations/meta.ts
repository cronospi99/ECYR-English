/**
 * Where the Foundations material lives now.
 *  - Pre-A1 · Foundations (/learn/foundations): 10 topics, foundations-prea1.json.
 *  - Every other topic of the old English Foundations course (a1-foundations.json,
 *    still the full bank) is shown inside the A1/A2 grammar point it belongs to.
 */

/** Pre-A1 topic ids in course order (must match foundations-prea1.json). */
export const PREA1_TOPICS = [
  'alphabet',
  'greetings',
  'verb-be',
  'possessives',
  'numbers',
  'punctuation',
  'this-that',
  'wh-questions',
  'clothing',
  'possessive-s',
] as const;

export const PREA1 = {
  title: 'Foundations',
  nameEs: 'Inicial',
  color: 'var(--red)',
  tint: 'from-[#d6202b] to-[#c25e00]',
  description: 'Antes de A1: el alfabeto, saludos, to be, números, signos, preguntas y la ropa, explicados en español.',
  canDo: ['Saludar, presentarte y despedirte', 'Deletrear, contar y dar precios', 'Hacer preguntas sencillas'],
};

/** A grammar point: `${level}-${unit}` + index of the point in that unit. */
export interface FoundationPlace {
  unitKey: string;
  point: number;
}

/** Old bank topic → the A1/A2 grammar point it now belongs to. */
export const FOUNDATION_MAP: Record<string, FoundationPlace> = {
  'questions-be': { unitKey: 'A1-1', point: 1 },
  jobs: { unitKey: 'A1-1', point: 0 },
  'do-does': { unitKey: 'A1-2', point: 0 },
  'present-simple': { unitKey: 'A1-2', point: 0 },
  prepositions: { unitKey: 'A1-2', point: 1 },
  'a-an-plurals': { unitKey: 'A1-3', point: 0 },
  adjectives: { unitKey: 'A1-3', point: 1 },
  comparatives: { unitKey: 'A1-3', point: 1 },
  'object-pronouns': { unitKey: 'A1-4', point: 0 },
  'word-order': { unitKey: 'A1-4', point: 0 },
  'would-like': { unitKey: 'A1-4', point: 1 },
  'present-continuous': { unitKey: 'A1-5', point: 0 },
  'simple-vs-continuous': { unitKey: 'A1-5', point: 0 },
  'adv-frequency': { unitKey: 'A1-6', point: 0 },
  'can-cant': { unitKey: 'A1-6', point: 1 },
  'adv-manner': { unitKey: 'A1-6', point: 1 },
  'past-simple-reg': { unitKey: 'A1-7', point: 0 },
  'past-simple-negq': { unitKey: 'A1-7', point: 0 },
  'was-were': { unitKey: 'A1-7', point: 1 },
  'there-is-are': { unitKey: 'A1-8', point: 0 },
  articles: { unitKey: 'A1-8', point: 0 },
  'much-many': { unitKey: 'A1-8', point: 1 },
  'have-got': { unitKey: 'A1-9', point: 0 },
  conjunctions: { unitKey: 'A1-11', point: 0 },
  superlatives: { unitKey: 'A1-14', point: 0 },
  'be-going-to': { unitKey: 'A1-15', point: 0 },
  'verbs-inf-ing': { unitKey: 'A1-16', point: 1 },
  'a-some-any': { unitKey: 'A2-2', point: 0 },
  'will-shall': { unitKey: 'A2-5', point: 0 },
  imperatives: { unitKey: 'A2-7', point: 1 },
};

/** Grammar points that build on a Pre-A1 topic: a "repasa" link is shown there. */
export const PREA1_REVIEW: Record<string, string[]> = {
  'A1-1-0': ['verb-be', 'possessives'],
  'A1-1-1': ['wh-questions', 'verb-be'],
  'A1-3-0': ['this-that'],
  'A1-4-0': ['wh-questions'],
  'A1-5-0': ['clothing'],
  'A1-9-0': ['wh-questions', 'clothing'],
  'A1-6-1': ['wh-questions'],
  'A1-8-1': ['numbers'],
  'A1-14-1': ['numbers'],
  'A2-2-1': ['wh-questions'],
};

export const topicsForPoint = (unitKey: string, point: number) =>
  Object.entries(FOUNDATION_MAP)
    .filter(([, p]) => p.unitKey === unitKey && p.point === point)
    .map(([id]) => id);

/** /learn/a1/2?tab=grammar for "A1-2" (the grammar tab, where the practice lives). */
export const unitPath = (unitKey: string) => {
  const [level, n] = unitKey.split('-');
  return `/learn/${level!.toLowerCase()}/${n}?tab=grammar`;
};

export const isPreA1 = (id: string) => (PREA1_TOPICS as readonly string[]).includes(id);
