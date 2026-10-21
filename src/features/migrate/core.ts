/**
 * Pure, dependency-free logic of the "Importar y migrar" center: validation of
 * untrusted files and rows, and the merge / dedupe rules. No browser, store or
 * network access lives here, so it can be unit-tested with plain Node
 * (`node --experimental-strip-types`). The side-effecting half is
 * src/lib/migrate.ts.
 *
 * Everything that comes from a file — or from the old project — is treated as
 * untrusted: shapes are checked, sizes clamped, unknown keys dropped and
 * strings only accepted where strings are expected. Nothing is ever evaluated.
 */
import type { Activity, ActivityKind, Completion, ProgressData } from '@/store/progress';
import type { CefrLevel, Skill } from '@/content/types';

// ---------------------------------------------------------------- limits ----
export const MAX_FILE_BYTES = 15 * 1024 * 1024;
/** The simulator keeps its last 30 attempts (recordScore / pushProgress). */
export const HISTORY_CAP = 30;
/** Full history kept in the migration log. */
export const FULL_HISTORY_CAP = 2000;
export const XP_PER_ATTEMPT = 30;

export const IELTS_MODULES = ['listening', 'reading', 'writing', 'speaking'] as const;
export type IeltsMod = (typeof IELTS_MODULES)[number];
export type IeltsScores = Record<IeltsMod, number | null>;

export interface IeltsHistoryEntry {
  date: string; // ISO
  module: IeltsMod;
  band: number;
  detail: string;
}

export interface IeltsProgressLike {
  scores: IeltsScores;
  history: IeltsHistoryEntry[];
}

// --------------------------------------------------------------- helpers ----
export const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** A string, clamped; anything else → fallback. */
export function str(v: unknown, max: number, fallback = ''): string {
  return typeof v === 'string' ? v.slice(0, max) : fallback;
}
export function optStr(v: unknown, max: number): string | null {
  return typeof v === 'string' ? v.slice(0, max) : null;
}
/** A finite number inside [min, max]; anything else → null. */
export function num(v: unknown, min: number, max: number): number | null {
  const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}
/** Normalises any parseable date to a canonical ISO string (ms precision), else null. */
export function isoDate(v: unknown): string | null {
  if (typeof v !== 'string' || v.length > 64) return null;
  const t = Date.parse(v);
  if (!Number.isFinite(t)) return null;
  // Sanity window: 2000-01-01 … 2100-01-01.
  if (t < 946684800000 || t > 4102444800000) return null;
  return new Date(t).toISOString();
}
const isMod = (v: unknown): v is IeltsMod => typeof v === 'string' && (IELTS_MODULES as readonly string[]).includes(v);
const roundHalf = (n: number) => Math.round(n * 2) / 2;

const BAD_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

export interface CleanLimits {
  depth: number;
  str: number;
  arr: number;
  keys: number;
}
const DEFAULT_LIMITS: CleanLimits = { depth: 24, str: 100_000, arr: 2000, keys: 2000 };

/**
 * Deep copy of plain JSON data with hard limits. Drops prototype-polluting
 * keys, functions/symbols (impossible from JSON anyway), and anything nested
 * deeper than `depth`. Strings are clamped, arrays and objects truncated.
 */
export function cleanJson(v: unknown, limits: Partial<CleanLimits> = {}, depth = 0): unknown {
  const L = { ...DEFAULT_LIMITS, ...limits };
  if (v === null) return null;
  if (typeof v === 'string') return v.slice(0, L.str);
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  if (typeof v === 'boolean') return v;
  if (depth >= L.depth) return null;
  if (Array.isArray(v)) return v.slice(0, L.arr).map((x) => cleanJson(x, L, depth + 1));
  if (isObj(v)) {
    const out: Record<string, unknown> = Object.create(null) as Record<string, unknown>;
    let n = 0;
    for (const [k, x] of Object.entries(v)) {
      if (BAD_KEYS.has(k) || k.length > 200) continue;
      if (++n > L.keys) break;
      out[k] = cleanJson(x, L, depth + 1);
    }
    // Back to a normal object so spreading / JSON.stringify behave as usual.
    return { ...out };
  }
  return null;
}
const cleanObj = (v: unknown, limits?: Partial<CleanLimits>): Record<string, unknown> =>
  isObj(v) ? (cleanJson(v, limits) as Record<string, unknown>) : {};

