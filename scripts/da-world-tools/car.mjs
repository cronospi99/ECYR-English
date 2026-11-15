import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, simplifyPrimitive, weld, textureCompress, quantize, meshopt } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
import { statSync } from 'fs';
await MeshoptSimplifier.ready; await MeshoptEncoder.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
const doc = await io.read('../assets/CarConcept.glb');
const root = doc.getRoot();
// one look: the variants go, the runtime paints the cab itself
for (const ext of root.listExtensionsUsed()) if (ext.extensionName === 'KHR_materials_variants') ext.dispose();
for (const m of root.listMaterials()) if (/Pearl|Graphite/.test(m.getName())) m.dispose();
let before = 0;
const count = () => { let t = 0; for (const me of root.listMeshes()) for (const p of me.listPrimitives()) t += (p.getIndices()?.getCount() ?? 0) / 3; return t; };
before = count();
// heavy, barely visible parts get simplified harder
for (const me of root.listMeshes()) {
  const n = me.getName();
}
await doc.transform(weld({}));
const groups = [
  [/Wiper/, 0.12], [/Rim/, 0.3], [/BrakePad|BrakeDisc/, 0.3], [/Interior|Engine|Pedal|Seat|Steering/, 0.35],
];
// simplify mesh by mesh with its own ratio
for (const node of root.listNodes()) {
  const me = node.getMesh(); if (!me) continue;
  const n = (node.getName() || '') + ' ' + me.getName();
  let r = 0.45;
  for (const [re, ratio] of groups) if (re.test(n)) { r = ratio; break; }
  for (const prim of me.listPrimitives()) simplifyPrimitive(prim, { simplifier: MeshoptSimplifier, ratio: r, error: 0.004, lockBorder: false });
}
await doc.transform(prune(), dedup(), textureCompress({ encoder: sharp, targetFormat: 'webp', resize: [1024, 1024], quality: 82 }), quantize(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
for (const a of root.listAccessors()) if (a.listParents().every((p) => p === root)) a.dispose();
const after = count();
await io.write('out/taxi.glb', doc);
console.log('tris', before, '->', after, (statSync('out/taxi.glb').size / 1024).toFixed(0) + ' KB');
console.log(root.listMaterials().map((m) => m.getName()).join(', '));
