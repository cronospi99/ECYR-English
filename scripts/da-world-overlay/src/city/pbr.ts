/**
 * Physically based finish for the Kenney kits (ECYR rebuild).
 *
 * The kits ship one colour atlas and nothing else: no roughness, no metalness,
 * no normals beyond the flat faces. Everything here is derived, so the art and
 * the draw calls stay exactly what they were:
 *
 *  1. A "surface atlas" is painted from the colour atlas on a canvas. Each texel
 *     is classified — glass, dark metal (frames, rails, AC units), foliage,
 *     brick and tile, plain wall — and given a roughness (G) and a metalness (B).
 *     Windows become smooth and mirror the sky through the environment map; walls
 *     stay matte; frames get a dull sheen. One extra texture per atlas.
 *  2. A world-space detail pass, injected into the standard shader: a fine grain
 *     and soft weathering blotches perturb the normal and the roughness, and the
 *     foot of every wall darkens a little where it meets the ground (cheap contact
 *     occlusion). It is computed from the world position, so no UVs are needed,
 *     and it fades out with distance so far facades never shimmer.
 */
import {
  CanvasTexture,
  LinearFilter,
  MeshStandardMaterial,
  NoColorSpace,
  type Texture,
  type WebGLProgramParametersWithUniforms,
} from 'three';

export type SurfaceKind = 'building' | 'car' | 'prop';

const surfaceAtlases = new Map<string, CanvasTexture>();

/** Roughness (G) and metalness (B) for one atlas, derived from its colours. */
function surfaceAtlas(tex: Texture, kind: SurfaceKind): CanvasTexture | null {
  const key = tex.uuid + kind;
  const cached = surfaceAtlases.get(key);
  if (cached) return cached;
  const img = tex.image as (CanvasImageSource & { width: number; height: number }) | undefined;
  if (!img?.width) return null;
  const w = img.width, h = img.height;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2];
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    const lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const sat = max ? (max - min) / max : 0;
    let rough = 0.82, metal = 0;
    if (b > r + 55 && b > g + 30) {
      // glass: smooth, and a little metallic so it takes the sky's colour
      rough = 0.035; metal = kind === 'car' ? 0.25 : 0.8;
    } else if (g > r + 18 && g > b + 10) {
      rough = 0.95; // foliage, grass
    } else if (sat < 0.14 && lum < 0.3) {
      rough = 0.42; metal = 0.55; // frames, rails, vents, dark trims
    } else if (sat < 0.12 && lum > 0.82) {
      rough = kind === 'car' ? 0.3 : 0.7; // white paint, trims
    } else if (r > g + 30 && r > b + 30 && lum < 0.6) {
      rough = 0.9; // brick, terracotta tiles
    }
    if (kind === 'car' && !(b > r + 55 && b > g + 30)) {
      // car paint: a lacquer; tyres and plastics stay matte
      rough = lum < 0.16 ? 0.85 : sat > 0.25 ? 0.24 : Math.min(rough, 0.4);
      metal = lum < 0.16 ? 0 : sat > 0.25 ? 0.35 : metal;
    }
    d[i] = 255;
    d[i + 1] = Math.round(rough * 255);
    d[i + 2] = Math.round(metal * 255);
    d[i + 3] = 255;
  }
  ctx.putImageData(data, 0, 0);
  const out = new CanvasTexture(cv);
  out.colorSpace = NoColorSpace;
  out.flipY = false;
  out.generateMipmaps = false;
  out.minFilter = LinearFilter;
  out.magFilter = LinearFilter;
  surfaceAtlases.set(key, out);
  return out;
}

