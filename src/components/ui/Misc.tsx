import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';
import type { CefrLevel } from '@/content/types';
import { levelMeta } from '@/content/levels';
import { ink } from '@/lib/color';

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative h-[31px] w-[51px] shrink-0 rounded-full transition-colors duration-300 ease-ios',
        checked ? 'bg-ios-green' : 'bg-fill',
      )}
    >
      <span
        className={cn(
          'absolute top-[2px] left-[2px] h-[27px] w-[27px] rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.15),0_3px_1px_rgb(0_0_0/0.06)] transition-transform duration-300 ease-ios',
          checked && 'translate-x-[20px]',
        )}
      />
    </button>
  );
}

export function LevelChip({ level, className }: { level: CefrLevel | string; className?: string }) {
  const meta = levelMeta(level);
  const color = meta?.color ?? 'var(--blue)';
  return (
    <span
      className={cn('inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-bold tracking-wide', className)}
      style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color: ink(color) }}
    >
      {level}
    </span>
  );
}

export function Chip({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'h-8 shrink-0 rounded-full px-3.5 text-[14px] font-medium transition-colors',
        active ? 'bg-label text-bg' : 'bg-card text-label shadow-card hover:bg-fill-2',
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span className={cn('inline-block h-5 w-5', className)} role="status" aria-label="Cargando">
      <svg viewBox="0 0 24 24" className="h-full w-full animate-spin [animation-duration:0.9s]">
        {Array.from({ length: 8 }).map((_, i) => (
          <rect
            key={i}
            x="11"
            y="2"
            width="2"
            height="6"
            rx="1"
            fill="currentColor"
            opacity={0.2 + (i / 8) * 0.8}
            transform={`rotate(${i * 45} 12 12)`}
          />
        ))}
      </svg>
    </span>
  );
}

export function PageLoader() {
  return (
    <div className="text-label-2 flex min-h-[50vh] items-center justify-center">
      <Spinner className="h-7 w-7" />
    </div>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3 px-1">
      <h2 className="text-title-2">{children}</h2>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center px-6 py-14 text-center">
      <div className="text-label-3 mb-4">{icon}</div>
      <h3 className="text-title-3">{title}</h3>
      {body && <p className="text-subhead text-label-2 mt-1 max-w-sm">{body}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}
