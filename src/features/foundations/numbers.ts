/** English number words: cardinals, ordinals and abbreviations. */

const ONES = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
const TENS = ['', '', 'twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
const SCALES: [number, string][] = [
  [1e9, 'billion'],
  [1e6, 'million'],
  [1e3, 'thousand'],
];

function under100(n: number) {
  if (n < 20) return ONES[n]!;
  const t = TENS[Math.floor(n / 10)]!;
  return n % 10 ? `${t}-${ONES[n % 10]}` : t;
}

/** 0 … 999 · `and` after hundred is British (one hundred and five). */
function under1000(n: number, uk: boolean) {
  const h = Math.floor(n / 100);
  const r = n % 100;
  if (!h) return under100(r);
  return `${ONES[h]} hundred${r ? `${uk ? ' and' : ''} ${under100(r)}` : ''}`;
}

/** 1234 → "one thousand two hundred (and) thirty-four". */
export function cardinal(n: number, uk = false): string {
  n = Math.floor(Math.abs(n));
  if (n < 1000) return under1000(n, uk);
  const parts: string[] = [];
  let rest = n;
  for (const [v, name] of SCALES) {
    if (rest >= v) {
      parts.push(`${under1000(Math.floor(rest / v), uk)} ${name}`);
      rest %= v;
    }
  }
  if (rest) parts.push(rest < 100 && uk ? `and ${under100(rest)}` : under1000(rest, uk));
  return parts.join(' ');
}

const IRREGULAR: Record<string, string> = { one: 'first', two: 'second', three: 'third', five: 'fifth', eight: 'eighth', nine: 'ninth', twelve: 'twelfth' };

/** 21 → "twenty-first". Only the last word changes. */
export function ordinal(n: number, uk = false): string {
  const words = cardinal(n, uk);
  const m = words.match(/^(.*?)([a-z]+)$/)!;
  const [, head, last] = m as unknown as [string, string, string];
  const ord = IRREGULAR[last] ?? (last.endsWith('y') ? `${last.slice(0, -1)}ieth` : `${last}th`);
  return head + ord;
}

/** 1 → "st", 12 → "th", 23 → "rd". */
export function suffix(n: number) {
  const t = n % 100;
  if (t >= 11 && t <= 13) return 'th';
  return ['th', 'st', 'nd', 'rd'][n % 10] ?? 'th';
}

/** 1234567 → "1,234,567" (English digit grouping). */
export const digits = (n: number) => n.toLocaleString('en-US');

/** Stress pattern for -teen / -ty: thir·TEEN vs THIR·ty. */
export function stress(n: number): { a: string; b: string; strong: 0 | 1 } | null {
  if (n >= 13 && n <= 19) {
    const w = ONES[n]!;
    return { a: w.slice(0, -4), b: 'teen', strong: 1 };
  }
  if (n >= 20 && n <= 90 && n % 10 === 0) {
    const w = TENS[n / 10]!;
    return { a: w.slice(0, -2), b: 'ty', strong: 0 };
  }
  return null;
}

/** Simple Spanish names for the chart (0–20, tens, 100, 1,000, 1,000,000). */
export const ES: Record<number, string> = {
  0: 'cero', 1: 'uno', 2: 'dos', 3: 'tres', 4: 'cuatro', 5: 'cinco', 6: 'seis', 7: 'siete', 8: 'ocho', 9: 'nueve', 10: 'diez',
  11: 'once', 12: 'doce', 13: 'trece', 14: 'catorce', 15: 'quince', 16: 'dieciséis', 17: 'diecisiete', 18: 'dieciocho', 19: 'diecinueve',
  20: 'veinte', 30: 'treinta', 40: 'cuarenta', 50: 'cincuenta', 60: 'sesenta', 70: 'setenta', 80: 'ochenta', 90: 'noventa',
  100: 'cien', 1000: 'mil', 1000000: 'un millón',
};
