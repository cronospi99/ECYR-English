/* Pass the Doodle — a drawing-telephone game for English class. Everyone writes a sentence, the
   next person draws it, the next one describes the drawing in English, and so on; at the end the
   chains are revealed one step at a time on every screen.

   Network: the room creator's browser runs DoodleHost (authoritative) and talks to every player
   (DoodleClient, including the creator's own) through the shared relay. Drawings travel as
   compressed WebP data URLs under the relay's 64 KB message limit. */
import { Relay, type Envelope, type NetStatus } from '@/lib/relay';

export type Kind = 'write' | 'draw' | 'describe';
export interface Item { kind: Kind; by: string; v: string | null }
export interface Chain { owner: string; items: Item[] }
export interface LobbyP { peer: string; name: string; av: number }

export const SPEEDS = { slow: { write: 90, draw: 150, describe: 80 }, normal: { write: 70, draw: 110, describe: 60 }, fast: { write: 45, draw: 75, describe: 40 } } as const;
export type Speed = keyof typeof SPEEDS;
export const MAX_DRAWING = { side: 720, bytes: 46_000 };
export const TEXT_MAX = 120;
const GRACE_MS = 4000;

export const kindOf = (s: number): Kind => (s === 0 ? 'write' : s % 2 ? 'draw' : 'describe');

/* ------------------------------------------------------------------ host */
export class DoodleHost {
  relay: Relay;
  code: string;
  phase: 'lobby' | 'play' | 'reveal' | 'end' = 'lobby';
  lobby = new Map<string, LobbyP>();
  order: string[] = [];
  chains: Chain[] = [];
  step = 0;
  steps = 0;
  speed: Speed = 'normal';
  maxSteps = 6;
  endsAt = 0;
  /** Reveal cursor: chain, item. */
  rc = 0; ri = -1;
  private done = new Set<string>();
  private gone = new Set<string>();
  private timer: ReturnType<typeof setTimeout> | null = null;
  private listeners = new Set<() => void>();
  private off: () => void;

  constructor(code: string) {
    this.code = code;
    this.relay = new Relay(code, 'host-' + code, 'host');
    this.off = this.relay.on((e) => this.onMsg(e));
  }
  subscribe(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  private bump() { this.listeners.forEach((f) => f()); }
  close() { if (this.timer) clearTimeout(this.timer); this.off(); this.relay.close(); }

  private lobbyMsg() { return { k: 'lobby', players: [...this.lobby.values()].map((p) => [p.peer, p.name, p.av]), phase: this.phase }; }

  private onMsg(env: Envelope) {
    const d = env.d, peer = env.f;
    if (peer === '_sys') {
      if (d?.type === 'peer-leave') {
        if (this.phase === 'lobby') { this.lobby.delete(d.id); this.relay.send(this.lobbyMsg()); }
        else { this.gone.add(d.id); this.checkStep(); }
        this.bump();
      }
      return;
    }
    if (!d || typeof d !== 'object') return;
    switch (d.k) {
      case 'watch': this.relay.send(this.lobbyMsg(), peer); if (this.phase !== 'play') this.sendShow(peer); break;
      case 'hello': {
        const name = String(d.name ?? '').trim().slice(0, 20) || 'Player';
        const av = Math.max(0, Math.min(24, Number(d.av) | 0));
        this.gone.delete(peer);
        if (this.phase === 'lobby') {
          if (this.lobby.size >= 40 && !this.lobby.has(peer)) { this.relay.send({ k: 'full' }, peer); return; }
          this.lobby.set(peer, { peer, name, av });
          this.relay.send(this.lobbyMsg());
        } else {
          // back after a reconnect: resend the current step (newcomers just watch)
          this.relay.send(this.lobbyMsg(), peer);
          if (this.phase === 'play' && this.order.includes(peer)) this.sendTask(peer);
          if (this.phase !== 'play') this.sendShow(peer);
        }
        this.bump();
        break;
      }
      case 'sub': {
        if (this.phase !== 'play' || Number(d.s) !== this.step) return;
        const pi = this.order.indexOf(peer);
        if (pi < 0) return;
        const c = this.chainFor(pi, this.step);
        const kind = kindOf(this.step);
        let v: string | null = typeof d.v === 'string' ? d.v : null;
        if (v && kind === 'draw' && !/^data:image\/(webp|png|jpeg);base64,/.test(v)) v = null;
        if (v && kind !== 'draw') v = v.replace(/\s+/g, ' ').trim().slice(0, TEXT_MAX) || null;
        this.chains[c].items[this.step] = { kind, by: peer, v };
        this.done.add(peer);
        this.relay.send({ k: 'prog', done: [...this.done] });
        this.checkStep();
        this.bump();
        break;
      }
      case 'edit': {
        // the player reopened their answer to change it: the step waits for them again
        if (this.phase !== 'play' || Number(d.s) !== this.step || !this.order.includes(peer) || !this.done.delete(peer)) return;
        this.relay.send({ k: 'prog', done: [...this.done] });
        this.bump();
        break;
      }
    }
  }

  /** Chain handled by player pi at step s (each chain visits a different player every step). */
  chainFor(pi: number, s: number) { const n = this.order.length; return (((pi - s) % n) + n) % n; }
  name(peer: string) { return this.lobby.get(peer)?.name ?? '?'; }

  start(speed: Speed, maxSteps: number) {
    if (this.phase !== 'lobby' || this.lobby.size < 2) return;
    this.speed = speed;
    this.order = [...this.lobby.keys()];
    this.steps = Math.max(2, Math.min(this.order.length, maxSteps));
    this.chains = this.order.map((p) => ({ owner: p, items: [] }));
    this.phase = 'play';
    this.relay.send({ k: 'start', order: this.order, steps: this.steps });
    this.relay.send(this.lobbyMsg());
    this.beginStep(0);
  }

  private beginStep(s: number) {
    this.step = s;
    this.done.clear();
    const secs = SPEEDS[this.speed][kindOf(s)];
    this.endsAt = Date.now() + secs * 1000;
    for (const p of this.order) this.sendTask(p);
    this.relay.send({ k: 'prog', done: [] });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.timeUp(), secs * 1000);
    this.bump();
  }

