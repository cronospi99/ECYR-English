/* English Racers — the karts: six bodies with four attributes (1–10) and the upgrades bought in the
   garage. Every kart has about the same budget (base sum 24 ± 1), so picking one is a trade-off:
     accel   — pull off the line and out of corners (and a little more brake).
     speed   — top speed (−10 % at 1 … +10 % at 10) and boost speed.
     grip    — high: clean, tight corners; low: longer, looser drifts and an easier mini-turbo.
     control — steering response and turning, stability at speed, quick recovery after hits and
               walls, and less speed lost on the grass.
   A kart with every attribute at 6 gives exactly `KART` (the reference physics the bots, gates and
   Grand Prix were tuned on). All the tuning ranges are in `RANGE` below. */
import { KART, type KartParams } from './kart';

export type KartId = 'balanced' | 'speedster' | 'drifter' | 'tank' | 'rocket' | 'offroad';
/** Body shape the 3D model draws (one per kart, same ids). */
export type KartBody = KartId;
export type Attr = 'accel' | 'speed' | 'grip' | 'control';
export const ATTRS: readonly Attr[] = ['accel', 'speed', 'grip', 'control'];
export type KartStats = Record<Attr, number>;

export interface KartDef {
  id: KartId;
  /** Short English name (shown as is). */
  name: string;
  /** One line for the selector. */
  blurb: { en: string; es: string };
  /** Body for KartView. */
  style: KartBody;
  /** Price in garage coins (0 = owned from the start). */
  price: number;
  /** Base attributes, 1–10. */
  stats: KartStats;
  /** Off-road tyres: top speed on grass multiplied by this (on top of what `control` gives). */
  grass?: number;
}

const K = (id: KartId, name: string, price: number, accel: number, speed: number, grip: number, control: number, en: string, es: string, extra: Partial<KartDef> = {}): KartDef =>
  ({ id, name, style: id, price, stats: { accel, speed, grip, control }, blurb: { en, es }, ...extra });

/** The six karts, in shop order (cheapest first). Base sums: 24 each. */
export const KARTS: readonly KartDef[] = [
  K('balanced', 'Classic', 0, 6, 6, 6, 6, 'Good at everything.', 'Bueno en todo.'),
  K('offroad', 'Ranger', 150, 6, 5, 6, 7, 'Big tyres: keeps its speed on the grass.', 'Ruedas grandes: no frena en la hierba.', { grass: 1.3 }),
  K('drifter', 'Slider', 250, 7, 6, 3, 8, 'Long drifts and easy mini-turbos.', 'Derrapes largos y mini-turbos fáciles.'),
  K('tank', 'Bulldog', 350, 3, 7, 7, 7, 'Slow to start, hard to stop.', 'Lento al salir, difícil de parar.'),
  K('speedster', 'Bolt', 450, 5, 9, 5, 5, 'The fastest on the straights.', 'El más rápido en las rectas.'),
  K('rocket', 'Rocket', 600, 10, 6, 4, 4, 'Explosive starts, twitchy steering.', 'Salidas explosivas, dirección nerviosa.'),
];
const BY_ID = new Map(KARTS.map((k) => [k.id, k]));
export const isKartId = (v: unknown): v is KartId => typeof v === 'string' && BY_ID.has(v as KartId);
/** The kart with this id (unknown ids, e.g. from an old client, give the Classic). */
export const kartDef = (id: unknown): KartDef => BY_ID.get(id as KartId) ?? KARTS[0];

/* ------------------------------------------------------------ upgrades */
/** Levels per attribute, what each level adds (capped at ATTR_MAX) and what each level costs. */
export const UPGRADE_LEVELS = 5;
export const UPGRADE_STEP = 0.4;
export const UPGRADE_COSTS: readonly number[] = [40, 70, 110, 160, 220];
export const ATTR_MIN = 1, ATTR_MAX = 10;
export type KartLevels = Record<Attr, number>;
export const NO_LEVELS: Readonly<KartLevels> = { accel: 0, speed: 0, grip: 0, control: 0 };

