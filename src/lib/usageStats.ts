/**
 * Owner-only usage statistics (supabase/migrations/23_usage_analytics.sql).
 * Every call is a SECURITY DEFINER function that refuses anyone who is not in `platform_admins`.
 */
import { supabase } from './supabase';
import { CATEGORIES, FEATURES, categoryOf, featureDef, type UsageCategory } from './usageFeatures';

export interface FeatureStat {
  feature: string;
  users: number;
  events: number;
  opens: number;
  minutes: number;
  last_at: string | null;
}
export interface DayStat {
  day: string;
  users: number;
  events: number;
  minutes: number;
}
export interface RoleStat {
  feature: string;
  role: 'student' | 'teacher';
  users: number;
  events: number;
  minutes: number;
}
export interface Overview {
  students: number;
  teachers: number;
  events: number;
  minutes: number;
  total_students: number;
}
export interface BaselineStat {
  feature: string;
  users: number;
  events: number;
  last_at: string | null;
  source: string;
}

/** The migration has not been applied (or the API cache has not reloaded yet). */
export class UsageMissingError extends Error {
  constructor() {
    super('Aplica supabase/migrations/23_usage_analytics.sql y 24_usage_by_student.sql');
  }
}

function fail(error: { code?: string; message: string; status?: number }): never {
  const missing =
    ['PGRST202', 'PGRST205', '42883', '42P01'].includes(error.code ?? '') ||
    /usage_(summary|daily|by_role|overview|history_baseline|events|students?(_detail|_daily|_timeline)?)/.test(error.message) ||
    error.status === 404;
  if (missing) throw new UsageMissingError();
  if (error.code === '42501') throw new Error('Solo la cuenta dueña de la plataforma puede ver estas estadísticas.');
  throw new Error(error.message);
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T[]> {
  if (!supabase) throw new Error('Sin conexión con el servidor.');
  const { data, error } = await supabase.rpc(fn, args);
  if (error) fail(error);
  return (data ?? []) as T[];
}

const num = (v: unknown) => Number(v) || 0;

export async function fetchSummary(days: number): Promise<FeatureStat[]> {
  const rows = await rpc<Record<string, unknown>>('usage_summary', { p_days: days });
  return rows.map((r) => ({
    feature: String(r.feature),
    users: num(r.users),
    events: num(r.events),
    opens: num(r.opens),
    minutes: num(r.minutes),
    last_at: (r.last_at as string | null) ?? null,
  }));
}
export async function fetchDaily(days: number, feature: string | null): Promise<DayStat[]> {
  const rows = await rpc<Record<string, unknown>>('usage_daily', { p_days: days, p_feature: feature });
  return rows.map((r) => ({ day: String(r.day).slice(0, 10), users: num(r.users), events: num(r.events), minutes: num(r.minutes) }));
}
export async function fetchByRole(days: number): Promise<RoleStat[]> {
  const rows = await rpc<Record<string, unknown>>('usage_by_role', { p_days: days });
  return rows.map((r) => ({
    feature: String(r.feature),
    role: r.role === 'teacher' ? 'teacher' : 'student',
    users: num(r.users),
    events: num(r.events),
    minutes: num(r.minutes),
  }));
}
export async function fetchOverview(days: number): Promise<Overview> {
  const [r] = await rpc<Record<string, unknown>>('usage_overview', { p_days: days });
  return {
    students: num(r?.students),
    teachers: num(r?.teachers),
    events: num(r?.events),
    minutes: num(r?.minutes),
    total_students: num(r?.total_students),
  };
}
/** Older tables, to avoid starting from zero. Optional: failures return []. */
export async function fetchBaseline(): Promise<BaselineStat[]> {
  try {
    const rows = await rpc<Record<string, unknown>>('usage_history_baseline');
    return rows.map((r) => ({
      feature: String(r.feature),
      users: num(r.users),
      events: num(r.events),
      last_at: (r.last_at as string | null) ?? null,
      source: String(r.source ?? ''),
    }));
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ merge ----
export interface FeatureRow extends FeatureStat {
  label: string;
  category: UsageCategory;
  studentUsers: number;
  teacherUsers: number;
  /** "Histórico (estimado)": distinct users in the older tables. */
  histUsers: number;
  histEvents: number;
}

/** The whole inventory (zero-use features included) joined with the numbers. */
export function mergeRows(summary: FeatureStat[], roles: RoleStat[], baseline: BaselineStat[]): FeatureRow[] {
  const sum = new Map(summary.map((s) => [s.feature, s]));
  const ids = new Set<string>([...FEATURES.map((x) => x.id), ...summary.map((s) => s.feature)]);
  return [...ids].map((id) => {
    const d = featureDef(id);
    const s = sum.get(id);
    const hist = baseline.filter((b) => b.feature === id);
    return {
      feature: id,
      label: d.label,
      category: d.category,
      users: s?.users ?? 0,
      events: s?.events ?? 0,
      opens: s?.opens ?? 0,
      minutes: s?.minutes ?? 0,
      last_at: s?.last_at ?? null,
      studentUsers: roles.find((r) => r.feature === id && r.role === 'student')?.users ?? 0,
      teacherUsers: roles.find((r) => r.feature === id && r.role === 'teacher')?.users ?? 0,
      histUsers: hist.reduce((m, b) => Math.max(m, b.users), 0),
      histEvents: hist.reduce((t, b) => t + b.events, 0),
    };
  });
}

export function byCategory(rows: FeatureRow[]) {
  return CATEGORIES.map((c) => {
    const mine = rows.filter((r) => r.category === c.id);
    return {
      ...categoryOf(c.id),
      total: mine.length,
      used: mine.filter((r) => r.events > 0).length,
      minutes: Math.round(mine.reduce((t, r) => t + r.minutes, 0) * 10) / 10,
      opens: mine.reduce((t, r) => t + r.opens, 0),
      users: mine.reduce((m, r) => Math.max(m, r.users), 0),
    };
  }).filter((c) => c.total > 0);
}

// -------------------------------------------------------------------- CSV ----
const cell = (v: string | number) => {
  const s = String(v);
  // Neutralise spreadsheet formulas in text cells.
  const safe = typeof v === 'string' && /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",\n;]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
};

export function toCsv(rows: FeatureRow[], days: number): string {
  const head = ['id', 'funcionalidad', 'categoria', `usuarios_${days}d`, 'alumnos', 'docentes', 'aperturas', 'minutos', 'eventos', 'ultimo_uso', 'historico_usuarios_est', 'historico_eventos_est'];
  const lines = rows.map((r) =>
    [r.feature, r.label, categoryOf(r.category).label, r.users, r.studentUsers, r.teacherUsers, r.opens, r.minutes, r.events, r.last_at ?? '', r.histUsers, r.histEvents].map(cell).join(','),
  );
  return '﻿' + [head.join(','), ...lines].join('\r\n');
}

// ------------------------------------------------------- by student (24) ----
export interface StudentRow {
  id: string;
  name: string;
  email: string;
  role: 'student' | 'teacher';
  teacher: string;
  classCode: string;
  activeDays: number;
  minutes: number;
  features: number;
  events: number;
  lastAt: string | null;
}
export interface StudentContext {
  teacherId: string | null;
  teacherName: string | null;
  /** A teacher who is not the student's own. */
  other: boolean;
  kind: 'board' | 'room' | 'assignment' | 'class' | null;
  n: number;
}
export interface StudentFeature {
  feature: string;
  events: number;
  opens: number;
  minutes: number;
  lastAt: string | null;
  contexts: StudentContext[];
}
export interface StudentDay {
  day: string;
  events: number;
  minutes: number;
}
export interface TimelineEvent {
  id: number;
  at: string;
  feature: string;
  action: string;
  seconds: number;
  context: string;
  other: boolean;
}

export async function fetchStudents(days: number): Promise<StudentRow[]> {
  const rows = await rpc<Record<string, unknown>>('usage_students', { p_days: days });
  return rows.map((r) => ({
    id: String(r.user_id),
    name: String(r.full_name ?? '').trim(),
    email: String(r.email ?? ''),
    role: r.role === 'teacher' ? 'teacher' : 'student',
    teacher: String(r.teacher_name ?? ''),
    classCode: String(r.class_code ?? ''),
    activeDays: num(r.active_days),
    minutes: num(r.minutes),
    features: num(r.features),
    events: num(r.events),
    lastAt: (r.last_at as string | null) ?? null,
  }));
}
export async function fetchStudentDetail(user: string, days: number): Promise<StudentFeature[]> {
  const rows = await rpc<Record<string, unknown>>('usage_student_detail', { p_user: user, p_days: days });
  return rows.map((r) => ({
    feature: String(r.feature),
    events: num(r.events),
    opens: num(r.opens),
    minutes: num(r.minutes),
    lastAt: (r.last_at as string | null) ?? null,
    contexts: (Array.isArray(r.contexts) ? (r.contexts as Record<string, unknown>[]) : []).map((c) => ({
      teacherId: (c.teacher_id as string | null) ?? null,
      teacherName: (c.teacher_name as string | null) ?? null,
      other: c.other === true,
      kind: (['board', 'room', 'assignment', 'class'] as const).find((k) => k === c.kind) ?? null,
      n: num(c.n),
    })),
  }));
}
export async function fetchStudentDaily(user: string, days: number): Promise<StudentDay[]> {
  const rows = await rpc<Record<string, unknown>>('usage_student_daily', { p_user: user, p_days: days });
  return rows.map((r) => ({ day: String(r.day).slice(0, 10), events: num(r.events), minutes: num(r.minutes) }));
}
export async function fetchStudentTimeline(user: string, days: number, limit = 100): Promise<TimelineEvent[]> {
  const rows = await rpc<Record<string, unknown>>('usage_student_timeline', { p_user: user, p_days: days, p_limit: limit });
  return rows.map((r) => ({
    id: num(r.id),
    at: String(r.at),
    feature: String(r.feature),
    action: String(r.action),
    seconds: num(r.seconds),
    context: String(r.context ?? ''),
    other: r.other === true,
  }));
}

export const KIND_LABEL: Record<string, string> = { board: 'Muro en vivo', room: 'Juego en vivo', assignment: 'Tarea', class: 'Clase' };

export function studentsToCsv(rows: StudentRow[], days: number): string {
  const head = ['id', 'nombre', 'correo', 'rol', 'profesor', 'clase', `dias_activos_${days}d`, 'minutos', 'funcionalidades', 'eventos', 'ultimo_uso'];
  const lines = rows.map((r) => [r.id, r.name, r.email, r.role, r.teacher, r.classCode, r.activeDays, r.minutes, r.features, r.events, r.lastAt ?? ''].map(cell).join(','));
  return '\ufeff' + [head.join(','), ...lines].join('\r\n');
}

/** One student: every feature of the inventory (0 included) with their numbers. */
export function studentDetailToCsv(name: string, rows: StudentFeature[], days: number): string {
  const head = ['estudiante', 'funcionalidad', 'categoria', `aperturas_${days}d`, 'minutos', 'eventos', 'ultimo_uso', 'contextos'];
  const lines = rows.map((r) => {
    const d = featureDef(r.feature);
    const ctx = r.contexts.map((c) => `${KIND_LABEL[c.kind ?? ''] ?? 'Contexto'}${c.teacherName ? ' de ' + c.teacherName : ''}${c.other ? ' (otro profesor)' : ''} x${c.n}`).join(' | ');
    return [name, d.label, categoryOf(d.category).label, r.opens, r.minutes, r.events, r.lastAt ?? '', ctx].map(cell).join(',');
  });
  return '\ufeff' + [head.join(','), ...lines].join('\r\n');
}

/** Detail rows joined with the full inventory so unused tools show up with 0. */
export function withInventory(rows: StudentFeature[]): StudentFeature[] {
  const have = new Map(rows.map((r) => [r.feature, r]));
  const out = [...rows];
  for (const f of FEATURES) if (!have.has(f.id)) out.push({ feature: f.id, events: 0, opens: 0, minutes: 0, lastAt: null, contexts: [] });
  return out;
}
