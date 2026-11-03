/* Toons 3D — load the teachers' 3D models and animate them in any three.js scene.

   For a future 3D game (e.g. an endless runner):
     const actor = await ToonActor.create('camila');
     scene.add(actor.object);
     actor.object.rotation.y = Math.PI;      // run away from the camera
     actor.play('run');                      // idle, walk, run, jump, fall, slide, hit, cheer
     // every frame: actor.update(dt)
   Light them with an environment map (scene.environment) plus a sun for the soft vinyl-toy look;
   actor.setFace('happy') holds an expression (smile, grin, happy, surprised, wink, sad, love).

   The models live in public/toons3d/<id>.glb (built by scripts/build-toons.mts from the cards). */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { TEACHERS } from '@/features/cards/teachers';
import { FACE_OFF, FACES, TOON_FOLDER, TOON_ONCE, type Face, type ToonClip } from './meta';

export { TOON_CLIPS, type ToonClip } from './meta';
export { FACES, type Face } from './meta';

/** Every toon in the library (same order as the cards). */
export const TOONS = TEACHERS.map((t, index) => ({ index, id: t.id, name: t.name, color: t.color }));
export const toonUrl = (id: string) => `${import.meta.env.BASE_URL}${TOON_FOLDER}/${id}.glb`;


/**
 * The models keep a material class in the vertex colour's alpha: roughness / 2 for non-metals
 * (a < .5) and .5 + roughness / 2 for metals. This patch reads it, and keeps the clear coat (the
 * vinyl sheen) on the smooth parts only: skin, hair, eyes, shoes, glasses.
 */
export function patchToonShader(sh: { fragmentShader: string }) {
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <roughnessmap_fragment>', 'float roughnessFactor = max(0.04, vColor.a < 0.5 ? vColor.a * 2.0 : (vColor.a - 0.5) * 2.0);')
    .replace('#include <metalnessmap_fragment>', 'float metalnessFactor = vColor.a < 0.5 ? 0.0 : 1.0;')
    .replace('#include <lights_physical_fragment>', '#include <lights_physical_fragment>\n#ifdef USE_CLEARCOAT\n  material.clearcoat *= 1.0 - smoothstep(0.45, 0.75, roughnessFactor);\n#endif');
}

/** A new toon material; `extra` can chain more shader changes (e.g. a curved world). */
export function makeToonMaterial(extra?: (sh: THREE.WebGLProgramParametersWithUniforms) => void) {
  const m = new THREE.MeshPhysicalMaterial({ vertexColors: true, roughness: 1, metalness: 1, clearcoat: 0.6, clearcoatRoughness: 0.32 });
  m.onBeforeCompile = (sh) => { patchToonShader(sh); extra?.(sh); };
  m.customProgramCacheKey = () => 'toon2' + (extra ? '+x' : '');
  return m;
}

let shared: THREE.MeshPhysicalMaterial | null = null;
/** The shared material of every toon (soft PBR with per-part roughness). */
export function toonMaterial(): THREE.MeshPhysicalMaterial {
  if (!shared) shared = makeToonMaterial();
  return shared;
}

const loader = new GLTFLoader();
const cache = new Map<string, Promise<GLTF>>();
/** The parsed model (loaded once, then reused); its meshes use the toon material. */
export function loadToonGltf(id: string): Promise<GLTF> {
  let p = cache.get(id);
  if (!p) {
    p = loader.loadAsync(toonUrl(id)).then((g) => {
      g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = toonMaterial(); m.castShadow = true; } });
      return g;
    });
    p.catch(() => cache.delete(id)); // let a later call retry
    cache.set(id, p);
  }
  return p;
}

/** One animated character: its own copy of the model and an animation mixer. */
export class ToonActor {
  readonly id: string;
  readonly object: THREE.Object3D;
  readonly mixer: THREE.AnimationMixer;
  private actions = new Map<ToonClip, THREE.AnimationAction>();
  private faceParts = new Map<string, THREE.Object3D>();
  current: ToonClip | null = null;
  /** An expression held over the clips' own (null = let the clips decide). */
  face: Face | null = null;

  static async create(id: string): Promise<ToonActor> {
    return new ToonActor(id, await loadToonGltf(id));
  }

  private constructor(id: string, gltf: GLTF) {
    this.id = id;
    this.object = gltf.scene.clone(true); // rigid rig (no skinning): a plain clone animates on its own
    this.object.name = `toon:${id}`;
    this.mixer = new THREE.AnimationMixer(this.object);
    for (const c of gltf.animations) {
      const a = this.mixer.clipAction(c);
      if (TOON_ONCE.includes(c.name as ToonClip)) { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = true; }
      this.actions.set(c.name as ToonClip, a);
    }
    for (const n of ['eyeL', 'eyeR', 'eyeLOpen', 'eyeLShut', 'eyeLHeart', 'eyeROpen', 'eyeRShut', 'eyeRHeart', 'mouthN', 'mouthO', 'mouthS', 'mouthF']) {
      const o = this.object.getObjectByName(n);
      if (o) this.faceParts.set(n, o);
    }
    this.play('idle', 0);
  }

  setFace(f: Face | null) { this.face = f; }

  private applyFace() {
    const f = this.face ? FACES[this.face] : null;
    if (!f) return;
    const set = (n: string, on: boolean) => this.faceParts.get(n)?.scale.setScalar(on ? 1 : FACE_OFF);
    for (const e of ['eyeL', 'eyeR'] as const) {
      for (const v of ['Open', 'Shut', 'Heart'] as const) set(e + v, f[e] === v);
      const w = f.wide ?? 1;
      this.faceParts.get(e)?.scale.set(w, w, 1);
    }
    for (const m of ['N', 'O', 'S', 'F'] as const) set('mouth' + m, f.mouth === m);
  }

  /**
   * Cross-fade to a clip (`speed` scales its tempo, e.g. run faster as the game speeds up);
   * `restart` plays it again from the start if it is already playing (a second jump).
   */
  play(clip: ToonClip, fade = 0.15, speed = 1, restart = false) {
    const next = this.actions.get(clip);
    if (!next) return;
    next.timeScale = speed;
    if (clip === this.current) { if (restart) next.reset().play(); return; }
    const prev = this.current ? this.actions.get(this.current) : null;
    next.reset().setEffectiveWeight(1).play();
    if (prev && fade > 0) next.crossFadeFrom(prev, fade, false);
    else if (prev) prev.stop();
    this.current = clip;
  }

  update(dt: number) { this.mixer.update(dt); this.applyFace(); }

  dispose() { this.mixer.stopAllAction(); this.object.removeFromParent(); }
}
