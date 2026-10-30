import { memo, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Relay, makeId, type NetStatus } from "@/lib/relay";
import type { EmoteMsg, FromHost, Look, PosMsg, PublicState, Secret, ToHost, VentFx } from "./types";
import { g, type GStrings } from "./i18n";
import { COLORS, EXTRAS, FACES, HATS, LABELS, Lingo, LingoBadge, randomLook } from "./Character";
import { MapDefs, MapDynamic, MapStatic, VentArt, Watchman } from "./MapView";
import {
  ALARM_PANELS, BATH_DOOR, BELL, BOOK_SPOTS, FUSE, GUARD, RANGE, SCANNER, SPEED, VISION, WORLD, dist, ghostMove, lineOfSight, moveWithin, roomAt, rooms,
  setBlocked, sightPoints, spawnPoint, stations, vents, type Station
} from "./map";
import { MissionPanel } from "./MissionPanel";
import { Center, Countdown, EjectScene, EndScreen, MeetingBoard, TaskBar } from "./Host";
import { ChatFeed, KillScreen, MeetingSplash, SoundToggle } from "./ui";
import { sfx, startSiren, stopSiren, unlockAudio } from "./sfx";
import { load, save } from "../shared/storage";
import { Fit } from "../shared/Fit";
import { useAuth } from "@/store/auth";
import { addLocalCardPoints, lastCard, rankOf, RANKS, setLastCard, useMyCardPoints } from "@/features/cards/api";
import { TEACHERS } from "@/features/cards/teachers";
import { TeacherCardView } from "@/features/cards/CardView";
import { CardPicker } from "@/features/cards/CardPicker";
import { CardGain, CardReveal } from "@/features/cards/CardReveal";
import { RANK_LOOK } from "@/features/cards/ranks";
import type { Lang } from "../shared/proximity";

type Other = { x: number; y: number; dir: number; m: boolean; dx: number; dy: number; at: number; v?: string };
type Fx = { x: number; y: number; at: number };
export const EMOTES = ["👋", "😱", "🤔", "👍", "😂", "❗"];

export function Player({ code, onExit, demo = false, onJoined }: { code: string; onExit: () => void; demo?: boolean; onJoined?: () => void }) {
  const teacher = useMemo(() => new URLSearchParams(location.search).get("teacher") === "1", []);
  const id = useMemo(() => {
    const k = "impostor.pid." + code + (teacher ? ".t" : "");
    let v = load<string>(k, "");
    if (!v) { v = (teacher ? "t-" : "p-") + makeId(); save(k, v); }
    return v;
  }, [code, teacher]);
  /* signed-in ECYR players: default name from the profile, points saved to their account */
  const auth = useAuth((st) => st.profile);
  const uid = useAuth((st) => st.session?.user.id) || undefined;
  const accountName = (auth?.full_name || "").trim().split(/\s+/).slice(0, 2).join(" ").slice(0, 14);
  const profileKey = (teacher ? "impostor.profile.teacher" : "impostor.profile") + (uid ? "." + uid : "");
  const saved = load<{ name: string; look: Look } | null>(profileKey, null);
  const [name, setName] = useState(saved?.name || accountName || (teacher ? "Teacher" : ""));
  useEffect(() => { if (accountName) setName((n) => n || accountName); }, [accountName]);
  const [card, setCardState] = useState(lastCard);
  const [picker, setPicker] = useState(false);
  const mine$ = useMyCardPoints();
  const cardPoints = useRef(mine$.points);
  cardPoints.current = mine$.points;
  const [saveNote, setSaveNote] = useState("");
  const [look, setLook] = useState<Look>(saved?.look || (teacher ? { color: 0, hat: "gradcap", face: "glasses", extra: "lanyard" } : randomLook()));
  const [joined, setJoined] = useState(false);
  const [editing, setEditing] = useState(false);
  const [net, setNet] = useState<NetStatus>("connecting");
  const [pub, setPub] = useState<(PublicState & { at: number }) | null>(null);
  const [secret, setSecret] = useState<(Secret & { at: number }) | null>(null);
  const [toast, setToast] = useState("");
  const [killedBy, setKilledBy] = useState<string | null>(null);
  const [splash, setSplash] = useState<{ reason: string; caller: string; victim?: string } | null>(null);
  const [reward, setReward] = useState<{ points: number; items: Record<string, number>; card: string; before: number } | null>(null);
  const [reveal, setReveal] = useState<{ card: string; points: number; before: number } | null>(null);
  const relay = useRef<Relay | null>(null);
  const others = useRef<Record<string, Other>>({});
  const emotes = useRef<Record<string, { e: string; at: number }>>({});
  const ventFx = useRef<Fx[]>([]);
  const shake = useRef(0);
  const mine = useRef({ x: spawnPoint(0, 1).x, y: spawnPoint(0, 1).y, dir: 1, m: false, v: undefined as string | undefined });
  if (import.meta.env.DEV) (window as any).__impostor = { mine, others, send: (m: ToHost) => relay.current?.send(m, "host") };
  const profile = useRef({ name, look, teacher, card, uid: demo ? undefined : uid });
  profile.current = { name, look, teacher, card, uid: demo ? undefined : uid };
  const lang: Lang = pub?.settings.lang || (load<string>("impostor.lang.v2", "es") === "en" ? "en" : "es");
  const T = g(lang);
  const pubRef = useRef(pub);
  pubRef.current = pub;

  const send = useCallback((m: ToHost) => relay.current?.send(m, "host"), []);
  const setCard = (c: string) => {
    setCardState(c);
    setLastCard(c);
    if (joined && (!pubRef.current || pubRef.current.phase === "lobby")) send({ k: "look", name, look, card: c });
  };

  useEffect(() => {
    if (!joined) return;
    const r = new Relay(code, id, "player");
    relay.current = r;
    const offS = r.onStatus((st) => {
      setNet(st);
      if (st === "open") r.send({ k: "hello", ...profile.current } satisfies ToHost, "host");
    });
    const off = r.on((env) => {
      if (env.f === "_sys") {
        if (env.d?.type === "peer-join" && env.d.role === "host") r.send({ k: "hello", ...profile.current } satisfies ToHost, "host");
        if (env.d?.type === "peer-leave") delete others.current[env.d.id];
        return;
      }
      const m = env.d as FromHost | PosMsg | EmoteMsg | VentFx;
      if (!m) return;
      if (m.k === "pos") {
        const o = others.current[env.f];
        const jump = !o || Math.hypot(o.x - m.x, o.y - m.y) > 300;
        others.current[env.f] = { x: m.x, y: m.y, dir: m.dir, m: m.m, v: m.v, dx: jump ? m.x : o.dx, dy: jump ? m.y : o.dy, at: performance.now() };
        return;
      }
      if (m.k === "emote") { emotes.current[env.f] = { e: String(m.e).slice(0, 4), at: performance.now() }; return; }
      if (m.k === "ventfx") { ventFx.current.push({ x: m.x, y: m.y, at: performance.now() }); return; }
      const now = Date.now();
      if (m.k === "state") setPub({ ...m.s, at: now });
      if (m.k === "secret") setSecret({ ...m.s, at: now });
      if (m.k === "teleport") {
        const wasPlay = pubRef.current?.phase === "play";
        mine.current.x = m.x; mine.current.y = m.y; mine.current.v = undefined;
        if (wasPlay) { shake.current = performance.now(); sfx.kill(); }
      }
      if (m.k === "killed") {
        if (pubRef.current?.phase === "play") { setKilledBy(m.by || ""); sfx.killed(); setTimeout(() => setKilledBy(null), 3200); }
      }
      if (m.k === "toast") { setToast(m.text); setTimeout(() => setToast(""), 3500); }
      if (m.k === "reward") {
        /* points go to the card this player trains; demo games are never saved. Guests keep
           them on this device; signed-in players get them in their ECYR account (the host
           saves them) and we mirror them locally right away so the rank shows at once. */
        const c = profile.current.card;
        const before = cardPoints.current[c] ?? 0;
        const fresh = demo || m.points <= 0 || addLocalCardPoints(c, m.points, m.id, profile.current.uid || "guest");
        if (fresh) {
          setReward({ points: m.points, items: m.items, card: c, before });
          setSaveNote(demo ? "demo" : profile.current.uid ? (m.points > 0 ? "saving" : "") : "local");
          const after = before + m.points;
          if (!demo && RANKS.indexOf(rankOf(after)) > RANKS.indexOf(rankOf(before))) setTimeout(() => setReveal({ card: c, points: after, before }), 3200);
        }
      }
      if (m.k === "cards") setSaveNote(m.saved ? "saved" : m.note === "migration" ? "local" : "failed");
    });
    return () => { off(); offS(); r.close(); };
  }, [joined, code, id]);

  /* phase transitions → splash screens and sounds */
  const phaseKey = pub ? pub.phase + (pub.meeting ? ":" + pub.meeting.reason + pub.meeting.caller : "") : "";
  useEffect(() => {
    if (!pub) return;
    if (pub.phase === "meeting" && pub.meeting && pub.meeting.stage === "talk") {
      setSplash({ reason: pub.meeting.reason, caller: pub.meeting.caller, victim: pub.meeting.victim });
      if (pub.meeting.reason === "report") sfx.report(); else sfx.meeting();
      const t = setTimeout(() => setSplash(null), 2600);
      return () => clearTimeout(t);
    }
    if (pub.phase === "eject") sfx.eject();
    if (pub.phase === "end") {
      const myRole = pub.players.find((p) => p.id === id)?.role;
      if (pub.winner && myRole === pub.winner) sfx.win(); else sfx.lose();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phaseKey]);

  useEffect(() => {
    if (pub?.phase === "reveal" && secret) sfx.reveal(secret.role === "impostor");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pub?.phase === "reveal" && !!secret]);

  /* sabotage alarm sound */
  const alarmOn = pub?.phase === "play" && pub.sabotage?.kind === "alarm";
  const lightsOn = pub?.phase === "play" && pub.sabotage?.kind === "lights";
  useEffect(() => {
    if (alarmOn) { sfx.sabotage(); startSiren(); return () => stopSiren(); }
  }, [alarmOn]);
  const prevSab = useRef(false);
  useEffect(() => {
    const active = !!(alarmOn || lightsOn);
    if (lightsOn) sfx.sabotage();
    if (prevSab.current && !active && pub?.phase === "play") sfx.fixed();
    prevSab.current = active;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [alarmOn, lightsOn]);

  const saveProfile = () => {
    unlockAudio();
    save(profileKey, { name, look });
    if (joined) send({ k: "look", name, look, card });
    else onJoined?.();
    setJoined(true);
    setEditing(false);
  };

  if (!joined || editing) {
    return (
      <>
        <Customize T={T} lang={lang} code={code} name={name} setName={setName} look={look} setLook={setLook} onSave={saveProfile} joined={joined} onExit={onExit} teacher={teacher}
          card={card} cardPoints={mine$.points[card] ?? 0} onCard={() => setPicker(true)} />
        {picker && <CardPicker value={card} points={mine$.points} onPick={(c) => { setCard(c); setPicker(false); }} onClose={() => setPicker(false)} title={T.trainCard} subtitle={T.trainHelp} />}
      </>
    );
  }

  const meP = pub?.players.find((p) => p.id === id);
  const toastText = toast ? (T as unknown as Record<string, string>)[toast] || toast : "";
  const killer = killedBy ? pub?.players.find((p) => p.id === killedBy) : undefined;

  return (
    <div className="page">
      {net !== "open" && <Banner text={net === "closed" ? T.replaced : T.offline} />}
      {toastText && <Banner text={toastText} color="#f07a1a" />}
      {killedBy !== null && <KillScreen T={T} victim={look} killer={killer} />}
      {splash && pub && <MeetingSplash T={T} pub={pub} {...splash} />}
      {reveal && <CardReveal cardId={reveal.card} points={reveal.points} before={reveal.before} onDone={() => setReveal(null)} />}
      {picker && <CardPicker value={card} points={mine$.points} onPick={(c) => { setCard(c); setPicker(false); }} onClose={() => setPicker(false)} title={T.trainCard} subtitle={T.trainHelp} />}

      {pub && pub.phase === "play" ? (
        <PlayView key={pub.round} T={T} lang={lang} me={id} pub={pub} secret={secret} relay={relay} others={others} mine={mine} send={send}
          alive={!!meP?.alive} emotes={emotes} ventFx={ventFx} shake={shake} />
      ) : (
      <Fit>
      {!pub || pub.phase === "lobby" ? (
        <Center>
          <div className="kicker">{T.academy}</div>
          <LingoBadge look={look} size={140} seed={id} happy />
          <div style={{ font: "400 30px 'Archivo Black',sans-serif", textTransform: "uppercase", textShadow: "3px 3px 0 #0e1113" }}>{teacher ? "🎓 " : ""}{name}</div>
          <p className="lead" style={{ textAlign: "center" }}>{pub ? T.ready : T.connecting}</p>
          {pub && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 4, justifyContent: "center", maxWidth: 360 }}>
              {pub.players.filter((p) => p.id !== id).map((p) => <LingoBadge key={p.id} look={p.look} size={34} seed={p.id} />)}
            </div>
          )}
          <div style={{ display: "flex", gap: 8 }}>
            <button type="button" className="btn btn-s" onClick={() => setEditing(true)}>{T.customize}</button>
            <CardButton T={T} card={card} points={mine$.points[card] ?? 0} onClick={() => setPicker(true)} disabled={!!pub && pub.phase !== "lobby"} />
            <SoundToggle T={T} />
          </div>
        </Center>
      ) : pub.phase === "reveal" ? (
        <RoleCard T={T} secret={secret} pub={pub} me={id} />
      ) : pub.phase === "meeting" ? (
        <MeetingPhone T={T} lang={lang} me={id} pub={pub} secret={secret} send={send} />
      ) : pub.phase === "eject" ? (
        <Center><div style={{ width: "100%" }}><EjectScene pub={pub} lang={lang} /></div></Center>
      ) : (
        <>
          {reward && (
            <div style={{ padding: "16px 16px 0", display: "flex", justifyContent: "center" }}>
              <div className="plate" style={{ width: "min(1000px,100%)", display: "flex", flexWrap: "wrap", alignItems: "center", gap: 14, animation: "imp-popIn .4s" }}>
                <div style={{ font: "400 44px 'Archivo Black',sans-serif", color: "#f5c518", textShadow: "3px 3px 0 #0e1113" }}>+{reward.points}</div>
                <div style={{ flex: 1, minWidth: 180 }}>
                  <div className="lbl lbl-y" style={{ marginBottom: 4 }}>{T.pointsGame}</div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                    {Object.entries(reward.items).map(([k, v]) => <span key={k} className="tag" style={{ color: "#f2efe6" }}>{T.reasons[k] || k} +{v}</span>)}
                  </div>
                </div>
              </div>
            </div>
          )}
          {reward && reward.points > 0 && (
            <div style={{ padding: "12px 16px 0", display: "flex", justifyContent: "center" }}>
              <div style={{ width: "min(1000px,100%)", animation: "imp-popIn .4s .2s both" }}>
                <CardGain cardId={reward.card} before={reward.before} gained={reward.points}
                  note={saveNote === "demo" ? T.cardsDemo : saveNote === "saved" ? T.cardsSaved : saveNote === "saving" ? T.cardsSaving : saveNote === "local" ? T.cardsLocal : saveNote === "failed" ? T.cardsFailed : undefined} />
              </div>
            </div>
          )}
          <EndScreen pub={pub} lang={lang} />
        </>
      )}
      </Fit>
      )}
    </div>
  );
}

