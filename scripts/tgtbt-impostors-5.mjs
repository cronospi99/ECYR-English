// Bulk generator for public/modules/two-truths/impostor-words-5.js (Too Good To Be True, x5 bank).
//   node scripts/tgtbt-impostors-5.mjs [seed-real.json]
// Needs: npm i --no-save an-array-of-english-words  (275k-word dictionary).
// - real  : kept as is. Read from impostor-words-5.js if it exists, else from the JSON given as argument
//           ({A1:{real:[...]}, ...}), written by hand per level ("word|español|syn, syn").
// - fake  : pronounceable invented words (English phonotactics), NOT in the dictionary, not within one edit of a
//           dictionary word, not a real word anywhere in the bank, not used by any other impostor.
// - alike : realistic slips of Spanish speakers applied to the REAL words of that level (and to words of the level's
//           course content). The slip is never a dictionary word. At most 3 slips per real word in the whole bank.
// Then check with: node scripts/tgtbt-check-bank.mjs
import fs from 'fs';
import vm from 'vm';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const DICT = new Set(require('an-array-of-english-words'));
const DIR = new URL('../public/modules/two-truths/', import.meta.url).pathname;
const OUT = DIR + 'impostor-words-5.js';
const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const TARGET = { fake: 740, alike: 1250 };
const head = (s) => s.split('|')[0].toLowerCase();

/* ---- bank so far (files 1-4) and the real words of file 5 ---- */
const ctx = { window: {} }; vm.createContext(ctx);
for (const f of ['impostor-words.js', 'impostor-words-2.js', 'impostor-words-3.js', 'impostor-words-4.js']) vm.runInContext(fs.readFileSync(DIR + f, 'utf8'), ctx);
const B = ctx.window.TGTBT_BANK;
let seed5;
if (fs.existsSync(OUT)) {
  const c5 = { window: { TGTBT_BANK: Object.fromEntries(LV.map((l) => [l, { real: [], fake: [], alike: [] }])) } }; vm.createContext(c5);
  vm.runInContext(fs.readFileSync(OUT, 'utf8'), c5);
  seed5 = c5.window.TGTBT_BANK;
} else seed5 = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
const NEW = {}; for (const l of LV) NEW[l] = { real: [...seed5[l].real], fake: [], alike: [] };

const allReal = new Set(), taken = new Set(), slipCount = {}; // slipCount[target]
for (const l of LV) {
  B[l].real.forEach((s) => allReal.add(head(s))); NEW[l].real.forEach((s) => allReal.add(head(s)));
  B[l].fake.forEach((s) => taken.add(head(s)));
  B[l].alike.forEach((s) => { taken.add(head(s)); const t = s.split('|')[1].toLowerCase(); slipCount[t] = (slipCount[t] || 0) + 1; });
}

/* ---- course content, to know which inflected forms are common words ---- */
const R = new URL('../src/content/generated/', import.meta.url).pathname;
const corpus = {}; // level -> {word: count}
const ALLC = {};
for (const l of LV) {
  const cnt = {};
  for (const f of fs.readdirSync(R).filter((f) => f.includes(l.toLowerCase()) && f.endsWith('.json')))
    for (const m of fs.readFileSync(R + f, 'utf8').matchAll(/(?<![A-Za-z])[a-z]{4,}(?![A-Za-z])/g)) { cnt[m[0]] = (cnt[m[0]] || 0) + 1; ALLC[m[0]] = (ALLC[m[0]] || 0) + 1; }
  corpus[l] = cnt;
}

let seed = 20251124; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const V = 'aeiou';
const ok = (f, base) => f && f !== base && /^[a-z]+$/.test(f) && f.length >= 4 && !DICT.has(f) && !allReal.has(f) && !taken.has(f);

