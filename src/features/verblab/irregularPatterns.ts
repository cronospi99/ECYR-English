/**
 * Irregular verbs grouped by the relationship between their three forms and by
 * sound (the "pattern method"): six families instead of one alphabetical list.
 * Codes: AAA = all the same · ABB = past = participle · ABA = participle back
 * to the base · ABC = all different.
 */
export type Code = 'AAA' | 'ABB' | 'ABA' | 'ABC' | 'REBEL';

export interface Family {
  title: string;
  hint: string;
  verbs: [string, string, string, string][]; // base, past, participle, español
}

export interface IrregularGroup {
  n: number;
  name: string;
  code: Code;
  color: string;
  emoji: string;
  summary: string;
  trick: string;
  families: Family[];
  watch?: { title: string; body: string };
  examples: string[];
}

export const CODE_INFO: Record<Code, { label: string; es: string; ex: string }> = {
  AAA: { label: 'A – A – A', es: 'Las tres formas son iguales', ex: 'put – put – put' },
  ABB: { label: 'A – B – B', es: 'Pasado y participio iguales', ex: 'buy – bought – bought' },
  ABA: { label: 'A – B – A', es: 'El participio vuelve a la base', ex: 'come – came – come' },
  ABC: { label: 'A – B – C', es: 'Las tres formas son distintas', ex: 'sing – sang – sung' },
  REBEL: { label: 'Sin patrón', es: 'Hay que memorizarlos', ex: 'go – went – gone' },
};

