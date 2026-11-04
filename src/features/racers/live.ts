/* English Racers — live class mode (phase 3). The teacher's screen (RacersHost) opens a room with a
   code and a QR; the students join from their phones (RacersClient) with a name and a driver.
   The teacher picks the track, laps, English level and items and starts the race: every phone
   drives its own kart and sees the classmates as karts moving on the same track. The winner is
   whoever makes the fewest mistakes at the question gates and keeps the most coins:
   score = right × 100 − wrong × 50 + coins × 10 (also added up over the session).

   Network (the shared relay, never Supabase): each phone sends its kart state to the teacher
   ~6 times a second; the teacher broadcasts one snapshot with everybody, which the phones draw
   ~260 ms in the past, between two snapshots. Item hits go straight from phone to phone. */
import { Relay, type Envelope, type NetStatus } from '@/lib/relay';
import { TOONS } from '@/features/toons3d/runtime';
import type { RunLevel } from '@/features/run/questions';
import { TRACKS, type TrackId } from './tracks';
import type { LiveCfg, LiveEntry, LiveFinish, LiveOut, LiveState } from './engine';
import { scoreOf } from './racer';

export const MAX_STUDENTS = 30;
const SNAP_MS = 160;

export type LivePhase = 'lobby' | 'race' | 'results' | 'podium';
export interface LiveSettings { track: TrackId | 'random'; laps: number; level: RunLevel; items: boolean; /** Seconds the others get after the first one finishes. */ wait: number }
export interface LivePlayer { peer: string; name: string; toon: string; online: boolean; total: number }
export interface LiveResult { peer: string; name: string; toon: string; right: number; wrong: number; bank: number; score: number; total: number; time: number; done: boolean; place: number }
export interface LivePub { ph: LivePhase; set: LiveSettings; players: LivePlayer[]; race: number; track: TrackId | null; left: number; results: LiveResult[] | null }
export type Snap = Omit<LiveState, never> & { peer: string };

type Wire = { k: string; [x: string]: unknown };
const num = (v: unknown, lo = -1e6, hi = 1e6) => { const n = Number(v); return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0; };
const LEVELS: RunLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];
export const cleanName = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 18);

function packState(s: LiveState) {
  const r2 = (v: number) => Math.round(v * 100) / 100;
  return [r2(s.x), r2(s.y), r2(s.z), Math.round(s.yaw * 1000) / 1000, Math.round(s.spd * 10) / 10, s.drift, s.flags, Math.round(s.dist * 10) / 10, s.fin ? 1 : 0, Math.round(s.ft * 100) / 100, s.bank, s.right, s.wrong];
}
function unpackState(a: unknown): LiveState | null {
  if (!Array.isArray(a) || a.length < 13) return null;
  return {
    x: num(a[0]), y: num(a[1]), z: num(a[2]), yaw: num(a[3], -10, 10), spd: num(a[4], -80, 80), drift: Math.sign(num(a[5], -1, 1)), flags: num(a[6], 0, 15) | 0,
    dist: num(a[7], -2000, 1e5), fin: !!a[8], ft: num(a[9], 0, 3600), bank: num(a[10], 0, 9999) | 0, right: num(a[11], 0, 999) | 0, wrong: num(a[12], 0, 999) | 0,
  };
}

/* ------------------------------------------------------------------ teacher */
interface P extends LivePlayer { joinedAt: number }

export class RacersHost {
  readonly relay: Relay;
  readonly code: string;
  phase: LivePhase = 'lobby';
  set: LiveSettings = { track: 'random', laps: 2, level: 'A2', items: true, wait: 45 };
  players = new Map<string, P>();
  race = 0;
  cfg: LiveCfg | null = null;
  results: LiveResult[] | null = null;
  /** When the race ends by itself (ms epoch, 0 = not yet: nobody has finished). */
  endsAt = 0;
  net: NetStatus = 'connecting';
  private states = new Map<string, LiveState>();
  private fins = new Map<string, LiveFinish>();
  private ending: ReturnType<typeof setTimeout> | null = null;
  private dirty = true;
  private listeners = new Set<() => void>();
  private offs: (() => void)[] = [];
  private loop: ReturnType<typeof setInterval>;
  /** The teacher's 3D view. */
  onStart: ((cfg: LiveCfg) => void) | null = null;
  onSnap: ((list: Snap[]) => void) | null = null;
  onLobby: (() => void) | null = null;
  onPodium: ((totals: Record<string, number>) => void) | null = null;

