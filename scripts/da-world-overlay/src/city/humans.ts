/**
 * Realistic people (ECYR rebuild).
 *
 * Two skinned, textured bodies — a man and a woman — that every person in the
 * city is cloned from, animated with one shared library of motion-captured
 * clips (idle, walk, run, nod, head shake). The clips come from a different
 * skeleton and are retargeted onto each body once, at load (`retarget.ts`).
 *
 * Nobody is the same person twice: each clone gets its own shirt, trousers,
 * skin, hair and shoes, painted onto the original textures by a small shader
 * patch that keeps every fold, seam and freckle of the texture and only moves
 * its colour (`tint` below). Where one texture holds several garments, a mask
 * worked out once from its colours says which texel is which.
 *
 * Assets: `public/humans/` — see the README there for sources and licences.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { retargetClip } from './retarget';

const RoundedBox = (w: number, h: number, d: number) => new RoundedBoxGeometry(w, h, d, 4, Math.min(w, h, d) * 0.3);

export type Figure = 'man' | 'woman';
export type Move = 'idle' | 'walk' | 'run' | 'agree' | 'headShake';
const MOVES: Move[] = ['idle', 'walk', 'run', 'agree', 'headShake'];

/** Height of the procedural rig the rest of the game is tuned for (see character.ts). */
const RIG_HEIGHT = 1.58;

/* ------------------------------------------------------------------ tint -- */

interface Channel { mode: 0 | 1; ref: THREE.Color }
/** What a material's four tint channels mean, and their reference colours. */
interface TintSpec { mask: THREE.Texture | null; constant: THREE.Vector4; channels: Channel[] }

const TINT_PARS = /* glsl */ `
  uniform vec4 uDwConst;
  uniform vec3 uDwCol[4];
  uniform vec3 uDwRef[4];
  uniform vec4 uDwMode;
  #ifdef DW_MASK
    uniform sampler2D uDwMask;
  #endif
  vec3 dwTint(vec3 c, vec3 col, vec3 ref, float mode, float l) {
    vec3 lumT = col * (l / max(dot(ref, vec3(0.2126, 0.7152, 0.0722)), 1e-3));
    vec3 ratT = c * col / max(ref, vec3(1e-3));
    return mix(lumT, ratT, mode);
  }
`;

function applyTint(m: THREE.MeshStandardMaterial, spec: TintSpec, colors: THREE.Color[]): void {
  const uniforms = {
    uDwConst: { value: spec.constant },
    uDwCol: { value: colors },
    uDwRef: { value: spec.channels.map((c) => c.ref) },
    uDwMode: { value: new THREE.Vector4(...spec.channels.map((c) => c.mode)) },
    uDwMask: { value: spec.mask },
  };
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    if (spec.mask) shader.defines = { ...(shader.defines ?? {}), DW_MASK: '' };
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', TINT_PARS + '\nvoid main() {')
      .replace(
        '#include <map_fragment>',
        `#include <map_fragment>
         {
           vec4 w = uDwConst;
           #if defined(DW_MASK) && defined(USE_MAP)
             w = max(w, texture2D(uDwMask, vMapUv));
           #endif
           vec3 c = diffuseColor.rgb;
           float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
           c = mix(c, dwTint(diffuseColor.rgb, uDwCol[0], uDwRef[0], uDwMode.x, l), w.x);
           c = mix(c, dwTint(diffuseColor.rgb, uDwCol[1], uDwRef[1], uDwMode.y, l), w.y);
           c = mix(c, dwTint(diffuseColor.rgb, uDwCol[2], uDwRef[2], uDwMode.z, l), w.z);
           c = mix(c, dwTint(diffuseColor.rgb, uDwCol[3], uDwRef[3], uDwMode.w, l), w.w);
           diffuseColor.rgb = c;
         }`,
      );
  };
  m.customProgramCacheKey = () => 'dw-tint' + (spec.mask ? '-mask' : '');
  m.needsUpdate = true;
}

/** Average linear colour of an image, optionally only where `keep` says so. */
type Classifier = (h: number, s: number, v: number) => [number, number, number, number];

function pixels(img: CanvasImageSource & { width: number; height: number }): ImageData {
  const cv = document.createElement('canvas');
  cv.width = img.width; cv.height = img.height;
  const ctx = cv.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0);
  return ctx.getImageData(0, 0, cv.width, cv.height);
}

