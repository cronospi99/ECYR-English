/**
 * Time & Family — all teaching data from the legacy "Family Playbook"
 * (public/modules/time-family/time-and-family.html), typed and corrected.
 *
 * This file is dependency-free on purpose so the pure time/genitive helpers
 * (and their Node tests) can import it with `node --experimental-strip-types`.
 *
 * Content fixes against the legacy file are marked with `// FIX:` and
 * additions with `// NEW:`.
 */

// ----------------------------------------------------------------- numbers --

/** Hour words on a 12-hour dial (index 0 and 12 are both "twelve"). */
export const EN_ONES = ['twelve', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'] as const;

/** English cardinals 0–30 (the legacy table). Larger numbers are built in timeWords.ts. */
export const EN_NUM = [
  'zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten',
  'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen', 'twenty',
  'twenty-one', 'twenty-two', 'twenty-three', 'twenty-four', 'twenty-five', 'twenty-six', 'twenty-seven', 'twenty-eight', 'twenty-nine', 'thirty',
] as const;

/** NEW: tens words used to read 31–59 ("forty-five"). */
export const EN_TENS: Record<number, string> = { 2: 'twenty', 3: 'thirty', 4: 'forty', 5: 'fifty' };

/** Spanish cardinals 0–30 (minutes after "y" / "menos"). */
export const ES_NUM = [
  'cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez',
  'once', 'doce', 'trece', 'catorce', 'quince', 'dieciséis', 'diecisiete', 'dieciocho', 'diecinueve', 'veinte',
  'veintiuno', 'veintidós', 'veintitrés', 'veinticuatro', 'veinticinco', 'veintiséis', 'veintisiete', 'veintiocho', 'veintinueve', 'treinta',
] as const;

/** Spanish hour words on a 12-hour dial ("la una", "las dos"…). */
export const ES_HOUR = ['doce', 'una', 'dos', 'tres', 'cuatro', 'cinco', 'seis', 'siete', 'ocho', 'nueve', 'diez', 'once', 'doce'] as const;

// ------------------------------------------------------------------ saying --

export const SAYING = {
  es: 'Hoy por ti, mañana por mí', // FIX: "mi" → "mí" (pronombre tónico lleva tilde)
  en: 'You scratch my back, I’ll scratch yours.', // FIX: back-tick "I`ll" → apostrophe
  enAlt: 'One good turn deserves another.', // NEW: neutral equivalent (no "self-interest" nuance)
  meaning: 'You help me, I help you. Favours come back around.',
  meaningEs: 'Si te ayudo hoy, tú me ayudarás mañana: los favores vuelven.',
} as const;

// ------------------------------------------------------------------ agenda --

export interface AgendaItem {
  n: string;
  title: string;
  body: string;
  tab: 'clock' | 'vocab' | 'genitive' | 'homework';
}

export const AGENDA: AgendaItem[] = [
  { n: '01', title: 'Daily Time', body: 'Spin the clock and let the penguin read the time out loud.', tab: 'clock' }, // FIX: "read the hour" → "read the time"
  { n: '02', title: 'Family', body: 'Learn immediate and extended family words, with pronunciation.', tab: 'vocab' },
  { n: '03', title: 'Saxon genitive', body: 'Turn “the mother of Laura” into “Laura’s mother”.', tab: 'genitive' }, // FIX: mismatched quotes
  { n: '04', title: 'Homework', body: 'Build your own family tree with at least 9 members and print it.', tab: 'homework' },
];

// -------------------------------------------------------------- vocabulary --

export type VocabGroup = 'Immediate' | 'Grandparents' | 'Extended' | 'In-laws' | 'Step & half' | 'Other words';

export const VOCAB_GROUPS: { id: VocabGroup; es: string }[] = [
  { id: 'Immediate', es: 'Familia directa' },
  { id: 'Grandparents', es: 'Abuelos y nietos' },
  { id: 'Extended', es: 'Familia extendida' },
  { id: 'In-laws', es: 'Familia política' },
  { id: 'Step & half', es: 'Padrastros y medios hermanos' },
  { id: 'Other words', es: 'Otras palabras' }, // FIX: legacy group "Only / none" held relatives, ancestors, guardian…
];

export interface VocabItem {
  g: VocabGroup;
  en: string;
  es: string;
  /** Simple respelling for Spanish speakers; stressed syllable in capitals. */
  say: string;
  note?: string;
}

export const VOCAB: VocabItem[] = [
  { g: 'Immediate', en: 'Father', es: 'Padre', say: 'FAH-ther', note: 'Informal: dad = papá' }, // FIX: "Padre / Papá" — papá is "dad"
  { g: 'Immediate', en: 'Mother', es: 'Madre', say: 'MUH-ther', note: 'Informal: mum (UK) · mom (US) = mamá' }, // FIX: idem
  { g: 'Immediate', en: 'Parents', es: 'Padres', say: 'PAIR-ents', note: 'Parents = padre y madre (no "parientes")' },
  { g: 'Immediate', en: 'Brother', es: 'Hermano', say: 'BRUH-ther' },
  { g: 'Immediate', en: 'Sister', es: 'Hermana', say: 'SIS-ter' },
  { g: 'Immediate', en: 'Siblings', es: 'Hermanos (hermanos y hermanas)', say: 'SIB-lings' },
  { g: 'Immediate', en: 'Son', es: 'Hijo', say: 'SUN' },
  { g: 'Immediate', en: 'Daughter', es: 'Hija', say: 'DAW-ter' },
  { g: 'Immediate', en: 'Children', es: 'Hijos (hijos e hijas)', say: 'CHIL-dren', note: 'Plural irregular de child' }, // NEW: needed for "children's"
  { g: 'Immediate', en: 'Husband', es: 'Esposo / Marido', say: 'HUZ-band' },
  { g: 'Immediate', en: 'Wife', es: 'Esposa / Mujer', say: 'WAIF' }, // FIX: respelling "WYFE"
  { g: 'Grandparents', en: 'Grandfather', es: 'Abuelo', say: 'GRAND-fah-ther', note: 'Informal: grandad / grandpa' },
  { g: 'Grandparents', en: 'Grandmother', es: 'Abuela', say: 'GRAND-muh-ther', note: 'Informal: grandma / granny' },
  { g: 'Grandparents', en: 'Grandparents', es: 'Abuelos', say: 'GRAND-pair-ents' },
  { g: 'Grandparents', en: 'Great-grandfather', es: 'Bisabuelo', say: 'grayt-GRAND-fah-ther' },
  { g: 'Grandparents', en: 'Great-grandmother', es: 'Bisabuela', say: 'grayt-GRAND-muh-ther' },
  { g: 'Grandparents', en: 'Grandson', es: 'Nieto', say: 'GRAND-sun' },
  { g: 'Grandparents', en: 'Granddaughter', es: 'Nieta', say: 'GRAND-daw-ter' },
  { g: 'Grandparents', en: 'Grandchildren', es: 'Nietos (nietos y nietas)', say: 'GRAND-chil-dren' }, // NEW
  { g: 'Extended', en: 'Uncle', es: 'Tío', say: 'UNG-kul' },
  { g: 'Extended', en: 'Aunt', es: 'Tía', say: 'AHNT (UK) · ANT (US)' }, // FIX: only the UK vowel was given
  { g: 'Extended', en: 'Cousin', es: 'Primo / Prima', say: 'KUH-zin' },
  { g: 'Extended', en: 'Nephew', es: 'Sobrino', say: 'NEF-yoo' },
  { g: 'Extended', en: 'Niece', es: 'Sobrina', say: 'NEES' }, // FIX: respelling "NEESS"
  { g: 'Extended', en: 'Great-uncle', es: 'Tío abuelo', say: 'grayt-UNG-kul' },
  { g: 'Extended', en: 'Great-aunt', es: 'Tía abuela', say: 'grayt-AHNT' },
  { g: 'Extended', en: 'Second cousin', es: 'Primo segundo / Prima segunda', say: 'SEK-und KUH-zin' }, // FIX: add feminine
  { g: 'Extended', en: 'Godfather', es: 'Padrino', say: 'GOD-fah-ther' },
  { g: 'Extended', en: 'Godmother', es: 'Madrina', say: 'GOD-muh-ther' },
  { g: 'Extended', en: 'Twin', es: 'Gemelo / Gemela (o mellizo/a)', say: 'TWIN' },
  { g: 'In-laws', en: 'Father-in-law', es: 'Suegro', say: 'FAH-ther-in-law' },
  { g: 'In-laws', en: 'Mother-in-law', es: 'Suegra', say: 'MUH-ther-in-law' },
  { g: 'In-laws', en: 'Brother-in-law', es: 'Cuñado', say: 'BRUH-ther-in-law' },
  { g: 'In-laws', en: 'Sister-in-law', es: 'Cuñada', say: 'SIS-ter-in-law' },
  { g: 'In-laws', en: 'Son-in-law', es: 'Yerno', say: 'SUN-in-law' },
  { g: 'In-laws', en: 'Daughter-in-law', es: 'Nuera', say: 'DAW-ter-in-law' },
  { g: 'Step & half', en: 'Stepfather', es: 'Padrastro', say: 'STEP-fah-ther' },
  { g: 'Step & half', en: 'Stepmother', es: 'Madrastra', say: 'STEP-muh-ther' },
  { g: 'Step & half', en: 'Stepbrother', es: 'Hermanastro', say: 'STEP-bruh-ther' },
  { g: 'Step & half', en: 'Stepsister', es: 'Hermanastra', say: 'STEP-sis-ter' },
  { g: 'Step & half', en: 'Stepson', es: 'Hijastro', say: 'STEP-sun' },
  { g: 'Step & half', en: 'Stepdaughter', es: 'Hijastra', say: 'STEP-daw-ter' },
  { g: 'Step & half', en: 'Half-brother', es: 'Medio hermano', say: 'HAHF-bruh-ther (UK) · HAF (US)' },
  { g: 'Step & half', en: 'Half-sister', es: 'Media hermana', say: 'HAHF-sis-ter (UK) · HAF (US)' },
  { g: 'Other words', en: 'Only child', es: 'Hijo único / Hija única', say: 'OHN-lee CHAILD' }, // FIX: es feminine + respelling "CHILDE"
  { g: 'Other words', en: 'Relatives', es: 'Parientes / Familiares', say: 'REL-uh-tivs', note: 'Relatives = parientes (no "relativos")' },
  { g: 'Other words', en: 'Ancestors', es: 'Antepasados', say: 'AN-ses-terz' },
  { g: 'Other words', en: 'Guardian', es: 'Tutor legal / Tutora legal', say: 'GAR-dee-un' },
];

// ----------------------------------------------------------------- riddles --

export interface Riddle {
  q: string;
  qEs: string;
  a: string;
}

export const RIDDLES: Riddle[] = [
  { q: 'Your mother’s brother is your…', qEs: 'El hermano de tu madre es tu…', a: 'Uncle' },
  { q: 'Your father’s sister is your…', qEs: 'La hermana de tu padre es tu…', a: 'Aunt' },
  { q: 'Your uncle’s daughter is your…', qEs: 'La hija de tu tío es tu…', a: 'Cousin' },
  { q: 'Your sister’s son is your…', qEs: 'El hijo de tu hermana es tu…', a: 'Nephew' },
  { q: 'Your brother’s daughter is your…', qEs: 'La hija de tu hermano es tu…', a: 'Niece' },
  { q: 'Your mother’s mother is your…', qEs: 'La madre de tu madre es tu…', a: 'Grandmother' },
  { q: 'Your grandfather’s father is your…', qEs: 'El padre de tu abuelo es tu…', a: 'Great-grandfather' },
  { q: 'Your grandmother’s sister is your…', qEs: 'La hermana de tu abuela es tu…', a: 'Great-aunt' },
  { q: 'Your wife’s mother is your…', qEs: 'La madre de tu esposa es tu…', a: 'Mother-in-law' },
  { q: 'Your sister’s husband is your…', qEs: 'El esposo de tu hermana es tu…', a: 'Brother-in-law' },
  { q: 'Your brother’s wife is your…', qEs: 'La esposa de tu hermano es tu…', a: 'Sister-in-law' },
  { q: 'Your son’s wife is your…', qEs: 'La esposa de tu hijo es tu…', a: 'Daughter-in-law' },
  { q: 'Your daughter’s husband is your…', qEs: 'El esposo de tu hija es tu…', a: 'Son-in-law' },
  { q: 'Your daughter’s son is your…', qEs: 'El hijo de tu hija es tu…', a: 'Grandson' },
  { q: 'Your son’s daughter is your…', qEs: 'La hija de tu hijo es tu…', a: 'Granddaughter' },
  { q: 'Your father’s new wife is your…', qEs: 'La nueva esposa de tu padre es tu…', a: 'Stepmother' },
  // FIX: "Your stepmother's son" could also be your half-brother (if he is your father's son too).
  { q: 'Your stepmother’s son from her first marriage is your…', qEs: 'El hijo del primer matrimonio de tu madrastra es tu…', a: 'Stepbrother' },
  { q: 'Your father’s brother’s son is your…', qEs: 'El hijo del hermano de tu padre es tu…', a: 'Cousin' },
  { q: 'A child with no brothers or sisters is an…', qEs: 'Un niño o una niña sin hermanos es…', a: 'Only child' }, // FIX: qEs gender + article
  // FIX: legacy riddle "Your cousin's daughter's grandmother (your aunt) is your father's…" was ambiguous
  // (that aunt can be your mother's sister or an uncle's wife). Replaced with an unambiguous "Sister" riddle.
  { q: 'Your parents’ other daughter is your…', qEs: 'La otra hija de tus padres es tu…', a: 'Sister' },
  { q: 'Your father’s father is your…', qEs: 'El padre de tu padre es tu…', a: 'Grandfather' }, // NEW: "Grandfather" was a distractor with no riddle
];

/** Distractor pool for the riddles (legacy list). */
export const RIDDLE_ANSWERS = [
  'Uncle', 'Aunt', 'Cousin', 'Nephew', 'Niece', 'Grandmother', 'Grandfather', 'Great-grandfather', 'Great-aunt', 'Mother-in-law',
  'Brother-in-law', 'Sister-in-law', 'Daughter-in-law', 'Son-in-law', 'Grandson', 'Granddaughter', 'Stepmother', 'Stepbrother', 'Only child', 'Sister',
] as const;

// --------------------------------------------------------- saxon genitive --

export type GenitiveRule = 'singular' | 'plural-s' | 'irregular-plural' | 'name-s' | 'joint' | 'double' | 'time';

export const GENITIVE_RULES: { id: GenitiveRule; title: string; rule: string; examples: string[]; level: 'A1' | 'A2' | 'B1' }[] = [
  { id: 'singular', title: 'Poseedor singular', rule: 'Añade ’s al poseedor. El poseedor va primero y la cosa poseída después, sin “the”.', examples: ['Laura’s mother is Clara.', 'my brother’s car'], level: 'A1' },
  { id: 'plural-s', title: 'Plural terminado en -s', rule: 'Añade solo el apóstrofo ’ después de la -s.', examples: ['my parents’ house', 'the boys’ toys'], level: 'A1' },
  { id: 'irregular-plural', title: 'Plural irregular (sin -s)', rule: 'Los plurales que no terminan en -s llevan ’s, como un singular.', examples: ['the children’s dog', 'the women’s team', 'people’s opinions'], level: 'A1' },
  { id: 'name-s', title: 'Nombres que terminan en -s', rule: 'Lo más común es ’s (James’s); también se acepta solo ’ (James’). Las dos formas son correctas.', examples: ['James’s bike = James’ bike', 'Mr Jones’s car'], level: 'A2' },
  { id: 'joint', title: 'Posesión compartida', rule: 'Si dos personas comparten algo, ’s va solo en el último nombre.', examples: ['Tom and Ann’s house (una casa de los dos)', 'Tom’s and Ann’s phones (cada uno el suyo)'], level: 'A2' },
  { id: 'double', title: 'Doble posesivo', rule: '“a friend of + posesivo”: a friend of mine / yours / my mother’s. Significa “uno de mis amigos”.', examples: ['Lucas is a friend of mine.', 'Ana is a friend of my mother’s.'], level: 'B1' },
  { id: 'time', title: 'Expresiones de tiempo', rule: 'También se usa con today, yesterday, tomorrow y periodos de tiempo.', examples: ['today’s newspaper', 'a week’s holiday', 'two hours’ drive'], level: 'A2' },
];

export interface GenitiveItem {
  q: string;
  a: string;
  w: [string, string];
  rule: GenitiveRule;
  why: string;
}

export const GENITIVE: GenitiveItem[] = [
  { q: 'The mother of Laura is Clara.', a: 'Laura’s mother is Clara.', w: ['Laura mother’s is Clara.', 'The Laura’s mother is Clara.'], rule: 'singular', why: 'Poseedor + ’s + cosa. Nunca “the” delante de un nombre propio.' },
  { q: 'The son of Laura is Samuel.', a: 'Laura’s son is Samuel.', w: ['Laura son’s is Samuel.', 'Lauras son is Samuel.'], rule: 'singular', why: 'El apóstrofo es obligatorio: Laura’s, no Lauras.' },
  { q: 'The car of my brother is new.', a: 'My brother’s car is new.', w: ['My brothers car is new.', 'My brother car’s is new.'], rule: 'singular', why: 'Un hermano → brother’s. La ’s va pegada al poseedor, no a la cosa.' },
  { q: 'The dog of the children is small.', a: 'The children’s dog is small.', w: ['The childrens’ dog is small.', 'The children dog’s is small.'], rule: 'irregular-plural', why: 'Children es plural irregular (no termina en -s) → children’s.' },
  { q: 'The house of my parents is big.', a: 'My parents’ house is big.', w: ['My parent’s house is big.', 'My parents house’ is big.'], rule: 'plural-s', why: 'Parents termina en -s → solo apóstrofo: parents’.' },
  { q: 'The bike of James is red.', a: 'James’s bike is red.', w: ['James bike’s is red.', 'The James’ bike is red.'], rule: 'name-s', why: 'James’s (o James’) — ambas son correctas, pero sin “the”.' },
  { q: 'The toys of the boys are old.', a: 'The boys’ toys are old.', w: ['The boy’s toys are old.', 'The boys toys’ are old.'], rule: 'plural-s', why: 'Varios niños (boys) → boys’. “The boy’s” sería de un solo niño.' },
  { q: 'The office of my father is quiet.', a: 'My father’s office is quiet.', w: ['My fathers office is quiet.', 'My father office’s is quiet.'], rule: 'singular', why: 'Un padre → father’s.' },
  { q: 'The names of my cousins are long.', a: 'My cousins’ names are long.', w: ['My cousin’s names are long.', 'My cousins names’ are long.'], rule: 'plural-s', why: 'Varios primos → cousins’.' },
  { q: 'The birthday of my sister is today.', a: 'My sister’s birthday is today.', w: ['My sisters birthday is today.', 'My sister birthday’s is today.'], rule: 'singular', why: 'Una hermana → sister’s.' },
  // NEW items: more irregular plurals, names in -s, joint possession, double possessive, time.
  { q: 'The shoes of the women are black.', a: 'The women’s shoes are black.', w: ['The womens’ shoes are black.', 'The women shoes are black.'], rule: 'irregular-plural', why: 'Women es plural irregular → women’s (nunca womens’).' },
  { q: 'The opinions of the people are important.', a: 'The people’s opinions are important.', w: ['The peoples’ opinions are important.', 'The people opinions’ are important.'], rule: 'irregular-plural', why: 'People ya es plural (sin -s) → people’s.' },
  { q: 'The bedroom of my grandparents is upstairs.', a: 'My grandparents’ bedroom is upstairs.', w: ['My grandparent’s bedroom is upstairs.', 'My grandparents’s bedroom is upstairs.'], rule: 'plural-s', why: 'Dos abuelos → grandparents’ (no se añade otra s).' },
  { q: 'The bikes of my brothers are new. (I have two brothers.)', a: 'My brothers’ bikes are new.', w: ['My brother’s bikes are new.', 'My brothers’s bikes are new.'], rule: 'plural-s', why: 'Dos hermanos → brothers’. “My brother’s bikes” = las bicis de un solo hermano.' },
  { q: 'The toys of the baby are on the floor.', a: 'The baby’s toys are on the floor.', w: ['The babys’ toys are on the floor.', 'The baby toys’s are on the floor.'], rule: 'singular', why: 'Un bebé → baby’s.' },
  { q: 'The car of Mr Jones is blue.', a: 'Mr Jones’s car is blue.', w: ['Mr Jone’s car is blue.', 'Mr Jones car’s is blue.'], rule: 'name-s', why: 'El apellido es Jones: Jones’s (o Jones’). “Jone’s” cambia el nombre.' },
  { q: 'The house of Tom and Ann is near the park. (They live together.)', a: 'Tom and Ann’s house is near the park.', w: ['Tom’s and Ann’s house is near the park.', 'Tom and Anns’ house is near the park.'], rule: 'joint', why: 'Una casa compartida → ’s solo en el último nombre.' },
  { q: 'Lucas is one of my friends.', a: 'Lucas is a friend of mine.', w: ['Lucas is a friend of me.', 'Lucas is a friend of my.'], rule: 'double', why: 'Doble posesivo: a friend of + mine / yours / his / hers / ours / theirs.' },
  { q: 'Ana is one of my mother’s friends.', a: 'Ana is a friend of my mother’s.', w: ['Ana is a friend of my mothers’.', 'Ana is a my mother’s friend.'], rule: 'double', why: 'a friend of + my mother’s (una sola madre → mother’s).' },
  { q: 'The newspaper of today is on the table.', a: 'Today’s newspaper is on the table.', w: ['Todays’ newspaper is on the table.', 'Today newspaper’s is on the table.'], rule: 'time', why: 'Expresión de tiempo: today’s newspaper.' },
];

/** NEW: "build the genitive" items — owner + thing, the learner types the phrase. */
export type OwnerKind = 'singular' | 'plural' | 'irregular' | 'joint';
export interface GenitiveBuildItem {
  owner: string;
  kind: OwnerKind;
  thing: string;
  es: string;
}

export const GENITIVE_BUILD: GenitiveBuildItem[] = [
  { owner: 'my sister', kind: 'singular', thing: 'bag', es: 'el bolso de mi hermana' },
  { owner: 'my parents', kind: 'plural', thing: 'car', es: 'el coche de mis padres' },
  { owner: 'the children', kind: 'irregular', thing: 'room', es: 'la habitación de los niños' },
  { owner: 'James', kind: 'singular', thing: 'phone', es: 'el teléfono de James' },
  { owner: 'my grandparents', kind: 'plural', thing: 'garden', es: 'el jardín de mis abuelos' },
  { owner: 'the men', kind: 'irregular', thing: 'shoes', es: 'los zapatos de los hombres' },
  { owner: 'Laura', kind: 'singular', thing: 'brother', es: 'el hermano de Laura' },
  { owner: 'my cousins', kind: 'plural', thing: 'dog', es: 'el perro de mis primos' },
  { owner: 'Doris', kind: 'singular', thing: 'cat', es: 'el gato de Doris' },
  { owner: 'my uncle', kind: 'singular', thing: 'house', es: 'la casa de mi tío' },
  { owner: 'the women', kind: 'irregular', thing: 'team', es: 'el equipo de las mujeres' },
  { owner: 'my friends', kind: 'plural', thing: 'party', es: 'la fiesta de mis amigos' },
  { owner: 'Tom and Ann', kind: 'joint', thing: 'house', es: 'la casa de Tom y Ann (de los dos)' },
  { owner: 'my wife', kind: 'singular', thing: 'mother', es: 'la madre de mi esposa' },
  { owner: 'the boys', kind: 'plural', thing: 'bikes', es: 'las bicis de los chicos' },
  { owner: 'the people', kind: 'irregular', thing: 'choice', es: 'la elección de la gente' },
];

// ------------------------------------------------------------ family tree --

export const REL_ES: Record<string, string> = {
  'Great-grandfather': 'Bisabuelo', 'Great-grandmother': 'Bisabuela',
  Grandfather: 'Abuelo', Grandmother: 'Abuela', 'Great-uncle': 'Tío abuelo', 'Great-aunt': 'Tía abuela',
  Father: 'Padre', Mother: 'Madre', Stepfather: 'Padrastro', Stepmother: 'Madrastra',
  Uncle: 'Tío', Aunt: 'Tía', 'Father-in-law': 'Suegro', 'Mother-in-law': 'Suegra',
  Godfather: 'Padrino', Godmother: 'Madrina',
  Me: 'Yo', Brother: 'Hermano', Sister: 'Hermana', 'Half-brother': 'Medio hermano', 'Half-sister': 'Media hermana',
  Stepbrother: 'Hermanastro', Stepsister: 'Hermanastra', Cousin: 'Primo / Prima',
  Husband: 'Esposo', Wife: 'Esposa', 'Brother-in-law': 'Cuñado', 'Sister-in-law': 'Cuñada',
  Son: 'Hijo', Daughter: 'Hija', Nephew: 'Sobrino', Niece: 'Sobrina',
  'Son-in-law': 'Yerno', 'Daughter-in-law': 'Nuera', Stepson: 'Hijastro', Stepdaughter: 'Hijastra',
  Grandson: 'Nieto', Granddaughter: 'Nieta',
};

export interface Generation {
  key: string;
  title: string;
  titleEs: string;
  rels: string[];
}

export const GENS: Generation[] = [
  { key: 'g0', title: 'Great-grandparents', titleEs: 'Bisabuelos', rels: ['Great-grandfather', 'Great-grandmother'] },
  { key: 'g1', title: 'Grandparents', titleEs: 'Abuelos', rels: ['Grandfather', 'Grandmother', 'Great-uncle', 'Great-aunt'] },
  // FIX: g2 and g4 had no Spanish title in the legacy file.
  { key: 'g2', title: 'Parents · aunts · uncles', titleEs: 'Padres · tíos', rels: ['Father', 'Mother', 'Stepfather', 'Stepmother', 'Uncle', 'Aunt', 'Father-in-law', 'Mother-in-law', 'Godfather', 'Godmother'] },
  { key: 'g3', title: 'My generation', titleEs: 'Mi generación', rels: ['Me', 'Brother', 'Sister', 'Half-brother', 'Half-sister', 'Stepbrother', 'Stepsister', 'Cousin', 'Husband', 'Wife', 'Brother-in-law', 'Sister-in-law'] },
  { key: 'g4', title: 'Children · nephews · nieces', titleEs: 'Hijos · sobrinos', rels: ['Son', 'Daughter', 'Stepson', 'Stepdaughter', 'Nephew', 'Niece', 'Son-in-law', 'Daughter-in-law'] },
  { key: 'g5', title: 'Grandchildren', titleEs: 'Nietos', rels: ['Grandson', 'Granddaughter'] },
];

/** Card tints, rotating per generation (legacy oklch hues 60/200/310/140/25 → iOS tokens). */
export const TINTS = ['var(--orange)', 'var(--teal)', 'var(--purple)', 'var(--green)', 'var(--pink)'] as const;

/** Example tree: [relation, name]. */
export const SAMPLE: [string, string][] = [
  ['Great-grandfather', 'Ernesto'], ['Grandfather', 'Luis'], ['Grandmother', 'Rosa'],
  ['Father', 'Andrés'], ['Mother', 'Clara'], ['Aunt', 'Marta'], ['Uncle', 'Diego'],
  ['Me', 'Laura'], ['Brother', 'Samuel'], ['Sister', 'Ana'], ['Cousin', 'Pablo'],
  ['Son', 'Mateo'], ['Niece', 'Sofía'],
];

export const HOMEWORK = {
  // FIX: "name at least 9 members of your family and the titles they have" → natural English.
  task: 'Create a family tree with at least 9 members of your family. Write each person’s name and their relationship to you.',
  taskEs: 'Crea un árbol genealógico con al menos 9 miembros de tu familia: escribe el nombre de cada persona y su parentesco contigo.',
  // FIX: legacy note referred to a specific class ("the test after class 9").
  note: 'Don’t forget to review for your next test.',
  defaultMin: 9,
  minRange: [4, 20] as [number, number],
};

/** localStorage key used by the legacy single-file app (migrated on first load). */
export const LEGACY_STORAGE_KEY = 'twa-time-family-v1';
