/* Shared rendering look of Language Defenders: image-based lighting painted in code, and the
   bloom that makes screens, neon and undead eyes glow. Used by the board and the portraits. */
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';

export interface EnvPalette { top: number; horizon: number; ground: number; key: number; rim: number; fill: number }

/** A small studio around the scene: gradient sky, a warm key panel, a neon rim strip and a cool fill. */
export function environment(renderer: THREE.WebGLRenderer, p: EnvPalette): THREE.Texture {
  const scene = new THREE.Scene();
  const sky = new THREE.Mesh(new THREE.SphereGeometry(20, 32, 16), new THREE.ShaderMaterial({
    side: THREE.BackSide,
    uniforms: { top: { value: new THREE.Color(p.top) }, hor: { value: new THREE.Color(p.horizon) }, gnd: { value: new THREE.Color(p.ground) } },
    vertexShader: 'varying vec3 d; void main(){ d = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: 'varying vec3 d; uniform vec3 top; uniform vec3 hor; uniform vec3 gnd; void main(){ float y = normalize(d).y; vec3 c = y > 0.0 ? mix(hor, top, pow(y, 0.55)) : mix(hor, gnd, pow(-y, 0.4)); gl_FragColor = vec4(c, 1.0); }',
  }));
  scene.add(sky);
  const panel = (color: number, gain: number, pos: [number, number, number], size: [number, number]) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(size[0], size[1]), new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(gain), side: THREE.DoubleSide }));
    m.position.set(...pos);
    m.lookAt(0, 0, 0);
    scene.add(m);
  };
  panel(p.key, 7, [7, 9, 6], [7, 7]);
  panel(p.rim, 5, [-9, 4, -7], [5, 9]);
  panel(p.fill, 2.2, [-6, 2, 9], [9, 5]);
  panel(p.rim, 3, [9, 1.5, -8], [3, 6]);
  const gen = new THREE.PMREMGenerator(renderer);
  const tex = gen.fromScene(scene, 0.035).texture;
  gen.dispose();
  scene.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); (m.material as THREE.Material | undefined)?.dispose?.(); });
  return tex;
}

export interface Post { render(): void; setSize(w: number, h: number): void; bloom: UnrealBloomPass; dispose(): void; enabled: boolean }

/** Bloom + tone mapping. With `enabled` off it draws straight to the screen (weak devices). */
export function post(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, strength = 0.42): Post {
  const size = renderer.getDrawingBufferSize(new THREE.Vector2());
  const target = new THREE.WebGLRenderTarget(size.x, size.y, { type: THREE.HalfFloatType, samples: 4 });
  const composer = new EffectComposer(renderer, target);
  composer.addPass(new RenderPass(scene, camera));
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x / 2, size.y / 2), strength, 0.5, 1.0);
  composer.addPass(bloom);
  composer.addPass(new OutputPass());
  // the final grade: a soft vignette, a hint of colour fringing at the edges and fine film grain
  const grade = new ShaderPass({
    uniforms: { tDiffuse: { value: null }, t: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform sampler2D tDiffuse; uniform float t; varying vec2 vUv;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898, 78.233)) + t) * 43758.5453); }
      void main(){
        vec2 d = vUv - 0.5; float r = dot(d, d);
        vec2 o = d * r * 0.012;
        vec3 c = vec3(texture2D(tDiffuse, vUv + o).r, texture2D(tDiffuse, vUv).g, texture2D(tDiffuse, vUv - o).b);
        c = mix(vec3(dot(c, vec3(0.299, 0.587, 0.114))), c, 1.12);       // a little more colour
        c = (c - 0.5) * 1.05 + 0.5;                                      // a little more contrast
        c *= 1.0 - smoothstep(0.18, 0.62, r) * 0.42;                     // vignette
        c += (h(vUv * 900.0) - 0.5) * 0.028;                             // grain
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  composer.addPass(grade);
  const api: Post = {
    enabled: true,
    bloom,
    render() { if (api.enabled) { grade.uniforms.t!.value = (performance.now() % 1000) / 1000; composer.render(); } else renderer.render(scene, camera); },
    setSize(w, h) { composer.setPixelRatio(renderer.getPixelRatio()); composer.setSize(w, h); },
    dispose() { composer.dispose(); target.dispose(); },
  };
  return api;
}
