/* Treasure & Clue Hunt — live mode over the shared relay (same shape as English Racers' live.ts).
   HuntHost (projector, authoritative) and HuntClient (phone, with instant local feedback by running the
   same pure rules from src/lib/clueHunt). Plain classes with subscribe(), no React. */
import { Relay, makeCode, type Envelope, type NetStatus } from '@/lib/relay';
import type { HuntOpts, HuntPack, TeamProg } from '@/lib/clueHunt/types';
import { allCards, cleanProg, cpDone, emptyProg, findCard, hintCount, lastSolveAt, score, solvedCount, tryUnlock, trySolve, useHint, type SolveResult } from '@/lib/clueHunt/progress';
import { loadPack } from '@/lib/clueHunt/packs';
import { isEmblem, shortLabel, shortOf } from './art';

export const MAX_TEAMS = 30;
export const cleanName = (s: unknown) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, 18);

export type Phase = 'lobby' | 'live' | 'paused' | 'ended';
export interface PubTeam { peer: string; name: string; emb: string; online: boolean; score: number; solved: number; cps: boolean[]; hints: number; last: number }
export interface Pub { pack: string; phase: Phase; opts: HuntOpts; minutes: number; /** ms left at `at` */ left: number; elapsed: number; total: number; teams: PubTeam[] }
export interface FeedItem { id: number; at: number; kind: 'join' | 'unlock' | 'solve' | 'diya' | 'hint' | 'leave'; team: string; emb: string; card?: { en: string; fr: string } }
export interface HostSettings { codes: boolean; drafts: boolean; minutes: number }

interface Team { peer: string; name: string; emb: string; online: boolean; joinedAt: number; prog: TeamProg }
interface Saved { code: string; set: HostSettings; phase: Phase; remaining: number; elapsed: number; since: number; teams: { peer: string; name: string; emb: string; joinedAt: number; prog: TeamProg }[]; feed: FeedItem[] }
const KEY = (slug: string) => `hunt:host:${slug}`;
type Wire = { k: string; [x: string]: unknown };

export class HuntHost {
  readonly relay: Relay;
  readonly code: string;
  readonly slug: string;
  readonly pack: HuntPack;
  set: HostSettings = { codes: true, drafts: false, minutes: 30 };
  phase: Phase = 'lobby';
  net: NetStatus = 'connecting';
  teams = new Map<string, Team>();
  feed: FeedItem[] = [];
  private remaining = 30 * 60000;
  private elapsedBase = 0;
  private since = 0;
  private feedId = 1;
  private dirty = true;
  private listeners = new Set<() => void>();
  private offs: (() => void)[] = [];
  private loop: ReturnType<typeof setInterval>;
  onEnd: (() => void) | null = null;

  constructor(slug: string, pack: HuntPack, saved?: Saved | null) {
    this.slug = slug; this.pack = pack;
    this.code = saved?.code ?? makeCode();
    if (saved) {
      this.set = { ...this.set, ...saved.set };
      this.phase = saved.phase; this.remaining = saved.remaining; this.elapsedBase = saved.elapsed; this.since = saved.since;
      for (const t of saved.teams) this.teams.set(t.peer, { ...t, online: false, prog: cleanProg(t.prog) });
      this.feed = saved.feed ?? [];
      this.feedId = this.feed.reduce((n, f) => Math.max(n, f.id), 0) + 1;
    } else this.remaining = this.set.minutes * 60000;
    this.relay = new Relay(this.code, 'host-' + this.code, 'host');
    this.offs.push(this.relay.on((e) => this.onMsg(e)));
    this.offs.push(this.relay.onStatus((s) => { this.net = s; this.bump(); }));
    this.loop = setInterval(() => this.tick(), 160);
    this.persist();
  }
  static restore(slug: string): Saved | null {
    try { const v = JSON.parse(localStorage.getItem(KEY(slug)) ?? 'null') as Saved | null; return v && typeof v.code === 'string' ? v : null; } catch { return null; }
  }
  static forget(slug: string) { try { localStorage.removeItem(KEY(slug)); } catch { /* ignore */ } }

