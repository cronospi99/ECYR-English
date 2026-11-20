/**
 * Taxi Rush — the cab and the arcade handling that drives it.
 *
 * The default cab is the classic 1950s convertible built in classiccab.ts (fins,
 * chrome, checker band, TAXI sign on a hoop, red benches); the "Sport" body is
 * the GLB concept car of sportcar.ts, streamed only when it is chosen. Paint,
 * livery, rims and roof sign come from the setup screen and travel to the other
 * players in a class. On top of either body: the driver at the wheel, up to two
 * passengers on the back bench, and the body language of an arcade car — roll in
 * the corners, dive under braking, squat on the throttle, a bounce on landing,
 * front wheels that steer — all smoothed, and dead still when parked.
 */
import { Group, Vector3 } from 'three';
import { Character, type CharacterColors } from '../city/character';
import { buildSportCar, loadSportCar, onSportCar, type DriverSeat, type SportCar } from './sportcar';
import { buildClassicCab, type ClassicCab } from './classiccab';

export type Stripe = 'checker' | 'stripe' | 'flames' | 'none';
export type Rims = 'chrome' | 'black' | 'gold';
export type RoofSign = 'classic' | 'neon' | 'none';
export type CabBody = 'classic' | 'sport';

export interface TaxiLook {
  /** The cab number on the doors and the plate. */
  number?: string;
  color: string;
  stripe: Stripe;
  rims: Rims;
  roof: RoofSign;
  driver: CharacterColors;
  /** The 1950s convertible (default) or the modern sports car. */
  body?: CabBody;
}

export const PAINTS = ['#ffcc1a', '#f06b1f', '#e8384f', '#2bb673', '#2f7de1', '#8f5be8', '#ff6fb5', '#f2f2f2', '#1f2329'];
export const DRIVER_SHIRTS = ['#19b8e8', '#e8637c', '#4fbf8f', '#f0d060', '#8f5be8', '#e8a33f', '#f5f2e8', '#2c2f3a'];
export const DRIVER_SKINS = ['#f1c7a3', '#e0ac85', '#c58c62', '#8d5a3b', '#5c3a24'];
export const DRIVER_HAIR = ['#2b1a10', '#4a2b1d', '#c0662f', '#e5c27a', '#111111', '#8a8a8a', '#e94f8a'];
export const DRIVER_OUTFITS: CharacterColors['outfit'][] = ['cap', 'hat', 'glasses', undefined];

export const DEFAULT_LOOK: TaxiLook = {
  color: '#ffcc1a',
  stripe: 'checker',
  rims: 'chrome',
  roof: 'classic',
  driver: { shirt: '#19b8e8', pants: '#2d3a5a', skin: '#e0ac85', hair: '#2b1a10', outfit: 'cap' },
  body: 'classic',
};

const KEY = 'da-world:taxi-look';
export function loadLook(): TaxiLook {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) || 'null');
    if (v && typeof v.color === 'string' && v.driver) return { ...DEFAULT_LOOK, ...v, driver: { ...DEFAULT_LOOK.driver, ...v.driver } };
  } catch { /* ignore */ }
  return { ...DEFAULT_LOOK, driver: { ...DEFAULT_LOOK.driver } };
}
export function saveLook(l: TaxiLook): void {
  try { localStorage.setItem(KEY, JSON.stringify(l)); } catch { /* ignore */ }
}

/** The chase camera's field of view: 62° parked, opening to 74° at speed (spec §B). */
export function cabFov(speed: number, boost = false): number {
  return 62 + 12 * Math.min(1, Math.abs(speed) / (boost ? 20 : 26));
}

/* ------------------------------------------------------------------ *
 * The model                                                           *
 * ------------------------------------------------------------------ */

const DEG = Math.PI / 180;
/** Spec feedback: roll ±5° (±9° drifting), pitch 3° nose-down braking, 2.5° squat accelerating. */
const ROLL = 5 * DEG, ROLL_DRIFT = 9 * DEG, DIVE = 3 * DEG, SQUAT = 2.5 * DEG, LAND = 4 * DEG;
/** Lateral acceleration (game units/s²) that earns the full roll. */
const LAT_FULL = 26;
const APPEAR = 0.25, WAVE = 0.6;

interface Rider {
  person: Character;
  seat: DriverSeat;
  /** Hands/feet the IK reads every frame: a copy we can move (the wave). */
  pose: { hips: Vector3; hands: [Vector3, Vector3]; feet: [Vector3, Vector3]; recline: number };
  rest: Vector3;
  t: number;
  /** >0 while leaving: counts the wave, then the shrink. */
  leaving: number;
  wave: boolean;
}

