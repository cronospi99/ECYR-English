/* English Racers — effects: GPU point particles (additive sparks and soft smoke/dust), turbo
   flames from the exhausts, tyre skid marks laid while drifting, and screen speed lines. */
import * as THREE from 'three';

const PV = `attribute vec3 aColor; attribute float aSize; attribute float aAlpha; attribute float aRot; uniform float uScale;
  varying vec3 vC; varying float vA; varying float vR;
  void main(){ vC = aColor; vA = aAlpha; vR = aRot; vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(aSize * uScale / -mv.z, 512.0);
    // fade particles right in front of the camera
    vA *= smoothstep(0.4, 2.2, -mv.z);
    gl_Position = projectionMatrix * mv; }`;
const PF_SOFT = `uniform sampler2D uTex; varying vec3 vC; varying float vA; varying float vR;
  void main(){
    vec2 q = gl_PointCoord - 0.5; float c = cos(vR), s = sin(vR);
    vec4 t = texture2D(uTex, vec2(c * q.x - s * q.y, s * q.x + c * q.y) + 0.5);
    float a = t.a * vA; if (a < 0.01) discard;
    gl_FragColor = vec4(vC * mix(1.0, t.r, 0.35), a); }`;

/** Sparks: a white-hot core in a soft glow. Smoke: a lumpy puff (several blobs, shaded). */
function dotTexture(hard: boolean) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 128;
  const c = cv.getContext('2d')!;
  if (hard) {
    const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.12, 'rgba(255,255,255,1)'); g.addColorStop(0.3, 'rgba(255,255,255,.55)'); g.addColorStop(0.6, 'rgba(255,255,255,.14)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = g; c.fillRect(0, 0, 128, 128);
  } else {
    let r = 5;
    const rnd = () => { r = (r * 16807) % 2147483647; return r / 2147483647; };
    for (let k = 0; k < 14; k++) {
      const a = rnd() * Math.PI * 2, d = rnd() * 26, x = 64 + Math.cos(a) * d, y = 64 + Math.sin(a) * d, rad = 22 + rnd() * 18, sh = 200 + rnd() * 55;
      const g = c.createRadialGradient(x - rad * 0.2, y - rad * 0.25, 0, x, y, rad);
      g.addColorStop(0, `rgba(${sh},${sh},${sh},.42)`); g.addColorStop(0.6, `rgba(${sh - 30},${sh - 30},${sh - 30},.2)`); g.addColorStop(1, 'rgba(160,160,160,0)');
      c.fillStyle = g; c.fillRect(0, 0, 128, 128);
    }
    // fade the square's edges so a puff never shows a corner
    c.globalCompositeOperation = 'destination-in';
    const m = c.createRadialGradient(64, 64, 30, 64, 64, 64);
    m.addColorStop(0, 'rgba(0,0,0,1)'); m.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = m; c.fillRect(0, 0, 128, 128);
  }
  return new THREE.CanvasTexture(cv);
}

interface P { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; size: number; grow: number; r: number; g: number; b: number; a: number; grav: number; drag: number; rot: number; spin: number }

