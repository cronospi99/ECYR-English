/**
 * Plan PPP determinista (sin red, < 150 ms) y operaciones de estructura sobre un Thread.
 * Presentation y Production se generan; Practice es una tarjeta del libro físico que rellena el docente.
 */
import type { CefrLevel, Unit } from '../../content/types';
import { audienceOf, dominant, energizerForMix, hookForMix, type Mix } from '../engagement';
import { BRIDGES, roleEs, settingEs, whereOf, theOf, motionOf, resolutionOf } from './bridgeData';
import { hasCcq } from './ccq';
import { anchorLabel, makeBridge, orderAnchors, primaryFn, transitionFrom, transitionToBook, transitionToProduction } from './bridges';
import { buildTarget, profileOfFree, profileOfGrammar, profileOfVocab } from './profiles';
import { DRAFT_KINDS, localResource } from './resources';
import type { Anchor, Bridge, Fn, Grouping, PlanContext, PlanInput, Resource, ResourceKind, Stage, Target, Thread } from './types';
import { uid } from './types';
import { knownWords, LEVEL_IDX, validateResource } from './validate';

export const DEFAULT_BOOK_MINUTES = 10;
export const MIN = { presentation: 4, practice: 3, production: 5 };

// ---------------------------------------------------------------- anclas ----

export function grammarAnchor(u: Unit, point: number, level: CefrLevel): Anchor {
  const gp = u.grammar[point]!;
  return { id: uid('a'), type: 'grammar', unit: u.n, point, name: gp.name, profile: profileOfGrammar(gp, u, level) };
}
export function vocabAnchor(u: Unit, terms: string[]): Anchor {
  return { id: uid('a'), type: 'vocab', unit: u.n, terms, profile: profileOfVocab(terms, u) };
}
export function freeAnchor(text: string): Anchor {
  return { id: uid('a'), type: 'free', text: text.trim(), profile: profileOfFree(text) };
}
export const maxAnchors = (level: CefrLevel, duration: number) => ((level === 'C1' || level === 'C2') && duration >= 90 ? 6 : 5);

// ------------------------------------------------------------------ tiempos --

/** Minutos por etapa (warm-up 8 %, cierre 7 %, el resto por peso; Practice = libro, 10 por defecto). */
export function allocate(duration: number, anchors: Anchor[]) {
  const n = anchors.length;
  const energizer = duration >= 60 && n >= 3 ? 2 : 0;
  const warm = Math.max(3, Math.round(duration * 0.08));
  const close = Math.max(3, Math.round(duration * 0.07));
  const rest = duration - warm - close - energizer;
  const wsum = anchors.reduce((s, a) => s + a.profile.weight, 0) || 1;
  const per = anchors.map((a) => {
    const share = (rest * a.profile.weight) / wsum;
    const practice = share >= 24 ? DEFAULT_BOOK_MINUTES : Math.max(5, Math.round(share * 0.35));
    const remain = Math.max(0, share - practice);
    const pres = Math.max(MIN.presentation, Math.round(remain / 2));
    const prod = Math.max(MIN.production, Math.round(remain - pres));
    return { pres, practice, prod };
  });
  const sum = () => warm + close + energizer + per.reduce((s, p) => s + p.pres + p.practice + p.prod, 0);
  let diff = duration - sum();
  for (let guard = 0; diff !== 0 && guard < 200; guard++) {
    const p = per[guard % Math.max(1, n)];
    if (!p) break;
    if (diff > 0) {
      p.prod++;
      diff--;
    } else if (p.prod > MIN.production) {
      p.prod--;
      diff++;
    } else if (p.pres > MIN.presentation) {
      p.pres--;
      diff++;
    } else if (p.practice > MIN.practice) {
      p.practice--;
      diff++;
    } else if (guard > 100) break;
  }
  return { warm, close, energizer, per };
}

export const totalMinutes = (t: Thread) => t.stages.reduce((s, x) => s + x.minutes, 0);