function Banner({ text, color = "#b4441f" }: { text: string; color?: string }) {
  return <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 90, padding: "8px 12px", background: color, color: "#0e1113", borderBottom: "3px solid #0e1113", font: "700 13px 'Space Mono',monospace", textAlign: "center" }}>{text}</div>;
}

/* lobby chip: the character card this player trains (opens the picker) */
function CardButton({ T, card, points, onClick, disabled, wide }: { T: GStrings; card: string; points: number; onClick: () => void; disabled?: boolean; wide?: boolean }) {
  const c = TEACHERS.find((x) => x.id === card) || TEACHERS[0];
  const L = RANK_LOOK[rankOf(points)];
  return (
    <button type="button" className="btn btn-d" onClick={onClick} disabled={disabled} title={T.trainCard}
      style={{ display: "flex", alignItems: "center", gap: 10, padding: "6px 12px 6px 6px", textTransform: "none", letterSpacing: 0, textAlign: "left", width: wide ? "100%" : undefined }}>
      <TeacherCardView card={c} points={points} width={40} animate={false} showRank={false} />
      <span style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0 }}>
        <span style={{ font: "700 10px 'Space Mono',monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: "rgba(242,239,230,0.6)" }}>🃏 {T.trainCard}</span>
        <span style={{ font: "400 15px 'Archivo Black',sans-serif", color: "#f2efe6" }}>{c.name}</span>
        <span style={{ font: "700 11px 'Space Mono',monospace", color: L.accent }}>{L.label} · ★ {points}</span>
      </span>
    </button>
  );
}

