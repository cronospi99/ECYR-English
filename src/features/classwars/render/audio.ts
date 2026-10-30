/* Class Wars — synthesized sound effects (WebAudio, no audio files). */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = (() => { try { return localStorage.getItem('cw:mute') === '1'; } catch { return false; } })();
let lastAt: Record<string, number> = {};

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  try { localStorage.setItem('cw:mute', m ? '1' : '0'); } catch { /* ignore */ }
  if (master) master.gain.value = m ? 0 : 0.55;
}

/** Call from a user gesture (click / key) so browsers allow sound. */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      ctx = new AC();
      master = ctx.createGain();
      master.gain.value = muted ? 0 : 0.55;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp);
      comp.connect(ctx.destination);
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch { /* no audio */ }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number, delay = 0) {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime + delay;
  const o = ctx.createOscillator();
  const g = ctx.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(dur: number, vol = 0.3, filter = 1200, type: BiquadFilterType = 'lowpass', delay = 0) {
  if (!ctx || !master || muted) return;
  const t = ctx.currentTime + delay;
  const len = Math.floor(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = type; f.frequency.value = filter;
  const g = ctx.createGain();
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t);
}

function throttle(k: string, ms: number) {
  const now = performance.now();
  if ((lastAt[k] ?? 0) > now - ms) return false;
  lastAt[k] = now;
  return true;
}

export const sfx = {
  shoot(kind: number, vol = 1) {
    if (!throttle('shoot' + kind, 45)) return;
    if (kind === 1) { noise(0.12, 0.25 * vol, 900, 'bandpass'); tone(160, 0.1, 'triangle', 0.12 * vol, 90); }
    else if (kind === 2) tone(620, 0.08, 'sine', 0.12 * vol, 980);
    else if (kind === 3) { tone(220, 0.15, 'square', 0.08 * vol, 110); noise(0.1, 0.12 * vol, 700); }
    else if (kind === 4) tone(1200, 0.12, 'sawtooth', 0.06 * vol, 400);
    else if (kind === 6) tone(400, 0.2, 'triangle', 0.1 * vol, 700);
    else tone(880, 0.06, 'triangle', 0.08 * vol, 520);
  },
  hit(vol = 1) { if (throttle('hit', 40)) { noise(0.08, 0.3 * vol, 2200, 'bandpass'); tone(200, 0.08, 'square', 0.08 * vol, 120); } },
  hurt() { if (throttle('hurt', 80)) { tone(300, 0.15, 'sawtooth', 0.14, 140); noise(0.1, 0.2, 1500); } },
  block() { if (throttle('block', 80)) tone(1500, 0.1, 'sine', 0.12, 1900); },
  ko() { tone(520, 0.12, 'square', 0.12, 260); tone(260, 0.35, 'sawtooth', 0.12, 60, 0.1); noise(0.35, 0.25, 900, 'lowpass', 0.05); },
  koMe() { tone(400, 0.3, 'triangle', 0.18, 90); tone(200, 0.6, 'sine', 0.18, 50, 0.2); },
  boom(vol = 1) { if (throttle('boom', 60)) { noise(0.45, 0.45 * vol, 600); tone(110, 0.4, 'sine', 0.3 * vol, 40); } },
  gem(n = 0) { if (throttle('gem', 30)) tone(1100 + Math.min(n, 12) * 70, 0.09, 'triangle', 0.12, 1700 + n * 60); },
  box() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.16, 'triangle', 0.12, undefined, i * 0.06)); noise(0.2, 0.08, 4000, 'highpass'); },
  trap() { tone(300, 0.3, 'sawtooth', 0.14, 80); },
  correct(streak = 0) { const b = 660 + Math.min(streak, 8) * 30; tone(b, 0.12, 'triangle', 0.16); tone(b * 1.5, 0.22, 'triangle', 0.16, undefined, 0.09); },
  wrong() { tone(220, 0.18, 'square', 0.1, 180); tone(160, 0.3, 'square', 0.1, 120, 0.14); },
  buy() { [784, 988, 1319].forEach((f, i) => tone(f, 0.12, 'sine', 0.14, undefined, i * 0.05)); },
  tick() { tone(1000, 0.05, 'square', 0.08); },
  go() { tone(523, 0.12, 'triangle', 0.16); tone(784, 0.3, 'triangle', 0.16, undefined, 0.1); },
  spawn() { tone(300, 0.25, 'sine', 0.12, 900); },
  teleport() { tone(900, 0.2, 'sine', 0.1, 300); tone(300, 0.25, 'sine', 0.1, 900, 0.12); },
  power(ci: number) {
    if (!throttle('power', 60)) return;
    const f = 300 + (ci % 7) * 60;
    tone(f, 0.25, 'sawtooth', 0.08, f * 2.2);
    tone(f * 1.5, 0.3, 'triangle', 0.1, f * 3, 0.05);
  },
  whistle() { tone(2400, 0.35, 'sine', 0.12, 2600); tone(2600, 0.2, 'sine', 0.08, 2400, 0.1); },
  laser() { tone(1800, 0.3, 'sawtooth', 0.08, 300); },
  status() { if (throttle('status', 100)) tone(700, 0.18, 'triangle', 0.08, 350); },
  end() { [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, 0.3, 'triangle', 0.14, undefined, i * 0.12)); },
  click() { tone(800, 0.04, 'triangle', 0.06); },
};
