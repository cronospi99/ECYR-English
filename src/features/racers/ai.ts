/* English Racers — the rivals' driving. Each bot follows a racing line (the inside of the corners,
   computed once per track) with its own lane bias, looks ahead to brake before corners it could not
   make, drifts through long corners for mini-turbos (longer drifts on harder levels), steers around
   ink, hazards and slower karts, heads for item boxes and boost pads, picks a lane at the question
   gates (right more often on harder levels), does tricks on ramps, uses its items with simple
   tactics and reverses out when it gets stuck. */
import * as THREE from 'three';
import { KART, type Kart, type KartInput } from './kart';
import { KERB, type Track } from './track';
import type { ItemKind } from './racer';

export type Difficulty = 'easy' | 'normal' | 'hard';
export interface Skill {
  /** Top speed against the player's (before the catch-up help). */
  speed: number;
  /** Chance of drifting a long corner, and how long it holds the drift (s). */
  drift: number; driftHold: number;
  /** Chance of picking the right answer at a question gate. */
  gate: number;
  /** Steering wobble and how wide it follows the racing line (0..1). */
  noise: number; line: number;
  /** Seconds before using an item. */
  itemDelay: number;
}
export const SKILL: Record<Difficulty, Skill> = {
  easy: { speed: 0.9, drift: 0.35, driftHold: 0.9, gate: 0.45, noise: 0.16, line: 0.55, itemDelay: 3.5 },
  normal: { speed: 0.975, drift: 0.7, driftHold: 1.7, gate: 0.65, noise: 0.08, line: 0.8, itemDelay: 2 },
  hard: { speed: 1.03, drift: 0.95, driftHold: 2.6, gate: 0.85, noise: 0.035, line: 1, itemDelay: 1 },
};

/** Per frame: the racing line (lateral offset) and the curvature smoothed over a few metres. */
export interface Line { d: Float32Array; curv: Float32Array }
export function racingLine(track: Track): Line {
  const F = track.frames, N = F.length;
  const curv = new Float32Array(N), raw = new Float32Array(N), d = new Float32Array(N);
  const avg = (src: ArrayLike<number>, i: number, W: number) => { let c = 0; for (let k = -W; k <= W; k++) c += src[(i + k + N) % N]; return c / (2 * W + 1); };
  const w4 = Math.max(1, Math.round(4 / track.ds)), w14 = Math.max(1, Math.round(14 / track.ds));
  for (let i = 0; i < N; i++) curv[i] = avg(F.map((f) => f.curv), i, w4);
  // inside of the corner (left turn = negative d), eased on and off
  for (let i = 0; i < N; i++) raw[i] = -THREE.MathUtils.clamp(avg(curv, i, w14) * 55, -1, 1) * Math.max(0, F[i].w - 1.7);
  for (let i = 0; i < N; i++) d[i] = avg(raw, i, w14);
  return { d, curv };
}

export interface Obstacle { s: number; d: number; r: number }
export interface BotCtx {
  t: number;
  /** Lane centres and the target lane index of the next gate ahead (null when none is near). */
  gate: { s: number; lanes: number[]; correct: number; id: number } | null;
  obstacles: Obstacle[];
  boxes: { s: number; d: number }[];
  pads: { s0: number; d: number }[];
  aheadGap: number;
  behindGap: number;
  place: number;
  item: ItemKind | null;
  itemN: number;
  racing: boolean;
}

export class Bot {
  private drifting = false;
  private driftT = 0;
  private driftDir = 0;
  private curveId = -1;
  private gateId = -1;
  private gateLane = 1;
  private reverseT = 0;
  private stuckT = 0;
  private trickDone = false;
  private wob = Math.random() * 100;
  private holdT = 0;
  private lastCoffee = 0;
  private lastItem: ItemKind | null = null;

  constructor(readonly skill: Skill, private bias: number, private track: Track, private line: Line) {}

  /** A ramp or a gap within [a, b] metres ahead. */
  private jumpNear(s: number, a: number, b: number) {
    const tr = this.track;
    for (const r of tr.ramps) { const x = tr.ahead(s, r.s0); if (x >= a && x <= b) return true; if (tr.ahead(r.s0, s) < r.s1 - r.s0 + 14) return true; }
    for (const g of tr.gaps) { const x = tr.ahead(s, g.s0); if (x >= a && x <= b) return true; }
    return false;
  }
  private curvAt(s: number) { const tr = this.track, N = tr.frames.length; return this.line.curv[((Math.floor(s / tr.ds) % N) + N) % N]; }