/** FNV-1a 32-bit hash, hex. Used to recognise a file that was already imported. */
export function fnv1a(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

/** Parses JSON text with a size guard. Never evaluates anything. */
export function parseJsonText(text: string): { ok: true; value: unknown } | { ok: false; error: string } {
  if (text.length > MAX_FILE_BYTES) return { ok: false, error: 'El archivo es demasiado grande (máximo 15 MB).' };
  try {
    return { ok: true, value: JSON.parse(text) as unknown };
  } catch {
    return { ok: false, error: 'El archivo no es un JSON válido.' };
  }
}

// ------------------------------------------------------- IELTS progress ----
export function emptyScores(): IeltsScores {
  return { listening: null, reading: null, writing: null, speaking: null };
}

export function sanitizeIeltsScores(v: unknown): IeltsScores {
  const out = emptyScores();
  if (!isObj(v)) return out;
  for (const m of IELTS_MODULES) {
    const n = num(v[m], 0, 9);
    out[m] = n === null ? null : roundHalf(n);
  }
  return out;
}

export function sanitizeIeltsHistory(v: unknown, max = FULL_HISTORY_CAP): IeltsHistoryEntry[] {
  if (!Array.isArray(v)) return [];
  const out: IeltsHistoryEntry[] = [];
  for (const e of v.slice(0, max * 2)) {
    if (!isObj(e)) continue;
    const date = isoDate(e.date);
    const band = num(e.band, 0, 9);
    if (!date || band === null || !isMod(e.module)) continue;
    out.push({ date, module: e.module, band, detail: str(e.detail, 300) });
    if (out.length >= max) break;
  }
  return out;
}

export const historyKey = (e: { date: string; module: string }) => `${isoDate(e.date) ?? e.date}|${e.module}`;

/** Union by date+module, newest first. The first copy of a duplicate wins. */
export function mergeIeltsHistory(a: IeltsHistoryEntry[], b: IeltsHistoryEntry[], cap = FULL_HISTORY_CAP): IeltsHistoryEntry[] {
  const seen = new Set<string>();
  const out: IeltsHistoryEntry[] = [];
  for (const e of [...a, ...b]) {
    const k = historyKey(e);
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(e);
  }
  return out.sort((x, y) => y.date.localeCompare(x.date)).slice(0, cap);
}

const latestFor = (h: IeltsHistoryEntry[], m: IeltsMod) =>
  h.reduce<IeltsHistoryEntry | null>((best, e) => (e.module === m && (!best || e.date > best.date) ? e : best), null);

/**
 * Per module, the band of the most recent attempt across both sources wins.
 * A source's score is the band of its own latest attempt (that is how the
 * engine's recordScore keeps them), so the newer source's score is used, and
 * the attempt's own band when that score is missing. With no dated attempt on
 * either side, `a` (the destination) is preferred, then `b`.
 */
export function mergeIeltsScores(a: IeltsProgressLike, b: IeltsProgressLike): IeltsScores {
  const out = emptyScores();
  for (const m of IELTS_MODULES) {
    const la = latestFor(a.history, m);
    const lb = latestFor(b.history, m);
    if (la || lb) {
      const useB = !!lb && (!la || lb.date > la.date);
      const src = useB ? b : a;
      const entry = (useB ? lb : la)!;
      out[m] = src.scores[m] ?? entry.band;
    } else {
      out[m] = a.scores[m] ?? b.scores[m] ?? null;
    }
  }
  return out;
}

export interface IeltsMergeResult {
  scores: IeltsScores;
  /** What the engine / progress row keep (newest 30). */
  history: IeltsHistoryEntry[];
  /** Everything, for the migration log. */
  fullHistory: IeltsHistoryEntry[];
  /** Entries of `b` that `a` did not have. */
  added: IeltsHistoryEntry[];
}

export function mergeIelts(a: IeltsProgressLike, b: IeltsProgressLike): IeltsMergeResult {
  const have = new Set(a.history.map(historyKey));
  const added = b.history.filter((e) => !have.has(historyKey(e)));
  const fullHistory = mergeIeltsHistory(a.history, b.history);
  return { scores: mergeIeltsScores(a, b), history: fullHistory.slice(0, HISTORY_CAP), fullHistory, added };
}

/** The engine's localStorage record (`ielts:ielts-history`, see saveHistory). */
export function readEngineRecord(raw: string | null): IeltsProgressLike & { owner: string | null } {
  if (!raw) return { scores: emptyScores(), history: [], owner: null };
  try {
    const p = JSON.parse(raw) as unknown;
    if (!isObj(p)) return { scores: emptyScores(), history: [], owner: null };
    return {
      scores: sanitizeIeltsScores(p.scores),
      history: sanitizeIeltsHistory(p.history),
      owner: typeof p.owner === 'string' ? p.owner : null,
    };
  } catch {
    return { scores: emptyScores(), history: [], owner: null };
  }
}

// --------------------------------------------------------- old IELTS rows ---
export interface OldProfile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'student' | 'teacher';
  teacher_id: string | null;
  class_code: string | null;
  created_at: string | null;
}
export interface OldSubmission {
  id: string;
  module: string;
  task: string | null;
  prompt: string | null;
  content: string | null;
  band: number | null;
  report: unknown;
  created_at: string;
}
export interface OldFeedback {
  id: string;
  teacher_id: string | null;
  message: string;
  created_at: string;
  read_at: string | null;
}
export interface OldHomework {
  id: string;
  teacher_id: string | null;
  title: string;
  module: string | null;
  instructions: string | null;
  due_at: string | null;
  created_at: string;
  done_at: string | null;
  student_note: string | null;
}

