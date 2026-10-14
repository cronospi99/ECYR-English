import { useId, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, Link2 } from 'lucide-react';
import { SpeakButton } from '@/components/learning/SpeakButton';
import type { VocabItem } from '@/content/types';
import { cn } from '@/lib/cn';
import { QuoteText, ink, tint } from './ui';

/** Part of speech → colour family + Spanish label. */
export function posInfo(pos?: string): { key: string; label: string; color: string } {
  const p = (pos ?? '').toLowerCase();
  if (/phrasal/.test(p)) return { key: 'phrasal', label: 'Phrasal verb', color: 'var(--indigo)' };
  if (/idiom|expression|phrase|collocation|chunk/.test(p)) return { key: 'expr', label: 'Expresión', color: 'var(--teal)' };
  if (/^verb|verb$|\bverb\b/.test(p)) return { key: 'verb', label: 'Verbo', color: 'var(--green)' };
  if (/adverb/.test(p)) return { key: 'adv', label: 'Adverbio', color: 'var(--purple)' };
  if (/adjective|adj/.test(p)) return { key: 'adj', label: 'Adjetivo', color: 'var(--orange)' };
  if (/noun/.test(p)) return { key: 'noun', label: 'Sustantivo', color: 'var(--blue)' };
  if (!p) return { key: 'other', label: 'Otro', color: 'var(--pink)' };
  return { key: 'other', label: 'Otro', color: 'var(--pink)' };
}

/** Visual grid of word cards with a part-of-speech filter; tap a card for use, examples and collocations. */
export function VocabGrid({ items }: { items: VocabItem[] }) {
  const groups = useMemo(() => {
    const m = new Map<string, { label: string; color: string; n: number }>();
    items.forEach((v) => {
      const i = posInfo(v.pos);
      const g = m.get(i.key) ?? { label: i.label, color: i.color, n: 0 };
      g.n++;
      m.set(i.key, g);
    });
    return [...m.entries()];
  }, [items]);
  const [filter, setFilter] = useState<string | null>(null);
  const shown = filter ? items.filter((v) => posInfo(v.pos).key === filter) : items;

  return (
    <div>
      {groups.length > 1 && (
        <div className="mb-4 flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por categoría">
          <FilterChip on={!filter} onClick={() => setFilter(null)} color="var(--label-2)" label="Todas" n={items.length} />
          {groups.map(([k, g]) => (
            <FilterChip key={k} on={filter === k} onClick={() => setFilter(filter === k ? null : k)} color={g.color} label={g.label} n={g.n} />
          ))}
        </div>
      )}
      <ul className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 lg:grid-cols-3">
        {shown.map((v, k) => (
          <WordCard key={`${v.term}-${k}`} v={v} />
        ))}
      </ul>
    </div>
  );
}

function FilterChip({ on, onClick, color, label, n }: { on: boolean; onClick: () => void; color: string; label: string; n: number }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors', !on && 'bg-fill-2')}
      style={on ? { background: tint(color, 18), color: ink(color), boxShadow: `inset 0 0 0 1.5px ${tint(color, 50)}` } : undefined}
    >
      <span className="h-2 w-2 rounded-full" style={{ background: color }} aria-hidden />
      {label}
      <span className="text-label-2 tabular-nums">{n}</span>
    </button>
  );
}

function WordCard({ v }: { v: VocabItem }) {
  const [open, setOpen] = useState(false);
  const info = posInfo(v.pos);
  const id = useId();
  const hasMore = Boolean(v.use || v.examples?.length || v.colloc);
  return (
    <li className="bg-card shadow-card relative flex flex-col overflow-hidden rounded-[20px]">
      <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: info.color }} aria-hidden />
      <div className="flex items-start gap-2 pt-4 pr-2 pb-3 pl-5">
        <div className="min-w-0 flex-1">
          <div className="text-[20px] leading-tight font-bold tracking-[-0.01em] break-words">{v.term}</div>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <span className="rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase" style={{ background: tint(info.color, 14), color: ink(info.color) }}>
              {v.pos || info.label}
            </span>
          </div>
        </div>
        <SpeakButton text={v.term} />
      </div>
      <p className="px-5 text-[15px] leading-snug text-pretty">{v.def}</p>
      {v.examples?.[0] && (
        <div className="mx-4 mt-2.5 flex items-start gap-1.5 rounded-[12px] py-1.5 pr-1 pl-2.5 text-[14px] italic" style={{ background: tint(info.color, 8) }}>
          <span className="min-w-0 flex-1 pt-0.5">{v.examples[0]}</span>
          <SpeakButton text={v.examples[0]} size={15} />
        </div>
      )}
      {hasMore && (
        <button
          type="button"
          aria-expanded={open}
          aria-controls={id}
          onClick={() => setOpen((o) => !o)}
          className="text-ios-blue mt-auto flex items-center gap-1 px-5 pt-2.5 pb-3.5 text-[13px] font-semibold"
        >
          {open ? 'Menos' : 'Uso y ejemplos'}
          <ChevronDown size={15} className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
        </button>
      )}
      {!hasMore && <div className="pb-4" />}
      <AnimatePresence initial={false}>
        {open && (
          <motion.div id={id} initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }}>
            <div className="space-y-2.5 px-5 pb-4 text-[14px]">
              {v.use && (
                <p className="leading-snug text-pretty">
                  <QuoteText text={v.use} color={info.color} />
                </p>
              )}
              {v.examples && v.examples.length > 1 && (
                <ul className="space-y-1.5">
                  {v.examples.slice(1).map((e) => (
                    <li key={e} className="bg-fill-2 flex items-start gap-1.5 rounded-[10px] py-1.5 pr-1 pl-2.5 italic">
                      <span className="min-w-0 flex-1 pt-0.5">{e}</span>
                      <SpeakButton text={e} size={15} />
                    </li>
                  ))}
                </ul>
              )}
              {v.colloc && (
                <div className="flex items-start gap-1.5">
                  <Link2 size={14} className="text-label-2 mt-1 shrink-0" aria-label="Colocaciones" />
                  <div className="flex flex-wrap gap-1">
                    {v.colloc.split(/\s*·\s*/).map((c) => (
                      <span key={c} className="bg-fill-2 rounded-full px-2 py-0.5 text-[13px]">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}
