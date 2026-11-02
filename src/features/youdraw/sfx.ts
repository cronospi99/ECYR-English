/* You Draw — synthesized sounds (Web Audio, no files). Phones only play sound after a tap. */
let ctx: AudioContext | null = null;
let muted = (() => { try { return localStorage.getItem('yd:muted') === '1'; } catch { return false; } })();

function ac(): AudioContext | null {
  if (muted) return null;
  try {
    if (!ctx) ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}

export const isMuted = () => muted;
export function setMuted(m: boolean) { muted = m; try { localStorage.setItem('yd:muted', m ? '1' : '0'); } catch { /* ignore */ } }
/** Call from a tap so phones allow sound later. */
export function unlockAudio() { ac(); }

function tone(f: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.18, slide = 0) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(f * slide, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t); o.stop(t + dur + 0.02);
}

function noise(at: number, dur: number, vol = 0.12, hp = 800) {
  const c = ac(); if (!c) return;
  const t = c.currentTime + at;
  const buf = c.createBuffer(1, Math.ceil(c.sampleRate * dur), c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = buf; f.type = 'highpass'; f.frequency.value = hp; g.gain.value = vol;
  s.connect(f).connect(g).connect(c.destination);
  s.start(t);
}

export const sfx = {
  ok() { [660, 880, 1320].forEach((f, i) => tone(f, i * 0.07, 0.22, 'triangle', 0.16)); },
  close() { tone(520, 0, 0.12, 'square', 0.06); tone(620, 0.1, 0.14, 'square', 0.06); },
  tick() { tone(1200, 0, 0.05, 'square', 0.05); },
  hop() { tone(900 + Math.random() * 200, 0, 0.04, 'triangle', 0.07); },
  land() { tone(392, 0, 0.12, 'triangle', 0.16); tone(523, 0.09, 0.12, 'triangle', 0.16); tone(784, 0.18, 0.3, 'triangle', 0.18); },
  turn() { tone(587, 0, 0.12, 'sine', 0.2); tone(880, 0.12, 0.25, 'sine', 0.2); },
  end() { tone(523, 0, 0.18, 'triangle', 0.16); tone(392, 0.16, 0.18, 'triangle', 0.16); tone(262, 0.32, 0.4, 'triangle', 0.18); },
  start() { [392, 523, 659, 784].forEach((f, i) => tone(f, i * 0.09, 0.2, 'triangle', 0.15)); },
  /** Drum roll for the black screen before the podium. */
  roll(secs: number) { for (let t = 0; t < secs; t += 0.045) noise(t, 0.05, 0.05 + 0.1 * (t / secs), 1500); },
  fanfare() {
    noise(0, 0.5, 0.2, 400);
    [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.42]].forEach(([f, t]) => { tone(f, t, 0.5, 'sawtooth', 0.07); tone(f / 2, t, 0.5, 'triangle', 0.1); });
    [1047, 1319, 1568].forEach((f) => tone(f, 0.9, 1.2, 'triangle', 0.08));
  },
};
