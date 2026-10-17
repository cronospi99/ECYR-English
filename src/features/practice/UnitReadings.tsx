import { useRef, useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { loadUnitReadingList } from '@/content/unitReadings';
import type { CefrLevel } from '@/content/types';
import { useProgress } from '@/store/progress';
import { Reader, ReadingCard } from '@/features/library/ReadingLibrary';

/** The unit's extra readings as compact cards; one opens the full reader in place. Renders nothing when the unit has none. */
export function UnitReadings({ level, unit }: { level: CefrLevel; unit: number }) {
  const { data } = useAsync(() => loadUnitReadingList(level, unit), [level, unit]);
  const [openId, setOpenId] = useState<string | null>(null);
  const done = useProgress((s) => s.readings);
  const top = useRef<HTMLDivElement>(null);
  if (!data?.length) return null;

  const open = data.find((r) => r.id === openId);
  const go = (id: string | null) => {
    setOpenId(id);
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const read = data.filter((r) => done[`lib-${r.id}`]).length;

  return (
    <section ref={top} className="scroll-mt-4">
      {open ? (
        <Reader key={open.id} r={open} onBack={() => go(null)} backLabel="Lecturas de la unidad" />
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="flex items-center gap-2 text-[20px] font-bold">
              <BookOpen size={19} className="text-ink-blue" /> Lecturas de la unidad
            </h3>
            <span className="text-label-2 text-[13px]">
              {read}/{data.length} leídas
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.map((r, i) => (
              <ReadingCard key={r.id} r={r} i={i} onOpen={() => go(r.id)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
