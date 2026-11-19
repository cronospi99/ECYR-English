/**
 * Taxi Rush — street traffic (ECYR rebuild).
 *
 * Everyday cars (city/carpack.ts) drawn as one instanced mesh per model and
 * part, so the whole fleet is about forty draw calls. Busy where a city is busy:
 * downtown avenues carry more cars than the suburbs, and the six-lane highway
 * is packed and fast. Cars keep their distance in their lane and brake for a
 * taxi in front of them — and when the taxi hits one at speed it goes flying,
 * spinning and bouncing down the road the way an arcade cab ride demands,
 * then quietly rejoins the traffic a few seconds later.
 *
 * ECYR fix: the map is a 330 × 260 grid with seventy-odd lanes, and spreading a
 * couple of hundred cars over all of it left about one car per 100 m of lane —
 * from the driver's seat, empty streets. Now the fleet is a pool that lives
 * around the taxi: every car is placed on a lane near it (the closer the lane,
 * the likelier), and a car that falls more than `RANGE` behind (or reaches the
 * end of its road) is recycled onto a lane ahead, far enough away that it does
 * not pop in under the player's nose. Same draw calls, five times the cars in
 * sight. Nothing is allocated per frame.
 */
import * as THREE from 'three';
import { carTemplates, CAR_COLOURS, type CarTemplate } from '../city/carpack';
import { HZ, J_MAX, J_MIN, K_MAX, K_MIN, MAX_X, MIN_X, MIN_Z, VX, HWY_LANES } from './world';

interface Lane {
  axis: 'h' | 'v'; at: number; dir: 1 | -1; span: [number, number]; speed: number;
  /** How busy the road is (downtown 1.3, suburbs 0.8, highway 1.6). */
  weight: number;
  /** The cars on it, sorted by `pos` (kept sorted by insertion, no allocation). */
  cars: Car[];
}

export interface TrafficCar {
  id: number;
  x: number; z: number; yaw: number;
  len: number; wid: number;
  speed: number;
  flying: boolean;
  /** Last time a near miss was scored on this car. */
  grazed: number;
}

interface Car extends TrafficCar {
  tpl: number; color: THREE.Color;
  lane: Lane | null; pos: number; base: number;
  fly: { y: number; vx: number; vy: number; vz: number; rx: number; rz: number; wx: number; wy: number; wz: number; t: number } | null;
}

/** Cars in the pool at density 1 (a desktop). */
const POOL = 132;
/** Cars live within this distance of the taxi, along their lane. */
const RANGE = 100;
/** Lanes further than this from the taxi (sideways) get no cars. */
const LATERAL = 58;
/** A recycled car reappears at least this far away (initial fill: `NEAR`). */
const RESPAWN_MIN = 62;
const NEAR = 14;
/** A car this far behind the taxi (and behind the camera) is recycled. */
const BEHIND = 45;
/** Minimum bumper-to-bumper room when a car is dropped into a lane. */
const SPAWN_GAP = 9;
/** Only cars this close cast a shadow (the sun's map covers about ±44 around the taxi). */
const SHADOW_NEAR = 42;

/** Render layer of the traffic (the game camera enables it; see boot.ts). */
export const TRAFFIC_LAYER = 1;

const dummy = new THREE.Object3D();
const OFF = -1e5;

export class TaxiTraffic {
  readonly group = new THREE.Group();
  readonly cars: Car[] = [];
  private readonly lanes: Lane[] = [];
  private meshes: { tpl: CarTemplate; parts: THREE.InstancedMesh[]; body: number; shadowCount: number }[] = [];
  /** Only cars this close to the taxi are drawn (the rest still drive). */
  drawRadius = 120;
  /** Fraction of the pool that is on the road (the governor thins it on slow devices). */
  private share = 1;
  setShare(f: number): void { this.share = f; }
  private readonly rand: () => number;
  private filled = false;
  /** Scratch for spawning: candidate lanes and their weights (reused, never reallocated after warm-up). */
  private readonly cand: Lane[] = [];
  private readonly candW: number[] = [];
  private readonly candLo: number[] = [];
  private readonly candHi: number[] = [];
  private readonly used: number[] = [];

