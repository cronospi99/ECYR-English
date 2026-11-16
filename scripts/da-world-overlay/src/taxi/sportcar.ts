/**
 * Taxi Rush — the cab (ECYR rebuild).
 *
 * A real car: the Khronos "Car Concept" (CC-BY 4.0, Eric Chadwick / Darmstadt
 * Graphics Group, from a CC0 model by Unity Fan — see public/cars/README.md),
 * simplified and recompressed for the web. Here it becomes a taxi:
 *
 *  - the paint is tinted to the player's colour under a deep clearcoat, and the
 *    secondary panels stay gloss black, the classic two-tone cab;
 *  - the stickers (checker band, "TAXI" on the doors, the cab number, the phone
 *    to call, a checker racing stripe over the hood) are painted *on* the paint
 *    in the shader, projected from the car's own sides and top, so they follow
 *    every curve of the body and sit under the clearcoat like real vinyl;
 *  - a lit TAXI sign on the roof, a plate of our own, rims in chrome, black or
 *    gold, wheels that roll and steer, head- and brake-lights that work, and the
 *    driver sitting at the wheel (the car has a central seat).
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/examples/jsm/libs/meshopt_decoder.module.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

export type Livery = 'checker' | 'stripe' | 'flames' | 'none';
export type RimFinish = 'chrome' | 'black' | 'gold';
export type Sign = 'classic' | 'neon' | 'none';

/** Length the game's physics was tuned for (the old cab, bumper to bumper). */
export const CAR_LENGTH = 2.95;

let base: THREE.Object3D | null = null;
let loading: Promise<void> | null = null;
const waiting = new Set<() => void>();
let wanted = true;

export function sportCarReady(): boolean {
  return wanted && base !== null;
}

/** Off on the lowest tier: the simple cab costs nothing to draw. */
export function setSportCar(on: boolean): void {
  wanted = on;
  if (on) void loadSportCar();
}

export function onSportCar(fn: () => void): () => void {
  if (sportCarReady()) { fn(); return () => {}; }
  waiting.add(fn);
  return () => waiting.delete(fn);
}

export function loadSportCar(): Promise<void> {
  if (loading) return loading;
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loading = loader
    .loadAsync(`${import.meta.env.BASE_URL}cars/taxi.glb`)
    .then((g) => {
      base = g.scene;
      if (wanted) for (const fn of [...waiting]) fn();
      waiting.clear();
    })
    .catch((e) => console.warn('[Taxi Rush] sports car unavailable:', e));
  return loading;
}

/* ------------------------------------------------------------- stickers -- */

