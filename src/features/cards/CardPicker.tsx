import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { TEACHERS } from './teachers';
import { rankProgress, type CardPoints } from './api';
import { RANK_LOOK } from './ranks';
import { TeacherCardView } from './CardView';
import { useGameFonts } from './fonts';

const K = '#0e1113';

/**
 * "Carta que entrenas": full-screen chooser with all 25 characters and their
 * ranks. Tap a card to pick it. Used in the Impostor and Class Wars lobbies.
 */
export function CardPicker({ value, points, onPick, onClose, title = 'Carta que entrenas', subtitle = 'Los puntos de esta partida suben el rango de la carta que elijas.' }: {
  value: string;
  points: CardPoints;
  onPick: (id: string) => void;
  onClose: () => void;
  title?: string;
  subtitle?: string;
}) {
  useGameFonts();
  const [vp, setVp] = useState(() => ({ w: window.innerWidth, h: window.innerHeight }));
  useEffect(() => {
    const on = () => setVp({ w: window.innerWidth, h: window.innerHeight });
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('resize', on);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('resize', on);
      window.removeEventListener('keydown', key);
    };
  }, [onClose]);
  const gap = 12;
  const avail = Math.min(1100, vp.w) - 32;
  const cols = Math.max(3, Math.min(7, Math.floor((avail + gap) / (128 + gap))));
  const w = Math.floor(Math.min(150, (avail - (cols - 1) * gap) / cols));
  const cur = TEACHERS.find((c) => c.id === value);
  const cp = rankProgress(points[value] ?? 0);
  return createPortal(
    <div
      role="dialog"
      aria-label={title}
      style={{ position: 'fixed', inset: 0, zIndex: 110, display: 'flex', flexDirection: 'column', background: 'rgba(14,17,19,0.94)', backdropFilter: 'blur(6px)', color: '#f2efe6', fontFamily: 'Archivo, system-ui, sans-serif' }}
    >
      <div style={{ flex: 'none', display: 'flex', alignItems: 'center', gap: 12, padding: '14px 16px', borderBottom: `3px solid ${K}`, background: 'linear-gradient(#3b4349,#2b3236)' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ font: "400 clamp(20px,4vw,28px) 'Archivo Black', sans-serif", textTransform: 'uppercase', textShadow: `2px 2px 0 ${K}` }}>🃏 {title}</div>
          <div style={{ fontSize: 14, color: 'rgba(242,239,230,0.7)' }}>{subtitle}</div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Cerrar"
          style={{ flex: 'none', width: 44, height: 44, border: `3px solid ${K}`, borderRadius: 6, background: '#4a5359', color: '#f2efe6', boxShadow: `0 4px 0 ${K}`, font: "400 20px 'Archivo Black', sans-serif", cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>
      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', overscrollBehavior: 'contain', padding: '22px 16px 28px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, ${w}px)`, gap, justifyContent: 'center' }}>
          {TEACHERS.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onPick(c.id)}
              aria-pressed={c.id === value}
              aria-label={`${c.name}: ${points[c.id] ?? 0} puntos`}
              style={{ padding: 0, border: 0, background: 'transparent', cursor: 'pointer', borderRadius: 10, transition: 'transform .12s' }}
              onPointerEnter={(e) => (e.currentTarget.style.transform = 'translateY(-3px)')}
              onPointerLeave={(e) => (e.currentTarget.style.transform = '')}
            >
              <TeacherCardView card={c} points={points[c.id] ?? 0} width={w} index={i} animate={false} selected={c.id === value} />
            </button>
          ))}
        </div>
      </div>
      {cur && (
        <div style={{ flex: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, padding: '10px 16px calc(10px + env(safe-area-inset-bottom))', borderTop: `3px solid ${K}`, background: '#1b2023', font: "700 13px 'Space Mono', monospace" }}>
          <span style={{ color: RANK_LOOK[cp.rank].accent }}>{cur.name} · {RANK_LOOK[cp.rank].label} · ★ {points[value] ?? 0}</span>
          <button
            type="button"
            onClick={onClose}
            style={{ border: `3px solid ${K}`, borderRadius: 5, background: '#f5c518', color: K, boxShadow: `0 4px 0 ${K}`, padding: '9px 18px', font: "800 13px Archivo, sans-serif", letterSpacing: '0.08em', textTransform: 'uppercase', cursor: 'pointer' }}
          >
            Listo
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
