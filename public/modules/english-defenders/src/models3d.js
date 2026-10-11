// Carga e instancia de modelos 3D (GLB): zombies animados (Kenney), casa, castillo
// y kit de naturaleza (Ultimate Stylized Nature Pack). Todo es tolerante a fallos:
// si un GLB no carga, el juego sigue con la escenografía de sprites de siempre.
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/jsm/loaders/GLTFLoader.js';
import { clone as skeletonClone } from '../vendor/jsm/utils/SkeletonUtils.js';

const loader = new GLTFLoader();
const A = {}; // assets cargados: { zombieBody, walkClip, house, castle, nature }
let ready = false;

function load(url) {
  return new Promise((res) => {
    loader.load(url, (g) => res(g), undefined, (e) => { console.warn('GLB no cargó:', url, e?.message || e); res(null); });
  });
}

// Mide el bounding box REAL de un objeto. Clave: hay que actualizar las matrices
// del mundo antes de medir; si no, los modelos con escala interna grande (p. ej. los
// skinned meshes de Kenney, exportados con geometría diminuta y un nodo raíz que la
// agranda) devuelven un tamaño equivocado y quedan escalados a casi cero.
const _measScene = new THREE.Scene();
function measureBox(obj) {
  const prevParent = obj.parent;
  _measScene.add(obj);
  _measScene.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(obj);
  _measScene.remove(obj);
  if (prevParent) prevParent.add(obj);
  return box;
}

// Normaliza un modelo estático (no animado): lo centra en el suelo (y=0) y lo escala
// a una altura objetivo. Devuelve { obj, size }.
function groundAndScale(obj, targetHeight) {
  const size = new THREE.Vector3(); measureBox(obj).getSize(size);
  obj.scale.multiplyScalar(targetHeight / (size.y || 1));
  const box2 = measureBox(obj);
  const c = new THREE.Vector3(); box2.getCenter(c);
  obj.position.x -= c.x;
  obj.position.z -= c.z;
  obj.position.y -= box2.min.y; // apoya la base en y=0
  return { obj, size: box2.getSize(new THREE.Vector3()) };
}

export async function preloadModels() {
  const base = 'assets/models/';
  // Los zombies vuelven a ser sprites 2D planos, así que ya no cargamos el modelo
  // 3D del zombi ni su animación (ahorra descarga). Sólo casa, castillo y naturaleza.
  const [houseG, castleG, natureG] = await Promise.all([
    load(base + 'house.glb'),
    load(base + 'castle.glb'),
    load(base + 'nature.glb'),
  ]);

  // --- Casa / Castillo / Naturaleza (props estáticos) ---
  const prep = (g) => {
    if (!g) return null;
    g.scene.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
    return g.scene;
  };
  A.house = prep(houseG);
  A.castle = prep(castleG);
  // El kit de naturaleza es un solo GLB con muchas variantes por nombre de nodo.
  if (natureG) {
    A.nature = natureG.scene;
    A.natureIndex = {};
    natureG.scene.traverse((o) => {
      if (o.isMesh && o.name) A.natureIndex[o.name] = o;
      else if (o.name && o.children?.length) A.natureIndex[o.name] = o;
    });
  }
  ready = true;
  return A;
}

export function modelsReady() { return ready; }
// (Los zombies son sprites 2D; el modelo 3D animado se retiró por petición.)

// Instancia una variante del kit de naturaleza por nombre (p. ej. 'PineTree_1').
// Devuelve un Group escalado a `targetHeight` o null si no existe.
export function makeNature(name, targetHeight) {
  if (!A.natureIndex || !A.natureIndex[name]) return null;
  const src = A.natureIndex[name];
  const obj = skeletonClone(src);
  obj.traverse((o) => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; o.frustumCulled = true; } });
  const g = new THREE.Group();
  groundAndScale(obj, targetHeight);
  obj.rotation.y = Math.random() * Math.PI * 2;
  g.add(obj);
  return g;
}

export function natureNames() { return A.natureIndex ? Object.keys(A.natureIndex) : []; }

// Casa o castillo escalados a una altura objetivo y apoyados en el suelo.
// `tint` (opcional) repinta el edificio para el escenario: { color, emissive,
// emissiveIntensity }. El material se clona antes de tocarlo, porque `clone(true)`
// comparte materiales con el original y teñir uno los teñiría todos.
export function makeBuilding(kind, targetHeight, tint = null) {
  const src = kind === 'castle' ? A.castle : A.house;
  if (!src) return null;
  const obj = src.clone(true);
  if (tint) {
    obj.traverse((o) => {
      if (!o.isMesh || !o.material) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      o.material = mats.map((m) => {
        const c = m.clone();
        if (tint.color != null) c.color?.set(tint.color);       // multiplica sobre la textura
        if (tint.emissive != null && c.emissive) {
          c.emissive.set(tint.emissive);
          c.emissiveIntensity = tint.emissiveIntensity ?? 0.15;
        }
        return c;
      });
      if (o.material.length === 1) o.material = o.material[0];
    });
  }
  const g = new THREE.Group();
  groundAndScale(obj, targetHeight);
  g.add(obj);
  return g;
}
