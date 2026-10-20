import { Link } from 'react-router-dom';
import { ChevronRight, GraduationCap, Trophy } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { loadExams, PASS_PCT, type Exam, type ExamLevel } from '@/content/exams';
import { useExamResults } from '@/store/exams';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';

/** One exam as a row: placed after the units it covers in a level's list. */
export function ExamRow({ exam, color = 'var(--orange)' }: { exam: Exam; color?: string }) {
  const r = useExamResults((s) => s.results[exam.id]);
  const final = exam.kind === 'final';
  return (
    <Link
      to={`/exams/${exam.id}`}
      className={cn('shadow-card flex items-center gap-3 rounded-[16px] p-3.5 transition-transform active:scale-[0.99]', final ? 'text-white' : 'bg-card')}
      style={final ? { background: 'linear-gradient(135deg, #8e3fbf, #d0234a)' } : { boxShadow: `inset 4px 0 0 ${color}` }}
    >
      <span
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[11px]"
        style={final ? { background: 'rgba(255,255,255,.2)' } : { background: tint(color, 16), color: ink(color) }}
      >
        {final ? <Trophy size={20} /> : <GraduationCap size={20} />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15.5px] font-bold">{exam.title}</span>
        <span className={cn('block text-[12.5px]', final ? 'opacity-85' : 'text-label-2')}>
          Listening · Reading · Writing · Speaking · Grammar · Vocabulary · {exam.minutes} min
        </span>
      </span>
      {r ? (
        <span className={cn('shrink-0 text-[14px] font-bold tabular-nums', final ? '' : r.best.pct >= PASS_PCT ? 'text-ink-green' : 'text-ink-orange')}>
          {r.best.grade.toFixed(1)}
        </span>
      ) : (
        <ChevronRight size={18} className={final ? 'opacity-80' : 'text-label-3'} />
      )}
    </Link>
  );
}

/** A level's exams, keyed by the last unit each one closes (the final under key 0). */
export function useLevelExams(level: ExamLevel | null) {
  const { data } = useAsync(() => (level ? loadExams(level) : Promise.resolve([] as Exam[])), [level]);
  const after = new Map<number, Exam>();
  let final: Exam | undefined;
  for (const e of data ?? []) {
    if (e.kind === 'final') final = e;
    else after.set(Math.max(...e.units), e);
  }
  return { after, final, all: data ?? [] };
}
