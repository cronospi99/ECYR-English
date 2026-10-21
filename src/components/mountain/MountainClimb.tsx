import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { animate, useMotionValue, useMotionValueEvent, useReducedMotion } from 'motion/react';
import { cn } from '@/lib/cn';
import { CEFR_LEVELS } from '@/content/types';

/**
 * A climber walks the trail up the mountain to `progress` (0–1).
 * Each CEFR level is one stretch of the trail; camps mark where the next begins.
 */
const TRAIL_TAIL =
  'C130 278 190 272 236 252 C270 236 250 214 280 200 C320 182 350 176 360 160 C372 140 330 132 352 116 C372 100 410 96 420 80 C426 70 428 62 430 54';
const TRAIL = `M62 284 ${TRAIL_TAIL}`;

/** In the panoramic layout the trail starts further left, across the foothills. */
function trailFrom(x0: number) {
  if (x0 > -40) return TRAIL;
  const a = x0 + 56;
  const span = 62 - a;
  return `M${a} 288 C${a + span * 0.28} 272 ${a + span * 0.52} 296 ${a + span * 0.74} 284 C${a + span * 0.86} 278 ${a + span * 0.94} 286 62 284 ${TRAIL_TAIL}`;
}

/** One camp where each CEFR level starts: each level is an equal stretch of the trail. */
const CAMPS: { at: number; label: string }[] = CEFR_LEVELS.map((label, i) => ({ at: i / CEFR_LEVELS.length, label }));

/** Sky colours, exported so a wrapper can extend the sky above the drawing. */
export const SKY_VARS = {
  '--sky-a': 'color-mix(in srgb, var(--blue) 14%, var(--card))',
  '--sky-b': 'color-mix(in srgb, var(--purple) 10%, var(--card))',
} as React.CSSProperties;

interface Pose {
  x: number;
  y: number;
  flip: boolean;
}

