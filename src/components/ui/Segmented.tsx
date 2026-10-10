import { motion } from 'motion/react';
import { useId } from 'react';
import { cn } from '@/lib/cn';

export function Segmented<T extends string>({
  value,
  onChange,
  options,
  className,
  size = 'md',
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: React.ReactNode }[];
  className?: string;
  size?: 'sm' | 'md';
}) {
  const id = useId();
  return (
    <div
      role="tablist"
      className={cn(
        'bg-fill-2 dark:bg-fill relative inline-flex rounded-[9px] p-[2px]',
        size === 'sm' ? 'h-8' : 'h-9',
        className,
      )}
    >
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'relative z-0 flex-1 rounded-[7px] px-3 font-medium whitespace-nowrap transition-colors',
              size === 'sm' ? 'text-[13px]' : 'text-[14px]',
              active ? 'text-label' : 'text-label hover:opacity-70',
            )}
          >
            {active && (
              <motion.span
                layoutId={`seg-${id}`}
                className="bg-card dark:bg-[#636366] absolute inset-0 -z-10 rounded-[7px] shadow-[0_3px_8px_rgb(0_0_0/0.12),0_3px_1px_rgb(0_0_0/0.04)]"
                transition={{ type: 'spring', stiffness: 500, damping: 38 }}
              />
            )}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
