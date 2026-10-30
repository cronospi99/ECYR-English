/* Class Wars — the visual copy of the world that every screen keeps (players' phones and the
   projector). It is fed by the host's events: boxes, gems, projectiles, zones and one-shot
   effects. The renderer drains `fx` every frame for particles, popups, shakes and sounds. */
import { WEAPONS, PJ } from './defs';
import { BOX_COOLDOWN_MS, byteToAim } from './constants';
import { hitsWall, type GameMap } from './map';
import type { Ev } from './sim';

/** readyAt > now: somebody opened it and it is grey until then. */
export interface VBox { id: number; x: number; y: number; born: number; readyAt: number }
export interface VGem { id: number; x: number; y: number; v: number; born: number; fx: number; fy: number; take?: { idx: number; at: number } }
export interface VProj { id: number; kind: number; x: number; y: number; vx: number; vy: number; range: number; dist: number; owner: number; born: number; local?: boolean }
export interface VZone { id: number; kind: number; x: number; y: number; r: number; born: number; until: number; owner: number }
export interface VTele { x: number; y: number; r: number; at: number; born: number; kind: number }
export interface PState { hurtAt: number; koAt: number; swingAt: number; swingAim: number; powerAt: number; spawnAt: number; leap?: { fx: number; fy: number; tx: number; ty: number; at: number }; blockAt: number; statusAt: number; status: string }

export type Fxq =
  | { t: 'dmg'; idx: number; v: number; shield: boolean }
  | { t: 'ko'; idx: number; killer: number; lost: number }
  | { t: 'box'; idx: number; x: number; y: number; eff: number; param: number; dia: number }
  | { t: 'tired'; idx: number }
  | { t: 'gem'; idx: number; v: number; x: number; y: number }
  | { t: 'boom'; x: number; y: number; r: number; kind: string }
  | { t: 'hit'; x: number; y: number; kind: number }
  | { t: 'ans'; idx: number; gain: number; streak: number }
  | { t: 'buy'; idx: number; up: number; lvl: number }
  | { t: 'tp'; idx: number; kind: string; x: number; y: number; fx: number; fy: number }
  | { t: 'power'; idx: number; ci: number }
  | { t: 'wave'; x: number; y: number; r: number; kind: number }
  | { t: 'cone'; idx: number; aim: number; r: number; kind: number }
  | { t: 'laser'; x1: number; y1: number; x2: number; y2: number }
  | { t: 'grenade'; x1: number; y1: number; x2: number; y2: number }
  | { t: 'decoy'; x: number; y: number }
  | { t: 'shoot'; idx: number; kind: number }
  | { t: 'status'; idx: number; s: string }
  | { t: 'block'; idx: number }
  | { t: 'costume'; idx: number; ci: number }
  | { t: 'weapon'; idx: number; w: number };

export class VisualWorld {
  map: GameMap;
  boxes = new Map<number, VBox>();
  gems = new Map<number, VGem>();
  projs = new Map<number, VProj>();
  zones: VZone[] = [];
  teles: VTele[] = [];
  ps = new Map<number, PState>();
  fx: Fxq[] = [];
  feed: { at: number; text: string; color: string }[] = [];
  myIdx = -1;
  /** Names for the feed. */
  nameOf: (idx: number) => string = (i) => `#${i}`;
  private localSeq = 0;

  constructor(map: GameMap) { this.map = map; }

  st(idx: number): PState {
    let s = this.ps.get(idx);
    if (!s) { s = { hurtAt: -1e9, koAt: -1e9, swingAt: -1e9, swingAim: 0, powerAt: -1e9, spawnAt: -1e9, blockAt: -1e9, statusAt: -1e9, status: '' }; this.ps.set(idx, s); }
    return s;
  }

  pushFeed(text: string, color = '#fff') {
    this.feed.unshift({ at: performance.now(), text, color });
    if (this.feed.length > 6) this.feed.length = 6;
  }

