/* English Racers — arcade kart physics, stepped at a fixed 120 Hz.
   The kart lives in world space; each step asks the track what is under it (road, kerb, grass,
   a ramp, a gap) by its distance along the road (s) and to the side (d).
   - Grip: velocity is split into forward and sideways parts; the sideways part bleeds away (less
     while drifting, so the kart slides).
   - Drift: a hop, then holding the button while steering drifts; the charge goes blue → orange →
     purple and releasing it fires a mini-turbo of that size.
   - Height: the kart sticks to the ground unless the ground falls away faster than gravity can
     follow (crests, the lip of a ramp, a gap) — then it flies, and a button press in the air is a
     trick that gives a boost on landing.
   - Walls bounce you back, grass slows you down, boost pads and turbos speed you up. */
import * as THREE from 'three';
import type { Query, Track } from './track';

export interface KartInput { throttle: number; brake: number; steer: number; drift: boolean }
export const NO_INPUT: KartInput = { throttle: 0, brake: 0, steer: 0, drift: false };

export const KART = {
  maxSpeed: 27, boostSpeed: 37, accel: 17, brake: 34, reverse: 9, coast: 5,
  turn: 2.25, grip: 14, driftGrip: 5.5, grassMax: 12.5, grassGrip: 8,
  gravity: 27, hop: 3.6, radius: 0.8,
  tiers: [0.7, 1.55, 2.5] as const,
  tierBoost: [0, 0.55, 0.95, 1.45] as const,
};

export type KartEvent =
  | { e: 'hop' } | { e: 'drift'; dir: number } | { e: 'tier'; tier: number } | { e: 'boost'; secs: number; kind: 'mini' | 'pad' | 'trick' | 'start' }
  | { e: 'land'; v: number } | { e: 'wall'; v: number } | { e: 'trick' } | { e: 'fall' } | { e: 'air' } | { e: 'spin' };

export class Kart {
  pos = new THREE.Vector3();
  vel = new THREE.Vector3();
  yaw = 0;
  /** Index of the nearest track frame (search hint) and the road coordinates. */
  hint = -1;
  s = 0; d = 0;
  q: Query | null = null;
  grounded = true;
  steer = 0;
  /** Drift: 0 none, −1 left, +1 right; time charged and the tier reached. */
  drift = 0; driftT = 0; tier = 0;
  private hopping = false;
  private wantDrift = false;
  private prevDrift = false;
  boostT = 0;
  airT = 0;
  trick = false;
  trickT = 0;
  private launch = 0;
  private groundVy = 0;
  spinT = 0;
  surface: Query['surface'] = 'road';
  /** Last spot on solid road (respawn point). */
  safeS = 0;
  yawRate = 0;
  accelNow = 0;
  falling = false;
  private wallCd = 0;
  events: KartEvent[] = [];

  constructor(private track: Track) {}

  /** Put the kart on the road at (s, d), facing forward. */
  place(s: number, d: number) {
    const tr = this.track;
    tr.pointAt(s, d, this.pos);
    const f = tr.frame(Math.floor((((s % tr.length) + tr.length) % tr.length) / tr.ds));
    this.yaw = f.yaw;
    this.vel.set(0, 0, 0);
    this.hint = -1;
    this.grounded = true;
    this.drift = 0; this.driftT = 0; this.tier = 0; this.boostT = 0; this.spinT = 0; this.trick = false; this.airT = 0; this.falling = false; this.hopping = false; this.wantDrift = false;
    this.q = tr.query(this.pos, -1);
    this.hint = this.q.i; this.s = this.q.s; this.d = this.q.d; this.safeS = this.s;
  }

  get speed() { return Math.hypot(this.vel.x, this.vel.z); }
  /** Forward speed (negative when reversing). */
  get fwd() { return this.vel.x * Math.sin(this.yaw) + this.vel.z * Math.cos(this.yaw); }

  boost(secs: number, kind: 'mini' | 'pad' | 'trick' | 'start') {
    this.boostT = Math.max(this.boostT, secs);
    this.events.push({ e: 'boost', secs, kind });
  }

  spin(secs = 0.9) { this.spinT = secs; this.drift = 0; this.tier = 0; this.events.push({ e: 'spin' }); }

  step(dt: number, inp: KartInput) {
    const K = KART;
    this.steer += (inp.steer - this.steer) * Math.min(1, dt * 11);
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw); // forward
    const rx = -fz, rz = fx; // right
    let vf = this.vel.x * fx + this.vel.z * fz;
    let vl = this.vel.x * rx + this.vel.z * rz;
    const grass = this.surface === 'grass';
    const control = this.spinT <= 0;
    this.boostT = Math.max(0, this.boostT - dt);
    this.spinT = Math.max(0, this.spinT - dt);
    this.wallCd -= dt;
    const v0 = vf;

