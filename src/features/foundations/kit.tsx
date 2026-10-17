import { Check, X } from 'lucide-react';
import type { CourseBlock } from '@/content/types';
import { Card } from '@/components/ui/Card';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/cn';

/** Shared pieces of the course blocks. */

export type OnResult = (score: number) => void;

// Small typed accessors over the loosely-typed course JSON.
export const arr = <T,>(v: unknown) => (Array.isArray(v) ? (v as T[]) : []);
export const str = (v: unknown) => (typeof v === 'string' ? v : '');

export function Es({ text, className }: { text?: string; className?: string }) {
  const show = useSettings((s) => s.spanishHints);
  if (!show || !text) return null;
  return <div className={cn('text-label-2 text-[13px]', className)}>{text}</div>;
}

export function Section({ b, children, className }: { b: CourseBlock; children: React.ReactNode; className?: string }) {
  const help = str(b.hint) || str(b.help);
  return (
    <Card className={cn('p-5 sm:p-6', className)}>
      {b.title && <h3 className="text-title-3">{b.title}</h3>}
      {help && <p className="text-label-2 mt-1 text-[14px] text-pretty">{help}</p>}
      <div className="mt-4">{children}</div>
    </Card>
  );
}

export function Done({ text }: { text: string }) {
  return (
    <div className="text-ink-green mt-4 flex items-start gap-2 rounded-[12px] bg-[color-mix(in_srgb,var(--green)_10%,transparent)] p-3 text-[14px] font-medium">
      <Check size={18} className="mt-0.5 shrink-0" /> {text}
    </div>
  );
}

export function Miss({ text }: { text: string }) {
  return (
    <div className="text-ink-red mt-4 flex items-start gap-2 rounded-[12px] bg-[color-mix(in_srgb,var(--red)_10%,transparent)] p-3 text-[14px] font-medium">
      <X size={18} className="mt-0.5 shrink-0" /> {text}
    </div>
  );
}

export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/[’']/g, "'")
    .replace(/[.,!?¿¡]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Deterministic shuffle (stable across renders for the same seed). */
export function shuffle<T>(a: T[], seed: number): T[] {
  const out = [...a];
  let s = seed * 9301 + 49297;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  // avoid returning the original order
  if (out.length > 1 && out.every((x, i) => x === a[i])) out.push(out.shift()!);
  return out;
}

/** Random pick helpers for the games. */
export const pick = <T,>(a: readonly T[]) => a[Math.floor(Math.random() * a.length)]!;
export const randomOrder = <T,>(a: readonly T[]) =>
  a
    .map((x) => ({ x, k: Math.random() }))
    .sort((p, q) => p.k - q.k)
    .map((p) => p.x);
