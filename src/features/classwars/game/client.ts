/* Class Wars — a player's session (phone / laptop). Predicts its own movement, sends input only
   when it changes (≤ 12.5 msg/s), and draws everyone else ~110 ms in the past by interpolating
   the host's 10 Hz snapshots. */
import { Relay, type Envelope, type NetStatus } from '@/lib/relay';
import {
  BASE_SPEED, FLAG, INPUT_MS, INTERP_MS, aimToByte, byteToAim, lerp, lerpAngle, speedFromFlags,
} from './constants';
import { CHAR_IDS, POWERS, UPGRADES, WEAPONS, answerGain, freshUps, upsFromArr, type Ups } from './defs';
import { generateMap, moveCircle, type GameMap } from './map';
import type { Ev } from './sim';
import { VisualWorld } from './vis';
import { decAnswer, type Result } from './host';

export interface RosterEntry { idx: number; peer: string; name: string; char: number; guest: boolean; bot: boolean }
/** One player as drawn this frame. */
export interface RP {
  idx: number; x: number; y: number; aim: number; hp: number; sh: number; dia: number; en: number; flags: number; look: number;
  weapon: number; ammo: number; maxHp: number; borrowed: number; charges: number; name: string; me: boolean; bot: boolean;
}
export interface ServedQ { id: number; q: string; o: string[]; a: number }

type SnapRow = number[];
interface Snap { t: number; p: Map<number, SnapRow>; r: number }

export interface RenderSource {
  map: GameMap;
  vis: VisualWorld;
  myIdx: number;
  players(): RP[];
  remainingMs(): number;
  paused(): boolean;
}

export class ClientSession implements RenderSource {
  relay: Relay;
  peer: string;
  code: string;
  name: string;
  char: number;
  uid: string | null;
  phase: 'connecting' | 'lobby' | 'playing' | 'ended' | 'kicked' | 'full' = 'connecting';
  net: NetStatus = 'connecting';
  lobby: { peer: string; name: string; char: number; guest: boolean }[] = [];
  maxPlayers = 0;
  map!: GameMap;
  vis!: VisualWorld;
  roster = new Map<number, RosterEntry>();
  myIdx = -1;
  salt = 0;
  durMs = 0;
  /** Energy everyone started with (the HUD bar's full mark). */
  startEnergy = 1200;
  goal = 0;
  isPaused = false;
  /** Host time when we received 'start' (0 = we were there from the beginning). */
  joinedAtMs = 0;
  results: Result[] = [];
  winner = -1;
  version = 0;
  private listeners = new Set<() => void>();
  private snaps: Snap[] = [];
  /** performance.now() of the last snapshot (host-lost detection). */
  lastSnapLocal = 0;
  private offset = 0; // host time − local time
  private offsetReady = false;
  private off: () => void;
  private offStatus: () => void;

  /* own prediction */
  me = { x: 0, y: 0, vx: 0, vy: 0, fv: 0, alive: true };
  input = { mx: 0, my: 0, aim: 0, ad: 200, held: false, atkC: 0, powC: 0, bonC: 0, target: null as null | { x: number; y: number } };
  private lastSent = { x: -1, y: -1, a: -1, ad: -1, b: -1, c: -1, w: -1, u: -1, fv: -1 };
  private lastSendAt = 0;
  quizOpen = false;
  /* questions */
  queue: ServedQ[] = [];
  private askedMore = false;
  streak = 0;
  ups: Ups = freshUps();
  /** Local cooldown bookkeeping for the power slot. */
  powerReadyAt = 0;
  bonusReadyAt = 0;
  lastFireAt = 0;
  /** Counts for the HUD's diamond bump. */
  stats = { correct: 0, wrong: 0 };

  constructor(code: string, peer: string, name: string, char: number, uid: string | null) {
    this.code = code;
    this.peer = peer;
    this.name = name;
    this.char = char;
    this.uid = uid;
    this.relay = new Relay(code, peer, 'player');
    this.off = this.relay.on((e) => this.onMessage(e));
    this.offStatus = this.relay.onStatus((s) => {
      const was = this.net;
      this.net = s;
      if (s === 'open' && was !== 'open') this.hello();
      this.bump();
    });
    if (this.relay.status === 'open') this.hello();
  }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private bump() { this.version++; this.listeners.forEach((f) => f()); }
  close() { this.off(); this.offStatus(); this.relay.close(); }

  hello() { this.relay.send({ k: 'hello', name: this.name, char: this.char, uid: this.uid }, 'host'); }
  pick(char: number) { this.char = char; this.relay.send({ k: 'pick', char }, 'host'); this.bump(); }