export class Particles {
  readonly points: THREE.Points;
  private ps: P[] = [];
  private pos: Float32Array; private col: Float32Array; private size: Float32Array; private alpha: Float32Array; private rot: Float32Array;
  private geo = new THREE.BufferGeometry();
  private next = 0;
  readonly mat: THREE.ShaderMaterial;
  constructor(private max: number, additive: boolean) {
    this.pos = new Float32Array(max * 3).fill(0);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.rot = new Float32Array(max);
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.geo.setAttribute('aRot', new THREE.BufferAttribute(this.rot, 1).setUsage(THREE.DynamicDrawUsage));
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 400 }, uTex: { value: dotTexture(additive) } },
      vertexShader: PV, fragmentShader: PF_SOFT, transparent: true, depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: !additive,
    });
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 5 : 4;
    for (let i = 0; i < max; i++) this.ps.push({ x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, size: 1, grow: 0, r: 1, g: 1, b: 1, a: 1, grav: 0, drag: 0, rot: 0, spin: 0 });
  }
  emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, color: THREE.Color, o: { a?: number; grav?: number; drag?: number; grow?: number; spin?: number } = {}) {
    const p = this.ps[this.next];
    this.next = (this.next + 1) % this.max;
    Object.assign(p, { x, y, z, vx, vy, vz, life, max: life, size, grow: o.grow ?? 0, r: color.r, g: color.g, b: color.b, a: o.a ?? 1, grav: o.grav ?? 0, drag: o.drag ?? 0, rot: Math.random() * 6.28, spin: o.spin ?? (Math.random() - 0.5) * 2 });
  }
  update(dt: number) {
    for (let i = 0; i < this.max; i++) {
      const p = this.ps[i];
      if (p.life <= 0) { this.alpha[i] = 0; this.size[i] = 0; continue; }
      p.life -= dt;
      const k = Math.max(0, p.life / p.max);
      const dr = Math.exp(-p.drag * dt);
      p.vx *= dr; p.vy = p.vy * dr - p.grav * dt; p.vz *= dr;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.col[i * 3] = p.r; this.col[i * 3 + 1] = p.g; this.col[i * 3 + 2] = p.b;
      this.size[i] = p.size * (1 + p.grow * (1 - k));
      this.alpha[i] = p.a * Math.min(1, k * 2.2);
      p.rot += p.spin * dt;
      this.rot[i] = p.rot;
    }
    for (const n of ['position', 'aColor', 'aSize', 'aAlpha', 'aRot']) (this.geo.getAttribute(n) as THREE.BufferAttribute).needsUpdate = true;
  }
  clear() { for (const p of this.ps) p.life = 0; }
  dispose() { this.geo.dispose(); this.mat.dispose(); (this.mat.uniforms.uTex.value as THREE.Texture).dispose(); }
}

/** Skid marks: quads laid on the road behind the rear tyres while drifting (a ring buffer). */
export class Skids {
  readonly mesh: THREE.Mesh;
  private pos: Float32Array;
  private seg = 0;
  private last: (THREE.Vector3 | null)[];
  constructor(private max = 900, trails = 2) {
    this.last = Array.from({ length: trails }, () => null);
    this.pos = new Float32Array(max * 18);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ color: 0x15161a, transparent: true, opacity: 0.42, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -4 }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 2;
  }
  /** Add a point for tyre i (null = lift the "pen"). */
  mark(i: number, p: THREE.Vector3 | null) {
    if (!p) { this.last[i] = null; return; }
    const l = this.last[i];
    if (!l) { this.last[i] = p.clone(); return; }
    const dx = p.x - l.x, dz = p.z - l.z, d = Math.hypot(dx, dz);
    if (d < 0.35) return;
    if (d > 3) { l.copy(p); return; }
    const nx = (-dz / d) * 0.13, nz = (dx / d) * 0.13;
    const o = this.seg * 18;
    const v = [l.x - nx, l.y, l.z - nz, l.x + nx, l.y, l.z + nz, p.x + nx, p.y, p.z + nz, l.x - nx, l.y, l.z - nz, p.x + nx, p.y, p.z + nz, p.x - nx, p.y, p.z - nz];
    this.pos.set(v, o);
    this.seg = (this.seg + 1) % this.max;
    l.copy(p);
    const attr = this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute;
    attr.needsUpdate = true;
  }
  clear() { this.pos.fill(0); (this.mesh.geometry.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true; this.last.fill(null); }
  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}

