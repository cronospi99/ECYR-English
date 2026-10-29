import { useEffect, useMemo, useRef, useState } from 'react';
import { useClass } from '@/features/teacher/useClass';

/** What every widget gets from its frame. */
export interface WidgetProps<T = Record<string, unknown>> {
  id: string;
  data: Partial<T>;
  set: (d: Partial<T>) => void;
  /** Topmost / last touched widget: receives Space. */
  focused: boolean;
  /** The gear in the header is on. */
  editing: boolean;
  setEditing: (v: boolean) => void;
}

let ctx: AudioContext | null = null;
function audio() {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Short synthesized tones (no audio files). */
export function tone(freq = 880, dur = 0.5, when = 0, vol = 0.25, type: OscillatorType = 'sine') {
  const c = audio();
  if (!c) return;
  try {
    const o = c.createOscillator();
    const g = c.createGain();
    const t = c.currentTime + when;
    o.type = type;
    o.frequency.value = freq;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.05);
  } catch {
    /* no audio */
  }
}

export const alarm = () => [0, 0.35, 0.7].forEach((w) => tone(880, 0.3, w, 0.3, 'square'));
export const chime = () => [0, 0.18].forEach((w, i) => tone(i ? 784 : 523, 0.6, w, 0.12));
export const tick = () => tone(1400, 0.04, 0, 0.05, 'triangle');
export const fanfare = () => [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.35, i * 0.11, 0.15, 'triangle'));

export function shuffle<T>(a: T[]): T[] {
  const r = [...a];
  for (let i = r.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [r[i], r[j]] = [r[j]!, r[i]!];
  }
  return r;
}

export const parseNames = (s: string) =>
  s
    .split(/[\n,;]+/)
    .map((x) => x.trim())
    .filter(Boolean)
    .slice(0, 200);

/** A re-render every `ms` while `on`; returns Date.now(). */
export function useNow(on = true, ms = 250) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!on) return;
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [on, ms]);
  return now;
}

const editable = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName));

/** Space on the focused widget (ignored while typing). */
export function useSpace(focused: boolean, fn: () => void) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!focused) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.code !== 'Space' && e.key !== ' ') return;
      if (editable(e.target)) return;
      e.preventDefault();
      ref.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [focused]);
}

export type NameSource = 'class' | 'custom';

/** Names from the teacher's roster or a pasted list. */
export function useNames(source: NameSource | undefined, custom: string | undefined) {
  const { students, loading } = useClass();
  const roster = useMemo(
    () =>
      (students ?? [])
        .map((s) => (s.profile.full_name || s.profile.email?.split('@')[0] || '').trim())
        .filter(Boolean),
    [students],
  );
  const list = useMemo(() => parseNames(custom ?? ''), [custom]);
  const src: NameSource = source ?? (roster.length ? 'class' : 'custom');
  return { names: src === 'class' ? roster : list, src, rosterCount: roster.length, loading };
}

export const PALETTE = ['var(--blue)', 'var(--orange)', 'var(--green)', 'var(--pink)', 'var(--purple)', 'var(--teal)', 'var(--yellow)', 'var(--red)', 'var(--indigo)', 'var(--mint)'];

/** Solid hex palette (for SVG fills that must not depend on the theme). */
export const HEX = ['#3b82f6', '#f97316', '#22c55e', '#ec4899', '#a855f7', '#14b8a6', '#eab308', '#ef4444', '#6366f1', '#06b6d4'];

export const pad = (n: number) => String(n).padStart(2, '0');
export function fmt(ms: number, tenths = false) {
  const t = Math.max(0, ms);
  const s = Math.floor(t / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const base = h ? `${h}:${pad(m)}:${pad(s % 60)}` : `${pad(m)}:${pad(s % 60)}`;
  return tenths ? `${base}.${Math.floor((t % 1000) / 100)}` : base;
}
