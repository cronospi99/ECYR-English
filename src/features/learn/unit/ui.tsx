import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { ROLE_INFO, highlight, type KeySpec, type Role } from './formula';

/** Text colour for a role that stays readable on light and dark cards. */
export const roleText = (role: Role) => `color-mix(in srgb, ${ROLE_INFO[role].color} 72%, var(--label))`;
export const roleBg = (role: Role, pct = 14) => `color-mix(in srgb, ${ROLE_INFO[role].color} ${pct}%, transparent)`;
export { ink, tint } from '@/lib/color';
import { ink, tint } from '@/lib/color';

/** Sentence with the target grammar highlighted (plain text in, React out — no HTML). */
export function Hl({ text, spec, className }: { text: string; spec?: KeySpec; className?: string }) {
  const segs = highlight(text, spec);
  return (
    <span className={className}>
      {segs.map((s, i) =>
        s.role ? (
          <mark
            key={i}
            className="rounded-[5px] px-[2px] py-px font-semibold [box-decoration-break:clone]"
            style={{ background: roleBg(s.role, 16), color: ink(roleText(s.role)) }}
          >
            {s.text}
          </mark>
        ) : (
          <span key={i}>{s.text}</span>
        ),
      )}
    </span>
  );
}

/** Renders “quoted” fragments as small inline chips so key phrases pop out of a sentence. */
export function QuoteText({ text, className, color = 'var(--blue)', subtle = false }: { text: string; className?: string; color?: string; subtle?: boolean }) {
  const parts: ReactNode[] = [];
  const re = /“([^”]{1,90})”|‘([^‘]{1,90}?)’(?![a-z])/g;
  let last = 0;
  let k = 0;
  for (const m of text.matchAll(re)) {
    if (m.index! > last) parts.push(text.slice(last, m.index));
    parts.push(
      subtle ? (
        <span key={k++} className="font-semibold" style={{ color: ink(color) }}>
          “{m[1] ?? m[2]}”
        </span>
      ) : (
        <span
          key={k++}
          className="inline rounded-[6px] px-1 py-px font-semibold [box-decoration-break:clone]"
          style={{ background: tint(color, 13), color: ink(color) }}
        >
          {m[1] ?? m[2]}
        </span>
      ),
    );
    last = m.index! + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return <span className={className}>{parts}</span>;
}

/** Small uppercase section label with an icon tile, à la the interactive books' kickers. */
export function Kicker({ icon: Icon, color, children, action, id }: { icon: LucideIcon; color: string; children: ReactNode; action?: ReactNode; id?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h4 id={id} className="flex items-center gap-2 text-[13px] font-bold tracking-[0.06em] uppercase" style={{ color: ink(color) }}>
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-[7px]" style={{ background: tint(color, 16) }}>
          <Icon size={14} strokeWidth={2.4} style={{ color: ink(color) }} aria-hidden />
        </span>
        {children}
      </h4>
      {action}
    </div>
  );
}

/** Accessible show/hide block (button + region), collapsed by default. */
export function Disclosure({
  summary,
  icon: Icon,
  color = 'var(--blue)',
  meta,
  children,
  defaultOpen = false,
  className,
}: {
  summary: ReactNode;
  icon?: LucideIcon;
  color?: string;
  meta?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const id = useId();
  return (
    <div className={cn('bg-fill-2 overflow-hidden rounded-[16px]', className)}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left"
      >
        {Icon && (
          <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]" style={{ background: tint(color, 16), color: ink(color) }}>
            <Icon size={17} aria-hidden />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-semibold">{summary}</span>
          {meta && <span className="text-label-2 block text-[13px]">{meta}</span>}
        </span>
        <ChevronDown size={18} className={cn('text-label-2 shrink-0 transition-transform duration-200', open && 'rotate-180')} aria-hidden />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            id={id}
            role="region"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: [0.32, 0.72, 0, 1] }}
          >
            <div className="px-4 pb-4">{children}</div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** "Leer más" clamp for a paragraph: the toggle only appears when the text really overflows. */
export function Clamp({ text, lines = 2, className, render }: { text: string; lines?: 2 | 3; className?: string; render?: (t: string) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const [overflows, setOverflows] = useState(false);
  const ref = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const check = () => setOverflows(el.scrollHeight - el.clientHeight > 2);
    check();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(check) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [text, open]);
  return (
    <div className={className}>
      <p ref={ref} className={cn('text-pretty', !open && (lines === 2 ? 'line-clamp-2' : 'line-clamp-3'))}>
        {render ? render(text) : text}
      </p>
      {(overflows || open) && (
        <button type="button" aria-expanded={open} onClick={() => setOpen((o) => !o)} className="text-ink-blue mt-1 text-[14px] font-semibold">
          {open ? 'Leer menos' : 'Leer más'}
        </button>
      )}
    </div>
  );
}

/** Role legend dots for the formula colours actually used. */
export function RoleLegend({ roles }: { roles: Role[] }) {
  if (!roles.length) return null;
  return (
    <ul className="text-label-2 mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[12px]" aria-label="Leyenda de colores">
      {roles.map((r) => (
        <li key={r} className="inline-flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: ROLE_INFO[r].color }} aria-hidden />
          {ROLE_INFO[r].label}
        </li>
      ))}
    </ul>
  );
}
