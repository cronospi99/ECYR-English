/* Class Wars — host-authoritative simulation. Runs only in the teacher's (host's) browser at a
   fixed 30 Hz step. Clients send input + their predicted position; the host validates moves,
   resolves every hit, KO, pickup, box and power, and emits compact events that go out with the
   10 Hz snapshot. */
import {
  BASE_SPEED, BURROW_COOLDOWN, COMBAT_LOCK_MS, FLAG, FX_FLAG, HEAL_ON_CORRECT, KO_LOSS, MAX_HP, MAX_SHIELD,
  PLAYER_R, RESPAWN_MS, SHIELD_REGEN, SHIELD_REGEN_DELAY, SPAWN_INVULN_MS, TICK_MS, aimToByte, type Fx,
} from './constants';
import { BOX_EFFECTS, CHAR_IDS, INF, PJ, POWERS, UPGRADES, WEAPONS, answerGain, freshUps, upValue, type UpKey, type Ups } from './defs';
import { freeSpot, generateMap, hitsWall, moveCircle, resolve, type GameMap } from './map';

export type Ev = (string | number)[];

export interface SimPlayer {
  idx: number;
  peer: string | null;
  name: string;
  char: number;
  uid: string | null;
  guest: boolean;
  bot: boolean;
  connected: boolean;
  x: number; y: number; px: number; py: number;
  vx: number; vy: number;
  tx: number; ty: number; hasT: boolean; lastAcceptT: number;
  mx: number; my: number;
  aim: number; ad: number;
  hp: number; sh: number; dia: number;
  alive: boolean; respawnAt: number;
  weapon: number; ammo: number; weaponUntil: number; nextFire: number;
  attackHeld: boolean; atkC: number; powC: number; bonC: number; pendingShot: boolean;
  powerReadyAt: number; borrowed: number; bCharges: number; bonusReadyAt: number;
  costume: number; costumeUntil: number;
  fx: Partial<Record<Fx, number>>;
  fv: number;
  lastDmgAt: number; lastCombatAt: number; lastHitBy: number;
  inQuiz: boolean;
  streak: number; bestStreak: number; correct: number; wrong: number; kos: number; deaths: number; boxes: number;
  ups: Ups;
  hist: { t: number; x: number; y: number; hp: number }[];
  burrowReadyAt: number;
  /* bot brain scratch */
  brain?: Record<string, number>;
}

interface Proj { id: number; kind: number; x: number; y: number; vx: number; vy: number; owner: number; dist: number; range: number; dmg: number; kb: number; r: number; hit: Set<number>; pierce: boolean; explode: number }
interface Gem { id: number; x: number; y: number; v: number; lock: number; lockUntil: number }
interface Box { id: number; x: number; y: number }
interface Zone { id: number; kind: 'groove' | 'ink'; x: number; y: number; r: number; until: number; owner: number }
interface Strike { x: number; y: number; r: number; at: number; dmg: number; kb: number; owner: number; stun: number; kind: string }
export interface Decoy { id: number; x: number; y: number; vx: number; vy: number; until: number; owner: number; char: number; aim: number }

export interface SimSettings { durationMs: number; goal: number }

export class Sim {
  map: GameMap;
  now = 0;
  tick = 0;
  players: SimPlayer[] = [];
  projs: Proj[] = [];
  gems = new Map<number, Gem>();
  boxes = new Map<number, Box>();
  zones: Zone[] = [];
  strikes: Strike[] = [];
  decoys: Decoy[] = [];
  events: Ev[] = [];
  urgent = false;
  ended = false;
  winner = -1;
  private nextId = 1;
  nextBoxAt = 0;
  rand = Math.random;
  settings: SimSettings;

  constructor(seed: number, settings: SimSettings) {
    this.map = generateMap(seed);
    this.settings = settings;
  }

  get remainingMs() { return Math.max(0, this.settings.durationMs - this.now); }

  id() { return this.nextId++; }
  ev(e: Ev, urgent = false) { this.events.push(e); if (urgent) this.urgent = true; }

  addPlayer(o: { peer: string | null; name: string; char: number; uid: string | null; guest: boolean; bot: boolean }): SimPlayer {
    const idx = this.players.length;
    const b = this.map.burrows[idx % this.map.burrows.length];
    const p: SimPlayer = {
      idx, ...o, connected: true,
      x: b.x, y: b.y + 60, px: b.x, py: b.y + 60, vx: 0, vy: 0, tx: b.x, ty: b.y + 60, hasT: false, lastAcceptT: 0,
      mx: 0, my: 0, aim: Math.PI / 2, ad: 200,
      hp: MAX_HP, sh: MAX_SHIELD, dia: 0, alive: true, respawnAt: 0,
      weapon: 0, ammo: INF, weaponUntil: 0, nextFire: 0, attackHeld: false, atkC: 0, powC: 0, bonC: 0, pendingShot: false,
      powerReadyAt: 3000, borrowed: -1, bCharges: 0, bonusReadyAt: 0, costume: -1, costumeUntil: 0,
      fx: { invuln: this.now + SPAWN_INVULN_MS }, fv: 0, lastDmgAt: -1e9, lastCombatAt: -1e9, lastHitBy: -1,
      inQuiz: false, streak: 0, bestStreak: 0, correct: 0, wrong: 0, kos: 0, deaths: 0, boxes: 0, ups: freshUps(),
      hist: [], burrowReadyAt: this.now + BURROW_COOLDOWN,
    };
    this.players.push(p);
    return p;
  }

