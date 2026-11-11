/* Catchy background loops for the class games, synthesized live with Web Audio (original tunes, no audio files).
   Usage: <script src="../_arcade/loopmusic.js" data-tune="sunny"></script> — adds a ♪ button (top-right) that
   turns the music on/off; the choice is remembered. Music starts on the first tap (browser autoplay rules). */
(function () {
  var KEY = 'arcade:music';
  var script = document.currentScript;
  var tuneName = (script && script.getAttribute('data-tune')) || 'sunny';
  var on = (function () { try { return localStorage.getItem(KEY) !== '0'; } catch (e) { return true; } })();

  // Note names → MIDI. "-" = rest, "." = hold.
  var BASE = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  function midi(n) { var m = /^([A-G]#?)(\d)$/.exec(n); return m ? 12 * (Number(m[2]) + 1) + BASE[m[1]] : null; }
  function hz(m) { return 440 * Math.pow(2, (m - 69) / 12); }
  function seq(s) { return s.trim().split(/\s+/); }

  // 16th-note grids, 64 steps (4 bars of 4/4). Drums: k = kick, s = snare, h = hat.
  var TUNES = {
    sunny: {
      bpm: 124,
      lead: seq('E5 - G5 - C6 - G5 - A5 . G5 - E5 - D5 - C5 - D5 - E5 - G5 - E5 - D5 - C5 . . - ' +
        'E5 - G5 - C6 - G5 - A5 . C6 - D6 - C6 - A5 - G5 . E5 - G5 . A5 - G5 . . - - -'),
      bass: seq('C3 - - - C3 - G2 - A2 - - - A2 - E2 - F2 - - - F2 - C3 - G2 - - - G2 - B2 - ' +
        'C3 - - - C3 - G2 - A2 - - - A2 - E2 - F2 - - - G2 - - - C3 - - - C3 - - -'),
      drums: seq('k - h - s - h - k - h k s - h - k - h - s - h - k - h k s - h h ' +
        'k - h - s - h - k - h k s - h - k - h - s - h - k h k h s - s s'),
      leadWave: 'square', bassWave: 'triangle'
    },
    groove: {
      bpm: 112,
      lead: seq('A4 - C5 - E5 - D5 C5 - A4 - G4 A4 . . - E5 - G5 - A5 - G5 E5 - D5 - C5 D5 . . - ' +
        'A4 - C5 - E5 - D5 C5 - A4 - G4 A4 . C5 D5 E5 - D5 - C5 - A4 - G4 - A4 . . . - -'),
      bass: seq('A2 - A2 A3 - A2 - - G2 - G2 G3 - G2 - - F2 - F2 F3 - F2 - - E2 - E2 E3 - G2 - - ' +
        'A2 - A2 A3 - A2 - - G2 - G2 G3 - G2 - - F2 - F2 F3 - F2 - - E2 - E2 G2 - E2 - -'),
      drums: seq('k - h h s - h - k k h - s - h h k - h h s - h - k - h k s - s h ' +
        'k - h h s - h - k k h - s - h h k - h h s - h - k h k h s s s s'),
      leadWave: 'sawtooth', bassWave: 'square'
    }
  };
  var tune = TUNES[tuneName] || TUNES.sunny;

  var ctx = null, master = null, noiseBuf = null, timer = null, step = 0, nextAt = 0;

  function init() {
    if (ctx) return;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain(); master.gain.value = 0.16; master.connect(ctx.destination);
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
    var d = noiseBuf.getChannelData(0);
    for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }

  function note(m, t, dur, wave, vol) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.type = wave; o.frequency.value = hz(m);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
  }
  function noise(t, dur, vol, hp) {
    var s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf; f.type = 'highpass'; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(master); s.start(t); s.stop(t + dur);
  }
  function kick(t) {
    var o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.9, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.2);
  }
  // How many 16ths a note lasts: itself plus following "." holds.
  function len(arr, i) { var n = 1; while (arr[(i + n) % arr.length] === '.') n++; return n; }

  function schedule() {
    var sixteenth = 60 / tune.bpm / 4;
    while (nextAt < ctx.currentTime + 0.12) {
      var i = step % 64, t = nextAt;
      var l = tune.lead[i], b = tune.bass[i], dr = tune.drums[i];
      var lm = l && midi(l); if (lm) note(lm, t, sixteenth * len(tune.lead, i) * 0.95, tune.leadWave, 0.09);
      var bm = b && midi(b); if (bm) note(bm, t, sixteenth * len(tune.bass, i) * 0.9, tune.bassWave, 0.22);
      if (dr === 'k') kick(t);
      else if (dr === 's') noise(t, 0.14, 0.35, 1200);
      else if (dr === 'h') noise(t, 0.04, 0.12, 7000);
      nextAt += sixteenth; step++;
    }
  }

  function play() {
    init(); if (!ctx) return;
    if (ctx.state === 'suspended') ctx.resume();
    if (timer) return;
    nextAt = ctx.currentTime + 0.05;
    timer = setInterval(schedule, 40);
  }
  function stop() { if (timer) { clearInterval(timer); timer = null; } }

  var btn = document.createElement('button');
  btn.type = 'button';
  btn.setAttribute('aria-label', 'Music on/off');
  btn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;width:44px;height:44px;border-radius:50%;border:3px solid #2A1A12;' +
    'background:#FFF7E8;color:#2A1A12;font:700 20px system-ui,sans-serif;cursor:pointer;box-shadow:3px 3px 0 #2A1A12;';
  function paint() { btn.textContent = on ? '♪' : '✕'; btn.title = on ? 'Music: on' : 'Music: off'; btn.setAttribute('aria-pressed', String(on)); }
  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    on = !on;
    try { localStorage.setItem(KEY, on ? '1' : '0'); } catch (err) { /* ignore */ }
    paint(); if (on) play(); else stop();
  });
  paint();
  function mount() { document.body.appendChild(btn); }
  if (document.body) mount(); else document.addEventListener('DOMContentLoaded', mount);

  // Autoplay needs a gesture: the first tap anywhere starts the music if it is on.
  window.addEventListener('pointerdown', function () { if (on) play(); }, { once: true });
  document.addEventListener('visibilitychange', function () {
    if (!ctx) return;
    if (document.hidden) ctx.suspend(); else if (on && timer) ctx.resume();
  });

  window.ArcadeMusic = { play: play, stop: stop, isOn: function () { return on; } };
})();
