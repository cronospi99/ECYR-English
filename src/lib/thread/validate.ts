/**
 * Validación local de recursos (IA y edición manual), spec §4.4.
 * Devuelve {ok, errors, warnings}: los avisos son insignias ámbar; los errores provocan un reintento.
 */
import type { CefrLevel, Unit } from '../../content/types';
import { countHits, plain } from './profiles';
import type { Resource, ResourceKind, Target, Validation } from './types';

export const LEVEL_IDX: Record<CefrLevel, number> = { A1: 0, A2: 1, B1: 2, B2: 3, C1: 4, C2: 5 };
type Rng = [number, number];

/** Palabras del texto principal por nivel (A1…C2). */
export const WORD_RANGE: Partial<Record<ResourceKind, Rng[]>> = {
  story: [[80, 110], [110, 160], [160, 220], [220, 280], [260, 340], [300, 380]],
  news: [[70, 100], [100, 150], [150, 210], [200, 270], [250, 330], [290, 370]],
  message: [[40, 60], [60, 90], [90, 140], [130, 190], [170, 240], [200, 280]],
  announcement: [[40, 60], [50, 80], [80, 120], [110, 160], [150, 210], [170, 230]],
};
/** Nº de ítems por nivel. */
export const ITEM_RANGE: Partial<Record<ResourceKind, Rng[]>> = {
  examples: [[5, 5], [6, 6], [6, 6], [6, 6], [6, 6], [6, 6]],
  dialogue: [[8, 8], [10, 10], [12, 12], [14, 14], [16, 16], [18, 18]],
  interview: [[4, 4], [5, 5], [5, 5], [6, 6], [6, 6], [6, 6]],
  comprehension: [[5, 5], [5, 5], [6, 6], [6, 6], [6, 6], [6, 6]],
  ccq: [[3, 3], [3, 3], [4, 4], [4, 4], [5, 5], [5, 5]],
  exercise: [[6, 6], [6, 8], [8, 8], [8, 8], [8, 8], [8, 8]],
  roleplay: [[2, 2], [2, 3], [3, 3], [3, 4], [3, 4], [4, 4]],
  debate: [[4, 4], [4, 4], [5, 5], [5, 5], [6, 6], [6, 6]],
};
/** Palabras por frase de `examples`. */
export const SENT_RANGE: Rng[] = [[5, 8], [6, 10], [8, 14], [10, 18], [12, 22], [14, 26]];

