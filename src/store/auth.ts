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
}

interface AuthState {
  ready: boolean;
  session: Session | null;
  profile: Profile | null;
  init: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<string | null>;
  signUp: (p: { email: string; password: string; fullName: string; role: 'student' | 'teacher' }) => Promise<string | null>;
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
    set({ profile: (data as Profile | null) ?? null });
  },

  signIn: async (email, password) => {
    if (!supabase) return 'Las cuentas no están configuradas en este despliegue.';
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error ? friendly(error.message) : null;
  },

  signUp: async ({ email, password, fullName, role }) => {
    if (!supabase) return 'Las cuentas no están configuradas en este despliegue.';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, role }, emailRedirectTo: window.location.origin + '/profile' },
    });
    if (error) return friendly(error.message);
    if (!data.session) return 'confirm';
    return null;
  },

  signOut: async () => {
    if (!supabase) return;
    await supabase.auth.signOut();
    set({ session: null, profile: null });
  },

  joinClass: async (code) => {
    if (!supabase) return 'Sin conexión con el servidor.';
    const { error } = await supabase.rpc('join_class', { p_code: code.trim().toUpperCase() });
    if (error) return friendly(error.message);
    await get().loadProfile();
    return null;
  },
}));

function friendly(msg: string) {
  if (/invalid login/i.test(msg)) return 'Correo o contraseña incorrectos.';
  if (/already registered/i.test(msg)) return 'Ese correo ya tiene una cuenta. Inicia sesión.';
  if (/password should be/i.test(msg)) return 'La contraseña debe tener al menos 6 caracteres.';
  if (/email not confirmed/i.test(msg)) return 'Confirma tu correo antes de iniciar sesión.';
  return msg;
}
