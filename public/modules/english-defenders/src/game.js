// English Defenders — 3D game engine (Teacher Esteban Yepes)
// Lane tower-defense + minigames. Characters are billboard sprites from the teacher's atlas.
import * as THREE from 'three';
import { makeBoardTexture, makeDirtTexture, makeStoneTexture, makeSkyTexture, makeGradientSky } from './textures.js';
import { makeVase } from './models.js';
import { makeBillboard, makeGlowSprite, makeLabelSprite, setLabel, spriteTex } from './sprites.js';
import { modelsReady, makeBuilding } from './models3d.js';
import { SFX } from './audio.js';

export const ROWS = 5, COLS = 9;
// Borde norte del suelo = línea de la cerca. El fondo pintado arranca aquí.
const GROUND_EDGE_Z = -(5 / 2) - 1.0;
const BACKDROP_Z = -5.2; // plano del fondo pintado, justo detrás de la cerca
const colX = (c) => c - (COLS - 1) / 2;
const rowZ = (r) => r - (ROWS - 1) / 2;

// Los sprites del atlas ya miran hacia la derecha (hacia los zombies): sin flip.
// Prestigios por nivel CEFR: Basic (A1) → Silver (A2) → Golden (B1) → Platinum (B2) → Diamond (C1)
export const TIER_RANK = { basic: 0, silver: 1, golden: 2, platinum: 3, diamond: 4 };
// Roster de 15 plantas (arte oficial de la lámina "Plants & Evolved Versions").
// kind: estilo de proyectil (pea/frost/kernel/spike/flame/lob). Cada planta puede
// evolucionar a LVL2/LVL3 tocándola (más daño, cadencia, disparos y vida).
export const PLANTS = {
  // ===== BASIC (A1) =====
  shooter:     { name: 'Pea Shooter',   tier: 'basic',    sprite: 'plant_peashooter',  h: 0.95, cost: 100, hp: 300,  cooldown: 6,  kind: 'pea',   fireRate: 1.5, dmg: 20 },
  sunny:       { name: 'Sunflower',      tier: 'basic',    sprite: 'plant_sunflower',   h: 0.95, cost: 50,  hp: 120,  cooldown: 6, sun: 25 },
  wallnut:     { name: 'Wall-Nut',       tier: 'basic',    sprite: 'plant_nut',         h: 0.85, cost: 50,  hp: 2000, cooldown: 12 },
  nut:         { name: 'Tall-Nut',       tier: 'basic',    sprite: 'plant_tallnut',     h: 0.92, cost: 125, hp: 4000, cooldown: 18 },
  // ===== EVOLVED / SILVER (A2) =====
  repeater:    { name: 'Repeater',       tier: 'silver',   sprite: 'plant_repeater',    h: 0.95, cost: 175, hp: 350,  cooldown: 8,  kind: 'pea',   fireRate: 1.6, dmg: 18, multi: 2 },
  icepea:      { name: 'Ice Pea',        tier: 'silver',   sprite: 'plant_icepea',      h: 0.95, cost: 150, hp: 300,  cooldown: 8,  kind: 'frost', fireRate: 1.9, dmg: 20, slow: true },
  garlic:      { name: 'Garlic',         tier: 'silver',   sprite: 'plant_garlic',      h: 0.85, cost: 50,  hp: 800,  cooldown: 9, divert: true, divertDmg: 45 },
  // ===== GOLDEN (B1) =====
  cabbage:     { name: 'Cabbage-pult',   tier: 'golden',   sprite: 'plant_cabbage',     h: 0.95, cost: 125, hp: 130,  cooldown: 8,  kind: 'lob', lobSprite: 'fx_cabbage', fireRate: 2.4, dmg: 40 },
  corn:        { name: 'Corn Launcher',  tier: 'golden',   sprite: 'plant_corn',        h: 0.98, cost: 150, hp: 140,  cooldown: 9,  kind: 'lob', lobSprite: 'fx_corn', fireRate: 2.2, dmg: 45, aoe: 1.0 },
  // Cactus: en reposo ataca por tierra; estirado es lo ÚNICO que alcanza al Balloon Zombie
  cactus:      { name: 'Cactus',         tier: 'golden',   sprite: 'plant_cactus',      h: 0.95, cost: 150, hp: 300,  cooldown: 9,  kind: 'spike', fireRate: 1.8, dmg: 22, antiAir: true, tallSprite: 'plant_cactus_tall', tallH: 1.6 },
  cherry:      { name: 'Cherry Bomb',    tier: 'platinum', sprite: 'plant_cherry',      h: 0.85, cost: 150, hp: 100,  cooldown: 25, bomb: 'plus', bombDmg: 1800 },
  potato:      { name: 'Potato Mine',    tier: 'basic',    sprite: 'plant_potato',      h: 0.55, cost: 25,  hp: 100,  cooldown: 20, mine: true, mineDmg: 1800, armTime: 8 },
  firepea:     { name: 'Fire Pea',       tier: 'golden',   sprite: 'plant_firepea',     h: 0.95, cost: 200, hp: 300,  cooldown: 12, kind: 'flame', fireRate: 2.0, dmg: 25, burn: 0.7 },
  spikeweed:   { name: 'Spikeweed',      tier: 'golden',   sprite: 'plant_spikeweed',   h: 0.42, cost: 100, hp: 400,  cooldown: 9,  ground: true, groundDmg: 20 },
  dblsunny:    { name: 'Twin Sunflower',  tier: 'golden',   sprite: 'plant_dblsunny',    h: 0.98, cost: 125, hp: 150,  cooldown: 8, sun: 50 },
  triplepea:   { name: 'Triple Peashooter', tier: 'golden', sprite: 'plant_triple',      h: 0.98, cost: 250, hp: 400,  cooldown: 12, kind: 'pea', fireRate: 2.0, dmg: 17, multi: 3 },
  // ===== MAX / PLATINUM (B2) =====
  chili:       { name: 'Chili Pepper',   tier: 'platinum', sprite: 'plant_chili',       h: 0.9,  cost: 175, hp: 100,  cooldown: 30, bomb: 'lane', bombDmg: 1800 },
  // ===== MAX EVOLVED / DIAMOND (C1) =====
  electricpea: { name: 'Electric Pea',   tier: 'diamond',  sprite: 'plant_electricpea', h: 0.95, cost: 225, hp: 320,  cooldown: 10, kind: 'spike', fireRate: 1.3, dmg: 22, pierce: 3 },
  laserbean:   { name: 'Laser Bean',     tier: 'diamond',  sprite: 'plant_laserbean',   h: 0.9,  cost: 200, hp: 140,  cooldown: 12, kind: 'spike', fireRate: 1.1, dmg: 35, pierce: 5 },
  wintermelon: { name: 'Winter Melon',   tier: 'diamond',  sprite: 'plant_wintermelon', h: 0.92, cost: 175, hp: 150,  cooldown: 14, kind: 'lob', lobSprite: 'fx_ice', fireRate: 2.8, dmg: 50, aoe: 1.4, slow: true },
};

// ===== Dificultad de la partida =====
// Se elige antes de cada batalla y toca de forma coherente TODAS las palancas:
// vida y velocidad de los zombies, cuántos vienen y cada cuánto, qué tipos aparecen
// (poolBias adelanta o retrasa a los enemigos duros), el sol con el que arrancas y
// la frecuencia con que cae, y si tienes o no los libros voladores de última defensa.
export const DIFFICULTIES = {
  easy:    { name: 'Easy',    emoji: '🌱', star: 1,
             hp: 0.70, speed: 0.85, count: 0.75, interval: 1.30, poolBias: -1.0,
             sun: 275, sunRate: 0.80, mowers: true,
             desc: 'Fewer, slower zombies and plenty of sun. Great for learning.' },
  medium:  { name: 'Medium',  emoji: '🌻', star: 2,
             hp: 1.00, speed: 1.00, count: 1.00, interval: 1.00, poolBias: 0,
             sun: 175, sunRate: 1.00, mowers: true,
             desc: 'The standard battle. Balanced sun, waves and enemies.' },
  hard:    { name: 'Hard',    emoji: '🔥', star: 3,
             hp: 1.40, speed: 1.12, count: 1.30, interval: 0.82, poolBias: 1.2,
             sun: 125, sunRate: 1.18, mowers: true,
             desc: 'Tougher crowds, tougher zombies and less sun to work with.' },
  extreme: { name: 'Extreme', emoji: '💀', star: 4,
             hp: 1.90, speed: 1.28, count: 1.60, interval: 0.68, poolBias: 2.4,
             sun: 100, sunRate: 1.35, mowers: false,
             desc: 'Brutal waves, elite zombies early — and NO lawn mowers to save you.' },
};
export const DEFAULT_DIFFICULTY = 'medium';

// ===== Escenarios (los 12 fondos del arte de referencia) =====
// Cada tema recolorea cielo, tablero, suelo, niebla e iluminación.
export const THEMES = {
  day:     { name: 'Suburban · Day',   emoji: '🏡', sky: [[0,'#78c4f0'],[.55,'#a8ddf5'],[.8,'#d8efc8'],[1,'#e8f5d8']], board:{l1:'#8fbf4d',l2:'#7cae3e',d1:'#77a83a',d2:'#699733',blade:'120,160,60'}, dirt:['#6e4f2a','#5a3f20'], fog:0xcfe8d8, hemiSky:0xeaf6ff, hemiGround:0x5a7a3a, hemiI:0.95, sun:0xfff2d8, sunI:2.0, backdrop:true },
  night:   { name: 'Suburban · Night', emoji: '🌙', sky: [[0,'#0b1836'],[.55,'#1c2c52'],[.85,'#26406a'],[1,'#33507a']], board:{l1:'#3d5a4a',l2:'#324c48',d1:'#2c4450',d2:'#25384a',blade:'80,120,90'}, dirt:['#2a3040','#20263a'], fog:0x223050, hemiSky:0x9fb6e8, hemiGround:0x24304a, hemiI:0.7, sun:0xbcccff, sunI:1.1, backdrop:true },
  ruins:   { name: 'Ancient Ruins',    emoji: '🏛️', sky: [[0,'#4a5a4a'],[.5,'#6a7358'],[1,'#8a8a66']], board:{l1:'#9aa080',l2:'#868c68',d1:'#7c8460',d2:'#6a7350',blade:'110,120,80'}, dirt:['#7a7458','#5f5a40'], fog:0x6a7358, hemiSky:0xcfe0c0, hemiGround:0x556040, hemiI:0.85, sun:0xffe6b0, sunI:1.5, backdrop:false },
  pirate:  { name: 'Pirate Ship',      emoji: '🏴‍☠️', sky: [[0,'#4aa0d8'],[.5,'#7ac0e8'],[1,'#c8e8f0']], board:{l1:'#b98a52',l2:'#a87a44',d1:'#9a6c3a',d2:'#8a5e30',blade:'150,110,60'}, dirt:['#5a4028','#432f1c'], fog:0x9ac0d8, hemiSky:0xd0eefb, hemiGround:0x6a5030, hemiI:1.0, sun:0xfff0d0, sunI:1.9, backdrop:false },
  desert:  { name: 'Desert Canyon',    emoji: '🏜️', sky: [[0,'#e8a860'],[.5,'#f0c890'],[1,'#f8e0b0']], board:{l1:'#e8c888',l2:'#dcb870',d1:'#d0a860',d2:'#c49850',blade:'180,140,80'}, dirt:['#c89858','#a87838'], fog:0xe0b878, hemiSky:0xfff0d0, hemiGround:0x9a6a30, hemiI:1.1, sun:0xffe0a0, sunI:2.1, backdrop:false },
  snow:    { name: 'Snowy Mountains',  emoji: '❄️', sky: [[0,'#a8d8f0'],[.5,'#d0ecf8'],[1,'#f0f8ff']], board:{l1:'#e8f2fb',l2:'#d6e8f5',d1:'#cfe2f0',d2:'#bcd6ea',blade:'150,180,210'}, dirt:['#cfe0ee','#b8cee0'], fog:0xdcecf5, hemiSky:0xffffff, hemiGround:0x9ab0c0, hemiI:1.1, sun:0xf0f6ff, sunI:1.9, backdrop:false },
  haunted: { name: 'Haunted Manor',    emoji: '👻', sky: [[0,'#1a1030'],[.5,'#2a1c48'],[1,'#432a5a']], board:{l1:'#6a5a8a',l2:'#5a4a78',d1:'#4e4068',d2:'#433658',blade:'130,110,160'}, dirt:['#332a48','#241c38'], fog:0x2a1c48, hemiSky:0x9a80c0, hemiGround:0x2a1c40, hemiI:0.7, sun:0xc0a0ff, sunI:1.1, backdrop:false },
  future:  { name: 'Future City',      emoji: '🌆', sky: [[0,'#0a1a3a'],[.5,'#12335a'],[1,'#1a5a8a']], board:{l1:'#2a5a7a',l2:'#22496a',d1:'#1e3f5e',d2:'#183450',blade:'90,220,240'}, dirt:['#20303f','#16232f'], fog:0x123a5a, hemiSky:0x8ad0ff, hemiGround:0x1a3a5a, hemiI:0.85, sun:0x90e0ff, sunI:1.4, backdrop:false },
  jungle:  { name: 'Jungle Temple',    emoji: '🌴', sky: [[0,'#3a7a4a'],[.5,'#6aa858'],[1,'#a8d090']], board:{l1:'#7ab85a',l2:'#68a848',d1:'#5c9a3e',d2:'#4e8a34',blade:'90,150,60'}, dirt:['#4a6a2a','#35501c'], fog:0x6aa858, hemiSky:0xd0f0c0, hemiGround:0x2a5a2a, hemiI:0.95, sun:0xf0ffd0, sunI:1.7, backdrop:false },
  beach:   { name: 'Beach Resort',     emoji: '🏖️', sky: [[0,'#4ab8e8'],[.5,'#9adcf0'],[1,'#f0e8c0']], board:{l1:'#f0dca0',l2:'#e8d090',d1:'#e0c47e',d2:'#d4b86e',blade:'200,170,110'}, dirt:['#e0c880','#c8ac60'], fog:0xbfe0e8, hemiSky:0xe0f8ff, hemiGround:0x9a8050, hemiI:1.1, sun:0xfff0d0, sunI:2.1, backdrop:false },
  volcano: { name: 'Volcano Island',   emoji: '🌋', sky: [[0,'#3a1810'],[.5,'#7a2a18'],[1,'#c04a20']], board:{l1:'#6a5a52',l2:'#5a4a44',d1:'#4e403a',d2:'#443632',blade:'200,90,40'}, dirt:['#4a2418','#331810'], fog:0x6a2a18, hemiSky:0xffb080, hemiGround:0x4a1a10, hemiI:0.8, sun:0xff9050, sunI:1.6, backdrop:false },
  magic:   { name: 'Magic Forest',     emoji: '🍄', sky: [[0,'#1a2a4a'],[.5,'#2a4a6a'],[1,'#3a6a7a']], board:{l1:'#4a8a8a',l2:'#3e7a7e',d1:'#366e74',d2:'#2e6068',blade:'120,240,210'}, dirt:['#2a4a4a','#1c3838'], fog:0x2a4a5a, hemiSky:0x90f0e0, hemiGround:0x2a4a4a, hemiI:0.9, sun:0xa0ffe0, sunI:1.4, backdrop:false },
};

