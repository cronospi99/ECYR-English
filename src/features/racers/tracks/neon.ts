/* English Racers — "Neon Drive" (≈0.85 km) at night: an elevated highway over a glowing grid, a
   steeply banked sweeper and hairpin, a chicane with laser gates that switch on and off (half the
   road at a time), a tunnel of light arches with chasing colours, and a big jump. Around it: the
   striped retro sun on the horizon, wireframe mountains, dark towers outlined in neon, glowing
   signs, rotating holograms and flying cars with light trails. */
import * as THREE from 'three';
import { Geo, U } from '@/features/run/gfx';
import { KERB, type Track, type TrackDef } from '../track';
import { side, type TrackStyle } from '../trackMesh';
import { MATS, billboards, disposeGroup, mergeInto, startGantry, type Hazard, type Scenery } from '../scenery';

export const NEON: TrackDef = {
  id: 'neon', name: 'Neon Drive', laps: 3, waterY: -6, bank: 1.7, bankMax: 0.28,
  cps: [
    { x: 0, z: 0, y: 12, w: 7.5 },
    { x: 0, z: 104.4, y: 12, w: 7.5 },
    { x: -13.9, z: 164.7, y: 14 },
    { x: -60.3, z: 197.2, y: 16 },
    { x: -116, z: 185.6, y: 16 },
    { x: -146.2, z: 139.2, y: 16 },
    { x: -129.9, z: 95.1, y: 14 },
    { x: -96.4, z: 73.2, y: 12, w: 6.5 },
    { x: -84.8, z: 34.7, y: 12, w: 6.5 },
    { x: -104.4, z: -9.3, y: 12 },
    { x: -97.4, z: -71.9, y: 14, w: 7.5 },
    { x: -51, z: -106.7, y: 16, w: 7.5 },
    { x: 9.3, z: -97.4, y: 16 },
    { x: 26.5, z: -50.5, y: 13 },
  ],
  features: [
    { kind: 'boost', at: 0, off: 30, d: -2.6 },
    { kind: 'boost', at: 0, off: 30, d: 2.6 },
    { kind: 'boost', at: 4, off: 0, d: 0 },
    { kind: 'ramp', at: 12, off: 4, len: 12, h: 2.4 },
    { kind: 'gap', at: 12, off: 16, len: 13 },
    { kind: 'boost', at: 10, off: 10, d: 0 },
  ],
  items: [{ at: 2, off: 10 }, { at: 6, off: 16 }, { at: 11, off: 6 }],
  gates: [{ at: 0, off: 52 }, { at: 9, off: 22 }],
  coins: [
    { at: 1, off: 16, d: 0, n: 6 },
    { at: 3, off: 10, d: -2.5, n: 5, dd: 1 },
    { at: 5, off: 6, d: 2.5, n: 5 },
    { at: 8, off: 12, d: 0, n: 4 },
    { at: 10, off: 30, d: -2, n: 5 },
    { at: 12, off: 34, d: 2, n: 4 },
    { at: 13, off: 14, d: -2.5, n: 4 },
  ],
};

export const NEON_STYLE: TrackStyle = { road: 'neon', kerb: [0xff2bd6, 0x1a1238], apron: [0x16103a, 0x1c1446], wall: 'neon', edge: 'sheer', side: 'neon', gapFace: 0x120c26, baseY: -8 };

const GROUND_Y = -8;

function gridMaterial() {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform float uTime; varying vec3 vW;
      float line(float x, float w){ float d = abs(fract(x) - 0.5); float fw = fwidth(x); return 1.0 - smoothstep(w, w + fw * 1.5, 0.5 - d); }
      void main(){
        vec2 p = vW.xz / 12.0;
        float g = max(1.0 - smoothstep(0.0, fwidth(p.x) * 1.6, abs(fract(p.x) - 0.5) - 0.47), 1.0 - smoothstep(0.0, fwidth(p.y) * 1.6, abs(fract(p.y) - 0.5) - 0.47));
        // lines thinner than a pixel melt into a haze: fade them out instead
        float fw = max(fwidth(p.x), fwidth(p.y));
        g *= 1.0 - smoothstep(0.06, 0.3, fw);
        float dist = length(vW.xz - cameraPosition.xz);
        float fade = 1.0 - smoothstep(120.0, 900.0, dist);
        vec3 lc = mix(vec3(1.0, 0.17, 0.84), vec3(0.0, 0.9, 1.0), 0.5 + 0.5 * sin(vW.x * 0.004 + uTime * 0.2));
        vec3 base = mix(vec3(0.04, 0.02, 0.11), vec3(0.12, 0.04, 0.2), 1.0 - fade);
        vec3 c = base + lc * g * fade * 1.6;
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
    toneMapped: false,
  });
}

