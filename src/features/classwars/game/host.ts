/* Class Wars — the host session (teacher's projector browser, or the demo tab). Owns the
   simulation, the lobby and the questions; talks to players only through the relay:
   one broadcast snapshot every 100 ms (+ urgent events), question batches on demand. */
import { Relay, type Envelope } from '@/lib/relay';
import { awardGamePoints, type Award } from '@/features/cards/api';
import { SNAP_EVERY, TICK_MS, byteToAim, BASE_SPEED, boxCount, lerp, portalCount } from './constants';
import type { RenderSource, RP } from './client';
import { CHAR_IDS, UPGRADES } from './defs';
import { Sim, type Ev, type SimPlayer } from './sim';
import { botThink, BOT_NAMES } from './bots';
import { VisualWorld } from './vis';
import { shuffle, type Q } from './questions';
import { resolve } from './map';

export interface HostConfig {
  code: string;
  matchId: string;
  durationMin: number;
  /** Energy every player starts with. */
  startEnergy: number;
  goal: number;
  maxPlayers: number;
  questions: Q[];
  source: string;
  bots: number;
  demo: boolean;
  hostName: string;
}

export interface LobbyPlayer { peer: string; name: string; char: number; guest: boolean; uid: string | null }
export interface Result {
  idx: number; name: string; char: number; dia: number; correct: number; wrong: number; kos: number; deaths: number;
  boxes: number; streak: number; place: number; points: number; bot: boolean; guest: boolean; peer: string | null;
}

const BATCH = 8;
const salt = () => Math.floor(Math.random() * 1000);
export const encAnswer = (a: number, qid: number, s: number) => (a + ((qid * 5 + s) % 4)) % 4;
export const decAnswer = (e: number, qid: number, s: number) => (e - ((qid * 5 + s) % 4) + 8) % 4;

function ticker(ms: number, fn: () => void): () => void {
  // A worker keeps ticking when the projector tab is in the background (timers there get throttled).
  try {
    const src = `let t=setInterval(()=>postMessage(0),${ms});onmessage=()=>{clearInterval(t);close()}`;
    const url = URL.createObjectURL(new Blob([src], { type: 'text/javascript' }));
    const w = new Worker(url);
    w.onmessage = fn;
    return () => { w.postMessage(0); w.terminate(); URL.revokeObjectURL(url); };
  } catch {
    const t = setInterval(fn, ms);
    return () => clearInterval(t);
  }
}

export class HostSession {
  cfg: HostConfig;
  relay: Relay;
  phase: 'lobby' | 'playing' | 'paused' | 'ended' = 'lobby';
  lobby = new Map<string, LobbyPlayer>();
  sim: Sim | null = null;
  vis: VisualWorld | null = null;
  seed = Math.floor(Math.random() * 1e9);
  salt = salt();
  results: Result[] = [];
  winner = -1;
  version = 0;
  private listeners = new Set<() => void>();
  private peerIdx = new Map<string, number>();
  private qBags = new Map<number, { order: number[]; pos: number; served: Set<number> }>();
  private stopTick: (() => void) | null = null;
  private acc = 0;
  private last = 0;
  private lastSnapAt = 0;
  private lobbyTimer: ReturnType<typeof setTimeout> | null = null;
  private off: () => void;
  saved: 'idle' | 'saving' | 'saved' | 'error' | 'skipped' = 'idle';
  /** Events of the last flush, for the projector's own visual world. */
  constructor(cfg: HostConfig) {
    this.cfg = cfg;
    this.relay = new Relay(cfg.code, 'host-' + cfg.matchId.slice(0, 8), 'host');
    this.off = this.relay.on((e) => this.onMessage(e));
  }

  subscribe(fn: () => void) { this.listeners.add(fn); return () => { this.listeners.delete(fn); }; }
  private bump() { this.version++; this.listeners.forEach((f) => f()); }

  close() {
    this.stopTick?.();
    this.off();
    this.relay.close();
  }

  /* ---------------------------------------------------------------- lobby */
  private lobbyChanged() {
    this.bump();
    if (this.lobbyTimer) return;
    this.lobbyTimer = setTimeout(() => {
      this.lobbyTimer = null;
      this.relay.send({ k: 'lobby', players: [...this.lobby.values()].map((p) => [p.peer, p.name, p.char, p.guest ? 1 : 0]), max: this.cfg.maxPlayers });
    }, 150);
  }

  kick(peer: string) {
    this.lobby.delete(peer);
    this.relay.send({ k: 'kick' }, peer);
    this.lobbyChanged();
  }

