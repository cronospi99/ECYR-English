/* English Run — the game: an endless 3-lane street. Swipe or use the arrow keys to change lane,
   jump over low barriers, slide under high ones, dodge buses (or run up a ramp onto their roofs),
   collect coins and power-ups, and run under the gate with the right answer to raise the multiplier.

   The world moves, the runner stays at the origin: every object has a track position z (metres
   from the start) and is drawn at −(z − pz), so numbers stay small however long the run lasts.
   Track pieces are hand-made patterns placed in sequence, each one always passable. */
import * as THREE from 'three';
import { ToonActor, isLens, type ToonClip } from '@/features/toons3d/runtime';
import { t } from '@/lib/gameLang';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeOcean, oceanGeometry, type Ocean } from './ocean';
import { Life } from './life';
import { BUS, CHUNK, CURVE, LANE, MAT, POWER_COLORS, RAMP_L, cloud, coinGeo, curveShader, curved, gateMesh, paintBoard, powerToken, skyDome, softDot, type GateMesh, type PowerKind } from './gfx';
import { THEMES, TILE, type Parts, type Theme, type ThemeId } from './themes';
import { say, setMusicIntensity, sfx, startMusic, stopMusic } from './audio';
import { makeQuestion, type RunLevel, type RunQ } from './questions';

export type RunState = 'loading' | 'menu' | 'intro' | 'run' | 'paused' | 'dead' | 'revive' | 'over';
export interface Answer { q: string; a: string; chosen: string; ok: boolean }
export interface Hud {
  state: RunState; score: number; coins: number; mult: number; dist: number; speed: number;
  powers: { kind: PowerKind; left: number; total: number }[];
  gate: { q: string; opts: string[]; dist: number; lane: number } | null;
  revive: { q: string; opts: string[]; endsAt: number } | null;
  best: number; newBest: boolean; answers: Answer[]; revivesLeft: number; chasing: boolean;
}
export interface Toast { id: number; text: string; tone: 'good' | 'bad' | 'info' }

type ObKind = 'low' | 'high' | 'bus' | 'ramp';
interface Ob { k: ObKind; lane: number; z: number; len: number; vz: number; mesh: THREE.Object3D; dead: boolean; honked?: boolean }
interface Coin { x: number; y: number; z: number; mag: boolean }
interface Power { kind: PowerKind; x: number; y: number; z: number; mesh: THREE.Object3D }
interface Gate { z: number; q: RunQ; opts: string[]; correct: number; gm: GateMesh; passed: boolean }
interface Part { x: number; y: number; z: number; vx: number; vy: number; vz: number; life: number; max: number; r: number; g: number; b: number; grav: number }
/** A hole in the floor of one lane, z0 → z1 (track metres, on the tile grid). */
interface Gap { lane: number; z0: number; z1: number; plank?: boolean }

const G = -38;
const JUMP_V = Math.sqrt(2 * -G * 1.45);
const SUPER_V = Math.sqrt(2 * -G * 3.4);
const SLIDE_S = 0.62;
/** The chibi teachers are drawn a bit bigger than life next to the street. */
const TOON_SCALE = 1.3;
const STAND_H = 1.25 * TOON_SCALE, SLIDE_H = 0.68;
const POWER_S: Record<PowerKind, number> = { magnet: 12, double: 15, shield: 25, jump: 12 };
const laneX = (l: number) => (l - 1) * LANE;
const rnd = Math.random;
const shuffle = <T,>(a: T[]) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const store = { get: (k: string, d = 0) => { try { return Number(localStorage.getItem(k) ?? d) || d; } catch { return d; } }, set: (k: string, v: number) => { try { localStorage.setItem(k, String(v)); } catch { /* ignore */ } } };

/** Pool of identical meshes that can be lent and given back. */
class Pool {
  private free: THREE.Object3D[] = [];
  constructor(private make: () => THREE.Object3D, private scene: THREE.Object3D) {}
  get() { const o = this.free.pop() ?? this.make(); o.visible = true; if (!o.parent) this.scene.add(o); return o; }
  put(o: THREE.Object3D) { o.visible = false; this.free.push(o); }
}

export class RunGame {
  readonly renderer: THREE.WebGLRenderer;
  private scene = new THREE.Scene();
  private camera = new THREE.PerspectiveCamera(60, 1, 0.1, 520);
  private sun = new THREE.DirectionalLight(0xfff1d6, 2.3);
  private hemi = new THREE.HemisphereLight(0xd8ecff, 0x8d8266, 1);
  private sky = new THREE.Group();
  private clouds: THREE.Mesh[] = [];
  private chunkParts: Parts[] = [];
  private chunks: { mesh: THREE.Mesh; z: number }[] = [];
  private pools: Record<string, Pool> = {};
  private coinMesh: THREE.InstancedMesh;
  /** Everything that belongs to the current theme (rebuilt when the theme changes). */
  private world = new THREE.Group();
  theme: Theme;
  private floor: THREE.InstancedMesh[] = [];
  private floorGlow: THREE.InstancedMesh[] = [];
  private planks: THREE.InstancedMesh | null = null;
  private water: THREE.Mesh | null = null;
  private ocean: Ocean | null = null;
  private life: Life | null = null;
  private gaps: Gap[] = [];
  private composer: EffectComposer | null = null;
  private bloomOk = true;
  private envTex: THREE.Texture | null = null;
  private gatePool: GateMesh[] = [];
  private parts: Part[] = [];
  private partGeo = new THREE.BufferGeometry();
  private partPos: Float32Array;
  private partCol: Float32Array;
  private bubble: THREE.Mesh;
  private ro: ResizeObserver;
  private raf = 0;
  private last = 0;
  private clock = 0;
  private dpr: number;
  private frames: number[] = [];
  private qualityAt = 0;

  // actors
  player: ToonActor | null = null;
  private chaser: ToonActor | null = null;
  toonId: string;
  level: RunLevel;

  // run state
  state: RunState = 'loading';
  private prevState: RunState = 'menu';
  private pz = 0; private startZ = 0; private speed = 0;
  private lane = 1; private laneFrom = 1; private x = 0; private prevX = 0;
  private y = 0; private vy = 0; private grounded = true; private lastGround = 0; private airT = 0;
  private slideUntil = 0; private pendingSlide = false; private hitUntil = 0;
  private obs: Ob[] = []; private coins: Coin[] = []; private powersOnTrack: Power[] = []; private gates: Gate[] = [];
  private genZ = 0; private nextGate = 0; private nextPower = 0; private blockedLane = -1; private blockedUntil = 0;
  private score = 0; private coinCount = 0; private mult = 1; private answers: Answer[] = [];
  private active: Partial<Record<PowerKind, number>> = {};
  private invUntil = 0; private chaseUntil = 0; private deadAt = 0; private revivesLeft = 2; private revive: Hud['revive'] = null; private reviveQ: RunQ | null = null;
  private introAt = 0; private shake = 0; private recentQ = new Set<string>();
  private cam = { x: 0, y: 3, z: 6, lx: 0, ly: 1, lz: -7 };
  best = store.get('run:best');
  totalCoins = store.get('run:coins');
  private newBest = false;

  // UI hooks
  onHud: ((h: Hud) => void) | null = null;
  onToast: ((t: Toast) => void) | null = null;
  private hudAt = 0;
  private toastId = 0;
  private touch: { x: number; y: number; done: boolean } | null = null;
  private offs: (() => void)[] = [];

