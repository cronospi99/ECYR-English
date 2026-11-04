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