    // drift button: a hop on the press; a drift starts on landing if steering
    const press = inp.drift && !this.prevDrift;
    this.prevDrift = inp.drift;
    if (press && control) {
      if (this.grounded) { this.vel.y = K.hop; this.grounded = false; this.hopping = true; this.wantDrift = true; this.events.push({ e: 'hop' }); }
      else if (this.launch > 2.5 && !this.trick && this.airT > 0.05) { this.trick = true; this.trickT = 0; this.events.push({ e: 'trick' }); }
    }
    if (!inp.drift) this.wantDrift = false;

    if (this.grounded || this.hopping) {
      const boosting = this.boostT > 0;
      let max = boosting ? K.boostSpeed : K.maxSpeed;
      if (grass) max = boosting ? K.maxSpeed * 0.92 : K.grassMax;
      if (this.grounded) {
        if (control && inp.throttle > 0 && vf < max) vf += (K.accel * (1 - Math.pow(Math.max(0, vf) / max, 2)) + 2.5) * inp.throttle * dt;
        if (boosting && vf < max) vf = Math.min(max, vf + 34 * dt);
        if (vf > max) vf -= (vf - max) * Math.min(1, dt * (grass ? 3.5 : 1.6));
        if (control && inp.brake > 0) {
          if (vf > 0.5) vf -= K.brake * inp.brake * dt;
          else if (inp.throttle <= 0) vf = Math.max(-K.reverse, vf - 14 * dt);
        }
        if (!control) vf -= Math.sign(vf) * Math.min(Math.abs(vf), 22 * dt);
        else if (inp.throttle <= 0 && inp.brake <= 0) vf -= Math.sign(vf) * Math.min(Math.abs(vf), K.coast * dt);
        vf -= vf * 0.012 * dt; // air drag
      }
      // steering
      const sp = Math.min(1, Math.abs(vf) / 5) * Math.sign(vf || 1);
      if (!control) this.yawRate = 11 * (this.spinT > 0 ? 1 : 0);
      else if (this.drift) this.yawRate = -this.drift * (1.0 + 0.95 * this.steer * this.drift) * sp;
      else this.yawRate = -this.steer * K.turn * sp * (1 - 0.42 * Math.min(1, Math.abs(vf) / K.maxSpeed));
    } else {
      this.yawRate = -this.steer * 0.9; // a little air control
    }
    this.accelNow = (vf - v0) / dt;
    const yaw0 = this.yaw;
    this.yaw += this.yawRate * dt;
    // velocity keeps its direction while the kart turns under it: the sideways part bleeds by grip
    const vx = fx * vf + rx * vl, vz = fz * vf + rz * vl;
    if (this.grounded || this.hopping) {
      const nfx = Math.sin(this.yaw), nfz = Math.cos(this.yaw), nrx = -nfz, nrz = nfx;
      vf = vx * nfx + vz * nfz;
      vl = vx * nrx + vz * nrz;
      const grip = !control ? 2 : this.drift ? K.driftGrip : grass ? K.grassGrip : K.grip;
      vl *= Math.exp(-dt * grip);
      this.vel.x = nfx * vf + nrx * vl;
      this.vel.z = nfz * vf + nrz * vl;
    } else {
      this.vel.x = vx; this.vel.z = vz;
      if (!control) this.yaw = yaw0 + 11 * dt;
    }

    // drift charge
    if (this.drift) {
      if (!inp.drift || Math.abs(vf) < 8 || !control) this.endDrift(inp.drift && control);
      else if (this.grounded) {
        if (!grass) this.driftT += dt * (0.75 + 0.55 * Math.max(0, this.steer * this.drift));
        const tier = this.driftT >= K.tiers[2] ? 3 : this.driftT >= K.tiers[1] ? 2 : this.driftT >= K.tiers[0] ? 1 : 0;
        if (tier > this.tier) { this.tier = tier; this.events.push({ e: 'tier', tier }); }
      }
    }

    // move
    const px = this.pos.x, pz = this.pos.z;
    this.pos.x += this.vel.x * dt;
    this.pos.z += this.vel.z * dt;
    let q = this.track.query(this.pos, this.hint);
    // falling below a road edge (the far side of a gap): that face is solid, bounce off it
    if (!this.grounded && q.ground !== null && this.pos.y < q.ground - 0.6) {
      this.pos.x = px; this.pos.z = pz;
      this.vel.x *= -0.15; this.vel.z *= -0.15;
      q = this.track.query(this.pos, this.hint);
      if (q.ground !== null && this.pos.y < q.ground - 0.6) q = { ...q, ground: null };
    }
    this.q = q;
    this.hint = q.i; this.s = q.s; this.d = q.d;
    this.surface = q.surface;

