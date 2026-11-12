/* Language Defenders — procedural 3D character kit.
   Every character is modelled in code: rounded primitives are merged per limb into a few meshes
   that share ONE vertex-coloured PBR material per instance. That keeps a full board (dozens of
   characters) cheap to draw, and lets the engine tint or fade a character by touching a single
   material (hit flash, slow, defeat). Characters are built facing +Z in a unit-height space and
   then turned towards their lane direction. */
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

export type V3 = [number, number, number];
export type Mode = 'idle' | 'walk' | 'attack';

const UNIT = {
  sph: new THREE.SphereGeometry(1, 20, 14),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cone: new THREE.ConeGeometry(1, 1, 18),
  dome: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
};
export type Shape = keyof typeof UNIT;

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();
const _p = new THREE.Vector3(), _s = new THREE.Vector3();

/** A limb: geometry pieces with flat colours, merged into one mesh when the character is finished. */
export class Seg {
  private list: THREE.BufferGeometry[] = [];
  readonly group = new THREE.Group();

  /** Adds a primitive (or any geometry) with a colour, position, scale and rotation. */
  add(shape: Shape | THREE.BufferGeometry, color: number, p: V3 = [0, 0, 0], s: V3 | number = 1, r: V3 = [0, 0, 0]): this {
    const src = typeof shape === 'string' ? UNIT[shape] : shape;
    const g = (src.index ? src.toNonIndexed() : src.clone());
    for (const k of Object.keys(g.attributes)) if (k !== 'position' && k !== 'normal') g.deleteAttribute(k);
    const sc = typeof s === 'number' ? [s, s, s] : s;
    _m.compose(_p.set(...p), _q.setFromEuler(_e.set(...r)), _s.set(sc[0], sc[1], sc[2]));
    g.applyMatrix4(_m);
    _c.set(color);
    const n = g.attributes.position.count, col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { col[i * 3] = _c.r; col[i * 3 + 1] = _c.g; col[i * 3 + 2] = _c.b; }
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.list.push(g);
    return this;
  }

  /** Capsule from `a` to `b` with radius `rad` — arms, legs, necks, handles. */
  cap(color: number, a: V3, b: V3, rad: number): this {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    const g = new THREE.CapsuleGeometry(rad, len, 5, 14);
    const dir = vb.clone().sub(va).normalize();
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    _e.setFromQuaternion(_q);
    const mid = va.add(vb).multiplyScalar(0.5);
    return this.add(g, color, [mid.x, mid.y, mid.z], 1, [_e.x, _e.y, _e.z]);
  }

  /** Ring (chains, headphones, ring lights, halos). */
  ring(color: number, R: number, tube: number, p: V3, r: V3 = [0, 0, 0], arc = Math.PI * 2): this {
    return this.add(new THREE.TorusGeometry(R, tube, 8, 22, arc), color, p, 1, r);
  }

  build(mat: THREE.Material, shadow: boolean): void {
    if (!this.list.length) return;
    const geo = mergeGeometries(this.list, false)!;
    for (const g of this.list) g.dispose();
    this.list = [];
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = shadow;
    mesh.receiveShadow = false;
    this.group.add(mesh);
  }
}

export type TickFn = (rig: Rig, t: number, mode: Mode, recoil: number, act: number, dt: number) => void;

export interface Rig {
  root: THREE.Group;
  parts: Record<string, THREE.Group>;
  glows: THREE.Mesh[];
  t: number;
  data: Record<string, number>;
}

export class Builder {
  readonly root = new THREE.Group();
  /** The engine rocks this pivot in the screen plane (walk sway, falling over). */
  readonly plane = new THREE.Group();
  readonly turn = new THREE.Group();
  readonly mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.62, metalness: 0.04 });
  private segs: { seg: Seg; shadow: boolean }[] = [];
  readonly parts: Record<string, THREE.Group> = {};
  readonly glows: THREE.Mesh[] = [];

  constructor() {
    this.root.add(this.plane);
    this.plane.add(this.turn);
    this.parts.turn = this.turn;
  }

  /** New limb pivoting at `pos` inside `parent` (another limb name, default the body). */
  part(name: string, parent = 'turn', pos: V3 = [0, 0, 0], shadow = true): Seg {
    const seg = new Seg();
    seg.group.position.set(...pos);
    this.parts[parent].add(seg.group);
    this.parts[name] = seg.group;
    this.segs.push({ seg, shadow });
    return seg;
  }

  /** Self-lit piece (screens, bulbs, lasers): not affected by lights or tone mapping. */
  glow(parent: string, shape: Shape | THREE.BufferGeometry, color: number, p: V3, s: V3 | number = 1, r: V3 = [0, 0, 0]): THREE.Mesh {
    const m = new THREE.Mesh(typeof shape === 'string' ? UNIT[shape] : shape,
      new THREE.MeshBasicMaterial({ color, toneMapped: false }));
    m.position.set(...p);
    if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(...s);
    m.rotation.set(...r);
    this.parts[parent].add(m);
    this.glows.push(m);
    return m;
  }

  /** Merges the limbs, scales to `height` world units and turns the body `yaw` radians. */
  finish(height: number, yaw: number, tick: TickFn | null): THREE.Group {
    for (const { seg, shadow } of this.segs) seg.build(this.mat, shadow);
    this.plane.scale.setScalar(height);
    this.turn.rotation.y = yaw;
    const rig: Rig = { root: this.root, parts: this.parts, glows: this.glows, t: Math.random() * 6, data: {} };
    const mat = this.mat, glows = this.glows;
    const u = this.root.userData;
    u.plane = this.plane;       // engine contract (same as the old billboards)
    u.mat = mat;
    u.h = height;
    u.rig = rig;
    u.baseYaw = yaw;
    u.tick = (dt: number, mode: Mode = 'idle', recoil = 0, act = 0) => {
      rig.t += dt;
      if (tick) tick(rig, rig.t, mode, recoil, act, dt);
      // self-lit pieces cannot fade with the body: hide them once it is mostly gone
      const vis = !mat.transparent || mat.opacity > 0.5;
      for (const g of glows) g.visible = vis;
    };
    u.tick(0);
    return this.root;
  }
}

/* ---------- soft blob shadow shared by every character ---------- */
let shadowTex: THREE.CanvasTexture | null = null;
export function blobShadow(w: number, d: number): THREE.Mesh {
  if (!shadowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    g.addColorStop(0, 'rgba(8,14,24,0.5)');
    g.addColorStop(1, 'rgba(8,14,24,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    shadowTex = new THREE.CanvasTexture(c);
  }
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  m.rotation.x = -Math.PI / 2;
  m.position.y = 0.012;
  return m;
}
