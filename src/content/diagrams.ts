import type { CefrLevel } from './types';
import type { DiagramSpec } from '@/features/learn/unit/diagramKinds';

/** One diagram or a short list of them for a grammar point. */
export type DiagramEntry = DiagramSpec | DiagramSpec[];

/**
 * Data-driven diagrams per level, keyed "A2-11-0" (level-unit-point). Missing files simply mean none yet.
 * Format: see the JSDoc at the top of `src/features/learn/unit/diagramKinds.tsx`.
 */
const files = import.meta.glob<{ default: Record<string, DiagramEntry> }>('./generated/diagrams-*.json');
const cache = new Map<string, Promise<Record<string, DiagramEntry>>>();

export function loadDiagrams(level: CefrLevel): Promise<Record<string, DiagramEntry>> {
  const key = level.toLowerCase();
  if (!cache.has(key)) {
    const load = files[`./generated/diagrams-${key}.json`];
    cache.set(key, load ? load().then((m) => m.default) : Promise.resolve({}));
  }
  return cache.get(key)!;
}
