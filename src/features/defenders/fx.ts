/* Language Defenders — battle effects, all drawn in code.
   · impact():    a projectile lands — comic star, ring, sparks, and a style of its own
                  (chalk dust, ice shards, a fireball, electric arcs, a paint splat).
   · explosion(): lobbed shots, bells and megaphones — flash, shockwave on the floor, debris,
                  smoke, a scorch mark, a comic word and a kick to the camera.
   · say():       a comic speech bubble over a character's head (short English lines).
   · ooze():      neon liquid pouring out of the coffin gate when someone climbs out of it.
   Everything is pooled and capped so a crowded lane costs the same as a quiet one. */
import * as THREE from 'three';

type Tick = (u: number, dt: number) => void;
interface Item { obj: THREE.Object3D; t: number; dur: number; tick: Tick; pool?: THREE.Object3D[]; parent: THREE.Object3D }

const canvas = (w: number, h: number) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const tex = (c: HTMLCanvasElement) => { const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; };

let TEX: { glow: THREE.Texture; ring: THREE.Texture; spark: THREE.Texture; smoke: THREE.Texture; star: THREE.Texture; shard: THREE.Texture; splat: THREE.Texture; scorch: THREE.Texture } | null = null;

function textures() {
  if (TEX) return TEX;
  const radial = (stops: [number, string][], size = 128) => {
    const c = canvas(size, size), x = c.getContext('2d')!, g = x.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    for (const [o, col] of stops) g.addColorStop(o, col);
    x.fillStyle = g; x.fillRect(0, 0, size, size);
    return c;
  };
  const glow = radial([[0, 'rgba(255,255,255,1)'], [0.25, 'rgba(255,255,255,.75)'], [0.6, 'rgba(255,255,255,.18)'], [1, 'rgba(255,255,255,0)']]);
  const ring = (() => {
    const c = canvas(256, 256), x = c.getContext('2d')!;
    x.strokeStyle = '#fff'; x.lineWidth = 16; x.shadowColor = '#fff'; x.shadowBlur = 22;
    x.beginPath(); x.arc(128, 128, 92, 0, 7); x.stroke();
    x.lineWidth = 5; x.beginPath(); x.arc(128, 128, 70, 0, 7); x.stroke();
    return c;
  })();
  const spark = (() => {
    const c = canvas(64, 16), x = c.getContext('2d')!, g = x.createLinearGradient(0, 0, 64, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)'); g.addColorStop(0.75, 'rgba(255,255,255,.95)'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.ellipse(32, 8, 32, 4.5, 0, 0, 7); x.fill();
    return c;
  })();
  const smoke = (() => {
    const c = canvas(128, 128), x = c.getContext('2d')!;
    let s = 7; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    for (let i = 0; i < 26; i++) {
      const a = r() * 7, d = r() * 30, rad = 16 + r() * 26, px = 64 + Math.cos(a) * d, py = 64 + Math.sin(a) * d;
      const g = x.createRadialGradient(px, py, 0, px, py, rad);
      g.addColorStop(0, 'rgba(255,255,255,.22)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    }
    return c;
  })();
  // comic "pow" star: a spiky burst with a hot core
  const star = (() => {
    const c = canvas(256, 256), x = c.getContext('2d')!;
    x.translate(128, 128);
    const burst = (n: number, r0: number, r1: number, col: string, wob: number) => {
      x.fillStyle = col; x.beginPath();
      for (let i = 0; i < n * 2; i++) { const a = (i / (n * 2)) * Math.PI * 2, rr = (i % 2 ? r0 : r1) * (1 + Math.sin(i * 7.3) * wob); x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      x.closePath(); x.fill();
    };
    burst(11, 56, 122, 'rgba(255,255,255,.55)', 0.14);
    burst(9, 40, 96, 'rgba(255,255,255,.9)', 0.1);
    const g = x.createRadialGradient(0, 0, 0, 0, 0, 60); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g; x.beginPath(); x.arc(0, 0, 60, 0, 7); x.fill();
    return c;
  })();
  const shard = (() => {
    const c = canvas(32, 64), x = c.getContext('2d')!;
    const g = x.createLinearGradient(0, 0, 32, 64); g.addColorStop(0, '#fff'); g.addColorStop(1, 'rgba(180,235,255,.55)');
    x.fillStyle = g; x.beginPath(); x.moveTo(16, 0); x.lineTo(30, 26); x.lineTo(20, 64); x.lineTo(4, 30); x.closePath(); x.fill();
    x.strokeStyle = 'rgba(255,255,255,.9)'; x.lineWidth = 2; x.beginPath(); x.moveTo(16, 2); x.lineTo(19, 60); x.stroke();
    return c;
  })();
  // paint / goo splat: a blob with fingers and loose droplets
  const splat = (() => {
    const c = canvas(256, 256), x = c.getContext('2d')!;
    let s = 19; const r = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
    x.fillStyle = '#fff'; x.translate(128, 128);
    x.beginPath();
    for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2, rr = 58 + Math.sin(a * 5 + 1) * 14 + Math.sin(a * 9) * 9 + r() * 10; x.lineTo(Math.cos(a) * rr, Math.sin(a) * rr); }
    x.closePath(); x.fill();
    for (let i = 0; i < 14; i++) { const a = r() * 7, d = 74 + r() * 44, rad = 4 + r() * 11; x.beginPath(); x.arc(Math.cos(a) * d, Math.sin(a) * d, rad, 0, 7); x.fill(); x.lineWidth = rad * 0.9; x.strokeStyle = '#fff'; x.beginPath(); x.moveTo(Math.cos(a) * 50, Math.sin(a) * 50); x.lineTo(Math.cos(a) * d, Math.sin(a) * d); x.stroke(); }
    return c;
  })();
  const scorch = radial([[0, 'rgba(0,0,0,.75)'], [0.45, 'rgba(0,0,0,.5)'], [0.8, 'rgba(0,0,0,.14)'], [1, 'rgba(0,0,0,0)']]);
  TEX = { glow: tex(glow), ring: tex(ring), spark: tex(spark), smoke: tex(smoke), star: tex(star), shard: tex(shard), splat: tex(splat), scorch: tex(scorch) };
  return TEX;
}

/** Colour and style of each kind of shot (keyed by the projectile's sprite). */
export const SHOT_FX: Record<string, { color: number; style: 'dust' | 'ice' | 'fire' | 'bolt' | 'splat' | 'pop' }> = {
  fx_chalk: { color: 0xf4f8ff, style: 'dust' }, fx_marker: { color: 0xff3fa8, style: 'splat' }, fx_hl: { color: 0xd8ff3d, style: 'splat' },
  fx_shh: { color: 0x8fe8ff, style: 'ice' }, fx_ball: { color: 0xffb04a, style: 'pop' }, fx_flask: { color: 0x9dff4a, style: 'fire' },
  fx_bolt: { color: 0x5fd8ff, style: 'bolt' }, fx_beam: { color: 0xffe36a, style: 'bolt' }, fx_tack: { color: 0xd0d8e8, style: 'pop' },
  fx_plane: { color: 0xffffff, style: 'dust' }, fx_spark: { color: 0xb48cff, style: 'bolt' },
};

const WORDS = ['BOOM!', 'BAM!', 'POW!', 'KA-BOOM!', 'WHAM!', 'CRASH!', 'BANG!'];
const HOT = (c: number, k: number) => new THREE.Color(c).multiplyScalar(k);

export class Fx {
  /** Camera kick, decays by itself. The game adds it to the camera every frame. */
  shake = 0;
  private items: Item[] = [];
  private pools: Record<string, THREE.Object3D[]> = {};
  private group = new THREE.Group();
  private lights: { l: THREE.PointLight; t: number; dur: number; peak: number }[] = [];
  private bubbles = new Map<THREE.Object3D, THREE.Sprite>();
  private bubbleTex = new Map<string, { t: THREE.Texture; w: number; h: number }>();
  private wordTex = new Map<string, THREE.Texture>();
  private gooGeo = new THREE.SphereGeometry(1, 10, 8);
  private quad = new THREE.PlaneGeometry(1, 1);
  private sparks = 0;
  /** Lower on slow devices: fewer particles per effect. */
  detail = 1;

  constructor(private scene: THREE.Scene) {
    textures();
    scene.add(this.group);
    // Two lights that are always in the scene (intensity 0): flashing them never recompiles a shader.
    for (let i = 0; i < 2; i++) {
      const l = new THREE.PointLight(0xffffff, 0, 7, 1.8);
      this.group.add(l);
      this.lights.push({ l, t: 1, dur: 1, peak: 0 });
    }
  }

  /* ------------------------------------------------------------------ building blocks */

  private sprite(map: THREE.Texture, additive: boolean, key: string): THREE.Sprite {
    const pool = (this.pools[key] ||= []);
    const s = (pool.pop() as THREE.Sprite) || new THREE.Sprite(new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending, toneMapped: false, fog: false }));
    s.material.rotation = 0; s.material.opacity = 1; s.visible = true; s.renderOrder = 30;
    return s;
  }

  private add(obj: THREE.Object3D, dur: number, tick: Tick, key?: string, parent: THREE.Object3D = this.group) {
    parent.add(obj);
    this.items.push({ obj, t: 0, dur, tick, pool: key ? (this.pools[key] ||= []) : undefined, parent });
  }

  private flash(pos: THREE.Vector3, color: number, size: number, dur = 0.2, gain = 2.2) {
    const s = this.sprite(TEX!.glow, true, 'glow');
    s.position.copy(pos); s.material.color.copy(HOT(color, gain));
    this.add(s, dur, (u) => { s.scale.setScalar(size * (0.35 + 0.65 * Math.sqrt(u))); s.material.opacity = 1 - u * u; }, 'glow');
  }

  private star(pos: THREE.Vector3, color: number, size: number, dur = 0.24) {
    const s = this.sprite(TEX!.star, true, 'star'), rot = Math.random() * 6, spin = (Math.random() - 0.5) * 3;
    s.position.copy(pos); s.material.color.copy(HOT(color, 1.9));
    this.add(s, dur, (u) => { const k = u < 0.35 ? u / 0.35 : 1 + (u - 0.35) * 0.25; s.scale.setScalar(size * (0.25 + 0.75 * k)); s.material.rotation = rot + spin * u; s.material.opacity = u < 0.5 ? 1 : 1 - (u - 0.5) * 2; }, 'star');
  }

  private ring(pos: THREE.Vector3, color: number, size: number, dur = 0.34) {
    const s = this.sprite(TEX!.ring, true, 'ring');
    s.position.copy(pos); s.material.color.copy(HOT(color, 1.6));
    this.add(s, dur, (u) => { s.scale.setScalar(size * (0.2 + 0.8 * (1 - (1 - u) * (1 - u)))); s.material.opacity = (1 - u) * 0.9; }, 'ring');
  }

  /** A ring lying on the floor (shockwave). */
  private floorRing(pos: THREE.Vector3, color: number, size: number, dur = 0.5) {
    const pool = (this.pools.fring ||= []);
    const m = (pool.pop() as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>) || new THREE.Mesh(this.quad, new THREE.MeshBasicMaterial({ map: TEX!.ring, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false, fog: false }));
    m.visible = true; m.rotation.x = -Math.PI / 2; m.position.set(pos.x, 0.05, pos.z); m.material.color.copy(HOT(color, 1.5)); m.renderOrder = 4;
    this.add(m, dur, (u) => { m.scale.setScalar(size * (0.15 + 0.85 * (1 - (1 - u) ** 3))); m.material.opacity = (1 - u) * 0.85; }, 'fring');
  }

  private streaks(pos: THREE.Vector3, color: number, n: number, speed: number, dur = 0.36, map = TEX!.spark, gravity = 7, size = 0.26) {
    n = Math.max(2, Math.round(n * this.detail));
    for (let i = 0; i < n && this.sparks < 150; i++) {
      this.sparks++;
      const key = map === TEX!.shard ? 'shard' : 'spark';
      const s = this.sprite(map, true, key), a = Math.random() * Math.PI * 2, v = speed * (0.45 + Math.random() * 0.75);
      let vx = Math.cos(a) * v, vy = Math.sin(a) * v + speed * 0.35, vz = (Math.random() - 0.5) * v * 0.5;
      s.position.copy(pos); s.material.color.copy(HOT(color, 2));
      const len = size * (0.7 + Math.random() * 0.8), spin = map === TEX!.shard ? (Math.random() - 0.5) * 14 : 0;
      this.add(s, dur * (0.7 + Math.random() * 0.6), (u, dt) => {
        vy -= gravity * dt;
        s.position.x += vx * dt; s.position.y = Math.max(0.03, s.position.y + vy * dt); s.position.z += vz * dt;
        if (spin) { s.scale.set(len * 0.45, len * 0.9, 1); s.material.rotation += spin * dt; }
        else { s.scale.set(len * (1 + Math.hypot(vx, vy) * 0.12), len * 0.2, 1); s.material.rotation = Math.atan2(vy, vx); }
        s.material.opacity = 1 - u * u;
        if (u >= 1) this.sparks--;
      }, key);
    }
  }

  private puffs(pos: THREE.Vector3, color: number, n: number, size: number, dur = 0.9, rise = 0.9, opacity = 0.55) {
    n = Math.max(1, Math.round(n * this.detail));
    for (let i = 0; i < n; i++) {
      const s = this.sprite(TEX!.smoke, false, 'smoke'), a = Math.random() * 7, d = Math.random() * size * 0.3;
      const vx = Math.cos(a) * 0.35, vz = Math.sin(a) * 0.2, rot = Math.random() * 6, sp = (Math.random() - 0.5) * 1.4, k = 0.7 + Math.random() * 0.6;
      s.position.set(pos.x + Math.cos(a) * d, pos.y + Math.random() * 0.15, pos.z + Math.sin(a) * d * 0.5);
      s.material.color.set(color);
      this.add(s, dur * (0.75 + Math.random() * 0.5), (u, dt) => {
        s.position.x += vx * dt; s.position.z += vz * dt; s.position.y += rise * dt * (1 - u * 0.5);
        s.scale.setScalar(size * k * (0.45 + u * 0.9)); s.material.rotation = rot + sp * u;
        s.material.opacity = opacity * (u < 0.15 ? u / 0.15 : 1 - (u - 0.15) / 0.85);
      }, 'smoke');
    }
  }

  private splat(pos: THREE.Vector3, color: number, size: number, floor = false, dur = 1.4) {
    if (floor) {
      const pool = (this.pools.fsplat ||= []);
      const m = (pool.pop() as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>) || new THREE.Mesh(this.quad, new THREE.MeshBasicMaterial({ map: TEX!.splat, transparent: true, depthWrite: false, toneMapped: false, fog: false }));
      m.visible = true; m.rotation.set(-Math.PI / 2, 0, Math.random() * 6); m.position.set(pos.x, 0.035 + Math.random() * 0.01, pos.z); m.material.color.copy(HOT(color, 1.7)); m.renderOrder = 3;
      this.add(m, dur, (u) => { m.scale.setScalar(size * (u < 0.12 ? 0.3 + (u / 0.12) * 0.7 : 1 + u * 0.08)); m.material.opacity = u < 0.6 ? 0.95 : 0.95 * (1 - (u - 0.6) / 0.4); }, 'fsplat');
      return;
    }
    const s = this.sprite(TEX!.splat, false, 'splat');
    s.position.copy(pos); s.material.color.copy(HOT(color, 1.5)); s.material.rotation = Math.random() * 6;
    this.add(s, 0.42, (u) => { s.scale.setScalar(size * (0.3 + 0.7 * Math.min(1, u * 5))); s.material.opacity = u < 0.5 ? 1 : 1 - (u - 0.5) * 2; }, 'splat');
  }

  /** Jagged electric arcs that flicker for an instant. */
  private arcs(pos: THREE.Vector3, color: number, n: number, reach: number) {
    for (let k = 0; k < n; k++) {
      const pts: number[] = [], a = Math.random() * Math.PI * 2, segs = 6;
      for (let i = 0; i <= segs; i++) { const d = (i / segs) * reach, j = i === 0 ? 0 : 0.09; pts.push(pos.x + Math.cos(a) * d + (Math.random() - 0.5) * j * 2, pos.y + Math.sin(a) * d + (Math.random() - 0.5) * j * 2, pos.z + (Math.random() - 0.5) * j); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
      const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: HOT(color, 2.6), transparent: true, toneMapped: false, fog: false }));
      line.renderOrder = 31;
      this.add(line, 0.16, (u) => { line.material.opacity = (Math.sin(u * 40) > -0.3 ? 1 : 0.25) * (1 - u); if (u >= 1) { geo.dispose(); line.material.dispose(); } });
    }
  }

  private light(pos: THREE.Vector3, color: number, peak: number, dur: number) {
    const slot = this.lights.reduce((a, b) => (a.t / a.dur > b.t / b.dur ? a : b));
    slot.l.position.set(pos.x, Math.max(pos.y, 0.6), pos.z + 0.4); slot.l.color.set(color);
    slot.t = 0; slot.dur = dur; slot.peak = peak;
  }

  /* ------------------------------------------------------------------ the effects */

  /** A projectile lands on someone. */
  impact(pos: THREE.Vector3, shot: string, power = 1) {
    const f = SHOT_FX[shot] ?? SHOT_FX.fx_chalk, c = f.color, p = pos.clone();
    p.z += 0.12; // in front of the character, towards the camera
    this.star(p, c, 0.62 * power);
    this.flash(p, c, 0.9 * power, 0.16);
    switch (f.style) {
      case 'dust': this.puffs(p, 0xeef2ff, 3, 0.55, 0.55, 0.5, 0.6); this.streaks(p, c, 5, 2.4, 0.3); break;
      case 'splat': this.splat(p, c, 0.62 * power); this.streaks(p, c, 6, 2.8, 0.34, TEX!.spark, 9, 0.2); if (Math.random() < 0.5) this.splat(p, c, 0.5, true, 2.2); break;
      case 'ice': this.ring(p, c, 0.95 * power); this.streaks(p, 0xe8fbff, 7, 2.6, 0.5, TEX!.shard, 6, 0.24); this.puffs(p, 0xbfefff, 2, 0.6, 0.7, 0.3, 0.4); break;
      case 'fire': this.flash(p, 0xffa040, 1.25 * power, 0.3, 2.6); this.streaks(p, 0xffc04a, 8, 3, 0.45, TEX!.spark, 3, 0.22); this.puffs(p, 0x2a2a30, 2, 0.7, 0.9, 1.1, 0.5); this.splat(p, c, 0.55, true, 2.4); break;
      case 'bolt': this.arcs(p, c, 3, 0.55 * power); this.ring(p, c, 0.8 * power, 0.22); this.streaks(p, 0xffffff, 5, 3.4, 0.22, TEX!.spark, 0, 0.2); break;
      default: this.ring(p, c, 0.85 * power, 0.26); this.streaks(p, c, 7, 3, 0.32);
    }
  }

  /** A blast: lobbed shots, the bell, the megaphone's lane, a pop quiz going off. */
  explosion(pos: THREE.Vector3, radius = 1, color = 0xffa040, word = true) {
    const p = pos.clone(); p.y = Math.max(p.y, 0.45);
    this.flash(p, color, 2.6 * radius, 0.34, 3);
    this.flash(p, 0xffffff, 1.3 * radius, 0.16, 3);
    this.star(p, color, 1.7 * radius, 0.36);
    this.ring(p, color, 2.2 * radius, 0.42);
    this.floorRing(p, color, 3.4 * radius, 0.6);
    this.streaks(p, color, 16, 4.6, 0.65, TEX!.spark, 9, 0.3);
    this.streaks(p, 0xffffff, 6, 3.2, 0.4, TEX!.spark, 9, 0.2);
    this.puffs(p, 0x241c2c, 5, 1.2 * radius, 1.3, 1.1, 0.6);
    this.puffs(p, color, 2, 0.9 * radius, 0.5, 0.6, 0.45);
    // scorch mark that stays for a moment
    const pool = (this.pools.scorch ||= []);
    const m = (pool.pop() as THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>) || new THREE.Mesh(this.quad, new THREE.MeshBasicMaterial({ map: TEX!.scorch, transparent: true, depthWrite: false, fog: false }));
    m.visible = true; m.rotation.x = -Math.PI / 2; m.position.set(p.x, 0.03, p.z); m.scale.setScalar(1.9 * radius); m.renderOrder = 2;
    this.add(m, 3.2, (u) => { m.material.opacity = u < 0.6 ? 0.8 : 0.8 * (1 - (u - 0.6) / 0.4); }, 'scorch');
    this.light(p, color, 26 * radius, 0.38);
    this.shake = Math.min(0.32, this.shake + 0.12 * radius);
    if (word && radius >= 0.9) this.word(p, WORDS[Math.floor(Math.random() * WORDS.length)], color);
  }

  /** A comic onomatopoeia that pops out of a blast. */
  private word(pos: THREE.Vector3, text: string, color: number) {
    let t = this.wordTex.get(text);
    if (!t) {
      const c = canvas(512, 192), x = c.getContext('2d')!;
      x.font = '900 118px "Arial Black", Impact, system-ui, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
      x.translate(256, 100); x.rotate(-0.07);
      x.lineWidth = 26; x.strokeStyle = '#12061e'; x.strokeText(text, 0, 0, 470);
      x.lineWidth = 9; x.strokeStyle = '#fff'; x.strokeText(text, 0, 0, 470);
      x.fillStyle = '#ffe14a'; x.fillText(text, 0, 0, 470);
      t = tex(c); this.wordTex.set(text, t);
    }
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
    s.position.set(pos.x + (Math.random() - 0.5) * 0.5, pos.y + 0.9, pos.z + 0.2); s.renderOrder = 40;
    s.material.color.copy(new THREE.Color(0xffffff).lerp(new THREE.Color(color), 0.25));
    const tilt = (Math.random() - 0.5) * 0.3;
    this.add(s, 0.75, (u) => {
      const k = u < 0.2 ? (u / 0.2) * 1.18 : u < 0.32 ? 1.18 - ((u - 0.2) / 0.12) * 0.18 : 1;
      s.scale.set(2.3 * k, 0.86 * k, 1); s.material.rotation = tilt; s.position.y += 0.004;
      s.material.opacity = u < 0.65 ? 1 : 1 - (u - 0.65) / 0.35;
      if (u >= 1) s.material.dispose();
    });
  }

  /** A healing / power-up shimmer rising from a tile. */
  sparkle(pos: THREE.Vector3, color: number) {
    this.ring(pos.clone().setY(pos.y + 0.5), color, 0.9, 0.5);
    for (let i = 0; i < Math.round(5 * this.detail); i++) {
      const s = this.sprite(TEX!.glow, true, 'glow'), ox = (Math.random() - 0.5) * 0.6, oz = (Math.random() - 0.5) * 0.3, d = Math.random() * 0.25;
      s.material.color.copy(HOT(color, 2));
      this.add(s, 0.8, (u) => { const v = Math.max(0, u - d); s.position.set(pos.x + ox, pos.y + 0.15 + v * 1.1, pos.z + oz + 0.1); s.scale.setScalar(0.16 * (1 - v)); s.material.opacity = v > 0 ? 1 - v : 0; }, 'glow');
    }
  }

  /** A wave pushing down a lane (the drummer, the mop). */
  wave(pos: THREE.Vector3, color: number, reach = 2.5) {
    for (let i = 0; i < 3; i++) {
      const s = this.sprite(TEX!.ring, true, 'ring'), d = i * 0.12;
      s.material.color.copy(HOT(color, 1.7));
      this.add(s, 0.55 + d, (u) => { const v = Math.max(0, (u * (0.55 + d) - d) / 0.55); s.position.set(pos.x + v * reach, pos.y, pos.z + 0.1); s.scale.set(0.5 + v * 0.5, 1.2 + v * 0.9, 1); s.material.opacity = v > 0 ? (1 - v) * 0.9 : 0; }, 'ring');
    }
    this.streaks(pos, color, 6, 3, 0.3);
  }

  /** A chain of lightning between points (the coil). */
  chain(points: THREE.Vector3[], color: number) {
    for (let k = 0; k < points.length - 1; k++) {
      const a = points[k]!, b = points[k + 1]!, pts: number[] = [], segs = 9;
      for (let i = 0; i <= segs; i++) { const u = i / segs, j = i === 0 || i === segs ? 0 : 0.16; pts.push(a.x + (b.x - a.x) * u + (Math.random() - 0.5) * j, a.y + (b.y - a.y) * u + (Math.random() - 0.5) * j * 2, a.z + (b.z - a.z) * u + (Math.random() - 0.5) * j); }
      for (const [w, gain] of [[1, 2.8], [1, 1.4]] as const) {
        const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(gain > 2 ? pts : pts.map((v, i) => v + (i % 3 === 1 ? 0.03 : 0)), 3));
        const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: HOT(color, gain), transparent: true, toneMapped: false, fog: false, linewidth: w }));
        line.renderOrder = 31;
        this.add(line, 0.22, (u) => { line.material.opacity = (Math.sin(u * 50) > -0.2 ? 1 : 0.3) * (1 - u); if (u >= 1) { geo.dispose(); line.material.dispose(); } });
      }
      this.flash(b, color, 0.8, 0.2);
    }
  }

  /* ------------------------------------------------------------------ speech bubbles */

  private bubbleFor(text: string) {
    let b = this.bubbleTex.get(text);
    if (b) return b;
    const font = '800 44px "Trebuchet MS", "Comic Sans MS", system-ui, sans-serif';
    const m = canvas(8, 8).getContext('2d')!; m.font = font;
    // wrap to two lines at most
    const words = text.split(' '); let lines = [text];
    if (m.measureText(text).width > 420 && words.length > 1) {
      let best = 1, diff = 1e9;
      for (let i = 1; i < words.length; i++) { const d = Math.abs(m.measureText(words.slice(0, i).join(' ')).width - m.measureText(words.slice(i).join(' ')).width); if (d < diff) { diff = d; best = i; } }
      lines = [words.slice(0, best).join(' '), words.slice(best).join(' ')];
    }
    const tw = Math.max(...lines.map((l) => m.measureText(l).width)), w = Math.ceil(tw + 64), bodyH = lines.length * 52 + 34, h = bodyH + 34;
    const c = canvas(w + 12, h + 12), x = c.getContext('2d')!;
    x.translate(6, 6); x.lineJoin = 'round';
    const path = () => { x.beginPath(); x.roundRect(0, 0, w, bodyH, 30); x.moveTo(w * 0.36, bodyH - 4); x.lineTo(w * 0.3, h); x.lineTo(w * 0.52, bodyH - 4); };
    x.fillStyle = 'rgba(8,2,20,.45)'; x.save(); x.translate(5, 7); path(); x.fill(); x.restore();
    path(); x.fillStyle = '#fffdf2'; x.fill(); x.lineWidth = 6; x.strokeStyle = '#150a26'; x.stroke();
    x.fillStyle = '#fffdf2'; x.fillRect(w * 0.37, bodyH - 8, w * 0.14, 9);
    x.font = font; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#150a26';
    lines.forEach((l, i) => x.fillText(l, w / 2, 17 + 26 + i * 52));
    b = { t: tex(c), w: c.width, h: c.height };
    if (this.bubbleTex.size > 60) { const k = this.bubbleTex.keys().next().value as string; this.bubbleTex.get(k)!.t.dispose(); this.bubbleTex.delete(k); }
    this.bubbleTex.set(text, b);
    return b;
  }

  /** Is this character already talking? */
  talking(anchor: THREE.Object3D) { return this.bubbles.has(anchor); }
  get bubbleCount() { return this.bubbles.size; }

  /** A speech bubble over `anchor` (it follows the character). `height` is the character's height. */
  say(anchor: THREE.Object3D, height: number, text: string, dur = 2.6) {
    if (this.bubbles.has(anchor) || this.bubbles.size >= 4) return false;
    const b = this.bubbleFor(text);
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: b.t, transparent: true, depthWrite: false, depthTest: false, toneMapped: false, fog: false }));
    s.center.set(0.32, 0); s.renderOrder = 50;
    const k = 0.0042, w = b.w * k, h = b.h * k, wp = new THREE.Vector3();
    this.bubbles.set(anchor, s);
    // In the scene, not parented: the character may spin or shrink without dragging the bubble.
    this.add(s, dur, (u) => {
      anchor.getWorldPosition(wp);
      s.position.set(wp.x + 0.05, wp.y + height + 0.08 + Math.sin(u * 9) * 0.015, wp.z + 0.05);
      const pop = u < 0.09 ? (u / 0.09) * 1.15 : u < 0.14 ? 1.15 - ((u - 0.09) / 0.05) * 0.15 : 1;
      s.scale.set(w * pop, h * pop, 1);
      s.material.opacity = u < 0.86 ? 1 : 1 - (u - 0.86) / 0.14;
      if (u >= 1 || !anchor.parent) { this.bubbles.delete(anchor); s.material.dispose(); }
    });
    return true;
  }

  /* ------------------------------------------------------------------ neon liquid at the gate */

  /**
   * Neon liquid bursts out of the coffin gate at `from` and splashes along the path towards `to`.
   * Blobs stretch as they fly and flatten into glowing puddles that shrink away.
   */
  ooze(from: THREE.Vector3, to: THREE.Vector3, color: number) {
    const hot = HOT(color, 2.4), n = Math.round(11 * this.detail) + 3;
    this.flash(from.clone().setY(1.1), color, 2.4, 0.4, 2.6);
    this.floorRing(from, color, 2.6, 0.7);
    this.light(from.clone().setY(1.2), color, 18, 0.5);
    for (let i = 0; i < n; i++) {
      const pool = (this.pools.goo ||= []);
      const m = (pool.pop() as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>) || new THREE.Mesh(this.gooGeo, new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, fog: false }));
      m.visible = true; m.material.color.copy(hot); m.material.opacity = 1; m.rotation.set(0, 0, 0);
      const r = 0.05 + Math.random() * 0.1, aim = i < n * 0.6 ? 0.25 + Math.random() * 0.9 : Math.random() * 0.4;
      const tx = from.x + (to.x - from.x) * aim + (Math.random() - 0.5) * 1.1, tz = from.z + (to.z - from.z) * aim + (Math.random() - 0.5) * 1.1;
      const T = 0.38 + Math.random() * 0.4, g = 9, y0 = 0.5 + Math.random() * 1.2, delay = Math.random() * 0.22;
      const vx = (tx - from.x) / T, vz = (tz - from.z) / T; let vy = (0.04 - y0) / T + 0.5 * g * T, y = y0, landed = 0;
      m.position.set(from.x, y0, from.z); m.scale.setScalar(0.001);
      const life = delay + T + 1.5;
      this.add(m, life, (u, dt) => {
        const t = u * life - delay;
        if (t < 0) return;
        if (!landed) {
          vy -= g * dt; y += vy * dt;
          m.position.x += vx * dt; m.position.z += vz * dt; m.position.y = y;
          // stretched along the fall, like a drop
          const sp = Math.min(2.2, 1 + Math.abs(vy) * 0.16);
          m.scale.set(r / Math.sqrt(sp), r * sp, r / Math.sqrt(sp));
          if (y <= 0.04) { landed = t; m.position.y = 0.035; if (this.sparks < 150 && Math.random() < 0.5) this.streaks(m.position.clone().setY(0.12), color, 2, 1.6, 0.25, TEX!.spark, 9, 0.14); }
        } else {
          // a puddle: spreads fast, wobbles, then drains away
          const v = (t - landed) / 1.5, spread = Math.min(1, v * 7), wob = 1 + Math.sin(v * 26) * 0.08 * (1 - v);
          const s = r * (1.4 + spread * 2.2) * wob * (v < 0.55 ? 1 : 1 - (v - 0.55) / 0.45);
          m.scale.set(Math.max(s, 0.001), r * 0.16, Math.max(s * 0.9, 0.001));
          m.material.opacity = v < 0.7 ? 1 : 1 - (v - 0.7) / 0.3;
        }
      }, 'goo');
    }
    // drips running down the mouth of the gate
    for (let i = 0; i < Math.round(5 * this.detail); i++) {
      const pool = (this.pools.goo ||= []);
      const m = (pool.pop() as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>) || new THREE.Mesh(this.gooGeo, new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, fog: false }));
      m.visible = true; m.material.color.copy(hot); m.material.opacity = 1;
      const ox = (Math.random() - 0.5) * 0.9, oz = (Math.random() - 0.5) * 0.5, top = 1.5 + Math.random() * 0.5, d = Math.random() * 0.4;
      this.add(m, 0.9 + d, (u) => { const v = Math.max(0, (u * (0.9 + d) - d) / 0.9); m.position.set(from.x + ox * 0.6 - 0.2, top * (1 - v * v), from.z + oz); m.scale.set(0.035, 0.05 + v * 0.22, 0.035); m.material.opacity = v > 0 ? 1 : 0; }, 'goo');
    }
  }

  /** One neon drop falling from a character that has just climbed out. */
  drip(pos: THREE.Vector3, color: number) {
    const pool = (this.pools.goo ||= []);
    const m = (pool.pop() as THREE.Mesh<THREE.SphereGeometry, THREE.MeshBasicMaterial>) || new THREE.Mesh(this.gooGeo, new THREE.MeshBasicMaterial({ transparent: true, toneMapped: false, fog: false }));
    m.visible = true; m.material.color.copy(HOT(color, 2.2)); m.material.opacity = 1;
    const x = pos.x + (Math.random() - 0.5) * 0.3, z = pos.z + (Math.random() - 0.5) * 0.2, y0 = pos.y, r = 0.03 + Math.random() * 0.03;
    this.add(m, 0.9, (u) => {
      const fall = Math.min(1, u / 0.3), y = y0 * (1 - fall * fall);
      if (fall < 1) { m.position.set(x, Math.max(y, 0.035), z); m.scale.set(r * 0.8, r * 1.8, r * 0.8); }
      else { const v = (u - 0.3) / 0.7; m.position.y = 0.035; const s = r * (1.2 + Math.min(1, v * 6) * 1.6) * (1 - v * 0.6); m.scale.set(s, r * 0.15, s); m.material.opacity = 1 - v * v; }
    }, 'goo');
  }

  /* ------------------------------------------------------------------ loop */

  update(dt: number) {
    for (const l of this.lights) {
      if (l.t >= l.dur) { l.l.intensity = 0; continue; }
      l.t += dt; const u = Math.min(1, l.t / l.dur);
      l.l.intensity = l.peak * (u < 0.15 ? u / 0.15 : (1 - u) * (1 - u));
    }
    this.shake = this.shake < 0.002 ? 0 : this.shake * Math.exp(-dt * 9);
    const keep: Item[] = [];
    for (const it of this.items) {
      it.t += dt;
      const u = Math.min(1, it.t / it.dur);
      it.tick(u, dt);
      if (u >= 1) {
        it.parent.remove(it.obj);
        if (it.pool && it.pool.length < 90) { it.obj.visible = false; it.pool.push(it.obj); }
      } else keep.push(it);
    }
    this.items = keep;
  }

  /** Everything off the stage (a new battle starts). */
  clear() {
    for (const it of this.items) it.parent.remove(it.obj);
    this.items = []; this.bubbles.clear(); this.sparks = 0; this.shake = 0;
    for (const l of this.lights) { l.t = l.dur; l.l.intensity = 0; }
  }

  dispose() {
    this.clear();
    this.scene.remove(this.group);
    for (const p of Object.values(this.pools)) for (const o of p) { const m = (o as THREE.Mesh).material as THREE.Material | undefined; m?.dispose(); }
    for (const b of this.bubbleTex.values()) b.t.dispose();
    for (const t of this.wordTex.values()) t.dispose();
    this.gooGeo.dispose(); this.quad.dispose();
  }
}

