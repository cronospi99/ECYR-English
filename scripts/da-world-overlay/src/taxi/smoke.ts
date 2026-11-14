/**
 * Taxi Rush — tyre smoke and sparks. One point cloud, recycled: smoke puffs
 * swell, rise and fade behind the rear wheels while the taxi drifts or spins
 * its tyres; sparks are hot (brighter than white, so they bloom), fall and die
 * fast when it scrapes something.
 */
import * as THREE from 'three';

const MAX = 220;

export class Smoke {
  readonly points: THREE.Points;
  private pos = new Float32Array(MAX * 3);
  private vel = new Float32Array(MAX * 3);
  private col = new Float32Array(MAX * 3);
  private size = new Float32Array(MAX);
  private alpha = new Float32Array(MAX);
  private life = new Float32Array(MAX);
  private maxLife = new Float32Array(MAX);
  private grow = new Float32Array(MAX);
  private spark = new Uint8Array(MAX);
  private next = 0;

  constructor() {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('color', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('size', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('alpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const m = new THREE.ShaderMaterial({
      transparent: true,
      depthWrite: false,
      uniforms: { uScale: { value: 600 } },
      vertexShader: /* glsl */ `
        attribute float size; attribute float alpha; attribute vec3 color;
        uniform float uScale;
        varying float vA; varying vec3 vC;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_Position = projectionMatrix * mv;
          gl_PointSize = size * uScale / max(0.1, -mv.z);
          vA = alpha; vC = color;
        }`,
      fragmentShader: /* glsl */ `
        varying float vA; varying vec3 vC;
        void main() {
          vec2 d = gl_PointCoord - 0.5;
          float r = length(d) * 2.0;
          float a = smoothstep(1.0, 0.2, r) * vA;
          if (a < 0.01) discard;
          gl_FragColor = vec4(vC, a);
        }`,
    });
    this.points = new THREE.Points(g, m);
    this.points.frustumCulled = false;
    this.points.renderOrder = 5;
  }

  setViewportHeight(h: number): void {
    (this.points.material as THREE.ShaderMaterial).uniforms.uScale.value = h * 0.9;
  }

  private emit(x: number, y: number, z: number, vx: number, vy: number, vz: number, life: number, size: number, grow: number, c: [number, number, number], spark: boolean): void {
    const i = this.next;
    this.next = (this.next + 1) % MAX;
    this.pos.set([x, y, z], i * 3);
    this.vel.set([vx, vy, vz], i * 3);
    this.col.set(c, i * 3);
    this.size[i] = size;
    this.grow[i] = grow;
    this.life[i] = life;
    this.maxLife[i] = life;
    this.spark[i] = spark ? 1 : 0;
  }

  /** Smoke from both rear wheels of a car at (x, z) facing `yaw`. */
  puff(x: number, z: number, yaw: number, amount: number): void {
    const fx = Math.sin(yaw), fz = Math.cos(yaw), rx = fz, rz = -fx;
    for (const side of [-1, 1]) {
      if (Math.random() > amount) continue;
      const wx = x - fx * 1.0 + rx * side * 0.62, wz = z - fz * 1.0 + rz * side * 0.62;
      const g = 0.82 + Math.random() * 0.1;
      this.emit(wx, 0.25, wz, (Math.random() - 0.5) * 0.8 - fx * 0.6, 0.5 + Math.random() * 0.5, (Math.random() - 0.5) * 0.8 - fz * 0.6, 1.0 + Math.random() * 0.7, 0.4, 1.25, [g, g, g * 1.02], false);
    }
  }

  /** A shower of sparks where the car scraped something. */
  sparks(x: number, z: number, n = 14): void {
    for (let k = 0; k < n; k++) {
      const a = Math.random() * Math.PI * 2, s = 3 + Math.random() * 5;
      this.emit(x, 0.5, z, Math.cos(a) * s, 2 + Math.random() * 3, Math.sin(a) * s, 0.35 + Math.random() * 0.3, 0.09, 0, [4.0, 2.2, 0.6], true);
    }
  }

  update(dt: number): void {
    for (let i = 0; i < MAX; i++) {
      if (this.life[i] <= 0) { this.alpha[i] = 0; continue; }
      this.life[i] -= dt;
      const t = 1 - this.life[i] / this.maxLife[i];
      const o = i * 3;
      if (this.spark[i]) {
        this.vel[o + 1] -= 14 * dt;
        this.alpha[i] = 1 - t;
      } else {
        this.vel[o] *= 1 - dt * 1.5; this.vel[o + 2] *= 1 - dt * 1.5; this.vel[o + 1] *= 1 - dt * 0.6;
        this.size[i] += this.grow[i] * dt;
        this.alpha[i] = Math.min(1, t * 6) * (1 - t) * (1 - t) * 0.6;
      }
      this.pos[o] += this.vel[o] * dt; this.pos[o + 1] += this.vel[o + 1] * dt; this.pos[o + 2] += this.vel[o + 2] * dt;
      if (this.pos[o + 1] < 0.05) { this.pos[o + 1] = 0.05; this.vel[o + 1] *= -0.3; }
    }
    const g = this.points.geometry;
    for (const n of ['position', 'color', 'size', 'alpha']) (g.getAttribute(n) as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.points.geometry.dispose();
    (this.points.material as THREE.Material).dispose();
  }
}
