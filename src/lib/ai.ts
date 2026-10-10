import { supabase } from './supabase';

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

/**
 * Calls the `coach` Supabase Edge Function (supabase/functions/coach). The
 * Gemini key lives there as a secret; the browser only sends the user's session.
 */
export async function askCoach(opts: { messages: ChatMessage[]; mode?: CoachMode; level?: string }): Promise<string> {
  if (!supabase) throw new CoachError('El coach necesita conexión con el servidor (Supabase no está configurado).', 'offline');
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) throw new CoachError('Inicia sesión para hablar con el AI Coach.', 'signed_out');

  const { data, error } = await supabase.functions.invoke('coach', {
    body: { messages: opts.messages.slice(-16), mode: opts.mode ?? 'chat', level: opts.level ?? 'B1' },
  });
  if (error) {
    let message = error.message;
    let code: CoachError['code'] = 'server';
    try {
      const ctx = (error as { context?: Response }).context;
      const body = ctx ? await ctx.json() : null;
      if (body?.error?.message) message = body.error.message;
      if (body?.error?.code) code = body.error.code;
    } catch {
      /* body was not JSON */
    }
    throw new CoachError(message, code);
  }
  return (data as { text?: string })?.text ?? '';
}
