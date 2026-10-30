/* Class Wars — game content: the 25 teacher powers, weapons, mystery-box effects and shop upgrades. */
import { TEACHERS } from '@/features/cards/teachers';

export const CHAR_IDS = TEACHERS.map((t) => t.id);
export const charIndex = (id: string) => Math.max(0, CHAR_IDS.indexOf(id));
export const charAt = (i: number) => TEACHERS[i] ?? TEACHERS[0];

export interface PowerDef {
  id: string; // = character id
  name: string;
  icon: string;
  desc: string;
  cd: number; // seconds
  color: string;
  /** Aimed powers use the aim direction / point. */
  aimed?: boolean;
}

export const POWERS: Record<string, PowerDef> = {
  camila: { id: 'camila', name: 'Sonrisa radiante', icon: '😊', color: '#ff9f7a', cd: 14, desc: 'Una ola de alegría encanta a los rivales cercanos: van lentos y no pueden atacar 2,5 s.' },
  sofia: { id: 'sofia', name: 'Flash fashion', icon: '📸', color: '#c18cff', cd: 13, aimed: true, desc: 'Un flash de cámara en cono ciega a quien tengas enfrente durante 3 s.' },
  gabriel: { id: 'gabriel', name: 'Buenas vibras', icon: '🎵', color: '#3fa7d6', cd: 16, desc: 'Zona musical 5 s: tú corres y te curas; los rivales que entren bailan lentos.' },
  sander: { id: 'sander', name: 'Una vez más', icon: '⏪', color: '#4fb39a', cd: 15, desc: 'Vuelves al lugar donde estabas hace 3 s, con la vida que tenías entonces.' },
  nataly: { id: 'nataly', name: 'Mirada afilada', icon: '🔍', color: '#e98fc0', cd: 14, desc: 'Marca a los rivales cercanos 6 s: reciben +30 % de daño y no se pueden esconder.' },
  anyela: { id: 'anyela', name: 'Lluvia de libros', icon: '📚', color: '#c9a227', cd: 9, aimed: true, desc: 'Lanzas 5 libros en abanico que golpean y empujan.' },
  julian: { id: 'julian', name: 'Café reconfortante', icon: '☕', color: '#8b5a2b', cd: 18, desc: 'Recuperas 40 de vida al instante y 5 por segundo durante 5 s.' },
  freddy: { id: 'freddy', name: 'Silbato turbo', icon: '📣', color: '#e23d4f', cd: 12, desc: '¡Pitazo! Empujas a los que están cerca y corres rapidísimo 3,5 s.' },
  andres: { id: 'andres', name: 'Abrazo de oso', icon: '🐻', color: '#3a5bc7', cd: 12, aimed: true, desc: 'Embistes hacia adelante: al primero que atrapes lo aturdes y le haces 22 de daño.' },
  angie: { id: 'angie', name: 'Lluvia de ideas', icon: '💡', color: '#f5c518', cd: 12, aimed: true, desc: 'Una bombilla-rayo cae donde apuntas: 35 de daño y aturde.' },
  lina: { id: 'lina', name: 'Todo en orden', icon: '🗂️', color: '#2fb3a0', cd: 15, desc: 'Recargas tu arma, ganas +40 de escudo y disparas más rápido 6 s.' },
  valentina: { id: 'valentina', name: 'Gran salto', icon: '🦒', color: '#f5c518', cd: 13, aimed: true, desc: 'Saltas por encima de todo hasta donde apuntas y aplastas al aterrizar.' },
  esteban: { id: 'esteban', name: 'Debate ganado', icon: '🗣️', color: '#8fa3b0', cd: 14, desc: 'Durante 3 s devuelves los proyectiles a quien te los lanzó.' },
  sebastian: { id: 'sebastian', name: 'Doble misterioso', icon: '🕵️', color: '#5b6670', cd: 16, aimed: true, desc: 'Te vuelves invisible 3,5 s y dejas un clon que sigue caminando… ¿quién es quién?' },
  javier: { id: 'javier', name: 'Momento zen', icon: '🧘', color: '#3a5bc7', cd: 18, desc: '2,5 s intocable (no te mueves ni atacas) y recuperas 30 de vida.' },
  anny: { id: 'anny', name: 'Pequeña pero poderosa', icon: '🐜', color: '#ef8fc4', cd: 16, desc: 'Te encoges 6 s: más rápida, más difícil de golpear y +35 % de daño.' },
  estephania: { id: 'estephania', name: 'Mente brillante', icon: '🧠', color: '#7bbf5a', cd: 45, desc: 'Durante 25 s tus respuestas correctas te dan el doble de energía.' },
  dager: { id: 'dager', name: 'Escudo sabio', icon: '🛡️', color: '#9fb4c4', cd: 18, desc: 'Una burbuja te protege 4 s de todo el daño y recarga tu escudo.' },
  liliana: { id: 'liliana', name: 'Espresso doble', icon: '⚡', color: '#b4441f', cd: 14, desc: '+30 % de velocidad y disparo rápido 5 s, y recuperas 15 de vida.' },
  norvey: { id: 'norvey', name: 'Puntero láser', icon: '🔴', color: '#ff3b30', cd: 10, aimed: true, desc: 'Un láser larguísimo atraviesa a todos los que estén en línea: 30 de daño.' },
  mafe: { id: 'mafe', name: 'Sombra', icon: '🌑', color: '#6b4a7a', cd: 14, aimed: true, desc: 'Un dash entre sombras y 4 s invisible (atacar te revela).' },
  jhonathan: { id: 'jhonathan', name: '¡Oh là là!', icon: '🥖', color: '#3a5bc7', cd: 14, aimed: true, desc: 'Un grito francés en cono que confunde a los rivales: controles al revés 3 s.' },
  jalbleidy: { id: 'jalbleidy', name: 'Detención', icon: '📋', color: '#7d2f16', cd: 12, aimed: true, desc: 'Lanzas tu portapapeles: quien lo reciba queda castigado sin moverse 2,5 s.' },
  juanpablo: { id: 'juanpablo', name: 'Tinta viva', icon: '🖋️', color: '#2b3a55', cd: 14, aimed: true, desc: 'Sus tatuajes cobran vida: un charco de tinta frena y daña a los rivales 5 s.' },
  vanessa: { id: 'vanessa', name: 'Cambio de idioma', icon: '🔄', color: '#e23d4f', cd: 15, desc: 'Cambias de lugar con el rival más cercano (hasta 420 px) y lo dejas confundido.' },
};