export function planWarnings(t: Thread): string[] {
  const w: string[] = [];
  const n = t.anchors.length;
  const minNeeded = n * (MIN.presentation + MIN.practice + MIN.production) + 6;
  if (t.duration < minNeeded) w.push(`Duración insuficiente para ${n} anclas: sugiero quitar la de menor prioridad o alargar la clase.`);
  const tot = totalMinutes(t);
  if (tot > t.duration + 2) w.push(`El plan suma ${tot} min y la clase dura ${t.duration}: sobran ${tot - t.duration}.`);
  else if (tot < t.duration - 2) w.push(`El plan suma ${tot} min y la clase dura ${t.duration}: quedan ${t.duration - tot} libres.`);
  if (t.anchors.some((a) => a.profile.confidence === 'low')) w.push('Hay anclas con perfil de baja confianza: revisa que el contexto puente encaje.');
  return w;
}

// -------------------------------------------------------------------- contexto --

export function namesFor(mix: Mix, seed: number): [string, string, string] {
  const list = audienceOf(dominant(mix)).names;
  return list[((seed % list.length) + list.length) % list.length]!;
}

export function planContext(t: Pick<Thread, 'level' | 'bridge' | 'anchors' | 'mix' | 'audience' | 'seed' | 'userContext'>, units: Unit[]): PlanContext {
  const names = namesFor(t.mix, t.seed);
  return { level: t.level, bridge: t.bridge, targets: t.anchors.map((a) => buildTarget(a, units)), names, mix: t.mix, audience: t.audience, seed: t.seed, userContext: t.userContext };
}

/** Lo que no cuenta como "palabra fuera de nivel": nombres, escenario y roles. */
export const allowedWords = (ctx: PlanContext) => [...ctx.names, ctx.bridge.setting, ctx.bridge.title, ctx.bridge.conflict, whereOf(ctx.bridge), theOf(ctx.bridge), motionOf(ctx.bridge), resolutionOf(ctx.bridge), ...ctx.bridge.roles, ...ctx.targets.flatMap((t) => [t.label, ...t.terms])];

export function validateAll(t: Thread, ctx: PlanContext, known?: Set<string>): Thread {
  const allowed = allowedWords(ctx);
  return {
    ...t,
    stages: t.stages.map((s) => ({
      ...s,
      resources: s.resources.map((r) => {
        const v = validateResource(r, { level: t.level, targets: ctx.targets, known, allowed });
        return { ...r, validation: r.fallback ? { ...v, warnings: ['Respaldo local: la IA no dio un resultado válido para esta tarjeta.', ...v.warnings] } : v };
      }),
    })),
  };
}

// ------------------------------------------------------------------- etapas ---

const STYLE_KIND: Record<string, ResourceKind> = { news: 'news', gossip: 'dialogue', diary: 'message' };

/** Recurso de contexto de la Presentation. */
export function presentationKind(level: CefrLevel, k: number, style?: string): ResourceKind {
  if (style && STYLE_KIND[style]) return STYLE_KIND[style]!;
  if (style) return 'story';
  if (LEVEL_IDX[level] <= 2) return 'story';
  return k % 2 === 0 ? 'news' : 'dialogue';
}

export function productionKind(level: CefrLevel, fn: Fn): ResourceKind {
  const hard: Fn[] = ['argue', 'persuade', 'evaluate', 'hypothesize', 'opinion'];
  if (LEVEL_IDX[level] >= 2 && hard.includes(fn)) return 'debate';
  if (LEVEL_IDX[level] >= 2 && (fn === 'report' || fn === 'experience')) return 'interview';
  return 'roleplay';
}

const TEACHER_ROLE = {
  presentation: 'Presenta el contexto sin explicar la gramática: lee o proyecta el texto, haz los CCQ y deja que descubran la forma antes de mostrar el cuadro Form/Use.',
  practice: 'Indica en el libro los ejercicios de esta práctica y apunta página y números aquí. Esta etapa no genera ejercicios.',
  production: 'Monitoriza sin interrumpir, da pistas si se atascan y anota 3 errores para la corrección diferida en la pizarra.',
};

const GROUPING_PRESENT: Grouping = 'whole';

function criteria(ctx: PlanContext, t: Target): string[] {
  const c0 = t.kind === 'grammar' ? `Usa «${t.label}» al menos 3 veces` : `Usa al menos 3 de estas palabras: ${t.terms.slice(0, 5).join(', ')}`;
  return [c0, `Habla de ${settingEs(ctx.bridge)} o de ${roleEs(ctx.bridge, 0)}`, 'Su compañero lo entiende y puede responder'];
}