export class TaxiModel {
  readonly group = new Group();
  private driver: Character;
  private classic: ClassicCab | null = null;
  private sport: SportCar | null = null;
  private unsubscribe: (() => void) | null = null;
  private riders: Rider[] = [];
  /* feedback state (smoothed) */
  private roll = 0;
  private pitch = 0;
  private heave = 0;
  private lastYaw = NaN;
  private lastSpeed = 0;
  private accel = 0;
  private yawRate = 0;
  private dist = 0;
  private landT = 1;
  private landK = 0;

  constructor(readonly look: TaxiLook) {
    this.driver = new Character(look.driver, 1);
    this.classic = buildClassicCab({ color: look.color, stripe: look.stripe, rims: look.rims, roof: look.roof, number: look.number ?? '07' });
    this.group.add(this.classic.root);
    this.seat(this.driver, this.classic.driver, this.classic.sprung);
    this.driver.update(0, 0);
    if (look.body === 'sport') {
      void loadSportCar();
      this.unsubscribe = onSportCar(() => this.useSportCar());
    }
  }

  /** Sit a person on a seat (pose given in the seat's own space, the person in its rig units). */
  private seat(person: Character, seat: DriverSeat, parent: Group, pose?: Rider['pose']): void {
    const k = seat.scale;
    const local = (p: Vector3): Vector3 => p.clone().divideScalar(k);
    person.group.scale.setScalar(k);
    person.group.position.set(0, 0, 0);
    person.group.rotation.set(0, 0, 0);
    parent.add(person.group);
    const p = pose ?? { hips: local(seat.hips), hands: [local(seat.hands[0]), local(seat.hands[1])] as [Vector3, Vector3], feet: [local(seat.feet[0]), local(seat.feet[1])] as [Vector3, Vector3], recline: seat.recline };
    person.setSeated(true, p);
  }

  private useSportCar(): void {
    this.unsubscribe = null;
    if (this.sport) return;
    const look = this.look;
    this.sport = buildSportCar({ color: look.color, stripe: look.stripe, rims: look.rims, roof: look.roof, number: look.number ?? '07' });
    if (!this.sport) return;
    // the classic cab stood in while the sports car streamed in
    this.clearRiders();
    this.classic?.dispose();
    this.classic = null;
    this.group.add(this.sport.root);
    this.seat(this.driver, this.sport.driver, this.group);
    this.driver.update(0, 0);
  }

  /** Passengers get in (one or two, on the back bench): they pop in over 0.25 s. Classic cab only. */
  boardPassengers(colors: CharacterColors[]): void {
    this.clearRiders();
    const cab = this.classic;
    if (!cab) return;
    colors.slice(0, cab.rear.length).forEach((c, i) => {
      const seat = cab.rear[i], k = seat.scale;
      const person = new Character(c, k);
      const pose = {
        hips: seat.hips.clone().divideScalar(k),
        hands: [seat.hands[0].clone().divideScalar(k), seat.hands[1].clone().divideScalar(k)] as [Vector3, Vector3],
        feet: [seat.feet[0].clone().divideScalar(k), seat.feet[1].clone().divideScalar(k)] as [Vector3, Vector3],
        recline: seat.recline,
      };
      this.seat(person, seat, cab.sprung, pose);
      // the outboard hand is the one that waves
      const out = seat.hips.x > 0 ? 0 : 1;
      const rider: Rider = { person, seat, pose, rest: pose.hands[out].clone(), t: 0, leaving: 0, wave: false };
      this.place(rider, 0);
      this.riders.push(rider);
    });
  }

  /** Passengers get out: a wave (0.6 s) when they arrived, then they pop out. */
  alight(wave = true): void {
    for (const r of this.riders) if (!r.leaving) { r.leaving = 1e-6; r.wave = wave; }
  }

  /** A landing (from a ramp or a big bump): the nose kicks 4° and bounces back over 0.4 s. */
  land(strength = 1): void {
    this.landT = 0;
    this.landK = Math.max(0, Math.min(1.5, strength));
  }

  private clearRiders(): void {
    for (const r of this.riders) { r.person.group.removeFromParent(); r.person.dispose(); }
    this.riders.length = 0;
  }

  /** Scale a rider about their own hips (0 → 1). */
  private place(r: Rider, s: number): void {
    const k = r.seat.scale * Math.max(0.001, s);
    r.person.group.scale.setScalar(k);
    r.person.group.position.copy(r.seat.hips).multiplyScalar(1 - Math.max(0.001, s));
  }

