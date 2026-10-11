/**
 * "Importar y migrar" — brings what a learner did before into their ECYR account.
 *
 *   1. connectOldIelts / migrateOldIelts   the original IELTS Simulator's own Supabase project
 *   2. parseIeltsSessionFile / importIeltsSession   a session file exported by that app
 *   3. parseEcyrProgressFile / importEcyrProgress   the platform's own progress export
 *   4. applyPendingIeltsSession   hands a queued session to the engine once it is mounted
 *
 * Everything is written as the signed-in user through the app's own client, so
 * row-level security decides what is allowed (no service keys anywhere). The
 * old project is reached with a throw-away client that never persists or
 * refreshes a session and signs out locally when done, so the platform's own
 * sign-in is never touched. Validation / merge rules live in
 * src/features/migrate/core.ts (pure, unit-tested).
 */
import { createClient, type PostgrestError, type SupabaseClient } from '@supabase/supabase-js';
import { supabase, supabaseConfig } from './supabase';
import { dayKey } from './date';
import { useAuth } from '@/store/auth';
import { useProgress, snapshot, mergeProgress } from '@/store/progress';
import { usePlan, sanitizePlan } from '@/store/plan';
import { useAvatar } from '@/store/avatar';
import { useSettings } from '@/store/settings';
import {
  HISTORY_CAP,
  MAX_FILE_BYTES,
  emptyScores,
  historyKey,
  jsonSize,
  mergeIelts,
  mergeIeltsHistory,
  parseEcyrProgress,
  parseIeltsSession,
  parseJsonText,
  planAwards,
  planSubmissions,
  readEngineRecord,
  sanitizeFeedbackRow,
  sanitizeHomeworkRow,
  sanitizeIeltsHistory,
  sanitizeIeltsScores,
  sanitizeProfileRow,
  sanitizeSubmissionRow,
  submissionKey,
  summariseSession,
  type EcyrProgressFile,
  type IeltsAward,
  type IeltsHistoryEntry,
  type IeltsProgressLike,
  type IeltsScores,
  type IeltsSessionData,
  type IeltsSessionSummary,
  type OldFeedback,
  type OldHomework,
  type OldProfile,
  type OldSubmission,
} from '@/features/migrate/core';

export type { EcyrProgressFile, IeltsSessionData, IeltsSessionSummary, IeltsScores, IeltsHistoryEntry } from '@/features/migrate/core';
export { MAX_FILE_BYTES } from '@/features/migrate/core';

// ----------------------------------------------------------------- config ---
/**
 * The original IELTS Simulator project (same values as the `SHARED` fallback in
 * ./supabase.ts, which is not exported). Publishable key: RLS protects the data.
 * Overridable with VITE_OLD_IELTS_URL / VITE_OLD_IELTS_ANON_KEY.
 */
const OLD_IELTS = {
  url: (import.meta.env.VITE_OLD_IELTS_URL as string | undefined) || 'https://eecqfbxisquimaowhbmg.supabase.co',
  anonKey: (import.meta.env.VITE_OLD_IELTS_ANON_KEY as string | undefined) || 'sb_publishable_t3ojNz8SocY9YfllocR-6Q_tjTtmt8q',
};

/** True when the platform itself still runs on the old IELTS project. */
export const oldIeltsIsSameProject = () => supabaseConfig?.url === OLD_IELTS.url;

const ENGINE_KEY = 'ielts:ielts-history';
const SEEN_KEY = 'ecyr:ielts-seen';
const PENDING_KEY = 'ecyr:ielts-pending-session';
/** Attempt keys (date|module) that already earned XP through a migration on this device. */
const XP_KEYS_KEY = 'ecyr:ielts-migrated-xp';
const LOG_MAX_BYTES = 1_800_000; // the table refuses ≥ 2 MB

export type MigrationSource = 'ielts-account' | 'ielts-session-file' | 'ecyr-progress-file';

// ---------------------------------------------------------------- storage ---
function lsGet(k: string): string | null {
  try {
    return localStorage.getItem(k);
  } catch {
    return null;
  }
}
function lsSet(k: string, v: string): boolean {
  try {
    localStorage.setItem(k, v);
    return true;
  } catch {
    return false;
  }
}
function lsDel(k: string) {
  try {
    localStorage.removeItem(k);
  } catch {
    /* storage unavailable */
  }
}
function readKeySet(k: string): Set<string> {
  try {
    const v = JSON.parse(lsGet(k) ?? '[]') as unknown;
    return new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
  } catch {
    return new Set();
  }
}