  private onMessage(env: Envelope) {
    const d = env.d;
    if (env.f === '_sys') {
      if (d?.type === 'peer-join' && d.role === 'host') this.hello();
      return;
    }
    if (!d || typeof d !== 'object') return;
    switch (d.k) {
      case 'lobby':
        if (this.phase === 'connecting' || this.phase === 'lobby' || this.phase === 'ended' || this.phase === 'full') { this.phase = 'lobby'; this.myIdx = -1; }
        this.lobby = (d.players as [string, string, number, number][]).map(([peer, name, char, guest]) => ({ peer, name, char, guest: !!guest }));
        this.maxPlayers = d.max;
        this.bump();
        break;
      case 'kick': this.phase = 'kicked'; this.bump(); break;
      case 'full': if (this.phase === 'connecting') { this.phase = 'full'; this.bump(); } break;
      case 'start': this.onStart(d); break;
      case 'roster': this.setRoster(d.r); this.bump(); break;
      case 'qs':
        for (const [id, q, o, e] of d.items as [number, string, string[], number][]) this.queue.push({ id, q, o, a: decAnswer(e, id, this.salt) });
        this.askedMore = false;
        this.bump();
        break;
      case 's': this.onSnap(d); break;
      case 'pause': this.isPaused = !!d.on; this.bump(); break;
      case 'end':
        this.results = d.res;
        this.winner = d.winner;
        this.phase = 'ended';
        this.bump();
        break;
    }
  }

  private setRoster(r: (string | number)[][]) {
    for (const [idx, peer, name, char, guest, bot] of r as [number, string, string, number, number, number][]) this.roster.set(idx, { idx, peer, name, char, guest: !!guest, bot: !!bot });
  }

  private onStart(d: { seed: number; portals?: number; en0?: number; salt: number; dur: number; goal: number; roster: (string | number)[][]; you: number; full: { t: number; boxes: number[][]; gems: number[][]; zones: number[][]; ups: number[][]; streaks: number[]; cds: number[] }; paused: boolean }) {
    if (!this.map || this.map.seed !== d.seed || this.map.burrows.length !== (d.portals ?? 7)) {
      this.map = generateMap(d.seed, d.portals ?? 7);
      this.vis = new VisualWorld(this.map);
    }
    this.salt = d.salt;
    if (d.en0) this.startEnergy = d.en0;
    this.joinedAtMs = d.full.t;
    this.durMs = d.dur;
    this.goal = d.goal;
    this.isPaused = d.paused;
    this.setRoster(d.roster);
    this.myIdx = d.you;
    this.vis.myIdx = d.you;
    this.vis.nameOf = (i) => this.roster.get(i)?.name ?? '?';
    this.vis.loadFull(d.full);
    const u = d.full.ups[d.you];
    if (u) this.ups = upsFromArr(u);
    this.streak = d.full.streaks[d.you] ?? 0;
    this.powerReadyAt = performance.now() + (d.full.cds[d.you] ?? 0);
    this.snaps = [];
    this.offsetReady = false;
    this.me.fv = -1; // adopt the host position from the first snapshot
    this.lastSnapLocal = performance.now();
    this.phase = 'playing';
    this.bump();
  }

  private onSnap(d: { t: number; p: SnapRow[]; r: number; e: Ev[] }) {
    if (this.phase !== 'playing' || !this.map) return;
    const local = performance.now();
    this.lastSnapLocal = local;
    const off = d.t - local;
    if (!this.offsetReady) { this.offset = off; this.offsetReady = true; }
    else this.offset = off > this.offset ? lerp(this.offset, off, 0.05) : lerp(this.offset, off, 0.25);
    const p = new Map<number, SnapRow>();
    for (const row of d.p) p.set(row[0], row);
    this.snaps.push({ t: d.t, p, r: d.r });
    if (this.snaps.length > 30) this.snaps.shift();
    const mine = p.get(this.myIdx);
    if (mine) {
      if (this.me.fv === -1) { this.me.x = mine[1]; this.me.y = mine[2]; this.me.fv = 0; }
      this.me.alive = !!(mine[7] & FLAG.alive);
    }
    this.handleOwnEvents(d.e);
    this.vis.apply(d.e);
    if (d.e.length) this.bump();
  }

