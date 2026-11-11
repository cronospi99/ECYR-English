/**
 * Engagement for class (ages 10–70): who is in the room changes the hook, the
 * mid-class energizer and the team challenges. Used by the class thread
 * (src/lib/lessonThread.ts) and its projector "Reto por equipos".
 */
import type { CefrLevel } from '@/content/types';

export type Audience = 'kids' | 'teens' | 'young' | 'adults';

export const AUDIENCES: { id: Audience; label: string; ages: string; emoji: string; ai: string; names: [string, string, string][] }[] = [
  {
    id: 'kids',
    label: 'Children',
    ages: '10–13',
    emoji: '🧒',
    ai: 'children aged 10–13: pets, school, cartoons, games, superheroes, animals; playful, simple, lots of movement',
    names: [
      ['Sofi', 'Tomás', 'Captain Bubbles'],
      ['Mía', 'Nico', 'Professor Paws'],
    ],
  },
  {
    id: 'teens',
    label: 'Teenagers',
    ages: '14–17',
    emoji: '🎧',
    ai: 'teenagers aged 14–17 who may not want to be in class: social media, viral videos, gaming, music, sports, friendships and drama; fast, funny, competitive, a little rebellious, never childish',
    names: [
      ['Valen', 'Juanes', 'Nova'],
      ['Sara', 'Dylan', 'Kai'],
    ],
  },
  {
    id: 'young',
    label: 'Young adults',
    ages: '18–30',
    emoji: '🎓',
    ai: 'young adults aged 18–30: university, first jobs, dating, travel, apps, side hustles, roommates; witty and real',
    names: [
      ['Laura', 'Andrés', 'Mr Rivera'],
      ['Camila', 'Santiago', 'Pipe'],
    ],
  },
  {
    id: 'adults',
    label: 'Adults',
    ages: '30–70',
    emoji: '☕',
    ai: 'adults aged 30–70: work, family, health, travel, neighbours, memories and real-life decisions; warm, respectful, useful for real life, humour without being childish',
    names: [
      ['Marta', 'Jorge', 'Mrs Clarke'],
      ['Patricia', 'Luis', 'Dr Brown'],
    ],
  },
];

export const audienceOf = (id: Audience) => AUDIENCES.find((a) => a.id === id)!;

const pick = <T>(a: T[], n: number) => a[((n % a.length) + a.length) % a.length]!;

/** A 30-second hook to grab attention before anything else. */
const HOOKS: Record<Audience, ((name: string) => string)[]> = {
  kids: [
    (n) => `Come in whispering: “Shh… ${n} has a secret”. Say nothing more until they ask.`,
    () => 'Hide an object in a bag: they guess what it is with yes/no questions.',
  ],
  teens: [
    (n) => `Project a fake “message” from ${n}: “Don’t tell anyone…”. Read only the first line.`,
    () => 'Play 10 s of a trending song without saying why; the first question of the class comes from there.',
    () => 'Start with a challenge: “Nobody here can say 5 words from today in 10 seconds”. Let them try.',
  ],
  young: [
    (n) => `Show a “chat” from ${n} with a funny mistake: what happened?`,
    () => 'Lightning question: “What would you do with 1 million… but only in English?”. 30 s in pairs.',
  ],
  adults: [
    (n) => `Tell in one sentence something that happened to ${n} “this morning” and ask: has it happened to you?`,
    () => 'A photo of a place or an everyday object: where is it? What memory does it bring back?',
  ],
};

export function hookFor(a: Audience, name: string, seed: number) {
  return pick(HOOKS[a], seed)(name);
}

export interface Energizer {
  title: string;
  minutes: number;
  how: string;
}