export const GROUPS: IrregularGroup[] = [
  {
    n: 1,
    name: 'The “No-Change” Group',
    code: 'AAA',
    color: 'var(--green)',
    emoji: '🟰',
    summary: 'Base, pasado y participio son idénticos. Solo cambian los marcadores de tiempo y los auxiliares.',
    trick: 'Casi todos terminan en -t o -d: el inglés no quiere añadir otro sonido /t/ o /d/, así que el verbo no cambia. Si un verbo termina en -t o -d, busca primero aquí.',
    families: [
      {
        title: 'Los diez básicos',
        hint: '',
        verbs: [
          ['bet', 'bet', 'bet', 'apostar'],
          ['cost', 'cost', 'cost', 'costar'],
          ['cut', 'cut', 'cut', 'cortar'],
          ['hit', 'hit', 'hit', 'golpear'],
          ['hurt', 'hurt', 'hurt', 'doler / lastimar'],
          ['let', 'let', 'let', 'dejar / permitir'],
          ['put', 'put', 'put', 'poner'],
          ['quit', 'quit', 'quit', 'renunciar / dejar de'],
          ['set', 'set', 'set', 'fijar / colocar'],
          ['shut', 'shut', 'shut', 'cerrar'],
        ],
      },
      {
        title: 'Amplía el grupo',
        hint: '',
        verbs: [
          ['burst', 'burst', 'burst', 'estallar'],
          ['cast', 'cast', 'cast', 'lanzar / repartir papeles'],
          ['shed', 'shed', 'shed', 'mudar / derramar'],
          ['split', 'split', 'split', 'dividir'],
          ['spread', 'spread', 'spread', 'extender / propagar'],
          ['upset', 'upset', 'upset', 'molestar'],
        ],
      },
    ],
    watch: {
      title: 'La excepción famosa: read',
      body: 'Se escribe igual (read – read – read) pero se pronuncia distinto: base /riːd/ (como “reed”), pasado y participio /red/ (como el color “red”).',
    },
    examples: ['I cut my finger yesterday, and I have cut it again this morning.', 'The trip cost $200 last year and it has always cost that much.'],
  },
  {
    n: 2,
    name: 'The “Twin” Group',
    code: 'ABB',
    color: 'var(--blue)',
    emoji: '👯',
    summary: 'El pasado y el participio son gemelos idénticos. Es el grupo más grande: apréndelo por familias de sonido.',
    trick: 'Si sabes el pasado, ya sabes el participio: una forma, dos trabajos.',
    families: [
      {
        title: 'Terminan en “t”',
        hint: 'Un final suave o una /d/ se vuelve /t/.',
        verbs: [
          ['send', 'sent', 'sent', 'enviar'],
          ['spend', 'spent', 'spent', 'gastar / pasar tiempo'],
          ['lend', 'lent', 'lent', 'prestar'],
          ['bend', 'bent', 'bent', 'doblar'],
          ['build', 'built', 'built', 'construir'],
          ['lose', 'lost', 'lost', 'perder'],
          ['leave', 'left', 'left', 'salir / dejar'],
          ['mean', 'meant', 'meant', 'significar'],
        ],
      },
      {
        title: 'La vocal se acorta (ee → e)',
        hint: 'Di “keep” y luego “kept”: la vocal se hace corta.',
        verbs: [
          ['keep', 'kept', 'kept', 'guardar / mantener'],
          ['sleep', 'slept', 'slept', 'dormir'],
          ['sweep', 'swept', 'swept', 'barrer'],
          ['feel', 'felt', 'felt', 'sentir'],
          ['meet', 'met', 'met', 'conocer / encontrarse'],
          ['feed', 'fed', 'fed', 'alimentar'],
          ['lead', 'led', 'led', 'liderar / guiar'],
        ],
      },
      {
        title: 'El sonido “ought / aught”',
        hint: 'Seis escrituras, un solo sonido /ɔːt/. La gh no suena.',
        verbs: [
          ['bring', 'brought', 'brought', 'traer'],
          ['buy', 'bought', 'bought', 'comprar'],
          ['fight', 'fought', 'fought', 'pelear'],
          ['think', 'thought', 'thought', 'pensar'],
          ['catch', 'caught', 'caught', 'atrapar'],
          ['teach', 'taught', 'taught', 'enseñar'],
          ['seek', 'sought', 'sought', 'buscar (formal)'],
        ],
      },
      {
        title: 'La familia “-old”',
        hint: 'La vocal se convierte en -old.',
        verbs: [
          ['sell', 'sold', 'sold', 'vender'],
          ['tell', 'told', 'told', 'decir / contar'],
        ],
      },
      {
        title: 'ay → aid (y hear → heard)',
        hint: 'Ojo al sonido: said /sed/, paid /peɪd/, laid /leɪd/, heard /hɜːd/.',
        verbs: [
          ['say', 'said', 'said', 'decir'],
          ['pay', 'paid', 'paid', 'pagar'],
          ['lay', 'laid', 'laid', 'poner (algo)'],
          ['hear', 'heard', 'heard', 'oír'],
        ],
      },
      {
        title: 'ind → ound',
        hint: 'Cambia -ind por -ound.',
        verbs: [
          ['find', 'found', 'found', 'encontrar'],
          ['bind', 'bound', 'bound', 'atar'],
          ['wind', 'wound', 'wound', 'enrollar / dar cuerda'],
          ['grind', 'ground', 'ground', 'moler'],
        ],
      },
      {
        title: 'Los más usados, sin familia',
        hint: 'No comparten sonido, pero los usarás todos los días.',
        verbs: [
          ['have', 'had', 'had', 'tener / haber'],
          ['hold', 'held', 'held', 'sostener'],
          ['make', 'made', 'made', 'hacer / fabricar'],
          ['get', 'got', 'got / gotten', 'obtener / conseguir'],
          ['sit', 'sat', 'sat', 'sentarse'],
          ['stand', 'stood', 'stood', 'estar de pie'],
          ['understand', 'understood', 'understood', 'entender'],
          ['win', 'won', 'won', 'ganar'],
          ['shine', 'shone', 'shone', 'brillar'],
        ],
      },
    ],
    watch: {
      title: 'get: británico vs americano',
      body: 'En británico el participio es got (ABB); en americano se prefiere gotten (ABC): I have gotten used to it. Ambos son correctos: elige uno y sé constante.',
    },
    examples: ['She bought the tickets, so we have bought everything already.', 'They told me the truth and I have told nobody else.'],
  },
  {
    n: 3,
    name: 'The “Boomerang” Group',
    code: 'ABA',
    color: 'var(--orange)',
    emoji: '🪃',
    summary: 'Cambian en pasado, pero el participio vuelve a la forma base, como un bumerán.',
    trick: 'Es el grupo más pequeño: come y run con sus compuestos. Apréndelos y dominas el grupo entero.',
    families: [
      {
        title: 'El grupo completo',
        hint: '',
        verbs: [
          ['come', 'came', 'come', 'venir'],
          ['become', 'became', 'become', 'convertirse en'],
          ['overcome', 'overcame', 'overcome', 'superar'],
          ['run', 'ran', 'run', 'correr'],
        ],
      },
    ],
    watch: {
      title: 'La trampa',
      body: 'Como base y participio son iguales, sale “I have came”. Repite en voz alta: I came yesterday ✓ · I have come today ✓ · I have came ✗.',
    },
    examples: ['He came at 8. → He has come early every day this week.', 'She ran a marathon. → She has run three marathons.'],
  },
  {
    n: 4,
    name: 'The “I – A – U” Group',
    code: 'ABC',
    color: 'var(--purple)',
    emoji: '🎵',
    summary: 'La vocal marcha en orden: i (base) → a (pasado) → u (participio).',
    trick: 'Canta las vocales i – a – u: todos siguen la misma melodía, así que puedes deducir las formas.',
    families: [
      {
        title: 'Los cinco clásicos',
        hint: '',
        verbs: [
          ['begin', 'began', 'begun', 'empezar'],
          ['drink', 'drank', 'drunk', 'beber'],
          ['ring', 'rang', 'rung', 'sonar / llamar'],
          ['sing', 'sang', 'sung', 'cantar'],
          ['swim', 'swam', 'swum', 'nadar'],
        ],
      },
      {
        title: 'Misma melodía, menos comunes',
        hint: '',
        verbs: [
          ['sink', 'sank', 'sunk', 'hundirse'],
          ['shrink', 'shrank', 'shrunk', 'encoger'],
          ['spring', 'sprang', 'sprung', 'brotar / saltar'],
          ['stink', 'stank', 'stunk', 'apestar'],
        ],
      },
    ],
    watch: {
      title: 'No todo verbo en -ing entra',
      body: 'bring → brought (grupo 2) y swing → swung / swung (ABB). La melodía i-a-u solo funciona cuando el pasado de verdad lleva a.',
    },
    examples: ['We began at 6 and we have begun the second unit.', 'He sang beautifully; he has sung in three countries.'],
  },
  {
    n: 5,
    name: 'The “N-Ending” Group',
    code: 'ABC',
    color: 'var(--pink)',
    emoji: '🔚',
    summary: 'Las tres formas son distintas, pero el participio siempre termina en -en o -n.',
    trick: 'Si oyes -en al final, delante va un auxiliar: have broken, was broken, is written. Ninguna forma en -en funciona sola como pasado.',
    families: [
      {
        title: 'La vocal pasa a “o”',
        hint: 'El pasado lleva o; el participio añade -en.',
        verbs: [
          ['break', 'broke', 'broken', 'romper'],
          ['choose', 'chose', 'chosen', 'elegir'],
          ['speak', 'spoke', 'spoken', 'hablar'],
          ['steal', 'stole', 'stolen', 'robar'],
          ['wake', 'woke', 'woken', 'despertar'],
          ['freeze', 'froze', 'frozen', 'congelar'],
        ],
      },
      {
        title: 'ew → own',
        hint: 'Pasado en -ew, participio en -own.',
        verbs: [
          ['blow', 'blew', 'blown', 'soplar'],
          ['fly', 'flew', 'flown', 'volar'],
          ['grow', 'grew', 'grown', 'crecer'],
          ['know', 'knew', 'known', 'saber / conocer'],
          ['throw', 'threw', 'thrown', 'lanzar'],
          ['draw', 'drew', 'drawn', 'dibujar'],
        ],
      },
      {
        title: 'i → o → i + en',
        hint: 'El participio vuelve a la i y añade -en (ojo: ridden, written con doble consonante).',
        verbs: [
          ['drive', 'drove', 'driven', 'conducir / manejar'],
          ['ride', 'rode', 'ridden', 'montar'],
          ['write', 'wrote', 'written', 'escribir'],
          ['rise', 'rose', 'risen', 'subir / levantarse'],
          ['hide', 'hid', 'hidden', 'esconder'],
          ['bite', 'bit', 'bitten', 'morder'],
        ],
      },
      {
        title: 'ake → ook → aken',
        hint: 'Familia pequeña, pero take es de los más usados.',
        verbs: [
          ['take', 'took', 'taken', 'tomar / llevar'],
          ['shake', 'shook', 'shaken', 'sacudir'],
          ['mistake', 'mistook', 'mistaken', 'confundir'],
        ],
      },
      {
        title: 'ear → ore → orn',
        hint: 'El sonido /eə/ pasa a /ɔː/ y añade -n.',
        verbs: [
          ['wear', 'wore', 'worn', 'llevar puesto'],
          ['tear', 'tore', 'torn', 'rasgar'],
          ['swear', 'swore', 'sworn', 'jurar'],
          ['bear', 'bore', 'borne', 'soportar'],
        ],
      },
      {
        title: 'Otros participios en -n',
        hint: 'Sin melodía común, pero todos cierran con -n.',
        verbs: [
          ['give', 'gave', 'given', 'dar'],
          ['forgive', 'forgave', 'forgiven', 'perdonar'],
          ['eat', 'ate', 'eaten', 'comer'],
          ['fall', 'fell', 'fallen', 'caer'],
          ['forget', 'forgot', 'forgotten', 'olvidar'],
          ['see', 'saw', 'seen', 'ver'],
        ],
      },
    ],
    examples: ['The window broke. → The window has been broken since Monday.', 'She wrote the email. → The email was written by her.'],
  },
  {
    n: 6,
    name: 'The “Total Rebels”',
    code: 'REBEL',
    color: 'var(--red)',
    emoji: '😈',
    summary: 'Los verbos más usados del inglés son también los más irregulares: el uso constante los protegió del cambio.',
    trick: 'Dales el mayor tiempo de práctica: aparecen en una de cada cinco frases que dirás.',
    families: [
      {
        title: 'Memoriza estos primero',
        hint: '',
        verbs: [
          ['be', 'was / were', 'been', 'ser / estar'],
          ['do', 'did', 'done', 'hacer'],
          ['go', 'went', 'gone', 'ir'],
        ],
      },
    ],
    watch: {
      title: 'gone vs been',
      body: 'He has gone to Bogotá = está allá, no ha vuelto. He has been to Bogotá = fue y ya regresó. Mismo verbo, dos participios, dos significados.',
    },
    examples: ['Went es la forma más extraña del inglés: venía del verbo “wend” y se usó para go.'],
  },
];

