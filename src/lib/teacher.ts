/**
 * What a teacher reads about their class. Everything goes through RLS:
 * profiles_select_students, learner_state_select_class, progress_select_class
 * and submissions_select_class only return rows of the teacher's own students.
 */
import { supabase } from './supabase';
import { initialProgress, mergeProgress, type ProgressData } from '@/store/progress';
import { sanitizePlan, type PlanData } from '@/store/plan';
import { sanitizeDefenders, sanitizeSessions, type GameSession } from '@/store/games';
import { sanitizeAvatar, type AvatarConfig } from '@/store/avatar';
import { ieltsFrom, type IeltsSnapshot } from './ielts';

export interface StudentRow {
  id: string;
  email: string | null;
  full_name: string | null;
  created_at: string | null;
}

export interface StudentData {
  profile: StudentRow;
  progress: ProgressData;
  plan: PlanData | null;
  games: GameSession[];
  defenders: ReturnType<typeof sanitizeDefenders>;
  avatar: AvatarConfig;
  ielts: IeltsSnapshot;
  /** Last time the learner's platform record was saved. */
  syncedAt: string | null;
}

export interface Submission {
  id: string;
  student_id: string;
  module: string;
  task: string | null;
  prompt: string | null;
  content: string | null;
  band: number | null;
  created_at: string;
}

/** Turns an untrusted learner_state document into typed pieces. */
export function parseLearnerState(state: unknown) {
  const s = (state && typeof state === 'object' ? state : {}) as Record<string, unknown>;
  // mergeProgress with an empty record fills every missing field with defaults.
  let progress = initialProgress();
  try {
    if (typeof s.xp === 'number') progress = mergeProgress(initialProgress(), { ...initialProgress(), ...(s as Partial<ProgressData>) } as ProgressData);
  } catch {
    progress = initialProgress();
  }
  const av = s.avatar as { config?: unknown } | undefined;
  return {
    progress,
    plan: sanitizePlan(s.plan),
    games: sanitizeSessions(s.gameSessions),
    defenders: sanitizeDefenders(s.defenders),
    avatar: sanitizeAvatar(av?.config),
  };
}

export async function loadClass(teacherId: string): Promise<{ students: StudentData[]; error: string | null }> {
  if (!supabase) return { students: [], error: 'Las cuentas no están configuradas en este despliegue.' };
  const { data: profiles, error } = await supabase
    .from('profiles')
    .select('id,email,full_name,created_at')
    .eq('teacher_id', teacherId)
    .order('full_name', { ascending: true });
  if (error) return { students: [], error: error.message };
  const rows = (profiles ?? []) as StudentRow[];
  if (!rows.length) return { students: [], error: null };
  const ids = rows.map((r) => r.id);
  const [ls, pr] = await Promise.all([
    supabase.from('learner_state').select('user_id,state,updated_at').in('user_id', ids),
    supabase.from('progress').select('student_id,scores,history').in('student_id', ids),
  ]);
  const byState = new Map((ls.data ?? []).map((r) => [r.user_id as string, r as { state: unknown; updated_at: string }]));
  const byIelts = new Map((pr.data ?? []).map((r) => [r.student_id as string, r as { scores: unknown; history: unknown }]));
  return {
    students: rows.map((profile) => {
      const st = byState.get(profile.id);
      const parsed = parseLearnerState(st?.state);
      const ie = byIelts.get(profile.id);
      return { profile, ...parsed, ielts: ieltsFrom(ie?.scores, ie?.history), syncedAt: st?.updated_at ?? null };
    }),
    error: ls.error?.message ?? pr.error?.message ?? null,
  };
}

const SUB_COLS = 'id,student_id,module,task,prompt,content,band,created_at';

/**
 * A student's submissions, newest first. `modules` narrows it (e.g. writing +
 * speaking for "Trabajos"). The heavy `report` is loaded on demand.
 */
export async function loadSubmissions(studentId: string, opts: { modules?: string[]; limit?: number } = {}): Promise<Submission[]> {
  if (!supabase) return [];
  let q = supabase.from('submissions').select(SUB_COLS).eq('student_id', studentId);
  if (opts.modules?.length) q = q.in('module', opts.modules);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(opts.limit ?? 150);
  if (error) console.warn('[teacher] submissions failed:', error.message);
  return (data ?? []) as Submission[];
}

/** The latest submissions across the class (RLS: only the teacher's own students). */
export async function loadClassSubmissions(studentIds: string[], opts: { modules?: string[]; limit?: number } = {}): Promise<Submission[]> {
  if (!supabase || !studentIds.length) return [];
  let q = supabase.from('submissions').select(SUB_COLS).in('student_id', studentIds.slice(0, 300));
  if (opts.modules?.length) q = q.in('module', opts.modules);
  const { data, error } = await q.order('created_at', { ascending: false }).limit(opts.limit ?? 80);
  if (error) console.warn('[teacher] class submissions failed:', error.message);
  return (data ?? []) as Submission[];
}

/** The AI feedback / report of one submission (jsonb, any shape). */
export async function loadSubmissionReport(id: string): Promise<unknown> {
  if (!supabase) return null;
  const { data } = await supabase.from('submissions').select('report').eq('id', id).maybeSingle();
  return (data as { report?: unknown } | null)?.report ?? null;
}