export function sanitizeProfileRow(v: unknown): OldProfile | null {
  if (!isObj(v) || typeof v.id !== 'string') return null;
  return {
    id: v.id.slice(0, 64),
    email: optStr(v.email, 320),
    full_name: optStr(v.full_name, 200),
    role: v.role === 'teacher' ? 'teacher' : 'student',
    teacher_id: optStr(v.teacher_id, 64),
    class_code: optStr(v.class_code, 16),
    created_at: isoDate(v.created_at),
  };
}

export function sanitizeSubmissionRow(v: unknown): OldSubmission | null {
  if (!isObj(v)) return null;
  const created_at = isoDate(v.created_at);
  const module = str(v.module, 40).trim();
  if (!created_at || !module) return null;
  return {
    id: str(v.id, 64),
    module,
    task: optStr(v.task, 40),
    // Same clamps the engine applies in saveSubmission.
    prompt: optStr(v.prompt, 2000),
    content: optStr(v.content, 20000),
    band: num(v.band, 0, 9),
    report: v.report == null ? null : cleanJson(v.report, { str: 200_000, arr: 1000, depth: 20 }),
    created_at,
  };
}

export function sanitizeFeedbackRow(v: unknown): OldFeedback | null {
  if (!isObj(v)) return null;
  const created_at = isoDate(v.created_at);
  const message = str(v.message, 10_000);
  if (!created_at || !message) return null;
  return { id: str(v.id, 64), teacher_id: optStr(v.teacher_id, 64), message, created_at, read_at: isoDate(v.read_at) };
}

export function sanitizeHomeworkRow(v: unknown): OldHomework | null {
  if (!isObj(v)) return null;
  const created_at = isoDate(v.created_at);
  const title = str(v.title, 500);
  if (!created_at || !title) return null;
  return {
    id: str(v.id, 64),
    teacher_id: optStr(v.teacher_id, 64),
    title,
    module: optStr(v.module, 40),
    instructions: optStr(v.instructions, 10_000),
    due_at: isoDate(v.due_at),
    created_at,
    done_at: isoDate(v.done_at),
    student_note: optStr(v.student_note, 5000),
  };
}

