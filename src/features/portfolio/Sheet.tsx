import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { cn } from '@/lib/cn';

function useIsDesktop() {
  const q = '(min-width: 640px)';
  const [m, setM] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches);
  useEffect(() => {
    const mq = window.matchMedia(q);
    const on = () => setM(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return m;
}

export interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  /** Nav-bar left slot (defaults to a "Cerrar"/"Cancelar" button). */
  leading?: ReactNode;
  /** Nav-bar right slot, e.g. the primary action. */
  trailing?: ReactNode;
  /** Shown under the nav bar, e.g. an upload progress bar. */
  banner?: ReactNode;
  /** When false, Escape / backdrop do nothing (e.g. while uploading). */
  dismissible?: boolean;
  closeLabel?: string;
  className?: string;
  children: ReactNode;
}

/** iOS page sheet: slides up on phones, a centred card on wider screens. Portalled, modal, focus-trapped. */
export function Sheet(props: SheetProps) {
  if (typeof document === 'undefined') return null;
  return createPortal(<AnimatePresence>{props.open && <SheetBody {...props} />}</AnimatePresence>, document.body);
}

const FOCUSABLE =
  'button:not([disabled]):not([tabindex="-1"]), [href], input:not([disabled]):not([type="hidden"]), textarea:not([disabled]), select:not([disabled]), audio[controls], [tabindex="0"]';

function SheetBody({ onClose, title, leading, trailing, banner, dismissible = true, closeLabel = 'Cerrar', className, children }: SheetProps) {
  const desktop = useIsDesktop();
  const sheet = useRef<HTMLDivElement>(null);
  const titleId = useId();

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sheet.current?.focus();
    return () => {
      document.body.style.overflow = overflow;
      prev?.focus?.();
    };
  }, []);

  const close = () => {
    if (dismissible) onClose();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      close();
      return;
    }
    if (e.key !== 'Tab' || !sheet.current) return;
    const f = Array.from(sheet.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter((el) => el.offsetParent !== null);
    if (!f.length) return;
    const first = f[0]!;
    const last = f[f.length - 1]!;
    if (e.shiftKey && (document.activeElement === first || document.activeElement === sheet.current)) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-6">
      <motion.div
        className="absolute inset-0 bg-black/40"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={close}
        aria-hidden
      />
      <motion.div
        ref={sheet}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        initial={desktop ? { opacity: 0, scale: 0.94, y: 12 } : { y: '100%' }}
        animate={desktop ? { opacity: 1, scale: 1, y: 0 } : { y: 0 }}
        exit={desktop ? { opacity: 0, scale: 0.96, y: 8 } : { y: '100%' }}
        transition={{ type: 'spring', stiffness: 420, damping: 38, mass: 0.9 }}
        className={cn(
          'bg-bg dark:bg-card text-label relative flex w-full flex-col overflow-hidden text-left outline-none',
          'shadow-float max-h-[94dvh] rounded-t-[var(--radius-sheet)] sm:max-h-[88vh] sm:max-w-[620px] sm:rounded-[var(--radius-sheet)]',
          className,
        )}
      >
        <div className="material hairline-b sticky top-0 z-10 shrink-0">
          <div className="bg-label-3 mx-auto mt-2 h-[5px] w-9 rounded-full sm:hidden" aria-hidden />
          <div className="grid h-12 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 px-3">
            <div className="flex min-w-0 justify-start">
              {leading ?? (
                <button
                  type="button"
                  onClick={close}
                  disabled={!dismissible}
                  className="text-ios-blue h-9 rounded-[10px] px-2 text-[17px] hover:opacity-70 disabled:opacity-40"
                >
                  {closeLabel}
                </button>
              )}
            </div>
            <h2 id={titleId} className="text-headline max-w-[52vw] truncate text-center sm:max-w-[340px]">
              {title}
            </h2>
            <div className="flex min-w-0 justify-end">{trailing}</div>
          </div>
          {banner}
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-[max(env(safe-area-inset-bottom),20px)]">{children}</div>
      </motion.div>
    </div>
  );
}

/** Nav-bar text button in the iOS style (bold for the primary action). */
export function SheetAction({
  children,
  onClick,
  disabled,
  bold,
  type = 'button',
  form,
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  bold?: boolean;
  type?: 'button' | 'submit';
  form?: string;
}) {
  return (
    <button
      type={type}
      form={form}
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'text-ios-blue h-9 rounded-[10px] px-2 text-[17px] whitespace-nowrap hover:opacity-70 disabled:opacity-35',
        bold && 'font-semibold',
      )}
    >
      {children}
    </button>
  );
}
