/* Class Wars — game content: the 25 teacher powers, weapons, mystery-box effects and shop upgrades. */
import { TEACHERS } from '@/features/cards/teachers';
import type { IconKey } from './icons';

export const CHAR_IDS = TEACHERS.map((t) => t.id);
export const charIndex = (id: string) => Math.max(0, CHAR_IDS.indexOf(id));
export const charAt = (i: number) => TEACHERS[i] ?? TEACHERS[0];

export interface PowerDef {
  id: string; // = character id
  name: string;
  ic: IconKey;
  desc: string;
  cd: number; // seconds
  color: string;
  /** Aimed powers use the aim direction / point. */
  aimed?: boolean;
}

const LAPTOP_DESC = 'Lanzas una laptop: golpe fuerte (28 de daño) que empuja lejos al rival.';
export const POWERS: Record<string, PowerDef> = {
  camila: { id: 'camila', name: 'Sonrisa radiante', ic: 'smile', color: '#ff9f7a', cd: 14, desc: 'Una ola de alegría encanta a los rivales cercanos: van lentos y no pueden atacar 2,5 s.' },
  sofia: { id: 'sofia', name: 'Flash fashion', ic: 'camera', color: '#c18cff', cd: 13, aimed: true, desc: 'Un flash de cámara en cono ciega a quien tengas enfrente durante 3 s.' },
  gabriel: { id: 'gabriel', name: 'Escalera real', ic: 'cards', color: '#3fa7d6', cd: 9, aimed: true, desc: 'Lanzas 3 cartas de póker en abanico que atraviesan a los rivales (14 de daño cada una).' },
  sander: { id: 'sander', name: 'Hello, my dears!', ic: 'megaphone', color: '#4fb39a', cd: 12, aimed: true, desc: 'Un saludo tan potente que empuja y aturde 1 s a los rivales que tengas enfrente.' },
  nataly: { id: 'nataly', name: 'Laptop voladora', ic: 'laptop', color: '#e98fc0', cd: 10, aimed: true, desc: LAPTOP_DESC },
  anyela: { id: 'anyela', name: 'Lluvia de libros', ic: 'books', color: '#c9a227', cd: 9, aimed: true, desc: 'Lanzas 5 libros en abanico que golpean y empujan.' },
  julian: { id: 'julian', name: 'Laptop al rescate', ic: 'laptop', color: '#8b5a2b', cd: 10, aimed: true, desc: LAPTOP_DESC },
  freddy: { id: 'freddy', name: 'Silbato turbo', ic: 'whistle', color: '#e23d4f', cd: 12, desc: '¡Pitazo! Empujas a los que están cerca y corres rapidísimo 3,5 s.' },
  andres: { id: 'andres', name: 'Guitarrazo', ic: 'guitar', color: '#3a5bc7', cd: 11, aimed: true, desc: 'Un golpe de guitarra en arco: 26 de daño, empuja y aturde 1 s a quien alcance.' },
  angie: { id: 'angie', name: 'Lluvia de ideas', ic: 'bulb', color: '#f5c518', cd: 12, aimed: true, desc: 'Una bombilla-rayo cae donde apuntas: 35 de daño y aturde.' },
  lina: { id: 'lina', name: 'Todo en orden', ic: 'folder', color: '#2fb3a0', cd: 15, desc: 'Recargas tu arma, ganas +40 de escudo y disparas más rápido 6 s.' },
  valentina: { id: 'valentina', name: 'Rizo atrapador', ic: 'curl', color: '#f5c518', cd: 10, aimed: true, desc: 'Lanzas un rizo de tu cabello que atraviesa a los rivales: 16 de daño y quedan lentos 3 s.' },
  esteban: { id: 'esteban', name: 'Ataque hacker', ic: 'hacker', color: '#30d158', cd: 15, desc: 'Hackeas a los rivales cercanos: 12 de daño y no pueden disparar ni usar poderes durante 3 s.' },
  sebastian: { id: 'sebastian', name: 'Lluvia de gatos', ic: 'cat', color: '#f29a4a', cd: 12, aimed: true, desc: 'Lanzas 3 gatos que persiguen al rival más cercano (12 de daño cada uno).' },
  javier: { id: 'javier', name: 'Control remoto', ic: 'gamepad', color: '#5b6670', cd: 11, aimed: true, desc: 'Lanzas tu mando de juego: 18 de daño y aturde 1,5 s.' },
  anny: { id: 'anny', name: 'Chocolatazo', ic: 'chocolate', color: '#ef8fc4', cd: 10, aimed: true, desc: 'Lanzas una barra de chocolate (22 de daño). Si acierta, recuperas 15 de vida y corres más 3 s.' },
  estephania: { id: 'estephania', name: 'Pelota arcoíris', ic: 'ball', color: '#8e5bd6', cd: 10, aimed: true, desc: 'Una pelota de colores que rebota en las paredes hasta 4 veces (18 de daño por golpe).' },
  dager: { id: 'dager', name: 'Escudo sabio', ic: 'shield', color: '#9fb4c4', cd: 18, desc: 'Una burbuja te protege 4 s de todo el daño y recarga tu escudo.' },
  liliana: { id: 'liliana', name: 'Micrófono abierto', ic: 'mic', color: '#b4441f', cd: 11, aimed: true, desc: 'Lanzas tu micrófono: al chocar suelta una onda de sonido (24 de daño y lentitud 2 s en área).' },
  norvey: { id: 'norvey', name: 'Puntero láser', ic: 'laser', color: '#ff3b30', cd: 10, aimed: true, desc: 'Un láser larguísimo atraviesa a todos los que estén en línea: 30 de daño.' },
  mafe: { id: 'mafe', name: 'Sombra', ic: 'moon', color: '#6b4a7a', cd: 14, aimed: true, desc: 'Un dash entre sombras y 4 s invisible (atacar te revela).' },
  jhonathan: { id: 'jhonathan', name: '¡Oh là là!', ic: 'baguette', color: '#3a5bc7', cd: 14, aimed: true, desc: 'Un grito francés en cono que confunde a los rivales: controles al revés 3 s.' },
  jalbleidy: { id: 'jalbleidy', name: 'Detención', ic: 'clipboard', color: '#7d2f16', cd: 12, aimed: true, desc: 'Lanzas tu portapapeles: quien lo reciba queda castigado sin moverse 2,5 s.' },
  juanpablo: { id: 'juanpablo', name: 'Tinta viva', ic: 'ink', color: '#2b3a55', cd: 14, aimed: true, desc: 'Sus tatuajes cobran vida: un charco de tinta frena y daña a los rivales 5 s.' },
  vanessa: { id: 'vanessa', name: 'Cambio de idioma', ic: 'swap', color: '#e23d4f', cd: 15, desc: 'Cambias de lugar con el rival más cercano (hasta 420 px) y lo dejas confundido.' },
};

