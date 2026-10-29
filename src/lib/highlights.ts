import type { CSSProperties } from 'react';

/**
 * Formatting for "Mis notas": highlighter colours, bold and italics. A note
 * stays plain text: formatted stretches are wrapped in invisible marker
 * characters, so the character count, search, titles and the cloud copy keep
 * working unchanged, and the marks take no room on screen.
 *
 * - Colour: a start mark per colour (U+2061–U+2064) and one end mark (U+2060).
 * - Bold: U+206A on / U+206B off. Italic: U+206C on / U+206D off. These are
 *   deprecated, default-ignorable format characters (invisible everywhere, no
 *   effect in modern text rendering), so a note leaking somewhere unstripped
 *   still reads clean.
 *
 * - Size and font (and ten colours in all): a two-character mark, a prefix
 *   (U+FE00 size, U+FE01 font, U+FE02 extra colour) and a parameter
 *   (U+FE03 + n). These are variation selectors, also invisible. Size 0 and
 *   font 0 are the defaults.
 *
 * - Underline, strikethrough, text colour and line alignment (added later)
 *   reuse the extra-colour prefix with parameters no colour uses: U+FE02 +
 *   key (U+FE03 + 7…10) + value (U+FE03 + v). Key 7 underline (v 0/1), 8
 *   strikethrough (0/1), 9 text colour (0 = default, else TEXT_COLORS[v]),
 *   10 alignment (0 left, 1 centre, 2 right). No new code points: an older
 *   version of the app reads the prefix + key as an unknown colour and skips
 *   it, and strips the value character like any other mark, so its text and
 *   other formatting stay intact.
 * - A line's alignment is that of the character that starts it (the line
 *   break before it; the first character for the first line).
 * - Lists are plain text, no marks: "• ", "1. ", "☐ " / "☑ " at the start of
 *   a line (optionally indented with spaces). See LIST_RE / lineInfo().
 *
 * The marks are independent toggles (a state machine, not nested tags), so
 * bold, italic and a colour combine and overlap freely. An orphan end mark is
 * harmless; an unclosed start mark lasts to the end of the note. Unknown or
 * stray marks are skipped.
 */
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink' | 'orange' | 'red' | 'purple' | 'teal' | 'gray' | 'brown';

export const HIGHLIGHTS: { id: HighlightColor; label: string; mark: string; bg: string }[] = [
  { id: 'yellow', label: 'Amarillo', mark: '\u2061', bg: 'color-mix(in srgb, #ffd60a 55%, transparent)' },
  { id: 'green', label: 'Verde', mark: '\u2062', bg: 'color-mix(in srgb, #30d158 40%, transparent)' },
  { id: 'blue', label: 'Azul', mark: '\u2063', bg: 'color-mix(in srgb, #64d2ff 45%, transparent)' },
  { id: 'pink', label: 'Rosa', mark: '\u2064', bg: 'color-mix(in srgb, #ff6fb5 40%, transparent)' },
  { id: 'orange', label: 'Naranja', mark: '\uFE02\uFE04', bg: 'color-mix(in srgb, #ff9f0a 45%, transparent)' },
  { id: 'red', label: 'Rojo', mark: '\uFE02\uFE05', bg: 'color-mix(in srgb, #ff453a 38%, transparent)' },
  { id: 'purple', label: 'Morado', mark: '\uFE02\uFE06', bg: 'color-mix(in srgb, #bf5af2 38%, transparent)' },
  { id: 'teal', label: 'Turquesa', mark: '\uFE02\uFE07', bg: 'color-mix(in srgb, #40c8c8 45%, transparent)' },
  { id: 'gray', label: 'Gris', mark: '\uFE02\uFE08', bg: 'color-mix(in srgb, #8e8e93 40%, transparent)' },
  { id: 'brown', label: 'Café', mark: '\uFE02\uFE09', bg: 'color-mix(in srgb, #a2845e 45%, transparent)' },
];

/** Text sizes (index = the size mark's parameter; 0 is the normal size). */
export const SIZES: { label: string; em: number | null }[] = [
  { label: 'Normal', em: null },
  { label: 'Pequeño', em: 0.82 },
  { label: 'Grande', em: 1.3 },
  { label: 'Muy grande', em: 1.7 },
  { label: 'Enorme', em: 2.3 },
];

