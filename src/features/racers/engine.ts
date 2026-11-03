/* English Racers — the game: scene, lights and sky, the Campus track, the player's kart with
   the chosen teacher, input (keyboard, gamepad, touch buttons), a fixed-step physics loop,
   countdown with a rocket start, laps and times, chase camera, effects, sound and the HUD feed.
   Phase 1 is a time trial (3 laps); bots, items and question gates come next. */
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { TOONS, ToonActor } from '@/features/toons3d/runtime';
import { skyDome, type SkyColors } from '@/features/run/gfx';
import { Track } from './track';
import { buildTrackMeshes, type TrackMeshes } from './trackMesh';
import { CAMPUS, buildCampus, type Scenery } from './campus';
import { Kart, KART, NO_INPUT, autopilot, type KartInput } from './kart';
import { KartView } from './kartModel';
import { Flames, Particles, Skids, SpeedLines } from './fx';
import { t } from '@/lib/gameLang';
import { engineSet, engineStop, sfx, startMusic, stopMusic, setMusicFast, unlock } from './audio';

export type RaceState = 'loading' | 'menu' | 'countdown' | 'race' | 'paused' | 'finish';
export interface Results { total: number; laps: number[]; best: number; newBestLap: boolean; newBestTotal: boolean }
export interface Hud {
  state: RaceState; count: number; lap: number; laps: number; time: number; lapTime: number; lapTimes: number[]; bestLap: number | null;
  speed: number; tier: number; boost: boolean; wrongWay: boolean; results: Results | null; x: number; z: number; yaw: number; record: { lap: number; total: number } | null;
}
export interface Toast { id: number; text: string; sub?: string; color: string }
export interface TouchState { left: boolean; right: boolean; gas: boolean; brake: boolean; drift: boolean }

const SKY: SkyColors = { top: 0x2f7fe0, mid: 0x8cc6ff, horizon: 0xe6f3ff, fog: 0xcfe6fb, sun: [0.55, 0.62, 0.35], sunGlow: 1 };
const TIER_COLORS = [new THREE.Color(1.3, 1.05, 0.6), new THREE.Color(0.35, 0.8, 2.0), new THREE.Color(2.0, 0.85, 0.2), new THREE.Color(1.6, 0.45, 2.0)];
const DT = 1 / 120;
const store = {
  get(id: string): { lap: number; total: number } | null { try { const v = JSON.parse(localStorage.getItem('racers:best:' + id) || 'null'); return v && typeof v.lap === 'number' ? v : null; } catch { return null; } },
  set(id: string, v: { lap: number; total: number }) { try { localStorage.setItem('racers:best:' + id, JSON.stringify(v)); } catch { /* ignore */ } },
};

export class RaceGame {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(66, 1, 0.1, 2400);
  readonly track = new Track(CAMPUS);
  private meshes: TrackMeshes;
  private scenery: Scenery;
  private sky: THREE.Mesh;
  private sun = new THREE.DirectionalLight(0xfff1dc, 2.7);
  private hemi = new THREE.HemisphereLight(0xcfe8ff, 0x5d8a46, 0.85);
  private envTex: THREE.Texture | null = null;
  private composer: EffectComposer | null = null;
  private bloomOk = true;
  readonly kart: Kart;
  private view: KartView | null = null;
  private sparks = new Particles(520, true);
  private smoke = new Particles(380, false);
  private skids = new Skids();
  private flames = new Flames();
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
  private prevState: RaceState = 'menu';
  toonId: string;
  private countT = 0;
  private firstPress = -1;
  private raceT = 0;
  private lapStart = 0;
  private lapTimes: number[] = [];
  private dist = 0;
  private prevS = 0;
  private wrongT = 0;
  private respawnAt = 0;
  private shake = 0;
  private boostKind: 'mini' | 'pad' | 'trick' | 'start' = 'pad';
  private boostTier = 1;
  private keys = new Set<string>();
  private touch: TouchState = { left: false, right: false, gas: false, brake: false, drift: false };
  private input: KartInput = { ...NO_INPUT };
  private lookBack = false;
  private results: Results | null = null;
  private record: { lap: number; total: number } | null;
  private camPos = new THREE.Vector3(0, 5, -10);
  private camLook = new THREE.Vector3();
  private fov = 66;
  private menuA = 0;
  private time = 0;
  autoDrive = false;
  readonly mapPath: string;
  readonly mapBox: { x0: number; z0: number; w: number; h: number };

