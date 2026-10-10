import { useMemo } from 'react';
import { usePlan } from '@/store/plan';
import { useProgress, currentLevel, levelCompletion } from '@/store/progress';
import { evaluatePlan, recommend, skillProfile } from '@/lib/planner';

/** Current plan + its live evaluation, skill profile and recommendations. */
export function usePlanState() {
  const plan = usePlan((s) => s.current);
  const manual = usePlan((s) => s.manual);
  const history = usePlan((s) => s.history);
  const activity = useProgress((s) => s.activity);
  const skillXp = useProgress((s) => s.skillXp);
  const units = useProgress((s) => s.units);

  return useMemo(() => {
    const ev = plan ? evaluatePlan(plan, activity, manual) : null;
    const profile = skillProfile(activity, skillXp);
    const level = currentLevel(units);
    const recs = recommend({ plan, ev, profile, units, level, levelRatio: levelCompletion(units, level).ratio, history });
    return { plan, ev, profile, recs, history, level };
  }, [plan, manual, history, activity, skillXp, units]);
}
