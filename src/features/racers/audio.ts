/* English Racers — all sound is synthesized (Web Audio, no files): a kart engine whose pitch
   follows the speed through simulated gears, tyre screech while drifting, turbo whooshes, jump,
   landing and wall hits, the countdown, lap chimes, and a soundtrack with its own song per track. */
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
function noiseBuffer(c: BaseAudioContext) {
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
class Engine {
  private o1: OscillatorNode; private o2: OscillatorNode; private o3: OscillatorNode;
  private filt: BiquadFilterNode; private gain: GainNode;
  private screech: GainNode; private screechF: BiquadFilterNode; private src: AudioBufferSourceNode;
  private rpm = 0;
  constructor(c: AudioContext, out: AudioNode) {
    this.o1 = c.createOscillator(); this.o1.type = 'sawtooth';
    this.o2 = c.createOscillator(); this.o2.type = 'square';
    this.o3 = c.createOscillator(); this.o3.type = 'sine';
    const shaper = c.createWaveShaper();
    const curve = new Float32Array(256);
    for (let i = 0; i < 256; i++) { const x = (i / 255) * 2 - 1; curve[i] = Math.tanh(x * 2.2); }
    shaper.curve = curve;
    this.filt = c.createBiquadFilter(); this.filt.type = 'lowpass'; this.filt.Q.value = 2.5;
    this.gain = c.createGain(); this.gain.gain.value = 0;
    const g2 = c.createGain(); g2.gain.value = 0.5;
    const g3 = c.createGain(); g3.gain.value = 0.7;
    this.o1.connect(shaper); this.o2.connect(g2).connect(shaper); this.o3.connect(g3).connect(this.filt);
    shaper.connect(this.filt).connect(this.gain).connect(out);
    this.src = c.createBufferSource(); this.src.buffer = noiseBuffer(c); this.src.loop = true;
    this.screechF = c.createBiquadFilter(); this.screechF.type = 'bandpass'; this.screechF.frequency.value = 1900; this.screechF.Q.value = 4;
    this.screech = c.createGain(); this.screech.gain.value = 0;
    this.src.connect(this.screechF).connect(this.screech).connect(out);
    this.o1.start(); this.o2.start(); this.o3.start(); this.src.start();
  }
  /** speed01: 0..1+, throttle 0..1. */
  set(c: AudioContext, speed01: number, throttle: number, drift: boolean, grounded: boolean, boost: boolean, on: boolean) {
    const t = c.currentTime;
    const gears = [0.28, 0.5, 0.72, 1.0, 9];
    let g = 0; while (speed01 > gears[g] && g < 4) g++;
    const lo = g ? gears[g - 1] : 0, hi = gears[g];
    let target = Math.min(1, (speed01 - lo) / Math.max(0.05, hi - lo)) * 0.8 + 0.2;
    if (!grounded) target = Math.min(1, target + 0.25 * throttle);
    if (speed01 < 0.04) target = 0.12 + throttle * 0.35;
    this.rpm += (target - this.rpm) * 0.25;
    const f = 48 + this.rpm * 85 + g * 9 + (boost ? 14 : 0);
    this.o1.frequency.setTargetAtTime(f, t, 0.03);
    this.o2.frequency.setTargetAtTime(f * 0.5, t, 0.03);
    this.o3.frequency.setTargetAtTime(f * 0.25, t, 0.03);
    this.filt.frequency.setTargetAtTime(380 + this.rpm * 1500 * (0.55 + throttle * 0.45) + (boost ? 600 : 0), t, 0.05);
    this.gain.gain.setTargetAtTime(on ? 0.085 + throttle * 0.04 : 0, t, 0.08);
    this.screech.gain.setTargetAtTime(on && drift && grounded ? 0.05 + speed01 * 0.03 : 0, t, 0.05);
    this.screechF.frequency.setTargetAtTime(1600 + speed01 * 700, t, 0.1);
  }
  stop() { for (const o of [this.o1, this.o2, this.o3]) try { o.stop(); } catch { /* ignore */ } try { this.src.stop(); } catch { /* ignore */ } this.gain.disconnect(); this.screech.disconnect(); }
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
  /** A big cartoon explosion: a cracking boom with a low thump falling away. */
  blast() { noise(0.9, 0.5, 1800, 'lowpass', 0, 120, 0.7); noise(0.18, 0.3, 4200, 'highpass'); tone(95, 0.7, 'sine', 0.3, 32); tone(190, 0.25, 'square', 0.08, 60); },
  /** A wet splat (ink). */
  splat() { noise(0.45, 0.32, 700, 'lowpass', 0, 140, 1.4); tone(240, 0.3, 'sine', 0.12, 60); tone(520, 0.12, 'triangle', 0.05, 200, 0.03); },
  /** Karts slamming into each other. */
  bam(v: number) { const k = Math.min(1, v / 14); noise(0.25, 0.2 + k * 0.3, 900, 'bandpass', 0, 260, 0.9); tone(110, 0.22, 'square', 0.06 + k * 0.08, 55); },
  /** Something flung high: a rising whistle. */
  whoosh() { noise(0.5, 0.16, 900, 'bandpass', 0, 3400, 3); },
  right() { [784, 988, 1175, 1568].forEach((f, i) => tone(f, 0.16, 'triangle', 0.08, 0, i * 0.07)); },
  wrong() { tone(330, 0.18, 'square', 0.05, 220); tone(247, 0.3, 'square', 0.05, 160, 0.15); },
  place(up: boolean) { tone(up ? 880 : 440, 0.08, 'triangle', 0.035, up ? 1175 : 330); },
};

/* ------------------------------------------------------------- music: a soundtrack per track
   Each track has its own song, written as data: key and scale, tempo, a chord progression for
   the verse, the build-up, the chorus and the bridge, a drum style, a bass line, a way of playing
   the chords and its lead instruments. The melody is composed once per song (from its seed): a
   two-bar motif per section, repeated over the changing chords and closing on a cadence, so every
   track has a tune you can hum. Arrangement: intro, verse, build-up, chorus, verse, chorus,
   bridge, chorus, then back to the verse. The final lap jumps to the chorus, faster and a
   semitone higher. Shared echo and reverb give the mix some space. */
type Style = 'rock' | 'ska' | 'dnb' | 'synthwave' | 'britpop' | 'funk' | 'citypop' | 'samba' | 'surf' | 'country' | 'winter';
type Lead = 'square' | 'saw' | 'tri' | 'bell' | 'pluck' | 'steel' | 'brass' | 'flute';
type Bass = 'root8' | 'octave' | 'walk' | 'synco' | 'samba' | 'boom' | 'pulse';
type Comp = 'stab' | 'skank' | 'strum' | 'arp';
interface Song {
  bpm: number; fast: number; key: number; mode: number[]; style: Style;
  lead: Lead; hook: Lead; bass: Bass; comp: Comp; pad: boolean; swing?: number;
  /** Chords as scale degrees (0 = the key's own chord), one per bar. */
  verse: number[]; pre: number[]; chorus: number[]; bridge: number[];
  seed: number;
}
const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], DOR = [0, 2, 3, 5, 7, 9, 10], MIX = [0, 2, 4, 5, 7, 9, 10], LYD = [0, 2, 4, 6, 7, 9, 11];
const SONGS: Record<string, Song> = {
  // Campus: bright pop-rock in A minor, guitar stabs, a square-wave hook
  campus: { bpm: 150, fast: 166, key: 69, mode: MIN, style: 'rock', lead: 'square', hook: 'saw', bass: 'root8', comp: 'stab', pad: false, verse: [0, 5, 2, 6], pre: [3, 4, 5, 6], chorus: [5, 6, 2, 0, 5, 6, 3, 4], bridge: [3, 0, 3, 4], seed: 11 },
  // Sunny Bay: ska-pop in C major, off-beat chords, a steel-drum tune
  beach: { bpm: 140, fast: 156, key: 72, mode: MAJ, style: 'ska', lead: 'steel', hook: 'tri', bass: 'walk', comp: 'skank', pad: false, swing: 0.12, verse: [0, 5, 3, 4], pre: [1, 4, 1, 4], chorus: [0, 3, 4, 0, 5, 3, 1, 4], bridge: [3, 4, 2, 5], seed: 23 },
  // Skyline Rush: tense drum & bass in D minor, octave bass, a sawtooth lead
  roofs: { bpm: 172, fast: 184, key: 62, mode: MIN, style: 'dnb', lead: 'saw', hook: 'square', bass: 'octave', comp: 'stab', pad: true, verse: [0, 0, 5, 6], pre: [3, 3, 4, 4], chorus: [0, 5, 2, 6, 0, 5, 3, 4], bridge: [5, 3, 5, 6], seed: 37 },
  // Neon Drive: synthwave in F minor, four on the floor, arpeggios and a big pad
  neon: { bpm: 116, fast: 128, key: 65, mode: MIN, style: 'synthwave', lead: 'saw', hook: 'bell', bass: 'pulse', comp: 'arp', pad: true, verse: [0, 5, 2, 6], pre: [5, 6, 5, 6], chorus: [0, 6, 5, 6, 0, 6, 3, 4], bridge: [3, 5, 3, 6], seed: 41 },
  // London Loop: brit-pop in G major, strummed chords, tambourine
  london: { bpm: 144, fast: 160, key: 67, mode: MIX, style: 'britpop', lead: 'tri', hook: 'square', bass: 'root8', comp: 'strum', pad: false, verse: [0, 6, 3, 0], pre: [5, 3, 6, 4], chorus: [3, 0, 6, 3, 3, 0, 4, 4], bridge: [5, 2, 3, 4], seed: 53 },
  // Big Apple Dash: funk in E dorian, slap-style bass, brass hook
  newyork: { bpm: 112, fast: 124, key: 64, mode: DOR, style: 'funk', lead: 'brass', hook: 'brass', bass: 'synco', comp: 'stab', pad: false, swing: 0.1, verse: [0, 3, 0, 3], pre: [6, 5, 6, 4], chorus: [0, 3, 6, 3, 0, 3, 5, 4], bridge: [3, 6, 3, 4], seed: 67 },
  // Tokyo Drift Lights: city pop in A major, disco hats, bell lead over a pad
  tokyo: { bpm: 124, fast: 138, key: 69, mode: MAJ, style: 'citypop', lead: 'bell', hook: 'saw', bass: 'octave', comp: 'arp', pad: true, verse: [3, 2, 1, 4], pre: [3, 4, 2, 5], chorus: [3, 4, 2, 5, 1, 4, 0, 0], bridge: [1, 2, 3, 4], seed: 71 },
  // Rio Carnival: samba in D major, surdo, tamborim and agogô bells, a flute tune
  rio: { bpm: 104, fast: 114, key: 62, mode: MAJ, style: 'samba', lead: 'flute', hook: 'steel', bass: 'samba', comp: 'skank', pad: false, verse: [0, 5, 1, 4], pre: [1, 4, 1, 4], chorus: [0, 3, 4, 0, 1, 4, 0, 0], bridge: [5, 1, 4, 0], seed: 89 },
  // Splash Loops: bouncy surf pop in F major with a steel drum
  splash: { bpm: 152, fast: 168, key: 65, mode: MAJ, style: 'surf', lead: 'steel', hook: 'square', bass: 'root8', comp: 'skank', pad: false, verse: [0, 3, 0, 4], pre: [5, 3, 1, 4], chorus: [0, 4, 5, 3, 0, 4, 3, 4], bridge: [5, 4, 3, 4], seed: 97 },
  // Canyon Run: dusty western in A minor, train beat, twangy guitar
  canyon: { bpm: 132, fast: 146, key: 69, mode: MIN, style: 'country', lead: 'pluck', hook: 'pluck', bass: 'boom', comp: 'strum', pad: false, verse: [0, 6, 5, 4], pre: [3, 0, 3, 4], chorus: [0, 6, 5, 4, 0, 6, 4, 0], bridge: [5, 6, 0, 4], seed: 101 },
  // Snow Peak: crisp C lydian, sleigh bells, music-box bells and a soft pad
  snow: { bpm: 140, fast: 156, key: 72, mode: LYD, style: 'winter', lead: 'bell', hook: 'flute', bass: 'pulse', comp: 'arp', pad: true, verse: [0, 1, 0, 1], pre: [5, 1, 3, 4], chorus: [0, 1, 5, 4, 0, 1, 3, 4], bridge: [5, 1, 5, 4], seed: 113 },
};

