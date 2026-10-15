import type { CefrLevel, LevelBook, CourseUnit, PhrasalVerb, JeopardyTopic, TravelGuide, VerbLabData, AcademicVerb } from './types';

export interface LevelMeta {
  id: CefrLevel;
  name: string;
  nameEs: string;
  book: string;
  /** Interactive book module (public/modules/books/<module>.html) */
  module: string;
  units: number;
  color: string; // css var name
  tint: string; // tailwind gradient classes
  description: string;
  canDo: string[];
}

export const LEVELS: LevelMeta[] = [
  {
    id: 'A1',
    name: 'Beginner',
    nameEs: 'Principiante',
    book: 'Grammar Islands',
    module: 'interchange-a1',
    units: 16,
    color: 'var(--green)',
    tint: 'from-[#34c759] to-[#30b0c7]',
    description: 'Preséntate, habla de tu rutina, tu familia y tu ciudad con frases sencillas.',
    canDo: ['Presentarte y presentar a otros', 'Hablar de tu rutina diaria', 'Pedir y ofrecer cosas'],
  },
  {
    id: 'A2',
    name: 'Elementary',
    nameEs: 'Elemental',
    book: 'Grammar Network',
    module: 'interchange-a2',
    units: 16,
    color: 'var(--teal)',
    tint: 'from-[#30b0c7] to-[#007aff]',
    description: 'Cuenta experiencias pasadas, compara opciones y planea el futuro.',
    canDo: ['Narrar lo que hiciste', 'Comparar lugares y cosas', 'Hacer planes y predicciones'],
  },
  {
    id: 'B1',
    name: 'Intermediate',
    nameEs: 'Intermedio',
    book: 'Grammar Starmap',
    module: 'interchange-b1',
    units: 16,
    color: 'var(--blue)',
    tint: 'from-[#007aff] to-[#5856d6]',
    description: 'Defiende opiniones, describe procesos y maneja situaciones de viaje y trabajo.',
    canDo: ['Dar y justificar opiniones', 'Describir procesos y cambios', 'Resolver problemas cotidianos'],
  },
  {
    id: 'B2',
    name: 'Upper-Intermediate',
    nameEs: 'Intermedio alto',
    book: 'Grammar Craft',
    module: 'passages-1-b2',
    units: 12,
    color: 'var(--indigo)',
    tint: 'from-[#5856d6] to-[#af52de]',
    description: 'Especula, argumenta y habla con matices sobre temas abstractos.',
    canDo: ['Especular sobre el pasado', 'Contrastar ideas con fluidez', 'Quejarte y negociar con tacto'],
  },
  {
    id: 'C1',
    name: 'Advanced',
    nameEs: 'Avanzado',
    book: 'Grammar Adventure',
    module: 'passages-2-c1',
    units: 12,
    color: 'var(--purple)',
    tint: 'from-[#af52de] to-[#ff2d55]',
    description: 'Usa el inglés con precisión, registro y estilo en contextos académicos y profesionales.',
    canDo: ['Matizar y suavizar opiniones', 'Dominar registro formal e informal', 'Debatir temas complejos'],
  },
];

export const TOTAL_UNITS = LEVELS.reduce((n, l) => n + l.units, 0);

export const levelMeta = (id: string) => LEVELS.find((l) => l.id.toLowerCase() === id.toLowerCase());

// Content is code-split per level: each JSON becomes its own cached chunk.
const loaders: Record<CefrLevel, () => Promise<{ default: unknown }>> = {
  A1: () => import('./generated/level-a1.json'),
  A2: () => import('./generated/level-a2.json'),
  B1: () => import('./generated/level-b1.json'),
  B2: () => import('./generated/level-b2.json'),
  C1: () => import('./generated/level-c1.json'),
};

const cache = new Map<string, Promise<unknown>>();
function memo<T>(key: string, fn: () => Promise<{ default: unknown }>): Promise<T> {
  if (!cache.has(key)) cache.set(key, fn().then((m) => m.default));
  return cache.get(key) as Promise<T>;
}

export const loadLevel = (id: CefrLevel) => memo<LevelBook>(`level-${id}`, loaders[id]);
export const loadFoundations = () =>
  memo<CourseUnit[]>('foundations', () => import('./generated/a1-foundations.json'));
export const loadPhrasalVerbs = () =>
  memo<PhrasalVerb[]>('phrasal', () => import('./generated/phrasal-verbs.json'));
export const loadJeopardy = () =>
  memo<JeopardyTopic[]>('jeopardy', () => import('./generated/jeopardy-topics.json'));
export const loadTravelGuides = () =>
  memo<TravelGuide[]>('travel', () => import('./generated/travel-guides.json'));
export const loadVerbLab = () => memo<VerbLabData>('verblab', () => import('./generated/verb-lab.json'));
/** The C1 academic verb bank (also flagged `c1` in the Verb Lab list). */
export const loadAcademicVerbs = () =>
  memo<AcademicVerb[]>('academic-verbs', () => import('./generated/academic-verbs.json') as Promise<{ default: AcademicVerb[] }>);
/** Extra examples: phrasal verbs keyed by `${pv}|${def}`, verbs keyed by base form. */
export const loadPhrasalExamples = () =>
  memo<Record<string, string[]>>('pv-examples', () => import('./generated/phrasal-examples.json') as Promise<{ default: Record<string, string[]> }>);
export const loadVerbExamples = () =>
  memo<Record<string, { base?: string; past?: string; part?: string }>>(
    'verb-examples',
    () => import('./generated/verb-examples.json') as Promise<{ default: Record<string, { base?: string; past?: string; part?: string }> }>,
  );
