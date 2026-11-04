/* English Racers — all sound is synthesized (Web Audio, no files): a sport-bike style engine
   whose revs follow the speed through six gears, tyre screech while drifting, turbo whooshes, jump,
   landing and wall hits, the countdown, lap chimes and a driving music loop. */
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
const load = (k: string, d: boolean) => { try { const v = localStorage.getItem(k); return v === null ? d : v === '1'; } catch { return d; } };
export const prefs = { sfx: load('racers:sfx', true), music: load('racers:music', true) };
export function setPref(k: keyof typeof prefs, v: boolean) {
  prefs[k] = v;
  try { localStorage.setItem('racers:' + k, v ? '1' : '0'); } catch { /* ignore */ }
  if (sfxBus && k === 'sfx') sfxBus.gain.value = v ? 1 : 0;
  if (k === 'music') { if (v && musicWanted) startMusic(); else stopMusic(false); }
}

function ac() {
  try {
    if (!ctx) {
      ctx = new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.85;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp).connect(ctx.destination);
      sfxBus = ctx.createGain(); sfxBus.gain.value = prefs.sfx ? 1 : 0; sfxBus.connect(master);
      musicBus = ctx.createGain(); musicBus.gain.value = 0.26; musicBus.connect(master);
    }
    if (ctx.state === 'suspended') void ctx.resume().catch(() => {});
    return ctx;
  } catch { return null; }
}
export function unlock() { ac(); }

