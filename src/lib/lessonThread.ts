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
  /** Its place in the arc: Inicio, Nudo, Giro, Desenlace. */
  stage: string;
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
      premise: (a, b) => `${a} recibe una invitación misteriosa y decide con ${b} si ir.`,
      beats: ['presentar a los personajes y su situación', 'aparece una complicación inesperada', 'los personajes toman una decisión o hacen un plan', 'final sorpresa o reflexión'],
    },
    {
      title: () => 'A Small Problem in the Neighbourhood',
      premise: (a, b, c) => `${a} y ${b} descubren que ${c}, su vecino, se va del barrio.`,
      beats: ['mostrar el barrio y a los personajes', 'descubrir el problema', 'organizar la ayuda', 'resolver y celebrar'],
    },
  ],
  mystery: [
    {
      title: () => 'The Missing Bag',
      premise: (a, b, c) => `La mochila de ${a} desapareció; ${b} ayuda y ${c} parece saber algo.`,
      beats: ['qué pasó y quiénes estaban', 'primera pista y primeras sospechas', 'segunda pista que cambia la teoría', 'se revela la verdad'],
    },
  ],
  gossip: [
    {
      title: () => 'Did You Hear About…?',
      premise: (a, b, c) => `${a} le cuenta a ${b} un chisme sobre ${c}. Cada unidad lo hace crecer… o lo desmiente.`,
      beats: ['el chisme empieza', 'detalles y rumores (¿quién dijo qué?)', 'versiones que se contradicen', 'la verdad sale a la luz'],
    },
  ],
  news: [
    {
      title: () => 'Breaking News from Town',
      premise: (a, b, c) => `Algo pasó en el pueblo: ${a} lo vio, ${b} lo reporta y ${c} da la entrevista.`,
      beats: ['titular y hechos básicos', 'testigos y detalles', 'reacciones y opiniones', 'seguimiento: qué pasó después'],
    },
  ],
  diary: [
    {
      title: () => 'Dear Diary…',
      premise: (a, b) => `El diario de ${a}: una entrada por unidad, y ${b} cambia su vida.`,
      beats: ['primera entrada: quién soy y cómo es mi vida', 'algo nuevo llega', 'un problema o un cambio', 'mirar atrás y hacer planes'],
    },
  ],
  trip: [
    {
      title: () => 'The Trip We Almost Missed',
      premise: (a, b, c) => `${a} y ${b} viajan a un evento; ${c} los obliga a parar. Cada unidad, una escala.`,
      beats: ['preparar y salir', 'primera parada y primer problema', 'pedir ayuda y cambiar el plan', 'llegar (o casi) y contar el viaje'],
    },
  ],
};

const QUESTIONS: Record<'low' | 'mid' | 'high', ((ctx: { a: string; term: string; gram: string; topic: string }) => string)[]> = {
  low: [
    ({ a, term }) => `Say a sentence about ${a} with "${term}".`,
    ({ a }) => `Who is ${a}? Where is ${a} now?`,
    ({ a, term }) => `Does ${a} like "${term}"? Why?`,
  ],
  mid: [
    ({ a, term }) => `What does ${a} say next? Use "${term}".`,
    ({ a }) => `Why did ${a} do that?`,
    ({ a, term }) => `How did "${term}" change ${a}’s day?`,
  ],
  high: [
    ({ a }) => `Retell this part as ${a}.`,
    ({ a, term }) => `Do you agree with ${a}? Use "${term}".`,
    ({ a }) => `What would you have done in ${a}’s place?`,
  ],
};
const band = (l: CefrLevel) => (l === 'A1' || l === 'A2' ? 'low' : l === 'B1' ? 'mid' : 'high');

