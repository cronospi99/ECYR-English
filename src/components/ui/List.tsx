import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';

/** iOS inset-grouped list. */
export function ListGroup({
  header,
  footer,
  children,
  className,
}: {
  header?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={className}>
      {header && <h4 className="text-footnote text-label-2 mb-1.5 px-4 uppercase tracking-wide">{header}</h4>}
      <div className="bg-card overflow-hidden rounded-[14px] shadow-card">{children}</div>
      {footer && <p className="text-footnote text-label-2 mt-1.5 px-4">{footer}</p>}
    </section>
  );
}

interface RowProps {
  leading?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  to?: string;
  onClick?: () => void;
  chevron?: boolean;
  className?: string;
  disabled?: boolean;
}

export function ListRow({ leading, title, subtitle, trailing, to, onClick, chevron, className, disabled }: RowProps) {
  const inner = (
    <>
      {leading && <span className="shrink-0">{leading}</span>}
      <span className="flex min-h-[44px] min-w-0 flex-1 items-center gap-3 py-2.5 pr-4 [.row:not(:last-child)_&]:shadow-[inset_0_-0.5px_0_var(--separator)]">
        <span className="min-w-0 flex-1">
          <span className="text-body block truncate">{title}</span>
          {subtitle && <span className="text-footnote text-label-2 block truncate">{subtitle}</span>}
        </span>
        {trailing && <span className="text-body text-label-2 shrink-0">{trailing}</span>}
        {(chevron ?? Boolean(to)) && <ChevronRight size={18} className="text-label-3 -mr-1 shrink-0" strokeWidth={2.5} />}
      </span>
    </>
  );
  const cls = cn(
    'row flex w-full items-center gap-3 pl-4 text-left transition-colors active:bg-fill-2 hover:bg-fill-2/60',
    disabled && 'pointer-events-none opacity-40',
    className,
  );
  if (to)
    return (
      <Link to={to} className={cls}>
        {inner}
      </Link>
    );
  if (onClick)
    return (
      <button type="button" onClick={onClick} className={cls}>
        {inner}
      </button>
    );
  return <div className={cn(cls, 'active:bg-transparent hover:bg-transparent')}>{inner}</div>;
}