function Customize({ T, lang, code, name, setName, look, setLook, onSave, joined, onExit, teacher, card, cardPoints, onCard }: { T: GStrings; lang: Lang; code: string; name: string; setName: (s: string) => void; look: Look; setLook: (l: Look) => void; onSave: () => void; joined: boolean; onExit: () => void; teacher: boolean; card: string; cardPoints: number; onCard: () => void }) {
  const chip = (key: "hat" | "face" | "extra", list: readonly string[]) => (
    <div className="row" style={{ gap: 6 }}>
      {list.map((v) => (
        <button key={v} type="button" className={"opt " + (look[key] === v ? "on" : "off")} style={{ padding: "7px 10px", fontSize: 12, letterSpacing: 0, textTransform: "none" }} onClick={() => { setLook({ ...look, [key]: v }); sfx.pop(); }}>{LABELS[v]?.[lang] || v}</button>
      ))}
    </div>
  );
  return (
    <div className="page">
      <div className="hdr">
        <div className="hdr-row">
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}><div className="hdr-logo">?</div><div className="hdr-title">ECYR English</div></div>
          <span className="tag" style={{ color: "#f5c518" }}>{teacher ? "🎓 " + T.teacherBadge + " · " : ""}{T.code} {code}</span>
        </div>
        <div className="hazard" />
      </div>
      <Fit>
      <div className="cust" style={{ padding: "18px 16px 20px", maxWidth: 560, width: "100%", margin: "0 auto" }}>
        <div className="lbl lbl-y c-lbl">{T.customize}</div>
        <div className="c-prev" style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="well" style={{ padding: 10, background: "radial-gradient(circle at 50% 70%,#3b4349,#1b2023)" }}><LingoBadge look={look} size={110} happy /></div>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 10 }}>
            <input className="field" value={name} maxLength={14} placeholder={T.yourName} onChange={(e) => setName(e.target.value)} autoFocus={!name} />
            <button type="button" className="btn btn-o btn-sm" onClick={() => { setLook(randomLook()); sfx.pop(); }}>🎲 {lang === "es" ? "Aleatorio" : "Random"}</button>
            <CardButton T={T} card={card} points={cardPoints} onClick={onCard} wide />
          </div>
        </div>
        <div className="c-color">
          <div className="lbl" style={{ marginBottom: 8 }}>{T.color}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(8,1fr)", gap: 6 }}>
            {COLORS.map((c, i) => (
              <button key={c.name} type="button" title={c.name} onClick={() => { setLook({ ...look, color: i }); sfx.pop(); }}
                style={{ aspectRatio: "1", border: "3px solid #0e1113", borderRadius: 6, background: c.c, cursor: "pointer", boxShadow: look.color === i ? "0 0 0 3px #f5c518" : "0 3px 0 #0e1113" }} />
            ))}
          </div>
        </div>
        <div className="c-hat"><div className="lbl" style={{ marginBottom: 8 }}>{T.hat}</div>{chip("hat", HATS)}</div>
        <div className="c-face"><div className="lbl" style={{ marginBottom: 8 }}>{T.face}</div>{chip("face", FACES)}</div>
        <div className="c-extra"><div className="lbl" style={{ marginBottom: 8 }}>{T.extra}</div>{chip("extra", EXTRAS)}</div>
        <div className="c-btns" style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button type="button" className="btn btn-y btn-big" disabled={!name.trim()} onClick={onSave}>{joined ? T.saveLook : T.join}</button>
          {!joined && <button type="button" className="btn btn-s" onClick={onExit}>{T.home}</button>}
        </div>
      </div>
      </Fit>
    </div>
  );
}

function RoleCard({ T, secret, pub, me }: { T: GStrings; secret: Secret | null; pub: PublicState; me: string }) {
  if (!secret) return <Center><p className="lead">{T.connecting}</p></Center>;
  const imp = secret.role === "impostor";
  const partners = pub.players.filter((p) => secret.partners.indexOf(p.id) !== -1);
  const mine = pub.players.find((p) => p.id === me);
  return (
    <Center>
      <div style={{ display: "flex", gap: 6, alignItems: "flex-end", animation: "imp-popIn .5s" }}>
        {mine && <LingoBadge look={mine.look} size={96} seed={me} scared={imp} happy={!imp} />}
        {partners.map((p) => <LingoBadge key={p.id} look={p.look} size={70} seed={p.id} />)}
      </div>
      <div style={{ width: "min(520px,100%)", border: "4px solid #0e1113", borderRadius: 8, background: imp ? "#7d2f16" : "#2b3236", boxShadow: "0 8px 0 #0e1113", overflow: "hidden", animation: "imp-popIn .4s" }}>
        <div style={{ height: 12, backgroundImage: `repeating-linear-gradient(45deg,${imp ? "#f07a1a" : "#f5c518"} 0 11px,#0e1113 11px 22px)` }} />
        <div style={{ padding: "22px 20px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <div className="lbl" style={{ color: "#f2efe6" }}>{T.youAre}</div>
          <div style={{ fontSize: 64, lineHeight: 1, animation: "imp-bob 1.4s ease-in-out infinite" }}>{imp ? "📱" : "📚"}</div>
          <div style={{ font: "400 clamp(28px,8vw,40px) 'Archivo Black',sans-serif", lineHeight: 1.05, textTransform: "uppercase", color: imp ? "#f07a1a" : "#7bbf5a", textShadow: "3px 3px 0 #0e1113" }}>{imp ? T.impostor : T.crew}</div>
          <div style={{ fontSize: 16, color: "rgba(242,239,230,0.8)" }}>{imp ? T.impGoal : T.crewGoal}</div>
          <div className="well" style={{ padding: "8px 12px", textAlign: "left", width: "100%" }}>
            <div className="lbl" style={{ marginBottom: 4 }}>🎯 {imp ? T.fakeMissions : T.yourMissions}: {secret.tasks.length} {T.ofOnMap.replace("{n}", String(stations.length))}</div>
            <div style={{ fontSize: 13, lineHeight: 1.5 }}>
              {secret.tasks.map((sid) => { const st = stations.find((x) => x.id === sid); const r = st && rooms.find((x) => x.id === st.room); return st && r ? <div key={sid}><span style={{ color: r.accent }}>■</span> {r.en}: {st.label}</div> : null; })}
            </div>
          </div>
          {partners.length > 0 && <div style={{ fontSize: 15 }}>{T.partner}: <b>{partners.map((p) => p.name).join(", ")}</b></div>}
        </div>
      </div>
    </Center>
  );
}

/* ---------------- meeting on the phone: discuss in the chat, then vote ---------------- */

const PHRASES: { en: string; needs?: "p" | "r" }[] = [
  { en: "I suspect {p}.", needs: "p" },
  { en: "{p} is acting sus!", needs: "p" },
  { en: "I saw {p} near the body.", needs: "p" },
  { en: "{p} was with me.", needs: "p" },
  { en: "{p} is safe.", needs: "p" },
  { en: "{p} was on their phone!", needs: "p" },
  { en: "Where were you, {p}?", needs: "p" },
  { en: "I was in the {r}.", needs: "r" },
  { en: "Who called the meeting?" },
  { en: "I didn't see anything." },
  { en: "Let's skip this vote." }
];

function MeetingPhone({ T, lang, me, pub, secret, send }: { T: GStrings; lang: Lang; me: string; pub: PublicState & { at: number }; secret: Secret | null; send: (m: ToHost) => void }) {
  const m = pub.meeting!;
  const [now, setNow] = useState(Date.now());
  const [pending, setPending] = useState<typeof PHRASES[number] | null>(null);
  const [free, setFree] = useState("");
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(iv); }, []);
  const alive = !!pub.players.find((p) => p.id === me)?.alive;
  const myVote = m.voted.indexOf(me) !== -1 ? "x" : undefined;
  const [localVote, setLocalVote] = useState<string | undefined>();
  const msLeft = Math.max(0, m.msLeft - (now - pub.at));
  const imp = secret?.role === "impostor";
  const say = (text: string) => { send({ k: "chat", text }); sfx.pop(); setPending(null); };
  const pickPhrase = (ph: typeof PHRASES[number]) => (ph.needs ? setPending(ph) : say(ph.en));

  return (
    <div className="mtg" style={{ padding: "16px 14px 20px" }}>
      <div className="mtg-col">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <div className="kicker" style={{ background: m.reason === "report" ? "#e23d4f" : "#f07a1a" }}>{m.reason === "report" ? T.bodyFound : m.reason === "emergency" ? T.emergencyCalled : T.teacherCalled}</div>
        <Countdown ms={msLeft} />
      </div>
      {secret && <div className="tag" style={{ color: imp ? "#f07a1a" : "#7bbf5a", alignSelf: "flex-start", fontSize: 12 }}>{imp ? "📱 " + T.impostor : "📚 " + T.crew}</div>}
      <h2 className="h2" style={{ fontSize: 24, margin: 0 }}>{m.stage === "talk" ? T.talkStage : m.stage === "vote" ? T.voteStage : T.result}</h2>
      {m.stage === "talk" && alive && <div style={{ fontSize: 14, color: "rgba(242,239,230,0.7)" }}>{T.talkHelp}</div>}
      {!alive && <div className="tag" style={{ alignSelf: "flex-start" }}>{T.ghost}</div>}
      <MeetingBoard pub={pub} lang={lang} me={me} myVote={localVote || myVote} onVote={alive ? (t) => { setLocalVote(t); send({ k: "vote", target: t }); sfx.vote(); } : undefined} />
      {m.stage === "vote" && alive && !myVote && !localVote && (
        <button type="button" className="btn btn-s" onClick={() => { setLocalVote("skip"); send({ k: "vote", target: "skip" }); sfx.vote(); }}>{T.skipVote}</button>
      )}
      </div>

      <div className="mtg-col">
      <div className="plate" style={{ padding: "12px 12px 14px" }}>
        <div className="lbl lbl-y" style={{ marginBottom: 8 }}>💬 {T.chat}</div>
        <ChatFeed pub={pub} me={me} max={8} />
        {alive && m.stage !== "result" && (
          <div style={{ marginTop: 10 }}>
            {pending ? (
              <div>
                <div className="lbl" style={{ marginBottom: 6 }}>{pending.needs === "p" ? T.pickPlayer : T.pickRoom}</div>
                <div className="row" style={{ gap: 6 }}>
                  {pending.needs === "p"
                    ? pub.players.filter((p) => p.id !== me && p.alive).map((p) => (
                      <button key={p.id} type="button" className="opt off" style={{ padding: "6px 10px", fontSize: 13, textTransform: "none", letterSpacing: 0 }} onClick={() => say(pending.en.replace("{p}", p.name))}>{p.name}</button>
                    ))
                    : rooms.map((r) => (
                      <button key={r.id} type="button" className="opt off" style={{ padding: "6px 10px", fontSize: 13, textTransform: "none", letterSpacing: 0 }} onClick={() => say(pending.en.replace("{r}", r.en))}>{r.en}</button>
                    ))}
                  <button type="button" className="opt off" style={{ padding: "6px 10px", fontSize: 13 }} onClick={() => setPending(null)}>✕</button>
                </div>
              </div>
            ) : (
              <div className="row" style={{ gap: 6 }}>
                {PHRASES.map((ph) => (
                  <button key={ph.en} type="button" className="opt off" style={{ padding: "6px 10px", fontSize: 13, textTransform: "none", letterSpacing: 0 }} onClick={() => pickPhrase(ph)}>
                    {ph.en.replace("{p}", "…").replace("{r}", "…")}
                  </button>
                ))}
              </div>
            )}
            {pub.settings.chat === "free" && (
              <form onSubmit={(e) => { e.preventDefault(); if (free.trim()) { say(free.trim()); setFree(""); } }} style={{ display: "flex", gap: 8, marginTop: 8 }}>
                <input className="field" value={free} maxLength={80} placeholder={T.chatPh} onChange={(e) => setFree(e.target.value)} style={{ fontSize: 15, padding: "9px 10px" }} />
                <button type="submit" className="btn btn-y btn-sm" disabled={!free.trim()}>{T.sendChat}</button>
              </form>
            )}
          </div>
        )}
      </div>
      </div>
    </div>
  );
}

