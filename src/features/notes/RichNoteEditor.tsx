import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { cn } from '@/lib/cn';
import {
  ALIGNS,
  CHECK_OFF,
  CHECK_ON,
  CLEAR,
  fmtAt,
  fmtOf,
  formatRange,
  isHighlightColor,
  listInfo,
  listMarker,
  PLAIN,
  rangeAll,
  rangeValue,
  renumberEdits,
  replaceRange,
  segments,
  segStyle,
  serialize,
  SIZES,
  sliceMarked,
  stripMarks,
  TEXT_COLORS,
  type Fmt,
  type HighlightColor,
  type ListKind,
  type Segment,
} from '@/lib/highlights';

/**
 * The note editor: a contentEditable surface showing bold, italics and
 * highlights as real formatting, while the note itself stays plain text with
 * invisible marks (src/lib/highlights.ts).
 *
 * How it stays robust:
 * - Typing, deleting, autocorrect and IME composition are left to the browser;
 *   after each `input` the DOM is read back into the marked text. When the
 *   DOM is no longer the canonical rendering of that text (the browser added
 *   a <br>, split a span, …) it is re-rendered and the caret restored, but
 *   never in the middle of an IME composition.
 * - Enter, paste, cut, drop, formatting and undo/redo are handled here on the
 *   text model, so no browser-made markup gets in and undo is ours (a stack
 *   of {text, selection} snapshots; typing bursts are coalesced).
 * - All offsets are plain-text offsets (the DOM never contains marks).
 * - Each line is a <div data-line> (so lines can be aligned and list items
 *   get a hanging indent); the div carries the formatting of the line break
 *   that starts it, so text typed into an empty line keeps that formatting.
 * - Lists are plain-text markers ("• ", "1. ", "☐ ") handled on the text
 *   model: Enter continues a list, Enter on an empty item ends it, Backspace
 *   right after a marker removes it, Tab / Shift+Tab indent, a click on ☐
 *   ticks it.
 */

export type ToggleKey = 'bold' | 'italic' | 'underline' | 'strike';
export type BlockStyle = 'normal' | 'title' | 'subtitle';
/** Paragraph styles: a heading is a whole line in bold at a size (index in SIZES). */
const BLOCK_SIZE: Record<Exclude<BlockStyle, 'normal'>, number> = { title: 3, subtitle: 2 };

export interface RichEditorHandle {
  /** Bold / italic / underline / strikethrough on the selection; with a bare caret, for the next characters typed. */
  toggle: (key: ToggleKey) => void;
  /** Text colour (index in TEXT_COLORS) of the selection; with a bare caret, for the next characters typed. */
  setColor: (i: number) => void;
  /** Alignment (index in ALIGNS) of the lines touched by the selection. */
  setAlign: (i: number) => void;
  /** Normal text / Título / Subtítulo for the lines touched by the selection. */
  setBlock: (b: BlockStyle) => void;
  /** Turns the lines touched by the selection into (or, when they all are, out of) a list. */
  toggleList: (kind: ListKind) => void;
  /** Highlights (or with null, un-highlights) the selection. False when nothing is selected. */
  highlight: (color: HighlightColor | null) => boolean;
  /** Removes all formatting from the selection. False when nothing is selected. */
  clearFormat: () => boolean;
  /** Text size / font (index in SIZES / FONTS) of the selection; with a bare caret, for the next characters typed. */
  setSize: (i: number) => void;
  setFont: (i: number) => void;
  focus: () => void;
}

export interface FormatState {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strike: boolean;
  /** Index in SIZES / FONTS / TEXT_COLORS of the selection (or caret); null when the selection mixes several. */
  size: number | null;
  font: number | null;
  fg: number | null;
  /** Alignment of the (first) line. */
  align: number;
  /** The kind of list every touched line is in, if any. */
  list: ListKind | null;
  /** Paragraph style of the (first) line. */
  block: BlockStyle;
  /** Some text is selected (not just a caret). */
  range: boolean;
}

export const EMPTY_FORMAT: FormatState = { bold: false, italic: false, underline: false, strike: false, size: 0, font: 0, fg: 0, align: 0, list: null, block: 'normal', range: false };

/** Clipboard type carrying the marked text, so copy → paste between notes keeps the formatting. */
const NOTE_MIME = 'application/x-ecyr-note';

const BLOCK = new Set(['DIV', 'P', 'LI', 'UL', 'OL', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'BLOCKQUOTE', 'PRE', 'SECTION', 'ARTICLE', 'TR']);
const MARK_RE = /[\u2060-\u2065\u206A-\u206D\uFE00-\uFE0D]/;

/** DOM text → model text of the same length (marks never reach the DOM; nbsp typed by the browser becomes a space). */
const cleanText = (s: string) => s.replace(/[\u2060-\u2065\u206A-\u206D\uFE00-\uFE0D]/g, '').replace(/\u00A0/g, ' ').replace(/\r\n?/g, '\n');
/** Length in the model of the first `off` UTF-16 units of a DOM text node. */
const cleanLen = (raw: string, off: number) => cleanText(raw.slice(0, off)).length;
/** DOM offset within `raw` of model offset `pos` (skips marks / \r). */
function rawOffset(raw: string, pos: number) {
  if (!MARK_RE.test(raw) && !raw.includes('\r')) return Math.min(pos, raw.length);
  let n = 0;
  for (let i = 0; i < raw.length; i++) {
    if (n >= pos) return i;
    const ch = raw[i]!;
    if (MARK_RE.test(ch) || (ch === '\r' && raw[i + 1] === '\n')) continue;
    n++;
  }
  return raw.length;
}

// ------------------------------------------------------------ DOM render --

interface Line {
  /** Plain offset of the line's first character. */
  start: number;
  text: string;
  segs: Segment[];
  /** Formatting of the line break that starts the line (the first character for the first line). */
  fmt: Fmt;
}

function splitLines(text: string): Line[] {
  const segs = segments(text);
  const lines: Line[] = [{ start: 0, text: '', segs: [], fmt: segs[0] ? fmtOf(segs[0]) : { ...PLAIN } }];
  let pos = 0;
  for (const g of segs) {
    g.text.split('\n').forEach((part, i) => {
      if (i > 0) {
        pos += 1;
        lines.push({ start: pos, text: '', segs: [], fmt: fmtOf(g) });
      }
      if (part) {
        const L = lines[lines.length - 1]!;
        L.segs.push({ ...g, text: part });
        L.text += part;
        pos += part.length;
      }
    });
  }
  return lines;
}

