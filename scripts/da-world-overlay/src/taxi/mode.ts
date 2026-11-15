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
import { setWoodland } from '../city/city';
import { Character } from '../city/character';
import { extListeners, type Session } from '../net/session';
import { TaxiWorld, DISTRICT_LABEL, MIN_X, MAX_X, MIN_Z, MAX_Z, VX, HZ, K_MIN, K_MAX, J_MIN, J_MAX, type QuizLight } from './world';
import { CarBody, TaxiModel, loadLook, saveLook, PAINTS, DRIVER_SHIRTS, DRIVER_SKINS, DRIVER_HAIR, DRIVER_OUTFITS, type TaxiLook, type DriveInput } from './car';
import { LIGHT_QUESTIONS, type LightQuestion } from './questions';
import { Smoke } from './smoke';
import { loadSportCar } from './sportcar';
import { TaxiTraffic } from './traffic';
import { loadCarPack } from '../city/carpack';
import type { StreetCar } from '../city/traffic';
import { cluesFor } from './places';
import { TaxiAudio } from './audio';
import { TAXI_CSS } from './ui.css';

export interface TaxiDeps {
  engine: Engine;
  environment: Environment;
  dayNight: DayNight;
  /** Hide or show the walking game's own things (player, citizens, HUD). */
  setWalking(visible: boolean): void;
  traffic: { carPositions(): { x: number; z: number }[]; group: THREE.Group; cars?(): StreetCar[]; knock?(c: StreetCar, vx: number, vz: number): void };
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

