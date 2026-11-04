/* English Racers — items, all our own school-themed designs:
   - ABC boxes: rows of spinning toy blocks across the road; driving through one gives a random item
     (better ones for the racers at the back) and the box grows back after a moment.
   - Coins: up to 10, each one adds a little top speed; a hit drops some.
   - Paper plane: flies down the road and homes in on the racer ahead.
   - Ink puddle: dropped behind; whoever drives into it spins out.
   - Book shield: a book circles the kart and stops one hit.
   - Coffee: three turbo boosts.
   - Recess bell: rings out and slows everyone ahead.
   This file holds the things on the track and their visuals; the rules live in the engine. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { coinGeo } from '@/features/run/gfx';
import type { Track } from './track';
import type { ItemKind, Racer } from './racer';

export const ITEMS: Record<ItemKind, { en: string; es: string; color: string }> = {
  plane: { en: 'Paper plane', es: 'Avión de papel', color: '#4cc3ff' },
  ink: { en: 'Ink puddle', es: 'Charco de tinta', color: '#5b4bff' },
  book: { en: 'Book shield', es: 'Libro escudo', color: '#2fd27a' },
  coffee: { en: 'Coffee ×3', es: 'Café ×3', color: '#c8833c' },
  bell: { en: 'Recess bell', es: 'Campana del recreo', color: '#ffd23f' },
};
export const ITEM_LIST = Object.keys(ITEMS) as ItemKind[];

/** A random item for this place (0 = leading … 1 = last). */
export function rollItem(p: number): ItemKind {
  const w: Record<ItemKind, number> = {
    plane: 10 + 30 * Math.sin(Math.PI * Math.min(1, p * 1.3)),
    ink: 45 * (1 - p) + 6,
    book: 30 * (1 - p) + 8,
    coffee: 12 + 34 * p,
    bell: p < 0.3 ? 0 : 24 * (p - 0.3),
  };
  let sum = 0;
  for (const k of ITEM_LIST) sum += w[k];
  let r = Math.random() * sum;
  for (const k of ITEM_LIST) { r -= w[k]; if (r <= 0) return k; }
  return 'coffee';
}

