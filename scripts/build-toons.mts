/* Toons 3D — exports every teacher as an animated 3D model (.glb) for future 3D games.
   The model itself is built in src/features/toons3d/model.ts (see there for the rig and clips).

   Run:  node --experimental-strip-types scripts/build-toons.mts
   Out:  public/toons3d/<id>.glb  +  public/toons3d/index.json (id, name, height, size) */
import { mkdirSync, writeFileSync } from 'node:fs';
import * as THREE from 'three';
import { GLTFExporter } from 'three/addons/exporters/GLTFExporter.js';
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
mkdirSync(OUT, { recursive: true });

const exporter = new GLTFExporter();
const index: { id: string; name: string; height: number; bytes: number; vertices: number }[] = [];
for (const tc of TEACHERS) {
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
writeFileSync(new URL('index.json', OUT), JSON.stringify(index, null, 1));
const kb = index.reduce((s, x) => s + x.bytes, 0) / 1024;
console.log(`${index.length} toons · ${kb.toFixed(0)} KB · ${Math.round(index.reduce((s, x) => s + x.vertices, 0) / index.length)} vertices each on average`);
