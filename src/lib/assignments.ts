/**
 * "Tareas" — typed client for teacher-assigned tasks (supabase/migrations/09_assignments.sql).
 *
 *   assignments          what the teacher asked for (title, instructions, kind,
 *                        target link + completion refs, level, due date…)
 *   assignment_targets   chosen students when audience = 'students'
 *   assignment_status    one row per (assignment, student); no row = pending
 *
 * Row-level security does the real access control. The pure helpers at the
 * top (`autoDetect`, `dueInfo`, `effectiveStatus`, `validateTo`) have no
 * runtime imports besides the Supabase client used by the API below, so they
 * are easy to unit-test.
 */
import type { CefrLevel } from '@/content/types';
import type { Activity } from '@/store/progress';
import { supabase } from '@/lib/supabase';

// ------------------------------------------------------------------ types --

export const ASSIGNMENT_KINDS = ['unit', 'grammar', 'practice', 'game', 'ielts', 'reading', 'writing', 'speaking', 'listening', 'custom'] as const;
export type AssignmentKind = (typeof ASSIGNMENT_KINDS)[number];

export type AssignmentStatusValue = 'pending' | 'done' | 'late' | 'excused';
export type AssignmentVia = 'auto' | 'manual' | 'submission';
export type AssignmentAudience = 'class' | 'students';

/** What to do and how completion is detected. Stored as jsonb. */
export interface AssignmentTarget {
  /** In-app link for "Empezar" (must start with a single "/"). */
  to?: string | null;
  /** Activity refs that complete the task, e.g. "unit:A1-3". */
  refs?: string[];
  /** …or ref prefixes, e.g. "grammar:modals". */
  refPrefix?: string[];
  /** Optional score (0–100) the activity must reach. */
  minScore?: number | null;
  /** Human summary of the target ("A1 · Unidad 3 · Práctica"). */
  label?: string;
  level?: CefrLevel;
}

export interface Assignment {
  id: string;
  teacher_id: string;
  title: string;
  instructions: string | null;
  kind: AssignmentKind;
  target: AssignmentTarget;
  level: CefrLevel | null;
  due_at: string | null;
  requires_submission: boolean;
  audience: AssignmentAudience;
  created_at: string;
  updated_at: string;
  /** Teacher view only: targeted student ids (audience = 'students'). */
  targets?: string[];
}

export interface AssignmentStatus {
  assignment_id: string;
  student_id: string;
  status: AssignmentStatusValue;
  done_at: string | null;
  via: AssignmentVia | null;
  score: number | null;
  portfolio_item_id: string | null;
  student_note: string | null;
  teacher_feedback: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  updated_at: string;
}

export interface AssignmentDraft {
  title: string;
  instructions?: string | null;
  kind: AssignmentKind;
  target: AssignmentTarget;
  level?: CefrLevel | null;
  due_at?: string | null;
  requires_submission?: boolean;
  audience?: AssignmentAudience;
  /** Student ids, used when audience = 'students'. */
  students?: string[];
}

export interface StudentLite {
  id: string;
  full_name: string | null;
  email: string | null;
}

/** A status row the student is about to write (what autoDetect returns). */
export interface StatusUpdate {
  assignment_id: string;
  status: 'done' | 'late';
  via: AssignmentVia;
  done_at: string;
  score: number | null;
}

// ----------------------------------------------------------- pure helpers --

export const MAX_TITLE = 160;
export const MAX_INSTRUCTIONS = 4000;
export const MAX_NOTE = 1000;
export const MAX_FEEDBACK = 2000;

/** Mirrors the SQL check on target.to: an in-app path, never protocol-relative. */
export function validateTo(to: string | null | undefined): boolean {
  if (to == null || to === '') return true;
  return to.length <= 400 && to.startsWith('/') && to[1] !== '/' && to[1] !== '\\' && !/[\s\u0000-\u001f\u007f]/.test(to);
}

/** Does the assignment have something the activity log can tick off? */
export function isAutoDetectable(a: Pick<Assignment, 'target' | 'requires_submission'>): boolean {
  return !a.requires_submission && Boolean(a.target?.refs?.length || a.target?.refPrefix?.length);
}

/** Same matching idea as the weekly planner: exact refs or ref prefixes. */
export function activityMatches(t: AssignmentTarget, act: Pick<Activity, 'ref' | 'score'>): boolean {
  const ref = act.ref ?? '';
  if (!ref) return false;
  const hit = (t.refs?.includes(ref) ?? false) || (t.refPrefix?.some((p) => p && ref.startsWith(p)) ?? false);
  if (!hit) return false;
  if (t.minScore != null && Number.isFinite(t.minScore)) return typeof act.score === 'number' && act.score >= t.minScore;
  return true;
}