export const powerOf = (charId: string) => POWERS[charId] ?? POWERS.camila;

export type WeaponKind = 'proj' | 'melee' | 'explosive' | 'pierce' | 'spread' | 'grenade';
export interface WeaponDef {
  id: number;
  key: string;
  name: string;
  icon: string;
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
  { id: 0, key: 'chalk', name: 'Tiza', icon: '✏️', kind: 'proj', dmg: 11, cd: 340, speed: 720, range: 520, ammo: INF, kb: 70, radius: 7, color: '#ffffff', en: 5, desc: 'Tu arma básica: lanza tizas sin límite.' },
  { id: 1, key: 'prickler', name: 'Erizo', icon: '🦔', kind: 'melee', dmg: 26, cd: 520, speed: 0, range: 92, ammo: INF, kb: 560, radius: 0, color: '#4f8a2b', en: 6, desc: 'Golpea cuerpo a cuerpo y empuja lejos para robar diamantes.', lasts: 60 },
  { id: 2, key: 'bubble', name: 'Burbujeador', icon: '🫧', kind: 'proj', dmg: 15, cd: 210, speed: 650, range: 560, ammo: 24, kb: 90, radius: 9, color: '#7fdcff', en: 4, desc: 'Ráfaga de burbujas rápidas.' },
  { id: 3, key: 'eraser', name: 'Lanzaborradores', icon: '🧽', kind: 'explosive', dmg: 30, cd: 760, speed: 560, range: 600, ammo: 6, kb: 400, radius: 78, color: '#ff7aa8', en: 12, desc: 'Borradores que explotan en área.' },
  { id: 4, key: 'highlighter', name: 'Rayo resaltador', icon: '🖍️', kind: 'pierce', dmg: 22, cd: 460, speed: 1100, range: 780, ammo: 10, kb: 130, radius: 8, color: '#d7ff3a', en: 9, desc: 'Atraviesa a todos los rivales en línea.' },
  { id: 5, key: 'clips', name: 'Clipadora', icon: '📎', kind: 'spread', dmg: 10, cd: 520, speed: 760, range: 430, ammo: 12, kb: 110, radius: 6, color: '#cfd8dc', en: 7, desc: 'Tres clips en abanico de un disparo.' },
  { id: 6, key: 'glitter', name: 'Bomba de purpurina', icon: '✨', kind: 'grenade', dmg: 34, cd: 820, speed: 0, range: 420, ammo: 4, kb: 430, radius: 96, color: '#ff5ce1', en: 14, desc: 'Lánzala donde apuntas: ¡explota en purpurina!' },
];