function sunTex() {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 512;
  const c = cv.getContext('2d')!;
  const g = c.createLinearGradient(0, 0, 0, 512);
  g.addColorStop(0, '#fff27a'); g.addColorStop(0.45, '#ff9a3c'); g.addColorStop(0.75, '#ff3d8c'); g.addColorStop(1, '#b52bff');
  c.fillStyle = g;
  c.beginPath(); c.arc(256, 256, 250, 0, Math.PI * 2); c.fill();
  c.globalCompositeOperation = 'destination-out';
  for (let k = 0; k < 9; k++) { const y = 290 + k * 26, h = 3 + k * 2.2; c.fillRect(0, y, 512, h); }
  const t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function buildNeon(track: Track): Scenery {
  const M = MATS();
  const group = new THREE.Group();
  const F = track.frames;
  const near = F.filter((_, i) => i % 2 === 0);
  const clear = (x: number, z: number, r: number) => near.every((f) => Math.hypot(x - f.p.x, z - f.p.z) > f.w + KERB + f.apron + 2.5 + r);
  let seed = 77;
  const rand = () => { seed = (seed * 16807) % 2147483647; return seed / 2147483647; };
  const world = new Geo(), glossy = new Geo(), glow = new Geo();
  glow.boost = 2.2;
  const NEONS = [0xff2bd6, 0x00e5ff, 0x7a5cff, 0xffc531, 0x39ff9a];

  /* ---------------- glowing grid floor, the sun, wireframe mountains ---------------- */
  const grid = gridMaterial();
  {
    const g = new THREE.PlaneGeometry(3600, 3600);
    g.rotateX(-Math.PI / 2);
    const m = new THREE.Mesh(g, grid);
    m.position.set(-60, GROUND_Y, 40);
    group.add(m);
  }
  {
    const m = new THREE.Mesh(new THREE.CircleGeometry(170, 64), new THREE.MeshBasicMaterial({ map: sunTex(), transparent: true, fog: false, toneMapped: false, depthWrite: false }));
    m.position.set(-60, 70, 1050);
    m.rotation.y = Math.PI;
    m.renderOrder = -9;
    (m.material as THREE.MeshBasicMaterial).color.setScalar(1.6);
    group.add(m);
  }
  {
    const pts: number[] = [];
    const ridge = (cx: number, cz: number, ry: number, w: number, h: number, n: number) => {
      const c = Math.cos(ry), s = Math.sin(ry);
      const P = (lx: number, y: number, lz: number) => [cx + lx * c + lz * s, y, cz - lx * s + lz * c];
      const heights = Array.from({ length: n + 1 }, (_, i) => (i === 0 || i === n ? 0 : h * (0.35 + rand() * 0.65)));
      for (let i = 0; i < n; i++) {
        const x0 = -w / 2 + (i / n) * w, x1 = -w / 2 + ((i + 1) / n) * w;
        pts.push(...P(x0, GROUND_Y + heights[i], 0), ...P(x1, GROUND_Y + heights[i + 1], 0));
        pts.push(...P(x0, GROUND_Y + heights[i], 0), ...P((x0 + x1) / 2, GROUND_Y, 60));
        pts.push(...P(x0, GROUND_Y + heights[i], 0), ...P((x0 + x1) / 2, GROUND_Y, -60));
      }
    };
    ridge(-60, 760, 0, 1400, 150, 18);
    ridge(-760, 0, Math.PI / 2, 1300, 120, 16);
    ridge(640, 60, Math.PI / 2, 1300, 130, 16);
    ridge(-60, -720, 0, 1400, 110, 18);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
    group.add(new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: new THREE.Color(0.9, 0.25, 1.6), transparent: true, opacity: 0.75, fog: true, toneMapped: false })));
  }

  /* ---------------- towers outlined in neon ---------------- */
  const tower = (x: number, z: number, w: number, d: number, h: number) => {
    const col = NEONS[Math.floor(rand() * NEONS.length)];
    world.add(U.box, 0x0e0a22, x, GROUND_Y + h / 2, z, w, h, d);
    // glowing edges and a few bands of windows
    for (const [ax, az] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) glow.add(U.box, col, x + (ax * w) / 2, GROUND_Y + h / 2, z + (az * d) / 2, 0.25, h, 0.25);
    glow.add(U.box, col, x, GROUND_Y + h, z - d / 2, w, 0.25, 0.25); glow.add(U.box, col, x, GROUND_Y + h, z + d / 2, w, 0.25, 0.25);
    glow.add(U.box, col, x - w / 2, GROUND_Y + h, z, 0.25, 0.25, d); glow.add(U.box, col, x + w / 2, GROUND_Y + h, z, 0.25, 0.25, d);
    for (let y = 6; y < h - 3; y += 4 + Math.floor(rand() * 3)) if (rand() < 0.5) {
      const wc = rand() < 0.5 ? 0x3a2f80 : 0x5a2a70;
      world.add(U.box, wc, x, GROUND_Y + y, z, w + 0.05, 0.9, d + 0.05);
    }
    if (rand() < 0.3) { glossy.add(U.cyl, 0x2a2450, x, GROUND_Y + h + 4, z, 0.15, 8, 0.15); glow.add(U.ball, 0xff2a5a, x, GROUND_Y + h + 8.2, z, 0.35, 0.35, 0.35); }
  };
  for (let k = 0; k < 140; k++) {
    const a = rand() * Math.PI * 2, r = 70 + Math.pow(rand(), 0.7) * 520;
    const x = -60 + Math.cos(a) * r, z = 45 + Math.sin(a) * r, w = 10 + rand() * 14, d = 10 + rand() * 14;
    if (!clear(x, z, Math.max(w, d) * 0.75)) continue;
    tower(x, z, w, d, 16 + rand() * 50 + (r > 250 ? rand() * 70 : 0));
  }
  // synthwave palms along the start straight
  for (let k = 0; k < 12; k++) {
    const f = track.frame(Math.round((track.length - 36 + k * 12) / track.ds) % F.length);
    for (const sg of [-1, 1]) {
      const P = side(f, sg * (f.w + KERB + f.apron + 5));
      if (!clear(P.x, P.z, 0.5)) continue;
      const h = 14 + (k % 3) * 2;
      world.add(U.cyl, 0x1a1238, P.x, GROUND_Y + (h + 8) / 2, P.z, 0.35, h + 8, 0.35);
      for (let j = 0; j < 7; j++) {
        const a = (j / 7) * Math.PI * 2;
        for (let s = 0; s < 3; s++) glow.add(U.box, s === 0 ? 0xff2bd6 : 0x7a5cff, P.x + Math.cos(a) * (0.8 + s * 0.9), GROUND_Y + h + 8 - s * s * 0.3, P.z + Math.sin(a) * (0.8 + s * 0.9), 1, 0.06, 0.18, 0, -a, -(0.2 + s * 0.3));
      }
    }
  }

  /* ---------------- tunnel of light arches (chasing colours) ---------------- */
  const tunnel = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } },
    vertexShader: 'attribute float aPhase; attribute vec3 color; varying float vP; varying vec3 vC; void main(){ vP = aPhase; vC = color; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `uniform float uTime; varying float vP; varying vec3 vC;
      void main(){ float k = fract(vP * 0.08 - uTime * 0.9); float pulse = 0.35 + 1.9 * smoothstep(0.75, 1.0, k) + 0.25 * sin(uTime * 3.0 + vP); gl_FragColor = vec4(vC * pulse, 1.0); }`,
    toneMapped: false,
  });
  {
    const s0 = track.oS[9] + 6, s1 = track.oS[10] - 4;
    const pos: number[] = [], col: number[] = [], ph: number[] = [];
    const c = new THREE.Color();
    let n = 0;
    for (let s = s0; s < s1; s += 5, n++) {
      const f = track.frame(Math.round(s / track.ds));
      const W = f.w + KERB + f.apron + 0.9, H = 7.2;
      c.setHex(NEONS[n % 3]);
      const L = side(f, -W), R = side(f, W);
      const pts: THREE.Vector3[] = [];
      for (let k = 0; k <= 12; k++) {
        const a = Math.PI - (k / 12) * Math.PI;
        const d = Math.cos(a) * W, y = Math.sin(a) * H;
        const P = side(f, d); P.y = (L.y + R.y) / 2 + y + (d < 0 ? L.y - (L.y + R.y) / 2 : R.y - (L.y + R.y) / 2) * (1 - Math.sin(a));
        pts.push(P);
      }
      for (let k = 0; k < 12; k++) {
        const a = pts[k], b = pts[k + 1];
        const t0 = f.t.clone().multiplyScalar(0.18);
        const q = [a.clone().sub(t0), b.clone().sub(t0), b.clone().add(t0), a.clone().add(t0)];
        // a flat ribbon with some thickness
        const ribbonW = 0.32;
        const dir = new THREE.Vector3().subVectors(b, a).normalize();
        const out = new THREE.Vector3().crossVectors(dir, f.t).normalize().multiplyScalar(ribbonW);
        const r = [q[0], q[1], q[2], q[3]].map((p) => p.clone());
        const r2 = r.map((p) => p.clone().add(out));
        for (const tri of [[r[0], r[1], r[2]], [r[0], r[2], r[3]], [r2[0], r2[2], r2[1]], [r2[0], r2[3], r2[2]], [r[0], r2[0], r2[1]], [r[0], r2[1], r[1]], [r[3], r[2], r2[2]], [r[3], r2[2], r2[3]]]) {
          for (const p of tri) { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); ph.push(n); }
        }
      }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setAttribute('aPhase', new THREE.Float32BufferAttribute(ph, 1));
    group.add(new THREE.Mesh(g, tunnel));
  }

  /* ---------------- laser gates in the chicane (moving hazards) ---------------- */
  const hazards: Hazard[] = [];
  const lasers: { beams: THREE.Mesh[]; mat: THREE.MeshBasicMaterial; h: Hazard; ph: number }[] = [];
  const laserGeo = new THREE.BoxGeometry(1, 0.09, 0.09);
  [[7, 14, -1], [7, 34, 1], [8, 12, -1]].forEach(([cp, off, sg], i) => {
    const s = (track.oS[cp] + off) % track.length, f = track.frame(Math.round(s / track.ds));
    const w = f.w + KERB;
    const d0 = sg < 0 ? -w : 0, d1 = sg < 0 ? 0 : w;
    const h: Hazard = { s, d: (d0 + d1) / 2, hs: 0.35, hd: w / 2, on: false, kind: 'laser' };
    hazards.push(h);
    const mat = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.6, 0.2, 0.6), transparent: true, opacity: 0.95, toneMapped: false, depthWrite: false, blending: THREE.AdditiveBlending });
    const A = side(f, d0), B = side(f, d1);
    const beams: THREE.Mesh[] = [];
    for (const y of [0.45, 0.95, 1.45]) {
      const m = new THREE.Mesh(laserGeo, mat);
      m.position.set((A.x + B.x) / 2, (A.y + B.y) / 2 + y, (A.z + B.z) / 2);
      m.scale.x = Math.hypot(B.x - A.x, B.z - A.z);
      m.rotation.y = f.yaw + Math.PI / 2;
      group.add(m);
      beams.push(m);
    }
    for (const P of [A, B, side(f, sg < 0 ? -w - 0.4 : w + 0.4)]) { glossy.add(U.box, 0x2a2450, P.x, P.y + 0.9, P.z, 0.35, 1.8, 0.35, 0, f.yaw, 0); glow.add(U.box, 0xff2a8a, P.x, P.y + 1.85, P.z, 0.36, 0.1, 0.36, 0, f.yaw, 0); }
    lasers.push({ beams, mat, h, ph: i * 0.9 });
  });

  /* ---------------- start gantry, glowing billboards ---------------- */
  const lamps = startGantry(track, group, glossy, 'NEON DRIVE', ['#ff2bd6', '#7a5cff'], 0x1b1638, 0x00e5ff);
  billboards(track, group, world, [
    [2, ['FEEL THE BEAT'], ['#ff2bd6', '#7a5cff']],
    [5, ['HOLD THAT DRIFT'], ['#00b8d4', '#7a5cff']],
    [8, ['LASERS AHEAD'], ['#ff3d6e', '#ffc531']],
    [11, ['BIG JUMP!'], ['#39ff9a', '#00e5ff']],
  ], clear, 0x2a2450);
  group.traverse((o) => { const m = o as THREE.Mesh; const mm = m.material as THREE.MeshStandardMaterial; if (m.isMesh && mm?.map && mm.isMeshStandardMaterial && !mm.emissiveMap) { mm.emissive.setHex(0xffffff); mm.emissiveMap = mm.map; mm.emissiveIntensity = 0.9; } });

  /* ---------------- life: holograms, flying cars with light trails ---------------- */
  const live = new THREE.Group();
  group.add(live);
  const holoMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(0.3, 1.6, 2.2), wireframe: true, transparent: true, opacity: 0.8, toneMapped: false });
  const holos: THREE.Mesh[] = [];
  for (const [x, z, y, s, kind] of [[-70, 130, 40, 10, 0], [-40, -40, 34, 8, 1], [60, 80, 46, 12, 2], [-190, 40, 50, 14, 0], [40, -160, 38, 9, 1]] as const) {
    const g = kind === 0 ? new THREE.OctahedronGeometry(1, 0) : kind === 1 ? new THREE.TorusKnotGeometry(0.7, 0.22, 64, 8) : new THREE.IcosahedronGeometry(1, 0);
    const m = new THREE.Mesh(g, holoMat);
    m.position.set(x, y, z);
    m.scale.setScalar(s);
    holos.push(m);
    live.add(m);
  }
  const flyers: { m: THREE.Mesh; trail: THREE.Mesh; cx: number; cz: number; rx: number; rz: number; y: number; sp: number; ph: number }[] = [];
  const carG = new Geo().add(U.box, 0x221a48, 0, 0, 0, 1.8, 0.6, 3.6).add(U.box, 0x3a2f80, 0, 0.45, -0.2, 1.4, 0.4, 1.8);
  const carGeo = carG.build();
  const carMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.3, metalness: 0.6 });
  for (let k = 0; k < 10; k++) {
    const m = new THREE.Mesh(carGeo, carMat);
    const col = new THREE.Color(NEONS[k % NEONS.length]).multiplyScalar(2.2);
    const trail = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 14).translate(0, -7.5, 0).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.55, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
    m.add(trail);
    trail.position.set(0, 0, -1.8);
    const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.08, 0.1), new THREE.MeshBasicMaterial({ color: col, toneMapped: false }));
    glowStrip.position.set(0, -0.3, -1.8);
    m.add(glowStrip);
    flyers.push({ m, trail, cx: -60 + (rand() - 0.5) * 200, cz: 45 + (rand() - 0.5) * 200, rx: 180 + rand() * 200, rz: 150 + rand() * 200, y: 30 + rand() * 40, sp: (0.06 + rand() * 0.06) * (rand() < 0.5 ? 1 : -1), ph: rand() * 6 });
    live.add(m);
  }

  mergeInto(group, M, { world, glossy, glow });
  return {
    group, lamps, waters: [], waterY: -60, hazards,
    update(dt, t) {
      grid.uniforms.uTime.value = t;
      tunnel.uniforms.uTime.value = t;
      for (const L of lasers) {
        // 1.6 s on, 1.6 s off, flickering for a moment before switching on
        const cyc = (t + L.ph) % 3.2;
        const on = cyc < 1.6;
        const warn = cyc > 2.75;
        L.h.on = on;
        const vis = on || (warn && Math.sin(t * 60) > 0);
        L.mat.opacity = on ? 0.95 : warn ? 0.35 : 0;
        for (const b of L.beams) { b.visible = vis; b.scale.y = b.scale.z = on ? 1 + Math.sin(t * 40) * 0.15 : 0.6; }
      }
      holos.forEach((h, i) => { h.rotation.set(t * 0.3 + i, t * 0.5 + i * 2, 0); h.position.y += Math.sin(t + i) * dt * 0.8; });
      for (const f of flyers) {
        const a = t * f.sp + f.ph;
        const x = f.cx + Math.cos(a) * f.rx, z = f.cz + Math.sin(a) * f.rz;
        const nx = f.cx + Math.cos(a + 0.01 * Math.sign(f.sp)) * f.rx, nz = f.cz + Math.sin(a + 0.01 * Math.sign(f.sp)) * f.rz;
        f.m.position.set(x, f.y + Math.sin(t * 0.7 + f.ph) * 2, z);
        f.m.rotation.set(0, Math.atan2(nx - x, nz - z), Math.sign(f.sp) * -0.15);
      }
    },
    dispose: () => { disposeGroup(group); laserGeo.dispose(); },
  };
}