/** Clock-skew allowance: activity logged up to a minute before the task was created still counts. */
const GRACE_MS = 60_000;

/**
 * Finds pending assignments the activity log already completes.
 *
 * Rules: the assignment has refs/refPrefix, does not require a submission, is
 * not done / late / excused yet, and an activity with a matching ref (and
 * score ≥ minScore, when set) was logged after the assignment was created.
 * done_at = the first such activity; score = the best matching score;
 * status = 'late' when done_at is after due_at.
 */
export function autoDetect(
  assignments: Assignment[],
  statuses: Pick<AssignmentStatus, 'assignment_id' | 'status'>[],
  activity: Pick<Activity, 'ref' | 'score' | 'at'>[],
): StatusUpdate[] {
  const byId = new Map(statuses.map((s) => [s.assignment_id, s.status]));
  const out: StatusUpdate[] = [];
  for (const a of assignments) {
    const st = byId.get(a.id);
    if (st && st !== 'pending') continue;
    if (!isAutoDetectable(a)) continue;
    const since = new Date(a.created_at).getTime() - GRACE_MS;
    const hits = activity.filter((x) => new Date(x.at).getTime() >= since && activityMatches(a.target, x));
    if (!hits.length) continue;
    const first = hits.reduce((m, x) => (x.at < m.at ? x : m));
    const scores = hits.map((x) => x.score).filter((s): s is number => typeof s === 'number' && Number.isFinite(s));
    const done_at = new Date(first.at).toISOString();
    const late = a.due_at != null && new Date(done_at).getTime() > new Date(a.due_at).getTime();
    out.push({
      assignment_id: a.id,
      status: late ? 'late' : 'done',
      via: 'auto',
      done_at,
      score: scores.length ? Math.max(0, Math.min(100, Math.round(Math.max(...scores)))) : null,
    });
  }
  return out;
}

export type EffectiveStatus = 'pending' | 'overdue' | 'done' | 'late' | 'excused';

/** Status as the UI shows it: a pending task past its due date is "overdue". */
export function effectiveStatus(a: Pick<Assignment, 'due_at'>, s: Pick<AssignmentStatus, 'status'> | null | undefined, now = new Date()): EffectiveStatus {
  const st = s?.status ?? 'pending';
  if (st !== 'pending') return st;
  return a.due_at && new Date(a.due_at).getTime() < now.getTime() ? 'overdue' : 'pending';
}

export const isFinished = (s: EffectiveStatus) => s === 'done' || s === 'late' || s === 'excused';

export type DueTone = 'none' | 'overdue' | 'soon' | 'normal';

