/* English Racers — the kart, built in code with the same soft PBR "vinyl toy" material as the
   teachers (the material class rides in the vertex colour's alpha: glossy paint with a clear
   coat, plastic, fabric, rubber, chrome, metal). Body in the teacher's colour, big rear tyres,
   twin exhausts (the turbo flames come out of them), a wing, fenders and a working steering
   wheel; the teacher sits in it with a driving pose that leans into the turns. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { makeToonMaterial, type ToonActor, type Face } from '@/features/toons3d/runtime';
import type { Kart } from './kart';

/** Material classes (alpha): < .5 non-metal with roughness a·2; ≥ .5 metal with roughness (a−.5)·2. */
const A = { paint: 0.07, plastic: 0.2, fabric: 0.42, rubber: 0.45, chrome: 0.52, metal: 0.62 } as const;
type Cls = keyof typeof A;

class KGeo {
  parts: THREE.BufferGeometry[] = [];
  private c = new THREE.Color();
  private m = new THREE.Matrix4();
  private q = new THREE.Quaternion();
  add(g: THREE.BufferGeometry, color: THREE.ColorRepresentation, cls: Cls, p: [number, number, number], r: [number, number, number] = [0, 0, 0], s: [number, number, number] = [1, 1, 1]) {
    const geo = g.index ? g.toNonIndexed() : g.clone();
    for (const k of Object.keys(geo.attributes)) if (k !== 'position' && k !== 'normal') geo.deleteAttribute(k);
    this.m.compose(new THREE.Vector3(...p), this.q.setFromEuler(new THREE.Euler(...r)), new THREE.Vector3(...s));
    geo.applyMatrix4(this.m);
    this.c.set(color);
    const n = geo.getAttribute('position').count, a = new Float32Array(n * 4);
    for (let i = 0; i < n; i++) a.set([this.c.r, this.c.g, this.c.b, A[cls]], i * 4);
    geo.setAttribute('color', new THREE.BufferAttribute(a, 4));
    this.parts.push(geo);
    return this;
  }
  build() { const g = mergeGeometries(this.parts, false); this.parts.forEach((p) => p.dispose()); this.parts = []; return g; }
}

/** Rounded box; small radii get fewer segments (a 3-segment box is ~1.7k vertices). */
const RB = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, r < 0.025 ? 1 : r < 0.06 ? 2 : 3, r);
const BOX = new THREE.BoxGeometry(1, 1, 1);
const SPH = new THREE.SphereGeometry(1, 28, 18);
const CYL = new THREE.CylinderGeometry(1, 1, 1, 22);

function tyre(R: number, W: number) {
  const pts: THREE.Vector2[] = [];
  const r0 = R * 0.6, b = Math.min(0.05, W * 0.22);
  pts.push(new THREE.Vector2(r0, -W / 2));
  for (let k = 0; k <= 4; k++) { const a = -Math.PI / 2 + (k / 4) * (Math.PI / 2); pts.push(new THREE.Vector2(R - b + Math.cos(a) * b, -W / 2 + b + Math.sin(a) * b)); }
  for (let k = 0; k <= 4; k++) { const a = (k / 4) * (Math.PI / 2); pts.push(new THREE.Vector2(R - b + Math.cos(a) * b, W / 2 - b + Math.sin(a) * b)); }
  pts.push(new THREE.Vector2(r0, W / 2));
  const g = new THREE.LatheGeometry(pts, 28);
  g.rotateZ(Math.PI / 2);
  return g;
}

/** A round number plate: white disc, coloured ring, the driver's initial. */
function roundel(label: string, color: string) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d')!;
  c.beginPath(); c.arc(64, 64, 60, 0, 7); c.fillStyle = '#10204a'; c.fill();
  c.beginPath(); c.arc(64, 64, 53, 0, 7); c.fillStyle = color; c.fill();
  c.beginPath(); c.arc(64, 64, 44, 0, 7); c.fillStyle = '#ffffff'; c.fill();
  c.fillStyle = '#10204a'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.font = 'italic 900 62px Inter, system-ui, sans-serif';
  c.fillText((label || '★').slice(0, 1).toUpperCase(), 66, 69);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** Radial falloff for the contact shadow. */
function blobTex() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const c = cv.getContext('2d')!;
  const g = c.createRadialGradient(32, 32, 4, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  c.fillStyle = g; c.fillRect(0, 0, 64, 64);
  return new THREE.CanvasTexture(cv);
}

