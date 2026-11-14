/**
 * Taxi Rush — sound. A retro arcade rock loop played live (power chords on a
 * crunchy pulse, a driving bass, noise drums), an engine that follows the
 * speed, and the effects. The music steps back under every effect.
 */
const BPM = 152;
const STEP = 60 / BPM / 4;
// E5 · C5 · D5 · A5 power chords, two bars each (semitones from E2)
const ROOTS = [0, -4, -2, 5];
const RIFF = [0, 0, 12, 0, 10, 0, 7, 0, 0, 0, 12, 0, 15, 12, 10, 7];
const LEAD = [[0, 24, 2], [3, 27, 2], [6, 29, 3], [10, 31, 2], [12, 29, 2], [14, 27, 2], [16, 24, 4], [22, 22, 2], [24, 24, 2], [26, 27, 2], [28, 24, 4]];
const hz = (s: number) => 82.41 * Math.pow(2, s / 12);

export class TaxiAudio {
  private ac: AudioContext | null = null;
  private out!: GainNode;
  private music!: GainNode;
  private duckG!: GainNode;
  private sfx!: GainNode;
  private engineOsc: OscillatorNode | null = null;
  private engineOsc2: OscillatorNode | null = null;
  private engineGain!: GainNode;
  private engineFilter!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private timer = 0;
  private step = 0;
  private next = 0;
  musicOn = true;

  private ctx(): AudioContext | null {
    if (this.ac) { if (this.ac.state === 'suspended') void this.ac.resume(); return this.ac; }
    const C = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    const ac = (this.ac = new C());
    this.out = ac.createGain(); this.out.gain.value = 0.8; this.out.connect(ac.destination);
    this.music = ac.createGain(); this.music.gain.value = 0.32;
    this.duckG = ac.createGain(); this.music.connect(this.duckG); this.duckG.connect(this.out);
    this.sfx = ac.createGain(); this.sfx.gain.value = 0.9; this.sfx.connect(this.out);
    const len = ac.sampleRate;
    this.noise = ac.createBuffer(1, len, ac.sampleRate);
    const d = this.noise.getChannelData(0);
    let v = 0;
    for (let i = 0; i < len; i++) { if (i % 3 === 0) v = Math.random() * 2 - 1; d[i] = v; }
    return ac;
  }

  start(): void {
    const ac = this.ctx(); if (!ac) return;
    if (!this.engineOsc) {
      this.engineGain = ac.createGain(); this.engineGain.gain.value = 0;
      this.engineFilter = ac.createBiquadFilter(); this.engineFilter.type = 'lowpass'; this.engineFilter.frequency.value = 600;
      this.engineOsc = ac.createOscillator(); this.engineOsc.type = 'sawtooth'; this.engineOsc.frequency.value = 40;
      this.engineOsc2 = ac.createOscillator(); this.engineOsc2.type = 'square'; this.engineOsc2.frequency.value = 20;
      this.engineOsc.connect(this.engineFilter); this.engineOsc2.connect(this.engineFilter);
      this.engineFilter.connect(this.engineGain); this.engineGain.connect(this.sfx);
      this.engineOsc.start(); this.engineOsc2.start();
    }
    if (!this.timer) { this.step = 0; this.next = ac.currentTime + 0.1; this.timer = window.setInterval(() => this.pump(), 25); }
  }

  stop(): void {
    window.clearInterval(this.timer); this.timer = 0;
    if (this.engineGain && this.ac) this.engineGain.gain.setTargetAtTime(0, this.ac.currentTime, 0.05);
  }

  close(): void {
    this.stop();
    try { this.engineOsc?.stop(); this.engineOsc2?.stop(); } catch { /* ignore */ }
    this.engineOsc = this.engineOsc2 = null;
    void this.ac?.close();
    this.ac = null;
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    if (this.ac) this.music.gain.setTargetAtTime(on ? 0.32 : 0, this.ac.currentTime, 0.1);
  }

  engine(speed: number, throttle: number): void {
    if (!this.ac || !this.engineOsc || !this.engineOsc2) return;
    const t = this.ac.currentTime, s = Math.min(1, Math.abs(speed) / 30);
    const gear = (s * 4) % 1;
    const f = 34 + s * 60 + gear * 30;
    this.engineOsc.frequency.setTargetAtTime(f, t, 0.05);
    this.engineOsc2.frequency.setTargetAtTime(f / 2, t, 0.05);
    this.engineFilter.frequency.setTargetAtTime(350 + s * 900 + throttle * 400, t, 0.08);
    this.engineGain.gain.setTargetAtTime(0.05 + throttle * 0.05 + s * 0.04, t, 0.1);
  }

  private duck(secs: number): void {
    if (!this.ac) return;
    const g = this.duckG.gain, t = this.ac.currentTime;
    g.cancelScheduledValues(t); g.setValueAtTime(g.value, t); g.linearRampToValueAtTime(0.25, t + 0.04);
    g.setValueAtTime(0.25, t + secs); g.linearRampToValueAtTime(1, t + secs + 0.5);
  }

