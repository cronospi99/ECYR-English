/**
 * Taxi Rush — geometry for the city.
 *
 * Everything static is built by a `Mesher` (a tiny non-indexed triangle
 * soup with position, normal, uv and vertex colour) and collected per map cell
 * by a `Layer`, one Layer per material. A building is a handful of quads per
 * floor, so a whole district is a few thousand triangles and the city as a
 * whole draws a few meshes per cell instead of one per building.
 */
import {
  BufferGeometry,
  Color,
  Float32BufferAttribute,
  Group,
  Mesh,
  type Material,
} from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { cellUV, type CellName } from './textures';

/* ------------------------------------------------------------------ *
 * Merging by cell                                                      *
 * ------------------------------------------------------------------ */

/**
 * ECYR perf: merge by city cell, not by list order. Merging "the next 400 pieces" made buffers that
 * spanned the whole map, so the camera could never leave any of them out (and neither could the
 * sun's shadow pass): every frame drew the entire city. Grouped into cells of a block or so,
 * whatever is behind the camera or past the fog is skipped.
 */
export const CELL = 44;
export function mergeByCell(geos: BufferGeometry[], cap = 600): BufferGeometry[] {
  const cells = new Map<string, BufferGeometry[]>();
  for (const g of geos) {
    if (!g.boundingBox) g.computeBoundingBox();
    const b = g.boundingBox!;
    const key = Math.floor((b.min.x + b.max.x) / 2 / CELL) + ',' + Math.floor((b.min.z + b.max.z) / 2 / CELL);
    let l = cells.get(key);
    if (!l) cells.set(key, (l = []));
    l.push(g);
  }
  const out: BufferGeometry[] = [];
  for (const l of cells.values()) {
    for (let i = 0; i < l.length; i += cap) {
      const m = mergeGeometries(l.slice(i, i + cap), false);
      if (m) { m.computeBoundingSphere(); out.push(m); }
    }
  }
  return out;
}

/* ------------------------------------------------------------------ *
 * Mesher                                                               *
 * ------------------------------------------------------------------ */

export type V3 = [number, number, number];
export type RGB = [number, number, number];
type UV = [number, number, number, number];

const colorCache = new Map<string, RGB>();
/** Linear RGB triple for a hex colour (vertex colours are read as linear by three). */
export function rgb(hex: string): RGB {
  let c = colorCache.get(hex);
  if (!c) { const k = new Color(hex); colorCache.set(hex, (c = [k.r, k.g, k.b])); }
  return c;
}
const scale = (c: RGB, s: number): RGB => [Math.min(1, c[0] * s), Math.min(1, c[1] * s), Math.min(1, c[2] * s)];
export { scale as shade };

export class Mesher {
  private p: number[] = [];
  private n: number[] = [];
  private u: number[] = [];
  private c: number[] = [];
  private l: number[] = [];
  /** When set, every vertex also carries a `aLayer` float (the ground material's surface index). */
  layered = false;
  layer = 0;

  get empty(): boolean { return this.p.length === 0; }
  /** Vertices so far (to remember where a piece starts and ends). */
  get vertexCount(): number { return this.p.length / 3; }

  private vert(v: V3, nx: number, ny: number, nz: number, u: number, w: number, col: RGB): void {
    this.p.push(v[0], v[1], v[2]);
    this.n.push(nx, ny, nz);
    this.u.push(u, w);
    this.c.push(col[0], col[1], col[2]);
    if (this.layered) this.l.push(this.layer);
  }

  /** A triangle, counter-clockwise seen from outside. uvs are per vertex. */
  tri(a: V3, b: V3, c: V3, ua: [number, number], ub: [number, number], uc: [number, number], col: RGB): void {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
    const l = Math.hypot(nx, ny, nz) || 1;
    nx /= l; ny /= l; nz /= l;
    this.vert(a, nx, ny, nz, ua[0], ua[1], col);
    this.vert(b, nx, ny, nz, ub[0], ub[1], col);
    this.vert(c, nx, ny, nz, uc[0], uc[1], col);
  }

