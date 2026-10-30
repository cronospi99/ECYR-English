/* Host-authoritative rules. Every function mutates the given state and returns
   messages that the host should deliver to specific players. */
import { pickImpostors, shuffle, randInt } from "../shared/random";
import { TEACHERS } from "@/features/cards/teachers";
import { ALARM_PANELS, BELL, FUSE, RANGE, dist, spawnPoint, stations } from "./map";
import {
  defaultSettings, type FromHost, type HostState, type Look, type PlayerState, type Pos, type PublicState, type Role, type Secret
} from "./types";

export type Out = { to: string; msg: FromHost };
export type Positions = Record<string, Pos>;

export const REVEAL_MS = 7000;
export const RESULT_MS = 4500;
export const EJECT_MS = 6500;
export const START_COOLDOWN_MS = 12000;
export const EMERGENCY_GRACE_MS = 15000;
export const ALARM_MS = 45000;
export const SABOTAGE_COOLDOWN_MS = 30000;
export const FIRST_SABOTAGE_MS = 20000;

export function createState(code: string): HostState {
  return {
    code, phase: "lobby", settings: { ...defaultSettings }, players: [], bodies: [],
    meeting: null, eject: null, winner: null, winReason: "", phaseEndsAt: 0, round: 0,
    prevImpostors: [], log: [], sabotage: null, sabotageReadyAt: 0, lastKill: null, bathLocked: false
  };
}

const P = (s: HostState, id: string) => s.players.find((p) => p.id === id);
const sanitizeName = (n: string) => String(n || "").replace(/\s+/g, " ").trim().slice(0, 14) || "Student";
const sanitizeLook = (l: Look): Look => ({ color: Math.max(0, Math.min(15, Number(l?.color) || 0)), hat: String(l?.hat || "none").slice(0, 20), face: String(l?.face || "none").slice(0, 20), extra: String(l?.extra || "none").slice(0, 20) });

/* ECYR account id (uuid) and character card a player trains; anything else is dropped */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export type Meta = { uid?: string; card?: string };
const isCardId = (c: string) => TEACHERS.some((t) => t.id === c);
function setMeta(p: PlayerState, meta: Meta, cardToo: boolean) {
  if (typeof meta.uid === "string" && UUID.test(meta.uid)) p.uid = meta.uid.toLowerCase();
  if (cardToo && typeof meta.card === "string" && isCardId(meta.card)) p.card = meta.card;
}

export function hello(s: HostState, id: string, name: string, look: Look, teacher = false, meta: Meta = {}): Out[] {
  const p = P(s, id);
  if (p) {
    p.connected = true;
    if (s.phase === "lobby") { p.name = sanitizeName(name); p.look = sanitizeLook(look); p.teacher = !!teacher; }
    setMeta(p, meta, s.phase === "lobby" || !p.card);
    return [];
  }
  if (s.phase !== "lobby") {
    /* late joiners watch as ghosts until the next game */
    const np = newPlayer(id, name, look, false, teacher);
    setMeta(np, meta, true);
    s.players.push(np);
    return [{ to: id, msg: { k: "toast", text: "late" } }];
  }
  if (s.players.length >= 20) return [{ to: id, msg: { k: "toast", text: "full" } }];
  const np = newPlayer(id, name, look, true, teacher);
  setMeta(np, meta, true);
  s.players.push(np);
  return [];
}

function newPlayer(id: string, name: string, look: Look, alive: boolean, teacher: boolean): PlayerState {
  return { id, name: sanitizeName(name), look: sanitizeLook(look), connected: true, alive, role: "crew", tasks: [], done: [], emergencyLeft: 0, killReadyAt: 0, score: 0, teacher: !!teacher, earned: {} };
}

/* every point goes to the session scoreboard and to this game's ledger */
export const POINTS = { mission: 1, vote: 1, report: 1, fix: 1, elimination: 1, survive: 1, crewWin: 2, impostorWin: 3 };
function award(p: PlayerState, reason: string, n: number) {
  p.score += n;
  p.earned = p.earned || {};
  p.earned[reason] = (p.earned[reason] || 0) + n;
}
export const earnedTotal = (p: PlayerState) => Object.values(p.earned || {}).reduce((a, b) => a + b, 0);

/* called once when a game reaches the end screen: survival bonus + reward messages */
export function endRewards(s: HostState): Out[] {
  s.players.forEach((p) => { if (p.alive && p.tasks.length) award(p, "survive", POINTS.survive); });
  return s.players.map((p) => ({
    to: p.id,
    msg: { k: "reward", id: s.matchId || `${s.code}-${s.round}`, points: earnedTotal(p), items: { ...(p.earned || {}) } } as FromHost
  }));
}

