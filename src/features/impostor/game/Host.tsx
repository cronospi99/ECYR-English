import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { qrDataUrl } from "./qr";
import { awardGamePoints, type Award } from "@/features/cards/api";
import * as E from "./engine";
import { Relay, makeCode, makeId, type NetStatus } from "@/lib/relay";
import { defaultSettings, type FromHost, type HostState, type Pos, type PosMsg, type PublicPlayer, type Settings, type ToHost } from "./types";
import { Header } from "../shared/Header";
import { Fit } from "../shared/Fit";
import { g } from "./i18n";
import { LingoBadge, Lingo, useClock } from "./Character";
import { MapDefs, MapDynamic, MapStatic, Watchman } from "./MapView";
import { ALARM_PANELS, FUSE, WORLD, rooms, stations } from "./map";
import { ChatFeed, MeetingSplash, SoundToggle } from "./ui";
import { sfx, startSiren, stopSiren, unlockAudio } from "./sfx";
import { Hatch } from "../classic/ClassicGame";

const KEY = "impostor.host";

function restore(): { code: string; hostId: string; state: HostState } {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw);
      if (v && v.code && v.state) {
        /* merge defaults so a session saved by an older version still works */
        v.state = { ...E.createState(v.code), ...v.state, settings: { ...defaultSettings, ...v.state.settings } };
        return v;
      }
    }
  } catch { /* ignore */ }
  const code = makeCode();
  return { code, hostId: "host-" + makeId(), state: E.createState(code) };
}