export const powerOf = (charId: string) => POWERS[charId] ?? POWERS.camila;

export type WeaponKind = 'proj' | 'melee' | 'explosive' | 'pierce' | 'spread' | 'grenade';
export interface WeaponDef {
  id: number;
  key: string;
  name: string;
  ic: IconKey;
  kind: WeaponKind;
  dmg: number;
  cd: number; // ms between uses
  speed: number;
  range: number;
  ammo: number; // 255 = infinite
  kb: number;
  radius: number; // projectile radius, or explosion radius
  color: string;
  desc: string;
  /** Energy each use costs. */
  en: number;
  /** Seconds the weapon lasts (melee grants), 0 = until out of ammo. */
  lasts?: number;
}

export const INF = 255;
export const WEAPONS: WeaponDef[] = [
  { id: 0, key: 'chalk', name: 'Tiza', ic: 'chalk', kind: 'proj', dmg: 11, cd: 340, speed: 720, range: 520, ammo: INF, kb: 70, radius: 7, color: '#ffffff', en: 5, desc: 'Tu arma básica: lanza tizas sin límite.' },
  { id: 1, key: 'prickler', name: 'Erizo', ic: 'hedgehog', kind: 'melee', dmg: 26, cd: 520, speed: 0, range: 92, ammo: INF, kb: 560, radius: 0, color: '#4f8a2b', en: 6, desc: 'Golpea cuerpo a cuerpo y empuja lejos para robar diamantes.', lasts: 60 },
  { id: 2, key: 'bubble', name: 'Burbujeador', ic: 'bubble', kind: 'proj', dmg: 15, cd: 210, speed: 650, range: 560, ammo: 24, kb: 90, radius: 9, color: '#7fdcff', en: 4, desc: 'Ráfaga de burbujas rápidas.' },
  { id: 3, key: 'eraser', name: 'Lanzaborradores', ic: 'eraser', kind: 'explosive', dmg: 30, cd: 760, speed: 560, range: 600, ammo: 6, kb: 400, radius: 78, color: '#ff7aa8', en: 12, desc: 'Borradores que explotan en área.' },
  { id: 4, key: 'highlighter', name: 'Rayo resaltador', ic: 'highlighter', kind: 'pierce', dmg: 22, cd: 460, speed: 1100, range: 780, ammo: 10, kb: 130, radius: 8, color: '#d7ff3a', en: 9, desc: 'Atraviesa a todos los rivales en línea.' },
  { id: 5, key: 'clips', name: 'Clipadora', ic: 'clip', kind: 'spread', dmg: 10, cd: 520, speed: 760, range: 430, ammo: 12, kb: 110, radius: 6, color: '#cfd8dc', en: 7, desc: 'Tres clips en abanico de un disparo.' },
  { id: 6, key: 'glitter', name: 'Bomba de purpurina', ic: 'glitter', kind: 'grenade', dmg: 34, cd: 820, speed: 0, range: 420, ammo: 4, kb: 430, radius: 96, color: '#ff5ce1', en: 14, desc: 'Lánzala donde apuntas: ¡explota en purpurina!' },
];

