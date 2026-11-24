#!/usr/bin/env node
/**
 * Aceptación del Hilo de la clase v2 (docs/hilo-clase-v2.md §7), sin IA y sin red.
 *   node scripts/validate-thread.mjs [--verbose]
 * Audita GRAMMAR_PROFILES/BRIDGES contra los puntos reales de level-*.json y ejecuta
 * una matriz de >= 30 combinaciones de anclas. Código de salida 1 si algo falla.
 * Usa jiti (ya presente en node_modules) para cargar los módulos TypeScript puros de src/lib/thread.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createJiti } from 'jiti';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const jiti = createJiti(import.meta.url, { interopDefault: true });
const lib = (f) => jiti.import(path.join(ROOT, 'src/lib/thread', f));
const [prof, bd, br, plan, res, val, store, prompts, aiCore, types] = await Promise.all(['profiles.ts', 'bridgeData.ts', 'bridges.ts', 'plan.ts', 'resources.ts', 'validate.ts', 'storage.ts', 'prompts.ts', 'aiCore.ts', 'types.ts'].map(lib));
const verbose = process.argv.includes('--verbose');

const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const books = Object.fromEntries(LEVELS.map((l) => [l, JSON.parse(fs.readFileSync(path.join(ROOT, `src/content/generated/level-${l.toLowerCase()}.json`), 'utf8'))]));
const MIX = { kids: 0, teens: 12, young: 0, adults: 0 };

let fails = 0;
const failures = [];
const check = (ok, msg) => {
  if (!ok) {
    fails++;
    failures.push(msg);
    if (failures.length <= 60) console.log('  FAIL', msg);
  }
};
const section = (t) => console.log(`\n== ${t}`);

// ------------------------------------------------------------ 13. auditoría --
section('13. Auditoría de datos');
let total = 0, specific = 0, weak = 0;
const unmatched = [];
const perLevel = {};
for (const l of LEVELS) {
  let t = 0, s = 0;
  for (const u of books[l].units) for (const g of u.grammar) {
    t++;
    const rule = prof.ruleFor(g.name);
    if (rule) {
      s++;
      if (rule.weak) weak++;
    } else unmatched.push(`${l} u${u.n}: ${g.name}`);
  }
  perLevel[l] = { t, s };
  total += t;
  specific += s;
}
for (const l of LEVELS) console.log(`  ${l}: ${perLevel[l].s}/${perLevel[l].t} con perfil específico (${Math.round((perLevel[l].s / perLevel[l].t) * 100)} %)`);
console.log(`  TOTAL: ${specific}/${total} específicos (${((specific / total) * 100).toFixed(1)} %), genéricos (confidence low): ${total - specific} (${(((total - specific) / total) * 100).toFixed(1)} %), con detector débil: ${weak}`);
if (unmatched.length) console.log('  Genéricos:\n   ' + unmatched.join('\n   '));
check((total - specific) / total < 0.15, `Más de 15 % de puntos sin perfil (${total - specific}/${total})`);
const ids = new Set();
for (const b of bd.BRIDGES) {
  check(!ids.has(b.id), `BRIDGES id duplicado ${b.id}`);
  ids.add(b.id);
  check(b.title && b.setting && b.conflict && b.roles.length >= 2 && b.doms.length && b.fns.length >= 8, `BRIDGES campos vacíos/pobres: ${b.id}`);
}
for (const l of LEVELS) {
  const n = bd.bridgesFor(l).length;
  console.log(`  contextos ${l}: ${n}`);
  check(n >= (l === 'C1' || l === 'C2' ? 10 : 12), `Pocos contextos en ${l}: ${n}`);
}
const nameCount = Object.values(books).reduce((n, b) => n + b.units.length, 0);
check(nameCount === 16 + 16 + 16 + 12 + 12 + 10, `Nº de unidades inesperado: ${nameCount}`);

// --------------------------------------------------------------- combinaciones --
const U = (l, n) => books[l].units.find((u) => u.n === n);
const G = (l, n, p = 0) => plan.grammarAnchor(U(l, n), p, l);
const V = (l, n, k = 3) => plan.vocabAnchor(U(l, n), U(l, n).vocab.slice(0, k).map((v) => v.term));
const F = (t) => plan.freeAnchor(t);
const mk = (l, label, anchors, dur, expect) => ({ l, label, anchors, dur, expect });
const lastU = (l) => books[l].units.length;
const combos = [
  // los 6 ejemplos de §2.6
  mk('A1', 'A1 ejemplo: there is + like', [G('A1', 8, 0), F('I like blue walls and big windows: likes and dislikes')], 60, 'dream-classroom'),
  mk('A2', 'A2 ejemplo: past simple + comparatives', [G('A2', 1, 0), G('A2', 3, 0)], 60, 'school-trip'),
  mk('B1', 'B1 ejemplo: present perfect + obligation', [G('B1', 16, 0), G('B1', 5, 1)], 60, 'volunteer-camp'),
  mk('B2', 'B2 ejemplo: passive + conditionals', [G('B2', 7, 2), G('B2', 11, 0)], 60, 'museum-reopening'),
  mk('C1', 'C1 ejemplo: inversion + environment', [G('C1', 12, 0), V('C1', 9)], 60, 'council-hearing'),
  mk('C2', 'C2 ejemplo: mixed conditionals + hedging', [G('C2', 6, 0), G('C2', 5, 2)], 60, 'ethics-panel'),
];
for (const l of LEVELS) {
  const n = lastU(l);
  const mid = Math.ceil(n / 2);
  combos.push(
    mk(l, `${l} 2 gramáticas lejanas`, [G(l, 1, 0), G(l, n, 0)], 60),
    mk(l, `${l} 3 gramáticas`, [G(l, 2, 0), G(l, mid, 0), G(l, n - 1, 0)], 75),
    mk(l, `${l} gramática+vocab+libre`, [G(l, 3, 0), V(l, mid), F('Mis alumnos van a un viaje de fin de año')], 75),
    mk(l, `${l} solo tema libre`, [F('A news story about a lost dog in the neighbourhood')], 45),
    mk(l, `${l} 4 anclas`, [G(l, 1, 1), G(l, mid, 0), V(l, n, 4), G(l, n, 1)], 90),
  );
}
console.log(`\n   Combinaciones: ${combos.length}`);

// ------------------------------------------------------------------ ejecución --
const READING = ['story', 'news', 'dialogue', 'message', 'interview', 'announcement'];
const stats = { plans: 0, resources: 0, local: 0, resErrors: 0, lenWarn: 0, hitWarnWeak: 0, hitFail: 0, unknownMax: 0, ms: [], distinct: 0, exact: 0, equiv: 0, exampleTotal: 0 };
const samples = new Map();
const sortKeys = (v) => (Array.isArray(v) ? v.map(sortKeys) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => [k, sortKeys(v[k])])) : v);
const strip = (t) => JSON.stringify(sortKeys(JSON.parse(JSON.stringify(t, (k, v) => (['id', 'anchorId', 'from', 'createdAt', 'updatedAt'].includes(k) ? undefined : k === 'rationale' ? Object.values(v) : v)))));

function checkPlan(c, t, ctx, known) {
  const pre = `[${c.label} / ${t.bridge.id}]`;
  stats.plans++;
  // 1. PPP
  for (const a of t.anchors) {
    const st = t.stages.filter((s) => s.anchorId === a.id);
    const kinds = st.map((s) => s.kind).join(',');
    check(kinds === 'presentation,practice,production', `${pre} PPP incompleto para ${a.id}: ${kinds}`);
    const [p, pr, pd] = st;
    check(p && p.resources.length >= 1 && p.resources.some((r) => r.kind === 'ccq'), `${pre} Presentation sin recursos/CCQ`);
    check(pr && pr.resources.length === 0 && pr.book && !pr.book.book && !pr.book.page && !pr.book.exercises, `${pre} Practice debe ser tarjeta de libro vacía`);
    check(pd && pd.resources.length >= 1 && (pd.successCriteria?.length ?? 0) >= 3, `${pre} Production sin recursos/criterios`);
  }
  check(!t.stages.some((s) => s.resources.some((r) => r.kind === 'exercise')), `${pre} hay ejercicios generados por defecto`);
  // 2. tiempo
  const sum = t.stages.reduce((n, s) => n + s.minutes, 0);
  check(Math.abs(sum - t.duration) <= 2, `${pre} minutos ${sum} vs ${t.duration}`);
  for (const s of t.stages) {
    if (s.kind === 'presentation') check(s.minutes >= plan.MIN.presentation, `${pre} Presentation ${s.minutes} min`);
    if (s.kind === 'practice') check(s.minutes >= plan.MIN.practice, `${pre} Practice ${s.minutes} min`);
    if (s.kind === 'production') check(s.minutes >= plan.MIN.production, `${pre} Production ${s.minutes} min`);
  }
  check(!plan.groupingRuns(t), `${pre} más de 2 etapas seguidas con la misma agrupación`);
  // 5. transiciones
  for (const s of t.stages) if (s.transition) check(br.transitionOk(s.transition, t.bridge), `${pre} transición sin escenario/rol o con "unit": ${s.transition.student_en}`);
  // recursos
  const level = t.level;
  const li = val.LEVEL_IDX[level];
  for (const s of t.stages) for (const r of s.resources) {
    stats.resources++;
    stats.local += r.source === 'local' ? 1 : 0;
    const v = val.validateResource(r, { level, targets: ctx.targets, known, allowed: plan.allowedWords(ctx) });
    if (!v.ok) {
      stats.resErrors++;
      check(false, `${pre} ${r.kind} inválido: ${v.errors.join('; ')}`);
    }
    for (const w of v.warnings) if (/longitud|elementos|frases fuera/.test(w)) stats.lenWarn++;
    if (verbose && v.warnings.length) console.log('   warn', pre, r.kind, v.warnings.join(' | '));
    // 3. lenguaje meta
    if (READING.includes(r.kind)) {
      const text = val.hitText(r);
      for (const tg of ctx.targets.filter((x) => r.targets.some((y) => y.anchorId === x.anchorId))) {
        const n = prof.countHits(text, tg);
        const min = li === 0 ? 2 : 3;
        if (n < min) {
          if (tg.weak) stats.hitWarnWeak++;
          else {
            stats.hitFail++;
            check(false, `${pre} ${r.kind} "${tg.label}" solo ${n} hits`);
          }
        }
      }
    }
    // 7. nivel
    if (READING.includes(r.kind) || r.kind === 'examples') {
      const { ratio, unknown } = val.unknownRatio(val.allText(r.content), known, plan.allowedWords(ctx));
      stats.unknownMax = Math.max(stats.unknownMax, ratio);
      check(ratio <= (li <= 1 ? 0.08 : 0.05), `${pre} ${r.kind} ${Math.round(ratio * 100)} % fuera de nivel: ${unknown.slice(0, 8).join(', ')}`);
    }
    if (r.kind === 'news') check(!!r.content.fictionalNote, `${pre} noticia sin fictionalNote`);
    if (['story', 'news'].includes(r.kind) && !samples.has(`${level}-${r.kind}`)) samples.set(`${level}-${r.kind}`, { level, kind: r.kind, bridge: t.bridge.title, text: plan.contentToText(r).slice(0, 900) });
  }
}

section('1-8. Planes (sin IA)');
const knownBy = Object.fromEntries(LEVELS.map((l) => [l, val.knownWords(books[l].units)]));
// calentamiento (JIT) antes de medir tiempos
plan.buildPlanLocal({ level: 'B1', units: books.B1.units, anchors: [G('B1', 2), G('B1', 5)], duration: 60, mix: MIX, bridge: br.makeBridge(bd.BRIDGES.find((b) => b.id === 'volunteer-camp'), [], ['A', 'B', 'C']), seed: 0 });
let planForLater = null;
for (const [ci, c] of combos.entries()) {
  const seed = ci;
  const picks = br.chooseBridges(c.anchors, c.l, seed);
  check(picks.length === 3 && new Set(picks.map((p) => p.def.id)).size === 3, `[${c.label}] no devuelve 3 contextos distintos`);
  stats.distinct += picks.length === 3 && new Set(picks.map((p) => p.def.id)).size === 3 ? 1 : 0;
  for (const p of picks) {
    const full = c.anchors.every((a) => br.cover(a, p.def) > 0);
    check(full, `[${c.label}] contexto ${p.def.id} no cubre todas las anclas`);
  }
  if (c.expect) {
    stats.exampleTotal++;
    const ids = picks.map((p) => p.def.id);
    const eq = c.anchors.every((a) => br.cover(a, bd.BRIDGES.find((b) => b.id === c.expect)) > 0);
    if (ids.includes(c.expect)) stats.exact++;
    else if (picks[0].full) stats.equiv++;
    console.log(`  ejemplo ${c.l}: esperado ${c.expect} -> ${ids.join(', ')} ${ids.includes(c.expect) ? '(exacto)' : '(cobertura equivalente)'}${eq ? '' : ' [el esperado no cubre]'}`);
    check(ids.includes(c.expect) || picks[0].full, `[${c.label}] ejemplo no reproducido`);
  }
  const names = plan.namesFor(MIX, seed);
  for (const [k, pk] of picks.entries()) {
    const bridge = br.makeBridge(pk.def, c.anchors, names);
    const t0 = performance.now();
    const t = plan.buildPlanLocal({ level: c.l, units: books[c.l].units, anchors: c.anchors, duration: c.dur, mix: MIX, bridge, alternatives: picks.filter((_, i) => i !== k).map((x) => br.makeBridge(x.def, c.anchors, names)), seed });
    const ms = performance.now() - t0;
    stats.ms.push(ms);
    if (k === 0) planForLater = k === 0 && !planForLater ? { c, t } : planForLater;
    const ctx = plan.planContext(t, books[c.l].units);
    checkPlan(c, t, ctx, knownBy[c.l]);
    if (k === 0 && ci === 3) planForLater = { c, t };
  }
}
stats.ms.sort((a, b) => a - b);
console.log(`  planes: ${stats.plans}; recursos: ${stats.resources}; errores de validación: ${stats.resErrors}; avisos de longitud: ${stats.lenWarn}; detectores débiles bajo mínimo: ${stats.hitWarnWeak}; peor % fuera de nivel: ${(stats.unknownMax * 100).toFixed(1)}`);
console.log(`  buildPlanLocal: mediana ${stats.ms[Math.floor(stats.ms.length / 2)].toFixed(1)} ms, máx ${stats.ms[stats.ms.length - 1].toFixed(1)} ms`);
check(stats.ms[stats.ms.length - 1] < 150, `buildPlanLocal tardó ${stats.ms[stats.ms.length - 1].toFixed(0)} ms`);
check(stats.distinct / combos.length >= 0.9, `contextos distintos en ${(100 * stats.distinct) / combos.length} % de las combinaciones`);

// duración insuficiente
{
  const c = combos.find((x) => x.label === 'B1 4 anclas');
  const t = plan.buildPlanLocal({ level: 'B1', units: books.B1.units, anchors: c.anchors, duration: 30, mix: MIX, bridge: br.makeBridge(bd.BRIDGES.find((b) => b.id === 'volunteer-camp'), c.anchors, ['A', 'B', 'C']), seed: 1 });
  check(plan.planWarnings(t).some((w) => /insuficiente/.test(w)), 'no avisa de duración insuficiente (4 anclas en 30 min)');
}

// ------------------------------------------------------- 9. persistencia -------
section('9. Guardado, export/import');
{
  const { c, t } = planForLater;
  const units = books[c.l].units;
  let t2 = plan.setContent(t, t.stages[0].id, t.stages[0].resources[0].id, { ...t.stages[0].resources[0].content, EDIT: 'x' });
  t2 = plan.updateResource(t2, t2.stages[1].id, t2.stages[1].resources[0]?.id ?? 'none', (r) => ({ ...r, locked: true }));
  t2 = plan.setBook(t2, t2.stages.find((s) => s.kind === 'practice').id, { book: 'Grammar Starmap', page: '34', exercises: '1-3' });
  const saved = store.saveThread(t2, 'Mi hilo de prueba');
  const back = store.listThreads().find((x) => x.id === saved.id);
  check(!!back, 'no se recupera el hilo guardado');
  check(strip(back) === strip(saved), 'el hilo guardado difiere del original');
  check(back.stages[0].resources[0].edited === true && back.stages[0].resources[0].content.EDIT === 'x', 'se pierde la edición (edited/content)');
  check(back.stages.find((s) => s.kind === 'practice').book.page === '34', 'se pierde la tarjeta del libro');
  const imp = store.importThread(store.exportThread(back));
  check(strip(imp) === strip(back), 'export -> import produce un hilo distinto');
  check(imp.id !== back.id && imp.stages[0].id !== back.stages[0].id, 'import no regenera ids');
  check(imp.stages.every((s) => !s.anchorId || imp.anchors.some((a) => a.id === s.anchorId)), 'import rompe referencias de anclas');
  // migración tolerante
  const future = JSON.parse(store.exportThread(back)).thread;
  future.version = 9;
  future.campoNuevo = { x: 1 };
  delete future.teamChallenge;
  check(store.migrate(future).version === 2, 'migrate no tolera versiones futuras');
  let threw = false;
  try { store.importThread('{"a":1}'); } catch { threw = true; }
  check(threw, 'import acepta basura');
  const dup = plan.duplicateThread(back);
  check(dup.id !== back.id && dup.name.includes('copia'), 'duplicar falla');
  void units;
}

// ----------------------------------------------- 10-11. regenerar y estructura --
section('10-11. Regenerar, bloquear y estructura');
{
  const { c, t } = planForLater;
  const units = books[c.l].units;
  const hashes = (th) => Object.fromEntries(th.stages.flatMap((s) => s.resources.map((r) => [r.id, JSON.stringify(r.content)])));
  const target = t.stages.find((s) => s.kind === 'presentation');
  const lockedId = target.resources[1].id;
  let t2 = plan.updateResource(t, target.id, lockedId, (r) => ({ ...r, locked: true }));
  const before = hashes(t2);
  const t3 = plan.regenerateLocal(t2, units, target.id, undefined, 123);
  const after = hashes(t3);
  const changed = Object.keys(before).filter((id) => before[id] !== after[id]);
  check(changed.length >= 1 && changed.every((id) => target.resources.some((r) => r.id === id)), 'regenerar cambió recursos de otra etapa');
  check(!changed.includes(lockedId), 'regenerar tocó un recurso bloqueado');
  const lockedStage = plan.updateStage(t, target.id, { locked: true });
  check(JSON.stringify(plan.regenerateLocal(lockedStage, units, target.id).stages) === JSON.stringify(lockedStage.stages), 'regenerar tocó una etapa bloqueada');
  const ctx = plan.planContext(t, units);
  // estructura
  const okPlan = (th, label) => {
    for (const a of th.anchors) check(th.stages.filter((s) => s.anchorId === a.id).map((s) => s.kind).join(',') === 'presentation,practice,production', `${label}: PPP roto`);
    check(Math.abs(th.stages.reduce((n, s) => n + s.minutes, 0) - th.duration) <= 2, `${label}: minutos ${th.stages.reduce((n, s) => n + s.minutes, 0)} vs ${th.duration}`);
    for (const s of th.stages) if (s.transition) check(br.transitionOk(s.transition, th.bridge), `${label}: transición inválida`);
    const ids = th.stages.map((s) => s.id);
    check(new Set(ids).size === ids.length, `${label}: ids duplicados`);
  };
  const big = plan.buildPlanLocal({ level: 'B1', units, anchors: [G('B1', 2), G('B1', 6), G('B1', 10)], duration: 90, mix: MIX, bridge: t.bridge, seed: 3 });
  okPlan(big, 'base');
  const a1 = big.anchors[0].id;
  const second = big.stages.find((s) => s.anchorId === big.anchors[1].id && s.kind === 'presentation');
  const trBefore = JSON.stringify(big.stages.filter((s) => s.anchorId === big.anchors[2].id && s.kind === 'presentation')[0].transition);
  const moved = plan.moveBlock(big, second.id, -1, units);
  okPlan(moved, 'mover');
  check(moved.anchors[0].id === big.anchors[1].id, 'mover no reordenó las anclas');
  const trAfter = JSON.stringify(moved.stages.filter((s) => s.anchorId === big.anchors[2].id && s.kind === 'presentation')[0].transition);
  void trBefore; void trAfter;
  const removed = plan.removeAnchor(big, a1, units);
  okPlan(removed, 'quitar');
  check(removed.anchors.length === 2 && !removed.stages.some((s) => s.anchorId === a1), 'quitar no eliminó el ancla');
  const added = plan.addAnchor(removed, G('B1', 12, 0), units);
  okPlan(added, 'añadir');
  check(added.anchors.length === 3, 'añadir no insertó el ancla');
  // añadir un ejercicio a mano está permitido
  const withEx = plan.addResource(added, added.stages.find((s) => s.kind === 'practice').id, 'exercise', plan.planContext(added, units), { exerciseType: 'gapfill' });
  const exr = withEx.stages.find((s) => s.kind === 'practice').resources[0];
  check(exr?.kind === 'exercise' && exr.content.items.length >= 6 && exr.content.items.every((i) => i.answer && !(i.distractors ?? []).includes(i.answer)), 'ejercicio manual inválido');
  // los 14 tipos existen en local
  for (const k of types.RESOURCE_KINDS) {
    const r = res.localResource(k, ctx, ctx.targets[0].anchorId);
    const v = val.validateResource(r, { level: t.level, targets: ctx.targets });
    check(v.ok, `localResource(${k}) inválido: ${v.errors.join('; ')}`);
  }
  // cambiar contexto
  const swapped = plan.swapBridge(withEx, t.alternatives[0] ?? withEx.bridge, units);
  okPlan(swapped, 'cambiar contexto');
  check(swapped.stages.find((s) => s.kind === 'practice').resources[0]?.kind === 'exercise', 'cambiar contexto perdió el recurso añadido a mano (editado/bloqueado no) -- se regenera pero se conserva el tipo');
}

// -------------------------------------------------------------- 4/12. IA simulada --
section('4. IA simulada (reintento y respaldo local)');
{
  const { c, t } = planForLater;
  const units = books[c.l].units;
  const ctx = plan.planContext(t, units);
  const known = val.knownWords(units);
  const anchorId = t.anchors[0].id;
  // generador "bueno": devuelve el contenido local del tipo pedido envuelto en vallas ```json
  const good = async (parts) => {
    const text = parts[0].text;
    const kind = /RESOURCE: (\w+)/.exec(text)[1];
    const { content } = res.localContent(kind, ctx, ctx.targets.filter((x) => x.anchorId === anchorId), {});
    return '```json\n' + JSON.stringify(content) + '\n```';
  };
  let calls = 0;
  const flaky = async (p) => (++calls === 1 ? 'Sure! here you go: {not json' : good(p));
  const bad = async () => 'lo siento, no puedo';
  const boom = async () => { throw new Error('Edge function caída'); };
  for (const kind of ['story', 'news', 'ccq', 'roleplay', 'dialogue']) {
    const r = await aiCore.aiResource(good, kind, ctx, anchorId, { known });
    check(r.source === 'ia' && !r.fallback, `IA válida: ${kind} cayó a local (${r.validation?.warnings?.join('|')})`);
  }
  calls = 0;
  const r2 = await aiCore.aiResource(flaky, 'story', ctx, anchorId, { known });
  check(r2.source === 'ia' && calls === 2, `reintento: source=${r2.source}, llamadas=${calls}`);
  calls = 0;
  const r3 = await aiCore.aiResource(async (p) => { calls++; return bad(p); }, 'story', ctx, anchorId, { known });
  check(r3.source === 'local' && r3.fallback === true && calls === 2 && Object.keys(r3.content).length > 0, `respaldo tras 2 fallos: source=${r3.source}, llamadas=${calls}`);
  const r4 = await aiCore.aiResource(boom, 'ccq', ctx, anchorId, { known });
  check(r4.source === 'local' && r4.fallback === true, 'respaldo con servicio caído');
  // noticia sin fictionalNote -> se rechaza y se reintenta
  const noNote = async (p) => { const j = JSON.parse((await good(p)).replace(/```json\n|\n```/g, '')); delete j.fictionalNote; return JSON.stringify(j); };
  const r5 = await aiCore.aiResource(noNote, 'news', ctx, anchorId, { known });
  check(r5.fallback === true, 'una noticia sin fictionalNote debe caer al respaldo');
  // aiFill: mezcla buena/mala por recurso, sin dejar recursos vacíos y sin tocar bloqueados
  let th = plan.updateResource(t, t.stages[1].id, t.stages[1].resources[0].id, (r) => ({ ...r, locked: true }));
  const lockedBefore = JSON.stringify(th.stages[1].resources[0]);
  let n = 0;
  const mixed = async (p) => (++n % 3 === 0 ? bad() : good(p));
  const gen2 = async (parts) => {
    const text = parts[0].text;
    const m = /anchorId (\w+)/.exec(text);
    const aid = m ? m[1] : anchorId;
    const kind = /RESOURCE: (\w+)/.exec(text)[1];
    const { content } = res.localContent(kind, ctx, ctx.targets.filter((x) => x.anchorId === aid));
    return JSON.stringify(content);
  };
  const out = await aiCore.aiFill(async (p) => (/RESOURCE: (ccq|roleplay)/.test(p[0].text) ? bad() : gen2(p)), th, units, (f) => { th = f(th); });
  console.log(`  aiFill: ${out.ok} por IA, ${out.fallback} con respaldo local`);
  check(out.ok > 0 && out.fallback > 0, 'aiFill no mezcló IA y respaldo');
  check(th.stages.every((s) => s.resources.every((r) => r.content && Object.keys(r.content).length > 0)), 'quedaron recursos vacíos tras aiFill');
  check(JSON.stringify(th.stages[1].resources[0]) === lockedBefore, 'aiFill tocó un recurso bloqueado');
  void mixed;
  // puente propuesto por IA
  const names = ['Ana', 'Bo', 'Cy'];
  const proposal = async () => JSON.stringify({ bridges: [1, 2, 3].map((i) => ({ title: `Idea ${i}`, setting: `a small bakery number ${i}`, roles: ['the baker', 'a customer', 'the delivery driver'], conflict: 'The oven broke.', rationale: Object.fromEntries(t.anchors.map((a) => [a.id, 'Aparece porque el panadero lo necesita.'])), order: [...t.anchors].reverse().map((a) => a.id), transitions: t.anchors.map((a) => ({ toAnchorId: a.id, teacher_es: 'Seguimos en la panadería.', student_en: 'Now the baker needs help in the bakery.' })) })) });
  const pb = await aiCore.aiBridges(proposal, t.anchors, t.level, MIX, names);
  check(pb && pb.length === 3 && pb[0].order.length === t.anchors.length, 'aiBridges no analiza la propuesta');
  check(pb && Object.keys(pb[0].transitions).length === t.anchors.length, 'aiBridges debe conservar transiciones que mencionan un rol');
  const badTr = async () => JSON.stringify({ bridges: [{ title: 'X', setting: 'a small bakery', roles: ['the baker', 'a customer'], conflict: 'The oven broke.', rationale: {}, order: [], transitions: t.anchors.map((a) => ({ toAnchorId: a.id, teacher_es: 'Pasamos a la unidad 3.', student_en: 'Now we learn something else.' })) }] });
  const pb2 = await aiCore.aiBridges(badTr, t.anchors, t.level, MIX, names);
  check(pb2 && Object.keys(pb2[0].transitions).length === 0, 'aiBridges debe descartar transiciones sin escenario/rol');
  const pbBad = await aiCore.aiBridges(bad, t.anchors, t.level, MIX, names);
  check(pbBad === null, 'aiBridges debe devolver null si falla (puente determinista)');
}

// ---------------------------------------------------------------- resumen -----
section('Muestras para el corrector de inglés (locales)');
for (const s of [...samples.values()].slice(0, 8)) console.log(`\n-- ${s.level} ${s.kind} · ${s.bridge}\n${s.text}`);
console.log(`\n${fails ? `FALLOS: ${fails}` : 'OK: todas las comprobaciones pasan'} (${combos.length} combinaciones, ${stats.plans} planes, ${stats.resources} recursos)`);
console.log(`Cobertura de perfiles: ${((specific / total) * 100).toFixed(1)} % específicos (${specific}/${total}); genéricos ${(((total - specific) / total) * 100).toFixed(1)} %; detector débil ${weak}`);
process.exit(fails ? 1 : 0);
