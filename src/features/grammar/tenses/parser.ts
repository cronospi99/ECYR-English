/**
 * Tense Timeline — a small, local, rule-based parser for English sentences.
 * No AI: tokenises the sentence (expanding contractions), tags time
 * expressions, splits it into clauses, finds each clause's verb group and
 * names the tense/aspect, then flags typical learner mistakes.
 *
 * Verb forms come from the Verb Lab bank (buildLexicon(loadVerbLab().verbs)).
 * Pure TypeScript with no React or browser APIs, so a node script can test it.
 */
import type { ClauseKind } from './data';

// ------------------------------------------------------------------ lexicon --

export interface RawVerb {
  en: string;
  past: string;
  part: string;
  es?: string;
  emoji?: string;
  type?: string;
}

export interface VerbEntry {
  en: string;
  past: string[];
  part: string[];
  es: string;
  emoji: string;
  irregular: boolean;
}

export interface Lexicon {
  list: VerbEntry[];
  base: Map<string, VerbEntry>;
  past: Map<string, VerbEntry>;
  part: Map<string, VerbEntry>;
}

const splitForms = (s: string) =>
  s
    .split('/')
    .map((x) => x.trim().toLowerCase())
    .filter((x) => x && !x.includes(' '));

/** Verbs whose forms win when two verbs share a spelling (saw = see, not "to saw"). */
const CORE_FIRST = ['be', 'have', 'do', 'go', 'see', 'find', 'fall', 'leave', 'lie', 'get', 'make', 'take', 'come', 'know', 'think', 'say', 'tell', 'give', 'feel', 'hear', 'wind', 'use'];

export function buildLexicon(raw: RawVerb[]): Lexicon {
  const lex: Lexicon = { list: [], base: new Map(), past: new Map(), part: new Map() };
  for (const r of raw) {
    const en = r.en.trim().toLowerCase();
    if (!en || en.includes(' ') || lex.base.has(en)) continue;
    const e: VerbEntry = { en, past: splitForms(r.past), part: splitForms(r.part), es: r.es ?? '', emoji: r.emoji ?? '', irregular: r.type === 'irregular' };
    if (!e.past.length || !e.part.length) continue;
    lex.list.push(e);
    lex.base.set(en, e);
  }
  if (!lex.base.has('be')) {
    const be: VerbEntry = { en: 'be', past: ['was', 'were'], part: ['been'], es: 'ser / estar', emoji: '🧍', irregular: true };
    lex.list.push(be);
    lex.base.set('be', be);
  }
  const order = [...CORE_FIRST.map((w) => lex.base.get(w)).filter((e): e is VerbEntry => !!e), ...lex.list];
  for (const e of order) {
    for (const p of e.past) if (!lex.past.has(p)) lex.past.set(p, e);
    for (const p of e.part) if (!lex.part.has(p)) lex.part.set(p, e);
  }
  return lex;
}

// --------------------------------------------------------------- morphology --

export function thirdPerson(v: string) {
  if (v === 'be') return 'is';
  if (v === 'have') return 'has';
  if (/(s|x|z|ch|sh|o)$/.test(v)) return v + 'es';
  if (/[^aeiou]y$/.test(v)) return v.slice(0, -1) + 'ies';
  return v + 's';
}

const DOUBLE_FINAL = new Set(['begin', 'forget', 'forbid', 'upset', 'prefer', 'refer', 'admit', 'commit', 'permit', 'regret', 'occur', 'control', 'omit', 'submit', 'equip', 'quit', 'beget', 'outrun', 'overrun', 'underpin', 'forgo']);

export function ingForm(e: VerbEntry | string): string {
  const v = typeof e === 'string' ? e : e.en;
  const past = typeof e === 'string' ? undefined : e.past.find((p) => p.endsWith('ed'));
  if (v === 'be') return 'being';
  if (v.endsWith('ie')) return v.slice(0, -2) + 'ying';
  if (/(ee|ye|oe)$/.test(v)) return v + 'ing';
  if (v.endsWith('e') && v.length > 2) return v.slice(0, -1) + 'ing';
  if (past === v + 'ked') return v + 'king';
  const last = v.at(-1)!;
  if (past === v + last + 'ed') return v + last + 'ing';
  if (past === v + 'ed') return v + 'ing';
  if (DOUBLE_FINAL.has(v)) return v + last + 'ing';
  if (/^[^aeiou]*[aeiou][^aeiouwxy]$/.test(v)) return v + last + 'ing';
  return v + 'ing';
}

/** Preferred past form (the -ed variant when there are two, "learned"). */
export const pastForm = (e: VerbEntry) => e.past.find((p) => p.endsWith('ed') && e.past.length > 1) ?? e.past[0]!;
export const partForm = (e: VerbEntry) => e.part.find((p) => p.endsWith('ed') && e.part.length > 1) ?? e.part[0]!;

const NOT_ING = new Set(['morning', 'evening', 'thing', 'nothing', 'something', 'anything', 'everything', 'ceiling', 'during', 'king', 'spring', 'string', 'wing', 'sibling', 'darling', 'pudding', 'wedding', 'building', 'meeting', 'feeling', 'painting', 'clothing', 'shopping', 'ending', 'beginning', 'interesting', 'boring', 'amazing']);
const ING_OK_AS_VERB = new Set(['building', 'meeting', 'feeling', 'painting', 'shopping', 'ending', 'beginning', 'wedding']);

interface Forms {
  base?: VerbEntry;
  third?: VerbEntry;
  past?: VerbEntry;
  part?: VerbEntry;
  ing?: VerbEntry;
}

function makeForms(lex: Lexicon) {
  const cache = new Map<string, Forms>();
  return (w: string, allowNounIng = false): Forms => {
    const key = w + (allowNounIng ? '#' : '');
    const hit = cache.get(key);
    if (hit) return hit;
    const f: Forms = {};
    if (/^[a-z]+$/.test(w)) {
      f.base = lex.base.get(w);
      f.past = lex.past.get(w);
      f.part = lex.part.get(w);
      if (w === 'is') f.third = lex.base.get('be');
      else if (w === 'has') f.third = lex.base.get('have');
      else if (w === 'does') f.third = lex.base.get('do');
      else if (w.endsWith('s') && !w.endsWith('ss')) {
        f.third = lex.base.get(w.slice(0, -1)) ?? (w.endsWith('es') ? lex.base.get(w.slice(0, -2)) : undefined) ?? (w.endsWith('ies') ? lex.base.get(w.slice(0, -3) + 'y') : undefined);
      }
      if (w.endsWith('ing') && w.length >= 5 && (!NOT_ING.has(w) || (allowNounIng && ING_OK_AS_VERB.has(w)))) {
        const s = w.slice(0, -3);
        if (w === 'being') f.ing = lex.base.get('be');
        else
          f.ing =
            lex.base.get(s) ??
            lex.base.get(s + 'e') ??
            (/(.)\1$/.test(s) ? lex.base.get(s.slice(0, -1)) : undefined) ??
            (s.endsWith('y') ? lex.base.get(s.slice(0, -1) + 'ie') : undefined) ??
            (s.endsWith('ck') ? lex.base.get(s.slice(0, -1)) : undefined);
      }
      // Unknown regular verbs ("googled"): accept -ed as past/participle.
      if (!f.past && !f.part && !f.base && w.endsWith('ed') && w.length > 4) {
        const stem = w.slice(0, -2);
        const e: VerbEntry = { en: stem, past: [w], part: [w], es: '', emoji: '', irregular: false };
        f.past = e;
        f.part = e;
      }
    }
    cache.set(key, f);
    return f;
  };
}

// ------------------------------------------------------------------- tokens --

export type Role = 'subject' | 'aux' | 'neg' | 'verb' | 'time' | 'conn' | 'other';

export interface Piece {
  surface: string;
  norm: string;
  start: number;
  end: number;
  hidden?: boolean;
  punct?: boolean;
  role: Role;
  clause: number;
  timeId?: number;
}

