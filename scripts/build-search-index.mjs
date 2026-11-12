// Builds src/content/generated/search-index.json: what the search box on the home page looks through
// (units, grammar points, unit vocabulary and the Pre-A1 topics). Runs before every build.
import { readFileSync, writeFileSync } from 'node:fs';

const G = new URL('../src/content/generated/', import.meta.url);
const read = (f) => JSON.parse(readFileSync(new URL(f, G), 'utf8'));
const title = (s) => s.toLowerCase().replace(/(^|[\s(“"-])([a-zà-ÿ])/g, (_, a, b) => a + b.toUpperCase()).replace(/\b(A|An|The|And|Or|Of|To|In|On|At|For|With|Is|Are)\b/g, (w, _1, i) => (i ? w.toLowerCase() : w));
const out = [];

for (const lv of ['a1', 'a2', 'b1', 'b2', 'c1', 'c2']) {
  const L = lv.toUpperCase();
  const book = read(`level-${lv}.json`);
  let explain = {};
  try { explain = read(`explainers-${lv}.json`); } catch { /* none for this level */ }
  for (const u of book.units) {
    const where = `${L} · Unit ${u.n}`;
    const to = `/learn/${lv}/${u.n}`;
    out.push({ k: 'unit', t: title(u.title), s: `${where} · ${u.theme ?? ''}`.replace(/ · $/, ''), to, x: (u.overview?.goals ?? []).join(' · ') });
    (u.grammar ?? []).forEach((g, i) => {
      const e = explain[`${L}-${u.n}-${i}`] ?? {};
      out.push({ k: 'grammar', t: g.name, s: `${where} · Grammar`, to: `${to}?tab=grammar&g=${i}`, x: [g.short, e.purpose_es, e.idea_es].filter(Boolean).join(' · ') });
    });
    const terms = (u.vocab ?? []).map((v) => v.term).filter(Boolean);
    if (terms.length) out.push({ k: 'vocab', t: `Vocabulary: ${title(u.title)}`, s: `${where} · ${terms.length} words`, to: `${to}?tab=vocab`, x: terms.join(' · ') });
  }
}
for (const u of read('a1-foundations.json')) {
  for (const t of u.topics ?? []) out.push({ k: 'topic', t: t.title ?? t.label, s: `Pre-A1 · ${u.title}`, to: `/learn/foundations/${t.id}`, x: [t.label, u.es, ...(u.tags ?? [])].filter(Boolean).join(' · ') });
}
writeFileSync(new URL('search-index.json', G), JSON.stringify(out));
console.log(`search index: ${out.length} entries`);
