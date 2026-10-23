import { useCallback, useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { cn } from '@/lib/cn';
import {
  fmtAt,
  formatRange,
  isHighlightColor,
  PLAIN,
  rangeAll,
  rangeValue,
  replaceRange,
  segments,
  segStyle,
  serialize,
  sliceMarked,
  stripMarks,
  type Fmt,
  type HighlightColor,
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
 */

export interface RichEditorHandle {
  /** Bold / italic on the selection; with a bare caret, for the next characters typed. */
  toggle: (key: 'bold' | 'italic') => void;
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
  /** Index in SIZES / FONTS of the selection (or caret); null when the selection mixes several. */
  size: number | null;
  font: number | null;
  /** Some text is selected (not just a caret). */
  range: boolean;
}

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

function buildInto(target: HTMLElement, text: string) {
  const doc = target.ownerDocument;
  const segs = segments(text);
  const nodes: Node[] = [];
  for (const g of segs) {
    const span = doc.createElement('span');
    span.setAttribute('data-seg', '');
    if (g.color) span.setAttribute('data-c', g.color);
    if (g.bold) span.setAttribute('data-b', '1');
    if (g.italic) span.setAttribute('data-i', '1');
    if (g.size) span.setAttribute('data-s', String(g.size));
    if (g.font) span.setAttribute('data-f', String(g.font));
    const st = segStyle(g);
    if (st.background) {
      span.style.background = String(st.background);
      span.style.borderRadius = '3px';
      span.style.setProperty('-webkit-box-decoration-break', 'clone');
      span.style.setProperty('box-decoration-break', 'clone');
    }
    if (g.bold) span.style.fontWeight = '700';
    if (g.italic) span.style.fontStyle = 'italic';
    if (st.fontSize) span.style.fontSize = String(st.fontSize);
    if (st.fontFamily) span.style.fontFamily = String(st.fontFamily);
    span.textContent = g.text;
    nodes.push(span);
  }
  // A trailing line break needs something after it to show the empty last line.
  if (segs.length && segs[segs.length - 1]!.text.endsWith('\n')) {
    const br = doc.createElement('br');
    br.setAttribute('data-end', '');
    nodes.push(br);
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
  if (el.hasAttribute('data-seg')) {
    const c = el.getAttribute('data-c');
    return {
      color: isHighlightColor(c) ? c : null,
      bold: el.getAttribute('data-b') === '1',
      italic: el.getAttribute('data-i') === '1',
      size: Number(el.getAttribute('data-s')) || 0,
      font: Number(el.getAttribute('data-f')) || 0,
    };
  }
  const out = { ...f };
  const tag = el.tagName;
  if (tag === 'B' || tag === 'STRONG') out.bold = true;
  if (tag === 'I' || tag === 'EM') out.italic = true;
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
    } else if (pos > 0) {
      s = '\n';
      f = last;
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
  const cb = useRef({ onChange, onFormat });
  cb.current = { onChange, onFormat };

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
    if (a !== b) f({ bold: rangeAll(t, a, b, 'bold'), italic: rangeAll(t, a, b, 'italic'), size: rangeValue(t, a, b, 'size'), font: rangeValue(t, a, b, 'font'), range: true });
    else {
      const p = pending.current?.fmt ?? fmtAt(t, a);
      f({ bold: p.bold, italic: p.italic, size: p.size, font: p.font, range: false });
    }
  }, []);

  const render = useCallback((text: string, sel: Sel | null) => {
    const root = el.current;
    if (!root) return;
    buildInto(root, text);
    if (sel) setSel(sel);
  }, [setSel]);

  /** Sets a new model text (from a command, not from typing). */
  const commit = useCallback(
    (next: string, sel: Sel, kind = 'other') => {
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
      el.current?.focus({ preventScroll: true });
      render(next, sel);
      setEmpty(!stripMarks(next));
      if (next !== cur) cb.current.onChange(next);
      emitFormat();
    },
    [emitFormat, getSel, maxLength, render],
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
  }, [emitFormat, maxLength, render]);

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

  /** Bold / italic on the selection; with a bare caret, for what is typed next. */
  const toggleKey = useCallback(
    (key: 'bold' | 'italic') => {
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

  /** Size / font on the selection; with a bare caret, for what is typed next. */
  const setKey = useCallback(
    (key: 'size' | 'font', value: number) => {
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

  useImperativeHandle(
    ref,
    () => ({
      toggle: toggleKey,
      setSize: (i) => setKey('size', i),
      setFont: (i) => setKey('font', i),
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
        commit(formatRange(model.current, a, b, PLAIN), [a, b], 'format');
        return true;
      },
      focus: () => el.current?.focus({ preventScroll: true }),
    }),
    [commit, emitFormat, getSel, setKey, toggleKey],
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
        e.preventDefault();
        insertText('\n', 'newline');
        return;
      }
      if (t === 'formatBold' || t === 'formatItalic') {
        e.preventDefault();
        toggleKey(t === 'formatBold' ? 'bold' : 'italic');
        return;
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
      if (!mod || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'z' || (k === 'y' && !e.metaKey)) {
        e.preventDefault();
        restore(k === 'y' || e.shiftKey ? 'future' : 'past');
      } else if ((k === 'b' || k === 'i') && !e.shiftKey) {
        e.preventDefault();
        toggleKey(k === 'b' ? 'bold' : 'italic');
      } else if (k === 'u') e.preventDefault();
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
      doc.removeEventListener('selectionchange', onSelChange);
    };
  }, [commit, emitFormat, getSel, insertText, reconcile, restore, toggleKey]);

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