/** Fonts (index = the font mark's parameter; 0 is the app's own). */
export const FONTS: { label: string; family: string | null }[] = [
  { label: 'Inter (app)', family: null },
  { label: 'Google · Roboto', family: "Roboto, 'Google Sans', Arial, sans-serif" },
  { label: 'Apple · San Francisco', family: "-apple-system, BlinkMacSystemFont, 'SF Pro Text', 'Helvetica Neue', system-ui, sans-serif" },
  { label: 'Microsoft · Segoe UI', family: "'Segoe UI', Calibri, Arial, sans-serif" },
  { label: 'Georgia (con serifa)', family: "Georgia, 'Times New Roman', serif" },
];
/** Text colours (index = the text-colour mark's value; 0 is the normal colour). `css` adapts to light / dark; `hex` is for the clipboard. */
export const TEXT_COLORS: { label: string; css: string | null; hex: string }[] = [
  { label: 'Automático', css: null, hex: '' },
  { label: 'Rojo', css: 'var(--red-ink)', hex: '#d70015' },
  { label: 'Naranja', css: 'var(--orange-ink)', hex: '#c93400' },
  { label: 'Verde', css: 'var(--green-ink)', hex: '#248a3d' },
  { label: 'Azul', css: 'var(--blue-ink)', hex: '#0040dd' },
  { label: 'Morado', css: 'var(--purple-ink)', hex: '#8944ab' },
  { label: 'Rosa', css: 'var(--pink-ink)', hex: '#d30f45' },
  { label: 'Turquesa', css: 'var(--teal-ink)', hex: '#0071a4' },
  { label: 'Gris', css: 'var(--label-2)', hex: '#6e6e73' },
];
/** Swatch colours of TEXT_COLORS (vivid, for the palette buttons). */
export const TEXT_SWATCH = ['var(--label)', 'var(--red)', 'var(--orange)', 'var(--green)', 'var(--blue)', 'var(--purple)', 'var(--pink)', 'var(--teal)', '#8e8e93'];

export const ALIGNS = ['left', 'center', 'right'] as const;

const SIZE_PREFIX = '\uFE00';
const FONT_PREFIX = '\uFE01';
const COLOR_PREFIX = '\uFE02';
const PARAM0 = 0xfe03;
export const END_MARK = '\u2060';
export const BOLD_ON = '\u206A';
export const BOLD_OFF = '\u206B';
export const ITALIC_ON = '\u206C';
export const ITALIC_OFF = '\u206D';

const KEY_UNDERLINE = 7;
const KEY_STRIKE = 8;
const KEY_FG = 9;
const KEY_ALIGN = 10;
const attr = (key: number, v: number) => COLOR_PREFIX + String.fromCharCode(PARAM0 + key, PARAM0 + v);

const START = new Map(HIGHLIGHTS.map((h) => [h.mark, h]));
const START_EXT = new Map(HIGHLIGHTS.filter((h) => h.mark.length === 2).map((h) => [h.mark.charCodeAt(1) - PARAM0, h]));
const BG = new Map(HIGHLIGHTS.map((h) => [h.id, h.bg]));
// U+2065 (unassigned, default-ignorable) is stripped too, in case it ever shows up.
const ANY_MARK = /[\u2060-\u2065\u206A-\u206D\uFE00-\uFE0D]/g;
const ANY_MARK_ONE = /[\u2060-\u2065\u206A-\u206D\uFE00-\uFE0D]/;

/** The note as plain text (all formatting marks dropped). */
export const stripHighlights = (s: string) => s.replace(ANY_MARK, '');
export const stripMarks = stripHighlights;
export const isHighlightColor = (c: unknown): c is HighlightColor => typeof c === 'string' && BG.has(c as HighlightColor);

export interface Fmt {
  color: HighlightColor | null;
  bold: boolean;
  italic: boolean;
  /** Index in SIZES (0 = normal). */
  size: number;
  /** Index in FONTS (0 = the app's). */
  font: number;
  underline: boolean;
  strike: boolean;
  /** Index in TEXT_COLORS (0 = normal). */
  fg: number;
  /** Index in ALIGNS; only the character starting a line counts (see lineAlign). */
  align: number;
}

export interface Segment extends Fmt {
  text: string;
}

export const PLAIN: Fmt = { color: null, bold: false, italic: false, size: 0, font: 0, underline: false, strike: false, fg: 0, align: 0 };
/** "Quitar formato": everything but the line alignment. */
export const CLEAR: Partial<Fmt> = { color: null, bold: false, italic: false, size: 0, font: 0, underline: false, strike: false, fg: 0 };
export const sameFmt = (a: Fmt, b: Fmt) =>
  a.color === b.color &&
  a.bold === b.bold &&
  a.italic === b.italic &&
  a.size === b.size &&
  a.font === b.font &&
  a.underline === b.underline &&
  a.strike === b.strike &&
  a.fg === b.fg &&
  a.align === b.align;
