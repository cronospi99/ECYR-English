/**
 * Highlighter colors for "Mis notas". A note stays plain text: a highlighted
 * stretch is wrapped in invisible characters (a start mark per color and one
 * end mark), so the textarea, the character count, search and the cloud copy
 * keep working unchanged, and the marks take no room on screen.
 */
export type HighlightColor = 'yellow' | 'green' | 'blue' | 'pink';

export const HIGHLIGHTS: { id: HighlightColor; label: string; mark: string; bg: string }[] = [
  { id: 'yellow', label: 'Amarillo', mark: '⁡', bg: 'color-mix(in srgb, #ffd60a 55%, transparent)' },
  { id: 'green', label: 'Verde', mark: '⁢', bg: 'color-mix(in srgb, #30d158 40%, transparent)' },
  { id: 'blue', label: 'Azul', mark: '⁣', bg: 'color-mix(in srgb, #64d2ff 45%, transparent)' },
  { id: 'pink', label: 'Rosa', mark: '⁤', bg: 'color-mix(in srgb, #ff6fb5 40%, transparent)' },
];
export const END_MARK = '⁠';

const START = new Map(HIGHLIGHTS.map((h) => [h.mark, h]));
const ANY_MARK = /[⁠-⁤]/g;

export const stripHighlights = (s: string) => s.replace(ANY_MARK, '');

export interface Segment {
  text: string;
  color: HighlightColor | null;
}

/** Splits a note into plain and highlighted stretches (marks dropped). */
export function segments(s: string): Segment[] {
  const out: Segment[] = [];
  let color: HighlightColor | null = null;
  let buf = '';
  const flush = () => {
    if (buf) out.push({ text: buf, color });
    buf = '';
  };
  for (const ch of s) {
    const h = START.get(ch);
    if (h) {
      flush();
      color = h.id;
    } else if (ch === END_MARK) {
      flush();
      color = null;
    } else buf += ch;
  }
  flush();
  return out;
}

/** The color in force at a position of the raw text (null outside highlights). */
function colorAt(s: string, pos: number): HighlightColor | null {
  let color: HighlightColor | null = null;
  for (let i = 0; i < pos && i < s.length; i++) {
    const h = START.get(s[i]!);
    if (h) color = h.id;
    else if (s[i] === END_MARK) color = null;
  }
  return color;
}

const markOf = (c: HighlightColor) => HIGHLIGHTS.find((h) => h.id === c)!.mark;

/**
 * Applies `color` (or removes highlighting with null) to the raw range
 * [start, end), keeping the highlights around it intact. Returns the new text
 * and the range of the same characters in it.
 */
export function applyHighlight(s: string, start: number, end: number, color: HighlightColor | null): { text: string; start: number; end: number } {
  if (end < start) [start, end] = [end, start];
  const before = colorAt(s, start);
  const after = colorAt(s, end);
  const head = s.slice(0, start);
  const mid = stripHighlights(s.slice(start, end));
  const tail = s.slice(end);
  let open = '';
  let close = '';
  // Close the highlight the selection starts inside, and reopen the one it ends inside.
  if (before) open += END_MARK;
  if (color) {
    open += markOf(color);
    close += END_MARK;
  }
  if (after) close += markOf(after);
  // Sentinels around the selection survive tidy() and give its new position.
  const raw = tidy(head + open + '\uE000' + mid + '\uE001' + close + tail);
  const a = raw.indexOf('\uE000');
  const b = raw.indexOf('\uE001') - 1;
  return { text: raw.replace(/[\uE000\uE001]/g, ''), start: a, end: b };
}

/** Drops empty highlights and redundant marks left by edits. */
function tidy(s: string): string {
  let out = '';
  let color: string | null = null;
  let pending: string | null = null; // a start mark waiting for its first character
  for (const ch of s) {
    if (START.has(ch)) {
      pending = ch;
      continue;
    }
    if (ch === END_MARK) {
      if (pending) pending = null;
      else if (color) {
        out += END_MARK;
        color = null;
      }
      continue;
    }
    if (pending && pending !== color) {
      if (color) out += END_MARK;
      out += pending;
      color = pending;
    }
    pending = null;
    out += ch;
  }
  if (color) out += END_MARK;
  return out;
}