function canvasTex(w: number, h: number, draw: (c: CanvasRenderingContext2D) => void) {
  const cv = document.createElement('canvas');
  cv.width = w; cv.height = h;
  draw(cv.getContext('2d')!);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

/** The ABC block face: a glossy tile with a letter (white tint so each box can take a colour). */
function blockFace(letter: string) {
  return canvasTex(256, 256, (c) => {
    const g = c.createLinearGradient(0, 0, 256, 256);
    g.addColorStop(0, '#ffffff'); g.addColorStop(1, '#c9d3e6');
    c.fillStyle = g; c.fillRect(0, 0, 256, 256);
    c.strokeStyle = '#ffffff'; c.lineWidth = 18; c.strokeRect(14, 14, 228, 228);
    c.strokeStyle = 'rgba(16,32,74,.35)'; c.lineWidth = 4; c.strokeRect(26, 26, 204, 204);
    c.font = '900 172px Inter, system-ui, sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 16; c.strokeStyle = '#10204a'; c.lineJoin = 'round';
    c.strokeText(letter, 128, 142);
    c.fillStyle = '#ffffff'; c.fillText(letter, 128, 142);
  });
}

function splatTex() {
  return canvasTex(256, 256, (c) => {
    let r = 5;
    const rand = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    const blob = (x: number, y: number, rad: number) => { c.beginPath(); c.arc(x, y, rad, 0, Math.PI * 2); c.fill(); };
    c.fillStyle = '#ffffff';
    blob(128, 128, 78);
    for (let i = 0; i < 16; i++) { const a = rand() * Math.PI * 2, d = 60 + rand() * 40; blob(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 12 + rand() * 22); }
    for (let i = 0; i < 14; i++) { const a = rand() * Math.PI * 2, d = 100 + rand() * 20; blob(128 + Math.cos(a) * d, 128 + Math.sin(a) * d, 3 + rand() * 7); }
  });
}

/** A folded paper plane (nose at +z), white with a blue stripe. */
function planeGeo() {
  const pos: number[] = [], col: number[] = [];
  const tri = (a: number[], b: number[], c: number[], color: [number, number, number]) => { pos.push(...a, ...b, ...c); for (let i = 0; i < 3; i++) col.push(...color); };
  const W: [number, number, number] = [0.97, 0.97, 0.95], S: [number, number, number] = [0.86, 0.88, 0.92], B: [number, number, number] = [0.25, 0.55, 0.95];
  const nose = [0, 0.05, 0.75], tail = [0, 0.05, -0.55], keel = [0, -0.16, -0.45];
  for (const sg of [-1, 1]) {
    tri(nose, tail, [sg * 0.6, 0.12, -0.6], W);
    tri(nose, [sg * 0.6, 0.12, -0.6], tail, W);
    tri([sg * 0.08, 0.07, 0.2], [sg * 0.5, 0.11, -0.5], [sg * 0.42, 0.105, -0.52], B);
    tri(nose, keel, tail, S);
    tri(nose, tail, keel, S);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

/** A closed hardback book. */
function bookGeo() {
  const parts: THREE.BufferGeometry[] = [];
  const add = (g: THREE.BufferGeometry, color: number, x: number, y: number, z: number) => {
    const geo = g.toNonIndexed(); geo.deleteAttribute('uv'); geo.translate(x, y, z);
    const c = new THREE.Color(color), n = geo.getAttribute('position').count, a = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) a.set([c.r, c.g, c.b], i * 3);
    geo.setAttribute('color', new THREE.BufferAttribute(a, 3));
    parts.push(geo);
  };
  add(new RoundedBoxGeometry(0.62, 0.16, 0.46, 2, 0.03), 0x1f9d55, 0, 0, 0);
  add(new THREE.BoxGeometry(0.56, 0.12, 0.44), 0xfaf4e2, 0.02, 0, 0);
  add(new THREE.BoxGeometry(0.06, 0.17, 0.47), 0xffd23f, -0.28, 0, 0);
  add(new THREE.BoxGeometry(0.3, 0.005, 0.2), 0xffffff, 0.04, 0.083, 0);
  const pos: number[] = [], col: number[] = [];
  for (const p of parts) { pos.push(...(p.getAttribute('position').array as Float32Array)); col.push(...(p.getAttribute('color').array as Float32Array)); p.dispose(); }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  return g;
}

interface Box { s: number; d: number; pos: THREE.Vector3; back: number; hue: number }
interface Coin { s: number; d: number; pos: THREE.Vector3; back: number }
export interface Plane { mesh: THREE.Mesh; s: number; d: number; y: number; owner: Racer; target: Racer | null; life: number; pos: THREE.Vector3; yaw: number }
export interface Ink { mesh: THREE.Mesh; s: number; d: number; pos: THREE.Vector3; owner: Racer; age: number; life: number }
interface Ring { mesh: THREE.Mesh; t: number; r: Racer }

export interface ItemEvents {
  box(r: Racer): void;
  coin(r: Racer): void;
  hit(r: Racer, kind: 'plane' | 'ink', by: Racer | null): void;
}

const BOX_COLORS = [0xff4d6d, 0x3d8bff, 0xffc93d, 0x2fd27a, 0xb46bff];

export class ItemWorld {
  readonly group = new THREE.Group();
  readonly boxes: Box[] = [];
  readonly coins: Coin[] = [];
  readonly planes: Plane[] = [];
  readonly inks: Ink[] = [];
  private rings: Ring[] = [];
  private boxMesh: THREE.InstancedMesh;
  private coinMesh: THREE.InstancedMesh;
  private boxMats: THREE.MeshStandardMaterial[];
  private planeGeo = planeGeo();
  private bookGeo = bookGeo();
  private worldMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, metalness: 0, side: THREE.DoubleSide });
  private inkMat: THREE.MeshStandardMaterial;
  private ringGeo = new THREE.TorusGeometry(1, 0.08, 8, 40);
  private ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 1.7, 0.4), transparent: true, depthWrite: false, toneMapped: false, blending: THREE.AdditiveBlending });
  private books = new Map<Racer, THREE.Mesh>();
  private dummy = new THREE.Object3D();
  private col = new THREE.Color();

  constructor(private track: Track, opts: { boxes: boolean; coins: boolean }) {
    const tr = track;
    if (opts.boxes) for (const s of tr.itemRows) {
      const f = tr.frame(Math.round(s / tr.ds));
      for (let k = 0; k < 4; k++) {
        const d = (k - 1.5) * f.w * 0.5;
        const pos = tr.pointAt(s, d); pos.y += 1.05;
        this.boxes.push({ s, d, pos, back: 0, hue: k });
      }
    }
    if (opts.coins) for (const c of tr.coins) { const pos = tr.pointAt(c.s, c.d); pos.y += tr.rampAt(c.s, c.d, 99) + 0.75; this.coins.push({ s: c.s, d: c.d, pos, back: 0 }); }

    const faces = ['A', 'B', 'C', 'A', 'B', 'C'].map(blockFace);
    this.boxMats = faces.map((map) => new THREE.MeshStandardMaterial({ map, roughness: 0.25, metalness: 0.05, emissive: 0xffffff, emissiveMap: map, emissiveIntensity: 0.18 }));
    this.boxMesh = new THREE.InstancedMesh(new RoundedBoxGeometry(1.15, 1.15, 1.15, 3, 0.16), this.boxMats, Math.max(1, this.boxes.length));
    this.boxMesh.count = this.boxes.length;
    this.boxMesh.castShadow = true;
    this.boxes.forEach((b, i) => this.boxMesh.setColorAt(i, this.col.setHex(BOX_COLORS[b.hue % BOX_COLORS.length])));
    this.boxMesh.frustumCulled = false;
    const cg = coinGeo();
    this.coinMesh = new THREE.InstancedMesh(cg, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.22, metalness: 0.75, emissive: 0x4a3000, emissiveIntensity: 0.6 }), Math.max(1, this.coins.length));
    this.coinMesh.count = this.coins.length;
    this.coinMesh.castShadow = true;
    this.coinMesh.frustumCulled = false;
    this.inkMat = new THREE.MeshStandardMaterial({ color: 0x1d1a5c, roughness: 0.12, metalness: 0.1, alphaMap: splatTex(), transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3 });
    this.group.add(this.boxMesh, this.coinMesh);
  }

  reset() {
    for (const b of this.boxes) b.back = 0;
    for (const c of this.coins) c.back = 0;
    for (const p of this.planes) p.mesh.removeFromParent();
    for (const i of this.inks) i.mesh.removeFromParent();
    for (const r of this.rings) r.mesh.removeFromParent();
    this.planes.length = 0; this.inks.length = 0; this.rings.length = 0;
    for (const [, m] of this.books) m.removeFromParent();
    this.books.clear();
  }

  /** Boxes still standing (for the bots). */
  liveBoxes() { return this.boxes.filter((b) => b.back <= 0); }

  firePlane(owner: Racer, target: Racer | null) {
    const m = new THREE.Mesh(this.planeGeo, this.worldMat);
    m.castShadow = true;
    const k = owner.kart;
    const p: Plane = { mesh: m, s: k.s + 1.5, d: k.d, y: k.pos.y + 1.1, owner, target, life: target ? 9 : 5, pos: new THREE.Vector3(), yaw: k.yaw };
    this.planes.push(p);
    this.group.add(m);
  }

  dropInk(owner: Racer) {
    const k = owner.kart, tr = this.track;
    return this.dropInkAt(owner, (k.s - 2.8 + tr.length) % tr.length, k.d, k.hint);
  }
  /** An ink puddle at (s, d) — also the ones other students drop in the live class mode. */
  dropInkAt(owner: Racer, s: number, d: number, hint = -1) {
    const tr = this.track;
    const q = tr.query(tr.pointAt(s, d), hint);
    if (q.ground === null) return null;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(2.6, 2.6), this.inkMat);
    m.rotation.x = -Math.PI / 2;
    m.rotation.z = Math.random() * Math.PI * 2;
    const pos = tr.pointAt(s, d); pos.y = q.ground + 0.03;
    m.position.copy(pos);
    m.scale.setScalar(0.2);
    m.renderOrder = 3;
    const ink = { mesh: m, s, d, pos, owner, age: 0, life: 30 };
    this.inks.push(ink);
    this.group.add(m);
    return ink;
  }

  setShield(r: Racer, on: boolean) {
    const m = this.books.get(r);
    if (on && !m) { const b = new THREE.Mesh(this.bookGeo, this.worldMat); b.castShadow = true; this.books.set(r, b); this.group.add(b); }
    if (!on && m) { m.removeFromParent(); this.books.delete(r); }
  }

  /** A golden ring around a racer (the bell). */
  ring(r: Racer) {
    const m = new THREE.Mesh(this.ringGeo, this.ringMat);
    m.rotation.x = Math.PI / 2;
    this.rings.push({ mesh: m, t: 0, r });
    this.group.add(m);
  }

  /** `racers` pick up boxes and coins and can be hit; `targets` (other students' karts, moved by
      the network) can only be hit by paper planes fired here. */
  update(dt: number, t: number, racers: Racer[], ev: ItemEvents, active: boolean, targets: Racer[] = []) {
    const tr = this.track, L = tr.length;
    // boxes: spin, bob, pop back
    for (let i = 0; i < this.boxes.length; i++) {
      const b = this.boxes[i];
      if (b.back > 0) b.back -= dt;
      const grow = b.back > 0 ? 0 : Math.min(1, -b.back * 4);
      if (b.back <= 0 && b.back > -1) b.back -= dt;
      const sc = b.back > 0 ? 0.001 : 0.25 + 0.75 * (1 - Math.pow(1 - grow, 3));
      this.dummy.position.set(b.pos.x, b.pos.y + Math.sin(t * 2.2 + i) * 0.12, b.pos.z);
      this.dummy.rotation.set(0.45 + Math.sin(t * 0.7 + i) * 0.15, t * 1.4 + i, 0.3);
      this.dummy.scale.setScalar(sc);
      this.dummy.updateMatrix();
      this.boxMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.boxMesh.instanceMatrix.needsUpdate = true;
    for (let i = 0; i < this.coins.length; i++) {
      const c = this.coins[i];
      if (c.back > 0) c.back -= dt;
      this.dummy.position.set(c.pos.x, c.pos.y + Math.sin(t * 3 + i * 0.7) * 0.08, c.pos.z);
      this.dummy.rotation.set(0, t * 3 + i * 0.4, 0);
      this.dummy.scale.setScalar(c.back > 0 ? 0.001 : 1.1);
      this.dummy.updateMatrix();
      this.coinMesh.setMatrixAt(i, this.dummy.matrix);
    }
    this.coinMesh.instanceMatrix.needsUpdate = true;

    if (active) {
      for (const r of racers) {
        const p = r.kart.pos;
        if (r.kart.falling) continue;
        for (const b of this.boxes) if (b.back <= 0 && Math.abs(p.x - b.pos.x) < 1.5 && Math.abs(p.z - b.pos.z) < 1.5 && Math.abs(p.y + 0.6 - b.pos.y) < 2 && Math.hypot(p.x - b.pos.x, p.z - b.pos.z) < 1.45) { b.back = 2.2; ev.box(r); }
        for (const c of this.coins) if (c.back <= 0 && Math.abs(p.x - c.pos.x) < 1.3 && Math.abs(p.z - c.pos.z) < 1.3 && Math.abs(p.y + 0.5 - c.pos.y) < 1.6 && Math.hypot(p.x - c.pos.x, p.z - c.pos.z) < 1.25) { c.back = 9; ev.coin(r); }
      }
    }

    // paper planes: fly down the road, home in on the target
    for (let i = this.planes.length - 1; i >= 0; i--) {
      const pl = this.planes[i];
      pl.life -= dt;
      const tg = pl.target && !pl.target.finished ? pl.target : null;
      let sp = 44;
      if (tg) {
        const gap = tr.ahead(pl.s, tg.kart.s);
        const close = gap < 30 || gap > L - 4;
        pl.d += THREE.MathUtils.clamp(tg.kart.d - pl.d, -9 * dt, 9 * dt) * (close ? 1.6 : 0.6);
        if (gap > L - 4) sp = 20; // overshot a little: slow down and turn back onto it
      }
      pl.s = (pl.s + sp * dt) % L;
      const ground = tr.pointAt(pl.s, pl.d, pl.pos);
      const gy = ground.y + tr.rampAt(pl.s, pl.d, 99);
      pl.y += (gy + 1.0 - pl.y) * Math.min(1, dt * 5);
      pl.pos.y = pl.y + Math.sin(t * 9 + i) * 0.06;
      const f = tr.frame(Math.round(pl.s / tr.ds));
      pl.yaw = f.yaw;
      pl.mesh.position.copy(pl.pos);
      pl.mesh.rotation.set(-0.05, pl.yaw, Math.sin(t * 7 + i) * 0.25, 'YXZ');
      let hitR: Racer | null = null;
      for (const r of targets.length ? [...racers, ...targets] : racers) {
        if (r === pl.owner && pl.life > (pl.target ? 8.5 : 4.5)) continue;
        const k = r.kart;
        if (Math.abs(k.pos.x - pl.pos.x) < 1.6 && Math.abs(k.pos.z - pl.pos.z) < 1.6 && Math.abs(k.pos.y + 0.6 - pl.pos.y) < 1.6) { hitR = r; break; }
      }
      if (hitR) ev.hit(hitR, 'plane', pl.owner);
      if (hitR || pl.life <= 0) { pl.mesh.removeFromParent(); this.planes.splice(i, 1); }
    }

    // ink puddles: spread, then wait for a victim
    for (let i = this.inks.length - 1; i >= 0; i--) {
      const ik = this.inks[i];
      ik.age += dt; ik.life -= dt;
      ik.mesh.scale.setScalar(Math.min(1, 0.2 + ik.age * 4) * (ik.life < 1 ? ik.life : 1));
      let hitR: Racer | null = null;
      for (const r of racers) {
        if (r === ik.owner && ik.age < 0.8) continue;
        const k = r.kart;
        if (!k.grounded) continue;
        if (Math.hypot(k.pos.x - ik.pos.x, k.pos.z - ik.pos.z) < 1.35 && Math.abs(k.pos.y - ik.pos.y) < 1) { hitR = r; break; }
      }
      if (hitR) ev.hit(hitR, 'ink', ik.owner);
      if (hitR || ik.life <= 0) { ik.mesh.removeFromParent(); ik.mesh.geometry.dispose(); this.inks.splice(i, 1); }
    }

    // book shields circle their karts
    for (const [r, m] of this.books) {
      const a = t * 3.2 + r.idx;
      const k = r.kart;
      m.position.set(k.pos.x + Math.cos(a) * 1.15, k.pos.y + 0.75 + Math.sin(t * 4 + r.idx) * 0.08, k.pos.z + Math.sin(a) * 1.15);
      m.rotation.set(0.2, -a, 0.15);
    }
    // bell rings expand and fade
    for (let i = this.rings.length - 1; i >= 0; i--) {
      const g = this.rings[i];
      g.t += dt;
      const k = g.r.kart;
      g.mesh.position.set(k.pos.x, k.pos.y + 0.5, k.pos.z);
      g.mesh.scale.setScalar(0.6 + g.t * 3.2);
      if (g.t > 0.7) { g.mesh.removeFromParent(); this.rings.splice(i, 1); }
    }
    this.ringMat.opacity = 0.9;
  }

  dispose() {
    this.reset();
    this.boxMesh.geometry.dispose(); this.boxMats.forEach((m) => { m.map?.dispose(); m.dispose(); });
    this.coinMesh.geometry.dispose(); (this.coinMesh.material as THREE.Material).dispose();
    this.planeGeo.dispose(); this.bookGeo.dispose(); this.worldMat.dispose();
    this.inkMat.alphaMap?.dispose(); this.inkMat.dispose();
    this.ringGeo.dispose(); this.ringMat.dispose();
  }
}