/** A 1–2 minute brain break for the middle of the class (movement, voice, competition). */
const ENERGIZERS: Record<Audience, Energizer[]> = {
  kids: [
    { title: 'Simon says (with the vocabulary)', minutes: 2, how: 'Simon says… touch something “red”, jump if it’s a verb. Whoever gets it wrong helps lead.' },
    { title: 'Lightning mime', minutes: 2, how: 'A child acts out a word from today; the group shouts the word in English.' },
  ],
  teens: [
    { title: 'Stand up if…', minutes: 2, how: 'Sentences with today’s grammar (“Stand up if you have ever…”). They stand or sit: fast.' },
    { title: '10-second duel', minutes: 2, how: 'Two volunteers, one category (food, verbs…): whoever says more words in 10 s wins.' },
    { title: 'Corners', minutes: 2, how: 'Each corner is an option (A/B/C/D). You read a question and they move to their answer.' },
  ],
  young: [
    { title: 'Opinion corners', minutes: 2, how: 'Agree / disagree on opposite walls; 2 people defend their side in one sentence.' },
    { title: 'Speed chat', minutes: 2, how: '30 s pairs with a question; at the sound, they rotate.' },
  ],
  adults: [
    { title: 'Show of hands', minutes: 1, how: 'Raise your hand if… (real-life sentences with today’s grammar) and comment on 1.' },
    { title: 'Speed chat', minutes: 2, how: '30 s pairs with a real-life question; at the sound, they change partner.' },
  ],
};

export function energizerFor(a: Audience, seed: number) {
  return pick(ENERGIZERS[a], seed);
}

export interface Challenge {
  kind: string;
  emoji: string;
  /** What the team must do (English, short). */
  task: string;
  seconds: number;
  points: number;
}

/**
 * Team challenges built from the unit's own words and grammar. The deck is
 * shuffled with the seed; tone and time limits follow the audience.
 */
export function challengeDeck(audience: Audience, level: CefrLevel, vocab: string[], grammar: string[], seed: number): Challenge[] {
  const fast = audience === 'teens' || audience === 'kids';
  const low = level === 'A1' || level === 'A2';
  const t = (n: number) => (fast ? n : Math.round(n * 1.3));
  const w = (k: number) => vocab[(seed + k) % Math.max(1, vocab.length)] ?? 'English';
  const g = (k: number) => grammar[(seed + k) % Math.max(1, grammar.length)] ?? 'today’s grammar';
  const cards: Challenge[] = [
    { kind: 'Quick', emoji: '⚡', task: `Say 5 words from today’s unit.`, seconds: t(15), points: 1 },
    { kind: 'Mime', emoji: '🎭', task: `Act out “${w(0)}”. Your team guesses.`, seconds: t(30), points: 2 },
    { kind: 'Drawing', emoji: '✏️', task: `Draw “${w(1)}” on the board. No letters!`, seconds: t(40), points: 2 },
    { kind: 'Sentence', emoji: '💬', task: `Make a sentence with “${w(2)}” and “${w(3)}”.`, seconds: t(30), points: 2 },
    { kind: 'Grammar', emoji: '🧩', task: low ? `One sentence with: ${g(0)}.` : `Two sentences with: ${g(0)}. One must be a question.`, seconds: t(40), points: 3 },
    { kind: 'Taboo', emoji: '🚫', task: `Explain “${w(4)}” without saying it.`, seconds: t(40), points: 3 },
    { kind: 'Story', emoji: '📖', task: `Continue the class story in one sentence using “${w(5)}”.`, seconds: t(30), points: 2 },
    { kind: 'Steal', emoji: '🦹', task: `Steal: answer the last question another team missed.`, seconds: t(20), points: 2 },
  ];
  if (audience === 'teens') cards.push({ kind: 'Viral', emoji: '📱', task: `Write a 6-word “post” about the story with “${w(6)}”.`, seconds: 40, points: 3 });
  if (audience === 'kids') cards.push({ kind: 'Freeze', emoji: '🧊', task: `Everyone freezes! First to say a word from today unfreezes the team.`, seconds: 15, points: 1 });
  if (audience === 'young' || audience === 'adults') cards.push({ kind: 'Debate', emoji: '🎤', task: `30-second opinion: is the main character right? Use “${w(6)}”.`, seconds: 45, points: 3 });
  // Deterministic shuffle.
  return cards
    .map((c, i) => ({ c, k: Math.sin(seed * 997 + i * 31) }))
    .sort((a, b) => a.k - b.k)
    .map((x) => x.c);
}

