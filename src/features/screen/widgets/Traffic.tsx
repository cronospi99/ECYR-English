import { cn } from '@/lib/cn';
import type { WidgetProps } from '../util';

type L = 'red' | 'yellow' | 'green';
interface D {
  on: L | null;
}

const LIGHTS: { id: L; hex: string; label: string }[] = [
  { id: 'red', hex: '#ff3b30', label: 'Alto' },
  { id: 'yellow', hex: '#ffcc00', label: 'Atención' },
  { id: 'green', hex: '#34c759', label: 'Adelante' },
];

export default function Traffic({ data, set }: WidgetProps<D>) {
  const on = data.on ?? 'red';
  const cur = LIGHTS.find((l) => l.id === on);
  return (
    <div className="flex h-full flex-col items-center justify-center gap-[3cqh] p-3 [container-type:size]">
      <div
        className="flex min-h-0 flex-1 flex-col items-center justify-around rounded-[999px] bg-[#1c1c1e] p-[4cqmin] shadow-[inset_0_2px_10px_rgb(0_0_0/0.6),0_6px_20px_-6px_rgb(0_0_0/0.5)]"
        style={{ aspectRatio: '1 / 2.6', maxWidth: '100%' }}
      >
        {LIGHTS.map((l) => {
          const lit = l.id === on;
          return (
            <button
              key={l.id}
              type="button"
              aria-label={l.label}
              aria-pressed={lit}
              onClick={() => set({ on: lit ? null : l.id })}
              className={cn('aspect-square w-[78%] rounded-full transition-[background-color,box-shadow,opacity] duration-300', !lit && 'opacity-90')}
              style={{
                background: lit ? `radial-gradient(circle at 35% 30%, #fff8 0, ${l.hex} 35%, ${l.hex} 70%)` : `color-mix(in srgb, ${l.hex} 18%, #111)`,
                boxShadow: lit ? `0 0 32px 8px ${l.hex}aa, inset 0 -4px 10px rgb(0 0 0 / .25)` : 'inset 0 3px 8px rgb(0 0 0 / .6)',
              }}
            />
          );
        })}
      </div>
      <div className="font-rounded h-[1.2em] leading-none font-black" style={{ fontSize: 'min(9cqh, 18cqw)', color: cur ? `color-mix(in srgb, ${cur.hex} 75%, var(--label))` : 'var(--label-3)' }}>
        {cur?.label ?? ''}
      </div>
    </div>
  );
}
