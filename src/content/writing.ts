import type { CefrLevel, WritingTask } from './types';
import { loadLevel } from './levels';

/** A writing task as listed for a unit: the book's own task (k = 0) followed by ECYR's extras (k = 1…). */
export interface UnitWritingTask extends WritingTask {
  /** Stable id, `${level}-${unit}-${k}`. */
  id: string;
  k: number;
  /** True for the task that comes with the unit in the book (C1: src/content/c1-writing.json). */
  book: boolean;
  /** localStorage key of the draft — the book task keeps the original key. */
  storageKey: string;
}

export interface UnitWriting {
  level: CefrLevel;
  n: number;
  title: string;
  theme: string;
  color: string;
  tasks: UnitWritingTask[];
}

type Extra = Record<string, WritingTask[]>;

// One chunk per level, fetched only when that level is opened.
const extras: Record<CefrLevel, () => Promise<{ default: unknown }>> = {
  A1: () => import('./generated/writing-extra-a1.json'),
  A2: () => import('./generated/writing-extra-a2.json'),
  B1: () => import('./generated/writing-extra-b1.json'),
  B2: () => import('./generated/writing-extra-b2.json'),
  C1: () => import('./generated/writing-extra-c1.json'),
};

export const writingStorageKey = (level: CefrLevel, n: number, k: number) => (k === 0 ? `ecyr:writing:${level}-${n}` : `ecyr:writing:${level}-${n}-x${k}`);

const cache = new Map<CefrLevel, Promise<UnitWriting[]>>();

/** Every unit of a level with all of its writing tasks, in unit order. */
export function loadWritingTasks(level: CefrLevel): Promise<UnitWriting[]> {
  let p = cache.get(level);
  if (!p) {
    p = Promise.all([loadLevel(level), extras[level]().then((m) => m.default as Extra)]).then(([book, extra]) =>
      book.units.map((u) => {
        const task = (t: WritingTask, k: number): UnitWritingTask => ({ ...t, id: `${level}-${u.n}-${k}`, k, book: k === 0, storageKey: writingStorageKey(level, u.n, k) });
        const tasks = [...(u.writing ? [task(u.writing, 0)] : []), ...(extra[String(u.n)] ?? []).map((t, i) => task(t, i + 1))];
        return { level, n: u.n, title: u.title, theme: u.theme, color: u.color, tasks };
      }),
    );
    p.catch(() => cache.delete(level));
    cache.set(level, p);
  }
  return p;
}

export const loadUnitWriting = (level: CefrLevel, n: number) => loadWritingTasks(level).then((units) => units.find((u) => u.n === n) ?? null);
