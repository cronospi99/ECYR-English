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
  | { kind: 'boost'; at: number; off: number; d: number; len?: number; w?: number }
  /** A 360° loop of radius r (the road must be straight there and ≥ 15 m wide); `tilt` (rad, + = to
      the right) leans its top over to one side. */
  | { kind: 'loop'; at: number; off: number; r: number; tilt?: number }
  /** Shallow water over the road (spray, a little drag). */
  | { kind: 'splash'; at: number; off: number; len: number };

/** Something placed across the road at a control point plus an offset (m). */
export interface Spot { at: number; off: number }

export interface TrackDef {
  id: string;
  name: string;
  cps: CP[];
  features: Feature[];
  laps: number;
  /** Multiplies the automatic banking, and its limit (default 0.18 m per m). */
  bank?: number;
  bankMax?: number;
  /** Water level under gaps (falling below it = respawn). */
  waterY?: number;
  /** Rows of item boxes across the road. */
  items?: Spot[];
  /** Question gates (the road splits into three answer lanes). More are added by themselves on the
      calm stretches until there is one every ~190 m (or `gateCount` per lap). */
  gates?: Spot[];
  gateCount?: number;
  /** Stretches (from a spot, `len` m long) kept free of automatic gates: hazards, tunnels… */
  clear?: (Spot & { len: number })[];
  /** Lines of coins: n coins every `gap` m (default 3.5) at lateral d, drifting by `dd` per coin. */
  coins?: (Spot & { d: number; n: number; gap?: number; dd?: number })[];
  /** Descending spirals (filled in by `withSpiral`): the centre of each loop, its radius and the
      road height at its top, for the scenery (a peak in the middle). */
  spirals?: { x: number; z: number; r: number; top: number }[];
  /** Where each control point of the first drawing is now (detours and spirals add points). */
  orig?: number[];
}

/** A descending spiral: the road swings out to one side, winds once round a circle while dropping
    `drop` metres, passes under its own way in on a bridge and carries on along the same line. */
export interface SpiralOpts {
  /** +1 winds to the left of the direction of travel, −1 to the right. */
  side: 1 | -1;
  drop: number;
  /** Swing-out angle (deg), its radius, the straight bits and the loop's radius (m). */
  a?: number; r1?: number; s1?: number; R?: number;
  /** Control points before the spiral over which the road climbs to the top. */
  climb?: number;
  /** …or metres of road (takes over from `climb`). */
  climbM?: number;
  /** In a detour: straight points to pass before the spiral starts. */
  skip?: number;
}
/** The track with a descending spiral after control point `at` (the road must run straight there
    for ~60 m); later features, items, gates and coins keep their places. */