  onHud: ((h: Hud) => void) | null = null;
  onToast: ((t: Toast) => void) | null = null;
  private toastId = 0;
  private hudAt = 0;

  constructor(private host: HTMLElement, opts: { toon: string }) {
    this.toonId = opts.toon;
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
    s.background = new THREE.Color(SKY.fog);
    s.fog = new THREE.Fog(SKY.fog, 260, 1300);
    this.sky = skyDome(SKY);
    this.sky.scale.setScalar(2.6);
    s.add(this.sky, this.hemi);
    const sc = this.sun.shadow;
    sc.mapSize.set(2048, 2048);
    Object.assign(sc.camera, { left: -32, right: 32, top: 32, bottom: -32, near: 1, far: 220 });
    sc.bias = -0.0005; sc.normalBias = 0.04;
    this.sun.castShadow = true;
    s.add(this.sun, this.sun.target);

    // environment light for the soft PBR look (from the sky plus a grassy ground)
    const pm = new THREE.PMREMGenerator(r);
    const envScene = new THREE.Scene();
    envScene.add(skyDome(SKY));
    const ground = new THREE.Mesh(new THREE.CircleGeometry(300, 24), new THREE.MeshBasicMaterial({ color: 0x5c8f45 }));
    ground.rotation.x = -Math.PI / 2; ground.position.y = -20;
    envScene.add(ground);
    this.envTex = pm.fromScene(envScene, 0.02, 0.1, 1000).texture;
    s.environment = this.envTex;
    s.environmentIntensity = 0.6;
    pm.dispose();

    const worldMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0, side: THREE.DoubleSide });
    this.meshes = buildTrackMeshes(this.track, worldMat);
    s.add(this.meshes.group);
    this.scenery = buildCampus(this.track);
    s.add(this.scenery.group);
    s.add(this.sparks.points, this.smoke.points, this.skids.mesh, this.flames.group, this.lines.mesh);

    this.kart = new Kart(this.track);
    this.placeOnGrid();
    this.record = store.get(this.track.def.id);

    // minimap outline
    let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
    for (const f of this.track.frames) { x0 = Math.min(x0, f.p.x); x1 = Math.max(x1, f.p.x); z0 = Math.min(z0, f.p.z); z1 = Math.max(z1, f.p.z); }
    this.mapBox = { x0, z0, w: x1 - x0, h: z1 - z0 };
    this.mapPath = this.track.frames.filter((_, i) => i % 6 === 0).map((f, i) => `${i ? 'L' : 'M'}${(((f.p.x - x0) / (x1 - x0)) * 100).toFixed(1)} ${(((f.p.z - z0) / (z1 - z0)) * 100).toFixed(1)}`).join(' ') + 'Z';

    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(host);
    this.resize();
    this.setupBloom();
    this.bindInput();
    void this.setToon(this.toonId).then(() => { if (this.state === 'loading') { this.state = 'menu'; this.emit(); } });

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
  private setupBloom() {
    this.composer?.dispose();
    this.composer = null;
    if (!this.bloomOk) return;
    const w = this.host.clientWidth || 1, h = this.host.clientHeight || 1;
    const rt = new THREE.WebGLRenderTarget(w, h, { type: THREE.HalfFloatType, samples: 4 });
    const c = new EffectComposer(this.renderer, rt);
    c.addPass(new RenderPass(this.scene, this.camera));
    c.addPass(new UnrealBloomPass(new THREE.Vector2(w / 2, h / 2), 0.5, 0.35, 1.1));
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
    const info = TOONS.find((t) => t.id === id);
    const color = info?.color ?? '#ff5a5a';
    const actor = await ToonActor.create(id);
    if (this.toonId !== id) { actor.dispose(); return; }
    this.view?.dispose();
    const v = new KartView(color, info?.name ?? '');
    v.setDriver(actor);
    this.view = v;
    this.scene.add(v.root);
    v.update(0.016, this.kart, 0, false);
    this.emit();
  }

  private placeOnGrid() {
    this.kart.place(this.track.length - 9, -2.4);
    this.dist = -9;
    this.prevS = this.kart.s;
    this.skids.clear();
    this.sparks.clear();
    this.smoke.clear();
  }

  /* ------------------------------------------------------------ input */
  private bindInput() {
    const map: Record<string, string> = { arrowup: 'gas', w: 'gas', arrowdown: 'brake', s: 'brake', arrowleft: 'left', a: 'left', arrowright: 'right', d: 'right', ' ': 'drift', shift: 'drift', k: 'drift', c: 'back' };
    const down = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (map[k]) { this.keys.add(map[k]); if (k.startsWith('arrow') || k === ' ') e.preventDefault(); unlock(); }
      if (e.repeat) return;
      if (k === 'escape' || k === 'p') this.togglePause();
      if (k === 'r' && this.state === 'race') this.respawn();
      if (k === 'enter' && this.state === 'menu') this.start();
    };
    const up = (e: KeyboardEvent) => { const k = e.key.toLowerCase(); if (map[k]) this.keys.delete(map[k]); };
    const blur = () => { this.keys.clear(); if (this.state === 'race') this.togglePause(); };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    this.offs.push(() => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); });
  }

  setTouch(t: Partial<TouchState>) { Object.assign(this.touch, t); unlock(); }

  private readInput() {
    const k = this.keys, t = this.touch;
    let steer = (k.has('right') || t.right ? 1 : 0) - (k.has('left') || t.left ? 1 : 0);
    let gas = k.has('gas') || t.gas ? 1 : 0, brake = k.has('brake') || t.brake ? 1 : 0;
    let drift = k.has('drift') || t.drift;
    this.lookBack = k.has('back');
    const pads = typeof navigator !== 'undefined' && navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) {
      if (!p) continue;
      const ax = p.axes[0] ?? 0;
      if (Math.abs(ax) > 0.15) steer = ax;
      if (p.buttons[14]?.pressed) steer = -1;
      if (p.buttons[15]?.pressed) steer = 1;
      gas = Math.max(gas, p.buttons[0]?.pressed ? 1 : 0, p.buttons[7]?.value ?? 0);
      brake = Math.max(brake, p.buttons[1]?.pressed || p.buttons[2]?.pressed ? 1 : 0, p.buttons[6]?.value ?? 0);
      drift = drift || !!(p.buttons[5]?.pressed || p.buttons[4]?.pressed);
      if (p.buttons[3]?.pressed) this.lookBack = true;
      if (p.buttons[9]?.pressed && this.state === 'menu') this.start();
    }
    this.input = { throttle: gas, brake, steer: THREE.MathUtils.clamp(steer, -1, 1), drift };
    return this.input;
  }

  /* ------------------------------------------------------------ flow */
  start() {
    if (this.state !== 'menu' && this.state !== 'finish') return;
    unlock();
    sfx.click();
    this.placeOnGrid();
    this.results = null;
    this.lapTimes = [];
    this.raceT = 0; this.lapStart = 0;
    this.countT = 3.9;
    this.firstPress = -1;
    this.state = 'countdown';
    this.camPos.copy(this.kart.pos).add(new THREE.Vector3(0, 9, 0)).addScaledVector(new THREE.Vector3(Math.sin(this.kart.yaw), 0, Math.cos(this.kart.yaw)), -16);
    if (this.view) { this.view.cheer = false; this.view.face = 'grin'; }
    this.scenery.lamps.forEach((m) => { m.color.setHex(0x331111); m.emissive.setHex(0); });
    setMusicFast(false);
    startMusic();
    this.emit();
  }
  restart() { if (this.state === 'paused') this.state = this.prevState; this.state = 'menu'; this.start(); }
  toMenu() {
    if (this.state === 'paused') this.state = this.prevState;
    this.state = 'menu';
    this.placeOnGrid();
    stopMusic();
    engineSet(0, 0, false, true, false, false);
    if (this.view) { this.view.cheer = false; this.view.face = 'smile'; }
    this.emit();
  }
  togglePause() {
    if (this.state === 'race' || this.state === 'countdown') { this.prevState = this.state; this.state = 'paused'; stopMusic(false); engineSet(0, 0, false, true, false, false); this.emit(); }
    else if (this.state === 'paused') { this.state = this.prevState; this.last = performance.now(); startMusic(); this.emit(); }
  }
  respawn() {
    const k = this.kart, tr = this.track;
    const s = (k.safeS - 6 + tr.length) % tr.length;
    k.place(s, THREE.MathUtils.clamp(k.d, -2, 2));
    k.pos.y += 2.2;
    k.grounded = false;
    k.vel.y = 0;
    this.prevS = k.s;
    this.respawnAt = 0;
    this.skids.mark(0, null); this.skids.mark(1, null);
    sfx.respawn();
  }

  private toast(text: string, color: string, sub?: string) { this.onToast?.({ id: ++this.toastId, text, color, sub }); }

  /* ------------------------------------------------------------ frame */
  private frame(dt: number, t: number) {
    this.time += dt;
    const inp = this.readInput();
    const k = this.kart;
    if (this.state === 'countdown') {
      const before = this.countT;
      this.countT -= dt;
      for (const mark of [3, 2, 1]) if (before > mark && this.countT <= mark) { sfx.beep(false); this.scenery.lamps[3 - mark].color.setHex(0xff2222); this.scenery.lamps[3 - mark].emissive.setRGB(2.5, 0.1, 0.1); this.emit(); }
      if (inp.throttle > 0) { if (this.firstPress < 0) this.firstPress = this.countT; } else this.firstPress = -1;
      engineSet(inp.throttle * 0.45, inp.throttle, false, true, false, true);
      if (this.countT <= 0) this.go();
    } else if (this.state === 'race' || this.state === 'finish') {
      this.acc += dt;
      while (this.acc >= DT) {
        this.acc -= DT;
        const i = this.state === 'finish' || this.autoDrive ? autopilot(k, this.track) : inp;
        k.step(DT, this.state === 'finish' ? { ...i, throttle: 0.6 } : i);
        this.raceLogic(DT);
      }
      this.handleEvents();
    }
    if (this.state === 'race' && k.falling) {
      if (!this.respawnAt) this.respawnAt = this.time + 1.0;
      else if (this.time >= this.respawnAt) this.respawn();
    }

    // visuals
    const v = this.view;
    if (v) {
      v.update(dt, k, t / 1000, inp.brake > 0 && k.fwd > 1 && this.state === 'race');
      if (this.state === 'race') v.face = k.falling || (!k.grounded && k.airT > 0.5) ? 'surprised' : k.boostT > 0 ? 'happy' : 'grin';
    }
    this.effects(dt, t / 1000);
    this.updateCamera(dt, t / 1000);
    this.meshes.pads.uniforms.uTime.value = t / 1000;
    this.sky.position.copy(this.camera.position);
    this.sun.position.copy(k.pos).add(new THREE.Vector3(45, 70, 30));
    this.sun.target.position.copy(k.pos);
    const water = this.scenery.water.material as THREE.MeshPhysicalMaterial;
    water.clearcoatRoughness = 0.05 + Math.sin(t / 900) * 0.03;
    water.normalMap?.offset.set(t / 26000, t / 31000);
    if (this.state === 'race' || this.state === 'finish') engineSet(k.speed / KART.maxSpeed, this.state === 'race' ? inp.throttle : 0.4, !!k.drift, k.grounded, k.boostT > 0, true);
    if (this.composer) this.composer.render(dt); else this.renderer.render(this.scene, this.camera);
    this.adapt(dt, t);
    if (t - this.hudAt > 80) { this.hudAt = t; this.emit(); }
  }

  private go() {
    this.state = 'race';
    this.scenery.lamps.forEach((m) => { m.color.setHex(0x22ff55); m.emissive.setRGB(0.2, 2.6, 0.5); });
    sfx.beep(true);
    const fp = this.firstPress;
    if (this.input.throttle > 0 && fp >= 0) {
      if (fp <= 0.55) { this.kart.boost(1.3, 'start'); this.toast(t('PERFECT START!', '¡SALIDA PERFECTA!'), '#ffd23f'); }
      else if (fp > 1.6) { this.kart.spin(0.8); this.toast(t('TOO EARLY!', '¡MUY PRONTO!'), '#ff6b6b', t('Wait for the last light to go out', 'Espera a que se apague la última luz')); }
    }
    this.lapStart = 0;
    this.emit();
  }

  private raceLogic(dt: number) {
    const k = this.kart, L = this.track.length;
    if (this.state === 'race') this.raceT += dt;
    let delta = k.s - this.prevS;
    if (delta > L / 2) delta -= L; else if (delta < -L / 2) delta += L;
    this.prevS = k.s;
    if (k.falling) delta = 0;
    const before = Math.floor(this.dist / L);
    this.dist += delta;
    const after = Math.floor(this.dist / L);
    if (this.state === 'race' && after > before && after >= 1 && after > this.lapTimes.length) {
      const lt = this.raceT - this.lapStart;
      this.lapTimes.push(lt);
      this.lapStart = this.raceT;
      const laps = this.track.def.laps;
      const bestSoFar = Math.min(...this.lapTimes);
      if (this.lapTimes.length >= laps) this.finish();
      else {
        const final = this.lapTimes.length === laps - 1;
        sfx.lap(final);
        if (final) { setMusicFast(true); this.toast(t('FINAL LAP!', '¡ÚLTIMA VUELTA!'), '#ff3d6e'); }
        else if (lt <= bestSoFar && this.lapTimes.length > 1) this.toast(t('FASTEST LAP!', '¡VUELTA RÁPIDA!'), '#7dff9a', fmt(lt));
        else this.toast(`${t('LAP', 'VUELTA')} ${this.lapTimes.length + 1}/${laps}`, '#ffffff', fmt(lt));
      }
    }
    // wrong way
    const q = k.q;
    if (q && this.state === 'race') {
      const dot = Math.sin(k.yaw) * q.t.x + Math.cos(k.yaw) * q.t.z;
      this.wrongT = dot < -0.3 && k.speed > 4 ? this.wrongT + dt : 0;
    }
  }

  private finish() {
    this.state = 'finish';
    const total = this.raceT, best = Math.min(...this.lapTimes);
    const rec = this.record;
    const newBestLap = !rec || best < rec.lap, newBestTotal = !rec || total < rec.total;
    this.record = { lap: rec ? Math.min(rec.lap, best) : best, total: rec ? Math.min(rec.total, total) : total };
    store.set(this.track.def.id, this.record);
    this.results = { total, laps: [...this.lapTimes], best, newBestLap, newBestTotal };
    sfx.finish();
    setMusicFast(false);
    if (this.view) { this.view.cheer = true; this.view.face = 'happy'; }
    this.emit();
  }

  /* ------------------------------------------------------------ events and effects */
  private c = new THREE.Color();
  private v1 = new THREE.Vector3(); private v2 = new THREE.Vector3(); private v3 = new THREE.Vector3(); private v4 = new THREE.Vector3();
  private tips = [new THREE.Vector3(), new THREE.Vector3()];
  private handleEvents() {
    const k = this.kart;
    for (const e of k.events) {
      switch (e.e) {
        case 'hop': sfx.hop(); break;
        case 'tier': sfx.tier(e.tier); this.boostTier = e.tier; break;
        case 'boost':
          this.boostKind = e.kind;
          if (e.kind === 'pad') sfx.pad(); else sfx.boost(e.secs > 1);
          if (e.kind === 'mini' && e.secs >= 1.4) this.toast(t('ULTRA TURBO!', '¡ULTRA TURBO!'), '#d36bff');
          this.shake = Math.max(this.shake, 0.18);
          break;
        case 'trick': sfx.trick(); this.toast(t('TRICK!', '¡TRUCO!'), '#ffd23f'); break;
        case 'land':
          sfx.land(e.v); this.view?.bump(e.v);
          if (e.v > 5) for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; this.smoke.emit(k.pos.x + Math.cos(a) * 0.6, k.pos.y + 0.15, k.pos.z + Math.sin(a) * 0.6, Math.cos(a) * 4, 0.6, Math.sin(a) * 4, 0.6, 1.1, this.c.setRGB(0.92, 0.88, 0.8), { a: 0.5, drag: 3, grow: 1.6 }); }
          this.shake = Math.max(this.shake, Math.min(0.3, e.v * 0.025));
          break;
        case 'wall': {
          sfx.wall(e.v);
          this.shake = Math.max(this.shake, Math.min(0.4, e.v * 0.03));
          const q = k.q;
          if (q) for (let i = 0; i < 12; i++) this.sparks.emit(k.pos.x + q.r.x * Math.sign(q.d) * 0.9, k.pos.y + 0.4, k.pos.z + q.r.z * Math.sign(q.d) * 0.9, (Math.random() - 0.5) * 8, Math.random() * 5, (Math.random() - 0.5) * 8, 0.35, 0.18, this.c.setRGB(2, 1.4, 0.5), { grav: 14, drag: 1 });
          if (this.view) this.view.face = 'surprised';
          break;
        }
        case 'fall':
          if (k.pos.y < this.scenery.waterY + 0.5) {
            sfx.splash();
            for (let i = 0; i < 40; i++) this.smoke.emit(k.pos.x, this.scenery.waterY + 0.1, k.pos.z, (Math.random() - 0.5) * 6, 4 + Math.random() * 7, (Math.random() - 0.5) * 6, 0.9, 0.6 + Math.random() * 0.6, this.c.setRGB(0.85, 0.95, 1), { a: 0.85, grav: 16, grow: 1 });
          }
          if (this.state === 'race') this.toast(t('SPLASH!', '¡AL AGUA!'), '#4fc3ff', t('Back on the track in a second', 'Vuelves a la pista en un segundo'));
          break;
        case 'spin': sfx.spin(); break;
        default: break;
      }
    }
    k.events.length = 0;
  }

  private effects(dt: number, t: number) {
    const k = this.kart, v = this.view;
    if (v && (this.state === 'race' || this.state === 'finish' || this.state === 'countdown')) {
      v.root.updateMatrixWorld(true);
      const fwdX = Math.sin(k.yaw), fwdZ = Math.cos(k.yaw);
      // drift sparks, smoke and skid marks
      for (const sd of [-1, 1]) {
        const p = v.rearContact(sd, this.v1);
        if (k.drift && k.grounded) {
          const col = TIER_COLORS[k.tier];
          const n = k.tier ? 3 : 1;
          for (let i = 0; i < n; i++) this.sparks.emit(p.x, p.y + 0.08, p.z, -fwdX * 3 + (Math.random() - 0.5) * 3 + sd * k.drift * 1.5, 1 + Math.random() * 3.2, -fwdZ * 3 + (Math.random() - 0.5) * 3, 0.22 + Math.random() * 0.2, (k.tier ? 0.2 : 0.1) + Math.random() * 0.12, col, { grav: 12, drag: 2 });
          if (Math.random() < 0.5) this.smoke.emit(p.x, p.y + 0.2, p.z, -fwdX * 2 + (Math.random() - 0.5), 0.6 + Math.random() * 0.5, -fwdZ * 2 + (Math.random() - 0.5), 0.7, 0.9, this.c.setRGB(0.93, 0.93, 0.95), { a: 0.3, drag: 1.5, grow: 1.8 });
          this.skids.mark(sd < 0 ? 0 : 1, this.v2.set(p.x, p.y + 0.03, p.z));
        } else this.skids.mark(sd < 0 ? 0 : 1, null);
        if (k.grounded && k.surface === 'grass' && k.speed > 5 && Math.random() < 0.6) this.smoke.emit(p.x, p.y + 0.2, p.z, -fwdX * 2 + (Math.random() - 0.5) * 2, 1 + Math.random(), -fwdZ * 2 + (Math.random() - 0.5) * 2, 0.6, 0.8, this.c.setRGB(0.55, 0.62, 0.34), { a: 0.55, drag: 2, grow: 1.5, grav: 1 });
      }
      // turbo flames
      const target = k.boostT > 0 ? Math.min(1, 0.45 + k.boostT) : 0;
      this.flames.level += (target - this.flames.level) * Math.min(1, dt * 14);
      this.flames.color.copy(this.boostKind === 'mini' ? TIER_COLORS[Math.max(1, this.boostTier)] : this.c.setRGB(1.4, 0.5, 0.08));
      v.exhaustWorld(this.tips);
      v.body.getWorldQuaternion(this.q1);
      this.flames.update(this.tips, this.q1, t);
      if (k.boostT > 0) for (const tp of this.tips) this.sparks.emit(tp.x, tp.y, tp.z, -fwdX * 7 + (Math.random() - 0.5), 0.4 + Math.random() * 0.8, -fwdZ * 7 + (Math.random() - 0.5), 0.14, 0.17, this.flames.color, { drag: 3 });
      else if (this.state === 'race' && Math.random() < 0.15) for (const tp of this.tips) this.smoke.emit(tp.x, tp.y, tp.z, -fwdX, 0.6, -fwdZ, 0.5, 0.25, this.c.setRGB(0.6, 0.6, 0.62), { a: 0.25, grow: 2 });
    }
    this.sparks.update(dt);
    this.smoke.update(dt);
    const lk = this.state === 'race' ? (k.boostT > 0 ? 1 : Math.max(0, (k.speed - 25) / 12)) : 0;
    const u = this.lines.mat.uniforms;
    u.uK.value += (lk - u.uK.value) * Math.min(1, dt * 6);
    u.uTime.value = t;
    this.lines.mesh.visible = u.uK.value > 0.02;
  }
  private q1 = new THREE.Quaternion();

  /* ------------------------------------------------------------ camera */
  private updateCamera(dt: number, t: number) {
    const k = this.kart, cam = this.camera;
    const fwd = this.v1.set(Math.sin(k.yaw), 0, Math.cos(k.yaw));
    if (this.state === 'menu' || this.state === 'loading') {
      this.menuA += dt * 0.22;
      const a = k.yaw + 2.3 + Math.sin(this.menuA) * 0.65;
      const desired = this.v2.set(k.pos.x + Math.sin(a) * 5.4, k.pos.y + 1.7, k.pos.z + Math.cos(a) * 5.4);
      this.camPos.lerp(desired, 1 - Math.exp(-dt * 3));
      this.camLook.set(k.pos.x, k.pos.y + 0.75, k.pos.z);
      // wide screens: frame the kart to the right of the menu panel
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
      const distB = 3.2 + Math.min(0.7, k.speed * 0.017) + boost * 0.45;
      const desired = this.v2.set(k.pos.x - Math.sin(cy) * distB * back, k.pos.y + 1.42 + (k.grounded ? 0 : 0.35), k.pos.z - Math.cos(cy) * distB * back);
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
    void t;
  }

  /** Lower the quality (bloom → resolution → shadows) if the device cannot keep up. */
  private adapt(dt: number, t: number) {
    this.frames.push(dt);
    if (this.frames.length > 90) this.frames.shift();
    if (t - this.qualityAt < 2500 || this.frames.length < 60 || this.state === 'paused' || this.state === 'loading') return;
    this.qualityAt = t;
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
    const k = this.kart;
    this.onHud({
      state: this.state, count: Math.ceil(this.countT), lap: Math.min(this.track.def.laps, this.lapTimes.length + 1), laps: this.track.def.laps,
      time: this.raceT, lapTime: this.raceT - this.lapStart, lapTimes: this.lapTimes, bestLap: this.lapTimes.length ? Math.min(...this.lapTimes) : null,
      speed: Math.round(k.speed * 3.6 * 1.25), tier: k.drift ? k.tier : 0, boost: k.boostT > 0, wrongWay: this.wrongT > 1.2,
      results: this.results, x: (k.pos.x - this.mapBox.x0) / this.mapBox.w, z: (k.pos.z - this.mapBox.z0) / this.mapBox.h, yaw: k.yaw, record: this.record,
    });
  }

  /** Tests: run the race without drawing (autopilot), `secs` of game time. */
  simulate(secs: number) {
    if (this.state === 'menu') { this.start(); this.countT = 0; this.go(); }
    const stats = { falls: 0, walls: 0, maxAir: 0, laps: 0, minSpeedAfter5: 99 };
    const n = Math.round(secs / DT);
    for (let i = 0; i < n && this.state === 'race'; i++) {
      this.kart.step(DT, autopilot(this.kart, this.track));
      this.raceLogic(DT);
      for (const e of this.kart.events) { if (e.e === 'fall') stats.falls++; if (e.e === 'wall') stats.walls++; }
      this.kart.events.length = 0;
      if (this.kart.falling) this.respawn();
      if (!this.kart.grounded) stats.maxAir = Math.max(stats.maxAir, this.kart.airT);
      if (this.raceT > 5) stats.minSpeedAfter5 = Math.min(stats.minSpeedAfter5, this.kart.speed);
    }
    stats.laps = this.lapTimes.length;
    return { ...stats, lapTimes: this.lapTimes.map((x) => +x.toFixed(2)), state: this.state, time: +this.raceT.toFixed(2) };
  }

  dispose() {
    cancelAnimationFrame(this.raf);
    stopMusic();
    engineStop();
    this.ro.disconnect();
    this.offs.forEach((f) => f());
    this.view?.dispose();
    this.scenery.dispose();
    this.meshes.group.traverse((o) => { const m = o as THREE.Mesh; if (m.isMesh) m.geometry.dispose(); });
    this.sparks.dispose(); this.smoke.dispose(); this.skids.dispose(); this.flames.dispose(); this.lines.dispose();
    this.composer?.dispose();
    this.envTex?.dispose();
    this.renderer.dispose();
    this.renderer.domElement.remove();
  }
}

export const fmt = (s: number) => {
  const m = Math.floor(s / 60), r = s - m * 60;
  return `${m}:${r < 10 ? '0' : ''}${r.toFixed(2)}`;
};
