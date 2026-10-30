import { useId, useRef, type CSSProperties, type PointerEvent } from 'react';
import { TEACHERS, type TeacherCard } from './teachers';
import { TeacherToon } from './TeacherToon';
import { rankProgress, type CardRank } from './api';
import { RANK_LOOK } from './ranks';
import { useCardClock } from './clock';
import './cards.css';

const K = '#0e1113';
const MONO = "'Space Mono', ui-monospace, monospace";
const BLACK = "'Archivo Black', 'Arial Black', system-ui, sans-serif";

/* ------------------------------------------------------------------ emblem */
/** Rank emblem: a metal shield with 1–3 stars (bronze → gold) or a cut gem (diamond). */
export function RankEmblem({ rank, size = 28, style }: { rank: CardRank; size?: number; style?: CSSProperties }) {
  const id = useId().replace(/:/g, '');
  const L = RANK_LOOK[rank];
  const stars = rank === 'bronze' ? 1 : rank === 'silver' ? 2 : 3;
  const star = (cx: number, cy: number, r: number, k: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 ? r * 0.45 : r;
      pts.push(`${(cx + Math.cos(a) * rr).toFixed(2)},${(cy + Math.sin(a) * rr).toFixed(2)}`);
    }
    return <polygon key={k} points={pts.join(' ')} fill="#fffbe8" stroke={K} strokeWidth={1.4} strokeLinejoin="round" />;
  };
  return (
    <svg viewBox="0 0 40 44" width={size} height={size * 1.1} style={{ display: 'block', flex: 'none', overflow: 'visible', ...style }} aria-label={L.label} role="img">
      <defs>
        <linearGradient id={`m${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={L.gem[0]} />
          <stop offset="0.5" stopColor={L.gem[1]} />
          <stop offset="1" stopColor={L.gem[2]} />
        </linearGradient>
      </defs>
      {rank === 'diamond' ? (
        <g strokeLinejoin="round">
          <path d="M8 13 L14 5 H26 L32 13 L20 40 Z" fill={`url(#m${id})`} stroke={K} strokeWidth={2.6} />
          <path d="M8 13 H32 M14 5 L17 13 L20 40 M26 5 L23 13 L20 40 M17 13 L20 5 L23 13" fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={1.2} />
          <path d="M9 13 L20 40 L14 13 Z" fill="rgba(255,255,255,0.35)" />
          <path d="M31 13 L20 40 L26 13 Z" fill="rgba(60,30,160,0.25)" />
        </g>
      ) : (
        <g strokeLinejoin="round">
          <path d="M20 2 L36 8 V20 C36 31 28 38 20 42 C12 38 4 31 4 20 V8 Z" fill={`url(#m${id})`} stroke={K} strokeWidth={2.6} />
          <path d="M20 6 L32 10.5 V20 C32 28.5 26 34 20 37.5" fill="none" stroke="rgba(255,255,255,0.55)" strokeWidth={1.6} />
          {stars === 1 && star(20, 21, 8.5, 0)}
          {stars === 2 && [star(14, 22, 6.2, 0), star(26, 22, 6.2, 1)]}
          {stars === 3 && [star(20, 15.5, 6, 0), star(13, 26, 5.4, 1), star(27, 26, 5.4, 2)]}
        </g>
      )}
    </svg>
  );
}

/* ------------------------------------------------------------------ progress bar */
/** Bar towards the next rank, in the rank's colours. */
export function RankBar({ points, height = 10, style }: { points: number; height?: number; style?: CSSProperties }) {
  const p = rankProgress(points);
  const L = RANK_LOOK[p.rank];
  return (
    <div className="ecyr-card-bar" style={{ height, borderRadius: height, border: `2px solid ${K}`, background: '#14181b', overflow: 'hidden', ...style }}>
      <span
        style={{
          display: 'block',
          height: '100%',
          borderRadius: height,
          transition: 'width .9s cubic-bezier(.2,.9,.3,1)',
          width: `${Math.max(p.pct > 0 ? 6 : 0, Math.round(p.pct * 100))}%`,
          backgroundColor: L.accent,
          backgroundImage: `repeating-linear-gradient(45deg, ${L.accent} 0 7px, ${L.deep} 7px 14px)`,
        }}
      />
    </div>
  );
}

