/**
 * Modal Verbs — every piece of content from the legacy "Modal Verbs Zone"
 * module (public/modules/modal-verbs-zone), typed and corrected.
 * Explanations are in Spanish (platform language); examples stay in English.
 */
import type { CefrLevel } from '@/content/types';

// ---------------------------------------------------------------- functions --

export type FunctionId =
  | 'ability'
  | 'permission'
  | 'requests'
  | 'suggestion'
  | 'advice'
  | 'obligation'
  | 'no-obligation'
  | 'prohibition'
  | 'possibility'
  | 'deduction'
  | 'habit'
  | 'criticism'
  | 'future';

export interface FunctionForm {
  /** What the learner sees, e.g. "mustn't", "don't have to". */
  m: string;
  /** Canonical modal used by the comparison matrix, e.g. "must", "have to". */
  k: string;
  note: string;
  e: string;
}

export interface ModalFunction {
  id: FunctionId;
  es: string;
  en: string;
  color: string;
  summary: string;
  level: CefrLevel;
  forms: FunctionForm[];
  tip?: string;
}

export const FUNCTIONS: ModalFunction[] = [
  {
    id: 'ability',
    es: 'Habilidad',
    en: 'Ability',
    color: 'var(--blue)',
    level: 'A1',
    summary: 'Lo que alguien sabe o es capaz de hacer.',
    forms: [
      { m: 'can', k: 'can', note: 'habilidad en el presente', e: 'She can speak three languages.' },
      { m: 'could', k: 'could', note: 'habilidad general en el pasado', e: 'I could swim when I was four.' },
      { m: 'be able to', k: 'be able to', note: 'formas que can no tiene; logro concreto en el pasado', e: 'He was able to fix it in ten minutes.' },
      { m: 'managed to', k: 'managed to', note: 'logro concreto, con esfuerzo', e: 'We managed to catch the last bus.' },
    ],
    tip: 'Un logro puntual del pasado no se dice con could: «was able to / managed to».',
  },
  {
    id: 'permission',
    es: 'Permiso',
    en: 'Permission',
    color: 'var(--green)',
    level: 'A1',
    summary: 'Pedir, dar o hablar de permiso.',
    forms: [
      { m: 'can', k: 'can', note: 'informal', e: 'Can I use your phone?' },
      { m: 'could', k: 'could', note: 'más cortés; también permiso en el pasado', e: 'Could I leave a bit early today?' },
      { m: 'may', k: 'may', note: 'formal', e: 'May I come in?' },
      { m: 'be allowed to', k: 'be allowed to', note: 'cualquier tiempo verbal', e: "We weren't allowed to use our phones." },
    ],
  },
  {
    id: 'requests',
    es: 'Peticiones y ofrecimientos',
    en: 'Requests & offers',
    color: 'var(--teal)',
    level: 'A1',
    summary: 'Pedir que alguien haga algo, u ofrecerte tú.',
    forms: [
      { m: 'can', k: 'can', note: 'petición u ofrecimiento informal', e: 'Can you help me with this box? · Can I get you a drink?' },
      { m: 'could', k: 'could', note: 'petición cortés', e: 'Could you open the window, please?' },
      { m: 'will', k: 'will', note: 'petición directa; promesa u ofrecimiento', e: "Will you close the door, please? · I'll help you move." },
      { m: 'would', k: 'would', note: 'muy cortés', e: 'Would you like some tea? · Would you mind waiting?' },
      { m: 'shall I…?', k: 'shall', note: 'ofrecerte a hacer algo', e: 'Shall I carry that for you?' },
    ],
  },
  {
    id: 'suggestion',
    es: 'Sugerencias',
    en: 'Suggestions',
    color: 'var(--mint)',
    level: 'A2',
    summary: 'Proponer un plan o una opción.',
    forms: [
      { m: 'shall we…?', k: 'shall', note: 'propuesta con we', e: 'Shall we dance?' },
      { m: 'could', k: 'could', note: 'una opción posible', e: 'We could take the night train.' },
      { m: 'might as well', k: 'might', note: 'no hay una opción mejor', e: "There's no bus. We might as well walk." },
    ],
  },
  {
    id: 'advice',
    es: 'Consejo',
    en: 'Advice',
    color: 'var(--purple)',
    level: 'A1',
    summary: 'Recomendar lo que es buena idea o lo correcto.',
    forms: [
      { m: 'should', k: 'should', note: 'consejo, lo correcto', e: 'You should see a doctor.' },
      { m: 'ought to', k: 'ought to', note: 'consejo o deber moral (algo más formal)', e: 'You ought to apologise to her.' },
      { m: 'had better', k: 'had better', note: 'consejo urgente, con una consecuencia implícita', e: "You'd better hurry or you'll miss the train." },
      { m: 'might want to', k: 'might', note: 'sugerencia muy suave', e: 'You might want to check the date.' },
      { m: 'must', k: 'must', note: 'recomendación entusiasta', e: 'You must see that film.' },
    ],
  },
  {
    id: 'obligation',
    es: 'Obligación',
    en: 'Obligation',
    color: 'var(--orange)',
    level: 'A2',
    summary: 'Algo necesario u obligatorio.',
    forms: [
      { m: 'must', k: 'must', note: 'la siente o impone el hablante; normas escritas', e: 'I must finish this tonight.' },
      { m: 'have to', k: 'have to', note: 'obligación externa; todos los tiempos', e: 'I have to wear a uniform at work.' },
      { m: 'have got to', k: 'have to', note: 'informal, solo presente', e: "I've got to go now." },
      { m: 'need to', k: 'need', note: 'necesidad', e: 'You need to renew your passport.' },
      { m: 'be supposed to', k: 'be supposed to', note: 'lo que se espera (y a menudo no se cumple)', e: 'You were supposed to be here at six.' },
    ],
    tip: 'Obligación en el pasado: «had to». «Must have + participio» es deducción, no obligación.',
  },
  {
    id: 'no-obligation',
    es: 'Falta de obligación',
    en: 'No obligation',
    color: 'var(--cyan)',
    level: 'A2',
    summary: 'No es necesario, pero tampoco está prohibido.',
    forms: [
      { m: "don't have to", k: 'have to', note: 'no es necesario', e: "You don't have to pay — it's free." },
      { m: "needn't", k: 'need', note: 'need modal (británico, algo formal)', e: "You needn't wait for me." },
      { m: "don't need to", k: 'need', note: 'need como verbo normal', e: "You don't need to bring anything." },
    ],
  },
  {
    id: 'prohibition',
    es: 'Prohibición',
    en: 'Prohibition',
    color: 'var(--red)',
    level: 'A2',
    summary: 'Algo que no está permitido.',
    forms: [
      { m: "mustn't", k: 'must', note: 'prohibición fuerte', e: "You mustn't touch those wires." },
      { m: "can't", k: 'can', note: 'no está permitido (muy común)', e: "You can't park here." },
      { m: 'may not', k: 'may', note: 'formal, en normas', e: 'Visitors may not take photographs.' },
      { m: "not be allowed to", k: 'be allowed to', note: 'cualquier tiempo verbal', e: "We aren't allowed to smoke here." },
    ],
    tip: "«Mustn't» ≠ «don't have to»: prohibido frente a opcional.",
  },
  {
    id: 'possibility',
    es: 'Posibilidad',
    en: 'Possibility',
    color: 'var(--indigo)',
    level: 'A2',
    summary: 'Algo que quizá pasa, pasará o pasó.',
    forms: [
      { m: 'may', k: 'may', note: 'es posible', e: 'It may snow tonight.' },
      { m: 'might', k: 'might', note: 'es posible (a menudo algo menos seguro)', e: "I might go — I'm not sure yet." },
      { m: 'could', k: 'could', note: 'es posible', e: 'It could rain later.' },
      { m: 'can', k: 'can', note: 'posibilidad general o teórica', e: 'Smoking can cause cancer.' },
    ],
    tip: 'Para una posibilidad concreta no se usa can: «It could / may rain later», no «It can rain later».',
  },
  {
    id: 'deduction',
    es: 'Deducción',
    en: 'Deduction',
    color: 'var(--pink)',
    level: 'B1',
    summary: 'Conclusiones lógicas a partir de evidencias.',
    forms: [
      { m: 'must', k: 'must', note: 'casi seguro que sí', e: "You've been travelling all day — you must be exhausted." },
      { m: 'will', k: 'will', note: 'suposición segura', e: "That'll be the postman." },
      { m: 'should / ought to', k: 'should', note: 'expectativa lógica', e: 'They left at six, so they should be here by now.' },
      { m: 'may / might / could', k: 'might', note: 'quizás', e: 'She might be at the gym.' },
      { m: "can't / couldn't", k: 'can', note: 'casi seguro que no', e: "That can't be Tom — he's in Peru." },
      { m: 'must / can\'t / might have + pp', k: 'must', note: 'deducciones sobre el pasado', e: "He must have left. · She can't have known." },
    ],
  },
  {
    id: 'habit',
    es: 'Hábitos',
    en: 'Habits',
    color: '#a2845e',
    level: 'A2',
    summary: 'Costumbres pasadas (y algunos hábitos presentes).',
    forms: [
      { m: 'used to', k: 'used to', note: 'hábitos y estados pasados que ya no son así', e: 'There used to be a cinema on this corner.' },
      { m: 'would', k: 'would', note: 'solo acciones repetidas en el pasado', e: 'Every summer we would drive to the coast.' },
      { m: 'will', k: 'will', note: 'hábito característico o molesto en el presente', e: "He'll sit there for hours saying nothing." },
    ],
  },
  {
    id: 'criticism',
    es: 'Crítica y arrepentimiento',
    en: 'Criticism & regret',
    color: '#c27c0e',
    level: 'A2',
    summary: 'Juzgar algo que ya pasó (modal + have + participio).',
    forms: [
      { m: 'should have', k: 'should', note: 'era lo correcto, pero no se hizo', e: 'You should have called.' },
      { m: 'ought to have', k: 'ought to', note: 'igual que should have, más formal', e: 'You ought to have known better.' },
      { m: 'could have', k: 'could', note: 'reproche: podías haberlo hecho', e: 'You could have told me!' },
      { m: 'might have', k: 'might', note: 'reproche (con entonación de queja)', e: 'You might have warned me!' },
      { m: "needn't have", k: 'need', note: 'se hizo, pero no hacía falta', e: "You needn't have cooked — we've already eaten." },
    ],
  },
  {
    id: 'future',
    es: 'Futuro e hipótesis',
    en: 'Future & hypothesis',
    color: 'var(--blue)',
    level: 'A2',
    summary: 'Predicciones, decisiones y situaciones imaginarias.',
    forms: [
      { m: 'will', k: 'will', note: 'predicción; decisión en el momento', e: "It will rain tomorrow. · I'll get it!" },
      { m: 'would', k: 'would', note: 'resultado hipotético; futuro en el pasado', e: 'I would travel more if I had the money.' },
      { m: 'shall', k: 'shall', note: 'futuro formal con I / we (británico, anticuado)', e: 'I shall return.' },
    ],
  },
];

