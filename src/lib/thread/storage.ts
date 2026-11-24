/**
 * Guardado en localStorage (versionado, con migración tolerante), exportar/importar JSON y duplicar.
 * Claves: ecyr.thread.v2.threads (máx. 50), ecyr.thread.v2.draft, ecyr.thread.v2.prefs.
 */
import type { CefrLevel } from '../../content/types';
import { EMPTY_MIX, dominant, type Mix } from '../engagement';
import { BRIDGES } from './bridgeData';
import type { Anchor, Bridge, Resource, Stage, Thread } from './types';
import { uid } from './types';

export const KEYS = { threads: 'ecyr.thread.v2.threads', draft: 'ecyr.thread.v2.draft', prefs: 'ecyr.thread.v2.prefs' };
export const MAX_THREADS = 50;
export const THREAD_VERSION = 2;

const memory = new Map<string, string>();
const ls = {
  get: (k: string): string | null => {
    try {
      return typeof localStorage !== 'undefined' ? localStorage.getItem(k) : (memory.get(k) ?? null);
    } catch {
      return memory.get(k) ?? null;
    }
  },
  set: (k: string, v: string) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.setItem(k, v);
      else memory.set(k, v);
    } catch {
      memory.set(k, v);
    }
  },
  del: (k: string) => {
    try {
      if (typeof localStorage !== 'undefined') localStorage.removeItem(k);
    } catch {
      /* private mode */
    }
    memory.delete(k);
  },
};

const LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const rec = (x: unknown): Record<string, unknown> => (x && typeof x === 'object' && !Array.isArray(x) ? (x as Record<string, unknown>) : {});
const arr = (x: unknown): unknown[] => (Array.isArray(x) ? x : []);
const str = (x: unknown, d = '') => (typeof x === 'string' ? x : d);
const num = (x: unknown, d = 0) => (typeof x === 'number' && Number.isFinite(x) ? x : d);

/** Convierte lo guardado (también de versiones futuras) en un Thread válido; lanza si no hay nada aprovechable. */
export function migrate(raw: unknown): Thread {
  const o = rec(raw);
  const level = LEVELS.includes(o.level as CefrLevel) ? (o.level as CefrLevel) : null;
  if (!level || !Array.isArray(o.anchors) || !Array.isArray(o.stages) || !o.bridge || typeof o.bridge !== 'object') throw new Error('El archivo no parece un hilo de clase válido.');
  const b = rec(o.bridge);
  const bridge = normBridge(b);
  const mix = { ...EMPTY_MIX, ...Object.fromEntries(Object.entries(rec(o.mix)).map(([k, v]) => [k, num(v)])) } as Mix;
  const stages = arr(o.stages).map((s) => normStage(rec(s)));
  const anchors = arr(o.anchors).map(rec).map((a) => ({ ...a, id: str(a.id, uid('a')), profile: normProfile(rec(a.profile)) })) as unknown as Anchor[];
  const now = Date.now();
  const e = rec(o.energizer);
  const tc = rec(o.teamChallenge);
  const hw = rec(o.homework);
  return {
    version: THREAD_VERSION,
    id: str(o.id, uid('t')),
    name: str(o.name),
    createdAt: num(o.createdAt, now),
    updatedAt: num(o.updatedAt, now),
    level,
    duration: num(o.duration, 60),
    mix,
    audience: (['kids', 'teens', 'young', 'adults'].includes(str(o.audience)) ? o.audience : dominant(mix)) as Thread['audience'],
    anchors,
    bridge,
    alternatives: arr(o.alternatives).map((x) => normBridge(rec(x))),
    stages,
    hook: str(o.hook),
    energizer: { title: str(e.title), minutes: num(e.minutes, 2), how: str(e.how) },
    teamChallenge: { enabled: tc.enabled !== false, vocab: arr(tc.vocab).map((x) => str(x)).filter(Boolean), grammar: arr(tc.grammar).map((x) => str(x)).filter(Boolean) },
    homework: { title: str(hw.title, 'Tarea'), task: str(hw.task) },
    source: (['local', 'ia', 'user'].includes(str(o.source)) ? o.source : 'local') as Thread['source'],
    seed: num(o.seed, 0),
    style: typeof o.style === 'string' ? o.style : undefined,
    userContext: typeof o.userContext === 'string' ? o.userContext : undefined,
  };
}

