// Builds the data for public/modules/two-truths/impostor-words-3.js (run scripts/tgtbt-corpus.mjs first;
// needs: npm i --no-save an-array-of-english-words).  per level, many more "look-alike" impostors (one realistic slip of a
// real word: the mistakes Spanish speakers really make) and invented words, all checked against a
// 275k-word English dictionary so that no impostor is a real word.
import fs from 'fs';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const DICT = new Set(require('an-array-of-english-words'));
global.window = {};
require(new URL('../public/modules/two-truths/impostor-words.js', import.meta.url).pathname);
require(new URL('../public/modules/two-truths/impostor-words-2.js', import.meta.url).pathname);
const B = window.TGTBT_BANK;
const corpus = JSON.parse(fs.readFileSync('corpus.json', 'utf8'));
const LV = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const head = (s) => s.split('|')[0].toLowerCase();
const allReal = new Set(), taken = new Set();
for (const l of LV) { B[l].real.forEach((s) => allReal.add(head(s))); B[l].fake.forEach((s) => taken.add(head(s))); B[l].alike.forEach((s) => taken.add(head(s))); }
let seed = 7; const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = (a) => a[Math.floor(rnd() * a.length)];
const ok = (f, base) => f && f !== base && /^[a-z]+$/.test(f) && f.length >= 4 && !DICT.has(f) && !allReal.has(f) && !taken.has(f);

/* ---- irregular forms: the overregularised version is a classic learner slip ---- */
const IRR_PAST = { go: 'goed', eat: 'eated', buy: 'buyed', think: 'thinked', teach: 'teached', catch: 'catched', bring: 'bringed', run: 'runned', write: 'writed', swim: 'swimmed', drink: 'drinked', make: 'maked', take: 'taked', give: 'gived', feel: 'feeled', keep: 'keeped', sleep: 'sleeped', meet: 'meeted', speak: 'speaked', break: 'breaked', choose: 'choosed', drive: 'drived', ride: 'rided', steal: 'stealed', forget: 'forgetted', understand: 'understanded', become: 'becomed', begin: 'beginned', come: 'comed', sell: 'selled', tell: 'telled', find: 'finded', fight: 'fighted', wear: 'weared', win: 'winned', lose: 'losed', pay: 'payed', say: 'sayed', stand: 'standed', sit: 'sitted', hold: 'holded', grow: 'growed', know: 'knowed', throw: 'throwed', draw: 'drawed', fall: 'falled', hide: 'hided', bite: 'bited', shake: 'shaked', freeze: 'freezed', forgive: 'forgived', mistake: 'mistaked', overcome: 'overcomed', undertake: 'undertaked', withdraw: 'withdrawed', foresee: 'foreseed', arise: 'arised', seek: 'seeked', bind: 'binded', strive: 'strived', tear: 'teared', swear: 'sweared', weep: 'weeped', cling: 'clinged', sting: 'stinged', sweep: 'sweeped', creep: 'creeped', spit: 'spitted', slide: 'slided', forbid: 'forbidded', forecast: 'forecasted', mislead: 'misleaded', outdo: 'outdoed', uphold: 'upholded', overthrow: 'overthrowed' };
const IRR_PL = { child: 'childs', woman: 'womans', foot: 'foots', tooth: 'tooths', sheep: 'sheeps', fish: 'fishs', life: 'lifes', wife: 'wifes', information: 'informations', furniture: 'furnitures', homework: 'homeworks', luggage: 'luggages', equipment: 'equipments', knowledge: 'knowledges', research: 'researchs', evidence: 'evidences', baggage: 'baggages', criterion: 'criterions', phenomenon: 'phenomenons', thesis: 'thesises', analysis: 'analysises', crisis: 'crisises', hypothesis: 'hypothesises', medium: 'mediums', person: 'persones', mouse: 'mouses', goose: 'gooses', ox: 'oxs', half: 'halfs', shelf: 'shelfs', thief: 'thiefs', wolf: 'wolfs', potato: 'potatos', tomato: 'tomatos', hero: 'heros', bus: 'buss', box: 'boxs', glass: 'glasss', city: 'citys', baby: 'babys', country: 'countrys', family: 'familys', party: 'partys', story: 'storys' };
const IRR_CMP = { good: 'gooder', bad: 'badder', far: 'farer', happy: 'happyer', big: 'biger', easy: 'easyer', funny: 'funnyer', busy: 'busyer', early: 'earlyer', heavy: 'heavyer', thin: 'thiner', hot: 'hoter', sad: 'sader', fat: 'fater', little: 'littler', many: 'manyer', much: 'mucher' };