/* sparkle centres sit on the metal frame, never over the card text */
const SPARKS = [
  { l: 2.5, t: 14, s: 0.11, d: 0 },
  { l: 62, t: 1.6, s: 0.08, d: 0.7 },
  { l: 97.5, t: 34, s: 0.1, d: 1.3 },
  { l: 2.5, t: 63, s: 0.09, d: 1.8 },
  { l: 97.5, t: 82, s: 0.12, d: 0.4 },
  { l: 30, t: 98.4, s: 0.07, d: 1.1 },
];

function Spark({ size }: { size: number }) {
  return (
    <svg viewBox="-10 -10 20 20" width={size} height={size} style={{ display: 'block' }}>
      <path d="M0 -10 C1 -2 2 -1 10 0 C2 1 1 2 0 10 C-1 2 -2 1 -10 0 C-2 -1 -1 -2 0 -10 Z" fill="#fff" />
      <circle r={2.2} fill="#e6fbff" />
    </svg>
  );
}

/* ------------------------------------------------------------------ the card */
export interface TeacherCardViewProps {
  card: TeacherCard;
  /** Points earned with this card (sets the rank frame). */
  points?: number;
  width?: number;
  /** Animate the portrait (idle breathing). Keep false in big grids. */
  animate?: boolean;
  /** Show the rank footer (emblem, points, bar). */
  showRank?: boolean;
  /** 3D tilt following the pointer. */
  tilt?: boolean;
  /** Draw as an unknown silhouette (kept for older callers). */
  owned?: boolean;
  index?: number;
  selected?: boolean;
  style?: CSSProperties;
}