function normProfile(p: Record<string, unknown>) {
  return { fns: arr(p.fns), doms: arr(p.doms), time: str(p.time, 'any'), weight: num(p.weight, 1), confidence: str(p.confidence, 'high') };
}

function normBridge(b: Record<string, unknown>): Bridge {
  const def = BRIDGES.find((x) => x.id === b.id);
  return {
    id: str(b.id, uid('b')),
    title: str(b.title, def?.title ?? 'Contexto'),
    setting: str(b.setting, def?.setting ?? 'the class'),
    roles: arr(b.roles).map((x) => str(x)).filter(Boolean).length ? arr(b.roles).map((x) => str(x)).filter(Boolean) : (def?.roles ?? ['a student']),
    conflict: str(b.conflict, def?.conflict ?? ''),
    doms: arr(b.doms) as Bridge['doms'],
    fns: arr(b.fns) as Bridge['fns'],
    rationale: Object.fromEntries(Object.entries(rec(b.rationale)).map(([k, v]) => [k, str(v)])),
    source: (['local', 'ia', 'user'].includes(str(b.source)) ? b.source : 'local') as Bridge['source'],
    characters: arr(b.characters).map(rec).map((c) => ({ name: str(c.name), role: str(c.role) })),
    where: typeof b.where === 'string' ? b.where : def?.where,
    the: typeof b.the === 'string' ? b.the : def?.the,
    motion: typeof b.motion === 'string' ? b.motion : def?.motion,
    resolution: typeof b.resolution === 'string' ? b.resolution : def?.resolution,
    setting_es: typeof b.setting_es === 'string' ? b.setting_es : def?.setting_es,
    roles_es: arr(b.roles_es).length ? arr(b.roles_es).map((x) => str(x)) : def?.roles_es,
  };
}

function normResource(r: Record<string, unknown>): Resource {
  return {
    id: str(r.id, uid('r')),
    kind: str(r.kind, 'board') as Resource['kind'],
    title: str(r.title),
    content: rec(r.content),
    targets: arr(r.targets).map(rec).map((t) => ({ anchorId: str(t.anchorId), hits: num(t.hits) })),
    source: (['local', 'ia', 'user'].includes(str(r.source)) ? r.source : 'local') as Resource['source'],
    locked: r.locked === true,
    edited: r.edited === true,
    fallback: r.fallback === true ? true : undefined,
    validation: r.validation && typeof r.validation === 'object' ? (r.validation as Resource['validation']) : undefined,
  };
}

function normStage(s: Record<string, unknown>): Stage {
  const tr = rec(s.transition);
  const bk = rec(s.book);
  const ref = rec(s.grammarRef);
  return {
    id: str(s.id, uid('s')),
    kind: str(s.kind, 'presentation') as Stage['kind'],
    anchorId: typeof s.anchorId === 'string' ? s.anchorId : undefined,
    title: str(s.title),
    minutes: num(s.minutes),
    grouping: (['whole', 'pairs', 'groups', 'solo'].includes(str(s.grouping)) ? s.grouping : 'whole') as Stage['grouping'],
    teacherRole: str(s.teacherRole),
    transition: str(tr.student_en) || str(tr.teacher_es) ? { teacher_es: str(tr.teacher_es), student_en: str(tr.student_en), from: typeof tr.from === 'string' ? tr.from : undefined } : undefined,
    successCriteria: arr(s.successCriteria).length ? arr(s.successCriteria).map((x) => str(x)) : undefined,
    resources: arr(s.resources).map((r) => normResource(rec(r))),
    locked: s.locked === true,
    notes: typeof s.notes === 'string' ? s.notes : undefined,
    grammarRef: typeof ref.unit === 'number' ? { unit: ref.unit, point: num(ref.point), diagramKey: typeof ref.diagramKey === 'string' ? ref.diagramKey : undefined } : undefined,
    book: s.kind === 'practice' ? { book: str(bk.book), page: str(bk.page), exercises: str(bk.exercises) } : undefined,
  };
}

// ---------------------------------------------------------------- guardados --

