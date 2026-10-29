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

export type InviteStatus = "open" | "used" | "expired" | "revoked";

export function inviteStatus(i: TeacherInvite, now = Date.now()): InviteStatus {
  if (i.used_by || i.used_at) return "used";
  if (i.revoked_at) return "revoked";
  if (i.expires_at && new Date(i.expires_at).getTime() <= now) return "expired";
  return "open";
}

const MISSING =
  "Falta activar los códigos de docente en Supabase (15_teacher_invites.sql).";

function fail(msg: string): never {
  if (/does not exist|schema cache|Could not find the function/i.test(msg))
    throw new Error(MISSING);
  if (/platform owner/i.test(msg))
    throw new Error(
      "Solo la administración de la plataforma puede hacer esto.",
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

export async function createInvite(
  note: string,
  days: number,
): Promise<TeacherInvite> {
  if (!supabase) throw new Error("Sin conexión con el servidor.");
  const { data, error } = await supabase.rpc("create_teacher_invite", {
    p_note: note.trim() || null,
    p_days: days,
  });
  if (error) fail(error.message);
  return data as TeacherInvite;
}

export async function revokeInvite(code: string): Promise<void> {
  if (!supabase) throw new Error("Sin conexión con el servidor.");
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
    ? ` (vence el ${new Date(i.expires_at).toLocaleDateString("es")})`
    : "";
  const name = i.note?.split(/[—,(\-]/)[0].trim();
  return `Hola${name ? ` ${name}` : ""}: te invito como docente a ECYR English.\n1. Entra a ${origin}/profile → Registrarse → Docente.\n2. Usa este código de invitación${until}: ${i.code}\nEs de un solo uso.`;
}
