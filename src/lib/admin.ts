/**
 * Platform owner tools (supabase/migrations/15): one-use invitation codes that
 * new teachers sign up with, and the list of every teacher on the platform.
 * The server checks the caller is in `platform_admins`; nothing here is trusted.
 */
import { supabase } from "./supabase";

export interface TeacherInvite {
  code: string;
  note: string | null;
  created_at: string;
  expires_at: string | null;
  used_by: string | null;
  used_email: string | null;
  used_at: string | null;
  revoked_at: string | null;
}

export interface PlatformTeacher {
  id: string;
  email: string | null;
  full_name: string | null;
  class_code: string | null;
  students: number;
  created_at: string;
}

export interface PlatformStudent {
  id: string;
  email: string | null;
  full_name: string | null;
  teacher_id: string | null;
  teacher_name: string | null;
  created_at: string;
  /** Opened by the owner: any teacher can add this student to their class. */
  shared: boolean;
  /** Other teachers who also have this student (the main one is teacher_id). */
  extra_teachers: { id: string; name: string | null }[];
}

export type InviteStatus = "open" | "used" | "expired" | "revoked";

export function inviteStatus(i: TeacherInvite, now = Date.now()): InviteStatus {
  if (i.used_by || i.used_at) return "used";
  if (i.revoked_at) return "revoked";
  if (i.expires_at && new Date(i.expires_at).getTime() <= now) return "expired";
  return "open";
}

const MISSING =
  "Teacher codes need to be enabled in Supabase (15_teacher_invites.sql).";
const MISSING_21 =
  "Shared students need to be enabled in Supabase (21_shared_students.sql).";
const MISSING_17 =
  "Account deletion needs to be enabled in Supabase (17_admin_delete_users.sql).";

function fail(msg: string, missing = MISSING): never {
  if (/does not exist|schema cache|Could not find the function/i.test(msg))
    throw new Error(missing);
  if (/own account/i.test(msg))
    throw new Error("You can’t delete your own account from here.");
  if (/Remove it from platform_admins/i.test(msg))
    throw new Error(
      "That account is also an admin; remove it from platform_admins first.",
    );
  if (/platform owner/i.test(msg))
    throw new Error(
      "Only the platform admin can do this.",
    );
  throw new Error(msg);
}

export async function listInvites(): Promise<TeacherInvite[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_teacher_invites");
  if (error) fail(error.message);
  return (data ?? []) as TeacherInvite[];
}

export async function listTeachers(): Promise<PlatformTeacher[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc("list_platform_teachers");
  if (error) fail(error.message);
  return ((data ?? []) as PlatformTeacher[]).map((t) => ({
    ...t,
    students: Number(t.students) || 0,
  }));
}

export async function listStudents(): Promise<PlatformStudent[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.rpc('list_platform_students');
  if (error) fail(error.message, MISSING_21);
  return ((data ?? []) as PlatformStudent[]).map((x) => ({ ...x, shared: !!x.shared, extra_teachers: x.extra_teachers ?? [] }));
}

/** Owner only: adds a teacher to a student (the student keeps their other teachers). */
export async function shareStudent(student: string, teacher: string): Promise<void> {
  if (!supabase) throw new Error('No connection to the server.');
  const { error } = await supabase.rpc('admin_share_student', { p_student: student, p_teacher: teacher });
  if (error) fail(error.message, MISSING_21);
}

/** Owner only: takes one teacher out of a student's teachers. */
export async function unshareStudent(student: string, teacher: string): Promise<void> {
  if (!supabase) throw new Error('No connection to the server.');
  const { error } = await supabase.rpc('admin_unshare_student', { p_student: student, p_teacher: teacher });
  if (error) fail(error.message, MISSING_21);
}

/** Owner only: opens (or closes) a student so any teacher can add them to their class. */
export async function setStudentShared(student: string, shared: boolean): Promise<void> {
  if (!supabase) throw new Error('No connection to the server.');
  const { error } = await supabase.rpc('admin_set_student_shared', { p_student: student, p_shared: shared });
  if (error) fail(error.message, MISSING_21);
}

/** Deletes the account and everything it owns. A teacher's students stay, without a class. */
export async function deleteAccount(id: string): Promise<void> {
  if (!supabase) throw new Error('No connection to the server.');
  const { error } = await supabase.rpc('admin_delete_user', { p_user: id });
  if (error) fail(error.message, MISSING_17);
}

export async function createInvite(
  note: string,
  days: number,
): Promise<TeacherInvite> {
  if (!supabase) throw new Error("No connection to the server.");
  const { data, error } = await supabase.rpc("create_teacher_invite", {
    p_note: note.trim() || null,
    p_days: days,
  });
  if (error) fail(error.message);
  return data as TeacherInvite;
}

export async function revokeInvite(code: string): Promise<void> {
  if (!supabase) throw new Error("No connection to the server.");
  const { error } = await supabase.rpc("revoke_teacher_invite", {
    p_code: code,
  });
  if (error) fail(error.message);
}

/** Ready-to-send message for the new teacher. */
export function inviteMessage(
  i: TeacherInvite,
  origin = window.location.origin,
): string {
  const until = i.expires_at
    ? ` (vence el ${new Date(i.expires_at).toLocaleDateString('en')})`
    : "";
  const name = i.note?.split(/[—,(\-]/)[0].trim();
  return `Hello${name ? ` ${name}` : ""}: I’m inviting you as a teacher to ECYR English.\n1. Go to ${origin}/profile → Sign up → Teacher.\n2. Use this invitation code${until}: ${i.code}\nIt can only be used once.`;
}
