/**
 * Taxi Rush — a Crazy-Taxi-style mode on Da World's city, made big.
 *
 * Pick up a passenger (they tell you what they need — "I need to post a
 * letter" — and you say which place that is), follow the arrow to the door
 * before the fare clock runs out, and earn the fare plus a tip. Quiz traffic
 * lights (the ones with a ❓) turn red as you arrive: stop, fix the sentence or
 * answer the ABCD question, and the light goes green with a bonus. How many
 * passengers the shift has is chosen before it starts. In a class room (the
 * game's own QR mode) everybody drives their own cab in the same city, picking
 * from the same queue of passengers towards one shared goal.
 */
import * as THREE from 'three';
import type { Engine } from '../core/engine';
import type { Environment } from '../world/environment';
import type { DayNight } from '../city/daynight';
import { setNightGlow } from '../city/palette';
import { Character } from '../city/character';
import { extListeners, type Session } from '../net/session';
import { TaxiWorld, DISTRICT_LABEL, zoneOfBlock, HWY_Z0, HWY_W, HWY_MID, MIN_X, MAX_X, MIN_Z, MAX_Z, VX, HZ, K_MIN, K_MAX, J_MIN, J_MAX, MAP_MIN_X, MAP_MAX_X, MAP_MIN_Z, MAP_MAX_Z, TAXI_START, paintCoastMap, type QuizLight } from './world';
import { CarBody, TaxiModel, cabFov, loadLook, saveLook, PAINTS, DRIVER_SHIRTS, DRIVER_SKINS, DRIVER_HAIR, DRIVER_OUTFITS, type TaxiLook, type DriveInput } from './car';
import { LIGHT_QUESTIONS, type LightQuestion } from './questions';
import { Smoke } from './smoke';
import { loadSportCar } from './sportcar';
import { TaxiTraffic, type TrafficCar } from './traffic';
import { FrameGovernor } from './governor';
import { loadCarPack } from '../city/carpack';
import type { StreetCar } from '../city/traffic';
import { cluesFor } from './places';
import { PICKUP_LINES, REACTIONS, pick, type ReactionKey } from './directions';
import { Gps } from './gps';
import { TaxiAudio } from './audio';
import { TAXI_CSS } from './ui.css';
import { CAMERA_FAR } from '../world/environment';

/** Minimap: pixels per world unit of the cached base map, and the margin painted round the city. */
const MAP_S = 2, MAP_PAD = 40;
let mapBaseCache: HTMLCanvasElement | null = null;
const ZONE_TINT: Record<string, string> = {
  centre: '#6b5b2a', downtown: '#33466a', harbour: '#1f6275', oldtown: '#6a4630', campus: '#5a3f78',
  airport: '#4b5563', suburbs: '#3f7a45', market: '#7a4a22', parkside: '#2f6b3a', coast: '#8a6f3c',
};

/** ECYR perf: how far the taxi's camera draws (the haze is opaque a little before this). */
const TAXI_FAR = 175;

export interface TaxiDeps {
  engine: Engine;
  environment: Environment;
  dayNight: DayNight;
  /** Hide or show the walking game's own things (player, citizens, HUD). */
  setWalking(visible: boolean): void;
  /** Null when the mode runs on its own (taxi.html): no walking-city traffic to dodge. */
  traffic?: null | { carPositions(): { x: number; z: number }[]; group: THREE.Group; cars?(): StreetCar[]; knock?(c: StreetCar, vx: number, vz: number): void };
  speak(text: string): void;
  session(): Session;
  myName(): string;
  onExit(): void;
  /** ECYR rebuild: running as its own game (taxi.html) rather than inside Da World. */
  standalone?: boolean;
  /** Standalone: open the class lobby (QR code). */
  onClass?(): void;
  /** Standalone: back to the platform's game library. */
  onHome?(): void;
}

/** The racing-taxi wordmark, shared by the loading screen (taxi.html) and the garage. */
export const LOGO_HTML = `<div class="tr-logo" aria-label="Taxi Rush">
  <div class="tr-flag"></div>
  <div class="tr-word"><span class="tr-taxi">TAXI</span><span class="tr-rush">RUSH</span></div>
  <div class="tr-flag tr-flag-b"></div>
  <div class="tr-tag">★ CITY FARE RACING ★</div>
</div>`;

interface Settings { goal: number; pace: 'relaxed' | 'normal' | 'crazy' }

interface Passenger {
  id: number;
  x: number;
  z: number;
  dest: number; // index in world.places
  clue: string;
  /** Who has them: '' waiting, else the driver's id. */
  taker: string;
  look: number;
}

interface Remote { name: string; body: THREE.Group; model: TaxiModel | null; look: string; x: number; z: number; yaw: number; tx: number; tz: number; tyaw: number; money: number; delivered: number; seen: number }

const PACE: Record<Settings['pace'], number> = { relaxed: 1.7, normal: 1.25, crazy: 0.95 };
const SHIRTS = ['#e2516a', '#3fa7d6', '#f2c14e', '#7bc96f', '#8f5be8', '#f08a3c', '#f5f2e8', '#2c2f3a'];
const SKINS = ['#f1c7a3', '#e0ac85', '#c58c62', '#8d5a3b', '#5c3a24'];
const HAIRS = ['#2b1a10', '#4a2b1d', '#c0662f', '#e5c27a', '#111111', '#8a8a8a'];

const el = <K extends keyof HTMLElementTagNameMap>(tag: K, cls = '', html = ''): HTMLElementTagNameMap[K] => {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html) e.innerHTML = html;
  return e;
};
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]!);
const shuffle = <T,>(a: T[]): T[] => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

type Bridge = { start(o: unknown): void; answer(c: boolean, i: unknown): void; end(r: unknown): void };
const bridge = (): Bridge | undefined => (window as unknown as { ECYRBridge?: Bridge }).ECYRBridge;

export class TaxiMode {
  active = false;
  private world: TaxiWorld | null = null;
  private root: HTMLElement;
  private hud: HTMLElement | null = null;
  private audio = new TaxiAudio();
  private qDeck: LightQuestion[] = [];
  private smoke = new Smoke();
  private street: TaxiTraffic | null = null;
  /** Crazy-style combo: near misses and drifts in a row. */
  private combo = 0;
  private comboTime = 0;
  private comboLabel = '';
  private driftTick = 0;
  private look: TaxiLook = loadLook();
  private settings: Settings = { goal: 5, pace: 'normal' };
  private car = new CarBody();
  private model: TaxiModel | null = null;
  private arrow: THREE.Group;
  private destMarker: THREE.Group;
  private passengerMarks = new Map<number, { g: THREE.Group; person: Character }>();
  private keys = new Set<string>();
  private touch = { l: false, r: false, gas: false, brake: false, drift: false, boost: false };
  private paused = false;
  private governor: FrameGovernor;
  private passengers: Passenger[] = [];
  private nextPid = 1;
  private carrying: Passenger | null = null;
  /** The passenger has said where (the student answered): the arrow and the card may show it. */
  private destKnown = false;
  private fareTime = 0;
  private money = 0;
  private delivered = 0;
  private teamDelivered = 0;
  private missed = 0;
  private asked = 0;
  private correct = 0;
  private time = 0;
  private driftTime = 0;
  private lastQuiz = new Map<number, number>();
  private ranRed = new Set<number>();
  private preview: { renderer: THREE.WebGLRenderer; scene: THREE.Scene; cam: THREE.PerspectiveCamera; model: TaxiModel; raf: number } | null = null;
  private remotes = new Map<string, Remote>();
  private lastSend = 0;
  private savedGrade: Record<string, number> | null = null;
  private camPos = new THREE.Vector3();
  private camLook = new THREE.Vector3();
  private mapCanvas: HTMLCanvasElement | null = null;
  private mapBase: HTMLCanvasElement | null = null;
  private say: HTMLElement | null = null;
  private sayTimer = 0;
  private sayFollow = true;
  private sayAnchor = new THREE.Vector3();
  private sayProj = new THREE.Vector3();
  private gps = new Gps();
  private gpsLineId = '';
  private gpsVoice = (() => { try { return localStorage.getItem('taxi.gpsVoice') !== '0'; } catch { return true; } })();
  private lastSpeakAt = -99;
  private bestRoute = Infinity;
  private lastReact = -99;
  private shownMoney = 0;
  private hudCache = new Map<string, string>();
  private hudEls: Record<string, HTMLElement> = {};
  private chaosSp = 0;