const toLin = (c: number) => (c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4));

/**
 * Splits a texture into up to four regions by colour. Returns the mask (one
 * region per channel) and each region's average linear colour.
 */
function classify(tex: THREE.Texture, fn: Classifier): { mask: THREE.Texture; refs: THREE.Color[] } {
  const img = tex.image as CanvasImageSource & { width: number; height: number };
  const data = pixels(img);
  const d = data.data;
  // Raw bytes, not a canvas: a canvas premultiplies alpha and would wipe the
  // other three regions wherever the fourth is empty.
  const o = new Uint8Array(d.length);
  const sums = [0, 0, 0, 0].map(() => [0, 0, 0, 0]);
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i] / 255, g = d[i + 1] / 255, b = d[i + 2] / 255;
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), dl = mx - mn || 1e-6;
    const s = mx ? (mx - mn) / mx : 0;
    let h = mx === r ? ((g - b) / dl) % 6 : mx === g ? (b - r) / dl + 2 : (r - g) / dl + 4;
    h = (h * 60 + 360) % 360;
    const w = fn(h, s, mx);
    for (let k = 0; k < 4; k++) {
      o[i + k] = Math.round(w[k] * 255);
      if (w[k] > 0.5) { sums[k][0] += toLin(r); sums[k][1] += toLin(g); sums[k][2] += toLin(b); sums[k][3]++; }
    }
  }
  const mask = new THREE.DataTexture(o, data.width, data.height, THREE.RGBAFormat);
  mask.flipY = false;
  mask.magFilter = THREE.LinearFilter;
  mask.minFilter = THREE.LinearMipmapLinearFilter;
  mask.generateMipmaps = true;
  mask.needsUpdate = true;
  mask.colorSpace = THREE.NoColorSpace;
  mask.channel = tex.channel;
  const refs = sums.map(([r, g, b, n]) => (n ? new THREE.Color(r / n, g / n, b / n) : new THREE.Color(0.5, 0.5, 0.5)));
  return { mask, refs };
}

function average(tex: THREE.Texture): THREE.Color {
  return classify(tex, () => [1, 0, 0, 0]).refs[0];
}

const step = (a: number, b: number, x: number) => Math.min(1, Math.max(0, (x - a) / (b - a)));

/* ---------------------------------------------------------------- bases -- */

/** Which colour of a person a tint channel follows. */
type Slot = 'shirt' | 'pants' | 'skin' | 'hair' | 'shoes' | 'hat' | 'accent';

interface PartSpec { spec: TintSpec; slots: (Slot | null)[] }

interface Base {
  figure: Figure;
  scene: THREE.Object3D;
  clips: Map<Move, THREE.AnimationClip>;
  /** Scale that brings the body to the procedural rig's height. */
  fit: number;
  parts: Map<string, PartSpec>;
}

const bases = new Map<Figure, Base>();
let loading: Promise<void> | null = null;
const listeners = new Set<() => void>();
let enabled = true;

export function humansReady(): boolean {
  return enabled && bases.size === 2;
}

/** Off on the lowest graphics tier: the procedural people cost nothing. */
export function setRealHumans(on: boolean): void {
  enabled = on;
  if (on) void loadHumans();
}

export function onHumansReady(fn: () => void): () => void {
  if (humansReady()) { fn(); return () => {}; }
  listeners.add(fn);
  return () => listeners.delete(fn);
}

const URL_BASE = `${import.meta.env.BASE_URL}humans/`;

export function loadHumans(): Promise<void> {
  if (loading) return loading;
  const loader = new GLTFLoader();
  loading = (async () => {
    const [moves, man, woman] = await Promise.all([
      loader.loadAsync(URL_BASE + 'moves.glb'),
      loader.loadAsync(URL_BASE + 'man.glb'),
      loader.loadAsync(URL_BASE + 'woman.glb'),
    ]);
    const srcNames = new Set<string>();
    moves.scene.traverse((o) => { if ((o as THREE.Bone).isBone || o.name.startsWith('mixamorig')) srcNames.add(o.name); });
    const map = (n: string): string | null => {
      const k = (n.startsWith('mixamorig') ? n : 'mixamorig' + n).replace(':', '');
      return srcNames.has(k) ? k : null;
    };
    for (const [figure, gltf] of [['man', man], ['woman', woman]] as const) {
      const scene = gltf.scene;
      scene.updateMatrixWorld(true);
      const clips = new Map<Move, THREE.AnimationClip>();
      for (const move of MOVES) {
        const src = moves.animations.find((a) => a.name === move);
        if (src) clips.set(move, retargetClip(moves.scene, src, scene, map));
      }
      const fit = RIG_HEIGHT / measure(scene);
      bases.set(figure, { figure, scene, clips, fit, parts: figure === 'man' ? manParts(scene) : womanParts(scene) });
    }
  })();
  loading
    .then(() => { if (enabled) for (const fn of [...listeners]) fn(); listeners.clear(); })
    .catch((e) => { console.warn('[Da World] realistic people unavailable:', e); });
  return loading;
}

