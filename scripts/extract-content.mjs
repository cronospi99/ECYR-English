#!/usr/bin/env node
/**
 * Extracts the course content that ships inside the legacy interactive modules
 * (public/modules/**) into typed JSON the React app imports natively.
 *
 * The legacy data files are plain browser scripts that assign to `window.*`
 * (or ES modules with `export const`). They are evaluated in an isolated
 * `vm` context with no access to Node APIs, then serialised.
 *
 *   npm run content:extract
 *
 * Output: src/content/generated/*.json  (committed, so builds need no step)
 */
import vm from 'node:vm';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modules = path.join(root, 'public/modules');
const out = path.join(root, 'src/content/generated');
fs.mkdirSync(out, { recursive: true });

function evaluate(dir, files) {
  const sandbox = { window: {} };
  sandbox.window.window = sandbox.window;
  vm.createContext(sandbox);
  for (const f of files) {
    let src = fs.readFileSync(path.join(dir, f), 'utf8');
    // ES-module data files → window globals
    src = src.replace(/^export\s+const\s+(\w+)\s*=/gm, 'window.$1 =').replace(/^export\s+default\s+/m, 'window.__default = ');
    vm.runInContext(src, sandbox, { timeout: 5000, filename: f });
  }
  const { window: _self, ...globals } = sandbox.window;
  return JSON.parse(JSON.stringify(globals));
}

const write = (name, data) => {
  const file = path.join(out, `${name}.json`);
  fs.writeFileSync(file, JSON.stringify(data));
  console.log(`✓ ${path.relative(root, file)}  ${(fs.statSync(file).size / 1024).toFixed(0)} KB`);
};

// ---------------------------------------------------------------- books ----
const books = path.join(modules, 'books');
const LEVELS = [
  { id: 'a1', key: 'A1_UNITS', book: 'Grammar Islands', module: 'interchange-a1', files: ['a1-units.js', 'a1-enrich-a.js', 'a1-enrich-b.js', 'plus-a1.js'] },
  { id: 'a2', key: 'A2_UNITS', book: 'Grammar Network', module: 'interchange-a2', files: ['a2-units.js', 'a2-units-b.js', 'plus-a2.js'] },
  { id: 'b1', key: 'B1_UNITS', book: 'Grammar Starmap', module: 'interchange-b1', files: ['b1-units.js', 'b1-units-b.js', 'plus-b1.js'] },
  { id: 'b2', key: 'P1_UNITS', book: 'Grammar Craft', module: 'passages-1-b2', files: ['passages1-units.js', 'p1-enrich.js', 'plus-b2.js', 'plus-b2-b.js', 'plus-b2-c.js'] },
  { id: 'c1', key: 'P2_UNITS', book: 'Grammar Adventure', module: 'passages-2-c1', files: ['passages2-units.js', 'p2-enrich.js'] },
];

const stripPrivate = (o) =>
  Object.fromEntries(Object.entries(o).filter(([k]) => !k.startsWith('_')));

for (const lvl of LEVELS) {
  const w = evaluate(books, lvl.files);
  const units = (w[lvl.key] || []).map((u) => {
    const clean = stripPrivate(u);
    clean.world = u.level ?? u.node ?? null; // themed "world" name inside the original book app
    delete clean.level;
    delete clean.node;
    return clean;
  });
  write(`level-${lvl.id}`, { level: lvl.id.toUpperCase(), book: lvl.book, module: lvl.module, units });
}

// ---------------------------------------------------- A1 comic course ----
{
  const dir = path.join(modules, 'a1-foundations');
  const w = evaluate(dir, ['course-data-1.js', 'course-data-2.js', 'course-data-3.js']);
  write('a1-foundations', w.COURSE || []);
}

// --------------------------------------------------- phrasal verbs ----
{
  const dir = path.join(modules, 'phrasal-roulette');
  const w = evaluate(dir, ['phrasal-data.js']);
  write('phrasal-verbs', w.VERBS || []);
}

// ------------------------------------------------- jeopardy question bank ----
{
  const dir = path.join(modules, 'jeopardy/topics');
  const topics = fs.readdirSync(dir).filter((f) => f.endsWith('.js')).sort().map((f) => {
    const w = evaluate(dir, [f]);
    return { id: f.replace(/\.js$/, ''), ...w.__default };
  });
  write('jeopardy-topics', topics);
}

// ------------------------------------------- travel guides (Earth Modals) ----
{
  const dir = path.join(modules, 'earth-modals');
  const w = evaluate(dir, ['countries.js']);
  write(
    'travel-guides',
    (w.EM_COUNTRIES || []).map(({ lat: _lat, lng: _lng, ...c }) => c),
  );
}

// ------------------------------------------------- Verb Quest (Verb Lab) ----
// The data lives as top-level consts inside a script that also drives the DOM,
// so each declaration is sliced out by bracket matching and evaluated alone.
function sliceDecl(source, name) {
  const start = source.indexOf(`const ${name} =`);
  if (start < 0) throw new Error(`Verb Quest: ${name} not found`);
  let i = source.indexOf('=', start) + 1;
  while (/\s/.test(source[i])) i++;
  const open = source[i];
  const close = open === '[' ? ']' : '}';
  let depth = 0;
  let quote = null;
  for (let j = i; j < source.length; j++) {
    const ch = source[j];
    if (quote) {
      if (ch === '\\') j++;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'" || ch === '`') quote = ch;
    else if (ch === open) depth++;
    else if (ch === close && --depth === 0) return source.slice(i, j + 1);
  }
  throw new Error(`Verb Quest: ${name} is unbalanced`);
}
{
  const html = fs.readFileSync(path.join(root, 'content-src/verb-quest/verb-quest.html'), 'utf8');
  const sandbox = { out: {} };
  vm.createContext(sandbox);
  for (const name of ['VERBS', 'PV_VERBS', 'VP_DATA', 'VP_FEEDBACK']) {
    vm.runInContext(`out.${name} = ${sliceDecl(html, name)};`, sandbox, { timeout: 5000 });
  }
  const { VERBS, PV_VERBS, VP_DATA, VP_FEEDBACK } = JSON.parse(JSON.stringify(sandbox.out));
  write('verb-lab', {
    verbs: VERBS,
    phrasalFamilies: Object.entries(PV_VERBS).map(([verb, f]) => ({ verb, ...f })),
    patterns: VP_DATA,
    patternFeedback: VP_FEEDBACK,
  });
}