let noiseBuf: AudioBuffer | null = null;
function noiseBuffer(c: AudioContext) {
  if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate * 2, c.sampleRate); const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  return noiseBuf;
}
function tone(f: number, dur: number, type: OscillatorType, vol: number, slide = 0, delay = 0, out?: AudioNode) {
  const c = ac(); if (!c || !sfxBus) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(out ?? sfxBus);
  o.start(t); o.stop(t + dur + 0.05);
}
function noise(dur: number, vol: number, freq: number, type: BiquadFilterType = 'bandpass', delay = 0, sweep = 0, q = 1) {
  const c = ac(); if (!c || !sfxBus) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuffer(c); f.type = type; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
  if (sweep) f.frequency.exponentialRampToValueAtTime(sweep, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(sfxBus);
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

/* ------------------------------------------------------------- engine */
/** A sport-bike style inline-four: revs from ~1,400 to 14,000 rpm through six gears (the firing
    frequency is rpm/30), a raspy saw/square mix through soft clipping, a formant that opens with the
    revs, intake hiss on throttle, a cut on every upshift, pops and crackles when you lift off at
    high revs, a rev limiter in the air and a turbo whine while boosting. */
class Engine {
  private oF: OscillatorNode; private oH: OscillatorNode; private oS: OscillatorNode; private oSub: OscillatorNode; private am: OscillatorNode;
  private amGain: GainNode; private formant: BiquadFilterNode; private filt: BiquadFilterNode; private gain: GainNode; private cut: GainNode;
  private intake: GainNode; private intakeF: BiquadFilterNode; private whine: OscillatorNode; private whineG: GainNode;
  private screech: GainNode; private screechF: BiquadFilterNode; private src: AudioBufferSourceNode; private src2: AudioBufferSourceNode;
  private rpm = 1400; private gear = 1; private lastThrottle = 0; private popsUntil = 0; private nextPop = 0;
  constructor(private c: AudioContext, private out: AudioNode) {
    const osc = (type: OscillatorType) => { const o = c.createOscillator(); o.type = type; return o; };
    this.oF = osc('sawtooth'); this.oH = osc('square'); this.oS = osc('sawtooth'); this.oSub = osc('sine'); this.am = osc('sine');
    const mix = c.createGain(); mix.gain.value = 1;
    const gF = c.createGain(); gF.gain.value = 0.55;
    const gH = c.createGain(); gH.gain.value = 0.28;
    const gS = c.createGain(); gS.gain.value = 0.22;
    const gSub = c.createGain(); gSub.gain.value = 0.5;
    this.oF.connect(gF).connect(mix); this.oH.connect(gH).connect(mix); this.oS.connect(gS).connect(mix);
    // a little roughness: amplitude wobble at half the firing rate
    this.amGain = c.createGain(); this.amGain.gain.value = 0.85;
    const amDepth = c.createGain(); amDepth.gain.value = 0.15;
    this.am.connect(amDepth).connect(this.amGain.gain);
    const shaper = c.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 3.2) * 0.9 + x * 0.1; }
    shaper.curve = curve; shaper.oversample = '2x';
    this.formant = c.createBiquadFilter(); this.formant.type = 'peaking'; this.formant.Q.value = 1.6; this.formant.gain.value = 7;
    this.filt = c.createBiquadFilter(); this.filt.type = 'lowpass'; this.filt.Q.value = 1.4;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 35;
    this.cut = c.createGain(); this.cut.gain.value = 1;
    this.gain = c.createGain(); this.gain.gain.value = 0;
    mix.connect(this.amGain).connect(shaper).connect(this.formant).connect(this.filt).connect(hp).connect(this.cut).connect(this.gain).connect(out);
    this.oSub.connect(gSub).connect(this.cut);
    // intake hiss
    this.src2 = c.createBufferSource(); this.src2.buffer = noiseBuffer(c); this.src2.loop = true;
    this.intakeF = c.createBiquadFilter(); this.intakeF.type = 'bandpass'; this.intakeF.Q.value = 0.9;
    this.intake = c.createGain(); this.intake.gain.value = 0;
    this.src2.connect(this.intakeF).connect(this.intake).connect(out);
    // turbo whine
    this.whine = osc('sine'); this.whineG = c.createGain(); this.whineG.gain.value = 0;
    this.whine.connect(this.whineG).connect(out);
    // tyre screech
    this.src = c.createBufferSource(); this.src.buffer = noiseBuffer(c); this.src.loop = true;
    this.screechF = c.createBiquadFilter(); this.screechF.type = 'bandpass'; this.screechF.frequency.value = 1900; this.screechF.Q.value = 4;
    this.screech = c.createGain(); this.screech.gain.value = 0;
    this.src.connect(this.screechF).connect(this.screech).connect(out);
    for (const o of [this.oF, this.oH, this.oS, this.oSub, this.am, this.whine]) o.start();
    this.src.start(); this.src2.start(0, 0.7);
  }
  /** A crackle in the exhaust (lifting off at high revs). */
  private pop(t: number) {
    const c = this.c, s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    s.buffer = noiseBuffer(c); f.type = 'bandpass'; f.frequency.value = 500 + Math.random() * 900; f.Q.value = 1.2;
    const v = 0.08 + Math.random() * 0.1, d = 0.012 + Math.random() * 0.025;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0001, t + d);
    s.connect(f).connect(g).connect(this.out); s.start(t, Math.random()); s.stop(t + d + 0.02);
  }
  /** speed01: 0..1+ (1 = top speed), throttle 0..1. */
  set(c: AudioContext, speed01: number, throttle: number, drift: boolean, grounded: boolean, boost: boolean, on: boolean) {
    const t = c.currentTime;
    // gear from the speed (shift points), rpm inside the gear
    const up = [0, 0.16, 0.3, 0.45, 0.61, 0.79, 99];
    let g = 1; while (g < 6 && speed01 > up[g]) g++;
    if (g > this.gear && on) { this.cut.gain.cancelScheduledValues(t); this.cut.gain.setValueAtTime(0.35, t); this.cut.gain.linearRampToValueAtTime(1, t + 0.07); }
    this.gear = g;
    const lo = up[g - 1], hi = Math.min(up[g], 1.25);
    let target = g === 1 ? 1400 + (speed01 / hi) * 11000 : 6200 + ((speed01 - lo) / Math.max(0.05, hi - lo)) * 7600;
    if (speed01 < 0.03) target = 1400 + throttle * 6500; // revving on the spot
    if (!grounded) target = Math.max(target, 9000 + throttle * 5200); // wheels free in the air
    if (boost) target += 600;
    target = Math.min(14000, target * (0.92 + throttle * 0.08));
    this.rpm += (target - this.rpm) * (target > this.rpm ? 0.22 : 0.12);
    const limiter = this.rpm > 13700 && throttle > 0.8;
    const f = (this.rpm / 60) * 2 * (limiter ? 0.97 + Math.random() * 0.06 : 1);
    this.oF.frequency.setTargetAtTime(f, t, 0.02);
    this.oH.frequency.setTargetAtTime(f * 0.5, t, 0.02);
    this.oS.frequency.setTargetAtTime(f * 2.002, t, 0.02);
    this.oSub.frequency.setTargetAtTime(f * 0.25, t, 0.03);
    this.am.frequency.setTargetAtTime(f * 0.5, t, 0.03);
    const r = this.rpm / 14000;
    this.formant.frequency.setTargetAtTime(700 + r * 2100, t, 0.04);
    this.filt.frequency.setTargetAtTime(500 + r * 4200 * (0.5 + throttle * 0.5) + (boost ? 900 : 0), t, 0.04);
    this.gain.gain.setTargetAtTime(on ? (0.05 + throttle * 0.035 + r * 0.03) * (limiter && Math.random() < 0.35 ? 0.4 : 1) : 0, t, 0.05);
    this.intakeF.frequency.setTargetAtTime(900 + r * 3500, t, 0.05);
    this.intake.gain.setTargetAtTime(on ? throttle * (0.008 + r * 0.02) : 0, t, 0.06);
    this.whine.frequency.setTargetAtTime(2400 + r * 2600, t, 0.08);
    this.whineG.gain.setTargetAtTime(on && boost ? 0.012 : 0, t, 0.1);
    this.screech.gain.setTargetAtTime(on && drift && grounded ? 0.05 + speed01 * 0.03 : 0, t, 0.05);
    this.screechF.frequency.setTargetAtTime(1600 + speed01 * 700, t, 0.1);
    // lifting off at high revs: crackles for a moment
    if (on && this.lastThrottle > 0.6 && throttle < 0.2 && this.rpm > 8000) this.popsUntil = t + 0.55 + Math.random() * 0.3;
    this.lastThrottle = throttle;
    if (on && t < this.popsUntil && t >= this.nextPop) { this.pop(t + Math.random() * 0.02); this.nextPop = t + 0.04 + Math.random() * 0.09; }
  }
  stop() {
    for (const o of [this.oF, this.oH, this.oS, this.oSub, this.am, this.whine]) try { o.stop(); } catch { /* ignore */ }
    for (const sNode of [this.src, this.src2]) try { sNode.stop(); } catch { /* ignore */ }
    this.gain.disconnect(); this.screech.disconnect(); this.intake.disconnect(); this.whineG.disconnect();
  }
}
let engine: Engine | null = null;
export function engineSet(speed01: number, throttle: number, drift: boolean, grounded: boolean, boost: boolean, on: boolean) {
  const c = ac(); if (!c || !sfxBus) return;
  if (!engine) { if (!on) return; engine = new Engine(c, sfxBus); }
  engine.set(c, speed01, throttle, drift, grounded, boost, on);
}
export function engineStop() { engine?.stop(); engine = null; }