/** "vence mañana", "venció hace 2 días"… with a tone for colour: overdue (red), < 48 h (orange). */
export function dueInfo(due: string | null | undefined, now = new Date()): { tone: DueTone; label: string; exact: string } {
  if (!due) return { tone: 'none', label: 'Sin fecha límite', exact: '' };
  const d = new Date(due);
  const diff = d.getTime() - now.getTime();
  const exact = d.toLocaleString('es', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  const abs = Math.abs(diff);
  const rel =
    abs < 3_600_000
      ? rtf.format(Math.round(diff / 60_000), 'minute')
      : abs < 86_400_000
        ? rtf.format(Math.round(diff / 3_600_000), 'hour')
        : rtf.format(dayDiff(now, d), 'day');
  if (diff < 0) return { tone: 'overdue', label: `Venció ${rel}`, exact };
  return { tone: diff < 48 * 3_600_000 ? 'soon' : 'normal', label: `Vence ${rel}`, exact };
}

/** Calendar-day difference (so "mañana" means tomorrow, not "in 24 h"). */
function dayDiff(a: Date, b: Date) {
  const x = new Date(a.getFullYear(), a.getMonth(), a.getDate()).getTime();
  const y = new Date(b.getFullYear(), b.getMonth(), b.getDate()).getTime();
  return Math.round((y - x) / 86_400_000);
}

/** Pending first by due date (no date last), then newest. */
export function sortByDue(a: Pick<Assignment, 'due_at' | 'created_at'>, b: Pick<Assignment, 'due_at' | 'created_at'>) {
  if (a.due_at && b.due_at) return a.due_at.localeCompare(b.due_at);
  if (a.due_at) return -1;
  if (b.due_at) return 1;
  return b.created_at.localeCompare(a.created_at);
}

/** Students an assignment is addressed to, given the class roster. */
export function audienceOf(a: Pick<Assignment, 'audience' | 'targets'>, roster: string[]): string[] {
  if (a.audience === 'class') return roster;
  const t = new Set(a.targets ?? []);
  return roster.filter((id) => t.has(id));
}

// -------------------------------------------------------------------- API --

const A = 'assignments';
const T = 'assignment_targets';
const S = 'assignment_status';

function client() {
  if (!supabase) throw new Error('Las cuentas no están configuradas en este despliegue.');
  return supabase;
}

async function myId(): Promise<string> {
  const { data } = await client().auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error('Inicia sesión para ver tus tareas.');
  return uid;
}

/** Turns PostgREST errors into something actionable, in Spanish. */
function friendly(e: unknown, fallback: string): Error {
  const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message: unknown }).message) : String(e ?? '');
  const code = e && typeof e === 'object' && 'code' in e ? String((e as { code: unknown }).code) : '';
  if (code === 'PGRST205' || code === '42P01' || code === 'PGRST202' || (/assignment/i.test(msg) && /not find|not found|does not exist/i.test(msg)))
    return new Error('El servidor aún no tiene "Tareas". Pide al administrador ejecutar supabase/migrations/09_assignments.sql.');
  if (/must be handed in/i.test(msg)) return new Error('Esta tarea se entrega con un trabajo de tu portafolio.');
  if (/one of your own items/i.test(msg)) return new Error('Solo puedes entregar trabajos de tu propio portafolio.');
  if (/excused this task/i.test(msg)) return new Error('Tu profesor te eximió de esta tarea.');
  if (/only the teacher can excuse/i.test(msg)) return new Error('Solo el profesor puede eximir una tarea.');
  if (/not assigned to (you|this student)|not in your class/i.test(msg)) return new Error('Esa tarea no está asignada a este estudiante.');
  if (/assignments_target_valid/i.test(msg)) return new Error('El enlace de la tarea debe ser una ruta de la plataforma (empieza por "/").');
  if (/assignments_title_len/i.test(msg)) return new Error(`El título debe tener entre 1 y ${MAX_TITLE} caracteres.`);
  if (/between 0 and 100|assignment_status_score/i.test(msg)) return new Error('La nota va de 0 a 100.');
  if (/too long|_len/i.test(msg)) return new Error('El texto es demasiado largo.');
  if (/row-level security|permission denied|42501/i.test(msg)) return new Error('No tienes permiso para hacer esto.');
  if (/failed to fetch|network/i.test(msg)) return new Error('Sin conexión. Revisa tu internet e inténtalo de nuevo.');
  return new Error(msg || fallback);
}

function normA(r: unknown): Assignment {
  const x = r as Assignment & { assignment_targets?: { student_id: string }[] };
  const { assignment_targets, ...rest } = x;
  const target = x.target && typeof x.target === 'object' && !Array.isArray(x.target) ? x.target : {};
  return { ...rest, target, ...(assignment_targets ? { targets: assignment_targets.map((t) => t.student_id) } : {}) };
}

function normS(r: unknown): AssignmentStatus {
  const x = r as AssignmentStatus;
  return { ...x, score: x.score == null ? null : Number(x.score) };
}

function cleanDraft(d: Partial<AssignmentDraft>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (d.title !== undefined) {
    const t = d.title.trim();
    if (!t) throw new Error('Ponle un título a la tarea.');
    out.title = t.slice(0, MAX_TITLE);
  }
  if (d.instructions !== undefined) out.instructions = d.instructions?.trim().slice(0, MAX_INSTRUCTIONS) || null;
  if (d.kind !== undefined) out.kind = d.kind;
  if (d.target !== undefined) {
    const t = d.target ?? {};
    if (!validateTo(t.to)) throw new Error('El enlace debe ser una ruta de la plataforma, por ejemplo /learn/a1/3.');
    const target: AssignmentTarget = {};
    if (t.to) target.to = t.to;
    if (t.refs?.length) target.refs = t.refs.filter(Boolean);
    if (t.refPrefix?.length) target.refPrefix = t.refPrefix.filter(Boolean);
    if (t.minScore != null && Number.isFinite(t.minScore)) target.minScore = Math.max(0, Math.min(100, t.minScore));
    if (t.label) target.label = t.label.slice(0, 200);
    if (t.level) target.level = t.level;
    out.target = target;
  }
  if (d.level !== undefined) out.level = d.level || null;
  if (d.due_at !== undefined) out.due_at = d.due_at || null;
  if (d.requires_submission !== undefined) out.requires_submission = Boolean(d.requires_submission);
  if (d.audience !== undefined) out.audience = d.audience;
  return out;
}