/* ---- spelling slips (the mistakes Spanish speakers really make) ---- */
const rules = [
  ['undouble', 5, (w) => { const m = [...w.matchAll(/([bcdfglmnprstz])\1/g)]; if (!m.length) return null; const x = pick(m); return w.slice(0, x.index) + w.slice(x.index + 1); }],
  ['double', 2, (w) => { const ix = []; for (let i = 2; i < w.length - 1; i++) if (/[bdfglmnprst]/.test(w[i]) && V.includes(w[i - 1]) && V.includes(w[i + 1]) && w[i] !== w[i - 1]) ix.push(i); if (!ix.length) return null; const i = pick(ix); return w.slice(0, i) + w[i] + w.slice(i); }],
  ['finaldouble', 1, (w) => (/[^aeiou][aeiou][bdgmnpt]$/.test(w) && w.length <= 6 ? w + w[w.length - 1] : null)],
  ['ie-ei', 4, (w) => (w.includes('ie') ? w.replace('ie', 'ei') : w.includes('ei') ? w.replace('ei', 'ie') : null)],
  ['spanish', 7, (w) => {
    const c = [];
    if (/tion/.test(w)) c.push(w.replace('tion', 'cion'));
    if (/ph/.test(w)) c.push(w.replace('ph', 'f'));
    if (/[^aeiou]y[^aeiou]/.test(w.slice(1))) c.push(w.replace(/([^aeiou])y([^aeiou])/, '$1i$2'));
    if (/th/.test(w.slice(1))) c.push(w.replace(/(.)th/, '$1t'));
    if (/^th/.test(w)) c.push('t' + w.slice(2));
    if (/^s[tpcklmnw]/.test(w)) c.push('e' + w);
    if (/qu/.test(w)) c.push(w.replace('qu', 'cu'));
    if (/^imm/.test(w)) c.push('inm' + w.slice(3));
    if (/^h[aeiou]/.test(w) && w.length > 4) c.push(w.slice(1));
    if (/^[aeiou]/.test(w) && w.length > 4) c.push('h' + w);
    if (/ss/.test(w)) c.push(w.replace('ss', 's'));
    if (/cc/.test(w)) c.push(w.replace('cc', 'c'));
    if (/ck/.test(w)) c.push(w.replace('ck', 'k'));
    if (/sh/.test(w)) c.push(w.replace('sh', 'ch'));
    if (/ch/.test(w)) c.push(w.replace('ch', 'sh'));
    if (/^j[aeiou]/.test(w)) c.push('y' + w.slice(1));
    if (/^y[aeiou]/.test(w)) c.push('j' + w.slice(1));
    if (/v/.test(w)) c.push(w.replace('v', 'b'));
    if (/b/.test(w) && !/bb/.test(w)) c.push(w.replace('b', 'v'));
    if (/^w[aeiou]/.test(w)) c.push('gu' + w.slice(1));
    if (/ous$/.test(w)) c.push(w.replace(/ous$/, 'ous'.slice(0, 1) + 'us'));
    if (/ism$/.test(w)) c.push(w.replace(/ism$/, 'ismo'));
    if (/ist$/.test(w)) c.push(w.replace(/ist$/, 'ista'));
    if (/ic$/.test(w) && w.length > 5) c.push(w + 'o');
    if (/ct/.test(w)) c.push(w.replace('ct', 'cct'));
    return c.length ? pick(c) : null;
  }],
  ['silent', 4, (w) => {
    const c = [];
    if (/^wh/.test(w)) c.push('w' + w.slice(2));
    if (/^kn/.test(w)) c.push('n' + w.slice(2));
    if (/^wr/.test(w)) c.push('r' + w.slice(2));
    if (/mb$/.test(w)) c.push(w.slice(0, -1));
    if (/gh/.test(w)) c.push(w.replace('gh', ''));
    if (/nm/.test(w)) c.push(w.replace('nm', 'm'));
    if (/[aeiou]u[aeiou]/.test(w)) c.push(w.replace(/([aeiou])u([aeiou])/, '$1$2'));
    if (/sc[ei]/.test(w)) c.push(w.replace(/sc([ei])/, 's$1'));
    if (/dg/.test(w)) c.push(w.replace('dg', 'g'));
    if (/bt/.test(w)) c.push(w.replace('bt', 't'));
    if (/ps/.test(w)) c.push(w.replace('ps', 's'));
    if (/ng/.test(w)) c.push(w.replace('ng', 'n'));
    if (/gn/.test(w)) c.push(w.replace('gn', 'n'));
    if (/e$/.test(w) && w.length > 4) c.push(w.slice(0, -1));
    if (!/e$/.test(w) && /[aeiou][^aeiou]$/.test(w) && w.length <= 6) c.push(w + 'e');
    return c.length ? pick(c) : null;
  }],
  ['digraph', 6, (w) => {
    const pairs = [['ea', 'ee'], ['ee', 'ea'], ['oa', 'ow'], ['ai', 'ay'], ['ay', 'ai'], ['oo', 'u'], ['ou', 'ow'], ['ow', 'ou'], ['ew', 'ue'], ['au', 'aw'], ['aw', 'au'], ['ar', 'er'], ['er', 'ar'], ['or', 'ur'], ['ur', 'er'], ['ir', 'er'], ['oy', 'oi'], ['oi', 'oy'], ['igh', 'ie'], ['ie', 'y'], ['a', 'e'], ['e', 'i'], ['i', 'y'], ['o', 'u']];
    const c = []; for (const [a, b] of pairs) { const i = w.indexOf(a); if (i >= 0 && (a.length > 1 || (i > 0 && i < w.length - 1))) c.push(w.slice(0, i) + b + w.slice(i + a.length)); }
    return c.length ? pick(c) : null;
  }],
  ['suffix', 7, (w) => {
    const pairs = [['ful$', 'full'], ['ible$', 'able'], ['able$', 'ible'], ['ance$', 'ence'], ['ence$', 'ance'], ['ant$', 'ent'], ['ent$', 'ant'], ['ency$', 'ancy'], ['ancy$', 'ency'], ['ous$', 'ious'], ['ious$', 'ous'], ['ally$', 'aly'], ['ary$', 'ery'], ['ery$', 'ary'], ['ise$', 'ice'], ['sion$', 'tion'], ['tion$', 'sion'], ['er$', 'or'], ['or$', 'er'], ['ate$', 'ete'], ['ic$', 'ik'], ['ical$', 'ic'], ['ment$', 'mant'], ['ize$', 'ise'], ['ise$', 'ize'], ['ity$', 'ety'], ['ive$', 'iv'], ['ure$', 'ur'], ['age$', 'ege'], ['ate$', 'at'], ['ine$', 'in'], ['ile$', 'il'], ['ness$', 'nes'], ['ship$', 'sheep'], ['ly$', 'li'], ['y$', 'i'], ['le$', 'el'], ['al$', 'el'], ['ate$', 'ait']];
    const c = pairs.filter(([a]) => new RegExp(a).test(w)).map(([a, b]) => w.replace(new RegExp(a), b));
    return c.length ? pick(c) : null;
  }],
  ['schwa', 6, (w) => {
    if (w.length < 5) return null;
    const ix = []; for (let i = 1; i < w.length - 1; i++) if ('aeiou'.includes(w[i]) && !V.includes(w[i - 1]) && !V.includes(w[i + 1])) ix.push(i);
    if (!ix.length) return null;
    const i = pick(ix), sw = { a: pick(['e', 'o']), e: pick(['a', 'i']), i: pick(['e', 'a']), o: pick(['a', 'u']), u: pick(['o', 'a']) }[w[i]];
    return w.slice(0, i) + sw + w.slice(i + 1);
  }],
  ['prefix', 4, (w) => {
    const m = /^(un|in|im|il|ir|dis|mis|non)(.{3,})$/.exec(w); if (!m) return null;
    return pick(['un', 'in', 'dis', 'im', 'non', 'il', 'ir'].filter((p) => p !== m[1])) + m[2];
  }],
  ['ness', 3, (w) => (/iness$/.test(w) ? w.replace(/iness$/, 'yness') : /ily$/.test(w) ? w.replace(/ily$/, 'yly') : /ied$/.test(w) ? w.replace(/ied$/, 'yed') : /ies$/.test(w) ? w.replace(/ies$/, 'ys') : null)],
  ['swap', 1, (w) => { if (w.length < 5) return null; const i = 1 + Math.floor(rnd() * (w.length - 3)); if (w[i] === w[i + 1]) return null; return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2); }],
  ['drop', 1, (w) => { if (w.length < 6) return null; const i = 1 + Math.floor(rnd() * (w.length - 2)); return w.slice(0, i) + w.slice(i + 1); }],
];
const totalW = rules.reduce((a, r) => a + r[1], 0);
function slip(w) {
  for (let k = 0; k < 20; k++) {
    let x = rnd() * totalW, r = rules[0];
    for (const q of rules) { if ((x -= q[1]) <= 0) { r = q; break; } }
    const f = r[2](w);
    if (ok(f, w)) return f;
  }
  return null;
}

