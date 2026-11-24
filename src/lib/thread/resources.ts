/**
 * Generador local (sin IA) de recursos: ensambla desde los datos reales del punto/unidad
 * (frases modelo limpias, diálogos, errores comunes) y bancos pequeños indexados por función y nivel.
 * Todo recurso local marca source:'local'. Son BORRADORES: la IA los redacta mejor.
 */
import { motionOf, resolutionOf, theOf, whereOf } from './bridgeData';
import { ccqBank } from './ccq';
import { countHits, domainsOf, modelSentence } from './profiles';
import type { Fn, PlanContext, Resource, ResourceKind, Target } from './types';
import { uid } from './types';
import { ITEM_RANGE, LEVEL_IDX, SENT_RANGE, WORD_RANGE, hitText, wordCount } from './validate';

export const KIND_LABEL: Record<ResourceKind, string> = {
  examples: 'Frases modelo', story: 'Historia', news: 'Noticia', dialogue: 'Diálogo', message: 'Mensaje', interview: 'Entrevista', announcement: 'Anuncio',
  comprehension: 'Comprensión', ccq: 'CCQ', exercise: 'Ejercicio', game: 'Juego', roleplay: 'Juego de roles', debate: 'Debate', board: 'Plan de pizarra',
};

/** Tipos que, hechos en local, son borradores con frases modelo pegadas (la UI los marca). */
export const DRAFT_KINDS: ResourceKind[] = ['story', 'news', 'message', 'announcement', 'interview', 'comprehension', 'dialogue'];