// ----------------------------------------------------------------- errors ---
function friendlyAuth(e: { message?: string; status?: number; code?: string; name?: string } | null | undefined): string {
  const msg = e?.message ?? '';
  if (e?.code === 'invalid_credentials' || /invalid login/i.test(msg))
    return 'Correo o contraseña incorrectos para tu cuenta del IELTS Simulator. Si entrabas con Google, usa la opción de archivo de sesión o crea una contraseña en la app original («¿Olvidaste tu contraseña?»).';
  if (e?.code === 'email_not_confirmed' || /email not confirmed/i.test(msg))
    return 'Esa cuenta del IELTS Simulator nunca confirmó su correo. Abre el enlace de confirmación que te llegó (o pide otro en la app original) y vuelve a intentarlo.';
  if (e?.status === 429 || /rate limit|too many/i.test(msg)) return 'Demasiados intentos seguidos. Espera un minuto y vuelve a probar.';
  if (e?.name === 'AuthRetryableFetchError' || /fetch|network|load failed/i.test(msg) || e?.status === 0)
    return 'No se pudo conectar con el IELTS Simulator. Revisa tu conexión a internet e inténtalo de nuevo.';
  return msg || 'No se pudo iniciar sesión en el IELTS Simulator.';
}

function friendlyDb(e: PostgrestError | { message?: string; code?: string } | null | undefined, what: string): string {
  const msg = e?.message ?? '';
  if (e?.code === '42501' || /permission denied|row-level security/i.test(msg)) return `${what}: permiso denegado por la base de datos.`;
  if (e?.code === 'PGRST205' || e?.code === '42P01' || /does not exist|schema cache/i.test(msg)) return `${what}: falta la tabla en la base de datos.`;
  if (/fetch|network/i.test(msg)) return `${what}: sin conexión.`;
  return `${what}: ${msg || 'error desconocido'}.`;
}
const isMissingTable = (e: { code?: string; message?: string } | null) =>
  !!e && (e.code === 'PGRST205' || e.code === '42P01' || /does not exist|schema cache/i.test(e.message ?? ''));

// ---------------------------------------------------- 1a. old IELTS account --
export interface OldIeltsDump {
  v: 1;
  source: { url: string; userId: string; email: string | null; fetchedAt: string };
  profile: OldProfile | null;
  progress: IeltsProgressLike & { updated_at: string | null };
  submissions: OldSubmission[];
  /** RLS hid the submissions because the teacher switched the history off. */
  submissionsHidden: boolean;
  feedback: OldFeedback[];
  homework: OldHomework[];
  warnings: string[];
}

export interface OldIeltsCounts {
  bands: number;
  history: number;
  submissions: number;
  writing: number;
  speaking: number;
  reading: number;
  listening: number;
  feedback: number;
  homework: number;
}

export function countDump(d: OldIeltsDump): OldIeltsCounts {
  const by = (m: string) => d.submissions.filter((s) => s.module === m).length;
  return {
    bands: Object.values(d.progress.scores).filter((x) => x !== null).length,
    history: d.progress.history.length,
    submissions: d.submissions.length,
    writing: by('writing'),
    speaking: by('speaking'),
    reading: by('reading'),
    listening: by('listening'),
    feedback: d.feedback.length,
    homework: d.homework.length,
  };
}

const PAGE = 200;
const MAX_ROWS = 3000;

async function pagedSelect<T>(
  q: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: PostgrestError | null }>,
  clean: (v: unknown) => T | null,
): Promise<{ rows: T[]; error: PostgrestError | null }> {
  const rows: T[] = [];
  for (let from = 0; from < MAX_ROWS; from += PAGE) {
    const { data, error } = await q(from, from + PAGE - 1);
    if (error) return { rows, error };
    for (const r of data ?? []) {
      const c = clean(r);
      if (c) rows.push(c);
    }
    if (!data || data.length < PAGE) break;
  }
  return { rows, error: null };
}

/**
 * Signs in to the ORIGINAL IELTS Simulator project with a separate, memory-only
 * client, reads the learner's own rows and signs that client out again.
 */
