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
 *
 * v2 (supabase/migrations/18_live_boards_v2.sql): card shapes and sizes,
 * arrows between cards (mind maps) and private walls (members). Until 18 runs
 * the app keeps working as v1 and hides those tools (`BoardBundle.v2`).
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

// ---------------------------------------------------------------- shapes ----
export const CARD_SHAPES = ['note', 'round', 'circle', 'bubble', 'cloud', 'hexagon', 'diamond'] as const;
export type CardShape = (typeof CARD_SHAPES)[number];

/** Resize limits on the Jam canvas (the server clamps to 100–640 × 60–640). */
export const MIN_W = 120;
export const MAX_W = 600;
export const MIN_H = 80;
export const MAX_H = 600;

export interface ShapeInfo {
  label: string;
  /** Default size on the canvas; h null = grows with the text (only the note). */
  w: number;
  h: number | null;
  /** Width / height in Columns and Story (null = grows with the text). */
  aspect: number | null;
  /** Where the text goes inside the shape, as % of the box (top, right, bottom, left). */
  inset: [string, string, string, string];
}

export const SHAPES: Record<CardShape, ShapeInfo> = {
  note: { label: 'Nota', w: CARD_W, h: null, aspect: null, inset: ['14px', '14px', '14px', '14px'] },
  round: { label: 'Píldora', w: 240, h: 120, aspect: null, inset: ['max(10px, 11%)', 'max(18px, 13%)', 'max(10px, 11%)', 'max(18px, 13%)'] },
  circle: { label: 'Círculo', w: 210, h: 210, aspect: 1.55, inset: ['16%', '15%', '16%', '15%'] },
  bubble: { label: 'Burbuja', w: 240, h: 170, aspect: 1.6, inset: ['9%', '8%', '27%', '8%'] },
  cloud: { label: 'Nube', w: 260, h: 180, aspect: 1.7, inset: ['21%', '17%', '17%', '17%'] },
  hexagon: { label: 'Hexágono', w: 240, h: 200, aspect: 1.5, inset: ['10%', '20%', '10%', '20%'] },
  diamond: { label: 'Rombo', w: 240, h: 240, aspect: 1.6, inset: ['25%', '24%', '25%', '24%'] },
};

/** The "Tarjeta central" of a mind map: a big circle. */
export const CENTRAL = { shape: 'circle' as CardShape, w: 300, h: 300 };

export const normShape = (s: unknown): CardShape => ((CARD_SHAPES as readonly string[]).includes(String(s)) ? (s as CardShape) : 'note');

/** The card's box on the canvas (h null = automatic height). */
export function cardBox(c: Pick<LiveCard, 'shape' | 'w' | 'h'>): { w: number; h: number | null } {
  const d = SHAPES[c.shape] ?? SHAPES.note;
  const w = c.w ?? d.w;
  const h = c.h ?? (c.shape === 'note' ? null : d.h);
  return { w, h };
}

// ----------------------------------------------------------------- links ----
export const LINK_KINDS = ['arrow', 'line', 'double'] as const;
export type LinkKind = (typeof LINK_KINDS)[number];
export const LINK_COLORS = ['ink', 'blue', 'red', 'green', 'orange', 'purple', 'pink', 'teal'] as const;
export type LinkColor = (typeof LINK_COLORS)[number];
export const LINK_INK: Record<LinkColor, string> = {
  ink: 'color-mix(in srgb, var(--label) 72%, transparent)',
  blue: 'var(--blue)',
  red: 'var(--red)',
  green: 'var(--green)',
  orange: 'var(--orange)',
  purple: 'var(--purple)',
  pink: 'var(--pink)',
  teal: 'var(--teal)',
};
export const MAX_LINK_LABEL = 40;

export interface LiveLink {
  id: string;
  from: string;
  to: string;
  kind: LinkKind;
  color: LinkColor;
  label: string | null;
  /** I drew it (no other author data ever reaches the browser). */
  mine: boolean;
  pending?: boolean;
}

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
  /** v2 — teacher only: who may enter (null = the whole class). */
  members?: string[] | null;
  /** v2 — how many members a private wall has (null = the whole class). */
  member_count?: number | null;
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
  /** Teacher only: who may enter (null = the whole class). */
  members: string[] | null;
  /** Null = the whole class. */
  member_count: number | null;
}

export interface LiveCard {
  id: string;
  text: string;
  color: CardColor;
  shape: CardShape;
  /** Size on the Jam canvas (null = automatic). */
  w: number | null;
  h: number | null;
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
  links: LiveLink[];
  /** Distinct students who posted. */
  authors: number;
  /** Migration 18 has run (shapes, arrows, private walls are available). */
  v2: boolean;
}