/* ------------------------------------------------------------- effects */
const TIER_NOTES = [0, 880, 1175, 1568];
export const sfx = {
  hop() { tone(320, 0.09, 'triangle', 0.08, 520); },
  tier(n: number) { tone(TIER_NOTES[n] || 880, 0.16, 'triangle', 0.09); tone((TIER_NOTES[n] || 880) * 1.5, 0.12, 'sine', 0.05, 0, 0.05); },
  boost(big: boolean) { noise(big ? 0.75 : 0.5, big ? 0.32 : 0.24, 700, 'bandpass', 0, 3800, 0.8); tone(110, 0.4, 'sawtooth', 0.07, 220); },
  pad() { noise(0.45, 0.2, 1200, 'bandpass', 0, 5200, 1.2); tone(660, 0.16, 'square', 0.04, 1320); },
  trick() { tone(784, 0.1, 'triangle', 0.08); tone(1175, 0.16, 'triangle', 0.08, 0, 0.08); },
  land(v: number) { const k = Math.min(1, v / 12); noise(0.16, 0.1 + k * 0.25, 260, 'lowpass'); tone(90, 0.16, 'sine', 0.1 + k * 0.2, 50); },
  wall(v: number) { const k = Math.min(1, v / 14); noise(0.22, 0.14 + k * 0.3, 900, 'bandpass', 0, 300, 0.7); tone(140, 0.12, 'square', 0.04 + k * 0.06, 70); },
  splash() { noise(0.9, 0.35, 900, 'lowpass', 0, 200); noise(0.5, 0.18, 3000, 'highpass', 0.05); },
  respawn() { tone(523, 0.12, 'triangle', 0.07); tone(784, 0.18, 'triangle', 0.07, 0, 0.1); },
  beep(go: boolean) { tone(go ? 880 : 440, go ? 0.55 : 0.28, 'square', 0.09); tone(go ? 1760 : 880, go ? 0.5 : 0.22, 'sine', 0.04); },
  lap(final: boolean) { const n = final ? [523, 659, 784, 1047, 1319] : [659, 988]; n.forEach((f, i) => tone(f, 0.22, 'triangle', 0.09, 0, i * 0.09)); },
  finish() { [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => tone(f, i === 6 ? 0.8 : 0.18, 'square', 0.06, 0, i * 0.12)); noise(1.2, 0.12, 6000, 'highpass', 0.8); },
  spin() { tone(600, 0.5, 'sawtooth', 0.06, 150); },
  click() { tone(1200, 0.05, 'triangle', 0.05); },
  box() { tone(988, 0.08, 'square', 0.05); tone(1319, 0.1, 'square', 0.05, 0, 0.06); noise(0.18, 0.12, 4000, 'highpass'); },
  coin() { tone(1319, 0.06, 'square', 0.045); tone(1976, 0.14, 'square', 0.045, 0, 0.055); },
  tick() { tone(1500 + Math.random() * 400, 0.03, 'triangle', 0.035); },
  got() { tone(784, 0.09, 'triangle', 0.08); tone(1047, 0.09, 'triangle', 0.08, 0, 0.07); tone(1568, 0.16, 'triangle', 0.07, 0, 0.14); },
  plane() { noise(0.6, 0.16, 1600, 'bandpass', 0, 600, 2); tone(520, 0.4, 'sine', 0.05, 900); },
  ink() { noise(0.35, 0.2, 500, 'lowpass', 0, 160); tone(180, 0.25, 'sine', 0.08, 70); },
  shield() { tone(392, 0.12, 'triangle', 0.07); tone(523, 0.12, 'triangle', 0.07, 0, 0.08); tone(784, 0.24, 'sine', 0.06, 0, 0.16); },
  block() { tone(1100, 0.12, 'square', 0.06, 500); noise(0.25, 0.18, 2500, 'bandpass', 0, 800); },
  coffee() { noise(0.3, 0.12, 900, 'bandpass', 0, 2600, 2); tone(220, 0.35, 'sawtooth', 0.06, 440, 0.12); },
  bell() { for (const [f, d] of [[1568, 0], [1976, 0.02], [2637, 0.04], [1568, 0.22], [1976, 0.24], [2637, 0.26]] as const) tone(f, 0.9, 'sine', 0.06, 0, d); },
  hit() { noise(0.4, 0.28, 700, 'bandpass', 0, 200, 0.8); tone(300, 0.45, 'sawtooth', 0.07, 90); },
  bump() { noise(0.12, 0.14, 500, 'lowpass'); tone(120, 0.1, 'square', 0.05, 80); },
  right() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, 0, i * 0.07)); },
  wrong() { tone(330, 0.18, 'square', 0.05, 220); tone(247, 0.3, 'square', 0.05, 160, 0.15); },
  place(up: boolean) { tone(up ? 880 : 440, 0.08, 'triangle', 0.035, up ? 1175 : 330); },
};

