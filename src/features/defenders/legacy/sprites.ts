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
// The 3D title that floats over the board in the menu.
function drawLogo() {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 512;
  const x = c.getContext('2d');
  x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
  const line = (txt, y, size, fill, stroke) => {
    x.font = `900 ${size}px "Luckiest Guy", "Nunito", "Arial Black", sans-serif`;
    x.lineWidth = size * 0.26; x.strokeStyle = '#0d1b3d'; x.strokeText(txt, 512, y + size * 0.07);
    x.lineWidth = size * 0.14; x.strokeStyle = stroke; x.strokeText(txt, 512, y);
    const g = x.createLinearGradient(0, y - size / 2, 0, y + size / 2); g.addColorStop(0, fill[0]); g.addColorStop(1, fill[1]);
    x.fillStyle = g; x.fillText(txt, 512, y);
    x.fillStyle = 'rgba(255,255,255,.35)'; x.save(); x.beginPath(); x.rect(0, y - size / 2, 1024, size * 0.36); x.clip(); x.fillText(txt, 512, y); x.restore();
  };
  line('LANGUAGE', 150, 150, ['#fff6a8', '#ffb52e'], '#ffffff');
  line('DEFENDERS', 310, 172, ['#7df0ff', '#2f7de8'], '#ffffff');
  x.font = '800 44px "Nunito", sans-serif';
  x.lineWidth = 12; x.strokeStyle = '#0d1b3d'; x.strokeText('LEARN  ·  DEFEND  ·  WIN', 512, 440);
  x.fillStyle = '#ffffff'; x.fillText('LEARN  ·  DEFEND  ·  WIN', 512, 440);
  return c;
}
function registerDrawn() {
  for (const name of Object.keys(DRAW)) {
    const c = document.createElement('canvas'); c.width = c.height = 128;
    DRAW[name](c.getContext('2d'));
    const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
    cache[name] = { tex, aspect: 1 };
    drawnURL[name] = c.toDataURL('image/png');
  }
  const lc = drawLogo();
  const lt = new THREE.CanvasTexture(lc); lt.colorSpace = THREE.SRGBColorSpace; lt.anisotropy = 4;
  cache.logo = { tex: lt, aspect: 2 };
}

export async function preloadSprites() {
  // the title uses the display font: wait for it (briefly) so the texture is drawn with it
  try { await Promise.race([document.fonts.load('900 60px "Luckiest Guy"'), new Promise(r => setTimeout(r, 1500))]); } catch { /* fallback font */ }
  registerDrawn();
  renderPortraits();
  const loader = new THREE.TextureLoader();
  return Promise.all(NAMES.map(name => new Promise((res) => {
    loader.load(`/defenders/sprites/${name}.webp`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
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