  private onMessage(env: Envelope) {
    const d = env.d;
    if (env.f === '_sys') {
      if (d?.type === 'peer-leave') {
        if (this.phase === 'lobby') { this.lobby.delete(d.id); this.lobbyChanged(); }
        const i = this.peerIdx.get(d.id);
        if (i !== undefined && this.sim) {
          const p = this.sim.players[i];
          p.connected = false;
          p.attackHeld = false;
          this.sim.setQuiz(p, false);
          this.bump();
        }
      }
      return;
    }
    if (!d || typeof d !== 'object') return;
    const peer = env.f;
    switch (d.k) {
      case 'hello': {
        const name = String(d.name ?? '').trim().slice(0, 24) || 'Jugador';
        const char = Math.max(0, Math.min(CHAR_IDS.length - 1, Number(d.char) | 0));
        const lp: LobbyPlayer = { peer, name, char, guest: !d.uid, uid: typeof d.uid === 'string' ? d.uid : null };
        if (this.phase === 'lobby') {
          if (!this.lobby.has(peer) && this.lobby.size >= this.cfg.maxPlayers) { this.relay.send({ k: 'full' }, peer); return; }
          this.lobby.set(peer, lp);
          this.lobbyChanged();
          this.relay.send({ k: 'lobby', players: [...this.lobby.values()].map((p) => [p.peer, p.name, p.char, p.guest ? 1 : 0]), max: this.cfg.maxPlayers }, peer);
        } else if (this.sim) {
          let idx = this.peerIdx.get(peer);
          if (idx === undefined) {
            if (this.sim.players.filter((p) => !p.bot).length >= this.cfg.maxPlayers) { this.relay.send({ k: 'full' }, peer); return; }
            const p = this.sim.addPlayer({ peer, name, char, uid: lp.uid, guest: lp.guest, bot: false });
            idx = p.idx;
            this.peerIdx.set(peer, idx);
            this.sim.setupBoxes(boxCount(this.sim.players.length));
            this.relay.send({ k: 'roster', r: this.roster() });
          } else {
            const p = this.sim.players[idx];
            p.connected = true;
          }
          this.sendStart(peer);
          this.bump();
        }
        break;
      }
      case 'pick': {
        const lp = this.lobby.get(peer);
        if (lp && this.phase === 'lobby') { lp.char = Math.max(0, Math.min(CHAR_IDS.length - 1, Number(d.char) | 0)); this.lobbyChanged(); }
        break;
      }
      case 'in': this.onInput(peer, d); break;
      case 'qz': { const p = this.player(peer); if (p && this.sim) this.sim.setQuiz(p, !!d.on); break; }
      case 'more': { const p = this.player(peer); if (p) this.sendQuestions(peer, p.idx); break; }
      case 'ans': {
        const p = this.player(peer);
        if (!p || !this.sim || this.phase !== 'playing') return;
        const bag = this.qBags.get(p.idx);
        const qid = Number(d.q) | 0;
        if (!bag || !bag.served.has(qid)) return;
        bag.served.delete(qid);
        const q = this.cfg.questions[qid];
        if (q) this.sim.answer(p, Number(d.c) === q.a);
        break;
      }
      case 'buy': {
        const p = this.player(peer);
        if (p && this.sim && this.phase === 'playing') this.sim.buy(p, d.u);
        break;
      }
    }
  }

  private player(peer: string): SimPlayer | null {
    const i = this.peerIdx.get(peer);
    return i === undefined || !this.sim ? null : this.sim.players[i];
  }

  private onInput(peer: string, d: { x: number; y: number; a: number; ad: number; b: number; c: number; w: number; u: number; fv: number }) {
    const p = this.player(peer);
    const sim = this.sim;
    if (!p || !sim || this.phase !== 'playing') return;
    p.aim = byteToAim(Number(d.a) & 255);
    p.ad = Math.max(0, Math.min(600, Number(d.ad) || 0));
    p.attackHeld = !!d.b && !p.inQuiz;
    if (d.c !== p.atkC) { p.atkC = d.c; if (!p.inQuiz) p.pendingShot = true; }
    if (d.w !== p.powC) { p.powC = d.w; sim.usePower(p, false); }
    if (d.u !== p.bonC) { p.bonC = d.u; sim.usePower(p, true); }
    if (!p.alive || d.fv !== p.fv || !Number.isFinite(d.x) || !Number.isFinite(d.y)) return;
    if (sim.speedMul(p) === 0) return;
    // Validate the reported position: no faster than the best speed buffs allow, plus slack.
    const from = p.hasT ? [p.tx, p.ty] : [p.x, p.y];
    const elapsed = Math.min(1200, sim.now - p.lastAcceptT);
    const allowed = BASE_SPEED * 2.6 * (elapsed / 1000) * 1.35 + 70;
    const dist = Math.hypot(d.x - from[0], d.y - from[1]);
    if (dist > allowed) {
      sim.teleport(p, p.x, p.y, 'fix');
      return;
    }
    [p.tx, p.ty] = resolve(sim.map, d.x, d.y);
    p.hasT = true;
    p.lastAcceptT = sim.now;
  }

