/*
 * Da World — illustrated front page. The game is an imported build, so this layer sits on
 * top of its mode chooser and presses the chooser's own buttons.
 */
(function () {
  var HTML = "<div class=\"dwf-back\"></div><div class=\"dwf-stage\"><img class=\"dwf-l\" src=\"/modules/da-world/front/stage.webp\" alt=\"\" draggable=\"false\" style=\"inset:0;width:100%;height:100%;\"><i class=\"dwf-sun\"></i><i class=\"dwf-water\"></i><img class=\"dwf-l\" src=\"/modules/da-world/front/boy.webp\" alt=\"\" draggable=\"false\" style=\"left:9.948%;top:6.574%;width:21.979%;height:34.167%;transform-origin:50% 100%;animation:dwfSway 4.6s ease-in-out infinite;\"><img class=\"dwf-l\" src=\"/modules/da-world/front/girl.webp\" alt=\"\" draggable=\"false\" style=\"left:67.969%;top:7.778%;width:19.844%;height:32.963%;transform-origin:50% 100%;animation:dwfSway 5.2s ease-in-out -1.5s infinite reverse;\"><i class=\"dwf-shine\"></i><i class=\"dwf-pin\"></i><i class=\"dwf-spark\" style=\"left:33.5%;top:5%;\"></i><i class=\"dwf-spark\" style=\"left:65.5%;top:6%;animation-delay:-1.1s;\"></i><i class=\"dwf-spark\" style=\"left:38%;top:24%;animation-delay:-1.9s;\"></i><i class=\"dwf-mote\" style=\"left:93.8%;top:90.5%;animation-duration:6.3s;animation-delay:-0.8s;--dx:2.0cqw;\"></i><i class=\"dwf-mote\" style=\"left:72.7%;top:66.3%;animation-duration:7.5s;animation-delay:-6.1s;--dx:0.6cqw;\"></i><i class=\"dwf-mote\" style=\"left:57.8%;top:21.8%;animation-duration:8.2s;animation-delay:-3.9s;--dx:1.3cqw;\"></i><i class=\"dwf-mote\" style=\"left:97.5%;top:90.6%;animation-duration:8.7s;animation-delay:-4.4s;--dx:-1.4cqw;\"></i><i class=\"dwf-mote\" style=\"left:5.4%;top:10.4%;animation-duration:8.3s;animation-delay:-3.2s;--dx:-0.7cqw;\"></i><i class=\"dwf-mote\" style=\"left:87.6%;top:53.7%;animation-duration:8.8s;animation-delay:-2.4s;--dx:-2.9cqw;\"></i><i class=\"dwf-mote\" style=\"left:33.2%;top:19.9%;animation-duration:8.6s;animation-delay:-10.0s;--dx:1.0cqw;\"></i><i class=\"dwf-mote\" style=\"left:19.5%;top:85.7%;animation-duration:10.0s;animation-delay:-7.3s;--dx:2.4cqw;\"></i><i class=\"dwf-mote\" style=\"left:75.2%;top:76.7%;animation-duration:7.8s;animation-delay:-9.8s;--dx:2.8cqw;\"></i><i class=\"dwf-mote\" style=\"left:17.5%;top:73.6%;animation-duration:9.6s;animation-delay:-4.6s;--dx:0.2cqw;\"></i><i class=\"dwf-mote\" style=\"left:49.0%;top:88.5%;animation-duration:8.5s;animation-delay:-8.3s;--dx:-0.9cqw;\"></i><i class=\"dwf-mote\" style=\"left:86.8%;top:86.3%;animation-duration:8.3s;animation-delay:-5.7s;--dx:2.5cqw;\"></i><i class=\"dwf-mote\" style=\"left:71.5%;top:50.3%;animation-duration:7.1s;animation-delay:-3.2s;--dx:1.2cqw;\"></i><i class=\"dwf-mote\" style=\"left:17.9%;top:87.0%;animation-duration:7.3s;animation-delay:-9.1s;--dx:-1.1cqw;\"></i><i class=\"dwf-mote\" style=\"left:93.9%;top:69.4%;animation-duration:8.5s;animation-delay:-5.2s;--dx:0.9cqw;\"></i><i class=\"dwf-mote\" style=\"left:58.4%;top:35.1%;animation-duration:7.0s;animation-delay:-5.1s;--dx:2.6cqw;\"></i><i class=\"dwf-mote\" style=\"left:61.8%;top:14.6%;animation-duration:10.1s;animation-delay:-7.3s;--dx:2.4cqw;\"></i><i class=\"dwf-mote\" style=\"left:20.4%;top:72.8%;animation-duration:6.3s;animation-delay:-6.5s;--dx:-1.4cqw;\"></i><i class=\"dwf-mote\" style=\"left:23.8%;top:84.2%;animation-duration:6.5s;animation-delay:-5.2s;--dx:2.1cqw;\"></i><i class=\"dwf-mote\" style=\"left:25.5%;top:26.3%;animation-duration:10.4s;animation-delay:-4.2s;--dx:1.3cqw;\"></i><i class=\"dwf-leaf\" style=\"left:0.6%;animation-duration:9.5s;animation-delay:-0.3s;--dx:-4.6cqw;\"></i><i class=\"dwf-leaf\" style=\"left:1.2%;animation-duration:10.2s;animation-delay:-1.7s;--dx:5.2cqw;\"></i><i class=\"dwf-leaf\" style=\"left:13.2%;animation-duration:10.3s;animation-delay:-0.6s;--dx:5.9cqw;\"></i><i class=\"dwf-leaf\" style=\"left:84.6%;animation-duration:13.6s;animation-delay:-8.2s;--dx:3.0cqw;\"></i><i class=\"dwf-leaf\" style=\"left:91.8%;animation-duration:10.7s;animation-delay:-10.0s;--dx:2.9cqw;\"></i><i class=\"dwf-leaf\" style=\"left:16.2%;animation-duration:10.8s;animation-delay:-2.9s;--dx:1.9cqw;\"></i><i class=\"dwf-leaf\" style=\"left:85.6%;animation-duration:12.7s;animation-delay:-12.3s;--dx:0.2cqw;\"></i><i class=\"dwf-leaf\" style=\"left:91.8%;animation-duration:8.9s;animation-delay:-12.5s;--dx:-2.9cqw;\"></i><button type=\"button\" class=\"dwf-hot\" data-mode=\"vocabulary\" aria-label=\"Vocabulary: play\" title=\"Vocabulary: play\" style=\"left:7.4%;top:40.3%;width:29%;height:37%;border-radius:2.4cqw;\"></button><button type=\"button\" class=\"dwf-hot\" data-mode=\"directions\" aria-label=\"Directions: play\" title=\"Directions: play\" style=\"left:35.8%;top:40.3%;width:27.4%;height:37%;border-radius:2.4cqw;\"></button><button type=\"button\" class=\"dwf-hot\" data-mode=\"detective\" aria-label=\"Family Detective: play\" title=\"Family Detective: play\" style=\"left:63.4%;top:40.3%;width:29.2%;height:37%;border-radius:2.4cqw;\"></button><button type=\"button\" class=\"dwf-hot\" data-mode=\"multiplayer\" aria-label=\"Multiplayer Class\" title=\"Multiplayer Class\" style=\"left:9%;top:79.5%;width:82%;height:13.8%;border-radius:2cqw;\"></button><div class=\"dwf-links\"></div></div>";
  function fade(fn) { if (window.ECYRFx) window.ECYRFx.fade('white', fn, { in: 420, hold: 160, out: 800 }); else fn(); }
  // The front page is in English; the chooser's two links come in Spanish.
  function english(t) {
    return t.replace('Tu personaje', 'Your character').replace('Gráficos', 'Graphics').replace('Alta', 'High').replace('Media', 'Medium').replace('Baja', 'Low');
  }
  function mount(menu) {
    if (menu.querySelector('.dwf')) return;
    var f = document.createElement('div');
    f.className = 'dwf';
    f.innerHTML = HTML;
    menu.appendChild(f);
    f.addEventListener('click', function (e) {
      var hot = e.target.closest('.dwf-hot');
      if (!hot) return;
      var real = menu.querySelector('[data-mode="' + hot.dataset.mode + '"]:not(.dwf-hot)');
      if (!real) return;
      if (hot.dataset.mode === 'multiplayer') real.click(); else fade(function () { real.click(); });
    });
    // "Your character" and "Graphics" keep working: mirrors of the chooser's own links.
    var links = f.querySelector('.dwf-links');
    function mirror() {
      links.textContent = '';
      menu.querySelectorAll('.ecyr-link').forEach(function (l) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = 'dwf-link'; b.textContent = english(l.textContent);
        b.addEventListener('click', function () { l.click(); setTimeout(mirror, 60); });
        links.appendChild(b);
      });
    }
    mirror();
  }
  function visible(el) { return !!el && el.isConnected && getComputedStyle(el).display !== 'none' && getComputedStyle(el).visibility !== 'hidden' && el.getClientRects().length > 0; }
  function tick() {
    var menu = document.querySelector('.menu-screen.ecyr-chooser');
    if (menu) mount(menu);
    if (window.ECYRFx) window.ECYRFx.show(visible(menu));
  }
  if (window.ECYRFx) window.ECYRFx.nav({ pos: 'tl', theme: "--nav-bg:#fff7e6;--nav-fg:#5a3518;--nav-bd:#e2c9a0;--nav-radius:999px;--nav-shadow:0 5px 0 #d9b98a,0 10px 18px rgba(90,50,10,.25);--nav-hover:#ffe9b8;font-size:14px;font-weight:800" });
  setInterval(tick, 400);
  tick();
})();
