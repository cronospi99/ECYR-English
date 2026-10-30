import { useState } from "react";
import { Lingo, LingoBadge, useClock } from "./game/Character";
import type { Look } from "./game/types";
import { sfx, unlockAudio } from "./game/sfx";
import type { Lang } from "./shared/proximity";
import { Fit } from "./shared/Fit";

const S = {
  en: {
    kicker: "ECYR English",
    slogan: "Speak English. Trust no one.",
    sub: "A social deduction game for the classroom",
    setup: "Set up the game",
    haveCode: "Got a room code?",
    code: "CODE", go: "Join",
    choose: "Choose a mode",
    classic: "Classic", classicP: "One projector, students speak out loud. The teacher deals secret words, logs the clues and runs the vote.",
    classicTag: "No phones needed",
    video: "Videogame", videoP: "Everyone joins from their phone, walks around the academy and completes English missions. Good students vs. students addicted to their phones: sabotage, eliminate, discuss and vote them out.",
    videoTag: "Phones · QR code",
    demo: "Demo", demoP: "Try videogame mode on your own right now: you play against five bots on this device. Nothing to install, no phones needed.", demoTag: "Solo · bots",
    back: "← Back", teachers: "Teachers only"
  },
  es: {
    kicker: "ECYR English",
    slogan: "Habla inglés. No confíes en nadie.",
    sub: "Un juego de deducción social para la clase",
    setup: "Preparar la partida",
    haveCode: "¿Tienes un código?",
    code: "CÓDIGO", go: "Entrar",
    choose: "Elige un modo",
    classic: "Clásico", classicP: "Un proyector y los estudiantes hablan en voz alta. El profesor reparte las palabras, anota las pistas y dirige la votación.",
    classicTag: "Sin móviles",
    video: "Videojuego", videoP: "Todos entran desde el móvil, recorren la academia y hacen misiones de inglés. Buenos estudiantes contra adictos al celular: sabotean, eliminan, discuten y votan para expulsarlos.",
    videoTag: "Móviles · código QR",
    demo: "Demo", demoP: "Prueba el modo videojuego tú solo ahora mismo: juegas contra cinco bots en este dispositivo. Sin instalar nada y sin móviles.", demoTag: "Solo · bots",
    back: "← Atrás", teachers: "Solo docentes"
  }
};

const CROWD: Look[] = [
  { color: 0, hat: "hardhat", face: "none", extra: "lanyard" },
  { color: 7, hat: "gradcap", face: "glasses", extra: "book" },
  { color: 3, hat: "headphones", face: "none", extra: "hello" },
  { color: 9, hat: "beret", face: "freckles", extra: "scarf" },
  { color: 5, hat: "crown", face: "shades", extra: "bowtie" },
  { color: 2, hat: "cap", face: "none", extra: "pinEN" },
  { color: 12, hat: "chef", face: "mustache", extra: "tie" },
  { color: 8, hat: "beanie", face: "stars", extra: "none" }
];

/* characters strolling across the bottom of the hero; one of them is sus */
function Parade() {
  const t = useClock(true, 30);
  /* match the strip's aspect ratio so nobody's hat gets cropped */
  const stripH = Math.min(window.innerHeight * 0.22, 200);
  const W = Math.round(170 * (window.innerWidth / Math.max(60, stripH)));
  return (
    <svg viewBox={`0 -150 ${W} 170`} preserveAspectRatio="xMidYMax meet" style={{ flex: "none", display: "block", width: "100%", height: stripH, pointerEvents: "none" }}>
      <rect x={0} y={0} width={W} height={20} fill="url(#homeFloor)" />
      <defs>
        <pattern id="homeFloor" width="56" height="20" patternUnits="userSpaceOnUse">
          <rect width="56" height="20" fill="#2b3236" /><path d="M0 0H56" stroke="#0e1113" strokeWidth="6" />
        </pattern>
      </defs>
      {CROWD.map((look, i) => {
        const speed = 70 + (i % 3) * 18;
        const x = ((t * speed + i * (W / CROWD.length)) % (W + 200)) - 100;
        const sus = i === 4;
        const stop = sus && Math.sin(t * 0.8) > 0.55;
        return (
          <g key={i} transform={`translate(${x},${4}) scale(1.05)`}>
            <Lingo look={look} moving={!stop} dir={stop ? -1 : 1} t={t} seed={"home" + i} />
            {stop && (
              <g transform="translate(54 -104)">
                <rect x={-22} y={-26} width={44} height={36} rx={10} fill="#f2efe6" stroke="#0e1113" strokeWidth={4} />
                <path d="M -6 9 L -12 20 L 4 9" fill="#f2efe6" stroke="#0e1113" strokeWidth={4} strokeLinejoin="round" />
                <text y={2} textAnchor="middle" fontSize={26} fontWeight={900} fontFamily="Arial, sans-serif" fill="#e23d4f">?!</text>
              </g>
            )}
          </g>
        );
      })}
    </svg>
  );
}

