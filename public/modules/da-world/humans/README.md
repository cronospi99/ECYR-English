# Realistic people (ECYR rebuild)

Loaded by `src/city/humans.ts`; every citizen, classmate, passenger and the
taxi driver is a clone of one of these two bodies, recoloured per person.

| File | What | Source |
| --- | --- | --- |
| `woman.glb` | rigged woman (Mixamo "Michelle") | three.js examples (`examples/models/gltf/Michelle.glb`), Mixamo character — royalty-free for use in projects |
| `man.glb` | rigged man (Ready Player Me avatar) | three.js examples (`examples/models/gltf/readyplayer.me.glb`) |
| `moves.glb` | skeleton + clips only: idle, walk, run, agree, headShake | three.js examples (`examples/models/gltf/Xbot.glb`), Mixamo animations |

The clips are retargeted onto each body at load (`src/city/retarget.ts`).
Meshes were simplified (meshoptimizer) and textures recompressed to 512 px
JPEG by `scripts/da-world-tools/humans.mjs`.
