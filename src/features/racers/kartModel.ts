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

const RB = (w: number, h: number, d: number, r: number) => new RoundedBoxGeometry(w, h, d, 3, r);
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

export interface Wheel { pivot: THREE.Object3D; spin: THREE.Object3D; r: number; front: boolean }

export class KartView {
  readonly root = new THREE.Group();
  readonly body = new THREE.Group();
  readonly wheels: Wheel[] = [];
  private steering = new THREE.Group();
  readonly exhaust = [new THREE.Vector3(-0.2, 0.48, -1.2), new THREE.Vector3(0.2, 0.48, -1.2)];
  private tail: THREE.MeshBasicMaterial;
  private driver: ToonActor | null = null;
  private legLen = 0.4;
  private parts: Record<string, THREE.Object3D> = {};
  private mat: THREE.MeshPhysicalMaterial;
  private squash = 0; private squashV = 0;
  private driftYaw = 0; private roll = 0; private pitch = 0; private trickA = 0;
  face: Face = 'smile';
  cheer = false;

  constructor(color: string) {
    this.mat = makeToonMaterial();
    const paint = new THREE.Color(color), dark = '#1d2230', accent = new THREE.Color(color).offsetHSL(0, 0.05, 0.22), seat = '#2a2f3d';
    const g = new KGeo();
    g.add(RB(1.02, 0.1, 1.95, 0.04), '#2b303b', 'metal', [0, 0.17, 0]);
    for (const sx of [-1, 1]) {
      g.add(RB(0.34, 0.28, 1.08, 0.12), paint, 'paint', [sx * 0.44, 0.33, -0.02]);
      g.add(RB(0.07, 0.02, 0.86, 0.008), '#ffffff', 'paint', [sx * 0.4, 0.473, -0.02]);
      g.add(RB(0.04, 0.02, 0.86, 0.008), accent, 'paint', [sx * 0.48, 0.47, -0.02]);
      g.add(CYL, '#ffffff', 'paint', [sx * 0.615, 0.34, 0.05], [0, 0, Math.PI / 2], [0.12, 0.012, 0.12]);
      g.add(CYL, accent, 'paint', [sx * 0.622, 0.34, 0.05], [0, 0, Math.PI / 2], [0.07, 0.008, 0.07]);
      // front fenders and wing end plates
      g.add(new THREE.TorusGeometry(0.29, 0.05, 10, 18, Math.PI), paint, 'paint', [sx * 0.64, 0.23, 0.62], [0, Math.PI / 2, 0]);
      g.add(RB(0.05, 0.17, 0.32, 0.02), paint, 'paint', [sx * 0.63, 0.24, 1.02]);
      // exhausts
      g.add(CYL, '#d7dce3', 'chrome', [sx * 0.2, 0.44, -1.0], [-1.3, 0, 0], [0.058, 0.44, 0.058]);
      g.add(CYL, '#30343c', 'metal', [sx * 0.2, 0.478, -1.205], [-1.3, 0, 0], [0.045, 0.02, 0.045]);
      // wing struts and end plates
      g.add(RB(0.05, 0.38, 0.09, 0.015), dark, 'plastic', [sx * 0.3, 0.68, -0.9]);
      g.add(RB(0.04, 0.24, 0.36, 0.015), dark, 'plastic', [sx * 0.6, 0.85, -0.92]);
    }
    g.add(SPH, paint, 'paint', [0, 0.3, 0.6], [0, 0, 0], [0.35, 0.17, 0.58]);
    g.add(SPH, '#ffffff', 'paint', [0, 0.306, 0.61], [0, 0, 0], [0.12, 0.172, 0.56]);
    g.add(RB(1.26, 0.07, 0.24, 0.03), dark, 'plastic', [0, 0.19, 1.03]);
    g.add(RB(0.62, 0.25, 0.88, 0.09), dark, 'plastic', [0, 0.32, 0]);
    g.add(RB(0.5, 0.5, 0.12, 0.05), seat, 'fabric', [0, 0.57, -0.36], [-0.24, 0, 0]);
    g.add(RB(0.48, 0.1, 0.44, 0.04), seat, 'fabric', [0, 0.38, -0.14]);
    g.add(new THREE.TorusGeometry(0.21, 0.035, 8, 20, Math.PI), '#d7dce3', 'chrome', [0, 0.66, -0.45]);
    g.add(CYL, '#9aa1ab', 'metal', [0, 0.47, 0.36], [0.95, 0, 0], [0.025, 0.36, 0.025]);
    g.add(RB(0.58, 0.31, 0.38, 0.06), '#3a404c', 'metal', [0, 0.36, -0.73]);
    for (const x of [-0.16, 0, 0.16]) g.add(CYL, '#cfd5dd', 'chrome', [x, 0.56, -0.74], [0, 0, 0], [0.05, 0.1, 0.05]);
    g.add(RB(0.3, 0.12, 0.2, 0.04), paint, 'paint', [0, 0.62, -0.62]);
    g.add(RB(1.2, 0.05, 0.32, 0.02), paint, 'paint', [0, 0.88, -0.93], [0.12, 0, 0]);
    g.add(RB(1.12, 0.1, 0.13, 0.04), dark, 'plastic', [0, 0.2, -1.03]);
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

    // lights
    const lights = new THREE.Mesh(
      mergeGeometries([new THREE.SphereGeometry(0.05, 12, 8).translate(-0.16, 0.33, 1.08), new THREE.SphereGeometry(0.05, 12, 8).translate(0.16, 0.33, 1.08)]),
      new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 1.5, 1.2), toneMapped: false }),
    );
    this.body.add(lights);
    this.tail = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.8, 0.05, 0.05), toneMapped: false });
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.05, 0.02), this.tail);
    tl.position.set(0, 0.27, -1.1);
    this.body.add(tl);

    // wheels
    for (const [x, y, z, r, w, front] of [[-0.64, 0.22, 0.62, 0.22, 0.2, true], [0.64, 0.22, 0.62, 0.22, 0.2, true], [-0.69, 0.28, -0.62, 0.28, 0.3, false], [0.69, 0.28, -0.62, 0.28, 0.3, false]] as const) {
      const wg = new KGeo();
      const sx = Math.sign(x);
      wg.add(tyre(r, w), '#202228', 'rubber', [0, 0, 0]);
      wg.add(CYL, '#dfe3ea', 'chrome', [0, 0, 0], [0, 0, Math.PI / 2], [r * 0.6, w * 0.82, r * 0.6]);
      wg.add(CYL, paint, 'paint', [sx * w * 0.43, 0, 0], [0, 0, Math.PI / 2], [r * 0.2, 0.03, r * 0.2]);
      for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; wg.add(RB(0.02, r * 0.5, r * 0.12, 0.01), '#aab1bb', 'metal', [sx * w * 0.38, Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3], [a, 0, 0]); }
      for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; wg.add(RB(w * 0.9, 0.03, 0.05, 0.01), '#26282e', 'rubber', [0, Math.cos(a) * (r + 0.005), Math.sin(a) * (r + 0.005)], [a, 0, 0]); }
      const pivot = new THREE.Group(), spin = new THREE.Group();
      pivot.position.set(x, y, z);
      const m = new THREE.Mesh(wg.build(), this.mat);
      m.castShadow = true;
      spin.add(m); pivot.add(spin);
      this.body.add(pivot);
      this.wheels.push({ pivot, spin, r, front });
    }
    this.root.add(this.body);
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
    this.root.quaternion.slerp(this.qc, 1 - Math.exp(-dt * (k.grounded ? 16 : 5)));

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
    this.root.removeFromParent();
  }
}
