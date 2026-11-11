// Character cards: ranks and game points (shared by Class Wars and Impostor).
// Every player can use all 25 characters; each character card ranks up with the
// points its player earns in Class Wars or Impostor.
//
// Saved in Supabase (migration 19_game_cards.sql): the host (teacher) calls
// awardGamePoints() ONCE when a match ends; the RPC pays only the teacher's own
// students (and the teacher), never the same match twice. Players read their own
// points with loadMyCardPoints(); teachers can read their students' points.
// Guests, demo games and projects without migration 19 keep a local copy in this
// browser instead (see "local ledger" below), so the UI always has numbers.
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { TEACHERS } from './teachers';
import { t } from '@/lib/gameLang';

export type CardRank = 'bronze' | 'silver' | 'gold' | 'diamond';

export interface Award {
  /** ECYR account of the student (null = guest: shown on the podium, not saved). */
  userId: string | null;
  /** Character played (TEACHERS[].id). */
  cardId: string;
  points: number;
}

/** Point thresholds per rank (bronze from 0). */
export const RANK_AT: Record<CardRank, number> = { bronze: 0, silver: 20, gold: 60, diamond: 150 };
export const RANKS: CardRank[] = ['bronze', 'silver', 'gold', 'diamond'];

export function rankOf(points: number): CardRank {
  return points >= RANK_AT.diamond ? 'diamond' : points >= RANK_AT.gold ? 'gold' : points >= RANK_AT.silver ? 'silver' : 'bronze';
}

export interface RankProgress {
  rank: CardRank;
  next: CardRank | null;
  /** 0…1 towards the next rank (1 at diamond). */
  pct: number;
  /** Points still needed for the next rank (0 at diamond). */
  left: number;
  from: number;
  to: number | null;
}

export function rankProgress(points: number): RankProgress {
  const p = Math.max(0, Math.floor(points || 0));
  const rank = rankOf(p);
  const i = RANKS.indexOf(rank);
  const next = RANKS[i + 1] ?? null;
  const from = RANK_AT[rank];
  const to = next ? RANK_AT[next] : null;
  return { rank, next, from, to, pct: to ? (p - from) / (to - from) : 1, left: to ? to - p : 0 };
}

export const CARD_IDS = TEACHERS.map((t) => t.id);
export const isCardId = (id: unknown): id is string => typeof id === 'string' && CARD_IDS.includes(id);

/** Biggest award the database accepts per player and match (mirrors 19_game_cards.sql). */
export const AWARD_CAP: Record<'classwars' | 'impostor', number> = { impostor: 30, classwars: 50 };

export type CardPoints = Record<string, number>;

/* ------------------------------------------------------------------ local ledger
   One entry per owner ("guest" or the user id). For signed-in players it mirrors the
   last cloud read plus points shown since then; for guests (or before migration 19
   is run) it is the only copy. Wrapped in try/catch: storage may be blocked. */
interface Ledger { points: CardPoints; counted: string[] }
const LKEY = (owner: string) => `ecyr.cards.v1.${owner}`;

function readLedger(owner: string): Ledger {
  try {
    const raw = localStorage.getItem(LKEY(owner));
    const v = raw ? (JSON.parse(raw) as Partial<Ledger>) : null;
    const points: CardPoints = {};
    if (v?.points && typeof v.points === 'object')
      for (const [k, n] of Object.entries(v.points)) if (isCardId(k) && Number(n) > 0) points[k] = Math.floor(Number(n));
    return { points, counted: Array.isArray(v?.counted) ? v.counted.slice(-60).map(String) : [] };
  } catch {
    return { points: {}, counted: [] };
  }
}
function writeLedger(owner: string, l: Ledger) {
  try {
    localStorage.setItem(LKEY(owner), JSON.stringify({ points: l.points, counted: l.counted.slice(-60) }));
  } catch {
    /* ignore */
  }
  notify();
}

const ownerOf = () => useAuth.getState().session?.user.id ?? 'guest';

