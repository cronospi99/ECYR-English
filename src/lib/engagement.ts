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
    label: 'Niños',
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
    label: 'Adolescentes',
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
    label: 'Jóvenes adultos',
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
    label: 'Adultos',
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
    (n) => `Entra susurrando: «Shh… ${n} has a secret». No digas más hasta que pregunten.`,
    () => 'Esconde un objeto en una bolsa: que adivinen qué es con preguntas de sí/no.',
  ],
  teens: [
    (n) => `Proyecta un «mensaje» falso de ${n}: «Don’t tell anyone…». Lee solo la primera línea.`,
    () => 'Pon 10 s de una canción de moda sin decir por qué; la primera pregunta de clase sale de ahí.',
    () => 'Empieza con un reto: «Nadie aquí puede decir 5 palabras de hoy en 10 segundos». Que lo intenten.',
  ],
  young: [
    (n) => `Muestra un «chat» de ${n} con un error gracioso: ¿qué pasó?`,
    () => 'Pregunta relámpago: «¿Qué harías con 1 millón… pero solo en inglés?». 30 s en parejas.',
  ],
  adults: [
    (n) => `Cuenta en una frase algo que le pasó a ${n} «esta mañana» y pregunta: ¿les ha pasado?`,
    () => 'Una foto de un lugar o un objeto cotidiano: ¿dónde es? ¿qué recuerdo les trae?',
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
    { title: 'Simon says (con el vocabulario)', minutes: 2, how: 'Simon says… touch something «red», jump if it’s a verb. El que se equivoca ayuda a dirigir.' },
    { title: 'Mímica relámpago', minutes: 2, how: 'Un niño actúa una palabra de hoy; el grupo grita la palabra en inglés.' },
  ],
  teens: [
    { title: 'Stand up if…', minutes: 2, how: 'Frases con la gramática de hoy («Stand up if you have ever…»). Se paran o se sientan: rápido.' },
    { title: 'Duelo de 10 segundos', minutes: 2, how: 'Dos voluntarios, una categoría (food, verbs…): gana quien diga más palabras en 10 s.' },
    { title: 'Esquinas', minutes: 2, how: 'Cada esquina es una opción (A/B/C/D). Lees una pregunta y se mueven a su respuesta.' },
  ],
  young: [
    { title: 'Esquinas de opinión', minutes: 2, how: 'Agree / disagree en paredes opuestas; 2 personas defienden su lado en una frase.' },
    { title: 'Speed chat', minutes: 2, how: 'Parejas de 30 s con una pregunta; al sonido, rotan.' },
  ],
  adults: [
    { title: 'Ronda de manos', minutes: 1, how: 'Levanten la mano si… (frases de la vida real con la gramática de hoy) y comenten 1.' },
    { title: 'Speed chat', minutes: 2, how: 'Parejas de 30 s con una pregunta de la vida real; al sonido, cambian de compañero.' },
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
    { kind: 'Rápido', emoji: '⚡', task: `Say 5 words from today’s unit.`, seconds: t(15), points: 1 },
    { kind: 'Mímica', emoji: '🎭', task: `Act out “${w(0)}”. Your team guesses.`, seconds: t(30), points: 2 },
    { kind: 'Dibujo', emoji: '✏️', task: `Draw “${w(1)}” on the board. No letters!`, seconds: t(40), points: 2 },
    { kind: 'Frase', emoji: '💬', task: `Make a sentence with “${w(2)}” and “${w(3)}”.`, seconds: t(30), points: 2 },
    { kind: 'Gramática', emoji: '🧩', task: low ? `One sentence with: ${g(0)}.` : `Two sentences with: ${g(0)}. One must be a question.`, seconds: t(40), points: 3 },
    { kind: 'Tabú', emoji: '🚫', task: `Explain “${w(4)}” without saying it.`, seconds: t(40), points: 3 },
    { kind: 'Historia', emoji: '📖', task: `Continue the class story in one sentence using “${w(5)}”.`, seconds: t(30), points: 2 },
    { kind: 'Robo', emoji: '🦹', task: `Steal: answer the last question another team missed.`, seconds: t(20), points: 2 },
  ];
  if (audience === 'teens') cards.push({ kind: 'Viral', emoji: '📱', task: `Write a 6-word “post” about the story with “${w(6)}”.`, seconds: 40, points: 3 });
  if (audience === 'kids') cards.push({ kind: 'Congela', emoji: '🧊', task: `Everyone freezes! First to say a word from today unfreezes the team.`, seconds: 15, points: 1 });
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
  { title: 'Esquinas', minutes: 2, how: 'Cada esquina es una opción (A/B/C/D); se mueven a su respuesta y uno de cada esquina explica.' },
  { title: 'Parejas cruzadas', minutes: 2, how: 'Parejas de edades distintas: 30 s cada uno para contar algo con la gramática de hoy.' },
  { title: 'Mímica por equipos mixtos', minutes: 2, how: 'Un joven actúa y un adulto adivina (y al revés) con las palabras de hoy.' },
];

const MIXED_HOOKS: ((name: string) => string)[] = [
  (n) => `Pregunta: «¿Quién creen que es ${n}?». Que respondan un joven y un adulto: dos versiones de la misma historia.`,
  () => 'Muestra un objeto que todas las edades conocen (un celular viejo, una llave) y pregunta qué historia esconde.',
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