export function Host({ onExit, demo = false, onPhase }: { onExit: () => void; demo?: boolean; onPhase?: (phase: string) => void }) {
  const init = useRef(demo ? { code: "DEMO", hostId: "host-demo", state: E.createState("DEMO") } : restore()).current;
  const [s, setS] = useState<HostState>(init.state);
  const ref = useRef(s);
  ref.current = s;
  if (import.meta.env.DEV) (window as any).__host = ref;
  const pos = useRef<Record<string, Pos>>({});
  const relay = useRef<Relay | null>(null);
  const [net, setNet] = useState<NetStatus>("connecting");
  const [qr, setQr] = useState("");
  const [teacherView, setTeacherView] = useState(false);
  const [tqr, setTqr] = useState("");
  const [splash, setSplash] = useState<{ reason: string; caller: string; victim?: string } | null>(null);
  const T = g(s.settings.lang);
  const joinUrl = `${location.origin}/impostor/join/${init.code}`;
  const teacherUrl = joinUrl + "?teacher=1";

  const deliver = useCallback((outs: E.Out[]) => {
    outs.forEach((o) => relay.current?.send(o.msg, o.to));
  }, []);

  const broadcast = useCallback((st: HostState) => {
    const msg: FromHost = { k: "state", s: E.publicState(st, Date.now()) };
    relay.current?.send(msg);
  }, []);

  /* run a rule on a copy of the state, then publish */
  const apply = useCallback((fn: (d: HostState, now: number) => E.Out[] | void) => {
    const d: HostState = structuredClone(ref.current);
    const outs = fn(d, Date.now()) || [];
    /* game just ended: survival bonus + points for every phone */
    if (ref.current.phase !== "end" && d.phase === "end") outs.push(...E.endRewards(d));
    ref.current = d;
    setS(d);
    deliver(outs);
    broadcast(d);
  }, [broadcast, deliver]);

  useEffect(() => {
    const r = new Relay(init.code, init.hostId, "host");
    relay.current = r;
    const offS = r.onStatus((st) => {
      setNet(st);
      if (st === "open") broadcast(ref.current);
    });
    const off = r.on((env) => {
      if (env.f === "_sys") {
        if (env.d?.type === "peer-leave" && env.d.role === "player") apply((d) => { E.disconnect(d, env.d.id); });
        return;
      }
      const m = env.d as ToHost | PosMsg;
      const id = env.f;
      if (!m || typeof m !== "object") return;
      if (m.k === "pos") { pos.current[id] = { x: m.x, y: m.y, dir: m.dir, moving: m.m, vent: m.v }; return; }
      if ((m as { k: string }).k === "emote" || (m as { k: string }).k === "ventfx") return;
      apply((d, now) => {
        switch (m.k) {
          case "hello": {
            const outs = E.hello(d, id, m.name, m.look, !!m.teacher, { uid: m.uid, card: m.card });
            const p = d.players.find((x) => x.id === id);
            if (p && d.phase !== "lobby" && p.tasks.length) outs.push({ to: id, msg: { k: "secret", s: E.secretFor(d, id, now) } });
            return outs;
          }
          case "look": return E.setLook(d, id, m.name, m.look, m.card);
          case "kill": return E.kill(d, id, m.target, pos.current, now);
          case "report": return E.report(d, id, m.body, pos.current, now);
          case "emergency": return E.emergency(d, id, pos.current, now);
          case "task": return E.taskDone(d, id, m.station, now);
          case "vote": return E.vote(d, id, m.target, now);
          case "chat": return E.chat(d, id, m.text, now);
          case "sabotage": return E.sabotage(d, id, m.kind, now);
          case "fixLights": return E.fixLights(d, id, pos.current, now);
          case "hold": return E.hold(d, id, m.panel, m.on, pos.current, now);
        }
      });
    });
    return () => { off(); offS(); r.close(); };
  }, [apply, broadcast, init.code, init.hostId]);

  /* timed phases + periodic heartbeat so phones resync their timers */
  useEffect(() => {
    let beat = 0;
    const iv = setInterval(() => {
      const cur = ref.current;
      const probe: HostState = structuredClone(cur);
      const outs = E.tick(probe, Date.now(), pos.current);
      const changed = outs.length || probe.phase !== cur.phase || probe.meeting?.stage !== cur.meeting?.stage || probe.phaseEndsAt !== cur.phaseEndsAt
        || JSON.stringify(probe.sabotage) !== JSON.stringify(cur.sabotage);
      if (changed) apply((d, now) => E.tick(d, now, pos.current));
      else if (++beat % 8 === 0) broadcast(cur);
    }, 250);
    return () => clearInterval(iv);
  }, [apply, broadcast]);

  useEffect(() => {
    if (demo) return;
    try { sessionStorage.setItem(KEY, JSON.stringify({ code: init.code, hostId: init.hostId, state: s })); } catch { /* ignore */ }
  }, [s, init.code, init.hostId]);

  useEffect(() => {
    setQr(qrDataUrl(joinUrl, "#0e1113", "#f2efe6"));
    setTqr(qrDataUrl(teacherUrl, "#0e1113", "#f5c518"));
  }, [joinUrl, teacherUrl]);

  /* projector sounds + meeting splash */
  const phaseKey = s.phase + (s.meeting ? ":" + s.meeting.reason + s.meeting.caller : "");
  useEffect(() => {
    if (s.phase === "meeting" && s.meeting && s.meeting.stage === "talk") {
      setSplash({ reason: s.meeting.reason, caller: s.meeting.caller, victim: s.meeting.victim });
      if (!demo) { if (s.meeting.reason === "report") sfx.report(); else sfx.meeting(); }
      const t = setTimeout(() => setSplash(null), 2600);
      return () => clearTimeout(t);
    }
    if (!demo && s.phase === "eject") sfx.eject();
    if (!demo && s.phase === "end") { if (s.winner === "crew") sfx.win(); else sfx.lose(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey]);
  useEffect(() => { onPhase?.(s.phase); }, [s.phase, onPhase]);

  /* match over: pay the character-card points of signed-in ECYR players, once per match
     (the RPC also refuses to pay a match twice), then tell each phone whether it was saved */
  const [cardsNote, setCardsNote] = useState("");
  const paid = useRef("");
  useEffect(() => {
    if (demo || s.phase !== "end" || !s.matchId || paid.current === s.matchId) return;
    const matchId = s.matchId;
    paid.current = matchId;
    const players = s.players.filter((p) => p.uid && p.card && E.earnedTotal(p) > 0);
    if (!players.length) { setCardsNote(""); return; }
    const awards: Award[] = players.map((p) => ({ userId: p.uid!, cardId: p.card!, points: E.earnedTotal(p) }));
    setCardsNote("🃏 …");
    void awardGamePoints("impostor", matchId, awards).then((r) => {
      setCardsNote("🃏 " + r.message);
      players.forEach((p) => {
        const saved = r.saved.includes(p.uid!) || r.skipped.some((k) => k.userId === p.uid && k.reason === "already_paid");
        relay.current?.send({ k: "cards", id: matchId, saved, note: saved ? undefined : r.reason || r.skipped.find((k) => k.userId === p.uid)?.reason } satisfies FromHost, p.id);
      });
    });
  }, [demo, s.phase, s.matchId, s.players]);
  const alarmOn = s.phase === "play" && s.sabotage?.kind === "alarm";
  useEffect(() => { if (alarmOn && !demo) { startSiren(); return () => stopSiren(); } }, [alarmOn, demo]);

  const setSetting = <K extends keyof Settings>(k: K, v: Settings[K]) => apply((d) => { d.settings[k] = v; });
  const newRoom = () => { try { sessionStorage.removeItem(KEY); } catch { /* ignore */ } location.reload(); };

  const pub = useMemo(() => E.publicState(s, Date.now()), [s]);
  const now = useNow(s.phase === "meeting" || s.phase === "reveal" || s.phase === "eject" || !!s.sabotage);
  const msLeft = s.phase === "meeting" && s.meeting ? Math.max(0, s.meeting.endsAt - now) : Math.max(0, s.phaseEndsAt - now);
  const name = (id?: string) => (id === "teacher" ? (s.settings.lang === "es" ? "el profesor" : "the teacher") : s.players.find((p) => p.id === id)?.name || "?");
  const tt = E.taskTotals(s);
  const alive = s.players.filter((p) => p.alive).length;

  return (
    <div className="page">
      <Header
        title="ECYR English"
        phase={T[s.phase]}
        chips={[`${T.code} ${init.code}`, `${s.settings.lang.toUpperCase()} · ${s.settings.level}`, net === "open" ? "● online" : "○ " + T.connecting]}
        actions={[
          ...(s.phase === "lobby" ? [{ label: s.settings.lang === "es" ? "Sala nueva" : "New room", onClick: newRoom }] : []),
          { label: T.home, onClick: onExit }
        ]}
      />

      {splash && <MeetingSplash T={T} pub={pub} {...splash} />}

      {s.phase === "play" && (
        <div className="pad-sm" style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 14, padding: "18px 30px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
            <TaskBar label={T.taskBar} done={tt.done} total={tt.total} />
            <span className="tag" style={{ color: "#f2efe6", fontSize: 13 }}>{alive} / {s.players.length} {T.alive}</span>
            <label style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 14, cursor: "pointer" }}>
              <input type="checkbox" checked={teacherView} onChange={(e) => setTeacherView(e.target.checked)} /> {T.teacherView}
            </label>
            <button type="button" className="btn btn-o btn-sm" onClick={() => apply((d, n) => E.teacherMeeting(d, n))}>{T.callMeeting}</button>
            <button type="button" className="btn btn-s btn-sm" onClick={() => apply((d, n) => E.endGame(d, n))}>{T.endGame}</button>
          </div>
          {s.sabotage && (
            <div style={{ padding: "12px 16px", border: "3px solid #0e1113", borderRadius: 5, background: "#b4441f", color: "#fff3e0", font: "700 18px 'Space Mono',monospace", animation: "imp-blink 1s infinite" }}>
              {s.sabotage.kind === "alarm"
                ? `🚨 ${T.fireAlarm} — ${Math.ceil(Math.max(0, s.sabotage.endsAt - now) / 1000)}s · ${T.alarmMsg}`
                : `💡 ${T.lightsOut} — ${T.lightsMsg}`}
            </div>
          )}
          {s.bathLocked && <div className="tag" style={{ alignSelf: "flex-start", color: "#0e1113", background: "#f2efe6", fontSize: 13 }}>🚫💩 {T.bathLocked}</div>}
          <HostMap players={s.players} pos={pos} bodies={teacherView ? s.bodies : []} show={teacherView} bathLocked={s.bathLocked} sabotage={s.sabotage?.kind} held={s.sabotage ? Object.keys(s.sabotage.holds).filter((k) => s.sabotage!.holds[k].length) : []} />
        </div>
      )}

      {s.phase !== "play" && <Fit>

      {s.phase === "lobby" && (
        <div className="stack-sm pad-sm" style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(min(340px,100%),0.8fr) minmax(min(420px,100%),1.2fr)", gap: 36, padding: "30px 30px", alignItems: "start" }}>
          {demo ? (
            <div>
              <div className="kicker" style={{ marginBottom: 14, background: "#9b6bd3" }}>🤖 {T.demoMode}</div>
              <h1 className="h1" style={{ fontSize: "clamp(34px,4.4vw,58px)" }}>{T.demoTitle}</h1>
              <p className="lead" style={{ fontSize: 18 }}>{T.demoHelp}</p>
            </div>
          ) : (
          <div>
            <div className="kicker" style={{ marginBottom: 14 }}>{T.academy}</div>
            <h1 className="h1" style={{ fontSize: "clamp(34px,4.4vw,58px)" }}>{T.scan}</h1>
            <div style={{ display: "inline-block", padding: 14, border: "4px solid #0e1113", borderRadius: 8, background: "#f2efe6", boxShadow: "0 8px 0 #0e1113" }}>
              {qr ? <img src={qr} alt="QR code" style={{ width: "min(340px,70vw)", height: "auto", display: "block", imageRendering: "pixelated" }} /> : <div style={{ width: 300, height: 300 }} />}
            </div>
            <div style={{ marginTop: 18, fontSize: 16, color: "rgba(242,239,230,0.7)" }}>{T.orGo}</div>
            <div style={{ font: "700 clamp(16px,1.6vw,22px) 'Space Mono',monospace", color: "#f5c518", wordBreak: "break-all" }}>{joinUrl.replace(/^https?:\/\//, "")}</div>
            <div style={{ marginTop: 10, display: "flex", alignItems: "center", gap: 12 }}>
              <span className="lbl">{T.code}</span>
              <span style={{ font: "400 44px 'Archivo Black',sans-serif", letterSpacing: "0.12em", textShadow: "3px 3px 0 #0e1113" }}>{init.code}</span>
            </div>
            <p className="lead" style={{ marginTop: 16, fontSize: 16 }}>{T.hostHelp}</p>
          </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            <div className="plate">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                <span className="lbl lbl-y">{s.players.length} {T.players}</span>
                {!s.players.length && <span style={{ fontSize: 14, color: "rgba(242,239,230,0.5)", animation: "imp-blink 2s infinite" }}>{T.waiting}</span>}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(112px,1fr))", gap: 10 }}>
                {s.players.map((p) => (
                  <div key={p.id} className="well" style={{ padding: "8px 6px 8px", display: "flex", flexDirection: "column", alignItems: "center", gap: 4, animation: "imp-popIn .3s", opacity: p.connected ? 1 : 0.4 }}>
                    <LingoBadge look={p.look} size={58} seed={p.id} />
                    <div style={{ fontWeight: 800, fontSize: 14, textAlign: "center", wordBreak: "break-word" }}>{p.teacher ? "🎓 " : ""}{p.name}</div>
                    {p.score > 0 && <div style={{ font: "700 11px 'Space Mono',monospace", color: "#f5c518" }}>★ {p.score}</div>}
                    <button type="button" onClick={() => apply((d) => E.kick(d, p.id))} style={{ border: 0, background: "transparent", color: "rgba(242,239,230,0.4)", fontSize: 11, cursor: "pointer", textDecoration: "underline" }}>{T.kick}</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="plate">
              <div className="lbl lbl-y" style={{ marginBottom: 14 }}>{T.settings}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))", gap: 18 }}>
                <Setting label={T.language} opts={[["en", "English"], ["es", "Español"]]} cur={s.settings.lang} onPick={(v) => setSetting("lang", v)} />
                <Setting label={T.level} opts={(["A1", "A2", "B1", "B2", "C1", "Mixed"] as const).map((x) => [x, x])} cur={s.settings.level} onPick={(v) => setSetting("level", v)} />
                <Setting label={T.impostors} opts={[[1, "1"], [2, "2"], [3, "3"]]} cur={s.settings.impostors} onPick={(v) => setSetting("impostors", v)} />
                <Setting label={T.tasks} opts={[[3, "3"], [4, "4"], [5, "5"], [6, "6"]]} cur={s.settings.tasksPerPlayer} onPick={(v) => setSetting("tasksPerPlayer", v)} />
                <Setting label={T.cooldown} opts={[[20, "20s"], [30, "30s"], [45, "45s"]]} cur={s.settings.killCooldown} onPick={(v) => setSetting("killCooldown", v)} />
                <Setting label={T.talkTime} opts={[[30, "30s"], [45, "45s"], [60, "60s"], [90, "90s"]]} cur={s.settings.talkSecs} onPick={(v) => setSetting("talkSecs", v)} />
                <Setting label={T.voteTime} opts={[[30, "30s"], [40, "40s"], [60, "60s"]]} cur={s.settings.voteSecs} onPick={(v) => setSetting("voteSecs", v)} />
                <Setting label={T.sabotageOpt} opts={[[1, T.on], [0, T.off]]} cur={s.settings.sabotage ? 1 : 0} onPick={(v) => setSetting("sabotage", !!v)} />
                <Setting label={T.ventsOpt} opts={[[1, T.on], [0, T.off]]} cur={s.settings.vents ? 1 : 0} onPick={(v) => setSetting("vents", !!v)} />
                <Setting label={T.chatOpt} opts={[["quick", T.quickOnly], ["free", T.freeText]]} cur={s.settings.chat} onPick={(v) => setSetting("chat", v)} />
              </div>
            </div>

            <MissionsPlate s={s} T={T} />

            {!demo && <div className="plate" style={{ display: "flex", gap: 16, alignItems: "center", flexWrap: "wrap" }}>
              {tqr && <img src={tqr} alt="Teacher QR" style={{ width: 120, height: 120, border: "3px solid #0e1113", borderRadius: 6, imageRendering: "pixelated" }} />}
              <div style={{ flex: 1, minWidth: 200 }}>
                <div className="lbl lbl-y" style={{ marginBottom: 6 }}>🎓 {T.teacherPlays}</div>
                <div style={{ fontSize: 14, color: "rgba(242,239,230,0.7)", marginBottom: 10 }}>{T.teacherPlaysHelp}</div>
                <button type="button" className="btn btn-s btn-sm" onClick={() => window.open(teacherUrl, "_blank", "width=420,height=860")}>{T.openWindow}</button>
              </div>
            </div>}

            <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
              <button type="button" className="btn btn-y btn-big" disabled={!E.canStart(s)} onClick={() => { unlockAudio(); apply((d, n) => { const o = E.startGame(d, n); d.matchId = `${init.code}-${d.round}-${makeId()}`; if (import.meta.env.DEV && location.search.includes("bath=locked")) d.bathLocked = true; return o; }); }}>{T.start}</button>
              <SoundToggle T={T} />
              {!E.canStart(s) && <span className="lbl">{T.needThree}</span>}
            </div>
          </div>
        </div>
      )}

      {s.phase === "reveal" && (
        <Center>
          <div className="kicker">{s.round}</div>
          <h1 className="h1" style={{ textAlign: "center" }}>{s.settings.lang === "es" ? "¡Mira tu móvil!" : "Check your phone!"}</h1>
          <div className="tag" style={{ color: "#f5c518", fontSize: 16 }}>🎯 {tt.total} {T.missionsToday} · {stations.length} {T.onMap}</div>
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center", maxWidth: 900 }}>
            {s.players.map((p) => <LingoBadge key={p.id} look={p.look} size={64} style={{ animation: "imp-bob 1.4s ease-in-out infinite" }} />)}
          </div>
          <Countdown ms={msLeft} />
          <button type="button" className="btn btn-s" onClick={() => apply((d, n) => E.skipStage(d, n))}>{T.skip}</button>
        </Center>
      )}

      {s.phase === "meeting" && s.meeting && (
        <div className="pad-sm" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 18, padding: "26px 30px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 20, flexWrap: "wrap" }}>
            <div>
              <div className="kicker" style={{ background: s.meeting.reason === "report" ? "#e23d4f" : "#f07a1a" }}>
                {s.meeting.reason === "report" ? T.bodyFound : s.meeting.reason === "emergency" ? T.emergencyCalled : T.teacherCalled}
              </div>
              <h2 className="h2" style={{ marginTop: 12 }}>
                {s.meeting.stage === "talk" ? T.talkStage : s.meeting.stage === "vote" ? T.voteStage : T.result}
              </h2>
              <div style={{ fontSize: 17, color: "rgba(242,239,230,0.7)" }}>
                {s.meeting.reason !== "teacher" && <>{T.by} <b>{name(s.meeting.caller)}</b></>}
                {s.meeting.victim && <> · {T.victim}: <b style={{ color: "#f0947a" }}>{name(s.meeting.victim)}</b></>}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <Countdown ms={msLeft} />
              <button type="button" className="btn btn-s" onClick={() => apply((d, n) => E.skipStage(d, n))}>{T.skip}</button>
            </div>
          </div>
          <div className="stack-sm" style={{ display: "grid", gridTemplateColumns: "minmax(0,1.6fr) minmax(min(300px,100%),1fr)", gap: 20, alignItems: "start" }}>
            <MeetingBoard pub={pub} lang={s.settings.lang} big />
            <div className="plate">
              <div className="lbl lbl-y" style={{ marginBottom: 10 }}>💬 {T.chat}</div>
              <ChatFeed pub={pub} max={10} big />
            </div>
          </div>
        </div>
      )}

      {s.phase === "eject" && s.eject && (
        <Center>
          <div style={{ width: "min(900px,92vw)" }}>
            <EjectScene pub={pub} lang={s.settings.lang} impLeft={s.players.filter((p) => p.alive && p.role === "impostor").length} />
          </div>
        </Center>
      )}

      {s.phase === "end" && (
        <EndScreen pub={pub} lang={s.settings.lang} note={demo ? undefined : cardsNote} onAgain={() => apply((d) => E.backToLobby(d))} />
      )}
      </Fit>}
    </div>
  );
}

function useNow(active: boolean) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    if (!active) return;
    const iv = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(iv);
  }, [active]);
  return now;
}

function Setting<V extends string | number>({ label, opts, cur, onPick }: { label: string; opts: readonly (readonly [V, string])[]; cur: V; onPick: (v: V) => void }) {
  return (
    <div>
      <div className="lbl" style={{ marginBottom: 8 }}>{label}</div>
      <div className="row" style={{ gap: 6 }}>
        {opts.map(([v, l]) => (
          <button key={String(v)} type="button" className={"opt " + (v === cur ? "on" : "off")} style={{ padding: "8px 12px", fontSize: 12 }} onClick={() => onPick(v)}>{l}</button>
        ))}
      </div>
    </div>
  );
}

export function Center({ children }: { children: React.ReactNode }) {
  return <div className="pad-sm" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 22, padding: "30px" }}>{children}</div>;
}