/** Adds points shown after a match. Returns false when `key` (match id) was already counted. */
export function addLocalCardPoints(cardId: string, points: number, key: string, owner = ownerOf()): boolean {
  if (!isCardId(cardId) || !(points > 0)) return false;
  const l = readLedger(owner);
  if (l.counted.includes(key)) return false;
  l.points[cardId] = (l.points[cardId] ?? 0) + Math.floor(points);
  l.counted.push(key);
  writeLedger(owner, l);
  return true;
}

export function localCardPoints(owner = ownerOf()): CardPoints {
  return readLedger(owner).points;
}

/* ---------------------------------------------------------- "card you train" */
const LAST = 'ecyr.cards.last';
export function lastCard(): string {
  try {
    const v = localStorage.getItem(LAST);
    if (isCardId(v)) return v;
  } catch {
    /* ignore */
  }
  return TEACHERS[0].id;
}
export function setLastCard(id: string) {
  if (!isCardId(id)) return;
  try {
    localStorage.setItem(LAST, id);
  } catch {
    /* ignore */
  }
}

/* ------------------------------------------------------------------ cloud reads */
const missing = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === '42P01' || e.code === 'PGRST205' || e.code === 'PGRST202' || e.code === '42883' || /could not find|does not exist|game_card_points|award_game_points/i.test(e.message ?? ''));

// notices in the games language (read when the points load)
const notReadyMsg = () => t('Card saving is not switched on yet (migration 19 is missing in Supabase). For now the points only show on this device.', 'Card saving is not enabled yet (migration 19 is missing in Supabase). For now the points only show on this device.');
const offlineMsg = () => t('No connection to your account: points are saved on this device only.', 'No connection with the account: points are saved only on this device.');
const guestMsg = () => t('You are playing as a guest: your points are saved on this device only. Sign in with your ECYR account to keep them.', 'You’re playing as a guest: your points are saved only on this device. Sign in with your ECYR account to keep them.');

export interface CardPointsState {
  points: CardPoints;
  /** cloud = read from Supabase; local = this browser only (guest, offline or migration 19 missing). */
  source: 'cloud' | 'local';
  /** Friendly Spanish note when the points are not (yet) saved in the account. */
  notice?: string;
}

/** The signed-in player's points per card (falls back to the local ledger). */
export async function loadMyCardPoints(): Promise<CardPointsState> {
  const uid = useAuth.getState().session?.user.id;
  if (!uid) return { points: localCardPoints('guest'), source: 'local', notice: guestMsg() };
  if (!supabase) return { points: localCardPoints(uid), source: 'local', notice: offlineMsg() };
  try {
    const { data, error } = await supabase.from('game_card_points').select('card_id,points').eq('user_id', uid);
    if (error) return { points: localCardPoints(uid), source: 'local', notice: missing(error) ? notReadyMsg() : offlineMsg() };
    const points: CardPoints = {};
    for (const r of (data ?? []) as { card_id: string; points: number }[]) if (isCardId(r.card_id)) points[r.card_id] = r.points;
    // The cloud is the truth: refresh the mirror (keeps the counted match ids).
    const l = readLedger(uid);
    writeLedger(uid, { points, counted: l.counted });
    return { points, source: 'cloud' };
  } catch {
    return { points: localCardPoints(uid), source: 'local', notice: offlineMsg() };
  }
}

export interface StudentCardRow { user_id: string; card_id: string; points: number; games: number }

/** Teacher: card points of their students (RLS returns only them, plus the teacher's own). */
export async function loadStudentsCardPoints(): Promise<{ rows: StudentCardRow[]; notice?: string }> {
  if (!supabase || !useAuth.getState().session) return { rows: [], notice: offlineMsg() };
  try {
    const { data, error } = await supabase.from('game_card_points').select('user_id,card_id,points,games').order('points', { ascending: false }).limit(2000);
    if (error) return { rows: [], notice: missing(error) ? notReadyMsg() : offlineMsg() };
    return { rows: ((data ?? []) as StudentCardRow[]).filter((r) => isCardId(r.card_id)) };
  } catch {
    return { rows: [], notice: offlineMsg() };
  }
}

