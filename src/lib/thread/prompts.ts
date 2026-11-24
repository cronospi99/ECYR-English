/**
 * Prompts para Gemini (a través de examAi.generate: solo se reenvía `contents`, así que se exige JSON por prompt)
 * y análisis tolerante de la respuesta.
 */
import type { CefrLevel } from '../../content/types';
import { describeMix } from '../engagement';
import { BRIDGES, theOf, whereOf } from './bridgeData';
import { anchorLabel } from './bridges';
import type { Anchor, Bridge, PlanContext, ResourceKind } from './types';
import { ITEM_RANGE, LEVEL_IDX, SENT_RANGE, WORD_RANGE } from './validate';

export const MAX_SENTENCE: Record<CefrLevel, number> = { A1: 8, A2: 12, B1: 16, B2: 22, C1: 28, C2: 34 };

const SHAPE: Record<ResourceKind, string> = {
  examples: '{"sentences":["graded from simple to complex"],"targetsUsed":[{"anchorId":"","count":0}]}',
  story: '{"title":"","text":"paragraphs separated by \\n, targets in **bold**","characters":[{"name":"","role":""}],"targetsUsed":[{"anchorId":"","count":0}]}',
  news: '{"headline":"","lede":"","body":"paragraphs separated by \\n, targets in **bold**","quote":{"speaker":"","text":""},"fictionalNote":"Fictional story written for class practice.","targetsUsed":[{"anchorId":"","count":0}]}',
  dialogue: '{"lines":[{"sp":"character name","line":"targets in **bold**"}]}',
  message: '{"format":"email|chat|post","subject":"","text":"targets in **bold**"}',
  interview: '{"intro":"","qa":[{"q":"","a":"targets in **bold**"}]}',
  announcement: '{"title":"","text":"targets in **bold**"}',
  comprehension: '{"questions":[{"q":"","answer":"","type":"literal|inference|opinion"}]}',
  ccq: '{"items":[{"point":"meaning|time|form|use","q":"yes/no or short answer, never \\"do you understand?\\"","answer":""}]}',
  exercise: '{"type":"gapfill","instructions":"English, max 15 words","items":[{"prompt":"sentence with ____","answer":"","distractors":[""]}]}',
  game: '{"name":"","mode":"pairs|groups|whole class","minutes":6,"materials":[""],"steps":[""],"targetLanguage":""}',
  roleplay: '{"cards":[{"role":"","situation":"","goal":"","usefulLanguage":[""]}]}',
  debate: '{"questions":[""],"stance":"pro/contra"}',
  board: '{"sections":[{"title":"","lines":[""]}]}',
};

const KIND_EN: Record<ResourceKind, string> = {
  examples: 'a list of graded example sentences', story: 'a short story', news: 'a short news article', dialogue: 'a dialogue between two or three people', message: 'a short message (email, chat or post)',
  interview: 'an interview', announcement: 'a public announcement', comprehension: 'comprehension questions with answers', ccq: 'concept-checking questions (CCQs) with answers',
  exercise: 'a controlled exercise', game: 'a classroom game (max 8 minutes)', roleplay: 'role-play cards', debate: 'debate questions', board: 'a whiteboard plan with at least 3 sections',
};

const EXERCISE_SHAPE: Record<string, string> = {
  gapfill: '{"type":"gapfill","instructions":"English, max 15 words","items":[{"prompt":"sentence with ____ (one gap)","answer":"the missing word(s)","distractors":["wrong form 1","wrong form 2"]}]}',
  matching: '{"type":"matching","instructions":"English, max 15 words","items":[{"prompt":"word or start of a sentence","answer":"its exact match"}]}',
  order: '{"type":"order","instructions":"English, max 15 words","items":[{"prompt":"words / in / scrambled / order","answer":"the correct sentence"}]}',
  transform: '{"type":"transform","instructions":"English, max 15 words","items":[{"prompt":"sentence + instruction (e.g. rewrite in the past)","answer":"the one correct sentence"}]}',
};

export function sizeSpec(kind: ResourceKind, level: CefrLevel): string {
  const i = LEVEL_IDX[level];
  const w = WORD_RANGE[kind]?.[i];
  const n = ITEM_RANGE[kind]?.[i];
  const parts: string[] = [];
  if (w) parts.push(`${w[0]}–${w[1]} words`);
  if (n) parts.push(n[0] === n[1] ? `exactly ${n[0]} items` : `${n[0]}–${n[1]} items`);
  if (kind === 'examples') parts.push(`${SENT_RANGE[i]![0]}–${SENT_RANGE[i]![1]} words per sentence`);
  if (kind === 'game') parts.push('minutes ≤ 8');
  return parts.join(', ');
}