export function withSpiral(def: TrackDef, at: number, o: SpiralOpts): TrackDef {
  const cps = def.cps, n = cps.length;
  const A = cps[at], B = cps[at + 1];
  const tl = Math.hypot(B.x - A.x, B.z - A.z), ux = (B.x - A.x) / tl, uz = (B.z - A.z) / tl;
  const lx = -uz * o.side, lz = ux * o.side; // the side the loop goes to
  const a = ((o.a ?? 40) * Math.PI) / 180, r1 = o.r1 ?? 30, s1 = o.s1 ?? 30, R = o.R ?? 26;
  // the centre line, by integrating the curvature: swing out, straight, round the loop, straight, back
  const segs: [number, number][] = [[1 / r1, a * r1], [0, s1], [1 / R, (Math.PI * 2 - 2 * a) * R], [0, s1], [1 / r1, a * r1]];
  const pts: { u: number; v: number; s: number }[] = [{ u: 0, v: 0, s: 0 }];
  let u = 0, v = 0, h = 0, sAcc = 0, cu = 0, cv = 0;
  segs.forEach(([k, len], si) => {
    const m = Math.max(1, Math.round(len)), d = len / m;
    for (let i = 0; i < m; i++) { h += k * d; u += Math.cos(h) * d; v += Math.sin(h) * d; sAcc += d; pts.push({ u, v, s: sAcc }); }
    if (si === 2) { cu = u - Math.sin(h) * R; cv = v + Math.cos(h) * R; }
  });
  const total = sAcc, end = u;
  // control points on the straight that the spiral replaces
  let m = 0;
  while (at + 1 + m < n - 1) { const c = cps[at + 1 + m]; if ((c.x - A.x) * ux + (c.z - A.z) * uz < end + 8) m++; else break; }
  const yA = A.y ?? 0, yEnd = cps[at + 1 + m].y ?? 0;
  const climb = o.climb ?? 10;
  const sm = (t: number) => t * t * (3 - 2 * t);
  // the climb before it: over `climb` control points, or over `climbM` metres of road
  const back: number[] = [];
  for (let i = at, d = 0; i >= 0; i--) { back[i] = d; if (i > 0) d += Math.hypot(cps[i].x - cps[i - 1].x, cps[i].z - cps[i - 1].z); }
  const out: CP[] = cps.slice(0, at + 1).map((c, i) => {
    const f = o.climbM ? 1 - back[i] / o.climbM : (i - (at - climb)) / climb;
    return f > 0 ? { ...c, y: (c.y ?? 0) + o.drop * sm(Math.min(1, f)) } : { ...c };
  });
  const step = 9, sp: CP[] = [];
  for (let d = step; d < total - step * 0.6; d += step) {
    const p = pts[Math.min(pts.length - 1, Math.round((d / total) * (pts.length - 1)))];
    const f = p.s / total;
    sp.push({ x: A.x + ux * p.u + lx * p.v, z: A.z + uz * p.u + lz * p.v, y: yA + o.drop + (yEnd - yA - o.drop) * f, w: A.w, apron: Math.min(A.apron ?? 6, 1.5), wall: true });
  }
  const shift = sp.length - m;
  const re = (i: number) => (i <= at ? i : i <= at + m ? at : i + shift);
  const top = yA + o.drop;
  return {
    ...def,
    cps: [...out, ...sp, ...cps.slice(at + 1 + m)],
    features: def.features.map((f) => ({ ...f, at: re(f.at) })),
    items: def.items?.map((x) => ({ ...x, at: re(x.at) })),
    gates: def.gates?.map((x) => ({ ...x, at: re(x.at) })),
    clear: [...(def.clear ?? []).map((x) => ({ ...x, at: re(x.at) })), { at, off: -10, len: total + 30 }],
    coins: def.coins?.map((x) => ({ ...x, at: re(x.at) })),
    spirals: [...(def.spirals ?? []), { x: A.x + ux * cu + lx * cv, z: A.z + uz * cu + lz * cv, r: R, top }],
    orig: (def.orig ?? cps.map((_, i) => i)).map(re),
  };
}

/** A corner of a detour: the road runs straight from corner to corner and rounds each one with an
    arc of radius `r` (default 34 m). `y` sets the road height there; `spiral` puts a descending
    spiral on the straight that leaves this corner (it must be ≥ 130 m long). */
export interface Corner { x: number; z: number; r?: number; y?: number; spiral?: SpiralOpts }
/** The track with a new stretch between control points `at` and `at + 1 + drop` (the `drop` points
    in between go away): straights joined by round corners. Features, items, gates and coins after it
    keep their places; `add` brings new ones, placed by corner number (0 = the first corner). */