export async function connectOldIelts(
  email: string,
  password: string,
): Promise<{ ok: true; dump: OldIeltsDump; counts: OldIeltsCounts } | { ok: false; error: string }> {
  if (!email.trim() || !password) return { ok: false, error: 'Escribe el correo y la contraseña de tu cuenta del IELTS Simulator.' };
  let client: SupabaseClient;
  try {
    client = createClient(OLD_IELTS.url, OLD_IELTS.anonKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: 'ecyr-old-ielts' },
    });
  } catch {
    return { ok: false, error: 'No se pudo preparar la conexión con el IELTS Simulator.' };
  }
  let signedIn = false;
  try {
    const { data, error } = await client.auth.signInWithPassword({ email: email.trim(), password });
    if (error || !data.user) return { ok: false, error: friendlyAuth(error) };
    signedIn = true;
    const uid = data.user.id;
    const warnings: string[] = [];

    const [prof, prog, vis] = await Promise.all([
      client.from('profiles').select('id,email,full_name,role,teacher_id,class_code,created_at').eq('id', uid).maybeSingle(),
      client.from('progress').select('scores,history,updated_at').eq('student_id', uid).maybeSingle(),
      client.rpc('can_see_my_history'),
    ]);
    if (prof.error) warnings.push(friendlyDb(prof.error, 'Perfil'));
    if (prog.error) warnings.push(friendlyDb(prog.error, 'Bandas e historial'));
    // null = the project predates 03_history_visibility (history always visible).
    const historyVisible = vis.error ? null : vis.data === true;

    const subs = await pagedSelect(
      (a, b) =>
        client
          .from('submissions')
          .select('id,module,task,prompt,content,band,report,created_at')
          .eq('student_id', uid)
          .order('created_at', { ascending: true })
          .range(a, b),
      sanitizeSubmissionRow,
    );
    if (subs.error) warnings.push(friendlyDb(subs.error, 'Writings y speakings'));
    const submissionsHidden = historyVisible === false;
    if (submissionsHidden)
      warnings.push(
        'Tu docente tiene desactivado el historial en el IELTS Simulator, así que la base de datos no nos deja leer tus writings y speakings corregidos. Pídele que lo active un momento (Mi clase → Historial) y vuelve a conectar; tus bandas e historial sí se migran.',
      );

    const [fb, hw] = await Promise.all([
      pagedSelect(
        (a, b) =>
          client.from('feedback').select('id,teacher_id,message,created_at,read_at').eq('student_id', uid).order('created_at', { ascending: true }).range(a, b),
        sanitizeFeedbackRow,
      ),
      pagedSelect(
        (a, b) =>
          client
            .from('homework')
            .select('id,teacher_id,title,module,instructions,due_at,created_at,done_at,student_note')
            .eq('student_id', uid)
            .order('created_at', { ascending: true })
            .range(a, b),
        sanitizeHomeworkRow,
      ),
    ]);
    if (fb.error) warnings.push(friendlyDb(fb.error, 'Comentarios del docente'));
    if (hw.error) warnings.push(friendlyDb(hw.error, 'Tareas'));

    const profile = sanitizeProfileRow(prof.data);
    if (profile?.role === 'teacher')
      warnings.push('Esa cuenta es de docente: no tiene bandas ni writings propios. Tus estudiantes deben unirse a tu clase con el nuevo código.');
    const row = (prog.data ?? null) as { scores?: unknown; history?: unknown; updated_at?: unknown } | null;

    const dump: OldIeltsDump = {
      v: 1,
      source: { url: OLD_IELTS.url, userId: uid, email: data.user.email ?? null, fetchedAt: new Date().toISOString() },
      profile,
      progress: {
        scores: sanitizeIeltsScores(row?.scores),
        history: mergeIeltsHistory([], sanitizeIeltsHistory(row?.history)),
        updated_at: typeof row?.updated_at === 'string' ? row.updated_at : null,
      },
      submissions: subs.rows,
      submissionsHidden,
      feedback: fb.rows,
      homework: hw.rows,
      warnings,
    };
    return { ok: true, dump, counts: countDump(dump) };
  } catch (e) {
    return { ok: false, error: friendlyAuth(e as { message?: string }) };
  } finally {
    // Local scope only: never revoke the learner's sessions in the old app elsewhere.
    if (signedIn) await client.auth.signOut({ scope: 'local' }).catch(() => undefined);
  }
}

// -------------------------------------------------------------- shared bits --
interface PrevLog {
  source: MigrationSource;
  summary: Record<string, unknown>;
}

const strArr = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);

/** Previous migrations of this user (the dedupe memory that survives devices). */
async function loadPrevLogs(): Promise<{ logs: PrevLog[]; available: boolean }> {
  if (!supabase) return { logs: [], available: false };
  const { data, error } = await supabase.from('migrations_log').select('source,summary').order('created_at', { ascending: false }).limit(200);
  if (error) return { logs: [], available: false };
  return { logs: (data ?? []) as PrevLog[], available: true };
}

async function insertLog(source: MigrationSource, summary: Record<string, unknown>, payload: unknown): Promise<string | null> {
  if (!supabase) return 'Sin conexión.';
  const uid = useAuth.getState().session?.user.id;
  if (!uid) return 'Sin sesión.';
  const { error } = await supabase.from('migrations_log').insert({ user_id: uid, source, summary, payload });
  return error ? friendlyDb(error, 'Registro de migración') : null;
}

/** The signed-in user's IELTS `progress` row in the new project. */
async function readNewProgress(uid: string): Promise<{ data: IeltsProgressLike; error: string | null }> {
  if (!supabase) return { data: { scores: emptyScores(), history: [] }, error: null };
  const { data, error } = await supabase.from('progress').select('scores,history').eq('student_id', uid).maybeSingle();
  if (error) return { data: { scores: emptyScores(), history: [] }, error: friendlyDb(error, 'Progreso IELTS') };
  const r = (data ?? {}) as { scores?: unknown; history?: unknown };
  return { data: { scores: sanitizeIeltsScores(r.scores), history: sanitizeIeltsHistory(r.history) }, error: null };
}

async function writeNewProgress(uid: string, p: { scores: IeltsScores; history: IeltsHistoryEntry[] }): Promise<string | null> {
  if (!supabase) return null;
  const { error } = await supabase
    .from('progress')
    .upsert({ student_id: uid, scores: p.scores, history: p.history.slice(0, HISTORY_CAP), updated_at: new Date().toISOString() });
  return error ? friendlyDb(error, 'Progreso IELTS') : null;
}

interface EngineState {
  scores?: unknown;
  history?: unknown;
  progressOwner?: unknown;
}
const engine = (): { state?: EngineState; render?: () => void; importSession?: (d: unknown) => void } | undefined =>
  (window as unknown as { __ielts?: { state?: EngineState; render?: () => void; importSession?: (d: unknown) => void } }).__ielts;