export const FUNCTION_BY_ID = Object.fromEntries(FUNCTIONS.map((f) => [f.id, f])) as Record<FunctionId, ModalFunction>;

// ------------------------------------------------------------------ modals --

export type ModalGroup = 'core' | 'marginal';

export interface ModalUse {
  fn?: FunctionId;
  u: string;
  e: string;
}

export interface ModalVerb {
  id: string;
  w: string;
  group: ModalGroup;
  tag: string;
  level: CefrLevel;
  neg: string;
  past: string;
  uses: ModalUse[];
  warn: string;
}

export const CORE: ModalVerb[] = [
  {
    id: 'can',
    w: 'can',
    group: 'core',
    tag: 'Core modal',
    level: 'A1',
    neg: "can't / cannot (en una sola palabra)",
    past: 'could (habilidad general) · was/were able to (un logro concreto)',
    uses: [
      { fn: 'ability', u: 'Habilidad', e: 'She can speak three languages.' },
      { fn: 'permission', u: 'Permiso informal', e: 'Can I borrow your pen?' },
      { fn: 'requests', u: 'Petición', e: 'Can you help me with this box?' },
      { fn: 'requests', u: 'Ofrecimiento', e: 'Can I get you a drink?' },
      { fn: 'possibility', u: 'Posibilidad general o teórica', e: 'Smoking can cause cancer.' },
      { fn: 'deduction', u: "Imposibilidad / incredulidad (can't)", e: "That can't be Tom — he's in Peru." },
      { fn: 'prohibition', u: "Prohibición (can't)", e: "You can't park here." },
    ],
    warn: 'CAN no tiene infinitivo, ni forma -ing, ni participio. Esas formas las pone BE ABLE TO: «I want to be able to drive.» ✗ «I want to can drive.» ✗ «I have could…»',
  },
  {
    id: 'could',
    w: 'could',
    group: 'core',
    tag: 'Core modal',
    level: 'A1',
    neg: "couldn't / could not",
    past: 'could have + participio',
    uses: [
      { fn: 'ability', u: 'Habilidad general en el pasado', e: 'I could swim when I was four.' },
      { fn: 'requests', u: 'Petición cortés', e: 'Could you open the window, please?' },
      { fn: 'possibility', u: 'Posibilidad presente o futura', e: 'It could rain later.' },
      { fn: 'suggestion', u: 'Sugerencia', e: 'We could take the night train.' },
      { fn: 'permission', u: 'Permiso en el pasado', e: 'We could stay up late at weekends.' },
      { fn: 'criticism', u: 'Reproche (could have + participio)', e: 'You could have told me!' },
      { fn: 'possibility', u: 'Posibilidad pasada que no ocurrió (could have)', e: "We could have won if we'd trained harder." },
    ],
    warn: "Para UNA acción concreta que salió bien en el pasado, COULD no sirve: usa WAS/WERE ABLE TO o MANAGED TO. «The door was stuck, but he was able to open it.» ✗ «…but he could open it.» En negativa sí vale («he couldn't open it»), y también con verbos de percepción: «I could see the smoke».",
  },
  {
    id: 'may',
    w: 'may',
    group: 'core',
    tag: 'Core modal',
    level: 'A2',
    neg: 'may not (sin contracción en el inglés actual)',
    past: 'may have + participio (posibilidad pasada)',
    uses: [
      { fn: 'permission', u: 'Permiso formal', e: 'You may leave when you have finished.' },
      { fn: 'permission', u: 'Pedir permiso formalmente', e: 'May I come in?' },
      { fn: 'possibility', u: 'Posibilidad', e: 'It may snow tonight.' },
      { u: 'Concesión (puede que… pero)', e: "He may be rich, but he isn't happy." },
      { u: 'Deseos formales', e: 'May you both be very happy.' },
      { fn: 'prohibition', u: 'Prohibición formal (may not)', e: 'Visitors may not take photographs.' },
    ],
    warn: '«Mayn\'t» ya no se usa. Ojo con la ambigüedad de MAY NOT: «You may not enter» (prohibición) frente a «She may not come» (posibilidad). Solo el contexto las distingue. Y para el permiso en el pasado no se usa may: «We were allowed to / could stay up late».',
  },
  {
    id: 'might',
    w: 'might',
    group: 'core',
    tag: 'Core modal',
    level: 'A2',
    neg: "might not / mightn't (británico, poco común)",
    past: 'might have + participio',
    uses: [
      { fn: 'possibility', u: 'Posibilidad (a menudo algo menos segura que may)', e: "I might go — I'm really not sure." },
      { u: 'Pasado de MAY en estilo indirecto', e: 'He said he might be late.' },
      { fn: 'advice', u: 'Sugerencia muy suave', e: 'You might want to check the date.' },
      { fn: 'criticism', u: 'Reproche (might have + participio)', e: 'You might have warned me!' },
      { fn: 'suggestion', u: 'MIGHT AS WELL — no hay mejor opción', e: "There's no bus. We might as well walk." },
      { fn: 'possibility', u: 'Posibilidad pasada (might have + participio)', e: 'She might have missed the train.' },
    ],
    warn: 'MIGHT HAVE + participio tiene dos lecturas: posibilidad pasada («She might have missed the train») y crítica («You might have helped!»). Las separan el contexto y la entonación. «Might I…?» para pedir permiso es muy formal y raro: usa could o may.',
  },
  {
    id: 'must',
    w: 'must',
    group: 'core',
    tag: 'Core modal',
    level: 'A2',
    neg: "mustn't / must not (= prohibido)",
    past: 'had to (obligación) · must have + participio (deducción)',
    uses: [
      { fn: 'obligation', u: 'Obligación fuerte (la siente o impone el hablante)', e: 'I must finish this tonight.' },
      { fn: 'deduction', u: 'Deducción lógica: casi seguro que sí', e: "You've been travelling all day — you must be exhausted." },
      { fn: 'advice', u: 'Recomendación entusiasta', e: 'You must see that film.' },
      { fn: 'prohibition', u: "Prohibición (mustn't)", e: "You mustn't touch those wires." },
      { fn: 'obligation', u: 'Normas escritas y avisos', e: 'Passengers must not lean out of the window.' },
      { fn: 'deduction', u: 'Deducción sobre el pasado (must have + participio)', e: "He must have left already — his coat's gone." },
    ],
    warn: "Tres trampas. 1) MUST no tiene pasado de obligación: usa HAD TO («I had to work late»); «must have worked» es deducción. 2) MUSTN'T no es DON'T HAVE TO: «You mustn't tell her» = está prohibido; «You don't have to tell her» = no es necesario. 3) La deducción negativa se hace con CAN'T: «She can't be home», «She can't have known». En inglés americano también se oye «must not have» sin contraer («He must not have heard me»), pero can't have es la opción segura.",
  },
  {
    id: 'shall',
    w: 'shall',
    group: 'core',
    tag: 'Core modal · en peligro',
    level: 'A2',
    neg: "shall not / shan't (británico y poco común)",
    past: 'should (en estilo indirecto: «I asked if I should help»)',
    uses: [
      { fn: 'requests', u: 'Ofrecimientos con I / we', e: 'Shall I carry that for you?' },
      { fn: 'suggestion', u: 'Propuestas con we', e: 'Shall we dance?' },
      { fn: 'future', u: 'Futuro formal con I / we (británico, anticuado)', e: 'I shall return.' },
      { fn: 'obligation', u: 'Obligación legal o contractual', e: 'The tenant shall pay the rent on the first of each month.' },
      { u: 'Promesa o amenaza enfática (literario)', e: 'You shall have your money on Friday.' },
    ],
    warn: 'Fuera de las preguntas con I y WE, SHALL casi ha desaparecido del habla y es muy raro en inglés americano: se usa WILL, o SHOULD en las preguntas («Should I open the window?»). Sobrevive en los textos legales, donde marca un deber vinculante.',
  },
  {
    id: 'should',
    w: 'should',
    group: 'core',
    tag: 'Core modal',
    level: 'A1',
    neg: "shouldn't / should not",
    past: 'should have + participio',
    uses: [
      { fn: 'advice', u: 'Consejo y recomendación', e: 'You should see a doctor.' },
      { fn: 'advice', u: 'Obligación débil: lo correcto', e: 'You should wear a seatbelt.' },
      { fn: 'deduction', u: 'Expectativa lógica', e: 'They left at six, so they should be here by now.' },
      { fn: 'criticism', u: 'Crítica o arrepentimiento (should have + participio)', e: 'You should have called.' },
      { u: 'Condicional formal con inversión', e: 'Should you need help, call reception.' },
      { u: 'SHOULD «putativo» tras emociones (británico)', e: "It's odd that he should say that." },
      { u: 'En cláusulas con that tras suggest / insist / demand (en EE. UU.: «that he apologize»)', e: 'They insisted that he should apologise.' },
    ],
    warn: 'SHOULD HAVE + participio como consejo o crítica indica que NO pasó: «You should have called» = no llamaste. Pero con sentido de expectativa no sabemos si pasó: «The parcel should have arrived by now» = lo lógico es que ya haya llegado. No lo uses para criticar algo que sí se hizo.',
  },
  {
    id: 'will',
    w: 'will',
    group: 'core',
    tag: 'Core modal',
    level: 'A1',
    neg: "won't / will not",
    past: "would (futuro en el pasado, hábitos y negativas: «it wouldn't start»)",
    uses: [
      { fn: 'future', u: 'Predicción', e: 'It will rain tomorrow.' },
      { fn: 'future', u: 'Decisión espontánea, tomada ahora', e: "I'll get it!" },
      { fn: 'requests', u: 'Promesa u ofrecimiento', e: "I'll help you move." },
      { u: "Voluntad, y negativa a hacer algo (won't)", e: "The car won't start." },
      { fn: 'habit', u: 'Hábito característico o molesto', e: "He'll sit there for hours saying nothing." },
      { fn: 'requests', u: 'Petición directa', e: 'Will you close the door, please?' },
      { fn: 'deduction', u: 'Suposición sobre el presente', e: "That'll be the postman." },
    ],
    warn: "No pongas WILL en oraciones de tiempo con when, as soon as, before, after, until o while: ✓ «When he arrives, we'll eat.» ✗ «When he will arrive…». Pero si when introduce una pregunta o una oración sustantiva, will es correcto: «I don't know when he will arrive.»",
  },
  {
    id: 'would',
    w: 'would',
    group: 'core',
    tag: 'Core modal',
    level: 'A1',
    neg: "wouldn't / would not",
    past: 'would have + participio (hipótesis sobre el pasado)',
    uses: [
      { fn: 'requests', u: 'Ofrecimiento o petición cortés', e: 'Would you like some tea?' },
      { fn: 'future', u: 'Resultado hipotético', e: 'I would travel more if I had the money.' },
      { fn: 'habit', u: 'Acción repetida en el pasado', e: 'Every summer we would drive to the coast.' },
      { fn: 'future', u: 'Futuro en el pasado (estilo indirecto)', e: 'She said she would call.' },
      { u: 'Preferencia (would rather / would prefer)', e: "I'd rather stay in tonight." },
      { u: "Negativa en el pasado (wouldn't)", e: "He wouldn't listen to anyone." },
      { u: 'Suavizar una opinión', e: "I would say it's too expensive." },
    ],
    warn: 'WOULD para hábitos pasados solo funciona con acciones, no con estados: ✗ «We would have a dog.» ✓ «We used to have a dog.» USED TO cubre los dos; WOULD no. Además necesita un marco temporal claro (every summer, when I was a child…).',
  },
];