/** A character card with its rank frame (bronze, silver, gold, diamond). */
export function TeacherCardView({ card, points = 0, width = 180, animate = true, showRank = true, tilt = false, owned = true, index, selected, style }: TeacherCardViewProps) {
  const t = useCardClock(animate && owned, 20);
  const ref = useRef<HTMLDivElement>(null);
  const prog = rankProgress(points);
  const rank = prog.rank;
  const L = RANK_LOOK[rank];
  const gold = !!card.special;
  const num = (index ?? TEACHERS.findIndex((x) => x.id === card.id)) + 1;
  const W = width;
  const frame = Math.max(4, Math.round(W * 0.045));
  const radius = Math.max(8, W * 0.075);
  const small = W < 132;
  const tiny = W < 96;
  const mini = W < 70;
  const fs = (k: number, min: number) => Math.max(min, W * k);

  const onMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!tilt || !ref.current || e.pointerType === 'touch') return;
    const r = ref.current.getBoundingClientRect();
    const x = (e.clientX - r.left) / r.width - 0.5;
    const y = (e.clientY - r.top) / r.height - 0.5;
    ref.current.style.transform = `perspective(900px) rotateY(${x * 14}deg) rotateX(${-y * 14}deg) translateY(-4px)`;
  };
  const onLeave = () => {
    if (ref.current) ref.current.style.transform = '';
  };

  return (
    <div
      ref={ref}
      onPointerMove={onMove}
      onPointerLeave={onLeave}
      className={`ecyr-card is-${rank}`}
      style={{
        width: W,
        aspectRatio: '0.68',
        borderRadius: radius,
        border: `${W < 110 ? 2.5 : 3.5}px solid ${K}`,
        boxShadow: `0 ${Math.max(3, W * 0.03)}px 0 ${K}${rank === 'gold' || rank === 'diamond' ? `, 0 0 ${W * 0.12}px ${L.glow}` : ''}${selected ? `, 0 0 0 ${Math.max(3, W * 0.025)}px #fff, 0 0 0 ${Math.max(6, W * 0.05)}px ${L.accent}` : ''}`,
        color: '#f2efe6',
        ...style,
      }}
    >
      <div className="ecyr-card-metal" style={{ position: 'absolute', inset: 0, borderRadius: radius - 3, background: L.metal, boxShadow: 'inset 0 2px 0 rgba(255,255,255,0.65), inset 0 -3px 0 rgba(0,0,0,0.35)' }} />
      <div className="ecyr-card-sheen" />
      {rank === 'diamond' &&
        SPARKS.map((s, i) => (
          <span key={i} className="ecyr-card-spark" style={{ left: `${s.l}%`, top: `${s.t}%`, marginLeft: -Math.max(8, W * s.s) / 2, marginTop: -Math.max(8, W * s.s) / 2, animationDelay: `${s.d}s` }}>
            <Spark size={Math.max(8, W * s.s)} />
          </span>
        ))}

      {/* card body (the original card face) */}
      <div
        style={{
          position: 'absolute',
          inset: frame,
          zIndex: 2,
          borderRadius: Math.max(5, radius - frame),
          border: `${W < 110 ? 2 : 3}px solid ${K}`,
          background: gold ? 'linear-gradient(135deg,#f5c518,#fff2a8 40%,#c99d00 60%,#f5c518)' : 'linear-gradient(#3b4349,#2b3236)',
          padding: Math.max(3, W * 0.03),
          display: 'flex',
          flexDirection: 'column',
          gap: Math.max(2, W * 0.02),
          overflow: 'hidden',
        }}
      >
        {!tiny && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', font: `700 ${fs(0.05, 8)}px/1.1 ${MONO}`, letterSpacing: '0.06em', textTransform: 'uppercase', color: gold ? K : L.accent }}>
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{owned ? card.role : '???'}</span>
            <span>#{String(num).padStart(2, '0')}</span>
          </div>
        )}
        <div
          style={{
            flex: 1,
            minHeight: 0,
            border: `${W < 110 ? 2 : 3}px solid ${K}`,
            borderRadius: Math.max(4, W * 0.035),
            background: owned ? (gold ? 'radial-gradient(circle at 50% 40%,#fff6c8,#e9b949)' : L.portrait) : '#1b2023',
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          {rank === 'diamond' && owned && <div className="ecyr-card-holo" />}
          <svg viewBox="-62 -178 124 184" style={{ position: 'relative', width: '100%', height: '100%', display: 'block' }} preserveAspectRatio="xMidYMax meet" aria-hidden>
            <ellipse cx={0} cy={2} rx={34} ry={6} fill="rgba(0,0,0,0.35)" />
            <TeacherToon look={card.look} t={t} seed={num} silhouette={!owned} />
          </svg>
          {showRank && (
            <RankEmblem rank={rank} size={Math.max(16, W * (small ? 0.2 : 0.15))} style={{ position: 'absolute', top: Math.max(2, W * 0.02), right: Math.max(2, W * 0.02), filter: 'drop-shadow(0 2px 0 rgba(0,0,0,0.6))' }} />
          )}
        </div>
        {!mini && <div
          style={{
            font: `400 ${fs(small ? 0.12 : 0.1, 10)}px/1.02 ${BLACK}`,
            textTransform: 'uppercase',
            color: gold ? K : '#f2efe6',
            textShadow: gold ? 'none' : `2px 2px 0 ${K}`,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {owned ? card.name : '• • •'}
        </div>}
        {W >= 160 && (
          <div style={{ fontFamily: "Archivo, system-ui, sans-serif", fontSize: fs(0.058, 9), lineHeight: 1.28, color: gold ? '#3b2a00' : 'rgba(242,239,230,0.8)', height: '2.56em', overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>{owned ? card.about : ''}</div>
        )}
        {showRank && !mini && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: Math.max(2, W * 0.015) }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4, font: `700 ${fs(0.052, 8)}px/1 ${MONO}`, letterSpacing: '0.04em', textTransform: 'uppercase', color: gold ? K : L.accent }}>
              {!tiny && <span>{L.label}</span>}
              <span style={{ color: gold ? K : '#f2efe6' }}>★ {points}</span>
            </div>
            <RankBar points={points} height={Math.max(5, W * 0.045)} />
          </div>
        )}
      </div>
      {selected && (
        <div style={{ position: 'absolute', zIndex: 5, top: -Math.max(8, W * 0.06), left: '50%', transform: 'translateX(-50%)', padding: `2px ${Math.max(5, W * 0.04)}px`, border: `2px solid ${K}`, borderRadius: 4, background: '#f5c518', color: K, font: `700 ${fs(0.06, 9)}px ${MONO}`, letterSpacing: '0.08em', whiteSpace: 'nowrap', boxShadow: `0 2px 0 ${K}` }}>
          ✓
        </div>
      )}
    </div>
  );
}
