/**
 * Taxi Rush — the GPS: reads the arrow's route (TaxiWorld.waypoint) and turns the next
 * manoeuvre into one phrase from directions.ts. Pure logic, no DOM, so it can be tested.
 *
 * The phrase only changes when the manoeuvre changes (key, junction, landmark) or the spoken
 * distance tier changes ("In two hundred metres" -> "In one hundred metres"), and never faster
 * than HOLD seconds, so the HUD does not flicker.
 */
import { GPS_CUES, GPS_DISTANCE_PREFIXES, pick, type DirectionCue, type DirectionCueKey } from './directions';

export interface GpsNode { x: number; z: number; k?: number; j?: number }
export interface GpsWorld {
  waypoint(x: number, z: number, heading: number, tx: number, tz: number): { x: number; z: number };
  nearestNode(x: number, z: number): GpsNode;
  places: { name: string; x: number; z: number }[];
}
export interface GpsCar { x: number; z: number; yaw: number }
export interface GpsDest { name: string; x: number; z: number }

export interface GpsLine {
  /** Changes whenever the text may change. */
  id: string;
  key: DirectionCueKey;
  text: string;
  /** Spanish support line; null when it would need a Spanish name we do not have. */
  es: string | null;
  /** Metres to the manoeuvre (0 = now / not applicable). */
  metres: number;
}

const HOLD = 1.1;
const U = 1.5; // world units -> metres, as the HUD shows them
const TIERS = [{ m: 350, i: 3 }, { m: 150, i: 2 }, { m: 75, i: 1 }, { m: 32, i: 0 }];

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);
const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0; return h; };

export class Gps {
  private shown: GpsLine | null = null;
  private since = 0;
  private lastBase = '';
  private variant = 0;
  /** The route ahead, in world units (car -> waypoints -> destination), refreshed by update(). */
  route: { x: number; z: number }[] = [];
  private routeAt = -9;

  reset(): void { this.shown = null; this.since = 0; this.lastBase = ''; this.route = []; this.routeAt = -9; }

  /** Relative bearing of (px,pz) from the car's heading, radians, positive = to the right. */
  static bearing(car: GpsCar, px: number, pz: number): number {
    const vx = px - car.x, vz = pz - car.z, fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
    return Math.atan2(vx * -fz + vz * fx, vx * fx + vz * fz);
  }

  update(world: GpsWorld, car: GpsCar, dest: GpsDest, now: number, seed: number): { line: GpsLine; changed: boolean } {
    const next = this.compute(world, car, dest, seed);
    if (now - this.routeAt > 0.3) { this.routeAt = now; this.buildRoute(world, car, dest); }
    const cur = this.shown;
    if (!cur) { this.shown = next; this.since = now; return { line: next, changed: true }; }
    if (next.id !== cur.id && (now - this.since >= HOLD || next.key === 'arrived')) {
      this.shown = next; this.since = now;
      return { line: next, changed: true };
    }
    return { line: cur, changed: false };
  }

  private buildRoute(world: GpsWorld, car: GpsCar, dest: GpsDest): void {
    const pts = [{ x: car.x, z: car.z }];
    let yaw = car.yaw, px = car.x, pz = car.z;
    for (let i = 0; i < 9; i++) {
      const w = world.waypoint(px, pz, yaw, dest.x, dest.z);
      if (Math.hypot(w.x - px, w.z - pz) < 0.5) break;
      pts.push(w);
      yaw = Math.atan2(w.x - px, w.z - pz);
      px = w.x; pz = w.z;
      if (w.x === dest.x && w.z === dest.z) break;
    }
    this.route = pts;
  }

