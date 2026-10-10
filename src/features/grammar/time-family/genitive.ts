/**
 * Saxon genitive rules — pure helpers (no React), tested in
 * scratchpad/time-family/timeWords.test.ts.
 */
import type { OwnerKind } from './data.ts';

const APOS = '’';

/**
 * Possessive form of an owner noun phrase:
 * - singular → ’s (my sister’s, James’s)
 * - regular plural ending in -s → ’ (my parents’)
 * - irregular plural without -s → ’s (the children’s)
 * - joint possession → ’s only on the last name (Tom and Ann’s)
 */
export function possessive(owner: string, kind: OwnerKind): string {
  const o = owner.trim();
  if (kind === 'plural' && /s$/i.test(o)) return `${o}${APOS}`;
  return `${o}${APOS}s`;
}

/** All accepted forms: singular nouns ending in -s accept both James’s and James’. */
export function possessiveForms(owner: string, kind: OwnerKind): string[] {
  const main = possessive(owner, kind);
  const o = owner.trim();
  if ((kind === 'singular' || kind === 'joint') && /s$/i.test(o)) return [main, `${o}${APOS}`];
  return [main];
}

/** Normalises curly/straight apostrophes, case, spacing and final punctuation. */
export function normalizeAnswer(s: string): string {
  return s
    .replace(/[‘’`´ʼ′]/g, "'")
    .replace(/\s+/g, ' ')
    .replace(/[.!?]+$/, '')
    .trim()
    .toLowerCase();
}

/** Checks a typed answer like "my parents' car" against the rules. */
export function checkPossessive(answer: string, owner: string, kind: OwnerKind, thing: string): boolean {
  const a = normalizeAnswer(answer);
  return possessiveForms(owner, kind).some((f) => normalizeAnswer(`${f} ${thing}`) === a);
}

/** Explains why a form is right, in Spanish. */
export function possessiveWhy(owner: string, kind: OwnerKind): string {
  const o = owner.trim();
  switch (kind) {
    case 'plural':
      return `“${o}” es plural y termina en -s → solo apóstrofo: ${possessive(o, kind)}.`;
    case 'irregular':
      return `“${o}” es un plural irregular (sin -s) → ’s: ${possessive(o, kind)}.`;
    case 'joint':
      return `Posesión compartida → ’s solo en el último nombre: ${possessive(o, kind)}.`;
    default:
      return /s$/i.test(o)
        ? `Nombre singular terminado en -s → ${o}’s (también se acepta ${o}’).`
        : `Poseedor singular → ’s: ${possessive(o, kind)}.`;
  }
}
