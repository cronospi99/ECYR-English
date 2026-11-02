/* Class Wars — the teachers as animated 3D models (.glb, built by scripts/build-toons.mts).

   One small WebGL canvas works as an atlas: each visible character is posed (its own
   AnimationMixer: idle, walk, jump, fall, hit), rendered with toon shading and an ink outline into
   its own cell, and the 2D renderer draws that cell where the character stands — so the 3D models
   sit between the platforms, labels and effects like any sprite. All cells are rendered together
   at the end of a frame and drawn in the next one (one GPU→canvas copy per frame, not one per
   character); a one-frame-old pose is not visible. If rendering costs too much on a device, 3D
   switches itself off for the session.

   three.js is loaded on demand (only when a match starts). Anything that fails — no WebGL, a lost
   context, a model that does not load, no room left in the atlas — returns null, and the caller
   keeps drawing the 2D character instead, so the game never breaks. */
import type * as THREE from 'three';
import type { GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { TEACHERS } from '@/features/cards/teachers';

type Three = typeof import('three');
type Clip = 'idle' | 'walk' | 'jump' | 'fall' | 'hit';

/** Model space drawn in each cell (feet at 0): width −0.95…0.95, height −0.12…2.38. */
export const CELL_BOX = { x0: -0.95, x1: 0.95, y0: -0.12, y1: 2.38 } as const;
const BW = CELL_BOX.x1 - CELL_BOX.x0, BH = CELL_BOX.y1 - CELL_BOX.y0;

export interface ToonState { alive: boolean; air: boolean; vy: number; moving: boolean; speed: number; hurt: boolean; face: number }
export interface ToonCell { c: HTMLCanvasElement; sx: number; sy: number; sw: number; sh: number; ci: number }
interface Job { idx: number; ci: number; st: ToonState; ppu: number }

interface Inst { ci: number; root: THREE.Object3D; mixer: THREE.AnimationMixer; actions: Map<Clip, THREE.AnimationAction>; cur: Clip | null; yaw: number; last: number }

export class Toon3D {
  private T: Three;
  private renderer: THREE.WebGLRenderer;
  private effect: { render: (s: THREE.Scene, c: THREE.Camera) => void };
  private scene: THREE.Scene;
  private camera: THREE.OrthographicCamera;
  private loader: { loadAsync: (url: string) => Promise<GLTF> };
  private models = new Map<number, GLTF | 'loading' | 'failed'>();
  private inst = new Map<number, Inst>();
  private toonMat: THREE.MeshToonMaterial;
  readonly canvas: HTMLCanvasElement;
  private size: number;
  private penX = 0; private penY = 0; private rowH = 0;
  private lost = false;
  private jobs: Job[] = [];
  private cells = new Map<number, ToonCell>();
  private cost: number[] = [];
  /** Keep 3D on even when slow (?toons=3d, for testing). */
  force = false;
  /** Off for good (no context, or too slow on this device). */
  get off() { return this.lost; }

  /** Loads three.js and sets up the atlas; null when 3D is not possible here. */
  static async create(force = false): Promise<Toon3D | null> {
    try {
      const [T, { GLTFLoader }, { OutlineEffect }] = await Promise.all([
        import('three'),
        import('three/addons/loaders/GLTFLoader.js'),
        import('three/addons/effects/OutlineEffect.js'),
      ]);
      const canvas = document.createElement('canvas');
      const probe = canvas.getContext('webgl2', { alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
      if (!probe) return null;
      const t = new Toon3D(T, canvas, new GLTFLoader(), OutlineEffect);
      t.force = force;
      return t;
    } catch {
      return null;
    }
  }

  private constructor(T: Three, canvas: HTMLCanvasElement, loader: Toon3D['loader'], Outline: new (r: THREE.WebGLRenderer, p: object) => Toon3D['effect']) {
    this.T = T;
    this.canvas = canvas;
    this.loader = loader;
    const small = Math.min(screen.width, screen.height) < 600;
    this.size = small ? 1024 : 2048;
    canvas.width = canvas.height = this.size;
    const r = new T.WebGLRenderer({ canvas, alpha: true, antialias: true, premultipliedAlpha: true, preserveDrawingBuffer: true, powerPreference: 'high-performance' });
    r.setPixelRatio(1);
    r.setSize(this.size, this.size, false);
    r.autoClear = false;
    r.setClearColor(0x000000, 0);
    r.setScissorTest(true);
    this.renderer = r;
    this.effect = new Outline(r, { defaultThickness: 0.008, defaultColor: [0.11, 0.16, 0.12], defaultAlpha: 1 });
    canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.lost = true; });

    this.scene = new T.Scene();
    this.scene.add(new T.HemisphereLight(0xffffff, 0x7480b8, 1.5));
    const sun = new T.DirectionalLight(0xffffff, 2.1);
    sun.position.set(1.6, 3, 4);
    this.scene.add(sun);
    this.camera = new T.OrthographicCamera(CELL_BOX.x0, CELL_BOX.x1, CELL_BOX.y1, CELL_BOX.y0, 0.1, 30);
    this.camera.position.set(0, 0, 10);

    // three-step toon ramp shared by every model
    const ramp = new T.DataTexture(new Uint8Array([90, 90, 90, 255, 175, 175, 175, 255, 235, 235, 235, 255, 255, 255, 255, 255]), 4, 1);
    ramp.minFilter = ramp.magFilter = T.NearestFilter;
    ramp.needsUpdate = true;
    this.toonMat = new T.MeshToonMaterial({ vertexColors: true, gradientMap: ramp });
  }

  /** True once the character's model is loaded (starts loading it the first time). */
  ready(ci: number): boolean {
    const m = this.models.get(ci);
    if (m === undefined) this.load(ci);
    return !!m && m !== 'loading' && m !== 'failed';
  }

  private load(ci: number) {
    const id = TEACHERS[ci]?.id;
    if (!id) { this.models.set(ci, 'failed'); return; }
    this.models.set(ci, 'loading');
    this.loader.loadAsync(`${import.meta.env.BASE_URL}classwars/toons/${id}.glb`).then((g) => {
      g.scene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.material = this.toonMat; m.frustumCulled = false; } });
      this.models.set(ci, g);
    }, () => this.models.set(ci, 'failed'));
  }

  /**
   * Ask for a character this frame (ppu = atlas pixels per model unit, i.e. screen resolution).
   * Returns its cell rendered at the end of the previous frame, or null (draw it in 2D).
   */
  get(idx: number, ci: number, st: ToonState, ppu: number): ToonCell | null {
    if (this.lost || !this.ready(ci)) return null;
    this.jobs.push({ idx, ci, st: { ...st }, ppu });
    const c = this.cells.get(idx);
    return c && c.ci === ci ? c : null;
  }

  /** Render every character asked for this frame into the atlas (call at the end of the frame). */
  flush(now: number) {
    if (this.lost) return;
    const t0 = performance.now();
    this.penX = this.penY = this.rowH = 0;
    const cells = new Map<number, ToonCell>();
    for (const j of this.jobs) {
      const c = this.render(j.idx, j.ci, j.st, now, j.ppu);
      if (c) cells.set(j.idx, c);
      if (this.lost) break;
    }
    this.jobs = [];
    this.cells = cells;
    for (const [k, v] of this.inst) if (now - v.last > 8000) { v.mixer.stopAllAction(); this.inst.delete(k); }
    // too slow here (weak GPU or software rendering)? fall back to the 2D characters
    if (cells.size) {
      this.cost.push(performance.now() - t0);
      if (this.cost.length > 40) this.cost.shift();
      if (this.cost.length >= 30) {
        const avg = this.cost.reduce((a, b) => a + b, 0) / this.cost.length;
        if (avg > 12 && !this.force) { this.lost = true; this.cells.clear(); }
      }
    }
  }

  private render(idx: number, ci: number, st: ToonState, now: number, ppu: number): ToonCell | null {
    const gltf = this.models.get(ci) as GLTF;
    let it = this.inst.get(idx);
    if (!it || it.ci !== ci) {
      const root = gltf.scene.clone(true);
      const mixer = new this.T.AnimationMixer(root);
      const actions = new Map<Clip, THREE.AnimationAction>();
      for (const c of gltf.animations) {
        const a = mixer.clipAction(c);
        if (c.name === 'jump' || c.name === 'hit') { a.setLoop(this.T.LoopOnce, 1); a.clampWhenFinished = true; }
        actions.set(c.name as Clip, a);
      }
      it = { ci, root, mixer, actions, cur: null, yaw: st.face * 0.8, last: now };
      this.inst.set(idx, it);
    }
    const dt = Math.min(0.1, Math.max(0, (now - it.last) / 1000));
    it.last = now;

    // animation state
    const want: Clip = !st.alive ? 'fall' : st.hurt ? 'hit' : st.air ? (st.vy < -60 ? 'jump' : 'fall') : st.moving ? 'walk' : 'idle';
    if (want !== it.cur) {
      const next = it.actions.get(want);
      if (next) {
        const prev = it.cur ? it.actions.get(it.cur) : null;
        next.reset().setEffectiveWeight(1).play();
        if (prev && prev !== next) next.crossFadeFrom(prev, want === 'hit' ? 0.06 : 0.14, false);
        it.cur = want;
      }
    }
    const walk = it.actions.get('walk');
    if (walk) walk.timeScale = Math.max(0.6, Math.min(1.7, st.speed / 230));
    it.mixer.update(dt);
    // turn to face the aim (three-quarter view), smoothly
    it.yaw += (st.face * 0.8 - it.yaw) * Math.min(1, dt * 12);
    it.root.rotation.y = it.yaw;

    // a cell in the atlas
    const cw = Math.round(BW * ppu), ch = Math.round(BH * ppu);
    if (this.penX + cw > this.size) { this.penX = 0; this.penY += this.rowH; this.rowH = 0; }
    if (this.penY + ch > this.size) return null;
    const x = this.penX, y = this.penY;
    this.penX += cw + 2; this.rowH = Math.max(this.rowH, ch + 2);

    const r = this.renderer, gy = this.size - y - ch; // GL origin is bottom-left
    r.setViewport(x, gy, cw, ch);
    r.setScissor(x, gy, cw, ch);
    r.clear(true, true, false);
    this.scene.add(it.root);
    try { this.effect.render(this.scene, this.camera); } catch { this.lost = true; }
    this.scene.remove(it.root);
    return this.lost ? null : { c: this.canvas, sx: x, sy: y, sw: cw, sh: ch, ci };
  }

  dispose() {
    this.inst.clear();
    this.models.clear();
    this.toonMat.gradientMap?.dispose();
    this.toonMat.dispose();
    this.renderer.dispose();
    this.renderer.forceContextLoss();
    this.lost = true;
  }
}