export type BoardErrorKind = 'offline' | 'missing' | 'not_found' | 'closed' | 'locked' | 'denied' | 'network' | 'other';

export const BOARDS_MISSING_MSG = 'Falta activar el Muro en vivo: ejecuta supabase/migrations/16_live_boards.sql en Supabase → SQL Editor.';
export const BOARDS_V2_MSG = 'Falta actualizar el muro: ejecuta supabase/migrations/18_live_boards_v2.sql en Supabase → SQL Editor.';

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
  if ((code === 'PGRST202' || code === '42883') && /live_link|p_members|p_shape/i.test(msg)) return new BoardError('missing', BOARDS_V2_MSG);
  if (code === 'PGRST202' || code === '42883' || code === '42P01' || (/live_(board|card)/i.test(msg) && /could not find|does not exist|schema cache/i.test(msg)))
    return new BoardError('missing', BOARDS_MISSING_MSG);
  if (/BOARD_CLOSED/.test(msg)) return new BoardError('closed', 'Tu profe cerró este muro.');
  if (/BOARD_NOT_FOUND/.test(msg)) return new BoardError('not_found', 'Este muro no existe o no es de tu clase.');
  if (/CARD_NOT_FOUND/.test(msg)) return new BoardError('not_found', 'Esa tarjeta ya no existe.');
  if (/BOARD_LOCKED/.test(msg)) return new BoardError('locked', 'El muro está bloqueado 🔒');
  if (/CARD_LIMIT/.test(msg)) return new BoardError('other', /full/.test(msg) ? 'El muro está lleno (400 tarjetas).' : 'Máximo 40 tarjetas por persona.');
  if (/LINK_EXISTS/.test(msg)) return new BoardError('other', 'Ya están conectadas.');
  if (/LINK_LIMIT/.test(msg)) return new BoardError('other', /full/.test(msg) ? 'Demasiadas flechas (300).' : 'Máximo 60 flechas por persona.');
  if (/LINK_NOT_FOUND/.test(msg)) return new BoardError('not_found', 'Esa flecha ya no existe.');
  if (/LINK_CARDS/.test(msg)) return new BoardError('other', 'Elige dos tarjetas distintas.');
  if (/BOARD_LIMIT/.test(msg)) return new BoardError('other', 'Tienes 50 muros abiertos: cierra alguno primero.');
  if (/text_len/.test(msg)) return new BoardError('other', `Máximo ${MAX_TEXT} caracteres.`);
  if (/has_content/.test(msg)) return new BoardError('other', 'Escribe algo o haz un dibujo.');
  if (/cards_image/.test(msg)) return new BoardError('other', 'El dibujo es demasiado grande.');
  if (/title_len/.test(msg)) return new BoardError('other', 'Ponle un título (máx. 120).');
  if (/Only teachers/i.test(msg)) return new BoardError('denied', 'Solo los docentes pueden crear muros.');
  if (/only|own cards|own arrows|permission denied|42501/i.test(msg)) return new BoardError('denied', 'No tienes permiso para hacer esto.');
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
  return (rows ?? []).map((r) => ({
    ...r,
    cards: Number(r.cards) || 0,
    members: Array.isArray(r.members) ? r.members.map(String) : null,
    member_count: r.member_count === null || r.member_count === undefined ? null : Number(r.member_count) || 0,
  }));
}

export async function createBoard(input: {
  title: string;
  layout: BoardLayout;
  prompt?: string;
  columns?: string[];
  showNames?: boolean;
  /** Null / undefined = the whole class. Only sent when set (works before migration 18). */
  members?: string[] | null;
}): Promise<string> {
  return rpc<string>('create_live_board', {
    p_title: input.title.trim(),
    p_layout: input.layout,
    p_prompt: input.prompt?.trim() || null,
    p_columns: input.layout === 'columns' ? (input.columns ?? []).map((c) => c.trim()).filter(Boolean) : null,
    p_show_names: input.showNames ?? true,
    ...(input.members ? { p_members: input.members.slice(0, 200) } : {}),
  });
}

export type BoardPatch = Partial<Pick<LiveBoard, 'title' | 'prompt' | 'columns' | 'show_names' | 'locked' | 'spotlight' | 'members'>>;

export const updateBoard = (id: string, patch: BoardPatch) => rpc<void>('update_live_board', { p_board: id, p_patch: patch });
export const closeBoard = (id: string, closed = true) => rpc<void>('close_live_board', { p_board: id, p_closed: closed });
export const deleteBoard = (id: string) => rpc<void>('delete_live_board', { p_board: id });