/** Projectile kinds besides weapons (powers). Index space shared with weapon ids. */
export const PJ = { chalk: 0, book: 20, clipboard: 21, card: 22, laptop: 23, curl: 24, cat: 25, pad: 26, choco: 27, ball: 28, mic: 29 } as const;
/** How each power projectile looks (icon sprite, size, spin) — weapons use their own icon. */
export const PJ_LOOK: Record<number, { ic: IconKey; size: number; spin: number; color: string }> = {
  [PJ.book]: { ic: 'books', size: 26, spin: 7, color: '#3a5bc7' },
  [PJ.clipboard]: { ic: 'clipboard', size: 28, spin: 9, color: '#a8774a' },
  [PJ.card]: { ic: 'cards', size: 24, spin: 14, color: '#ff3b5c' },
  [PJ.laptop]: { ic: 'laptop', size: 34, spin: 6, color: '#7fdcff' },
  [PJ.curl]: { ic: 'curl', size: 30, spin: 10, color: '#8b4a1e' },
  [PJ.cat]: { ic: 'cat', size: 30, spin: 0, color: '#f29a4a' },
  [PJ.pad]: { ic: 'gamepad', size: 30, spin: 11, color: '#5b6670' },
  [PJ.choco]: { ic: 'chocolate', size: 28, spin: 9, color: '#6b3a1e' },
  [PJ.ball]: { ic: 'ball', size: 28, spin: 8, color: '#ff4d5e' },
  [PJ.mic]: { ic: 'mic', size: 28, spin: 10, color: '#9fb4c4' },
};

export type BoxEffect = 'costume' | 'gadget' | 'healer' | 'shield' | 'speed' | 'magnet' | 'trap' | 'power' | 'jackpot' | 'happy';
export const BOX_EFFECTS: { id: BoxEffect; w: number; title: string; ic: IconKey; color: string }[] = [
  { id: 'gadget', w: 22, title: 'NUEVO ARTEFACTO', ic: 'gift', color: '#ff9f0a' },
  { id: 'power', w: 16, title: 'PODER PRESTADO', ic: 'star', color: '#bf5af2' },
  { id: 'costume', w: 10, title: 'CAMBIO DE DISFRAZ', ic: 'mask', color: '#30d158' },
  { id: 'healer', w: 10, title: 'SANADOR', ic: 'heartPlus', color: '#ff375f' },
  { id: 'shield', w: 9, title: 'ESCUDO', ic: 'shield', color: '#0a84ff' },
  { id: 'speed', w: 9, title: 'VELOCIDAD', ic: 'sneaker', color: '#64d2ff' },
  { id: 'magnet', w: 7, title: 'IMÁN', ic: 'magnet', color: '#ff453a' },
  { id: 'jackpot', w: 7, title: 'TESORO', ic: 'chest', color: '#ffd60a' },
  { id: 'happy', w: 5, title: 'HORA FELIZ', ic: 'happy', color: '#ffd60a' },
  { id: 'trap', w: 7, title: '¡TRAMPA!', ic: 'bomb', color: '#ff453a' },
];