/** Two turbo flames (cones with a hot core) that sit on the exhaust tips. */
export class Flames {
  readonly group = new THREE.Group();
  private cones: THREE.Mesh[] = [];
  private mats: THREE.MeshBasicMaterial[] = [];
  private cores: THREE.Mesh[] = [];
  level = 0;
  color = new THREE.Color(1, 0.5, 0.1);
  constructor() {
    const geo = new THREE.ConeGeometry(0.1, 0.7, 12, 1, true);
    geo.translate(0, 0.35, 0);
    geo.rotateX(-Math.PI / 2); // tip points back (−z)
    const core = new THREE.ConeGeometry(0.055, 0.4, 10, 1, true);
    core.translate(0, 0.2, 0);
    core.rotateX(-Math.PI / 2);
    for (let i = 0; i < 2; i++) {
      const m = new THREE.MeshBasicMaterial({ color: this.color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });
      const c = new THREE.Mesh(geo, m);
      const k = new THREE.Mesh(core, new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 2.0, 1.6), transparent: true, opacity: 0.95, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false, side: THREE.DoubleSide }));
      c.add(k);
      this.group.add(c);
      this.cones.push(c); this.mats.push(m); this.cores.push(k);
    }
    this.group.visible = false;
  }
  /** Place the flames at the exhaust tips, pointing back along the kart. */
  update(tips: THREE.Vector3[], q: THREE.Quaternion, t: number) {
    const on = this.level > 0.02;
    this.group.visible = on;
    if (!on) return;
    for (let i = 0; i < 2; i++) {
      const c = this.cones[i];
      c.position.copy(tips[i]);
      c.quaternion.copy(q);
      const f = 0.75 + Math.sin(t * 60 + i * 2) * 0.15 + Math.random() * 0.15;
      c.scale.set(this.level * (0.9 + f * 0.3), this.level * (0.9 + f * 0.3), this.level * f * 1.3);
      this.mats[i].color.copy(this.color).multiplyScalar(1.6);
    }
  }
  dispose() { this.cones.forEach((c) => c.geometry.dispose()); this.cores[0]?.geometry.dispose(); this.mats.forEach((m) => m.dispose()); }
}

/** Speed lines over the screen (a quad glued to the camera). */
export class SpeedLines {
  readonly mesh: THREE.Mesh;
  readonly mat: THREE.ShaderMaterial;
  constructor() {
    this.mat = new THREE.ShaderMaterial({
      uniforms: { uTime: { value: 0 }, uK: { value: 0 }, uAspect: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }',
      fragmentShader: `uniform float uTime, uK, uAspect; varying vec2 vUv;
        float h(float n){ return fract(sin(n) * 43758.5453); }
        void main(){
          vec2 p = (vUv - vec2(0.5, 0.46)) * vec2(uAspect, 1.0);
          float a = atan(p.y, p.x), r = length(p);
          float L = 150.0, f = a * L / 6.2831;
          float id = floor(f), lane = h(id);
          float t = fract(uTime * (1.1 + lane * 1.6) + lane * 7.0) * 1.3;
          float seg = smoothstep(t - 0.22, t, r) * (1.0 - smoothstep(t, t + 0.015, r));
          float thin = 1.0 - smoothstep(0.08, 0.32, abs(fract(f) - 0.5));
          float mask = smoothstep(0.5, 0.95, r) * step(0.72, lane);
          float al = seg * thin * mask * uK * 0.24;
          gl_FragColor = vec4(1.0, 1.0, 1.0, al);
        }`,
      transparent: true, depthTest: false, depthWrite: false,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), this.mat);
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 999;
  }
  dispose() { this.mesh.geometry.dispose(); this.mat.dispose(); }
}

/** Comic words that pop over an impact (POW!, SPLAT!…): drawn once per word. */
const wordCache = new Map<string, THREE.CanvasTexture>();
function wordTexture(text: string, fill: string) {
  const key = text + fill;
  let t = wordCache.get(key);
  if (t) return t;
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 256;
  const c = cv.getContext('2d')!;
  // a jagged burst behind the word
  c.translate(256, 128);
  c.beginPath();
  for (let i = 0; i < 28; i++) { const a = (i / 28) * Math.PI * 2, r = i % 2 ? 92 : 124 + (i % 4) * 6; c.lineTo(Math.cos(a) * r * 1.9, Math.sin(a) * r * 0.95); }
  c.closePath();
  c.fillStyle = '#ffffff'; c.fill();
  c.lineWidth = 12; c.strokeStyle = '#10204a'; c.stroke();
  c.rotate(-0.08);
  c.font = '900 120px Inter, system-ui, sans-serif';
  c.textAlign = 'center'; c.textBaseline = 'middle';
  c.lineJoin = 'round'; c.lineWidth = 22; c.strokeStyle = '#10204a'; c.strokeText(text, 0, 8);
  c.fillStyle = fill; c.fillText(text, 0, 8);
  t = new THREE.CanvasTexture(cv);
  t.colorSpace = THREE.SRGBColorSpace;
  wordCache.set(key, t);
  return t;
}

