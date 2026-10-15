/* Spelling Bee — listen, read the clue, type the word. */
(function () {
  'use strict';
  var A = window.Arcade;
  var $ = A.$;
  var ROUND = 15;
  var LIVES = 3;
  var LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

  var DATA = {};
  LEVELS.forEach(function (lv) {
    DATA[lv] = window.BEE_DATA[lv].map(function (line) {
      var p = line.split('|');
      return { word: p[0], es: p[1], ex: p[2], alt: p[3] ? p[3].split(';') : [] };
    });
  });

  var level = A.load('bee:level', 'A1');
  if (LEVELS.indexOf(level) < 0) level = 'A1';
  // Default accent: the platform's setting, else US.
  var accent = A.load('bee:accent', null);
  if (!accent) {
    var s = A.load('ecyr:settings', null);
    accent = s && s.state && s.state.accent === 'en-GB' ? 'en-GB' : 'en-US';
  }

  // ------------------------------------------------------------- speech ----
  var synth = window.speechSynthesis || null;
  var voices = [];
  function loadVoices() {
    if (!synth) return;
    try {
      voices = synth.getVoices() || [];
    } catch (e) {
      voices = [];
    }
    // Voices can arrive late: only warn once the list is known and has no English voice.
    $('#noVoice').hidden = !(voices.length && !englishVoice());
  }
  function englishVoice() {
    var exact = voices.filter(function (v) {
      return v.lang && v.lang.replace('_', '-').toLowerCase() === accent.toLowerCase();
    });
    var pref = exact.filter(function (v) {
      return /natural|premium|enhanced|google|samantha|daniel|serena|karen|alex/i.test(v.name);
    });
    if (pref.length) return pref[0];
    if (exact.length) return exact[0];
    var en = voices.filter(function (v) {
      return /^en/i.test(v.lang || '');
    });
    return en[0] || null;
  }
  function say(text, rate) {
    if (!synth) {
      A.toast('🔇 Sin voz en este navegador');
      return;
    }
    try {
      synth.cancel();
      var u = new SpeechSynthesisUtterance(text);
      u.lang = accent;
      var v = englishVoice();
      if (v) u.voice = v;
      u.rate = rate || 0.9;
      var sp = $('#speakBtn');
      sp.classList.add('talking');
      u.onend = u.onerror = function () {
        sp.classList.remove('talking');
      };
      setTimeout(function () {
        sp.classList.remove('talking');
      }, 4000);
      synth.speak(u);
    } catch (e) {
      /* ignore */
    }
  }
  if (synth) {
    loadVoices();
    if ('onvoiceschanged' in synth) synth.onvoiceschanged = loadVoices;
  } else $('#noVoice').hidden = false;

  // -------------------------------------------------------------- start ----
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
      A.save('bee:level', l);
      paintNote();
    },
  });
  A.segmented($('#accentSeg'), {
    items: [
      { id: 'en-US', label: '🇺🇸 US' },
      { id: 'en-GB', label: '🇬🇧 UK' },
    ],
    value: accent,
    onChange: function (a) {
      accent = a;
      A.save('bee:accent', a);
      loadVoices();
      say(a === 'en-GB' ? 'Hello! Ready to spell?' : 'Hi! Ready to spell?');
    },
  });
  paintNote();

  // -------------------------------------------------------------- round ----
  var st = null;
  var cur = null;
  var done = false;
  var hinted = false;

  function pick() {
    var recent = A.load('bee:recent:' + level, []);
    var all = DATA[level].map(function (_, i) {
      return i;
    });
    var fresh = A.shuffle(
      all.filter(function (i) {
        return recent.indexOf(i) < 0;
      }),
    );
    var rest = A.shuffle(
      all.filter(function (i) {
        return recent.indexOf(i) >= 0;
      }),
    );
    var out = fresh.concat(rest).slice(0, ROUND);
    A.save('bee:recent:' + level, out.concat(recent).slice(0, all.length - ROUND));
    return out;
  }

  function startRound() {
    st = { items: pick(), i: 0, lives: LIVES, score: 0, streak: 0, results: [] };
    A.startRound({ level: level, meta: { game: 'spelling-bee', accent: accent } });
    $('#menuBtn').hidden = false;
    $('#deco').hidden = true;
    A.show('play');
    showItem();
  }

  function blank(sentence, word) {
    var re = new RegExp('\\b' + word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'i');
    var safe = A.esc(sentence);
    return re.test(sentence) ? safe.replace(re, '<mark>' + '_'.repeat(Math.max(4, Math.min(word.length, 9))) + '</mark>') : safe;
  }

  function paintHud() {
    var h = '';
    for (var i = 0; i < LIVES; i++) h += i < st.lives ? '❤️' : '<span class="lost">❤️</span>';
    $('#lives').innerHTML = h;
    $('#lives').setAttribute('aria-label', st.lives + ' vidas');
    $('#count').textContent = Math.min(st.i + 1, ROUND) + '/' + ROUND;
    $('#score').textContent = st.score;
    $('#bar').style.width = (st.i / ROUND) * 100 + '%';
  }

  function showItem() {
    cur = DATA[level][st.items[st.i]];
    done = false;
    hinted = false;
    paintHud();
    $('#meaning').textContent = cur.es;
    $('#example').innerHTML = '“' + blank(cur.ex, cur.word) + '”';
    $('#lenInfo').textContent = cur.word.length + ' letras';
    $('#hintInfo').textContent = '';
    $('#letterBtn').disabled = false;
    $('#fb').hidden = true;
    $('#nextBtn').hidden = true;
    $('#form').hidden = false;
    var inp = $('#input');
    inp.value = '';
    inp.disabled = false;
    setTimeout(function () {
      inp.focus({ preventScroll: true });
    }, 50);
    setTimeout(function () {
      say(cur.word, 0.85);
    }, 250);
  }

  /** Letter-by-letter alignment (edit distance) between typed and target. */
  function align(typed, target) {
    var a = typed.toLowerCase();
    var b = target.toLowerCase();
    var n = a.length;
    var m = b.length;
    var d = [];
    for (var i = 0; i <= n; i++) {
      d.push([i]);
      for (var j = 1; j <= m; j++) d[i].push(i === 0 ? j : 0);
    }
    for (i = 1; i <= n; i++)
      for (j = 1; j <= m; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    var out = [];
    i = n;
    j = m;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && d[i][j] === d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)) {
        out.unshift({ ch: target[j - 1], kind: a[i - 1] === b[j - 1] ? 'ok' : 'bad', typed: typed[i - 1] });
        i--;
        j--;
      } else if (j > 0 && d[i][j] === d[i][j - 1] + 1) {
        out.unshift({ ch: target[j - 1], kind: 'miss' });
        j--;
      } else {
        out.unshift({ ch: typed[i - 1], kind: 'extra' });
        i--;
      }
    }
    return out;
  }

  function lettersHtml(ops, mode) {
    // mode 'typed': what the learner wrote; 'target': the right spelling
    return (
      '<div class="letters">' +
      ops
        .map(function (o, k) {
          var delay = ' style="animation-delay:' + k * 35 + 'ms"';
          if (mode === 'typed') {
            if (o.kind === 'miss') return '';
            var ch = o.kind === 'extra' ? o.ch : o.typed;
            return '<span class="' + (o.kind === 'ok' ? '' : o.kind === 'extra' ? 'extra' : 'bad') + '"' + delay + '>' + A.esc(ch) + '</span>';
          }
          if (o.kind === 'extra') return '';
          return '<span class="' + (o.kind === 'ok' ? '' : o.kind === 'miss' ? 'miss' : 'bad') + '"' + delay + '>' + A.esc(o.ch) + '</span>';
        })
        .join('') +
      '</div>'
    );
  }

  function check(e) {
    if (e) e.preventDefault();
    if (done) return next();
    var typed = $('#input').value.trim().replace(/\s+/g, ' ');
    if (!typed) {
      A.flash($('#input'), 'shake');
      return;
    }
    done = true;
    var low = typed.toLowerCase();
    var ok =
      low === cur.word.toLowerCase() ||
      cur.alt.some(function (x) {
        return x.toLowerCase() === low;
      });
    A.answer(st.i, ok, 'spelling ' + level);
    $('#input').disabled = true;
    $('#form').hidden = true;
    var fb = $('#fb');
    var pts = 0;
    if (ok) {
      st.streak++;
      pts = (hinted ? 50 : 100) + Math.min(st.streak - 1, 5) * 10;
      st.score += pts;
      A.sfx(st.streak >= 3 ? 'combo' : 'ok');
      var variant = low !== cur.word.toLowerCase() ? '<span class="muted">También vale: <b>' + A.esc(cur.word) + '</b></span>' : '';
      fb.className = 'fb ok';
      fb.innerHTML =
        '<strong>✅ ¡Perfecto! +' + pts + '</strong>' + lettersHtml(align(typed, typed), 'target') + variant + '<span class="muted">' + A.esc(cur.ex) + '</span>';
    } else {
      st.streak = 0;
      st.lives--;
      A.sfx('bad');
      A.flash($('#qCard'), 'shake');
      var ops = align(typed, cur.word);
      fb.className = 'fb ko';
      fb.innerHTML =
        '<strong>❌ ¡Uy! Pierdes una vida</strong>' +
        '<span class="lbl">Escribiste</span>' +
        lettersHtml(ops, 'typed') +
        '<span class="lbl">Se escribe</span>' +
        lettersHtml(ops, 'target') +
        '<span class="muted">' + A.esc(cur.ex) + '</span>';
    }
    st.results.push({ item: cur, ok: ok, typed: typed });
    fb.hidden = false;
    paintHud();
    var last = st.i + 1 >= ROUND || st.lives <= 0;
    var nb = $('#nextBtn');
    nb.textContent = last ? 'Ver resultados →' : 'Siguiente →';
    nb.hidden = false;
    nb.focus({ preventScroll: true });
    if (!ok && synth) setTimeout(function () { say(cur.word, 0.75); }, 400);
  }

  function next() {
    if (!done) return;
    st.i++;
    if (st.i >= ROUND || st.lives <= 0) return finish();
    showItem();
  }

  function finish() {
    var r = A.round();
    var correct = r ? r.correct : 0;
    var asked = r ? r.asked : 0;
    var pct = A.pct(r);
    var survived = st.lives > 0;
    var stars = A.starsFor(pct, correct);
    if (!survived) stars = Math.min(stars, 1);
    A.endRound({ won: survived, stars: stars, meta: { game: 'spelling-bee', points: st.score, livesLeft: st.lives, accent: accent } });
    if (synth) synth.cancel();
    $('#menuBtn').hidden = true;
    $('#deco').hidden = false;
    A.sfx(survived ? 'win' : 'lose');
    var review =
      '<ul class="review">' +
      st.results
        .map(function (x) {
          return (
            '<li class="' + (x.ok ? 'ok' : 'ko') + '"><span class="m">' + (x.ok ? '✓' : '✗') + '</span><span><b>' + A.esc(x.item.word) + '</b> · ' + A.esc(x.item.es) +
            (x.ok ? '' : '<small>Escribiste: ' + A.esc(x.typed) + '</small>') + '</span></li>'
          );
        })
        .join('') +
      '</ul>';
    A.renderEnd($('#endBody'), {
      emoji: !survived ? '🥀' : stars === 3 ? '🏆' : stars === 2 ? '🍯' : '🐝',
      title: !survived ? '¡Sin vidas!' : stars === 3 ? '¡Campeón del deletreo!' : stars === 2 ? '¡Muy bien!' : '¡Ronda completa!',
      text: 'Nivel ' + level + ' · ' + correct + ' de ' + asked + ' palabras bien escritas',
      stars: stars,
      stats: [
        [correct + '/' + asked, 'Correctas'],
        [pct + '%', 'Precisión'],
        [st.score, 'Puntos'],
      ],
      review: review,
      reviewTitle: 'Tus palabras',
    });
    A.show('end');
  }

  // ------------------------------------------------------------- wiring ----
  $('#startBtn').addEventListener('click', startRound);
  $('#againBtn').addEventListener('click', startRound);
  $('#menuEndBtn').addEventListener('click', function () {
    A.show('start');
  });
  $('#form').addEventListener('submit', check);
  $('#nextBtn').addEventListener('click', next);
  $('#speakBtn').addEventListener('click', function () {
    if (cur) say(cur.word, 0.85);
  });
  $('#slowBtn').addEventListener('click', function () {
    if (cur) say(cur.word, 0.45);
  });
  $('#sentenceBtn').addEventListener('click', function () {
    if (cur) say(cur.ex, 0.85);
  });
  $('#letterBtn').addEventListener('click', function () {
    if (!cur || done) return;
    hinted = true;
    $('#letterBtn').disabled = true;
    $('#hintInfo').innerHTML = 'Empieza por <b>' + A.esc(cur.word[0].toLowerCase()) + '</b>';
    A.sfx('tap');
    $('#input').focus({ preventScroll: true });
  });
  $('#menuBtn').addEventListener('click', function () {
    A.sheet({
      title: 'Pausa',
      text: 'Si sales ahora, la ronda queda incompleta.',
      actions: [
        { label: 'Seguir jugando', primary: true, onClick: function () { if (!done) $('#input').focus({ preventScroll: true }); } },
        {
          label: 'Salir al menú',
          onClick: function () {
            A.abandonRound({ game: 'spelling-bee' });
            if (synth) synth.cancel();
            $('#menuBtn').hidden = true;
            $('#deco').hidden = false;
            A.show('start');
          },
        },
      ],
    });
  });
  document.addEventListener('keydown', function (e) {
    if ($('#play').hidden || document.querySelector('.sheet-backdrop')) return;
    if (e.key === 'Enter' && done && document.activeElement !== $('#nextBtn')) {
      e.preventDefault();
      next();
    }
  });
})();
