import { useEffect, useId, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { tint } from '@/lib/color';
import type { Mark, TimelineModel } from './timeline';

/** Width of an element, kept up to date (the SVG is drawn in real pixels so text never shrinks). */
function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [w, setW] = useState(0);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setW(el.clientWidth);
    const ro = new ResizeObserver(([e]) => setW(Math.round(e!.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w] as const;
}

const SPRING = { type: 'spring', stiffness: 170, damping: 22 } as const;

/**
 * The animated timeline: past ← NOW → future. Marks keep their ids between
 * renders, so changing the sentence or the tense makes them glide and morph.
 */
export function TenseTimeline({ model, compact = false, className, label }: { model: TimelineModel; compact?: boolean; className?: string; label?: string }) {
  const [ref, width] = useWidth<HTMLDivElement>();
  const uid = useId().replace(/:/g, '');
  const W = Math.max(width, 260);
  const pad = compact ? 16 : 26;
  const px = (x: number) => pad + ((x + 1) / 2) * (W - 2 * pad);
  const lanes = Math.max(1, model.lanes);
  const laneGap = compact ? 26 : 34;
  const top = compact ? 22 : 34;
  const axisY = top + (lanes - 1) * laneGap + (compact ? 16 : 22);
  const laneY = (l: number) => axisY - l * laneGap;
  const tagRows = Math.max(0, ...model.marks.filter((m) => m.type === 'tag').map((m) => (m as Extract<Mark, { type: 'tag' }>).row + 1));
  const H = axisY + (compact ? 22 : 30) + tagRows * 17;
  const wave = (() => {
    // one long wave across the whole width; each span shows its slice through a clip
    let d = `M 0 0`;
    for (let x = 0; x <= W + 12; x += 6) d += ` L ${x} ${x % 12 === 0 ? -3.2 : 3.2}`;
    return d;
  })();

  return (
    <div ref={ref} className={className} role="img" aria-label={label ?? 'Línea del tiempo'}>
      {width > 0 && (
        <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="block overflow-visible select-none">
          {/* axis */}
          <line x1={pad - 8} x2={W - pad + 2} y1={axisY} y2={axisY} stroke="var(--label-3)" strokeWidth={2} strokeLinecap="round" />
          <path d={`M ${W - pad + 2} ${axisY - 5} L ${W - pad + 10} ${axisY} L ${W - pad + 2} ${axisY + 5} Z`} fill="var(--label-3)" />
          <text x={pad - 6} y={axisY + 16} fontSize={10.5} fontWeight={700} letterSpacing="0.06em" fill="var(--label-3)">
            PASADO
          </text>
          <text x={W - pad} y={axisY + 16} fontSize={10.5} fontWeight={700} letterSpacing="0.06em" fill="var(--label-3)" textAnchor="end">
            FUTURO
          </text>
          {/* NOW */}
          <line x1={px(0)} x2={px(0)} y1={top - 14} y2={axisY + 6} stroke="var(--red)" strokeWidth={1.5} strokeDasharray="3 3" />
          <rect x={px(0) - 26} y={top - 26} width={52} height={16} rx={8} fill={tint('var(--red)', 16)} />
          <text x={px(0)} y={top - 14.5} fontSize={10.5} fontWeight={800} letterSpacing="0.06em" fill="var(--red)" textAnchor="middle">
            AHORA
          </text>
          <AnimatePresence>
            {model.marks.map((m) => (
              <MarkView key={m.id} m={m} px={px} laneY={laneY} axisY={axisY} top={top} W={W} pad={pad} wave={wave} uid={uid} compact={compact} />
            ))}
          </AnimatePresence>
          <circle cx={px(0)} cy={axisY} r={4} fill="var(--red)" />
        </svg>
      )}
      {width === 0 && <div style={{ height: compact ? 90 : 130 }} />}
    </div>
  );
}

function MarkView({
  m,
  px,
  laneY,
  axisY,
  top,
  W,
  pad,
  wave,
  uid,
  compact,
}: {
  m: Mark;
  px: (x: number) => number;
  laneY: (l: number) => number;
  axisY: number;
  top: number;
  W: number;
  pad: number;
  wave: string;
  uid: string;
  compact: boolean;
}) {
  const fade = { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 }, transition: { duration: 0.25 } };
  switch (m.type) {
    case 'bar': {
      const y = laneY(m.lane);
      const a = px(m.x1);
      const b = px(m.x2);
      const point = m.style === 'point';
      const h = point ? 16 : m.style === 'faint' ? 4 : m.style === 'state' ? 10 : 14;
      const x = Math.min(a, b) - (point ? 8 : 0);
      const w = Math.max(Math.abs(b - a), 0) + (point ? 16 : 0);
      const fill = point ? m.color : m.style === 'faint' ? tint(m.color, 40) : tint(m.color, m.style === 'state' ? 26 : 22);
      const wavy = m.style === 'span' || m.style === 'perfectSpan';
      const clip = `${uid}-${m.id.replace(/[^a-z0-9]/gi, '')}`;
      return (
        <motion.g {...fade}>
          {wavy && (
            <defs>
              <clipPath id={clip}>
                <motion.rect initial={false} animate={{ x, width: Math.max(w, 1), y: y - h / 2, height: h }} transition={SPRING} />
              </clipPath>
            </defs>
          )}
          {m.lane > 0 && <motion.line initial={false} animate={{ x1: (a + b) / 2, x2: (a + b) / 2, y1: y + h / 2, y2: axisY }} transition={SPRING} stroke={m.color} strokeOpacity={0.35} strokeDasharray="2 3" />}
          <motion.rect
            initial={{ x, width: w, y: y - h / 2, height: h, rx: h / 2, opacity: 0 }}
            animate={{ x, width: w, y: y - h / 2, height: h, rx: h / 2, opacity: 1 }}
            transition={SPRING}
            fill={fill}
            stroke={point ? 'var(--card)' : m.color}
            strokeWidth={point ? 2.5 : 1.5}
            strokeOpacity={point ? 1 : m.style === 'faint' ? 0 : 0.9}
          />
          {wavy && (
            <g clipPath={`url(#${clip})`}>
              <path d={wave} transform={`translate(0 ${y})`} fill="none" stroke={m.color} strokeWidth={1.6} strokeLinejoin="round" />
            </g>
          )}
          {m.style === 'perfect' && <motion.line initial={false} animate={{ x1: a, x2: b, y1: y, y2: y }} transition={SPRING} stroke={m.color} strokeWidth={2.5} />}
          {m.arrow && (
            <motion.path initial={false} animate={{ x: b, y }} transition={SPRING} d="M -2 -8 L 9 0 L -2 8 Z" fill={m.color} />
          )}
          {m.badge !== undefined && (
            <motion.g initial={false} animate={{ x: point ? a : a + 9, y: y - h / 2 - 10 }} transition={SPRING}>
              <circle r={8} fill={m.color} />
              <text y={3.6} fontSize={10.5} fontWeight={800} textAnchor="middle" fill="#fff">
                {m.badge}
              </text>
            </motion.g>
          )}
        </motion.g>
      );
    }
    case 'dots': {
      const y = laneY(m.lane);
      return (
        <motion.g {...fade}>
          {Array.from({ length: m.count }, (_, i) => {
            const x = px(m.x1 + ((m.x2 - m.x1) * i) / Math.max(1, m.count - 1));
            return (
              <motion.circle
                key={i}
                initial={{ cx: x, cy: y, r: 0 }}
                animate={{ cx: x, cy: y, r: compact ? 4.5 : 5.5 }}
                transition={{ ...SPRING, delay: i * 0.03 }}
                fill={m.color} stroke="var(--card)" strokeWidth={1.5}
              />
            );
          })}
        </motion.g>
      );
    }
    case 'cross': {
      const y = laneY(m.lane);
      return (
        <motion.g {...fade} initial={{ opacity: 0, x: px(m.x), y }} animate={{ opacity: 1, x: px(m.x), y }} transition={SPRING}>
          <path d="M -5 -5 L 5 5 M 5 -5 L -5 5" stroke="var(--red)" strokeWidth={2.4} strokeLinecap="round" />
          <text y={-11} fontSize={10.5} fontWeight={700} textAnchor="middle" fill="var(--red)">
            {m.label}
          </text>
        </motion.g>
      );
    }
    case 'deadline': {
      const x = px(m.x);
      return (
        <motion.g {...fade} initial={{ opacity: 0, x }} animate={{ opacity: 1, x }} transition={SPRING}>
          <line x1={0} x2={0} y1={top - 6} y2={axisY} stroke={m.color} strokeWidth={2} />
          <path d={`M 0 ${top - 6} L 13 ${top - 1} L 0 ${top + 4} Z`} fill={m.color} />
          <text x={-4} y={top - 9} fontSize={11} fontWeight={700} textAnchor={x > W - 80 ? 'end' : 'start'} fill={m.color}>
            {m.label}
          </text>
        </motion.g>
      );
    }
    case 'link': {
      const x1 = px(m.x1);
      const x2 = px(m.x2);
      const y1 = laneY(m.lane1) - 10;
      const y2 = laneY(m.lane2) - 10;
      const cy = Math.min(y1, y2) - (compact ? 14 : 20);
      const d = `M ${x1} ${y1} Q ${(x1 + x2) / 2} ${cy} ${x2} ${y2}`;
      return (
        <motion.g {...fade}>
          <motion.path initial={{ d, pathLength: 0 }} animate={{ d, pathLength: 1 }} transition={{ ...SPRING, pathLength: { duration: 0.6 } }} fill="none" stroke={m.color} strokeWidth={1.6} strokeDasharray={m.dashed ? '4 4' : undefined} />
          <motion.path initial={false} animate={{ x: x2, y: y2 }} transition={SPRING} d="M -4 -7 L 0 0 L 4 -7" fill="none" stroke={m.color} strokeWidth={1.6} />
          {m.label && (
            <motion.text initial={false} animate={{ x: (x1 + x2) / 2, y: cy + 4 }} transition={SPRING} fontSize={10.5} fontWeight={700} textAnchor="middle" fill={m.color}>
              {m.label}
            </motion.text>
          )}
        </motion.g>
      );
    }
    case 'ref': {
      const y = laneY(m.lane);
      return (
        <motion.g {...fade} initial={{ opacity: 0, x: px(m.x), y }} animate={{ opacity: 1, x: px(m.x), y }} transition={SPRING}>
          <circle r={7} fill="var(--card)" stroke="var(--label-3)" strokeWidth={1.6} strokeDasharray="2.5 2.5" />
          <text y={-13} fontSize={10} fill="var(--label-3)" textAnchor="middle">
            {compact ? '' : m.label}
          </text>
        </motion.g>
      );
    }
    case 'cloud': {
      const y = laneY(m.lane);
      return (
        <motion.g {...fade} initial={{ opacity: 0, x: px(m.x), y }} animate={{ opacity: 1, x: px(m.x), y }} transition={SPRING}>
          <circle r={11} fill={tint(m.color, 18)} stroke={m.color} strokeWidth={1.5} strokeDasharray="3 3" />
          <text y={4} fontSize={12} fontWeight={800} textAnchor="middle" fill={m.color}>
            ?
          </text>
          <text y={-16} fontSize={10.5} fontWeight={700} textAnchor="middle" fill={m.color}>
            {m.label}
          </text>
        </motion.g>
      );
    }
    case 'tag': {
      const x = px(m.x);
      const half = Math.min(m.text.length * 3.2 + 6, (W - 2 * pad) / 2);
      const tx = Math.max(half + 2, Math.min(W - half - 2, x));
      const y = axisY + (compact ? 30 : 34) + m.row * 17;
      return (
        <motion.g {...fade}>
          <motion.line initial={false} animate={{ x1: x, x2: x, y1: axisY - 6, y2: axisY + 6 }} transition={SPRING} stroke="var(--purple)" strokeWidth={2} />
          <motion.line initial={false} animate={{ x1: x, x2: tx, y1: axisY + 7, y2: y - 11 }} transition={SPRING} stroke="var(--purple)" strokeOpacity={0.35} />
          <motion.text initial={false} animate={{ x: tx, y }} transition={SPRING} fontSize={11.5} fontWeight={600} textAnchor="middle" fill="var(--purple-ink)">
            {m.text}
          </motion.text>
        </motion.g>
      );
    }
  }
}