export const wordCount = (s: string) => (s.replace(/\*\*/g, '').match(/[A-Za-z0-9’']+/g) ?? []).length;

const strs = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const objs = (v: unknown): Record<string, unknown>[] => (Array.isArray(v) ? v.filter((x): x is Record<string, unknown> => !!x && typeof x === 'object') : []);
const s = (v: unknown) => (typeof v === 'string' ? v : '');

/** Texto de la parte "central" (para contar palabras). */
export function mainText(kind: ResourceKind, c: Record<string, unknown>): string {
  switch (kind) {
    case 'story':
      return s(c.text);
    case 'news': {
      const q = (c.quote ?? {}) as Record<string, unknown>;
      return [s(c.headline), s(c.lede), s(c.body), s(q.text)].join(' ');
    }
    case 'message':
      return s(c.text);
    case 'announcement':
      return s(c.text);
    default:
      return allText(c);
  }
}

/** Todos los textos de un recurso (los valores de cadena, en orden). */
export function allText(v: unknown): string {
  if (typeof v === 'string') return v;
  if (Array.isArray(v)) return v.map(allText).join('\n');
  if (v && typeof v === 'object') return Object.entries(v).filter(([k]) => !['type', 'mode', 'format', 'stance'].includes(k)).map(([, x]) => allText(x)).join('\n');
  return '';
}

/** Texto en el que se buscan los hits (sin respuestas ni instrucciones). */
export function hitText(res: { kind: ResourceKind; content: Record<string, unknown> }): string {
  const c = res.content;
  switch (res.kind) {
    case 'dialogue':
      return objs(c.lines).map((l) => s(l.line)).join('\n');
    case 'interview':
      return [s(c.intro), ...objs(c.qa).map((x) => `${s(x.q)} ${s(x.a)}`)].join('\n');
    case 'examples':
      return strs(c.sentences).join('\n');
    case 'exercise':
      return objs(c.items).map((x) => `${s(x.prompt)} ${s(x.answer)}`).join('\n');
    case 'news':
      return mainText('news', c);
    default:
      return allText(c);
  }
}

// ------------------------------------------------------------ forma exacta --

export function shapeErrors(kind: ResourceKind, c: Record<string, unknown>): string[] {
  const e: string[] = [];
  const need = (cond: boolean, msg: string) => {
    if (!cond) e.push(msg);
  };
  switch (kind) {
    case 'examples':
      need(strs(c.sentences).length > 0, 'falta "sentences"');
      break;
    case 'story':
      need(!!s(c.text).trim(), 'falta "text"');
      break;
    case 'news':
      need(!!s(c.headline), 'falta "headline"');
      need(!!s(c.lede), 'falta "lede"');
      need(!!s(c.body), 'falta "body"');
      need(!!s((c.quote as Record<string, unknown> | undefined)?.text), 'falta "quote.text"');
      need(!!s(c.fictionalNote), 'falta "fictionalNote"');
      break;
    case 'dialogue':
      need(objs(c.lines).length > 0 && objs(c.lines).every((l) => s(l.sp) && s(l.line)), '"lines" debe ser [{sp,line}]');
      break;
    case 'message':
      need(!!s(c.text), 'falta "text"');
      break;
    case 'interview':
      need(objs(c.qa).length > 0 && objs(c.qa).every((x) => s(x.q) && s(x.a)), '"qa" debe ser [{q,a}]');
      break;
    case 'announcement':
      need(!!s(c.title) && !!s(c.text), 'faltan "title"/"text"');
      break;
    case 'comprehension':
      need(objs(c.questions).length > 0 && objs(c.questions).every((x) => s(x.q) && s(x.answer)), '"questions" debe ser [{q,answer,type}]');
      break;
    case 'ccq':
      need(objs(c.items).length > 0 && objs(c.items).every((x) => s(x.q) && s(x.answer)), '"items" debe ser [{point,q,answer}]');
      break;
    case 'exercise':
      need(objs(c.items).length > 0 && objs(c.items).every((x) => s(x.prompt) && s(x.answer)), '"items" debe ser [{prompt,answer}]');
      break;
    case 'game':
      need(!!s(c.name) && strs(c.steps).length > 0, 'faltan "name"/"steps"');
      break;
    case 'roleplay':
      need(objs(c.cards).length > 0 && objs(c.cards).every((x) => s(x.role) && s(x.situation) && s(x.goal)), '"cards" debe ser [{role,situation,goal,usefulLanguage}]');
      break;
    case 'debate':
      need(strs(c.questions).length > 0, 'falta "questions"');
      break;
    case 'board':
      need(objs(c.sections).length >= 3, 'el plan de pizarra necesita al menos 3 secciones');
      break;
  }
  return e;
}

/** Nº de ítems del recurso (para la comprobación de rango). */
export function itemCount(kind: ResourceKind, c: Record<string, unknown>): number {
  switch (kind) {
    case 'examples': return strs(c.sentences).length;
    case 'dialogue': return objs(c.lines).length;
    case 'interview': return objs(c.qa).length;
    case 'comprehension': return objs(c.questions).length;
    case 'ccq':
    case 'exercise': return objs(c.items).length;
    case 'roleplay': return objs(c.cards).length;
    case 'debate': return strs(c.questions).length;
    default: return 0;
  }
}

// ----------------------------------------------------------- vocabulario --

const FUNCTION_WORDS =
  'a an the and or but so because if when while as than that this these those there here it its i you he she we they me him her us them my your his our their mine yours ' +
  'is are am was were be been being do does did done have has had having will would can could shall should may might must not no yes ok okay what who whom whose which where why how ' +
  'to of in on at by for with from about into over under after before between through during up down out off again then once all any both each few more most other some such only own same too very just ' +
  'one two three four five six seven eight nine ten first second third next last now today tomorrow yesterday always never often sometimes also still already yet ever much many little lot lots ' +
  'good bad big small new old young long short high low hot cold early late right left great nice happy sad ready sure well better best worse worst ' +
  'man woman men women boy girl child children people friend friends family mother father brother sister teacher student students class day days night morning week weekend year time ' +
  'place home house school room city town street country world work job money food water book books phone door window ' +
  'go goes went gone going come comes came coming get gets got getting make makes made making take takes took taken see sees saw seen look looks say says said tell tells told ask asks asked ' +
  'think thinks thought know knows knew want wants wanted need needs needed like likes liked love help helps helped try tries tried use uses used give gives gave find found put let ' +
  'say speak talk talks talked listen listens listened read write wrote eat eats ate drink play plays played live lives lived stay stays stayed meet meets met start starts started finish ' +
  'something someone everything everyone nothing nobody anything anyone everybody somebody maybe perhaps really quite pretty too enough very ' +
  'everyone busy problem solve plan idea answer question questions story stories news news says story think ' +
  'trouble reporter reporters talked explains answers asks attention announcement fictional written practice hurry quiet listening busy ca wo sha ai please thank thanks sorry hello hi bye goodbye dear name names';

const tokens = (t: string) => (t.toLowerCase().replace(/[’‘]/g, "'").match(/[a-z]+(?:'[a-z]+)?/g) ?? []).map((w) => w.replace(/n't$/, '').replace(/'(s|ll|re|ve|d|m|t)$/, ''));

/** Palabras conocidas del nivel: vocabulario, ejemplos y gramática de las unidades dadas + palabras comunes. */
export function knownWords(units: Unit[]): Set<string> {
  const set = new Set<string>(tokens(FUNCTION_WORDS));
  const add = (x?: string) => {
    if (x) for (const w of tokens(x)) set.add(w);
  };
  for (const u of units) {
    add(u.theme);
    add(u.title);
    add(u.overview?.intro);
    for (const v of u.vocab) {
      add(v.term);
      add(v.def);
      add(v.colloc);
      for (const e of v.examples ?? []) add(e);
    }
    for (const g of u.grammar) {
      add(g.name);
      add(g.short);
      for (const e of [...(g.examples ?? []), ...(g.more ?? []), ...(g.form ?? [])]) add(plain(e));
      for (const d of g.dialogue ?? []) add(d.line);
      for (const f of g.fix ?? []) {
        add(f.right);
      }
      for (const i of g.drill?.items ?? []) add(i);
    }
  }
  return set;
}

const stems = (w: string) => [w, w.replace(/s$/, ''), w.replace(/es$/, ''), w.replace(/ies$/, 'y'), w.replace(/ed$/, ''), w.replace(/ed$/, 'e'), w.replace(/ing$/, ''), w.replace(/ing$/, 'e'), w.replace(/ly$/, ''), w.replace(/er$/, ''), w.replace(/est$/, ''), w.replace(/(.)\1ing$/, '$1'), w.replace(/(.)\1ed$/, '$1')];

export function unknownRatio(text: string, known: Set<string>, allowed: string[] = []): { ratio: number; unknown: string[] } {
  const ok = new Set(allowed.flatMap(tokens));
  const ws = tokens(text).filter((w) => w.length > 1);
  const unknown = ws.filter((w) => !ok.has(w) && !stems(w).some((x) => known.has(x)));
  return { ratio: ws.length ? unknown.length / ws.length : 0, unknown: [...new Set(unknown)] };
}

// ------------------------------------------------------------- validación --

const READING: ResourceKind[] = ['story', 'news', 'dialogue', 'message', 'interview', 'announcement'];

export interface ValidateCtx {
  level: CefrLevel;
  targets: Target[];
  /** Solo los targets de este recurso. */
  known?: Set<string>;
  allowed?: string[];
}

export function validateResource(res: Pick<Resource, 'kind' | 'content' | 'source' | 'targets'>, ctx: ValidateCtx): Validation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const strict = res.source === 'ia';
  const bad = (msg: string, hard = strict) => (hard ? errors : warnings).push(msg);
  const c = res.content;
  const li = LEVEL_IDX[ctx.level];

  errors.push(...shapeErrors(res.kind, c));
  if (errors.length) return { ok: false, errors, warnings };

  // 2. longitud e ítems
  const wr = WORD_RANGE[res.kind]?.[li];
  if (wr) {
    const n = wordCount(mainText(res.kind, c));
    const lo = Math.floor(wr[0] * 0.85);
    const hi = Math.ceil(wr[1] * 1.15);
    if (n < lo || n > hi) bad(`longitud ${n} palabras (esperado ${wr[0]}–${wr[1]})`);
  }
  const ir = ITEM_RANGE[res.kind]?.[li];
  if (ir) {
    const n = itemCount(res.kind, c);
    if (n < ir[0] - 1 || n > ir[1] + 1) bad(`${n} elementos (esperado ${ir[0]}–${ir[1]})`);
  }
  if (res.kind === 'examples') {
    const sr = SENT_RANGE[li]!;
    const off = strs(c.sentences).filter((x) => wordCount(x) > sr[1] * 1.15 || wordCount(x) < Math.floor(sr[0] * 0.85)).length;
    if (off > 1) warnings.push(`${off} frases fuera de ${sr[0]}–${sr[1]} palabras`);
  }

  // 3. lenguaje meta
  const mine = ctx.targets.filter((t) => res.targets.some((x) => x.anchorId === t.anchorId));
  if (mine.length && (READING.includes(res.kind) || res.kind === 'examples' || res.kind === 'exercise')) {
    const text = hitText({ kind: res.kind, content: c });
    const min = res.kind === 'examples' || res.kind === 'exercise' ? Math.max(1, Math.floor(itemCount(res.kind, c) * 0.6)) : li === 0 ? 2 : 3;
    for (const t of mine) {
      const n = countHits(text, t, res.source === 'ia');
      if (n < min) bad(`"${t.label}" aparece ${n} veces (mínimo ${min})`, strict && !t.weak);
    }
  }

  // 4. nivel
  if (ctx.known && (READING.includes(res.kind) || res.kind === 'examples')) {
    const { ratio, unknown } = unknownRatio(allText(c), ctx.known, ctx.allowed);
    const limit = li <= 1 ? 0.08 : 0.05;
    if (ratio > limit) bad(`${Math.round(ratio * 100)} % de palabras fuera del nivel (${unknown.slice(0, 6).join(', ')})`, strict && li <= 1 && ratio > 0.08);
  }

  // 5. noticias
  if (res.kind === 'news') {
    const text = mainText('news', c);
    if (/\b20(2[3-9]|3\d)\b/.test(text) && /\b[A-Z][a-z]+ [A-Z][a-z]+\b/.test(text)) warnings.push('contiene un año reciente y nombres propios: comprueba que no sea un dato real');
  }

  // 6. respuestas
  if (res.kind === 'exercise') {
    for (const [i, it] of objs(c.items).entries()) {
      const ans = s(it.answer).trim().toLowerCase();
      if (!ans) errors.push(`ítem ${i + 1} sin respuesta`);
      if (strs(it.distractors).some((d) => d.trim().toLowerCase() === ans)) errors.push(`ítem ${i + 1}: un distractor repite la respuesta`);
      if (c.type === 'gapfill' && !/_{2,}/.test(s(it.prompt))) errors.push(`ítem ${i + 1}: falta el hueco ____`);
    }
  }
  if (res.kind === 'ccq' || res.kind === 'comprehension') {
    for (const it of objs(c.items ?? c.questions)) if (!s(it.answer).trim()) errors.push('hay una pregunta sin respuesta');
  }

  return { ok: errors.length === 0, errors, warnings };
}