const DETAIL_PARS = /* glsl */ `
  varying vec3 vDwWorld;
  uniform float uDwBump;
  uniform float uDwGrime;
  uniform float uDwContact;
  float dwHash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
  float dwNoise(vec3 x) {
    vec3 i = floor(x), f = fract(x); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dwHash(i + vec3(0, 0, 0)), dwHash(i + vec3(1, 0, 0)), f.x), mix(dwHash(i + vec3(0, 1, 0)), dwHash(i + vec3(1, 1, 0)), f.x), f.y),
               mix(mix(dwHash(i + vec3(0, 0, 1)), dwHash(i + vec3(1, 0, 1)), f.x), mix(dwHash(i + vec3(0, 1, 1)), dwHash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
  }
  vec3 dwPerturb(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDir) {
    vec3 vSigmaX = normalize(dFdx(surf_pos.xyz));
    vec3 vSigmaY = normalize(dFdy(surf_pos.xyz));
    vec3 vN = surf_norm;
    vec3 R1 = cross(vSigmaY, vN);
    vec3 R2 = cross(vN, vSigmaX);
    float fDet = dot(vSigmaX, R1) * faceDir;
    vec3 vGrad = sign(fDet) * (dHdxy.x * R1 + dHdxy.y * R2);
    return normalize(abs(fDet) * surf_norm - vGrad);
  }
`;

/**
 * Upgrades a kit material in place. Composes with any shader patch the material
 * already has (the see-through cut-out), and keys the program cache on both.
 */
export function pbrKit(m: MeshStandardMaterial, atlas: Texture, kind: SurfaceKind): void {
  const surface = surfaceAtlas(atlas, kind);
  if (surface) {
    m.roughnessMap = surface;
    m.metalnessMap = surface;
    m.roughness = 1;
    m.metalness = 1;
  }
  m.envMapIntensity = kind === 'car' ? 1.25 : 1.1;
  const bump = kind === 'building' ? 1.0 : kind === 'prop' ? 0.25 : 0.0;
  const grime = kind === 'building' ? 0.14 : kind === 'prop' ? 0.05 : 0.0;
  const contact = kind === 'building' ? 0.28 : kind === 'prop' ? 0.12 : 0.0;
  if (!bump && !grime) return;

  const before = m.onBeforeCompile;
  const beforeKey = m.customProgramCacheKey?.bind(m);
  m.onBeforeCompile = (shader: WebGLProgramParametersWithUniforms, renderer) => {
    before?.call(m, shader, renderer);
    shader.uniforms.uDwBump = { value: bump };
    shader.uniforms.uDwGrime = { value: grime };
    shader.uniforms.uDwContact = { value: contact };
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'varying vec3 vDwWorld;\nvoid main() {')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
         vec4 dwWp = vec4(transformed, 1.0);
         #ifdef USE_INSTANCING
           dwWp = instanceMatrix * dwWp;
         #endif
         vDwWorld = (modelMatrix * dwWp).xyz;`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', DETAIL_PARS + '\nvoid main() {')
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
         float dwFade = 1.0 - smoothstep(18.0, 46.0, length(vViewPosition));
         float dwBlot = dwNoise(vDwWorld * 0.55) * 0.65 + dwNoise(vDwWorld * 1.7) * 0.35;
         roughnessFactor = clamp(roughnessFactor * mix(0.86, 1.12, dwBlot), 0.04, 1.0);`,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `#include <normal_fragment_maps>
         if (dwFade > 0.0) {
           float dwH = dwNoise(vDwWorld * 7.5) * 0.6 + dwNoise(vDwWorld * 19.0) * 0.4;
           vec2 dwD = vec2(dFdx(dwH), dFdy(dwH)) * uDwBump * dwFade;
           normal = dwPerturb(-vViewPosition, normal, dwD, faceDirection);
         }`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         {
           float g = dwNoise(vDwWorld * 0.35) * 0.6 + dwNoise(vDwWorld * 1.3) * 0.4;
           diffuseColor.rgb *= 1.0 - uDwGrime * (g - 0.35);
           float foot = smoothstep(0.0, 1.4, vDwWorld.y);
           diffuseColor.rgb *= mix(1.0 - uDwContact, 1.0, foot);
         }`,
      );
  };
  m.customProgramCacheKey = () => (beforeKey ? beforeKey() : '') + '|pbr-' + kind;
  m.needsUpdate = true;
}
