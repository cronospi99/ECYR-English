// Props 3D del escenario (los personajes ahora son sprites del atlas del profe).
import * as THREE from 'three';

const M = (color, opts = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.82, metalness: 0.02, ...opts });
const GEO = {
  sphere: new THREE.SphereGeometry(1, 20, 16),
  box: new THREE.BoxGeometry(1, 1, 1),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 16),
  cone: new THREE.ConeGeometry(1, 1, 14),
};

function mesh(geo, mat, sx = 1, sy = 1, sz = 1) {
  const m = new THREE.Mesh(geo, mat);
  m.scale.set(sx, sy, sz);
  m.castShadow = true;
  return m;
}

export function makeFence(width) {
  const g = new THREE.Group();
  const wood = M(0x8a5a2b);
  const rail1 = mesh(GEO.box, wood, width, 0.08, 0.05);
  rail1.position.y = 0.45;
  const rail2 = rail1.clone();
  rail2.position.y = 0.72;
  g.add(rail1, rail2);
  const n = Math.round(width / 0.55);
  for (let i = 0; i <= n; i++) {
    const post = mesh(GEO.box, wood, 0.1, 0.95, 0.06);
    post.position.set(-width / 2 + (i / n) * width, 0.47, 0);
    const tip = mesh(GEO.cone, wood, 0.07, 0.12, 0.05);
    tip.position.set(post.position.x, 1.0, 0);
    g.add(post, tip);
  }
  return g;
}

export function makeHouse() {
  const g = new THREE.Group();
  const wall = mesh(GEO.box, M(0xd8c8a8), 2.2, 1.9, 3.2);
  wall.position.y = 0.95;
  g.add(wall);
  const roof = mesh(GEO.cone, M(0x8a4030), 2.1, 1.2, 2.6);
  roof.position.y = 2.5;
  roof.rotation.y = Math.PI / 4;
  g.add(roof);
  const door = mesh(GEO.box, M(0x6b4a1f), 0.1, 0.9, 0.6);
  door.position.set(1.1, 0.5, 0);
  g.add(door);
  const winMat = M(0x9adcff, { emissive: 0x446688, emissiveIntensity: 0.4 });
  for (const z of [-1, 1]) {
    const win = mesh(GEO.box, winMat, 0.06, 0.45, 0.45);
    win.position.set(1.12, 1.25, z);
    g.add(win);
  }
  return g;
}

export function makeTree(scale = 1) {
  const g = new THREE.Group();
  const trunk = mesh(GEO.cyl, M(0x6b4a1f), 0.14, 0.9, 0.14);
  trunk.position.y = 0.45;
  g.add(trunk);
  const leafMat = M(0x4a8f2e);
  const blobs = [[0, 1.2, 0, 0.5], [0.3, 1.0, 0.1, 0.35], [-0.3, 1.05, -0.05, 0.38], [0, 1.5, 0, 0.34]];
  for (const [x, y, z, s] of blobs) {
    const b = mesh(GEO.sphere, leafMat, s, s * 0.85, s);
    b.position.set(x, y, z);
    g.add(b);
  }
  g.scale.setScalar(scale);
  return g;
}

export function makeRock(scale = 1) {
  const r = mesh(GEO.sphere, M(0x8d8d85), 0.3, 0.22, 0.26);
  r.position.y = 0.1;
  r.rotation.y = Math.random() * 3;
  r.scale.multiplyScalar(scale);
  return r;
}

export function makeGraveSign() {
  const g = new THREE.Group();
  const post = mesh(GEO.box, M(0x6b4a1f), 0.08, 0.7, 0.08);
  post.position.y = 0.35;
  const board = mesh(GEO.box, M(0x8a5a2b), 0.7, 0.35, 0.06);
  board.position.y = 0.75;
  g.add(post, board);
  return g;
}

// Jarrón para el minijuego "Vase Breaker"
export function makeVase() {
  const g = new THREE.Group();
  const clay = M(0xb06a3a, { roughness: 0.6 });
  const body = mesh(GEO.sphere, clay, 0.26, 0.3, 0.26);
  body.position.y = 0.32;
  const neck = mesh(GEO.cyl, clay, 0.13, 0.16, 0.13);
  neck.position.y = 0.62;
  const lip = mesh(GEO.cyl, M(0x8a4e26), 0.17, 0.06, 0.17);
  lip.position.y = 0.72;
  const base = mesh(GEO.cyl, M(0x8a4e26), 0.16, 0.08, 0.16);
  base.position.y = 0.05;
  // franja decorativa
  const band = mesh(GEO.cyl, M(0xe8c87a), 0.262, 0.06, 0.262);
  band.position.y = 0.36;
  g.add(base, body, band, neck, lip);
  g.traverse(o => { o.userData.vase = true; });
  return g;
}
