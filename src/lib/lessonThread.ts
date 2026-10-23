/**
 * Class thread engine (teachers only). Given a CEFR level, one or more units of
 * that level and an optional topic, it builds ONE central thread (a story, a
 * mystery, some gossip…) where each unit is a branch that feeds it, plus a
 * 5-minute opener and a 5-minute closer. Levels are never mixed.
 *
 * Two ways to build it: `buildLocal` (no network: story seeds + the units'
 * own vocabulary and grammar) and `buildWithAi` (Gemini through the class's
 * `gemini` Edge Function, which writes the story at the level; it falls back to
 * the local plan if the call or its answer fails).
 */
import type { CefrLevel, Unit } from '@/content/types';
import { generate } from './examAi';

export type ThreadStyle = 'story' | 'mystery' | 'gossip' | 'news' | 'diary' | 'trip';

export const STYLES: { id: ThreadStyle; label: string; emoji: string; en: string }[] = [
  { id: 'story', label: 'Cuento', emoji: '📖', en: 'a short story with a small problem and a happy or surprising end' },
  { id: 'mystery', label: 'Misterio', emoji: '🕵️', en: 'a light mystery: something goes missing and clues appear unit by unit' },
  { id: 'gossip', label: 'Chisme', emoji: '☕', en: 'friendly gossip about people everyone in the class could know, kept kind and harmless' },
  { id: 'news', label: 'Noticia', emoji: '📰', en: 'a news story that develops: headline, witnesses, reactions, follow-up' },
  { id: 'diary', label: 'Diario', emoji: '📓', en: 'a character’s diary, one entry per unit, where life changes little by little' },
  { id: 'trip', label: 'Viaje', emoji: '🧳', en: 'a trip with a goal, where each stop brings a new situation' },
];

export interface Activity {
  title: string;
  minutes: number;
  steps: { min: number; text: string }[];
  questions: string[];
}

export interface Chapter {
  unit: number;
  unitTitle: string;
  /** How this branch grows from the previous one (Spanish, for the teacher). */
  link: string;
  /** What happens in this chapter. English at the level when written by the AI; Spanish teacher notes when local. */
  scene: string;
  vocab: string[];
  grammar: string[];
  /** What the teacher does with it. */
  cue: string;
  questions: string[];
}

export interface Thread {
  source: 'ia' | 'local';
  level: CefrLevel;
  style: ThreadStyle;
  title: string;
  premise: string;
  /** The whole story at the level (AI only). */
  story?: string;
  characters: { name: string; role: string }[];
  chapters: Chapter[];
  opener: Activity;
  closer: Activity;
  tips: string[];
}

export interface ThreadInput {
  level: CefrLevel;
  units: Unit[];
  topic: string;
  style: ThreadStyle;
  seed: number;
}

// ------------------------------------------------------------------ local --

const pick = <T>(a: T[], n: number) => a[((n % a.length) + a.length) % a.length]!;
const clean = (s: string) => s.replace(/^to\s+/i, '').replace(/\s*\/.*$/, '').trim();
const unitName = (u: Unit) => u.title.charAt(0) + u.title.slice(1).toLowerCase();

const NAMES: [string, string, string][] = [
  ['Valentina', 'Mateo', 'Mrs Clarke'],
  ['Camila', 'Santiago', 'Mr Evans'],
  ['Sofía', 'Diego', 'Ms Taylor'],
  ['Laura', 'Andrés', 'Dr Brown'],
];

interface Seed {
  title: (topic: string) => string;
  premise: (a: string, b: string, c: string, topic: string) => string;
  /** One beat per chapter: the narrative job of that unit. */
  beats: string[];
}

