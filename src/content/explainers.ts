import type { CefrLevel } from './types';
import type { Explainer } from '@/features/learn/unit/Explainer';

/** Visual explainers per level, keyed "A1-2-0" (level-unit-point). Missing files simply mean none yet. */
const files = import.meta.glob<{ default: Record<string, Explainer> }>('./generated/explainers-*.json');
const cache = new Map<string, Promise<Record<string, Explainer>>>();

export function loadExplainers(level: CefrLevel): Promise<Record<string, Explainer>> {
  const key = level.toLowerCase();
  if (!cache.has(key)) {
    const load = files[`./generated/explainers-${key}.json`];
    cache.set(key, load ? load().then((m) => m.default) : Promise.resolve({}));
  }
  return cache.get(key)!;
}
