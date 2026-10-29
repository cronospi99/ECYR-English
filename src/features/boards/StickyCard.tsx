import { useRef } from 'react';
import { motion } from 'motion/react';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/cn';
import { COLOR_STYLE, SHAPES, type CardShape, type LiveCard } from '@/lib/boards';
import { ShapeBg, useFitText } from './shapes';

/** Ink on the pastel paper: always dark, the paper stays light in dark mode too. */
export const PAPER_INK = '#1f1f24';

/** Who wrote it, as the viewer may see it. Null = say nothing (hidden). */
export function authorLabel(c: LiveCard, names: boolean): string | null {
  if (c.by_teacher) return 'Profe';
  if (c.mine) return 'Tú';
  return names ? c.author_name || 'Estudiante' : null;
}

export function LikeButton({ card, onLike, big = false, floating = false }: { card: LiveCard; onLike?: () => void; big?: boolean; floating?: boolean }) {
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
        floating
          ? cn('shadow-[0_2px_6px_-1px_rgb(0_0_0/0.3)]', card.liked ? 'bg-[#ffe0e7] text-[#c8102e]' : 'bg-white text-black/55 hover:bg-[#f4f4f6]')
          : card.liked
            ? 'bg-[#ff2d55]/15 text-[#c8102e]'
            : 'bg-black/[0.06] text-black/55 hover:bg-black/10',
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
 * A card: pastel paper in its shape, optional drawing, text, author and likes.
 * `tape` adds the strip of tape on top (Jam); `badge` a corner label ("Parte 2").
 * `fill`: the parent gives it a fixed size (Jam canvas) — the text shrinks to fit.
 * Without `fill`, non-note shapes keep their own proportions (Columns, Story).
 */
export function StickyCard({
  card,
  image,
  names,
  onLike,
  tape = false,
  badge,
  big = false,
  fill = false,
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
  fill?: boolean;
  className?: string;
  style?: React.CSSProperties;
}) {
  const shape = big ? 'note' : (card.shape ?? 'note');
  if (shape === 'note') return <Note card={card} image={image} names={names} onLike={onLike} tape={tape} badge={badge} big={big} fill={fill} className={className} style={style} />;
  return <Shaped card={card} shape={shape} image={image} names={names} onLike={onLike} tape={tape} badge={badge} fill={fill} className={className} style={style} />;
}

type CardProps = {
  card: LiveCard;
  image?: string;
  names: boolean;
  onLike?: () => void;
  tape: boolean;
  badge?: React.ReactNode;
  fill: boolean;
  className?: string;
  style?: React.CSSProperties;
};

function Tape() {
  return (
    <span
      aria-hidden
      className="absolute -top-2.5 left-1/2 z-[1] h-5 w-16 -translate-x-1/2 rotate-[-2deg] rounded-[2px] bg-white/55 shadow-[0_1px_2px_rgb(0_0_0/0.08)] backdrop-blur-[1px]"
    />
  );
}

/** The classic post-it (grows with its text unless `fill`). */
function Note({ card, image, names, onLike, tape, badge, big, fill, className, style }: CardProps & { big: boolean }) {
  const c = COLOR_STYLE[card.color];
  const who = authorLabel(card, names);
  const short = card.text.length <= 40 && !card.has_image;
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  useFitText(fill ? boxRef : { current: null }, textRef, [fill, card.text, card.has_image, !!image], short ? 30 : 22, 10);
  return (
    <div
      className={cn(
        'relative flex flex-col rounded-[6px] text-left select-none',
        'shadow-[0_1px_1px_rgb(0_0_0/0.08),0_10px_20px_-10px_rgb(0_0_0/0.35)] dark:brightness-[0.93]',
        card.pending && 'opacity-70',
        big ? 'gap-4 p-6 sm:p-8' : 'gap-2 p-3.5',
        fill && 'h-full',
        className,
      )}
      style={{ background: `linear-gradient(180deg, ${c.paper} 0%, ${c.paper} 82%, color-mix(in srgb, ${c.edge} 45%, ${c.paper}) 100%)`, color: PAPER_INK, ...style }}
    >
      {tape && <Tape />}
      {badge && <div className="-mt-0.5 flex">{badge}</div>}
      <div ref={boxRef} className={cn('flex flex-col gap-2', fill && 'min-h-0 flex-1 overflow-hidden')}>
        {card.has_image && (
          <div
            className={cn('w-full overflow-hidden rounded-[4px] bg-white/70', !big && 'max-w-[300px]', fill && 'min-h-0 shrink')}
            style={{ aspectRatio: '4 / 3', ...(fill ? { maxHeight: '70%' } : {}) }}
          >
            {image ? <img src={image} alt="Dibujo" draggable={false} className="h-full w-full object-contain" /> : <div className="h-full w-full animate-pulse bg-black/5" />}
          </div>
        )}
        {card.text && (
          <p
            ref={textRef}
            className={cn(
              'font-rounded break-words whitespace-pre-wrap',
              big
                ? 'text-[clamp(22px,3.4vw,40px)] leading-[1.25] font-semibold'
                : short
                  ? 'text-[19px] leading-[1.25] font-semibold'
                  : 'text-[15px] leading-[1.35] font-medium',
            )}
          >
            {card.text}
          </p>
        )}
      </div>
      <div className={cn('mt-auto flex shrink-0 items-center gap-2', big ? 'pt-2' : 'pt-0.5')}>
        {who ? <span className={cn('min-w-0 truncate font-semibold text-black/55', big ? 'text-[17px]' : 'text-[12px]')}>{who}</span> : <span className="flex-1" />}
        <span className="flex-1" />
        <LikeButton card={card} onLike={onLike} big={big} />
      </div>
    </div>
  );
}

/** Pill, circle, bubble, cloud, hexagon, diamond: centred text that fits inside the shape. */
function Shaped({ card, shape, image, names, onLike, tape, badge, fill, className, style }: CardProps & { shape: CardShape }) {
  const info = SHAPES[shape];
  const who = authorLabel(card, names);
  const boxRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLParagraphElement>(null);
  // A pill in a column grows with its text; everything else has a fixed box.
  const grows = !fill && info.aspect === null;
  useFitText(grows ? { current: null } : boxRef, textRef, [grows, card.text, card.has_image, !!image, shape], fill ? (card.text.length <= 30 ? 32 : 24) : 22, 9);
  const [t, r, b, l] = info.inset;
  return (
    <div
      className={cn('relative text-center select-none dark:brightness-[0.93]', card.pending && 'opacity-70', fill ? 'h-full' : 'mx-auto w-full max-w-[340px]', className)}
      style={{ color: PAPER_INK, ...(grows ? {} : fill ? {} : { aspectRatio: info.aspect ?? undefined }), ...style }}
    >
      <ShapeBg shape={shape} color={card.color} />
      {tape && shape === 'round' && <Tape />}
      <div
        ref={boxRef}
        className={cn('flex flex-col items-center justify-center gap-1 overflow-hidden', grows ? 'relative min-h-[64px] px-6 py-3' : 'absolute')}
        style={grows ? undefined : { top: t, right: r, bottom: b, left: l }}
      >
        {badge && <div className="flex shrink-0">{badge}</div>}
        {card.has_image && (
          <div className="min-h-0 w-full max-w-[220px] shrink overflow-hidden rounded-[6px] bg-white/70" style={{ aspectRatio: '4 / 3', maxHeight: card.text ? '58%' : '100%' }}>
            {image ? <img src={image} alt="Dibujo" draggable={false} className="h-full w-full object-contain" /> : <div className="h-full w-full animate-pulse bg-black/5" />}
          </div>
        )}
        {card.text && (
          <p ref={textRef} className={cn('font-rounded max-w-full leading-[1.2] font-semibold break-words whitespace-pre-wrap', grows && 'text-[18px]')}>
            {card.text}
          </p>
        )}
        {who && <span className="max-w-full shrink-0 truncate text-[11px] leading-tight font-semibold text-black/50">{who}</span>}
      </div>
      <div className={cn('absolute z-[2]', shape === 'bubble' ? 'right-2 bottom-[13%]' : shape === 'round' ? 'right-[8%] -bottom-2' : 'bottom-[-10px] left-1/2 -translate-x-1/2')}>
        <LikeButton card={card} onLike={onLike} floating />
      </div>
    </div>
  );
}
