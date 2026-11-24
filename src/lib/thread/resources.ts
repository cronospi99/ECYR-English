/**
 * Generador local (sin IA) de recursos: ensambla desde los datos reales del punto/unidad
 * (ejemplos, diálogos, errores comunes) y bancos pequeños indexados por función y nivel.
 * Todo recurso local marca source:'local'; story/news son "borrador".
 */
import { FN_NEED } from './bridgeData';
import { countHits } from './profiles';
import type { Fn, PlanContext, Resource, ResourceKind, Target } from './types';
import { uid } from './types';
import { ITEM_RANGE, LEVEL_IDX, SENT_RANGE, WORD_RANGE, hitText, wordCount } from './validate';

export const KIND_LABEL: Record<ResourceKind, string> = {
  examples: 'Frases modelo', story: 'Historia', news: 'Noticia', dialogue: 'Diálogo', message: 'Mensaje', interview: 'Entrevista', announcement: 'Anuncio',
  comprehension: 'Comprensión', ccq: 'CCQ', exercise: 'Ejercicio', game: 'Juego', roleplay: 'Juego de roles', debate: 'Debate', board: 'Plan de pizarra',
};

const pick = <T,>(a: T[], n: number) => a[((n % a.length) + a.length) % a.length]!;
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const mid = (r: [number, number], f = 0.35) => Math.round(r[0] + (r[1] - r[0]) * f);
const nItems = (kind: ResourceKind, level: number) => {
  const r = ITEM_RANGE[kind]?.[level];
  return r ? r[1] : 4;
};

const FILLERS = ['Everyone is listening.', 'It is a busy day.', 'They talk for a few minutes.', 'The problem is not easy.', 'Nobody is in a hurry.', 'Then the room goes quiet.'];
const VERBS = ['says', 'answers', 'asks', 'explains'];
const examplesOf = (t: Target) => (t.examples.length ? t.examples : [`${cap(t.terms[0] ?? t.label)}.`]);
const timeOf = (ts: Target[]) => ts[0]?.profile.time ?? 'any';
const fnOf = (ts: Target[]): Fn => ts[0]?.profile.fns[0] ?? 'describe';

/** Frases de varios targets, una de cada en turnos. */
function pool(ts: Target[]): string[] {
  const lists = ts.map(examplesOf);
  const out: string[] = [];
  const max = Math.max(...lists.map((l) => l.length));
  for (let i = 0; i < max; i++) for (const l of lists) if (l[i]) out.push(l[i]!);
  return out;
}

function reading(ctx: PlanContext, ts: Target[], minWords: number, intro: string, v: number): string {
  const [a, b, c] = ctx.names;
  const who = [a, b, c];
  const own = pool(ts);
  const extra = ts.flatMap((t) => [...t.dialogue.map((d) => d.line), ...(t.unit?.vocab ?? []).flatMap((v) => v.examples ?? [])]).filter((x) => x && !own.includes(x));
  const ex = [...own, ...extra.filter((x) => x.split(/\s+/).length <= 24)];
  const lines = [intro];
  let words = wordCount(intro);
  for (let i = 0; i < 80 && words < minWords; i++) {
    const s = `${who[(i + v) % 2]} ${pick(VERBS, i + v)}: "${ex[i % ex.length]}"`;
    lines.push(s);
    words += wordCount(s);
    if (i % 2 === 1 && words < minWords) {
      const f = pick(FILLERS, i + v);
      lines.push(f);
      words += wordCount(f);
    }
  }
  const paras: string[] = [];
  for (let i = 0; i < lines.length; i += 3) paras.push(lines.slice(i, i + 3).join(' '));
  return paras.join('\n');
}

// -------------------------------------------------------------------- CCQ --