/* ---------------- the game world on the phone ---------------- */

const layerSvg: React.CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" };
const StaticWorld = memo(function StaticWorld() {
  return (
    <svg viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} style={layerSvg}>
      <MapDefs />
      <MapStatic />
    </svg>
  );
});

function PlayView({ T, lang, me, pub, secret, relay, others, mine, send, alive, emotes, ventFx, shake }: {
  T: GStrings; lang: Lang; me: string; pub: PublicState & { at: number }; secret: (Secret & { at: number }) | null;
  relay: React.MutableRefObject<Relay | null>; others: React.MutableRefObject<Record<string, Other>>;
  mine: React.MutableRefObject<{ x: number; y: number; dir: number; m: boolean; v?: string }>; send: (m: ToHost) => void; alive: boolean;
  emotes: React.MutableRefObject<Record<string, { e: string; at: number }>>; ventFx: React.MutableRefObject<Fx[]>; shake: React.MutableRefObject<number>;
}) {
  const [, setFrame] = useState(0);
  const [panel, setPanel] = useState<Station | null>(null);
  const [fuse, setFuse] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [showList, setShowList] = useState(true);
  const [showEmotes, setShowEmotes] = useState(false);
  const [showSab, setShowSab] = useState(false);
  const [done, setDone] = useState<string[]>([]);
  const [holding, setHolding] = useState<string | null>(null);
  const [foundBooks, setFoundBooks] = useState<number[]>([]);
  const [hint, setHint] = useState(false);
  const [bathBanner, setBathBanner] = useState(pub.bathLocked);
  const scanAt = useRef(0);
  const inScanner = useRef(false);
  const [size, setSize] = useState({ w: window.innerWidth, h: window.innerHeight });
  /* lite mode kicks in automatically on slow devices: fewer rays, no dust, coarser fog */
  const [lite, setLite] = useState(false);
  const liteRef = useRef(false);
  const fogRef = useRef<HTMLCanvasElement>(null);
  const [roomFlash, setRoomFlash] = useState<{ en: string; es: string; accent: string } | null>(null);
  const joy = useRef<{ ox: number; oy: number; x: number; y: number; id: number } | null>(null);
  const keys = useRef<Record<string, boolean>>({});
  const panelRef = useRef(false);
  panelRef.current = !!panel || showMap || fuse || !!mine.current.v;
  const ghostRef = useRef(!alive);
  ghostRef.current = !alive;
  const tRef = useRef(performance.now() / 1000);
  const dust = useRef<(Fx & { r: number })[]>([]);
  const lastDust = useRef<Record<string, number>>({});

  useEffect(() => {
    const onR = () => setSize({ w: window.innerWidth, h: window.innerHeight });
    const kd = (e: KeyboardEvent) => { if ((e.target as HTMLElement)?.tagName === "INPUT") return; keys.current[e.key.toLowerCase()] = true; };
    const ku = (e: KeyboardEvent) => { keys.current[e.key.toLowerCase()] = false; };
    window.addEventListener("resize", onR);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);
    let lock: { release: () => Promise<void> } | null = null;
    (navigator as any).wakeLock?.request("screen").then((l: any) => { lock = l; }).catch(() => {});
    return () => { window.removeEventListener("resize", onR); window.removeEventListener("keydown", kd); window.removeEventListener("keyup", ku); lock?.release().catch(() => {}); };
  }, []);

  const sendPos = useCallback(() => {
    const p = mine.current;
    relay.current?.send({ k: "pos", x: Math.round(p.x), y: Math.round(p.y), dir: p.dir, m: p.m, v: p.v } satisfies PosMsg, undefined, true);
  }, [mine, relay]);

  useEffect(() => {
    let raf = 0, last = performance.now(), lastSend = 0, wasMoving = false, lastRender = 0, ema = 1 / 60;
    const started = performance.now();
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000);
      last = t;
      ema = ema * 0.96 + dt * 0.04;
      if (!liteRef.current && t - started > 4000 && ema > 0.03) { liteRef.current = true; setLite(true); }
      tRef.current = t / 1000;
      let vx = 0, vy = 0;
      if (!panelRef.current) {
        const k = keys.current;
        vx = (k["d"] || k["arrowright"] ? 1 : 0) - (k["a"] || k["arrowleft"] ? 1 : 0);
        vy = (k["s"] || k["arrowdown"] ? 1 : 0) - (k["w"] || k["arrowup"] ? 1 : 0);
        const j = joy.current;
        if (j) {
          const dx = j.x - j.ox, dy = j.y - j.oy, d = Math.hypot(dx, dy);
          if (d > 8) { const s = Math.min(1, d / 60); vx = (dx / d) * s; vy = (dy / d) * s; }
        }
      }
      const mag = Math.hypot(vx, vy);
      const p = mine.current;
      if (mag > 0.05) {
        /* constant top speed like the original: no inertia, instant stop */
        const n = Math.min(1, mag);
        const nx = (vx / mag) * n * SPEED * dt, ny = (vy / mag) * n * SPEED * dt;
        const r = ghostRef.current ? ghostMove(p.x, p.y, nx, ny) : moveWithin(p.x, p.y, nx, ny);
        p.m = r.x !== p.x || r.y !== p.y;
        p.x = r.x; p.y = r.y;
        if (Math.abs(vx) > 0.1) p.dir = vx > 0 ? 1 : -1;
      } else p.m = false;
      if ((p.m && t - lastSend > 90) || (wasMoving && !p.m) || t - lastSend > 1000) { sendPos(); lastSend = t; }
      wasMoving = p.m;
      const f = 1 - Math.exp(-dt * 12);
      Object.values(others.current).forEach((o) => { o.dx += (o.x - o.dx) * f; o.dy += (o.y - o.dy) * f; });
      /* footstep dust */
      const addDust = (key: string, x: number, y: number) => {
        if (t - (lastDust.current[key] || 0) < 120) return;
        lastDust.current[key] = t;
        dust.current.push({ x: x + (Math.random() - 0.5) * 16, y: y - 2, at: t, r: 5 + Math.random() * 4 });
      };
      if (!liteRef.current) {
        if (p.m && !ghostRef.current) addDust("me", p.x, p.y);
        Object.entries(others.current).forEach(([oid, o]) => { if (o.m && !o.v) addDust(oid, o.dx, o.dy); });
      }
      dust.current = dust.current.filter((d) => t - d.at < 520);
      ventFx.current = ventFx.current.filter((v) => t - v.at < 700);
      /* draw at most ~60 times a second (even on 120 Hz screens), ~30 when nothing is moving */
      const busy = p.m || dust.current.length > 0 || ventFx.current.length > 0 || Object.values(others.current).some((o) => o.m || Math.abs(o.x - o.dx) + Math.abs(o.y - o.dy) > 1);
      if (t - lastRender >= (busy ? 15 : 32)) { lastRender = t; setFrame((x) => (x + 1) % 1000000); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [mine, others, sendPos, ventFx]);

  const p = mine.current;
  const ghost = !alive;
  const imp = secret?.role === "impostor";
  const lights = pub.sabotage?.kind === "lights";
  const alarm = pub.sabotage?.kind === "alarm";
  const vision = imp ? VISION.impostor : VISION.crew * (lights ? VISION.lightsOut : 1);
  const shakeAge = (performance.now() - shake.current) / 1000;
  const sh = shakeAge < 0.35 ? Math.sin(shakeAge * 90) * 10 * (1 - shakeAge / 0.35) : 0;
  const portrait = size.h >= size.w;
  const vw = portrait ? 860 : Math.min(1700, 800 * (size.w / size.h));
  const vh = portrait ? Math.min(1700, 860 * (size.h / size.w)) : 800;
  /* css px per world unit; the camera is a translate on GPU layers, so the map is never redrawn while moving */
  const scale = Math.max(size.w / vw, size.h / vh);
  const dpr = window.devicePixelRatio || 1;
  const tx = Math.round((size.w / 2 - (p.x + sh) * scale) * dpr) / dpr;
  const ty = Math.round((size.h / 2 - (p.y - 40) * scale) * dpr) / dpr;
  const nowMs = Date.now();
  const tNow = tRef.current;
  const eye = { x: p.x, y: p.y - 30 };
  const ex = Math.round(eye.x), ey = Math.round(eye.y);
  const sight = useMemo(() => (ghost ? null : sightPoints(ex, ey, vision, lite ? 96 : 150)), [ex, ey, vision, ghost, lite]);
  const canSee = (q: { x: number; y: number }) => ghost || (dist(eye, q) < vision + 30 && lineOfSight(eye, { x: q.x, y: q.y - 30 }));

  const doneSet = new Set([...(secret?.done || []), ...done]);
  const myTasks = (secret?.tasks || []).map((sid) => stations.find((s) => s.id === sid)!).filter(Boolean);
  const todo = myTasks.filter((s) => !doneSet.has(s.id));
  const inVent = p.v ? vents.find((v) => v.id === p.v) : undefined;
  const nearStation = !inVent ? todo.find((s) => dist(p, s) < RANGE.use) : undefined;
  const booksTodo = todo.some((x) => x.id === "s-books");
  const bookSpots = useMemo(() => {
    let h = 7;
    for (const ch of me + ":" + pub.round) h = (h * 31 + ch.charCodeAt(0)) % 100003;
    const idx = BOOK_SPOTS.map((_, i) => i).sort((a, b) => ((a * 7919 + h) % 97) - ((b * 7919 + h) % 97));
    return idx.slice(0, 3).map((i) => BOOK_SPOTS[i]);
  }, [me, pub.round]);
  if (import.meta.env.DEV) (window as any).__books = booksTodo ? bookSpots : [];
  const booksLeft = booksTodo ? bookSpots.filter((_, i) => !foundBooks.includes(i)) : [];
  const booksNeed = booksTodo && booksLeft.length > 0;
  const nearBathDoor = pub.bathLocked && dist(p, { x: BATH_DOOR.x + BATH_DOOR.w / 2, y: BATH_DOOR.y + BATH_DOOR.h }) < 220;
  const nearGuard = dist(p, GUARD) < 260;
  const guardLook = (() => {
    const cand = [{ x: p.x, d: dist(p, GUARD) }, ...Object.values(others.current).filter((o) => !o.v).map((o) => ({ x: o.dx, d: dist({ x: o.dx, y: o.dy }, GUARD) }))].sort((a, b) => a.d - b.d)[0];
    return cand && cand.d < 400 ? (cand.x < GUARD.x ? -1 : 1) : (Math.sin(tNow * 0.5) > 0 ? 1 : -1);
  })();
  const scanAge = (performance.now() - scanAt.current) / 1000;
  const scanFlash = scanAge < 0.7 ? 1 - scanAge / 0.7 : 0;
  const nearBell = !ghost && !inVent && (secret?.emergencyLeft || 0) > 0 && dist(p, BELL) < RANGE.bell;
  const nearFuse = !ghost && lights && dist(p, FUSE) < RANGE.fix;
  const nearPanel = !ghost && alarm ? ALARM_PANELS.find((a) => dist(p, a) < RANGE.fix) : undefined;
  const nearVent = imp && alive && pub.settings.vents && !inVent ? vents.find((v) => dist(p, v) < RANGE.vent) : undefined;
  const bodies = pub.bodies.filter((b) => canSee(b));
  const nearBody = !ghost && !inVent ? bodies.find((b) => dist(p, b) < RANGE.report) : undefined;
  const killMs = secret ? Math.max(0, secret.killMsLeft - (nowMs - secret.at)) : 0;
  const sabMs = secret ? Math.max(0, secret.sabotageMsLeft - (nowMs - secret.at)) : 0;
  const visible = pub.players.filter((q) => {
    if (q.id === me || !q.connected) return false;
    const o = others.current[q.id];
    if (!o || o.v) return false;
    if (!q.alive && !ghost) return false;
    return canSee({ x: o.dx, y: o.dy });
  });
  const killTarget = imp && alive && killMs === 0 && !inVent
    ? visible.filter((q) => q.alive && secret!.partners.indexOf(q.id) === -1).map((q) => ({ q, d: dist(p, { x: others.current[q.id].dx, y: others.current[q.id].dy }) })).filter((x) => x.d < RANGE.kill).sort((a, b) => a.d - b.d)[0]?.q
    : undefined;
  const room = roomAt(p.x, p.y);
  const lk = pub.lastKill;
  const killFxAge = lk ? (nowMs - (pub.at - lk.ago)) / 1000 : 99;

  useEffect(() => {
    setBlocked(pub.bathLocked ? [BATH_DOOR] : []);
    return () => setBlocked([]);
  }, [pub.bathLocked]);
  useEffect(() => {
    if (!bathBanner) return;
    const t = setTimeout(() => setBathBanner(false), 7000);
    return () => clearTimeout(t);
  }, [bathBanner]);
  /* pick up missing books by walking over them */
  useEffect(() => {
    if (!booksTodo || ghost) return;
    bookSpots.forEach((b, i) => {
      if (!foundBooks.includes(i) && dist(p, b) < 70) { setFoundBooks((f) => (f.includes(i) ? f : f.concat(i))); sfx.task(); }
    });
  });
  /* the scanner arch beeps whenever someone walks through it */
  useEffect(() => {
    const inside = (q: { x: number; y: number }) => q.x > SCANNER.x && q.x < SCANNER.x + SCANNER.w && q.y > SCANNER.y - 10 && q.y < SCANNER.y + SCANNER.h + 10;
    const someone = (!ghost && inside(p)) || Object.values(others.current).some((o) => !o.v && inside({ x: o.dx, y: o.dy }));
    if (someone && !inScanner.current) { scanAt.current = performance.now(); if (dist(p, SCANNER) < 500) sfx.vote(); }
    inScanner.current = someone;
  });

  /* release a held alarm panel when walking away */
  useEffect(() => {
    if (holding && (!nearPanel || nearPanel.id !== holding)) { send({ k: "hold", panel: holding, on: false }); setHolding(null); }
  }, [holding, nearPanel, send]);

  /* fog of war, Among Us style: outside your sight the academy is dimmed (still readable), people are hidden */
  const fogQ = lite ? 0.25 : 0.4;
  useLayoutEffect(() => {
    const c = fogRef.current;
    if (!c) return;
    const W = Math.max(1, Math.round(size.w * fogQ)), H = Math.max(1, Math.round(size.h * fogQ));
    if (c.width !== W) c.width = W;
    if (c.height !== H) c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.globalCompositeOperation = "source-over";
    ctx.clearRect(0, 0, W, H);
    if (!sight) return;
    ctx.fillStyle = lights ? "rgba(3,5,8,0.9)" : "rgba(8,11,14,0.6)";
    ctx.fillRect(0, 0, W, H);
    const k = scale * fogQ, ox = tx * fogQ, oy = ty * fogQ;
    const cx = ox + eye.x * k, cy = oy + eye.y * k, R = vision * k;
    const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, R);
    grad.addColorStop(0, "rgba(0,0,0,1)");
    grad.addColorStop(0.7, "rgba(0,0,0,1)");
    grad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = grad;
    ctx.beginPath();
    for (let i = 0; i < sight.length; i += 2) {
      const x = ox + sight[i] * k, y = oy + sight[i + 1] * k;
      if (i) ctx.lineTo(x, y); else ctx.moveTo(x, y);
    }
    ctx.closePath();
    ctx.fill();
    ctx.globalCompositeOperation = "source-over";
  });
  /* big room name when you walk into a new room */
  const roomId = room?.id;
  useEffect(() => {
    if (!room) return;
    setRoomFlash({ en: room.en, es: room.es, accent: room.accent });
    const t = setTimeout(() => setRoomFlash(null), 1800);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  /* arrows on the screen edge pointing at things you need to reach */
  const targets: { x: number; y: number; c: string; k: string }[] = [
    ...todo.filter((st) => !(st.id === "s-books" && booksNeed)).map((st) => ({ x: st.x, y: st.y, c: "#f5c518", k: st.id })),
    ...booksLeft.map((b, i) => ({ x: b.x, y: b.y, c: "#3fa7d6", k: "b" + i })),
    ...(lights && !ghost ? [{ x: FUSE.x, y: FUSE.y, c: "#e23d4f", k: "fuse" }] : []),
    ...(alarm && !ghost ? ALARM_PANELS.filter((a) => !pub.sabotage!.held.includes(a.id)).map((a) => ({ x: a.x, y: a.y, c: "#e23d4f", k: "al" + a.id })) : [])
  ];
  const arrows = targets.flatMap((tg) => {
    const sx = tx + tg.x * scale, sy = ty + (tg.y - 20) * scale;
    const mL = 26, mR = 26, mT = 96, mB = 150;
    if (sx > mL && sx < size.w - mR && sy > mT && sy < size.h - mB) return [];
    const cx = size.w / 2, cy = size.h / 2, dx = sx - cx, dy = sy - cy;
    const f = Math.min(dx > 0 ? (size.w - mR - cx) / dx : dx < 0 ? (mL - cx) / dx : Infinity, dy > 0 ? (size.h - mB - cy) / dy : dy < 0 ? (mT - cy) / dy : Infinity);
    return [{ ...tg, x: cx + dx * f, y: cy + dy * f, a: Math.atan2(dy, dx) * 180 / Math.PI, d: Math.hypot(tg.x - p.x, tg.y - p.y) }];
  });

  const layerStyle: React.CSSProperties = { position: "absolute", left: 0, top: 0, width: WORLD.w * scale, height: WORLD.h * scale, transform: `translate3d(${tx}px,${ty}px,0)`, willChange: "transform", pointerEvents: "none" };

  const onDown = (e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    joy.current = { ox: e.clientX, oy: e.clientY, x: e.clientX, y: e.clientY, id: e.pointerId };
  };
  const onMove = (e: React.PointerEvent) => { const j = joy.current; if (j && j.id === e.pointerId) { j.x = e.clientX; j.y = e.clientY; } };
  const onUp = (e: React.PointerEvent) => { if (joy.current?.id === e.pointerId) joy.current = null; };

  const use = () => {
    if (nearFuse) setFuse(true);
    else if (nearStation && nearStation.id === "s-books" && booksNeed) { setHint(true); setTimeout(() => setHint(false), 2600); }
    else if (nearStation) setPanel(nearStation);
    else if (nearBell) send({ k: "emergency" });
  };
  const ventTo = (vid: string | undefined) => {
    const v = vents.find((x) => x.id === (vid || p.v));
    if (!v) return;
    relay.current?.send({ k: "ventfx", x: v.x, y: v.y } satisfies VentFx, undefined, true);
    ventFx.current.push({ x: v.x, y: v.y, at: performance.now() });
    p.x = v.x; p.y = v.y + 2;
    p.v = vid;
    sfx.vent();
    sendPos();
  };
  const emote = (e: string) => {
    relay.current?.send({ k: "emote", e } satisfies EmoteMsg, undefined, true);
    emotes.current[me] = { e, at: performance.now() };
    setShowEmotes(false);
    sfx.pop();
  };

  const useLabel = nearFuse ? T.fix : nearBell && !nearStation ? T.bell : T.use;
  const useIcon = nearFuse ? "🔧" : nearBell && !nearStation ? "🔔" : "✋";
  const meP = pub.players.find((x) => x.id === me);

  const drawChar = (q: PublicState["players"][number], x: number, y: number, dir: number, moving: boolean) => {
    const partner = imp && secret!.partners.indexOf(q.id) !== -1;
    const em = emotes.current[q.id];
    const emAge = em ? (performance.now() - em.at) / 1000 : 99;
    const isKiller = q.id === me && shakeAge < 0.6;
    return (
      <g key={q.id} transform={`translate(${x},${y})`}>
        <Lingo look={q.look} dir={dir} moving={moving} ghost={!q.alive} t={tNow} seed={q.id} happy={isKiller} />
        <text y={-124} textAnchor="middle" fontSize={20} fontWeight={800} fill={partner || (q.id === me && imp) ? "#ff5a5a" : "#f2efe6"} stroke="#0e1113" strokeWidth={5} paintOrder="stroke">
          {q.teacher ? "🎓 " : ""}{q.name}
        </text>
        {killTarget?.id === q.id && <circle r={48} cy={-44} fill="none" stroke="#e23d4f" strokeWidth={4} strokeDasharray="8 6" style={{ transformOrigin: "0 -44px", animation: "imp-spin 3s linear infinite" }} />}
        {emAge < 2.6 && (
          <g transform={`translate(0 ${-160 - Math.min(1, emAge * 4) * 10}) scale(${Math.min(1, emAge * 5)})`} opacity={emAge > 2.2 ? (2.6 - emAge) / 0.4 : 1}>
            <rect x={-30} y={-30} width={60} height={50} rx={14} fill="#f2efe6" stroke="#0e1113" strokeWidth={4} />
            <path d="M -8 18 L 0 30 L 8 18" fill="#f2efe6" stroke="#0e1113" strokeWidth={4} strokeLinejoin="round" />
            <text y={8} textAnchor="middle" fontSize={30}>{em!.e}</text>
          </g>
        )}
      </g>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, touchAction: "none", userSelect: "none", WebkitUserSelect: "none", overflow: "hidden", background: "#141a1d" }}
      onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
      {/* layer 1: the academy itself — drawn once, then only slid around by the camera */}
      <div style={layerStyle}><StaticWorld /></div>
      {/* layer 2: people, bodies and effects */}
      <div style={layerStyle}>
        <svg viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} style={layerSvg}>
          <MapDynamic bathLocked={pub.bathLocked} scanFlash={scanFlash} />
        <Watchman t={tNow} lookDir={guardLook} alert={nearGuard && !ghost} />
        {nearGuard && !ghost && (
          <g transform={`translate(${GUARD.x + 40},${GUARD.y - 200})`}>
            <rect x={0} y={-24} width={170} height={36} rx={10} fill="#f2efe6" stroke="#0e1113" strokeWidth={3} />
            <text x={85} y={0} textAnchor="middle" fontSize={15} fontWeight={800} fill="#0e1113">{todo.some((x) => x.id === "s-guard") ? "Security check, please!" : "Good evening! 👋"}</text>
          </g>
        )}
        {pub.settings.vents && imp && vents.map((v) => <VentArt key={v.id + "o"} x={v.x} y={v.y} open={inVent?.id === v.id ? 1 : 0} />)}
        {ventFx.current.map((v, i) => {
          const a = (tNow * 1000 - v.at) / 1000;
          return <g key={"vf" + i}><VentArt x={v.x} y={v.y} open={Math.sin(Math.min(1, a / 0.6) * Math.PI)} /></g>;
        })}
        {dust.current.map((d, i) => {
          const a = (tNow * 1000 - d.at) / 520;
          return <circle key={"d" + i} cx={d.x} cy={d.y - a * 8} r={d.r + a * 8} fill="#d9d4c4" opacity={0.45 * (1 - a)} />;
        })}
        {bodies.map((b) => {
          const who = pub.players.find((q) => q.id === b.id);
          return who ? <g key={b.id} transform={`translate(${b.x},${b.y})`}><Lingo look={who.look} dead t={tNow} seed={who.id} /></g> : null;
        })}
        {lk && killFxAge < 1.4 && canSee(lk) && (
          <g transform={`translate(${lk.x},${lk.y - 50}) scale(${0.6 + Math.min(1, killFxAge * 4) * 0.8})`} opacity={1 - killFxAge / 1.4}>
            <path d="M 0 -70 L 16 -24 L 66 -30 L 26 4 L 50 50 L 4 24 L -36 60 L -24 12 L -70 -6 L -22 -22 Z" fill="#f5c518" stroke="#0e1113" strokeWidth={6} strokeLinejoin="round" />
            <text y={14} textAnchor="middle" fontSize={34} fontFamily="'Archivo Black',sans-serif" fill="#e23d4f" stroke="#0e1113" strokeWidth={3} paintOrder="stroke">ZAP!</text>
          </g>
        )}
        {[...visible.map((q) => ({ q, x: others.current[q.id].dx, y: others.current[q.id].dy, dir: others.current[q.id].dir, m: others.current[q.id].m })),
          ...(meP && !inVent ? [{ q: meP, x: p.x, y: p.y, dir: p.dir, m: p.m }] : [])]
          .sort((a, b) => a.y - b.y)
          .map(({ q, x, y, dir, m }) => drawChar(q, x, y, dir, m))}
        </svg>
      </div>
      {/* layer 3: fog of war (low-res canvas = soft edges for free) */}
      <canvas ref={fogRef} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }} />
      {/* layer 4: things you are looking for stay visible through the fog */}
      <div style={layerStyle}>
        <svg viewBox={`0 0 ${WORLD.w} ${WORLD.h}`} style={layerSvg}>
        {booksLeft.map((b, i) => (
          <g key={"book" + i} transform={`translate(${b.x},${b.y - 10 + Math.sin(tNow * 3 + i) * 5})`}>
            <ellipse cx={0} cy={22} rx={20} ry={5} fill="rgba(0,0,0,0.3)" />
            <rect x={-16} y={-12} width={32} height={24} rx={3} fill="#3a5bc7" stroke="#0e1113" strokeWidth={3} transform="rotate(-10)" />
            <path d="M -10 -4 L 10 -7 M -9 2 L 8 -1" stroke="#f5c518" strokeWidth={2.5} transform="rotate(-10)" />
            <circle r={30 + Math.sin(tNow * 5) * 3} fill="none" stroke="#3fa7d6" strokeWidth={3} strokeDasharray="6 6" />
          </g>
        ))}
        {todo.map((s) => (
          <g key={s.id} transform={`translate(${s.x},${s.y})`}>
            <circle r={30 + Math.sin(tNow * 5) * 3} fill="none" stroke="#f5c518" strokeWidth={5} />
            <text y={-36 + Math.sin(tNow * 4) * 4} textAnchor="middle" fontSize={34} fontFamily="'Archivo Black',sans-serif" fill="#f5c518" stroke="#0e1113" strokeWidth={5} paintOrder="stroke">!</text>
          </g>
        ))}
        {lights && <circle cx={FUSE.x} cy={FUSE.y - 46} r={50 + Math.sin(tNow * 8) * 6} fill="none" stroke="#e23d4f" strokeWidth={6} />}
        {alarm && ALARM_PANELS.map((a) => <circle key={a.id} cx={a.x} cy={a.y - 8} r={44 + Math.sin(tNow * 10) * 6} fill="none" stroke={pub.sabotage!.held.includes(a.id) ? "#7bbf5a" : "#e23d4f"} strokeWidth={6} />)}
        </svg>
      </div>
      {arrows.map((a) => (
        <div key={"ar" + a.k} style={{ position: "absolute", left: a.x, top: a.y, transform: `translate(-50%,-50%) rotate(${a.a}deg)`, pointerEvents: "none" }}>
          <svg width={34} height={34} viewBox="-17 -17 34 34" style={{ display: "block", overflow: "visible" }}>
            <path d={`M ${10 + Math.sin(tNow * 6) * 3} 0 L -8 -11 L -3 0 L -8 11 Z`} fill={a.c} stroke="#0e1113" strokeWidth={3} strokeLinejoin="round" />
          </svg>
        </div>
      ))}
      {roomFlash && (
        <div key={roomFlash.en} style={{ position: "absolute", left: 0, right: 0, bottom: "24%", textAlign: "center", pointerEvents: "none", animation: "imp-roomFlash 1.8s ease-out both" }}>
          <div style={{ font: "400 clamp(22px,6vw,40px) 'Archivo Black',sans-serif", textTransform: "uppercase", color: "#f2efe6", textShadow: `3px 3px 0 #0e1113, 0 0 18px ${roomFlash.accent}` }}>{roomFlash.en}</div>
          <div style={{ font: "700 13px 'Space Mono',monospace", letterSpacing: "0.2em", textTransform: "uppercase", color: roomFlash.accent, textShadow: "2px 2px 0 #0e1113" }}>{roomFlash.es}</div>
        </div>
      )}

      {alarm && <div style={{ position: "absolute", inset: 0, pointerEvents: "none", boxShadow: `inset 0 0 ${60 + Math.sin(tNow * 8) * 30}px rgba(226,61,79,0.75)` }} />}

      {/* HUD */}
      <div style={{ position: "absolute", top: 8, left: 8, right: 8, display: "flex", gap: 8, alignItems: "flex-start", pointerEvents: "none" }}>
        <div style={{ flex: 1, pointerEvents: "auto" }}>
          <TaskBar label={T.taskBar} done={pub.tasksDone} total={pub.tasksTotal} />
        </div>
        {room && <span className="tag" style={{ color: room.accent, background: "#1b2023ee", flex: "none" }}>{room.en}</span>}
      </div>
      {(bathBanner || nearBathDoor || hint) && !(lights || alarm) && (
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", width: "min(92vw,460px)", padding: "8px 12px", border: "3px solid #0e1113", borderRadius: 5, background: hint ? "#3a5bc7" : "#f2efe6", color: hint ? "#fff" : "#0e1113", font: "700 13px 'Space Mono',monospace", textAlign: "center", zIndex: 5, animation: "imp-popIn .3s" }}>
          {hint ? `📘 ${3 - booksLeft.length}/3 — ${T.booksHint}` : `🚫💩 ${T.bathLocked}`}
        </div>
      )}
      {(lights || alarm) && (
        <div style={{ position: "absolute", top: 60, left: "50%", transform: "translateX(-50%)", width: "min(92vw,460px)", padding: "8px 12px", border: "3px solid #0e1113", borderRadius: 5, background: "#b4441f", color: "#fff3e0", font: "700 13px 'Space Mono',monospace", textAlign: "center", animation: "imp-blink 1s infinite", zIndex: 5 }}>
          {alarm ? `🚨 ${Math.ceil((pub.sabotage!.msLeft - (nowMs - pub.at)) / 1000)}s — ${T.alarmMsg}` : `💡 ${T.lightsMsg}`}
        </div>
      )}
      <div style={{ position: "absolute", top: (lights || alarm || bathBanner || nearBathDoor || hint) ? 128 : 62, left: 8, maxWidth: "62vw" }}>
        <button type="button" className="tag" onClick={() => setShowList((v) => !v)} style={{ color: imp ? "#ff5a5a" : "#f5c518", cursor: "pointer" }}>
          {imp ? "📱 " + T.impostor : "📚 " + T.crew} {showList ? "▾" : "▸"}
        </button>
        {showList && (
          <div style={{ marginTop: 4, padding: "6px 8px", border: "2px solid #0e1113", borderRadius: 4, background: "#1b2023dd", fontSize: 12, lineHeight: 1.5 }}>
            <div style={{ font: "700 11px 'Space Mono',monospace", color: "rgba(242,239,230,0.6)" }}>{imp ? T.fakeMissions : T.missions}</div>
            {myTasks.map((s) => {
              const r = rooms.find((x) => x.id === s.room)!;
              const ok = doneSet.has(s.id);
              return <div key={s.id} style={{ color: ok ? "#7bbf5a" : "#f2efe6", textDecoration: ok ? "line-through" : "none" }}>{ok ? "✓" : "•"} {r.en}: {s.label}{s.id === "s-books" && !ok ? ` (📘 ${3 - booksLeft.length}/3)` : ""}</div>;
            })}
            {ghost && <div style={{ color: "#f5c518", marginTop: 4 }}>{T.ghost}</div>}
          </div>
        )}
      </div>

      {joy.current && (
        <div style={{ position: "absolute", left: joy.current.ox - 60, top: joy.current.oy - 60, width: 120, height: 120, borderRadius: "50%", border: "3px solid rgba(242,239,230,0.35)", background: "rgba(14,17,19,0.25)", pointerEvents: "none" }}>
          <div style={{ position: "absolute", left: 60 - 24 + clamp(joy.current.x - joy.current.ox, 60), top: 60 - 24 + clamp(joy.current.y - joy.current.oy, 60), width: 48, height: 48, borderRadius: "50%", background: "#f5c518", border: "3px solid #0e1113" }} />
        </div>
      )}

      {inVent ? (
        <div style={{ position: "absolute", left: 0, right: 0, bottom: "max(14px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <span className="tag" style={{ color: "#f5c518" }}>{T.inVent}</span>
          <div className="row" style={{ justifyContent: "center" }}>
            {inVent.links.map((lid) => {
              const v = vents.find((x) => x.id === lid)!;
              const r = rooms.find((x) => x.id === v.room)!;
              const ang = Math.atan2(v.y - inVent.y, v.x - inVent.x) * 180 / Math.PI;
              return <button key={lid} type="button" className="btn btn-o btn-sm" onClick={() => ventTo(lid)}><span style={{ display: "inline-block", transform: `rotate(${ang}deg)` }}>➜</span> {r.en}</button>;
            })}
            <button type="button" className="btn btn-y btn-sm" onClick={() => { const v = inVent; p.v = undefined; relay.current?.send({ k: "ventfx", x: v.x, y: v.y } satisfies VentFx, undefined, true); ventFx.current.push({ x: v.x, y: v.y, at: performance.now() }); p.y = v.y + 2; sfx.vent(); sendPos(); }}>{T.exitVent}</button>
          </div>
        </div>
      ) : (
        <>
          <div style={{ position: "absolute", right: 10, bottom: "max(14px, env(safe-area-inset-bottom))", display: "flex", flexDirection: "column", gap: "min(10px,1.4dvh)", alignItems: "flex-end" }}>
            {imp && pub.settings.sabotage && (
              <ActBtn label={sabMs > 0 || pub.sabotage ? (pub.sabotage ? "…" : Math.ceil(sabMs / 1000) + "s") : T.sabotage} color="#9b6bd3" disabled={sabMs > 0 || !!pub.sabotage} onClick={() => setShowSab((v) => !v)} icon="🔥" small />
            )}
            {nearVent && <ActBtn label={T.vent} color="#8b969c" disabled={false} onClick={() => ventTo(nearVent.id)} icon="🕳" small />}
            {imp && alive && (
              <ActBtn label={killMs > 0 ? Math.ceil(killMs / 1000) + "s" : T.kill} color="#e23d4f" disabled={!killTarget} onClick={() => { if (killTarget) { send({ k: "kill", target: killTarget.id }); } }} icon="⚡" />
            )}
            {!ghost && <ActBtn label={T.report} color="#f07a1a" disabled={!nearBody} onClick={() => nearBody && send({ k: "report", body: nearBody.id })} icon="📢" />}
            {nearPanel ? (
              <button type="button"
                onPointerDown={() => { setHolding(nearPanel.id); send({ k: "hold", panel: nearPanel.id, on: true }); }}
                onPointerUp={() => { setHolding(null); send({ k: "hold", panel: nearPanel.id, on: false }); }}
                onPointerLeave={() => { if (holding) { setHolding(null); send({ k: "hold", panel: nearPanel.id, on: false }); } }}
                style={{ width: "clamp(60px,13dvh,96px)", height: "clamp(60px,13dvh,96px)", borderRadius: "50%", border: "4px solid #0e1113", background: holding ? "#7bbf5a" : "#e23d4f", color: "#0e1113", boxShadow: holding ? "0 1px 0 #0e1113" : "0 5px 0 #0e1113", font: "800 13px Archivo,sans-serif", textTransform: "uppercase", cursor: "pointer", transform: holding ? "translateY(4px)" : "none" }}>
                ✋<br />{T.hold} {nearPanel.id}
              </button>
            ) : (
              <ActBtn label={useLabel} color="#f5c518" disabled={!nearStation && !nearBell && !nearFuse} onClick={use} icon={useIcon} />
            )}
          </div>
          <div style={{ position: "absolute", left: 10, bottom: "max(14px, env(safe-area-inset-bottom))", display: "flex", gap: 8, alignItems: "flex-end" }}>
            <button type="button" className="btn btn-s btn-sm" onClick={() => setShowMap(true)}>🗺 {T.map}</button>
            <button type="button" className="btn btn-s btn-sm" onClick={() => setShowEmotes((v) => !v)}>😀</button>
          </div>
          {showEmotes && (
            <div style={{ position: "absolute", left: 10, bottom: 70, display: "flex", gap: 6, padding: 6, border: "3px solid #0e1113", borderRadius: 8, background: "#1b2023ee", animation: "imp-popIn .2s" }}>
              {EMOTES.map((e) => <button key={e} type="button" onClick={() => emote(e)} style={{ fontSize: 26, width: 44, height: 44, border: "2px solid #0e1113", borderRadius: 6, background: "#3b4349", cursor: "pointer" }}>{e}</button>)}
            </div>
          )}
          {showSab && !pub.sabotage && sabMs === 0 && (
            <div style={{ position: "absolute", right: 110, bottom: 120, display: "flex", flexDirection: "column", gap: 8, padding: 10, border: "3px solid #0e1113", borderRadius: 8, background: "#1b2023f0", animation: "imp-popIn .2s" }}>
              <div className="lbl" style={{ color: "#c9a2ff" }}>{T.sabotage}</div>
              <button type="button" className="btn btn-s btn-sm" onClick={() => { send({ k: "sabotage", kind: "lights" }); setShowSab(false); }}>💡 {T.lightsOut}</button>
              <button type="button" className="btn btn-r btn-sm" onClick={() => { send({ k: "sabotage", kind: "alarm" }); setShowSab(false); }}>🚨 {T.fireAlarm}</button>
            </div>
          )}
        </>
      )}
      {nearPanel && !inVent && <div style={{ position: "absolute", left: 0, right: 0, bottom: 128, textAlign: "center", pointerEvents: "none" }}><span className="tag" style={{ color: "#fff3e0", background: "#b4441f" }}>{T.holdHelp}</span></div>}
{!inVent && <div style={{ position: "absolute", left: 0, right: 0, bottom: 70, textAlign: "center", pointerEvents: "none", font: "700 10px 'Space Mono',monospace", color: "rgba(242,239,230,0.35)" }}>{T.moveHelp}</div>}

      {showMap && <MiniMap onClose={() => setShowMap(false)} me={p} todo={todo} doneList={myTasks.filter((x) => doneSet.has(x.id))} books={booksLeft} T={T} sabotage={pub.sabotage?.kind} room={room?.en} />}
      {fuse && <FusePanel T={T} onClose={() => setFuse(false)} onFixed={() => { send({ k: "fixLights" }); setFuse(false); }} />}
      {panel && (
        <MissionPanel station={panel} level={pub.settings.level} lang={lang} fake={imp}
          onDone={() => { setDone((d) => d.concat(panel.id)); send({ k: "task", station: panel.id }); }}
          onClose={() => setPanel(null)} />
      )}
    </div>
  );
}