/** A small icon of each item for the HUD (data URLs, drawn once). */
const iconCache = new Map<ItemKind, string>();
export function itemIcon(kind: ItemKind): string {
  const hit = iconCache.get(kind);
  if (hit) return hit;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d')!;
  c.lineJoin = 'round'; c.lineCap = 'round';
  const ink = '#10204a';
  const stroke = (w = 7) => { c.lineWidth = w; c.strokeStyle = ink; c.stroke(); };
  if (kind === 'plane') {
    c.beginPath(); c.moveTo(18, 70); c.lineTo(112, 26); c.lineTo(70, 110); c.lineTo(58, 78); c.closePath(); c.fillStyle = '#ffffff'; c.fill(); stroke();
    c.beginPath(); c.moveTo(58, 78); c.lineTo(112, 26); stroke(5);
    c.beginPath(); c.moveTo(58, 78); c.lineTo(52, 100); c.lineTo(66, 88); c.fillStyle = '#c9d6ec'; c.fill(); stroke(5);
  } else if (kind === 'ink') {
    c.beginPath(); c.ellipse(64, 92, 46, 20, 0, 0, Math.PI * 2); c.fillStyle = '#3a2fb8'; c.fill(); stroke();
    c.beginPath(); c.moveTo(48, 26); c.lineTo(80, 26); c.lineTo(84, 50); c.quadraticCurveTo(92, 58, 88, 74); c.lineTo(40, 74); c.quadraticCurveTo(36, 58, 44, 50); c.closePath(); c.fillStyle = '#6a5cff'; c.fill(); stroke();
    c.fillStyle = '#ffffff'; c.fillRect(52, 54, 24, 10);
  } else if (kind === 'book') {
    c.beginPath(); c.roundRect(22, 26, 84, 78, 10); c.fillStyle = '#1f9d55'; c.fill(); stroke();
    c.fillStyle = '#ffd23f'; c.fillRect(24, 28, 14, 74);
    c.fillStyle = '#ffffff'; c.beginPath(); c.roundRect(50, 46, 44, 18, 4); c.fill();
    c.beginPath(); c.moveTo(106, 34); c.lineTo(116, 40); c.lineTo(116, 108); c.lineTo(34, 108); c.lineTo(26, 104); c.fillStyle = '#faf4e2'; c.fill(); stroke(5);
  } else if (kind === 'coffee') {
    c.beginPath(); c.moveTo(28, 44); c.lineTo(92, 44); c.lineTo(84, 108); c.lineTo(36, 108); c.closePath(); c.fillStyle = '#ffffff'; c.fill(); stroke();
    c.beginPath(); c.arc(96, 70, 14, -1.2, 1.4); stroke(7);
    c.fillStyle = '#c8833c'; c.fillRect(34, 62, 52, 22);
    c.beginPath(); c.moveTo(48, 36); c.quadraticCurveTo(40, 24, 50, 14); c.moveTo(66, 36); c.quadraticCurveTo(58, 24, 68, 12); stroke(5);
  } else {
    c.beginPath(); c.moveTo(64, 16); c.quadraticCurveTo(98, 18, 98, 62); c.lineTo(108, 92); c.lineTo(20, 92); c.lineTo(30, 62); c.quadraticCurveTo(30, 18, 64, 16); c.fillStyle = '#ffd23f'; c.fill(); stroke();
    c.beginPath(); c.arc(64, 100, 11, 0, Math.PI * 2); c.fillStyle = '#ffb000'; c.fill(); stroke(5);
    c.beginPath(); c.moveTo(16, 40); c.lineTo(6, 34); c.moveTo(112, 40); c.lineTo(122, 34); c.moveTo(14, 58); c.lineTo(4, 60); c.moveTo(114, 58); c.lineTo(124, 60); stroke(5);
  }
  const url = cv.toDataURL();
  iconCache.set(kind, url);
  return url;
}
