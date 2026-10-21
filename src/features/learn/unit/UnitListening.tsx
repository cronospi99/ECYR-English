import { useRef, useState } from 'react';
import { Headphones } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { loadUnitListenings } from '@/content/unitListening';
import type { CefrLevel } from '@/content/types';
import { useProgress } from '@/store/progress';
import { TrackCard, TrackPlayer } from '@/features/library/ListeningLibrary';

/**
 * The unit's own listening tracks as compact cards; one opens the full player
 * in place (scrubbable audio, transcript, questions and dictation). Progress
 * is saved like the library's tracks. Renders nothing when the unit has none.
 */
export function UnitListenings({ level, unit }: { level: CefrLevel; unit: number }) {
  const { data } = useAsync(() => loadUnitListenings(level, unit), [level, unit]);
  const [openId, setOpenId] = useState<string | null>(null);
  const activity = useProgress((s) => s.activity);
  const top = useRef<HTMLDivElement>(null);
  if (!data?.length) return null;

  const open = data.find((t) => t.id === openId);
  const go = (id: string | null) => {
    setOpenId(id);
    requestAnimationFrame(() => top.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };
  const doneIds = new Set(activity.filter((a) => a.ref?.startsWith('listening:lib-')).map((a) => a.ref!.slice(14)));
  const done = data.filter((t) => doneIds.has(t.id)).length;

  return (
    <section ref={top} className="scroll-mt-20 lg:scroll-mt-4">
      {open ? (
        <TrackPlayer key={open.id} t={open} onBack={() => go(null)} backLabel="Listenings de la unidad" />
      ) : (
        <>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h3 className="flex items-center gap-2 text-[20px] font-bold">
              <Headphones size={19} className="text-ink-blue" /> Listenings de la unidad
            </h3>
            <span className="text-label-2 text-[13px]">
              {done}/{data.length} hechos
            </span>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.map((t, i) => (
              <TrackCard key={t.id} t={t} i={i} done={doneIds.has(t.id)} onOpen={() => go(t.id)} />
            ))}
          </div>
        </>
      )}
    </section>
  );
}
