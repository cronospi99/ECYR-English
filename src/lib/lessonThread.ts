/**
 * Class thread engine (teachers only). Given a CEFR level, the grammar topics
 * chosen in one or more of its units and an optional subject, it builds ONE
 * central piece (a reading, gossip, a news story…) and unfolds every topic from
 * it, plus a 5-minute opener and a 5-minute closer. Levels are never mixed.
 *
 * Two ways to build it: `buildLocal` (no network: a draft made of the topics'
 * own model sentences) and `buildWithAi` (Gemini through the class's `gemini`
 * Edge Function writes the piece at the level and marks each topic's sentences;
 * it falls back to the local plan if the call or its answer fails).
 */
import type { CefrLevel, Unit } from '@/content/types';
import { generate } from './examAi';
import { audienceOf, describeMix, dominant, energizerForMix, hookForMix, type Audience, type Energizer, type Mix } from './engagement';

export type ThreadStyle = 'reading' | 'story' | 'mystery' | 'gossip' | 'news' | 'diary' | 'trip';

export const STYLES: { id: ThreadStyle; label: string; emoji: string; en: string }[] = [
  { id: 'reading', label: 'Lectura', emoji: '📚', en: 'a short magazine-style reading about one clear subject: a surprising fact, a person as an example and a closing thought' },
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
  /** The selected grammar topic this branch unfolds, and its sentences in the central text. */
  topic: string;
  examples: string[];
  /** What students should notice about the topic in those sentences. */
  notice: string;
  /** A short task that reuses the topic inside the central theme. */
  practice: string;
}

export interface Thread {
  source: 'ia' | 'local';
  level: CefrLevel;
  style: ThreadStyle;
  title: string;
  premise: string;
  /** The central piece everything unfolds from (a reading, a piece of gossip, a news story…). English at the
      level when written by the AI; a draft made of the topics' model sentences when local. */
  story: string;
  characters: { name: string; role: string }[];
  chapters: Chapter[];
  opener: Activity;
  closer: Activity;
  tips: string[];
  /** The largest age group (drives names and the team challenge's tone). */
  audience: Audience;
  mix: Mix;
  /** 30-second attention grabber before the opener. */
  hook: string;
  /** 1–2 minute brain break for the middle of the class. */
  energizer: Energizer;
}

export interface ThreadInput {
  level: CefrLevel;
  units: Unit[];
  /** Grammar topics chosen in each unit (indexes into `unit.grammar`); a unit without an entry brings them all. */
  points?: Record<number, number[]>;
  topic: string;
  style: ThreadStyle;
  mix: Mix;
  seed: number;
}

// ------------------------------------------------------------------ local --

const pick = <T>(a: T[], n: number) => a[((n % a.length) + a.length) % a.length]!;
const clean = (s: string) => s.replace(/^to\s+/i, '').replace(/\s*\/.*$/, '').trim();
const unitName = (u: Unit) => u.title.charAt(0) + u.title.slice(1).toLowerCase();

interface Seed {
  title: (topic: string) => string;
  premise: (a: string, b: string, c: string, topic: string) => string;
  /** One beat per chapter: the narrative job of that unit. */
  beats: string[];
}

