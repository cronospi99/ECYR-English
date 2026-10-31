/* Class Wars — shared numbers for the host simulation, the clients and the renderer. */

export const WORLD_W = 3200;
export const WORLD_H = 2400;

/** Host simulation rate (fixed step) and snapshot cadence. */
export const TICK_HZ = 30;
export const TICK_MS = 1000 / TICK_HZ;
export const SNAP_EVERY = 3; // 30 / 3 = 10 snapshots per second
/** Others are drawn this far in the past, between two snapshots. */
export const INTERP_MS = 110;
/** Players send input at most this often, and only while it changes. */
export const INPUT_MS = 80;

export const PLAYER_R = 20;
export const BASE_SPEED = 235; // px / s
export const MAX_HP = 100;
export const MAX_SHIELD = 100;
export const SHIELD_REGEN_DELAY = 5000;
export const SHIELD_REGEN = 12; // per second
export const RESPAWN_MS = 3500;
export const SPAWN_INVULN_MS = 2500;
/** Damage taken or dealt within this window keeps you vulnerable while answering. */
export const COMBAT_LOCK_MS = 3000;
export const KO_LOSS = 0.3; // share of diamonds dropped on a KO (before insurance)
export const HEAL_ON_CORRECT = 5;
export const BURROW_COOLDOWN = 3500;

export const CHAR_SCALE = 0.56; // TeacherToon units → world px

/* Energy: everyone starts with it, every step and every shot spends it, and only correct answers
   refill it. At 0 you cannot move, shoot or use powers until you answer. */
export const START_ENERGY = 1200; // default; the teacher picks it per match (ENERGY_RANGE)
export const ENERGY_RANGE = { min: 200, max: 6000, step: 100 } as const;
/** Energy per pixel walked (≈ 17 per second at base speed). */
export const STEP_COST = 1 / 14;
/** A touched mystery box stays grey this long, then it can be opened again. */
export const BOX_COOLDOWN_MS = 10000;

/** Portals (teleport + spawn) grow with the number of people in the match. */
export const portalCount = (players: number) => clamp(7 + Math.ceil(Math.max(0, players - 6) / 3), 7, 17);
/** Fixed mystery boxes on the map, more for bigger classes. */
export const boxCount = (players: number) => clamp(Math.round(26 + players * 1.5), 26, 72);

export type Fx =
  | 'speed' | 'slow' | 'root' | 'stun' | 'confuse' | 'blind' | 'charm'
  | 'invis' | 'invuln' | 'barrier' | 'regen' | 'genius' | 'magnet' | 'rapid' | 'hacked';

/** Bit per status flag in snapshots. */
export const FLAG = {
  alive: 1 << 0,
  invuln: 1 << 1,
  quiz: 1 << 2,
  invis: 1 << 3,
  stun: 1 << 4,
  root: 1 << 5,
  confuse: 1 << 6,
  slow: 1 << 7,
  speed: 1 << 8,
  barrier: 1 << 9,
  regen: 1 << 12,
  charm: 1 << 14,
  blind: 1 << 15,
  genius: 1 << 17,
  magnet: 1 << 18,
  rapid: 1 << 19,
  bot: 1 << 22,
  away: 1 << 23,
  combat: 1 << 24,
  overshield: 1 << 25,
  tired: 1 << 26,
  hacked: 1 << 27,
} as const;

export const FX_FLAG: Partial<Record<Fx, number>> = {
  speed: FLAG.speed, slow: FLAG.slow, root: FLAG.root, stun: FLAG.stun, confuse: FLAG.confuse, blind: FLAG.blind, charm: FLAG.charm,
  invis: FLAG.invis, invuln: FLAG.invuln, barrier: FLAG.barrier, regen: FLAG.regen, genius: FLAG.genius, magnet: FLAG.magnet,
  rapid: FLAG.rapid, hacked: FLAG.hacked,
};

/** Speed multiplier from status flags (client prediction uses the same rule as the host). */
export function speedFromFlags(f: number): number {
  if (f & (FLAG.stun | FLAG.root | FLAG.tired)) return 0;
  let m = 1;
  if (f & FLAG.speed) m *= 1.55;
  if (f & FLAG.slow) m *= 0.55;
  if (f & FLAG.charm) m *= 0.5;
  return m;
}

export const clamp = (v: number, a: number, b: number) => (v < a ? a : v > b ? b : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export function lerpAngle(a: number, b: number, t: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * t;
}
export const aimToByte = (a: number) => Math.round(((a % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2) / (Math.PI * 2) * 255) & 255;
export const byteToAim = (b: number) => (b / 255) * Math.PI * 2;

/** Small deterministic PRNG (map generation must match on every device). */
export function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
