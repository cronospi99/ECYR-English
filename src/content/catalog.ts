import type { CefrLevel, Skill } from './types';

export type ModuleKind = 'game' | 'book' | 'course' | 'presentation' | 'app';

export interface ModuleEntry {
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  kind: ModuleKind;
  /** Path under /public, served as-is and played inside <ModulePlayer>. */
  src: string;
  cover?: string;
  levels: CefrLevel[];
  skills: Skill[];
  topics: string[];
  /** Typical mode of play. */
  mode: 'solo' | 'class' | 'both';
  minutes?: number;
  accent: string;
  emoji: string;
}

export const MODULES: ModuleEntry[] = [
  // ------------------------------------------------------------ games ----
  {
    slug: 'da-world',
    title: 'Da World',
    subtitle: '3D city · Explore, help, learn',
    description:
      'Walk around a 3D city and help its 32 citizens by answering in English. You pick a mode and the city only asks you for that kind of mission: city vocabulary and prepositions of place, directions (go straight on, turn left…) or the family detective with adverbs of frequency. Includes a multiplayer Class mode by QR code.',
    kind: 'game',
    src: '/modules/da-world/index.html',
    cover: '/covers/da-world.webp',
    levels: ['A1', 'A2'],
    skills: ['vocabulary', 'grammar'],
    topics: ['Places in the city', 'Prepositions of place', 'Directions', 'Adverbs of frequency', 'Family'],
    mode: 'both',
    minutes: 25,
    accent: 'var(--teal)',
    emoji: '🏙️',
  },
  {
    slug: 'english-defenders',
    title: 'English Defenders',
    subtitle: 'Tower defense 3D · Learn, Defend, Win',
    description:
      'Defend your garden from the zombies by answering grammar and vocabulary questions from your unit (A1–C1). 149 topics, 1,850+ questions with explanations in Spanish, minigames, difficulty levels and multiplayer Class Mode.',
    kind: 'game',
    src: '/modules/english-defenders/index.html',
    cover: '/covers/english-defenders.webp',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    skills: ['grammar', 'vocabulary'],
    topics: ['Grammar by unit', 'Vocabulary', 'Review'],
    mode: 'both',
    minutes: 20,
    accent: 'var(--green)',
    emoji: '🌻',
  },
  {
    slug: 'jeopardy',
    title: 'Star Medic Jeopardy',
    subtitle: 'Team quiz · 12 topics',
    description:
      'A Jeopardy-style board with 12 topics (food, travel, work, technology…) and questions adapted to each CEFR level. Ideal for team play in class.',
    kind: 'game',
    src: '/modules/jeopardy/star-medic-jeopardy.html',
    cover: '/covers/jeopardy.webp',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    skills: ['speaking', 'vocabulary', 'grammar'],
    topics: ['Vocabulary', 'General review'],
    mode: 'class',
    minutes: 30,
    accent: 'var(--blue)',
    emoji: '🎯',
  },
  {
    slug: 'phrasal-roulette',
    title: 'Phrasal Verb Roulette',
    subtitle: 'Ruleta de 480+ phrasal verbs',
    description:
      'Spin the wheel, get a phrasal verb and use it in context. Covers families (GET, TAKE, PUT…) from A1 to C1 with translation and examples.',
    kind: 'game',
    src: '/modules/phrasal-roulette/phrasal-verb-roulette.html',
    cover: '/covers/phrasal-roulette.webp',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    skills: ['vocabulary', 'speaking'],
    topics: ['Phrasal verbs'],
    mode: 'both',
    minutes: 15,
    accent: 'var(--orange)',
    emoji: '🎡',
  },
  {
    slug: 'two-truths-colombia',
    title: 'Two Truths & a Lie',
    subtitle: 'Which one is the lie?',
    description:
      'Spin the globe and reveal three sentences: two true and one false. Two editions: Colombia, and Pop & World (superheroes, music, movies, travel and pop culture). Teams, final ranking.',
    kind: 'game',
    src: '/modules/two-truths/colombia.html',
    cover: '/covers/two-truths.webp',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    skills: ['speaking', 'reading'],
    topics: ['Culture', 'Opinions', 'Travel'],
    mode: 'class',
    minutes: 20,
    accent: 'var(--yellow)',
    emoji: '🇨🇴',
  },
  {
    slug: 'too-good-to-be-true',
    title: 'Too Good To Be True',
    subtitle: 'Impostor words · teams',
    description:
      '16 words on the board, some of them invented or look-alike fakes. Teams take turns to spot the impostors; a wrong guess can be saved with a synonym. Every board gets trickier. C1–C2 use academic words with Spanish translations.',
    kind: 'game',
    src: '/modules/two-truths/too-good-to-be-true.html',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'],
    skills: ['speaking', 'reading'],
    topics: ['Vocabulary', 'Spelling', 'Synonyms'],
    mode: 'class',
    minutes: 20,
    accent: 'var(--pink)',
    emoji: '🤯',
  },
  {
    slug: 'would-you-rather',
    title: 'Would You Rather Arena',
    subtitle: 'Comic arena · quick debate',
    description:
      '“Would you rather…?” dilemmas in a comic arena with a countdown. Pick a level: sentences with because, hypotheses and comparisons, or abstract debate.',
    kind: 'game',
    src: '/modules/would-you-rather/would-you-rather-arena.html',
    cover: '/covers/would-you-rather.webp',
    levels: ['A2', 'B1', 'B2', 'C1'],
    skills: ['speaking'],
    topics: ['Conditionals', 'Opinions'],
    mode: 'class',
    minutes: 15,
    accent: 'var(--red)',
    emoji: '⚔️',
  },
  {
    slug: 'earth-modals',
    title: 'Earth Modals Explorer',
    subtitle: 'Can, should, must around the world',
    description:
      '3D globe with the 30 most visited countries: travel rules and tips to practise can, should and must.',
    kind: 'game',
    src: '/modules/earth-modals/earth-modals-explorer.html',
    cover: '/covers/earth-modals.webp',
    levels: ['A2', 'B1'],
    skills: ['reading', 'grammar'],
    topics: ['Modals', 'Travel'],
    mode: 'both',
    minutes: 20,
    accent: 'var(--green)',
    emoji: '🌍',
  },
  {
    slug: 'sentence-builder',
    title: 'Sentence Builder',
    subtitle: 'Put the words in order · A1–C1',
    description:
      'A scrambled sentence on tiles: tap them in order to build it and check. 10 sentences per round, more than 200 sentences from A1 to C1 (present simple, past, conditionals, passive, inversion…) with a Spanish translation as a hint.',
    kind: 'game',
    src: '/modules/sentence-builder/index.html',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    skills: ['grammar', 'reading'],
    topics: ['Word order', 'Verb tenses', 'Questions', 'Conditionals', 'Passive'],
    mode: 'solo',
    minutes: 5,
    accent: 'var(--indigo)',
    emoji: '🧩',
  },
  {
    slug: 'spelling-bee',
    title: 'Spelling Bee',
    subtitle: 'Listen and spell · 3 lives',
    description:
      'Listen to the word (US or UK accent, normal or slow), read its meaning and an example sentence, and type it without mistakes. Letter-by-letter checking, 15 words per round and more than 250 words from A1 to C1.',
    kind: 'game',
    src: '/modules/spelling-bee/index.html',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    skills: ['writing', 'listening', 'vocabulary'],
    topics: ['Spelling', 'Dictation', 'Vocabulary'],
    mode: 'solo',
    minutes: 6,
    accent: 'var(--orange)',
    emoji: '🐝',
  },
  {
    slug: 'fast-match',
    title: 'Fast Match',
    subtitle: '60 seconds · Match word and picture',
    description:
      'A 60-second race against the clock: an English word appears and you pick its picture or its translation from four. Streaks raise the multiplier up to ×4. 10 topics: animals, food, jobs, the house, clothes, emotions, verbs, adjectives, travel and the body.',
    kind: 'game',
    src: '/modules/fast-match/index.html',
    levels: ['A1', 'A2'],
    skills: ['vocabulary'],
    topics: ['Animals', 'Food', 'Jobs', 'The house', 'Clothes', 'Emotions', 'Verbs', 'Adjectives', 'Travel', 'The body'],
    mode: 'solo',
    minutes: 2,
    accent: 'var(--pink)',
    emoji: '⚡',
  },
  {
    slug: 'word-rain',
    title: 'Word Rain',
    subtitle: 'Translate before they hit the ground',
    description:
      'Words rain down in Spanish: type their English translation before they reach the ground. They fall faster and faster, you have 5 lives and synonyms are accepted (movie / film). More than 300 words and expressions from A1 to C1.',
    kind: 'game',
    src: '/modules/word-rain/index.html',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    skills: ['vocabulary', 'writing'],
    topics: ['Vocabulary', 'Translation', 'Connectors', 'Expressions'],
    mode: 'solo',
    minutes: 4,
    accent: 'var(--blue)',
    emoji: '🌧️',
  },

  // ----------------------------------------------------- books & courses ----
  {
    slug: 'a1-foundations',
    title: 'English Comic Course',
    subtitle: 'A1 Foundations · 8 units',
    description: 'A1 comic course: alphabet, numbers, greetings, the verb to be, present simple and much more.',
    kind: 'course',
    src: '/modules/a1-foundations/comic-course.html',
    cover: '/covers/a1-foundations.webp',
    levels: ['A1'],
    skills: ['grammar', 'vocabulary', 'reading'],
    topics: ['Basics'],
    mode: 'solo',
    accent: 'var(--red)',
    emoji: '💥',
  },
  ...(
    [
      ['interchange-a1', 'Grammar Islands', 'Interactive book · A1', 'A1', 'var(--green)', '🏝️'],
      ['interchange-a2', 'Grammar Network', 'Interactive book · A2', 'A2', 'var(--teal)', '🛰️'],
      ['interchange-b1', 'Grammar Starmap', 'Interactive book · B1', 'B1', 'var(--blue)', '🌌'],
      ['passages-1-b2', 'Grammar Craft', 'Interactive book · B2', 'B2', 'var(--indigo)', '🛠️'],
      ['passages-2-c1', 'Grammar Adventure', 'Interactive book · C1', 'C1', 'var(--purple)', '🧭'],
    ] as const
  ).map(
    ([slug, title, subtitle, level, accent, emoji]): ModuleEntry => ({
      slug,
      title,
      subtitle,
      description: `Complete interactive book of ${subtitle}: units, vocabulary, grammar, class activities and Class Mixer.`,
      kind: 'book',
      src: `/modules/books/${slug}.html`,
      cover: '/covers/books.webp',
      levels: [level],
      skills: ['grammar', 'vocabulary', 'speaking'],
      topics: ['Book'],
      mode: 'both',
      accent,
      emoji,
    }),
  ),
];

export const GAMES = MODULES.filter((m) => m.kind === 'game' || m.kind === 'presentation');
export const moduleBySlug = (slug: string) => MODULES.find((m) => m.slug === slug);

