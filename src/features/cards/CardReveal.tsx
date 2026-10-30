import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { TEACHERS } from './teachers';
import { rankOf, rankProgress, RANKS } from './api';
import { RANK_LOOK } from './ranks';
import { RankBar, RankEmblem, TeacherCardView } from './CardView';
import { playRankUp, playTick } from './sfx';
import { useGameFonts } from './fonts';

const K = '#0e1113';

function useViewport() {
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return vp;
}

/**
 * Full-screen reveal of a card. With `before` lower than the rank of `points`
 * it celebrates the rank-up (new frame, burst, chime); otherwise it just shows
 * the card. Tap anywhere to close.
 */
export function CardReveal({ cardId, points, before, onDone }: { cardId: string; points: number; before?: number; onDone: () => void }) {
  useGameFonts();
  const card = TEACHERS.find((c) => c.id === cardId);
  const vp = useViewport();
  const rank = rankOf(points);
  const old = before === undefined ? rank : rankOf(before);
  const up = RANKS.indexOf(rank) > RANKS.indexOf(old);
  const L = RANK_LOOK[rank];
  const bits = useMemo(
    () =>
      Array.from({ length: 34 }, (_, i) => {
        const a = (i / 34) * Math.PI * 2 + Math.random() * 0.4;
        const r = 160 + Math.random() * 260;
        return {
          dx: Math.cos(a) * r,
          dy: Math.sin(a) * r - 60,
          rot: Math.random() * 720 - 360,
          c: [L.accent, '#ffffff', L.gem[1], '#f5c518', L.deep][i % 5],
          d: 0.7 + Math.random() * 0.35,
        };
      }),
    [L],
  );
  useEffect(() => {
    if (up) playRankUp(rank);
    else playTick();
  }, [up, rank]);
  useEffect(() => {
    const on = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') onDone();
    };
    window.addEventListener('keydown', on);
    return () => window.removeEventListener('keydown', on);
  }, [onDone]);
  if (!card) return null;
  const w = Math.min(300, vp.w * 0.7, (vp.h - 230) * 0.68);
  return createPortal(
    <div
      className="ecyr-card-reveal"
      role="dialog"
      aria-label={up ? `Nuevo rango: ${L.label}` : card.name}
      onClick={onDone}
      style={{ background: `radial-gradient(circle at 50% 45%, color-mix(in srgb, ${L.accent} 45%, #0e1113) 0%, #0e1113 68%)` }}
    >
      <div className="ecyr-card-rays" style={{ backgroundImage: `repeating-conic-gradient(from 0deg, color-mix(in srgb, ${L.accent} 16%, transparent) 0 7deg, transparent 7deg 15deg)` }} />
      {up && <div className="ecyr-card-ring" style={{ color: L.accent }} />}
      {up &&
        bits.map((b, i) => (
          <span
            key={i}
            className="ecyr-card-burst"
            style={{ background: b.c, border: `2px solid ${K}`, animationDelay: `${b.d}s`, ['--dx' as string]: `${b.dx}px`, ['--dy' as string]: `${b.dy}px`, ['--rot' as string]: `${b.rot}deg` }}
          />
        ))}
      <div className="ecyr-card-kicker" style={{ background: L.accent }}>
        {up ? '¡Subiste de rango!' : 'Tu carta'}
      </div>
      <div className="ecyr-card-flip" key={rank}>
        <TeacherCardView card={card} points={points} width={w} />
      </div>
      {up && (
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 12 }}>
          <RankEmblem rank={old} size={34} style={{ opacity: 0.6 }} />
          <span style={{ font: "700 22px 'Space Mono', monospace", color: L.accent }}>→</span>
          <RankEmblem rank={rank} size={52} style={{ filter: `drop-shadow(0 0 12px ${L.glow})` }} />
        </div>
      )}
      <h2 className="ecyr-card-title" style={{ color: L.accent }}>{up ? L.label : card.name}</h2>
      <div className="ecyr-card-hint">Toca para continuar</div>
    </div>,
    document.body,
  );
}

/**
 * End-of-match panel: the card trained this match with its bar filling from
 * `before` to `before + gained`. Tap it to open the card (onOpen).
 */
export function CardGain({ cardId, before, gained, note, onOpen }: { cardId: string; before: number; gained: number; note?: string; onOpen?: () => void }) {
  useGameFonts();
  const card = TEACHERS.find((c) => c.id === cardId);
  const [shown, setShown] = useState(before);
  useEffect(() => {
    const t = setTimeout(() => setShown(before + gained), 450);
    return () => clearTimeout(t);
  }, [before, gained]);
  if (!card) return null;
  const p = rankProgress(shown);
  const L = RANK_LOOK[p.rank];
  return (
    <div
      onClick={onOpen}
      style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', border: `3px solid ${K}`, borderRadius: 8, background: 'linear-gradient(#2b3236,#1b2023)', boxShadow: `0 5px 0 ${K}`, color: '#f2efe6', cursor: onOpen ? 'pointer' : 'default', minWidth: 0 }}
    >
      <TeacherCardView card={card} points={shown} width={84} animate={false} />
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 6 }}>
        <div style={{ font: "700 11px 'Space Mono', monospace", letterSpacing: '0.14em', textTransform: 'uppercase', color: L.accent }}>Carta que entrenas</div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ font: "400 24px 'Archivo Black', sans-serif", textTransform: 'uppercase' }}>{card.name}</span>
          <span style={{ font: "400 22px 'Archivo Black', sans-serif", color: '#7bbf5a' }}>+{gained}</span>
        </div>
        <RankBar points={shown} height={14} />
        <div style={{ font: "700 12px 'Space Mono', monospace", color: 'rgba(242,239,230,0.7)' }}>
          ★ {shown} · {p.next ? `faltan ${p.left} para ${RANK_LOOK[p.next].label}` : '¡Rango máximo!'}
        </div>
        {note && <div style={{ fontSize: 12, color: 'rgba(242,239,230,0.6)' }}>{note}</div>}
      </div>
    </div>
  );
}
