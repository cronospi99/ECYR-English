/* Class Wars — all sound is synthesized live with WebAudio (no audio files to download).
   Mix: sfx bus + music bus → glue compressor → limiter, with a shared convolution reverb and a
   ping-pong delay. The soundtrack is a small sequencer (lookahead scheduling) playing an
   arranged loop: drums, side-chained bass and pads, plucked arpeggios and a lead melody. */

let ctx: AudioContext | null = null;
let out: GainNode | null = null; // master (mute)
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let duck: GainNode | null = null; // side-chain target (pads + bass)
let verbSend: GainNode | null = null;
let delaySend: GainNode | null = null;
let noiseBuf: AudioBuffer | null = null;
const read = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const write = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };
let muted = read('cw:mute') === '1';
let musicOn = read('cw:music') !== '0';
const lastAt: Record<string, number> = {};

const MASTER = 0.8, MUSIC = 0.34;

export const isMuted = () => muted;
export function setMuted(m: boolean) {
  muted = m;
  write('cw:mute', m ? '1' : '0');
  if (out && ctx) out.gain.setTargetAtTime(m ? 0 : MASTER, ctx.currentTime, 0.03);
}
export const isMusicOn = () => musicOn;
export function setMusicOn(on: boolean) {
  musicOn = on;
  write('cw:music', on ? '1' : '0');
  if (musicBus && ctx) musicBus.gain.setTargetAtTime(on ? MUSIC : 0, ctx.currentTime, 0.2);
}

function impulse(c: AudioContext, seconds: number, decay: number) {
  const len = Math.floor(c.sampleRate * seconds);
  const buf = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
  }
  return buf;
}

/** Call from a user gesture (click / key) so browsers allow sound. */
export function unlockAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const c = new AC();
      ctx = c;
      out = c.createGain();
      out.gain.value = muted ? 0 : MASTER;
      const glue = c.createDynamicsCompressor();
      glue.threshold.value = -18; glue.ratio.value = 3; glue.attack.value = 0.01; glue.release.value = 0.2;
      const limit = c.createDynamicsCompressor();
      limit.threshold.value = -3; limit.ratio.value = 20; limit.attack.value = 0.002; limit.release.value = 0.1;
      out.connect(glue); glue.connect(limit); limit.connect(c.destination);
      sfxBus = c.createGain(); sfxBus.gain.value = 0.75; sfxBus.connect(out);
      musicBus = c.createGain(); musicBus.gain.value = musicOn ? MUSIC : 0; musicBus.connect(out);
      duck = c.createGain(); duck.connect(musicBus);
      // shared reverb + ping-pong delay
      const verb = c.createConvolver(); verb.buffer = impulse(c, 2.4, 3.2);
      verbSend = c.createGain(); verbSend.gain.value = 0.9; verbSend.connect(verb);
      const verbOut = c.createGain(); verbOut.gain.value = 0.35; verb.connect(verbOut); verbOut.connect(out);
      delaySend = c.createGain(); delaySend.gain.value = 1;
      const dl = c.createDelay(1), dr = c.createDelay(1), fb = c.createGain(), lp = c.createBiquadFilter();
      dl.delayTime.value = dr.delayTime.value = 60 / BPM * 0.75;
      fb.gain.value = 0.38; lp.type = 'lowpass'; lp.frequency.value = 3200;
      const pl = c.createStereoPanner(), pr = c.createStereoPanner(); pl.pan.value = -0.7; pr.pan.value = 0.7;
      delaySend.connect(dl); dl.connect(lp); lp.connect(dr); dr.connect(fb); fb.connect(dl);
      dl.connect(pl); dr.connect(pr); pl.connect(musicBus); pr.connect(musicBus);
      noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate);
      const nd = noiseBuf.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    }
    if (ctx.state === 'suspended') void ctx.resume();
    if (wantMusic && !timer) startLoop();
  } catch { /* no audio */ }
}

/* ------------------------------------------------------------ voices */
interface VoiceOpt { at?: number; dest?: AudioNode | null; verb?: number; pan?: number }

