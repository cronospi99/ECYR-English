/**
 * Taxi Rush — street traffic (ECYR rebuild).
 *
 * Everyday cars (city/carpack.ts) drawn as one instanced mesh per model and
 * part, so a hundred cars are forty draw calls. Busy where a city is busy:
 * downtown avenues carry more cars than the suburbs, and the six-lane highway
 * is packed and fast. Cars keep their distance in their lane and brake for a
 * taxi in front of them — and when the taxi hits one at speed it goes flying,
 * spinning and bouncing down the road the way an arcade cab ride demands,
 * then quietly rejoins the traffic a few seconds later.
 */
import * as THREE from 'three';
import { carTemplates, CAR_COLOURS, type CarTemplate } from '../city/carpack';
import { HZ, J_MAX, J_MIN, K_MAX, K_MIN, MAX_X, MAX_Z, MIN_X, MIN_Z, VX, HWY_LANES } from './world';

interface Lane { axis: 'h' | 'v'; at: number; dir: 1 | -1; span: [number, number]; speed: number }

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
  tpl: number; slot: number; color: THREE.Color;
  lane: Lane; pos: number; base: number;
  fly: { y: number; vx: number; vy: number; vz: number; rx: number; rz: number; wx: number; wy: number; wz: number; t: number } | null;
}

const dummy = new THREE.Object3D();
const tmpColor = new THREE.Color();

export class TaxiTraffic {
  readonly group = new THREE.Group();
  readonly cars: Car[] = [];
  private meshes: { tpl: CarTemplate; parts: THREE.InstancedMesh[] }[] = [];
  /** Only cars this close to the taxi are drawn (the rest still drive). */
  drawRadius = 120;

  constructor(density = 1) {
    const tpls = carTemplates();
    if (!tpls.length) return;
    const rand = (() => { let s = 7; return () => ((s = (s * 16807) % 2147483647) / 2147483647); })();
    const lanes: { lane: Lane; n: number }[] = [];
    // avenues (x = const) and streets (z = const): the whole grid, centre included
    for (let k = K_MIN; k <= K_MAX; k++) {
      const busy = k >= -1 && k <= 6 ? 3 : 2;
      for (const dir of [1, -1] as const) lanes.push({ lane: { axis: 'v', at: VX(k) + (dir > 0 ? 1.5 : 4.5), dir, span: [MIN_Z, HWY_LANES[0] - 6], speed: 7 }, n: busy });
    }
    for (let j = J_MIN; j <= J_MAX; j++) {
      const busy = j >= -1 && j <= 7 ? 3 : 2;
      for (const dir of [1, -1] as const) lanes.push({ lane: { axis: 'h', at: HZ(j) + (dir > 0 ? 4.5 : 1.5), dir, span: [MIN_X, MAX_X], speed: 7 }, n: busy });
    }
    // the highway: six lanes, three each way, nose to tail
    HWY_LANES.forEach((z, i) => {
      const dir: 1 | -1 = i < 3 ? -1 : 1;
      lanes.push({ lane: { axis: 'h', at: z, dir, span: [MIN_X, MAX_X], speed: 13 + (i % 3) * 2.5 }, n: 9 });
    });
    void MAX_Z;

    // deal cars to models round-robin, then build the instanced meshes
    const plan: { lane: Lane; tpl: number }[] = [];
    let t = 0;
    for (const { lane, n } of lanes) for (let i = 0; i < Math.round(n * density); i++) plan.push({ lane, tpl: t++ % tpls.length });
    const perTpl = tpls.map(() => 0);
    for (const p of plan) perTpl[p.tpl]++;
    tpls.forEach((tpl, ti) => {
      const parts = tpl.parts.map((p) => {
        const m = new THREE.InstancedMesh(p.geometry, p.role === 'body' ? (p.material as THREE.Material) : p.material, Math.max(1, perTpl[ti]));
        m.castShadow = p.role !== 'glass';
        m.receiveShadow = true;
        m.frustumCulled = false;
        m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
        this.group.add(m);
        return m;
      });
      this.meshes.push({ tpl, parts });
    });
    const slot = tpls.map(() => 0);
    plan.forEach((p, id) => {
      const tpl = tpls[p.tpl];
      const len = p.lane.span[1] - p.lane.span[0];
      const car: Car = {
        id, tpl: p.tpl, slot: slot[p.tpl]++, lane: p.lane,
        pos: rand() * len, base: p.lane.speed * (0.8 + rand() * 0.4), speed: 0,
        x: 0, z: 0, yaw: 0, len: tpl.length, wid: tpl.width, flying: false, grazed: -99, fly: null,
        color: new THREE.Color(CAR_COLOURS[Math.floor(rand() * CAR_COLOURS.length)]),
      };
      this.cars.push(car);
    });
    // give every body mesh its colour buffer up front
    for (const m of this.meshes) {
      const body = m.parts[m.tpl.parts.findIndex((q) => q.role === 'body')];
      for (let i = 0; i < body.count; i++) body.setColorAt(i, tmpColor.set('#ffffff'));
    }
  }

