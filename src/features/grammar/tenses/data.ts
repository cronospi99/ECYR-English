/**
 * Tense Timeline — reference data: the tenses, their names in English and
 * Spanish, a one-line usage note, the formula, colours, ready-made time
 * expressions for Build mode and example sentences (also used by Practice and
 * the parser test script).
 */

export type TenseId =
  | 'presentSimple'
  | 'presentContinuous'
  | 'pastSimple'
  | 'pastContinuous'
  | 'presentPerfect'
  | 'presentPerfectContinuous'
  | 'pastPerfect'
  | 'pastPerfectContinuous'
  | 'futureSimple'
  | 'futureContinuous'
  | 'futurePerfect'
  | 'futurePerfectContinuous'
  | 'goingTo'
  | 'usedTo'
  | 'wouldHabit';

/** What the parser can name: a real tense, or a clause that isn't one. */
export type ClauseKind = TenseId | 'modal' | 'imperative';

export type Family = 'present' | 'past' | 'perfect' | 'future' | 'habit' | 'other';

export interface TenseInfo {
  id: TenseId;
  en: string;
  es: string;
  /** One line, in Spanish, about when to use it. */
  use_es: string;
  formula: string;
  family: Family;
  example: string;
  /** False for the continuous perfects / future continuous: no natural passive. */
  passive: boolean;
}

export const FAMILY_COLOR: Record<Family, string> = {
  present: 'var(--blue)',
  past: 'var(--orange)',
  perfect: 'var(--purple)',
  future: 'var(--green)',
  habit: 'var(--teal)',
  other: 'var(--indigo)',
};

export const TENSES: Record<TenseId, TenseInfo> = {
  presentSimple: {
    id: 'presentSimple',
    en: 'Present simple',
    es: 'Presente simple',
    use_es: 'Hábitos, rutinas, estados y verdades generales: lo que pasa siempre o normalmente.',
    formula: 'sujeto + verbo (-s con he/she/it) · do/does not + verbo',
    family: 'present',
    example: 'She works in a hospital.',
    passive: true,
  },
  presentContinuous: {
    id: 'presentContinuous',
    en: 'Present continuous',
    es: 'Presente continuo',
    use_es: 'Algo que está pasando ahora mismo o en esta temporada (o un plan ya acordado para el futuro).',
    formula: 'sujeto + am/is/are + verbo-ing',
    family: 'present',
    example: 'I am studying right now.',
    passive: true,
  },
  pastSimple: {
    id: 'pastSimple',
    en: 'Past simple',
    es: 'Pasado simple',
    use_es: 'Una acción terminada en un momento concreto del pasado (yesterday, last week, in 2019…).',
    formula: 'sujeto + verbo en pasado · did not + verbo base',
    family: 'past',
    example: 'We visited Cartagena last year.',
    passive: true,
  },
  pastContinuous: {
    id: 'pastContinuous',
    en: 'Past continuous',
    es: 'Pasado continuo',
    use_es: 'Una acción en progreso en un momento del pasado; muchas veces otra acción la interrumpe.',
    formula: 'sujeto + was/were + verbo-ing',
    family: 'past',
    example: 'I was cooking when you called.',
    passive: true,
  },
  presentPerfect: {
    id: 'presentPerfect',
    en: 'Present perfect',
    es: 'Presente perfecto',
    use_es: 'Del pasado hasta ahora: experiencias, resultados que importan hoy o acciones sin momento exacto.',
    formula: 'sujeto + have/has + participio',
    family: 'perfect',
    example: 'I have already seen that movie.',
    passive: true,
  },
  presentPerfectContinuous: {
    id: 'presentPerfectContinuous',
    en: 'Present perfect continuous',
    es: 'Presente perfecto continuo',
    use_es: 'Una actividad que empezó en el pasado y sigue hasta ahora: pone el foco en la duración (for/since).',
    formula: 'sujeto + have/has been + verbo-ing',
    family: 'perfect',
    example: 'She has been waiting for two hours.',
    passive: false,
  },
  pastPerfect: {
    id: 'pastPerfect',
    en: 'Past perfect',
    es: 'Pasado perfecto (pluscuamperfecto)',
    use_es: 'El «pasado del pasado»: algo que ya había ocurrido antes de otro momento pasado.',
    formula: 'sujeto + had + participio',
    family: 'past',
    example: 'When I arrived, the train had left.',
    passive: true,
  },
  pastPerfectContinuous: {
    id: 'pastPerfectContinuous',
    en: 'Past perfect continuous',
    es: 'Pasado perfecto continuo',
    use_es: 'Cuánto tiempo llevaba algo en curso hasta un momento del pasado.',
    formula: 'sujeto + had been + verbo-ing',
    family: 'past',
    example: 'They had been playing for an hour when it started to rain.',
    passive: false,
  },
  futureSimple: {
    id: 'futureSimple',
    en: 'Future simple (will)',
    es: 'Futuro simple (will)',
    use_es: 'Predicciones, decisiones del momento, promesas y ofrecimientos.',
    formula: 'sujeto + will + verbo base',
    family: 'future',
    example: 'I think it will rain tomorrow.',
    passive: true,
  },
  futureContinuous: {
    id: 'futureContinuous',
    en: 'Future continuous',
    es: 'Futuro continuo',
    use_es: 'Algo que estará en progreso en un momento concreto del futuro.',
    formula: 'sujeto + will be + verbo-ing',
    family: 'future',
    example: 'At this time tomorrow I will be flying to Madrid.',
    passive: false,
  },
  futurePerfect: {
    id: 'futurePerfect',
    en: 'Future perfect',
    es: 'Futuro perfecto',
    use_es: 'Algo que ya estará terminado antes de un momento del futuro (by Friday, by 2030…).',
    formula: 'sujeto + will have + participio',
    family: 'future',
    example: 'I will have finished the report by Friday.',
    passive: true,
  },
  futurePerfectContinuous: {
    id: 'futurePerfectContinuous',
    en: 'Future perfect continuous',
    es: 'Futuro perfecto continuo',
    use_es: 'Cuánto tiempo llevará algo en curso al llegar un momento del futuro.',
    formula: 'sujeto + will have been + verbo-ing',
    family: 'future',
    example: 'By June, I will have been working here for ten years.',
    passive: false,
  },
  goingTo: {
    id: 'goingTo',
    en: 'Be going to',
    es: 'Futuro con going to',
    use_es: 'Planes e intenciones ya decididos, o predicciones con evidencia que vemos ahora.',
    formula: 'sujeto + am/is/are going to + verbo base',
    family: 'future',
    example: 'We are going to travel next month.',
    passive: true,
  },
  usedTo: {
    id: 'usedTo',
    en: 'Used to',
    es: 'Used to (hábitos pasados)',
    use_es: 'Hábitos o estados del pasado que ya no son verdad hoy.',
    formula: 'sujeto + used to + verbo base · didn’t use to',
    family: 'habit',
    example: 'I used to play football every weekend.',
    passive: true,
  },
  wouldHabit: {
    id: 'wouldHabit',
    en: 'Would (past habit)',
    es: 'Would para hábitos pasados',
    use_es: 'Acciones repetidas en el pasado, como en una historia (no sirve para estados).',
    formula: 'sujeto + would + verbo base',
    family: 'habit',
    example: 'When I was a child, my grandma would tell us stories every night.',
    passive: false,
  },
};

