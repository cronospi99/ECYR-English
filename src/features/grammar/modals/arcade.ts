/**
 * Arcade layer of the Modal Verbs module: collected "rings" (one per section
 * or modal visited), best scores and the 8-bit sound effects of the original.
 */
import { useCallback } from 'react';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useProgress } from '@/store/progress';
import { RING_KEYS } from './data';

interface ArcadeState {
  rings: string[];
  sfx: boolean;
  best: Record<string, number>;
  explorationAwarded: boolean;
  /** Returns true when the ring is new. */
  collect: (key: string) => boolean;
  toggleSfx: () => void;
  setBest: (game: string, score: number) => void;
}

export const useModalsArcade = create<ArcadeState>()(
  persist(
    (set, get) => ({
      rings: [],
      sfx: true,
      best: {},
      explorationAwarded: false,
      collect: (key) => {
        if (!RING_KEYS.includes(key) || get().rings.includes(key)) return false;
        const rings = [...get().rings, key];
        set({ rings });
        if (rings.length >= RING_KEYS.length && !get().explorationAwarded) {
          set({ explorationAwarded: true });
          useProgress.getState().award({
            kind: 'topic',
            title: 'Modal Verbs · exploración completa',
            skill: 'grammar',
            xp: 15,
            score: 100,
            ref: 'grammar:modals:explore',
          });
        }
        return true;
      },
      toggleSfx: () => set({ sfx: !get().sfx }),
      setBest: (game, score) => set({ best: { ...get().best, [game]: Math.max(get().best[game] ?? 0, score) } }),
    }),
    { name: 'ecyr:modals-arcade', version: 1 },
  ),
);

/** Awards XP for a finished activity of this module. */
export function awardModals(tool: string, title: string, xp: number, score: number) {
  useProgress.getState().award({ kind: 'topic', title: `Modal Verbs · ${title}`, skill: 'grammar', xp, score, ref: `grammar:modals:${tool}` });
}

// ------------------------------------------------------------------- sound --

type Note = [freq: number, start: number, dur: number, slideTo?: number];
let ctx: AudioContext | null = null;

function audio() {
  if (typeof window === 'undefined') return null;
  try {
    if (!ctx) {
      const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function play(notes: Note[], type: OscillatorType, vol: number) {
  const ac = audio();
  if (!ac) return;
  const t0 = ac.currentTime;
  for (const [f, s, d, to] of notes) {
    const o = ac.createOscillator();
    const g = ac.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t0 + s);
    if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + s + d);
    g.gain.setValueAtTime(0.0001, t0 + s);
    g.gain.exponentialRampToValueAtTime(vol, t0 + s + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + s + d);
    o.connect(g);
    g.connect(ac.destination);
    o.start(t0 + s);
    o.stop(t0 + s + d + 0.03);
  }
}

const SOUNDS = {
  ring: () => play([[988, 0, 0.08], [1319, 0.07, 0.26]], 'sine', 0.11),
  select: () => play([[620, 0, 0.05], [880, 0.045, 0.09]], 'square', 0.04),
  dash: () => play([[260, 0, 0.16, 1400]], 'sawtooth', 0.035),
  right: () => play([[784, 0, 0.09], [988, 0.09, 0.09], [1319, 0.18, 0.3]], 'square', 0.05),
  wrong: () => play([[233, 0, 0.14], [165, 0.14, 0.3]], 'sawtooth', 0.05),
  clear: () => play([[523, 0, 0.1], [659, 0.1, 0.1], [784, 0.2, 0.1], [1047, 0.3, 0.4]], 'square', 0.05),
};
export type SoundName = keyof typeof SOUNDS;

export function useSfx() {
  const on = useModalsArcade((s) => s.sfx);
  return useCallback(
    (name: SoundName) => {
      if (on) SOUNDS[name]();
    },
    [on],
  );
}

/** Collects a ring and plays the matching sound (ring when new, select otherwise). */
export function useCollect() {
  const sfx = useSfx();
  const collect = useModalsArcade((s) => s.collect);
  return useCallback(
    (key: string, quiet = false) => {
      const isNew = collect(key);
      if (isNew) sfx('ring');
      else if (!quiet) sfx('select');
      return isNew;
    },
    [collect, sfx],
  );
}

export function shuffle<T>(a: readonly T[]) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
