/* Toons 3D — exports every teacher as an animated 3D model (.glb) for future 3D games.
   The model itself is built in src/features/toons3d/model.ts (see there for the rig and clips).

   Run:  node --experimental-strip-types scripts/build-toons.mts            (full + lite)
         node --experimental-strip-types scripts/build-toons.mts --lite     (lite only)
   Out:  public/toons3d/<id>.glb  +  public/toons3d/index.json (id, name, height, size)
         public/toons3d/lite/<id>.glb: the rivals in English Racers. Same rig and face parts, only
         the idle clip, meshes simplified (meshoptimizer, colour borders kept) and 8-bit colours. */
import { mkdirSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
import { MeshoptSimplifier as MS } from 'three/addons/libs/meshopt_simplifier.module.js';
import { mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { SKIN, TEACHERS } from '../src/features/cards/teachers.ts';
import { buildToon } from '../src/features/toons3d/model.ts';

// GLTFExporter (binary) reads Blobs with FileReader, which Node does not have.
class NodeFileReader {
  result: ArrayBuffer | string | null = null;
  onloadend: (() => void) | null = null;
  readAsArrayBuffer(b: Blob) { void b.arrayBuffer().then((r) => { this.result = r; this.onloadend?.(); }); }
  readAsDataURL(b: Blob) { void b.arrayBuffer().then((r) => { this.result = 'data:application/octet-stream;base64,' + Buffer.from(r).toString('base64'); this.onloadend?.(); }); }
}
(globalThis as unknown as { FileReader: unknown }).FileReader = NodeFileReader;

const OUT = new URL('../public/toons3d/', import.meta.url);
const LITE = new URL('lite/', OUT);
mkdirSync(LITE, { recursive: true });
const liteOnly = process.argv.includes('--lite');
await MS.ready;

/** A lighter copy of one mesh: welded, simplified with its colours and normals as attributes, compacted. */
function lighten(geo: THREE.BufferGeometry) {
  const g = mergeVertices(geo, 1e-5);
  const idx = new Uint32Array(g.index!.array);
  const pos = g.getAttribute('position'), nor = g.getAttribute('normal'), col = g.getAttribute('color');
  const n = pos.count, attr = new Float32Array(n * 6);
  for (let i = 0; i < n; i++) attr.set([col.getX(i), col.getY(i), col.getZ(i), nor.getX(i), nor.getY(i), nor.getZ(i)], i * 6);
  // small parts (eyes, mouths, hands) stay as they are
  const target = idx.length < 3000 ? idx.length : Math.floor((idx.length * 0.25) / 3) * 3;
  const [out] = MS.simplifyWithAttributes(idx, pos.array as Float32Array, 3, attr, 6, [1.5, 1.5, 1.5, 0.4, 0.4, 0.4], null, target, 0.015, []);
  const [remap, unique] = MS.compactMesh(out);
  const P = new Float32Array(unique * 3), N = new Float32Array(unique * 3), C = new Uint8Array(unique * 4);
  for (let i = 0; i < n; i++) {
    const j = remap[i];
    if (j === 0xffffffff || j >= unique) continue;
    P.set([pos.getX(i), pos.getY(i), pos.getZ(i)], j * 3);
    N.set([nor.getX(i), nor.getY(i), nor.getZ(i)], j * 3);
    C.set([col.getX(i), col.getY(i), col.getZ(i), col.getW(i)].map((v) => Math.round(Math.min(1, Math.max(0, v)) * 255)), j * 4);
  }
  const r = new THREE.BufferGeometry();
  r.setAttribute('position', new THREE.BufferAttribute(P, 3));
  r.setAttribute('normal', new THREE.BufferAttribute(N, 3));
  r.setAttribute('color', new THREE.BufferAttribute(C, 4, true));
  r.setIndex(new THREE.BufferAttribute(unique < 65536 ? new Uint16Array(out) : out, 1));
  return r;
}

const exporter = new GLTFExporter();
const index: { id: string; name: string; height: number; bytes: number; vertices: number }[] = [];
let liteBytes = 0;
for (const tc of TEACHERS) {
  {
    const { root, clips } = buildToon(tc.look, SKIN[tc.look.skin], tc.id);
    root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const g = lighten(m.geometry); m.geometry.dispose(); m.geometry = g; } });
    const scene = new THREE.Scene();
    scene.add(root);
    const glb = await exporter.parseAsync(scene, { binary: true, animations: clips.filter((c) => c.name === 'idle'), onlyVisible: true });
    const buf = Buffer.from(glb as ArrayBuffer);
    writeFileSync(new URL(`${tc.id}.glb`, LITE), buf);
    liteBytes += buf.length;
  }
  if (liteOnly) continue;
  const { root, clips, height } = buildToon(tc.look, SKIN[tc.look.skin], tc.id);
  let vertices = 0;
  root.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) vertices += m.geometry.getAttribute('position').count; });
  const scene = new THREE.Scene();
  scene.add(root);
  const glb = await exporter.parseAsync(scene, { binary: true, animations: clips, onlyVisible: true });
  const buf = Buffer.from(glb as ArrayBuffer);
  writeFileSync(new URL(`${tc.id}.glb`, OUT), buf);
  index.push({ id: tc.id, name: tc.name, height: +height.toFixed(3), bytes: buf.length, vertices });
}
console.log(`lite: ${TEACHERS.length} toons · ${(liteBytes / 1024).toFixed(0)} KB`);
if (liteOnly) process.exit(0);
writeFileSync(new URL('index.json', OUT), JSON.stringify(index, null, 1));
const kb = index.reduce((s, x) => s + x.bytes, 0) / 1024;
console.log(`${index.length} toons · ${kb.toFixed(0)} KB · ${Math.round(index.reduce((s, x) => s + x.vertices, 0) / index.length)} vertices each on average`);