// ------------------------------------------------------------- class mix --

/** How many students of each age group are in the room. */
export type Mix = Record<Audience, number>;

export const EMPTY_MIX: Mix = { kids: 0, teens: 0, young: 0, adults: 0 };
export const mixTotal = (m: Mix) => AUDIENCES.reduce((n, a) => n + (m[a.id] || 0), 0);

/** The largest group (ties go to the younger one, who needs the most energy). */
export function dominant(m: Mix): Audience {
  return AUDIENCES.reduce((best, a) => ((m[a.id] || 0) > (m[best] || 0) ? a.id : best), AUDIENCES[0]!.id);
}

/** Groups that are at least a fifth of the class. */
export function mainGroups(m: Mix): Audience[] {
  const total = mixTotal(m);
  return AUDIENCES.filter((a) => total && (m[a.id] || 0) / total >= 0.2).map((a) => a.id);
}

/** Children and adults (30+) in the same room call for activities everyone can do. */
export const isIntergenerational = (m: Mix) => {
  const g = mainGroups(m);
  return g.length > 1 && (g.includes('kids') || (g.includes('teens') && g.includes('adults')));
};

/** The class as the AI should picture it. */
export function describeMix(m: Mix): string {
  const total = mixTotal(m);
  const parts = AUDIENCES.filter((a) => m[a.id]).map((a) => `${m[a.id]} ${a.label.toLowerCase()} (${a.ages}): ${a.ai}`);
  if (parts.length === 1) return `${total} students, all ${parts[0]}`;
  return `${total} students, a mixed group — ${parts.join('; ')}. Find situations that hook every group at once, give each group a moment to shine and never make the adults feel childish or the young ones bored`;
}

const MIXED_ENERGIZERS: Energizer[] = [
  { title: 'Corners', minutes: 2, how: 'Each corner is an option (A/B/C/D); they move to their answer and one from each corner explains.' },
  { title: 'Crossed pairs', minutes: 2, how: 'Pairs of different ages: 30 s each to tell something with today’s grammar.' },
  { title: 'Mime in mixed teams', minutes: 2, how: 'A young person acts and an adult guesses (and the other way round) with today’s words.' },
];

const MIXED_HOOKS: ((name: string) => string)[] = [
  (n) => `Ask: “Who do you think ${n} is?”. Have a young person and an adult answer: two versions of the same story.`,
  () => 'Show an object that all ages know (an old phone, a key) and ask what story it hides.',
];

export const hookForMix = (m: Mix, name: string, seed: number) => (isIntergenerational(m) ? pick(MIXED_HOOKS, seed)(name) : hookFor(dominant(m), name, seed));
export const energizerForMix = (m: Mix, seed: number) => (isIntergenerational(m) ? pick(MIXED_ENERGIZERS, seed) : energizerFor(dominant(m), seed));

/** Teams for the class size: 2 up to 8 students, 3 up to 15, then 4. */
export const suggestedTeams = (total: number) => (total <= 8 ? 2 : total <= 15 ? 3 : 4);

/**
 * Balanced teams: students are dealt group by group, round-robin, so every
 * team gets the same age mix and the same size (±1).
 */
export function balanceTeams(m: Mix, teams: number): Mix[] {
  const out: Mix[] = Array.from({ length: teams }, () => ({ ...EMPTY_MIX }));
  let k = 0;
  for (const a of AUDIENCES)
    for (let i = 0; i < (m[a.id] || 0); i++) {
      out[k % teams]![a.id]++;
      k++;
    }
  return out;
}