/** Standing height, from the soles to the top of the head, in the scene's units. */
function measure(scene: THREE.Object3D): number {
  let top = -Infinity, bottom = Infinity;
  const v = new THREE.Vector3();
  scene.traverse((o) => {
    if (!(o as THREE.Bone).isBone) return;
    o.getWorldPosition(v);
    if (/HeadTop_End$/i.test(o.name)) top = Math.max(top, v.y);
    bottom = Math.min(bottom, v.y);
  });
  // HeadTop_End sits at the crown; the soles are a little under the toe bones.
  return (top - bottom) * 1.02;
}

function matOf(scene: THREE.Object3D, meshName: RegExp): THREE.MeshStandardMaterial | null {
  let m: THREE.MeshStandardMaterial | null = null;
  scene.traverse((o) => { if (!m && (o as THREE.Mesh).isMesh && meshName.test(o.name)) m = (o as THREE.Mesh).material as THREE.MeshStandardMaterial; });
  return m;
}

const lum = (mode: 0 | 1, ref: THREE.Color): Channel => ({ mode, ref });
const nil = (): Channel => ({ mode: 0, ref: new THREE.Color(1, 1, 1) });

function whole(tex: THREE.Texture | null, slot: Slot, mode: 0 | 1): PartSpec {
  const ref = tex ? average(tex) : new THREE.Color(0.5, 0.5, 0.5);
  return { spec: { mask: null, constant: new THREE.Vector4(1, 0, 0, 0), channels: [lum(mode, ref), nil(), nil(), nil()] }, slots: [slot, null, null, null] };
}

function manParts(scene: THREE.Object3D): Map<string, PartSpec> {
  const parts = new Map<string, PartSpec>();
  const top = matOf(scene, /Outfit_Top/);
  if (top?.map) {
    // jacket (warm, muted) follows the shirt; the waistcoat (purple) the accent
    const { mask, refs } = classify(top.map, (h, s, v) => [
      (h < 45 || h > 345) && s > 0.12 && s < 0.5 && v > 0.35 ? 1 : 0,
      h > 250 && h < 345 && s > 0.15 && v > 0.2 ? 1 : 0,
      0, 0,
    ]);
    parts.set('Wolf3D_Outfit_Top', { spec: { mask, constant: new THREE.Vector4(0, 0, 0, 0), channels: [lum(0, refs[0]), lum(0, refs[1]), nil(), nil()] }, slots: ['shirt', 'accent', null, null] });
  }
  parts.set('Wolf3D_Outfit_Bottom', whole(matOf(scene, /Outfit_Bottom/)?.map ?? null, 'pants', 0));
  parts.set('Wolf3D_Outfit_Footwear', whole(matOf(scene, /Footwear/)?.map ?? null, 'shoes', 0));
  const skin = average(matOf(scene, /Wolf3D_Head/)!.map!);
  parts.set('Wolf3D_Head', { spec: { mask: null, constant: new THREE.Vector4(1, 0, 0, 0), channels: [lum(1, skin), nil(), nil(), nil()] }, slots: ['skin', null, null, null] });
  parts.set('Wolf3D_Body', { spec: { mask: null, constant: new THREE.Vector4(1, 0, 0, 0), channels: [lum(1, skin), nil(), nil(), nil()] }, slots: ['skin', null, null, null] });
  parts.set('Wolf3D_Beard', whole(matOf(scene, /Beard/)?.map ?? null, 'hair', 0));
  parts.set('Wolf3D_Headwear', whole(matOf(scene, /Headwear/)?.map ?? null, 'hat', 0));
  return parts;
}