  maxHp(p: SimPlayer) { return upValue('hp', p.ups.hp); }
  has(p: SimPlayer, f: Fx) { return (p.fx[f] ?? 0) > this.now; }
  give(p: SimPlayer, f: Fx, ms: number) { p.fx[f] = Math.max(p.fx[f] ?? 0, this.now + ms); }
  lookChar(p: SimPlayer) { return p.costume >= 0 ? p.costume : p.char; }
  canAct(p: SimPlayer) { return p.alive && !p.inQuiz && !this.has(p, 'stun') && !this.has(p, 'zen') && !this.has(p, 'air'); }
  speedMul(p: SimPlayer) {
    if (this.has(p, 'stun') || this.has(p, 'root') || this.has(p, 'zen')) return 0;
    let m = 1;
    if (this.has(p, 'speed')) m *= 1.55;
    if (this.has(p, 'power')) m *= 1.3;
    if (this.has(p, 'small')) m *= 1.2;
    if (this.has(p, 'slow')) m *= 0.55;
    if (this.has(p, 'charm')) m *= 0.5;
    return m;
  }
  hitR(p: SimPlayer) { return this.has(p, 'small') ? PLAYER_R * 0.65 : PLAYER_R; }

  flags(p: SimPlayer): number {
    let f = 0;
    if (p.alive) f |= FLAG.alive;
    if (p.inQuiz) f |= FLAG.quiz;
    if (p.bot) f |= FLAG.bot;
    if (!p.connected) f |= FLAG.away;
    if (this.now - p.lastCombatAt < COMBAT_LOCK_MS) f |= FLAG.combat;
    if (p.sh > MAX_SHIELD) f |= FLAG.overshield;
    for (const k in p.fx) {
      const fl = FX_FLAG[k as Fx];
      if (fl && (p.fx[k as Fx] ?? 0) > this.now) f |= fl;
    }
    return f;
  }