/** Pairs that cause more errors at B1–B2 than group 6. */
export const CONFUSING: [string, string, string, string, string][] = [
  ['lie', 'lay', 'lain', 'estar acostado', 'Sin objeto: I lie on the sofa.'],
  ['lay', 'laid', 'laid', 'poner algo', 'Con objeto: I lay the book down.'],
  ['lie', 'lied', 'lied', 'mentir', '¡Regular! Es otro verbo.'],
  ['rise', 'rose', 'risen', 'subir / levantarse', 'Sin objeto: The sun rises.'],
  ['raise', 'raised', 'raised', 'levantar algo', 'Regular y con objeto: Raise your hand.'],
  ['find', 'found', 'found', 'encontrar', 'Irregular.'],
  ['found', 'founded', 'founded', 'fundar', '¡Regular! They founded the school in 1990.'],
  ['hang', 'hung', 'hung', 'colgar (un objeto)', 'Cuadros, ropa, abrigos.'],
  ['fall', 'fell', 'fallen', 'caer', 'Irregular.'],
  ['fell', 'felled', 'felled', 'talar (un árbol)', 'Regular y poco común.'],
];

export const TRAPS: string[] = [
  'Regulares que parecen irregulares: visit, play, want, need, decide. Solo unos 200 verbos son irregulares y menos de 100 son frecuentes.',
  'Irregulares que parecen regulares: spread, cost, cast, hurt ya terminan en -t o -d. “He hurted his knee” ✗ → He hurt his knee ✓.',
  'Los compuestos heredan el patrón: understand → understood, overcome → overcame, forgive → forgave, rewrite → rewrote → rewritten.',
];

