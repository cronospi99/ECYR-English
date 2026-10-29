/**
 * "Muro en vivo" — live collaborative boards (supabase/migrations/16_live_boards.sql).
 *
 * One engine, three layouts:
 *   jam      free sticky-notes canvas (cards at x/y, drag to move)
 *   columns  Padlet-style shelf (cards stacked in teacher-named columns)
 *   story    a chain of cards, each one continues the story
 *
 * Everything goes through security-definer RPCs; nobody reads the tables.
 * get_live_board() applies anonymity on the server, so with names hidden a
 * student's browser never receives classmates' names or ids.
 *
 * Live updates: a Realtime broadcast channel per board ("board:<id>") carries
 * only {type:'changed'}; every client then refetches. Polling is the fallback.
 */
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from './supabase';

export type BoardLayout = 'jam' | 'columns' | 'story';
export type BoardRole = 'teacher' | 'student';

/** Size of the Jam canvas in board units (the server clamps x/y to it). */
export const CANVAS_W = 1600;
export const CANVAS_H = 1000;
export const CARD_W = 210;
export const MAX_TEXT = 280;
/** Image data URLs are capped at 400 000 characters on the server. */
export const MAX_IMAGE = 400_000;

export const CARD_COLORS = ['yellow', 'orange', 'pink', 'purple', 'blue', 'teal', 'green', 'gray'] as const;
export type CardColor = (typeof CARD_COLORS)[number];

/** Post-it pastels: the paper stays light in both themes (dark ink on it). */
export const COLOR_STYLE: Record<CardColor, { paper: string; edge: string; label: string }> = {
  yellow: { paper: '#fff3a3', edge: '#f5d94a', label: 'Amarillo' },
  orange: { paper: '#ffd9b0', edge: '#f7ae63', label: 'Naranja' },
  pink: { paper: '#ffd0e0', edge: '#f590b4', label: 'Rosa' },
  purple: { paper: '#e5d6ff', edge: '#b799f5', label: 'Lila' },
  blue: { paper: '#cfe6ff', edge: '#86b9f2', label: 'Azul' },
  teal: { paper: '#c4f1ec', edge: '#6fd2c6', label: 'Aqua' },
  green: { paper: '#d6f5c4', edge: '#93d674', label: 'Verde' },
  gray: { paper: '#ececf1', edge: '#c3c3cc', label: 'Gris' },
};

export const LAYOUTS: Record<BoardLayout, { label: string; emoji: string; hint: string; color: string }> = {
  jam: { label: 'Jam', emoji: '🗒️', hint: 'Notas libres en un lienzo', color: 'var(--yellow)' },
  columns: { label: 'Columnas', emoji: '🧱', hint: 'Tarjetas por columnas', color: 'var(--blue)' },
  story: { label: 'Historia', emoji: '📖', hint: 'Una cadena: cada tarjeta continúa', color: 'var(--purple)' },
};

export interface BoardSummary {
  id: string;
  title: string;
  layout: BoardLayout;
  prompt: string | null;
  show_names: boolean;
  locked: boolean;
  closed_at: string | null;
  created_at: string;
  cards: number;
  teacher_name: string | null;
}

export interface LiveBoard {
  id: string;
  title: string;
  layout: BoardLayout;
  prompt: string | null;
  columns: string[];
  show_names: boolean;
  locked: boolean;
  spotlight: string | null;
  closed_at: string | null;
  created_at: string;
  teacher_name: string | null;
}

export interface LiveCard {
  id: string;
  text: string;
  color: CardColor;
  has_image: boolean;
  col: number;
  x: number;
  y: number;
  position: number;
  likes: number;
  liked: boolean;
  mine: boolean;
  by_teacher: boolean;
  /** Only the teacher receives it. */
  author_id: string | null;
  /** Null when the names are hidden (and it is not mine / the teacher's). */
  author_name: string | null;
  created_at: string;
  /** Changes whenever the card changes (to refresh its drawing). */
  rev: string;
  /** Client only: written here, not yet confirmed by the server. */
  pending?: boolean;
}

