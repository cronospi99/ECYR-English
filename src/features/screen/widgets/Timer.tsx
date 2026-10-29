import { useEffect } from 'react';
import { ChevronDown, ChevronUp, Pause, Play, RotateCcw, PieChart, Hash, Bell } from 'lucide-react';
import { cn } from '@/lib/cn';
import { alarm, fmt, useNow, useSpace, type WidgetProps } from '../util';
import { Act } from './ui';

interface D {
  total: number; // seconds
  left: number; // ms remaining while paused
  endAt: number | null;
  visual: boolean;
  done: boolean;
}

const PRESETS = [1, 3, 5, 10];

/** Arc path for a pie slice covering `f` (0–1) of the circle, clockwise from 12 o'clock. */
function pie(f: number, r = 50, c = 50) {
  if (f >= 0.9999) return `M${c},${c - r}A${r},${r} 0 1,1 ${c - 0.01},${c - r}Z`;
  if (f <= 0) return '';
  const a = f * 2 * Math.PI;
  const x = c + r * Math.sin(a);
  const y = c - r * Math.cos(a);
  return `M${c},${c}L${c},${c - r}A${r},${r} 0 ${f > 0.5 ? 1 : 0},1 ${x},${y}Z`;
}

export default function Timer({ data, set, focused }: WidgetProps<D>) {
  const total = data.total ?? 300;
  const endAt = data.endAt ?? null;
  const running = endAt !== null;
  const now = useNow(running, 100);
  const left = running ? Math.max(0, endAt - now) : (data.left ?? total * 1000);
  const idle = !running && left >= total * 1000 && !data.done;
  const frac = total ? left / (total * 1000) : 0;
  const visual = !!data.visual;

  useEffect(() => {
    if (running && endAt <= now) {
      set({ endAt: null, left: 0, done: true });
      if (now - endAt < 5000) alarm();
    }
  }, [running, endAt, now, set]);

  const start = () => {
    if (left <= 0) return;
    set({ endAt: Date.now() + left, done: false });
  };
  const pause = () => set({ endAt: null, left });
  const reset = () => set({ endAt: null, left: total * 1000, done: false });
  const toggle = () => (running ? pause() : data.done ? reset() : start());
  useSpace(focused, toggle);

  const setTotal = (s: number) => {
    const v = Math.max(0, Math.min(99 * 60 + 59, s));
    set({ total: v, left: v * 1000, endAt: null, done: false });
  };

  const m = Math.floor(total / 60);
  const s = total % 60;
  // [value, step in seconds, max digit]
  const digits: [number, number, number][] = [
    [Math.floor(m / 10), 600, 9],
    [m % 10, 60, 9],
    [Math.floor(s / 10), 10, 5],
    [s % 10, 1, 9],
  ];
  const bump = (i: number, dir: 1 | -1) => {
    const [v, step, max] = digits[i]!;
    const nv = (v + dir + max + 1) % (max + 1);
    setTotal(total + (nv - v) * step);
  };

  const color = data.done ? 'var(--red)' : frac < 0.1 ? 'var(--red)' : frac < 0.25 ? 'var(--orange)' : 'var(--blue)';

  return (
    <div className={cn('flex h-full flex-col', data.done && 'scr-flash')}>
      <div className="relative min-h-0 flex-1 [container-type:size]">
        {idle ? (
          <div className="flex h-full items-center justify-center gap-[1cqw]">
            {digits.map(([v], i) => (
              <div key={i} className="contents">
                {i === 2 && <span className="text-label-3 font-bold" style={{ fontSize: 'min(30cqh, 18cqw)' }}>:</span>}
                <div className="flex flex-col items-center">
                  <button type="button" aria-label="Subir" onClick={() => bump(i, 1)} className="text-label-2 hover:bg-fill-2 grid place-items-center rounded-full active:scale-90" style={{ width: 'min(16cqw,22cqh)', height: 'min(11cqw,16cqh)' }}>
                    <ChevronUp style={{ width: '70%', height: '70%' }} />
                  </button>
                  <span className="font-rounded leading-none font-bold tabular-nums" style={{ fontSize: 'min(40cqh, 22cqw)' }}>
                    {v}
                  </span>
                  <button type="button" aria-label="Bajar" onClick={() => bump(i, -1)} className="text-label-2 hover:bg-fill-2 grid place-items-center rounded-full active:scale-90" style={{ width: 'min(16cqw,22cqh)', height: 'min(11cqw,16cqh)' }}>
                    <ChevronDown style={{ width: '70%', height: '70%' }} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : visual ? (
          <div className="flex h-full flex-col items-center justify-center gap-[2cqh] p-[3cqmin]">
            <svg viewBox="0 0 100 100" className="min-h-0 flex-1" style={{ maxWidth: '100%' }}>
              <circle cx="50" cy="50" r="49" fill="var(--fill-2)" stroke="var(--separator)" strokeWidth="1" />
              {Array.from({ length: 12 }, (_, i) => (
                <line key={i} x1="50" y1="3" x2="50" y2={i % 3 ? 7 : 10} stroke="var(--label-3)" strokeWidth={i % 3 ? 0.8 : 1.6} transform={`rotate(${i * 30} 50 50)`} />
              ))}
              <path d={pie(frac, 44)} fill={data.done ? 'var(--red)' : '#ef4444'} style={{ transition: 'd .2s linear' }} />
              <circle cx="50" cy="50" r="4" fill="var(--card)" stroke="var(--label-3)" />
            </svg>
            <span className="font-rounded font-bold tabular-nums" style={{ fontSize: 'min(12cqh, 12cqw)', color }}>
              {data.done ? '¡Tiempo!' : fmt(left + 999)}
            </span>
          </div>
        ) : (
          <div className="relative flex h-full items-center justify-center p-[3cqmin]">
            <svg viewBox="0 0 100 100" className="absolute h-[94cqmin] w-[94cqmin] -rotate-90">
              <circle cx="50" cy="50" r="45" fill="none" stroke="var(--fill)" strokeWidth="6" />
              {frac > 0.002 && <circle cx="50" cy="50" r="45" fill="none" stroke={color} strokeWidth="6" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={1 - frac} style={{ transition: 'stroke-dashoffset .15s linear, stroke .3s' }} />}
            </svg>
            <span className="font-rounded relative font-bold tabular-nums" style={{ fontSize: data.done ? 'min(17cqmin, 13cqw)' : 'min(24cqmin, 19cqw)', color: data.done ? color : undefined }}>
              {data.done ? '¡Tiempo!' : fmt(left + 999)}
            </span>
          </div>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-center gap-2 px-3 pt-1 pb-3">
        {idle &&
          PRESETS.map((p) => (
            <button key={p} type="button" onClick={() => setTotal(p * 60)} className={cn('h-9 rounded-full px-3 text-[14px] font-bold', total === p * 60 ? 'bg-label text-bg' : 'bg-fill-2 hover:bg-fill')}>
              {p}′
            </button>
          ))}
        <Act solid color={running ? 'var(--orange)' : 'var(--green)'} onClick={toggle} aria-label={running ? 'Pausar' : 'Iniciar'} className="px-5">
          {running ? <Pause size={20} fill="currentColor" /> : data.done ? <Bell size={20} /> : <Play size={20} fill="currentColor" />}
          <span className="hidden sm:inline">{running ? 'Pausa' : data.done ? 'OK' : 'Iniciar'}</span>
        </Act>
        {!idle && (
          <Act color="var(--label)" onClick={reset} aria-label="Reiniciar">
            <RotateCcw size={18} />
          </Act>
        )}
        <Act color="var(--purple)" onClick={() => set({ visual: !visual })} aria-label={visual ? 'Modo números' : 'Modo visual'} title={visual ? 'Números' : 'Visual'}>
          {visual ? <Hash size={18} /> : <PieChart size={18} />}
        </Act>
      </div>
    </div>
  );
}
