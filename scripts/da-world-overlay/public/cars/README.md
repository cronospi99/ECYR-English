# Taxi Rush — the cab

`taxi.glb` is the Khronos glTF sample asset **"Car Concept"**
(https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept)
by **Eric Chadwick**, © 2024 Darmstadt Graphics Group GmbH, licensed
**CC-BY 4.0** (https://creativecommons.org/licenses/by/4.0/). It was started
from a public-domain (CC0) model by "Unity Fan" on Sketchfab.

Changes made for ECYR (scripts/da-world-tools/car.mjs and
src/taxi/sportcar.ts): material variants removed, meshes simplified
(meshoptimizer), textures recompressed to WebP, geometry quantized and
meshopt-compressed; at runtime the paint is recoloured, taxi stickers, a roof
sign and a plate are added, and the Khronos emblem on the steering wheel is
hidden. Khronos logos are trademarks of the Khronos Group and are not used.

## Everyday traffic

`traffic.glb` is the **"Generic passenger car pack"** by **Comrade1280**
(https://sketchfab.com/3d-models/generic-passenger-car-pack-20f9af9b8a404d5cb022ac6fe87f21f5),
licensed **CC-BY 4.0** — ten generic, unbranded cars (compact, coupe,
hatchback, minivan, off-roader, pickup, sedan, sport, SUV, wagon). The file is
the meshopt/WebP-optimised copy published in the Idle Car Empire project
(github.com/zazochannel-art/Idle-Car-Empire, public/models/car-pack.glb). At
runtime (src/city/carpack.ts) each car is taken out of the pack, levelled,
scaled and its paint turned grey so it can be painted per car.
