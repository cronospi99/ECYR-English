/**
 * Telling the time in English and Spanish — pure functions, no React.
 * Every function takes a 24-hour time (h24 0–23, m 0–59). Hours outside
 * the range are wrapped, so `enTime(24, 0)` is midnight again.
 *
 * Verified for all 1440 minutes of the day by
 * scratchpad/time-family/timeWords.test.ts (see the final report).
 */
import { EN_NUM, EN_ONES, EN_TENS, ES_HOUR, ES_NUM } from './data.ts';

export const mod = (n: number, m: number) => ((n % m) + m) % m;

/** 1–12 on a 12-hour dial: 0 → 12, 13 → 1, 12 → 12. */
export const hour12 = (h24: number) => mod(mod(h24, 24) + 11, 12) + 1;

/** English words for 0–59 ("forty-five"). */
export function numberWords(n: number): string {
  if (n < 0 || n > 59 || !Number.isInteger(n)) throw new RangeError(`numberWords: ${n}`);
  if (n <= 30) return EN_NUM[n]!;
  const tens = EN_TENS[Math.floor(n / 10)]!;
  const ones = n % 10;
  return ones ? `${tens}-${EN_NUM[ones]}` : tens;
}

const hourWord = (h24: number) => EN_ONES[hour12(h24)]!;

/** Minutes as said with past/to: "five", "a quarter", "seven minutes", "one minute". */
function minutePhrase(n: number): string {
  if (n === 15) return 'a quarter';
  if (n % 5 === 0) return numberWords(n);
  return `${numberWords(n)} ${n === 1 ? 'minute' : 'minutes'}`;
}

/**
 * Traditional (British) past/to reading without "It's":
 * "three o'clock", "a quarter past three", "half past three",
 * "twenty-five to four", "seven minutes past three", "one minute to four".
 * 1–30 minutes use "past" the current hour; 31–59 use "to" the next hour.
 */
export function pastTo(h24: number, m: number): string {
  if (m === 0) return `${hourWord(h24)} o’clock`;
  if (m === 30) return `half past ${hourWord(h24)}`;
  if (m < 30) return `${minutePhrase(m)} past ${hourWord(h24)}`;
  return `${minutePhrase(60 - m)} to ${hourWord(h24 + 1)}`;
}

/** "It's a quarter to four." */
export const enTime = (h24: number, m: number) => `It’s ${pastTo(h24, m)}.`;

/** Digital reading: "three o'clock", "three oh five", "seven forty-five". */
export function digitalWords(h24: number, m: number): string {
  if (m === 0) return `${hourWord(h24)} o’clock`;
  if (m < 10) return `${hourWord(h24)} oh ${EN_NUM[m]}`;
  return `${hourWord(h24)} ${numberWords(m)}`;
}

/** "It's seven forty-five." */
export const enDigital = (h24: number, m: number) => `It’s ${digitalWords(h24, m)}.`;

/** American alternatives: "ten after three", "a quarter of four". Null for :00 and :30. */
export function usWords(h24: number, m: number): string | null {
  if (m === 0 || m === 30) return null;
  if (m < 30) return `${minutePhrase(m)} after ${hourWord(h24)}`;
  return `${minutePhrase(60 - m)} of ${hourWord(h24 + 1)}`;
}

export const pad2 = (n: number) => String(n).padStart(2, '0');
/** "3:45" */
export const digital12 = (h24: number, m: number) => `${hour12(h24)}:${pad2(m)}`;
/** "15:45" */
export const digital24 = (h24: number, m: number) => `${pad2(mod(h24, 24))}:${pad2(m)}`;
/** a.m. from midnight (00:00 = 12:00 a.m.) to 11:59; p.m. from noon (12:00 = 12:00 p.m.). */
export const meridiem = (h24: number): 'a.m.' | 'p.m.' => (mod(h24, 24) < 12 ? 'a.m.' : 'p.m.');
/** "3:45 p.m." */
export const digitalAmPm = (h24: number, m: number) => `${digital12(h24, m)} ${meridiem(h24)}`;

