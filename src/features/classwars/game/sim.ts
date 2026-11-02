/* Class Wars — host-authoritative simulation. Runs only in the teacher's (host's) browser at a
   fixed 30 Hz step. Clients send input + their predicted position; the host validates moves,
   resolves every hit, KO, pickup, box and power, and emits compact events that go out with the
   10 Hz snapshot. */
import {
  BASE_SPEED, BOX_COOLDOWN_MS, BURROW_COOLDOWN, COMBAT_LOCK_MS, FLAG, FX_FLAG, HEAL_ON_CORRECT, KO_LOSS, MAX_HP, MAX_SHIELD,
  KB_SPEED, PAINT_CELL, PAINT_R, PLAYER_R, SHIELD_REGEN, SHIELD_REGEN_DELAY, SPAWN_INVULN_MS, SPLAT_R, START_ENERGY, STEP_COST, TICK_MS,
  BOT_LEVELS, MAX_EXTRA_JUMPS, PED_MS, TILE, aimToByte, respawnMs, sideView, type Fx, type Game,
} from './constants';
import { BOX_EFFECTS, CHAR_IDS, DIA_OUTCOMES, INF, KB_ARSENAL, PJ, POWERS, UPGRADES, WEAPONS, answerGain, energyMul, freshUps, upValue, upsToArr, type UpKey, type Ups } from './defs';
import { freeSpot, generateMap, hitsWall, moveCircle, paintCols, paintMask, paintRows, resolve, type GameMap } from './map';
import { kbStep, newBody, outOfStage, standOn, type Body } from './kb';

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
  /** Walking velocity of the last tick (px/s), for aim leading. */
  wvx: number; wvy: number;
  vx: number; vy: number;
  tx: number; ty: number; hasT: boolean; lastAcceptT: number;
  mx: number; my: number;
  aim: number; ad: number;
  hp: number; sh: number; dia: number; en: number;
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
  burrowReadyAt: number;
  /** Color Clash team (−1 = none). */
  team: number;
  /** Knockback damage %. */
  pct: number;
  /** Knockback physics body (bots only; phones simulate their own). */
  body: Body | null;
  /** Bot input for knockback: a jump / drop request this tick. */
  jumpQ: boolean; downQ: boolean;
  lastHitAt: number;
  /** Color Clash: extra air jumps from boxes (until KO). */
  jumps: number;
  /** Knockback arsenal: bit per weapon owned, and the one equipped (a box gadget returns to it). */
  owned: number; main: number;
  /* bot brain scratch */
  brain?: Record<string, number>;
}

interface Proj { id: number; kind: number; x: number; y: number; vx: number; vy: number; owner: number; dist: number; range: number; dmg: number; kb: number; r: number; hit: Set<number>; pierce: boolean; explode: number; homing?: boolean; bounces?: number }
interface Gem { id: number; x: number; y: number; v: number; lock: number; lockUntil: number }
interface Box { id: number; x: number; y: number; readyAt: number }
interface Zone { id: number; x: number; y: number; r: number; until: number; owner: number }
interface Strike { x: number; y: number; r: number; at: number; dmg: number; kb: number; owner: number; stun: number; kind: string }

export interface SimSettings {
  durationMs: number; goal: number; portals?: number; startEnergy?: number;
  game?: Game;
  /** Color Clash: number of teams (2–4). */
  teams?: number;
  /** Bot difficulty: index into BOT_LEVELS. */
  botLevel?: number;
}

