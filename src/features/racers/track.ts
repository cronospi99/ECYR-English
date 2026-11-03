/* English Racers — a race track as data: a closed spline of control points (position, height,
   width, grass apron, walls) plus features placed along it (ramps, gaps to jump, boost pads).
   The spline is resampled every metre into frames (point, tangent, right vector, banking), which
   both the physics (where am I, how high is the ground, am I against a wall?) and the mesh
   builders use. Curves bank by themselves from their curvature. */
import * as THREE from 'three';

export interface CP {
  x: number; z: number;
  /** Road height (m). */
  y?: number;
  /** Half width of the road (m). */
  w?: number;
  /** Grass between the kerb and the wall (m). */
  apron?: number;
  /** A barrier at the outer edge (false = open: you can fall off). */
  wall?: boolean;
}
/** Features sit at a control point plus an offset in metres along the road. */
export type Feature =
  | { kind: 'ramp'; at: number; off: number; len: number; h: number }
  | { kind: 'gap'; at: number; off: number; len: number }
  | { kind: 'boost'; at: number; off: number; d: number; len?: number; w?: number };

export interface TrackDef {
  id: string;
  name: string;
  cps: CP[];
  features: Feature[];
  laps: number;
  /** Multiplies the automatic banking. */
  bank?: number;
  /** Water level under gaps (falling below it = respawn). */
  waterY?: number;
}

export interface Frame {
  s: number;
  p: THREE.Vector3;
  /** Flat unit tangent and flat right vector (right = tangent × up). */
  t: THREE.Vector3;
  r: THREE.Vector3;
  /** Road slope along the tangent (dy/ds) and banking (dy per metre to the right). */
  slope: number;
  bank: number;
  w: number;
  apron: number;
  wall: boolean;
  /** Signed curvature (rad/m, + = turning left). */
  curv: number;
  yaw: number;
}

export interface Ramp { s0: number; s1: number; h: number }
export interface Gap { s0: number; s1: number }
export interface Pad { s0: number; s1: number; d: number; hw: number }

/** What is under a point. */
export interface Query {
  i: number; s: number; d: number;
  /** Ground height there (null = nothing: a gap or off an open edge). */
  ground: number | null;
  /** Road frame at s (interpolated). */
  p: THREE.Vector3; t: THREE.Vector3; r: THREE.Vector3; slope: number; bank: number;
  w: number; apron: number; wall: boolean;
  surface: 'road' | 'kerb' | 'grass' | 'air';
  /** Max |d| before the wall (or the edge). */
  limit: number;
  ramp: boolean;
  pad: boolean;
}

const UP = new THREE.Vector3(0, 1, 0);
const smooth = (a: number, b: number, t: number) => a + (b - a) * (t * t * (3 - 2 * t));
export const KERB = 1;

export class Track {
  readonly def: TrackDef;
  readonly frames: Frame[] = [];
  readonly length: number;
  readonly ds: number;
  readonly cpS: number[] = [];
  readonly ramps: Ramp[] = [];
  readonly gaps: Gap[] = [];
  readonly pads: Pad[] = [];
  readonly waterY: number;

