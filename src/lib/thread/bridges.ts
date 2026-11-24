/**
 * Lógica de conexión: elige contextos puente que den una razón comunicativa real a CADA ancla,
 * ordena las etapas de lo conocido a lo nuevo y escribe las transiciones.
 */
import type { CefrLevel } from '../../content/types';
import { BOOK_TO_PRODUCTION, BRIDGES, FN_ES, FN_NEED, GENERIC_TRANSITION, NEED_ES, PRESENT_TO_BOOK, TRANSITIONS, bridgesFor, roleEs, settingEs, theOf, whereOf, type BridgeDef, type TransitionTemplate } from './bridgeData';
import type { Anchor, Bridge, Fn, Source } from './types';

export const anchorLabel = (a: Anchor) => (a.type === 'grammar' ? a.name : a.type === 'vocab' ? a.terms.join(', ') : a.text);
export const primaryFn = (a: Anchor): Fn => a.profile.fns[0] ?? 'describe';

const hash = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0) / 4294967295;
};

function conflictTime(b: BridgeDef): 'past' | 'present' | 'future' {
  if (/\b(lost|missing|forgot|failed|found|robbery|changed|cancelled|fell|fails)\b/i.test(b.conflict)) return 'past';
  if (/\b(before|tomorrow|next|forecast|opens|launches|will|must)\b/i.test(b.conflict)) return 'future';
  return 'present';
}

const words = (s: string) => s.toLowerCase().split(/[^a-záéíóúñ]+/).filter((w) => w.length > 3);

/** 0 = no cubre; 1 = función en común (+0.5 dominio, +0.5 tiempo). */
export function cover(a: Anchor, b: BridgeDef): number {
  if (a.type === 'free') {
    const hit = words(a.text).some((w) => `${b.title} ${b.setting}`.toLowerCase().includes(w));
    return 1 + (a.profile.doms.some((d) => b.doms.includes(d)) ? 0.5 : 0) + (hit ? 5 : 0);
  }
  const fnHit = a.profile.fns.some((f) => b.fns.includes(f));
  if (!fnHit) return 0;
  let c = 1;
  if (a.profile.doms.some((d) => b.doms.includes(d))) c += 0.5;
  if (a.profile.time === 'any' || a.profile.time === conflictTime(b)) c += 0.5;
  return c;
}

/** Cobertura relajada: solo por dominio (cuenta como 0.25). */
function softCover(a: Anchor, b: BridgeDef) {
  const c = cover(a, b);
  if (c > 0) return c;
  return a.profile.doms.some((d) => b.doms.includes(d)) ? 0.25 : 0;
}

export const sharedFn = (a: Anchor, b: { fns: Fn[] }): Fn => a.profile.fns.find((f) => b.fns.includes(f)) ?? primaryFn(a);

export function rationaleFor(anchors: Anchor[], b: { title: string; fns: Fn[] }): Record<string, string> {
  const out: Record<string, string> = {};
  for (const a of anchors) out[a.id] = `${anchorLabel(a)} → ${FN_ES[sharedFn(a, b)]} (${b.title})`.slice(0, 160);
  return out;
}

export function makeBridge(def: BridgeDef, anchors: Anchor[], names: [string, string, string], source: Source = 'local'): Bridge {
  return {
    id: def.id,
    title: def.title,
    setting: def.setting,
    roles: def.roles,
    conflict: def.conflict,
    doms: def.doms,
    fns: def.fns,
    rationale: rationaleFor(anchors, def),
    source,
    characters: def.roles.map((r, i) => ({ name: names[i % 3]!, role: r })),
    where: def.where,
    the: def.the,
    motion: def.motion,
    resolution: def.resolution,
    setting_es: def.setting_es,
    roles_es: def.roles_es,
  };
}

export interface Scored {
  def: BridgeDef;
  score: number;
  full: boolean;
}

/**
 * Los 3 mejores contextos del nivel que cubren todas las anclas.
 * `recent` = ids usados en los últimos hilos guardados (se penalizan para dar variedad).
 */