export const fmtOf = (g: Fmt): Fmt => ({
  color: g.color,
  bold: g.bold,
  italic: g.italic,
  size: g.size,
  font: g.font,
  underline: g.underline,
  strike: g.strike,
  fg: g.fg,
  align: g.align,
});

/** Splits a note into stretches of the same formatting (marks dropped, empty stretches skipped). */
export function segments(s: string): Segment[] {
  const out: Segment[] = [];
  let f: Fmt = { ...PLAIN };
  let buf = '';
  const flush = () => {
    if (!buf) return;
    const last = out[out.length - 1];
    if (last && sameFmt(last, f)) last.text += buf;
    else out.push({ text: buf, ...f });
    buf = '';
  };
  for (let i = 0; i < s.length; i++) {
    const ch = s[i]!;
    const h = START.get(ch);
    let next: Fmt | null = null;
    if (ch === SIZE_PREFIX || ch === FONT_PREFIX || ch === COLOR_PREFIX) {
      const n = s.charCodeAt(i + 1) - PARAM0;
      if (n >= 0 && n <= 10) {
        i++;
        if (ch === SIZE_PREFIX) next = { ...f, size: n < SIZES.length ? n : 0 };
        else if (ch === FONT_PREFIX) next = { ...f, font: n < FONTS.length ? n : 0 };
        else if (n >= KEY_UNDERLINE) {
          // Attribute: prefix + key + value (a missing value leaves the state alone).
          const v = s.charCodeAt(i + 1) - PARAM0;
          if (v >= 0 && v <= 10) {
            i++;
            if (n === KEY_UNDERLINE) next = { ...f, underline: v === 1 };
            else if (n === KEY_STRIKE) next = { ...f, strike: v === 1 };
            else if (n === KEY_FG) next = { ...f, fg: v < TEXT_COLORS.length ? v : 0 };
            else next = { ...f, align: v < ALIGNS.length ? v : 0 };
          } else next = f;
        } else next = START_EXT.get(n) ? { ...f, color: START_EXT.get(n)!.id } : f;
      } else next = f;
    } else if (h) next = { ...f, color: h.id };
    else if (ch === END_MARK) next = { ...f, color: null };
    else if (ch === BOLD_ON) next = { ...f, bold: true };
    else if (ch === BOLD_OFF) next = { ...f, bold: false };
    else if (ch === ITALIC_ON) next = { ...f, italic: true };
    else if (ch === ITALIC_OFF) next = { ...f, italic: false };
    else if (ANY_MARK_ONE.test(ch)) next = f; // stray / unknown mark
    if (next) {
      flush();
      f = next;
    } else buf += ch;
  }
  flush();
  return out;
}

const markOf = (c: HighlightColor) => HIGHLIGHTS.find((h) => h.id === c)!.mark;

/** The canonical marked text of a list of stretches (what segments() reads back). */
export function serialize(segs: Segment[]): string {
  let out = '';
  let cur: Fmt = PLAIN;
  for (const g of segs) {
    if (!g.text) continue;
    if (cur.color && cur.color !== g.color) out += END_MARK;
    if (cur.bold && !g.bold) out += BOLD_OFF;
    if (cur.italic && !g.italic) out += ITALIC_OFF;
    if (g.size !== cur.size) out += SIZE_PREFIX + String.fromCharCode(PARAM0 + g.size);
    if (g.font !== cur.font) out += FONT_PREFIX + String.fromCharCode(PARAM0 + g.font);
    if (g.color && g.color !== cur.color) out += markOf(g.color);
    if (g.bold && !cur.bold) out += BOLD_ON;
    if (g.italic && !cur.italic) out += ITALIC_ON;
    if (g.underline !== cur.underline) out += attr(KEY_UNDERLINE, g.underline ? 1 : 0);
    if (g.strike !== cur.strike) out += attr(KEY_STRIKE, g.strike ? 1 : 0);
    if (g.fg !== cur.fg) out += attr(KEY_FG, g.fg);
    if (g.align !== cur.align) out += attr(KEY_ALIGN, g.align);
    out += g.text;
    cur = g;
  }
  if (cur.color) out += END_MARK;
  if (cur.bold) out += BOLD_OFF;
  if (cur.italic) out += ITALIC_OFF;
  if (cur.size) out += SIZE_PREFIX + String.fromCharCode(PARAM0);
  if (cur.font) out += FONT_PREFIX + String.fromCharCode(PARAM0);
  if (cur.underline) out += attr(KEY_UNDERLINE, 0);
  if (cur.strike) out += attr(KEY_STRIKE, 0);
  if (cur.fg) out += attr(KEY_FG, 0);
  if (cur.align) out += attr(KEY_ALIGN, 0);
  return out;
}

