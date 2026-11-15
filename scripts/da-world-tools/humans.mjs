import { NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { prune, dedup, simplify, weld, textureCompress, resample, quantize } from '@gltf-transform/functions';
import { MeshoptSimplifier, MeshoptEncoder } from 'meshoptimizer';
import sharp from 'sharp';
const A = '../assets/', OUT = './out/';
import { mkdirSync, statSync } from 'fs'; mkdirSync(OUT, { recursive: true });
await MeshoptSimplifier.ready;
const io = new NodeIO().registerExtensions(ALL_EXTENSIONS);

// 1. Animation source: the Xbot skeleton and its clips, no mesh.
{
  const doc = await io.read(A + 'Xbot.glb');
  const root = doc.getRoot();
  for (const n of root.listNodes()) { n.setMesh(null); n.setSkin(null); }
  for (const a of root.listAnimations()) if (/pose/.test(a.getName())) a.dispose();
  for (const m of root.listMeshes()) m.dispose();
  for (const s of root.listSkins()) s.dispose();
  await doc.transform(resample({ tolerance: 1e-4 }), prune({ keepLeaves: true }), dedup());
  for (const a of root.listAccessors()) if (a.listParents().every((p) => p === root)) a.dispose();
  await io.write(OUT + 'moves.glb', doc);
}
// 2. People
for (const [src, out, ratio] of [['Michelle.glb', 'woman.glb', 0.42], ['readyplayer.me.glb', 'man.glb', 0.7]]) {
  const doc = await io.read(A + src);
  const root = doc.getRoot();
  for (const a of root.listAnimations()) { for (const x of a.listSamplers()) x.dispose(); for (const x of a.listChannels()) x.dispose(); a.dispose(); }
  for (const a of root.listAccessors()) if (a.listParents().every((p) => p === root)) a.dispose();
  for (const m of root.listMaterials()) {
    // Mixamo ships glossiness as a metal map and a specular colour map; the
    // runtime sets its own skin and cloth response.
    m.setMetallicRoughnessTexture(null);
    m.setMetallicFactor(0); m.setRoughnessFactor(0.62);
    const spec = m.getExtension('KHR_materials_specular'); if (spec) m.setExtension('KHR_materials_specular', null);
  }
  await doc.transform(
    weld(),
    simplify({ simplifier: MeshoptSimplifier, ratio, error: 0.0012, lockBorder: true }),
    prune(), dedup(),
    textureCompress({ encoder: sharp, targetFormat: 'jpeg', resize: [512, 512], quality: 86 }),
  );
  for (const a of root.listAccessors()) if (a.listParents().every((p) => p === root)) a.dispose();
  let tris = 0; for (const me of root.listMeshes()) for (const p of me.listPrimitives()) tris += (p.getIndices()?.getCount() ?? 0) / 3;
  await io.write(OUT + out, doc);
  console.log(out, 'tris', tris, (statSync(OUT + out).size / 1024).toFixed(0) + ' KB');
}
console.log('moves', (statSync(OUT + 'moves.glb').size / 1024).toFixed(0) + ' KB');