function anchorStages(ctx: PlanContext, anchor: Anchor, k: number, prev: Anchor | undefined, mins: { pres: number; practice: number; prod: number }, style?: string): Stage[] {
  const t = ctx.targets.find((x) => x.anchorId === anchor.id)!;
  const fn = primaryFn(anchor);
  const label = anchorLabel(anchor);
  const ref = anchor.type === 'grammar' ? { unit: anchor.unit, point: anchor.point, diagramKey: `${ctx.level}-${anchor.unit}-${anchor.point}` } : undefined;
  const pk = presentationKind(ctx.level, k, style);
  const kinds: ResourceKind[] = hasCcq(t.ruleId) ? [pk, 'ccq'] : [pk];
  const transition = prev ? { ...transitionFrom(primaryFn(prev), fn, ctx.bridge, k), from: prev.id } : undefined;
  return [
    {
      id: uid('s'), kind: 'presentation', anchorId: anchor.id, title: `Presentación · ${label}`, minutes: mins.pres, grouping: GROUPING_PRESENT, teacherRole: TEACHER_ROLE.presentation,
      transition, resources: kinds.map((kd) => localResource(kd, ctx, anchor.id, { variant: k })), locked: false, grammarRef: ref,
    },
    {
      id: uid('s'), kind: 'practice', anchorId: anchor.id, title: `Práctica del libro · ${label}`, minutes: mins.practice, grouping: 'pairs', teacherRole: TEACHER_ROLE.practice,
      transition: { ...transitionToBook(ctx.bridge, k), from: anchor.id }, resources: [], locked: false, grammarRef: ref, book: { book: '', page: '', exercises: '' },
    },
    {
      id: uid('s'), kind: 'production', anchorId: anchor.id, title: `Producción · ${label}`, minutes: mins.prod, grouping: 'groups', teacherRole: TEACHER_ROLE.production,
      transition: { ...transitionToProduction(fn, ctx.bridge, k), from: anchor.id }, successCriteria: criteria(ctx, t),
      resources: [localResource(productionKind(ctx.level, fn), ctx, anchor.id, { variant: k })], locked: false, grammarRef: ref,
    },
  ];
}

const HOMEWORK_WORDS = [60, 70, 90, 100, 110, 120];

export function homeworkFor(ctx: PlanContext, units: Unit[], anchors: Anchor[]): { title: string; task: string } {
  const words = HOMEWORK_WORDS[LEVEL_IDX[ctx.level]]!;
  const u = anchors.map((a) => (a.type === 'free' ? undefined : units.find((x) => x.n === a.unit))).find((x) => x?.homework);
  const labels = anchors.map(anchorLabel).slice(0, 3).join(', ');
  return {
    title: 'Producción escrita',
    task: `Write ${words} words about ${ctx.bridge.setting}: ${ctx.bridge.conflict} Use ${labels}.${u?.homework ? ` (Optional, from the book: ${u.homework.title}.)` : ''}`,
  };
}

function seedHash(s: string) {
  let h = 0;
  for (const c of s) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return h;
}

export function buildPlanLocal(input: PlanInput): Thread {
  const { level, units, duration, mix, bridge, seed } = input;
  const anchors = orderAnchors(input.anchors);
  const ctx = planContext({ level, bridge, anchors, mix, audience: dominant(mix), seed, userContext: input.userContext }, units);
  const al = allocate(duration, anchors);
  const stages: Stage[] = [];
  stages.push({
    id: uid('s'), kind: 'warmup', title: 'Calentamiento', minutes: al.warm, grouping: 'pairs', locked: false,
    teacherRole: 'Engancha en 30 s con el gancho, abre con el juego y deja una pregunta para activar el contexto.',
    resources: [localResource('game', ctx, undefined, { use: 'opener' }), localResource('debate', ctx, anchors[0]?.id, { variant: 1 })],
  });
  const energizerAt = al.energizer ? Math.ceil(anchors.length / 2) : -1;
  const energizer = energizerForMix(mix, seed);
  anchors.forEach((a, k) => {
    stages.push(...anchorStages(ctx, a, k, anchors[k - 1], al.per[k]!, input.style));
    if (k + 1 === energizerAt)
      stages.push({ id: uid('s'), kind: 'energizer', title: energizer.title, minutes: al.energizer, grouping: 'whole', teacherRole: energizer.how, resources: [], locked: false });
  });
  stages.push({
    id: uid('s'), kind: 'closing', title: 'Cierre', minutes: al.close, grouping: 'solo', locked: false,
    teacherRole: 'Cierra con el exit ticket y, si queda tiempo, lanza el reto por equipos con el vocabulario de hoy.',
    resources: [localResource('game', ctx, anchors[anchors.length - 1]?.id, { use: 'closer' })],
  });
  const homework = homeworkFor(ctx, units, anchors);
  stages.push({ id: uid('s'), kind: 'homework', title: 'Tarea', minutes: 0, grouping: 'solo', teacherRole: 'Encarga la producción escrita; no se corrige en clase.', resources: [], locked: false, notes: homework.task });
  const now = Date.now();
  const thread: Thread = {
    version: 2, id: uid('t'), name: input.name ?? '', createdAt: now, updatedAt: now,
    level, duration, mix, audience: dominant(mix), anchors, bridge, alternatives: input.alternatives ?? [], stages,
    hook: hookForMix(mix, ctx.names[0], seed), energizer,
    teamChallenge: { enabled: true, vocab: ctx.targets.flatMap((t) => t.terms).filter((x, i, arr) => arr.indexOf(x) === i).slice(0, 24), grammar: anchors.map(anchorLabel) },
    homework, source: 'local', seed, style: input.style, userContext: input.userContext,
  };
  return validateAll(thread, ctx, knownWords(units));
}

