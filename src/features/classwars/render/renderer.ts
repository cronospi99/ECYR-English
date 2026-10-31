/* Class Wars — 60 fps canvas renderer: DPR-aware, cached ground chunks, y-sorted sprites,
   smoothed camera with shake, particles, popups and adaptive quality for slow phones. */
import { BOX_COOLDOWN_MS, FLAG, WORLD_H, WORLD_W, clamp, lerp } from '../game/constants';
import { CHAR_IDS, DIA_OUTCOMES, POWERS, UPGRADES, WEAPONS, PJ_LOOK, outcomeColor, outcomeLabel } from '../game/defs';
import { num, t as tr, tx, type Tx } from '../i18n';
import type { IconKey } from '../game/icons';
import { inBush, PROP_INFO, type GameMap, type Prop } from '../game/map';
import type { RenderSource, RP } from '../game/client';
import type { Fxq } from '../game/vis';
import { PROJ_LOOK } from '../game/vis';
import { TEACHERS } from '@/features/cards/teachers';
import { CHUNK, Ground } from './ground';
import { INK, boxSprite, charSprites, gemSprite, gemTier, iconSprite, propSprite, weaponSprite, type Sprite } from './sprites';
import { sfx } from './audio';

interface Particle { x: number; y: number; vx: number; vy: number; life: number; max: number; size: number; color: string; kind: number; rot: number; vr: number; g: number; drag: number; text?: string }
interface Popup { x: number; y: number; text: string; color: string; size: number; born: number; life: number; idx: number; dy: number; ic?: IconKey }
interface Anim { lx: number; ly: number; phase: number; speed: number; face: number; seen: number }

const P_DUST = 0, P_SPARK = 1, P_STAR = 2, P_CONF = 3, P_RING = 4, P_TEXT = 5, P_SHARD = 6;
const QUAL = [
  { dpr: 1, particles: 140, label: 'low' },
  { dpr: 1.5, particles: 320, label: 'medium' },
  { dpr: 2, particles: 600, label: 'high' },
];
const STATUS_TEXT: Record<string, [Tx, string]> = {
  stun: [['Stunned!', '¡Aturdido!'], '#ffd60a'], root: [['Detention!', '¡Detención!'], '#ff9f0a'], confuse: [['Confused?', '¿Confundido?'], '#64d2ff'],
  charm: [['Charmed', 'Encantado'], '#ff7ab6'], blind: [['Flash!', '¡Flash!'], '#ffffff'], hacked: [['Hacked!', '¡Hackeado!'], '#30ff7a'], slow: [['Slowed', 'Lento'], '#bf5af2'],
};

export type CamMode = 'follow' | 'auto' | 'map';