export interface UpgradeDef {
  id: 'en' | 'streak' | 'box' | 'eff' | 'ins' | 'hp';
  name: string;
  ic: IconKey;
  values: number[];
  costs: number[]; // costs[i] = energy to reach level i (costs[0] unused)
  fmt: (v: number) => string;
  desc: string;
}

/** Upgrades are paid with energy: spend it now to move and fight, or invest it to earn more. */
export const UPGRADES: UpgradeDef[] = [
  { id: 'en', name: 'Energía por pregunta', ic: 'bolt', values: [1200, 1500, 1850, 2300, 2850, 3500], costs: [0, 2400, 5000, 9000, 15000, 24000], fmt: (v) => `+${v}`, desc: 'La energía que recargas con cada respuesta correcta.' },
  { id: 'streak', name: 'Bonus de racha', ic: 'flame', values: [0, 60, 120, 200, 300, 450], costs: [0, 2000, 4500, 8000, 13000, 20000], fmt: (v) => `+${v}/racha`, desc: 'Energía extra por cada acierto seguido (hasta 10).' },
  { id: 'box', name: 'Diamantes por caja', ic: 'gem', values: [1, 1.25, 1.5, 2, 2.5, 3], costs: [0, 3000, 6500, 11000, 18000, 28000], fmt: (v) => `×${v}`, desc: 'Multiplica los diamantes que sacas de cada caja sorpresa.' },
  { id: 'eff', name: 'Ahorro de energía', ic: 'battery', values: [1, 0.85, 0.7, 0.55, 0.4], costs: [0, 2500, 5500, 10000, 17000], fmt: (v) => `${Math.round(v * 100)} %`, desc: 'Cada paso y cada disparo gasta menos energía.' },
  { id: 'ins', name: 'Seguro', ic: 'vault', values: [0, 20, 40, 60, 75], costs: [0, 2000, 4500, 8500, 14000], fmt: (v) => `${v} %`, desc: 'Parte de tus diamantes que NO pierdes si te noquean.' },
  { id: 'hp', name: 'Vida máxima', ic: 'heart', values: [100, 120, 140, 160, 180], costs: [0, 1800, 4000, 7500, 12500], fmt: (v) => `${v}`, desc: 'Más vida para aguantar los combates.' },
];
export type UpKey = UpgradeDef['id'];
export type Ups = Record<UpKey, number>;
export const UP_KEYS: UpKey[] = UPGRADES.map((u) => u.id);
export const freshUps = (): Ups => ({ en: 0, streak: 0, box: 0, eff: 0, ins: 0, hp: 0 });
export const upValue = (k: UpKey, lvl: number) => {
  const u = UPGRADES.find((x) => x.id === k)!;
  return u.values[Math.min(lvl, u.values.length - 1)];
};
export const upsToArr = (u: Ups) => UP_KEYS.map((k) => u[k]);
export const upsFromArr = (a: number[] | undefined): Ups => {
  const u = freshUps();
  UP_KEYS.forEach((k, i) => { u[k] = a?.[i] ?? 0; });
  return u;
};

/** Energy for a correct answer with these upgrades and streak (before this answer). */
export function answerGain(ups: Ups, streak: number, genius: boolean) {
  const base = upValue('en', ups.en) + upValue('streak', ups.streak) * Math.min(streak, 10);
  return Math.round(base * (genius ? 2 : 1));
}

/** Multiplier on what steps and shots cost (the efficiency upgrade). */
export const energyMul = (ups: Ups) => upValue('eff', ups.eff);