export const KIND_INFO: Record<'modal' | 'imperative', { en: string; es: string; use_es: string }> = {
  modal: {
    en: 'Modal verb',
    es: 'Verbo modal',
    use_es: 'No es un tiempo verbal: can, should, must, might, would… expresan capacidad, consejo, obligación o posibilidad.',
  },
  imperative: {
    en: 'Imperative',
    es: 'Imperativo',
    use_es: 'Una orden o instrucción sin sujeto (Close the door). No marca un tiempo en la línea.',
  },
};

export const kindName = (k: ClauseKind) => (k === 'modal' || k === 'imperative' ? KIND_INFO[k] : TENSES[k]);
export const kindFamily = (k: ClauseKind): Family => (k === 'modal' || k === 'imperative' ? 'other' : TENSES[k].family);

/** Order of the "Cambiar tiempo" stepper and the Build tense picker. */
export const BUILD_ORDER: TenseId[] = [
  'presentSimple',
  'presentContinuous',
  'pastSimple',
  'pastContinuous',
  'presentPerfect',
  'presentPerfectContinuous',
  'pastPerfect',
  'pastPerfectContinuous',
  'futureSimple',
  'futureContinuous',
  'futurePerfect',
  'futurePerfectContinuous',
  'goingTo',
  'usedTo',
];

/** Time expressions offered in Build mode; `fits` lists the tenses they go with. */
export interface TimePreset {
  text: string;
  es: string;
  fits: TenseId[];
}

