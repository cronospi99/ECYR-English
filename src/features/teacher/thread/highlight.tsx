import type { ReactNode } from 'react';
import type { Target } from '@/lib/thread/types';
import { tint } from '@/lib/color';
import { anchorColor } from './ui';


/**
 * Resalta el lenguaje meta: respeta las marcas **...** de la IA; si no hay, usa las frases modelo
 * literales y los detectores fiables de cada ancla (en el color de su ancla).
 */
export function makeHighlighter(targets: Target[], order: string[]) {
  return (text: string): ReactNode[] => {
    if (!text) return [];
    const color = (anchorId: string) => anchorColor(Math.max(0, order.indexOf(anchorId)));
    const mark = (s: string, key: string | number, c: string) => (
      <mark key={key} className="rounded-[5px] px-0.5 text-inherit" style={{ background: tint(c, 24), boxShadow: `inset 0 -2px 0 ${c}` }}>
        {s}
      </mark>
    );
    if (text.includes('**')) {
      return text.split(/\*\*(.+?)\*\*/g).map((part, i) => (i % 2 ? mark(part, i, color(targets[0]?.anchorId ?? '')) : part));
    }
    const ranges: { at: number; len: number; c: string }[] = [];
    const free = (at: number, len: number) => !ranges.some((r) => at < r.at + r.len && at + len > r.at);
    for (const t of targets) {
      for (const e of t.examples) {
        if (e.length < 9) continue;
        const core = e.replace(/[.!?]+$/, '');
        let from = 0;
        for (;;) {
          const at = text.toLowerCase().indexOf(core.toLowerCase(), from);
          if (at < 0) break;
          if (free(at, core.length)) ranges.push({ at, len: core.length, c: color(t.anchorId) });
          from = at + core.length;
        }
      }
    }
    for (const t of targets) {
      if (!t.matcher || t.weak) continue;
      const re = new RegExp(t.matcher.source, t.matcher.flags.includes('g') ? t.matcher.flags : `${t.matcher.flags}g`);
      for (const m of text.matchAll(re)) if (m[0] && free(m.index!, m[0].length)) ranges.push({ at: m.index!, len: m[0].length, c: color(t.anchorId) });
    }
    ranges.sort((a, b) => a.at - b.at);
    const out: ReactNode[] = [];
    let pos = 0;
    for (const r of ranges) {
      if (r.at > pos) out.push(text.slice(pos, r.at));
      out.push(mark(text.slice(r.at, r.at + r.len), r.at, r.c));
      pos = r.at + r.len;
    }
    if (pos < text.length) out.push(text.slice(pos));
    return out;
  };
}
export type Highlighter = ReturnType<typeof makeHighlighter>;
