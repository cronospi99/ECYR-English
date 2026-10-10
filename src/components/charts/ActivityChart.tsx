import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { lastNDays } from '@/lib/date';

/**
 * Daily XP as bars (single series → no legend; the card title names it).
 * Thin bars with rounded data-ends, recessive grid, a dashed daily-goal
 * reference, and a per-bar hover/focus tooltip.
 */
export function ActivityChart({
  daily,
  goal,
  days = 14,
  color = 'var(--blue)',
}: {
  daily: Record<string, number>;
  goal: number;
  days?: number;
  color?: string;
}) {
  const keys = useMemo(() => lastNDays(days), [days]);
  const values = keys.map((k) => daily[k] ?? 0);
  const max = Math.max(goal * 1.25, ...values, 10);
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(560);
  useLayoutEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setW(Math.max(260, Math.round(e!.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const H = 180;
  const pad = { l: 30, r: 8, t: 12, b: 24 };
  const iw = W - pad.l - pad.r;
  const ih = H - pad.t - pad.b;
  const step = iw / days;
  const bw = Math.min(18, step * 0.55);
  const y = (v: number) => pad.t + ih - (v / max) * ih;
  const ticks = [0, Math.round(max / 2), Math.round(max)];
  const fmt = (k: string) => new Date(k + 'T00:00:00').toLocaleDateString('es', { weekday: 'narrow' });
  // On narrow charts with many days, label every other bar so labels never collide.
  const labelEvery = step < 18 ? 3 : step < 26 ? 2 : 1;

  return (
    <div ref={box} className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} className="block max-w-full" role="img" aria-label={`XP diaria de los últimos ${days} días`}>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={pad.l} x2={W - pad.r} y1={y(t)} y2={y(t)} stroke="var(--separator)" strokeWidth="1" />
            <text x={pad.l - 6} y={y(t) + 4} textAnchor="end" fontSize="11" fill="var(--label-2)">
              {t}
            </text>
          </g>
        ))}
        {values.map((v, i) => {
          const cx = pad.l + step * i + step / 2;
          const h = Math.max(v > 0 ? 3 : 0, (v / max) * ih);
          const isToday = i === days - 1;
          return (
            <g key={keys[i]}>
              {/* hit target larger than the mark */}
              <rect
                x={cx - step / 2}
                y={pad.t}
                width={step}
                height={ih}
                fill="transparent"
                tabIndex={0}
                onMouseEnter={() => setHover(i)}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover(i)}
                onBlur={() => setHover(null)}
                aria-label={`${keys[i]}: ${v} XP`}
              />
              {h > 0 && (
                <path
                  d={roundedTop(cx - bw / 2, pad.t + ih - h, bw, h, Math.min(4, bw / 2, h))}
                  fill={color}
                  opacity={hover === null || hover === i ? 1 : 0.45}
                  pointerEvents="none"
                />
              )}
              {(days - 1 - i) % labelEvery === 0 && <text
                x={cx}
                y={H - 6}
                textAnchor="middle"
                fontSize="11"
                fontWeight={isToday ? 700 : 400}
                fill={isToday ? 'var(--label)' : 'var(--label-2)'}
              >
                {fmt(keys[i]!)}
              </text>}
            </g>
          );
        })}
        <line x1={pad.l} x2={W - pad.r} y1={y(goal)} y2={y(goal)} stroke="var(--label-2)" strokeDasharray="4 4" strokeWidth="1" />
        <text
          x={pad.l + 4}
          y={y(goal) - 5}
          fontSize="11"
          fill="var(--label-2)"
          stroke="var(--card)"
          strokeWidth="4"
          paintOrder="stroke"
          style={{ pointerEvents: 'none' }}
        >
          Meta {goal} XP
        </text>
      </svg>
      {hover !== null && (
        <div
          className="bg-elevated pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-[10px] px-2.5 py-1.5 text-[12px] shadow-float"
          style={{
            left: `${((pad.l + step * hover + step / 2) / W) * 100}%`,
            top: `${(y(values[hover]!) / H) * 100}%`,
            marginTop: -8,
          }}
        >
          <div className="text-label-2">
            {new Date(keys[hover]! + 'T00:00:00').toLocaleDateString('es', { weekday: 'long', day: 'numeric', month: 'short' })}
          </div>
          <div className="font-semibold">{values[hover]} XP</div>
        </div>
      )}
    </div>
  );
}

function roundedTop(x: number, y: number, w: number, h: number, r: number) {
  return `M${x} ${y + h} V${y + r} Q${x} ${y} ${x + r} ${y} H${x + w - r} Q${x + w} ${y} ${x + w} ${y + r} V${y + h} Z`;
}