/* ---- inflections: the wrong form of an -ed / -ing / plural / comparative whose correct form is in the course ---- */
const isV = (c) => V.includes(c);
function inflect(w, kind) { // correct form and its typical wrong forms
  const last = w[w.length - 1], pen = w[w.length - 2], p2 = w[w.length - 3];
  const cvc = w.length >= 3 && !isV(last) && !'wxy'.includes(last) && isV(pen) && !isV(p2);
  if (kind === 'ed') {
    if (/[^aeiou]y$/.test(w)) return [w.slice(0, -1) + 'ied', [w + 'ed']];
    if (/e$/.test(w)) return [w + 'd', [w + 'ed', w.slice(0, -1) + 'ied']];
    if (cvc && w.length <= 6) return [w + last + 'ed', [w + 'ed']];
    return [w + 'ed', cvc ? [w + last + 'ed'] : [w + 'd']];
  }
  if (kind === 'ing') {
    if (/ie$/.test(w)) return [w.slice(0, -2) + 'ying', [w + 'ing']];
    if (/e$/.test(w) && !/ee$/.test(w)) return [w.slice(0, -1) + 'ing', [w + 'ing']];
    if (cvc && w.length <= 6) return [w + last + 'ing', [w + 'ing']];
    return [w + 'ing', cvc ? [w + last + 'ing'] : [w.slice(0, -1) + 'ing']];
  }
  if (kind === 's') {
    if (/[^aeiou]y$/.test(w)) return [w.slice(0, -1) + 'ies', [w + 's']];
    if (/(s|x|z|ch|sh)$/.test(w)) return [w + 'es', [w + 's']];
    if (/[^aeiou]o$/.test(w)) return [w + 'es', [w + 's']];
    return null;
  }
  if (kind === 'er') {
    if (/[^aeiou]y$/.test(w)) return [w.slice(0, -1) + 'ier', [w + 'er']];
    if (/e$/.test(w)) return [w + 'r', [w + 'er']];
    if (cvc && w.length <= 5) return [w + last + 'er', [w + 'er']];
    return null;
  }
  return null;
}