function womanParts(scene: THREE.Object3D): Map<string, PartSpec> {
  const parts = new Map<string, PartSpec>();
  const body = matOf(scene, /.*/);
  if (body?.map) {
    const { mask, refs } = classify(body.map, (h, s, v) => [
      s < 0.16 && v > 0.3 && v < 0.85 ? 1 : 0, // the top
      h > 38 && h < 70 && s > 0.35 && v > 0.45 ? 1 : 0, // the trousers
      h > 8 && h < 38 && s > 0.3 && s < 0.8 && v > 0.18 && v < 0.85 ? 1 : 0, // skin
      v < 0.2 ? step(0.2, 0.12, v) : 0, // hair (and whatever else is near black)
    ]);
    parts.set('*', { spec: { mask, constant: new THREE.Vector4(0, 0, 0, 0), channels: [lum(0, refs[0]), lum(0, refs[1]), lum(0, refs[2]), lum(0, refs[3])] }, slots: ['shirt', 'pants', 'skin', 'hair'] });
  }
  return parts;
}

/* --------------------------------------------------------------- people -- */

export interface HumanColors {
  shirt: string; pants: string; skin: string; hair: string;
  shoes?: string; hat?: string; accent?: string;
}

const SKIN_REF = new THREE.Color('#e0ac85');

export class Human {
  readonly root = new THREE.Group();
  readonly figure: Figure;
  private readonly mixer: THREE.AnimationMixer;
  private readonly actions = new Map<Move, THREE.AnimationAction>();
  private readonly bones = new Map<string, THREE.Bone>();
  private gesture: THREE.AnimationAction | null = null;
  private seated = false;
  private walkPhase = 0;

  constructor(figure: Figure, colors: HumanColors, opts: { hat?: boolean; outfit?: string; hairStyle?: number } = {}) {
    const base = bases.get(figure)!;
    this.figure = figure;
    const body = cloneSkinned(base.scene);
    body.scale.multiplyScalar(base.fit);
    this.root.add(body);
    const c = (s: string) => new THREE.Color(s);
    const slotColor = (slot: Slot | null): THREE.Color => {
      switch (slot) {
        case 'shirt': return c(colors.shirt);
        case 'pants': return c(colors.pants);
        case 'skin': {
          // keep the texture's own warmth: ratio against a typical skin tone
          const t = c(colors.skin);
          return t;
        }
        case 'hair': return c(colors.hair);
        case 'shoes': return c(colors.shoes ?? '#2b2622');
        case 'hat': return c(colors.hat ?? '#6b4a2e');
        case 'accent': return c(colors.accent ?? colors.pants).multiplyScalar(0.8);
        default: return c('#ffffff');
      }
    };
    void SKIN_REF;
    body.traverse((o) => {
      if ((o as THREE.Bone).isBone) this.bones.set(o.name.replace('mixamorig', ''), o as THREE.Bone);
      const mesh = o as THREE.SkinnedMesh;
      if (!mesh.isMesh) return;
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      mesh.frustumCulled = false;
      if (/Headwear/.test(mesh.name) && figure === 'man' && !opts.hat) { mesh.visible = false; return; }
      const part = base.parts.get(mesh.name) ?? (figure === 'woman' ? base.parts.get('*') : undefined);
      const src = mesh.material as THREE.MeshStandardMaterial;
      const m = src.clone();
      const isSkin = /Head|Body/.test(mesh.name) || figure === 'woman';
      m.roughness = isSkin ? 0.58 : 0.82;
      m.metalness = 0;
      m.envMapIntensity = 0.9;
      if (/Eye|Teeth/.test(mesh.name)) { m.roughness = 0.15; m.envMapIntensity = 1.2; }
      if (part) applyTint(m, part.spec, part.slots.map(slotColor));
      mesh.material = m;
    });
    body.updateMatrixWorld(true);
    this.dress(figure, colors, opts);
    this.mixer = new THREE.AnimationMixer(body);
    for (const [move, clip] of base.clips) {
      const a = this.mixer.clipAction(clip);
      if (move === 'agree' || move === 'headShake') { a.setLoop(THREE.LoopOnce, 1); a.clampWhenFinished = false; }
      else { a.play(); a.setEffectiveWeight(move === 'idle' ? 1 : 0); }
      this.actions.set(move, a);
    }
    // Everybody starts their loop at a different moment: a crowd in step is a parade.
    this.mixer.setTime(Math.random() * 3);
  }