  get opts(): HuntOpts { return { codes: this.set.codes, drafts: this.set.drafts }; }
  get list(): Team[] { return [...this.teams.values()].sort((a, b) => a.joinedAt - b.joinedAt); }
  get running() { return this.phase === 'live'; }
  left() { return this.phase === 'live' ? Math.max(0, this.remaining - (Date.now() - this.since)) : this.remaining; }
  elapsed() { return this.elapsedBase + (this.phase === 'live' ? Date.now() - this.since : 0); }
  totalCards() { return allCards(this.pack, this.opts).length; }
  subscribe(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  private bump() { this.dirty = true; this.persist(); this.listeners.forEach((f) => f()); }
  close() { clearInterval(this.loop); this.offs.forEach((f) => f()); this.relay.close(); }

  private persist() {
    const s: Saved = { code: this.code, set: this.set, phase: this.phase, remaining: this.remaining, elapsed: this.elapsedBase, since: this.since, teams: this.list.map(({ peer, name, emb, joinedAt, prog }) => ({ peer, name, emb, joinedAt, prog })), feed: this.feed.slice(-40) };
    try { localStorage.setItem(KEY(this.slug), JSON.stringify(s)); } catch { /* ignore */ }
  }
  private log(kind: FeedItem['kind'], t: Team, card?: FeedItem['card']) {
    this.feed.push({ id: this.feedId++, at: Date.now(), kind, team: t.name, emb: t.emb, card });
    if (this.feed.length > 60) this.feed.splice(0, this.feed.length - 60);
  }

  pub(): Pub {
    const o = this.opts;
    const teams: PubTeam[] = this.list.map((t) => ({
      peer: t.peer, name: t.name, emb: t.emb, online: t.online, score: score(t.prog), solved: solvedCount(t.prog, this.pack, o),
      cps: this.pack.checkpoints.map((cp) => cpDone(t.prog, cp, o)), hints: hintCount(t.prog), last: lastSolveAt(t.prog),
    }));
    return { pack: this.slug, phase: this.phase, opts: o, minutes: this.set.minutes, left: this.left(), elapsed: this.elapsed(), total: this.totalCards(), teams };
  }
  /** Teams ranked: points, then fewer hints, then who finished first. */
  ranking(): PubTeam[] { return this.pub().teams.sort((a, b) => b.score - a.score || b.solved - a.solved || a.hints - b.hints || a.last - b.last); }

  configure(p: Partial<HostSettings>) {
    if (this.phase !== 'lobby') return;
    this.set = { ...this.set, ...p, minutes: Math.max(1, Math.min(180, Math.round(p.minutes ?? this.set.minutes))) };
    this.remaining = this.set.minutes * 60000;
    this.bump();
  }
  start() { if (this.phase !== 'lobby') return; this.phase = 'live'; this.since = Date.now(); this.remaining = this.set.minutes * 60000; this.elapsedBase = 0; this.bump(); }
  private freeze() { if (this.phase === 'live') { const d = Date.now() - this.since; this.remaining = Math.max(0, this.remaining - d); this.elapsedBase += d; } }
  pause() { if (this.phase !== 'live') return; this.freeze(); this.phase = 'paused'; this.bump(); }
  resume() { if (this.phase !== 'paused') return; this.phase = 'live'; this.since = Date.now(); this.bump(); }
  addMinutes(n: number) { if (this.phase === 'live') { this.freeze(); this.since = Date.now(); this.remaining += n * 60000; } else if (this.phase === 'paused') this.remaining += n * 60000; this.bump(); }
  end() { if (this.phase === 'ended' || this.phase === 'lobby') return; this.freeze(); this.phase = 'ended'; this.remaining = Math.max(0, this.remaining); this.bump(); this.onEnd?.(); }
  kick(peer: string) { this.relay.send({ k: 'kick' }, peer); this.teams.delete(peer); this.bump(); }

  private sendMe(peer: string) {
    const t = this.teams.get(peer);
    if (t) this.relay.send({ k: 'me', prog: t.prog }, peer);
  }
  private tick() {
    if (this.phase === 'live' && this.left() <= 0) this.end();
    if (this.phase === 'live' || this.phase === 'ended' || this.phase === 'paused') this.listeners.forEach((f) => f());
    if (this.dirty) { this.dirty = false; this.relay.send({ k: 'pub', st: this.pub() }); }
  }

  private onMsg(env: Envelope) {
    const d = env.d as Wire, peer = env.f;
    if (peer === '_sys') {
      if (d?.type === 'peer-leave') { const t = this.teams.get(d.id as string); if (t) { t.online = false; this.bump(); } }
      return;
    }
    if (!d || typeof d.k !== 'string') return;
    const o = this.opts;
    switch (d.k) {
      case 'hi': {
        const name = cleanName(d.name);
        if (name.length < 2) return;
        const emb = isEmblem(d.emb) ? String(d.emb) : 'diya';
        let t = this.teams.get(peer);
        if (!t && this.teams.size >= MAX_TEAMS) { this.relay.send({ k: 'full' }, peer); return; }
        if (t) { t.name = name; t.emb = emb; t.online = true; }
        else { t = { peer, name, emb, online: true, joinedAt: Date.now(), prog: emptyProg() }; this.teams.set(peer, t); this.log('join', t); }
        this.relay.send({ k: 'pub', st: this.pub() }, peer);
        this.sendMe(peer);
        this.bump();
        break;
      }
      case 'need': this.relay.send({ k: 'pack', pack: this.pack }, peer); break;
      case 'code': {
        const t = this.teams.get(peer);
        if (!t || this.phase !== 'live' || !o.codes) return;
        const had = t.prog.unlocked.length;
        if (tryUnlock(this.pack, t.prog, String(d.cp), String(d.text ?? '').slice(0, 60)) && t.prog.unlocked.length > had) this.log('unlock', t, shortOf(this.pack.checkpoints.find((c) => c.id === d.cp)!.title));
        this.sendMe(peer); this.bump();
        break;
      }
      case 'ans': {
        const t = this.teams.get(peer);
        if (!t || this.phase !== 'live') return;
        const r = trySolve(this.pack, t.prog, String(d.card), String(d.text ?? '').slice(0, 200), o, this.elapsed());
        if (r.ok) {
          this.log('solve', t, shortLabel(r.card));
          const f = findCard(this.pack, r.card.id, o);
          if (f && cpDone(t.prog, f.cp, o)) this.log('diya', t, f.cp.title);
        }
        this.sendMe(peer); this.bump();
        break;
      }
      case 'hint': {
        const t = this.teams.get(peer);
        if (!t || this.phase !== 'live') return;
        if (useHint(this.pack, t.prog, String(d.card), o)) { const f = findCard(this.pack, String(d.card), o); this.log('hint', t, f ? shortLabel(f.card) : undefined); }
        this.sendMe(peer); this.bump();
        break;
      }
    }
  }
}

/* ------------------------------------------------------------------ phone */
export type ClientStatus = 'ok' | 'kicked' | 'full';
export class HuntClient {
  readonly relay: Relay;
  readonly code: string;
  readonly peer: string;
  name: string;
  emb: string;
  net: NetStatus = 'connecting';
  status: ClientStatus = 'ok';
  pub: Pub | null = null;
  pack: HuntPack | null = null;
  prog: TeamProg = emptyProg();
  private pubAt = 0;
  private fresh = true;
  private loading = '';
  private listeners = new Set<() => void>();
  private offs: (() => void)[] = [];