const names = (ctx: PlanContext) => ctx.bridge.characters.map((c) => `${c.name} (${c.role})`).join(', ');

export interface PromptOpts {
  avoid?: string;
  fix?: string[];
  stage?: 'Presentation' | 'Production' | 'Warm-up' | 'Closing';
  exerciseType?: string;
}

export function resourcePrompt(kind: ResourceKind, ctx: PlanContext, anchorId: string | undefined, o: PromptOpts = {}): string {
  const ts = anchorId ? ctx.targets.filter((t) => t.anchorId === anchorId) : ctx.targets;
  const level = ctx.level;
  const li = LEVEL_IDX[level];
  const minHits = li === 0 ? 2 : 3;
  const targets = ts
    .map((t) => `- ${t.kind === 'grammar' ? 'GRAMMAR' : 'VOCABULARY'} "${t.label}" (anchorId ${t.anchorId})${t.form[0] ? `: ${t.form[0]}` : ''}. Model sentences: ${t.examples.slice(0, 2).map((e) => `"${e}"`).join(' / ')}`)
    .join('\n');
  const gloss = [...new Set(ts.flatMap((t) => t.terms))].slice(0, 12).join(', ');
  const noHighlight = kind === 'exercise' || kind === 'ccq' || kind === 'comprehension';
  const shape = kind === 'exercise' ? (EXERCISE_SHAPE[o.exerciseType ?? 'gapfill'] ?? SHAPE.exercise) : SHAPE[kind];
  const rules: string[] = [];
  if (kind === 'story' || kind === 'news')
    rules.push(`ONE continuous ${kind === 'news' ? 'article' : 'story'} (beginning, problem, ending), one paragraph per target, only the given characters${kind === 'news' ? '; "quote.speaker" must be one of them' : ''}; no dates or years.`);
  if (kind === 'ccq') rules.push('Never use the target structure in the question; mostly yes/no questions; the answer must be true for the concept, not only for this story; answers of 1–3 words.');
  if (kind === 'exercise') rules.push('Exactly one correct answer per item; distractors of the same word class (wrong forms of the same word), clearly wrong in context; no duplicate items.');
  return `You are an EFL materials writer for Spanish-speaking students at CEFR ${level} ONLY.
CONTEXT (fixed, do not change): setting "${ctx.bridge.setting}" (say "${whereOf(ctx.bridge)}", then "${theOf(ctx.bridge)}"); characters ${names(ctx)}; conflict "${ctx.bridge.conflict}".
TARGET LANGUAGE (must appear naturally; each at least ${minHits} times):
${targets}
STAGE: ${o.stage ?? 'Presentation'} for "${ts.map(anchorLabel0).join(' + ')}". Group profile: ${describeMix(ctx.mix)}.${ctx.userContext?.trim() ? ` Teacher's own words: "${ctx.userContext.trim()}".` : ''}
RESOURCE: ${kind} — ${KIND_EN[kind]}; size: ${sizeSpec(kind, level)}.${kind === 'exercise' && o.exerciseType ? ` Exercise type: ${o.exerciseType}.` : ''}
LEVEL RULES: use only vocabulary and grammar up to ${level}; allowed exceptions: the target language and these words: ${gloss || 'none'}.
Sentence length ≤ ${MAX_SENTENCE[level]} words.${li <= 2 ? ' No idioms or cultural references that need explanation.' : ''} Natural, current English; no textbook-sounding sentences.${rules.length ? `\n${rules.join(' ')}` : ''}
SAFETY: fictional people only; nothing offensive, political or unsuitable for school students.${kind === 'news' ? ' NEWS ONLY: invent everything; no real people, places in real events, companies, or statistics; set "fictionalNote":"Fictional story written for class practice."' : ''}${noHighlight ? '' : '\nHIGHLIGHT: wrap each occurrence of the target language in **double asterisks**, exactly as it appears.'}${o.avoid ? `\nAVOID repeating this earlier version (make a clearly different one): "${o.avoid.slice(0, 280)}"` : ''}${o.fix?.length ? `\nFix: your previous answer had these problems: ${o.fix.join('; ')}.` : ''}
Return ONLY valid JSON, no markdown, exactly this shape: ${shape}`;
}

const anchorLabel0 = (t: { label: string }) => t.label;

export function bridgePrompt(anchors: Anchor[], level: CefrLevel, ctx: { mix: PlanContext['mix']; userContext?: string }): string {
  const cat = BRIDGES.filter((b) => b.levels.includes(level)).slice(0, 5);
  const as = anchors.map((a) => `- id "${a.id}": ${anchorLabel(a)} (functions: ${a.profile.fns.join(', ')}; domains: ${a.profile.doms.join(', ') || 'any'}; time: ${a.profile.time})`).join('\n');
  return `You design lesson contexts for an English teacher. Students are Spanish speakers at CEFR ${level} ONLY.
ANCHORS (language the class must practise; they come from different lessons and are NOT related):
${as}
Invent 3 different BRIDGE CONTEXTS: a concrete, recognisable social situation where EACH anchor has a real communicative reason to appear. Never explain the relation between anchors; create a scene where each one solves a different need. Order the anchors from most known to newest.
${ctx.userContext?.trim() ? `Teacher's own words: "${ctx.userContext.trim()}". ` : ''}The class: ${describeMix(ctx.mix)}.
Inspiration (you may invent a better one): ${cat.map((b) => `"${b.title}" (${b.setting})`).join('; ')}.
Rules: "setting" is a noun phrase with article ("a school trip to the coast"); "where" is preposition + place ("on the school trip"); "the" is the place with "the" ("the school trip"); "roles" are common nouns with an article ("the organiser", "a classmate"), never proper names; fictional people only; nothing offensive; at A1–B1 no cultural references that need explanation. "rationale" values are Spanish, max 18 words, one per anchor id. Each transition's "student_en" must mention the setting or a role; never use the words "unit" or "lesson".
Return ONLY valid JSON, no markdown, exactly this shape: {"bridges":[{"title":"","setting":"","where":"","the":"","roles":["","",""],"conflict":"one line, English","rationale":{"<anchorId>":"Spanish, ≤ 18 words"},"order":["<anchorId>"],"transitions":[{"toAnchorId":"","teacher_es":"","student_en":"must mention setting or a role"}]}]}`;
}

// ------------------------------------------------------------------ parseo --

/** Convierte los saltos de línea literales dentro de cadenas en \\n. */
function escapeNewlines(t: string): string {
  let out = '';
  let inStr = false;
  for (let i = 0; i < t.length; i++) {
    const ch = t[i]!;
    if (ch === '"' && t[i - 1] !== '\\') inStr = !inStr;
    out += inStr && ch === '\n' ? '\\n' : ch;
  }
  return out;
}

/** Extrae un objeto JSON de una respuesta con ruido (vallas ```, texto alrededor, comas finales). */
export function parseJsonLoose(text: string): Record<string, unknown> {
  let t = text.trim().replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '');
  const a = t.indexOf('{');
  const b = t.lastIndexOf('}');
  if (a < 0 || b < a) throw new Error('no JSON');
  t = t.slice(a, b + 1);
  const noComma = t.replace(/,\s*([}\]])/g, '$1');
  const attempts = [t, noComma, escapeNewlines(noComma.replace(/[“”]/g, '"'))];
  let err: unknown;
  for (const x of attempts) {
    try {
      const o = JSON.parse(x);
      if (o && typeof o === 'object' && !Array.isArray(o)) return o as Record<string, unknown>;
    } catch (e) {
      err = e;
    }
  }
  throw new Error(`JSON inválido: ${(err as Error)?.message ?? ''}`);
}