/* ---- one realistic slip of a real word ---- */
const V = 'aeiou';
const rules = [
  // Spanish-style single consonant: necessary -> necesary, different -> diferent
  ['undouble', 5, (w) => { const m = [...w.matchAll(/([bcdfglmnprstz])\1/g)]; if (!m.length) return null; const x = pick(m); return w.slice(0, x.index) + w.slice(x.index + 1); }],
  // a doubled consonant where there is one: until -> untill, develop -> developp
  ['double', 1, (w) => { const ix = []; for (let i = 2; i < w.length - 1; i++) if (/[bdfglmnprst]/.test(w[i]) && V.includes(w[i - 1]) && V.includes(w[i + 1]) && w[i] !== w[i - 1]) ix.push(i); if (!ix.length) return null; const i = pick(ix); return w.slice(0, i) + w[i] + w.slice(i); }],
  ['ie-ei', 4, (w) => (w.includes('ie') ? w.replace('ie', 'ei') : w.includes('ei') ? w.replace('ei', 'ie') : null)],
  // Spanish spelling habits: tion -> cion, ph -> f, y -> i, th -> t, qu -> cu, initial s+consonant -> es
  ['spanish', 6, (w) => {
    const c = [];
    if (/tion/.test(w)) c.push(w.replace('tion', 'cion'));
    if (/ph/.test(w)) c.push(w.replace('ph', 'f'));
    if (/[^aeiou]y[^aeiou]/.test(w.slice(1))) c.push(w.replace(/([^aeiou])y([^aeiou])/, '$1i$2'));
    if (/th/.test(w.slice(1))) c.push(w.replace(/(.)th/, '$1t'));
    if (/^s[tpcklm]/.test(w)) c.push('e' + w);
    if (/qu/.test(w)) c.push(w.replace('qu', 'cu'));
    if (/^imm/.test(w)) c.push('inm' + w.slice(3));
    if (/ibility$/.test(w)) c.push(w.replace(/ibility$/, 'ability'));
    if (/ability$/.test(w) && w.length > 9) c.push(w.replace(/ability$/, 'ibility'));
    if (/^h[aeiou]/.test(w) && w.length > 6) c.push(w.slice(1));
    if (/ss/.test(w)) c.push(w.replace('ss', 's'));
    if (/cc/.test(w)) c.push(w.replace('cc', 'c'));
    if (/ck/.test(w) && rnd() < 0.3) c.push(w.replace('ck', 'k'));
    return c.length ? pick(c) : null;
  }],
  // silent letters and clusters: environment -> enviroment, which -> wich, government -> goverment
  ['silent', 4, (w) => {
    const c = [];
    if (/^wh/.test(w)) c.push('w' + w.slice(2));
    if (/^kn/.test(w)) c.push(w.slice(1));
    if (/^wr/.test(w)) c.push(w.slice(1));
    if (/mb$/.test(w)) c.push(w.slice(0, -1));
    if (/gh/.test(w)) c.push(w.replace('gh', ''));
    if (/nm/.test(w)) c.push(w.replace('nm', 'm'));
    if (/rnm/.test(w)) c.push(w.replace('rnm', 'rm'));
    if (/[aeiou]u[aeiou]/.test(w)) c.push(w.replace(/([aeiou])u([aeiou])/, '$1$2'));
    if (/ct/.test(w)) c.push(w.replace('ct', 't'));
    if (/sc[ei]/.test(w)) c.push(w.replace(/sc([ei])/, 's$1'));
    if (/dg/.test(w)) c.push(w.replace('dg', 'g'));
    if (/bt/.test(w)) c.push(w.replace('bt', 't'));
    if (/ps/.test(w)) c.push(w.replace('ps', 's'));
    return c.length ? pick(c) : null;
  }],
  // suffixes: beautiful -> beautifull, independent -> independant, visible -> visable
  ['suffix', 6, (w) => {
    const pairs = [['ful$', 'full'], ['ible$', 'able'], ['able$', 'ible'], ['ance$', 'ence'], ['ence$', 'ance'], ['ant$', 'ent'], ['ent$', 'ant'], ['ency$', 'ancy'], ['ancy$', 'ency'], ['ous$', 'ious'], ['ious$', 'ous'], ['ly$', 'ley'], ['ally$', 'ly'], ['ary$', 'ery'], ['ery$', 'ary'], ['ise$', 'ice'], ['sion$', 'tion'], ['tion$', 'sion'], ['ness$', 'ness'.replace('ss', 's')], ['er$', 'or'], ['or$', 'er'], ['ate$', 'ated'], ['ic$', 'ical'], ['ical$', 'ic'], ['ment$', 'mant'], ['ize$', 'ice'], ['ise$', 'ize']];
    const c = pairs.filter(([a]) => new RegExp(a).test(w)).map(([a, b]) => w.replace(new RegExp(a), b));
    return c.length ? pick(c) : null;
  }],
  // the unstressed vowel: separate -> seperate, grammar -> grammer, definitely -> definately
  ['schwa', 6, (w) => {
    if (w.length < 6) return null;
    const ix = []; for (let i = 2; i < w.length - 2; i++) if ('aei'.includes(w[i]) && !V.includes(w[i - 1]) && !V.includes(w[i + 1])) ix.push(i);
    if (!ix.length) return null;
    const i = pick(ix), sw = { a: 'e', e: pick(['a', 'i']), i: pick(['e', 'a']) }[w[i]];
    return w.slice(0, i) + sw + w.slice(i + 1);
  }],
  // the wrong negative prefix: impossible -> unpossible, dishonest -> unhonest, immature -> inmature
  ['prefix', 6, (w) => {
    const NEG = { impossible: 1, impolite: 1, illegal: 1, irregular: 1, dishonest: 1, unhappy: 1, unusual: 1, incorrect: 1, inconvenient: 1, unfair: 1, dislike: 1, disagree: 1, irresponsible: 1, immature: 1, impatient: 1, invisible: 1, unable: 1, unknown: 1, independent: 1, uncomfortable: 1, unbelievable: 1, informal: 1, insecure: 1, illogical: 1, irrelevant: 1, inaccurate: 1, unemployed: 1, disappear: 1, misunderstand: 1, unlucky: 1, untidy: 1, unkind: 1, unfriendly: 1, unhealthy: 1, unsafe: 1, unclear: 1, unlikely: 1, unnecessary: 1, impractical: 1, imperfect: 1, impersonal: 1, improbable: 1, immoral: 1, immortal: 1, illiterate: 1, irrational: 1, irreversible: 1, inadequate: 1, inefficient: 1, inevitable: 1, inexperienced: 1, insignificant: 1, insufficient: 1, incapable: 1, incomplete: 1, indirect: 1, inequality: 1, discomfort: 1, disadvantage: 1, disobey: 1, disorganised: 1, displeased: 1, dissatisfied: 1, misbehave: 1, misinterpret: 1, misleading: 1, nonexistent: 1, unaware: 1, uncertain: 1, unconscious: 1, undeniable: 1, unexpected: 1, unforgettable: 1, unprecedented: 1, unreliable: 1, unwilling: 1, irreplaceable: 1, illegible: 1, impartial: 1, implausible: 1, inconsistent: 1, indecisive: 1, insensitive: 1, intolerant: 1, disloyal: 1, disrespectful: 1 };
    if (!NEG[w]) return null;
    const m = /^(un|in|im|il|ir|dis|mis|non)(.+)$/.exec(w); if (!m) return null;
    const alt = ['un', 'in', 'dis', 'im', 'non'].filter((p) => p !== m[1]);
    return pick(alt) + m[2];
  }],
  // -ness on the wrong form: happiness -> happyness, laziness -> lazyness
  ['ness', 3, (w) => (/iness$/.test(w) ? w.replace(/iness$/, 'yness') : /ily$/.test(w) ? w.replace(/ily$/, 'yly') : /ied$/.test(w) ? w.replace(/ied$/, 'yed') : /ies$/.test(w) ? w.replace(/ies$/, 'ys') : null)],
  // swapped neighbours: friend -> freind, from -> form are real, so the dictionary keeps it honest
  ['swap', 0, (w) => { if (w.length < 5) return null; const i = 1 + Math.floor(rnd() * (w.length - 3)); if (w[i] === w[i + 1]) return null; return w.slice(0, i) + w[i + 1] + w[i] + w.slice(i + 2); }],
];
const totalW = rules.reduce((a, r) => a + r[1], 0);
function slip(w) {
  for (let k = 0; k < 14; k++) {
    let x = rnd() * totalW, r = rules[0];
    for (const q of rules) { if ((x -= q[1]) <= 0) { r = q; break; } }
    const f = r[2](w);
    if (ok(f, w)) return f;
  }
  return null;
}

