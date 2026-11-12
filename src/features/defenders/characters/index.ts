/* Entry point of the 3D cast: build a character for the board, or render its portrait for cards
   and the almanac. */
import * as THREE from 'three';
import { CAST } from './cast';
import { blobShadow } from './builder';

export const isCharacter = (name: string) => name in CAST;

/** Character standing on the ground, `height` world units tall, with a soft contact shadow. */
export function makeCharacter(name: string, height: number, shadow = true): THREE.Group {
  const g = CAST[name](height);
  if (shadow) g.add(blobShadow(height * 0.85, height * 0.5));
  return g;
}

const portraits = new Map<string, string>();
export const portraitURL = (name: string) => portraits.get(name) ?? '';

/** Renders every character once into a small transparent image (cards, almanac, pickers). */
export function renderPortraits(size = 256): void {
  if (portraits.size) return;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = size;
  let renderer: THREE.WebGLRenderer;
  try { renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true, preserveDrawingBuffer: true }); }
  catch { return; }
  renderer.setSize(size, size, false);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a94b0, 1.25));
  const key = new THREE.DirectionalLight(0xfff4dc, 2.2); key.position.set(2.5, 4, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0x9ad0ff, 1.1); rim.position.set(-4, 2, -3); scene.add(rim);
  const cam = new THREE.PerspectiveCamera(26, 1, 0.1, 50);
  const box = new THREE.Box3(), c = new THREE.Vector3(), s = new THREE.Vector3();
  for (const name of Object.keys(CAST)) {
    const g = CAST[name](1);
    // portraits look at the viewer a little more than the board pose does
    const u = g.userData;
    (u.rig.parts.turn as THREE.Group).rotation.y = (u.baseYaw as number) * 0.55;
    scene.add(g);
    g.updateMatrixWorld(true);
    box.setFromObject(g); box.getCenter(c); box.getSize(s);
    const r = Math.max(s.x, s.y, s.z) * 0.42 + 0.04;
    const d = r / Math.tan((cam.fov * Math.PI) / 360);
    cam.position.set(c.x + d * 0.12, c.y + d * 0.2, c.z + d);
    cam.lookAt(c);
    renderer.render(scene, cam);
    portraits.set(name, canvas.toDataURL('image/png'));
    scene.remove(g);
    g.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose?.(); });
  }
  renderer.dispose();
  renderer.forceContextLoss();
}
