import { useNow, pad, type WidgetProps } from '../util';
import { Pills } from './ui';

interface D {
  mode: 'digital' | 'analog' | 'both';
  h24: boolean;
}

function Analog({ d }: { d: Date }) {
  const s = d.getSeconds();
  const m = d.getMinutes() + s / 60;
  const h = (d.getHours() % 12) + m / 60;
  const hand = (deg: number, len: number, w: number, color: string) => (
    <line x1="50" y1="50" x2="50" y2={50 - len} stroke={color} strokeWidth={w} strokeLinecap="round" transform={`rotate(${deg} 50 50)`} />
  );
  return (
    <svg viewBox="0 0 100 100" className="h-full max-h-full w-full">
      <circle cx="50" cy="50" r="48" fill="var(--card)" stroke="var(--label)" strokeWidth="2.5" />
      {Array.from({ length: 60 }, (_, i) => (
        <line key={i} x1="50" y1="5" x2="50" y2={i % 5 ? 7 : 10} stroke={i % 5 ? 'var(--label-3)' : 'var(--label)'} strokeWidth={i % 5 ? 0.6 : 1.8} transform={`rotate(${i * 6} 50 50)`} />
      ))}
      {Array.from({ length: 12 }, (_, i) => {
        const a = ((i + 1) * 30 * Math.PI) / 180;
        return (
          <text key={i} x={50 + 34 * Math.sin(a)} y={50 - 34 * Math.cos(a)} textAnchor="middle" dominantBaseline="central" fontSize="8" fontWeight="700" fill="var(--label)">
            {i + 1}
          </text>
        );
      })}
      {hand(h * 30, 24, 3.6, 'var(--label)')}
      {hand(m * 6, 34, 2.4, 'var(--label)')}
      {hand(s * 6, 38, 1, '#ef4444')}
      <circle cx="50" cy="50" r="2.6" fill="#ef4444" />
    </svg>
  );
}

export default function Clock({ data, set, editing }: WidgetProps<D>) {
  const now = new Date(useNow(true, 1000));
  const mode = data.mode ?? 'both';
  const h24 = data.h24 ?? true;
  const h = now.getHours();
  const hh = h24 ? pad(h) : String(h % 12 || 12);
  const date = now.toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="flex h-full flex-col">
      <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-[2cqh] p-3 [container-type:size]">
        {mode !== 'digital' && (
          <div className="min-h-0 w-full flex-1">
            <Analog d={now} />
          </div>
        )}
        {mode !== 'analog' && (
          <div className="font-rounded leading-none font-bold tabular-nums" style={{ fontSize: mode === 'both' ? 'min(14cqh, 18cqw)' : 'min(40cqh, 24cqw)' }}>
            {hh}:{pad(now.getMinutes())}
            <span className="text-label-3" style={{ fontSize: '0.45em' }}>
              :{pad(now.getSeconds())}
              {!h24 && (h < 12 ? ' am' : ' pm')}
            </span>
          </div>
        )}
        <div className="text-label-2 font-semibold first-letter:uppercase" style={{ fontSize: mode === 'digital' ? 'min(10cqh, 7cqw)' : 'min(7cqh, 6cqw)' }}>
          {date}
        </div>
      </div>
      {editing && (
        <div className="flex flex-wrap justify-center gap-2 px-3 pb-3">
          <Pills value={mode} onChange={(v) => set({ mode: v })} options={[{ value: 'digital', label: 'Digital' }, { value: 'analog', label: 'Agujas' }, { value: 'both', label: 'Ambos' }]} />
          <Pills value={h24 ? 24 : 12} onChange={(v) => set({ h24: v === 24 })} options={[{ value: 24, label: '24 h' }, { value: 12, label: '12 h' }]} />
        </div>
      )}
    </div>
  );
}