// Repintado de la casa por escenario. El GLB trae un solo material, así que el
// color se multiplica sobre su textura: en la nieve queda blanca y fría, y en la
// playa cálida y tropical. Los escenarios sin entrada usan la casa tal cual.
export const HOUSE_TINT = {
  snow:  { color: 0xeaf4ff, emissive: 0x203040, emissiveIntensity: 0.18 }, // blanca, con luz fría rebotada
  beach: { color: 0xffd2a0, emissive: 0x4a2a10, emissiveIntensity: 0.14 }, // madera cálida de resort
};

export const ZOMBIE_TYPES = {
  basic:    { sprite: 'zombie_basic',    h: 1.4,  hp: 100, speed: 0.22, dmg: 28 },
  // El arte nuevo del abanderado y del profesor viene en formato apaisado (el
  // estandarte y los brazos ocupan mucho ancho), así que su cuerpo es una fracción
  // menor de la lámina: se sube `h` para que el zombi se lea del mismo tamaño.
  flag:     { sprite: 'zombie_flag',     h: 1.9,  hp: 120, speed: 0.30, dmg: 28 },
  cone:     { sprite: 'zombie_cone',     h: 1.5,  hp: 210, speed: 0.22, dmg: 28 },
  book:     { sprite: 'zombie_book',     h: 1.4,  hp: 130, speed: 0.24, dmg: 28 },
  bucket:   { sprite: 'zombie_bucket',   h: 1.55, hp: 240, speed: 0.18, dmg: 28 },
  football: { sprite: 'zombie_football', h: 1.45, hp: 360, speed: 0.40, dmg: 38 },
  balloon:  { sprite: 'zombie_balloon',  h: 1.35, hp: 170, speed: 0.30, dmg: 28, flying: true },
  prof:     { sprite: 'zombie_prof',     h: 1.7,  hp: 560, speed: 0.14, dmg: 48 },
  // Jefe: enorme, resistentísimo y ocupa DOS carriles (daña plantas de ambos)
  boss:     { sprite: 'zombie_boss',     h: 2.5,  hp: 6000, speed: 0.10, dmg: 90, boss: true, lanes: 2 },
};

// Descripción breve (en inglés) de cada planta, para el selector previo y el almanaque.
export const PLANT_DESC = {
  shooter:     'Fires peas straight down its lane. A cheap, reliable starter attacker.',
  sunny:       'Makes extra sun so you can afford more plants. Plant these first!',
  wallnut:     'A cheap, sturdy wall for only 50 sun. Blocks zombies while your shooters work.',
  nut:         'An even tougher, taller wall that blocks zombies for a long time. It does not attack.',
  repeater:    'Fires two peas at once for double the damage of a Pea Shooter.',
  icepea:      'Frozen peas that damage AND slow the zombies they hit.',
  garlic:      'Bites zombies and shoves them into the next lane — great for steering a crowd away.',
  cabbage:     'Lobs cabbages in an arc — hits zombies even behind walls.',
  firepea:     'Burning peas that set zombies on fire for extra damage over time.',
  spikeweed:   'Lies flat on the ground and hurts every zombie that walks over it.',
  dblsunny:    'A Twin Sunflower: makes 50 sun at once — double a normal Sunflower.',
  triplepea:   'Fires three peas at a time straight down its lane for heavy damage.',
  chili:       'Burns down its whole lane from left to right, leaving only charred shadows. One-time use.',
  corn:        'Lobs hot corn cobs in an arc — they splash and hit zombies behind walls.',
  cactus:      'Shoots spikes at ground zombies, and stretches tall to pop Balloon Zombies — the only plant that can.',
  cherry:      'Blows up in a big plus shape: its own tile and two tiles up, down, left and right.',
  potato:      'Cheap buried mine. It needs a moment to arm, then blows up the first zombie that touches it.',
  electricpea: 'Electric shots that pierce through several zombies in a row.',
  laserbean:   'Powerful piercing beams that hit many zombies in the lane at once.',
  wintermelon: 'Heavy icy melons that damage and slow a whole group of zombies.',
};

// Nombre, sprite y descripción de cada zombi, para el almanaque.
export const ZOMBIE_INFO = {
  basic:    { name: 'Basic Zombie',      sprite: 'zombie_basic',    desc: 'A slow, ordinary zombie. Weak alone, but they come in crowds.' },
  flag:     { name: 'Flag Zombie',       sprite: 'zombie_flag',     desc: 'Leads a wave and moves a little faster. It means a bigger attack is coming.' },
  cone:     { name: 'Cone-head Zombie',  sprite: 'zombie_cone',     desc: 'Wears a traffic cone for armour. Tougher than a basic zombie.' },
  book:     { name: 'Newspaper Zombie',  sprite: 'zombie_book',     desc: 'Reads its newspaper for cover and speeds up when it is badly hurt.' },
  bucket:   { name: 'Bucket-head Zombie',sprite: 'zombie_bucket',   desc: 'A metal bucket makes it very tough. Bring heavy hitters or lob over it.' },
  football: { name: 'Football Zombie',   sprite: 'zombie_football', desc: 'Fast and strong — it charges down the lane in a helmet.' },
  balloon:  { name: 'Balloon Zombie',    sprite: 'zombie_balloon',  desc: 'Flies over your garden. Only a Cactus stretching tall can pop it.' },
  prof:     { name: 'Professor Zombie',  sprite: 'zombie_prof',     desc: 'A boss zombie that soaks up a huge amount of damage.' },
  boss:     { name: 'Boss Zombie',       sprite: 'zombie_boss',     desc: 'A giant that walks across two lanes at once and takes enormous punishment.' },
};

// ===== Evolución: las cifras exactas que aplica el motor al mejorar una planta =====
// Están aquí (y no sueltas dentro de _applyEvolve) para que el almanaque pueda
// enseñar la ficha técnica de cada nivel sin duplicar fórmulas.
export const EVOLVE = {
  dmg: 1.5,      // daño por disparo ×1.5 por nivel
  rate: 0.82,    // segundos entre ráfagas ×0.82 por nivel (dispara más rápido)
  hp: 1.7,       // vida ×1.7 por nivel
  aoe: 0.2,      // +20% de radio de salpicadura por nivel
  slow: 1.5,     // +1.5 s de congelación por nivel
  sunRate: 0.55, // +55% de ritmo de producción de soles por nivel
  shots: 1,      // +1 disparo por ráfaga y nivel
};
export const MAX_PLANT_LEVEL = 3;

// Coste en soles de subir una planta del nivel dado al siguiente.
export function evolveCostFor(def, level) { return Math.round(def.cost * (level * 0.75 + 0.5)); }

// Alcance de cada planta, en palabras: el motor no usa radios, cada planta ataca
// (o no) de una forma concreta dentro de su carril.
function plantRange(def) {
  if (def.kind === 'lob') return 'Whole lane, in an arc over walls';
  if (def.kind) return 'Whole lane, straight ahead';
  if (def.bomb === 'plus') return 'Its tile plus 2 tiles up, down, left and right';
  if (def.bomb === 'lane') return 'Its whole lane, left to right';
  if (def.mine) return 'Its own tile, once armed';
  if (def.ground) return 'Its own tile, all the time';
  if (def.divert) return 'Contact — the zombie standing on it';
  if (def.sun) return 'No attack — it makes sun';
  return 'No attack — it only blocks';
}

// Ficha técnica de una planta en un nivel de evolución dado (1–3).
// Devuelve números ya escalados + rasgos en texto, listos para pintar.
export function plantStats(id, level = 1) {
  const def = PLANTS[id];
  if (!def) return null;
  const n = Math.max(1, Math.min(MAX_PLANT_LEVEL, level | 0));
  const step = (base, mul) => base * Math.pow(mul, n - 1);
  const s = {
    id, level: n, name: def.name, tier: def.tier, sprite: def.sprite, cost: def.cost,
    desc: PLANT_DESC[id] || '',
    hp: Math.round(step(def.hp, EVOLVE.hp)),
    recharge: def.cooldown,
    range: plantRange(def),
    targets: def.antiAir ? 'Ground zombies — and flying ones when it stretches'
      : def.ground || def.mine ? 'Ground zombies only (flyers pass over)'
      : def.kind || def.bomb || def.divert ? 'Ground zombies' : '—',
    upgradeCost: n < MAX_PLANT_LEVEL ? evolveCostFor(def, n) : null,
    traits: [],
  };
  if (def.fireRate) {
    s.shots = (def.multi || 1) + (n - 1) * EVOLVE.shots;
    s.interval = step(def.fireRate, EVOLVE.rate);
    s.dmg = Math.round(step(def.dmg, EVOLVE.dmg));
    // el lanzamiento en arco sale de uno en uno por muchas ráfagas que tenga
    s.dps = (s.dmg * (def.kind === 'lob' ? 1 : s.shots)) / s.interval;
  }
  if (def.sun) {
    s.sun = def.sun * n;
    s.sunEvery = 12 / (1 + (n - 1) * EVOLVE.sunRate);
  }
  if (def.aoe || def.kind === 'lob') s.aoe = (def.aoe || 0.7) * (1 + (n - 1) * EVOLVE.aoe);
  if (def.slow) s.slowDur = 3 + (n - 1) * EVOLVE.slow;
  if (def.ground) s.groundDps = Math.round(def.groundDmg * step(1, EVOLVE.dmg));
  if (def.divert) s.biteDmg = Math.round(def.divertDmg * step(1, EVOLVE.dmg));
  if (def.mine) { s.blastDmg = def.mineDmg; s.armTime = def.armTime; }
  if (def.bomb) s.blastDmg = def.bombDmg;
  if (def.pierce) s.pierce = def.pierce;

  const t = s.traits;
  if (def.slow) t.push(`Slows what it hits for ${s.slowDur.toFixed(1)} s`);
  if (def.burn) t.push('Sets zombies on fire — splashes onto neighbours');
  if (def.pierce) t.push(`Pierces through ${def.pierce} zombies per shot`);
  if (s.aoe) t.push(`Splash damage in a ${s.aoe.toFixed(1)}-tile radius`);
  if (def.antiAir) t.push('The only plant that can pop Balloon Zombies');
  if (def.divert) t.push('Shoves the zombie into the next lane');
  if (def.mine) t.push(`Needs ${def.armTime} s to arm, then explodes once`);
  if (def.bomb) t.push('One-time use — it is spent after exploding');
  if (def.ground) t.push('Flat on the ground: zombies cannot eat it');
  if (def.sun) t.push('Plant these first — everything else needs sun');
  if (!def.kind && !def.bomb && !def.mine && !def.ground && !def.divert && !def.sun) t.push('Pure wall: it soaks damage so your shooters can work');
  return s;
}

// Ficha técnica de un zombi. Su "daño" es mordisco por segundo sobre la planta.
export function zombieStats(id) {
  const def = ZOMBIE_TYPES[id], info = ZOMBIE_INFO[id];
  if (!def || !info) return null;
  const s = {
    id, name: info.name, sprite: info.sprite, desc: info.desc,
    hp: def.hp, speed: def.speed, dmg: def.dmg,
    // el tablero mide COLS casillas: cuánto tarda en cruzarlo de punta a punta
    crossTime: COLS / def.speed,
    lanes: def.lanes || 1,
    range: def.flying ? 'Flies over the garden — only a stretched Cactus reaches it'
      : 'Bites the first plant it touches in its lane',
    traits: [],
  };
  const t = s.traits;
  if (def.flying) t.push('Flying: walls, mines and Spikeweed cannot stop it');
  if (def.lanes === 2) t.push('Walks across two lanes at once, eating both');
  if (def.boss) t.push('Boss: enormous health pool — bring your heaviest hitters');
  if (id === 'book') t.push('Speeds up ×2 when it drops below 45% health');
  if (id === 'flag') t.push('Leads a wave: a bigger attack is right behind it');
  if (def.hp >= 210 && !def.boss && !def.flying) t.push('Armoured: it takes many shots to bring down');
  if (def.speed >= 0.30 && !def.flying) t.push('Fast: it reaches your plants sooner than the rest');
  return s;
}

// Orden global de desbloqueo de las 15 plantas: por prestigio (tier) y, dentro de
// cada tier, por coste. Así el jugador siempre empieza con lo más básico y barato.
const PLANT_UNLOCK_ORDER = Object.entries(PLANTS)
  .sort((a, b) => TIER_RANK[a[1].tier] - TIER_RANK[b[1].tier] || a[1].cost - b[1].cost)
  .map(([id]) => id);

// Nº de unidades por nivel CEFR (A1–B1: 16, B2–C1: 12). Se usa para dosificar el
// desbloqueo progresivo dentro de cada nivel.
const UNITS_PER_LEVEL = [16, 16, 16, 12, 12];

// Plantas concedidas a mano en niveles CEFR concretos, por encima de lo que diría su
// prestigio. La Cherry Bomb es platino (B2), pero en A1 y A2 se entrega desde la
// primera unidad: es la bomba de emergencia que hace jugables los primeros niveles
// cuando una oleada se cuela y el jugador todavía no tiene con qué pararla.
export const EXTRA_PLANTS_BY_LEVEL = {
  [TIER_RANK.basic]:  ['cherry'],   // A1
  [TIER_RANK.silver]: ['cherry'],   // A2
  // B1 ya la asoma por su cuenta desde la unidad 4; se concede también aquí para que
  // una planta que el jugador tenía en A2 no desaparezca al subir de nivel.
  [TIER_RANK.golden]: ['cherry'],   // B1
};