/* the composer: the whole song as a list of bars */
interface Note { at: number; dur: number; m: number }
interface Bar { sec: 'intro' | 'verse' | 'pre' | 'chorus' | 'bridge'; i: number; len: number; chord: number; next: number; mel: Note[] }
interface Plan { song: Song; bars: Bar[]; loopTo: number; chorusAt: number }
const RHY: Record<'verse' | 'chorus' | 'pre' | 'bridge', [number, number][][]> = {
  verse: [
    [[0, 2], [2, 2], [4, 3], [7, 1], [8, 2], [10, 2], [12, 4], [16, 2], [18, 2], [20, 2], [22, 2], [24, 6]],
    [[0, 3], [3, 3], [6, 2], [8, 2], [10, 1], [11, 3], [14, 2], [16, 3], [19, 3], [22, 2], [24, 8]],
    [[2, 2], [4, 2], [6, 2], [8, 4], [12, 2], [14, 2], [18, 2], [20, 2], [22, 2], [24, 4], [28, 4]],
  ],
  chorus: [
    [[0, 4], [4, 2], [6, 2], [8, 4], [12, 4], [16, 6], [22, 2], [24, 8]],
    [[0, 6], [6, 2], [8, 4], [12, 2], [14, 2], [16, 4], [20, 4], [24, 4], [28, 4]],
    [[0, 2], [2, 2], [4, 4], [8, 2], [10, 6], [16, 2], [18, 2], [20, 4], [24, 8]],
  ],
  pre: [
    [[0, 2], [2, 2], [4, 2], [6, 2], [8, 2], [10, 2], [12, 2], [14, 2], [16, 4], [20, 4], [24, 4], [28, 4]],
    [[0, 4], [4, 4], [8, 4], [12, 4], [16, 2], [18, 2], [20, 2], [22, 2], [24, 8]],
  ],
  bridge: [
    [[0, 8], [8, 8], [16, 6], [22, 2], [24, 8]],
    [[0, 6], [6, 6], [12, 4], [16, 12], [28, 4]],
  ],
};
function rng(seed: number) { let a = seed >>> 0; return () => { a = (a + 0x6d2b79f5) >>> 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const degM = (S: Song, d: number) => { const n = S.mode.length, o = Math.floor(d / n); return S.key + S.mode[((d % n) + n) % n] + 12 * o; };
function compose(S: Song): Plan {
  const R = rng(S.seed);
  const pick = <T,>(a: T[]) => a[Math.floor(R() * a.length)];
  const secs: [Bar['sec'], number[], number][] = [['intro', S.chorus.slice(0, 4), 4], ['verse', S.verse, 8], ['pre', S.pre, 4], ['chorus', S.chorus, 8], ['verse', S.verse, 8], ['chorus', S.chorus, 8], ['bridge', S.bridge, 8], ['chorus', S.chorus, 8]];
  // one motif per kind of section: rhythm, and for each note a chord tone (strong beats) or a
  // step along the scale from the last note
  const motifs = new Map<string, { at: number; dur: number; ct?: number; st?: number }[]>();
  for (const k of ['verse', 'pre', 'chorus', 'bridge'] as const) {
    const rh = pick(RHY[k]);
    motifs.set(k, rh.map(([at, dur]) => (at % 8 === 0 || dur >= 4 ? { at, dur, ct: pick(k === 'chorus' ? [0, 1, 2, 2, 3] : [0, 1, 1, 2]) } : { at, dur, st: pick([-2, -1, -1, 1, 1, 2]) })));
  }
  const bars: Bar[] = [];
  let md = 7; // the melody's place on the scale (7 = the key note an octave up)
  for (const [sec, chords, len] of secs) {
    const lo = sec === 'chorus' ? 2 : 0, hi = sec === 'chorus' ? 9 : 7;
    for (let i = 0; i < len; i++) {
      const chord = chords[i % chords.length], next = chords[(i + 1) % chords.length];
      const mel: Note[] = [];
      const mot = motifs.get(sec);
      if (mot) {
        const half = i % 2, last = i >= len - 2;
        for (const n of mot) {
          if (Math.floor(n.at / 16) !== half) continue;
          let ct = n.ct, st = n.st;
          // the closing bars land on the chord's root or third
          if (last && half === 1 && n.at >= 24) { ct = i === len - 1 ? 0 : 1; st = undefined; }
          if (ct !== undefined) {
            // the chord tone nearest to where the tune is
            let target = chord + ct * 2;
            while (target < md - 3) target += 7;
            while (target > md + 3) target -= 7;
            md = target;
          } else md += st!;
          while (md > hi) md -= 2;
          while (md < lo) md += 2;
          mel.push({ at: n.at % 16, dur: n.dur, m: degM(S, md) });
        }
      }
      bars.push({ sec, i, len, chord, next, mel });
    }
  }
  return { song: S, bars, loopTo: 4, chorusAt: bars.findIndex((b) => b.sec === 'chorus') };
}

/* the instruments */
/** Where the music plays: the dry mix, three reverb sends (little, some, a lot), two echo sends
    and the echo itself (its time follows the tempo). Notes plug into a send: no node per send. */
interface MusicOut { c: BaseAudioContext; out: AudioNode; rev: AudioNode[]; dly: AudioNode[]; echo: DelayNode }
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
function env(c: BaseAudioContext, t: number, vol: number, a: number, dur: number, to: AudioNode, curve: 'exp' | 'lin' = 'exp') {
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  if (curve === 'lin') { g.gain.linearRampToValueAtTime(vol, t + a); g.gain.setValueAtTime(vol, t + Math.max(a, dur - 0.08)); g.gain.linearRampToValueAtTime(0.0001, t + dur); }
  else { g.gain.exponentialRampToValueAtTime(vol, t + a); g.gain.exponentialRampToValueAtTime(0.0001, t + dur); }
  g.connect(to);
  return g;
}
function osc(c: BaseAudioContext, type: OscillatorType, f: number, t: number, dur: number, to: AudioNode, detune = 0) {
  const o = c.createOscillator(); o.type = type; o.frequency.setValueAtTime(f, t); if (detune) o.detune.value = detune;
  o.connect(to); o.start(t); o.stop(t + dur + 0.05);
  return o;
}
function sends(M: MusicOut, g: AudioNode, rev: number, dly: number) {
  if (rev) g.connect(M.rev[rev >= 0.4 ? 2 : rev >= 0.2 ? 1 : 0]);
  if (dly) g.connect(M.dly[dly >= 0.25 ? 1 : 0]);
}
function drum(M: MusicOut, t: number, kind: string, v = 1) {
  const c = M.c, o = M.out;
  const nz = (dur: number, vol: number, f: number, type: BiquadFilterType, q = 1, rev = 0) => {
    const s = c.createBufferSource(), fl = c.createBiquadFilter(); s.buffer = noiseBuffer(c); fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    const g = env(c, t, vol * v, 0.002, dur, o); s.connect(fl).connect(g); s.start(t, Math.random()); s.stop(t + dur + 0.02);
    if (rev) sends(M, g, rev, 0);
  };
  const thump = (f0: number, f1: number, dur: number, vol: number, type: OscillatorType = 'sine') => { const g = env(c, t, vol * v, 0.003, dur, o); const x = osc(c, type, f0, t, dur, g); x.frequency.exponentialRampToValueAtTime(f1, t + dur * 0.7); };
  switch (kind) {
    case 'kick': thump(160, 42, 0.32, 0.9); break;
    case 'snare': nz(0.18, 0.42, 1800, 'highpass', 0.7, 0.25); thump(230, 140, 0.1, 0.28, 'triangle'); break;
    case 'ghost': nz(0.06, 0.12, 2200, 'highpass'); break;
    case 'clap': for (let i = 0; i < 2; i++) { const tt = t + i * 0.012; const s = c.createBufferSource(), fl = c.createBiquadFilter(); s.buffer = noiseBuffer(c); fl.type = 'bandpass'; fl.frequency.value = 1300; fl.Q.value = 1.2; const g = env(c, tt, 0.45 * v, 0.001, i === 1 ? 0.2 : 0.03, o); s.connect(fl).connect(g); s.start(tt, Math.random()); s.stop(tt + 0.25); if (i === 1) sends(M, g, 0.35, 0); } break;
    case 'hat': nz(0.035, 0.12, 8000, 'highpass'); break;
    case 'ohat': nz(0.2, 0.1, 7500, 'highpass'); break;
    case 'ride': nz(0.3, 0.06, 9000, 'highpass'); { const g = env(c, t, 0.02 * v, 0.002, 0.3, o); osc(c, 'square', 3200, t, 0.3, g); } break;
    case 'crash': nz(1.3, 0.18, 5000, 'highpass', 0.5, 0.3); break;
    case 'shaker': nz(0.05, 0.08, 6000, 'bandpass', 1.5); break;
    case 'sleigh': for (let i = 0; i < 2; i++) { const tt = t + i * 0.022; const s = c.createBufferSource(), fl = c.createBiquadFilter(); s.buffer = noiseBuffer(c); fl.type = 'bandpass'; fl.frequency.value = 9000; fl.Q.value = 4; const g = env(c, tt, 0.11 * v, 0.001, 0.06, o); s.connect(fl).connect(g); s.start(tt, Math.random()); s.stop(tt + 0.1); } break;
    case 'rim': { const g = env(c, t, 0.16 * v, 0.001, 0.05, o); osc(c, 'triangle', 1750, t, 0.05, g); nz(0.02, 0.1, 4000, 'highpass'); } break;
    case 'tam': { const g = env(c, t, 0.14 * v, 0.001, 0.07, o); osc(c, 'triangle', 920, t, 0.07, g); } break;
    case 'agogoH': case 'agogoL': { const f = kind === 'agogoH' ? 940 : 700; const g = env(c, t, 0.08 * v, 0.002, 0.22, o); osc(c, 'sine', f, t, 0.22, g); osc(c, 'sine', f * 2.76, t, 0.22, g); } break;
    case 'surdo': thump(105, 62, 0.5, 0.7); break;
    case 'surdoM': thump(105, 80, 0.14, 0.35); break;
    case 'tom': thump(190, 95, 0.22, 0.55); break;
    case 'tomL': thump(130, 70, 0.28, 0.6); break;
  }
}
function lead(M: MusicOut, kind: Lead, t: number, m: number, dur: number, vol = 1) {
  const c = M.c, f = mtof(m);
  const len = Math.max(0.09, dur);
  switch (kind) {
    case 'square': case 'saw': case 'tri': {
      const type: OscillatorType = kind === 'tri' ? 'triangle' : kind === 'saw' ? 'sawtooth' : 'square';
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = kind === 'saw' ? 2600 : 3800; lp.Q.value = 0.7;
      const g = env(c, t, (kind === 'tri' ? 0.16 : kind === 'saw' ? 0.06 : 0.07) * vol, 0.01, len + 0.08, M.out, 'lin');
      lp.connect(g);
      const a = osc(c, type, f, t, len + 0.1, lp);
      if (len > 0.3) { const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5.5; vg.gain.value = f * 0.006; vib.connect(vg).connect(a.frequency); vib.start(t + 0.12); vib.stop(t + len + 0.1); }
      if (kind === 'saw') osc(c, type, f, t, len + 0.1, lp, 9);
      sends(M, g, 0.18, 0.28);
      break;
    }
    case 'bell': case 'steel': {
      // FM: a sine modulated by a sine; the brightness dies away
      const ratio = kind === 'bell' ? 3.5 : 2, idx = kind === 'bell' ? 2.2 : 1.3, d = kind === 'bell' ? Math.max(0.6, len * 1.4) : Math.max(0.35, len);
      const g = env(c, t, (kind === 'bell' ? 0.13 : 0.15) * vol, 0.004, d, M.out);
      const car = osc(c, 'sine', f, t, d, g);
      const mod = c.createOscillator(), mg = c.createGain(); mod.frequency.value = f * ratio; mg.gain.setValueAtTime(f * idx, t); mg.gain.exponentialRampToValueAtTime(f * 0.05, t + d * 0.6);
      mod.connect(mg).connect(car.frequency); mod.start(t); mod.stop(t + d + 0.05);
      sends(M, g, 0.25, kind === 'bell' ? 0.3 : 0.15);
      break;
    }
    case 'pluck': {
      // a twangy guitar: a sawtooth through a filter that closes fast
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.setValueAtTime(4200, t); lp.frequency.exponentialRampToValueAtTime(500, t + 0.25);
      const g = env(c, t, 0.11 * vol, 0.003, Math.max(0.3, len + 0.15), M.out); lp.connect(g);
      const a = osc(c, 'sawtooth', f, t, len + 0.2, lp); a.frequency.setValueAtTime(f * 0.985, t); a.frequency.linearRampToValueAtTime(f, t + 0.06);
      sends(M, g, 0.2, 0.22);
      break;
    }
    case 'brass': {
      const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = 1.5; lp.frequency.setValueAtTime(500, t); lp.frequency.linearRampToValueAtTime(2800, t + 0.07); lp.frequency.linearRampToValueAtTime(1600, t + len);
      const g = env(c, t, 0.075 * vol, 0.03, len + 0.06, M.out, 'lin'); lp.connect(g);
      osc(c, 'sawtooth', f, t, len + 0.1, lp); osc(c, 'sawtooth', f, t, len + 0.1, lp, -8); osc(c, 'square', f / 2, t, len + 0.1, lp);
      sends(M, g, 0.2, 0.12);
      break;
    }
    case 'flute': {
      const g = env(c, t, 0.17 * vol, 0.04, len + 0.1, M.out, 'lin');
      const a = osc(c, 'sine', f, t, len + 0.12, g); osc(c, 'triangle', f * 2, t, len + 0.12, env(c, t, 0.02 * vol, 0.04, len + 0.1, M.out, 'lin'));
      const vib = c.createOscillator(), vg = c.createGain(); vib.frequency.value = 5; vg.gain.value = f * 0.008; vib.connect(vg).connect(a.frequency); vib.start(t + 0.15); vib.stop(t + len + 0.12);
      const s = c.createBufferSource(), bp = c.createBiquadFilter(); s.buffer = noiseBuffer(c); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 3;
      s.connect(bp).connect(env(c, t, 0.03 * vol, 0.02, 0.12, M.out)); s.start(t, Math.random()); s.stop(t + 0.15);
      sends(M, g, 0.3, 0.2);
      break;
    }
  }
}
function bassNote(M: MusicOut, S: Song, t: number, m: number, dur: number, vol = 1) {
  const c = M.c, f = mtof(m);
  // (a fixed filter: an automated one costs a lot of CPU on phones)
  const soft = S.bass === 'walk' || S.bass === 'boom' || S.bass === 'samba';
  const g = env(c, t, 0.3 * vol, 0.004, dur, M.out);
  const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.Q.value = S.bass === 'pulse' ? 4 : 1.5; lp.frequency.value = soft ? 600 : S.bass === 'pulse' ? 900 : 750; lp.connect(g);
  osc(c, soft ? 'triangle' : 'sawtooth', f, t, dur, lp);
  osc(c, 'sine', f, t, dur, g);
}
/** A note moved by octaves into [lo, lo + 12). */
const into = (m: number, lo: number) => { while (m < lo) m += 12; while (m >= lo + 12) m -= 12; return m; };
function chordNotes(S: Song, d: number, base: number) {
  // the chord's tones in close position from `base` up
  const ns = [degM(S, d), degM(S, d + 2), degM(S, d + 4)];
  return ns.map((m) => { while (m < base) m += 12; while (m >= base + 12) m -= 12; return m; }).sort((a, b) => a - b);
}
function comp(M: MusicOut, S: Song, t: number, d: number, dur: number, vol = 1) {
  const c = M.c, ns = chordNotes(S, d, 55);
  if (S.comp === 'stab') {
    // a power chord: root, fifth, octave, through a bright filter
    const r = ns[0], lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200; lp.Q.value = 1;
    const g = env(c, t, 0.045 * vol, 0.004, dur, M.out); lp.connect(g);
    for (const [m, dt] of [[r - 12, 0], [r - 5, -7], [r, 7], [r, -7]]) osc(c, 'sawtooth', mtof(m), t, dur, lp, dt);
    sends(M, g, 0.12, 0);
  } else {
    const g = env(c, t, (S.comp === 'skank' ? 0.05 : 0.055) * vol, 0.004, dur, M.out);
    ns.forEach((m, i) => osc(c, S.comp === 'skank' ? 'square' : 'triangle', mtof(m + 12), t + (S.comp === 'strum' ? i * 0.018 : 0), dur, g));
    sends(M, g, 0.22, S.comp === 'strum' ? 0.1 : 0);
  }
}
function pad(M: MusicOut, S: Song, t: number, d: number, dur: number) {
  const c = M.c, lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1100; lp.Q.value = 0.5;
  const g = env(c, t, 0.032, 0.35, dur + 0.25, M.out, 'lin'); lp.connect(g);
  for (const m of chordNotes(S, d, 48)) { osc(c, 'sawtooth', mtof(m), t, dur + 0.3, lp, -10); osc(c, 'sawtooth', mtof(m), t, dur + 0.3, lp, 10); }
  sends(M, g, 0.5, 0);
}
function arp(M: MusicOut, S: Song, t: number, d: number, s: number, dur: number) {
  const ns = chordNotes(S, d, 60), seq = [0, 1, 2, 1, 2, 0, 1, 2];
  const m = ns[seq[s % 8]] + (s % 16 >= 8 ? 12 : 0);
  const c = M.c, g = env(c, t, S.style === 'winter' ? 0.05 : 0.03, 0.003, dur * 1.6, M.out);
  osc(c, S.style === 'winter' ? 'triangle' : 'square', mtof(m), t, dur * 1.6, g);
  sends(M, g, 0, 0.3);
}

/** One sixteenth of the song: drums, bass, chords, pad, arpeggio and the tune. */
function playStep(M: MusicOut, P: Plan, barIdx: number, s: number, t: number, sp: number, lift: number) {
  const S = P.song, B = P.bars[barIdx], st = S.style;
  const intro = B.sec === 'intro', bridge = B.sec === 'bridge', fill = B.i === B.len - 1 && s >= 12;
  const D = (k: string, v = 1) => drum(M, t, k, v);
  if (s === 0 && B.i === 0 && !intro) D('crash');
  // drums
  if (fill && !intro) { if (s % 2 === 0 || st === 'dnb' || st === 'funk') D(s < 14 ? 'tom' : 'tomL', 0.8 + (s - 12) * 0.08); if (s === 12) D('kick'); }
  else if (intro) {
    if (s % 4 === 0 && B.i >= 1) D('kick', 0.7);
    if (s % 2 === 1 || st === 'winter') D(st === 'winter' ? 'sleigh' : 'hat', 0.6);
    if (B.i === B.len - 1 && s >= 8) D('snare', 0.25 + (s - 8) * 0.09);
  } else if (bridge) {
    if (s === 0 || s === 10) D('kick', 0.8);
    if (s === 8) D(st === 'synthwave' || st === 'citypop' || st === 'winter' ? 'clap' : 'snare');
    if (s % 4 === 2) D(st === 'winter' ? 'sleigh' : 'ride', 0.7);
  } else {
    const back = s === 4 || s === 12;
    switch (st) {
      case 'rock': case 'britpop':
        if (s === 0 || s === 8 || (st === 'rock' ? s === 10 : s === 6)) D('kick');
        if (back) D('snare');
        if (s % 2 === 0) D('hat', s % 4 === 0 ? 1 : 0.6);
        if (st === 'britpop' && s % 2 === 1) D('shaker');
        break;
      case 'ska': case 'surf':
        if (s === 0 || s === 8 || (st === 'surf' && s === 11)) D('kick');
        if (back) D('snare');
        if (s % 4 === 2) { D('ohat', 0.8); D('rim', 0.5); } else if (s % 2 === 0) D('hat', 0.7);
        break;
      case 'dnb':
        if (s === 0 || s === 10) D('kick');
        if (back) D('snare');
        if (s === 7 || s === 15) D('ghost');
        D('hat', s % 2 === 0 ? 0.7 : 0.35);
        break;
      case 'synthwave': case 'citypop':
        if (s % 4 === 0) D('kick');
        if (back) { D('clap'); if (st === 'synthwave') D('snare', 0.6); }
        if (s % 4 === 2) D('ohat', 0.8); else if (st === 'citypop') D('hat', 0.5);
        break;
      case 'funk':
        if (s === 0 || s === 3 || s === 10) D('kick');
        if (back) D('snare');
        if (s === 7 || s === 9 || s === 15) D('ghost');
        D('hat', s % 4 === 2 ? 1 : 0.45);
        break;
      case 'samba':
        if (s === 4) D('surdoM'); if (s === 12) D('surdo');
        if (s === 0 || s === 8) D('kick', 0.5);
        if ([0, 3, 6, 8, 11, 14].includes(s)) D('tam', 0.9);
        D('shaker', s % 4 === 0 ? 1 : 0.55);
        if (s === 0 || s === 4 || s === 6) D('agogoH'); if (s === 2 || s === 8 || s === 10) D('agogoL');
        break;
      case 'country':
        if (s === 0 || s === 8) D('kick');
        D('shaker', back ? 1.6 : s % 2 === 0 ? 0.8 : 0.5);
        if (back) D('rim', 0.8);
        break;
      case 'winter':
        if (s === 0 || s === 8 || s === 11) D('kick', 0.8);
        if (back) D('clap', 0.8);
        if (s % 2 === 0) D('sleigh', s % 4 === 0 ? 1 : 0.7);
        break;
    }
  }
  // bass
  // (the bass sits between E2 and D#3 whatever the key)
  const r0 = degM(S, B.chord), root = into(r0, 40) + lift, fifth = root + degM(S, B.chord + 4) - r0, third = root + degM(S, B.chord + 2) - r0;
  const nextRoot = into(degM(S, B.next), 40) + lift;
  const n8 = sp * 2;
  if (!intro || B.i >= 2) {
    const bv = bridge ? 0.75 : 1;
    switch (S.bass) {
      case 'root8': if (s % 2 === 0) bassNote(M, S, t, s === 14 && B.i % 2 === 1 ? root + 12 : root, n8 * 0.9, bv); break;
      case 'octave': if (s % 2 === 0) bassNote(M, S, t, s % 4 === 2 ? root + 12 : root, n8 * 0.8, bv); break;
      case 'pulse': if (s % 2 === 0) bassNote(M, S, t, root, n8 * 0.7, s % 4 === 0 ? bv : bv * 0.7); break;
      case 'walk': if (s % 4 === 0) { const w = [root, third, fifth, nextRoot + (nextRoot > root ? -1 : 1)]; bassNote(M, S, t, w[s / 4], sp * 3.6, bv); } break;
      case 'synco': { const pat: Record<number, number> = { 0: root, 3: root + 12, 6: root, 8: fifth, 10: root, 11: root + 10, 14: root + 12 }; if (pat[s] !== undefined) bassNote(M, S, t, pat[s], sp * (s === 0 || s === 8 ? 1.8 : 0.9), bv); break; }
      case 'samba': { const pat: Record<number, number> = { 0: root, 3: root, 4: fifth, 7: fifth, 8: root, 11: root, 12: fifth, 15: fifth }; if (pat[s] !== undefined) bassNote(M, S, t, pat[s], sp * (s % 4 === 0 ? 2.6 : 0.9), bv * (s % 4 === 0 ? 1 : 0.7)); break; }
      case 'boom': if (s === 0) bassNote(M, S, t, root, sp * 3.5, bv); else if (s === 8) bassNote(M, S, t, fifth - 12, sp * 3.5, bv); else if (B.i % 2 === 1 && (s === 12 || s === 14)) bassNote(M, S, t, s === 12 ? nextRoot - 3 : nextRoot - 1, sp * 1.8, bv * 0.8); break;
    }
  }
  // chords
  const cd = B.chord;
  if (!intro || S.comp === 'arp') {
    const liftS: Song = lift ? { ...S, key: S.key + lift } : S;
    switch (S.comp) {
      case 'stab': if (s === 0 || s === 6 || (s === 10 && st !== 'funk') || (st === 'funk' && (s === 3 || s === 11))) comp(M, liftS, t, cd, sp * (s === 0 ? 2.6 : 1.4)); break;
      case 'skank': if (s % 4 === 2) comp(M, liftS, t, cd, sp * 0.9); break;
      case 'strum': if (s === 0 || s === 8 || (st === 'country' && (s === 4 || s === 12))) comp(M, liftS, t, cd, sp * (st === 'country' ? 3.6 : 7.5)); break;
      case 'arp': if ((!bridge && st !== 'winter') || s % 2 === 0) arp(M, liftS, t, cd, s, sp * (st === 'winter' ? 2 : 1)); break;
    }
    if (S.pad && s === 0) pad(M, liftS, t, cd, sp * 16);
  }
  // the tune (the chorus has its hook instrument)
  for (const n of B.mel) if (n.at === s) lead(M, B.sec === 'chorus' ? S.hook : S.lead, t, n.m + lift, n.dur * sp * 0.92, B.sec === 'bridge' ? 0.8 : 1);
}

/* effects, the live scheduler */
function makeFx(c: BaseAudioContext, out: AudioNode): MusicOut {
  // a short room reverb (an impulse of decaying noise) and an echo a dotted eighth long
  const rev = c.createConvolver(), len = Math.floor(c.sampleRate * 1.3), ir = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = ir.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2); }
  rev.buffer = ir;
  const rg = c.createGain(); rg.gain.value = 0.55; rev.connect(rg).connect(out);
  const echo = c.createDelay(1.5), fb = c.createGain(), lp = c.createBiquadFilter(), dg = c.createGain();
  echo.delayTime.value = 0.3; fb.gain.value = 0.32; lp.type = 'lowpass'; lp.frequency.value = 2600; dg.gain.value = 0.5;
  echo.connect(lp).connect(fb).connect(echo); lp.connect(dg).connect(out);
  const bus = (to: AudioNode, v: number) => { const g = c.createGain(); g.gain.value = v; g.connect(to); return g; };
  return { c, out, rev: [bus(rev, 0.15), bus(rev, 0.3), bus(rev, 0.5)], dly: [bus(echo, 0.15), bus(echo, 0.3)], echo };
}
let timer: ReturnType<typeof setInterval> | null = null;
let musicWanted = false;
let fx: MusicOut | null = null;
let plan: Plan = compose(SONGS.campus);
let bar = 0, sixteenth = 0, nextT = 0, jumpChorus = false;
export let musicFast = false;
export function setMusicFast(v: boolean) { if (v && !musicFast) jumpChorus = true; musicFast = v; }
/** The track's song, from the top. */
export function setSong(id: string) {
  const S = SONGS[id] ?? SONGS.campus;
  if (plan.song !== S) plan = compose(S);
  bar = 0; sixteenth = 0; jumpChorus = false;
}
export function startMusic() {
  musicWanted = true;
  const c = ac(); if (!c || !prefs.music || timer || !musicBus) return;
  if (!fx) fx = makeFx(c, musicBus);
  nextT = c.currentTime + 0.12;
  timer = setInterval(() => {
    const cc = ctx; if (!cc || !fx) return;
    const S = plan.song, sp = 60 / (musicFast ? S.fast : S.bpm) / 4;
    fx.echo.delayTime.setTargetAtTime(sp * 3, cc.currentTime, 0.05);
    if (nextT < cc.currentTime - 0.3) nextT = cc.currentTime + 0.05; // the tab slept: don't play catch-up
    while (nextT < cc.currentTime + 0.22) {
      const sw = S.swing && sixteenth % 2 === 1 ? sp * S.swing : 0;
      playStep(fx, plan, bar, sixteenth, nextT + sw, sp, musicFast ? 1 : 0);
      nextT += sp;
      if (++sixteenth >= 16) {
        sixteenth = 0;
        bar = jumpChorus ? plan.chorusAt : bar + 1 >= plan.bars.length ? plan.loopTo : bar + 1;
        jumpChorus = false;
      }
    }
  }, 50);
}
export function stopMusic(forget = true) { if (forget) musicWanted = false; if (timer) { clearInterval(timer); timer = null; } }
/** (Tests) Render `secs` of a track's song into an offline context. */
export function renderSong(c: OfflineAudioContext, id: string, secs: number, fast = false) {
  const P = compose(SONGS[id] ?? SONGS.campus);
  const g = c.createGain(); g.gain.value = 0.26; g.connect(c.destination);
  const M = makeFx(c, g);
  const sp = 60 / (fast ? P.song.fast : P.song.bpm) / 4;
  M.echo.delayTime.value = sp * 3;
  let b = fast ? P.chorusAt : 0, s = 0;
  for (let t = 0.05; t < secs; t += sp) {
    playStep(M, P, b, s, t + (P.song.swing && s % 2 === 1 ? sp * P.song.swing : 0), sp, fast ? 1 : 0);
    if (++s >= 16) { s = 0; b = b + 1 >= P.bars.length ? P.loopTo : b + 1; }
  }
  return P.bars.length;
}