const SEEDS: Record<ThreadStyle, Seed[]> = {
  reading: [
    {
      title: (t) => (t ? `Everybody Is Talking About ${t}` : 'Three Things Nobody Tells You'),
      premise: (a, b) => `Una lectura de revista escrita por ${a} con ayuda de ${b}: un dato curioso, un caso real y una opinión.`,
      beats: ['el dato que sorprende', 'el caso de una persona', 'causas y consecuencias', 'opinión y pregunta al lector'],
    },
  ],
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

/** How the local draft of the central piece opens, by kind (plain English every level can follow). */
const FRAMES: Record<ThreadStyle, (a: string, b: string, c: string, t: string) => string> = {
  reading: (a, b, _c, t) => `Everybody talks about ${t}. ${a} wrote a short article about it for the school magazine, and ${b} helped. This is what they wrote.`,
  story: (a, b) => `It was a normal day until ${a} got a strange message. ${b} was there too. This is what happened.`,
  mystery: (a, b, c) => `Something is missing, and nobody knows why. ${a} and ${b} look for clues. ${c} knows something.`,
  gossip: (a, b, c) => `“Have you heard about ${c}?” ${a} asks ${b}. “No! Tell me everything.”`,
  news: (a, b, c) => `BREAKING NEWS. Something happened in town this morning. ${a} saw it, ${b} is the reporter and ${c} gives an interview.`,
  diary: (a, b) => `Dear diary, it’s ${a} again. A lot is happening, and ${b} is part of it.`,
  trip: (a, b, c) => `${a} and ${b} are on a trip, but ${c} changes the plan.`,
};
const NOTICE = ['¿Qué tienen en común estas frases? Que lo digan con sus palabras.', '¿Qué palabra o forma se repite? ¿Qué cambia el significado?', '¿Quién lo dice en el texto y para qué lo usa?'];
const PRACTICE: Record<'low' | 'mid' | 'high', string[]> = {
  low: ['Cambian una de las frases para hablar de sí mismos.', 'Dicen una frase nueva sobre un personaje con esta forma.'],
  mid: ['Agregan una frase al texto con esta estructura.', 'Le responden a un personaje usando esta estructura.'],
  high: ['Reescriben un párrafo desde otro punto de vista con esta estructura.', 'Debaten la idea central: cada intervención usa la estructura.'],
};
const plain = (x: string) => x.replace(/[*_`]/g, '').replace(/\s+—\s+.*$/, '').trim();

/** The grammar topics of a unit that take part (all of them unless some were chosen). */
export function pointsOf(u: Unit, points?: Record<number, number[]>) {
  const idx = points?.[u.n];
  return idx?.length ? u.grammar.filter((_, i) => idx.includes(i)) : u.grammar;
}

export function buildLocal({ level, units, points, topic, style, mix, seed }: ThreadInput): Thread {
  const audience = dominant(mix);
  const seedPlan = pick(SEEDS[style], seed);
  const [a, b, c] = pick(audienceOf(audience).names, seed + 1);
  const flat = units.flatMap((u) => pointsOf(u, points).map((g, k) => ({ u, g, first: k === 0 })));
  const chapters: Chapter[] = flat.map(({ u, g, first }, i) => {
    const beat = seedPlan.beats[Math.min(i, seedPlan.beats.length - 1)]!;
    const vocab = first ? u.vocab.slice(0, 6).map((v) => clean(v.term)) : [];
    const terms = u.vocab.slice(0, 6).map((v) => clean(v.term));
    const qs = QUESTIONS[band(level)];
    const questions = [0, 1].map((k) => pick(qs, seed + i + k)({ a: pick([a, b], i + k), term: terms[(i + k) % Math.max(1, terms.length)] ?? 'story', gram: g.name, topic: u.theme.toLowerCase() }));
    return {
      unit: u.n,
      unitTitle: unitName(u),
      link: i === 0 ? 'Abre el tema' : `Sale de «${flat[i - 1]!.g.name}»`,
      stage: stageOf(i, flat.length),
      scene: beat.charAt(0).toUpperCase() + beat.slice(1) + '.',
      vocab,
      grammar: [g.name],
      cue: pick(CUES, seed + i),
      questions,
      topic: g.name,
      examples: (g.examples ?? []).slice(0, 2).map(plain).filter(Boolean),
      notice: pick(NOTICE, seed + i),
      practice: pick(PRACTICE[band(level)], seed + i),
    };
  });
  const story = [FRAMES[style](a, b, c, topic || units[0]?.theme.toLowerCase() || 'this'), ...chapters.filter((ch) => ch.examples.length).map((ch) => ch.examples.join(' ')), 'What happens next? You decide.'].join('\n');
  const allTerms = chapters.flatMap((c) => c.vocab);
  const last = units[units.length - 1]!;
  const closerBase = { a, gram: chapters[chapters.length - 1]?.grammar[0] ?? unitName(last), terms: allTerms, level, topic };
  return {
    source: 'local',
    level,
    style,
    title: seedPlan.title(topic),
    premise: seedPlan.premise(a, b, c, topic || unitName(units[0]!)),
    story,
    characters: [
      { name: a, role: 'protagonista' },
      { name: b, role: 'amigo/a o compañero/a' },
      { name: c, role: 'personaje que complica o ayuda' },
    ],
    chapters,
    opener: pick(OPENERS, seed)({ a, first: unitName(units[0]!), level }),
    closer: pick(CLOSERS, seed + 2)(closerBase),
    tips: [
      'Lean primero el texto central completo; luego un tema a la vez.',
      `Si se desvían: «And what about ${a}?»`,
      'Cierra con una pregunta abierta: la próxima clase empieza sola.',
    ],
    audience,
    mix,
    hook: hookForMix(mix, a, seed),
    energizer: energizerForMix(mix, seed),
  };
}

// ----------------------------------------------------------------- Gemini --

const SHAPE = `{"title":"English title","premise":"ONE short sentence in Spanish: what the piece is about","story":"the central piece in English, 3–5 short paragraphs separated by \\n","characters":[{"name":"","role":"Spanish, a few words"}],"chapters":[{"topic":"the grammar topic, as given","examples":["2–3 sentences copied EXACTLY from the story that use this topic"],"notice":"Spanish, max 16 words: what students should notice in those sentences","practice":"Spanish, max 16 words: a task that reuses the topic inside this piece","cue":"Spanish, max 14 words: what the teacher does","questions":["2 short English questions about the piece that need this topic to answer"]}],"opener":{"title":"","minutes":5,"steps":[{"min":1,"text":"Spanish, max 10 words"}],"questions":["1–2 short English questions"]},"closer":{"title":"","minutes":5,"steps":[{"min":1,"text":"Spanish, max 10 words"}],"questions":["1–2 short English questions"]},"tips":["2 tips in Spanish, max 10 words each"],"hook":"Spanish, max 20 words: a 30-second attention grabber that starts the class","energizer":{"title":"","minutes":2,"how":"Spanish, max 20 words: a 1–2 minute movement or competition break using the topics"}}`;

const WORDS: Record<CefrLevel, string> = { A1: '90–130', A2: '120–170', B1: '170–230', B2: '220–290', C1: '260–340', C2: '300–380' };

function prompt({ level, units, points, topic, style, mix }: ThreadInput) {
  const st = STYLES.find((s) => s.id === style)!;
  const topics = units.flatMap((u) => pointsOf(u, points).map((g) => `- "${g.name}" (unit ${u.n}, ${unitName(u)})${g.short ? `: ${g.short}` : ''}`)).join('\n');
  const vocab = units.map((u) => u.vocab.slice(0, 8).map((v) => v.term).join('; ')).join('; ');
  return `You design lessons for an English teacher whose students are Spanish speakers at CEFR ${level} ONLY (never mix other levels).
Write ONE central piece in the form of ${st.en}. The whole class unfolds from this single piece: every grammar topic below must appear in it naturally, at least twice, so the teacher can read it once and then break it down topic by topic.
${topic ? `The teacher wants this subject or idea: "${topic}".\n` : ''}Grammar topics (keep this order in "chapters", one chapter per topic):
${topics}
Useful vocabulary from those units (reuse some): ${vocab}.

Rules:
- The piece: ${WORDS[level]} words, strictly ${level} language, one clear subject from start to end. Set it anywhere in the world (vary cities and countries; not only Latin America).
- "examples" must be sentences copied character by character from the piece.
- The class: ${describeMix(mix)}. Subject, people and humour must hook THEM; nothing offensive; fictional people only, never real ones.
- "opener" and "closer" must each fit in 5 minutes or less: the steps' minutes must add up to the activity's minutes (≤ 5). 2 or 3 steps each.
- Teacher instructions in Spanish; student-facing language in English. Be brief and concrete.
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
  const story = str(o.story);
  const characters = Array.isArray(o.characters)
    ? (o.characters as Record<string, unknown>[]).map((c) => ({ name: str(c.name), role: str(c.role) })).filter((c) => c.name).slice(0, 5)
    : [];
  // Anything still taken from the local plan uses the AI's characters, not the local names.
  const names = local.characters.map((c, i) => [c.name, characters[i]?.name] as const).filter((x): x is readonly [string, string] => !!x[1]);
  const rename = (t: string) => names.reduce((acc, [from, to]) => acc.split(from).join(to), t);
  const chapters: Chapter[] = local.chapters.map((lc, i) => {
    const r = rows.find((x) => str(x.topic).toLowerCase() === lc.topic.toLowerCase()) ?? rows[i] ?? {};
    const found = strs(r.examples, 3).filter((x) => story.includes(x));
    return {
      ...lc,
      examples: found.length ? found : strs(r.examples, 3),
      notice: str(r.notice) || lc.notice,
      practice: str(r.practice) || lc.practice,
      cue: str(r.cue) || rename(lc.cue),
      questions: strs(r.questions, 3).length ? strs(r.questions, 3) : lc.questions.map(rename),
    };
  });
  if (!story) throw new Error('empty');
  return {
    ...local,
    source: 'ia',
    title: str(o.title) || local.title,
    premise: str(o.premise) || local.premise,
    story,
    characters: characters.length ? characters : local.characters,
    chapters,
    opener: activity(o.opener, renameActivity(local.opener, rename)),
    closer: activity(o.closer, renameActivity(local.closer, rename)),
    tips: strs(o.tips, 3).length ? strs(o.tips, 3) : local.tips,
    hook: str(o.hook) || rename(local.hook),
    energizer: (() => {
      const e = (o.energizer ?? {}) as Record<string, unknown>;
      return str(e.how) ? { title: str(e.title) || local.energizer.title, minutes: Math.min(3, Math.max(1, Math.round(Number(e.minutes) || 2))), how: str(e.how) } : local.energizer;
    })(),
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
    `GANCHO (30 s): ${t.hook}`,
    '',
    'INICIO DE CLASE',
    act(t.opener),
    '',
    `TEXTO CENTRAL${t.source === 'local' ? ' (borrador)' : ''}`,
    t.story,
    '',
    ...t.chapters.flatMap((c) => [
      `${c.topic} · U${c.unit} ${c.unitTitle}`,
      ...c.examples.map((x) => `  “${x}”`),
      `  Notar: ${c.notice}`,
      `  Practicar: ${c.practice}`,
      ...(c.vocab.length ? [`  Vocabulario: ${c.vocab.join(', ')}`] : []),
      `  Cómo guiarla: ${c.cue}`,
      ...c.questions.map((q) => `  ? ${q}`),
      '',
    ]),
    `ENERGIZANTE (${t.energizer.minutes} min) · ${t.energizer.title}: ${t.energizer.how}`,
    '',
    'CIERRE DE CLASE',
    act(t.closer),
    '',
    'CONSEJOS',
    ...t.tips.map((x) => `  · ${x}`),
  ].join('\n');
}