export function listThreads(): Thread[] {
  try {
    const raw = JSON.parse(ls.get(KEYS.threads) ?? '[]') as unknown[];
    return raw.flatMap((x) => {
      try {
        return [migrate(x)];
      } catch {
        return [];
      }
    });
  } catch {
    return [];
  }
}

const writeAll = (all: Thread[]) => ls.set(KEYS.threads, JSON.stringify(all.slice(0, MAX_THREADS)));

/** Guarda (o actualiza) un hilo con nombre; el más reciente primero. */
export function saveThread(t: Thread, name?: string): Thread {
  const saved = { ...t, name: (name ?? t.name).trim() || t.bridge.title, updatedAt: Date.now() };
  writeAll([saved, ...listThreads().filter((x) => x.id !== saved.id)]);
  return saved;
}

export function deleteThread(id: string) {
  writeAll(listThreads().filter((x) => x.id !== id));
}

export const saveDraft = (t: Thread) => ls.set(KEYS.draft, JSON.stringify(t));
export const clearDraft = () => ls.del(KEYS.draft);
export function loadDraft(): Thread | null {
  try {
    const raw = ls.get(KEYS.draft);
    return raw ? migrate(JSON.parse(raw)) : null;
  } catch {
    return null;
  }
}

export interface Prefs {
  level: CefrLevel;
  duration: number;
  mix: Mix;
  useAi: boolean;
  style?: string;
}
export const DEFAULT_PREFS: Prefs = { level: 'B1', duration: 60, mix: { ...EMPTY_MIX, teens: 12 }, useAi: true };

export function loadPrefs(): Prefs {
  try {
    const p = JSON.parse(ls.get(KEYS.prefs) ?? '{}') as Partial<Prefs>;
    return { ...DEFAULT_PREFS, ...p, mix: { ...DEFAULT_PREFS.mix, ...(p.mix ?? {}) } };
  } catch {
    return DEFAULT_PREFS;
  }
}
export const savePrefs = (p: Prefs) => ls.set(KEYS.prefs, JSON.stringify(p));

/** Ids de los contextos usados en los últimos hilos guardados (para dar variedad). */
export const recentBridgeIds = (n = 5) => listThreads().slice(0, n).map((t) => t.bridge.id);

// -------------------------------------------------------- exportar / importar --

export const exportFilename = (t: Thread) => `hilo-${(t.name || t.bridge.title).toLowerCase().replace(/[^a-z0-9áéíóúñ]+/gi, '-').replace(/^-|-$/g, '') || 'clase'}.json`;
export const exportThread = (t: Thread) => JSON.stringify({ app: 'ecyr-thread', version: THREAD_VERSION, thread: t }, null, 2);

/** Cambia todos los ids (hilo, anclas, etapas, recursos) y mantiene las referencias entre ellos. */
export function reid(t: Thread): Thread {
  const map = new Map<string, string>();
  const nid = (old: string, p: string) => {
    if (!map.has(old)) map.set(old, uid(p));
    return map.get(old)!;
  };
  const anchors = t.anchors.map((a) => ({ ...a, id: nid(a.id, 'a') })) as Anchor[];
  const fix = (id?: string) => (id ? (map.get(id) ?? id) : id);
  const rationale = (b: Bridge) => ({ ...b, rationale: Object.fromEntries(Object.entries(b.rationale).map(([k, v]) => [fix(k)!, v])) });
  return {
    ...t,
    id: uid('t'),
    anchors,
    bridge: rationale(t.bridge),
    alternatives: t.alternatives.map(rationale),
    stages: t.stages.map((s) => ({
      ...s,
      id: uid('s'),
      anchorId: fix(s.anchorId),
      transition: s.transition ? { ...s.transition, from: fix(s.transition.from) } : undefined,
      resources: s.resources.map((r) => ({ ...r, id: uid('r'), targets: r.targets.map((x) => ({ ...x, anchorId: fix(x.anchorId)! })) })),
    })),
  };
}

export function importThread(text: string): Thread {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    throw new Error('El archivo no es JSON válido.');
  }
  const o = rec(data);
  const inner = o.thread ? o.thread : data;
  return reid(migrate(inner));
}