export interface Wheel { pivot: THREE.Object3D; spin: THREE.Object3D; r: number; front: boolean }

export class KartView {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly wheels: Wheel[] = [];
  private steering = new THREE.Group();
  readonly exhaust = [new THREE.Vector3(-0.2, 0.48, -1.2), new THREE.Vector3(0.2, 0.48, -1.2)];
  private tail: THREE.MeshBasicMaterial;
  private decal: THREE.MeshStandardMaterial;
  private blob: THREE.Mesh;
  private driver: ToonActor | null = null;
  private legLen = 0.4;
  private parts: Record<string, THREE.Object3D> = {};
  private mat: THREE.MeshPhysicalMaterial;
  private squash = 0; private squashV = 0;
  private driftYaw = 0; private roll = 0; private pitch = 0; private trickA = 0;
  face: Face = 'smile';
  cheer = false;

  constructor(color: string, label = '') {
    this.mat = makeToonMaterial();
    const paint = new THREE.Color(color), dark = '#1d2230', accent = new THREE.Color(color).offsetHSL(0, 0.05, 0.22), deep = new THREE.Color(color).offsetHSL(0, 0, -0.16), seat = '#2a2f3d';
    const g = new KGeo();
    // chassis tray, side pods with intakes and stripes
    g.add(RB(1.02, 0.1, 1.95, 0.04), '#2b303b', 'metal', [0, 0.17, 0]);
    for (const sx of [-1, 1]) {
      g.add(RB(0.34, 0.28, 1.08, 0.12), paint, 'paint', [sx * 0.44, 0.33, -0.02]);
      g.add(RB(0.3, 0.08, 1.0, 0.035), deep, 'paint', [sx * 0.45, 0.215, -0.02]);
      g.add(RB(0.07, 0.02, 0.86, 0.008), '#ffffff', 'paint', [sx * 0.4, 0.473, -0.02]);
      g.add(RB(0.04, 0.02, 0.86, 0.008), accent, 'paint', [sx * 0.48, 0.47, -0.02]);
      g.add(RB(0.2, 0.16, 0.06, 0.03), '#14161c', 'plastic', [sx * 0.47, 0.34, 0.52]);
      for (const dy of [-0.04, 0, 0.04]) g.add(RB(0.17, 0.012, 0.02, 0.005), '#3a404c', 'metal', [sx * 0.47, 0.34 + dy, 0.555]);
      // front suspension arm, fender and wing end plates
      g.add(CYL, '#9aa1ab', 'metal', [sx * 0.43, 0.22, 0.62], [0, 0, Math.PI / 2], [0.025, 0.42, 0.025]);
      g.add(CYL, '#9aa1ab', 'metal', [sx * 0.43, 0.27, 0.62], [0, 0, Math.PI / 2 + sx * 0.18], [0.018, 0.4, 0.018]);
      g.add(new THREE.TorusGeometry(0.29, 0.05, 10, 18, Math.PI), paint, 'paint', [sx * 0.64, 0.23, 0.62], [0, Math.PI / 2, 0]);
      g.add(new THREE.TorusGeometry(0.29, 0.016, 6, 18, Math.PI), '#ffffff', 'paint', [sx * 0.64, 0.23, 0.62], [0, Math.PI / 2, 0], [1.02, 1.02, 1.6]);
      g.add(RB(0.05, 0.17, 0.32, 0.02), paint, 'paint', [sx * 0.63, 0.24, 1.02]);
      // rear axle stub and fender lip over the big tyres
      g.add(CYL, '#9aa1ab', 'metal', [sx * 0.5, 0.28, -0.62], [0, 0, Math.PI / 2], [0.035, 0.3, 0.035]);
      g.add(RB(0.36, 0.05, 0.62, 0.02), paint, 'paint', [sx * 0.69, 0.6, -0.62]);
      g.add(RB(0.37, 0.02, 0.2, 0.008), '#ffffff', 'paint', [sx * 0.69, 0.628, -0.62]);
      g.add(RB(0.04, 0.1, 0.5, 0.015), deep, 'paint', [sx * 0.52, 0.55, -0.62]);
      // exhausts
      g.add(CYL, '#d7dce3', 'chrome', [sx * 0.2, 0.44, -1.0], [-1.3, 0, 0], [0.058, 0.44, 0.058]);
      g.add(CYL, '#30343c', 'metal', [sx * 0.2, 0.478, -1.205], [-1.3, 0, 0], [0.045, 0.02, 0.045]);
      g.add(new THREE.TorusGeometry(0.058, 0.012, 6, 14), '#eef1f5', 'chrome', [sx * 0.2, 0.48, -1.21], [-1.3 + Math.PI / 2, 0, 0]);
      // wing struts and end plates
      g.add(RB(0.05, 0.38, 0.09, 0.015), dark, 'plastic', [sx * 0.3, 0.68, -0.9]);
      g.add(RB(0.04, 0.26, 0.38, 0.015), paint, 'paint', [sx * 0.61, 0.85, -0.92]);
      g.add(RB(0.045, 0.06, 0.39, 0.012), '#ffffff', 'paint', [sx * 0.61, 0.95, -0.92]);
      // rear lamp housings (the lamps themselves glow, see below)
      g.add(RB(0.2, 0.12, 0.05, 0.03), '#14161c', 'plastic', [sx * 0.34, 0.25, -1.1]);
    }
    // nose with a white racing stripe, front bumper and splitter
    g.add(SPH, paint, 'paint', [0, 0.3, 0.6], [0, 0, 0], [0.35, 0.17, 0.58]);
    g.add(SPH, '#ffffff', 'paint', [0, 0.306, 0.61], [0, 0, 0], [0.12, 0.172, 0.56]);
    g.add(SPH, '#14161c', 'plastic', [0, 0.25, 1.06], [0, 0, 0], [0.2, 0.06, 0.08]);
    g.add(RB(1.26, 0.07, 0.24, 0.03), dark, 'plastic', [0, 0.19, 1.03]);
    g.add(RB(1.28, 0.02, 0.06, 0.01), accent, 'paint', [0, 0.226, 1.12]);
    // cockpit tub, dash, seat with a painted headrest and a roll hoop
    g.add(RB(0.62, 0.25, 0.88, 0.09), dark, 'plastic', [0, 0.32, 0]);
    g.add(RB(0.56, 0.12, 0.2, 0.05), paint, 'paint', [0, 0.46, 0.34], [0.35, 0, 0]);
    g.add(RB(0.5, 0.5, 0.12, 0.05), seat, 'fabric', [0, 0.57, -0.36], [-0.24, 0, 0]);
    g.add(RB(0.46, 0.22, 0.13, 0.05), paint, 'paint', [0, 0.82, -0.43], [-0.24, 0, 0]);
    g.add(RB(0.48, 0.1, 0.44, 0.04), seat, 'fabric', [0, 0.38, -0.14]);
    g.add(new THREE.TorusGeometry(0.21, 0.035, 8, 20, Math.PI), '#d7dce3', 'chrome', [0, 0.71, -0.53]);
    g.add(CYL, '#9aa1ab', 'metal', [0, 0.47, 0.36], [0.95, 0, 0], [0.025, 0.36, 0.025]);
    // engine: painted cover with vents, chrome intakes, block underneath
    g.add(RB(0.58, 0.26, 0.38, 0.06), '#3a404c', 'metal', [0, 0.33, -0.75]);
    g.add(RB(0.62, 0.2, 0.42, 0.08), paint, 'paint', [0, 0.5, -0.76]);
    for (const x of [-0.18, 0.18]) for (const dz of [-0.08, 0, 0.08]) g.add(RB(0.14, 0.012, 0.035, 0.006), '#14161c', 'plastic', [x, 0.603, -0.76 + dz]);
    for (const x of [-0.07, 0.07]) {
      g.add(CYL, '#cfd5dd', 'chrome', [x, 0.63, -0.72], [0, 0, 0], [0.05, 0.1, 0.05]);
      g.add(CYL, '#14161c', 'plastic', [x, 0.682, -0.72], [0, 0, 0], [0.036, 0.008, 0.036]);
    }
    g.add(RB(1.2, 0.05, 0.32, 0.02), paint, 'paint', [0, 0.88, -0.93], [0.12, 0, 0]);
    g.add(RB(1.12, 0.012, 0.08, 0.006), '#ffffff', 'paint', [0, 0.907, -0.9], [0.12, 0, 0]);
    g.add(RB(1.12, 0.03, 0.08, 0.01), dark, 'plastic', [0, 0.84, -1.07], [0.5, 0, 0]);
    // rear bumper in the body colour with a diffuser below
    g.add(RB(1.12, 0.12, 0.13, 0.045), paint, 'paint', [0, 0.2, -1.03]);
    g.add(RB(0.8, 0.06, 0.14, 0.02), dark, 'plastic', [0, 0.12, -1.02]);
    for (const x of [-0.24, -0.08, 0.08, 0.24]) g.add(RB(0.015, 0.07, 0.12, 0.005), '#3a404c', 'metal', [x, 0.12, -1.04]);
    const shell = new THREE.Mesh(g.build(), this.mat);
    shell.castShadow = true;
    this.body.add(shell);

    // steering wheel
    const sw = new KGeo();
    sw.add(new THREE.TorusGeometry(0.14, 0.024, 8, 24), '#1b1d22', 'rubber', [0, 0, 0]);
    sw.add(CYL, paint, 'paint', [0, 0, 0], [Math.PI / 2, 0, 0], [0.05, 0.04, 0.05]);
    for (const a of [0, Math.PI * 0.75, Math.PI * 1.25]) sw.add(RB(0.022, 0.13, 0.02, 0.008), '#9aa1ab', 'metal', [Math.sin(a) * 0.065, -Math.cos(a) * 0.065, 0], [0, 0, a]);
    const swm = new THREE.Mesh(sw.build(), this.mat);
    swm.castShadow = true;
    this.steering.add(swm);
    this.steering.position.set(0, 0.62, 0.24);
    this.steering.rotation.x = -0.95;
    this.body.add(this.steering);

    // lights: headlights, and two round tail lamps that flare when braking
    const lights = new THREE.Mesh(
      mergeGeometries([new THREE.SphereGeometry(0.05, 12, 8).translate(-0.16, 0.33, 1.08), new THREE.SphereGeometry(0.05, 12, 8).translate(0.16, 0.33, 1.08)]),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.2), toneMapped: false }),
    );
    this.body.add(lights);
    this.tail = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.05, 0.05), toneMapped: false });
    const tl = new THREE.Mesh(mergeGeometries([-0.34, 0.34].flatMap((x) => [-0.045, 0.045].map((dx) => new THREE.CylinderGeometry(0.04, 0.04, 0.03, 14).rotateX(Math.PI / 2).translate(x + dx, 0.25, -1.13)))), this.tail);
    this.body.add(tl);

    // number roundels with the driver's initial (nose, both pods, rear)
    this.decal = new THREE.MeshStandardMaterial({ map: roundel(label, color), transparent: true, alphaTest: 0.4, roughness: 0.25, polygonOffset: true, polygonOffsetFactor: -2 });
    const disc = new THREE.PlaneGeometry(1, 1);
    for (const [p, r, s] of [
      [[0, 0.483, 0.6], [-Math.PI / 2 + 0.06, 0, 0], 0.2],
      [[-0.614, 0.33, 0.06], [0, -Math.PI / 2, 0], 0.18],
      [[0.614, 0.33, 0.06], [0, Math.PI / 2, 0], 0.18],
      [[0, 0.5, -0.975], [0, Math.PI, 0], 0.15],
    ] as [[number, number, number], [number, number, number], number][]) {
      const m = new THREE.Mesh(disc, this.decal);
      m.position.set(...p); m.rotation.set(...r); m.scale.setScalar(s);
      this.body.add(m);
    }

    // wheels: rubber tyres with a fine tread and a white sidewall band, chrome rims
    for (const [x, y, z, r, w, front] of [[-0.64, 0.22, 0.62, 0.22, 0.2, true], [0.64, 0.22, 0.62, 0.22, 0.2, true], [-0.69, 0.28, -0.62, 0.28, 0.3, false], [0.69, 0.28, -0.62, 0.28, 0.3, false]] as const) {
      const wg = new KGeo();
      const sx = Math.sign(x);
      wg.add(tyre(r, w), '#202228', 'rubber', [0, 0, 0]);
      wg.add(new THREE.TorusGeometry(r * 0.8, r * 0.035, 6, 32), '#e9ecef', 'rubber', [sx * w * 0.5, 0, 0], [0, Math.PI / 2, 0]);
      wg.add(CYL, '#dfe3ea', 'chrome', [0, 0, 0], [0, 0, Math.PI / 2], [r * 0.6, w * 0.82, r * 0.6]);
      wg.add(CYL, '#8d949e', 'metal', [sx * w * 0.42, 0, 0], [0, 0, Math.PI / 2], [r * 0.5, 0.02, r * 0.5]);
      wg.add(CYL, paint, 'paint', [sx * w * 0.45, 0, 0], [0, 0, Math.PI / 2], [r * 0.2, 0.03, r * 0.2]);
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; wg.add(RB(0.02, r * 0.5, r * 0.12, 0.01), '#cfd5dd', 'chrome', [sx * w * 0.44, Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3], [a, 0, 0]); }
      const nT = front ? 22 : 26;
      for (let k = 0; k < nT; k++) {
        const a = (k / nT) * Math.PI * 2;
        for (const side of [-1, 1]) wg.add(BOX, '#26282e', 'rubber', [side * w * 0.22, Math.cos(a + side * 0.07) * (r + 0.004), Math.sin(a + side * 0.07) * (r + 0.004)], [a + side * 0.07, side * 0.35, 0], [w * 0.4, 0.016, 0.045]);
      }
      const pivot = new THREE.Group(), spin = new THREE.Group();
      pivot.position.set(x, y, z);
      const m = new THREE.Mesh(wg.build(), this.mat);
      m.castShadow = true;
      spin.add(m); pivot.add(spin);
      this.body.add(pivot);
      this.wheels.push({ pivot, spin, r, front });
    }
    this.root.add(this.body);

    // soft contact shadow that stays on the ground (grounds the kart even with blurry shadow maps)
    this.blob = new THREE.Mesh(new THREE.PlaneGeometry(1.9, 2.7).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ map: blobTex(), color: 0x000000, transparent: true, opacity: 0.5, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 }));
    this.blob.renderOrder = 1;
    this.root.add(this.blob);
  }

  /** Seat a teacher in the kart. */
  setDriver(actor: ToonActor) {
    if (this.driver) this.driver.object.removeFromParent();
    this.driver = actor;
    const o = actor.object;
    o.scale.setScalar(1);
    o.position.set(0, 0, 0);
    o.rotation.set(0, 0, 0);
    o.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(o);
    const s = 1.12 / Math.max(0.2, box.max.y - box.min.y);
    o.scale.setScalar(s);
    this.parts = {};
    for (const n of ['hips', 'legL', 'legR', 'chest', 'armL', 'armR', 'head']) { const p = o.getObjectByName(n); if (p) this.parts[n] = p; }
    this.legLen = this.parts.hips?.position.y ?? 0.4;
    o.position.set(0, 0.42 - this.legLen * s, -0.16);
    o.traverse((m) => { if ((m as THREE.Mesh).isMesh) m.castShadow = true; });
    this.body.add(o);
    actor.play('idle', 0);
  }

  bump(impact: number) { this.squashV -= Math.min(5, impact * 0.5); }

  private qa = new THREE.Quaternion(); private qb = new THREE.Quaternion(); private qc = new THREE.Quaternion();
  private n = new THREE.Vector3(); private up = new THREE.Vector3(0, 1, 0); private ax = new THREE.Vector3(1, 0, 0);

  update(dt: number, k: Kart, t: number, braking: boolean) {
    const q = k.q;
    this.root.position.copy(k.pos);
    // align to the road surface (or pitch with the jump in the air)
    this.qa.setFromAxisAngle(this.up, k.yaw);
    if (k.grounded && q) {
      this.n.set(-(q.slope * q.t.x + q.bank * q.r.x), 1, -(q.slope * q.t.z + q.bank * q.r.z)).normalize();
      this.qb.setFromUnitVectors(this.up, this.n);
      this.qc.copy(this.qb).multiply(this.qa);
    } else {
      const pitch = -Math.atan2(k.vel.y, Math.max(6, k.speed)) * 0.55;
      this.qc.copy(this.qa).multiply(this.qb.setFromAxisAngle(this.ax, pitch));
    }
    if (k.orient) this.qc.copy(k.orient); // riding a loop: the ribbon decides
    this.root.quaternion.slerp(this.qc, 1 - Math.exp(-dt * (k.orient ? 40 : k.grounded ? 16 : 5)));

    // body: drift angle, lean, pitch, squash, kerb rumble, trick roll
    this.driftYaw += (-k.drift * 0.38 - this.driftYaw) * Math.min(1, dt * 7);
    this.roll += (THREE.MathUtils.clamp(k.yawRate * k.speed * 0.0045, -0.08, 0.08) - this.roll) * Math.min(1, dt * 8);
    this.pitch += (-THREE.MathUtils.clamp(k.accelNow * 0.0028, -0.05, 0.07) - this.pitch) * Math.min(1, dt * 6);
    this.squashV += (-this.squash * 220 - this.squashV * 14) * dt;
    this.squash += this.squashV * dt;
    if (k.trick) this.trickA = Math.min(1, k.trickT / 0.36);
    else if (this.trickA > 0) this.trickA = this.trickA >= 1 ? 0 : Math.min(1, this.trickA + dt / 0.36);
    const rumble = k.grounded && k.speed > 4 ? (k.surface === 'kerb' ? Math.sin(t * 75) * 0.012 : k.surface === 'grass' ? (Math.random() - 0.5) * 0.03 : 0) : 0;
    this.body.position.y = rumble + this.squash * 0.3;
    this.body.scale.set(1 - this.squash * 0.25, 1 + this.squash, 1 - this.squash * 0.25);
    // contact shadow on the ground under the kart (fades and spreads with height)
    const h = k.q && k.q.ground !== null ? Math.max(0, k.pos.y - k.q.ground) : 8;
    this.blob.position.y = 0.03 - h;
    const bo = Math.max(0, 1 - h / 5);
    (this.blob.material as THREE.MeshBasicMaterial).opacity = 0.5 * bo;
    this.blob.scale.setScalar(1 + h * 0.12);
    this.blob.visible = bo > 0.02;
    this.body.rotation.set(this.pitch, this.driftYaw + (k.drift ? Math.sin(t * 22) * 0.012 : 0), this.roll + this.trickA * Math.PI * 2, 'YXZ');

    // wheels and steering wheel
    for (const w of this.wheels) {
      w.spin.rotation.x += (k.fwd * dt) / w.r;
      if (w.front) w.pivot.rotation.y = -k.steer * 0.42 + (k.drift ? k.drift * 0.25 : 0);
    }
    this.steering.rotation.z = k.steer * 1.3;
    this.tail.color.setRGB(braking ? 2.4 : 0.8, 0.06, 0.06);

    // the driver: sitting, hands on the wheel, leaning into turns
    const d = this.driver;
    if (d) {
      d.setFace(this.face);
      d.update(dt);
      const P = this.parts, st = k.steer;
      P.hips?.rotation.set(0, 0, 0);
      P.legL?.rotation.set(-1.42, 0, -0.07);
      P.legR?.rotation.set(-1.42, 0, 0.07);
      P.chest?.rotation.set(k.boostT > 0 ? 0.12 : -0.06, -st * 0.14, st * 0.14 - this.roll * 1.5);
      if (this.cheer) {
        const w = Math.sin(t * 9) * 0.25;
        P.armL?.rotation.set(0, 0, 2.5 + w);
        P.armR?.rotation.set(0, 0, -2.5 + w);
      } else {
        P.armL?.rotation.set(-1.12 + st * 0.28, 0, 0.3);
        P.armR?.rotation.set(-1.12 - st * 0.28, 0, -0.3);
      }
      P.head?.rotation.set(0.06, -st * 0.32, 0);
    }
  }

  /** World positions of the exhaust tips. */
  exhaustWorld(out: THREE.Vector3[]) {
    this.body.updateWorldMatrix(true, false);
    for (let i = 0; i < 2; i++) out[i].copy(this.exhaust[i]).applyMatrix4(this.body.matrixWorld);
    return out;
  }
  /** World position of a rear tyre's contact patch (side −1 / +1). */
  rearContact(side: number, out: THREE.Vector3) {
    out.set(side * 0.69, 0.02, -0.62).applyMatrix4(this.body.matrixWorld);
    return out;
  }

  dispose() {
    this.driver?.object.removeFromParent();
    this.root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && !o.name.startsWith('toon')) m.geometry.dispose(); });
    this.mat.dispose();
    this.decal.map?.dispose(); this.decal.dispose();
    const bm = this.blob.material as THREE.MeshBasicMaterial; bm.map?.dispose(); bm.dispose();
    this.root.removeFromParent();
  }
}