const str = (v: unknown) => (typeof v === 'string' ? v : typeof v === 'number' ? String(v) : '');
const arr = (v: unknown) => (Array.isArray(v) ? v : []);
const textOrLines = (v: unknown) => (Array.isArray(v) ? v.map(str).join('\n') : str(v));

/** Devuelve el contenido con la forma exacta del tipo (o lanza si faltan piezas esenciales). */
export function normalizeContent(kind: ResourceKind, o: Record<string, unknown>): Record<string, unknown> {
  const rec = (x: unknown) => (x && typeof x === 'object' ? (x as Record<string, unknown>) : {});
  switch (kind) {
    case 'examples':
      return { sentences: arr(o.sentences).map(str).filter(Boolean) };
    case 'story':
      return { text: textOrLines(o.text), characters: arr(o.characters).map(rec).map((c) => ({ name: str(c.name), role: str(c.role) })).filter((c) => c.name) };
    case 'news': {
      const q = rec(o.quote);
      return { headline: str(o.headline), lede: str(o.lede), body: textOrLines(o.body), quote: { speaker: str(q.speaker), text: str(q.text) }, fictionalNote: str(o.fictionalNote) };
    }
    case 'dialogue':
      return { lines: arr(o.lines).map(rec).map((l) => ({ sp: str(l.sp ?? l.speaker), line: str(l.line ?? l.text) })).filter((l) => l.line) };
    case 'message':
      return { format: str(o.format) || 'email', subject: str(o.subject), text: textOrLines(o.text) };
    case 'interview':
      return { intro: str(o.intro), qa: arr(o.qa).map(rec).map((x) => ({ q: str(x.q), a: str(x.a) })).filter((x) => x.q) };
    case 'announcement':
      return { title: str(o.title), text: textOrLines(o.text) };
    case 'comprehension':
      return { questions: arr(o.questions).map(rec).map((x) => ({ q: str(x.q), answer: str(x.answer), type: str(x.type) || 'literal' })).filter((x) => x.q) };
    case 'ccq':
      return { items: arr(o.items).map(rec).map((x) => ({ point: str(x.point) || 'meaning', q: str(x.q), answer: str(x.answer) })).filter((x) => x.q) };
    case 'exercise':
      return {
        type: str(o.type) || 'gapfill',
        instructions: str(o.instructions),
        items: arr(o.items).map(rec).map((x) => ({ prompt: str(x.prompt), answer: str(x.answer), distractors: arr(x.distractors).map(str).filter(Boolean) })).filter((x) => x.prompt),
      };
    case 'game':
      return { name: str(o.name), mode: str(o.mode), minutes: Math.min(8, Math.max(1, Number(o.minutes) || 6)), materials: arr(o.materials).map(str).filter(Boolean), steps: arr(o.steps).map(str).filter(Boolean), targetLanguage: str(o.targetLanguage) };
    case 'roleplay':
      return { cards: arr(o.cards).map(rec).map((x) => ({ role: str(x.role), situation: str(x.situation), goal: str(x.goal), usefulLanguage: arr(x.usefulLanguage).map(str).filter(Boolean) })).filter((x) => x.role) };
    case 'debate':
      return { questions: arr(o.questions).map(str).filter(Boolean), stance: str(o.stance) };
    case 'board':
      return { sections: arr(o.sections).map(rec).map((x) => ({ title: str(x.title), lines: arr(x.lines).map(str).filter(Boolean) })).filter((x) => x.title) };
  }
}