  drive(k: Kart, c: BotCtx): KartInput & { useItem: boolean } {
    const tr = this.track, sk = this.skill;
    const v = k.speed;
    const look = 8 + v * 0.42;
    const sA = k.s + look;
    const iA = ((Math.floor(sA / tr.ds) % tr.frames.length) + tr.frames.length) % tr.frames.length;
    const fA = tr.frames[iA];
    const lim = fA.w + KERB * 0.4 - 1.0;
    // where to be across the road
    let d = this.line.d[iA] * sk.line + this.bias * (fA.w - 1.6) * 0.55 * THREE.MathUtils.clamp(1 - Math.abs(this.line.curv[iA]) * 45, 0.15, 1);
    this.wob += 0.016;
    d += Math.sin(this.wob * 0.9) * Math.cos(this.wob * 0.37) * sk.noise * 6;
    // boost pads and item boxes nearby pull the bot over
    for (const p of c.pads) { const a = tr.ahead(k.s, p.s0); if (a > 4 && a < 28 && Math.abs(p.d - d) < 3.2) { d = p.d; break; } }
    if (!c.item && c.boxes.length) {
      let best: { s: number; d: number } | null = null, bd = Infinity;
      for (const b of c.boxes) { const a = tr.ahead(k.s, b.s); if (a > 3 && a < 32) { const dd = Math.abs(b.d - d); if (dd < bd) { bd = dd; best = b; } } }
      if (best && bd < 4) d = best.d;
    }
    // question gate: pick a lane once and drive into it
    if (c.gate) {
      const a = tr.ahead(k.s, c.gate.s);
      if (a < 95) {
        if (this.gateId !== c.gate.id) {
          this.gateId = c.gate.id;
          const ok = Math.random() < sk.gate;
          const wrong = [0, 1, 2].filter((x) => x !== c.gate!.correct);
          this.gateLane = ok ? c.gate.correct : wrong[Math.floor(Math.random() * wrong.length)];
        }
        d = c.gate.lanes[this.gateLane];
      }
    }
    // steer around ink, hazards and slower karts
    for (const o of c.obstacles) {
      const a = tr.ahead(k.s, o.s);
      if (a < 2 || a > 30) continue;
      const need = o.r + 1.35;
      if (Math.abs(o.d - d) < need) {
        const left = o.d - need, right = o.d + need;
        d = Math.abs(left) < Math.abs(right) ? (left > -lim ? left : right) : (right < lim ? right : left);
      }
    }
    d = THREE.MathUtils.clamp(d, -lim, lim);

    // steering: pursue a point ahead
    const target = tr.pointAt(sA, d);
    let a = Math.atan2(target.x - k.pos.x, target.z - k.pos.z) - k.yaw;
    while (a > Math.PI) a -= Math.PI * 2;
    while (a < -Math.PI) a += Math.PI * 2;
    let steer = THREE.MathUtils.clamp(-a * 2.6, -1, 1);

    // speed: the tightest corner within reach
    let cmax = 0;
    for (let x = 4; x < v * 1.05 + 10; x += 2) cmax = Math.max(cmax, Math.abs(this.curvAt(k.s + x)));
    const turn = this.drifting ? 1.9 : KART.turn;
    const vT = turn / (cmax + (this.drifting ? 0 : (KART.turn * 0.34) / KART.maxSpeed));
    let throttle = 1, brake = 0;
    if (v > vT + 2) { throttle = 0; if (v > vT + 5) brake = 1; }

    // drift through long corners
    const cNear = this.curvAt(k.s + 6), c20 = (this.curvAt(k.s + 10) + this.curvAt(k.s + 20) + this.curvAt(k.s + 30)) / 3;
    const cid = Math.floor((k.s + 15) / 30);
    if (!this.drifting && k.grounded && v > 14 && Math.abs(c20) > 0.013 && Math.sign(c20) === Math.sign(cNear) && Math.abs(this.curvAt(k.s + 28)) > 0.006 && c.racing && this.curveId !== cid && !this.jumpNear(k.s, 0, 55)) {
      this.curveId = cid;
      if (Math.random() < sk.drift) { this.drifting = true; this.driftT = 0; this.driftDir = c20 > 0 ? -1 : 1; }
    }
    let drift = false;
    if (this.drifting) {
      this.driftT += 1 / 120;
      // hop with the steer held into the corner, then follow the line
      if (this.driftT < 0.35) steer = this.driftDir;
      const ahead = this.curvAt(k.s + 6);
      const still = Math.sign(ahead) === -this.driftDir && Math.abs(ahead) > 0.005;
      const wrongWay = Math.sign(steer) === -this.driftDir && Math.abs(a) > 0.45;
      // keep it long enough for a turbo (the charge needs ~0.7 s for blue, ~1.5 s for orange)
      const enough = k.tier >= (sk.driftHold > 2 ? 2 : 1) || this.driftT > sk.driftHold + 0.4;
      const end = (this.driftT > 0.45 && wrongWay) || (this.driftT > 0.45 && !still && (enough || Math.abs(ahead) < 0.002 || Math.sign(ahead) === this.driftDir)) || this.driftT > sk.driftHold + 1.2 || (this.driftT > 0.6 && !k.drift && k.grounded) || k.spinT > 0 || this.jumpNear(k.s, 0, 22);
      if (end) this.drifting = false;
      else drift = true;
    }
    // a trick at the top of a ramp jump
    if (k.grounded) this.trickDone = false;
    else if (!this.trickDone && k.airT > 0.1 && k.vel.y > -2) { this.trickDone = true; if (Math.random() < 0.4 + sk.line * 0.5) drift = !drift; }

    // stuck against something: back out
    if (c.racing && v < 1.5 && k.spinT <= 0 && k.grounded) this.stuckT += 1 / 120; else this.stuckT = Math.max(0, this.stuckT - 1 / 60);
    if (this.stuckT > 1.1) { this.reverseT = 0.9; this.stuckT = 0; }
    if (this.reverseT > 0) { this.reverseT -= 1 / 120; return { throttle: 0, brake: 1, steer: -steer, drift: false, useItem: false }; }

    return { throttle, brake, steer, drift, useItem: this.items(c, cmax) };
  }

  /** Use the item now? */
  private items(c: BotCtx, cmax: number): boolean {
    if (!c.item) { this.holdT = 0; this.lastItem = null; return false; }
    if (c.item !== this.lastItem) { this.lastItem = c.item; this.holdT = 0; }
    this.holdT += 1 / 120;
    if (this.holdT < this.skill.itemDelay) return false;
    switch (c.item) {
      case 'book': return true;
      case 'bell': return c.place > 1 || this.holdT > 10;
      case 'plane': return c.aheadGap < 85 || this.holdT > 9;
      case 'ink': return c.behindGap < 26 || this.holdT > 7;
      case 'coffee': if (cmax < 0.02 && c.t - this.lastCoffee > 1.3) { this.lastCoffee = c.t; return true; } return false;
      default: return false;
    }
  }
}