export interface BoardBundle {
  role: BoardRole;
  board: LiveBoard;
  cards: LiveCard[];
  /** Distinct students who posted. */
  authors: number;
}

export type BoardErrorKind = 'offline' | 'missing' | 'not_found' | 'closed' | 'locked' | 'denied' | 'network' | 'other';

export const BOARDS_MISSING_MSG = 'Falta activar el Muro en vivo: ejecuta supabase/migrations/16_live_boards.sql en Supabase → SQL Editor.';

export class BoardError extends Error {
  constructor(
    readonly kind: BoardErrorKind,
    message: string,
  ) {
    super(message);
  }
}

function friendly(e: unknown): BoardError {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e ?? '');
  const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
  if (e instanceof BoardError) return e;
  if (code === 'PGRST202' || code === '42883' || code === '42P01' || (/live_(board|card)/i.test(msg) && /could not find|does not exist|schema cache/i.test(msg)))
    return new BoardError('missing', BOARDS_MISSING_MSG);
  if (/BOARD_CLOSED/.test(msg)) return new BoardError('closed', 'Tu profe cerró este muro.');
  if (/BOARD_NOT_FOUND/.test(msg)) return new BoardError('not_found', 'Este muro no existe o no es de tu clase.');
  if (/CARD_NOT_FOUND/.test(msg)) return new BoardError('not_found', 'Esa tarjeta ya no existe.');
  if (/BOARD_LOCKED/.test(msg)) return new BoardError('locked', 'El muro está bloqueado 🔒');
  if (/CARD_LIMIT/.test(msg)) return new BoardError('other', /full/.test(msg) ? 'El muro está lleno (400 tarjetas).' : 'Máximo 40 tarjetas por persona.');
  if (/BOARD_LIMIT/.test(msg)) return new BoardError('other', 'Tienes 50 muros abiertos: cierra alguno primero.');
  if (/text_len/.test(msg)) return new BoardError('other', `Máximo ${MAX_TEXT} caracteres.`);
  if (/has_content/.test(msg)) return new BoardError('other', 'Escribe algo o haz un dibujo.');
  if (/cards_image/.test(msg)) return new BoardError('other', 'El dibujo es demasiado grande.');
  if (/title_len/.test(msg)) return new BoardError('other', 'Ponle un título (máx. 120).');
  if (/Only teachers/i.test(msg)) return new BoardError('denied', 'Solo los docentes pueden crear muros.');
  if (/only|own cards|permission denied|42501/i.test(msg)) return new BoardError('denied', 'No tienes permiso para hacer esto.');
  if (/failed to fetch|network|load failed/i.test(msg)) return new BoardError('network', 'Sin conexión. Reintentando…');
  return new BoardError('other', msg || 'Algo salió mal.');
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  if (!supabase) throw new BoardError('offline', 'Necesitas conexión para usar el muro en vivo.');
  let res;
  try {
    res = await supabase.rpc(fn, args);
  } catch (e) {
    throw friendly(e);
  }
  if (res.error) throw friendly(res.error);
  return res.data as T;
}

// ---------------------------------------------------------------- boards ----
export async function listBoards(): Promise<BoardSummary[]> {
  const rows = await rpc<BoardSummary[] | null>('list_live_boards');
  return (rows ?? []).map((r) => ({ ...r, cards: Number(r.cards) || 0 }));
}

export async function createBoard(input: {
  title: string;
  layout: BoardLayout;
  prompt?: string;
  columns?: string[];
  showNames?: boolean;
}): Promise<string> {
  return rpc<string>('create_live_board', {
    p_title: input.title.trim(),
    p_layout: input.layout,
    p_prompt: input.prompt?.trim() || null,
    p_columns: input.layout === 'columns' ? (input.columns ?? []).map((c) => c.trim()).filter(Boolean) : null,
    p_show_names: input.showNames ?? true,
  });
}

export type BoardPatch = Partial<Pick<LiveBoard, 'title' | 'prompt' | 'columns' | 'show_names' | 'locked' | 'spotlight'>>;