const SIDE_W = 1280, SIDE_H = 256;
/** Side sticker sheet: u runs from the tail (0) to the nose (1), v from sill (0) to roof (1). */
function sideSheet(kind: Livery, number: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = SIDE_W; cv.height = SIDE_H;
  const c = cv.getContext('2d')!;
  const Y = (v: number) => SIDE_H * (1 - v);
  if (kind === 'checker') {
    const s = 18, y0 = Y(0.5), rows = 2;
    for (let x = 0; x < SIDE_W / s; x++) for (let r = 0; r < rows; r++) {
      c.fillStyle = (x + r) % 2 ? '#111111' : '#f4f4f4';
      c.fillRect(x * s, y0 + r * s, s, s);
    }
  } else if (kind === 'stripe') {
    c.fillStyle = '#121212'; c.fillRect(0, Y(0.52), SIDE_W, 30);
    c.fillStyle = '#ffffff'; c.fillRect(0, Y(0.52) + 34, SIDE_W, 6);
  } else if (kind === 'flames') {
    const g = c.createLinearGradient(SIDE_W, 0, SIDE_W * 0.35, 0);
    g.addColorStop(0, '#ffe45c'); g.addColorStop(0.4, '#ff7a1f'); g.addColorStop(1, 'rgba(220,30,20,0)');
    c.fillStyle = g;
    c.beginPath(); c.moveTo(SIDE_W, Y(0.25));
    for (let i = 0; i <= 10; i++) {
      const x = SIDE_W - i * 70;
      c.quadraticCurveTo(x - 25, Y(0.62 - (i % 2) * 0.12), x - 70, Y(0.42 + (i % 3) * 0.05));
    }
    c.lineTo(SIDE_W * 0.2, Y(0.3)); c.lineTo(SIDE_W, Y(0.18)); c.closePath(); c.fill();
  }
  if (kind !== 'none') {
    // "TAXI" across the doors, outlined so it reads on any paint
    c.font = '900 italic 96px "Arial Black","Trebuchet MS",Arial,sans-serif';
    c.textAlign = 'center'; c.textBaseline = 'middle';
    c.lineWidth = 12; c.strokeStyle = '#111111';
    c.strokeText('TAXI', SIDE_W * 0.53, Y(0.72));
    c.fillStyle = '#ffffff'; c.fillText('TAXI', SIDE_W * 0.53, Y(0.72));
    // the number on the rear quarter, the phone line under the band
    c.font = '900 italic 70px "Arial Black",Arial,sans-serif';
    c.lineWidth = 9; c.strokeText(number, SIDE_W * 0.22, Y(0.66)); c.fillText(number, SIDE_W * 0.22, Y(0.66));
    c.font = '800 30px "Arial Black",Arial,sans-serif';
    c.fillStyle = '#111111';
    c.fillText('☎ CALL 555-0199 · ECYR CABS', SIDE_W * 0.53, Y(0.3));
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

const TOP_W = 256, TOP_H = 1024;
/** Hood and roof sheet, seen from above: u across the car (−x..x), v from tail to nose. */
function topSheet(kind: Livery): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = TOP_W; cv.height = TOP_H;
  const c = cv.getContext('2d')!;
  // texels are 8.6 mm across the car and 4.3 mm along it: checks are drawn
  // twice as tall as wide so they come out square on the bonnet
  const sx = 12, sy = 24, cols = 3, x0 = TOP_W / 2 - (cols * sx) / 2;
  if (kind === 'checker') {
    for (let y = 0; y < TOP_H / sy; y++) for (let k = 0; k < cols; k++) { c.fillStyle = (y + k) % 2 ? '#111' : '#f4f4f4'; c.fillRect(x0 + k * sx, y * sy, sx, sy); }
  } else if (kind === 'stripe') {
    c.fillStyle = '#121212'; c.fillRect(x0 - 6, 0, cols * sx + 12, TOP_H);
    c.fillStyle = '#ffffff'; c.fillRect(TOP_W / 2 - 3, 0, 6, TOP_H);
  }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}

function plateTexture(number: string): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 140;
  const c = cv.getContext('2d')!;
  c.fillStyle = '#ffd21a'; c.fillRect(0, 0, 512, 140);
  c.strokeStyle = '#111'; c.lineWidth = 10; c.strokeRect(8, 8, 496, 124);
  c.fillStyle = '#111'; c.font = '900 80px "Arial Black",Arial,sans-serif'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(`TX·${number}`, 256, 76);
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  t.flipY = false;
  return t;
}

export function signTexture(kind: Sign): THREE.CanvasTexture {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const c = cv.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 0, 128);
  if (kind === 'neon') { g.addColorStop(0, '#2a0f47'); g.addColorStop(1, '#12051f'); } else { g.addColorStop(0, '#fffbe0'); g.addColorStop(1, '#ffd84a'); }
  c.fillStyle = g; c.fillRect(0, 0, 512, 128);
  c.font = '900 italic 92px "Arial Black","Trebuchet MS",Arial,sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  if (kind === 'neon') { c.shadowColor = '#ff3df2'; c.shadowBlur = 24; c.fillStyle = '#ff9af8'; } else { c.fillStyle = '#111'; }
  c.fillText('TAXI', 256, 70);
  // checker trim along the bottom
  for (let x = 0; x < 32; x++) { c.fillStyle = x % 2 ? '#111' : '#f4f4f4'; c.fillRect(x * 16, 116, 16, 12); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The vinyl, painted onto the body paint in its own (car) space. */
function applyStickers(m: THREE.MeshPhysicalMaterial, side: THREE.Texture, top: THREE.Texture, toCar: { value: THREE.Matrix4 }): void {
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uSide = { value: side };
    shader.uniforms.uTop = { value: top };
    shader.uniforms.uToCar = toCar;
    shader.vertexShader = shader.vertexShader
      .replace('void main() {', 'uniform mat4 uToCar;\nvarying vec3 vCarP;\nvarying vec3 vCarN;\nvoid main() {')
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
         vCarP = (uToCar * modelMatrix * vec4(transformed, 1.0)).xyz;
         vCarN = normalize(mat3(uToCar) * mat3(modelMatrix) * objectNormal);`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace('void main() {', 'uniform sampler2D uSide;\nuniform sampler2D uTop;\nvarying vec3 vCarP;\nvarying vec3 vCarN;\nfloat vinylA = 0.0;\nvoid main() {')
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
         {
           vec3 n = normalize(vCarN);
           vec4 s = vec4(0.0);
           // sides: from the tail (z -1.95) to the nose (z 2.45), sill (y 0.15) to roof (y 1.12)
           if (abs(n.x) > 0.42) {
             float u = (vCarP.z + 1.95) / 4.4;
             if (vCarP.x > 0.0) u = 1.0 - u; // the left side reads from its own front
             float v = (vCarP.y - 0.15) / 0.97;
             if (u > 0.0 && u < 1.0 && v > 0.0 && v < 1.0) s = texture2D(uSide, vec2(u, v));
             s.a *= smoothstep(0.42, 0.6, abs(n.x));
           } else if (n.y > 0.55) {
             float u = (vCarP.x + 1.1) / 2.2;
             float v = (vCarP.z + 1.95) / 4.4;
             s = texture2D(uTop, vec2(u, v));
             s.a *= smoothstep(0.55, 0.75, n.y);
           }
           vinylA = s.a;
           diffuseColor.rgb = mix(diffuseColor.rgb, s.rgb, s.a);
         }`,
      )
      .replace(
        '#include <metalnessmap_fragment>',
        `#include <metalnessmap_fragment>
         metalnessFactor = mix(metalnessFactor, 0.0, vinylA);`,
      );
  };
  m.customProgramCacheKey = () => 'taxi-vinyl';
}

