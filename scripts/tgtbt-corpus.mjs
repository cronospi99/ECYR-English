// Counts the words used in each level's course content, to pick level-appropriate bases.
import fs from 'fs';
const R = new URL('../src/content/generated/', import.meta.url).pathname;
const files = fs.readdirSync(R);
const lv = ['a1', 'a2', 'b1', 'b2', 'c1', 'c2'];
const out = {};
for (const l of lv) {
  const cnt = {};
  for (const f of files.filter((f) => f.includes(l) && f.endsWith('.json'))) {
    const txt = fs.readFileSync(R + f, 'utf8');
    for (const m of txt.matchAll(/(?<![A-Za-z])[a-z]{4,}(?![A-Za-z])/g)) { const w = m[0].toLowerCase(); cnt[w] = (cnt[w] || 0) + 1; }
  }
  out[l] = cnt;
}
fs.writeFileSync('corpus.json', JSON.stringify(out));
for (const l of lv) console.log(l, Object.keys(out[l]).length);