/**
 * Writes bands + history where the simulator reads them: its localStorage
 * record (same format as the engine's saveHistory) and, when the engine is
 * already running (parked in the background), its in-memory state.
 */
function writeEngineLocal(p: { scores: IeltsScores; history: IeltsHistoryEntry[] }, owner: string | null) {
  const history = p.history.slice(0, HISTORY_CAP);
  lsSet(ENGINE_KEY, JSON.stringify({ history, scores: p.scores, owner }));
  const api = engine();
  if (api?.state) {
    api.state.scores = { ...p.scores };
    api.state.history = history.map((h) => ({ ...h }));
    api.state.progressOwner = owner;
    try {
      api.render?.();
    } catch {
      /* the engine redraws on its next visit */
    }
  }
}

/** The local engine record, when it belongs to `uid` (or to nobody yet). */
function localEngineFor(uid: string | null) {
  const rec = readEngineRecord(lsGet(ENGINE_KEY));
  const mine = !rec.owner || rec.owner === uid;
  return { rec, mine };
}

/**
 * Awards platform XP for migrated attempts through useProgress.award (so XP and
 * skill XP add up exactly as for a live attempt), then dates each activity on
 * the day the attempt really happened and leaves today's XP and the streak as
 * they were — a migration is not study done today.
 */
function awardBackdated(awards: IeltsAward[]): number {
  if (!awards.length) return 0;
  const before = useProgress.getState();
  const streak = before.streak;
  const daily = { ...before.dailyXp };
  let list = [...before.activity];
  const paid: IeltsAward[] = [];
  for (const a of awards) {
    const prevHead = useProgress.getState().activity[0];
    useProgress.getState().award(a.activity);
    const head = useProgress.getState().activity[0];
    if (!head || head === prevHead) continue; // award() declined (e.g. teacher practice sandbox)
    paid.push(a);
    list.push({ ...head, at: a.date });
    const d = dayKey(new Date(a.date));
    daily[d] = (daily[d] ?? 0) + a.activity.xp;
  }
  if (!paid.length) return 0;
  list = list.sort((x, y) => y.at.localeCompare(x.at)).slice(0, 150);
  useProgress.setState({ activity: list, dailyXp: daily, streak, updatedAt: new Date().toISOString() });
  const keys = readKeySet(XP_KEYS_KEY);
  for (const a of paid) keys.add(a.key);
  lsSet(XP_KEYS_KEY, JSON.stringify([...keys].slice(-5000)));
  return paid.reduce((s, a) => s + a.activity.xp, 0);
}

/** Teacher "free practice" records nothing, so no XP is planned (or logged as paid). */
const xpBlocked = () => useSettings.getState().practiceSandbox === true;

/**
 * IeltsPage's syncIeltsXp awards the newest `history.length - ecyr:ielts-seen`
 * attempts. Attempts that were still waiting for it are awarded here (they are
 * about to be reordered by the merge), and the counter is set to the new
 * length, so nothing is counted twice.
 */
function pendingLocalAwards(prevLocal: IeltsHistoryEntry[]): IeltsHistoryEntry[] {
  const seen = Number(lsGet(SEEN_KEY) ?? '0');
  const pending = Math.max(0, prevLocal.length - (Number.isFinite(seen) ? seen : 0));
  return prevLocal.slice(0, pending);
}

function xpSkipSet(prev: PrevLog[], extra: Iterable<string>) {
  const s = readKeySet(XP_KEYS_KEY);
  for (const l of prev) for (const k of strArr(l.summary.xpKeys)) s.add(k);
  for (const k of extra) s.add(k);
  return s;
}

// --------------------------------------------------- 1b. migrate the dump ---
export type MigrateStepId = 'prepare' | 'progress' | 'submissions' | 'profile' | 'log' | 'local';
export type StepStatus = 'running' | 'done' | 'skipped' | 'error';
export interface MigrateResult {
  ok: boolean;
  error?: string;
  alreadyDone: boolean;
  historyAdded: number;
  historyTotal: number;
  scores: IeltsScores;
  submissionsInserted: number;
  submissionsSkipped: number;
  feedback: number;
  homework: number;
  xpAwarded: number;
  nameSet: boolean;
  logged: boolean;
  warnings: string[];
}

let running = false;

