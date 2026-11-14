# Surface textures (ECYR rebuild)

Two strips of nine 512 px tileable layers — asphalt, paving, grass, plaster,
brick, concrete, roof tile, painted metal, leaves — read by
`src/city/surfaces.ts` as texture arrays and sampled in world space.

- `surfaces-albedo.webp`: albedo modulation (0.5 grey = unchanged colour)
- `surfaces-normal.webp`: normal X/Y in R/G, roughness in B

Generated procedurally by `scripts/da-world-tools/texgen.py` (numpy); no
third-party images.
