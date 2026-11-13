/* Language Defenders — original soundtrack, synthesised from scratch.
   No samples and no third-party audio: every drum, growl bass, supersaw and bell is computed here,
   sample by sample, and written as WAV (then encoded to MP3 with ffmpeg).
     node scripts/defenders-soundtrack.mjs [outDir]
   Tracks: "Dead Signal" (melodic dubstep, 140 BPM), "Corridor Groove" (glitch hop, 105 BPM),
   "Moonrise" (menu theme, 90 BPM). */
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const SR = 44100, TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
let seed = 1234567;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296);
const noise = () => rnd() * 2 - 1;

class SVF {            // state-variable filter (TPT): lp, bp (normalised), hp
  constructor() { this.a = 0; this.b = 0; this.lp = 0; this.bp = 0; this.hp = 0; }
  run(x, fc, q) {
    const g = Math.tan(Math.PI * Math.min(fc, SR * 0.45) / SR), k = 1 / q;
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2, v3 = x - this.b;
    const v1 = a1 * this.a + a2 * v3, v2 = this.b + a2 * this.a + a3 * v3;
    this.a = 2 * v1 - this.a; this.b = 2 * v2 - this.b;
    this.lp = v2; this.bp = v1 * k; this.hp = x - k * v1 - v2;
    return this;
  }
}
const saw = (ph, dt) => {
  let v = 2 * ph - 1;
  if (ph < dt) { const t = ph / dt; v -= t + t - t * t - 1; } else if (ph > 1 - dt) { const t = (ph - 1) / dt; v -= t * t + t + t + 1; }
  return v;
};

class Song {
  constructor(bpm, bars, swing = 0) {
    this.bpm = bpm; this.bars = bars; this.swing = swing;
    this.s16 = 60 / bpm / 4; this.bar = this.s16 * 16;
    this.len = Math.round(this.bar * bars * SR); this.n = this.len + SR * 5;
    const mk = () => ({ L: new Float32Array(this.n), R: new Float32Array(this.n) });
    this.drums = mk(); this.bass = mk(); this.music = mk(); this.rev = mk(); this.dly = mk();
    this.duck = new Float32Array(this.n);
  }
  /** Time of 16th `step` in `bar` (odd 16ths are pushed late by the swing amount). */
  at(bar, step) { const s = Math.floor(step); return bar * this.bar + (step + (s % 2 ? this.swing : 0)) * this.s16; }
  put(bus, i, l, r) { if (i >= 0 && i < this.n) { bus.L[i] += l; bus.R[i] += r; } }

