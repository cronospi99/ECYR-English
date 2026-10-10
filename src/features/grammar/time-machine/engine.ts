/**
 * Time Machine — pure language engines (no React): -ed / -ing spelling,
 * was / were agreement, ordinals, number words, year reading, US / UK dates
 * and the mixed-tense sentence builder of the timeline.
 */
import { IC_VERBS, IRREG, MONTHS, NO_DOUBLE, STRESSED_FINAL, VOWELS, WEEKDAYS } from './data';

export type Variety = 'US' | 'UK';

// ------------------------------------------------------------- spelling --

const isVowel = (ch: string | undefined) => !!ch && VOWELS.includes(ch);

/** Rough syllable count: vowel groups (y counts as a vowel after a consonant). */
export function syllables(w: string) {
  const groups = w.toLowerCase().replace(/e$/, '').match(/[aeiouy]+/g);
  return Math.max(1, groups?.length ?? 1);
}

/**
 * Ends in consonant + single vowel + consonant (not w, x, y)?
 * "qu" counts as a consonant (equip, quit); a vowel pair never qualifies (rain, need).
 */
export function endsCVC(w: string) {
  if (w.length < 3) return false;
  const c = w[w.length - 1]!;
  const v = w[w.length - 2]!;
  const before = w[w.length - 3]!;
  if (isVowel(c) || NO_DOUBLE.includes(c) || !isVowel(v)) return false;
  if (!isVowel(before)) return true;
  // equip, quit, squat: the u after q is not a real vowel
  return before === 'u' && w[w.length - 4] === 'q';
}

export type SpellRule =
  | 'irregular'
  | 'e'
  | 'ee'
  | 'ie'
  | 'consonant-y'
  | 'vowel-y'
  | 'ic'
  | 'double-1'
  | 'double-stress'
  | 'double-l-uk'
  | 'no-double-stress'
  | 'no-double-wxy'
  | 'plain'
  | 'be';

export interface Spelled {
  base: string;
  form: string;
  rule: SpellRule;
  /** Spanish explanation of the rule applied. */
  why: string;
  /** Form in the other variety, when US and UK differ (travel). */
  other?: string;
}

/** Should the final consonant double before -ed / -ing? */
function doubling(k: string, variety: Variety): { double: boolean; rule: SpellRule; other?: boolean } | null {
  if (!endsCVC(k)) {
    const c = k[k.length - 1]!;
    if (k.length >= 3 && NO_DOUBLE.includes(c) && isVowel(k[k.length - 2])) return { double: false, rule: 'no-double-wxy' };
    return null;
  }
  if (syllables(k) === 1) return { double: true, rule: 'double-1' };
  if (STRESSED_FINAL.includes(k)) return { double: true, rule: 'double-stress' };
  if (k.endsWith('l')) return { double: variety === 'UK', rule: 'double-l-uk', other: true };
  return { double: false, rule: 'no-double-stress' };
}

const WHY: Record<SpellRule, string> = {
  irregular: 'Verbo irregular: su pasado no lleva -ed y hay que memorizarlo.',
  be: 'To be es especial: was (I, he, she, it) / were (you, we, they).',
  e: 'Termina en -e: solo se agrega -d.',
  ee: 'Termina en -ee / -ye / -oe: se conserva la e.',
  ie: 'Termina en -ie: ie → y antes de -ing.',
  'consonant-y': 'Consonante + y: la y cambia a i y se agrega -ed.',
  'vowel-y': 'Vocal + y: la y se queda (play → played).',
  ic: 'Termina en -ic: se agrega k (panic → panicked).',
  'double-1': 'Una sílaba con consonante–vocal–consonante: se duplica la consonante final.',
  'double-stress': 'C-V-C con el acento en la última sílaba: se duplica la consonante final.',
  'double-l-uk': 'Termina en vocal + l sin acento final: el inglés británico duplica la l; el americano no.',
  'no-double-stress': 'C-V-C pero el acento NO está en la última sílaba: no se duplica.',
  'no-double-wxy': 'Las letras w, x, y nunca se duplican.',
  plain: 'Regla general: se agrega -ed sin cambios.',
};