export function Home({ lang, setLang, go, isTeacher }: { lang: Lang; setLang: (l: Lang) => void; go: (p: string) => void; isTeacher: boolean }) {
  const T = S[lang];
  const [step, setStep] = useState<"hero" | "modes">("hero");
  const [code, setCode] = useState("");

  return (
    <div className="page" style={{ position: "relative" }}>
      <div className="hazard" style={{ borderTop: 0, borderBottom: "3px solid #0e1113" }} />
      <div style={{ position: "absolute", top: 22, left: 18, display: "flex", gap: 8, zIndex: 3 }}>
        <button type="button" className="btn btn-s btn-hdr" onClick={() => go("/games")}>← {lang === "es" ? "Juegos" : "Games"}</button>
      </div>
      <div style={{ position: "absolute", top: 22, right: 18, display: "flex", gap: 8, zIndex: 3 }}>
        <button type="button" className="btn btn-y btn-hdr" onClick={() => go("/games/cards")}>🃏 {lang === "es" ? "Cartas" : "Cards"}</button>
        <button type="button" className="btn btn-s btn-hdr" onClick={() => setLang(lang === "es" ? "en" : "es")}>{lang === "es" ? "English" : "Español"}</button>
      </div>
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(900px 520px at 50% 38%, rgba(245,197,24,0.12), transparent 70%)", pointerEvents: "none" }} />

      {step === "hero" ? (
        <Fit key="hero"><div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "56px 16px 16px", gap: "min(18px,2.2vh)" }}>
          <div className="kicker">{T.kicker}</div>
          <h1 style={{ margin: 0, font: "400 clamp(54px,min(15vw,21vh),210px) 'Archivo Black',sans-serif", lineHeight: 0.86, letterSpacing: "-0.02em", textTransform: "uppercase", color: "#f5c518", textShadow: "6px 6px 0 #0e1113, 12px 12px 0 rgba(14,17,19,0.35)", WebkitTextStroke: "3px #0e1113", animation: "imp-stampIn .6s cubic-bezier(.2,1.5,.4,1) both" }}>
            Impostor
          </h1>
          <div style={{ font: "400 clamp(20px,min(3.2vw,4.6vh),40px) 'Archivo Black',sans-serif", textTransform: "uppercase", textShadow: "3px 3px 0 #0e1113" }}>{T.slogan}</div>
          <div style={{ font: "700 clamp(12px,1.3vw,15px) 'Space Mono',monospace", letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(242,239,230,0.6)" }}>{T.sub}</div>
          <button type="button" className="btn btn-y" onClick={() => { unlockAudio(); sfx.pop(); setStep("modes"); }}
            style={{ marginTop: 10, padding: "min(22px,2.6vh) 44px", font: "400 clamp(20px,min(2.4vw,3.4vh),28px) 'Archivo Black',sans-serif", boxShadow: "0 8px 0 #0e1113", animation: "imp-floaty 3s ease-in-out infinite" }}>
            ▶ {T.setup}
          </button>
          <form onSubmit={(e) => { e.preventDefault(); if (code.length >= 4) go("/join/" + code); }} style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6, flexWrap: "wrap", justifyContent: "center" }}>
            <span className="lbl">{T.haveCode}</span>
            <input value={code} maxLength={6} placeholder={T.code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
              className="field" style={{ width: 150, padding: "8px 10px", font: "400 18px 'Archivo Black',sans-serif", letterSpacing: "0.2em", textAlign: "center" }} />
            <button type="submit" className="btn btn-s btn-sm" disabled={code.length < 4}>{T.go}</button>
          </form>
        </div></Fit>
      ) : (
        <Fit key="modes"><div style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", padding: "64px 16px 16px", gap: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14, width: "min(1300px,100%)" }}>
            <button type="button" className="btn btn-s btn-sm" onClick={() => setStep("hero")}>{T.back}</button>
            <h2 className="h2" style={{ margin: 0 }}>{T.choose}</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(min(300px,100%),1fr))", gap: 22, width: "min(1300px,100%)" }}>
            <ModeCard title={T.classic} text={T.classicP} tag={isTeacher ? T.classicTag : "🔒 " + T.teachers} color="#f5c518" looks={[CROWD[0], CROWD[1], CROWD[3]]} onClick={() => go("/classic")} icon="📽" />
            <ModeCard title={T.video} text={T.videoP} tag={isTeacher ? T.videoTag : "🔒 " + T.teachers} color="#f07a1a" looks={[CROWD[2], CROWD[4], CROWD[5]]} onClick={() => go("/host")} icon="🎮" />
            <ModeCard title={T.demo} text={T.demoP} tag={T.demoTag} color="#c9a2ff" looks={[CROWD[6], CROWD[7], CROWD[3]]} onClick={() => go("/demo")} icon="🤖" />
          </div>
        </div></Fit>
      )}
      <Parade />
    </div>
  );
}

function ModeCard({ title, text, tag, color, looks, onClick, icon }: { title: string; text: string; tag: string; color: string; looks: Look[]; onClick: () => void; icon: string }) {
  return (
    <button type="button" onClick={onClick} className="plate"
      style={{ textAlign: "left", whiteSpace: "normal", minWidth: 0, color: "#f2efe6", cursor: "pointer", display: "flex", flexDirection: "column", gap: 12, padding: "22px 22px 24px", animation: "imp-popIn .35s", transition: "transform .12s" }}
      onMouseEnter={(e) => (e.currentTarget.style.transform = "translateY(-4px)")} onMouseLeave={(e) => (e.currentTarget.style.transform = "none")}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="tag" style={{ color }}>{tag}</span>
        <span style={{ fontSize: 34 }}>{icon}</span>
      </div>
      <div style={{ display: "flex", gap: 4 }}>{looks.map((l, i) => <LingoBadge key={i} look={l} size={58} seed={title + i} />)}</div>
      <div style={{ font: "400 clamp(30px,3.4vw,46px) 'Archivo Black',sans-serif", textTransform: "uppercase", color, textShadow: "3px 3px 0 #0e1113" }}>{title}</div>
      <div style={{ fontSize: 17, lineHeight: 1.55, color: "rgba(242,239,230,0.8)" }}>{text}</div>
      <span className="btn btn-y" style={{ alignSelf: "flex-start", background: color }}>▶</span>
    </button>
  );
}
