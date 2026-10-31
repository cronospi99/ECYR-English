/* Class Wars — game content: the 25 teacher powers, weapons, mystery-box effects and shop upgrades. */
import { TEACHERS } from '@/features/cards/teachers';
import type { IconKey } from './icons';
import type { Tx } from '../i18n';

export const CHAR_IDS = TEACHERS.map((t) => t.id);
export const charIndex = (id: string) => Math.max(0, CHAR_IDS.indexOf(id));
export const charAt = (i: number) => TEACHERS[i] ?? TEACHERS[0];

export interface PowerDef {
  id: string; // = character id
  name: Tx;
  ic: IconKey;
  desc: Tx;
  cd: number; // seconds
  color: string;
  /** Aimed powers use the aim direction / point. */
  aimed?: boolean;
}

const LAPTOP: Tx = ['Throw a laptop: a heavy hit (28 damage) that knocks the rival far away.', 'Lanzas una laptop: golpe fuerte (28 de daño) que empuja lejos al rival.'];
const P = (id: string, name: Tx, ic: IconKey, color: string, cd: number, desc: Tx, aimed = false): PowerDef => ({ id, name, ic, color, cd, desc, aimed });
export const POWERS: Record<string, PowerDef> = Object.fromEntries([
  P('camila', ['Radiant Smile', 'Sonrisa radiante'], 'smile', '#ff9f7a', 14, ['A wave of joy charms nearby rivals: they slow down and cannot attack for 2.5 s.', 'Una ola de alegría encanta a los rivales cercanos: van lentos y no pueden atacar 2,5 s.']),
  P('sofia', ['Fashion Flash', 'Flash fashion'], 'camera', '#c18cff', 13, ['A camera flash in a cone blinds whoever is in front of you for 3 s.', 'Un flash de cámara en cono ciega a quien tengas enfrente durante 3 s.'], true),
  P('gabriel', ['Royal Flush', 'Escalera real'], 'cards', '#3fa7d6', 9, ['Throw 3 poker cards in a fan that go through rivals (14 damage each).', 'Lanzas 3 cartas de póker en abanico que atraviesan a los rivales (14 de daño cada una).'], true),
  P('sander', ['Hello, my dears!', 'Hello, my dears!'], 'megaphone', '#4fb39a', 12, ['A greeting so loud it pushes and stuns the rivals in front of you for 1 s.', 'Un saludo tan potente que empuja y aturde 1 s a los rivales que tengas enfrente.'], true),
  P('nataly', ['Flying Laptop', 'Laptop voladora'], 'laptop', '#e98fc0', 10, LAPTOP, true),
  P('anyela', ['Book Storm', 'Lluvia de libros'], 'books', '#c9a227', 9, ['Throw 5 books in a fan that hit and push.', 'Lanzas 5 libros en abanico que golpean y empujan.'], true),
  P('julian', ['Laptop to the Rescue', 'Laptop al rescate'], 'laptop', '#8b5a2b', 10, LAPTOP, true),
  P('freddy', ['Turbo Whistle', 'Silbato turbo'], 'whistle', '#e23d4f', 12, ['Tweet! Push everyone nearby and sprint for 3.5 s.', '¡Pitazo! Empujas a los que están cerca y corres rapidísimo 3,5 s.']),
  P('andres', ['Guitar Smash', 'Guitarrazo'], 'guitar', '#3a5bc7', 11, ['A guitar swing in an arc: 26 damage, pushes and stuns for 1 s.', 'Un golpe de guitarra en arco: 26 de daño, empuja y aturde 1 s a quien alcance.'], true),
  P('angie', ['Brainstorm', 'Lluvia de ideas'], 'bulb', '#f5c518', 12, ['A lightning bulb strikes where you aim: 35 damage and a stun.', 'Una bombilla-rayo cae donde apuntas: 35 de daño y aturde.'], true),
  P('lina', ['All in Order', 'Todo en orden'], 'folder', '#2fb3a0', 15, ['Reload your weapon, gain +40 shield and shoot faster for 6 s.', 'Recargas tu arma, ganas +40 de escudo y disparas más rápido 6 s.']),
  P('valentina', ['Curl Catcher', 'Rizo atrapador'], 'curl', '#f5c518', 10, ['Throw one of your curls through rivals: 16 damage and they are slowed for 3 s.', 'Lanzas un rizo de tu cabello que atraviesa a los rivales: 16 de daño y quedan lentos 3 s.'], true),
  P('esteban', ['Hacker Attack', 'Ataque hacker'], 'hacker', '#30d158', 15, ['Hack nearby rivals: 12 damage and no shooting or powers for 3 s.', 'Hackeas a los rivales cercanos: 12 de daño y no pueden disparar ni usar poderes durante 3 s.']),
  P('sebastian', ['Raining Cats', 'Lluvia de gatos'], 'cat', '#f29a4a', 12, ['Throw 3 cats that chase the closest rival (12 damage each).', 'Lanzas 3 gatos que persiguen al rival más cercano (12 de daño cada uno).'], true),
  P('javier', ['Game Over', 'Control remoto'], 'gamepad', '#5b6670', 11, ['Throw your game controller: 18 damage and a 1.5 s stun.', 'Lanzas tu mando de juego: 18 de daño y aturde 1,5 s.'], true),
  P('anny', ['Choco Shot', 'Chocolatazo'], 'chocolate', '#ef8fc4', 10, ['Throw a chocolate bar (22 damage). If it hits, you heal 15 and run faster for 3 s.', 'Lanzas una barra de chocolate (22 de daño). Si acierta, recuperas 15 de vida y corres más 3 s.'], true),
  P('estephania', ['Rainbow Ball', 'Pelota arcoíris'], 'ball', '#8e5bd6', 10, ['A colourful ball that bounces off walls up to 4 times (18 damage per hit).', 'Una pelota de colores que rebota en las paredes hasta 4 veces (18 de daño por golpe).'], true),
  P('dager', ['Wise Shield', 'Escudo sabio'], 'shield', '#9fb4c4', 18, ['A bubble blocks all damage for 4 s and refills your shield.', 'Una burbuja te protege 4 s de todo el daño y recarga tu escudo.']),
  P('liliana', ['Open Mic', 'Micrófono abierto'], 'mic', '#b4441f', 11, ['Throw your microphone: on impact it releases a sound wave (24 damage and slow in an area).', 'Lanzas tu micrófono: al chocar suelta una onda de sonido (24 de daño y lentitud 2 s en área).'], true),
  P('norvey', ['Laser Pointer', 'Puntero láser'], 'laser', '#ff3b30', 10, ['A very long laser goes through everyone in line: 30 damage.', 'Un láser larguísimo atraviesa a todos los que estén en línea: 30 de daño.'], true),
  P('mafe', ['Shadow', 'Sombra'], 'moon', '#6b4a7a', 14, ['Dash through the shadows and stay invisible for 4 s (attacking reveals you).', 'Un dash entre sombras y 4 s invisible (atacar te revela).'], true),
  P('jhonathan', ['Oh là là!', '¡Oh là là!'], 'baguette', '#3a5bc7', 14, ['A French shout in a cone confuses rivals: reversed controls for 3 s.', 'Un grito francés en cono que confunde a los rivales: controles al revés 3 s.'], true),
  P('jalbleidy', ['Detention', 'Detención'], 'clipboard', '#7d2f16', 12, ['Throw your clipboard: whoever gets it cannot move for 2.5 s.', 'Lanzas tu portapapeles: quien lo reciba queda castigado sin moverse 2,5 s.'], true),
  P('juanpablo', ['Living Ink', 'Tinta viva'], 'ink', '#2b3a55', 14, ['His tattoos come alive: an ink puddle slows and hurts rivals for 5 s.', 'Sus tatuajes cobran vida: un charco de tinta frena y daña a los rivales 5 s.'], true),
  P('vanessa', ['Language Switch', 'Cambio de idioma'], 'swap', '#e23d4f', 15, ['Swap places with the closest rival (up to 420 px) and leave them confused.', 'Cambias de lugar con el rival más cercano (hasta 420 px) y lo dejas confundido.']),
].map((p) => [p.id, p]));

