/**
 * Time Machine — content ported from the legacy single-file module
 * (public/modules/time-machine/time-machine.html). Every item of the original
 * MONTHS, IRREG, STAGES, TIMELINE, VIDEO, TARGET, VOWELS and NO_DOUBLE is kept;
 * content errors were corrected in place (see the porting notes in the
 * feature's report: Colombian holiday dates, Chernobyl's date, wrong
 * corrections in "common mistakes", video answers, etc.).
 *
 * English is the learning language; `es` fields are the Spanish hints.
 */

// ------------------------------------------------------------------ types --

export type StageId = 'months' | 'dates' | 'years' | 'days' | 'past' | 'tobe' | 'cont' | 'perfect' | 'timeline' | 'video';
export type MonthKey = 'jan' | 'feb' | 'mar' | 'apr' | 'may' | 'jun' | 'jul' | 'aug' | 'sep' | 'oct' | 'nov' | 'dec';

export interface Bilingual {
  en: string;
  es: string;
}
export interface Step {
  n: string;
  h: string;
  body: string;
  es: string;
}
export interface Mistake {
  wrong: string;
  right: string;
  why: string;
  es: string;
}
export interface StageQuizItem {
  prompt: string;
  es: string;
  options: string[];
  /** Index of the right option (options are shuffled at render time). */
  answer: number;
  why: string;
  whyEs: string;
}
export interface StageTable {
  title: string;
  note: string;
  cols: string[];
  rows: string[][];
}
export interface VideoQuestion {
  n: string;
  q: string;
  a: string;
}
export interface VideoItem {
  id: string;
  title: string;
  tag: string;
  brief: string;
  /** youtube-nocookie embed URL, or '' when the video can only be searched. */
  embed: string;
  link: string;
  linkLabel: string;
  questions: VideoQuestion[];
}
export interface Stage {
  id: StageId;
  num: string;
  title: string;
  es: string;
  blurb: string;
  intro: string;
  introEs: string;
  formula: string;
  steps: Step[];
  tables: StageTable[];
  points: Bilingual[];
  examples: Bilingual[];
  mistakes: Mistake[];
  quiz: StageQuizItem[];
  /** Practice tool that replaces the quiz for the last two stages. */
  tool?: 'timeline' | 'notebook';
  videos?: VideoItem[];
}
export interface Month {
  key: MonthKey;
  name: string;
  es: string;
  /** Spanish-friendly approximation, as taught in class (stress marked). */
  say: string;
  ipa: string;
  img: string;
  audio: string;
  fest: string;
  date: string;
  days: number;
}

// ------------------------------------------------------------------ months --

const BASE = '/grammar/time-machine';
const M = (key: MonthKey, name: string, es: string, say: string, ipa: string, fest: string, date: string, days: number): Month => ({
  key,
  name,
  es,
  say,
  ipa,
  img: `${BASE}/months/${key}.webp`,
  audio: `${BASE}/audio/${key}.m4a`,
  fest,
  date,
  days,
});

export const MONTHS: Month[] = [
  M('jan', 'January', 'enero — Día de los Reyes Magos', '/yániueri/', '/ˈdʒæn.ju.er.i/', 'Three Kings Day', 'on January 6th', 31),
  M('feb', 'February', 'febrero — San Valentín', '/fébrueri/', '/ˈfeb.ru.er.i/', 'St Valentine’s Day', 'on February 14th', 28),
  M('mar', 'March', 'marzo — Día de la Mujer', '/march/', '/mɑːrtʃ/', 'Women’s Day', 'on March 8th', 31),
  M('apr', 'April', 'abril — Día del Niño (último sábado de abril)', '/éiprol/', '/ˈeɪ.prəl/', 'Children’s Day', 'on the last Saturday of April', 30),
  M('may', 'May', 'mayo — Día de la Madre (segundo domingo de mayo)', '/mei/', '/meɪ/', 'Mother’s Day', 'on the second Sunday of May', 31),
  M('jun', 'June', 'junio — Día del Padre (tercer domingo de junio)', '/yun/', '/dʒuːn/', 'Father’s Day', 'on the third Sunday of June', 30),
  M('jul', 'July', 'julio — Día de la Independencia', '/yulái/', '/dʒʊˈlaɪ/', 'Independence Day', 'on July 20th', 31),
  M('aug', 'August', 'agosto — mes de las cometas', '/ógost/', '/ˈɑː.ɡəst/', 'Kite month (kites /kaɪts/)', 'all month — the windy season', 31),
  M('sep', 'September', 'septiembre — Amor y Amistad (tercer sábado de septiembre)', '/septémber/', '/sepˈtem.bɚ/', 'Love and Friendship Day', 'on the third Saturday of September', 30),
  M('oct', 'October', 'octubre — Halloween', '/aktóuber/', '/ɑːkˈtoʊ.bɚ/', 'Halloween', 'on October 31st', 31),
  M('nov', 'November', 'noviembre — Independencia de Cartagena', '/novémber/', '/noʊˈvem.bɚ/', 'Cartagena’s Independence Day', 'on November 11th', 30),
  M('dec', 'December', 'diciembre — Navidad', '/disémber/', '/dɪˈsem.bɚ/', 'Christmas Day', 'on December 25th', 31),
];

export const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'] as const;
export const WEEKDAYS_ES = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'] as const;

// -------------------------------------------------------- irregular verbs --

/**
 * base → [past simple, past participle]. The legacy list is kept in full
 * (get's participle now shows both varieties); a few very common verbs used by
 * the lessons (feed, let, hit…) were added so the engines recognise them.
 */
export const IRREG: Record<string, [string, string]> = {
  be: ['was / were', 'been'], become: ['became', 'become'], begin: ['began', 'begun'], break: ['broke', 'broken'], bring: ['brought', 'brought'],
  build: ['built', 'built'], buy: ['bought', 'bought'], catch: ['caught', 'caught'], choose: ['chose', 'chosen'], come: ['came', 'come'],
  cut: ['cut', 'cut'], do: ['did', 'done'], drink: ['drank', 'drunk'], drive: ['drove', 'driven'], eat: ['ate', 'eaten'], fall: ['fell', 'fallen'],
  feel: ['felt', 'felt'], find: ['found', 'found'], fly: ['flew', 'flown'], forget: ['forgot', 'forgotten'], get: ['got', 'got / gotten'],
  give: ['gave', 'given'], go: ['went', 'gone'], grow: ['grew', 'grown'], have: ['had', 'had'], hear: ['heard', 'heard'], hold: ['held', 'held'],
  keep: ['kept', 'kept'], know: ['knew', 'known'], leave: ['left', 'left'], lose: ['lost', 'lost'], make: ['made', 'made'], meet: ['met', 'met'],
  pay: ['paid', 'paid'], put: ['put', 'put'], read: ['read', 'read'], ride: ['rode', 'ridden'], run: ['ran', 'run'], say: ['said', 'said'],
  see: ['saw', 'seen'], sell: ['sold', 'sold'], send: ['sent', 'sent'], sing: ['sang', 'sung'], sit: ['sat', 'sat'], sleep: ['slept', 'slept'],
  speak: ['spoke', 'spoken'], spend: ['spent', 'spent'], stand: ['stood', 'stood'], swim: ['swam', 'swum'], take: ['took', 'taken'],
  teach: ['taught', 'taught'], tell: ['told', 'told'], think: ['thought', 'thought'], understand: ['understood', 'understood'],
  wear: ['wore', 'worn'], win: ['won', 'won'], write: ['wrote', 'written'],
  // additions
  bite: ['bit', 'bitten'], blow: ['blew', 'blown'], dig: ['dug', 'dug'], draw: ['drew', 'drawn'], feed: ['fed', 'fed'], fight: ['fought', 'fought'],
  forgive: ['forgave', 'forgiven'], freeze: ['froze', 'frozen'], hide: ['hid', 'hidden'], hit: ['hit', 'hit'], hurt: ['hurt', 'hurt'],
  lead: ['led', 'led'], lend: ['lent', 'lent'], let: ['let', 'let'], mean: ['meant', 'meant'], quit: ['quit', 'quit'], ring: ['rang', 'rung'],
  rise: ['rose', 'risen'], set: ['set', 'set'], shake: ['shook', 'shaken'], shoot: ['shot', 'shot'], show: ['showed', 'shown'], shut: ['shut', 'shut'],
  steal: ['stole', 'stolen'], throw: ['threw', 'thrown'], wake: ['woke', 'woken'], upset: ['upset', 'upset'], cost: ['cost', 'cost'], light: ['lit', 'lit'],
};

// --------------------------------------------------------- spelling sets --

export const VOWELS = 'aeiou';
/** Final letters that are never doubled: snow → snowed, fix → fixed, play → played. */
export const NO_DOUBLE = 'wxy';
/**
 * Two-syllable verbs stressed on the LAST syllable: they double the final
 * consonant like one-syllable verbs (admit → admitted, prefer → preferred).
 * Verbs stressed on the first syllable do not (visit → visited, open → opened).
 */
