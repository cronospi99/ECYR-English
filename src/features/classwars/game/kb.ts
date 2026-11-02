/* Class Wars — side-view physics (Knockback and Color Clash). The same step runs in the host (bots) and on each
   phone (its own character's prediction), so movement feels instant and matches the host. */
import { GRAVITY, JUMP_V, KB_HH, KB_HW, KB_OUT, KB_SPEED } from './constants';
import type { GameMap, Plat } from './map';

export interface Body {
  x: number; y: number; vx: number; vy: number;
  ground: boolean;
  /** Air jumps left (refilled to airMax on landing). */
  air: number;
  airMax: number;
  /** Time left to still jump after walking off a ledge. */
  coyote: number;
  /** Ignore thin ledges until this (dropping through with "down"). */
  dropT: number;
  /** Time since start, for dropT. */
  t: number;
}

export const newBody = (x: number, y: number): Body => ({ x, y, vx: 0, vy: 0, ground: false, air: 1, airMax: 1, coyote: 0, dropT: 0, t: 0 });

const ACC_GROUND = 3600, ACC_AIR = 2000, MAX_FALL = 1500;

/**
 * One step. ix: −1..1 walk, jump: a jump was pressed this step, down: drop through a ledge.
 * mul: speed multiplier from status (0 = cannot walk or jump, e.g. out of energy or stunned).
 */
export function kbStep(map: GameMap, b: Body, ix: number, jump: boolean, down: boolean, mul: number, dt: number) {
  b.t += dt;
  // stuck inside a solid block (a teleport or swap put us there): pop out on top of it
  for (const p of map.plats) if (!p.thin && overlapsX(p, b.x) && b.y > p.y + 1 && b.y - KB_HH < p.y + p.h) { b.y = p.y; b.vy = Math.min(0, b.vy); }
  const target = ix * KB_SPEED * mul;
  if (Math.abs(b.vx) <= KB_SPEED * 1.08 || Math.sign(target) === -Math.sign(b.vx)) {
    // in control: accelerate toward the stick
    const acc = (b.ground ? ACC_GROUND : ACC_AIR) * dt;
    b.vx += Math.max(-acc, Math.min(acc, target - b.vx));
  } else {
    // flying from a hit: air drag, strong friction on the ground
    b.vx *= Math.exp(-dt * (b.ground ? 7 : 0.9));
  }
  if (down && b.ground && mul > 0) b.dropT = b.t + 0.28;
  if (jump && mul > 0) {
    if (b.ground || b.coyote > 0) { b.vy = -JUMP_V; b.coyote = 0; b.ground = false; }
    else if (b.air > 0) { b.vy = -JUMP_V * 0.92; b.air--; }
  }
  b.vy = Math.min(MAX_FALL, b.vy + GRAVITY * dt);

  // move x, then y (axis-separated AABB)
  const nx = b.x + b.vx * dt;
  b.x = sweepX(map.plats, b.x, nx, b.y);
  if (b.x !== nx) b.vx = 0;
  const wasGround = b.ground;
  const ny = b.y + b.vy * dt;
  const [ry, landed, bonk] = sweepY(map.plats, b.x, b.y, ny, b.vy, b.t < b.dropT);
  b.y = ry;
  if (landed) { b.vy = 0; b.ground = true; b.air = b.airMax; b.coyote = 0.1; }
  else {
    if (bonk) b.vy = Math.max(0, b.vy);
    b.ground = false;
    b.coyote = wasGround ? 0.1 : Math.max(0, b.coyote - dt);
  }
}

function overlapsX(p: Plat, x: number) { return x + KB_HW > p.x && x - KB_HW < p.x + p.w; }

function sweepX(plats: Plat[], x0: number, x1: number, y: number): number {
  let x = x1;
  for (const p of plats) {
    if (p.thin) continue;
    if (y <= p.y + 1 || y - KB_HH >= p.y + p.h) continue; // not at the same height
    if (x1 > x0 && x0 + KB_HW <= p.x + 0.5 && x + KB_HW > p.x) x = p.x - KB_HW;
    else if (x1 < x0 && x0 - KB_HW >= p.x + p.w - 0.5 && x - KB_HW < p.x + p.w) x = p.x + p.w + KB_HW;
  }
  return x;
}

/** Returns [y, landed, hit a ceiling]. */
function sweepY(plats: Plat[], x: number, y0: number, y1: number, vy: number, dropping: boolean): [number, boolean, boolean] {
  let y = y1, landed = false, bonk = false;
  for (const p of plats) {
    if (!overlapsX(p, x)) continue;
    if (vy >= 0) {
      // feet crossing the top surface
      if (y0 <= p.y + 0.5 && y >= p.y) {
        if (p.thin && dropping) continue;
        y = p.y; landed = true;
      }
    } else if (!p.thin) {
      // head crossing a solid block's bottom
      const head0 = y0 - KB_HH, head1 = y - KB_HH, bottom = p.y + p.h;
      if (head0 >= bottom - 0.5 && head1 < bottom) { y = bottom + KB_HH; bonk = true; }
    }
  }
  return [y, landed, bonk];
}

/** Standing on something right now (used to check a reported position). */
export function onGround(map: GameMap, x: number, y: number) {
  return map.plats.some((p) => overlapsX(p, x) && Math.abs(y - p.y) < 2);
}

export function outOfStage(map: GameMap, x: number, y: number) {
  return y > map.h + KB_OUT.bottom || y < -KB_OUT.top || x < -KB_OUT.x || x > map.w + KB_OUT.x;
}

/** The platform under (x, y) within `depth` px, if any (bots: is there floor ahead?). */
export function floorBelow(map: GameMap, x: number, y: number, depth: number): Plat | null {
  let best: Plat | null = null;
  for (const p of map.plats) if (x > p.x + 4 && x < p.x + p.w - 4 && p.y >= y - 2 && p.y - y < depth && (!best || p.y < best.y)) best = p;
  return best;
}