/** Color Clash team bases: one portal per team, in opposite corners. */
const TEAM_BASE = [0, 5, 2, 3];

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
  events: Ev[] = [];
  urgent = false;
  ended = false;
  winner = -1;
  private nextId = 1;
  rand = Math.random;
  settings: SimSettings;
  game: Game;
  teams: number;
  /* Color Clash: cell owner (0 = none, team + 1), which cells count, changes since the last flush. */
  paint: Uint8Array | null = null;
  paintable: Uint8Array | null = null;
  teamCells: number[] = [];
  private paintDirty = new Map<number, number>();
  private teamsSent = '';
  winnerTeam = -1;

  constructor(seed: number, settings: SimSettings) {
    this.game = settings.game ?? 'arena';
    this.teams = this.game === 'paint' ? Math.max(2, Math.min(4, settings.teams ?? 2)) : 0;
    this.map = generateMap(seed, settings.portals, this.game);
    this.settings = settings;
    if (this.game === 'paint') {
      this.paintable = paintMask(this.map);
      this.paint = new Uint8Array(this.paintable.length);
      this.teamCells = Array(this.teams).fill(0);
      // every team starts with a splash of colour around its base
    }
  }

  get side() { return sideView(this.game); }
  /** Top-down shots fly 18 px above the ground; side-view shots are where they are drawn. */
  get lift() { return this.side ? 0 : 18; }
  get bot() { return BOT_LEVELS[Math.max(0, Math.min(2, this.settings.botLevel ?? 0))]; }
  /** Rivals: not yourself and not your team. */
  foe(p: SimPlayer, q: SimPlayer) { return q !== p && q.alive && q.connected && (!this.teams || q.team !== p.team); }
  base(team: number) { return this.map.burrows[(this.map.tiles || this.map.kind === 'kb' ? team : TEAM_BASE[team]) % this.map.burrows.length]; }

  get remainingMs() { return Math.max(0, this.settings.durationMs - this.now); }

  id() { return this.nextId++; }
  ev(e: Ev, urgent = false) { this.events.push(e); if (urgent) this.urgent = true; }

  addPlayer(o: { peer: string | null; name: string; char: number; uid: string | null; guest: boolean; bot: boolean }): SimPlayer {
    const idx = this.players.length;
    let team = -1;
    if (this.teams) {
      const n = Array(this.teams).fill(0);
      for (const q of this.players) if (q.team >= 0) n[q.team]++;
      team = n.indexOf(Math.min(...n));
    }
    const b = team >= 0 ? this.base(team) : this.map.burrows[idx % this.map.burrows.length];
    const p: SimPlayer = {
      idx, ...o, connected: true, team, pct: 0, body: null, jumpQ: false, downQ: false, lastHitAt: -1e9, jumps: 0, owned: 1, main: 0,
      x: b.x, y: b.y + 60, px: b.x, py: b.y + 60, wvx: 0, wvy: 0, vx: 0, vy: 0, tx: b.x, ty: b.y + 60, hasT: false, lastAcceptT: 0,
      mx: 0, my: 0, aim: Math.PI / 2, ad: 200,
      hp: MAX_HP, sh: MAX_SHIELD, dia: 0, en: this.settings.startEnergy ?? START_ENERGY, alive: true, respawnAt: 0,
      weapon: 0, ammo: INF, weaponUntil: 0, nextFire: 0, attackHeld: false, atkC: 0, powC: 0, bonC: 0, pendingShot: false,
      powerReadyAt: 3000, borrowed: -1, bCharges: 0, bonusReadyAt: 0, costume: -1, costumeUntil: 0,
      fx: { invuln: this.now + SPAWN_INVULN_MS }, fv: 0, lastDmgAt: -1e9, lastCombatAt: -1e9, lastHitBy: -1,
      inQuiz: false, streak: 0, bestStreak: 0, correct: 0, wrong: 0, kos: 0, deaths: 0, boxes: 0, ups: freshUps(),
      burrowReadyAt: this.now + BURROW_COOLDOWN,
    };
    if (this.side) {
      p.y = p.py = p.ty = b.y;
      if (o.bot || !o.peer) p.body = newBody(p.x, p.y);
    }
    this.players.push(p);
    return p;
  }

  maxHp(p: SimPlayer) { return upValue('hp', p.ups.hp); }
  has(p: SimPlayer, f: Fx) { return (p.fx[f] ?? 0) > this.now; }
  give(p: SimPlayer, f: Fx, ms: number) { p.fx[f] = Math.max(p.fx[f] ?? 0, this.now + ms); }
  lookChar(p: SimPlayer) { return p.costume >= 0 ? p.costume : p.char; }
  tired(p: SimPlayer) { return p.en <= 0; }
  /** Can shoot and use powers (hacked players can still walk). */
  canAct(p: SimPlayer) { return p.alive && !p.inQuiz && !this.tired(p) && !this.has(p, 'stun') && !this.has(p, 'hacked'); }
  speedMul(p: SimPlayer) {
    if (this.tired(p) || this.has(p, 'stun') || this.has(p, 'root')) return 0;
    let m = 1;
    if (this.has(p, 'speed')) m *= 1.55;
    if (this.has(p, 'slow')) m *= 0.55;
    if (this.has(p, 'charm')) m *= 0.5;
    if (p.bot) m *= this.bot.speed;
    if (this.paint && p.team >= 0) m *= paintSpeed(this.paint, this.map, p.team, p.x, p.y);
    return m;
  }
  hitR(_p: SimPlayer) { return PLAYER_R; }

  flags(p: SimPlayer): number {
    let f = 0;
    if (p.alive) f |= FLAG.alive;
    if (p.inQuiz) f |= FLAG.quiz;
    if (p.bot) f |= FLAG.bot;
    if (!p.connected) f |= FLAG.away;
    if (this.now - p.lastCombatAt < COMBAT_LOCK_MS) f |= FLAG.combat;
    if (p.sh > MAX_SHIELD) f |= FLAG.overshield;
    if (p.en <= 0) f |= FLAG.tired;
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
      if (this.side) { this.moveKb(p, mul, dt); }
      else {
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
      // Walking spends energy (knockback and jumps do not).
      const walked = Math.hypot(nx - p.x, ny - p.y);
      if (walked > 0.2) {
        this.spend(p, walked * STEP_COST);
        if (p.en <= 0) { nx = p.x; ny = p.y; } // ran dry: this step does not happen (the phone was pinned here)
      }
      if (Math.abs(p.vx) + Math.abs(p.vy) > 1) {
        nx += p.vx * dt;
        ny += p.vy * dt;
        const k = Math.exp(-dt * 7);
        p.vx *= k;
        p.vy *= k;
      } else { p.vx = 0; p.vy = 0; }
      [p.x, p.y] = moveCircle(this.map, p.x, p.y, nx - p.x, ny - p.y);
      }
      p.wvx = (p.x - p.px) / dt; p.wvy = (p.y - p.py) / dt;
      if (!p.alive) continue; // knocked off the stage this tick
      if (this.paint && !p.inQuiz) this.paintAt(p.x, p.y + TILE / 2, PAINT_R, p.team, p); // the block under your feet

      // Regeneration.
      const maxHp = this.maxHp(p);
      if (this.has(p, 'regen') && p.hp < maxHp) p.hp = Math.min(maxHp, p.hp + 5 * dt);
      if (now - p.lastDmgAt > SHIELD_REGEN_DELAY && p.sh < MAX_SHIELD) p.sh = Math.min(MAX_SHIELD, p.sh + SHIELD_REGEN * dt);
      if (p.sh > MAX_SHIELD) p.sh = Math.max(MAX_SHIELD, p.sh - 2 * dt);

      // Attacks and powers.
      if (p.pendingShot || p.attackHeld) this.fire(p);

      // Burrows.
      if (!this.side && now >= p.burrowReadyAt) {
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
        if (now >= b.readyAt && (b.x - p.x) ** 2 + (b.y - p.y) ** 2 < 42 * 42) this.openBox(p, b);
      }
    }

    // Player–player separation (soft), so crowds do not stack on one pixel.
    for (let i = 0; i < (this.side ? 0 : this.players.length); i++) {
      const a = this.players[i];
      if (!a.alive || !a.connected) continue;
      for (let j = i + 1; j < this.players.length; j++) {
        const b = this.players[j];
        if (!b.alive || !b.connected) continue;
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

    if (this.settings.goal > 0) {
      const w = this.players.find((p) => p.dia >= this.settings.goal);
      if (w) { this.winner = w.idx; this.ended = true; }
    }
    if (now >= this.settings.durationMs) this.ended = true;
    if (this.ended && this.teams) this.winnerTeam = this.teamCells.indexOf(Math.max(...this.teamCells));
  }

  /** Knockback movement: phones report their own physics, bots run it here. Off the stage = out. */
  private moveKb(p: SimPlayer, mul: number, dt: number) {
    const ox = p.x;
    if (p.body) {
      const b = p.body;
      const jump = p.jumpQ, down = p.downQ;
      p.jumpQ = p.downQ = false;
      b.airMax = 1 + p.jumps;
      kbStep(this.map, b, Math.max(-1, Math.min(1, p.mx)), jump, down, mul, dt);
      p.x = b.x; p.y = b.y;
    } else if (p.hasT) { p.x = p.tx; p.y = p.ty; }
    // walking spends energy (flying from a hit does not)
    const walked = Math.min(Math.abs(p.x - ox), KB_SPEED * mul * dt * 1.2);
    if (walked > 0.2) this.spend(p, walked * STEP_COST);
    if (this.game === 'kb' ? outOfStage(this.map, p.x, p.y) : p.y > this.map.h + 200 || p.y < -400) {
      const by = this.now - p.lastHitAt < 7000 ? this.players[p.lastHitBy] : undefined;
      this.ko(p, by);
    }
  }

  /* ---------------------------------------------------------- Color Clash */
  /** Paint the cells within r of (x, y) for a team; the painter scores one point per cell taken. */
  paintAt(x: number, y: number, r: number, team: number, by: SimPlayer | null) {
    const grid = this.paint, mask = this.paintable;
    if (!grid || !mask || team < 0) return 0;
    const cols = paintCols(this.map), rows = paintRows(this.map), v = team + 1;
    const c0 = Math.max(0, Math.floor((x - r) / PAINT_CELL)), c1 = Math.min(cols - 1, Math.floor((x + r) / PAINT_CELL));
    const r0 = Math.max(0, Math.floor((y - r) / PAINT_CELL)), r1 = Math.min(rows - 1, Math.floor((y + r) / PAINT_CELL));
    let n = 0;
    for (let cy = r0; cy <= r1; cy++)
      for (let cx = c0; cx <= c1; cx++) {
        const i = cy * cols + cx;
        if (!mask[i] || grid[i] === v) continue;
        const dx = (cx + 0.5) * PAINT_CELL - x, dy = (cy + 0.5) * PAINT_CELL - y;
        if (dx * dx + dy * dy > r * r) continue;
        if (grid[i]) this.teamCells[grid[i] - 1]--;
        grid[i] = v;
        this.teamCells[team]++;
        this.paintDirty.set(i, v);
        n++;
      }
    if (by) by.dia += n;
    return n;
  }

  /** Paint changes since the last call, as events for the snapshot. */
  takePaint(): Ev[] {
    if (!this.paint) return [];
    const out: Ev[] = [];
    if (this.paintDirty.size) {
      const e: Ev = ['pd'];
      for (const [i, v] of this.paintDirty) e.push(i, v);
      this.paintDirty.clear();
      out.push(e);
    }
    const ts = this.teamCells.join(',');
    if (ts !== this.teamsSent) { this.teamsSent = ts; out.push(['ts', ...this.teamCells]); }
    return out;
  }

  /** Aim help: if a rival is within a small angle of where you aim and in range, aim where they
      will be when the shot arrives (speed 0 = instant / thrown to a point). */
  assist(p: SimPlayer, speed: number, range: number, cone = 0.16): number {
    const sx = p.x, sy = p.y - 18;
    let best: SimPlayer | null = null, bestErr = cone;
    for (const q of this.players) {
      if (!this.foe(p, q) || this.has(q, 'invis')) continue;
      const dx = q.x - sx, dy = q.y - 22 - sy, d = Math.hypot(dx, dy);
      if (d > range + 40 || d < 1) continue;
      let err = Math.atan2(dy, dx) - p.aim;
      while (err > Math.PI) err -= Math.PI * 2;
      while (err < -Math.PI) err += Math.PI * 2;
      // a wider cone up close, where a few degrees miss by little anyway
      if (Math.abs(err) < bestErr * (d < 180 ? 1.6 : 1)) { bestErr = Math.abs(err); best = q; }
    }
    if (!best) return p.aim;
    let tx = best.x, ty = best.y - 22;
    if (speed > 0) {
      for (let i = 0; i < 2; i++) {
        const tt = Math.min(0.9, Math.hypot(tx - sx, ty - sy) / speed);
        tx = best.x + best.wvx * tt; ty = best.y - 22 + best.wvy * tt;
      }
    }
    return Math.atan2(ty - sy, tx - sx);
  }

  /* ------------------------------------------------------------- weapons */
  setWeapon(p: SimPlayer, w: number, keep = false) {
    if (w === 0 && p.main) { w = p.main; keep = true; } // a box gadget ran out: back to your own
    const def = WEAPONS[w];
    p.weapon = w;
    p.ammo = keep ? INF : def.ammo;
    p.weaponUntil = !keep && def.lasts ? this.now + def.lasts * 1000 : 0;
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
    this.spend(p, def.en);
    if (def.kind !== 'melee') p.aim = this.assist(p, def.kind === 'grenade' ? 0 : def.speed, def.range);
    if (p.fx.invis && this.has(p, 'invis')) { p.fx.invis = 0; this.ev(['rv', p.idx]); }
    p.lastCombatAt = this.now;
    const a = p.aim, cx = Math.cos(a), cy = Math.sin(a);
    const dmgMul = 1;
    const sx = p.x + cx * (PLAYER_R + 12), sy = p.y - 18 + cy * (PLAYER_R + 12);
    switch (def.kind) {
      case 'melee': {
        this.ev(['sw', p.idx, aimToByte(a)]);
        for (const q of this.players) {
          if (!this.foe(p, q)) continue;
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
          if (d > def.range + this.hitR(q)) continue;
          let da = Math.atan2(dy, dx) - a;
          while (da > Math.PI) da -= Math.PI * 2;
          while (da < -Math.PI) da += Math.PI * 2;
          if (Math.abs(da) > 1.0 && d > PLAYER_R * 1.5) continue;
          this.damage(q, def.dmg * dmgMul, p, (dx / (d || 1)) * def.kb, (dy / (d || 1)) * def.kb);
        }
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
      if (pr.homing) this.steer(pr, dt);
      const steps = 2;
      let dead = false;
      for (let s = 0; s < steps && !dead; s++) {
        const ox = pr.x, oy = pr.y;
        pr.x += (pr.vx * dt) / steps;
        pr.y += (pr.vy * dt) / steps;
        pr.dist += (Math.hypot(pr.vx, pr.vy) * dt) / steps;
        if (hitsWall(this.map, pr.x, pr.y + this.lift, pr.r)) {
          if (!pr.bounces) { dead = true; break; }
          // Bounce: flip the axis that hit the wall.
          pr.bounces--;
          if (hitsWall(this.map, pr.x, oy + this.lift, pr.r)) pr.vx = -pr.vx;
          if (hitsWall(this.map, ox, pr.y + this.lift, pr.r)) pr.vy = -pr.vy;
          pr.x = ox; pr.y = oy; pr.hit.clear();
          this.ev(['rf', pr.id, Math.round(pr.x), Math.round(pr.y), aimToByte(Math.atan2(pr.vy, pr.vx))]);
          continue;
        }
        const ow = this.players[pr.owner];
        for (const q of this.players) {
          if (pr.hit.has(q.idx) || !(ow ? this.foe(ow, q) : q.alive && q.connected)) continue;
          const rr = this.hitR(q) + pr.r;
          if ((q.x - pr.x) ** 2 + (q.y - 22 - pr.y) ** 2 > (rr + 8) ** 2) continue;
          if (pr.explode) { dead = true; break; }
          const owner = this.players[pr.owner];
          const l = Math.hypot(pr.vx, pr.vy) || 1;
          this.damage(q, pr.dmg, owner, (pr.vx / l) * pr.kb, (pr.vy / l) * pr.kb);
          if (q.alive) this.onProjHit(pr, q, owner);
          pr.hit.add(q.idx);
          if (!pr.pierce) { dead = true; break; }
        }
        if (pr.dist >= pr.range) dead = true;
      }
      if (dead) {
        if (pr.explode) this.explode(pr.x, pr.y, pr.explode, pr.dmg, pr.kb, this.players[pr.owner], pr.kind === PJ.mic ? 'mic' : 'eraser', 0);
        else if (this.paint) this.paintAt(pr.x + Math.sign(pr.vx) * 8, pr.y + Math.sign(pr.vy) * 8, SPLAT_R, this.players[pr.owner]?.team ?? -1, this.players[pr.owner] ?? null);
        this.ev(['ph', pr.id, Math.round(pr.x), Math.round(pr.y)]);
      } else keep.push(pr);
    }
    this.projs = keep;
  }

  /** Homing projectiles (cats) turn toward the nearest rival in front of them. */
  private steer(pr: Proj, dt: number) {
    let best: SimPlayer | null = null, bd = 340 * 340;
    for (const q of this.players) {
      const ow = this.players[pr.owner];
      if (pr.hit.has(q.idx) || !ow || !this.foe(ow, q) || this.has(q, 'invis')) continue;
      const d = (q.x - pr.x) ** 2 + (q.y - 22 - pr.y) ** 2;
      if (d < bd) { bd = d; best = q; }
    }
    if (!best) return;
    const sp = Math.hypot(pr.vx, pr.vy);
    let da = Math.atan2(best.y - 22 - pr.y, best.x - pr.x) - Math.atan2(pr.vy, pr.vx);
    while (da > Math.PI) da -= Math.PI * 2;
    while (da < -Math.PI) da += Math.PI * 2;
    const a = Math.atan2(pr.vy, pr.vx) + Math.max(-4 * dt, Math.min(4 * dt, da));
    pr.vx = Math.cos(a) * sp; pr.vy = Math.sin(a) * sp;
  }

  /** Extra effect of a power projectile on the rival it hit. */
  private onProjHit(pr: Proj, q: SimPlayer, owner: SimPlayer | undefined) {
    switch (pr.kind) {
      case PJ.clipboard: this.status(q, 'root', 2500); break;
      case PJ.curl: this.status(q, 'slow', 3000); break;
      case PJ.pad: this.status(q, 'stun', 1500); break;
      case PJ.choco:
        if (owner?.alive) { owner.hp = Math.min(this.maxHp(owner), owner.hp + 15); this.give(owner, 'speed', 3000); }
        break;
    }
  }

  explode(x: number, y: number, r: number, dmg: number, kb: number, owner: SimPlayer | undefined, kind: string, stun: number) {
    this.ev(['ex', Math.round(x), Math.round(y), r, kind], true);
    if (this.paint && owner) this.paintAt(x, y, r * 1.1, owner.team, owner);
    const slow = kind === 'mic';
    for (const q of this.players) {
      if (owner ? !this.foe(owner, q) : !q.alive || !q.connected) continue;
      const dx = q.x - x, dy = q.y - y, d = Math.hypot(dx, dy);
      if (d > r + this.hitR(q)) continue;
      const f = 1 - Math.min(1, d / (r + PLAYER_R)) * 0.5;
      this.damage(q, dmg * f, owner, (dx / (d || 1)) * kb, (dy / (d || 1)) * kb);
      if (stun && q.alive) this.status(q, 'stun', stun);
      if (slow && q.alive) this.status(q, 'slow', 2000);
    }
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
    if (this.has(q, 'invuln') || this.has(q, 'barrier')) return true;
    if (q.inQuiz && this.now - q.lastCombatAt > COMBAT_LOCK_MS) return true;
    return false;
  }

  damage(q: SimPlayer, amount: number, src: SimPlayer | undefined, kbx: number, kby: number) {
    if (!q.alive) return;
    if (this.protectedNow(q)) {
      this.ev(['bk', q.idx]);
      return;
    }
    if (src && !this.foe(src, q) && src !== q) return;
    const dmg = Math.max(1, Math.round(amount * (src?.bot ? this.bot.dmg : 1)));
    q.lastDmgAt = this.now;
    q.lastCombatAt = this.now;
    if (src) { src.lastCombatAt = this.now; q.lastHitBy = src.idx; q.lastHitAt = this.now; }
    let absorbed = 0;
    if (this.game === 'kb') {
      // Knockback: no health. Damage raises your %, and the % multiplies how far you fly.
      q.pct = Math.min(999, q.pct + dmg * 0.8);
      const l = Math.hypot(kbx, kby);
      let dx = l ? kbx / l : 0, dy = l ? kby / l : 0;
      if (!l && src) { const sl = Math.hypot(q.x - src.x, q.y - src.y) || 1; dx = (q.x - src.x) / sl; dy = (q.y - src.y) / sl; }
      // heavier (the "Weight" upgrade) = flies less far
      const mag = Math.min(2800, (220 + l * 0.7 + dmg * 5) * (1 + q.pct / 60) * (100 / this.maxHp(q)));
      kbx = dx * mag;
      kby = dy * mag * 0.6 - mag * 0.5; // always launch upward a bit
    } else {
      absorbed = Math.min(q.sh, dmg);
      q.sh -= absorbed;
      q.hp -= dmg - absorbed;
    }
    if (kbx || kby) {
      if (q.body) { q.body.vx += kbx; q.body.vy = Math.min(q.body.vy, 0) + kby; q.body.ground = false; }
      else if (!this.side) { q.vx += kbx; q.vy += kby; }
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
    q.respawnAt = this.now + respawnMs(this.game);
    q.pct = 0;
    q.jumps = 0;
    q.streak = 0;
    q.vx = q.vy = 0;
    q.borrowed = -1;
    q.bCharges = 0;
    q.costume = -1;
    q.fx = {};
    q.inQuiz = false;
    q.attackHeld = false;
    q.pendingShot = false;
    if (q.weapon !== q.main) { q.weapon = q.main; q.ammo = INF; q.weaponUntil = 0; }
    const keep = upValue('ins', q.ups.ins) / 100;
    // Color Clash: diamonds are your paint points, a KO does not take them.
    const lost = this.paint ? 0 : Math.floor(q.dia * KO_LOSS * (1 - keep));
    q.dia -= lost;
    if (killer && killer !== q) killer.kos++;
    this.ev(['ko', q.idx, killer ? killer.idx : -1, lost], true);
    if (lost > 0) {
      // Knockback: whoever launched you takes them (+ a bonus); on the lawn they spill as gems.
      if (this.game === 'kb') { if (killer && killer !== q) { killer.dia += lost + 25; this.ev(['gc', 0, killer.idx, lost + 25]); } }
      else this.burstGems(q.x, q.y, lost, q.idx, 900);
    } else if (this.game === 'kb' && killer && killer !== q) { killer.dia += 25; this.ev(['gc', 0, killer.idx, 25]); }
  }

  respawn(p: SimPlayer) {
    const b = p.team >= 0 ? this.base(p.team) : this.map.burrows[Math.floor(this.rand() * this.map.burrows.length)];
    p.alive = true;
    p.hp = this.maxHp(p);
    p.sh = MAX_SHIELD;
    p.fx = { invuln: this.now + SPAWN_INVULN_MS };
    p.burrowReadyAt = this.now + BURROW_COOLDOWN;
    this.teleport(p, b.x, b.y + 62, 'spawn', b.id);
  }

  teleport(p: SimPlayer, x: number, y: number, kind: string, extra = -1) {
    const fx = p.x, fy = p.y;
    [p.x, p.y] = resolve(this.map, x, y);
    p.px = p.x; p.py = p.y;
    if (p.body) { p.body.x = p.x; p.body.y = p.y; p.body.vx = p.body.vy = 0; if (kind === 'spawn' && this.game === 'kb') standOn(p.body, PED_MS / 1000); }
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

  /* Energy: spent by walking and shooting, refilled only by correct answers. */
  spend(p: SimPlayer, amount: number) {
    if (p.en <= 0) return;
    p.en = Math.max(0, p.en - amount * energyMul(p.ups));
    if (p.en <= 0) {
      p.attackHeld = false;
      p.pendingShot = false;
      this.ev(['ne', p.idx], true);
      // Pin a phone's character where the host has it, so its prediction stops too.
      if (p.peer && !p.bot && !this.side) this.teleport(p, p.x, p.y, 'hold');
    }
  }

  /** Fixed mystery boxes spread over the map. Call again with a bigger number to add more. */
  setupBoxes(count: number) {
    const spots = [...this.boxes.values()];
    if (this.game === 'kb') count = Math.min(count, Math.round(this.map.plats.length * 1.3));
    if (this.map.tiles) count = Math.min(count, 18);
    for (let tries = 0; this.boxes.size < count && tries < count * 40; tries++) {
      const [x, y] = this.side ? this.ledgeSpot() : freeSpot(this.map, this.rand, 110);
      const gap = tries < count * 25 ? 190 : 120;
      if (spots.some((o) => (o.x - x) ** 2 + (o.y - y) ** 2 < gap * gap)) continue;
      const b: Box = { id: this.id(), x, y, readyAt: 0 };
      this.boxes.set(b.id, b);
      spots.push(b);
      this.ev(['bx', b.id, Math.round(x), Math.round(y)]);
    }
  }

  /** A spot standing on a random platform (knockback boxes). */
  private ledgeSpot(): [number, number] {
    if (this.map.tiles) {
      // Color Clash: on top of a block with two free blocks above it, away from the outer walls
      const { cols, rows, grid } = this.map.tiles;
      for (let k = 0; k < 60; k++) {
        const c = 3 + Math.floor(this.rand() * (cols - 6)), r = 3 + Math.floor(this.rand() * (rows - 4));
        if (grid[r * cols + c] && !grid[(r - 1) * cols + c] && !grid[(r - 2) * cols + c]) return [(c + 0.5) * TILE, r * TILE];
      }
    }
    const pl = this.map.plats[Math.floor(this.rand() * this.map.plats.length)];
    return [pl.x + 50 + this.rand() * Math.max(1, pl.w - 100), pl.y];
  }

  openBox(p: SimPlayer, b: Box) {
    b.readyAt = this.now + BOX_COOLDOWN_MS;
    p.boxes++;
    if (this.paint) {
      // Color Clash: every box is a paint bomb, and half of them also hold an item.
      // …and a spring: one more jump in the air (stacks)
      const n = this.paintAt(b.x, b.y, TILE * 3.2, p.team, p);
      if (p.jumps < MAX_EXTRA_JUMPS) p.jumps++;
      this.ev(['ex', Math.round(b.x), Math.round(b.y), 150, 'paint'], true);
      this.boxItem(p, b, -1, n);
      return;
    }
    // 1) Diamonds: every box adds, multiplies or cuts them.
    const oi = this.pick(DIA_OUTCOMES);
    const o = DIA_OUTCOMES[oi];
    let dia: number;
    if (o.kind === 'add') dia = Math.round(o.v * upValue('box', p.ups.box));
    else if (o.kind === 'mul') dia = Math.round(p.dia * (o.v - 1));
    else dia = -Math.floor(p.dia * (o.v / 100) * (1 - upValue('ins', p.ups.ins) / 100));
    p.dia += dia;
    if (dia < 0) {
      // what you lose spills out as gems anyone can grab (you can pick them back after 1.5 s)
      this.burstGems(p.x, p.y, -dia, p.idx, 1500);
      this.ev(['ex', Math.round(p.x), Math.round(p.y), 60, 'trap'], true);
    }
    this.boxItem(p, b, oi, dia);
  }

  /** Half of the boxes also hold an item; then tell everyone what came out. */
  private boxItem(p: SimPlayer, b: Box, oi: number, dia: number) {
    let ei = -1, param = 0;
    if (this.rand() < 0.5) {
      ei = this.pick(BOX_EFFECTS);
      switch (BOX_EFFECTS[ei].id) {
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
      }
    }
    this.ev(['bo', b.id, p.idx, ei, param, dia, oi], true);
  }

  /** Weighted random index. */
  private pick(list: { w: number }[]) {
    let r = this.rand() * list.reduce((s, e) => s + e.w, 0);
    for (let i = 0; i < list.length; i++) { r -= list[i].w; if (r <= 0) return i; }
    return list.length - 1;
  }

  /* --------------------------------------------------------------- zones */
  stepZones() {
    const now = this.now;
    this.zones = this.zones.filter((z) => z.until > now);
    for (const z of this.zones) {
      for (const q of this.players) {
        const ow = this.players[z.owner];
        if (ow ? !this.foe(ow, q) : !q.alive || !q.connected) continue;
        if ((q.x - z.x) ** 2 + (q.y - z.y) ** 2 > z.r * z.r) continue;
        this.give(q, 'slow', 300);
        if (this.tick % 10 === 0) this.damage(q, 2.4, this.players[z.owner], 0, 0);
      }
    }
  }

  /* -------------------------------------------------------------- powers */
  enemiesIn(p: SimPlayer, x: number, y: number, r: number) {
    return this.players.filter((q) => this.foe(p, q) && (q.x - x) ** 2 + (q.y - y) ** 2 < (r + this.hitR(q)) ** 2);
  }
  inCone(p: SimPlayer, range: number, half: number) {
    return this.players.filter((q) => {
      if (!this.foe(p, q)) return false;
      const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy);
      if (d > range + PLAYER_R) return false;
      let da = Math.atan2(dy, dx) - p.aim;
      while (da > Math.PI) da -= Math.PI * 2;
      while (da < -Math.PI) da += Math.PI * 2;
      return Math.abs(da) < half || d < PLAYER_R * 2;
    });
  }
  status(q: SimPlayer, f: Fx, ms: number) {
    if (this.protectedNow(q)) { this.ev(['bk', q.idx]); return; }
    this.give(q, f, ms);
    this.ev(['st', q.idx, f]);
    // Movement locks: pin the player where the host has them, so the phone stops predicting.
    if ((f === 'root' || f === 'stun') && q.peer && !q.bot && !this.side) this.teleport(q, q.x, q.y, 'hold');
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
    if (POWERS[id]?.aimed) p.aim = this.assist(p, 700, 560, 0.22);
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
    const sx = p.x + cx * 30, sy = p.y - 18 + cy * 30;
    const throwIt = (kind: number, speed: number, range: number, dmg: number, kb: number, r: number, o: Partial<Proj> = {}, off = 0) => {
      this.spawnProj(p, kind, sx, sy, a + off, speed, range, dmg, kb, r, !!o.pierce, o.explode ?? 0);
      Object.assign(this.projs[this.projs.length - 1], o);
    };
    const cone = (range: number, half: number, kind: number) => { this.ev(['cone', p.idx, aimToByte(a), range, kind]); return this.inCone(p, range, half); };
    switch (id) {
      case 'camila':
        for (const q of this.enemiesIn(p, p.x, p.y, 175)) this.status(q, 'charm', 2500);
        this.ev(['wave', Math.round(p.x), Math.round(p.y), 175, 0]);
        return true;
      case 'sofia':
        for (const q of cone(250, 0.62, 0)) this.status(q, 'blind', 3000);
        return true;
      case 'gabriel':
        for (const off of [-0.18, 0, 0.18]) throwIt(PJ.card, 900, 520, 14, 120, 10, { pierce: true }, off);
        return true;
      case 'sander':
        for (const q of cone(240, 0.75, 2)) {
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
          this.damage(q, 10, p, (dx / d) * 420, (dy / d) * 420);
          if (q.alive) this.status(q, 'stun', 1000);
        }
        return true;
      case 'nataly':
      case 'julian':
        throwIt(PJ.laptop, 620, 480, 28, 520, 14);
        return true;
      case 'anyela':
        for (let i = -2; i <= 2; i++) throwIt(PJ.book, 620, 470, 14, 280, 12, {}, i * 0.2);
        return true;
      case 'freddy':
        this.give(p, 'speed', 3500);
        for (const q of this.enemiesIn(p, p.x, p.y, 160)) {
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
          this.damage(q, 4, p, (dx / d) * 420, (dy / d) * 420);
        }
        this.ev(['wave', Math.round(p.x), Math.round(p.y), 160, 2]);
        return true;
      case 'andres':
        for (const q of cone(125, 1.1, 3)) {
          const dx = q.x - p.x, dy = q.y - p.y, d = Math.hypot(dx, dy) || 1;
          this.damage(q, 26, p, (dx / d) * 320, (dy / d) * 320);
          if (q.alive) this.status(q, 'stun', 1000);
        }
        return true;
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
      case 'valentina':
        throwIt(PJ.curl, 760, 560, 16, 90, 12, { pierce: true });
        return true;
      case 'esteban':
        for (const q of this.enemiesIn(p, p.x, p.y, 320)) {
          this.damage(q, 12, p, 0, 0);
          if (q.alive) { this.status(q, 'hacked', 3000); q.attackHeld = false; }
        }
        this.ev(['wave', Math.round(p.x), Math.round(p.y), 320, 3]);
        return true;
      case 'sebastian':
        for (const off of [-0.35, 0, 0.35]) throwIt(PJ.cat, 430, 700, 12, 160, 13, { homing: true }, off);
        return true;
      case 'javier':
        throwIt(PJ.pad, 700, 520, 18, 160, 12);
        return true;
      case 'anny':
        throwIt(PJ.choco, 720, 520, 22, 200, 12);
        return true;
      case 'estephania':
        throwIt(PJ.ball, 640, 1400, 18, 260, 13, { pierce: true, bounces: 4 });
        return true;
      case 'dager': this.give(p, 'barrier', 4000); p.sh = Math.max(p.sh, MAX_SHIELD); return true;
      case 'liliana':
        throwIt(PJ.mic, 600, 440, 24, 260, 13, { explode: 105 });
        return true;
      case 'norvey': {
        let ex = p.x, ey = p.y - 20;
        for (let s = 0; s < 52; s++) {
          const nx = ex + cx * 12, ny = ey + cy * 12;
          if (hitsWall(this.map, nx, ny + 20, 3)) break;
          ex = nx; ey = ny;
        }
        for (const q of this.players) {
          if (!this.foe(p, q)) continue;
          const t = Math.max(0, Math.min(1, ((q.x - p.x) * (ex - p.x) + (q.y - p.y) * (ey - p.y + 20)) / (((ex - p.x) ** 2 + (ey - p.y + 20) ** 2) || 1)));
          const d = Math.hypot(p.x + (ex - p.x) * t - q.x, p.y - 20 + (ey - p.y + 20) * t - (q.y - 20));
          if (d < this.hitR(q) + 14) this.damage(q, 30, p, cx * 160, cy * 160);
        }
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
        for (const q of cone(250, 0.7, 1)) this.status(q, 'confuse', 3000);
        return true;
      case 'jalbleidy':
        throwIt(PJ.clipboard, 720, 540, 8, 60, 14);
        return true;
      case 'juanpablo': {
        const [tx, ty] = at(Math.min(360, Math.max(80, p.ad)));
        const z: Zone = { id: this.id(), x: tx, y: ty, r: 108, until: this.now + 5000, owner: p.idx };
        this.zones.push(z);
        this.ev(['zn', z.id, 1, Math.round(tx), Math.round(ty), 108, 5000, p.idx]);
        return true;
      }
      case 'vanessa': {
        let best: SimPlayer | null = null, bd = 420;
        for (const q of this.players) {
          if (!this.foe(p, q) || this.has(q, 'invis')) continue;
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
      p.en += gain;
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

  /** Knockback arsenal: buy a weapon with energy (once) or equip one you own. */
  buyWeapon(p: SimPlayer, w: number): boolean {
    const item = KB_ARSENAL.find((a) => a.w === w);
    if (this.game !== 'kb' || !item || !p.alive) return false;
    if (!(p.owned & (1 << w))) {
      if (p.en < item.cost) return false;
      p.en -= item.cost;
      p.owned |= 1 << w;
    }
    p.main = w;
    this.setWeapon(p, w, true);
    this.ev(['wb', p.idx, w, p.owned, item.cost]);
    return true;
  }

  buy(p: SimPlayer, k: UpKey): boolean {
    const u = UPGRADES.find((x) => x.id === k);
    if (!u) return false;
    const next = p.ups[k] + 1;
    if (next >= u.values.length) return false;
    const cost = u.costs[next];
    if (p.en < cost) return false;
    p.en -= cost;
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
      this.lookChar(q), q.weapon, q.ammo, this.maxHp(q), q.borrowed, q.bCharges, Math.ceil(q.en), q.team, Math.round(q.pct), q.jumps, q.owned,
    ]);
    return { t: Math.round(this.now), p, r: Math.round(this.remainingMs) };
  }

  full() {
    return {
      t: Math.round(this.now),
      boxes: [...this.boxes.values()].map((b) => [b.id, Math.round(b.x), Math.round(b.y), Math.max(0, Math.round(b.readyAt - this.now))]),
      gems: [...this.gems.values()].map((g) => [g.id, Math.round(g.x), Math.round(g.y), g.v]),
      zones: this.zones.map((z) => [z.id, 1, Math.round(z.x), Math.round(z.y), z.r, Math.round(z.until - this.now), z.owner]),
      ups: this.players.map((q) => upsToArr(q.ups)),
      streaks: this.players.map((q) => q.streak),
      cds: this.players.map((q) => Math.max(0, Math.round(q.powerReadyAt - this.now))),
      paint: this.paint ? rle(this.paint) : null,
      ts: this.teamCells,
    };
  }
}

/** Color Clash speed: a bit faster on your colour, slower on a rival's (the phones use it too). */
export function paintSpeed(grid: Uint8Array, map: GameMap, team: number, x: number, y: number) {
  const cols = paintCols(map);
  if (map.tiles) y += TILE / 2; // side view: the block you stand on
  const v = grid[Math.floor(y / PAINT_CELL) * cols + Math.floor(x / PAINT_CELL)] ?? 0;
  return !v ? 1 : v === team + 1 ? 1.18 : 0.85;
}

/** Run-length encoding [value, count, value, count…] for the full paint grid. */
export function rle(a: Uint8Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < a.length;) {
    let j = i;
    while (j < a.length && a[j] === a[i]) j++;
    out.push(a[i], j - i);
    i = j;
  }
  return out;
}
export function unrle(r: number[], into: Uint8Array) {
  let k = 0;
  for (let i = 0; i + 1 < r.length; i += 2) { into.fill(r[i], k, k + r[i + 1]); k += r[i + 1]; }
}