/* ---- invented words that sound English, longer and more Latinate at higher levels ---- */
const ON = ['b', 'bl', 'br', 'c', 'cl', 'cr', 'd', 'dr', 'f', 'fl', 'fr', 'g', 'gl', 'gr', 'h', 'j', 'l', 'm', 'n', 'p', 'pl', 'pr', 'qu', 'r', 's', 'sc', 'sh', 'sl', 'sm', 'sn', 'sp', 'st', 'str', 'sw', 't', 'th', 'tr', 'tw', 'v', 'w', 'wh', 'y', 'z'];
const NU = ['a', 'e', 'i', 'o', 'u', 'a', 'e', 'i', 'o', 'ai', 'ea', 'ee', 'oa', 'oo', 'ou'];
const CO = ['b', 'ck', 'd', 'g', 'ft', 'l', 'll', 'lt', 'm', 'mp', 'n', 'nd', 'ng', 'nk', 'nt', 'p', 'rk', 'rn', 'rt', 'sh', 'sk', 'st', 't', 'x'];
const END_EASY = ['', '', 'y', 'er', 'le', 'ish', 'ful', 'ing', 'ly', 'et'];
const PRE = ['re', 'pre', 'dis', 'mis', 'over', 'under', 'inter', 'trans', 'sub', 'counter', 'con', 'ex', 'pro', 'circum', 'super', 'retro'];
const ROOT = ['flect', 'vend', 'morph', 'plic', 'scrib', 'tract', 'vers', 'pend', 'port', 'clud', 'sist', 'duct', 'fer', 'gress', 'mit', 'pell', 'cept', 'struct', 'vid', 'dict', 'grav', 'lumin', 'sens', 'quir', 'cord', 'temper', 'loqu', 'fid', 'nomin', 'turb', 'spir', 'claim', 'jur', 'sper', 'vol', 'rupt', 'fract', 'cad', 'mand', 'merg'];
const SUF = ['ation', 'ous', 'ive', 'ible', 'ity', 'ment', 'ance', 'ency', 'ism', 'ify', 'ate', 'al', 'ary', 'itude', 'ence', 'ative', 'iferous', 'ulent', 'escent', 'ical'];
function invent(level) {
  for (let k = 0; k < 40; k++) {
    let w;
    const L = LV.indexOf(level);
    if (L <= 1) w = pick(ON) + pick(NU) + pick(CO) + (rnd() < 0.5 ? pick(END_EASY) : '');
    else if (L <= 3) w = pick(ON) + pick(NU) + pick(CO) + pick(['er', 'le', 'ish', 'ful', 'ness', 'ment', 'ous', 'ive', 'able', 'ity', 'ly', 'ance']);
    else w = (rnd() < 0.8 ? pick(PRE) : '') + pick(ROOT) + pick(SUF);
    w = w.replace(/([aeiou])\1\1/g, '$1$1').replace(/(.)\1\1/g, '$1$1');
    if (ok(w, '') && !/[aeiou]{3}/.test(w)) return w;
  }
  return null;
}

