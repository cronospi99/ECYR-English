/**
 * Taxi Rush — the soundtrack (ECYR rebuild).
 *
 * An original two-minute French-electro / psychedelic-disco track, played live
 * with Web Audio (no files): a saturated, filter-swept bass riff, chopped disco
 * string stabs, a dreamy phased lead with tape-style echo, soft pads, and a
 * four-on-the-floor beat that pumps everything else (sidechain). 118 BPM,
 * 60 bars ≈ 2 minutes, then it loops:
 *
 *   bars  0–7   intro      filtered loop, the bass opening up
 *   bars  8–23  verse      full beat, riff, stabs, lead motif A
 *   bars 24–39  chorus     open hats, claps, lead motif B an octave up
 *   bars 40–47  breakdown  no kick: pads, arpeggio, echoes, a riser
 *   bars 48–59  drop       everything, then the filter closes for the loop
 *
 * The melodies and progression are written for this game.
 */
export const BPM = 118;
export const STEP = 60 / BPM / 4;
export const BARS = 60;

// D minor. Two bars per chord: Dm – Bb – Gm – A (i–VI–iv–V), semitones from D2.
const CHORDS = [
  [0, 3, 7],
  [-4, 0, 3],
  [5, 8, 12],
  [7, 11, 14],
];
const ROOT = 73.42; // D2
const hz = (semi: number): number => ROOT * Math.pow(2, semi / 12);

// Bass riff over a bar (offsets from the chord root), null = rest.
const RIFF: (number | null)[] = [0, null, 12, 0, null, 10, 0, null, 12, null, 7, 0, 12, null, 10, 3];
// Lead motifs: [step in a 2-bar phrase, semitone from D4 (=24), length in steps]
const MOTIF_A: [number, number, number][] = [[0, 24, 3], [4, 27, 2], [6, 29, 4], [12, 27, 2], [14, 24, 2], [16, 22, 3], [20, 24, 2], [22, 27, 6]];
const MOTIF_B: [number, number, number][] = [[0, 36, 2], [2, 34, 2], [4, 31, 4], [10, 29, 2], [12, 31, 4], [16, 34, 2], [18, 36, 2], [20, 39, 4], [26, 36, 6]];
const ARP = [0, 7, 12, 15, 12, 7, 3, 7];

export class Soundtrack {
  private pump: GainNode;
  private bassFilter: BiquadFilterNode;
  private bassShaper: WaveShaperNode;
  private leadBus: GainNode;
  private phaser: BiquadFilterNode[] = [];
  private lfo: OscillatorNode;
  private delay: DelayNode;
  private reverb: ConvolverNode;
  private noise: AudioBuffer;
  private master: GainNode;

