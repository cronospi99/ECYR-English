/* English Racers — lights along every track, whatever its scenery: boards of running arrows round the
   outside of each curve, glowing arches over the straights and a beacon tower in the middle of each
   spiral. They are instanced (three draw calls) and animated from one clock. */
import * as THREE from 'three';
import { KERB, type Track } from './track';

function arrowTex() {
  const cv = document.createElement('canvas');
  cv.width = 256; cv.height = 128;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#0b0d14'; c.fillRect(0, 0, 256, 128);
  c.strokeStyle = '#30343f'; c.lineWidth = 6; c.strokeRect(3, 3, 250, 122);
  c.fillStyle = '#ffffff';
  for (const x of [34, 112]) { c.beginPath(); c.moveTo(x, 18); c.lineTo(x + 44, 18); c.lineTo(x + 96, 64); c.lineTo(x + 44, 110); c.lineTo(x, 110); c.lineTo(x + 52, 64); c.closePath(); c.fill(); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return t;
}

export class Trackside {
  readonly group = new THREE.Group();
  private boards: THREE.InstancedMesh | null = null;
  private rings: THREE.Mesh[] = [];
  private phase: number[] = [];
  private base = new THREE.Color();
  private col = new THREE.Color();
  private mats: THREE.Material[] = [];

  constructor(track: Track, color: string, opts: { beacons?: boolean } = {}) {
    const F = track.frames, N = F.length, L = track.length;
    this.base.set(color).offsetHSL(0, 0.25, 0.05);
    const o = new THREE.Object3D();
    const curv = (i: number) => { let c = 0; for (let k = -6; k <= 6; k++) c += F[(((i + k) % N) + N) % N].curv; return c / 13; };
    const busy = (s: number, pad: number) => track.gapAt(s) || track.ramps.some((r) => track.ahead(r.s0 - pad, s) < r.s1 - r.s0 + pad * 2) || track.loops.some((l) => Math.min(track.ahead(l.s, s), track.ahead(s, l.s)) < 45);

    /* boards of arrows on the outside of the curves */
    const spots: { i: number; sg: number }[] = [];
    for (let i = 0; i < N; i += 8) {
      const c = curv(i), f = F[i];
      if (Math.abs(c) < 1 / 80 || !f.wall || f.bridge || busy(f.s, 6)) continue;
      spots.push({ i, sg: c > 0 ? 1 : -1 });
    }
    if (spots.length) {
      const mat = new THREE.MeshBasicMaterial({ map: arrowTex(), toneMapped: false, side: THREE.DoubleSide });
      this.mats.push(mat);
      const m = new THREE.InstancedMesh(new THREE.PlaneGeometry(3.4, 1.7), mat, spots.length);
      spots.forEach((sp, k) => {
        const f = F[sp.i], d = sp.sg * (f.w + KERB + f.apron + 0.75);
        const p = track.pointAt(f.s, d);
        o.position.set(p.x, f.p.y + 2.2, p.z);
        // facing the karts that come round the bend, turned a little towards the road
        o.rotation.set(0, f.yaw + Math.PI + sp.sg * 0.55, 0);
        o.scale.set(sp.sg, 1, 1);
        o.updateMatrix();
        m.setMatrixAt(k, o.matrix);
        m.setColorAt(k, this.base);
        this.phase.push(f.s);
      });
      m.frustumCulled = false;
      this.boards = m;
      this.group.add(m);
    }

    /* glowing arches over the straights */
    const at: number[] = [];
    for (let s = 90; s < L - 90; s += 10) {
      const i = Math.round(s / track.ds);
      let ok = !busy(s, 30) && !F[i % N].bridge && F[i % N].wall;
      for (let k = -24; k <= 24 && ok; k += 6) if (Math.abs(F[(((i + k) % N) + N) % N].curv) > 0.006 || F[(((i + k) % N) + N) % N].bridge) ok = false;
      if (ok && track.gates.every((g) => Math.min(track.ahead(g, s), track.ahead(s, g)) > 45) && at.every((a) => Math.abs(a - s) > 170)) at.push(s);
    }
    if (at.length) {
      const mat = new THREE.MeshBasicMaterial({ toneMapped: false });
      this.mats.push(mat);
      const m = new THREE.InstancedMesh(new THREE.TorusGeometry(1, 0.022, 6, 40, Math.PI), mat, at.length * 2);
      at.forEach((s, k) => {
        const f = track.frame(Math.round(s / track.ds)), r = f.w + KERB + f.apron + 0.6;
        for (let j = 0; j < 2; j++) {
          o.position.set(f.p.x + f.t.x * j * 1.6, f.p.y - 0.2, f.p.z + f.t.z * j * 1.6);
          o.rotation.set(0, f.yaw, 0);
          o.scale.set(r, r * 0.86, r * (j ? 0.6 : 1));
          o.updateMatrix();
          m.setMatrixAt(k * 2 + j, o.matrix);
          m.setColorAt(k * 2 + j, this.col.copy(this.base).offsetHSL(j ? 0.5 : 0, 0, 0).multiplyScalar(2.2));
        }
      });
      m.frustumCulled = false;
      this.group.add(m);
    }

    /* a beacon tower in the middle of each spiral */
    if (opts.beacons !== false) for (const sp of track.def.spirals ?? []) {
      const y0 = track.frames.reduce((m, f) => (Math.hypot(f.p.x - sp.x, f.p.z - sp.z) < sp.r + 20 ? Math.min(m, f.p.y) : m), sp.top) - 1.5, h = sp.top - y0 + 12;
      const body = new THREE.MeshStandardMaterial({ color: 0x1b1f2b, roughness: 0.45, metalness: 0.6 }), lit = new THREE.MeshBasicMaterial({ color: this.col.copy(this.base).multiplyScalar(2.4), toneMapped: false });
      this.mats.push(body, lit);
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 2.4, h, 8), body);
      tower.position.set(sp.x, y0 + h / 2, sp.z);
      tower.castShadow = true;
      this.group.add(tower);
      for (let k = 0; k < 4; k++) {
        const ring = new THREE.Mesh(new THREE.TorusGeometry(4.5 - k * 0.7, 0.16, 6, 28), lit);
        ring.position.set(sp.x, y0 + h * (0.35 + k * 0.2), sp.z);
        ring.rotation.x = Math.PI / 2;
        this.rings.push(ring);
        this.group.add(ring);
      }
      const top = new THREE.Mesh(new THREE.SphereGeometry(1.5, 16, 10), lit);
      top.position.set(sp.x, y0 + h + 1.2, sp.z);
      this.group.add(top);
    }
  }

  update(t: number) {
    // the arrows light up one after the other, the way the road goes
    const b = this.boards;
    if (b) {
      for (let k = 0; k < this.phase.length; k++) {
        const u = (t * 2.2 - this.phase[k] / 26) % 1, w = ((u + 1) % 1) < 0.45 ? 2.3 : 0.5;
        b.setColorAt(k, this.col.copy(this.base).multiplyScalar(w));
      }
      b.instanceColor!.needsUpdate = true;
    }
    this.rings.forEach((r, i) => { r.rotation.z = t * (0.6 + (i % 4) * 0.25) * (i % 2 ? -1 : 1); r.rotation.x = Math.PI / 2 + Math.sin(t * 0.9 + i) * 0.25; });
  }

  dispose() {
    this.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
    for (const m of this.mats) { (m as THREE.MeshBasicMaterial).map?.dispose(); m.dispose(); }
    this.group.removeFromParent();
  }
}