/** Drops empty stretches and merges neighbours with the same formatting. */
function merge(segs: Segment[]): Segment[] {
  const out: Segment[] = [];
  for (const g of segs) {
    if (!g.text) continue;
    const last = out[out.length - 1];
    if (last && sameFmt(last, g)) last.text += g.text;
    else out.push({ ...g });
  }
  return out;
}

/** Stretches inside the plain-text range [a, b). */
function sliceSegs(segs: Segment[], a: number, b: number): Segment[] {
  const out: Segment[] = [];
  let pos = 0;
  for (const g of segs) {
    const end = pos + g.text.length;
    const s = Math.max(a, pos);
    const e = Math.min(b, end);
    if (e > s) out.push({ ...g, text: g.text.slice(s - pos, e - pos) });
    pos = end;
  }
  return out;
}

const plainLen = (segs: Segment[]) => segs.reduce((n, g) => n + g.text.length, 0);

/** Length of the visible text. */
export const plainLength = (s: string) => stripHighlights(s).length;

/** The marked text of the plain-text range [a, b) (for copying with its formatting). */
export function sliceMarked(s: string, a: number, b: number): string {
  return serialize(sliceSegs(segments(s), a, b));
}

/** Applies a formatting patch (e.g. { bold: true } or { color: null }) to the plain-text range [a, b). */
export function formatRange(s: string, a: number, b: number, patch: Partial<Fmt>): string {
  if (b < a) [a, b] = [b, a];
  const segs = segments(s);
  const total = plainLen(segs);
  const head = sliceSegs(segs, 0, a);
  const mid = sliceSegs(segs, a, b).map((g) => ({ ...g, ...patch }));
  const tail = sliceSegs(segs, b, total);
  return serialize(merge([...head, ...mid, ...tail]));
}

/** Replaces the plain-text range [a, b) with `insert` (plain text taking `fmt`, or formatted stretches). */
export function replaceRange(s: string, a: number, b: number, insert: string | Segment[], fmt: Fmt = fmtAt(s, a)): string {
  if (b < a) [a, b] = [b, a];
  const segs = segments(s);
  const total = plainLen(segs);
  const ins = typeof insert === 'string' ? [{ text: insert, ...fmtOf(fmt) }] : insert;
  return serialize(merge([...sliceSegs(segs, 0, a), ...ins, ...sliceSegs(segs, b, total)]));
}

/** The formatting new text typed at plain offset `pos` takes: that of the character before it (or after, at the start). */
export function fmtAt(s: string, pos: number): Fmt {
  const segs = segments(s);
  let p = 0;
  let prev: Fmt | null = null;
  for (const g of segs) {
    const end = p + g.text.length;
    if (pos > p && pos <= end) return fmtOf(g);
    if (pos <= p) return prev ?? fmtOf(g);
    prev = g;
    p = end;
  }
  return prev ? fmtOf(prev) : { ...PLAIN };
}

/** Whether every visible character of [a, b) is bold (or italic). Line breaks alone don't count. */
export function rangeAll(s: string, a: number, b: number, key: 'bold' | 'italic' | 'underline' | 'strike'): boolean {
  const part = sliceSegs(segments(s), Math.min(a, b), Math.max(a, b));
  const visible = part.filter((g) => /\S/.test(g.text));
  const check = visible.length ? visible : part;
  return check.length > 0 && check.every((g) => g[key]);
}

/** The size / font / text colour shared by every visible character of [a, b), or null when they differ. */
export function rangeValue(s: string, a: number, b: number, key: 'size' | 'font' | 'fg'): number | null {
  const part = sliceSegs(segments(s), Math.min(a, b), Math.max(a, b));
  const visible = part.filter((g) => /\S/.test(g.text));
  const check = visible.length ? visible : part;
  if (!check.length) return 0;
  return check.every((g) => g[key] === check[0]![key]) ? check[0]![key] : null;
}