/** Past simple with the spelling rule that produced it. */
export function pastInfo(verb: string, variety: Variety = 'US'): Spelled {
  const k = verb.trim().toLowerCase();
  const irr = IRREG[k];
  if (irr) return { base: k, form: irr[0], rule: k === 'be' ? 'be' : 'irregular', why: WHY[k === 'be' ? 'be' : 'irregular'] };
  return edForm(k, variety);
}

/** Past participle (irregular third column, or the regular -ed form). */
export function ppOf(verb: string, variety: Variety = 'US') {
  const k = verb.trim().toLowerCase();
  const irr = IRREG[k];
  if (irr) return variety === 'UK' ? irr[1].replace(' / gotten', '') : irr[1].replace('got / ', '');
  return edForm(k, variety).form;
}

/** Regular -ed form (also used for regular participles). */
function edForm(k: string, variety: Variety): Spelled {
  const last = k[k.length - 1];
  if (last === 'e') return { base: k, form: `${k}d`, rule: 'e', why: WHY.e };
  if (last === 'y') {
    if (!isVowel(k[k.length - 2])) return { base: k, form: `${k.slice(0, -1)}ied`, rule: 'consonant-y', why: WHY['consonant-y'] };
    return { base: k, form: `${k}ed`, rule: 'vowel-y', why: WHY['vowel-y'] };
  }
  if (IC_VERBS.includes(k)) return { base: k, form: `${k}ked`, rule: 'ic', why: WHY.ic };
  const d = doubling(k, variety);
  if (d) {
    const doubled = `${k}${last}ed`;
    const plain = `${k}ed`;
    const form = d.double ? doubled : plain;
    return { base: k, form, rule: d.rule, why: WHY[d.rule], other: d.other ? (d.double ? plain : doubled) : undefined };
  }
  return { base: k, form: `${k}ed`, rule: 'plain', why: WHY.plain };
}

/** -ing form with the spelling rule. */
export function ingInfo(verb: string, variety: Variety = 'US'): Spelled {
  const k = verb.trim().toLowerCase();
  if (k === 'be') return { base: k, form: 'being', rule: 'ee', why: 'Be → being: se conserva la e.' };
  if (k.endsWith('ie')) return { base: k, form: `${k.slice(0, -2)}ying`, rule: 'ie', why: WHY.ie };
  if (/(ee|ye|oe)$/.test(k)) return { base: k, form: `${k}ing`, rule: 'ee', why: WHY.ee };
  if (k.endsWith('e') && k.length > 2) return { base: k, form: `${k.slice(0, -1)}ing`, rule: 'e', why: 'Consonante + e: se elimina la e (drive → driving).' };
  if (IC_VERBS.includes(k)) return { base: k, form: `${k}king`, rule: 'ic', why: 'Termina en -ic: se agrega k (panic → panicking).' };
  const d = doubling(k, variety);
  if (d) {
    const last = k[k.length - 1]!;
    const doubled = `${k}${last}ing`;
    const plain = `${k}ing`;
    return { base: k, form: d.double ? doubled : plain, rule: d.rule, why: WHY[d.rule], other: d.other ? (d.double ? plain : doubled) : undefined };
  }
  return { base: k, form: `${k}ing`, rule: 'plain', why: 'Regla general: se agrega -ing sin cambios.' };
}

export const pastOf = (verb: string, variety: Variety = 'US') => pastInfo(verb, variety).form;
export const ingOf = (verb: string, variety: Variety = 'US') => ingInfo(verb, variety).form;

// ------------------------------------------------------------ was / were --

const PLURAL_NOUNS = ['people', 'children', 'men', 'women', 'police', 'feet', 'teeth', 'mice', 'geese', 'cattle', 'clothes', 'jeans', 'glasses'];
const SINGULAR_S = ['news', 'physics', 'mathematics', 'maths', 'bus', 'class', 'boss', 'virus', 'campus'];
const SINGULAR_PRON = ['everyone', 'everybody', 'someone', 'somebody', 'nobody', 'no one', 'anyone', 'anybody', 'everything', 'nothing', 'something', 'this', 'that'];