/* ------------------------------------------------------------- music: one theme per track */
let timer: ReturnType<typeof setInterval> | null = null;
let step = 0, nextT = 0;
let musicWanted = false;
export let musicFast = false;
export function setMusicFast(v: boolean) { musicFast = v; }
interface Song { bpm: number; fast: number; bass: number[]; arp: number[]; lead: OscillatorType; bassWave: OscillatorType; swing?: boolean; pad?: boolean }
const SONGS: Record<string, Song> = {
  // Campus: driving A minor pop-rock
  campus: { bpm: 150, fast: 168, bass: [45, 45, 57, 45, 48, 48, 60, 48, 43, 43, 55, 43, 50, 50, 52, 55], arp: [69, 72, 76, 81, 72, 76, 79, 84, 67, 71, 74, 79, 74, 77, 81, 86], lead: 'square', bassWave: 'sawtooth' },
  // Bay: sunny C major with a skip
  beach: { bpm: 138, fast: 156, bass: [48, 48, 55, 48, 53, 53, 60, 53, 50, 50, 57, 50, 55, 55, 59, 55], arp: [72, 76, 79, 84, 77, 81, 84, 89, 74, 77, 81, 86, 79, 83, 86, 91], lead: 'triangle', bassWave: 'triangle', swing: true },
  // Skyline: tense D minor
  roofs: { bpm: 156, fast: 172, bass: [50, 50, 62, 50, 46, 46, 58, 46, 48, 48, 60, 48, 45, 45, 57, 49], arp: [74, 77, 81, 86, 70, 74, 77, 82, 72, 76, 79, 84, 69, 73, 76, 81], lead: 'square', bassWave: 'sawtooth' },
  // Neon: synthwave F minor with a pad
  neon: { bpm: 118, fast: 132, bass: [41, 41, 53, 41, 44, 44, 56, 44, 39, 39, 51, 39, 46, 46, 48, 51], arp: [65, 68, 72, 77, 68, 72, 75, 80, 63, 67, 70, 75, 70, 73, 77, 82], lead: 'sawtooth', bassWave: 'sawtooth', pad: true },
  // London: brisk G major brit-pop
  london: { bpm: 146, fast: 164, bass: [43, 43, 55, 43, 47, 47, 59, 47, 40, 40, 52, 40, 48, 48, 50, 52], arp: [67, 71, 74, 79, 71, 74, 78, 83, 64, 67, 71, 76, 72, 76, 79, 84], lead: 'square', bassWave: 'sawtooth' },
  // New York: funky E minor with a swing
  newyork: { bpm: 132, fast: 150, bass: [40, 40, 52, 43, 45, 45, 57, 47, 48, 48, 60, 50, 47, 47, 59, 50], arp: [64, 67, 71, 76, 69, 72, 76, 81, 72, 76, 79, 84, 71, 75, 78, 83], lead: 'sawtooth', bassWave: 'square', swing: true },
  // Tokyo: bright pentatonic city pop with a pad
  tokyo: { bpm: 140, fast: 158, bass: [45, 45, 57, 45, 41, 41, 53, 41, 43, 43, 55, 43, 40, 40, 52, 44], arp: [69, 72, 76, 81, 69, 72, 77, 81, 67, 71, 74, 79, 64, 68, 71, 76], lead: 'triangle', bassWave: 'sawtooth', pad: true },
  // Rio: samba feel in D major
  rio: { bpm: 152, fast: 170, bass: [38, 38, 50, 45, 43, 43, 55, 50, 45, 45, 57, 52, 40, 40, 52, 47], arp: [74, 78, 81, 86, 79, 83, 86, 91, 76, 81, 85, 88, 71, 76, 79, 83], lead: 'triangle', bassWave: 'triangle', swing: true },
};
let song: Song = SONGS.campus;
export function setSong(id: string) { song = SONGS[id] ?? SONGS.campus; }
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
function hit(t: number, f: number, dur: number, type: OscillatorType, vol: number, slide = 0) {
  const c = ctx!; const o = c.createOscillator(), g = c.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t); if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(musicBus!); o.start(t); o.stop(t + dur + 0.02);
}
function nz(t: number, dur: number, vol: number, freq: number) {
  const c = ctx!; const s = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
  s.buffer = noiseBuffer(c); f.type = 'highpass'; f.frequency.value = freq;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(musicBus!); s.start(t, Math.random()); s.stop(t + dur + 0.02);
}
export function startMusic() {
  musicWanted = true;
  const c = ac(); if (!c || !prefs.music || timer) return;
  nextT = c.currentTime + 0.1;
  timer = setInterval(() => {
    const cc = ctx; if (!cc) return;
    const S = song;
    const sp = 60 / (musicFast ? S.fast : S.bpm) / 4;
    while (nextT < cc.currentTime + 0.25) {
      const s = step % 16, bar = Math.floor(step / 16) % 4;
      const sw = S.swing && s % 2 === 1 ? sp * 0.28 : 0;
      const t = nextT + sw;
      if (s % 4 === 0) hit(t, 150, 0.16, 'sine', 0.55, 45);
      if (s === 4 || s === 12) { nz(t, 0.16, 0.22, 1600); hit(t, 220, 0.08, 'triangle', 0.12, 120); }
      if (s % 2 === 1) nz(t, 0.04, 0.07, 7000);
      const root = S.bass[(bar * 4 + Math.floor(s / 4)) % 16];
      if (s % 2 === 0) hit(t, mtof(root - 12 + (s % 4 === 2 ? 12 : 0)), 0.14, S.bassWave, 0.11);
      const n = S.arp[(bar * 4 + (s % 4)) % 16] + (s >= 8 ? 0 : -12);
      hit(t, mtof(n), 0.1, S.lead, S.lead === 'sawtooth' ? 0.022 : 0.035);
      if (S.pad && s === 0) for (const k of [0, 3, 7]) hit(t, mtof(root + 12 + k), sp * 15, 'triangle', 0.018);
      if (bar === 3 && s === 14) nz(t, 0.3, 0.12, 900);
      nextT += sp;
      step++;
    }
  }, 60);
}
export function stopMusic(forget = true) { if (forget) musicWanted = false; if (timer) { clearInterval(timer); timer = null; } }