/** Dedupe key of a submission: same moment + module + task = same attempt. */
export const submissionKey = (s: { created_at: string; module: string; task: string | null }) =>
  `${isoDate(s.created_at) ?? s.created_at}|${s.module}|${s.task ?? ''}`;

export function planSubmissions<T extends { created_at: string; module: string; task: string | null }>(
  rows: T[],
  existingKeys: Iterable<string>,
): { toInsert: T[]; skipped: number } {
  const seen = new Set(existingKeys);
  const toInsert: T[] = [];
  let skipped = 0;
  for (const r of rows) {
    const k = submissionKey(r);
    if (seen.has(k)) skipped++;
    else {
      seen.add(k);
      toInsert.push(r);
    }
  }
  return { toInsert, skipped };
}

// ------------------------------------------------------------- XP awards ----
export interface IeltsAward {
  key: string;
  date: string;
  activity: Omit<Activity, 'id' | 'at'>;
}

const SKILL_OF: Record<IeltsMod, Skill> = { listening: 'listening', reading: 'reading', writing: 'writing', speaking: 'speaking' };

/** Same shape IeltsPage's syncIeltsXp awards for a simulator attempt. */
export function ieltsActivity(e: IeltsHistoryEntry): Omit<Activity, 'id' | 'at'> {
  return {
    kind: 'ielts',
    title: `IELTS ${e.module} · banda ${e.band}`,
    skill: SKILL_OF[e.module],
    xp: XP_PER_ATTEMPT,
    score: Math.round((e.band / 9) * 100),
    ref: `ielts:${e.module}`,
  };
}

/** One award per attempt whose key is not in `skip`. */
export function planAwards(entries: IeltsHistoryEntry[], skip: Iterable<string>): IeltsAward[] {
  const seen = new Set(skip);
  const out: IeltsAward[] = [];
  for (const e of entries) {
    const key = historyKey(e);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({ key, date: e.date, activity: ieltsActivity(e) });
  }
  return out;
}

// ---------------------------------------------------- IELTS session file ----
export const SESSION_APP = 'IELTS Academic Simulator';

export interface IeltsSessionData {
  _meta: { app: string; exportedAt: string | null };
  candNo?: string;
  scores: IeltsScores;
  history: IeltsHistoryEntry[];
  listening?: Record<string, unknown>;
  reading?: Record<string, unknown>;
  writing?: Record<string, unknown>;
  speaking?: Record<string, unknown>;
  translator?: Record<string, unknown>;
}

export interface IeltsSessionSummary {
  exportedAt: string | null;
  candNo: string | null;
  bands: number;
  scores: IeltsScores;
  history: number;
  writingDrafts: number;
  writingWords: number;
  writingReports: number;
  speakingTranscripts: number;
  speakingReports: number;
  listeningAnswers: number;
  readingAnswers: number;
  customAudio: number;
  generated: { listeningParts: number; readingPassages: number; writing: boolean; speaking: boolean };
  savedWords: number;
  hash: string;
}

const B64 = /^[A-Za-z0-9+/=\r\n]*$/;
const MIME_AUDIO = /^audio\/[\w.+-]{1,40}$/;

function sanitizeCustomAudio(v: unknown): Record<string, { b64: string; mime: string }> {
  const out: Record<string, { b64: string; mime: string }> = {};
  if (!isObj(v)) return out;
  let n = 0;
  for (const [k, a] of Object.entries(v)) {
    if (BAD_KEYS.has(k) || k.length > 60 || ++n > 20) continue;
    if (!isObj(a) || typeof a.b64 !== 'string' || typeof a.mime !== 'string') continue;
    if (a.b64.length > MAX_FILE_BYTES || !B64.test(a.b64) || !MIME_AUDIO.test(a.mime)) continue;
    out[k] = { b64: a.b64, mime: a.mime };
  }
  return out;
}

