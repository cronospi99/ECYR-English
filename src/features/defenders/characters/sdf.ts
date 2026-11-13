/* Sculpting with signed distance fields. A limb is described as rounded primitives that melt into
   each other (smooth union), with carved cavities (smooth subtraction). The field is turned into a
   mesh with marching cubes; normals come from the field itself, so the surface shades like one
   continuous sculpt instead of a pile of intersecting balls. */
import * as THREE from 'three';
import { edgeTable, triTable } from 'three/examples/jsm/objects/MarchingCubes.js';

export type SdfShape = 'sph' | 'box' | 'cyl' | 'cone' | 'dome' | 'cap' | 'torus';

export interface Prim {
  shape: SdfShape;
  /** world → local rotation (rows) and the primitive's centre */
  r: number[]; t: number[];
  /** shape parameters: radii / half extents / (half length, radius) / (R, tube, arc) */
  a: number; b: number; c: number;
  round: number;
  k: number;
  col: number[];
  pbr: number[];
  br: number;
}

const _e = new THREE.Euler(), _m4 = new THREE.Matrix4();

export function prim(shape: SdfShape, p: number[], rot: number[], a: number, b: number, c: number, round = 0): Prim {
  _m4.makeRotationFromEuler(_e.set(rot[0], rot[1], rot[2]));
  const e = _m4.elements;
  let br: number;
  if (shape === 'box') br = Math.hypot(a, b, c);
  else if (shape === 'cyl' || shape === 'cone') br = Math.hypot(Math.max(a, c), b);
  else if (shape === 'cap') br = a + b;
  else if (shape === 'torus') br = a + b;
  else br = Math.max(a, b, c);
  return { shape, r: [e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]], t: [p[0], p[1], p[2]], a, b, c, round, k: 0, col: [1, 1, 1], pbr: [0.5, 0, 0], br };
}

/** Distance from a point to one primitive (exact for spheres, boxes, capsules; a good bound for the rest). */
export function dist(q: Prim, x: number, y: number, z: number): number {
  const dx = x - q.t[0], dy = y - q.t[1], dz = z - q.t[2], r = q.r;
  const lx = r[0] * dx + r[1] * dy + r[2] * dz, ly = r[3] * dx + r[4] * dy + r[5] * dz, lz = r[6] * dx + r[7] * dy + r[8] * dz;
  const a = q.a, b = q.b, c = q.c;
  switch (q.shape) {
    case 'sph':
    case 'dome': {
      let d: number;
      if (a === b && b === c) d = Math.sqrt(lx * lx + ly * ly + lz * lz) - a;
      else {
        const ux = lx / a, uy = ly / b, uz = lz / c;
        const k0 = Math.sqrt(ux * ux + uy * uy + uz * uz);
        const k1 = Math.sqrt((ux / a) ** 2 + (uy / b) ** 2 + (uz / c) ** 2);
        d = k1 < 1e-9 ? -Math.min(a, b, c) : (k0 * (k0 - 1)) / k1;
      }
      return q.shape === 'dome' ? Math.max(d, -ly) : d;
    }
    case 'box': {
      const rd = q.round;
      const qx = Math.abs(lx) - (a - rd), qy = Math.abs(ly) - (b - rd), qz = Math.abs(lz) - (c - rd);
      const ox = Math.max(qx, 0), oy = Math.max(qy, 0), oz = Math.max(qz, 0);
      return Math.sqrt(ox * ox + oy * oy + oz * oz) + Math.min(Math.max(qx, qy, qz), 0) - rd;
    }
    case 'cyl': {
      const rd = q.round;
      let dr: number;
      if (a === c) dr = Math.sqrt(lx * lx + lz * lz) - a;
      else {
        const ux = lx / a, uz = lz / c;
        const k0 = Math.sqrt(ux * ux + uz * uz), k1 = Math.sqrt((ux / a) ** 2 + (uz / c) ** 2);
        dr = k1 < 1e-9 ? -Math.min(a, c) : (k0 * (k0 - 1)) / k1;
      }
      dr += rd;
      const dh = Math.abs(ly) - b + rd;
      const o1 = Math.max(dr, 0), o2 = Math.max(dh, 0);
      return Math.min(Math.max(dr, dh), 0) + Math.sqrt(o1 * o1 + o2 * o2) - rd;
    }
    case 'cone': {
      const rm = Math.min(a, c);
      const rho = Math.hypot(lx / a, lz / c) * rm;
      // capped cone, base radius rm at -b, apex at +b
      const k2x = -rm, k2y = 2 * b;
      const cax = rho - Math.min(rho, ly < 0 ? rm : 0), cay = Math.abs(ly) - b;
      const tt = Math.min(Math.max(((0 - rho) * k2x + (b - ly) * k2y) / (k2x * k2x + k2y * k2y), 0), 1);
      const cbx = rho - 0 + k2x * tt, cby = ly - b + k2y * tt;
      const s = cbx < 0 && cay < 0 ? -1 : 1;
      return s * Math.sqrt(Math.min(cax * cax + cay * cay, cbx * cbx + cby * cby));
    }
    case 'cap': {
      const yy = ly - Math.min(Math.max(ly, -a), a);
      return Math.sqrt(lx * lx + yy * yy + lz * lz) - b;
    }
    default: { // torus in its local XY plane
      if (c >= Math.PI * 2 - 1e-3) return Math.hypot(Math.hypot(lx, ly) - a, lz) - b;
      let ang = Math.atan2(ly, lx);
      if (ang < 0) ang += Math.PI * 2;
      if (ang > c) ang = ang - c < Math.PI * 2 - ang ? c : 0;
      return Math.hypot(lx - Math.cos(ang) * a, ly - Math.sin(ang) * a, lz) - b;
    }
  }
}

