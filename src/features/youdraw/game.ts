/* You Draw — the teacher runs the room from the projector (no playing), the game picks a student at
   random, that student chooses one of three words of the class level and draws it on the phone, and
   everyone else watches the drawing appear live and types guesses. Letters of the word are revealed
   little by little as time runs out. After the last round: black screen, red wipe, podium.

   Network: the teacher's browser runs YdHost (authoritative) and talks to every phone (YdClient)
   through the shared relay. The relay drops anything above ~30 messages/s per socket, so the host
   batches the drawing, the guess feed and the public state into one broadcast every FLUSH_MS. */
import { cleanAv } from '@/features/games/pet';
import { Relay, type Envelope, type NetStatus } from '@/lib/relay';
import { YD_WORDS, type YdLevel } from './words';

export const YD_TIMES = [30, 60, 70, 90] as const;
export const YD_REVEALS = [25, 50, 75] as const;
export const CHOOSE_SECS = 15;
export const SPIN_MS = 3400;
export const RESULT_MS = 7000;
const FLUSH_MS = 120;
const MAX_PLAYERS = 60;
const MAX_POINTS = 24_000;

/* ----------------------------------------------------------------- drawing */
/** Drawing space: 1000 × 750 (4:3), whatever the screen. */
export const INK_W = 1000, INK_H = 750;
export const INK_COLORS = ['#1b1b1f', '#ffffff', '#8a8f98', '#e53935', '#ff8f00', '#fdd835', '#43a047', '#1b5e20', '#29b6f6', '#1e40af', '#8e24aa', '#f06292', '#795548', '#f5c49a'];
export const INK_SIZES = [4, 9, 18, 36];
export interface Stroke { id: number; c: number; w: number; p: number[] }
/** One drawing operation: points added to a stroke, undo, or clear. */
export type InkOp = [number, number, number, number[]] | ['u'] | ['x'];

export class Ink {
  strokes: Stroke[] = [];
  points = 0;
  private ls = new Set<(full: boolean) => void>();
  on(f: (full: boolean) => void) { this.ls.add(f); return () => { this.ls.delete(f); }; }
  private emit(full: boolean) { this.ls.forEach((f) => f(full)); }
  add(id: number, c: number, w: number, p: number[]) {
    let s: Stroke | undefined = this.strokes[this.strokes.length - 1];
    if (!s || s.id !== id) s = this.strokes.find((x) => x.id === id);
    if (!s) { s = { id, c, w, p: [] }; this.strokes.push(s); }
    for (const v of p) s.p.push(v);
    this.points += p.length / 2;
    this.emit(false);
  }
  undo() { const s = this.strokes.pop(); if (s) this.points -= s.p.length / 2; this.emit(true); }
  clear() { this.strokes = []; this.points = 0; this.emit(true); }
  load(strokes: Stroke[], reset: boolean) {
    if (reset) { this.strokes = []; this.points = 0; }
    for (const s of strokes) { this.strokes.push({ id: s.id, c: s.c, w: s.w, p: [...s.p] }); this.points += s.p.length / 2; }
    this.emit(true);
  }
  apply(op: InkOp) {
    if (op[0] === 'u') this.undo();
    else if (op[0] === 'x') this.clear();
    else this.add(op[0], op[1], op[2], op[3]);
  }
}

/** A drawing operation from the network, checked and clamped (null if malformed). */
function cleanOp(op: unknown): InkOp | null {
  if (!Array.isArray(op)) return null;
  if (op[0] === 'u' || op[0] === 'x') return [op[0]];
  const [id, c, w, p] = op;
  if (!Number.isInteger(id) || !Number.isInteger(c) || !Number.isInteger(w) || !Array.isArray(p)) return null;
  if (c < 0 || c >= INK_COLORS.length || w < 0 || w >= INK_SIZES.length || p.length % 2 || p.length > 1200) return null;
  const pts: number[] = [];
  for (let i = 0; i < p.length; i += 2) {
    const x = Number(p[i]), y = Number(p[i + 1]);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    pts.push(Math.max(0, Math.min(INK_W, Math.round(x))), Math.max(0, Math.min(INK_H, Math.round(y))));
  }
  return [id, c, w, pts];
}

