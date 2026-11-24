/* Star Galactic Trivia - procedural sci-fi soundtrack + effects (Web Audio, no audio files, original material).
   Same approach as the other class games (_arcade/loopmusic.js): a look-ahead step sequencer, a round music button,
   a persistent on/off choice and start-on-first-gesture. Adds: tension layer, ducking under effects, sfx bank.
   API: SGTAudio.sfx(name, arg) | SGTAudio.tension(bool) | SGTAudio.play()/stop() | SGTAudio.isOn() | SGTAudio.log */
(function () {
  'use strict';
  var KEY = 'sgt:music';
  var on = (function () { try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } })();
  var ctx = null, master = null, musicBus = null, sfxBus = null, noiseBuf = null, timer = null;
  var step = 0, nextAt = 0, unlocked = false, tensionOn = false, tensionBus = null, duckUntil = 0, lastWagerTick = 0;
  var BPM = 100;
  var log = [];

  var BASE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function midi(n) { var m = /^([A-G]#?)(\d)$/.exec(n); return 12 * (Number(m[2]) + 1) + BASE[m[1]]; }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function F(n) { return hz(midi(n)); }

  // 4 bars, one chord per bar: Am - Fmaj7 - Cmaj7 - Em(add9)
  var CHORDS = [['A3', 'C4', 'E4', 'A4'], ['F3', 'A3', 'C4', 'E4'], ['C3', 'G3', 'B3', 'E4'], ['E3', 'G3', 'B3', 'F#4']];
  var ROOTS = ['A1', 'F1', 'C2', 'E2'];
  var ARP = [0, 2, 1, 3, 2, 1, 3, 2]; // chord-tone index per 8th note
  // Sparse heroic lead over 64 sixteenths ("-" rest, "." hold)
  var LEAD = ('E5 . . . - - A5 . . . G5 . E5 . . . ' +
    'F5 . . . - - A5 . C6 . . . A5 . . . ' +
    'G5 . . . - - E5 . G5 . . . C6 . . . ' +
    'B5 . . . G5 . E5 . - - - - - - - -').split(' ');

  function init() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    var comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -14; comp.ratio.value = 6; comp.attack.value = 0.005; comp.release.value = 0.2;
    master = ctx.createGain(); master.gain.value = 0.55; master.connect(comp); comp.connect(ctx.destination);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.5; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.9; sfxBus.connect(master);
    tensionBus = ctx.createGain(); tensionBus.gain.value = 0; tensionBus.connect(master);
    // slow space echo for the arpeggio
    var d = ctx.createDelay(1); d.delayTime.value = 60 / BPM * 0.75;
    var fb = ctx.createGain(); fb.gain.value = 0.35;
    var lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
    d.connect(lp); lp.connect(fb); fb.connect(d); lp.connect(musicBus);
    echoIn = d;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1.5, ctx.sampleRate);
    var ch = noiseBuf.getChannelData(0);
    for (var i = 0; i < ch.length; i++) ch[i] = Math.random() * 2 - 1;
  }
  var echoIn = null;

  // ---------------------------------------------------------------- primitives
  function tone(f, t, dur, type, vol, o) {
    o = o || {};
    var osc = ctx.createOscillator(), g = ctx.createGain(), out = o.bus || sfxBus;
    osc.type = type || 'sine'; osc.frequency.setValueAtTime(f, t);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, t + (o.slide || dur));
    if (o.detune) osc.detune.value = o.detune;
    var a = o.attack || 0.008;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    var node = osc;
    if (o.lp) { var fl = ctx.createBiquadFilter(); fl.type = 'lowpass'; fl.frequency.value = o.lp; osc.connect(fl); node = fl; }
    node.connect(g); g.connect(out);
    if (o.echo && echoIn) { var eg = ctx.createGain(); eg.gain.value = o.echo; g.connect(eg); eg.connect(echoIn); }
    osc.start(t); osc.stop(t + dur + 0.03);
  }
  function noise(t, dur, vol, o) {
    o = o || {};
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = o.type || 'highpass'; f.frequency.setValueAtTime(o.f || 4000, t);
    if (o.to) f.frequency.exponentialRampToValueAtTime(o.to, t + dur);
    f.Q.value = o.q || 0.7;
    g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + (o.attack || 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(o.bus || sfxBus); s.start(t); s.stop(t + dur + 0.02);
  }
  function kick(t, vol, bus) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(130, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.2);
    o.connect(g); g.connect(bus || musicBus); o.start(t); o.stop(t + 0.22);
  }
  function arpUp(notes, t, gap, type, vol, dur, echo) {
    notes.forEach(function (n, i) { tone(F(n), t + i * gap, dur || 0.2, type, vol, { echo: echo || 0 }); });
  }

  // ---------------------------------------------------------------- music
  function pad(chord, t, dur) {
    chord.forEach(function (n, i) {
      [-7, 7].forEach(function (det) {
        var o = ctx.createOscillator(), g = ctx.createGain(), f = ctx.createBiquadFilter();
        o.type = 'sawtooth'; o.frequency.value = F(n); o.detune.value = det;
        f.type = 'lowpass'; f.frequency.setValueAtTime(500, t); f.frequency.linearRampToValueAtTime(1100, t + dur * 0.5); f.frequency.linearRampToValueAtTime(500, t + dur);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(0.022, t + dur * 0.35); g.gain.linearRampToValueAtTime(0.0001, t + dur);
        o.connect(f); f.connect(g); g.connect(musicBus); o.start(t); o.stop(t + dur + 0.05);
      });
    });
  }
  function schedule() {
    var six = 60 / BPM / 4;
    while (nextAt < ctx.currentTime + 0.14) {
      var i = step % 64, bar = Math.floor(i / 16), s16 = i % 16, t = nextAt, chord = CHORDS[bar];
      if (s16 === 0) pad(chord, t, six * 16 * 1.02);
      // bass: pulse on 1, and a syncopated octave
      if (s16 === 0 || s16 === 6 || s16 === 10) {
        var rm = midi(ROOTS[bar]) + (s16 === 0 ? 0 : 12);
        tone(hz(rm), t, six * (s16 === 0 ? 5 : 2.5), 'triangle', 0.2, { bus: musicBus, lp: 600 });
      }
      // arpeggio on 8th notes, with space echo
      if (s16 % 2 === 0) {
        var an = chord[ARP[(s16 / 2) % 8]], hi = s16 % 8 === 6 ? 12 : 0;
        tone(hz(midi(an) + 12 + hi), t, six * 1.8, 'square', 0.03, { bus: musicBus, lp: 2200, echo: 0.55 });
      }
      // lead
      var l = LEAD[i];
      if (l && l !== '-' && l !== '.') {
        var n = 1; while (LEAD[(i + n) % 64] === '.') n++;
        tone(F(l), t, six * n * 0.95, 'triangle', 0.075, { bus: musicBus, attack: 0.03, echo: 0.5 });
      }
      // light drums: kick on beats 1 and 3, soft hats on off-8ths
      if (s16 === 0 || s16 === 8) kick(t, 0.38);
      if (s16 % 4 === 2) noise(t, 0.04, 0.05, { f: 8000, bus: musicBus });
      if (s16 === 12) noise(t, 0.12, 0.07, { f: 1800, bus: musicBus });
      // tension layer: low 16th ostinato + high ping on every beat, only while the clock is running out
      if (tensionOn) {
        tone(hz(midi(s16 % 4 === 0 ? 'A2' : 'E2') ), t, six * 0.9, 'sawtooth', 0.08, { bus: tensionBus, lp: 420 });
        if (s16 % 4 === 0) tone(F('A5'), t, 0.07, 'sine', 0.06, { bus: tensionBus });
      }
      nextAt += six; step++;
    }
  }
  function play() {
    if (!unlocked || !on) return;
    init(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (timer) return;
    nextAt = ctx.currentTime + 0.05;
    timer = setInterval(schedule, 40);
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  function setTension(v) {
    v = !!v; if (v === tensionOn) return;
    tensionOn = v;
    log.push({ name: v ? 'tensionOn' : 'tensionOff', at: Date.now() });
    if (!ctx) return;
    var t = ctx.currentTime;
    tensionBus.gain.cancelScheduledValues(t); tensionBus.gain.setTargetAtTime(v ? 1 : 0, t, v ? 0.4 : 0.15);
  }

  // Music goes down under effects and comes back after them.
  function duck(dur, depth) {
    if (!ctx) return;
    var t = ctx.currentTime, until = t + dur;
    musicBus.gain.cancelScheduledValues(t);
    musicBus.gain.setTargetAtTime(0.5 * (depth || 0.35), t, 0.02);
    musicBus.gain.setTargetAtTime(0.5, Math.max(until, duckUntil), 0.3);
    duckUntil = Math.max(until, duckUntil);
  }

  // ---------------------------------------------------------------- effects bank
  var FX = {
    start: function (t) { // hyperspace jump into the mission
      noise(t, 0.9, 0.3, { f: 300, to: 7000, type: 'bandpass', q: 1.2, attack: 0.6 });
      tone(70, t, 0.9, 'sawtooth', 0.12, { to: 1100, lp: 2500 });
      kick(t + 0.85, 0.9, sfxBus); tone(F('A3'), t + 0.85, 0.7, 'sine', 0.2);
      return 1.3;
    },
    select: function (t) { tone(520, t, 0.07, 'square', 0.07, { to: 700 }); return 0.12; },
    pick: function (t) { tone(660, t, 0.09, 'square', 0.08, { to: 990 }); tone(1320, t + 0.05, 0.12, 'sine', 0.05); return 0.2; },
    question: function (t) { // question card revealed
      tone(180, t, 0.3, 'sawtooth', 0.07, { to: 900, lp: 2400 });
      tone(F('E5'), t + 0.22, 0.3, 'triangle', 0.1, { echo: 0.4 }); tone(F('B5'), t + 0.3, 0.45, 'triangle', 0.09, { echo: 0.4 });
      noise(t, 0.25, 0.08, { f: 800, to: 6000, type: 'bandpass' });
      return 0.8;
    },
    answer: function (t) { tone(F('G5'), t, 0.35, 'sine', 0.12, { echo: 0.3 }); tone(F('C5'), t + 0.14, 0.6, 'sine', 0.12, { echo: 0.3 }); return 0.8; },
    swap: function (t) { noise(t, 0.2, 0.1, { f: 3000, to: 600, type: 'bandpass' }); tone(F('D5'), t + 0.1, 0.2, 'triangle', 0.09); tone(F('A5'), t + 0.2, 0.3, 'triangle', 0.09); return 0.5; },
    correct: function (t) {
      arpUp(['C5', 'E5', 'G5', 'C6'], t, 0.075, 'square', 0.07, 0.22, 0.3);
      tone(F('C6'), t + 0.3, 0.6, 'triangle', 0.1, { echo: 0.4 }); tone(F('E6'), t + 0.3, 0.6, 'sine', 0.06);
      noise(t + 0.28, 0.35, 0.06, { f: 7000 });
      return 1.0;
    },
    wrong: function (t) {
      tone(240, t, 0.45, 'sawtooth', 0.12, { to: 100, lp: 1200 }); tone(170, t + 0.14, 0.5, 'square', 0.09, { to: 70, lp: 900 });
      return 0.7;
    },
    tick: function (t) { tone(1000, t, 0.05, 'sine', 0.08); return 0.08; },
    timeup: function (t) { // time's up stinger
      kick(t, 1, sfxBus); noise(t, 0.5, 0.25, { f: 1500, to: 200, type: 'lowpass' });
      tone(F('A4'), t + 0.02, 0.22, 'sawtooth', 0.11, { lp: 1800 }); tone(F('F4'), t + 0.24, 0.22, 'sawtooth', 0.11, { lp: 1800 });
      tone(F('D#4'), t + 0.48, 0.7, 'sawtooth', 0.12, { to: 110, slide: 0.7, lp: 1500 }); tone(F('A3'), t + 0.48, 0.7, 'square', 0.07, { to: 55, slide: 0.7, lp: 900 });
      return 1.3;
    },
    trapHit: function (t) { // Sith trap: dark low hit + descending sweep
      tone(78, t, 1.1, 'sine', 0.5, { to: 32 }); kick(t, 1, sfxBus);
      noise(t, 0.9, 0.3, { f: 900, to: 90, type: 'lowpass' });
      tone(900, t + 0.05, 1.0, 'sawtooth', 0.12, { to: 55, slide: 1.0, lp: 1400 });
      tone(F('A2'), t + 0.1, 1.1, 'square', 0.07, { lp: 500 }); tone(F('D#3'), t + 0.1, 1.1, 'square', 0.06, { lp: 500 }); // tritone
      return 1.5;
    },
    wagerUp: function (t) { // chose to bet: rising
      tone(220, t, 0.35, 'triangle', 0.1, { to: 880 }); arpUp(['A4', 'C5', 'E5', 'A5'], t + 0.08, 0.06, 'square', 0.05, 0.12, 0.3);
      return 0.5;
    },
    wagerTick: function (t, ratio) { // wager amount changed
      var r = Math.max(0, Math.min(1, +ratio || 0)); tone(440 + r * 660, t, 0.05, 'triangle', 0.07); return 0.07;
    },
    wagerConfirm: function (t) { // spin the wheel: confirm
      tone(880, t, 0.09, 'square', 0.08); tone(1320, t + 0.09, 0.3, 'square', 0.08, { echo: 0.3 });
      noise(t, 0.25, 0.07, { f: 6000 }); tone(F('A2'), t, 0.4, 'sine', 0.18, { to: 60 });
      return 0.5;
    },
    spinTick: function (t) { tone(220 + Math.random() * 300, t, 0.05, 'square', 0.04); return 0.06; },
    wagerWin: function (t) { FX.correct(t); noise(t + 0.1, 0.4, 0.08, { f: 9000 }); return 1.1; },
    wagerLose: function (t) { tone(330, t, 0.9, 'sawtooth', 0.1, { to: 60, lp: 1200 }); noise(t, 0.4, 0.1, { f: 1200, to: 150, type: 'lowpass' }); return 1.0; },
    double: function (t) { // x2 / x3 "daily double"
      tone(200, t, 0.55, 'sawtooth', 0.09, { to: 1600, lp: 3000 }); noise(t, 0.5, 0.1, { f: 500, to: 8000, type: 'bandpass' });
      [['A4', 'C#5', 'E5'], ['A5', 'C#6', 'E6']].forEach(function (c, k) { c.forEach(function (n) { tone(F(n), t + 0.5 + k * 0.16, 0.5, 'square', 0.04, { echo: 0.3, lp: 3000 }); }); });
      arpUp(['A5', 'C#6', 'E6', 'A6'], t + 0.85, 0.06, 'triangle', 0.07, 0.25, 0.4);
      return 1.5;
    },
    steal: function (t) { // sneaky grab
      arpUp(['E3', 'F3', 'E3', 'D#3'], t, 0.09, 'square', 0.07, 0.12, 0); noise(t + 0.3, 0.3, 0.1, { f: 4000, to: 500, type: 'bandpass' });
      tone(F('B4'), t + 0.4, 0.25, 'sawtooth', 0.07, { to: 160, lp: 1500 }); return 0.9;
    },
    turn: function (t) { tone(F('E5'), t, 0.1, 'sine', 0.09); tone(F('A5'), t + 0.1, 0.22, 'sine', 0.09, { echo: 0.25 }); return 0.4; },
    close: function (t) { tone(600, t, 0.12, 'triangle', 0.07, { to: 300 }); return 0.2; },
    reset: function (t) { noise(t, 0.5, 0.15, { f: 6000, to: 300, type: 'bandpass' }); tone(600, t, 0.5, 'sawtooth', 0.06, { to: 90, lp: 1800 }); return 0.7; },
    victory: function (t) { // final fanfare
      [['G4', 0], ['C5', 0.14], ['E5', 0.28], ['G5', 0.42]].forEach(function (p) { tone(F(p[0]), t + p[1], 0.22, 'square', 0.07, { lp: 3500, echo: 0.3 }); });
      ['C5', 'E5', 'G5', 'C6'].forEach(function (n) { tone(F(n), t + 0.6, 1.8, 'sawtooth', 0.045, { lp: 2800, attack: 0.02 }); });
      tone(F('C3'), t + 0.6, 1.8, 'triangle', 0.2); kick(t + 0.6, 0.8, sfxBus);
      noise(t + 0.6, 1.4, 0.1, { f: 6000 });
      arpUp(['C6', 'E6', 'G6', 'C7', 'G6', 'E6', 'C7'], t + 1.2, 0.09, 'sine', 0.06, 0.4, 0.5);
      return 3.0;
    }
  };
  var DUCK = { start: 0.15, trapHit: 0.2, timeup: 0.25, victory: 0.12, correct: 0.4, wrong: 0.4, double: 0.3, question: 0.5, wagerWin: 0.4, wagerLose: 0.4, wagerConfirm: 0.5, steal: 0.45, wagerUp: 0.6, answer: 0.6, reset: 0.5, swap: 0.6, turn: 0.7 };

  function sfx(name, arg) {
    var fn = FX[name];
    log.push({ name: name, at: Date.now(), played: !!(fn && ctx && on) });
    if (log.length > 400) log.shift();
    if (!fn || !ctx || !on || !unlocked) return;
    try {
      if (ctx.state === 'suspended') ctx.resume();
      if (name === 'wagerTick') { var n = ctx.currentTime; if (n - lastWagerTick < 0.04) return; lastWagerTick = n; }
      var dur = fn(ctx.currentTime + 0.01, arg) || 0.3;
      if (DUCK[name] != null) duck(dur, DUCK[name]);
    } catch (e) { /* never break the game for a sound */ }
  }

  // ---------------------------------------------------------------- button + unlock
  var btn = document.createElement('button');
  btn.type = 'button'; btn.id = 'sgt-music';
  btn.setAttribute('aria-label', 'Music and sound on/off');
  var FLOAT = 'position:fixed;right:max(12px,env(safe-area-inset-right));top:max(12px,env(safe-area-inset-top));z-index:2147483600;';
  var INLINE = 'position:static;flex:none;';
  var COMMON = 'width:34px;height:34px;border-radius:10px;border:1px solid rgba(110,200,255,.85);background:rgba(8,20,64,.82);color:#dff3ff;' +
    'font:700 17px Orbitron,system-ui,sans-serif;cursor:pointer;box-shadow:0 0 10px rgba(60,170,255,.5);padding:0;line-height:1;';
  btn.style.cssText = FLOAT + COMMON;
  // In the game screen the button lives in the top bar next to the existing controls (never over the board);
  // on the cover screen (no top bar) it floats top-right.
  function place() {
    var reset = null, bs = document.querySelectorAll('button');
    for (var i = 0; i < bs.length; i++) if (bs[i] !== btn && /RESET GAME/.test(bs[i].textContent)) { reset = bs[i]; break; }
    if (reset && reset.parentNode && !document.querySelector('.sg-front')) {
      if (btn.parentNode !== reset.parentNode) reset.parentNode.insertBefore(btn, reset.nextSibling);
      if (btn.getAttribute('data-in') !== '1') { btn.style.cssText = INLINE + COMMON; btn.setAttribute('data-in', '1'); paint(); }
    } else {
      if (btn.parentNode !== document.body) document.body.appendChild(btn);
      if (btn.getAttribute('data-in') === '1') { btn.style.cssText = FLOAT + COMMON; btn.removeAttribute('data-in'); paint(); }
    }
  }
  function paint() { btn.textContent = on ? '♪' : '✕'; btn.title = on ? 'Music: on' : 'Music: off'; btn.setAttribute('aria-pressed', String(on)); btn.style.opacity = on ? '1' : '.7'; }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    on = !on;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (err) { /* ignore */ }
    paint();
    if (on) { unlocked = true; play(); } else stop();
  });
  paint();
  function mount() { place(); setInterval(place, 400); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  function unlock() { unlocked = true; init(); if (on) play(); }
  window.addEventListener('pointerdown', unlock, { once: true, capture: true });
  window.addEventListener('keydown', unlock, { once: true, capture: true });
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (on) ctx.resume();
  });

  window.SGTAudio = {
    play: play, stop: stop, isOn: function () { return on; }, sfx: sfx, tension: setTension,
    log: log, names: Object.keys(FX)
  };
})();
