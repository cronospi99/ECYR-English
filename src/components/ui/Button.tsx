import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { cn } from '@/lib/cn';

type Variant = 'filled' | 'tinted' | 'gray' | 'plain' | 'glass' | 'brand' | 'destructive';
type Size = 'sm' | 'md' | 'lg';

const base =
  'inline-flex items-center justify-center gap-2 font-semibold select-none whitespace-nowrap transition-[transform,opacity,background-color] duration-200 ease-ios active:scale-[0.97] active:opacity-80 disabled:opacity-40 disabled:pointer-events-none';

const variants: Record<Variant, string> = {
  filled: 'bg-ios-blue text-white',
  brand: 'brand-gradient text-white shadow-[0_8px_24px_-8px_rgb(47_107_255/0.6)]',
  tinted: 'bg-[color-mix(in_srgb,var(--blue)_15%,transparent)] text-ink-blue',
  gray: 'bg-fill text-label',
  plain: 'text-ink-blue hover:opacity-70',
  glass: 'material text-label shadow-[inset_0_0_0_0.5px_var(--separator)]',
  destructive: 'bg-[color-mix(in_srgb,var(--red)_14%,transparent)] text-ink-red',
};

const sizes: Record<Size, string> = {
  sm: 'h-8 px-3.5 text-[14px] rounded-full',
  md: 'h-11 px-5 text-[16px] rounded-[12px]',
  lg: 'h-[52px] px-6 text-[17px] rounded-[14px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'filled', size = 'md', className, ...props },
  ref,
) {
  return <button ref={ref} className={cn(base, variants[variant], sizes[size], className)} {...props} />;
});

export function ButtonLink({
  variant = 'filled',
  size = 'md',
  className,
  ...props
}: LinkProps & { variant?: Variant; size?: Size }) {
  return <Link className={cn(base, variants[variant], sizes[size], className)} {...props} />;
}
