/** CEFR levels covered by the platform. C2 is reserved for future content. */
export type CefrLevel = 'A1' | 'A2' | 'B1' | 'B2' | 'C1';
export const CEFR_LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'] as const;

export type Skill = 'listening' | 'reading' | 'writing' | 'speaking' | 'grammar' | 'vocabulary';

// ------------------------------------------------------------------ books ----

export interface VocabItem {
  term: string;
  pos?: string;
  def: string;
  use?: string;
  examples?: string[];
  colloc?: string;
}

export interface GrammarChart {
  title?: string;
  cols: string[];
  rows: string[][];
}

export interface GrammarFix {
  wrong: string;
  right: string;
  why: string;
}

export interface DialogueLine {
  sp: string;
  line: string;
}

export interface GrammarPoint {
  name: string;
  short?: string;
  rule?: string;
  form?: string[];
  notes?: string[];
  examples?: string[];
  watch?: string;
  deep?: string;
  chart?: GrammarChart;
  more?: string[];
  fix?: GrammarFix[];
  drill?: { name?: string; prompt?: string; items?: string[] };
  dialogue?: DialogueLine[];
  contrast?: GrammarChart;
  sound?: string;
}

export interface QuizQuestion {
  q: string;
  options: string[];
  answer: number;
  explain?: string;
}

export interface SpeakingTask {
  kind?: string;
  text: string;
}

export interface Dynamic {
  name: string;
  mode?: string;
  minutes?: string;
  how?: string;
  payoff?: string;
}

export interface WritingTask {
  title: string;
  brief: string;
  length?: string;
  criteria?: string[];
  model?: string;
}

export interface Unit {
  n: number;
  title: string;
  classes?: string;
  pages?: string;
  color: string;
  icon?: string;
  theme: string;
  world: string | null;
  overview: { intro: string; goals: string[]; outcome: string };
  vocab: VocabItem[];
  grammar: GrammarPoint[];
  speaking?: SpeakingTask[];
  tips?: string[];
  quiz?: QuizQuestion;
  test?: QuizQuestion[];
  dynamics?: Dynamic[];
  writing?: WritingTask;
  homework?: { title: string; task: string };
  board?: string[];
}

export interface LevelBook {
  level: CefrLevel;
  book: string;
  module: string;
  units: Unit[];
}

// ------------------------------------------------- A1 Foundations course ----

export interface CourseBlockBase {
  t: string;
  title?: string;
  hint?: string;
  help?: string;
}

export type CourseBlock = CourseBlockBase & Record<string, unknown>;

export interface CourseTopic {
  id: string;
  label: string;
  icon: string;
  title: string;
  kicker?: string;
  blocks: CourseBlock[];
}

export interface CourseUnit {
  n: string;
  id: string;
  title: string;
  es: string;
  blurb: string;
  tags: string[];
  color: string;
  topics: CourseTopic[];
}

// ---------------------------------------------------------- phrasal verbs ----

export interface PhrasalVerb {
  pv: string;
  def: string;
  ex: string;
  emoji: string;
  family: string;
  color: string;
  level: CefrLevel;
  es: string;
  ctx: string[];
}

// --------------------------------------------------- jeopardy question bank ----

export interface JeopardyTopic {
  id: string;
  name: string;
  cats: string[];
  /** q[level]["<catIndex>-<points>"] = [question, answer][] */
  q: Partial<Record<CefrLevel, Record<string, [string, string][]>>>;
}

// ------------------------------------------- travel guides (Earth Modals) ----

export interface TravelGuide {
  name: string;
  nameEs: string;
  capital: string;
  capitalEs: string;
  iso: string;
  visitors: string;
  photo: string;
  photoEs: string;
  en: { cans: string[]; shoulds: string[]; musts: string[] };
  es: { cans: string[]; shoulds: string[]; musts: string[] };
}