// -------------------------------------------------------- operaciones de plan --

const touch = (t: Thread): Thread => ({ ...t, updatedAt: Date.now() });

export function updateStage(t: Thread, id: string, patch: Partial<Stage>): Thread {
  return touch({ ...t, stages: t.stages.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
}

export function updateResource(t: Thread, stageId: string, resId: string, f: (r: Resource) => Resource): Thread {
  return touch({ ...t, stages: t.stages.map((s) => (s.id === stageId ? { ...s, resources: s.resources.map((r) => (r.id === resId ? f(r) : r)) } : s)) });
}

export const setContent = (t: Thread, stageId: string, resId: string, content: Record<string, unknown>) =>
  updateResource(t, stageId, resId, (r) => ({ ...r, content, edited: true, source: r.source === 'ia' ? 'ia' : r.source === 'local' ? 'user' : r.source }));

export function removeResource(t: Thread, stageId: string, resId: string): Thread {
  return updateStage(t, stageId, { resources: t.stages.find((s) => s.id === stageId)!.resources.filter((r) => r.id !== resId) });
}

export function addResource(t: Thread, stageId: string, kind: ResourceKind, ctx: PlanContext, o: { exerciseType?: 'gapfill' | 'matching' | 'transform' | 'order' } = {}): Thread {
  const st = t.stages.find((s) => s.id === stageId)!;
  if (kind === 'ccq' && !hasCcq(ctx.targets.find((x) => x.anchorId === st.anchorId)?.ruleId)) return t;
  const r = localResource(kind, ctx, st.anchorId, { variant: st.resources.length + 1, source: sourceOf(st), ...o });
  return updateStage(t, stageId, { resources: [...st.resources, r] });
}

export function moveResource(t: Thread, stageId: string, resId: string, dir: -1 | 1): Thread {
  const st = t.stages.find((s) => s.id === stageId)!;
  const i = st.resources.findIndex((r) => r.id === resId);
  const j = i + dir;
  if (i < 0 || j < 0 || j >= st.resources.length) return t;
  const rs = [...st.resources];
  [rs[i], rs[j]] = [rs[j]!, rs[i]!];
  return updateStage(t, stageId, { resources: rs });
}

/** Recurso de lectura de una etapa (base de las preguntas de comprensión). */
const sourceOf = (s?: Stage) => s?.resources.find((r) => r.kind === 'story' || r.kind === 'news');

/** Bloques movibles: cada ancla (3 etapas contiguas) o el energizante. */
function blocks(t: Thread): { key: string; stages: Stage[]; movable: boolean }[] {
  const out: { key: string; stages: Stage[]; movable: boolean }[] = [];
  for (const s of t.stages) {
    const key = s.anchorId ?? s.id;
    const last = out[out.length - 1];
    if (s.anchorId && last && last.key === key) last.stages.push(s);
    else out.push({ key, stages: [s], movable: !!s.anchorId || s.kind === 'energizer' });
  }
  return out;
}

/** Sube/baja el bloque de una ancla (o el energizante). Solo regenera las transiciones afectadas. */
export function moveBlock(t: Thread, stageId: string, dir: -1 | 1, units: Unit[]): Thread {
  const bs = blocks(t);
  const i = bs.findIndex((b) => b.stages.some((s) => s.id === stageId));
  const j = i + dir;
  if (i < 0 || !bs[i]!.movable || j < 0 || j >= bs.length || !bs[j]!.movable) return t;
  const arr = [...bs];
  [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  const anchorOrder = arr.filter((b) => b.stages[0]!.anchorId).map((b) => b.key);
  const anchors = anchorOrder.map((id) => t.anchors.find((a) => a.id === id)!);
  return refreshTransitions({ ...t, anchors, stages: arr.flatMap((b) => b.stages) }, units);
}

/** Recalcula la transición de entrada de cada ancla cuyo "anterior" cambió (no toca las bloqueadas). */
export function refreshTransitions(t: Thread, _units?: Unit[]): Thread {
  const stages = t.stages.map((s) => {
    if (s.kind !== 'presentation' || s.locked) return s;
    const k = t.anchors.findIndex((a) => a.id === s.anchorId);
    const prev = t.anchors[k - 1];
    if (!prev) return s.transition ? { ...s, transition: undefined } : s;
    if (s.transition?.from === prev.id) return s;
    return { ...s, transition: { ...transitionFrom(primaryFn(prev), primaryFn(t.anchors[k]!), t.bridge, k), from: prev.id } };
  });
  return touch({ ...t, stages });
}

/** Reparte otra vez los minutos de las etapas de ancla (tras añadir o quitar anclas). */
export function rebalance(t: Thread): Thread {
  const al = allocate(t.duration, t.anchors);
  const idx = new Map(t.anchors.map((a, k) => [a.id, k]));
  const stages = t.stages.map((s) => {
    if (s.locked) return s;
    if (s.kind === 'warmup') return { ...s, minutes: al.warm };
    if (s.kind === 'closing') return { ...s, minutes: al.close };
    if (s.kind === 'energizer') return { ...s, minutes: al.energizer || 2 };
    const k = s.anchorId ? idx.get(s.anchorId) : undefined;
    if (k === undefined) return s;
    const m = al.per[k]!;
    return { ...s, minutes: s.kind === 'presentation' ? m.pres : s.kind === 'practice' ? m.practice : m.prod };
  });
  return touch({ ...t, stages });
}

export function removeAnchor(t: Thread, anchorId: string, units: Unit[]): Thread {
  if (t.anchors.length <= 1) return t;
  const anchors = t.anchors.filter((a) => a.id !== anchorId);
  const stages = t.stages.filter((s) => s.anchorId !== anchorId);
  return rebalance(refreshTransitions({ ...t, anchors, stages, teamChallenge: { ...t.teamChallenge, grammar: anchors.map(anchorLabel) } }, units));
}

export function addAnchor(t: Thread, anchor: Anchor, units: Unit[]): Thread {
  if (t.anchors.length >= maxAnchors(t.level, t.duration)) return t;
  const anchors = [...t.anchors, anchor];
  const ctx = planContext({ ...t, anchors }, units);
  const al = allocate(t.duration, anchors);
  const k = anchors.length - 1;
  const fresh = anchorStages(ctx, anchor, k, t.anchors[k - 1], al.per[k]!, t.style);
  const at = t.stages.findIndex((s) => s.kind === 'closing');
  const stages = [...t.stages.slice(0, at), ...fresh, ...t.stages.slice(at)];
  const next = rebalance({ ...t, anchors, stages, teamChallenge: { ...t.teamChallenge, grammar: anchors.map(anchorLabel), vocab: [...new Set([...t.teamChallenge.vocab, ...ctx.targets.flatMap((x) => x.terms)])].slice(0, 24) } });
  return validateAll(next, ctx, knownWords(units));
}

export function setBook(t: Thread, stageId: string, book: Partial<NonNullable<Stage['book']>>): Thread {
  const st = t.stages.find((s) => s.id === stageId);
  return updateStage(t, stageId, { book: { book: '', page: '', exercises: '', ...st?.book, ...book } });
}

export function addMinutes(t: Thread, stageId: string, d: number): Thread {
  const st = t.stages.find((s) => s.id === stageId)!;
  return updateStage(t, stageId, { minutes: Math.max(st.kind === 'homework' ? 0 : 1, Math.min(120, st.minutes + d)) });
}

/** Cambia el contexto puente conservando bloqueados y editados; el resto se regenera en local. */
export function swapBridge(t: Thread, next: Bridge, units: Unit[]): Thread {
  const alts = [t.bridge, ...t.alternatives].filter((b) => b.id !== next.id).slice(0, 2);
  const base: Thread = { ...t, bridge: next, alternatives: alts };
  const ctx = planContext(base, units);
  const stages = t.stages.map((s) => {
    if (s.locked) return s;
    const k = s.anchorId ? t.anchors.findIndex((a) => a.id === s.anchorId) : -1;
    const keep = (r: Resource) => r.locked || r.edited;
    const resources = s.resources.map((r) =>
      keep(r) ? r : r.kind === 'game' && !s.anchorId ? localResource('game', ctx, undefined, { use: s.kind === 'closing' ? 'closer' : 'opener' }) : localResource(r.kind, ctx, s.anchorId, { variant: Math.max(0, k), source: sourceOf(s) }),
    );
    return { ...s, resources, transition: s.transition && !s.transition.from ? s.transition : s.transition };
  });
  const redo = refreshTransitions({ ...base, stages: stages.map((s) => (s.kind === 'presentation' ? { ...s, transition: undefined } : s)) }, units);
  // Las transiciones de producción y libro también mencionan el escenario: se rehacen.
  const fixed = redo.stages.map((s) => {
    const a = t.anchors.find((x) => x.id === s.anchorId);
    const k = a ? t.anchors.indexOf(a) : 0;
    if (s.locked) return s;
    if (s.kind === 'practice') return { ...s, transition: { ...transitionToBook(next, k), from: s.anchorId } };
    if (s.kind === 'production' && a) return { ...s, transition: { ...transitionToProduction(primaryFn(a), next, k), from: s.anchorId } };
    return s;
  });
  return validateAll({ ...redo, stages: fixed }, ctx, knownWords(units));
}

/** Variante local de una etapa o recurso. */
export function regenerateLocal(t: Thread, units: Unit[], stageId: string, resId?: string, variant = Date.now() % 997): Thread {
  const ctx = planContext(t, units);
  const known = knownWords(units);
  const st = t.stages.find((s) => s.id === stageId);
  if (!st || st.locked) return t;
  const stages = t.stages.map((s) => {
    if (s.id !== stageId) return s;
    return {
      ...s,
      resources: s.resources.map((r) => {
        if (r.locked || (resId && r.id !== resId)) return r;
        const fresh = r.kind === 'game' && !s.anchorId ? localResource('game', ctx, undefined, { use: s.kind === 'closing' ? 'closer' : 'opener', variant }) : localResource(r.kind, ctx, s.anchorId, { variant, source: sourceOf(s) });
        return { ...fresh, id: r.id };
      }),
    };
  });
  return validateAll(touch({ ...t, stages }), ctx, known);
}

// ---------------------------------------------------------------- utilidades --

export const newBridgeFrom = (id: string, anchors: Anchor[], names: [string, string, string]): Bridge | null => {
  const d = BRIDGES.find((b) => b.id === id);
  return d ? makeBridge(d, anchors, names) : null;
};

export const duplicateThread = (t: Thread): Thread => ({
  ...t,
  id: uid('t'),
  name: `${t.name || 'Hilo'} (copia)`,
  createdAt: Date.now(),
  updatedAt: Date.now(),
  stages: t.stages.map((s) => ({ ...s, id: uid('s'), resources: s.resources.map((r) => ({ ...r, id: uid('r') })) })),
});

export const seedOf = (s: string) => seedHash(s) % 1000;

/** Detecta tres etapas seguidas con la misma agrupación. */
export function groupingRuns(t: Thread): boolean {
  const g = t.stages.filter((s) => s.minutes > 0).map((s) => s.grouping);
  return g.some((x, i) => i >= 2 && g[i - 1] === x && g[i - 2] === x);
}

// -------------------------------------------------------------------- texto --

const GROUP_ES: Record<Grouping, string> = { whole: 'toda la clase', pairs: 'parejas', groups: 'grupos', solo: 'individual' };

export function contentToText(r: Resource): string {
  const c = r.content as Record<string, unknown>;
  const clean = (x: unknown): string => (typeof x === 'string' ? x.replace(/\*\*/g, '') : '');
  const arr = (x: unknown) => (Array.isArray(x) ? x : []);
  switch (r.kind) {
    case 'examples': return arr(c.sentences).map((x) => `  - ${clean(x)}`).join('\n');
    case 'story': return clean(c.text).split('\n').map((l) => `  ${l}`).join('\n');
    case 'news': return [`  ${clean(c.headline)}`, `  ${clean(c.lede)}`, ...clean(c.body).split('\n').map((l) => `  ${l}`), `  "${clean((c.quote as { text?: string })?.text)}" - ${clean((c.quote as { speaker?: string })?.speaker)}`, `  (${clean(c.fictionalNote)})`].join('\n');
    case 'dialogue': return arr(c.lines).map((l: { sp?: string; line?: string }) => `  ${clean(l.sp)}: ${clean(l.line)}`).join('\n');
    case 'message': return [`  ${clean(c.subject)}`, ...clean(c.text).split('\n').map((l) => `  ${l}`)].join('\n');
    case 'interview': return [`  ${clean(c.intro)}`, ...arr(c.qa).map((x: { q?: string; a?: string }) => `  Q: ${clean(x.q)}\n  A: ${clean(x.a)}`)].join('\n');
    case 'announcement': return [`  ${clean(c.title)}`, ...clean(c.text).split('\n').map((l) => `  ${l}`)].join('\n');
    case 'comprehension': return arr(c.questions).map((x: { q?: string; answer?: string }) => `  ? ${clean(x.q)}  [${clean(x.answer)}]`).join('\n');
    case 'ccq': return arr(c.items).map((x: { q?: string; answer?: string }) => `  ? ${clean(x.q)}  [${clean(x.answer)}]`).join('\n');
    case 'exercise': return [`  ${clean(c.instructions)}`, ...arr(c.items).map((x: { prompt?: string; answer?: string }, i: number) => `  ${i + 1}. ${clean(x.prompt)}  [${clean(x.answer)}]`)].join('\n');
    case 'game': return [`  ${clean(c.name)} (${String(c.minutes ?? '')} min, ${clean(c.mode)})`, ...arr(c.steps).map((x) => `  - ${clean(x)}`)].join('\n');
    case 'roleplay': return arr(c.cards).map((x: { role?: string; situation?: string; goal?: string }) => `  [${clean(x.role)}] ${clean(x.situation)} Goal: ${clean(x.goal)}`).join('\n');
    case 'debate': return arr(c.questions).map((x) => `  ? ${clean(x)}`).join('\n');
    case 'board': return arr(c.sections).map((x: { title?: string; lines?: unknown[] }) => `  ${clean(x.title)}: ${arr(x.lines).map(clean).join(' | ')}`).join('\n');
  }
}

/** El plan como texto plano para pegar en un documento. */
export function planToText(t: Thread): string {
  const out: string[] = [`${t.name || t.bridge.title} · ${t.level} · ${t.duration} min`, `Contexto: ${t.bridge.title} (${t.bridge.setting})`, `Anclas: ${t.anchors.map(anchorLabel).join(' · ')}`, `Gancho: ${t.hook}`, ''];
  for (const s of t.stages) {
    out.push(`== ${s.title} · ${s.minutes} min · ${GROUP_ES[s.grouping]}`);
    if (s.transition) out.push(`  Transición: ${s.transition.teacher_es}`, `  "${s.transition.student_en}"`);
    if (s.kind === 'practice') out.push(`  Libro: ${s.book?.book || '__'} · p. ${s.book?.page || '__'} · ej. ${s.book?.exercises || '__'}${s.notes ? ` · ${s.notes}` : ''}`);
    else if (s.teacherRole) out.push(`  Docente: ${s.teacherRole}`);
    if (s.successCriteria?.length) out.push(...s.successCriteria.map((c) => `  [ ] ${c}`));
    for (const r of s.resources) out.push(`  -- ${r.title}${r.source === 'local' && DRAFT_KINDS.includes(r.kind) ? ' (borrador)' : ''}`, contentToText(r));
    if (s.notes && s.kind !== 'practice') out.push(`  Notas: ${s.notes}`);
    out.push('');
  }
  out.push(`Tarea: ${t.homework.task}`);
  return out.join('\n');
}
