import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** Square icon button used across the toolbar. */
export function ToolButton({
  label,
  active,
  onClick,
  children,
  disabled,
  big,
  tone = 'blue',
  className,
}: {
  label: string;
  active?: boolean;
  onClick: () => void;
  children: ReactNode;
  disabled?: boolean;
  big?: boolean;
  tone?: 'blue' | 'red';
  className?: string;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'grid shrink-0 place-items-center transition-[background-color,transform,color] duration-150 active:scale-[0.92] disabled:pointer-events-none disabled:opacity-30',
        big ? 'h-11 w-11 rounded-[13px]' : 'h-9 w-9 rounded-[11px] sm:h-10 sm:w-10 sm:rounded-[12px]',
        active
          ? tone === 'red'
            ? 'bg-ios-red text-white'
            : 'bg-ios-blue text-white shadow-[0_6px_14px_-6px_color-mix(in_srgb,var(--blue)_70%,transparent)]'
          : 'text-label hover:bg-fill-2 active:bg-fill',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A tight group of buttons on a soft fill, so related tools read as one unit. */
export function Group({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('bg-fill-2 flex shrink-0 items-center gap-0.5 rounded-[14px] p-0.5', className)}>{children}</div>;
}

export function Swatch({
  hex,
  name,
  active,
  onClick,
  big,
}: {
  hex: string;
  name: string;
  active: boolean;
  onClick: () => void;
  big?: boolean;
}) {
  return (
    <button
      type="button"
      title={name}
      aria-label={`Color ${name}`}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        'relative shrink-0 rounded-full transition-transform duration-150 active:scale-90',
        big ? 'h-9 w-9' : 'h-7 w-7',
        active ? 'scale-110' : 'hover:scale-110',
      )}
      style={{
        background: hex,
        boxShadow: active
          ? `0 0 0 2px var(--card), 0 0 0 4px var(--blue)`
          : 'inset 0 0 0 1px color-mix(in srgb, var(--label) 16%, transparent)',
      }}
    />
  );
}

/** Rainbow ring around a native colour input. */
export function CustomColor({
  value,
  onChange,
  big,
  active,
}: {
  value: string;
  onChange: (hex: string) => void;
  big?: boolean;
  active?: boolean;
}) {
  return (
    <label
      title="Color personalizado"
      className={cn(
        'relative grid shrink-0 cursor-pointer place-items-center rounded-full transition-transform duration-150 hover:scale-110',
        big ? 'h-9 w-9' : 'h-7 w-7',
      )}
      style={{
        background: 'conic-gradient(#ff3b30, #ff9500, #ffcc00, #34c759, #30b0c7, #007aff, #af52de, #ff2d55, #ff3b30)',
        boxShadow: active ? '0 0 0 2px var(--card), 0 0 0 4px var(--blue)' : undefined,
      }}
    >
      <span className="block rounded-full ring-2 ring-white" style={{ background: value, width: '55%', height: '55%' }} />
      <input
        type="color"
        aria-label="Color personalizado"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}

/** Compact labelled range slider with an optional leading preview. */
export function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  onChange,
  preview,
  display,
  className,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  preview?: ReactNode;
  display?: string;
  className?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className={cn('flex min-w-0 items-center gap-2', className)} title={label}>
      {preview}
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="draw-range h-6 min-w-0 flex-1 cursor-pointer"
        style={{ ['--pct' as string]: `${pct}%` }}
      />
      <span className="text-footnote text-label-2 w-9 shrink-0 text-right tabular-nums">{display ?? value}</span>
    </label>
  );
}

/** Scoped styles for the range inputs (Tailwind can't reach the thumb/track pseudo-elements nicely). */
export const RANGE_CSS = `
.draw-range{-webkit-appearance:none;appearance:none;background:transparent}
.draw-range:focus-visible{outline:none}
.draw-range::-webkit-slider-runnable-track{height:6px;border-radius:99px;background:linear-gradient(to right,var(--blue) var(--pct),var(--fill) var(--pct))}
.draw-range::-moz-range-track{height:6px;border-radius:99px;background:var(--fill)}
.draw-range::-moz-range-progress{height:6px;border-radius:99px;background:var(--blue)}
.draw-range::-webkit-slider-thumb{-webkit-appearance:none;width:22px;height:22px;margin-top:-8px;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgb(0 0 0/.3),0 0 0 .5px rgb(0 0 0/.08)}
.draw-range::-moz-range-thumb{width:22px;height:22px;border:none;border-radius:50%;background:#fff;box-shadow:0 1px 4px rgb(0 0 0/.3)}
.draw-range:focus-visible::-webkit-slider-thumb{box-shadow:0 0 0 4px color-mix(in srgb,var(--blue) 40%,transparent),0 1px 4px rgb(0 0 0/.3)}
.draw-noscroll{scrollbar-width:none}
.draw-noscroll::-webkit-scrollbar{display:none}
`;