const OPENERS: ((n: { a: string; first: string; level: CefrLevel }) => Activity)[] = [
  ({ a }) => ({
    title: 'Previously on… (inicio con el hilo)',
    minutes: 5,
    steps: [
      { min: 1, text: `Escribe «${a}…» en el tablero: ¿qué pasa?` },
      { min: 2, text: 'En parejas: lo que recuerdan (o imaginan) del hilo.' },
      { min: 2, text: 'Un estudiante lo cuenta; anota 3 palabras clave.' },
    ],
    questions: [],
  }),
  ({ first }) => ({
    title: 'Objeto misterioso',
    minutes: 4,
    steps: [
      { min: 1, text: `Muestra un objeto de «${first}»: Whose is it?` },
      { min: 3, text: 'Parejas inventan el dueño y por qué importa.' },
    ],
    questions: [],
  }),
];

const CLOSERS: ((n: { a: string; gram: string; terms: string[]; level: CefrLevel; topic: string }) => Activity)[] = [
  ({ a, gram, terms }) => ({
    title: 'Cadena de frases',
    minutes: 5,
    steps: [
      { min: 1, text: `Continúan la historia de ${a}: una frase cada uno.` },
      { min: 3, text: `Cada frase usa ${gram} o: ${terms.slice(0, 3).join(', ')}.` },
      { min: 1, text: 'Leen la versión final; corrige un solo error.' },
    ],
    questions: [`What happens next to ${a}?`, `Which word from today helped you most?`],
  }),
  ({ a, level }) => ({
    title: 'Silla caliente',
    minutes: 5,
    steps: [
      { min: 1, text: `Un voluntario es ${a}; el resto prepara preguntas.` },
      { min: 3, text: `Entrevista a ${a}${level === 'A1' || level === 'A2' ? ' (respuestas de una frase)' : ' (que justifique con because)'}.` },
      { min: 1, text: 'Cada uno dice algo nuevo que sabe.' },
    ],
    questions: [`How do you feel, ${a}?`, `What are you going to do tomorrow?`],
  }),
  ({ a, gram }) => ({
    title: 'Ticket de salida 3-2-1',
    minutes: 4,
    steps: [
      { min: 1, text: '3 palabras · 2 frases · 1 pregunta al personaje.' },
      { min: 2, text: 'Intercambian y corrigen una frase.' },
      { min: 1, text: 'Lee dos y anuncia cómo sigue mañana.' },
    ],
    questions: [`Make a sentence about ${a} with: ${gram}.`],
  }),
  ({ a }) => ({
    title: 'Predicción: ¿qué pasará?',
    minutes: 5,
    steps: [
      { min: 1, text: `What is going to happen to ${a}?` },
      { min: 3, text: 'Parejas escriben 2 predicciones y votan.' },
      { min: 1, text: 'La ganadora abre la próxima clase.' },
    ],
    questions: [`What will ${a} do?`, `Do you think ${a} is right?`],
  }),
];

/** Where a chapter sits in the arc. */
export function stageOf(i: number, n: number) {
  if (n === 1) return 'Todo en uno';
  if (i === 0) return 'Inicio';
  if (i === n - 1) return 'Desenlace';
  return n === 4 && i === 2 ? 'Giro' : 'Nudo';
}

const CUES = ['Cuéntala en 3 frases; ellos adivinan qué sigue.', 'Haz una pregunta y deja que la clase invente el detalle.', 'Pausa en el momento clave: ¿qué pasa ahora?', 'Que la cuenten en parejas con las palabras de la unidad.'];