/* ------------------------------------------------------------------ car -- */

export interface SportLook {
  color: string;
  stripe: Livery;
  rims: RimFinish;
  roof: Sign;
  number: string;
}

export interface SportCar {
  root: THREE.Group;
  /** Hip position of the driver, in the root's space. */
  seat: THREE.Vector3;
  wheelRadius: number;
  animate(speed: number, steer: number, dt: number, braking: boolean, night: number): void;
  dispose(): void;
}

export function buildSportCar(look: SportLook): SportCar | null {
  if (!base) return null;
  const root = new THREE.Group();
  const model = base.clone(true);
  const scale = CAR_LENGTH / 4.36;
  model.scale.setScalar(scale);
  model.position.y = 0.16 * scale; // tyres on the ground
  root.add(model);
  root.updateMatrixWorld(true);

  const toCar = { value: new THREE.Matrix4() };
  const side = sideSheet(look.stripe, look.number);
  const top = topSheet(look.stripe);
  const owned: THREE.Material[] = [];
  const textures: THREE.Texture[] = [side, top];
  const own = <T extends THREE.Material>(m: T): T => { owned.push(m); return m; };

  const paint = own(new THREE.MeshPhysicalMaterial({
    color: look.color, metalness: 0.45, roughness: 0.28,
    clearcoat: 1, clearcoatRoughness: 0.04, envMapIntensity: 1.35,
  }));
  applyStickers(paint, side, top, toCar);
  const black = own(new THREE.MeshPhysicalMaterial({ color: '#0d0e10', metalness: 0.3, roughness: 0.25, clearcoat: 1, clearcoatRoughness: 0.05, envMapIntensity: 1.2 }));
  const glass = own(new THREE.MeshPhysicalMaterial({ color: '#0b1218', metalness: 0.1, roughness: 0.03, transparent: true, opacity: 0.38, envMapIntensity: 1.8, depthWrite: false }));
  const rim = own(new THREE.MeshStandardMaterial(
    look.rims === 'chrome' ? { color: '#eef1f4', metalness: 1, roughness: 0.12 }
      : look.rims === 'gold' ? { color: '#e2b24c', metalness: 1, roughness: 0.18 }
        : { color: '#141518', metalness: 0.7, roughness: 0.3 },
  ));
  const seats = own(new THREE.MeshStandardMaterial({ color: '#1d1f23', roughness: 0.65 }));
  const plateTex = plateTexture(look.number);
  textures.push(plateTex);
  const plate = own(new THREE.MeshStandardMaterial({ map: plateTex, roughness: 0.5 }));
  let head: THREE.MeshStandardMaterial | null = null;
  let brake: THREE.MeshStandardMaterial | null = null;

  const swap = new Map<THREE.Material, THREE.Material>();
  model.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (/Emblem/.test(mesh.name)) { mesh.visible = false; return; }
    mesh.castShadow = !/Interior|Windshield|Window|Glass/.test(mesh.name);
    mesh.receiveShadow = true;
    const src = mesh.material as THREE.MeshStandardMaterial;
    const name = src.name || '';
    let m: THREE.Material | undefined = swap.get(src);
    if (!m) {
      if (name === 'Paint 1 Carmine') m = paint;
      else if (name === 'Paint 2 Carmine') m = black;
      else if (name === 'Glass') m = glass;
      else if (/^Rim/.test(name)) m = rim;
      else if (/Interior 3/.test(name)) m = seats;
      else if (name === 'License') m = plate;
      else if (name === 'Headlight') { head = own(src.clone()); head.emissive = new THREE.Color('#fff4d6'); m = head; }
      else if (name === 'Brakelight') { brake = own(src.clone()); brake.emissive = new THREE.Color('#ff1a24'); m = brake; }
      else m = src;
      swap.set(src, m);
    }
    mesh.material = m;
  });

  /* ---- roof sign ---- */
  let signMat: THREE.MeshStandardMaterial | null = null;
  if (look.roof !== 'none') {
    const t = signTexture(look.roof);
    textures.push(t);
    signMat = own(new THREE.MeshStandardMaterial({ map: t, emissiveMap: t, emissive: new THREE.Color('#ffffff'), emissiveIntensity: look.roof === 'neon' ? 1.8 : 0.7, roughness: 0.25 }));
    const capMat = own(new THREE.MeshStandardMaterial({ color: '#111214', roughness: 0.4, metalness: 0.4 }));
    const geo = new RoundedBoxGeometry(0.78, 0.24, 0.3, 4, 0.06);
    const sign = new THREE.Mesh(geo, [capMat, capMat, capMat, capMat, signMat, signMat]);
    sign.position.set(0, 1.27, -0.12);
    sign.castShadow = true;
    const foot = new THREE.Mesh(new RoundedBoxGeometry(0.62, 0.05, 0.36, 3, 0.02), capMat);
    foot.position.set(0, 1.16, -0.12);
    model.add(sign, foot);
  }

  /* ---- wheels: re-pivot each about its own centre, fronts also steer ---- */
  const spin: THREE.Object3D[] = [], steer: THREE.Object3D[] = [];
  let wheelRadius = 0.35;
  for (const name of ['WheelFrontL', 'WheelFrontR', 'WheelRearL', 'WheelRearR']) {
    const w = model.getObjectByName(name);
    if (!w || !w.parent) continue;
    // The model was saved with its front wheels steered 30°: straighten every wheel so its axle
    // runs across the car, or they look crooked (and the game's own steering adds on top).
    const axle = new THREE.Vector3(1, 0, 0).applyQuaternion(w.quaternion).normalize();
    w.quaternion.premultiply(new THREE.Quaternion().setFromUnitVectors(axle, new THREE.Vector3(Math.sign(axle.x) || 1, 0, 0)));
    w.updateMatrixWorld(true);
    // pivot on the wheel's own origin (the hub), not on its bounding box: the brake calliper
    // hangs off one side and an off-centre pivot makes the wheel wobble as it rolls
    const rim = w.children.find((k) => /Rim/.test(k.name)) ?? w;
    const box = new THREE.Box3().setFromObject(rim);
    const c = w.getWorldPosition(new THREE.Vector3());
    wheelRadius = (box.max.y - box.min.y) / 2;
    const st = new THREE.Group(), sp = new THREE.Group();
    model.worldToLocal(c);
    st.position.copy(c);
    model.add(st);
    st.add(sp);
    st.updateMatrixWorld(true);
    sp.attach(w);
    spin.push(sp);
    if (/Front/.test(name)) steer.push(st);
  }

  // driver: the car has one central seat
  const seat = new THREE.Vector3(0, 0.36, 0.18).multiplyScalar(scale).add(model.position);

  return {
    root,
    seat,
    wheelRadius,
    animate(speed, steerAmt, dt, braking, night) {
      root.updateWorldMatrix(true, false);
      toCar.value.copy(model.matrixWorld).invert();
      const roll = (speed * dt) / Math.max(0.05, wheelRadius);
      for (const s of spin) s.rotation.x += roll;
      for (const s of steer) s.rotation.y = steerAmt * 0.42;
      if (brake) brake.emissiveIntensity = braking ? 4 : 0.3 + night * 1.5;
      if (head) head.emissiveIntensity = 0.6 + night * 4;
      if (signMat) signMat.emissiveIntensity = (look.roof === 'neon' ? 1.8 : 0.7) + night * 1.6;
    },
    dispose() {
      for (const m of owned) m.dispose();
      for (const t of textures) t.dispose();
    },
  };
}
