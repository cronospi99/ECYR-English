/* Short WebAudio sound effects and an optional loop for the projector, in the style of the Bingo's
   synthesized audio (sitar pluck = Karplus-Strong, bells, tabla). No audio files. */
let C: AudioContext | null = null;
let master: GainNode, sfxBus: GainNode, musicBus: GainNode, verb: ConvolverNode, noiseBuf: AudioBuffer;
let muted = (() => { try { return localStorage.getItem('hunt:sfx') === '0'; } catch { return false; } })();
export const isMuted = () => muted;
export function setMuted(m: boolean) { muted = m; try { localStorage.setItem('hunt:sfx', m ? '0' : '1'); } catch { /* ignore */ } if (m) stopMusic(); }

const mtof = (m: number) => 440 * 2 ** ((m - 69) / 12);
function ac(): AudioContext | null {
  if (!C) {
    const A = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!A) return null;
    C = new A();
    master = C.createGain(); master.gain.value = 0.85;
    const comp = C.createDynamicsCompressor(); comp.threshold.value = -12; comp.ratio.value = 4;
    master.connect(comp); comp.connect(C.destination);
    sfxBus = C.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    musicBus = C.createGain(); musicBus.gain.value = 0.6; musicBus.connect(master);
    verb = C.createConvolver();
    const L = C.sampleRate * 1.8, ir = C.createBuffer(2, L, C.sampleRate);
    for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < L; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / L) ** 3; }
    verb.buffer = ir;
    const vg = C.createGain(); vg.gain.value = 0.3; verb.connect(vg); vg.connect(master);
    noiseBuf = C.createBuffer(1, C.sampleRate, C.sampleRate);
    const nd = noiseBuf.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  }
  if (C.state === 'suspended') void C.resume().catch(() => {});
  return C;
}
/** Call from a user gesture so iOS/Chrome allow sound. */
export const unlockAudio = () => { ac(); };

const env = (g: GainNode, t: number, a: number, peak: number, dec: number) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + a + dec); };
function tone(t: number, type: OscillatorType, f0: number, f1: number, dur: number, peak: number, dest: AudioNode) {
  const o = C!.createOscillator(), g = C!.createGain();
  o.type = type; o.frequency.setValueAtTime(f0, t);
  if (f1) o.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.6);
  env(g, t, 0.004, peak, dur); o.connect(g); g.connect(dest); o.start(t); o.stop(t + dur + 0.05);
}
function noise(t: number, dur: number, type: BiquadFilterType, f: number, q: number, peak: number, dec: number, dest: AudioNode) {
  const s = C!.createBufferSource(); s.buffer = noiseBuf;
  const fl = C!.createBiquadFilter(); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
  const g = C!.createGain(); env(g, t, 0.002, peak, dec);
  s.connect(fl); fl.connect(g); g.connect(dest); s.start(t, Math.random() * 0.5); s.stop(t + dur);
}
const ks: Record<number, AudioBuffer> = {};
function ksBuf(m: number) {
  if (ks[m]) return ks[m]!;
  const sr = C!.sampleRate, N = Math.round(sr / mtof(m)), len = (sr * 1.4) | 0, b = C!.createBuffer(1, len, sr), d = b.getChannelData(0), r = new Float32Array(N);
  for (let i = 0; i < N; i++) r[i] = Math.random() * 2 - 1;
  let p = 0;
  for (let i = 0; i < len; i++) { const nx = (p + 1) % N, v = r[p]!; d[i] = v + 0.35 * Math.tanh(4 * v) * (i < sr * 0.6 ? 1 : 0); r[p] = 0.4985 * (v + r[nx]!); p = nx; }
  return (ks[m] = b);
}
function sitar(t: number, m: number, v: number, dest: AudioNode) {
  const s = C!.createBufferSource(); s.buffer = ksBuf(m);
  const f = C!.createBiquadFilter(); f.type = 'peaking'; f.frequency.value = 2400; f.gain.value = 8; f.Q.value = 2;
  const g = C!.createGain(); g.gain.value = v; s.connect(f); f.connect(g); g.connect(dest);
  const sd = C!.createGain(); sd.gain.value = 0.4; g.connect(sd); sd.connect(verb); s.start(t); s.stop(t + 1.4);
}
function bell(t: number, f: number, v: number, dest: AudioNode) { [1, 2.76, 5.4].forEach((r, i) => tone(t, 'sine', f * r, 0, 1.4 - i * 0.35, v / (i + 1), dest)); }