const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));

function ActBtn({ label, icon, color, disabled, onClick, small }: { label: string; icon: string; color: string; disabled: boolean; onClick: () => void; small?: boolean }) {
  const s = small ? "clamp(46px,9.5dvh,64px)" : "clamp(54px,12dvh,84px)";
  return (
    <button type="button" onClick={onClick} disabled={disabled}
      style={{ width: s, height: s, borderRadius: "50%", border: "4px solid #0e1113", background: color, color: "#0e1113", boxShadow: "0 5px 0 #0e1113", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 2, cursor: "pointer", font: `800 ${small ? "clamp(7px,1.4dvh,10px)" : "clamp(8px,1.6dvh,12px)"} Archivo,sans-serif`, textTransform: "uppercase", opacity: disabled ? 0.4 : 1, overflow: "hidden", padding: 0, whiteSpace: "nowrap" }}>
      <span style={{ fontSize: small ? "clamp(14px,3dvh,20px)" : "clamp(17px,3.6dvh,26px)", lineHeight: 1 }}>{icon}</span>{label}
    </button>
  );
}

/* lights sabotage repair: flip every switch up */
function FusePanel({ T, onClose, onFixed }: { T: GStrings; onClose: () => void; onFixed: () => void }) {
  const [sw, setSw] = useState(() => {
    const a = Array.from({ length: 5 }, () => Math.random() < 0.5);
    if (a.every(Boolean)) a[2] = false;
    return a;
  });
  const fixedRef = useRef(onFixed);
  fixedRef.current = onFixed;
  const allOn = sw.every(Boolean);
  useEffect(() => {
    if (allOn) { const t = setTimeout(() => fixedRef.current(), 350); return () => clearTimeout(t); }
  }, [allOn]);
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, background: "rgba(14,17,19,0.8)", display: "flex", flexDirection: "column", padding: 12 }}>
      <Fit><div className="plate" style={{ width: "min(420px,100%)", margin: "0 auto", animation: "imp-popIn .2s" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div><div className="lbl lbl-y">⚡ {FUSE.label}</div><div style={{ fontSize: 14, color: "rgba(242,239,230,0.7)" }}>{T.fuseHelp}</div></div>
          <button type="button" className="sq btn-s" onClick={onClose}>✕</button>
        </div>
        <div style={{ display: "flex", justifyContent: "space-around", padding: "14px 6px", border: "3px solid #0e1113", borderRadius: 6, background: "#1b2023" }}>
          {sw.map((on, i) => (
            <button key={i} type="button" onClick={() => { setSw((a) => a.map((x, k) => (k === i ? !x : x))); sfx.step(); }}
              style={{ width: 44, height: 100, border: "3px solid #0e1113", borderRadius: 6, background: "#3b4349", position: "relative", cursor: "pointer" }}>
              <span style={{ position: "absolute", left: 4, right: 4, height: 40, top: on ? 6 : 48, borderRadius: 4, border: "3px solid #0e1113", background: on ? "#7bbf5a" : "#e23d4f", transition: "top .12s" }} />
            </button>
          ))}
        </div>
      </div></Fit>
    </div>
  );
}