  constructor(code: string) {
    this.code = code;
    this.relay = new Relay(code, 'host-' + code, 'host');
    this.offs.push(this.relay.on((e) => this.onMsg(e)));
    this.offs.push(this.relay.onStatus((s) => { this.net = s; this.bump(); }));
    this.loop = setInterval(() => this.tick(), SNAP_MS);
  }
  subscribe(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  private bump() { this.dirty = true; this.listeners.forEach((f) => f()); }
  close() { clearInterval(this.loop); if (this.ending) clearTimeout(this.ending); this.offs.forEach((f) => f()); this.relay.close(); }

  get list() { return [...this.players.values()].sort((a, b) => a.joinedAt - b.joinedAt); }
  get online() { return this.list.filter((p) => p.online); }
  get left() { return this.endsAt ? Math.max(0, this.endsAt - Date.now()) : 0; }
  pub(): LivePub {
    return { ph: this.phase, set: this.set, players: this.list.map(({ peer, name, toon, online, total }) => ({ peer, name, toon, online, total })), race: this.race, track: this.cfg?.track ?? null, left: this.left, results: this.results };
  }
  /** Live scores during the race (best first). */
  live() {
    if (!this.cfg) return [];
    return this.cfg.roster.map((e) => {
      const s = this.states.get(e.peer), f = this.fins.get(e.peer), p = this.players.get(e.peer);
      const st = f ?? s ?? { right: 0, wrong: 0, bank: 0 };
      return { peer: e.peer, name: e.name, toon: e.toon, right: st.right, wrong: st.wrong, bank: st.bank, score: scoreOf(st), fin: !!f || !!s?.fin, dist: s?.dist ?? 0, online: !!p?.online };
    }).sort((a, b) => b.score - a.score || b.dist - a.dist);
  }

  configure(p: Partial<LiveSettings>) { if (this.phase === 'race') return; this.set = { ...this.set, ...p }; this.bump(); }
  kick(peer: string) { this.relay.send({ k: 'kick' }, peer); this.players.delete(peer); this.bump(); }

  start() {
    if (this.phase === 'race') return;
    const roster: LiveEntry[] = this.online.slice(0, MAX_STUDENTS).map((p) => ({ peer: p.peer, name: p.name, toon: p.toon }));
    if (!roster.length) return;
    const track = this.set.track === 'random' ? TRACKS[Math.floor(Math.random() * TRACKS.length)].id : this.set.track;
    this.race++;
    this.cfg = { track, laps: this.set.laps, level: this.set.level, items: this.set.items, roster, race: this.race };
    this.phase = 'race';
    this.states.clear(); this.fins.clear();
    this.endsAt = 0; this.results = null;
    this.relay.send({ k: 'go', cfg: this.cfg });
    this.onStart?.(this.cfg);
    this.bump();
  }
  /** Stop the race now: everyone still driving reports what they did, then the results. */
  endRace() {
    if (this.phase !== 'race' || this.ending) return;
    this.relay.send({ k: 'end', r: this.race });
    this.ending = setTimeout(() => this.finishRace(), 2500);
    this.bump();
  }
  private finishRace() {
    if (this.ending) { clearTimeout(this.ending); this.ending = null; }
    if (this.phase !== 'race' || !this.cfg) return;
    const rows = this.cfg.roster.map((e) => {
      const f = this.fins.get(e.peer), s = this.states.get(e.peer);
      const st = f ?? s ?? { right: 0, wrong: 0, bank: 0 };
      const score = scoreOf(st);
      const p = this.players.get(e.peer);
      if (p) p.total += score;
      return { peer: e.peer, name: e.name, toon: e.toon, right: st.right, wrong: st.wrong, bank: st.bank, score, total: p?.total ?? score, time: f ? f.time : 0, done: !!f?.done, place: 0 };
    });
    // fewest mistakes plus coins: the score; equal scores → whoever finished first
    rows.sort((a, b) => b.score - a.score || Number(b.done) - Number(a.done) || (a.time || 1e9) - (b.time || 1e9));
    rows.forEach((r, i) => { r.place = i + 1; });
    this.results = rows;
    this.phase = 'results';
    this.endsAt = 0;
    this.relay.send({ k: 'res', r: this.race, rows });
    this.bump();
  }
  toLobby() { if (this.phase === 'race') return; this.phase = 'lobby'; this.results = null; this.onLobby?.(); this.bump(); }
  podium() {
    if (this.phase === 'race') return;
    const totals: Record<string, number> = {};
    for (const p of this.players.values()) totals[p.peer] = p.total;
    this.phase = 'podium';
    this.relay.send({ k: 'pod', totals });
    this.onPodium?.(totals);
    this.bump();
  }
  /** Session ranking by total points. */
  ranking() { return this.list.sort((a, b) => b.total - a.total); }

  private tick() {
    if (this.phase === 'race' && this.cfg) {
      // one snapshot with every kart (index in the roster + state)
      const p: unknown[] = [], list: Snap[] = [];
      this.cfg.roster.forEach((e, i) => { const s = this.states.get(e.peer); if (s) { p.push([i, ...packState(s)]); list.push({ ...s, peer: e.peer }); } });
      if (p.length) this.relay.send({ k: 'sn', r: this.race, p, left: this.left }, undefined, true);
      if (list.length) this.onSnap?.(list);
      if (this.endsAt && Date.now() >= this.endsAt) this.endRace();
      this.listeners.forEach((f) => f());
    }
    if (this.dirty) { this.dirty = false; this.relay.send({ k: 'pub', st: this.pub() }); }
  }

  private onMsg(env: Envelope) {
    const d = env.d as Wire, peer = env.f;
    if (peer === '_sys') {
      if (d?.type === 'peer-leave') {
        const p = this.players.get(d.id as string);
        if (!p) return;
        if (this.phase === 'lobby') this.players.delete(p.peer); else p.online = false;
        this.bump();
      }
      return;
    }
    if (!d || typeof d.k !== 'string') return;
    switch (d.k) {
      case 'hi': {
        const name = cleanName(d.name);
        if (name.length < 2) return;
        const toon = TOONS.some((x) => x.id === d.toon) ? String(d.toon) : TOONS[0].id;
        const p = this.players.get(peer);
        if (!p && this.players.size >= MAX_STUDENTS + 10) { this.relay.send({ k: 'full' }, peer); return; }
        if (p) Object.assign(p, { name, toon, online: true });
        else this.players.set(peer, { peer, name, toon, online: true, total: 0, joinedAt: Date.now() });
        this.relay.send({ k: 'pub', st: this.pub() }, peer);
        // back after a reload: hand over the race in progress (they start it from the grid)
        if (this.phase === 'race' && this.cfg && this.cfg.roster.some((e) => e.peer === peer) && d.fresh) this.relay.send({ k: 'go', cfg: this.cfg }, peer);
        this.bump();
        break;
      }
      case 'st': {
        if (this.phase !== 'race' || d.r !== this.race || !this.cfg?.roster.some((e) => e.peer === peer)) return;
        const s = unpackState(d.s);
        if (s) this.states.set(peer, s);
        break;
      }
      case 'fin': {
        if (this.phase !== 'race' || d.r !== this.race || !this.cfg?.roster.some((e) => e.peer === peer)) return;
        this.fins.set(peer, { time: num(d.time, 0, 3600), right: num(d.right, 0, 999) | 0, wrong: num(d.wrong, 0, 999) | 0, bank: num(d.bank, 0, 9999) | 0, done: !!d.done });
        const online = this.cfg.roster.filter((e) => this.players.get(e.peer)?.online);
        if (online.every((e) => this.fins.has(e.peer))) this.finishRace();
        else if (!this.endsAt && d.done) this.endsAt = Date.now() + this.set.wait * 1000;
        this.bump();
        break;
      }
    }
  }
}

/* ------------------------------------------------------------------ student */
export type ClientStatus = 'ok' | 'kicked' | 'full';

export class RacersClient {
  readonly relay: Relay;
  readonly code: string;
  readonly peer: string;
  name: string;
  toon: string;
  net: NetStatus = 'connecting';
  status: ClientStatus = 'ok';
  pub: LivePub | null = null;
  /** The race this phone is driving (null = waiting for the next one). */
  cfg: LiveCfg | null = null;
  results: LiveResult[] | null = null;
  totals: Record<string, number> | null = null;
  private fresh = true;
  private listeners = new Set<() => void>();
  private offs: (() => void)[] = [];
  /** The student's game. */
  onGo: ((cfg: LiveCfg) => void) | null = null;
  onSnap: ((list: Snap[]) => void) | null = null;
  onHit: ((kind: 'plane' | 'ink', from: string) => void) | null = null;
  onBell: ((from: string) => void) | null = null;
  onInk: ((from: string, s: number, d: number) => void) | null = null;
  onEnd: (() => void) | null = null;
  onLobby: (() => void) | null = null;
  onPodium: ((totals: Record<string, number>) => void) | null = null;