/** Agreement of the past of to be with any subject, with a Spanish reason. */
export function wasWereInfo(subject: string): { form: 'was' | 'were'; why: string } {
  const raw = (subject || 'I').trim().replace(/\s+/g, ' ');
  const s = raw.toLowerCase();
  if (['i', 'he', 'she', 'it'].includes(s)) return { form: 'was', why: `${raw} es singular (I, he, she, it) → was.` };
  if (['you', 'we', 'they', 'these', 'those'].includes(s)) return { form: 'were', why: `${raw} → were (you, we, they siempre van con were).` };
  if (SINGULAR_PRON.includes(s)) return { form: 'was', why: `${raw} es gramaticalmente singular → was.` };
  if (/\band\b/.test(s) || s.includes(',')) return { form: 'were', why: 'Dos o más personas o cosas unidas con “and” → were.' };
  const words = raw.split(' ');
  const lastRaw = words[words.length - 1]!;
  const last = lastRaw.toLowerCase();
  if (PLURAL_NOUNS.includes(last)) return { form: 'were', why: `“${lastRaw}” es un plural irregular → were.` };
  if (SINGULAR_S.includes(last)) return { form: 'was', why: `“${lastRaw}” termina en -s pero es singular → was.` };
  const isProper = lastRaw[0] !== lastRaw[0]!.toLowerCase();
  if (last.endsWith('s') && !last.endsWith('ss') && !last.endsWith('us') && !last.endsWith('is') && !isProper)
    return { form: 'were', why: `“${lastRaw}” es un sustantivo plural → were.` };
  return { form: 'was', why: `“${raw}” es una sola persona o cosa → was.` };
}
export const wasWere = (subject: string) => wasWereInfo(subject).form;

// -------------------------------------------------------- numbers / dates --

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];

function under100(n: number) {
  if (n < 20) return ONES[n]!;
  const t = TENS[Math.floor(n / 10)]!;
  return n % 10 ? `${t}-${ONES[n % 10]}` : t;
}

/** Cardinal number in words, 0–999 999. UK style inserts "and" before the tens. */
export function numberWords(n: number, variety: Variety = 'US'): string {
  const and = variety === 'UK' ? ' and ' : ' ';
  if (n < 100) return under100(n);
  if (n < 1000) {
    const r = n % 100;
    return `${ONES[Math.floor(n / 100)]} hundred${r ? and + under100(r) : ''}`;
  }
  const th = Math.floor(n / 1000);
  const r = n % 1000;
  const head = `${numberWords(th, variety)} thousand`;
  if (!r) return head;
  return `${head}${r < 100 ? and : ' '}${numberWords(r, variety)}`;
}