const countFilled = (v: unknown) => (isObj(v) ? Object.values(v).filter((x) => x !== null && x !== '' && x !== undefined).length : 0);
const words = (s: unknown) => (typeof s === 'string' && s.trim() ? s.trim().split(/\s+/).length : 0);

/**
 * Validates a session file exported by the original simulator (collectSessionData)
 * and returns a cleaned copy with only the keys the engine's applySessionData reads.
 */
export function parseIeltsSession(input: unknown): { ok: true; data: IeltsSessionData; summary: IeltsSessionSummary } | { ok: false; error: string } {
  let v = input;
  if (typeof v === 'string') {
    const p = parseJsonText(v);
    if (!p.ok) return p;
    v = p.value;
  }
  if (!isObj(v) || !isObj(v._meta) || v._meta.app !== SESSION_APP)
    return { ok: false, error: 'No es un archivo de sesión del IELTS Simulator (falta "_meta.app").' };

  const data: IeltsSessionData = {
    _meta: { app: SESSION_APP, exportedAt: isoDate(v._meta.exportedAt) },
    scores: sanitizeIeltsScores(v.scores),
    history: sanitizeIeltsHistory(v.history),
  };
  if (typeof v.candNo === 'string') data.candNo = v.candNo.slice(0, 40);

  if (isObj(v.listening)) {
    const l = v.listening;
    data.listening = {
      answers: cleanObj(l.answers, { depth: 4, str: 2000 }),
      submitted: l.submitted === true,
      playedParts: cleanObj(l.playedParts, { depth: 3, str: 200 }),
      customAudio: sanitizeCustomAudio(l.customAudio),
      ...(Array.isArray(l.parts) ? { parts: cleanJson(l.parts, { arr: 20 }) } : {}),
    };
  }
  if (isObj(v.reading)) {
    const r = v.reading;
    data.reading = {
      answers: cleanObj(r.answers, { depth: 4, str: 2000 }),
      submitted: r.submitted === true,
      activePassage: num(r.activePassage, 0, 10) ?? 0,
      ...(Array.isArray(r.passages) ? { passages: cleanJson(r.passages, { arr: 10 }) } : {}),
    };
  }
  if (isObj(v.writing)) {
    const w = v.writing;
    const drafts = isObj(w.drafts) ? w.drafts : {};
    data.writing = {
      activeTask: w.activeTask === 'task2' ? 'task2' : 'task1',
      drafts: { task1: str(drafts.task1, 20000), task2: str(drafts.task2, 20000) },
      hints: cleanObj(w.hints),
      reports: cleanObj(w.reports),
      paraFeedback: cleanObj(w.paraFeedback),
      grammar: cleanObj(w.grammar),
      bandVersions: cleanObj(w.bandVersions),
      ...(isObj(w.tasks) && isObj(w.tasks.task1) && isObj(w.tasks.task2) ? { tasks: cleanJson(w.tasks) } : {}),
    };
  }
  if (isObj(v.speaking)) {
    const s = v.speaking;
    const q = s.questions;
    data.speaking = {
      part: str(s.part, 20, 'part1') || 'part1',
      activeQ: cleanObj(s.activeQ, { depth: 2 }),
      transcripts: cleanObj(s.transcripts, { depth: 3, str: 20000 }),
      metrics: cleanObj(s.metrics),
      reports: cleanObj(s.reports),
      answers: cleanObj(s.answers, { depth: 4, str: 20000 }),
      language: cleanObj(s.language),
      hesitation: cleanObj(s.hesitation),
      bandVersions: cleanObj(s.bandVersions),
      ...(isObj(q) && isObj(q.part1) && isObj(q.part2) && isObj(q.part3) ? { questions: cleanJson(q) } : {}),
    };
  }
  if (isObj(v.translator)) {
    const t = v.translator;
    data.translator = {
      ...(typeof t.from === 'string' ? { from: t.from.slice(0, 10) } : {}),
      ...(typeof t.to === 'string' ? { to: t.to.slice(0, 10) } : {}),
      saved: Array.isArray(t.saved) ? (cleanJson(t.saved, { arr: 60, depth: 4, str: 2000 }) as unknown[]) : [],
    };
  }
  return { ok: true, data, summary: summariseSession(data) };
}

