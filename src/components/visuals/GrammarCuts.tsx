import { useMemo, useState } from 'react';
import { Images, Maximize2 } from 'lucide-react';
import { visualUrl, type Visual } from '@/content/visuals';
import { cn } from '@/lib/cn';
import { Lightbox } from './Visuals';

/**
 * "La gramática en imágenes": the panels of our infographics that explain this
 * point, in a swipeable strip. Tapping one opens it full screen; the complete
 * infographics they come from follow in the same viewer.
 */
export function GrammarCuts({
  cuts,
  color = 'var(--blue)',
  title = 'La gramática en imágenes',
  bleed = true,
}: {
  cuts: (Visual & { parent: Visual })[];
  color?: string;
  title?: string;
  /** Scroll edge to edge of a padded card (lessons); off on plain pages. */
  bleed?: boolean;
}) {
  const [open, setOpen] = useState<number | null>(null);
  const viewer = useMemo(() => {
    const parents = [...new Map(cuts.map((c) => [c.parent.id, c.parent])).values()];
    return [...cuts, ...parents];
  }, [cuts]);
  if (!cuts.length) return null;

  return (
    <section>
      <div className="mb-2.5 flex items-center gap-2">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
          <Images size={15} />
        </span>
        <span className="text-[13px] font-bold tracking-[0.06em] uppercase" style={{ color }}>
          {title}
        </span>
        {cuts.length > 1 && <span className="text-label-3 text-[12px]">· {cuts.length}</span>}
      </div>
      <div className={cn('no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto pb-1', bleed && '-mx-5 px-5 sm:-mx-6 sm:px-6')}>
        {cuts.map((c, i) => {
          const ratio = c.w / c.h;
          // Tall panels stay narrow, wide strips get room; all share one height.
          const width = Math.round(Math.min(440, Math.max(150, 190 * ratio)));
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => setOpen(i)}
              className="group bg-card shadow-card relative shrink-0 snap-start overflow-hidden rounded-[16px] text-left"
              style={{ width: `min(${width}px, 82vw)` }}
              aria-label={`Ver imagen: ${c.title}`}
            >
              <div className="bg-fill-2 flex h-[190px] items-center justify-center overflow-hidden">
                <img
                  src={visualUrl(c, true)}
                  alt={`${c.title}. ${c.titleEs}`}
                  loading="lazy"
                  decoding="async"
                  className="max-h-full max-w-full object-contain transition-transform duration-500 group-hover:scale-[1.03]"
                />
              </div>
              <span className="material absolute top-2 right-2 flex h-7 w-7 items-center justify-center rounded-full opacity-90">
                <Maximize2 size={13} />
              </span>
              <div className="px-3 py-2">
                <div className="line-clamp-1 text-[14px] font-semibold">{c.title}</div>
                <div className="text-label-2 line-clamp-1 text-[12px]">{c.titleEs}</div>
              </div>
            </button>
          );
        })}
      </div>
      <Lightbox items={viewer} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </section>
  );
}