const pick = <T,>(a: T[], n: number) => a[((n % a.length) + a.length) % a.length]!;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const lowerFirst = (s: string) => (/^I(\s|['’])/.test(s) ? s : s.charAt(0).toLowerCase() + s.slice(1));
const noEnd = (s: string) => s.replace(/[.!?]+$/, '');
const isQ = (s: string) => /\?\s*$/.test(s);
const mid = (r: [number, number], f = 0.35) => Math.round(r[0] + (r[1] - r[0]) * f);
const nItems = (kind: ResourceKind, level: number) => ITEM_RANGE[kind]?.[level]?.[1] ?? 4;
const band = (l: number) => (l <= 1 ? 0 : l <= 3 ? 1 : 2);

const FILLERS = [
  ['It is a busy day.', 'Everyone is listening.', 'They talk for a few minutes.', 'The room is quiet.'],
  ['Nobody wants to waste time.', 'The conversation gets serious.', 'There is not much time left.', 'Everyone has an opinion.'],
  ['The atmosphere is tense.', 'Nobody wants to commit to a position yet.', 'The discussion becomes more heated.', 'Opinions are clearly divided.'],
];
const CONNECT = ['First,', 'Then,', 'Later that day,', 'But then,', 'Soon,', 'After that,'];
const CONNECT_PAST = ['First,', 'Then,', 'Later,', 'Next,', 'After that,'];

const examplesOf = (t: Target) => (t.examples.length ? t.examples : [`${cap(t.terms[0] ?? t.label)}.`]);
const fnOf = (ts: Target[]): Fn => ts[0]?.profile.fns[0] ?? 'describe';

const foreignName = (s: string, names: string[]) => [...s.matchAll(/(?<=[a-z,;:”"’']\s)([A-Z][a-zA-Z]+)/g)].some((m) => !names.includes(m[1]!));

/** Frases de varios targets, una de cada en turnos. */
function pool(ts: Target[]): string[] {
  const lists = ts.map(examplesOf);
  const out: string[] = [];
  const max = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) for (const l of lists) if (l[i]) out.push(l[i]!);
  return out;
}

/** Frases para un texto: las propias del punto primero; luego otras del mismo dominio y sin nombres ajenos. */
function readingPool(ctx: PlanContext, ts: Target[]): string[] {
  const names = [...ctx.names];
  const own = pool(ts);
  const ownOk = own.filter((x) => !foreignName(x, names));
  const base = ownOk.length >= 3 ? ownOk : own;
  const extras = ts
    .flatMap((t) => [...t.dialogue.map((d) => d.line), ...(t.unit?.vocab ?? []).flatMap((v) => (v.examples ?? []).map((e) => modelSentence(e) ?? ''))])
    .filter((x) => x && !base.includes(x) && wordCount(x) <= 24 && !foreignName(x, names));
  const uniq = [...new Set(extras)];
  const inDom = uniq.filter((x) => domainsOf(x).some((d) => ctx.bridge.doms.includes(d)));
  return [...base, ...inDom, ...uniq.filter((x) => !inDom.includes(x))];
}

// ------------------------------------------------------------ historias ----

type Frame = (A: string, B: string, C: string, e: string) => string;
const FRAMES: Partial<Record<Fn, Frame>> = {
  plan: (_A, B, _C, e) => `${B} has an idea: "${e}"`,
  advise: (A, B, _C, e) => `${B} is worried. ${A} says, "${e}"`,
  oblige: (_A, _B, C, e) => `${C} reads the rules aloud: "${e}"`,
  narrate: (A, _B, _C, e) => `${A} remembers what happened: "${e}"`,
  report: (A, B, _C, e) => `${A} tells ${B} what was said: "${e}"`,
  compare: (_A, B, _C, e) => `${B} thinks about the two options: "${e}"`,
  hypothesize: (_A, B, _C, e) => `${B} imagines something different: "${e}"`,
  opinion: (A, _B, _C, e) => `${A} gives an opinion: "${e}"`,
  argue: (A, B, _C, e) => `${A} wants to convince ${B}: "${e}"`,
  persuade: (A, B, _C, e) => `${A} wants to convince ${B}: "${e}"`,
  evaluate: (A, _B, _C, e) => `${A} thinks about how it went: "${e}"`,
  predict: (A, _B, _C, e) => `${A} thinks about the future: "${e}"`,
  experience: (A, _B, _C, e) => `${A} thinks about what has been done: "${e}"`,
  instruct: (A, _B, _C, e) => `${A} explains how to do it: "${e}"`,
  routine: (A, _B, _C, e) => `${A} describes a normal day: "${e}"`,
  permit: (A, _B, _C, e) => `${A} asks for permission: "${e}"`,
  request: (A, B, _C, e) => `${A} needs help. ${B} hears: "${e}"`,
};
const frame = (fn: Fn, A: string, B: string, C: string, e: string) => (isQ(e) ? `${A} asks, "${e}"` : (FRAMES[fn] ?? ((a, _b, _c, x) => `${a} says, "${x}"`))(A, B, C, e));
const REACT = (B: string, A: string, C: string) => [`${B} agrees.`, `${B} is not sure.`, `${C} nods.`, `${A} smiles.`];

function storyText(ctx: PlanContext, ts: Target[], minWords: number, v: number, level: number): string {
  const [A, B, C] = ctx.names;
  const fn = fnOf(ts);
  const seq = readingPool(ctx, ts);
  const paras = [`${A} and ${B} are ${whereOf(ctx.bridge)}. ${ctx.bridge.conflict}`];
  const close = resolutionOf(ctx.bridge);
  let words = wordCount(paras[0]!) + wordCount(close);
  let k = 0;
  for (let p = 0; p < 40 && words < minWords; p++) {
    const e1 = seq[k++ % seq.length]!;
    const e2 = seq.length > 1 ? seq[k++ % seq.length]! : '';
    const subj = ['plan', 'compare', 'hypothesize'].includes(fn) ? B : fn === 'oblige' ? C : A;
    const follow = e2 ? ` ${subj === A ? B : A} ${isQ(e2) ? 'asks' : pick(['replies', 'adds'], p + v)}, "${e2}"` : '';
    const filler = p % 2 ? ` ${pick(FILLERS[band(level)]!, p + v)}` : '';
    const first = p % 3 === 0 ? frame(fn, A, B, C, e1) : `${p % 2 ? B : A} ${isQ(e1) ? 'asks' : 'says'}, "${e1}"`;
    const para = `${pick(CONNECT, p)} ${first}${follow} ${pick(REACT(B, A, C), p + v)}${filler}`;
    paras.push(para);
    words += wordCount(para);
  }
  paras.push(close);
  return paras.join('\n');
}

function newsBody(ctx: PlanContext, ts: Target[], minWords: number, v: number): string {
  const [A, B] = ctx.names;
  const seq = readingPool(ctx, ts);
  const paras = [`Reporters talked to people ${whereOf(ctx.bridge)}.`];
  let words = wordCount(paras[0]!) + 6;
  let k = 0;
  for (let p = 0; p < 40 && words < minWords; p++) {
    const e1 = seq[k++ % seq.length]!;
    const e2 = seq.length > 1 ? seq[k++ % seq.length]! : '';
    const sp = p % 2 ? A : B;
    const conn = pick(CONNECT_PAST, p);
    const para = `${conn} ${sp} ${isQ(e1) ? 'asked' : 'said'}, "${e1}"${e2 ? ` ${p % 2 ? B : A} ${isQ(e2) ? 'asked' : pick(['answered', 'added'], p + v)}, "${e2}"` : ''}`;
    paras.push(para);
    words += wordCount(para);
  }
  paras.push('Reporters will follow the story.');
  return paras.join('\n');
}

/** Mensajes y anuncios: sin atribuir citas, con conectores. */
function plainSeq(ctx: PlanContext, ts: Target[], minWords: number, intro: string, connectors: string[], v: number): string {
  const seq = readingPool(ctx, ts);
  const lines = [intro];
  let words = wordCount(intro);
  for (let i = 0; i < 60 && words < minWords; i++) {
    const e = seq[i % seq.length]!;
    const l = i === 0 ? cap(e) : `${pick(connectors, i + v)} ${lowerFirst(e)}`;
    lines.push(l);
    words += wordCount(l);
  }
  const paras: string[] = [];
  for (let i = 0; i < lines.length; i += 3) paras.push(lines.slice(i, i + 3).join(' '));
  return paras.join('\n');
}

// -------------------------------------------------------------------- CCQ --

function ccqItems(ts: Target[], n: number, v: number) {
  const t = ts[0]!;
  const bank = ccqBank(t.ruleId);
  const ex = examplesOf(t).filter((e) => !isQ(e));
  const src = ex.length ? ex : examplesOf(t);
  return bank.slice(0, n).map(([q, a], i) => ({ point: i === 0 ? 'time/meaning' : 'meaning', q: `"${noEnd(pick(src, v + i))}." ${q}`, answer: a }));
}

// --------------------------------------------------------------- exercises --

const shuffle = <T,>(a: T[], seed: number) => a.map((x, i) => ({ x, k: Math.sin(seed * 97 + i * 13.7) })).sort((p, q) => p.k - q.k).map((o) => o.x);

const AUX: Record<string, string[]> = {
  is: ['are', 'be'], are: ['is', 'be'], was: ['were', 'be'], were: ['was', 'be'], am: ['is', 'be'], has: ['have', 'had'], have: ['has', 'having'], had: ['has', 'have'],
  do: ['does', 'doing'], does: ['do', 'doing'], did: ['do', 'does'], will: ['would', 'is'], would: ['will', 'did'], can: ['could', 'may'], could: ['can', 'must'], must: ['should', 'can'], should: ['must', 'could'],
  to: ['for', 'of'], the: ['a', 'an'], a: ['the', 'an'], an: ['a', 'the'],
};

/** Formas erróneas de la MISMA palabra (go -> goes / going / goed). */
export function wrongForms(answer: string): string[] {
  const a = answer.trim();
  const w = a.toLowerCase();
  const out = new Set<string>();
  if (AUX[w]) AUX[w]!.forEach((x) => out.add(x));
  else if (/ing$/.test(w) && w.length > 5) [w.replace(/ing$/, ''), w.replace(/ing$/, 's'), w.replace(/ing$/, 'ed')].forEach((x) => out.add(x));
  else if (/ed$/.test(w) && w.length > 4) [w.replace(/ed$/, ''), w.replace(/ed$/, 'ing'), w.replace(/ed$/, 's')].forEach((x) => out.add(x));
  else if (/[^s]s$/.test(w)) [w.slice(0, -1), `${w.slice(0, -1)}ing`, `${w.slice(0, -1)}ed`].forEach((x) => out.add(x));
  else [`${w}s`, `${w}ing`, `${w}ed`].forEach((x) => out.add(x));
  return [...out].filter((x) => x && x !== w).map((x) => (a[0] === a[0]!.toUpperCase() && a[0] !== a[0]!.toLowerCase() ? cap(x) : x)).slice(0, 2);
}

function exerciseItems(ts: Target[], type: string, n: number, v: number) {
  const t = ts[0]!;
  const ex = [...pool(ts), ...(t.unit?.vocab ?? []).flatMap((x) => (x.examples ?? []).map((e) => modelSentence(e) ?? ''))].filter((s, i, arr) => s && arr.indexOf(s) === i);
  const items: { prompt: string; answer: string; distractors?: string[] }[] = [];
  if (type === 'transform') {
    for (const f of t.fix) items.push({ prompt: `Correct the sentence: ${f.wrong}`, answer: f.right });
    for (const d of t.drill) items.push({ prompt: `${t.drillPrompt ? '' : 'Write a sentence: '}${d}`, answer: 'Open answer: check the form.' });
  } else if (type === 'order') {
    for (const s of ex) {
      const w = noEnd(s).split(/\s+/);
      if (w.length > 3 && w.length < 14) items.push({ prompt: shuffle(w, v + items.length).join(' / '), answer: s });
    }
  } else if (type === 'matching') {
    for (const x of t.unit?.vocab ?? []) items.push({ prompt: x.term, answer: x.def });
  } else {
    const re = t.matcher ? new RegExp(t.matcher.source, t.matcher.flags.replace('g', '')) : null;
    const seen = new Set<string>();
    for (const s of ex) {
      const m = re ? s.match(re) : null;
      if (!m || !m[0] || m[0].length > 22) continue;
      const ans = m[0];
      const prompt = s.slice(0, m.index) + '____' + s.slice(m.index! + ans.length);
      if (seen.has(prompt)) continue;
      seen.add(prompt);
      items.push({ prompt, answer: ans, distractors: wrongForms(ans) });
    }
  }
  return items.slice(0, n);
}

// -------------------------------------------------------------------- games --

function gameContent(ctx: PlanContext, ts: Target[], v: number, use: 'opener' | 'closer' | 'any') {
  const t = ts[0]!;
  const [a, b] = ctx.names;
  const the = theOf(ctx.bridge);
  const where = whereOf(ctx.bridge);
  const role = ctx.bridge.roles[0] ?? 'someone';
  if (use === 'closer')
    return {
      name: '3-2-1 exit ticket', mode: 'solo, then pairs', minutes: 4, materials: ['paper or notebook'],
      steps: [`Write 3 words from today about ${the}.`, `Write 2 sentences with: ${t.label}.`, `Write 1 question for ${role}.`, 'Swap with a partner and correct one sentence.'],
      targetLanguage: t.label,
    };
  if (use === 'opener')
    return {
      name: `Welcome to ${the}`, mode: 'pairs', minutes: 4, materials: ['board'],
      steps: [`Write "${the}" on the board: what do the students know about it?`, `In pairs, they imagine what ${a} and ${b} are doing ${where}.`, 'Two pairs share their ideas; note 3 key words.'],
      targetLanguage: ctx.targets.map((x) => x.label).join(' + '),
    };
  const bank = [
    { name: 'Sentence relay', mode: 'teams', steps: [`Teams stand in lines. Each student adds one sentence with: ${t.label}.`, `The topic is ${the}.`, 'One point for each correct sentence.'], materials: ['board', 'marker'] },
    { name: 'Spot the mistake', mode: 'whole class', steps: ['Write 5 sentences on the board, 2 with a mistake.', 'Students vote: correct or not?', 'They fix the wrong ones.'], materials: ['board'] },
    { name: `Two truths and a lie: ${role}`, mode: 'groups', steps: [`Each student writes 3 sentences about ${role}, using: ${t.label}.`, 'One sentence is false.', 'The group guesses which one.'], materials: ['paper'] },
    { name: 'Mime and guess', mode: 'groups', steps: ['A student mimes one action from the story.', `The group says a sentence with: ${t.label}.`, 'Change the student after each turn.'], materials: ['cards'] },
    { name: 'Chain story', mode: 'whole class', steps: [`Start: "${a} is ${where}."`, `Each student adds one sentence with: ${t.label}.`, 'After 8 sentences, read the story aloud.'], materials: [] },
    { name: 'Beat the clock', mode: 'pairs', steps: [`Pairs have 2 minutes to write as many sentences as possible with: ${t.label}.`, 'One point for each correct sentence.', 'Read the best one.'], materials: ['paper', 'timer'] },
  ];
  return { ...pick(bank, v), minutes: 6, targetLanguage: t.label };
}

// ---------------------------------------------------------------- producción --

function debateQuestions(ctx: PlanContext, n: number, v: number): string[] {
  const where = whereOf(ctx.bridge);
  const motion = noEnd(lowerFirst(motionOf(ctx.bridge)));
  const bank = [
    `Do you agree that ${motion}? Why (not)?`,
    `What would you do ${where}? Why?`,
    `Who has the hardest job ${where}?`,
    'Is the main problem easy or difficult to solve? Why?',
    `What would you change ${where}?`,
    'Who is right in this situation? Why?',
  ];
  return Array.from({ length: n }, (_, i) => (i === 0 ? bank[0]! : bank[1 + ((i - 1 + v) % (bank.length - 1))]!)).filter((q, i, a) => a.indexOf(q) === i);
}

function roleplayCards(ctx: PlanContext, ts: Target[], n: number) {
  const t = ts[0]!;
  const roles = ctx.bridge.roles;
  const where = whereOf(ctx.bridge);
  const motion = noEnd(lowerFirst(motionOf(ctx.bridge)));
  const useful = (k: number) => examplesOf(t).slice(k, k + 2).map(noEnd);
  const sit = `${cap(where)}. ${ctx.bridge.conflict}`;
  const kinds = [
    (r: string, o: string) => ({ role: r, situation: sit, goal: `Convince ${o} that ${motion}. Try to use: ${t.label}.` }),
    (r: string, _o: string) => ({ role: r, situation: sit, goal: `You are not sure about the idea. Ask three questions before you agree. Try to use: ${t.label}.` }),
    (r: string, _o: string) => ({ role: r, situation: sit, goal: `You are listening. Decide who is right and say why. Try to use: ${t.label}.` }),
  ];
  return Array.from({ length: n }, (_, i) => {
    const k = n > 3 && i === 3 ? 0 : Math.min(i, 2);
    const r = roles[i % roles.length]!;
    const other = roles[(i + 1) % roles.length]!;
    return { ...kinds[k]!(r, other), usefulLanguage: useful(i) };
  });
}

export function boardSections(ctx: PlanContext, ts: Target[]) {
  const t = ts[0]!;
  return [
    { title: 'Context', lines: [ctx.bridge.title, ctx.bridge.setting, `Roles: ${ctx.bridge.roles.join(' · ')}`] },
    { title: 'Target language', lines: [t.label, ...t.form.slice(0, 3), `Underline the words that show ${t.label}.`] },
    { title: 'Model sentences', lines: examplesOf(t).slice(0, 4) },
    { title: 'Useful words', lines: t.terms.slice(0, 6) },
  ];
}

// ---------------------------------------------------------- comprensión ------

/** Preguntas a partir del texto REAL (quién dice qué); no asume la historia local. */
function comprehension(ctx: PlanContext, ts: Target[], n: number, source?: Resource) {
  const [A, B] = ctx.names;
  const text = source && (source.kind === 'story' || source.kind === 'news') ? (source.kind === 'news' ? `${(source.content as Record<string, unknown>).lede ?? ''}\n${(source.content as Record<string, unknown>).body ?? ''}` : String((source.content as Record<string, unknown>).text ?? '')) : '';
  const quotes: { who: string; q: string }[] = [];
  for (const m of text.matchAll(/"([^"]{10,})"/g)) {
    const before = text.slice(Math.max(0, m.index! - 90), m.index!);
    let who = '';
    let at = -1;
    for (const nm of ctx.names) {
      const i = before.lastIndexOf(nm);
      if (i > at) (at = i), (who = nm);
    }
    if (who && !isQ(m[1]!)) quotes.push({ who, q: m[1]! });
  }
  const local = source?.source === 'local' && source.kind === 'story';
  const qs: { q: string; answer: string; type: string }[] = [];
  if (local) qs.push({ q: `Where are ${A} and ${B}?`, answer: `${cap(whereOf(ctx.bridge))}.`, type: 'literal' }, { q: 'What is the problem?', answer: ctx.bridge.conflict, type: 'literal' });
  for (const x of quotes.slice(0, 3)) qs.push({ q: `Who says: "${x.q}"?`, answer: x.who, type: 'literal' });
  qs.push(
    { q: 'What do you think happens next?', answer: 'Accept any reasonable answer.', type: 'opinion' },
    { q: `Do you agree with ${quotes[0]?.who ?? A}? Why (not)?`, answer: 'Accept any reasonable answer.', type: 'opinion' },
    { q: `What would you do ${whereOf(ctx.bridge)}?`, answer: 'Accept any reasonable answer.', type: 'opinion' },
  );
  void ts;
  return qs.slice(0, n);
}

// ------------------------------------------------------------------ main -----

export interface LocalOpts {
  variant?: number;
  use?: 'opener' | 'closer';
  exerciseType?: 'gapfill' | 'matching' | 'transform' | 'order';
  /** Recurso de lectura del que parten las preguntas de comprensión. */
  source?: Resource;
}

export function localContent(kind: ResourceKind, ctx: PlanContext, ts: Target[], o: LocalOpts = {}): { title: string; content: Record<string, unknown> } {
  const li = LEVEL_IDX[ctx.level];
  const v = ctx.seed + (o.variant ?? 0);
  const [a, b, c] = ctx.names;
  const t = ts[0]!;
  const wr = WORD_RANGE[kind]?.[li];
  const tw = wr ? mid(wr) : 0;
  const label = ts.map((x) => x.label).join(' + ');
  const where = whereOf(ctx.bridge);
  switch (kind) {
    case 'story':
      return { title: `Story · ${t.label}`, content: { text: storyText(ctx, ts, tw, v, li), characters: ctx.bridge.characters } };
    case 'news': {
      const headline = `Trouble ${where}`;
      const lede = `${ctx.bridge.conflict} ${a} and ${b} told us more.`;
      const seq = readingPool(ctx, ts);
      const quoteText = seq.find((x) => !isQ(x)) ?? seq[0]!;
      const body = newsBody(ctx, ts, Math.max(10, tw - wordCount(headline + lede + quoteText)), v);
      return { title: `News · ${t.label}`, content: { headline, lede, body, quote: { speaker: c, text: quoteText }, fictionalNote: 'Fictional story written for class practice.' } };
    }
    case 'message': {
      const chat = li <= 1;
      const intro = `I am writing about ${theOf(ctx.bridge)}. ${ctx.bridge.conflict}`;
      const body = plainSeq(ctx, ts, tw - 8, intro, ['Also,', 'By the way,', 'Anyway,'], v);
      const text = `${chat ? `Hi! It’s ${a}.` : `Hi ${b},`}\n${body}\n${chat ? 'Bye!' : `Best wishes,\n${a}`}`;
      return { title: `Message · ${t.label}`, content: { format: chat ? 'chat' : 'email', subject: `About ${theOf(ctx.bridge)}`, text } };
    }
    case 'announcement': {
      const intro = `Attention, please! News ${where}. ${ctx.bridge.conflict}`;
      const text = `${plainSeq(ctx, ts, tw - 3, intro, ['Please note:', 'Also,', 'And remember:'], v)}\nThank you.`;
      return { title: `Announcement · ${t.label}`, content: { title: `Attention: ${ctx.bridge.title}`, text } };
    }
    case 'dialogue': {
      const n = nItems('dialogue', li);
      const ex = readingPool(ctx, ts);
      const lines: { sp: string; line: string }[] = [];
      for (const d of ts.flatMap((x) => x.dialogue)) if (lines.length < n && d.line) lines.push({ sp: d.sp === 'B' ? b : a, line: d.line });
      const REPLY = ['Really?', 'I see.', 'Tell me more.', 'That makes sense.', 'Good idea.', 'Hmm, maybe.'];
      for (let i = 0; lines.length < n; i++) {
        const last = lines[lines.length - 1]?.sp;
        const sp = last === a ? b : a;
        lines.push({ sp, line: i % 2 ? pick(REPLY, i + v) : ex[(i >> 1) % ex.length]! });
      }
      return { title: `Dialogue · ${t.label}`, content: { lines } };
    }
    case 'interview': {
      const n = nItems('interview', li);
      const pairs: { q: string; a: string }[] = [];
      for (const d of ts) for (let i = 0; i + 1 < d.dialogue.length; i++) if (isQ(d.dialogue[i]!.line)) pairs.push({ q: d.dialogue[i]!.line, a: d.dialogue[i + 1]!.line });
      const FOLLOW = ['Can you tell us more?', 'What else can you say?', 'Anything else?', 'And then?', 'Is there something more?', 'Can you add something?'];
      const ex = pool(ts).filter((x) => !isQ(x));
      for (let i = 0; pairs.length < n; i++) pairs.push({ q: FOLLOW[i % FOLLOW.length]!, a: ex[(i + v) % Math.max(1, ex.length)] ?? examplesOf(t)[0]! });
      return { title: `Interview · ${t.label}`, content: { intro: `${a} is talking to ${b} about ${theOf(ctx.bridge)}.`, qa: pairs.slice(0, n) } };
    }
    case 'examples': {
      const n = nItems('examples', li);
      const sr = SENT_RANGE[li]!;
      const all = pool(ts);
      const fit = all.filter((s) => wordCount(s) >= sr[0] && wordCount(s) <= sr[1]);
      const src = [...fit, ...all.filter((s) => !fit.includes(s))];
      const sentences = [...new Set(src)].slice(0, n).sort((x, y) => wordCount(x) - wordCount(y));
      return { title: `Examples · ${label}`, content: { sentences } };
    }
    case 'comprehension':
      return { title: 'Comprehension questions', content: { questions: comprehension(ctx, ts, nItems('comprehension', li), o.source) } };
    case 'ccq':
      return { title: `CCQ · ${t.label}`, content: { items: ccqItems(ts, nItems('ccq', li), v) } };
    case 'exercise': {
      const type = o.exerciseType ?? 'gapfill';
      const instructions = type === 'gapfill' ? 'Complete the sentences.' : type === 'order' ? 'Put the words in order.' : type === 'matching' ? 'Match the word with its meaning.' : 'Correct or change the sentences.';
      return { title: `Exercise · ${t.label}`, content: { type, instructions, items: exerciseItems(ts, type, nItems('exercise', li), v) } };
    }
    case 'game':
      return { title: `Game · ${t.label}`, content: gameContent(ctx, ts, v, o.use ?? 'any') };
    case 'roleplay':
      return { title: `Role-play · ${t.label}`, content: { cards: roleplayCards(ctx, ts, nItems('roleplay', li)) } };
    case 'debate':
      return { title: `Debate · ${t.label}`, content: { questions: debateQuestions(ctx, nItems('debate', li), v), stance: 'pro/contra' } };
    case 'board':
      return { title: `Board plan · ${t.label}`, content: { sections: boardSections(ctx, ts) } };
  }
}

export function localResource(kind: ResourceKind, ctx: PlanContext, anchorId?: string, o: LocalOpts = {}): Resource {
  const ts = anchorId ? ctx.targets.filter((x) => x.anchorId === anchorId) : ctx.targets;
  const use = ts.length ? ts : ctx.targets;
  const { title, content } = localContent(kind, ctx, use, o);
  const text = hitText({ kind, content });
  return {
    id: uid('r'), kind, title, content,
    targets: use.map((t) => ({ anchorId: t.anchorId, hits: countHits(text, t) })),
    source: 'local', locked: false, edited: false,
  };
}

