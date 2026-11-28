/* Pure game rules shared by the host (authoritative), the phone (instant feedback) and the
   "play on this device" mode. Mutating helpers act on a TeamProg. */
import type { HuntCard, HuntCheckpoint, HuntOpts, HuntPack, TeamProg } from './types';
import { match, matchCode } from './match';

export const emptyProg = (): TeamProg => ({ unlocked: [], solved: {}, hints: [], tries: 0 });

/** Sanitize a TeamProg that came from storage or the network. */
export function cleanProg(v: unknown): TeamProg {
  const o = (v && typeof v === 'object' ? v : {}) as Partial<TeamProg>;
  const solved: TeamProg['solved'] = {};
  if (o.solved && typeof o.solved === 'object') {
    for (const [k, s] of Object.entries(o.solved)) {
      if (s && typeof s === 'object') solved[k] = { pts: Math.max(0, Math.min(9999, Number(s.pts) || 0)), hint: !!s.hint, t: Math.max(0, Number(s.t) || 0) };
    }
  }
  return {
    unlocked: Array.isArray(o.unlocked) ? o.unlocked.filter((x) => typeof x === 'string').slice(0, 40) : [],
    solved,
    hints: Array.isArray(o.hints) ? o.hints.filter((x) => typeof x === 'string').slice(0, 200) : [],
    tries: Math.max(0, Number(o.tries) || 0),
  };
}

export const cardsOf = (cp: HuntCheckpoint, o: HuntOpts): HuntCard[] => cp.cards.filter((c) => c.enabled || o.drafts);
export const allCards = (p: HuntPack, o: HuntOpts): HuntCard[] => p.checkpoints.flatMap((cp) => cardsOf(cp, o));
export function findCard(p: HuntPack, id: string, o: HuntOpts): { cp: HuntCheckpoint; card: HuntCard } | null {
  for (const cp of p.checkpoints) for (const card of cardsOf(cp, o)) if (card.id === id) return { cp, card };
  return null;
}

export const cardPoints = (p: HuntPack, hint: boolean) => (hint ? Math.max(p.scoring.minPerCard, p.scoring.correct - p.scoring.hintCost) : p.scoring.correct);
export const isUnlocked = (g: TeamProg, cp: HuntCheckpoint, o: HuntOpts) => !o.codes || g.unlocked.includes(cp.id);
export const score = (g: TeamProg) => Object.values(g.solved).reduce((n, s) => n + s.pts, 0);
export const hintCount = (g: TeamProg) => g.hints.length;
export const solvedCount = (g: TeamProg, p: HuntPack, o: HuntOpts) => allCards(p, o).filter((c) => g.solved[c.id]).length;
export const cpDone = (g: TeamProg, cp: HuntCheckpoint, o: HuntOpts) => { const cs = cardsOf(cp, o); return cs.length > 0 && cs.every((c) => g.solved[c.id]); };
export const cpDoneCount = (g: TeamProg, p: HuntPack, o: HuntOpts) => p.checkpoints.filter((cp) => cpDone(g, cp, o)).length;
/** Time of the last solved card (ms since the start). */
export const lastSolveAt = (g: TeamProg) => Object.values(g.solved).reduce((n, s) => Math.max(n, s.t), 0);

export function tryUnlock(p: HuntPack, g: TeamProg, cpId: string, text: string): boolean {
  const cp = p.checkpoints.find((c) => c.id === cpId);
  if (!cp) return false;
  if (g.unlocked.includes(cp.id)) return true;
  if (!matchCode(cp.code, text)) return false;
  g.unlocked.push(cp.id);
  return true;
}

export type SolveResult = { ok: true; pts: number; card: HuntCard } | { ok: false; reason: 'locked' | 'solved' | 'wrong' | 'nudge' | 'unknown' };
export function trySolve(p: HuntPack, g: TeamProg, cardId: string, text: string, o: HuntOpts, t: number): SolveResult {
  const f = findCard(p, cardId, o);
  if (!f) return { ok: false, reason: 'unknown' };
  if (!isUnlocked(g, f.cp, o)) return { ok: false, reason: 'locked' };
  if (g.solved[cardId]) return { ok: false, reason: 'solved' };
  const m = match(f.card, text);
  if (m === 'nudge') return { ok: false, reason: 'nudge' }; // not a wrong attempt
  g.tries++;
  if (m !== 'ok') return { ok: false, reason: 'wrong' };
  const hint = g.hints.includes(cardId);
  const pts = cardPoints(p, hint);
  g.solved[cardId] = { pts, hint, t: Math.max(0, Math.round(t)) };
  return { ok: true, pts, card: f.card };
}

/** One hint per card; it costs points only if the card is solved afterwards. Returns true if newly used. */
export function useHint(p: HuntPack, g: TeamProg, cardId: string, o: HuntOpts): boolean {
  const f = findCard(p, cardId, o);
  if (!f || !isUnlocked(g, f.cp, o) || g.solved[cardId] || g.hints.includes(cardId)) return false;
  g.hints.push(cardId);
  return true;
}