export const MARGINAL: ModalVerb[] = [
  {
    id: 'ought',
    w: 'ought to',
    group: 'marginal',
    tag: 'Modal marginal',
    level: 'B1',
    neg: "ought not to / oughtn't to (poco común)",
    past: 'ought to have + participio',
    uses: [
      { fn: 'advice', u: 'Consejo y deber moral', e: 'You ought to apologise to her.' },
      { fn: 'deduction', u: 'Expectativa', e: 'That ought to be enough for six people.' },
      { fn: 'criticism', u: 'Arrepentimiento sobre el pasado', e: 'You ought to have known better.' },
    ],
    warn: 'OUGHT TO es, junto con USED TO, uno de los dos modales marginales que llevan TO delante del verbo (los nueve modales centrales nunca lo llevan). Sus preguntas y negativas suenan rígidas, así que casi todo el mundo usa SHOULD: «Should I apologise?» mejor que «Ought I to apologise?».',
  },
  {
    id: 'need',
    w: 'need',
    group: 'marginal',
    tag: 'Híbrido: modal + verbo normal',
    level: 'B1',
    neg: "needn't (modal) / don't need to (verbo)",
    past: "needn't have + participio · didn't need to",
    uses: [
      { fn: 'no-obligation', u: 'NEED modal: solo en negativas y preguntas, infinitivo sin to, sin -s', e: "You needn't worry. · Need I say more?" },
      { fn: 'obligation', u: 'NEED verbo normal: con do y con to', e: "You don't need to worry. · Does she need to sign?" },
      { fn: 'criticism', u: "NEEDN'T HAVE + participio: se hizo, pero no hacía falta", e: "You needn't have cooked — we've already eaten." },
      { fn: 'no-obligation', u: "DIDN'T NEED TO: no era necesario (normalmente no se hizo)", e: "I didn't need to buy milk, so I went straight home." },
    ],
    warn: "Las dos formas de pasado no son intercambiables. «She needn't have paid» = pagó, y no hacía falta. «She didn't need to pay» = no era necesario; por sí sola no dice si pagó, aunque suele entenderse que no. El need modal es sobre todo británico y formal; en el día a día se usa don't need to.",
  },
  {
    id: 'dare',
    w: 'dare',
    group: 'marginal',
    tag: 'Híbrido: modal + verbo normal',
    level: 'B2',
    neg: "daren't (modal, británico) / doesn't dare (to) (verbo)",
    past: 'dared (verbo) · dared not (modal, formal)',
    uses: [
      { u: 'DARE modal: negativas y preguntas, infinitivo sin to', e: "He daren't tell her the truth. · Dare I ask?" },
      { u: 'DARE verbo normal: con do y con to', e: "He doesn't dare to tell her." },
      { u: 'Expresiones fijas', e: "How dare you! · I daresay you're right." },
    ],
    warn: 'El dare modal está casi congelado en frases hechas. En frases normales se usa el verbo, y detrás de DARE el TO a menudo se omite: «He didn\'t dare (to) look.» How dare + sujeto nunca lleva do ni -s: «How dare he!»',
  },
  {
    id: 'usedto',
    w: 'used to',
    group: 'marginal',
    tag: 'Modal marginal · solo pasado',
    level: 'A2',
    neg: "didn't use to / used not to (formal)",
    past: '— ya es pasado',
    uses: [
      { fn: 'habit', u: 'Hábito pasado que ya terminó', e: 'I used to smoke twenty a day.' },
      { fn: 'habit', u: 'Estado pasado que ya no es cierto', e: 'There used to be a cinema on this corner.' },
      { u: 'Negativa y pregunta (con did, y use sin -d)', e: "I didn't use to like olives. · Did you use to live abroad?" },
    ],
    warn: 'No confundas USED TO + infinitivo (hábito pasado terminado) con BE USED TO + -ing (= estar acostumbrado): «I\'m used to getting up early.» GET USED TO + -ing es el proceso de acostumbrarse. USED TO no tiene presente: para hábitos actuales usa el presente simple o usually.',
  },
];

