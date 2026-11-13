/* Language Defenders — 3D character kit.
   Characters are sculpted in code. Organic masses (heads, bodies, hair) are distance fields that
   melt into one smooth surface (see sdf.ts); hard props are bevelled primitives. Everything in a
   limb is merged into one mesh carrying per-vertex colour, roughness, metalness, surface type and
   baked ambient occlusion, drawn with a single physically based material per character. That keeps
   a full board cheap to draw, and lets the engine tint or fade a character through one material.
   Characters are built facing +Z in a unit-height space and then turned towards their lane. */
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { Field, dist, prim, type Prim } from './sdf';

export type V3 = [number, number, number];
export type Mode = 'idle' | 'walk' | 'attack';
export type Shape = 'sph' | 'box' | 'cyl' | 'cone' | 'dome';

/** Surface types: [roughness, metalness, shader id]. The id picks the procedural detail in the shader. */
const SURF = {
  plastic: [0.4, 0, 0], skin: [0.52, 0, 1], zskin: [0.58, 0, 2], cloth: [0.92, 0, 3], hair: [0.48, 0, 4],
  metal: [0.3, 1, 5], gold: [0.24, 1, 5], paper: [0.86, 0, 6], rubber: [0.62, 0, 7], gloss: [0.07, 0, 8],
  wood: [0.72, 0, 9], bone: [0.3, 0, 0], dark: [0.9, 0, 10],
} as const;
export type Surf = keyof typeof SURF | 'auto';

const METAL = new Set([0xc0c6d0, 0x8892a6, 0xd8dde6, 0x55627f, 0xb8c0cc, 0x55565e, 0x35363e, 0x3a3f55, 0xc8cedb]);
const GOLDS = new Set([0xf2b632, 0xf7c948, 0xd9981e, 0xc0862a]);
const autoSurf = (c: number): keyof typeof SURF =>
  GOLDS.has(c) ? 'gold' : METAL.has(c) ? 'metal' : c === 0xf6ecd2 ? 'paper' : c === 0x1c1a22 || c === 0x15131a ? 'gloss' : 'plastic';

/** Shared look of every character material: rim light and shadow tint follow the scenario. */
export const LOOK = {
  rim: { value: new THREE.Color(0xff4fb0) },
  rimK: { value: 0.55 },
  aoTint: { value: new THREE.Color(0x24103a) },
};
/** Mesh density: 1 for close-ups (portraits, menu), higher numbers for the busy board. */
export const QUALITY = { cell: 1 };

const NOISE = /* glsl */ `
float ldH(vec3 p){ p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float ldN(vec3 x){ vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(ldH(i), ldH(i + vec3(1,0,0)), f.x), mix(ldH(i + vec3(0,1,0)), ldH(i + vec3(1,1,0)), f.x), f.y),
             mix(mix(ldH(i + vec3(0,0,1)), ldH(i + vec3(1,0,1)), f.x), mix(ldH(i + vec3(0,1,1)), ldH(i + vec3(1,1,1)), f.x), f.y), f.z); }
float ldF(vec3 p){ return ldN(p) * 0.55 + ldN(p * 2.03) * 0.3 + ldN(p * 4.01) * 0.15; }
vec3 ldBump(vec3 pos, vec3 n, float h){
  vec3 sx = dFdx(pos), sy = dFdy(pos);
  vec3 r1 = cross(sy, n), r2 = cross(n, sx);
  float det = dot(sx, r1);
  vec3 g = sign(det) * (dFdx(h) * r1 + dFdy(h) * r2);
  return normalize(abs(det) * n - g);
}`;