function MiniMap({ onClose, me, todo, doneList, books, T, sabotage, room }: { onClose: () => void; me: { x: number; y: number }; todo: Station[]; doneList: Station[]; books: { x: number; y: number }[]; T: GStrings; sabotage?: string; room?: string }) {
  const portrait = window.innerHeight > window.innerWidth * 1.15;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, background: "#0e1113", display: "flex", flexDirection: "column", padding: 10, gap: 8 }} onPointerDown={(e) => e.stopPropagation()}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <span className="lbl lbl-y">🗺 {T.map} — ECYR English</span>
        <button type="button" className="sq btn-s" onClick={onClose}>✕</button>
      </div>
      <span className="lbl" style={{ display: "flex", gap: "4px 14px", flexWrap: "wrap" }}>
          <span><span style={{ color: "#f5c518" }}>●</span> {T.yourMissions}: {todo.length}</span>
          <span><span style={{ color: "#7bbf5a" }}>✓</span> {doneList.length} {T.done}</span>
          <span><span style={{ color: "#3fa7d6" }}>●</span> {T.youAreHere}{room ? `: ${room}` : ""}</span>
      </span>
      {/* portrait phones get the plan turned sideways so it is twice as big */}
      <svg viewBox={portrait ? `20 40 ${WORLD.h - 30} ${WORLD.w - 60}` : `40 20 ${WORLD.w - 40} ${WORLD.h - 20}`} preserveAspectRatio="xMidYMid meet" style={{ flex: 1, minHeight: 0, width: "100%", border: "3px solid #3b4349", borderRadius: 6, background: "#141a1d" }}>
        <g transform={portrait ? `translate(${WORLD.h} 0) rotate(90)` : undefined}>
        <MapDefs />
        <MapStatic />
        {stations.map((s) => <circle key={"all" + s.id} cx={s.x} cy={s.y} r={14} fill="rgba(242,239,230,0.35)" stroke="#0e1113" strokeWidth={4} />)}
        {doneList.map((s) => <text key={"ok" + s.id} x={s.x} y={s.y + 18} textAnchor="middle" fontSize={56} fontWeight={900} fill="#7bbf5a" stroke="#0e1113" strokeWidth={6} paintOrder="stroke">✓</text>)}
        {todo.map((s) => <circle key={s.id} cx={s.x} cy={s.y} r={38} fill="#f5c518" stroke="#0e1113" strokeWidth={6} style={{ animation: "imp-blink 1s infinite" }} />)}
        {books.map((b, i) => <rect key={"bk" + i} x={b.x - 22} y={b.y - 16} width={44} height={32} rx={4} fill="#3a5bc7" stroke="#fff" strokeWidth={5} />)}
        {sabotage === "lights" && <circle cx={FUSE.x} cy={FUSE.y - 40} r={46} fill="#e23d4f" stroke="#fff" strokeWidth={6} style={{ animation: "imp-blink .6s infinite" }} />}
        {sabotage === "alarm" && ALARM_PANELS.map((a) => <circle key={a.id} cx={a.x} cy={a.y} r={46} fill="#e23d4f" stroke="#fff" strokeWidth={6} style={{ animation: "imp-blink .6s infinite" }} />)}
        <circle cx={me.x} cy={me.y - 30} r={70} fill="none" stroke="#3fa7d6" strokeWidth={8} opacity={0.6} style={{ transformOrigin: `${me.x}px ${me.y - 30}px`, animation: "imp-blink 1.2s infinite" }} />
        <circle cx={me.x} cy={me.y - 30} r={40} fill="#3fa7d6" stroke="#fff" strokeWidth={8} />
        <text x={me.x} y={me.y - 92} textAnchor="middle" fontSize={44} fontWeight={900} fill="#fff" stroke="#0e1113" strokeWidth={8} paintOrder="stroke">{T.youAreHere}</text>
        </g>
      </svg>
    </div>
  );
}
