/* Word Rain — type the English for the falling Spanish words. */
(function () {
  'use strict';
  var A = window.Arcade;
  var $ = A.$;
  var TOTAL = 30;
  var LIVES = 5;
  var LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];
  // Seconds a word takes to fall at the start (longer phrases at higher levels).
  var FALL = { A1: 11, A2: 12, B1: 13, B2: 14, C1: 15.5 };

  /** Compares answers: no accents/punctuation, no leading "to"/article. */
  function key(s) {
    return A.norm(s).replace(/^(to|the|a|an) /, '');
  }
  var DATA = {};
  LEVELS.forEach(function (lv) {
    DATA[lv] = window.RAIN_DATA[lv].map(function (line) {
      var p = line.split('|');
      var en = p[1].split('/').map(function (x) {
        return x.trim();
      });
      return { es: p[0], en: en, keys: en.map(key) };
    });
  });

  var level = A.load('rain:level', 'A1');
  if (LEVELS.indexOf(level) < 0) level = 'A1';

  A.bindMute($('#muteBtn'));
  function paintNote() {
    $('#levelNote').textContent = A.LEVEL_NOTES[level] + ' · ' + DATA[level].length + ' palabras';
  }
  A.segmented($('#levelSeg'), {
    items: LEVELS.map(function (l) {
      return { id: l, label: l };
    }),
    value: level,
    onChange: function (l) {
      level = l;
      A.save('rain:level', l);
      paintNote();
    },
  });
  paintNote();

  // -------------------------------------------------------------- round ----
  var st = null;
  var raf = 0;
  var sky = $('#sky');
  var input = $('#input');

  function startRound() {
    if (st) clearDrops();
    st = {
      queue: A.shuffle(DATA[level]).slice(0, TOTAL),
      qi: 0,
      drops: [],
      uid: 0,
      lives: LIVES,
      score: 0,
      cleared: 0,
      resolved: 0,
      spawnIn: 0.6,
      running: false,
      over: false,
      missed: [],
      last: 0,
      wave: 1,
    };
    document.body.classList.add('playing');
    A.show('play');
    $('#pauseBtn').hidden = false;
    input.value = '';
    paintHud();
    A.startRound({ level: level, meta: { game: 'word-rain', words: TOTAL } });
    resume();
    setTimeout(function () {
      input.focus({ preventScroll: true });
    }, 60);
  }

  function speed() {
    // Gets faster with every word caught, up to about twice the start speed.
    return Math.min(2.1, 1 + st.cleared * 0.04);
  }
  function spawnGap() {
    return Math.max(1.15, 2.7 - st.cleared * 0.065);
  }

  function paintHud() {
    var h = '';
    for (var i = 0; i < LIVES; i++) h += i < st.lives ? '❤️' : '<span class="lost">❤️</span>';
    $('#lives').innerHTML = h;
    $('#lives').setAttribute('aria-label', st.lives + ' vidas');
    $('#left').textContent = TOTAL - st.resolved;
    $('#score').textContent = st.score;
  }

  function spawn() {
    if (st.qi >= st.queue.length) return;
    var w = st.queue[st.qi++];
    var el = document.createElement('div');
    el.className = 'drop';
    el.textContent = w.es;
    sky.appendChild(el);
    var W = sky.clientWidth;
    var ew = el.offsetWidth;
    var x = 8 + Math.random() * Math.max(0, W - ew - 16);
    // Avoid stacking on the previous drop.
    var prev = st.drops[st.drops.length - 1];
    if (prev && prev.y < 0.2 && Math.abs(prev.x - x) < ew) x = (x + W / 2) % Math.max(1, W - ew - 8);
    var d = { id: ++st.uid, w: w, el: el, x: x, y: 0, h: el.offsetHeight };
    st.drops.push(d);
    place(d);
  }

  function place(d) {
    var H = sky.clientHeight - 30;
    d.el.style.transform = 'translate(' + d.x + 'px,' + (d.y * (H - d.h) - 0) + 'px)';
    d.el.classList.toggle('near', d.y > 0.55 && d.y <= 0.8);
    d.el.classList.toggle('danger', d.y > 0.8);
  }

  function tick(now) {
    if (!st || !st.running) return;
    var dt = Math.min(0.05, (now - st.last) / 1000);
    st.last = now;
    st.spawnIn -= dt;
    if (st.spawnIn <= 0 && st.qi < st.queue.length) {
      if (st.drops.length < 6) spawn();
      st.spawnIn = spawnGap();
    }
    var v = speed() / FALL[level];
    for (var i = st.drops.length - 1; i >= 0; i--) {
      var d = st.drops[i];
      d.y += v * dt;
      if (d.y >= 1) {
        miss(d);
        if (st.over) return;
      } else place(d);
    }
    // Nothing left to fall: spawn the next one now instead of waiting.
    if (!st.drops.length && st.qi < st.queue.length) st.spawnIn = Math.min(st.spawnIn, 0.25);
    raf = requestAnimationFrame(tick);
  }

  function removeDrop(d, cls) {
    st.drops = st.drops.filter(function (x) {
      return x !== d;
    });
    d.el.classList.add(cls);
    setTimeout(function () {
      d.el.remove();
    }, 520);
  }

  function miss(d) {
    removeDrop(d, 'splash');
    A.answer(d.id, false, 'vocabulary');
    st.lives--;
    st.resolved++;
    st.missed.push(d.w);
    A.sfx('drop');
    A.toast('💦 <b>' + A.esc(d.w.es) + '</b> = ' + A.esc(d.w.en[0]), 1800);
    A.flash(sky, 'shake');
    paintHud();
    if (st.lives <= 0 || st.resolved >= TOTAL) finish();
  }

  function hit(d) {
    removeDrop(d, 'gone');
    A.answer(d.id, true, 'vocabulary');
    var pts = 10 + Math.round((1 - d.y) * 10);
    st.score += pts;
    st.cleared++;
    st.resolved++;
    var p = document.createElement('div');
    p.className = 'pts';
    p.textContent = '+' + pts;
    var H = sky.clientHeight - 30;
    p.style.left = d.x + 10 + 'px';
    p.style.top = d.y * (H - d.h) + 'px';
    sky.appendChild(p);
    setTimeout(function () {
      p.remove();
    }, 800);
    A.sfx('ok');
    if (st.cleared % 10 === 0 && st.resolved < TOTAL) {
      st.wave++;
      var wv = document.createElement('div');
      wv.className = 'wave';
      wv.textContent = '⚡ ¡Más rápido!';
      sky.appendChild(wv);
      setTimeout(function () {
        wv.remove();
      }, 1600);
      A.sfx('combo');
    }
    paintHud();
    if (st.resolved >= TOTAL) finish();
  }

  /** Lowest matching drop for the typed text, or null. */
  function match(text) {
    var k = key(text);
    if (!k) return null;
    var best = null;
    st.drops.forEach(function (d) {
      if (d.w.keys.indexOf(k) >= 0 && (!best || d.y > best.y)) best = d;
    });
    return best;
  }
  /** True when some falling word has a longer answer that starts with the text. */
  function couldGrow(text) {
    var k = key(text);
    return st.drops.some(function (d) {
      return d.w.keys.some(function (x) {
        return x.length > k.length && x.indexOf(k) === 0;
      });
    });
  }

  function onType() {
    if (!st || !st.running) return;
    var t = input.value;
    A.$$('.drop.target', sky).forEach(function (e) {
      e.classList.remove('target');
    });
    var k = key(t);
    if (k)
      st.drops.forEach(function (d) {
        if (
          d.w.keys.some(function (x) {
            return x.indexOf(k) === 0;
          })
        )
          d.el.classList.add('target');
      });
    var m = match(t);
    if (m && !couldGrow(t)) {
      hit(m);
      input.value = '';
    }
  }

  function submit(e) {
    if (e) e.preventDefault();
    if (!st || !st.running) return;
    var m = match(input.value);
    if (m) {
      hit(m);
      input.value = '';
    } else if (input.value.trim()) {
      A.sfx('bad');
      A.flash(input, 'shake');
      input.select();
    }
    input.focus({ preventScroll: true });
  }

  function resume() {
    if (!st || st.over) return;
    st.running = true;
    sky.classList.remove('paused');
    var pm = sky.querySelector('.paused-msg');
    if (pm) pm.remove();
    st.last = performance.now();
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(tick);
    input.disabled = false;
    input.focus({ preventScroll: true });
  }

  function pause() {
    if (!st || !st.running || st.over) return;
    st.running = false;
    cancelAnimationFrame(raf);
    sky.classList.add('paused');
    var pm = document.createElement('div');
    pm.className = 'paused-msg';
    pm.textContent = '⏸ En pausa';
    sky.appendChild(pm);
    input.blur();
    A.sheet({
      title: '⏸ Pausa',
      text: 'La lluvia se ha detenido.',
      actions: [
        { label: 'Continuar', primary: true, onClick: resume },
        {
          label: 'Salir al menú',
          onClick: function () {
            st.over = true;
            A.abandonRound({ game: 'word-rain' });
            clearDrops();
            leavePlay();
            A.show('start');
          },
        },
      ],
    });
  }

  function clearDrops() {
    A.$$('.drop, .pts, .wave, .paused-msg', sky).forEach(function (e) {
      e.remove();
    });
    sky.classList.remove('paused');
    if (st) st.drops = [];
  }
  function leavePlay() {
    document.body.classList.remove('playing');
    $('#pauseBtn').hidden = true;
    input.blur();
  }

  function finish() {
    if (!st || st.over) return;
    st.over = true;
    st.running = false;
    cancelAnimationFrame(raf);
    var won = st.lives > 0;
    var r = A.round();
    var correct = r ? r.correct : 0;
    var asked = r ? r.asked : 0;
    var pct = A.pct(r);
    var stars = !correct ? 0 : won && pct >= 90 ? 3 : won && pct >= 70 ? 2 : 1;
    A.endRound({ won: won, stars: stars, meta: { game: 'word-rain', points: st.score, livesLeft: st.lives } });
    setTimeout(clearDrops, 500);
    leavePlay();
    A.sfx(won ? 'win' : 'lose');
    var review = st.missed.length
      ? '<ul class="review">' +
        st.missed
          .map(function (w) {
            return '<li class="ko"><span class="m">💧</span><span><b>' + A.esc(w.es) + '</b> = ' + A.esc(w.en.join(' / ')) + '</span></li>';
          })
          .join('') +
        '</ul>'
      : '';
    A.renderEnd($('#endBody'), {
      emoji: won ? (stars === 3 ? '🌈' : '☀️') : '⛈️',
      title: won ? (stars === 3 ? '¡Tormenta superada!' : '¡Sobreviviste!') : '¡Te mojaste!',
      text: 'Nivel ' + level + ' · ' + correct + ' de ' + asked + ' palabras atrapadas',
      stars: stars,
      stats: [
        [correct + '/' + asked, 'Atrapadas'],
        [pct + '%', 'Precisión'],
        [st.score, 'Puntos'],
      ],
      review: review,
      reviewTitle: 'Palabras que cayeron',
    });
    A.show('end');
  }

  // ------------------------------------------------------------- wiring ----
  $('#startBtn').addEventListener('click', startRound);
  $('#againBtn').addEventListener('click', startRound);
  $('#menuEndBtn').addEventListener('click', function () {
    A.show('start');
  });
  $('#pauseBtn').addEventListener('click', pause);
  $('#form').addEventListener('submit', submit);
  input.addEventListener('input', onType);
  // Tapping the sky keeps the keyboard open.
  sky.addEventListener('pointerdown', function (e) {
    e.preventDefault();
    if (st && st.running) input.focus({ preventScroll: true });
  });
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && st && st.running) pause();
  });
})();