function ccqItems(ctx: PlanContext, ts: Target[], n: number, v: number) {
  const t = ts[0]!;
  const ex = pick(examplesOf(t), v);
  const time = timeOf(ts);
  const fn = fnOf(ts);
  const [a] = ctx.names;
  const items: { point: string; q: string; answer: string }[] = [];
  if (time === 'past') {
    items.push({ point: 'time', q: `Is "${ex}" about the past, the present or the future?`, answer: 'The past.' });
    items.push({ point: 'meaning', q: `Can ${a} say this about tomorrow?`, answer: 'No. It is about something before now.' });
  } else if (time === 'future') {
    items.push({ point: 'time', q: `Is "${ex}" about the past, the present or the future?`, answer: 'The future.' });
    items.push({ point: 'meaning', q: `Has it happened already?`, answer: 'No. It has not happened yet.' });
  } else if (time === 'present') {
    items.push({ point: 'time', q: `Is "${ex}" about the past, the present or the future?`, answer: 'The present (now or in general).' });
    items.push({ point: 'meaning', q: `Is it about something that is finished?`, answer: 'No.' });
  } else {
    items.push({ point: 'meaning', q: `Does "${ex}" give a fact, a rule, an opinion or a plan?`, answer: 'Accept any reasonable answer; ask the student to explain it.' });
    items.push({ point: 'meaning', q: `Who is speaking in "${ex}": ${a} or the teacher?`, answer: `${a}, in this story.` });
  }
  items.push({ point: 'use', q: `In ${ctx.bridge.setting}, why does ${a} say "${ex}"?`, answer: `To ${FN_NEED[fn]}.` });
  items.push({ point: 'form', q: `Which words in "${ex}" are the grammar we are learning?`, answer: `The words that match: ${t.label}. Ask the student to underline them.` });
  items.push({ point: 'form', q: `Can you say a new sentence like "${ex}" about ${ctx.bridge.roles[0] ?? 'someone'}?`, answer: 'Any sentence with the same form.' });
  return items.slice(0, n);
}

// --------------------------------------------------------------- exercises --

const shuffle = <T,>(a: T[], seed: number) => a.map((x, i) => ({ x, k: Math.sin(seed * 97 + i * 13.7) })).sort((p, q) => p.k - q.k).map((o) => o.x);

function exerciseItems(ts: Target[], type: string, n: number, v: number) {
  const t = ts[0]!;
  const ex = [...pool(ts), ...(t.unit?.vocab ?? []).flatMap((x) => x.examples ?? [])].filter((s, i, arr) => arr.indexOf(s) === i);
  const items: { prompt: string; answer: string; distractors?: string[] }[] = [];
  if (type === 'transform') {
    const fixes = t.fix.map((f) => ({ prompt: `Correct the sentence: ${f.wrong}`, answer: f.right }));
    for (const f of fixes) items.push(f);
    const drills = t.drill.map((d) => ({ prompt: `${t.drillPrompt ? '' : 'Write a sentence: '}${d}`, answer: ex[items.length % ex.length]! }));
    for (const d of drills) if (items.length < n) items.push(d);
  } else if (type === 'order') {
    for (const s of ex) {
      const w = s.replace(/[.!?]+$/, '').split(/\s+/);
      if (w.length > 3 && w.length < 14) items.push({ prompt: shuffle(w, v + items.length).join(' / '), answer: s });
    }
  } else if (type === 'matching') {
    for (const x of t.unit?.vocab ?? []) items.push({ prompt: x.term, answer: x.def });
  } else {
    const answers: string[] = [];
    const rows: { s: string; ans: string }[] = [];
    for (const s of ex) {
      const re = t.matcher ? new RegExp(t.matcher.source, t.matcher.flags.replace('g', '')) : null;
      const m = re ? s.match(re) : null;
      let ans = m?.[0] ?? '';
      let at = m ? s.indexOf(m[0]) : -1;
      if (!ans || ans.length > 22) {
        const ws = s.replace(/[.!?]+$/, '').split(/\s+/);
        ans = ws[Math.min(1, ws.length - 1)] ?? s;
        at = s.indexOf(ans);
      }
      if (at < 0) continue;
      rows.push({ s: s.slice(0, at) + '____' + s.slice(at + ans.length), ans });
      answers.push(ans);
    }
    for (const [i, r] of rows.entries()) {
      const others = [...new Set(answers.filter((x) => x.toLowerCase() !== r.ans.toLowerCase()))];
      items.push({ prompt: r.s, answer: r.ans, distractors: shuffle(others, i + v).slice(0, 2) });
    }
  }
  const out = items.slice(0, n);
  // Si faltan, se repite el banco con otras frases
  for (let i = 0; out.length < n && items.length; i++) out.push(items[i % items.length]!);
  return out;
}

