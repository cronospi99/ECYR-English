import { supabase } from './supabase';
import { useAuth } from '@/store/auth';
import { useProgress, snapshot, mergeProgress, type ProgressData } from '@/store/progress';

/**
 * Keeps the learner's progress in `public.learner_state` (see
 * supabase/migrations/05_ecyr_platform.sql). Local-first: the browser copy is
 * always authoritative for the UI; the cloud copy is merged in on sign-in and
 * updated (debounced) after every change.
 */
let timer: ReturnType<typeof setTimeout> | undefined;
let pulledFor: string | null = null;
let applying = false;

async function pull(userId: string) {
  if (!supabase) return;
  const { data, error } = await supabase.from('learner_state').select('state').eq('user_id', userId).maybeSingle();
  if (error) return console.warn('[sync] pull failed:', error.message);
  const remote = (data?.state ?? null) as ProgressData | null;
  if (remote) {
    applying = true;
    useProgress.getState().replace(mergeProgress(snapshot(), remote));
    applying = false;
  }
  pulledFor = userId;
  await push(userId);
}

async function push(userId: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from('learner_state')
    .upsert({ user_id: userId, state: snapshot(), updated_at: new Date().toISOString() });
  if (error) console.warn('[sync] push failed:', error.message);
}

export function startSync() {
  if (!supabase) return;
  useAuth.subscribe((s, prev) => {
    const id = s.session?.user.id ?? null;
    if (id && id !== (prev.session?.user.id ?? null)) void pull(id);
    if (!id) pulledFor = null;
  });
  const first = useAuth.getState().session?.user.id;
  if (first) void pull(first);

  useProgress.subscribe(() => {
    const id = useAuth.getState().session?.user.id;
    if (!id || applying || pulledFor !== id) return;
    clearTimeout(timer);
    timer = setTimeout(() => void push(id), 1500);
  });
}
