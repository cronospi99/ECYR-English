import { Flag, Pause, Play, RotateCcw } from 'lucide-react';
import { fmt, useNow, useSpace, type WidgetProps } from '../util';
import { Act } from './ui';

interface D {
  startedAt: number | null;
  acc: number;
  laps: number[];
}

export default function Stopwatch({ data, set, focused }: WidgetProps<D>) {
  const startedAt = data.startedAt ?? null;
  const running = startedAt !== null;
  const now = useNow(running, 50);
  const acc = data.acc ?? 0;
  const t = acc + (running ? now - startedAt : 0);
  const laps = data.laps ?? [];

  const toggle = () => (running ? set({ startedAt: null, acc: t }) : set({ startedAt: Date.now() }));
  useSpace(focused, toggle);

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 items-center justify-center [container-type:size]">
        <span className="font-rounded font-bold tabular-nums" style={{ fontSize: 'min(42cqh, 17cqw)' }}>
          {fmt(t, true)}
        </span>
      </div>
      {laps.length > 0 && (
        <ol className="mx-3 max-h-[38%] min-h-[44px] overflow-auto rounded-[12px] bg-fill-2 px-3 py-1.5 text-[15px] tabular-nums">
          {laps
            .map((l, i) => ({ l, i, d: l - (laps[i - 1] ?? 0) }))
            .reverse()
            .map(({ l, i, d }) => (
              <li key={i} className="flex justify-between gap-3 py-0.5">
                <span className="text-label-2 font-semibold">#{i + 1}</span>
                <span className="text-label-2">+{fmt(d, true)}</span>
                <span className="font-semibold">{fmt(l, true)}</span>
              </li>
            ))}
        </ol>
      )}
      <div className="flex items-center justify-center gap-2 p-3">
        <Act solid color={running ? 'var(--orange)' : 'var(--green)'} onClick={toggle} className="px-5" aria-label={running ? 'Pausar' : 'Iniciar'}>
          {running ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
          {running ? 'Pausa' : 'Iniciar'}
        </Act>
        <Act color="var(--blue)" disabled={!running} onClick={() => set({ laps: [...laps, t].slice(-99) })} aria-label="Vuelta">
          <Flag size={18} /> Vuelta
        </Act>
        <Act color="var(--label)" disabled={!t} onClick={() => set({ startedAt: null, acc: 0, laps: [] })} aria-label="Reiniciar">
          <RotateCcw size={18} />
        </Act>
      </div>
    </div>
  );
}