  constructor(def: TrackDef) {
    this.def = def;
    this.waterY = def.waterY ?? -3;
    const n = def.cps.length;
    const curve = new THREE.CatmullRomCurve3(def.cps.map((c) => new THREE.Vector3(c.x, c.y ?? 0, c.z)), true, 'centripetal');
    // dense samples in curve parameter, with the per-point attributes eased between points
    const SUB = 48, dense: { p: THREE.Vector3; w: number; apron: number; wall: number; len: number }[] = [];
    let len = 0;
    for (let k = 0; k <= n * SUB; k++) {
      const u = k / (n * SUB), seg = Math.min(n - 1, Math.floor(k / SUB)), f = (k % SUB) / SUB;
      const a = def.cps[seg], b = def.cps[(seg + 1) % n];
      const p = curve.getPoint(u % 1);
      if (k > 0) len += p.distanceTo(dense[k - 1].p);
      if (k % SUB === 0 && k / SUB < n) this.cpS[k / SUB] = len;
      dense.push({ p, w: smooth(a.w ?? 7, b.w ?? 7, f), apron: smooth(a.apron ?? 6, b.apron ?? 6, f), wall: f < 0.5 ? (a.wall === false ? 0 : 1) : (b.wall === false ? 0 : 1), len });
    }
    this.cpS.length = n;
    this.length = len;
    const N = Math.round(len);
    this.ds = len / N;
    // resample every ds metres
    let j = 0;
    for (let i = 0; i < N; i++) {
      const s = i * this.ds;
      while (j < dense.length - 2 && dense[j + 1].len < s) j++;
      const A = dense[j], B = dense[j + 1], f = (s - A.len) / Math.max(1e-6, B.len - A.len);
      this.frames.push({ s, p: A.p.clone().lerp(B.p, f), t: new THREE.Vector3(), r: new THREE.Vector3(), slope: 0, bank: 0, w: A.w + (B.w - A.w) * f, apron: A.apron + (B.apron - A.apron) * f, wall: (f < 0.5 ? A.wall : B.wall) === 1, curv: 0, yaw: 0 });
    }
    const F = this.frames;
    for (let i = 0; i < N; i++) {
      const a = F[(i - 1 + N) % N].p, b = F[(i + 1) % N].p, fr = F[i];
      fr.t.set(b.x - a.x, 0, b.z - a.z).normalize();
      fr.r.crossVectors(fr.t, UP).normalize();
      fr.slope = (b.y - a.y) / (2 * this.ds);
      fr.yaw = Math.atan2(fr.t.x, fr.t.z);
    }
    for (let i = 0; i < N; i++) {
      let dy = F[(i + 1) % N].yaw - F[(i - 1 + N) % N].yaw;
      while (dy > Math.PI) dy -= Math.PI * 2;
      while (dy < -Math.PI) dy += Math.PI * 2;
      F[i].curv = dy / (2 * this.ds);
    }
    // banking from the smoothed curvature (outer side up)
    const K = 10, bk = def.bank ?? 1;
    for (let i = 0; i < N; i++) {
      let c = 0;
      for (let k = -K; k <= K; k++) c += F[(i + k + N) % N].curv;
      F[i].bank = THREE.MathUtils.clamp((c / (2 * K + 1)) * 5.5 * bk, -0.2, 0.2);
    }
    // features snap to whole frames, so the meshes and the physics agree to the centimetre
    const at = (cp: number, off: number) => ((Math.round((this.cpS[cp] + off) / this.ds) * this.ds % len) + len) % len;
    const span = (l: number) => Math.max(1, Math.round(l / this.ds)) * this.ds;
    for (const f of def.features) {
      const s0 = at(f.at, f.off);
      if (f.kind === 'ramp') this.ramps.push({ s0, s1: s0 + span(f.len), h: f.h });
      else if (f.kind === 'gap') this.gaps.push({ s0, s1: s0 + span(f.len) });
      else this.pads.push({ s0, s1: s0 + (f.len ?? 7), d: f.d, hw: (f.w ?? 3) / 2 });
    }
  }

  frame(i: number) { const N = this.frames.length; return this.frames[((i % N) + N) % N]; }
  /** Distance from a to b going forward (0..length). */
  ahead(a: number, b: number) { const L = this.length; return (((b - a) % L) + L) % L; }
  private inRange(s: number, s0: number, s1: number) { const L = this.length; const x = ((s - s0) % L + L) % L; return x < s1 - s0 ? x : -1; }

  /** Extra height of a ramp at s (and lateral d), or 0. */
  rampAt(s: number, d: number, w: number) {
    if (Math.abs(d) > w + KERB) return 0;
    for (const r of this.ramps) {
      const x = this.inRange(s, r.s0, r.s1);
      if (x >= 0) return r.h * Math.pow(x / (r.s1 - r.s0), 1.35);
    }
    return 0;
  }
  gapAt(s: number) { return this.gaps.some((g) => this.inRange(s, g.s0, g.s1) >= 0); }
  padAt(s: number, d: number) { return this.pads.some((p) => this.inRange(s, p.s0, p.s1) >= 0 && Math.abs(d - p.d) <= p.hw); }