const SEEDS: Record<ThreadStyle, Seed[]> = {
  story: [
    {
      title: (t) => (t ? `The Day Everything Changed · ${t}` : 'The Day Everything Changed'),
      premise: (a, b) => `${a} recibe una invitación misteriosa y tiene que decidir con ${b} si ir. Cada unidad añade un paso de su día.`,
      beats: ['presentar a los personajes y su situación', 'aparece una complicación inesperada', 'los personajes toman una decisión o hacen un plan', 'final sorpresa o reflexión'],
    },
    {
      title: () => 'A Small Problem in the Neighbourhood',
      premise: (a, b, c) => `${a} y ${b} descubren que ${c}, un vecino querido, está por irse del barrio. Quieren hacer algo antes de que sea tarde.`,
      beats: ['mostrar el barrio y a los personajes', 'descubrir el problema', 'organizar la ayuda', 'resolver y celebrar'],
    },
  ],
  mystery: [
    {
      title: () => 'The Missing Bag',
      premise: (a, b, c) => `La mochila de ${a} desapareció. ${b} ayuda a buscarla y ${c} parece saber algo. Cada unidad entrega una pista.`,
      beats: ['qué pasó y quiénes estaban', 'primera pista y primeras sospechas', 'segunda pista que cambia la teoría', 'se revela la verdad'],
    },
  ],
  gossip: [
    {
      title: () => 'Did You Hear About…?',
      premise: (a, b, c) => `${a} le cuenta a ${b} un chisme sobre ${c}. Con cada unidad el chisme crece, se corrige o se desmiente. Mantenerlo amable y sin gente real.`,
      beats: ['el chisme empieza', 'detalles y rumores (¿quién dijo qué?)', 'versiones que se contradicen', 'la verdad sale a la luz'],
    },
  ],
  news: [
    {
      title: () => 'Breaking News from Town',
      premise: (a, b, c) => `Un suceso en el pueblo: ${a} es testigo, ${b} es reportero y ${c} da una entrevista. Cada unidad es una nota de seguimiento.`,
      beats: ['titular y hechos básicos', 'testigos y detalles', 'reacciones y opiniones', 'seguimiento: qué pasó después'],
    },
  ],
  diary: [
    {
      title: () => 'Dear Diary…',
      premise: (a, b) => `El diario de ${a}: una entrada por unidad. ${b} aparece en varias y la vida de ${a} cambia poco a poco.`,
      beats: ['primera entrada: quién soy y cómo es mi vida', 'algo nuevo llega', 'un problema o un cambio', 'mirar atrás y hacer planes'],
    },
  ],
  trip: [
    {
      title: () => 'The Trip We Almost Missed',
      premise: (a, b, c) => `${a} y ${b} viajan para llegar a un evento importante. ${c} les cuesta una parada inesperada. Cada unidad es una escala.`,
      beats: ['preparar y salir', 'primera parada y primer problema', 'pedir ayuda y cambiar el plan', 'llegar (o casi) y contar el viaje'],
    },
  ],
};

const QUESTIONS: Record<'low' | 'mid' | 'high', ((ctx: { a: string; term: string; gram: string; topic: string }) => string)[]> = {
  low: [
    ({ a, term }) => `Make a sentence about ${a} with "${term}".`,
    ({ a, gram }) => `Say two true sentences about ${a}. Use: ${gram}.`,
    ({ term }) => `What is "${term}" in Spanish? Say it in a sentence in English.`,
  ],
  mid: [
    ({ a, term }) => `What would ${a} say next? Use "${term}".`,
    ({ a, gram }) => `Tell what happened to ${a} using: ${gram}.`,
    ({ a }) => `Why did ${a} do that? Give a reason and an example.`,
  ],
  high: [
    ({ a, gram }) => `Retell this part from ${a}’s point of view using: ${gram}.`,
    ({ a, term }) => `Do you agree with ${a}? Defend your view using "${term}".`,
    ({ topic }) => `What does this part of the story say about ${topic}? Give a nuanced answer.`,
  ],
};
const band = (l: CefrLevel) => (l === 'A1' || l === 'A2' ? 'low' : l === 'B1' ? 'mid' : 'high');