function setFmtAttrs(el: HTMLElement, g: Fmt) {
  if (g.color) el.setAttribute('data-c', g.color);
  if (g.bold) el.setAttribute('data-b', '1');
  if (g.italic) el.setAttribute('data-i', '1');
  if (g.underline) el.setAttribute('data-u', '1');
  if (g.strike) el.setAttribute('data-x', '1');
  if (g.size) el.setAttribute('data-s', String(g.size));
  if (g.font) el.setAttribute('data-f', String(g.font));
  if (g.fg) el.setAttribute('data-fg', String(g.fg));
  if (g.align) el.setAttribute('data-a', String(g.align));
}

function attrFmt(el: HTMLElement): Fmt {
  const c = el.getAttribute('data-c');
  return {
    color: isHighlightColor(c) ? c : null,
    bold: el.getAttribute('data-b') === '1',
    italic: el.getAttribute('data-i') === '1',
    underline: el.getAttribute('data-u') === '1',
    strike: el.getAttribute('data-x') === '1',
    size: Number(el.getAttribute('data-s')) || 0,
    font: Number(el.getAttribute('data-f')) || 0,
    fg: Number(el.getAttribute('data-fg')) || 0,
    align: Number(el.getAttribute('data-a')) || 0,
  };
}

/** Extra width (em) of each indenting space before a list item, so levels read clearly. */
const INDENT_SPACING = 0.55;

/** Hanging indent (em) of a list item, so wrapped lines line up with the item's text. */
function hangEm(line: string) {
  const li = listInfo(line);
  if (!li) return 0;
  const mark = li.kind === 'bullet' ? 0.95 : li.kind === 'check' ? 1.6 : 0.62 * String(li.num).length + 0.62;
  return Math.round((li.indent * (0.28 + INDENT_SPACING) + mark) * 100) / 100;
}

function buildInto(target: HTMLElement, text: string) {
  const doc = target.ownerDocument;
  if (!stripMarks(text)) {
    target.replaceChildren();
    return;
  }
  const nodes: Node[] = [];
  for (const line of splitLines(text)) {
    const div = doc.createElement('div');
    div.setAttribute('data-line', '');
    setFmtAttrs(div, line.fmt);
    if (line.fmt.align) div.style.textAlign = ALIGNS[line.fmt.align] ?? 'left';
    const li = listInfo(line.text);
    const done = !!li && li.kind === 'check' && li.done;
    if (li) {
      const em = hangEm(line.text);
      div.style.paddingLeft = `${em}em`;
      div.style.textIndent = `-${em}em`;
      if (done) div.setAttribute('data-done', '');
    }
    // Pieces of the line, split where the list marker starts and ends.
    let pos = 0;
    for (const g of line.segs) {
      const cuts = [0, g.text.length];
      if (li) for (const c of [li.markStart, li.len]) if (c > pos && c < pos + g.text.length) cuts.push(c - pos);
      cuts.sort((x, y) => x - y);
      for (let k = 0; k < cuts.length - 1; k++) {
        const a = cuts[k]!;
        const b = cuts[k + 1]!;
        if (b <= a) continue;
        const piece = g.text.slice(a, b);
        const at = pos + a;
        const isMark = !!li && at >= li.markStart && at < li.len;
        const isIndent = !!li && at < li.markStart;
        const span = doc.createElement('span');
        span.setAttribute('data-seg', '');
        setFmtAttrs(span, g);
        if (isMark) span.setAttribute('data-mk', li!.kind);
        const st = segStyle(g);
        if (st.background) {
          span.style.background = String(st.background);
          span.style.borderRadius = '3px';
          span.style.setProperty('-webkit-box-decoration-break', 'clone');
          span.style.setProperty('box-decoration-break', 'clone');
        }
        if (g.bold) span.style.fontWeight = '700';
        if (g.italic) span.style.fontStyle = 'italic';
        const deco = [st.textDecorationLine, done && !isMark && 'line-through'].filter(Boolean).join(' ');
        if (deco) span.style.textDecorationLine = [...new Set(deco.split(' '))].join(' ');
        if (st.color) span.style.color = String(st.color);
        if (st.fontSize) span.style.fontSize = String(st.fontSize);
        if (st.fontFamily) span.style.fontFamily = String(st.fontFamily);
        if (isMark && li!.kind === 'check') {
          span.style.color = 'var(--blue)';
          span.style.cursor = 'pointer';
          span.style.fontSize = `${Math.round((SIZES[g.size]?.em ?? 1) * 112) / 100}em`;
        }
        if (isIndent) span.style.letterSpacing = `${INDENT_SPACING}em`;
        if (done && !isMark) span.style.opacity = '0.55';
        span.textContent = piece;
        div.appendChild(span);
      }
      pos += g.text.length;
    }
    if (!line.text) div.appendChild(doc.createElement('br'));
    nodes.push(div);
  }
  target.replaceChildren(...nodes);
}