const PRESENT_ALL: TenseId[] = ['presentSimple'];
export const TIME_PRESETS: TimePreset[] = [
  { text: 'every day', es: 'todos los días', fits: [...PRESENT_ALL, 'usedTo'] },
  { text: 'on Saturdays', es: 'los sábados', fits: [...PRESENT_ALL, 'usedTo'] },
  { text: 'twice a week', es: 'dos veces por semana', fits: [...PRESENT_ALL, 'usedTo'] },
  { text: 'right now', es: 'ahora mismo', fits: ['presentContinuous'] },
  { text: 'at the moment', es: 'en este momento', fits: ['presentContinuous'] },
  { text: 'this week', es: 'esta semana', fits: ['presentContinuous', 'presentPerfect'] },
  { text: 'yesterday', es: 'ayer', fits: ['pastSimple', 'pastContinuous'] },
  { text: 'last week', es: 'la semana pasada', fits: ['pastSimple'] },
  { text: 'two days ago', es: 'hace dos días', fits: ['pastSimple'] },
  { text: 'in 2019', es: 'en 2019', fits: ['pastSimple'] },
  { text: 'at 8 pm yesterday', es: 'ayer a las 8 pm', fits: ['pastContinuous', 'pastSimple'] },
  { text: 'already', es: 'ya', fits: ['presentPerfect', 'pastPerfect', 'futurePerfect'] },
  { text: 'just', es: 'acabar de', fits: ['presentPerfect'] },
  { text: 'yet', es: 'todavía / ya (en preguntas)', fits: ['presentPerfect'] },
  { text: 'since 2019', es: 'desde 2019', fits: ['presentPerfect', 'presentPerfectContinuous'] },
  { text: 'for three years', es: 'durante tres años', fits: ['presentPerfect', 'presentPerfectContinuous', 'pastPerfectContinuous'] },
  { text: 'for two hours', es: 'durante dos horas', fits: ['presentPerfectContinuous', 'pastPerfectContinuous', 'pastContinuous'] },
  { text: 'before the class started', es: 'antes de que empezara la clase', fits: ['pastPerfect', 'pastPerfectContinuous'] },
  { text: 'by the time we arrived', es: 'para cuando llegamos', fits: ['pastPerfect'] },
  { text: 'tomorrow', es: 'mañana', fits: ['futureSimple', 'goingTo', 'presentContinuous'] },
  { text: 'next week', es: 'la próxima semana', fits: ['futureSimple', 'goingTo', 'presentContinuous'] },
  { text: 'at this time tomorrow', es: 'mañana a esta hora', fits: ['futureContinuous'] },
  { text: 'by Friday', es: 'para el viernes', fits: ['futurePerfect', 'futurePerfectContinuous'] },
  { text: 'by next June', es: 'para junio del próximo año', fits: ['futurePerfect', 'futurePerfectContinuous'] },
  { text: 'as a child', es: 'de niño(a)', fits: ['usedTo', 'pastSimple'] },
];

/** The default time expression the stepper uses for each tense. */
export const DEFAULT_TIME: Record<TenseId, string> = {
  presentSimple: 'every day',
  presentContinuous: 'right now',
  pastSimple: 'yesterday',
  pastContinuous: 'at 8 pm yesterday',
  presentPerfect: 'already',
  presentPerfectContinuous: 'for two hours',
  pastPerfect: 'before the class started',
  pastPerfectContinuous: 'for two hours',
  futureSimple: 'tomorrow',
  futureContinuous: 'at this time tomorrow',
  futurePerfect: 'by Friday',
  futurePerfectContinuous: 'by next June',
  goingTo: 'next week',
  usedTo: 'as a child',
  wouldHabit: 'as a child',
};

export interface Subject {
  en: string;
  person: '1s' | '2' | '3s' | 'pl';
  pronoun: boolean;
}

export const SUBJECTS: Subject[] = [
  { en: 'I', person: '1s', pronoun: true },
  { en: 'You', person: '2', pronoun: true },
  { en: 'He', person: '3s', pronoun: true },
  { en: 'She', person: '3s', pronoun: true },
  { en: 'It', person: '3s', pronoun: true },
  { en: 'We', person: 'pl', pronoun: true },
  { en: 'They', person: 'pl', pronoun: true },
  { en: 'My friend', person: '3s', pronoun: false },
  { en: 'The students', person: 'pl', pronoun: false },
];