export function withDetour(def: TrackDef, at: number, drop: number, corners: Corner[], add: { local?: 'out' | 'in'; lead?: number; w?: number; apron?: number; features?: Feature[]; items?: Spot[]; coins?: NonNullable<TrackDef['coins']>; clear?: NonNullable<TrackDef['clear']> } = {}): TrackDef {
  const cps = def.cps, A = cps[at], B = cps[(at + 1 + drop) % cps.length];
  if (add.local) {
    // corners given along the chord A→B (x) and away from it (z), out of the track or into it
    const D = Math.hypot(B.x - A.x, B.z - A.z), ux = (B.x - A.x) / D, uz = (B.z - A.z) / D;
    let mx = 0, mz = 0;
    for (const c of cps) { mx += c.x / cps.length; mz += c.z / cps.length; }
    const sg = (((A.x + B.x) / 2 - mx) * -uz + ((A.z + B.z) / 2 - mz) * ux > 0 ? 1 : -1) * (add.local === 'out' ? 1 : -1);
    corners = corners.map((c) => ({ ...c, x: A.x + ux * c.x - uz * sg * c.z, z: A.z + uz * c.x + ux * sg * c.z }));
  }
  // the stretch leaves A the way the road reaches it and meets B the way the road leaves it
  const lead = add.lead ?? 36;
  if (lead > 0) {
    const N = cps.length, b = at + 1 + drop;
    const tan = (i: number) => { const p = cps[(i - 1 + N) % N], q = cps[(i + 1) % N], l = Math.hypot(q.x - p.x, q.z - p.z); return { x: (q.x - p.x) / l, z: (q.z - p.z) / l }; };
    const ta = tan(at), tb = tan(b);
    corners = [{ x: A.x + ta.x * lead, z: A.z + ta.z * lead, r: 80 }, ...corners, { x: B.x - tb.x * lead, z: B.z - tb.z * lead, r: 80 }];
  }
  const P = [{ x: A.x, z: A.z }, ...corners, { x: B.x, z: B.z }];
  const out: (CP & { c?: number })[] = [];
  const dist: number[] = []; // distance along the detour of each new point
  let run = 0, prev = { x: A.x, z: A.z };
  const push = (x: number, z: number, c?: number) => { run += Math.hypot(x - prev.x, z - prev.z); prev = { x, z }; out.push({ x, z, c }); dist.push(run); };
  const firstOf: number[] = [], lastOf: number[] = [], cornerRun: number[] = [];
  let last = { x: A.x, z: A.z }; // where the previous arc ended
  const straight = (to: { x: number; z: number }, lead: boolean, tail: boolean) => {
    const L = Math.hypot(to.x - last.x, to.z - last.z);
    if (L < 1) return;
    const ux = (to.x - last.x) / L, uz = (to.z - last.z) / L;
    const ds: number[] = [];
    if (lead && L > 30) ds.push(11);
    const a0 = lead ? 11 : 0, a1 = tail ? L - 11 : L, n = Math.floor((a1 - a0) / 48);
    for (let k = 1; k <= n; k++) ds.push(a0 + ((a1 - a0) * k) / (n + 1));
    if (tail && L > 30) ds.push(L - 11);
    for (const d of ds) push(last.x + ux * d, last.z + uz * d);
  };
  for (let i = 1; i < P.length - 1; i++) {
    const p0 = P[i - 1], p = P[i], p1 = P[i + 1], c = corners[i - 1];
    const l0 = Math.hypot(p.x - p0.x, p.z - p0.z), l1 = Math.hypot(p1.x - p.x, p1.z - p.z);
    const ux = (p.x - p0.x) / l0, uz = (p.z - p0.z) / l0, vx = (p1.x - p.x) / l1, vz = (p1.z - p.z) / l1;
    const cross = ux * vz - uz * vx, th = Math.atan2(cross, ux * vx + uz * vz), ath = Math.abs(th);
    firstOf.push(out.length);
    if (ath < 0.03) { straight(p, i > 1, false); push(p.x, p.z, i - 1); last = p; cornerRun.push(run); lastOf.push(out.length - 2); continue; }
    const half = Math.tan(ath / 2), T = Math.min((c.r ?? 34) * half, l0 * (i === 1 ? 0.92 : 0.48), l1 * (i === P.length - 2 ? 0.92 : 0.48)), R = T / half;
    const sx = p.x - ux * T, sz = p.z - uz * T, sg = Math.sign(th);
    straight({ x: sx, z: sz }, i > 1, true);
    const cx = sx - uz * sg * R, cz = sz + ux * sg * R, a0 = Math.atan2(sz - cz, sx - cx), n = Math.max(2, Math.ceil(ath / 0.33));
    for (let k = 0; k <= n; k++) { const a = a0 + (th * k) / n; push(cx + Math.cos(a) * R, cz + Math.sin(a) * R, k === Math.floor(n / 2) ? i - 1 : undefined); }
    cornerRun.push(dist[out.length - 1 - Math.ceil(n / 2)] ?? run);
    lastOf.push(out.length - 1);
    last = { x: p.x + vx * T, z: p.z + vz * T };
  }
  const leave = out.length;
  straight(B, true, Math.hypot(B.x - last.x, B.z - last.z) > 60);
  const total = run + Math.hypot(B.x - prev.x, B.z - prev.z);
  // heights: straight lines between the corners that give one (and the two ends)
  const keys: [number, number][] = [[0, A.y ?? 0]];
  corners.forEach((c, i) => { if (c.y !== undefined) keys.push([cornerRun[i], c.y]); });
  keys.push([total, B.y ?? 0]);
  const sm = (t: number) => t * t * (3 - 2 * t);
  out.forEach((o, i) => {
    let k = 0;
    while (k < keys.length - 2 && keys[k + 1][0] < dist[i]) k++;
    const f = (dist[i] - keys[k][0]) / Math.max(1, keys[k + 1][0] - keys[k][0]);
    o.y = keys[k][1] + (keys[k + 1][1] - keys[k][1]) * sm(Math.min(1, Math.max(0, f)));
    o.w = add.w ?? A.w; o.apron = add.apron ?? Math.min(A.apron ?? 6, 4); o.wall = true;
    delete o.c;
  });
  const shift = out.length - drop;
  const re = (i: number) => (i <= at ? i : i <= at + drop ? at : i + shift);
  const loc = <T extends { at: number }>(x: T): T => ({ ...x, at: at + 1 + (firstOf[x.at] ?? leave) });
  let res: TrackDef = {
    ...def,
    cps: [...cps.slice(0, at + 1), ...out, ...cps.slice(at + 1 + drop)],
    features: [...def.features.map((f) => ({ ...f, at: re(f.at) })), ...(add.features ?? []).map(loc)],
    items: [...(def.items ?? []).map((x) => ({ ...x, at: re(x.at) })), ...(add.items ?? []).map(loc)],
    gates: def.gates?.map((x) => ({ ...x, at: re(x.at) })),
    clear: [...(def.clear ?? []).map((x) => ({ ...x, at: re(x.at) })), ...(add.clear ?? []).map(loc)],
    coins: [...(def.coins ?? []).map((x) => ({ ...x, at: re(x.at) })), ...(add.coins ?? []).map(loc)],
    orig: (def.orig ?? cps.map((_, i) => i)).map(re),
  };
  // spirals, last one first so the earlier ones keep their places
  for (let i = corners.length - 1; i >= 0; i--) {
    const sp = corners[i].spiral;
    if (!sp) continue;
    // the lead point of the straight after this corner's arc gives the direction
    const a = at + 1 + lastOf[i] + 1;
    res = withSpiral(res, a + (sp.skip ?? 0), { climbM: 170, ...sp });
  }
  return res;
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
  /** Over another stretch of road (a bridge: no embankment underneath). */
  bridge: boolean;
}

