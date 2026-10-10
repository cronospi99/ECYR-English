import type { CSSProperties } from 'react';
import { cn } from '@/lib/cn';
import { levelMeta } from '@/content/levels';
import { useProgress, currentLevel } from '@/store/progress';
import type { AvatarConfig } from '@/store/avatar';
import { BuilderSvg } from './BuilderSvg';
import { PORTRAITS, bgCss, portraitSrc, type BgId, type RingId, type ShapeId } from './options';

/** iOS-style continuous-corner squircle (superellipse n≈5) as a CSS mask. */
const SQUIRCLE = (() => {
  const n = 5;
  const pts: string[] = [];
  for (let i = 0; i < 64; i++) {
    const t = (i / 64) * Math.PI * 2;
    const c = Math.cos(t);
    const s = Math.sin(t);
    const x = 50 + 50 * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = 50 + 50 * Math.sign(s) * Math.abs(s) ** (2 / n);
    pts.push(`${x.toFixed(2)} ${y.toFixed(2)}`);
  }
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><path d='M${pts.join('L')}Z'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}") center / 100% 100% no-repeat`;
})();

const shapeStyle = (shape: ShapeId): CSSProperties =>
  shape === 'circle' ? { borderRadius: '9999px' } : { mask: SQUIRCLE, WebkitMask: SQUIRCLE };

const RING_CSS: Record<Exclude<RingId, 'none' | 'level'>, string> = {
  brand: 'linear-gradient(135deg,#1A7CFF,#A35CFF)',
  gold: 'linear-gradient(135deg,#FCE38A,#E0A526 45%,#FFE9A8 70%,#C98A12)',
};

const DARK_BGS: BgId[] = ['graphite', 'brand', 'ocean', 'sunset', 'night'];

export function initialsOf(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => [...w][0]!.toUpperCase())
      .join('') || '🙂'
  );
}

export function AvatarView({
  config,
  name = '',
  size = 36,
  className,
}: {
  config: AvatarConfig;
  name?: string;
  size?: number;
  className?: string;
}) {
  const level = useProgress((s) => currentLevel(s.units));
  const shape: ShapeId = config.shape ?? 'circle';
  const ring: RingId = config.ring ?? 'none';
  const bg: BgId = config.bg ?? 'brand';
  const ringCss = ring === 'none' ? null : ring === 'level' ? (levelMeta(level)?.color ?? 'var(--blue)') : RING_CSS[ring];
  // ring + gap scale with size but stay visible at 28px
  const ringW = ringCss ? Math.max(2, Math.round(size * 0.045)) : 0;
  const gapW = ringCss ? Math.max(1.5, Math.round(size * 0.035)) : 0;
  const portrait = config.kind === 'portrait' ? PORTRAITS.find((p) => p.id === config.id) : undefined;
  const fill = portrait && !portrait.keyed ? undefined : bgCss(bg);

  let content;
  if (config.kind === 'builder') {
    content = <BuilderSvg p={config} className="absolute inset-0 h-full w-full" />;
  } else if (config.kind === 'portrait') {
    content = (
      <img
        src={portraitSrc(config.id)}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className="absolute inset-0 h-full w-full object-cover select-none"
      />
    );
  } else {
    content = (
      <span
        className="absolute inset-0 flex items-center justify-center font-semibold"
        style={{
          fontSize: (size - 2 * (ringW + gapW)) * 0.4,
          color: DARK_BGS.includes(bg) ? '#fff' : 'rgb(0 0 0 / 0.72)',
          letterSpacing: '-0.02em',
        }}
      >
        {initialsOf(name)}
      </span>
    );
  }

  const inner = (
    <span className="relative block h-full w-full overflow-hidden" style={{ ...shapeStyle(shape), background: fill }}>
      {content}
    </span>
  );

  return (
    <span
      className={cn('relative inline-block shrink-0 align-middle', className)}
      style={{ width: size, height: size, ...(ringCss ? { ...shapeStyle(shape), background: ringCss, padding: ringW } : null) }}
      aria-hidden
    >
      {ringCss ? (
        <span className="bg-card block h-full w-full" style={{ ...shapeStyle(shape), padding: gapW }}>
          {inner}
        </span>
      ) : (
        inner
      )}
    </span>
  );
}