  /* ------------------------------------------------------------- questions */
  private sendQuestions(peer: string | null, idx: number) {
    const qs = this.cfg.questions;
    if (!qs.length) return;
    let bag = this.qBags.get(idx);
    if (!bag) { bag = { order: shuffle(qs.map((_, i) => i)), pos: 0, served: new Set() }; this.qBags.set(idx, bag); }
    if (bag.served.size > 24) bag.served.clear();
    const items: (string | number | string[])[][] = [];
    for (let i = 0; i < BATCH; i++) {
      if (bag.pos >= bag.order.length) { bag.order = shuffle(bag.order); bag.pos = 0; }
      const qid = bag.order[bag.pos++];
      bag.served.add(qid);
      const q = qs[qid];
      items.push([qid, q.q, q.o, encAnswer(q.a, qid, this.salt)]);
    }
    if (peer) this.relay.send({ k: 'qs', items }, peer);
  }

  /* --------------------------------------------------------------- match */
  roster() {
    return this.sim ? this.sim.players.map((p) => [p.idx, p.peer ?? '', p.name, p.char, p.guest ? 1 : 0, p.bot ? 1 : 0]) : [];
  }

  private sendStart(peer: string) {
    if (!this.sim) return;
    const idx = this.peerIdx.get(peer) ?? -1;
    this.relay.send({
      k: 'start', seed: this.seed, portals: this.sim.map.burrows.length, en0: this.cfg.startEnergy, salt: this.salt, dur: this.cfg.durationMin * 60000, goal: this.cfg.goal, roster: this.roster(), you: idx,
      full: this.sim.full(), paused: this.phase === 'paused',
    }, peer);
    if (idx >= 0) {
      this.sendQuestions(peer, idx);
      // (re)sync the player's position + force version with a no-op teleport
      const p = this.sim.players[idx];
      if (this.sim.now > 0) this.sim.teleport(p, p.x, p.y, 'fix');
    }
  }

  start() {
    if (this.phase !== 'lobby') return;
    const people = this.lobby.size + this.cfg.bots;
    const sim = new Sim(this.seed, { durationMs: this.cfg.durationMin * 60000, goal: this.cfg.goal, portals: portalCount(people), startEnergy: this.cfg.startEnergy });
    this.sim = sim;
    for (const lp of this.lobby.values()) {
      const p = sim.addPlayer({ peer: lp.peer, name: lp.name, char: lp.char, uid: lp.uid, guest: lp.guest, bot: false });
      this.peerIdx.set(lp.peer, p.idx);
    }
    const names = shuffle(BOT_NAMES);
    for (let i = 0; i < this.cfg.bots; i++) {
      sim.addPlayer({ peer: null, name: names[i % names.length], char: Math.floor(Math.random() * CHAR_IDS.length), uid: null, guest: true, bot: true });
    }
    // Fixed mystery boxes all over the map (more for bigger classes).
    sim.setupBoxes(boxCount(people));
    this.vis = new VisualWorld(sim.map);
    this.vis.nameOf = (i) => sim.players[i]?.name ?? '?';
    this.vis.apply(sim.events);
    this.phase = 'playing';
    for (const peer of this.peerIdx.keys()) this.sendStart(peer);
    sim.events = [];
    this.last = performance.now();
    this.stopTick = ticker(TICK_MS, () => this.tick());
    this.bump();
  }

  setPaused(on: boolean) {
    if (this.phase !== 'playing' && this.phase !== 'paused') return;
    this.phase = on ? 'paused' : 'playing';
    this.last = performance.now();
    this.relay.send({ k: 'pause', on: on ? 1 : 0 });
    this.bump();
  }

  endNow() { if (this.sim) { this.sim.ended = true; this.tick(); } }

  /** Interpolation factor between the previous and current tick (for the projector view). */
  get alpha() { return Math.min(1, this.acc / TICK_MS); }