export const ALL_MODALS = [...CORE, ...MARGINAL];

// ------------------------------------------------------------- semi-modals --

export interface SemiModal {
  id: string;
  n: string;
  u: string;
  e: string;
  fn?: FunctionId;
}

export const SEMIS: SemiModal[] = [
  { id: 'have-to', n: 'have to / have got to', fn: 'obligation', u: 'Obligación externa (normas, circunstancias) y todas las formas que MUST no tiene. Have got to es informal, sobre todo británico, y solo existe en presente.', e: "I have to wear a uniform. · I'll have to leave early. · I've got to go." },
  { id: 'had-better', n: "had better ('d better)", fn: 'advice', u: "Consejo urgente con una consecuencia implícita. Infinitivo sin to; negativa: 'd better not. Aunque lleva had, habla del presente o del futuro.", e: "You'd better take an umbrella. · You'd better not be late." },
  { id: 'be-able-to', n: 'be able to', fn: 'ability', u: 'Aporta el infinitivo, el participio y los tiempos perfectos que CAN no puede formar, y expresa un logro concreto en el pasado.', e: "I'd like to be able to ski. · She has been able to drive since May." },
  { id: 'going-to', n: 'be going to', fn: 'future', u: 'Un plan ya decidido, o una predicción basada en evidencias presentes.', e: "Look at those clouds — it's going to pour." },
  { id: 'would-rather', n: 'would rather / would sooner', u: 'Preferencia. Infinitivo sin to si hablas de ti; pasado si hablas de otra persona.', e: "I'd rather walk. · I'd rather you didn't smoke in here." },
  { id: 'supposed-to', n: 'be supposed to', fn: 'obligation', u: 'Un deber o una expectativa; muy a menudo, algo que no se cumplió.', e: 'You were supposed to be here at six.' },
  { id: 'be-to', n: 'be to', u: 'Planes oficiales, órdenes formales y titulares de noticias.', e: 'The President is to visit Rome. · You are to report at nine sharp.' },
  { id: 'allowed-to', n: 'be allowed to / be permitted to', fn: 'permission', u: 'Permiso en los tiempos que CAN y MAY no pueden formar.', e: "We weren't allowed to leave the building. · Will we be allowed to vote?" },
  { id: 'as-well', n: 'may / might as well', fn: 'suggestion', u: 'No hay una alternativa mejor, así que hagámoslo.', e: 'Nobody else is coming. We might as well start.' },
  { id: 'modal-perfect', n: 'modal + have + participio', fn: 'criticism', u: 'El «pasado» de casi todos los modales: deducción, especulación y arrepentimiento sobre algo terminado. No sirve para la obligación pasada (must have ≠ had to), y can have solo aparece en negativas y preguntas.', e: "He must have left. · She can't have known. · I should have asked." },
];

