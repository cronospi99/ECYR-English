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

/** Calls the `coach` function with the user's session; errors become CoachError. */
async function invokeCoach(body: Record<string, unknown>): Promise<Record<string, unknown>> {
  if (!supabase) throw new CoachError('El coach necesita conexión con el servidor (Supabase no está configurado).', 'offline');
  const { data: s } = await supabase.auth.getSession();
  if (!s.session) throw new CoachError('Inicia sesión para hablar con el AI Coach.', 'signed_out');

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

export interface VoiceReply {
  /** What the coach says aloud, in English (plain text, 1–3 sentences, ends with a question). */
  reply: string;
  /** How to say the learner's last turn in English, when they used Spanish or made a clear mistake. */
  english_version?: string;
  /** One line in Spanish explaining it. */
  tip_es?: string;
  /** The learner's last turn was (mostly) Spanish. */
  student_spanish?: boolean;
}

/** One turn of the live voice conversation (coach mode "voice"). */
export async function askVoiceCoach(opts: { messages: ChatMessage[]; level?: string; spanish?: boolean }): Promise<VoiceReply> {
  const data = await invokeCoach({ messages: opts.messages.slice(-16), mode: 'voice', level: opts.level ?? 'B1', spanish: !!opts.spanish });
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : undefined);
  return {
    reply: str(data.reply) ?? str(data.text) ?? 'Sorry, could you say that again?',
    english_version: str(data.english_version),
    tip_es: str(data.tip_es),
    student_spanish: data.student_spanish === true,
  };
}
