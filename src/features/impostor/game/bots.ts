/* Computer-controlled players for Demo mode. Each bot is a normal client: it joins
   the (in-memory) room, receives the same messages a phone gets and sends the same
   actions — so the host's rules treat it exactly like a student. */
import { Relay } from "@/lib/relay";
import type { FromHost, PosMsg, PublicState, Secret, ToHost, Look } from "./types";
import { ALARM_PANELS, FUSE, RANGE, SPEED, WORLD, dist, ghostMove, moveWithin, spawnPoint, stations, walkable } from "./map";
import { pick, randInt } from "../shared/random";
import { rooms } from "./map";

type P = { x: number; y: number };

/* ---- grid pathfinding (BFS on a 20-unit grid) ---- */
const CELL = 20;
const GW = Math.ceil(WORLD.w / CELL), GH = Math.ceil(WORLD.h / CELL);
function cellOf(p: P) { return { cx: Math.round(p.x / CELL), cy: Math.round(p.y / CELL) }; }
function free(cx: number, cy: number) { return cx >= 0 && cy >= 0 && cx < GW && cy < GH && walkable(cx * CELL, cy * CELL); }
function nearestFree(p: P) {
  const { cx, cy } = cellOf(p);
  for (let r = 0; r < 8; r++) for (let dx = -r; dx <= r; dx++) for (let dy = -r; dy <= r; dy++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) === r && free(cx + dx, cy + dy)) return { cx: cx + dx, cy: cy + dy };
  }
  return null;
}
export function findPath(from: P, to: P): P[] {
  const a = nearestFree(from), b = nearestFree(to);
  if (!a || !b) return [to];
  const prev = new Int32Array(GW * GH).fill(-1);
  const start = a.cy * GW + a.cx, goal = b.cy * GW + b.cx;
  prev[start] = start;
  const q = [start];
  for (let qi = 0; qi < q.length; qi++) {
    const c = q[qi];
    if (c === goal) break;
    const cx = c % GW, cy = (c - cx) / GW;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const nx = cx + dx, ny = cy + dy, n = ny * GW + nx;
      if (nx < 0 || ny < 0 || nx >= GW || ny >= GH || prev[n] !== -1) continue;
      if (!free(nx, ny) || (dx && dy && (!free(cx + dx, cy) || !free(cx, cy + dy)))) continue;
      prev[n] = c;
      q.push(n);
    }
  }
  if (prev[goal] === -1) return [to];
  const out: P[] = [];
  for (let c = goal; c !== start; c = prev[c]) out.push({ x: (c % GW) * CELL, y: Math.floor(c / GW) * CELL });
  out.reverse();
  /* drop a waypoint only when the straight line to the one after it stays on walkable floor */
  const clear = (a: P, b: P) => {
    const n = Math.ceil(dist(a, b) / 8);
    for (let i = 1; i < n; i++) if (!walkable(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
    return true;
  };
  const smooth: P[] = [];
  let cur: P = from;
  let i = 0;
  while (i < out.length) {
    let j = i;
    while (j + 1 < out.length && j - i < 6 && clear(cur, out[j + 1])) j++;
    smooth.push(out[j]);
    cur = out[j];
    i = j + 1;
  }
  return smooth.length ? smooth : [to];
}

const PHRASES_P = ["I suspect {p}.", "{p} is acting sus!", "Where were you, {p}?", "{p} was with me.", "I saw {p} near the body.", "{p} is safe.", "{p} was on their phone!"];
const PHRASES = ["I didn't see anything.", "Let's skip this vote.", "Who called the meeting?", "I was in the {r}."];

export class Bot {
  private relay: Relay;
  pos = { x: 0, y: 0, dir: 1, m: false };
  private pub: (PublicState & { at: number }) | null = null;
  private secret: (Secret & { at: number }) | null = null;
  private others: Record<string, { x: number; y: number; v?: string }> = {};
  path: P[] = [];
  goal: { kind: string; x: number; y: number; ref?: string } | null = null;
  waitUntil = 0;
  private lastSend = 0;
  private stuckSince = 0;
  private timer: ReturnType<typeof setInterval>;
  private stageKey = "";
  private timeouts: ReturnType<typeof setTimeout>[] = [];
  private holding: string | null = null;
  private fixer = Math.random() < 0.6;
  private sabotageKey = "";
  private lastSabotageTry = 0;
  private reported = new Set<string>();

  constructor(code: string, public id: string, public name: string, public look: Look) {
    this.relay = new Relay(code, id, "player");
    const start = spawnPoint(randInt(8), 8);
    this.pos.x = start.x; this.pos.y = start.y;
    this.relay.on((env) => {
      if (env.f === "_sys") {
        if (env.d?.type === "peer-join" && env.d.role === "host") this.hello();
        return;
      }
      const m = env.d as FromHost | PosMsg;
      if (!m) return;
      if (m.k === "pos") { this.others[env.f] = { x: m.x, y: m.y, v: m.v }; return; }
      const now = Date.now();
      if (m.k === "state") this.onState({ ...m.s, at: now });
      if (m.k === "secret") this.secret = { ...m.s, at: now };
      if (m.k === "teleport") { this.pos.x = m.x; this.pos.y = m.y; this.path = []; this.goal = null; this.waitUntil = 0; }
    });
    setTimeout(() => this.hello(), 300 + randInt(900));
    this.timer = setInterval(() => this.tick(), 66);
  }

  private hello() { this.send({ k: "hello", name: this.name, look: this.look }); }
  private send(m: ToHost) { this.relay.send(m, "host"); }
  private later(ms: number, fn: () => void) { this.timeouts.push(setTimeout(fn, ms)); }

  stop() {
    clearInterval(this.timer);
    this.timeouts.forEach(clearTimeout);
    this.relay.close();
  }

  private me() { return this.pub?.players.find((p) => p.id === this.id); }

  private onState(s: PublicState & { at: number }) {
    this.pub = s;
    const m = s.meeting;
    const key = m ? `${s.round}:${m.caller}:${m.stage}:${m.victim || ""}` : "";
    if (key === this.stageKey) return;
    this.stageKey = key;
    if (this.holding) { this.send({ k: "hold", panel: this.holding, on: false }); this.holding = null; }
    if (!m || !this.me()?.alive) return;
    const others = s.players.filter((p) => p.alive && p.id !== this.id);
    if (m.stage === "talk") {
      /* one or two lines of discussion each */
      const lines = Math.random() < 0.85 ? 1 + randInt(2) : 0;
      for (let n = 0; n < lines; n++) {
        this.later(2500 + n * 6000 + randInt(6000), () => {
          const tpl = Math.random() < 0.6 && others.length ? pick(PHRASES_P).replace("{p}", pick(others).name) : pick(PHRASES).replace("{r}", pick(rooms).en);
          this.send({ k: "chat", text: tpl });
        });
      }
    }
    if (m.stage === "vote") {
      this.later(2000 + randInt(7000), () => {
        const imp = this.secret?.role === "impostor";
        const pool = others.filter((p) => !imp || !this.secret!.partners.includes(p.id));
        const target = Math.random() < 0.25 || !pool.length ? "skip" : pick(pool).id;
        this.send({ k: "vote", target });
      });
    }
  }

  private setGoal(kind: string, x: number, y: number, ref?: string) {
    if (this.goal && this.goal.kind === kind && this.goal.ref === ref && dist(this.goal, { x, y }) < 40) return;
    this.goal = { kind, x, y, ref };
    this.waitUntil = 0;
    const ghost = !this.me()?.alive;
    this.path = ghost ? [{ x, y }] : findPath(this.pos, { x, y });
  }

  private tick() {
    const now = Date.now();
    const s = this.pub, me = this.me();
    if (!s || s.phase !== "play" || !me || !this.secret) { this.pos.m = false; return; }
    const alive = me.alive;
    const imp = this.secret.role === "impostor";
    const sab = s.sabotage;
    if (!sab && this.goal && (this.goal.kind === "fuse" || this.goal.kind === "panel")) { this.goal = null; this.path = []; }

    /* 1. sabotage repairs (crew) */
    if (alive && !imp && sab) {
      const sk = sab.kind + s.round + Math.floor((s.at - sab.msLeft) / 1000);
      if (sk !== this.sabotageKey) { this.sabotageKey = sk; this.fixer = Math.random() < 0.65; }
      if (sab.kind === "lights" && this.fixer) {
        this.setGoal("fuse", FUSE.x, FUSE.y + 20);
        if (dist(this.pos, FUSE) < RANGE.fix - 20) this.send({ k: "fixLights" });
      }
      if (sab.kind === "alarm" && this.fixer) {
        const pn = ALARM_PANELS.slice().sort((a, b) => dist(this.pos, a) - dist(this.pos, b))[sab.held.length === 1 && !this.holding ? (sab.held[0] === ALARM_PANELS[0].id ? 1 : 0) : 0];
        const panel = sab.held.length === 1 && !this.holding ? ALARM_PANELS.find((x) => !sab.held.includes(x.id))! : pn;
        this.setGoal("panel", panel.x, panel.y + 30, panel.id);
        if (dist(this.pos, panel) < RANGE.fix - 20 && this.holding !== panel.id) { this.holding = panel.id; this.send({ k: "hold", panel: panel.id, on: true }); }
      }
    } else if (this.holding && !sab) this.holding = null;

    /* 2. crew report bodies they bump into */
    if (alive && !imp && !this.holding) {
      const body = s.bodies.find((b) => dist(this.pos, b) < 260 && !this.reported.has(b.id));
      if (body) {
        this.setGoal("body", body.x, body.y, body.id);
        if (dist(this.pos, body) < RANGE.report - 30) { this.reported.add(body.id); this.send({ k: "report", body: body.id }); }
      }
    }

    /* 3. impostors hunt (and sometimes sabotage) */
    if (alive && imp) {
      const killReady = this.secret.killMsLeft - (now - this.secret.at) <= 0;
      if (s.settings.sabotage && !sab && this.secret.sabotageMsLeft - (now - this.secret.at) <= 0 && now - this.lastSabotageTry > 9000) {
        this.lastSabotageTry = now;
        if (Math.random() < 0.35) this.send({ k: "sabotage", kind: Math.random() < 0.6 ? "lights" : "alarm" });
      }
      if (killReady) {
        const prey = s.players
          .filter((p) => p.alive && p.id !== this.id && !this.secret!.partners.includes(p.id) && this.others[p.id] && !this.others[p.id].v)
          .map((p) => ({ p, d: dist(this.pos, this.others[p.id]) }))
          .sort((a, b) => a.d - b.d)[0];
        if (prey && prey.d < RANGE.kill - 20) { this.send({ k: "kill", target: prey.p.id }); this.goal = null; this.path = []; }
        else if (prey && prey.d < 700) { const o = this.others[prey.p.id]; this.setGoal("hunt", o.x, o.y, prey.p.id + Math.floor(now / 1200)); }
      }
    }

    /* 4. otherwise: missions (impostors fake them) */
    if (!this.goal || (this.goal.kind === "task" && now >= this.waitUntil && this.path.length === 0 && this.waitUntil > 0)) {
      if (this.goal?.kind === "task" && this.waitUntil > 0) {
        if (!imp) this.send({ k: "task", station: this.goal.ref! });
        this.goal = null;
        this.waitUntil = 0;
      }
      const left = this.secret.tasks.filter((t) => !this.secret!.done.includes(t));
      const st = imp ? pick(stations) : stations.find((x) => x.id === (left[0] || ""));
      if (st) this.setGoal("task", st.x, st.y + 30, st.id);
      else this.setGoal("wander", pick(stations).x, pick(stations).y + 30, "w" + now);
    }

    /* walk */
    if (now < this.waitUntil) { this.pos.m = false; this.maybeSend(now); return; }
    const next = this.path[0];
    if (!next) {
      if (this.goal && (this.goal.kind === "task") && this.waitUntil === 0) this.waitUntil = now + 2500 + randInt(3500);
      else if (this.goal && this.goal.kind !== "task" && this.goal.kind !== "panel" && this.goal.kind !== "fuse") this.goal = null;
      this.pos.m = false;
      this.maybeSend(now);
      return;
    }
    const step = (SPEED * 0.92 * 66) / 1000;
    const dx = next.x - this.pos.x, dy = next.y - this.pos.y, d = Math.hypot(dx, dy);
    if (d < step + 2) { this.path.shift(); }
    const mx = (dx / (d || 1)) * Math.min(step, d), my = (dy / (d || 1)) * Math.min(step, d);
    const r = alive ? moveWithin(this.pos.x, this.pos.y, mx, my) : ghostMove(this.pos.x, this.pos.y, mx, my);
    const moved = Math.hypot(r.x - this.pos.x, r.y - this.pos.y);
    this.pos.m = moved > 0.5;
    if (Math.abs(mx) > 0.5) this.pos.dir = mx > 0 ? 1 : -1;
    this.pos.x = r.x; this.pos.y = r.y;
    if (moved > 0.5) this.stuckSince = 0;
    else if (!this.stuckSince) this.stuckSince = now;
    else if (now - this.stuckSince > 700 && this.goal) {
      /* wiggle free, then re-plan */
      const a = Math.random() * Math.PI * 2;
      const r2 = moveWithin(this.pos.x, this.pos.y, Math.cos(a) * 14, Math.sin(a) * 14);
      this.pos.x = r2.x; this.pos.y = r2.y;
      this.path = findPath(this.pos, this.goal);
      this.stuckSince = 0;
    }
    this.maybeSend(now);
  }

  private maybeSend(now: number) {
    if ((this.pos.m && now - this.lastSend > 90) || now - this.lastSend > 900) {
      this.lastSend = now;
      this.relay.send({ k: "pos", x: Math.round(this.pos.x), y: Math.round(this.pos.y), dir: this.pos.dir, m: this.pos.m } satisfies PosMsg, undefined, true);
    }
  }
}