export function Countdown({ ms }: { ms: number }) {
  const sec = Math.ceil(ms / 1000);
  return (
    <div style={{ padding: "8px 18px", border: "4px solid #0e1113", borderRadius: 6, background: "#1b2023", boxShadow: "0 5px 0 #0e1113", font: "400 clamp(30px,4vw,52px) 'Archivo Black',sans-serif", color: sec <= 5 ? "#f07a1a" : "#f5c518", fontVariantNumeric: "tabular-nums" }}>
      0:{String(sec).padStart(2, "0")}
    </div>
  );
}

/* lobby: how many missions there are before the match starts */
function MissionsPlate({ s, T }: { s: HostState; T: ReturnType<typeof g> }) {
  const m = E.missionPreview(s);
  const Num = ({ n, l }: { n: number | string; l: string }) => (
    <div className="well" style={{ padding: "8px 12px", flex: "1 1 120px" }}>
      <div style={{ font: "400 30px 'Archivo Black',sans-serif", color: "#f5c518", lineHeight: 1 }}>{n}</div>
      <div style={{ fontSize: 13, color: "rgba(242,239,230,0.7)" }}>{l}</div>
    </div>
  );
  return (
    <div className="plate">
      <div className="lbl lbl-y" style={{ marginBottom: 10 }}>🗺 {T.missionsTitle}</div>
      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 10 }}>
        <Num n={m.onMap} l={`${T.onMap} · ${m.rooms} ${T.inRooms}`} />
        <Num n={m.perStudent} l={T.perStudent} />
        <Num n={m.classGoal || "—"} l={`${T.classGoal}${m.good ? ` (${m.good} × ${m.perStudent})` : ""}`} />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(190px,1fr))", gap: "3px 12px", fontSize: 13 }}>
        {stations.map((st) => {
          const r = rooms.find((x) => x.id === st.room)!;
          return <div key={st.id} style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}><span style={{ color: r.accent }}>■</span> <b>{r.en}</b> · {st.label}</div>;
        })}
      </div>
    </div>
  );
}

