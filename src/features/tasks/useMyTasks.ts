import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/store/auth';
import { useProgress } from '@/store/progress';
import {
  autoDetect,
  effectiveStatus,
  listForMe,
  markDone as apiMarkDone,
  markPending as apiMarkPending,
  myStatus,
  saveDetected,
  sortByDue,
  type Assignment,
  type AssignmentStatus,
  type AssignmentVia,
  type EffectiveStatus,
} from '@/lib/assignments';

interface Cache {
  uid: string;
  at: number;
  assignments: Assignment[];
  statuses: Record<string, AssignmentStatus>;
}
let cache: Cache | null = null;

export interface TaskView {
  a: Assignment;
  s: AssignmentStatus | null;
  eff: EffectiveStatus;
}

/**
 * The signed-in student's tasks with their status. Loads once (shared by the
 * page and the Home widget for 30 s), then runs autoDetect against the local
 * activity log whenever either changes and saves what it finds.
 */
export function useMyTasks() {
  const ready = useAuth((s) => s.ready);
  const uid = useAuth((s) => s.session?.user.id ?? null);
  const profile = useAuth((s) => s.profile);
  const activity = useProgress((s) => s.activity);
  const enabled = Boolean(uid && profile && profile.role === 'student' && profile.teacher_id);

  const fresh = cache && cache.uid === uid && Date.now() - cache.at < 30_000 ? cache : null;
  const [assignments, setAssignments] = useState<Assignment[] | null>(fresh?.assignments ?? null);
  const [statuses, setStatuses] = useState<Record<string, AssignmentStatus>>(fresh?.statuses ?? {});
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(enabled && !fresh);
  const tried = useRef(new Set<string>());

  const commit = useCallback(
    (a: Assignment[] | null, s: Record<string, AssignmentStatus>) => {
      if (uid && a) cache = { uid, at: Date.now(), assignments: a, statuses: s };
    },
    [uid],
  );

  const reload = useCallback(async () => {
    if (!enabled) return;
    setLoading(true);
    setError(null);
    try {
      const [a, s] = await Promise.all([listForMe(profile?.teacher_id), myStatus()]);
      const map = Object.fromEntries(s.map((r) => [r.assignment_id, r]));
      setAssignments(a);
      setStatuses(map);
      commit(a, map);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [enabled, profile?.teacher_id, commit]);

  useEffect(() => {
    if (enabled && !fresh) void reload();
    if (!enabled) {
      setAssignments(null);
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, uid]);

  // Auto-detection: pending tasks the activity log already completes.
  useEffect(() => {
    if (!enabled || !assignments?.length) return;
    const found = autoDetect(assignments, Object.values(statuses), activity).filter((u) => !tried.current.has(u.assignment_id));
    if (!found.length) return;
    found.forEach((u) => tried.current.add(u.assignment_id));
    saveDetected(found)
      .then((rows) => {
        setStatuses((prev) => {
          const next = { ...prev };
          for (const r of rows) next[r.assignment_id] = r;
          commit(assignments, next);
          return next;
        });
      })
      .catch(() => {
        /* silent: retried on next load */
        found.forEach((u) => tried.current.delete(u.assignment_id));
      });
  }, [enabled, assignments, statuses, activity, commit]);

  const put = useCallback(
    (row: AssignmentStatus) =>
      setStatuses((prev) => {
        const next = { ...prev, [row.assignment_id]: row };
        commit(assignments, next);
        return next;
      }),
    [assignments, commit],
  );

  const markDone = useCallback(
    async (id: string, o: { via?: AssignmentVia; score?: number | null; portfolioItemId?: string | null; note?: string | null } = {}) => {
      const row = await apiMarkDone(id, o);
      put(row);
      return row;
    },
    [put],
  );

  const markPending = useCallback(
    async (id: string) => {
      const row = await apiMarkPending(id);
      put(row);
      return row;
    },
    [put],
  );

  const views = useMemo<TaskView[]>(() => {
    const now = new Date();
    return (assignments ?? []).map((a) => {
      const s = statuses[a.id] ?? null;
      return { a, s, eff: effectiveStatus(a, s, now) };
    });
  }, [assignments, statuses]);

  const pending = useMemo(() => views.filter((v) => v.eff === 'pending' || v.eff === 'overdue').sort((x, y) => sortByDue(x.a, y.a)), [views]);
  const finished = useMemo(
    () => views.filter((v) => !(v.eff === 'pending' || v.eff === 'overdue')).sort((x, y) => (y.s?.done_at ?? y.s?.updated_at ?? '').localeCompare(x.s?.done_at ?? x.s?.updated_at ?? '')),
    [views],
  );

  return {
    ready,
    uid,
    profile,
    enabled,
    loading: loading || (enabled && assignments === null && !error),
    error,
    pending,
    finished,
    reload,
    markDone,
    markPending,
  };
}
