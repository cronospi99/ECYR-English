import { useCallback, useEffect, useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { claimSharedStudent, listSharedStudents, type SharedStudent } from '@/lib/teacher';

/** Students the platform owner opened to every teacher: a teacher adds them to their class with one tap. */
export function SharedPool({ onAdded }: { onAdded: () => void | Promise<void> }) {
  const [rows, setRows] = useState<SharedStudent[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try { setRows(await listSharedStudents()); } catch { setRows([]); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  if (!rows.length && !error) return null;
  const add = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      await claimSharedStudent(id);
      await Promise.all([load(), onAdded()]);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };
  return (
    <Card className="p-4">
      <h3 className="text-headline">Shared students</h3>
      <p className="text-label-2 text-[13px]">The admin opened them to all teachers. When you add them, you’ll see their progress and be able to assign them tasks; they will keep their other teachers.</p>
      {error && <p className="text-ink-red mt-2 text-[13px]">{error}</p>}
      <ul className="mt-2 divide-y divide-[var(--separator)]">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 py-2">
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-medium">{r.full_name || r.email}</div>
              <div className="text-label-2 truncate text-[12.5px]">{r.full_name ? `${r.email} · ` : ''}{r.teacher_name ?? 'sin clase'}</div>
            </div>
            <Button variant="gray" size="sm" disabled={busy === r.id} onClick={() => void add(r.id)}>
              <UserPlus size={15} /> Add to my class
            </Button>
          </li>
        ))}
      </ul>
    </Card>
  );
}
