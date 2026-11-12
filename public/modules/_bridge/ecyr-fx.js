/*
 * Shared presentation helpers for the games that run inside the platform:
 *
 *   ECYRFx.fade('white' | 'black' | '#hex', mid, { in, hold, out })
 *       covers the screen, runs mid() while it is covered, then uncovers.
 *   ECYRFx.exit()            fades to black and returns to the platform's Games menu.
 *   ECYRFx.nav({ pos, theme, compact })
 *       adds the "Games" (back) and full-screen buttons. theme: css text with the
 *       --nav-* variables, so each game draws them in its own style.
 *   ECYRFx.compact(true|false)  icon-only buttons while a round is being played.
 */
(function () {
  if (window.ECYRFx) return;
  var embedded = false;
  try { embedded = window.parent !== window && window.parent.location.origin === location.origin; } catch (e) { embedded = false; }
  var reduce = false;
  try { reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) { /* ignore */ }

  var css = document.createElement('style');
  css.textContent =
    '.ecyr-veil{position:fixed;inset:0;z-index:2147483000;pointer-events:all;opacity:0;transition:opacity .45s ease}' +
    '.ecyr-nav{position:fixed;z-index:2147482000;display:flex;gap:8px;align-items:center;font:700 14px/1 system-ui,sans-serif;' +
    '--nav-bg:rgba(15,18,30,.72);--nav-fg:#fff;--nav-bd:rgba(255,255,255,.35);--nav-radius:999px;--nav-shadow:0 6px 18px rgba(0,0,0,.35);--nav-hover:rgba(255,255,255,.18)}' +
    '.ecyr-nav[data-pos="tl"]{top:max(10px,env(safe-area-inset-top));left:max(10px,env(safe-area-inset-left))}' +
    '.ecyr-nav[data-pos="tr"]{top:max(10px,env(safe-area-inset-top));right:max(10px,env(safe-area-inset-right))}' +
    '.ecyr-nav[data-pos="bl"]{bottom:max(10px,env(safe-area-inset-bottom));left:max(10px,env(safe-area-inset-left))}' +
    '.ecyr-nav[data-pos="br"]{bottom:max(10px,env(safe-area-inset-bottom));right:max(10px,env(safe-area-inset-right))}' +
    '.ecyr-nav button{appearance:none;display:flex;align-items:center;gap:6px;height:40px;min-width:40px;padding:0 14px 0 10px;margin:0;cursor:pointer;' +
    'font:inherit;font-family:var(--nav-font,inherit);letter-spacing:var(--nav-track,0);color:var(--nav-fg);background:var(--nav-bg);border:2px solid var(--nav-bd);' +
    'border-radius:var(--nav-radius);box-shadow:var(--nav-shadow);-webkit-backdrop-filter:blur(8px);backdrop-filter:blur(8px);transition:transform .15s ease,background .15s ease,opacity .2s ease}' +
    '.ecyr-nav button:hover{background:var(--nav-hover);transform:translateY(-1px)}' +
    '.ecyr-nav button:active{transform:translateY(1px) scale(.97)}' +
    '.ecyr-nav button:focus-visible{outline:3px solid var(--nav-fg);outline-offset:2px}' +
    '.ecyr-nav svg{width:20px;height:20px;flex:none}' +
    '.ecyr-nav .ecyr-nav-ico{padding:0;justify-content:center}' +
    '.ecyr-nav[data-compact="1"] button{padding:0;justify-content:center;opacity:.72}' +
    '.ecyr-nav[data-compact="1"] button:hover{opacity:1}' +
    '.ecyr-nav[data-compact="1"] .ecyr-nav-label{display:none}' +
    '@media (max-width:520px){.ecyr-nav button{height:36px;min-width:36px}.ecyr-nav .ecyr-nav-label{display:none}.ecyr-nav button{padding:0;justify-content:center}}';
  (document.head || document.documentElement).appendChild(css);

  var busy = false;
  function fade(color, mid, o) {
    o = o || {};
    if (busy) { if (mid) mid(); return; }
    var tin = reduce ? 120 : o.in == null ? 450 : o.in;
    var hold = o.hold == null ? 120 : o.hold;
    var tout = reduce ? 160 : o.out == null ? 600 : o.out;
    busy = true;
    var v = document.createElement('div');
    v.className = 'ecyr-veil';
    v.style.background = color === 'white' ? '#fff' : color === 'black' ? '#000' : color || '#000';
    v.style.transitionDuration = tin + 'ms';
    document.body.appendChild(v);
    void v.offsetWidth;
    v.style.opacity = '1';
    setTimeout(function () {
      try { if (mid) mid(); } catch (e) { console.error(e); }
      if (o.stay) { busy = false; return; }
      setTimeout(function () {
        v.style.transitionDuration = tout + 'ms';
        v.style.opacity = '0';
        setTimeout(function () { v.remove(); busy = false; }, tout + 40);
      }, hold);
    }, tin + 30);
  }

  function leave() {
    if (window.ECYRBridge && window.ECYRBridge.embedded && window.ECYRBridge.exit) window.ECYRBridge.exit();
    else if (embedded) { try { window.parent.postMessage({ source: 'ecyr-game', v: 1, type: 'exit' }, location.origin); } catch (e) { /* ignore */ } }
    else location.href = '/games';
  }
  function exit() { fade('black', leave, { in: 320, stay: true }); }

  function toggleFull() {
    // Inside the platform the whole player goes full screen, so its frame comes along.
    var el = document.documentElement;
    try { if (embedded && window.frameElement && window.frameElement.parentElement) el = window.frameElement.parentElement; } catch (e) { /* ignore */ }
    var doc = el.ownerDocument;
    if (doc.fullscreenElement) doc.exitFullscreen();
    else if (el.requestFullscreen) el.requestFullscreen().catch(function () {});
  }

  var BACK = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg>';
  var FULL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>';
  var bar = null;
  function nav(o) {
    o = o || {};
    if (!bar) {
      bar = document.createElement('div');
      bar.className = 'ecyr-nav';
      bar.innerHTML =
        '<button type="button" class="ecyr-nav-back" title="Back to Games" aria-label="Back to Games">' + BACK + '<span class="ecyr-nav-label">Games</span></button>' +
        '<button type="button" class="ecyr-nav-ico ecyr-nav-full" title="Full screen" aria-label="Full screen">' + FULL + '</button>';
      bar.querySelector('.ecyr-nav-back').addEventListener('click', exit);
      bar.querySelector('.ecyr-nav-full').addEventListener('click', toggleFull);
      (document.body || document.documentElement).appendChild(bar);
    }
    bar.dataset.pos = o.pos || bar.dataset.pos || 'tl';
    if (o.theme != null) bar.style.cssText = o.theme;
    if (o.full === false) bar.querySelector('.ecyr-nav-full').style.display = 'none';
    if (o.compact != null) bar.dataset.compact = o.compact ? '1' : '0';
    return bar;
  }

  window.ECYRFx = {
    fade: fade,
    exit: exit,
    nav: nav,
    fullscreen: toggleFull,
    compact: function (on) { if (bar) bar.dataset.compact = on ? '1' : '0'; },
    pos: function (p) { if (bar) bar.dataset.pos = p; },
    show: function (on) { if (bar) bar.style.display = on === false ? 'none' : 'flex'; },
  };

  // <script src=".../ecyr-fx.js" data-nav="tl" data-theme="--nav-bg:#111;..."> adds the buttons on its own.
  var me = document.currentScript;
  if (me && me.dataset.nav) {
    var opts = { pos: me.dataset.nav, theme: me.dataset.theme || '', compact: me.dataset.compact === '1' };
    if (document.body) nav(opts); else document.addEventListener('DOMContentLoaded', function () { nav(opts); });
  }
})();
