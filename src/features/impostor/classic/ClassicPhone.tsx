/* A student's phone in a classic Impostor room: join with a name, then hold the card to see
   your own word (or that you are the impostor), see your place in the speaking order, and the
   result at the end of each round. The projector never shows the words. */
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { Relay, makeId, type NetStatus } from "@/lib/relay";
import { useAuth } from "@/store/auth";
import { ui } from "../shared/words";
import { load, save } from "../shared/storage";
import type { FromClassicHost, PhoneView, ToClassicHost } from "./net";

const black = (size: string, extra: CSSProperties = {}): CSSProperties => ({ font: `400 ${size} 'Archivo Black',sans-serif`, ...extra });
const mono = (size: number, extra: CSSProperties = {}): CSSProperties => ({ font: `700 ${size}px 'Space Mono',monospace`, ...extra });
const ordinal = (n: number, es: boolean) => {
  if (es) return n + ".º";
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};

export function ClassicPhone({ code, onExit }: { code: string; onExit: () => void }) {
  const id = useMemo(() => {
    const k = "impostor.cpid." + code;
    let v = load<string>(k, "");
    if (!v) { v = "c-" + makeId(); save(k, v); }
    return v;
  }, [code]);
  const profile = useAuth((st) => st.profile);
  const accountName = (profile?.full_name || "").trim().split(/\s+/).slice(0, 2).join(" ").slice(0, 16);
  const [name, setName] = useState(load<string>("impostor.cname", "") || accountName);
  useEffect(() => { if (accountName) setName((n) => n || accountName); }, [accountName]);
  const [joined, setJoined] = useState(() => load<string>("impostor.cjoined." + code, "") === id);
  const [net, setNet] = useState<NetStatus>("connecting");
  const [view, setView] = useState<PhoneView | null>(null);
  const [peek, setPeek] = useState(false);
  const [seenRound, setSeenRound] = useState(0);
  const [kicked, setKicked] = useState(false);
  const relay = useRef<Relay | null>(null);
  const roundRef = useRef(-1);
  const nameRef = useRef(name);
  nameRef.current = name;

  useEffect(() => {
    if (!joined) return;
    const r = new Relay(code, id, "player");
    relay.current = r;
    const hello = () => r.send({ k: "hello", name: nameRef.current } satisfies ToClassicHost, "host");
    const offS = r.onStatus((st) => { setNet(st); if (st === "open") hello(); });
    const off = r.on((env) => {
      if (env.f === "_sys") { if (env.d?.type === "peer-join" && env.d.role === "host") hello(); return; }
      const m = env.d as FromClassicHost;
      if (!m || typeof m !== "object") return;
      if (m.k === "kick") { setKicked(true); r.close(); return; }
      if (m.k === "st") { if (roundRef.current !== m.round) setPeek(false); roundRef.current = m.round; setView(m); }
    });
    return () => { off(); offS(); r.close(); };
  }, [joined, code, id]);

  const es = (view?.lang || (load<string>("impostor.lang.v2", "es") === "en" ? "en" : "es")) === "es";
  const T = ui[es ? "es" : "en"];

  const join = () => {
    const n = name.trim().slice(0, 16);
    if (!n) return;
    save("impostor.cname", n);
    save("impostor.cjoined." + code, id);
    setName(n);
    setJoined(true);
  };
  const leave = () => {
    relay.current?.send({ k: "bye" } satisfies ToClassicHost, "host");
    save("impostor.cjoined." + code, "");
    onExit();
  };
  const gotIt = () => {
    if (!view) return;
    relay.current?.send({ k: "seen", round: view.round } satisfies ToClassicHost, "host");
    setSeenRound(view.round);
    setPeek(false);
  };

  const box: CSSProperties = { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18, padding: "28px 18px 40px", maxWidth: 520, margin: "0 auto", width: "100%" };

  if (kicked) return (
    <div className="page"><div style={box}>
      <div style={{ fontSize: 56 }}>🚪</div>
      <h1 className="h1" style={{ margin: 0, fontSize: 34 }}>{es ? "Has salido de la sala" : "You left the room"}</h1>
      <button type="button" className="btn btn-y" onClick={onExit}>← Impostor</button>
    </div></div>
  );

  if (!joined) return (
    <div className="page">
      <form style={box} onSubmit={(e) => { e.preventDefault(); join(); }}>
        <div className="kicker">{es ? "Impostor · clásico" : "Impostor · classic"} · {code}</div>
        <h1 className="h1" style={{ margin: 0, fontSize: "clamp(30px,8vw,44px)" }}>{es ? "¿Cómo te llamas?" : "What's your name?"}</h1>
        <p className="lead" style={{ margin: 0 }}>{es ? "Tu palabra aparecerá solo en tu móvil. No la enseñes." : "Your word will appear only on your phone. Don't show it to anyone."}</p>
        <input className="field" value={name} maxLength={16} autoFocus onChange={(e) => setName(e.target.value)} placeholder={es ? "Tu nombre" : "Your name"}
          style={{ width: "100%", padding: "14px 12px", fontSize: 24, fontWeight: 800, textAlign: "center" }} />
        <button type="submit" className="btn btn-y btn-big" disabled={!name.trim()}>▶ {es ? "Entrar" : "Join"}</button>
      </form>
    </div>
  );

  const stage = view?.stage || "wait";
  const seen = view && seenRound === view.round;
  const status = net === "open" ? null : <div style={mono(12, { color: "#f07a1a", letterSpacing: "0.12em" })}>{es ? "Conectando…" : "Connecting…"}</div>;

  return (
    <div className="page">
      <div style={box}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", gap: 10 }}>
          <span className="kicker" style={{ padding: "5px 10px" }}>{view?.name || name}</span>
          <button type="button" className="btn btn-d" style={{ padding: "8px 12px", fontSize: 11 }} onClick={leave}>{es ? "Salir" : "Leave"}</button>
        </div>
        {status}

        {stage === "wait" && (
          <>
            <div style={{ fontSize: 64, lineHeight: 1, animation: "imp-blink 2.4s ease-in-out infinite" }}>📱</div>
            <h1 className="h1" style={{ margin: 0, fontSize: "clamp(28px,7vw,40px)" }}>{es ? "¡Estás dentro!" : "You're in!"}</h1>
            <p className="lead" style={{ margin: 0 }}>{es ? "Espera a que tu profe empiece la ronda. Tu carta llegará aquí." : "Wait for your teacher to start the round. Your card will arrive here."}</p>
          </>
        )}

        {stage === "card" && view && (
          <>
            <div style={mono(12, { letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(242,239,230,0.6)" })}>{es ? "Ronda" : "Round"} {view.round}</div>
            <button type="button"
              onPointerDown={() => setPeek(true)} onPointerUp={() => setPeek(false)} onPointerLeave={() => setPeek(false)} onPointerCancel={() => setPeek(false)}
              onContextMenu={(e) => e.preventDefault()}
              style={{ position: "relative", width: "100%", minHeight: 240, border: "4px solid #0e1113", borderRadius: 8, boxShadow: "0 8px 0 #0e1113", cursor: "pointer", userSelect: "none", WebkitUserSelect: "none", touchAction: "none",
                display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: "26px 18px", color: "#f2efe6",
                background: peek ? (view.imp ? "#7d2f16" : "#2b3236") : "repeating-linear-gradient(45deg,#3b4349 0 16px,#2b3236 16px 32px)" }}>
              {peek ? (
                <>
                  <div style={mono(12, { padding: "5px 12px", border: "3px solid #0e1113", borderRadius: 3, background: view.imp ? "#f07a1a" : "#f5c518", letterSpacing: "0.16em", textTransform: "uppercase", color: "#0e1113" })}>{view.imp ? T.roleImp : T.roleAll}</div>
                  <div style={black("clamp(34px,11vw,60px)", { lineHeight: 1.02, textTransform: "uppercase", textShadow: "3px 3px 0 #0e1113", wordBreak: "break-word" })}>{view.word || "?"}</div>
                  {view.hint && <div style={{ fontSize: 18, fontWeight: 600, color: "rgba(242,239,230,0.85)" }}>{view.hint}</div>}
                </>
              ) : (
                <span style={mono(14, { padding: "10px 16px", border: "3px solid #0e1113", borderRadius: 3, background: "#1b2023", letterSpacing: "0.14em", textTransform: "uppercase", color: "#f5c518" })}>
                  {es ? "Mantén pulsado para ver tu carta" : "Hold to see your card"}
                </span>
              )}
            </button>
            {!seen
              ? <button type="button" className="btn btn-y btn-big" onClick={gotIt}>✓ {es ? "Ya la vi" : "Got it"}</button>
              : <div style={mono(12, { color: "#7bbf5a", letterSpacing: "0.14em", textTransform: "uppercase" })}>✓ {es ? "Listo — guárdala en secreto" : "Done — keep it secret"}</div>}
            {view.pos != null && view.total ? (
              <div className="plate" style={{ width: "100%", display: "flex", flexDirection: "column", gap: 8, alignItems: "center", background: view.myTurn ? "linear-gradient(#f5c518,#d9a800)" : undefined }}>
                {view.myTurn ? (
                  <div style={black("30px", { color: "#0e1113" })}>{es ? "¡Te toca!" : "Your turn!"}</div>
                ) : (
                  <>
                    <div className="lbl">{es ? "Tu turno para hablar" : "Your turn to speak"}</div>
                    <div style={black("36px", { color: "#f5c518" })}>{ordinal(view.pos + 1, es)} <span style={{ fontSize: 18, color: "rgba(242,239,230,0.6)" }}>/ {view.total}</span></div>
                    {view.speaking && <div style={{ fontSize: 16, color: "rgba(242,239,230,0.75)" }}>{es ? "Ahora habla" : "Now speaking"}: <b>{view.speaking}</b></div>}
                  </>
                )}
              </div>
            ) : null}
          </>
        )}

        {stage === "reveal" && view?.reveal && (
          <>
            <div style={mono(13, { padding: "6px 12px", border: "3px solid #0e1113", borderRadius: 3, background: view.reveal.caught ? "#7bbf5a" : "#f07a1a", letterSpacing: "0.16em", textTransform: "uppercase", color: "#0e1113" })}>
              {view.reveal.caught ? T.caught : T.walked}
            </div>
            <h1 className="h1" style={{ margin: 0, fontSize: "clamp(26px,7vw,40px)" }}>
              {view.reveal.imps.length > 1 ? view.reveal.imps.join(" + ") + T.wereImps : (view.reveal.imps[0] || "") + T.wasImp}
            </h1>
            {view.reveal.wasImp && <div className="kicker">{T.roleImp}</div>}
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
              <div className="well" style={{ padding: "10px 16px" }}><div className="lbl">{T.theWord}</div><div style={black("26px", { textTransform: "uppercase" })}>{view.reveal.word}</div></div>
              <div className="well" style={{ padding: "10px 16px" }}><div className="lbl">{T.theDecoy}</div><div style={black("26px", { textTransform: "uppercase", color: "#f0947a" })}>{view.reveal.decoy}</div></div>
            </div>
            <p className="lead" style={{ margin: 0 }}>{es ? "Espera la siguiente ronda." : "Wait for the next round."}</p>
          </>
        )}
      </div>
    </div>
  );
}