const OPENERS: ((n: { a: string; first: string; level: CefrLevel }) => Activity)[] = [
  ({ a }) => ({
    title: 'Previously on… (inicio con el hilo)',
    minutes: 5,
    steps: [
      { min: 1, text: `Proyecta una sola imagen o escribe en el tablero: «${a}…». Los estudiantes dicen qué creen que pasa.` },
      { min: 2, text: 'En parejas, cada uno cuenta en 2–3 frases lo que recuerda del hilo (o lo que imagina, si es la primera clase).' },
      { min: 2, text: 'Un estudiante cuenta al grupo; tú anotas 3 palabras clave en el tablero. Esas palabras serán el hilo de hoy.' },
    ],
    questions: [],
  }),
  ({ first }) => ({
    title: 'Objeto misterioso',
    minutes: 4,
    steps: [
      { min: 1, text: `Muestra un objeto (o su emoji) relacionado con «${first}». Pregunta: Who does it belong to? Where is it from?` },
      { min: 3, text: 'Cada pareja inventa quién es el dueño y por qué es importante para la historia. Compartan 2 ideas.' },
    ],
    questions: [],
  }),
];

const CLOSERS: ((n: { a: string; gram: string; terms: string[]; level: CefrLevel; topic: string }) => Activity)[] = [
  ({ a, gram, terms }) => ({
    title: 'Cadena de frases',
    minutes: 5,
    steps: [
      { min: 1, text: `Explica: entre todos escriben el siguiente trozo de la historia de ${a}, una frase cada uno.` },
      { min: 3, text: `Cada estudiante añade una frase que use ${gram} o una de estas palabras: ${terms.slice(0, 4).join(', ')}. Tú escribes lo que dicen.` },
      { min: 1, text: 'Lean la versión final en voz alta. Corrige solo el error más importante.' },
    ],
    questions: [`What happens next to ${a}?`, `Which word from today helped you most?`],
  }),
  ({ a, terms, level }) => ({
    title: 'Silla caliente',
    minutes: 5,
    steps: [
      { min: 1, text: `Un voluntario es ${a} en la silla caliente. Los demás preparan una pregunta que use una de: ${terms.slice(0, 4).join(', ')}.` },
      { min: 3, text: `El grupo entrevista a ${a}. ${level === 'A1' || level === 'A2' ? 'Respuestas de una frase.' : 'Pide justificar con “because” o un ejemplo.'}` },
      { min: 1, text: 'Cambio de personaje o cierre: cada uno dice una cosa nueva que sabe de la historia.' },
    ],
    questions: [`How do you feel, ${a}?`, `What are you going to do tomorrow?`],
  }),
  ({ a, gram }) => ({
    title: 'Ticket de salida 3-2-1',
    minutes: 4,
    steps: [
      { min: 1, text: 'Escriban en un papel: 3 palabras nuevas, 2 frases con la estructura de hoy, 1 pregunta que le harían al personaje.' },
      { min: 2, text: 'Intercambian el ticket con un compañero que corrige una frase.' },
      { min: 1, text: 'Lee dos tickets al azar y anuncia cómo continúa la historia mañana.' },
    ],
    questions: [`Make a sentence about ${a} with: ${gram}.`],
  }),
  ({ a }) => ({
    title: 'Predicción: ¿qué pasará?',
    minutes: 5,
    steps: [
      { min: 1, text: `Pregunta: What is going to happen to ${a}? What do you think?` },
      { min: 3, text: 'Parejas escriben 2 predicciones; votan la más probable y la más loca.' },
      { min: 1, text: 'Deja la predicción ganadora anotada para abrir la siguiente clase.' },
    ],
    questions: [`What will ${a} do?`, `Do you think ${a} is right?`],
  }),
];