  kick(t, vel = 1, punch = 1) {
    const i0 = Math.round(t * SR); let ph = 0;
    for (let i = 0; i < SR * 0.42; i++) {
      const x = i / SR, f = 46 + 150 * punch * Math.exp(-x * 36) + 900 * Math.exp(-x * 400);
      ph += f / SR;
      let s = Math.sin(TAU * ph) * Math.exp(-x * 7.2) + (i < 90 ? noise() * 0.5 * (1 - i / 90) : 0);
      s = Math.tanh(s * 2.4) * 0.8 * vel;
      this.put(this.drums, i0 + i, s, s);
      if (i0 + i < this.n) this.duck[i0 + i] = Math.max(this.duck[i0 + i], vel * Math.exp(-x * 8.5));
    }
  }
  snare(t, vel = 1, big = false) {
    const i0 = Math.round(t * SR), f = new SVF(), h = new SVF(); let ph = 0;
    const len = big ? 0.5 : 0.26, dec = big ? 11 : 21;
    for (let i = 0; i < SR * len; i++) {
      const x = i / SR;
      ph += (178 + 70 * Math.exp(-x * 50)) / SR;
      const clap = big && (i % 480 < 200) && i < 1500 ? 1.5 : 1;
      const nz = f.run(h.run(noise(), 1400, 0.7).hp, 8200, 0.8).lp * Math.exp(-x * dec) * clap;
      let s = nz * 0.9 + Math.sin(TAU * ph) * Math.exp(-x * 26) * 0.7;
      s = Math.tanh(s * 2) * 0.72 * vel;
      const w = big ? 0.25 : 0.1, a = noise() * 0.12;
      this.put(this.drums, i0 + i, s * (1 + a), s * (1 - a));
      this.put(this.rev, i0 + i, s * w, s * w);
    }
  }
  hat(t, vel = 1, open = false, pan = 0) {
    const i0 = Math.round(t * SR), f = new SVF(), dec = open ? 16 : 95;
    for (let i = 0; i < SR * (open ? 0.3 : 0.07); i++) {
      const x = i / SR, s = f.run(noise(), 8200, 1.1).hp * Math.exp(-x * dec) * 0.32 * vel;
      this.put(this.drums, i0 + i, s * (1 - pan), s * (1 + pan));
    }
  }
  sub(t, dur, midi, vel = 1) {
    const i0 = Math.round(t * SR), f = mtof(midi), n = Math.floor(dur * SR); let ph = 0;
    for (let i = 0; i < n; i++) {
      const x = i / SR; ph += f / SR;
      const env = Math.min(1, x / 0.008) * Math.min(1, (dur - x) / 0.02);
      const s = Math.tanh(Math.sin(TAU * ph) * 1.4) * 0.3 * env * vel;
      this.put(this.bass, i0 + i, s, s);
    }
  }
  /** Talking FM growl: the LFO opens the FM index, the drive and morphs two formants (vowels). */
  growl(t, dur, midi, o = {}) {
    const p = { rate: 0, up: true, idx: 5, ratio: 1, drive: 5, v0: [380, 900], v1: [820, 1500], vel: 1, bend: 0, phase: 0, ...o };
    const i0 = Math.round(t * SR), n = Math.floor(dur * SR), f0 = mtof(midi), A = new SVF(), B = new SVF(), LP = new SVF(), HP = new SVF();
    let ph = 0, mph = 0, fb = 0;
    for (let i = 0; i < n; i++) {
      const x = i / SR, u = i / n;
      const l = p.rate ? 0.5 - 0.5 * Math.cos(TAU * p.rate * x + p.phase) : p.up ? u * u * (3 - 2 * u) : 1 - u * u;
      const f = f0 * Math.pow(2, (p.bend * Math.exp(-x * 26)) / 12), dt = f / SR;
      ph = (ph + dt) % 1; mph += (f * p.ratio) / SR;
      const mod = Math.sin(TAU * mph + fb * 0.7); fb = mod;
      let s = Math.sin(TAU * ph + p.idx * (0.2 + 0.8 * l) * mod) * 0.75 + saw(ph, dt) * 0.4 * (0.25 + 0.75 * l);
      s = Math.tanh(s * (1.4 + p.drive * l));
      A.run(s, p.v0[0] + (p.v1[0] - p.v0[0]) * l, 5.5); B.run(s, p.v0[1] + (p.v1[1] - p.v0[1]) * l, 7);
      let y = Math.tanh((s * 0.32 + A.bp * 1.7 + B.bp * 1.25) * 1.5);
      y = HP.run(LP.run(y, 4200 + 3600 * l, 0.8).lp, 95, 0.7).hp;
      const env = Math.min(1, x / 0.004) * Math.min(1, (dur - x) / 0.012), g = y * env * 0.62 * p.vel, w = 0.06 * Math.sin(x * 37);
      this.put(this.bass, i0 + i, g * (1 + w), g * (1 - w));
      this.put(this.rev, i0 + i, g * 0.05, g * 0.05);
    }
    this.sub(t, dur, midi > 40 ? midi - 12 : midi, p.vel * 0.8);
  }
  supersaw(t, dur, notes, o = {}) {
    const p = { vel: 1, c0: 900, c1: 2600, rel: 0.14, rev: 0.25, ...o };
    const i0 = Math.round(t * SR), n = Math.floor((dur + p.rel) * SR), FL = new SVF(), FR = new SVF(), v = [];
    for (const m of notes) for (const [c, pan] of [[-13, -0.8], [-6, -0.35], [0, 0], [7, 0.4], [14, 0.85]]) v.push({ dt: mtof(m + c / 100) / SR, ph: rnd(), pan });
    const g = (0.21 * p.vel) / Math.sqrt(notes.length);
    for (let i = 0; i < n; i++) {
      const x = i / SR; let l = 0, r = 0;
      for (const o2 of v) { o2.ph = (o2.ph + o2.dt) % 1; const s = saw(o2.ph, o2.dt); l += s * (1 - o2.pan) * 0.5; r += s * (1 + o2.pan) * 0.5; }
      const cut = p.c0 + (p.c1 - p.c0) * Math.min(1, x / dur), env = Math.min(1, x / 0.012) * (x > dur ? Math.max(0, 1 - (x - dur) / p.rel) : 1);
      l = FL.run(l, cut, 0.9).lp * env * g; r = FR.run(r, cut, 0.9).lp * env * g;
      this.put(this.music, i0 + i, l, r); this.put(this.rev, i0 + i, l * p.rev, r * p.rev);
    }
  }
  pluck(t, midi, vel = 1, pan = 0, send = 0.35) {
    const i0 = Math.round(t * SR), f = mtof(midi), dt = f / SR, F = new SVF(); let ph = rnd();
    for (let i = 0; i < SR * 0.55; i++) {
      const x = i / SR; ph = (ph + dt) % 1;
      const s = F.run(saw(ph, dt) * 0.7 + (ph < 0.5 ? 0.3 : -0.3), 260 + 5200 * vel * Math.exp(-x * 15), 2.2).lp * Math.exp(-x * 6.5) * Math.min(1, x / 0.002) * 0.26 * vel;
      this.put(this.music, i0 + i, s * (1 - pan), s * (1 + pan)); this.put(this.dly, i0 + i, s * send, s * send); this.put(this.rev, i0 + i, s * 0.2, s * 0.2);
    }
  }
  lead(t, dur, midi, o = {}) {
    const p = { vel: 1, from: midi, cut: 3600, send: 0.3, ...o };
    const i0 = Math.round(t * SR), n = Math.floor((dur + 0.09) * SR), F = new SVF(); let a = rnd(), b = rnd(), c = 0;
    for (let i = 0; i < n; i++) {
      const x = i / SR, gl = Math.min(1, x / 0.045), m = p.from + (midi - p.from) * gl + (x > 0.13 ? Math.sin(TAU * 5.6 * x) * 0.16 : 0), f = mtof(m);
      a = (a + (f * 1.0035) / SR) % 1; b = (b + (f * 0.9965) / SR) % 1; c = (c + f / 2 / SR) % 1;
      let s = saw(a, f / SR) * 0.5 + saw(b, f / SR) * 0.5 + Math.sin(TAU * c) * 0.35;
      const env = Math.min(1, x / 0.008) * (x > dur ? Math.max(0, 1 - (x - dur) / 0.09) : 1);
      s = F.run(s, p.cut * (0.55 + 0.45 * Math.exp(-x * 5)), 1.6).lp * env * 0.27 * p.vel;
      this.put(this.music, i0 + i, s, s); this.put(this.dly, i0 + i, s * p.send, s * p.send); this.put(this.rev, i0 + i, s * 0.22, s * 0.22);
    }
  }
  /** FM keys: `bell` rings long and glassy, otherwise a short electric-piano stab. */
  fm(t, notes, o = {}) {
    const p = { vel: 1, bell: false, pan: 0, ...o }, i0 = Math.round(t * SR), len = p.bell ? 2.4 : 0.7;
    for (const m of notes) {
      const f = mtof(m); let cp = 0, mp = 0, tp = 0;
      for (let i = 0; i < SR * len; i++) {
        const x = i / SR; cp += f / SR; mp += (f * (p.bell ? 3.5 : 1)) / SR; tp += (f * 14) / SR;
        const idx = p.bell ? 2.4 * Math.exp(-x * 2.6) : 1.5 * Math.exp(-x * 7);
        const s = Math.sin(TAU * cp + idx * Math.sin(TAU * mp) + (p.bell ? 0 : 0.35 * Math.exp(-x * 28) * Math.sin(TAU * tp))) * Math.exp(-x * (p.bell ? 2.1 : 5)) * Math.min(1, x / 0.003) * 0.19 * p.vel;
        this.put(this.music, i0 + i, s * (1 - p.pan), s * (1 + p.pan)); this.put(this.rev, i0 + i, s * (p.bell ? 0.55 : 0.2), s * (p.bell ? 0.55 : 0.2));
        if (p.bell) this.put(this.dly, i0 + i, s * 0.3, s * 0.3);
      }
    }
  }
  riser(t, dur, vel = 1, down = false) {
    const i0 = Math.round(t * SR), n = Math.floor(dur * SR), F = new SVF();
    for (let i = 0; i < n; i++) {
      const u = down ? 1 - i / n : i / n, s = F.run(noise(), 300 + 9000 * u * u, 3).bp * (down ? u : u * u) * 0.28 * vel, w = Math.sin(i / 900);
      this.put(this.music, i0 + i, s * (1 + w * 0.5), s * (1 - w * 0.5)); this.put(this.rev, i0 + i, s * 0.3, s * 0.3);
    }
  }