interface Flash { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; dur: number; r: number }
interface Wave { m: THREE.Mesh; mat: THREE.MeshBasicMaterial; t: number; dur: number; r: number }
interface Word { s: THREE.Sprite; mat: THREE.SpriteMaterial; t: number; dur: number; size: number; y0: number }
interface Shard { x: number; y: number; z: number; vx: number; vy: number; vz: number; rx: number; ry: number; wx: number; wy: number; life: number; sc: number }

/** Big hits: a flash of light, a shock ring rolling over the ground, shreds of paper (or pages,
    or ink) flying and tumbling, and a comic word popping out. */
export class Blasts {
  readonly group = new THREE.Group();
  private flashes: Flash[] = [];
  private waves: Wave[] = [];
  private words: Word[] = [];
  private shards: Shard[] = [];
  private shardMesh: THREE.InstancedMesh;
  private nextShard = 0;
  private sphere = new THREE.SphereGeometry(1, 20, 14);
  private ring = new THREE.RingGeometry(0.78, 1, 64).rotateX(-Math.PI / 2);
  private o = new THREE.Object3D();
  private col = new THREE.Color();
  constructor(private maxShards = 260) {
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false });
      const m = new THREE.Mesh(this.sphere, mat); m.visible = false; m.renderOrder = 6;
      this.flashes.push({ m, mat, t: 1, dur: 1, r: 1 }); this.group.add(m);
    }
    for (let i = 0; i < 10; i++) {
      const mat = new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -4 });
      const m = new THREE.Mesh(this.ring, mat); m.visible = false; m.renderOrder = 6;
      this.waves.push({ m, mat, t: 1, dur: 1, r: 1 }); this.group.add(m);
    }
    for (let i = 0; i < 6; i++) {
      const mat = new THREE.SpriteMaterial({ transparent: true, depthTest: false, depthWrite: false, toneMapped: false });
      const s = new THREE.Sprite(mat); s.visible = false; s.renderOrder = 9;
      this.words.push({ s, mat, t: 1, dur: 1, size: 1, y0: 0 }); this.group.add(s);
    }
    this.shardMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.42, 0.3), new THREE.MeshStandardMaterial({ roughness: 0.7, side: THREE.DoubleSide }), maxShards);
    this.shardMesh.frustumCulled = false;
    this.shardMesh.castShadow = true;
    for (let i = 0; i < maxShards; i++) { this.shards.push({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, wx: 0, wy: 0, life: 0, sc: 1 }); this.shardMesh.setColorAt(i, this.col.set(0xffffff)); }
    this.group.add(this.shardMesh);
  }
  private pick<T extends { t: number; dur: number }>(a: T[]) { let best = a[0]; for (const x of a) if (x.t / x.dur > best.t / best.dur) best = x; return best; }
  /** A ball of light that swells and fades. */
  flash(p: THREE.Vector3, r: number, color: THREE.ColorRepresentation, dur = 0.32) {
    const f = this.pick(this.flashes);
    f.t = 0; f.dur = dur; f.r = r; f.mat.color.set(color); f.m.position.copy(p); f.m.visible = true;
  }
  /** A ring rolling out over the ground (or tilted to `up`). */
  wave(p: THREE.Vector3, r: number, color: THREE.ColorRepresentation, dur = 0.55, up?: THREE.Vector3) {
    const w = this.pick(this.waves);
    w.t = 0; w.dur = dur; w.r = r; w.mat.color.set(color); w.m.position.copy(p); w.m.visible = true;
    if (up) w.m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up); else w.m.quaternion.identity();
  }
  /** Shreds flying out from p (colours picked at random from the list). */
  shreds(p: THREE.Vector3, n: number, colors: THREE.ColorRepresentation[], speed = 9, up = 7, size = 1) {
    for (let k = 0; k < n; k++) {
      const i = this.nextShard; this.nextShard = (this.nextShard + 1) % this.maxShards;
      const s = this.shards[i], a = Math.random() * Math.PI * 2, v = speed * (0.35 + Math.random() * 0.65);
      Object.assign(s, { x: p.x, y: p.y, z: p.z, vx: Math.cos(a) * v, vy: up * (0.5 + Math.random()), vz: Math.sin(a) * v, rx: Math.random() * 6, ry: Math.random() * 6, wx: (Math.random() - 0.5) * 22, wy: (Math.random() - 0.5) * 22, life: 1.1 + Math.random() * 0.9, sc: size * (0.6 + Math.random() * 0.8) });
      this.shardMesh.setColorAt(i, this.col.set(colors[k % colors.length]));
    }
    if (this.shardMesh.instanceColor) this.shardMesh.instanceColor.needsUpdate = true;
  }
  /** A comic word over p. */
  word(p: THREE.Vector3, text: string, fill: string, size = 3.2, dur = 0.9) {
    const w = this.pick(this.words);
    w.t = 0; w.dur = dur; w.size = size; w.y0 = p.y;
    w.mat.map = wordTexture(text, fill); w.mat.needsUpdate = true;
    w.s.position.copy(p); w.s.visible = true;
  }
  update(dt: number) {
    for (const f of this.flashes) {
      if (!f.m.visible) continue;
      f.t += dt; const k = f.t / f.dur;
      if (k >= 1) { f.m.visible = false; continue; }
      f.m.scale.setScalar(f.r * (0.35 + 0.65 * (1 - Math.pow(1 - k, 3))));
      f.mat.opacity = Math.pow(1 - k, 1.6);
    }
    for (const w of this.waves) {
      if (!w.m.visible) continue;
      w.t += dt; const k = w.t / w.dur;
      if (k >= 1) { w.m.visible = false; continue; }
      w.m.scale.setScalar(0.5 + w.r * (1 - Math.pow(1 - k, 2.4)));
      w.mat.opacity = 0.95 * (1 - k);
    }
    for (const w of this.words) {
      if (!w.s.visible) continue;
      w.t += dt; const k = w.t / w.dur;
      if (k >= 1) { w.s.visible = false; continue; }
      // pop in with an overshoot, hang, then fade while rising
      const pop = k < 0.18 ? Math.sin((k / 0.18) * Math.PI * 0.5) * 1.25 : 1.25 - Math.min(0.25, (k - 0.18) * 1.6);
      w.s.scale.set(w.size * pop, w.size * pop * 0.5, 1);
      w.s.position.y = w.y0 + k * 1.6;
      w.mat.opacity = k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3;
      w.mat.rotation = Math.sin(k * 20) * 0.06 * (1 - k);
    }
    const o = this.o;
    for (let i = 0; i < this.maxShards; i++) {
      const s = this.shards[i];
      if (s.life <= 0) { if (s.y > -900) { s.y = -999; o.position.set(0, -999, 0); o.scale.setScalar(0.0001); o.updateMatrix(); this.shardMesh.setMatrixAt(i, o.matrix); } continue; }
      s.life -= dt;
      const dr = Math.exp(-2.2 * dt);
      s.vx *= dr; s.vz *= dr; s.vy = s.vy * dr - 13 * dt;
      // paper flutters: falling slowly once it has lost its push
      if (s.vy < -3.5) s.vy = -3.5;
      s.x += s.vx * dt; s.y += s.vy * dt; s.z += s.vz * dt;
      s.rx += s.wx * dt; s.ry += s.wy * dt;
      o.position.set(s.x, s.y, s.z); o.rotation.set(s.rx, s.ry, 0); o.scale.setScalar(s.sc * Math.min(1, s.life * 3));
      o.updateMatrix(); this.shardMesh.setMatrixAt(i, o.matrix);
    }
    this.shardMesh.instanceMatrix.needsUpdate = true;
  }
  clear() { for (const f of this.flashes) f.m.visible = false; for (const w of this.waves) w.m.visible = false; for (const w of this.words) w.s.visible = false; for (const s of this.shards) s.life = 0; }
  dispose() {
    this.sphere.dispose(); this.ring.dispose(); this.shardMesh.geometry.dispose(); (this.shardMesh.material as THREE.Material).dispose();
    for (const f of this.flashes) f.mat.dispose(); for (const w of this.waves) w.mat.dispose(); for (const w of this.words) w.mat.dispose();
  }
}