  /** A quad: a bottom-left, b bottom-right, c top-right, d top-left, seen from outside. */
  quad(a: V3, b: V3, c: V3, d: V3, uv: UV, col: RGB): void {
    const [u0, v0, u1, v1] = uv;
    this.tri(a, b, c, [u0, v0], [u1, v0], [u1, v1], col);
    this.tri(a, c, d, [u0, v0], [u1, v1], [u0, v1], col);
  }

  /** Horizontal face looking up. */
  top(x0: number, x1: number, z0: number, z1: number, y: number, uv: UV, col: RGB): void {
    this.quad([x0, y, z1], [x1, y, z1], [x1, y, z0], [x0, y, z0], uv, col);
  }

  /**
   * A vertical face run from `y0` to `y1`, split into `bays` quads (each carrying the
   * whole cell from `uvFor(i)`). Face names are the direction the wall looks.
   */
  wall(face: '+z' | '-z' | '+x' | '-x', x0: number, x1: number, z0: number, z1: number, y0: number, y1: number, bays: number, uvFor: (i: number) => UV, col: RGB): void {
    let ax: number, az: number, bx: number, bz: number;
    switch (face) {
      case '+z': ax = x0; az = z1; bx = x1; bz = z1; break;
      case '-z': ax = x1; az = z0; bx = x0; bz = z0; break;
      case '+x': ax = x1; az = z1; bx = x1; bz = z0; break;
      default: ax = x0; az = z0; bx = x0; bz = z1; break;
    }
    for (let i = 0; i < bays; i++) {
      const s0 = i / bays, s1 = (i + 1) / bays;
      const lx0 = ax + (bx - ax) * s0, lz0 = az + (bz - az) * s0, lx1 = ax + (bx - ax) * s1, lz1 = az + (bz - az) * s1;
      this.quad([lx0, y0, lz0], [lx1, y0, lz1], [lx1, y1, lz1], [lx0, y1, lz0], uvFor(i), col);
    }
  }

  /** A solid box in one cell, vertex-coloured (props, steel, trunks). */
  box(x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, col: RGB, cell: CellName = 'solid', bottom = false): void {
    const uv = cellUV(cell);
    const one = (): UV => uv;
    this.wall('+z', x0, x1, z0, z1, y0, y1, 1, one, col);
    this.wall('-z', x0, x1, z0, z1, y0, y1, 1, one, col);
    this.wall('+x', x0, x1, z0, z1, y0, y1, 1, one, col);
    this.wall('-x', x0, x1, z0, z1, y0, y1, 1, one, col);
    this.top(x0, x1, z0, z1, y1, uv, col);
    if (bottom) this.quad([x0, y0, z0], [x1, y0, z0], [x1, y0, z1], [x0, y0, z1], uv, col);
  }

  /** A box rotated about the vertical axis through (cx, cz). */
  boxRot(cx: number, cz: number, hw: number, hd: number, y0: number, y1: number, yaw: number, col: RGB, cell: CellName = 'solid'): void {
    const uv = cellUV(cell);
    const s = Math.sin(yaw), c = Math.cos(yaw);
    const pt = (lx: number, lz: number, y: number): V3 => [cx + lx * c + lz * s, y, cz - lx * s + lz * c];
    const corners: [number, number][] = [[-hw, hd], [hw, hd], [hw, -hd], [-hw, -hd]];
    for (let i = 0; i < 4; i++) {
      const [ax, az] = corners[i], [bx, bz] = corners[(i + 1) % 4];
      this.quad(pt(ax, az, y0), pt(bx, bz, y0), pt(bx, bz, y1), pt(ax, az, y1), uv, col);
    }
    this.quad(pt(-hw, hd, y1), pt(hw, hd, y1), pt(hw, -hd, y1), pt(-hw, -hd, y1), uv, col);
  }