// -------------------------------------------------------------------- games --

function gameContent(ctx: PlanContext, ts: Target[], v: number, use: 'opener' | 'closer' | 'any') {
  const t = ts[0]!;
  const [a, b] = ctx.names;
  const setting = ctx.bridge.setting;
  const role = ctx.bridge.roles[0] ?? 'someone';
  if (use === 'closer') {
    return {
      name: '3-2-1 exit ticket',
      mode: 'solo, then pairs',
      minutes: 4,
      materials: ['paper or notebook'],
      steps: [`Write 3 words from today about ${setting}.`, `Write 2 sentences with: ${t.label}.`, `Write 1 question for ${role}.`, 'Swap with a partner and correct one sentence.'],
      targetLanguage: t.label,
    };
  }
  if (use === 'opener') {
    return {
      name: `Previously, in ${setting}`,
      mode: 'pairs',
      minutes: 4,
      materials: ['board'],
      steps: [`Write "${setting}" on the board: what do the students know about it?`, `In pairs, they imagine what ${a} and ${b} are doing there.`, 'Two pairs share their ideas; note 3 key words.'],
      targetLanguage: ctx.targets.map((x) => x.label).join(' + '),
    };
  }
  const bank = [
    { name: 'Sentence relay', mode: 'teams', steps: [`Teams stand in lines. Each student adds one sentence with: ${t.label}.`, `The topic is ${setting}.`, 'A point for each correct sentence.'], materials: ['board', 'marker'] },
    { name: 'Spot the mistake', mode: 'whole class', steps: ['Write 5 sentences on the board, 2 with a mistake.', 'Students vote: correct or not?', 'They fix the wrong ones.'], materials: ['board'] },
    { name: `Two truths and a lie: ${role}`, mode: 'groups', steps: [`Each student writes 3 sentences about ${role}, using: ${t.label}.`, 'One sentence is false.', 'The group guesses which one.'], materials: ['paper'] },
    { name: 'Mime and guess', mode: 'groups', steps: ['A student mimes one action from the story.', `The group says a sentence with: ${t.label}.`, 'Change the student after each turn.'], materials: ['cards'] },
    { name: 'Chain story', mode: 'whole class', steps: [`Start: "${a} is in ${setting}."`, `Each student adds one sentence with: ${t.label}.`, 'After 8 sentences, read the story aloud.'], materials: [] },
    { name: 'Beat the clock', mode: 'pairs', steps: [`Pairs have 2 minutes to write as many sentences as possible with: ${t.label}.`, 'Counting: one point for each correct sentence.', 'Read the best one.'], materials: ['paper', 'timer'] },
  ];
  const g = pick(bank, v);
  return { ...g, minutes: 6, targetLanguage: t.label };
}

// ---------------------------------------------------------------- production --

const DEBATE: ((c: PlanContext, t: Target) => string)[] = [
  (c) => `Is ${c.bridge.roles[0] ?? 'the leader'} making a good decision in ${c.bridge.setting}? Why?`,
  (c) => `What would you do in ${c.bridge.setting}? Why?`,
  (c) => `Who has the hardest job in ${c.bridge.setting}?`,
  (_c, t) => `Which sentence is more useful here: "${t.examples[0] ?? t.label}" or another one? Why?`,
  (c) => `Is the main problem in ${c.bridge.setting} easy or difficult to solve?`,
  (c) => `What would you change in ${c.bridge.setting}?`,
];

