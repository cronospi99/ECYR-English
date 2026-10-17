/**
 * Student output (writing texts, speaking transcripts) kept for the teacher in
 * `public.submissions` (supabase/setup.sql: submissions_insert_own lets a
 * student insert their own rows; submissions_select_class lets their teacher
 * read them). Nothing is ever read back here: a student's own SELECT depends
 * on the teacher's history switch (03_history_visibility.sql).
 *
 * Never throws: callers get `{ ok, … }` and may ignore it.
 */
import { supabase } from './supabase';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';

export interface WorkInput {
  module: 'writing' | 'speaking';
  /** Where it was done, e.g. "unit:A1-3", "practice:writing:B1-4-2", "coach:live". */
  task: string;
  prompt: string;
  content: string;
  /**
   * AI feedback or any extra data (stored in `report`). By convention
   * `feedback` holds Markdown the teacher view renders as is.
   */
  report?: Record<string, unknown>;
}

export type SaveWorkResult =
  | { ok: true; saved: boolean; skipped?: 'offline' | 'signed-out' | 'teacher' | 'sandbox' | 'empty' | 'duplicate' }
  | { ok: false; error: string };

export const MAX_WORK_CONTENT = 20_000;
const MAX_PROMPT = 2_000;
const DUP_WINDOW_MS = 10 * 60_000;
const DUP_KEY = 'ecyr:work-sent';

/** Cheap stable fingerprint (FNV-1a) of task + text, to skip duplicates. */
function fingerprint(task: string, content: string) {
  let h = 0x811c9dc5;
  const s = `${task}\u0000${content.trim()}`;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36);
}

function readSent(): Record<string, number> {
  try {
    const raw = sessionStorage.getItem(DUP_KEY);
    const v = raw ? (JSON.parse(raw) as Record<string, number>) : {};
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

function writeSent(m: Record<string, number>) {
  const now = Date.now();
  const kept = Object.fromEntries(Object.entries(m).filter(([, t]) => now - t < DUP_WINDOW_MS));
  try {
    sessionStorage.setItem(DUP_KEY, JSON.stringify(kept));
  } catch {
    /* storage unavailable: the in-flight set still prevents double clicks */
  }
}

const inFlight = new Set<string>();

/** True when this exact text for this task was sent in the last few minutes. */
export function wasRecentlySent(task: string, content: string) {
  const t = readSent()[fingerprint(task, content)];
  return typeof t === 'number' && Date.now() - t < DUP_WINDOW_MS;
}

/** Can the signed-in user hand work to a teacher right now? (student, signed in, not in sandbox) */
export function canSaveWork() {
  const { session, profile } = useAuth.getState();
  return Boolean(supabase && session && profile?.role !== 'teacher' && !useSettings.getState().practiceSandbox);
}

export async function saveWork(w: WorkInput): Promise<SaveWorkResult> {
  try {
    if (!supabase) return { ok: true, saved: false, skipped: 'offline' };
    if (useSettings.getState().practiceSandbox) return { ok: true, saved: false, skipped: 'sandbox' };
    const auth = useAuth.getState();
    const uid = auth.session?.user.id;
    if (!uid) return { ok: true, saved: false, skipped: 'signed-out' };
    let profile = auth.profile;
    if (!profile) {
      await auth.loadProfile();
      profile = useAuth.getState().profile;
    }
    if (profile?.role === 'teacher') return { ok: true, saved: false, skipped: 'teacher' };
    const content = (w.content ?? '').trim().slice(0, MAX_WORK_CONTENT);
    if (!content) return { ok: true, saved: false, skipped: 'empty' };
    const task = (w.task || 'other').slice(0, 200);
    const fp = fingerprint(task, content);
    if (inFlight.has(fp) || wasRecentlySent(task, content)) return { ok: true, saved: false, skipped: 'duplicate' };
    inFlight.add(fp);
    try {
      const { error } = await supabase.from('submissions').insert({
        student_id: uid,
        module: w.module,
        task,
        prompt: (w.prompt ?? '').slice(0, MAX_PROMPT) || null,
        content,
        band: null,
        report: w.report ?? null,
      });
      if (error) {
        console.warn('[work] save failed:', error.message);
        return { ok: false, error: /failed to fetch|network/i.test(error.message) ? 'Sin conexión. Inténtalo de nuevo.' : 'No se pudo enviar tu trabajo.' };
      }
      writeSent({ ...readSent(), [fp]: Date.now() });
      return { ok: true, saved: true };
    } finally {
      inFlight.delete(fp);
    }
  } catch (e) {
    console.warn('[work] save failed:', e);
    return { ok: false, error: 'No se pudo enviar tu trabajo.' };
  }
}