  constructor(private ac: AudioContext, out: AudioNode) {
    this.master = ac.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(out);
    // everything but the kick goes through the pump
    this.pump = ac.createGain();
    this.pump.connect(this.master);

    // reverb: a generated hall tail
    this.reverb = ac.createConvolver();
    const len = Math.floor(ac.sampleRate * 2.4);
    const ir = ac.createBuffer(2, len, ac.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.reverb.buffer = ir;
    const revGain = ac.createGain();
    revGain.gain.value = 0.28;
    this.reverb.connect(revGain);
    revGain.connect(this.pump);

    // the bass: saturated, then a sweeping low-pass
    this.bassShaper = ac.createWaveShaper();
    const curve = new Float32Array(1024);
    for (let i = 0; i < 1024; i++) { const x = (i / 1023) * 2 - 1; curve[i] = Math.tanh(x * 3.2) * 0.9; }
    this.bassShaper.curve = curve;
    this.bassShaper.oversample = '2x';
    this.bassFilter = ac.createBiquadFilter();
    this.bassFilter.type = 'lowpass';
    this.bassFilter.Q.value = 7;
    this.bassFilter.frequency.value = 300;
    this.bassShaper.connect(this.bassFilter);
    const bassGain = ac.createGain();
    bassGain.gain.value = 0.42;
    this.bassFilter.connect(bassGain);
    bassGain.connect(this.pump);

    // the lead: phaser (four all-passes swept by an LFO) → dotted-eighth echo → reverb
    this.leadBus = ac.createGain();
    this.leadBus.gain.value = 0.2;
    let node: AudioNode = this.leadBus;
    this.lfo = ac.createOscillator();
    this.lfo.frequency.value = 0.23;
    const lfoAmt = ac.createGain();
    lfoAmt.gain.value = 650;
    this.lfo.connect(lfoAmt);
    for (let i = 0; i < 4; i++) {
      const ap = ac.createBiquadFilter();
      ap.type = 'allpass';
      ap.frequency.value = 900 + i * 300;
      ap.Q.value = 0.7;
      lfoAmt.connect(ap.frequency);
      node.connect(ap);
      node = ap;
      this.phaser.push(ap);
    }
    const wet = ac.createGain(); wet.gain.value = 0.6;
    const dry = ac.createGain(); dry.gain.value = 0.7;
    node.connect(wet); this.leadBus.connect(dry);
    wet.connect(this.pump); dry.connect(this.pump);
    this.delay = ac.createDelay(1.5);
    this.delay.delayTime.value = STEP * 3;
    const fb = ac.createGain(); fb.gain.value = 0.38;
    const dl = ac.createBiquadFilter(); dl.type = 'lowpass'; dl.frequency.value = 2400;
    node.connect(this.delay);
    this.delay.connect(dl); dl.connect(fb); fb.connect(this.delay);
    const dGain = ac.createGain(); dGain.gain.value = 0.35;
    dl.connect(dGain); dGain.connect(this.pump);
    node.connect(this.reverb);
    this.lfo.start();

    const nl = ac.sampleRate;
    this.noise = ac.createBuffer(1, nl, ac.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nl; i++) nd[i] = Math.random() * 2 - 1;
  }

  dispose(): void {
    try { this.lfo.stop(); } catch { /* ignore */ }
    this.master.disconnect();
  }

  /** Schedule step `n` (sixteenths since the start) at audio time `t`. */
  step(n: number, t: number): void {
    const total = BARS * 16;
    const k = n % total;
    const bar = Math.floor(k / 16), s = k % 16;
    const chord = CHORDS[Math.floor(bar / 2) % 4];
    const intro = bar < 8, verse = bar >= 8 && bar < 24, chorus = bar >= 24 && bar < 40, brk = bar >= 40 && bar < 48, drop = bar >= 48;
    const lastBars = bar >= 58;

    // ---- drums
    const kick = !brk && s % 4 === 0;
    if (kick) { this.kick(t); this.duckPump(t); }
    if (!intro && !brk && (s === 4 || s === 12)) this.clap(t, chorus || drop ? 0.5 : 0.35);
    if (!brk && s % 2 === 1) this.hat(t, 0.06 + (s % 4 === 3 ? 0.03 : 0), 0.035);
    if ((chorus || drop) && s % 4 === 2) this.hat(t, 0.09, 0.22);
    if (brk && bar >= 46) this.riser(t, (bar - 46) * 16 + s);

    // ---- bass: filter opens through the intro, closes on the last two bars
    const open = intro ? 250 + (bar / 8) * 1400 : lastBars ? 1600 - ((bar - 58) * 16 + s) * 45 : chorus || drop ? 1900 : 1300;
    this.bassFilter.frequency.setTargetAtTime(Math.max(180, open), t, 0.05);
    const r = RIFF[s];
    if (!brk && r !== null) this.bass(chord[0] + r, t);
    if (brk && s === 0) this.pad(chord, t, STEP * 16);

    // ---- disco string stabs on the off-beats
    if ((verse || chorus || drop) && (s === 2 || s === 6 || s === 10 || (s === 14 && bar % 2 === 1))) this.stab(chord, t, chorus || drop ? 0.07 : 0.05);

    // ---- lead
    const phrase = (bar % 2) * 16 + s;
    const motif = verse ? MOTIF_A : chorus ? MOTIF_B : drop ? (bar % 4 < 2 ? MOTIF_A : MOTIF_B) : null;
    if (motif) for (const [st, semi, len] of motif) if (st === phrase) this.lead(semi, t, len);
    // breakdown arpeggio, dreamy and echoing
    if (brk && s % 2 === 0) this.lead(24 + chord[0] + ARP[(s / 2) % ARP.length], t, 2, 0.6);
  }

  /* ---------------------------------------------------------- voices */

  private duckPump(t: number): void {
    const g = this.pump.gain;
    g.cancelScheduledValues(t);
    g.setValueAtTime(0.32, t);
    g.linearRampToValueAtTime(1, t + STEP * 3.2);
  }

  private kick(t: number): void {
    const ac = this.ac, o = ac.createOscillator(), g = ac.createGain();
    o.frequency.setValueAtTime(160, t);
    o.frequency.exponentialRampToValueAtTime(42, t + 0.13);
    g.gain.setValueAtTime(0.95, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.32);
    o.connect(g); g.connect(this.master);
    o.start(t); o.stop(t + 0.35);
    this.noiseHit(t, 0.12, 0.012, 'highpass', 3000, this.master);
  }

  private clap(t: number, vol: number): void {
    for (const dt of [0, 0.011, 0.023]) this.noiseHit(t + dt, vol * (dt ? 0.6 : 1), 0.09, 'bandpass', 1500, this.pump, 0.9);
    this.noiseHit(t, vol * 0.25, 0.25, 'bandpass', 1300, this.reverb, 0.7);
  }

  private hat(t: number, vol: number, len: number): void {
    this.noiseHit(t, vol, len, 'highpass', 7500, this.pump);
  }

  private riser(t: number, i: number): void {
    const f = 800 + i * 220;
    this.noiseHit(t, 0.02 + i * 0.003, STEP * 1.1, 'bandpass', f, this.pump, 2);
  }

  private noiseHit(t: number, vol: number, dur: number, type: BiquadFilterType, freq: number, dest: AudioNode, q = 1): void {
    const ac = this.ac, src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = this.noise; f.type = type; f.frequency.value = freq; f.Q.value = q;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest);
    src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  private bass(semi: number, t: number): void {
    const ac = this.ac, g = ac.createGain();
    for (const [type, det] of [['sawtooth', -7], ['square', 6]] as const) {
      const o = ac.createOscillator();
      o.type = type; o.frequency.value = hz(semi); o.detune.value = det;
      o.connect(g); o.start(t); o.stop(t + STEP * 0.95);
    }
    g.gain.setValueAtTime(0.55, t);
    g.gain.setValueAtTime(0.5, t + STEP * 0.6);
    g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 0.95);
    g.connect(this.bassShaper);
  }