/** Part of the day for the actual time. */
export function enDayPart(h24: number): string {
  const h = mod(h24, 24);
  if (h === 0 || h >= 21) return 'at night';
  if (h < 12) return 'in the morning';
  if (h < 18) return 'in the afternoon';
  return 'in the evening';
}

/** "a quarter to four in the afternoon", "midnight", "noon". */
export function enWithDayPart(h24: number, m: number): string {
  const h = mod(h24, 24);
  if (m === 0 && h === 0) return 'midnight';
  if (m === 0 && h === 12) return 'noon';
  return `${pastTo(h, m)} ${enDayPart(h)}`;
}

// ------------------------------------------------------------- Spanish --

/** Part of the day attached to the Spanish hour word that is actually said. */
export function esDayPart(h24: number): string {
  const h = mod(h24, 24);
  if (h === 0 || h >= 21) return 'de la noche';
  if (h <= 5) return 'de la madrugada';
  if (h <= 11) return 'de la mañana';
  if (h === 12) return 'del mediodía';
  return 'de la tarde';
}

/**
 * "Son las tres y cuarto.", "Es la una menos cuarto.", "Son las doce en punto."
 * 1–30 minutes: "y" + current hour (15 = cuarto, 30 = media);
 * 31–59: "menos" + next hour (45 = cuarto). "Es la" only when the hour said is one.
 */
export function esTime(h24: number, m: number, withDayPart = false): string {
  const said = m > 30 ? h24 + 1 : h24;
  const H = hour12(said);
  const lead = H === 1 ? 'Es la' : 'Son las';
  let mins: string;
  if (m === 0) mins = 'en punto';
  else if (m === 15) mins = 'y cuarto';
  else if (m === 30) mins = 'y media';
  else if (m === 45) mins = 'menos cuarto';
  else if (m < 30) mins = `y ${ES_NUM[m]}`;
  else mins = `menos ${ES_NUM[60 - m]}`;
  if (!withDayPart) return `${lead} ${ES_HOUR[H]} ${mins}.`;
  const h = mod(h24, 24);
  if (m === 0 && h === 0) return 'Son las doce de la noche (medianoche).';
  if (m === 0 && h === 12) return 'Son las doce del mediodía.';
  return `${lead} ${ES_HOUR[H]} ${mins} ${esDayPart(said)}.`;
}

// -------------------------------------------------------- alternatives --

export interface TimeAlt {
  kind: string;
  text: string;
  note?: string;
}

/** Every useful way to say one time, for the "Otras formas" panel. */
export function timeAlternatives(h24: number, m: number): TimeAlt[] {
  const out: TimeAlt[] = [
    { kind: 'Tradicional', text: enTime(h24, m), note: 'past / to — muy común en Reino Unido' },
    { kind: 'Digital', text: enDigital(h24, m), note: m > 0 && m < 10 ? 'El 0 se lee “oh”' : 'Lee la hora y luego los minutos' },
  ];
  if (m === 0) out.push({ kind: 'En punto', text: `It’s ${hourWord(h24)} o’clock sharp.`, note: 'También: It’s exactly ' + hourWord(h24) + '.' });
  if (m === 15 || m === 45) out.push({ kind: 'Sin “a”', text: `It’s ${pastTo(h24, m).replace(/^a /, '')}.`, note: 'quarter past / quarter to también es correcto' });
  const us = usWords(h24, m);
  if (us) out.push({ kind: 'EE. UU.', text: `It’s ${us}.`, note: m < 30 ? '“after” = past' : '“of” (o “till”) = to' });
  const h = mod(h24, 24);
  out.push({
    kind: 'a.m. / p.m.',
    text: `It’s ${digitalAmPm(h24, m)}${m === 0 && h === 0 ? ' (midnight)' : m === 0 && h === 12 ? ' (noon)' : ''}`,
    note: `= ${enWithDayPart(h24, m)}`,
  });
  out.push({ kind: '24 horas', text: digital24(h24, m), note: 'Horarios de trenes, vuelos…' });
  return out;
}