const run = (fn: (t: number) => void) => { if (muted) return; if (!ac()) return; fn(C!.currentTime + 0.01); };
export const sfx = {
  /** Right answer: sitar pluck + a bell. */
  ok() { run((t) => { [69, 73, 76].forEach((m, i) => sitar(t + i * 0.07, m, 0.34, sfxBus)); bell(t + 0.14, 1568, 0.16, sfxBus); }); },
  /** Checkpoint unlocked: rising chimes. */
  unlock() { run((t) => { [74, 78, 81, 86].forEach((m, i) => bell(t + i * 0.09, mtof(m), 0.14, sfxBus)); noise(t, 0.6, 'highpass', 6500, 0.6, 0.06, 0.5, sfxBus); }); },
  /** Diya lit. */
  diya() { run((t) => { noise(t, 0.4, 'lowpass', 1600, 1, 0.25, 0.25, sfxBus); [81, 86, 90].forEach((m, i) => bell(t + 0.08 + i * 0.07, mtof(m), 0.1, sfxBus)); }); },
  /** Soft miss. */
  bad() { run((t) => { tone(t, 'sine', 330, 210, 0.28, 0.18, sfxBus); tone(t + 0.1, 'sine', 247, 175, 0.3, 0.14, sfxBus); }); },
  tap() { run((t) => tone(t, 'triangle', 1100, 0, 0.05, 0.08, sfxBus)); },
  join() { run((t) => { bell(t, mtof(79), 0.12, sfxBus); bell(t + 0.1, mtof(86), 0.1, sfxBus); }); },
  boom() { run((t) => { noise(t, 0.5, 'lowpass', 900, 1, 0.3, 0.35, sfxBus); noise(t + 0.04, 0.8, 'highpass', 5000, 1, 0.07, 0.6, sfxBus); }); },
  /** Celebration fanfare. */
  win() { run((t) => { [62, 66, 69, 74, 78, 81, 86].forEach((m, i) => sitar(t + i * 0.12, m, 0.32, sfxBus)); [0, 0.36, 0.72].forEach((d) => noise(t + d, 0.25, 'bandpass', 1400, 1.2, 0.3, 0.12, sfxBus)); bell(t + 0.9, 1175, 0.2, sfxBus); }); },
};

/* ------- optional loop for the projector: drone + tabla + a sitar riff (D phrygian dominant) ------- */
let playing = false, timer: ReturnType<typeof setInterval> | null = null, nextT = 0, step = 0, drone: OscillatorNode[] = [];
export const musicOn = () => playing;
const RIFF = [62, 0, 62, 66, 67, 0, 66, 63, 62, 0, 57, 0, 60, 58, 57, 0];
function playStep(s: number, t: number) {
  const st = s % 16;
  if (st % 4 === 0) { const o = C!.createOscillator(), g = C!.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(46, t + 0.13); env(g, t, 0.003, 0.7, 0.3); o.connect(g); g.connect(musicBus); o.start(t); o.stop(t + 0.4); }
  if (st % 4 === 2) noise(t, 0.2, 'highpass', 8000, 0.7, 0.07, 0.08, musicBus);
  if (st === 2 || st === 6 || st === 10) tone(t, 'sine', 540, 500, 0.12, 0.18, musicBus);
  if (st === 0 || st === 8) tone(t, 'sine', 80, 135, 0.4, 0.4, musicBus);
  const m = RIFF[st]!;
  if (m) sitar(t, m, 0.2, musicBus);
}
export function startMusic() {
  if (playing || muted || !ac()) return;
  playing = true; nextT = C!.currentTime + 0.1; step = 0;
  drone = [50, 57, 62].map((m, i) => { const o = C!.createOscillator(), f = C!.createBiquadFilter(), g = C!.createGain(); o.type = 'sawtooth'; o.frequency.value = mtof(m); o.detune.value = i * 3; f.type = 'lowpass'; f.frequency.value = 500; g.gain.value = 0.03; o.connect(f); f.connect(g); g.connect(musicBus); o.start(); return o; });
  timer = setInterval(() => { while (C && nextT < C.currentTime + 0.15) { playStep(step, nextT); nextT += 60 / 112 / 4; step++; } }, 25);
}
export function stopMusic() {
  if (!playing) return;
  playing = false; if (timer) clearInterval(timer);
  drone.forEach((o) => { try { o.stop(); } catch { /* ignore */ } }); drone = [];
}
