/* Cryptographically-seeded randomness with rejection sampling for uniform draws. */
export function randInt(n: number): number {
  if (n <= 1) return 0;
  const g = typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function" ? crypto : null;
  if (!g) return Math.floor(Math.random() * n);
  const limit = Math.floor(4294967296 / n) * n;
  const buf = new Uint32Array(1);
  let v: number;
  do {
    g.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return v % n;
}

export function shuffle<T>(arr: readonly T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = randInt(i + 1);
    const t = a[i];
    a[i] = a[j];
    a[j] = t;
  }
  return a;
}

export function pick<T>(arr: readonly T[]): T {
  return arr[randInt(arr.length)];
}

export const range = (n: number) => Array.from({ length: n }, (_, i) => i);

/* no repeat impostor in back-to-back games; falls back to everyone if too few players */
export function pickImpostors<T>(ids: readonly T[], count: number, prev: readonly T[]): T[] {
  let eligible = ids.filter((i) => prev.indexOf(i) === -1);
  if (eligible.length < count) eligible = ids.slice();
  return shuffle(eligible).slice(0, count);
}
