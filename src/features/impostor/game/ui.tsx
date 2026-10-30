import { useState } from "react";
import type { Look, PublicState } from "./types";
import type { GStrings } from "./i18n";
import { LingoBadge, Lingo, useClock } from "./Character";
import { isMuted, setMuted, unlockAudio } from "./sfx";

export function SoundToggle({ T }: { T: GStrings }) {
  const [m, setM] = useState(isMuted());
  return (
    <button type="button" className="btn btn-s btn-sm" onClick={() => { setMuted(!m); setM(!m); if (m) unlockAudio(); }} title={T.mute}>
      {m ? "🔇" : "🔊"} {T.mute}
    </button>
  );
}

/* meeting chat feed (accusations / quick phrases) */
export function ChatFeed({ pub, me, max = 12, big = false }: { pub: PublicState; me?: string; max?: number; big?: boolean }) {
  const lines = (pub.meeting?.chat || []).slice(-max);
  if (!lines.length) return <div style={{ fontSize: big ? 16 : 13, color: "rgba(242,239,230,0.4)" }}>…</div>;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: big ? 8 : 5 }}>
      {lines.map((c, i) => {
        const p = pub.players.find((x) => x.id === c.id);
        if (!p) return null;
        const accuse = /suspect|sus|saw .* near/i.test(c.text);
        return (
          <div key={c.at + "-" + i} style={{ display: "flex", alignItems: "center", gap: 8, animation: "imp-popIn .25s", flexDirection: c.id === me ? "row-reverse" : "row" }}>
            <LingoBadge look={p.look} size={big ? 34 : 24} seed={p.id} animate={false} />
            <div style={{ maxWidth: "80%", padding: big ? "8px 12px" : "5px 9px", border: "2px solid #0e1113", borderRadius: 8, background: c.id === me ? "#f5c518" : accuse ? "#7d2f16" : "#20262a", color: c.id === me ? "#0e1113" : "#f2efe6", fontSize: big ? 18 : 14, lineHeight: 1.3 }}>
              <b style={{ fontSize: big ? 13 : 11, display: "block", opacity: 0.7 }}>{p.teacher ? "🎓 " : ""}{p.name}</b>
              {c.text}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* the victim sees who got them */
export function KillScreen({ T, victim, killer }: { T: GStrings; victim: Look; killer?: PublicState["players"][number] }) {
  const t = useClock(true, 40);
  const [t0] = useState(t);
  const a = Math.min(1, (t - t0) / 0.45);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 80, background: "radial-gradient(circle,#7d2f16,#2a0f08)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, overflow: "hidden" }}>
      <svg viewBox="-260 -170 520 220" style={{ width: "min(560px,96vw)" }}>
        <g transform={`translate(${60} 30)`}>
          <Lingo look={victim} dead={a >= 1} scared t={t} />
        </g>
        {killer && (
          <g transform={`translate(${-170 + a * 150} 30) scale(1.15)`}>
            <Lingo look={killer.look} dir={1} moving={a < 1} t={t} happy />
          </g>
        )}
        {a >= 1 && (
          <g transform={`translate(60 -60) scale(${Math.min(1.2, (t - t0 - 0.45) * 5)})`}>
            <path d="M 0 -70 L 16 -24 L 66 -30 L 26 4 L 50 50 L 4 24 L -36 60 L -24 12 L -70 -6 L -22 -22 Z" fill="#f5c518" stroke="#0e1113" strokeWidth={6} strokeLinejoin="round" />
            <text y={14} textAnchor="middle" fontSize={34} fontFamily="'Archivo Black',sans-serif" fill="#e23d4f" stroke="#0e1113" strokeWidth={3} paintOrder="stroke">ZAP!</text>
          </g>
        )}
      </svg>
      <div style={{ font: "400 32px 'Archivo Black',sans-serif", textTransform: "uppercase", textShadow: "3px 3px 0 #0e1113", textAlign: "center" }}>{T.killedYou}</div>
      {killer && <div style={{ fontSize: 17 }}>{T.eliminatedBy} <b style={{ color: "#f5c518" }}>{killer.name}</b></div>}
    </div>
  );
}

/* full-screen splash when a meeting starts */
export function MeetingSplash({ T, pub, reason, caller, victim }: { T: GStrings; pub: PublicState; reason: string; caller: string; victim?: string }) {
  const c = pub.players.find((p) => p.id === caller);
  const v = victim ? pub.players.find((p) => p.id === victim) : undefined;
  const body = reason === "report";
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 85, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 18, background: body ? "radial-gradient(circle,#7d2f16,#1b0b06)" : "radial-gradient(circle,#7a5a00,#1b1606)", animation: "imp-popIn .35s" }}>
      <div style={{ position: "absolute", inset: 0, backgroundImage: "repeating-conic-gradient(from 0deg, rgba(255,255,255,0.06) 0 10deg, transparent 10deg 20deg)", animation: "imp-spin 12s linear infinite", pointerEvents: "none" }} />
      <div style={{ display: "flex", alignItems: "flex-end", gap: 18, position: "relative" }}>
        {c && <div style={{ animation: "imp-shake .2s 6" }}><LingoBadge look={c.look} size={110} seed={c.id} scared={body} /></div>}
        <div style={{ fontSize: 80, animation: "imp-shake .18s 8" }}>{body ? "📢" : "🔔"}</div>
        {v && <LingoBadge look={v.look} size={90} dead />}
      </div>
      <div style={{ position: "relative", font: "400 clamp(34px,7vw,72px) 'Archivo Black',sans-serif", textTransform: "uppercase", textAlign: "center", color: body ? "#ff8f6a" : "#f5c518", textShadow: "5px 5px 0 #0e1113", animation: "imp-stampIn .5s cubic-bezier(.2,1.5,.4,1) .15s both" }}>
        {body ? T.deadBody : reason === "teacher" ? T.teacherCalled : T.emergency}
      </div>
      {c && <div style={{ position: "relative", fontSize: 20 }}>{T.by} <b>{c.name}</b></div>}
    </div>
  );
}
