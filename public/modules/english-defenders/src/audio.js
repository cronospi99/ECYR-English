// Efectos de sonido sintetizados con WebAudio (sin archivos externos).
let ctx = null;
let muted = false;

function ac() {
  if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setMuted(m) { muted = m; }
export function isMuted() { return muted; }

function tone(freq, dur, type = 'sine', vol = 0.2, when = 0, slideTo = null) {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime + when;
  const o = a.createOscillator();
  const g = a.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t0);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  o.connect(g).connect(a.destination);
  o.start(t0); o.stop(t0 + dur + 0.05);
}

function noiseBurst(dur = 0.15, vol = 0.15, when = 0) {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime + when;
  const buf = a.createBuffer(1, a.sampleRate * dur, a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = a.createBufferSource();
  src.buffer = buf;
  const g = a.createGain();
  g.gain.setValueAtTime(vol, t0);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  const f = a.createBiquadFilter();
  f.type = 'lowpass'; f.frequency.value = 1200;
  src.connect(f).connect(g).connect(a.destination);
  src.start(t0);
}

// Gemido de zombie: dos sierras graves desafinadas con vibrato + filtro + "aliento"
function groanSynth() {
  if (muted) return;
  const a = ac();
  const t0 = a.currentTime;
  const dur = 0.9 + Math.random() * 0.7;
  const base = 62 + Math.random() * 26;
  const f = a.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.setValueAtTime(320, t0);
  f.frequency.linearRampToValueAtTime(180, t0 + dur);
  const g = a.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.16, t0 + dur * 0.25);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  f.connect(g).connect(a.destination);
  const lfo = a.createOscillator();
  const lfoG = a.createGain();
  lfo.frequency.value = 4.2 + Math.random() * 2;
  lfoG.gain.value = base * 0.09;
  lfo.connect(lfoG);
  for (const det of [0, 4 + Math.random() * 3]) {
    const o = a.createOscillator();
    o.type = 'sawtooth';
    o.frequency.setValueAtTime(base + det, t0);
    o.frequency.linearRampToValueAtTime(base * 0.82 + det, t0 + dur);
    lfoG.connect(o.frequency);
    o.connect(f);
    o.start(t0); o.stop(t0 + dur + 0.05);
  }
  lfo.start(t0); lfo.stop(t0 + dur + 0.05);
  noiseBurst(dur * 0.5, 0.03, dur * 0.3);
}

export const SFX = {
  groan: groanSynth,
  plant() { tone(240, 0.09, 'triangle', 0.25); tone(320, 0.1, 'triangle', 0.2, 0.05); },
  shoot() { tone(520, 0.07, 'square', 0.06, 0, 320); },
  hit() { noiseBurst(0.06, 0.1); tone(180, 0.05, 'square', 0.08); },
  chomp() { tone(120, 0.12, 'sawtooth', 0.12, 0, 70); },
  sun() { tone(880, 0.08, 'sine', 0.18); tone(1320, 0.12, 'sine', 0.15, 0.06); },
  correct() { [523, 659, 784, 1046].forEach((f, i) => tone(f, 0.14, 'triangle', 0.18, i * 0.08)); },
  wrong() { tone(220, 0.25, 'sawtooth', 0.14, 0, 160); tone(160, 0.3, 'sawtooth', 0.1, 0.1, 110); },
  wave() { tone(196, 0.4, 'sawtooth', 0.14, 0, 196); tone(147, 0.5, 'sawtooth', 0.12, 0.2); },
  zombieDie() { noiseBurst(0.25, 0.14); tone(140, 0.3, 'sawtooth', 0.1, 0, 60); },
  mower() { tone(600, 0.5, 'square', 0.1, 0, 1200); noiseBurst(0.4, 0.12); },
  boom() { noiseBurst(0.5, 0.3); tone(80, 0.5, 'sine', 0.3, 0, 40); },
  victory() { [523, 659, 784, 1046, 784, 1046, 1318].forEach((f, i) => tone(f, 0.22, 'triangle', 0.2, i * 0.14)); },
  defeat() { [392, 370, 349, 330, 262].forEach((f, i) => tone(f, 0.3, 'sawtooth', 0.14, i * 0.22)); },
  streak() { [659, 784, 988, 1318].forEach((f, i) => tone(f, 0.1, 'square', 0.1, i * 0.06)); },
  click() { tone(660, 0.05, 'triangle', 0.12); },
  shovel() { noiseBurst(0.12, 0.15); tone(300, 0.1, 'triangle', 0.12, 0, 150); },
};