export async function migrateOldIelts(dump: OldIeltsDump, onStep?: (id: MigrateStepId, s: StepStatus, note?: string) => void): Promise<MigrateResult> {
  const step = (id: MigrateStepId, s: StepStatus, note?: string) => onStep?.(id, s, note);
  const res: MigrateResult = {
    ok: false,
    alreadyDone: false,
    historyAdded: 0,
    historyTotal: 0,
    scores: emptyScores(),
    submissionsInserted: 0,
    submissionsSkipped: 0,
    feedback: dump.feedback.length,
    homework: dump.homework.length,
    xpAwarded: 0,
    nameSet: false,
    logged: false,
    warnings: [...dump.warnings],
  };
  const uid = useAuth.getState().session?.user.id;
  if (!supabase || !uid) return { ...res, error: 'Inicia sesión en ECYR English para migrar.' };
  if (oldIeltsIsSameProject() && dump.source.userId === uid)
    return { ...res, error: 'Es la misma cuenta con la que ya has entrado: tu progreso del IELTS ya está aquí.' };
  if (running) return { ...res, error: 'Ya hay una migración en curso.' };
  running = true;
  try {
    // ---- prepare: what is already here?
    step('prepare', 'running');
    const [prev, newProg, vis] = await Promise.all([loadPrevLogs(), readNewProgress(uid), supabase.rpc('can_see_my_history')]);
    if (newProg.error) {
      step('prepare', 'error', newProg.error);
      return { ...res, error: newProg.error };
    }
    const canRead = vis.error ? true : vis.data === true;
    const existingKeys = new Set<string>();
    for (const l of prev.logs) for (const k of strArr(l.summary.submissionKeys)) existingKeys.add(k);
    if (canRead) {
      const ex = await pagedSelect(
        (a, b) => supabase!.from('submissions').select('created_at,module,task').eq('student_id', uid).range(a, b),
        (v) => {
          const r = v as { created_at?: unknown; module?: unknown; task?: unknown };
          return typeof r.created_at === 'string' && typeof r.module === 'string'
            ? submissionKey({ created_at: r.created_at, module: r.module, task: typeof r.task === 'string' ? r.task : null })
            : null;
        },
      );
      if (ex.error) {
        step('prepare', 'error', friendlyDb(ex.error, 'Writings existentes'));
        return { ...res, error: friendlyDb(ex.error, 'Writings existentes') };
      }
      ex.rows.forEach((k) => existingKeys.add(k));
    }
    if (!prev.available) res.warnings.push('El registro de migraciones (08_migrations_log.sql) no está instalado en el servidor; se migra igual, pero sin historial de migraciones.');
    step('prepare', 'done');

    // ---- progress: bands + history
    step('progress', 'running');
    const { rec: local, mine } = localEngineFor(uid);
    const here = mergeIelts(newProg.data, mine ? local : { scores: emptyScores(), history: [] });
    const keysBefore = new Set(here.fullHistory.map(historyKey));
    const merged = mergeIelts({ scores: here.scores, history: here.fullHistory }, dump.progress);
    res.historyAdded = merged.added.length;
    res.historyTotal = merged.history.length;
    res.scores = merged.scores;
    const pErr = await writeNewProgress(uid, merged);
    if (pErr) {
      step('progress', 'error', pErr);
      return { ...res, error: pErr };
    }
    step('progress', 'done', `${merged.added.length} intentos nuevos`);

    // ---- submissions
    step('submissions', 'running');
    const migratedKeys = new Set<string>();
    if (dump.submissionsHidden && !dump.submissions.length) {
      step('submissions', 'skipped', 'historial oculto por tu docente');
    } else if (!canRead && !prev.available) {
      res.warnings.push('No se copiaron los writings/speakings: en tu cuenta nueva el historial está oculto y sin el registro de migraciones no podemos evitar duplicados.');
      step('submissions', 'skipped', 'no se puede comprobar duplicados');
    } else {
      const plan = planSubmissions(dump.submissions, existingKeys);
      res.submissionsSkipped = plan.skipped;
      dump.submissions.forEach((s) => existingKeys.has(submissionKey(s)) && migratedKeys.add(submissionKey(s)));
      // Batches capped by size: a report can carry the whole paper it was marked on.
      let batch: Record<string, unknown>[] = [];
      let batchKeys: string[] = [];
      let size = 0;
      const flush = async () => {
        if (!batch.length) return null;
        const { error } = await supabase!.from('submissions').insert(batch);
        if (error) return friendlyDb(error, 'Writings y speakings');
        res.submissionsInserted += batch.length;
        batchKeys.forEach((k) => migratedKeys.add(k));
        batch = [];
        batchKeys = [];
        size = 0;
        return null;
      };
      let subErr: string | null = null;
      for (const s of plan.toInsert) {
        const row = { student_id: uid, module: s.module, task: s.task, prompt: s.prompt, content: s.content, band: s.band, report: s.report, created_at: s.created_at };
        const n = jsonSize(row);
        if (batch.length && (size + n > 900_000 || batch.length >= 20)) subErr = await flush();
        if (subErr) break;
        batch.push(row);
        batchKeys.push(submissionKey(s));
        size += n;
      }
      if (!subErr) subErr = await flush();
      if (subErr) {
        res.warnings.push(`${subErr} Se copiaron ${res.submissionsInserted}; vuelve a migrar para completar (no se duplicará nada).`);
        step('submissions', 'error', subErr);
      } else step('submissions', 'done', `${res.submissionsInserted} copiados, ${res.submissionsSkipped} ya estaban`);
    }

    // ---- profile name
    step('profile', 'running');
    const prof = useAuth.getState().profile;
    const oldName = dump.profile?.full_name?.trim();
    if (oldName && !prof?.full_name?.trim()) {
      const { error } = await supabase.from('profiles').update({ full_name: oldName.slice(0, 120) }).eq('id', uid);
      if (error) res.warnings.push(friendlyDb(error, 'Nombre'));
      else {
        res.nameSet = true;
        void useAuth.getState().loadProfile();
      }
    }
    step('profile', res.nameSet ? 'done' : 'skipped');

    // ---- XP plan (applied after the log so the log carries the keys)
    const pendingLocal = mine ? pendingLocalAwards(local.history) : [];
    const skip = xpSkipSet(prev.logs, [...keysBefore].filter((k) => !pendingLocal.some((p) => historyKey(p) === k)));
    const awards = xpBlocked() ? [] : planAwards([...merged.added, ...pendingLocal], skip);

    // ---- log
    step('log', 'running');
    const prevForThis = prev.logs.filter((l) => l.source === 'ielts-account' && l.summary.oldUserId === dump.source.userId);
    const knownFb = new Set(prevForThis.flatMap((l) => strArr(l.summary.feedbackIds)));
    const knownHw = new Set(prevForThis.flatMap((l) => strArr(l.summary.homeworkIds)));
    const somethingNew =
      !prevForThis.length ||
      merged.added.length > 0 ||
      res.submissionsInserted > 0 ||
      awards.length > 0 ||
      dump.feedback.some((f) => !knownFb.has(f.id)) ||
      dump.homework.some((h) => !knownHw.has(h.id));
    if (!somethingNew) {
      res.alreadyDone = true;
      step('log', 'skipped', 'ya estaba todo migrado');
    } else if (prev.available) {
      const fullHistory = mergeIeltsHistory(merged.fullHistory, dump.progress.history);
      const payload: Record<string, unknown> = {
        v: 1,
        source: dump.source,
        profile: dump.profile,
        progress: { scores: dump.progress.scores, history: dump.progress.history, updated_at: dump.progress.updated_at },
        mergedHistory: fullHistory,
        feedback: dump.feedback,
        homework: dump.homework,
        submissions: dump.submissions,
        submissionsHidden: dump.submissionsHidden,
      };
      if (jsonSize(payload) > LOG_MAX_BYTES) {
        // The submissions themselves are already in public.submissions; keep an index.
        payload.submissions = dump.submissions.map(({ id, module, task, band, created_at }) => ({ id, module, task, band, created_at }));
        payload.submissionsTrimmed = true;
      }
      if (jsonSize(payload) > LOG_MAX_BYTES) payload.mergedHistory = fullHistory.slice(0, 300);
      const summary = {
        label: 'Cuenta del IELTS Simulator',
        oldUserId: dump.source.userId,
        oldEmail: dump.source.email,
        counts: {
          bands: Object.values(merged.scores).filter((x) => x !== null).length,
          history: dump.progress.history.length,
          historyAdded: merged.added.length,
          submissions: res.submissionsInserted,
          submissionsSkipped: res.submissionsSkipped,
          feedback: dump.feedback.length,
          homework: dump.homework.length,
          xp: awards.reduce((s, a) => s + a.activity.xp, 0),
        },
        submissionKeys: [...new Set([...migratedKeys])],
        xpKeys: awards.map((a) => a.key),
        feedbackIds: dump.feedback.map((f) => f.id),
        homeworkIds: dump.homework.map((h) => h.id),
      };
      const lErr = await insertLog('ielts-account', summary, payload);
      if (lErr) {
        res.warnings.push(lErr);
        step('log', 'error', lErr);
      } else {
        res.logged = true;
        step('log', 'done');
      }
    } else step('log', 'skipped', 'registro no instalado');

    // ---- this browser: simulator copy + platform XP
    step('local', 'running');
    writeEngineLocal(merged, uid);
    res.xpAwarded = awardBackdated(awards);
    lsSet(SEEN_KEY, String(Math.min(merged.history.length, HISTORY_CAP)));
    step('local', 'done', res.xpAwarded ? `+${res.xpAwarded} XP` : undefined);

    res.ok = true;
    return res;
  } catch (e) {
    return { ...res, error: friendlyDb(e as { message?: string }, 'Migración') };
  } finally {
    running = false;
  }
}