export interface ProposedBridge {
  bridge: Bridge;
  order: string[];
  transitions: Record<string, { teacher_es: string; student_en: string }>;
}

export function parseBridges(text: string, anchors: Anchor[], names: [string, string, string]): ProposedBridge[] {
  const o = parseJsonLoose(text);
  const list = arr(o.bridges);
  const ids = anchors.map((a) => a.id);
  const out: ProposedBridge[] = [];
  for (const raw of list) {
    const b = (raw ?? {}) as Record<string, unknown>;
    const setting = str(b.setting).trim();
    const roles = arr(b.roles).map(str).filter(Boolean).slice(0, 4);
    if (!setting || roles.length < 2) continue;
    const rat = (b.rationale ?? {}) as Record<string, unknown>;
    const rationale: Record<string, string> = {};
    for (const id of ids) rationale[id] = str(rat[id]) || '';
    const order = arr(b.order).map(str).filter((id) => ids.includes(id));
    const transitions: ProposedBridge['transitions'] = {};
    for (const tr of arr(b.transitions)) {
      const x = (tr ?? {}) as Record<string, unknown>;
      if (ids.includes(str(x.toAnchorId)) && str(x.student_en) && str(x.teacher_es)) transitions[str(x.toAnchorId)] = { teacher_es: str(x.teacher_es), student_en: str(x.student_en) };
    }
    const fns = [...new Set(anchors.flatMap((a) => a.profile.fns))];
    const doms = [...new Set(anchors.flatMap((a) => a.profile.doms))];
    out.push({
      bridge: {
        id: `ia-${Math.random().toString(36).slice(2, 8)}`,
        title: str(b.title) || setting,
        setting,
        roles,
        conflict: str(b.conflict),
        where: str(b.where) || undefined,
        the: str(b.the) || undefined,
        doms,
        fns,
        rationale,
        source: 'ia',
        characters: roles.map((r, i) => ({ name: names[i % 3]!, role: r })),
      },
      order: [...order, ...ids.filter((id) => !order.includes(id))],
      transitions,
    });
  }
  if (!out.length) throw new Error('sin contextos');
  return out.slice(0, 3);
}