export function summariseSession(d: IeltsSessionData): IeltsSessionSummary {
  const w = d.writing ?? {};
  const s = d.speaking ?? {};
  const drafts = isObj(w.drafts) ? w.drafts : {};
  const lsn = d.listening ?? {};
  const rd = d.reading ?? {};
  const saved = d.translator?.saved;
  return {
    exportedAt: d._meta.exportedAt,
    candNo: d.candNo ?? null,
    bands: Object.values(d.scores).filter((x) => x !== null).length,
    scores: d.scores,
    history: d.history.length,
    writingDrafts: countFilled(drafts),
    writingWords: words(drafts.task1) + words(drafts.task2),
    writingReports: countFilled(w.reports),
    speakingTranscripts: countFilled(s.transcripts),
    speakingReports: countFilled(s.reports),
    listeningAnswers: countFilled(lsn.answers),
    readingAnswers: countFilled(rd.answers),
    customAudio: isObj(lsn.customAudio) ? Object.keys(lsn.customAudio).length : 0,
    generated: {
      listeningParts: Array.isArray(lsn.parts) ? lsn.parts.length : 0,
      readingPassages: Array.isArray(rd.passages) ? rd.passages.length : 0,
      writing: isObj(w.tasks),
      speaking: isObj(s.questions),
    },
    savedWords: Array.isArray(saved) ? saved.length : 0,
    hash: fnv1a(JSON.stringify({ e: d._meta.exportedAt, h: d.history, s: d.scores, w: drafts })),
  };
}

// ------------------------------------------------- ECYR progress file -------
const SKILLS: readonly Skill[] = ['listening', 'reading', 'writing', 'speaking', 'grammar', 'vocabulary'];
const LEVELS: readonly CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
const KINDS: readonly ActivityKind[] = ['unit', 'topic', 'game', 'reading', 'listening', 'speaking', 'writing', 'flashcards', 'ielts', 'coach', 'exam'];
const DAY = /^\d{4}-\d{2}-\d{2}$/;
const MAX_XP = 10_000_000;

function completions(v: unknown, keyOk: (k: string) => boolean, max = 2000): Record<string, Completion> {
  const out: Record<string, Completion> = {};
  if (!isObj(v)) return out;
  let n = 0;
  for (const [k, c] of Object.entries(v)) {
    if (BAD_KEYS.has(k) || !keyOk(k) || !isObj(c)) continue;
    const score = num(c.score, 0, 100);
    const at = isoDate(c.at);
    if (score === null || !at) continue;
    out[k] = { score, at };
    if (++n >= max) break;
  }
  return out;
}

export interface EcyrProgressFile {
  progress: ProgressData;
  plan: unknown;
  avatar: { config: unknown; updatedAt: string } | null;
  summary: { xp: number; units: number; topics: number; readings: number; activity: number; streakBest: number; hasPlan: boolean; hasAvatar: boolean; updatedAt: string; hash: string };
}

/**
 * Accepts the platform's own exported progress (ProfilePage → Exportar, which
 * is `snapshot()`), or a learner_state-like document that also carries `plan`
 * and `avatar`. Every field is re-validated; the result is safe for mergeProgress.
 */
