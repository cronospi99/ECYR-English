/* The ONE place where an answer is validated (client for instant feedback, host before adding points).
   normalize -> fuzzy token fix (edit distance <= 1 to a `fuzzy` word of >= 4 letters; tokens of >= 3 letters)
   -> valid = some `accept` matches AND no `reject` matches. Regexes are compiled once and cached. */
import type { HuntCard } from './types';

/** lowercase, NFD without accents, every non letter/number char (’ ' « » - . , ? !, any Unicode punctuation) -> space, collapse spaces. */
export function normalize(s: string): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim();
}

/** Levenshtein distance, giving up early above `max`. */
export function lev(a: string, b: string, max = 2): number {
  if (a === b) return 0;
  if (Math.abs(a.length - b.length) > max) return max + 1;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    let min = i;
    for (let j = 1; j <= b.length; j++) {
      const v = Math.min(prev[j]! + 1, cur[j - 1]! + 1, prev[j - 1]! + (a[i - 1] === b[j - 1] ? 0 : 1));
      cur.push(v);
      if (v < min) min = v;
    }
    if (min > max) return max + 1;
    prev = cur;
  }
  return prev[b.length]!;
}

/** Replace each token (>= 3 letters) within distance 1 of a fuzzy word (>= 4 letters) by that word. */
export function fuzzyFix(text: string, fuzzy: string[]): string {
  const words = fuzzy.map(normalize).filter((w) => w.length >= 4 && !w.includes(' '));
  if (!words.length) return text;
  return text
    .split(' ')
    .map((tok) => {
      if (tok.length < 3 || words.includes(tok)) return tok; // exact word: distance 0, keep it
      for (const w of words) if (lev(tok, w, 1) <= 1) return w;
      return tok;
    })
    .join(' ');
}

const cache = new Map<string, RegExp | null>();
function rx(src: string): RegExp | null {
  let r = cache.get(src);
  if (r === undefined) {
    try { r = new RegExp(src); } catch { r = null; }
    cache.set(src, r);
  }
  return r;
}
/** Throws if a regex source does not compile (for the pack validator). */
export const compileRx = (src: string) => new RegExp(src);

export type MatchCard = Pick<HuntCard, 'accept' | 'fuzzy'> & { reject?: string[]; nudge?: string[] };
export type MatchResult = 'ok' | 'nudge' | 'no';

/** 'ok' = accepted; 'nudge' = no accept matched but a nudge regex did (e.g. a Spanish answer: not a wrong attempt); 'no'. */
export function match(card: MatchCard, raw: string): MatchResult {
  const base = normalize(raw);
  if (!base) return 'no';
  const text = fuzzyFix(base, card.fuzzy ?? []);
  for (const s of card.reject ?? []) if (rx(s)?.test(text) || rx(s)?.test(base)) return 'no';
  if (card.accept.some((s) => !!rx(s)?.test(text))) return 'ok';
  if ((card.nudge ?? []).some((s) => !!rx(s)?.test(text) || !!rx(s)?.test(base))) return 'nudge';
  return 'no';
}
export const matchAnswer = (card: MatchCard, raw: string) => match(card, raw) === 'ok';

/** Code words: same normalization, tolerance of one error when the word has >= 5 letters. */
export function matchCode(code: string, raw: string): boolean {
  const a = normalize(code).replace(/ /g, ''), b = normalize(raw).replace(/ /g, '');
  if (!b) return false;
  return a === b || (a.length >= 5 && lev(a, b, 1) <= 1);
}
