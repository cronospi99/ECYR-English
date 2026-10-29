import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Round, colourful action button sized for touch on a projector. */
export function Act({
  color = 'var(--blue)',
  solid,
  className,
  children,
  ...p
}: ButtonHTMLAttributes<HTMLButtonElement> & { color?: string; solid?: boolean }) {
  return (
    <button
      type="button"
      {...p}
      className={cn(
        'inline-flex h-11 min-w-11 shrink-0 items-center justify-center gap-1.5 rounded-full px-4 text-[15px] font-semibold transition-[transform,opacity] active:scale-95 disabled:pointer-events-none disabled:opacity-40',
        className,
      )}
      style={solid ? { background: color, color: '#fff' } : { background: `color-mix(in srgb, ${color} 15%, transparent)`, color: `color-mix(in srgb, ${color} 70%, var(--label))` }}
    >
      {children}
    </button>
  );
}

export function Stepper({ value, onChange, min = 1, max = 99, label }: { value: number; onChange: (n: number) => void; min?: number; max?: number; label?: ReactNode }) {
  return (
    <div className="bg-fill-2 inline-flex h-11 items-center gap-1 rounded-full p-1">
      <button type="button" aria-label="Menos" onClick={() => onChange(Math.max(min, value - 1))} className="bg-card grid h-9 w-9 place-items-center rounded-full shadow-card active:scale-95">
        <Minus size={18} />
      </button>
      <span className="min-w-12 px-1 text-center text-[17px] font-bold tabular-nums">
        {value}
        {label && <span className="text-label-2 ml-1 text-[13px] font-medium">{label}</span>}
      </span>
      <button type="button" aria-label="Más" onClick={() => onChange(Math.min(max, value + 1))} className="bg-card grid h-9 w-9 place-items-center rounded-full shadow-card active:scale-95">
        <Plus size={18} />
      </button>
    </div>
  );
}

/** Settings panel shown while the gear is on. */
export function Panel({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('flex h-full flex-col gap-3 overflow-auto p-4', className)}>{children}</div>;
}

export function Label({ children }: { children: ReactNode }) {
  return <div className="text-label-2 text-[12px] font-semibold tracking-wide uppercase">{children}</div>;
}

export const inputCls =
  'bg-fill-2 text-label placeholder:text-label-3 w-full rounded-[12px] px-3 py-2.5 text-[16px] outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--blue)_45%,transparent)]';

export function Pills<T extends string | number>({ value, options, onChange }: { value: T; options: { value: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={String(o.value)}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn('h-9 rounded-full px-3.5 text-[14px] font-semibold transition-colors', o.value === value ? 'bg-label text-bg' : 'bg-fill-2 text-label hover:bg-fill')}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** A centered message for empty widgets. */
export function Empty({ icon, text, children }: { icon: ReactNode; text: ReactNode; children?: ReactNode }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-4 text-center">
      <div className="text-label-3">{icon}</div>
      <p className="text-label-2 max-w-[28ch] text-[15px]">{text}</p>
      {children}
    </div>
  );
}
