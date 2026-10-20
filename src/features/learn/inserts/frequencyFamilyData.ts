/** Adverbs of frequency + family: data for the A1 lesson tools (frequencyFamily.tsx). */

export const SCALE: { pct: number; adv: string; es: string; ex: [string, string, string] }[] = [
  { pct: 100, adv: 'always', es: 'siempre', ex: ['You are', 'always', 'late.'] },
  { pct: 90, adv: 'usually', es: 'normalmente', ex: ['We', 'usually', 'go to the cinema on Sundays.'] },
  { pct: 70, adv: 'often', es: 'a menudo', ex: ['He', 'often', 'cooks pasta.'] },
  { pct: 50, adv: 'sometimes', es: 'a veces', ex: ['We', 'sometimes', 'order pizza for dinner.'] },
  { pct: 10, adv: 'hardly ever / rarely', es: 'casi nunca', ex: ['She', 'hardly ever', 'smiles.'] },
  { pct: 0, adv: 'never', es: 'nunca', ex: ['They are', 'never', 'at home when we call.'] },
];

export const ADV_QUESTIONS: { text: string; answer: string; wrong: string[] }[] = [
  { text: 'She ___ brushes her teeth before bed – every single night!', answer: 'always', wrong: ['never', 'often', 'rarely'] },
  { text: 'He ___ eats breakfast. Maybe once a month.', answer: 'rarely', wrong: ['always', 'usually', 'sometimes'] },
  { text: 'We ___ go swimming on Saturdays – about 9 times out of 10!', answer: 'usually', wrong: ['never', 'rarely', 'always'] },
  { text: 'They ___ order pizza for dinner – about half the time.', answer: 'sometimes', wrong: ['always', 'never', 'usually'] },
  { text: 'I ___ drink coffee. I prefer tea 100% of the time.', answer: 'never', wrong: ['always', 'often', 'usually'] },
  { text: 'My dog ___ barks at strangers – almost every time!', answer: 'often', wrong: ['never', 'rarely', 'sometimes'] },
  { text: 'The train is ___ on time – you can count on it every day.', answer: 'always', wrong: ['rarely', 'sometimes', 'never'] },
  { text: 'She ___ goes to the gym – maybe twice a year.', answer: 'hardly ever', wrong: ['usually', 'always', 'often'] },
  { text: 'My grandmother ___ bakes cookies on Sundays – every week without fail!', answer: 'always', wrong: ['never', 'rarely', 'sometimes'] },
  { text: 'My brother ___ calls me – we talk maybe once or twice a year.', answer: 'rarely', wrong: ['always', 'usually', 'often'] },
  { text: 'My aunt ___ visits us in the summer – about 9 summers out of 10.', answer: 'usually', wrong: ['never', 'rarely', 'sometimes'] },
  { text: 'My uncle ___ tells the same jokes – every single time!', answer: 'always', wrong: ['rarely', 'sometimes', 'never'] },
  { text: 'My sister ___ borrows my clothes without asking – almost every day!', answer: 'often', wrong: ['never', 'rarely', 'hardly ever'] },
  { text: 'My nephew ___ cries – he’s a very happy baby!', answer: 'hardly ever', wrong: ['always', 'usually', 'often'] },
  { text: 'My parents ___ argue – they have a very peaceful relationship.', answer: 'never', wrong: ['always', 'usually', 'sometimes'] },
  { text: 'My son is ___ late for school – he wakes up at 5 a.m. every day.', answer: 'never', wrong: ['always', 'often', 'usually'] },
];

export const DETECTIVE_POOL: { who: string; emoji: string; act: string; days: number }[] = [
  { who: 'My mother', emoji: '👩', act: 'makes breakfast', days: 7 },
  { who: 'My grandmother', emoji: '👵', act: 'waters the plants', days: 7 },
  { who: 'My grandfather', emoji: '👴', act: 'takes a nap after lunch', days: 6 },
  { who: 'My uncle', emoji: '🧔', act: 'goes to the gym', days: 6 },
  { who: 'My father', emoji: '👨', act: 'cooks dinner', days: 5 },
  { who: 'My daughter', emoji: '👧', act: 'practises the piano', days: 5 },
  { who: 'My aunt', emoji: '👩‍🦱', act: 'calls us on the phone', days: 4 },
  { who: 'My sister', emoji: '👱‍♀️', act: 'tidies her room', days: 3 },
  { who: 'My brother', emoji: '👱‍♂️', act: 'washes the dishes', days: 1 },
  { who: 'My son', emoji: '👦', act: 'forgets his homework', days: 1 },
  { who: 'My cousin', emoji: '🧒', act: 'misses the school bus', days: 0 },
  { who: 'My baby brother', emoji: '👶', act: 'sleeps all night', days: 0 },
];
export const DAYS_TO_ADVERB: Record<number, string> = { 7: 'always', 6: 'usually', 5: 'often', 4: 'sometimes', 3: 'sometimes', 2: 'hardly ever', 1: 'hardly ever', 0: 'never' };
export const ADVERB_CHOICES = ['always', 'usually', 'often', 'sometimes', 'hardly ever', 'never'];