function roleplayCards(ctx: PlanContext, ts: Target[], n: number) {
  const t = ts[0]!;
  const fn = fnOf(ts);
  const roles = ctx.bridge.roles;
  const useful = (k: number) => examplesOf(t).slice(k, k + 2).map((s) => s.replace(/[.!?]+$/, ''));
  return Array.from({ length: n }, (_, i) => ({
    role: roles[i % roles.length]!,
    situation: `You are in ${ctx.bridge.setting}. ${ctx.bridge.conflict}`,
    goal: `${i % 2 ? 'Listen and ask questions' : cap(FN_NEED[fn])}, and use: ${t.label}.`,
    usefulLanguage: useful(i),
  }));
}

export function boardSections(ctx: PlanContext, ts: Target[]) {
  const t = ts[0]!;
  return [
    { title: 'Context', lines: [ctx.bridge.title, ctx.bridge.setting, `Roles: ${ctx.bridge.roles.join(' · ')}`] },
    { title: 'Target language', lines: [t.label, ...t.form.slice(0, 3)] },
    { title: 'Model sentences', lines: examplesOf(t).slice(0, 4) },
    { title: 'Useful words', lines: t.terms.slice(0, 6) },
  ];
}

// ------------------------------------------------------------------ main -----

export interface LocalOpts {
  variant?: number;
  use?: 'opener' | 'closer';
  exerciseType?: 'gapfill' | 'matching' | 'transform' | 'order';
}