  constructor(private deps: TaxiDeps) {
    this.governor = new FrameGovernor({
      engine: deps.engine, environment: deps.environment,
      world: () => this.world, street: () => this.street,
      note: (t) => this.callout(t, '#7fd8ff'),
    });
    const style = document.createElement('style');
    style.textContent = TAXI_CSS;
    document.head.appendChild(style);
    this.root = el('div', 'tx');
    this.root.style.display = 'none';
    document.body.appendChild(this.root);

    // the arrow over the cab
    this.arrow = new THREE.Group();
    const shape = new THREE.Shape();
    shape.moveTo(0, 1.25); shape.lineTo(0.8, 0.15); shape.lineTo(0.32, 0.15); shape.lineTo(0.32, -0.9); shape.lineTo(-0.32, -0.9); shape.lineTo(-0.32, 0.15); shape.lineTo(-0.8, 0.15); shape.closePath();
    const ag = new THREE.ExtrudeGeometry(shape, { depth: 0.26, bevelEnabled: true, bevelSize: 0.07, bevelThickness: 0.07, bevelSegments: 3 });
    ag.translate(0, 0, -0.13); ag.rotateX(-Math.PI / 2);
    const am = new THREE.MeshStandardMaterial({ color: '#7dff6a', emissive: new THREE.Color('#2bd62b'), emissiveIntensity: 0.8, roughness: 0.25, metalness: 0.1 });
    const arrowMesh = new THREE.Mesh(ag, am);
    arrowMesh.castShadow = true;
    // tilted back towards the chase camera, so it reads as an arrow and not as a bar
    arrowMesh.rotation.x = -0.75;
    // ECYR fix: at 1.35 it hid the whole road ahead (and the traffic on it) from the chase camera
    arrowMesh.scale.setScalar(0.95);
    this.arrow.add(arrowMesh);
    this.arrow.visible = false;

    // the destination: a glowing column and a ring on the ground
    this.destMarker = new THREE.Group();
    const col = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 14, 32, 1, true), new THREE.MeshBasicMaterial({ color: '#7dff6a', transparent: true, opacity: 0.22, side: THREE.DoubleSide, depthWrite: false }));
    col.position.y = 7;
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.2, 2.9, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#7dff6a', transparent: true, opacity: 0.85, depthWrite: false }));
    ring.position.y = 0.25;
    this.destMarker.add(col, ring);
    this.destMarker.visible = false;

    addEventListener('keydown', (e) => {
      if (!this.active || this.paused) return;
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'w', 'a', 's', 'd', 'shift', 'h'].includes(k)) e.preventDefault();
      this.keys.add(k);
      if (k === 'h') this.audio.play('horn');
    });
    addEventListener('keyup', (e) => this.keys.delete(e.key.toLowerCase()));
    addEventListener('blur', () => this.keys.clear());

    // a class room starting a shift pulls everybody in
    extListeners.add((from, d) => this.onNet(from, d as Record<string, unknown>));
  }

  /* ================================================================ *
   * Setup screen                                                      *
   * ================================================================ */

  openSetup(): void {
    if (this.look.body === 'sport') void loadSportCar();
    void loadCarPack();
    this.deps.setWalking(false);
    if (isTouchDevice()) document.documentElement.classList.add('tx-touchmode');
    this.root.style.display = '';
    this.root.innerHTML = '';
    const s = el('div', 'tx-setup');
    const sess = this.deps.session();
    const inRoom = sess.connected;
    const host = inRoom && sess.myId === 'host';
    const chip = (attr: string, val: string, on: boolean, label: string) => `<button class="tx-chip${on ? ' on' : ''}" data-${attr}="${val}">${label}</button>`;
    const sw = (attr: string, c: string, on: boolean) => `<button class="tx-sw${on ? ' on' : ''}" data-${attr}="${c}" style="background:${c}" aria-label="${attr} ${c}"></button>`;
    const classBtn = inRoom ? (host ? '<button class="tx-chip" data-class="1">📱 QR</button>' : '') : this.deps.standalone ? '<button class="tx-chip" data-class="1">📱 Class (QR)</button>' : '';
    const roomMsg = inRoom && !host ? '<div class="tx-room">⏳ Waiting for your teacher to start…</div>' : '';
    s.innerHTML = `
      <div class="tx-wrap">
        <div class="tx-logo">${LOGO_HTML}</div>
        <div class="tx-view"><div class="tx-card"><div class="tx-preview" id="txPreview"></div></div></div>
        <div class="tx-opts-main">
          <div class="tx-row"><span class="tx-lbl">Passengers to deliver</span>${[3, 5, 8, 10, 15, 20].map((n) => chip('goal', String(n), n === this.settings.goal, String(n))).join('')}</div>
          <div class="tx-row sws"><span class="tx-lbl">Taxi colour</span>${PAINTS.map((c) => sw('paint', c, c === this.look.color)).join('')}</div>
          <div class="tx-btns"><button class="tx-chip on" data-cust="1">🎨 Customize</button>${classBtn}<button class="tx-chip" data-back="1">${this.deps.standalone ? '← Games' : '← Da World'}</button></div>
        </div>
        <div class="tx-bottom">
          ${roomMsg || '<button class="tx-go" data-go="1">▶ START SHIFT</button>'}
        </div>
        ${this.custOpen ? `<div class="tx-cust"><div class="tx-card">
          <h2>Customize</h2><button class="tx-cust-x" data-cust="0" aria-label="Close">✕</button>
          <div class="tx-row"><span class="tx-lbl">Fare clock</span>${(['relaxed', 'normal', 'crazy'] as const).map((p) => chip('pace', p, p === this.settings.pace, p === 'relaxed' ? '🐢 Relaxed' : p === 'normal' ? '🚕 Normal' : '🔥 Crazy')).join('')}</div>
          <div class="tx-row"><span class="tx-lbl">Cab</span>${(['classic', 'sport'] as const).map((v) => chip('body', v, v === (this.look.body ?? 'classic'), v === 'classic' ? '🚕 Classic' : '🏎️ Sport')).join('')}</div>
          <div class="tx-row"><span class="tx-lbl">Livery</span>${(['checker', 'stripe', 'flames', 'none'] as const).map((v) => chip('stripe', v, v === this.look.stripe, v)).join('')}</div>
          <div class="tx-row"><span class="tx-lbl">Rims</span>${(['chrome', 'black', 'gold'] as const).map((v) => chip('rims', v, v === this.look.rims, v)).join('')}</div>
          <div class="tx-row"><span class="tx-lbl">Roof sign</span>${(['classic', 'neon', 'none'] as const).map((v) => chip('roof', v, v === this.look.roof, v)).join('')}</div>
          <div class="tx-row"><span class="tx-lbl">Skin</span>${DRIVER_SKINS.map((c) => sw('skin', c, c === this.look.driver.skin)).join('')}</div>
          <div class="tx-row"><span class="tx-lbl">Hair</span>${DRIVER_HAIR.map((c) => sw('hair', c, c === this.look.driver.hair)).join('')}</div>
          <div class="tx-row"><span class="tx-lbl">Shirt</span>${DRIVER_SHIRTS.map((c) => sw('shirt', c, c === this.look.driver.shirt)).join('')}</div>
          <div class="tx-row"><span class="tx-lbl">Style</span>${DRIVER_OUTFITS.map((o) => chip('outfit', o ?? '', o === this.look.driver.outfit, o === 'cap' ? '🧢 Cap' : o === 'hat' ? '👒 Hat' : o === 'glasses' ? '🕶️ Shades' : 'None')).join('')}</div>
          <div class="tx-note">Drive: <b>W A S D</b> or arrows · <b>Space</b> drift · <b>Shift</b> turbo · <b>H</b> horn. On a phone, use the buttons on screen.</div>
        </div></div>` : ''}
      </div>`;
    this.root.appendChild(s);
    if (this.setupKey) removeEventListener('keydown', this.setupKey);
    this.setupKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && this.custOpen && this.root.querySelector('.tx-setup')) { this.custOpen = false; this.rerenderSetup(); }
    };
    addEventListener('keydown', this.setupKey);
    s.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
      if (!b) return;
      const d = b.dataset;
      if (d.cust !== undefined) this.custOpen = d.cust === '1';
      else if (d.goal) this.settings.goal = Number(d.goal);
      else if (d.pace) this.settings.pace = d.pace as Settings['pace'];
      else if (d.paint) this.look.color = d.paint;
      else if (d.body) this.look.body = d.body as TaxiLook['body'];
      else if (d.stripe) this.look.stripe = d.stripe as TaxiLook['stripe'];
      else if (d.rims) this.look.rims = d.rims as TaxiLook['rims'];
      else if (d.roof) this.look.roof = d.roof as TaxiLook['roof'];
      else if (d.skin) this.look.driver.skin = d.skin;
      else if (d.hair) this.look.driver.hair = d.hair;
      else if (d.shirt) this.look.driver.shirt = d.shirt;
      else if (d.outfit !== undefined && 'outfit' in d) this.look.driver.outfit = (d.outfit || undefined) as TaxiLook['driver']['outfit'];
      else if (d.go) { this.custOpen = false; saveLook(this.look); this.closePreview(); if (host) sess.ext({ k: 'start', goal: this.settings.goal, pace: this.settings.pace }); this.start(); return; }
      else if (d.back) { this.closePreview(); if (this.deps.standalone) { this.deps.onHome?.(); return; } this.exit(); return; }
      else if (d.class) { this.closePreview(); this.root.style.display = 'none'; this.deps.onClass?.(); return; }
      else return;
      saveLook(this.look);
      this.rerenderSetup();
    });
    this.mountPreview(null);
  }

  private custOpen = false;
  private setupKey: ((e: KeyboardEvent) => void) | null = null;
  private previewRO: ResizeObserver | null = null;
  private rerenderSetup(): void {
    const keep = this.preview;
    this.preview = null;
    if (keep) cancelAnimationFrame(keep.raf);
    this.openSetupKeepPreview(keep);
  }

  /** Re-render the setup, reusing the preview renderer (only the cab is rebuilt). */
  private openSetupKeepPreview(keep: TaxiMode['preview']): void {
    this.openSetup();
    if (keep && this.preview) { /* openSetup made a new one */ keep.renderer.dispose(); }
  }

  private mountPreview(_unused: null): void {
    const host = this.root.querySelector('#txPreview') as HTMLElement | null;
    if (!host) return;
    if (this.preview) { this.closePreview(); }
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    const w = host.clientWidth || 480, h = host.clientHeight || 330;
    renderer.setPixelRatio(Math.min(2, devicePixelRatio));
    renderer.setSize(w, h, false);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.shadowMap.enabled = true;
    host.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const pm = new THREE.PMREMGenerator(renderer);
    const env = new THREE.Scene();
    env.background = new THREE.Color('#9ad4ff');
    const sky = new THREE.Mesh(new THREE.SphereGeometry(10, 16, 8), new THREE.MeshBasicMaterial({ color: '#bfe6ff', side: THREE.BackSide }));
    const sunBall = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), new THREE.MeshBasicMaterial({ color: '#fff6dc' }));
    sunBall.position.set(4, 6, 3);
    const floor = new THREE.Mesh(new THREE.PlaneGeometry(30, 30).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#3b4660' }));
    floor.position.y = -2;
    env.add(sky, sunBall, floor);
    scene.environment = pm.fromScene(env, 0.02).texture;
    const sun = new THREE.DirectionalLight('#fff2dc', 2.4); sun.position.set(3, 6, 4); sun.castShadow = true;
    scene.add(sun, new THREE.HemisphereLight('#dff0ff', '#3a4a6b', 0.5));
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.4, 0.12, 48), new THREE.MeshStandardMaterial({ color: '#232b3e', roughness: 0.4, metalness: 0.4 }));
    disc.position.y = -0.06; disc.receiveShadow = true;
    scene.add(disc);
    const m = new TaxiModel(this.look);
    scene.add(m.group);
    const cam = new THREE.PerspectiveCamera(32, w / h, 0.1, 50);
    cam.position.set(2.9, 1.35, 3.6); cam.lookAt(0, 0.38, 0);
    const p = { renderer, scene, cam, model: m, raf: 0 };
    let t = 0;
    const loop = () => {
      t += 0.012;
      m.group.rotation.y = 0.6 + t;
      m.animate(0, 0, 1 / 60, false, 0);
      renderer.render(scene, cam);
      p.raf = requestAnimationFrame(loop);
    };
    loop();
    this.preview = p;
    this.previewRO?.disconnect();
    this.previewRO = new ResizeObserver(() => {
      const nw = host.clientWidth, nh = host.clientHeight;
      if (!nw || !nh) return;
      renderer.setSize(nw, nh, false);
      cam.aspect = nw / nh; cam.updateProjectionMatrix();
    });
    this.previewRO.observe(host);
  }

  private closePreview(): void {
    this.previewRO?.disconnect(); this.previewRO = null;
    if (this.setupKey && !this.root.querySelector('.tx-setup')) { removeEventListener('keydown', this.setupKey); this.setupKey = null; }
    if (!this.preview) return;
    cancelAnimationFrame(this.preview.raf);
    this.preview.model.dispose();
    this.preview.scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      m.geometry.dispose();
      for (const mt of Array.isArray(m.material) ? m.material : [m.material]) mt.dispose();
    });
    (this.preview.scene.environment as THREE.Texture | null)?.dispose();
    this.preview.renderer.dispose();
    this.preview.renderer.forceContextLoss();
    this.preview.renderer.domElement.remove();
    this.preview = null;
  }

  /* ================================================================ *
   * Start / stop                                                      *
   * ================================================================ */

  start(): void {
    this.root.innerHTML = '<div class="tx-loading">🚕 Building the big city…</div>';
    this.root.style.display = '';
    this.deps.setWalking(false);
    // give the loading card a frame to paint before the heavy build
    requestAnimationFrame(() => setTimeout(() => this.begin(), 30));
  }

  private begin(): void {
    const scene = this.deps.engine.scene;
    if (!this.world) {
      this.world = new TaxiWorld();
      scene.add(this.world.group);
      void loadCarPack().then(() => {
        if (this.street) return;
        const tier = this.deps.engine.quality.name;
        this.street = new TaxiTraffic(FrameGovernor.trafficDensity(tier));
        this.governor.attachStreet();
        this.deps.engine.scene.add(this.street.group);
        this.street.setVisible(this.active);
        this.street.clearArea(TAXI_START.x, TAXI_START.z, 22);
      });
    }
    this.world.setVisible(true);
    this.street?.setVisible(true);
    scene.add(this.arrow, this.destMarker);
    if (this.model) { scene.remove(this.model.group); this.model.dispose(); }
    this.model = new TaxiModel(this.look);
    scene.add(this.model.group);
    // start on Main Street, by the taxi rank, facing east
    this.car = new CarBody();
    this.car.x = TAXI_START.x; this.car.z = TAXI_START.z; this.car.yaw = TAXI_START.yaw;
    this.street?.clearArea(TAXI_START.x, TAXI_START.z, 22);
    this.money = 0; this.delivered = 0; this.teamDelivered = 0; this.missed = 0; this.asked = 0; this.correct = 0; this.time = 0;
    this.carrying = null; this.passengers = []; this.ranRed.clear(); this.lastQuiz.clear(); this.combo = 0; this.comboTime = 0;
    for (const m of this.passengerMarks.values()) this.dropMark(m);
    this.passengerMarks.clear();
    this.active = true;
    this.paused = false;
    this.deps.dayNight.hours = 16.2; // golden afternoon, Crazy Taxi weather
    this.retroGrade(true);
    this.buildHud();
    this.audio.start();
    this.audio.play('go');
    this.callout('LET’S GO!');
    if (this.isAuthority()) this.topUpPassengers();
    const sess = this.deps.session();
    bridge()?.start({ mode: sess.connected ? 'class' : 'solo', meta: { gameMode: 'taxi', passengers: this.settings.goal, pace: this.settings.pace } });
    this.camPos.set(this.car.x - 8, 5, this.car.z);
    // ECYR perf: draw only as far as the haze reaches (it is opaque past ~160 m), keep the sky dome
    // inside that range, and refresh reflections every few seconds instead of every block.
    const cam = this.deps.engine.camera;
    cam.far = TAXI_FAR; cam.updateProjectionMatrix();
    this.deps.environment.setDomeScale(0.5);
    this.deps.environment.setProbeCadence(6, 140);
    this.governor.reset();
  }

  /** Back to the walking game. */
  exit(): void {
    const cam = this.deps.engine.camera;
    cam.far = CAMERA_FAR; cam.updateProjectionMatrix();
    this.deps.environment.setDomeScale(1);
    this.deps.environment.setProbeCadence(2.5, 18);
    this.smoke.points.parent?.remove(this.smoke.points);
    this.deps.engine.post.setSpeedBlur(0);
    if (this.active) this.finishReport(false);
    this.active = false;
    this.audio.stop();
    const scene = this.deps.engine.scene;
    if (this.world) this.world.setVisible(false);
    this.street?.setVisible(false);
    scene.remove(this.arrow, this.destMarker);
    if (this.model) { scene.remove(this.model.group); this.model.dispose(); this.model = null; }
    for (const m of this.passengerMarks.values()) this.dropMark(m);
    this.passengerMarks.clear();
    for (const r of this.remotes.values()) scene.remove(r.body);
    this.remotes.clear();
    this.retroGrade(false);
    this.root.innerHTML = '';
    this.root.style.display = 'none';
    this.deps.setWalking(true);
    this.deps.onExit();
  }

  private retroGrade(on: boolean): void {
    const u = this.deps.engine.post.grade.uniforms as Record<string, { value: unknown }>;
    if (on) {
      this.savedGrade = { s: u.uSaturation.value as number, c: u.uContrast.value as number, w: u.uWarmth.value as number };
    } else if (this.savedGrade) {
      u.uSaturation.value = this.savedGrade.s; u.uContrast.value = this.savedGrade.c; u.uWarmth.value = this.savedGrade.w;
      this.savedGrade = null;
    }
  }

  /* ================================================================ *
   * HUD                                                               *
   * ================================================================ */

  private buildHud(): void {
    this.root.innerHTML = '';
    const h = el('div', 'tx-hud');
    h.innerHTML = `
      <div class="tx-tl"><div class="tx-arrow" id="txArrow"><svg viewBox="0 0 100 100" aria-hidden="true"><path d="M50 4 L94 60 L64 52 L64 96 L36 96 L36 52 L6 60 Z"/></svg></div>
        <div class="tx-info"><div class="tx-k" id="txDK">PASSENGER</div><div class="tx-dn" id="txDN"></div><div class="tx-fare" id="txFare"></div><div class="tx-prog" id="txProg"></div></div></div>
      <div class="tx-tc" id="txMapBox"><canvas id="txMap" width="440" height="300"></canvas></div>
      <div class="tx-tr"><div class="tx-time" id="txTime"><span id="txTimeV">-</span><i class="tx-bonus" id="txBonus"></i></div>
        <div class="tx-earn">EARNED <b id="txEarn">$0</b></div>
        <div class="tx-gps" id="txGps" data-gps="1"><div class="tx-gpsl big" id="txGpsL"></div><div class="tx-gpss" id="txGpsS"></div></div></div>
      <div class="tx-mates" id="txMates"></div>
      <div class="tx-combo" id="txCombo"></div>
      <div class="tx-speed"><div class="n big outline" id="txSpeed">0</div><div class="u">KM/H</div><div class="tx-boost"><i id="txBoost"></i></div></div>
      <button class="tx-home" data-home="1">🏠 Exit</button>
      <div class="tx-touch" id="txTouch"></div>`;
    this.root.appendChild(h);
    this.hud = h;
    h.querySelector('[data-home]')!.addEventListener('click', () => this.confirmExit());
    this.hudEls = {};
    for (const id of ['txMap', 'txArrow', 'txDK', 'txDN', 'txFare', 'txProg', 'txTime', 'txTimeV', 'txBonus', 'txEarn', 'txGps', 'txGpsL', 'txGpsS', 'txMates', 'txCombo', 'txSpeed', 'txBoost']) this.hudEls[id] = h.querySelector('#' + (id === 'txMap' ? 'txMapBox' : id)) as HTMLElement;
    this.hudCache.clear();
    this.gps.reset(); this.gpsLineId = ''; this.shownMoney = this.money;
    h.querySelector('#txGps')!.addEventListener('click', () => {
      this.gpsVoice = !this.gpsVoice;
      try { localStorage.setItem('taxi.gpsVoice', this.gpsVoice ? '1' : '0'); } catch { /* ignore */ }
      if (!this.gpsVoice) window.speechSynthesis?.cancel();
      this.callout(this.gpsVoice ? 'GPS VOICE ON' : 'GPS VOICE OFF', '#7fd8ff');
    });
    this.mapCanvas = h.querySelector('#txMap');
    this.mapBase = this.drawMapBase();
    if (isTouchDevice()) this.buildTouch(h.querySelector('#txTouch')!);
  }

  private buildTouch(host: HTMLElement): void {
    const pads: [keyof TaxiMode['touch'], string, string, string][] = [
      ['l', '◀', 'pl', 'Steer left'], ['r', '▶', 'pr', 'Steer right'],
      ['brake', 'R', 'pv rv', 'Brake / reverse'], ['gas', 'D', 'pd d', 'Accelerate'],
    ];
    for (const [k, label, cls, aria] of pads) {
      const b = el('button', 'tx-pad ' + cls, label);
      b.setAttribute('aria-label', aria);
      const active = new Set<number>();
      const set = () => { const v = active.size > 0; this.touch[k] = v; b.classList.toggle('on', v); };
      b.addEventListener('pointerdown', (e) => { e.preventDefault(); active.add(e.pointerId); try { b.setPointerCapture(e.pointerId); } catch { /* ignore */ } set(); });
      const up = (e: PointerEvent) => { active.delete(e.pointerId); set(); };
      b.addEventListener('pointerup', up);
      b.addEventListener('pointercancel', up);
      b.addEventListener('lostpointercapture', up);
      b.addEventListener('contextmenu', (e) => e.preventDefault());
      host.appendChild(b);
    }
  }

  private confirmExit(): void {
    this.paused = true;
    const m = el('div', 'tx-modal');
    m.innerHTML = `<div class="tx-q"><div class="k">END THE SHIFT?</div><div class="qq">You have $${this.money} and ${this.delivered} passenger${this.delivered === 1 ? '' : 's'} delivered.</div><div class="tx-opts"><button class="tx-opt" data-a="results"><b>✓</b>See my results</button><button class="tx-opt" data-a="keep"><b>↩</b>Keep driving</button></div></div>`;
    this.root.appendChild(m);
    m.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
      if (!b) return;
      m.remove();
      if (b.dataset.a === 'results') this.results(false); else this.paused = false;
    });
  }

  private callout(text: string, color = '#ffd21f'): void {
    if (!this.root) return;
    const c = el('div', 'tx-call big outline', esc(text));
    c.style.color = color;
    this.root.appendChild(c);
    setTimeout(() => c.remove(), 1500);
  }

  /** A speech bubble anchored over the passenger (follows the cab) or over a fixed spot (they have got out). */
  private bubble(text: string, secs = 2.8, follow = true): void {
    this.say?.remove();
    this.say = el('div', 'tx-bubble', text);
    this.root.appendChild(this.say);
    this.sayTimer = secs;
    this.sayFollow = follow;
    this.sayAnchor.set(this.car.x, 1.9, this.car.z);
    this.placeBubble();
  }

  private placeBubble(): void {
    const b = this.say; if (!b) return;
    if (this.sayFollow) this.sayAnchor.set(this.car.x, 1.9, this.car.z);
    const cam = this.deps.engine.camera;
    const v = this.sayProj.copy(this.sayAnchor).project(cam);
    const behind = v.z > 1 || Math.abs(v.x) > 1.2 || Math.abs(v.y) > 1.2;
    b.style.opacity = behind ? '0' : this.sayTimer < 0.25 ? String(Math.max(0, this.sayTimer / 0.25)) : '1';
    const w = innerWidth, h = innerHeight;
    const x = Math.max(8, Math.min(w - 8, (v.x * 0.5 + 0.5) * w)), y = (-v.y * 0.5 + 0.5) * h;
    // never over the minimap: sit just below it if the cab is high on the screen
    const mapB = this.hudEls.txMap ? this.hudEls.txMap.getBoundingClientRect().bottom : 0;
    const yy = Math.max(y, mapB + b.offsetHeight + 16);
    b.style.transform = `translate(${x.toFixed(1)}px, ${yy.toFixed(1)}px) translate(-50%, -100%)`;
  }

  /** The passenger reacts (arrival, crash, wrong turn); never twice in a few seconds. */
  private react(key: ReactionKey, secs = 2.6, follow = true, force = false): void {
    if (!force && this.time - this.lastReact < 5) return;
    this.lastReact = this.time;
    const r = pick(REACTIONS[key], this.delivered * 13 + this.asked * 5 + Math.floor(this.time));
    this.bubble(esc(r.text), secs, follow);
  }

  private setText(id: string, v: string): void {
    if (this.hudCache.get(id) === v) return;
    this.hudCache.set(id, v);
    const e = this.hudEls[id]; if (e) e.textContent = v;
  }
  private setHtml(id: string, v: string): void {
    if (this.hudCache.get(id) === v) return;
    this.hudCache.set(id, v);
    const e = this.hudEls[id]; if (e) e.innerHTML = v;
  }

  private updateHud(): void {
    const h = this.hud; if (!h || !this.world) return;
    const E = this.hudEls;
    const sess = this.deps.session();
    const done = sess.connected ? this.teamDelivered : this.delivered;
    const dest = this.carrying && this.destKnown ? this.world.places[this.carrying.dest] : null;
    const wait = this.carrying ? null : this.nearestWaiting();
    const tgt = dest ?? wait;
    // top left: arrow (relative to the heading), what and where, the fare
    if (tgt) {
      const wp = this.world.waypoint(this.car.x, this.car.z, this.car.yaw, tgt.x, tgt.z);
      const a = Gps.bearing(this.car, wp.x, wp.z);
      E.txArrow.style.transform = `rotate(${a.toFixed(3)}rad)`;
    }
    E.txArrow.classList.toggle('pick', !dest);
    const dm = tgt ? Math.round(Math.hypot(tgt.x - this.car.x, tgt.z - this.car.z) * 1.5) : 0;
    if (dest) {
      this.setText('txDK', 'DESTINATION');
      this.setText('txDN', dest.emoji + ' ' + dest.name);
      this.setText('txFare', `FARE $${this.fareOf(this.carrying!)} · ${dm} m`);
    } else if (this.carrying) {
      this.setText('txDK', 'PASSENGER ABOARD');
      this.setText('txDN', 'Where to?');
      this.setText('txFare', '');
    } else {
      this.setText('txDK', 'NEXT FARE');
      this.setText('txDN', wait ? 'Pick up a passenger' : 'Looking for fares…');
      this.setText('txFare', wait ? `${dm} m · follow the arrow` : '');
    }
    this.setText('txProg', `🧍 ${done}/${this.settings.goal}  ✅ ${this.correct}/${this.asked}`);
    // top right: time, earnings (counting up), the GPS under them
    const live = !!(this.carrying && this.destKnown);
    const t = Math.max(0, this.fareTime);
    this.setText('txTimeV', live ? `${Math.floor(t / 60)}'${String(Math.floor(t % 60)).padStart(2, '0')}"${String(Math.floor((t % 1) * 100)).padStart(2, '0')}` : fmt(this.time));
    E.txTime.classList.toggle('hot', live && t <= 10);
    E.txTime.classList.toggle('idle', !live);
    if (this.shownMoney !== this.money) {
      const up = this.money > this.shownMoney;
      this.shownMoney += (this.money - this.shownMoney) * 0.12;
      if (Math.abs(this.money - this.shownMoney) < 0.6) this.shownMoney = this.money;
      if (up && !E.txEarn.classList.contains('pop')) { E.txEarn.classList.add('pop'); setTimeout(() => E.txEarn.classList.remove('pop'), 350); }
    }
    this.setText('txEarn', '$' + Math.round(this.shownMoney));
    this.updateGps(live);
    this.setText('txSpeed', String(Math.round(Math.abs(this.car.speed) * 5.4)));
    const combo = E.txCombo;
    const on = this.combo > 0;
    combo.style.opacity = on ? '1' : '0';
    if (on) this.setHtml('txCombo', `<div class="t big outline">${this.comboLabel}!</div><div class="c"><b class="big outline">${this.combo}</b> COMBO · +$${Math.min(10, this.combo)}</div>`);
    const bw = Math.round(this.car.boostFuel * 100) + '%';
    if (this.hudCache.get('boost') !== bw) { this.hudCache.set('boost', bw); E.txBoost.style.width = bw; }
    this.setHtml('txMates', [...this.remotes.values()].map((r) => `<span>🚕 ${esc(r.name)} · $${r.money}</span>`).join(''));
    this.drawMap();
  }

  private flashBonus(txt: string): void {
    const e = this.hudEls.txBonus; if (!e) return;
    e.textContent = txt; e.classList.remove('go'); void e.offsetWidth; e.classList.add('go');
  }

  private fareOf(p: Passenger): number {
    const d = this.world!.places[p.dest];
    return Math.round(8 + Math.hypot(d.x - p.x, d.z - p.z) / 5);
  }

  /** The big GPS phrase: only rewritten when the manoeuvre changes. */
  private updateGps(live: boolean): void {
    const E = this.hudEls, w = this.world!;
    if (!live || !this.carrying) {
      if (this.gpsLineId) { this.gpsLineId = ''; this.gps.reset(); E.txGps.classList.remove('on'); }
      return;
    }
    const d = w.places[this.carrying.dest];
    const { line, changed } = this.gps.update(w, this.car, d, this.time, this.carrying.id);
    if (!changed && this.gpsLineId === line.id) return;
    this.gpsLineId = line.id;
    E.txGpsL.textContent = line.text.toUpperCase();
    E.txGpsS.textContent = line.es ?? '';
    E.txGps.classList.remove('on'); void E.txGps.offsetWidth; E.txGps.classList.add('on');
    E.txGps.dataset.key = line.key;
    // optional voice: never over another utterance, never faster than every few seconds
    const syn = window.speechSynthesis;
    if (this.gpsVoice && syn && !syn.speaking && this.time - this.lastSpeakAt > 3.5) { this.lastSpeakAt = this.time; this.deps.speak(line.text); }
  }

  /* ---- minimap ---- */
  /**
   * The static map — lawn, sea, districts, roads, highway, labels — is painted once (it is the same
   * city every shift) and reused; each frame only rotates it and draws the markers on top.
   */
  private drawMapBase(): HTMLCanvasElement {
    if (mapBaseCache) return mapBaseCache;
    const s = MAP_S, P = MAP_PAD;
    const W = MAP_MAX_X - MAP_MIN_X + P * 2, H = MAP_MAX_Z - MAP_MIN_Z + P * 2;
    const cv = document.createElement('canvas');
    cv.width = W * s; cv.height = H * s;
    const c = cv.getContext('2d')!;
    const X = (x: number) => (x - MAP_MIN_X + P) * s, Z = (z: number) => (z - MAP_MIN_Z + P) * s;
    c.fillStyle = '#26472e'; c.fillRect(0, 0, cv.width, cv.height);
    paintCoastMap(c, X, Z, s, false); // the sea, the beach and the boardwalk (world.ts)
    // districts: every block tinted by where it is
    const sums = new Map<string, { x: number; z: number; n: number }>();
    for (let k = K_MIN - 1; k <= K_MAX; k++) {
      for (let j = J_MIN - 1; j <= J_MAX; j++) {
        const x0 = Math.max(VX(k) + 6, MIN_X), x1 = Math.min(VX(k + 1), MAX_X);
        const z0 = Math.max(HZ(j) + 6, MIN_Z), z1 = j >= J_MAX ? HWY_Z0 : HZ(j + 1);
        const zone = zoneOfBlock(k, j);
        c.fillStyle = ZONE_TINT[zone]; c.fillRect(X(x0), Z(z0), (x1 - x0) * s, (z1 - z0) * s);
        const e = sums.get(zone) ?? { x: 0, z: 0, n: 0 };
        e.x += (x0 + x1) / 2; e.z += (z0 + z1) / 2; e.n++; sums.set(zone, e);
      }
    }
    c.fillStyle = '#3b4252';
    for (let k = K_MIN; k <= K_MAX; k++) c.fillRect(X(VX(k)), Z(MIN_Z), 6 * s, (HWY_Z0 - MIN_Z) * s);
    for (let j = J_MIN; j <= J_MAX; j++) c.fillRect(X(MIN_X), Z(HZ(j)), (MAX_X - MIN_X) * s, 6 * s);
    // the highway: six lanes, a yellow median
    c.fillStyle = '#5a6272'; c.fillRect(X(MIN_X), Z(HWY_Z0), (MAX_X - MIN_X) * s, HWY_W * s);
    c.fillStyle = '#f2c230'; c.fillRect(X(MIN_X), Z(HWY_MID) - 1, (MAX_X - MIN_X) * s, 2);
    paintCoastMap(c, X, Z, s, true); // Ocean Drive and the pier
    c.strokeStyle = 'rgba(255,210,31,.55)'; c.lineWidth = 3; c.setLineDash([10, 8]);
    c.strokeRect(X(VX(-1) + 6), Z(HZ(-1) + 6), (VX(4) - VX(-1) - 6) * s, (HZ(5) - HZ(-1) - 6) * s);
    c.setLineDash([]);
    // labels
    c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
    c.font = '800 22px "Trebuchet MS",Arial,sans-serif'; c.lineWidth = 5; c.strokeStyle = 'rgba(8,12,20,.85)'; c.fillStyle = '#fff';
    for (const [zone, e] of sums) { const t = DISTRICT_LABEL[zone as keyof typeof DISTRICT_LABEL].toUpperCase(); c.strokeText(t, X(e.x / e.n), Z(e.z / e.n)); c.fillText(t, X(e.x / e.n), Z(e.z / e.n)); }
    c.font = '800 20px Arial,sans-serif'; c.strokeText('HIGHWAY 1', X((MIN_X + MAX_X) / 2), Z(HWY_Z0 + HWY_W / 2)); c.fillText('HIGHWAY 1', X((MIN_X + MAX_X) / 2), Z(HWY_Z0 + HWY_W / 2));
    c.font = '800 20px Arial,sans-serif'; c.strokeText('SEA', X(MAX_X) + 60, Z((MIN_Z + MAX_Z) / 2)); c.fillText('SEA', X(MAX_X) + 60, Z((MIN_Z + MAX_Z) / 2));
    mapBaseCache = cv;
    return cv;
  }

  private drawMap(): void {
    const cv = this.mapCanvas, base = this.mapBase; if (!cv || !base || !this.world) return;
    const c = cv.getContext('2d')!, s = MAP_S, R = 75; // world units shown each side
    const k = cv.width / (R * 2 * s), ang = 0; // north up: labels stay upright, the cab's arrow turns
    c.save();
    c.fillStyle = '#2b4a6b'; c.fillRect(0, 0, cv.width, cv.height);
    c.translate(cv.width / 2, cv.height / 2);
    c.rotate(ang);
    c.scale(k, k);
    c.drawImage(base, -(this.car.x - MAP_MIN_X + MAP_PAD) * s, -(this.car.z - MAP_MIN_Z + MAP_PAD) * s);
    const dot = (x: number, z: number, col: string, r: number) => {
      c.fillStyle = col; c.strokeStyle = '#0b0e14'; c.lineWidth = 2.5;
      c.beginPath(); c.arc((x - this.car.x) * s, (z - this.car.z) * s, r, 0, 7); c.fill(); c.stroke();
    };
    for (const p of this.passengers) if (!p.taker) dot(p.x, p.z, this.fareColor(p), 9);
    for (const L of this.world.lights) if (L.red && !L.cleared) dot(L.x, L.z, '#ff4a3d', 5);
    for (const r of this.remotes.values()) dot(r.x, r.z, '#ff7af6', 7);
    const dest = this.carrying && this.destKnown ? this.world.places[this.carrying.dest] : null;
    if (dest && this.gps.route.length > 1) {
      // the route to the door, cyan
      c.strokeStyle = '#38d6ff'; c.lineWidth = 5; c.lineJoin = 'round'; c.beginPath();
      this.gps.route.forEach((q, i) => { const X = (q.x - this.car.x) * s, Z = (q.z - this.car.z) * s; if (i) c.lineTo(X, Z); else c.moveTo(X, Z); });
      c.stroke();
    }
    if (dest) {
      // the chequered pin
      const X = (dest.x - this.car.x) * s, Z = (dest.z - this.car.z) * s, q = 7;
      c.save(); c.translate(X, Z); c.rotate(-ang);
      for (let i = 0; i < 4; i++) { c.fillStyle = (i % 3 === 0) ? '#fff' : '#0b0b0c'; c.fillRect((i % 2 - 1) * q, (Math.floor(i / 2) - 1) * q, q, q); }
      c.strokeStyle = '#ffd21a'; c.lineWidth = 2.5; c.strokeRect(-q, -q, q * 2, q * 2);
      c.restore();
    }
    c.restore();
    // a destination off the map: an arrow on the rim, pointing at it
    if (dest) {
      const rx = (dest.x - this.car.x) * s * k, rz = (dest.z - this.car.z) * s * k;
      const sx = rx * Math.cos(ang) - rz * Math.sin(ang), sy = rx * Math.sin(ang) + rz * Math.cos(ang);
      const hw = cv.width / 2 - 18, hh = cv.height / 2 - 18;
      if (Math.abs(sx) > hw || Math.abs(sy) > hh) {
        const dist = Math.hypot(sx, sy), ux = sx / dist, uy = sy / dist, tk = Math.min(hw / Math.max(1e-6, Math.abs(ux)), hh / Math.max(1e-6, Math.abs(uy))), bx = cv.width / 2 + ux * tk, by = cv.height / 2 + uy * tk;
        c.fillStyle = '#7dff6a'; c.strokeStyle = '#0b0e14'; c.lineWidth = 3;
        c.beginPath(); c.moveTo(bx + ux * 11, by + uy * 11); c.lineTo(bx - ux * 7 - uy * 9, by - uy * 7 + ux * 9); c.lineTo(bx - ux * 7 + uy * 9, by - uy * 7 - ux * 9); c.closePath(); c.fill(); c.stroke();
      }
    }
    c.fillStyle = '#ffd21f'; c.strokeStyle = '#0b0e14'; c.lineWidth = 3;
    c.save(); c.translate(cv.width / 2, cv.height / 2); c.rotate(Math.PI - this.car.yaw);
    c.beginPath(); c.moveTo(0, -14); c.lineTo(10, 10); c.lineTo(-10, 10); c.closePath(); c.fill(); c.stroke(); c.restore();
  }

  /* ================================================================ *
   * Passengers                                                        *
   * ================================================================ */

  /** The host (or a solo player) owns the queue of passengers. */
  private isAuthority(): boolean {
    const s = this.deps.session();
    return !s.connected || s.myId === 'host';
  }

  private myId(): string {
    return this.deps.session().myId ?? 'me';
  }

  private fareColor(p: Passenger): string {
    if (!this.world) return '#fff';
    const d = this.world.places[p.dest];
    const dist = Math.hypot(d.x - p.x, d.z - p.z);
    return dist > 150 ? '#7dff6a' : dist > 80 ? '#ffd21f' : '#ff7a3d';
  }

  private topUpPassengers(): void {
    if (!this.world) return;
    const done = this.deps.session().connected ? this.teamDelivered : this.delivered;
    const left = this.settings.goal - done;
    const want = Math.min(left - this.passengers.filter((p) => p.taker).length, 6);
    let changed = false;
    const places = this.world.places;
    while (this.passengers.filter((p) => !p.taker).length < want) {
      const from = places[Math.floor(Math.random() * places.length)];
      if (Math.hypot(from.x - this.car.x, from.z - this.car.z) < 30) continue;
      let dest = 0, tries = 0;
      do { dest = Math.floor(Math.random() * places.length); tries++; } while (tries < 50 && (Math.hypot(places[dest].x - from.x, places[dest].z - from.z) < 50 || Math.hypot(places[dest].x - from.x, places[dest].z - from.z) > 230));
      const clues = cluesFor(places[dest].type, places[dest].name);
      this.passengers.push({ id: this.nextPid++, x: from.x + (Math.random() - 0.5) * 2, z: from.z, dest, clue: clues[Math.floor(Math.random() * clues.length)], taker: '', look: Math.floor(Math.random() * 1000) });
      changed = true;
    }
    if (changed) this.syncPassengers();
  }

  private syncPassengers(): void {
    this.refreshMarks();
    const s = this.deps.session();
    if (s.connected && this.isAuthority()) s.ext({ k: 'pool', list: this.passengers, done: this.teamDelivered, goal: this.settings.goal });
  }

  private refreshMarks(): void {
    const scene = this.deps.engine.scene;
    const live = new Set(this.passengers.filter((p) => !p.taker).map((p) => p.id));
    for (const [id, m] of this.passengerMarks) if (!live.has(id)) { this.dropMark(m); this.passengerMarks.delete(id); }
    for (const p of this.passengers) {
      if (p.taker || this.passengerMarks.has(p.id)) continue;
      const g = new THREE.Group();
      const person = new Character({ shirt: SHIRTS[p.look % SHIRTS.length], pants: '#2d3a5a', skin: SKINS[(p.look >> 3) % SKINS.length], hair: HAIRS[(p.look >> 5) % HAIRS.length], outfit: (['cap', 'glasses', 'backpack', undefined] as const)[(p.look >> 7) % 4] }, 0.95);
      person.group.position.y = 0.16;
      const col = this.fareColor(p);
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false }));
      ring.position.y = 0.22;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 9, 16, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 4.5;
      // ECYR perf: a waiting passenger's shadow is not worth a shadow-pass draw per body part
      person.group.traverse((o) => { o.castShadow = false; });
      g.add(person.group, ring, beam);
      g.position.set(p.x, 0, p.z);
      scene.add(g);
      this.passengerMarks.set(p.id, { g, person });
    }
  }

  /** Take a waiting passenger's marker out of the scene and free what it owned. */
  private dropMark(m: { g: THREE.Group; person: Character }): void {
    m.g.parent?.remove(m.g);
    m.person.dispose();
    m.g.traverse((o) => {
      const mesh = o as THREE.Mesh;
      // the person's own pieces were freed above; the ring and the beam are ours
      if (mesh.isMesh && (mesh.material as THREE.Material).type === 'MeshBasicMaterial' && (mesh.geometry.type === 'RingGeometry' || mesh.geometry.type === 'CylinderGeometry')) {
        mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose();
      }
    });
  }

  private nearestWaiting(): Passenger | null {
    let best: Passenger | null = null, bd = Infinity;
    for (const p of this.passengers) if (!p.taker) { const d = Math.hypot(p.x - this.car.x, p.z - this.car.z); if (d < bd) { bd = d; best = p; } }
    return best;
  }

  private tryPickup(): void {
    if (this.carrying || !this.world) return;
    for (const p of this.passengers) {
      if (p.taker) continue;
      if (Math.hypot(p.x - this.car.x, p.z - this.car.z) < 4.2 && Math.abs(this.car.speed) < 5) {
        if (this.isAuthority()) { p.taker = this.myId(); this.syncPassengers(); this.board(p); }
        else this.deps.session().ext({ k: 'pick', id: p.id });
        return;
      }
    }
  }

  /** A passenger gets in: they say what they need, you say which place it is. */
  private board(p: Passenger): void {
    if (!this.world) return;
    this.carrying = p;
    this.destKnown = false;
    this.audio.play('pickup');
    this.callout('HEY, TAXI!');
    this.car.vx *= 0.3; this.car.vz *= 0.3;
    // ECYR: the fare climbs onto the back bench (a friend comes along now and then)
    const who = (n: number) => ({ shirt: SHIRTS[n % SHIRTS.length], pants: '#2d3a5a', skin: SKINS[(n >> 3) % SKINS.length], hair: HAIRS[(n >> 5) % HAIRS.length], outfit: (['cap', 'glasses', undefined, undefined] as const)[(n >> 7) % 4] });
    this.model?.boardPassengers(p.look % 3 === 0 ? [who(p.look), who(p.look * 7 + 3)] : [who(p.look)]);
    const places = this.world.places;
    const right = places[p.dest];
    const others = shuffle(places.filter((q) => q.type !== right.type)).slice(0, 2);
    const opts = shuffle([right, ...others]);
    const dist = Math.hypot(right.x - p.x, right.z - p.z);
    this.fareTime = Math.max(16, Math.min(110, dist / 9 * PACE[this.settings.pace] + 8));
    this.deps.speak(p.clue);
    this.ask({
      title: '🧳 WHERE TO?',
      say: `“${esc(p.clue)}”`,
      q: 'Where does the passenger want to go?',
      options: opts.map((o) => `${o.emoji} ${esc(o.name)} <small style="opacity:.7">(${esc(o.type)})</small>`),
      correct: opts.indexOf(right),
      explain: `${right.emoji} <b>${esc(right.name)}</b> is ${esc(right.type)}.`,
      topic: 'places in the city',
      onDone: (ok) => {
        this.destKnown = true;
        if (ok) { this.money += 5; this.callout('+$5 GOOD ENGLISH!', '#7dff6a'); }
        const line = pick(PICKUP_LINES, p.id * 17 + this.delivered).text.replace('{place}', right.name);
        this.bubble(`🧳 ${esc(line)}`, 4.2);
        this.deps.speak(line);
        this.lastSpeakAt = this.time;
        this.bestRoute = Infinity; this.gps.reset(); this.gpsLineId = '';
      },
    });
  }

  private deliver(): void {
    if (!this.carrying || !this.world) return;
    const p = this.carrying, dest = this.world.places[p.dest];
    const dist = Math.hypot(dest.x - p.x, dest.z - p.z);
    const fare = Math.round(8 + dist / 5);
    const tip = Math.round(Math.max(0, this.fareTime) * 0.8 + this.driftTime * 2);
    this.money += fare + tip;
    this.delivered++;
    this.audio.play('cash');
    this.callout(tip > 15 ? `CRAZY! +$${fare + tip}` : `+$${fare + tip}`, '#7dff6a');
    this.sayFollow = false;
    this.react('onTime', 2.6, false, true);
    this.model?.alight(true);
    this.carrying = null;
    this.driftTime = 0;
    const s = this.deps.session();
    if (s.connected && !this.isAuthority()) s.ext({ k: 'drop', id: p.id, money: this.money, delivered: this.delivered });
    else { this.teamDelivered++; this.passengers = this.passengers.filter((q) => q.id !== p.id); this.topUpPassengers(); this.syncPassengers(); }
    this.sendCar(true);
    this.checkGoal();
  }

  private failFare(): void {
    if (!this.carrying) return;
    const p = this.carrying;
    this.carrying = null;
    this.model?.alight(false);
    this.missed++;
    this.audio.play('wrong');
    this.callout('TOO LATE!', '#ff4a3d');
    this.react('late', 2.6, false, true);
    const s = this.deps.session();
    if (s.connected && !this.isAuthority()) s.ext({ k: 'lost', id: p.id });
    else { this.passengers = this.passengers.filter((q) => q.id !== p.id); this.topUpPassengers(); this.syncPassengers(); }
  }

  private checkGoal(): void {
    const done = this.deps.session().connected ? this.teamDelivered : this.delivered;
    if (done >= this.settings.goal) setTimeout(() => this.results(true), 1200);
  }

  /* ================================================================ *
   * Quiz traffic lights                                               *
   * ================================================================ */

  private checkLights(): void {
    if (!this.world) return;
    const sp = Math.hypot(this.car.vx, this.car.vz);
    for (const L of this.world.lights) {
      if (!L.red || L.cleared) continue;
      const dx = L.x - this.car.x, dz = L.z - this.car.z, d = Math.hypot(dx, dz);
      // Reaching a red ❓ light: the cab stops dead and the question comes up.
      const towards = (dx * this.car.vx + dz * this.car.vz) / (d * Math.max(sp, 1e-3));
      const last = this.lastQuiz.get(L.id) ?? -99;
      if (d < 9 && (towards > 0.2 || sp < 1) && this.time - last > 2) {
        this.lastQuiz.set(L.id, this.time);
        this.car.vx = 0; this.car.vz = 0;
        this.audio.play('red');
        this.smoke.puff(this.car.x, this.car.z, this.car.yaw, 1);
        this.smoke.puff(this.car.x, this.car.z, this.car.yaw, 1);
        this.lightQuestion(L);
        return;
      }
    }
  }

  private lightQuestion(L: QuizLight): void {
    // A shuffled deck: no question comes back until every one has been asked.
    if (!this.qDeck.length) this.qDeck = shuffle(LIGHT_QUESTIONS);
    const q: LightQuestion = this.qDeck.pop()!;
    const order = shuffle(q.o.map((_, i) => i));
    this.ask({
      title: q.kind === 'fix' ? '🚦 RED LIGHT · FIX THE SENTENCE' : '🚦 RED LIGHT · QUICK QUESTION',
      q: esc(q.q),
      options: order.map((i) => esc(q.o[i])),
      correct: order.indexOf(q.c),
      explain: esc(q.e),
      topic: q.topic,
      onDone: (ok) => {
        if (ok) {
          L.red = false; L.cleared = true; L.timer = 8; L.hold = 0;
          this.money += 10;
          if (this.carrying) { this.fareTime += 4; this.flashBonus('+4s'); }
          this.callout(this.carrying ? 'GREEN! +$10 +4s' : 'GREEN! +$10', '#7dff6a');
        } else {
          // a wrong answer costs money, and the light still lets the cab through
          L.red = false; L.cleared = true; L.timer = 8; L.hold = 0;
          this.money = Math.max(0, this.money - 5);
          this.callout('−$5 · GO!', '#ff4a3d');
        }
      },
    });
  }

  /** One question card, used by the passengers and the lights. The game pauses under it. */
  private ask(o: { title: string; say?: string; q: string; options: string[]; correct: number; explain: string; topic: string; onDone(ok: boolean): void }): void {
    this.paused = true;
    this.keys.clear();
    const m = el('div', 'tx-modal');
    m.innerHTML = `<div class="tx-q"><div class="k${o.title.startsWith('🧳') ? ' go' : ''}">${o.title}</div>${o.say ? `<div class="say">${o.say}</div>` : ''}<div class="qq">${o.q}</div>
      <div class="tx-opts">${o.options.map((t, i) => `<button class="tx-opt" data-i="${i}"><b>${'ABCD'[i]}</b><span>${t}</span></button>`).join('')}</div><div class="ex" style="display:none"></div></div>`;
    this.root.appendChild(m);
    let answered = false;
    const pick = (i: number) => {
      if (answered) return;
      answered = true;
      const ok = i === o.correct;
      this.asked++;
      if (ok) this.correct++;
      bridge()?.answer(ok, { topic: o.topic, kind: 'taxi' });
      this.audio.play(ok ? 'right' : 'wrong');
      m.querySelectorAll('.tx-opt').forEach((b, k) => { if (k === o.correct) b.classList.add('ok'); else if (k === i) b.classList.add('bad'); });
      const ex = m.querySelector('.ex') as HTMLElement;
      ex.style.display = '';
      ex.innerHTML = (ok ? '✅ ' : '❌ ') + o.explain;
      setTimeout(() => { m.remove(); this.paused = false; o.onDone(ok); removeEventListener('keydown', onKey); }, ok ? 1100 : 2300);
    };
    const onKey = (e: KeyboardEvent) => { const i = 'abcd1234'.indexOf(e.key.toLowerCase()); if (i >= 0) pick(i % 4); };
    addEventListener('keydown', onKey);
    m.addEventListener('click', (e) => { const b = (e.target as HTMLElement).closest('.tx-opt') as HTMLElement | null; if (b) pick(Number(b.dataset.i)); });
  }

  /* ================================================================ *
   * Results                                                           *
   * ================================================================ */

  private results(won: boolean): void {
    if (!this.active) return;
    this.paused = true;
    this.finishReport(won);
    const acc = this.asked ? Math.round((this.correct / this.asked) * 100) : 0;
    const rank = this.money >= this.settings.goal * 60 && acc >= 80 ? 'CRAZY!' : this.money >= this.settings.goal * 40 ? 'AWESOME' : this.money >= this.settings.goal * 20 ? 'GOOD' : 'ROOKIE';
    const r = el('div', 'tx-res');
    r.innerHTML = `<div class="box"><div style="font-weight:900;letter-spacing:.2em;color:#9fb3d9">${won ? 'SHIFT COMPLETE' : 'SHIFT OVER'}</div><div class="rank">${rank}</div>
      <div class="stats"><div><b>$${this.money}</b>earned</div><div><b>${this.delivered}</b>passengers</div><div><b>${acc}%</b>English right</div><div><b>${fmt(this.time)}</b>time</div><div><b>${this.correct}/${this.asked}</b>answers</div><div><b>${this.missed}</b>missed fares</div></div>
      <div class="row"><button class="tx-go" style="width:auto;padding:14px 22px;font-size:20px" data-a="again">▶ AGAIN</button><button class="tx-back" data-a="setup">🎨 Change taxi</button><button class="tx-back" data-a="exit">${this.deps.standalone ? '🏁 Garage' : '← Da World'}</button></div></div>`;
    this.root.appendChild(r);
    r.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
      if (!b) return;
      if (b.dataset.a === 'again') { r.remove(); this.begin(); }
      else if (b.dataset.a === 'setup') { this.active = false; this.retroGrade(false); this.openSetup(); }
      else this.exit();
    });
  }

  private reported = false;
  private finishReport(won: boolean): void {
    if (this.reported && !won) return;
    this.reported = true;
    const acc = this.asked ? this.correct / this.asked : 0;
    bridge()?.end({ won, asked: this.asked, correct: this.correct, mode: this.deps.session().connected ? 'class' : 'solo', stars: won ? (acc >= 0.9 ? 3 : acc >= 0.7 ? 2 : 1) : undefined,
      meta: { gameMode: 'taxi', money: this.money, delivered: this.delivered, goal: this.settings.goal, durationSec: Math.round(this.time), abandoned: !won && this.asked === 0 ? true : undefined } });
    setTimeout(() => { this.reported = false; }, 500);
  }

  /* ================================================================ *
   * Network (Da World's own QR class room)                            *
   * ================================================================ */

  private sendCar(force = false): void {
    const s = this.deps.session();
    if (!s.connected) return;
    const now = performance.now();
    if (!force && now - this.lastSend < 110) return;
    this.lastSend = now;
    s.ext({ k: 'car', n: this.deps.myName(), x: +this.car.x.toFixed(2), z: +this.car.z.toFixed(2), y: +this.car.yaw.toFixed(3), c: this.look.color, m: this.money, d: this.delivered });
  }

  private onNet(from: string, d: Record<string, unknown>): void {
    if (!d || typeof d !== 'object') return;
    switch (d.k) {
      case 'start':
        this.settings = { goal: Number(d.goal) || 5, pace: (d.pace as Settings['pace']) || 'normal' };
        this.closePreview();
        this.start();
        break;
      case 'car': {
        if (!this.active) return;
        let r = this.remotes.get(from);
        if (!r) {
          const body = new THREE.Group();
          r = { name: String(d.n || 'Driver'), body, model: null, look: '', x: Number(d.x), z: Number(d.z), yaw: Number(d.y), tx: 0, tz: 0, tyaw: 0, money: 0, delivered: 0, seen: 0 };
          this.deps.engine.scene.add(body);
          this.remotes.set(from, r);
        }
        if (r.look !== d.c) {
          if (r.model) { r.body.remove(r.model.group); r.model.dispose(); }
          r.model = new TaxiModel({ ...loadLook(), color: String(d.c), driver: { shirt: '#e8637c', pants: '#2d3a5a', skin: '#e0ac85', hair: '#2b1a10', outfit: 'cap' } });
          r.body.add(r.model.group);
          r.look = String(d.c);
        }
        r.tx = Number(d.x); r.tz = Number(d.z); r.tyaw = Number(d.y); r.money = Number(d.m) || 0; r.delivered = Number(d.d) || 0; r.seen = performance.now();
        r.name = String(d.n || r.name);
        break;
      }
      case 'pool':
        if (this.isAuthority()) return;
        this.passengers = (d.list as Passenger[]) || [];
        this.teamDelivered = Number(d.done) || 0;
        if (d.cust !== undefined) this.custOpen = d.cust === '1';
      else if (d.goal) this.settings.goal = Number(d.goal);
        this.refreshMarks();
        if (this.active && this.teamDelivered >= this.settings.goal) setTimeout(() => this.results(true), 800);
        break;
      case 'grant': {
        if (d.to !== this.myId() || this.carrying) return;
        const p = this.passengers.find((q) => q.id === d.id) || (d.p as Passenger);
        if (p && !this.carrying) this.board(p);
        break;
      }
      case 'pick': {
        if (!this.isAuthority()) return;
        const p = this.passengers.find((q) => q.id === d.id);
        if (!p || p.taker) return;
        p.taker = from;
        this.deps.session().ext({ k: 'grant', id: p.id, to: from, p });
        this.syncPassengers();
        break;
      }
      case 'drop':
        if (!this.isAuthority()) return;
        // idempotent: a repeated message cannot count a passenger twice
        if (!this.passengers.some((q) => q.id === d.id)) return;
        this.passengers = this.passengers.filter((q) => q.id !== d.id);
        this.teamDelivered++;
        this.topUpPassengers();
        this.syncPassengers();
        this.checkGoal();
        break;
      case 'lost':
        if (!this.isAuthority()) return;
        this.passengers = this.passengers.filter((q) => q.id !== d.id);
        this.topUpPassengers();
        this.syncPassengers();
        break;
    }
  }

  /* ================================================================ *
   * Ambient traffic in the new districts                              *
   * ================================================================ */

  private updateAmbient(dt: number): void {
    this.street?.update(dt, { x: this.car.x, z: this.car.z, yaw: this.car.yaw });
  }

  /**
   * The chaos (Crazy-style): hit a car at speed and it goes flying while the cab
   * ploughs on; slip past one at speed without touching it and that is a near
   * miss, CRAZY THROUGH, worth a tip that grows with every one in a row.
   * Drifting with a fare aboard counts too. A crash ends the combo.
   */
  private trafficChaos(dt: number): void {
    this.chaosSp = Math.hypot(this.car.vx, this.car.vz);
    const sp = this.chaosSp;
    const street = this.street;
    if (street) for (const c of street.cars) this.chaosHit(c, 0);
    const tr = this.deps.traffic;
    if (tr?.cars && tr.knock) for (const c of tr.cars()) this.chaosHit(c, 1);
    // drifting with a passenger: a tip for every second of it
    if (this.car.drifting && this.carrying && sp > 9) {
      this.driftTick += dt;
      if (this.driftTick > 1) { this.driftTick = 0; this.bumpCombo('CRAZY DRIFT'); }
    } else this.driftTick = 0;
    if (this.comboTime > 0) { this.comboTime -= dt; if (this.comboTime <= 0) this.combo = 0; }
  }

  /** One car against the cab. kind 0 = the taxi game's own street traffic, 1 = the walking city's (no per-frame closures). */
  private chaosHit(c: StreetCar & Partial<TrafficCar>, kind: 0 | 1): void {
    if (c.flying) return;
    const dx = this.car.x - c.x, dz = this.car.z - c.z;
    if (Math.abs(dx) > 7 || Math.abs(dz) > 7) return;
    const sp = this.chaosSp;
    const sn = Math.sin(c.yaw), co = Math.cos(c.yaw);
    const lx = dx * co - dz * sn, lz = dx * sn + dz * co;
    const hx = c.wid / 2 + 0.62, hz = c.len / 2 + 1.0;
    if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
      if (sp > 7) {
        const kvx = this.car.vx * 1.1, kvz = this.car.vz * 1.1;
        if (kind === 0) this.street!.knock(c as TrafficCar, kvx, kvz);
        else { const tr = this.deps.traffic!; tr.knock!(c, kvx, kvz); }
        this.car.vx *= 0.8; this.car.vz *= 0.8;
        this.audio.play('crash');
        this.smoke.sparks((this.car.x + c.x) / 2, (this.car.z + c.z) / 2, 18);
        if (this.combo > 1) this.callout('CRASH! COMBO LOST', '#ff8a3d');
        this.combo = 0; this.comboTime = 0;
        if (this.carrying && this.destKnown) this.react('crash');
      } else if (this.car.push(c.x, c.z, Math.min(hx, hz) + 0.4) && sp > 4) this.audio.play('crash');
    } else if (sp > 13 && Math.abs(lx) < hx + 1.5 && Math.abs(lz) < hz + 0.6 && this.time - c.grazed > 2) {
      c.grazed = this.time;
      this.bumpCombo('CRAZY THROUGH');
    }
  }

  private bumpCombo(label: string): void {
    this.combo++;
    this.comboTime = 3;
    this.comboLabel = label;
    this.money += Math.min(10, this.combo);
    this.audio.play('tick');
    const box = this.root.querySelector('#txCombo') as HTMLElement | null;
    if (box) { box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop'); }
  }

  /* ================================================================ *
   * The frame                                                         *
   * ================================================================ */

  update(dt: number, elapsed: number): void {
    if (!this.active || !this.world || !this.model) return;
    this.governor.tick(this.paused);
    const { engine, environment, dayNight } = this.deps;
    const sky = this.world.tintSky(dayNight.current(), engine.quality.name);
    environment.apply(sky);
    engine.post.setMood(sky.night);
    setNightGlow(sky.night);
    // the retro grade: Sega-blue sky, saturated paint, warm sun
    const u = engine.post.grade.uniforms as Record<string, { value: number }>;
    u.uSaturation.value = 1.28; u.uContrast.value = 1.16; u.uWarmth.value = 0.08;

    const inp = this.input();
    if (!this.paused) {
      this.time += dt;
      const { hit } = this.car.update(dt, inp, this.world);
      if (hit) { this.audio.play('crash'); if (this.carrying && this.destKnown && Math.abs(this.car.speed) > 6) this.react('crash'); }
      if (this.deps.traffic && !this.deps.traffic.cars) for (const p of this.deps.traffic.carPositions()) if (this.car.push(p.x, p.z, 1.9) && Math.hypot(this.car.vx, this.car.vz) > 6) this.audio.play('crash');
      this.updateAmbient(dt);
      this.trafficChaos(dt);
      if (this.car.drifting) { this.driftTime += dt; if (Math.floor(this.driftTime * 2) !== Math.floor((this.driftTime - dt) * 2)) this.audio.play('drift'); }
      // tyre smoke when drifting, spinning away from a stop or braking hard; sparks on a hit
      {
        const spd = Math.hypot(this.car.vx, this.car.vz);
        const amt = this.car.drifting ? 0.9 : inp.throttle > 0 && spd < 5 ? 0.3 : inp.brake > 0 && this.car.speed > 9 ? 0.45 : 0;
        if (!this.smoke.points.parent) { this.deps.engine.scene.add(this.smoke.points); this.smoke.setViewportHeight(window.innerHeight); }
        if (amt > 0) this.smoke.puff(this.car.x, this.car.z, this.car.yaw, amt);
        if (hit) this.smoke.sparks(this.car.x + Math.sin(this.car.yaw) * 1.5, this.car.z + Math.cos(this.car.yaw) * 1.5);
        this.deps.engine.post.setSpeedBlur(inp.boost && this.car.boostFuel > 0.02 ? 0.9 : Math.max(0, (spd - 20) / 45));
      }
      if (this.carrying) {
        this.fareTime -= dt;
        const dest = this.world.places[this.carrying.dest];
        if (Math.hypot(dest.x - this.car.x, dest.z - this.car.z) < 5.5 && Math.abs(this.car.speed) < 6) this.deliver();
        else if (this.fareTime <= 0) this.failFare();
        else if (this.fareTime < 5.5 && Math.ceil(this.fareTime) !== Math.ceil(this.fareTime + dt)) this.audio.play('tick');
        else if (this.destKnown) {
          // driving away from the door for a good while: the passenger notices
          const md = Math.abs(dest.x - this.car.x) + Math.abs(dest.z - this.car.z);
          if (md < this.bestRoute) this.bestRoute = md;
          else if (md > this.bestRoute + 34 && Math.abs(this.car.speed) > 6) { this.bestRoute = md; this.react('wrongTurn'); }
        }
      } else this.tryPickup();
      this.checkLights();
      this.sendCar();
    } else {
      this.updateAmbient(0);
    }
    this.world.update(this.paused ? 0 : dt, elapsed);
    this.world.focus(this.car.x, this.car.z);
    this.audio.engine(this.car.speed, inp.throttle);

    // the cab
    const g = this.model.group;
    g.position.set(this.car.x, 0, this.car.z);
    g.rotation.y = this.car.yaw;
    // roll, pitch, springs and steering are the model's own (smoothed, still when parked)
    this.model.animate(this.car.speed, this.car.steer, dt, inp.brake > 0 && this.car.speed > 0.5, sky.night, this.car.drifting);

    // the arrow
    const target = this.carrying ? (this.destKnown ? this.world.places[this.carrying.dest] : null) : this.nearestWaiting();
    if (target) {
      const wp = this.world.waypoint(this.car.x, this.car.z, this.car.yaw, target.x, target.z);
      const ang = Math.atan2(wp.x - this.car.x, wp.z - this.car.z);
      this.arrow.visible = true;
      this.arrow.position.set(this.car.x + Math.sin(this.car.yaw) * 1.2, 2.9 + Math.sin(elapsed * 4) * 0.12, this.car.z + Math.cos(this.car.yaw) * 1.2);
      let diff = ang - this.arrow.rotation.y;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      this.arrow.rotation.y += diff * Math.min(1, dt * 8);
      const am = (this.arrow.children[0] as THREE.Mesh).material as THREE.MeshStandardMaterial;
      if (!this.carrying && target) { /* heading for a passenger */ }
      am.color.set(this.carrying ? '#7dff6a' : '#ffd21f');
      am.emissive.set(this.carrying ? '#2bd62b' : '#d6a400');
    } else this.arrow.visible = false;
    if (this.carrying && this.destKnown) {
      const d = this.world.places[this.carrying.dest];
      this.destMarker.visible = true;
      this.destMarker.position.set(d.x, 0, d.z);
      this.destMarker.rotation.y += dt;
    } else this.destMarker.visible = false;
    // waiting passengers wave
    for (const m of this.passengerMarks.values()) { m.person.update(dt, 0); m.person.group.rotation.y += dt * 0.8; if (Math.random() < dt * 0.15) m.person.gesture(Math.random() < 0.7 ? 'agree' : 'headShake'); }

    // other drivers glide to where they said they were
    for (const [id, r] of this.remotes) {
      if (performance.now() - r.seen > 8000) { engine.scene.remove(r.body); r.model?.dispose(); this.remotes.delete(id); continue; }
      const k = Math.min(1, dt * 8);
      r.x += (r.tx - r.x) * k; r.z += (r.tz - r.z) * k;
      let dy = r.tyaw - r.yaw; while (dy > Math.PI) dy -= Math.PI * 2; while (dy < -Math.PI) dy += Math.PI * 2;
      r.yaw += dy * k;
      r.body.position.set(r.x, 0, r.z);
      r.body.rotation.y = r.yaw;
      r.model?.animate(0, 0, dt, false, 0);
      this.car.push(r.x, r.z, 2);
    }

    // chase camera
    const cam = engine.camera;
    const sp = Math.abs(this.car.speed);
    const fx = Math.sin(this.car.yaw), fz = Math.cos(this.car.yaw);
    const back = 7.4 + sp * 0.11, up = 3.3 + sp * 0.03;
    const want = new THREE.Vector3(this.car.x - fx * back, up, this.car.z - fz * back);
    this.camPos.lerp(want, Math.min(1, dt * 5));
    const look = new THREE.Vector3(this.car.x + fx * 4, 1.1, this.car.z + fz * 4);
    this.camLook.lerp(look, Math.min(1, dt * 7));
    const shake = this.car.bump < 0.25 ? (0.25 - this.car.bump) * 0.9 : 0;
    cam.position.set(this.camPos.x + (Math.random() - 0.5) * shake, this.camPos.y + (Math.random() - 0.5) * shake, this.camPos.z);
    cam.lookAt(this.camLook);
    const fov = cabFov(sp, inp.boost && this.car.boostFuel > 0.02);
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 4); cam.updateProjectionMatrix(); }
    environment.follow(elapsed, new THREE.Vector3(this.car.x, 0, this.car.z));

    if (this.say) { if ((this.sayTimer -= dt) <= 0) { this.say.remove(); this.say = null; } else this.placeBubble(); }
    this.smoke.update(dt);
    this.updateHud();
  }

  private input(): DriveInput {
    if (this.paused) return { throttle: 0, brake: 0, steer: 0, handbrake: false, boost: false };
    const k = this.keys, t = this.touch;
    const up = k.has('w') || k.has('arrowup') || t.gas;
    const down = k.has('s') || k.has('arrowdown') || t.brake;
    const left = k.has('a') || k.has('arrowleft') || t.l;
    const right = k.has('d') || k.has('arrowright') || t.r;
    return { throttle: up ? 1 : 0, brake: down ? 1 : 0, steer: (right ? 1 : 0) - (left ? 1 : 0), handbrake: k.has(' ') || t.drift, boost: k.has('shift') || t.boost };
  }
}

function isTouchDevice(): boolean {
  return matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

function fmt(t: number): string {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}
