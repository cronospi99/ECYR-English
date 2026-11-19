// @ts-nocheck
// Gestor de sprites: carga los recortes del atlas del profe y crea billboards 3D.
import * as THREE from 'three';

import { isCharacter, makeCharacter, portraitURL, renderPortraits } from '../characters';

// Art kept from the first version of the game: effects, icons and props.
const NAMES = [
  'fx_ice', 'fx_gas', 'fx_boom', 'fx_fire', 'coin', 'diamond', 'chest', 'star',
  'icon_book', 'icon_vocab', 'icon_listen', 'icon_write', 'icon_speak', 'icon_think',
  'prop_fence', 'part_purple', 'part_gold', 'part_green', 'part_orange',
];

const cache = {}; // name -> { tex, aspect }
const drawnURL = {}; // name -> data URL of the sprites drawn in code
let shadowTex = null;

/* ---------- Sprites drawn in code: projectiles, the idea bulb and the title ---------- */
const DRAW = {
  fx_idea(x) {            // the game's currency: a bright idea
    const g = x.createRadialGradient(64, 54, 4, 64, 54, 60); g.addColorStop(0, 'rgba(255,240,150,.95)'); g.addColorStop(1, 'rgba(255,220,80,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.fillStyle = '#ffd83d'; x.strokeStyle = '#a86a00'; x.lineWidth = 5;
    x.beginPath(); x.arc(64, 52, 32, Math.PI * 0.82, Math.PI * 2.18); x.lineTo(76, 92); x.lineTo(52, 92); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#fff8c8'; x.beginPath(); x.ellipse(52, 40, 9, 13, -0.5, 0, 7); x.fill();
    x.fillStyle = '#7a8296'; x.strokeStyle = '#3a4050'; x.lineWidth = 4;
    x.beginPath(); x.roundRect(51, 92, 26, 20, 5); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(52, 100); x.lineTo(76, 100); x.moveTo(52, 106); x.lineTo(76, 106); x.stroke();
  },
  fx_chalk(x) { stick(x, '#ffffff', '#c8d0dc', 22); },
  fx_marker(x) { stick(x, '#e5484d', '#7a1a1e', 26, '#1c1a22'); },
  fx_hl(x) { stick(x, '#f6ff4a', '#8a9000', 28, '#1c1a22'); },
  fx_bolt(x) { glowBar(x, '#5cf2ff', 14); },
  fx_tack(x) { glowBar(x, '#ffd86a', 10); },
  fx_plane(x) {
    x.fillStyle = '#ffffff'; x.strokeStyle = '#7a86a0'; x.lineWidth = 5; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(118, 64); x.lineTo(12, 26); x.lineTo(40, 64); x.lineTo(12, 102); x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(118, 64); x.lineTo(40, 64); x.stroke();
  },
  fx_beam(x) { glowBar(x, '#fff3b0', 22); },
  fx_paper(x) {
    x.fillStyle = '#ffffff'; x.strokeStyle = '#9aa4b8'; x.lineWidth = 5; x.lineJoin = 'round';
    x.beginPath(); for (let i = 0; i < 11; i++) { const a = i / 11 * 6.283, r = 44 + (i % 2 ? -9 : 6); x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); } x.closePath(); x.fill(); x.stroke();
    x.beginPath(); x.moveTo(40, 50); x.lineTo(70, 66); x.lineTo(58, 92); x.moveTo(70, 66); x.lineTo(96, 52); x.stroke();
  },
  fx_arepa(x) {
    x.fillStyle = '#f4d27a'; x.strokeStyle = '#a8742a'; x.lineWidth = 6;
    x.beginPath(); x.ellipse(64, 64, 50, 44, 0, 0, 7); x.fill(); x.stroke();
    x.fillStyle = '#c98a3a'; for (const [a, b, r] of [[48, 52, 9], [78, 70, 12], [66, 44, 6], [44, 78, 7], [88, 46, 5]]) { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); }
    x.fillStyle = 'rgba(255,255,255,.6)'; for (const sx of [44, 64, 84]) { x.beginPath(); x.ellipse(sx, 16, 4, 12, 0.3, 0, 7); x.fill(); }
  },
  fx_ball(x) {
    x.fillStyle = '#ffffff'; x.strokeStyle = '#3a4050'; x.lineWidth = 5;
    x.beginPath(); x.arc(64, 64, 50, 0, 7); x.fill(); x.stroke();
    x.strokeStyle = '#3d7bd8'; x.lineWidth = 7; x.beginPath(); x.arc(20, 64, 60, -0.9, 0.9); x.stroke();
    x.strokeStyle = '#f2b632'; x.beginPath(); x.arc(108, 64, 60, 2.24, 4.04); x.stroke();
  },
  fx_flask(x) {
    x.fillStyle = 'rgba(200,240,250,.9)'; x.strokeStyle = '#3a6a80'; x.lineWidth = 5; x.lineJoin = 'round';
    x.beginPath(); x.moveTo(52, 14); x.lineTo(76, 14); x.lineTo(76, 48); x.lineTo(108, 104); x.quadraticCurveTo(110, 116, 98, 116); x.lineTo(30, 116); x.quadraticCurveTo(18, 116, 20, 104); x.lineTo(52, 48); x.closePath(); x.fill(); x.stroke();
    x.fillStyle = '#7dff6a'; x.beginPath(); x.moveTo(40, 74); x.lineTo(88, 74); x.lineTo(104, 104); x.quadraticCurveTo(106, 111, 98, 111); x.lineTo(30, 111); x.quadraticCurveTo(22, 111, 24, 104); x.closePath(); x.fill();
    x.fillStyle = '#eaffe6'; for (const [a, b, r] of [[54, 92, 6], [76, 86, 4], [66, 100, 3]]) { x.beginPath(); x.arc(a, b, r, 0, 7); x.fill(); }
  },
  fx_shh(x) {
    x.lineCap = 'round';
    for (let i = 0; i < 3; i++) { x.strokeStyle = `rgba(${150 + i * 30},${215 + i * 12},255,${0.95 - i * 0.22})`; x.lineWidth = 11 - i * 2; x.beginPath(); x.arc(34 + i * 6, 64, 22 + i * 22, -0.95, 0.95); x.stroke(); }
  },
  fx_binder(x) {
    x.fillStyle = '#2f5fa8'; x.strokeStyle = '#16305a'; x.lineWidth = 6; x.lineJoin = 'round';
    x.beginPath(); x.roundRect(16, 22, 96, 84, 8); x.fill(); x.stroke();
    x.fillStyle = '#f6ecd2'; x.fillRect(30, 30, 76, 68);
    x.fillStyle = '#f2b632'; x.fillRect(44, 44, 48, 10); x.fillStyle = '#9aa4b8'; x.fillRect(44, 64, 48, 5); x.fillRect(44, 76, 34, 5);
    x.fillStyle = '#16305a'; x.fillRect(16, 22, 16, 84);
  },
  fx_wave(x) {
    x.lineCap = 'round';
    for (let i = 0; i < 4; i++) { x.strokeStyle = `rgba(255,${240 - i * 30},${150 - i * 30},${1 - i * 0.2})`; x.lineWidth = 12 - i * 2; x.beginPath(); x.arc(-10 + i * 8, 64, 30 + i * 24, -1.05, 1.05); x.stroke(); }
  },
};
function stick(x, fill, edge, w, tip) {
  x.save(); x.translate(64, 64); x.rotate(-0.25);
  x.fillStyle = fill; x.strokeStyle = edge; x.lineWidth = 5;
  x.beginPath(); x.roundRect(-52, -w / 2, 104, w, w / 2.4); x.fill(); x.stroke();
  if (tip) { x.fillStyle = tip; x.beginPath(); x.roundRect(34, -w / 2 + 3, 22, w - 6, 5); x.fill(); }
  x.fillStyle = 'rgba(255,255,255,.55)'; x.fillRect(-40, -w / 2 + 4, 60, 4);
  x.restore();
}
function glowBar(x, col, w) {
  const g = x.createLinearGradient(0, 0, 128, 0); g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.7, col); g.addColorStop(1, '#ffffff');
  x.shadowColor = col; x.shadowBlur = 22; x.fillStyle = g;
  x.beginPath(); x.roundRect(4, 64 - w / 2, 120, w, w / 2); x.fill(); x.fill();
}
// The 3D title that floats over the board in the menu, in the mood of a horror-dubstep record
// sleeve: a cyan neon coffin glowing in the dark behind hand-painted brush letters in bone white,
// toxic slime dripping off them, the paint chipped and cracked. Free Google fonts ("Permanent
// Marker" and "Creepster"), painted over in code; no artist's logo is copied.
function drawLogo() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  const rnd = (() => { let s = 1337; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round'; x.lineCap = 'round';
  const fit = (txt, fam, size, max) => { x.font = `${size}px ${fam}`; const w = x.measureText(txt).width; return w > max ? size * max / w : size; };
  const BRUSH = '"Permanent Marker", "Creepster", "Impact", sans-serif';

  // the neon coffin behind everything, hanging on its two wires
  {
    const cx = 512, top = 18, h = 470, w = 300;
    const pts = [[-w * 0.3, 0], [w * 0.3, 0], [w * 0.5, h * 0.27], [w * 0.3, h], [-w * 0.3, h], [-w * 0.5, h * 0.27]];
    x.save(); x.translate(cx, top);
    x.strokeStyle = 'rgba(20,40,60,.9)'; x.lineWidth = 2;
    x.beginPath(); x.moveTo(-w * 0.42, h * 0.62); x.quadraticCurveTo(-w * 0.62, h * 0.95, -w * 0.5, h + 30); x.stroke();
    x.beginPath(); x.moveTo(w * 0.42, h * 0.62); x.quadraticCurveTo(w * 0.6, h * 0.9, w * 0.46, h + 30); x.stroke();
    const tube = (lw, col, blur) => { x.shadowColor = '#39e6ff'; x.shadowBlur = blur; x.lineWidth = lw; x.strokeStyle = col; x.beginPath(); pts.forEach(([px, py], i) => (i ? x.lineTo(px, py) : x.moveTo(px, py))); x.closePath(); x.stroke(); };
    x.globalAlpha = 0.85; tube(16, 'rgba(57,230,255,.25)', 40); tube(7, '#39e6ff', 26); tube(2.5, '#e6fdff', 8);
    x.restore(); x.shadowBlur = 0; x.globalAlpha = 1;
  }

  // hand-painted bone-white words: rough brush caps (Google's "Permanent Marker"), each letter a
  // little tilted and off the baseline as if painted fast, dry-brush streaks through the paint,
  // a teal glow behind and slime dripping off the bottom
  const word = (txt, y, size, tilt, drips) => {
    x.save(); x.translate(512, y); x.rotate(tilt);
    x.font = `${size}px ${BRUSH}`;
    const track = -size * 0.02;
    const ws = [...txt].map((ch) => x.measureText(ch).width + track);
    const w = ws.reduce((a, b) => a + b, 0);
    const glyphs = [];
    let cx = -w / 2;
    [...txt].forEach((ch, i) => { glyphs.push({ ch, x: cx + ws[i] / 2, y: (rnd() - 0.5) * size * 0.1, r: (rnd() - 0.5) * 0.12, k: 0.94 + rnd() * 0.14 }); cx += ws[i]; });
    const each = (fn) => glyphs.forEach((g) => { x.save(); x.translate(g.x, g.y); x.rotate(g.r); x.scale(g.k, g.k); fn(g.ch); x.restore(); });
    // grave-dark outline and drop shadow
    each((ch) => { x.lineWidth = size * 0.17; x.strokeStyle = '#04050a'; x.strokeText(ch, 5, 8); x.lineWidth = size * 0.1; x.strokeStyle = '#0a1014'; x.strokeText(ch, 0, 0); });
    // eerie glow
    x.shadowColor = '#39e6ff'; x.shadowBlur = 28;
    each((ch) => { x.fillStyle = '#39e6ff'; x.fillText(ch, 0, 2); });
    x.shadowBlur = 0;
    // bone-white paint, dirtier towards the bottom
    const g = x.createLinearGradient(0, -size / 2, 0, size / 2);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#e9eddc'); g.addColorStop(1, '#a9cdb0');
    each((ch) => { x.fillStyle = g; x.fillText(ch, 0, 0); });
    // slime drips
    for (let i = 0; i < drips; i++) {
      const dx = -w / 2 + w * (0.04 + rnd() * 0.92), len = size * (0.12 + rnd() * 0.4), dw = size * (0.03 + rnd() * 0.025), y0 = size * 0.28;
      x.fillStyle = '#7dff6a'; x.shadowColor = '#7dff6a'; x.shadowBlur = 12;
      x.beginPath(); x.moveTo(dx - dw, y0); x.lineTo(dx + dw, y0); x.lineTo(dx + dw * 0.6, y0 + len); x.arc(dx, y0 + len, dw * 0.9, 0, Math.PI); x.closePath(); x.fill();
      x.beginPath(); x.arc(dx, y0 + len + dw * 2.4 + rnd() * 8, dw * 0.7, 0, Math.PI * 2); x.fill();
      x.shadowBlur = 0;
    }
    // dry-brush streaks and chipped paint (only on the letters)
    x.globalCompositeOperation = 'source-atop';
    for (let i = 0; i < 70; i++) {
      const sy = -size * 0.42 + rnd() * size * 0.84, sx = -w / 2 + rnd() * w, len = 20 + rnd() * 90;
      x.strokeStyle = `rgba(6,10,14,${0.35 + rnd() * 0.45})`; x.lineWidth = 0.8 + rnd() * 2.2;
      x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + len, sy + (rnd() - 0.5) * 6); x.stroke();
    }
    for (let i = 0; i < 160; i++) { x.fillStyle = `rgba(8,12,16,${0.3 + rnd() * 0.5})`; x.beginPath(); x.arc(-w / 2 + rnd() * w, -size / 2 + rnd() * size, rnd() * 2.6 + 0.5, 0, 7); x.fill(); }
    x.globalCompositeOperation = 'source-over';
    x.restore();
  };
  word('LANGUAGE', 136, fit('LANGUAGE', BRUSH, 150, 840), -0.05, 6);
  word('DEFENDERS', 300, fit('DEFENDERS', BRUSH, 190, 990), -0.03, 11);

  // tagline on a cracked tombstone plate
  {
    x.font = `40px ${BRUSH}`;
    const t = 'LEARN  ·  DEFEND  ·  WIN', w = x.measureText(t).width + 60;
    x.fillStyle = 'rgba(6,8,12,.88)'; x.strokeStyle = 'rgba(57,230,255,.75)'; x.lineWidth = 3;
    x.shadowColor = '#39e6ff'; x.shadowBlur = 14;
    x.beginPath(); x.roundRect(512 - w / 2, 420, w, 58, 10); x.fill(); x.stroke();
    x.shadowBlur = 10; x.fillStyle = '#c9fbff'; x.fillText(t, 512, 451);
    x.shadowBlur = 0;
  }
  return c;
}
function registerDrawn() {
  for (const name of Object.keys(DRAW)) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    DRAW[name](c.getContext('2d'));
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    tex.userData.shared = true;
    cache[name] = { tex, aspect: 1 };
    drawnURL[name] = c.toDataURL('image/png');
  }
  const lc = drawLogo();
  const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 4;
  lt.userData.shared = true;
  cache.logo = { tex: lt, aspect: 2 };
}

