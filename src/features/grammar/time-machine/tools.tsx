import type { ComponentType } from 'react';
import type { CefrLevel } from '@/content/types';
import {
  DateBuilderGame,
  DateFormatsTool,
  DaysOfWeek,
  EdSpellingDrill,
  IngSpellingTool,
  IrregularVerbsTable,
  MonthsGallery,
  OrdinalsTool,
  PastSimpleEdRules,
  SentenceTimeline,
  StageLesson,
  StageQuiz,
  TenseTimelineChart,
  TimeWords,
  VideoActivity,
  VideoNotebook,
  WasWereTool,
  YearReader,
} from './components';
import type { StageId } from './data';

export interface TimeMachineTool {
  title: string;
  description: string;
  levels: CefrLevel[];
  /** Grammar topics the tool fits (for mapping into units). */
  topics: string[];
  /** Id used in the XP `ref` (grammar:time-machine:<ref>) when the tool awards XP. */
  ref?: string;
  Component: ComponentType;
}

const lesson = (id: StageId) => () => <StageLesson id={id} />;
const quiz = (id: StageId) => () => <StageQuiz id={id} />;

/** Every embeddable piece of the Time Machine, so lessons can drop in exactly what they need. */
export const TIME_MACHINE_TOOLS = {
  months: { title: 'Months of the year', description: 'Los 12 meses con imagen, audio de clase, pronunciación (aprox. + IPA) y celebración colombiana.', levels: ['A1'], topics: ['months', 'prepositions of time (in/on)', 'Colombian holidays'], Component: MonthsGallery },
  ordinals: { title: 'Ordinal numbers lab', description: 'Cualquier número → 1st/2nd/3rd/11th–13th… y en palabras, más la tabla de días 1–31.', levels: ['A1'], topics: ['ordinal numbers', 'dates'], Component: OrdinalsTool },
  'date-formats': { title: 'Date formats · US vs UK', description: 'Fecha → día de la semana y formas escrita, numérica y hablada en inglés americano y británico.', levels: ['A1', 'A2'], topics: ['dates', 'ordinal numbers', 'days of the week'], Component: DateFormatsTool },
  'date-builder': { title: 'Build the date (game)', description: 'Ordena las piezas de una fecha histórica (con una trampa de ordinal).', levels: ['A1'], topics: ['dates', 'ordinal numbers'], ref: 'date-builder', Component: () => <DateBuilderGame /> },
  years: { title: 'Year reader', description: 'Cualquier año → lectura dividida (natural) y número completo (US/UK), con las reglas de 00, oh, 2000–2009 y 2010+.', levels: ['A1', 'A2'], topics: ['years', 'numbers', 'dates'], Component: YearReader },
  days: { title: 'Days of the week', description: 'Los siete días con audio y on Monday / on Mondays.', levels: ['A1'], topics: ['days of the week', 'prepositions of time', 'routines'], Component: DaysOfWeek },
  'ed-rules': { title: 'Spelling lab · -ed', description: 'Motor de ortografía del pasado: duplicación por acento, y→ied, e→d, w/x/y, -ic, US vs UK (-l).', levels: ['A1', 'A2'], topics: ['past simple', 'regular verbs', 'spelling'], Component: PastSimpleEdRules },
  'ed-spelling': { title: 'Spell the past (drill)', description: 'Elige la ortografía correcta del pasado regular — 8 rondas con XP.', levels: ['A1', 'A2'], topics: ['past simple', 'regular verbs', 'spelling'], ref: 'ed-spelling', Component: () => <EdSpellingDrill /> },
  irregulars: { title: 'Irregular verbs', description: 'Lista buscable base / pasado / participio con audio.', levels: ['A1', 'A2', 'B1'], topics: ['past simple', 'irregular verbs', 'past participle', 'present perfect', 'past perfect'], Component: IrregularVerbsTable },
  'time-words': { title: 'Time words', description: 'Adverbios de tiempo, conectores (when, while, before…) y ago / for, con ejemplos en audio.', levels: ['A1', 'A2'], topics: ['adverbs of time', 'past simple', 'time connectors'], Component: TimeWords },
  'was-were': { title: 'Was or were?', description: 'Cualquier sujeto → was / were con la razón y las formas + − ?.', levels: ['A1'], topics: ['was / were', 'past of to be'], Component: WasWereTool },
  'ing-rules': { title: 'Spelling lab · -ing', description: 'Ortografía de -ing: e muda, ie→y, be/see, duplicación con acento.', levels: ['A1', 'A2'], topics: ['present continuous', 'past continuous', 'spelling'], Component: IngSpellingTool },
  'tense-chart': { title: 'Past tenses chart', description: 'Dónde se ubica cada tiempo: past perfect, past continuous, past simple.', levels: ['A2', 'B1'], topics: ['past continuous', 'past perfect', 'narrative tenses'], Component: TenseTimelineChart },
  timeline: { title: 'Sentence timeline', description: 'Tres acciones en forma base → una oración con past perfect + past continuous + past simple (when / while / by the time).', levels: ['B1'], topics: ['narrative tenses', 'past perfect', 'past continuous', 'past simple'], ref: 'timeline', Component: SentenceTimeline },
  video: { title: 'Video activity', description: 'Dos videos “Draw My Life” (LeBron James, Amelia Earhart) con preguntas y respuestas modelo en pasado.', levels: ['A2', 'B1'], topics: ['past simple', 'biographies', 'dates', 'listening'], Component: VideoActivity },
  notebook: { title: 'Video notebook', description: 'Cuaderno para responder en pasado simple (se guarda en el dispositivo).', levels: ['A2', 'B1'], topics: ['past simple', 'writing'], Component: VideoNotebook },
  // full lessons and quizzes of every stage
  'lesson-months': { title: 'Lesson · Months', description: 'Etapa 1 completa (explicación, tablas, errores).', levels: ['A1'], topics: ['months', 'in / on'], Component: lesson('months') },
  'lesson-dates': { title: 'Lesson · Writing dates', description: 'Etapa 2 completa.', levels: ['A1'], topics: ['dates', 'ordinal numbers'], Component: lesson('dates') },
  'lesson-years': { title: 'Lesson · Saying the years', description: 'Etapa 3 completa.', levels: ['A1', 'A2'], topics: ['years'], Component: lesson('years') },
  'lesson-days': { title: 'Lesson · Days of the week', description: 'Etapa 4 completa.', levels: ['A1'], topics: ['days of the week'], Component: lesson('days') },
  'lesson-past': { title: 'Lesson · Past simple', description: 'Etapa 5 completa.', levels: ['A1', 'A2'], topics: ['past simple'], Component: lesson('past') },
  'lesson-tobe': { title: 'Lesson · Was / Were', description: 'Etapa 6 completa.', levels: ['A1'], topics: ['was / were'], Component: lesson('tobe') },
  'lesson-cont': { title: 'Lesson · Past continuous', description: 'Etapa 7 completa.', levels: ['A2'], topics: ['past continuous'], Component: lesson('cont') },
  'lesson-perfect': { title: 'Lesson · Past perfect', description: 'Etapa 8 completa.', levels: ['B1'], topics: ['past perfect'], Component: lesson('perfect') },
  'quiz-months': { title: 'Quiz · Months', description: '5 preguntas.', levels: ['A1'], topics: ['months'], ref: 'months', Component: quiz('months') },
  'quiz-dates': { title: 'Quiz · Dates', description: '7 preguntas.', levels: ['A1'], topics: ['dates'], ref: 'dates', Component: quiz('dates') },
  'quiz-years': { title: 'Quiz · Years', description: '6 preguntas.', levels: ['A1', 'A2'], topics: ['years'], ref: 'years', Component: quiz('years') },
  'quiz-days': { title: 'Quiz · Days', description: '4 preguntas.', levels: ['A1'], topics: ['days of the week'], ref: 'days', Component: quiz('days') },
  'quiz-past': { title: 'Quiz · Past simple', description: '7 preguntas.', levels: ['A1', 'A2'], topics: ['past simple'], ref: 'past', Component: quiz('past') },
  'quiz-tobe': { title: 'Quiz · Was / Were', description: '5 preguntas.', levels: ['A1'], topics: ['was / were'], ref: 'tobe', Component: quiz('tobe') },
  'quiz-cont': { title: 'Quiz · Past continuous', description: '4 preguntas.', levels: ['A2'], topics: ['past continuous'], ref: 'cont', Component: quiz('cont') },
  'quiz-perfect': { title: 'Quiz · Past perfect', description: '5 preguntas.', levels: ['B1'], topics: ['past perfect'], ref: 'perfect', Component: quiz('perfect') },
} satisfies Record<string, TimeMachineTool>;

export type TimeMachineToolId = keyof typeof TIME_MACHINE_TOOLS;
