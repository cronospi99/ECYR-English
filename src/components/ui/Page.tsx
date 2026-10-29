import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { parentOf, type BackTarget } from '@/lib/navBack';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

/**
 * A screen with an iOS large title, a back button and trailing actions.
 * Without `back`, the button points at the parent screen (none on top-level screens);
 * `back={null}` hides it.
 */
export function Page({
  title,
  subtitle,
  eyebrow,
  back,
  actions,
  children,
  className,
  wide = false,
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  eyebrow?: ReactNode;
  back?: BackTarget | null;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  const { pathname } = useLocation();
  const to = back === undefined ? parentOf(pathname) : back;
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className={cn('mx-auto w-full px-4 pt-4 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12', wide ? 'max-w-[1400px]' : 'max-w-[1180px]', className)}
    >
      {to && (
        <Link
          to={to.to}
          aria-label={`Volver a ${to.label}`}
          className="text-ink-blue bg-[color-mix(in_srgb,var(--blue)_10%,transparent)] mb-3 inline-flex h-9 max-w-full items-center gap-0.5 rounded-full pr-3.5 pl-1.5 text-[15px] font-semibold transition-[transform,background-color] hover:bg-[color-mix(in_srgb,var(--blue)_16%,transparent)] active:scale-[0.97]"
        >
          <ChevronLeft size={22} strokeWidth={2.6} className="shrink-0" />
          <span className="truncate">{to.label}</span>
        </Link>
      )}
      {(title || actions) && (
        <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="min-w-0">
            {eyebrow && <div className="text-subhead text-label-2 mb-0.5 font-medium">{eyebrow}</div>}
            {title && <h1 className="text-large-title text-balance">{title}</h1>}
            {subtitle && <p className="text-body text-label-2 mt-1 max-w-2xl text-pretty">{subtitle}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      {children}
    </motion.main>
  );
}
