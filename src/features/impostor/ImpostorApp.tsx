import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { isDemoCode, relayConfigured } from "@/lib/relay";
import { useGameFonts } from "@/features/cards/fonts";
import { Home } from "./Home";
import { ClassicGame } from "./classic/ClassicGame";
import { Host } from "./game/Host";
import { Player } from "./game/Player";
import { Demo } from "./game/Demo";
import { Fit } from "./shared/Fit";
import { Header } from "./shared/Header";
import { LingoBadge } from "./game/Character";
import { load, save } from "./shared/storage";
import type { Lang } from "./shared/proximity";
import "./impostor.css";

/* Impostor (owner's game, ported from cronospi99/NewEnglishImpostor).
   /impostor            home (modes, room code)
   /impostor/classic    classic projector mode       (teachers)
   /impostor/host       videogame mode, projector    (teachers; needs the relay)
   /impostor/join       enter a room code
   /impostor/join/CODE  phone: design your character and play
   /impostor/demo       videogame mode alone against bots (everyone, no network) */
export default function ImpostorApp() {
  useGameFonts();
  useEffect(() => {
    // No app shell here: tell the boot intro (index.html) that the page is up.
    requestAnimationFrame(() => window.dispatchEvent(new Event("app:ready")));
  }, []);
  const nav = useNavigate();
  const [lang, setLangState] = useState<Lang>(() => (load<string>("impostor.lang.v2", "es") === "en" ? "en" : "es"));
  const setLang = (l: Lang) => { save("impostor.lang.v2", l); setLangState(l); };
  const isTeacher = useAuth((s) => s.profile?.role === "teacher");
  /* paths inside the game are written as in the original ("/host", "/join/AB12");
     "/games…" and "/profile" leave the game for the rest of ECYR */
  const go = (p: string) => nav(/^\/(games|profile)(\/|$)/.test(p) ? p : "/impostor" + (p === "/" ? "" : p));
  const home = () => go("/");

  return (
    <div className="imp">
      <Routes>
        <Route index element={<Home lang={lang} setLang={setLang} go={go} isTeacher={isTeacher} />} />
        <Route path="classic" element={<TeacherOnly lang={lang} go={go}><ClassicGame lang={lang} setLang={setLang} onExit={home} /></TeacherOnly>} />
        <Route path="host" element={<TeacherOnly lang={lang} go={go}>{relayConfigured() ? <Host onExit={home} /> : <RelayMissing teacher go={go} />}</TeacherOnly>} />
        <Route path="join" element={<JoinCode lang={lang} go={go} />} />
        <Route path="join/:code" element={<JoinRoute go={go} />} />
        <Route path="demo" element={<Demo lang={lang} onExit={home} />} />
        <Route path="*" element={<Navigate to="/impostor" replace />} />
      </Routes>
    </div>
  );
}

function JoinRoute({ go }: { go: (p: string) => void }) {
  const { code = "" } = useParams();
  const c = code.toUpperCase();
  if (!/^[A-Z0-9]{3,8}$/.test(c)) return <Navigate to="/impostor/join" replace />;
  if (!isDemoCode(c) && !relayConfigured()) return <RelayMissing go={go} />;
  return <Player key={c} code={c} onExit={() => go("/")} />;
}

/* ---------------------------------------------------------------- screens */

const K = "#0e1113";

function Shell({ phase, children, go }: { phase: string; children: ReactNode; go: (p: string) => void }) {
  return (
    <div className="page">
      <Header title="ECYR English" phase={phase} actions={[{ label: "Impostor", onClick: () => go("/") }]} />
      <Fit>{children}</Fit>
    </div>
  );
}

function JoinCode({ lang, go }: { lang: Lang; go: (p: string) => void }) {
  const [code, setCode] = useState("");
  const es = lang === "es";
  return (
    <Shell phase={es ? "Entrar" : "Join"} go={go}>
      <form onSubmit={(e) => { e.preventDefault(); if (code.length >= 4) go("/join/" + code); }}
        style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20, padding: "44px 16px 30px", maxWidth: 560, margin: "0 auto" }}>
        <div style={{ display: "flex", gap: 6 }}>
          <LingoBadge look={{ color: 3, hat: "headphones", face: "none", extra: "hello" }} size={84} seed="j1" happy />
          <LingoBadge look={{ color: 7, hat: "gradcap", face: "glasses", extra: "book" }} size={84} seed="j2" />
          <LingoBadge look={{ color: 5, hat: "crown", face: "shades", extra: "bowtie" }} size={84} seed="j3" scared />
        </div>
        <h1 className="h1" style={{ margin: 0 }}>{es ? "Código de la sala" : "Room code"}</h1>
        <p className="lead" style={{ margin: 0, textAlign: "center" }}>{es ? "Escribe el código que ves en el proyector." : "Type the code you see on the projector."}</p>
        <input value={code} maxLength={6} autoFocus placeholder={es ? "CÓDIGO" : "CODE"} inputMode="text" autoCapitalize="characters" aria-label={es ? "Código" : "Code"}
          onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ""))}
          className="field" style={{ width: "min(320px,100%)", padding: "14px 12px", font: "400 40px 'Archivo Black',sans-serif", letterSpacing: "0.24em", textAlign: "center" }} />
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="submit" className="btn btn-y btn-big" disabled={code.length < 4}>▶ {es ? "Entrar" : "Join"}</button>
          <button type="button" className="btn btn-s" onClick={() => go("/demo")}>🤖 Demo</button>
        </div>
      </form>
    </Shell>
  );
}