function normColor(c: unknown): CardColor {
  return (CARD_COLORS as readonly string[]).includes(String(c)) ? (c as CardColor) : 'yellow';
}

const num = (v: unknown): number | null => (v === null || v === undefined || v === '' || !Number.isFinite(Number(v)) ? null : Number(v));

export async function getBoard(id: string): Promise<BoardBundle> {
  const raw = await rpc<(Omit<BoardBundle, 'links' | 'v2'> & { links?: LiveLink[] }) | null>('get_live_board', { p_board: id });
  if (!raw?.board) throw new BoardError('not_found', 'Este muro no existe o no es de tu clase.');
  const b = raw.board;
  const cards = (Array.isArray(raw.cards) ? raw.cards : []).map((c) => ({
      ...c,
      text: c.text ?? '',
      color: normColor(c.color),
      shape: normShape(c.shape),
      w: num(c.w),
      h: num(c.h),
      x: Number(c.x) || 0,
      y: Number(c.y) || 0,
      col: Number(c.col) || 0,
      position: Number(c.position) || 0,
      likes: Number(c.likes) || 0,
    }));
  const ids = new Set(cards.map((c) => c.id));
  return {
    role: raw.role === 'teacher' ? 'teacher' : 'student',
    authors: Number(raw.authors) || 0,
    v2: Array.isArray(raw.links),
    board: {
      ...b,
      layout: (['jam', 'columns', 'story'] as const).includes(b.layout) ? b.layout : 'jam',
      columns: Array.isArray(b.columns) ? b.columns.map(String) : [],
      members: Array.isArray(b.members) ? b.members.map(String) : null,
      member_count: num(b.member_count),
    },
    cards,
    links: (Array.isArray(raw.links) ? raw.links : [])
      .filter((l) => ids.has(l.from) && ids.has(l.to))
      .map((l) => ({
        id: String(l.id),
        from: String(l.from),
        to: String(l.to),
        kind: (LINK_KINDS as readonly string[]).includes(l.kind) ? l.kind : 'arrow',
        color: (LINK_COLORS as readonly string[]).includes(l.color) ? l.color : 'ink',
        label: l.label || null,
        mine: !!l.mine,
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
  shape?: CardShape;
  w?: number | null;
  h?: number | null;
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
    // v2 arguments only when used, so plain cards still work before migration 18.
    ...((d.shape && d.shape !== 'note') || d.w || d.h
      ? { p_shape: d.shape ?? 'note', p_w: d.w ? Math.round(d.w) : null, p_h: d.h ? Math.round(d.h) : null }
      : {}),
  });

export type CardPatch = Partial<{
  text: string;
  color: CardColor;
  image: string | null;
  col: number;
  x: number;
  y: number;
  position: number;
  shape: CardShape;
  w: number | null;
  h: number | null;
}>;

export const updateCard = (id: string, patch: CardPatch) => rpc<void>('update_live_card', { p_card: id, p_patch: patch });
export const deleteCard = (id: string) => rpc<void>('delete_live_card', { p_card: id });
export const likeCard = (id: string) => rpc<{ likes: number; liked: boolean }>('like_live_card', { p_card: id });

// ----------------------------------------------------------------- links ----
export interface LinkDraft {
  from: string;
  to: string;
  kind: LinkKind;
  color: LinkColor;
  label?: string | null;
}
export type LinkPatch = Partial<{ kind: LinkKind; color: LinkColor; label: string | null; flip: boolean }>;

export const addLink = (boardId: string, d: LinkDraft) =>
  rpc<string>('add_live_link', {
    p_board: boardId,
    p_from: d.from,
    p_to: d.to,
    p_kind: d.kind,
    p_color: d.color,
    p_label: d.label?.trim().slice(0, MAX_LINK_LABEL) || null,
  });
export const updateLink = (id: string, patch: LinkPatch) => rpc<void>('update_live_link', { p_link: id, p_patch: patch });
export const deleteLink = (id: string) => rpc<void>('delete_live_link', { p_link: id });

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
  if (bundle.links.length) {
    const text = (id: string) => {
      const c = bundle.cards.find((x) => x.id === id);
      return c ? `«${(c.text || '(dibujo)').slice(0, 60)}»` : '?';
    };
    const sign: Record<LinkKind, string> = { arrow: '→', line: '—', double: '↔' };
    lines.push('', '## Conexiones');
    for (const l of bundle.links) lines.push(`• ${text(l.from)} ${sign[l.kind]} ${text(l.to)}${l.label ? ` (${l.label})` : ''}`);
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
