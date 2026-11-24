import { useLayoutEffect, useRef, type ReactNode, type TextareaHTMLAttributes } from 'react';
import { cn } from '@/lib/cn';

/** Colores por ancla (los mismos en el resaltado y en la tarjeta). */
export const ANCHOR_COLORS = ['var(--blue)', 'var(--orange)', 'var(--green)', 'var(--pink)', 'var(--purple)', 'var(--teal)'];
export const anchorColor = (i: number) => ANCHOR_COLORS[((i % ANCHOR_COLORS.length) + ANCHOR_COLORS.length) % ANCHOR_COLORS.length]!;

/** Área de texto que crece con su contenido: la edición en línea de toda la pantalla. */
export function AutoText({ className, value, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement> & { value: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${el.scrollHeight + 2}px`;
  }, [value]);
  return (
    <textarea
      ref={ref}
      rows={1}
      value={value}
      className={cn('block w-full resize-none rounded-[8px] bg-transparent px-1.5 py-0.5 outline-none transition-colors hover:bg-fill-2/70 focus:bg-fill-2 focus:ring-2 focus:ring-[color-mix(in_srgb,var(--blue)_45%,transparent)]', className)}
      {...rest}
    />
  );
}

export function IconBtn({ label, onClick, children, active, disabled, className }: { label: string; onClick?: () => void; children: ReactNode; active?: boolean; disabled?: boolean; className?: string }) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-fill-2 disabled:opacity-35', active && 'bg-[color-mix(in_srgb,var(--blue)_16%,transparent)] text-ink-blue', className)}
    >
      {children}
    </button>
  );
}

export function Pill({ children, tone = 'gray', title }: { children: ReactNode; tone?: 'gray' | 'amber' | 'blue' | 'green' | 'red'; title?: string }) {
  const tones = {
    gray: 'bg-fill-2 text-label-2',
    amber: 'bg-[color-mix(in_srgb,var(--orange)_20%,transparent)] text-[color-mix(in_srgb,var(--orange)_55%,var(--label))]',
    blue: 'bg-[color-mix(in_srgb,var(--blue)_16%,transparent)] text-ink-blue',
    green: 'bg-[color-mix(in_srgb,var(--green)_18%,transparent)] text-[color-mix(in_srgb,var(--green)_55%,var(--label))]',
    red: 'bg-[color-mix(in_srgb,var(--red)_16%,transparent)] text-ink-red',
  };
  return (
    <span title={title} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11.5px] font-semibold', tones[tone])}>
      {children}
    </span>
  );
}

export const GROUP_LABEL = { whole: 'Toda la clase', pairs: 'Parejas', groups: 'Grupos', solo: 'Individual' } as const;
