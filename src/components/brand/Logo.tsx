import { cn } from '@/lib/cn';
import { useId } from 'react';

/**
 * ECYR mark: four ascending bars over the wordmark, a row of blocks underneath —
 * every lesson is a step higher. `ink` colours the letters (white on dark tiles).
 */
export function LogoMark({ size = 32, ink = 'var(--label)', className }: { size?: number; ink?: string; className?: string }) {
  const id = useId();
  return (
    <svg width={(size * 500) / 540} height={size} viewBox="0 0 500 540" fill="none" className={className} aria-hidden>
      <defs>
        <linearGradient id={id} x1="20" y1="330" x2="480" y2="190" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0E70FF" />
          <stop offset=".4" stopColor="#3F6BFD" />
          <stop offset=".75" stopColor="#7552FB" />
          <stop offset="1" stopColor="#A962FD" />
        </linearGradient>
      </defs>
      <g fill={`url(#${id})`}>
        <path d="M20 179Q20 147 52 147H90Q122 147 122 179V240H62Q30 240 20 256Z" />
        <path d="M140 130Q140 100 170 100H205Q235 100 235 130V240H140Z" />
        <path d="M255 90Q255 58 287 58H320Q352 58 352 90V240L303.5 290L255 240Z" />
        <path d="M372 50Q372 18 404 18H441Q473 18 473 50V240H372Z" />
        <path d="M20 420Q20 402 38 402H104Q122 402 122 420V502Q122 520 104 520H65Q20 520 20 475Z" />
        <rect x="140" y="402" width="95" height="118" rx="18" />
        <rect x="255" y="402" width="97" height="118" rx="18" />
        <path d="M372 420Q372 402 390 402H455Q473 402 473 420V475Q473 520 428 520H390Q372 520 372 502Z" />
      </g>
      <g stroke={ink} strokeWidth="32" strokeLinejoin="round">
        <path d="M122 275H64Q37 275 37 302V341Q37 368 64 368H122M37 321.5H112" />
        <path d="M238 275H190Q157 275 157 308V335Q157 368 190 368H238" />
        <path d="M387 385V275H438Q470 275 470 307V313Q470 345 438 345H404" />
        <path d="M428 345L458 380" strokeLinecap="round" />
      </g>
      <path fill={ink} d="M255 260L303.5 310L352 260V297L320 330V385H287V330L255 297Z" />
    </svg>
  );
}

export function Logo({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      <LogoMark size={compact ? 30 : 38} />
      {!compact && (
        <span className="flex flex-col leading-none">
          <span className="text-[21px] font-extrabold tracking-[-0.03em]">ECYR</span>
          <span className="text-label-2 mt-1 text-[11px] font-medium tracking-[0.32em] uppercase">English</span>
        </span>
      )}
    </span>
  );
}
