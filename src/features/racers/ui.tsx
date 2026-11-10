/* English Racers — shared UI bits: styles, buttons, segmented choices, colour dots. */
import { useRef, useSyncExternalStore } from 'react';
import { cn } from '@/lib/cn';
import { TOONS } from '@/features/toons3d/runtime';

export const CSS = `
.rc-root{font-family:Inter,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;color:#fff;background:#cfe6fb}
.rc-num{font-weight:900;font-variant-numeric:tabular-nums;-webkit-text-stroke:2.5px #10204a;paint-order:stroke fill;text-shadow:0 3px 0 #10204a}
.rc-panel{border-radius:22px;background:rgba(14,22,56,.78);backdrop-filter:blur(8px);box-shadow:0 10px 30px rgba(0,0,0,.25),inset 0 0 0 1.5px rgba(255,255,255,.12)}
.rc-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:18px;font-weight:900;transition:transform .08s}
.rc-btn:active{transform:translateY(3px) scale(.99)}
.rc-btn:disabled{opacity:.55}
.rc-pad{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.rc-scroll{overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent}
@keyframes rc-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes rc-spin{0%{transform:rotate(-8deg) scale(.9)}50%{transform:rotate(8deg) scale(1.05)}100%{transform:rotate(-8deg) scale(.9)}}
`;

export const initialToon = () => { try { const v = localStorage.getItem('racers:toon'); if (v && TOONS.some((x) => x.id === v)) return v; } catch { /* ignore */ } return TOONS[Math.floor(Math.random() * TOONS.length)].id; };
export const TIER = ['', '#4cc3ff', '#ff9a2e', '#d36bff'];
export const PLACE_COL = ['#ffd23f', '#e3e8f0', '#e59a5c'];

export function Btn({ tone = 'yellow', className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'yellow' | 'green' | 'white' | 'ghost' }) {
  const tones = {
    yellow: 'bg-[#ffd23f] text-[#2a1d00] shadow-[0_5px_0_#c79a00]',
    green: 'bg-[#2fd27a] text-[#062a15] shadow-[0_5px_0_#16924d]',
    white: 'bg-white text-[#10204a] shadow-[0_5px_0_#b9c6e6]',
    ghost: 'bg-white/14 text-white hover:bg-white/22',
  };
  return <button type="button" {...rest} className={cn('rc-btn h-12 px-5 text-[16px]', tones[tone], className)}>{children}</button>;
}
export function Toggle({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={on} className={cn('grid h-11 w-11 place-items-center rounded-2xl transition-colors', on ? 'bg-white text-[#10204a]' : 'bg-[#10204a]/55 text-white/60')}>{children}</button>;
}
export function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-white/8 p-1">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={value === o.id}
          className={cn('h-9 min-w-0 flex-1 truncate rounded-xl px-2 text-[13.5px] font-black transition-colors', value === o.id ? 'bg-white text-[#10204a]' : 'text-white/75 hover:bg-white/10')}>{o.label}</button>
      ))}
    </div>
  );
}

/** A number with − and + (laps, rivals). */
export function Stepper({ value, min, max, onChange, label }: { value: number; min: number; max: number; onChange: (v: number) => void; label: string }) {
  const b = 'grid h-9 w-10 shrink-0 place-items-center rounded-xl text-[20px] font-black leading-none text-white hover:bg-white/14 disabled:opacity-30';
  return (
    <div className="flex items-center gap-1 rounded-2xl bg-white/8 p-1" role="group" aria-label={label}>
      <button type="button" className={b} disabled={value <= min} onClick={() => onChange(value - 1)} aria-label={`${label} −`}>−</button>
      <div className="min-w-0 flex-1 text-center text-[16px] font-black tabular-nums" aria-live="polite">{value}</div>
      <button type="button" className={b} disabled={value >= max} onClick={() => onChange(value + 1)} aria-label={`${label} +`}>+</button>
    </div>
  );
}

export function Dot({ color, size = 12 }: { color: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full border border-black/30" style={{ background: color, width: size, height: size }} />;
}

const noSub = () => () => {};
/** Re-render when the live client changes. */
export function useClient(c: { subscribe: (f: () => void) => () => void } | null | undefined) {
  const v = useRef(0);
  useSyncExternalStore((f) => (c ? c.subscribe(() => { v.current++; f(); }) : noSub()), () => v.current);
}