  private sendTask(peer: string) {
    const pi = this.order.indexOf(peer);
    const c = this.chainFor(pi, this.step);
    const prev = this.step > 0 ? this.chains[c].items[this.step - 1] : null;
    this.relay.send({ k: 'task', s: this.step, steps: this.steps, kind: kindOf(this.step), left: Math.max(0, this.endsAt - Date.now()), prompt: prev?.v ?? null, done: this.done.has(peer) }, peer);
  }

  private timeUp() {
    // ask everyone still working to hand in what they have, then close the step
    this.relay.send({ k: 'due', s: this.step });
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => this.closeStep(), GRACE_MS);
  }

  private checkStep() {
    if (this.phase !== 'play') return;
    if (this.order.every((p) => this.done.has(p) || this.gone.has(p))) this.closeStep();
  }

  private closeStep() {
    if (this.phase !== 'play') return;
    if (this.timer) clearTimeout(this.timer);
    const kind = kindOf(this.step);
    this.order.forEach((p, pi) => {
      const c = this.chainFor(pi, this.step);
      if (!this.chains[c].items[this.step]) this.chains[c].items[this.step] = { kind, by: p, v: null };
    });
    if (this.step + 1 < this.steps) this.beginStep(this.step + 1);
    else { this.phase = 'reveal'; this.rc = 0; this.ri = -1; this.relay.send(this.lobbyMsg()); this.next(); }
  }

  /* ---------------------------------------------------------------- reveal */
  /** Show the next item of the album on every screen. */
  next() {
    if (this.phase !== 'reveal') return;
    const ch = this.chains[this.rc];
    if (this.ri + 1 < ch.items.length) this.ri++;
    else if (this.rc + 1 < this.chains.length) { this.rc++; this.ri = 0; }
    else { this.phase = 'end'; }
    this.sendShow();
    this.bump();
  }

  private sendShow(to?: string) {
    if (this.phase === 'end') { this.relay.send({ k: 'end' }, to); return; }
    if (this.phase !== 'reveal' || this.ri < 0) return;
    const ch = this.chains[this.rc];
    const it = ch.items[this.ri];
    this.relay.send({ k: 'show', c: this.rc, n: this.chains.length, i: this.ri, of: ch.items.length, owner: this.name(ch.owner), by: this.name(it.by), byAv: this.lobby.get(it.by)?.av ?? 0, kind: it.kind, v: it.v }, to);
  }

  /** Back to the lobby with the same players (play again). */
  again() {
    this.phase = 'lobby';
    this.chains = [];
    this.order = [];
    for (const p of this.gone) this.lobby.delete(p);
    this.gone.clear();
    this.relay.send(this.lobbyMsg());
    this.bump();
  }
}

/* ---------------------------------------------------------------- client */
export interface Task { s: number; steps: number; kind: Kind; endsAt: number; prompt: string | null; done: boolean }
export interface Shown { c: number; n: number; i: number; of: number; owner: string; by: string; byAv: number; kind: Kind; v: string | null }

