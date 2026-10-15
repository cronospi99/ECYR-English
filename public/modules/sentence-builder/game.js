/* Sentence Builder — tap the scrambled word tiles in order. */
(function () {
  'use strict';
  var A = window.Arcade;
  var $ = A.$;
  var ROUND = 10;
  var LEVELS = ['A1', 'A2', 'B1', 'B2', 'C1'];

  function parse(line) {
    var p = line.split('|');
    var en = p[0].trim();
    var m = en.match(/[.?!]$/);
    var punct = m ? m[0] : '';
    var body = punct ? en.slice(0, -1) : en;
    var alts = (p[3] || '')
      .split(';')
      .map(function (s) {
        return s.trim().replace(/[.?!]$/, '');
      })
      .filter(Boolean);
    return { en: en, body: body, words: body.split(/\s+/), punct: punct, es: p[1], topic: p[2], alts: alts };
  }
  var DATA = {};
  LEVELS.forEach(function (lv) {
    DATA[lv] = window.SB_DATA[lv].map(parse);
  });

  var level = A.load('sb:level', 'A1');
  if (LEVELS.indexOf(level) < 0) level = 'A1';
  var st = null; // round state

  // ---------------------------------------------------------------- start
  A.bindMute($('#muteBtn'));
  function paintNote() {
    $('#levelNote').textContent = A.LEVEL_NOTES[level] + ' · ' + DATA[level].length + ' frases';
  }
  A.segmented($('#levelSeg'), {
    items: LEVELS.map(function (l) {
      return { id: l, label: l };
    }),
    value: level,
    onChange: function (l) {
      level = l;
      A.save('sb:level', l);
      paintNote();
    },
  });
  paintNote();

  /** Picks sentences not played recently on this level. */
  function pick() {
    var recent = A.load('sb:recent:' + level, []);
    var pool = DATA[level].map(function (_, i) {
      return i;
    });
    var fresh = A.shuffle(
      pool.filter(function (i) {
        return recent.indexOf(i) < 0;
      }),
    );
    var old = A.shuffle(
      pool.filter(function (i) {
        return recent.indexOf(i) >= 0;
      }),
    );
    var chosen = fresh.concat(old).slice(0, ROUND);
    A.save('sb:recent:' + level, chosen.concat(recent).slice(0, Math.min(30, pool.length - ROUND)));
    return chosen;
  }

  function startRound() {
    st = { items: pick(), i: 0, score: 0, results: [], streak: 0 };
    A.startRound({ level: level, meta: { game: 'sentence-builder', sentences: ROUND } });
    $('#menuBtn').hidden = false;
    A.show('play');
    showItem();
  }

  // ---------------------------------------------------------------- play
  var item, placed, bankTiles, checked, hinted;

  function scramble(words) {
    var idx = words.map(function (_, i) {
      return i;
    });
    var out = idx;
    for (var tries = 0; tries < 12; tries++) {
      out = A.shuffle(idx);
      var same = out.every(function (v, i) {
        return words[v] === words[i];
      });
      if (!same || words.length < 2) break;
    }
    return out;
  }

  function showItem() {
    item = DATA[level][st.items[st.i]];
    placed = [];
    checked = false;
    hinted = false;
    $('#hudCount').textContent = st.i + 1 + '/' + ROUND;
    $('#bar').style.width = (st.i / ROUND) * 100 + '%';
    $('#hudScore').textContent = st.score;
    $('#topic').textContent = item.topic;
    $('#hint').hidden = true;
    $('#hintBtn').disabled = false;
    $('#feedback').hidden = true;
    $('#actions').hidden = false;
    $('#nextBtn').hidden = true;
    var bank = $('#bank');
    bank.innerHTML = '';
    bankTiles = scramble(item.words).map(function (wi, k) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile';
      b.textContent = item.words[wi];
      b.dataset.k = k;
      b.style.animationDelay = k * 25 + 'ms';
      b.addEventListener('click', function () {
        place(k);
      });
      bank.appendChild(b);
      return { word: item.words[wi], el: b };
    });
    paintAnswer();
  }

  function place(k) {
    if (checked || placed.indexOf(k) >= 0) return;
    placed.push(k);
    bankTiles[k].el.classList.add('used');
    A.sfx('place');
    paintAnswer();
  }
  function unplace(pos) {
    if (checked) return;
    var k = placed.splice(pos, 1)[0];
    bankTiles[k].el.classList.remove('used');
    A.sfx('tap');
    paintAnswer();
  }

  function paintAnswer(marks) {
    var box = $('#answer');
    box.innerHTML = '';
    box.classList.toggle('empty', placed.length === 0);
    placed.forEach(function (k, pos) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile' + (marks ? (marks[pos] ? ' ok' : ' ko') : '');
      b.textContent = bankTiles[k].word;
      b.setAttribute('aria-label', 'Quitar ' + bankTiles[k].word);
      b.addEventListener('click', function () {
        unplace(pos);
      });
      box.appendChild(b);
    });
    if (placed.length && placed.length === item.words.length && item.punct) {
      var p = document.createElement('span');
      p.className = 'punct';
      p.textContent = item.punct;
      box.appendChild(p);
    }
    $('#checkBtn').disabled = placed.length !== item.words.length;
  }

  function built() {
    return placed
      .map(function (k) {
        return bankTiles[k].word;
      })
      .join(' ');
  }

  function check() {
    if (checked || placed.length !== item.words.length) return;
    checked = true;
    var answer = built();
    var ok = answer === item.body || item.alts.indexOf(answer) >= 0;
    A.answer(st.i, ok, item.topic);
    var marks = placed.map(function (k, pos) {
      return ok || bankTiles[k].word === item.words[pos];
    });
    paintAnswer(marks);
    var box = $('#answer');
    box.classList.add(ok ? 'right' : 'wrong');
    var pts = 0;
    if (ok) {
      st.streak++;
      pts = (hinted ? 60 : 100) + Math.min(st.streak - 1, 5) * 10;
      st.score += pts;
      A.sfx(st.streak >= 3 ? 'combo' : 'ok');
    } else {
      st.streak = 0;
      A.sfx('bad');
      A.flash($('#qCard'), 'shake');
    }
    st.results.push({ item: item, ok: ok, answer: answer });
    $('#hudScore').textContent = st.score;
    var fb = $('#feedback');
    fb.className = 'feedback ' + (ok ? 'ok' : 'ko');
    fb.innerHTML = ok
      ? '<strong>✅ ¡Correcto! +' + pts + '</strong><span class="es">🇪🇸 ' + A.esc(item.es) + '</span>' + (st.streak >= 3 ? '<span>🔥 Racha de ' + st.streak + '</span>' : '')
      : '<strong>❌ Casi…</strong><span class="sol">' + A.esc(item.en) + '</span><span class="es">🇪🇸 ' + A.esc(item.es) + '</span>';
    fb.hidden = false;
    $('#actions').hidden = true;
    $('#hintBtn').disabled = true;
    var nb = $('#nextBtn');
    nb.textContent = st.i + 1 >= ROUND ? 'Ver resultados →' : 'Siguiente →';
    nb.hidden = false;
    nb.focus();
  }

  function next() {
    if (!checked) return;
    st.i++;
    if (st.i >= ROUND) return finish();
    showItem();
  }

  function finish() {
    var r = A.round();
    var correct = r ? r.correct : 0;
    var pct = A.pct(r);
    var stars = A.starsFor(pct, correct);
    A.endRound({ won: pct >= 60, stars: stars, meta: { game: 'sentence-builder', points: st.score } });
    $('#menuBtn').hidden = true;
    $('#bar').style.width = '100%';
    A.sfx(stars >= 2 ? 'win' : 'lose');
    var review =
      '<ul class="review">' +
      st.results
        .map(function (x) {
          return (
            '<li class="' +
            (x.ok ? 'ok' : 'ko') +
            '"><span class="m">' +
            (x.ok ? '✓' : '✗') +
            '</span><span>' +
            A.esc(x.item.en) +
            '<small>' +
            (x.ok ? '' : 'Tu frase: ' + A.esc(x.answer + x.item.punct) + ' · ') +
            A.esc(x.item.topic) +
            '</small></span></li>'
          );
        })
        .join('') +
      '</ul>';
    A.renderEnd($('#endBody'), {
      emoji: stars === 3 ? '🏆' : stars === 2 ? '🎉' : stars === 1 ? '👍' : '💪',
      title: stars === 3 ? '¡Perfecto!' : stars === 2 ? '¡Muy bien!' : stars === 1 ? '¡Buen intento!' : '¡Sigue practicando!',
      text: 'Nivel ' + level + ' · ' + correct + ' de ' + ROUND + ' frases correctas',
      stars: stars,
      stats: [
        [correct + '/' + ROUND, 'Correctas'],
        [pct + '%', 'Precisión'],
        [st.score, 'Puntos'],
      ],
      review: review,
      reviewTitle: 'Tus frases',
    });
    A.show('end');
  }

  // ---------------------------------------------------------------- wiring
  $('#startBtn').addEventListener('click', startRound);
  $('#againBtn').addEventListener('click', startRound);
  $('#menuEndBtn').addEventListener('click', function () {
    A.show('start');
  });
  $('#checkBtn').addEventListener('click', check);
  $('#nextBtn').addEventListener('click', next);
  $('#clearBtn').addEventListener('click', function () {
    if (checked) return;
    placed.forEach(function (k) {
      bankTiles[k].el.classList.remove('used');
    });
    placed = [];
    paintAnswer();
  });
  $('#hintBtn').addEventListener('click', function () {
    if (checked || hinted) return;
    hinted = true;
    var h = $('#hint');
    h.innerHTML = '🇪🇸 <b>' + A.esc(item.es) + '</b>';
    h.hidden = false;
    $('#hintBtn').disabled = true;
    A.sfx('tap');
  });
  $('#menuBtn').addEventListener('click', function () {
    A.sheet({
      title: 'Pausa',
      text: 'Si sales ahora, la ronda queda incompleta.',
      actions: [
        { label: 'Seguir jugando', primary: true, onClick: function () {} },
        {
          label: 'Salir al menú',
          onClick: function () {
            A.abandonRound({ game: 'sentence-builder' });
            $('#menuBtn').hidden = true;
            A.show('start');
          },
        },
      ],
    });
  });
  document.addEventListener('keydown', function (e) {
    if ($('#play').hidden || document.querySelector('.sheet-backdrop')) return;
    if (e.key === 'Enter') {
      e.preventDefault();
      if (checked) next();
      else check();
    } else if (e.key === 'Backspace' && placed.length && !checked) {
      e.preventDefault();
      unplace(placed.length - 1);
    }
  });
})();