  constructor(code: string, peer: string, name: string, toon: string) {
    this.code = code; this.peer = peer; this.name = name; this.toon = toon;
    this.relay = new Relay(code, peer, 'player');
    this.offs.push(this.relay.on((e) => this.onMsg(e)));
    this.offs.push(this.relay.onStatus((s) => { const was = this.net; this.net = s; if (s === 'open' && was !== 'open') this.hello(); this.bump(); }));
  }
  subscribe(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  private bump() { this.listeners.forEach((f) => f()); }
  close() { this.offs.forEach((f) => f()); this.relay.close(); }
  private hello() { this.relay.send({ k: 'hi', name: this.name, toon: this.toon, fresh: this.fresh }, 'host'); this.fresh = false; }
  setToon(id: string) { this.toon = id; this.hello(); }
  /** In the race the teacher is running now. */
  get racing() { return !!this.cfg && this.pub?.ph === 'race' && this.pub.race === this.cfg.race; }

  /** What the game sends out. */
  readonly out: LiveOut = {
    state: (s) => { if (this.cfg) this.relay.send({ k: 'st', r: this.cfg.race, s: packState(s) }, 'host', true); },
    finish: (f) => { if (this.cfg) this.relay.send({ k: 'fin', r: this.cfg.race, ...f }, 'host'); },
    hit: (peer, kind) => this.relay.send({ k: 'hit', kind }, peer),
    ink: (s, d) => this.relay.send({ k: 'ink', s: Math.round(s * 10) / 10, d: Math.round(d * 100) / 100 }),
    bell: (victims) => { for (const v of victims) this.relay.send({ k: 'bell' }, v); },
  };

  private inRace(peer: string) { return !!this.cfg?.roster.some((e) => e.peer === peer); }

  private onMsg(env: Envelope) {
    const d = env.d as Wire, from = env.f;
    if (!d || typeof d.k !== 'string') return;
    const fromHost = from.startsWith('host-');
    switch (d.k) {
      case 'pub': {
        if (!fromHost) return;
        const prev = this.pub;
        this.pub = d.st as LivePub;
        if (this.pub.ph === 'lobby' && prev && prev.ph !== 'lobby') { this.results = null; this.totals = null; this.onLobby?.(); }
        this.bump();
        break;
      }
      case 'go': {
        if (!fromHost) return;
        const cfg = d.cfg as LiveCfg;
        if (!cfg || !Array.isArray(cfg.roster) || !TRACKS.some((x) => x.id === cfg.track) || !LEVELS.includes(cfg.level)) return;
        if (!cfg.roster.some((e) => e.peer === this.peer)) return;
        this.cfg = cfg; this.results = null; this.totals = null;
        this.onGo?.(cfg);
        this.bump();
        break;
      }
      case 'sn': {
        if (!fromHost || !this.cfg || d.r !== this.cfg.race || !Array.isArray(d.p)) return;
        const list: Snap[] = [];
        for (const row of d.p as unknown[][]) {
          const e = this.cfg.roster[Number(row?.[0])];
          if (!e || e.peer === this.peer) continue;
          const s = unpackState(row.slice(1));
          if (s) list.push({ ...s, peer: e.peer });
        }
        if (this.pub) this.pub.left = num(d.left, 0, 1e7);
        this.onSnap?.(list);
        break;
      }
      case 'end': if (fromHost && this.cfg && d.r === this.cfg.race) this.onEnd?.(); break;
      case 'res': if (fromHost && this.cfg && d.r === this.cfg.race) { this.results = d.rows as LiveResult[]; this.bump(); } break;
      case 'pod': if (fromHost) { this.totals = d.totals as Record<string, number>; this.onPodium?.(this.totals); this.bump(); } break;
      case 'kick': if (fromHost) { this.status = 'kicked'; this.relay.close(); this.bump(); } break;
      case 'full': if (fromHost) { this.status = 'full'; this.relay.close(); this.bump(); } break;
      // from other students
      case 'hit': if (this.inRace(from) && (d.kind === 'plane' || d.kind === 'ink')) this.onHit?.(d.kind, from); break;
      case 'bell': if (this.inRace(from)) this.onBell?.(from); break;
      case 'ink': if (this.inRace(from)) this.onInk?.(from, num(d.s, 0, 1e5), num(d.d, -30, 30)); break;
    }
  }
}