  /** Road position at (s, d) in the world, on the surface (without ramps). */
  pointAt(s: number, d: number, out = new THREE.Vector3()) {
    const L = this.length, x = ((s % L) + L) % L, i = Math.floor(x / this.ds), f = x / this.ds - i;
    const a = this.frame(i), b = this.frame(i + 1);
    const w = a.w + (b.w - a.w) * f, bank = a.bank + (b.bank - a.bank) * f;
    out.copy(a.p).lerp(b.p, f);
    const rx = a.r.x + (b.r.x - a.r.x) * f, rz = a.r.z + (b.r.z - a.r.z) * f, rl = Math.hypot(rx, rz);
    out.x += (rx / rl) * d; out.z += (rz / rl) * d;
    out.y += Math.max(-w - KERB, Math.min(w + KERB, d)) * bank;
    return out;
  }

  /** Index of the frame nearest to p, searching around `hint` (or everywhere when hint < 0). */
  nearest(p: THREE.Vector3, hint: number, span = 28) {
    const N = this.frames.length;
    let best = 0, bd = Infinity;
    const from = hint < 0 ? 0 : hint - span, to = hint < 0 ? N - 1 : hint + span;
    for (let k = from; k <= to; k++) {
      const f = this.frames[((k % N) + N) % N];
      const dx = p.x - f.p.x, dz = p.z - f.p.z, dy = p.y - f.p.y;
      const dd = dx * dx + dz * dz + (Math.abs(dy) > 3 ? dy * dy * 4 : 0);
      if (dd < bd) { bd = dd; best = ((k % N) + N) % N; }
    }
    return best;
  }

  private _p = new THREE.Vector3();
  private _r = new THREE.Vector3();
  private _t = new THREE.Vector3();
  query(p: THREE.Vector3, hint: number): Query {
    let i = this.nearest(p, hint);
    let fr = this.frames[i];
    let along = (p.x - fr.p.x) * fr.t.x + (p.z - fr.p.z) * fr.t.z;
    if (along < 0) { i = (i - 1 + this.frames.length) % this.frames.length; fr = this.frames[i]; along = (p.x - fr.p.x) * fr.t.x + (p.z - fr.p.z) * fr.t.z; }
    const nx = this.frame(i + 1), f = THREE.MathUtils.clamp(along / this.ds, 0, 1);
    const P = this._p.copy(fr.p).lerp(nx.p, f);
    const R = this._r.copy(fr.r).lerp(nx.r, f).normalize();
    const T = this._t.copy(fr.t).lerp(nx.t, f).normalize();
    const s = (fr.s + f * this.ds) % this.length;
    const w = fr.w + (nx.w - fr.w) * f, apron = fr.apron + (nx.apron - fr.apron) * f, bank = fr.bank + (nx.bank - fr.bank) * f, slope = fr.slope + (nx.slope - fr.slope) * f;
    const wall = fr.wall;
    const d = (p.x - P.x) * R.x + (p.z - P.z) * R.z;
    const ad = Math.abs(d);
    const limit = w + KERB + apron;
    const gap = this.gapAt(s);
    let ground: number | null = P.y + Math.max(-w - KERB, Math.min(w + KERB, d)) * bank;
    const ramp = this.rampAt(s, d, w);
    ground += ramp;
    if (gap || (!wall && ad > limit + 0.6)) ground = null;
    const surface = ground === null ? 'air' : ad <= w ? 'road' : ad <= w + KERB ? 'kerb' : 'grass';
    return { i, s, d, ground, p: P, t: T, r: R, slope, bank, w, apron, wall, surface, limit, ramp: ramp > 0, pad: ground !== null && this.padAt(s, d) };
  }
}