// ------------------------------------------------- 1c. IELTS session file ---
export function parseIeltsSessionFile(json: unknown) {
  return parseIeltsSession(json);
}

/** Reads a File as text with the 15 MB guard (before reading a byte of it). */
export async function readJsonFile(file: File): Promise<{ ok: true; value: unknown } | { ok: false; error: string }> {
  if (file.size > MAX_FILE_BYTES) return { ok: false, error: 'El archivo es demasiado grande (máximo 15 MB).' };
  if (file.size === 0) return { ok: false, error: 'El archivo está vacío.' };
  try {
    return parseJsonText(await file.text());
  } catch {
    return { ok: false, error: 'No se pudo leer el archivo.' };
  }
}

export interface SessionImportResult {
  ok: boolean;
  error?: string;
  historyAdded: number;
  historyTotal: number;
  scores: IeltsScores;
  synced: boolean;
  /** 'applied' = handed to the running simulator now; 'queued' = on its next start. */
  session: 'applied' | 'queued' | 'failed';
  dropped: string[];
  xpAwarded: number;
  logged: boolean;
  warnings: string[];
}

function dropFromSession(d: IeltsSessionData, what: 'audio' | 'banks'): IeltsSessionData {
  const c = { ...d };
  if (what === 'audio' && c.listening) c.listening = { ...c.listening, customAudio: {} };
  if (what === 'banks') {
    if (c.listening) delete (c.listening = { ...c.listening }).parts;
    if (c.reading) delete (c.reading = { ...c.reading }).passages;
    if (c.writing) delete (c.writing = { ...c.writing }).tasks;
    if (c.speaking) delete (c.speaking = { ...c.speaking }).questions;
  }
  return c;
}

