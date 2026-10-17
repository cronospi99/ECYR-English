/**
 * Cloud copy of "Mis notas" in `public.student_notes` (12_notes.sql). Private:
 * RLS lets each account read and write only its own rows — teachers never see
 * them. Pull on sign-in (and when the notes UI opens, throttled), push dirty
 * notes debounced after every change. Last writer wins per note by
 * updated_at, on both sides (the table's trigger ignores older writes).
 */
import { create } from 'zustand';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import { useNotes, type NoteRow } from '@/store/notes';

export type NotesSyncStatus = 'local' | 'syncing' | 'synced' | 'error' | 'missing';

export const useNotesSync = create<{ status: NotesSyncStatus; at: string | null }>()(() => ({ status: 'local', at: null }));

const TABLE = 'student_notes';
let timer: ReturnType<typeof setTimeout> | undefined;
let pulledFor: string | null = null;
let lastPull = 0;
let missing = false;
let pushing: Promise<void> | null = null;
let started = false;

const isMissing = (e: { code?: string; message?: string }) =>
  e.code === '42P01' || e.code === 'PGRST205' || /could not find the table|does not exist/i.test(e.message ?? '');

const uidNow = () => useAuth.getState().session?.user.id ?? null;

async function pull(uid: string) {
  if (!supabase || missing) return;
  useNotesSync.setState({ status: 'syncing' });
  lastPull = Date.now();
  const { data, error } = await supabase
    .from(TABLE)
    .select('id,user_id,body,page_title,page_path,created_at,updated_at,deleted_at')
    .eq('user_id', uid)
    .order('updated_at', { ascending: false })
    .limit(2000);
  if (uidNow() !== uid) return;
  if (error) {
    if (isMissing(error)) missing = true;
    console.warn('[notes] pull failed:', error.message);
    useNotesSync.setState({ status: missing ? 'missing' : 'error' });
    return;
  }
  useNotes.getState().applyRemote((data ?? []) as NoteRow[], uid);
  pulledFor = uid;
  await push(uid);
}

async function push(uid: string): Promise<void> {
  if (!supabase || missing) return;
  if (pushing) {
    await pushing;
    return push(uid);
  }
  const dirty = useNotes.getState().notes.filter((n) => n.dirty && n.owner === uid);
  if (!dirty.length) {
    useNotesSync.setState({ status: 'synced', at: new Date().toISOString() });
    return;
  }
  useNotesSync.setState({ status: 'syncing' });
  const rows = dirty.map((n) => ({
    id: n.id,
    user_id: uid,
    body: n.body,
    page_title: n.pageTitle || null,
    page_path: n.pagePath || null,
    created_at: n.createdAt,
    updated_at: n.updatedAt,
    deleted_at: n.deletedAt,
  }));
  const versions = Object.fromEntries(dirty.map((n) => [n.id, n.updatedAt]));
  pushing = (async () => {
    const { error } = await supabase!.from(TABLE).upsert(rows, { onConflict: 'id' });
    if (error) {
      if (isMissing(error)) missing = true;
      console.warn('[notes] push failed:', error.message);
      useNotesSync.setState({ status: missing ? 'missing' : 'error' });
      return;
    }
    useNotes.getState().markClean(versions);
    useNotesSync.setState({ status: 'synced', at: new Date().toISOString() });
  })();
  try {
    await pushing;
  } finally {
    pushing = null;
  }
}

/** Re-reads the cloud copy (at most every 30 s) — call when the notes UI opens. */
export function refreshNotes() {
  const uid = uidNow();
  if (uid && Date.now() - lastPull > 30_000) void pull(uid);
}

/** Started once from src/lib/sync.ts. */
export function startNotesSync() {
  if (!supabase || started) return;
  started = true;
  const onUser = (uid: string | null) => {
    pulledFor = null;
    if (!uid) {
      useNotesSync.setState({ status: 'local', at: null });
      return;
    }
    useNotes.getState().claim(uid);
    void pull(uid);
  };
  useAuth.subscribe((s, prev) => {
    const id = s.session?.user.id ?? null;
    if (id !== (prev.session?.user.id ?? null)) onUser(id);
  });
  onUser(uidNow());

  useNotes.subscribe((s, prev) => {
    if (s.notes === prev.notes) return;
    const uid = uidNow();
    if (!uid || pulledFor !== uid || missing) return;
    if (s.notes.some((n) => !n.owner)) useNotes.getState().claim(uid);
    clearTimeout(timer);
    timer = setTimeout(() => void push(uid), 1200);
  });
  // Flush pending edits when the tab is hidden (closing, switching apps).
  document.addEventListener('visibilitychange', () => {
    const uid = uidNow();
    if (document.visibilityState === 'hidden' && uid && pulledFor === uid) {
      clearTimeout(timer);
      void push(uid);
    } else if (document.visibilityState === 'visible') refreshNotes();
  });
}