export function setLook(s: HostState, id: string, name: string, look: Look, card?: string) {
  const p = P(s, id);
  if (p && s.phase === "lobby") { p.name = sanitizeName(name); p.look = sanitizeLook(look); setMeta(p, { card }, true); }
  return [];
}

export function disconnect(s: HostState, id: string) {
  const p = P(s, id);
  if (!p) return;
  p.connected = false;
  if (s.phase === "lobby") s.players = s.players.filter((x) => x.id !== id);
}

export function kick(s: HostState, id: string) {
  s.players = s.players.filter((x) => x.id !== id);
}

export function canStart(s: HostState) {
  return s.phase === "lobby" && s.players.filter((p) => p.connected).length >= 3;
}

/* how many phone addicts a game with n players gets */
export const addictCount = (st: HostState["settings"], n: number) => Math.max(1, Math.min(st.impostors, Math.floor((n - 1) / 2)));

/* mission numbers shown before the match starts */
export function missionPreview(s: HostState) {
  const n = s.players.filter((p) => p.connected).length;
  const perStudent = Math.max(1, Math.min(stations.length, s.settings.tasksPerPlayer));
  const good = n >= 3 ? n - addictCount(s.settings, n) : 0;
  return { onMap: stations.length, rooms: new Set(stations.map((x) => x.room)).size, perStudent, good, classGoal: good * perStudent };
}

export function startGame(s: HostState, now: number): Out[] {
  s.players = s.players.filter((p) => p.connected);
  const ids = s.players.map((p) => p.id);
  if (ids.length < 3) return [];
  const st = s.settings;
  const count = addictCount(st, ids.length);
  const imps = pickImpostors(ids, count, s.prevImpostors);
  s.prevImpostors = imps;
  s.round += 1;
  s.bodies = [];
  s.meeting = null;
  s.eject = null;
  s.winner = null;
  s.winReason = "";
  s.log = [];
  s.sabotage = null;
  s.sabotageReadyAt = now + REVEAL_MS + FIRST_SABOTAGE_MS;
  s.lastKill = null;
  s.bathLocked = randInt(5) === 0;
  const pickable = stations.filter((x) => !(s.bathLocked && x.room === "bath")).map((x) => x.id);
  const nTasks = Math.max(1, Math.min(pickable.length, st.tasksPerPlayer));
  s.players.forEach((p) => {
    p.alive = true;
    p.role = imps.indexOf(p.id) !== -1 ? "impostor" : "crew";
    p.tasks = shuffle(pickable).slice(0, nTasks);
    p.done = [];
    p.emergencyLeft = st.emergencies;
    p.killReadyAt = now + REVEAL_MS + START_COOLDOWN_MS;
    p.earned = {};
  });
  s.phase = "reveal";
  s.phaseEndsAt = now + REVEAL_MS;
  return [...teleportAll(s), ...secrets(s, now)];
}

export function teleportAll(s: HostState): Out[] {
  return s.players.map((p, i) => ({ to: p.id, msg: { k: "teleport", ...spawnPoint(i, s.players.length) } as FromHost }));
}

export function secrets(s: HostState, now: number): Out[] {
  return s.players.map((p) => ({ to: p.id, msg: { k: "secret", s: secretFor(s, p.id, now) } as FromHost }));
}

export function secretFor(s: HostState, id: string, now: number): Secret {
  const p = P(s, id)!;
  const imp = p.role === "impostor";
  return {
    role: p.role,
    partners: imp ? s.players.filter((x) => x.role === "impostor" && x.id !== id).map((x) => x.id) : [],
    tasks: p.tasks,
    done: p.done,
    killMsLeft: Math.max(0, p.killReadyAt - now),
    emergencyLeft: p.emergencyLeft,
    sabotageMsLeft: Math.max(0, s.sabotageReadyAt - now)
  };
}

export function taskTotals(s: HostState) {
  const crew = s.players.filter((p) => p.role === "crew");
  return { done: crew.reduce((a, p) => a + p.done.length, 0), total: crew.reduce((a, p) => a + p.tasks.length, 0) };
}