/* ----------------------------------------------------------------- words */
export const normGuess = (s: string) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/['’]/g, '').replace(/[^a-z0-9]+/g, ' ').trim();
const squash = (s: string) => normGuess(s).replace(/^(a|an|the|to) /, '').replace(/ /g, '');

function lev(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 3;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[b.length];
}

/** ok = right (accents, capitals, spaces, hyphens, a/an/the/to and a plural -s don't matter). */
export function judge(guess: string, word: string): 'ok' | 'close' | 'no' {
  const g = squash(guess), w = squash(word);
  if (!g) return 'no';
  if (g === w || (w.length >= 4 && (g + 's' === w || w + 's' === g))) return 'ok';
  const d = lev(g, w);
  return (w.length >= 4 && d === 1) || (w.length >= 8 && d === 2) ? 'close' : 'no';
}

const isLetter = (ch: string) => /[a-z0-9]/i.test(ch.normalize('NFD').replace(/[̀-ͯ]/g, ''));
/** The word with hidden letters as "_" (spaces, hyphens and apostrophes always show). */
export function maskWord(word: string, shown: Set<number>) {
  return [...word].map((ch, i) => (isLetter(ch) && !shown.has(i) ? '_' : ch)).join('');
}

/* ------------------------------------------------------------------ state */
export type Phase = 'lobby' | 'spin' | 'choose' | 'draw' | 'result' | 'end';
export interface Settings { level: YdLevel; time: number; reveal: number; rounds: number }
export interface PubPlayer { peer: string; name: string; av: number; score: number; online: boolean; guessed: boolean; gain: number }
export interface Pub { ph: Phase; round: number; rounds: number; drawer: string | null; mask: string; left: number; total: number; word: string | null; auto: boolean; set: Settings; players: PubPlayer[]; drawerGain: number }
/** Guess feed: a wrong guess (g), someone got it (ok), or a line from the game (sys). */
export interface FeedE { n?: string; av?: number; g?: string; ok?: boolean; sys?: string }

interface P extends PubPlayer { drawn: number; lastGuess: number }

type Wire = { k: string; [x: string]: unknown };
const packPlayers = (ps: PubPlayer[]) => ps.map((p) => [p.peer, p.name, p.av, p.score, p.online ? 1 : 0, p.guessed ? 1 : 0, p.gain]);
const unpackPlayers = (a: unknown): PubPlayer[] =>
  Array.isArray(a) ? a.map((r) => ({ peer: String(r[0]), name: String(r[1]), av: Number(r[2]) | 0, score: Number(r[3]) | 0, online: !!r[4], guessed: !!r[5], gain: Number(r[6]) | 0 })) : [];

/* ------------------------------------------------------------------- host */
export class YdHost {
  relay: Relay;
  code: string;
  phase: Phase = 'lobby';
  set: Settings = { level: 'A1', time: 60, reveal: 50, rounds: 8 };
  players = new Map<string, P>();
  round = 0;
  drawer: string | null = null;
  choices: string[] = [];
  word = '';
  endsAt = 0;
  total = 0;
  auto = true;
  drawerGain = 0;
  feed: FeedE[] = [];
  ink = new Ink();
  /** Hidden-letter reveal: letter positions in reveal order and when each one shows (ms since the start). */
  private revealAt: { i: number; at: number }[] = [];
  private shown = new Set<number>();
  private startedAt = 0;
  private used = new Set<string>();
  private blocked = new Set<string>();
  private pendingInk: InkOp[] = [];
  private pendingFeed: FeedE[] = [];
  private dirty = true;
  private listeners = new Set<() => void>();
  private off: () => void;
  private loop: ReturnType<typeof setInterval>;
  private ticker: ReturnType<typeof setInterval>;
  /** Sound hooks for the projector. */
  onSound: ((s: 'ok' | 'tick' | 'end' | 'spin' | 'start') => void) | null = null;

  constructor(code: string) {
    this.code = code;
    this.relay = new Relay(code, 'host-' + code, 'host');
    this.off = this.relay.on((e) => this.onMsg(e));
    this.loop = setInterval(() => this.flush(), FLUSH_MS);
    this.ticker = setInterval(() => this.tick(), 200);
  }
  subscribe(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  private bump() { this.dirty = true; this.listeners.forEach((f) => f()); }
  close() { clearInterval(this.loop); clearInterval(this.ticker); this.off(); this.relay.close(); }

  get mask() { return this.word ? maskWord(this.word, this.shown) : ''; }
  get list(): P[] { return [...this.players.values()]; }
  ranking(): P[] { return this.list.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name)); }
  private guessers() { return this.list.filter((p) => p.online && p.peer !== this.drawer); }

  pub(): Pub {
    const showWord = this.phase === 'result' || this.phase === 'end';
    return {
      ph: this.phase, round: this.round, rounds: this.set.rounds, drawer: this.drawer, mask: this.mask, left: Math.max(0, this.endsAt - Date.now()), total: this.total,
      word: showWord ? this.word || null : null, auto: this.auto, set: this.set, players: this.list, drawerGain: this.drawerGain,
    };
  }

  /** One broadcast with everything that changed since the last one. */
  private flush() {
    if (!this.dirty && !this.pendingInk.length && !this.pendingFeed.length) return;
    const msg: Wire = { k: 'tk' };
    if (this.pendingInk.length) msg.ink = this.pendingInk.splice(0);
    if (this.pendingFeed.length) msg.feed = this.pendingFeed.splice(0);
    if (this.dirty) { const p = this.pub(); msg.st = { ...p, players: packPlayers(p.players) }; this.dirty = false; }
    this.relay.send(msg);
  }

  private say(e: FeedE) {
    this.feed.push(e);
    if (this.feed.length > 40) this.feed.shift();
    this.pendingFeed.push(e);
    this.listeners.forEach((f) => f());
  }

  private onMsg(env: Envelope) {
    const d = env.d, peer = env.f;
    if (peer === '_sys') {
      if (d?.type === 'peer-leave') {
        const p = this.players.get(d.id);
        if (!p) return;
        if (this.phase === 'lobby') this.players.delete(d.id);
        else p.online = false;
        if (d.id === this.drawer) this.drawerLeft();
        else if (this.phase === 'draw') this.checkAllGuessed();
        this.bump();
      }
      return;
    }
    if (!d || typeof d !== 'object' || this.blocked.has(peer)) return;
    switch (d.k) {
      case 'hello': return this.hello(peer, d);
      case 'pick': if (peer === this.drawer && this.phase === 'choose') this.pick(Number(d.i) | 0); return;
      case 'ink': {
        if (peer !== this.drawer || this.phase !== 'draw' || !Array.isArray(d.o)) return;
        for (const raw of d.o.slice(0, 60)) {
          const op = cleanOp(raw);
          if (!op) continue;
          if (op[0] !== 'u' && op[0] !== 'x' && this.ink.points + op[3].length / 2 > MAX_POINTS) continue;
          this.ink.apply(op);
          this.pendingInk.push(op);
        }
        return;
      }
      case 'guess': return this.guess(peer, String(d.g ?? ''));
    }
  }

  private hello(peer: string, d: Record<string, unknown>) {
    const name = String(d.name ?? '').replace(/\s+/g, ' ').trim().slice(0, 18) || 'Player';
    const av = cleanAv(d.av);
    let p = this.players.get(peer);
    if (!p) {
      if (this.players.size >= MAX_PLAYERS) { this.relay.send({ k: 'full' }, peer); return; }
      p = { peer, name, av, score: 0, online: true, guessed: false, gain: 0, drawn: 0, lastGuess: 0 };
      this.players.set(peer, p);
      if (this.phase !== 'lobby') this.say({ sys: `${name} joined`, av });
    }
    p.name = name; p.av = av; p.online = true;
    // late joiner or reconnect: bring the phone up to date (flush first so no queued op lands after the snapshot)
    this.dirty = true;
    this.flush();
    if (this.phase === 'draw' || this.phase === 'result') this.sendCanvas(peer);
    if (this.feed.length) this.relay.send({ k: 'feed', all: this.feed.slice(-14) }, peer);
    if (peer === this.drawer && this.phase === 'choose') this.relay.send({ k: 'you', choices: this.choices, left: this.endsAt - Date.now() }, peer);
    if ((peer === this.drawer && this.phase === 'draw') || p.guessed) this.relay.send({ k: 'word', word: this.word }, peer);
    this.bump();
  }

  /** The drawing so far, in chunks under the relay's message limit. */
  private sendCanvas(peer: string) {
    const chunks: Stroke[][] = [[]];
    let n = 0;
    for (const s of this.ink.strokes) {
      if (n + s.p.length > 6000 && chunks[chunks.length - 1].length) { chunks.push([]); n = 0; }
      chunks[chunks.length - 1].push(s);
      n += s.p.length;
    }
    chunks.forEach((s, i) => this.relay.send({ k: 'cv', s, first: i === 0 }, peer));
  }

  /* -------------------------------------------------------------- flow */
  configure(s: Partial<Settings>) {
    if (this.phase !== 'lobby') return;
    this.set = { ...this.set, ...s };
    this.bump();
  }
  setAuto(on: boolean) { this.auto = on; this.bump(); }
  kick(peer: string) {
    if (!this.players.has(peer)) return;
    this.relay.send({ k: 'kick' }, peer);
    this.blocked.add(peer);
    this.players.delete(peer);
    if (peer === this.drawer) this.drawerLeft();
    this.bump();
  }

  start() {
    if (this.phase !== 'lobby' || this.list.filter((p) => p.online).length < 2) return;
    for (const p of this.players.values()) { p.score = 0; p.drawn = 0; p.gain = 0; p.guessed = false; }
    this.round = 0;
    this.used.clear();
    this.feed = [];
    this.onSound?.('start');
    this.nextTurn();
  }

  /** Pick the next student at random (among those who have drawn the fewest times) and spin. */
  private nextTurn(sameRound = false) {
    const online = this.list.filter((p) => p.online);
    if (online.length < 2) { this.endGame(); return; }
    if (!sameRound) this.round++;
    const min = Math.min(...online.map((p) => p.drawn));
    const pool = online.filter((p) => p.drawn === min && (online.length < 3 || p.peer !== this.drawer));
    const pickFrom = pool.length ? pool : online;
    const dr = pickFrom[Math.floor(Math.random() * pickFrom.length)];
    this.drawer = dr.peer;
    this.word = '';
    this.choices = [];
    this.shown.clear();
    this.drawerGain = 0;
    for (const p of this.players.values()) { p.guessed = false; p.gain = 0; }
    this.ink.clear();
    this.pendingInk.push(['x']);
    this.phase = 'spin';
    this.total = SPIN_MS / 1000;
    this.endsAt = Date.now() + SPIN_MS;
    this.onSound?.('spin');
    this.bump();
  }

  /** Teacher's "another student" during the spin or while choosing (absent, shy…). */
  reroll() {
    if (this.phase !== 'spin' && this.phase !== 'choose') return;
    if (this.drawer) this.relay.send({ k: 'you', choices: [], left: 0 }, this.drawer);
    this.nextTurn(true);
  }

  private choosePhase() {
    const bank = YD_WORDS[this.set.level];
    let fresh = bank.filter((w) => !this.used.has(w));
    if (fresh.length < 3) { this.used.clear(); fresh = bank; }
    const pick: string[] = [];
    while (pick.length < 3) { const w = fresh[Math.floor(Math.random() * fresh.length)]; if (!pick.includes(w)) pick.push(w); }
    this.choices = pick;
    this.phase = 'choose';
    this.total = CHOOSE_SECS;
    this.endsAt = Date.now() + CHOOSE_SECS * 1000;
    if (this.drawer) this.relay.send({ k: 'you', choices: pick, left: CHOOSE_SECS * 1000 }, this.drawer);
    this.bump();
  }

  private pick(i: number) {
    if (this.phase !== 'choose') return;
    this.word = this.choices[Math.max(0, Math.min(this.choices.length - 1, i))];
    this.used.add(this.word);
    const dr = this.drawer ? this.players.get(this.drawer) : null;
    if (dr) dr.drawn++;
    // reveal plan: a share of the letters (never all), spread between 25 % and 85 % of the time
    const letters = [...this.word].map((ch, k) => (isLetter(ch) ? k : -1)).filter((k) => k >= 0);
    const want = Math.min(letters.length - 1, Math.max(1, Math.round((letters.length * this.set.reveal) / 100)));
    const order = letters.sort(() => Math.random() - 0.5).slice(0, Math.max(0, want));
    const ms = this.set.time * 1000;
    this.revealAt = order.map((k, n) => ({ i: k, at: ms * (0.25 + (0.6 * (n + 1)) / (order.length + 1)) }));
    this.phase = 'draw';
    this.total = this.set.time;
    this.startedAt = Date.now();
    this.endsAt = this.startedAt + ms;
    if (this.drawer) this.relay.send({ k: 'word', word: this.word }, this.drawer);
    this.say({ sys: `${dr?.name ?? '?'} is drawing`, av: dr?.av });
    this.bump();
  }

  private tick() {
    const now = Date.now();
    switch (this.phase) {
      case 'spin': if (now >= this.endsAt) this.choosePhase(); break;
      case 'choose': if (now >= this.endsAt) this.pick(Math.floor(Math.random() * this.choices.length)); break;
      case 'draw': {
        const el = now - this.startedAt;
        let changed = false;
        for (const r of this.revealAt) if (el >= r.at && !this.shown.has(r.i)) { this.shown.add(r.i); changed = true; }
        if (changed) this.bump();
        const left = this.endsAt - now;
        if (left <= 5000 && left > 4800) this.onSound?.('tick');
        if (now >= this.endsAt) this.endRound();
        break;
      }
      case 'result': if (this.auto && now >= this.endsAt) this.next(); break;
    }
  }

  private guess(peer: string, raw: string) {
    const p = this.players.get(peer);
    const g = raw.replace(/\s+/g, ' ').trim().slice(0, 40);
    if (!p || !g || this.phase !== 'draw' || peer === this.drawer || p.guessed) return;
    const now = Date.now();
    if (now - p.lastGuess < 500) return;
    p.lastGuess = now;
    const v = judge(g, this.word);
    if (v === 'ok') {
      const first = !this.list.some((x) => x.guessed);
      const frac = Math.max(0, Math.min(1, (this.endsAt - now) / (this.total * 1000)));
      const pts = Math.round((100 + 400 * frac) / 10) * 10 + (first ? 50 : 0);
      p.guessed = true; p.gain = pts; p.score += pts;
      this.relay.send({ k: 'ok', pts }, peer);
      this.relay.send({ k: 'word', word: this.word }, peer);
      this.say({ n: p.name, av: p.av, ok: true });
      this.onSound?.('ok');
      this.checkAllGuessed();
      this.bump();
    } else if (v === 'close') {
      this.relay.send({ k: 'close', g }, peer);
    } else {
      this.say({ n: p.name, av: p.av, g });
    }
  }

  private checkAllGuessed() {
    const gs = this.guessers();
    if (this.phase === 'draw' && gs.length && gs.every((p) => p.guessed)) this.endsAt = Math.min(this.endsAt, Date.now() + 1200);
  }

  private drawerLeft() {
    if (this.phase === 'spin' || this.phase === 'choose') this.nextTurn(true);
    else if (this.phase === 'draw') this.endRound();
  }

  /** Time is up, everyone got it, the drawer left, or the teacher skipped. */
  endRound() {
    if (this.phase !== 'draw' && this.phase !== 'choose' && this.phase !== 'spin') return;
    if (this.phase !== 'draw') { this.nextTurn(true); return; } // skip before drawing = another student, same round
    const eligible = this.list.filter((p) => p.peer !== this.drawer && (p.online || p.guessed));
    const got = eligible.filter((p) => p.guessed).length;
    const dr = this.drawer ? this.players.get(this.drawer) : null;
    this.drawerGain = eligible.length ? Math.round((400 * got) / eligible.length / 10) * 10 : 0;
    if (dr) { dr.gain = this.drawerGain; dr.score += this.drawerGain; }
    this.phase = 'result';
    this.total = RESULT_MS / 1000;
    this.endsAt = Date.now() + RESULT_MS;
    this.say({ sys: `The word was “${this.word}”` });
    this.onSound?.('end');
    this.bump();
  }

  /** Next round (or the podium after the last one). */
  next() {
    if (this.phase !== 'result') return;
    if (this.round >= this.set.rounds) this.endGame();
    else this.nextTurn();
  }

  endGame() {
    if (this.phase === 'lobby') return;
    this.phase = 'end';
    this.drawer = null;
    this.endsAt = 0;
    this.bump();
  }

  /** Back to the lobby with the same players and settings. */
  again() {
    this.phase = 'lobby';
    this.round = 0;
    this.drawer = null;
    this.word = '';
    for (const [k, p] of this.players) if (!p.online) this.players.delete(k);
    for (const p of this.players.values()) { p.score = 0; p.gain = 0; p.guessed = false; }
    this.ink.clear();
    this.pendingInk.push(['x']);
    this.feed = [];
    this.bump();
  }
}