/* ---- invented words that sound English; longer and more Latinate at higher levels ---- */
const ON = ['b', 'bl', 'br', 'c', 'cl', 'cr', 'd', 'dr', 'f', 'fl', 'fr', 'g', 'gl', 'gr', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'pl', 'pr', 'qu', 'r', 's', 'sc', 'sh', 'sk', 'sl', 'sm', 'sn', 'sp', 'st', 'str', 'sw', 't', 'th', 'tr', 'tw', 'v', 'w', 'z', 'ch', 'gr', 'pl', 'br', 'tr', 'fr', 'cl'];
const SHORT = ['a', 'e', 'i', 'o', 'u'], DIG = ['ai', 'ea', 'ee', 'oa', 'oo', 'ou', 'ay', 'ow'];
const CO = ['b', 'ck', 'd', 'g', 'ft', 'l', 'll', 'lt', 'm', 'mp', 'n', 'nd', 'ng', 'nk', 'nt', 'p', 'rk', 'rn', 'rt', 'sh', 'sk', 'st', 't', 'x', 'ch', 'tch', 'ss', 'rp', 'lm', 'ld', 'rd', 'lk', 'ct', 'pt', 'z', 'ff', 'rm', 'sp', 'nch'];
const CO_DIG = ['b', 'd', 'g', 'l', 'm', 'n', 'p', 't', 'k', 'sh', 'ch', 'st', 'f', 's', 'z', 'v', 'nt', 'nd'];
const C1 = ['b', 'd', 'g', 'l', 'm', 'n', 'p', 'r', 't', 'v', 'k', 's', 'f', 'z'];
const syl = () => { const dg = rnd() < 0.3, nu = dg ? pick(DIG) : pick(SHORT); return pick(ON) + nu + pick(dg ? CO_DIG : CO); };
const END_EASY = ['', '', 'y', 'er', 'le', 'ish', 'ful', 'ing', 'ly', 'et', 'ed', 'en', 'ie'];
const END_MID = ['er', 'le', 'ish', 'ful', 'ness', 'ment', 'ous', 'ive', 'able', 'ity', 'ly', 'ance', 'ing', 'ed', 'en', 'ory', 'al', 'ant', 'ure', 'ic'];
const PRE = ['re', 'pre', 'dis', 'mis', 'over', 'under', 'inter', 'trans', 'sub', 'counter', 'con', 'com', 'ex', 'pro', 'circum', 'super', 'retro', 'de', 'en', 'per', 'sur', 'para', 'meta', 'ante', 'extra', 'hyper', 'omni', 'pan', 'semi', 'in', 'im'];
const ROOT = ['flect', 'vend', 'morph', 'plic', 'scrib', 'tract', 'vers', 'pend', 'port', 'clud', 'sist', 'duct', 'fer', 'gress', 'mit', 'pell', 'cept', 'struct', 'vid', 'dict', 'grav', 'lumin', 'sens', 'quir', 'cord', 'temper', 'loqu', 'fid', 'nomin', 'turb', 'spir', 'claim', 'jur', 'sper', 'vol', 'rupt', 'fract', 'cad', 'mand', 'merg', 'tain', 'ceed', 'cur', 'dur', 'fect', 'form', 'frag', 'ject', 'lect', 'mens', 'mov', 'nat', 'ped', 'plex', 'pos', 'press', 'rect', 'sect', 'sequ', 'solv', 'tend', 'ten', 'vent', 'volv', 'cern', 'cred', 'dom', 'fluc', 'gen', 'greg', 'later', 'liber', 'magn', 'medi', 'migr', 'mort', 'ocul', 'oper', 'pater', 'path', 'phon', 'popul', 'rid', 'sanct', 'scend', 'somn', 'tang', 'terr', 'tort', 'urb', 'vac', 'ver', 'vest', 'vor', 'zeal', 'bland', 'glom', 'frond', 'brook', 'sparn', 'wend', 'crast', 'delv', 'fland', 'grint', 'mulc', 'prend', 'skelt', 'trull'];
const SUF = ['ation', 'ous', 'ive', 'ible', 'ity', 'ment', 'ance', 'ency', 'ism', 'ify', 'ate', 'al', 'ary', 'itude', 'ence', 'ative', 'iferous', 'ulent', 'escent', 'ical', 'ize', 'ure', 'ory', 'ant', 'ent', 'ful', 'ious', 'ular', 'ose', 'ile', 'acy', 'ancy', 'ulous', 'ling', 'ish'];
const prefixed = (pre, root) => {
  const c = root[0];
  if (pre === 'con' || pre === 'com') pre = 'bpm'.includes(c) ? 'com' : c === 'l' ? 'col' : c === 'r' ? 'cor' : 'con';
  if (pre === 'in' || pre === 'im') pre = 'bpm'.includes(c) ? 'im' : c === 'l' ? 'il' : c === 'r' ? 'ir' : 'in';
  if (pre === 'en') pre = 'bpm'.includes(c) ? 'em' : 'en';
  return pre + (pre.endsWith(c) && 'lrm'.includes(c) ? root.slice(1) : root);
};
const bad = /[bcdfghjklmnpqrstvwxz]{4,}|(.)\1\1|[aeiou]{3,}|^[bcdfghjklmnpqrstvwxz]*$|qu[^aeio]|q[^u]|[bcdfgjkpqtvwxz]{2}$|(?:ck|ng|nk)[bcdfghjklmnpqrstvwxz]|aa|ii|uu|yy|ee[aeiou]|ckk|jj|vv|wk|nm|nb|np[^r]|ml|mr|mf|dp|bt|bs[^aeiou]|dm|dc|dg|db|bp|bf|bk|tb|tp|tk|pd|pb|kb|kp|kd|gp|gt|gk|sdc|(?:ay|ow|oo|ou|oa|ai|ea|ee)[bcdfghjklmnpqrstvwxz]{2}$|[aeiou]ck[aeiou]ck|(.{2,3})\2/;
function dictNeighbour(w) { // is w one edit away from a dictionary word?
  const A = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i <= w.length; i++) {
    if (i < w.length && DICT.has(w.slice(0, i) + w.slice(i + 1))) return true;
    for (const c of A) {
      if (DICT.has(w.slice(0, i) + c + w.slice(i))) return true;
      if (i < w.length && DICT.has(w.slice(0, i) + c + w.slice(i + 1))) return true;
    }
    if (i < w.length - 1 && DICT.has(w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2))) return true;
  }
  return false;
}
const CLUSTER_OK = /^(?:tch|nch|sch|ngs|nds|nts|rts|rks|nks|sts|mps|lts|lds|rds|rns|rms|lls|sks|cks|cts|pts|fts|nct|ckl|str|spr|spl|scr|thr|nth|rth|lth|ngl|ngr|nkl|ndl|ntl|mbl|mbr|ndr|ntr|nst|mpt|rst|lst|xt|rch|lch|ltr|rtr|rpl)$/;
const clusterOk = (w) => [...w.matchAll(/[bcdfghjklmnpqrstvwxz]{3,}/g)].every((m) => m.index === 0 || m[0].length === 3 && CLUSTER_OK.test(m[0]));
function invent(level) {
  const L = LV.indexOf(level);
  for (let k = 0; k < 300; k++) {
    let w;
    if (L === 0 || (L === 1 && rnd() < 0.4)) w = rnd() < 0.35 ? pick(ON) + pick(SHORT) + pick(C1) + pick(SHORT) + pick(['', '', 'n', 'l', 't', 'd', 'k', 'm', 'r']) : rnd() < 0.3 ? pick(ON) + pick(SHORT) + pick(C1) + pick(SHORT) + pick(C1) + pick(['a', 'o', 'y', 'ie', 'er', 'le', 'et', 'ish']) : syl() + (rnd() < 0.5 ? pick(END_EASY) : '');
    else if (L <= 2 || (L === 3 && rnd() < 0.5)) w = rnd() < 0.3 ? pick(ON) + pick(SHORT) + pick(C1) + pick(SHORT) + pick(C1) + pick(['ing', 'er', 'ish', 'y', 'ly', 'ful', 'en', 'ent', 'ous', 'ic']) : rnd() < 0.55 ? syl() + pick(END_MID) : syl() + pick(['b', 'd', 'g', 'l', 'm', 'n', 'p', 'r', 't', 'v']) + pick(SHORT) + pick(CO) + (rnd() < 0.4 ? pick(['y', 'er', 'ish', 'ful', 'ly']) : '');
    else { const r = pick(ROOT); w = (rnd() < 0.75 ? prefixed(pick(PRE), r) : r) + pick(SUF); }
    w = w.replace(/([aeiou])\1\1/g, '$1$1').replace(/(.)\1\1/g, '$1$1');
    if (w.length > (L === 0 ? 9 : L === 1 ? 10 : L <= 3 ? 12 : 15) || bad.test(w) || !clusterOk(w) || !ok(w, '') || dictNeighbour(w)) continue;
    return w;
  }
  return null;
}

