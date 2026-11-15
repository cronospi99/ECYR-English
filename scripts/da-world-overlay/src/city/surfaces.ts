/**
 * Real surfaces (ECYR rebuild).
 *
 * Nine tileable PBR detail sets — asphalt, paving, grass, plaster, brick,
 * concrete, roof tile, painted metal, leaves — each an albedo modulation plus
 * a normal and a roughness, generated offline (scripts/da-world-overlay/
 * texgen/gen.py) and shipped as two WebP strips in `public/tex/`. They are
 * sampled in *world space* from three directions (triplanar), so they need no
 * UVs and line up across neighbouring meshes: a brick course runs straight
 * from one building to the next, and paving slabs sit on the city's grid.
 *
 * Two ways in:
 *  - `applySurface(m, layer)` for the city's own materials (roads, pavements,
 *    lawns, walls) — one layer for the whole material.
 *  - kit materials read the layer per texel from their surface atlas (see
 *    pbr.ts), and flat tops and pitched roofs pick a roof finish.
 *
 * The colour stays the material's; the detail only modulates it, so the
 * palette, the day-night ramps and the colour grade are untouched.
 */
import * as THREE from 'three';

export const SURFACE = {
  asphalt: 0, paving: 1, grass: 2, plaster: 3, brick: 4, concrete: 5, roof: 6, metal: 7, leaf: 8,
} as const;
const LAYERS = 9;
const SIZE = 512;

/** Shared by every patched material: the arrays arrive after the first frame. */
const uniforms = {
  uDwSurfA: { value: placeholder() as THREE.DataArrayTexture },
  uDwSurfB: { value: placeholder() as THREE.DataArrayTexture },
  uDwSurfOn: { value: 0 },
};

function placeholder(): THREE.DataArrayTexture {
  const d = new Uint8Array(4 * LAYERS).fill(128);
  const t = new THREE.DataArrayTexture(d, 1, 1, LAYERS);
  t.needsUpdate = true;
  return t;
}

let started = false;
let anisotropy = 8;

export function setSurfaceAnisotropy(value: number): void {
  anisotropy = value;
  for (const u of [uniforms.uDwSurfA, uniforms.uDwSurfB]) {
    u.value.anisotropy = value;
    u.value.needsUpdate = true;
  }
}

/** Fetch and unpack the two strips into texture arrays. Safe to call twice. */
export function loadSurfaces(): void {
  if (started) return;
  started = true;
  const base = `${import.meta.env.BASE_URL}tex/`;
  const load = async (name: string, srgb: boolean): Promise<THREE.DataArrayTexture> => {
    const res = await fetch(base + name);
    const bmp = await createImageBitmap(await res.blob(), { colorSpaceConversion: 'none', premultiplyAlpha: 'none' });
    const cv = document.createElement('canvas');
    cv.width = bmp.width;
    cv.height = bmp.height;
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(bmp, 0, 0);
    const data = new Uint8Array(ctx.getImageData(0, 0, cv.width, cv.height).data.buffer);
    const t = new THREE.DataArrayTexture(data, SIZE, SIZE, Math.min(LAYERS, Math.floor(bmp.height / SIZE)));
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.magFilter = THREE.LinearFilter;
    t.minFilter = THREE.LinearMipmapLinearFilter;
    t.generateMipmaps = true;
    t.anisotropy = anisotropy;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    t.needsUpdate = true;
    return t;
  };
  Promise.all([load('surfaces-albedo.webp', false), load('surfaces-normal.webp', false)])
    .then(([a, b]) => {
      uniforms.uDwSurfA.value = a;
      uniforms.uDwSurfB.value = b;
      uniforms.uDwSurfOn.value = 1;
    })
    .catch((e) => console.warn('[Da World] surface textures unavailable:', e));
}

