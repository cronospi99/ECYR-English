/**
 * Everyday cars (ECYR rebuild).
 *
 * Ten generic, unbranded passenger cars — compact, hatchback, sedan, wagon,
 * coupe, sport, SUV, off-roader, minivan, pickup — from the "Generic passenger
 * car pack" by Comrade1280 (CC BY 4.0; see public/cars/README.md). The pack
 * ships them parked around one scene, each at its own angle, with loose
 * wheels; here every car is taken out, its four nearest wheels found, turned
 * to face +Z, centred, set on the road and scaled to the city's units, and its
 * parts merged by material so a car costs four draw calls (or four instanced
 * meshes for a whole fleet of one model).
 *
 * The paint texture is reduced to its light and shade, so each car can be
 * painted any colour per instance without losing its panel lines.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

/** City units per metre (the taxi is 4.36 m and 2.95 units long). */
export const UNITS_PER_METRE = 2.95 / 4.36;

export type CarKind = 'compact' | 'coupe' | 'hatchback' | 'minivan' | 'offroad' | 'pickup' | 'sedan' | 'sport' | 'suv' | 'wagon';
const REAL_LENGTH: Record<CarKind, number> = {
  compact: 3.9, coupe: 4.5, hatchback: 4.2, minivan: 5.0, offroad: 4.6, pickup: 5.3, sedan: 4.8, sport: 4.4, suv: 4.8, wagon: 4.8,
};
/** Which way each body faces in the pack after levelling; flipped where the nose came out backwards. */
const FLIP: Partial<Record<CarKind, boolean>> = { compact: true, coupe: true, sedan: true, wagon: true, offroad: true };

export interface CarPart { geometry: THREE.BufferGeometry; material: THREE.Material; role: 'body' | 'glass' | 'lights' | 'wheels' }
export interface CarTemplate { kind: CarKind; parts: CarPart[]; length: number; width: number; height: number }

const templates = new Map<CarKind, CarTemplate>();
let loading: Promise<void> | null = null;

export function carTemplates(): CarTemplate[] {
  return [...templates.values()];
}
export function carPackReady(): boolean {
  return templates.size > 0;
}

export function loadCarPack(): Promise<void> {
  if (loading) return loading;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loading = loader
    .loadAsync(`${import.meta.env.BASE_URL}cars/traffic.glb`)
    .then((g) => extract(g.scene))
    .catch((e) => console.warn('[Da World] everyday cars unavailable:', e));
  return loading;
}

/** Light-and-shade copy of a paint texture: the colour comes from the instance. */
function greyPaint(tex: THREE.Texture | null): THREE.Texture | null {
  const img = tex?.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!tex || !img?.width) return tex ?? null;
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const c = cv.getContext('2d', { willReadFrequently: true })!;
  c.drawImage(img, 0, 0);
  const d = c.getImageData(0, 0, cv.width, cv.height);
  const p = d.data;
  // normalise so the most common (paint) brightness becomes white
  let sum = 0, n = 0;
  for (let i = 0; i < p.length; i += 4) { const l = 0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]; sum += l; n++; }
  const k = 235 / Math.max(30, sum / n);
  for (let i = 0; i < p.length; i += 4) {
    const l = Math.min(255, (0.2126 * p[i] + 0.7152 * p[i + 1] + 0.0722 * p[i + 2]) * k);
    p[i] = p[i + 1] = p[i + 2] = l;
  }
  c.putImageData(d, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = tex.flipY;
  t.wrapS = tex.wrapS; t.wrapT = tex.wrapT;
  t.anisotropy = 4;
  return t;
}

function kindOf(name: string): CarKind | null {
  const n = name.toLowerCase();
  for (const k of ['compact', 'coupe', 'hatchback', 'minivan', 'offroad', 'pickup', 'sedan', 'sport', 'suv', 'wagon'] as CarKind[]) if (n.startsWith(k)) return k;
  return null;
}