export function localContent(kind: ResourceKind, ctx: PlanContext, ts: Target[], o: LocalOpts = {}): { title: string; content: Record<string, unknown> } {
  const li = LEVEL_IDX[ctx.level];
  const v = ctx.seed + (o.variant ?? 0);
  const [a, b, c] = ctx.names;
  const t = ts[0]!;
  const setting = ctx.bridge.setting;
  const wr = WORD_RANGE[kind]?.[li];
  const tw = wr ? mid(wr) : 0;
  const label = ts.map((x) => x.label).join(' + ');
  switch (kind) {
    case 'story': {
      const text = reading(ctx, ts, tw, `${a} and ${b} are in ${setting}. ${ctx.bridge.conflict}`, v);
      return { title: `Story · ${t.label}`, content: { text, characters: ctx.bridge.characters } };
    }
    case 'news': {
      const headline = `Trouble in ${setting}`;
      const lede = `${ctx.bridge.conflict} ${a} and ${b} tell us what happened.`;
      const quoteText = examplesOf(t)[v % examplesOf(t).length]!;
      const body = reading(ctx, ts, Math.max(10, tw - wordCount(headline + lede + quoteText)), `Reporters talked to people in ${setting}.`, v);
      return { title: `News · ${t.label}`, content: { headline, lede, body, quote: { speaker: c, text: quoteText }, fictionalNote: 'Fictional story written for class practice.' } };
    }
    case 'message': {
      const chat = li <= 1;
      const text = `${chat ? '' : `Hi ${b},\n`}${reading(ctx, ts, tw - 6, `It is ${a}. I am writing about ${setting}.`, v)}\n${chat ? 'Bye!' : `Best wishes,\n${a}`}`;
      return { title: `Message · ${t.label}`, content: { format: chat ? 'chat' : 'email', subject: `About ${setting}`, text } };
    }
    case 'announcement': {
      const text = reading(ctx, ts, tw, `Attention, please! News from ${setting}.`, v);
      return { title: `Announcement · ${t.label}`, content: { title: `Attention: ${ctx.bridge.title}`, text } };
    }
    case 'dialogue': {
      const n = nItems('dialogue', li);
      const ex = pool(ts);
      const lines: { sp: string; line: string }[] = [];
      const base = ts.flatMap((x) => x.dialogue);
      for (const d of base) if (lines.length < n && d.line) lines.push({ sp: d.sp === 'B' ? b : a, line: d.line });
      for (let i = 0; lines.length < n; i++) lines.push({ sp: i % 2 ? b : a, line: ex[(i + v) % ex.length]! });
      return { title: `Dialogue · ${t.label}`, content: { lines } };
    }
    case 'interview': {
      const n = nItems('interview', li);
      const time = timeOf(ts);
      const Q: Record<string, string[]> = {
        past: ['What happened in {s}?', 'What did you do first?', 'Who helped you?', 'How did you feel?', 'What went wrong?', 'What did you learn?'],
        present: ['What is happening in {s} now?', 'What do you usually do there?', 'Who do you work with?', 'What is the main problem?', 'What do you like most?', 'What do you want to change?'],
        future: ['What are you going to do next in {s}?', 'What will happen tomorrow?', 'Who will help you?', 'What is your plan?', 'What might go wrong?', 'What do you hope for?'],
        any: ['Can you tell us about {s}?', 'What is the most important thing?', 'What do you think about it?', 'What would you say to a friend?', 'What is difficult?', 'What is easy?'],
      };
      const q = Q[time]!;
      const ex = pool(ts);
      return { title: `Interview · ${t.label}`, content: { intro: `${a} is talking to ${b} about ${setting}.`, qa: Array.from({ length: n }, (_, i) => ({ q: q[i % q.length]!.replace('{s}', setting), a: ex[(i + v) % ex.length]! })) } };
    }
    case 'examples': {
      const n = nItems('examples', li);
      const sr = SENT_RANGE[li]!;
      const all = pool(ts);
      const fit = all.filter((s) => wordCount(s) >= sr[0] && wordCount(s) <= sr[1]);
      const rest = all.filter((s) => !fit.includes(s));
      const src = [...fit, ...rest];
      const sentences = Array.from({ length: n }, (_, i) => src[i % src.length]!).sort((x, y) => wordCount(x) - wordCount(y));
      return { title: `Examples · ${label}`, content: { sentences } };
    }
    case 'comprehension': {
      const n = nItems('comprehension', li);
      const ex = examplesOf(t);
      const qs = [
        { q: `Where are ${a} and ${b}?`, answer: `In ${setting}.`, type: 'literal' },
        { q: 'What is the problem?', answer: ctx.bridge.conflict, type: 'literal' },
        { q: `Who says: "${ex[0]}"?`, answer: `${a}, ${b} or ${c}: check the text.`, type: 'literal' },
        { q: `Why does ${a} say that?`, answer: `To ${FN_NEED[fnOf(ts)]}.`, type: 'inference' },
        { q: `What do you think will happen to ${ctx.bridge.roles[0] ?? 'the group'}?`, answer: 'Accept any reasonable answer.', type: 'opinion' },
        { q: `Would you like to be in ${setting}? Why?`, answer: 'Accept any reasonable answer.', type: 'opinion' },
      ];
      return { title: 'Comprehension questions', content: { questions: qs.slice(0, n) } };
    }
    case 'ccq':
      return { title: `CCQ · ${t.label}`, content: { items: ccqItems(ctx, ts, nItems('ccq', li), v) } };
    case 'exercise': {
      const type = o.exerciseType ?? 'gapfill';
      const instructions = type === 'gapfill' ? 'Complete the sentences.' : type === 'order' ? 'Put the words in order.' : type === 'matching' ? 'Match the word with its meaning.' : 'Correct or change the sentences.';
      return { title: `Exercise · ${t.label}`, content: { type, instructions, items: exerciseItems(ts, type, nItems('exercise', li), v) } };
    }
    case 'game':
      return { title: `Game · ${t.label}`, content: gameContent(ctx, ts, v, o.use ?? 'any') };
    case 'roleplay':
      return { title: `Role-play · ${t.label}`, content: { cards: roleplayCards(ctx, ts, nItems('roleplay', li)) } };
    case 'debate': {
      const n = nItems('debate', li);
      return { title: `Debate · ${t.label}`, content: { questions: Array.from({ length: n }, (_, i) => DEBATE[(i + v) % DEBATE.length]!(ctx, t)), stance: 'pro/contra' } };
    }
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
    id: uid('r'),
    kind,
    title,
    content,
    targets: use.map((t) => ({ anchorId: t.anchorId, hits: countHits(text, t) })),
    source: 'local',
    locked: false,
    edited: false,
  };
}
