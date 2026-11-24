// Checks the Too Good To Be True word bank (public/modules/two-truths/impostor-words*.js).
// Loads the files in order inside a vm context (as the browser does), then reports:
//   - counts per level and type (real / fake / alike), after each file and in total
//   - duplicate heads (within a level and type, between files, and across levels)
//   - invalid format (real "w|es|syn, syn" with 1-3 synonyms; fake letters only; alike "slip|real")
//   - fakes that are real words in the bank, or in the English dictionary (if available)
//   - alike whose slip is a real word, or whose target is not a real word
// Dictionary (optional): npm i --no-save an-array-of-english-words. Without it those checks are skipped
// (and said so). Exit code 1 if any error was found.
import fs from 'fs';
import vm from 'vm';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const DIR = new URL('../public/modules/two-truths/', import.meta.url).pathname;
const FILES = ['impostor-words.js', 'impostor-words-2.js', 'impostor-words-3.js', 'impostor-words-4.js', 'impostor-words-5.js'].filter((f) => fs.existsSync(DIR + f));
const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const TY = ['real', 'fake', 'alike'];

// Proper names that are valid alike targets (days, months) although they are not in the lowercase dictionary.
const PROPER = new Set('monday tuesday wednesday thursday friday saturday sunday january february march april may june july august september october november december'.split(' '));
// An alike slip that is a dictionary word is an ERROR only if it is a common real word (blacklist below, plus any
// real word of the bank); otherwise (rare/archaic forms such as "childs") it is just a warning.
const COMMON = new Set('planing siting eduction putted shoping runing writting stoped planed cuting geting setted'.split(' '));
let DICT = null;
try { DICT = new Set(require('an-array-of-english-words')); } catch { /* optional */ }

const ctx = { window: {} };
vm.createContext(ctx);
const head = (s) => s.split('|')[0].toLowerCase();
const snaps = []; // contribution of each file: {level: {type: [entries]}}
let prev = null;
for (const f of FILES) {
  vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), ctx, { filename: f });
  const B = ctx.window.TGTBT_BANK, cur = {};
  for (const l of LV) { cur[l] = {}; for (const t of TY) cur[l][t] = [...B[l][t]]; }
  const diff = {};
  for (const l of LV) { diff[l] = {}; for (const t of TY) diff[l][t] = prev ? cur[l][t].slice(prev[l][t].length) : cur[l][t]; }
  // file 2 removes a few entries, so a pure length diff can mislead: use set difference instead
  if (prev) for (const l of LV) for (const t of TY) { const seen = new Set(prev[l][t]); diff[l][t] = cur[l][t].filter((x) => !seen.has(x)); }
  snaps.push({ file: f, add: diff });
  prev = cur;
}
const B = ctx.window.TGTBT_BANK;
const errors = [], warns = [];
const err = (m) => errors.push(m), warn = (m) => warns.push(m);

// ---- counts ----
const row = (a) => a.map((x) => String(x).padStart(6)).join('');
console.log('Counts (entries added by each file, then total)');
console.log('level type '.padEnd(12) + FILES.map((_, i) => ('f' + (i + 1)).padStart(6)).join('') + '  total');
for (const l of LV) for (const t of TY) {
  const per = snaps.map((s) => s.add[l][t].length);
  console.log((l + ' ' + t).padEnd(12) + row(per) + row([B[l][t].length]));
}
for (const t of TY) console.log(('ALL ' + t).padEnd(12) + row(snaps.map((s) => LV.reduce((a, l) => a + s.add[l][t].length, 0))) + row([LV.reduce((a, l) => a + B[l][t].length, 0)]));

// ---- all real heads ----
const allReal = new Map(); // head -> level
for (const l of LV) for (const s of B[l].real) allReal.set(head(s), l);

// ---- duplicates ----
for (const t of TY) {
  const seenGlobal = new Map();
  for (const l of LV) {
    const seen = new Map();
    snaps.forEach((s, i) => s.add[l][t].forEach((e) => {
      const h = head(e);
      if (seen.has(h)) err(`duplicate ${t} "${h}" in ${l}: ${FILES[seen.get(h)]} and ${FILES[i]}`);
      else seen.set(h, i);
      if (seenGlobal.has(h) && seenGlobal.get(h) !== l && t !== 'real') warn(`${t} "${h}" appears in ${seenGlobal.get(h)} and ${l}`);
      seenGlobal.set(h, l);
    }));
  }
}

// ---- format and content checks ----
const wordOk = /^[a-z]+$/;
for (const l of LV) {
  for (const e of B[l].real) {
    const p = e.split('|');
    if (p.length !== 3 || !p[0].trim() || !p[1].trim()) { err(`real bad format in ${l}: "${e}"`); continue; }
    if (!/^[a-z][a-z'-]*$/.test(p[0])) err(`real head not lowercase letters in ${l}: "${e}"`);
    const syn = p[2].trim() ? p[2].split(',').map((x) => x.trim()) : []; // empty = no true synonym
    if (syn.length > 3 || syn.some((x) => !x)) err(`real needs 0-3 synonyms in ${l}: "${e}"`);
    if (syn.includes(p[0])) err(`real is its own synonym in ${l}: "${e}"`);
    if (DICT && !DICT.has(p[0]) && !p[0].includes('-')) warn(`real not in dictionary (${l}): ${p[0]}`);
  }
  for (const e of B[l].fake) {
    if (!wordOk.test(e)) { err(`fake bad format in ${l}: "${e}"`); continue; }
    if (e.length < 4) warn(`fake very short in ${l}: ${e}`);
    if (allReal.has(e)) err(`fake "${e}" (${l}) is a real word of the bank (${allReal.get(e)})`);
    if (DICT && DICT.has(e)) err(`fake "${e}" (${l}) is in the English dictionary`);
  }
  for (const e of B[l].alike) {
    const p = e.split('|');
    if (p.length !== 2 || !p[0].trim() || !p[1].trim()) { err(`alike bad format in ${l}: "${e}"`); continue; }
    const [slip, real] = [p[0].toLowerCase(), p[1].toLowerCase()];
    if (slip === real) err(`alike identical to its target in ${l}: "${e}"`);
    if (allReal.has(slip)) err(`alike slip "${slip}" (${l}) is a real word of the bank`);
    if (DICT && DICT.has(slip)) (COMMON.has(slip) ? err : warn)(`alike slip "${slip}" (${l}) is in the English dictionary` + (COMMON.has(slip) ? ' and is a common word' : ' (rare form)'));
    const known = PROPER.has(real) || allReal.has(real) || (DICT && (DICT.has(real) || real.split(' ').every((w) => DICT.has(w))));
    if (!known) (DICT ? err : warn)(`alike target "${real}" (${l}) is not a known real word: "${e}"`);
  }
}

console.log(DICT ? '\nDictionary: loaded (' + DICT.size + ' words)' : '\nDictionary: NOT available (npm i --no-save an-array-of-english-words); dictionary checks skipped, only bank-internal checks ran');
if (warns.length) { console.log('\nWarnings (' + warns.length + '):'); warns.slice(0, 15).forEach((w) => console.log('  ' + w)); if (warns.length > 15) console.log('  ... (' + (warns.length - 15) + ' more)'); }
if (errors.length) { console.log('\nERRORS (' + errors.length + '):'); errors.forEach((x) => console.log('  ' + x)); process.exit(1); }
console.log('\nOK: no errors');