function env(g: GainNode, t: number, a: number, peak: number, d: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + a);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + d);
}
function route(node: AudioNode, o: VoiceOpt) {
  let n = node;
  if (o.pan && ctx) { const p = ctx.createStereoPanner(); p.pan.value = o.pan; node.connect(p); n = p; }
  n.connect(o.dest ?? sfxBus!);
  if (o.verb && verbSend && ctx) { const s = ctx.createGain(); s.gain.value = o.verb; n.connect(s); s.connect(verbSend); }
}

function tone(freq: number, dur: number, type: OscillatorType = 'sine', vol = 0.3, slideTo?: number, delay = 0, o: VoiceOpt = {}) {
  if (!ctx || muted) return;
  const t = (o.at ?? ctx.currentTime) + delay;
  const osc = ctx.createOscillator(), g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
  env(g, t, 0.008, vol, dur);
  osc.connect(g); route(g, { verb: 0.12, ...o });
  osc.start(t); osc.stop(t + dur + 0.05);
}

function noise(dur: number, vol = 0.3, freq = 1200, type: BiquadFilterType = 'lowpass', delay = 0, o: VoiceOpt = {}) {
  if (!ctx || muted || !noiseBuf) return;
  const t = (o.at ?? ctx.currentTime) + delay;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq;
  const g = ctx.createGain(); env(g, t, 0.003, vol, dur);
  src.connect(f); f.connect(g); route(g, { verb: 0.1, ...o });
  src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.05);
}

const throttle = (k: string, ms: number) => {
  const now = performance.now();
  if ((lastAt[k] ?? 0) > now - ms) return false;
  lastAt[k] = now;
  return true;
};
const chord = (fs: number[], dur: number, type: OscillatorType, vol: number, gap: number) => fs.forEach((f, i) => tone(f, dur, type, vol, undefined, i * gap, { verb: 0.3 }));

