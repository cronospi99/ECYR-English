import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Public (publishable) project config, also used by the embedded IELTS
// Simulator engine. Safe in the browser: row-level
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
 * The IELTS Simulator engine (src/features/ielts) is handed this same client,
 * so one sign-in covers the whole platform.
 *
 * With the vars set to "off" the app runs fully offline (progress kept in the browser).
 */
export const supabase: SupabaseClient | null =
  url && anonKey ? createClient(url, anonKey, { auth: { persistSession: true, autoRefreshToken: true } }) : null;

export const isSupabaseConfigured = supabase !== null;

/** Public project config (used by the embedded IELTS engine). */
export const supabaseConfig = url && anonKey ? { url, anonKey } : null;