export function kill(s: HostState, killerId: string, targetId: string, pos: Positions, now: number): Out[] {
  if (s.phase !== "play") return [];
  const k = P(s, killerId), t = P(s, targetId);
  if (!k || !t || !k.alive || !t.alive || k.role !== "impostor" || t.role === "impostor") return [];
  if (now < k.killReadyAt) return [];
  const kp = pos[killerId], tp = pos[targetId];
  if (!kp || !tp || kp.vent || tp.vent || dist(kp, tp) > RANGE.kill + 60) return [];
  t.alive = false;
  const bx = Math.round(tp.x), by = Math.round(tp.y);
  s.bodies.push({ id: t.id, x: bx, y: by });
  s.lastKill = { x: bx, y: by, at: now, victim: t.id };
  k.killReadyAt = now + s.settings.killCooldown * 1000;
  s.log.push(`${k.name} eliminated ${t.name}`);
  award(k, "elimination", POINTS.elimination);
  /* like the original: the killer snaps onto the victim's spot */
  kp.x = bx; kp.y = by;
  const out: Out[] = [
    { to: t.id, msg: { k: "killed", by: k.id } },
    { to: k.id, msg: { k: "teleport", x: bx, y: by } },
    { to: k.id, msg: { k: "secret", s: secretFor(s, k.id, now) } }
  ];
  checkWin(s, now);
  return out;
}

export function report(s: HostState, reporter: string, bodyId: string, pos: Positions, now: number): Out[] {
  if (s.phase !== "play") return [];
  const r = P(s, reporter), b = s.bodies.find((x) => x.id === bodyId);
  const rp = pos[reporter];
  if (!r || !r.alive || !b || !rp || dist(rp, b) > RANGE.report + 60) return [];
  award(r, "report", POINTS.report);
  return startMeeting(s, reporter, "report", now, bodyId);
}

export function emergency(s: HostState, caller: string, pos: Positions, now: number): Out[] {
  if (s.phase !== "play") return [];
  const c = P(s, caller), cp = pos[caller];
  if (!c || !c.alive || c.emergencyLeft <= 0 || !cp || dist(cp, BELL) > RANGE.bell + 60) return [];
  if (s.sabotage) return [{ to: caller, msg: { k: "toast", text: "bellSabotage" } }];
  if (now < s.phaseEndsAt + EMERGENCY_GRACE_MS) return [{ to: caller, msg: { k: "toast", text: "bellCooldown" } }];
  c.emergencyLeft -= 1;
  return startMeeting(s, caller, "emergency", now);
}

export function teacherMeeting(s: HostState, now: number): Out[] {
  if (s.phase !== "play") return [];
  return startMeeting(s, "teacher", "teacher", now);
}

function startMeeting(s: HostState, caller: string, reason: "report" | "emergency" | "teacher", now: number, victim?: string): Out[] {
  s.phase = "meeting";
  s.bodies = [];
  s.sabotage = null;
  s.meeting = { caller, reason, victim, stage: "talk", endsAt: now + s.settings.talkSecs * 1000, votes: {}, chat: [] };
  return teleportAll(s);
}

export function taskDone(s: HostState, id: string, station: string, now: number): Out[] {
  if (s.phase !== "play") return [];
  const p = P(s, id);
  if (!p || p.tasks.indexOf(station) === -1 || p.done.indexOf(station) !== -1) return [];
  p.done.push(station);
  if (p.role === "crew") award(p, "mission", POINTS.mission);
  const out: Out[] = [{ to: id, msg: { k: "secret", s: secretFor(s, id, now) } }];
  checkWin(s, now);
  return out;
}

const alive = (s: HostState) => s.players.filter((p) => p.alive);

function toVote(s: HostState, now: number) {
  if (!s.meeting) return;
  s.meeting.stage = "vote";
  s.meeting.endsAt = now + s.settings.voteSecs * 1000;
}

export function vote(s: HostState, id: string, target: string, now: number) {
  const p = P(s, id), m = s.meeting;
  if (!p || !p.alive || !m || m.stage !== "vote" || m.votes[id]) return [];
  if (target !== "skip" && !alive(s).some((x) => x.id === target)) return [];
  m.votes[id] = target;
  if (alive(s).filter((x) => x.connected).every((x) => m.votes[x.id])) toResult(s, now);
  return [];
}

export function tally(s: HostState) {
  const t: Record<string, number> = {};
  Object.values(s.meeting?.votes || {}).forEach((v) => { t[v] = (t[v] || 0) + 1; });
  let best: string | null = null, bestN = 0, tie = false;
  Object.keys(t).forEach((k) => {
    if (t[k] > bestN) { best = k; bestN = t[k]; tie = false; } else if (t[k] === bestN) tie = true;
  });
  const id = tie || best === "skip" ? null : best;
  return { id, tie, tally: t };
}

function toResult(s: HostState, now: number) {
  if (!s.meeting) return;
  s.meeting.stage = "result";
  s.meeting.endsAt = now + RESULT_MS;
}

