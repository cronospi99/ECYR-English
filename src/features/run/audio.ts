/* English Run — synthesized sound effects and a procedural music loop (Web Audio, no files). */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicBus: GainNode | null = null;
const load = (k: string, d: boolean) => { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch { return d; } };
const save = (k: string, v: boolean) => { try { localStorage.setItem(k, v ? '1' : '0'); } catch { /* ignore */ } };
export const prefs = { sfx: load('run:sfx', true), music: load('run:music', true), voice: load('run:voice', true) };
export function setPref(k: keyof typeof prefs, v: boolean) {
  prefs[k] = v;
  save('run:' + k, v);
  if (k === 'music') { if (v) startMusic(); else stopMusic(); }
}

function ac() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.8;
      const comp = ctx.createDynamicsCompressor();
      master.connect(comp).connect(ctx.destination);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.32; musicBus.connect(master);
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}
export function unlock() { ac(); }

function tone(f: number, at: number, dur: number, type: OscillatorType, vol: number, slide = 0, out?: AudioNode) {
  const c = ac(); if (!c || !master) return;
  const t = Math.max(c.currentTime, at);
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, f * slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out ?? master);
  o.start(t); o.stop(t + dur + 0.03);
}
let noiseBuf: AudioBuffer | null = null;
function noise(at: number, dur: number, vol: number, freq: number, type: BiquadFilterType = 'highpass', out?: AudioNode) {
  const c = ac(); if (!c || !master) return;
  if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const t = Math.max(c.currentTime, at);
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuf; f.type = type; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(out ?? master);
  s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.02);
}
const now = () => ac()?.currentTime ?? 0;

let coinStreak = 0, coinAt = 0;
export const sfx = {
  coin() {
    if (!prefs.sfx) return;
    const t = now();
    coinStreak = t - coinAt < 0.35 ? Math.min(coinStreak + 1, 10) : 0;
    coinAt = t;
    const f = 1320 * Math.pow(2, coinStreak / 24);
    tone(f, t, 0.09, 'square', 0.05); tone(f * 1.5, t + 0.05, 0.14, 'square', 0.045);
  },
  jump() { if (prefs.sfx) { tone(330, now(), 0.18, 'triangle', 0.14, 2.2); noise(now(), 0.12, 0.05, 2000); } },
  slide() { if (prefs.sfx) noise(now(), 0.35, 0.12, 900, 'bandpass'); },
  land() { if (prefs.sfx) { noise(now(), 0.08, 0.08, 400, 'lowpass'); tone(110, now(), 0.08, 'sine', 0.12, 0.6); } },
  lane() { if (prefs.sfx) noise(now(), 0.12, 0.05, 3000, 'bandpass'); },
  crash() { if (prefs.sfx) { noise(now(), 0.6, 0.35, 300, 'lowpass'); tone(160, now(), 0.5, 'sawtooth', 0.12, 0.3); } },
  bump() { if (prefs.sfx) { tone(220, now(), 0.14, 'square', 0.1, 0.6); noise(now(), 0.1, 0.12, 600, 'lowpass'); } },
  power() { if (prefs.sfx) [523, 659, 784, 1047, 1319].forEach((f, i) => tone(f, now() + i * 0.05, 0.16, 'triangle', 0.1)); },
  shield() { if (prefs.sfx) { tone(1200, now(), 0.4, 'sine', 0.12, 0.4); noise(now(), 0.3, 0.12, 1500); } },
  good() { if (prefs.sfx) [784, 988, 1175, 1568].forEach((f, i) => tone(f, now() + i * 0.07, 0.25, 'triangle', 0.13)); },
  bad() { if (prefs.sfx) { tone(330, now(), 0.22, 'sawtooth', 0.08, 0.7); tone(247, now() + 0.18, 0.3, 'sawtooth', 0.08, 0.7); } },
  horn() { if (prefs.sfx) { tone(392, now(), 0.5, 'sawtooth', 0.05); tone(494, now(), 0.5, 'sawtooth', 0.04); } },
  tick() { if (prefs.sfx) tone(1500, now(), 0.04, 'square', 0.04); },
  go() { if (prefs.sfx) [392, 523, 659].forEach((f, i) => tone(f, now() + i * 0.08, 0.2, 'triangle', 0.12)); },
};

/** Say the word (English voice) when a gate is answered. */
export function say(text: string) {
  if (!prefs.voice || typeof speechSynthesis === 'undefined') return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = 'en-US'; u.rate = 1.0; u.volume = 0.9;
    const v = speechSynthesis.getVoices().find((x) => x.lang.startsWith('en'));
    if (v) u.voice = v;
    speechSynthesis.speak(u);
  } catch { /* ignore */ }
}

/* ---------------------------------------------------------------- music */
// 128 BPM, 4 chords (vi–IV–I–V in C), drums + bass + plucked arpeggio; scheduled a bit ahead.
const BPM = 128, STEP = 60 / BPM / 4;
const CHORDS = [[57, 60, 64], [53, 57, 60], [48, 52, 55], [55, 59, 62]];
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0, nextT = 0;
export let musicRate = 1;
export function setMusicIntensity(k: number) { musicRate = k; }

function schedule() {
  const c = ac(); const bus = musicBus; if (!c || !bus) return;
  while (nextT < c.currentTime + 0.15) {
    const s = step % 16, bar = Math.floor(step / 16) % 4, ch = CHORDS[bar];
    if (s % 4 === 0) { tone(150, nextT, 0.18, 'sine', 0.5, 0.33, bus); }
    if (s === 4 || s === 12) noise(nextT, 0.16, 0.22, 1800, 'highpass', bus);
    if (s % 2 === 0) noise(nextT, 0.04, s % 4 === 2 ? 0.08 : 0.04, 8000, 'highpass', bus);
    if (s % 4 === 2 || s === 0) tone(midi(ch[0] - 24), nextT, STEP * 1.8, 'triangle', 0.22, 0, bus);
    if (musicRate > 0.5) { const n = ch[[0, 1, 2, 1][s % 4]] + (s >= 8 ? 12 : 0); tone(midi(n), nextT, STEP * 1.4, 'square', 0.035, 0, bus); }
    if (s === 0) ch.forEach((n) => tone(midi(n + 12), nextT, STEP * 14, 'sine', 0.025, 0, bus));
    nextT += STEP;
    step++;
  }
}
export function startMusic() {
  if (!prefs.music || timer) return;
  const c = ac(); if (!c) return;
  nextT = c.currentTime + 0.05;
  timer = setInterval(schedule, 40);
}
export function stopMusic() { if (timer) { clearInterval(timer); timer = null; } }