// ------------------------------------------------------------------- rules --

export interface ModalRule {
  t: string;
  ok: string;
  no: string;
  note?: string;
}

export const RULES: ModalRule[] = [
  { t: 'Sin -s en la tercera persona del singular.', ok: 'She can drive.', no: 'She cans drive.' },
  { t: 'Detrás del modal va el infinitivo sin TO.', ok: 'He must go now.', no: 'He must to go now.', note: 'Llevan TO: ought to y used to, y las expresiones semimodales (have to, be able to, be going to, be supposed to, be to, be allowed to).' },
  { t: 'Los modales no tienen infinitivo, ni forma -ing, ni participio.', ok: 'I hope to be able to come.', no: 'I hope to can come.' },
  { t: 'Preguntas con inversión y negativas con NOT, sin DO.', ok: 'Can you swim?', no: 'Do you can swim?', note: 'Excepciones: NEED y DARE como verbos normales sí llevan do («Do I need to sign?»), y USED TO también («Did you use to…?»).' },
  { t: 'Solo un modal por grupo verbal.', ok: 'She will be able to drive.', no: 'She will can drive.', note: 'Los dobles modales como «might could» existen en dialectos del sur de EE. UU. y de Escocia, pero no en el inglés estándar.' },
  { t: 'Para deducir, especular o lamentar algo pasado: modal + HAVE + participio.', ok: 'He must have left.', no: 'He musted leave.', note: 'No sirve para la obligación pasada: «I had to leave» (no «I must have left», que significa «seguro que me fui»). La habilidad general en el pasado es could: «I could read at four».' },
  { t: "MUSTN'T es prohibición; DON'T HAVE TO es ausencia de obligación.", ok: "You mustn't park here. / You don't have to pay.", no: "You mustn't pay.", note: "«You mustn't pay» significaría que pagar está prohibido. Si es opcional: «You don't have to pay»." },
  { t: "La deducción negativa se hace con CAN'T (HAVE), no con MUSTN'T (HAVE).", ok: "She can't have seen us.", no: "She mustn't have seen us.", note: 'En inglés americano se oye «she must not have seen us» (sin contraer); en exámenes y en inglés británico, usa can\'t have.' },
  { t: 'Una acción concreta del pasado que salió bien: WAS ABLE TO / MANAGED TO, no COULD.', ok: 'He was able to escape through the window.', no: 'He could escape through the window.', note: "COULD sí vale en negativa («he couldn't escape») y con verbos de percepción y pensamiento: «I could see the smoke from here»." },
  { t: 'Los modales no se conjugan: una sola forma para todas las personas.', ok: 'I / you / he / we / they should go.', no: 'He shoulds go.' },
];

// ------------------------------------------------------------- bonus stage --

export interface BonusQuestion {
  hint: string;
  text: string;
  /** The correct answer is always first; the UI shuffles. */
  o: [string, string, string];
  why: string;
  fn: FunctionId | 'form';
  level: CefrLevel;
}

export const BONUS: BonusQuestion[] = [
  { hint: 'Deducción', fn: 'deduction', level: 'B1', text: 'She has been running for an hour. She ___ be exhausted.', o: ['must', 'can', 'need'], why: 'MUST expresa una deducción casi segura a partir de evidencias. CAN no se usa para deducir en afirmativa (solo can\'t, en negativa) y NEED no expresa certeza.' },
  { hint: 'Ofrecimientos', fn: 'requests', level: 'A2', text: '___ I carry that bag for you?', o: ['Shall', 'Will', 'Would'], why: 'SHALL + I / we es la forma clásica de ofrecerse a hacer algo («Can I…?» también valdría). «Will I…?» pregunta por el futuro y «Would I…?» no es un ofrecimiento.' },
  { hint: 'Habilidad pasada', fn: 'ability', level: 'A2', text: 'When I was a child I ___ climb any tree in the village.', o: ['could', 'can', 'was able'], why: 'COULD expresa una habilidad general durante un periodo del pasado. «Was able» sin to es incorrecto («was able to» también valdría).' },
  { hint: 'La trampa de could', fn: 'ability', level: 'B1', text: 'The fire spread fast, but everyone ___ get out in time.', o: ['was able to', 'could', 'might'], why: 'Para una acción concreta que salió bien en el pasado se usa WAS/WERE ABLE TO o MANAGED TO, no COULD. En negativa sí valdría: «nobody could get out».' },
  { hint: 'Sin obligación', fn: 'no-obligation', level: 'A2', text: 'You ___ pay today — the bill is due at the end of the month.', o: ["don't have to", "mustn't", "can't"], why: "DON'T HAVE TO significa que no es necesario. MUSTN'T y CAN'T querrían decir que pagar está prohibido." },
  { hint: 'Reproche', fn: 'criticism', level: 'B1', text: 'You ___ told me you were coming! I would have cooked.', o: ['could have', 'must have', 'can have'], why: 'COULD HAVE + participio reprocha algo que el otro no hizo («might have» también valdría). MUST HAVE sería una deducción y CAN HAVE no se usa en afirmativa.' },
  { hint: 'Deber moral', fn: 'advice', level: 'B1', text: 'He broke the vase, so he ___ apologise.', o: ['ought to', 'ought', 'must to'], why: 'OUGHT siempre lleva TO (como used to). MUST nunca lo lleva: «he must apologise».' },
  { hint: 'Need modal', fn: 'no-obligation', level: 'B1', text: 'You ___ worry about the tickets — I booked them yesterday.', o: ["needn't", "don't need", "needn't to"], why: "El need modal va con infinitivo sin to y aparece en negativas: «needn't worry». Con el verbo normal sería «don't need to worry» (con to)." },
  { hint: 'Hábito pasado', fn: 'habit', level: 'B1', text: 'Every Sunday my grandfather ___ take us down to the beach.', o: ['would', 'used', 'will'], why: 'WOULD describe acciones repetidas en el pasado con un marco temporal claro (every Sunday). USED TO también valdría, pero «used» sin to no.' },
  { hint: 'Estado pasado', fn: 'habit', level: 'B1', text: 'I ___ live in London, but I moved to Madrid in 2019.', o: ['used to', 'would', 'was used to'], why: 'Live aquí es un estado, no una acción repetida, así que solo vale USED TO. WOULD solo funciona con acciones, y BE USED TO + -ing significa «estar acostumbrado».' },
  { hint: 'Condicional formal', fn: 'form', level: 'B2', text: '___ you need any assistance, please call this number.', o: ['Should', 'Would', 'Might'], why: 'SHOULD con inversión sustituye a «If you need…» en textos formales.' },
  { hint: 'Un solo modal', fn: 'form', level: 'A2', text: 'By 2030, machines ___ do most of this work.', o: ['will be able to', 'will can', 'can will'], why: 'El inglés estándar solo admite un modal por grupo verbal, así que CAN toma prestado BE ABLE TO para el futuro.' },
  { hint: 'Prohibición', fn: 'prohibition', level: 'A2', text: "You ___ touch that cable — it's live.", o: ["mustn't", "don't have to", "needn't"], why: "MUSTN'T prohíbe. Las otras dos opciones solo dicen que no es necesario." },
  { hint: 'Expresión fija', fn: 'form', level: 'B2', text: 'How ___ you speak to your mother like that!', o: ['dare', 'do dare', 'daring'], why: '«How dare you» es un uso congelado del dare modal: sin do, sin -s y sin to.' },
];