  constructor(private deps: TaxiDeps) {
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
    arrowMesh.scale.setScalar(1.35);
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
    void loadSportCar();
    void loadCarPack();
    this.deps.setWalking(false);
    this.root.style.display = '';
    this.root.innerHTML = '';
    const s = el('div', 'tx-setup');
    const sess = this.deps.session();
    const inRoom = sess.connected;
    const host = inRoom && sess.myId === 'host';
    s.innerHTML = `
      <div class="tx-wrap">
        <div class="tx-logo">${LOGO_HTML}<p>Pick up passengers, work out where they want to go, and race to the door before the clock runs out. Stop at the ❓ traffic lights and answer to turn them green!</p></div>
        <div>
          <div class="tx-card">
            <h2>1 · The shift</h2>
            <div class="tx-row"><span class="tx-lbl">Passengers to deliver</span>${[3, 5, 8, 10, 15, 20].map((n) => `<button class="tx-chip${n === this.settings.goal ? ' on' : ''}" data-goal="${n}">${n}</button>`).join('')}</div>
            <div class="tx-row"><span class="tx-lbl">Fare clock</span>${(['relaxed', 'normal', 'crazy'] as const).map((p) => `<button class="tx-chip${p === this.settings.pace ? ' on' : ''}" data-pace="${p}">${p === 'relaxed' ? '🐢 Relaxed' : p === 'normal' ? '🚕 Normal' : '🔥 Crazy'}</button>`).join('')}</div>
            <div class="tx-note">Drive: <b>W A S D</b> or arrows · <b>Space</b> drift · <b>Shift</b> turbo · <b>H</b> horn. On a phone, use the buttons on screen.</div>
            ${inRoom ? `<div class="tx-room">👥 Class room: ${host ? 'you are hosting — <b>START</b> sends every student into the same shift.' : 'your teacher starts the shift for everybody. You can get your cab ready meanwhile.'}${host ? ' <button class="tx-chip" data-class="1">📱 Show the QR</button>' : ''}</div>` : this.deps.standalone ? '<div class="tx-room">👥 Drive together: <button class="tx-chip on" data-class="1">📱 Play with your class (QR)</button></div>' : '<div class="tx-room">👥 To drive together, open <b>Class (multiplayer)</b> first and share the QR code; then come back to Taxi Rush.</div>'}
          </div>
          <div class="tx-card" style="margin-top:16px">
            <h2>2 · Your taxi</h2>
            <div class="tx-row"><span class="tx-lbl">Paint</span>${PAINTS.map((c) => `<button class="tx-sw${c === this.look.color ? ' on' : ''}" data-paint="${c}" style="background:${c}" aria-label="paint ${c}"></button>`).join('')}</div>
            <div class="tx-row"><span class="tx-lbl">Livery</span>${(['checker', 'stripe', 'flames', 'none'] as const).map((v) => `<button class="tx-chip${v === this.look.stripe ? ' on' : ''}" data-stripe="${v}">${v}</button>`).join('')}</div>
            <div class="tx-row"><span class="tx-lbl">Rims</span>${(['chrome', 'black', 'gold'] as const).map((v) => `<button class="tx-chip${v === this.look.rims ? ' on' : ''}" data-rims="${v}">${v}</button>`).join('')}</div>
            <div class="tx-row"><span class="tx-lbl">Roof sign</span>${(['classic', 'neon', 'none'] as const).map((v) => `<button class="tx-chip${v === this.look.roof ? ' on' : ''}" data-roof="${v}">${v}</button>`).join('')}</div>
          </div>
          <div class="tx-card" style="margin-top:16px">
            <h2>3 · The driver</h2>
            <div class="tx-row"><span class="tx-lbl">Skin</span>${DRIVER_SKINS.map((c) => `<button class="tx-sw${c === this.look.driver.skin ? ' on' : ''}" data-skin="${c}" style="background:${c}"></button>`).join('')}</div>
            <div class="tx-row"><span class="tx-lbl">Hair</span>${DRIVER_HAIR.map((c) => `<button class="tx-sw${c === this.look.driver.hair ? ' on' : ''}" data-hair="${c}" style="background:${c}"></button>`).join('')}</div>
            <div class="tx-row"><span class="tx-lbl">Shirt</span>${DRIVER_SHIRTS.map((c) => `<button class="tx-sw${c === this.look.driver.shirt ? ' on' : ''}" data-shirt="${c}" style="background:${c}"></button>`).join('')}</div>
            <div class="tx-row"><span class="tx-lbl">Style</span>${DRIVER_OUTFITS.map((o) => `<button class="tx-chip${o === this.look.driver.outfit ? ' on' : ''}" data-outfit="${o ?? ''}">${o === 'cap' ? '🧢 Cap' : o === 'hat' ? '👒 Hat' : o === 'glasses' ? '🕶️ Shades' : 'None'}</button>`).join('')}</div>
          </div>
        </div>
        <div style="position:sticky;top:16px">
          <div class="tx-card"><div class="tx-preview" id="txPreview"></div></div>
          ${inRoom && !host ? '<div class="tx-room" style="margin-top:12px;text-align:center">⏳ Waiting for your teacher to start…</div>' : '<button class="tx-go" data-go="1">▶ START SHIFT</button>'}
          <div style="margin-top:14px;display:flex;gap:10px"><button class="tx-back" data-back="1">${this.deps.standalone ? '← Games' : '← Da World'}</button></div>
        </div>
      </div>`;
    this.root.appendChild(s);
    s.addEventListener('click', (e) => {
      const b = (e.target as HTMLElement).closest('button') as HTMLButtonElement | null;
      if (!b) return;
      const d = b.dataset;
      if (d.goal) this.settings.goal = Number(d.goal);
      else if (d.pace) this.settings.pace = d.pace as Settings['pace'];
      else if (d.paint) this.look.color = d.paint;
      else if (d.stripe) this.look.stripe = d.stripe as TaxiLook['stripe'];
      else if (d.rims) this.look.rims = d.rims as TaxiLook['rims'];
      else if (d.roof) this.look.roof = d.roof as TaxiLook['roof'];
      else if (d.skin) this.look.driver.skin = d.skin;
      else if (d.hair) this.look.driver.hair = d.hair;
      else if (d.shirt) this.look.driver.shirt = d.shirt;
      else if (d.outfit !== undefined && 'outfit' in d) this.look.driver.outfit = (d.outfit || undefined) as TaxiLook['driver']['outfit'];
      else if (d.go) { saveLook(this.look); this.closePreview(); if (host) sess.ext({ k: 'start', goal: this.settings.goal, pace: this.settings.pace }); this.start(); return; }
      else if (d.back) { this.closePreview(); if (this.deps.standalone) { this.deps.onHome?.(); return; } this.exit(); return; }
      else if (d.class) { this.closePreview(); this.root.style.display = 'none'; this.deps.onClass?.(); return; }
      else return;
      saveLook(this.look);
      const keep = this.preview;
      this.preview = null;
      if (keep) cancelAnimationFrame(keep.raf);
      this.openSetupKeepPreview(keep);
    });
    this.mountPreview(null);
  }

