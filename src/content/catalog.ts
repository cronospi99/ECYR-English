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
    subtitle: 'Ciudad 3D · Explora, ayuda, aprende',
    description:
      'Recorre a pie una ciudad 3D y ayuda a sus 32 ciudadanos respondiendo en inglés. Eliges un modo y la ciudad solo te pide ese tipo de misión: vocabulario de la ciudad y preposiciones de lugar, indicaciones (go straight on, turn left…) o el detective de la familia con adverbios de frecuencia. Incluye modo Clase multijugador por código QR.',
    kind: 'game',
    src: '/modules/da-world/index.html',
    cover: '/covers/da-world.webp',
    levels: ['A1', 'A2'],
    skills: ['vocabulary', 'grammar'],
    topics: ['Lugares de la ciudad', 'Preposiciones de lugar', 'Indicaciones', 'Adverbios de frecuencia', 'La familia'],
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
      'Defiende tu jardín de los zombies respondiendo preguntas de gramática y vocabulario de tu unidad (A1–C1). 149 temas, +1.850 preguntas con explicación en español, minijuegos, dificultades y Class Mode multijugador.',
    kind: 'game',
    src: '/modules/english-defenders/index.html',
    cover: '/covers/english-defenders.webp',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    skills: ['grammar', 'vocabulary'],
    topics: ['Gramática por unidad', 'Vocabulario', 'Repaso'],
    mode: 'both',
    minutes: 20,
    accent: 'var(--green)',
    emoji: '🌻',
  },
  {
    slug: 'jeopardy',
    title: 'Star Medic Jeopardy',
    subtitle: 'Concurso por equipos · 12 temas',
    description:
      'Tablero estilo Jeopardy con 12 temas (comida, viajes, trabajo, tecnología…) y preguntas adaptadas a cada nivel CEFR. Ideal para clase en equipos.',
    kind: 'game',
    src: '/modules/jeopardy/star-medic-jeopardy.html',
    cover: '/covers/jeopardy.webp',
    levels: ['A1', 'A2', 'B1', 'B2', 'C1'],
    skills: ['speaking', 'vocabulary', 'grammar'],
    topics: ['Vocabulario', 'Repaso general'],
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
      'Gira la ruleta, recibe un phrasal verb y úsalo en contexto. Cubre familias (GET, TAKE, PUT…) de A1 a C1 con traducción y ejemplos.',
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
    title: 'Two Truths & a Lie · Colombia',
    subtitle: '¿Cuál es la mentira?',
    description:
      'Gira la esfera y revela tres frases sobre Colombia: dos verdaderas y una falsa. Turnos por estudiante y ranking final.',
    kind: 'game',
    src: '/modules/two-truths/colombia.html',
    cover: '/covers/two-truths.webp',
    levels: ['A2', 'B1', 'B2'],
    skills: ['speaking', 'reading'],
    topics: ['Cultura', 'Opiniones'],
    mode: 'class',
    minutes: 20,
    accent: 'var(--yellow)',
    emoji: '🇨🇴',
  },
  {
    slug: 'too-good-to-be-true',
    title: 'Too Good To Be True',
    subtitle: 'Estafas, ofertas y trucos',
    description:
      'Rondas sobre ofertas “demasiado buenas para ser verdad”: elige la palabra que completa el hueco o nombra el truco. Cada respuesta revela nivel y ejemplo.',
    kind: 'game',
    src: '/modules/two-truths/too-good-to-be-true.html',
    levels: ['B1', 'B2', 'C1'],
    skills: ['speaking', 'reading'],
    topics: ['Vocabulario', 'Consumo', 'Estafas'],
    mode: 'class',
    minutes: 20,
    accent: 'var(--pink)',
    emoji: '🤯',
  },
  {
    slug: 'would-you-rather',
    title: 'Would You Rather Arena',
    subtitle: 'Arena de cómic · debate rápido',
    description:
      'Dilemas “Would you rather…?” en una arena de cómic con cuenta regresiva. Elige nivel: frases con because, hipótesis y comparaciones, o debate abstracto.',
    kind: 'game',
    src: '/modules/would-you-rather/would-you-rather-arena.html',
    cover: '/covers/would-you-rather.webp',
    levels: ['A2', 'B1', 'B2', 'C1'],
    skills: ['speaking'],
    topics: ['Condicionales', 'Opiniones'],
    mode: 'class',
    minutes: 15,
    accent: 'var(--red)',
    emoji: '⚔️',
  },
  {
    slug: 'earth-modals',
    title: 'Earth Modals Explorer',
    subtitle: 'Can, should, must por el mundo',
    description:
      'Globo 3D con los 30 países más visitados: reglas y consejos de viaje para practicar can, should y must.',
    kind: 'game',
    src: '/modules/earth-modals/earth-modals-explorer.html',
    cover: '/covers/earth-modals.webp',
    levels: ['A2', 'B1'],
    skills: ['reading', 'grammar'],
    topics: ['Modales', 'Viajes'],
    mode: 'both',
    minutes: 20,
    accent: 'var(--green)',
    emoji: '🌍',
  },

  // ----------------------------------------------------- books & courses ----
  {
    slug: 'a1-foundations',
    title: 'English Comic Course',
    subtitle: 'A1 Foundations · 8 unidades',
    description: 'Curso de cómic de A1: alfabeto, números, saludos, verbo to be, presente simple y mucho más.',
    kind: 'course',
    src: '/modules/a1-foundations/comic-course.html',
    cover: '/covers/a1-foundations.webp',
    levels: ['A1'],
    skills: ['grammar', 'vocabulary', 'reading'],
    topics: ['Fundamentos'],
    mode: 'solo',
    accent: 'var(--red)',
    emoji: '💥',
  },
  ...(
    [
      ['interchange-a1', 'Grammar Islands', 'Libro interactivo · A1', 'A1', 'var(--green)', '🏝️'],
      ['interchange-a2', 'Grammar Network', 'Libro interactivo · A2', 'A2', 'var(--teal)', '🛰️'],
      ['interchange-b1', 'Grammar Starmap', 'Libro interactivo · B1', 'B1', 'var(--blue)', '🌌'],
      ['passages-1-b2', 'Grammar Craft', 'Libro interactivo · B2', 'B2', 'var(--indigo)', '🛠️'],
      ['passages-2-c1', 'Grammar Adventure', 'Libro interactivo · C1', 'C1', 'var(--purple)', '🧭'],
    ] as const
  ).map(
    ([slug, title, subtitle, level, accent, emoji]): ModuleEntry => ({
      slug,
      title,
      subtitle,
      description: `Libro interactivo completo de ${subtitle}: unidades, vocabulario, gramática, dinámicas de clase y Class Mixer.`,
      kind: 'book',
      src: `/modules/books/${slug}.html`,
      cover: '/covers/books.webp',
      levels: [level],
      skills: ['grammar', 'vocabulary', 'speaking'],
      topics: ['Libro'],
      mode: 'both',
      accent,
      emoji,
    }),
  ),
];

export const GAMES = MODULES.filter((m) => m.kind === 'game' || m.kind === 'presentation');
export const moduleBySlug = (slug: string) => MODULES.find((m) => m.slug === slug);

