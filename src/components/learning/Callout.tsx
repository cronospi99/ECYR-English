import type { ReactNode } from 'react';
import { cn } from '@/lib/cn';

export function Callout({
  tone = 'blue',
  icon,
  title,
  children,
  className,
}: {
  tone?: 'blue' | 'orange' | 'green' | 'purple' | 'red';
  icon?: ReactNode;
  title?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  const color = `var(--${tone})`;
  return (
    <div
      className={cn('rounded-[14px] p-4 text-[15px] leading-relaxed', className)}
      style={{ background: `color-mix(in srgb, ${color} 10%, transparent)` }}
    >
      {(title || icon) && (
        <div className="mb-1 flex items-center gap-2 font-semibold" style={{ color }}>
          {icon}
          {title}
        </div>
      )}
      <div>{children}</div>
    </div>
  );
}

export function DataTable({ cols, rows, title }: { cols: string[]; rows: (string | number)[][]; title?: string }) {
  return (
    <div className="overflow-hidden rounded-[14px] shadow-[inset_0_0_0_0.5px_var(--separator)]">
      {title && <div className="bg-fill-2 px-4 py-2.5 text-[14px] font-semibold">{title}</div>}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-left text-[14px]">
          <thead>
            <tr className="bg-fill-2">
              {cols.map((c) => (
                <th key={c} className="text-label-2 px-4 py-2 text-[12px] font-semibold tracking-wide uppercase">
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="shadow-[inset_0_0.5px_0_var(--separator)]">
                {r.map((cell, j) => (
                  <td key={j} className={cn('px-4 py-2.5 align-top', j === 0 && 'font-semibold')}>
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
