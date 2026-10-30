/* Synthesized sound effects (Web Audio) — no audio files to download. */
import { load, save } from "../shared/storage";

let ctx: AudioContext | null = null;
let muted = load<boolean>("impostor.muted", false);
let sirenNodes: { stop: () => void } | null = null;

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume().catch(() => {});
    return ctx;
  } catch {
    return null;
  }
}

/* call from any user gesture so phones allow audio later */
export function unlockAudio() {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator(), g = c.createGain();
  g.gain.value = 0;
  o.connect(g).connect(c.destination);
  o.start();
  o.stop(c.currentTime + 0.01);
}

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  save("impostor.muted", m);
  if (m) stopSiren();
}

type Tone = { f: number; f2?: number; t?: number; d: number; type?: OscillatorType; v?: number; delay?: number };

function tone(c: AudioContext, { f, f2, d, type = "square", v = 0.18, delay = 0 }: Tone) {
  const t0 = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(f, t0);
  if (f2) o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t0 + d);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(v, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  o.connect(g).connect(c.destination);
  o.start(t0);
  o.stop(t0 + d + 0.05);
}

function noise(c: AudioContext, d: number, { v = 0.25, delay = 0, hp = 400, lp = 6000, sweep = 0 }: { v?: number; delay?: number; hp?: number; lp?: number; sweep?: number } = {}) {
  const t0 = c.currentTime + delay;
  const len = Math.ceil(c.sampleRate * d);
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const h = c.createBiquadFilter(); h.type = "highpass"; h.frequency.value = hp;
  const l = c.createBiquadFilter(); l.type = "lowpass"; l.frequency.setValueAtTime(lp, t0);
  if (sweep) l.frequency.exponentialRampToValueAtTime(sweep, t0 + d);
  const g = c.createGain();
  g.gain.setValueAtTime(v, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
  src.connect(h).connect(l).connect(g).connect(c.destination);
  src.start(t0);
}

export const sfx = {
  kill() {
    const c = ac(); if (!c) return;
    noise(c, 0.18, { v: 0.5, hp: 200, lp: 5000, sweep: 300 });
    tone(c, { f: 1400, f2: 90, d: 0.35, type: "sawtooth", v: 0.22 });
    tone(c, { f: 70, f2: 40, d: 0.35, type: "sine", v: 0.5, delay: 0.08 });
  },
  killed() {
    const c = ac(); if (!c) return;
    tone(c, { f: 900, f2: 60, d: 0.7, type: "sawtooth", v: 0.2 });
    noise(c, 0.5, { v: 0.35, hp: 100, lp: 3000, sweep: 200, delay: 0.05 });
    [0, 0.12, 0.24].forEach((dl, i) => tone(c, { f: 1600 + i * 300, d: 0.12, type: "triangle", v: 0.08, delay: 0.5 + dl }));
  },
  task() {
    const c = ac(); if (!c) return;
    [523, 659, 784, 1047].forEach((f, i) => tone(c, { f, d: 0.16, type: "triangle", v: 0.2, delay: i * 0.08 }));
  },
  step() {
    const c = ac(); if (!c) return;
    tone(c, { f: 880, d: 0.07, type: "triangle", v: 0.12 });
  },
  wrong() {
    const c = ac(); if (!c) return;
    tone(c, { f: 160, f2: 110, d: 0.25, type: "square", v: 0.15 });
  },
  report() {
    const c = ac(); if (!c) return;
    for (let i = 0; i < 3; i++) { tone(c, { f: 740, d: 0.18, type: "square", v: 0.18, delay: i * 0.36 }); tone(c, { f: 554, d: 0.18, type: "square", v: 0.18, delay: i * 0.36 + 0.18 }); }
  },
  meeting() {
    const c = ac(); if (!c) return;
    [0, 0.25, 0.5].forEach((dl) => { tone(c, { f: 1318, d: 0.5, type: "sine", v: 0.25, delay: dl }); tone(c, { f: 1760, d: 0.4, type: "sine", v: 0.1, delay: dl }); });
  },
  vent() {
    const c = ac(); if (!c) return;
    noise(c, 0.35, { v: 0.3, hp: 300, lp: 4000, sweep: 400 });
    tone(c, { f: 220, f2: 80, d: 0.25, type: "square", v: 0.1 });
  },
  sabotage() {
    const c = ac(); if (!c) return;
    tone(c, { f: 400, f2: 60, d: 0.8, type: "sawtooth", v: 0.2 });
  },
  fixed() {
    const c = ac(); if (!c) return;
    tone(c, { f: 200, f2: 900, d: 0.4, type: "sawtooth", v: 0.12 });
    tone(c, { f: 1047, d: 0.25, type: "triangle", v: 0.15, delay: 0.38 });
  },
  vote() {
    const c = ac(); if (!c) return;
    tone(c, { f: 600, d: 0.08, type: "square", v: 0.12 });
    tone(c, { f: 900, d: 0.1, type: "square", v: 0.12, delay: 0.07 });
  },
  pop() {
    const c = ac(); if (!c) return;
    tone(c, { f: 500, f2: 1200, d: 0.12, type: "sine", v: 0.15 });
  },
  eject() {
    const c = ac(); if (!c) return;
    noise(c, 1.6, { v: 0.25, hp: 200, lp: 3000, sweep: 150 });
    tone(c, { f: 600, f2: 80, d: 1.6, type: "sine", v: 0.15 });
  },
  win() {
    const c = ac(); if (!c) return;
    [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tone(c, { f, d: 0.22, type: "triangle", v: 0.2, delay: i * 0.13 }));
  },
  lose() {
    const c = ac(); if (!c) return;
    [392, 370, 349, 262].forEach((f, i) => tone(c, { f, d: 0.35, type: "sawtooth", v: 0.12, delay: i * 0.28 }));
  },
  reveal(imp: boolean) {
    const c = ac(); if (!c) return;
    if (imp) [196, 233, 147].forEach((f, i) => tone(c, { f, d: 0.6, type: "sawtooth", v: 0.15, delay: i * 0.3 }));
    else [392, 523, 659].forEach((f, i) => tone(c, { f, d: 0.4, type: "triangle", v: 0.18, delay: i * 0.18 }));
  }
};

/* looping alarm while the fire-alarm sabotage is active */
export function startSiren() {
  const c = ac();
  if (!c || sirenNodes) return;
  const o = c.createOscillator(), lfo = c.createOscillator(), lg = c.createGain(), g = c.createGain();
  o.type = "sawtooth";
  o.frequency.value = 700;
  lfo.frequency.value = 1.6;
  lg.gain.value = 260;
  lfo.connect(lg).connect(o.frequency);
  g.gain.value = 0.05;
  o.connect(g).connect(c.destination);
  o.start();
  lfo.start();
  sirenNodes = { stop: () => { try { o.stop(); lfo.stop(); } catch { /* ignore */ } } };
}
export function stopSiren() {
  sirenNodes?.stop();
  sirenNodes = null;
}