export function buildLocal({ level, units, topic, style, seed }: ThreadInput): Thread {
  const seedPlan = pick(SEEDS[style], seed);
  const [a, b, c] = pick(NAMES, seed + 1);
  const chapters: Chapter[] = units.map((u, i) => {
    const beat = seedPlan.beats[Math.min(i, seedPlan.beats.length - 1)]!;
    const vocab = u.vocab.slice(0, 6).map((v) => clean(v.term));
    const grammar = u.grammar.map((g) => g.name);
    const gram = grammar[0] ?? unitName(u);
    const qs = QUESTIONS[band(level)];
    const questions = [0, 1, 2].map((k) => pick(qs, seed + i + k)({ a: pick([a, b], i + k), term: vocab[k % Math.max(1, vocab.length)] ?? 'story', gram: grammar[k % Math.max(1, grammar.length)] ?? gram, topic: u.theme.toLowerCase() }));
    return {
      unit: u.n,
      unitTitle: unitName(u),
      link:
        i === 0
          ? `Abre el hilo con esta unidad: ${beat}.`
          : `Parte de lo que pasó en «${unitName(units[i - 1]!)}» y avanza la historia: ${beat}.`,
      scene: `En esta parte: ${beat}. Haz que el tema de la unidad (${u.theme}) sea lo que ${a} y ${b} enfrentan, y que las palabras ${vocab.slice(0, 3).join(', ')} muevan la historia.`,
      vocab,
      grammar,
      cue: `Cuenta esta parte en 3–4 frases simples usando ${vocab.slice(0, 3).join(', ')}. Pide a los estudiantes que digan qué sigue con ${gram}. ${u.speaking?.[0] ? `Speaking de la unidad: ${u.speaking[0].text}` : ''}`.trim(),
      questions,
    };
  });
  const allTerms = chapters.flatMap((c) => c.vocab);
  const last = units[units.length - 1]!;
  const closerBase = { a, gram: chapters[chapters.length - 1]?.grammar[0] ?? unitName(last), terms: chapters[chapters.length - 1]?.vocab ?? allTerms, level, topic };
  return {
    source: 'local',
    level,
    style,
    title: seedPlan.title(topic),
    premise: seedPlan.premise(a, b, c, topic || unitName(units[0]!)),
    characters: [
      { name: a, role: 'protagonista' },
      { name: b, role: 'amigo/a o compañero/a' },
      { name: c, role: 'personaje que complica o ayuda' },
    ],
    chapters,
    opener: pick(OPENERS, seed)({ a, first: unitName(units[0]!), level }),
    closer: pick(CLOSERS, seed + 2)(closerBase),
    tips: [
      'Cuenta la historia tú, en inglés simple de este nivel, y deja que los estudiantes completen o cambien detalles: la historia es de ellos.',
      'Cada unidad es una rama: si la clase se desvía, vuelve al personaje con «And what about ' + a + '?».',
      'Cierra siempre con el hilo abierto (una pregunta o predicción) para que la siguiente clase empiece sola.',
      'Corrige solo el error que más afecta la comprensión durante la actividad; el resto, al final.',
    ],
  };
}

// ----------------------------------------------------------------- Gemini --

const SHAPE = `{"title":"English title","premise":"2 sentences in Spanish for the teacher","story":"the whole thread as one continuous text in English, with a short heading line per chapter like 'Chapter 1 · <unit title>'","characters":[{"name":"","role":"Spanish, a few words"}],"chapters":[{"unit":0,"link":"Spanish: how this branch grows from the previous one","scene":"2–3 sentences in English at the level: what happens","cue":"Spanish: what the teacher does, in 2 sentences","questions":["3 English questions that need the unit's vocabulary or grammar"]}],"opener":{"title":"","minutes":5,"steps":[{"min":1,"text":"Spanish instruction"}],"questions":["English"]},"closer":{"title":"","minutes":5,"steps":[{"min":1,"text":"Spanish instruction"}],"questions":["English"]},"tips":["Spanish tip"]}`;

function prompt({ level, units, topic, style }: ThreadInput) {
  const st = STYLES.find((s) => s.id === style)!;
  const list = units
    .map((u) => `- Unit ${u.n} "${unitName(u)}" (theme: ${u.theme}). Vocabulary: ${u.vocab.slice(0, 10).map((v) => v.term).join('; ')}. Grammar: ${u.grammar.map((g) => g.name).join('; ')}.`)
    .join('\n');
  return `You design lesson plans for an English teacher whose students are Spanish speakers at CEFR ${level} ONLY (never mix other levels).
Build ONE central thread in the form of ${st.en}. Each unit below is a branch that nourishes the thread, in this order, so the lesson flows naturally instead of jumping between topics.
${topic ? `The teacher wants this topic or idea in the thread: "${topic}".\n` : ''}Units:
${list}

Rules:
- English text (story, scene, questions) must be strictly at ${level}: vocabulary and grammar a ${level} student can read; reuse the units' vocabulary and grammar naturally.
- Appropriate for adults and teens, nothing offensive; fictional people only, never real ones.
- One chapter per unit, in the order given, with the "unit" number as given.
- "opener" (start of class, recalls or sets up the thread) and "closer" (end of class activity or questions) must each fit in 5 minutes or less: the steps' minutes must add up to the activity's minutes (≤ 5).
- Teacher instructions in Spanish; student-facing language in English.
Return ONLY valid JSON, no markdown, in this shape:
${SHAPE}`;
}

