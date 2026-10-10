import { useAsync } from './useAsync';
import { loadLevel } from '@/content/levels';
import { currentLevel, useProgress } from '@/store/progress';
import type { Unit, CefrLevel } from '@/content/types';

/** The first unit of the learner's current level they haven't completed. */
export function useNextUnit(): { level: CefrLevel; unit: Unit | null; loading: boolean } {
  const units = useProgress((s) => s.units);
  const level = currentLevel(units);
  const { data, loading } = useAsync(() => loadLevel(level), [level]);
  const unit = data?.units.find((u) => !units[`${level}-${u.n}`]) ?? data?.units[0] ?? null;
  return { level, unit, loading };
}
