/**
 * Tense Timeline — turns a parse into marks on an axis (-1 far past … 0 now …
 * 1 far future). Pure data, drawn by TenseTimeline.tsx.
 */
import { FAMILY_COLOR, kindFamily, type ClauseKind } from './data';
import type { Clause, ParseResult, TimeExpr } from './parser';

export type BarStyle = 'point' | 'span' | 'perfect' | 'perfectSpan' | 'state' | 'faint';

export type Mark =
  | { type: 'bar'; id: string; x1: number; x2: number; lane: number; color: string; style: BarStyle; arrow?: boolean; badge?: number; ghost?: boolean }
  | { type: 'dots'; id: string; x1: number; x2: number; lane: number; color: string; count: number }
  | { type: 'cross'; id: string; x: number; lane: number; label: string }
  | { type: 'deadline'; id: string; x: number; label: string; color: string }
  | { type: 'link'; id: string; x1: number; x2: number; lane1: number; lane2: number; label?: string; color: string; dashed?: boolean }
  | { type: 'ref'; id: string; x: number; lane: number; label: string }
  | { type: 'cloud'; id: string; x: number; lane: number; label: string; color: string }
  | { type: 'tag'; id: string; x: number; text: string; row: number };

export interface TimelineModel {
  marks: Mark[];
  lanes: number;
}

const DEFAULT_ANCHOR: Record<ClauseKind, number> = {
  presentSimple: 0,
  presentContinuous: 0,
  pastSimple: -0.4,
  pastContinuous: -0.4,
  presentPerfect: 0,
  presentPerfectContinuous: 0,
  pastPerfect: -0.7,
  pastPerfectContinuous: -0.62,
  futureSimple: 0.45,
  futureContinuous: 0.45,
  futurePerfect: 0.4,
  futurePerfectContinuous: 0.58,
  goingTo: 0.45,
  usedTo: -0.6,
  wouldHabit: -0.6,
  modal: 0.25,
  imperative: 0.12,
};

const clamp = (x: number) => Math.max(-0.95, Math.min(0.95, x));
const fixedTime = (c: Clause) => c.times.find((t) => t.pos !== null && t.kind !== 'since' && t.kind !== 'by' && !(t.kind === 'now' && t.pos === 0 && c.kind !== 'presentContinuous' && c.kind !== 'presentSimple'));
const isPast = (k: ClauseKind) => k === 'pastSimple' || k === 'pastContinuous';
const isPerfectPast = (k: ClauseKind) => k === 'pastPerfect' || k === 'pastPerfectContinuous';
const isFuture = (k: ClauseKind) => k === 'futureSimple' || k === 'futureContinuous' || k === 'futurePerfect' || k === 'futurePerfectContinuous' || k === 'goingTo';
const BEFORE_MAIN = new Set(['after', 'when', 'as soon as', 'once', 'the moment', 'since', 'whenever', 'if']);
const AFTER_MAIN = new Set(['before', 'until', 'till', 'and', 'then', 'and then', 'so', 'but']);

