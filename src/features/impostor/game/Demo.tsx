import { useCallback, useEffect, useState } from "react";
import { Host } from "./Host";
import { Player } from "./Player";
import { Bot } from "./bots";
import { COLORS, EXTRAS, FACES, HATS } from "./Character";
import { g } from "./i18n";
import { randInt } from "../shared/random";
import type { Lang } from "../shared/proximity";

const BOT_NAMES = ["Ana", "Luis", "Sofi", "Mateo", "Vale"];

/* Demo mode: the projector, your phone and five bots all run in this one tab —
   no relay server, QR codes or other devices needed. */
export function Demo({ onExit, lang }: { onExit: () => void; lang: Lang }) {
  const [view, setView] = useState<"projector" | "phone">("phone");
  const [phase, setPhase] = useState("lobby");
  const T = g(lang);

  useEffect(() => {
    const used = new Set<number>();
    const bots = BOT_NAMES.map((n, i) => {
      let c = randInt(COLORS.length);
      while (used.has(c)) c = (c + 1) % COLORS.length;
      used.add(c);
      return new Bot("DEMO", "bot-" + i, n + " 🤖", { color: c, hat: HATS[randInt(HATS.length)], face: FACES[randInt(FACES.length)], extra: EXTRAS[randInt(EXTRAS.length)] });
    });
    if (import.meta.env.DEV) (window as any).__bots = bots;
    return () => bots.forEach((b) => b.stop());
  }, []);

  const onPhase = useCallback((p: string) => {
    setPhase((prev) => {
      if (p === "reveal" && prev !== "reveal") setView("phone");
      return p;
    });
  }, []);

  return (
    <>
      <div style={{ display: view === "projector" ? "block" : "none" }}>
        <Host demo onExit={onExit} onPhase={onPhase} />
      </div>
      <div style={{ display: view === "phone" ? "block" : "none" }}>
        <Player code="DEMO" demo onExit={onExit} onJoined={() => setView("projector")} />
      </div>
      <div style={{ position: "fixed", top: 6, left: "50%", transform: "translateX(-50%)", zIndex: 200, display: "flex", gap: 4, padding: 4, border: "3px solid #0e1113", borderRadius: 8, background: "#1b2023ee", boxShadow: "0 4px 0 #0e1113" }}>
        <span style={{ alignSelf: "center", padding: "0 6px", font: "700 10px 'Space Mono',monospace", color: "#c9a2ff", letterSpacing: "0.1em" }}>🤖 DEMO</span>
        {(["projector", "phone"] as const).map((v) => (
          <button key={v} type="button" onClick={() => setView(v)} className={"opt " + (view === v ? "on" : "off")} style={{ padding: "6px 10px", fontSize: 11 }}>
            {v === "projector" ? "📽 " + T.projector : "📱 " + T.phone}
          </button>
        ))}
        {phase !== "lobby" && <span style={{ alignSelf: "center", padding: "0 6px", font: "700 10px 'Space Mono',monospace", color: "rgba(242,239,230,0.6)" }}>{T[phase as "play"] || phase}</span>}
      </div>
    </>
  );
}
