import { supabase } from './supabase';
import { track } from './usage';

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

export type CoachMode = 'chat' | 'correct' | 'explain' | 'writing-feedback';

export class CoachError extends Error {
  constructor(
    message: string,
    public code: 'offline' | 'signed_out' | 'limit' | 'no_key' | 'server',
  ) {
    super(message);
  }
}

/** Calls the `coach` function with the user's session; errors become CoachError. */
async function invokeCoach(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!supabase) throw new CoachError('The coach needs a connection to the server (Supabase is not configured).', 'offline');
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) throw new CoachError('Sign in to talk to the AI Coach.', 'signed_out');

  track('coach', 'ai_call', { mode: typeof body.mode === 'string' ? body.mode : 'chat' });
  const { data, error } = await supabase.functions.invoke('coach', { body });
  if (error) {
    let message = error.message;
    let code: CoachError['code'] = 'server';
    try {
      const ctx = (error as { context?: Response }).context;
      const res = ctx && typeof ctx.json === 'function' ? await ctx.json() : null;
      if (res?.error?.message) message = res.error.message;
      if (res?.error?.code) code = res.error.code;
    } catch {
      /* body was not JSON */
    }
    throw new CoachError(message, code);
  }
  return (data as Record<string, unknown>) ?? {};
}

/**
 * Calls the `coach` Supabase Edge Function (supabase/functions/coach). The
 * Gemini key lives there as a secret; the browser only sends the user's session.
 */
export async function askCoach(opts: { messages: ChatMessage[]; mode?: CoachMode; level?: string }): Promise<string> {
  const data = await invokeCoach({ messages: opts.messages.slice(-16), mode: opts.mode ?? 'chat', level: opts.level ?? 'B1' });
  return typeof data.text === 'string' ? data.text : '';
}

