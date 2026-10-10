/**
 * Reads the IELTS simulator's own browser storage (same origin, key
 * `ielts:ielts-history`) so the platform dashboard can show its bands.
 */
export type IeltsModule = 'listening' | 'reading' | 'writing' | 'speaking';

export interface IeltsSnapshot {
  scores: Record<IeltsModule, number | null>;
  history: { date: string; module: string; band: number; detail?: string }[];
  overall: number | null;
}

export function readIelts(): IeltsSnapshot {
  const empty: IeltsSnapshot = {
    scores: { listening: null, reading: null, writing: null, speaking: null },
    history: [],
    overall: null,
  };
  try {
    const raw = localStorage.getItem('ielts:ielts-history');
    if (!raw) return empty;
    const parsed = JSON.parse(raw) as Partial<IeltsSnapshot>;
    const scores = { ...empty.scores, ...(parsed.scores ?? {}) };
    const vals = Object.values(scores).filter((v): v is number => typeof v === 'number');
    // IELTS rounds the mean of the four bands to the nearest half band.
    const overall = vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length) * 2) / 2 : null;
    return { scores, history: Array.isArray(parsed.history) ? parsed.history : [], overall };
  } catch {
    return empty;
  }
}

/** Approximate CEFR equivalence published by Cambridge/IELTS. */
export function bandToCefr(band: number | null) {
  if (band == null) return null;
  if (band >= 8.5) return 'C2';
  if (band >= 7) return 'C1';
  if (band >= 5.5) return 'B2';
  if (band >= 4) return 'B1';
  return 'A2';
}