export const sfx = {
  shoot(kind: number, vol = 1) {
    if (!throttle('shoot' + kind, 45)) return;
    if (kind === 1) { noise(0.12, 0.28 * vol, 900, 'bandpass'); tone(160, 0.1, 'triangle', 0.14 * vol, 90); }
    else if (kind === 2) { tone(620, 0.08, 'sine', 0.13 * vol, 1100); tone(900, 0.05, 'sine', 0.06 * vol, 1400, 0.03); }
    else if (kind === 3) { tone(220, 0.16, 'square', 0.08 * vol, 110); noise(0.12, 0.14 * vol, 700); }
    else if (kind === 4) { tone(1400, 0.14, 'sawtooth', 0.06 * vol, 400); tone(700, 0.14, 'sine', 0.06 * vol, 300); }
    else if (kind === 6) tone(400, 0.22, 'triangle', 0.1 * vol, 760);
    else { noise(0.05, 0.12 * vol, 3000, 'highpass'); tone(880, 0.06, 'triangle', 0.08 * vol, 520); }
  },
  hit(vol = 1) { if (throttle('hit', 40)) { noise(0.09, 0.32 * vol, 2200, 'bandpass'); tone(220, 0.09, 'square', 0.07 * vol, 110); } },
  hurt() { if (throttle('hurt', 80)) { tone(320, 0.16, 'sawtooth', 0.12, 140); noise(0.1, 0.2, 1500); } },
  block() { if (throttle('block', 80)) { tone(1500, 0.12, 'sine', 0.12, 1900); tone(2250, 0.1, 'sine', 0.05, 2600, 0.02); } },
  ko() { tone(520, 0.12, 'square', 0.1, 260); tone(260, 0.38, 'sawtooth', 0.1, 60, 0.1); noise(0.4, 0.28, 900, 'lowpass', 0.05, { verb: 0.4 }); },
  koMe() { tone(400, 0.32, 'triangle', 0.18, 90, 0, { verb: 0.4 }); tone(200, 0.65, 'sine', 0.18, 50, 0.2, { verb: 0.4 }); },
  boom(vol = 1) { if (throttle('boom', 60)) { noise(0.5, 0.5 * vol, 520, 'lowpass', 0, { verb: 0.35 }); tone(110, 0.45, 'sine', 0.34 * vol, 38); } },
  gem(n = 0) { if (throttle('gem', 30)) { const f = 1100 + Math.min(n, 12) * 70; tone(f, 0.09, 'triangle', 0.11, f * 1.5); tone(f * 2, 0.12, 'sine', 0.04, undefined, 0.02, { verb: 0.4 }); } },
  box() { chord([523, 659, 784, 1047], 0.18, 'triangle', 0.1, 0.055); noise(0.25, 0.08, 5000, 'highpass', 0, { verb: 0.5 }); },
  trap() { tone(300, 0.32, 'sawtooth', 0.13, 80); noise(0.3, 0.2, 400); },
  correct(streak = 0) { const b = 660 + Math.min(streak, 8) * 35; tone(b, 0.12, 'triangle', 0.15, undefined, 0, { verb: 0.3 }); tone(b * 1.5, 0.24, 'triangle', 0.15, undefined, 0.09, { verb: 0.35 }); tone(b * 2, 0.2, 'sine', 0.05, undefined, 0.09, { verb: 0.5 }); },
  wrong() { tone(220, 0.18, 'square', 0.09, 180); tone(160, 0.32, 'square', 0.09, 120, 0.14); },
  buy() { chord([784, 988, 1319, 1568], 0.16, 'sine', 0.12, 0.05); },
  tick() { tone(1000, 0.05, 'square', 0.07); },
  go() { chord([523, 784, 1047], 0.35, 'sawtooth', 0.07, 0.08); noise(0.4, 0.12, 6000, 'highpass', 0.1, { verb: 0.6 }); },
  spawn() { tone(300, 0.28, 'sine', 0.12, 900, 0, { verb: 0.4 }); },
  teleport() { tone(900, 0.22, 'sine', 0.1, 300, 0, { verb: 0.5 }); tone(300, 0.28, 'sine', 0.1, 900, 0.12, { verb: 0.5 }); },
  power(ci: number) {
    if (!throttle('power', 60)) return;
    const f = 300 + (ci % 7) * 60;
    tone(f, 0.26, 'sawtooth', 0.07, f * 2.2, 0, { verb: 0.35 });
    tone(f * 1.5, 0.32, 'triangle', 0.09, f * 3, 0.05, { verb: 0.35 });
    noise(0.25, 0.08, 4000, 'highpass', 0.02, { verb: 0.4 });
  },
  /** Signature sounds for some teacher powers; false = use the generic one. */
  special(id: string): boolean {
    switch (id) {
      case 'freddy': sfx.whistle(); return true;
      case 'norvey': sfx.laser(); return true;
      case 'andres': chord([196, 247, 294, 392, 494], 0.6, 'triangle', 0.1, 0.018); noise(0.08, 0.15, 2500, 'bandpass'); return true;
      case 'sebastian': tone(620, 0.14, 'sawtooth', 0.06, 1150, 0, { verb: 0.2 }); tone(1150, 0.24, 'triangle', 0.07, 520, 0.12, { verb: 0.3 }); return true;
      case 'esteban': for (let i = 0; i < 7; i++) tone(300 + Math.random() * 1500, 0.04, 'square', 0.05, undefined, i * 0.045); return true;
      case 'sander': tone(250, 0.55, 'sawtooth', 0.09, 210, 0, { verb: 0.45 }); tone(375, 0.55, 'sawtooth', 0.05, 320, 0, { verb: 0.45 }); noise(0.4, 0.12, 1100, 'bandpass'); return true;
      case 'gabriel': case 'nataly': case 'julian': case 'valentina': case 'javier': case 'anny': case 'estephania': case 'liliana':
        noise(0.22, 0.2, 1400, 'bandpass'); tone(500, 0.18, 'sine', 0.06, 900); return true;
    }
    return false;
  },
  whistle() { tone(2400, 0.35, 'sine', 0.12, 2600); tone(2600, 0.22, 'sine', 0.08, 2400, 0.1); },
  laser() { tone(1800, 0.32, 'sawtooth', 0.07, 300, 0, { verb: 0.3 }); },
  status() { if (throttle('status', 100)) tone(700, 0.18, 'triangle', 0.08, 350); },
  end() { chord([523, 659, 784, 1047, 1319], 0.5, 'triangle', 0.12, 0.12); },
  click() { tone(820, 0.04, 'triangle', 0.06); },
};