export function chooseBridges(anchors: Anchor[], level: CefrLevel, seed = 0, recent: string[] = []): Scored[] {
  const pool = bridgesFor(level);
  const scored = pool.map((def) => {
    const covers = anchors.map((a) => cover(a, def));
    const full = covers.every((c) => c > 0);
    const soft = anchors.map((a) => softCover(a, def));
    const softFull = soft.filter((c) => c === 0).length === 0;
    const score = (full ? covers : soft).reduce((n, c) => n + c, 0) - (recent.includes(def.id) ? 1 : 0) - (full ? 0 : softFull ? 3 : 8) + hash(def.id + seed) * 0.01;
    return { def, score, full };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 3);
}

/** Elige uno concreto por id (si no está en el catálogo, vuelve al mejor). */
export const defById = (id: string): BridgeDef | undefined => BRIDGES.find((b) => b.id === id);

// ------------------------------------------------------------------- orden --

const FN_RANK: Partial<Record<Fn, number>> = { routine: 0, describe: 0, experience: 1, compare: 1, narrate: 2, report: 2, plan: 2, hypothesize: 3, argue: 3, persuade: 3 };

/** De lo conocido a lo nuevo: unidad menor primero, el peso desempata y luego la función. */
export function orderAnchors(anchors: Anchor[]): Anchor[] {
  const novelty = (a: Anchor) => (a.type === 'free' ? 0 : a.unit) + (a.profile.weight - 1) * 2;
  return [...anchors].sort((a, b) => novelty(a) - novelty(b) || (FN_RANK[primaryFn(a)] ?? 1) - (FN_RANK[primaryFn(b)] ?? 1));
}

// ------------------------------------------------------------ transiciones --

type BridgeLike = Pick<Bridge, 'setting' | 'roles'> & Partial<Bridge>;

/** Mayúscula al inicio y tras ". ", "? " o "! ". */
export const capSentences = (t: string) => t.replace(/(^|[.!?¿¡]\s+)(\p{Ll})/gu, (_m, a: string, c: string) => a + c.toUpperCase());

function fill(t: TransitionTemplate, b: BridgeLike, i: number, nextNeed: string, need_es: string): TransitionTemplate {
  const role = b.roles[i % b.roles.length] ?? 'someone';
  const f = (s: string) =>
    capSentences(
      s
        .replace(/\{where\}/g, whereOf(b))
        .replace(/\{the\}/g, theOf(b))
        .replace(/\{role_es\}/g, roleEs(b, i))
        .replace(/\{role\}/g, role)
        .replace(/\{setting_es\}/g, settingEs(b))
        .replace(/\{nextNeed\}/g, nextNeed)
        .replace(/\{need_es\}/g, need_es),
    );
  return { teacher_es: f(t.teacher_es), student_en: f(t.student_en) };
}

/** Transición de una ancla a la siguiente (entra por la Presentation de `next`). */
export function transitionFrom(prev: Fn, next: Fn, bridge: BridgeLike, i = 0): TransitionTemplate {
  return fill(TRANSITIONS[`${prev}>${next}`] ?? GENERIC_TRANSITION, bridge, i, FN_NEED[next], NEED_ES[next]);
}

/** Del libro a la producción (Practice → Production). */
export function transitionToProduction(next: Fn, bridge: BridgeLike, i = 0): TransitionTemplate {
  return fill(BOOK_TO_PRODUCTION, bridge, i, FN_NEED[next], NEED_ES[next]);
}

/** De la presentación al libro. */
export function transitionToBook(bridge: BridgeLike, i = 0): TransitionTemplate {
  return fill(PRESENT_TO_BOOK, bridge, i, '', '');
}

export const transitionOk = (tr: { teacher_es: string; student_en: string }, b: { setting: string; roles: string[] }) => {
  const text = `${tr.teacher_es} ${tr.student_en}`.toLowerCase();
  const mentions = text.includes(b.setting.toLowerCase()) || b.roles.some((r) => text.includes(r.toLowerCase()));
  return mentions && !/\bunit\b|\bunidad\b/i.test(text);
};
