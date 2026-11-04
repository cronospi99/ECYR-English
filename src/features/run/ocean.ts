/* A living ocean for the 3D games (English Run's beach, English Racers' Bahía track): a standard PBR
   material patched so the surface moves with a sum of travelling waves (normals worked out from
   the same waves), the colour goes from turquoise over the sand to deep blue, foam gathers on the
   wave crests and rolls up the shore in bands, and the water turns see-through where it is
   shallow. Sun glints and sky reflections come from the regular lighting and environment map.
   The geometry must be flat in the XZ plane (y up) with an `aDepth` attribute: metres of water
   under each vertex (use oceanGeometry for a uniform depth). */
import * as THREE from 'three';

export interface OceanOpts {
  deep?: number;
  shallow?: number;
  foam?: number;
  /** Wave height (m) and length scale (bigger = longer waves). */
  amp?: number;
  scale?: number;
  /** Direction the waves travel (towards the shore). */
  dir?: [number, number];
  opacity?: number;
}

export interface Ocean { material: THREE.MeshPhysicalMaterial; uniforms: { uTime: { value: number }; uOffset: { value: THREE.Vector2 } } }

export function makeOcean(o: OceanOpts = {}, extra?: (sh: THREE.WebGLProgramParametersWithUniforms) => void): Ocean {
  const uniforms = {
    uTime: { value: 0 },
    /** Shifts the wave pattern (English Run scrolls it with the runner). */
    uOffset: { value: new THREE.Vector2() },
    uAmp: { value: o.amp ?? 0.35 },
    uScale: { value: o.scale ?? 1 },
    uDir: { value: new THREE.Vector2(...(o.dir ?? [0.3, 1])).normalize() },
    uDeep: { value: new THREE.Color(o.deep ?? 0x0d5f8f) },
    uShallow: { value: new THREE.Color(o.shallow ?? 0x2fd3c8) },
    uFoam: { value: new THREE.Color(o.foam ?? 0xf4fbff) },
    uOpacity: { value: o.opacity ?? 0.94 },
  };
  const material = new THREE.MeshPhysicalMaterial({ color: 0xffffff, roughness: 0.08, metalness: 0, clearcoat: 0.6, clearcoatRoughness: 0.12, transparent: true, depthWrite: true });
  material.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, uniforms);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', `#include <common>
        uniform float uTime, uAmp, uScale; uniform vec2 uDir, uOffset;
        attribute float aDepth;
        varying float vDepth; varying float vCrest; varying vec2 vWxz;
        // one travelling wave: height and its x/z slope
        vec3 wv(vec2 p, vec2 d, float len, float a, float sp){
          float k = 6.2831 / len, ph = dot(d, p) * k - uTime * sp * k;
          return vec3(a * sin(ph), a * k * cos(ph) * d.x, a * k * cos(ph) * d.y);
        }
        vec3 waves(vec2 p, float depth){
          vec2 d1 = uDir, d2 = normalize(uDir + vec2(0.55, -0.2)), d3 = normalize(uDir + vec2(-0.6, 0.15)), d4 = normalize(vec2(uDir.y, -uDir.x) + uDir * 0.4);
          float s = uScale;
          vec3 h = wv(p, d1, 9.0 * s, 1.0, 2.6) + wv(p, d2, 5.3 * s, 0.55, 2.1) + wv(p, d3, 3.1 * s, 0.32, 1.7) + wv(p, d4, 1.7 * s, 0.16, 1.3);
          return h * uAmp * smoothstep(0.0, 2.2, depth);
        }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        vec2 wxz0 = (modelMatrix * vec4(position, 1.0)).xz + uOffset;
        vec3 wvh = waves(wxz0, aDepth);
        objectNormal = normalize(vec3(-wvh.y, 1.0, -wvh.z));`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed.y += wvh.x;
        vDepth = aDepth; vCrest = wvh.x / max(0.001, uAmp); vWxz = wxz0;`);
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', `#include <common>
        uniform float uTime, uOpacity; uniform vec3 uDeep, uShallow, uFoam;
        varying float vDepth; varying float vCrest; varying vec2 vWxz;
        float hh(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
          return mix(mix(hh(i), hh(i + vec2(1, 0)), f.x), mix(hh(i + vec2(0, 1)), hh(i + vec2(1, 1)), f.x), f.y); }`)
      .replace('vec4 diffuseColor = vec4( diffuse, opacity );', `
        float n1 = vn(vWxz * 0.45 + uTime * 0.12), n2 = vn(vWxz * 1.7 - uTime * 0.2);
        float shallowK = 1.0 - smoothstep(0.0, 5.5, vDepth);
        vec3 water = mix(uDeep, uShallow, shallowK * 0.92);
        water = mix(water, water * 1.18, smoothstep(0.2, 1.0, vCrest) * 0.5);
        // foam: on the crests, and rolling bands up the shore
        float crest = smoothstep(0.55, 1.05, vCrest + (n1 - 0.5) * 0.5) * (0.55 + 0.45 * n2);
        float band = fract(vDepth * 0.85 + uTime * 0.22 + n1 * 0.35);
        float shore = (1.0 - smoothstep(0.0, 1.6, vDepth)) * smoothstep(0.55, 0.85, band) * (0.6 + 0.4 * n2);
        float edge = 1.0 - smoothstep(0.0, 0.25 + n1 * 0.2, vDepth);
        float foam = clamp(max(max(crest * 0.85, shore), edge), 0.0, 1.0);
        vec3 col = mix(water, uFoam, foam);
        float alpha = mix(mix(0.45, 1.0, smoothstep(0.0, 2.8, vDepth)) * uOpacity, 1.0, foam * 0.8);
        vec4 diffuseColor = vec4(col, alpha);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.85, foam);`);
    extra?.(sh);
  };
  material.customProgramCacheKey = () => 'ocean' + (extra ? '+x' : '');
  return { material, uniforms };
}

/** A flat grid in XZ centred on (cx, cz) with `aDepth` from depthAt(x, z) (default: deep everywhere). */
export function oceanGeometry(cx: number, cz: number, w: number, d: number, segW: number, segD: number, depthAt: (x: number, z: number) => number = () => 30) {
  const g = new THREE.PlaneGeometry(w, d, segW, segD);
  g.rotateX(-Math.PI / 2);
  g.translate(cx, 0, cz);
  const p = g.getAttribute('position'), dep = new Float32Array(p.count);
  for (let i = 0; i < p.count; i++) dep[i] = Math.max(0, depthAt(p.getX(i), p.getZ(i)));
  g.setAttribute('aDepth', new THREE.BufferAttribute(dep, 1));
  return g;
}