  private tone(f: number, dur: number, type: OscillatorType, vol: number, delay = 0): void {
    const ac = this.ac; if (!ac) return;
    const t = ac.currentTime + delay, o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(this.sfx); o.start(t); o.stop(t + dur + 0.02);
  }

  private hit(t: number, vol: number, dur: number, type: BiquadFilterType, freq: number, dest: AudioNode): void {
    const ac = this.ac!; const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
    src.buffer = this.noise; f.type = type; f.frequency.value = freq;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f); f.connect(g); g.connect(dest); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
  }

  play(kind: 'pickup' | 'cash' | 'crash' | 'right' | 'wrong' | 'horn' | 'red' | 'tick' | 'go' | 'drift'): void {
    if (!this.ctx()) return;
    const t = this.ac!.currentTime;
    switch (kind) {
      case 'pickup': [523, 659, 784, 1047].forEach((f, i) => this.tone(f, 0.12, 'square', 0.12, i * 0.07)); this.duck(0.5); break;
      case 'cash': this.tone(1568, 0.08, 'square', 0.12); this.tone(2093, 0.3, 'square', 0.12, 0.08); this.hit(t, 0.2, 0.15, 'highpass', 5000, this.sfx); this.duck(0.5); break;
      case 'crash': this.hit(t, 0.6, 0.35, 'lowpass', 900, this.sfx); this.tone(70, 0.25, 'sawtooth', 0.25); break;
      case 'right': [660, 880, 1320].forEach((f, i) => this.tone(f, 0.14, 'triangle', 0.16, i * 0.08)); this.duck(0.6); break;
      case 'wrong': this.tone(220, 0.2, 'sawtooth', 0.14); this.tone(165, 0.35, 'sawtooth', 0.14, 0.16); this.duck(0.6); break;
      case 'horn': this.tone(392, 0.35, 'square', 0.1); this.tone(494, 0.35, 'square', 0.08); break;
      case 'red': this.tone(880, 0.1, 'square', 0.1); this.tone(880, 0.1, 'square', 0.1, 0.18); break;
      case 'tick': this.tone(1200, 0.04, 'square', 0.06); break;
      case 'go': [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.18, 'square', 0.12, i * 0.12)); this.duck(0.8); break;
      case 'drift': this.hit(t, 0.08, 0.25, 'bandpass', 2500, this.sfx); break;
    }
  }

  private pump(): void {
    const ac = this.ac; if (!ac) return;
    while (this.next < ac.currentTime + 0.14) { this.beat(this.step, this.next); this.next += STEP; this.step++; }
  }

  private beat(n: number, t: number): void {
    if (!this.musicOn) return;
    const ac = this.ac!, s = n % 16, bar = Math.floor(n / 16) % 8, root = ROOTS[Math.floor(bar / 2)];
    // drums: rock beat
    if (s === 0 || s === 8 || s === 10) { const o = ac.createOscillator(), g = ac.createGain(); o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12); g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); o.connect(g); g.connect(this.music); o.start(t); o.stop(t + 0.25); }
    if (s === 4 || s === 12) this.hit(t, 0.4, 0.16, 'bandpass', 1800, this.music);
    if (s % 2 === 0) this.hit(t, 0.08, 0.04, 'highpass', 7000, this.music);
    // bass + power-chord riff on a crunchy pulse
    const note = root + RIFF[s];
    const b = ac.createOscillator(), bg = ac.createGain(); b.type = 'square'; b.frequency.value = hz(note - 12);
    bg.gain.setValueAtTime(0.18, t); bg.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 0.95);
    b.connect(bg); bg.connect(this.music); b.start(t); b.stop(t + STEP);
    if (s % 4 === 0) for (const iv of [0, 7, 12]) {
      const o = ac.createOscillator(), g = ac.createGain(), f = ac.createBiquadFilter();
      o.type = 'sawtooth'; o.frequency.value = hz(root + iv + 12); f.type = 'lowpass'; f.frequency.value = 1800;
      g.gain.setValueAtTime(0.05, t); g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 3.6);
      o.connect(f); f.connect(g); g.connect(this.music); o.start(t); o.stop(t + STEP * 4);
    }
    // lead on the second half of the loop
    if (bar >= 4) {
      const ps = (bar % 2) * 16 + s;
      for (const [st, semi, len] of LEAD) if (st === ps) {
        const o = ac.createOscillator(), g = ac.createGain(); o.type = 'square'; o.frequency.value = hz(semi + 12);
        g.gain.setValueAtTime(0.07, t); g.gain.setValueAtTime(0.06, t + STEP * len * 0.7); g.gain.linearRampToValueAtTime(0.0001, t + STEP * len);
        o.connect(g); g.connect(this.music); o.start(t); o.stop(t + STEP * len + 0.02);
      }
    }
  }
}