/* ---- generate per level ---- */
const stats = {};
for (const l of LV) {
  const N = NEW[l], haveFake = B[l].fake.length, haveAlike = B[l].alike.length;
  const reals = [...B[l].real, ...N.real].map(head).filter((w) => /^[a-z]+$/.test(w) && w.length >= 3);
  // pass over real words, then over inflections, then over course words of the level
  const addSlip = (f, target) => { N.alike.push(f + '|' + target); taken.add(f); slipCount[target] = (slipCount[target] || 0) + 1; };
  const need = TARGET.alike - haveAlike;
  const order = [...reals].sort(() => rnd() - 0.5);
  // inflection slips first (about 12 % of the quota): the classic -ed/-ing/-s/-er mistakes
  let infl = 0;
  for (const w of order) {
    if (infl >= Math.round(need * 0.12)) break;
    if (reals.indexOf(w) < 0 || w.length < 3 || w.length > 9) continue;
    const kind = pick(['ed', 'ing', 'ing', 'ed', 's', 'er']);
    const r = inflect(w, kind); if (!r) continue;
    const [correct, wrongs] = r;
    if (!DICT.has(correct) || !(ALLC[correct] >= 1) || (slipCount[correct] || 0) >= 3) continue;
    const f = pick(wrongs);
    if (ok(f, correct)) { addSlip(f, correct); infl++; }
  }
  for (let pass = 0; pass < 3 && N.alike.length + haveAlike < TARGET.alike; pass++) {
    for (const w of order) {
      if (N.alike.length + haveAlike >= TARGET.alike) break;
      if ((slipCount[w] || 0) >= 3 - (pass === 2 ? 0 : 1) + (pass === 0 ? 0 : 0) && pass < 2) continue;
      if ((slipCount[w] || 0) >= 3) continue;
      const f = slip(w);
      if (f) addSlip(f, w);
    }
  }
  // course words of the level, if still short
  if (N.alike.length + haveAlike < TARGET.alike) {
    const c = corpus[l], [mn, mx] = { A1: [4, 8], A2: [4, 9], B1: [5, 10], B2: [6, 12], C1: [7, 14], C2: [8, 16] }[l];
    const bases = Object.keys(c).filter((w) => DICT.has(w) && w.length >= mn && w.length <= mx && c[w] >= 2 && !/(?:[^s]s|ed|ing)$/.test(w) && (slipCount[w] || 0) < 3).sort((a, b) => c[b] - c[a]);
    for (const w of bases) { if (N.alike.length + haveAlike >= TARGET.alike) break; const f = slip(w); if (f) addSlip(f, w); }
  }
  let guard = 0;
  while (N.fake.length + haveFake < TARGET.fake && guard++ < 20000) { const f = invent(l); if (f) { N.fake.push(f); taken.add(f); } }
  stats[l] = { realNew: N.real.length, fakeNew: N.fake.length, alikeNew: N.alike.length, fake: N.fake.length + haveFake, alike: N.alike.length + haveAlike, infl };
}
console.table(stats);