export async function importIeltsSession(data: IeltsSessionData, summary?: IeltsSessionSummary): Promise<SessionImportResult> {
  const uid = useAuth.getState().session?.user.id ?? null;
  const res: SessionImportResult = {
    ok: false,
    historyAdded: 0,
    historyTotal: 0,
    scores: emptyScores(),
    synced: false,
    session: 'failed',
    dropped: [],
    xpAwarded: 0,
    logged: false,
    warnings: [],
  };
  if (running) return { ...res, error: 'Ya hay una importación en curso.' };
  running = true;
  try {
    const signedIn = !!(supabase && uid);
    const [prev, newProg] = signedIn ? await Promise.all([loadPrevLogs(), readNewProgress(uid!)]) : [{ logs: [], available: false }, null];
    if (newProg?.error) res.warnings.push(newProg.error);
    const { rec: local, mine } = localEngineFor(uid);
    const base = mergeIelts(newProg?.data ?? { scores: emptyScores(), history: [] }, mine || !uid ? local : { scores: emptyScores(), history: [] });
    const keysBefore = new Set(base.fullHistory.map(historyKey));
    const merged = mergeIelts({ scores: base.scores, history: base.fullHistory }, { scores: data.scores, history: data.history });
    res.historyAdded = merged.added.length;
    res.historyTotal = merged.history.length;
    res.scores = merged.scores;

    if (signedIn && !newProg?.error) {
      const err = await writeNewProgress(uid!, merged);
      if (err) res.warnings.push(err);
      else res.synced = true;
    }

    // The full session (drafts, transcripts, reports, generated banks) goes to the
    // engine — with the merged bands, so applySessionData cannot roll them back.
    const owner = uid ?? local.owner;
    writeEngineLocal(merged, owner);
    let toEngine: IeltsSessionData = { ...data, scores: merged.scores, history: merged.history };
    const api = engine();
    if (api && typeof api.importSession === 'function') {
      try {
        api.importSession(toEngine);
        res.session = 'applied';
      } catch {
        res.warnings.push('El simulador no pudo aplicar la sesión ahora; se aplicará la próxima vez que lo abras.');
      }
    }
    if (res.session !== 'applied') {
      let ok = lsSet(PENDING_KEY, JSON.stringify(toEngine));
      if (!ok && (summary?.customAudio ?? 1) > 0) {
        toEngine = dropFromSession(toEngine, 'audio');
        res.dropped.push('audios personalizados de Listening');
        ok = lsSet(PENDING_KEY, JSON.stringify(toEngine));
      }
      if (!ok) {
        toEngine = dropFromSession(toEngine, 'banks');
        res.dropped.push('exámenes generados');
        ok = lsSet(PENDING_KEY, JSON.stringify(toEngine));
      }
      res.session = ok ? 'queued' : 'failed';
      if (!ok) res.warnings.push('El navegador no tiene espacio para guardar la sesión completa; sólo se importaron las bandas y el historial.');
    }

    // XP once per new attempt (skip whatever any earlier import already paid).
    const pendingLocal = mine ? pendingLocalAwards(local.history) : [];
    const skip = xpSkipSet(prev.logs, [...keysBefore].filter((k) => !pendingLocal.some((p) => historyKey(p) === k)));
    const awards = xpBlocked() ? [] : planAwards([...merged.added, ...pendingLocal], skip);

    const hash = summary?.hash ?? summariseSession(data).hash;
    if (signedIn && prev.available) {
      const seenHash = prev.logs.some((l) => l.source === 'ielts-session-file' && l.summary.hash === hash);
      if (!seenHash || awards.length || merged.added.length) {
        const summ = {
          label: 'Archivo de sesión del IELTS',
          hash,
          counts: {
            bands: Object.values(merged.scores).filter((x) => x !== null).length,
            history: data.history.length,
            historyAdded: merged.added.length,
            writingReports: summary?.writingReports ?? 0,
            speakingTranscripts: summary?.speakingTranscripts ?? 0,
            xp: awards.reduce((s, a) => s + a.activity.xp, 0),
          },
          xpKeys: awards.map((a) => a.key),
        };
        const payload = { v: 1, meta: data._meta, candNo: data.candNo ?? null, scores: data.scores, history: data.history, summary: summary ?? null };
        const err = await insertLog('ielts-session-file', summ, payload);
        if (err) res.warnings.push(err);
        else res.logged = true;
      }
    }

    res.xpAwarded = awardBackdated(awards);
    lsSet(SEEN_KEY, String(Math.min(merged.history.length, HISTORY_CAP)));
    res.ok = true;
    return res;
  } catch (e) {
    return { ...res, error: friendlyDb(e as { message?: string }, 'Importación') };
  } finally {
    running = false;
  }
}