// Plantas disponibles para un nivel/etapa. Ahora ACUMULAN de forma progresiva:
//  · Todas las plantas de niveles CEFR anteriores quedan ya desbloqueadas (3 por nivel).
//  · Las 3 plantas del prestigio del nivel ACTUAL se revelan poco a poco a medida que
//    avanzan las unidades (1 → 2 → 3), en vez de darlas todas de golpe.
//  · Nunca se muestra una planta de un prestigio superior al del nivel CEFR en curso,
//    así que llegar a C1 NO entrega las 15 de una vez: las diamante van saliendo a lo
//    largo de las unidades de C1.
// La usa tanto el selector de plantas previo como el motor al iniciar la etapa.
export function availablePlants(levelIdx, stageIdx = 0) {
  const li = Math.max(0, Math.min(TIER_RANK.diamond, levelIdx | 0));
  const st = Math.max(0, stageIdx | 0);
  // Plantas ya desbloqueadas de niveles CEFR anteriores (acumuladas), las del nivel
  // actual y una vista previa del siguiente prestigio.
  const prev = PLANT_UNLOCK_ORDER.filter(id => TIER_RANK[PLANTS[id].tier] < li);
  const curr = PLANT_UNLOCK_ORDER.filter(id => TIER_RANK[PLANTS[id].tier] === li);
  const next = PLANT_UNLOCK_ORDER.filter(id => TIER_RANK[PLANTS[id].tier] === li + 1);
  // A1–B1 (li ≤ 2) reciben el prestigio de su nivel COMPLETO desde el principio: son
  // los niveles de aprendizaje y conviene tener mucho donde elegir. De B2 en adelante
  // se sigue revelando poco a poco (1 planta nueva cada ~2 unidades).
  const revealCurr = li <= TIER_RANK.golden ? curr.length : Math.min(curr.length, 1 + Math.floor(st / 2));
  let list = prev.concat(curr.slice(0, revealCurr));
  // Vista previa del siguiente prestigio: en A1–B1 hasta 3 cartas y desde la unidad 2,
  // para ampliar todavía más el arsenal en los niveles iniciales.
  const early = li <= TIER_RANK.golden;
  const from = early ? 1 : 3;
  if (li < TIER_RANK.diamond && st >= from) {
    const cap = early ? 3 : 2;
    const bonus = Math.min(next.length, cap, 1 + Math.floor((st - from) / 2));
    list = list.concat(next.slice(0, bonus));
  }
  // Regalos por nivel (p. ej. la Cherry Bomb en A1/A2), sin duplicar lo ya desbloqueado.
  for (const id of EXTRA_PLANTS_BY_LEVEL[li] || [])
    if (PLANTS[id] && !list.includes(id)) list.push(id);
  return list;
}

export class Game {
  constructor(canvas, quiz, hooks) {
    this.canvas = canvas;
    this.quiz = quiz;
    this.hooks = hooks; // { onSun, onWave, onEnd, onCards, onStreak, onAmmo }
    this.state = 'idle';
    this.mode = 'classic';
    this.speed = 1;
    this._initScene();
    this._buildTitle();
    this._bindInput();
    this.clock = new THREE.Clock();
    this.menuT = 0;
    this._animate = this._animate.bind(this);
    requestAnimationFrame(this._animate);
  }