/* ---- write impostor-words-5.js ---- */
const wrap = (arr, ind) => {
  const lines = []; let cur = '';
  for (const s of arr) { const t = "'" + s.replace(/'/g, "\\'") + "'"; if ((cur + t).length > 190) { lines.push(cur.replace(/, $/, '')); cur = ''; } cur += t + ', '; }
  if (cur) lines.push(cur.replace(/, $/, ''));
  return '[' + lines.join(',\n' + ind) + ']';
};
let body = '';
LV.forEach((l, i) => {
  const N = NEW[l];
  body += `    ${l}: {\n      real: ${wrap(N.real, '        ')},\n      fake: ${wrap(N.fake, '        ')},\n      alike: ${wrap(N.alike, '        ')}\n    }${i < LV.length - 1 ? ',' : ''}\n`;
});
const js = `/* Too Good To Be True — fifth word bank (x5 expansion): many more real words, invented words and look-alikes at
   every level (A1 to C2). Same fusion pattern as impostor-words-4.js. Entries whose first part is already in the
   bank are skipped, so the lists can only grow, and a word that is real anywhere in the bank is never played as
   an impostor.
   real:  "word|español|synonym, synonym" (synonyms at the same level or lower)
   fake:  invented words that sound English (not in the dictionary, not one letter away from a word)
   alike: "slip|real word it imitates" (the mistakes Spanish speakers really make; at most 3 slips per word)
   fake and alike are generated by: node scripts/tgtbt-impostors-5.mjs ; check with: node scripts/tgtbt-check-bank.mjs */
(function (B) {
  if (!B) return;
  var MORE = {
${body}  };
  function head(s) { return s.split('|')[0].toLowerCase(); }
  // A word that is real at ANY level can never be played as an impostor.
  var allReal = {};
  Object.keys(B).forEach(function (lv) { B[lv].real.forEach(function (s) { allReal[head(s)] = 1; }); });
  Object.keys(MORE).forEach(function (lv) { MORE[lv].real.forEach(function (s) { allReal[head(s)] = 1; }); });
  Object.keys(MORE).forEach(function (lv) {
    if (!B[lv]) return;
    ['real', 'fake', 'alike'].forEach(function (k) {
      var have = {}; B[lv][k].forEach(function (s) { have[head(s)] = 1; });
      MORE[lv][k].forEach(function (s) { var h = head(s); if (!have[h] && (k === 'real' || !allReal[h])) { have[h] = 1; B[lv][k].push(s); } });
    });
  });
})(window.TGTBT_BANK);
`;
fs.writeFileSync(OUT, js);
console.log('wrote', OUT, js.length, 'bytes');