/** 1 → st, 2 → nd, 3 → rd, everything else → th; 11, 12, 13 → th. */
export function ordinalSuffix(n: number) {
  const t = n % 100;
  if (t >= 11 && t <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th';
}
export const ordinal = (n: number) => `${n}${ordinalSuffix(n)}`;

const ORD_IRREG: Record<string, string> = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };
/** Ordinal in words: 21 → twenty-first, 12 → twelfth, 40 → fortieth. */
export function ordinalWords(n: number, variety: Variety = 'US') {
  const w = numberWords(n, variety);
  const m = /^(.*?)([a-z]+)$/.exec(w)!;
  const [, head, last] = m as unknown as [string, string, string];
  const ord = ORD_IRREG[last] ?? (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`);
  return head + ord;
}

export interface YearReading {
  /** Natural (spoken) readings, the first one is the most common. */
  natural: string[];
  /** Whole-number reading, US and UK. */
  formalUS: string;
  formalUK: string;
  rule: string;
  /** The two halves for the "split the year" visual (null when not split). */
  split: [string, string] | null;
}

/** How to say a year (1–9999). */
export function readYear(y: number): YearReading {
  const formalUS = numberWords(y, 'US');
  const formalUK = numberWords(y, 'UK');
  const hi = Math.floor(y / 100);
  const lo = y % 100;
  const s = String(y);
  const half: [string, string] | null = s.length === 4 ? [s.slice(0, 2), s.slice(2)] : null;
  if (y < 1000) {
    const alt = y >= 100 && lo >= 10 ? [`${ONES[hi]} ${under100(lo)}`] : [];
    return { natural: [formalUS, ...alt], formalUS, formalUK, rule: 'Año de tres cifras o menos: se lee como número (a veces dividido).', split: null };
  }
  if (y % 1000 === 0) return { natural: [formalUS], formalUS, formalUK, rule: 'Año redondo de miles: one thousand, two thousand…', split: null };
  if (y >= 2001 && y <= 2009)
    return { natural: [`two thousand ${ONES[lo]}`, `two thousand and ${ONES[lo]}`], formalUS, formalUK, rule: '2000–2009: two thousand (and) + número. No se divide.', split: null };
  if (y >= 1001 && y <= 1009)
    return { natural: [`one thousand ${ONES[lo]}`, `one thousand and ${ONES[lo]}`], formalUS, formalUK, rule: '1001–1009: one thousand (and) + número.', split: null };
  if (y >= 2010 && y <= 2099)
    return {
      natural: [`twenty ${under100(lo)}`, `two thousand ${under100(lo)}`, `two thousand and ${under100(lo)}`],
      formalUS,
      formalUK,
      rule: 'Desde 2010 se vuelve a dividir: twenty + par final (también se oye two thousand (and) …).',
      split: half,
    };
  if (lo === 0) return { natural: [`${under100(hi)} hundred`], formalUS, formalUK, rule: 'Termina en 00: primer par + “hundred”.', split: half };
  if (lo < 10)
    return { natural: [`${under100(hi)} oh ${ONES[lo]}`, `${under100(hi)} hundred and ${ONES[lo]}`], formalUS, formalUK, rule: 'Termina en 01–09: el cero se dice “oh”.', split: half };
  return { natural: [`${under100(hi)} ${under100(lo)}`], formalUS, formalUK, rule: 'Divide el año en dos pares y lee cada par como un número.', split: half };
}

export const daysInMonth = (y: number, m: number) => new Date(Date.UTC(y, m, 0)).getUTCDate();
/** 0 = Sunday … 6 = Saturday (proleptic Gregorian calendar). */
export function weekdayIndex(y: number, m: number, d: number) {
  const dt = new Date(Date.UTC(2000, m - 1, d));
  dt.setUTCFullYear(y);
  return dt.getUTCDay();
}

export interface DateFormats {
  weekday: string;
  usWritten: string;
  usShort: string;
  usNumeric: string;
  usSpoken: string;
  ukWritten: string;
  ukShort: string;
  ukNumeric: string;
  ukSpoken: string;
  iso: string;
  /** True when day ≤ 12 and day ≠ month: the numeric form means different dates in the US and UK. */
  ambiguous: boolean;
}

const pad = (n: number) => String(n).padStart(2, '0');

export function formatDate(y: number, m: number, d: number): DateFormats {
  const month = MONTHS[m - 1]!.name;
  const weekday = WEEKDAYS[weekdayIndex(y, m, d)]!;
  const yr = readYear(y).natural[0]!;
  return {
    weekday,
    usWritten: `${weekday}, ${month} ${ordinal(d)}, ${y}`,
    usShort: `${month} ${d}, ${y}`,
    usNumeric: `${m}/${d}/${y}`,
    usSpoken: `${month} ${ordinalWords(d)}, ${yr}`,
    ukWritten: `${weekday} ${ordinal(d)} ${month} ${y}`,
    ukShort: `${d} ${month} ${y}`,
    ukNumeric: `${pad(d)}/${pad(m)}/${y}`,
    ukSpoken: `the ${ordinalWords(d)} of ${month}, ${yr}`,
    iso: `${y}-${pad(m)}-${pad(d)}`,
    ambiguous: d <= 12 && d !== m,
  };
}

/** The four pieces of a US date, as used by the date builder. */
export function datePieces(y: number, m: number, d: number) {
  const f = formatDate(y, m, d);
  return [`${f.weekday},`, MONTHS[m - 1]!.name, `${ordinal(d)},`, String(y)];
}

/** A tempting wrong ordinal for a day (2 → 2th, 12 → 12nd, 21 → 21th). */
export function wrongOrdinal(n: number) {
  const right = ordinalSuffix(n);
  const t = n % 100;
  if (t >= 11 && t <= 13) return `${n}${['st', 'nd', 'rd'][t - 11]}`;
  return `${n}${right === 'th' ? (n % 10 === 0 ? 'st' : 'nd') : 'th'}`;
}

// ------------------------------------------------------ sentence timeline --

export interface Phrase {
  verb: string;
  rest: string;
}

/** "to finish my homework" → { verb: 'finish', rest: 'my homework' }. */
export function splitPhrase(p: string | undefined): Phrase | null {
  const t = (p || '').trim().replace(/\s+/g, ' ').replace(/^to\s+/i, '').replace(/[.!?]+$/, '');
  if (!t) return null;
  const parts = t.split(' ');
  return { verb: parts[0]!.toLowerCase(), rest: parts.slice(1).join(' ') };
}

const join = (a: string, b: string) => (b ? `${a} ${b}` : a);
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const LOWER_START = ['he', 'she', 'it', 'we', 'you', 'they', 'my', 'your', 'his', 'her', 'our', 'their', 'the', 'a', 'an', 'this', 'that', 'these', 'those'];

/** The subject as it must appear inside a sentence (after a comma or "when"). */
export function subjectMid(subject: string) {
  const s = (subject || 'I').trim().replace(/\s+/g, ' ') || 'I';
  if (s.toLowerCase() === 'i') return 'I';
  const first = s.split(' ')[0]!.toLowerCase();
  return LOWER_START.includes(first) ? s.charAt(0).toLowerCase() + s.slice(1) : s;
}

/** Conjugations used by each node of the timeline. */
export function perfectOf(p: Phrase, variety: Variety = 'US') {
  return join(`had ${ppOf(p.verb, variety)}`, p.rest);
}
export function continuousOf(p: Phrase, subject: string, variety: Variety = 'US') {
  return join(`${wasWere(subject)} ${ingOf(p.verb, variety)}`, p.rest);
}
export function simpleOf(p: Phrase, subject: string, variety: Variety = 'US') {
  const past = p.verb === 'be' ? wasWere(subject) : pastOf(p.verb, variety);
  return join(past, p.rest);
}

export interface TimelineOut {
  main: string;
  alts: string[];
  parts: { tense: 'perfect' | 'continuous' | 'simple'; text: string; formula: string }[];
  irregulars: string[];
}

export function buildTimeline(
  input: { subject: string; when: string; t1: string; t2: string; t3: string },
  variety: Variety = 'US',
): TimelineOut | null {
  const subj = subjectMid(input.subject);
  const p1 = splitPhrase(input.t1);
  const p2 = splitPhrase(input.t2);
  const p3 = splitPhrase(input.t3);
  if (!p1 && !p2 && !p3) return null;
  const irregulars: string[] = [];
  const note = (v: string) => {
    const irr = IRREG[v];
    const line = irr && `${v} → ${irr[0]} → ${irr[1]}`;
    if (line && !irregulars.includes(line)) irregulars.push(line);
  };
  const parts: TimelineOut['parts'] = [];
  const perfect = p1 ? perfectOf(p1, variety) : '';
  const cont = p2 ? continuousOf(p2, subj, variety) : '';
  const simple = p3 ? simpleOf(p3, subj, variety) : '';
  if (p1) (note(p1.verb), parts.push({ tense: 'perfect', text: `${cap(subj)} ${perfect}`, formula: 'S + had + participle' }));
  if (p2) (note(p2.verb), parts.push({ tense: 'continuous', text: `${cap(subj)} ${cont}`, formula: 'S + was/were + verb-ing' }));
  if (p3) (note(p3.verb), parts.push({ tense: 'simple', text: `${cap(subj)} ${simple}`, formula: 'S + verb in past' }));

  const clauses = [perfect, cont].filter(Boolean).map((c) => `${subj} ${c}`);
  let main = clauses.join(', and ');
  if (simple) main = main ? `${main} when ${subj} ${simple}` : `${subj} ${simple}`;
  const when = input.when.trim().replace(/[,.]+$/, '');
  main = when ? `${cap(when)}, ${main}` : cap(main);
  main = `${main.replace(/\s+/g, ' ').trim()}.`;

  const alts: string[] = [];
  if (perfect && simple) alts.push(`By the time ${subj} ${simple}, ${subj} ${perfect}.`);
  if (cont && simple) alts.push(`While ${subj} ${cont}, ${subj} ${simple}.`);
  return { main, alts, parts, irregulars };
}