  /* ---- mixdown ---- */
  render(glitches = []) {
    const n = this.n, L = new Float32Array(n), R = new Float32Array(n);
    // reverb (Schroeder) and ping-pong delay on the send buses
    const comb = (src, d, fb, damp) => { const out = new Float32Array(n), buf = new Float32Array(d); let lp = 0, k = 0; for (let i = 0; i < n; i++) { const y = buf[k]; lp = y * (1 - damp) + lp * damp; buf[k] = src[i] + lp * fb; out[i] = y; k = (k + 1) % d; } return out; };
    const allp = (src, d, g) => { const out = new Float32Array(n), buf = new Float32Array(d); let k = 0; for (let i = 0; i < n; i++) { const b = buf[k], x = src[i] + b * g; out[i] = b - x * g; buf[k] = x; k = (k + 1) % d; } return out; };
    const verb = (src, off) => { let s = new Float32Array(n); for (const d of [1557, 1617, 1491, 1422, 1277, 1356]) { const c = comb(src, d + off, 0.83, 0.28); for (let i = 0; i < n; i++) s[i] += c[i] * 0.17; } return allp(allp(s, 225 + off, 0.5), 556 + off, 0.5); };
    const vl = verb(this.rev.L, 0), vr = verb(this.rev.R, 23);
    const D = Math.round(this.s16 * 3 * SR), dl = new Float32Array(n), dr = new Float32Array(n); let ll = 0, lr = 0;
    for (let i = 0; i < n; i++) {
      const fl = i >= D ? dr[i - D] : 0, fr = i >= D ? dl[i - D] : 0;
      ll += (fl - ll) * 0.35; lr += (fr - lr) * 0.35;
      dl[i] = this.dly.L[i] + ll * 0.46; dr[i] = (i >= D >> 1 ? this.dly.R[i - (D >> 1)] : 0) + lr * 0.46;
    }
    let dk = 0;
    for (let i = 0; i < n; i++) {
      dk += (this.duck[i] - dk) * (this.duck[i] > dk ? 0.05 : 0.0009);
      const g = 1 - 0.8 * Math.min(1, dk), gb = 1 - 0.6 * Math.min(1, dk);
      L[i] = this.drums.L[i] + this.bass.L[i] * gb + (this.music.L[i] + dl[i] * 0.8 + vl[i]) * g;
      R[i] = this.drums.R[i] + this.bass.R[i] * gb + (this.music.R[i] + dr[i] * 0.8 + vr[i]) * g;
    }
    // glitch edits on the mix: stutters (a slice repeated), gates and crushed bits
    for (const [kind, t, dur, arg] of glitches) {
      const a = Math.round(t * SR), len = Math.round(dur * SR);
      if (kind === 'stutter') { const sl = Math.round(len / arg); for (let i = sl; i < len; i++) { const k = a + (i % sl), f = Math.min(1, (i % sl) / 60) * Math.min(1, (sl - (i % sl)) / 60); L[a + i] = L[k] * f; R[a + i] = R[k] * f; } }
      else if (kind === 'gate') { const sl = len / arg; for (let i = 0; i < len; i++) if ((i % sl) / sl > 0.5) { L[a + i] *= 0.05; R[a + i] *= 0.05; } }
      else if (kind === 'crush') { for (let i = 0; i < len; i++) { const k = a + i - (i % arg); L[a + i] = Math.round(L[k] * 9) / 9; R[a + i] = Math.round(R[k] * 9) / 9; } }
      else if (kind === 'stop') { for (let i = len - 1; i >= 0; i--) { const u = i / len, src = a + Math.floor(len * (u - u * u * 0.5)); L[a + i] = L[src] * (1 - u * u); R[a + i] = R[src] * (1 - u * u); } }
    }
    // fold the tail back to the start so the loop is seamless, then glue and normalise
    for (let i = this.len; i < n; i++) { L[i - this.len] += L[i]; R[i - this.len] += R[i]; }
    const hl = new SVF(), hr = new SVF(); let peak = 0, sum = 0;
    for (let i = 0; i < this.len; i++) {
      L[i] = Math.tanh(hl.run(L[i], 30, 0.7).hp * 1.1); R[i] = Math.tanh(hr.run(R[i], 30, 0.7).hp * 1.1);
      peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i])); sum += L[i] * L[i] + R[i] * R[i];
    }
    const k = 0.95 / peak;
    return { L, R, len: this.len, k, rms: 20 * Math.log10(Math.sqrt(sum / (this.len * 2)) * k) };
  }
}

