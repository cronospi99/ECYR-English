/*
 * ECYR game bridge — lets a game running inside the platform (same-origin
 * iframe) report what happened, so the platform can record progress per game.
 *
 *   ECYRBridge.start({ level, unit, mode, meta })   // a round/battle begins
 *   ECYRBridge.answer(correct, { topic })           // one question answered
 *   ECYRBridge.end({ won, asked, correct, score, stars, level, unit, meta })
 *
 * mode: 'solo' (counts for the learner) or 'class' (group play, not graded).
 * Every message: { source: 'ecyr-game', v: 1, type, slug, sessionId, ... }.
 * Outside the platform (opened directly) it is a silent no-op.
 */
(function () {
  if (window.ECYRBridge) return;
  var slug = (document.currentScript && document.currentScript.dataset.slug) || document.documentElement.dataset.ecyrSlug || '';
  var embedded = false;
  try { embedded = window.parent !== window && window.parent.location.origin === location.origin; } catch (e) { embedded = false; }
  var session = null;

  function id() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 8); }
  function post(type, data) {
    if (!embedded || !slug) return;
    var msg = { source: 'ecyr-game', v: 1, type: type, slug: slug, sessionId: session && session.id };
    for (var k in data) if (Object.prototype.hasOwnProperty.call(data, k)) msg[k] = data[k];
    try { window.parent.postMessage(msg, location.origin); } catch (e) { /* ignore */ }
  }
  function ensure(meta) {
    if (!session) session = { id: id(), startedAt: new Date().toISOString(), asked: 0, correct: 0, meta: meta || {} };
    return session;
  }

  window.ECYRBridge = {
    embedded: embedded,
    setSlug: function (s) { slug = s; },
    start: function (meta) {
      session = null;
      var s = ensure(meta);
      post('start', { startedAt: s.startedAt, mode: (meta && meta.mode) || 'solo', level: meta && meta.level, unit: meta && meta.unit, meta: (meta && meta.meta) || undefined });
    },
    answer: function (correct, info) {
      var s = ensure();
      s.asked++;
      if (correct) s.correct++;
      post('answer', {
        correct: !!correct,
        topic: info && info.topic,
        unit: info && info.unit != null ? String(info.unit) : undefined,
        level: info && info.level,
        kind: info && info.kind,
        asked: s.asked,
        right: s.correct,
      });
    },
    end: function (r) {
      var s = ensure();
      r = r || {};
      var asked = typeof r.asked === 'number' ? r.asked : s.asked;
      var correct = typeof r.correct === 'number' ? r.correct : s.correct;
      post('result', {
        startedAt: s.startedAt,
        endedAt: new Date().toISOString(),
        mode: r.mode || (s.meta && s.meta.mode) || 'solo',
        level: r.level || (s.meta && s.meta.level),
        unit: r.unit != null ? String(r.unit) : s.meta && s.meta.unit != null ? String(s.meta.unit) : undefined,
        won: typeof r.won === 'boolean' ? r.won : undefined,
        asked: asked,
        correct: correct,
        // Participation results (debates, free exploration) have no right answers: no score.
        score: typeof r.score === 'number' ? r.score : r.meta && r.meta.kind === 'participation' ? undefined : asked ? Math.round((correct / asked) * 100) : undefined,
        stars: typeof r.stars === 'number' ? r.stars : undefined,
        meta: r.meta || undefined,
      });
      session = null;
    },
  };
})();