const str = (v: unknown) => (typeof v === 'string' ? v : '');
const strs = (v: unknown, n = 8) => (Array.isArray(v) ? v.map(str).filter(Boolean).slice(0, n) : []);

function activity(v: unknown, fallback: Activity): Activity {
  const o = (v ?? {}) as Record<string, unknown>;
  const steps = Array.isArray(o.steps)
    ? o.steps.map((s) => ({ min: Math.max(0, Math.round(Number((s as { min?: unknown }).min) || 0)), text: str((s as { text?: unknown }).text) })).filter((s) => s.text)
    : [];
  if (!steps.length) return fallback;
  const total = steps.reduce((n, s) => n + s.min, 0);
  return { title: str(o.title) || fallback.title, minutes: Math.min(5, total || Number(o.minutes) || 5), steps, questions: strs(o.questions) };
}

function parseAi(text: string, local: Thread): Thread {
  const o = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Record<string, unknown>;
  const rows = Array.isArray(o.chapters) ? (o.chapters as Record<string, unknown>[]) : [];
  const chapters: Chapter[] = local.chapters.map((lc, i) => {
    const r = rows.find((x) => Number(x.unit) === lc.unit) ?? rows[i] ?? {};
    return {
      ...lc,
      link: str(r.link) || lc.link,
      scene: str(r.scene) || lc.scene,
      cue: str(r.cue) || lc.cue,
      questions: strs(r.questions, 5).length ? strs(r.questions, 5) : lc.questions,
    };
  });
  if (!str(o.story) && !rows.length) throw new Error('empty');
  return {
    ...local,
    source: 'ia',
    title: str(o.title) || local.title,
    premise: str(o.premise) || local.premise,
    story: str(o.story) || undefined,
    characters: Array.isArray(o.characters)
      ? (o.characters as Record<string, unknown>[]).map((c) => ({ name: str(c.name), role: str(c.role) })).filter((c) => c.name).slice(0, 5)
      : local.characters,
    chapters,
    opener: activity(o.opener, local.opener),
    closer: activity(o.closer, local.closer),
    tips: strs(o.tips, 5).length ? strs(o.tips, 5) : local.tips,
  };
}

/** The plan written by Gemini; throws with a Spanish message when it can't (the page then offers the local plan). */
export async function buildWithAi(input: ThreadInput): Promise<Thread> {
  const local = buildLocal(input);
  const text = await generate([{ text: prompt(input) }]);
  try {
    return parseAi(text, local);
  } catch {
    throw new Error('La IA respondió en un formato inesperado. Intenta de nuevo o usa el plan sin IA.');
  }
}

/** The plan as plain text, to paste into notes or a document. */
export function threadToText(t: Thread): string {
  const act = (a: Activity) => [`${a.title} (${a.minutes} min)`, ...a.steps.map((s) => `  · ${s.min} min — ${s.text}`), ...a.questions.map((q) => `  ? ${q}`)].join('\n');
  return [
    `${t.title} · ${t.level}`,
    t.premise,
    '',
    `Personajes: ${t.characters.map((c) => `${c.name} (${c.role})`).join(', ')}`,
    '',
    'INICIO DE CLASE',
    act(t.opener),
    '',
    ...(t.story ? ['HISTORIA', t.story, ''] : []),
    ...t.chapters.flatMap((c) => [
      `UNIDAD ${c.unit} · ${c.unitTitle}`,
      `  ${c.link}`,
      `  ${c.scene}`,
      `  Vocabulario: ${c.vocab.join(', ')}`,
      `  Gramática: ${c.grammar.join(' / ')}`,
      `  Cómo guiarla: ${c.cue}`,
      ...c.questions.map((q) => `  ? ${q}`),
      '',
    ]),
    'CIERRE DE CLASE',
    act(t.closer),
    '',
    'CONSEJOS',
    ...t.tips.map((x) => `  · ${x}`),
  ].join('\n');
}