// ---- teacher ----

/** The signed-in teacher's assignments, newest first, with their targets. */
export async function listMyAssignments(): Promise<Assignment[]> {
  const uid = await myId();
  const { data, error } = await client()
    .from(A)
    .select('*, assignment_targets(student_id)')
    .eq('teacher_id', uid)
    .order('created_at', { ascending: false });
  if (error) throw friendly(error, 'No se pudieron cargar las tareas.');
  return (data ?? []).map(normA);
}

/** Students of the signed-in teacher (light: no progress documents). */
export async function listMyStudents(): Promise<StudentLite[]> {
  const uid = await myId();
  const { data, error } = await client().from('profiles').select('id,full_name,email').eq('teacher_id', uid).order('full_name', { ascending: true });
  if (error) throw friendly(error, 'No se pudo cargar la clase.');
  return (data ?? []) as StudentLite[];
}

export async function createAssignment(d: AssignmentDraft): Promise<Assignment> {
  const sb = client();
  const uid = await myId();
  const row = { ...cleanDraft(d), teacher_id: uid };
  const { data, error } = await sb.from(A).insert(row).select('*').single();
  if (error) throw friendly(error, 'No se pudo crear la tarea.');
  const created = normA(data);
  if (created.audience === 'students') {
    try {
      created.targets = await setTargets(created.id, d.students ?? []);
    } catch (e) {
      await sb.from(A).delete().eq('id', created.id);
      throw e;
    }
  }
  return created;
}

export async function updateAssignment(id: string, patch: Partial<AssignmentDraft>): Promise<Assignment> {
  const { data, error } = await client().from(A).update(cleanDraft(patch)).eq('id', id).select('*, assignment_targets(student_id)').single();
  if (error) throw friendly(error, 'No se pudieron guardar los cambios.');
  const a = normA(data);
  if (patch.students !== undefined && a.audience === 'students') a.targets = await setTargets(id, patch.students);
  return a;
}

export async function deleteAssignment(id: string): Promise<void> {
  const { error } = await client().from(A).delete().eq('id', id);
  if (error) throw friendly(error, 'No se pudo eliminar la tarea.');
}

/** Makes the target list exactly `studentIds` (adds and removes as needed). Returns the final list. */
export async function setTargets(id: string, studentIds: string[]): Promise<string[]> {
  const sb = client();
  const want = [...new Set(studentIds)];
  const { data, error } = await sb.from(T).select('student_id').eq('assignment_id', id);
  if (error) throw friendly(error, 'No se pudieron guardar los estudiantes.');
  const have = new Set((data ?? []).map((r) => r.student_id as string));
  const add = want.filter((s) => !have.has(s));
  const remove = [...have].filter((s) => !want.includes(s));
  if (remove.length) {
    const r = await sb.from(T).delete().eq('assignment_id', id).in('student_id', remove);
    if (r.error) throw friendly(r.error, 'No se pudieron guardar los estudiantes.');
  }
  if (add.length) {
    const r = await sb.from(T).insert(add.map((student_id) => ({ assignment_id: id, student_id })));
    if (r.error) throw friendly(r.error, 'No se pudieron guardar los estudiantes.');
  }
  return want;
}

/** Status rows for these assignments (every student who has one). Missing row = pending. */
export async function classStatus(assignmentIds: string[]): Promise<AssignmentStatus[]> {
  if (!assignmentIds.length) return [];
  const { data, error } = await client().from(S).select('*').in('assignment_id', assignmentIds);
  if (error) throw friendly(error, 'No se pudo cargar el avance de la clase.');
  return (data ?? []).map(normS);
}

/** Status rows of one student across the teacher's assignments. */
export async function studentStatus(studentId: string): Promise<AssignmentStatus[]> {
  const { data, error } = await client().from(S).select('*').eq('student_id', studentId);
  if (error) throw friendly(error, 'No se pudo cargar el avance del estudiante.');
  return (data ?? []).map(normS);
}

export interface SubmissionItem {
  id: string;
  user_id: string;
  title: string;
  kind: string;
  text_content: string | null;
  file_path: string | null;
  file_name: string | null;
  file_type: string | null;
  created_at: string;
}

