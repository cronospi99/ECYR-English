/**
 * Heuristic parsing of the free-text grammar data (form lines, watch-outs,
 * notes) into small visual structures: colour-coded formula chips, ✗/✓ pairs
 * and key words to highlight in examples. Pure functions, no React.
 *
 * Nothing here invents content: every chip, pair or highlight is a slice of the
 * original string, so the UI can always fall back to the raw text.
 */

// ------------------------------------------------------------------ roles ----

export type Role = 'subj' | 'aux' | 'verb' | 'neg' | 'obj' | 'time' | 'conn' | 'clause' | 'key';

export const ROLE_INFO: Record<Role, { label: string; color: string }> = {
  subj: { label: 'Sujeto', color: 'var(--blue)' },
  aux: { label: 'Auxiliar', color: 'var(--purple)' },
  verb: { label: 'Verbo', color: 'var(--green)' },
  neg: { label: 'Negación', color: 'var(--red)' },
  obj: { label: 'Complemento', color: 'var(--orange)' },
  time: { label: 'Tiempo', color: 'var(--indigo)' },
  conn: { label: 'Conector', color: 'var(--teal)' },
  clause: { label: 'Oración', color: 'var(--cyan)' },
  key: { label: 'Palabra clave', color: 'var(--pink)' },
};

export interface Chip {
  text: string;
  role: Role;
  optional?: boolean;
  /** true for slots ("subject", "base verb"…) as opposed to literal words ("did", "if"). */
  slot?: boolean;
}

/** A chip, a comma (clause break) or the final question mark. */
export type Token = { t: 'chip'; chip: Chip } | { t: 'comma' } | { t: 'q' };

export type Polarity = '+' | '-' | '?' | '-?' | null;

export interface FormLine {
  raw: string;
  /**
   * formula   → "Subject + am/is/are + verb-ing → example"
   * transform → "cheap → cheaper, big → bigger" (chains of short forms)
   * list      → "in · on · behind · next to" (3+ short items)
   * labelled  → "Negative: I didn’t work." (label + example text)
   * plain     → anything else
   */
  kind: 'formula' | 'transform' | 'list' | 'labelled' | 'plain';
  label?: string;
  polarity: Polarity;
  tokens?: Token[];
  chains?: string[][];
  items?: string[];
  text?: string;
  example?: string;
  /** Meaning after "=" or a trailing "(…)" remark. */
  note?: string;
}

