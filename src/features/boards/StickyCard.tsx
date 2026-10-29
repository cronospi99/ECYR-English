import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/cn';
import { COLOR_STYLE, type LiveCard } from '@/lib/boards';

/** Ink on the pastel paper: always dark, the paper stays light in dark mode too. */
export const PAPER_INK = '#1f1f24';

/** Who wrote it, as the viewer may see it. Null = say nothing (hidden). */
export function authorLabel(c: LiveCard, names: boolean): string | null {
  if (c.by_teacher) return 'Profe';
  if (c.mine) return 'Tú';
  return names ? c.author_name || 'Estudiante' : null;
}

export function LikeButton({ card, onLike, big = false }: { card: LiveCard; onLike?: () => void; big?: boolean }) {
  return (
    <button
      type="button"
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => {
        e.stopPropagation();
        onLike?.();
      }}
      disabled={!onLike || card.pending}
      aria-pressed={card.liked}
      aria-label={card.liked ? 'Quitar me gusta' : 'Me gusta'}
      className={cn(
        'inline-flex shrink-0 items-center gap-1 rounded-full font-semibold transition-colors disabled:opacity-60',
        big ? 'h-11 px-4 text-[17px]' : 'h-7 px-2 text-[13px]',
        card.liked ? 'bg-[#ff2d55]/15 text-[#c8102e]' : 'bg-black/[0.06] text-black/55 hover:bg-black/10',
      )}
    >
      <motion.span key={card.liked ? 'on' : 'off'} initial={{ scale: 0.4 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 14 }} className="flex">
        <Heart size={big ? 20 : 15} strokeWidth={2.4} fill={card.liked ? 'currentColor' : 'none'} />
      </motion.span>
      {card.likes > 0 && <span className="tabular-nums">{card.likes}</span>}
    </button>
  );
}

/**
 * A post-it: pastel paper, optional drawing, text, author and likes.
 * `tape` adds the strip of tape on top (Jam); `badge` a corner label ("Parte 2").
 */
export function StickyCard({
  card,
  image,
  names,
  onLike,
  tape = false,
  badge,
  big = false,
  className,
  style,
}: {
  card: LiveCard;
  image?: string;
  names: boolean;
  onLike?: () => void;
  tape?: boolean;
  badge?: React.ReactNode;
  big?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const c = COLOR_STYLE[card.color];
  const who = authorLabel(card, names);
  const short = card.text.length <= 40 && !card.has_image;
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-[6px] text-left select-none',
        'shadow-[0_1px_1px_rgb(0_0_0/0.08),0_10px_20px_-10px_rgb(0_0_0/0.35)] dark:brightness-[0.93]',
        card.pending && 'opacity-70',
        big ? 'gap-4 p-6 sm:p-8' : 'gap-2 p-3.5',
        className,
      )}
      style={{ background: `linear-gradient(180deg, ${c.paper} 0%, ${c.paper} 82%, color-mix(in srgb, ${c.edge} 45%, ${c.paper}) 100%)`, color: PAPER_INK, ...style }}
    >
      {tape && (
        <span
          aria-hidden
          className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rotate-[-2deg] rounded-[2px] bg-white/55 shadow-[0_1px_2px_rgb(0_0_0/0.08)] backdrop-blur-[1px]"
        />
      )}
      {badge && <div className="-mt-0.5 flex">{badge}</div>}
      {card.has_image && (
        <div className={cn('w-full overflow-hidden rounded-[4px] bg-white/70', !big && 'max-w-[300px]')} style={{ aspectRatio: '4 / 3' }}>
          {image ? (
            <img src={image} alt="Dibujo" draggable={false} className="h-full w-full object-contain" />
          ) : (
            <div className="h-full w-full animate-pulse bg-black/5" />
          )}
        </div>
      )}
      {card.text && (
        <p
          className={cn(
            'font-rounded break-words whitespace-pre-wrap',
            big ? 'text-[clamp(22px,3.4vw,40px)] leading-[1.25] font-semibold' : short ? 'text-[19px] leading-[1.25] font-semibold' : 'text-[15px] leading-[1.35] font-medium',
          )}
        >
          {card.text}
        </p>
      )}
      <div className={cn('mt-auto flex items-center gap-2', big ? 'pt-2' : 'pt-0.5')}>
        {who ? (
          <span className={cn('min-w-0 truncate font-semibold text-black/55', big ? 'text-[17px]' : 'text-[12px]')}>{who}</span>
        ) : (
          <span className="flex-1" />
        )}
        <span className="flex-1" />
        <LikeButton card={card} onLike={onLike} big={big} />
      </div>
    </div>
  );
}