export class DoodleClient {
  relay: Relay;
  peer: string;
  name: string;
  av: number;
  net: NetStatus = 'connecting';
  phase: 'connecting' | 'lobby' | 'play' | 'reveal' | 'end' | 'full' = 'connecting';
  players: LobbyP[] = [];
  order: string[] = [];
  task: Task | null = null;
  progress: string[] = [];
  /** The album so far, as shown (kept to scroll back at the end). */
  album: Shown[] = [];
  /** Set by the screen: hand in whatever is there now (called on time-out). */
  flush: (() => void) | null = null;
  private listeners = new Set<() => void>();
  private offs: (() => void)[] = [];

  /** Projector only: receives the broadcasts but does not play. */
  watch: boolean;

  constructor(code: string, peer: string, name: string, av: number, watch = false) {
    this.peer = peer; this.name = name; this.av = av; this.watch = watch;
    this.relay = new Relay(code, peer, 'player');
    this.offs.push(this.relay.on((e) => this.onMsg(e)));
    this.offs.push(this.relay.onStatus((s) => { const was = this.net; this.net = s; if (s === 'open' && was !== 'open') this.hello(); this.bump(); }));
  }
  subscribe(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  private bump() { this.listeners.forEach((f) => f()); }
  close() { this.offs.forEach((f) => f()); this.relay.close(); }
  hello() { this.relay.send(this.watch ? { k: 'watch' } : { k: 'hello', name: this.name, av: this.av }, 'host'); }
  setAvatar(av: number) { this.av = av; this.hello(); this.bump(); }

  submit(v: string | null) {
    if (!this.task || this.task.done) return;
    this.task = { ...this.task, done: true };
    this.relay.send({ k: 'sub', s: this.task.s, v }, 'host');
    this.bump();
  }

  /** Reopen the answer already handed in (only while the step is still open). */
  edit() {
    if (!this.task || !this.task.done || this.task.endsAt - Date.now() < 1500) return;
    this.task = { ...this.task, done: false };
    this.relay.send({ k: 'edit', s: this.task.s }, 'host');
    this.bump();
  }

  private onMsg(env: Envelope) {
    const d = env.d;
    if (env.f === '_sys') { if (d?.type === 'peer-join' && d.role === 'host') this.hello(); return; }
    if (!d || typeof d !== 'object') return;
    switch (d.k) {
      case 'lobby':
        this.players = (d.players as [string, string, number][]).map(([peer, name, av]) => ({ peer, name, av }));
        if (d.phase === 'lobby') { this.phase = 'lobby'; this.task = null; this.album = []; }
        else if (this.phase === 'connecting') this.phase = d.phase === 'play' ? 'play' : d.phase;
        break;
      case 'full': this.phase = 'full'; break;
      case 'start': this.order = d.order; this.album = []; this.phase = 'play'; break;
      case 'task':
        this.phase = 'play';
        this.task = { s: d.s, steps: d.steps, kind: d.kind, endsAt: Date.now() + d.left, prompt: d.prompt, done: !!d.done };
        break;
      case 'prog': this.progress = d.done; break;
      case 'due': if (this.task && this.task.s === d.s && !this.task.done) this.flush?.(); break;
      case 'show': {
        this.phase = 'reveal';
        const s = d as Shown;
        if (!this.album.some((a) => a.c === s.c && a.i === s.i)) this.album.push(s);
        break;
      }
      case 'end': this.phase = 'end'; break;
    }
    this.bump();
  }
}

/** Sentence ideas for "Give me an idea" (own, simple classroom-friendly English). */
export const IDEAS: Record<'easy' | 'mid' | 'hard', string[]> = {
  easy: [
    'A cat is sleeping on a red car.', 'My teacher has a big green umbrella.', 'Two dogs are eating pizza.', 'A boy is flying a yellow kite.',
    'The sun is wearing sunglasses.', 'A fish is reading a book.', 'My grandma is riding a bike.', 'There is a monkey in the kitchen.',
    'A girl is singing in the rain.', 'The elephant is very small.', 'A robot is drinking coffee.', 'Three birds are on a bus.',
  ],
  mid: [
    'A chef is cooking spaghetti on the moon.', 'The students are dancing because there is no homework.', 'A dinosaur is waiting for the bus in Medellín.',
    'My best friend lost his shoes at the beach.', 'A giraffe is trying to take a selfie.', 'The football player scored a goal with his head.',
    'A ghost is afraid of a small mouse.', 'Somebody stole the last piece of cake!', 'The superhero forgot his cape at home.', 'A penguin is selling ice cream in the desert.',
  ],
  hard: [
    'If I had wings, I would fly to school every morning.', 'The detective has just found a clue under the sofa.', 'Although it was raining, the band kept playing.',
    'A pirate who is scared of water is looking for treasure.', 'By the time we arrived, the party had already finished.', 'The teacher was surprised when the robot passed the exam.',
    'A tired astronaut is being chased by a friendly alien.', 'The city has been covered in chocolate since yesterday.',
  ],
};