/** Example sentences: Write-mode chips, Practice rounds and the parser test. */
export const EXAMPLES: { text: string; tense: TenseId }[] = [
  { text: 'She works in a hospital.', tense: 'presentSimple' },
  { text: 'I drink coffee every morning.', tense: 'presentSimple' },
  { text: 'Does your brother play the guitar?', tense: 'presentSimple' },
  { text: 'We don’t watch TV on weekdays.', tense: 'presentSimple' },
  { text: 'I am studying for my exam right now.', tense: 'presentContinuous' },
  { text: 'They’re watching a movie at the moment.', tense: 'presentContinuous' },
  { text: 'Is it raining outside?', tense: 'presentContinuous' },
  { text: 'He isn’t working this week.', tense: 'presentContinuous' },
  { text: 'We visited Cartagena last year.', tense: 'pastSimple' },
  { text: 'I didn’t go to the party yesterday.', tense: 'pastSimple' },
  { text: 'Did you see the match two days ago?', tense: 'pastSimple' },
  { text: 'She bought a new phone in 2019.', tense: 'pastSimple' },
  { text: 'I was cooking dinner at 8 pm.', tense: 'pastContinuous' },
  { text: 'They were sleeping when the alarm rang.', tense: 'pastContinuous' },
  { text: 'What were you doing at midnight?', tense: 'pastContinuous' },
  { text: 'It wasn’t raining yesterday morning.', tense: 'pastContinuous' },
  { text: 'I have already seen that movie.', tense: 'presentPerfect' },
  { text: 'Have you ever been to Medellín?', tense: 'presentPerfect' },
  { text: 'She’s lived here since 2019.', tense: 'presentPerfect' },
  { text: 'We haven’t finished the project yet.', tense: 'presentPerfect' },
  { text: 'I’ve been learning English for three years.', tense: 'presentPerfectContinuous' },
  { text: 'How long have you been waiting?', tense: 'presentPerfectContinuous' },
  { text: 'It has been raining all day.', tense: 'presentPerfectContinuous' },
  { text: 'They haven’t been sleeping well lately.', tense: 'presentPerfectContinuous' },
  { text: 'The film had already started when we arrived.', tense: 'pastPerfect' },
  { text: 'I’d never seen the sea before that trip.', tense: 'pastPerfect' },
  { text: 'Had you met him before the party?', tense: 'pastPerfect' },
  { text: 'She hadn’t eaten anything by lunchtime.', tense: 'pastPerfect' },
  { text: 'We had been walking for hours before we found the hotel.', tense: 'pastPerfectContinuous' },
  { text: 'He’d been working there for ten years when he quit.', tense: 'pastPerfectContinuous' },
  { text: 'How long had they been waiting?', tense: 'pastPerfectContinuous' },
  { text: 'I think it will rain tomorrow.', tense: 'futureSimple' },
  { text: 'I’ll help you with your homework.', tense: 'futureSimple' },
  { text: 'Will you come to my party next Saturday?', tense: 'futureSimple' },
  { text: 'She won’t tell anyone.', tense: 'futureSimple' },
  { text: 'At this time tomorrow I will be flying to Madrid.', tense: 'futureContinuous' },
  { text: 'They’ll be waiting for us at the airport.', tense: 'futureContinuous' },
  { text: 'Will you be using the car tonight?', tense: 'futureContinuous' },
  { text: 'I will have finished the report by Friday.', tense: 'futurePerfect' },
  { text: 'By 2030, they’ll have built the new metro line.', tense: 'futurePerfect' },
  { text: 'Will you have arrived by noon?', tense: 'futurePerfect' },
  { text: 'By June, I will have been working here for ten years.', tense: 'futurePerfectContinuous' },
  { text: 'Next month she’ll have been living in Bogotá for a year.', tense: 'futurePerfectContinuous' },
  { text: 'We are going to travel next month.', tense: 'goingTo' },
  { text: 'Look at those clouds! It’s going to rain.', tense: 'goingTo' },
  { text: 'Are you going to call her tonight?', tense: 'goingTo' },
  { text: 'I’m not going to buy that car.', tense: 'goingTo' },
  { text: 'I used to play football every weekend.', tense: 'usedTo' },
  { text: 'She didn’t use to like vegetables.', tense: 'usedTo' },
  { text: 'Did you use to live in Cali?', tense: 'usedTo' },
  { text: 'As a child, I would spend every summer at my grandparents’ farm.', tense: 'wouldHabit' },
  { text: 'When we were kids, we would play in the street every afternoon.', tense: 'wouldHabit' },
];

/** Ready-made sentences that show each warning (Write-mode “Errores típicos”). */
export const MISTAKE_EXAMPLES = [
  'I have saw that movie.',
  'She did went to the party.',
  'I live here since three years.',
  'I am agree with you.',
  'He don’t like coffee.',
  'I have seen him yesterday.',
  'I use to wake up early.',
];
