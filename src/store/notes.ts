import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * "Mis notas" — private text notes. Local-first (this browser is always the
 * source of truth for the UI) and synced to `public.student_notes`
 * (supabase/migrations/12_notes.sql) by src/features/notes/sync.ts.
 *
 * Each note remembers the page it was written on. Deletions are tombstones
 * (`deletedAt`) until the cloud has them; last writer wins per note by
 * `updatedAt`. `owner` is the account the note belongs to (null = written
 * signed out; claimed by the next account that signs in on this browser).
 */
export const MAX_NOTE_BODY = 20_000;

export interface Note {
  id: string;
  body: string;
  pageTitle: string;
  pagePath: string;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  owner: string | null;
  /** Changed since the last successful upload. */
  dirty: boolean;
}

/** The cloud row shape (snake_case, as in 12_notes.sql). */
export interface NoteRow {
  id: string;
  user_id: string;
  body: string;
  page_title: string | null;
  page_path: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

interface NotesState {
  notes: Note[];
  create: (p: { body?: string; pageTitle: string; pagePath: string; owner: string | null }) => string;
  update: (id: string, body: string) => void;
  remove: (id: string) => void;
  /** Gives notes written signed out to `uid`. */
  claim: (uid: string) => void;
  /** Merges cloud rows (last writer wins by updated_at). */
  applyRemote: (rows: NoteRow[], uid: string) => void;
  /** Marks notes as uploaded, unless they changed again since `versions` were sent. */
  markClean: (versions: Record<string, string>) => void;
}

const uuid = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
      });

/** A timestamp strictly after `prev`, so two quick edits never tie. */
function stamp(prev?: string) {
  const now = new Date();
  if (prev && now.toISOString() <= prev) return new Date(new Date(prev).getTime() + 1).toISOString();
  return now.toISOString();
}

const TOMBSTONE_TTL = 30 * 86_400_000;

function sanitize(list: unknown): Note[] {
  if (!Array.isArray(list)) return [];
  return list
    .filter((n): n is Note => !!n && typeof n === 'object' && typeof (n as Note).id === 'string' && typeof (n as Note).body === 'string')
    .map((n) => ({
      id: n.id,
      body: n.body.slice(0, MAX_NOTE_BODY),
      pageTitle: typeof n.pageTitle === 'string' ? n.pageTitle : '',
      pagePath: typeof n.pagePath === 'string' ? n.pagePath : '/',
      createdAt: typeof n.createdAt === 'string' ? n.createdAt : new Date().toISOString(),
      updatedAt: typeof n.updatedAt === 'string' ? n.updatedAt : new Date().toISOString(),
      deletedAt: typeof n.deletedAt === 'string' ? n.deletedAt : null,
      owner: typeof n.owner === 'string' ? n.owner : null,
      dirty: Boolean(n.dirty),
    }));
}

/** Drops tombstones the cloud already has (or that are old and were never synced). */
function prune(notes: Note[]) {
  const now = Date.now();
  return notes.filter((n) => !n.deletedAt || (n.dirty && n.owner && now - new Date(n.deletedAt).getTime() < TOMBSTONE_TTL));
}

export const useNotes = create<NotesState>()(
  persist(
    (set) => ({
      notes: [],

      create: ({ body = '', pageTitle, pagePath, owner }) => {
        const id = uuid();
        const now = new Date().toISOString();
        set((s) => ({
          notes: [
            { id, body: body.slice(0, MAX_NOTE_BODY), pageTitle: pageTitle.slice(0, 200), pagePath: pagePath.slice(0, 400), createdAt: now, updatedAt: now, deletedAt: null, owner, dirty: true },
            ...s.notes,
          ],
        }));
        return id;
      },

      update: (id, body) =>
        set((s) => ({
          notes: s.notes.map((n) => (n.id === id && n.body !== body ? { ...n, body: body.slice(0, MAX_NOTE_BODY), updatedAt: stamp(n.updatedAt), dirty: true } : n)),
        })),

      remove: (id) =>
        set((s) => {
          const n = s.notes.find((x) => x.id === id);
          if (!n) return s;
          // Never uploaded and not owned yet: just forget it.
          if (!n.owner) return { notes: s.notes.filter((x) => x.id !== id) };
          const t = stamp(n.updatedAt);
          return { notes: s.notes.map((x) => (x.id === id ? { ...x, deletedAt: t, updatedAt: t, dirty: true } : x)) };
        }),

      claim: (uid) => set((s) => (s.notes.some((n) => !n.owner) ? { notes: s.notes.map((n) => (n.owner ? n : { ...n, owner: uid, dirty: true })) } : s)),

      applyRemote: (rows, uid) =>
        set((s) => {
          const byId = new Map(s.notes.map((n) => [n.id, n]));
          let changed = false;
          for (const r of rows) {
            if (r.user_id !== uid) continue;
            const local = byId.get(r.id);
            if (local && local.updatedAt >= r.updated_at) continue;
            changed = true;
            byId.set(r.id, {
              id: r.id,
              body: r.body ?? '',
              pageTitle: r.page_title ?? '',
              pagePath: r.page_path ?? '/',
              createdAt: r.created_at,
              updatedAt: r.updated_at,
              deletedAt: r.deleted_at,
              owner: uid,
              dirty: false,
            });
          }
          if (!changed) return s;
          return { notes: prune([...byId.values()]).sort((a, b) => b.createdAt.localeCompare(a.createdAt)) };
        }),

      markClean: (versions) =>
        set((s) => ({
          notes: prune(s.notes.map((n) => (versions[n.id] && versions[n.id] === n.updatedAt ? { ...n, dirty: false } : n))),
        })),
    }),
    {
      name: 'ecyr:notes',
      version: 1,
      partialize: (s) => ({ notes: s.notes }),
      merge: (persisted, current) => ({ ...current, notes: sanitize((persisted as { notes?: unknown } | undefined)?.notes) }),
    },
  ),
);

/** Notes visible to `uid` (signed out: only notes nobody owns), newest edit first, without tombstones. */
export function visibleNotes(notes: Note[], uid: string | null) {
  return notes.filter((n) => !n.deletedAt && (n.owner === null || n.owner === uid)).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

/** First line of a note, for list rows. */
export function noteTitle(n: Pick<Note, 'body'>) {
  const line = n.body.trim().split('\n')[0]?.trim() ?? '';
  return line ? (line.length > 80 ? `${line.slice(0, 80)}…` : line) : 'Nota vacía';
}
