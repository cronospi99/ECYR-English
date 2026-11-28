import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from 'react';
import type { Bi } from '@/lib/clueHunt/types';
import { img } from './art';
import './cluehunt.css';

/* Fraunces + Barlow only while a hunt screen is open (same idea as useGameFonts). */
const HREF = 'https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,500;0,9..144,700;0,9..144,800;1,9..144,500;1,9..144,600&family=Barlow:wght@400;500;600;700&display=swap';
let users = 0;
export function useHuntFonts() {
  useEffect(() => {
    users++;
    let link = document.querySelector<HTMLLinkElement>('link[data-hunt-fonts]');
    if (!link) { link = document.createElement('link'); link.rel = 'stylesheet'; link.href = HREF; link.dataset.huntFonts = '1'; document.head.appendChild(link); }
    return () => { users--; setTimeout(() => { if (users <= 0) document.querySelector('link[data-hunt-fonts]')?.remove(); }, 4000); };
  }, []);
}

/** Tells the boot intro (index.html) the page is up. */
export function useAppReady() { useEffect(() => { requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready'))); }, []); }

/** Re-render when a live host/client (anything with subscribe) changes. */
export function useLive(o: { subscribe: (f: () => void) => () => void } | null | undefined) {
  const v = useRef(0);
  useSyncExternalStore((f) => (o ? o.subscribe(() => { v.current++; f(); }) : () => {}), () => v.current);
}
/** Re-render every `ms` (clocks). */
export function useTick(ms = 500) { const [, s] = useState(0); useEffect(() => { const i = setInterval(() => s((n) => n + 1), ms); return () => clearInterval(i); }, [ms]); }

/** "English · Français": French is secondary. `stack` puts French on its own line. */
export function B({ en, fr, stack, className }: { en: ReactNode; fr: ReactNode; stack?: boolean; className?: string }) {
  return <span className={stack ? `ch-stack ${className ?? ''}` : className}>{en}<em className="ch-fr">{stack ? '' : ' · '}{fr}</em></span>;
}
export const BiText = ({ v, stack, className }: { v: Bi; stack?: boolean; className?: string }) => <B en={v.en} fr={v.fr} stack={stack} className={className} />;

export const fmtTime = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
export const fmtElapsed = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };

const BOKEH = Array.from({ length: 16 }, (_, i) => ({ l: (i * 37 + 7) % 100, s: 10 + ((i * 13) % 26), d: 9 + ((i * 7) % 11), de: -((i * 5) % 14) }));
export function Backdrop({ lanterns = true }: { lanterns?: boolean }) {
  return (
    <>
      <div className="ch-bokeh" aria-hidden>{BOKEH.map((b, i) => <i key={i} style={{ left: `${b.l}%`, width: b.s, height: b.s, animationDuration: `${b.d}s`, animationDelay: `${b.de}s` } as CSSProperties} />)}</div>
      {lanterns && <><div className="ch-lantern l" aria-hidden><img src={img('x_lanternG')} alt="" /></div><div className="ch-lantern r" aria-hidden><img src={img('x_lanternP')} alt="" /></div></>}
    </>
  );
}

/** A diya that is lit (golden glow) or not (dark). */
export function Diya({ lit, size = 44, className }: { lit: boolean; size?: number; className?: string }) {
  return <img src={img('diya')} alt="" aria-hidden width={size} height={size} className={`ch-flame ${lit ? 'on' : 'off'} ${className ?? ''}`} style={{ width: size, height: size * 0.82, objectFit: 'contain' }} />;
}

/** Fixed-size stage scaled to fit the window (projector: 1920×1080 / 1366×768, never scrolls). */
export function Stage({ children }: { children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    const fit = () => {
      const s = Math.min(innerWidth / 1920, innerHeight / 1080);
      const el = ref.current; if (!el) return;
      el.style.transform = `translate(${(innerWidth - 1920 * s) / 2}px,${(innerHeight - 1080 * s) / 2}px) scale(${s})`;
      el.style.left = '0'; el.style.top = '0';
    };
    fit(); addEventListener('resize', fit);
    return () => removeEventListener('resize', fit);
  }, []);
  return <div ref={ref} className="ch-stage">{children}</div>;
}

export function Toggle({ on, onChange, en, fr, disabled }: { on: boolean; onChange: (v: boolean) => void; en: string; fr: string; disabled?: boolean }) {
  return (
    <button type="button" role="switch" aria-checked={on} disabled={disabled} className="ch-toggle" onClick={() => onChange(!on)} style={disabled ? { opacity: 0.5 } : undefined}>
      <span className="ch-sw" /><B en={en} fr={fr} stack />
    </button>
  );
}
