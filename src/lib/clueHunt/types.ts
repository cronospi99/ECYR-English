/* Clue hunt packs: data only. The engine (src/features/cluehunt) is generic; an event is a JSON pack. */
export interface Bi { en: string; fr: string }
export type CardKind = 'clue' | 'question' | 'riddle';
export type CardSource = 'template' | 'planner' | 'canva' | 'draft';
export type CheckpointIcon = 'diya' | 'rangoli' | 'fireworks' | 'lotus' | 'lantern' | 'sweets' | 'rama' | 'lakshmi';

export interface HuntCard {
  id: string;
  label: Bi;
  /** Shown until the card is solved (the full label may give the answer away). */
  shortLabel?: Bi;
  kind: CardKind;
  prompt: Bi;
  answer: Bi;
  /** Regex sources tested on the normalized (and fuzzy-corrected) answer. */
  accept: string[];
  reject?: string[];
  /** If no accept matches and one of these does (e.g. Spanish answers): not a wrong attempt, ask for EN/FR. */
  nudge?: string[];
  /** Words (>= 5 letters) a student may misspell by one letter. */
  fuzzy: string[];
  hint: Bi;
  funFact: Bi;
  source: CardSource;
  enabled: boolean;
  needsConfirmation: boolean;
}

export interface HuntCheckpoint {
  id: string;
  /** Word printed on the hidden poster (UPPERCASE). */
  code: string;
  title: Bi;
  blurb: Bi;
  icon: CheckpointIcon;
  cards: HuntCard[];
}

export interface SupportLink { label: Bi; url: string; kind: string; teacherOnly: boolean }

export interface HuntPack {
  id: string;
  version: number;
  title: Bi;
  subtitle: Bi;
  scoring: { correct: number; hintCost: number; minPerCard: number };
  checkpoints: HuntCheckpoint[];
  supportLinks: SupportLink[];
  pending: string[];
}

/** Progress of one team (or one device in local mode). */
export interface TeamProg {
  /** Checkpoint ids opened with their code word. */
  unlocked: string[];
  /** cardId -> points won, hint used, ms since the start. */
  solved: Record<string, { pts: number; hint: boolean; t: number }>;
  /** Cards where the hint was used (even unsolved). */
  hints: string[];
  tries: number;
}

export interface HuntOpts { codes: boolean; drafts: boolean }