// --------------------------------------------------------------- helpers ----

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const stripEndPunct = (s: string) => s.replace(/[.;]+$/, '').trim();
const norm = (s: string) => s.toLowerCase().replace(/[’‘]/g, "'").replace(/[“”"]/g, '').trim();

const AUX = new Set(
  'am is are was were be been being do does did have has had will would shall should can could may might must ought going used use need needs let’s let\'s i’d i\'d you’d we’d it’s it\'s get gets got to-be'.split(' '),
);
const SUBJ_RE = /^(subject|subj|s|pronoun|subject pronoun|i|you|he|she|it|we|they|there|the one|the ones|someone|person subject|positive statement)$/;
const NEG_RE = /(^|\s|\/)(not|never|no one|nobody|neither)(\s|\/|$)|n['’]t\b/i;
const CLAUSE_RE = /\b(clause|introducer|sentence|idea|statement order|full sentence|result|action|reason)\b/;
const TIME_RE = /\b(time|clock|day|date|month|year|period|starting point|end point|duration|part of day|finished time|now)\b/;
const VERB_RE =
  /(\bverb\b|\bv\d?\b|v-ing|participle|p\.p\.?|-ing|\bing\b|gerund|infinitive|past form|\bbase\b|past simple|present simple|simple past|simple present|past perfect|present perfect|continuous|-ed\b|\bv2\b|\bv3\b)/;
const OBJ_RE = /\b(object|noun|adjective|adverb|person|something|someone|complement|place|thing|number|phrase|pronoun|amount|quantity|agent|comparative|superlative|determiner|preposition|direct|indirect|singular|plural|comment|conjunction)\b/;
const CONN = new Set(
  'if when than as because whether that who which whose where why what how by for to so unless since despite although though however while after before until once and but or the a an how many how much wh-word with of in on at from about like'.split(
    ' ',
  ),
);

function classify(text: string): Omit<Chip, 'text' | 'optional'> {
  const t = norm(text).replace(/\([^)]*\)/g, '').replace(/[….?!]+$/, '').trim() || norm(text);
  if (NEG_RE.test(t)) return { role: 'neg' };
  const slotWord = VERB_RE.test(t) || OBJ_RE.test(t) || TIME_RE.test(t) || /\bsubject\b/.test(t);
  if (/^wh-?word|question word/.test(t)) return { role: 'conn', slot: true };
  if (/\bmodal\b/.test(t) && t.split(' ').length <= 2) return { role: 'aux', slot: true };
  if (t.includes('/') && !slotWord) {
    // "must / have to / need to" → role of the first alternative
    const first = classify(t.split('/')[0]!.trim());
    if (first.role !== 'subj') return first;
  }
  if (t.split(/[\s/]+/).filter(Boolean).length >= 5 && !slotWord) return { role: 'key' };
  if (SUBJ_RE.test(t) || /\bsubject\b/.test(t)) return { role: 'subj', slot: /subject|pronoun/.test(t) };
  if (/^(it|there|i|you|he|she|we|they)(\s|$)/.test(t) && t.split(' ').length <= 2 && !AUX.has(t.split(' ')[1] ?? ''))
    return { role: 'subj' };
  const words = t.split(/[\s/]+/).filter(Boolean);
  if (VERB_RE.test(t) && !words.some((w) => AUX.has(w) && w !== 'base')) return { role: 'verb', slot: true };
  if (CLAUSE_RE.test(t) && words.length <= 3) return { role: 'clause', slot: true };
  if (words.some((w) => AUX.has(w))) {
    // "have/has + past participle" → aux; "be expected to" → aux
    return { role: 'aux' };
  }
  if (TIME_RE.test(t)) return { role: 'time', slot: true };
  if (VERB_RE.test(t)) return { role: 'verb', slot: true };
  if (OBJ_RE.test(t)) return { role: 'obj', slot: true };
  if (words.length && words.every((w) => CONN.has(w))) return { role: 'conn' };
  if (/^wh/.test(t)) return { role: 'conn' };
  return { role: 'key' };
}

/** Split on a separator only at parenthesis depth 0. */
function splitTop(s: string, sep: string): string[] {
  const out: string[] = [];
  let depth = 0;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i]!;
    if (c === '(') depth++;
    if (c === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && s.startsWith(sep, i)) {
      out.push(cur);
      cur = '';
      i += sep.length - 1;
      continue;
    }
    cur += c;
  }
  out.push(cur);
  return out;
}

function tokenizeFormula(f: string, optional = false): Token[] {
  let s = clean(f).replace(/^\+\s*/, '');
  let q = false;
  if (/\?\s*$/.test(s)) {
    q = true;
    s = s.replace(/[\s…]*\?\s*$/, '');
  }
  const out: Token[] = [];
  const parts = splitTop(s, ' + ').map((p) => p.trim()).filter(Boolean);
  for (const p of parts) {
    // optional group: "noun (+ to + noun)" or "(+ to + verb)"
    const m = /^(.*?)\s*\(\s*\+?\s*(.+?)\)$/.exec(p);
    if (m && m[2]!.includes('+')) {
      if (m[1]) pushPiece(out, m[1], optional);
      out.push(...tokenizeFormula(m[2]!, true));
      continue;
    }
    pushPiece(out, p, optional);
  }
  if (q) out.push({ t: 'q' });
  return out;
}

function pushPiece(out: Token[], piece: string, optional: boolean) {
  const bits = splitTop(piece, ', ');
  bits.forEach((b, i) => {
    if (i > 0) out.push({ t: 'comma' });
    let text = b.replace(/^[,\s]+|[,\s]+$/g, '').replace(/\.$/, '');
    if (!text || text === '…') return;
    let opt = optional;
    const pm = /^\((.+)\)$/.exec(text);
    if (pm) {
      text = pm[1]!;
      opt = true;
    }
    out.push({ t: 'chip', chip: { text, optional: opt || undefined, ...classify(text) } });
  });
}