export function buildLocal({ level, units, topic, style, seed }: ThreadInput): Thread {
  const seedPlan = pick(SEEDS[style], seed);
  const [a, b, c] = pick(NAMES, seed + 1);
  const chapters: Chapter[] = units.map((u, i) => {
    const beat = seedPlan.beats[Math.min(i, seedPlan.beats.length - 1)]!;
    const vocab = u.vocab.slice(0, 6).map((v) => clean(v.term));
    const grammar = u.grammar.map((g) => g.name);
    const gram = grammar[0] ?? unitName(u);
    const qs = QUESTIONS[band(level)];
    const questions = [0, 1].map((k) => pick(qs, seed + i + k)({ a: pick([a, b], i + k), term: vocab[k % Math.max(1, vocab.length)] ?? 'story', gram: grammar[k % Math.max(1, grammar.length)] ?? gram, topic: u.theme.toLowerCase() }));
    return {
      unit: u.n,
      unitTitle: unitName(u),
      link: i === 0 ? 'Abre el hilo' : `Sigue de «${unitName(units[i - 1]!)}»`,
      stage: stageOf(i, units.length),
      scene: beat.charAt(0).toUpperCase() + beat.slice(1) + '.',
      vocab,
      grammar,
      cue: pick(CUES, seed + i),
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
      'Cuenta tú la historia; ellos completan los detalles.',
      `Si se desvían: «And what about ${a}?»`,
      'Cierra con una pregunta abierta: la próxima clase empieza sola.',
    ],
  };
}

// ----------------------------------------------------------------- Gemini --

const SHAPE = `{"title":"English title","premise":"ONE short sentence in Spanish","story":"the whole thread in English, one short paragraph per chapter, each starting with 'Chapter N · <unit title>' on its own line","characters":[{"name":"","role":"Spanish, a few words"}],"chapters":[{"unit":0,"link":"Spanish, max 6 words: how it follows the previous chapter","scene":"ONE sentence in English at the level: what happens","cue":"Spanish, max 14 words: what the teacher does","questions":["2 short English questions that need the unit's vocabulary or grammar"]}],"opener":{"title":"","minutes":5,"steps":[{"min":1,"text":"Spanish, max 10 words"}],"questions":["1–2 short English questions"]},"closer":{"title":"","minutes":5,"steps":[{"min":1,"text":"Spanish, max 10 words"}],"questions":["1–2 short English questions"]},"tips":["2 tips in Spanish, max 10 words each"]}`;

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
- Be brief and concrete: the teacher reads this in seconds before class. The story: about 60–90 words per chapter.
- 2 or 3 steps per activity.
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

const renameActivity = (a: Activity, f: (t: string) => string): Activity => ({ ...a, steps: a.steps.map((x) => ({ ...x, text: f(x.text) })), questions: a.questions.map(f) });

function parseAi(text: string, local: Thread): Thread {
  const o = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)) as Record<string, unknown>;
  const rows = Array.isArray(o.chapters) ? (o.chapters as Record<string, unknown>[]) : [];
  const characters = Array.isArray(o.characters)
    ? (o.characters as Record<string, unknown>[]).map((c) => ({ name: str(c.name), role: str(c.role) })).filter((c) => c.name).slice(0, 5)
    : [];
  // Anything still taken from the local plan uses the AI's characters, not the local names.
  const names = local.characters.map((c, i) => [c.name, characters[i]?.name] as const).filter((x): x is readonly [string, string] => !!x[1]);
  const rename = (t: string) => names.reduce((acc, [from, to]) => acc.split(from).join(to), t);
  const chapters: Chapter[] = local.chapters.map((lc, i) => {
    const r = rows.find((x) => Number(x.unit) === lc.unit) ?? (rows.length === local.chapters.length ? rows[i] : undefined) ?? {};
    return {
      ...lc,
      link: str(r.link) || rename(lc.link),
      scene: str(r.scene) || rename(lc.scene),
      cue: str(r.cue) || rename(lc.cue),
      questions: strs(r.questions, 3).length ? strs(r.questions, 3) : lc.questions.map(rename),
    };
  });
  if (!str(o.story) && !rows.length) throw new Error('empty');
  return {
    ...local,
    source: 'ia',
    title: str(o.title) || local.title,
    premise: str(o.premise) || local.premise,
    story: str(o.story) || undefined,
    characters: characters.length ? characters : local.characters,
    chapters,
    opener: activity(o.opener, renameActivity(local.opener, rename)),
    closer: activity(o.closer, renameActivity(local.closer, rename)),
    tips: strs(o.tips, 3).length ? strs(o.tips, 3) : local.tips,
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