  constructor(density = 1) {
    const tpls = carTemplates();
    let s = 7;
    this.rand = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    if (!tpls.length) return;
    const rand = this.rand;
    // avenues (x = const) and streets (z = const): the whole grid, centre included
    for (let k = K_MIN; k <= K_MAX; k++) {
      const busy = k >= -1 && k <= 6 ? 1.3 : 0.8;
      for (const dir of [1, -1] as const) this.lanes.push({ axis: 'v', at: VX(k) + (dir > 0 ? 1.5 : 4.5), dir, span: [MIN_Z, HWY_LANES[0] - 6], speed: 7.5, weight: busy, cars: [] });
    }
    for (let j = J_MIN; j <= J_MAX; j++) {
      const busy = j >= -1 && j <= 7 ? 1.3 : 0.8;
      for (const dir of [1, -1] as const) this.lanes.push({ axis: 'h', at: HZ(j) + (dir > 0 ? 4.5 : 1.5), dir, span: [MIN_X, MAX_X], speed: 7.5, weight: busy, cars: [] });
    }
    // the highway: six lanes, three each way, nose to tail
    HWY_LANES.forEach((z, i) => {
      const dir: 1 | -1 = i < 3 ? -1 : 1;
      this.lanes.push({ axis: 'h', at: z, dir, span: [MIN_X, MAX_X], speed: 13 + (i % 3) * 2.5, weight: 1.6, cars: [] });
    });

    // deal the pool to the models round-robin, then build the instanced meshes
    const n = Math.max(8, Math.round(POOL * density));
    const perTpl = tpls.map(() => 0);
    for (let id = 0; id < n; id++) {
      const ti = id % tpls.length;
      perTpl[ti]++;
      const tpl = tpls[ti];
      this.cars.push({
        id, tpl: ti, lane: null, pos: 0, base: 0, speed: 0,
        x: OFF, z: OFF, yaw: 0, len: tpl.length, wid: tpl.width, flying: false, grazed: -99, fly: null,
        color: new THREE.Color(CAR_COLOURS[Math.floor(rand() * CAR_COLOURS.length)]),
      });
    }
    const white = new THREE.Color('#ffffff');
    tpls.forEach((tpl, ti) => {
      const parts = tpl.parts.map((p) => {
        const m = new THREE.InstancedMesh(p.geometry, p.material, Math.max(1, perTpl[ti]));
        // only the body's shadow is worth a shadow-pass draw (the wheels sit inside it)
        m.castShadow = p.role === 'body';
        m.receiveShadow = p.role === 'body';
        m.frustumCulled = false;
        // layer 1: seen by the chase camera (and so in its shadow pass) but not by the
        // reflection probe, where forty moving cars cost a lot and show as a few pixels
        m.layers.set(TRAFFIC_LAYER);
        m.count = 0;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.group.add(m);
        return m;
      });
      const body = tpl.parts.findIndex((q) => q.role === 'body');
      // the colour buffer exists up front, so the shader is compiled once with it
      for (let i = 0; i < parts[body].instanceMatrix.count; i++) parts[body].setColorAt(i, white);
      const entry = { tpl, parts, body, shadowCount: 0 };
      // the sun's shadow only for the cars near the taxi (they fill the first slots)
      let full = 0;
      const shadowed = parts[body];
      shadowed.onBeforeShadow = () => { full = shadowed.count; shadowed.count = Math.min(full, entry.shadowCount); };
      shadowed.onAfterShadow = () => { shadowed.count = full; };
      this.meshes.push(entry);
      this.used.push(0);
    });
  }

  /* -------------------------------------------------------------- lanes -- */

  private laneXZ(l: Lane, pos: number, out: { x: number; z: number }): void {
    if (l.axis === 'h') { out.x = l.span[0] + pos; out.z = l.at; } else { out.x = l.at; out.z = l.span[0] + pos; }
  }

  private take(c: Car): void {
    const l = c.lane;
    if (!l) return;
    const i = l.cars.indexOf(c);
    if (i >= 0) l.cars.splice(i, 1);
    c.lane = null;
  }