export const powerOf = (charId: string) => POWERS[charId] ?? POWERS.camila;

export type WeaponKind = 'proj' | 'melee' | 'explosive' | 'pierce' | 'spread' | 'grenade';
export interface WeaponDef {
  id: number;
  key: string;
  name: Tx;
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
  desc: Tx;
  /** Energy each use costs. */
  en: number;
  /** Seconds the weapon lasts (melee grants), 0 = until out of ammo. */
  lasts?: number;
}

export const INF = 255;
export const WEAPONS: WeaponDef[] = [
  { id: 0, key: 'chalk', name: ['Chalk', 'Tiza'], ic: 'chalk', kind: 'proj', dmg: 11, cd: 340, speed: 720, range: 520, ammo: INF, kb: 70, radius: 7, color: '#ffffff', en: 5, desc: ['Your basic weapon: unlimited chalk.', 'Tu arma básica: lanza tizas sin límite.'] },
  { id: 1, key: 'prickler', name: ['Hedgehog', 'Erizo'], ic: 'hedgehog', kind: 'melee', dmg: 26, cd: 520, speed: 0, range: 92, ammo: INF, kb: 560, radius: 0, color: '#4f8a2b', en: 6, desc: ['A close-range hit that pushes far so you can steal diamonds.', 'Golpea cuerpo a cuerpo y empuja lejos para robar diamantes.'], lasts: 60 },
  { id: 2, key: 'bubble', name: ['Bubbler', 'Burbujeador'], ic: 'bubble', kind: 'proj', dmg: 15, cd: 210, speed: 650, range: 560, ammo: 24, kb: 90, radius: 9, color: '#7fdcff', en: 4, desc: ['A burst of fast bubbles.', 'Ráfaga de burbujas rápidas.'] },
  { id: 3, key: 'eraser', name: ['Eraser Launcher', 'Lanzaborradores'], ic: 'eraser', kind: 'explosive', dmg: 30, cd: 760, speed: 560, range: 600, ammo: 6, kb: 400, radius: 78, color: '#ff7aa8', en: 12, desc: ['Erasers that explode in an area.', 'Borradores que explotan en área.'] },
  { id: 4, key: 'highlighter', name: ['Highlighter Beam', 'Rayo resaltador'], ic: 'highlighter', kind: 'pierce', dmg: 22, cd: 460, speed: 1100, range: 780, ammo: 10, kb: 130, radius: 8, color: '#d7ff3a', en: 9, desc: ['Goes through every rival in line.', 'Atraviesa a todos los rivales en línea.'] },
  { id: 5, key: 'clips', name: ['Clip Shooter', 'Clipadora'], ic: 'clip', kind: 'spread', dmg: 10, cd: 520, speed: 760, range: 430, ammo: 12, kb: 110, radius: 6, color: '#cfd8dc', en: 7, desc: ['Three paper clips in a fan per shot.', 'Tres clips en abanico de un disparo.'] },
  { id: 6, key: 'glitter', name: ['Glitter Bomb', 'Bomba de purpurina'], ic: 'glitter', kind: 'grenade', dmg: 34, cd: 820, speed: 0, range: 420, ammo: 4, kb: 430, radius: 96, color: '#ff5ce1', en: 14, desc: ['Throw it where you aim: it explodes in glitter!', 'Lánzala donde apuntas: ¡explota en purpurina!'] },
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

export type BoxEffect = 'costume' | 'gadget' | 'healer' | 'shield' | 'speed' | 'magnet' | 'power' | 'happy';
/** Item a box can give besides its diamond outcome (half of the boxes give one). */
export const BOX_EFFECTS: { id: BoxEffect; w: number; title: Tx; ic: IconKey; color: string }[] = [
  { id: 'gadget', w: 26, title: ['NEW GADGET', 'NUEVO ARTEFACTO'], ic: 'gift', color: '#ff9f0a' },
  { id: 'power', w: 18, title: ['BORROWED POWER', 'PODER PRESTADO'], ic: 'star', color: '#bf5af2' },
  { id: 'costume', w: 11, title: ['COSTUME CHANGE', 'CAMBIO DE DISFRAZ'], ic: 'mask', color: '#30d158' },
  { id: 'healer', w: 11, title: ['HEALER', 'SANADOR'], ic: 'heartPlus', color: '#ff375f' },
  { id: 'shield', w: 10, title: ['SHIELD', 'ESCUDO'], ic: 'shield', color: '#0a84ff' },
  { id: 'speed', w: 10, title: ['SPEED', 'VELOCIDAD'], ic: 'sneaker', color: '#64d2ff' },
  { id: 'magnet', w: 8, title: ['MAGNET', 'IMÁN'], ic: 'magnet', color: '#ff453a' },
  { id: 'happy', w: 6, title: ['HAPPY HOUR', 'HORA FELIZ'], ic: 'happy', color: '#ffd60a' },
];

/** What a box does to your diamonds: add a flat amount, multiply them or cut them. */
export interface DiaOutcome { kind: 'add' | 'mul' | 'cut'; v: number; w: number }
export const DIA_OUTCOMES: DiaOutcome[] = [
  { kind: 'add', v: 5, w: 22 }, { kind: 'add', v: 10, w: 22 }, { kind: 'add', v: 50, w: 12 }, { kind: 'add', v: 100, w: 6 },
  { kind: 'add', v: 500, w: 1.6 }, { kind: 'add', v: 1000, w: 0.6 },
  { kind: 'mul', v: 1.5, w: 6 }, { kind: 'mul', v: 2, w: 3.5 }, { kind: 'mul', v: 3, w: 1.4 }, { kind: 'mul', v: 5, w: 0.5 },
  { kind: 'cut', v: 25, w: 6 }, { kind: 'cut', v: 50, w: 3 }, { kind: 'cut', v: 75, w: 1.2 }, { kind: 'cut', v: 90, w: 0.5 },
];
export const outcomeLabel = (o: DiaOutcome) => (o.kind === 'add' ? `+${o.v}` : o.kind === 'mul' ? `×${o.v}` : `−${o.v}%`);
export const outcomeColor = (o: DiaOutcome) => (o.kind === 'cut' ? '#ff5b5b' : o.kind === 'mul' || o.v >= 500 ? '#ffd23f' : '#7ef0ff');

export interface UpgradeDef {
  id: 'en' | 'streak' | 'box' | 'eff' | 'ins' | 'hp';
  name: Tx;
  ic: IconKey;
  values: number[];
  costs: number[]; // costs[i] = energy to reach level i (costs[0] unused)
  fmt: (v: number) => string;
  desc: Tx;
}

/** Upgrades are paid with energy: spend it now to move and fight, or invest it to earn more. */
export const UPGRADES: UpgradeDef[] = [
  { id: 'en', name: ['Energy per Answer', 'Energía por pregunta'], ic: 'bolt', values: [1200, 1500, 1850, 2300, 2850, 3500], costs: [0, 2400, 5000, 9000, 15000, 24000], fmt: (v) => `+${v}`, desc: ['The energy each correct answer gives you.', 'La energía que recargas con cada respuesta correcta.'] },
  { id: 'streak', name: ['Streak Bonus', 'Bonus de racha'], ic: 'flame', values: [0, 60, 120, 200, 300, 450], costs: [0, 2000, 4500, 8000, 13000, 20000], fmt: (v) => `+${v}/streak`, desc: ['Extra energy for every correct answer in a row (up to 10).', 'Energía extra por cada acierto seguido (hasta 10).'] },
  { id: 'box', name: ['Box Diamonds', 'Diamantes por caja'], ic: 'gem', values: [1, 1.25, 1.5, 2, 2.5, 3], costs: [0, 3000, 6500, 11000, 18000, 28000], fmt: (v) => `×${v}`, desc: ['Multiplies the diamonds you add from mystery boxes.', 'Multiplica los diamantes que sumas con cada caja sorpresa.'] },
  { id: 'eff', name: ['Energy Saver', 'Ahorro de energía'], ic: 'battery', values: [1, 0.85, 0.7, 0.55, 0.4], costs: [0, 2500, 5500, 10000, 17000], fmt: (v) => `${Math.round(v * 100)} %`, desc: ['Every step and every shot costs less energy.', 'Cada paso y cada disparo gasta menos energía.'] },
  { id: 'ins', name: ['Insurance', 'Seguro'], ic: 'vault', values: [0, 20, 40, 60, 75], costs: [0, 2000, 4500, 8500, 14000], fmt: (v) => `${v} %`, desc: ['Share of your diamonds you keep when knocked out (and on box cuts).', 'Parte de tus diamantes que NO pierdes si te noquean (ni en los recortes de las cajas).'] },
  { id: 'hp', name: ['Max Health', 'Vida máxima'], ic: 'heart', values: [100, 120, 140, 160, 180], costs: [0, 1800, 4000, 7500, 12500], fmt: (v) => `${v}`, desc: ['More health to survive fights.', 'Más vida para aguantar los combates.'] },
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
