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
    slug: 'time-machine',
    title: 'Time Machine',
    subtitle: 'Fechas, meses y pasado simple',
    description:
      'Viaja por los 12 meses con audios y celebraciones colombianas. Fechas, años, ordinales y past simple con “yesterday”.',
    kind: 'game',
    src: '/modules/time-machine/time-machine.html',
    cover: '/covers/time-machine.webp',
    levels: ['A1', 'A2'],
    skills: ['listening', 'vocabulary', 'grammar'],
    topics: ['Fechas', 'Meses', 'Past simple'],
    mode: 'both',
    minutes: 25,
    accent: 'var(--teal)',
    emoji: '⏳',
  },
  {
    slug: 'time-family',
    title: 'Time & Family',
    subtitle: 'La hora, la familia y el genitivo sajón',
    description: 'Family Playbook: di la hora con un reloj interactivo, crea tu árbol genealógico y practica el genitivo sajón (’s).',
    kind: 'game',
    src: '/modules/time-family/time-and-family.html',
    cover: '/covers/time-family.webp',
    levels: ['A1'],
    skills: ['vocabulary', 'listening'],
    topics: ['La hora', 'Familia'],
    mode: 'both',
    minutes: 20,
    accent: 'var(--mint)',
    emoji: '🐧',
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
  {
    slug: 'modal-verbs-zone',
    title: 'Modal Verbs Zone',
    subtitle: 'Presentación interactiva',
    description: 'Presentación arcade: qué es un modal, modales core, marginales y semi-modales, reglas, trampas y una fase bonus.',
    kind: 'presentation',
    src: '/modules/modal-verbs-zone/modal-verbs-zone.html',
    cover: '/covers/modal-verbs-zone.webp',
    levels: ['A2', 'B1'],
    skills: ['grammar'],
    topics: ['Modales'],
    mode: 'class',
    minutes: 20,
    accent: 'var(--yellow)',
    emoji: '🕹️',
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
      ['interchange-a1', 'Grammar Islands', 'Interchange Intro · A1', 'A1', 'var(--green)', '🏝️'],
      ['interchange-a2', 'Grammar Network', 'Interchange 1 · A2', 'A2', 'var(--teal)', '🛰️'],
      ['interchange-b1', 'Grammar Starmap', 'Interchange 2 · B1', 'B1', 'var(--blue)', '🌌'],
      ['passages-1-b2', 'Grammar Craft', 'Passages 1 · B2', 'B2', 'var(--indigo)', '🛠️'],
      ['passages-2-c1', 'Grammar Adventure', 'Passages 2 · C1', 'C1', 'var(--purple)', '🧭'],
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