const TOKEN_RE = /\d{1,2}:\d{2}|\p{L}+(?:'\p{L}+)*|\d+(?:st|nd|rd|th|s|am|pm)?|[.,;:!?]/gu;
const NT_SPECIAL: Record<string, string> = { wo: 'will', ca: 'can', sha: 'shall', ai: 'is' };
const CONTR: Record<string, string> = { ll: 'will', ve: 'have', re: 'are', m: 'am', d: "'d", s: "'s" };

function tokenize(text: string): Piece[] {
  const out: Piece[] = [];
  const mk = (surface: string, norm: string, start: number, extra: Partial<Piece> = {}): Piece => ({
    surface,
    norm,
    start,
    end: start + surface.length,
    role: 'other',
    clause: 0,
    ...extra,
  });
  for (const m of text.matchAll(TOKEN_RE)) {
    const tok = m[0];
    const at = m.index!;
    const low = tok.toLowerCase();
    if (/^[.,;:!?]$/.test(tok)) {
      out.push(mk(tok, tok, at, { punct: true }));
      continue;
    }
    if (low === "o'clock") {
      out.push(mk(tok, low, at));
      continue;
    }
    if (low === 'cannot') {
      out.push(mk(tok, 'can', at), { ...mk('', 'not', at + tok.length), hidden: true });
      continue;
    }
    if (low === 'gonna' || low === 'wanna') {
      out.push(mk(tok, low === 'gonna' ? 'going' : 'want', at), { ...mk('', 'to', at + tok.length), hidden: true });
      continue;
    }
    const nt = low.match(/^(.*)n't$/);
    if (nt) {
      const b = nt[1]!;
      if (NT_SPECIAL[b]) out.push(mk(tok, NT_SPECIAL[b]!, at), { ...mk('', 'not', at + tok.length), hidden: true });
      else out.push(mk(tok.slice(0, -3), b, at), mk(tok.slice(-3), 'not', at + tok.length - 3));
      continue;
    }
    const c = low.match(/^(.+)'(ll|ve|re|m|d|s)$/);
    if (c) {
      const cut = c[1]!.length;
      const head = c[1]!;
      out.push(mk(tok.slice(0, cut), head === 'i' ? 'i' : head, at));
      out.push(mk(tok.slice(cut), head === 'let' && c[2] === 's' ? 'us' : CONTR[c[2]!]!, at + cut));
      continue;
    }
    out.push(mk(tok, low, at));
  }
  return out;
}

// --------------------------------------------------------------- word lists --

const PERSON: Record<string, Person> = {
  i: '1s',
  you: '2',
  he: '3s',
  she: '3s',
  it: '3s',
  we: 'pl',
  they: 'pl',
  this: '3s',
  that: '3s',
  everyone: '3s',
  everybody: '3s',
  someone: '3s',
  somebody: '3s',
  nobody: '3s',
  everything: '3s',
  nothing: '3s',
  something: '3s',
  people: 'pl',
  children: 'pl',
  these: 'pl',
  those: 'pl',
};
type Person = '1s' | '2' | '3s' | 'pl';
const SUBJ_PRONOUNS = new Set(['i', 'you', 'he', 'she', 'it', 'we', 'they', 'there']);
const DETS = new Set(['a', 'an', 'the', 'my', 'your', 'his', 'her', 'its', 'our', 'their', 'this', 'that', 'these', 'those', 'some', 'any', 'no', 'every', 'each', 'many', 'much', 'few', 'several', 'all', 'both', 'another', 'other', 'which', 'whose', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'new', 'old', 'good', 'bad', 'big', 'small', 'little', 'best', "'s"]);
const PREPS = new Set(['to', 'of', 'in', 'on', 'at', 'for', 'with', 'from', 'about', 'by', 'into', 'like', 'than', 'as', 'without', 'near', 'around', 'during', 'through']);
const ADVERBS = new Set(['please', 'not', 'never', 'always', 'usually', 'often', 'sometimes', 'rarely', 'seldom', 'already', 'just', 'ever', 'still', 'really', 'also', 'probably', 'definitely', 'certainly', 'even', 'hardly', 'recently', 'only', 'actually', 'normally', 'generally', 'finally', 'surely', 'frequently', 'occasionally', 'completely', 'nearly', 'almost', 'totally', 'simply', 'all', 'both', 'soon', 'maybe', 'perhaps', 'quickly', 'slowly', 'suddenly', 'immediately', 'then', 'now', 'once', 'again', 'lately', 'currently', 'mostly', 'easily', 'barely', 'truly', 'honestly', 'personally', 'obviously', 'clearly', 'fully']);
const WH = new Set(['what', 'where', 'when', 'why', 'who', 'whom', 'whose', 'which', 'how']);
const BE_FIN = new Set(['am', 'is', 'are', 'was', 'were']);
const HAVE_FIN = new Set(['have', 'has', 'had']);
const DO_FIN = new Set(['do', 'does', 'did']);
const MODALS = new Set(['will', 'shall', 'would', 'can', 'could', 'should', 'must', 'may', 'might', 'ought']);
const AUX_FIRST = new Set([...BE_FIN, ...HAVE_FIN, ...DO_FIN, ...MODALS]);
/** be + base form that is really an adjective ("I am free") — no warning. */
const ADJ_LIKE = new Set(['free', 'clean', 'open', 'empty', 'dry', 'warm', 'cool', 'calm', 'tidy', 'slow', 'quiet', 'wrong', 'right', 'better', 'fine', 'close', 'last', 'busy', 'ready', 'double', 'clear', 'dirty', 'smooth', 'light', 'dark', 'wet', 'black', 'white', 'blind', 'present', 'perfect', 'secure', 'safe', 'sure', 'well', 'level', 'round', 'even', 'fit', 'mean', 'like', 'back', 'home', 'out', 'up', 'down', 'off', 'over', 'next', 'complete', 'separate', 'correct', 'average', 'equal', 'humble', 'narrow', 'direct', 'live', 'cold', 'hot', 'brown', 'green', 'yellow', 'blue', 'red', 'thin', 'slim', 'lower', 'tired', 'total', 'loose', 'tame', 'smart', 'sound', 'weird', 'cheap', 'faint', 'rough', 'tight', 'firm', 'flat', 'idle', 'short', 'long', 'mature', 'prime', 'still', 'stuck', 'welcome', 'worth', 'alert', 'bust', 'dull', 'false', 'grand', 'proud', 'sick', 'sour', 'square', 'steady', 'stiff', 'sweet', 'weary', 'wise', 'young', 'american', 'ok', 'okay']);
/** be + participle used as an adjective, not a passive ("I am tired"). */
const ADJ_PART = new Set(['tired', 'bored', 'interested', 'excited', 'married', 'divorced', 'worried', 'scared', 'frightened', 'surprised', 'pleased', 'closed', 'finished', 'done', 'gone', 'lost', 'broken', 'confused', 'embarrassed', 'disappointed', 'annoyed', 'amazed', 'shocked', 'relaxed', 'satisfied', 'stressed', 'exhausted', 'involved', 'located', 'used', 'dressed', 'engaged', 'crowded', 'retired', 'qualified', 'concerned', 'delighted', 'impressed', 'stuck', 'drunk', 'supposed']);
/** Regular verbs that are never nouns, so "have + base" is surely a mistake. */
const HAVE_BASE_ERR = new Set(['finish', 'arrive', 'decide', 'visit', 'live', 'try', 'stay', 'wait', 'listen', 'explain', 'invite', 'receive', 'complete', 'prepare', 'happen', 'learn', 'study', 'travel', 'watch', 'clean', 'cook', 'work', 'play', 'start']);
const STATIVE = new Set(['be', 'have', 'know', 'like', 'love', 'hate', 'want', 'need', 'believe', 'understand', 'own', 'belong', 'seem', 'prefer', 'remember', 'mean', 'agree', 'disagree', 'live', 'cost', 'contain', 'depend', 'deserve', 'exist', 'matter', 'owe', 'possess', 'recognize', 'realize', 'suppose', 'wish', 'forget', 'doubt', 'appear', 'consist', 'include', 'involve', 'weigh', 'fit', 'adore', 'dislike', 'detest', 'think', 'feel', 'look', 'sound', 'smell', 'taste']);
/** Common destinations: "going to school" is go + to + noun, not "going to". */
const NOUNISH = new Set(['school', 'bed', 'work', 'church', 'class', 'college', 'university', 'town', 'market', 'hospital', 'prison', 'sea', 'sleep', 'lunch', 'dinner', 'breakfast', 'court', 'jail', 'war', 'parties', 'party', 'concerts', 'the', 'a', 'an', 'my', 'your', 'his', 'her', 'our', 'their', 'bogotá', 'bogota', 'paris', 'london', 'cali', 'medellín']);
const REPORT = new Set(['say', 'said', 'says', 'think', 'thought', 'thinks', 'know', 'knew', 'knows', 'believe', 'believed', 'hope', 'hoped', 'tell', 'told', 'told', 'feel', 'felt', 'realize', 'realized', 'realise', 'realised', 'explain', 'explained', 'mean', 'meant', 'sure', 'guess', 'promise', 'promised', 'heard', 'hear', 'see', 'saw', 'noticed', 'notice', 'me', 'us', 'him', 'her', 'them', 'you']);
/** Common "do + past" readings where the word is also a base ("lay the table"). */
const PAST_AS_BASE_OK = new Set(['lay', 'bore', 'wound', 'ground', 'bound']);
/** Verbs that introduce a reported clause without "that" ("I think it will rain"). */
const FRAME = new Set(['think', 'thought', 'hope', 'hoped', 'believe', 'guess', 'suppose', 'bet', 'expect', 'imagine', 'sure', 'know', 'knew', 'said', 'say', 'says', 'promise', 'promised', 'feel', 'felt', 'realized', 'realised', 'told', 'mean', 'wish', 'heard', 'noticed', 'remember', 'forgot']);

const SUB_CONN: string[][] = [
  ['as', 'soon', 'as'],
  ['by', 'the', 'time'],
  ['the', 'moment'],
  ['even', 'though'],
  ['so', 'that'],
  ['as', 'long', 'as'],
  ['and', 'then'],
  ['when'],
  ['whenever'],
  ['while'],
  ['before'],
  ['after'],
  ['until'],
  ['till'],
  ['because'],
  ['since'],
  ['if'],
  ['unless'],
  ['although'],
  ['though'],
  ['once'],
  ['and'],
  ['but'],
  ['so'],
  ['or'],
  ['then'],
  ['that'],
  ['whereas'],
];
/** Conjunctions after which a future is expressed with a present tense. */
const TIME_CONN = new Set(['when', 'whenever', 'as soon as', 'before', 'after', 'until', 'till', 'once', 'if', 'unless', 'by the time', 'the moment', 'as long as']);

// ------------------------------------------------------------ time phrases --

export type TimeKind = 'past' | 'now' | 'future' | 'since' | 'for' | 'by' | 'clock' | 'freq' | 'already' | 'yet' | 'just' | 'still' | 'ever' | 'never' | 'recent' | 'duration' | 'period' | 'day' | 'within' | 'howlong';

export interface TimeExpr {
  id: number;
  text: string;
  kind: TimeKind;
  /** Position on the axis (-1 far past … 0 now … 1 far future) when the phrase fixes one. */
  pos: number | null;
  from: number;
  to: number;
  clause: number;
  /** A mistake inside the phrase: since + duration / for + year. */
  err?: 'sinceDuration' | 'forYear';
}

const NUMW = '(?:\\d+|a|an|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|fifteen|twenty|thirty|forty|fifty|a few|a couple of|several|many|some)';
const UNIT = '(?:seconds?|minutes?|hours?|days?|weeks?|months?|years?|decades?|centur(?:y|ies))';
const DAY = '(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)';
const MONTH = '(?:january|february|march|april|may|june|july|august|september|october|november|december)';
const PART = '(?:morning|afternoon|evening|night)';
const SEASON = '(?:summer|winter|spring|autumn|fall)';
const NUMBERS = '(?:one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)';
const CLOCK = `(?:\\d{1,2}:\\d{2}(?: ?(?:am|pm))?|\\d{1,2}(?:am|pm)|\\d{1,2}(?: (?:am|pm|o'clock))?|midnight|noon|midday|${NUMBERS}(?: o'clock| thirty)?)`;
const NOW_YEAR = 2026;

function unitPos(u: string) {
  if (/second|minute/.test(u)) return 0.08;
  if (/hour/.test(u)) return 0.12;
  if (/day/.test(u)) return 0.28;
  if (/week/.test(u)) return 0.38;
  if (/month/.test(u)) return 0.5;
  if (/year/.test(u)) return 0.65;
  return 0.85;
}
const yearPos = (y: number) => (y < NOW_YEAR ? -Math.min(0.92, 0.55 + (NOW_YEAR - y) / 40) : y > NOW_YEAR ? Math.min(0.92, 0.5 + (y - NOW_YEAR) / 25) : 0);

type TimeRule = [RegExp, (m: RegExpMatchArray) => { kind: TimeKind; pos: number | null; err?: TimeExpr['err'] }, boolean?];
const R = (s: string) => new RegExp(`(?<![\\w'])(?:${s})(?![\\w'])`, 'g');

/** Ordered: longer and more specific phrases first. `true` = reject if a verb follows (it's a clause). */
const TIME_RULES: TimeRule[] = [
  [R(`when (?:i|we|he|she|they|you) (?:was|were) (?:a child|children|a kid|kids|young|younger|little|small|a teenager|teenagers|at school|in (?:high )?school|a student|students|at university|in college)`), () => ({ kind: 'period', pos: -0.75 })],
  [R(`as (?:a child|a kid|kids|children|a teenager|teenagers|a student)`), () => ({ kind: 'period', pos: -0.75 })],
  [R(`in the (?:past|old days|(?:19)?[5-9]0s|(?:20)?[01]0s)`), () => ({ kind: 'past', pos: -0.82 })],
  [R(`the day before yesterday`), () => ({ kind: 'past', pos: -0.4 })],
  [R(`the day after tomorrow`), () => ({ kind: 'future', pos: 0.42 })],
  [R(`since ${NUMW} (?:more )?${UNIT}|since (?:a long time|ages)`), () => ({ kind: 'since', pos: -0.6, err: 'sinceDuration' })],
  [
    R(`since (?:(?:19|20)\\d\\d|last (?:${DAY}|week|weekend|month|year|${SEASON}|night|time)|yesterday|${DAY}|${MONTH}|then|childhood|this ${PART}|${PART}|i was (?:a child|young|little|a kid|a teenager)|the (?:beginning|start) of (?:the )?(?:year|month|week|course|semester)|${CLOCK})`),
    (m) => {
      const t = m[0];
      const y = t.match(/(19|20)\d\d/);
      if (y) return { kind: 'since', pos: yearPos(+y[0]) };
      if (/childhood|i was/.test(t)) return { kind: 'since', pos: -0.85 };
      if (/yesterday|night/.test(t)) return { kind: 'since', pos: -0.3 };
      if (/this|morning|afternoon|evening|\d|o'clock|noon/.test(t)) return { kind: 'since', pos: -0.14 };
      if (new RegExp(DAY).test(t)) return { kind: 'since', pos: -0.32 };
      return { kind: 'since', pos: -0.5 };
    },
  ],
  [R(`for (?:19|20)\\d\\d`), () => ({ kind: 'for', pos: null, err: 'forYear' })],
  [R(`for (?:${NUMW} (?:more |whole )?${UNIT}|ages|a long time|a while|ever|years|hours|days|weeks|months|decades|the (?:whole|entire) (?:day|week|month|year|morning|afternoon))`), () => ({ kind: 'for', pos: null })],
  [
    R(`by (?:the end of (?:the |this |next )?(?:day|week|month|year|${MONTH}|summer|semester)|${DAY}|tomorrow|tonight|next (?:week|month|year|${DAY}|${MONTH}|summer)|then|now|lunchtime|noon|midnight|(?:19|20)\\d\\d|${MONTH}|${CLOCK})`),
    (m) => ({ kind: 'by', pos: /now/.test(m[0]) ? 0 : /(19|20)\d\d/.test(m[0]) ? yearPos(+m[0].match(/(19|20)\d\d/)![0]) : null }),
  ],
  [R(`(?:at |around )?this time (?:tomorrow|next (?:week|month|year))`), () => ({ kind: 'future', pos: 0.36 })],
  [R(`at (?:that|the) (?:time|moment)|(?:at )?this time (?:yesterday|last (?:week|year|month))`), () => ({ kind: 'past', pos: -0.45 })],
  [R(`at ${CLOCK}|around ${CLOCK}`), () => ({ kind: 'clock', pos: null })],
  [R(`yesterday(?: ${PART})?`), () => ({ kind: 'past', pos: -0.3 })],
  [R(`last night`), () => ({ kind: 'past', pos: -0.24 })],
  [R(`last (?:${DAY}|weekend)`), () => ({ kind: 'past', pos: -0.34 })],
  [
    R(`last (?:week|month|year|${SEASON}|time|semester|christmas|term)`),
    (m) => ({ kind: 'past', pos: /week/.test(m[0]) ? -0.4 : /month|term|semester/.test(m[0]) ? -0.5 : /year/.test(m[0]) ? -0.6 : -0.52 }),
  ],
  [R(`(?:${NUMW} ${UNIT}|ages|long|a long time|a while) ago`), (m) => ({ kind: 'past', pos: -(m[0].match(new RegExp(UNIT)) ? unitPos(m[0]) : 0.8) })],
  [
    R(`in (?:19|20)\\d\\d`),
    (m) => {
      const p = yearPos(+m[0].slice(3));
      return { kind: p < 0 ? 'past' : p > 0 ? 'future' : 'now', pos: p };
    },
  ],
  [R(`tomorrow(?: ${PART})?`), () => ({ kind: 'future', pos: 0.3 })],
  [R(`next (?:${DAY}|weekend)`), () => ({ kind: 'future', pos: 0.35 })],
  [R(`next (?:week|month|year|${SEASON}|time|semester|term|christmas)`), (m) => ({ kind: 'future', pos: /week/.test(m[0]) ? 0.4 : /year/.test(m[0]) ? 0.62 : 0.5 })],
  [R(`in (?:the future|the coming (?:days|weeks|months|years))`), () => ({ kind: 'future', pos: 0.7 })],
  [R(`in ${NUMW} ${UNIT}`), (m) => ({ kind: 'within', pos: unitPos(m[0]) })],
  [R(`soon|later|one day|someday|some day|in a while`), (m) => ({ kind: 'future', pos: /one day|some/.test(m[0]) ? 0.72 : 0.2 })],
  [R(`on ${DAY}s|on weekends|on the weekends|at weekends|on weekdays`), () => ({ kind: 'freq', pos: null })],
  [R(`on ${DAY}|on the weekend|at the weekend|in ${MONTH}|on (?:my|his|her|your|our|their) birthday`), () => ({ kind: 'day', pos: null })],
  [
    R(`every (?:single )?(?:day|morning|night|evening|afternoon|week|weekend|month|year|summer|winter|${DAY}|time|${NUMW} ${UNIT})|(?:once|twice|${NUMW} times) (?:a|per|every) (?:day|week|month|year)|hardly ever|almost always|always|usually|often|sometimes|rarely|seldom|frequently|normally|generally|occasionally|daily|weekly|how often`),
    () => ({ kind: 'freq', pos: null }),
  ],
  [R(`twice|(?:three|four|five|many|several|a few|a couple of) times`), () => ({ kind: 'ever', pos: null })],
  [R(`all (?:day(?: long)?|morning|afternoon|evening|night|week|year|my life|the time)|the whole (?:day|week|morning|afternoon|night)`), () => ({ kind: 'duration', pos: null })],
  [R(`how long`), () => ({ kind: 'howlong', pos: null })],
  [R(`already`), () => ({ kind: 'already', pos: null })],
  [R(`yet`), () => ({ kind: 'yet', pos: null })],
  [R(`just`), () => ({ kind: 'just', pos: null })],
  [R(`still`), () => ({ kind: 'still', pos: null })],
  [R(`ever`), () => ({ kind: 'ever', pos: null })],
  [R(`never`), () => ({ kind: 'never', pos: null })],
  [R(`recently|lately|so far|up to now|until now|up till now`), () => ({ kind: 'recent', pos: null })],
  [R(`right now|at the moment|at present|currently|nowadays|these days|today|this (?:week|month|year|${PART}|${SEASON}|semester)|tonight|now`), (m) => ({ kind: 'now', pos: m[0] === 'tonight' ? 0.12 : 0 })],
  [
    R(`(?:before|after|until|till) (?:${CLOCK}|lunch(?:time)?|dinner|breakfast|${DAY}|${MONTH}|(?:the |that |this |my |our |his |her )?(?:party|class|meeting|exam|trip|game|match|weekend|holidays?|vacation|concert|wedding|flight|film|movie|show))`),
    () => ({ kind: 'day', pos: null }),
    true,
  ],
];

// ------------------------------------------------------------------- result --

export interface Warning {
  msg: string;
  /** The sentence with this mistake corrected, when the fix is mechanical. */
  fixed?: string;
  wrong?: string;
  right?: string;
}

export interface Clause {
  index: number;
  kind: ClauseKind;
  passive: boolean;
  polarity: 'pos' | 'neg' | 'q';
  conn: string | null;
  subject: string;
  lemma: string;
  times: TimeExpr[];
  /** Present tense used for the future (timetable, arrangement, after when/if). */
  futureRef: boolean;
  stative: boolean;
  note?: string;
}

export interface ParseResult {
  text: string;
  pieces: Piece[];
  clauses: Clause[];
  times: TimeExpr[];
  warnings: Warning[];
  question: boolean;
}

type Tag = 'AUX' | 'BASE' | 'THIRD' | 'PAST' | 'PP' | 'ING' | 'BASEPAST';
interface Item {
  p: number;
  norm: string;
  tag: Tag;
  lemma: string;
}
interface VG {
  wh: number[];
  subject: number[];
  chain: Item[];
  negs: number[];
  inverted: boolean;
  errs: { p: number; code: string; right: string; lemma: string }[];
}

export function normalizeText(t: string) {
  return t
    .replace(/[’‘`´]/g, "'")
    .replace(/\b([ap])\.m\.?/gi, '$1m')
    .replace(/\s+/g, ' ')
    .trim();
}

// -------------------------------------------------------------------- parse --

export function parseSentence(input: string, lex: Lexicon): ParseResult {
  const text = normalizeText(input);
  const P = tokenize(text);
  const forms = makeForms(lex);
  const warnings: Warning[] = [];
  const fix = (start: number, end: number, rep: string) => text.slice(0, start) + rep + text.slice(end);
  const fixMany = (edits: [number, number, string][]) => [...edits].sort((a, b) => b[0] - a[0]).reduce((t, [a, b, r]) => t.slice(0, a) + r + t.slice(b), text);
  const words = () => P.map((p, i) => ({ p, i })).filter((x) => !x.p.punct);

  const question = /\?\s*$/.test(text) || (P.length > 1 && AUX_FIRST.has(P[0]!.norm) && SUBJ_PRONOUNS.has(P[1]!.norm) && P[1]!.norm !== 'there') || (P.length > 2 && WH.has(P[0]!.norm) && AUX_FIRST.has(P[1]!.norm) && SUBJ_PRONOUNS.has(P[2]!.norm));

  // ---- resolve 's / 'd -----------------------------------------------------
  const nextIdx = (i: number) => {
    let j = i + 1;
    while (j < P.length && !P[j]!.punct && (ADVERBS.has(P[j]!.norm) || P[j]!.norm === 'not')) j++;
    return j;
  };
  const nextContent = (i: number) => {
    const j = nextIdx(i);
    return j < P.length && !P[j]!.punct ? P[j]!.norm : '';
  };
  P.forEach((pc, i) => {
    if (pc.norm === "'s") {
      const prev = P[i - 1]?.norm ?? '';
      const nx = nextContent(i);
      const f = forms(nx);
      if (nx === 'been' || nx === 'got' || nx === 'gotten') pc.norm = 'has';
      else if (nx === 'going' || f.ing) pc.norm = 'is';
      else if (f.part && !f.base && (P.slice(i + 1, nextIdx(i)).some((x) => /^(just|already|never|ever|recently|finally|not)$/.test(x.norm)) || DETS.has(P[nextIdx(i) + 1]?.norm ?? '') || SUBJ_PRONOUNS.has(P[nextIdx(i) + 1]?.norm ?? '') || /^(me|him|them|us)$/.test(P[nextIdx(i) + 1]?.norm ?? ''))) pc.norm = 'has';
      else if (ADJ_PART.has(nx)) pc.norm = 'is';
      else if (f.part && !f.base) pc.norm = 'has';
      else if (/^(he|she|it|there|that|what|who|where|how|here|this|everything|nothing|everyone|someone|somebody|everybody|nobody|why|when)$/.test(prev)) pc.norm = 'is';
      else if (/^(a|an|the|very|so|too|not|really|in|at|on|from|here|there|my|your|his|her|our|their|always|never|still|quite|such|just|also|over|out|ready|late|good|bad|great|nice|happy|right|wrong)$/.test(nx)) pc.norm = 'is';
      else pc.norm = "'s";
    } else if (pc.norm === "'d") {
      const nx = nextContent(i);
      const f = forms(nx);
      if (nx === 'been' || nx === 'better' || nx === 'had') pc.norm = 'had';
      else if (['rather', 'like', 'love', 'prefer', 'be', 'have'].includes(nx)) pc.norm = 'would';
      else if (f.part && !f.base) pc.norm = 'had';
      else pc.norm = 'would';
    }
  });

  // ---- time expressions ----------------------------------------------------
  const W = words();
  let joined = '';
  const charToWord: number[] = [];
  W.forEach((w, k) => {
    if (k) {
      joined += ' ';
      charToWord.push(-1);
    }
    for (let c = 0; c < w.p.norm.length; c++) charToWord.push(k);
    joined += w.p.norm;
  });
  const times: TimeExpr[] = [];
  for (const [re, make, needsNoVerb] of TIME_RULES) {
    re.lastIndex = 0;
    for (const m of joined.matchAll(re)) {
      if (!m[0]) continue;
      const a = charToWord[m.index!]!;
      const b = charToWord[m.index! + m[0].length - 1]!;
      if (a < 0 || b < 0) continue;
      let busy = false;
      for (let k = a; k <= b; k++) if (W[k]!.p.timeId !== undefined || W[k]!.p.hidden) busy = true;
      if (busy) continue;
      if (needsNoVerb) {
        const nx = W[b + 1]?.p.norm;
        if (nx) {
          const f = forms(nx);
          if (f.past || f.third || BE_FIN.has(nx) || HAVE_FIN.has(nx) || MODALS.has(nx)) continue;
        }
      }
      // A wh-question's "when"/"how long" is not a clause opener
      const info = make(m);
      const id = times.length;
      const from = W[a]!.i;
      const to = W[b]!.i + 1;
      times.push({ id, text: text.slice(P[from]!.start, P[to - 1]!.end), kind: info.kind, pos: info.pos, from, to, clause: 0, err: info.err });
      for (let k = a; k <= b; k++) {
        W[k]!.p.timeId = id;
        W[k]!.p.role = 'time';
      }
    }
  }

  // ---- clause segmentation -------------------------------------------------
  interface Seg {
    conn: string | null;
    connIdx: number[];
    idx: number[];
  }
  const segs: Seg[] = [{ conn: null, connIdx: [], idx: [] }];
  for (let i = 0; i < P.length; i++) {
    const pc = P[i]!;
    if (pc.punct) {
      if (segs.at(-1)!.idx.length) segs.push({ conn: null, connIdx: [], idx: [] });
      continue;
    }
    // "I think | it will rain": a subject pronoun right after a reporting verb opens a clause
    if (i > 1 && SUBJ_PRONOUNS.has(pc.norm) && FRAME.has(P[i - 1]!.norm) && pc.timeId === undefined && segs.at(-1)!.idx.length) {
      segs.push({ conn: 'that', connIdx: [], idx: [i] });
      continue;
    }
    if (pc.timeId === undefined) {
      const conn = SUB_CONN.find((c) => c.every((w, k) => P[i + k] && !P[i + k]!.punct && P[i + k]!.timeId === undefined && P[i + k]!.norm === w));
      let ok = !!conn;
      if (conn && conn[0] === 'that') {
        const prevW = P[i - 1]?.norm ?? '';
        ok = REPORT.has(prevW) && i > 0;
      }
      // wh-question word at the start ("When did you arrive?")
      if (conn && i === 0 && question && WH.has(pc.norm)) ok = false;
      if (conn && i === 0 && conn[0] === 'that') ok = false;
      if (ok && conn) {
        const cur = segs.at(-1)!;
        const seg: Seg = cur.idx.length || cur.conn ? { conn: conn.join(' '), connIdx: [], idx: [] } : cur;
        if (seg !== cur) segs.push(seg);
        seg.conn = conn.join(' ');
        for (let k = 0; k < conn.length; k++) seg.connIdx.push(i + k);
        i += conn.length - 1;
        continue;
      }
    }
    segs.at(-1)!.idx.push(i);
  }

  // ---- verb group ------------------------------------------------------------
  const isTime = (i: number) => P[i]!.timeId !== undefined;

  function extract(idx: number[], q: boolean): VG | null {
    const vg: VG = { wh: [], subject: [], chain: [], negs: [], inverted: false, errs: [] };
    const N = (k: number) => (k >= 0 && k < idx.length ? P[idx[k]!]!.norm : '');
    let k = 0;
    if (WH.has(N(0))) {
      vg.wh.push(idx[0]!);
      k = 1;
      if (N(0) === 'how' && /^(long|often|much|many|far|old)$/.test(N(1))) {
        vg.wh.push(idx[1]!);
        k = 2;
      }
      if ((/^(what|which|whose)$/.test(N(0)) || /^(many|much)$/.test(N(1))) && N(k) && !AUX_FIRST.has(N(k)) && !forms(N(k)).past && !forms(N(k)).third) {
        vg.wh.push(idx[k]!);
        k++;
      }
    }
    const addErr = (p: number, code: string, right: string, lemma: string) => vg.errs.push({ p, code, right, lemma });

    const pushLex = (p: number, w: string, tag: Tag, e: VerbEntry): Item => {
      const it = { p, norm: w, tag, lemma: e.en };
      vg.chain.push(it);
      return it;
    };

    // First verb word (aux or lexical) at position k.
    const first = (kk: number): number => {
      const w = N(kk);
      const p = idx[kk]!;
      if (AUX_FIRST.has(w)) {
        if (w === 'had' && N(kk + 1) === 'better') {
          vg.chain.push({ p, norm: 'had', tag: 'AUX', lemma: 'have' }, { p: idx[kk + 1]!, norm: 'better', tag: 'AUX', lemma: 'better' });
          return 2;
        }
        vg.chain.push({ p, norm: w, tag: 'AUX', lemma: BE_FIN.has(w) ? 'be' : HAVE_FIN.has(w) ? 'have' : DO_FIN.has(w) ? 'do' : w });
        return 1;
      }
      if ((w === 'used' || w === 'use') && N(kk + 1) === 'to' && forms(N(kk + 2)).base) {
        if (w === 'use') addErr(p, 'useTo', 'usually', 'use');
        vg.chain.push({ p, norm: 'used', tag: 'AUX', lemma: 'use' });
        return 1;
      }
      if (w === 'going' && N(kk + 1) === 'to' && forms(N(kk + 2)).base && !NOUNISH.has(N(kk + 2))) {
        addErr(p, 'missingBe', '', 'go');
        vg.chain.push({ p, norm: 'BEP?', tag: 'AUX', lemma: 'be' });
        vg.chain.push({ p, norm: 'going', tag: 'AUX', lemma: 'go' });
        return 1;
      }
      const f = forms(w);
      if (f.third && !f.base && w !== 'is' && w !== 'has' && w !== 'does') {
        pushLex(p, w, 'THIRD', f.third);
        return 1;
      }
      if (f.past && f.base) {
        if (f.past.en !== w) pushLex(p, w, 'PAST', f.past);
        else pushLex(p, w, 'BASEPAST', f.base);
        return 1;
      }
      if (f.base) {
        pushLex(p, w, 'BASE', f.base);
        return 1;
      }
      if (f.past) {
        pushLex(p, w, 'PAST', f.past);
        return 1;
      }
      if (f.part) {
        addErr(p, 'ppAsPast', pastForm(f.part), f.part.en);
        pushLex(p, w, 'PAST', f.part);
        return 1;
      }
      if (f.ing) {
        addErr(p, 'missingBe', '', f.ing.en);
        vg.chain.push({ p, norm: 'BEP?', tag: 'AUX', lemma: 'be' });
        pushLex(p, w, 'ING', f.ing);
        return 1;
      }
      return 0;
    };

    /** Does word at kk continue the chain after `prev`? Returns words consumed (0 = no) and whether the chain is complete. */
    const cont = (prev: Item, kk: number, dry = false): { n: number; done: boolean } => {
      const w = N(kk);
      const p = idx[kk]!;
      if (!w) return { n: 0, done: true };
      const f = forms(w, true);
      const pn = prev.norm;
      const push = (it: Item) => !dry && vg.chain.push(it);
      const err = (code: string, right: string, lemma: string) => !dry && addErr(p, code, right, lemma);
      const baseLike = MODALS.has(pn) || DO_FIN.has(pn) || pn === 'to' || pn === 'better';
      if (baseLike) {
        if (w === 'be' || w === 'have') {
          push({ p, norm: w, tag: 'AUX', lemma: w });
          return { n: 1, done: false };
        }
        if (w === 'to' && pn !== 'to' && pn !== 'ought' && forms(N(kk + 1)).base) {
          if (MODALS.has(pn) || pn === 'better') {
            err('modalTo', '', '');
            return { n: 1, done: false };
          }
        }
        if (w === 'to' && pn === 'ought') {
          push({ p, norm: 'to', tag: 'AUX', lemma: 'to' });
          return { n: 1, done: false };
        }
        if (DO_FIN.has(pn) && (w === 'use' || w === 'used') && N(kk + 1) === 'to') {
          if (w === 'used') err('didUsed', 'use', 'use');
          push({ p, norm: 'use', tag: 'AUX', lemma: 'use' });
          return { n: 1, done: false };
        }
        if (f.base && !(f.past && f.past.en !== w && !PAST_AS_BASE_OK.has(w) && DO_FIN.has(pn))) {
          push({ p, norm: w, tag: 'BASE', lemma: f.base.en });
          return { n: 1, done: true };
        }
        const e = f.third ?? f.past ?? f.ing ?? f.part;
        if (e && (pn !== 'to' || f.ing || f.past || f.third)) {
          const code = f.third ? 'afterBaseThird' : f.past ? 'afterBasePast' : f.ing ? 'afterBaseIng' : 'afterBasePart';
          err(code, e.en, e.en);
          push({ p, norm: w, tag: 'BASE', lemma: e.en });
          return { n: 1, done: true };
        }
        return { n: 0, done: true };
      }
      if (pn === 'use' || pn === 'used') {
        if (w === 'to') {
          push({ p, norm: 'to', tag: 'AUX', lemma: 'to' });
          return { n: 1, done: false };
        }
        return { n: 0, done: true };
      }
      if (pn === 'going') {
        if (w === 'to') {
          push({ p, norm: 'to', tag: 'AUX', lemma: 'to' });
          return { n: 1, done: false };
        }
        return { n: 0, done: true };
      }
      const beLike = BE_FIN.has(pn) || pn === 'be' || pn === 'been' || pn === 'BEP?';
      if (beLike) {
        if (w === 'going' && N(kk + 1) === 'to' && N(kk + 2) && forms(N(kk + 2)).base && !NOUNISH.has(N(kk + 2))) {
          push({ p, norm: 'going', tag: 'AUX', lemma: 'go' });
          return { n: 1, done: false };
        }
        if (w === 'being' && pn !== 'been' && forms(N(kk + 1)).part) {
          push({ p, norm: 'being', tag: 'AUX', lemma: 'be' });
          return { n: 1, done: false };
        }
        if (f.ing) {
          push({ p, norm: w, tag: 'ING', lemma: f.ing.en });
          return { n: 1, done: true };
        }
        if (f.part && !(f.base && !f.past && f.part.en === w && /^(come|become|overcome)$/.test(w))) {
          push({ p, norm: w, tag: 'PP', lemma: f.part.en });
          return { n: 1, done: true };
        }
        if (f.base && !ADJ_LIKE.has(w) && !f.past && pn !== 'been') {
          err('beBase', '', f.base.en);
          push({ p, norm: w, tag: 'BASE', lemma: f.base.en });
          return { n: 1, done: true };
        }
        return { n: 0, done: true };
      }
      if (pn === 'being') {
        if (f.part) {
          push({ p, norm: w, tag: 'PP', lemma: f.part.en });
          return { n: 1, done: true };
        }
        return { n: 0, done: true };
      }
      if (HAVE_FIN.has(pn) || pn === 'have') {
        const finite = HAVE_FIN.has(pn) && prev === vg.chain[0];
        if (w === 'been') {
          push({ p, norm: 'been', tag: 'AUX', lemma: 'be' });
          return { n: 1, done: false };
        }
        if (w === 'got' || w === 'gotten') {
          push({ p, norm: w, tag: 'PP', lemma: 'get' });
          return { n: 1, done: true };
        }
        if (w === 'to' && forms(N(kk + 1)).base) {
          push({ p, norm: 'to', tag: 'AUX', lemma: 'to' });
          return { n: 1, done: false };
        }
        if (f.part && !(f.base && f.base.en === w && f.part.en !== w)) {
          push({ p, norm: w, tag: 'PP', lemma: f.part.en });
          return { n: 1, done: true };
        }
        if (f.past && f.past.en !== w) {
          err('havePast', partForm(f.past), f.past.en);
          push({ p, norm: w, tag: 'PP', lemma: f.past.en });
          return { n: 1, done: true };
        }
        if (f.base && ((f.base.irregular && !f.base.part.includes(w)) || HAVE_BASE_ERR.has(w)) && (finite || pn === 'have')) {
          const nx = N(kk + 1);
          const nounish = HAVE_BASE_ERR.has(w) && !f.base.irregular && (!nx || /^(to|for|at|in|on|from|today|tomorrow)$/.test(nx));
          if (!nounish && !(pn === 'have' && !finite && !MODALS.has(vg.chain[0]!.norm))) {
            err('haveBase', partForm(f.base), f.base.en);
            push({ p, norm: w, tag: 'PP', lemma: f.base.en });
            return { n: 1, done: true };
          }
        }
        return { n: 0, done: true };
      }
      return { n: 0, done: true };
    };

    const inversionPossible = q && AUX_FIRST.has(N(k));
    if (inversionPossible) {
      const used = first(k);
      k += used;
      vg.inverted = true;
      // subject between the auxiliary and the next verb form
      let guard = 0;
      while (k < idx.length && guard++ < 7) {
        const i = idx[k]!;
        const w = N(k);
        if (isTime(i)) {
          k++;
          continue;
        }
        if (w === 'not') {
          vg.negs.push(i);
          k++;
          continue;
        }
        if (vg.subject.length && !DETS.has(P[vg.subject.at(-1)!]!.norm) && cont(vg.chain.at(-1)!, k, true).n) break;
        if (!vg.subject.length && ADVERBS.has(w)) {
          k++;
          continue;
        }
        vg.subject.push(i);
        k++;
      }
      if (k >= idx.length && vg.subject.length > 1) {
        // "Is your brother working?" → the last word may be the verb we skipped
        const lastK = idx.indexOf(vg.subject.at(-1)!);
        if (cont(vg.chain.at(-1)!, lastK, true).n && !SUBJ_PRONOUNS.has(N(lastK))) {
          vg.subject.pop();
          k = lastK;
        }
      }
    } else {
      // statement: subject words until the first verb word
      while (k < idx.length) {
        const i = idx[k]!;
        const w = N(k);
        if (isTime(i)) {
          k++;
          continue;
        }
        if (AUX_FIRST.has(w)) break;
        const f = forms(w);
        const verbish = !!(f.base || f.third || f.past || f.part || f.ing || ((w === 'used' || w === 'going') && N(k + 1) === 'to'));
        const prev = N(k - 1);
        const prevIsDet = k > 0 && (DETS.has(prev) || PREPS.has(prev)) && !vg.wh.includes(idx[k - 1]!);
        const gerundSubject = !!f.ing && !f.base && (AUX_FIRST.has(N(k + 1)) || !!forms(N(k + 1)).third);
        const nx1 = forms(N(k + 1));
        const nounBeforeVerb = vg.subject.length === 0 && !SUBJ_PRONOUNS.has(w) && !!f.base && !f.third && !!nx1.third && !nx1.base && !q;
        const pluralNoun = vg.subject.length === 0 && /s$/.test(w) && !!f.third && (AUX_FIRST.has(N(k + 1)) || !!forms(N(k + 1)).base || !!forms(N(k + 1)).past);
        if (verbish && !prevIsDet && !nounBeforeVerb && !gerundSubject && !pluralNoun && !ADVERBS.has(w) && !PERSON[w] && !DETS.has(w) && !PREPS.has(w)) break;
        vg.subject.push(i);
        k++;
      }
      if (k < idx.length) k += first(k);
    }
    if (!vg.chain.length) return null;
    // extend the chain
    let guard = 0;
    while (k < idx.length && guard++ < 10) {
      const last = vg.chain.at(-1)!;
      if (last.tag !== 'AUX') break;
      const i = idx[k]!;
      const w = N(k);
      if (isTime(i)) {
        k++;
        continue;
      }
      if (w === 'not') {
        vg.negs.push(i);
        k++;
        continue;
      }
      if (ADVERBS.has(w)) {
        k++;
        continue;
      }
      const r = cont(last, k);
      if (!r.n) break;
      k += r.n;
      if (r.done) break;
    }
    // negation right after the chain's first word in statements
    return vg;
  }

  // Merge segments that have no verb into a neighbour.
  const hasVG = (s: Seg) => {
    const v = extract(s.idx, question);
    return !!v && v.chain.length > 0;
  };
  for (let s = 0; s < segs.length; s++) {
    if (segs.length > 1 && !hasVG(segs[s]!)) {
      const cur = segs[s]!;
      if (s > 0) {
        const prev = segs[s - 1]!;
        prev.idx.push(...cur.connIdx, ...cur.idx);
        prev.idx.sort((a, b) => a - b);
      } else {
        const nx = segs[s + 1]!;
        nx.idx = [...cur.idx, ...nx.connIdx, ...nx.idx].sort((a, b) => a - b);
        nx.connIdx = cur.connIdx;
        nx.conn = cur.conn;
      }
      segs.splice(s, 1);
      s--;
    }
  }

  // ---- classify each clause --------------------------------------------------
  const clauses: Clause[] = [];
  const vgs: (VG | null)[] = [];
  segs.forEach((s, ci) => {
    const isFirstSeg = ci === 0;
    const vg = extract(s.idx, question && (isFirstSeg || !!s.idx.length));
    vgs.push(vg);
    for (const i of [...s.connIdx, ...s.idx]) P[i]!.clause = ci;
    for (const i of s.connIdx) P[i]!.role = 'conn';
    const ctimes = times.filter((t) => s.idx.includes(t.from) || s.connIdx.includes(t.from));
    ctimes.forEach((t) => (t.clause = ci));
    if (!vg) {
      clauses.push({ index: ci, kind: 'presentSimple', passive: false, polarity: 'pos', conn: s.conn, subject: '', lemma: '', times: ctimes, futureRef: false, stative: true, note: 'noverb' });
      return;
    }
    // roles
    for (const i of vg.subject) if (!ADVERBS.has(P[i]!.norm) && P[i]!.role === 'other') P[i]!.role = 'subject';
    for (const i of vg.wh) if (P[i]!.role === 'other') P[i]!.role = vg.subject.length || vg.inverted ? 'other' : 'subject';
    vg.chain.forEach((it, n) => {
      if (it.norm === 'BEP?') return;
      P[it.p]!.role = n === vg.chain.length - 1 ? 'verb' : 'aux';
    });
    for (const i of vg.negs) P[i]!.role = 'neg';
    s.idx.forEach((i) => {
      if (P[i]!.norm === 'not' && P[i]!.role === 'other') P[i]!.role = 'neg';
    });

    const c = classify(vg, ctimes);
    clauses.push({
      index: ci,
      kind: c.kind,
      passive: c.passive,
      polarity: question && (vg.inverted || vg.wh.length) ? 'q' : vg.negs.length || s.idx.some((i) => P[i]!.norm === 'not') ? 'neg' : 'pos',
      conn: s.conn,
      subject: vg.subject.map((i) => P[i]!.surface).join(' ') || vg.wh.map((i) => P[i]!.surface).join(' '),
      lemma: vg.chain.at(-1)!.lemma,
      times: ctimes,
      futureRef: false,
      stative: STATIVE.has(vg.chain.at(-1)!.lemma),
      note: c.note,
    });
  });

  function personOf(vg: VG): Person | 'there' | null {
    const ws = vg.subject.map((i) => P[i]!.norm).filter((w) => !ADVERBS.has(w));
    if (!ws.length) return null;
    if (ws.includes('and')) return 'pl';
    if (ws.length === 1 && ws[0] === 'there') return 'there';
    if (ws.length === 1 && PERSON[ws[0]!]) return PERSON[ws[0]!]!;
    const last = ws.at(-1)!;
    if (PERSON[last] && ws.length <= 2 && (last === 'people' || last === 'children')) return 'pl';
    if (ws.length === 2 && /^(my|your|his|her|our|their|the)$/.test(ws[0]!) && /^(mother|father|mom|dad|brother|sister|friend|teacher|boss|son|daughter|husband|wife|grandma|grandmother|grandfather|dog|cat)$/.test(last)) return '3s';
    return null;
  }

  function classify(vg: VG, ctimes: TimeExpr[]): { kind: ClauseKind; passive: boolean; note?: string } {
    const ch = vg.chain;
    const sig = ch
      .map((it, n) => {
        if (it.tag !== 'AUX') return it.tag;
        const w = it.norm;
        if (n === 0 || (n === 1 && ch[0]!.norm === 'BEP?')) {
          if (w === 'BEP?') return 'BEP';
          if (w === 'am' || w === 'is' || w === 'are') return 'BEP';
          if (w === 'was' || w === 'were') return 'BEX';
          if (w === 'have' || w === 'has') return 'HAVP';
          if (w === 'had') return 'HADX';
          if (w === 'do' || w === 'does') return 'DOP';
          if (w === 'did') return 'DIDX';
          if (w === 'will' || w === 'shall') return 'WILL';
          if (w === 'would') return 'WOULD';
          if (w === 'used') return 'USED';
          if (MODALS.has(w)) return 'MOD';
          if (w === 'going' && n === 1) return 'going';
        }
        return w;
      })
      .join(' ');
    const last = ch.at(-1)!;
    const adjectival = /^(BEP|BEX) PP$/.test(sig) && ADJ_PART.has(last.norm) && !P.some((p) => p.norm === 'by');
    const pas = (k: ClauseKind) => ({ kind: k, passive: !adjectival });
    const hasPastTime = ctimes.some((t) => (t.pos ?? 0) < 0 && t.kind !== 'since') || times.some((t) => t.kind === 'period');
    const T: [RegExp, () => { kind: ClauseKind; passive: boolean; note?: string }][] = [
      [/^WILL have been ING$/, () => ({ kind: 'futurePerfectContinuous', passive: false })],
      [/^WILL have been PP$/, () => pas('futurePerfect')],
      [/^WILL have (PP|been)$/, () => ({ kind: 'futurePerfect', passive: false })],
      [/^WILL be ING$/, () => ({ kind: 'futureContinuous', passive: false })],
      [/^WILL be PP$/, () => pas('futureSimple')],
      [/^WILL( (BASE|be|have))?$/, () => ({ kind: 'futureSimple', passive: false })],
      [/^(BEP|BEX) going to be PP$/, () => pas('goingTo')],
      [/^BEX going to/, () => ({ kind: 'goingTo', passive: false, note: 'wasGoingTo' })],
      [/^BEP going to/, () => ({ kind: 'goingTo', passive: false })],
      [/^(USED|DIDX use|DOP use) to be PP$/, () => pas('usedTo')],
      [/^(USED|DIDX use|DOP use) to/, () => ({ kind: 'usedTo', passive: false })],
      [/^HAVP been ING$/, () => ({ kind: 'presentPerfectContinuous', passive: false })],
      [/^HAVP been PP$/, () => pas('presentPerfect')],
      [/^HAVP PP$/, () => (last.norm === 'got' && !ctimes.length ? { kind: 'presentSimple', passive: false, note: 'haveGot' } : { kind: 'presentPerfect', passive: false })],
      [/^HAVP (PP|been)$/, () => ({ kind: 'presentPerfect', passive: false })],
      [/^HAVP to/, () => ({ kind: 'presentSimple', passive: false, note: 'haveTo' })],
      [/^HAVP$/, () => ({ kind: 'presentSimple', passive: false })],
      [/^HADX been ING$/, () => ({ kind: 'pastPerfectContinuous', passive: false })],
      [/^HADX been PP$/, () => pas('pastPerfect')],
      [/^HADX (PP|been)$/, () => ({ kind: 'pastPerfect', passive: false })],
      [/^HADX better/, () => ({ kind: 'modal', passive: false })],
      [/^HADX to/, () => ({ kind: 'pastSimple', passive: false, note: 'haveTo' })],
      [/^HADX$/, () => ({ kind: 'pastSimple', passive: false })],
      [/^BEP being PP$/, () => pas('presentContinuous')],
      [/^BEP ING$/, () => ({ kind: 'presentContinuous', passive: false })],
      [/^BEP PP$/, () => (last.norm === 'used' && P[last.p + 1]?.norm === 'to' ? { kind: 'presentSimple', passive: false, note: 'beUsedTo' } : pas('presentSimple'))],
      [/^BEP BASE$/, () => ({ kind: 'presentSimple', passive: false })],
      [/^BEP$/, () => ({ kind: 'presentSimple', passive: false })],
      [/^BEX being PP$/, () => pas('pastContinuous')],
      [/^BEX ING$/, () => ({ kind: 'pastContinuous', passive: false })],
      [/^BEX PP$/, () => (last.norm === 'used' && P[last.p + 1]?.norm === 'to' ? { kind: 'pastSimple', passive: false, note: 'beUsedTo' } : pas('pastSimple'))],
      [/^BEX/, () => ({ kind: 'pastSimple', passive: false })],
      [/^DOP/, () => ({ kind: 'presentSimple', passive: false })],
      [/^DIDX/, () => ({ kind: 'pastSimple', passive: false })],
      [/^WOULD have/, () => ({ kind: 'modal', passive: false })],
      [/^WOULD/, () => ({ kind: hasPastTime || P.some((p) => p.norm === 'used') ? 'wouldHabit' : 'modal', passive: false })],
      [/^MOD/, () => ({ kind: 'modal', passive: false })],
      [/^(BASE|THIRD)$/, () => ({ kind: 'presentSimple', passive: false })],
      [/^BASEPAST$/, () => ({ kind: 'presentSimple', passive: false, note: 'basePast' })],
      [/^PAST$/, () => ({ kind: 'pastSimple', passive: false })],
      [/^PP$/, () => ({ kind: 'pastSimple', passive: false })],
    ];
    for (const [re, f] of T) if (re.test(sig)) return f();
    return { kind: 'presentSimple', passive: false };
  }

  // "I think / I hope / I'm sure (that) …": keep only the reported clause.
  for (let ci = clauses.length - 2; ci >= 0; ci--) {
    const c = clauses[ci]!;
    const nx = clauses[ci + 1]!;
    const vg = vgs[ci];
    if (nx.conn === 'that' && vg && vg.chain.length <= 2 && (FRAME.has(c.lemma) || FRAME.has(P[vg.chain.at(-1)!.p + 1]?.norm ?? '')) && c.kind === 'presentSimple' && c.polarity !== 'q') {
      for (const pc of P) if (pc.clause === ci && pc.role !== 'time') pc.role = 'other';
      clauses.splice(ci, 1);
      vgs.splice(ci, 1);
    }
  }
  clauses.forEach((c, i) => {
    if (c.index !== i) {
      for (const pc of P) if (pc.clause === c.index) pc.clause = i;
      for (const t of c.times) t.clause = i;
      c.index = i;
    }
  });

  // ---- cross-clause adjustments ---------------------------------------------
  const pastFamily = (k: ClauseKind) => k === 'pastSimple' || k === 'pastContinuous' || k === 'pastPerfect' || k === 'pastPerfectContinuous' || k === 'usedTo' || k === 'wouldHabit';
  const futureFamily = (k: ClauseKind) => k === 'futureSimple' || k === 'futureContinuous' || k === 'futurePerfect' || k === 'futurePerfectContinuous' || k === 'goingTo';
  clauses.forEach((c, ci) => {
    const vg = vgs[ci];
    if (c.note === 'basePast') {
      const per = vg ? personOf(vg) : null;
      const pastCtx = c.times.some((t) => (t.pos ?? 0) < 0) || times.some((t) => (t.pos ?? 0) < 0 && t.kind !== 'since') || clauses.some((o) => o !== c && pastFamily(o.kind)) || per === '3s';
      c.kind = pastCtx ? 'pastSimple' : 'presentSimple';
      c.note = undefined;
    }
    if (vg && !vg.subject.some((i) => !ADVERBS.has(P[i]!.norm)) && !vg.wh.length && !question && (vg.chain[0]!.tag === 'BASE' || vg.chain[0]!.tag === 'BASEPAST') && !c.conn && ci === 0 && !SUBJ_PRONOUNS.has(P[vg.chain[0]!.p - 1]?.norm ?? '')) c.kind = 'imperative';
  });
  clauses.forEach((c) => {
    if (c.kind === 'presentSimple' || c.kind === 'presentContinuous' || c.kind === 'presentPerfect') {
      const fut = c.times.some((t) => (t.pos ?? 0) > 0 && t.kind !== 'by');
      const subFut = !!c.conn && TIME_CONN.has(c.conn) && clauses.some((o) => o !== c && futureFamily(o.kind));
      if ((fut && c.kind !== 'presentPerfect') || subFut) c.futureRef = true;
    }
  });

  // ---- warnings ----------------------------------------------------------------
  const word = (i: number) => P[i]!;
  const seen = new Set<string>();
  const warn = (w: Warning) => {
    if (seen.has(w.msg)) return;
    seen.add(w.msg);
    warnings.push(w);
  };
  clauses.forEach((c, ci) => {
    const vg = vgs[ci];
    if (!vg) return;
    const per = personOf(vg);
    const ch = vg.chain;
    const real = ch.filter((it) => it.norm !== 'BEP?');
    const f0 = real[0];
    // form errors found while reading the chain
    for (const e of vg.errs) {
      const pc = word(e.p);
      const entry = lex.base.get(e.lemma);
      switch (e.code) {
        case 'havePast':
        case 'haveBase':
          warn({ msg: `Después de have/has/had va el participio (3.ª forma): «${e.right}», no «${pc.surface}».`, wrong: pc.surface, right: e.right, fixed: fix(pc.start, pc.end, e.right) });
          break;
        case 'afterBasePast':
        case 'afterBaseThird':
        case 'afterBaseIng':
        case 'afterBasePart': {
          const aux = word(ch[0]!.p).norm;
          const why = DO_FIN.has(aux) ? `Con ${aux === 'did' ? 'did/didn’t' : 'do/does'} el verbo principal va en forma base` : `Después de ${aux} el verbo va en forma base`;
          warn({ msg: `${why}: «${e.lemma}», no «${pc.surface}».`, wrong: pc.surface, right: e.lemma, fixed: fix(pc.start, pc.end, e.lemma) });
          break;
        }
        case 'beBase': {
          const be = word(ch[0]!.p);
          if (STATIVE.has(e.lemma) || e.lemma === 'agree') {
            const v = per === '3s' ? thirdPerson(e.lemma) : e.lemma;
            const cut: [number, number, string] = be.surface.startsWith("'") ? [be.start, be.end, ''] : [be.start, pc.start, ''];
            warn({
              msg: e.lemma === 'agree' || e.lemma === 'disagree' ? `«${e.lemma}» ya es un verbo: se dice «I ${e.lemma}», no «I am ${e.lemma}».` : `No uses am/is/are con «${e.lemma}» en presente simple: «${v}».`,
              wrong: `${be.surface} ${pc.surface}`,
              right: v,
              fixed: fixMany([cut, [pc.start, pc.end, be.surface.startsWith("'") ? ' ' + v : v]]).replace(/\s{2,}/g, ' '),
            });
          } else {
            const ingw = entry ? ingForm(entry) : e.lemma + 'ing';
            const bn = be.norm === 'BEP?' ? 'be' : be.norm;
            warn({ msg: `Después de «${bn}» el verbo necesita -ing (forma continua): «${ingw}». Si querías el ${bn === 'was' || bn === 'were' ? 'pasado simple' : 'presente simple'}, quita «${bn}».`, wrong: pc.surface, right: ingw, fixed: fix(pc.start, pc.end, ingw) });
          }
          break;
        }
        case 'ppAsPast':
          warn({ msg: `«${pc.surface}» es participio y necesita have/has. Para el pasado simple usa «${e.right}».`, wrong: pc.surface, right: e.right, fixed: fix(pc.start, pc.end, e.right) });
          break;
        case 'missingBe': {
          const be = per === '1s' ? 'am' : per === '3s' ? 'is' : 'are';
          warn({ msg: `Falta el verbo be: «${be} ${pc.surface}…». El -ing (y going to) siempre van con am/is/are o was/were.`, fixed: per ? fix(pc.start, pc.start, be + ' ') : undefined });
          break;
        }
        case 'modalTo': {
          const to = word(e.p);
          warn({ msg: `Después de ${word(ch[0]!.p).norm} no va «to»: «${word(ch[0]!.p).surface} ${P[e.p + 1]?.surface ?? ''}».`, fixed: fix(to.start, to.end + 1, '') });
          break;
        }
        case 'didUsed':
          warn({ msg: 'Con did/didn’t se escribe «use to» (sin -d): «didn’t use to», «Did you use to…?».', wrong: pc.surface, right: 'use', fixed: fix(pc.start, pc.end, 'use') });
          break;
        case 'useTo': {
          const to = P[e.p + 1]!;
          warn({ msg: '«I use to…» no existe en presente. Para hábitos de hoy usa «usually» (I usually wake up early); para el pasado, «used to».', wrong: 'use to', right: 'usually', fixed: fix(pc.start, to.end, 'usually') });
          break;
        }
      }
    }
    // agreement
    if (f0 && per && per !== 'there' && !vg.errs.some((e) => e.code === 'missingBe')) {
      const w0 = word(f0.p);
      const n0 = f0.norm;
      const ifWish = P.some((p) => p.norm === 'if' || p.norm === 'wish');
      let right = '';
      if (n0 === 'am' || n0 === 'is' || n0 === 'are') right = per === '1s' ? 'am' : per === '3s' ? 'is' : 'are';
      else if ((n0 === 'was' || n0 === 'were') && !ifWish) right = per === '1s' || per === '3s' ? 'was' : 'were';
      else if ((n0 === 'have' || n0 === 'has') && f0 === ch[0]) right = per === '3s' ? 'has' : 'have';
      else if (n0 === 'do' || n0 === 'does') right = per === '3s' ? 'does' : 'do';
      else if (f0.tag === 'BASE' && real.length === 1 && per === '3s' && c.kind === 'presentSimple') right = thirdPerson(f0.lemma);
      else if (f0.tag === 'THIRD' && real.length === 1 && per !== '3s') right = f0.lemma;
      const cur = w0.surface.startsWith("'") ? w0.norm : w0.surface.toLowerCase();
      if (right && cur !== right) {
        const subj = vg.subject.map((i) => P[i]!.surface).join(' ');
        const rep = w0.surface.startsWith("'") ? ` ${right}` : right;
        warn({
          msg: f0.tag === 'BASE' ? `Con he/she/it el presente simple lleva -s: «${subj} ${right}».` : f0.tag === 'THIRD' ? `Con «${subj}» el verbo no lleva -s: «${subj} ${right}».` : `Concordancia: con «${subj}» se usa «${right}», no «${w0.surface.replace(/^'/, '')}».`,
          wrong: w0.surface,
          right,
          fixed: fix(w0.start, w0.end, rep).replace(/\s{2,}/g, ' '),
        });
      }
    }
    // wh-question without do/does/did
    if (question && vg.wh.length && !vg.inverted && vg.subject.length && f0 && ['BASE', 'THIRD', 'PAST', 'BASEPAST'].includes(f0.tag) && real.length === 1) {
      const aux = f0.tag === 'PAST' ? 'did' : per === '3s' ? 'does' : 'do';
      const s0 = word(vg.subject[0]!);
      const v0 = word(f0.p);
      const subj = vg.subject.map((i) => P[i]!.surface).join(' ');
      warn({ msg: `A las preguntas con wh- les falta el auxiliar: «${word(vg.wh[0]!).surface} ${aux} ${subj} ${f0.lemma}…?».`, fixed: fix(s0.start, v0.end, `${aux} ${subj} ${f0.lemma}`) });
    }
    // "I have 20 years"
    if (f0 && (f0.norm === 'have' || f0.norm === 'has') && real.length === 1) {
      const i = f0.p;
      if (/^\d+$|^(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen|eighteen|nineteen|twenty|thirty|forty|fifty|sixty)$/.test(P[i + 1]?.norm ?? '') && P[i + 2]?.norm === 'years') {
        const be = per === '1s' ? 'am' : per === '3s' ? 'is' : 'are';
        const hasOld = P[i + 3]?.norm === 'old';
        warn({ msg: `La edad se dice con BE, no con have: «${be} ${P[i + 1]!.surface} (years old)».`, fixed: fix(P[i]!.start, P[i + 2]!.end, `${be} ${P[i + 1]!.surface} years${hasOld ? '' : ' old'}`) });
      }
    }
    // tense ↔ time expression mismatches
    const has = (k: TimeKind) => c.times.find((t) => t.kind === k);
    const finished = c.times.find((t) => ((t.pos ?? 0) < 0 && t.kind !== 'since') || t.kind === 'period');
    if ((c.kind === 'presentPerfect' || c.kind === 'presentPerfectContinuous') && finished && c.polarity !== 'q') {
      const hv = real.find((it) => it.norm === 'have' || it.norm === 'has');
      const v = real.at(-1)!;
      const e = lex.base.get(v.lemma);
      const pastW = e ? (e.en === 'be' ? (per === '1s' || per === '3s' ? 'was' : 'were') : pastForm(e)) : v.norm;
      warn({
        msg: `Con «${finished.text}» (un momento terminado) usa el pasado simple, no el presente perfecto: «${pastW}».`,
        fixed: hv && c.kind === 'presentPerfect' && real.length === 2 ? fix(word(hv.p).surface.startsWith("'") ? word(hv.p).start : word(hv.p).start, word(v.p).end, `${word(hv.p).surface.startsWith("'") ? ' ' : ''}${pastW}`).replace(/\s{2,}/g, ' ') : undefined,
      });
    }
    if ((c.kind === 'presentSimple' || c.kind === 'presentContinuous') && has('since') && !c.futureRef) {
      const v = real.at(-1)!;
      const e = lex.base.get(v.lemma);
      const hv = per === '3s' ? 'has' : 'have';
      const rep = e ? (c.kind === 'presentSimple' ? `${hv} ${e.en === 'be' ? 'been' : partForm(e)}` : `${hv} been ${ingForm(e)}`) : '';
      const a = word(real[0]!.p);
      warn({
        msg: `Con «since» (desde) el inglés usa el presente perfecto${c.kind === 'presentContinuous' ? ' continuo' : ''}, no el presente: «${rep}».`,
        fixed: rep && c.polarity === 'pos' ? fix(a.surface.startsWith("'") ? a.start : a.start, word(v.p).end, `${a.surface.startsWith("'") ? ' ' : ''}${rep}`).replace(/\s{2,}/g, ' ') : undefined,
      });
    }
    for (const t of c.times) {
      if (t.err === 'sinceDuration') {
        const s = word(t.from);
        warn({ msg: `«since» va con el punto de inicio (since 2019, since Monday). Con una duración usa «for»: «for ${text.slice(P[t.from + 1]!.start, P[t.to - 1]!.end)}».`, wrong: 'since', right: 'for', fixed: fix(s.start, s.end, s.surface[0] === 'S' ? 'For' : 'for') });
      }
      if (t.err === 'forYear') {
        const s = word(t.from);
        warn({ msg: `Con un año (punto de inicio) usa «since», no «for»: «since ${P[t.from + 1]!.surface}».`, wrong: 'for', right: 'since', fixed: fix(s.start, s.end, 'since') });
      }
    }
    if (pastFamily(c.kind) && c.times.some((t) => t.kind === 'future')) warn({ msg: `El verbo está en pasado pero «${c.times.find((t) => t.kind === 'future')!.text}» habla del futuro.` });
    if (futureFamily(c.kind) && c.times.some((t) => t.kind === 'past')) warn({ msg: `El verbo está en futuro pero «${c.times.find((t) => t.kind === 'past')!.text}» habla del pasado.` });
    if (c.kind === 'futureSimple' && c.conn && TIME_CONN.has(c.conn) && clauses.length > 1) {
      const prevLemma = ci > 0 ? clauses[ci - 1]!.lemma : '';
      if (!['know', 'wonder', 'ask', 'sure', 'tell', 'be'].includes(prevLemma) || c.conn === 'if') {
        const wl = real[0]!;
        const v = real.at(-1)!;
        const e = lex.base.get(v.lemma);
        const pres = e ? (e.en === 'be' ? (per === '1s' ? 'am' : per === '3s' ? 'is' : 'are') : per === '3s' ? thirdPerson(e.en) : e.en) : v.norm;
        const w0 = word(wl.p);
        warn({
          msg: `Después de «${c.conn}» se usa el presente aunque hables del futuro: «${c.conn} … ${pres}», no «${c.conn} … will ${v.norm}».`,
          fixed: real.length === 2 && c.polarity === 'pos' ? fix(w0.surface.startsWith("'") ? w0.start : w0.start, word(v.p).end, `${w0.surface.startsWith("'") ? ' ' : ''}${pres}`).replace(/\s{2,}/g, ' ') : undefined,
        });
      }
    }
    if (has('yet') && c.polarity === 'pos' && (c.kind === 'presentPerfect' || c.kind === 'pastPerfect')) warn({ msg: '«yet» se usa en negativas y preguntas. En afirmativas usa «already» (I have already finished).' });
    if (c.note === 'beUsedTo') warn({ msg: 'Ojo: «be used to + -ing» significa «estar acostumbrado a». Para hábitos pasados es «used to + verbo» (sin be).' });
  });

  return { text, pieces: P, clauses, times, warnings, question };
}

/** The verb forms for Build mode / the conjugator. */
export function findVerb(lex: Lexicon, en: string) {
  return lex.base.get(en.toLowerCase());
}