/* Hosting (videogame or classic) needs a teacher account; students only join. */
function TeacherOnly({ children, lang, go }: { children: ReactNode; lang: Lang; go: (p: string) => void }) {
  const ready = useAuth((s) => s.ready);
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setWaited(true), 5000);
    return () => clearTimeout(t);
  }, []);
  const es = lang === "es";
  if (!ready || (session && !profile && !waited)) {
    return <div className="page" style={{ alignItems: "center", justifyContent: "center" }}><div className="lbl" style={{ animation: "imp-blink 1.2s infinite" }}>…</div></div>;
  }
  if (profile?.role === "teacher") return <>{children}</>;
  return (
    <Shell phase={es ? "Solo docentes" : "Teachers only"} go={go}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 18, padding: "44px 16px 30px", maxWidth: 620, margin: "0 auto" }}>
        <div style={{ fontSize: 64, lineHeight: 1 }}>🔒</div>
        <h1 className="h1" style={{ margin: 0 }}>{es ? "Solo docentes" : "Teachers only"}</h1>
        <p className="lead" style={{ margin: 0, textAlign: "center" }}>
          {es
            ? session ? "Crear una partida necesita una cuenta de docente ECYR. Si eres estudiante, entra con el código que ves en el proyector." : "Entra con tu cuenta de docente ECYR para crear una partida. Si eres estudiante, entra con el código que ves en el proyector."
            : session ? "Hosting a match needs an ECYR teacher account. Students join with the code on the projector." : "Sign in with your ECYR teacher account to host a match. Students join with the code on the projector."}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <button type="button" className="btn btn-y btn-big" onClick={() => go("/join")}>▶ {es ? "Tengo un código" : "I have a code"}</button>
          <button type="button" className="btn btn-s" onClick={() => go("/demo")}>🤖 Demo</button>
          {!session && <button type="button" className="btn btn-d" onClick={() => go("/profile")}>{es ? "Entrar" : "Sign in"}</button>}
        </div>
      </div>
    </Shell>
  );
}

/* Production without VITE_RELAY_URL: explain it to the teacher (Spanish), keep Demo working. */
function RelayMissing({ teacher = false, go }: { teacher?: boolean; go: (p: string) => void }) {
  return (
    <Shell phase="Sin servidor" go={go}>
      <div style={{ display: "flex", flexDirection: "column", gap: 18, padding: "36px 16px 30px", maxWidth: 760, margin: "0 auto" }}>
        <div className="kicker" style={{ alignSelf: "flex-start" }}>📡 {teacher ? "Falta un paso" : "No disponible"}</div>
        <h1 className="h1" style={{ margin: 0, fontSize: "clamp(32px,5vw,54px)" }}>{teacher ? "El juego en vivo aún no tiene servidor" : "El juego en vivo no está activo"}</h1>
        {teacher ? (
          <>
            <p className="lead" style={{ margin: 0, maxWidth: "60ch" }}>
              Los móviles y el proyector se conectan a través de un pequeño «relay» gratuito en Cloudflare (no usa Supabase y no se cobra).
              Este despliegue todavía no sabe dónde está.
            </p>
            <div className="plate" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div className="lbl lbl-y">Cómo activarlo (una sola vez)</div>
              <ol style={{ margin: 0, paddingLeft: 22, lineHeight: 1.7, fontSize: 16 }}>
                <li>Publica el relay: <code style={codeCss}>cd relay &amp;&amp; npx wrangler deploy</code></li>
                <li>En Vercel → <b>Settings → Environment Variables</b> añade<br /><code style={codeCss}>VITE_RELAY_URL = wss://impostor-relay.&lt;tu-subdominio&gt;.workers.dev</code></li>
                <li>Vuelve a desplegar la app.</li>
              </ol>
            </div>
            <p style={{ margin: 0, fontSize: 15, color: "rgba(242,239,230,0.7)" }}>Mientras tanto puedes jugar el modo <b>Demo</b> (contra bots) o el modo <b>Clásico</b> (un proyector, sin móviles).</p>
          </>
        ) : (
          <p className="lead" style={{ margin: 0 }}>Pide a tu profe que active el servidor del juego. Mientras tanto, prueba la demo contra bots.</p>
        )}
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-y btn-big" onClick={() => go("/demo")}>🤖 Demo</button>
          {teacher && <button type="button" className="btn btn-s" onClick={() => go("/classic")}>📽 Clásico</button>}
          <button type="button" className="btn btn-d" onClick={() => go("/")}>← Impostor</button>
        </div>
      </div>
    </Shell>
  );
}

const codeCss = { font: "700 14px 'Space Mono',monospace", background: "#1b2023", border: `2px solid ${K}`, borderRadius: 4, padding: "2px 6px", color: "#f5c518", wordBreak: "break-all" } as const;
