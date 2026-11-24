import { generate } from '@/lib/examAi';
import { supabase } from '@/lib/supabase';
import type { Gen } from '@/lib/thread/aiCore';

/** El generador de la app: la Edge Function `gemini` (op 'generate'). */
export const gen: Gen = generate;
export const aiAvailable = !!supabase;
