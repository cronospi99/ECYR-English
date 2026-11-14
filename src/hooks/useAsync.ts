import { useEffect, useState } from 'react';
import { reloadOnce } from '@/lib/chunks';

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Resolves a promise-returning loader; re-runs when deps change. A failed load is tried twice more (phone networks drop). */
export function useAsync<T>(fn: () => Promise<T>, deps: unknown[]) {
  const [state, setState] = useState<{ data: T | null; error: Error | null; loading: boolean }>({
    data: null,
    error: null,
    loading: true,
  });
  useEffect(() => {
    let alive = true;
    setState((s) => ({ ...s, loading: true }));
    void (async () => {
      for (let attempt = 0; ; attempt++) {
        try {
          const data = await fn();
          if (alive) setState({ data, error: null, loading: false });
          return;
        } catch (e) {
          // A lazy file that no longer exists (new deploy): one reload fetches the new ones.
          if (reloadOnce(e)) return;
          if (!alive) return;
          const network = e instanceof TypeError || /network|fetch|load failed|timeout/i.test(e instanceof Error ? e.message : '');
          if (attempt >= 2 || !network) {
            setState({ data: null, error: e instanceof Error ? e : new Error(String(e)), loading: false });
            return;
          }
          await wait(900 * (attempt + 1));
          if (!alive) return;
        }
      }
    })();
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return state;
}