const smin = (a: number, b: number, k: number) => {
  if (k <= 0) return a < b ? a : b;
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return (a < b ? a : b) - h * h * k * 0.25;
};

export class Field {
  adds: Prim[] = [];
  cuts: Prim[] = [];

  eval(x: number, y: number, z: number): number {
    let d = 1e3;
    for (const q of this.adds) {
      const bx = x - q.t[0], by = y - q.t[1], bz = z - q.t[2];
      const bound = Math.sqrt(bx * bx + by * by + bz * bz) - q.br;
      if (bound > d + q.k) continue;
      d = smin(d, dist(q, x, y, z), q.k);
    }
    for (const q of this.cuts) {
      const bx = x - q.t[0], by = y - q.t[1], bz = z - q.t[2];
      const bound = Math.sqrt(bx * bx + by * by + bz * bz) - q.br;
      if (bound > q.k + 0.03) continue;
      d = -smin(-d, dist(q, x, y, z), q.k);
    }
    return d;
  }

  /** Marching cubes over the bounds of the field. Returns welded positions and triangle indices. */
  mesh(cell: number, maxN = 84): { pos: Float32Array; idx: Uint32Array } {
    const lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
    for (const q of this.adds) for (let i = 0; i < 3; i++) {
      lo[i] = Math.min(lo[i], q.t[i] - q.br - q.k * 0.5); hi[i] = Math.max(hi[i], q.t[i] + q.br + q.k * 0.5);
    }
    const ext = Math.max(hi[0] - lo[0], hi[1] - lo[1], hi[2] - lo[2]);
    cell = Math.max(cell, ext / (maxN - 4));
    for (let i = 0; i < 3; i++) lo[i] -= cell * 1.5;
    const nx = Math.ceil((hi[0] - lo[0]) / cell) + 3, ny = Math.ceil((hi[1] - lo[1]) / cell) + 3, nz = Math.ceil((hi[2] - lo[2]) / cell) + 3;
    const nxy = nx * ny, F = new Float32Array(nxy * nz).fill(1e3);
    const span = (q: Prim, pad: number) => {
      const o: number[] = [];
      const n = [nx, ny, nz];
      for (let i = 0; i < 3; i++) {
        o.push(Math.max(0, Math.floor((q.t[i] - q.br - pad - lo[i]) / cell)), Math.min(n[i] - 1, Math.ceil((q.t[i] + q.br + pad - lo[i]) / cell)));
      }
      return o;
    };
    for (const q of this.adds) {
      const s = span(q, q.k + cell);
      for (let k = s[4]; k <= s[5]; k++) for (let j = s[2]; j <= s[3]; j++) for (let i = s[0]; i <= s[1]; i++) {
        const id = i + j * nx + k * nxy;
        F[id] = smin(F[id], dist(q, lo[0] + i * cell, lo[1] + j * cell, lo[2] + k * cell), q.k);
      }
    }
    for (const q of this.cuts) {
      const s = span(q, q.k + cell);
      for (let k = s[4]; k <= s[5]; k++) for (let j = s[2]; j <= s[3]; j++) for (let i = s[0]; i <= s[1]; i++) {
        const id = i + j * nx + k * nxy;
        F[id] = -smin(-F[id], dist(q, lo[0] + i * cell, lo[1] + j * cell, lo[2] + k * cell), q.k);
      }
    }
    const pos: number[] = [], idx: number[] = [];
    const ex = new Int32Array(F.length).fill(-1), ey = new Int32Array(F.length).fill(-1), ez = new Int32Array(F.length).fill(-1);
    const cache = [ex, ey, ez];
    const vert = (node: number, axis: number, i: number, j: number, k: number): number => {
      const c = cache[axis];
      if (c[node] >= 0) return c[node];
      const va = F[node], vb = F[node + (axis === 0 ? 1 : axis === 1 ? nx : nxy)];
      const t = va / (va - vb);
      pos.push(lo[0] + (i + (axis === 0 ? t : 0)) * cell, lo[1] + (j + (axis === 1 ? t : 0)) * cell, lo[2] + (k + (axis === 2 ? t : 0)) * cell);
      return (c[node] = pos.length / 3 - 1);
    };
    // edge → (corner offset i,j,k ; axis)
    const ED = [[0, 0, 0, 0], [1, 0, 0, 1], [0, 1, 0, 0], [0, 0, 0, 1], [0, 0, 1, 0], [1, 0, 1, 1], [0, 1, 1, 0], [0, 0, 1, 1], [0, 0, 0, 2], [1, 0, 0, 2], [1, 1, 0, 2], [0, 1, 0, 2]];
    const ev = new Int32Array(12);
    for (let k = 0; k < nz - 1; k++) for (let j = 0; j < ny - 1; j++) for (let i = 0; i < nx - 1; i++) {
      const n0 = i + j * nx + k * nxy;
      let ci = 0;
      if (F[n0] < 0) ci |= 1;
      if (F[n0 + 1] < 0) ci |= 2;
      if (F[n0 + 1 + nx] < 0) ci |= 4;
      if (F[n0 + nx] < 0) ci |= 8;
      if (F[n0 + nxy] < 0) ci |= 16;
      if (F[n0 + 1 + nxy] < 0) ci |= 32;
      if (F[n0 + 1 + nx + nxy] < 0) ci |= 64;
      if (F[n0 + nx + nxy] < 0) ci |= 128;
      const bits = edgeTable[ci];
      if (!bits) continue;
      for (let e = 0; e < 12; e++) if (bits & (1 << e)) {
        const d = ED[e];
        ev[e] = vert(n0 + d[0] + d[1] * nx + d[2] * nxy, d[3], i + d[0], j + d[1], k + d[2]);
      }
      for (let t = ci * 16; triTable[t] !== -1; t += 3) idx.push(ev[triTable[t]], ev[triTable[t + 2]], ev[triTable[t + 1]]);
    }
    return { pos: new Float32Array(pos), idx: new Uint32Array(idx) };
  }
}