/** World units covered by one repeat of each layer, and how strongly it shows. */
const GLSL = /* glsl */ `
  uniform highp sampler2DArray uDwSurfA;
  uniform highp sampler2DArray uDwSurfB;
  uniform float uDwSurfOn;
  varying vec3 vDwSW;
  varying vec3 vDwSN;
  const float DW_SCALE[9] = float[9](7.0, 2.0, 2.5, 3.0, 1.6, 4.0, 1.6, 2.0, 1.4);
  const float DW_ALB[9]   = float[9](1.7, 1.25, 1.4, 1.3, 1.25, 1.35, 1.2, 0.7, 1.2);
  const float DW_NRM[9]   = float[9](1.3, 1.3, 0.9, 1.0, 1.5, 0.9, 1.3, 0.5, 1.1);
  const float DW_RGH[9]   = float[9](0.8, 0.7, 0.8, 0.6, 0.7, 0.6, 0.6, 0.6, 0.6);
  vec3 dwSAlb; vec3 dwSNrm; float dwSRgh; float dwSW;
  void dwSurface(float layer, float strength) {
    dwSAlb = vec3(1.0); dwSNrm = vec3(0.0); dwSRgh = -1.0; dwSW = 0.0;
    // derivatives first, while every fragment of the quad is still here
    vec3 wdx = dFdx(vDwSW), wdy = dFdy(vDwSW);
    if (layer < 0.0 || uDwSurfOn < 0.5 || strength <= 0.0) return;
    int li = int(layer + 0.5);
    vec3 n = normalize(vDwSN) * (gl_FrontFacing ? 1.0 : -1.0);
    vec3 bw = pow(abs(n), vec3(4.0));
    bw /= (bw.x + bw.y + bw.z);
    float sc = 1.0 / DW_SCALE[li];
    vec3 p = vDwSW * sc;
    vec3 dpx = wdx * sc, dpy = wdy * sc;
    float sx = n.x >= 0.0 ? 1.0 : -1.0, sz = n.z >= 0.0 ? 1.0 : -1.0;
    vec3 alb = vec3(0.0), off = vec3(0.0); float rg = 0.0;
    if (bw.x > 0.01) {
      vec2 uv = vec2(-p.z * sx, p.y);
      vec2 gx = vec2(-dpx.z * sx, dpx.y), gy = vec2(-dpy.z * sx, dpy.y);
      vec3 b = textureGrad(uDwSurfB, vec3(uv, layer), gx, gy).rgb;
      alb += textureGrad(uDwSurfA, vec3(uv, layer), gx, gy).rgb * bw.x;
      vec2 t = b.xy * 2.0 - 1.0;
      off += (vec3(0.0, 0.0, -sx) * t.x + vec3(0.0, 1.0, 0.0) * t.y) * bw.x;
      rg += b.z * bw.x;
    }
    if (bw.y > 0.01) {
      vec2 uv = p.xz;
      vec2 gx = dpx.xz, gy = dpy.xz;
      vec3 b = textureGrad(uDwSurfB, vec3(uv, layer), gx, gy).rgb;
      alb += textureGrad(uDwSurfA, vec3(uv, layer), gx, gy).rgb * bw.y;
      vec2 t = b.xy * 2.0 - 1.0;
      off += (vec3(1.0, 0.0, 0.0) * t.x + vec3(0.0, 0.0, 1.0) * t.y) * bw.y;
      rg += b.z * bw.y;
    }
    if (bw.z > 0.01) {
      vec2 uv = vec2(p.x * sz, p.y);
      vec2 gx = vec2(dpx.x * sz, dpx.y), gy = vec2(dpy.x * sz, dpy.y);
      vec3 b = textureGrad(uDwSurfB, vec3(uv, layer), gx, gy).rgb;
      alb += textureGrad(uDwSurfA, vec3(uv, layer), gx, gy).rgb * bw.z;
      vec2 t = b.xy * 2.0 - 1.0;
      off += (vec3(sz, 0.0, 0.0) * t.x + vec3(0.0, 1.0, 0.0) * t.y) * bw.z;
      rg += b.z * bw.z;
    }
    // Detail fades with distance: mipmaps keep it from shimmering, this keeps
    // a far facade from turning to grey noise.
    float d = length(vViewPosition);
    float near = 1.0 - smoothstep(35.0, 110.0, d);
    dwSAlb = mix(vec3(1.0), alb * 2.0, DW_ALB[li] * strength * mix(0.55, 1.0, near));
    dwSNrm = off * DW_NRM[li] * strength * near;
    dwSRgh = rg;
    dwSW = DW_RGH[li] * strength;
  }
`;

const VERT_PARS = 'varying vec3 vDwSW;\nvarying vec3 vDwSN;\n';
const VERT_MAIN = /* glsl */ `
  {
    vec4 sw = vec4(transformed, 1.0);
    mat3 sm = mat3(modelMatrix);
    #ifdef USE_INSTANCING
      sw = instanceMatrix * sw;
      sm = sm * mat3(instanceMatrix);
    #endif
    vDwSW = (modelMatrix * sw).xyz;
    vDwSN = normalize(sm * objectNormal);
  }
`;

/**
 * The hooks a patched shader needs. `layerExpr` is a GLSL float expression for
 * the layer (or -1 for none) evaluated in the fragment shader after the base
 * colour is known; `strengthExpr` likewise.
 */
export function injectSurface(
  shader: THREE.WebGLProgramParametersWithUniforms,
  layerExpr: string,
  strengthExpr = '1.0',
): void {
  Object.assign(shader.uniforms, uniforms);
  shader.vertexShader = shader.vertexShader
    .replace('void main() {', VERT_PARS + 'void main() {')
    .replace('#include <project_vertex>', '#include <project_vertex>\n' + VERT_MAIN);
  shader.fragmentShader = shader.fragmentShader
    .replace('void main() {', GLSL + '\nvoid main() {')
    .replace(
      '#include <color_fragment>',
      `#include <color_fragment>
       dwSurface(${layerExpr}, ${strengthExpr});
       diffuseColor.rgb *= dwSAlb;`,
    )
    .replace(
      '#include <roughnessmap_fragment>',
      `#include <roughnessmap_fragment>
       if (dwSW > 0.0) roughnessFactor = clamp(mix(roughnessFactor, dwSRgh, dwSW), 0.03, 1.0);`,
    )
    .replace(
      '#include <normal_fragment_maps>',
      `#include <normal_fragment_maps>
       if (dwSW > 0.0) normal = normalize(normal + mat3(viewMatrix) * dwSNrm);`,
    );
}

/**
 * Give one of the city's own materials a real surface. Composes with any patch
 * already on the material (the see-through cut-out).
 */
export function applySurface(m: THREE.MeshStandardMaterial, layer: number, strength = 1): void {
  const before = m.onBeforeCompile;
  const beforeKey = m.customProgramCacheKey?.bind(m);
  m.onBeforeCompile = (shader, renderer) => {
    before?.call(m, shader, renderer);
    injectSurface(shader, layer.toFixed(1), strength.toFixed(3));
  };
  m.customProgramCacheKey = () => (beforeKey ? beforeKey() : '') + `|surf-${layer}-${strength.toFixed(3)}`;
  m.needsUpdate = true;
}
