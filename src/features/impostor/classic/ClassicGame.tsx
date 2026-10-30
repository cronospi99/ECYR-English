import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import { ui, topics, type Entry } from "../shared/words";
import { randInt, shuffle, range, pickImpostors } from "../shared/random";
import { studentProximity, countWords, band as bandOf, type Lang } from "../shared/proximity";
import { wordPool, type LevelOpt } from "../shared/pool";
import { load, save } from "../shared/storage";
import { Header } from "../shared/Header";
import { Fit } from "../shared/Fit";

type Phase = "setup" | "deal" | "clue" | "discuss" | "vote" | "reveal" | "scores";
type HistoryRow = { round: number; word: string; impostors: number[]; votes: number[]; accused: number | null; caught: boolean };

interface S {
  phase: Phase;
  lang: Lang;
  level: LevelOpt;
  topic: string;
  names: string[];
  impostorCount: number;
  sees: "decoy" | "hint" | "both";
  clueSecs: number;
  discussSecs: number;
  round: number;
  scores: number[];
  used: string[];
  entry: Entry | null;
  impostors: number[];
  prevImpostors: number[];
  history: HistoryRow[];
  dealIndex: number;
  cardShown: boolean;
  words: string[];
  speakOrder: number[];
  voteOrder: number[];
  statOrder: number[];
  votes: number[];
  votingClosed: boolean;
  guessed: boolean;
  timeLeft: number;
  running: boolean;
}

const USED_KEY = "impostor.usedWords";
const loadUsed = () => load<string[]>(USED_KEY, []);
const saveUsed = (list: string[]) => save(USED_KEY, list.slice(-200));

const initial = (lang: Lang): S => ({
  phase: "setup",
  lang,
  level: "B1",
  topic: "All",
  names: range(6).map((i) => "Player " + (i + 1)),
  impostorCount: 1,
  sees: "decoy",
  clueSecs: 90,
  discussSecs: 120,
  round: 0,
  scores: [],
  used: [],
  entry: null,
  impostors: [],
  prevImpostors: [],
  history: [],
  dealIndex: 0,
  cardShown: false,
  words: [],
  speakOrder: [],
  voteOrder: [],
  statOrder: [],
  votes: [],
  votingClosed: false,
  guessed: false,
  timeLeft: 0,
  running: false
});

const ordinal = (n: number, lang: Lang) => {
  if (lang === "es") return n + ".º";
  const s = ["th", "st", "nd", "rd"], v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
};
const fmt = (t: number) => Math.floor(t / 60) + ":" + (t % 60 < 10 ? "0" : "") + (t % 60);

const mono = (size: number, extra: CSSProperties = {}): CSSProperties => ({ font: `700 ${size}px 'Space Mono',monospace`, ...extra });
const black = (size: string, extra: CSSProperties = {}): CSSProperties => ({ font: `400 ${size} 'Archivo Black',sans-serif`, ...extra });