// ------------------------------------------------------------ trap spotter --

export interface Trap {
  s: string;
  ok: boolean;
  fix?: string;
  why: string;
}

export const TRAPS: Trap[] = [
  { s: 'She cans drive.', ok: false, fix: 'She can drive.', why: 'Los modales no llevan -s en tercera persona.' },
  { s: 'He must to go now.', ok: false, fix: 'He must go now.', why: 'Detrás de un modal va el infinitivo sin to.' },
  { s: 'I hope to can come.', ok: false, fix: 'I hope to be able to come.', why: 'Can no tiene infinitivo: usa be able to.' },
  { s: 'Do you can swim?', ok: false, fix: 'Can you swim?', why: 'Los modales hacen la pregunta con inversión, sin do.' },
  { s: 'She will can drive next year.', ok: false, fix: 'She will be able to drive next year.', why: 'Solo un modal por grupo verbal.' },
  { s: 'He musted leave early.', ok: false, fix: 'He had to leave early.', why: 'Must no tiene pasado: la obligación pasada es had to.' },
  { s: "You mustn't pay — entry is free.", ok: false, fix: "You don't have to pay — entry is free.", why: "Mustn't prohíbe; para «no es necesario» se usa don't have to." },
  { s: "She mustn't have seen us.", ok: false, fix: "She can't have seen us.", why: "La deducción negativa sobre el pasado es can't have." },
  { s: 'The door was stuck, but he could open it.', ok: false, fix: 'The door was stuck, but he was able to open it.', why: 'Un logro concreto en el pasado: was able to / managed to.' },
  { s: "When he will arrive, we'll eat.", ok: false, fix: "When he arrives, we'll eat.", why: 'En las oraciones de tiempo con when se usa el presente, no will.' },
  { s: 'We would have a dog when I was a kid.', ok: false, fix: 'We used to have a dog when I was a kid.', why: 'Would de hábito no funciona con estados (have = tener).' },
  { s: 'You ought apologise.', ok: false, fix: 'You ought to apologise.', why: 'Ought siempre lleva to.' },
  { s: "You needn't to worry.", ok: false, fix: "You needn't worry.", why: 'El need modal va con infinitivo sin to.' },
  { s: "I'm used to get up early.", ok: false, fix: "I'm used to getting up early.", why: 'Be used to (= estar acostumbrado) va seguido de -ing.' },
  { s: 'It can rain later, so take a coat.', ok: false, fix: 'It could / may rain later, so take a coat.', why: 'Para una posibilidad concreta se usa could, may o might; can es posibilidad general.' },
  { s: 'I could see the smoke from my window.', ok: true, why: 'Con verbos de percepción, could es correcto incluso para un momento concreto.' },
  { s: "He couldn't open the door.", ok: true, why: 'En negativa, could vale también para una ocasión concreta.' },
  { s: "You don't have to come if you don't want to.", ok: true, why: "Don't have to = no es necesario. Perfecto." },
  { s: "You'd better not be late.", ok: true, why: "La negativa de had better es 'd better not + infinitivo sin to." },
  { s: 'Did you use to live abroad?', ok: true, why: 'Used to hace la pregunta con did, y use pierde la -d.' },
  { s: "I don't know when he will arrive.", ok: true, why: 'Aquí when introduce una oración sustantiva, no de tiempo: will es correcto.' },
  { s: 'Need I say more?', ok: true, why: 'Need modal en una pregunta: inversión y sin to.' },
  { s: 'Should you need help, call reception.', ok: true, why: 'Should con inversión = If you need help (formal).' },
  { s: 'How dare he speak to me like that!', ok: true, why: 'How dare + sujeto + infinitivo sin to, sin -s.' },
  { s: "You needn't have cooked — we've already eaten.", ok: true, why: "Needn't have + participio: lo hiciste, pero no hacía falta." },
  { s: "She can't be at home — her car's gone.", ok: true, why: "Can't = deducción negativa sobre el presente." },
  { s: 'You were supposed to be here at six.', ok: true, why: 'Be supposed to: algo esperado que no se cumplió.' },
  { s: "We weren't allowed to leave the building.", ok: true, why: 'Be allowed to da el permiso en pasado.' },
];

// ------------------------------------------------------------ function quiz --

export interface FunctionQuizItem {
  s: string;
  answer: FunctionId;
  distractors: [FunctionId, FunctionId, FunctionId];
  why: string;
}

