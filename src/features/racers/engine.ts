/* English Racers — the game: scene, lights and sky per track, eight karts (the player and seven
   teacher bots), input (keyboard, gamepad, touch buttons), a fixed-step physics loop, countdown
   with a rocket start, laps, places, items and coins, question gates, kart-to-kart bumps, moving
   hazards, chase camera, effects, sound, the HUD feed and the race / Grand Prix / time trial flow
   with results, points and a podium. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TOONS, ToonActor } from '@/features/toons3d/runtime';
import { skyDome } from '@/features/run/gfx';
import type { RunLevel } from '@/features/run/questions';
import { Track } from './track';
import { buildTrackMeshes, type TrackMeshes } from './trackMesh';
import type { Scenery } from './scenery';
import { TRACKS, trackInfo, type TrackId, type TrackInfo } from './tracks';
import { Kart, KART, NO_INPUT, autopilot, type KartInput } from './kart';
import { KartView } from './kartModel';
import { Flames, Particles, Skids, SpeedLines } from './fx';
import { Bot, SKILL, racingLine, type Difficulty, type Line, type Obstacle } from './ai';
import { ItemWorld, rollItem, ITEM_LIST } from './items';
import { Gates, type GateSite } from './gates';
import { makeRacer, rank, scoreOf, type ItemKind, type Racer, type RemoteSample } from './racer';
import { t } from '@/lib/gameLang';
import { engineSet, engineStop, sfx, startMusic, stopMusic, setMusicFast, setSong, unlock } from './audio';

export type RaceState = 'loading' | 'menu' | 'countdown' | 'race' | 'paused' | 'finish' | 'podium';
export type Mode = 'race' | 'gp' | 'time' | 'live';
export type Cup = 'classic' | 'world';
export interface Settings { mode: Mode; track: TrackId; level: RunLevel; difficulty: Difficulty; cup: Cup }
export interface ResultRow { place: number; name: string; color: string; me: boolean; time: number | null; points: number; total: number }
export interface Review { q: string; a: string; picked: string; ok: boolean }
export interface Results {
  total: number; laps: number[]; best: number; newBestLap: boolean; newBestTotal: boolean;
  place: number; rows: ResultRow[]; review: Review[]; right: number; wrong: number;
  /** Every racer is in (the table is final). */
  final: boolean;
  gpRace: number; gpOver: boolean;
}
export interface Hud {
  state: RaceState; count: number; lap: number; laps: number; time: number; lapTime: number; lapTimes: number[]; bestLap: number | null;
  speed: number; tier: number; boost: boolean; wrongWay: boolean; results: Results | null; x: number; z: number; yaw: number; record: { lap: number; total: number } | null;
  mode: Mode; track: TrackId; place: number; n: number; coins: number; item: ItemKind | null; itemN: number; rolling: ItemKind | null; shield: boolean;
  q: { text: string; answers: string[]; dist: number; lane: number } | null;
  dots: { x: number; z: number; color: string; me: boolean }[];
  standings: { name: string; color: string; me: boolean; points: number }[];
  rivalsReady: boolean; waiting: boolean; gpRace: number; mapPath: string;
  /** Live class mode: my score and everybody's, best first. */
  live: { score: number; right: number; wrong: number; bank: number; rows: LiveRow[]; spectator: boolean; focus: string } | null;
}
export interface Toast { id: number; text: string; sub?: string; color: string }

/* ---- live class mode: the race as the network sees it ---- */
export interface LiveEntry { peer: string; name: string; toon: string }
export interface LiveCfg { track: TrackId; laps: number; level: RunLevel; items: boolean; roster: LiveEntry[]; race: number }
/** This student's kart, sent to the teacher's screen a few times a second. */
export interface LiveState { x: number; y: number; z: number; yaw: number; spd: number; drift: number; flags: number; dist: number; fin: boolean; ft: number; bank: number; right: number; wrong: number }
export interface LiveFinish { time: number; right: number; wrong: number; bank: number; done: boolean }
/** What the game sends out (the network layer delivers it). */
export interface LiveOut {
  state(s: LiveState): void;
  finish(f: LiveFinish): void;
  hit(peer: string, kind: 'plane' | 'ink'): void;
  ink(s: number, d: number): void;
  bell(victims: string[]): void;
}
export interface LiveRow { name: string; color: string; me: boolean; score: number; right: number; wrong: number; bank: number; fin: boolean }
export interface TouchState { left: boolean; right: boolean; gas: boolean; brake: boolean; drift: boolean; item: boolean }

const TIER_COLORS = [new THREE.Color(1.3, 1.05, 0.6), new THREE.Color(0.35, 0.8, 2.0), new THREE.Color(2.0, 0.85, 0.2), new THREE.Color(1.6, 0.45, 2.0)];
const DT = 1 / 120;
export const GP_POINTS = [15, 12, 10, 8, 6, 4, 2, 1];
/** The two Grand Prix cups: the original four tracks, and the four world cities. */
export const CUPS: Record<Cup, TrackId[]> = { classic: ['campus', 'beach', 'roofs', 'neon'], world: ['london', 'newyork', 'tokyo', 'rio'] };
const N_RIVALS = 7;
const PODIUM_H = [1.6, 1.05, 0.65];
const store = {
  get(id: string): { lap: number; total: number } | null { try { const v = JSON.parse(localStorage.getItem('racers:best:' + id) || 'null'); return v && typeof v.lap === 'number' ? v : null; } catch { return null; } },
  set(id: string, v: { lap: number; total: number }) { try { localStorage.setItem('racers:best:' + id, JSON.stringify(v)); } catch { /* ignore */ } },
};
const loadSettings = (): Settings => {
  const d: Settings = { mode: 'gp', track: 'campus', level: 'A2', difficulty: 'normal', cup: 'classic' };
  try {
    const v = JSON.parse(localStorage.getItem('racers:settings') || 'null');
    if (v && typeof v === 'object') return { ...d, ...v, track: TRACKS.some((x) => x.id === v.track) ? v.track : 'campus', cup: v.cup === 'world' ? 'world' : 'classic', mode: v.mode === 'live' ? 'gp' : v.mode ?? 'gp' };
  } catch { /* ignore */ }
  return d;
};

