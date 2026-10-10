import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';

/** The coloured rounded square used by iOS Settings rows. */
export function IconTile({
  icon: Icon,
  color,
  size = 30,
  className,
  soft = false,
}: {
  icon: LucideIcon;
  color: string;
  size?: number;
  className?: string;
  soft?: boolean;
}) {
  return (
    <span
      className={cn('inline-flex shrink-0 items-center justify-center', className)}
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.27,
        background: soft ? `color-mix(in srgb, ${color} 16%, transparent)` : color,
        color: soft ? color : '#fff',
      }}
    >
      <Icon size={size * 0.58} strokeWidth={2.2} />
    </span>
  );
}