export function TaskBar({ label, done, total }: { label: string; done: number; total: number }) {
  const pct = total ? Math.round((done / total) * 100) : 0;
  return (
    <div style={{ flex: "1 1 280px", minWidth: 200 }}>
      <div className="lbl" style={{ marginBottom: 5 }}>{label}: {done}/{total} — {pct}%</div>
      <span className="bar" style={{ height: 22, border: "3px solid #0e1113", display: "block" }}>
        <span style={{ width: pct + "%", backgroundImage: "repeating-linear-gradient(45deg,#7bbf5a 0 9px,#5f9a2b 9px 18px)", transition: "width .4s" }} />
      </span>
    </div>
  );
}

/* projector map: floor plan scaled to fit; players only in teacher view */
function HostMap({ players, pos, bodies, show, sabotage, held, bathLocked }: { players: HostState["players"]; pos: React.MutableRefObject<Record<string, Pos>>; bodies: HostState["bodies"]; show: boolean; sabotage?: string; held: string[]; bathLocked?: boolean }) {
  const t = useClock(true, show ? 30 : 6);
  return (
    <div style={{ flex: 1, minHeight: 0, border: "4px solid #0e1113", borderRadius: 6, overflow: "hidden", background: "#141a1d", boxShadow: "0 6px 0 #0e1113" }}>
      <svg viewBox={`40 20 ${WORLD.w - 40} ${WORLD.h - 20}`} preserveAspectRatio="xMidYMid meet" style={{ width: "100%", height: "100%", display: "block" }}>
        <MapDefs />
        <MapStatic />
        <MapDynamic bathLocked={bathLocked} />
        <Watchman t={t} lookDir={Math.sin(t * 0.5) > 0 ? 1 : -1} />
        {bodies.map((b) => {
          const p = players.find((x) => x.id === b.id);
          return p ? <g key={b.id} transform={`translate(${b.x},${b.y})`}><Lingo look={p.look} dead /></g> : null;
        })}
        {sabotage === "lights" && <rect x={0} y={0} width={WORLD.w} height={WORLD.h} fill="#000" opacity={0.55} />}
        {sabotage === "lights" && <circle cx={FUSE.x} cy={FUSE.y - 46} r={60 + Math.sin(t * 8) * 8} fill="none" stroke="#e23d4f" strokeWidth={8} />}
        {sabotage === "alarm" && ALARM_PANELS.map((a) => <circle key={a.id} cx={a.x} cy={a.y - 8} r={56 + Math.sin(t * 10) * 8} fill="none" stroke={held.includes(a.id) ? "#7bbf5a" : "#e23d4f"} strokeWidth={8} />)}
        {show && players.map((p) => {
          const q = pos.current[p.id];
          if (!q || q.vent) return null;
          return (
            <g key={p.id} transform={`translate(${q.x},${q.y})`}>
              <Lingo look={p.look} ghost={!p.alive} dir={q.dir} moving={q.moving} t={t} seed={p.id} />
              <text y={-118} textAnchor="middle" fontSize={22} fontWeight={800} fill="#f2efe6" stroke="#0e1113" strokeWidth={5} paintOrder="stroke">{p.name}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function MeetingBoard({ pub, lang, me, onVote, myVote, big }: { pub: ReturnType<typeof E.publicState>; lang: "en" | "es"; me?: string; onVote?: (id: string) => void; myVote?: string; big?: boolean }) {
  const T = g(lang);
  const m = pub.meeting!;
  const tally: Record<string, number> = {};
  Object.values(m.votes || {}).forEach((v) => { tally[v] = (tally[v] || 0) + 1; });
  const canVote = !!onVote && m.stage === "vote" && !myVote && pub.players.find((p) => p.id === me)?.alive;
  return (
    <div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(auto-fill,minmax(min(${big ? 250 : 200}px,100%),1fr))`, gap: 10 }}>
        {pub.players.map((p) => {
          const voted = m.voted.indexOf(p.id) !== -1;
          const votes = tally[p.id] || 0;
          const clickable = canVote && p.alive && p.id !== me;
          return (
            <button key={p.id} type="button" disabled={!clickable && !!onVote} onClick={() => clickable && onVote!(p.id)}
              style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", border: "3px solid #0e1113", borderRadius: 5, textAlign: "left", color: "#f2efe6", opacity: p.alive ? 1 : 0.45, cursor: clickable ? "pointer" : "default",
                background: myVote === p.id ? "#7d2f16" : "linear-gradient(#3b4349,#2b3236)", boxShadow: "0 4px 0 #0e1113", position: "relative" }}>
              <LingoBadge look={p.look} size={big ? 58 : 44} ghost={!p.alive} seed={p.id} scared={m.stage === "result" && votes > 0} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 800, fontSize: big ? 20 : 16, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{p.teacher ? "🎓 " : ""}{p.name}{p.id === me ? (lang === "es" ? " (tú)" : " (you)") : ""}</div>
                {!p.alive && <div style={{ font: "700 15px 'Space Mono',monospace", color: "rgba(242,239,230,0.5)" }}>☠</div>}
                {m.stage === "result" && votes > 0 && (
                  <div style={{ display: "flex", gap: 2, flexWrap: "wrap", marginTop: 4 }}>
                    {Object.entries(m.votes || {}).filter(([, t]) => t === p.id).map(([voter], k) => {
                      const vp = pub.players.find((x) => x.id === voter);
                      return vp ? <span key={voter} title={vp.name} style={{ animation: `imp-popIn .3s ${k * 0.15}s both` }}><LingoBadge look={vp.look} size={22} animate={false} /></span> : null;
                    })}
                  </div>
                )}
              </div>
              {m.stage === "vote" && voted && <span style={{ font: "700 10px 'Space Mono',monospace", padding: "3px 6px", border: "2px solid #0e1113", borderRadius: 3, background: "#7bbf5a", color: "#0e1113" }}>✓</span>}
              {m.stage === "result" && <span style={{ font: "400 24px 'Archivo Black',sans-serif", color: votes ? "#f07a1a" : "rgba(242,239,230,0.3)", flex: "none" }}>{votes}</span>}
            </button>
          );
        })}
      </div>
      {m.stage === "vote" && <div style={{ marginTop: 12, fontSize: 15, color: "rgba(242,239,230,0.6)" }}>{m.voted.length} / {pub.players.filter((p) => p.alive).length} {T.voted}</div>}
      {m.stage === "result" && (
        <div style={{ marginTop: 12, display: "flex", alignItems: "center", gap: 6, font: "700 15px 'Space Mono',monospace", color: "rgba(242,239,230,0.7)" }}>
          {T.skipVote}: {tally.skip || 0}
          {Object.entries(m.votes || {}).filter(([, t]) => t === "skip").map(([voter]) => {
            const vp = pub.players.find((x) => x.id === voter);
            return vp ? <LingoBadge key={voter} look={vp.look} size={22} animate={false} /> : null;
          })}
        </div>
      )}
    </div>
  );
}

export function EjectScene({ pub, lang, impLeft }: { pub: ReturnType<typeof E.publicState>; lang: "en" | "es"; impLeft?: number }) {
  const T = g(lang);
  const ej = pub.eject!;
  const p: PublicPlayer | undefined = pub.players.find((x) => x.id === ej.id);
  const line = p ? `${p.name} ${ej.wasImpostor ? T.wasImp : T.wasNot}` : `${T.noEject} ${ej.tie ? T.tie : T.skipped}`;
  return (
    <div>
      <Hatch caught={ej.wasImpostor} verdict={p ? (ej.wasImpostor ? "📱 " + T.impostor : "📚 " + T.crew) : T.result} line={line}>
        {p && <div style={{ animation: "imp-flyOut 3.2s ease-in 1.2s both", display: "flex", justifyContent: "center", marginBottom: 6 }}><LingoBadge look={p.look} size={70} /></div>}
      </Hatch>
      {impLeft !== undefined && <div style={{ textAlign: "center", marginTop: 16, font: "700 14px 'Space Mono',monospace", color: "rgba(242,239,230,0.7)" }}>{impLeft} {T.impLeft}</div>}
    </div>
  );
}

export function EndScreen({ pub, lang, onAgain, note }: { pub: ReturnType<typeof E.publicState>; lang: "en" | "es"; onAgain?: () => void; note?: string }) {
  const T = g(lang);
  const crewWin = pub.winner === "crew";
  const why = pub.winReason === "tasks" ? T.whyTasks : pub.winReason === "impostorsOut" ? T.whyOut : pub.winReason === "outnumber" ? T.whyOutnumber : T.teacherEnded;
  const imps = pub.players.filter((p) => p.role === "impostor");
  return (
    <Center>
      <div style={{ width: "min(1000px,100%)", display: "flex", flexDirection: "column", gap: 20 }}>
        <Hatch caught={crewWin} verdict={why} line={pub.winner ? (crewWin ? T.crewWins : T.impWins) : T.end} />
        <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
          <div className="well" style={{ padding: "12px 18px", display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <div className="lbl">📱 {T.impostorsName}</div>
            {imps.map((p) => <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 800 }}><LingoBadge look={p.look} size={34} />{p.name}</div>)}
          </div>
        </div>
        <div className="plate">
          <div className="lbl lbl-y" style={{ marginBottom: 10 }}>{T.score}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 8 }}>
            {pub.players.slice().sort((a, b) => b.score - a.score).map((p, i) => (
              <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 8px", border: "3px solid #0e1113", borderRadius: 4, background: "#20262a" }}>
                <span style={{ font: "700 13px 'Space Mono',monospace", color: "#f5c518", minWidth: 22 }}>{i + 1}</span>
                <LingoBadge look={p.look} size={30} />
                <span style={{ flex: 1, fontWeight: 800 }}>{p.name}{p.role === "impostor" ? " 📱" : ""}</span>
                {p.earned ? <span style={{ font: "700 12px 'Space Mono',monospace", color: "#7bbf5a" }}>+{p.earned}</span> : null}
                <span style={{ font: "400 20px 'Archivo Black',sans-serif", color: "#f5c518" }}>{p.score}</span>
              </div>
            ))}
          </div>
        </div>
        {note && <div className="tag" style={{ alignSelf: "flex-start", color: "#f2efe6", fontSize: 12, whiteSpace: "normal", lineHeight: 1.4 }}>{note}</div>}
        {onAgain && <div><button type="button" className="btn btn-y btn-big" onClick={onAgain}>{T.playAgain}</button></div>}
      </div>
    </Center>
  );
}