  private put(c: Car, l: Lane, pos: number): void {
    c.lane = l; c.pos = pos;
    // sorted insert
    let i = l.cars.length;
    while (i > 0 && l.cars[i - 1].pos > pos) i--;
    l.cars.splice(i, 0, c);
    c.base = l.speed * (0.8 + this.rand() * 0.4);
    c.speed = c.base * 0.7;
    const p = this.tmpP;
    this.laneXZ(l, pos, p);
    c.x = p.x; c.z = p.z;
    c.yaw = l.axis === 'h' ? (l.dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (l.dir > 0 ? 0 : Math.PI);
  }
  private readonly tmpP = { x: 0, z: 0 };

  /**
   * Drop a car onto a lane near (tx, tz), at least `minD` from it, with room in front
   * and behind. Lanes nearer the taxi and busier roads are likelier. Returns false
   * when no spot was found this time (the car waits off-map and tries next frame).
   */
  private spawn(c: Car, tx: number, tz: number, minD: number, ahead: { x: number; z: number } | null): boolean {
    const cand = this.cand, w = this.candW, lo = this.candLo, hi = this.candHi;
    cand.length = 0; w.length = 0; lo.length = 0; hi.length = 0;
    let total = 0;
    for (const l of this.lanes) {
      const lat = Math.abs(l.axis === 'h' ? l.at - tz : l.at - tx);
      if (lat > LATERAL) continue;
      const along = (l.axis === 'h' ? tx : tz) - l.span[0];
      const reach = Math.sqrt(Math.max(0, RANGE * RANGE - lat * lat));
      const a = Math.max(0, along - reach), b = Math.min(l.span[1] - l.span[0], along + reach);
      if (b - a < 8) continue;
      // the street the taxi is on, and the avenues it is about to cross, carry most of the cars
      const q = lat / 14;
      const weight = (b - a) * l.weight / (1 + q * q);
      cand.push(l); w.push(weight); lo.push(a); hi.push(b);
      total += weight;
    }
    if (!total) return false;
    const p = this.tmpP;
    for (let attempt = 0; attempt < 8; attempt++) {
      let r = this.rand() * total, i = 0;
      while (i < cand.length - 1 && r > w[i]) { r -= w[i]; i++; }
      const l = cand[i];
      const pos = lo[i] + this.rand() * (hi[i] - lo[i]);
      this.laneXZ(l, pos, p);
      const dx = p.x - tx, dz = p.z - tz;
      const d2 = dx * dx + dz * dz;
      if (d2 < minD * minD || d2 > RANGE * RANGE) continue;
      // a recycled car prefers the road ahead of the taxi (where the player is going)
      if (ahead && attempt < 5 && dx * ahead.x + dz * ahead.z < 0) continue;
      let free = true;
      for (const o of l.cars) if (Math.abs(o.pos - pos) < SPAWN_GAP + (o.len + c.len) / 2) { free = false; break; }
      if (!free) continue;
      this.put(c, l, pos);
      return true;
    }
    return false;
  }

  /** Off the map: not drawn, not hit. */
  private park(c: Car): void {
    this.take(c);
    c.x = c.z = OFF; c.speed = 0;
  }

  /**
   * Nobody at the start line: any car within `r` of (x, z) is taken off and dealt
   * again further out. Call it whenever the taxi is put back at its start.
   */
  clearArea(x: number, z: number, r: number): void {
    for (const c of this.cars) {
      if (c.fly || !c.lane) continue;
      if (Math.hypot(c.x - x, c.z - z) < r) {
        this.park(c);
        this.spawn(c, x, z, r + 6, null);
      }
    }
  }

  /** Send a car flying: the taxi's velocity, plus a hop and a spin. */
  knock(tc: TrafficCar, vx: number, vz: number): void {
    const car = tc as Car;
    if (car.fly) return;
    const sp = Math.hypot(vx, vz);
    this.take(car); // out of its lane: the cars behind may go on
    car.fly = {
      y: 0, vx: vx * 1.05, vy: 3 + sp * 0.28, vz: vz * 1.05,
      rx: 0, rz: 0,
      wx: (Math.random() - 0.5) * 9, wy: (Math.random() - 0.5) * 10, wz: (Math.random() - 0.5) * 9,
      t: 4.5,
    };
    car.flying = true;
  }

  update(dt: number, taxi: { x: number; z: number; yaw?: number }): void {
    if (!this.meshes.length) return;
    const tx = taxi.x, tz = taxi.z;
    const limit = Math.ceil(this.cars.length * this.share);
    const fwd = this.tmpF;
    if (taxi.yaw !== undefined) { fwd.x = Math.sin(taxi.yaw); fwd.z = Math.cos(taxi.yaw); }
    const ahead = taxi.yaw !== undefined ? fwd : null;

    // 1. the pool: fill it (first frame: everywhere around; later: ahead and out of reach)
    let spawns = this.filled ? 6 : this.cars.length;
    for (const c of this.cars) {
      if (c.fly) continue;
      if (c.id >= limit) { if (c.lane || c.x !== OFF) this.park(c); continue; }
      if (c.lane) {
        const dx = c.x - tx, dz = c.z - tz;
        const span = c.lane.span[1] - c.lane.span[0];
        const d2 = dx * dx + dz * dz;
        // gone out of range, off the end of its road, or well behind the chase camera
        // (which only looks where the taxi is heading): deal it again ahead
        const behind = ahead !== null && d2 > BEHIND * BEHIND && dx * ahead.x + dz * ahead.z < 0;
        if (d2 > (RANGE + 14) * (RANGE + 14) || c.pos < 0 || c.pos > span || behind) this.park(c);
        else continue;
      }
      if (spawns > 0) { spawns--; this.spawn(c, tx, tz, this.filled ? RESPAWN_MIN : NEAR, ahead); }
    }
    this.filled = true;

    // 2. driving: keep your distance in your lane, brake for the taxi
    for (const lane of this.lanes) {
      const list = lane.cars;
      const n = list.length;
      if (!n) continue;
      // nearly sorted already: one insertion-sort pass
      for (let i = 1; i < n; i++) {
        const c = list[i];
        let j = i - 1;
        while (j >= 0 && list[j].pos > c.pos) { list[j + 1] = list[j]; j--; }
        list[j + 1] = c;
      }
      const fx = lane.axis === 'h' ? lane.dir : 0, fz = lane.axis === 'v' ? lane.dir : 0;
      for (let i = 0; i < n; i++) {
        const c = list[i];
        const k = i + lane.dir;
        const front = k >= 0 && k < n ? list[k] : null;
        let want = c.base;
        if (front) {
          const gap = Math.abs(front.pos - c.pos) - (front.len + c.len) / 2;
          if (gap < 2.2) want = 0;
          else if (gap < 9) want = Math.min(want, front.speed * (gap - 2.2) / 6.8);
        }
        // the taxi in front: brake (and honk, in spirit)
        const dx = tx - c.x, dz = tz - c.z;
        const along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
        if (along > 0 && along < c.len / 2 + 5 && side < 1.8) want = 0;
        c.speed += (want - c.speed) * Math.min(1, dt * (want < c.speed ? 6 : 1.5));
        c.pos += c.speed * lane.dir * dt;
        if (lane.axis === 'h') c.x = lane.span[0] + c.pos; else c.z = lane.span[0] + c.pos;
      }
    }

    // 3. flying cars: a hop, a spin, a few bounces, then back into the pool
    for (const c of this.cars) {
      const f = c.fly;
      if (!f) continue;
      f.vy -= 22 * dt;
      c.x += f.vx * dt; c.z += f.vz * dt; f.y += f.vy * dt;
      f.rx += f.wx * dt; f.rz += f.wz * dt; c.yaw += f.wy * dt;
      if (f.y < 0) {
        f.y = 0; f.vy = Math.abs(f.vy) * 0.35;
        f.vx *= 0.7; f.vz *= 0.7; f.wx *= 0.6; f.wy *= 0.7; f.wz *= 0.6;
        // settle back onto its wheels
        f.rx *= 0.5; f.rz *= 0.5;
      }
      f.t -= dt;
      if (f.t <= 0) {
        // back into the traffic, somewhere out of sight
        c.fly = null; c.flying = false;
        this.park(c);
      }
    }

    // 4. drawing: only what is near and in the chase camera's view. Cars within
    // SHADOW_NEAR take the first slots, so the shadow pass can draw just those.
    const used = this.used;
    for (let i = 0; i < used.length; i++) used[i] = 0;
    const R2 = this.drawRadius * this.drawRadius, S2 = SHADOW_NEAR * SHADOW_NEAR;
    for (let pass = 0; pass < 2; pass++) {
      for (const c of this.cars) {
        if (!c.fly && !c.lane) continue;
        const dx = c.x - tx, dz = c.z - tz;
        const d2 = dx * dx + dz * dz;
        if (d2 > R2 || (pass === 0) !== (d2 <= S2)) continue;
        // outside the chase camera's view cone (it follows the taxi's heading; ±62° covers
        // the widest phone screen and the camera's lag in a turn) nobody sees it: skip the
        // draw, keep driving. Close cars are always drawn, for their shadows.
        if (ahead) {
          const dot = dx * ahead.x + dz * ahead.z;
          if (d2 > 22 * 22 && (dot < 0 || dot * dot < 0.22 * d2)) continue;
        }
        const f = c.fly;
        if (f) { dummy.position.set(c.x, f.y, c.z); dummy.rotation.set(f.rx, c.yaw, f.rz, 'YXZ'); }
        else { dummy.position.set(c.x, 0, c.z); dummy.rotation.set(0, c.yaw, 0); }
        dummy.updateMatrix();
        const m = this.meshes[c.tpl];
        const slot = used[c.tpl]++;
        for (const part of m.parts) part.setMatrixAt(slot, dummy.matrix);
        m.parts[m.body].setColorAt(slot, c.color);
      }
      if (pass === 0) for (let i = 0; i < this.meshes.length; i++) this.meshes[i].shadowCount = used[i];
    }
    for (let i = 0; i < this.meshes.length; i++) {
      for (const part of this.meshes[i].parts) {
        part.count = used[i];
        part.instanceMatrix.needsUpdate = true;
        if (part.instanceColor) part.instanceColor.needsUpdate = true;
      }
    }
  }
  private readonly tmpF = { x: 0, z: 1 };

  /** How many cars are on the road around the taxi right now (for tests and the HUD). */
  get live(): number {
    let n = 0;
    for (const c of this.cars) if (c.lane || c.fly) n++;
    return n;
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }

  /** Free the instance buffers (the car geometry and materials belong to the car pack). */
  dispose(): void {
    for (const m of this.meshes) for (const p of m.parts) p.dispose();
    this.group.removeFromParent();
    this.meshes = [];
  }
}

export { MIN_X, MAX_X };