export interface Ramp { s0: number; s1: number; h: number }
export interface Gap { s0: number; s1: number }
export interface Pad { s0: number; s1: number; d: number; hw: number }
/** A vertical loop: the ribbon starts and ends at s, entering on the left lane (d0) and leaving on
    the right one (d0 + shift), so its two ends sit side by side. A tilted loop leans over to one side
    (most at the top, none at its feet). */
export interface Loop { s: number; r: number; d0: number; shift: number; tilt: number }
export const LOOP_HW = 3.2;

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
  /** Distance along the road of each control point of the first drawing (what the scenery goes by). */
  readonly oS: number[];
  readonly ramps: Ramp[] = [];
  readonly gaps: Gap[] = [];
  readonly pads: Pad[] = [];
  readonly loops: Loop[] = [];
  readonly splashes: Gap[] = [];
  readonly waterY: number;
  /** Item box rows, question gates (distance along the road) and coins (s, d). */
  readonly itemRows: number[] = [];
  readonly gates: number[] = [];
  readonly coins: { s: number; d: number }[] = [];

  constructor(def: TrackDef) {
    this.def = { ...def };
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
    this.oS = (def.orig ?? def.cps.map((_, i) => i)).map((i) => this.cpS[i]);
    this.length = len;
    const N = Math.round(len);
    this.ds = len / N;
    // resample every ds metres
    let j = 0;
    for (let i = 0; i < N; i++) {
      const s = i * this.ds;
      while (j < dense.length - 2 && dense[j + 1].len < s) j++;
      const A = dense[j], B = dense[j + 1], f = (s - A.len) / Math.max(1e-6, B.len - A.len);
      this.frames.push({ s, p: A.p.clone().lerp(B.p, f), t: new THREE.Vector3(), r: new THREE.Vector3(), slope: 0, bank: 0, w: A.w + (B.w - A.w) * f, apron: A.apron + (B.apron - A.apron) * f, wall: (f < 0.5 ? A.wall : B.wall) === 1, curv: 0, yaw: 0, bridge: false });
    }
    const F = this.frames;
    for (let i = 0; i < N; i++) {
      const a = F[(i - 1 + N) % N].p, b = F[(i + 1) % N].p, fr = F[i];
      fr.t.set(b.x - a.x, 0, b.z - a.z).normalize();
      fr.r.crossVectors(fr.t, UP).normalize();
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
      F[i].bank = THREE.MathUtils.clamp((c / (2 * K + 1)) * 5.5 * bk, -(def.bankMax ?? 0.18), def.bankMax ?? 0.18);
    }
    // a banked road pivots on its low edge (raised, never sunk into the ground), then the slope
    for (const f of F) f.p.y += Math.abs(f.bank) * (f.w + KERB);
    for (let i = 0; i < N; i++) F[i].slope = (F[(i + 1) % N].p.y - F[(i - 1 + N) % N].p.y) / (2 * this.ds);
    // bridges: stretches that pass over another stretch of road (a spiral's way in)
    const reach = (f: Frame) => f.w + KERB + f.apron + 1.5;
    const over: number[] = [];
    for (let i = 0; i < N; i += 2) {
      const a = F[i];
      for (let j = 0; j < N; j += 2) {
        const b = F[j], along = Math.abs(a.s - b.s);
        if (Math.min(along, len - along) < 40 || b.p.y > a.p.y - 4) continue;
        const dx = a.p.x - b.p.x, dz = a.p.z - b.p.z, r = reach(a) + reach(b) + 2;
        if (dx * dx + dz * dz < r * r) { over.push(i); break; }
      }
    }
    for (const i of over) for (let k = -8; k <= 8; k++) F[(i + k + N) % N].bridge = true;
    // features snap to whole frames, so the meshes and the physics agree to the centimetre
    const at = (cp: number, off: number) => ((Math.round((this.cpS[cp] + off) / this.ds) * this.ds % len) + len) % len;
    const span = (l: number) => Math.max(1, Math.round(l / this.ds)) * this.ds;
    for (const f of def.features) {
      const s0 = at(f.at, f.off);
      if (f.kind === 'ramp') this.ramps.push({ s0, s1: s0 + span(f.len), h: f.h });
      else if (f.kind === 'gap') this.gaps.push({ s0, s1: s0 + span(f.len) });
      else if (f.kind === 'loop') this.loops.push({ s: s0, r: f.r, d0: -3.9, shift: 7.8, tilt: f.tilt ?? 0 });
      else if (f.kind === 'splash') this.splashes.push({ s0, s1: s0 + span(f.len) });
      else this.pads.push({ s0, s1: s0 + (f.len ?? 7), d: f.d, hw: (f.w ?? 3) / 2 });
    }
    for (const r of def.items ?? []) this.itemRows.push(at(r.at, r.off));
    for (const g of def.gates ?? []) this.gates.push(at(g.at, g.off));
    this.autoGates(def, at);
    for (const c of def.coins ?? []) for (let k = 0; k < c.n; k++) this.coins.push({ s: (at(c.at, c.off) + k * (c.gap ?? 3.5)) % len, d: c.d + k * (c.dd ?? 0) });
  }

  /** More question gates on the calm stretches: straight enough for the painted lanes, away from
      jumps, boost pads, item boxes, coins, hazards and the start, spread as evenly as possible. */
  private autoGates(def: TrackDef, at: (cp: number, off: number) => number) {
    const L = this.length, want = def.gateCount ?? Math.max(this.gates.length, Math.round(L / 190));
    const near = (s: number, a: number, b: number, before: number, after: number) => { const x = this.ahead(a, s), y = this.ahead(s, a); return (x <= b - a + after) || y <= before; };
    const blocked: [number, number][] = [];
    for (const r of [...this.ramps, ...this.gaps]) blocked.push([r.s0, r.s1]);
    for (const p of this.pads) blocked.push([p.s0, p.s1]);
    for (const l of this.loops) blocked.push([l.s - 20, l.s + 25]);
    for (const w of this.splashes) blocked.push([w.s0, w.s1]);
    for (const c of def.clear ?? []) { const s0 = at(c.at, c.off); blocked.push([s0, s0 + c.len]); }
    const cands: number[] = [];
    for (let s = 40; s < L - 70; s += 2) {
      let ok = true;
      for (let k = -44; k <= 8 && ok; k += 2) if (Math.abs(this.frame(Math.round((s + k) / this.ds)).curv) > 0.024) ok = false;
      for (const [a, b] of blocked) if (ok && near(s, a, b, 22, 50)) ok = false;
      for (const r of this.itemRows) if (ok && near(s, r, r, 18, 46)) ok = false;
      for (const c of this.coins) if (ok && near(s, c.s, c.s, 4, 44)) ok = false;
      if (ok) cands.push(Math.round(s / this.ds) * this.ds);
    }
    const gap = (s: number) => this.gates.reduce((m, g) => Math.min(m, this.ahead(s, g), this.ahead(g, s)), Infinity);
    while (this.gates.length < want && cands.length) {
      let best = -1, bd = 0;
      for (const c of cands) { const d = gap(c); if (d > bd) { bd = d; best = c; } }
      if (best < 0 || bd < 120) break;
      this.gates.push(best);
    }
    this.gates.sort((a, b) => a - b);
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
  splashAt(s: number) { return this.splashes.some((g) => this.inRange(s, g.s0, g.s1) >= 0); }

  /** A point on a loop at progress u (0..1) and lateral offset d from the ribbon's centre line. */
  loopPoint(lp: Loop, u: number, d: number, out = new THREE.Vector3()) {
    const f = this.frame(Math.round(lp.s / this.ds)), a = u * Math.PI * 2, sm = u * u * (3 - 2 * u);
    this.pointAt(lp.s, 0, out);
    const side = lp.d0 + lp.shift * sm + d, h = lp.r * (1 - Math.cos(a)), fw = lp.r * Math.sin(a);
    // the loop's plane turns about the road's centre line by the tilt (up → up·cos + right·sin)
    const T = lp.tilt * Math.sin(Math.PI * u), ct = Math.cos(T), st = Math.sin(T);
    out.x += f.t.x * fw + f.r.x * (st * h + ct * side);
    out.z += f.t.z * fw + f.r.z * (st * h + ct * side);
    out.y += ct * h - st * side;
    return out;
  }
  private _la = new THREE.Vector3(); private _lb = new THREE.Vector3();
  /** The loop's frame at u: forward along the ribbon and up (towards the loop's centre). */
  loopBasis(lp: Loop, u: number, fwd: THREE.Vector3, up: THREE.Vector3) {
    const f = this.frame(Math.round(lp.s / this.ds)), a = u * Math.PI * 2;
    if (!lp.tilt) {
      fwd.set(f.t.x * Math.cos(a), Math.sin(a), f.t.z * Math.cos(a));
      up.set(-f.t.x * Math.sin(a), Math.cos(a), -f.t.z * Math.sin(a));
      return f;
    }
    const e = 0.002;
    fwd.subVectors(this.loopPoint(lp, u + e, 0, this._la), this.loopPoint(lp, u - e, 0, this._lb)).normalize();
    const T = lp.tilt * Math.sin(Math.PI * u), ct = Math.cos(T), st = Math.sin(T), sa = Math.sin(a), ca = Math.cos(a);
    up.set(-f.t.x * sa + f.r.x * st * ca, ct * ca, -f.t.z * sa + f.r.z * st * ca);
    up.addScaledVector(fwd, -up.dot(fwd)).normalize();
    return f;
  }
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