function extract(scene: THREE.Object3D): void {
  scene.updateMatrixWorld(true);
  const bodies: { kind: CarKind; node: THREE.Object3D }[] = [];
  const wheels: THREE.Object3D[] = [];
  scene.traverse((o) => {
    const k = /body$/i.test(o.name) ? kindOf(o.name) : null;
    if (k) bodies.push({ kind: k, node: o });
    else if (/^Wheel_[A-Z]\d*(_\d+)?$/.test(o.name)) wheels.push(o);
  });
  const centre = (o: THREE.Object3D) => new THREE.Box3().setFromObject(o).getCenter(new THREE.Vector3());

  const paints = new Map<THREE.Material, THREE.MeshPhysicalMaterial>();
  const glass = new THREE.MeshPhysicalMaterial({ color: '#0c1218', metalness: 0.2, roughness: 0.04, transparent: true, opacity: 0.55, envMapIntensity: 1.6 });
  const tyre = new Map<THREE.Material, THREE.MeshStandardMaterial>();

  for (const { kind, node } of bodies) {
    if (templates.has(kind)) continue;
    const box = new THREE.Box3().setFromObject(node);
    const c = box.getCenter(new THREE.Vector3());
    // the body's own heading: the angle at which its footprint is narrowest
    const all: THREE.Vector3[] = [];
    node.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const pos = m.geometry.getAttribute('position');
      const step = Math.max(1, Math.floor(pos.count / 400));
      for (let i = 0; i < pos.count; i += step) all.push(new THREE.Vector3().fromBufferAttribute(pos, i).applyMatrix4(m.matrixWorld));
    });
    let yaw = 0, narrow = Infinity, halfW = 1, halfL = 1;
    for (let a = -Math.PI / 2; a < Math.PI / 2; a += Math.PI / 360) {
      const sn = Math.sin(a), co = Math.cos(a);
      let lo = Infinity, hi = -Infinity, lo2 = Infinity, hi2 = -Infinity;
      for (const p of all) {
        const dx = p.x - c.x, dz = p.z - c.z;
        const x = dx * co - dz * sn, z = dx * sn + dz * co;
        lo = Math.min(lo, x); hi = Math.max(hi, x); lo2 = Math.min(lo2, z); hi2 = Math.max(hi2, z);
      }
      if (hi - lo < narrow) { narrow = hi - lo; yaw = a; halfW = (hi - lo) / 2; halfL = (hi2 - lo2) / 2; }
    }
    // its wheels: the ones inside its own footprint
    const sn = Math.sin(yaw), co = Math.cos(yaw);
    const mine = wheels
      .map((w) => { const p = centre(w); const dx = p.x - c.x, dz = p.z - c.z; return { w, x: dx * co - dz * sn, z: dx * sn + dz * co, d: Math.hypot(dx, dz) }; })
      .filter((q) => Math.abs(q.x) < halfW * 1.6 && Math.abs(q.z) < halfL * 1.15)
      .sort((p, q) => p.d - q.d)
      .slice(0, 4)
      .map((q) => q.w);
    const mid = c;
    // world → car frame: centre on the wheels, turn so the long axis is z
    const toCar = new THREE.Matrix4()
      .makeRotationY(-yaw + (FLIP[kind] ? Math.PI : 0))
      .multiply(new THREE.Matrix4().makeTranslation(-mid.x, -box.min.y, -mid.z));
    const byRole = new Map<CarPart['role'], { geos: THREE.BufferGeometry[]; mat: THREE.Material }>();
    const collect = (root: THREE.Object3D, isWheel: boolean) => {
      root.traverse((o) => {
        const m = o as THREE.Mesh;
        if (!m.isMesh) return;
        const src = m.material as THREE.MeshStandardMaterial;
        const nm = (src.name || '').toLowerCase();
        let role: CarPart['role'] = isWheel ? 'wheels' : nm.startsWith('glass') ? 'glass' : nm.startsWith('optics') ? 'lights' : nm.startsWith('wheel') || nm.startsWith('wheek') ? 'wheels' : 'body';
        let mat: THREE.Material;
        if (role === 'glass') mat = glass;
        else if (role === 'body') {
          let p = paints.get(src);
          if (!p) {
            p = new THREE.MeshPhysicalMaterial({ map: greyPaint(src.map), color: '#ffffff', metalness: 0.35, roughness: 0.35, clearcoat: 0.8, clearcoatRoughness: 0.12, envMapIntensity: 1.2 });
            paints.set(src, p);
          }
          mat = p;
        } else if (role === 'wheels') {
          let t = tyre.get(src);
          if (!t) { t = src.clone(); t.envMapIntensity = 1; tyre.set(src, t); }
          mat = t;
        } else {
          const l = src.clone(); l.emissive = new THREE.Color('#fff2d0'); l.emissiveMap = src.map; l.emissiveIntensity = 0.25;
          mat = l;
        }
        const g = m.geometry.clone();
        for (const name of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(name)) g.deleteAttribute(name);
        if (!g.getAttribute('uv')) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.getAttribute('position').count * 2), 2));
        if (g.getAttribute('position').normalized || (g.getAttribute('position').array as ArrayLike<number>).constructor !== Float32Array) {
          // de-quantize so the parts can be merged
          for (const name of ['position', 'normal', 'uv']) {
            const a = g.getAttribute(name) as THREE.BufferAttribute;
            if (!a) continue;
            const out = new Float32Array(a.count * a.itemSize);
            for (let i = 0; i < a.count; i++) for (let k = 0; k < a.itemSize; k++) out[i * a.itemSize + k] = a.getComponent(i, k);
            g.setAttribute(name, new THREE.BufferAttribute(out, a.itemSize));
          }
        }
        g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(toCar, m.matrixWorld));
        const r = byRole.get(role) ?? { geos: [], mat };
        r.geos.push(g.index ? g : g);
        byRole.set(role, r);
        void role;
      });
    };
    collect(node, false);
    for (const w of mine) collect(w, true);
    const parts: CarPart[] = [];
    let bounds = new THREE.Box3();
    for (const [role, { geos, mat }] of byRole) {
      const indexed = geos.every((g) => g.index), plain = geos.map((g) => (indexed ? g : g.index ? g.toNonIndexed() : g));
      const merged = mergeGeometries(plain, false);
      if (!merged) continue;
      merged.computeBoundingBox();
      bounds = bounds.union(merged.boundingBox!);
      parts.push({ geometry: merged, material: mat, role });
    }
    // tyres on the road, centred front to back and side to side
    const cx = (bounds.min.x + bounds.max.x) / 2, cz = (bounds.min.z + bounds.max.z) / 2;
    for (const p of parts) p.geometry.translate(-cx, -bounds.min.y, -cz);
    // scale to the city's units
    const len = bounds.max.z - bounds.min.z;
    const s = (REAL_LENGTH[kind] * UNITS_PER_METRE) / Math.max(1e-6, len);
    for (const p of parts) { p.geometry.scale(s, s, s); p.geometry.computeBoundingSphere(); p.geometry.computeBoundingBox(); }
    const size2 = bounds.getSize(new THREE.Vector3()).multiplyScalar(s);
    templates.set(kind, { kind, parts, length: size2.z, width: size2.x, height: size2.y });
  }
}

/** A single car as an ordinary object (four meshes), painted `color`. */
export function carObject(t: CarTemplate, paint: THREE.Material): THREE.Group {
  const g = new THREE.Group();
  for (const p of t.parts) {
    const m = new THREE.Mesh(p.geometry, p.role === 'body' ? paint : p.material);
    m.castShadow = p.role !== 'glass';
    m.receiveShadow = true;
    g.add(m);
  }
  return g;
}

/** Shared paint materials, one per colour (the body texture is grey). */
const paintCache = new Map<string, THREE.Material>();
export function carPaint(t: CarTemplate, color: string): THREE.Material {
  const body = t.parts.find((p) => p.role === 'body')!.material as THREE.MeshPhysicalMaterial;
  const key = body.uuid + color;
  let m = paintCache.get(key);
  if (!m) { const c = body.clone(); c.color = new THREE.Color(color); paintCache.set(key, (m = c)); }
  return m;
}

export const CAR_COLOURS = ['#c9ccd1', '#f2f2f0', '#1c1f24', '#3b4a5e', '#8a1f24', '#1f4f8a', '#2f5d3a', '#7a7f87', '#b8892d', '#4a2c22', '#d65a1f', '#5a6b7d'];