export type TileKind = 'person' | 'adverb' | 'verb' | 'aux' | 'rest';
export const BUILDER_ITEMS: { pct: string; kind: string; end: string; tiles: [string, TileKind][]; decoys: string[]; tip: string }[] = [
  { pct: '100%', kind: 'Afirmativa', end: '.', tiles: [['My grandmother', 'person'], ['always', 'adverb'], ['bakes', 'verb'], ['cookies on Sundays', 'rest']], decoys: ['never', 'hardly ever'], tip: 'Afirmativa: sujeto → adverbio → verbo principal.' },
  { pct: '0%', kind: 'Con BE', end: '.', tiles: [['My little cousin', 'person'], ['is', 'verb'], ['never', 'adverb'], ['quiet at dinner', 'rest']], decoys: ['always', 'often'], tip: 'Con el verbo BE el adverbio va DESPUÉS: is / are / am + adverbio.' },
  { pct: '70%', kind: 'Pregunta', end: '?', tiles: [['Does', 'aux'], ['your uncle', 'person'], ['often', 'adverb'], ['tell the same jokes', 'rest']], decoys: ['always', 'never'], tip: 'Pregunta: auxiliar → sujeto → adverbio → verbo principal.' },
  { pct: '90%', kind: 'Afirmativa', end: '.', tiles: [['My parents', 'person'], ['usually', 'adverb'], ['drive', 'verb'], ['me to school', 'rest']], decoys: ['rarely', 'never'], tip: 'Afirmativa: sujeto → adverbio → verbo principal.' },
  { pct: '100%', kind: 'Con BE', end: '.', tiles: [['My sister', 'person'], ['is', 'verb'], ['always', 'adverb'], ['on her phone', 'rest']], decoys: ['hardly ever', 'sometimes'], tip: 'Con el verbo BE el adverbio va DESPUÉS: is / are / am + adverbio.' },
  { pct: '50%', kind: 'Afirmativa', end: '.', tiles: [['My nephew and I', 'person'], ['sometimes', 'adverb'], ['play', 'verb'], ['video games together', 'rest']], decoys: ['always', 'never'], tip: 'Afirmativa: sujeto → adverbio → verbo principal.' },
  { pct: '10%', kind: 'Afirmativa', end: '.', tiles: [['My father', 'person'], ['hardly ever', 'adverb'], ['forgets', 'verb'], ['my birthday', 'rest']], decoys: ['always', 'usually'], tip: 'HARDLY EVER ya significa «casi nunca»: el verbo queda en positivo (nunca «doesn’t hardly ever»).' },
  { pct: '90%', kind: 'Pregunta con BE', end: '?', tiles: [['Are', 'aux'], ['your grandparents', 'person'], ['usually', 'adverb'], ['at home on Sundays', 'rest']], decoys: ['never', 'often'], tip: 'Pregunta con BE: are / is → sujeto → adverbio.' },
  { pct: '70%', kind: 'Afirmativa', end: '.', tiles: [['My aunt', 'person'], ['often', 'adverb'], ['brings', 'verb'], ['dessert to family lunch', 'rest']], decoys: ['never', 'hardly ever'], tip: 'Afirmativa: sujeto → adverbio → verbo principal.' },
  { pct: '0%', kind: 'Afirmativa', end: '.', tiles: [['My brother-in-law', 'person'], ['never', 'adverb'], ['arrives', 'verb'], ['on time', 'rest']], decoys: ['always', 'usually'], tip: 'NEVER ya es negativo: el verbo queda en positivo (nunca «doesn’t never»).' },
];

// ------------------------------------------------------------- family tree --

export const STAGE_W = 1680;
export const STAGE_H = 900;
export const NODE_W = 120;
export const NODE_H = 92;
const R = { g1: 88, g2: 250, g3: 430, g4: 610, g5: 790 };