  private stab(chord: number[], t: number, vol: number): void {
    const ac = this.ac, g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = 1700; f.Q.value = 0.6;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 1.6);
    for (const iv of [...chord, chord[0] + 12]) {
      for (const det of [-9, 9]) {
        const o = ac.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = hz(iv + 24); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + STEP * 1.7);
      }
    }
    f.connect(g); g.connect(this.pump);
    const send = ac.createGain(); send.gain.value = 0.4; g.connect(send); send.connect(this.reverb);
  }

  private pad(chord: number[], t: number, dur: number): void {
    const ac = this.ac, g = ac.createGain(), f = ac.createBiquadFilter();
    f.type = 'lowpass'; f.frequency.setValueAtTime(600, t); f.frequency.linearRampToValueAtTime(2200, t + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.8); g.gain.setValueAtTime(0.06, t + dur - 0.6); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    for (const iv of [...chord, chord[0] + 12, chord[1] + 12]) {
      for (const det of [-12, 0, 12]) {
        const o = ac.createOscillator();
        o.type = 'sawtooth'; o.frequency.value = hz(iv + 12); o.detune.value = det;
        o.connect(f); o.start(t); o.stop(t + dur + 0.05);
      }
    }
    f.connect(g); g.connect(this.reverb); g.connect(this.pump);
  }

  private lead(semi: number, t: number, len: number, vol = 1): void {
    const ac = this.ac, g = ac.createGain(), f = ac.createBiquadFilter();
    const dur = STEP * len;
    f.type = 'lowpass'; f.Q.value = 4;
    f.frequency.setValueAtTime(3800, t); f.frequency.exponentialRampToValueAtTime(1100, t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.5 * vol, t + 0.015);
    g.gain.setValueAtTime(0.42 * vol, t + dur * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + dur);
    const f0 = hz(semi);
    for (const [type, det] of [['sawtooth', -6], ['square', 5], ['triangle', 1200]] as const) {
      const o = ac.createOscillator();
      o.type = type; o.frequency.value = f0; o.detune.value = det;
      // a touch of vibrato that comes in late, like a held synth note
      const vib = ac.createOscillator(), va = ac.createGain();
      vib.frequency.value = 5.2; va.gain.setValueAtTime(0, t); va.gain.linearRampToValueAtTime(f0 * 0.006, t + dur);
      vib.connect(va); va.connect(o.frequency);
      o.connect(f); o.start(t); o.stop(t + dur + 0.02); vib.start(t); vib.stop(t + dur + 0.02);
    }
    f.connect(g); g.connect(this.leadBus);
  }
}
