/* Phrasal Verb Roulette — the soundtrack, played live in Web Audio (no audio files).
   An 8-bit drum and bass / dubstep loop at 174 BPM in A minor: pulse-wave leads and arpeggios,
   a crunchy wobble bass, noise drums. One loop is 40 bars (about 55 s):
     intro 4 · build 4 · drop 8 · half-time wobble 8 · drop 8 · breakdown 4 · build 4.
   `duck()` pulls the music down while a sound effect plays and brings it back after. */

const BPM = 174;
const STEP = 60 / BPM / 4; // one sixteenth
const LOOK = 0.14; // how far ahead notes are scheduled, in seconds

type Sec = 'intro' | 'build' | 'drop' | 'half' | 'break';
const PLAN: [Sec, number][] = [['intro', 4], ['build', 4], ['drop', 8], ['half', 8], ['drop', 8], ['break', 4], ['build', 4]];
const SONG: { sec: Sec; bar: number }[] = PLAN.flatMap(([sec, n]) => Array.from({ length: n }, (_, bar) => ({ sec, bar })));

// chords, as semitones from A2 (110 Hz): Am · F · C · G, two bars each
const CHORDS = [[0, 3, 7], [-4, 0, 3], [3, 7, 10], [-2, 2, 5]];
const chordAt = (bar: number) => CHORDS[Math.floor(bar / 2) % 4];

// lead phrases: [step in two bars, semitones from A4, length in steps]
const P1: [number, number, number][] = [[0, 12, 2], [2, 15, 2], [4, 19, 4], [8, 17, 2], [10, 15, 2], [12, 12, 3], [16, 10, 2], [18, 12, 2], [20, 15, 4], [24, 19, 2], [26, 17, 2], [28, 15, 4]];
const P2: [number, number, number][] = [[0, 19, 2], [2, 22, 2], [4, 19, 2], [6, 17, 2], [8, 15, 4], [12, 17, 2], [14, 19, 2], [16, 10, 3], [20, 12, 2], [22, 15, 2], [24, 17, 3], [28, 14, 4]];
const P3: [number, number, number][] = [[0, 24, 1], [1, 22, 1], [2, 19, 2], [4, 22, 2], [6, 24, 4], [12, 19, 2], [14, 17, 2], [16, 15, 2], [18, 17, 2], [20, 19, 4], [26, 12, 2], [28, 15, 4]];

const hz = (semisFromA2: number) => 110 * Math.pow(2, semisFromA2 / 12);

function pulseWave(ac: AudioContext, duty: number) {
  const n = 48, re = new Float32Array(n), im = new Float32Array(n);
  for (let k = 1; k < n; k++) re[k] = (2 / (k * Math.PI)) * Math.sin(k * Math.PI * duty);
  return ac.createPeriodicWave(re, im);
}

export class Chiptune {
  private ac: AudioContext;
  private out: GainNode; // music volume
  private duckG: GainNode; // ducking under sound effects
  private crush: AudioNode; // where every instrument plugs in
  private noise: AudioBuffer;
  private p12: PeriodicWave;
  private p25: PeriodicWave;
  private timer = 0;
  private step = 0;
  private next = 0;
  private duckEnd = 0;
  playing = false;