export function MountainClimb({
  progress,
  className,
  showCamps = true,
  label,
  wide = false,
}: {
  progress: number;
  className?: string;
  showCamps?: boolean;
  label?: string;
  /** Panoramic: fills its container's width (up to 340px tall), extending the scenery to the left. */
  wide?: boolean;
}) {
  const uid = useId().replace(/:/g, '');
  const box = useRef<HTMLDivElement>(null);
  const [x0, setX0] = useState(0);
  const [height, setHeight] = useState<number | undefined>();
  useLayoutEffect(() => {
    const el = box.current;
    if (!wide || !el) return;
    const fit = () => {
      const w = el.clientWidth;
      if (!w) return;
      const h = Math.round(Math.min(340, Math.max(170, w / 2)));
      const viewW = Math.min(1000, Math.max(600, (300 * w) / h));
      setHeight(h);
      setX0(Math.round(600 - viewW));
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [wide]);
  const d = trailFrom(x0);
  const startPose = useRef({ x: 62, y: 284 });
  const pathRef = useRef<SVGPathElement>(null);
  const [len, setLen] = useState(0);
  const [camps, setCamps] = useState<(Pose & { label: string; at: number })[]>([]);
  const [pose, setPose] = useState<Pose>({ x: 62, y: 284, flip: false });
  const [moving, setMoving] = useState(false);
  const mv = useMotionValue(0);
  const reduce = useReducedMotion();
  const target = Math.max(0, Math.min(1, progress));

  const poseAt = (v: number): Pose => {
    const p = pathRef.current;
    if (!p || !len) return { ...startPose.current, flip: false };
    const a = p.getPointAtLength(v * len);
    const b = p.getPointAtLength(Math.min(len, v * len + 4));
    const c = p.getPointAtLength(Math.max(0, v * len - 4));
    return { x: a.x, y: a.y, flip: b.x - c.x < 0 };
  };

  useLayoutEffect(() => {
    const p = pathRef.current;
    if (!p) return;
    const l = p.getTotalLength();
    const s0 = p.getPointAtLength(0);
    startPose.current = { x: s0.x, y: s0.y };
    setLen(l);
    setPose((cur) => (mv.get() === 0 ? { x: s0.x, y: s0.y, flip: false } : cur));
    setCamps(
      CAMPS.map((c) => {
        const pt = p.getPointAtLength(c.at * l);
        return { ...c, x: pt.x, y: pt.y, flip: false };
      }),
    );
    if (mv.get() > 0) setPose(poseAt(mv.get()));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d]);

  useMotionValueEvent(mv, 'change', (v) => setPose(poseAt(v)));

  useEffect(() => {
    if (!len) return;
    if (reduce) {
      mv.set(target);
      setPose(poseAt(target));
      return;
    }
    setMoving(true);
    const distance = Math.abs(target - mv.get());
    const controls = animate(mv, target, {
      duration: 1.2 + distance * 3.2,
      ease: [0.45, 0, 0.25, 1],
      onComplete: () => setMoving(false),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [len, target, reduce]);

  const done = len * mv.get();
  const atSummit = target >= 0.999;

  const vw = 600 - x0;
  const svg = (
    <svg
      viewBox={`${x0} 0 ${vw} 300`}
      preserveAspectRatio={wide ? 'xMaxYMax slice' : undefined}
      className={cn('block w-full select-none', wide ? 'h-full' : 'h-auto', className)}
      role="img"
      aria-label={label ?? `Progreso de escalada: ${Math.round(target * 100)}%`}
      style={SKY_VARS}
    >
      <defs>
        <linearGradient id={`sky-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" style={{ stopColor: 'var(--sky-a)' }} />
          <stop offset="1" style={{ stopColor: 'var(--sky-b)' }} />
        </linearGradient>
        <linearGradient id={`mtn-${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6E8BFF" />
          <stop offset="0.55" stopColor="#4F6BF5" />
          <stop offset="1" stopColor="#6A4FE0" />
        </linearGradient>
        <linearGradient id={`shade-${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#1B1270" stopOpacity="0.35" />
        </linearGradient>
        <linearGradient id={`back-${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#A9B8FF" />
          <stop offset="1" stopColor="#C9B8FF" />
        </linearGradient>
        <radialGradient id={`sun-${uid}`}>
          <stop offset="0" stopColor="#FFE9A8" />
          <stop offset="0.6" stopColor="#FFD36B" stopOpacity="0.55" />
          <stop offset="1" stopColor="#FFD36B" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`frame-${uid}`}>
          <rect x={x0} width={vw} height="300" rx="0" />
        </clipPath>
      </defs>

      <g clipPath={`url(#frame-${uid})`}>
        <rect x={x0} width={vw} height="300" fill={`url(#sky-${uid})`} />
        <circle cx="520" cy="62" r="54" fill={`url(#sun-${uid})`} />
        <circle cx="520" cy="62" r="18" fill="#FFE08A" />

        {/* clouds */}
        <g opacity="0.85" style={{ animation: reduce ? undefined : 'drift 46s linear infinite' }}>
          <g fill="#fff">
            <ellipse cx="40" cy="70" rx="26" ry="9" />
            <ellipse cx="58" cy="64" rx="16" ry="10" />
          </g>
        </g>
        <g opacity="0.7" style={{ animation: reduce ? undefined : 'drift 64s linear infinite', animationDelay: '-30s' }}>
          <g fill="#fff">
            <ellipse cx="20" cy="118" rx="22" ry="7" />
            <ellipse cx="34" cy="113" rx="13" ry="8" />
          </g>
        </g>

        {x0 < 0 && (
          <g>
            <g opacity="0.75" style={{ animation: reduce ? undefined : 'drift 58s linear infinite', animationDelay: '-12s' }}>
              <g fill="#fff">
                <ellipse cx={x0 + 120} cy="58" rx="28" ry="9" />
                <ellipse cx={x0 + 140} cy="51" rx="17" ry="11" />
              </g>
            </g>
            <path
              d={`M${x0 - 10} 300 L${x0 - 10} 190 L${x0 + 90} 128 L${x0 + 170} 176 L${x0 + 260} 110 L${x0 + 350} 168 L${x0 + 420} 140 L${x0 + 520} 196 L40 300 Z`}
              fill={`url(#back-${uid})`}
              opacity="0.4"
            />
            <path
              d={`M${x0 - 10} 300 L${x0 - 10} 236 L${x0 + 110} 184 L${x0 + 200} 220 L${x0 + 300} 170 L${x0 + 420} 226 L${x0 + 520} 204 L60 300 Z`}
              fill={`url(#mtn-${uid})`}
              opacity="0.55"
            />
            <path d={`M${x0 - 10} 300 L${x0 - 10} 274 C${x0 + 120} 256 ${x0 + 260} 266 ${x0 + 400} 282 C${x0 + 480} 290 0 296 40 300 Z`} fill="#7FA0FF" opacity="0.5" />
          </g>
        )}
        {/* back range */}
        <path d="M-10 300 L110 150 L180 205 L265 120 L340 210 L420 160 L520 230 L610 140 L610 300 Z" fill={`url(#back-${uid})`} opacity="0.55" />

        {/* main mountain */}
        <path d="M20 300 L170 196 L228 214 L330 120 L430 48 L494 120 L540 150 L610 240 L610 300 Z" fill={`url(#mtn-${uid})`} />
        <path d="M430 48 L494 120 L540 150 L610 240 L610 300 L470 300 L452 170 Z" fill={`url(#shade-${uid})`} />
        {/* snow cap */}
        <path d="M430 48 L462 84 L448 80 L438 92 L424 78 L410 88 L402 76 Z" fill="#fff" opacity="0.95" />
        {/* foreground hills */}
        <path d="M-10 300 L-10 268 C60 250 120 262 190 280 C240 292 280 300 300 300 Z" fill="#7FA0FF" opacity="0.55" />
        <path d="M360 300 C430 276 520 262 610 270 L610 300 Z" fill="#8C78F0" opacity="0.5" />

        {/* trail: remaining (dashed) and completed (solid) */}
        <path
          ref={pathRef}
          d={d}
          fill="none"
          stroke="#fff"
          strokeOpacity="0.55"
          strokeWidth="2.5"
          strokeDasharray="2 7"
          strokeLinecap="round"
        />
        {len > 0 && (
          <path
            d={d}
            fill="none"
            stroke="#fff"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={`${done} ${len}`}
          />
        )}

        {/* camps */}
        {showCamps &&
          camps.map((c) => {
            const reached = target >= c.at;
            return (
              <g key={c.label} transform={`translate(${c.x} ${c.y})`}>
                <circle r="6.5" fill={reached ? '#fff' : 'rgba(255,255,255,.35)'} />
                <circle r="3" fill={reached ? '#4F6BF5' : 'rgba(255,255,255,.7)'} />
                <g transform="translate(10 -10)">
                  <rect x="0" y="-9" width="26" height="16" rx="8" fill="rgba(255,255,255,.92)" />
                  <text x="13" y="3" textAnchor="middle" fontSize="10" fontWeight="700" fill="#3B4CC0">
                    {c.label}
                  </text>
                </g>
              </g>
            );
          })}

        {/* summit flag */}
        <g transform="translate(430 54)">
          <line x1="0" y1="0" x2="0" y2="-30" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
          <path
            d="M1 -30 L24 -24 L1 -17 Z"
            fill={atSummit ? '#FFCC00' : '#FF3B30'}
            style={{ transformOrigin: '1px -24px', animation: reduce ? undefined : 'flag-wave 1.6s ease-in-out infinite' }}
          />
        </g>

        {/* climber */}
        <g transform={`translate(${pose.x} ${pose.y}) scale(1.25)`}>
          <g transform={`scale(${pose.flip ? -1 : 1} 1)`}>
            <ellipse cx="0" cy="1" rx="7" ry="2" fill="#000" opacity="0.18" />
            <g
              style={{
                animation: moving && !reduce ? 'bob 0.36s ease-in-out infinite' : atSummit && !reduce ? 'bob 0.8s ease-in-out infinite' : undefined,
              }}
            >
              {/* legs */}
              <g transform="translate(0 -9)">
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="9"
                  stroke="#1F2A44"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{ transformOrigin: '0 0', animation: moving && !reduce ? 'leg-a 0.36s ease-in-out infinite' : undefined }}
                />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="9"
                  stroke="#2E3B5C"
                  strokeWidth="3"
                  strokeLinecap="round"
                  style={{ transformOrigin: '0 0', animation: moving && !reduce ? 'leg-b 0.36s ease-in-out infinite' : undefined }}
                />
              </g>
              {/* backpack */}
              <rect x="-8.5" y="-21" width="6" height="11" rx="2.5" fill="#FF9500" />
              {/* torso */}
              <rect x="-4" y="-22" width="8.5" height="13.5" rx="4" fill="#FF3B30" />
              {/* pole + arm */}
              <line x1="2" y1="-17" x2="9" y2="-12" stroke="#FFD2B0" strokeWidth="2.4" strokeLinecap="round" />
              <line x1="9" y1="-20" x2="11" y2="0" stroke="#E5E7EB" strokeWidth="1.4" strokeLinecap="round" />
              {/* head */}
              <circle cx="0.5" cy="-26.5" r="4.6" fill="#FFD2B0" />
              <path d="M-4.4 -27.5 A4.9 4.9 0 0 1 5.4 -27.5 Z" fill="#007AFF" />
              <rect x="3.2" y="-28.6" width="3.6" height="1.6" rx="0.8" fill="#007AFF" />
            </g>
          </g>
        </g>
      </g>
    </svg>
  );
  if (!wide) return svg;
  return (
    <div ref={box} className="relative w-full" style={{ height: height ?? 300 }}>
      {svg}
    </div>
  );
}