  private handleOwnEvents(events: Ev[]) {
    for (const e of events) {
      const k = e[0];
      if (e[1] !== this.myIdx) continue;
      if (k === 'kb') {
        this.me.vx += e[2] as number;
        this.me.vy += e[3] as number;
        this.me.fv = e[4] as number;
      } else if (k === 'tp') {
        this.me.x = e[2] as number;
        this.me.y = e[3] as number;
        this.me.vx = this.me.vy = 0;
        this.me.fv = e[4] as number;
        this.input.target = null;
      } else if (k === 'an') {
        const gain = e[2] as number;
        this.streak = e[3] as number;
        if (gain > 0) this.stats.correct++; else this.stats.wrong++;
      } else if (k === 'by') {
        const u = UPGRADES[e[2] as number];
        if (u) this.ups = { ...this.ups, [u.id]: e[3] as number };
      } else if (k === 'pw') {
        const ci = e[2] as number;
        if (e[3]) this.bonusReadyAt = performance.now() + 1200;
        else this.powerReadyAt = performance.now() + (powerCd(ci) * 1000);
      } else if (k === 'ko') {
        this.streak = 0;
        this.input.target = null;
      }
    }
  }

  /* ---------------------------------------------------------- per frame */
  hostNow() { return performance.now() + this.offset; }
  remainingMs() {
    const last = this.snaps[this.snaps.length - 1];
    if (!last) return this.durMs;
    return Math.max(0, last.r - (this.isPaused ? 0 : this.hostNow() - last.t));
  }
  paused() { return this.isPaused; }

  myRow(): SnapRow | undefined { return this.snaps[this.snaps.length - 1]?.p.get(this.myIdx); }

  /** Move our own character (prediction) and send input when it changed. */
  update(dt: number) {
    if (this.phase !== 'playing' || !this.map) return;
    const row = this.myRow();
    const flags = row ? row[7] : FLAG.alive;
    const alive = !!(flags & FLAG.alive);
    if (alive && !this.isPaused && this.me.fv !== -1) {
      let mx = this.input.mx, my = this.input.my;
      if (this.input.target) {
        const dx = this.input.target.x - this.me.x, dy = this.input.target.y - this.me.y, d = Math.hypot(dx, dy);
        if (d < 10 || Math.abs(mx) + Math.abs(my) > 0) this.input.target = null;
        else { mx = dx / d; my = dy / d; }
      }
      if (this.quizOpen) { mx = 0; my = 0; }
      if (flags & FLAG.confuse) { mx = -mx; my = -my; }
      const l = Math.hypot(mx, my);
      const sp = BASE_SPEED * speedFromFlags(flags);
      let dx = 0, dy = 0;
      if (l > 0.05 && sp > 0) { dx = (mx / Math.max(1, l)) * sp * dt; dy = (my / Math.max(1, l)) * sp * dt; }
      if (Math.abs(this.me.vx) + Math.abs(this.me.vy) > 1) {
        dx += this.me.vx * dt;
        dy += this.me.vy * dt;
        const k = Math.exp(-dt * 7);
        this.me.vx *= k;
        this.me.vy *= k;
      } else { this.me.vx = this.me.vy = 0; }
      if (dx || dy) {
        [this.me.x, this.me.y] = moveCircle(this.map, this.me.x, this.me.y, dx, dy);
      }
    }
    this.vis.update(dt);
    this.maybeSend();
    if (this.queue.length < 4 && !this.askedMore) {
      this.askedMore = true;
      this.relay.send({ k: 'more' }, 'host');
    }
  }

  private maybeSend() {
    const now = performance.now();
    if (now - this.lastSendAt < INPUT_MS) return;
    const i = this.input;
    const m = {
      x: Math.round(this.me.x), y: Math.round(this.me.y), a: aimToByte(i.aim), ad: Math.round(i.ad / 4) * 4,
      b: i.held && !this.quizOpen ? 1 : 0, c: i.atkC, w: i.powC, u: i.bonC, fv: this.me.fv,
    };
    const s = this.lastSent;
    if (m.x === s.x && m.y === s.y && m.a === s.a && m.ad === s.ad && m.b === s.b && m.c === s.c && m.w === s.w && m.u === s.u && m.fv === s.fv) return;
    if (m.x === s.x && m.y === s.y && m.b === s.b && m.c === s.c && m.w === s.w && m.u === s.u && m.fv === s.fv && Math.abs(m.a - s.a) < 3 && Math.abs(m.ad - s.ad) < 40) return;
    this.lastSent = m;
    this.lastSendAt = now;
    this.relay.send({ k: 'in', ...m }, 'host', true);
  }