export function ClassicGame({ lang, setLang, onExit }: { lang: Lang; setLang: (l: Lang) => void; onExit: () => void }) {
  const [s, setS] = useState<S>(() => initial(lang));
  const [hist, setHist] = useState<S[]>([]);
  const ref = useRef(s);
  ref.current = s;
  const lastForward = useRef(0);

  useEffect(() => setS((p) => ({ ...p, lang })), [lang]);

  const set = useCallback((patch: Partial<S> | ((s: S) => Partial<S>)) => {
    setS((p) => ({ ...p, ...(typeof patch === "function" ? patch(p) : patch) }));
  }, []);

  /* back-stack: every forward step stores a restorable snapshot; a second
     forward trigger within 450ms is ignored so a double-click can't skip a step */
  const push = useCallback((patch: Partial<S>) => {
    const now = Date.now();
    if (now - lastForward.current < 450) return false;
    lastForward.current = now;
    const cur = ref.current;
    setHist((h) => h.concat([cur]).slice(-40));
    setS({ ...cur, ...patch });
    return true;
  }, []);

  const goBack = useCallback(() => {
    setHist((h) => {
      if (!h.length) return h;
      const prev = h[h.length - 1];
      saveUsed(prev.used);
      setS({ ...prev, lang: ref.current.lang, running: false });
      return h.slice(0, -1);
    });
  }, []);

  const startRound = () => {
    const st = ref.current;
    const pool = wordPool(st.lang, st.level, st.topic);
    let used = st.used.length ? st.used : loadUsed();
    let left = pool.filter((e) => used.indexOf(e[0]) === -1);
    if (!left.length) { left = pool; used = []; }
    const entry = left[randInt(left.length)];
    const nextUsed = used.concat([entry[0]]);
    const n = st.names.length;
    const count = Math.min(st.impostorCount, Math.max(1, n - 2));
    if (push({
      phase: "deal", entry, used: nextUsed,
      impostors: pickImpostors(range(n), count, st.impostors).sort((a, b) => a - b),
      prevImpostors: st.impostors,
      dealIndex: 0, cardShown: false,
      words: range(n).map(() => ""),
      speakOrder: shuffle(range(n)), voteOrder: shuffle(range(n)), statOrder: shuffle(range(n)),
      votes: range(n).map(() => 0),
      votingClosed: false, guessed: false, running: false, timeLeft: 0,
      round: st.round + 1
    })) saveUsed(nextUsed);
  };

  const flipCard = () => push({ cardShown: true });
  const nextCard = () => {
    const st = ref.current;
    const next = st.dealIndex + 1;
    if (next >= st.names.length) push({ phase: "clue", cardShown: false, timeLeft: st.clueSecs, running: true });
    else push({ dealIndex: next, cardShown: false });
  };
  const toDiscuss = () => push({ phase: "discuss", timeLeft: ref.current.discussSecs, running: true });
  const toVote = () => push({ phase: "vote", running: false });
  const closeVoting = () => push({ votingClosed: true });

  const accused = (st: S) => {
    let best = -1, bestN = 0, tie = false;
    st.names.forEach((_, i) => {
      const v = st.votes[i] || 0;
      if (v > bestN) { bestN = v; best = i; tie = false; }
      else if (v === bestN && v > 0 && i !== best) tie = true;
    });
    return { index: tie || bestN === 0 ? null : best, votes: bestN, tie };
  };

  const toReveal = () => {
    const st = ref.current;
    const acc = accused(st);
    const caught = acc.index !== null && st.impostors.indexOf(acc.index) !== -1;
    const scores = st.names.map((_, i) => st.scores[i] || 0);
    st.names.forEach((_, i) => {
      const isImp = st.impostors.indexOf(i) !== -1;
      if (caught && !isImp) scores[i] += 1;
      if (!caught && isImp) scores[i] += 2;
    });
    const history = st.history.concat([{ round: st.round, word: st.entry ? st.entry[0] : "", impostors: st.impostors.slice(), votes: st.votes.slice(), accused: acc.index, caught }]);
    push({ phase: "reveal", scores, history, running: false });
  };

  const advance = () => {
    const st = ref.current;
    if (st.phase === "setup") return startRound();
    if (st.phase === "deal") return st.cardShown ? nextCard() : flipCard();
    if (st.phase === "clue") return toDiscuss();
    if (st.phase === "discuss") return toVote();
    if (st.phase === "vote") return st.votingClosed ? toReveal() : closeVoting();
    return startRound();
  };
  const advanceRef = useRef(advance);
  advanceRef.current = advance;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /input|textarea|button|select|a/i.test(t.tagName)) return;
      if (e.key === "ArrowRight") { e.preventDefault(); advanceRef.current(); }
      if (e.key === "ArrowLeft") { e.preventDefault(); goBack(); }
    };
    window.addEventListener("keydown", onKey);
    const tick = setInterval(() => {
      setS((p) => (p.running && p.timeLeft > 0 ? { ...p, timeLeft: p.timeLeft - 1, running: p.timeLeft - 1 > 0 } : p));
    }, 1000);
    return () => { window.removeEventListener("keydown", onKey); clearInterval(tick); };
  }, [goBack]);

  /* ---- derived values ---- */
  const T = ui[s.lang] || ui.en;
  const e: Entry = s.entry || ["", "", "", ""];
  const phaseNames: Record<Phase, string> = { setup: T.ph.setup, deal: T.ph.deal, clue: T.ph.clue, discuss: T.ph.discuss, vote: s.votingClosed ? T.ph.voteLocked : T.ph.voteOpen, reveal: T.ph.reveal, scores: T.ph.scores };
  const dealIsImp = s.impostors.indexOf(s.dealIndex) !== -1;
  const showDecoy = s.sees === "decoy" || s.sees === "both";
  const showHint = s.sees === "hint" || s.sees === "both";
  const acc = accused(s);
  const caught = acc.index !== null && s.impostors.indexOf(acc.index) !== -1;
  const impNames = s.impostors.map((i) => s.names[i] || "Player " + (i + 1));
  const maxScore = Math.max(1, ...s.names.map((_, i) => s.scores[i] || 0));
  const counts = s.names.map((_, i) => countWords(s.words[i]));
  const totalWords = counts.reduce((a, b) => a + b, 0);
  const voteTotal = s.names.reduce((a, _, i) => a + (s.votes[i] || 0), 0);
  const maxVotes = Math.max(1, ...s.names.map((_, i) => s.votes[i] || 0));
  const ord = (o: number[]) => (o.length === s.names.length ? o : range(s.names.length));
  const curPool = wordPool(s.lang, s.level, s.topic);
  const seen = s.used.length ? s.used : loadUsed();
  const freshCount = curPool.filter((en) => seen.indexOf(en[0]) === -1).length;
  const prox = s.names.map((_, i) => studentProximity(s.words[i], s.entry, s.lang));
  const proxTotal = prox.reduce((a, b) => a + b, 0);
  const proxMax = Math.max(0, ...prox);
  const speak = ord(s.speakOrder);
  const vord = ord(s.voteOrder);
  const topicLabel = s.topic === "All" ? T.allTopics : (T.topics as Record<string, string>)[s.topic];
  const timerColor = s.timeLeft === 0 ? "#f07a1a" : "#f5c518";
  const timerBtn = s.running ? T.pause : T.startTimer;
  const toggleTimer = () => set((p) => ({ running: !p.running, timeLeft: p.timeLeft > 0 ? p.timeLeft : p.phase === "clue" ? p.clueSecs : p.discussSecs }));

  const setNames = (n: number) => set((p) => {
    const names = p.names.slice(0, n);
    while (names.length < n) names.push("Player " + (names.length + 1));
    return { names };
  });
  const setName = (i: number, v: string) => set((p) => { const names = p.names.slice(); names[i] = v; return { names }; });
  const bumpVote = (i: number, d: number) => set((p) => {
    if (p.votingClosed) return {};
    const votes = p.names.map((_, k) => p.votes[k] || 0);
    votes[i] = Math.max(0, votes[i] + d);
    return { votes };
  });
  const toggleGuess = () => set((p) => {
    const scores = p.scores.slice();
    const d = p.guessed ? -1 : 1;
    p.impostors.forEach((i) => { scores[i] = (scores[i] || 0) + d; });
    return { guessed: !p.guessed, scores };
  });
  const resetScores = () => { saveUsed([]); set({ scores: [], round: 0, used: [], history: [], prevImpostors: [] }); };

  const Opts = <V extends string | number>({ list, cur, onPick, cls, style }: { list: { id: V; label: string }[]; cur: V; onPick: (v: V) => void; cls?: string; style?: CSSProperties }) => (
    <div className="row">
      {list.map((o) => (
        <button key={String(o.id)} type="button" className={"opt " + (o.id === cur ? "on" : "off") + (cls ? " " + cls : "")} style={style} onClick={() => onPick(o.id)}>{o.label}</button>
      ))}
    </div>
  );

  return (
    <div className="page">
      <Header
        phase={phaseNames[s.phase]}
        chips={[`${T.jobNo} ${s.round || "—"}`, `${s.lang.toUpperCase()} · ${s.level} · ${topicLabel}`]}
        backLabel={T.back}
        backTitle={T.backTitle}
        onBack={goBack}
        backDisabled={!hist.length}
        actions={[
          { label: T.setup, onClick: () => push({ phase: "setup", running: false }) },
          { label: s.lang === "es" ? "Inicio" : "Home", onClick: onExit }
        ]}
      />
      <Fit>

      {s.phase === "setup" && (
        <div className="stack-sm pad-sm" style={{ flex: 1, padding: "38px 30px 34px", display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(min(380px,100%),1.15fr)", gap: 44, alignItems: "start", maxWidth: 1560 }}>
          <div>
            <div className="kicker" style={{ marginBottom: 16 }}>{T.kicker}</div>
            <h1 className="h1">{T.h1a}<br />{T.h1b}</h1>
            <p className="lead hide-sm">{T.intro1}</p>
            <p className="lead hide-sm" style={{ marginBottom: 28 }}>{T.intro2}</p>
            <div className="plate hide-sm" style={{ maxWidth: "40ch", padding: "20px 22px" }}>
              <div className="lbl lbl-y" style={{ marginBottom: 10 }}>{T.boardTitle}</div>
              <div style={{ fontSize: 17, lineHeight: 1.85, color: "rgba(242,239,230,0.9)" }}>
                {T.board1a} <em style={{ color: "#f5c518", fontStyle: "normal", fontWeight: 700 }}>{T.board1b}</em>{T.board1c}<br />{T.board2}<br />{T.board3}
              </div>
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div>
              <div className="lbl" style={{ marginBottom: 10 }}>{T.language}</div>
              <Opts list={[{ id: "en" as Lang, label: "English" }, { id: "es" as Lang, label: "Español" }]} cur={s.lang} onPick={setLang} />
            </div>
            <div>
              <div className="lbl" style={{ marginBottom: 10 }}>{T.level}</div>
              <Opts list={(["A1", "A2", "B1", "B2", "C1", "Mixed"] as LevelOpt[]).map((id) => ({ id, label: id }))} cur={s.level} onPick={(id) => set({ level: id, used: [] })} />
            </div>
            <div>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
                <div style={{ display: "flex", alignItems: "baseline", flexWrap: "wrap", gap: 10 }}>
                  <span className="lbl">{T.mainTopic} — {curPool.length} {T.inHopper}</span>
                  <span style={mono(11, { letterSpacing: "0.1em", textTransform: "uppercase", color: freshCount === 0 ? "#f07a1a" : freshCount <= 3 ? "#f5c518" : "rgba(242,239,230,0.45)" })}>
                    {freshCount === 0 ? T.hopperAll : freshCount + (freshCount <= 3 ? T.unplayedLeft : T.unplayed)}
                  </span>
                </div>
                <button type="button" className="btn btn-o" style={{ padding: "9px 16px", fontSize: 12, letterSpacing: "0.1em", boxShadow: "0 4px 0 #0e1113", borderRadius: 4 }}
                  onClick={() => { const o = ["All", ...topics].filter((t) => t !== s.topic); set({ topic: o[randInt(o.length)] }); }}>{T.mix}</button>
              </div>
              <Opts list={["All", ...topics].map((id) => ({ id: id as string, label: id === "All" ? T.all : (T.topics as Record<string, string>)[id] }))} cur={s.topic} onPick={(id) => set({ topic: id })} style={{ padding: "10px 15px", font: "700 13px Archivo,sans-serif", letterSpacing: "0.04em" }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 24 }}>
              <div>
                <div className="lbl" style={{ marginBottom: 10 }}>{T.workers}</div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <button type="button" className="sq btn-s" onClick={() => setNames(Math.max(3, s.names.length - 1))}>−</button>
                  <div className="well" style={black("24px", { minWidth: 52, textAlign: "center", padding: "7px 0", color: "#f5c518" })}>{s.names.length}</div>
                  <button type="button" className="sq btn-s" onClick={() => setNames(Math.min(20, s.names.length + 1))}>+</button>
                </div>
              </div>
              <div>
                <div className="lbl" style={{ marginBottom: 10 }}>{T.impostors}</div>
                <Opts list={[{ id: 1, label: "1" }, { id: 2, label: "2" }]} cur={s.impostorCount} onPick={(id) => set({ impostorCount: id })} style={{ padding: "11px 20px" }} />
              </div>
            </div>
            <div>
              <div className="lbl" style={{ marginBottom: 10 }}>{T.sees}</div>
              <Opts list={[{ id: "decoy" as const, label: T.seeDecoy }, { id: "hint" as const, label: T.seeHint }, { id: "both" as const, label: T.seeBoth }]} cur={s.sees} onPick={(id) => set({ sees: id })} style={{ fontWeight: 700, textTransform: "none", letterSpacing: 0 }} />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 24 }}>
              <div>
                <div className="lbl" style={{ marginBottom: 10 }}>{T.clueRound}</div>
                <Opts list={[{ id: 60, label: "1 min" }, { id: 90, label: "1:30" }, { id: 120, label: "2 min" }]} cur={s.clueSecs} onPick={(id) => set({ clueSecs: id })} style={mono(13, { padding: "11px 15px", textTransform: "none", letterSpacing: 0 })} />
              </div>
              <div>
                <div className="lbl" style={{ marginBottom: 10 }}>{T.discussion}</div>
                <Opts list={[{ id: 90, label: "1:30" }, { id: 120, label: "2 min" }, { id: 180, label: "3 min" }]} cur={s.discussSecs} onPick={(id) => set({ discussSecs: id })} style={mono(13, { padding: "11px 15px", textTransform: "none", letterSpacing: 0 })} />
              </div>
            </div>
            <div>
              <div className="lbl" style={{ marginBottom: 10 }}>{T.crew}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(160px,1fr))", gap: 8 }}>
                {s.names.map((n, i) => (
                  <div key={i} className="well" style={{ display: "flex", alignItems: "center", gap: 9, padding: "0 10px" }}>
                    <span style={mono(11, { color: "#f5c518", minWidth: 16 })}>{i + 1}</span>
                    <input type="text" value={n} onChange={(ev) => setName(i, ev.target.value)} placeholder={T.namePh} style={{ flex: 1, minWidth: 0, padding: "10px 0", border: 0, background: "transparent", color: "#f2efe6", fontSize: 16, fontWeight: 600 }} />
                  </div>
                ))}
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 14, paddingTop: 2 }}>
              <button type="button" className="btn btn-y btn-big" onClick={startRound}>{T.issue}</button>
              <span style={mono(11, { letterSpacing: "0.1em", color: "rgba(242,239,230,0.45)" })}>{T.keys}</span>
            </div>
          </div>
        </div>
      )}

      {s.phase === "deal" && (
        <div className="pad-sm" style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 28, padding: "36px 30px 50px", textAlign: "center" }}>
          <div className="kicker" style={{ padding: "6px 14px" }}>{T.card} {s.dealIndex + 1} {T.of} {s.names.length} — {T.lookAway}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            <div style={black("clamp(34px,4vw,52px)", { width: "clamp(64px,7vw,96px)", height: "clamp(64px,7vw,96px)", border: "4px solid #0e1113", borderRadius: 6, background: "#f5c518", display: "flex", alignItems: "center", justifyContent: "center", color: "#0e1113", boxShadow: "0 6px 0 #0e1113" })}>{s.dealIndex + 1}</div>
            <div style={black("clamp(30px,4.2vw,56px)", { textTransform: "uppercase", textShadow: "3px 3px 0 #0e1113" })}>{s.names[s.dealIndex]}</div>
          </div>
          {!s.cardShown ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
              <div style={{ position: "relative", width: "min(760px,86vw)", height: "clamp(180px,26vh,250px)", border: "4px solid #0e1113", borderRadius: 6, backgroundImage: "repeating-linear-gradient(45deg,#3b4349 0 16px,#2b3236 16px 32px)", boxShadow: "0 8px 0 #0e1113", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <span style={mono(13, { padding: "8px 16px", border: "3px solid #0e1113", borderRadius: 3, background: "#1b2023", letterSpacing: "0.2em", textTransform: "uppercase", color: "#f5c518", animation: "imp-blink 2.2s ease-in-out infinite" })}>{T.sealed}</span>
                <Rivets />
              </div>
              <button type="button" className="btn btn-y btn-big" style={{ fontSize: 16 }} onClick={flipCard}>{T.breakSeal}</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 }}>
              <div style={{ position: "relative", width: "min(760px,86vw)", minHeight: "clamp(180px,26vh,250px)", border: "4px solid #0e1113", borderRadius: 6, background: dealIsImp ? "#7d2f16" : "#2b3236", boxShadow: "0 8px 0 #0e1113", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14, padding: "34px 30px 28px", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 11, backgroundSize: "44px 44px", backgroundImage: dealIsImp ? "repeating-linear-gradient(45deg,#f07a1a 0 11px,#0e1113 11px 22px)" : "repeating-linear-gradient(45deg,#f5c518 0 11px,#0e1113 11px 22px)" }} />
                <div style={mono(12, { padding: "5px 12px", border: "3px solid #0e1113", borderRadius: 3, background: dealIsImp ? "#f07a1a" : "#f5c518", letterSpacing: "0.18em", textTransform: "uppercase", color: "#0e1113" })}>{dealIsImp ? T.roleImp : T.roleAll}</div>
                <div style={black("clamp(34px,5.6vw,74px)", { lineHeight: 1.02, textTransform: "uppercase", textShadow: "3px 3px 0 #0e1113" })}>{dealIsImp ? (showDecoy ? e[1] : "?") : e[0]}</div>
                {dealIsImp && showHint && <div style={{ fontSize: "clamp(17px,1.7vw,22px)", fontWeight: 600, color: "rgba(242,239,230,0.8)" }}>{e[2]}</div>}
              </div>
              <button type="button" className="btn btn-y btn-big" style={{ fontSize: 16 }} onClick={nextCard}>{s.dealIndex + 1 >= s.names.length ? T.sealStart : T.sealNext}</button>
            </div>
          )}
        </div>
      )}

      {s.phase === "clue" && (
        <div className="stack-sm pad-sm" style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(min(300px,100%),0.85fr) minmax(min(400px,100%),1.1fr)", gap: 40, padding: "34px 30px", alignItems: "start" }}>
          <div>
            <h2 className="h2">{T.clueH}</h2>
            <p style={{ fontSize: 18, lineHeight: 1.6, color: "rgba(242,239,230,0.72)", maxWidth: "34ch", margin: "0 0 26px", textWrap: "pretty" } as CSSProperties}>{T.clueP}</p>
            <div style={{ display: "inline-block", padding: "14px 26px", border: "4px solid #0e1113", borderRadius: 6, background: "#1b2023", boxShadow: "0 6px 0 #0e1113" }}>
              <div style={black("clamp(56px,8vw,104px)", { lineHeight: 1, color: timerColor, fontVariantNumeric: "tabular-nums" })}>{fmt(s.timeLeft)}</div>
            </div>
            <div className="row" style={{ gap: 10, marginTop: 24 }}>
              <button type="button" className="btn btn-s" onClick={toggleTimer}>{timerBtn}</button>
              <button type="button" className="btn btn-y" onClick={toDiscuss}>{T.openDiscussion}</button>
            </div>
          </div>
          <div className="plate">
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 14, flexWrap: "wrap", marginBottom: 8 }}>
              <div className="lbl lbl-y">{T.logTitle}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div className="tag" style={{ color: "rgba(242,239,230,0.7)", letterSpacing: 0, textTransform: "none" }}>{totalWords} {T.logged}</div>
                <button type="button" className="btn btn-o btn-sm" onClick={() => set((p) => ({ speakOrder: shuffle(range(p.names.length)) }))}>{T.drawOrder}</button>
              </div>
            </div>
            <div style={{ fontSize: 13, color: "rgba(242,239,230,0.5)", marginBottom: 14 }}>{T.firstUp} <em style={{ fontStyle: "normal", fontWeight: 700, color: "#f5c518" }}>{s.names[speak[0]]}</em>{T.typeEach}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
              {speak.map((i, pos) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 10px", border: "3px solid #0e1113", borderRadius: 4, background: pos === 0 ? "#2f373c" : "#20262a" }}>
                  <span style={mono(11, { padding: "2px 6px", borderRadius: 2, minWidth: 32, textAlign: "center", color: pos === 0 ? "#0e1113" : "#f5c518", background: pos === 0 ? "#f5c518" : "transparent" })}>{ordinal(pos + 1, s.lang)}</span>
                  <span style={{ minWidth: 96, fontSize: 16, fontWeight: 700 }}>{s.names[i]}</span>
                  <input type="text" value={s.words[i] || ""} placeholder={T.wordsPh}
                    onChange={(ev) => { const v = ev.target.value; set((p) => ({ words: p.names.map((_, k) => (k === i ? v : p.words[k] || "")) })); }}
                    style={{ flex: 1, minWidth: 0, padding: "11px 0", border: 0, background: "transparent", color: "#f2efe6", fontSize: 16 }} />
                  <span style={mono(13, { minWidth: 26, textAlign: "right", color: counts[i] ? "#f5c518" : "rgba(242,239,230,0.3)" })}>{counts[i]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {s.phase === "discuss" && (
        <div className="stack-sm pad-sm" style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(min(320px,100%),1.1fr) minmax(min(320px,100%),0.75fr)", gap: 40, padding: "34px 30px", alignItems: "center" }}>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 14 }}>
            <div className="kicker">{T.discussion}</div>
            <div style={{ padding: "16px 30px", border: "4px solid #0e1113", borderRadius: 6, background: "#1b2023", boxShadow: "0 7px 0 #0e1113" }}>
              <div style={black("clamp(72px,12vw,180px)", { lineHeight: 0.94, color: timerColor, fontVariantNumeric: "tabular-nums" })}>{fmt(s.timeLeft)}</div>
            </div>
            <p style={{ fontSize: "clamp(18px,1.9vw,25px)", fontWeight: 600, color: "rgba(242,239,230,0.72)", maxWidth: "32ch", margin: "8px 0 0" }}>{T.discussP}</p>
            <div className="row" style={{ gap: 10, marginTop: 10 }}>
              <button type="button" className="btn btn-s" onClick={toggleTimer}>{timerBtn}</button>
              <button type="button" className="btn btn-y" onClick={toVote}>{T.openVote}</button>
            </div>
          </div>
          <div className="plate">
            <div className="lbl lbl-y" style={{ marginBottom: 6 }}>{T.proxTitle}</div>
            <div style={{ fontSize: 13, color: "rgba(242,239,230,0.5)", marginBottom: 14 }}>{T.proxNote}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
              {ord(s.statOrder).map((i) => {
                const pct = proxTotal ? Math.round((prox[i] / proxTotal) * 100) : 0;
                const b = bandOf(prox[i], proxMax);
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                    <span style={{ minWidth: 104, fontSize: 16, fontWeight: 700 }}>{s.names[i]}</span>
                    <span className="bar"><span className={b === "close" ? "fill-y" : b === "warm" ? "fill-o" : "fill-s"} style={{ width: pct + "%" }} /></span>
                    <span style={{ minWidth: 62, font: "700 10px 'Space Mono',monospace", letterSpacing: "0.12em", textTransform: "uppercase", color: b === "close" ? "#f5c518" : b === "warm" ? "#f07a1a" : "rgba(242,239,230,0.4)" }}>{T.bands[b]}</span>
                    <span style={mono(13, { minWidth: 52, textAlign: "right", color: "rgba(242,239,230,0.75)" })}>{pct}%</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {s.phase === "vote" && (
        <div className="pad-sm" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 22, padding: "34px 30px 26px" }}>
          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 24, flexWrap: "wrap" }}>
            <div>
              <h2 className="h2" style={{ fontSize: "clamp(26px,3.2vw,42px)", margin: "0 0 8px" }}>{T.voteH}</h2>
              <p style={{ fontSize: 17, color: "rgba(242,239,230,0.66)", margin: 0 }}>{s.votingClosed ? T.voteHelpLocked : T.voteHelpOpen}</p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={mono(12, { padding: "8px 14px", border: "3px solid #0e1113", borderRadius: 4, background: "#1b2023", letterSpacing: "0.14em", textTransform: "uppercase", color: "#f5c518" })}>{voteTotal} {T.votesCast}</div>
              <div style={mono(12, { padding: "8px 14px", border: "3px solid #0e1113", borderRadius: 4, background: s.votingClosed ? "#b4441f" : "#7bbf5a", letterSpacing: "0.14em", textTransform: "uppercase", color: "#0e1113" })}>{s.votingClosed ? T.locked : T.open}</div>
            </div>
          </div>

          <div className="plate" style={{ padding: "16px 18px" }}>
            <div className="lbl lbl-y" style={{ marginBottom: 12 }}>{T.record}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: "8px 20px" }}>
              {vord.map((i) => (
                <div key={i} style={{ display: "flex", alignItems: "baseline", gap: 10, padding: "6px 0", borderBottom: "2px solid rgba(14,17,19,0.45)" }}>
                  <span style={{ minWidth: 96, fontSize: 15, fontWeight: 700, color: "rgba(242,239,230,0.85)" }}>{s.names[i]}</span>
                  <span style={{ flex: 1, font: "400 15px 'Space Mono',monospace", color: counts[i] ? "#f2efe6" : "rgba(242,239,230,0.32)" }}>
                    {(s.words[i] || "").split(/\s*[,;]\s*/).filter((w) => w.length).join(" · ") || "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {!s.votingClosed ? (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(228px,1fr))", gap: 12 }}>
              {vord.map((i) => {
                const v = s.votes[i] || 0;
                return (
                  <div key={i} style={{ padding: "14px 16px", border: "3px solid #0e1113", borderRadius: 5, background: v > 0 ? "#3f484e" : "#2b3236", boxShadow: "0 5px 0 #0e1113" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                      <span style={mono(11, { color: "#f5c518", minWidth: 16 })}>{i + 1}</span>
                      <input type="text" value={s.names[i]} onChange={(ev) => setName(i, ev.target.value)} placeholder={T.namePh}
                        style={black("20px", { flex: 1, minWidth: 0, padding: "2px 0", border: 0, borderBottom: "2px solid rgba(14,17,19,0.5)", background: "transparent", color: "#f2efe6", textTransform: "uppercase" })} />
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button type="button" className="sq btn-s" style={{ width: 40, height: 40, fontSize: 19 }} onClick={() => bumpVote(i, -1)}>−</button>
                      <div className="well" style={black("22px", { flex: 1, textAlign: "center", padding: "6px 0", color: v > 0 ? "#f5c518" : "rgba(242,239,230,0.35)", fontVariantNumeric: "tabular-nums" })}>{v}</div>
                      <button type="button" className="sq btn-y" style={{ width: 40, height: 40, fontSize: 19 }} onClick={() => bumpVote(i, 1)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="stack-sm" style={{ display: "grid", gridTemplateColumns: "minmax(min(340px,100%),1.2fr) minmax(min(280px,100%),0.7fr)", gap: 32, alignItems: "start" }}>
              <div className="plate" style={{ padding: "22px 24px 24px" }}>
                <div className="lbl lbl-y" style={{ marginBottom: 16 }}>{T.distTitle}</div>
                <div style={{ display: "flex", flexDirection: "column", gap: 11 }}>
                  {s.names.map((n, i) => ({ n, v: s.votes[i] || 0, i })).sort((a, b) => b.v - a.v).map((r) => (
                    <div key={r.i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                      <span style={{ minWidth: 124, fontSize: 18, fontWeight: 700, color: r.i === acc.index ? "#f07a1a" : "rgba(242,239,230,0.9)" }}>{r.n}</span>
                      <span className="bar" style={{ height: 22, border: "3px solid #0e1113" }}>
                        <span className={r.i === acc.index ? "fill-o" : "fill-y"} style={{ width: Math.round((r.v / maxVotes) * 100) + "%" }} />
                      </span>
                      <span style={mono(14, { minWidth: 58, textAlign: "right", color: "rgba(242,239,230,0.8)" })}>{r.v + (voteTotal ? " · " + Math.round((r.v / voteTotal) * 100) + "%" : "")}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="well" style={{ padding: "22px 24px", borderRadius: 5, boxShadow: "0 5px 0 #0e1113" }}>
                <div className="lbl" style={{ marginBottom: 10 }}>{T.accuses}</div>
                <div style={black("clamp(26px,3vw,40px)", { textTransform: "uppercase", lineHeight: 1.04, color: "#f07a1a", marginBottom: 18 })}>{acc.index !== null ? s.names[acc.index] : acc.tie ? T.split : T.noVotes}</div>
                <button type="button" className="btn btn-r btn-big" style={{ width: "100%" }} onClick={toReveal}>{T.hatch}</button>
              </div>
            </div>
          )}

          <div style={{ marginTop: "auto", border: "3px solid #0e1113", borderRadius: 5, background: "#171c1f", boxShadow: "0 5px 0 #0e1113", overflow: "hidden" }}>
            <div className="hazard-static" />
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 18, flexWrap: "wrap", padding: "14px 18px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ width: 13, height: 13, borderRadius: "50%", border: "2px solid #0e1113", background: s.votingClosed ? "#b4441f" : "#7bbf5a", animation: "imp-blink 1.4s ease-in-out infinite" }} />
                <span style={mono(12, { letterSpacing: "0.18em", textTransform: "uppercase", color: "#f5c518" })}>{T.panel}</span>
                <span style={{ fontSize: 14, color: "rgba(242,239,230,0.5)" }}>{s.votingClosed ? T.panelLocked : T.panelOpen}</span>
              </div>
              <div className="row" style={{ gap: 10 }}>
                <button type="button" className="btn btn-s" style={{ padding: "12px 20px", fontSize: 13, borderRadius: 4, boxShadow: "0 4px 0 #0e1113" }} onClick={() => set((p) => ({ voteOrder: shuffle(range(p.names.length)) }))}>{T.shuffleNames}</button>
                <button type="button" className="btn btn-s" style={{ padding: "12px 20px", fontSize: 13, borderRadius: 4, boxShadow: "0 4px 0 #0e1113" }} onClick={() => set((p) => ({ votes: p.names.map(() => 0), votingClosed: false }))}>{T.clearVotes}</button>
                <button type="button" className={"btn " + (s.votingClosed ? "btn-g" : "btn-o")} style={{ padding: "12px 22px", fontSize: 13, borderRadius: 4, boxShadow: "0 4px 0 #0e1113" }} onClick={() => set((p) => ({ votingClosed: !p.votingClosed }))}>{s.votingClosed ? T.reopen : T.closeVoting}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {s.phase === "reveal" && (
        <div className="stack-sm pad-sm" style={{ flex: 1, display: "grid", gridTemplateColumns: "minmax(min(340px,100%),1.15fr) minmax(min(280px,100%),0.72fr)", gap: 36, padding: "34px 30px", alignItems: "center" }}>
          <div>
            <Hatch caught={caught} verdict={caught ? T.caught : T.walked} line={impNames.length > 1 ? impNames.join(" + ") + T.wereImps : impNames[0] + T.wasImp} />
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14, margin: "22px 0 20px" }}>
              <div style={{ padding: "12px 18px", border: "3px solid #0e1113", borderRadius: 4, background: "#20262a" }}>
                <div style={mono(10, { letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(242,239,230,0.5)", marginBottom: 5 })}>{T.theWord}</div>
                <div style={black("clamp(22px,2.4vw,32px)", { textTransform: "uppercase" })}>{e[0]}</div>
              </div>
              <div style={{ padding: "12px 18px", border: "3px solid #0e1113", borderRadius: 4, background: "#2a1a15" }}>
                <div style={mono(10, { letterSpacing: "0.16em", textTransform: "uppercase", color: "rgba(242,239,230,0.5)", marginBottom: 5 })}>{T.theDecoy}</div>
                <div style={black("clamp(22px,2.4vw,32px)", { textTransform: "uppercase", color: "#f0947a" })}>{e[1]}</div>
              </div>
            </div>
            <div className="row" style={{ gap: 10 }}>
              <button type="button" className={"btn " + (s.guessed ? "btn-g" : "btn-s")} style={{ padding: "13px 22px", fontSize: 13, borderRadius: 4, boxShadow: "0 4px 0 #0e1113" }} onClick={toggleGuess}>{s.guessed ? T.guessed : T.guess}</button>
              <button type="button" className="btn btn-y" style={{ padding: "13px 22px", fontSize: 13, borderRadius: 4, boxShadow: "0 4px 0 #0e1113" }} onClick={startRound}>{T.nextJob}</button>
              <button type="button" className="btn btn-s" style={{ padding: "13px 22px", fontSize: 13, borderRadius: 4, boxShadow: "0 4px 0 #0e1113" }} onClick={() => push({ phase: "scores" })}>{T.scoreboard}</button>
            </div>
          </div>
          <div className="plate" style={{ padding: "22px 24px" }}>
            <div className="lbl lbl-y" style={{ marginBottom: 14 }}>{T.thisJob}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
              {s.names.map((n, i) => {
                const isImp = s.impostors.indexOf(i) !== -1;
                let d = 0;
                if (caught && !isImp) d = 1;
                if (!caught && isImp) d = 2;
                if (isImp && s.guessed) d += 1;
                return (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 16, fontSize: 17, fontWeight: 600, color: "rgba(242,239,230,0.85)" }}>
                    <span>{n + (isImp ? T.impTag : "")}</span>
                    <span style={mono(15, { color: d > 0 ? "#f5c518" : "rgba(242,239,230,0.35)" })}>{d > 0 ? "+" + d : "—"}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {s.phase === "scores" && (
        <div className="pad-sm" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 24, padding: "34px 30px" }}>
          <h2 className="h2" style={{ margin: 0 }}>{T.scoreboard}</h2>
          <div style={{ display: "flex", flexDirection: "column", gap: 8, maxWidth: 940 }}>
            {s.names.map((n, i) => ({ n, sc: s.scores[i] || 0, i })).sort((a, b) => b.sc - a.sc).map((r, k) => (
              <div key={r.i} style={{ display: "flex", alignItems: "center", gap: 16, padding: "11px 14px", border: "3px solid #0e1113", borderRadius: 4, background: "#20262a" }}>
                <span style={mono(13, { width: 30, height: 30, border: "3px solid #0e1113", borderRadius: 3, background: "#f5c518", color: "#0e1113", display: "flex", alignItems: "center", justifyContent: "center" })}>{k + 1}</span>
                <span style={black("20px", { minWidth: 120, textTransform: "uppercase" })}>{r.n}</span>
                <span className="bar" style={{ height: 16 }}><span className="fill-y" style={{ width: Math.round((r.sc / maxScore) * 100) + "%", backgroundImage: "repeating-linear-gradient(45deg,#f5c518 0 8px,#d9a800 8px 16px)" }} /></span>
                <span style={black("22px", { minWidth: 46, textAlign: "right", color: "#f5c518", fontVariantNumeric: "tabular-nums" })}>{r.sc}</span>
              </div>
            ))}
          </div>
          <div className="row" style={{ gap: 10 }}>
            <button type="button" className="btn btn-y" style={{ padding: "14px 26px" }} onClick={startRound}>{T.nextJob}</button>
            <button type="button" className="btn btn-s" style={{ padding: "14px 26px" }} onClick={resetScores}>{T.clearScores}</button>
          </div>
        </div>
      )}
      </Fit>
    </div>
  );
}

export function Rivets() {
  return (
    <>
      <span className="rivet" style={{ top: 10, left: 10 }} />
      <span className="rivet" style={{ top: 10, right: 10 }} />
      <span className="rivet" style={{ bottom: 10, left: 10 }} />
      <span className="rivet" style={{ bottom: 10, right: 10 }} />
    </>
  );
}

/* sliding hazard shutters + siren pulse + stamped verdict */
export function Hatch({ caught, verdict, line, children }: { caught: boolean; verdict: string; line: string; children?: React.ReactNode }) {
  return (
    <div style={{ position: "relative", height: "clamp(230px,34vh,320px)", border: "4px solid #0e1113", borderRadius: 6, background: "#1b2023", boxShadow: "0 8px 0 #0e1113", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%,${caught ? "rgba(123,191,90,0.6)" : "rgba(180,68,31,0.75)"} 0%,transparent 62%)`, animation: "imp-sirenPulse 1.1s ease-in-out 3" }} />
      <div style={{ position: "relative", textAlign: "center", padding: "0 22px", animation: "imp-stampIn 0.5s cubic-bezier(.2,1.5,.4,1) 0.85s both" }}>
        {children}
        <div style={mono(12, { display: "inline-block", padding: "5px 12px", marginBottom: 12, border: "3px solid #0e1113", borderRadius: 3, background: caught ? "#7bbf5a" : "#f07a1a", letterSpacing: "0.18em", textTransform: "uppercase", color: "#0e1113" })}>{verdict}</div>
        <div style={black("clamp(28px,4.2vw,58px)", { textTransform: "uppercase", lineHeight: 1.02, textShadow: "4px 4px 0 #0e1113" })}>{line}</div>
      </div>
      <div style={{ position: "absolute", left: 0, right: 0, top: 0, height: "50%", borderBottom: "4px solid #0e1113", backgroundImage: "repeating-linear-gradient(45deg,#f5c518 0 18px,#0e1113 18px 36px)", animation: "imp-shutterUp 0.85s cubic-bezier(.7,0,.3,1) 0.35s both" }} />
      <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, height: "50%", borderTop: "4px solid #0e1113", backgroundImage: "repeating-linear-gradient(45deg,#f5c518 0 18px,#0e1113 18px 36px)", animation: "imp-shutterDown 0.85s cubic-bezier(.7,0,.3,1) 0.35s both" }} />
    </div>
  );
}