/* ------------------------------------------------------------------ what they say */

/** Short English lines by character. Everyday phrases a learner can read at a glance. */
export const LINES: Record<string, { walk: string[]; hit: string[]; bye: string[]; eat?: string[] }> = {
  basic: { walk: ['Just one more video…', 'Wait, what class?', 'No signal?!', 'Five more minutes!', 'Is there Wi-Fi?', 'So many likes!'], hit: ['Hey! My phone!', 'Ouch!', 'Not cool!'], bye: ['OK, I’ll study!', 'Fine, I’m going!'], eat: ['Move, please!', 'Let me through!'] },
  flag: { walk: ['Hello, followers!', 'Like and subscribe!', 'We’re live!', 'Smile for the camera!', 'Follow me, everyone!'], hit: ['Cut! Cut!', 'Not the ring light!', 'That’s not funny!'], bye: ['End of stream…', 'See you next time!'], eat: ['This is great content!'] },
  cone: { walk: ['One more level!', 'I can’t hear you!', 'Lag! So much lag!', 'I’m almost winning!', 'Wait for me, team!'], hit: ['Who did that?!', 'Game over?!', 'My headset!'], bye: ['GG, teacher.', 'I need a break.'], eat: ['Out of my way!'] },
  book: { walk: ['Where is the principal?', 'Look at these grades!', 'I pay for this school!', 'I want an explanation!', 'This is unacceptable!'], hit: ['How dare you!', 'I’m calling a lawyer!', 'Careful!'], bye: ['Fine. We’ll talk later.', 'I’ll send an email.'], eat: ['Open this door!'] },
  bucket: { walk: ['I want answers!', 'My son is an angel!', 'He never does homework?', 'Who is in charge here?', 'I’m not leaving!'], hit: ['My handbag!', 'Excuse me?!', 'How rude!'], bye: ['I’ll come back tomorrow.', 'OK, OK, I’m calm.'], eat: ['Let me in!'] },
  football: { walk: ['Class is boring!', 'Catch me if you can!', 'I’m out of here!', 'Too slow, teacher!', 'No homework today!'], hit: ['Hey, watch it!', 'That hurt!', 'No way!'], bye: ['OK, I’ll sit down.', 'You win this time.'], eat: ['Get out of my way!'] },
  balloon: { walk: ['Flying is faster!', 'Look, no hands!', 'See you later!', 'Nice view from here!'], hit: ['Mayday! Mayday!', 'I’m going down!'], bye: ['Emergency landing!', 'Battery is dead…'] },
  prof: { walk: ['Is this the bus stop?', 'I was just passing by.', 'Nice school…', 'Have you got a coin?', 'I’m so tired.'], hit: ['Easy, easy!', 'Hey now…', 'What was that?'], bye: ['I’ll find another bench.', 'Good night, everyone.'], eat: ['Just resting here.'] },
  boss: { walk: ['Turn it UP!', 'This is MY block!', 'Nobody studies today!', 'Louder! LOUDER!', 'Who’s the boss now?'], hit: ['Is that all?', 'Ha! That tickles!', 'You’ll pay for that!'], bye: ['The party is over…', 'I’ll be back!'], eat: ['Out of my way!'] },
};
export const COLD = ['So… cold…', 'I can’t move!', 'Brrr!', 'My feet are frozen!'];
export const pickLine = (list: string[]) => list[Math.floor(Math.random() * list.length)]!;