/**
 * Call once the IELTS engine is mounted (IeltsPage, after mountIelts resolves):
 * if a session file was imported while the simulator was closed, hand it over
 * now. The bands are re-merged with whatever the engine holds at this moment
 * (it may have pulled newer ones from the cloud), so nothing is rolled back.
 * Returns true when a session was applied.
 */
export function applyPendingIeltsSession(api: object | null | undefined): boolean {
  const raw = lsGet(PENDING_KEY);
  if (!raw || !api) return false;
  const a = api as { importSession?: unknown; state?: EngineState };
  if (typeof a.importSession !== 'function') return false;
  // Removed first: a session that breaks the engine must not be retried on every boot.
  lsDel(PENDING_KEY);
  const parsed = parseIeltsSession(raw); // re-validated: localStorage is not trusted either
  if (!parsed.ok) return false;
  const current: IeltsProgressLike = { scores: sanitizeIeltsScores(a.state?.scores), history: sanitizeIeltsHistory(a.state?.history) };
  const merged = mergeIelts(current, { scores: parsed.data.scores, history: parsed.data.history });
  try {
    (a.importSession as (d: unknown) => void)({ ...parsed.data, scores: merged.scores, history: merged.history });
  } catch (e) {
    console.warn('[migrate] session import failed', e);
    return false;
  }
  // Attempts that came from the file were already paid in XP by importIeltsSession.
  if (merged.added.length) {
    const seen = Number(lsGet(SEEN_KEY) ?? '0') || 0;
    lsSet(SEEN_KEY, String(Math.min(merged.history.length, seen + merged.added.length)));
  }
  return true;
}

export const hasPendingIeltsSession = () => lsGet(PENDING_KEY) !== null;

// --------------------------------------------------- 1d. ECYR progress file --
export function parseEcyrProgressFile(json: unknown) {
  return parseEcyrProgress(json);
}

export interface EcyrImportResult {
  ok: boolean;
  error?: string;
  xpBefore: number;
  xpAfter: number;
  planApplied: boolean;
  avatarApplied: boolean;
  logged: boolean;
  warnings: string[];
}

/** Merges (never replaces) a platform progress export into this account/device. */
export async function importEcyrProgress(file: EcyrProgressFile): Promise<EcyrImportResult> {
  const res: EcyrImportResult = { ok: false, xpBefore: useProgress.getState().xp, xpAfter: 0, planApplied: false, avatarApplied: false, logged: false, warnings: [] };
  try {
    useProgress.getState().replace(mergeProgress(snapshot(), file.progress));
    res.xpAfter = useProgress.getState().xp;
    const plan = sanitizePlan(file.plan);
    if (plan && plan.updatedAt > usePlan.getState().updatedAt) {
      usePlan.getState().replace(plan);
      res.planApplied = true;
    }
    if (file.avatar && file.avatar.updatedAt > useAvatar.getState().updatedAt) {
      useAvatar.getState().replace(file.avatar.config, file.avatar.updatedAt);
      res.avatarApplied = true;
    }
    // The sync in lib/sync.ts pushes the merged state to the cloud on its own.
    const uid = useAuth.getState().session?.user.id;
    if (supabase && uid) {
      const prev = await loadPrevLogs();
      const dup = prev.logs.some((l) => l.source === 'ecyr-progress-file' && l.summary.hash === file.summary.hash);
      if (prev.available && !dup) {
        let payload: Record<string, unknown> = { v: 1, progress: file.progress, plan: plan ?? null, avatar: file.avatar };
        if (jsonSize(payload) > LOG_MAX_BYTES) payload = { v: 1, progress: { ...file.progress, activity: [] }, trimmed: true };
        const err = await insertLog(
          'ecyr-progress-file',
          {
            label: 'Progreso de ECYR English',
            hash: file.summary.hash,
            counts: { xp: file.summary.xp, units: file.summary.units, topics: file.summary.topics, activity: file.summary.activity },
          },
          payload,
        );
        if (err) res.warnings.push(err);
        else res.logged = true;
      }
    }
    res.ok = true;
    return res;
  } catch (e) {
    return { ...res, error: (e as Error).message || 'No se pudo combinar el progreso.' };
  }
}

// --------------------------------------------------------------- history ---
export interface MigrationLogRow {
  id: string;
  source: MigrationSource;
  created_at: string;
  label: string | null;
  counts: Record<string, number> | null;
}

export async function listMigrations(): Promise<{ rows: MigrationLogRow[]; error: string | null; missing: boolean }> {
  if (!supabase || !useAuth.getState().session) return { rows: [], error: null, missing: false };
  const { data, error } = await supabase
    .from('migrations_log')
    .select('id,source,created_at,label:summary->>label,counts:summary->counts')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) return { rows: [], error: friendlyDb(error, 'Historial de migraciones'), missing: isMissingTable(error) };
  return { rows: (data ?? []) as unknown as MigrationLogRow[], error: null, missing: false };
}