/* ----------------------------------------------------------------- client */
export class YdClient {
  relay: Relay;
  peer: string;
  name: string;
  av: number;
  net: NetStatus = 'connecting';
  status: 'connecting' | 'in' | 'full' | 'kicked' = 'connecting';
  st: Pub | null = null;
  endsAt = 0;
  choices: string[] = [];
  word: string | null = null;
  gain = 0;
  close_: string | null = null;
  feed: FeedE[] = [];
  ink = new Ink();
  private round = -1;
  private ph: Phase | null = null;
  private outbox: InkOp[] = [];
  private sendT: ReturnType<typeof setInterval>;
  private listeners = new Set<() => void>();
  private offs: (() => void)[] = [];
  onSound: ((s: 'ok' | 'close' | 'turn') => void) | null = null;

  constructor(code: string, peer: string, name: string, av: number) {
    this.peer = peer; this.name = name; this.av = av;
    this.relay = new Relay(code, peer, 'player');
    this.offs.push(this.relay.on((e) => this.onMsg(e)));
    this.offs.push(this.relay.onStatus((s) => { const was = this.net; this.net = s; if (s === 'open' && was !== 'open') this.hello(); this.bump(); }));
    this.sendT = setInterval(() => this.sendInk(), 80);
  }
  subscribe(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  private bump() { this.listeners.forEach((f) => f()); }
  close() { clearInterval(this.sendT); this.offs.forEach((f) => f()); this.relay.close(); }
  hello() { this.relay.send({ k: 'hello', name: this.name, av: this.av }, 'host'); }
  setAvatar(av: number) { this.av = av; this.hello(); this.bump(); }

  get me(): PubPlayer | undefined { return this.st?.players.find((p) => p.peer === this.peer); }
  get drawing() { return this.st?.ph === 'draw' && this.st.drawer === this.peer; }

  pick(i: number) { if (this.choices.length) { this.relay.send({ k: 'pick', i }, 'host'); this.choices = []; this.bump(); } }
  guess(g: string) { const v = g.trim(); if (v) this.relay.send({ k: 'guess', g: v.slice(0, 40) }, 'host'); }

  /* drawing (only while it is my turn): drawn here at once, sent in batches */
  draw(id: number, c: number, w: number, p: number[]) {
    if (!this.drawing || this.ink.points >= MAX_POINTS) return;
    this.ink.add(id, c, w, p);
    const last = this.outbox[this.outbox.length - 1];
    if (last && last[0] === id) (last as [number, number, number, number[]])[3].push(...p);
    else this.outbox.push([id, c, w, [...p]]);
  }
  undo() { if (this.drawing) { this.ink.undo(); this.outbox.push(['u']); } }
  clearInk() { if (this.drawing) { this.ink.clear(); this.outbox.push(['x']); } }
  private sendInk() {
    if (!this.outbox.length) return;
    this.relay.send({ k: 'ink', o: this.outbox.splice(0, 60) }, 'host');
  }

  private onMsg(env: Envelope) {
    const d = env.d;
    if (env.f === '_sys') { if (d?.type === 'peer-join' && d.role === 'host') this.hello(); return; }
    if (!d || typeof d !== 'object') return;
    switch (d.k) {
      case 'tk': {
        // my own strokes are already on my canvas: skip their echo (also in the message that ends my turn)
        const mine = this.drawing;
        if (d.st) this.applyState(d.st);
        if (Array.isArray(d.ink) && !mine && !this.drawing) for (const op of d.ink as InkOp[]) this.ink.apply(op);
        if (Array.isArray(d.feed)) { this.feed.push(...(d.feed as FeedE[])); if (this.feed.length > 40) this.feed.splice(0, this.feed.length - 40); }
        break;
      }
      case 'cv': this.ink.load(d.s as Stroke[], !!d.first); break;
      case 'feed': this.feed = (d.all as FeedE[]) ?? []; break;
      case 'you': this.choices = Array.isArray(d.choices) ? d.choices.map(String) : []; if (this.choices.length) this.onSound?.('turn'); break;
      case 'word': this.word = String(d.word ?? ''); break;
      case 'ok': this.gain = Number(d.pts) | 0; this.onSound?.('ok'); break;
      case 'close': this.close_ = String(d.g ?? ''); this.onSound?.('close'); setTimeout(() => { this.close_ = null; this.bump(); }, 2600); break;
      case 'full': this.status = 'full'; break;
      case 'kick': this.status = 'kicked'; this.relay.close(); break;
    }
    this.bump();
  }

  private applyState(raw: Record<string, unknown>) {
    const st = { ...(raw as unknown as Pub), players: unpackPlayers(raw.players) };
    if (this.status === 'connecting') this.status = 'in';
    // a new turn: forget the last word, choices and my drawing
    if (st.round !== this.round || (st.ph === 'spin' && this.ph !== 'spin') || (st.ph === 'lobby' && this.ph !== 'lobby')) {
      this.word = null; this.gain = 0; this.choices = []; this.outbox = [];
      this.ink.clear();
    }
    if (st.ph === 'lobby' && this.ph && this.ph !== 'lobby') this.feed = [];
    this.round = st.round;
    this.ph = st.ph;
    this.st = st;
    this.endsAt = Date.now() + st.left;
  }
}
