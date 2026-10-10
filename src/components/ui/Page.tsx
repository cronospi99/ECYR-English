import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';

/** A screen with an iOS large title, optional back link and trailing actions. */
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
  back?: { to: string; label: string };
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <motion.main
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: [0.32, 0.72, 0, 1] }}
      className={cn('mx-auto w-full px-4 pt-4 pb-28 sm:px-6 lg:px-10 lg:pt-8 lg:pb-12', wide ? 'max-w-[1400px]' : 'max-w-[1180px]', className)}
    >
      {back && (
        <Link
          to={back.to}
          className="text-ios-blue -ml-1.5 mb-2 inline-flex items-center gap-0.5 text-[17px] hover:opacity-70"
        >
          <ChevronLeft size={26} strokeWidth={2.4} className="-my-1" />
          {back.label}
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