/* ------------------------------------------------------------------ hook */
const subs = new Set<() => void>();
function notify() {
  subs.forEach((fn) => fn());
}

/** Live view of my card points: cloud when available, local otherwise. */
export function useMyCardPoints() {
  const uid = useAuth((s) => s.session?.user.id ?? null);
  const [state, setState] = useState<CardPointsState & { loading: boolean }>(() => ({
    points: localCardPoints(uid ?? 'guest'),
    source: 'local',
    loading: true,
  }));
  const reload = useCallback(() => {
    let live = true;
    void loadMyCardPoints().then((s) => {
      if (live) setState({ ...s, loading: false });
    });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => reload(), [reload, uid]);
  useEffect(() => {
    const fn = () => setState((s) => ({ ...s, points: s.source === 'cloud' ? { ...s.points, ...localCardPoints(uid ?? 'guest') } : localCardPoints(uid ?? 'guest') }));
    subs.add(fn);
    return () => {
      subs.delete(fn);
    };
  }, [uid]);
  return { ...state, reload };
}

/* ------------------------------------------------------------------ awarding */
export interface AwardResult {
  ok: boolean;
  /** User ids whose points were saved now. */
  saved: string[];
  /** User ids not paid, with the reason ('not_in_class', 'already_paid', 'invalid', 'repeated', 'guest'). */
  skipped: { userId: string | null; reason: string }[];
  /** Why nothing could be saved: 'offline' | 'signin' | 'teacher' | 'migration' | 'error'. */
  reason?: string;
  /** Friendly Spanish message for the host screen. */
  message: string;
}

/** Called once by the host (teacher) when a match ends. Never throws. */
export async function awardGamePoints(game: 'classwars' | 'impostor', matchId: string, awards: Award[]): Promise<AwardResult> {
  const guests = awards.filter((a) => !a.userId).map(() => ({ userId: null, reason: 'guest' }));
  const send = awards
    .filter((a) => a.userId && isCardId(a.cardId) && a.points > 0)
    .map((a) => ({ user_id: a.userId, card_id: a.cardId, points: Math.min(AWARD_CAP[game], Math.max(0, Math.round(a.points))) }));
  const fail = (reason: string, message: string): AwardResult => ({ ok: false, saved: [], skipped: guests, reason, message });
  if (!send.length) return { ok: true, saved: [], skipped: guests, message: guests.length ? 'Nobody with an ECYR account in this game: points are not saved.' : 'No points to save.' };
  if (!supabase) return fail('offline', t('No connection to Supabase: the card points were not saved.', 'No connection with Supabase: the card points were not saved.'));
  const auth = useAuth.getState();
  if (!auth.session) return fail('signin', 'Sign in with your teacher account to save the card points.');
  if (auth.profile && auth.profile.role !== 'teacher') return fail('teacher', 'Only a teacher account can save the points.');
  const safeId = matchId.replace(/[^A-Za-z0-9_.:-]/g, '').slice(0, 80);
  try {
    const { data, error } = await supabase.rpc('award_game_points', { p_game: game, p_match: safeId, p_awards: send });
    if (error) return missing(error) ? fail('migration', notReadyMsg()) : fail('error', t('Could not save the points: ', 'Could not save the points: ') + (error.message || 'error'));
    const res = (data ?? {}) as { saved?: { user_id: string }[]; skipped?: { user_id: string; reason: string }[] };
    const saved = (res.saved ?? []).map((r) => r.user_id);
    const skipped = [...guests, ...(res.skipped ?? []).map((r) => ({ userId: r.user_id, reason: r.reason }))];
    const out = skipped.filter((s) => s.reason === 'not_in_class').length;
    return {
      ok: true,
      saved,
      skipped,
      message: t(`Points saved for ${saved.length} ${saved.length === 1 ? 'player' : 'players'}`, `Puntos guardados para ${saved.length} ${saved.length === 1 ? 'jugador' : 'jugadores'}`) + (out ? ` · ${out} ${t('outside your class', 'outside your class')}` : '') + '.',
    };
  } catch {
    return fail('error', t('Could not save the points (no connection).', 'Could not save the points (offline).'));
  }
}