/** Wind: thin glowing ribbons streaming off the rear wing tips at speed (each kart has two). */
export class Ribbons {
  readonly mesh: THREE.Mesh;
  private pts: THREE.Vector3[][];
  private n: number[];
  private pos: Float32Array; private col: Float32Array;
  private a = new THREE.Vector3(); private b = new THREE.Vector3(); private sd = new THREE.Vector3();
  constructor(private trails = 20, private len = 22, private width = 0.07) {
    this.pts = Array.from({ length: trails }, () => Array.from({ length: len }, () => new THREE.Vector3()));
    this.n = new Array(trails).fill(0);
    const nv = trails * len * 2;
    this.pos = new Float32Array(nv * 3); this.col = new Float32Array(nv * 3);
    const idx: number[] = [];
    for (let t = 0; t < trails; t++) for (let j = 0; j < len - 1; j++) { const q = (t * len + j) * 2; idx.push(q, q + 2, q + 1, q + 1, q + 2, q + 3); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setIndex(idx);
    this.mesh = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide, toneMapped: false }));
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 5;
  }
  /** Add the newest point of trail i (null fades it out). */
  push(i: number, p: THREE.Vector3 | null) {
    if (i >= this.trails) return;
    if (!p) { this.n[i] = Math.max(0, this.n[i] - 2); return; }
    const P = this.pts[i];
    const last = P.pop()!; last.copy(p); P.unshift(last);
    this.n[i] = Math.min(this.len, this.n[i] + 1);
  }
  update(cam: THREE.Vector3, strength: number[], color: THREE.Color) {
    const pos = this.pos, col = this.col;
    for (let t = 0; t < this.trails; t++) {
      const P = this.pts[t], n = this.n[t], k = strength[t >> 1] ?? 0;
      for (let j = 0; j < this.len; j++) {
        const v = (t * this.len + j) * 6;
        if (j >= n || n < 3) { for (let q = 0; q < 6; q++) col[v + q] = 0; pos[v] = pos[v + 3] = P[0].x; pos[v + 1] = pos[v + 4] = P[0].y; pos[v + 2] = pos[v + 5] = P[0].z; continue; }
        const p = P[j], a = P[Math.max(0, j - 1)], b = P[Math.min(n - 1, j + 1)];
        this.a.subVectors(a, b); this.b.subVectors(cam, p);
        this.sd.crossVectors(this.a, this.b).normalize().multiplyScalar(this.width * (1 - j / n * 0.6));
        pos[v] = p.x + this.sd.x; pos[v + 1] = p.y + this.sd.y; pos[v + 2] = p.z + this.sd.z;
        pos[v + 3] = p.x - this.sd.x; pos[v + 4] = p.y - this.sd.y; pos[v + 5] = p.z - this.sd.z;
        const f = k * Math.sin(Math.PI * Math.min(1, (j + 0.5) / n)) * (j === 0 ? 0 : 1);
        for (const o of [0, 3]) { col[v + o] = color.r * f; col[v + o + 1] = color.g * f; col[v + o + 2] = color.b * f; }
      }
    }
    const g = this.mesh.geometry;
    (g.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (g.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }
  clear() { this.n.fill(0); }
  dispose() { this.mesh.geometry.dispose(); (this.mesh.material as THREE.Material).dispose(); }
}