  /* ------------------------------------------------------------------ tick */
  step() {
    if (this.ended) return;
    const dt = TICK_MS / 1000;
    this.now += TICK_MS;
    this.tick++;
    const now = this.now;

    for (const p of this.players) {
      p.px = p.x;
      p.py = p.y;
      if (!p.connected) continue;
      if (!p.alive) {
        if (now >= p.respawnAt) this.respawn(p);
        continue;
      }
      // Expiring things.
      if (p.costume >= 0 && now > p.costumeUntil) { p.costume = -1; this.ev(['cs', p.idx, -1]); }
      if (p.weapon !== 0 && p.weaponUntil && now > p.weaponUntil) this.setWeapon(p, 0);

      // Movement.
      const mul = this.speedMul(p);
      const speed = BASE_SPEED * mul;
      let nx = p.x, ny = p.y;
      if (p.peer && !p.bot) {
        if (p.hasT && mul > 0) {
          const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy);
          const maxStep = speed * dt * 1.4 + 1;
          if (d > 0.5) {
            const s = Math.min(1, maxStep / d);
            nx += dx * s;
            ny += dy * s;
          }
        }
      } else if (mul > 0) {
        let mx = p.mx, my = p.my;
        if (this.has(p, 'confuse')) { mx = -mx; my = -my; }
        const l = Math.hypot(mx, my);
        if (l > 0.01) {
          nx += (mx / Math.max(1, l)) * speed * dt;
          ny += (my / Math.max(1, l)) * speed * dt;
        }
      }
      if (Math.abs(p.vx) + Math.abs(p.vy) > 1) {
        nx += p.vx * dt;
        ny += p.vy * dt;
        const k = Math.exp(-dt * 7);
        p.vx *= k;
        p.vy *= k;
      } else { p.vx = 0; p.vy = 0; }
      if (this.has(p, 'air')) { p.x = nx; p.y = ny; } else [p.x, p.y] = moveCircle(this.map, p.x, p.y, nx - p.x, ny - p.y);

      // History for "Una vez más".
      if (this.tick % 6 === 0) {
        p.hist.push({ t: now, x: p.x, y: p.y, hp: p.hp });
        if (p.hist.length > 24) p.hist.shift();
      }

      // Regeneration.
      const maxHp = this.maxHp(p);
      if (this.has(p, 'regen') && p.hp < maxHp) p.hp = Math.min(maxHp, p.hp + 5 * dt);
      if (now - p.lastDmgAt > SHIELD_REGEN_DELAY && p.sh < MAX_SHIELD) p.sh = Math.min(MAX_SHIELD, p.sh + SHIELD_REGEN * dt);
      if (p.sh > MAX_SHIELD) p.sh = Math.max(MAX_SHIELD, p.sh - 2 * dt);

      // Attacks and powers.
      if (p.pendingShot || p.attackHeld) this.fire(p);

      // Burrows.
      if (now >= p.burrowReadyAt && !this.has(p, 'air')) {
        for (const b of this.map.burrows) {
          if (Math.hypot(b.x - p.x, b.y - p.y) < 34) {
            const others = this.map.burrows.filter((o) => o.id !== b.id);
            const to = others[Math.floor(this.rand() * others.length)];
            this.teleport(p, to.x, to.y + 62, 'burrow', b.id);
            p.burrowReadyAt = now + BURROW_COOLDOWN;
            break;
          }
        }
      }

      // Pickups.
      const magnet = this.has(p, 'magnet');
      for (const g of this.gems.values()) {
        if (g.lock === p.idx && now < g.lockUntil) continue;
        const d2 = (g.x - p.x) ** 2 + (g.y - p.y) ** 2;
        if (d2 < (magnet ? 230 * 230 : 40 * 40)) {
          p.dia += g.v;
          this.gems.delete(g.id);
          this.ev(['gc', g.id, p.idx, g.v]);
        }
      }
      for (const b of this.boxes.values()) {
        if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < 42 * 42) this.openBox(p, b);
      }
    }

    // Player–player separation (soft), so crowds do not stack on one pixel.
    for (let i = 0; i < this.players.length; i++) {
      const a = this.players[i];
      if (!a.alive || !a.connected || this.has(a, 'air')) continue;
      for (let j = i + 1; j < this.players.length; j++) {
        const b = this.players[j];
        if (!b.alive || !b.connected || this.has(b, 'air')) continue;
        const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy);
        if (d > 0 && d < PLAYER_R * 1.4) {
          const push = (PLAYER_R * 1.4 - d) / 2;
          if (!a.peer || a.bot) { a.x -= (dx / d) * push; a.y -= (dy / d) * push; }
          if (!b.peer || b.bot) { b.x += (dx / d) * push; b.y += (dy / d) * push; }
        }
      }
    }

    this.stepProjectiles(dt);
    this.stepStrikes();
    this.stepZones();
    this.stepDecoys(dt);
    this.spawnBoxes();

    if (this.settings.goal > 0) {
      const w = this.players.find((p) => p.dia >= this.settings.goal);
      if (w) { this.winner = w.idx; this.ended = true; }
    }
    if (now >= this.settings.durationMs) this.ended = true;
  }

  /* ------------------------------------------------------------- weapons */
  setWeapon(p: SimPlayer, w: number) {
    const def = WEAPONS[w];
    p.weapon = w;
    p.ammo = def.ammo;
    p.weaponUntil = def.lasts ? this.now + def.lasts * 1000 : 0;
    p.nextFire = Math.min(p.nextFire, this.now + 150);
    this.ev(['wp', p.idx, w]);
  }

  fire(p: SimPlayer) {
    if (!this.canAct(p) || this.has(p, 'charm')) { p.pendingShot = false; return; }
    if (this.now < p.nextFire) return;
    p.pendingShot = false;
    const def = WEAPONS[p.weapon];
    const cd = def.cd * (this.has(p, 'rapid') ? 0.6 : 1);
    p.nextFire = this.now + cd;
    if (p.fx.invis && this.has(p, 'invis')) { p.fx.invis = 0; this.ev(['rv', p.idx]); }
    p.lastCombatAt = this.now;
    const a = p.aim, cx = Math.cos(a), cy = Math.sin(a);
    const dmgMul = this.has(p, 'small') ? 1.35 : 1;
    const sx = p.x + cx * (PLAYER_R + 12), sy = p.y - 18 + cy * (PLAYER_R + 12);
    switch (def.kind) {
      case 'melee': {
        this.ev(['sw', p.idx, aimToByte(a)]);
        for (const q of this.players) {
          if (q === p || !q.alive || !q.connected) continue;
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
          if (d > def.range + this.hitR(q)) continue;
          let da = Math.atan2(dy, dx) - a;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          if (Math.abs(da) > 1.0 && d > PLAYER_R * 1.5) continue;
          this.damage(q, def.dmg * dmgMul, p, (dx / (d || 1)) * def.kb, (dy / (d || 1)) * def.kb);
        }
        this.hitDecoys(p.x + cx * 50, p.y + cy * 50, def.range, p);
        break;
      }
      case 'spread':
        for (const off of [-0.22, 0, 0.22]) this.spawnProj(p, def.id, sx, sy, a + off, def.speed, def.range, def.dmg * dmgMul, def.kb, def.radius, false, 0);
        break;
      case 'grenade': {
        const dist = Math.min(def.range, Math.max(80, p.ad));
        const tx = p.x + cx * dist, ty = p.y + cy * dist;
        this.ev(['gr', p.idx, Math.round(sx), Math.round(sy), Math.round(tx), Math.round(ty)]);
        this.strikes.push({ x: tx, y: ty, r: def.radius, at: this.now + 700, dmg: def.dmg * dmgMul, kb: def.kb, owner: p.idx, stun: 0, kind: 'glitter' });
        break;
      }
      default:
        this.spawnProj(p, def.id, sx, sy, a, def.speed, def.range, def.dmg * dmgMul, def.kb, def.radius, def.kind === 'pierce', def.kind === 'explosive' ? def.radius : 0);
    }
    if (def.ammo !== INF) {
      p.ammo--;
      if (p.ammo <= 0) this.setWeapon(p, 0);
    }
  }

  spawnProj(p: SimPlayer, kind: number, x: number, y: number, a: number, speed: number, range: number, dmg: number, kb: number, r: number, pierce: boolean, explode: number) {
    const pr: Proj = { id: this.id(), kind, x, y, vx: Math.cos(a) * speed, vy: Math.sin(a) * speed, owner: p.idx, dist: 0, range, dmg, kb, r, hit: new Set(), pierce, explode };
    this.projs.push(pr);
    this.ev(['pj', pr.id, kind, Math.round(x), Math.round(y), aimToByte(a), p.idx, speed, range]);
  }

  stepProjectiles(dt: number) {
    const keep: Proj[] = [];
    for (const pr of this.projs) {
      const steps = 2;
      let dead = false;
      for (let s = 0; s < steps && !dead; s++) {
        pr.x += (pr.vx * dt) / steps;
        pr.y += (pr.vy * dt) / steps;
        pr.dist += (Math.hypot(pr.vx, pr.vy) * dt) / steps;
        if (hitsWall(this.map, pr.x, pr.y + 18, pr.r)) { dead = true; break; }
        for (const q of this.players) {
          if (q.idx === pr.owner || !q.alive || !q.connected || pr.hit.has(q.idx) || this.has(q, 'air')) continue;
          const rr = this.hitR(q) + pr.r;
          if ((q.x - pr.x) ** 2 + (q.y - 22 - pr.y) ** 2 > (rr + 8) ** 2) continue;
          if (this.has(q, 'reflect')) {
            pr.vx = -pr.vx; pr.vy = -pr.vy; pr.owner = q.idx; pr.dist = 0; pr.hit.clear();
            this.ev(['rf', pr.id, q.idx, Math.round(pr.x), Math.round(pr.y), aimToByte(Math.atan2(pr.vy, pr.vx))]);
            break;
          }
          if (pr.explode) { dead = true; break; }
          const owner = this.players[pr.owner];
          const l = Math.hypot(pr.vx, pr.vy) || 1;
          this.damage(q, pr.dmg, owner, (pr.vx / l) * pr.kb, (pr.vy / l) * pr.kb);
          if (pr.kind === PJ.clipboard && q.alive) this.status(q, 'root', 2500);
          pr.hit.add(q.idx);
          if (!pr.pierce) { dead = true; break; }
        }
        if (!dead && this.decoys.length) {
          for (const d of this.decoys) if ((d.x - pr.x) ** 2 + (d.y - 22 - pr.y) ** 2 < 30 * 30 && d.owner !== pr.owner) { this.popDecoy(d); dead = !pr.pierce; break; }
        }
        if (pr.dist >= pr.range) dead = true;
      }
      if (dead) {
        if (pr.explode) this.explode(pr.x, pr.y, pr.explode, pr.dmg, pr.kb, this.players[pr.owner], 'eraser', 0);
        this.ev(['ph', pr.id, Math.round(pr.x), Math.round(pr.y)]);
      } else keep.push(pr);
    }
    this.projs = keep;
  }

  explode(x: number, y: number, r: number, dmg: number, kb: number, owner: SimPlayer | undefined, kind: string, stun: number) {
    this.ev(['ex', Math.round(x), Math.round(y), r, kind], true);
    for (const q of this.players) {
      if (!q.alive || !q.connected || (owner && q.idx === owner.idx)) continue;
      const dx = q.x - x, dy = q.y - y, d = Math.hypot(dx, dy);
      if (d > r + this.hitR(q)) continue;
      const f = 1 - Math.min(1, d / (r + PLAYER_R)) * 0.5;
      this.damage(q, dmg * f, owner, (dx / (d || 1)) * kb, (dy / (d || 1)) * kb);
      if (stun && q.alive) this.status(q, 'stun', stun);
    }
    this.hitDecoys(x, y, r, owner);
  }

  stepStrikes() {
    const keep: Strike[] = [];
    for (const s of this.strikes) {
      if (this.now >= s.at) this.explode(s.x, s.y, s.r, s.dmg, s.kb, this.players[s.owner], s.kind, s.stun);
      else keep.push(s);
    }
    this.strikes = keep;
  }

  /* -------------------------------------------------------------- damage */
  protectedNow(q: SimPlayer) {
    if (this.has(q, 'invuln') || this.has(q, 'zen') || this.has(q, 'air') || this.has(q, 'barrier')) return true;
    if (q.inQuiz && this.now - q.lastCombatAt > COMBAT_LOCK_MS) return true;
    return false;
  }

  damage(q: SimPlayer, amount: number, src: SimPlayer | undefined, kbx: number, kby: number) {
    if (!q.alive) return;
    if (this.protectedNow(q)) {
      this.ev(['bk', q.idx]);
      return;
    }
    let dmg = amount * (this.has(q, 'marked') ? 1.3 : 1);
    dmg = Math.max(1, Math.round(dmg));
    q.lastDmgAt = this.now;
    q.lastCombatAt = this.now;
    if (src) { src.lastCombatAt = this.now; q.lastHitBy = src.idx; }
    const absorbed = Math.min(q.sh, dmg);
    q.sh -= absorbed;
    q.hp -= dmg - absorbed;
    if (kbx || kby) {
      q.vx += kbx;
      q.vy += kby;
      q.fv++;
      this.ev(['kb', q.idx, Math.round(kbx), Math.round(kby), q.fv], true);
    }
    this.ev(['dm', q.idx, dmg, src ? src.idx : -1, absorbed >= dmg ? 1 : 0]);
    if (q.hp <= 0) this.ko(q, src);
  }

  ko(q: SimPlayer, killer: SimPlayer | undefined) {
    q.hp = 0;
    q.alive = false;
    q.deaths++;
    q.respawnAt = this.now + RESPAWN_MS;
    q.streak = 0;
    q.vx = q.vy = 0;
    q.borrowed = -1;
    q.bCharges = 0;
    q.costume = -1;
    q.fx = {};
    q.inQuiz = false;
    q.attackHeld = false;
    q.pendingShot = false;
    if (q.weapon !== 0) { q.weapon = 0; q.ammo = INF; q.weaponUntil = 0; }
    const keep = upValue('ins', q.ups.ins) / 100;
    const lost = Math.floor(q.dia * KO_LOSS * (1 - keep));
    q.dia -= lost;
    if (killer && killer !== q) killer.kos++;
    this.ev(['ko', q.idx, killer ? killer.idx : -1, lost], true);
    if (lost > 0) this.burstGems(q.x, q.y, lost, q.idx, 900);
  }

  respawn(p: SimPlayer) {
    const b = this.map.burrows[Math.floor(this.rand() * this.map.burrows.length)];
    p.alive = true;
    p.hp = this.maxHp(p);
    p.sh = MAX_SHIELD;
    p.fx = { invuln: this.now + SPAWN_INVULN_MS };
    p.burrowReadyAt = this.now + BURROW_COOLDOWN;
    p.hist = [];
    this.teleport(p, b.x, b.y + 62, 'spawn', b.id);
  }

  teleport(p: SimPlayer, x: number, y: number, kind: string, extra = -1) {
    const fx = p.x, fy = p.y;
    [p.x, p.y] = resolve(this.map, x, y);
    p.px = p.x; p.py = p.y;
    p.vx = p.vy = 0;
    p.tx = p.x; p.ty = p.y; p.hasT = false;
    p.fv++;
    this.ev(['tp', p.idx, Math.round(p.x), Math.round(p.y), p.fv, kind, Math.round(fx), Math.round(fy), extra], true);
  }

  /* -------------------------------------------------------------- pickups */
  burstGems(x: number, y: number, total: number, lock: number, lockMs: number) {
    const parts: number[] = [];
    let left = total;
    for (const v of [50, 25, 10, 5, 1]) while (left >= v && parts.length < 14) { parts.push(v); left -= v; }
    if (left > 0 && parts.length) parts[parts.length - 1] += left;
    parts.forEach((v, i) => {
      const a = (i / parts.length) * Math.PI * 2 + this.rand() * 0.6;
      const dist = 50 + this.rand() * 80;
      const [gx, gy] = resolve(this.map, x + Math.cos(a) * dist, y + Math.sin(a) * dist, 10);
      const g: Gem = { id: this.id(), x: gx, y: gy, v, lock, lockUntil: this.now + lockMs };
      this.gems.set(g.id, g);
      this.ev(['gm', g.id, Math.round(gx), Math.round(gy), v, Math.round(x), Math.round(y)]);
    });
  }

  spawnBoxes() {
    if (this.now < this.nextBoxAt) return;
    const active = this.players.filter((p) => p.connected).length;
    const max = Math.min(22, 7 + Math.ceil(active * 0.6));
    if (this.boxes.size >= max) return;
    this.nextBoxAt = this.now + (this.boxes.size < 4 ? 600 : 3200);
    const [x, y] = freeSpot(this.map, this.rand);
    const b: Box = { id: this.id(), x, y };
    this.boxes.set(b.id, b);
    this.ev(['bx', b.id, Math.round(x), Math.round(y)]);
  }

  openBox(p: SimPlayer, b: Box) {
    this.boxes.delete(b.id);
    p.boxes++;
    const total = BOX_EFFECTS.reduce((s, e) => s + e.w, 0);
    let r = this.rand() * total;
    let eff = BOX_EFFECTS[0];
    for (const e of BOX_EFFECTS) { r -= e.w; if (r <= 0) { eff = e; break; } }
    const ei = BOX_EFFECTS.indexOf(eff);
    let param = 0;
    switch (eff.id) {
      case 'gadget': {
        const options = [1, 2, 3, 4, 5, 6].filter((w) => w !== p.weapon);
        param = options[Math.floor(this.rand() * options.length)];
        this.setWeapon(p, param);
        break;
      }
      case 'power': {
        const mine = this.lookChar(p);
        do param = Math.floor(this.rand() * CHAR_IDS.length); while (param === mine);
        p.borrowed = param;
        p.bCharges = 3;
        break;
      }
      case 'costume': {
        do param = Math.floor(this.rand() * CHAR_IDS.length); while (param === p.char);
        p.costume = param;
        p.costumeUntil = this.now + 40000;
        this.ev(['cs', p.idx, param]);
        break;
      }
      case 'healer': this.give(p, 'regen', 15000); break;
      case 'shield': p.sh = MAX_SHIELD + 50; break;
      case 'speed': this.give(p, 'speed', 12000); break;
      case 'magnet': this.give(p, 'magnet', 15000); break;
      case 'happy': this.give(p, 'genius', 30000); break;
      case 'jackpot': param = 20 + Math.floor(this.rand() * 4) * 5; p.dia += param; break;
      case 'trap': {
        param = Math.min(25, p.dia);
        p.dia -= param;
        if (param > 0) this.burstGems(p.x, p.y, param, p.idx, 1500);
        this.ev(['ex', Math.round(p.x), Math.round(p.y), 60, 'trap'], true);
        break;
      }
    }
    this.ev(['bo', b.id, p.idx, ei, param], true);
  }

  /* --------------------------------------------------------------- zones */
  stepZones() {
    const now = this.now;
    this.zones = this.zones.filter((z) => z.until > now);
    for (const z of this.zones) {
      for (const q of this.players) {
        if (!q.alive || !q.connected) continue;
        if ((q.x - z.x) ** 2 + (q.y - z.y) ** 2 > z.r * z.r) continue;
        if (z.kind === 'groove') {
          if (q.idx === z.owner) { this.give(q, 'power', 300); this.give(q, 'regen', 300); }
          else this.give(q, 'slow', 300);
        } else if (q.idx !== z.owner) {
          this.give(q, 'slow', 300);
          if (this.tick % 10 === 0) this.damage(q, 2.4, this.players[z.owner], 0, 0);
        }
      }
    }
  }

  stepDecoys(dt: number) {
    this.decoys = this.decoys.filter((d) => {
      if (this.now > d.until) { this.ev(['dp', d.id, Math.round(d.x), Math.round(d.y)]); return false; }
      const [x, y] = moveCircle(this.map, d.x, d.y, d.vx * dt, d.vy * dt);
      if (Math.hypot(x - d.x - d.vx * dt, y - d.y - d.vy * dt) > 2) { d.vx = -d.vx * 0.8; d.vy = d.vy * 0.8 + (this.rand() - 0.5) * 120; }
      d.x = x; d.y = y;
      d.aim = Math.atan2(d.vy, d.vx);
      return true;
    });
  }

  hitDecoys(x: number, y: number, r: number, by: SimPlayer | undefined) {
    for (const d of [...this.decoys]) if (Math.hypot(d.x - x, d.y - y) < r + 26 && (!by || by.idx !== d.owner)) this.popDecoy(d);
  }

  popDecoy(d: Decoy) {
    this.decoys = this.decoys.filter((o) => o !== d);
    this.ev(['dp', d.id, Math.round(d.x), Math.round(d.y)], true);
  }

  /* -------------------------------------------------------------- powers */
  enemiesIn(p: SimPlayer, x: number, y: number, r: number) {
    return this.players.filter((q) => q !== p && q.alive && q.connected && (q.x - x) ** 2 + (q.y - y) ** 2 < (r + this.hitR(q)) ** 2);
  }
  inCone(p: SimPlayer, range: number, half: number) {
    return this.players.filter((q) => {
      if (q === p || !q.alive || !q.connected) return false;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      if (d > range + PLAYER_R) return false;
      let da = Math.atan2(dy, dx) - p.aim;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      return Math.abs(da) < half || d < PLAYER_R * 2;
    });
  }
  status(q: SimPlayer, f: Fx, ms: number) {
    if (this.protectedNow(q) && f !== 'marked') { this.ev(['bk', q.idx]); return; }
    this.give(q, f, ms);
    this.ev(['st', q.idx, f]);
    // Movement locks: pin the player where the host has them, so the phone stops predicting.
    if ((f === 'root' || f === 'stun') && q.peer && !q.bot) this.teleport(q, q.x, q.y, 'hold');
  }

  /** Character power (own: cooldown; borrowed: charges). */
  usePower(p: SimPlayer, borrowed: boolean) {
    if (!this.canAct(p)) return;
    let ci: number;
    if (borrowed) {
      if (p.borrowed < 0 || p.bCharges <= 0 || this.now < p.bonusReadyAt) return;
      ci = p.borrowed;
    } else {
      if (this.now < p.powerReadyAt) return;
      ci = this.lookChar(p);
    }
    const id = CHAR_IDS[ci];
    const ok = this.runPower(p, id);
    if (!ok) { if (!borrowed) p.powerReadyAt = this.now + 1500; return; }
    if (borrowed) {
      p.bCharges--;
      p.bonusReadyAt = this.now + 1200;
      if (p.bCharges <= 0) p.borrowed = -1;
    } else {
      const cd = POWERS[id]?.cd ?? 12;
      p.powerReadyAt = this.now + cd * 1000;
    }
    this.ev(['pw', p.idx, ci, borrowed ? 1 : 0, aimToByte(p.aim)], true);
  }

  private runPower(p: SimPlayer, id: string): boolean {
    const a = p.aim, cx = Math.cos(a), cy = Math.sin(a);
    const at = (dist: number) => resolve(this.map, p.x + cx * dist, p.y + cy * dist);
    switch (id) {
      case 'camila':
        for (const q of this.enemiesIn(p, p.x, p.y, 175)) this.status(q, 'charm', 2500);
        this.ev(['wave', Math.round(p.x), Math.round(p.y), 175, 0]);
        return true;
      case 'sofia':
        for (const q of this.inCone(p, 250, 0.62)) this.status(q, 'blind', 3000);
        this.ev(['cone', p.idx, aimToByte(a), 250, 0]);
        return true;
      case 'gabriel':
        this.zones.push({ id: this.id(), kind: 'groove', x: p.x, y: p.y, r: 135, until: this.now + 5000, owner: p.idx });
        this.ev(['zn', this.zones[this.zones.length - 1].id, 0, Math.round(p.x), Math.round(p.y), 135, 5000, p.idx]);
        return true;
      case 'sander': {
        const old = p.hist.find((h) => h.t >= this.now - 3100) ?? p.hist[0];
        if (!old) return false;
        p.hp = Math.max(p.hp, Math.min(this.maxHp(p), old.hp));
        this.teleport(p, old.x, old.y, 'rewind');
        return true;
      }
      case 'nataly':
        for (const q of this.enemiesIn(p, p.x, p.y, 330)) { this.status(q, 'marked', 6000); if (q.fx.invis) q.fx.invis = 0; }
        this.ev(['wave', Math.round(p.x), Math.round(p.y), 330, 1]);
        return true;
      case 'anyela':
        for (let i = -2; i <= 2; i++) this.spawnProj(p, PJ.book, p.x + cx * 30, p.y - 18 + cy * 30, a + i * 0.2, 620, 470, 14 * (this.has(p, 'small') ? 1.35 : 1), 280, 12, false, 0);
        return true;
      case 'julian':
        p.hp = Math.min(this.maxHp(p), p.hp + 40);
        this.give(p, 'regen', 5000);
        return true;
      case 'freddy':
        this.give(p, 'speed', 3500);
        for (const q of this.enemiesIn(p, p.x, p.y, 160)) {
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
          this.damage(q, 4, p, (dx / d) * 420, (dy / d) * 420);
        }
        this.ev(['wave', Math.round(p.x), Math.round(p.y), 160, 2]);
        return true;
      case 'andres': {
        const [ex, ey] = moveCircle(this.map, p.x, p.y, cx * 240, cy * 240);
        let best: SimPlayer | null = null, bd = Infinity;
        for (const q of this.players) {
          if (q === p || !q.alive || !q.connected) continue;
          const t = Math.max(0, Math.min(1, ((q.x - p.x) * (ex - p.x) + (q.y - p.y) * (ey - p.y)) / (((ex - p.x) ** 2 + (ey - p.y) ** 2) || 1)));
          const d = Math.hypot(p.x + (ex - p.x) * t - q.x, p.y + (ey - p.y) * t - q.y);
          if (d < PLAYER_R * 2.4 && t < bd) { bd = t; best = q; }
        }
        if (best) {
          const stopX = p.x + (ex - p.x) * bd, stopY = p.y + (ey - p.y) * bd;
          this.teleport(p, stopX - cx * 30, stopY - cy * 30, 'dash');
          this.damage(best, 22 * (this.has(p, 'small') ? 1.35 : 1), p, cx * 200, cy * 200);
          this.status(best, 'stun', 1300);
        } else this.teleport(p, ex, ey, 'dash');
        return true;
      }
      case 'angie': {
        const [tx, ty] = at(Math.min(420, Math.max(90, p.ad)));
        this.strikes.push({ x: tx, y: ty, r: 92, at: this.now + 650, dmg: 35, kb: 220, owner: p.idx, stun: 900, kind: 'bulb' });
        this.ev(['tg', Math.round(tx), Math.round(ty), 92, 650, 0]);
        return true;
      }
      case 'lina':
        if (WEAPONS[p.weapon].ammo !== INF) p.ammo = WEAPONS[p.weapon].ammo;
        p.nextFire = this.now;
        p.sh = Math.min(MAX_SHIELD + 50, p.sh + 40);
        this.give(p, 'rapid', 6000);
        return true;
      case 'valentina': {
        const dist = Math.min(290, Math.max(100, p.ad));
        const [tx, ty] = resolve(this.map, p.x + cx * dist, p.y + cy * dist);
        this.give(p, 'air', 560);
        this.teleport(p, tx, ty, 'leap');
        this.strikes.push({ x: p.x, y: p.y, r: 96, at: this.now + 560, dmg: 25, kb: 420, owner: p.idx, stun: 0, kind: 'land' });
        return true;
      }
      case 'esteban': this.give(p, 'reflect', 3000); return true;
      case 'sebastian': {
        this.give(p, 'invis', 3500);
        const d: Decoy = { id: this.id(), x: p.x, y: p.y, vx: cx * 190, vy: cy * 190, until: this.now + 3500, owner: p.idx, char: this.lookChar(p), aim: a };
        this.decoys.push(d);
        return true;
      }
      case 'javier': this.give(p, 'zen', 2500); if (p.peer && !p.bot) this.teleport(p, p.x, p.y, 'hold'); p.hp = Math.min(this.maxHp(p), p.hp + 30); p.vx = p.vy = 0; return true;
      case 'anny': this.give(p, 'small', 6000); return true;
      case 'estephania': this.give(p, 'genius', 25000); return true;
      case 'dager': this.give(p, 'barrier', 4000); p.sh = Math.max(p.sh, MAX_SHIELD); return true;
      case 'liliana': this.give(p, 'power', 5000); this.give(p, 'rapid', 5000); p.hp = Math.min(this.maxHp(p), p.hp + 15); return true;
      case 'norvey': {
        let ex = p.x, ey = p.y - 20;
        for (let s = 0; s < 52; s++) {
          const nx = ex + cx * 12, ny = ey + cy * 12;
          if (hitsWall(this.map, nx, ny + 20, 3)) break;
          ex = nx; ey = ny;
        }
        for (const q of this.players) {
          if (q === p || !q.alive || !q.connected) continue;
          const t = Math.max(0, Math.min(1, ((q.x - p.x) * (ex - p.x) + (q.y - 20 - p.y + 20) * (ey - p.y + 20)) / (((ex - p.x) ** 2 + (ey - p.y + 20) ** 2) || 1)));
          const d = Math.hypot(p.x + (ex - p.x) * t - q.x, p.y - 20 + (ey - p.y + 20) * t - (q.y - 20));
          if (d < this.hitR(q) + 14) this.damage(q, 30 * (this.has(p, 'small') ? 1.35 : 1), p, cx * 160, cy * 160);
        }
        this.hitDecoys((p.x + ex) / 2, (p.y + ey) / 2, 30, p);
        this.ev(['lz', Math.round(p.x), Math.round(p.y - 20), Math.round(ex), Math.round(ey)], true);
        return true;
      }
      case 'mafe': {
        const [ex, ey] = moveCircle(this.map, p.x, p.y, cx * 230, cy * 230);
        this.teleport(p, ex, ey, 'shadow');
        this.give(p, 'invis', 4000);
        return true;
      }
      case 'jhonathan':
        for (const q of this.inCone(p, 250, 0.7)) this.status(q, 'confuse', 3000);
        this.ev(['cone', p.idx, aimToByte(a), 250, 1]);
        return true;
      case 'jalbleidy':
        this.spawnProj(p, PJ.clipboard, p.x + cx * 30, p.y - 18 + cy * 30, a, 720, 540, 8, 60, 14, false, 0);
        return true;
      case 'juanpablo': {
        const [tx, ty] = at(Math.min(360, Math.max(80, p.ad)));
        const z: Zone = { id: this.id(), kind: 'ink', x: tx, y: ty, r: 108, until: this.now + 5000, owner: p.idx };
        this.zones.push(z);
        this.ev(['zn', z.id, 1, Math.round(tx), Math.round(ty), 108, 5000, p.idx]);
        return true;
      }
      case 'vanessa': {
        let best: SimPlayer | null = null, bd = 420;
        for (const q of this.players) {
          if (q === p || !q.alive || !q.connected || this.has(q, 'invis')) continue;
          const d = Math.hypot(q.x - p.x, q.y - p.y);
          if (d < bd) { bd = d; best = q; }
        }
        if (!best) return false;
        const ax = p.x, ay = p.y;
        this.teleport(p, best.x, best.y, 'swap');
        if (!this.protectedNow(best)) {
          this.teleport(best, ax, ay, 'swap');
          this.status(best, 'confuse', 1600);
        }
        return true;
      }
    }
    return false;
  }

  /* ------------------------------------------------------- answers + shop */
  answer(p: SimPlayer, correct: boolean) {
    if (correct) {
      const gain = answerGain(p.ups, p.streak, this.has(p, 'genius'));
      p.dia += gain;
      p.streak++;
      p.bestStreak = Math.max(p.bestStreak, p.streak);
      p.correct++;
      if (p.alive) p.hp = Math.min(this.maxHp(p), p.hp + HEAL_ON_CORRECT);
      this.ev(['an', p.idx, gain, p.streak]);
    } else {
      p.streak = 0;
      p.wrong++;
      this.ev(['an', p.idx, 0, 0]);
    }
  }

  buy(p: SimPlayer, k: UpKey): boolean {
    const u = UPGRADES.find((x) => x.id === k);
    if (!u) return false;
    const next = p.ups[k] + 1;
    if (next >= u.values.length) return false;
    const cost = u.costs[next];
    if (p.dia < cost) return false;
    p.dia -= cost;
    const oldMax = this.maxHp(p);
    p.ups[k] = next;
    if (k === 'hp') p.hp += this.maxHp(p) - oldMax;
    this.ev(['by', p.idx, UPGRADES.indexOf(u), next, cost]);
    return true;
  }

  setQuiz(p: SimPlayer, on: boolean) {
    if (p.inQuiz === on) return;
    p.inQuiz = on;
    if (on) { p.attackHeld = false; p.pendingShot = false; p.hasT = false; p.mx = p.my = 0; }
  }

  /* -------------------------------------------------------------- network */
  /** Compact snapshot: one array per player (see net.ts for the layout). */
  snapshot() {
    const p = this.players.map((q) => [
      q.idx, Math.round(q.x), Math.round(q.y), aimToByte(q.aim), Math.ceil(q.hp), Math.ceil(q.sh), q.dia, this.flags(q),
      this.lookChar(q), q.weapon, q.ammo, this.maxHp(q), q.borrowed, q.bCharges,
    ]);
    const d = this.decoys.map((o) => [o.id, Math.round(o.x), Math.round(o.y), o.char, o.owner, aimToByte(o.aim)]);
    return { t: Math.round(this.now), p, d, r: Math.round(this.remainingMs) };
  }

  full() {
    return {
      t: Math.round(this.now),
      boxes: [...this.boxes.values()].map((b) => [b.id, Math.round(b.x), Math.round(b.y)]),
      gems: [...this.gems.values()].map((g) => [g.id, Math.round(g.x), Math.round(g.y), g.v]),
      zones: this.zones.map((z) => [z.id, z.kind === 'groove' ? 0 : 1, Math.round(z.x), Math.round(z.y), z.r, Math.round(z.until - this.now), z.owner]),
      ups: this.players.map((q) => [q.ups.dpq, q.ups.streak, q.ups.mult, q.ups.ins, q.ups.hp]),
      streaks: this.players.map((q) => q.streak),
      cds: this.players.map((q) => Math.max(0, Math.round(q.powerReadyAt - this.now))),
    };
  }
}