  loadFull(f: { boxes: number[][]; gems: number[][]; zones: number[][] }) {
    const now = performance.now();
    this.boxes.clear();
    this.gems.clear();
    for (const [id, x, y, left] of f.boxes) this.boxes.set(id, { id, x, y, born: now - 2000, readyAt: left ? now + left : 0 });
    for (const [id, x, y, v] of f.gems) this.gems.set(id, { id, x, y, v, born: now - 2000, fx: x, fy: y });
    this.zones = f.zones.map(([id, kind, x, y, r, left, owner]) => ({ id, kind, x, y, r, born: now, until: now + left, owner }));
  }

  /** Cosmetic projectile for our own shot, shown before the host confirms it. */
  localShot(kind: number, x: number, y: number, aim: number, owner: number) {
    const w = WEAPONS[kind];
    if (!w || w.kind === 'melee' || w.kind === 'grenade') return;
    const angles = w.kind === 'spread' ? [-0.22, 0, 0.22] : [0];
    for (const off of angles) {
      const id = -(++this.localSeq);
      this.projs.set(id, { id, kind, x, y, vx: Math.cos(aim + off) * w.speed, vy: Math.sin(aim + off) * w.speed, range: w.range, dist: 0, owner, born: performance.now(), local: true });
    }
  }

  apply(events: Ev[]) {
    const now = performance.now();
    for (const e of events) {
      const k = e[0] as string;
      const n = (i: number) => e[i] as number;
      switch (k) {
        case 'pj': {
          const owner = n(6);
          if (owner === this.myIdx && n(2) < 20) {
            // replace our cosmetic copy (closest local projectile of that kind)
            let best: VProj | null = null;
            for (const p of this.projs.values()) if (p.local && p.kind === n(2) && (!best || p.born < best.born)) best = p;
            if (best) { this.projs.delete(best.id); }
          }
          const a = byteToAim(n(5));
          const sp = n(7);
          this.projs.set(n(1), { id: n(1), kind: n(2), x: n(3), y: n(4), vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, range: n(8), dist: 0, owner, born: now });
          if (owner !== this.myIdx) this.fx.push({ t: 'shoot', idx: owner, kind: n(2) });
          break;
        }
        case 'ph': {
          const p = this.projs.get(n(1));
          this.projs.delete(n(1));
          this.fx.push({ t: 'hit', x: n(2), y: n(3), kind: p?.kind ?? 0 });
          break;
        }
        case 'rf': {
          const p = this.projs.get(n(1));
          if (p) {
            const a = byteToAim(n(5)), sp = Math.hypot(p.vx, p.vy);
            p.x = n(3); p.y = n(4); p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp; p.dist = 0; p.owner = n(2);
          }
          this.fx.push({ t: 'block', idx: n(2) });
          break;
        }
        case 'sw': { const s = this.st(n(1)); s.swingAt = now; s.swingAim = byteToAim(n(2)); this.fx.push({ t: 'shoot', idx: n(1), kind: 1 }); break; }
        case 'gr': this.fx.push({ t: 'grenade', x1: n(2), y1: n(3), x2: n(4), y2: n(5) }); this.teles.push({ x: n(4), y: n(5), r: WEAPONS[6].radius, at: now + 700, born: now, kind: 1 }); break;
        case 'ex': this.fx.push({ t: 'boom', x: n(1), y: n(2), r: n(3), kind: e[4] as string }); break;
        case 'tg': this.teles.push({ x: n(1), y: n(2), r: n(3), at: now + n(4), born: now, kind: n(5) }); break;
        case 'kb': break;
        case 'dm': this.st(n(1)).hurtAt = now; this.fx.push({ t: 'dmg', idx: n(1), v: n(2), shield: n(4) === 1 }); break;
        case 'bk': this.st(n(1)).blockAt = now; this.fx.push({ t: 'block', idx: n(1) }); break;
        case 'ko': {
          this.st(n(1)).koAt = now;
          this.fx.push({ t: 'ko', idx: n(1), killer: n(2), lost: n(3) });
          const killer = n(2);
          this.pushFeed(killer >= 0 && killer !== n(1) ? `${this.nameOf(killer)} noqueó a ${this.nameOf(n(1))}` : `${this.nameOf(n(1))} quedó fuera de combate`, killer === this.myIdx ? '#ffd60a' : n(1) === this.myIdx ? '#ff6b6b' : '#fff');
          break;
        }
        case 'tp': {
          const s = this.st(n(1));
          const kind = e[5] as string;
          if (kind === 'spawn') s.spawnAt = now;
          if (kind === 'leap') s.leap = { fx: n(6), fy: n(7), tx: n(2), ty: n(3), at: now };
          this.fx.push({ t: 'tp', idx: n(1), kind, x: n(2), y: n(3), fx: n(6), fy: n(7) });
          break;
        }
        case 'gm': this.gems.set(n(1), { id: n(1), x: n(2), y: n(3), v: n(4), born: now, fx: n(5), fy: n(6) }); break;
        case 'gc': {
          const g = this.gems.get(n(1));
          if (g) g.take = { idx: n(2), at: now };
          this.fx.push({ t: 'gem', idx: n(2), v: n(3), x: g?.x ?? 0, y: g?.y ?? 0 });
          break;
        }
        case 'bx': this.boxes.set(n(1), { id: n(1), x: n(2), y: n(3), born: now, readyAt: 0 }); break;
        case 'bo': {
          const b = this.boxes.get(n(1));
          if (b) b.readyAt = now + BOX_COOLDOWN_MS;
          this.fx.push({ t: 'box', idx: n(2), x: b?.x ?? 0, y: b?.y ?? 0, eff: n(3), param: n(4), dia: n(5) || 0 });
          break;
        }
        case 'ne': this.fx.push({ t: 'tired', idx: n(1) }); break;
        case 'zn': this.zones.push({ id: n(1), kind: n(2), x: n(3), y: n(4), r: n(5), born: now, until: now + n(6), owner: n(7) }); break;
        case 'dp': this.fx.push({ t: 'decoy', x: n(2), y: n(3) }); break;
        case 'st': { const s = this.st(n(1)); s.statusAt = now; s.status = e[2] as string; this.fx.push({ t: 'status', idx: n(1), s: e[2] as string }); break; }
        case 'rv': break;
        case 'cs': this.fx.push({ t: 'costume', idx: n(1), ci: n(2) }); break;
        case 'wp': this.fx.push({ t: 'weapon', idx: n(1), w: n(2) }); break;
        case 'pw': this.st(n(1)).powerAt = now; this.fx.push({ t: 'power', idx: n(1), ci: n(2) }); break;
        case 'wave': this.fx.push({ t: 'wave', x: n(1), y: n(2), r: n(3), kind: n(4) }); break;
        case 'cone': this.fx.push({ t: 'cone', idx: n(1), aim: byteToAim(n(2)), r: n(3), kind: n(4) }); break;
        case 'lz': this.fx.push({ t: 'laser', x1: n(1), y1: n(2), x2: n(3), y2: n(4) }); break;
        case 'an': this.fx.push({ t: 'ans', idx: n(1), gain: n(2), streak: n(3) }); break;
        case 'by': this.fx.push({ t: 'buy', idx: n(1), up: n(2), lvl: n(3) }); break;
      }
    }
  }