/** Projectile kinds besides weapons (powers). Index space shared with weapon ids. */
export const PJ = { book: 20, clipboard: 21, chalk: 0 } as const;

export type BoxEffect = 'costume' | 'gadget' | 'healer' | 'shield' | 'speed' | 'magnet' | 'trap' | 'power' | 'jackpot' | 'happy';
export const BOX_EFFECTS: { id: BoxEffect; w: number; title: string; icon: string; color: string }[] = [
  { id: 'gadget', w: 22, title: 'NUEVO ARTEFACTO', icon: '🎁', color: '#ff9f0a' },
  { id: 'power', w: 16, title: 'PODER PRESTADO', icon: '🌟', color: '#bf5af2' },
  { id: 'costume', w: 10, title: 'CAMBIO DE DISFRAZ', icon: '🎭', color: '#30d158' },
  { id: 'healer', w: 10, title: 'SANADOR', icon: '❤️', color: '#ff375f' },
  { id: 'shield', w: 9, title: 'ESCUDO', icon: '🛡️', color: '#0a84ff' },
  { id: 'speed', w: 9, title: 'VELOCIDAD', icon: '👟', color: '#64d2ff' },
  { id: 'magnet', w: 7, title: 'IMÁN', icon: '🧲', color: '#ff453a' },
  { id: 'jackpot', w: 7, title: 'TESORO', icon: '💰', color: '#ffd60a' },
  { id: 'happy', w: 5, title: 'HORA FELIZ', icon: '⚡', color: '#ffd60a' },
  { id: 'trap', w: 7, title: '¡TRAMPA!', icon: '💥', color: '#ff453a' },
];

export interface UpgradeDef {
  id: 'en' | 'streak' | 'box' | 'eff' | 'ins' | 'hp';
  name: string;
  icon: string;
  values: number[];
  costs: number[]; // costs[i] = energy to reach level i (costs[0] unused)
  fmt: (v: number) => string;
  desc: string;
}

/** Upgrades are paid with energy: spend it now to move and fight, or invest it to earn more. */
export const UPGRADES: UpgradeDef[] = [
  { id: 'en', name: 'Energía por pregunta', icon: '⚡', values: [150, 200, 270, 360, 480, 640], costs: [0, 300, 700, 1400, 2600, 4500], fmt: (v) => `+${v}`, desc: 'La energía que recargas con cada respuesta correcta.' },
  { id: 'streak', name: 'Bonus de racha', icon: '🔥', values: [0, 10, 20, 35, 55, 80], costs: [0, 250, 600, 1200, 2400, 4000], fmt: (v) => `+${v}/racha`, desc: 'Energía extra por cada acierto seguido (hasta 10).' },
  { id: 'box', name: 'Diamantes por caja', icon: '💎', values: [1, 1.25, 1.5, 2, 2.5, 3], costs: [0, 400, 900, 1800, 3200, 5200], fmt: (v) => `×${v}`, desc: 'Multiplica los diamantes que sacas de cada caja sorpresa.' },
  { id: 'eff', name: 'Ahorro de energía', icon: '🔋', values: [1, 0.85, 0.7, 0.55, 0.4], costs: [0, 350, 800, 1600, 3000], fmt: (v) => `${Math.round(v * 100)} %`, desc: 'Cada paso y cada disparo gasta menos energía.' },
  { id: 'ins', name: 'Seguro', icon: '🏦', values: [0, 20, 40, 60, 75], costs: [0, 300, 700, 1400, 2600], fmt: (v) => `${v} %`, desc: 'Parte de tus diamantes que NO pierdes si te noquean.' },
  { id: 'hp', name: 'Vida máxima', icon: '❤️', values: [100, 120, 140, 160, 180], costs: [0, 250, 600, 1300, 2400], fmt: (v) => `${v}`, desc: 'Más vida para aguantar los combates.' },
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
