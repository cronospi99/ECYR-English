/**
 * A new deploy renames every lazy file, so a page that was opened before it cannot fetch the
 * part it needs next. One reload gets the new files; the flag stops a reload loop when the
 * failure is something else (no connection), and is cleared once the app has run for a while.
 */
const FLAG = 'ecyr:reloaded';

export const isChunkError = (e: unknown): boolean =>
  /dynamically imported module|Importing a module script failed|error loading dynamically imported|Failed to load module script|Unable to preload CSS/i.test(
    e instanceof Error ? e.message : String(e ?? ''),
  );

/** Reloads the page once for a stale-deploy error. Returns true when a reload was started. */
export function reloadOnce(e: unknown): boolean {
  if (!isChunkError(e)) return false;
  try {
    if (sessionStorage.getItem(FLAG)) return false;
    sessionStorage.setItem(FLAG, '1');
  } catch {
    return false;
  }
  window.location.reload();
  return true;
}

/** Call when the app is up and stable: the next stale deploy may reload again. */
export function armReload(): void {
  window.setTimeout(() => {
    try {
      sessionStorage.removeItem(FLAG);
    } catch {
      /* ignore */
    }
  }, 20000);
}