export const updateBoard = (id: string, patch: BoardPatch) => rpc<void>('update_live_board', { p_board: id, p_patch: patch });
export const closeBoard = (id: string, closed = true) => rpc<void>('close_live_board', { p_board: id, p_closed: closed });
export const deleteBoard = (id: string) => rpc<void>('delete_live_board', { p_board: id });

function normColor(c: unknown): CardColor {
  return (CARD_COLORS as readonly string[]).includes(String(c)) ? (c as CardColor) : 'yellow';
}

export async function getBoard(id: string): Promise<BoardBundle> {
  const raw = await rpc<BoardBundle | null>('get_live_board', { p_board: id });
  if (!raw?.board) throw new BoardError('not_found', 'Este muro no existe o no es de tu clase.');
  const b = raw.board;
  return {
    role: raw.role === 'teacher' ? 'teacher' : 'student',
    authors: Number(raw.authors) || 0,
    board: {
      ...b,
      layout: (['jam', 'columns', 'story'] as const).includes(b.layout) ? b.layout : 'jam',
      columns: Array.isArray(b.columns) ? b.columns.map(String) : [],
    },
    cards: (Array.isArray(raw.cards) ? raw.cards : []).map((c) => ({
      ...c,
      text: c.text ?? '',
      color: normColor(c.color),
      x: Number(c.x) || 0,
      y: Number(c.y) || 0,
      col: Number(c.col) || 0,
      position: Number(c.position) || 0,
      likes: Number(c.likes) || 0,
    })),
  };
}

/** Drawings of some cards (they are not part of getBoard, which is polled). */
export async function getCardImages(boardId: string, ids: string[]): Promise<Record<string, string>> {
  if (!ids.length) return {};
  const rows = await rpc<{ id: string; image: string }[] | null>('get_live_card_images', { p_board: boardId, p_cards: ids.slice(0, 60) });
  return Object.fromEntries((rows ?? []).map((r) => [r.id, r.image]));
}

// ----------------------------------------------------------------- cards ----
export interface CardDraft {
  text: string;
  color: CardColor;
  image?: string | null;
  col?: number;
  x?: number;
  y?: number;
}

export const addCard = (boardId: string, d: CardDraft) =>
  rpc<string>('add_live_card', {
    p_board: boardId,
    p_text: d.text.trim().slice(0, MAX_TEXT),
    p_color: d.color,
    p_image: d.image || null,
    p_col: d.col ?? 0,
    p_x: Math.round(d.x ?? 0),
    p_y: Math.round(d.y ?? 0),
  });

export type CardPatch = Partial<{ text: string; color: CardColor; image: string | null; col: number; x: number; y: number; position: number }>;

export const updateCard = (id: string, patch: CardPatch) => rpc<void>('update_live_card', { p_card: id, p_patch: patch });
export const deleteCard = (id: string) => rpc<void>('delete_live_card', { p_card: id });
export const likeCard = (id: string) => rpc<{ likes: number; liked: boolean }>('like_live_card', { p_card: id });

// -------------------------------------------------------------- realtime ----
export interface BoardChannel {
  /** Tell everyone else to refetch. */
  ping: () => void;
  close: () => void;
}

/**
 * Joins the board's broadcast channel. `onChange` fires when someone else
 * changed something; `onStatus` reports whether the live link is up and how
 * many people are on the board (presence, anonymous keys).
 */