  /** Flat-shaded cylinder (open-ended unless `cap`). */
  cyl(cx: number, cz: number, y0: number, y1: number, r: number, segs: number, col: RGB, cell: CellName = 'solid', cap = true): void {
    const uv = cellUV(cell);
    const mid: [number, number] = [(uv[0] + uv[2]) / 2, (uv[1] + uv[3]) / 2];
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
      const p0: [number, number] = [cx + Math.cos(a0) * r, cz + Math.sin(a0) * r];
      const p1: [number, number] = [cx + Math.cos(a1) * r, cz + Math.sin(a1) * r];
      this.quad([p1[0], y0, p1[1]], [p0[0], y0, p0[1]], [p0[0], y1, p0[1]], [p1[0], y1, p1[1]], uv, col);
      if (cap) this.tri([cx, y1, cz], [p1[0], y1, p1[1]], [p0[0], y1, p0[1]], mid, mid, mid, col);
    }
  }

  /** A cone (tree crowns, spires), apex up. */
  cone(cx: number, cz: number, y0: number, h: number, r: number, segs: number, col: RGB, cell: CellName = 'solid'): void {
    const uv = cellUV(cell);
    const mid: [number, number] = [(uv[0] + uv[2]) / 2, (uv[1] + uv[3]) / 2];
    for (let i = 0; i < segs; i++) {
      const a0 = (i / segs) * Math.PI * 2, a1 = ((i + 1) / segs) * Math.PI * 2;
      this.tri([cx + Math.cos(a1) * r, y0, cz + Math.sin(a1) * r], [cx + Math.cos(a0) * r, y0, cz + Math.sin(a0) * r], [cx, y0 + h, cz], mid, mid, mid, col);
    }
  }

  /** A faceted ball: two rings of triangles between a point at the bottom and one at the top. */
  blob(cx: number, cy: number, cz: number, rx: number, ry: number, segs: number, col: RGB, cell: CellName = 'solid'): void {
    const uv = cellUV(cell);
    const mid: [number, number] = [(uv[0] + uv[2]) / 2, (uv[1] + uv[3]) / 2];
    const ring = (y: number, r: number, i: number): V3 => {
      const a = (i / segs) * Math.PI * 2;
      return [cx + Math.cos(a) * rx * r, cy + y * ry, cz + Math.sin(a) * rx * r];
    };
    const bot: V3 = [cx, cy - ry, cz], topP: V3 = [cx, cy + ry, cz];
    for (let i = 0; i < segs; i++) {
      this.tri(ring(0, 1, i + 1), ring(0, 1, i), topP, mid, mid, mid, col);
      this.tri(ring(0, 1, i), ring(0, 1, i + 1), bot, mid, mid, mid, col);
    }
  }

  /** Copy an arbitrary three.js geometry in (non-indexed), flattened onto one atlas cell. */
  addGeometry(g: BufferGeometry, col: RGB, cell: CellName = 'solid'): void {
    const ng = g.index ? g.toNonIndexed() : g;
    const uv = cellUV(cell);
    const mu = (uv[0] + uv[2]) / 2, mv = (uv[1] + uv[3]) / 2;
    const pos = ng.getAttribute('position'), nor = ng.getAttribute('normal');
    for (let i = 0; i < pos.count; i++) {
      this.p.push(pos.getX(i), pos.getY(i), pos.getZ(i));
      this.n.push(nor.getX(i), nor.getY(i), nor.getZ(i));
      this.u.push(mu, mv);
      this.c.push(col[0], col[1], col[2]);
      if (this.layered) this.l.push(this.layer);
    }
    if (ng !== g) ng.dispose();
    g.dispose();
  }

  build(): BufferGeometry {
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(this.p, 3));
    g.setAttribute('normal', new Float32BufferAttribute(this.n, 3));
    g.setAttribute('uv', new Float32BufferAttribute(this.u, 2));
    g.setAttribute('color', new Float32BufferAttribute(this.c, 3));
    if (this.layered) g.setAttribute('aLayer', new Float32BufferAttribute(this.l, 1));
    g.computeBoundingSphere();
    g.computeBoundingBox();
    return g;
  }
}