  /** Advance cosmetic things (projectiles fly locally between events). */
  update(dt: number) {
    const now = performance.now();
    for (const p of this.projs.values()) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.dist += Math.hypot(p.vx, p.vy) * dt;
      const pierce = p.kind === 4;
      if (p.dist > p.range + 40 || (!pierce && hitsWall(this.map, p.x, p.y + 18, 4) && now - p.born > 30) || now - p.born > 2500) {
        this.projs.delete(p.id);
        if (p.local) this.fx.push({ t: 'hit', x: p.x, y: p.y, kind: p.kind });
      }
    }
    for (const g of this.gems.values()) if (g.take && now - g.take.at > 380) this.gems.delete(g.id);
    if (this.zones.length) this.zones = this.zones.filter((z) => z.until > now);
    if (this.teles.length) this.teles = this.teles.filter((t) => t.at > now - 50);
  }
}

export const PROJ_LOOK: Record<number, { color: string; r: number }> = {
  0: { color: '#ffffff', r: 6 },
  2: { color: '#7fdcff', r: 9 },
  3: { color: '#ff7aa8', r: 10 },
  4: { color: '#d7ff3a', r: 7 },
  5: { color: '#cfd8dc', r: 5 },
  [PJ.book]: { color: '#3a5bc7', r: 11 },
  [PJ.clipboard]: { color: '#a8774a', r: 12 },
};