/* ---- bases per level: words students meet in that level's course, by frequency ---- */
const LEN = { A1: [4, 8], A2: [4, 9], B1: [5, 10], B2: [6, 12], C1: [7, 14], C2: [8, 16] };
const NEED = { alike: 170, fake: 70 };
const usedBase = new Set();
const MORE = {};
for (const l of LV) {
  const c = corpus[l.toLowerCase()], low = l === 'A1' ? {} : corpus[LV[LV.indexOf(l) - 1].toLowerCase()];
  const [mn, mx] = LEN[l];
  const SKIP = /(?:[^s]s|ed|ing)$/;
  let bases = Object.keys(c).filter((w) => DICT.has(w) && w.length >= mn && w.length <= mx && c[w] >= 2 && !usedBase.has(w) && !SKIP.test(w) && !/^(vocab|info|okay|email|online|wifi|mode|grande|primero|segundo|bueno|nada|casa|todo|para|como|pero|mira|vamos|hola|gracias|bien)$/.test(w))
    // from B2 up, prefer words that are new at this level
    .sort((a, b) => (c[b] - (LV.indexOf(l) >= 3 ? (low[b] || 0) : 0)) - (c[a] - (LV.indexOf(l) >= 3 ? (low[a] || 0) : 0)));
  const alike = [];
  // irregular slips first, at the levels where those words are taught
  const irr = { ...IRR_PAST, ...IRR_PL, ...IRR_CMP };
  for (const [base, f] of Object.entries(irr)) {
    const lvlOk = LV.indexOf(l) <= 2 ? base.length <= 7 : base.length >= 6;
    if (alike.length < 40 && lvlOk && !usedBase.has(base) && ok(f, base) && (c[base] || 0) >= 1) { alike.push(f + '|' + base); taken.add(f); usedBase.add(base); }
  }
  for (const w of bases.slice(0, 2000)) {
    if (alike.length >= NEED.alike) break;
    if (usedBase.has(w)) continue;
    const f = slip(w);
    if (f) { alike.push(f + '|' + w); taken.add(f); usedBase.add(w); }
  }
  const fake = [];
  while (fake.length < NEED.fake) { const f = invent(l); if (f) { fake.push(f); taken.add(f); } }
  MORE[l] = { real: [], fake, alike };
  console.log(l, 'alike', alike.length, 'fake', fake.length);
  console.log('  ', alike.slice(0, 40).join('  '));
  console.log('  ', alike.slice(-25).join('  '));
  console.log('  ', fake.slice(0, 25).join(' '));
}
fs.writeFileSync('more.json', JSON.stringify(MORE));