function save(song, glitches, file) {
  const { L, R, len, k, rms } = song.render(glitches), buf = Buffer.alloc(44 + len * 4);
  buf.write('RIFF', 0); buf.writeUInt32LE(36 + len * 4, 4); buf.write('WAVEfmt ', 8); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20); buf.writeUInt16LE(2, 22);
  buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28); buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34); buf.write('data', 36); buf.writeUInt32LE(len * 4, 40);
  for (let i = 0; i < len; i++) { buf.writeInt16LE(Math.round(L[i] * k * 32767), 44 + i * 4); buf.writeInt16LE(Math.round(R[i] * k * 32767), 46 + i * 4); }
  writeFileSync(file + '.wav', buf);
  execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', file + '.wav', '-codec:a', 'libmp3lame', '-b:a', '160k', file + '.mp3']);
  console.log(file.split('/').pop(), (len / SR).toFixed(1) + 's', 'rms', rms.toFixed(1), 'dBFS');
}

const _ = null;
/* Growl presets: vowels are [formant1, formant2] pairs the LFO morphs between. */
const YOI = { v0: [320, 2300], v1: [780, 1150], idx: 6, drive: 6 }, YAH = { v0: [420, 820], v1: [860, 1700], idx: 7, drive: 7, up: true };
const WUB = (rate) => ({ rate, v0: [300, 700], v1: [900, 1500], idx: 5, drive: 5 }), SCREECH = (rate) => ({ rate, ratio: 2, idx: 9, drive: 8, v0: [900, 2100], v1: [1500, 3200] });
const STAB = { up: false, idx: 8, drive: 7, bend: 12, v0: [700, 1300], v1: [300, 800] };

