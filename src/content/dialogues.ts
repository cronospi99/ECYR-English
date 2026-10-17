import type { CefrLevel } from './types';

/**
 * Extra dialogues for each grammar point, keyed "A1-2-0" (level-unit-point),
 * written so every line uses the point. Files: src/content/generated/dialogues-<level>.json.
 * Missing files simply mean none yet.
 */
export interface CastMember {
  name: string;
  voice: 'female' | 'male';
  accent: 'us' | 'uk' | 'au';
}

export interface ExtraDialogue {
  title: string;
  /** Spanish title. */
  titleEs: string;
  /** One emoji + a short Spanish context line, e.g. "☕ En una cafetería: Ana pide algo para llevar." */
  scene: string;
  cast: CastMember[];
  /** `sp` is a cast member's name; `es` is the Spanish translation of `line`. */
  lines: { sp: string; line: string; es: string }[];
}

const files = import.meta.glob<{ default: Record<string, ExtraDialogue[]> }>('./generated/dialogues-*.json');
const cache = new Map<string, Promise<Record<string, ExtraDialogue[]>>>();

export function loadDialogues(level: CefrLevel): Promise<Record<string, ExtraDialogue[]>> {
  const key = level.toLowerCase();
  if (!cache.has(key)) {
    const load = files[`./generated/dialogues-${key}.json`];
    cache.set(key, load ? load().then((m) => m.default) : Promise.resolve({}));
  }
  return cache.get(key)!;
}