function doEject(s: HostState, now: number): Out[] {
  const r = tally(s);
  const ej = r.id ? P(s, r.id) : undefined;
  if (ej) { ej.alive = false; s.log.push(`${ej.name} was ejected`); }
  /* one point for every vote that pointed at a real impostor */
  Object.entries(s.meeting?.votes || {}).forEach(([voter, target]) => {
    const t = P(s, target), v = P(s, voter);
    if (t && v && t.role === "impostor" && v.role === "crew") award(v, "vote", POINTS.vote);
  });
  s.eject = { id: ej ? ej.id : null, wasImpostor: !!ej && ej.role === "impostor", tie: r.tie, tally: r.tally };
  s.phase = "eject";
  s.phaseEndsAt = now + EJECT_MS;
  return ej ? [{ to: ej.id, msg: { k: "killed" } }] : [];
}

export function checkWin(s: HostState, now: number) {
  if (s.phase === "lobby" || s.phase === "end") return;
  const a = alive(s);
  const imps = a.filter((p) => p.role === "impostor").length;
  const crew = a.length - imps;
  const tt = taskTotals(s);
  let w: Role | null = null, why = "";
  if (imps === 0) { w = "crew"; why = "impostorsOut"; }
  else if (imps >= crew) { w = "impostor"; why = "outnumber"; }
  else if (tt.total > 0 && tt.done >= tt.total) { w = "crew"; why = "tasks"; }
  if (!w) return;
  s.winner = w;
  s.winReason = why;
  s.phase = "end";
  s.phaseEndsAt = now;
  s.meeting = null;
  s.players.forEach((p) => {
    if (w === "crew" && p.role === "crew") award(p, "win", POINTS.crewWin);
    if (w === "impostor" && p.role === "impostor") award(p, "win", POINTS.impostorWin);
  });
}

export function chat(s: HostState, id: string, text: string, now: number): Out[] {
  const p = P(s, id), m = s.meeting;
  if (!p || !p.alive || !m || m.stage === "result") return [];
  const t = String(text || "").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!t) return [];
  const mine = m.chat.filter((c) => c.id === id);
  if (mine.length && now - mine[mine.length - 1].at < 1500) return [];
  m.chat.push({ id, text: t, at: now });
  if (m.chat.length > 60) m.chat.splice(0, m.chat.length - 60);
  return [];
}

export function sabotage(s: HostState, id: string, kind: "lights" | "alarm", now: number): Out[] {
  const p = P(s, id);
  if (s.phase !== "play" || !s.settings.sabotage || !p || p.role !== "impostor" || s.sabotage) return [];
  if (now < s.sabotageReadyAt) return [];
  s.sabotage = { kind, startedAt: now, endsAt: kind === "alarm" ? now + ALARM_MS : 0, holds: kind === "alarm" ? { A: [], B: [] } : {} };
  s.log.push(`sabotage: ${kind}`);
  return [];
}

function fixed(s: HostState, now: number) {
  s.sabotage = null;
  s.sabotageReadyAt = now + SABOTAGE_COOLDOWN_MS;
}

export function fixLights(s: HostState, id: string, pos: Positions, now: number): Out[] {
  const p = P(s, id), pp = pos[id];
  if (!p || !p.alive || s.sabotage?.kind !== "lights" || !pp || dist(pp, FUSE) > RANGE.fix + 60) return [];
  if (p.role === "crew") award(p, "fix", POINTS.fix);
  fixed(s, now);
  return [];
}

export function hold(s: HostState, id: string, panel: string, on: boolean, pos: Positions, now: number): Out[] {
  const p = P(s, id), sb = s.sabotage, pp = pos[id];
  const pn = ALARM_PANELS.find((x) => x.id === panel);
  if (!p || !p.alive || !sb || sb.kind !== "alarm" || !pn) return [];
  const list = (sb.holds[panel] || []).filter((x) => x !== id);
  if (on && pp && dist(pp, pn) <= RANGE.fix + 60) list.push(id);
  sb.holds[panel] = list;
  if (ALARM_PANELS.every((x) => (sb.holds[x.id] || []).length > 0)) {
    new Set(Object.values(sb.holds).flat()).forEach((hid) => { const h = P(s, hid); if (h && h.role === "crew") award(h, "fix", POINTS.fix); });
    fixed(s, now);
  }
  return [];
}