export const BANDS = [
  { y: R.g1, label: 'GEN 1 · bisabuelos' },
  { y: R.g2, label: 'GEN 2 · abuelos' },
  { y: R.g3, label: 'GEN 3 · padres y tíos' },
  { y: R.g4, label: 'GEN 4 · tú, hermanos, primos' },
  { y: R.g5, label: 'GEN 5 · hijos y sobrinos' },
];

export interface TreeNode {
  id: string;
  x: number;
  y: number;
  emoji: string;
  name: string;
  answer: string;
  rel: string;
  side: ('paternal' | 'maternal' | 'inlaws' | 'mine')[];
}

export const TREE_NODES: TreeNode[] = [
  { id: 'gg1', x: 270, y: R.g1, emoji: '👴', name: 'Arturo', answer: 'Great-grandfather', rel: 'Arturo is your grandfather Roberto’s father → your great-grandfather.', side: ['paternal'] },
  { id: 'gg2', x: 440, y: R.g1, emoji: '👵', name: 'Edna', answer: 'Great-grandmother', rel: 'Edna is your grandfather Roberto’s mother → your great-grandmother.', side: ['paternal'] },
  { id: 'gg3', x: 1120, y: R.g1, emoji: '👴', name: 'Hernán', answer: 'Great-grandfather', rel: 'Hernán is your grandfather Jaime’s father → your great-grandfather.', side: ['maternal'] },
  { id: 'gg4', x: 1290, y: R.g1, emoji: '👵', name: 'Dora', answer: 'Great-grandmother', rel: 'Dora is your grandfather Jaime’s mother → your great-grandmother.', side: ['maternal'] },
  { id: 'gu1', x: 185, y: R.g2, emoji: '🧓', name: 'Walter', answer: 'Great-uncle', rel: 'Walter is your grandfather Roberto’s brother → your great-uncle.', side: ['paternal'] },
  { id: 'ga1', x: 355, y: R.g2, emoji: '👩‍🦳', name: 'Mabel', answer: 'Great-aunt', rel: 'Mabel is your grandfather Roberto’s sister → your great-aunt.', side: ['paternal'] },
  { id: 'gf1', x: 525, y: R.g2, emoji: '👴', name: 'Roberto', answer: 'Grandfather', rel: 'Roberto is your father David’s father → your grandfather.', side: ['paternal'] },
  { id: 'gm1', x: 695, y: R.g2, emoji: '👵', name: 'María', answer: 'Grandmother', rel: 'María is your father David’s mother → your grandmother.', side: ['paternal'] },
  { id: 'gm2', x: 865, y: R.g2, emoji: '👵', name: 'Susana', answer: 'Grandmother', rel: 'Susana is your mother Emma’s mother → your grandmother.', side: ['maternal'] },
  { id: 'gf2', x: 1035, y: R.g2, emoji: '👴', name: 'Jaime', answer: 'Grandfather', rel: 'Jaime is your mother Emma’s father → your grandfather.', side: ['maternal'] },
  { id: 'gu2', x: 1205, y: R.g2, emoji: '🧓', name: 'Ernesto', answer: 'Great-uncle', rel: 'Ernesto is your grandfather Jaime’s brother → your great-uncle.', side: ['maternal'] },
  { id: 'ga2', x: 1375, y: R.g2, emoji: '👩‍🦳', name: 'Inés', answer: 'Great-aunt', rel: 'Inés is your grandfather Jaime’s sister → your great-aunt.', side: ['maternal'] },
  { id: 'ant', x: 355, y: R.g3, emoji: '👩‍🦱', name: 'Linda', answer: 'Aunt', rel: 'Linda is married to your uncle Pedro → your aunt.', side: ['paternal'] },
  { id: 'unc', x: 525, y: R.g3, emoji: '🧔', name: 'Pedro', answer: 'Uncle', rel: 'Pedro is your father David’s brother → your uncle.', side: ['paternal'] },
  { id: 'dad', x: 695, y: R.g3, emoji: '👨', name: 'David', answer: 'Father', rel: 'David is your male parent → your father.', side: ['paternal', 'mine'] },
  { id: 'mom', x: 865, y: R.g3, emoji: '👩', name: 'Emma', answer: 'Mother', rel: 'Emma is your female parent → your mother.', side: ['maternal', 'mine'] },
  { id: 'ant2', x: 1035, y: R.g3, emoji: '👩‍🦱', name: 'Helena', answer: 'Aunt', rel: 'Helena is your mother Emma’s sister → your aunt.', side: ['maternal'] },
  { id: 'unc2', x: 1205, y: R.g3, emoji: '🧔', name: 'Marcos', answer: 'Uncle', rel: 'Marcos is married to your aunt Helena → your uncle.', side: ['maternal'] },
  { id: 'fil', x: 1375, y: R.g3, emoji: '🧓', name: 'Jorge', answer: 'Father-in-law', rel: 'Jorge is your wife Alejandra’s father → your father-in-law.', side: ['inlaws'] },
  { id: 'mil', x: 1545, y: R.g3, emoji: '👩‍🦳', name: 'Patricia', answer: 'Mother-in-law', rel: 'Patricia is your wife Alejandra’s mother → your mother-in-law.', side: ['inlaws'] },
  { id: 'cou1', x: 270, y: R.g4, emoji: '🧒', name: 'Jacobo', answer: 'Cousin', rel: 'Jacobo is your uncle Pedro’s son → your cousin.', side: ['paternal'] },
  { id: 'cou2', x: 440, y: R.g4, emoji: '🧒', name: 'Lili', answer: 'Cousin', rel: 'Lili is your uncle Pedro’s daughter → your cousin.', side: ['paternal'] },
  { id: 'bro', x: 610, y: R.g4, emoji: '👱‍♂️', name: 'Tomás', answer: 'Brother', rel: 'Tomás has the same parents as you → your brother.', side: ['mine'] },
  { id: 'sis', x: 780, y: R.g4, emoji: '👱‍♀️', name: 'Sofía', answer: 'Sister', rel: 'Sofía has the same parents as you → your sister.', side: ['mine'] },
  { id: 'me', x: 950, y: R.g4, emoji: '🌟', name: 'You', answer: '', rel: 'This is you! Every label describes this person’s family.', side: ['paternal', 'maternal', 'inlaws', 'mine'] },
  { id: 'wife', x: 1120, y: R.g4, emoji: '👰', name: 'Alejandra', answer: 'Wife', rel: 'Alejandra is married to you → your wife.', side: ['inlaws', 'mine'] },
  { id: 'bil', x: 1290, y: R.g4, emoji: '🤵', name: 'Kevin', answer: 'Brother-in-law', rel: 'Kevin is your wife Alejandra’s brother → your brother-in-law.', side: ['inlaws'] },
  { id: 'sil', x: 1460, y: R.g4, emoji: '👰', name: 'Raquel', answer: 'Sister-in-law', rel: 'Raquel is your wife Alejandra’s sister → your sister-in-law.', side: ['inlaws'] },
  { id: 'neph', x: 610, y: R.g5, emoji: '👦', name: 'Carlos', answer: 'Nephew', rel: 'Carlos is your brother Tomás’s son → your nephew.', side: ['mine'] },
  { id: 'niece', x: 780, y: R.g5, emoji: '👧', name: 'Olivia', answer: 'Niece', rel: 'Olivia is your sister Sofía’s daughter → your niece.', side: ['mine'] },
  { id: 'son', x: 950, y: R.g5, emoji: '👦', name: 'Ethan', answer: 'Son', rel: 'Ethan is your male child → your son.', side: ['mine'] },
  { id: 'dau', x: 1120, y: R.g5, emoji: '👧', name: 'Mía', answer: 'Daughter', rel: 'Mía is your female child → your daughter.', side: ['mine'] },
  { id: 'baby', x: 1290, y: R.g5, emoji: '👶', name: 'Leo', answer: 'Baby', rel: 'Leo is your youngest child → your baby.', side: ['mine'] },
];

export const UNIONS: { a: string; b: string; children: string[] }[] = [
  { a: 'gg1', b: 'gg2', children: ['gu1', 'ga1', 'gf1'] },
  { a: 'gg3', b: 'gg4', children: ['gf2', 'gu2', 'ga2'] },
  { a: 'gf1', b: 'gm1', children: ['unc', 'dad'] },
  { a: 'gm2', b: 'gf2', children: ['mom', 'ant2'] },
  { a: 'ant', b: 'unc', children: ['cou1', 'cou2'] },
  { a: 'dad', b: 'mom', children: ['bro', 'sis', 'me'] },
  { a: 'ant2', b: 'unc2', children: [] },
  { a: 'fil', b: 'mil', children: ['wife', 'bil', 'sil'] },
  { a: 'me', b: 'wife', children: ['son', 'dau', 'baby'] },
];
export const SOLO_PARENTS = [
  { p: 'bro', children: ['neph'] },
  { p: 'sis', children: ['niece'] },
];

export const LABELS = [...new Set(TREE_NODES.map((n) => n.answer).filter(Boolean))];
