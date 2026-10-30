/* Synthesized card sounds (WebAudio, no audio files). Silent if audio is blocked. */
import type { CardRank } from './api';

let ctx: AudioContext | null = null;
function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!C) return null;
      ctx = new C();
    }
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(c: AudioContext, f: number, at: number, dur: number, type: OscillatorType, vol: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, at);
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(vol, at + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(c.destination);
  o.start(at);
  o.stop(at + dur + 0.05);
}

const NOTES: Record<CardRank, number[]> = {
  bronze: [392, 494, 587],
  silver: [440, 554, 659, 880],
  gold: [523, 659, 784, 1047, 1319],
  diamond: [587, 740, 880, 1175, 1480, 1760, 2349],
};

export function playRankUp(rank: CardRank) {
  const c = ac();
  if (!c) return;
  const t0 = c.currentTime + 0.05;
  NOTES[rank].forEach((f, i) => {
    tone(c, f, t0 + i * 0.09, 0.5, 'triangle', 0.12);
    tone(c, f * 2, t0 + i * 0.09, 0.25, 'sine', 0.04);
  });
  if (rank === 'diamond' || rank === 'gold') {
    for (let i = 0; i < 10; i++) tone(c, 2400 + Math.random() * 1800, t0 + 0.55 + i * 0.05, 0.12, 'sine', 0.035);
  }
}

export function playTick() {
  const c = ac();
  if (c) tone(c, 880, c.currentTime + 0.01, 0.07, 'square', 0.03);
}