export async function preloadSprites() {
  // the title uses the display font: wait for it (briefly) so the texture is drawn with it
  try { await Promise.race([Promise.all([document.fonts.load('900 60px "Luckiest Guy"'), document.fonts.load('60px "Permanent Marker"'), document.fonts.load('40px "Permanent Marker"')]), new Promise(r => setTimeout(r, 2500))]); } catch { /* fallback font */ }
  registerDrawn();
  renderPortraits();
  const loader = new THREE.TextureLoader();
  return Promise.all(NAMES.map(name => new Promise((res) => {
    loader.load(`/defenders/sprites/${name}.webp`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      tex.userData.shared = true;
      cache[name] = { tex, aspect: tex.image.width / tex.image.height };
      res();
    }, undefined, () => { cache[name] = null; res(); }); // tolerante a faltantes
  })));
}

// Image for the HTML interface: a rendered portrait for characters, a drawn sprite or a file.
export function spriteURL(name) {
  return portraitURL(name) || drawnURL[name] || `/defenders/sprites/${name}.webp`;
}

export function spriteTex(name) { return cache[name] || null; }

function getShadowTex() {
  if (shadowTex) return shadowTex;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const g = ctx.createRadialGradient(64, 64, 8, 64, 64, 60);
  g.addColorStop(0, 'rgba(10,20,5,0.45)');
  g.addColorStop(1, 'rgba(10,20,5,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  shadowTex = new THREE.CanvasTexture(c);
  shadowTex.userData.shared = true;
  return shadowTex;
}

// Billboard vertical (gira sólo en Y hacia la cámara). userData.plane para animaciones.
// `crop` (0..1) muestra sólo la fracción superior de la textura (p. ej. 0.62 = de la
// cabeza al torso), dejando ver debajo las piernas del cuerpo 3D. `crop = 1` = completo.
export function makeBillboard(name, height, { flip = false, shadow = true, emissive = 0, crop = 1 } = {}) {
  // The cast is real 3D now: same contract (userData.plane / userData.mat) as a billboard.
  if (isCharacter(name)) return makeCharacter(name, height, shadow);
  const g = new THREE.Group();
  const entry = cache[name];
  const aspect = entry ? entry.aspect : 1;
  const mat = new THREE.MeshBasicMaterial({
    map: entry ? entry.tex : null,
    transparent: true,
    alphaTest: 0.02,
    depthWrite: false,
    side: THREE.DoubleSide,
    color: 0xffffff,
  });
  if (!entry) mat.color.set(0xff00ff);
  const keep = Math.max(0.05, Math.min(1, crop));
  const planeH = height * keep;
  const geo = new THREE.PlaneGeometry(height * aspect, planeH);
  if (keep < 1) {
    // recorta la parte inferior: los vértices bajos muestrean desde v=1-keep hacia arriba
    const uv = geo.attributes.uv;
    uv.setY(2, 1 - keep); uv.setY(3, 1 - keep);
    uv.needsUpdate = true;
  }
  const plane = new THREE.Mesh(geo, mat);
  // alinea el recorte con la parte alta de la silueta (cabeza arriba, corte a la cadera)
  plane.position.y = height - planeH / 2;
  if (flip) plane.scale.x = -1;
  g.add(plane);
  if (shadow) {
    const sh = new THREE.Mesh(
      new THREE.PlaneGeometry(height * aspect * 0.85, height * aspect * 0.5),
      new THREE.MeshBasicMaterial({ map: getShadowTex(), transparent: true, depthWrite: false })
    );
    sh.rotation.x = -Math.PI / 2;
    sh.position.y = 0.015;
    g.add(sh);
  }
  g.userData.plane = plane;
  g.userData.mat = mat;
  g.userData.h = height;
  return g;
}

// Etiqueta flotante (píldora con texto) siempre de cara a la cámara.
// Se usa para el nivel de evolución de cada planta (Lv1 / Lv2 ⬆ / MAX).
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}
export function makeLabelSprite() {
  const c = document.createElement('canvas');
  c.width = 256; c.height = 128;
  const ctx = c.getContext('2d');
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false, depthTest: false });
  const spr = new THREE.Sprite(mat);
  spr.scale.set(0.8, 0.4, 1);
  spr.renderOrder = 20;
  spr.userData = { canvas: c, ctx, tex };
  return spr;
}
export function setLabel(spr, text, bg = '#2a1d0a', fg = '#ffe9a8') {
  const { ctx, tex } = spr.userData;
  ctx.clearRect(0, 0, 256, 128);
  ctx.fillStyle = bg;
  roundRect(ctx, 20, 34, 216, 60, 26); ctx.fill();
  ctx.lineWidth = 6; ctx.strokeStyle = 'rgba(0,0,0,.55)'; ctx.stroke();
  ctx.fillStyle = fg; ctx.font = '800 48px Nunito, Segoe UI, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  ctx.fillText(text, 128, 66);
  tex.needsUpdate = true;
}

// Sprite plano siempre de cara a la cámara (para brillos y efectos)
export function makeGlowSprite(color = 0xffd870, size = 2) {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const ctx = c.getContext('2d');
  const col = new THREE.Color(color);
  const g = ctx.createRadialGradient(64, 64, 2, 64, 64, 62);
  g.addColorStop(0, `rgba(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0},0.9)`);
  g.addColorStop(0.4, `rgba(${col.r * 255 | 0},${col.g * 255 | 0},${col.b * 255 | 0},0.25)`);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(c);
  const mat = new THREE.SpriteMaterial({ map: tex, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false });
  const s = new THREE.Sprite(mat);
  s.scale.setScalar(size);
  return s;
}
