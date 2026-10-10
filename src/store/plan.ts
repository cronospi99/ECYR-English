import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PlanPrefs, PlanSummary, WeekPlan } from '@/lib/planner';

export interface PlanData {
  current: WeekPlan | null;
  /** taskId → ISO time the learner ticked it by hand. */
  manual: Record<string, string>;
  history: PlanSummary[];
  lastPrefs: PlanPrefs | null;
  updatedAt: string;
}

interface PlanActions {
  start: (plan: WeekPlan, archived?: PlanSummary) => void;
  toggle: (taskId: string) => void;
  removeTask: (taskId: string) => void;
  archive: (summary: PlanSummary) => void;
  replace: (d: PlanData) => void;
}

const now = () => new Date().toISOString();
const HISTORY_MAX = 26;

const pushHistory = (h: PlanSummary[], s?: PlanSummary) =>
  s ? [s, ...h.filter((x) => x.id !== s.id)].slice(0, HISTORY_MAX) : h;

export const usePlan = create<PlanData & PlanActions>()(
  persist(
    (set) => ({
      current: null,
      manual: {},
      history: [],
      lastPrefs: null,
      updatedAt: new Date(0).toISOString(),

      start: (plan, archived) =>
        set((s) => ({
          current: plan,
          manual: {},
          lastPrefs: plan.prefs,
          history: pushHistory(s.history, archived),
          updatedAt: now(),
        })),
      toggle: (id) =>
        set((s) => {
          const manual = { ...s.manual };
          if (manual[id]) delete manual[id];
          else manual[id] = now();
          return { manual, updatedAt: now() };
        }),
      removeTask: (id) =>
        set((s) =>
          s.current ? { current: { ...s.current, tasks: s.current.tasks.filter((t) => t.id !== id) }, updatedAt: now() } : {},
        ),
      archive: (summary) =>
        set((s) => ({ current: null, manual: {}, history: pushHistory(s.history, summary), updatedAt: now() })),
      replace: (d) => set(d),
    }),
    { name: 'ecyr:plan', version: 1 },
  ),
);

export function planSnapshot(): PlanData {
  const { current, manual, history, lastPrefs, updatedAt } = usePlan.getState();
  return { current, manual, history, lastPrefs, updatedAt };
}

/**
 * Accepts a plan record from the cloud only if it has the expected shape
 * (it is the learner's own data, but may come from an older app version).
 */
export function sanitizePlan(v: unknown): PlanData | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as Record<string, unknown>;
  if (typeof o.updatedAt !== 'string' || !Array.isArray(o.history) || typeof o.manual !== 'object' || !o.manual) return null;
  const c = o.current as Record<string, unknown> | null;
  if (c !== null && (typeof c !== 'object' || !Array.isArray(c.tasks) || typeof c.start !== 'string' || typeof c.end !== 'string')) return null;
  const tasksOk =
    !c ||
    (c.tasks as unknown[]).every((t) => {
      const x = t as Record<string, unknown>;
      return x && typeof x.id === 'string' && typeof x.to === 'string' && x.to.startsWith('/') && !x.to.startsWith('//') && typeof x.title === 'string';
    });
  if (!tasksOk) return null;
  return {
    current: (c as unknown as WeekPlan) ?? null,
    manual: Object.fromEntries(Object.entries(o.manual as Record<string, unknown>).filter(([, t]) => typeof t === 'string')) as Record<
      string,
      string
    >,
    history: (o.history as PlanSummary[]).filter((h) => h && typeof h.id === 'string').slice(0, HISTORY_MAX),
    lastPrefs: (o.lastPrefs as PlanPrefs) ?? null,
    updatedAt: o.updatedAt,
  };
}
