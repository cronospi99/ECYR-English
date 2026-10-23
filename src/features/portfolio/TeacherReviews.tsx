import { useEffect, useState } from 'react';
import { ChevronDown, GraduationCap } from 'lucide-react';
import { loadMyReviews, type Review } from '@/lib/reviews';
import { EXAM_SECTIONS, PASS_PCT } from '@/content/exams';
import { relativeTime } from '@/lib/date';
import { cn } from '@/lib/cn';

const fmt = (g: number) => g.toFixed(1).replace('.', ',');

/**
 * The student's reviewed work: grade, the teacher's comment and the comments
 * on their own words. Hidden when there is nothing (or the table isn't there).
 */
export function TeacherReviews() {
  const [list, setList] = useState<Review[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);
  useEffect(() => {
    void loadMyReviews().then((r) => {
      setList(r);
      if (r?.[0]) setOpen(r[0].submission_id);
    });
  }, []);
  if (!list?.length) return null;
  return (
    <section className="mb-6">
      <h2 className="text-title-3 mb-2 flex items-center gap-2 px-1">
        <GraduationCap size={20} className="text-ink-indigo" /> Revisiones de tu profe
      </h2>
      <ul className="bg-card shadow-card divide-separator divide-y overflow-hidden rounded-[18px]">
        {list.map((r) => {
          const isOpen = open === r.submission_id;
          const pass = r.grade != null ? r.grade * 20 >= PASS_PCT : r.score != null ? r.score >= PASS_PCT : null;
          return (
            <li key={r.submission_id}>
              <button type="button" onClick={() => setOpen(isOpen ? null : r.submission_id)} aria-expanded={isOpen} className="hover:bg-fill-2 flex w-full items-center gap-3 px-4 py-3 text-left">
                <span
                  className={cn('inline-flex h-11 min-w-11 shrink-0 items-center justify-center rounded-[12px] px-1.5 text-[16px] font-bold tabular-nums', pass === null ? 'bg-fill-2' : 'text-white')}
                  style={pass === null ? undefined : { background: pass ? 'var(--green)' : 'var(--red)' }}
                >
                  {r.grade != null ? fmt(r.grade) : r.score != null ? r.score : '💬'}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-semibold">{r.title || 'Trabajo revisado'}</span>
                  <span className="text-label-2 block truncate text-[13px]">{r.comment || `${r.notes.length} comentarios en tu texto`}</span>
                </span>
                <span className="text-label-2 shrink-0 text-[12px]">{relativeTime(r.updated_at)}</span>
                <ChevronDown size={16} className={cn('text-label-3 shrink-0 transition-transform', isOpen && 'rotate-180')} />
              </button>
              {isOpen && (
                <div className="space-y-3 px-4 pb-4">
                  {r.sections && (
                    <div className="flex flex-wrap gap-1.5">
                      {EXAM_SECTIONS.filter((s) => r.sections![s.id] != null).map((s) => (
                        <span key={s.id} className="bg-fill-2 rounded-full px-2.5 py-1 text-[13px]">
                          {s.emoji} {s.label} <b className="tabular-nums">{r.sections![s.id]}%</b>
                        </span>
                      ))}
                    </div>
                  )}
                  {r.comment && <p className="text-[15px] whitespace-pre-wrap">{r.comment}</p>}
                  {r.notes.length > 0 && (
                    <ol className="space-y-1.5">
                      {r.notes.map((n, i) => (
                        <li key={i} className="flex items-start gap-2 text-[14.5px]">
                          <span className="bg-ink-indigo inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white" style={{ background: 'var(--indigo)' }}>
                            {i + 1}
                          </span>
                          <span className="min-w-0">
                            <mark className="rounded-[3px] px-0.5" style={{ background: 'color-mix(in srgb, #ffd60a 45%, transparent)' }}>
                              {n.quote}
                            </mark>{' '}
                            → {n.note}
                          </span>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
