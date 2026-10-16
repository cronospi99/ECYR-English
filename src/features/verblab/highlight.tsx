import { Fragment } from 'react';
import { ink } from '@/lib/color';

/** Irregular past / participle forms used to find inflected verbs in examples. */
const IRREGULAR: Record<string, string[]> = {
  be: ['am', 'is', 'are', 'was', 'were', 'been', 'being'],
  break: ['broke', 'broken'],
  bring: ['brought'],
  catch: ['caught'],
  come: ['came'],
  cut: ['cut'],
  do: ['did', 'done', 'does'],
  drink: ['drank', 'drunk'],
  eat: ['ate', 'eaten'],
  fall: ['fell', 'fallen'],
  get: ['got', 'gotten'],
  give: ['gave', 'given'],
  go: ['went', 'gone', 'goes'],
  hold: ['held'],
  keep: ['kept'],
  lie: ['lay', 'lain', 'lied', 'lying'],
  make: ['made'],
  put: ['put'],
  run: ['ran'],
  see: ['saw', 'seen'],
  set: ['set'],
  show: ['showed', 'shown'],
  sit: ['sat'],
  stand: ['stood'],
  take: ['took', 'taken'],
  throw: ['threw', 'thrown'],
  wake: ['woke', 'woken'],
  write: ['wrote', 'written'],
  hang: ['hung'],
  hit: ['hit'],
  let: ['let'],
  find: ['found'],
  think: ['thought'],
  pay: ['paid'],
  carry: ['carried'],
  hurry: ['hurried'],
  tidy: ['tidied'],
};

/** Regular inflections of a base verb, plus known irregular forms. */
export function verbForms(base: string): string[] {
  const b = base.toLowerCase();
  const out = new Set([b, ...(IRREGULAR[b] ?? [])]);
  const stem = b.endsWith('e') ? b.slice(0, -1) : b;
  out.add(/(s|x|z|ch|sh|o)$/.test(b) ? `${b}es` : /[^aeiou]y$/.test(b) ? `${b.slice(0, -1)}ies` : `${b}s`);
  out.add(/[^aeiou]y$/.test(b) ? `${b.slice(0, -1)}ied` : b.endsWith('e') ? `${b}d` : `${b}ed`);
  out.add(`${stem}ing`);
  // doubled final consonant: stop → stopped / stopping, get → getting
  if (/^[^aeiou]*[aeiou][bdgklmnprt]$/.test(b)) {
    const last = b.at(-1)!;
    out.add(`${b}${last}ed`);
    out.add(`${b}${last}ing`);
  }
  return [...out];
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Words to mark for a phrasal verb: every form of its verb plus its particles. */
export function phrasalTerms(pv: string): string[] {
  const [verb = '', ...rest] = pv.trim().split(/\s+/);
  return [...verbForms(verb), ...rest.filter((w) => !/^(sb|sth|someone|something|one's|oneself)$/i.test(w))];
}

/** Renders `text` with whole-word matches of `terms` highlighted. */
export function Highlight({ text, terms, color = 'var(--blue)' }: { text: string; terms: string[]; color?: string }) {
  const list = [...new Set(terms.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (!list.length) return <>{text}</>;
  const re = new RegExp(`\\b(${list.map(esc).join('|')})\\b`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1 ? (
          <mark
            key={i}
            className="rounded-[5px] px-0.5 font-semibold"
            style={{ color: ink(color), background: `color-mix(in srgb, ${color} 16%, transparent)` }}
          >
            {p}
          </mark>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