  /**
   * Nobody at the start line: any car within `r` of (x, z) is moved half a lap along its
   * lane. Call it whenever the taxi is put back at its start.
   */
  clearArea(x: number, z: number, r: number): void {
    for (const c of this.cars) {
      if (c.fly) continue;
      const l = c.lane, span = l.span[1] - l.span[0];
      for (let guard = 0; guard < 3; guard++) {
        const cx = l.axis === 'h' ? l.span[0] + c.pos : l.at, cz = l.axis === 'h' ? l.at : l.span[0] + c.pos;
        if (Math.hypot(cx - x, cz - z) > r) break;
        c.pos = (c.pos + span / 2 + guard * 17) % span;
        c.speed = 0;
      }
    }
  }

  /** Send a car flying: the taxi's velocity, plus a hop and a spin. */
  knock(c: TrafficCar, vx: number, vz: number): void {
    const car = c as Car;
    if (car.fly) return;
    const sp = Math.hypot(vx, vz);
    car.fly = {
      y: 0, vx: vx * 1.05, vy: 3 + sp * 0.28, vz: vz * 1.05,
      rx: 0, rz: 0,
      wx: (Math.random() - 0.5) * 9, wy: (Math.random() - 0.5) * 10, wz: (Math.random() - 0.5) * 9,
      t: 4.5,
    };
    car.flying = true;
  }

  update(dt: number, taxi: { x: number; z: number }): void {
    // lane order, so each car can keep its distance from the one in front
    const byLane = new Map<Lane, Car[]>();
    for (const c of this.cars) {
      if (c.fly) continue;
      let l = byLane.get(c.lane);
      if (!l) byLane.set(c.lane, (l = []));
      l.push(c);
    }
    for (const [lane, list] of byLane) {
      const span = lane.span[1] - lane.span[0];
      list.sort((a, b) => (a.pos - b.pos) * lane.dir);
      for (let i = 0; i < list.length; i++) {
        const c = list[i];
        const ahead = list[(i + 1) % list.length];
        let gap = ((ahead.pos - c.pos) * lane.dir + span) % span;
        if (ahead === c) gap = Infinity;
        let want = c.base;
        if (gap < c.len + 2.5) want = 0; else if (gap < c.len + 9) want = Math.min(want, ahead.speed);
        // the taxi in front: brake (and honk, in spirit)
        const fx = lane.axis === 'h' ? lane.dir : 0, fz = lane.axis === 'v' ? lane.dir : 0;
        const dx = taxi.x - c.x, dz = taxi.z - c.z;
        const along = dx * fx + dz * fz, side = Math.abs(dx * fz - dz * fx);
        if (along > 0 && along < c.len / 2 + 5 && side < 1.8) want = 0;
        c.speed += (want - c.speed) * Math.min(1, dt * (want < c.speed ? 6 : 1.5));
        c.pos = (c.pos + c.speed * lane.dir * dt + span) % span;
      }
    }
    const used = this.meshes.map(() => 0);
    const R2 = this.drawRadius * this.drawRadius;
    for (const c of this.cars) {
      const m = this.meshes[c.tpl];
      if (c.fly) {
        const f = c.fly;
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
        dummy.position.set(c.x, f.y, c.z);
        dummy.rotation.set(f.rx, c.yaw, f.rz, 'YXZ');
        if (f.t <= 0) {
          // back into the traffic, somewhere out of sight along its lane
          c.fly = null; c.flying = false;
          const span = c.lane.span[1] - c.lane.span[0];
          c.pos = (c.pos + span / 2) % span;
          c.speed = 0;
        }
      } else {
        const l = c.lane;
        if (l.axis === 'h') { c.x = l.span[0] + c.pos; c.z = l.at; c.yaw = l.dir > 0 ? Math.PI / 2 : -Math.PI / 2; }
        else { c.z = l.span[0] + c.pos; c.x = l.at; c.yaw = l.dir > 0 ? 0 : Math.PI; }
        dummy.position.set(c.x, 0, c.z);
        dummy.rotation.set(0, c.yaw, 0);
      }
      const dx = c.x - taxi.x, dz = c.z - taxi.z;
      if (dx * dx + dz * dz > R2) continue;
      dummy.scale.setScalar(1);
      dummy.updateMatrix();
      const slot = used[c.tpl]++;
      for (const part of m.parts) part.setMatrixAt(slot, dummy.matrix);
      const bodyIdx = m.tpl.parts.findIndex((q) => q.role === 'body');
      m.parts[bodyIdx].setColorAt(slot, c.color);
    }
    this.meshes.forEach((m, i) => {
      for (const part of m.parts) {
        part.count = used[i];
        part.instanceMatrix.needsUpdate = true;
        if (part.instanceColor) part.instanceColor.needsUpdate = true;
      }
    });
  }

  setVisible(v: boolean): void {
    this.group.visible = v;
  }
}

export { MIN_X, MAX_X };