  /**
   * A holder on a bone whose axes and units are the procedural rig's at rest
   * (y up, z forward, 1.58 tall), so an accessory can be modelled once in plain
   * numbers and still ride the bone when the body moves.
   */
  private holder(boneName: string): { g: THREE.Group; at: (name: string) => THREE.Vector3 } | null {
    const bone = this.bones.get(boneName);
    if (!bone) return null;
    const rootInv = new THREE.Matrix4().copy(this.root.matrixWorld).invert();
    const boneRel = new THREE.Matrix4().multiplyMatrices(rootInv, bone.matrixWorld);
    const g = new THREE.Group();
    g.matrixAutoUpdate = true;
    // undo the bone's rotation and scale; keep its origin
    const pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
    boneRel.decompose(pos, quat, scl);
    g.quaternion.copy(quat).invert();
    g.scale.set(1 / scl.x, 1 / scl.y, 1 / scl.z);
    bone.add(g);
    const at = (name: string) => {
      const b = this.bones.get(name);
      const v = new THREE.Vector3();
      if (b) v.setFromMatrixPosition(new THREE.Matrix4().multiplyMatrices(rootInv, b.matrixWorld));
      return v.sub(pos);
    };
    return { g, at };
  }

  private dress(figure: Figure, colors: HumanColors, opts: { hat?: boolean; outfit?: string; hairStyle?: number }): void {
    this.root.updateMatrixWorld(true);
    const head = this.holder('Head');
    const hairMat = new THREE.MeshStandardMaterial({ color: colors.hair, roughness: 0.62, metalness: 0, envMapIntensity: 0.7 });
    if (head) {
      const crown = head.at('HeadTop_End');
      const h = crown.length();
      // Short hair for the man when he is not wearing his hat (style 0 is bald).
      if (figure === 'man' && !opts.hat && (opts.hairStyle ?? 1) !== 0 && opts.outfit !== 'helmet') {
        const r = h * 0.4;
        const cap = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 16, 0, Math.PI * 2, 0, Math.PI * 0.62), hairMat);
        cap.position.copy(crown).multiplyScalar(0.58).add(new THREE.Vector3(0, 0, -h * 0.04));
        cap.scale.set(1.0, 0.95, 1.16);
        cap.rotation.x = -0.45;
        cap.castShadow = true;
        head.g.add(cap);
      }
      const add = (mesh: THREE.Mesh, y: number, z = 0) => { mesh.position.copy(crown).multiplyScalar(y).add(new THREE.Vector3(0, 0, z * h)); mesh.castShadow = true; head.g.add(mesh); return mesh; };
      const shirt = new THREE.MeshStandardMaterial({ color: colors.shirt, roughness: 0.7 });
      switch (opts.outfit) {
        case 'cap': {
          const lift = figure === 'woman' ? 0.74 : 0.66, cr = figure === 'woman' ? 0.5 : 0.44;
          add(new THREE.Mesh(new THREE.SphereGeometry(h * cr, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), shirt), lift, -0.02).scale.set(1, 0.72, 1.1);
          const peak = add(new THREE.Mesh(new THREE.CylinderGeometry(h * cr * 0.75, h * cr * 0.75, h * 0.035, 24, 1, false, -Math.PI / 2, Math.PI), shirt), lift + 0.01, cr * 0.6);
          peak.scale.set(1, 1, 0.9);
          break;
        }
        case 'helmet': {
          const m = new THREE.MeshPhysicalMaterial({ color: '#f2f2f2', roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.1 });
          add(new THREE.Mesh(new THREE.SphereGeometry(h * 0.66, 32, 14, 0, Math.PI * 2, 0, Math.PI * 0.55), m), 0.55, -0.03).scale.set(1, 0.92, 1.1);
          break;
        }
        case 'hat': {
          if (figure === 'woman') {
            const straw = new THREE.MeshStandardMaterial({ color: '#d8c191', roughness: 0.9 });
            add(new THREE.Mesh(new THREE.CylinderGeometry(h * 1.15, h * 1.15, h * 0.04, 40), straw), 0.86, -0.02);
            add(new THREE.Mesh(new THREE.SphereGeometry(h * 0.52, 28, 12, 0, Math.PI * 2, 0, Math.PI / 2), straw), 0.86, -0.02).scale.set(1, 0.8, 1);
          }
          break;
        }
        case 'glasses': {
          const frame = new THREE.MeshStandardMaterial({ color: '#1e1e26', roughness: 0.3, metalness: 0.4 });
          const lens = new THREE.MeshPhysicalMaterial({ color: '#223', roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55 });
          for (const sx of [-1, 1]) {
            const ring = add(new THREE.Mesh(new THREE.TorusGeometry(h * 0.11, h * 0.014, 8, 24), frame), 0.42, 0.5);
            ring.position.x = sx * h * 0.15;
            const glass = add(new THREE.Mesh(new THREE.CircleGeometry(h * 0.1, 20), lens), 0.42, 0.5);
            glass.position.x = sx * h * 0.15;
          }
          break;
        }
        default: break;
      }
    }
    const chest = this.holder('Spine2');
    if (chest) {
      if (opts.outfit === 'backpack') {
        const pack = new THREE.Mesh(RoundedBox(0.36, 0.42, 0.17), new THREE.MeshStandardMaterial({ color: '#3f4a6b', roughness: 0.75 }));
        pack.position.set(0, -0.02, -0.2);
        pack.castShadow = true;
        chest.g.add(pack);
      }
      if (opts.outfit === 'apron') {
        const apron = new THREE.Mesh(RoundedBox(0.4, 0.55, 0.03), new THREE.MeshStandardMaterial({ color: '#f4f1e6', roughness: 0.85 }));
        apron.position.set(0, -0.2, 0.15);
        apron.castShadow = true;
        chest.g.add(apron);
      }
    }
  }

  /** A bone by its Mixamo name without the prefix ("Head", "Spine2", "RightHand"…). */
  bone(name: string): THREE.Bone | undefined {
    return this.bones.get(name);
  }

  /** Sit down (a driver): the legs fold, the rest keeps breathing. */
  setSeated(on: boolean): void {
    this.seated = on;
  }

  /** A nod or a shake of the head, on top of whatever the body is doing. */
  play(move: 'agree' | 'headShake'): void {
    const a = this.actions.get(move);
    if (!a) return;
    a.reset().setEffectiveWeight(0.85).fadeIn(0.2).play();
    this.gesture = a;
  }

  /** `speed01`: 0 standing, 1 walking briskly, above 1 running. */
  update(dt: number, speed01: number): void {
    const s = this.seated ? 0 : Math.max(0, speed01);
    const idle = 1 - step(0.02, 0.3, s);
    const run = step(1.05, 1.6, s);
    const walk = Math.max(0, 1 - idle - run);
    const k = 1 - Math.exp(-dt * 10);
    for (const [move, w] of [['idle', idle], ['walk', walk], ['run', run]] as const) {
      const a = this.actions.get(move);
      if (!a) continue;
      a.setEffectiveWeight(a.getEffectiveWeight() + (w - a.getEffectiveWeight()) * k);
    }
    const walkA = this.actions.get('walk'), runA = this.actions.get('run');
    if (walkA) walkA.timeScale = 0.75 + Math.min(1.4, s) * 0.45;
    if (runA) runA.timeScale = 0.85 + Math.max(0, s - 1) * 0.3;
    if (this.gesture && !this.gesture.isRunning()) this.gesture = null;
    this.walkPhase += dt;
    this.mixer.update(dt);
    if (this.seated) this.sit();
  }

  private sit(): void {
    const q = new THREE.Quaternion(), ax = new THREE.Vector3(1, 0, 0);
    for (const side of ['Left', 'Right']) {
      const up = this.bones.get(side + 'UpLeg'), knee = this.bones.get(side + 'Leg');
      if (up) up.quaternion.multiply(q.setFromAxisAngle(ax, -1.45));
      if (knee) knee.quaternion.multiply(q.setFromAxisAngle(ax, 1.5));
    }
  }

  dispose(): void {
    this.mixer.stopAllAction();
    this.root.traverse((o) => {
      const m = (o as THREE.Mesh).material as THREE.Material | undefined;
      if (m && (o as THREE.Mesh).isMesh) m.dispose();
    });
  }
}

/** A citizen's figure, decided by their colours so it never changes between visits. */
export function figureFor(seed: string): Figure {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0) % 2 ? 'woman' : 'man';
}