export const FUNCTION_QUIZ: FunctionQuizItem[] = [
  { s: "You mustn't feed the animals.", answer: 'prohibition', distractors: ['obligation', 'no-obligation', 'advice'], why: "Mustn't = está prohibido." },
  { s: "She can't be forty — she looks twenty-five!", answer: 'deduction', distractors: ['prohibition', 'ability', 'possibility'], why: "Can't aquí es una deducción: «es imposible que tenga cuarenta»." },
  { s: 'Could you pass the salt, please?', answer: 'requests', distractors: ['ability', 'possibility', 'permission'], why: 'Could you…? es una petición cortés.' },
  { s: 'I could read when I was three.', answer: 'ability', distractors: ['possibility', 'permission', 'requests'], why: 'Could = habilidad general en el pasado.' },
  { s: 'It might snow tonight.', answer: 'possibility', distractors: ['deduction', 'future', 'advice'], why: 'Might = es posible.' },
  { s: 'You should try the paella.', answer: 'advice', distractors: ['obligation', 'suggestion', 'deduction'], why: 'Should = consejo o recomendación.' },
  { s: "You don't have to wear a tie.", answer: 'no-obligation', distractors: ['prohibition', 'permission', 'advice'], why: "Don't have to = no es necesario (pero puedes)." },
  { s: 'Shall we go for a walk?', answer: 'suggestion', distractors: ['future', 'requests', 'obligation'], why: 'Shall we…? propone un plan.' },
  { s: 'May I sit here?', answer: 'permission', distractors: ['possibility', 'requests', 'suggestion'], why: 'May I…? pide permiso de forma formal.' },
  { s: 'He must have forgotten our meeting.', answer: 'deduction', distractors: ['obligation', 'criticism', 'possibility'], why: 'Must have + participio = deducción sobre el pasado, no obligación.' },
  { s: 'We would play in the street for hours.', answer: 'habit', distractors: ['future', 'requests', 'possibility'], why: 'Would = acción repetida en el pasado.' },
  { s: 'You should have told me.', answer: 'criticism', distractors: ['advice', 'obligation', 'deduction'], why: 'Should have + participio critica algo que no se hizo.' },
];

// ---------------------------------------------------------- certainty scale --

export interface CertaintyStop {
  id: string;
  pct: string;
  es: string;
  color: string;
  present: { m: string; e: string };
  past: { m: string; e: string };
}

export const CERTAINTY: CertaintyStop[] = [
  { id: 'sure-yes', pct: '≈ 100 %', es: 'Seguro que sí', color: 'var(--green)', present: { m: 'must', e: "The lights are on. She must be at home." }, past: { m: 'must have', e: "Her coat's gone. She must have left." } },
  { id: 'expected', pct: '≈ 80 %', es: 'Lo lógico es que sí', color: 'var(--teal)', present: { m: 'should / ought to', e: 'They left at six, so they should be here by now.' }, past: { m: 'should have', e: 'The parcel should have arrived by now.' } },
  { id: 'maybe', pct: '≈ 50 %', es: 'Quizás', color: 'var(--indigo)', present: { m: 'may / might / could', e: "He isn't answering. He might be in a meeting." }, past: { m: 'may / might / could have', e: 'She might have missed the bus.' } },
  { id: 'maybe-not', pct: '≈ 30 %', es: 'Quizás no', color: 'var(--orange)', present: { m: 'may not / might not', e: "She might not know about the party." }, past: { m: 'may not / might not have', e: "He may not have heard the news." } },
  { id: 'sure-no', pct: '≈ 0 %', es: 'Seguro que no', color: 'var(--red)', present: { m: "can't / couldn't", e: "That can't be Tom — he's in Peru." }, past: { m: "can't / couldn't have", e: "She can't have seen us — she was asleep." } },
];

export interface DeductionClue {
  clue: string;
  s: string;
  answer: CertaintyStop['id'];
  tense: 'present' | 'past';
}

export const DEDUCTION_CLUES: DeductionClue[] = [
  { tense: 'present', clue: 'Lleva todo el día trabajando sin parar.', s: 'He ___ be tired.', answer: 'sure-yes' },
  { tense: 'present', clue: 'Está en Australia esta semana.', s: "That ___ be Anna at the door.", answer: 'sure-no' },
  { tense: 'present', clue: 'No lo sé seguro; a veces va al gimnasio a esta hora.', s: 'She ___ be at the gym.', answer: 'maybe' },
  { tense: 'present', clue: 'El tren salió a su hora hace dos horas y el viaje dura dos horas.', s: 'They ___ be here any minute.', answer: 'expected' },
  { tense: 'past', clue: 'Hay barro en sus botas y tiene el pelo mojado.', s: 'He ___ been out in the rain.', answer: 'sure-yes' },
  { tense: 'past', clue: 'Estuvo conmigo toda la noche.', s: "She ___ been at the party.", answer: 'sure-no' },
  { tense: 'past', clue: 'No contesta; puede que no haya visto mi mensaje.', s: 'He ___ seen my message.', answer: 'maybe-not' },
  { tense: 'past', clue: 'Su coche no está; quizá se fue antes, quizá no.', s: 'She ___ left early.', answer: 'maybe' },
];

// --------------------------------------------------------- obligation scale --

export type ObligationLevel = 'necessary' | 'advisable' | 'optional' | 'forbidden';

export const OBLIGATION_LEVELS: { id: ObligationLevel; es: string; color: string; modals: string; e: string }[] = [
  { id: 'necessary', es: 'Necesario', color: 'var(--orange)', modals: 'must · have to · need to', e: 'You have to show your passport.' },
  { id: 'advisable', es: 'Recomendable', color: 'var(--purple)', modals: "should · ought to · had better", e: 'You should book in advance.' },
  { id: 'optional', es: 'Opcional', color: 'var(--cyan)', modals: "don't have to · needn't · don't need to", e: "You don't have to tip." },
  { id: 'forbidden', es: 'Prohibido', color: 'var(--red)', modals: "mustn't · can't · not allowed to", e: "You mustn't smoke here." },
];

export interface ObligationSign {
  sign: string;
  answer: ObligationLevel;
  s: string;
}

export const OBLIGATION_SIGNS: ObligationSign[] = [
  { sign: '🚭 NO SMOKING', answer: 'forbidden', s: "You mustn't smoke here." },
  { sign: '🎟️ FREE ENTRY', answer: 'optional', s: "You don't have to pay to get in." },
  { sign: '🛂 PASSPORTS MUST BE SHOWN', answer: 'necessary', s: 'You have to show your passport.' },
  { sign: '📅 BOOKING RECOMMENDED', answer: 'advisable', s: 'You should book in advance.' },
  { sign: '📵 NO PHONES IN THE EXAM', answer: 'forbidden', s: "You can't use your phone in the exam." },
  { sign: '👔 DRESS CODE: CASUAL', answer: 'optional', s: "You don't need to wear a suit." },
  { sign: '⛑️ HELMETS REQUIRED', answer: 'necessary', s: 'You must wear a helmet.' },
  { sign: '🧴 SUNSCREEN ADVISED', answer: 'advisable', s: "You'd better wear sunscreen." },
];

// ------------------------------------------------------------ form builder --

export const BUILDER_MODALS = ['can', 'could', 'may', 'might', 'must', 'should', 'will', 'would'] as const;
export type BuilderModal = (typeof BUILDER_MODALS)[number];
export type BuilderType = 'aff' | 'neg' | 'q' | 'perf' | 'perfNeg';

export const BUILDER_TYPES: { id: BuilderType; es: string }[] = [
  { id: 'aff', es: 'Afirmativa' },
  { id: 'neg', es: 'Negativa' },
  { id: 'q', es: 'Pregunta' },
  { id: 'perf', es: 'Pasado (+ have)' },
  { id: 'perfNeg', es: 'Pasado negativo' },
];

export const BUILDER_SUBJECTS = ['I', 'You', 'She', 'We', 'They'] as const;

