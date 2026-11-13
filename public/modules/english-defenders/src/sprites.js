// Gestor de sprites: carga los recortes del atlas del profe y crea billboards 3D.
import * as THREE from 'three';

const NAMES = [
  'plant_peashooter', 'plant_sunflower', 'plant_tallnut', 'plant_nut', 'plant_repeater', 'plant_icepea',
  'plant_garlic', 'plant_cabbage', 'plant_firepea', 'plant_spikeweed', 'plant_chili',
  'plant_electricpea', 'plant_laserbean', 'plant_wintermelon',
  'plant_dblsunny', 'plant_triple',
  'plant_cactus', 'plant_cactus_tall', 'plant_cherry', 'plant_potato', 'plant_corn',
  'zombie_basic', 'zombie_cone', 'zombie_bucket', 'zombie_book', 'zombie_flag', 'zombie_football', 'zombie_prof', 'zombie_balloon',
  'zombie_boss',
  'fx_pea', 'fx_sun', 'fx_ice', 'fx_gas', 'fx_boom', 'fx_fire', 'fx_spike', 'fx_corn', 'fx_cabbage',
  'coin', 'diamond', 'chest', 'star', 'logo',
  'icon_book', 'icon_vocab', 'icon_listen', 'icon_write', 'icon_speak', 'icon_think',
  'prop_house', 'prop_fence', 'prop_flag', 'prop_tree', 'prop_rocks', 'prop_signpost', 'prop_mailbox',
  'prop_crate', 'prop_barrel', 'prop_lantern', 'prop_bench', 'prop_hydrant', 'prop_vending', 'prop_trash', 'prop_cone',
  'deco_zhead', 'deco_balloons', 'deco_board', 'deco_gnome', 'deco_planter',
  'sign_this', 'sign_levels', 'sign_grammar', 'sign_vocab', 'sign_phrasal',
  'door_portal', 'door_arch', 'door_gold',
  'detail_grass', 'detail_plant', 'detail_rocks', 'detail_flower', 'detail_bush', 'detail_flowers2', 'detail_mushrooms',
  'part_purple', 'part_gold', 'part_green', 'part_orange',
];

const cache = {}; // name -> { tex, aspect }
let shadowTex = null;

export function preloadSprites() {
  const loader = new THREE.TextureLoader();
  return Promise.all(NAMES.map(name => new Promise((res) => {
    loader.load(`assets/sprites/${name}.webp`, (tex) => {
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      cache[name] = { tex, aspect: tex.image.width / tex.image.height };
      res();
    }, undefined, () => { cache[name] = null; res(); }); // tolerante a faltantes
  })));
}

export function spriteURL(name) { return `assets/sprites/${name}.webp`; }

// Textura ya cargada de un sprite (para cambiar la forma de una planta en caliente).
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
