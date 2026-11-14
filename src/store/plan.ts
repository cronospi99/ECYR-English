import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { mergeSaved } from './safe';
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
    {
      name: 'ecyr:plan',
      version: 1,
      merge: (saved, current) => {
        const m = mergeSaved(saved, current);
        return { ...m, current: cleanWeek(m.current), lastPrefs: cleanPrefs(m.lastPrefs), history: m.history.filter((h) => h && typeof h.id === 'string') };
      },
    },
  ),
);

const list = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v.filter((x) => x !== null && x !== undefined) as T[]) : []);

/** Preferences with every list in place; null when they are not preferences at all. */
function cleanPrefs(v: unknown): PlanPrefs | null {
  if (!v || typeof v !== 'object') return null;
  const o = v as PlanPrefs;
  if (typeof o.goal !== 'string' || typeof o.level !== 'string') return null;
  return { ...o, focus: list(o.focus), reviewUnits: list(o.reviewUnits), days: list(o.days), minutes: Number(o.minutes) || 30 };
}

/** A week plan that every screen can draw; null (no plan) when it is too damaged to show. */
function cleanWeek(v: unknown): WeekPlan | null {
  if (!v || typeof v !== 'object') return null;
  const c = v as WeekPlan;
  const prefs = cleanPrefs(c.prefs);
  if (!prefs || !Array.isArray(c.tasks) || typeof c.start !== 'string' || typeof c.end !== 'string') return null;
  return { ...c, prefs, focus: list(c.focus), tasks: c.tasks.filter((t) => t && typeof t.id === 'string' && typeof t.to === 'string') };
}

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
    current: cleanWeek(c),
    manual: Object.fromEntries(Object.entries(o.manual as Record<string, unknown>).filter(([, t]) => typeof t === 'string')) as Record<
      string,
      string
    >,
    history: (o.history as PlanSummary[]).filter((h) => h && typeof h.id === 'string').slice(0, HISTORY_MAX),
    lastPrefs: cleanPrefs(o.lastPrefs),
    updatedAt: o.updatedAt,
  };
}
