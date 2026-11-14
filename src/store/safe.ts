/**
 * Saved state can come from an older version of the app, from another device through the
 * cloud, or from a browser that cut a write short. `safeMerge` only accepts a saved value
 * when it has the same kind as the default (a list stays a list, a record stays a record),
 * so a stray `null` can never reach a screen that expects a list.
 */
const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

export function safeMerge<T extends object>(saved: unknown, defaults: T): T {
  const out = { ...defaults } as Record<string, unknown>;
  if (!isRecord(saved)) return out as T;
  const base = defaults as Record<string, unknown>;
  for (const [k, v] of Object.entries(saved)) {
    const d = base[k];
    if (typeof d === 'function' || v === undefined) continue;
    if (Array.isArray(d)) {
      if (Array.isArray(v)) out[k] = v.filter((x) => x !== null && x !== undefined);
    } else if (isRecord(d)) {
      if (isRecord(v)) out[k] = v;
    } else if (d === null || d === undefined) out[k] = v;
    else if (typeof v === typeof d) out[k] = v;
  }
  return out as T;
}

/** For zustand's `persist({ merge })`: keeps the actions, takes only well-formed saved values. */
export const mergeSaved = <T extends object>(saved: unknown, current: T): T => safeMerge(saved, current);

/**
 * Removes saved values that are literally "null" or "undefined" (left by an interrupted or
 * buggy write). A missing key always falls back to the default; these two do not.
 */
export function repairStorage(): void {
  for (const store of [() => localStorage, () => sessionStorage]) {
    try {
      const s = store();
      const bad: string[] = [];
      for (let i = 0; i < s.length; i++) {
        const k = s.key(i);
        if (!k) continue;
        const v = s.getItem(k);
        if (v === 'null' || v === 'undefined') bad.push(k);
      }
      bad.forEach((k) => s.removeItem(k));
    } catch {
      /* storage blocked: nothing to repair */
    }
  }
}