  constructor(ac: AudioContext, dest: AudioNode) {
    this.ac = ac;
    this.out = ac.createGain(); this.out.gain.value = 0;
    this.duckG = ac.createGain();
    // a 5-bit quantiser gives everything the console crunch
    // (boosted going in and brought back down after, so quiet notes keep a few steps of level)
    const pre = ac.createGain(), post = ac.createGain();
    pre.gain.value = 0.75; post.gain.value = 1 / 0.75;
    const shaper = ac.createWaveShaper(), curve = new Float32Array(4096);
    for (let i = 0; i < 4096; i++) { const x = (i / 4095) * 2 - 1; curve[i] = Math.round(x * 96) / 96; }
    shaper.curve = curve;
    this.crush = pre;
    pre.connect(shaper); shaper.connect(post); post.connect(this.duckG); this.duckG.connect(this.out); this.out.connect(dest);
    // stepped noise (sample-and-hold) sounds like a console noise channel
    const len = ac.sampleRate;
    this.noise = ac.createBuffer(1, len, ac.sampleRate);
    const d = this.noise.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) { if (i % 3 === 0) v = Math.random() * 2 - 1; d[i] = v; }
    this.p12 = pulseWave(ac, 0.125); this.p25 = pulseWave(ac, 0.25);
  }

  setVolume(vol01: number) {
    const now = this.ac.currentTime;
    this.out.gain.cancelScheduledValues(now);
    this.out.gain.setTargetAtTime(Math.pow(vol01, 1.5) * 0.55, now, 0.08);
  }

  start() {
    if (this.playing) return;
    this.playing = true;
    this.step = 0;
    this.next = this.ac.currentTime + 0.08;
    this.timer = window.setInterval(() => this.pump(), 25);
    this.pump();
  }

  stop() {
    this.playing = false;
    window.clearInterval(this.timer);
  }

  /** Lowers the music for `secs` seconds (a sound effect is playing), then brings it back. */
  duck(secs: number, depth = 0.2) {
    const g = this.duckG.gain, now = this.ac.currentTime, end = Math.max(this.duckEnd, now + secs);
    this.duckEnd = end;
    g.cancelScheduledValues(now);
    g.setValueAtTime(g.value, now);
    g.linearRampToValueAtTime(Math.min(depth, g.value), now + 0.04);
    g.setValueAtTime(Math.min(depth, g.value), end);
    g.linearRampToValueAtTime(1, end + 0.6);
  }

  private pump() {
    while (this.next < this.ac.currentTime + LOOK) {
      this.play(this.step, this.next);
      this.next += STEP;
      this.step++;
    }
  }

  // ---------- one sixteenth of the song ----------
  private play(n: number, t: number) {
    const barN = Math.floor(n / 16), s = n % 16, at = SONG[barN % SONG.length], sec = at.sec, bar = at.bar;
    const ch = chordAt(bar), root = ch[0];

    if (sec === 'intro' || sec === 'break') {
      if (s % 2 === 0) this.hat(t, s % 4 === 2 ? 0.05 : 0.03, 0.03);
      if (s === 0) this.sub(t, hz(root - 12), STEP * 14, 0.28);
      if (sec === 'intro' && bar >= 2 && (s === 0 || s === 10)) this.kick(t, 0.55);
      this.arp(t, ch, n, 0.05);
      if (sec === 'break' && s % 8 === 4) this.blip(t, hz(ch[2] + 24), 0.05);
      return;
    }

    if (sec === 'build') {
      if (bar === 3 && s >= 14) return; // a breath before the drop
      const every = bar < 2 ? 4 : bar < 3 ? 2 : 1;
      if (s % every === 0) this.snare(t, 0.12 + 0.25 * ((bar * 16 + s) / 64));
      if (s % 4 === 0) this.kick(t, 0.5);
      this.arp(t, ch, n, 0.04 + 0.03 * (bar / 4));
      if (s === 0) this.riser(t, STEP * 16, 300 + bar * 500, 1200 + bar * 900);
      return;
    }

    if (sec === 'drop') {
      // two-step break: kick on 1 and the "and" of 3, snare on 2 and 4, ghost notes
      if (s === 0 || s === 10) this.kick(t, 0.9);
      if (s === 4 || s === 12) this.snare(t, 0.42);
      if (s === 7 || s === 15) this.snare(t, 0.09);
      if (s % 2 === 0) this.hat(t, 0.07, 0.03); else this.hat(t, 0.03, 0.02);
      if (s === 14 && bar % 4 === 3) this.hat(t, 0.08, 0.12);
      if (s === 0 && bar % 8 === 0) this.crash(t);
      // neuro bass stabs with a falling filter
      const hits: [number, number, number][] = [[0, 0, 3], [3, 0, 2], [6, 12, 2], [8, 0, 2], [11, 7, 2], [14, 12, 2]];
      for (const [st, o, len] of hits) if (st === s) this.wobble(t, hz(root - 12 + o), STEP * len, 0, 0.22);
      if (s === 0) this.sub(t, hz(root - 12), STEP * 8, 0.2);
      // lead: 2-bar phrases
      const phrase = bar % 8 < 2 ? P1 : bar % 8 < 4 ? P2 : bar % 8 < 6 ? P1 : P3;
      const ps = (bar % 2) * 16 + s;
      for (const [st, semi, len] of phrase) if (st === ps) this.lead(t, hz(semi + 24), STEP * len, 0.075);
      return;
    }

    // half-time dubstep: kick on 1, snare on 3, wobbles that speed up
    if (s === 0 || (s === 11 && bar % 2 === 1)) this.kick(t, 0.8);
    if (s === 8) this.snare(t, 0.5);
    if (s % 2 === 0) this.hat(t, 0.05, 0.03);
    if (s === 0 && bar === 0) this.crash(t);
    if (s === 0 || s === 8) {
      const rate = bar < 2 ? 4 : bar < 4 ? 2 : bar < 6 ? 4 / 3 : 1; // wobble period, in sixteenths
      const o = s === 8 && bar % 2 === 1 ? 7 : 0;
      this.wobble(t, hz(root - 12 + o), STEP * 8, rate * STEP, 0.22);
      this.sub(t, hz(root - 12 + o), STEP * 8, 0.18);
    }
    if (bar % 4 === 3 && s >= 12) this.lead(t, hz(ch[(s - 12) % 3] + 24), STEP, 0.06);
  }

  // ---------- instruments ----------
  private env(t: number, peak: number, dur: number, attack = 0.004) {
    const g = this.ac.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.linearRampToValueAtTime(peak, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    return g;
  }

  private kick(t: number, vol: number) {
    const o = this.ac.createOscillator(), g = this.env(t, vol, 0.26, 0.002);
    o.type = 'triangle';
    o.frequency.setValueAtTime(170, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    o.connect(g); g.connect(this.crush); o.start(t); o.stop(t + 0.3);
    const c = this.ac.createOscillator(), cg = this.env(t, vol * 0.25, 0.02, 0.001);
    c.type = 'square'; c.frequency.value = 900;
    c.connect(cg); cg.connect(this.crush); c.start(t); c.stop(t + 0.03);
  }

  private noiseHit(t: number, vol: number, dur: number, type: BiquadFilterType, freq: number, q = 0.8) {
    const src = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), g = this.env(t, vol, dur, 0.001);
    src.buffer = this.noise;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    f.type = type; f.frequency.value = freq; f.Q.value = q;
    src.connect(f); f.connect(g); g.connect(this.crush);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  private snare(t: number, vol: number) {
    this.noiseHit(t, vol, 0.17, 'bandpass', 1900, 0.6);
    const o = this.ac.createOscillator(), g = this.env(t, vol * 0.5, 0.08, 0.001);
    o.type = 'square'; o.frequency.setValueAtTime(240, t); o.frequency.exponentialRampToValueAtTime(140, t + 0.07);
    o.connect(g); g.connect(this.crush); o.start(t); o.stop(t + 0.1);
  }

  private hat(t: number, vol: number, dur: number) { this.noiseHit(t, vol, dur, 'highpass', 7200); }
  private crash(t: number) { this.noiseHit(t, 0.14, 1.3, 'highpass', 4200); }

  private riser(t: number, dur: number, f0: number, f1: number) {
    const src = this.ac.createBufferSource(), f = this.ac.createBiquadFilter(), g = this.ac.createGain();
    src.buffer = this.noise; src.loop = true;
    f.type = 'bandpass'; f.Q.value = 2;
    f.frequency.setValueAtTime(f0, t); f.frequency.exponentialRampToValueAtTime(f1, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.07, t + dur * 0.9); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(this.crush); src.start(t); src.stop(t + dur + 0.02);
  }

  private sub(t: number, f: number, dur: number, vol: number) {
    const o = this.ac.createOscillator(), g = this.env(t, vol, dur, 0.01);
    o.type = 'triangle'; o.frequency.value = f / 2;
    o.connect(g); g.connect(this.crush); o.start(t); o.stop(t + dur + 0.02);
  }

  /** Bass through a resonant low-pass. `period` 0 = a single falling pluck; otherwise the
      filter wobbles open and shut every `period` seconds. */
  private wobble(t: number, f: number, dur: number, period: number, vol: number) {
    const a = this.ac.createOscillator(), b = this.ac.createOscillator(), lp = this.ac.createBiquadFilter(), g = this.ac.createGain();
    a.type = 'sawtooth'; a.frequency.value = f; a.detune.value = -9;
    b.setPeriodicWave(this.p25); b.frequency.value = f; b.detune.value = 9;
    lp.type = 'lowpass'; lp.Q.value = 9;
    const p = lp.frequency;
    if (!period) { p.setValueAtTime(3200, t); p.exponentialRampToValueAtTime(180, t + dur); }
    else {
      p.setValueAtTime(160, t);
      for (let x = t; x < t + dur - 0.001; x += period) { p.linearRampToValueAtTime(2600, x + period * 0.45); p.linearRampToValueAtTime(160, x + period); }
    }
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.006);
    g.gain.setValueAtTime(vol, t + dur - 0.02); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    a.connect(lp); b.connect(lp); lp.connect(g); g.connect(this.crush);
    a.start(t); b.start(t); a.stop(t + dur + 0.02); b.stop(t + dur + 0.02);
  }

  private lead(t: number, f: number, dur: number, vol: number) {
    const o = this.ac.createOscillator(), g = this.ac.createGain(), vib = this.ac.createOscillator(), vg = this.ac.createGain();
    o.setPeriodicWave(this.p25); o.frequency.value = f;
    vib.frequency.value = 6.5; vg.gain.setValueAtTime(0, t); vg.gain.linearRampToValueAtTime(f * 0.012, t + Math.min(dur, 0.25));
    vib.connect(vg); vg.connect(o.frequency);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.008);
    g.gain.setValueAtTime(vol * 0.8, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.crush);
    o.start(t); vib.start(t); o.stop(t + dur + 0.02); vib.stop(t + dur + 0.02);
    // a quiet echo three sixteenths later, like the old two-channel delay trick
    const e = this.ac.createOscillator(), eg = this.env(t + STEP * 3, vol * 0.3, dur * 0.8, 0.005);
    e.setPeriodicWave(this.p12); e.frequency.value = f;
    e.connect(eg); eg.connect(this.crush); e.start(t + STEP * 3); e.stop(t + STEP * 3 + dur);
  }

  private blip(t: number, f: number, vol: number) {
    const o = this.ac.createOscillator(), g = this.env(t, vol, 0.12);
    o.setPeriodicWave(this.p12); o.frequency.value = f;
    o.connect(g); g.connect(this.crush); o.start(t); o.stop(t + 0.14);
  }

  private arp(t: number, ch: number[], n: number, vol: number) {
    const notes = [ch[0], ch[1], ch[2], ch[0] + 12];
    const o = this.ac.createOscillator(), g = this.env(t, vol, STEP * 0.9, 0.002);
    o.setPeriodicWave(this.p12); o.frequency.value = hz(notes[n % 4] + 24);
    o.connect(g); g.connect(this.crush); o.start(t); o.stop(t + STEP);
  }
}
