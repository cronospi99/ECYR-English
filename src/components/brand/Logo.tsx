import { cn } from '@/lib/cn';
import { useId } from 'react';

/** Ascending-bars mark: three steps up — every lesson is a step higher. */
export function LogoMark({ size = 32, className }: { size?: number; className?: string }) {
  const id = useId();
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="8" y1="58" x2="56" y2="6" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#2F6BFF" />
          <stop offset="1" stopColor="#7B5CFF" />
        </linearGradient>
      </defs>
      <rect x="8" y="34" width="12" height="22" rx="6" fill={`url(#${id})`} />
      <rect x="26" y="22" width="12" height="34" rx="6" fill={`url(#${id})`} />
      <rect x="44" y="8" width="12" height="48" rx="6" fill={`url(#${id})`} />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={compact ? 28 : 36} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[21px] font-extrabold tracking-[-0.03em]">ECYR</span>
          <span className="text-label-2 mt-0.5 text-[13px] font-medium tracking-tight">English</span>
        </span>
      )}
    </span>
  );
}