export const STRESSED_FINAL = [
  'admit', 'commit', 'permit', 'omit', 'submit', 'emit', 'transmit', 'acquit', 'outwit', 'regret', 'forget', 'beget', 'begin',
  'prefer', 'refer', 'confer', 'defer', 'infer', 'transfer', 'deter', 'occur', 'recur', 'incur', 'concur', 'abhor',
  'control', 'patrol', 'enrol', 'compel', 'expel', 'propel', 'repel', 'excel', 'rebel', 'equip', 'allot', 'upset', 'unzip', 'embed',
];
/** -ic verbs add k before -ed / -ing: panic → panicked, picnic → picnicking. */
export const IC_VERBS = ['panic', 'picnic', 'mimic', 'traffic', 'frolic'];

// ------------------------------------------------------------- stages --

const T = (title: string, note: string, cols: string[], rows: string[][]): StageTable => ({ title, note, cols, rows });

export const STAGES: Stage[] = [
  {
    id: 'months', num: '01', title: 'Months of the Year', es: 'Los meses del año',
    blurb: 'Pronunciation, celebrations and the prepositions in / on.',
    intro: 'Every month has a name, a pronunciation and — in Colombia — a celebration. Listen to each month, then check when you use IN and when you use ON.',
    introEs: 'Cada mes tiene nombre, pronunciación y una celebración. Escucha cada mes y revisa cuándo se usa IN y cuándo ON.',
    formula: 'IN + month   ·   ON + full date   →   in January · on January 6th',
    steps: [
      { n: '1', h: 'Say the name', body: 'The twelve names are fixed and always take a capital letter. Listen to the audio and repeat.', es: 'Los doce nombres son fijos y siempre llevan mayúscula.' },
      { n: '2', h: 'Choose the preposition', body: 'Only a month → IN. Month with the day → ON.', es: 'Solo el mes → IN. Mes con día → ON.' },
      { n: '3', h: 'Add the ordinal day', body: 'Say the day as an ordinal number: January sixth, March eighth, October thirty-first (written 6th, 8th, 31st).', es: 'El día se dice como ordinal: sixth, eighth, thirty-first.' },
    ],
    tables: [
      T('Table · the twelve months', 'Pronunciation as it was taught in class (with the IPA), plus the celebration of each month in Colombia.',
        ['Month', 'Pronunciation', 'IPA', 'Celebration', 'Date'],
        MONTHS.map((m) => [m.name, m.say, m.ipa, m.fest, m.date])),
      T('Table · IN or ON?', 'The preposition depends on how much information the date carries.',
        ['What you name', 'Preposition', 'Example'],
        [['Only the month', 'IN', 'in September'], ['Month + day', 'ON', 'on September 18th'], ['Only the year', 'IN', 'in 2020'], ['Day of the week', 'ON', 'on Friday'], ['Part of the day', 'IN / AT', 'in the morning · at night']]),
    ],
    points: [
      { en: 'Months are always written with a capital letter in English.', es: 'En inglés los meses SIEMPRE llevan mayúscula.' },
      { en: 'Use IN before a month on its own: In March, we celebrate Women’s Day.', es: 'Usa IN antes de un mes solo: in March.' },
      { en: 'Use ON before a complete date with the day: on March 8th.', es: 'Usa ON antes de una fecha completa con el día: on March 8th.' },
      { en: 'The day is an ordinal number: 6th, 8th, 14th, 20th, 31st.', es: 'El día es un número ordinal: 6th, 8th, 14th, 20th, 31st.' },
      { en: 'Some Colombian celebrations move every year: they fall on a weekday of the month (on the second Sunday of May), so you still use ON.', es: 'Algunas celebraciones cambian de fecha cada año (el segundo domingo de mayo) y también llevan ON.' },
    ],
    examples: [
      { en: 'In January, in Colombia we celebrate Three Kings Day on January 6th.', es: 'En enero celebramos el Día de Reyes el 6 de enero.' },
      { en: 'In September, we celebrate Love and Friendship Day on the third Saturday of the month.', es: 'En septiembre celebramos Amor y Amistad el tercer sábado del mes.' },
      { en: 'In August, we fly kites: it is the kite month.', es: 'En agosto elevamos cometas: es el mes de las cometas.' },
      { en: 'In November, we celebrate Cartagena’s Independence Day on November 11th.', es: 'En noviembre celebramos la independencia de Cartagena el 11 de noviembre.' },
    ],
    mistakes: [
      { wrong: 'in january', right: 'in January', why: 'Months take a capital letter, always.', es: 'Mayúscula inicial obligatoria.' },
      { wrong: 'on January we celebrate…', right: 'in January we celebrate…', why: 'ON is only used when the day appears.', es: 'ON solo va cuando aparece el día.' },
      { wrong: 'We celebrate it on January six.', right: 'We celebrate it on January sixth.', why: 'Say the day as an ordinal: sixth, not six. (British English also writes 6 January — see the US vs UK table in Dates.)', es: 'El día se dice como ordinal: sixth, no six.' },
    ],
    quiz: [
      { prompt: 'Choose the correct sentence.', options: ['In January we celebrate Three Kings Day.', 'On January we celebrate Three Kings Day.', 'In january we celebrate three kings day.'], answer: 0, why: 'IN goes with a month alone, and the month keeps its capital letter.', whyEs: 'IN va con el mes solo, y el mes con mayúscula.', es: 'Elige la oración correcta.' },
      { prompt: 'Which month is pronounced /ógost/ ?', options: ['August', 'April', 'October'], answer: 0, why: 'August = /ógost/. April is /éiprol/ and October is /aktóuber/.', whyEs: 'August se pronuncia /ógost/.', es: '¿Qué mes se pronuncia /ógost/?' },
      { prompt: 'We celebrate Cartagena’s Independence Day ___ November 11th.', options: ['on', 'in', 'at'], answer: 0, why: 'ON introduces a full date: month + ordinal day.', whyEs: 'ON introduce una fecha completa.', es: 'Completa la oración.' },
      { prompt: 'In Colombia, Mother’s Day is in…', options: ['May', 'March', 'June'], answer: 0, why: 'Mother’s Day is on the second Sunday of May; Father’s Day is on the third Sunday of June.', whyEs: 'El Día de la Madre es el segundo domingo de mayo.', es: '¿En qué mes es el Día de la Madre?' },
      { prompt: 'Which date is written correctly?', options: ['on November 11th', 'on 11 november', 'in November 11'], answer: 0, why: 'Capital letter, month first, ordinal day, ON for the full date.', whyEs: 'Mayúscula, mes primero, día ordinal y ON.', es: '¿Cuál fecha está bien escrita?' },
    ],
  },
  {
    id: 'dates', num: '02', title: 'Writing Dates', es: 'Cómo escribir fechas',
    blurb: 'Day of the week, month, ordinal day, year — in that order.',
    intro: 'A complete date in American English follows one order: the day of the week, the month, the ordinal day and the year, separated by commas. British English puts the day before the month.',
    introEs: 'Una fecha completa en inglés americano sigue un orden: día de la semana, mes, día ordinal y año, separados por comas. El inglés británico pone el día antes del mes.',
    formula: 'Friday,  August  12th,  2022   →   day of the week + month + ordinal day + year',
    steps: [
      { n: '1', h: 'Start with the day of the week', body: 'It opens the date and takes a comma: Friday,', es: 'Abre la fecha y lleva coma: Friday,' },
      { n: '2', h: 'Write the month, then the day', body: 'The month comes before the number, and the number is ordinal: August 12th', es: 'El mes va antes del número, y el número es ordinal.' },
      { n: '3', h: 'Close with the year', body: 'A comma separates the day from the year: August 12th, 2022', es: 'Una coma separa el día del año.' },
    ],
    tables: [
      T('Table · the four positions of a date (US)', 'This course uses the American order. In British English the day goes first: Friday 12th August 2022.',
        ['Position', 'Element', 'Example', 'Note'],
        [['1', 'Day of the week', 'Friday,', 'Optional, but always first'], ['2', 'Month', 'August', 'Capital letter'], ['3', 'Ordinal day', '12th,', 'Said as an ordinal: twelfth'], ['4', 'Year', '2022', 'Read as nineteen / twenty + pair']]),
      T('Chart · ordinal numbers', 'The ending depends on the last digit: 1 → st, 2 → nd, 3 → rd, everything else → th. But 11, 12 and 13 always take th.',
        ['Number', 'Ordinal', 'Number', 'Ordinal', 'Number', 'Ordinal'],
        [['1', '1st', '11', '11th', '21', '21st'], ['2', '2nd', '12', '12th', '22', '22nd'], ['3', '3rd', '13', '13th', '23', '23rd'], ['4', '4th', '14', '14th', '24', '24th'], ['5', '5th', '15', '15th', '30', '30th'], ['6', '6th', '20', '20th', '31', '31st']]),
      T('Table · American vs British dates', 'Both are correct. Numeric dates are dangerous: 03/04/2022 is March 4th in the US but 3 April in the UK.',
        ['', 'American (US)', 'British (UK)'],
        [['Written', 'Friday, August 12th, 2022', 'Friday 12th August 2022 · 12 August 2022'], ['Numbers', '8/12/2022 (month/day/year)', '12/08/2022 (day/month/year)'], ['Spoken', 'August twelfth, twenty twenty-two', 'the twelfth of August, twenty twenty-two']]),
    ],
    points: [
      { en: 'US order: day of the week, month, day, year.', es: 'Orden americano: día de la semana, mes, día, año.' },
      { en: 'Ordinals: 1st, 2nd, 3rd, 4th… 11th, 12th, 13th… 21st, 22nd, 23rd, 31st.', es: 'Ordinales: 1st, 2nd, 3rd, 4th… 11th, 12th, 13th… 21st, 31st.' },
      { en: 'A comma goes after the day of the week and after the day number.', es: 'La coma va después del día de la semana y después del número del día.' },
      { en: 'ON + date, IN + month or year: on August 12th, in August, in 2022.', es: 'ON + fecha, IN + mes o año.' },
    ],
    examples: [
      { en: 'Friday, August 12th, 2022', es: 'viernes, 12 de agosto de 2022' },
      { en: 'My birthday is on March 3rd.', es: 'Mi cumpleaños es el 3 de marzo.' },
      { en: 'The discovery of America was on October 12th, 1492.', es: 'El descubrimiento de América fue el 12 de octubre de 1492.' },
      { en: 'The Chernobyl accident was on April 26th, 1986.', es: 'El accidente de Chernóbil fue el 26 de abril de 1986.' },
    ],
    mistakes: [
      { wrong: 'August 2th', right: 'August 2nd', why: 'Numbers ending in 1, 2, 3 take st, nd, rd (1st, 22nd, 23rd) — except 11th, 12th, 13th. Every other number takes -th.', es: 'Terminados en 1, 2, 3 → st, nd, rd (salvo 11th, 12th, 13th). Los demás → th.' },
      { wrong: 'August 12th, Friday', right: 'Friday, August 12th', why: 'The day of the week always comes first.', es: 'El día de la semana va primero.' },
      { wrong: 'in August 12th', right: 'on August 12th', why: 'IN is for the month alone; ON is for the exact date.', es: 'IN para el mes solo; ON para la fecha exacta.' },
    ],
    quiz: [
      { prompt: 'Which date is in the correct (American) order?', options: ['Friday, August 12th, 2022', 'August Friday 12th 2022', '12th August, Friday 2022'], answer: 0, why: 'Day of the week, month, ordinal day, year.', whyEs: 'Día de la semana, mes, día ordinal, año.', es: '¿Cuál fecha está en el orden correcto?' },
      { prompt: 'The ordinal number for 2 is…', options: ['2nd', '2th', '2rd'], answer: 0, why: 'One → 1st, two → 2nd, three → 3rd.', whyEs: 'Uno → 1st, dos → 2nd, tres → 3rd.', es: 'El ordinal de 2 es…' },
      { prompt: 'My birthday is ___ March 3rd.', options: ['on', 'in', 'at'], answer: 0, why: 'ON is used with a specific date.', whyEs: 'ON se usa con una fecha específica.', es: 'Completa: My birthday is ___ March 3rd.' },
      { prompt: 'Which ordinal is correct for 21?', options: ['21st', '21th', '21nd'], answer: 0, why: '21 ends in 1, so it takes -st: twenty-first.', whyEs: '21 termina en 1, entonces lleva -st.', es: '¿Cuál ordinal es correcto para 21?' },
      { prompt: 'Which ordinal is correct for 12?', options: ['12th', '12nd', '12st'], answer: 0, why: '11, 12 and 13 are exceptions: eleventh, twelfth, thirteenth all take -th.', whyEs: '11, 12 y 13 son excepciones: siempre -th.', es: '¿Cuál ordinal es correcto para 12?' },
      { prompt: 'How do you read October 12th, 1492?', options: ['October twelfth, fourteen ninety-two', 'October twelve, one four nine two', 'October twelfth, fourteen hundred two'], answer: 0, why: 'The day is an ordinal and the year is split in two parts.', whyEs: 'El día es ordinal y el año se divide en dos partes.', es: '¿Cómo se lee October 12th, 1492?' },
      { prompt: 'In the UK, 04/07/2022 means…', options: ['4 July 2022', 'April 7th, 2022', 'July 2022'], answer: 0, why: 'British numeric dates are day/month/year. In the US the same numbers mean April 7th.', whyEs: 'En el Reino Unido es día/mes/año; en EE. UU. sería 7 de abril.', es: 'En el Reino Unido, 04/07/2022 significa…' },
    ],
  },
  {
    id: 'years', num: '03', title: 'Saying the Years', es: 'Cómo decir los años',
    blurb: 'Split the year, or read the whole number.',
    intro: 'There are two ways to say a year. You can split it in two parts, or read the whole number. Splitting is the natural, everyday option.',
    introEs: 'Hay dos formas de decir un año: dividirlo en dos partes o leer el número completo. Dividirlo es lo más natural.',
    formula: '1983  →  19 | 83  →  “nineteen eighty-three”   ·   whole number: “one thousand nine hundred (and) eighty-three”',
    steps: [
      { n: '1', h: 'Cut the year in half', body: 'Four digits become two pairs: 19 | 83. Each pair is read as a single number.', es: 'Cuatro dígitos se vuelven dos pares: 19 | 83.' },
      { n: '2', h: 'Say pair one, then pair two', body: 'First nineteen (19), then eighty-three (83): “nineteen eighty-three”.', es: 'Primero nineteen (19), luego eighty-three (83).' },
      { n: '3', h: 'Or read it whole', body: 'Say the complete number: “one thousand nine hundred eighty-three” (British English adds “and”). Correct, but formal and long.', es: 'O lee el número completo: más formal y largo.' },
    ],
    tables: [
      T('Table · the same year, two roads', 'Both readings are correct. The split version is what people use when they speak.',
        ['Year', 'Split (natural)', 'Whole number (formal)'],
        [['1983', 'nineteen eighty-three', 'one thousand nine hundred (and) eighty-three'], ['1492', 'fourteen ninety-two', 'one thousand four hundred (and) ninety-two'], ['1986', 'nineteen eighty-six', 'one thousand nine hundred (and) eighty-six'], ['1900', 'nineteen hundred', 'one thousand nine hundred'], ['2005', 'two thousand (and) five', 'two thousand (and) five'], ['2020', 'twenty twenty', 'two thousand (and) twenty']]),
      T('Table · special cases', 'Not every year splits in the same way.',
        ['Type of year', 'Rule', 'Example'],
        [['Ends in 00', 'Use “hundred”', '1800 → eighteen hundred'], ['Ends in 01–09 (before 2000)', 'Say “oh” for the zero', '1905 → nineteen oh five'], ['2000–2009', 'two thousand (and) + number', '2007 → two thousand seven'], ['2010 onwards', 'Split again (or two thousand + number)', '2026 → twenty twenty-six · 2010 → twenty ten / two thousand ten'], ['With a date', 'Month + ordinal day + year', 'on April 26th, 1986']]),
    ],
    points: [
      { en: 'Split the year: say the first two digits, then the last two.', es: 'Divide el año: primero dos dígitos, luego los otros dos.' },
      { en: 'Read the whole number when you want to be formal or very clear.', es: 'Lee el número completo cuando quieras ser formal o muy claro.' },
      { en: 'Years from 2000 to 2009: two thousand + number (2005 = two thousand five).', es: 'De 2000 a 2009: two thousand + número.' },
      { en: 'From 2010 the split returns: 2020 = twenty twenty (two thousand twenty is also heard, especially for 2010–2019).', es: 'Desde 2010 vuelve la división: 2020 = twenty twenty.' },
      { en: 'A zero in the third position is said “oh”: 1905 = nineteen oh five.', es: 'Un cero en la tercera posición se dice “oh”: 1905 = nineteen oh five.' },
    ],
    examples: [
      { en: '1983 → nineteen eighty-three', es: 'mil novecientos ochenta y tres' },
      { en: '1492 → fourteen ninety-two', es: 'mil cuatrocientos noventa y dos' },
      { en: '1986 → nineteen eighty-six', es: 'mil novecientos ochenta y seis' },
      { en: '2020 → twenty twenty', es: 'dos mil veinte' },
    ],
    mistakes: [
      { wrong: '1983 = nineteen eight three', right: 'nineteen eighty-three', why: 'The second pair is one number: 83 = eighty-three.', es: 'El segundo par es un número: 83 = eighty-three.' },
      { wrong: '2020 = two zero two zero', right: 'twenty twenty', why: 'Years are not read digit by digit.', es: 'Los años no se leen dígito por dígito.' },
      { wrong: 'in 1986 year', right: 'in 1986', why: 'The word “year” is not repeated after the number.', es: 'No se repite la palabra “year” después del número.' },
    ],
    quiz: [
      { prompt: '1983 split in two parts is…', options: ['nineteen eighty-three', 'one nine eight three', 'nineteen eight three'], answer: 0, why: '19 = nineteen, 83 = eighty-three.', whyEs: '19 = nineteen, 83 = eighty-three.', es: '1983 dividido en dos partes es…' },
      { prompt: 'The whole-number way to say 1983:', options: ['one thousand nine hundred eighty-three', 'one thousand nine eighty three', 'nineteen thousand eighty-three'], answer: 0, why: 'That is the complete number, used in formal contexts.', whyEs: 'Ese es el número completo, de uso formal.', es: 'La forma de número completo para 1983:' },
      { prompt: '2020 is usually said…', options: ['twenty twenty', 'two zero two zero', 'two thousand and twenty-zero'], answer: 0, why: 'From 2010 on, English splits the year again.', whyEs: 'Desde 2010 el año se vuelve a dividir.', es: '2020 normalmente se dice…' },
      { prompt: 'Listening task: “Chernobyl Nuclear Accident, 26 April 1986”. Write it in American English:', options: ['April 26th, 1986 — nineteen eighty-six', '26 April, nineteen eight six', 'April 26nd, 1986'], answer: 0, why: 'Month first, ordinal day, and the year split in two parts.', whyEs: 'Mes primero, día ordinal y año dividido.', es: 'Escribe la fecha del accidente de Chernóbil en inglés:' },
      { prompt: 'The discovery of America: October 12th, 1492. How do you say the year?', options: ['fourteen ninety-two', 'one four nine two', 'fourteen hundred nine two'], answer: 0, why: '14 = fourteen, 92 = ninety-two.', whyEs: '14 = fourteen, 92 = ninety-two.', es: '¿Cómo se dice el año 1492?' },
      { prompt: 'How do you say 1905?', options: ['nineteen oh five', 'nineteen five', 'nineteen zero five'], answer: 0, why: 'A zero in the third digit is read “oh”.', whyEs: 'El cero en el tercer dígito se dice “oh”.', es: '¿Cómo se dice 1905?' },
    ],
  },
  {
    id: 'days', num: '04', title: 'Days of the Week', es: 'Los días de la semana',
    blurb: 'On Monday, on Tuesday — and your daily routine.',
    intro: 'Days of the week take a capital letter and the preposition ON. Use the plural when the action repeats every week.',
    introEs: 'Los días llevan mayúscula y la preposición ON. Usa el plural cuando la acción se repite cada semana.',
    formula: 'What do you do on Monday?   →   I + verb + on + day',
    steps: [
      { n: '1', h: 'Learn the seven names', body: 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday — all with a capital letter.', es: 'Los siete nombres, todos con mayúscula.' },
      { n: '2', h: 'Add ON', body: 'A day always takes ON: on Monday, on Friday. Never “in Monday”.', es: 'Un día siempre lleva ON, nunca IN.' },
      { n: '3', h: 'Answer the question', body: 'What do you do on Monday? → I study English on Monday.', es: '¿Qué haces el lunes? → I study English on Monday.' },
    ],
    tables: [
      T('Table · the seven days and the class question', 'The question from class, with a model answer for each day.',
        ['Day', 'En español', 'Question', 'Model answer'],
        [['Monday', 'lunes', 'What do you do on Monday?', 'I study English on Monday.'], ['Tuesday', 'martes', 'What do you do on Tuesday?', 'I work on Tuesday.'], ['Wednesday', 'miércoles', 'What do you do on Wednesday?', 'I work from 6 am to 11 pm on Wednesday.'], ['Thursday', 'jueves', 'What do you do on Thursday?', 'I go to the university on Thursday.'], ['Friday', 'viernes', 'What do you do on Friday?', 'I visit my family on Friday.'], ['Saturday', 'sábado', 'What do you do on Saturday?', 'I play football on Saturdays.'], ['Sunday', 'domingo', 'What do you do on Sunday?', 'I rest on Sunday.']]),
      T('Table · singular or plural?', 'The plural turns one day into a weekly routine.',
        ['Form', 'Meaning', 'Example'],
        [['on Monday', 'one specific Monday', 'I had an exam on Monday.'], ['on Mondays', 'every Monday', 'I have English on Mondays.'], ['last Monday', 'the Monday that passed', 'Last Monday I was in Cali.'], ['next Monday', 'the Monday that comes', 'Next Monday I travel to Salento.']]),
    ],
    points: [
      { en: 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.', es: 'lunes, martes, miércoles, jueves, viernes, sábado, domingo.' },
      { en: 'Always ON with a day: on Friday, not in Friday.', es: 'Siempre ON con un día: on Friday.' },
      { en: 'On Mondays (plural) = every Monday.', es: 'On Mondays (plural) = todos los lunes.' },
      { en: 'No preposition with last / next / this / every: last Monday, every Friday.', es: 'Sin preposición con last / next / this / every: last Monday.' },
      { en: 'Days always keep the capital letter, like the months.', es: 'Los días siempre llevan mayúscula, igual que los meses.' },
    ],
    examples: [
      { en: 'What do you do on Monday? — I study English on Monday.', es: '¿Qué haces el lunes? — Estudio inglés el lunes.' },
      { en: 'What do you do on Wednesday? — I work from 6 am to 11 pm.', es: '¿Qué haces el miércoles? — Trabajo de 6 am a 11 pm.' },
      { en: 'On Saturdays I visit my family.', es: 'Los sábados visito a mi familia.' },
      { en: 'I rest on Sunday.', es: 'Descanso el domingo.' },
    ],
    mistakes: [
      { wrong: 'in Monday', right: 'on Monday', why: 'Days of the week always take ON.', es: 'Los días de la semana siempre llevan ON.' },
      { wrong: 'on the Friday', right: 'on Friday', why: 'No article before the name of the day.', es: 'No se usa artículo antes del día.' },
      { wrong: 'every saturday', right: 'every Saturday · on Saturdays', why: 'Days take a capital letter. “On Saturdays” (plural) means the same as “every Saturday”.', es: 'Mayúscula siempre. “On Saturdays” = “every Saturday”.' },
    ],
    quiz: [
      { prompt: 'What do you do ___ Monday?', options: ['on', 'in', 'at'], answer: 0, why: 'Days of the week always take ON.', whyEs: 'Los días siempre llevan ON.', es: 'Completa: What do you do ___ Monday?' },
      { prompt: '“Every Saturday I play football” =', options: ['I play football on Saturdays.', 'I play football in Saturdays.', 'I play football at Saturday.'], answer: 0, why: 'The plural with ON expresses a weekly routine.', whyEs: 'El plural con ON expresa una rutina semanal.', es: '“Todos los sábados juego fútbol” =' },
      { prompt: 'Which spelling is correct?', options: ['Wednesday', 'wednesday', 'Wenesday'], answer: 0, why: 'Wednesday — capital W, and the first d is silent: /ˈwenz.deɪ/.', whyEs: 'Wednesday — con W mayúscula y la primera d muda.', es: '¿Cuál es la escritura correcta?' },
      { prompt: 'The day after Thursday is…', options: ['Friday', 'Saturday', 'Wednesday'], answer: 0, why: 'Wednesday, Thursday, Friday, Saturday.', whyEs: 'miércoles, jueves, viernes, sábado.', es: 'El día después de Thursday es…' },
    ],
  },
  {
    id: 'past', num: '05', title: 'Past Simple', es: 'Pasado simple',
    blurb: 'Finished actions, regular and irregular verbs, adverbs of time.',
    intro: 'The past simple talks about finished actions. You need the verb in past — regular with -ed, or irregular — and normally an adverb of time that says when it happened.',
    introEs: 'El pasado simple habla de acciones terminadas. Necesitas el verbo en pasado (regular con -ed o irregular) y normalmente un adverbio de tiempo.',
    formula: 'Subject + verb in past (regular or irregular) + complement',
    steps: [
      { n: '1', h: 'Check the verb', body: 'Is it regular or irregular? Regular adds -ed; irregular changes its form completely.', es: '¿Es regular o irregular? Regular agrega -ed; irregular cambia de forma.' },
      { n: '2', h: 'Build the sentence', body: 'Subject + verb in past + complement: I visited my girlfriend at 5 pm.', es: 'Sujeto + verbo en pasado + complemento.' },
      { n: '3', h: 'Add the time', body: 'Yesterday, last week, two years ago — the adverb fixes the action in the past.', es: 'El adverbio ubica la acción en el pasado.' },
      { n: '4', h: 'For the negative, use didn’t', body: 'Didn’t carries the past, so the verb returns to its base form.', es: 'Didn’t lleva el pasado, y el verbo vuelve a su forma base.' },
    ],
    tables: [
      T('Table · affirmative, negative, question', 'The verb only shows the past in the affirmative. DID takes over in the other two.',
        ['Form', 'Structure', 'Example'],
        [['Affirmative', 'subject + verb in past + complement', 'I worked from 6 am to 11 pm.'], ['Negative', 'subject + did not / didn’t + base verb', 'I didn’t call my daughter yesterday.'], ['Question', 'did + subject + base verb?', 'Did you travel to Salento?'], ['Short answer', 'Yes, I did. / No, I didn’t.', '— Did you study? — Yes, I did.']]),
      T('Table · regular verbs (+ed)', 'The spelling changes a little depending on the ending — try any verb in the spelling lab.',
        ['Base verb', 'Rule', 'Past'],
        [['work', '+ ed', 'worked'], ['visit', '+ ed (stress on VIS-it: no doubling)', 'visited'], ['design', '+ ed', 'designed'], ['like', 'ends in e → + d', 'liked'], ['study', 'consonant + y → ied', 'studied'], ['play', 'vowel + y → + ed', 'played'], ['travel', 'UK doubles the final l; US does not', 'travelled (UK) · traveled (US)'], ['stop', 'C-V-C, one syllable → double', 'stopped'], ['prefer', 'C-V-C, stress on the last syllable → double', 'preferred']]),
      T('Table · irregular verbs', 'Learn these three columns together — the third one is what the past perfect needs.',
        ['Base', 'Past simple', 'Past participle'],
        [['be', 'was / were', 'been'], ['go', 'went', 'gone'], ['make', 'made', 'made'], ['buy', 'bought', 'bought'], ['see', 'saw', 'seen'], ['write', 'wrote', 'written'], ['take', 'took', 'taken'], ['have', 'had', 'had'], ['win', 'won', 'won'], ['become', 'became', 'become']]),
      T('Chart · adverbs of time', 'They tell you how far back the action is.',
        ['Adverb', 'Distance from now', 'Example'],
        [['yesterday', '1 day back', 'I went to the supermarket yesterday.'], ['last week', '7 days back', 'Javier did not feed his fish last week.'], ['last month', 'about 30 days back', 'Last month, I travelled to Salento.'], ['last year', '1 year back', 'Regina designed a new house last year.'], ['two years ago', '2 years back', 'They got married two years ago.'], ['three weeks ago', '21 days back', 'We visited the lions at the zoo three weeks ago.']]),
    ],
    points: [
      { en: 'Regular verbs add -ed: work → worked, visit → visited, travel → travelled (UK) / traveled (US).', es: 'Los verbos regulares agregan -ed.' },
      { en: 'Irregular verbs change form: go → went, make → made, buy → bought.', es: 'Los irregulares cambian de forma: go → went.' },
      { en: 'Negative: subject + did not / didn’t + base verb + complement.', es: 'Negativo: sujeto + didn’t + verbo base.' },
      { en: 'Adverbs of time place the action in the past: yesterday, last week, two years ago.', es: 'Los adverbios de tiempo ubican la acción en el pasado.' },
    ],
    examples: [
      { en: 'I worked from 6 am to 11 pm.', es: 'Trabajé de 6 am a 11 pm.' },
      { en: 'I went to the university at 12 pm.', es: 'Fui a la universidad a las 12 pm.' },
      { en: 'Regina designed a new house last year.', es: 'Regina diseñó una casa nueva el año pasado.' },
      { en: 'Javier did not feed his fish last week.', es: 'Javier no alimentó sus peces la semana pasada.' },
      { en: 'I travelled to Salento one month ago.', es: 'Viajé a Salento hace un mes.' },
      { en: 'They got married two years ago.', es: 'Se casaron hace dos años.' },
    ],
    mistakes: [
      { wrong: 'I didn’t called my daughter.', right: 'I didn’t call my daughter.', why: 'After DIDN’T the verb goes back to its base form.', es: 'Después de DIDN’T el verbo va en forma base.' },
      { wrong: 'I go to the university yesterday.', right: 'I went to the university yesterday.', why: 'With yesterday the verb must be in past.', es: 'Con yesterday el verbo debe ir en pasado.' },
      { wrong: 'I travelled Salento last month.', right: 'I travelled to Salento last month.', why: 'Travel needs TO before the destination.', es: 'Travel necesita TO antes del destino.' },
      { wrong: 'She goed home.', right: 'She went home.', why: 'Go is irregular — no -ed.', es: 'Go es irregular, no lleva -ed.' },
      { wrong: 'I visitted my aunt.', right: 'I visited my aunt.', why: 'Only stressed final syllables double: VIS-it → visited, but ad-MIT → admitted.', es: 'Solo se duplica si la última sílaba es tónica: visited, pero admitted.' },
    ],
    quiz: [
      { prompt: 'I ___ to the university at 12 pm.', options: ['went', 'goed', 'go'], answer: 0, why: 'Go is irregular: go → went.', whyEs: 'Go es irregular: go → went.', es: 'Completa la oración en pasado.' },
      { prompt: 'Negative: I ___ my daughter yesterday.', options: ['didn’t call', 'didn’t called', 'not called'], answer: 0, why: 'DIDN’T + base verb.', whyEs: 'DIDN’T + verbo base.', es: 'Negativo: I ___ my daughter yesterday.' },
      { prompt: 'Regina ___ a new house last year.', options: ['designed', 'design', 'designs'], answer: 0, why: 'Regular verb + -ed, because the action is finished.', whyEs: 'Verbo regular + -ed, la acción terminó.', es: 'Completa: Regina ___ a new house last year.' },
      { prompt: 'Which adverb of time is correct? They got married ___.', options: ['two years ago', 'since two years', 'last two years'], answer: 0, why: '“Ago” counts back from now: two years ago.', whyEs: '“Ago” cuenta desde ahora hacia atrás.', es: '¿Qué adverbio de tiempo es correcto?' },
      { prompt: 'The structure of the past simple is…', options: ['Subject + verb in past + complement', 'Subject + did + verb in past', 'Subject + was + verb in past'], answer: 0, why: 'That is the affirmative structure; DID only appears in negatives and questions.', whyEs: 'Esa es la estructura afirmativa; DID solo aparece en negativos y preguntas.', es: 'La estructura del pasado simple es…' },
      { prompt: 'Javier ___ his fish last week.', options: ['did not feed', 'did not fed', 'not feed'], answer: 0, why: 'DID NOT + base verb: feed, not fed.', whyEs: 'DID NOT + verbo base: feed.', es: 'Completa: Javier ___ his fish last week.' },
      { prompt: 'Which past form is spelled correctly?', options: ['stopped', 'stoped', 'stopt'], answer: 0, why: 'stop is one syllable C-V-C → double the p: stopped.', whyEs: 'stop es C-V-C de una sílaba → se duplica la p.', es: '¿Cuál pasado está bien escrito?' },
    ],
  },
  {
    id: 'tobe', num: '06', title: 'Was / Were', es: 'El verbo to be en pasado',
    blurb: 'Am and is become was; are becomes were.',
    intro: 'The verb to be has its own past. Am and is become was; are becomes were. The negative is wasn’t / weren’t — never didn’t.',
    introEs: 'El verbo to be tiene su propio pasado: am/is → was, are → were. El negativo es wasn’t / weren’t, nunca didn’t.',
    formula: 'I / she / he / it → WAS      ·      you / we / they → WERE',
    steps: [
      { n: '1', h: 'Look at the subject', body: 'I, he, she, it and singular nouns → was. You, we, they and plural nouns → were.', es: 'I, he, she, it y sustantivos singulares → was. You, we, they y plurales → were.' },
      { n: '2', h: 'No verb after it', body: 'To be is the verb: She was a musician. There is no second verb in past.', es: 'To be ES el verbo: no hay un segundo verbo en pasado.' },
      { n: '3', h: 'Negative without did', body: 'was not / wasn’t, were not / weren’t. DID never appears.', es: 'wasn’t / weren’t. DID nunca aparece.' },
    ],
    tables: [
      T('Table · present to past', 'The same sentence, one step back in time.',
        ['Subject', 'Present', 'Past', 'Example'],
        [['I', 'am', 'was', 'I was a teacher.'], ['He / She / It', 'is', 'was', 'Enrique was a soldier.'], ['You', 'are', 'were', 'You were at home.'], ['We', 'are', 'were', 'My friend and I were colleagues.'], ['They', 'are', 'were', 'My parents were married.']]),
      T('Table · affirmative, negative, question', 'To be builds everything by itself.',
        ['Form', 'Was', 'Were'],
        [['Affirmative', 'She was a musician.', 'They were in Cali.'], ['Negative', 'Juan was not a good student.', 'The supplies were not in the base.'], ['Contraction', 'wasn’t', 'weren’t'], ['Question', 'Was she a musician?', 'Were they in Cali?']]),
      T('Table · to be vs other verbs in past', 'The classic confusion of this topic.',
        ['Verb type', 'Negative', 'Example'],
        [['Other verbs', 'did not + base verb', 'She did not play the piano.'], ['Verb to be', 'was / were + not', 'She was not a musician.']]),
    ],
    points: [
      { en: 'I am a teacher → I was a teacher.', es: 'I am a teacher → I was a teacher.' },
      { en: 'My parents are married → My parents were married.', es: 'My parents are married → My parents were married.' },
      { en: 'Negative: was not / wasn’t, were not / weren’t.', es: 'Negativo: wasn’t, weren’t.' },
      { en: 'To be does not use did in the past.', es: 'El verbo to be no usa did en pasado.' },
    ],
    examples: [
      { en: 'She was a musician.', es: 'Ella era música.' },
      { en: 'They were in Cali.', es: 'Ellos estaban en Cali.' },
      { en: 'Juan was not a good student.', es: 'Juan no era un buen estudiante.' },
      { en: 'Last week, I was in Carepa, Antioquia.', es: 'La semana pasada estuve en Carepa, Antioquia.' },
      { en: 'The supplies were not in the base.', es: 'Los suministros no estaban en la base.' },
    ],
    mistakes: [
      { wrong: 'She were a musician.', right: 'She was a musician.', why: 'She takes was.', es: 'She lleva was.' },
      { wrong: 'I didn’t was there.', right: 'I wasn’t there.', why: 'To be builds its own negative, without did.', es: 'To be forma su negativo sin did.' },
      { wrong: 'My parents was married.', right: 'My parents were married.', why: 'A plural subject takes were.', es: 'Un sujeto plural lleva were.' },
      { wrong: 'My friend and me were colleagues.', right: 'My friend and I were colleagues.', why: 'In the subject position use I, not me. Two people → were.', es: 'En la posición de sujeto se usa I, no me.' },
    ],
    quiz: [
      { prompt: 'She ___ a musician.', options: ['was', 'were', 'did'], answer: 0, why: 'She → was.', whyEs: 'She → was.', es: 'Completa: She ___ a musician.' },
      { prompt: 'My parents ___ married in 1990.', options: ['were', 'was', 'are'], answer: 0, why: 'Plural subject → were.', whyEs: 'Sujeto plural → were.', es: 'Completa: My parents ___ married in 1990.' },
      { prompt: 'Negative: Juan ___ a good student.', options: ['was not', 'did not was', 'were not'], answer: 0, why: 'To be forms the negative by itself: was not.', whyEs: 'To be forma el negativo solo: was not.', es: 'Negativo: Juan ___ a good student.' },
      { prompt: 'Last week, I ___ in Carepa, Antioquia.', options: ['was', 'were', 'am'], answer: 0, why: 'I → was, and “last week” asks for the past.', whyEs: 'I → was, y “last week” pide pasado.', es: 'Completa: Last week, I ___ in Carepa.' },
      { prompt: 'The supplies ___ in the base.', options: ['were not', 'was not', 'did not were'], answer: 0, why: 'Supplies is plural → were not.', whyEs: 'Supplies es plural → were not.', es: 'Completa: The supplies ___ in the base.' },
    ],
  },
  {
    id: 'cont', num: '07', title: 'Past Continuous', es: 'Pasado continuo',
    blurb: 'Was / were + verb-ing: actions in progress.',
    intro: 'The past continuous describes an action in progress in the past. Take was or were and add the verb with -ing.',
    introEs: 'El pasado continuo describe una acción en progreso en el pasado: was/were + verbo con -ing.',
    formula: 'Subject + was / were + verb-ing + complement',
    steps: [
      { n: '1', h: 'Pick was or were', body: 'Exactly like the verb to be: I/he/she/it → was; you/we/they → were.', es: 'Igual que to be: was o were según el sujeto.' },
      { n: '2', h: 'Add -ing to the verb', body: 'mop → mopping, drive → driving, run → running. Watch the spelling.', es: 'Agrega -ing al verbo, cuidando la ortografía.' },
      { n: '3', h: 'Close with the complement', body: 'I was mopping the floor. She was watching TV.', es: 'Cierra con el complemento.' },
    ],
    tables: [
      T('Table · the four columns of the sentence', 'The structure taught in class, column by column.',
        ['Subject', 'Was / were', 'Verb -ing', 'Complement'],
        [['I', 'was', 'mopping', 'the floor'], ['I', 'was', 'carving', 'a chicken'], ['She', 'was', 'watching', 'TV'], ['He', 'was', 'fixing', 'a box'], ['My parents', 'were', 'buying', 'a house'], ['They', 'were', 'running', 'late'], ['We', 'were', 'gaining', 'weight']]),
      T('Table · present to past', 'Only the verb to be changes; the -ing form stays.',
        ['Present continuous', 'Past continuous'],
        [['I am watching TV', 'I was watching TV'], ['She is learning French', 'She was learning French'], ['He is running', 'He was running'], ['My parents are getting married', 'My parents were getting married'], ['Jason and Lucia are driving a car', 'Jason and Lucia were driving a car']]),
      T('Table · spelling of the -ing form', 'A few simple rules cover almost every verb — try any verb in the spelling lab.',
        ['Ending', 'Rule', 'Example'],
        [['consonant + e', 'drop the e', 'drive → driving'], ['-ee / -ye / -oe, and be', 'keep the e', 'see → seeing · be → being'], ['C-V-C, one syllable', 'double the consonant', 'run → running · mop → mopping'], ['C-V-C, stress on the last syllable', 'double the consonant', 'begin → beginning · prefer → preferring'], ['C-V-C, stress NOT on the last syllable', 'just add -ing', 'visit → visiting · open → opening'], ['-ie', 'ie → y', 'lie → lying'], ['everything else', 'just add -ing', 'watch → watching · fix → fixing · play → playing']]),
    ],
    points: [
      { en: 'I am watching TV → I was watching TV.', es: 'I am watching TV → I was watching TV.' },
      { en: 'They are running late → They were running late.', es: 'They are running late → They were running late.' },
      { en: 'The -ing verb never changes with the subject; only was/were changes.', es: 'El verbo -ing no cambia; solo cambia was/were.' },
      { en: 'Watch the spelling: run → running, mop → mopping, drive → driving.', es: 'Cuidado con la ortografía: run → running, mop → mopping.' },
    ],
    examples: [
      { en: 'I was mopping the floor.', es: 'Estaba trapeando el piso.' },
      { en: 'I was carving a chicken.', es: 'Estaba trinchando un pollo.' },
      { en: 'She was watching TV.', es: 'Ella estaba viendo televisión.' },
      { en: 'My parents were buying a house.', es: 'Mis padres estaban comprando una casa.' },
      { en: 'Jason and Lucia were driving a car.', es: 'Jason y Lucía estaban conduciendo un carro.' },
    ],
    mistakes: [
      { wrong: 'I was mop the floor.', right: 'I was mopping the floor.', why: 'After was/were the verb takes -ing.', es: 'Después de was/were el verbo lleva -ing.' },
      { wrong: 'They was running late.', right: 'They were running late.', why: 'They is plural → were.', es: 'They es plural → were.' },
      { wrong: 'They were runnig late.', right: 'They were running late.', why: 'Double the final n: run → running.', es: 'Se duplica la n final: run → running.' },
    ],
    quiz: [
      { prompt: 'I ___ the floor when you called.', options: ['was mopping', 'was mop', 'were mopping'], answer: 0, why: 'I → was + verb-ing.', whyEs: 'I → was + verbo -ing.', es: 'Completa: I ___ the floor when you called.' },
      { prompt: 'They ___ late this morning.', options: ['were running', 'was running', 'were runnig'], answer: 0, why: 'They → were, and run doubles the n: running.', whyEs: 'They → were, y run duplica la n.', es: 'Completa: They ___ late this morning.' },
      { prompt: 'The structure of the past continuous is…', options: ['Subject + was/were + verb-ing + complement', 'Subject + was/were + verb in past', 'Subject + did + verb-ing'], answer: 0, why: 'Was or were plus the -ing form.', whyEs: 'Was o were más la forma -ing.', es: 'La estructura del pasado continuo es…' },
      { prompt: 'She ___ TV when I arrived.', options: ['was watching', 'were watching', 'was watch'], answer: 0, why: 'She → was, plus watching.', whyEs: 'She → was, más watching.', es: 'Completa: She ___ TV when I arrived.' },
    ],
  },
  {
    id: 'perfect', num: '08', title: 'Past Perfect', es: 'Pasado perfecto',
    blurb: 'Had + past participle: the action before the other action.',
    intro: 'The past perfect is the oldest past. It marks the action that happened before another past action. One form for every subject: had + past participle.',
    introEs: 'El pasado perfecto es el pasado más antiguo: marca la acción que ocurrió antes de otra acción pasada. Una sola forma: had + participio.',
    formula: 'Subject + had + past participle + complement   ·   negative: had not / hadn’t',
    steps: [
      { n: '1', h: 'Find the two past actions', body: 'Two things happened. Decide which one happened first.', es: 'Dos cosas pasaron: decide cuál ocurrió primero.' },
      { n: '2', h: 'The first one takes had', body: 'HAD never changes: I had, she had, they had.', es: 'HAD no cambia nunca con el sujeto.' },
      { n: '3', h: 'Use the past participle', body: 'Third column of the irregular verbs: gone, seen, written. Regular verbs keep -ed.', es: 'Tercera columna de los irregulares: gone, seen, written.' },
      { n: '4', h: 'Connect the two actions', body: 'Use when, before, after or by the time: When I arrived, she had already left.', es: 'Conecta con when, before, after o by the time.' },
    ],
    tables: [
      T('Table · the four columns of the sentence', 'One structure, valid for every subject.',
        ['Subject', 'Had', 'Past participle', 'Complement'],
        [['I', 'had', 'finished', 'my homework'], ['She', 'had', 'left', 'before I arrived'], ['They', 'had', 'eaten', 'when the film started'], ['We', 'had', 'seen', 'that video before'], ['Lebron', 'had', 'signed', 'with Nike before 2004']]),
      T('Table · past simple vs past perfect', 'The order in time is what decides the tense.',
        ['Situation', 'Tense', 'Example'],
        [['One finished action', 'Past simple', 'I met my friend.'], ['The earlier of two actions', 'Past perfect', 'I had finished my homework when I met my friend.'], ['Action in progress', 'Past continuous', 'I was walking to school.'], ['All three together', 'Mixed', 'I had finished my homework and I was walking to school when I met my friend.']]),
      T('Table · affirmative, negative, question', 'HAD carries everything.',
        ['Form', 'Structure', 'Example'],
        [['Affirmative', 'subject + had + participle', 'She had studied English before.'], ['Negative', 'subject + had not / hadn’t + participle', 'She hadn’t studied English before.'], ['Question', 'had + subject + participle?', 'Had she studied English before?'], ['Short answer', 'Yes, she had. / No, she hadn’t.', '— Had you seen it? — No, I hadn’t.']]),
      T('Table · participles you need most', 'Second and third column side by side, so you never mix them.',
        ['Base', 'Past simple', 'Past participle'],
        [['go', 'went', 'gone'], ['see', 'saw', 'seen'], ['eat', 'ate', 'eaten'], ['write', 'wrote', 'written'], ['do', 'did', 'done'], ['take', 'took', 'taken'], ['finish', 'finished', 'finished'], ['study', 'studied', 'studied']]),
    ],
    points: [
      { en: 'HAD is the same for every subject: I had, she had, they had.', es: 'HAD es igual para todos los sujetos.' },
      { en: 'The verb goes in the past participle, not the past simple: had gone, not had went.', es: 'El verbo va en participio, no en pasado simple.' },
      { en: 'Use it to show which of two past actions happened first.', es: 'Úsalo para mostrar cuál de dos acciones pasó primero.' },
      { en: 'Already, just and never go between had and the participle (had already left); yet goes at the end of negatives and questions (hadn’t arrived yet).', es: 'Already, just y never van entre had y el participio; yet va al final.' },
    ],
    examples: [
      { en: 'I had finished my homework when my friend arrived.', es: 'Había terminado mi tarea cuando llegó mi amigo.' },
      { en: 'When we got to the cinema, the film had already started.', es: 'Cuando llegamos al cine, la película ya había empezado.' },
      { en: 'She had never seen the sea before that trip.', es: 'Ella nunca había visto el mar antes de ese viaje.' },
      { en: 'By 2008, Lebron had already signed with Nike.', es: 'Para 2008, Lebron ya había firmado con Nike.' },
      { en: 'They hadn’t studied for the exam, so they failed.', es: 'No habían estudiado para el examen, así que lo perdieron.' },
    ],
    mistakes: [
      { wrong: 'I had went home.', right: 'I had gone home.', why: 'After HAD you need the participle: gone.', es: 'Después de HAD va el participio: gone.' },
      { wrong: 'She has finished it yesterday.', right: 'She finished it yesterday.', why: 'With a finished time like yesterday use the past simple. Use had + participle only for the earlier of two past actions: She had finished it before I arrived.', es: 'Con yesterday se usa el pasado simple; had + participio solo para la acción anterior.' },
      { wrong: 'I didn’t had finished.', right: 'I hadn’t finished.', why: 'HAD builds its own negative, without did.', es: 'HAD forma su negativo sin did.' },
    ],
    quiz: [
      { prompt: 'When I arrived, the film ___ already started.', options: ['had', 'has', 'was'], answer: 0, why: 'The film started before you arrived → past perfect.', whyEs: 'La película empezó antes → pasado perfecto.', es: 'Completa: When I arrived, the film ___ already started.' },
      { prompt: 'I had ___ my homework before dinner.', options: ['finished', 'finish', 'finishing'], answer: 0, why: 'HAD + past participle. Finish is regular: finished.', whyEs: 'HAD + participio. Finish es regular.', es: 'Completa: I had ___ my homework before dinner.' },
      { prompt: 'Which sentence is correct?', options: ['She had gone home.', 'She had went home.', 'She had going home.'], answer: 0, why: 'Go → went (past simple) → gone (participle).', whyEs: 'Go → went → gone. Con HAD va gone.', es: '¿Cuál oración es correcta?' },
      { prompt: 'Negative: They ___ studied for the exam.', options: ['hadn’t', 'didn’t had', 'wasn’t'], answer: 0, why: 'HAD NOT / HADN’T + participle.', whyEs: 'HAD NOT / HADN’T + participio.', es: 'Negativo: They ___ studied for the exam.' },
      { prompt: 'Which action happened FIRST? “When Gloria called, Lebron had already left.”', options: ['Lebron left', 'Gloria called', 'Both at the same time'], answer: 0, why: 'The past perfect marks the earlier action: he left first.', whyEs: 'El pasado perfecto marca la acción anterior.', es: '¿Cuál acción ocurrió primero?' },
    ],
  },
];

export const TIMELINE: Stage = {
  id: 'timeline', num: '09', title: 'Sentence Timeline', es: 'Línea de tiempo de oraciones',
  blurb: 'Type three moments; the app returns one full mixed-tense sentence.',
  intro: 'Put three moments on a timeline: what happened before, what was in progress, and the action that cut it. Type each one with the verb in its base form and the app returns one complete sentence that mixes past perfect, past continuous and past simple.',
  introEs: 'Coloca tres momentos en la línea de tiempo: lo que pasó antes, lo que estaba en progreso y la acción que lo interrumpió. Escribe el verbo en forma base y la app devuelve una oración completa con los tres tiempos.',
  formula: 'S + had + participle  ·  S + was/were + verb-ing  ·  when + S + verb in past',
  steps: [
    { n: '1', h: 'Earlier action', body: 'What was already complete? It becomes the past perfect: had + participle.', es: '¿Qué ya estaba terminado? Va en pasado perfecto.' },
    { n: '2', h: 'Background action', body: 'What was in progress? It becomes the past continuous: was/were + -ing.', es: '¿Qué estaba en progreso? Va en pasado continuo.' },
    { n: '3', h: 'Main event', body: 'What cut the scene? It becomes the past simple, introduced by when.', es: '¿Qué interrumpió la escena? Va en pasado simple, con when.' },
  ],
  tables: [
    T('Table · what the app does with each field', 'Type the base form; the conjugation is automatic.',
      ['Field', 'Tense', 'You type', 'App returns'],
      [['Earlier action', 'Past perfect', 'finish my homework', 'had finished my homework'], ['Background action', 'Past continuous', 'walk to school', 'was walking to school'], ['Main event', 'Past simple', 'meet my friend', 'met my friend'], ['When (optional)', 'Adverb of time', 'yesterday', 'Yesterday, …']]),
  ],
  points: [
    { en: 'The three tenses can live in one sentence when the order in time is clear.', es: 'Los tres tiempos pueden convivir en una oración si el orden temporal es claro.' },
    { en: 'WHEN introduces the past simple; the other two set the scene.', es: 'WHEN introduce el pasado simple; los otros dos crean la escena.' },
    { en: 'Irregular verbs are detected automatically — check the list under your sentence.', es: 'Los verbos irregulares se detectan automáticamente.' },
  ],
  examples: [
    { en: 'I had finished my homework, and I was walking to school when I met my friend.', es: 'Había terminado mi tarea y estaba caminando a la escuela cuando me encontré con mi amigo.' },
    { en: 'Yesterday, she had eaten dinner, and she was watching TV when the lights went out.', es: 'Ayer ella había cenado y estaba viendo televisión cuando se fue la luz.' },
  ],
  mistakes: [
    { wrong: 'I had finish my homework.', right: 'I had finished my homework.', why: 'HAD always takes the participle.', es: 'HAD siempre lleva participio.' },
    { wrong: 'I was walk to school.', right: 'I was walking to school.', why: 'WAS/WERE always take the -ing form.', es: 'WAS/WERE siempre llevan la forma -ing.' },
    { wrong: 'when I meet my friend', right: 'when I met my friend', why: 'WHEN introduces the finished action, in past simple.', es: 'WHEN introduce la acción terminada, en pasado simple.' },
  ],
  quiz: [],
  tool: 'timeline',
};

export const VIDEO: Stage = {
  id: 'video', num: '10', title: 'Video Activity', es: 'Actividad de video',
  blurb: 'Two Draw My Life videos, with the class questions.',
  intro: 'Listen to the videos, analyse the information and answer the questions. Don’t forget to answer in the simple past.',
  introEs: 'Escucha los videos, analiza la información y responde las preguntas. No olvides responder en pasado simple.',
  formula: 'Watch  →  take notes  →  answer in the simple past',
  steps: [
    { n: '1', h: 'Watch once without writing', body: 'Get the story: who, where, and the big dates.', es: 'Mira una vez sin escribir: quién, dónde y las fechas.' },
    { n: '2', h: 'Watch again and take notes', body: 'Write every date in the English order: month + ordinal day + year.', es: 'Anota cada fecha en el orden inglés.' },
    { n: '3', h: 'Answer in the simple past', body: 'Was / were for descriptions, and the past of the verb for actions.', es: 'Was/were para descripciones, y el pasado del verbo para acciones.' },
  ],
  tables: [
    T('Table · how to answer each question type', 'Match the question word with the tense you need.',
      ['Question', 'Tense you need', 'Model shape'],
      [['When was…?', 'was / were', 'He was born in 1984.'], ['What difficulties did… have?', 'did + base verb', 'They did not have money.'], ['What was the name of…?', 'was', 'His mother was Gloria.'], ['How much money did… sign?', 'did + base verb', 'He signed for 90 million dollars.'], ['When did… become…?', 'did + base verb', 'He became the first in 2008.']]),
  ],
  points: [
    { en: 'Answer in the simple past, in a complete sentence.', es: 'Responde en pasado simple, con oración completa.' },
    { en: 'After DID the verb stays in its base form: did not have, did he sign.', es: 'Después de DID el verbo va en forma base.' },
    { en: 'Names and places keep their capital letter: Lebron, Gloria, Nike, Vogue.', es: 'Los nombres propios llevan mayúscula.' },
    { en: 'Write the dates as month + ordinal day + year.', es: 'Escribe las fechas como mes + día ordinal + año.' },
  ],
  examples: [
    { en: 'The event is: the discovery of America — October 12th, 1492.', es: 'El evento es: el descubrimiento de América — 12 de octubre de 1492.' },
    { en: 'The event is: the Chernobyl nuclear accident — April 26th, 1986.', es: 'El evento es: el accidente nuclear de Chernóbil — 26 de abril de 1986.' },
  ],
  mistakes: [
    { wrong: '26 April 1986', right: 'April 26th, 1986', why: 'In American English the month comes first and the day is ordinal. (26 April 1986 is the British style.)', es: 'En inglés americano el mes va primero y el día es ordinal.' },
    { wrong: 'It happen in 1986.', right: 'It happened in 1986.', why: 'A finished event needs the past simple.', es: 'Un evento terminado necesita pasado simple.' },
    { wrong: 'He did not had money.', right: 'He did not have money.', why: 'After DID NOT the verb returns to its base form.', es: 'Después de DID NOT el verbo va en forma base.' },
  ],
  quiz: [],
  tool: 'notebook',
  videos: [
    {
      id: 'lebron',
      title: 'Draw My Life: Lebron James',
      tag: 'Video 1 · 7 questions',
      brief: 'Listen to the video about: Draw My Life: Lebron James. Then analyze the information and answer the following questions. Don’t forget to answer in the simple past.',
      embed: 'https://www.youtube-nocookie.com/embed/TLTH6i6fBaQ',
      link: 'https://www.youtube.com/watch?v=TLTH6i6fBaQ',
      linkLabel: 'Abrir en YouTube',
      questions: [
        { n: '01', q: 'When was Lebron James born?', a: 'Lebron was born on December 30th, 1984, in Akron, Ohio.' },
        { n: '02', q: 'What difficulties did Lebron have during his childhood?', a: 'His family did not have money, and they moved from house to house many times.' },
        { n: '03', q: 'What was the name of his mother?', a: 'His mother’s name was Gloria (Gloria James).' },
        { n: '04', q: 'What was his nickname when he was young?', a: 'His nickname was “Mr. Basketball”.' },
        { n: '05', q: 'Who was the famous basketball player that paid attention to Lebron?', a: 'The famous basketball player was Shaquille O’Neal.' },
        { n: '06', q: 'How much money did Lebron sign with Nike?', a: 'Lebron signed with Nike for 90 million dollars (in 2003).' },
        { n: '07', q: 'When did he become the first afro-American in Vogue Magazine?', a: 'He became the first African-American man on the cover of Vogue in 2008.' },
      ],
    },
    {
      id: 'amelia',
      title: 'Amelia Earhart',
      tag: 'Video 2 · 5 questions',
      brief: 'AMELIA EARHART | Draw My Life | International Women’s Day — questions.',
      embed: '',
      link: 'https://www.youtube.com/results?search_query=Amelia+Earhart+Draw+My+Life+International+Women%27s+Day',
      linkLabel: 'Buscar el video en YouTube',
      questions: [
        { n: '01', q: 'When was she born?', a: 'She was born on July 24th, 1897, in Atchison, Kansas.' },
        { n: '02', q: 'How were her beginnings?', a: 'She worked as a nurse’s aide during World War I, and she collected newspaper articles about successful women.' },
        { n: '03', q: 'What was her most important success?', a: 'She was the first woman to fly solo across the Atlantic, in 1932.' },
        { n: '04', q: 'When did Amelia die?', a: 'She disappeared over the Pacific Ocean in 1937, and she was declared dead in 1939.' },
        { n: '05', q: 'What distance did she travel on her plane to cross the Atlantic?', a: 'In 1932 she flew about 3,260 km (2,026 miles) alone, in almost 15 hours. (In 1928 she crossed as a passenger in 20 hours and 40 minutes.)' },
      ],
    },
  ],
};

export const ALL: Stage[] = [...STAGES, TIMELINE, VIDEO];

/** Date-builder rounds. The first one is the legacy TARGET. Weekdays verified. */
export const TARGET = ['Friday,', 'August', '12th,', '2022'];
export const DATE_ROUNDS: { y: number; m: number; d: number; what: string }[] = [
  { y: 2022, m: 8, d: 12, what: 'the date of the class example' },
  { y: 1810, m: 7, d: 20, what: 'Colombia’s Independence Day' },
  { y: 1811, m: 11, d: 11, what: 'Cartagena’s Independence' },
  { y: 1986, m: 4, d: 26, what: 'the Chernobyl accident' },
  { y: 1969, m: 7, d: 20, what: 'the Moon landing' },
  { y: 2026, m: 12, d: 25, what: 'Christmas Day this year' },
  { y: 2001, m: 9, d: 11, what: 'the attacks in New York' },
  { y: 1819, m: 8, d: 7, what: 'the Battle of Boyacá' },
];

/** Time words (the content of the legacy "adverbs of time" poster, grouped correctly). */
export const TIME_WORDS: { group: string; es: string; words: { w: string; ex: string }[] }[] = [
  {
    group: 'Adverbs of time',
    es: 'Adverbios de tiempo',
    words: [
      { w: 'yesterday', ex: 'I called my mom yesterday.' },
      { w: 'tomorrow', ex: 'I will travel tomorrow.' },
      { w: 'already', ex: 'She had already left.' },
      { w: 'finally', ex: 'We finally arrived at 11 pm.' },
      { w: 'eventually', ex: 'He eventually found his keys.' },
      { w: 'soon', ex: 'The film started soon after.' },
      { w: 'then', ex: 'I had dinner, then I watched TV.' },
      { w: 'next', ex: 'Next, we visited the museum.' },
      { w: 'still', ex: 'It was still raining at night.' },
      { w: 'yet', ex: 'They hadn’t finished yet.' },
    ],
  },
  {
    group: 'Time connectors',
    es: 'Conectores de tiempo',
    words: [
      { w: 'when', ex: 'I was walking when I met my friend.' },
      { w: 'while', ex: 'While I was cooking, the phone rang.' },
      { w: 'before', ex: 'I had eaten before the class.' },
      { w: 'after', ex: 'After the game, we went home.' },
      { w: 'since', ex: 'I have lived here since 2019.' },
    ],
  },
  {
    group: 'How long / how far back',
    es: 'Duración y distancia en el tiempo',
    words: [
      { w: 'for one year', ex: 'She lived in Cali for one year.' },
      { w: 'for two days', ex: 'It rained for two days.' },
      { w: 'three weeks ago', ex: 'We visited the zoo three weeks ago.' },
      { w: 'two years ago', ex: 'They got married two years ago.' },
    ],
  },
];

export const SAYING = {
  en: 'Early to bed, early to rise, makes a man healthy, wealthy and wise.',
  es: 'Al que madruga, Dios lo ayuda.',
};
