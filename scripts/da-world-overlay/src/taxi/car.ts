/**
 * Taxi Rush — the cab: a model built here (no kit car is customisable enough)
 * and the arcade handling that drives it.
 *
 * The body is rounded boxes under a clear-coated paint (MeshPhysicalMaterial),
 * with tinted glass you can see the driver through, chrome or painted rims, a
 * roof sign that lights up after dark and a livery band on both flanks. All of
 * it is chosen on the setup screen and travels to the other players in a class.
 */
import {
  BoxGeometry,
  CanvasTexture,
  Color,
  CylinderGeometry,
  Group,
  Mesh,
  MeshPhysicalMaterial,
  MeshStandardMaterial,
  PlaneGeometry,
  RepeatWrapping,
  SRGBColorSpace,
  TorusGeometry,
} from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Character, type CharacterColors } from '../city/character';

export type Stripe = 'checker' | 'stripe' | 'flames' | 'none';
export type Rims = 'chrome' | 'black' | 'gold';
export type RoofSign = 'classic' | 'neon' | 'none';

export interface TaxiLook {
  color: string;
  stripe: Stripe;
  rims: Rims;
  roof: RoofSign;
  driver: CharacterColors;
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

/* ------------------------------------------------------------------ *
 * Textures                                                            *
 * ------------------------------------------------------------------ */

function liveryTexture(kind: Stripe, paint: string): CanvasTexture | null {
  if (kind === 'none') return null;
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 64;
  const c = cv.getContext('2d')!;
  if (kind === 'checker') {
    for (let x = 0; x < 32; x++) for (let y = 0; y < 4; y++) { c.fillStyle = (x + y) % 2 ? '#111' : '#f5f5f5'; c.fillRect(x * 16, y * 16, 16, 16); }
  } else if (kind === 'stripe') {
    c.fillStyle = paint === '#1f2329' ? '#ffcc1a' : '#1f2329'; c.fillRect(0, 0, 512, 64);
    c.fillStyle = '#ffffff'; c.fillRect(0, 26, 512, 12);
  } else {
    const g = c.createLinearGradient(0, 0, 512, 0);
    g.addColorStop(0, '#ffec5c'); g.addColorStop(0.45, '#ff8a1f'); g.addColorStop(1, 'rgba(232,40,30,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(0, 8);
    for (let x = 0; x <= 512; x += 32) { c.lineTo(x + 16, 4 + (x / 512) * 20); c.lineTo(x + 32, 30 + Math.sin(x) * 10); }
    c.lineTo(512, 60); c.lineTo(0, 60); c.closePath(); c.fill();
  }
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  t.wrapS = RepeatWrapping;
  return t;
}

function roofTexture(kind: RoofSign): CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 64;
  const c = cv.getContext('2d')!;
  c.fillStyle = kind === 'neon' ? '#1a0b2e' : '#fff6cc';
  c.fillRect(0, 0, 256, 64);
  c.font = '900 46px "Trebuchet MS",Arial,sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (kind === 'neon') { c.shadowColor = '#ff3df2'; c.shadowBlur = 14; c.fillStyle = '#ff7af6'; } else c.fillStyle = '#1b1b1b';
  c.fillText('TAXI', 128, 35);
  const t = new CanvasTexture(cv);
  t.colorSpace = SRGBColorSpace;
  return t;
}

/* ------------------------------------------------------------------ *
 * The model                                                           *
 * ------------------------------------------------------------------ */

const WHEEL_R = 0.27;
const geo = {
  body: new RoundedBoxGeometry(1.24, 0.44, 2.62, 5, 0.16),
  hood: new RoundedBoxGeometry(1.16, 0.12, 0.8, 4, 0.06),
  cabin: new RoundedBoxGeometry(1.08, 0.46, 1.36, 5, 0.15),
  roof: new RoundedBoxGeometry(1.1, 0.07, 1.16, 4, 0.035),
  bumper: new RoundedBoxGeometry(1.28, 0.16, 0.16, 4, 0.07),
  light: new RoundedBoxGeometry(0.26, 0.12, 0.06, 3, 0.03),
  tyre: new CylinderGeometry(WHEEL_R, WHEEL_R, 0.22, 24).rotateZ(Math.PI / 2),
  rim: new CylinderGeometry(WHEEL_R * 0.62, WHEEL_R * 0.62, 0.24, 18).rotateZ(Math.PI / 2),
  hub: new TorusGeometry(WHEEL_R * 0.45, 0.025, 6, 20).rotateY(Math.PI / 2),
  sign: new RoundedBoxGeometry(0.62, 0.2, 0.22, 3, 0.05),
  band: new PlaneGeometry(2.3, 0.16),
  mirror: new RoundedBoxGeometry(0.12, 0.09, 0.16, 3, 0.03),
  plate: new PlaneGeometry(0.42, 0.12),
};

export class TaxiModel {
  readonly group = new Group();
  readonly wheels: Group[] = [];
  private paint: MeshPhysicalMaterial;
  private signMat: MeshStandardMaterial | null = null;
  private brakeMat: MeshStandardMaterial;
  private headMat: MeshStandardMaterial;
  private driver: Character;