/** One material's worth of the map, held as one Mesher per cell. */
export class Layer {
  private cells = new Map<string, Mesher>();
  /** Which mesh each cell's mesher became, once flushed. */
  readonly built = new Map<Mesher, Mesh>();
  /** Centre of the map cell each mesh covers. */
  readonly centre = new Map<Mesh, [number, number]>();
  constructor(readonly material: Material, private readonly castShadow = false, private readonly layered = false) {}

  /** The cell's mesher; `layer` picks the ground surface for what is drawn next. */
  at(x: number, z: number, layer?: number): Mesher {
    const key = Math.floor(x / CELL) + ',' + Math.floor(z / CELL);
    let m = this.cells.get(key);
    if (!m) { m = new Mesher(); m.layered = this.layered; this.cells.set(key, m); }
    if (layer !== undefined) m.layer = layer;
    return m;
  }

  flush(parent: Group): Mesh[] {
    const out: Mesh[] = [];
    for (const [key, m] of this.cells) {
      if (m.empty) continue;
      const mesh = new Mesh(m.build(), this.material);
      mesh.castShadow = this.castShadow;
      mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false;
      parent.add(mesh);
      this.built.set(m, mesh);
      const [ci, cj] = key.split(',').map(Number);
      this.centre.set(mesh, [(ci + 0.5) * CELL, (cj + 0.5) * CELL]);
      out.push(mesh);
    }
    this.cells.clear();
    return out;
  }
}

/* ------------------------------------------------------------------ *
 * Street props                                                         *
 * ------------------------------------------------------------------ */

const POLE = rgb('#6d747b');
const TRUNK = rgb('#6b4a32');
const LEAVES = ['#4f8f4a', '#5fa352', '#3f7d45', '#6aa84f', '#7fb35a'].map(rgb);
const AUTUMN = ['#c98b3a', '#b9663a'].map(rgb);

/** A low-poly tree: hexagonal trunk and a stacked-cone or faceted-ball crown. */
export function tree(m: Mesher, x: number, z: number, s: number, rand: () => number): void {
  const r = rand();
  const leaf = r < 0.07 ? AUTUMN[Math.floor(rand() * AUTUMN.length)] : LEAVES[Math.floor(rand() * LEAVES.length)];
  m.cyl(x, z, 0.16, 0.16 + 1.3 * s, 0.13 * s, 5, TRUNK, 'solid', false);
  if (r < 0.5) {
    m.cone(x, z, 0.16 + 0.9 * s, 1.9 * s, 0.95 * s, 7, leaf);
    m.cone(x, z, 0.16 + 1.9 * s, 1.5 * s, 0.65 * s, 7, leaf);
  } else {
    m.blob(x, 0.16 + 2.1 * s, z, 1.05 * s, 1.0 * s, 7, leaf);
  }
}

/** A street lamp at (x, z) whose arm reaches `dir` (-1 = north, +1 = south) over the road. */
export function lamp(m: Mesher, x: number, z: number, dir: 1 | -1): void {
  const y0 = 0.16;
  m.box(x - 0.07, x + 0.07, y0, y0 + 4.6, z - 0.07, z + 0.07, POLE);
  const zA = dir > 0 ? z : z - 0.95, zB = dir > 0 ? z + 0.95 : z;
  m.box(x - 0.045, x + 0.045, y0 + 4.5, y0 + 4.6, zA, zB, POLE);
  const hz = z + dir * 0.85;
  m.box(x - 0.16, x + 0.16, y0 + 4.38, y0 + 4.48, hz - 0.2, hz + 0.2, rgb('#fff0c8'), 'lamp');
}