    // walls
    const lim = q.limit - K.radius;
    if (Math.abs(q.d) > lim && q.wall) {
      const sg = Math.sign(q.d), push = Math.abs(q.d) - lim;
      this.pos.x -= q.r.x * push * sg; this.pos.z -= q.r.z * push * sg;
      const vn = this.vel.x * q.r.x + this.vel.z * q.r.z;
      if (vn * sg > 0) {
        // remove the part going into the wall (a bounce only on hard hits) and scrape along it
        const hit = Math.abs(vn);
        const bounce = hit > 6 ? 0.35 : 0;
        this.vel.x -= q.r.x * vn * (1 + bounce); this.vel.z -= q.r.z * vn * (1 + bounce);
        // a real hit costs speed once (by how square it was); scraping only rubs a little
        const keep = hit > 3 && this.wallCd <= 0 ? 1 - Math.min(0.3, hit * 0.02) : 1 - dt * 0.35;
        this.vel.x *= keep; this.vel.z *= keep;
        if (hit > 3 && this.wallCd <= 0) { this.events.push({ e: 'wall', v: hit }); this.wallCd = 0.3; }
        if (hit > 4 && this.drift) this.endDrift(false);
        // turn the nose along the wall
        const ty = Math.atan2(q.t.x, q.t.z) + (this.fwd < 0 ? Math.PI : 0);
        let dy = ty - this.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
        if (Math.abs(dy) < 1.3) this.yaw += dy * Math.min(1, 0.12 + hit * 0.03);
      }
    }

    // height: stick to the ground unless it falls away faster than gravity
    const g = q.ground;
    if (this.grounded) {
      const need = g === null ? -Infinity : (g - this.pos.y) / dt;
      // (a margin of 3 m/s: banking and gentle crests keep you glued; a ramp lip or a gap does not)
      if (g === null || need < this.groundVy - 3) {
        this.grounded = false; this.vel.y = Math.max(this.groundVy, 0) - K.gravity * dt; this.launch = Math.max(0, this.groundVy); this.airT = 0; this.trick = false;
        this.events.push({ e: 'air' });
      } else {
        this.groundVy += (Math.max(-40, Math.min(40, need)) - this.groundVy) * Math.min(1, dt * 30);
        this.pos.y = g;
        this.vel.y = 0;
      }
    }
    if (!this.grounded) {
      this.airT += dt;
      if (this.trick) this.trickT += dt;
      this.vel.y -= K.gravity * dt;
      this.pos.y += this.vel.y * dt;
      if (g !== null && this.pos.y <= g + 0.02 && this.vel.y <= 0) {
        const impact = -this.vel.y;
        this.pos.y = g; this.vel.y = 0; this.grounded = true; this.groundVy = q.slope * vf;
        if (this.hopping) {
          this.hopping = false;
          if (this.wantDrift && inp.drift && Math.abs(this.steer) > 0.25 && Math.abs(vf) > 10 && control && !this.drift) {
            this.drift = Math.sign(this.steer); this.driftT = 0; this.tier = 0;
            this.events.push({ e: 'drift', dir: this.drift });
          }
        } else this.events.push({ e: 'land', v: impact });
        if (this.trick) { this.trick = false; this.boost(0.85, 'trick'); }
        this.launch = 0;
      }
      if (this.pos.y < (g === null ? this.track.waterY : g - 6) - 1 && !this.falling) { this.falling = true; this.events.push({ e: 'fall' }); }
    }
    if (this.grounded && q.surface === 'road' && !q.ramp && this.track.ahead(this.safeS, this.s) < 30) this.safeS = this.s;
    if (this.grounded && q.pad) { if (this.boostT < 0.9) this.boost(1.05, 'pad'); }
  }

  private endDrift(keepHold: boolean) {
    void keepHold;
    if (this.tier > 0) this.boost(KART.tierBoost[this.tier], 'mini');
    this.drift = 0; this.driftT = 0; this.tier = 0;
  }
}

/** A simple driver (tests, the finish lap and future bots): aim at a point ahead on the road. */
export function autopilot(k: Kart, track: Track, line = 0, look = 14): KartInput {
  const s = k.s + look + Math.min(18, k.speed * 0.45);
  const target = track.pointAt(s, line);
  const dx = target.x - k.pos.x, dz = target.z - k.pos.z;
  let a = Math.atan2(dx, dz) - k.yaw;
  while (a > Math.PI) a -= Math.PI * 2;
  while (a < -Math.PI) a += Math.PI * 2;
  const steer = THREE.MathUtils.clamp(-a * 2.4, -1, 1);
  return { throttle: 1, brake: Math.abs(a) > 0.9 && k.speed > 16 ? 1 : 0, steer, drift: false };
}
