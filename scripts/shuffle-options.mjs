#!/usr/bin/env node
/**
 * Shuffles the options of multiple-choice questions (mc / vocab / heading) in library
 * readings and listening files, deterministically (seeded by item id + question index),
 * and rewrites `answer` to the new index. Generated content tends to put the key first.
 *
 *   node scripts/shuffle-options.mjs "/-more\.json$/"     # regex on the file name
 */
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const DIR = 'src/content/generated';
const pat = process.argv[2];
if (!pat) { console.error('Usage: shuffle-options.mjs "/regex/"'); process.exit(2); }
const re = new RegExp(pat.replace(/^\/|\/$/g, ''));

function hash(s) { let h = 2166136261; for (const c of s) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; }
function rng(seed) { return () => ((seed = Math.imul(seed ^ (seed >>> 15), 2246822507) + 0x9e3779b9 >>> 0) / 4294967296); }

let files = 0, moved = 0;
for (const f of readdirSync(DIR).filter((f) => /^library-(readings|listening)-.*\.json$/.test(f) && re.test(f))) {
  const path = join(DIR, f);
  const data = JSON.parse(readFileSync(path, 'utf8'));
  data.forEach((item) => (item.questions || []).forEach((q, i) => {
    if (!Array.isArray(q.options) || typeof q.answer !== 'number') return;
    const r = rng(hash(`${item.id}#${i}`));
    const order = q.options.map((_, k) => k);
    for (let k = order.length - 1; k > 0; k--) { const j = Math.floor(r() * (k + 1)); [order[k], order[j]] = [order[j], order[k]]; }
    const key = q.options[q.answer];
    q.options = order.map((k) => q.options[k]);
    q.answer = q.options.indexOf(key);
    moved++;
  }));
  writeFileSync(path, '[\n' + data.map((x) => JSON.stringify(x)).join(',\n') + '\n]\n');
  files++;
}
console.log(`${files} archivo(s), ${moved} pregunta(s) barajadas.`);