export function joinBoardChannel(
  id: string,
  onChange: () => void,
  onStatus: (s: { live: boolean; online: number | null }) => void,
): BoardChannel {
  if (!supabase) return { ping: () => {}, close: () => {} };
  const client = supabase;
  let ch: RealtimeChannel | null = null;
  let joined = false;
  try {
    // A random key per tab: presence counts people without saying who they are.
    const key = Math.random().toString(36).slice(2);
    ch = client.channel(`board:${id}`, { config: { broadcast: { self: false }, presence: { key } } });
    const online = () => (ch ? Object.keys(ch.presenceState()).length : null);
    ch.on('broadcast', { event: 'changed' }, () => onChange())
      .on('presence', { event: 'sync' }, () => onStatus({ live: joined, online: online() }))
      .subscribe((status) => {
        joined = status === 'SUBSCRIBED';
        onStatus({ live: joined, online: joined ? online() : null });
        if (joined) void ch?.track({ at: Date.now() }).catch(() => {});
      });
  } catch {
    ch = null;
  }
  return {
    ping: () => {
      // Only over the socket: when it is down, the others' polling picks the change up.
      if (joined && ch) void ch.send({ type: 'broadcast', event: 'changed', payload: { type: 'changed' } }).catch(() => {});
    },
    close: () => {
      if (ch) void client.removeChannel(ch).catch(() => {});
      ch = null;
      joined = false;
    },
  };
}

// ----------------------------------------------------------------- order ----
/** Cards in reading order for a layout (story: chain order; columns: per column). */
export function ordered(cards: LiveCard[]): LiveCard[] {
  return [...cards].sort((a, b) => a.position - b.position || a.created_at.localeCompare(b.created_at));
}

/** A position between two neighbours (to move a card without renumbering). */
export function between(prev: number | undefined, next: number | undefined): number {
  if (prev === undefined && next === undefined) return 1;
  if (prev === undefined) return next! - 1;
  if (next === undefined) return prev + 1;
  return (prev + next) / 2;
}

/** A gentle, stable tilt per card (−3°…3°) for the post-it look. */
export function tilt(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return ((Math.abs(h) % 61) - 30) / 10;
}

// ---------------------------------------------------------------- export ----
function groupLabel(b: LiveBoard, c: LiveCard, i: number): string {
  if (b.layout === 'columns') return b.columns[c.col] ?? b.columns[b.columns.length - 1] ?? '';
  if (b.layout === 'story') return `Parte ${i + 1}`;
  return '';
}

/** Rows in reading order, with the author only when `names`. */
export function exportRows(bundle: BoardBundle, names: boolean) {
  const { board } = bundle;
  const list = ordered(bundle.cards);
  const sorted = board.layout === 'columns' ? [...list].sort((a, b) => a.col - b.col || a.position - b.position) : list;
  return sorted.map((c, i) => ({
    n: i + 1,
    group: groupLabel(board, c, i),
    text: c.text,
    author: names ? (c.author_name ?? (c.mine ? 'Yo' : '')) : '',
    color: COLOR_STYLE[c.color].label,
    likes: c.likes,
    drawing: c.has_image ? 'sí' : '',
    date: new Date(c.created_at).toLocaleString('es'),
  }));
}

export function boardToText(bundle: BoardBundle, names: boolean): string {
  const { board } = bundle;
  const lines = [board.title, ...(board.prompt ? [board.prompt] : []), ''];
  let group = '';
  for (const r of exportRows(bundle, names)) {
    if (board.layout === 'columns' && r.group !== group) {
      group = r.group;
      lines.push('', `## ${group}`);
    }
    const head = board.layout === 'story' ? `${r.group}: ` : '• ';
    lines.push(`${head}${r.text || '(dibujo)'}${r.author ? ` — ${r.author}` : ''}${r.likes ? ` (❤️ ${r.likes})` : ''}`);
  }
  return lines.join('\n').replace(/\n{3,}/g, '\n\n');
}

export function boardToCSV(bundle: BoardBundle, names: boolean): string {
  const esc = (v: string | number) => {
    const s = String(v);
    // Leading = + - @ would run as a formula in a spreadsheet.
    const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
    return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const head = ['#', bundle.board.layout === 'columns' ? 'Columna' : bundle.board.layout === 'story' ? 'Parte' : '', 'Texto', ...(names ? ['Autor'] : []), 'Color', 'Likes', 'Dibujo', 'Fecha'];
  const rows = exportRows(bundle, names).map((r) => [r.n, r.group, r.text, ...(names ? [r.author] : []), r.color, r.likes, r.drawing, r.date]);
  return '﻿' + [head, ...rows].map((row) => row.map(esc).join(',')).join('\n');
}