  constructor(code: string, peer: string, name: string, emb: string) {
    this.code = code; this.peer = peer; this.name = name; this.emb = emb;
    this.relay = new Relay(code, peer, 'player');
    this.offs.push(this.relay.on((e) => this.onMsg(e)));
    this.offs.push(this.relay.onStatus((s) => { const was = this.net; this.net = s; if (s === 'open' && was !== 'open') this.hello(); this.bump(); }));
  }
  subscribe(f: () => void) { this.listeners.add(f); return () => { this.listeners.delete(f); }; }
  private bump() { this.listeners.forEach((f) => f()); }
  close() { this.offs.forEach((f) => f()); this.relay.close(); }
  private hello() { this.relay.send({ k: 'hi', name: this.name, emb: this.emb, fresh: this.fresh }, 'host'); this.fresh = false; }
  setEmblem(id: string) { this.emb = id; this.hello(); }
  get opts(): HuntOpts { return this.pub?.opts ?? { codes: true, drafts: false }; }
  get phase(): Phase { return this.pub?.phase ?? 'lobby'; }
  /** ms left now (counts down locally between messages). */
  left() { return !this.pub ? 0 : this.pub.phase === 'live' ? Math.max(0, this.pub.left - (Date.now() - this.pubAt)) : this.pub.left; }
  elapsed() { return !this.pub ? 0 : this.pub.elapsed + (this.pub.phase === 'live' ? Date.now() - this.pubAt : 0); }
  rank() { const ts = [...(this.pub?.teams ?? [])].sort((a, b) => b.score - a.score || a.last - b.last); const i = ts.findIndex((t) => t.peer === this.peer); return i < 0 ? 0 : i + 1; }

  unlock(cpId: string, text: string): boolean {
    if (!this.pack) return false;
    const ok = tryUnlock(this.pack, this.prog, cpId, text);
    this.relay.send({ k: 'code', cp: cpId, text }, 'host');
    this.bump();
    return ok;
  }
  answer(cardId: string, text: string): SolveResult {
    if (!this.pack) return { ok: false, reason: 'unknown' };
    const r = trySolve(this.pack, this.prog, cardId, text, this.opts, this.elapsed());
    this.relay.send({ k: 'ans', card: cardId, text }, 'host');
    this.bump();
    return r;
  }
  hint(cardId: string) {
    if (!this.pack) return;
    useHint(this.pack, this.prog, cardId, this.opts);
    this.relay.send({ k: 'hint', card: cardId }, 'host');
    this.bump();
  }
  private onMsg(env: Envelope) {
    const d = env.d as Wire, from = env.f;
    if (!d || typeof d.k !== 'string') return;
    const fromHost = from.startsWith('host-');
    if (!fromHost) return;
    switch (d.k) {
      case 'pub': {
        this.pub = d.st as Pub; this.pubAt = Date.now();
        if (!this.pack && this.loading !== this.pub.pack) {
          this.loading = this.pub.pack;
          void loadPack(this.pub.pack).then((p) => { if (p) { this.pack = p; this.bump(); } else this.relay.send({ k: 'need' }, 'host'); });
        }
        this.bump();
        break;
      }
      case 'pack': if (!this.pack && d.pack && typeof d.pack === 'object') { this.pack = d.pack as HuntPack; this.bump(); } break;
      case 'me': this.prog = cleanProg(d.prog); this.bump(); break;
      case 'kick': this.status = 'kicked'; this.relay.close(); this.bump(); break;
      case 'full': this.status = 'full'; this.relay.close(); this.bump(); break;
    }
  }
}