/* ============================ 1. Dead Signal — melodic dubstep ============================ */
function deadSignal() {
  const s = new Song(140, 40), b8 = s.s16 * 2, hz = (n) => 1 / (s.s16 * n);
  const roots = [41, 37, 44, 39], chords = [[53, 56, 60, 65], [49, 53, 56, 61], [56, 60, 63, 68], [51, 55, 58, 63]];
  const hook = [[72, _, 68, 72, 77, _, 75, _], [73, _, _, 72, 68, _, 65, _], [75, _, 72, 75, 80, _, 79, _], [70, _, _, 67, 70, 72, 75, 79]];
  const playHook = (bar, vel, oct = 0, cut = 3600) => { let prev = null; hook[bar % 4].forEach((n, i) => { if (n == null) return; let len = 1; while (i + len < 8 && hook[bar % 4][i + len] == null) len++; s.lead(s.at(bar, i * 2), b8 * len * 0.92, n + oct, { vel, from: prev ?? n + oct, cut }); prev = n + oct; }); };
  // growl phrases: [step, length in 16ths, preset, semitone offset]
  const P = [
    [[0, 4, YOI, 0], [4, 2, WUB(hz(1)), 0], [6, 2, STAB, 12], [10, 2, SCREECH(hz(0.5)), 12], [12, 4, WUB(hz(4 / 3)), 0]],
    [[0, 2, STAB, 0], [2, 2, STAB, 7], [4, 4, YAH, 0], [9, 3, WUB(hz(1)), 0], [12, 2, SCREECH(hz(1)), 12], [14, 2, STAB, 0]],
    [[0, 6, WUB(hz(2)), 0], [10, 6, YAH, 0]],
    [[0, 3, YOI, 0], [3, 1, STAB, 12], [4, 4, WUB(hz(1)), 0], [9, 1, STAB, 12], [10, 1, STAB, 10], [11, 1, STAB, 7], [12, 4, YOI, 0]],
  ];
  const glitches = [];
  for (let bar = 0; bar < 40; bar++) {
    const c = bar % 4, root = roots[c], ch = chords[c];
    const intro = bar < 8, brk = bar >= 24 && bar < 32, drop = !intro && !brk, second = bar >= 16;
    if (intro) {
      s.supersaw(s.at(bar, 0), s.bar * 0.98, ch, { vel: 0.75, c0: 300 + bar * 180, c1: 500 + bar * 330 });
      for (let i = 0; i < 16; i++) if (bar >= 2 || i % 4 === 0) s.pluck(s.at(bar, i), ch[[0, 2, 1, 3, 2, 1, 3, 2][i % 8]] + 12, 0.45 + bar * 0.05, i % 2 ? 0.5 : -0.5);
      if (bar >= 4) { playHook(bar, 0.55, 0, 2200); for (let i = 0; i < 8; i++) s.hat(s.at(bar, i * 2 + 1), 0.6, false, 0.3); s.sub(s.at(bar, 0), s.bar * 0.95, root - 12, 0.7); }
      if (bar === 6) s.riser(s.at(bar, 0), s.bar * 2 - s.s16 * 4, 1);
      if (bar === 7) { for (let i = 0; i < 8; i++) s.snare(s.at(bar, i), 0.35 + i * 0.05); for (let i = 16; i < 24; i++) s.snare(s.at(bar, i / 2), 0.55 + (i - 16) * 0.05); s.riser(s.at(bar, 12), s.s16 * 4, 1.2, true); }
    } else if (brk) {
      s.supersaw(s.at(bar, 0), s.bar * 0.98, ch, { vel: 0.9, c0: 1200, c1: 3200 + (bar - 24) * 300 });
      s.sub(s.at(bar, 0), s.bar * 0.95, root - 12, 0.75);
      playHook(bar, 0.95, bar >= 28 ? 12 : 0);
      for (let i = 0; i < 16; i += 2) s.pluck(s.at(bar, i), ch[(i / 2) % 4] + 12, 0.5, i % 4 ? 0.6 : -0.6);
      if (bar >= 28) { s.kick(s.at(bar, 0), 0.8); for (let i = 0; i < 16; i += bar === 31 ? 1 : 2) s.hat(s.at(bar, i), 0.5 + i * 0.03); }
      if (bar === 30) s.riser(s.at(bar, 0), s.bar * 2 - s.s16 * 2, 1.2);
      if (bar === 31) { for (let i = 0; i < 12; i++) s.snare(s.at(bar, 4 + i), 0.4 + i * 0.05); glitches.push(['stop', s.at(bar, 14), s.s16 * 2]); }
    } else {
      // halftime drums
      s.kick(s.at(bar, 0)); s.snare(s.at(bar, 8), 1, true);
      if (c % 2 === 1) s.kick(s.at(bar, 10), 0.85); if (c === 3) s.kick(s.at(bar, 14), 0.8); if (c === 2) s.kick(s.at(bar, 6), 0.7);
      for (let i = 0; i < 16; i += 2) s.hat(s.at(bar, i), i % 4 === 2 ? 0.9 : 0.55, i % 8 === 6, i % 4 ? 0.25 : -0.25);
      if (c === 1) for (let i = 0; i < 3; i++) s.hat(s.at(bar, 12 + (i * 4) / 3), 0.7);
      for (const [st, len, preset, off] of P[second && c === 0 ? 3 : (c + (bar >= 32 ? 1 : 0)) % 4]) s.growl(s.at(bar, st), s.s16 * len * 0.96, root + off, { ...preset, vel: 0.95 });
      if (second) { s.supersaw(s.at(bar, 0), s.s16 * 3, ch, { vel: 0.8, c0: 3000, c1: 1500 }); s.supersaw(s.at(bar, 6), s.s16 * 1.5, ch, { vel: 0.6, c0: 2600, c1: 1500 }); playHook(bar, 0.7, 12, 4200); }
      else if (c >= 2) playHook(bar, 0.6, 0, 3000);
      if (bar === 8 || bar === 16 || bar === 32) s.riser(s.at(bar, 0), s.bar * 0.5, 1.1, true);
      if (c === 3) glitches.push(bar % 8 === 7 ? ['stutter', s.at(bar, 12), s.s16 * 4, 8] : ['stutter', s.at(bar, 14), s.s16 * 2, 4]);
      if (bar === 19 || bar === 35) glitches.push(['crush', s.at(bar, 8), s.s16 * 4, 6]);
    }
  }
  return [s, glitches];
}

