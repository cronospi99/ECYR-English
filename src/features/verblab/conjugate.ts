/**
 * Conjugation tables for any verb of the Verb Lab bank: the three forms come
 * from the bank (irregulars included), the -ing spelling from the Time
 * Machine engine, the -s form and the auxiliaries from simple rules.
 * Affirmatives are written in full, negatives contracted (as they are spoken).
 */
import type { LabVerb } from '@/content/types';
import { ingInfo } from '@/features/grammar/time-machine/engine';

export type Person = 'I' | 'you' | 'he' | 'we' | 'they';

export const PERSONS: { id: Person; label: string }[] = [
  { id: 'I', label: 'I' },
  { id: 'you', label: 'you' },
  { id: 'he', label: 'he / she / it' },
  { id: 'we', label: 'we' },
  { id: 'they', label: 'they' },
];

/** Applies `f` to the first word only ("level off" → "levels off"). */
const onFirst = (verb: string, f: (w: string) => string) => {
  const [w, ...rest] = verb.split(' ');
  return [f(w!), ...rest].join(' ');
};

/** Third person singular of the present simple: works, goes, studies, has. */
export function thirdPerson(base: string) {
  return onFirst(base, (w) => {
    const b = w.toLowerCase();
    if (b === 'be') return 'is';
    if (b === 'have') return 'has';
    if (/(s|x|z|ch|sh|o)$/.test(b)) return `${b}es`;
    if (/[^aeiou]y$/.test(b)) return `${b.slice(0, -1)}ies`;
    return `${b}s`;
  });
}

/** The -ing form with its spelling rule (Spanish), e.g. run → running. */
export function ingForm(base: string) {
  const [w, ...rest] = base.split(' ');
  const info = ingInfo(w!);
  return { form: [info.form, ...rest].join(' '), why: info.why };
}

export interface TenseRow {
  id: string;
  en: string;
  es: string;
  aff: string;
  neg: string;
  q: string;
}

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function conjugate(v: LabVerb, p: Person): TenseRow[] {
  const S = p; // subject as written ("I" stays capital)
  const he = p === 'he';
  const base = v.en;
  const isBe = base === 'be';
  const s3 = thirdPerson(base);
  const ing = ingForm(base).form;
  const past = v.past;
  const part = v.part;
  const bePres = p === 'I' ? 'am' : he ? 'is' : 'are';
  const bePresNeg = p === 'I' ? "'m not" : he ? " isn't" : " aren't";
  const bePast = p === 'I' || he ? 'was' : 'were';
  const have = he ? 'has' : 'have';
  const q = (aux: string, rest: string) => `${cap(aux)} ${S} ${rest}?`;
  const negBe = (rest: string) => `${S}${bePresNeg} ${rest}`;

  const rows: TenseRow[] = [];
  if (isBe) {
    const pastBe = p === 'I' || he ? 'was' : 'were';
    rows.push(
      { id: 'ps', en: 'Present simple', es: 'Presente simple', aff: `${S} ${bePres}`, neg: `${S}${bePresNeg}`, q: `${cap(bePres)} ${S}…?` },
      { id: 'pc', en: 'Present continuous', es: 'Presente continuo', aff: `${S} ${bePres} being`, neg: negBe('being'), q: q(bePres, 'being…') },
      { id: 'pas', en: 'Past simple', es: 'Pasado simple', aff: `${S} ${pastBe}`, neg: `${S} ${pastBe}n't`, q: `${cap(pastBe)} ${S}…?` },
    );
  } else {
    rows.push(
      { id: 'ps', en: 'Present simple', es: 'Presente simple', aff: `${S} ${he ? s3 : base}`, neg: `${S} ${he ? "doesn't" : "don't"} ${base}`, q: q(he ? 'does' : 'do', base) },
      { id: 'pc', en: 'Present continuous', es: 'Presente continuo', aff: `${S} ${bePres} ${ing}`, neg: negBe(ing), q: q(bePres, ing) },
      { id: 'pas', en: 'Past simple', es: 'Pasado simple', aff: `${S} ${past}`, neg: `${S} didn't ${base}`, q: q('did', base) },
    );
  }
  rows.push(
    { id: 'pac', en: 'Past continuous', es: 'Pasado continuo', aff: `${S} ${bePast} ${ing}`, neg: `${S} ${bePast}n't ${ing}`, q: q(bePast, ing) },
    { id: 'pp', en: 'Present perfect', es: 'Presente perfecto', aff: `${S} ${have} ${part}`, neg: `${S} ${have}n't ${part}`, q: q(have, part) },
    { id: 'ppc', en: 'Present perfect continuous', es: 'Presente perfecto continuo', aff: `${S} ${have} been ${ing}`, neg: `${S} ${have}n't been ${ing}`, q: q(have, `been ${ing}`) },
    { id: 'pap', en: 'Past perfect', es: 'Pasado perfecto', aff: `${S} had ${part}`, neg: `${S} hadn't ${part}`, q: q('had', part) },
    { id: 'will', en: 'Future (will)', es: 'Futuro con will', aff: `${S} will ${base}`, neg: `${S} won't ${base}`, q: q('will', base) },
    { id: 'gt', en: 'Future (going to)', es: 'Futuro con going to', aff: `${S} ${bePres} going to ${base}`, neg: negBe(`going to ${base}`), q: q(bePres, `going to ${base}`) },
    { id: 'cond', en: 'Conditional (would)', es: 'Condicional', aff: `${S} would ${base}`, neg: `${S} wouldn't ${base}`, q: q('would', base) },
  );
  return rows;
}