/** Inline style of a formatted stretch (shared by the editor and read-only renderings). */
export function segStyle(g: Fmt): CSSProperties {
  const st: CSSProperties = {};
  if (g.color) {
    st.background = BG.get(g.color);
    st.borderRadius = 3;
    st.WebkitBoxDecorationBreak = 'clone';
    st.boxDecorationBreak = 'clone';
  }
  if (g.bold) st.fontWeight = 700;
  if (g.italic) st.fontStyle = 'italic';
  if (g.underline || g.strike) st.textDecorationLine = [g.underline && 'underline', g.strike && 'line-through'].filter(Boolean).join(' ');
  const fg = g.fg ? TEXT_COLORS[g.fg]?.css : null;
  if (fg) st.color = fg;
  const em = SIZES[g.size]?.em;
  if (em) st.fontSize = `${em}em`;
  const fam = FONTS[g.font]?.family;
  if (fam) st.fontFamily = fam;
  return st;
}

/**
 * Compatibility helper (raw offsets, as in a textarea holding the marked text):
 * highlights raw range [start, end) and returns the new text and the range of
 * the same characters in it.
 */
export function applyHighlight(s: string, start: number, end: number, color: HighlightColor | null): { text: string; start: number; end: number } {
  if (end < start) [start, end] = [end, start];
  const a = stripHighlights(s.slice(0, start)).length;
  const b = stripHighlights(s.slice(0, end)).length;
  const text = formatRange(s, a, b, { color });
  const rawAt = (plain: number) => {
    let n = 0;
    for (let i = 0; i < text.length; i++) {
      if (n === plain && !ANY_MARK_ONE.test(text[i]!)) return i;
      if (!ANY_MARK_ONE.test(text[i]!)) n++;
    }
    return text.length;
  };
  return { text, start: rawAt(a), end: rawAt(b) };
}

// ------------------------------------------------------------------ lists --

export type ListKind = 'bullet' | 'num' | 'check';
export interface ListInfo {
  kind: ListKind;
  /** Leading spaces (2 per level). */
  indent: number;
  /** A ticked checklist item (☑). */
  done: boolean;
  /** The number of a numbered item. */
  num: number;
  /** Where the marker starts (after the indent) and where the item's text starts. */
  markStart: number;
  len: number;
}

/** "• ", "- ", "* ", "1. ", "1) ", "☐ ", "☑ " at the start of a line, after optional spaces. */
const LIST_RE = /^( *)(?:([•*-])|(\d{1,3})([.)])|([☐☑])) /;
export const BULLET = '•';
export const CHECK_OFF = '☐';
export const CHECK_ON = '☑';

/** The list item a (plain-text) line starts with, if any. */
export function listInfo(line: string): ListInfo | null {
  const m = LIST_RE.exec(line);
  if (!m) return null;
  const indent = m[1]!.length;
  const base = { indent, markStart: indent, len: m[0].length };
  if (m[2]) return { ...base, kind: 'bullet', done: false, num: 0 };
  if (m[3]) return { ...base, kind: 'num', done: false, num: Number(m[3]) };
  return { ...base, kind: 'check', done: m[5] === CHECK_ON, num: 0 };
}

/** The marker text (with its space) of a list item. */
export function listMarker(kind: ListKind, num = 1, done = false): string {
  return kind === 'bullet' ? `${BULLET} ` : kind === 'num' ? `${num}. ` : `${done ? CHECK_ON : CHECK_OFF} `;
}

/**
 * Renumbers numbered lists in plain text: in each run of list lines, the
 * items at one indent count up from the first one's number. Returns the
 * edits as [start, end, replacement] in plain offsets (last first), so a
 * marked text can be patched with replaceRange.
 */
export function renumberEdits(plain: string): [number, number, string][] {
  const edits: [number, number, string][] = [];
  const counters = new Map<number, number>();
  let pos = 0;
  for (const line of plain.split('\n')) {
    const li = listInfo(line);
    if (!li) counters.clear();
    else {
      for (const k of [...counters.keys()]) if (k > li.indent) counters.delete(k);
      if (li.kind !== 'num') counters.delete(li.indent);
      else {
        const prev = counters.get(li.indent);
        const want = prev === undefined ? li.num : prev + 1;
        counters.set(li.indent, want);
        if (want !== li.num) {
          const digits = String(li.num).length;
          edits.push([pos + li.markStart, pos + li.markStart + digits, String(want)]);
        }
      }
    }
    pos += line.length + 1;
  }
  return edits.reverse();
}