  private updateRiders(dt: number): void {
    for (let i = this.riders.length - 1; i >= 0; i--) {
      const r = this.riders[i];
      const out = r.seat.hips.x > 0 ? 0 : 1;
      if (r.leaving > 0) {
        r.leaving += dt;
        const waving = r.wave ? WAVE : 0;
        if (r.leaving < waving) {
          // the outboard hand goes up and waves
          const u = r.leaving / WAVE, up = Math.min(1, u * 4);
          const k = r.seat.scale, side = r.seat.hips.x > 0 ? 1 : -1;
          r.pose.hands[out].set(
            r.rest.x + (side * 0.12 / k) * up + (Math.sin(u * Math.PI * 6) * 0.07 / k) * up,
            r.rest.y + (0.75 / k) * up,
            r.rest.z - (0.1 / k) * up,
          );
        } else {
          r.pose.hands[out].copy(r.rest);
          const s = 1 - (r.leaving - waving) / APPEAR;
          if (s <= 0) { r.person.group.removeFromParent(); r.person.dispose(); this.riders.splice(i, 1); continue; }
          this.place(r, s);
        }
      } else if (r.t < APPEAR) {
        r.t = Math.min(APPEAR, r.t + dt);
        const s = r.t / APPEAR;
        this.place(r, 1 - (1 - s) * (1 - s));
      }
      r.person.update(dt, 0);
    }
  }

  /**
   * Per frame: the body on its springs, wheels that roll and steer, brake lights, the
   * night glow. The group's own yaw (set by the game before this call) gives the turn rate.
   */
  animate(speed: number, steer: number, dt: number, braking: boolean, night: number, drifting = false): void {
    const d = Math.min(0.1, Math.max(0, dt));
    // turn rate and longitudinal acceleration, measured (and smoothed) from frame to frame
    const yaw = this.group.rotation.y;
    if (d > 0) {
      let dy = Number.isNaN(this.lastYaw) ? 0 : yaw - this.lastYaw;
      if (dy > Math.PI) dy -= Math.PI * 2; else if (dy < -Math.PI) dy += Math.PI * 2;
      const kk = 1 - Math.pow(1 - 0.25, d * 60);
      this.yawRate += (dy / d - this.yawRate) * kk;
      this.accel += ((speed - this.lastSpeed) / d - this.accel) * kk;
    }
    this.lastYaw = yaw;
    this.lastSpeed = speed;
    const moving = Math.min(1, Math.abs(speed) / 1.5);
    // targets (three.js axes: +roll lifts the left (+x) side, +pitch drops the nose)
    const lat = Math.max(-1, Math.min(1, (this.yawRate * speed) / LAT_FULL)) * moving;
    const rollT = lat * (drifting ? ROLL_DRIFT : ROLL);
    const a = this.accel * moving;
    const pitchT = a < 0 ? Math.min(1, -a / 22) * DIVE : -Math.min(1, a / 12) * SQUAT;
    let heaveT = -0.012 * Math.abs(lat) - 0.01 * Math.min(1, Math.abs(a) / 20);
    // a little road under the tyres, by distance driven (nothing when parked)
    this.dist += Math.abs(speed) * d;
    heaveT += 0.004 * Math.min(1, Math.abs(speed) / 12) * Math.sin(this.dist * 2.1) * Math.sin(this.dist * 0.73);
    const k = 1 - Math.pow(1 - 0.12, d * 60);
    this.roll += (rollT - this.roll) * k;
    this.pitch += (pitchT - this.pitch) * k;
    this.heave += (heaveT - this.heave) * k;
    // landing: a 4° nose kick and a damped bounce over 0.4 s, on top of the smoothed pose
    let kick = 0, sink = 0;
    if (this.landT < 0.4) {
      this.landT += d;
      const u = Math.min(1, this.landT / 0.4), f = Math.cos(u * Math.PI * 2.5) * (1 - u) * this.landK;
      kick = -LAND * f;
      sink = -0.05 * f;
    }
    // parked and settled: snap to rest so nothing shimmers
    if (moving === 0 && this.landT >= 0.4 && Math.abs(this.roll) + Math.abs(this.pitch) < 1e-4) { this.roll = 0; this.pitch = 0; this.heave = 0; }

    if (this.sport) {
      this.sport.root.rotation.set(this.pitch + kick, 0, this.roll);
      this.sport.root.position.y = (this.heave + sink) * 0.68;
      this.sport.animate(speed, steer, dt, braking, night);
    } else if (this.classic) {
      this.classic.animate(speed, steer, dt, braking, night, this.roll, this.pitch + kick, this.heave + sink);
    }
    this.driver.update(dt, 0);
    this.updateRiders(d);
  }

  dispose(): void {
    this.unsubscribe?.();
    this.clearRiders();
    this.driver.dispose();
    this.classic?.dispose();
    this.sport?.dispose();
    this.group.removeFromParent();
  }
}

/* ------------------------------------------------------------------ *
 * Handling                                                            *
 * ------------------------------------------------------------------ */