/** Base attributes plus the upgrade levels (each attribute 1..10). */
export function statsWith(def: KartDef, levels: Partial<KartLevels> = NO_LEVELS): KartStats {
  const out = { ...def.stats };
  for (const a of ATTRS) {
    const n = Math.max(0, Math.min(UPGRADE_LEVELS, Math.floor(levels[a] ?? 0)));
    out[a] = Math.max(ATTR_MIN, Math.min(ATTR_MAX, Math.round((def.stats[a] + n * UPGRADE_STEP) * 10) / 10));
  }
  return out;
}

/* ------------------------------------------------------------ physics */
/** How far each parameter moves from `KART` between an attribute of 1 (−1) and 10 (+1). Fractions
    of the reference value; negative = the parameter goes down as the attribute goes up. */
export const RANGE = {
  speed: { maxSpeed: 0.1, boostSpeed: 0.08 },
  accel: { accel: 0.4, brake: 0.1 },
  grip: { grip: 0.15, driftGrip: 0.25, driftTurn: 0.08, tiers: 0.25 },
  control: { turn: 0.1, turnFade: -0.25, steerIn: 0.3, steerOut: 0.2, grassMax: 0.08, grassGrip: 0.15, spinMul: -0.15, wallLoss: -0.25 },
} as const;

/** Attribute → −1..+1 around the reference 6 (1 → −1, 6 → 0, 10 → +1; linear on each side). */
export const attrUnit = (x: number) => {
  const v = Math.max(ATTR_MIN, Math.min(ATTR_MAX, x));
  return v < 6 ? (v - 6) / 5 : (v - 6) / 4;
};

/** Physics parameters for these attributes. All at 6 (and no off-road tyres) = exactly `KART`. */
export function statsToParams(stats: KartStats, def?: Pick<KartDef, 'grass'>): KartParams {
  const a = attrUnit(stats.accel), s = attrUnit(stats.speed), g = attrUnit(stats.grip), c = attrUnit(stats.control);
  const R = RANGE;
  const m = (u: number, r: number) => 1 + u * r;
  const tm = m(g, R.grip.tiers);
  return {
    ...KART,
    maxSpeed: KART.maxSpeed * m(s, R.speed.maxSpeed),
    boostSpeed: KART.boostSpeed * m(s, R.speed.boostSpeed),
    accel: KART.accel * m(a, R.accel.accel),
    brake: KART.brake * m(a, R.accel.brake),
    grip: KART.grip * m(g, R.grip.grip),
    driftGrip: KART.driftGrip * m(g, R.grip.driftGrip),
    driftTurn: KART.driftTurn * m(g, R.grip.driftTurn),
    tiers: [KART.tiers[0] * tm, KART.tiers[1] * tm, KART.tiers[2] * tm],
    turn: KART.turn * m(c, R.control.turn),
    turnFade: KART.turnFade * m(c, R.control.turnFade),
    steerIn: KART.steerIn * m(c, R.control.steerIn),
    steerOut: KART.steerOut * m(c, R.control.steerOut),
    grassMax: KART.grassMax * m(c, R.control.grassMax) * (def?.grass ?? 1),
    grassGrip: KART.grassGrip * m(c, R.control.grassGrip),
    spinMul: KART.spinMul * m(c, R.control.spinMul),
    wallLoss: KART.wallLoss * m(c, R.control.wallLoss),
  };
}

/** Physics of a kart: base attributes plus these upgrade levels (none for bots and live races). */
export const kartParams = (id: KartId, levels?: Partial<KartLevels>) => { const d = kartDef(id); return statsToParams(statsWith(d, levels), d); };

/** A bot's kart for a race: a shuffle of the six fixed by the race seed, dealt by grid slot (so a
    field of up to six bots never repeats a kart). Same seed and slot = same kart. */
export function botKart(seed: number, slot: number): KartId {
  let h = (Math.imul(seed | 0, 0x9e3779b1) ^ 0x5bd1e995) >>> 0;
  const rnd = () => { h = (h + 0x6d2b79f5) >>> 0; let t = Math.imul(h ^ (h >>> 15), 1 | h); t ^= t + Math.imul(t ^ (t >>> 7), 61 | t); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  const order = KARTS.map((k) => k.id);
  for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
  return order[((slot % order.length) + order.length) % order.length];
}
