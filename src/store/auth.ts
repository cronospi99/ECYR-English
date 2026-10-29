import { create } from 'zustand';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface Profile {
  id: string;
  email: string | null;
  full_name: string | null;
  role: 'student' | 'teacher';
  teacher_id: string | null;
  class_code: string | null;
  /** Platform owner: creates the codes new teachers sign up with (migration 15). */
  is_admin?: boolean;
}

interface AuthState {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (p: { email: string; password: string; fullName: string; role: 'student' | 'teacher'; inviteCode?: string }) => Promise<string | null>;
  /** An empty student account becomes a teacher with an invitation code (the owner needs none). */
  becomeTeacher: (code: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  joinClass: (code: string) => Promise<string | null>;
  loadProfile: () => Promise<void>;
}

let initialised = false;

export const useAuth = create<AuthState>()((set, get) => ({
  ready: !supabase,
  session: null,
  profile: null,

  init: async () => {
    if (!supabase || initialised) return;
    initialised = true;
    const { data } = await supabase.auth.getSession();
    set({ session: data.session, ready: true });
    if (data.session) void get().loadProfile();
    supabase.auth.onAuthStateChange((_event, session) => {
      set({ session });
      if (session) void get().loadProfile();
      else set({ profile: null });
    });
  },

  loadProfile: async () => {
    const uid = get().session?.user.id;
    if (!supabase || !uid) return;
    const { data } = await supabase
      .from('profiles')
      .select('id,email,full_name,role,teacher_id,class_code')
      .eq('id', uid)
      .maybeSingle();
    // Separate call so a project without migration 15 still loads the profile.
    const admin = data ? await supabase.rpc('is_platform_admin') : null;
    set({ profile: data ? { ...(data as Profile), is_admin: admin?.data === true } : null });
  },

  signIn: async (email, password) => {
    if (!supabase) return 'Las cuentas no están configuradas en este despliegue.';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? friendly(error.message) : null;
  },

  signUp: async ({ email, password, fullName, role, inviteCode }) => {
    if (!supabase) return 'Las cuentas no están configuradas en este despliegue.';
    const invite_code = role === 'teacher' ? (inviteCode ?? '').trim().toUpperCase() : undefined;
    if (role === 'teacher') {
      if (!invite_code) return 'Para crear una cuenta docente necesitas el código de invitación que te da la administración.';
      const { data: ok, error } = await supabase.rpc('check_teacher_invite', { p_code: invite_code });
      if (!error && ok !== true) return INVITE_INVALID;
    }
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role, ...(invite_code ? { invite_code } : {}) }, emailRedirectTo: window.location.origin + '/profile' },
    });
    // The trigger rejects a bad code; Auth only reports "Database error saving new user".
    if (error) return role === 'teacher' && /database error|TEACHER_INVITE/i.test(error.message) ? INVITE_INVALID : friendly(error.message);
    if (!data.session) return 'confirm';
    return null;
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  becomeTeacher: async (code) => {
    if (!supabase) return 'Sin conexión con el servidor.';
    const { error } = await supabase.rpc('switch_role', { p_role: 'teacher', p_code: code.trim().toUpperCase() || null });
    if (error) return /TEACHER_INVITE/.test(error.message) ? INVITE_INVALID : friendly(error.message);
    await get().loadProfile();
    return null;
  },

  joinClass: async (code) => {
    if (!supabase) return 'Sin conexión con el servidor.';
    const { error } = await supabase.rpc('join_class', { p_code: code.trim().toUpperCase() });
    if (error) return friendly(error.message);
    await get().loadProfile();
    return null;
  },
}));

const INVITE_INVALID = 'Ese código de docente no es válido, ya se usó o venció. Pide uno nuevo a la administración.';

function friendly(msg: string) {
  if (/already in use as a/i.test(msg)) return 'Esta cuenta ya tiene actividad con su rol actual. Crea una cuenta nueva para el otro rol.';
  if (/invalid login/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/already registered/i.test(msg)) return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (/password should be/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/email not confirmed/i.test(msg)) return 'Confirma tu correo antes de iniciar sesión.';
  return msg;
}
