/* Fast Match — 60-second rush: English word → picture or Spanish. */
(function () {
  'use strict';
  var A = window.Arcade;
  var $ = A.$;
  var SECONDS = 60;
  var OK_DELAY = 420;
  var BAD_DELAY = 950;

  var PACKS = window.FM_PACKS.map(function (p) {
    return {
      id: p.id,
      name: p.name,
      icon: p.icon,
      items: p.items.map(function (s) {
        var x = s.split('|');
        return { en: x[0], emoji: x[1], es: x[2], pack: p.id };
      }),
    };
  });
  var MIX = { id: 'mix', name: 'Mezcla', icon: '🎲', items: [] };
  PACKS.forEach(function (p) {
    MIX.items = MIX.items.concat(p.items);
  });
  var ALL = PACKS.concat([MIX]);
  function packById(id) {
    return (
      ALL.filter(function (p) {
        return p.id === id;
      })[0] || PACKS[0]
    );
  }

  var packId = A.load('fm:pack', 'animals');
  var mode = A.load('fm:mode', 'mixed');

  // -------------------------------------------------------------- start ----
  A.bindMute($('#muteBtn'));
  function paintBest() {
    var b = A.load('fm:best:' + packId, 0);
    $('#bestNote').textContent = b ? 'Tu récord en ' + packById(packId).name + ': ' + b + ' puntos' : '';
  }
  var chips = $('#packs');
  ALL.forEach(function (p) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip';
    b.dataset.id = p.id;
    b.setAttribute('aria-pressed', String(p.id === packId));
    b.innerHTML = '<span class="e">' + p.icon + '</span><span>' + p.name + '<br><small class="muted">' + p.items.length + ' palabras</small></span>';
    b.addEventListener('click', function () {
      packId = p.id;
      A.save('fm:pack', packId);
      A.$$('.chip', chips).forEach(function (c) {
        c.setAttribute('aria-pressed', String(c === b));
      });
      A.sfx('tap');
      paintBest();
    });
    chips.appendChild(b);
  });
  A.segmented($('#modeSeg'), {
    items: [
      { id: 'emoji', label: '😀 Imágenes' },
      { id: 'es', label: '🇪🇸 Español' },
      { id: 'mixed', label: '🔀 Alterna' },
    ],
    value: mode,
    onChange: function (m) {
      mode = m;
      A.save('fm:mode', m);
    },
  });
  paintBest();

  // -------------------------------------------------------------- round ----
  var st = null;
  var raf = 0;

  function startRound() {
    var pack = packById(packId);
    st = {
      pack: pack,
      deck: A.shuffle(pack.items),
      di: 0,
      q: 0,
      score: 0,
      streak: 0,
      best: 0,
      left: SECONDS * 1000,
      last: 0,
      running: false,
      locked: true,
      over: false,
      misses: [],
    };
    lastSec = SECONDS;
    A.show('play');
    $('#pauseBtn').hidden = false;
    paintHud();
    $('#word').textContent = '—';
    $('#opts').innerHTML = '';
    countdown(function () {
      A.startRound({ meta: { game: 'fast-match', pack: pack.id, mode: mode } });
      st.running = true;
      st.last = performance.now();
      nextQuestion();
      raf = requestAnimationFrame(tick);
    });
  }

  function countdown(done) {
    var ov = document.createElement('div');
    ov.className = 'countdown';
    document.body.appendChild(ov);
    var n = 3;
    (function step() {
      if (n === 0) {
        ov.remove();
        A.sfx('combo');
        done();
        return;
      }
      ov.innerHTML = '<span>' + n + '</span>';
      A.sfx('tick');
      n--;
      setTimeout(step, 650);
    })();
  }

  function mult() {
    return st.streak >= 10 ? 4 : st.streak >= 6 ? 3 : st.streak >= 3 ? 2 : 1;
  }

  function paintHud() {
    var secs = Math.ceil(st.left / 1000);
    var t = $('#timer');
    t.textContent = '⏱ ' + secs;
    t.classList.toggle('low', secs <= 10);
    $('#timebar').classList.toggle('low', secs <= 10);
    $('#timefill').style.width = (st.left / (SECONDS * 1000)) * 100 + '%';
    var m = mult();
    var mb = $('#mult');
    mb.textContent = '×' + m;
    mb.className = 'pill mult x' + m;
    $('#score').textContent = st.score;
    $('#streakNote').innerHTML = st.streak >= 2 ? '🔥 Racha: <b>' + st.streak + '</b>' : '&nbsp;';
  }

  var lastSec = 60;
  function tick(now) {
    if (!st || !st.running) return;
    st.left -= now - st.last;
    st.last = now;
    var secs = Math.ceil(st.left / 1000);
    if (secs !== lastSec) {
      lastSec = secs;
      if (secs <= 5 && secs > 0) A.sfx('tick');
    }
    if (st.left <= 0) {
      st.left = 0;
      paintHud();
      return finish();
    }
    paintHud();
    raf = requestAnimationFrame(tick);
  }

  function draw() {
    if (st.di >= st.deck.length) {
      var last = st.deck[st.deck.length - 1];
      st.deck = A.shuffle(st.pack.items);
      if (st.deck[0] === last) st.deck.push(st.deck.shift());
      st.di = 0;
    }
    return st.deck[st.di++];
  }

  function nextQuestion() {
    if (!st.running) return;
    var item = draw();
    var useEmoji = mode === 'emoji' || (mode === 'mixed' && Math.random() < 0.5);
    var key = useEmoji ? 'emoji' : 'es';
    // Distractors: same pack as the item (so the choice is about meaning), all different.
    var pool = A.shuffle(
      packById(item.pack).items.filter(function (x) {
        return x !== item && x[key] !== item[key];
      }),
    );
    var opts = [item];
    for (var i = 0; i < pool.length && opts.length < 4; i++) {
      var dup = opts.some(function (o) {
        return o[key] === pool[i][key];
      });
      if (!dup) opts.push(pool[i]);
    }
    opts = A.shuffle(opts);
    st.cur = { item: item, key: key, opts: opts, n: st.q++ };
    var w = $('#word');
    w.textContent = item.en;
    A.flash(w, 'in');
    $('#ask').textContent = useEmoji ? '¿Qué imagen es…?' : '¿Cómo se dice en español…?';
    var box = $('#opts');
    box.innerHTML = '';
    opts.forEach(function (o, k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'opt' + (useEmoji ? ' emoji' : '');
      b.innerHTML = '<span class="k">' + (k + 1) + '</span>' + A.esc(o[key]);
      if (useEmoji) b.setAttribute('aria-label', 'Opción ' + (k + 1));
      b.addEventListener('click', function () {
        choose(k);
      });
      box.appendChild(b);
    });
    st.locked = false;
  }

  function choose(k) {
    if (!st || !st.running || st.locked) return;
    st.locked = true;
    var c = st.cur;
    var ok = c.opts[k] === c.item;
    A.answer(c.n, ok, st.pack.id === 'mix' ? c.item.pack : st.pack.id);
    var btns = A.$$('.opt', $('#opts'));
    btns.forEach(function (b) {
      b.disabled = true;
    });
    var right = c.opts.indexOf(c.item);
    btns[right].classList.add('right');
    if (ok) {
      var before = mult();
      st.streak++;
      st.best = Math.max(st.best, st.streak);
      var pts = 100 * mult();
      st.score += pts;
      var f = document.createElement('div');
      f.className = 'float-pts';
      f.textContent = '+' + pts;
      $('#wordCard').appendChild(f);
      setTimeout(function () {
        f.remove();
      }, 900);
      A.flash($('#wordCard'), 'flash-ok');
      if (mult() > before) {
        comboBurst('COMBO ×' + mult() + '!');
        A.sfx('combo');
      } else A.sfx('ok');
    } else {
      btns[k].classList.add('wrong');
      if (st.streak >= 3) A.toast('💥 Racha perdida');
      st.streak = 0;
      st.misses.push(c.item);
      A.sfx('bad');
      A.flash($('#wordCard'), 'shake');
    }
    paintHud();
    st.wait = setTimeout(function () {
      st.wait = 0;
      nextQuestion();
    }, ok ? OK_DELAY : BAD_DELAY);
  }

  function comboBurst(text) {
    var el = document.createElement('div');
    el.className = 'combo';
    el.textContent = text;
    document.body.appendChild(el);
    setTimeout(function () {
      el.remove();
    }, 1150);
  }

  function pause() {
    if (!st || !st.running) return;
    st.running = false;
    cancelAnimationFrame(raf);
    // An answered question waiting for the next one resumes with a fresh question.
    var resumeNext = !!st.wait;
    clearTimeout(st.wait);
    st.wait = 0;
    A.sheet({
      title: '⏸ Pausa',
      text: 'El reloj está detenido.',
      actions: [
        {
          label: 'Continuar',
          primary: true,
          onClick: function () {
            if (!st || st.over) return;
            st.running = true;
            st.last = performance.now();
            if (resumeNext) nextQuestion();
            raf = requestAnimationFrame(tick);
          },
        },
        {
          label: 'Salir al menú',
          onClick: function () {
            st.over = true;
            A.abandonRound({ game: 'fast-match', pack: st.pack.id });
            $('#pauseBtn').hidden = true;
            A.show('start');
            paintBest();
          },
        },
      ],
    });
  }

  function finish() {
    if (!st || st.over) return;
    st.over = true;
    st.running = false;
    st.locked = true;
    cancelAnimationFrame(raf);
    clearTimeout(st.wait);
    $('#pauseBtn').hidden = true;
    var r = A.round();
    var correct = r ? r.correct : 0;
    var asked = r ? r.asked : 0;
    var pct = A.pct(r);
    var stars = !correct ? 0 : correct >= 25 && pct >= 85 ? 3 : correct >= 15 && pct >= 70 ? 2 : 1;
    A.endRound({ won: stars >= 2, stars: stars, meta: { game: 'fast-match', pack: st.pack.id, mode: mode, points: st.score, bestStreak: st.best } });
    var prev = A.load('fm:best:' + st.pack.id, 0);
    var record = st.score > prev;
    if (record) A.save('fm:best:' + st.pack.id, st.score);
    A.sfx(stars >= 2 ? 'win' : 'lose');
    var seen = {};
    var misses = st.misses.filter(function (x) {
      return seen[x.en] ? false : (seen[x.en] = 1);
    });
    A.renderEnd($('#endBody'), {
      emoji: '⏰',
      title: record && st.score > 0 ? '¡Nuevo récord!' : '¡Tiempo!',
      text: st.pack.icon + ' ' + st.pack.name + ' · ' + correct + ' aciertos de ' + asked + ' · mejor racha ' + st.best,
      stars: stars,
      stats: [
        [st.score, 'Puntos'],
        [correct, 'Aciertos'],
        [pct + '%', 'Precisión'],
      ],
      review: misses.length
        ? '<ul class="review">' +
          misses
            .map(function (x) {
              return '<li class="ko"><span class="m">' + x.emoji + '</span><span><b>' + A.esc(x.en) + '</b> = ' + A.esc(x.es) + '</span></li>';
            })
            .join('') +
          '</ul>'
        : '',
      reviewTitle: 'Para repasar',
    });
    if (record && st.score > 0) setTimeout(A.confetti, 600);
    A.show('end');
  }

  // ------------------------------------------------------------- wiring ----
  $('#startBtn').addEventListener('click', startRound);
  $('#againBtn').addEventListener('click', startRound);
  $('#menuEndBtn').addEventListener('click', function () {
    A.show('start');
    paintBest();
  });
  $('#pauseBtn').addEventListener('click', pause);
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) pause();
  });
  document.addEventListener('keydown', function (e) {
    if ($('#play').hidden || document.querySelector('.sheet-backdrop')) return;
    var n = parseInt(e.key, 10);
    if (n >= 1 && n <= 4) choose(n - 1);
    else if (e.key === 'Escape' || e.key === 'p') pause();
  });
})();