  constructor(private host: HTMLElement, opts: { toon: string; level: RunLevel; theme?: ThemeId }) {
    this.toonId = opts.toon;
    this.level = opts.level;
    this.theme = THEMES[opts.theme ?? 'city'];
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    r.setPixelRatio(this.dpr);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.NeutralToneMapping;
    r.domElement.style.touchAction = 'none';
    r.domElement.style.display = 'block';
    host.appendChild(r.domElement);
    this.renderer = r;

    const s = this.scene;
    s.fog = new THREE.Fog(0xffffff, 40, 190);
    s.add(this.hemi);
    this.sun.position.set(7, 14, 3);
    this.sun.target.position.set(0, 0, -8);
    this.sun.castShadow = true;
    const sc = this.sun.shadow;
    sc.mapSize.set(2048, 2048);
    Object.assign(sc.camera, { left: -14, right: 14, top: 22, bottom: -18, near: 1, far: 60 });
    sc.bias = -0.0006; sc.normalBias = 0.03;
    s.add(this.sun, this.sun.target, this.world);
    for (const k of Object.keys(POWER_COLORS) as PowerKind[]) this.pools[k] = new Pool(() => powerToken(k), s);
    this.coinMesh = new THREE.InstancedMesh(coinGeo(), MAT.coin, 320);
    this.coinMesh.castShadow = true;
    this.coinMesh.frustumCulled = false;
    this.coinMesh.count = 0;
    s.add(this.coinMesh);
    this.buildTheme();

    // particles (sparkles, dust, confetti)
    const N = 360;
    this.partPos = new Float32Array(N * 3).fill(-999);
    this.partCol = new Float32Array(N * 3);
    this.partGeo.setAttribute('position', new THREE.BufferAttribute(this.partPos, 3));
    this.partGeo.setAttribute('color', new THREE.BufferAttribute(this.partCol, 3));
    const pts = new THREE.Points(this.partGeo, curved(new THREE.PointsMaterial({ size: 0.32, map: softDot(), vertexColors: true, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending })));
    pts.frustumCulled = false;
    s.add(pts);
    for (let i = 0; i < N; i++) this.parts.push({ x: 0, y: -999, z: 0, vx: 0, vy: 0, vz: 0, life: 0, max: 1, r: 1, g: 1, b: 1, grav: 1 });

    this.bubble = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), curved(new THREE.MeshBasicMaterial({ color: 0x64b5f6, transparent: true, opacity: 0.22, depthWrite: false })));
    this.bubble.scale.set(0.95, 1.15, 0.95);
    this.bubble.visible = false;
    s.add(this.bubble);

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    this.bindInput();
    this.resetTrack();
    void this.setToon(this.toonId).then(() => { if (this.state === 'loading') this.state = 'menu'; this.emit(true); });
    void ToonActor.create(this.toonId === 'dager' ? 'norvey' : 'dager').then((a) => {
      this.prepActor(a);
      a.object.visible = false;
      this.chaser = a;
      this.scene.add(a.object);
    }).catch(() => {});
    this.last = performance.now();
    const tick = (t: number) => {
      this.raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (t - this.last) / 1000);
      this.last = t;
      this.frame(dt, t);
    };
    this.raf = requestAnimationFrame(tick);
  }

  /* ------------------------------------------------------------ setup */
  private prepActor(a: ToonActor) {
    a.object.rotation.y = Math.PI;
    a.object.scale.setScalar(TOON_SCALE);
    a.object.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { const l = isLens(m); m.material = l ? MAT.lens : MAT.char; m.castShadow = !l; } });
  }

  /** Build the current theme: sky, light, fog, scenery, floor, obstacles, sea, bloom. */
  private buildTheme() {
    const t = this.theme, s = this.scene;
    s.background = new THREE.Color(t.sky.fog);
    (s.fog as THREE.Fog).color.setHex(t.sky.fog);
    this.hemi.color.setHex(t.hemi[0]); this.hemi.groundColor.setHex(t.hemi[1]); this.hemi.intensity = t.hemi[2];
    this.sun.color.setHex(t.sun[0]); this.sun.intensity = t.sun[1];
    this.renderer.toneMappingExposure = t.exposure;
    // environment light from the theme's own sky (soft colour and reflections that match it)
    const pm = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    envScene.add(skyDome(t.sky));
    const g = new THREE.Mesh(new THREE.CircleGeometry(400, 24), new THREE.MeshBasicMaterial({ color: t.hemi[1] }));
    g.rotation.x = -Math.PI / 2; g.position.y = -5;
    envScene.add(g);
    this.envTex?.dispose();
    this.envTex = pm.fromScene(envScene, 0.02, 0.1, 1000).texture;
    pm.dispose();
    s.environment = this.envTex;
    s.environmentIntensity = t.env;

    const w = this.world;
    // sky that follows the camera
    this.sky = new THREE.Group();
    this.sky.add(skyDome(t.sky));
    const far = t.horizon();
    far.position.set(0, 8, -330);
    this.sky.add(far);
    this.clouds = [];
    for (let i = 0; i < t.clouds; i++) {
      const c = cloud(t.cloudTint);
      c.position.set((rnd() - 0.5) * 520, 55 + rnd() * 70, -170 - rnd() * 180);
      c.scale.setScalar(1.2 + rnd() * 1.4);
      this.clouds.push(c);
      this.sky.add(c);
    }
    w.add(this.sky);
    const mesh = (p: Parts, shadow: 'cast' | 'receive' | 'both') => {
      const m = new THREE.Mesh(p.world, MAT.world);
      m.castShadow = shadow !== 'receive'; m.receiveShadow = shadow !== 'cast';
      if (p.glow) { const gm = new THREE.Mesh(p.glow, MAT.glow); gm.name = 'glow'; m.add(gm); }
      if (p.lights) { const lm = new THREE.Mesh(p.lights, MAT.glow); lm.name = 'lights'; lm.visible = false; m.add(lm); }
      return m;
    };
    // scenery
    this.chunkParts = Array.from({ length: 8 }, (_, i) => t.chunk(i));
    this.chunks = [];
    for (let i = 0; i < 12; i++) {
      const m = mesh(this.chunkParts[i % 8], 'receive');
      w.add(m);
      this.chunks.push({ mesh: m, z: (i - 3) * CHUNK });
    }
    // obstacles
    const parts = { veh0: t.vehicle(0), veh1: t.vehicle(1), low: t.low(), high: t.high(), ramp: t.ramp() };
    for (const [k, p] of Object.entries(parts)) this.pools[k] = new Pool(() => mesh(p, 'both'), w);
    // lane floor tiles (with gaps), a plank across gaps, the building under each tile
    this.floor = []; this.floorGlow = []; this.planks = null;
    if (t.tile) {
      for (let l = 0; l < 3; l++) {
        const p = t.tile(l);
        const im = new THREE.InstancedMesh(p.world, MAT.world, 170);
        im.receiveShadow = true; im.frustumCulled = false; im.count = 0;
        w.add(im); this.floor.push(im);
        if (p.glow) { const gm = new THREE.InstancedMesh(p.glow, MAT.glow, 170); gm.frustumCulled = false; gm.count = 0; w.add(gm); this.floorGlow[l] = gm; }
      }
      if (t.plank) { this.planks = new THREE.InstancedMesh(t.plank(), MAT.world, 24); this.planks.frustumCulled = false; this.planks.count = 0; this.planks.receiveShadow = true; w.add(this.planks); }
      if (t.id === 'roofs') for (const im of this.floor) im.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(170 * 3).fill(1), 3);
    }
    // the sea beside the boardwalk: a living ocean (waves, foam on the crests and up the sand,
    // turquoise in the shallows) that scrolls with the runner and bends with the world
    this.water = null; this.ocean = null;
    if (t.water !== undefined) {
      this.ocean = makeOcean({ deep: 0x0a6aa0, shallow: 0x36e0d0, amp: 0.28, scale: 1.5, dir: [-1, 0.25], opacity: 0.95 }, (sh) => curveShader(sh));
      // depth: none under the sand (x < -6), deepening out to sea; the boardwalk stands in shallow water
      const geo = oceanGeometry(10, -150, 420, 360, 150, 120, (x) => THREE.MathUtils.clamp((x + 6.2) * 0.5, 0, 2) + Math.max(0, x - 2) * 0.15);
      this.water = new THREE.Mesh(geo, this.ocean.material);
      this.water.position.y = -2.45;
      this.water.receiveShadow = true;
      w.add(this.water);
    }
    this.life = new Life(t.id);
    w.add(this.life.group);
    this.setupBloom();
  }

  private disposeTheme() {
    this.life?.dispose(); this.life = null;
    this.ocean?.material.dispose(); this.ocean = null;
    for (const o of this.obs) this.release(o);
    this.obs = [];
    const geos = new Set<THREE.BufferGeometry>();
    this.world.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh && m.geometry) geos.add(m.geometry); });
    geos.forEach((g) => g.dispose());
    this.world.clear();
    for (const k of ['veh0', 'veh1', 'low', 'high', 'ramp']) delete this.pools[k];
    this.composer?.dispose();
    this.composer = null;
  }

  private setupBloom() {
    this.composer?.dispose();
    this.composer = null;
    if (!this.theme.bloom || !this.bloomOk) return;
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    // multisampled HDR target: without it, the bloom path loses the antialiasing (jagged edges)
    const c = new EffectComposer(this.renderer, new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 }));
    c.addPass(new RenderPass(this.scene, this.camera));
    c.addPass(new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.7, 0.32, 0.86));
    c.addPass(new OutputPass());
    c.setPixelRatio(this.dpr);
    c.setSize(w, h);
    this.composer = c;
  }

  /** Change the world (menu only). */
  setTheme(id: ThemeId) {
    if (this.theme.id === id || (this.state !== 'menu' && this.state !== 'over' && this.state !== 'loading')) return;
    try { localStorage.setItem('run:theme', id); } catch { /* ignore */ }
    this.disposeTheme();
    this.theme = THEMES[id];
    this.buildTheme();
    this.resetTrack();
    this.emit(true);
  }

  async setToon(id: string) {
    this.toonId = id;
    try { localStorage.setItem('run:toon', id); } catch { /* ignore */ }
    const a = await ToonActor.create(id);
    if (this.toonId !== id) { a.dispose(); return; }
    this.prepActor(a);
    if (this.player) this.player.dispose();
    this.player = a;
    this.scene.add(a.object);
    a.play(this.state === 'run' ? 'run' : 'idle', 0);
  }

  private resize() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
  }

  private bindInput() {
    const key = (e: KeyboardEvent) => {
      if (e.repeat) return;
      const k = e.key.toLowerCase();
      if (k === 'escape' || k === 'p') { this.togglePause(); return; }
      if (this.state !== 'run') return;
      if (k === 'arrowleft' || k === 'a') this.move(-1);
      else if (k === 'arrowright' || k === 'd') this.move(1);
      else if (k === 'arrowup' || k === 'w' || k === ' ') this.jump();
      else if (k === 'arrowdown' || k === 's') this.slide();
      else return;
      e.preventDefault();
    };
    const el = this.renderer.domElement;
    const down = (e: PointerEvent) => { this.touch = { x: e.clientX, y: e.clientY, done: false }; };
    const move = (e: PointerEvent) => {
      const t = this.touch;
      if (!t || t.done || this.state !== 'run') return;
      const dx = e.clientX - t.x, dy = e.clientY - t.y;
      if (Math.hypot(dx, dy) < 26) return;
      t.done = true;
      if (Math.abs(dx) > Math.abs(dy)) this.move(dx > 0 ? 1 : -1);
      else if (dy < 0) this.jump();
      else this.slide();
    };
    const up = () => { this.touch = null; };
    const vis = () => { if (document.hidden && this.state === 'run') this.togglePause(); };
    window.addEventListener('keydown', key);
    el.addEventListener('pointerdown', down);
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    document.addEventListener('visibilitychange', vis);
    this.offs.push(() => {
      window.removeEventListener('keydown', key);
      el.removeEventListener('pointerdown', down);
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      window.removeEventListener('pointercancel', up);
      document.removeEventListener('visibilitychange', vis);
    });
  }

  /* --------------------------------------------------------- controls */
  move(dir: number) {
    const to = this.lane + dir;
    if (to < 0 || to > 2) { this.bumpWall(); return; }
    this.laneFrom = this.lane;
    this.lane = to;
    sfx.lane();
  }
  jump() {
    if (!(this.grounded || this.clock - this.lastGround < 0.12)) return;
    this.vy = this.active.jump ? SUPER_V : JUMP_V;
    this.grounded = false;
    this.slideUntil = 0;
    this.pendingSlide = false;
    this.airT = 0;
    this.player?.play('jump', 0.08, 1.1, true);
    sfx.jump();
  }
  slide() {
    if (this.grounded) { this.slideUntil = this.clock + SLIDE_S; this.player?.play('slide', 0.08, 1.2, true); sfx.slide(); }
    else { this.vy = Math.min(this.vy, -28); this.pendingSlide = true; }
  }
  togglePause() {
    if (this.state === 'run') { this.prevState = 'run'; this.state = 'paused'; stopMusic(); this.emit(true); }
    else if (this.state === 'paused') { this.state = this.prevState; this.last = performance.now(); startMusic(); this.emit(true); }
  }

  /* ------------------------------------------------------------ flow */
  private resetTrack() {
    for (const o of this.obs) this.release(o);
    for (const p of this.powersOnTrack) this.pools[p.kind].put(p.mesh);
    for (const g of this.gates) { g.gm.group.visible = false; this.gatePool.push(g.gm); }
    this.obs = []; this.coins = []; this.powersOnTrack = []; this.gates = [];
    this.pz = 0; this.startZ = 0;
    this.genZ = 60; this.nextGate = 230; this.nextPower = 150 + rnd() * 120; this.blockedLane = -1; this.blockedUntil = 0;
    this.lane = this.laneFrom = 1; this.x = this.prevX = 0; this.y = 0; this.vy = 0; this.grounded = true;
    this.score = 0; this.coinCount = 0; this.mult = 1; this.answers = []; this.active = {}; this.invUntil = 0; this.chaseUntil = 0;
    this.revivesLeft = 2; this.revive = null; this.reviveQ = null; this.newBest = false; this.recentQ.clear();
    this.gaps = [];
    this.chunks.forEach((c, i) => { c.z = (i - 3) * CHUNK; this.setChunk(c.mesh, Math.floor(rnd() * 8)); });
    this.gen();
  }

  /** From the menu: the camera swings behind the runner and the run begins. */
  start() {
    if (this.state !== 'menu' && this.state !== 'over') return;
    if (this.state === 'over') this.resetTrack();
    this.state = 'intro';
    this.introAt = this.clock;
    this.player?.play('run', 0.25, 0.8);
    sfx.go();
    startMusic();
    this.emit(true);
  }
  toMenu() {
    if (this.state === 'over' || this.state === 'paused') { this.resetTrack(); this.state = 'menu'; this.player?.play('idle', 0.2); if (this.chaser) this.chaser.object.visible = false; stopMusic(); this.emit(true); }
  }
  setLevel(l: RunLevel) { this.level = l; try { localStorage.setItem('run:level', l); } catch { /* ignore */ } }

  private die() {
    this.state = 'dead';
    this.deadAt = this.clock;
    this.player?.play('hit', 0.06);
    this.shake = 0.6;
    sfx.crash();
    this.burst(this.x, this.y + 0.8, this.pz + 0.4, 26, [1, 0.9, 0.5], 5, 3);
    stopMusic();
    this.emit(true);
  }
  answerRevive(i: number) {
    if (this.state !== 'revive' || !this.revive || !this.reviveQ) return;
    const chosen = this.revive.opts[i];
    const ok = chosen === this.reviveQ.a;
    this.answers.push({ q: this.reviveQ.q, a: this.reviveQ.a, chosen: chosen ?? '—', ok });
    say(this.reviveQ.a);
    if (!ok) { sfx.bad(); this.finish(); return; }
    sfx.good();
    this.revivesLeft--;
    this.revive = null;
    for (const o of this.obs) if (o.z < this.pz + 50 && o.z + o.len > this.pz - 3 && o.k !== 'ramp') { o.dead = true; o.mesh.visible = false; }
    // land safely on the street (no holes right ahead)
    this.gaps = this.gaps.filter((h) => h.z1 < this.pz - 2 || h.z0 > this.pz + 45);
    this.y = 0; this.vy = 0; this.grounded = true;
    for (const o of this.obs) if (o.k === 'ramp' && o.z < this.pz + 50 && o.z + o.len > this.pz - 3) { o.dead = true; o.mesh.visible = false; }
    this.invUntil = this.clock + 2.5;
    this.chaseUntil = 0;
    this.state = 'run';
    this.player?.play('run', 0.15);
    startMusic();
    this.toast(t('Back in the race!', '¡De vuelta en la carrera!'), 'good');
    this.emit(true);
  }
  private finish() {
    this.state = 'over';
    this.revive = null;
    const s = Math.floor(this.score);
    if (s > this.best) { this.best = s; this.newBest = true; store.set('run:best', s); }
    this.totalCoins += this.coinCount;
    store.set('run:coins', this.totalCoins);
    this.player?.play(this.newBest ? 'cheer' : 'idle', 0.3);
    this.emit(true);
  }

  private setChunk(m: THREE.Mesh, v: number) {
    const p = this.chunkParts[v];
    m.geometry = p.world;
    const g = m.getObjectByName('glow') as THREE.Mesh | undefined;
    if (g && p.glow) g.geometry = p.glow;
  }

  private toast(text: string, tone: Toast['tone']) { this.onToast?.({ id: ++this.toastId, text, tone }); }

  /* ------------------------------------------------------- generation */
  private speedAt(d: number) { return 11.5 + 13.5 * (1 - Math.exp(-d / 2600)); }
  private diff(z: number) { return Math.min(1, z / 3500); }
  private avail(z: number) { return [0, 1, 2].filter((l) => !(l === this.blockedLane && z < this.blockedUntil)); }

  private addOb(k: ObKind, lane: number, z: number, vz = 0) {
    const kind = k === 'bus' ? (rnd() < 0.5 ? 'veh0' : 'veh1') : k;
    const mesh = this.pools[kind].get();
    mesh.userData.pool = kind;
    const lights = mesh.getObjectByName('lights');
    if (lights) lights.visible = vz !== 0;
    const len = k === 'bus' ? BUS.L : k === 'ramp' ? RAMP_L : k === 'low' ? 0.4 : 0.35;
    mesh.position.set(laneX(lane), 0, 0);
    const o: Ob = { k, lane, z, len, vz, mesh, dead: false };
    this.obs.push(o);
    return o;
  }
  private release(o: Ob) { this.pools[o.mesh.userData.pool as string].put(o.mesh); }
  private coinRow(lane: number, z: number, n: number, y = 0.75, step = 2.6) { for (let i = 0; i < n; i++) this.coins.push({ x: laneX(lane), y, z: z + i * step, mag: false }); }
  private coinArc(lane: number, zc: number, base = 0.75) { for (let k = -3; k <= 3; k++) this.coins.push({ x: laneX(lane), y: base + 1.35 * (1 - (k / 3) ** 2), z: zc + k * 1.7, mag: false }); }

  private gen() {
    while (this.genZ < this.pz + 240) {
      const z0 = this.genZ;
      const d = this.diff(z0);
      const blocked = this.blockedLane >= 0 && z0 < this.blockedUntil;
      let len: number;
      if (!blocked && z0 >= this.nextGate) { len = this.patGate(z0); this.nextGate = z0 + len + 380 + rnd() * 220; }
      else if (z0 >= this.nextPower) { len = this.patPower(z0); this.nextPower = z0 + 240 + rnd() * 220; }
      else {
        const opts: [number, (z: number) => number][] = [[2, (z) => this.patCoins(z)], [3, (z) => this.patLows(z)], [2 + d, (z) => this.patHighs(z)]];
        if (!blocked) {
          opts.push([1 + 2 * d, (z) => this.patMixed(z)], [2 + d, (z) => this.patBuses(z)], [1 + d, (z) => this.patTrain(z)]);
          if (d > 0.12) opts.push([0.5 + 1.6 * d, (z) => this.patWall(z)]);
          if (d > 0.12 && this.theme.oncoming) opts.push([0.6 + 2 * d, (z) => this.patOncoming(z)]);
          if (this.theme.gaps !== 'none') opts.push([this.theme.gaps === 'full' ? 2.6 : 1.6 + d, (z) => this.patGap(z)]);
        }
        let r = rnd() * opts.reduce((s, o) => s + o[0], 0);
        let f = opts[0][1];
        for (const o of opts) { r -= o[0]; if (r <= 0) { f = o[1]; break; } }
        len = f(z0);
      }
      this.genZ = z0 + len + 7 + this.speedAt(z0) * 0.45;
    }
  }
  private patCoins(z: number) {
    const lanes = this.avail(z);
    const l = lanes[Math.floor(rnd() * lanes.length)];
    const n = 10 + Math.floor(rnd() * 5);
    if (rnd() < 0.4) {
      const l2 = lanes.find((x) => Math.abs(x - l) === 1) ?? l;
      this.coinRow(l, z, Math.floor(n / 2));
      this.coinRow(l2, z + Math.floor(n / 2) * 2.6 + 2.6, Math.ceil(n / 2));
      return n * 2.6 + 2.6;
    }
    this.coinRow(l, z, n);
    return n * 2.6;
  }
  private patLows(z: number) {
    const d = this.diff(z);
    const lanes = shuffle(this.avail(z));
    const n = d > 0.3 && rnd() < 0.5 && lanes.length > 1 ? 2 : 1;
    lanes.slice(0, n).forEach((l) => this.addOb('low', l, z + 4));
    this.coinArc(lanes[0], z + 4.2);
    if (lanes[n] !== undefined) this.coinRow(lanes[n], z, 5);
    if (d > 0.35 && rnd() < 0.6) {
      const gap = Math.max(12, this.speedAt(z) * 0.8);
      const l2 = shuffle(this.avail(z + gap)).slice(0, n);
      l2.forEach((l) => this.addOb('low', l, z + 4 + gap));
      return 6 + gap;
    }
    return 8;
  }
  private patHighs(z: number) {
    const d = this.diff(z);
    const lanes = shuffle(this.avail(z));
    const n = Math.min(lanes.length, d > 0.35 && rnd() < 0.35 ? 3 : 1 + Math.floor(rnd() * 2));
    lanes.slice(0, n).forEach((l) => this.addOb('high', l, z + 4));
    this.coinRow(lanes[0], z + 1.5, 3, 0.45, 1.6);
    return 7;
  }
  private patMixed(z: number) {
    const [a, b, c] = shuffle([0, 1, 2]);
    this.addOb('low', a, z + 4);
    this.addOb('high', b, z + 4);
    if (this.diff(z) > 0.5 && rnd() < 0.5) this.addOb('bus', c, z);
    else this.coinRow(c, z, 5);
    this.coinArc(a, z + 4.2);
    return 12;
  }
  private patBuses(z: number) {
    const [a, b, free] = shuffle([0, 1, 2]);
    const ramp = rnd() < 0.5 ? a : -1;
    for (const l of [a, b]) {
      const off = l === ramp ? RAMP_L : rnd() * 5;
      if (l === ramp) { this.addOb('ramp', l, z); this.coinRow(l, z + RAMP_L + 1, 4, BUS.H + 0.75, 2.2); }
      this.addOb('bus', l, z + off);
    }
    this.coinRow(free, z + 2, 6);
    return RAMP_L + BUS.L + 4;
  }
  private patWall(z: number) {
    const r = Math.floor(rnd() * 3);
    this.addOb('ramp', r, z);
    for (let l = 0; l < 3; l++) { this.addOb('bus', l, z + RAMP_L); this.coinRow(l, z + RAMP_L + 1.2, 4, BUS.H + 0.75, 2.3); }
    this.coinRow(r, z - 8, 3);
    return RAMP_L + BUS.L;
  }
  private patTrain(z: number) {
    const [t, a, b] = shuffle([0, 1, 2]);
    this.addOb('ramp', t, z);
    this.addOb('bus', t, z + RAMP_L);
    this.addOb('bus', t, z + RAMP_L + BUS.L);
    this.coinRow(t, z + RAMP_L + 1, 8, BUS.H + 0.75, 2.4);
    const L = RAMP_L + 2 * BUS.L;
    // the other lanes: barriers to jump or slide, one at a time, never both lanes blocked at once
    for (let k = 0, zz = z + 6; zz < z + L - 4; zz += Math.max(11, this.speedAt(z) * 0.7), k++) this.addOb(k % 2 ? 'high' : 'low', k % 2 ? a : b, zz);
    return L;
  }
  /** A hole in the floor (all lanes on the rooftops, sometimes with a plank; some lanes elsewhere). */
  private patGap(z: number) {
    const sp = this.speedAt(z);
    const tiles = sp > 20 ? 3 : sp > 15.5 ? 2 : 1;
    const z0 = Math.ceil((z + 6) / TILE) * TILE, z1 = z0 + tiles * TILE;
    const full = this.theme.gaps === 'full';
    const lanes = full ? [0, 1, 2] : shuffle([0, 1, 2]).slice(0, rnd() < 0.3 ? 3 : rnd() < 0.6 ? 2 : 1);
    const plank = full && rnd() < 0.45 ? Math.floor(rnd() * 3) : -1;
    for (const l of lanes) {
      this.gaps.push({ lane: l, z0, z1, plank: l === plank });
      if (l !== plank && rnd() < 0.65) this.coinArc(l, (z0 + z1) / 2);
    }
    for (let l = 0; l < 3; l++) if (!lanes.includes(l)) this.coinRow(l, z0 - 2, 3);
    if (plank >= 0) this.coinRow(plank, z0 + 0.5, tiles + 1, 0.75, TILE);
    return z1 - z + 6;
  }
  private patOncoming(z: number) {
    const lanes = shuffle([0, 1, 2]);
    const o = lanes[0];
    const v = 8;
    const t = (z - this.pz) / Math.max(8, this.speed || this.speedAt(z));
    const spawn = z + v * t;
    this.addOb('bus', o, spawn, -v);
    this.blockedLane = o;
    this.blockedUntil = spawn + BUS.L + 6;
    this.coinRow(lanes[1], z - 6, 6);
    if (rnd() < 0.5) this.addOb('low', lanes[2], z + 2);
    return 12;
  }
  private patGate(z: number) {
    const q = makeQuestion(this.level, this.recentQ);
    const opts = shuffle([q.a, q.w[0], q.w[1]]);
    const gm = this.gatePool.pop() ?? gateMesh();
    if (!gm.group.parent) this.scene.add(gm.group);
    gm.group.visible = true;
    paintBoard(gm.q, q.q, '#ffffff', '#103a36', '#00897b');
    gm.qTex.needsUpdate = true;
    opts.forEach((a, i) => { paintBoard(gm.a[i], a, '#fffdf4', '#1d1840', '#ffb300'); gm.aTex[i].needsUpdate = true; });
    this.gates.push({ z: z + 38, q, opts, correct: opts.indexOf(q.a), gm, passed: false });
    for (let l = 0; l < 3; l++) this.coinRow(l, z + 6, 9, 0.75, 3);
    return 46;
  }
  private patPower(z: number) {
    const kinds: PowerKind[] = ['magnet', 'magnet', 'double', 'shield', 'jump'];
    const kind = kinds[Math.floor(rnd() * kinds.length)];
    const lanes = this.avail(z);
    const l = lanes[Math.floor(rnd() * lanes.length)];
    this.coinRow(l, z, 4);
    const mesh = this.pools[kind].get();
    this.powersOnTrack.push({ kind, x: laneX(l), y: 1.05, z: z + 13, mesh });
    return 16;
  }

  /* ------------------------------------------------------------ world */
  /** Is there a hole in the floor at (x, z)? A plank across a gap only holds you near its middle. */
  private holeAt(x: number, z: number) {
    if (!this.gaps.length) return false;
    const lane = Math.max(0, Math.min(2, Math.round(x / LANE) + 1));
    for (const h of this.gaps) {
      if (h.lane !== lane || z <= h.z0 + 0.25 || z >= h.z1 - 0.25) continue;
      if (!h.plank || Math.abs(x - laneX(lane)) > 0.55) return true;
    }
    return false;
  }

  private groundAt(x: number, z: number) {
    let g = this.holeAt(x, z) ? -60 : 0;
    for (const o of this.obs) {
      if (o.dead || (o.k !== 'bus' && o.k !== 'ramp')) continue;
      if (z < o.z || z > o.z + o.len || Math.abs(x - laneX(o.lane)) > 0.95) continue;
      g = Math.max(g, o.k === 'bus' ? BUS.H : (BUS.H * (z - o.z)) / o.len);
    }
    return g;
  }

  private bumpWall() { this.shake = Math.max(this.shake, 0.15); sfx.bump(); }
  private stumble(fromSide: boolean) {
    if (this.clock < this.invUntil) return;
    this.shake = Math.max(this.shake, 0.3);
    this.hitUntil = this.clock + 0.35;
    this.player?.play('hit', 0.05, 1.6, true);
    sfx.bump();
    if (this.clock < this.chaseUntil) { this.toast(t('Caught!', '¡Te atraparon!'), 'bad'); this.die(); return; }
    this.chaseUntil = this.clock + 5;
    if (fromSide) this.toast(t('Careful!', '¡Cuidado!'), 'info');
  }
  private crash(o: Ob) {
    if (this.clock < this.invUntil) return;
    if (this.active.shield) {
      delete this.active.shield;
      o.dead = true;
      o.mesh.visible = false;
      this.invUntil = this.clock + 1.0;
      this.shake = 0.35;
      sfx.shield();
      this.burst(laneX(o.lane), 1, o.z, 30, [0.5, 0.75, 1], 6, 2);
      this.toast(t('Shield saved you!', '¡El escudo te salvó!'), 'info');
      return;
    }
    this.die();
  }

  private collect(c: Coin) {
    this.coinCount++;
    this.score += 5 * this.mult * (this.active.double ? 2 : 1);
    sfx.coin();
    this.burst(c.x, c.y, c.z, 5, [1, 0.85, 0.3], 2.2, 0.5);
  }

  private passGate(g: Gate) {
    g.passed = true;
    const chosen = Math.max(0, Math.min(2, Math.round(this.x / LANE) + 1));
    const ok = chosen === g.correct;
    this.answers.push({ q: g.q.q, a: g.q.a, chosen: g.opts[chosen], ok });
    paintBoard(g.gm.a[g.correct], g.q.a, '#2fd27a', '#04361a', '#ffffff');
    g.gm.aTex[g.correct].needsUpdate = true;
    if (ok) {
      this.mult = Math.min(10, this.mult + 1);
      this.coinCount += 10;
      sfx.good();
      this.toast(`${t('Correct!', '¡Correcto!')} ${g.q.a} · x${this.mult}`, 'good');
      for (let i = 0; i < 4; i++) this.burst(laneX(chosen) + (rnd() - 0.5) * 2, 3 + rnd() * 2, g.z, 14, [[1, 0.85, 0.2], [0.3, 1, 0.5], [0.4, 0.8, 1], [1, 0.4, 0.7]][i], 6, 1.5);
    } else {
      paintBoard(g.gm.a[chosen], g.opts[chosen], '#ff5a67', '#ffffff', '#ffffff');
      g.gm.aTex[chosen].needsUpdate = true;
      this.mult = Math.max(1, this.mult - 1);
      sfx.bad();
      this.toast(`${t('The answer was', 'La respuesta era')}: ${g.q.a}`, 'bad');
      if (this.clock >= this.invUntil) { this.chaseUntil = Math.max(this.chaseUntil, this.clock + 4); this.player?.play('hit', 0.05, 1.6, true); this.hitUntil = this.clock + 0.35; }
    }
    say(g.q.a);
  }

  private burst(x: number, y: number, z: number, n: number, col: number[], sp: number, up: number) {
    let made = 0;
    for (const p of this.parts) {
      if (p.life > 0) continue;
      p.x = x; p.y = y; p.z = z;
      const a = rnd() * Math.PI * 2, s = sp * (0.4 + rnd() * 0.6);
      p.vx = Math.cos(a) * s; p.vz = Math.sin(a) * s * 0.6; p.vy = up + rnd() * sp * 0.6;
      p.max = p.life = 0.45 + rnd() * 0.5;
      p.r = col[0]; p.g = col[1]; p.b = col[2]; p.grav = 1;
      if (++made >= n) break;
    }
  }

  /* -------------------------------------------------------------- loop */
  private frame(dt: number, t: number) {
    if (this.state !== 'paused') this.clock += dt;
    const st = this.state;
    if (st === 'intro') {
      const k = Math.min(1, (this.clock - this.introAt) / 1.15);
      this.speed = this.speedAt(0) * k;
      this.advance(dt);
      if (k >= 1) { this.state = 'run'; this.emit(true); }
    } else if (st === 'run') {
      this.speed = this.speedAt(this.pz - this.startZ);
      this.advance(dt);
      this.physics(dt);
    } else if (st === 'dead') {
      this.speed = Math.max(0, this.speed - 60 * dt);
      if (this.clock - this.deadAt > 1.3) {
        if (this.revivesLeft > 0) {
          this.reviveQ = makeQuestion(this.level, this.recentQ);
          this.revive = { q: this.reviveQ.q, opts: shuffle([this.reviveQ.a, ...this.reviveQ.w]), endsAt: Date.now() + 10_000 };
          this.state = 'revive';
          this.emit(true);
        } else this.finish();
      }
    } else if (st === 'revive') {
      if (this.revive && Date.now() > this.revive.endsAt) { this.answers.push({ q: this.reviveQ!.q, a: this.reviveQ!.a, chosen: '—', ok: false }); this.finish(); }
    }
    if (st !== 'paused') {
      this.player?.update(dt);
      this.chaser?.update(dt);
      this.updateActors(dt);
      this.updateParticles(dt);
    }
    this.place();
    this.updateCamera(dt);
    for (const c of this.clouds) { c.position.x += dt * 1.5; if (c.position.x > 280) c.position.x = -280; }
    if (this.ocean) { this.ocean.uniforms.uTime.value += dt; this.ocean.uniforms.uOffset.value.set(0, -this.pz); }
    this.life?.update(dt, this.clock, this.pz);
    if (this.composer) this.composer.render(dt);
    else this.renderer.render(this.scene, this.camera);
    this.adapt(dt, t);
    if (t - this.hudAt > 70) { this.hudAt = t; this.emit(false); }
  }

  /** Move forward, keep the track generated ahead and recycle what is behind. */
  private advance(dt: number) {
    this.pz += this.speed * dt;
    for (const o of this.obs) {
      if (o.vz) {
        o.z += o.vz * dt;
        if (!o.honked && !o.dead && o.lane === this.lane && o.z - this.pz < 45 && o.z > this.pz) { o.honked = true; sfx.horn(); }
      }
    }
    this.obs = this.obs.filter((o) => { if (o.z + o.len < this.pz - 12) { this.release(o); return false; } return true; });
    this.coins = this.coins.filter((c) => c.z > this.pz - 4);
    this.powersOnTrack = this.powersOnTrack.filter((p) => { if (p.z < this.pz - 4) { this.pools[p.kind].put(p.mesh); return false; } return true; });
    this.gates = this.gates.filter((g) => { if (g.z < this.pz - 20) { g.gm.group.visible = false; this.gatePool.push(g.gm); return false; } return true; });
    for (const c of this.chunks) if (c.z + CHUNK < this.pz - 90) { c.z += this.chunks.length * CHUNK; this.setChunk(c.mesh, Math.floor(rnd() * 8)); }
    if (this.gaps.length && this.gaps[0].z1 < this.pz - 20) this.gaps = this.gaps.filter((h) => h.z1 > this.pz - 20);
    this.gen();
    CURVE.value.y = 0.0007 * Math.sin(this.pz / 420);
    setMusicIntensity(this.speed / 20);
  }

  private physics(dt: number) {
    const now = this.clock;
    const sp = this.speed;
    // sideways
    const tx = laneX(this.lane);
    const dx = tx - this.x;
    this.prevX = this.x;
    this.x += Math.sign(dx) * Math.min(Math.abs(dx), Math.max(13 * dt, Math.abs(dx) * dt * 14));
    // up and down
    const ground = this.groundAt(this.x, this.pz);
    if (this.grounded) {
      if (ground >= this.y - 0.05 && ground - this.y < 0.8) this.y = ground;
      else if (ground < this.y - 0.05) { this.grounded = false; this.vy = 0; this.airT = 0; }
      this.lastGround = now;
    }
    if (!this.grounded) {
      this.airT += dt;
      this.vy += G * dt;
      this.y += this.vy * dt;
      if (this.y <= ground && this.vy <= 0) {
        this.y = ground; this.vy = 0; this.grounded = true; this.lastGround = now;
        if (this.airT > 0.25) { sfx.land(); this.burst(this.x, this.y + 0.05, this.pz, 8, [0.9, 0.9, 0.95], 2.5, 0.6); }
        if (this.pendingSlide) { this.pendingSlide = false; this.slide(); }
      }
    }
    if (this.y < -3) { this.toast(t('Oops! You fell', '¡Uy! Te caíste'), 'bad'); this.die(); return; }
    const sliding = now < this.slideUntil;
    const h = sliding ? SLIDE_H : STAND_H;
    // obstacles
    for (const o of this.obs) {
      if (o.dead || o.k === 'ramp') continue;
      if (o.z + o.len < this.pz - 0.3 || o.z > this.pz + 0.3) continue;
      const ox = laneX(o.lane), hw = o.k === 'bus' ? 0.9 : 0.85;
      if (Math.abs(this.x - ox) >= hw + 0.3) continue;
      let y0 = 0, y1 = 0.78; // low barrier: forgiving, the feet only need to clear the board
      if (o.k === 'high') { y0 = 1.05; y1 = 2.45; }
      if (o.k === 'bus') { y1 = BUS.H; if (this.y >= BUS.H - 0.3) continue; }
      if (this.y + h <= y0 || this.y >= y1) continue;
      // already in line with it = hit from the front; moving into it from the side = bounce back
      if (Math.abs(this.prevX - ox) < hw + 0.3) this.crash(o);
      else {
        this.lane = this.laneFrom !== this.lane ? this.laneFrom : this.x < ox ? Math.max(0, o.lane - 1) : Math.min(2, o.lane + 1);
        this.laneFrom = this.lane;
        this.x = this.prevX;
        this.stumble(true);
      }
      if (this.state !== 'run') return;
      break;
    }
    // coins
    const magnet = !!this.active.magnet;
    const keep: Coin[] = [];
    for (const c of this.coins) {
      if (magnet && !c.mag && c.z - this.pz < 14 && c.z > this.pz - 1) c.mag = true;
      if (c.mag) { const k = Math.min(1, dt * 11); c.x += (this.x - c.x) * k; c.y += (this.y + 0.7 - c.y) * k; c.z += (this.pz - c.z) * k; }
      if (Math.abs(c.z - this.pz) < 0.8 && Math.abs(c.x - this.x) < 0.8 && c.y > this.y - 0.45 && c.y < this.y + h + 0.5) this.collect(c);
      else keep.push(c);
    }
    this.coins = keep;
    // power-ups
    this.powersOnTrack = this.powersOnTrack.filter((p) => {
      if (Math.abs(p.z - this.pz) < 0.9 && Math.abs(p.x - this.x) < 0.9 && p.y > this.y - 0.5 && p.y < this.y + h + 0.6) {
        this.active[p.kind] = now + POWER_S[p.kind];
        this.pools[p.kind].put(p.mesh);
        sfx.power();
        const names: Record<PowerKind, string> = { magnet: t('Coin magnet!', '¡Imán de monedas!'), double: t('Double score!', '¡Puntos dobles!'), shield: t('Shield!', '¡Escudo!'), jump: t('Super jump!', '¡Súper salto!') };
        this.toast(names[p.kind], 'info');
        return false;
      }
      return true;
    });
    for (const k of Object.keys(this.active) as PowerKind[]) if ((this.active[k] ?? 0) < now) delete this.active[k];
    // gates
    for (const g of this.gates) if (!g.passed && this.pz >= g.z) this.passGate(g);
    // score
    this.score += sp * dt * this.mult * (this.active.double ? 2 : 1);
  }

  private updateActors(dt: number) {
    const p = this.player;
    if (!p) return;
    const now = this.clock;
    const o = p.object;
    const running = this.state === 'run' || this.state === 'intro';
    o.position.set(this.x, this.y, 0);
    const lean = running ? (laneX(this.lane) - this.x) * 0.14 : 0;
    o.rotation.z += (-lean - o.rotation.z) * Math.min(1, dt * 12);
    o.rotation.y = Math.PI - lean * 0.6;
    if (this.state === 'run' && now >= this.hitUntil) {
      let clip: ToonClip = 'run';
      if (now < this.slideUntil) clip = 'slide';
      else if (!this.grounded) clip = this.vy > 0 || p.current === 'jump' ? (this.vy < -4 && this.airT > 0.3 ? 'fall' : 'jump') : 'fall';
      if (clip === 'run') p.play('run', 0.12, Math.max(0.9, this.speed / 13));
      else if (clip !== p.current) p.play(clip, 0.1, clip === 'slide' ? 1.2 : 1);
    }
    // blink while invincible
    o.visible = !(now < this.invUntil && this.state === 'run' && Math.floor(now * 12) % 2 === 0);
    this.bubble.visible = !!this.active.shield && this.state === 'run';
    if (this.bubble.visible) { this.bubble.position.set(this.x, this.y + 0.85, 0); this.bubble.rotation.y += dt; }
    if (this.active.jump && this.state === 'run' && Math.random() < 0.3) this.burst(this.x, this.y + 0.1, this.pz, 1, [0.4, 1, 0.5], 1, 0.4);
    // the chaser shows up behind after a stumble
    const c = this.chaser;
    if (c) {
      const chasing = (now < this.chaseUntil && this.state === 'run') || this.state === 'dead' || this.state === 'revive';
      const targetZ = this.state === 'dead' || this.state === 'revive' ? 1.6 : chasing ? 2.6 : 14;
      if (chasing) c.object.visible = true;
      c.object.position.z += (targetZ - c.object.position.z) * Math.min(1, dt * 3);
      c.object.position.x += (this.x - c.object.position.x) * Math.min(1, dt * 4);
      c.object.position.y = this.state === 'run' ? Math.min(this.y, this.groundAt(c.object.position.x, this.pz - c.object.position.z)) : this.y;
      if (!chasing && c.object.position.z > 12) c.object.visible = false;
      if (c.object.visible) c.play(this.state === 'run' ? 'run' : 'idle', 0.2, Math.max(0.9, this.speed / 13));
    }
  }

  private updateParticles(dt: number) {
    const P = this.partPos, C = this.partCol;
    this.parts.forEach((p, i) => {
      if (p.life <= 0) { P[i * 3 + 1] = -999; return; }
      p.life -= dt;
      p.vy -= 9 * p.grav * dt;
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      const k = Math.max(0, p.life / p.max);
      P[i * 3] = p.x; P[i * 3 + 1] = p.y; P[i * 3 + 2] = -(p.z - this.pz);
      C[i * 3] = p.r * k; C[i * 3 + 1] = p.g * k; C[i * 3 + 2] = p.b * k;
    });
    (this.partGeo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (this.partGeo.getAttribute('color') as THREE.BufferAttribute).needsUpdate = true;
  }

  private m4 = new THREE.Matrix4();
  private q4 = new THREE.Quaternion();
  private v3 = new THREE.Vector3();
  private s3 = new THREE.Vector3(1, 1, 1);
  /** Draw everything at its place relative to the runner. */
  private place() {
    const pz = this.pz;
    for (const c of this.chunks) c.mesh.position.z = -(c.z - pz);
    for (const o of this.obs) o.mesh.position.z = -(o.z - pz);
    for (const g of this.gates) g.gm.group.position.z = -(g.z - pz);
    const t = this.clock;
    for (const p of this.powersOnTrack) { p.mesh.position.set(p.x, p.y + Math.sin(t * 3 + p.z) * 0.12, -(p.z - pz)); p.mesh.rotation.y = t * 2.4; }
    let n = 0;
    this.q4.setFromAxisAngle(this.v3.set(0, 1, 0), t * 3.2);
    for (const c of this.coins) {
      if (c.z - pz > 200 || n >= 320) continue;
      this.m4.compose(this.v3.set(c.x, c.y, -(c.z - pz)), this.q4, this.s3);
      this.coinMesh.setMatrixAt(n, this.m4);
      n++;
    }
    this.coinMesh.count = n;
    this.coinMesh.instanceMatrix.needsUpdate = true;
    if (this.floor.length) this.placeFloor();
  }

  private static TINTS = [0xffffff, 0xffe3d6, 0xe2e9ff, 0xfff0c6, 0xe4f7e6, 0xf6dddd, 0xe9e2f7].map((h) => new THREE.Color(h));
  /** Lane tiles from just behind to far ahead, leaving out the holes (planks drawn across some). */
  private placeFloor() {
    const pz = this.pz, n = [0, 0, 0], q = new THREE.Quaternion(), one = new THREE.Vector3(1, 1, 1);
    let pn = 0, seg = 0, gi = 0;
    const holes = this.gaps;
    const tint = this.theme.id === 'roofs';
    for (let tz = Math.floor((pz - 12) / TILE) * TILE; tz < pz + 280; tz += TILE) {
      // rooftops: a new building after each gap (another colour)
      while (gi < holes.length && holes[gi].z1 <= tz) { if (holes[gi].lane === 0) seg = holes[gi].z0; gi++; }
      for (let l = 0; l < 3; l++) {
        const hole = holes.find((h) => h.lane === l && tz >= h.z0 && tz < h.z1);
        this.m4.compose(this.v3.set(laneX(l), 0, -(tz - pz)), q, one);
        if (hole) {
          if (hole.plank && this.planks && pn < 24) this.planks.setMatrixAt(pn++, this.m4);
          continue;
        }
        if (n[l] >= 170) continue;
        this.floor[l].setMatrixAt(n[l], this.m4);
        this.floorGlow[l]?.setMatrixAt(n[l], this.m4);
        if (tint) this.floor[l].setColorAt(n[l], RunGame.TINTS[Math.abs(Math.round(seg * 0.37)) % RunGame.TINTS.length]);
        n[l]++;
      }
    }
    for (let l = 0; l < 3; l++) {
      const f = this.floor[l];
      f.count = n[l]; f.instanceMatrix.needsUpdate = true;
      if (f.instanceColor) f.instanceColor.needsUpdate = true;
      const gm = this.floorGlow[l];
      if (gm) { gm.count = n[l]; gm.instanceMatrix.needsUpdate = true; }
    }
    if (this.planks) { this.planks.count = pn; this.planks.instanceMatrix.needsUpdate = true; }
  }

  private updateCamera(dt: number) {
    const st = this.state;
    const portrait = this.camera.aspect < 0.8;
    // upright phones: further away and looking lower, so the runner stands above the menu panel
    const menu = portrait ? { x: 1.2, y: 1.9, z: -6.4, lx: 0, ly: -0.15, lz: 0 } : { x: 1.2, y: 1.7, z: -4.6, lx: -1.25, ly: 1.05, lz: 0 }; // wide screens: the runner stands right of the menu
    // phones held upright: a bit further back so the lanes fit
    const run = { x: this.x * 0.72, y: (portrait ? 3.5 : 3.0) + this.y * 0.55, z: portrait ? 7.3 : 6.0, lx: this.x * 0.8, ly: 1.15 + this.y * 0.5, lz: -7 };
    let tgt = run;
    if (st === 'menu' || st === 'loading') {
      const a = this.clock * 0.25;
      tgt = { ...menu, x: menu.x + Math.sin(a) * 0.8 - 0.3, z: menu.z + 0.1 - Math.cos(a) * 0.3 };
    } else if (st === 'intro') {
      const k = Math.min(1, (this.clock - this.introAt) / 1.15);
      const e = k * k * (3 - 2 * k);
      const L = (a: number, b: number) => a + (b - a) * e;
      tgt = { x: L(menu.x, run.x) + Math.sin(Math.PI * e) * 3.5, y: L(menu.y, run.y) + Math.sin(Math.PI * e) * 0.8, z: L(menu.z, run.z), lx: L(menu.lx, run.lx), ly: L(menu.ly, run.ly), lz: L(menu.lz, run.lz) };
    } else if (st === 'over') {
      // look at the runner from the front, unless something stands there; then from high behind
      const cx = this.x + (this.x > 0 ? -2.2 : 2.2);
      const blocked = this.obs.some((o) => !o.dead && o.z < this.pz + 7 && o.z + o.len > this.pz && Math.abs(laneX(o.lane) - cx) < 1.6);
      tgt = blocked ? { x: this.x * 0.5, y: this.y + 4.8, z: 8.5, lx: this.x, ly: this.y + 0.8, lz: -2 } : { x: cx, y: this.y + 1.8, z: -4.4, lx: this.x, ly: this.y + 1.0, lz: 0 };
    } else if (st === 'dead' || st === 'revive') {
      tgt = { x: this.x * 0.5, y: this.y + 4.2, z: 7.8, lx: this.x, ly: this.y + 0.8, lz: -3 };
    }
    const c = this.cam;
    const k = st === 'intro' ? 1 : Math.min(1, dt * (st === 'run' ? 9 : 3));
    c.x += (tgt.x - c.x) * k; c.y += (tgt.y - c.y) * k; c.z += (tgt.z - c.z) * k;
    c.lx += (tgt.lx - c.lx) * k; c.ly += (tgt.ly - c.ly) * k; c.lz += (tgt.lz - c.lz) * k;
    this.shake = Math.max(0, this.shake - dt * 1.6);
    const sx = (rnd() - 0.5) * this.shake * 0.5, sy = (rnd() - 0.5) * this.shake * 0.5;
    this.camera.position.set(c.x + sx, c.y + sy, c.z);
    this.camera.lookAt(c.lx, c.ly, c.lz);
    const fov = st === 'run' || st === 'intro' ? 58 + Math.max(0, this.speed - 11) * 0.75 : 50;
    if (Math.abs(this.camera.fov - fov) > 0.05) { this.camera.fov += (fov - this.camera.fov) * Math.min(1, dt * 3); this.camera.updateProjectionMatrix(); }
    this.sky.position.copy(this.camera.position);
    const fog = this.scene.fog as THREE.Fog;
    const far = st === 'menu' || st === 'loading' || st === 'over' ? 75 : 190;
    fog.far += (far - fog.far) * Math.min(1, dt * 2);
    fog.near = fog.far * 0.22;
  }

  /** Lower the resolution (then shadows) if the device cannot keep up. */
  private adapt(dt: number, t: number) {
    this.frames.push(dt);
    if (this.frames.length > 90) this.frames.shift();
    if (t - this.qualityAt < 2500 || this.frames.length < 60 || (this.state !== 'run' && this.state !== 'menu')) return;
    this.qualityAt = t;
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    if (avg > 0.024) {
      if (this.composer) { this.bloomOk = false; this.setupBloom(); }
      else if (this.dpr > 0.8) { this.dpr = Math.max(0.75, this.dpr - 0.25); this.renderer.setPixelRatio(this.dpr); this.resize(); }
      else if (this.sun.castShadow) this.sun.castShadow = false;
      this.frames = [];
    }
  }

  private emit(force: boolean) {
    if (!this.onHud) return;
    void force;
    const now = this.clock;
    const g = this.gates.find((x) => !x.passed && x.z - this.pz < 150);
    this.onHud({
      state: this.state, score: Math.floor(this.score), coins: this.coinCount, speed: this.speed, mult: this.mult * (this.active.double ? 2 : 1), dist: Math.floor(this.pz - this.startZ),
      powers: (Object.keys(this.active) as PowerKind[]).map((k) => ({ kind: k, left: Math.max(0, (this.active[k] ?? 0) - now), total: POWER_S[k] })),
      gate: g ? { q: g.q.q, opts: g.opts, dist: g.z - this.pz, lane: this.lane } : null,
      revive: this.revive, best: this.best, newBest: this.newBest, answers: this.answers, revivesLeft: this.revivesLeft, chasing: now < this.chaseUntil,
    });
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    stopMusic();
    this.ro.disconnect();
    this.offs.forEach((f) => f());
    this.player?.dispose();
    this.chaser?.dispose();
    this.disposeTheme();
    this.coinMesh.geometry.dispose();
    this.envTex?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}