/* ------------------------------------------------------------ soundtrack */
const BPM = 116;
const STEP = 60 / BPM / 4; // 16th note
const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
// vi–IV–I–V in D major (Bm, G, D, A): energetic and bright; each chord lasts one bar.
const PROG = [[59, 62, 66], [55, 59, 62], [50, 54, 57], [57, 61, 64]];
const BASS = [35, 31, 38, 33];
// Lead hook (16 steps per bar, -1 = rest), two bars repeated with variations.
const HOOK = [
  [78, -1, 76, -1, 74, -1, 71, -1, -1, 74, -1, 76, -1, -1, 78, -1],
  [79, -1, 78, -1, 74, -1, -1, 71, -1, -1, 74, -1, 71, -1, 69, -1],
  [74, -1, 76, -1, 78, -1, 81, -1, -1, 78, -1, 76, -1, -1, 74, -1],
  [76, -1, -1, 73, -1, -1, 69, -1, 71, -1, 73, -1, 76, -1, -1, -1],
];

let wantMusic = false;
let timer: ReturnType<typeof setInterval> | null = null;
let nextT = 0, step = 0;
let intensity = 0; // 0 menu, 1 game, 2 final countdown

export function playMusic(level: 0 | 1 | 2) {
  wantMusic = true;
  intensity = level;
  if (ctx && !timer) startLoop();
}
export function stopMusic() {
  wantMusic = false;
  if (timer) { clearInterval(timer); timer = null; }
}

function startLoop() {
  if (!ctx) return;
  nextT = ctx.currentTime + 0.12;
  step = 0;
  timer = setInterval(schedule, 25);
}

function schedule() {
  if (!ctx) return;
  while (nextT < ctx.currentTime + 0.12) {
    if (musicOn && !muted) playStep(step, nextT);
    // light swing on off-beat 16ths
    nextT += STEP * (step % 2 ? 0.92 : 1.08);
    step = (step + 1) % (16 * 16); // 16 bars
  }
}

function playStep(s: number, t: number) {
  const bar = Math.floor(s / 16), i = s % 16, ch = bar % 4;
  const section = Math.floor(bar / 4); // 0 intro, 1 verse, 2 chorus, 3 chorus+
  const full = intensity > 0 && section > 0;
  const big = intensity === 2 || (intensity > 0 && section >= 2);
  const o = { at: t, dest: musicBus };

  // drums
  if (intensity > 0 || i % 4 === 0) {
    if (i % 4 === 0 && (full || i === 0 || intensity === 0)) kick(t);
    if (full && (i === 4 || i === 12)) { noise(0.16, 0.32, 1800, 'bandpass', 0, { ...o, verb: 0.25 }); tone(190, 0.08, 'triangle', 0.12, 140, 0, o); }
    if (intensity > 0 && i % 2 === 0) noise(0.035, i % 4 === 2 ? 0.1 : 0.05, 8000, 'highpass', 0, { ...o, pan: 0.25 });
    if (big && i % 2 === 1) noise(0.02, 0.035, 9500, 'highpass', 0, { ...o, pan: -0.3 });
    if (big && i === 14 && bar % 4 === 3) noise(0.5, 0.12, 7000, 'highpass', 0, { ...o, verb: 0.6 }); // crash into next phrase
  }
  // pad: a held chord per bar (side-chained)
  if (i === 0) PROG[ch].forEach((m, k) => pad(mtof(m + 12), t, STEP * 16, k));
  // bass: driving 8ths
  if (intensity > 0 && section > 0 && i % 2 === 0) bass(mtof(BASS[ch] + (i % 8 === 6 ? 12 : 0)), t);
  // arp: chord tones in 16ths, through the delay
  if (i % (big ? 1 : 2) === 0) {
    const notes = PROG[ch];
    pluck(mtof(notes[(i / (big ? 1 : 2)) % 3] + 24 + (i >= 8 ? 12 : 0)), t, 0.05);
  }
  // lead hook in the chorus
  if (big) { const m = HOOK[ch][i]; if (m > 0) lead(mtof(m), t); }
}