function polarityOf(label: string | undefined): Polarity {
  if (!label) return null;
  const l = label.toLowerCase();
  const neg = /negative|negativa|\bneg\b/.test(l);
  const q = /question|yes\/no|^wh-|wh- ?question|pregunta/.test(l);
  if (neg && q) return '-?';
  if (neg) return '-';
  if (q && !/reported|indirect|tag|short answer/.test(l)) return '?';
  if (/^(statement|afirmativa)\b|\b(positive|affirmative)\b/.test(l)) return '+';
  return null;
}

const isFormulaish = (s: string) => / \+ /.test(s) || /^\+ /.test(s) || /^[A-Za-z/’' -]{1,30} \+$/.test(s);

/** Parse one `form[]` line. */
export function parseFormLine(rawIn: string): FormLine {
  const raw = clean(rawIn);
  let rest = raw;
  let label: string | undefined;
  let example: string | undefined;
  let note: string | undefined;

  // 1. "Label: …" or "formula: example"
  const lm = /^([^:]{1,60}?):\s+(.+)$/.exec(rest);
  if (lm && !/^[“‘"]/.test(lm[1]!)) {
    if (isFormulaish(lm[1]!) && !/^(positive|negative|question|affirmative)/i.test(lm[1]!)) {
      // "If + past simple, would + base verb: If I had…"
      const f = lm[1]!;
      example = lm[2]!;
      return finishFormula(raw, undefined, f, example, undefined);
    }
    label = lm[1]!.trim();
    rest = lm[2]!.trim();
  }

  // trailing "(remark)" — keep it as a note
  const tm = /\s*\(([^()]{3,80})\)\.?$/.exec(rest);
  if (tm && !/^\(/.test(rest)) {
    note = tm[1];
    rest = rest.slice(0, tm.index).trim();
  }

  // 2. separators: → (example / transformation), — (example), = (meaning)
  const seps = [' → ', ' — ', ' = ', ' – '];
  let cut = -1;
  let sep = '';
  for (const s of seps) {
    const i = rest.indexOf(s);
    if (i > 0 && (cut < 0 || i < cut)) {
      cut = i;
      sep = s;
    }
  }
  const left = cut > 0 ? rest.slice(0, cut).trim() : rest;
  const right = cut > 0 ? rest.slice(cut + sep.length).trim() : '';

  if (isFormulaish(left)) {
    if (sep === ' = ') note = [right, note].filter(Boolean).join(' · ');
    else if (right) example = right;
    return finishFormula(raw, label, left, example, note);
  }
  // formula without separator but with a colon example inside the rest: "had + past participle: By the time…"
  const inner = /^([^:]{3,60}?):\s+(.+)$/.exec(rest);
  if (inner && isFormulaish(inner[1]!)) return finishFormula(raw, label, inner[1]!, inner[2]!, note);

  // 3. transformations: "cheap → cheaper, big → bigger"
  if (rest.includes('→')) {
    const items = rest
      .split(/;\s+|,\s+(?=[^,]*→)|\s+·\s+/)
      .map((x) => stripEndPunct(x))
      .filter(Boolean);
    const chains = items.map((it) => it.split(/\s*→\s*/).map((x) => x.trim()).filter(Boolean));
    if (chains.length && chains.every((c) => c.length >= 2 && c.every((x) => x.length <= 48))) {
      return { raw, kind: 'transform', label, polarity: polarityOf(label), chains, note };
    }
  }

  // 4. lists: "in · on · behind" / "and (addition) · but (contrast)"
  const dot = rest.split(/\s+·\s+/).map((x) => stripEndPunct(x));
  if (dot.length >= 3 && dot.every((x) => x.length > 0 && x.length <= 42)) {
    return { raw, kind: 'list', label, polarity: polarityOf(label), items: dot, note };
  }

  const sl = rest.split(/\s+\/\s+/).map((x) => stripEndPunct(x));
  if (sl.length >= 3 && sl.every((x) => x.length > 0 && x.length <= 44) && !/\s\+\s/.test(rest)) {
    return { raw, kind: 'list', label, polarity: polarityOf(label), items: sl, note };
  }

  if (left !== rest && sep === ' → ') {
    const li = left.split(/,\s+/).map((x) => stripEndPunct(x));
    if (li.length >= 3 && li.every((x) => x.length > 0 && x.length <= 30)) {
      return { raw, kind: 'list', label, polarity: polarityOf(label), items: li, example: right, note };
    }
  }

  if (label) return { raw, kind: 'labelled', label, polarity: polarityOf(label), text: rest, note };
  return { raw, kind: 'plain', polarity: null, text: raw };
}

function finishFormula(raw: string, label: string | undefined, f: string, example?: string, note?: string): FormLine {
  const tokens = tokenizeFormula(f);
  const chips = tokens.filter((t) => t.t === 'chip');
  if (chips.length < 2) {
    return label
      ? { raw, kind: 'labelled', label, polarity: polarityOf(label), text: raw.slice(raw.indexOf(':') + 1).trim() }
      : { raw, kind: 'plain', polarity: null, text: raw };
  }
  let pol = polarityOf(label);
  if (!pol) {
    if (tokens.some((t) => t.t === 'q')) pol = '?';
    else if (chips.some((c) => c.t === 'chip' && c.chip.role === 'neg')) pol = '-';
  }
  return { raw, kind: 'formula', label, polarity: pol, tokens, example: example?.trim(), note };
}

/** "Negative: X. Question: Y?" → two lines; "A. · b + c: B" → two lines. */
const SPLIT_RE = /(?<=[.?!])\s+(?:·\s+)?(?=(?:[A-Z][A-Za-z’' /-]{2,40}|[a-z][a-z /’'-]* \+ [^:.]{2,40}):\s)/;

export const parseForm = (lines: string[] | undefined) =>
  (lines ?? []).flatMap((l) => (l.includes('→') && !/^[^:]{1,40}:[^:]*$/.test(l) ? [l] : l.split(SPLIT_RE))).map(parseFormLine);

// ------------------------------------------------------------ highlights ----

export interface KeySpec {
  words: Map<string, Role>;
  ing: boolean;
  ed: boolean;
  neg: boolean;
  /** -er/-est comparatives ("bigger than", "the biggest"). */
  compare: boolean;
}

const IRREG_PAST =
  'went had saw came got made said took bought ate drove left met told gave found knew thought wrote ran sent felt became began brought spoke wore broke chose flew forgot lost paid sold slept spent stood taught understood won did was were'.split(
    ' ',
  );
const IRREG_PART =
  'been gone seen done eaten written taken given known broken chosen spoken worn torn forgotten driven flown grown shown stolen fallen'.split(' ');

const NAME_DICT: [RegExp, string[], Partial<Pick<KeySpec, 'ing' | 'ed' | 'compare'>>?][] = [
  [/to be|verb be|“be”|\bwas \/ were\b|was\/were/i, ['am', 'is', 'are', 'was', 'were', "'m", "'re"]],
  [/possessive/i, ['my', 'your', 'his', 'her', 'its', 'our', 'their']],
  [/demonstrative/i, ['this', 'that', 'these', 'those']],
  [/comparative/i, ['than', 'more', 'less', 'as'], { compare: true }],
  [/superlative/i, ['most', 'least'], { compare: true }],
  [/past simple|simple past/i, ['did', 'was', 'were', ...IRREG_PAST], { ed: true }],
  [/continuous|progressive/i, ['am', 'is', 'are', 'was', 'were', "'m", "'re"], { ing: true }],
  [/present perfect/i, ['have', 'has', "'ve", 'been', 'already', 'yet', 'ever', 'never', 'just', 'since', 'for', ...IRREG_PART]],
  [/past perfect/i, ['had', "'d", 'by the time', ...IRREG_PART]],
  [/future perfect|will have/i, ['will have', "'ll have"]],
  [/passive/i, ['am', 'is', 'are', 'was', 'were', 'been', 'being', 'be', 'by', ...IRREG_PART], { ed: true }],
  [/going to/i, ['going to']],
  [/\bwill\b|future/i, ['will', "'ll", 'going to']],
  [/used to/i, ['used to', 'use to']],
  [/would/i, ['would', "'d"]],
  [/should/i, ['should', 'ought to']],
  [/\bcan\b|ability/i, ['can', 'could']],
  [/could/i, ['could']],
  [/modal/i, ['can', 'could', 'should', 'must', 'might', 'may', 'would', 'have to', 'had to', 'ought to', 'need to']],
  [/necessity|obligation/i, ['must', 'have to', 'has to', 'had to', 'need to', 'should', 'supposed to']],
  [/certainty|speculat|deduction|possibility/i, ['must', 'might', 'may', 'could', 'can’t', 'have']],
  [/conditional|\bif\b/i, ['if', 'unless', 'would', 'will', "'d", "'ll", 'as long as', 'provided that']],
  [/wish|if only/i, ['wish', 'if only']],
  [/relative|whose|who\b/i, ['who', 'which', 'that', 'whose', 'where', 'when', 'whom']],
  [/gerund|-ing/i, [], { ing: true }],
  [/infinitive/i, ['to']],
  [/question|wh-/i, ['what', 'where', 'when', 'who', 'why', 'how', 'which', 'do', 'does', 'did']],
  [/there is|there are/i, ['there is', 'there are', "there's", 'is there', 'are there']],
  [/how much|how many/i, ['how much', 'how many']],
  [/frequency/i, ['always', 'usually', 'often', 'sometimes', 'never', 'hardly ever', 'almost always', 'rarely', 'seldom']],
  [/quantifier|quantity/i, ['a lot of', 'many', 'much', 'few', 'a few', 'little', 'a little', 'some', 'any', 'all', 'no one', 'nearly all', 'not many', 'enough', 'several', 'plenty of']],
  [/object pronoun/i, ['me', 'him', 'her', 'us', 'them']],
  [/\bso\b.*\btoo\b|neither|either/i, ['so', 'too', 'neither', 'either']],
  [/\btell\b|\bsay\b/i, ['tell', 'told', 'say', 'said']],
  [/reported|indirect/i, ['said', 'told', 'asked', 'if', 'whether']],
  [/article/i, ['a', 'an', 'the']],
  [/cleft/i, ['what', 'it is', 'it was', 'all']],
  [/despite|although|concession|contrast/i, ['despite', 'in spite of', 'although', 'though', 'however', 'even though', 'whereas', 'while']],
  [/purpose/i, ['to', 'in order to', 'so as to', 'so that', 'for']],
  [/\btoo\b|enough/i, ['too', 'enough', 'too much', 'too many']],
  [/because|reason|cause/i, ['because', 'because of', 'since', 'as', 'so', 'due to']],
  [/tag/i, ["isn't", "aren't", "don't", "doesn't", "didn't", "haven't", "won't"]],
  [/adverb/i, ['really', 'very', 'quite', 'extremely', 'a bit', 'pretty', 'fairly']],
  [/rather|prefer/i, ['rather', 'prefer', 'than']],
];

/** Build the set of words worth highlighting for one grammar point. */
export function keySpec(g: { name: string; short?: string; form?: string[] }): KeySpec {
  const spec: KeySpec = { words: new Map(), ing: false, ed: false, neg: false, compare: false };
  const add = (w: string, role: Role) => {
    const k = norm(w)
      .replace(/[….?!,]+$/g, '')
      .replace(/^\(|\)$/g, '')
      .trim();
    if (!k || k.length > 28 || k.split(' ').length > 3) return;
    if (['the', 'a', 'an', 'it', 'and', 'with', 'of', 'in', 'on', 'at', 'there'].includes(k) && !/article|there is/i.test(g.name)) return;
    if (!spec.words.has(k)) spec.words.set(k, role);
  };

  for (const line of parseForm(g.form)) {
    if (line.polarity === '-' || line.polarity === '-?') spec.neg = true;
    for (const tk of line.tokens ?? []) {
      if (tk.t !== 'chip') continue;
      const c = tk.chip;
      const t = norm(c.text);
      if (/-ing|\bing\b|gerund|continuous/.test(t)) spec.ing = true;
      if (/past form|past simple|simple past|-ed\b|\bv2\b/.test(t)) spec.ed = true;
      if (c.role === 'neg') spec.neg = true;
      if (c.slot) continue;
      if (c.role === 'aux' || c.role === 'neg' || c.role === 'conn' || c.role === 'key') {
        for (const alt of c.text.split(/\s*\/\s*|\s+or\s+/)) add(alt, c.role === 'neg' ? 'neg' : c.role === 'conn' ? 'conn' : 'aux');
      }
    }
  }
  for (const [re, words, flags] of NAME_DICT) {
    if (re.test(g.name)) {
      words.forEach((w) => add(w, /^(than|as|if|unless|who|which|that|whose|where|when|whom|because|since|so|despite|although|though|however|by|for|to)$/.test(w) ? 'conn' : 'aux'));
      Object.assign(spec, flags);
    }
  }
  // quoted words in the point name: Modals “can” and “should”
  for (const m of g.name.matchAll(/[“‘"]([^”’"]{1,24})[”’"]/g)) m[1]!.split(/\s*\/\s*/).forEach((w) => add(w, 'aux'));
  // "Demonstratives: this, that, these, those"
  const colon = g.name.split(':')[1];
  if (colon) colon.split(/,\s*|\s+and\s+/).forEach((w) => w.trim().split(' ').length <= 3 && add(w, 'aux'));
  // a short that is just a list: "always, almost always, usually, hardly ever, never."
  if (g.short && /^[a-z][a-z ,’'-]+\.?$/i.test(g.short) && g.short.split(',').length >= 3)
    g.short.split(',').forEach((w) => w.trim().split(' ').length <= 3 && add(w, 'aux'));
  if (spec.ing && spec.words.size === 0) spec.words.set('am', 'aux');
  return spec;
}

export interface Seg {
  text: string;
  role?: Role;
}

const ING_STOP = new Set(['thing', 'things', 'something', 'anything', 'nothing', 'everything', 'morning', 'evening', 'during', 'bring', 'king', 'ring', 'sing', 'spring', 'string', 'wing', 'ceiling', 'building', 'meeting', 'wedding', 'feeling', 'clothing', 'shopping', 'boring', 'interesting', 'amazing', 'exciting', 'darling', 'sibling', 'ending']);
const ED_STOP = new Set(['need', 'feed', 'speed', 'bed', 'red', 'seed', 'weed', 'hundred', 'indeed', 'shed', 'bored', 'tired', 'interested', 'excited', 'married', 'worried', 'used']);
const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const cache = new WeakMap<KeySpec, RegExp>();
function specRegex(spec: KeySpec): RegExp {
  const hit = cache.get(spec);
  if (hit) return hit;
  const words = [...spec.words.keys()]
    .filter((w) => !w.startsWith("'"))
    .sort((a, b) => b.length - a.length)
    .map((w) => escape(w).replace(/'/g, "['’]").replace(/ /g, '\\s+'));
  const contr = [...spec.words.keys()].filter((w) => w.startsWith("'")).map((w) => escape(w.slice(1)));
  const alts: string[] = [];
  if (spec.compare)
    alts.push("[A-Za-z]+(?:er)(?=\\s+than\\b)", "(?<=\\bthe\\s)[A-Za-z]{2,}(?:est|er)\\b", '\\b(?:better|worse|best|worst)\\b');
  if (spec.neg) alts.push("[A-Za-z]+n['’]t\\b", '\\bnot\\b', '\\bnever\\b');
  if (words.length) alts.push(`(?<![A-Za-z'’])(?:${words.join('|')})(?![A-Za-z])`);
  if (contr.length) alts.push(`(?<=[A-Za-z])['’](?:${contr.join('|')})\\b`);
  if (spec.ing) alts.push('\\b[A-Za-z]{2,}ing\\b');
  if (spec.ed) alts.push('\\b[A-Za-z]{2,}ed\\b');
  const re = alts.length ? new RegExp(alts.join('|'), 'gi') : /$^/g;
  cache.set(spec, re);
  return re;
}

function roleFor(match: string, spec: KeySpec): Role | undefined {
  const m = norm(match).replace(/\s+/g, ' ');
  if (/n't$/.test(m) || m === 'not' || m === 'never') return spec.neg || spec.words.has(m) ? 'neg' : undefined;
  if (spec.words.has(m)) return spec.words.get(m);
  if (m.startsWith("'") && spec.words.has(m)) return 'aux';
  if (m.startsWith("'")) return 'aux';
  if (spec.compare && /(er|est)$|^(better|worse|best|worst)$/.test(m)) return 'key';
  if (/ing$/.test(m)) return spec.ing && !ING_STOP.has(m) ? 'verb' : undefined;
  if (/ed$/.test(m)) return spec.ed && !ED_STOP.has(m) ? 'verb' : undefined;
  return undefined;
}

/** Split text into plain and highlighted segments. */
export function highlight(text: string, spec: KeySpec | undefined): Seg[] {
  if (!spec) return [{ text }];
  const re = specRegex(spec);
  re.lastIndex = 0;
  const out: Seg[] = [];
  let last = 0;
  for (const m of text.matchAll(re)) {
    const role = roleFor(m[0], spec);
    if (!role || m.index === undefined) continue;
    if (m.index > last) out.push({ text: text.slice(last, m.index) });
    out.push({ text: m[0], role });
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push({ text: text.slice(last) });
  return out;
}

// --------------------------------------------------------- wrong / right ----

export interface Pair {
  wrong?: string;
  right?: string;
}

const QUOTE_RE = /“([^”]{1,90})”|‘([^‘]{1,90}?)’(?![a-z])|"([^"]{1,90})"/g;

/**
 * Finds a ✗ / ✓ pair in a watch-out or note:
 * “X” is wrong — say “Y” · “X”, never “Y” · ‘X’, not ‘Y’ · “X” must be “Y” · not “Y”…
 */
export function parsePair(text: string): Pair | null {
  const qs = [...text.matchAll(QUOTE_RE)].map((m) => ({ q: (m[1] ?? m[2] ?? m[3] ?? '').trim(), start: m.index!, end: m.index! + m[0].length }));
  if (!qs.length) return null;
  const pairs = qs.slice(1).map((b, i) => ({ a: qs[i]!, b, between: text.slice(qs[i]!.end, b.start).toLowerCase() }));
  for (const { a, b, between } of pairs) {
    if (/\b(never|not)[\s(]*$/i.test(text.slice(Math.max(0, a.start - 14), a.start))) continue;
    if (/^[\s,;:.)]*(—\s*)?(never|not|instead of|rather than|and never|but not|never say|not say|and not)[\s:]*$/.test(between)) return { right: a.q, wrong: b.q };
  }
  for (const { a, b, between } of pairs) {
    if (between.length > 40) continue;
    if (/(is wrong|is incorrect|must be|should be|is not english|sounds wrong|sounds rude)?[\s—–:,;.]*(say|just|use|write|it is|it['’]s|must be|should be)?[\s:]*$/.test(between) && /(wrong|incorrect|must be|should be|not english|say|just|write)/.test(between))
      return { wrong: a.q, right: b.q };
  }
  // single wrong: “X” is wrong / never write ‘X’
  for (const a of qs) {
    const before = text.slice(Math.max(0, a.start - 24), a.start).toLowerCase();
    const after = text.slice(a.end, a.end + 16).toLowerCase();
    if (/is (wrong|incorrect)/.test(after) || /(never (say|write|use)|don['’]t (say|write)|not)\s*$/.test(before)) return { wrong: a.q };
  }
  return null;
}

// ----------------------------------------------------------------- notes ----

/** Splits a note into a short head (≈ one line) and the rest. */
export function noteParts(note: string): { head: string; body?: string } {
  const n = clean(note);
  const c = /^([^:“‘"]{8,64}):\s+(.+)$/.exec(n);
  if (c) return { head: c[1]!, body: c[2]! };
  if (n.length <= 80) return { head: n };
  const d = /^(.{12,80}?)\s+[—–]\s+(.+)$/.exec(n);
  if (d) return { head: d[1]!, body: d[2]! };
  const s = /^(.{20,90}?[.!?])\s+(.+)$/.exec(n);
  if (s) return { head: s[1]!, body: s[2]! };
  return { head: n };
}

/** First sentence, trimmed to roughly `max` characters on a word boundary. */
export function firstSentence(text: string, max = 120): string {
  const t = clean(text);
  const m = /^(.+?[.!?])(\s|$)/.exec(t);
  let s = m ? m[1]! : t;
  if (s.length > max) s = s.slice(0, s.lastIndexOf(' ', max)) + '…';
  return s;
}

// ------------------------------------------------------------- coverage ----

/** Summary used by the report script: how each point's form lines were parsed. */
export function formCoverage(points: { form?: string[] }[]) {
  const lines = { formula: 0, transform: 0, list: 0, labelled: 0, plain: 0 };
  let withFormula = 0;
  let allStructured = 0;
  let total = 0;
  for (const p of points) {
    total++;
    const parsed = parseForm(p.form);
    parsed.forEach((l) => lines[l.kind]++);
    if (parsed.some((l) => l.kind === 'formula')) withFormula++;
    if (parsed.length && parsed.every((l) => l.kind !== 'plain')) allStructured++;
  }
  return { total, withFormula, allStructured, lines };
}