export class Renderer {
  canvas: HTMLCanvasElement;
  g: CanvasRenderingContext2D;
  w = 0; h = 0; dpr = 1;
  quality = 2;
  maxQuality = 2;
  baseZoom = 1;
  cam = { x: WORLD_W / 2, y: WORLD_H / 2, z: 1 };
  mode: CamMode = 'follow';
  trauma = 0;
  private ground: Ground | null = null;
  private map: GameMap | null = null;
  private tall: Prop[] = [];
  private parts: Particle[] = [];
  private pops: Popup[] = [];
  private anim = new Map<number, Anim>();
  private lasers: { x1: number; y1: number; x2: number; y2: number; born: number }[] = [];
  private arcs: { x1: number; y1: number; x2: number; y2: number; born: number }[] = [];
  private cones: { idx: number; aim: number; r: number; kind: number; born: number; x: number; y: number }[] = [];
  private waves: { x: number; y: number; r: number; kind: number; born: number }[] = [];
  private says: { idx: number; text: string; born: number }[] = [];
  private tags = new Map<string, Sprite>();
  private ft: number[] = [];
  private qualAt = 0;
  private hurtFlash = 0;
  private lastPos = new Map<number, RP>();
  marker: { x: number; y: number; at: number } | null = null;
  /** HUD hooks. */
  onFx: ((fx: Fxq, me: RP | null) => void) | null = null;
  fps = 60;
  frameMs = 16;
  workMs = 0;
  private chunkBudget = 8;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.g = canvas.getContext('2d', { alpha: false })!;
    const lowEnd = (navigator.hardwareConcurrency || 4) <= 4 && /Android|iPhone|iPad/i.test(navigator.userAgent);
    if (lowEnd) this.quality = 1;
    this.resize();
  }

  setMap(map: GameMap) {
    this.map = map;
    this.ground = new Ground(map);
    this.tall = map.props.filter((p) => !PROP_INFO[p.k].flat).sort((a, b) => a.y - b.y);
  }

  resize() {
    const r = this.canvas.getBoundingClientRect();
    this.w = Math.max(1, r.width);
    this.h = Math.max(1, r.height);
    this.dpr = Math.min(window.devicePixelRatio || 1, QUAL[this.quality].dpr);
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    // Close, readable camera on phones and laptops alike.
    this.baseZoom = clamp(Math.sqrt(this.w * this.h) / 840, 0.92, 1.3);
  }

  get qualityLabel() { return QUAL[this.quality].label; }

  /** Sprite scale, quantised so caches survive small zoom changes. */
  private get S() { return Math.max(0.5, Math.round(this.cam.z * this.dpr * 4) / 4); }

  shake(a: number) { this.trauma = Math.min(1, this.trauma + a); }

  worldFromScreen(sx: number, sy: number) {
    return { x: (sx - this.w / 2) / this.cam.z + this.cam.x, y: (sy - this.h / 2) / this.cam.z + this.cam.y };
  }

  /* -------------------------------------------------------------- frame */
  frame(src: RenderSource, dt: number) {
    const t0 = performance.now();
    const now = t0;
    if (!this.map || this.map !== src.map) this.setMap(src.map);
    const players = src.players();
    const byIdx = new Map<number, RP>();
    for (const p of players) byIdx.set(p.idx, p);
    const me = players.find((p) => p.me) ?? null;
    this.updateCamera(players, me, dt);
    this.processFx(src, byIdx, me);

    const g = this.g;
    const z = this.cam.z;
    let sx = 0, sy = 0;
    if (this.trauma > 0) {
      const k = this.trauma * this.trauma * 14;
      sx = (Math.random() * 2 - 1) * k;
      sy = (Math.random() * 2 - 1) * k;
      this.trauma = Math.max(0, this.trauma - dt * 1.8);
    }
    const ox = this.w / 2 - this.cam.x * z + sx, oy = this.h / 2 - this.cam.y * z + sy;
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    g.fillStyle = '#2f8a3a';
    g.fillRect(0, 0, this.w, this.h);
    g.setTransform(z * this.dpr, 0, 0, z * this.dpr, ox * this.dpr, oy * this.dpr);
    g.imageSmoothingEnabled = true;

    const vx0 = this.cam.x - this.w / 2 / z - 40, vy0 = this.cam.y - this.h / 2 / z - 40;
    const vx1 = this.cam.x + this.w / 2 / z + 40, vy1 = this.cam.y + this.h / 2 / z + 40;
    const S = this.S;
    this.drawGround(vx0, vy0, vx1, vy1, S);
    for (const bu of src.map.burrows) if (bu.x > vx0 - 90 && bu.x < vx1 + 90 && bu.y > vy0 - 70 && bu.y < vy1 + 70) this.drawPortal(bu.x, bu.y, bu.id, now);

    const vis = src.vis;
    // zones + telegraphs
    for (const zn of vis.zones) this.drawZone(zn.kind, zn.x, zn.y, zn.r, (now - zn.born) / 1000, (zn.until - now) / 1000);
    for (const tg of vis.teles) {
      const k = clamp((now - tg.born) / Math.max(1, tg.at - tg.born), 0, 1);
      g.beginPath(); g.ellipse(tg.x, tg.y, tg.r, tg.r * 0.62, 0, 0, 7);
      g.fillStyle = tg.kind === 1 ? `rgba(255,92,225,${0.12 + k * 0.2})` : `rgba(255,214,10,${0.12 + k * 0.22})`;
      g.fill();
      g.lineWidth = 3; g.setLineDash([10, 8]); g.strokeStyle = tg.kind === 1 ? '#ff5ce1' : '#ffd60a'; g.stroke(); g.setLineDash([]);
      g.beginPath(); g.ellipse(tg.x, tg.y, tg.r * k, tg.r * 0.62 * k, 0, 0, 7); g.fillStyle = 'rgba(255,255,255,0.18)'; g.fill();
    }
    if (this.marker && now - this.marker.at < 900) {
      const k = (now - this.marker.at) / 900;
      g.beginPath(); g.ellipse(this.marker.x, this.marker.y, 18 + k * 8, (18 + k * 8) * 0.6, 0, 0, 7);
      g.lineWidth = 3.5; g.strokeStyle = `rgba(255,255,255,${1 - k})`; g.stroke();
      g.beginPath(); g.ellipse(this.marker.x, this.marker.y, 5, 3, 0, 0, 7); g.fillStyle = `rgba(255,255,255,${1 - k})`; g.fill();
    }

    // gems (flat, bobbing)
    for (const gm of vis.gems.values()) {
      if (gm.x < vx0 || gm.x > vx1 || gm.y < vy0 || gm.y > vy1) continue;
      this.drawGem(gm, byIdx, now, S);
    }

    // y-sorted: tall props, bushes, boxes, players
    type D = { y: number; k: 0 | 1 | 2; p?: Prop; b?: { x: number; y: number; born: number; id: number; readyAt: number }; r?: RP };
    const list: D[] = [];
    for (const p of this.tall) {
      if (p.x < vx0 - 80 || p.x > vx1 + 80 || p.y < vy0 - 20 || p.y > vy1 + 180) continue;
      list.push({ y: p.y, k: 0, p });
    }
    for (const b of vis.boxes.values()) if (b.x > vx0 && b.x < vx1 && b.y > vy0 && b.y < vy1 + 80) list.push({ y: b.y, k: 1, b });
    for (const p of players) {
      const a = this.anim.get(p.idx);
      const ps = vis.ps.get(p.idx);
      if (!(p.flags & FLAG.alive) && !(ps && now - ps.koAt < 800)) continue;
      if (p.x < vx0 - 60 || p.x > vx1 + 60 || p.y < vy0 - 20 || p.y > vy1 + 140) { if (a) { a.lx = p.x; a.ly = p.y; } continue; }
      list.push({ y: p.y, k: 2, r: p });
    }
    list.sort((a, b) => a.y - b.y);
    for (const d of list) {
      if (d.k === 0) {
        // see yourself through the bush you are hiding in
        const see = d.p!.k === 'bush' && me && Math.hypot(me.x - d.p!.x, me.y - d.p!.y) < 40 * d.p!.s;
        if (see) g.globalAlpha = 0.5;
        this.drawProp(d.p!, S);
        if (see) g.globalAlpha = 1;
      }
      else if (d.k === 1) this.drawBox(d.b!, now, S);
      else this.drawPlayer(d.r!, src, now, dt, S, me);
    }

    // projectiles + grenades + lasers
    for (const pr of vis.projs.values()) this.drawProj(pr.kind, pr.x, pr.y, pr.vx, pr.vy, now - pr.born);
    for (const a of this.arcs) {
      const k = Math.max(0, (now - a.born) / 700);
      if (k > 1) continue;
      const x = lerp(a.x1, a.x2, k), y = lerp(a.y1, a.y2, k) - Math.sin(k * Math.PI) * 120;
      g.save(); g.translate(x, y); g.rotate(k * 9);
      const sp = weaponSprite(6, S);
      g.drawImage(sp.c, -sp.ax - 16, -sp.ay, sp.w, sp.h);
      g.restore();
    }
    this.arcs = this.arcs.filter((a) => now - a.born < 720);
    for (const l of this.lasers) {
      const k = 1 - (now - l.born) / 320;
      if (k <= 0) continue;
      g.lineCap = 'round';
      g.strokeStyle = `rgba(255,59,48,${0.35 * k})`; g.lineWidth = 22 * k; g.beginPath(); g.moveTo(l.x1, l.y1); g.lineTo(l.x2, l.y2); g.stroke();
      g.strokeStyle = `rgba(255,255,255,${k})`; g.lineWidth = 5 * k; g.stroke();
      g.fillStyle = `rgba(255,59,48,${k})`; g.beginPath(); g.arc(l.x2, l.y2, 10 * k, 0, 7); g.fill();
    }
    this.lasers = this.lasers.filter((l) => now - l.born < 330);
    for (const c of this.cones) {
      const k = 1 - (now - c.born) / 380;
      if (k <= 0) continue;
      const p = byIdx.get(c.idx);
      const x = p ? p.x : c.x, y = p ? p.y - 30 : c.y;
      const half = CONE_HALF[c.kind] ?? 0.7;
      g.beginPath(); g.moveTo(x, y); g.arc(x, y, c.r * (1.1 - k * 0.1), c.aim - half, c.aim + half); g.closePath();
      if (c.kind === 0) g.fillStyle = `rgba(255,255,255,${0.75 * k})`;
      else if (c.kind === 2) {
        g.fillStyle = `rgba(79,179,154,${0.35 * k})`; g.fill();
        // sound rings
        for (let i = 1; i <= 3; i++) { g.beginPath(); g.arc(x, y, c.r * (i / 3) * (1.15 - k * 0.15), c.aim - half, c.aim + half); g.lineWidth = 5 * k; g.strokeStyle = `rgba(255,255,255,${0.8 * k})`; g.stroke(); }
        continue;
      } else if (c.kind === 3) g.fillStyle = `rgba(255,140,60,${0.5 * k})`;
      else { const gr = g.createLinearGradient(x - c.r, y, x + c.r, y); gr.addColorStop(0, `rgba(58,91,199,${0.5 * k})`); gr.addColorStop(0.5, `rgba(255,255,255,${0.5 * k})`); gr.addColorStop(1, `rgba(226,61,79,${0.5 * k})`); g.fillStyle = gr; }
      g.fill();
    }
    this.cones = this.cones.filter((c) => now - c.born < 400);
    for (const wv of this.waves) {
      const k = Math.max(0.01, (now - wv.born) / 450);
      if (k > 1) continue;
      g.beginPath(); g.ellipse(wv.x, wv.y - 20, wv.r * k, wv.r * k * 0.65, 0, 0, 7);
      const col = wv.kind === 0 ? '255,122,182' : wv.kind === 1 ? '255,69,58' : wv.kind === 3 ? '48,255,122' : '255,255,255';
      g.lineWidth = 10 * (1 - k) + 2; g.strokeStyle = `rgba(${col},${1 - k})`; g.stroke();
      g.fillStyle = `rgba(${col},${0.15 * (1 - k)})`; g.fill();
    }
    this.waves = this.waves.filter((w) => now - w.born < 460);

    this.drawParticles(dt);

    // nametags, bars and status on top
    for (const d of list) if (d.k === 2) this.drawOverlay(d.r!, src, now, S);
    this.drawPopups(now, byIdx);

    // screen-space effects
    g.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.hurtFlash > 0) {
      const gr = g.createRadialGradient(this.w / 2, this.h / 2, Math.min(this.w, this.h) * 0.3, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.75);
      gr.addColorStop(0, 'rgba(255,0,0,0)');
      gr.addColorStop(1, `rgba(255,30,30,${0.45 * this.hurtFlash})`);
      g.fillStyle = gr; g.fillRect(0, 0, this.w, this.h);
      this.hurtFlash = Math.max(0, this.hurtFlash - dt * 2.5);
    }
    if (me && me.flags & FLAG.blind) {
      const gr = g.createRadialGradient(this.w / 2, this.h / 2, 30, this.w / 2, this.h / 2, Math.max(this.w, this.h) * 0.5);
      gr.addColorStop(0, 'rgba(255,255,255,0.55)');
      gr.addColorStop(0.35, 'rgba(250,250,255,0.92)');
      gr.addColorStop(1, 'rgba(255,255,255,0.98)');
      g.fillStyle = gr; g.fillRect(0, 0, this.w, this.h);
    }
    if (me && me.flags & FLAG.confuse) {
      g.fillStyle = `rgba(100,210,255,${0.10 + Math.sin(now / 120) * 0.05})`; g.fillRect(0, 0, this.w, this.h);
    }

    this.adapt(performance.now() - t0, dt);
  }

  /* ------------------------------------------------------------- camera */
  private updateCamera(players: RP[], me: RP | null, dt: number) {
    const k = 1 - Math.exp(-dt * 7);
    let tx = this.cam.x, ty = this.cam.y, tz = this.baseZoom;
    if (this.mode === 'follow' && me) {
      tx = me.x + Math.cos(me.aim) * 46;
      ty = me.y - 30 + Math.sin(me.aim) * 34;
    } else if (this.mode === 'map' || (this.mode === 'follow' && !me)) {
      tx = WORLD_W / 2; ty = WORLD_H / 2;
      tz = Math.min(this.w / WORLD_W, this.h / WORLD_H) * 1.02;
    } else {
      const live = players.filter((p) => p.flags & FLAG.alive && !(p.flags & FLAG.away));
      if (live.length) {
        // focus on the busiest area: the player with most neighbours
        let best = live[0], bn = -1;
        for (const p of live) {
          let n = 0;
          for (const q of live) if (Math.hypot(p.x - q.x, p.y - q.y) < 520) n++;
          n += p.dia / 5000;
          if (n > bn) { bn = n; best = p; }
        }
        const group = live.filter((q) => Math.hypot(best.x - q.x, best.y - q.y) < 620);
        let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
        for (const q of group) { x0 = Math.min(x0, q.x); y0 = Math.min(y0, q.y); x1 = Math.max(x1, q.x); y1 = Math.max(y1, q.y); }
        tx = (x0 + x1) / 2; ty = (y0 + y1) / 2 - 30;
        tz = clamp(Math.min(this.w / (x1 - x0 + 700), this.h / (y1 - y0 + 520)), 0.5, this.baseZoom * 0.95);
      }
    }
    const kk = this.mode === 'auto' ? k * 0.35 : k;
    this.cam.x = lerp(this.cam.x, tx, kk);
    this.cam.y = lerp(this.cam.y, ty, kk);
    this.cam.z = lerp(this.cam.z, tz, kk * 0.6);
    // keep inside the world when zoomed in
    const hw = this.w / 2 / this.cam.z, hh = this.h / 2 / this.cam.z;
    if (hw * 2 < WORLD_W) this.cam.x = clamp(this.cam.x, hw - 60, WORLD_W - hw + 60);
    else this.cam.x = WORLD_W / 2;
    if (hh * 2 < WORLD_H) this.cam.y = clamp(this.cam.y, hh - 60, WORLD_H - hh + 60);
    else this.cam.y = WORLD_H / 2;
  }

  snapTo(x: number, y: number) { this.cam.x = x; this.cam.y = y; this.cam.z = this.baseZoom; }

  /* -------------------------------------------------------------- layers */
  private drawGround(x0: number, y0: number, x1: number, y1: number, S: number) {
    const gr = this.ground!;
    gr.setScale(S);
    this.chunkBudget = 8;
    const g = this.g;
    for (let cy = Math.max(0, Math.floor(y0 / CHUNK)); cy <= Math.min(Math.floor(WORLD_H / CHUNK), Math.floor(y1 / CHUNK)); cy++)
      for (let cx = Math.max(0, Math.floor(x0 / CHUNK)); cx <= Math.min(Math.floor(WORLD_W / CHUNK), Math.floor(x1 / CHUNK)); cx++) {
        const has = gr.has(cx, cy);
        if (!has && this.chunkBudget-- <= 0) { g.fillStyle = cx % 2 ? '#4fcd4c' : '#45c043'; g.fillRect(cx * CHUNK, cy * CHUNK, CHUNK + 1, CHUNK + 1); continue; }
        g.drawImage(gr.get(cx, cy), cx * CHUNK, cy * CHUNK, CHUNK + 0.6, CHUNK + 0.6);
      }
  }

  private drawProp(p: Prop, S: number) {
    const sp = propSprite(p.k, p.v, p.s, S);
    this.g.drawImage(sp.c, p.x - sp.ax, p.y - sp.ay, sp.w, sp.h);
  }

  private drawBox(b: { x: number; y: number; born: number; id: number; readyAt: number }, now: number, S: number) {
    const g = this.g;
    const waiting = b.readyAt > now;
    if (waiting) {
      // Opened: grey and still, with a ring that fills up until it is back.
      g.fillStyle = 'rgba(16,60,20,0.22)';
      g.beginPath(); g.ellipse(b.x, b.y + 2, 24, 8, 0, 0, 7); g.fill();
      const sp = boxSprite(S, true);
      g.globalAlpha = 0.85;
      g.drawImage(sp.c, b.x - sp.ax, b.y - 6 - sp.ay, sp.w, sp.h);
      g.globalAlpha = 1;
      const k = 1 - (b.readyAt - now) / BOX_COOLDOWN_MS;
      const cy = b.y - 92;
      g.beginPath(); g.arc(b.x, cy, 13, 0, 7); g.fillStyle = 'rgba(20,26,63,0.75)'; g.fill();
      g.beginPath(); g.arc(b.x, cy, 13, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      g.lineWidth = 4.5; g.strokeStyle = '#ffd23f'; g.lineCap = 'round'; g.stroke();
      g.fillStyle = '#fff'; g.font = '900 12px Inter, system-ui, sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.fillText(String(Math.ceil((b.readyAt - now) / 1000)), b.x, cy + 0.5);
      return;
    }
    // Ready again: a small pop when it comes back.
    const since = b.readyAt ? (now - b.readyAt) / 1000 : (now - b.born) / 1000;
    const pop = since < 0.4 ? easeBack(Math.max(0, since) / 0.4) : 1;
    const bob = Math.sin(now / 300 + b.id) * 4;
    g.fillStyle = 'rgba(16,60,20,0.25)';
    g.beginPath(); g.ellipse(b.x, b.y + 2, 26 - bob * 0.6, 9, 0, 0, 7); g.fill();
    const sp = boxSprite(S);
    g.save(); g.translate(b.x, b.y - 6 + bob); g.scale(pop, pop);
    g.drawImage(sp.c, -sp.ax, -sp.ay, sp.w, sp.h);
    g.restore();
    if (Math.random() < 0.04) this.emit(b.x + (Math.random() - 0.5) * 50, b.y - 40 - Math.random() * 30, 0, -20, 0.8, 5, '#ffe066', P_STAR);
  }

  /** Animated swirl in a portal's opening (the mound itself is part of the ground layer). */
  private drawPortal(x: number, y: number, id: number, now: number) {
    const g = this.g;
    const t = now / 1000 + id * 0.7;
    g.save();
    g.translate(x, y + 14);
    g.beginPath(); g.ellipse(0, 0, 40, 24, 0, 0, 7);
    const gr = g.createRadialGradient(0, 0, 2, 0, 0, 40);
    gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.25, '#c9a6ff'); gr.addColorStop(0.65, '#7b3cff'); gr.addColorStop(1, '#2a0f6b');
    g.fillStyle = gr; g.fill();
    g.lineWidth = 4; g.strokeStyle = '#1b1240'; g.stroke();
    g.clip();
    g.scale(1, 0.6);
    g.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      g.beginPath();
      const a0 = t * 2.4 + (i * Math.PI * 2) / 3;
      for (let k = 0; k <= 20; k++) {
        const a = a0 + k * 0.28, r = 6 + k * 1.75;
        const px = Math.cos(a) * r, py = Math.sin(a) * r;
        if (k) g.lineTo(px, py); else g.moveTo(px, py);
      }
      g.lineWidth = 4; g.strokeStyle = i === 1 ? 'rgba(100,210,255,0.85)' : 'rgba(255,255,255,0.7)'; g.stroke();
    }
    g.restore();
    // a sparkle drifting up now and then
    if (Math.random() < 0.05) this.emit(x + (Math.random() - 0.5) * 60, y + 10, 0, -40, 0.9, 5, Math.random() < 0.5 ? '#c9a6ff' : '#64d2ff', P_STAR);
  }

  private drawGem(gm: { x: number; y: number; v: number; born: number; fx: number; fy: number; id: number; take?: { idx: number; at: number } }, byIdx: Map<number, RP>, now: number, S: number) {
    const g = this.g;
    const sp = gemSprite(gm.v, S);
    let x = gm.x, y = gm.y, h = 0, sc = 1;
    const age = now - gm.born;
    if (age < 480) {
      const k = age / 480;
      x = lerp(gm.fx, gm.x, k); y = lerp(gm.fy, gm.y, k);
      h = Math.sin(k * Math.PI) * 70 + (1 - k) * 20;
    } else h = 6 + Math.sin(now / 260 + gm.id) * 4;
    if (gm.take) {
      const p = byIdx.get(gm.take.idx);
      const k = Math.min(1, (now - gm.take.at) / 360);
      if (p) { x = lerp(x, p.x, k * k); y = lerp(y, p.y - 40, k * k); }
      sc = 1 - k * 0.7;
      h = h * (1 - k);
    }
    g.fillStyle = 'rgba(16,60,20,0.25)';
    g.beginPath(); g.ellipse(x, y + 4, 10 * sc, 4 * sc, 0, 0, 7); g.fill();
    g.save(); g.translate(x, y - h); g.scale(sc * (0.85 + Math.abs(Math.sin(now / 400 + gm.id)) * 0.15), sc);
    g.drawImage(sp.c, -sp.ax, -sp.ay, sp.w, sp.h);
    g.restore();
  }

  private drawZone(kind: number, x: number, y: number, r: number, age: number, left: number) {
    const g = this.g;
    const a = Math.min(1, age * 4, left * 3);
    g.save();
    g.globalAlpha = a;
    if (kind === 0) {
      // groove: rainbow dance floor
      g.beginPath(); g.ellipse(x, y, r, r * 0.62, 0, 0, 7);
      const gr = g.createRadialGradient(x, y, 10, x, y, r);
      gr.addColorStop(0, 'rgba(63,167,214,0.10)'); gr.addColorStop(1, 'rgba(191,90,242,0.32)');
      g.fillStyle = gr; g.fill();
      g.lineWidth = 4; g.strokeStyle = `hsl(${(age * 160) % 360} 90% 65%)`; g.stroke();
      for (let i = 0; i < 6; i++) {
        const an = age * 1.4 + (i / 6) * Math.PI * 2;
        g.fillStyle = `hsl(${(i * 60 + age * 90) % 360} 90% 65%)`;
        g.font = '900 22px Inter, system-ui, sans-serif'; g.textAlign = 'center';
        g.fillText(i % 2 ? '♪' : '♫', x + Math.cos(an) * r * 0.7, y + Math.sin(an) * r * 0.43 - Math.abs(Math.sin(age * 5 + i)) * 10);
      }
    } else {
      g.beginPath();
      for (let i = 0; i <= 24; i++) {
        const an = (i / 24) * Math.PI * 2;
        const rr = r * (0.92 + Math.sin(an * 5 + age * 3) * 0.06);
        const px = x + Math.cos(an) * rr, py = y + Math.sin(an) * rr * 0.62;
        if (i) g.lineTo(px, py); else g.moveTo(px, py);
      }
      g.closePath();
      g.fillStyle = 'rgba(25,30,60,0.62)'; g.fill();
      g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
      g.fillStyle = 'rgba(120,140,255,0.35)';
      for (let i = 0; i < 5; i++) { const an = i * 1.3 + age; g.beginPath(); g.arc(x + Math.cos(an) * r * 0.5, y + Math.sin(an * 1.3) * r * 0.3, 5 + (i % 3) * 3, 0, 7); g.fill(); }
    }
    g.restore();
  }

  private drawProj(kind: number, x: number, y: number, vx: number, vy: number, age: number) {
    const g = this.g;
    const a = Math.atan2(vy, vx);
    const look = PROJ_LOOK[kind] ?? PROJ_LOOK[0];
    g.save();
    g.translate(x, y);
    // trail
    g.strokeStyle = look.color; g.globalAlpha = 0.35; g.lineWidth = look.r * 1.4; g.lineCap = 'round';
    g.beginPath(); g.moveTo(0, 0); g.lineTo(-Math.cos(a) * 26, -Math.sin(a) * 26); g.stroke();
    g.globalAlpha = 1;
    const pl = PJ_LOOK[kind];
    if (pl) {
      if (pl.spin) g.rotate((age / 1000) * pl.spin);
      else if (vx < 0) g.scale(-1, 1); // cats run facing where they go
      const sp = iconSprite(pl.ic, pl.size, this.S);
      g.drawImage(sp.c, -sp.ax, -sp.ay, sp.w, sp.h);
    } else if (kind === 2) {
      g.beginPath(); g.arc(0, 0, look.r, 0, 7); g.fillStyle = 'rgba(160,230,255,0.55)'; g.fill(); g.lineWidth = 2.5; g.strokeStyle = '#2f8fd6'; g.stroke();
      g.fillStyle = '#fff'; g.beginPath(); g.arc(-3, -3, 2.5, 0, 7); g.fill();
    } else if (kind === 3) {
      g.rotate(age / 50);
      g.fillStyle = '#ff7aa8'; g.fillRect(-11, -7, 22, 14); g.fillStyle = '#ffffff'; g.fillRect(-11, -7, 8, 14);
      g.lineWidth = 3; g.strokeStyle = INK; g.strokeRect(-11, -7, 22, 14);
    } else if (kind === 4) {
      g.rotate(a);
      g.fillStyle = 'rgba(215,255,58,0.4)'; g.beginPath(); g.ellipse(0, 0, 24, 9, 0, 0, 7); g.fill();
      g.fillStyle = '#efffa8'; g.beginPath(); g.ellipse(0, 0, 15, 4.5, 0, 0, 7); g.fill();
    } else {
      g.rotate(a);
      g.fillStyle = look.color; g.beginPath(); g.ellipse(0, 0, look.r * 1.5, look.r * 0.8, 0, 0, 7); g.fill();
      g.lineWidth = 2.5; g.strokeStyle = INK; g.stroke();
    }
    g.restore();
  }

  /* ------------------------------------------------------------- players */
  private drawPlayer(p: RP, src: RenderSource, now: number, dt: number, S: number, me: RP | null) {
    const g = this.g;
    let a = this.anim.get(p.idx);
    if (!a) { a = { lx: p.x, ly: p.y, phase: Math.random() * 6, speed: 0, face: 1, seen: now }; this.anim.set(p.idx, a); }
    const d = Math.hypot(p.x - a.lx, p.y - a.ly);
    const sp = dt > 0 ? Math.min(600, d / dt) : 0;
    a.speed = lerp(a.speed, sp, 0.25);
    a.lx = p.x; a.ly = p.y; a.seen = now;
    const moving = a.speed > 30;
    if (moving) a.phase += dt * (8 + a.speed / 40);
    // Face left/right with hysteresis (no flapping when aiming near vertical) and turn instantly:
    // a lerped flip squeezes the sprite to nothing for a few frames, which reads as a flicker.
    const c = Math.cos(p.aim);
    if (c < -0.35) a.face = -1; else if (c > 0.35) a.face = 1;

    const ps = src.vis.ps.get(p.idx);
    const alive = !!(p.flags & FLAG.alive);
    let alpha = 1;
    if (p.flags & FLAG.invis) alpha = p.me ? 0.4 : 0;
    else if (!p.me && this.map && inBush(this.map, p.x, p.y) && !(me && Math.hypot(me.x - p.x, me.y - p.y) < 120)) alpha = 0.4;
    if (p.flags & FLAG.away) alpha *= 0.35;
    if (alpha <= 0.01) return;
    let scale = 1;
    let lift = 0, spin = 0;
    // spawn pop
    if (ps && now - ps.spawnAt < 520) scale *= easeBack((now - ps.spawnAt) / 520);
    // KO spin
    if (!alive && ps) {
      const k = (now - ps.koAt) / 800;
      if (k > 1) return;
      spin = k * 10; scale *= 1 - k * 0.8; alpha *= 1 - k; lift = Math.sin(k * Math.PI) * 50;
    }
    if (p.flags & FLAG.invuln && alive && Math.floor(now / 90) % 2) alpha *= 0.55;

    const bob = moving ? Math.abs(Math.sin(a.phase)) * 5 : Math.sin(now / 450 + p.idx) * 1.2;
    const squash = moving ? 1 + Math.cos(a.phase * 2) * 0.05 : 1 + Math.sin(now / 450 + p.idx) * 0.015;
    const tilt = moving ? Math.sin(a.phase) * 0.07 : 0;

    // shadow
    g.globalAlpha = alpha;
    g.fillStyle = 'rgba(16,50,20,0.28)';
    const shs = (1 - Math.min(0.5, lift / 220)) * scale;
    g.beginPath(); g.ellipse(p.x, p.y + 2, 24 * shs, 8 * shs, 0, 0, 7); g.fill();

    // power aura
    if (ps && now - ps.powerAt < 600) {
      const k = (now - ps.powerAt) / 600;
      const pw = POWERS[CHAR_IDS[p.look]];
      g.beginPath(); g.ellipse(p.x, p.y, 30 + k * 40, (30 + k * 40) * 0.5, 0, 0, 7);
      g.lineWidth = 6 * (1 - k); g.strokeStyle = pw?.color ?? '#fff'; g.stroke();
    }
    if (p.flags & FLAG.quiz) {
      g.beginPath(); g.ellipse(p.x, p.y - 36 * scale, 40 * scale, 52 * scale, 0, 0, 7);
      g.fillStyle = 'rgba(120,200,255,0.18)'; g.fill();
      g.lineWidth = 2.5; g.strokeStyle = p.flags & FLAG.combat ? 'rgba(255,90,90,0.8)' : 'rgba(150,220,255,0.9)'; g.stroke();
    }

    const cs = charSprites(p.look, S);
    const blink = Math.floor((now / 1000 + p.idx * 0.73) % 4.1 * 10) === 0;
    const spr = blink ? cs.blink : cs.base;
    g.save();
    g.translate(p.x, p.y - bob - lift);
    if (spin) g.rotate(spin);
    g.rotate(tilt);
    g.scale(a.face * scale / squash, scale * squash);
    if (cs.ready) {
      g.drawImage(spr.c, -spr.ax, -spr.ay, spr.w, spr.h);
      const hurt = ps ? now - ps.hurtAt : 1e9;
      if (hurt < 140) { g.globalAlpha = alpha * (1 - hurt / 140); g.drawImage(cs.white.c, -spr.ax, -spr.ay, spr.w, spr.h); g.globalAlpha = alpha; }
    } else {
      const look = TEACHERS[p.look]?.look;
      g.beginPath(); g.arc(0, -40, 26, 0, 7); g.fillStyle = look?.top ?? '#888'; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
    }
    g.restore();

    // weapon in hand
    if (alive && !(p.flags & FLAG.quiz)) {
      const w = p.weapon;
      const wsp = weaponSprite(w, S);
      let ang = p.aim;
      if (ps && WEAPONS[w]?.kind === 'melee') {
        const k = (now - ps.swingAt) / 220;
        if (k < 1) ang = ps.swingAim + lerp(-1.3, 1.3, easeOut(k));
      }
      const hx = p.x + Math.cos(ang) * 18 * scale, hy = p.y - (34 + bob + lift) * scale + Math.sin(ang) * 10 * scale;
      g.save();
      g.translate(hx, hy);
      g.rotate(ang);
      if (Math.cos(ang) < 0) g.scale(scale, -scale); else g.scale(scale, scale);
      g.drawImage(wsp.c, -wsp.ax, -wsp.ay, wsp.w, wsp.h);
      g.restore();
      if (ps && WEAPONS[w]?.kind === 'melee' && now - ps.swingAt < 200) {
        const k = (now - ps.swingAt) / 200;
        g.beginPath(); g.arc(p.x, p.y - 34, 70, ps.swingAim - 1.1, ps.swingAim - 1.1 + 2.2 * k);
        g.lineWidth = 10 * (1 - k); g.strokeStyle = 'rgba(255,255,255,0.7)'; g.stroke();
      }
    }
    // effects attached to the body
    const t = now / 1000;
    if (p.flags & FLAG.barrier) {
      g.beginPath(); g.arc(p.x, p.y - 36 * scale, 50 * scale, 0, 7);
      g.fillStyle = 'rgba(160,220,255,0.18)'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = `rgba(200,240,255,${0.7 + Math.sin(t * 8) * 0.25})`; g.stroke();
    }
    if (p.flags & FLAG.hacked && Math.random() < 0.3) this.emit(p.x + (Math.random() - 0.5) * 44, p.y - 20 - Math.random() * 60, 0, -50, 0.5, 11, '#30ff7a', P_TEXT, Math.random() < 0.5 ? '0' : '1');
    if (p.flags & FLAG.speed) {
      if (moving && Math.random() < 0.5) this.emit(p.x - Math.cos(p.aim) * 10, p.y - 4, -Math.cos(p.aim) * 40, -10, 0.35, 6, 'rgba(255,255,255,0.7)', P_DUST);
    } else if (moving && Math.random() < 0.08 && this.quality > 0) this.emit(p.x, p.y, 0, -8, 0.4, 4, 'rgba(220,240,200,0.6)', P_DUST);
    if (p.flags & FLAG.regen && Math.random() < 0.08) this.emit(p.x + (Math.random() - 0.5) * 30, p.y - 30 - Math.random() * 30, 0, -30, 0.9, 12, '#30d158', P_TEXT, '+');
    if (p.flags & FLAG.genius && Math.random() < 0.05) this.emit(p.x + (Math.random() - 0.5) * 40, p.y - 70, 0, -20, 0.8, 6, '#ffd60a', P_STAR);
    g.globalAlpha = 1;
  }

  private nameTag(name: string, S: number, color: string): Sprite {
    const key = `${name}|${color}@${S}`;
    let sp = this.tags.get(key);
    if (sp) return sp;
    const font = `800 13px Inter, system-ui, sans-serif`;
    const m = document.createElement('canvas').getContext('2d')!;
    m.font = font;
    const tw = m.measureText(name).width + 10;
    const c = document.createElement('canvas');
    c.width = Math.ceil(tw * S); c.height = Math.ceil(22 * S);
    const g = c.getContext('2d')!;
    g.scale(S, S);
    g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineJoin = 'round'; g.lineWidth = 4; g.strokeStyle = 'rgba(15,25,20,0.85)';
    g.strokeText(name, tw / 2, 11);
    g.fillStyle = color; g.fillText(name, tw / 2, 11);
    sp = { c, ax: tw / 2, ay: 0, w: tw, h: 22, s: S };
    if (this.tags.size > 400) this.tags.clear();
    this.tags.set(key, sp);
    return sp;
  }

  private drawOverlay(p: RP, src: RenderSource, now: number, S: number) {
    const g = this.g;
    const alive = !!(p.flags & FLAG.alive);
    if (!alive) return;
    if (p.flags & FLAG.invis && !p.me) return;
    if (!p.me && this.map && inBush(this.map, p.x, p.y)) return;
    const h = TEACHERS[p.look]?.look.height ?? 1;
    const tag = this.nameTag((p.name || '?').toUpperCase(), S, p.me ? '#ffffff' : p.bot ? '#e6f4ea' : '#ffffff');
    g.drawImage(tag.c, p.x - tag.ax, p.y + 8, tag.w, tag.h);
    const top = p.y - 92 * h - 8;
    const ps = src.vis.ps.get(p.idx);
    // bars (others: when hurt; me: always small)
    const hurt = ps ? now - ps.hurtAt < 3000 : false;
    if (hurt || p.hp < p.maxHp || p.sh < 100) {
      const w = 46, x = p.x - w / 2;
      g.fillStyle = 'rgba(15,25,20,0.75)'; roundRect(g, x - 2, top - 2, w + 4, 11, 4); g.fill();
      g.fillStyle = p.hp / p.maxHp > 0.5 ? '#34d058' : p.hp / p.maxHp > 0.25 ? '#ffb020' : '#ff453a';
      roundRect(g, x, top, w * clamp(p.hp / p.maxHp, 0, 1), 7, 3); g.fill();
      if (p.sh > 0) { g.fillStyle = '#3aa0ff'; roundRect(g, x, top + 5, w * clamp(p.sh / 100, 0, 1), 3, 1.5); g.fill(); }
    }
    // status icons
    const t = now / 1000;
    if (p.flags & FLAG.stun) for (let i = 0; i < 3; i++) { const an = t * 5 + (i / 3) * Math.PI * 2; this.star(p.x + Math.cos(an) * 22, top - 10 + Math.sin(an) * 7, 6, '#ffd60a'); }
    if (p.flags & FLAG.confuse) this.label(p.x, top - 14 + Math.sin(t * 6) * 3, '?', '#64d2ff', 22);
    if (p.flags & FLAG.charm) this.icon('heart', p.x + Math.sin(t * 4) * 10, top - 14, 20);
    if (p.flags & FLAG.root) {
      g.beginPath(); g.ellipse(p.x, p.y, 30, 11, 0, 0, 7); g.lineWidth = 5; g.strokeStyle = '#ff9f0a'; g.setLineDash([8, 6]); g.stroke(); g.setLineDash([]);
      this.label(p.x, top - 14, tr('DETENTION', 'DETENCIÓN'), '#ff9f0a', 11);
    }
    if (p.flags & FLAG.hacked) this.label(p.x, top - 14, tr('HACKED', 'HACKEADO'), '#30ff7a', 11);
    if (p.flags & FLAG.quiz) {
      const by = top - 16 + Math.sin(t * 3) * 2;
      this.icon('book', p.x - (p.flags & FLAG.combat ? 12 : 0), by, 24);
      if (p.flags & FLAG.combat) this.icon('swords', p.x + 14, by, 22);
    } else if (p.flags & FLAG.tired) this.icon('batteryLow', p.x, top - 16 + Math.sin(t * 2.5) * 3, 26);
    const say = this.says.find((x) => x.idx === p.idx);
    if (say) this.speech(p.x, top - 34, say.text, (now - say.born) / 1700);
    if (p.flags & FLAG.magnet && Math.random() < 0.1) this.emit(p.x + (Math.random() - 0.5) * 300, p.y + (Math.random() - 0.5) * 200, 0, 0, 0.5, 3, 'rgba(255,90,90,0.5)', P_DUST);
  }

  private icon(k: IconKey, x: number, y: number, size: number) {
    const sp = iconSprite(k, size, this.S);
    this.g.drawImage(sp.c, x - sp.ax, y - sp.ay, sp.w, sp.h);
  }

  /** Comic speech bubble (Sander's greeting); k = 0…1 of its life. */
  private speech(x: number, y: number, text: string, k: number) {
    if (k >= 1) { this.says = this.says.filter((s) => (performance.now() - s.born) / 1700 < 1); return; }
    const g = this.g;
    const sc = k < 0.12 ? easeBack(k / 0.12) : 1;
    g.save(); g.translate(x, y); g.scale(sc, sc);
    g.globalAlpha = k > 0.85 ? (1 - k) / 0.15 : 1;
    g.font = '900 17px Inter, system-ui, sans-serif';
    const w = g.measureText(text).width + 24, h = 34;
    roundRect(g, -w / 2, -h, w, h, 14);
    g.moveTo(-8, 0); g.lineTo(0, 12); g.lineTo(8, 0);
    g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.stroke();
    g.fillStyle = '#1b2350'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText(text, 0, -h / 2);
    g.restore();
  }

  private label(x: number, y: number, text: string, color: string, size: number) {
    const g = this.g;
    g.font = `900 ${size}px Inter, system-ui, sans-serif`;
    g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 4; g.strokeStyle = 'rgba(15,25,20,0.9)'; g.lineJoin = 'round';
    g.strokeText(text, x, y);
    g.fillStyle = color; g.fillText(text, x, y);
  }

  private star(x: number, y: number, r: number, color: string, rot = 0) {
    const g = this.g;
    g.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + (i / 10) * Math.PI * 2 - Math.PI / 2;
      const rr = i % 2 ? r * 0.45 : r;
      if (i) g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); else g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    g.closePath();
    g.fillStyle = color; g.fill(); g.lineWidth = 1.5; g.strokeStyle = INK; g.stroke();
  }

  /* ----------------------------------------------------------- particles */
  emit(x: number, y: number, vx: number, vy: number, life: number, size: number, color: string, kind: number, text?: string, g = 0) {
    if (this.parts.length >= QUAL[this.quality].particles) return;
    this.parts.push({ x, y, vx, vy, life, max: life, size, color, kind, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10, g, drag: kind === P_DUST ? 2.5 : 1.2, text });
  }
  burst(x: number, y: number, n: number, color: string | string[], kind: number, speed = 200, life = 0.6, size = 6, g = 0) {
    const m = this.quality === 0 ? Math.ceil(n / 2) : n;
    for (let i = 0; i < m; i++) {
      const a = Math.random() * Math.PI * 2, s = speed * (0.4 + Math.random() * 0.8);
      const c = Array.isArray(color) ? color[i % color.length] : color;
      this.emit(x, y, Math.cos(a) * s, Math.sin(a) * s * 0.7, life * (0.7 + Math.random() * 0.6), size * (0.6 + Math.random() * 0.8), c, kind, undefined, g);
    }
  }
  private ring(x: number, y: number, r: number, color: string, life = 0.4) { this.emit(x, y, 0, 0, life, r, color, P_RING); }

  private drawParticles(dt: number) {
    const g = this.g;
    const arr = this.parts;
    for (let i = arr.length - 1; i >= 0; i--) {
      const p = arr[i];
      p.life -= dt;
      if (p.life <= 0) { arr[i] = arr[arr.length - 1]; arr.pop(); continue; }
      const k = p.life / p.max;
      p.vx *= Math.exp(-dt * p.drag);
      p.vy = p.vy * Math.exp(-dt * p.drag) + p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      g.globalAlpha = Math.min(1, k * 1.6);
      switch (p.kind) {
        case P_DUST: g.fillStyle = p.color; g.beginPath(); g.arc(p.x, p.y, p.size * (1.6 - k * 0.6), 0, 7); g.fill(); break;
        case P_SPARK: g.strokeStyle = p.color; g.lineWidth = p.size * 0.5; g.lineCap = 'round'; g.beginPath(); g.moveTo(p.x, p.y); g.lineTo(p.x - p.vx * 0.04, p.y - p.vy * 0.04); g.stroke(); break;
        case P_STAR: this.star(p.x, p.y, p.size * (0.5 + k * 0.5), p.color, p.rot); break;
        case P_CONF: g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.color; g.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2); g.restore(); break;
        case P_RING: g.beginPath(); g.ellipse(p.x, p.y, p.size * (1 - k), p.size * (1 - k) * 0.62, 0, 0, 7); g.lineWidth = 6 * k + 1; g.strokeStyle = p.color; g.stroke(); break;
        case P_TEXT: g.font = `900 ${p.size}px Inter, system-ui, sans-serif`; g.textAlign = 'center'; g.fillStyle = p.color; g.fillText(p.text ?? '', p.x, p.y); break;
        case P_SHARD: g.save(); g.translate(p.x, p.y); g.rotate(p.rot); g.fillStyle = p.color; g.beginPath(); g.moveTo(0, -p.size); g.lineTo(p.size * 0.6, 0); g.lineTo(0, p.size); g.lineTo(-p.size * 0.6, 0); g.closePath(); g.fill(); g.restore(); break;
      }
    }
    g.globalAlpha = 1;
  }

  popup(idx: number, x: number, y: number, text: string, color: string, size = 20, life = 1100, ic?: IconKey) {
    this.pops.push({ idx, x, y, text, color, size, born: performance.now(), life, dy: 0, ic });
    if (this.pops.length > 40) this.pops.shift();
  }

  private drawPopups(now: number, byIdx: Map<number, RP>) {
    const g = this.g;
    this.pops = this.pops.filter((p) => now - p.born < p.life);
    for (const p of this.pops) {
      const k = (now - p.born) / p.life;
      const pl = p.idx >= 0 ? byIdx.get(p.idx) : null;
      const x = pl ? pl.x : p.x, y = (pl ? pl.y - 96 : p.y) - easeOut(Math.min(1, k * 1.4)) * 46;
      const sc = k < 0.15 ? easeBack(k / 0.15) : 1;
      g.globalAlpha = k > 0.75 ? (1 - k) / 0.25 : 1;
      g.save(); g.translate(x, y); g.scale(sc, sc);
      g.font = `900 ${p.size}px Inter, system-ui, sans-serif`;
      g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      const tx = p.ic ? -(p.size * 0.62) : 0;
      g.lineWidth = 5; g.strokeStyle = 'rgba(15,25,20,0.92)'; g.strokeText(p.text, tx, 0);
      g.fillStyle = p.color; g.fillText(p.text, tx, 0);
      if (p.ic) {
        const sp = iconSprite(p.ic, Math.round(p.size * 1.15), this.S);
        g.drawImage(sp.c, tx + g.measureText(p.text).width / 2 + 4, -sp.ay, sp.w, sp.h);
      }
      g.restore();
    }
    g.globalAlpha = 1;
  }

  /* -------------------------------------------------------------- events */
  private processFx(src: RenderSource, byIdx: Map<number, RP>, me: RP | null) {
    const fx = src.vis.fx;
    if (!fx.length) return;
    src.vis.fx = [];
    const near = (x: number, y: number) => {
      const d = Math.hypot(x - this.cam.x, y - this.cam.y);
      return d < 1100 ? clamp(1.2 - d / 1000, 0.15, 1) : 0;
    };
    for (const f of fx) {
      this.onFx?.(f, me);
      switch (f.t) {
        case 'dmg': {
          const p = byIdx.get(f.idx);
          if (!p) break;
          this.popup(-1, p.x + (Math.random() - 0.5) * 20, p.y - 90, `-${f.v}`, f.shield ? '#7cc4ff' : '#ff5b5b', 18 + Math.min(10, f.v / 4), 800);
          this.burst(p.x, p.y - 40, 6, f.shield ? ['#9fd4ff', '#ffffff'] : ['#ffffff', '#ffd2d2'], P_SPARK, 260, 0.3, 6);
          if (p.me) { this.shake(0.28 + f.v / 120); this.hurtFlash = Math.min(1, this.hurtFlash + 0.5); sfx.hurt(); }
          else { const v = near(p.x, p.y); if (v) sfx.hit(v); }
          break;
        }
        case 'ko': {
          const p = byIdx.get(f.idx) ?? this.lastPos.get(f.idx);
          if (!p) break;
          this.burst(p.x, p.y - 40, 16, ['#ffd60a', '#ffffff', '#ff9f0a'], P_STAR, 300, 0.8, 9);
          this.burst(p.x, p.y - 20, 10, 'rgba(255,255,255,0.8)', P_DUST, 140, 0.6, 12);
          this.popup(-1, p.x, p.y - 110, 'K.O.!', '#ffd60a', 30, 1300);
          if (p.me) { this.shake(0.8); sfx.koMe(); }
          else { const v = near(p.x, p.y); if (v) { sfx.ko(); this.shake(0.2 * v); } }
          if (me && f.killer === me.idx && f.idx !== me.idx) this.popup(me.idx, 0, 0, tr('KNOCKED OUT!', '¡NOQUEADO!'), '#ffd60a', 24, 1300);
          break;
        }
        case 'box': {
          const mine = !!me && f.idx === me.idx;
          const o = DIA_OUTCOMES[f.out] ?? DIA_OUTCOMES[0];
          this.burst(f.x, f.y - 30, 22, ['#ffd23f', '#8f6bff', '#ff5ce1', '#30d158', '#64d2ff'], P_CONF, 320, 1.0, 10, 380);
          this.ring(f.x, f.y, 90, o.kind === 'cut' ? '#ff5b5b' : '#ffd23f', 0.45);
          if (f.dia > 0) this.burst(f.x, f.y - 40, Math.min(18, 4 + Math.round(Math.sqrt(f.dia))), ['#2fd3e8', '#c9f7ff', '#ffffff'], P_SHARD, 260, 0.7, 7, 260);
          // the outcome over the box (+500, ×2, −50%) and the real change over the player
          this.popup(-1, f.x, f.y - 74, outcomeLabel(o), outcomeColor(o), o.kind === 'add' && o.v < 50 ? 17 : 24, 1400, 'gem');
          if (f.dia) this.popup(f.idx, 0, 0, `${f.dia > 0 ? '+' : '−'}${num(Math.abs(f.dia))}`, f.dia > 0 ? '#7ef0ff' : '#ff5b5b', mine ? 24 : 17, 1300, 'gem');
          if (mine) {
            if (o.kind === 'cut') { sfx.trap(); this.shake(0.5); }
            else { sfx.box(); if (f.dia > 0) sfx.gem(Math.min(12, Math.round(Math.sqrt(f.dia)))); if (o.kind === 'mul' || o.v >= 500) this.shake(0.35); }
          } else if (near(f.x, f.y)) sfx.box();
          break;
        }
        case 'gem': {
          if (me && f.idx === me.idx) { sfx.gem(Math.min(10, f.v)); this.popup(-1, me.x + (Math.random() - 0.5) * 30, me.y - 100, `+${f.v}`, gemTier(f.v).hi, 18, 700); }
          this.burst(f.x, f.y, 4, gemTier(f.v).color, P_SHARD, 120, 0.4, 5);
          break;
        }
        case 'boom': {
          const col = f.kind === 'glitter' ? ['#ff5ce1', '#ffd23f', '#64d2ff', '#ffffff'] : f.kind === 'bulb' ? ['#ffd60a', '#fff3a0', '#ffffff'] : f.kind === 'land' ? ['#e3bb82', '#ffffff'] : f.kind === 'trap' ? ['#ff453a', '#ffb020'] : ['#ff7aa8', '#ffffff', '#ffd2e3'];
          this.ring(f.x, f.y, f.r * 1.2, col[0], 0.45);
          this.burst(f.x, f.y - 10, f.kind === 'land' ? 14 : 24, col, f.kind === 'glitter' ? P_CONF : P_SPARK, f.r * 4, 0.6, 8, f.kind === 'glitter' ? 300 : 0);
          this.burst(f.x, f.y - 10, 8, 'rgba(255,255,255,0.6)', P_DUST, f.r * 1.5, 0.5, 16);
          if (f.kind === 'bulb') this.lasers.push({ x1: f.x, y1: f.y - 700, x2: f.x, y2: f.y, born: performance.now() });
          const v = near(f.x, f.y);
          if (v) { sfx.boom(v); this.shake(0.4 * v); }
          break;
        }
        case 'hit': this.burst(f.x, f.y, 5, (PROJ_LOOK[f.kind] ?? PROJ_LOOK[0]).color, P_DUST, 100, 0.3, 5); break;
        case 'ans': {
          const p = byIdx.get(f.idx);
          if (p && f.gain > 0) {
            this.popup(f.idx, 0, 0, `+${f.gain}`, '#ffe14d', p.me ? 22 : 17, 1200, 'bolt');
            if (Math.random() < 0.6) this.burst(p.x, p.y - 60, 5, ['#ffe14d', '#ffffff'], P_SPARK, 120, 0.5, 5);
          }
          break;
        }
        case 'tired': {
          const p = byIdx.get(f.idx);
          if (p) this.popup(f.idx, 0, 0, tr('Out of energy!', '¡Sin energía!'), '#ff9f0a', p.me ? 22 : 15, 1500);
          if (p?.me) this.shake(0.25);
          break;
        }
        case 'buy': { const p = byIdx.get(f.idx); if (p) { this.popup(f.idx, 0, 0, tr('Upgrade', 'Mejora'), '#ffd60a', 17, 1000, UPGRADES[f.up]?.ic ?? 'arrowUp'); if (p.me) sfx.buy(); } break; }
        case 'tp': {
          const p = byIdx.get(f.idx);
          const col = f.kind === 'shadow' ? 'rgba(40,20,60,0.75)' : f.kind === 'swap' ? '#bf5af2' : f.kind === 'rewind' ? '#64d2ff' : f.kind === 'burrow' ? '#9a5cff' : 'rgba(255,255,255,0.85)';
          if (f.kind === 'fix' || f.kind === 'hold') break;
          if (f.kind !== 'spawn') this.burst(f.fx, f.fy - 20, 12, col, P_DUST, 160, 0.5, 12);
          this.burst(f.x, f.y - 20, 12, col, f.kind === 'swap' || f.kind === 'rewind' ? P_STAR : P_DUST, 180, 0.5, 10);
          this.ring(f.x, f.y, 70, typeof col === 'string' ? col : '#fff', 0.4);
          if (f.kind === 'dash' || f.kind === 'shadow') {
            for (let i = 0; i < 6; i++) { const k = i / 6; this.emit(lerp(f.fx, f.x, k), lerp(f.fy, f.y, k) - 30, 0, 0, 0.35 + k * 0.2, 16, col, P_DUST); }
          }
          if (p?.me) {
            if (f.kind === 'spawn') { sfx.spawn(); this.snapTo(f.x, f.y - 30); }
            else if (f.kind === 'burrow') { sfx.teleport(); this.snapTo(f.x, f.y - 30); }
            else sfx.teleport();
          } else if (near(f.x, f.y) && f.kind !== 'spawn') sfx.teleport();
          break;
        }
        case 'power': {
          const p = byIdx.get(f.idx);
          if (!p) break;
          const pw = POWERS[CHAR_IDS[f.ci]];
          this.burst(p.x, p.y - 40, 12, [pw?.color ?? '#fff', '#ffffff'], P_STAR, 220, 0.6, 8);
          if (CHAR_IDS[f.ci] !== 'sander' && pw) this.popup(f.idx, 0, 0, tx(pw.name), '#ffffff', 15, 1100, pw.ic);
          if (CHAR_IDS[f.ci] === 'sander') { this.says.push({ idx: f.idx, text: 'Hello, my dears!', born: performance.now() }); this.shake(p.me ? 0.3 : 0); }
          const v = p.me ? 1 : near(p.x, p.y);
          if (v && !sfx.special(CHAR_IDS[f.ci])) sfx.power(f.ci);
          break;
        }
        case 'wave': this.waves.push({ x: f.x, y: f.y, r: f.r, kind: f.kind, born: performance.now() }); if (f.kind === 0) this.burst(f.x, f.y - 40, 10, '#ff7ab6', P_TEXT, 160, 0.9, 18); break;
        case 'cone': {
          const p = byIdx.get(f.idx);
          this.cones.push({ idx: f.idx, aim: f.aim, r: f.r, kind: f.kind, born: performance.now(), x: p?.x ?? 0, y: p?.y ?? 0 });
          if (p && f.kind === 1) this.popup(-1, p.x + Math.cos(f.aim) * 120, p.y - 60 + Math.sin(f.aim) * 80, 'Oh là là!', '#ffffff', 22, 900);
          if (p && f.kind === 3) this.burst(p.x + Math.cos(f.aim) * 70, p.y - 40 + Math.sin(f.aim) * 50, 8, ['#ffd23f', '#ffffff', '#ff8c3c'], P_TEXT, 200, 0.9, 18);
          break;
        }
        case 'laser': this.lasers.push({ ...f, born: performance.now() }); this.burst(f.x2, f.y2, 8, '#ff3b30', P_SPARK, 200, 0.4, 6); break;
        case 'grenade': this.arcs.push({ ...f, born: performance.now() }); break;
        case 'shoot': {
          const p = byIdx.get(f.idx);
          if (!p) break;
          const v = p.me ? 1 : near(p.x, p.y) * 0.6;
          if (v) sfx.shoot(f.kind, v);
          if (WEAPONS[f.kind]?.kind !== 'melee') this.emit(p.x + Math.cos(p.aim) * 44, p.y - 30 + Math.sin(p.aim) * 30, 0, 0, 0.15, 8, 'rgba(255,255,255,0.8)', P_DUST);
          if (p.me && WEAPONS[f.kind]?.kind === 'explosive') this.shake(0.12);
          break;
        }
        case 'status': {
          const p = byIdx.get(f.idx);
          const st = STATUS_TEXT[f.s];
          if (p && st) { this.popup(f.idx, 0, 0, tx(st[0]), st[1], 16, 1000); if (p.me || near(p.x, p.y)) sfx.status(); }
          break;
        }
        case 'block': { const p = byIdx.get(f.idx); if (p) { this.ring(p.x, p.y - 36, 60, '#bfe6ff', 0.3); if (p.me || near(p.x, p.y)) sfx.block(); } break; }
        case 'costume': { const p = byIdx.get(f.idx); if (p && f.ci >= 0) this.burst(p.x, p.y - 40, 18, ['#30d158', '#ffffff', '#ffd23f'], P_CONF, 240, 0.8, 9, 300); break; }
        case 'weapon': break;
      }
    }
    for (const p of byIdx.values()) this.lastPos.set(p.idx, p);
  }

  /* ------------------------------------------------------------- quality */
  private adapt(ms: number, dt: number) {
    this.workMs = lerp(this.workMs, ms, 0.05);
    this.frameMs = lerp(this.frameMs, dt * 1000, 0.05);
    this.fps = Math.round(1000 / Math.max(1, this.frameMs));
    this.ft.push(dt * 1000);
    if (this.ft.length > 90) this.ft.shift();
    const now = performance.now();
    if (now - this.qualAt < 2500 || this.ft.length < 90) return;
    const avg = this.ft.reduce((s, x) => s + x, 0) / this.ft.length;
    if (avg > 25 && this.quality > 0) { this.quality--; this.qualAt = now; this.ft = []; this.resize(); }
    else if (avg < 14 && ms < 6 && this.quality < this.maxQuality && now - this.qualAt > 12000) { this.quality++; this.qualAt = now; this.ft = []; this.resize(); }
  }

  /* ------------------------------------------------------------- minimap */
  private miniBg: HTMLCanvasElement | null = null;
  drawMinimap(c: HTMLCanvasElement, src: RenderSource) {
    const map = src.map;
    const W = c.width, H = c.height;
    const g = c.getContext('2d')!;
    const sx = W / WORLD_W, sy = H / WORLD_H;
    if (!this.miniBg || this.miniBg.width !== W) {
      const b = document.createElement('canvas');
      b.width = W; b.height = H;
      const bg = b.getContext('2d')!;
      bg.fillStyle = '#3fae47'; bg.fillRect(0, 0, W, H);
      for (const p of map.paths) { bg.beginPath(); p.pts.forEach(([x, y], i) => (i ? bg.lineTo(x * sx, y * sy) : bg.moveTo(x * sx, y * sy))); bg.lineWidth = Math.max(2, p.w * sx); bg.strokeStyle = '#e3bb82'; bg.lineCap = 'round'; bg.stroke(); }
      for (const pd of map.ponds) { bg.beginPath(); bg.ellipse(pd.x * sx, pd.y * sy, pd.rx * sx, pd.ry * sy, 0, 0, 7); bg.fillStyle = '#3db3e8'; bg.fill(); }
      for (const p of map.props) if (p.k === 'tree' || p.k === 'pine') { bg.beginPath(); bg.arc(p.x * sx, p.y * sy, Math.max(1.5, 30 * sx), 0, 7); bg.fillStyle = '#2b7a32'; bg.fill(); }
      for (const bu of map.burrows) { bg.beginPath(); bg.arc(bu.x * sx, bu.y * sy, Math.max(3, 40 * sx), 0, 7); bg.fillStyle = '#9a5cff'; bg.fill(); bg.lineWidth = 1.5; bg.strokeStyle = '#ffffff'; bg.stroke(); }
      bg.strokeStyle = '#1d2a1f'; bg.lineWidth = 3; bg.strokeRect(0, 0, W, H);
      this.miniBg = b;
    }
    g.drawImage(this.miniBg, 0, 0);
    const tNow = performance.now();
    for (const b of src.vis.boxes.values()) { g.fillStyle = b.readyAt > tNow ? 'rgba(200,204,214,0.55)' : '#ffd23f'; g.fillRect(b.x * sx - 2, b.y * sy - 2, 4, 4); }
    let me: RP | null = null;
    for (const p of src.players()) {
      if (p.me) { me = p; continue; }
      if (!(p.flags & FLAG.alive) || p.flags & FLAG.invis) continue;
      g.beginPath(); g.arc(p.x * sx, p.y * sy, 2.6, 0, 7); g.fillStyle = TEACHERS[p.look]?.look.top ?? '#fff'; g.fill();
      g.lineWidth = 1; g.strokeStyle = '#1d2a1f'; g.stroke();
    }
    if (me) {
      g.beginPath(); g.arc(me.x * sx, me.y * sy, 4.5, 0, 7); g.fillStyle = '#ffffff'; g.fill(); g.lineWidth = 2; g.strokeStyle = '#1d2a1f'; g.stroke();
    }
    // camera rect
    const hw = this.w / 2 / this.cam.z, hh = this.h / 2 / this.cam.z;
    g.strokeStyle = 'rgba(255,255,255,0.7)'; g.lineWidth = 1.5;
    g.strokeRect((this.cam.x - hw) * sx, (this.cam.y - hh) * sy, hw * 2 * sx, hh * 2 * sy);
  }
}

const CONE_HALF = [0.62, 0.7, 0.75, 1.1];

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
}
const easeOut = (k: number) => 1 - (1 - k) ** 3;
function easeBack(k: number) { const c = 1.70158, c3 = c + 1; return 1 + c3 * (k - 1) ** 3 + c * (k - 1) ** 2; }
