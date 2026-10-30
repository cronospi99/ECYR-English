/* Class Wars — question sources: the app's curriculum bank (lazy JSON per level, built from
   src/content: unit tests, vocabulary, exams, workshops, visual vocabulary) and the teacher's own
   sets (Supabase table class_wars_sets, migration 20). */
import { supabase } from '@/lib/supabase';

export interface Q { q: string; o: string[]; a: number }
export const LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'] as const;
export type Level = (typeof LEVELS)[number];

interface Bank { level: string; units: [number, string][]; q: [string, string[], number, number[]][] }

const loaders: Record<Level, () => Promise<{ default: unknown }>> = {
  A1: () => import('../data/bank-a1.json'),
  A2: () => import('../data/bank-a2.json'),
  B1: () => import('../data/bank-b1.json'),
  B2: () => import('../data/bank-b2.json'),
  C1: () => import('../data/bank-c1.json'),
  C2: () => import('../data/bank-c2.json'),
};

const cache = new Map<Level, Bank>();
export async function loadBank(level: Level): Promise<Bank> {
  const hit = cache.get(level);
  if (hit) return hit;
  const m = await loaders[level]();
  const b = m.default as Bank;
  cache.set(level, b);
  return b;
}

/** Questions of a level, optionally only some units (level-wide items always count). */
export async function curriculumQuestions(level: Level, units: number[] = []): Promise<Q[]> {
  const b = await loadBank(level);
  const want = new Set(units);
  const rows = b.q.filter(([, , , us]) => !want.size || !us.length || us.some((u) => want.has(u)));
  // When some units are chosen, keep the unit-specific items first in weight.
  return rows.map(([q, o, a]) => ({ q, o, a }));
}

export function shuffle<T>(arr: T[], rand = Math.random): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffle the options of each question (answer index follows). */
export function shuffleOptions(qs: Q[]): Q[] {
  return qs.map((x) => {
    const order = shuffle(x.o.map((_, i) => i));
    return { q: x.q, o: order.map((i) => x.o[i]), a: order.indexOf(x.a) };
  });
}

/* ------------------------------------------------------------ custom sets */
export interface QSet { id: string; title: string; level: string; items: Q[]; updated_at?: string }
export const SET_LIMITS = { title: 80, items: 200, q: 220, o: 90 };

export async function listSets(): Promise<QSet[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from('class_wars_sets').select('id,title,level,items,updated_at').order('updated_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ ...(r as QSet), items: normaliseItems((r as { items: unknown }).items) }));
}

export async function saveSet(s: { id?: string | null; title: string; level: string; items: Q[] }): Promise<string> {
  if (!supabase) throw new Error('Supabase no está configurado.');
  const { data, error } = await supabase.rpc('save_class_wars_set', {
    p_id: s.id ?? null,
    p_title: s.title.trim().slice(0, SET_LIMITS.title),
    p_level: s.level,
    p_items: s.items.map((i) => ({ q: i.q, o: i.o, a: i.a })),
  });
  if (error) throw new Error(error.message);
  return data as string;
}

export async function deleteSet(id: string): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.rpc('delete_class_wars_set', { p_id: id });
  if (error) throw new Error(error.message);
}

export function normaliseItems(raw: unknown): Q[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((r) => r as { q?: unknown; o?: unknown; a?: unknown })
    .filter((r) => typeof r.q === 'string' && Array.isArray(r.o) && typeof r.a === 'number')
    .map((r) => ({ q: String(r.q), o: (r.o as unknown[]).map(String).slice(0, 4), a: Number(r.a) }))
    .filter((r) => r.o.length >= 2 && r.a >= 0 && r.a < r.o.length);
}

export function validItem(i: Q): string | null {
  if (!i.q.trim()) return 'Falta la pregunta';
  if (i.q.length > SET_LIMITS.q) return 'Pregunta demasiado larga';
  const filled = i.o.filter((o) => o.trim());
  if (filled.length < 2) return 'Necesita al menos 2 opciones';
  if (!i.o[i.a]?.trim()) return 'Marca la respuesta correcta';
  if (i.o.some((o) => o.length > SET_LIMITS.o)) return 'Opción demasiado larga';
  return null;
}

/**
 * Plain-text import. One question per line:
 *   Question? | correct answer | wrong | wrong | wrong
 * or a block: the question on one line, then the options on the next lines with "*" before the correct one.
 */
export function parseText(text: string): Q[] {
  const out: Q[] = [];
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  let block: string[] = [];
  const flush = () => {
    if (block.length >= 3) {
      const [q, ...opts] = block;
      let a = opts.findIndex((o) => o.startsWith('*'));
      const o = opts.slice(0, 4).map((x) => x.replace(/^\*\s*/, '').replace(/^[a-dA-D][).]\s+/, '').replace(/^[-•]\s*/, ''));
      if (a < 0 || a > 3) a = 0;
      out.push({ q: q.replace(/^\d+[).]\s*/, ''), o, a });
    }
    block = [];
  };
  for (const l of lines) {
    if (!l) { flush(); continue; }
    if (l.includes('|')) {
      flush();
      const parts = l.split('|').map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 3) out.push({ q: parts[0], o: parts.slice(1, 5), a: 0 });
      continue;
    }
    block.push(l);
  }
  flush();
  return out.filter((q) => !validItem(q)).map((q) => {
    // keep the correct answer but put it in a random place
    const correct = q.o[q.a];
    const o = shuffle(q.o);
    return { q: q.q.slice(0, SET_LIMITS.q), o: o.map((x) => x.slice(0, SET_LIMITS.o)), a: o.indexOf(correct) };
  });
}