/* ============================ 2. Corridor Groove — glitch hop ============================ */
function corridorGroove() {
  const s = new Song(105, 32, 0.34), b8 = s.s16 * 2, hz = (n) => 1 / (s.s16 * n);
  const roots = [40, 40, 36, 36, 43, 43, 38, 38], chords = [[52, 55, 59, 62], [52, 55, 59, 62], [48, 52, 55, 59], [48, 52, 55, 59], [55, 59, 62, 66], [55, 59, 62, 66], [50, 54, 57, 60], [50, 54, 57, 64]];
  const hook = [[71, _, 76, _, 74, 71, _, 67], [69, _, _, 71, _, 67, 64, _], [67, _, 72, _, 76, _, 74, 72], [71, _, _, _, 67, 69, 71, 74], [74, _, 71, 74, 79, _, 78, _], [76, _, _, 74, 71, _, 67, _], [69, _, 74, _, 78, _, 76, 74], [76, _, _, _, _, 71, 74, 76]];
  const glitches = [];
  for (let bar = 0; bar < 32; bar++) {
    const c = bar % 8, root = roots[c], ch = chords[c], intro = bar < 4, B = bar >= 20 && bar < 28, turn = bar >= 28;
    // boom-bap drums with ghost notes
    if (!B || bar >= 24) { for (const k of intro ? [0, 10] : [0, 7, 10]) s.kick(s.at(bar, k), k === 7 ? 0.75 : 1, 0.8); s.snare(s.at(bar, 4), 0.95); s.snare(s.at(bar, 12), 1); if (!intro) s.snare(s.at(bar, 15), 0.3); }
    else { s.kick(s.at(bar, 0), 0.9, 0.8); s.snare(s.at(bar, 12), 0.8); }
    for (let i = 0; i < 16; i++) if (!intro || i % 2 === 0) s.hat(s.at(bar, i), [0.9, 0.3, 0.6, 0.35][i % 4] * (B ? 0.6 : 1), i % 8 === 6 && !intro, i % 2 ? 0.3 : -0.2);
    // electric-piano stabs on the off-beats
    for (const st of [2, 6, 11, 14]) if (!turn || st < 8) s.fm(s.at(bar, st), ch.map((n) => n + 12), { vel: st === 11 ? 0.6 : 0.8, pan: st % 4 ? 0.35 : -0.35 });
    // mid-tempo talking bass
    if (!intro) {
      const heavy = bar >= 12 && !B;
      if (B) { s.growl(s.at(bar, 0), s.s16 * 6, root, { ...WUB(hz(c % 2 ? 2 : 4)), vel: 0.8 }); s.growl(s.at(bar, 10), s.s16 * 4, root + 7, { ...YOI, vel: 0.7 }); }
      else {
        s.growl(s.at(bar, 0), s.s16 * 2.8, root, { ...YOI, vel: 0.95 });
        s.growl(s.at(bar, 3), s.s16 * 0.9, root + 12, { ...STAB, vel: 0.8 });
        s.growl(s.at(bar, 6), s.s16 * 1.9, root, { ...WUB(hz(1)), vel: 0.9 });
        s.growl(s.at(bar, 10), s.s16 * 1.8, root + (c % 2 ? 7 : 10), { ...(heavy ? SCREECH(hz(0.5)) : STAB), vel: 0.8 });
        s.growl(s.at(bar, 13), s.s16 * (c % 4 === 3 ? 2.9 : 1.4), root + (c % 2 ? 3 : 0), { ...YAH, vel: 0.9 });
      }
    } else s.sub(s.at(bar, 0), s.s16 * 6, root - 12, 0.7);
    // the hook: chopped lead, then doubled an octave up with plucks on the second pass
    if (bar >= 4 && !turn) {
      let prev = null;
      hook[c].forEach((n, i) => { if (n == null) return; let len = 1; while (i + len < 8 && hook[c][i + len] == null) len++; s.lead(s.at(bar, i * 2), b8 * Math.min(len, 2) * 0.8, n, { vel: B ? 0.6 : 0.9, from: prev ?? n, cut: 3000, send: 0.4 }); if (bar >= 12) s.pluck(s.at(bar, i * 2), n + 12, 0.6, i % 2 ? 0.6 : -0.6); prev = n; });
    }
    if (B) for (let i = 0; i < 16; i += 2) s.pluck(s.at(bar, i + 1), ch[(i / 2) % 4] + 24, 0.5, i % 4 ? -0.6 : 0.6);
    if (turn) { s.supersaw(s.at(bar, 8), s.s16 * 8, ch.map((n) => n + 12), { vel: 0.5 + (bar - 28) * 0.12, c0: 500, c1: 2400 + (bar - 28) * 500 }); if (bar === 30) s.riser(s.at(bar, 0), s.bar * 2 - s.s16 * 2, 0.9); }
    if (c % 4 === 3 && !intro) glitches.push(['stutter', s.at(bar, 12), s.s16 * 4, c === 7 ? 8 : 4]);
    if (c === 1 && bar > 4) glitches.push(['gate', s.at(bar, 8), s.s16 * 4, 4]);
    if (bar === 19 || bar === 31) glitches.push(['stop', s.at(bar, 14), s.s16 * 2]);
    if (bar === 9 || bar === 25) glitches.push(['crush', s.at(bar, 14), s.s16 * 2, 7]);
  }
  return [s, glitches];
}

