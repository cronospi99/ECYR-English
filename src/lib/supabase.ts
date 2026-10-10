import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public (publishable) project config shared with the IELTS Simulator
// (public/apps/ielts/supabase-config.js). Safe in the browser: row-level
// security decides what each signed-in user can read or write. Override per
// deployment with VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY; set both to
// "off" to run fully offline.
const SHARED = {
  url: 'https://eecqfbxisquimaowhbmg.supabase.co',
  anonKey: 'sb_publishable_t3ojNz8SocY9YfllocR-6Q_tjTtmt8q',
};
const envUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;
const url = envUrl === 'off' ? undefined : envUrl || SHARED.url;
const anonKey = envKey === 'off' ? undefined : envKey || SHARED.anonKey;

/**
 * The platform shares its Supabase project with the IELTS simulator embedded
 * at /apps/ielts. Both use supabase-js' default storage key on the same origin,
 * so signing in here also signs the learner into the simulator.
 *
 * With the vars set to "off" the app runs fully offline (progress kept in the browser).
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const isSupabaseConfigured = supabase !== null;
