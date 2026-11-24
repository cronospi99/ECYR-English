import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardCheck, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/store/auth';
import { classStatus, listMyAssignments } from '@/lib/assignments';
import { firstName, greetingFor, initialsOf } from '@/lib/spaceName';

/** Tasks handed in by students that the teacher has not reviewed yet (null while loading / unavailable). */
function useToReview(): number | null {
  const [n, setN] = useState<number | null>(null);
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const list = await listMyAssignments();
        const st = await classStatus(list.map((a) => a.id));
        if (live) setN(st.filter((s) => (s.status === 'done' || s.status === 'late') && !s.reviewed_at).length);
      } catch {
        if (live) setN(null); // Tasks not enabled or offline: just hide the chip
      }
    })();
    return () => {
      live = false;
    };
  }, []);
  return n;
}

/** Personal strip at the top of the teacher's space: greeting by time of day, initials and a short summary. */
export function SpaceHeader({ students }: { students: number | null }) {
  const name = useAuth((s) => s.profile?.full_name);
  const toReview = useToReview();
  const first = firstName(name);
  return (
    <Card className="mb-5 flex items-center gap-3 p-3.5 sm:p-4" data-testid="space-header">
      <span
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-[17px] font-bold text-white shadow-card"
        style={{ background: 'linear-gradient(135deg, var(--orange), var(--pink))' }}
        aria-hidden
      >
        {initialsOf(name)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-[17px] font-semibold">
          {greetingFor()}
          {first ? `, ${first}` : ''}
        </div>
        <div className="mt-1 flex flex-wrap gap-1.5 text-[13px]">
          {students != null && (
            <span className="bg-fill-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1">
              <Users size={14} className="text-ink-blue" aria-hidden /> {students} {students === 1 ? 'student' : 'students'}
            </span>
          )}
          {toReview != null && (
            <Link
              to="/teacher?tab=tasks"
              className="bg-fill-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 hover:opacity-80"
            >
              <ClipboardCheck size={14} className={toReview > 0 ? 'text-ink-orange' : 'text-ink-green'} aria-hidden />
              {toReview > 0 ? `${toReview} to review` : 'Nothing to review'}
            </Link>
          )}
        </div>
      </div>
    </Card>
  );
}