function pbrMaterial(): THREE.MeshStandardMaterial {
  const m = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 1 });
  m.onBeforeCompile = (sh) => {
    sh.uniforms.ldRim = LOOK.rim; sh.uniforms.ldRimK = LOOK.rimK; sh.uniforms.ldAo = LOOK.aoTint;
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nattribute vec4 pbr;\nvarying vec4 vPbr;\nvarying vec3 vObj;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvPbr = pbr; vObj = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>\nvarying vec4 vPbr;\nvarying vec3 vObj;\nuniform vec3 ldRim;\nuniform float ldRimK;\nuniform vec3 ldAo;\nfloat ldHeight = 0.0; float ldRough = 0.5;\n${NOISE}`)
      .replace('#include <color_fragment>', /* glsl */ `#include <color_fragment>
        {
          int kind = int(floor(vPbr.z * 16.0 + 0.5));
          vec3 p = vObj;
          vec3 alb = diffuseColor.rgb;
          ldRough = vPbr.x;
          if (kind == 1) {            // skin: soft mottling, pores
            alb *= 0.93 + 0.14 * ldF(p * 16.0);
            ldHeight = ldN(p * 150.0) * 0.0006;
            ldRough += (ldF(p * 40.0) - 0.5) * 0.16;
          } else if (kind == 2) {     // undead skin: bruised blotches and dark veins
            float bl = ldF(p * 11.0);
            alb = mix(alb, alb * vec3(0.5, 0.5, 0.78), smoothstep(0.42, 0.75, bl) * 0.55);
            float vein = 1.0 - smoothstep(0.0, 0.045, abs(ldN(p * 19.0 + 7.3) - 0.5));
            vein *= smoothstep(0.3, 0.7, ldN(p * 6.0 + 2.0));
            alb = mix(alb, alb * vec3(0.38, 0.3, 0.6), vein * 0.75);
            ldHeight = -vein * 0.0022 + ldN(p * 130.0) * 0.0009 + ldF(p * 34.0) * 0.0016;
            ldRough += (bl - 0.5) * 0.3 - vein * 0.1;
          } else if (kind == 3) {     // cloth: weave (fades out before it can alias) and wear
            float fine = 1.0 - smoothstep(0.0004, 0.0016, fwidth(p.y) + fwidth(p.x) + fwidth(p.z));
            float w = sin(p.y * 1500.0) * sin((p.x + p.z) * 1500.0) * fine;
            float wear = ldF(p * 22.0);
            alb *= 0.88 + 0.16 * wear + 0.035 * w;
            ldHeight = w * 0.00016 + wear * 0.0012 + ldN(p * 90.0) * 0.0005;
            ldRough -= 0.06 * wear;
          } else if (kind == 4) {     // hair: strands
            float st = ldN(vec3(p.x * 85.0, p.y * 7.0, p.z * 85.0));
            alb *= 0.74 + 0.5 * st;
            ldHeight = st * 0.0022;
            ldRough += (st - 0.5) * 0.3;
          } else if (kind == 5) {     // metal: brushed, a few scratches
            float br = ldN(vec3(p.x * 9.0, p.y * 320.0, p.z * 9.0));
            alb *= 0.93 + 0.12 * br;
            ldRough += (br - 0.5) * 0.22 + (ldF(p * 26.0) - 0.5) * 0.2;
          } else if (kind == 6) {     // paper: fibres
            alb *= 0.94 + 0.08 * ldN(p * 70.0);
            ldHeight = ldN(p * 90.0) * 0.0004;
          } else if (kind == 7) {     // rubber, leather: grain
            float gr = ldF(p * 85.0);
            alb *= 0.9 + 0.16 * gr;
            ldHeight = gr * 0.0011;
          } else if (kind == 9) {     // wood: rings
            float ri = ldF(vec3(p.x * 7.0, p.y * 46.0, p.z * 7.0));
            alb *= 0.78 + 0.4 * ri;
            ldHeight = ri * 0.0009;
          } else if (kind == 0) {     // plastic: faint handling marks
            ldRough += (ldF(p * 30.0) - 0.5) * 0.12;
          }
          diffuseColor.rgb = alb * mix(ldAo, vec3(1.0), vPbr.w);
        }`)
      .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(ldRough, 0.045, 1.0);')
      .replace('#include <metalnessmap_fragment>', '#include <metalnessmap_fragment>\nmetalnessFactor = vPbr.y;')
      .replace('#include <normal_fragment_maps>', '#include <normal_fragment_maps>\nif (ldHeight != 0.0) normal = ldBump(-vViewPosition, normal, ldHeight);')
      .replace('#include <emissivemap_fragment>', /* glsl */ `#include <emissivemap_fragment>
        {
          vec3 vd = normalize(vViewPosition);
          float fr = pow(1.0 - saturate(dot(normal, vd)), 2.6);
          float side = 0.3 + 0.7 * saturate(dot(normal, normalize(vec3(0.55, 0.62, -0.42))) + 0.35);
          totalEmissiveRadiance += ldRim * fr * side * ldRimK * (0.35 + 0.65 * vPbr.w);
        }`)
      .replace('#include <aomap_fragment>', '#include <aomap_fragment>\nreflectedLight.indirectDiffuse *= 0.55 + 0.45 * vPbr.w; reflectedLight.indirectSpecular *= vPbr.w * vPbr.w;');
  };
  m.customProgramCacheKey = () => 'ld-pbr-2';
  return m;
}

const _m = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _c = new THREE.Color();
const _p = new THREE.Vector3(), _s = new THREE.Vector3();

interface Item {
  op: 'add' | 'cut' | 'paint';
  soft: boolean;
  sdf: Prim | null;
  geo: THREE.BufferGeometry | null;   // caller geometry (hard only)
  shape: Shape | 'cap' | 'torus' | 'geo';
  color: number; p: V3; s: V3; r: V3;
  surf: keyof typeof SURF;
  feather: number;
  extra: number[];                     // cap: [len, rad] · torus: [R, tube, arc]
}

/** Limb geometry is identical for every copy of a character: built once per character and part. */
const geoCache = new Map<string, THREE.BufferGeometry>();

const segs = (r: number) => Math.max(8, Math.min(28, Math.round(7 + r * 110)));
const far = (q: Prim, x: number, y: number, z: number) => { const a = x - q.t[0], b = y - q.t[1], c = z - q.t[2]; return Math.sqrt(a * a + b * b + c * c) - q.br; };

function hardGeometry(it: Item): THREE.BufferGeometry {
  const [sx, sy, sz] = it.s;
  let g: THREE.BufferGeometry;
  let scaled = false;
  switch (it.shape) {
    case 'sph': { const n = segs(Math.max(sx, sy, sz)); g = new THREE.SphereGeometry(1, n, Math.round(n * 0.7)); break; }
    case 'dome': { const n = segs(Math.max(sx, sy, sz)); g = new THREE.SphereGeometry(1, n, Math.round(n * 0.45), 0, Math.PI * 2, 0, Math.PI / 2); break; }
    case 'cone': g = new THREE.ConeGeometry(1, 1, segs(Math.max(sx, sz))); break;
    case 'box': {
      const md = Math.min(sx, sy, sz);
      g = md < 0.016 ? new THREE.BoxGeometry(sx, sy, sz) : new RoundedBoxGeometry(sx, sy, sz, md < 0.05 ? 1 : 2, Math.min(0.016, md * 0.36));
      scaled = true; break;
    }
    case 'cyl': {
      // lathe with bevelled rims so the edges catch the light
      const bv = Math.min(0.012, sx * 0.3, sy * 0.3), h = sy / 2, pts: THREE.Vector2[] = [new THREE.Vector2(0, -h)];
      for (let i = 0; i <= 3; i++) { const a = (i / 3) * Math.PI / 2; pts.push(new THREE.Vector2(sx - bv + Math.sin(a) * bv, -h + bv - Math.cos(a) * bv)); }
      for (let i = 0; i <= 3; i++) { const a = (i / 3) * Math.PI / 2; pts.push(new THREE.Vector2(sx - bv + Math.cos(a) * bv, h - bv + Math.sin(a) * bv)); }
      pts.push(new THREE.Vector2(0, h));
      g = new THREE.LatheGeometry(pts, segs(Math.max(sx, sz)));
      g.scale(1, 1, sz / sx);
      scaled = true; break;
    }
    case 'cap': g = new THREE.CapsuleGeometry(it.extra[1], it.extra[0], 5, segs(it.extra[1] * 2)); scaled = true; break;
    case 'torus': g = new THREE.TorusGeometry(it.extra[0], it.extra[1], 10, Math.max(14, Math.round(it.extra[0] * 220)), it.extra[2]); scaled = true; break;
    default: g = it.geo!.clone();
  }
  _m.compose(_p.set(...it.p), _q.setFromEuler(_e.set(...it.r)), scaled ? _s.set(1, 1, 1) : _s.set(sx, sy, sz));
  g.applyMatrix4(_m);
  if (!g.attributes.normal) g.computeVertexNormals();
  return g;
}

/** A limb: sculpted masses and hard pieces, merged into one mesh when the character is finished. */
export class Seg {
  private items: Item[] = [];
  readonly group = new THREE.Group();
  private surf: Surf = 'auto';
  private blend = 0;
  /** Marching-cubes cell for this limb (unit-height space). */
  cell = 0.0165;

  /** Surface type for the pieces added from now on. */
  m(s: Surf): this { this.surf = s; return this; }
  /** Pieces added from now on melt into each other with this blend radius (0 = hard, separate pieces). */
  soft(k = 0.022): this { this.blend = k; return this; }
  hard(): this { this.blend = 0; return this; }

  private push(op: Item['op'], shape: Item['shape'], color: number, p: V3, s: V3, r: V3, extra: number[] = [], geo: THREE.BufferGeometry | null = null, k = this.blend, feather = 0.01): this {
    let sdf: Prim | null = null;
    if (shape !== 'geo') {
      const md = Math.min(s[0], s[1], s[2]);
      if (shape === 'sph' || shape === 'dome') sdf = prim(shape, p, r, s[0], s[1], s[2]);
      else if (shape === 'box') sdf = prim('box', p, r, s[0] / 2, s[1] / 2, s[2] / 2, Math.min(0.016, md * 0.36));
      else if (shape === 'cyl') sdf = prim('cyl', p, r, s[0], s[1] / 2, s[2], Math.min(0.012, s[0] * 0.3, s[1] * 0.3));
      else if (shape === 'cone') sdf = prim('cone', p, r, s[0], s[1] / 2, s[2]);
      else if (shape === 'cap') sdf = prim('cap', p, r, extra[0] / 2, extra[1], 0);
      else sdf = prim('torus', p, r, extra[0], extra[1], extra[2]);
      sdf.k = k;
      _c.set(color);
      sdf.col = [_c.r, _c.g, _c.b];
    }
    const surf = this.surf === 'auto' ? autoSurf(color) : this.surf;
    if (sdf) sdf.pbr = [...SURF[surf]];
    this.items.push({ op, soft: op !== 'add' || (k > 0 && shape !== 'geo'), sdf, geo, shape, color, p, s, r, surf, feather, extra });
    return this;
  }

  /** Adds a primitive (or any geometry) with a colour, position, scale and rotation. */
  add(shape: Shape | THREE.BufferGeometry, color: number, p: V3 = [0, 0, 0], s: V3 | number = 1, r: V3 = [0, 0, 0]): this {
    const sc: V3 = typeof s === 'number' ? [s, s, s] : s;
    return typeof shape === 'string' ? this.push('add', shape, color, p, sc, r) : this.push('add', 'geo', color, p, sc, r, [], shape);
  }

  /** Capsule from `a` to `b` with radius `rad` — arms, legs, necks, handles. */
  cap(color: number, a: V3, b: V3, rad: number): this {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b);
    const len = va.distanceTo(vb);
    _q.setFromUnitVectors(new THREE.Vector3(0, 1, 0), vb.clone().sub(va).normalize());
    _e.setFromQuaternion(_q);
    const mid = va.add(vb).multiplyScalar(0.5);
    return this.push('add', 'cap', color, [mid.x, mid.y, mid.z], [1, 1, 1], [_e.x, _e.y, _e.z], [len, rad]);
  }

  /** Ring (chains, headphones, ring lights, halos). */
  ring(color: number, R: number, tube: number, p: V3, r: V3 = [0, 0, 0], arc = Math.PI * 2): this {
    return this.push('add', 'torus', color, p, [1, 1, 1], r, [R, tube, arc]);
  }

  /** Carves the sculpt (eye sockets, mouths). The cavity takes `color`. */
  cut(shape: Shape, color: number, p: V3, s: V3 | number, r: V3 = [0, 0, 0], k = 0.012): this {
    return this.push('cut', shape, color, p, typeof s === 'number' ? [s, s, s] : s, r, [], null, k);
  }

  /** Paints the surface inside a shape without changing it (shading, blush, grime, stripes). */
  paint(shape: Shape, color: number, p: V3, s: V3 | number, r: V3 = [0, 0, 0], feather = 0.012): this {
    return this.push('paint', shape, color, p, typeof s === 'number' ? [s, s, s] : s, r, [], null, 0, feather);
  }

  build(mat: THREE.Material, shadow: boolean, key: string): void {
    if (!this.items.length) return;
    let geo = key ? geoCache.get(key) : undefined;
    if (!geo) {
      geo = this.sculpt();
      if (key) geoCache.set(key, geo);
    }
    this.items = [];
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = shadow;
    mesh.receiveShadow = false;
    this.group.add(mesh);
  }

  private sculpt(): THREE.BufferGeometry {
    const field = new Field(), paints: Item[] = [], hard: Item[] = [];
    for (const it of this.items) {
      if (it.op === 'paint') paints.push(it);
      else if (it.op === 'cut') field.cuts.push(it.sdf!);
      else if (it.soft) field.adds.push(it.sdf!);
      else hard.push(it);
    }
    const P: number[] = [], N: number[] = [], C: number[] = [], B: number[] = [], I: number[] = [];
    const hardSdf = hard.filter((h) => h.sdf).map((h) => h.sdf!);
    /** Occlusion from everything in the limb except `self`. */
    const occlusion = (x: number, y: number, z: number, nx: number, ny: number, nz: number, self: Prim | null): number => {
      let occ = 0;
      for (const h of [0.014, 0.034, 0.075]) {
        const qx = x + nx * h, qy = y + ny * h, qz = z + nz * h;
        let d = field.adds.length ? field.eval(qx, qy, qz) : 1e3;
        for (const q of hardSdf) {
          if (q === self) continue;
          if (far(q, qx, qy, qz) > d) continue;
          const dd = dist(q, qx, qy, qz);
          if (dd < d) d = dd;
        }
        occ += Math.max(0, h - d) / h * (h < 0.02 ? 0.3 : h < 0.05 ? 0.38 : 0.42);
      }
      return Math.max(0, 1 - occ * 1.15);
    };
    const painted = (x: number, y: number, z: number, col: number[], pb: number[]) => {
      if (pb[2] === 10) return;   // cavities stay dark
      for (const it of paints) {
        const q = it.sdf!;
        if (far(q, x, y, z) > it.feather) continue;
        const d = dist(q, x, y, z);
        let t = Math.min(Math.max((it.feather - d) / (2 * it.feather), 0), 1);
        t = t * t * (3 - 2 * t);
        if (t <= 0) continue;
        col[0] += (q.col[0] - col[0]) * t; col[1] += (q.col[1] - col[1]) * t; col[2] += (q.col[2] - col[2]) * t;
        if (it.surf !== 'plastic') { pb[0] += (q.pbr[0] - pb[0]) * t; pb[1] += (q.pbr[1] - pb[1]) * t; if (t > 0.5) pb[2] = q.pbr[2]; }
      }
    };

    /* sculpted surface */
    if (field.adds.length) {
      const cell = this.cell * QUALITY.cell, kc = cell * 0.42;
      const { pos, idx } = field.mesh(cell);
      const base = P.length / 3, e = 0.0035, col = [0, 0, 0], pb = [0, 0, 0];
      for (let i = 0; i < pos.length; i += 3) {
        let x = pos[i], y = pos[i + 1], z = pos[i + 2];
        let gx = field.eval(x + e, y, z) - field.eval(x - e, y, z), gy = field.eval(x, y + e, z) - field.eval(x, y - e, z), gz = field.eval(x, y, z + e) - field.eval(x, y, z - e);
        const gl = Math.sqrt(gx * gx + gy * gy + gz * gz) || 1;
        gx /= gl; gy /= gl; gz /= gl;
        // one Newton step onto the true surface: removes the grid stair-steps
        const d0 = field.eval(x, y, z);
        const st = Math.max(-0.006, Math.min(0.006, d0));
        x -= gx * st; y -= gy * st; z -= gz * st;
        // colour and surface come from the nearest primitives
        let em = 1e3;
        const es: number[] = [];
        for (const q of field.adds) { const dd = far(q, x, y, z) > 0.03 ? 1e3 : dist(q, x, y, z); es.push(dd); if (dd < em) em = dd; }
        for (const q of field.cuts) { const dd = far(q, x, y, z) > 0.03 ? 1e3 : Math.abs(dist(q, x, y, z)) - 0.002; es.push(dd); if (dd < em) em = dd; }
        let wsum = 0, best = -1, bw = 0;
        col[0] = col[1] = col[2] = 0; pb[0] = pb[1] = 0;
        const all = field.adds.length;
        for (let j = 0; j < es.length; j++) {
          if (es[j] > em + 0.02) continue;
          const q = j < all ? field.adds[j] : field.cuts[j - all];
          const w = Math.exp(-(es[j] - em) / kc);
          wsum += w;
          col[0] += q.col[0] * w; col[1] += q.col[1] * w; col[2] += q.col[2] * w;
          pb[0] += q.pbr[0] * w; pb[1] += q.pbr[1] * w;
          if (w > bw) { bw = w; best = j; }
        }
        col[0] /= wsum; col[1] /= wsum; col[2] /= wsum; pb[0] /= wsum; pb[1] /= wsum;
        pb[2] = (best < all ? field.adds[best] : field.cuts[best - all]).pbr[2];
        painted(x, y, z, col, pb);
        P.push(x, y, z); N.push(gx, gy, gz); C.push(col[0], col[1], col[2]);
        B.push(pb[0], pb[1], pb[2] / 16, occlusion(x, y, z, gx, gy, gz, null));
      }
      for (let i = 0; i < idx.length; i++) I.push(base + idx[i]);
    }

    /* hard pieces */
    for (const it of hard) {
      const g = hardGeometry(it), pos = g.attributes.position, nor = g.attributes.normal, base = P.length / 3;
      _c.set(it.color);
      const sf = SURF[it.surf], col = [0, 0, 0], pb = [0, 0, 0];
      for (let i = 0; i < pos.count; i++) {
        const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i), nx = nor.getX(i), ny = nor.getY(i), nz = nor.getZ(i);
        col[0] = _c.r; col[1] = _c.g; col[2] = _c.b; pb[0] = sf[0]; pb[1] = sf[1]; pb[2] = sf[2];
        P.push(x, y, z); N.push(nx, ny, nz); C.push(col[0], col[1], col[2]);
        B.push(pb[0], pb[1], pb[2] / 16, occlusion(x, y, z, nx, ny, nz, it.sdf));
      }
      if (g.index) for (let i = 0; i < g.index.count; i++) I.push(base + g.index.getX(i));
      else for (let i = 0; i < pos.count; i++) I.push(base + i);
      g.dispose();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(P), 3));
    geo.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(N), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(C), 3));
    geo.setAttribute('pbr', new THREE.BufferAttribute(new Float32Array(B), 4));
    geo.setIndex(P.length / 3 > 65535 ? new THREE.BufferAttribute(new Uint32Array(I), 1) : new THREE.BufferAttribute(new Uint16Array(I), 1));
    geo.computeBoundingSphere();
    return geo;
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

let haloTex: THREE.CanvasTexture | null = null;
function haloTexture(): THREE.CanvasTexture {
  if (!haloTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.18, 'rgba(255,255,255,0.55)');
    g.addColorStop(0.45, 'rgba(255,255,255,0.14)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
    haloTex = new THREE.CanvasTexture(c);
  }
  return haloTex;
}

export class Builder {
  /** Set by the cast entry point: names the geometry cache for the character being built. */
  static key = '';
  readonly root = new THREE.Group();
  /** The engine rocks this pivot in the screen plane (walk sway, falling over). */
  readonly plane = new THREE.Group();
  readonly turn = new THREE.Group();
  readonly mat = pbrMaterial();
  private segs: { seg: Seg; shadow: boolean; name: string }[] = [];
  readonly parts: Record<string, THREE.Group> = {};
  readonly glows: THREE.Mesh[] = [];
  private halos: THREE.Sprite[] = [];
  private key = Builder.key;

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
    this.segs.push({ seg, shadow, name });
    return seg;
  }

  /** Self-lit piece (screens, bulbs, lasers, undead eyes): brighter than white, so it blooms. */
  glow(parent: string, shape: Shape | THREE.BufferGeometry, color: number, p: V3, s: V3 | number = 1, r: V3 = [0, 0, 0], gain = 1.2): THREE.Mesh {
    const g = typeof shape !== 'string' ? shape : shape === 'sph' ? GLOW.sph : shape === 'box' ? GLOW.box : shape === 'cyl' ? GLOW.cyl : shape === 'cone' ? GLOW.cone : GLOW.dome;
    const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(gain), toneMapped: false }));
    m.position.set(...p);
    if (typeof s === 'number') m.scale.setScalar(s); else m.scale.set(...s);
    m.rotation.set(...r);
    this.parts[parent].add(m);
    this.glows.push(m);
    return m;
  }

  /** Soft additive flare around a light (always faces the camera). */
  halo(parent: string, color: number, p: V3, size: number, opacity = 0.75): THREE.Sprite {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: haloTexture(), color, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    sp.position.set(...p);
    sp.scale.setScalar(size);
    this.parts[parent].add(sp);
    this.halos.push(sp);
    return sp;
  }

  /** Merges the limbs, scales to `height` world units and turns the body `yaw` radians. */
  finish(height: number, yaw: number, tick: TickFn | null): THREE.Group {
    for (const { seg, shadow, name } of this.segs) seg.build(this.mat, shadow, this.key ? `${this.key}:${name}:${QUALITY.cell}` : '');
    this.plane.scale.setScalar(height);
    this.turn.rotation.y = yaw;
    const rig: Rig = { root: this.root, parts: this.parts, glows: this.glows, t: Math.random() * 6, data: {} };
    const mat = this.mat, glows = this.glows, halos = this.halos;
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
      for (const h of halos) h.visible = vis;
    };
    u.tick(0);
    return this.root;
  }
}

const GLOW = {
  sph: new THREE.SphereGeometry(1, 20, 14), box: new THREE.BoxGeometry(1, 1, 1), cyl: new THREE.CylinderGeometry(1, 1, 1, 18),
  cone: new THREE.ConeGeometry(1, 1, 18), dome: new THREE.SphereGeometry(1, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2),
};

/* ---------- soft blob shadow shared by every character ---------- */
let shadowTex: THREE.CanvasTexture | null = null;
export function blobShadow(w: number, d: number): THREE.Mesh {
  if (!shadowTex) {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const ctx = c.getContext('2d')!;
    const g = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
    g.addColorStop(0, 'rgba(6,2,14,0.62)');
    g.addColorStop(1, 'rgba(6,2,14,0)');
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