export interface DriveInput {
  throttle: number; // 0..1
  brake: number; // 0..1 (brake, then reverse)
  steer: number; // -1..1, left negative
  handbrake: boolean;
  boost: boolean;
}

export interface Solid {
  drivable(x: number, z: number): boolean;
}

export class CarBody {
  x = 0;
  z = 0;
  yaw = 0;
  /** Velocity in world space. */
  vx = 0;
  vz = 0;
  steer = 0;
  boostFuel = 1;
  /** Seconds since the last bump, for the camera shake and the "crash" sound. */
  bump = 0;
  drifting = false;

  get speed(): number {
    return this.vx * Math.sin(this.yaw) + this.vz * Math.cos(this.yaw);
  }

  update(dt: number, inp: DriveInput, world: Solid): { hit: boolean } {
    const fx = Math.sin(this.yaw), fz = Math.cos(this.yaw);
    let fwd = this.speed;
    const boosting = inp.boost && this.boostFuel > 0.02 && inp.throttle > 0;
    const top = boosting ? 31 : 22;
    if (boosting) this.boostFuel = Math.max(0, this.boostFuel - dt * 0.35);
    else this.boostFuel = Math.min(1, this.boostFuel + dt * 0.12);

    if (inp.throttle > 0) fwd += (fwd < 0 ? 30 : boosting ? 20 : 13) * inp.throttle * dt;
    if (inp.brake > 0) fwd -= (fwd > 0.5 ? 30 : 9) * inp.brake * dt;
    if (!inp.throttle && !inp.brake) fwd *= Math.pow(0.55, dt);
    fwd = Math.max(-8, Math.min(top, fwd));
    if (fwd > top) fwd = top;

    // steering: sharper at low speed, never a spin on the spot
    this.steer += (inp.steer - this.steer) * Math.min(1, dt * 8);
    const grip = Math.min(1, Math.abs(fwd) / 5);
    const turn = (inp.handbrake ? 3.3 : 2.35) * (1 - Math.min(0.45, Math.abs(fwd) / 70));
    this.yaw -= this.steer * turn * grip * Math.sign(fwd || 1) * dt;

    // velocity bends towards the new heading; the handbrake lets it slide (drift)
    const nfx = Math.sin(this.yaw), nfz = Math.cos(this.yaw);
    const tvx = nfx * fwd, tvz = nfz * fwd;
    const g = inp.handbrake ? 1.6 : 9;
    this.vx += (tvx - this.vx) * Math.min(1, g * dt);
    this.vz += (tvz - this.vz) * Math.min(1, g * dt);
    if (inp.handbrake) { this.vx *= Math.pow(0.7, dt); this.vz *= Math.pow(0.7, dt); }
    const lateral = Math.abs(this.vx * nfz - this.vz * nfx);
    this.drifting = lateral > 3 && Math.abs(fwd) > 8;
    void fx; void fz;

    // move, sliding along walls
    let hit = false;
    const nx = this.x + this.vx * dt, nz = this.z + this.vz * dt;
    if (this.fits(world, nx, nz, this.yaw)) { this.x = nx; this.z = nz; }
    else if (this.fits(world, nx, this.z, this.yaw)) { this.x = nx; this.vz *= -0.2; hit = Math.abs(this.vz) > 3; }
    else if (this.fits(world, this.x, nz, this.yaw)) { this.z = nz; this.vx *= -0.2; hit = Math.abs(this.vx) > 3; }
    else { hit = Math.hypot(this.vx, this.vz) > 3; this.vx *= -0.3; this.vz *= -0.3; }
    if (hit) this.bump = 0;
    this.bump += dt;
    return { hit };
  }

  /** Front, middle and back of the car, both sides. */
  fits(world: Solid, x: number, z: number, yaw: number): boolean {
    const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = fz, rz = -fx;
    for (const a of [1.2, 0, -1.2]) for (const b of [0.55, -0.55]) {
      if (!world.drivable(x + fx * a + rx * b, z + fz * a + rz * b)) return false;
    }
    return true;
  }

  /** Bounce off another car (a circle). */
  push(ox: number, oz: number, r: number): boolean {
    const dx = this.x - ox, dz = this.z - oz, d = Math.hypot(dx, dz);
    if (d > r || d < 0.001) return false;
    const nx = dx / d, nz = dz / d;
    this.x = ox + nx * r;
    this.z = oz + nz * r;
    const vn = this.vx * nx + this.vz * nz;
    if (vn < 0) { this.vx -= 1.6 * vn * nx; this.vz -= 1.6 * vn * nz; this.vx *= 0.6; this.vz *= 0.6; }
    this.bump = 0;
    return true;
  }
}
