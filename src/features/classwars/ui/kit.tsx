/* Class Wars — shared UI pieces: chunky game buttons, panels, the animated teacher toon. */
import { useEffect, useRef, useState, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { TeacherToon } from '@/features/cards/TeacherToon';
import { TEACHERS } from '@/features/cards/teachers';
import { cn } from '@/lib/cn';
import { sfx, unlockAudio } from '../render/audio';

export const CW_CSS = `
.cw-root{font-family:Inter,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;color:#fff;background:radial-gradient(120% 90% at 50% 0%,#2a3577 0%,#161c45 55%,#0e1230 100%)}
.cw-title{font-weight:900;letter-spacing:-0.02em;text-shadow:0 3px 0 rgba(0,0,0,.35)}
@keyframes cw-bob{0%,100%{transform:translateY(0) scale(1,1)}50%{transform:translateY(-4%) scale(1.02,.98)}}
.cw-bob{animation:cw-bob 1.6s ease-in-out infinite;transform-origin:50% 100%}
@keyframes cw-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
.cw-float{animation:cw-float 3s ease-in-out infinite}
@keyframes cw-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
.cw-pulse{animation:cw-pulse 1s ease-in-out infinite}
@keyframes cw-shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-10px)}40%{transform:translateX(9px)}60%{transform:translateX(-6px)}80%{transform:translateX(4px)}}
.cw-shake{animation:cw-shake .45s ease-in-out}
@keyframes cw-pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.08);opacity:1}100%{transform:scale(1)}}
.cw-pop{animation:cw-pop .35s cubic-bezier(.2,.9,.3,1.2) both}
@keyframes cw-stripes{from{background-position:0 0}to{background-position:96px 0}}
.cw-lawn{background:repeating-linear-gradient(90deg,#4fcd4c 0 48px,#45c043 48px 96px);animation:cw-stripes 6s linear infinite}
.cw-noselect{user-select:none;-webkit-user-select:none;-webkit-touch-callout:none;touch-action:none}
.cw-scroll::-webkit-scrollbar{width:8px;height:8px}.cw-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.2);border-radius:8px}
`;

type Tone = 'yellow' | 'blue' | 'green' | 'red' | 'purple' | 'ghost' | 'white';
const TONES: Record<Tone, string> = {
  yellow: 'bg-[#ffd23f] text-[#2a1d00] shadow-[0_5px_0_#c79a00] hover:brightness-105',
  blue: 'bg-[#3d7bff] text-white shadow-[0_5px_0_#2a52b8] hover:brightness-110',
  green: 'bg-[#2fc25b] text-white shadow-[0_5px_0_#1d8a3e] hover:brightness-110',
  red: 'bg-[#ff4d5e] text-white shadow-[0_5px_0_#b8283a] hover:brightness-110',
  purple: 'bg-[#8f6bff] text-white shadow-[0_5px_0_#5b3fd6] hover:brightness-110',
  ghost: 'bg-white/10 text-white shadow-[0_4px_0_rgba(0,0,0,.25)] hover:bg-white/15',
  white: 'bg-white text-[#1b2350] shadow-[0_5px_0_#b9c2e6] hover:brightness-105',
};

export function Btn({ tone = 'yellow', big, className, children, onClick, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone; big?: boolean }) {
  return (
    <button
      type="button"
      {...rest}
      onClick={(e) => { unlockAudio(); sfx.click(); onClick?.(e); }}
      className={cn(
        'inline-flex select-none items-center justify-center gap-2 rounded-2xl font-extrabold transition-[transform,filter,box-shadow] duration-100 active:translate-y-[4px] active:shadow-none disabled:pointer-events-none disabled:opacity-45',
        big ? 'h-14 px-7 text-[19px]' : 'h-11 px-5 text-[16px]',
        TONES[tone],
        className,
      )}
    >
      {children}
    </button>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('rounded-[22px] border-2 border-white/10 bg-[#202a63]/85 shadow-[0_10px_30px_rgba(0,0,0,.35)] backdrop-blur', className)}>{children}</div>;
}

export function Diamond({ size = 22, className }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="-12 -14 24 26" className={className} aria-hidden>
      <path d="M0 -12 L10 -3 L0 10 L-10 -3 Z" fill="#2fd3e8" stroke="#10283a" strokeWidth={2.2} strokeLinejoin="round" />
      <path d="M0 -12 L4.5 -3 L0 2 L-4.5 -3 Z" fill="#c9f7ff" opacity={0.9} />
      <path d="M-10 -3 L10 -3" stroke="#10283a" strokeWidth={1.2} opacity={0.5} />
    </svg>
  );
}

/** The teacher toon in the DOM. `live` animates breathing/blinking (use for one or two at a time). */
export function Toon({ ci, size = 120, live = false, className, flip }: { ci: number; size?: number; live?: boolean; className?: string; flip?: boolean }) {
  const [t, setT] = useState(1 + ci * 0.37);
  const raf = useRef(0);
  useEffect(() => {
    if (!live) return;
    let last = 0;
    const loop = (ms: number) => {
      if (ms - last > 50) { setT(ms / 1000); last = ms; }
      raf.current = requestAnimationFrame(loop);
    };
    raf.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf.current);
  }, [live]);
  const look = TEACHERS[ci]?.look ?? TEACHERS[0].look;
  return (
    <svg viewBox="-72 -196 144 210" width={size} height={(size * 210) / 144} className={className} style={flip ? { transform: 'scaleX(-1)' } : undefined} aria-hidden>
      <TeacherToon look={look} t={t} />
    </svg>
  );
}

export function Loading({ text = 'Cargando…' }: { text?: string }) {
  return (
    <div className="flex flex-col items-center gap-4 py-10">
      <div className="h-12 w-12 animate-spin rounded-full border-[5px] border-white/15 border-t-[#ffd23f]" />
      <p className="text-[15px] font-bold text-white/70">{text}</p>
    </div>
  );
}

export function fmtTime(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function useMobile() {
  const [m, setM] = useState(() => typeof window !== 'undefined' && (matchMedia('(pointer: coarse)').matches || window.innerWidth < 700));
  useEffect(() => {
    const f = () => setM(matchMedia('(pointer: coarse)').matches || window.innerWidth < 700);
    window.addEventListener('resize', f);
    return () => window.removeEventListener('resize', f);
  }, []);
  return m;
}

/** Re-render only when key() changes (sessions bump on every snapshot; screens care about phases). */
export function useSessionKey(x: { subscribe: (f: () => void) => () => void } | null, key: () => string) {
  const [, f] = useState(0);
  const last = useRef('');
  const kf = useRef(key);
  kf.current = key;
  useEffect(() => {
    if (!x) return;
    last.current = kf.current();
    return x.subscribe(() => {
      const k = kf.current();
      if (k !== last.current) { last.current = k; f((n) => n + 1); }
    });
  }, [x]);
}