/** The portfolio items handed in for these status rows (RLS: the teacher reads their students' items). */
export async function submissionItems(ids: string[]): Promise<Record<string, SubmissionItem>> {
  const want = [...new Set(ids.filter(Boolean))];
  if (!want.length) return {};
  const { data, error } = await client()
    .from('portfolio_items')
    .select('id,user_id,title,kind,text_content,file_path,file_name,file_type,created_at')
    .in('id', want);
  if (error) throw friendly(error, 'No se pudieron cargar las entregas.');
  return Object.fromEntries(((data ?? []) as SubmissionItem[]).map((r) => [r.id, r]));
}

/**
 * Teacher review: feedback, score (0–100) and/or excuse.
 * `excused`: true → excused; false → un-excuse (back to pending); undefined → status unchanged.
 */
export async function review(
  assignmentId: string,
  studentId: string,
  r: { feedback?: string | null; score?: number | null; excused?: boolean | null },
): Promise<AssignmentStatus> {
  const { data, error } = await client().rpc('review_assignment', {
    p_assignment: assignmentId,
    p_student: studentId,
    p_feedback: r.feedback?.trim() || null,
    p_score: r.score != null && Number.isFinite(r.score) ? r.score : null,
    p_excused: r.excused ?? null,
  });
  if (error) throw friendly(error, 'No se pudo guardar la revisión.');
  return normS(data);
}

// ---- student ----

/** Assignments addressed to the signed-in student (RLS: their teacher's, class-wide or targeted). */
export async function listForMe(teacherId?: string | null): Promise<Assignment[]> {
  let q = client().from(A).select('*');
  if (teacherId) q = q.eq('teacher_id', teacherId);
  const { data, error } = await q.order('due_at', { ascending: true, nullsFirst: false }).order('created_at', { ascending: false });
  if (error) throw friendly(error, 'No se pudieron cargar tus tareas.');
  return (data ?? []).map(normA);
}

export async function myStatus(): Promise<AssignmentStatus[]> {
  const uid = await myId();
  const { data, error } = await client().from(S).select('*').eq('student_id', uid);
  if (error) throw friendly(error, 'No se pudo cargar el estado de tus tareas.');
  return (data ?? []).map(normS);
}

/** Marks a task done (the server turns it into 'late' after the due date). */
export async function markDone(
  assignmentId: string,
  o: { via?: AssignmentVia; score?: number | null; portfolioItemId?: string | null; note?: string | null; doneAt?: string } = {},
): Promise<AssignmentStatus> {
  const uid = await myId();
  const row: Record<string, unknown> = {
    assignment_id: assignmentId,
    student_id: uid,
    status: 'done',
    via: o.via ?? (o.portfolioItemId ? 'submission' : 'manual'),
    done_at: o.doneAt ?? new Date().toISOString(),
  };
  if (o.score !== undefined) row.score = o.score != null && Number.isFinite(o.score) ? Math.max(0, Math.min(100, o.score)) : null;
  if (o.portfolioItemId !== undefined) row.portfolio_item_id = o.portfolioItemId;
  if (o.note !== undefined) row.student_note = o.note?.trim().slice(0, MAX_NOTE) || null;
  const { data, error } = await client().from(S).upsert(row, { onConflict: 'assignment_id,student_id' }).select('*').single();
  if (error) throw friendly(error, 'No se pudo marcar la tarea.');
  return normS(data);
}

/** Undo: back to pending (keeps the teacher's feedback). */
export async function markPending(assignmentId: string): Promise<AssignmentStatus> {
  const uid = await myId();
  const { data, error } = await client()
    .from(S)
    .upsert({ assignment_id: assignmentId, student_id: uid, status: 'pending' }, { onConflict: 'assignment_id,student_id' })
    .select('*')
    .single();
  if (error) throw friendly(error, 'No se pudo deshacer.');
  return normS(data);
}

/** Persists what autoDetect found, in one request. */
export async function saveDetected(updates: StatusUpdate[]): Promise<AssignmentStatus[]> {
  if (!updates.length) return [];
  const uid = await myId();
  const rows = updates.map((u) => ({ ...u, student_id: uid }));
  const { data, error } = await client().from(S).upsert(rows, { onConflict: 'assignment_id,student_id' }).select('*');
  if (error) throw friendly(error, 'No se pudo guardar el avance de tus tareas.');
  return (data ?? []).map(normS);
}

/** Same functions, grouped. */
export const assignments = {
  listMine: listMyAssignments,
  listStudents: listMyStudents,
  create: createAssignment,
  update: updateAssignment,
  remove: deleteAssignment,
  setTargets,
  classStatus,
  studentStatus,
  review,
  listForMe,
  myStatus,
  markDone,
  markPending,
  saveDetected,
  autoDetect,
};