/* holders who walk away let go of the panel */
function pruneHolds(s: HostState, pos: Positions) {
  const sb = s.sabotage;
  if (!sb || sb.kind !== "alarm") return;
  ALARM_PANELS.forEach((pn) => {
    sb.holds[pn.id] = (sb.holds[pn.id] || []).filter((id) => {
      const pp = pos[id], p = P(s, id);
      return p && p.alive && pp && dist(pp, pn) <= RANGE.fix + 80;
    });
  });
}

/* advance timed phases; returns messages to send */
export function tick(s: HostState, now: number, pos: Positions = {}): Out[] {
  if (s.phase === "play" && s.sabotage?.kind === "alarm") {
    pruneHolds(s, pos);
    if (now >= s.sabotage.endsAt) {
      s.sabotage = null;
      s.winner = "impostor";
      s.winReason = "alarm";
      s.phase = "end";
      s.phaseEndsAt = now;
      s.players.forEach((p) => { if (p.role === "impostor") award(p, "win", POINTS.impostorWin); });
      return [];
    }
  }
  if (s.phase === "reveal" && now >= s.phaseEndsAt) {
    s.phase = "play";
    s.phaseEndsAt = now;
    return secrets(s, now);
  }
  if (s.phase === "meeting" && s.meeting && now >= s.meeting.endsAt) {
    if (s.meeting.stage === "talk") { toVote(s, now); return []; }
    if (s.meeting.stage === "vote") { toResult(s, now); return []; }
    return doEject(s, now);
  }
  if (s.phase === "eject" && now >= s.phaseEndsAt) {
    s.meeting = null;
    checkWin(s, now);
    if (s.phase === "eject") {
      s.phase = "play";
      s.phaseEndsAt = now;
      s.players.forEach((p) => { if (p.role === "impostor") p.killReadyAt = now + s.settings.killCooldown * 1000; });
      s.sabotageReadyAt = Math.max(s.sabotageReadyAt, now + FIRST_SABOTAGE_MS / 2);
      return [...teleportAll(s), ...secrets(s, now)];
    }
  }
  return [];
}

export function skipStage(s: HostState, now: number): Out[] {
  if (s.phase === "meeting" && s.meeting) { s.meeting.endsAt = now; return tick(s, now); }
  if (s.phase === "reveal" || s.phase === "eject") { s.phaseEndsAt = now; return tick(s, now); }
  return [];
}

export function backToLobby(s: HostState) {
  s.phase = "lobby";
  s.meeting = null;
  s.eject = null;
  s.bodies = [];
  s.winner = null;
  s.players = s.players.filter((p) => p.connected);
  s.players.forEach((p) => { p.alive = true; p.role = "crew"; p.tasks = []; p.done = []; });
}

export function endGame(s: HostState, now: number) {
  if (s.phase === "lobby") return;
  s.winner = null;
  s.winReason = "teacher";
  s.phase = "end";
  s.phaseEndsAt = now;
  s.meeting = null;
}

export function publicState(s: HostState, now: number): PublicState {
  const showRoles = s.phase === "end";
  const tt = taskTotals(s);
  const m = s.meeting;
  return {
    code: s.code,
    phase: s.phase,
    settings: s.settings,
    players: s.players.map((p) => ({
      id: p.id, name: p.name, look: p.look, alive: p.alive, connected: p.connected, score: p.score, teacher: p.teacher,
      earned: s.phase === "end" ? earnedTotal(p) : undefined,
      role: showRoles || (s.eject && s.eject.id === p.id && s.phase === "eject") ? p.role : undefined
    })),
    bodies: s.bodies,
    tasksDone: tt.done,
    tasksTotal: tt.total,
    meeting: m ? {
      caller: m.caller, reason: m.reason, victim: m.victim, stage: m.stage, chat: m.chat,
      msLeft: Math.max(0, m.endsAt - now), voted: Object.keys(m.votes),
      votes: m.stage === "result" ? m.votes : undefined
    } : null,
    eject: s.eject,
    winner: s.winner,
    winReason: s.winReason,
    msLeft: Math.max(0, s.phaseEndsAt - now),
    round: s.round,
    sabotage: s.sabotage ? {
      kind: s.sabotage.kind,
      msLeft: s.sabotage.endsAt ? Math.max(0, s.sabotage.endsAt - now) : 0,
      held: Object.keys(s.sabotage.holds).filter((k) => s.sabotage!.holds[k].length > 0)
    } : null,
    bathLocked: !!s.bathLocked,
    lastKill: s.lastKill && now - s.lastKill.at < 4000 ? { x: s.lastKill.x, y: s.lastKill.y, ago: now - s.lastKill.at, victim: s.lastKill.victim } : null
  };
}
