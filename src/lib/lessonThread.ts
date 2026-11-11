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
  { id: 'reading', label: 'Reading', emoji: '📚', en: 'a short magazine-style reading about one clear subject: a surprising fact, a person as an example and a closing thought' },
  { id: 'story', label: 'Story', emoji: '📖', en: 'a short story with a small problem and a happy or surprising end' },
  { id: 'mystery', label: 'Mystery', emoji: '🕵️', en: 'a light mystery: something goes missing and clues appear unit by unit' },
  { id: 'gossip', label: 'Gossip', emoji: '☕', en: 'friendly gossip about people everyone in the class could know, kept kind and harmless' },
  { id: 'news', label: 'News', emoji: '📰', en: 'a news story that develops: headline, witnesses, reactions, follow-up' },
  { id: 'diary', label: 'Diary', emoji: '📓', en: 'a character’s diary, one entry per unit, where life changes little by little' },
  { id: 'trip', label: 'Trip', emoji: '🧳', en: 'a trip with a goal, where each stop brings a new situation' },
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
      premise: (a, b) => `A magazine reading written by ${a} with help from ${b}: a curious fact, a real case and an opinion.`,
      beats: ['the surprising fact', 'one person’s case', 'causas y consecuencias', 'opinion and a question for the reader'],
    },
  ],
  story: [
    {
      title: (t) => (t ? `The Day Everything Changed · ${t}` : 'The Day Everything Changed'),
      premise: (a, b) => `${a} receives a mysterious invitation and decides with ${b} whether to go.`,
      beats: ['introduce the characters and their situation', 'an unexpected complication appears', 'the characters make a decision or a plan', 'surprise ending or reflection'],
    },
    {
      title: () => 'A Small Problem in the Neighbourhood',
      premise: (a, b, c) => `${a} and ${b} find out that ${c}, their neighbour, is leaving the neighbourhood.`,
      beats: ['show the neighbourhood and the characters', 'descubrir el problema', 'organizar la ayuda', 'resolver y celebrar'],
    },
  ],
  mystery: [
    {
      title: () => 'The Missing Bag',
      premise: (a, b, c) => `${a}’s backpack disappeared; ${b} helps and ${c} seems to know something.`,
      beats: ['what happened and who was there', 'primera pista y primeras sospechas', 'a second clue that changes the theory', 'the truth is revealed'],
    },
  ],
  gossip: [
    {
      title: () => 'Did You Hear About…?',
      premise: (a, b, c) => `${a} tells ${b} a piece of gossip about ${c}. Each unit makes it grow… or denies it.`,
      beats: ['el chisme empieza', 'details and rumours (who said what?)', 'versions that contradict each other', 'the truth comes out'],
    },
  ],
  news: [
    {
      title: () => 'Breaking News from Town',
      premise: (a, b, c) => `Something happened in town: ${a} saw it, ${b} reports it and ${c} gives the interview.`,
      beats: ['headline and basic facts', 'testigos y detalles', 'reacciones y opiniones', 'follow-up: what happened next'],
    },
  ],
  diary: [
    {
      title: () => 'Dear Diary…',
      premise: (a, b) => `${a}’s diary: one entry per unit, and ${b} changes their life.`,
      beats: ['first entry: who I am and what my life is like', 'something new arrives', 'a problem or a change', 'looking back and making plans'],
    },
  ],
  trip: [
    {
      title: () => 'The Trip We Almost Missed',
      premise: (a, b, c) => `${a} and ${b} travel to an event; ${c} makes them stop. Each unit, a stopover.`,
      beats: ['preparar y salir', 'primera parada y primer problema', 'ask for help and change the plan', 'arrive (or almost) and tell the trip'],
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
    title: 'Previously on… (start with the thread)',
    minutes: 5,
    steps: [
      { min: 1, text: `Write “${a}…” on the board: what happens?` },
      { min: 2, text: 'In pairs: what they remember (or imagine) from the thread.' },
      { min: 2, text: 'One student tells it; note 3 key words.' },
    ],
    questions: [],
  }),
  ({ first }) => ({
    title: 'Mystery object',
    minutes: 4,
    steps: [
      { min: 1, text: `Show an object from “${first}”: Whose is it?` },
      { min: 3, text: 'Pairs invent the owner and why it matters.' },
    ],
    questions: [],
  }),
];