export const BUILDER_VERBS: { base: string; pp: string; es: string }[] = [
  { base: 'swim', pp: 'swum', es: 'nadar' },
  { base: 'finish the report', pp: 'finished the report', es: 'terminar el informe' },
  { base: 'call her', pp: 'called her', es: 'llamarla' },
  { base: 'be at home', pp: 'been at home', es: 'estar en casa' },
  { base: 'see the film', pp: 'seen the film', es: 'ver la película' },
];

export const NEGATIVES: Record<BuilderModal, { short: string; full: string }> = {
  can: { short: "can't", full: 'cannot' },
  could: { short: "couldn't", full: 'could not' },
  may: { short: 'may not', full: 'may not' },
  might: { short: 'might not', full: 'might not' },
  must: { short: "mustn't", full: 'must not' },
  should: { short: "shouldn't", full: 'should not' },
  will: { short: "won't", full: 'will not' },
  would: { short: "wouldn't", full: 'would not' },
};

/** Meaning of each modal in each form; `bad` flags forms that standard English avoids. */
export const BUILDER_NOTES: Record<BuilderModal, Record<BuilderType, { note: string; bad?: string }>> = {
  can: {
    aff: { note: 'Habilidad, permiso informal o posibilidad general.' },
    neg: { note: "Incapacidad, prohibición o deducción negativa (can't be = es imposible que…)." },
    q: { note: 'Pregunta por habilidad, o petición / permiso informal.' },
    perf: { note: 'Can have + participio no se usa en afirmativa.', bad: 'Usa could have / may have (posibilidad pasada) o was able to (habilidad).' },
    perfNeg: { note: "Deducción sobre el pasado: es imposible que ocurriera." },
  },
  could: {
    aff: { note: 'Habilidad general en el pasado, posibilidad o sugerencia.' },
    neg: { note: 'No era capaz (también válido para una ocasión concreta) o es imposible que…' },
    q: { note: 'Petición o permiso cortés.' },
    perf: { note: 'Posibilidad pasada que no se realizó, o reproche («You could have told me!»).' },
    perfNeg: { note: 'Era imposible que ocurriera, o no habría sido posible.' },
  },
  may: {
    aff: { note: 'Permiso formal o posibilidad.' },
    neg: { note: 'Prohibición formal o posibilidad negativa (nunca se contrae).' },
    q: { note: 'May I / we…? pide permiso formalmente. Con otros sujetos suena raro.' },
    perf: { note: 'Posibilidad pasada: quizá ocurrió.' },
    perfNeg: { note: 'Quizá no ocurrió.' },
  },
  might: {
    aff: { note: 'Posibilidad (a menudo algo menos segura que may).' },
    neg: { note: 'Quizá no.' },
    q: { note: 'Pregunta muy formal y poco común; mejor «Do you think … might …?».' },
    perf: { note: 'Posibilidad pasada, o reproche («You might have warned me!»).' },
    perfNeg: { note: 'Quizá no ocurrió.' },
  },
  must: {
    aff: { note: 'Obligación fuerte; con verbos de estado (be, know…) suele ser deducción: «She must be at home».' },
    neg: { note: "Prohibición. Para «no es necesario» usa don't have to." },
    q: { note: 'Correcta pero formal; lo normal es «Do I have to…?».' },
    perf: { note: 'Deducción sobre el pasado: casi seguro que ocurrió. NO es obligación pasada (eso es had to).' },
    perfNeg: { note: "Poco natural para deducción negativa.", bad: "Usa can't have + participio (en EE. UU. también must not have, sin contraer)." },
  },
  should: {
    aff: { note: 'Consejo, lo correcto, o expectativa lógica.' },
    neg: { note: 'Consejo negativo: no es buena idea.' },
    q: { note: 'Pide consejo («Should I call her?»).' },
    perf: { note: 'Crítica o arrepentimiento: era lo correcto, pero no se hizo.' },
    perfNeg: { note: 'Crítica: se hizo, y no estuvo bien.' },
  },
  will: {
    aff: { note: 'Predicción, decisión espontánea, promesa o suposición segura.' },
    neg: { note: 'Predicción negativa o negativa a hacer algo («The car won\'t start»).' },
    q: { note: 'Petición directa o pregunta sobre el futuro. Para ofrecerte, usa Shall I…?' },
    perf: { note: 'Futuro perfecto (estará hecho) o suposición sobre el pasado.' },
    perfNeg: { note: 'No estará hecho para entonces.' },
  },
  would: {
    aff: { note: 'Resultado hipotético, hábito pasado, futuro en el pasado.' },
    neg: { note: 'Hipótesis negativa o negativa en el pasado («He wouldn\'t listen»).' },
    q: { note: 'Petición u ofrecimiento muy cortés.' },
    perf: { note: 'Hipótesis sobre el pasado («…if I had known»).' },
    perfNeg: { note: 'Hipótesis negativa sobre el pasado.' },
  },
};

// ------------------------------------------------------------- exploration --

export type SectionId = 'intro' | 'core' | 'marginal' | 'semi' | 'functions' | 'rules' | 'traps' | 'bonus';

/** Every "ring" the learner can collect by visiting a section or a modal. */
export const RING_KEYS: string[] = ['intro', ...CORE.map((m) => m.id), ...MARGINAL.map((m) => m.id), 'semi', 'functions', 'rules', 'traps', 'bonus'];

export const FACT_VS_ATTITUDE: { m: string; es: string; fn: FunctionId }[] = [
  { m: 'might work', es: 'quizá trabaja', fn: 'possibility' },
  { m: 'must work', es: 'tiene que trabajar (o seguro que trabaja)', fn: 'obligation' },
  { m: 'should work', es: 'debería trabajar', fn: 'advice' },
  { m: 'can work', es: 'puede (le está permitido o es capaz)', fn: 'ability' },
  { m: "doesn't have to work", es: 'no tiene obligación', fn: 'no-obligation' },
];

/** Corrections made while porting (kept in code for reviewers). */
export const CONTENT_FIXES = [
  'Bonus Q10: «I ___ smoke, but I gave up» se etiquetaba como «estado» siendo un hábito; ahora usa un verbo de estado (live) para probar de verdad would vs used to.',
  'OUGHT TO no es «el único modal que lleva TO»: used to también (y los semimodales).',
  'MUST: «never mustn\'t have» matizado — must not have (sin contraer) es habitual en inglés americano para deducción.',
  'SHOULD HAVE no «siempre» significa que no pasó: con valor de expectativa no se sabe.',
  'MODAL + HAVE + participio no es «el pasado universal»: no expresa obligación pasada (had to) y can have solo va en negativa/pregunta.',
  'Regla 6 reformulada por el mismo motivo.',
  'MAY/MIGHT: eliminados los porcentajes («50 %», «remota»); might es solo a menudo algo menos seguro.',
  'WILL: añadida la excepción de when + oración sustantiva («I don\'t know when he will arrive»).',
  'Regla 4: used to también lleva do en preguntas y negativas.',
  'NEED: didn\'t need to no dice por sí solo si la acción ocurrió.',
  'SHOULD: añadido el subjuntivo americano tras insist/suggest.',
  'Explicación de CAN en deducción y de los distractores de cada pregunta ampliadas.',
];