export class RaceGame {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(66, 1, 0.1, 2600);
  track!: Track;
  info!: TrackInfo;
  private meshes: TrackMeshes | null = null;
  private scenery: Scenery | null = null;
  private items: ItemWorld | null = null;
  private gates: Gates | null = null;
  private line: Line | null = null;
  private sky: THREE.Mesh | null = null;
  private sun = new THREE.DirectionalLight(0xfff1dc, 2.7);
  private hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5d8a46, 0.85);
  private envTex: THREE.Texture | null = null;
  private composer: EffectComposer | null = null;
  private bloom: UnrealBloomPass | null = null;
  private bloomOk = true;
  private worldMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, side: THREE.DoubleSide });
  readonly racers: Racer[] = [];
  readonly me: Racer;
  private sparks = new Particles(1000, true);
  private smoke = new Particles(800, false);
  private skids = new Skids(2200, 16);
  private lines = new SpeedLines();
  private dpr: number;
  private raf = 0;
  private last = 0;
  private acc = 0;
  private ro: ResizeObserver;
  private offs: (() => void)[] = [];
  private frames: number[] = [];
  private qualityAt = 0;

  state: RaceState = 'loading';
  settings: Settings = loadSettings();
  private prevState: RaceState = 'menu';
  toonId: string;
  private countT = 0;
  private firstPress = -1;
  private raceT = 0;
  /** Physics clock (advances with every step, also in tests). */
  private clock = 0;
  private finishWait = 0;
  private shake = 0;
  private keys = new Set<string>();
  private touch: TouchState = { left: false, right: false, gas: false, brake: false, drift: false, item: false };
  private input: KartInput = { ...NO_INPUT };
  private itemPressed = false;
  private lookBack = false;
  private results: Results | null = null;
  private record: { lap: number; total: number } | null = null;
  private review: Review[] = [];
  private camPos = new THREE.Vector3(0, 5, -10);
  private camLook = new THREE.Vector3();
  private fov = 66;
  private menuA = 0;
  private time = 0;
  private rivalIds: string[] = [];
  private rivalsLoading: Promise<void> | null = null;
  private rivalsReady = false;
  private pendingStart = false;
  private gpRace = 0;
  private podium: THREE.Group | null = null;
  private podiumS = 30;
  private rollShow: ItemKind | null = null;
  private lastPlace = 8;
  autoDrive = false;
  /** Live class mode: a student's game ('player') or the teacher's screen ('spectator'). */
  readonly live: { role: 'player' | 'spectator'; out: LiveOut | null } | null;
  private liveItems = true;
  private liveSendAt = 0;
  private focus: Racer | null = null;
  private focusAt = 0;
  private focusK = 0;
  /** Touch screens: accelerate by itself (the big button is then the drift button). */
  autoGas = false;
  mapPath = '';
  private mapBox = { x0: 0, z0: 0, w: 1, h: 1 };

  onHud: ((h: Hud) => void) | null = null;
  onToast: ((t: Toast) => void) | null = null;
  private toastId = 0;
  private hudAt = 0;

  constructor(private host: HTMLElement, opts: { toon: string; live?: 'player' | 'spectator' }) {
    this.toonId = opts.toon;
    this.live = opts.live ? { role: opts.live, out: null } : null;
    const r = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    r.setPixelRatio(this.dpr);
    r.shadowMap.enabled = true;
    r.shadowMap.type = THREE.PCFShadowMap;
    r.toneMapping = THREE.NeutralToneMapping;
    r.toneMappingExposure = 1.02;
    r.domElement.style.touchAction = 'none';
    r.domElement.style.display = 'block';
    host.appendChild(r.domElement);
    this.renderer = r;

    const s = this.scene;
    s.add(this.hemi);
    const sc = this.sun.shadow;
    sc.mapSize.set(2048, 2048);
    Object.assign(sc.camera, { left: -34, right: 34, top: 34, bottom: -34, near: 1, far: 240 });
    sc.bias = -0.0005; sc.normalBias = 0.04;
    this.sun.castShadow = true;
    s.add(this.sun, this.sun.target);
    s.add(this.sparks.points, this.smoke.points, this.skids.mesh, this.lines.mesh);

    const pInfo = TOONS.find((x) => x.id === opts.toon) ?? TOONS[0];
    if (this.live) this.settings = { ...this.settings, mode: 'live' };
    this.loadTrack(this.live ? 'campus' : this.settings.mode === 'gp' ? this.cup[0] : this.settings.track, false);
    this.me = makeRacer(0, this.track, pInfo, true, this.newFlames());
    this.racers.push(this.me);
    this.placeGrid();

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    this.setupBloom();
    this.bindInput();
    if (this.live?.role === 'spectator') this.state = 'menu';
    else void this.setToon(this.toonId).then(() => { if (this.state === 'loading') { this.state = 'menu'; this.emit(); } });
    if (this.settings.mode !== 'time' && !this.live) void this.prepareRivals();

    this.last = performance.now();
    const tick = (tm: number) => {
      this.raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (tm - this.last) / 1000);
      this.last = tm;
      this.frame(dt, tm);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private newFlames() { const f = new Flames(); this.scene.add(f.group); return f; }
  private bias(r: Racer) { return ((r.idx - 1) / (N_RIVALS - 1)) * 2 - 1; }

  /* ------------------------------------------------------------ track */
  /** Build a track (road, scenery, items, gates, sky and light) and put the karts on the grid. */
  loadTrack(id: TrackId, grid = true) {
    if (this.info?.id === id && this.track) { if (grid) this.placeGrid(); return; }
    const info = trackInfo(id);
    this.info = info;
    if (this.meshes) {
      this.scene.remove(this.meshes.group);
      this.meshes.group.traverse((o) => { const m = o as THREE.Mesh; if (!m.isMesh) return; m.geometry.dispose(); const mm = m.material as THREE.MeshStandardMaterial; if (mm !== this.worldMat) { mm.map?.dispose(); mm.emissiveMap?.dispose(); mm.dispose(); } });
    }
    if (this.scenery) { this.scene.remove(this.scenery.group); this.scenery.dispose(); }
    if (this.gates) { this.scene.remove(this.gates.group); this.gates.dispose(); }
    this.clearPodium();
    this.track = new Track(info.def);
    this.line = racingLine(this.track);
    for (const r of this.racers) {
      r.kart = new Kart(this.track);
      if (r.bot) r.bot = new Bot(SKILL[this.settings.difficulty], this.bias(r), this.track, this.line);
    }
    this.meshes = buildTrackMeshes(this.track, this.worldMat, info.style);
    this.scene.add(this.meshes.group);
    this.scenery = info.build(this.track);
    this.scene.add(this.scenery.group);
    this.buildItems();
    this.gates = new Gates(this.track, this.settings.level);
    this.scene.add(this.gates.group);
    this.applyLook();
    this.record = store.get(this.track.def.id);
    // minimap outline (square box so the shape keeps its proportions)
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const f of this.track.frames) { x0 = Math.min(x0, f.p.x); x1 = Math.max(x1, f.p.x); z0 = Math.min(z0, f.p.z); z1 = Math.max(z1, f.p.z); }
    const span = Math.max(x1 - x0, z1 - z0);
    this.mapBox = { x0: (x0 + x1) / 2 - span / 2, z0: (z0 + z1) / 2 - span / 2, w: span, h: span };
    const mb = this.mapBox;
    this.mapPath = this.track.frames.filter((_, i) => i % 6 === 0).map((f, i) => `${i ? 'L' : 'M'}${(((f.p.x - mb.x0) / mb.w) * 100).toFixed(1)} ${(((f.p.z - mb.z0) / mb.h) * 100).toFixed(1)}`).join(' ') + 'Z';
    // the podium stands on the start straight
    this.podiumS = this.track.length - 30;
    setSong(id);
    if (grid) this.placeGrid();
  }

  private buildItems() {
    if (this.items) { this.scene.remove(this.items.group); this.items.dispose(); }
    const on = this.live ? this.liveItems : this.settings.mode !== 'time';
    this.items = new ItemWorld(this.track, { boxes: on, coins: on });
    this.scene.add(this.items.group);
  }

  private applyLook() {
    const L = this.info.look, s = this.scene;
    s.background = new THREE.Color(L.sky.fog);
    s.fog = new THREE.Fog(L.sky.fog, L.fogNear, L.fogFar);
    if (this.sky) { this.scene.remove(this.sky); this.sky.geometry.dispose(); (this.sky.material as THREE.Material).dispose(); }
    this.sky = skyDome(L.sky);
    this.sky.scale.setScalar(2.7);
    s.add(this.sky);
    this.sun.color.setHex(L.sun); this.sun.intensity = L.sunI;
    this.hemi.color.setHex(L.hemiSky); this.hemi.groundColor.setHex(L.hemiGround); this.hemi.intensity = L.hemiI;
    this.renderer.toneMappingExposure = L.exposure;
    const pm = new THREE.PMREMGenerator(this.renderer);
    const envScene = new THREE.Scene();
    envScene.add(skyDome(L.sky));
    const ground = new THREE.Mesh(new THREE.CircleGeometry(300, 24), new THREE.MeshBasicMaterial({ color: L.envGround }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -20;
    envScene.add(ground);
    this.envTex?.dispose();
    this.envTex = pm.fromScene(envScene, 0.02, 0.1, 1000).texture;
    s.environment = this.envTex;
    s.environmentIntensity = L.envI;
    pm.dispose();
    envScene.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
    if (this.bloom) { this.bloom.strength = L.bloom[0]; this.bloom.radius = L.bloom[1]; this.bloom.threshold = L.bloom[2]; }
  }

  /** Grid slots: two columns, staggered. The player starts at the back of the first race; in a
      Grand Prix the points leader starts at the back of the next ones. */
  private placeGrid() {
    const tr = this.track, L = tr.length;
    const order = this.gridOrder();
    order.forEach((r, k) => {
      const row = Math.floor(k / 2), sd = k % 2 ? 1 : -1;
      const s = L - 7 - row * 6.5 - (k % 2) * 3;
      r.kart.place(s, sd * 2.5);
      r.dist = s - L; r.prevS = r.kart.s;
      r.lapTimes = []; r.lapStart = 0; r.finished = false; r.finishT = 0; r.coins = 0; r.item = null; r.itemN = 0; r.roll = 0;
      r.shield = false; r.hurtT = 0; r.respawnAt = 0; r.wrongT = 0; r.stuckT = 0; r.right = 0; r.wrong = 0; r.bank = 0;
      if (r.remote) r.remote.length = 0;
      r.kart.topMul = 1;
      r.kart.lateDrift = r.player;
      if (r.view) { r.view.root.visible = r.player || this.settings.mode !== 'time'; r.view.update(0.016, r.kart, 0, false); }
    });
    this.items?.reset();
    this.skids.clear(); this.sparks.clear(); this.smoke.clear();
    rank(this.field);
  }
  private gridOrder() {
    const rs = this.field;
    if (rs.length === 1) return rs;
    if (this.live) return this.liveOrder.filter((r) => rs.includes(r)); // the teacher's list order
    if (this.settings.mode === 'gp' && this.gpRace > 0) return [...rs].sort((a, b) => a.points - b.points || b.idx - a.idx);
    return [...rs.filter((r) => !r.player), this.me];
  }

  /* ------------------------------------------------------------ setup */
  private setupBloom() {
    this.composer?.dispose();
    this.composer = null; this.bloom = null;
    if (!this.bloomOk) return;
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(this.renderer, rt);
    c.addPass(new RenderPass(this.scene, this.camera));
    const b = this.info.look.bloom;
    this.bloom = new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), b[0], b[1], b[2]);
    c.addPass(this.bloom);
    c.addPass(new OutputPass());
    c.setPixelRatio(this.dpr);
    c.setSize(w, h);
    this.composer = c;
  }

  private resize() {
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    this.renderer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.composer?.setSize(w, h);
    const scale = (h * this.dpr) / 2;
    this.sparks.mat.uniforms.uScale.value = scale;
    this.smoke.mat.uniforms.uScale.value = scale;
    this.lines.mat.uniforms.uAspect.value = w / h;
  }

  async setToon(id: string) {
    this.toonId = id;
    try { localStorage.setItem('racers:toon', id); } catch { /* ignore */ }
    const info = TOONS.find((x) => x.id === id) ?? TOONS[0];
    Object.assign(this.me, { toonId: info.id, name: info.name, color: info.color });
    const actor = await ToonActor.create(id);
    if (this.toonId !== id) { actor.dispose(); return; }
    this.me.view?.dispose();
    const v = new KartView(info.color, info.name);
    v.setDriver(actor);
    this.me.view = v;
    this.scene.add(v.root);
    v.update(0.016, this.me.kart, 0, false);
    // the rivals must not be the same teacher
    if (!this.live && this.rivalIds.includes(id)) { this.rivalIds = []; this.rivalsReady = false; this.rivalsLoading = null; if (this.settings.mode !== 'time') void this.prepareRivals(); }
    this.emit();
  }

  /** Load seven rival teachers (light models) and their karts. */
  prepareRivals(): Promise<void> {
    if (this.rivalsReady && this.rivalIds.length) return Promise.resolve();
    if (this.rivalsLoading) return this.rivalsLoading;
    const pool = TOONS.filter((x) => x.id !== this.toonId).sort(() => Math.random() - 0.5).slice(0, N_RIVALS);
    this.rivalIds = pool.map((x) => x.id);
    const want = this.rivalIds.join();
    this.rivalsLoading = (async () => {
      const actors = await Promise.all(pool.map((p) => ToonActor.create(p.id, true).catch(() => null)));
      if (want !== this.rivalIds.join()) { actors.forEach((a) => a?.dispose()); return; }
      for (const r of this.racers.filter((x) => !x.player)) { r.view?.dispose(); r.flames.group.removeFromParent(); r.flames.dispose(); }
      this.racers.length = 1;
      pool.forEach((p, i) => {
        const r = makeRacer(i + 1, this.track, p, false, this.newFlames());
        const v = new KartView(p.color, p.name);
        const a = actors[i];
        if (a) v.setDriver(a);
        r.view = v;
        this.scene.add(v.root);
        r.bot = new Bot(SKILL[this.settings.difficulty], this.bias(r), this.track, this.line!);
        this.racers.push(r);
      });
      this.rivalsReady = true;
      this.rivalsLoading = null;
      if (this.state === 'menu' || this.state === 'loading') this.placeGrid();
      this.showRivals(this.settings.mode !== 'time');
      this.emit();
      if (this.pendingStart) { this.pendingStart = false; this.start(); }
    })();
    return this.rivalsLoading;
  }

  private showRivals(on: boolean) { for (const r of this.racers) if (!r.player) { if (r.view) r.view.root.visible = on; r.flames.group.visible = false; } }
  /** The tracks of the chosen Grand Prix cup. */
  get cup() { return CUPS[this.settings.cup]; }
  private get field() {
    if (this.live) return this.live.role === 'spectator' ? this.racers.filter((r) => r.remote) : this.racers;
    return this.settings.mode === 'time' ? [this.me] : this.racers;
  }
  /** The karts simulated on this device (not the other students'). */
  private get local() { return this.field.filter((r) => !r.remote); }
  private get spectator() { return this.live?.role === 'spectator'; }

  /** Change the menu choices (mode, track, level, difficulty). */
  configure(s: Partial<Settings>) {
    if (this.state !== 'menu' && this.state !== 'loading') return;
    const prev = this.settings;
    this.settings = { ...prev, ...s };
    try { localStorage.setItem('racers:settings', JSON.stringify(this.settings)); } catch { /* ignore */ }
    const want = this.settings.mode === 'gp' ? this.cup[0] : this.settings.track;
    const changedTrack = want !== this.info.id;
    if (changedTrack) this.loadTrack(want);
    if (s.mode && s.mode !== prev.mode) {
      if (!changedTrack) this.buildItems();
      if (s.mode !== 'time') void this.prepareRivals();
      this.showRivals(s.mode !== 'time');
      this.placeGrid();
    }
    if (s.level && this.gates) this.gates.setLevel(s.level);
    if (s.difficulty) for (const r of this.racers) if (r.bot) r.bot = new Bot(SKILL[s.difficulty], this.bias(r), this.track, this.line!);
    this.emit();
  }

  /* ------------------------------------------------------------ input */
  private bindInput() {
    const map: Record<string, string> = { arrowup: 'gas', w: 'gas', arrowdown: 'brake', s: 'brake', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', ' ': 'drift', shift: 'drift', k: 'drift', c: 'back', e: 'item', x: 'item', l: 'item', control: 'item' };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (map[k]) { this.keys.add(map[k]); if (k.startsWith('arrow') || k === ' ') e.preventDefault(); unlock(); }
      if (e.repeat) return;
      if (k === 'escape' || k === 'p') this.togglePause();
      if (k === 'r' && this.state === 'race') this.respawn(this.me);
      if (k === 'enter' && this.state === 'menu') this.start();
    };
    const up = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (map[k]) this.keys.delete(map[k]); };
    const blur = () => { this.keys.clear(); if (this.state === 'race') this.togglePause(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    this.offs.push(() => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); });
  }

  setTouch(tt: Partial<TouchState>) { Object.assign(this.touch, tt); unlock(); }

  private readInput() {
    const k = this.keys, tc = this.touch;
    let steer = (k.has('right') || tc.right ? 1 : 0) - (k.has('left') || tc.left ? 1 : 0);
    let gas = k.has('gas') || tc.gas ? 1 : 0, brake = k.has('brake') || tc.brake ? 1 : 0;
    let drift = k.has('drift') || tc.drift;
    // on touch screens the drift button also drives; with automatic gas the kart always does
    // (not during the countdown: hold the big button there for a rocket start)
    if (tc.drift) gas = 1;
    if (this.autoGas && this.state !== 'countdown' && !brake) gas = 1;
    let item = k.has('item') || tc.item;
    this.lookBack = k.has('back');
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] ?? 0;
      if (Math.abs(ax) > 0.15) steer = ax;
      if (p.buttons[14]?.pressed) steer = -1;
      if (p.buttons[15]?.pressed) steer = 1;
      gas = Math.max(gas, p.buttons[0]?.pressed ? 1 : 0, p.buttons[7]?.value ?? 0);
      brake = Math.max(brake, p.buttons[1]?.pressed ? 1 : 0, p.buttons[6]?.value ?? 0);
      drift = drift || !!p.buttons[5]?.pressed;
      item = item || !!(p.buttons[4]?.pressed || p.buttons[2]?.pressed);
      if (p.buttons[3]?.pressed) this.lookBack = true;
      if (p.buttons[9]?.pressed && this.state === 'menu') this.start();
    }
    this.input = { throttle: gas, brake, steer: THREE.MathUtils.clamp(steer, -1, 1), drift };
    if (item && !this.itemPressed && this.state === 'race') this.useItem(this.me);
    this.itemPressed = item;
    return this.input;
  }

  /* ------------------------------------------------------------ flow */
  start() {
    if (this.state !== 'menu' && this.state !== 'finish') return;
    unlock();
    sfx.click();
    if (this.settings.mode !== 'time' && !this.rivalsReady) { this.pendingStart = true; void this.prepareRivals(); this.emit(); return; }
    if (this.state === 'menu') {
      this.gpRace = 0;
      for (const r of this.racers) r.points = 0;
      if (this.settings.mode === 'gp') this.loadTrack(this.cup[0], false);
    }
    this.begin();
  }
  /** Countdown on the current track. */
  private begin() {
    this.clearPodium();
    this.placeGrid();
    this.results = null;
    this.review = [];
    this.raceT = 0;
    this.finishWait = 0;
    this.countT = 3.9;
    this.firstPress = -1;
    this.state = 'countdown';
    const k = this.me.kart;
    this.camPos.copy(k.pos).add(new THREE.Vector3(0, 9, 0)).addScaledVector(new THREE.Vector3(Math.sin(k.yaw), 0, Math.cos(k.yaw)), -16);
    for (const r of this.racers) if (r.view) { r.view.cheer = false; r.view.face = 'grin'; }
    this.scenery?.lamps.forEach((m) => { m.color.setHex(0x331111); m.emissive.setHex(0); });
    this.gates?.sites.forEach((g) => this.gates!.ask(g));
    setMusicFast(false);
    startMusic();
    this.lastPlace = this.me.place;
    this.emit();
  }
  /** Don't wait for the others: place them by where they are now. */
  skipWait() { if (this.state === 'finish' && this.results && !this.results.final) this.finalize(); }
  /** Grand Prix: on to the next track (or the podium after the last one). */
  nextRace() {
    if (this.state !== 'finish' || this.settings.mode !== 'gp' || !this.results?.final) return;
    if (this.gpRace >= this.cup.length - 1) { this.showPodium(); return; }
    this.gpRace++;
    this.loadTrack(this.cup[this.gpRace], false);
    this.begin();
  }
  restart() {
    if (this.state === 'paused') this.state = this.prevState;
    if (this.settings.mode === 'gp') { this.state = 'menu'; this.start(); return; }
    this.state = 'menu';
    this.begin();
  }
  toMenu() {
    if (this.state === 'paused') this.state = this.prevState;
    this.state = 'menu';
    this.gpRace = 0;
    this.clearPodium();
    const want = this.live ? this.info.id : this.settings.mode === 'gp' ? this.cup[0] : this.settings.track;
    this.loadTrack(want);
    this.showRivals(this.settings.mode !== 'time');
    stopMusic();
    engineSet(0, 0, false, true, false, false);
    for (const r of this.racers) if (r.view) { r.view.cheer = false; r.view.face = 'smile'; }
    this.emit();
  }
  togglePause() {
    if (this.live) return; // the class race goes on for everybody
    if (this.state === 'race' || this.state === 'countdown') { this.prevState = this.state; this.state = 'paused'; stopMusic(false); engineSet(0, 0, false, true, false, false); this.emit(); }
    else if (this.state === 'paused') { this.state = this.prevState; this.last = performance.now(); startMusic(); this.emit(); }
  }
  respawn(r: Racer) {
    const k = r.kart, tr = this.track;
    let s = (k.safeS - 6 + tr.length) % tr.length;
    // fell into a gap: come back on the far side (a standing start could not clear it)
    for (const g of tr.gaps) if (tr.ahead(g.s0 - 30, k.s) < g.s1 - g.s0 + 42 || tr.ahead(g.s0 - 30, k.safeS) < 32) s = (g.s1 + 5) % tr.length;
    k.place(s, THREE.MathUtils.clamp(k.d, -2, 2));
    k.pos.y += 2.2;
    k.grounded = false;
    k.vel.y = 0;
    r.prevS = k.s;
    r.respawnAt = 0;
    if (r.player) { this.skids.mark(0, null); this.skids.mark(1, null); sfx.respawn(); }
  }

  private toast(text: string, color: string, sub?: string) { this.onToast?.({ id: ++this.toastId, text, color, sub }); }

  /* ------------------------------------------------------------ frame */
  private frame(dt: number, tm: number) {
    this.time += dt;
    if (this.live) this.updateRemotes(dt);
    const inp = this.readInput();
    const k = this.camTarget().kart;
    const field = this.field;
    if (this.state === 'countdown') {
      const before = this.countT;
      this.countT -= dt;
      for (const mark of [3, 2, 1]) if (before > mark && this.countT <= mark) { sfx.beep(false); const lm = this.scenery?.lamps[3 - mark]; lm?.color.setHex(0xff2222); lm?.emissive.setRGB(2.5, 0.1, 0.1); this.emit(); }
      if (inp.throttle > 0) { if (this.firstPress < 0) this.firstPress = this.countT; } else this.firstPress = -1;
      engineSet(inp.throttle * 0.45, inp.throttle, false, true, false, true);
      if (this.countT <= 0) this.go();
    } else if (this.state === 'race' || this.state === 'finish') {
      this.acc += dt;
      while (this.acc >= DT) { this.acc -= DT; this.step(DT, inp); }
      this.handleEvents();
    }
    if (this.live?.role === 'player' && this.live.out && (this.state === 'countdown' || this.state === 'race' || this.state === 'finish') && tm - this.liveSendAt > (this.me.finished ? 400 : 150)) {
      this.liveSendAt = tm;
      const me = this.me, mk = me.kart;
      this.live.out.state({ x: mk.pos.x, y: mk.pos.y, z: mk.pos.z, yaw: mk.yaw, spd: mk.fwd, drift: mk.drift, flags: (mk.boostT > 0 ? 1 : 0) | (mk.spinT > 0 ? 2 : 0) | (!mk.grounded ? 4 : 0) | (me.shield ? 8 : 0), dist: me.dist, fin: me.finished, ft: me.finishT, bank: me.bank, right: me.right, wrong: me.wrong });
    }
    if (this.state === 'podium') this.podiumFrame(dt);
    this.scenery?.update?.(dt, this.time);
    this.items?.update(dt, this.time, this.live ? this.local : field, this.itemEvents, this.state === 'race' || this.state === 'finish', this.live ? field.filter((r) => r.remote) : []);
    this.gates?.update(dt, this.time);

    // visuals
    const braking = inp.brake > 0 && this.me.kart.fwd > 1 && this.state === 'race';
    if (this.state !== 'podium') for (const r of field) {
      const v = r.view;
      if (!v) continue;
      v.update(dt, r.kart, tm / 1000, r.player ? braking : false);
      if (this.state === 'race' && !r.finished) {
        const kk = r.kart;
        v.face = kk.spinT > 0 || kk.falling || (!kk.grounded && kk.airT > 0.5) ? 'surprised' : kk.boostT > 0 ? 'happy' : 'grin';
      }
    }
    this.effects(dt, tm / 1000);
    this.updateCamera(dt);
    if (this.meshes) this.meshes.pads.uniforms.uTime.value = tm / 1000;
    this.sky?.position.copy(this.camera.position);
    const focus = this.state === 'podium' ? this.track.pointAt(this.podiumS, 0) : k.pos;
    this.sun.position.copy(focus).add(new THREE.Vector3(...this.info.look.sunOffset));
    this.sun.target.position.copy(focus);
    for (const w of this.scenery?.waters ?? []) { const m = w.material as THREE.MeshPhysicalMaterial; m.normalMap?.offset.set(tm / 26000, tm / 31000); }
    for (const o of this.scenery?.oceans ?? []) o.uTime.value = this.time;
    if (this.spectator) engineSet(0, 0, false, true, false, false);
    else if (this.state === 'race' || this.state === 'finish') engineSet(k.speed / KART.maxSpeed, this.state === 'race' ? inp.throttle : 0.4, !!k.drift, k.grounded, k.boostT > 0, true);
    if (this.composer) this.composer.render(dt); else this.renderer.render(this.scene, this.camera);
    this.adapt(dt, tm);
    if (tm - this.hudAt > 80) { this.hudAt = tm; this.emit(); }
  }

  private go() {
    this.state = 'race';
    this.scenery?.lamps.forEach((m) => { m.color.setHex(0x22ff55); m.emissive.setRGB(0.2, 2.6, 0.5); });
    sfx.beep(true);
    const fp = this.firstPress;
    if (this.input.throttle > 0 && fp >= 0) {
      if (fp <= 0.55) { this.me.kart.boost(1.3, 'start'); this.toast(t('PERFECT START!', '¡SALIDA PERFECTA!'), '#ffd23f'); }
      else if (fp > 1.6) { this.me.kart.spin(0.8); this.toast(t('TOO EARLY!', '¡MUY PRONTO!'), '#ff6b6b', t('Wait for the last light to go out', 'Espera a que se apague la última luz')); }
    }
    // some bots nail the start too
    const chance = { easy: 0.25, normal: 0.45, hard: 0.7 }[this.settings.difficulty];
    for (const r of this.field) { r.lapStart = 0; if (r.bot && Math.random() < chance) r.kart.boost(0.8 + Math.random() * 0.5, 'start'); }
    this.emit();
  }

  /** One physics step for every kart, then the rules. */
  private step(dt: number, inp: KartInput) {
    const field = this.field, tr = this.track, me = this.me;
    this.clock += dt;
    // the clock keeps running for the others after the player finishes
    if (this.state === 'race' || (this.state === 'finish' && !this.results?.final)) this.raceT += dt;
    const ranked = rank(field);
    const obstacles = this.obstacles();
    const boxes = this.items?.liveBoxes() ?? [];
    const pads = tr.pads.map((p) => ({ s0: p.s0, d: p.d }));
    for (const r of field) {
      if (r.remote) continue;
      const k = r.kart;
      // top speed: coins, the bots' skill and a gentle catch-up towards the player
      let mul = 1 + r.coins * 0.0055;
      if (r.bot) {
        const gap = me.dist - r.dist; // + = the bot is behind the player
        const rub = { easy: 0.04, normal: 0.06, hard: 0.08 }[this.settings.difficulty];
        mul *= r.bot.skill.speed * (1 + (gap > 0 ? Math.min(1, gap / 120) * rub : Math.max(-1, gap / 120) * 0.03));
      }
      k.topMul = mul;
      r.hurtT = Math.max(0, r.hurtT - dt);
      if (r.roll > 0) { r.roll -= dt; if (r.roll <= 0) this.giveItem(r); }
      let i: KartInput = NO_INPUT;
      if (r.player) {
        i = r.finished || this.autoDrive ? autopilot(k, tr) : inp;
        if (r.finished) i = { ...i, throttle: 0.6 };
      } else if (r.bot) {
        const ix = ranked.indexOf(r);
        const ahead = ix > 0 ? tr.ahead(k.s, ranked[ix - 1].kart.s) : Infinity;
        const behind = ix < ranked.length - 1 ? tr.ahead(ranked[ix + 1].kart.s, k.s) : Infinity;
        const g = this.gates?.ahead(k.s, 110) ?? null;
        const lap = Math.floor(Math.max(0, r.dist) / tr.length);
        const out = r.bot.drive(k, {
          t: this.clock, gate: g ? { s: g.g.s, lanes: g.g.lanes, correct: g.g.correct, id: g.g.id * 100000 + g.g.round * 10 + lap } : null,
          obstacles, boxes, pads, aheadGap: ahead, behindGap: behind, place: r.place, item: r.item, itemN: r.itemN, racing: this.state === 'race' && !r.finished,
        });
        i = r.finished ? { ...out, throttle: 0.6, drift: false } : out;
        if (out.useItem && !r.finished && this.state === 'race') this.useItem(r);
      }
      k.step(dt, i);
    }
    const local = this.live ? this.local : field;
    this.collide(local);
    for (const r of local) this.raceLogic(r, dt);
    this.hazards(local);
    // fell off: back on the track after a second
    for (const r of local) {
      if (!r.kart.falling) continue;
      if (!r.respawnAt) r.respawnAt = this.clock + 1.0;
      else if (this.clock >= r.respawnAt) this.respawn(r);
    }
    if (this.state === 'race' && me.place !== this.lastPlace) { if (this.raceT > 2) sfx.place(me.place < this.lastPlace); this.lastPlace = me.place; }
    if (this.state === 'finish' && !this.live) {
      this.finishWait += dt;
      if (!this.results?.final && (field.every((r) => r.finished) || this.finishWait > 22)) this.finalize();
    }
  }

  /** What the bots steer around: ink puddles and the moving hazards. */
  private obstacles(): Obstacle[] {
    const out: Obstacle[] = [];
    for (const ik of this.items?.inks ?? []) out.push({ s: ik.s, d: ik.d, r: 1.3 });
    // lasers switch on without much warning: the bots keep to the free half either way
    for (const h of this.scenery?.hazards ?? []) if (h.on || h.kind === 'laser') out.push({ s: h.s, d: h.d, r: h.hd + 0.4 });
    return out;
  }

  /** Kart-to-kart contact: push apart and trade some speed (a boosting kart shoves harder). */
  private collide(rs: Racer[]) {
    for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) {
      const a = rs[i].kart, b = rs[j].kart;
      const dx = b.pos.x - a.pos.x, dz = b.pos.z - a.pos.z;
      if (Math.abs(dx) > 1.8 || Math.abs(dz) > 1.8 || Math.abs(a.pos.y - b.pos.y) > 1.2) continue;
      const d = Math.hypot(dx, dz);
      if (d >= 1.55 || d < 1e-4) continue;
      const nx = dx / d, nz = dz / d, push = (1.55 - d) / 2;
      a.pos.x -= nx * push; a.pos.z -= nz * push; b.pos.x += nx * push; b.pos.z += nz * push;
      const va = a.vel.x * nx + a.vel.z * nz, vb = b.vel.x * nx + b.vel.z * nz;
      const rel = va - vb;
      if (rel <= 0) continue;
      const wa = a.boostT > 0 ? 0.35 : 1, wb = b.boostT > 0 ? 0.35 : 1;
      const imp = rel * 0.95;
      a.vel.x -= nx * imp * (wa / (wa + wb)); a.vel.z -= nz * imp * (wa / (wa + wb));
      b.vel.x += nx * imp * (wb / (wa + wb)); b.vel.z += nz * imp * (wb / (wa + wb));
      if ((rs[i].player || rs[j].player) && rel > 2.5) { sfx.bump(); this.shake = Math.max(this.shake, Math.min(0.2, rel * 0.02)); }
    }
  }

  private hazards(rs: Racer[]) {
    const hz = this.scenery?.hazards;
    if (!hz || this.state !== 'race') return;
    for (const h of hz) {
      if (!h.on) continue;
      for (const r of rs) {
        const k = r.kart;
        if (r.hurtT > 0 || !k.grounded || r.finished) continue;
        const a = this.track.ahead(h.s, k.s), along = Math.min(a, this.track.length - a);
        if (along < h.hs + 0.8 && Math.abs(k.d - h.d) < h.hd + 0.8) this.hit(r, 'hazard', null);
      }
    }
  }

  private raceLogic(r: Racer, dt: number) {
    const k = r.kart, L = this.track.length;
    let delta = k.s - r.prevS;
    if (delta > L / 2) delta -= L; else if (delta < -L / 2) delta += L;
    r.prevS = k.s;
    if (k.falling) delta = 0;
    const prevDist = r.dist;
    const before = Math.floor(r.dist / L);
    r.dist += delta;
    const after = Math.floor(r.dist / L);
    // question gates
    if (this.gates && !r.finished && this.state === 'race' && delta > 0 && r.dist > 0) {
      for (const g of this.gates.sites) {
        const k0 = Math.floor((prevDist - g.s) / L), k1 = Math.floor((r.dist - g.s) / L);
        if (k1 > k0) this.passGate(r, g);
      }
    }
    if (!r.finished && after > before && after >= 1 && after > r.lapTimes.length) {
      const lt = this.raceT - r.lapStart;
      r.lapTimes.push(lt);
      r.lapStart = this.raceT;
      const laps = this.track.def.laps;
      if (r.lapTimes.length >= laps) this.finishRacer(r);
      else if (r.player) {
        const bestSoFar = Math.min(...r.lapTimes);
        const final = r.lapTimes.length === laps - 1;
        sfx.lap(final);
        if (final) { setMusicFast(true); this.toast(t('FINAL LAP!', '¡ÚLTIMA VUELTA!'), '#ff3d6e'); }
        else if (lt <= bestSoFar && r.lapTimes.length > 1) this.toast(t('FASTEST LAP!', '¡VUELTA RÁPIDA!'), '#7dff9a', fmt(lt));
        else this.toast(`${t('LAP', 'VUELTA')} ${r.lapTimes.length + 1}/${laps}`, '#ffffff', fmt(lt));
      }
    }
    const q = k.q;
    if (r.player && q && this.state === 'race') {
      const dot = Math.sin(k.yaw) * q.t.x + Math.cos(k.yaw) * q.t.z;
      r.wrongT = dot < -0.3 && k.speed > 4 ? r.wrongT + dt : 0;
    }
  }

  private passGate(r: Racer, g: GateSite) {
    const gt = this.gates!;
    const lane = gt.laneOf(g, r.kart.d);
    const ok = lane === g.correct;
    if (ok) { r.kart.boost(1.7, 'gate'); r.coins = Math.min(10, r.coins + 3); r.bank += 3; r.right++; } else r.wrong++;
    if (!r.player) return;
    this.review.push({ q: g.q.q, a: g.q.a, picked: g.answers[lane], ok });
    gt.flash(g, ok);
    if (ok) { sfx.right(); this.toast(t('CORRECT!', '¡CORRECTO!'), '#5cff8a', t('Turbo + 3 coins', 'Turbo + 3 monedas')); }
    else { sfx.wrong(); this.toast(t('NOT QUITE', 'CASI'), '#ff8a8a', `${t('Answer', 'Respuesta')}: ${g.q.a}`); }
    // a new question for the next lap, once the player is clear of the gate
    setTimeout(() => { if (this.gates === gt) gt.ask(g); }, 900);
  }

  private finishRacer(r: Racer) {
    r.finished = true;
    r.finishT = this.raceT;
    rank(this.field);
    if (r.player) this.finish();
  }

  private finish(done = true) {
    const me = this.me;
    this.state = 'finish';
    this.finishWait = 0;
    const total = me.finishT, best = me.lapTimes.length ? Math.min(...me.lapTimes) : total;
    const rec = this.record;
    const timed = this.settings.mode === 'time';
    const newBestLap = timed && (!rec || best < rec.lap), newBestTotal = timed && (!rec || total < rec.total);
    if (timed) {
      this.record = { lap: rec ? Math.min(rec.lap, best) : best, total: rec ? Math.min(rec.total, total) : total };
      store.set(this.track.def.id, this.record);
    }
    this.results = { total, laps: [...me.lapTimes], best, newBestLap, newBestTotal, place: me.place, rows: [], review: [...this.review], right: me.right, wrong: me.wrong, final: false, gpRace: this.gpRace, gpOver: false };
    this.fillRows(false);
    sfx.finish();
    setMusicFast(false);
    if (this.live) this.live.out?.finish({ time: total, right: me.right, wrong: me.wrong, bank: me.bank, done });
    const good = me.place <= 3 || timed;
    if (me.view) { me.view.cheer = good; me.view.face = good ? 'happy' : 'smile'; }
    if (this.live) this.toast(t('FINISH!', '¡META!'), '#ffd23f', `${scoreOf(me)} ${t('points', 'puntos')}`);
    else if (this.field.length > 1) this.toast(`${ordinal(me.place)} ${t('PLACE', 'PUESTO')}`, me.place === 1 ? '#ffd23f' : me.place <= 3 ? '#7dff9a' : '#ffffff');
    else this.finalize();
    this.emit();
  }

  /** Everyone is in (or the wait ran out): the final table and the points. */
  private finalize() {
    const field = this.field;
    for (const r of field) if (!r.finished) {
      const left = this.track.def.laps * this.track.length - r.dist;
      r.finished = true;
      r.finishT = this.raceT + Math.max(0.5, left / Math.max(8, r.kart.speed || 20));
    }
    rank(field);
    if (this.settings.mode === 'gp') for (const r of field) r.points += GP_POINTS[r.place - 1] ?? 0;
    if (this.results) { this.results.final = true; this.results.gpOver = this.settings.mode === 'gp' && this.gpRace >= this.cup.length - 1; }
    this.fillRows(true);
    this.emit();
  }

  private fillRows(final: boolean) {
    if (!this.results) return;
    const field = rank(this.field);
    const gp = this.settings.mode === 'gp';
    this.results.rows = field.map((r) => ({ place: r.place, name: r.name, color: r.color, me: r.player, time: r.finished ? r.finishT : null, points: final && gp ? GP_POINTS[r.place - 1] ?? 0 : 0, total: r.points }));
    this.results.place = this.me.place;
  }

  /** Grand Prix standings by points. */
  standings() { return [...(this.live ? this.field : this.racers)].sort((a, b) => b.points - a.points || a.place - b.place); }

  /* ------------------------------------------------------------ items */
  private itemEvents = {
    box: (r: Racer) => {
      if (r.player) sfx.box();
      if (r.item || r.roll > 0) return;
      r.roll = r.player ? 1.5 : 0.8;
    },
    coin: (r: Racer) => { r.coins = Math.min(10, r.coins + 1); r.bank++; if (r.player) sfx.coin(); },
    hit: (r: Racer, kind: 'plane' | 'ink', by: Racer | null) => this.hit(r, kind, by),
  };

  private giveItem(r: Racer) {
    const n = this.field.length;
    const it = rollItem(n > 1 ? (r.place - 1) / (n - 1) : 0.5);
    r.item = it;
    r.itemN = it === 'coffee' ? 3 : 1;
    if (r.player) sfx.got();
  }

  useItem(r: Racer) {
    const it = r.item;
    if (!it || r.roll > 0 || r.kart.falling) return;
    const field = this.field;
    switch (it) {
      case 'plane': {
        const ranked = rank(field);
        const ix = ranked.indexOf(r);
        const target = ix > 0 ? ranked[ix - 1] : null;
        this.items?.firePlane(r, target);
        if (r.player || target?.player) sfx.plane();
        break;
      }
      case 'ink': {
        const ink = this.items?.dropInk(r);
        if (r.player) { sfx.ink(); if (ink) this.live?.out?.ink(ink.s, ink.d); }
        break;
      }
      case 'book': r.shield = true; this.items?.setShield(r, true); if (r.player) sfx.shield(); break;
      case 'coffee': r.kart.boost(1.25, 'item'); if (r.player) { sfx.coffee(); this.shake = Math.max(this.shake, 0.15); } break;
      case 'bell': {
        let rang = 0;
        const victims: string[] = [];
        for (const o of field) {
          if (o === r || o.place >= r.place || o.finished) continue;
          rang++;
          this.items?.ring(o);
          if (o.remote) { if (o.peer) victims.push(o.peer); continue; }
          if (o.shield) { this.breakShield(o); continue; }
          o.kart.slowT = 1.4;
          if (o.coins > 0) { o.coins--; o.bank = Math.max(0, o.bank - 1); }
          if (o.player) { this.toast(t('RECESS BELL!', '¡CAMPANA DEL RECREO!'), '#ffd23f', `${t('rung by', 'la tocó')} ${r.name}`); this.shake = Math.max(this.shake, 0.25); }
        }
        if (r.player || field.some((o) => o.player && o.place < r.place)) sfx.bell();
        if (r.player && rang) this.toast(t('DING DING!', '¡DING DING!'), '#ffd23f', `${rang} ${t('slowed down', 'frenados')}`);
        if (r.player && victims.length) this.live?.out?.bell(victims);
        break;
      }
    }
    r.itemN--;
    if (r.itemN <= 0) { r.item = null; r.itemN = 0; }
  }

  private breakShield(r: Racer) {
    r.shield = false;
    this.items?.setShield(r, false);
    const k = r.kart;
    for (let i = 0; i < 16; i++) this.sparks.emit(k.pos.x, k.pos.y + 0.8, k.pos.z, (Math.random() - 0.5) * 7, Math.random() * 5, (Math.random() - 0.5) * 7, 0.5, 0.22, this.c.setRGB(0.6, 2, 0.9), { grav: 9, drag: 1 });
    if (r.player) sfx.block();
    r.hurtT = 0.8;
  }

  private hit(r: Racer, kind: 'plane' | 'ink' | 'hazard', by: Racer | null) {
    if (r.hurtT > 0 || r.finished) return;
    // another student's kart: their own game spins it (only my planes reach them from here)
    if (r.remote) { if (kind === 'plane' && r.peer && by?.player) { this.live?.out?.hit(r.peer, kind); sfx.got(); this.toast(t('HIT!', '¡LE DISTE!'), '#7dff9a', r.name); } r.hurtT = 1.8; return; }
    if (r.shield && kind !== 'hazard') { this.breakShield(r); return; }
    const k = r.kart;
    k.spin(kind === 'plane' ? 1.1 : 0.9);
    r.hurtT = 1.8;
    const lost = Math.min(r.coins, kind === 'hazard' ? 2 : 3);
    r.coins -= lost;
    r.bank = Math.max(0, r.bank - lost);
    for (let i = 0; i < lost; i++) this.sparks.emit(k.pos.x, k.pos.y + 0.8, k.pos.z, (Math.random() - 0.5) * 6, 4 + Math.random() * 3, (Math.random() - 0.5) * 6, 0.9, 0.35, this.c.setRGB(2, 1.5, 0.2), { grav: 14 });
    for (let i = 0; i < 10; i++) this.smoke.emit(k.pos.x, k.pos.y + 0.5, k.pos.z, (Math.random() - 0.5) * 4, 1 + Math.random() * 2, (Math.random() - 0.5) * 4, 0.6, 0.8, kind === 'ink' ? this.c.setRGB(0.2, 0.18, 0.5) : this.c.setRGB(0.95, 0.95, 0.97), { a: 0.6, drag: 2, grow: 1.4 });
    if (r.player) {
      sfx.hit();
      this.shake = Math.max(this.shake, 0.35);
      const what = kind === 'plane' ? t('Paper plane!', '¡Avión de papel!') : kind === 'ink' ? t('Ink!', '¡Tinta!') : t('Watch out!', '¡Cuidado!');
      this.toast(what, '#ff8a8a', by ? `${t('from', 'de')} ${by.name}` : undefined);
    } else if (by?.player) {
      sfx.got();
      this.toast(t('HIT!', '¡LE DISTE!'), '#7dff9a', r.name);
    }
  }

  /* ------------------------------------------------------------ events and effects */
  private c = new THREE.Color();
  private v1 = new THREE.Vector3(); private v2 = new THREE.Vector3(); private v3 = new THREE.Vector3(); private v4 = new THREE.Vector3();
  private handleEvents() {
    for (const r of this.field) {
      const k = r.kart;
      for (const e of k.events) {
        switch (e.e) {
          case 'tier': r.boostTier = e.tier; if (r.player) sfx.tier(e.tier); break;
          case 'boost':
            r.boostKind = e.kind;
            if (!r.player) break;
            if (e.kind === 'pad') sfx.pad(); else if (e.kind !== 'item') sfx.boost(e.secs > 1);
            if (e.kind === 'mini' && e.secs >= 1.4) this.toast(t('ULTRA TURBO!', '¡ULTRA TURBO!'), '#d36bff');
            this.shake = Math.max(this.shake, 0.18);
            break;
          case 'hop': if (r.player) sfx.hop(); break;
          case 'trick': if (r.player) { sfx.trick(); this.toast(t('TRICK!', '¡TRUCO!'), '#ffd23f'); } break;
          case 'land':
            r.view?.bump(e.v);
            if (r.player) { sfx.land(e.v); this.shake = Math.max(this.shake, Math.min(0.3, e.v * 0.025)); }
            if (e.v > 5) for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; this.smoke.emit(k.pos.x + Math.cos(a) * 0.6, k.pos.y + 0.15, k.pos.z + Math.sin(a) * 0.6, Math.cos(a) * 4, 0.6, Math.sin(a) * 4, 0.6, 1.1, this.c.setRGB(0.92, 0.88, 0.8), { a: 0.5, drag: 3, grow: 1.6 }); }
            break;
          case 'wall': {
            if (r.player) { sfx.wall(e.v); this.shake = Math.max(this.shake, Math.min(0.4, e.v * 0.03)); if (r.view) r.view.face = 'surprised'; }
            const q = k.q;
            if (q) for (let i = 0; i < 12; i++) this.sparks.emit(k.pos.x + q.r.x * Math.sign(q.d) * 0.9, k.pos.y + 0.4, k.pos.z + q.r.z * Math.sign(q.d) * 0.9, (Math.random() - 0.5) * 8, Math.random() * 5, (Math.random() - 0.5) * 8, 0.35, 0.18, this.c.setRGB(2, 1.4, 0.5), { grav: 14, drag: 1 });
            break;
          }
          case 'fall': {
            const wet = !!this.scenery && this.info.look.water && k.pos.y < this.scenery.waterY + 0.5;
            if (wet) {
              if (r.player) sfx.splash();
              for (let i = 0; i < 40; i++) this.smoke.emit(k.pos.x, this.scenery!.waterY + 0.1, k.pos.z, (Math.random() - 0.5) * 6, 4 + Math.random() * 7, (Math.random() - 0.5) * 6, 0.9, 0.6 + Math.random() * 0.6, this.c.setRGB(0.85, 0.95, 1), { a: 0.85, grav: 16, grow: 1 });
            }
            if (r.player && this.state === 'race') this.toast(this.info.look.water ? t('SPLASH!', '¡AL AGUA!') : t('OOPS!', '¡UY!'), '#4fc3ff', t('Back on the track in a second', 'Vuelves a la pista en un segundo'));
            break;
          }
          case 'spin': if (r.player) sfx.spin(); break;
          default: break;
        }
      }
      k.events.length = 0;
    }
  }

  private effects(dt: number, tt: number) {
    const live = this.state === 'race' || this.state === 'finish' || this.state === 'countdown';
    const cam = this.camera.position;
    for (const r of this.field) {
      const k = r.kart, v = r.view;
      if (!v) continue;
      const near = r.player || Math.abs(k.pos.x - cam.x) + Math.abs(k.pos.z - cam.z) < 90;
      if (live && near) {
        v.root.updateMatrixWorld(true);
        const fwdX = Math.sin(k.yaw), fwdZ = Math.cos(k.yaw);
        for (const sd of [-1, 1]) {
          const p = v.rearContact(sd, this.v1);
          const trail = r.idx * 2 + (sd < 0 ? 0 : 1);
          if (k.drift && k.grounded) {
            const col = TIER_COLORS[k.tier];
            const n = k.tier ? (r.player ? 3 : 2) : 1;
            for (let i = 0; i < n; i++) this.sparks.emit(p.x, p.y + 0.08, p.z, -fwdX * 3 + (Math.random() - 0.5) * 3 + sd * k.drift * 1.5, 1 + Math.random() * 3.2, -fwdZ * 3 + (Math.random() - 0.5) * 3, 0.22 + Math.random() * 0.2, (k.tier ? 0.2 : 0.1) + Math.random() * 0.12, col, { grav: 12, drag: 2 });
            if (Math.random() < (r.player ? 0.5 : 0.25)) this.smoke.emit(p.x, p.y + 0.2, p.z, -fwdX * 2 + (Math.random() - 0.5), 0.6 + Math.random() * 0.5, -fwdZ * 2 + (Math.random() - 0.5), 0.7, 0.9, this.c.setRGB(0.93, 0.93, 0.95), { a: 0.3, drag: 1.5, grow: 1.8 });
            if (!r.remote) this.skids.mark(trail, this.v2.set(p.x, p.y + 0.03, p.z));
          } else if (!r.remote) this.skids.mark(trail, null);
          if (k.grounded && k.surface === 'grass' && k.speed > 5 && Math.random() < (r.player ? 0.6 : 0.3)) {
            const g = this.info.look.dust;
            this.smoke.emit(p.x, p.y + 0.2, p.z, -fwdX * 2 + (Math.random() - 0.5) * 2, 1 + Math.random(), -fwdZ * 2 + (Math.random() - 0.5) * 2, 0.6, 0.8, this.c.setRGB(g[0], g[1], g[2]), { a: 0.55, drag: 2, grow: 1.5, grav: 1 });
          }
        }
      }
      // turbo flames (colour by the kind of boost)
      const fl = r.flames;
      const target = live && k.boostT > 0 ? Math.min(1, 0.45 + k.boostT) : 0;
      fl.level += (target - fl.level) * Math.min(1, dt * 14);
      fl.color.copy(r.boostKind === 'mini' ? TIER_COLORS[Math.max(1, r.boostTier)] : r.boostKind === 'gate' ? this.c.setRGB(0.3, 1.8, 0.7) : r.boostKind === 'item' ? this.c.setRGB(1.5, 0.75, 0.25) : this.c.setRGB(1.4, 0.5, 0.08));
      if (fl.level > 0.02 || fl.group.visible) {
        v.exhaustWorld(r.tips);
        v.body.getWorldQuaternion(this.q1);
        fl.update(r.tips, this.q1, tt + r.idx);
        if (k.boostT > 0 && near) for (const tp of r.tips) this.sparks.emit(tp.x, tp.y, tp.z, -Math.sin(k.yaw) * 7 + (Math.random() - 0.5), 0.4 + Math.random() * 0.8, -Math.cos(k.yaw) * 7 + (Math.random() - 0.5), 0.14, 0.17, fl.color, { drag: 3 });
      }
      if (r.player && this.state === 'race' && k.boostT <= 0 && Math.random() < 0.15) { v.exhaustWorld(r.tips); for (const tp of r.tips) this.smoke.emit(tp.x, tp.y, tp.z, -Math.sin(k.yaw), 0.6, -Math.cos(k.yaw), 0.5, 0.25, this.c.setRGB(0.6, 0.6, 0.62), { a: 0.25, grow: 2 }); }
      // rung by the bell: gold sparks over the kart while it is slowed
      if (k.slowT > 0 && near && Math.random() < 0.4) this.sparks.emit(k.pos.x, k.pos.y + 1.6, k.pos.z, (Math.random() - 0.5) * 2, 1, (Math.random() - 0.5) * 2, 0.4, 0.2, this.c.setRGB(2, 1.6, 0.3), { drag: 2 });
    }
    this.sparks.update(dt);
    this.smoke.update(dt);
    const k = this.me.kart;
    const lk = this.state === 'race' && !this.spectator ? (k.boostT > 0 ? 1 : Math.max(0, (k.speed - 25) / 12)) : 0;
    const u = this.lines.mat.uniforms;
    u.uK.value += (lk - u.uK.value) * Math.min(1, dt * 6);
    u.uTime.value = tt;
    this.lines.mesh.visible = u.uK.value > 0.02;
  }
  private q1 = new THREE.Quaternion();

  /* ------------------------------------------------------------ podium */
  private clearPodium() {
    if (!this.podium) return;
    this.scene.remove(this.podium);
    this.podium.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) { m.geometry.dispose(); (m.material as THREE.Material).dispose(); } });
    this.podium = null;
  }
  private showPodium() {
    this.state = 'podium';
    const st = this.standings();
    const tr = this.track, f = tr.frame(Math.round(this.podiumS / tr.ds));
    const g = new THREE.Group();
    const cols = [0xffd23f, 0xd8dde6, 0xd98a4a];
    [0, -2.7, 2.7].forEach((d, i) => {
      const h = PODIUM_H[i];
      const m = new THREE.Mesh(new THREE.BoxGeometry(2.5, h, 2.3), new THREE.MeshStandardMaterial({ color: cols[i], roughness: 0.35, metalness: 0.15 }));
      const p = tr.pointAt(f.s, d);
      m.position.set(p.x, p.y + h / 2, p.z);
      m.rotation.y = f.yaw;
      m.castShadow = true; m.receiveShadow = true;
      g.add(m);
      const r = st[i];
      if (r?.view) {
        r.kart.place(f.s, d);
        r.kart.yaw = f.yaw + Math.PI;
        r.kart.pos.y = p.y + h;
        r.view.root.visible = true;
        r.view.cheer = true; r.view.face = 'happy';
      }
    });
    for (const r of st.slice(3)) if (r.view) r.view.root.visible = false;
    this.podium = g;
    this.scene.add(g);
    sfx.finish();
    this.emit();
  }
  private podiumFrame(dt: number) {
    const st = this.standings();
    for (let i = 0; i < 3; i++) {
      const r = st[i];
      if (!r?.view) continue;
      r.view.update(dt, r.kart, this.time, false);
      if (Math.random() < 0.6) this.sparks.emit(r.kart.pos.x + (Math.random() - 0.5) * 4, r.kart.pos.y + 5, r.kart.pos.z + (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 2, -1, (Math.random() - 0.5) * 2, 2.4, 0.26, this.c.setHSL(Math.random(), 0.9, 0.6), { grav: 1.5, drag: 0.5 });
    }
  }

  /* ------------------------------------------------------------ camera */
  private updateCamera(dt: number) {
    const k = this.camTarget().kart, cam = this.camera;
    const fwd = this.v1.set(Math.sin(k.yaw), 0, Math.cos(k.yaw));
    if (this.state === 'podium') {
      const tr = this.track, f = tr.frame(Math.round(this.podiumS / tr.ds));
      this.menuA += dt * 0.3;
      const c = tr.pointAt(f.s, 0);
      const desired = this.v2.set(c.x - f.t.x * 7.2 + f.r.x * Math.sin(this.menuA) * 2, c.y + 2.7, c.z - f.t.z * 7.2 + f.r.z * Math.sin(this.menuA) * 2);
      this.camPos.lerp(desired, 1 - Math.exp(-dt * 2));
      // wide screens: the podium sits left of the standings panel
      const side = cam.aspect > 1.2 ? Math.min(3.2, (cam.aspect - 1) * 2.4) : 0;
      this.camLook.set(c.x + f.r.x * side, c.y + 1.7, c.z + f.r.z * side);
      this.fov += (52 - this.fov) * Math.min(1, dt * 2);
    } else if (this.state === 'menu' || this.state === 'loading') {
      this.menuA += dt * 0.22;
      const a = k.yaw + 2.3 + Math.sin(this.menuA) * 0.65;
      const desired = this.v2.set(k.pos.x + Math.sin(a) * 5.4, k.pos.y + 1.7, k.pos.z + Math.cos(a) * 5.4);
      this.camPos.lerp(desired, 1 - Math.exp(-dt * 3));
      this.camLook.set(k.pos.x, k.pos.y + 0.75, k.pos.z);
      if (cam.aspect > 1.25) {
        const r = this.v3.subVectors(this.camLook, this.camPos).cross(this.v4.set(0, 1, 0)).normalize();
        this.camLook.addScaledVector(r, -Math.min(1.6, (cam.aspect - 1.1) * 1.6));
      }
      this.fov += (52 - this.fov) * Math.min(1, dt * 3);
    } else if (this.state === 'finish') {
      this.menuA += dt * 0.35;
      const a = k.yaw + 0.9 + this.menuA * 0.5;
      const desired = this.v2.set(k.pos.x + Math.sin(a) * 7, k.pos.y + 2.4, k.pos.z + Math.cos(a) * 7);
      this.camPos.lerp(desired, 1 - Math.exp(-dt * 2.5));
      this.camLook.set(k.pos.x, k.pos.y + 0.8, k.pos.z);
      this.fov += (58 - this.fov) * Math.min(1, dt * 2);
    } else {
      const driftYaw = -k.drift * 0.22;
      const cy = k.yaw + driftYaw * 0.5;
      const back = this.lookBack ? -1 : 1;
      const boost = k.boostT > 0 ? 1 : 0;
      const tv = this.spectator ? 1 : 0; // the teacher's screen: a wider TV camera
      const distB = 3.2 + Math.min(0.7, k.speed * 0.017) + boost * 0.45 + tv * 3.2;
      const desired = this.v2.set(k.pos.x - Math.sin(cy) * distB * back, k.pos.y + 1.42 + tv * 1.3 + (k.grounded ? 0 : 0.35), k.pos.z - Math.cos(cy) * distB * back);
      if (this.snapCam) { this.camPos.copy(desired); this.snapCam = false; }
      const q = k.q;
      if (q && q.ground !== null) desired.y = Math.max(desired.y, q.ground + 1.2);
      const kk = this.state === 'countdown' ? 2.2 : 9;
      this.camPos.x += (desired.x - this.camPos.x) * Math.min(1, dt * kk);
      this.camPos.z += (desired.z - this.camPos.z) * Math.min(1, dt * kk);
      this.camPos.y += (desired.y - this.camPos.y) * Math.min(1, dt * (k.grounded ? 6 : 2.5));
      this.camLook.copy(k.pos).addScaledVector(fwd, 2.6 * back).add(this.v2.set(0, 0.92, 0));
      const tf = 58 + boost * 8 + Math.min(6, k.speed * 0.15);
      this.fov += (tf - this.fov) * Math.min(1, dt * 4);
    }
    cam.position.copy(this.camPos);
    if (this.shake > 0) {
      cam.position.x += (Math.random() - 0.5) * this.shake;
      cam.position.y += (Math.random() - 0.5) * this.shake;
      this.shake = Math.max(0, this.shake - dt * 1.4);
    }
    cam.lookAt(this.camLook);
    if (Math.abs(cam.fov - this.fov) > 0.05) { cam.fov = this.fov; cam.updateProjectionMatrix(); }
  }

  /** Lower the quality (bloom → resolution → shadows) if the device cannot keep up. */
  private adapt(dt: number, tm: number) {
    this.frames.push(dt);
    if (this.frames.length > 90) this.frames.shift();
    if (tm - this.qualityAt < 2500 || this.frames.length < 60 || this.state === 'paused' || this.state === 'loading') return;
    this.qualityAt = tm;
    const avg = this.frames.reduce((a, b) => a + b, 0) / this.frames.length;
    if (avg > 0.024) {
      if (this.composer) { this.bloomOk = false; this.setupBloom(); }
      else if (this.dpr > 0.8) { this.dpr = Math.max(0.75, this.dpr - 0.25); this.renderer.setPixelRatio(this.dpr); this.resize(); }
      else if (this.sun.castShadow) this.sun.castShadow = false;
      this.frames = [];
    }
  }

  private emit() {
    if (!this.onHud) return;
    const me = this.me, k = me.kart, tr = this.track, mb = this.mapBox;
    const field = this.field;
    let q: Hud['q'] = null;
    const g = this.gates?.ahead(k.s, 190);
    if (g && (this.state === 'race' || this.state === 'countdown') && !me.finished) q = { text: g.g.q.q, answers: g.g.answers, dist: Math.round(g.dist), lane: this.gates!.laneOf(g.g, k.d) };
    if (me.roll > 0) this.rollShow = ITEM_LIST[Math.floor(this.time * 14) % ITEM_LIST.length];
    const ranked = this.settings.mode === 'gp' && (this.state === 'podium' || this.state === 'menu') ? this.standings() : [...field].sort((a, b) => a.place - b.place);
    this.onHud({
      state: this.state, count: Math.ceil(this.countT), lap: Math.min(tr.def.laps, me.lapTimes.length + 1), laps: tr.def.laps,
      time: me.finished ? me.finishT : this.raceT, lapTime: this.raceT - me.lapStart, lapTimes: me.lapTimes, bestLap: me.lapTimes.length ? Math.min(...me.lapTimes) : null,
      speed: Math.round(k.speed * 3.6 * 1.25), tier: k.drift ? k.tier : 0, boost: k.boostT > 0, wrongWay: me.wrongT > 1.2,
      results: this.results, x: (k.pos.x - mb.x0) / mb.w, z: (k.pos.z - mb.z0) / mb.h, yaw: k.yaw, record: this.record,
      mode: this.settings.mode, track: this.info.id, place: me.place, n: field.length, coins: me.coins, item: me.item, itemN: me.itemN,
      rolling: me.roll > 0 ? this.rollShow : null, shield: me.shield, q,
      dots: field.map((r) => ({ x: (r.kart.pos.x - mb.x0) / mb.w, z: (r.kart.pos.z - mb.z0) / mb.h, color: r.color, me: r.player })),
      standings: ranked.map((r) => ({ name: r.name, color: r.color, me: r.player, points: r.points })),
      rivalsReady: this.rivalsReady || this.settings.mode === 'time', waiting: this.pendingStart, gpRace: this.gpRace, mapPath: this.mapPath,
      live: this.live ? {
        score: scoreOf(me), right: me.right, wrong: me.wrong, bank: me.bank, spectator: !!this.spectator, focus: this.spectator ? this.focus?.name ?? '' : '',
        rows: field.map((r) => ({ name: r.name, color: r.color, me: r.player, score: scoreOf(r), right: r.right, wrong: r.wrong, bank: r.bank, fin: r.finished })).sort((a, b) => b.score - a.score || Number(b.fin) - Number(a.fin)),
      } : null,
    });
  }

  /* ------------------------------------------------------------ live class mode */
  private liveOrder: Racer[] = [];
  private snapCam = false;
  private byPeer(peer: string) { return this.racers.find((r) => r.peer === peer) ?? null; }

  /** The kart the camera follows: mine, or on the teacher's screen the leaders in turn. */
  private camTarget(): Racer {
    if (!this.spectator) return this.me;
    const rs = this.field;
    if (!rs.length) return this.me;
    if (!this.focus || !rs.includes(this.focus) || this.time > this.focusAt) {
      const top = [...rs].sort((a, b) => b.dist - a.dist).slice(0, 3);
      const next = top[this.focusK++ % top.length];
      if (next !== this.focus) this.snapCam = true;
      this.focus = next;
      this.focusAt = this.time + 8;
    }
    return this.focus;
  }
  /** The teacher's screen: follow this student for a while. */
  watch(peer: string) { const r = this.byPeer(peer); if (r && this.field.includes(r)) { if (r !== this.focus) this.snapCam = true; this.focus = r; this.focusAt = this.time + 14; } }

  private makeRemote(e: LiveEntry, i: number): Racer {
    const info = TOONS.find((x) => x.id === e.toon) ?? TOONS[i % TOONS.length];
    const r = makeRacer(i + 1, this.track, { id: info.id, name: e.name, color: info.color }, false, this.newFlames());
    r.peer = e.peer; r.remote = [];
    const v = new KartView(info.color, e.name);
    v.root.add(nameTag(e.name, info.color));
    r.view = v;
    this.scene.add(v.root);
    void ToonActor.create(info.id, true).then((a) => { if (r.view === v && this.racers.includes(r)) v.setDriver(a); else a.dispose(); }).catch(() => { /* kart without a driver */ });
    return r;
  }
  private dropRacer(r: Racer) {
    this.items?.setShield(r, false);
    r.view?.dispose(); r.view = null;
    r.flames.group.removeFromParent(); r.flames.dispose();
  }

  /** The teacher started a race: this track, these students (`me` = my id; null on the teacher's screen). */
  startLive(cfg: LiveCfg, me: string | null) {
    this.settings = { ...this.settings, level: cfg.level, mode: 'live' };
    this.liveItems = cfg.items;
    // the bots of a solo game never race here
    for (const r of this.racers) if (!r.player && !r.remote) this.dropRacer(r);
    const keep = new Map(this.racers.filter((r) => r.remote && r.peer).map((r) => [r.peer!, r]));
    const order: Racer[] = [];
    cfg.roster.forEach((e, i) => {
      if (e.peer === me) { this.me.peer = me; order.push(this.me); return; }
      let r = keep.get(e.peer);
      if (r) keep.delete(e.peer); else r = this.makeRemote(e, i);
      order.push(r);
    });
    for (const r of keep.values()) this.dropRacer(r);
    this.racers.length = 0;
    this.racers.push(this.me, ...order.filter((r) => r !== this.me));
    this.liveOrder = order;
    for (const r of this.racers) if (r.view) r.view.root.visible = r.player ? !this.spectator : true;
    this.loadTrack(cfg.track, false);
    this.track.def.laps = cfg.laps;
    this.buildItems();
    this.gates?.setLevel(cfg.level);
    this.focus = null; this.focusAt = 0;
    this.state = 'menu';
    this.begin();
  }
  /** Back to the waiting room after a race (karts on the grid of the last track). */
  liveLobby() {
    this.state = 'menu';
    this.clearPodium();
    stopMusic();
    engineSet(0, 0, false, true, false, false);
    for (const r of this.racers) if (r.view) { r.view.root.visible = r.player ? !this.spectator : true; r.view.cheer = false; r.view.face = 'smile'; }
    this.placeGrid();
    this.emit();
  }
  /** States of the other students' karts (the teacher's snapshot). */
  liveSnapshot(list: (Omit<RemoteSample, 'at'> & { peer: string })[]) {
    const now = performance.now();
    for (const smp of list) {
      const r = this.byPeer(smp.peer);
      if (!r?.remote) continue;
      r.remote.push({ ...smp, at: now });
      if (r.remote.length > 12) r.remote.shift();
      r.right = smp.right; r.wrong = smp.wrong; r.bank = smp.bank;
      if (smp.fin && !r.finished) { r.finished = true; r.finishT = smp.ft; }
    }
  }
  /** Move the other students' karts: a little in the past, between two states received. */
  private updateRemotes(dt: number) {
    if (this.state === 'podium') return; // the podium holds them in place
    const T = performance.now() - 260;
    for (const r of this.racers) {
      const b = r.remote;
      if (!b?.length) continue;
      r.hurtT = Math.max(0, r.hurtT - dt);
      let a = b[b.length - 1], c = a, f = 0;
      for (let i = 0; i < b.length - 1; i++) if (b[i].at <= T && b[i + 1].at >= T) { a = b[i]; c = b[i + 1]; f = (T - a.at) / Math.max(1, c.at - a.at); break; }
      if (T < b[0].at) { a = c = b[0]; f = 0; }
      const k = r.kart;
      let yd = c.yaw - a.yaw;
      while (yd > Math.PI) yd -= Math.PI * 2;
      while (yd < -Math.PI) yd += Math.PI * 2;
      k.yaw = a.yaw + yd * f;
      const spd = a.spd + (c.spd - a.spd) * f;
      k.pos.set(a.x + (c.x - a.x) * f, a.y + (c.y - a.y) * f, a.z + (c.z - a.z) * f);
      // past the last state: keep going a little the way it was heading
      const late = Math.min(0.3, (T - c.at) / 1000);
      if (c === a && late > 0) k.pos.addScaledVector(this.v1.set(Math.sin(k.yaw), 0, Math.cos(k.yaw)), spd * late);
      k.vel.set(Math.sin(k.yaw) * spd, 0, Math.cos(k.yaw) * spd);
      k.drift = c.drift; k.boostT = c.flags & 1 ? 0.3 : 0; k.spinT = c.flags & 2 ? 0.3 : 0; k.grounded = !(c.flags & 4);
      const sh = !!(c.flags & 8);
      if (sh !== r.shield) { r.shield = sh; this.items?.setShield(r, sh); }
      k.q = this.track.query(k.pos, k.hint);
      k.hint = k.q.i; k.s = k.q.s; k.d = k.q.d; k.surface = k.q.surface;
      r.dist = a.dist + (c.dist - a.dist) * f;
      r.prevS = k.s;
    }
  }
  /** Another student's paper plane reached me. */
  liveHit(kind: 'plane' | 'ink', from: string) { if (this.state === 'race') this.hit(this.me, kind, this.byPeer(from)); }
  /** Another student rang the recess bell (I was ahead of them). */
  liveBell(from: string) {
    const me = this.me, by = this.byPeer(from);
    if (this.state !== 'race' || me.finished) return;
    this.items?.ring(me);
    sfx.bell();
    if (me.shield) { this.breakShield(me); return; }
    me.kart.slowT = 1.4;
    if (me.coins > 0) { me.coins--; me.bank = Math.max(0, me.bank - 1); }
    this.toast(t('RECESS BELL!', '¡CAMPANA DEL RECREO!'), '#ffd23f', by ? `${t('rung by', 'la tocó')} ${by.name}` : undefined);
    this.shake = Math.max(this.shake, 0.25);
  }
  /** Another student dropped an ink puddle. */
  liveInk(from: string, s: number, d: number) { const by = this.byPeer(from); if (by && this.state === 'race') this.items?.dropInkAt(by, s, d); }
  /** The teacher ended the race: stop where I am (the score counts what I did). */
  liveEnd() {
    if (this.spectator || this.state !== 'race' || this.me.finished) return;
    this.me.finished = true;
    this.me.finishT = this.raceT;
    rank(this.field);
    this.finish(false);
  }
  /** Final podium (session totals by student id). */
  livePodium(totals: Record<string, number>) {
    for (const r of this.field) r.points = totals[r.peer ?? ''] ?? 0;
    this.showPodium();
  }

  /** Tests: run the race without drawing, `secs` of game time (the player on autopilot). */
  simulate(secs: number) {
    if (this.state === 'menu') { this.begin(); this.countT = 0; this.go(); }
    const stats = { falls: 0, walls: 0, laps: 0, hits: 0 };
    const n = Math.round(secs / DT);
    this.autoDrive = true;
    for (let i = 0; i < n && (this.state === 'race' || (this.state === 'finish' && !this.results?.final)); i++) {
      this.step(DT, NO_INPUT);
      if (i % 4 === 0) this.scenery?.update?.(DT * 4, this.clock);
      this.items?.update(DT, this.clock, this.field, this.itemEvents, true);
      for (const r of this.field) { for (const e of r.kart.events) { if (e.e === 'fall') stats.falls++; if (e.e === 'wall' && r.player) stats.walls++; if (e.e === 'spin') stats.hits++; } r.kart.events.length = 0; }
    }
    this.autoDrive = false;
    stats.laps = this.me.lapTimes.length;
    return { ...stats, place: this.me.place, lapTimes: this.me.lapTimes.map((x) => +x.toFixed(2)), state: this.state, time: +this.raceT.toFixed(2), table: this.results?.rows.map((r) => `${r.place}. ${r.name} ${r.time ? fmt(r.time) : '-'}`) };
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    stopMusic();
    engineStop();
    this.ro.disconnect();
    this.offs.forEach((f) => f());
    for (const r of this.racers) { r.view?.dispose(); r.flames.dispose(); }
    this.scenery?.dispose();
    this.items?.dispose();
    this.gates?.dispose();
    this.clearPodium();
    this.meshes?.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
    this.sparks.dispose(); this.smoke.dispose(); this.skids.dispose(); this.lines.dispose();
    this.composer?.dispose();
    this.envTex?.dispose();
    this.worldMat.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

/** A floating name over another student's kart. */
function nameTag(name: string, color: string) {
  const cv = document.createElement('canvas');
  cv.width = 512; cv.height = 128;
  const c = cv.getContext('2d')!;
  c.font = '900 64px Inter, system-ui, sans-serif';
  const w = Math.min(500, c.measureText(name).width + 70);
  c.fillStyle = 'rgba(16,32,74,.82)';
  c.beginPath(); c.roundRect((512 - w) / 2, 14, w, 100, 50); c.fill();
  c.fillStyle = color; c.beginPath(); c.arc((512 - w) / 2 + 42, 64, 16, 0, Math.PI * 2); c.fill();
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(name, 256 + 14, 66, w - 80);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, depthWrite: false, toneMapped: false }));
  sp.scale.set(2.6, 0.65, 1);
  sp.position.y = 2.45;
  sp.renderOrder = 5;
  return sp;
}

export const fmt = (s: number) => {
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(2)}`;
};
/** 1st, 2nd… (or 1.º, 2.º… in Spanish). */
export function ordinal(n: number) {
  if (t('en', 'es') === 'es') return `${n}.º`;
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}th`;
  return `${n}${['th', 'st', 'nd', 'rd'][n % 10] ?? 'th'}`;
}
