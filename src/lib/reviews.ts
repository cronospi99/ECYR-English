/**
 * The teacher's manual review of a piece of student work (writing text or
 * speaking transcript): a general comment, comments on quotes of the text, a
 * 0–100 score and, for level exams, corrected per-skill scores and grade.
 * Stored in `public.submission_reviews` (supabase/migrations/14), written only
 * through `review_submission()`, which checks the student is in the class.
 */
import { supabase } from './supabase';
import { useAuth } from '@/store/auth';

export interface ReviewNote {
  quote: string;
  note: string;
  /** Offset of the quote in the text (to place it when the quote repeats). */
  at: number;
}

export interface Review {
  submission_id: string;
  title?: string | null;
  comment: string | null;
  notes: ReviewNote[];
  score: number | null;
  sections: Record<string, number | null> | null;
  grade: number | null;
  /** Visible to the student (false = teacher's draft). */
  shared: boolean;
  updated_at: string;
}

export type ReviewDraft = Omit<Review, 'submission_id' | 'updated_at' | 'title'>;

const COLS = 'submission_id,title,comment,notes,score,sections,grade,shared,updated_at';

/** Reviews of these submissions, keyed by submission id. Missing table → empty (with `missing`). */
export async function loadReviews(ids: string[]): Promise<{ reviews: Record<string, Review>; missing: boolean }> {
  if (!supabase || !ids.length) return { reviews: {}, missing: false };
  const { data, error } = await supabase.from('submission_reviews').select(COLS).in('submission_id', ids.slice(0, 300));
  if (error) {
    const missing = /submission_reviews|does not exist|schema cache/i.test(error.message);
    if (!missing) console.warn('[reviews] load failed:', error.message);
    return { reviews: {}, missing };
  }
  return { reviews: Object.fromEntries(((data ?? []) as Review[]).map((r) => [r.submission_id, { ...r, notes: Array.isArray(r.notes) ? r.notes : [] }])), missing: false };
}

export async function saveReview(id: string, d: ReviewDraft, title?: string): Promise<Review | null> {
  if (!supabase) throw new Error('Sin conexión con el servidor.');
  const { data, error } = await supabase.rpc('review_submission', {
    p_submission: id,
    p_comment: d.comment ?? '',
    p_notes: d.notes,
    p_score: d.score,
    p_sections: d.sections,
    p_grade: d.grade,
    p_title: title ?? null,
    p_shared: d.shared,
  });
  if (error) {
    if (/review_submission|does not exist|schema cache/i.test(error.message)) throw new Error('Falta activar las revisiones en Supabase (14_submission_reviews.sql).');
    throw new Error(error.message);
  }
  return (data as Review | null) ?? null;
}

/** Overall exam % from per-skill scores: the mean of the scored ones (as the exam does). */
export function examPct(sections: Record<string, number | null>): number | null {
  const v = Object.values(sections).filter((x): x is number => typeof x === 'number');
  return v.length ? Math.round(v.reduce((a, b) => a + b, 0) / v.length) : null;
}

/** The signed-in student's reviewed work, newest first (RLS: only their own). */
export async function loadMyReviews(limit = 20): Promise<Review[] | null> {
  const uid = useAuth.getState().session?.user.id;
  if (!supabase || !uid) return [];
  const { data, error } = await supabase.from('submission_reviews').select(COLS).eq('student_id', uid).order('updated_at', { ascending: false }).limit(limit);
  if (error) return null;
  return ((data ?? []) as Review[]).map((r) => ({ ...r, notes: Array.isArray(r.notes) ? r.notes : [] }));
}