/** Sound families: the spelling stops mattering once you hear the group. */
export const SOUND_LAB: { family: string; verbs: string; note: string }[] = [
  { family: 'El sonido /ɔːt/', verbs: 'bought, brought, caught, fought, taught, thought, sought', note: 'Siete escrituras, un solo sonido. La gh es muda.' },
  { family: 'La e corta', verbs: 'kept, slept, felt, met, led, fed, said, read (pasado)', note: 'Contrasta en pares: meet – met, read – read.' },
  { family: 'Participios con /ʌ/', verbs: 'drunk, sung, swum, begun, rung, won, come, run', note: 'Vocal relajada y central: di “cup”, no “coop”.' },
  { family: 'Letras mudas', verbs: 'know /nəʊ/, write /raɪt/, build /bɪld/', note: 'La k, la w y la u no se pronuncian.' },
];

export const MINIMAL_PAIRS: [string, string[]][] = [
  ['Vocal larga vs corta', ['feel – felt', 'keep – kept', 'meet – met', 'read – read']],
  ['Pasado vs participio', ['sang – sung', 'drank – drunk', 'began – begun', 'rang – rung']],
  ['Base vs participio', ['come – come', 'run – run', 'become – become', 'eat – eaten']],
  ['Mismo sonido, escritura loca', ['bought', 'caught', 'thought', 'taught']],
];

/** Every verb of the method with its code, for the sorting game. */
export const CODED: { v: [string, string, string]; code: Code }[] = GROUPS.flatMap((g) =>
  g.families.flatMap((f) => f.verbs.map(([a, b, c]) => ({ v: [a, b, c] as [string, string, string], code: g.code === 'REBEL' ? ('REBEL' as const) : g.code }))),
);