  private compute(world: GpsWorld, car: GpsCar, dest: GpsDest, seed: number): GpsLine {
    const dD = Math.hypot(dest.x - car.x, dest.z - car.z);
    const bearD = Gps.bearing(car, dest.x, dest.z);
    let key: DirectionCueKey = 'straight';
    let node = '';
    let lm = '';
    let lmSide = 0;
    let metres = 0;
    let tier = -1;

    if (dD < 14) key = 'arrived';
    else if (dD < 45) {
      if (Math.abs(bearD) > 2.1) key = 'uTurn';
      else if (Math.abs(bearD) > 0.5) key = bearD > 0 ? 'almostRight' : 'almostLeft';
    } else {
      const wp = world.waypoint(car.x, car.z, car.yaw, dest.x, dest.z);
      const a = Gps.bearing(car, wp.x, wp.z), dwp = Math.hypot(wp.x - car.x, wp.z - car.z);
      if (Math.abs(a) > 2.1 && dwp > 8) key = 'uTurn';
      else if (Math.abs(a) > 0.7) { key = a > 0 ? 'right' : 'left'; node = 'now'; tier = -1; }
      else {
        // follow the straight run through up to three junctions to the first turn
        let n: { x: number; z: number } = wp, count = 1, found = false;
        for (let i = 0; i < 3; i++) {
          const after = world.waypoint(n.x, n.z, car.yaw, dest.x, dest.z);
          if (Math.hypot(after.x - n.x, after.z - n.z) < 1) break;
          const b = Gps.bearing({ x: n.x, z: n.z, yaw: car.yaw }, after.x, after.z);
          if (Math.abs(b) > 0.7) {
            const right = b > 0;
            key = count === 1 ? (right ? 'right' : 'left')
              : count === 2 ? (right ? 'takeSecondRight' : 'takeSecondLeft')
              : (right ? 'takeThirdRight' : 'takeThirdLeft');
            node = Math.round(n.x) + ',' + Math.round(n.z);
            metres = Math.hypot(n.x - car.x, n.z - car.z) * U;
            found = true;
            break;
          }
          n = after; count++;
        }
        if (found) {
          if (key === 'left' || key === 'right') {
            tier = -1;
            for (const t of TIERS) if (metres > t.m) { tier = t.i; break; }
          }
        } else {
          // a long straight: name a landmark passed on one side, if there is one
          let best = 1e9;
          const fx = Math.sin(car.yaw), fz = Math.cos(car.yaw);
          for (const p of world.places) {
            if (p.name === dest.name) continue;
            const vx = p.x - car.x, vz = p.z - car.z;
            const fwd = vx * fx + vz * fz, lat = vx * -fz + vz * fx;
            if (fwd > 18 && fwd < 110 && Math.abs(lat) > 4 && Math.abs(lat) < 30 && fwd < best) { best = fwd; lm = p.name; lmSide = lat > 0 ? 1 : -1; }
          }
          if (lm) key = 'pastLandmark';
        }
      }
    }

    const base = `${key}|${node}|${lm}`;
    if (base !== this.lastBase) { this.lastBase = base; this.variant++; }
    const list = GPS_CUES[key].filter((c) => this.usable(c, key, tier, !!lm, lmSide));
    const cue = pick(list.length ? list : GPS_CUES[key], seed * 31 + this.variant * 7 + hash(key));
    const fill = (s: string) => s.replace('{place}', dest.name).replace('{landmark}', lm);
    let text = fill(cue.text);
    if (tier >= 0 && !cue.noDistance && !cue.near) text = `${GPS_DISTANCE_PREFIXES[Math.min(tier, GPS_DISTANCE_PREFIXES.length - 1)]} ${lowerFirst(text)}`;
    const es = cue.es && !/\{(landmark|street)\}/.test(cue.es) ? fill(cue.es) : null;
    return { id: `${base}|${tier}`, key, text, es: tier >= 0 && es ? null : es, metres: Math.round(metres) };
  }

  private usable(c: DirectionCue, key: DirectionCueKey, tier: number, hasLm: boolean, lmSide: number): boolean {
    if (/\{street\}/.test(c.text)) return false;
    if (/\{landmark\}/.test(c.text) && !hasLm) return false;
    if (key === 'pastLandmark') {
      if (/on your left/i.test(c.text) && lmSide >= 0) return false;
      if (/on your right/i.test(c.text) && lmSide <= 0) return false;
    }
    if (c.near) return false; // those quote a fixed distance we cannot promise
    if (key === 'left' || key === 'right' || key === 'almostLeft' || key === 'almostRight') {
      if (tier >= 0 && c.noDistance) return false;
    }
    return true;
  }
}