  constructor(readonly look: TaxiLook) {
    const g = this.group;
    this.paint = new MeshPhysicalMaterial({ color: look.color, metalness: 0.35, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, envMapIntensity: 1.3 });
    const glass = new MeshPhysicalMaterial({ color: '#16222e', metalness: 0.4, roughness: 0.04, transparent: true, opacity: 0.5, envMapIntensity: 1.6, depthWrite: false });
    const trim = new MeshStandardMaterial({ color: '#202327', roughness: 0.55, metalness: 0.3 });
    const chrome = new MeshStandardMaterial({ color: '#e8ecf0', roughness: 0.12, metalness: 1 });
    const rimMat = look.rims === 'chrome' ? chrome : look.rims === 'gold' ? new MeshStandardMaterial({ color: '#e0b24a', roughness: 0.2, metalness: 1 }) : new MeshStandardMaterial({ color: '#15171a', roughness: 0.35, metalness: 0.6 });
    const rubber = new MeshStandardMaterial({ color: '#141416', roughness: 0.9 });
    this.headMat = new MeshStandardMaterial({ color: '#fffbe8', emissive: new Color('#fff3c4'), emissiveIntensity: 0.4, roughness: 0.1 });
    this.brakeMat = new MeshStandardMaterial({ color: '#7a0d12', emissive: new Color('#ff2030'), emissiveIntensity: 0.5, roughness: 0.2 });

    const add = (geom: typeof geo.body, m: MeshStandardMaterial, x: number, y: number, z: number, cast = true): Mesh => {
      const mesh = new Mesh(geom, m); mesh.position.set(x, y, z); mesh.castShadow = cast; mesh.receiveShadow = true; g.add(mesh); return mesh;
    };
    add(geo.body, this.paint, 0, 0.47, 0);
    add(geo.hood, this.paint, 0, 0.71, 0.82);
    add(geo.cabin, glass, 0, 0.9, -0.12, false);
    add(geo.roof, this.paint, 0, 1.13, -0.14);
    // pillars: thin painted posts at the cabin corners so the glass reads as windows
    const pillar = new BoxGeometry(0.06, 0.42, 0.06);
    for (const sx of [-0.51, 0.51]) for (const sz of [0.52, -0.8]) add(pillar, this.paint, sx, 0.9, sz);
    add(geo.bumper, trim, 0, 0.36, 1.33);
    add(geo.bumper, trim, 0, 0.36, -1.33);
    for (const sx of [-0.4, 0.4]) {
      add(geo.light, this.headMat, sx, 0.56, 1.31, false);
      add(geo.light, this.brakeMat, sx, 0.56, -1.31, false);
      add(geo.mirror, this.paint, sx * 1.62, 0.84, 0.42);
    }
    // livery bands
    const tex = liveryTexture(look.stripe, look.color);
    if (tex) {
      const band = new MeshStandardMaterial({ map: tex, roughness: 0.35, metalness: 0.1, polygonOffset: true, polygonOffsetFactor: -2 });
      for (const s of [-1, 1]) {
        const m = new Mesh(geo.band, band);
        m.position.set(s * 0.623, 0.5, 0);
        m.rotation.y = s * Math.PI / 2;
        g.add(m);
      }
    }
    // plates
    const plateMat = new MeshStandardMaterial({ color: '#fffbe0', roughness: 0.5 });
    for (const [z, r] of [[1.42, 0], [-1.42, Math.PI]] as const) { const p = new Mesh(geo.plate, plateMat); p.position.set(0, 0.36, z); p.rotation.y = r; g.add(p); }
    // roof sign
    if (look.roof !== 'none') {
      const t = roofTexture(look.roof);
      this.signMat = new MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new Color('#ffffff'), emissiveIntensity: look.roof === 'neon' ? 1.6 : 0.6, roughness: 0.3 });
      add(geo.sign, this.signMat, 0, 1.27, -0.14);
    }
    // wheels
    for (const [x, z] of [[-0.6, 0.82], [0.6, 0.82], [-0.6, -0.86], [0.6, -0.86]]) {
      const w = new Group();
      w.position.set(x, WHEEL_R, z);
      const t = new Mesh(geo.tyre, rubber); t.castShadow = true;
      const r = new Mesh(geo.rim, rimMat);
      const h = new Mesh(geo.hub, rimMat); h.position.x = Math.sign(x) * 0.12;
      w.add(t, r, h);
      g.add(w);
      this.wheels.push(w);
    }
    // the driver, seated on the left, visible through the glass
    this.driver = new Character(look.driver, 0.5);
    this.driver.group.position.set(0.24, 0.32, -0.02);
    this.driver.update(0, 0);
    g.add(this.driver.group);
  }

  /** Per frame: wheels roll and steer, brake lights, the night glow. */
  animate(speed: number, steer: number, dt: number, braking: boolean, night: number): void {
    const roll = (speed * dt) / WHEEL_R;
    this.wheels.forEach((w, i) => {
      w.children[0].rotation.x += roll;
      w.children[1].rotation.x += roll;
      if (i < 2) w.rotation.y = steer * 0.45;
    });
    this.brakeMat.emissiveIntensity = braking ? 3.2 : 0.4 + night * 1.2;
    this.headMat.emissiveIntensity = 0.4 + night * 3;
    if (this.signMat) this.signMat.emissiveIntensity = (this.look.roof === 'neon' ? 1.6 : 0.6) + night * 1.6;
  }

  dispose(): void {
    this.group.traverse((o) => {
      if (o instanceof Mesh) {
        const m = o.material as MeshStandardMaterial;
        if (m !== undefined && !(Object.values(geo) as unknown[]).includes(o.geometry)) o.geometry.dispose();
        m.map?.dispose();
      }
    });
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
