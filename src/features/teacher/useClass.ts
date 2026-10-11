import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/store/auth';
import { loadClass, type StudentData } from '@/lib/teacher';

let cache: { teacher: string; students: StudentData[]; at: number } | null = null;

/** The signed-in teacher's students with their synced progress (cached for a minute). */
export function useClass() {
  const profile = useAuth((s) => s.profile);
  const teacherId = profile?.role === 'teacher' ? profile.id : null;
  const fresh = cache && cache.teacher === teacherId && Date.now() - cache.at < 60_000 ? cache.students : null;
  const [students, setStudents] = useState<StudentData[] | null>(fresh);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(!fresh && !!teacherId);

  const reload = useCallback(async () => {
    if (!teacherId) return;
    setLoading(true);
    const r = await loadClass(teacherId);
    cache = { teacher: teacherId, students: r.students, at: Date.now() };
    setStudents(r.students);
    setError(r.error);
    setLoading(false);
  }, [teacherId]);

  useEffect(() => {
    if (teacherId && !fresh) void reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacherId]);

  return { isTeacher: !!teacherId, classCode: profile?.class_code ?? null, students, error, loading, reload };
}