const CLOSERS: ((n: { a: string; gram: string; terms: string[]; level: CefrLevel; topic: string }) => Activity)[] = [
  ({ a, gram, terms }) => ({
    title: 'Sentence chain',
    minutes: 5,
    steps: [
      { min: 1, text: `They continue ${a}’s story: one sentence each.` },
      { min: 3, text: `Each sentence uses ${gram} or: ${terms.slice(0, 3).join(', ')}.` },
      { min: 1, text: 'They read the final version; correct just one mistake.' },
    ],
    questions: [`What happens next to ${a}?`, `Which word from today helped you most?`],
  }),
  ({ a, level }) => ({
    title: 'Hot seat',
    minutes: 5,
    steps: [
      { min: 1, text: `A volunteer is ${a}; the rest prepare questions.` },
      { min: 3, text: `Entrevista a ${a}${level === 'A1' || level === 'A2' ? ' (one-sentence answers)' : ' (that they justify with because)'}.` },
      { min: 1, text: 'Each one says something new they know.' },
    ],
    questions: [`How do you feel, ${a}?`, `What are you going to do tomorrow?`],
  }),
  ({ a, gram }) => ({
    title: '3-2-1 exit ticket',
    minutes: 4,
    steps: [
      { min: 1, text: '3 words · 2 sentences · 1 question for the character.' },
      { min: 2, text: 'They swap and correct one sentence.' },
      { min: 1, text: 'Read two and announce how it continues tomorrow.' },
    ],
    questions: [`Make a sentence about ${a} with: ${gram}.`],
  }),
  ({ a }) => ({
    title: 'Prediction: what will happen?',
    minutes: 5,
    steps: [
      { min: 1, text: `What is going to happen to ${a}?` },
      { min: 3, text: 'Pairs write 2 predictions and vote.' },
      { min: 1, text: 'The winner opens the next class.' },
    ],
    questions: [`What will ${a} do?`, `Do you think ${a} is right?`],
  }),
];

/** Where a chapter sits in the arc. */
export function stageOf(i: number, n: number) {
  if (n === 1) return 'All in one';
  if (i === 0) return 'Home';
  if (i === n - 1) return 'Resolution';
  return n === 4 && i === 2 ? 'Twist' : 'Knot';
}

const CUES = ['Tell it in 3 sentences; they guess what comes next.', 'Ask a question and let the class invent the detail.', 'Pause at the key moment: what happens now?', 'Have them retell it in pairs with the words of the unit.'];

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
const NOTICE = ['What do these sentences have in common? Have them say it in their own words.', 'Which word or form repeats? What changes the meaning?', 'Who says it in the text and what do they use it for?'];
const PRACTICE: Record<'low' | 'mid' | 'high', string[]> = {
  low: ['They change one of the sentences to talk about themselves.', 'They say a new sentence about a character with this form.'],
  mid: ['They add a sentence to the text with this structure.', 'They answer a character using this structure.'],
  high: ['They rewrite a paragraph from another point of view with this structure.', 'They debate the central idea: each turn uses the structure.'],
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
      link: i === 0 ? 'Open the topic' : `Sale de «${flat[i - 1]!.g.name}»`,
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
      { name: b, role: 'friend or classmate' },
      { name: c, role: 'character who complicates or helps' },
    ],
    chapters,
    opener: pick(OPENERS, seed)({ a, first: unitName(units[0]!), level }),
    closer: pick(CLOSERS, seed + 2)(closerBase),
    tips: [
      'Read the whole central text first; then one topic at a time.',
      `If they drift: “And what about ${a}?”`,
      'Close with an open question: the next class starts by itself.',
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
    throw new Error('The AI replied in an unexpected format. Try again or use the plan without AI.');
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
      `  How to guide it: ${c.cue}`,
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