  /** Attack press (counter) — also shows a cosmetic projectile right away. */
  attackPress() {
    this.input.atkC++;
    const row = this.myRow();
    if (!row || this.quizOpen || row[7] & FLAG.tired) return;
    const w = WEAPONS[row[9]] ?? WEAPONS[0];
    const now = performance.now();
    if (now - this.lastFireAt < w.cd * 0.9) return;
    this.lastFireAt = now;
    this.cosmeticShot(row);
  }
  /** Called each frame while the attack is held, for auto-fire visuals. */
  holdFire() {
    const row = this.myRow();
    if (!row || !this.input.held || this.quizOpen) return;
    const flags = row[7];
    if (!(flags & FLAG.alive) || flags & (FLAG.stun | FLAG.hacked | FLAG.charm | FLAG.tired)) return;
    const w = WEAPONS[row[9]] ?? WEAPONS[0];
    const cd = w.cd * (flags & FLAG.rapid ? 0.6 : 1);
    const now = performance.now();
    if (now - this.lastFireAt < cd) return;
    this.lastFireAt = now;
    this.cosmeticShot(row);
  }
  private cosmeticShot(row: SnapRow) {
    const w = WEAPONS[row[9]] ?? WEAPONS[0];
    const a = this.input.aim;
    if (w.kind === 'melee') { const s = this.vis.st(this.myIdx); s.swingAt = performance.now(); s.swingAim = a; }
    else this.vis.localShot(w.id, this.me.x + Math.cos(a) * 32, this.me.y - 18 + Math.sin(a) * 32, a, this.myIdx);
    this.vis.fx.push({ t: 'shoot', idx: this.myIdx, kind: w.id });
  }
  powerPress() { this.input.powC++; this.maybeSendSoon(); }
  bonusPress() { this.input.bonC++; this.maybeSendSoon(); }
  private maybeSendSoon() { setTimeout(() => this.maybeSend(), INPUT_MS); }

  setQuiz(on: boolean) {
    if (this.quizOpen === on) return;
    this.quizOpen = on;
    if (on) { this.input.held = false; this.input.target = null; }
    this.relay.send({ k: 'qz', on: on ? 1 : 0 }, 'host');
    this.bump();
  }

  answer(q: ServedQ, choice: number): { ok: boolean; gain: number } {
    const ok = choice === q.a;
    const row = this.myRow();
    const gain = ok ? answerGain(this.ups, this.streak, !!(row && row[7] & FLAG.genius)) : 0;
    this.relay.send({ k: 'ans', q: q.id, c: choice }, 'host');
    this.queue = this.queue.filter((x) => x !== q);
    if (ok) this.streak++; else this.streak = 0;
    this.bump();
    return { ok, gain };
  }

  buy(k: string) { this.relay.send({ k: 'buy', u: k }, 'host'); }

  /* ------------------------------------------------------------ render */
  players(): RP[] {
    const out: RP[] = [];
    const n = this.snaps.length;
    if (!n) return out;
    const rt = this.hostNow() - INTERP_MS;
    let a = this.snaps[0], b = this.snaps[0];
    for (let i = n - 1; i >= 0; i--) {
      if (this.snaps[i].t <= rt) { a = this.snaps[i]; b = this.snaps[Math.min(n - 1, i + 1)]; break; }
    }
    if (rt > this.snaps[n - 1].t) { a = b = this.snaps[n - 1]; }
    const span = b.t - a.t;
    const t = span > 0 ? Math.max(0, Math.min(1, (rt - a.t) / span)) : 1;
    const latest = this.snaps[n - 1];
    for (const [idx, rb] of b.p) {
      const ra = a.p.get(idx) ?? rb;
      const r = this.roster.get(idx);
      const me = idx === this.myIdx;
      const live = me ? latest.p.get(idx) ?? rb : rb;
      const tp = (ra[7] & FLAG.alive) !== (rb[7] & FLAG.alive) || Math.hypot(rb[1] - ra[1], rb[2] - ra[2]) > 260;
      out.push({
        idx,
        x: me ? this.me.x : tp ? rb[1] : lerp(ra[1], rb[1], t),
        y: me ? this.me.y : tp ? rb[2] : lerp(ra[2], rb[2], t),
        aim: me ? this.input.aim : lerpAngle(byteToAim(ra[3]), byteToAim(rb[3]), t),
        hp: live[4], sh: live[5], dia: live[6], en: live[14] ?? 0, flags: live[7], look: live[8], weapon: live[9], ammo: live[10], maxHp: live[11], borrowed: live[12], charges: live[13],
        name: r?.name ?? '?', me, bot: !!r?.bot,
      });
    }
    return out;
  }

  leaderboard() {
    const last = this.snaps[this.snaps.length - 1];
    if (!last) return [];
    return [...last.p.values()]
      .filter((r) => !(r[7] & FLAG.away) || r[6] > 0)
      .map((r) => ({ idx: r[0], name: this.roster.get(r[0])?.name ?? '?', char: r[8], dia: r[6], alive: !!(r[7] & FLAG.alive), bot: !!this.roster.get(r[0])?.bot, kos: 0 }))
      .sort((x, y) => y.dia - x.dia);
  }
}

function powerCd(ci: number) { return POWERS[CHAR_IDS[ci]]?.cd ?? 12; }
