/*
 * ECYR Arcade — shared helpers for the small word games.
 *   Arcade.startRound({ level, meta })     opens a bridge session
 *   Arcade.answer(key, correct, topic)     reports one item, once per key
 *   Arcade.endRound({ won, stars, meta })  closes it (once); score = % correct
 * A round left midway (menu, reload, closing the player) is reported once as
 * abandoned, and only when at least one answer was given.
 * Also: theme (follows the platform's 'ecyr:theme'), WebAudio beeps with mute,
 * screens, toast, confetti, stars, text normalisation, viewport height.
 */
(function () {
  'use strict';
  if (window.Arcade) return;
  var A = (window.Arcade = {});

  // ------------------------------------------------------------ storage ----
  A.load = function (k, d) {
    try {
      var v = localStorage.getItem(k);
      return v == null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  };
  A.save = function (k, v) {
    try {
      localStorage.setItem(k, JSON.stringify(v));
    } catch (e) {
      /* storage unavailable */
    }
  };

  // ------------------------------------------------------------- theme ----
  function applyTheme() {
    var t = 'system';
    try {
      t = localStorage.getItem('ecyr:theme') || 'system';
    } catch (e) {
      /* ignore */
    }
    if (t === 'light' || t === 'dark') document.documentElement.dataset.theme = t;
    else delete document.documentElement.dataset.theme;
  }
  applyTheme();
  window.addEventListener('storage', function (e) {
    if (e.key === 'ecyr:theme') applyTheme();
  });

  // Keeps layouts above the on-screen keyboard.
  function fit() {
    var h = window.visualViewport ? window.visualViewport.height : window.innerHeight;
    document.documentElement.style.setProperty('--app-h', Math.round(h) + 'px');
  }
  fit();
  (window.visualViewport || window).addEventListener('resize', fit);

  // ------------------------------------------------------------- sound ----
  var ctx = null;
  A.muted = A.load('arcade:muted', false);
  function ac() {
    if (A.muted) return null;
    try {
      if (!ctx) {
        var C = window.AudioContext || window.webkitAudioContext;
        if (!C) return null;
        ctx = new C();
      }
      if (ctx.state === 'suspended') ctx.resume();
    } catch (e) {
      return null;
    }
    return ctx;
  }
  function tone(f, dur, type, gain, delay, slide) {
    var c = ac();
    if (!c) return;
    var t = c.currentTime + (delay || 0);
    var o = c.createOscillator();
    var g = c.createGain();
    o.type = type || 'sine';
    o.frequency.setValueAtTime(f, t);
    if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(gain || 0.08, t + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  }
  var SFX = {
    tap: function () {
      tone(720, 0.05, 'sine', 0.05);
    },
    place: function () {
      tone(520, 0.06, 'triangle', 0.07, 0, 640);
    },
    ok: function () {
      tone(660, 0.09, 'sine', 0.09);
      tone(990, 0.14, 'sine', 0.08, 0.07);
    },
    bad: function () {
      tone(240, 0.22, 'sawtooth', 0.05, 0, 150);
    },
    combo: function () {
      [660, 830, 990, 1320].forEach(function (f, i) {
        tone(f, 0.09, 'triangle', 0.07, i * 0.05);
      });
    },
    tick: function () {
      tone(1200, 0.03, 'square', 0.025);
    },
    drop: function () {
      tone(400, 0.25, 'sine', 0.07, 0, 120);
    },
    win: function () {
      [523, 659, 784, 1047].forEach(function (f, i) {
        tone(f, 0.18, 'triangle', 0.08, i * 0.11);
      });
    },
    lose: function () {
      [440, 370, 311, 262].forEach(function (f, i) {
        tone(f, 0.2, 'triangle', 0.07, i * 0.13);
      });
    },
  };
  A.sfx = function (name) {
    if (A.muted || !SFX[name]) return;
    try {
      SFX[name]();
    } catch (e) {
      /* ignore */
    }
  };
  var ICON_ON =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="M15.5 8.5a5 5 0 0 1 0 7"/><path d="M19 5a10 10 0 0 1 0 14"/></svg>';
  var ICON_OFF =
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 5 6 9H2v6h4l5 4V5z"/><path d="m22 9-6 6"/><path d="m16 9 6 6"/></svg>';
  A.bindMute = function (btn) {
    function paint() {
      btn.innerHTML = A.muted ? ICON_OFF : ICON_ON;
      btn.setAttribute('aria-label', A.muted ? 'Activar sonido' : 'Silenciar');
      btn.title = btn.getAttribute('aria-label');
    }
    paint();
    btn.addEventListener('click', function () {
      A.muted = !A.muted;
      A.save('arcade:muted', A.muted);
      paint();
      if (!A.muted) A.sfx('tap');
    });
  };

  // ---------------------------------------------------------- reporting ----
  var round = null;
  function bridge() {
    return window.ECYRBridge || null;
  }
  A.pct = function (r) {
    r = r || round;
    return r && r.asked ? Math.round((r.correct / r.asked) * 100) : 0;
  };
  A.round = function () {
    return round;
  };
  A.startRound = function (opts) {
    if (round && !round.ended) A.abandonRound();
    opts = opts || {};
    round = { level: opts.level, asked: 0, correct: 0, seen: {}, ended: false, t0: Date.now() };
    var b = bridge();
    if (b) b.start({ level: opts.level, mode: 'solo', meta: opts.meta });
    return round;
  };
  /** Reports one answered item. Returns false if this key was already reported. */
  A.answer = function (key, correct, topic) {
    if (!round || round.ended) return false;
    key = String(key);
    if (round.seen[key]) return false;
    round.seen[key] = 1;
    round.asked++;
    if (correct) round.correct++;
    var b = bridge();
    if (b) b.answer(!!correct, { topic: topic, level: round.level });
    return true;
  };
  A.endRound = function (opts) {
    if (!round || round.ended) return null;
    opts = opts || {};
    round.ended = true;
    var r = round;
    var b = bridge();
    if (b && r.asked > 0)
      b.end({
        won: !!opts.won,
        asked: r.asked,
        correct: r.correct,
        score: A.pct(r),
        stars: opts.stars,
        level: r.level,
        meta: opts.meta,
      });
    return r;
  };
  A.abandonRound = function (meta) {
    if (!round || round.ended) return;
    var m = meta || {};
    m.abandoned = true;
    A.endRound({ won: false, stars: 0, meta: m });
  };
  window.addEventListener('pagehide', function () {
    A.abandonRound();
  });

  /** 1–3 stars from accuracy (0 when nothing was right). */
  A.starsFor = function (pct, correct) {
    if (!correct) return 0;
    return pct >= 90 ? 3 : pct >= 65 ? 2 : 1;
  };

  // ------------------------------------------------------------ helpers ----
  A.$ = function (s, root) {
    return (root || document).querySelector(s);
  };
  A.$$ = function (s, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(s));
  };
  A.shuffle = function (arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i];
      a[i] = a[j];
      a[j] = t;
    }
    return a;
  };
  A.esc = function (s) {
    return String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  /** Lowercase, no accents, straight apostrophes, punctuation → spaces. */
  A.norm = function (s) {
    return String(s || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[‘’ʼ`´]/g, "'")
      .replace(/[^a-z0-9' ]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  };

  A.show = function (id) {
    A.$$('.screen').forEach(function (s) {
      s.hidden = s.id !== id;
    });
    window.scrollTo(0, 0);
  };

  var toastT = 0;
  A.toast = function (html, ms) {
    var el = A.$('.toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.innerHTML = html;
    el.classList.add('show');
    clearTimeout(toastT);
    toastT = setTimeout(function () {
      el.classList.remove('show');
    }, ms || 1400);
  };

  A.flash = function (el, cls) {
    if (!el) return;
    el.classList.remove(cls);
    void el.offsetWidth;
    el.classList.add(cls);
  };

  A.confetti = function (n) {
    var box = document.createElement('div');
    box.className = 'confetti';
    var colors = ['#ff3b30', '#ff9500', '#ffcc00', '#34c759', '#5ac8fa', '#007aff', '#af52de', '#ff2d55'];
    for (var i = 0; i < (n || 70); i++) {
      var p = document.createElement('i');
      p.style.left = Math.random() * 100 + 'vw';
      p.style.background = colors[i % colors.length];
      p.style.animationDuration = 1.8 + Math.random() * 1.6 + 's';
      p.style.animationDelay = Math.random() * 0.5 + 's';
      p.style.transform = 'rotate(' + Math.random() * 360 + 'deg)';
      box.appendChild(p);
    }
    document.body.appendChild(box);
    setTimeout(function () {
      box.remove();
    }, 4200);
  };

  /** Fills an end card: { emoji, title, text, stars, stats:[[value,label]], review } */
  A.renderEnd = function (el, o) {
    var s = '<div class="card end-card">';
    s += '<div class="end-emoji">' + o.emoji + '</div>';
    s += '<h2>' + A.esc(o.title) + '</h2>';
    if (o.text) s += '<p>' + o.text + '</p>';
    s += '<div class="stars" aria-label="' + o.stars + ' de 3 estrellas"><i>⭐</i><i>⭐</i><i>⭐</i></div>';
    s += '<div class="stat-grid">';
    (o.stats || []).forEach(function (x) {
      s += '<div class="stat"><b>' + x[0] + '</b><span>' + x[1] + '</span></div>';
    });
    s += '</div></div>';
    if (o.review) s += '<div class="card"><h2>' + (o.reviewTitle || 'Repaso') + '</h2>' + o.review + '</div>';
    el.innerHTML = s;
    var stars = A.$$('.stars i', el);
    stars.forEach(function (st, i) {
      if (i < o.stars)
        setTimeout(function () {
          st.classList.add('on');
          A.sfx('tick');
        }, 350 + i * 260);
    });
    if (o.stars >= 3) setTimeout(A.confetti, 900);
  };

  /** Segmented control. opts: { items:[{id,label}], value, onChange } */
  A.segmented = function (el, opts) {
    el.innerHTML = '';
    el.setAttribute('role', 'group');
    opts.items.forEach(function (it) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = it.label;
      b.dataset.id = it.id;
      b.setAttribute('aria-pressed', String(it.id === opts.value));
      b.addEventListener('click', function () {
        A.$$('button', el).forEach(function (x) {
          x.setAttribute('aria-pressed', String(x === b));
        });
        A.sfx('tap');
        opts.onChange(it.id);
      });
      el.appendChild(b);
    });
  };

  A.LEVEL_NOTES = {
    A1: 'Principiante · lo esencial',
    A2: 'Básico · el día a día',
    B1: 'Intermedio · te defiendes',
    B2: 'Intermedio alto · con soltura',
    C1: 'Avanzado · matices y precisión',
  };

  /** Pause sheet: returns a close function. */
  A.sheet = function (o) {
    var bd = document.createElement('div');
    bd.className = 'sheet-backdrop';
    var html = '<div class="sheet" role="dialog" aria-modal="true"><h3>' + o.title + '</h3>';
    if (o.text) html += '<p class="muted" style="margin:0 0 6px">' + o.text + '</p>';
    o.actions.forEach(function (a, i) {
      html += '<button class="btn btn-block ' + (a.primary ? 'btn-primary' : 'btn-secondary') + '" data-i="' + i + '">' + a.label + '</button>';
    });
    bd.innerHTML = html + '</div>';
    function close() {
      bd.remove();
    }
    bd.addEventListener('click', function (e) {
      var b = e.target.closest('[data-i]');
      if (!b) return;
      close();
      o.actions[+b.dataset.i].onClick();
    });
    document.body.appendChild(bd);
    var first = bd.querySelector('.btn-primary');
    if (first) first.focus();
    return close;
  };
})();