export function parseEcyrProgress(input: unknown): { ok: true; file: EcyrProgressFile } | { ok: false; error: string } {
  let v = input;
  if (typeof v === 'string') {
    const p = parseJsonText(v);
    if (!p.ok) return p;
    v = p.value;
  }
  if (isObj(v) && isObj(v.state) && typeof v.state.xp === 'number') v = v.state; // learner_state row
  if (!isObj(v) || typeof v.xp !== 'number' || !isObj(v.units))
    return { ok: false, error: 'El archivo no es un progreso válido de ECYR English.' };

  const skillXp = {} as Record<Skill, number>;
  const sx = isObj(v.skillXp) ? v.skillXp : {};
  for (const s of SKILLS) skillXp[s] = num(sx[s], 0, MAX_XP) ?? 0;

  const dailyXp: Record<string, number> = {};
  if (isObj(v.dailyXp))
    for (const [k, x] of Object.entries(v.dailyXp).slice(0, 3000)) {
      const n = num(x, 0, 100_000);
      if (DAY.test(k) && n !== null) dailyXp[k] = n;
    }

  const st = isObj(v.streak) ? v.streak : {};
  const lastDay = typeof st.lastDay === 'string' && DAY.test(st.lastDay) ? st.lastDay : null;
  const streak = { current: num(st.current, 0, 100_000) ?? 0, best: num(st.best, 0, 100_000) ?? 0, lastDay };

  const games: ProgressData['games'] = {};
  if (isObj(v.games))
    for (const [k, g] of Object.entries(v.games).slice(0, 500)) {
      if (BAD_KEYS.has(k) || k.length > 100 || !isObj(g)) continue;
      const plays = num(g.plays, 0, 1_000_000);
      const lastAt = isoDate(g.lastAt);
      if (plays !== null && lastAt) games[k] = { plays: Math.floor(plays), lastAt };
    }

  const activity: Activity[] = [];
  if (Array.isArray(v.activity))
    for (const a of v.activity.slice(0, 300)) {
      if (!isObj(a)) continue;
      const at = isoDate(a.at);
      const xp = num(a.xp, 0, 100_000);
      if (typeof a.id !== 'string' || !at || xp === null) continue;
      if (!(KINDS as readonly unknown[]).includes(a.kind) || !(SKILLS as readonly unknown[]).includes(a.skill)) continue;
      const entry: Activity = { id: a.id.slice(0, 64), kind: a.kind as ActivityKind, title: str(a.title, 200), skill: a.skill as Skill, xp, at };
      const score = num(a.score, 0, 100);
      if (score !== null) entry.score = score;
      if ((LEVELS as readonly unknown[]).includes(a.level)) entry.level = a.level as CefrLevel;
      if (typeof a.ref === 'string') entry.ref = a.ref.slice(0, 200);
      activity.push(entry);
      if (activity.length >= 150) break;
    }

  const keyStr = (k: string) => k.length > 0 && k.length <= 120;
  const progress: ProgressData = {
    xp: num(v.xp, 0, MAX_XP) ?? 0,
    skillXp,
    dailyXp,
    streak,
    units: completions(v.units, (k) => /^(A1|A2|B1|B2|C1)-\d{1,3}$/.test(k)),
    topics: completions(v.topics, keyStr),
    readings: completions(v.readings, keyStr),
    games,
    activity,
    targetLevel: (LEVELS as readonly unknown[]).includes(v.targetLevel) ? (v.targetLevel as CefrLevel) : 'B2',
    dailyGoal: num(v.dailyGoal, 5, 2000) ?? 50,
    updatedAt: isoDate(v.updatedAt) ?? new Date(0).toISOString(),
  };

  const av = isObj(v.avatar) ? v.avatar : null;
  const avatar = av && isObj(av.config) ? { config: cleanJson(av.config, { depth: 3, str: 100, keys: 40 }), updatedAt: isoDate(av.updatedAt) ?? progress.updatedAt } : null;
  const plan = isObj(v.plan) ? cleanJson(v.plan, { depth: 12, str: 5000, arr: 500 }) : null;

  return {
    ok: true,
    file: {
      progress,
      plan,
      avatar,
      summary: {
        xp: progress.xp,
        units: Object.keys(progress.units).length,
        topics: Object.keys(progress.topics).length,
        readings: Object.keys(progress.readings).length,
        activity: activity.length,
        streakBest: streak.best,
        hasPlan: plan !== null,
        hasAvatar: avatar !== null,
        updatedAt: progress.updatedAt,
        hash: fnv1a(JSON.stringify(progress)),
      },
    },
  };
}

/** JSON size in bytes (UTF-16 length is a safe upper bound for the server's compressed size). */
export const jsonSize = (v: unknown) => JSON.stringify(v ?? null).length;
