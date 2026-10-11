import { supabase } from './supabase';
import { useAuth } from '@/store/auth';
import { useProgress, snapshot, mergeProgress, type ProgressData } from '@/store/progress';
import { usePlan, planSnapshot, sanitizePlan } from '@/store/plan';
import { useAvatar } from '@/store/avatar';
import { useGames, mergeSessions, sanitizeSessions, sanitizeDefenders } from '@/store/games';
import { writeDefendersStore } from '@/lib/gameBridge';

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
  const remote = (data?.state ?? null) as (ProgressData & { plan?: unknown; avatar?: { config?: unknown; updatedAt?: unknown }; gameSessions?: unknown; defenders?: unknown }) | null;
  if (remote) {
    applying = true;
    useProgress.getState().replace(mergeProgress(snapshot(), remote));
    // Study plan: the most recently edited copy wins.
    const plan = sanitizePlan(remote.plan);
    if (plan && plan.updatedAt > usePlan.getState().updatedAt) usePlan.getState().replace(plan);
    // Avatar: same rule; the config is re-validated by the store.
    const av = remote.avatar;
    if (av && typeof av.updatedAt === 'string' && av.updatedAt > useAvatar.getState().updatedAt) useAvatar.getState().replace(av.config, av.updatedAt);
    // Game sessions: union of both copies; English Defenders stars: best per unit.
    const remoteSessions = sanitizeSessions(remote.gameSessions);
    if (remoteSessions.length) {
      const g = useGames.getState();
      g.replace({ sessions: mergeSessions(g.sessions, remoteSessions), defenders: g.defenders, updatedAt: new Date().toISOString() });
    }
    const ed = sanitizeDefenders(remote.defenders);
    if (ed) writeDefendersStore(ed);
    applying = false;
  }
  pulledFor = userId;
  await push(userId);
}

async function push(userId: string) {
  if (!supabase) return;
  const { error } = await supabase
    .from('learner_state')
    .upsert({ user_id: userId, state: { ...snapshot(), plan: planSnapshot(), avatar: { config: useAvatar.getState().config, updatedAt: useAvatar.getState().updatedAt }, gameSessions: useGames.getState().sessions.slice(0, 120), defenders: useGames.getState().defenders }, updated_at: new Date().toISOString() });
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

  const schedule = () => {
    const id = useAuth.getState().session?.user.id;
    if (!id || applying || pulledFor !== id) return;
    clearTimeout(timer);
    timer = setTimeout(() => void push(id), 1500);
  };
  useProgress.subscribe(schedule);
  usePlan.subscribe(schedule);
  useAvatar.subscribe(schedule);
  useGames.subscribe((st, prev) => {
    if (st.sessions !== prev.sessions || st.defenders !== prev.defenders) schedule();
  });
}