  /* ============================ SCENE ============================ */
  _initScene() {
    // algunos equipos fallan con antialias: reintenta sin él
    try {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
    } catch {
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, powerPreference: 'low-power' });
    }
    this.renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.05;

    this.scene = new THREE.Scene();
    this.scene.background = makeSkyTexture();
    this.scene.fog = new THREE.Fog(0xcfe8d8, 22, 45);

    // cámara cercana pero con aire para que la interfaz no tape el tablero
    this.camera = new THREE.PerspectiveCamera(43, innerWidth / innerHeight, 0.1, 100);
    this._fitCamera();

    const hemi = new THREE.HemisphereLight(0xeaf6ff, 0x5a7a3a, 0.95);
    this.scene.add(hemi);
    this.hemi = hemi;
    const sun = new THREE.DirectionalLight(0xfff2d8, 2.0);
    sun.position.set(6, 12, 4);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -9; sun.shadow.camera.right = 9;
    sun.shadow.camera.top = 8; sun.shadow.camera.bottom = -8;
    this.scene.add(sun);
    this.sunLight = sun;

    // El suelo termina JUSTO en la línea de la cerca (z = -3.5): a partir de ahí
    // empieza el fondo pintado, sin franja de tierra entre medias.
    const ground = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 36.5),
      new THREE.MeshStandardMaterial({ map: makeDirtTexture(), roughness: 1 })
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.set(0, -0.02, GROUND_EDGE_Z + 36.5 / 2);
    ground.receiveShadow = true;
    this.scene.add(ground);
    this.groundMesh = ground;

    const board = new THREE.Mesh(
      new THREE.PlaneGeometry(COLS, ROWS),
      new THREE.MeshStandardMaterial({ map: makeBoardTexture(COLS, ROWS), roughness: 0.95 })
    );
    board.rotation.x = -Math.PI / 2;
    board.receiveShadow = true;
    this.scene.add(board);
    this.boardMesh = board;

    // cada pieza de piedra con su textura repetida según sus dimensiones (sin estiramientos)
    const stonePiece = (w, d, x, z, y = 0.01, h = 0.06) => {
      const mat = new THREE.MeshStandardMaterial({ map: makeStoneTexture([w / 1.15, d / 1.15]), roughness: 0.9 });
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(x, y, z);
      b.receiveShadow = true;
      this.scene.add(b);
    };
    stonePiece(2.4, ROWS + 2.2, COLS / 2 + 1.1, 0);            // camino de los zombies
    stonePiece(COLS + 1.6, 0.8, 0, -(ROWS / 2) - 0.4, 0.005, 0.055); // marco norte
    stonePiece(COLS + 1.6, 0.8, 0, ROWS / 2 + 0.4, 0.005, 0.055);    // marco sur
    stonePiece(0.8, ROWS + 2.2, -(COLS / 2) - 0.4, 0, 0.005, 0.055); // marco oeste

    // ===== Escenografía =====
    // Telón del escenario: el fondo pintado va sobre un plano vertical situado
    // detrás de la cerca, de modo que el arte "sube" desde la línea de la cerca.
    // Su tamaño se recalcula con la cámara (_fitBackdrop) para que siempre cubra
    // desde el borde del suelo hasta el borde superior de la pantalla.
    const wall = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ fog: false, toneMapped: false })
    );
    wall.position.set(0, 0, BACKDROP_Z);
    wall.renderOrder = -10;
    wall.visible = false; // se muestra cuando llega la textura del escenario
    this.scene.add(wall);
    this.bgWall = wall;

    const prop = (name, h, x, z, opts = {}) => {
      const b = makeBillboard(name, h, opts);
      b.position.set(x, 0, z);
      this._face(b);
      this.scene.add(b);
      return b;
    };
    // Cerca de madera a lo largo del fondo: es lo único que separa el jardín del
    // fondo pintado. El resto de adornos (gnomo, cartel, macetas, globos, banco,
    // cajas, barril, buzón, farolas, hidrante y la maleza suelta) se retiraron
    // para dejar el jardín limpio.
    // se extiende a lo ancho de todo el encuadre para que no asome el borde del suelo
    for (let i = 0; i < 22; i++) prop('prop_fence', 0.85, -12.2 + i * 1.22, -(ROWS / 2) - 0.85);

    this.clouds = [];
    const cloudMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, transparent: true, opacity: 0.92 });
    for (let i = 0; i < 5; i++) {
      const cl = new THREE.Group();
      for (let j = 0; j < 3; j++) {
        const b = new THREE.Mesh(new THREE.SphereGeometry(0.6 + Math.random() * 0.5, 10, 8), cloudMat);
        b.position.set(j * 0.8 - 0.8, Math.random() * 0.2, Math.random() * 0.4);
        b.scale.y = 0.55;
        cl.add(b);
      }
      cl.position.set(-14 + i * 7 + Math.random() * 3, 7.5 + Math.random() * 2.5, -9 - Math.random() * 5);
      this.scene.add(cl);
      this.clouds.push(cl);
    }

    // resaltado de casilla
    const hl = new THREE.Mesh(
      new THREE.PlaneGeometry(0.96, 0.96),
      new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.35 })
    );
    hl.rotation.x = -Math.PI / 2;
    hl.position.y = 0.02;
    hl.visible = false;
    this.scene.add(hl);
    this.highlight = hl;

    // resaltado de fila (bolos)
    const rh = new THREE.Mesh(
      new THREE.PlaneGeometry(COLS, 0.96),
      new THREE.MeshBasicMaterial({ color: 0xfff2a0, transparent: true, opacity: 0.22 })
    );
    rh.rotation.x = -Math.PI / 2;
    rh.position.y = 0.02;
    rh.visible = false;
    this.scene.add(rh);
    this.rowHighlight = rh;

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();
    addEventListener('resize', () => {
      this._fitCamera();
      this.renderer.setSize(innerWidth, innerHeight);
    });
    this.renderer.setSize(innerWidth, innerHeight);

    // contenedor de la escenografía 3D (casa/castillo + kit de naturaleza), que se
    // reconstruye al cambiar de escenario
    this.decor3D = new THREE.Group();
    this.scene.add(this.decor3D);

    // aplica el escenario guardado (fondo/luces/tablero)
    this.setTheme(localStorage.getItem('ed:theme') || 'day');
  }

  // Encuadra el tablero según la proporción de pantalla: en móviles verticales
  // se aleja y sube para que las 5 filas queden visibles sobre la bandeja de cartas.
  _fitCamera() {
    const a = innerWidth / Math.max(innerHeight, 1);
    if (a < 0.7)       { this.camera.position.set(0.4, 9.6, 13.6); this.camera.fov = 55; }
    else if (a < 1.0)  { this.camera.position.set(0.5, 8.4, 11.8); this.camera.fov = 50; }
    else if (a < 1.35) { this.camera.position.set(0.55, 7.3, 10.4); this.camera.fov = 46; }
    else               { this.camera.position.set(0.55, 6.6, 9.3);  this.camera.fov = 43; }
    this.camera.aspect = a;
    this.camera.lookAt(0.4, 0.25, -0.55);
    this.camera.updateProjectionMatrix();
    this._fitBackdrop();
  }

  // Cambia el escenario: recolorea cielo, tablero, suelo, niebla y luces.
  setTheme(id) {
    const t = THEMES[id] ? id : 'day';
    this.themeId = t;
    const th = THEMES[t];
    localStorage.setItem('ed:theme', t);

    // el degradado del cielo queda de base; encima va el arte pintado del escenario
    this.scene.background = makeGradientSky(th.sky);
    this._loadThemeBackground(t);
    if (this.scene.fog) this.scene.fog.color.set(th.fog);

    // el tema day respeta la textura del usuario (board.png/dirt.png); el resto es procedural
    const allowOverride = t === 'day';
    if (this.boardMesh) {
      this.boardMesh.material.map?.dispose?.();
      this.boardMesh.material.map = makeBoardTexture(COLS, ROWS, th.board, allowOverride);
      this.boardMesh.material.needsUpdate = true;
    }
    if (this.groundMesh) {
      this.groundMesh.material.map?.dispose?.();
      this.groundMesh.material.map = makeDirtTexture(th.dirt, allowOverride);
      this.groundMesh.material.needsUpdate = true;
    }
    if (this.hemi) { this.hemi.color.set(th.hemiSky); this.hemi.groundColor.set(th.hemiGround); this.hemi.intensity = th.hemiI; }
    if (this.sunLight) { this.sunLight.color.set(th.sun); this.sunLight.intensity = th.sunI; }
    // escenografía 3D acorde al escenario (casa/castillo + árboles y naturaleza)
    this._buildDecor3D(t);
  }

  // Coloca los modelos 3D (GLB) del escenario: casa en Suburban, castillo en
  // Jungle Temple y Ancient Ruins, y el kit de naturaleza (árboles, arbustos,
  // rocas y flores) alrededor del tablero, con variantes según el tema.
  _buildDecor3D(id) {
    if (!this.decor3D) return;
    // limpia la escenografía anterior liberando geometrías/materiales
    for (const c of [...this.decor3D.children]) {
      c.traverse((o) => { o.geometry?.dispose?.(); if (o.material) (Array.isArray(o.material) ? o.material : [o.material]).forEach(m => m.dispose?.()); });
      this.decor3D.remove(c);
    }
    if (!modelsReady()) return;

    // --- Edificio principal a la izquierda (la "casa" que defiende el jugador) ---
    // La casa suburbana sale también en Beach y Snow, repintada para el escenario:
    // blanca y fría en la nieve, tropical y cálida en la playa (el modelo trae un
    // único material, así que el tono se aplica multiplicando su color base).
    const buildKind = (id === 'jungle' || id === 'ruins') ? 'castle'
      : (id === 'day' || id === 'night' || id === 'beach' || id === 'snow') ? 'house' : null;
    if (buildKind) {
      // El castillo tiene una huella MUCHO más grande que la casa: a igual altura se
      // extiende ~8 u de fondo e invadía el tablero. Lo escalamos más bajo y lo
      // empujamos al noroeste para que su borde frontal quede DETRÁS de la cerca norte
      // (z ≈ -2.5) y su lado este no tape la columna de cortacéspedes (x ≈ -5.2).
      const isCastle = buildKind === 'castle';
      const b = makeBuilding(buildKind, isCastle ? 2.6 : 3.0, HOUSE_TINT[id]);
      if (b) {
        // Justo al oeste de la columna de "libros" cortacésped (x ≈ -5.2) y centrado
        // sobre ellos (z ≈ 0): pegado al costado del jardín, como indicó el usuario.
        b.position.set(isCastle ? -8.0 : -7.5, 0, -0.3);
        b.rotation.y = Math.PI / 2; // mira al este, hacia los zombies
        this.decor3D.add(b);
      }
    }

    // Los árboles y la maleza 3D (arbustos, rocas y flores) se retiraron: el
    // fondo pintado ya trae su propia vegetación y el jardín se ve más limpio.
  }

  // Carga el fondo pintado del escenario y lo aplica al telón (cacheado).
  _loadThemeBackground(id) {
    this._bgCache = this._bgCache || {};
    const apply = (tex) => {
      if (this.themeId !== id || !this.bgWall) return;
      this.bgWall.material.map = tex;
      this.bgWall.material.needsUpdate = true;
      this.bgWall.visible = true;
      this._fitBackdrop();
    };
    if (this._bgCache[id]) return apply(this._bgCache[id]);
    // Se prueban por orden: WebP grande (4K) → WebP ligero → JPG de respaldo.
    // Si el navegador no entiende WebP, la carga falla y se pasa al siguiente.
    const files = this._bgSources(id);
    const loader = new THREE.TextureLoader();
    const tryNext = (i) => {
      if (i >= files.length) { if (this.themeId === id && this.bgWall) this.bgWall.visible = false; return; }
      loader.load(`assets/backgrounds/${files[i]}`, (tex) => {
        tex.colorSpace = THREE.SRGBColorSpace;
        tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
        // el telón se ve en oblicuo: el filtrado anisotrópico le quita el emborronado
        tex.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
        this._bgCache[id] = tex;
        apply(tex);
      }, undefined, () => tryNext(i + 1));
    };
    tryNext(0);
  }

  // Qué versión del fondo pedir. El telón ocupa el ancho de la pantalla, así que la
  // referencia es el ancho REAL del lienzo (píxeles de dibujo, con el mismo tope de
  // devicePixelRatio que usa el renderer). Se pide la de 4K sólo cuando la ligera
  // (1600 px) tendría que estirarse; en móvil se ahorra ancho de banda.
  _bgSources(id) {
    const bufferW = innerWidth * Math.min(devicePixelRatio || 1, 2);
    return bufferW >= 1600
      ? [`${id}.webp`, `${id}.sd.webp`, `${id}.jpg`]
      : [`${id}.sd.webp`, `${id}.jpg`];
  }

  // Ajusta el telón para que cubra exactamente desde la línea de la cerca hasta
  // el borde superior de la pantalla, sea cual sea el tamaño/relación del
  // dispositivo. La textura se encaja en modo "cover": llena el hueco sin
  // deformarse, recortando lo que sobra (como background-size:cover en CSS).
  _fitBackdrop() {
    const wall = this.bgWall;
    if (!wall || !wall.material.map) return;
    const cam = this.camera;
    const cz = cam.position.z, cy = cam.position.y;

    // Borde inferior: la visual que roza el borde del suelo (la cerca), llevada
    // hasta el plano del telón.
    const tB = (BACKDROP_Z - cz) / (GROUND_EDGE_Z - cz);
    const yBottom = cy + tB * (0 - cy);

    // Esquinas del frustum proyectadas sobre un plano z dado.
    const cornerAt = (ndcX, ndcY, z) => {
      const v = new THREE.Vector3(ndcX, ndcY, 0.5).unproject(cam).sub(cam.position);
      return cam.position.clone().addScaledVector(v, (z - cz) / v.z);
    };
    const tl = cornerAt(-1, 1, BACKDROP_Z), tr = cornerAt(1, 1, BACKDROP_Z);
    const yTop = Math.max(tl.y, tr.y);
    // Las visuales rasantes que pasan por el borde del suelo se abren más que las
    // esquinas altas: hay que medirlas también o el telón se queda corto a los lados.
    const bl = cornerAt(-1, -1, GROUND_EDGE_Z), br = cornerAt(1, -1, GROUND_EDGE_Z);
    const spread = (x) => cam.position.x + tB * (x - cam.position.x);
    const halfW = Math.max(
      Math.abs(tl.x), Math.abs(tr.x),
      Math.abs(spread(bl.x)), Math.abs(spread(br.x)),
    );

    // margen extra: por abajo queda tapado por el suelo, así que nunca se ve el borde
    const w = halfW * 2 * 1.08;
    const h = Math.max(yTop - yBottom, 0.5) + 1.2;
    const cyWall = (yTop + yBottom) / 2 - 0.35;
    wall.scale.set(w, h, 1);
    wall.position.set(0, cyWall, BACKDROP_Z);

    // encaje "cover" de la imagen dentro del rectángulo visible
    const img = wall.material.map.image;
    if (img && img.width) {
      const rect = w / h, art = img.width / img.height;
      const tex = wall.material.map;
      if (art > rect) {            // arte más panorámico: se recorta a los lados
        tex.repeat.set(rect / art, 1);
        tex.offset.set((1 - rect / art) / 2, 0);
      } else {
        // Arte más alto que el hueco: se recorta en vertical. Las panorámicas
        // nuevas se anclan abajo, para que su suelo empalme con la cerca; el arte
        // antiguo (4:3) se pensó para verse por arriba, así que se sube el encuadre.
        const legacy = art < 2.5;
        tex.repeat.set(1, art / rect);
        tex.offset.set(0, legacy ? (1 - art / rect) * 0.72 : 0);
      }
      tex.needsUpdate = true;
    }
  }

  /* ============================ 3D TITLE ============================ */
  _buildTitle() {
    const t = new THREE.Group();
    // Logo con extrusión 3D: capas apiladas en profundidad, más oscuras hacia atrás
    const logo = new THREE.Group();
    const LAYERS = 9;
    for (let i = LAYERS - 1; i >= 0; i--) {
      const layer = makeBillboard('logo', 2.3, { shadow: false });
      const p = layer.userData.plane;
      p.position.z = -i * 0.035;
      p.position.y = 1.15 - i * 0.008;
      const shade = 1 - (i / LAYERS) * 0.72;
      layer.userData.mat.color.setScalar(shade);
      layer.position.y = 0;
      logo.add(p);
    }
    logo.position.y = 1.45;
    logo.scale.setScalar(0.88);
    t.add(logo);
    this.titleLogo = logo;
    this.titleLogo.userData.plane = logo.children[logo.children.length - 1];

    const glow1 = makeGlowSprite(0xffd870, 6.5);
    glow1.position.set(0, 2.8, -0.4);
    const glow2 = makeGlowSprite(0x9adc60, 8.5);
    glow2.position.set(0, 2.8, -0.6);
    glow2.material.opacity = 0.55;
    t.add(glow2, glow1);
    this.titleGlows = [glow1, glow2];

    // anillos de chispas doradas
    this.sparkles = [];
    for (const [n, color, r0] of [[42, 0xffe080, 3.2], [30, 0xfff8d0, 2.4]]) {
      const geo = new THREE.BufferGeometry();
      const pos = new Float32Array(n * 3);
      const meta = [];
      for (let i = 0; i < n; i++) {
        meta.push({ a: Math.random() * Math.PI * 2, r: r0 + Math.random() * 0.8, y: 1.6 + Math.random() * 2.4, sp: 0.15 + Math.random() * 0.3, tw: Math.random() * 6 });
        pos.set([0, 0, 0], i * 3);
      }
      geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
      const mat = new THREE.PointsMaterial({ color, size: 0.09, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false });
      const points = new THREE.Points(geo, mat);
      t.add(points);
      this.sparkles.push({ points, meta });
    }
    t.position.set(0.4, 0.55, 1.2);
    this.titleGroup = t;
    this.scene.add(t);
  }

  setTitleVisible(v) { this.titleGroup.visible = v; }

  _updateTitle(dt) {
    this.menuT += dt;
    const t = this.menuT;
    this.titleLogo.position.y = 1.45 + Math.sin(t * 1.2) * 0.12;
    this.titleLogo.rotation.z = Math.sin(t * 0.8) * 0.03;
    // giro suave para lucir la profundidad de la extrusión
    this.titleLogo.rotation.y = Math.sin(t * 0.5) * 0.22;
    this.titleGlows[0].material.opacity = 0.5 + Math.sin(t * 2.1) * 0.25;
    this.titleGlows[1].material.opacity = 0.3 + Math.sin(t * 1.4 + 2) * 0.18;
    for (const s of this.sparkles) {
      const pos = s.points.geometry.attributes.position;
      for (let i = 0; i < s.meta.length; i++) {
        const m = s.meta[i];
        m.a += dt * m.sp;
        pos.array[i * 3] = Math.cos(m.a) * m.r;
        pos.array[i * 3 + 1] = m.y + Math.sin(t * 1.5 + m.tw) * 0.15;
        pos.array[i * 3 + 2] = Math.sin(m.a) * m.r * 0.35;
      }
      pos.needsUpdate = true;
      s.points.material.opacity = 0.55 + Math.sin(t * 3 + s.meta[0].tw) * 0.35;
    }
  }

  // orienta un billboard hacia la cámara (sólo giro Y)
  _face(g) {
    g.rotation.y = Math.atan2(this.camera.position.x - g.position.x, this.camera.position.z - g.position.z) * 0.35;
  }

  /* ============================ STAGE ============================ */
  startStage(cfg) {
    // cfg: { level, levelIdx, unit, stageIdx, mode: 'classic'|'vase'|'bowling' }
    this.cfg = cfg;
    this.mode = cfg.mode || 'classic';
    // Dificultad elegida antes de la batalla: gobierna vida, velocidad, cantidad,
    // ritmo, variedad de zombies, sol inicial/caída y los cortacéspedes.
    this.diffId = DIFFICULTIES[cfg.difficulty] ? cfg.difficulty : DEFAULT_DIFFICULTY;
    this.diff = DIFFICULTIES[this.diffId];
    this._clearEntities();
    this.setTitleVisible(false);
    this.sunAmount = this.mode === 'classic' ? this.diff.sun : 0;
    this.grid = Array.from({ length: ROWS }, () => Array(COLS).fill(null));
    this.plants = []; this.zombies = []; this.projectiles = []; this.suns = [];
    this.particles = []; this.flashes = []; this.mowers = []; this.vases = [];
    this.selectedCard = null; this.shovelMode = false;
    this.time = 0;
    this.killed = 0;
    this.speed = 1;
    this.midWaveDone = false; this.finalWaveDone = false;
    this._evoTipShown = false;
    this.ammo = 0;

    // Libros voladores (última defensa). En Extreme no hay red de seguridad.
    if (this.diff.mowers) {
      for (let r = 0; r < ROWS; r++) {
        const m = makeBillboard('icon_book', 0.55);
        m.position.set(-(COLS / 2) - 0.7, 0.05, rowZ(r));
        this._face(m);
        this.scene.add(m);
        this.mowers.push({ mesh: m, row: r, active: false, used: false });
      }
    }

    // La dificultad adelanta (o retrasa) la aparición de los zombies más duros.
    const D = Math.max(0, cfg.levelIdx * 2.2 + cfg.stageIdx * 0.55 + this.diff.poolBias);
    this.difficulty = D;
    // Los globos sólo salen si el jugador LLEVA el Cactus en su baraja (es su único
    // contraataque). Se confirma más abajo, al fijar las cartas elegidas.
    this.antiAirReady = false;
    this.zombiePool = this._buildZombiePool(D);

    // Zombies más duros en las últimas unidades: desde la unidad 8 en A1–B1 y desde
    // la unidad 6 en B2–C1. La vida sube de forma progresiva con cada unidad extra.
    const toughFrom = cfg.levelIdx >= 3 ? 6 : 8;
    const unit = cfg.unit || (cfg.stageIdx + 1);
    this.unitNum = unit;
    this.zHpMul = unit >= toughFrom ? Math.min(2.2, 1.3 + (unit - toughFrom) * 0.10) : 1;
    // Compensación por permitir más plantas desde la unidad 4: a partir de esa unidad
    // los zombies se endurecen en las OLEADAS CENTRALES (pico en la oleada del medio).
    this.midWaveTough = unit >= 4;
    // En las unidades avanzadas el final se pone serio: las ÚLTIMAS oleadas traen
    // zombies con más vida y algo más numerosas (el arsenal también es mayor).
    this.lateWaveTough = unit >= toughFrom ? Math.min(1.0, 0.45 + (unit - toughFrom) * 0.07) : 0;

    if (this.mode === 'classic') {
      this.endless = !!cfg.endless;
      // Sistema de oleadas progresivas: la partida se compone de varias oleadas
      // con descanso entre ellas y dificultad creciente, para durar más.
      // Menos oleadas (máx. 6) pero más largas: la partida dura por cantidad de
      // zombies, no por número de oleadas.
      // el jugador elige cuántas oleadas quiere jugar (1–10); por defecto, 5
      const wanted = Math.min(10, Math.max(1, cfg.waves | 0 || 5));
      this.totalWaves = this.endless ? Infinity : wanted;
      this.waveNum = 0;
      this.waveState = 'intro';   // intro → spawning → clearing → rest → spawning…
      this.waveTimer = 8;         // más tiempo para preparar defensas antes de la 1ª oleada
      this.waveSpawned = 0;
      this.waveTotal = 0;
      this.spawnTimer = 0;
      this.baseInterval = Math.max(8.5 - D * 0.32, 3.2) * this.diff.interval;
      this.sunFallTimer = 5 * this.diff.sunRate;
      // catálogo por prestigio: el nivel CEFR fija el tier máximo; en las últimas
      // etapas del nivel se anticipa una carta del siguiente prestigio
      const list = availablePlants(cfg.levelIdx, cfg.stageIdx);
      // Si el jugador eligió sus plantas en el selector, respetamos su selección
      // (filtrada a las disponibles); si no, revelamos un set por defecto.
      let chosen = Array.isArray(cfg.loadout) ? cfg.loadout.filter(id => list.includes(id)) : null;
      if (!chosen || !chosen.length) chosen = list.slice(0, Math.min(3 + cfg.stageIdx, list.length));
      this.cards = chosen.map(id => ({ id, cd: 0 }));
      // Ahora que sabemos la baraja: si no llevas Cactus, no aparecerán globos.
      this.antiAirReady = chosen.includes('cactus');
      this.zombiePool = this._buildZombiePool(D);
      this.hooks.onWave(0, 1, 'Get ready! The zombies are coming…');
    } else if (this.mode === 'vase') {
      this.cards = [];
      this.totalZombies = 0; this.spawned = 0;
      const cells = [];
      for (let r = 0; r < ROWS; r++) for (let c = 3; c < COLS; c++) cells.push([r, c]);
      for (let i = cells.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [cells[i], cells[j]] = [cells[j], cells[i]]; }
      const nVases = 16;
      for (const [r, c] of cells.slice(0, nVases)) {
        const mesh = makeVase();
        mesh.position.set(colX(c), 0, rowZ(r));
        mesh.rotation.y = Math.random() * 6;
        this.scene.add(mesh);
        this.vases.push({ mesh, r, c });
      }
      this.hooks.onWave(0, nVases, '🏺 Break the vases… if you dare!');
    } else if (this.mode === 'bowling') {
      this.cards = [];
      this.ammo = 4;
      this.totalZombies = Math.min(18 + cfg.levelIdx * 5, 40);
      this.spawned = 0;
      this.spawnTimer = 4;
      this.baseInterval = Math.max(6.0 - D * 0.28, 2.6);
      this.hooks.onAmmo(this.ammo);
      this.hooks.onWave(0, this.totalZombies, '🥔 Roll spuds to crush the zombies!');
    }

    // El motor arranca ANTES de avisar al HUD: si un aviso de interfaz fallara, la
    // partida ya está en marcha y no se queda congelada (sin poder plantar ni empezar).
    this.state = 'playing';
    this.clock.getDelta();
    this.hooks.onCards(this.cards);
    this.hooks.onSun(this.sunAmount);
  }

  _buildZombiePool(D) {
    const pool = [{ t: 'basic', w: 10 }];
    if (D >= 0.5) pool.push({ t: 'cone', w: 4 + D });
    if (D >= 1.5) pool.push({ t: 'book', w: 3 + D * 0.8 });
    if (D >= 2.5) pool.push({ t: 'bucket', w: 2 + D * 0.7 });
    // El globo sólo aparece cuando el jugador ya dispone del Cactus, que es su
    // único contraataque; si no, sería imposible de bajar.
    if (D >= 3.5 && this.antiAirReady) pool.push({ t: 'balloon', w: 1.5 + D * 0.4 });
    if (D >= 4) pool.push({ t: 'football', w: 1 + D * 0.5 });
    if (D >= 6) pool.push({ t: 'prof', w: 0.5 + D * 0.3 });
    if (D >= 7) pool.push({ t: 'boss', w: 0.4 + D * 0.12 }); // jefe de dos carriles
    return pool;
  }

  _pickZombieType() {
    const total = this.zombiePool.reduce((s, z) => s + z.w, 0);
    let r = Math.random() * total;
    for (const z of this.zombiePool) { r -= z.w; if (r <= 0) return z.t; }
    return 'basic';
  }

  _clearEntities() {
    if (!this.plants) return;
    for (const arr of [this.plants, this.zombies, this.projectiles, this.suns, this.vases])
      for (const e of arr) this.scene.remove(e.mesh);
    for (const p of this.particles) this.scene.remove(p.points);
    for (const f of this.flashes) this.scene.remove(f.mesh);
    for (const m of this.mowers) this.scene.remove(m.mesh);
  }

  quitToMenu() {
    this.state = 'idle';
    this._clearEntities();
    this.plants = []; this.zombies = []; this.projectiles = []; this.suns = [];
    this.particles = []; this.flashes = []; this.mowers = []; this.vases = [];
    this.setTitleVisible(true);
  }

  /* ============================ INPUT ============================ */
  _bindInput() {
    this.canvas.addEventListener('pointermove', (e) => this._onMove(e));
    this.canvas.addEventListener('pointerdown', (e) => this._onClick(e));
  }

  _ray(e) {
    this.pointer.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
    this.raycaster.setFromCamera(this.pointer, this.camera);
  }

  _cellAt(e) {
    this._ray(e);
    const hit = this.raycaster.intersectObject(this.boardMesh)[0];
    if (!hit) return null;
    const c = Math.round(hit.point.x + (COLS - 1) / 2);
    const r = Math.round(hit.point.z + (ROWS - 1) / 2);
    if (c < 0 || c >= COLS || r < 0 || r >= ROWS) return null;
    return { r, c };
  }

  _onMove(e) {
    if (this.state !== 'playing') { this.highlight.visible = false; this.rowHighlight.visible = false; return; }
    if (this.mode === 'bowling') {
      const cell = this._cellAt(e);
      this.rowHighlight.visible = !!cell && this.ammo > 0;
      if (cell) this.rowHighlight.position.set(0, 0.02, rowZ(cell.r));
      return;
    }
    if (this.mode === 'vase') {
      this.highlight.visible = false;
      return;
    }
    if (!this.selectedCard && !this.shovelMode) { this.highlight.visible = false; return; }
    const cell = this._cellAt(e);
    if (cell) {
      this.highlight.visible = true;
      this.highlight.position.set(colX(cell.c), 0.02, rowZ(cell.r));
      const occupied = !!this.grid[cell.r][cell.c];
      this.highlight.material.color.set(
        this.shovelMode ? (occupied ? 0xff8866 : 0x888888) : (occupied ? 0xff8866 : 0xfff2a0)
      );
    } else this.highlight.visible = false;
  }

  async _onClick(e) {
    if (this.state !== 'playing') return;
    this._ray(e);

    // soles primero (todos los modos)
    const sunMeshes = this.suns.filter(s => !s.collected).map(s => s.mesh);
    const hitSun = this.raycaster.intersectObjects(sunMeshes, true)[0];
    if (hitSun) {
      let obj = hitSun.object;
      while (obj.parent && !this.suns.some(s => s.mesh === obj)) obj = obj.parent;
      const sun = this.suns.find(s => s.mesh === obj);
      if (sun) { this._collectSun(sun); return; }
    }

    if (this.mode === 'vase') return this._clickVase(e);
    if (this.mode === 'bowling') return this._clickBowl(e);

    // ----- modo clásico -----
    if (this.shovelMode) {
      const cell = this._cellAt(e);
      if (cell && this.grid[cell.r][cell.c]) {
        this._removePlant(this.grid[cell.r][cell.c]);
        SFX.shovel();
      }
      this.setShovel(false);
      return;
    }
    // Sin carta seleccionada, tocar el tablero NO hace nada: mejorar plantas se hace
    // desde el pop-up "Improve" (así no se evoluciona sin querer al recoger un sol).
    if (!this.selectedCard) return;
    const cell = this._cellAt(e);
    if (!cell || this.grid[cell.r][cell.c]) return;
    const card = this.cards.find(c => c.id === this.selectedCard);
    const def = PLANTS[card.id];
    if (card.cd > 0 || this.sunAmount < def.cost) return;

    // Las plantas de sol (Sunflower / Twin Sunflower) se plantan SIN pregunta: son
    // el motor económico de la partida y bloquearlas frena el resto del juego.
    // Todas las demás siguen exigiendo una respuesta correcta.
    if (def.sun) {
      this.sunAmount -= def.cost;
      card.cd = def.cooldown;
      this._placePlant(card.id, cell.r, cell.c);
      this.hooks.onSun(this.sunAmount);
      this.selectCard(null);
      this.hooks.onCards(this.cards);
      return;
    }

    const res = await this._askQuestion();
    if (res.correct) {
      this.sunAmount -= def.cost;
      card.cd = def.cooldown;
      if (def.bomb) this._detonate(cell.r, cell.c, def);
      else this._placePlant(card.id, cell.r, cell.c);
      this.hooks.onSun(this.sunAmount);
      this._streakCheck();
    } else {
      // Respuesta incorrecta: se pierden los soles del coste y NO se planta (más difícil).
      this.sunAmount = Math.max(0, this.sunAmount - def.cost);
      this.hooks.onSun(this.sunAmount);
      this.hooks.onStreak(`✘ Wrong — you lost ☀️${def.cost} and the plant!`);
      card.cd = 2.5;
    }
    this.selectCard(null);
    this.hooks.onCards(this.cards);
  }

  async _askQuestion() {
    // Recuerda el estado previo: normalmente 'playing', pero 'improve' cuando la
    // pregunta viene del pop-up de mejora (así no se reanuda la partida por debajo).
    const prev = this.state === 'improve' ? 'improve' : 'playing';
    this.state = 'quiz';
    this.highlight.visible = false;
    this.rowHighlight.visible = false;
    const res = await this.quiz.ask();
    this.state = prev;
    this.clock.getDelta();
    return res;
  }

  _streakCheck() {
    const st = this.quiz.stats.streak;
    if (st > 0 && st % 3 === 0) {
      if (this.mode === 'classic') {
        this.sunAmount += 50;
        this.hooks.onSun(this.sunAmount);
        this.hooks.onStreak(`🔥 Streak x${st}! +50 ☀️`);
      } else if (this.mode === 'bowling') {
        this.ammo += 1;
        this.hooks.onAmmo(this.ammo);
        this.hooks.onStreak(`🔥 Streak x${st}! +1 🥔`);
      } else {
        this.hooks.onStreak(`🔥 Streak x${st}! Amazing!`);
      }
      SFX.streak();
    }
  }

  /* ---------- vase breaker ---------- */
  async _clickVase(e) {
    const hit = this.raycaster.intersectObjects(this.vases.map(v => v.mesh), true)[0];
    if (!hit) return;
    let obj = hit.object;
    while (obj.parent && !this.vases.some(v => v.mesh === obj)) obj = obj.parent;
    const vase = this.vases.find(v => v.mesh === obj);
    if (!vase) return;

    const res = await this._askQuestion();
    // el jarrón se rompe siempre; el contenido depende de la respuesta
    this.vases = this.vases.filter(v => v !== vase);
    this.scene.remove(vase.mesh);
    SFX.shovel();
    this._burst(new THREE.Vector3(colX(vase.c), 0.5, rowZ(vase.r)), 0xb06a3a, 20);

    if (!res.correct) {
      this._spawnZombie(this._pickZombieType(), vase.r, colX(vase.c));
      this.hooks.onStreak('🧟 A zombie was hiding inside!');
    } else {
      this._streakCheck();
      const roll = Math.random();
      if (roll < 0.2) {
        this._spawnZombie(this._pickZombieType(), vase.r, colX(vase.c));
        this.hooks.onStreak('🧟 Oh no… zombie anyway!');
      } else if (roll < 0.35) {
        // cofre: un libro barre esa fila
        this.hooks.onStreak('📖 Treasure! A book sweeps the lane!');
        SFX.mower();
        this._flash(new THREE.Vector3(colX(vase.c), 0.6, rowZ(vase.r)), 'part_gold', 1.6);
        this._launchBook(vase.r);
      } else {
        const pool = ['shooter', 'shooter', 'icepea', 'nut', 'cactus', 'cabbage'];
        const type = pool[Math.floor(Math.random() * pool.length)];
        this._placePlant(type, vase.r, vase.c);
        this.hooks.onStreak(`🌱 Free ${PLANTS[type].name}!`);
      }
    }
    this.hooks.onWave(16 - this.vases.length, 16, `🏺 ${this.vases.length} vases left`);
  }

  _launchBook(row) {
    const m = makeBillboard('icon_book', 0.55);
    m.position.set(-(COLS / 2) - 0.4, 0.05, rowZ(row));
    this.scene.add(m);
    this.mowers.push({ mesh: m, row, active: true, used: true, extra: true });
  }

  /* ---------- bowling ---------- */
  _clickBowl(e) {
    const cell = this._cellAt(e);
    if (!cell || this.ammo <= 0) return;
    this.ammo--;
    this.hooks.onAmmo(this.ammo);
    SFX.shoot();
    const mesh = makeBillboard('plant_tallnut', 0.5);
    mesh.position.set(-(COLS / 2) - 0.3, 0, rowZ(cell.r));
    this._face(mesh);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, kind: 'potato', row: cell.r, vx: 5, dmg: 240, targetZ: rowZ(cell.r) });
  }

  async askForAmmo() {
    if (this.state !== 'playing' || this.mode !== 'bowling') return false;
    const res = await this._askQuestion();
    if (res.correct) {
      this.ammo += 2;
      this.hooks.onAmmo(this.ammo);
      this._streakCheck();
      return true;
    }
    return false;
  }

  selectCard(id) {
    this.selectedCard = id;
    this.shovelMode = false;
    this.canvas.classList.toggle('planting', !!id);
    this.canvas.classList.remove('shoveling');
  }

  setShovel(on) {
    this.shovelMode = on;
    this.selectedCard = null;
    this.canvas.classList.toggle('shoveling', on);
    this.canvas.classList.remove('planting');
    if (!on) this.highlight.visible = false;
  }

  // Pop-up "Improve": pausa la partida mientras se eligen plantas a mejorar.
  openImprove() {
    if (this.state !== 'playing') return false;
    this.state = 'improve';
    this.selectedCard = null; this.shovelMode = false;
    this.highlight.visible = false;
    this.canvas.classList.remove('planting', 'shoveling');
    return true;
  }
  closeImprove() {
    if (this.state === 'improve') { this.state = 'playing'; this.clock.getDelta(); }
  }
  // Lista de plantas plantadas (modo clásico) para el pop-up de mejora.
  plantsForImprove() {
    if (this.mode !== 'classic') return [];
    return this.plants.map((p, index) => ({
      index, name: p.def.name, sprite: p.def.sprite, level: p.level,
      cost: this.evolveCost(p), maxed: p.level >= 3,
      r: p.r, c: p.c, // posición en el tablero, para elegirla desde la cuadrícula
    }));
  }
  // Pop-up de la pala: se elige la planta a quitar sobre el tablero, igual que en
  // "Improve" (así no hace falta apuntar en el 3D).
  openShovel() {
    if (this.state !== 'playing') return false;
    this.state = 'improve';        // mismo estado de pausa que el pop-up de mejora
    this.selectedCard = null; this.shovelMode = false;
    this.highlight.visible = false;
    this.canvas.classList.remove('planting', 'shoveling');
    return true;
  }
  closeShovel() { this.closeImprove(); }
  // Quita la planta indicada por índice. Devuelve su nombre (o null).
  shovelPlant(index) {
    const plant = this.plants[index];
    if (!plant) return null;
    const name = plant.def.name;
    this._removePlant(plant);
    return name;
  }
  // Mejora la planta indicada por índice (desde el pop-up). Devuelve la lista actualizada.
  async improvePlant(index) {
    const plant = this.plants[index];
    if (plant) await this._tryEvolve(plant);
    return this.plantsForImprove();
  }

  /* ============================ PLANTS ============================ */
  _placePlant(type, r, c) {
    if (this.grid[r][c]) return;
    const def = PLANTS[type];
    const mesh = makeBillboard(def.sprite, def.h, { flip: def.flip });
    mesh.position.set(colX(c), 0, rowZ(r));
    this._face(mesh);
    mesh.scale.setScalar(0.01);
    this.scene.add(mesh);
    const plant = {
      type, def, mesh, r, c, hp: def.hp, maxHp: def.hp,
      fireTimer: 1 + Math.random() * 0.5, sunTimer: 7 + Math.random() * 3,
      spawnAnim: 0, phase: Math.random() * 6, recoil: 0, act: 0,
      // prestigio por planta: LVL1 (basic) → LVL2 (evolved) → LVL3 (max)
      level: 1, dmgMul: 1, rateMul: 1, multi: def.multi || 1, slowDur: 3, sunMul: 1,
    };
    this.grid[r][c] = plant;
    this.plants.push(plant);
    // insignia de nivel flotante (sólo en modo clásico, donde se evoluciona)
    if (this.mode === 'classic') {
      const badge = makeLabelSprite();
      badge.position.set(0, def.h + 0.5, 0);
      badge.visible = false;   // las insignias de nivel se consultan en el pop-up "Improve"
      mesh.add(badge);
      plant.badge = badge;
      plant._badgeText = '';
      this._refreshBadge(plant);
    }
    SFX.plant();
    this._burst(mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0x9adc60, 14);
    this._flash(mesh.position.clone().add(new THREE.Vector3(0, 0.55, 0.1)), 'part_green', 1.1);
  }

  // Cambia el cactus entre su forma normal y la estirada (anti-globo) reusando el
  // mismo billboard: se le cambia la textura y se reescala el plano.
  _setCactusForm(plant, tall) {
    if (!!plant.tallForm === !!tall) return;
    const entry = spriteTex(tall ? plant.def.tallSprite : plant.def.sprite);
    if (!entry) return;
    plant.tallForm = !!tall;
    const h = tall ? plant.def.tallH : plant.def.h;
    const plane = plant.mesh.userData.plane;
    plane.geometry.dispose();
    plane.geometry = new THREE.PlaneGeometry(h * entry.aspect, h);
    plane.position.y = h / 2;
    plant.mesh.userData.mat.map = entry.tex;
    plant.mesh.userData.mat.needsUpdate = true;
    plant.mesh.userData.h = h;
    plant.act = 1; // rebote al estirarse/encogerse
  }

  // Actualiza (sólo si cambió) la insignia de nivel/evolución de una planta.
  _refreshBadge(plant) {
    if (!plant.badge) return;
    const lvl = plant.level;
    const canEvo = lvl < 3 && this.sunAmount >= this.evolveCost(plant);
    const text = lvl >= 3 ? 'MAX ⭐' : canEvo ? `Lv${lvl} ⬆` : `Lv${lvl}`;
    if (text === plant._badgeText) return;
    plant._badgeText = text;
    const bg = lvl >= 3 ? '#12506a' : canEvo ? '#1d7a1d' : '#2a1d0a';
    setLabel(plant.badge, text, bg);
    // primera vez que el jugador puede evolucionar: pista clara
    if (canEvo && !this._evoTipShown) {
      this._evoTipShown = true;
      this.hooks.onStreak('💡 Tap the green ⬆ plant to evolve it!');
    }
  }

  _removePlant(plant) {
    this.grid[plant.r][plant.c] = null;
    this.plants = this.plants.filter(p => p !== plant);
    this.scene.remove(plant.mesh);
    this._burst(plant.mesh.position.clone().add(new THREE.Vector3(0, 0.4, 0)), 0x8a5a2b, 10);
  }

  // Bombas de un solo uso: Chili (arrasa el carril) y Cherry Bomb (cruz de 9 casillas).
  _detonate(r, c, def) {
    if (def.bomb === 'lane') return this._chiliLane(r, c, def);
    // Cherry Bomb: su casilla + DOS casillas en cada dirección (arriba, abajo, izquierda
    // y derecha). La cruz es larga, no de radio 1: en el centro del tablero alcanza los
    // cinco carriles y cinco columnas.
    const center = new THREE.Vector3(colX(c), 0.5, rowZ(r));
    SFX.boom();
    const tiles = [[r, c],
      [r - 1, c], [r - 2, c], [r + 1, c], [r + 2, c],
      [r, c - 1], [r, c - 2], [r, c + 1], [r, c + 2]]
      .filter(([tr, tc]) => tr >= 0 && tr < ROWS && tc >= 0 && tc < COLS);
    for (const [tr, tc] of tiles) {
      this._flash(new THREE.Vector3(colX(tc), 0.55, rowZ(tr)), 'fx_boom', 1.9);
      this._burst(new THREE.Vector3(colX(tc), 0.5, rowZ(tr)), 0xff7a3a, 12);
    }
    for (const z of this.zombies) {
      if (z.dying || z.flying) continue;   // los voladores sólo caen con el cactus estirado
      const zc = Math.round(z.mesh.position.x + (COLS - 1) / 2);
      if (tiles.some(([tr, tc]) => this._zInRow(z, tr) && tc === zc)) this._damageZombie(z, def.bombDmg);
    }
    this.hooks.onStreak('🍒 BOOM! Cherry blast!');
  }

  // Chili Pepper: una llamarada recorre el carril de izquierda a derecha y deja a
  // los zombies convertidos en siluetas negras.
  _chiliLane(r, _c, def) {
    SFX.boom();
    const mesh = makeBillboard('fx_boom', 1.3, { shadow: false });
    mesh.position.set(-(COLS / 2) - 0.8, 0.55, rowZ(r));
    this._face(mesh);
    this.scene.add(mesh);
    this.projectiles.push({ mesh, kind: 'lanefire', row: r, vx: 12, dmg: def.bombDmg });
    this.hooks.onStreak('🌶️ The whole lane goes up in flames!');
  }

  // ¿Ocupa el zombi esta fila? El jefe pisa dos carriles a la vez.
  _zInRow(z, row) { return z.r === row || (z.r2 !== undefined && z.r2 === row); }

  // Ajo: muerde al zombi y lo manda al carril contiguo (elige el que esté más libre).
  _divertZombie(z, plant) {
    if (z.r2 !== undefined) return;              // el jefe es demasiado grande para desviarlo
    const options = [z.r - 1, z.r + 1].filter(r => r >= 0 && r < ROWS);
    if (!options.length) return;
    // prefiere el carril con menos zombies para repartir la presión
    const count = (r) => this.zombies.filter(o => o !== z && !o.dying && this._zInRow(o, r)).length;
    const to = options.length === 1 ? options[0]
      : (count(options[0]) <= count(options[1]) ? options[0] : options[1]);
    z.r = to;
    z.diverted = true;                            // sólo se desvía una vez por ajo
    z.mesh.position.z = rowZ(to);
    z.mesh.position.x += 0.35;                    // rebota un poco hacia atrás
    this._damageZombie(z, plant.def.divertDmg * plant.dmgMul);
    plant.hp -= 60;                               // el ajo se gasta al usarse
    plant.act = 1;
    SFX.chomp();
    this._burst(z.mesh.position.clone().add(new THREE.Vector3(0, 0.7, 0)), 0xd8f08a, 12);
    if (plant.hp <= 0) this._removePlant(plant);
    // vuelve a poder ser desviado un poco después, para que otro ajo lo empuje de nuevo
    setTimeout(() => { z.diverted = false; }, 900);
  }

  // Coste de evolución de una planta según su nivel actual.
  evolveCost(plant) { return evolveCostFor(plant.def, plant.level); }

  // Evoluciona una planta plantada: LVL1 → LVL2 (evolved) → LVL3 (max).
  async _tryEvolve(plant) {
    if (this.mode !== 'classic') return;
    if (plant.level >= 3) { this.hooks.onStreak(`⭐ ${plant.def.name} is MAX level!`); return; }
    const cost = this.evolveCost(plant);
    if (this.sunAmount < cost) { this.hooks.onStreak(`Need ☀️${cost} to evolve ${plant.def.name}`); return; }
    const res = await this._askQuestion();
    if (!res.correct) return;
    // la planta pudo ser comida mientras se respondía
    if (!this.plants.includes(plant) || plant.level >= 3) return;
    this.sunAmount -= cost;
    this.hooks.onSun(this.sunAmount);
    this._applyEvolve(plant);
    this._streakCheck();
  }

  // Brillo progresivo de evolución: la planta NO cambia de tamaño, sólo brilla
  // más con cada nivel (dorado en LVL2, diamante en LVL3 MAX).
  _applyShine(plant) {
    const max = plant.level >= 3;
    const color = max ? 0x7ae0ff : 0xffd860;
    plant.mesh.userData.mat.color.set(max ? 0xdff4ff : 0xfff0c0);
    if (!plant.evolveGlow) {
      const glow = makeGlowSprite(color, 1.25); // tamaño fijo: no agranda la planta
      glow.position.set(0, plant.def.h * 0.5, 0);
      plant.mesh.add(glow);
      plant.evolveGlow = glow;
    }
    plant.evolveGlow.material.color.set(color);
    plant.evolveGlow.material.opacity = max ? 0.85 : 0.5; // más nivel = más brillo
  }

  _applyEvolve(plant) {
    plant.level++;
    plant.dmgMul *= EVOLVE.dmg;    // más daño
    plant.rateMul *= EVOLVE.rate;  // dispara más rápido
    plant.multi = (plant.def.multi || 1) + (plant.level - 1) * EVOLVE.shots; // +1 disparo por nivel
    plant.slowDur = 3 + (plant.level - 1) * EVOLVE.slow; // congelación más larga
    plant.sunMul = plant.level;   // más soles (sunny)
    const heal = plant.maxHp * (EVOLVE.hp - 1);
    plant.maxHp += heal; plant.hp += heal;        // más vida
    this._applyShine(plant);
    SFX.plant();
    this._burst(plant.mesh.position.clone().add(new THREE.Vector3(0, 0.7, 0)), plant.level >= 3 ? 0x7ae0ff : 0xffd860, 22);
    this._flash(plant.mesh.position.clone().add(new THREE.Vector3(0, 0.7, 0.1)), 'part_gold', 1.6);
    const tag = plant.level >= 3 ? 'MAX ⭐' : `LVL ${plant.level} ⬆️`;
    this.hooks.onStreak(`✨ ${plant.def.name} → ${tag}!`);
    this._refreshBadge(plant);
  }

  /* ============================ ZOMBIES ============================ */
  _spawnZombie(type, row = null, x = null) {
    const def = ZOMBIE_TYPES[type];
    // El jefe ocupa dos carriles: se elige una fila que tenga vecina por debajo.
    const r = row ?? (def.lanes === 2
      ? Math.floor(Math.random() * (ROWS - 1))
      : Math.floor(Math.random() * ROWS));
    const r2 = def.lanes === 2 ? r + 1 : undefined;
    // Zombi 3D: el cuerpo animado (modelo Kenney) es el personaje visible con sus
    // PIERNAS moviéndose, y encima le montamos la CARA/torso del sprite original
    // (recortado) para conservar la identidad de cada zombi (cono, cubo, casco…).
    // Zombies como sprites planos 2D del atlas del profe (billboards que miran a cámara).
    const mesh = makeBillboard(def.sprite, def.h);
    // a caballo entre las dos filas cuando ocupa dos carriles
    mesh.position.set(x ?? (COLS / 2 + 1.2 + Math.random() * 0.6), 0, r2 !== undefined ? rowZ(r) + 0.5 : rowZ(r));
    this._face(mesh);
    if (def.tint) mesh.userData.mat.color.set(def.tint);
    this.scene.add(mesh);

    // destello al entrar un zombie por la derecha
    if (x === null) this._flash(new THREE.Vector3(COLS / 2 + 1.9, 0.9, rowZ(r) * 0.35), 'part_purple', 1.15);
    // Endurecimiento de oleadas centrales: pico (+40 %) en la oleada del medio.
    let midMul = 1;
    if (this.midWaveTough && this.totalWaves && isFinite(this.totalWaves) && this.totalWaves > 0) {
      const t = Math.min(1, Math.max(0, this.waveNum / this.totalWaves));
      midMul = 1 + 0.40 * Math.sin(Math.PI * t);
      // remate final: en unidades avanzadas el último tercio de oleadas pega más fuerte
      if (this.lateWaveTough && t > 0.6) midMul += this.lateWaveTough * ((t - 0.6) / 0.4);
    }
    const hp0 = Math.round(def.hp * (this.zHpMul || 1) * midMul * this.diff.hp);
    this.zombies.push({
      type, def, mesh, r, r2, hp: hp0, maxHp: hp0, flying: !!def.flying,
      slowUntil: 0, dying: 0, phase: Math.random() * 6, flash: 0,
    });
    if (def.boss) this.hooks.onStreak('☠️ BOSS ZOMBIE — it walks over two lanes!');
    this.spawned++;
  }

  /* ============================ SUNS ============================ */
  _spawnSun(x, z, fromSky, value = 25) {
    const mesh = makeBillboard('fx_sun', 0.5, { shadow: false });
    const glow = makeGlowSprite(0xffd850, 1.1);
    glow.position.y = 0.25;
    mesh.add(glow);
    mesh.position.set(x, fromSky ? 8 : 0.6, z);
    this._face(mesh);
    this.scene.add(mesh);
    this.suns.push({ mesh, value, targetY: 0.35, fromSky, life: 12, collected: false, t: 0 });
  }

  _collectSun(sun) {
    if (sun.collected) return;
    sun.collected = true;
    SFX.sun();
    this.sunAmount += sun.value;
    this.hooks.onSun(this.sunAmount);
  }

  /* ============================ FX ============================ */
  _burst(pos, color, n = 12) {
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(n * 3);
    const vels = [];
    for (let i = 0; i < n; i++) {
      positions.set([pos.x, pos.y, pos.z], i * 3);
      vels.push(new THREE.Vector3((Math.random() - .5) * 3, Math.random() * 3 + 1, (Math.random() - .5) * 3));
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const mat = new THREE.PointsMaterial({ color, size: 0.09, transparent: true, opacity: 1 });
    const points = new THREE.Points(geo, mat);
    this.scene.add(points);
    this.particles.push({ points, vels, life: 0.7, maxLife: 0.7 });
  }

  _flash(pos, sprite = 'fx_boom', maxScale = 2) {
    const mesh = makeBillboard(sprite, 1, { shadow: false });
    mesh.position.copy(pos);
    mesh.position.y = Math.max(pos.y - 0.4, 0);
    this._face(mesh);
    mesh.scale.setScalar(0.3);
    this.scene.add(mesh);
    this.flashes.push({ mesh, t: 0, maxScale });
  }

  /* ============================ LOOP ============================ */
  _animate() {
    requestAnimationFrame(this._animate);
    const rawDt = Math.min(this.clock.getDelta(), 0.08);
    this.worldT = (this.worldT || 0) + rawDt;
    if (this.clouds) for (const c of this.clouds) {
      c.position.x += rawDt * 0.25;
      if (c.position.x > 18) c.position.x = -18;
    }
    if (this.titleGroup.visible) this._updateTitle(rawDt);
    if (this.state === 'playing') {
      const dt = rawDt * this.speed;
      this.time += dt;
      this._updateSpawning(dt);
      this._updatePlants(dt);
      this._updateZombies(dt);
      this._updateProjectiles(dt);
      this._updateSuns(dt);
      this._updateMowers(dt);
      this._updateParticles(dt);
      this._updateFlashes(dt);
      this._updateCooldowns(dt);
    } else if (this.state !== 'idle') {
      this._updateParticles(rawDt);
      this._updateFlashes(rawDt);
    }
    this.renderer.render(this.scene, this.camera);
  }

  _updateSpawning(dt) {
    if (this.mode === 'classic') {
      this.sunFallTimer -= dt;
      if (this.sunFallTimer <= 0) {
        this.sunFallTimer = (8 + Math.random() * 3) * this.diff.sunRate;
        this._spawnSun(colX(Math.floor(Math.random() * COLS)), rowZ(Math.floor(Math.random() * ROWS)), true);
      }
    }
    if (this.mode === 'vase') {
      if (this.vases.length === 0 && this.zombies.length === 0) this._win();
      return;
    }
    if (this.mode === 'bowling') return this._updateBowlingSpawn(dt);
    // ---- modo clásico: máquina de estados de oleadas ----
    this._updateWaves(dt);
  }

  // Spud Bowling conserva su flujo simple de aparición continua
  _updateBowlingSpawn(dt) {
    if (this.spawned >= this.totalZombies) {
      if (this.zombies.length === 0) this._win();
      return;
    }
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      this._spawnZombie(this._pickZombieType());
      const progress = this.spawned / this.totalZombies;
      this.spawnTimer = this.baseInterval * (0.7 + Math.random() * 0.5) * (1 - progress * 0.3);
      this.hooks.onWave(this.spawned, this.totalZombies, '🥔 Roll spuds to crush the zombies!');
    }
  }

  _waveLabel() {
    const n = this.waveNum;
    const tot = this.endless ? '∞' : this.totalWaves;
    return `🌊 Wave ${n}/${tot}`;
  }

  _updateWaves(dt) {
    if (this.waveState === 'intro') {
      this.waveTimer -= dt;
      if (this.waveTimer <= 0) this._beginWave();
      return;
    }
    if (this.waveState === 'spawning') {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0 && this.waveSpawned < this.waveTotal) {
        // último zombie de la oleada lleva bandera
        const isLast = this.waveSpawned === this.waveTotal - 1 && this.waveNum > 1;
        this._spawnZombie(isLast ? 'flag' : this._pickZombieType());
        this.waveSpawned++;
        const frac = this.waveSpawned / this.waveTotal;
        this.spawnTimer = this.waveInterval * (0.7 + Math.random() * 0.5);
        this.hooks.onWave(frac, 1, `${this._waveLabel()} — 🧟 attacking`);
      }
      if (this.waveSpawned >= this.waveTotal) this.waveState = 'clearing';
      return;
    }
    if (this.waveState === 'clearing') {
      // espera a que caigan todos los zombies de la oleada
      if (this.zombies.some(z => !z.dying)) return;
      if (!this.endless && this.waveNum >= this.totalWaves) { this._win(); return; }
      // recompensa por limpiar la oleada y descanso
      this.sunAmount += 25;
      this.hooks.onSun(this.sunAmount);
      this.waveState = 'rest';
      this.waveTimer = 6;
      this.hooks.onStreak(`✅ Wave ${this.waveNum} cleared! +25 ☀️`);
      SFX.victory();
      this.hooks.onWave(1, 1, `😌 Rest… next wave soon`);
      return;
    }
    if (this.waveState === 'rest') {
      this.waveTimer -= dt;
      if (this.waveTimer <= 3.02 && this.waveTimer + dt > 3.02) this.hooks.onStreak('⚠️ Next wave in 3…');
      if (this.waveTimer <= 0) this._beginWave();
    }
  }

  _beginWave() {
    this.waveNum++;
    this.waveState = 'spawning';
    this.waveSpawned = 0;
    const boss = (!this.endless && this.waveNum === this.totalWaves);
    // penúltima oleada: también dura y numerosa (rampa hacia la horda final)
    const nearEnd = (!this.endless && this.waveNum === this.totalWaves - 1 && this.totalWaves >= 3);
    // Progresión: variedad/cantidad/ritmo crecen oleada a oleada hasta la horda final.
    const D = this.difficulty * 0.55 + (this.waveNum - 1) * 1.0;
    this.zombiePool = this._buildZombiePool(D + (boss ? 3 : nearEnd ? 1.5 : 0));
    // cantidad: oleadas LARGAS (muchos zombies); la final y la penúltima son hordas.
    this.waveTotal = Math.round(4 + this.waveNum * 2.6 + this.difficulty * 0.5 + (boss ? 12 : nearEnd ? 5 : 0));
    // unidades avanzadas: las dos últimas oleadas traen aún más zombies
    if (this.lateWaveTough && (boss || nearEnd)) {
      this.waveTotal = Math.round(this.waveTotal * (1 + this.lateWaveTough * 0.35));
    }
    // …y la dificultad elegida escala la horda entera
    this.waveTotal = Math.max(2, Math.round(this.waveTotal * this.diff.count));
    // ritmo: primeras oleadas espaciadas (~4 s), las últimas casi seguidas
    this.waveInterval = Math.max((4.2 - this.waveNum * 0.3 - this.difficulty * 0.06 - (boss ? 0.7 : 0)) * this.diff.interval, 0.5);
    this.spawnTimer = 0.8;
    // La 1ª oleada de CADA nivel es fácil: pocos básicos y lentos, para arrancar
    // con calma. La 2ª sigue siendo suave.
    if (this.waveNum === 1) {
      this.waveTotal = Math.min(this.waveTotal, 4);
      this.zombiePool = [{ t: 'basic', w: 10 }];
      this.waveInterval = Math.max(this.waveInterval, 4.2);
    } else if (this.waveNum === 2) {
      this.waveTotal = Math.min(this.waveTotal, 7);
      this.zombiePool = this._buildZombiePool(Math.min(D, 0.9)); // básico + algún cono
      this.waveInterval = Math.max(this.waveInterval, 3.2);
    }
    this.hooks.onStreak(boss ? '☠️ FINAL HORDE — good luck!' : nearEnd ? '⚠️ Huge wave incoming!' : `🌊 Wave ${this.waveNum}!`);
    SFX.wave();
    this.hooks.onWave(0, 1, `${this._waveLabel()} — 🧟 attacking`);
  }

  _updatePlants(dt) {
    for (const p of this.plants) {
      p.spawnAnim = Math.min(p.spawnAnim + dt * 4, 1);
      p.recoil = Math.max(p.recoil - dt * 4, 0);
      p.act = Math.max(p.act - dt * 2.6, 0);
      // Las plantas se quedan quietas: sólo se mueven cuando hacen algo
      // (disparar → recoil, producir un sol → act). Sin balanceo de reposo.
      const pulse = Math.sin(p.act * Math.PI); // 0 → 1 → 0, suave
      p.mesh.scale.setScalar(p.spawnAnim * (1 + p.recoil * 0.12 + pulse * 0.10));
      p.mesh.userData.plane.rotation.z = pulse * 0.05;

      if (p.badge) {
        this._refreshBadge(p);
        // la insignia late cuando se puede evolucionar, para llamar la atención
        const pulse = p._badgeText.includes('⬆') ? 1 + Math.sin(this.time * 6) * 0.14 : 1;
        p.badge.scale.set(0.8 * pulse, 0.4 * pulse, 1);
      }

      if (p.def.sun) {
        if (this.mode !== 'classic') continue;
        p.sunTimer -= dt;
        if (p.sunTimer <= 0) {
          // evolucionada: produce soles más a menudo y de más valor
          p.sunTimer = (11 + Math.random() * 2) / (1 + (p.level - 1) * EVOLVE.sunRate);
          p.act = 1; // pequeño rebote al soltar el sol
          this._spawnSun(p.mesh.position.x + 0.3, p.mesh.position.z + 0.2, false, p.def.sun * p.sunMul);
        }
        continue;
      }
      // Patata Mina: se arma bajo tierra y revienta al primer zombi que la pisa
      if (p.def.mine) {
        p.armed = (p.armed || 0) + dt;
        const ready = p.armed >= p.def.armTime;
        p.mesh.userData.mat.opacity = ready ? 1 : 0.55;   // asomando mientras se arma
        p.mesh.userData.mat.transparent = true;
        if (!ready) continue;
        const touch = this.zombies.find(z => !z.dying && !z.flying && this._zInRow(z, p.r)
          && Math.abs(z.mesh.position.x - p.mesh.position.x) < 0.5);
        if (touch) {
          SFX.boom();
          this._flash(p.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 'fx_boom', 2.2);
          this._burst(p.mesh.position.clone().add(new THREE.Vector3(0, 0.4, 0)), 0xff9a40, 22);
          for (const z of this.zombies) {
            if (z.dying || z.flying) continue;
            if (z.mesh.position.distanceTo(p.mesh.position) < 0.95) this._damageZombie(z, p.def.mineDmg);
          }
          this._removePlant(p);
        }
        continue;
      }
      if (!p.def.fireRate) continue;
      // Cactus: se estira cuando hay un volador en su carril (única forma de bajarlo)
      // y vuelve a su forma normal cuando ya no queda ninguno.
      if (p.def.antiAir) {
        const air = this.zombies.some(z => !z.dying && z.flying && this._zInRow(z, p.r)
          && z.mesh.position.x > p.mesh.position.x - 0.2 && z.mesh.position.x < COLS / 2 + 2.2);
        this._setCactusForm(p, air);
      }
      const wantFlying = !!(p.def.antiAir && p.tallForm);
      const targets = this.zombies.filter(z => this._zInRow(z, p.r) && !z.dying && !!z.flying === wantFlying
        && z.mesh.position.x > p.mesh.position.x - 0.2 && z.mesh.position.x < COLS / 2 + 2.2);
      if (!targets.length) continue;
      p.fireTimer -= dt;
      if (p.fireTimer <= 0) {
        p.fireTimer = p.def.fireRate * p.rateMul; // evolución dispara más rápido
        this._fire(p, targets);
      }
    }
  }

  _fire(plant, targets) {
    SFX.shoot();
    plant.recoil = 1;
    const from = plant.mesh.position.clone().add(new THREE.Vector3(0.32, 0.55, 0));
    const dmg = (plant.def.dmg || 0) * plant.dmgMul;
    const kind = plant.def.kind;
    if (kind === 'lob') {
      // proyectil en arco (Cabbage-pult / Bloom Shroom / Winter Melon)
      const target = targets.reduce((a, b) => a.mesh.position.x < b.mesh.position.x ? a : b);
      const mesh = makeBillboard(plant.def.lobSprite || 'fx_gas', 0.22, { shadow: false });
      mesh.position.copy(from);
      this._face(mesh);
      this.scene.add(mesh);
      const to = target.mesh.position.clone().setY(0.4);
      to.x -= 0.2;
      this.projectiles.push({
        mesh, kind: 'spore', dmg, aoe: (plant.def.aoe || 0.7) * (1 + (plant.level - 1) * EVOLVE.aoe),
        slow: plant.def.slow, slowDur: plant.slowDur, row: plant.r, arc: { from, to, t: 0, dur: 0.8 },
      });
      return;
    }
    // proyectil recto; el número de disparos por ráfaga sube con la evolución.
    // Sprites propios por tipo de disparo (guisante, hielo, fuego, pincho, maíz).
    const SHOT = { frost: 'fx_ice', flame: 'fx_fire', spike: 'fx_spike', kernel: 'fx_corn' };
    const sprite = SHOT[kind] || 'fx_pea';
    // proporción del proyectil respecto a la casilla: antes se veían enormes
    const h = kind === 'spike' ? 0.15 : 0.14;
    // el cactus estirado es el único disparo que alcanza a los voladores
    const antiAir = !!(plant.def.antiAir && plant.tallForm);
    for (let i = 0; i < plant.multi; i++) {
      const mesh = makeBillboard(sprite, h, { shadow: false });
      mesh.position.copy(from);
      if (antiAir) mesh.position.y = 0.95;   // sale a la altura del globo
      mesh.position.x -= i * 0.42; // el tren de disparos sale espaciado
      this._face(mesh);
      this.scene.add(mesh);
      this.projectiles.push({
        mesh, kind, dmg, slow: plant.def.slow, slowDur: plant.slowDur, row: plant.r, vx: 7, antiAir,
        pierce: plant.def.pierce || 0, burn: plant.def.burn || 0, hitSet: plant.def.pierce ? new Set() : null,
      });
    }
  }

  _updateProjectiles(dt) {
    for (const pr of this.projectiles) {
      if (pr.arc) {
        pr.arc.t += dt / pr.arc.dur;
        const t = Math.min(pr.arc.t, 1);
        pr.mesh.position.lerpVectors(pr.arc.from, pr.arc.to, t);
        pr.mesh.position.y += Math.sin(t * Math.PI) * 1.6;
        if (t >= 1) { this._explode(pr); pr.dead = true; }
        continue;
      }
      if (pr.kind === 'potato') {
        pr.mesh.position.x += pr.vx * dt;
        pr.mesh.position.z += (pr.targetZ - pr.mesh.position.z) * Math.min(dt * 6, 1);
        pr.mesh.userData.plane.rotation.z -= dt * 9;
        if (pr.mesh.position.x > COLS / 2 + 2) { pr.dead = true; this.scene.remove(pr.mesh); continue; }
        for (const z of this.zombies) {
          if (z.dying || z.flying || !this._zInRow(z, pr.row)) continue;
          if (Math.abs(z.mesh.position.x - pr.mesh.position.x) < 0.35 && !(pr.lastHit === z)) {
            pr.lastHit = z;
            this._damageZombie(z, pr.dmg);
            SFX.hit();
            this._burst(pr.mesh.position.clone().add(new THREE.Vector3(0, 0.3, 0)), 0xd8b45a, 12);
            // rebota a la fila vecina
            const dir = pr.row === 0 ? 1 : pr.row === ROWS - 1 ? -1 : (Math.random() < 0.5 ? -1 : 1);
            pr.row += dir;
            pr.targetZ = rowZ(pr.row);
            break;
          }
        }
        continue;
      }
      if (pr.kind === 'lanefire') {
        // Chili: la llamarada barre el carril y deja siluetas negras a su paso
        pr.mesh.position.x += pr.vx * dt;
        pr.mesh.userData.plane.rotation.z += dt * 4;
        if ((pr.fxTimer = (pr.fxTimer || 0) - dt) <= 0) {
          pr.fxTimer = 0.06;
          this._burst(pr.mesh.position, 0xff7a3a, 6);
        }
        for (const z of this.zombies) {
          if (z.dying || z.flying || !this._zInRow(z, pr.row)) continue;
          if (z.mesh.position.x <= pr.mesh.position.x + 0.4) { z.charred = true; this._damageZombie(z, pr.dmg); }
        }
        if (pr.mesh.position.x > COLS / 2 + 3) { pr.dead = true; this.scene.remove(pr.mesh); }
        continue;
      }
      pr.mesh.position.x += pr.vx * dt;
      if (pr.kind !== 'pea') pr.mesh.userData.plane.rotation.z -= dt * 6;
      if (pr.mesh.position.x > COLS / 2 + 2.5) { pr.dead = true; this.scene.remove(pr.mesh); continue; }
      for (const z of this.zombies) {
        if (z.dying || !this._zInRow(z, pr.row)) continue;
        // Sólo el cactus estirado alcanza a los voladores; el resto los atraviesa
        if (z.flying !== !!pr.antiAir) continue;
        if (pr.hitSet && pr.hitSet.has(z)) continue;
        if (Math.abs(z.mesh.position.x - pr.mesh.position.x) < 0.28) {
          this._damageZombie(z, pr.dmg);
          if (pr.slow) z.slowUntil = this.time + (pr.slowDur || 3);
          if (pr.kind === 'kernel') z.mesh.position.x += 0.18;
          SFX.hit();
          this._burst(pr.mesh.position, pr.kind === 'frost' ? 0x9adcff : pr.kind === 'kernel' ? 0xffd23d : pr.kind === 'flame' ? 0xff8c40 : 0x7ed348, 8);
          // Ember Torch: pequeña llamarada que quema a los vecinos
          if (pr.burn) {
            this._flash(pr.mesh.position, 'part_orange', 1.0);
            for (const o of this.zombies) {
              if (o !== z && !o.dying && o.mesh.position.distanceTo(pr.mesh.position) < pr.burn) this._damageZombie(o, pr.dmg * 0.5);
            }
          }
          // Spike Cactus: la espina atraviesa varios zombies
          if (pr.pierce > 0) {
            pr.pierce--;
            pr.hitSet.add(z);
            if (pr.pierce > 0) continue;
          }
          pr.dead = true;
          this.scene.remove(pr.mesh);
          break;
        }
      }
    }
    this.projectiles = this.projectiles.filter(p => !p.dead);
  }

  _explode(pr) {
    SFX.boom();
    this._flash(pr.mesh.position, 'fx_boom', 2.2);
    this._burst(pr.mesh.position, 0xc07be8, 22);
    for (const z of this.zombies) {
      if (z.dying || z.flying) continue;   // los voladores sólo caen con el cactus estirado
      if (z.mesh.position.distanceTo(pr.mesh.position) < pr.aoe) {
        this._damageZombie(z, pr.dmg);
        if (pr.slow) z.slowUntil = this.time + (pr.slowDur || 3); // Winter Melon congela el grupo
      }
    }
    this.scene.remove(pr.mesh);
  }

  _damageZombie(z, dmg) {
    z.hp -= dmg;
    z.flash = 0.1;
    if (z.hp <= 0 && !z.dying) {
      z.dying = 0.0001;
      this.killed++;
      SFX.zombieDie();
      this._burst(z.mesh.position.clone().add(new THREE.Vector3(0, 0.8, 0)), 0x9db56e, 18);
      this._flash(z.mesh.position.clone().add(new THREE.Vector3(0, 0.7, 0.1)), 'part_purple', 1.2);
    }
  }

  _updateZombies(dt) {
    // gemidos ambientales aleatorios mientras haya zombies vivos
    this.groanTimer = (this.groanTimer ?? 4) - dt;
    if (this.groanTimer <= 0) {
      this.groanTimer = 5 + Math.random() * 8;
      if (this.zombies.some(z => !z.dying)) SFX.groan();
    }
    for (const z of this.zombies) {
      const plane = z.mesh.userData.plane;
      const mat = z.mesh.userData.mat;
      if (z.dying) {
        z.dying += dt;
        if (z.charred) {
          // Achicharrado por el Chili: queda de pie como silueta negra un momento
          mat.color.set(0x000000);
          plane.rotation.z = 0;
          mat.opacity = z.dying < 1.8 ? 1 : Math.max(1 - (z.dying - 1.8) * 1.4, 0);
          if (z.dying > 2.6) { this.scene.remove(z.mesh); z.remove = true; }
          continue;
        }
        plane.rotation.z = Math.min(z.dying * 2.2, Math.PI / 2 - 0.2);
        mat.opacity = Math.max(1 - z.dying * 1.1, 0);
        mat.transparent = true;
        if (z.dying > 0.9) { this.scene.remove(z.mesh); z.remove = true; }
        continue;
      }
      z.flash = Math.max(z.flash - dt, 0);
      const slowed = this.time < z.slowUntil;
      mat.color.set(z.flash > 0 ? 0xff9a8a : slowed ? 0x9ac8ff : (z.def.tint || 0xffffff));

      let speed = z.def.speed * (slowed ? 0.45 : 1) * this.diff.speed;
      // las 2 primeras oleadas avanzan más lento, para que arrancar sea tranquilo
      if (this.mode === 'classic' && this.waveNum <= 2) speed *= 0.72;
      if (z.type === 'book' && z.hp < z.maxHp * 0.45) speed *= 2;

      const c = Math.round(z.mesh.position.x + (COLS - 1) / 2);
      let eating = null;
      if (c >= 0 && c < COLS) {
        // el jefe arrasa las plantas de sus DOS carriles a la vez
        const rowsHit = z.r2 !== undefined ? [z.r, z.r2] : [z.r];
        for (const rr of rowsHit) {
          const plant = this.grid[rr][c];
          if (!plant) continue;
          if (plant.def.ground) {
            // Spikeweed: hiere al zombie que lo pisa (los voladores lo sobrevuelan)
            if (!z.flying) this._damageZombie(z, plant.def.groundDmg * plant.dmgMul * dt);
          } else if (plant.def.divert && !z.flying && !z.diverted
                     && z.mesh.position.x - colX(c) < 0.55 && z.mesh.position.x > colX(c) - 0.2) {
            // Ajo: le pega un bocado y lo empuja al carril de al lado
            this._divertZombie(z, plant);
          } else if (!z.flying && z.mesh.position.x - colX(c) < 0.42 && z.mesh.position.x > colX(c) - 0.1) {
            eating = eating || plant;
            if (plant !== eating) { plant.hp -= z.def.dmg * dt; if (plant.hp <= 0) this._removePlant(plant); }
          }
        }
      }
      if (eating) {
        z.eatTimer = (z.eatTimer || 0) - dt;
        if (z.eatTimer <= 0) {
          z.eatTimer = 0.55;
          SFX.chomp();
          this._burst(eating.mesh.position.clone().add(new THREE.Vector3(0, 0.5, 0)), 0x6a9a30, 5);
        }
        eating.hp -= z.def.dmg * dt;
        if (eating.hp <= 0) this._removePlant(eating);
        plane.rotation.z = Math.sin(this.time * 13) * 0.09;
      } else {
        z.mesh.position.x -= speed * dt;
        const t = this.time * 4.6 + z.phase;
        plane.rotation.z = Math.sin(t) * 0.07;
        // los voladores flotan más alto y con vaivén suave
        z.mesh.position.y = z.flying ? 0.55 + Math.sin(t * 0.5) * 0.12 : Math.abs(Math.sin(t)) * 0.035;
        this._face(z.mesh);
      }

      if (z.mesh.position.x < -(COLS / 2) - 0.4) {
        const mower = this.mowers.find(m => m.row === z.r && !m.used);
        if (mower && !mower.active) {
          mower.active = true; mower.used = true;
          SFX.mower();
        } else if (!mower && !this.mowers.some(m => m.row === z.r && m.active)) {
          this._lose();
          return;
        }
      }
    }
    this.zombies = this.zombies.filter(z => !z.remove);
  }

  _updateMowers(dt) {
    for (const m of this.mowers) {
      if (!m.active) {
        if (m.used) continue;
        m.mesh.position.y = 0.06 + Math.sin(this.time * 2 + m.row) * 0.045;
        m.mesh.userData.plane.rotation.z = Math.sin(this.time * 1.5 + m.row) * 0.12;
        continue;
      }
      m.mesh.position.x += 7.5 * dt;
      m.mesh.position.y = 0.15 + Math.abs(Math.sin(this.time * 14)) * 0.12;
      m.mesh.userData.plane.rotation.z -= dt * 4;
      for (const z of this.zombies) {
        if (!z.dying && z.r === m.row && Math.abs(z.mesh.position.x - m.mesh.position.x) < 0.5) {
          this._damageZombie(z, 9999);
        }
      }
      if (m.mesh.position.x > COLS / 2 + 3) {
        this.scene.remove(m.mesh);
        m.active = false;
        if (m.extra) this.mowers = this.mowers.filter(x => x !== m);
      }
    }
  }

  _updateSuns(dt) {
    for (const s of this.suns) {
      s.t += dt;
      if (s.collected) {
        s.mesh.position.lerp(new THREE.Vector3(-7, 7.5, -2), dt * 6);
        s.mesh.scale.multiplyScalar(1 - dt * 2.2);
        if (s.mesh.scale.x < 0.1) { this.scene.remove(s.mesh); s.remove = true; }
        continue;
      }
      if (s.mesh.position.y > s.targetY) s.mesh.position.y -= dt * (s.fromSky ? 1.1 : 2.2);
      s.mesh.userData.plane.rotation.z += dt * 1.2;
      s.mesh.scale.setScalar(1 + Math.sin(s.t * 4) * 0.07);
      s.life -= dt;
      if (s.life <= 0) {
        s.mesh.scale.multiplyScalar(1 - dt * 4);
        if (s.mesh.scale.x < 0.1) { this.scene.remove(s.mesh); s.remove = true; }
      }
    }
    this.suns = this.suns.filter(s => !s.remove);
  }

  _updateParticles(dt) {
    for (const p of this.particles) {
      p.life -= dt;
      const pos = p.points.geometry.attributes.position;
      for (let i = 0; i < p.vels.length; i++) {
        p.vels[i].y -= dt * 6;
        pos.array[i * 3] += p.vels[i].x * dt;
        pos.array[i * 3 + 1] += p.vels[i].y * dt;
        pos.array[i * 3 + 2] += p.vels[i].z * dt;
      }
      pos.needsUpdate = true;
      p.points.material.opacity = Math.max(p.life / p.maxLife, 0);
      if (p.life <= 0) { this.scene.remove(p.points); p.remove = true; }
    }
    this.particles = this.particles.filter(p => !p.remove);
  }

  _updateFlashes(dt) {
    for (const f of this.flashes) {
      f.t += dt * 2.6;
      const s = 0.3 + (f.maxScale - 0.3) * Math.min(f.t, 1);
      f.mesh.scale.setScalar(s);
      f.mesh.userData.mat.opacity = Math.max(1 - f.t, 0);
      f.mesh.userData.mat.transparent = true;
      if (f.t >= 1) { this.scene.remove(f.mesh); f.remove = true; }
    }
    this.flashes = this.flashes.filter(f => !f.remove);
  }

  _updateCooldowns(dt) {
    let changed = false;
    for (const c of this.cards) {
      if (c.cd > 0) { c.cd = Math.max(c.cd - dt, 0); changed = true; }
    }
    if (changed || this._lastSun !== this.sunAmount) this.hooks.onCards(this.cards);
    this._lastSun = this.sunAmount;
  }

  /* ============================ END ============================ */
  _endStats(stars) {
    return {
      stars,
      accuracy: Math.round(this.quiz.accuracy * 100),
      asked: this.quiz.stats.asked,
      correct: this.quiz.stats.correct,
      bestStreak: this.quiz.stats.bestStreak,
      killed: this.killed,
    };
  }

  _win() {
    if (this.state !== 'playing') return;
    this.state = 'won';
    SFX.victory();
    const acc = this.quiz.accuracy;
    const stars = acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1;
    this.hooks.onEnd(true, this._endStats(stars));
  }

  _lose() {
    if (this.state !== 'playing') return;
    this.state = 'lost';
    SFX.defeat();
    this.hooks.onEnd(false, this._endStats(0));
  }

  // fin por límite de tiempo (Class Mode): sobrevivir cuenta como victoria
  timeUp() { if (this.state === 'playing' || this.state === 'quiz') { this.quiz.hide(); this.state = 'playing'; this._win(); } }

  pause() { if (this.state === 'playing') this.state = 'paused'; }
  resume() { if (this.state === 'paused') { this.state = 'playing'; this.clock.getDelta(); } }
  toggleSpeed() { this.speed = this.speed === 1 ? 2 : 1; return this.speed; }
}