/** The HTML put on the clipboard (inline styles, so other apps keep bold / italics / colours). */
function clipboardHtml(text: string) {
  const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
  return segments(text)
    .map((g) => {
      let h = esc(g.text);
      if (g.italic) h = `<i>${h}</i>`;
      if (g.bold) h = `<b>${h}</b>`;
      if (g.underline) h = `<u>${h}</u>`;
      if (g.strike) h = `<s>${h}</s>`;
      if (g.fg && TEXT_COLORS[g.fg]?.hex) h = `<span style="color:${TEXT_COLORS[g.fg]!.hex}">${h}</span>`;
      const st = segStyle(g);
      if (st.fontSize || st.fontFamily) h = `<span style="${st.fontSize ? `font-size:${String(st.fontSize)};` : ''}${st.fontFamily ? `font-family:${String(st.fontFamily).replace(/"/g, "'")}` : ''}">${h}</span>`;
      if (g.color) h = `<mark style="background:${String(segStyle(g).background)}">${h}</mark>`;
      return h;
    })
    .join('');
}

// ------------------------------------------------------------- DOM read --

type Tok =
  | { kind: 'text'; node: Text; text: string; fmt: Fmt }
  | { kind: 'br'; node: HTMLElement; fmt: Fmt }
  | { kind: 'block'; node: HTMLElement; fmt: Fmt };

function elFmt(el: HTMLElement, f: Fmt): Fmt {
  if (el.hasAttribute('data-seg') || el.hasAttribute('data-line')) return attrFmt(el);
  const out = { ...f };
  const tag = el.tagName;
  if (tag === 'B' || tag === 'STRONG') out.bold = true;
  if (tag === 'I' || tag === 'EM') out.italic = true;
  if (tag === 'U') out.underline = true;
  if (tag === 'S' || tag === 'STRIKE' || tag === 'DEL') out.strike = true;
  const d = el.style?.textDecorationLine || el.style?.textDecoration;
  if (d) {
    out.underline = d.includes('underline');
    out.strike = d.includes('line-through');
  }
  const w = el.style?.fontWeight;
  if (w) out.bold = w === 'bold' || w === 'bolder' || Number(w) >= 600;
  const st = el.style?.fontStyle;
  if (st) out.italic = st === 'italic' || st.startsWith('oblique');
  return out;
}

function tokens(root: HTMLElement): Tok[] {
  const out: Tok[] = [];
  const visit = (n: Node, f: Fmt) => {
    for (const c of Array.from(n.childNodes)) {
      if (c.nodeType === Node.TEXT_NODE) {
        const raw = c.nodeValue ?? '';
        if (raw) out.push({ kind: 'text', node: c as Text, text: cleanText(raw), fmt: f });
      } else if (c.nodeType === Node.ELEMENT_NODE) {
        const el = c as HTMLElement;
        if (el.tagName === 'BR') out.push({ kind: 'br', node: el, fmt: f });
        else {
          const ef = elFmt(el, f);
          if (BLOCK.has(el.tagName)) out.push({ kind: 'block', node: el, fmt: ef });
          visit(el, ef);
        }
      }
    }
  };
  visit(root, PLAIN);
  return out;
}

interface Layout {
  toks: Tok[];
  /** Plain-text start and length of each token. */
  start: number[];
  len: number[];
  text: string;
}

function layout(root: HTMLElement): Layout {
  const toks = tokens(root);
  const start: number[] = [];
  const len: number[] = [];
  const segs: Segment[] = [];
  let pos = 0;
  let last: Fmt = PLAIN;
  toks.forEach((t, i) => {
    start.push(pos);
    let s = '';
    let f = t.fmt;
    if (t.kind === 'text') {
      s = t.text;
      last = t.fmt;
    } else if (t.kind === 'br') {
      // A <br> with nothing after it in its block only props up an empty line.
      const next = toks[i + 1];
      if (next && next.kind !== 'block') s = '\n';
      f = last;
    } else {
      // A block starts a new line, unless it is the first thing or opens right inside the previous block.
      const prev = toks[i - 1];
      if (prev && !(prev.kind === 'block' && prev.node.contains(t.node))) {
        s = '\n';
        if (t.node.hasAttribute('data-line')) last = t.fmt;
        f = last;
      }
    }
    if (s) segs.push({ text: s, ...f });
    len.push(s.length);
    pos += s.length;
  });
  return { toks, start, len, text: serialize(segs) };
}

const before = (r: Range, node: Node, offset: number) => r.comparePoint(node, offset) <= 0;

function domToPlain(root: HTMLElement, L: Layout, node: Node, offset: number): number {
  if (node.nodeType === Node.TEXT_NODE) {
    const i = L.toks.findIndex((t) => t.node === node);
    if (i >= 0) return L.start[i]! + cleanLen(node.nodeValue ?? '', offset);
  }
  if (!root.contains(node)) return 0;
  const r = root.ownerDocument.createRange();
  try {
    r.setStart(node, Math.min(offset, node.nodeType === Node.TEXT_NODE ? (node.nodeValue ?? '').length : node.childNodes.length));
  } catch {
    return 0;
  }
  r.collapse(true);
  let pos = 0;
  for (let i = 0; i < L.toks.length; i++) {
    const t = L.toks[i]!;
    let counts: boolean;
    if (t.kind === 'text') counts = before(r, t.node, (t.node.nodeValue ?? '').length);
    else if (t.kind === 'br') {
      const p = t.node.parentNode!;
      counts = before(r, p, Array.prototype.indexOf.call(p.childNodes, t.node) + 1);
    } else counts = before(r, t.node, 0);
    if (!counts) break;
    pos = L.start[i]! + L.len[i]!;
  }
  return pos;
}

function plainToDom(root: HTMLElement, L: Layout, pos: number): [Node, number] {
  // Prefer the end of the text before the caret, so typing continues its formatting.
  for (let i = 0; i < L.toks.length; i++) {
    const t = L.toks[i]!;
    if (t.kind !== 'text') continue;
    const s = L.start[i]!;
    if (pos >= s && pos <= s + L.len[i]!) return [t.node, rawOffset(t.node.nodeValue ?? '', pos - s)];
  }
  for (let i = 0; i < L.toks.length; i++) {
    const t = L.toks[i]!;
    if (L.len[i] && L.start[i]! + L.len[i]! === pos) {
      if (t.kind === 'br') {
        const p = t.node.parentNode!;
        return [p, Array.prototype.indexOf.call(p.childNodes, t.node) + 1];
      }
      if (t.kind === 'block') return [t.node, 0];
    }
  }
  for (let i = 0; i < L.toks.length; i++) if (L.toks[i]!.kind === 'block' && L.start[i] === pos) return [L.toks[i]!.node, 0];
  return [root, pos === 0 ? 0 : root.childNodes.length];
}

/** Common prefix / suffix diff: the range of `next` that is new compared with `prev`. */
function insertedRange(prev: string, next: string): [number, number] | null {
  if (next.length <= prev.length) return null;
  let p = 0;
  while (p < prev.length && prev[p] === next[p]) p++;
  let q = 0;
  while (q < prev.length - p && prev[prev.length - 1 - q] === next[next.length - 1 - q]) q++;
  const end = next.length - q;
  return end > p ? [p, end] : null;
}

let plaintextOnly: boolean | null = null;
function supportsPlaintextOnly() {
  if (plaintextOnly === null) {
    try {
      const d = document.createElement('div');
      d.contentEditable = 'plaintext-only';
      plaintextOnly = d.contentEditable === 'plaintext-only';
    } catch {
      plaintextOnly = false;
    }
  }
  return plaintextOnly;
}

// ------------------------------------------------------------- lines / lists --

/** Plain-text bounds [start, end) of the line holding offset `pos`. */
function lineAt(plain: string, pos: number): [number, number] {
  const ls = pos > 0 ? plain.lastIndexOf('\n', pos - 1) + 1 : 0;
  const nl = plain.indexOf('\n', pos);
  return [ls, nl < 0 ? plain.length : nl];
}

/** Bounds of every line touched by [a, b]. */
function linesIn(plain: string, a: number, b: number): [number, number][] {
  const out: [number, number][] = [];
  let [ls, le] = lineAt(plain, a);
  for (;;) {
    out.push([ls, le]);
    if (le >= b || le >= plain.length) break;
    ls = le + 1;
    le = plain.indexOf('\n', ls);
    if (le < 0) le = plain.length;
  }
  return out;
}

/** The range a line-level format (alignment, heading) covers: the line plus the break that starts it. */
function lineFmtRange(plain: string, ls: number, le: number): [number, number] {
  const start = ls > 0 ? ls - 1 : 0;
  return [start, le > start ? le : Math.min(plain.length, start + 1)];
}

/** Formatting of the line starting at `ls` (that of the break before it, or of the first character). */
const lineFmt = (t: string, ls: number) => (ls > 0 ? fmtAt(t, ls) : fmtAt(t, Math.min(1, stripMarks(t).length)));

/** Formatting for text inserted at the start of the line [ls, le): that of its first character. */
const headFmt = (t: string, ls: number, le: number) => fmtAt(t, le > ls ? ls + 1 : ls);

type Edit = [start: number, end: number, insert: string, fmt?: Fmt];

/** Applies plain-offset edits (sorted last first) to a marked text and maps a selection through them. */
function applyEdits(t: string, edits: Edit[], sel: Sel): [string, Sel] {
  let [a, b] = sel;
  const map = (p: number, s: number, e: number, len: number) => (p >= e ? p + len - (e - s) : p > s ? s + Math.min(len, p - s) : p);
  for (const [s, e, ins, f] of edits) {
    t = replaceRange(t, s, e, ins, f ?? (e > s ? fmtAt(t, s + 1) : fmtAt(t, s)));
    a = map(a, s, e, ins.length);
    b = map(b, s, e, ins.length);
  }
  return [t, [a, b]];
}

/** Keeps numbered lists counting up after an edit. */
function renumber(t: string, sel: Sel): [string, Sel] {
  const edits = renumberEdits(stripMarks(t));
  return edits.length ? applyEdits(t, edits, sel) : [t, sel];
}

/** Paragraph style of the line [ls, le) (or of `f` for an empty line). */
function blockOf(t: string, ls: number, le: number, f: Fmt): BlockStyle {
  let bold = f.bold;
  let size: number | null = f.size;
  if (le > ls) {
    bold = rangeAll(t, ls, le, 'bold');
    size = rangeValue(t, ls, le, 'size');
  }
  if (!bold) return 'normal';
  return size === BLOCK_SIZE.title ? 'title' : size === BLOCK_SIZE.subtitle ? 'subtitle' : 'normal';
}

/** The nearest scrolling ancestor (null: the page itself). */
function scrollParent(el: HTMLElement): HTMLElement | null {
  for (let n = el.parentElement; n && n !== el.ownerDocument.body; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if ((oy === 'auto' || oy === 'scroll' || oy === 'overlay') && n.scrollHeight > n.clientHeight) return n;
  }
  return null;
}

// ------------------------------------------------------------ component --

type Sel = [number, number];
interface Snap {
  text: string;
  sel: Sel;
}

export function RichNoteEditor({
  initial,
  onChange,
  onFormat,
  maxLength,
  placeholder,
  className,
  labelledBy,
  autoFocus = false,
  topInset,
  bottomInset,
  ref,
}: {
  initial: string;
  onChange: (text: string) => void;
  onFormat?: (s: FormatState) => void;
  /** Maximum length of the stored (marked) text. */
  maxLength: number;
  placeholder?: string;
  className?: string;
  labelledBy?: string;
  autoFocus?: boolean;
  /** What covers the top / bottom of the scroll area (a sticky toolbar, a tab bar): the caret is kept clear of it. Viewport px. */
  topInset?: () => number;
  bottomInset?: () => number;
  ref?: Ref<RichEditorHandle>;
}) {
  const el = useRef<HTMLDivElement>(null);
  const model = useRef(initial);
  const lastSel = useRef<Sel>([stripMarks(initial).length, stripMarks(initial).length]);
  // `caret`: where the last typing burst left the caret (a burst continues only from there).
  const hist = useRef<{ past: Snap[]; future: Snap[]; kind: string; at: number; caret: number }>({ past: [], future: [], kind: '', at: 0, caret: -1 });
  const snapBefore = useRef<Snap | null>(null);
  const inputKind = useRef('other');
  const composing = useRef(false);
  /** The reconcile right after a composition (its pending format belongs to the composed word). */
  const compEnded = useRef(false);
  /** A composition already has its undo step: its later updates join it. */
  const compOpen = useRef(false);
  /** The input being reconciled started with a pending bold / italic: it opens a new undo step. */
  const breakNext = useRef(false);
  /** Bold / italic chosen with a bare caret, applied to what is typed next. */
  const pending = useRef<{ fmt: Fmt; base: string; at: number } | null>(null);
  const [empty, setEmpty] = useState(() => !stripMarks(initial));
  const cb = useRef({ onChange, onFormat, topInset, bottomInset });
  cb.current = { onChange, onFormat, topInset, bottomInset };

  const getSel = useCallback((): Sel | null => {
    const root = el.current;
    const s = root?.ownerDocument.getSelection();
    if (!root || !s || !s.rangeCount || !s.anchorNode || !s.focusNode || !root.contains(s.anchorNode) || !root.contains(s.focusNode)) return null;
    const L = layout(root);
    const a = domToPlain(root, L, s.anchorNode, s.anchorOffset);
    const b = domToPlain(root, L, s.focusNode, s.focusOffset);
    return a <= b ? [a, b] : [b, a];
  }, []);

  const setSel = useCallback(([a, b]: Sel) => {
    const root = el.current;
    const s = root?.ownerDocument.getSelection();
    if (!root || !s) return;
    const L = layout(root);
    const [an, ao] = plainToDom(root, L, a);
    const [bn, bo] = a === b ? [an, ao] : plainToDom(root, L, b);
    try {
      s.setBaseAndExtent(an, ao, bn, bo);
    } catch {
      /* node vanished */
    }
    lastSel.current = [a, b];
  }, []);

  const emitFormat = useCallback(() => {
    const f = cb.current.onFormat;
    if (!f) return;
    const [a, b] = lastSel.current;
    const t = model.current;
    const plain = stripMarks(t);
    const lines = linesIn(plain, a, b);
    const [ls, le] = lines[0]!;
    const kinds = lines.map(([s, e]) => listInfo(plain.slice(s, e))?.kind ?? null);
    const list = kinds.every((k) => k && k === kinds[0]) ? kinds[0]! : null;
    const p = pending.current?.fmt ?? fmtAt(t, a);
    const align = (le === ls && pending.current ? pending.current.fmt : lineFmt(t, ls)).align;
    const block = blockOf(t, ls, le, p);
    if (a !== b)
      f({
        bold: rangeAll(t, a, b, 'bold'),
        italic: rangeAll(t, a, b, 'italic'),
        underline: rangeAll(t, a, b, 'underline'),
        strike: rangeAll(t, a, b, 'strike'),
        size: rangeValue(t, a, b, 'size'),
        font: rangeValue(t, a, b, 'font'),
        fg: rangeValue(t, a, b, 'fg'),
        align,
        list,
        block,
        range: true,
      });
    else f({ bold: p.bold, italic: p.italic, underline: p.underline, strike: p.strike, size: p.size, font: p.font, fg: p.fg, align, list, block, range: false });
  }, []);

  /** Scrolls the page / sheet so the caret is not under the sticky toolbar, a tab bar or the on-screen keyboard. */
  const revealCaret = useCallback(() => {
    const root = el.current;
    const s = root?.ownerDocument.getSelection();
    if (!root || !s?.rangeCount || !s.focusNode || !root.contains(s.focusNode)) return;
    const doc = root.ownerDocument;
    const win = doc.defaultView!;
    const r = doc.createRange();
    try {
      r.setStart(s.focusNode, s.focusOffset);
    } catch {
      return;
    }
    r.collapse(true);
    let rect: DOMRect | undefined = r.getClientRects()[0];
    if (!rect || (!rect.top && !rect.bottom)) {
      const n = s.focusNode.nodeType === Node.ELEMENT_NODE ? (s.focusNode as Element) : s.focusNode.parentElement;
      const child = n && s.focusNode.nodeType === Node.ELEMENT_NODE ? (n.childNodes[s.focusOffset] as Element | undefined) : undefined;
      rect = (child?.getBoundingClientRect ? child : n)?.getBoundingClientRect();
    }
    if (!rect || (!rect.top && !rect.bottom)) return;
    const sc = scrollParent(root);
    const vv = win.visualViewport;
    const port = sc ? sc.getBoundingClientRect() : { top: 0, bottom: win.innerHeight };
    const top = Math.max(port.top, cb.current.topInset?.() ?? 0, vv ? vv.offsetTop : 0);
    const bottom = Math.min(port.bottom, (vv ? vv.offsetTop + vv.height : win.innerHeight) - (cb.current.bottomInset?.() ?? 0));
    const m = 12;
    let d = 0;
    if (rect.top < top + m) d = rect.top - top - m;
    else if (rect.bottom > bottom - m) d = rect.bottom - bottom + m;
    if (Math.abs(d) < 1) return;
    if (sc) sc.scrollTop += d;
    else win.scrollBy(0, d);
  }, []);

  const render = useCallback((text: string, sel: Sel | null) => {
    const root = el.current;
    if (!root) return;
    buildInto(root, text);
    if (sel) setSel(sel);
  }, [setSel]);

  /** Sets a new model text (from a command, not from typing). */
  const commit = useCallback(
    (next: string, sel: Sel | null, kind = 'other') => {
      const cur = model.current;
      if (next.length > maxLength) next = cur;
      const h = hist.current;
      if (next !== cur) {
        h.past.push({ text: cur, sel: getSel() ?? lastSel.current });
        if (h.past.length > 300) h.past.shift();
        h.future = [];
      }
      h.kind = kind;
      h.at = Date.now();
      model.current = next;
      // sel null: leave focus and the caret alone (e.g. ticking a checkbox while just reading).
      if (sel) el.current?.focus({ preventScroll: true });
      render(next, sel);
      if (!sel) lastSel.current = lastSel.current.map((p) => Math.min(p, stripMarks(next).length)) as Sel;
      setEmpty(!stripMarks(next));
      if (next !== cur) cb.current.onChange(next);
      emitFormat();
      if (sel) requestAnimationFrame(revealCaret);
    },
    [emitFormat, getSel, maxLength, render, revealCaret],
  );

  const restore = useCallback(
    (from: 'past' | 'future') => {
      const h = hist.current;
      const snap = h[from].pop();
      if (!snap) return;
      h[from === 'past' ? 'future' : 'past'].push({ text: model.current, sel: getSel() ?? lastSel.current });
      h.kind = '';
      pending.current = null;
      model.current = snap.text;
      render(snap.text, snap.sel);
      setEmpty(!stripMarks(snap.text));
      cb.current.onChange(snap.text);
      emitFormat();
    },
    [emitFormat, getSel, render],
  );

  /** After the browser changed the DOM: read it back into the model. */
  const reconcile = useCallback(() => {
    const root = el.current;
    if (!root) return;
    const L = layout(root);
    let next = L.text;
    const s = root.ownerDocument.getSelection();
    let sel: Sel | null = null;
    if (s?.rangeCount && s.anchorNode && root.contains(s.anchorNode) && s.focusNode && root.contains(s.focusNode)) {
      const a = domToPlain(root, L, s.anchorNode, s.anchorOffset);
      const b = domToPlain(root, L, s.focusNode, s.focusOffset);
      sel = a <= b ? [a, b] : [b, a];
    }
    const prev = model.current;
    const prevSnap = snapBefore.current ?? { text: prev, sel: lastSel.current };
    let rerender = false;
    let applied = false; // a pending bold / italic took effect: a new undo step

    if (!composing.current) {
      if (next.length > maxLength) {
        // Over the limit: undo what the browser just did.
        next = prev;
        sel = prevSnap.sel;
        rerender = true;
      } else if (pending.current) {
        const ins = insertedRange(pending.current.base, stripMarks(next));
        if (ins) {
          next = formatRange(next, ins[0], ins[1], pending.current.fmt);
          pending.current = null;
          rerender = true;
          applied = true;
        }
      }
    }

    if (next !== prev) {
      const h = hist.current;
      const kind = inputKind.current;
      const now = Date.now();
      const coalesce =
        compOpen.current ||
        ((kind === 'type' || kind === 'delete') && kind === h.kind && now - h.at < 1500 && !applied && !breakNext.current && prevSnap.sel[0] === h.caret && prevSnap.sel[1] === h.caret);
      if (!coalesce) {
        h.past.push(prevSnap);
        if (h.past.length > 300) h.past.shift();
      }
      if (composing.current || compEnded.current) compOpen.current = true;
      breakNext.current = false;
      h.future = [];
      h.kind = kind;
      h.at = now;
      h.caret = sel && sel[0] === sel[1] ? sel[0] : -1;
      model.current = next;
      cb.current.onChange(next);
      setEmpty(!stripMarks(next));
    }
    snapBefore.current = null;
    if (composing.current) return;
    compEnded.current = false;
    compOpen.current = false;
    if (!rerender) {
      // Re-render only when the DOM drifted from the canonical rendering.
      const probe = root.ownerDocument.createElement('div');
      buildInto(probe, next);
      rerender = probe.innerHTML !== root.innerHTML;
    }
    if (rerender) render(next, sel);
    else if (sel) lastSel.current = sel;
    emitFormat();
    requestAnimationFrame(revealCaret);
  }, [emitFormat, maxLength, render, revealCaret]);

  const insertText = useCallback(
    (insert: string | Segment[], kind = 'other') => {
      const [a, b] = getSel() ?? lastSel.current;
      const cur = model.current;
      const room = maxLength - (cur.length - sliceMarked(cur, a, b).length);
      let ins = insert;
      const fmt = pending.current?.fmt ?? fmtAt(cur, a);
      if (typeof ins === 'string') {
        ins = ins.slice(0, Math.max(0, room - 6));
        if (!ins) return;
      } else if (serialize(ins).length > room) ins = stripMarks(serialize(ins)).slice(0, Math.max(0, room - 6));
      pending.current = null;
      const len = typeof ins === 'string' ? ins.length : ins.reduce((n, g) => n + g.text.length, 0);
      commit(replaceRange(cur, a, b, ins, fmt), [a + len, a + len], kind);
    },
    [commit, getSel, maxLength],
  );

  /** Bold / italic / underline / strikethrough on the selection; with a bare caret, for what is typed next. */
  const toggleKey = useCallback(
    (key: ToggleKey) => {
      const [a, b] = getSel() ?? lastSel.current;
      const t = model.current;
      if (a === b) {
        const base = pending.current?.fmt ?? fmtAt(t, a);
        pending.current = { fmt: { ...base, [key]: !base[key] }, base: stripMarks(t), at: a };
        el.current?.focus({ preventScroll: true });
        setSel([a, a]);
        emitFormat();
        return;
      }
      commit(formatRange(t, a, b, { [key]: !rangeAll(t, a, b, key) }), [a, b], 'format');
    },
    [commit, emitFormat, getSel, setSel],
  );

  /** Size / font / text colour on the selection; with a bare caret, for what is typed next. */
  const setKey = useCallback(
    (key: 'size' | 'font' | 'fg', value: number) => {
      const [a, b] = getSel() ?? lastSel.current;
      const t = model.current;
      if (a === b) {
        const base = pending.current?.fmt ?? fmtAt(t, a);
        pending.current = { fmt: { ...base, [key]: value }, base: stripMarks(t), at: a };
        el.current?.focus({ preventScroll: true });
        setSel([a, a]);
        emitFormat();
        return;
      }
      commit(formatRange(t, a, b, { [key]: value }), [a, b], 'format');
    },
    [commit, emitFormat, getSel, setSel],
  );

  /** A line-level format (alignment, heading) on every line the selection touches. */
  const setLines = useCallback(
    (patch: Partial<Fmt>) => {
      const [a, b] = getSel() ?? lastSel.current;
      let t = model.current;
      const plain = stripMarks(t);
      const lines = linesIn(plain, a, b);
      for (const [ls, le] of lines) {
        const [s, e] = lineFmtRange(plain, ls, le);
        if (e > s) t = formatRange(t, s, e, patch);
      }
      // An empty line: what is typed there next takes it too.
      if (a === b && lines[0]![0] === lines[0]![1]) {
        const base = pending.current?.fmt ?? fmtAt(t, a);
        pending.current = { fmt: { ...base, ...patch }, base: stripMarks(t), at: a };
      }
      if (t === model.current) {
        el.current?.focus({ preventScroll: true });
        setSel([a, b]);
        emitFormat();
        return;
      }
      const keep = pending.current;
      commit(t, [a, b], 'format');
      pending.current = keep;
      emitFormat();
    },
    [commit, emitFormat, getSel, setSel],
  );

  const setBlock = useCallback(
    (bs: BlockStyle) => setLines(bs === 'normal' ? { bold: false, size: 0 } : { bold: true, size: BLOCK_SIZE[bs] }),
    [setLines],
  );

  /** List on / off for the lines the selection touches. */
  const toggleList = useCallback(
    (kind: ListKind) => {
      const sel = getSel() ?? lastSel.current;
      const t0 = model.current;
      const plain = stripMarks(t0);
      let lines = linesIn(plain, sel[0], sel[1]);
      // Several lines: blank ones stay blank.
      if (lines.length > 1) lines = lines.filter(([s, e]) => plain.slice(s, e).trim());
      if (!lines.length) return;
      const infos = lines.map(([s, e]) => listInfo(plain.slice(s, e)));
      const off = infos.every((li) => li?.kind === kind);
      const edits: Edit[] = [];
      lines.forEach(([ls, le], i) => {
        const li = infos[i];
        const mark = listMarker(kind, 1);
        if (off) edits.push([ls + li!.markStart, ls + li!.len, '']);
        else if (li) edits.push([ls + li.markStart, ls + li.len, mark, headFmt(t0, ls + li.markStart, le)]);
        else {
          const lead = plain.slice(ls, le).match(/^ */)![0].length;
          edits.push([ls + lead, ls + lead, mark, headFmt(t0, ls + lead, le)]);
        }
      });
      let [t, s2] = applyEdits(t0, edits.reverse(), sel);
      [t, s2] = renumber(t, s2);
      commit(t, s2, 'list');
    },
    [commit, getSel],
  );

  /** Enter: continues a list (or ends it on an empty item); after a heading, back to normal text. */
  const newline = useCallback(() => {
    let [a, b] = getSel() ?? lastSel.current;
    let t = model.current;
    if (a !== b) {
      t = replaceRange(t, a, b, '');
      b = a;
    }
    const plain = stripMarks(t);
    const [ls, le] = lineAt(plain, a);
    const line = plain.slice(ls, le);
    const li = listInfo(line);
    const f = pending.current?.fmt ?? fmtAt(t, a);
    pending.current = null;
    if (li && a >= ls + li.len) {
      if (!line.slice(li.len).trim()) {
        // Empty item: one level out, or out of the list.
        const edit: Edit = li.indent ? [ls, ls + Math.min(2, li.indent), ''] : [ls, ls + li.len, ''];
        let [t2, s2] = applyEdits(t, [edit], [a, a]);
        [t2, s2] = renumber(t2, s2);
        commit(t2, s2, 'list');
        return;
      }
      const mark = ' '.repeat(li.indent) + listMarker(li.kind, li.num + 1);
      let [t2, s2] = applyEdits(t, [[a, a, `\n${mark}`, f]], [a, a]);
      s2 = [a + 1 + mark.length, a + 1 + mark.length];
      [t2, s2] = renumber(t2, s2);
      commit(t2, s2, 'newline');
      return;
    }
    const nf = a === le && le > ls && blockOf(t, ls, le, f) !== 'normal' ? { ...f, bold: false, size: 0 } : f;
    if (t.length + 1 > maxLength) return;
    commit(replaceRange(t, a, a, '\n', nf), [a + 1, a + 1], 'newline');
  }, [commit, getSel, maxLength]);

  /** Tab / Shift+Tab on list lines: one level in / out. False when no list line is touched. */
  const indent = useCallback(
    (out: boolean) => {
      const sel = getSel() ?? lastSel.current;
      const t0 = model.current;
      const plain = stripMarks(t0);
      const lines = linesIn(plain, sel[0], sel[1]).filter(([s, e]) => listInfo(plain.slice(s, e)));
      if (!lines.length) return false;
      const edits: Edit[] = [];
      for (const [ls, le] of lines) {
        const li = listInfo(plain.slice(ls, le))!;
        if (out) {
          if (li.indent) edits.push([ls, ls + Math.min(2, li.indent), '']);
        } else if (li.indent < 8) edits.push([ls, ls, '  ', headFmt(t0, ls, le)]);
      }
      let [t, s2] = applyEdits(t0, edits.reverse(), sel);
      [t, s2] = renumber(t, s2);
      commit(t, s2, 'list');
      return true;
    },
    [commit, getSel],
  );

  /** ☐ ⇄ ☑ on the line starting at plain offset `ls`. */
  const toggleCheck = useCallback(
    (ls: number, focus: boolean) => {
      const t = model.current;
      const plain = stripMarks(t);
      const [, le] = lineAt(plain, ls);
      const li = listInfo(plain.slice(ls, le));
      if (!li || li.kind !== 'check') return false;
      const p = ls + li.markStart;
      const next = replaceRange(t, p, p + 1, li.done ? CHECK_OFF : CHECK_ON, fmtAt(t, p + 1));
      commit(next, focus ? (getSel() ?? lastSel.current) : null, 'check');
      return true;
    },
    [commit, getSel],
  );

  useImperativeHandle(
    ref,
    () => ({
      toggle: toggleKey,
      setSize: (i) => setKey('size', i),
      setFont: (i) => setKey('font', i),
      setColor: (i) => setKey('fg', i),
      setAlign: (i) => setLines({ align: i }),
      setBlock,
      toggleList,
      highlight: (color) => {
        const [a, b] = getSel() ?? lastSel.current;
        if (a === b) return false;
        commit(formatRange(model.current, a, b, { color }), [b, b], 'format');
        return true;
      },
      clearFormat: () => {
        const [a, b] = getSel() ?? lastSel.current;
        if (a === b) {
          pending.current = null;
          emitFormat();
          return false;
        }
        commit(formatRange(model.current, a, b, CLEAR), [a, b], 'format');
        return true;
      },
      focus: () => el.current?.focus({ preventScroll: true }),
    }),
    [commit, emitFormat, getSel, setBlock, setKey, setLines, toggleKey, toggleList],
  );

  // First render, editable mode, focus.
  useEffect(() => {
    const root = el.current;
    if (!root) return;
    root.contentEditable = supportsPlaintextOnly() ? 'plaintext-only' : 'true';
    buildInto(root, model.current);
    if (autoFocus) {
      root.focus({ preventScroll: true });
      setSel(lastSel.current);
    }
    emitFormat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Native listeners (React's onBeforeInput is not the native event with inputType).
  useEffect(() => {
    const root = el.current;
    if (!root) return;
    const doc = root.ownerDocument;

    const onBeforeInput = (e: InputEvent) => {
      const t = e.inputType;
      if (t === 'historyUndo' || t === 'historyRedo') {
        e.preventDefault();
        restore(t === 'historyUndo' ? 'past' : 'future');
        return;
      }
      if (t === 'insertParagraph' || t === 'insertLineBreak') {
        // (A hardware Enter is handled on keydown; this is the on-screen keyboard's.)
        e.preventDefault();
        newline();
        return;
      }
      if (t === 'formatBold' || t === 'formatItalic' || t === 'formatUnderline' || t === 'formatStrikeThrough') {
        e.preventDefault();
        toggleKey(t === 'formatBold' ? 'bold' : t === 'formatItalic' ? 'italic' : t === 'formatUnderline' ? 'underline' : 'strike');
        return;
      }
      if (t === 'deleteContentBackward' && !composing.current) {
        // Backspace right after a list marker removes the marker.
        const sel = getSel();
        if (sel && sel[0] === sel[1]) {
          const plain = stripMarks(model.current);
          const [ls, le] = lineAt(plain, sel[0]);
          const li = listInfo(plain.slice(ls, le));
          if (li && sel[0] === ls + li.len) {
            e.preventDefault();
            const [t2, s2] = renumber(...applyEdits(model.current, [[ls + li.markStart, ls + li.len, '']], sel));
            commit(t2, s2, 'list');
            return;
          }
        }
      }
      if (t.startsWith('format') || t === 'insertFromDrop' || t === 'deleteByDrag' || t === 'insertLink' || t === 'insertHorizontalRule' || t === 'insertOrderedList' || t === 'insertUnorderedList') {
        e.preventDefault();
        return;
      }
      if (t === 'insertFromPaste' || t === 'insertFromPasteAsQuotation') {
        // The paste event normally handles it; a paste that skipped it is inserted as plain text.
        const plain = e.dataTransfer?.getData('text/plain');
        if (plain != null) {
          e.preventDefault();
          insertText(stripMarks(cleanText(plain)), 'paste');
        }
        return;
      }
      inputKind.current = t.startsWith('delete') ? 'delete' : t.startsWith('insert') ? 'type' : 'other';
      if (!snapBefore.current) {
        snapBefore.current = { text: model.current, sel: getSel() ?? lastSel.current };
        breakNext.current = !!pending.current;
      }
    };
    const onInput = () => reconcile();
    const onCompStart = () => {
      composing.current = true;
      compOpen.current = false;
      breakNext.current = !!pending.current;
      if (!snapBefore.current) snapBefore.current = { text: model.current, sel: getSel() ?? lastSel.current };
    };
    const onCompEnd = () => {
      composing.current = false;
      compEnded.current = true;
      inputKind.current = 'type';
      // Some browsers fire the last input after compositionend; reconcile once the dust settles.
      requestAnimationFrame(() => reconcile());
    };
    const onPaste = (e: ClipboardEvent) => {
      e.preventDefault();
      const cd = e.clipboardData;
      if (!cd) return;
      const marked = cd.getData(NOTE_MIME);
      if (marked) insertText(segments(marked.replace(/\r\n?/g, '\n')), 'paste');
      else {
        const plain = stripMarks(cleanText(cd.getData('text/plain')));
        if (plain) insertText(plain, 'paste');
      }
    };
    const onCopy = (e: ClipboardEvent, cut: boolean) => {
      const sel = getSel();
      if (!sel || sel[0] === sel[1] || !e.clipboardData) return;
      e.preventDefault();
      const part = sliceMarked(model.current, sel[0], sel[1]);
      e.clipboardData.setData('text/plain', stripMarks(part));
      e.clipboardData.setData('text/html', clipboardHtml(part));
      try {
        e.clipboardData.setData(NOTE_MIME, part);
      } catch {
        /* custom types unsupported */
      }
      if (cut) commit(replaceRange(model.current, sel[0], sel[1], ''), [sel[0], sel[0]], 'cut');
    };
    const onCopyEv = (e: ClipboardEvent) => onCopy(e, false);
    const onCutEv = (e: ClipboardEvent) => onCopy(e, true);
    const onDrop = (e: DragEvent) => e.preventDefault();
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (e.key === 'Enter' && !mod && !e.altKey && !e.isComposing && e.keyCode !== 229) {
        // Enter continues a list; Shift+Enter is a plain line break (contenteditable="plaintext-only" reports both as insertLineBreak).
        e.preventDefault();
        if (e.shiftKey) insertText('\n', 'newline');
        else newline();
        return;
      }
      if (e.key === 'Tab' && !mod && !e.altKey) {
        // In a list: indent / outdent. Elsewhere Tab keeps moving the focus.
        if (indent(e.shiftKey)) e.preventDefault();
        return;
      }
      if (!mod || e.altKey) return;
      const k = e.key.toLowerCase();
      if (e.key === 'Enter') {
        // Ctrl/⌘+Enter ticks the checklist item.
        const s = getSel();
        if (s) {
          const [ls] = lineAt(stripMarks(model.current), s[0]);
          if (toggleCheck(ls, true)) e.preventDefault();
        }
      } else if (k === 'z' || (k === 'y' && !e.metaKey)) {
        e.preventDefault();
        restore(k === 'y' || e.shiftKey ? 'future' : 'past');
      } else if ((k === 'b' || k === 'i' || k === 'u') && !e.shiftKey) {
        e.preventDefault();
        toggleKey(k === 'b' ? 'bold' : k === 'i' ? 'italic' : 'underline');
      } else if (e.shiftKey && (e.code === 'KeyX' || k === 'x')) {
        e.preventDefault();
        toggleKey('strike');
      } else if (e.shiftKey && (e.code === 'Digit8' || e.code === 'Digit7' || e.code === 'Digit9')) {
        e.preventDefault();
        toggleList(e.code === 'Digit8' ? 'bullet' : e.code === 'Digit7' ? 'num' : 'check');
      } else if (e.key === '\\' && !e.shiftKey) {
        e.preventDefault();
        const s = getSel() ?? lastSel.current;
        if (s[0] !== s[1]) commit(formatRange(model.current, s[0], s[1], CLEAR), s, 'format');
        else {
          pending.current = null;
          emitFormat();
        }
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      if (/^(Arrow|Page|Home|End)/.test(e.key)) revealCaret();
    };
    // A click on ☐ / ☑ ticks it (without moving the caret there on a desktop).
    const markOf = (e: Event) => (e.target as Element | null)?.closest?.('[data-mk="check"]') ?? null;
    const onMouseDown = (e: MouseEvent) => {
      if (markOf(e)) e.preventDefault();
    };
    const onClick = (e: MouseEvent) => {
      const mk = markOf(e);
      const line = mk?.closest('[data-line]');
      if (!mk || !line || line.parentNode !== root) return;
      e.preventDefault();
      const idx = Array.prototype.indexOf.call(root.childNodes, line);
      const plain = stripMarks(model.current);
      let ls = 0;
      for (let i = 0; i < idx; i++) ls = plain.indexOf('\n', ls) + 1;
      toggleCheck(ls, root.ownerDocument.activeElement === root);
    };
    const onSelChange = () => {
      const s = getSel();
      if (!s) return;
      const p = pending.current;
      // A caret moved elsewhere before anything was typed drops the pending bold / italic.
      if (p && (s[0] !== s[1] || s[0] !== p.at) && stripMarks(model.current) === p.base) pending.current = null;
      const changed = s[0] !== lastSel.current[0] || s[1] !== lastSel.current[1];
      lastSel.current = s;
      if (changed || !p) emitFormat();
    };

    root.addEventListener('beforeinput', onBeforeInput);
    root.addEventListener('input', onInput);
    root.addEventListener('compositionstart', onCompStart);
    root.addEventListener('compositionend', onCompEnd);
    root.addEventListener('paste', onPaste);
    root.addEventListener('copy', onCopyEv);
    root.addEventListener('cut', onCutEv);
    root.addEventListener('drop', onDrop);
    root.addEventListener('keydown', onKey);
    root.addEventListener('keyup', onKeyUp);
    root.addEventListener('mousedown', onMouseDown);
    root.addEventListener('click', onClick);
    doc.addEventListener('selectionchange', onSelChange);
    return () => {
      root.removeEventListener('beforeinput', onBeforeInput);
      root.removeEventListener('input', onInput);
      root.removeEventListener('compositionstart', onCompStart);
      root.removeEventListener('compositionend', onCompEnd);
      root.removeEventListener('paste', onPaste);
      root.removeEventListener('copy', onCopyEv);
      root.removeEventListener('cut', onCutEv);
      root.removeEventListener('drop', onDrop);
      root.removeEventListener('keydown', onKey);
      root.removeEventListener('keyup', onKeyUp);
      root.removeEventListener('mousedown', onMouseDown);
      root.removeEventListener('click', onClick);
      doc.removeEventListener('selectionchange', onSelChange);
    };
  }, [commit, emitFormat, getSel, indent, insertText, newline, reconcile, restore, revealCaret, toggleCheck, toggleKey, toggleList]);

  return (
    <div className="relative">
      {empty && placeholder && (
        <div aria-hidden className={cn(className, 'text-label-3 pointer-events-none absolute inset-0 select-none')}>
          {placeholder}
        </div>
      )}
      <div
        ref={el}
        role="textbox"
        aria-multiline="true"
        aria-labelledby={labelledBy}
        aria-placeholder={placeholder}
        spellCheck
        suppressContentEditableWarning
        className={cn(className, 'relative outline-none')}
      />
    </div>
  );
}