  private tick() {
    const sim = this.sim;
    if (!sim) return;
    const now = performance.now();
    if (this.phase === 'paused') { this.last = now; return; }
    if (this.phase !== 'playing') return;
    this.acc += Math.min(250, now - this.last);
    this.last = now;
    let steps = 0;
    while (this.acc >= TICK_MS && steps < 8) {
      for (const p of sim.players) if (p.bot) botThink(sim, p);
      sim.step();
      this.acc -= TICK_MS;
      steps++;
      const since = performance.now() - this.lastSnapAt;
      if ((sim.tick % SNAP_EVERY === 0 && since > 60) || (sim.urgent && since > 75) || since > 140) this.flush();
      if (sim.ended) break;
    }
    if (steps >= 8) this.acc = 0;
    if (sim.ended) this.finish();
  }

  private flush() {
    const sim = this.sim!;
    const events: Ev[] = sim.events;
    sim.events = [];
    sim.urgent = false;
    this.lastSnapAt = performance.now();
    const snap = sim.snapshot();
    this.relay.send({ k: 's', ...snap, e: events });
    this.vis?.apply(events);
    if (events.length) this.bump();
  }

  private finish() {
    const sim = this.sim!;
    if (this.phase === 'ended') return;
    this.flush();
    this.phase = 'ended';
    this.stopTick?.();
    this.stopTick = null;
    const ranked = [...sim.players].sort((a, b) => b.dia - a.dia || b.correct - a.correct || b.kos - a.kos);
    this.winner = sim.winner >= 0 ? sim.winner : ranked[0]?.idx ?? -1;
    const placeBonus = [10, 7, 5];
    this.results = ranked.map((p, i) => {
      const half = i < Math.ceil(ranked.length / 2);
      const points = 3 + Math.min(10, Math.floor(p.correct / 3)) + Math.min(5, p.kos) + (placeBonus[i] ?? (half ? 2 : 0));
      return {
        idx: p.idx, name: p.name, char: p.char, dia: p.dia, correct: p.correct, wrong: p.wrong, kos: p.kos, deaths: p.deaths,
        boxes: p.boxes, streak: p.bestStreak, place: i + 1, points: p.bot ? 0 : points, bot: p.bot, guest: p.guest, peer: p.peer,
      };
    });
    this.relay.send({ k: 'end', res: this.results, winner: this.winner });
    this.bump();
    void this.saveAwards();
  }

  private async saveAwards() {
    if (this.cfg.demo) { this.saved = 'skipped'; this.bump(); return; }
    const sim = this.sim!;
    const awards: Award[] = this.results
      .filter((r) => !r.bot)
      .map((r) => ({ userId: sim.players[r.idx].uid, cardId: CHAR_IDS[r.char], points: r.points }));
    this.saved = 'saving';
    this.bump();
    try {
      await awardGamePoints('classwars', this.cfg.matchId, awards);
      this.saved = 'saved';
    } catch {
      this.saved = 'error';
    }
    this.bump();
  }

  /** Stats for the projector (leaderboard etc.). */
  leaderboard() {
    if (!this.sim) return [];
    return [...this.sim.players].filter((p) => p.connected || p.dia > 0).sort((a, b) => b.dia - a.dia).map((p) => ({ idx: p.idx, name: p.name, char: p.costume >= 0 ? p.costume : p.char, dia: p.dia, alive: p.alive, bot: p.bot, kos: p.kos }));
  }

  upgradeName(i: number) { return UPGRADES[i]?.name ?? ''; }
}

/** The projector's view of the match: drawn straight from the simulation (no network delay). */
export function hostSource(h: HostSession): RenderSource {
  const sim = h.sim!;
  return {
    map: sim.map,
    vis: h.vis!,
    myIdx: -1,
    players(): RP[] {
      const a = h.phase === 'playing' ? h.alpha : 1;
      const out: RP[] = [];
      for (const p of sim.players) {
        if (!p.connected) continue;
        out.push({
          idx: p.idx, x: lerp(p.px, p.x, a), y: lerp(p.py, p.y, a), aim: p.aim, hp: Math.ceil(p.hp), sh: Math.ceil(p.sh), dia: p.dia, en: Math.ceil(p.en), flags: sim.flags(p),
          look: sim.lookChar(p), weapon: p.weapon, ammo: p.ammo, maxHp: sim.maxHp(p), borrowed: p.borrowed, charges: p.bCharges, name: p.name, me: false, bot: p.bot,
        });
      }
      return out;
    },
    remainingMs: () => sim.remainingMs,
    paused: () => h.phase === 'paused',
  };
}