function kick(t: number) {
  if (!ctx || !musicBus || !duck) return;
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
  env(g, t, 0.002, 0.9, 0.28);
  o.connect(g); g.connect(musicBus);
  o.start(t); o.stop(t + 0.35);
  noise(0.012, 0.25, 4000, 'highpass', 0, { at: t, dest: musicBus });
  // side-chain: dip pads + bass on every kick
  duck.gain.cancelScheduledValues(t);
  duck.gain.setValueAtTime(0.35, t);
  duck.gain.linearRampToValueAtTime(1, t + 0.22);
}

function pad(f: number, t: number, dur: number, k: number) {
  if (!ctx || !duck) return;
  const g = ctx.createGain(), lp = ctx.createBiquadFilter();
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(900, t); lp.frequency.linearRampToValueAtTime(intensity === 2 ? 3200 : 2000, t + dur * 0.5);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.045, t + 0.25); g.gain.setValueAtTime(0.045, t + dur - 0.2); g.gain.linearRampToValueAtTime(0.0001, t + dur);
  for (const det of [-9, 0, 9]) {
    const o = ctx.createOscillator(); o.type = 'sawtooth'; o.frequency.value = f; o.detune.value = det + k * 2;
    o.connect(lp); o.start(t); o.stop(t + dur + 0.05);
  }
  lp.connect(g); g.connect(duck);
  const s = ctx.createGain(); s.gain.value = 0.6; g.connect(s); s.connect(verbSend!);
}

function bass(f: number, t: number) {
  if (!ctx || !duck) return;
  const o = ctx.createOscillator(), sub = ctx.createOscillator(), lp = ctx.createBiquadFilter(), g = ctx.createGain();
  o.type = 'sawtooth'; o.frequency.value = f; sub.type = 'sine'; sub.frequency.value = f / 2;
  lp.type = 'lowpass'; lp.Q.value = 6; lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(220, t + 0.16);
  env(g, t, 0.005, 0.22, 0.2);
  o.connect(lp); sub.connect(lp); lp.connect(g); g.connect(duck);
  o.start(t); sub.start(t); o.stop(t + 0.3); sub.stop(t + 0.3);
}

function pluck(f: number, t: number, vol: number) {
  if (!ctx || !musicBus) return;
  const o = ctx.createOscillator(), g = ctx.createGain(), lp = ctx.createBiquadFilter();
  o.type = 'square'; o.frequency.value = f;
  lp.type = 'lowpass'; lp.frequency.setValueAtTime(5000, t); lp.frequency.exponentialRampToValueAtTime(700, t + 0.15);
  env(g, t, 0.003, vol, 0.17);
  o.connect(lp); lp.connect(g); g.connect(musicBus);
  const s = ctx.createGain(); s.gain.value = 0.5; g.connect(s); s.connect(delaySend!);
  o.start(t); o.stop(t + 0.25);
}

function lead(f: number, t: number) {
  if (!ctx || !musicBus) return;
  const g = ctx.createGain(), lp = ctx.createBiquadFilter(), vib = ctx.createOscillator(), vg = ctx.createGain();
  lp.type = 'lowpass'; lp.frequency.value = 3600;
  vib.frequency.value = 5.5; vg.gain.value = 6; vib.connect(vg);
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.06, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + STEP * 3.2);
  for (const [type, det] of [['sawtooth', -6], ['square', 6]] as const) {
    const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = det; vg.connect(o.detune);
    o.connect(lp); o.start(t); o.stop(t + STEP * 3.4);
  }
  vib.start(t); vib.stop(t + STEP * 3.4);
  lp.connect(g); g.connect(musicBus);
  const s1 = ctx.createGain(); s1.gain.value = 0.35; g.connect(s1); s1.connect(delaySend!);
  const s2 = ctx.createGain(); s2.gain.value = 0.4; g.connect(s2); s2.connect(verbSend!);
}