  /** Re-render the setup, reusing the preview renderer (only the cab is rebuilt). */
  private openSetupKeepPreview(keep: TaxiMode['preview']): void {
    const scroll = this.root.querySelector('.tx-setup')?.scrollTop ?? 0;
    this.openSetup();
    const sc = this.root.querySelector('.tx-setup');
    if (sc) sc.scrollTop = scroll;
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
  }

  private closePreview(): void {
    if (!this.preview) return;
    cancelAnimationFrame(this.preview.raf);
    this.preview.renderer.dispose();
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
        this.street = new TaxiTraffic(tier === 'low' ? 0.45 : tier === 'medium' ? 0.7 : 1);
        this.street.drawRadius = tier === 'low' ? 70 : tier === 'medium' ? 95 : 120;
        this.deps.engine.scene.add(this.street.group);
        this.street.setVisible(this.active);
      });
    }
    this.world.setVisible(true);
    this.street?.setVisible(true);
    setWoodland(false);
    scene.add(this.arrow, this.destMarker);
    if (this.model) { scene.remove(this.model.group); }
    this.model = new TaxiModel(this.look);
    scene.add(this.model.group);
    // start on Main Street, by the taxi rank, facing east
    this.car = new CarBody();
    this.car.x = 30; this.car.z = 16.5; this.car.yaw = Math.PI / 2;
    this.money = 0; this.delivered = 0; this.teamDelivered = 0; this.missed = 0; this.asked = 0; this.correct = 0; this.time = 0;
    this.carrying = null; this.passengers = []; this.ranRed.clear(); this.lastQuiz.clear(); this.combo = 0; this.comboTime = 0;
    for (const m of this.passengerMarks.values()) scene.remove(m.g);
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
  }

  /** Back to the walking game. */
  exit(): void {
    this.smoke.points.parent?.remove(this.smoke.points);
    this.deps.engine.post.setSpeedBlur(0);
    if (this.active) this.finishReport(false);
    this.active = false;
    this.audio.stop();
    const scene = this.deps.engine.scene;
    if (this.world) this.world.setVisible(false);
    this.street?.setVisible(false);
    setWoodland(true);
    scene.remove(this.arrow, this.destMarker);
    if (this.model) scene.remove(this.model.group);
    for (const m of this.passengerMarks.values()) scene.remove(m.g);
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
      <div class="tx-money big outline" id="txMoney">$0</div>
      <div class="tx-sub" id="txSub"></div>
      <div class="tx-timer" id="txTimer"></div>
      <div class="tx-map"><canvas id="txMap" width="380" height="380"></canvas></div>
      <div class="tx-mates" id="txMates"></div>
      <div class="tx-dest" id="txDest"></div>
      <div class="tx-combo" id="txCombo"></div>
      <div class="tx-speed"><div class="n big outline" id="txSpeed">0</div><div class="u">KM/H</div><div class="tx-boost"><i id="txBoost"></i></div></div>
      <button class="tx-home" data-home="1">🏠 Exit</button>
      <div class="tx-touch" id="txTouch"></div>`;
    this.root.appendChild(h);
    this.hud = h;
    h.querySelector('[data-home]')!.addEventListener('click', () => this.confirmExit());
    this.mapCanvas = h.querySelector('#txMap');
    this.mapBase = this.drawMapBase();
    if (matchMedia('(pointer: coarse)').matches) this.buildTouch(h.querySelector('#txTouch')!);
  }

  private buildTouch(host: HTMLElement): void {
    const pads: [keyof TaxiMode['touch'], string, string][] = [
      ['l', '◀', 'left:16px'], ['r', '▶', 'left:100px'], ['drift', 'D', 'left:58px;bottom:170px'],
      ['brake', '▼', 'right:100px'], ['gas', '▲', 'right:16px'], ['boost', '⚡', 'right:58px;bottom:170px'],
    ];
    for (const [k, label, pos] of pads) {
      const b = el('button', 'tx-pad', label);
      b.setAttribute('style', pos);
      const on = (v: boolean) => (e: Event) => { e.preventDefault(); this.touch[k] = v; b.classList.toggle('on', v); };
      b.addEventListener('pointerdown', on(true));
      b.addEventListener('pointerup', on(false));
      b.addEventListener('pointercancel', on(false));
      b.addEventListener('pointerleave', on(false));
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

  private bubble(text: string): void {
    this.say?.remove();
    this.say = el('div', 'tx-say', text);
    this.root.appendChild(this.say);
    this.sayTimer = 5;
  }

  private updateHud(): void {
    const h = this.hud; if (!h || !this.world) return;
    (h.querySelector('#txMoney') as HTMLElement).textContent = '$' + this.money;
    const done = this.deps.session().connected ? this.teamDelivered : this.delivered;
    (h.querySelector('#txSub') as HTMLElement).innerHTML = `<span>🧍 ${done} / ${this.settings.goal}</span><span>⏱ ${fmt(this.time)}</span><span>✅ ${this.correct}/${this.asked}</span>`;
    const timer = h.querySelector('#txTimer') as HTMLElement;
    if (this.carrying && this.destKnown) {
      const t = Math.max(0, Math.ceil(this.fareTime));
      timer.innerHTML = `<div class="n big outline${t <= 5 ? ' hot' : ''}">${t}</div><div class="l">SECONDS LEFT</div>`;
    } else timer.innerHTML = `<div class="l" style="font-size:18px;padding-top:12px">🚕 PICK UP A PASSENGER! FOLLOW THE ARROW</div>`;
    const dest = h.querySelector('#txDest') as HTMLElement;
    if (this.carrying && this.destKnown) {
      const p = this.world.places[this.carrying.dest];
      const d = Math.hypot(p.x - this.car.x, p.z - this.car.z) * 1.5;
      dest.style.display = '';
      dest.innerHTML = `<span class="e">${p.emoji}</span><span><div class="t">${esc(DISTRICT_LABEL[p.district])}</div><div class="nm">${esc(p.name)}</div></span><span class="d">${Math.round(d)} m</span>`;
    } else dest.style.display = 'none';
    (h.querySelector('#txSpeed') as HTMLElement).textContent = String(Math.round(Math.abs(this.car.speed) * 5.4));
    const combo = h.querySelector('#txCombo') as HTMLElement | null;
    if (combo) {
      const on = this.combo > 0;
      combo.style.opacity = on ? '1' : '0';
      if (on) combo.innerHTML = `<div class="t big outline">${this.comboLabel}!</div><div class="c"><b class="big outline">${this.combo}</b> COMBO · +$${Math.min(10, this.combo)}</div>`;
    }
    (h.querySelector('#txBoost') as HTMLElement).style.width = Math.round(this.car.boostFuel * 100) + '%';
    const mates = h.querySelector('#txMates') as HTMLElement;
    mates.innerHTML = [...this.remotes.values()].map((r) => `<span>🚕 ${esc(r.name)} · $${r.money}</span>`).join('');
    this.drawMap();
  }

  /* ---- minimap ---- */
  private drawMapBase(): HTMLCanvasElement {
    const W = MAX_X - MIN_X, H = MAX_Z - MIN_Z, s = 2;
    const cv = document.createElement('canvas');
    cv.width = W * s; cv.height = H * s;
    const c = cv.getContext('2d')!;
    c.fillStyle = '#2b5a3a'; c.fillRect(0, 0, cv.width, cv.height);
    c.fillStyle = '#3b4252';
    for (let k = K_MIN; k <= K_MAX; k++) c.fillRect((VX(k) - MIN_X) * s, 0, 6 * s, cv.height);
    for (let j = J_MIN; j <= J_MAX; j++) c.fillRect(0, (HZ(j) - MIN_Z) * s, cv.width, 6 * s);
    c.fillStyle = '#2f8fc4'; c.fillRect((MAX_X - MIN_X) * s - 4, 0, 4, cv.height);
    c.strokeStyle = 'rgba(255,210,31,.5)'; c.lineWidth = 3; c.strokeRect((0 - MIN_X) * s, (0 - MIN_Z) * s, 99 * s, 108 * s);
    return cv;
  }

  private drawMap(): void {
    const cv = this.mapCanvas, base = this.mapBase; if (!cv || !base || !this.world) return;
    const c = cv.getContext('2d')!, s = 2, R = 70; // world units shown each side
    c.save();
    c.fillStyle = '#10131a'; c.fillRect(0, 0, cv.width, cv.height);
    c.translate(cv.width / 2, cv.height / 2);
    c.rotate(this.car.yaw - Math.PI);
    const k = cv.width / (R * 2 * s);
    c.scale(k, k);
    c.drawImage(base, -(this.car.x - MIN_X) * s, -(this.car.z - MIN_Z) * s);
    const dot = (x: number, z: number, col: string, r: number) => { c.fillStyle = col; c.beginPath(); c.arc((x - this.car.x) * s, (z - this.car.z) * s, r, 0, 7); c.fill(); };
    for (const p of this.passengers) if (!p.taker) dot(p.x, p.z, this.fareColor(p), 9);
    for (const L of this.world.lights) if (L.red && !L.cleared) dot(L.x, L.z, '#ff4a3d', 5);
    if (this.carrying && this.destKnown) { const p = this.world.places[this.carrying.dest]; dot(p.x, p.z, '#7dff6a', 13); }
    for (const r of this.remotes.values()) dot(r.x, r.z, '#ff7af6', 7);
    c.restore();
    c.fillStyle = '#ffd21f'; c.beginPath(); c.moveTo(cv.width / 2, cv.height / 2 - 14); c.lineTo(cv.width / 2 + 10, cv.height / 2 + 10); c.lineTo(cv.width / 2 - 10, cv.height / 2 + 10); c.fill();
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
    for (const [id, m] of this.passengerMarks) if (!live.has(id)) { scene.remove(m.g); this.passengerMarks.delete(id); }
    for (const p of this.passengers) {
      if (p.taker || this.passengerMarks.has(p.id)) continue;
      const g = new THREE.Group();
      const person = new Character({ shirt: SHIRTS[p.look % SHIRTS.length], pants: '#2d3a5a', skin: SKINS[(p.look >> 3) % SKINS.length], hair: HAIRS[(p.look >> 5) % HAIRS.length], outfit: (['cap', 'glasses', 'backpack', undefined] as const)[(p.look >> 7) % 4] }, 0.76);
      person.group.position.y = 0.16;
      const col = this.fareColor(p);
      const ring = new THREE.Mesh(new THREE.RingGeometry(2.4, 3.1, 40).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.9, depthWrite: false }));
      ring.position.y = 0.22;
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.5, 9, 16, 1, true), new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.18, depthWrite: false, side: THREE.DoubleSide }));
      beam.position.y = 4.5;
      g.add(person.group, ring, beam);
      g.position.set(p.x, 0, p.z);
      scene.add(g);
      this.passengerMarks.set(p.id, { g, person });
    }
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
        this.bubble(`🧳 “Take me to <b>${esc(right.name)}</b>, please!”`);
        this.deps.speak(`Take me to ${right.name}, please!`);
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
    this.bubble(['Thanks! Keep the change! 💵', 'Wow, that was fast! 😄', 'Great driving! See you! 👋', 'Perfect, thank you! 🙌'][this.delivered % 4]);
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
    this.missed++;
    this.audio.play('wrong');
    this.callout('TOO LATE!', '#ff4a3d');
    this.bubble('😤 “I’m late! I’ll walk!”');
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
          if (this.carrying) this.fareTime += 4;
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
          if (r.model) r.body.remove(r.model.group);
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
        if (d.goal) this.settings.goal = Number(d.goal);
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
    this.street?.update(dt, { x: this.car.x, z: this.car.z });
  }

  /**
   * The chaos (Crazy-style): hit a car at speed and it goes flying while the cab
   * ploughs on; slip past one at speed without touching it and that is a near
   * miss, CRAZY THROUGH, worth a tip that grows with every one in a row.
   * Drifting with a fare aboard counts too. A crash ends the combo.
   */
  private trafficChaos(dt: number): void {
    const sp = Math.hypot(this.car.vx, this.car.vz);
    const hit = (c: StreetCar, knock: (vx: number, vz: number) => void): void => {
      if (c.flying) return;
      const dx = this.car.x - c.x, dz = this.car.z - c.z;
      if (Math.abs(dx) > 7 || Math.abs(dz) > 7) return;
      const sn = Math.sin(c.yaw), co = Math.cos(c.yaw);
      const lx = dx * co - dz * sn, lz = dx * sn + dz * co;
      const hx = c.wid / 2 + 0.62, hz = c.len / 2 + 1.0;
      if (Math.abs(lx) < hx && Math.abs(lz) < hz) {
        if (sp > 7) {
          knock(this.car.vx * 1.1, this.car.vz * 1.1);
          this.car.vx *= 0.8; this.car.vz *= 0.8;
          this.audio.play('crash');
          this.smoke.sparks((this.car.x + c.x) / 2, (this.car.z + c.z) / 2, 18);
          if (this.combo > 1) this.callout('CRASH! COMBO LOST', '#ff8a3d');
          this.combo = 0; this.comboTime = 0;
        } else if (this.car.push(c.x, c.z, Math.min(hx, hz) + 0.4) && sp > 4) this.audio.play('crash');
      } else if (sp > 13 && Math.abs(lx) < hx + 1.5 && Math.abs(lz) < hz + 0.6 && this.time - c.grazed > 2) {
        c.grazed = this.time;
        this.bumpCombo('CRAZY THROUGH');
      }
    };
    const street = this.street;
    if (street) for (const c of street.cars) hit(c, (vx, vz) => street.knock(c, vx, vz));
    const tr = this.deps.traffic;
    const knockCity = tr.knock;
    if (tr.cars && knockCity) for (const c of tr.cars()) hit(c, (vx, vz) => knockCity.call(tr, c, vx, vz));
    // drifting with a passenger: a tip for every second of it
    if (this.car.drifting && this.carrying && sp > 9) {
      this.driftTick += dt;
      if (this.driftTick > 1) { this.driftTick = 0; this.bumpCombo('CRAZY DRIFT'); }
    } else this.driftTick = 0;
    if (this.comboTime > 0) { this.comboTime -= dt; if (this.comboTime <= 0) this.combo = 0; }
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
    const { engine, environment, dayNight } = this.deps;
    const sky = dayNight.current();
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
      if (hit) { this.audio.play('crash'); }
      if (!this.deps.traffic.cars) for (const p of this.deps.traffic.carPositions()) if (this.car.push(p.x, p.z, 1.9) && Math.hypot(this.car.vx, this.car.vz) > 6) this.audio.play('crash');
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
      } else this.tryPickup();
      this.checkLights();
      this.sendCar();
    } else {
      this.updateAmbient(0);
    }
    this.world.update(this.paused ? 0 : dt, elapsed);
    this.audio.engine(this.car.speed, inp.throttle);

    // the cab
    const g = this.model.group;
    g.position.set(this.car.x, 0, this.car.z);
    g.rotation.y = this.car.yaw;
    const lean = Math.max(-0.08, Math.min(0.08, -this.car.steer * Math.abs(this.car.speed) / 120));
    g.rotation.z = lean;
    this.model.animate(this.car.speed, this.car.steer, dt, inp.brake > 0 && this.car.speed > 0.5, sky.night);

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
      if (performance.now() - r.seen > 8000) { engine.scene.remove(r.body); this.remotes.delete(id); continue; }
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
    const fov = 56 + Math.min(18, sp * 0.55) + (inp.boost && this.car.boostFuel > 0.02 ? 6 : 0);
    if (Math.abs(cam.fov - fov) > 0.05) { cam.fov += (fov - cam.fov) * Math.min(1, dt * 4); cam.updateProjectionMatrix(); }
    environment.follow(elapsed, new THREE.Vector3(this.car.x, 0, this.car.z));

    if (this.say && (this.sayTimer -= dt) <= 0) { this.say.remove(); this.say = null; }
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

function fmt(t: number): string {
  const m = Math.floor(t / 60), s = Math.floor(t % 60);
  return m + ':' + (s < 10 ? '0' : '') + s;
}
