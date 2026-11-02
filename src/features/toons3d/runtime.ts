/* Toons 3D — load the teachers' 3D models and animate them in any three.js scene.

   For a future 3D game (e.g. an endless runner):
     const actor = await ToonActor.create('camila');
     scene.add(actor.object);
     actor.object.rotation.y = Math.PI;      // run away from the camera
     actor.play('run');                      // idle, walk, run, jump, fall, slide, hit, cheer
     // every frame: actor.update(dt)
   Render with `new OutlineEffect(renderer, TOON_OUTLINE)` for the ink outline of the gallery.

   The models live in public/toons3d/<id>.glb (built by scripts/build-toons.mts from the cards). */
import * as THREE from 'three';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { TEACHERS } from '@/features/cards/teachers';
import { TOON_FOLDER, TOON_ONCE, type ToonClip } from './meta';

export { TOON_CLIPS, type ToonClip } from './meta';

/** Every toon in the library (same order as the cards). */
export const TOONS = TEACHERS.map((t, index) => ({ index, id: t.id, name: t.name, color: t.color }));
export const toonUrl = (id: string) => `${import.meta.env.BASE_URL}${TOON_FOLDER}/${id}.glb`;

/** Settings for three's OutlineEffect that match the toons' ink style. */
export const TOON_OUTLINE = { defaultThickness: 0.006, defaultColor: [0.11, 0.16, 0.12], defaultAlpha: 1 };

let shared: THREE.MeshToonMaterial | null = null;
/** Cartoon shading (three light steps) with the models' vertex colours; shared by every toon. */
export function toonMaterial(): THREE.MeshToonMaterial {
  if (shared) return shared;
  const ramp = new THREE.DataTexture(new Uint8Array([95, 95, 95, 255, 178, 178, 178, 255, 236, 236, 236, 255, 255, 255, 255, 255]), 4, 1);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;
  shared = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
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
  current: ToonClip | null = null;

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
    this.play('idle', 0);
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

  update(dt: number) { this.mixer.update(dt); }

  dispose() { this.mixer.stopAllAction(); this.object.removeFromParent(); }
}