/* ============================ 3. Moonrise — menu theme ============================ */
function moonrise() {
  const s = new Song(90, 24), b8 = s.s16 * 2, hz = (n) => 1 / (s.s16 * n);
  const roots = [38, 38, 34, 34, 41, 41, 36, 36], chords = [[50, 53, 57, 60], [50, 53, 57, 62], [46, 50, 53, 57], [46, 50, 53, 58], [53, 57, 60, 64], [53, 57, 60, 65], [48, 52, 55, 58], [48, 52, 55, 60]];
  const mel = [[69, _, 74, _, 77, _, 76, _], [74, _, _, 69, _, _, 72, _], [70, _, 74, _, 77, _, 79, _], [77, _, _, 74, _, _, _, _], [69, _, 72, _, 77, _, 81, _], [79, _, _, 77, _, _, 72, _], [76, _, 79, _, 84, _, 82, _], [81, _, _, 76, _, 79, 76, _]];
  const glitches = [];
  for (let bar = 0; bar < 24; bar++) {
    const c = bar % 8, ch = chords[c], full = bar >= 8;
    s.supersaw(s.at(bar, 0), s.bar * 0.98, ch, { vel: 0.7, c0: 500, c1: 1400 + (full ? 700 : 0), rev: 0.4 });
    s.sub(s.at(bar, 0), s.s16 * 7, roots[c] - 12, 0.7); s.sub(s.at(bar, 10), s.s16 * 4, roots[c] - 12, 0.55);
    mel[c].forEach((n, i) => { if (n != null) s.fm(s.at(bar, i * 2), [n], { bell: true, vel: 0.85, pan: i % 2 ? 0.3 : -0.3 }); });
    for (let i = 0; i < 16; i += 2) s.pluck(s.at(bar, i + (i % 4 ? 1 : 0)), ch[(i / 2) % 4] + 12, 0.38, i % 4 ? 0.6 : -0.6, 0.5);
    if (bar >= 4) { s.kick(s.at(bar, 0), 0.85, 0.7); s.snare(s.at(bar, 8), 0.7, true); if (c % 2) s.kick(s.at(bar, 11), 0.7, 0.7); for (let i = 0; i < 16; i += 2) s.hat(s.at(bar, i), i % 4 === 2 ? 0.7 : 0.35, false, i % 4 ? 0.3 : -0.3); }
    if (full) { s.growl(s.at(bar, 12), s.s16 * 3.8, roots[c], { ...WUB(hz(c % 2 ? 1 : 2)), vel: 0.55 }); if (c % 4 === 3) s.growl(s.at(bar, 4), s.s16 * 3, roots[c] + 7, { ...YOI, vel: 0.5 }); }
    if (bar >= 16) { let prev = null; mel[c].forEach((n, i) => { if (n == null) return; s.lead(s.at(bar, i * 2), b8 * 0.9, n - 12, { vel: 0.5, from: prev ?? n - 12, cut: 2200, send: 0.5 }); prev = n - 12; }); }
    if (c === 7) glitches.push(['stutter', s.at(bar, 14), s.s16 * 2, 4]);
    if (bar === 22) s.riser(s.at(bar, 0), s.bar * 2 - s.s16 * 2, 0.7);
  }
  return [s, glitches];
}

const out = process.argv[2] || 'public/defenders/music';
mkdirSync(out, { recursive: true });
for (const [name, make] of [['dead_signal', deadSignal], ['corridor_groove', corridorGroove], ['moonrise', moonrise]]) {
  if (process.argv[3] && process.argv[3] !== name) continue;
  const [song, glitches] = make();
  save(song, glitches, `${out}/${name}`);
}
