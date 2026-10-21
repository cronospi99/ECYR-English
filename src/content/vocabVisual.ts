import type { CefrLevel } from './types';

/**
 * Visual vocabulary: picture cards by CEFR level and topic, built from the
 * teacher's class decks (clothes, weather, countries and flags), the
 * infographics in public/visuals and emoji illustrations. One JSON file per
 * level in ./generated/vocab-visual-<level>.json; images in
 * public/visuals/vocab/<topic>/ and public/visuals/clothing/.
 */
export interface VisualWord {
  id: string;
  en: string;
  es: string;
  /** Example sentence (original). */
  ex: string;
  /** The exact words in `ex` that a gap-fill blanks out. */
  form?: string;
  /** No gap-fill for this card (letters, countries). */
  nogap?: boolean;
  img?: string;
  emoji?: string;
  /** Plain-English definition (idioms and higher-level words). */
  def?: string;
  note?: string;
  group?: string;
  /** What the voice says instead of the word itself. */
  say?: string;
  /** Countries: nationality and flag picture. */
  nat?: string;
  flag?: string;
}

export interface VisualFigure {
  src: string;
  title: string;
  titleEs?: string;
  w: number;
  h: number;
}

export interface VisualTopic {
  id: string;
  level: CefrLevel;
  title: string;
  titleEs: string;
  emoji: string;
  color: string;
  cover?: string;
  /** Spanish intro; may contain <b>/<i>. */
  intro_es: string;
  tip_es?: string;
  figures?: VisualFigure[];
  /** 'freepik': images and icons from the class decks (Freepik / Flaticon). */
  credit?: 'freepik';
  /** A bespoke activity shown under the cards. */
  extra?: 'wearing' | 'weather' | 'countries' | 'spelling' | 'forecast';
  items: VisualWord[];
}

export const VISUAL_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];

type Mod = { default: { level: CefrLevel; topics: VisualTopic[] } };
const files = import.meta.glob<Mod>('./generated/vocab-visual-*.json');
const cache = new Map<string, Promise<VisualTopic[]>>();

export function loadVisualTopics(level: CefrLevel): Promise<VisualTopic[]> {
  const key = level.toLowerCase();
  if (!cache.has(key)) {
    const load = files[`./generated/vocab-visual-${key}.json`];
    cache.set(key, load ? load().then((m) => m.default.topics) : Promise.resolve([]));
  }
  return cache.get(key)!;
}

export async function loadVisualTopic(level: CefrLevel, id: string): Promise<VisualTopic | null> {
  return (await loadVisualTopics(level)).find((t) => t.id === id) ?? null;
}

/** Topic counts for the level selector, without loading every file. */
export const VISUAL_TOPIC_COUNT: Record<CefrLevel, number> = { A1: 8, A2: 6, B1: 4, B2: 4, C1: 4, C2: 3 };

export const VISUAL_CREDIT = 'Imágenes e íconos: Freepik / Flaticon (presentaciones de clase con plantilla de Slidesgo).';