export function buildTimeline(r: ParseResult): TimelineModel {
  const cs = r.clauses.filter((c) => c.note !== 'noverb' || r.clauses.length === 1);
  const marks: Mark[] = [];
  if (!cs.length || cs.every((c) => !c.lemma)) return { marks, lanes: 1 };

  // 1 · anchors
  const anchor = new Map<Clause, number>();
  const explicit = new Set<Clause>();
  for (const c of cs) {
    const t = fixedTime(c);
    let x = DEFAULT_ANCHOR[c.kind];
    if (c.futureRef) x = c.kind === 'presentContinuous' ? 0.38 : 0.42;
    if (t && t.pos !== null) {
      x = t.pos;
      explicit.add(c);
    }
    anchor.set(c, x);
  }
  const A = (c: Clause) => anchor.get(c)!;
  if (cs.length > 1) {
    const main = cs.find((c) => !c.conn || !BEFORE_MAIN.has(c.conn)) ?? cs[0]!;
    const ref = cs.find((c) => isPast(c.kind) && explicit.has(c)) ?? cs.find((c) => isPast(c.kind));
    // past perfect before the past reference
    for (const c of cs) if (isPerfectPast(c.kind) && ref && !explicit.has(c)) anchor.set(c, clamp(Math.min(A(c), A(ref) - 0.3)));
    // past continuous around a past simple point (interruption)
    const cont = cs.find((c) => c.kind === 'pastContinuous');
    const simple = cs.find((c) => c.kind === 'pastSimple');
    if (cont && simple) {
      if (explicit.has(simple) && !explicit.has(cont)) anchor.set(cont, A(simple));
      else if (!explicit.has(simple)) anchor.set(simple, A(cont) + (cont.conn === 'while' || simple.conn === 'while' ? 0 : 0.02));
    }
    // two past simple / two futures → order by the connector
    const seq = (fam: (k: ClauseKind) => boolean) => {
      const group = cs.filter((c) => fam(c.kind) || (fam === isFuture && c.futureRef));
      if (group.length < 2) return;
      const head = group.find((c) => c === main) ?? group[0]!;
      for (const c of group) {
        if (c === head || explicit.has(c)) continue;
        const conn = c.conn ?? '';
        let d = cs.indexOf(c) > cs.indexOf(head) ? 0.1 : -0.1;
        if (BEFORE_MAIN.has(conn)) d = -0.1;
        if (AFTER_MAIN.has(conn)) d = 0.1;
        if (conn === 'by the time') d = 0.16;
        if (c.kind === 'pastContinuous' || head.kind === 'pastContinuous') continue;
        anchor.set(c, clamp(A(head) + d));
      }
    };
    seq(isPast);
    seq(isFuture);
    // future perfect + "by the time …" clause → deadline after the point
    const fp = cs.find((c) => c.kind === 'futurePerfect' || c.kind === 'futurePerfectContinuous');
    const byClause = cs.find((c) => c.conn === 'by the time');
    if (fp && byClause && byClause !== fp) {
      anchor.set(byClause, 0.6);
      if (!explicit.has(fp) && fp.kind === 'futurePerfect') anchor.set(fp, 0.4);
    }
    // since-clause gives the start of a perfect arrow
    const since = cs.find((c) => c.conn === 'since' && isPast(c.kind));
    if (since && !explicit.has(since)) anchor.set(since, -0.55);
  }

  // 2 · order badges
  const startOf = (c: Clause) => {
    const s = c.times.find((t) => t.kind === 'since')?.pos;
    if (c.kind === 'presentPerfect' || c.kind === 'presentPerfectContinuous') return s ?? -0.6;
    if (c.kind === 'usedTo' || c.kind === 'wouldHabit') return A(c) - 0.25;
    return A(c);
  };
  const order = [...cs].sort((a, b) => startOf(a) - startOf(b));
  const badge = (c: Clause) => (cs.length > 1 ? order.indexOf(c) + 1 : undefined);

  // 3 · marks
  cs.forEach((c, ci) => {
    const lane = cs.length > 1 ? Math.min(ci, 2) : 0;
    const color = c.kind === 'presentContinuous' && c.futureRef ? FAMILY_COLOR.future : FAMILY_COLOR[kindFamily(c.kind)];
    const x = A(c);
    const id = `c${ci}`;
    const bar = (x1: number, x2: number, style: BarStyle, extra: { arrow?: boolean; ghost?: boolean } = {}) =>
      marks.push({ type: 'bar', id: `${id}:main`, x1: clamp(x1), x2: clamp(x2), lane, color, style, badge: badge(c), ...extra });
    const since = c.times.find((t) => t.kind === 'since');
    const by = c.times.find((t) => t.kind === 'by');
    const has = (k: TimeExpr['kind']) => c.times.some((t) => t.kind === k);
    const sinceClause = cs.find((o) => o !== c && o.conn === 'since');
    const pastRef = cs.find((o) => o !== c && isPast(o.kind));
    switch (c.kind) {
      case 'presentSimple':
        if (c.futureRef) bar(x, x, 'point');
        else if (c.stative && !has('freq')) bar(-0.85, 0.85, 'state');
        else {
          bar(-0.8, 0.8, 'faint');
          marks.push({ type: 'dots', id: `${id}:dots`, x1: -0.8, x2: 0.8, lane, color, count: 9 });
        }
        break;
      case 'presentContinuous':
        bar(x - (c.futureRef ? 0.12 : 0.16), x + (c.futureRef ? 0.12 : 0.16), 'span');
        break;
      case 'pastSimple':
        bar(x, x, 'point');
        break;
      case 'pastContinuous':
        bar(x - 0.16, x + 0.16, 'span');
        break;
      case 'presentPerfect': {
        const s = since?.pos ?? (sinceClause ? A(sinceClause) : has('ever') || has('never') ? -0.92 : has('just') ? -0.1 : -0.6);
        bar(s, 0, 'perfect', { arrow: true });
        break;
      }
      case 'presentPerfectContinuous': {
        const s = since?.pos ?? (sinceClause ? A(sinceClause) : -0.55);
        bar(s, 0, 'perfectSpan', { arrow: true });
        break;
      }
      case 'pastPerfect': {
        const refX = pastRef ? A(pastRef) : -0.3;
        bar(x, x, 'point');
        if (!pastRef) marks.push({ type: 'ref', id: `${id}:ref`, x: refX, lane, label: 'otro momento pasado' });
        marks.push({ type: 'link', id: `${id}:link`, x1: x, x2: refX, lane1: lane, lane2: pastRef ? cs.indexOf(pastRef) : lane, label: 'antes', color });
        break;
      }
      case 'pastPerfectContinuous': {
        const refX = pastRef ? A(pastRef) : -0.3;
        bar(Math.min(x, refX - 0.3), refX, 'perfectSpan', { arrow: true });
        if (!pastRef) marks.push({ type: 'ref', id: `${id}:ref`, x: refX, lane, label: 'otro momento pasado' });
        break;
      }
      case 'futureSimple':
        bar(x, x, 'point');
        break;
      case 'goingTo':
        bar(x, x, 'point');
        marks.push({ type: 'link', id: `${id}:link`, x1: 0, x2: x, lane1: lane, lane2: lane, label: c.note === 'wasGoingTo' ? 'plan pasado' : 'plan / evidencia', color, dashed: true });
        break;
      case 'futureContinuous':
        bar(x - 0.13, x + 0.13, 'span');
        break;
      case 'futurePerfect': {
        const byClause = cs.find((o) => o !== c && o.conn === 'by the time');
        const d = by ? (by.pos ?? 0.6) : byClause ? A(byClause) : 0.6;
        bar(Math.min(x, d - 0.16), Math.min(x, d - 0.16), 'point');
        if (!byClause) marks.push({ type: 'deadline', id: `${id}:by`, x: d, label: by ? by.text : 'límite', color });
        break;
      }
      case 'futurePerfectContinuous': {
        const byClause = cs.find((o) => o !== c && o.conn === 'by the time');
        const d = by ? (by.pos ?? 0.6) : byClause ? A(byClause) : explicit.has(c) ? x : 0.6;
        bar(-0.3, d, 'perfectSpan', { arrow: true });
        if (!byClause) marks.push({ type: 'deadline', id: `${id}:by`, x: d, label: by ? by.text : fixedTime(c)?.text ?? 'límite', color });
        break;
      }
      case 'usedTo':
      case 'wouldHabit': {
        const center = explicit.has(c) ? x : -0.6;
        const x1 = clamp(center - 0.28);
        const x2 = clamp(Math.min(center + 0.28, -0.18));
        bar(x1, x2, 'faint');
        marks.push({ type: 'dots', id: `${id}:dots`, x1, x2, lane, color, count: 6 });
        if (c.kind === 'usedTo') marks.push({ type: 'cross', id: `${id}:cross`, x: Math.min(x2 + 0.1, -0.06), lane, label: 'ya no' });
        break;
      }
      case 'modal':
        marks.push({ type: 'cloud', id: `${id}:cloud`, x, lane, label: 'modal', color });
        break;
      case 'imperative':
        marks.push({ type: 'cloud', id: `${id}:cloud`, x, lane, label: '¡orden!', color });
        break;
    }
  });

  // 4 · time-expression tags
  const tags: { x: number; text: string; id: string }[] = [];
  for (const t of r.times) {
    const c = cs.find((k) => k.index === t.clause) ?? cs[0]!;
    const main = marks.find((m) => m.type === 'bar' && m.id === `c${cs.indexOf(c)}:main`) as Extract<Mark, { type: 'bar' }> | undefined;
    const mid = main ? (main.x1 + main.x2) / 2 : A(c);
    let x: number;
    if (t.kind === 'since') x = t.pos ?? -0.5;
    else if (t.kind === 'by') continue; // drawn as the deadline flag
    else if (t.pos !== null && t.kind !== 'within') x = t.pos;
    else if (t.kind === 'within') x = isFuture(c.kind) || c.futureRef ? (t.pos ?? mid) : mid;
    else if (t.kind === 'already' || t.kind === 'yet' || t.kind === 'recent' || t.kind === 'still') x = main && main.x2 <= 0.02 && main.x2 >= -0.02 ? -0.07 : (main?.x2 ?? A(c));
    else if (t.kind === 'just') x = main ? main.x2 - 0.06 : -0.06;
    else if (t.kind === 'ever' || t.kind === 'never') x = main ? (main.x1 + main.x2) / 2 : -0.5;
    else x = mid;
    tags.push({ x: clamp(x), text: t.text, id: `t${t.id}` });
  }
  tags.sort((a, b) => a.x - b.x);
  const lastInRow = [-9, -9, -9];
  for (const t of tags) {
    let row = lastInRow.findIndex((lx) => t.x - lx > 0.3);
    if (row < 0) row = 2;
    lastInRow[row] = t.x;
    marks.push({ type: 'tag', id: t.id, x: t.x, text: t.text, row });
  }
  return { marks, lanes: Math.min(cs.length, 3) };
}
