/* Phrasal Verb Roulette — the screens (set-up, wheel, card, scoreboard, podium).
   Plain React over the values the engine computes each frame (see engine.ts). */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { Fragment } from 'react';
import { Front, Host } from './Front';

export function View({ v }: { v: any }) {
  return (
    <>
    <div style={{ position: "fixed", inset: "0", background: "#05060f", overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: "1920px", height: "1080px", flex: "0 0 auto", fontFamily: "'Fredoka',sans-serif", color: "#fff", position: "relative", overflow: "hidden", transform: `scale(${v.scale})`, transformOrigin: "center center", background: v.t.sky }}>
        {v.deco.map((d: any, dI: number) => (<Fragment key={dI}>
          <div style={{ position: "absolute", left: "0", right: "0", pointerEvents: "none", backgroundRepeat: "repeat", top: `${d.top}px`, height: `${d.h}px`, backgroundSize: d.size, backgroundImage: d.img, animation: d.anim, opacity: d.op }}>
          </div>
        </Fragment>))}
        <div style={{ position: "absolute", left: "0", right: "0", bottom: "0", height: "84px", borderTop: `8px solid ${v.t.groundEdge}`, backgroundImage: `repeating-linear-gradient(90deg,${v.t.ground} 0 78px,${v.t.ground2} 78px 84px), repeating-linear-gradient(0deg,${v.t.ground} 0 38px,${v.t.ground2} 38px 44px)` }}>
        </div>
        <div style={{ position: "absolute", left: "26px", bottom: "16px", zIndex: "90", display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "10px" }}>
          {v.audioOpen ? (<>
            <div style={{ width: "430px", border: "6px solid #000", boxShadow: "9px 9px 0 rgba(0,0,0,.45)", padding: "20px", display: "flex", flexDirection: "column", gap: "16px", animation: "pv-rise .25s ease-out", background: v.t.panel }}>
              <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "13px", color: v.t.accent }}>
                {"🔊 SOUND EFFECTS"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button className="pv-press" onClick={v.toggleSfx} style={{ flex: "0 0 150px", fontFamily: "'Press Start 2P',monospace", fontSize: "10px", padding: "12px 8px", border: "4px solid #000", boxShadow: "0 4px 0 #000", background: v.sfxBtnBg, color: v.sfxBtnInk }}>
                  {v.sfxBtnLabel}
                </button>
                <input type="range" min="0" max="100" value={v.sfxVol} onChange={v.onSfxVol} style={{ flex: "1", accentColor: v.t.accent, height: "28px" }} />
                <span style={{ flex: "0 0 46px", textAlign: "right", fontFamily: "'Press Start 2P',monospace", fontSize: "10px", color: v.t.text }}>
                  {v.sfxVol}
                </span>
              </div>
              <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "13px", color: v.t.accent }}>
                {"🎵 MUSIC"}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button className="pv-press" onClick={v.toggleMusic} style={{ flex: "0 0 150px", fontFamily: "'Press Start 2P',monospace", fontSize: "10px", padding: "12px 8px", border: "4px solid #000", boxShadow: "0 4px 0 #000", background: v.musicBtnBg, color: v.musicBtnInk }}>
                  {v.musicBtnLabel}
                </button>
                <input type="range" min="0" max="100" value={v.musicVol} onChange={v.onMusicVol} style={{ flex: "1", accentColor: v.t.accent, height: "28px" }} />
                <span style={{ flex: "0 0 46px", textAlign: "right", fontFamily: "'Press Start 2P',monospace", fontSize: "10px", color: v.t.text }}>
                  {v.musicVol}
                </span>
              </div>
            </div>
          </>) : null}
          <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
            <button className="pv-press" onClick={v.toGames} title="Back to the Games menu" style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "11px", padding: "13px 14px", border: "5px solid #000", boxShadow: "0 5px 0 #000", display: "flex", alignItems: "center", gap: "8px", background: v.t.panel, color: v.t.accent }}>
              {"< GAMES"}
            </button>
            <button className="pv-press" onClick={v.toggleAudioPanel} style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "11px", padding: "13px 16px", border: "5px solid #000", boxShadow: "0 5px 0 #000", display: "flex", alignItems: "center", gap: "10px", background: v.t.panel, color: v.t.accent }}>
              <span style={{ fontSize: "20px" }}>
                {v.audioIcon}
              </span>
              {v.audioBtnLabel}
            </button>
            <button className="pv-press" onClick={v.toFull} title="Full screen" style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "11px", padding: "13px 14px", border: "5px solid #000", boxShadow: "0 5px 0 #000", display: "flex", alignItems: "center", gap: "8px", background: v.t.panel, color: v.t.accent }}>
              {"FULL"}
            </button>
            <button className="pv-press" onClick={v.toFront} title="Title screen" style={{ display: v.titleBtn, fontFamily: "'Press Start 2P',monospace", fontSize: "11px", padding: "13px 14px", border: "5px solid #000", boxShadow: "0 5px 0 #000", alignItems: "center", gap: "8px", background: v.t.panel, color: v.t.accent }}>
              {"TITLE"}
            </button>
          </div>
        </div>
        {v.popShown ? (<>
          <div style={{ position: "absolute", left: "50%", top: "46%", zIndex: "60", pointerEvents: "none", fontFamily: "'Press Start 2P',monospace", fontSize: "74px", animation: "pv-floatUp 1.1s ease-out forwards", color: v.popColor, textShadow: "6px 6px 0 #000" }}>
            {v.popText}
          </div>
        </>) : null}
        {v.isFront ? <Front v={v} /> : null}
        {v.isFront ? null : <Host v={v} />}
        {v.isMenu ? (<>
          <div style={{ position: "relative", height: "100%", padding: "26px 40px 100px", display: "flex", flexDirection: "column" }}>
            <div style={{ textAlign: "center", marginBottom: "22px" }}>
              <div style={{ display: "inline-block", position: "relative", overflow: "hidden", background: "#171a52", border: "6px solid #E5258C", outline: "5px solid #000", padding: "16px 40px", boxShadow: "10px 10px 0 rgba(0,0,0,.45)", animation: "pv-floaty 5s ease-in-out infinite" }}>
                <h1 className="pvr-glow" style={{ margin: "0", fontFamily: "'Press Start 2P',monospace", fontSize: "38px", lineHeight: "1.35", letterSpacing: "1px", color: v.t.accent, textShadow: `5px 5px 0 ${v.t.titleShadow}` }}>
                  {"PHRASAL VERB ROULETTE"}
                </h1>
                <div style={{ position: "absolute", top: "0", bottom: "0", left: "0", width: "70px", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.5),transparent)", animation: "pv-sheen 4.5s ease-in-out infinite" }}>
                </div>
              </div>
              <p style={{ margin: "14px 0 0", fontSize: "20px", fontWeight: "600", color: v.t.subInk }}>
                {"Spin the wheel · get a phrasal verb · build your own example sentence · win coins"}
              </p>
            </div>
            <div style={{ flex: "1", minHeight: "0", display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gridTemplateRows: "minmax(0,1fr)", gap: "24px", alignItems: "stretch" }}>
              <div style={{ background: v.t.panel, border: "6px solid #000", boxShadow: "9px 9px 0 rgba(0,0,0,.4)", padding: "24px", overflowY: "auto" }}>
                <h2 style={{ margin: "0 0 6px", fontFamily: "'Press Start 2P',monospace", fontSize: "17px", color: v.t.accent }}>
                  {"1 · LEVELS"}
                </h2>
                <p style={{ margin: "0 0 16px", fontSize: "16px", color: v.t.muted }}>
                  {"487 phrasal verbs, graded by CEFR level of usage."}
                </p>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  {v.levelChips.map((lv: any, lvI: number) => (<Fragment key={lvI}>
                    <button className="pv-press" onClick={lv.onClick} style={{ fontSize: "15px", padding: "14px 10px", border: "5px solid #000", boxShadow: "0 6px 0 #000", display: "flex", flexDirection: "column", alignItems: "center", gap: "6px", background: lv.bg, color: lv.fg }}>
                      <span>
                        {lv.id}
                      </span>
                      <span style={{ fontFamily: "'Fredoka',sans-serif", fontSize: "13px", fontWeight: "600", opacity: ".85" }}>
                        {lv.count}{" verbs"}
                      </span>
                    </button>
                  </Fragment>))}
                </div>
                <div style={{ display: "flex", gap: "10px", marginTop: "14px" }}>
                  <button className="pv-press" onClick={v.selectAllLevels} style={{ flex: "1", fontSize: "11px", padding: "12px 8px", border: "4px solid #000", boxShadow: "0 5px 0 #000", background: v.t.good, color: "#fff" }}>
                    {"ALL"}
                  </button>
                  <button className="pv-press" onClick={v.clearLevels} style={{ flex: "1", fontSize: "11px", padding: "12px 8px", border: "4px solid #000", boxShadow: "0 5px 0 #000", background: v.t.alt, color: "#fff" }}>
                    {"CLEAR"}
                  </button>
                </div>
                <h2 style={{ margin: "26px 0 12px", fontFamily: "'Press Start 2P',monospace", fontSize: "17px", color: v.t.accent }}>
                  {"2 · GRAPHIC STYLE"}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "8px" }}>
                  {v.themeChips.map((th: any, thI: number) => (<Fragment key={thI}>
                    <button className="pv-press" onClick={th.onClick} style={{ fontSize: "11px", padding: "12px 8px", border: "5px solid #000", boxShadow: "0 6px 0 #000", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", background: th.bg, color: th.fg }}>
                      <span style={{ width: "100%", height: "26px", border: "3px solid #000", background: th.swatch }}>
                      </span>
                      <span>
                        {th.label}
                      </span>
                    </button>
                  </Fragment>))}
                </div>
              </div>
              <div style={{ background: v.t.panel, border: "6px solid #000", boxShadow: "9px 9px 0 rgba(0,0,0,.4)", padding: "24px", overflowY: "auto" }}>
                <h2 style={{ margin: "0 0 6px", fontFamily: "'Press Start 2P',monospace", fontSize: "17px", color: v.t.accent }}>
                  {"3 · ROUNDS"}
                </h2>
                <p style={{ margin: "0 0 14px", fontSize: "16px", color: v.t.muted }}>
                  {"Drag the bar: "}{v.rounds}{" round(s) in this game."}
                </p>
                <div onPointerDown={v.onRoundsDown} onPointerMove={v.onRoundsMove} onPointerUp={v.onRoundsUp} onPointerLeave={v.onRoundsUp} style={{ display: "flex", gap: "2px", padding: "7px", background: "#000", border: "5px solid #000", cursor: "ew-resize", touchAction: "none" }}>
                  {v.roundBlocks.map((b: any, bI: number) => (<Fragment key={bI}>
                    <div style={{ flex: "1", height: "44px", border: "2px solid rgba(0,0,0,.6)", background: b.bg, transition: "background .12s" }}>
                    </div>
                  </Fragment>))}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: "8px", fontFamily: "'Press Start 2P',monospace", fontSize: "11px", color: v.t.muted }}>
                  <span>
                    {"1"}
                  </span>
                  <span style={{ color: v.t.accent, fontSize: "16px" }}>
                    {v.rounds}{" ROUNDS"}
                  </span>
                  <span>
                    {"100"}
                  </span>
                </div>
                <h2 style={{ margin: "26px 0 12px", fontFamily: "'Press Start 2P',monospace", fontSize: "17px", color: v.t.accent }}>
                  {"4 · AIDS PER PLAYER"}
                </h2>
                <div style={{ display: "flex", gap: "8px" }}>
                  {v.aidChips.map((a: any, aI: number) => (<Fragment key={aI}>
                    <button className="pv-press" onClick={a.onClick} style={{ flex: "1", fontSize: "14px", padding: "14px 6px", border: "5px solid #000", boxShadow: "0 6px 0 #000", background: a.bg, color: a.fg }}>
                      {a.label}
                    </button>
                  </Fragment>))}
                </div>
                <h2 style={{ margin: "26px 0 12px", fontFamily: "'Press Start 2P',monospace", fontSize: "17px", color: v.t.accent }}>
                  {"5 · PENALTY FOR A WRONG ANSWER"}
                </h2>
                <div style={{ display: "flex", gap: "8px" }}>
                  {v.penaltyChips.map((p: any, pI: number) => (<Fragment key={pI}>
                    <button className="pv-press" onClick={p.onClick} style={{ flex: "1", fontSize: "14px", padding: "14px 6px", border: "5px solid #000", boxShadow: "0 6px 0 #000", background: p.bg, color: p.fg }}>
                      {p.label}
                    </button>
                  </Fragment>))}
                </div>
                <p style={{ margin: "9px 0 0", fontSize: "13px", color: v.t.muted }}>
                  {"Coins lost on a wrong answer. Boosted questions (x2 / x3) scale the penalty too, on top of any wager."}
                </p>
                <h2 style={{ margin: "26px 0 12px", fontFamily: "'Press Start 2P',monospace", fontSize: "17px", color: v.t.accent }}>
                  {"6 · GAME RULES"}
                </h2>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {v.toggles.map((g: any, gI: number) => (<Fragment key={gI}>
                    <button className="pv-press" onClick={g.onClick} style={{ display: "flex", alignItems: "center", gap: "12px", textAlign: "left", fontSize: "12px", padding: "14px", border: "5px solid #000", boxShadow: "0 6px 0 #000", background: g.bg, color: "#fff" }}>
                      <span style={{ fontSize: "20px" }}>
                        {g.icon}
                      </span>
                      <span style={{ flex: "1", lineHeight: "1.7" }}>
                        {g.label}
                      </span>
                      <span style={{ fontSize: "14px", color: g.stateColor }}>
                        {g.state}
                      </span>
                    </button>
                  </Fragment>))}
                </div>
              </div>
              <div style={{ background: v.t.panel, border: "6px solid #000", boxShadow: "9px 9px 0 rgba(0,0,0,.4)", padding: "24px", display: "flex", flexDirection: "column", minHeight: "0", overflow: "hidden" }}>
                <h2 style={{ margin: "0 0 12px", fontFamily: "'Press Start 2P',monospace", fontSize: "17px", color: v.t.accent }}>
                  {"7 · TEAM MATCH"}
                </h2>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "8px" }}>
                  {v.teamChips.map((tc: any, tcI: number) => (<Fragment key={tcI}>
                    <button className="pv-press" onClick={tc.onClick} style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "10px", padding: "14px 4px", border: "5px solid #000", boxShadow: "0 6px 0 #000", background: tc.bg, color: tc.fg }}>
                      {tc.label}
                    </button>
                  </Fragment>))}
                </div>
                <p style={{ margin: "9px 0 0", fontSize: "13px", color: v.t.muted }}>
                  {"Players are split round-robin; tap a player's team badge below to move them. Turns alternate between teams and coins add to the team total."}
                </p>
                <h2 style={{ margin: "26px 0 6px", fontFamily: "'Press Start 2P',monospace", fontSize: "17px", color: v.t.accent }}>
                  {"8 · REAL-WORLD PRIZE"}
                </h2>
                <p style={{ margin: "0 0 14px", fontSize: "16px", color: v.t.muted }}>
                  {"What the winner actually gets. Shown on the scoreboard and on the podium."}
                </p>
                <input data-prize="1" value={v.prizeInput} onChange={v.onPrizeChange} placeholder="e.g. No homework this weekend" style={{ width: "100%", boxSizing: "border-box", fontSize: "19px", fontWeight: "600", padding: "14px", border: "5px solid #000", background: "#fff", color: "#111", outline: "none" }} />
                <h2 style={{ margin: "26px 0 6px", fontFamily: "'Press Start 2P',monospace", fontSize: "17px", color: v.t.accent }}>
                  {"9 · PLAYERS"}
                </h2>
                <p style={{ margin: "0 0 14px", fontSize: "16px", color: v.t.muted }}>
                  {"Type a name and press Enter. Minimum 2."}
                </p>
                <div style={{ display: "flex", gap: "10px" }}>
                  <input value={v.nameInput} onChange={v.onNameChange} onKeyDown={v.onNameKey} placeholder="Student name…" style={{ flex: "1", fontSize: "19px", fontWeight: "600", padding: "14px", border: "5px solid #000", background: "#fff", color: "#111", outline: "none" }} />
                  <button className="pv-press" onClick={v.addStudent} style={{ fontSize: "13px", padding: "14px 16px", border: "5px solid #000", boxShadow: "0 6px 0 #000", background: v.t.accent, color: v.t.accentInk }}>
                    {"ADD"}
                  </button>
                </div>
                <div style={{ flex: "1 1 0", minHeight: "90px", marginTop: "16px", display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", paddingRight: "6px" }}>
                  {v.students.map((st: any, stI: number) => (<Fragment key={stI}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", border: "4px solid #000", padding: "10px 12px", background: v.t.panel2 }}>
                      <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "11px", minWidth: "26px", color: v.t.accent }}>
                        {st.num}
                      </span>
                      <span style={{ flex: "1", fontSize: "19px", fontWeight: "600" }}>
                        {st.name}
                      </span>
                      <button onClick={st.cycleTeam} style={{ display: st.teamDisplay, fontFamily: "'Press Start 2P',monospace", fontSize: "10px", padding: "9px 10px", border: "3px solid #000", background: st.teamColor, color: "#000" }}>
                        {st.teamLabel}
                      </button>
                      <button onClick={st.remove} style={{ fontSize: "10px", padding: "8px 10px", border: "3px solid #000", background: v.t.bad, color: "#fff" }}>
                        {"X"}
                      </button>
                    </div>
                  </Fragment>))}
                </div>
                <button className="pv-press" onClick={v.startGame} disabled={v.cantStart} style={{ flex: "0 0 auto", marginTop: "16px", width: "100%", fontSize: "22px", padding: "22px", border: "6px solid #000", boxShadow: "0 9px 0 #000", letterSpacing: "1px", background: v.startBg, color: v.t.accentInk }}>
                  {"▶ START GAME"}
                </button>
                <p style={{ margin: "10px 0 0", textAlign: "center", fontSize: "15px", color: v.t.muted }}>
                  {v.startHint}
                </p>
              </div>
            </div>
          </div>
        </>) : null}
        {v.isGame ? (<>
          <div style={{ position: "relative", height: "100%", padding: "20px 32px 96px", display: "grid", gridTemplateColumns: "1fr 372px", gap: "24px", alignItems: "start" }}>
            <div style={{ minHeight: "0" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "14px", background: "#000", border: `5px solid ${v.t.accent}`, padding: "11px 16px", marginBottom: "12px" }}>
                <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "15px", color: v.t.accent }}>
                  {"ROUND "}{v.roundLabel}
                </span>
                <div style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <button className="pv-press" onClick={v.decRound} disabled={v.decRoundOff} style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "13px", width: "38px", padding: "9px 0", border: "4px solid #000", boxShadow: "0 4px 0 #000", background: v.decRoundBg, color: "#fff" }}>
                    {"-"}
                  </button>
                  <button className="pv-press" onClick={v.incRound} disabled={v.incRoundOff} style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "13px", width: "38px", padding: "9px 0", border: "4px solid #000", boxShadow: "0 4px 0 #000", background: v.incRoundBg, color: "#fff" }}>
                    {"+"}
                  </button>
                </div>
                <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "12px", color: v.t.muted }}>
                  {v.levelsLabel}
                </span>
                <span style={{ flex: "1" }}>
                </span>
                <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "10px", color: v.t.muted }}>
                  {v.turnCaption}
                </span>
                <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "19px", maxWidth: "400px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: v.t.accent }}>
                  {v.currentName}
                </span>
                <span style={{ flex: "1" }}>
                </span>
                {v.hasPrize ? (<>
                  <span style={{ display: "inline-flex", alignItems: "center", gap: "8px", border: "4px solid #000", padding: "7px 12px", background: v.t.accent, maxWidth: "340px", overflow: "hidden" }}>
                    <span style={{ fontSize: "15px" }}>
                      {"🏆"}
                    </span>
                    <span style={{ fontSize: "15px", fontWeight: "700", whiteSpace: "nowrap", textOverflow: "ellipsis", overflow: "hidden", color: v.t.accentInk }}>
                      {v.prizeText}
                    </span>
                  </span>
                </>) : null}
                <button className="pv-press" onClick={v.endMatch} style={{ fontSize: "11px", padding: "10px 12px", border: "4px solid #000", background: v.t.accent, color: v.t.accentInk }}>
                  {"END MATCH"}
                </button>
                <button className="pv-press" onClick={v.quitGame} style={{ fontSize: "11px", padding: "10px 12px", border: "4px solid #000", background: v.t.bad, color: "#fff" }}>
                  {"MENU"}
                </button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "480px 1fr", gap: "24px", alignItems: "start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <div className={`pvr-wheel${v.spinning ? ' spinning' : ''}${v.spinDisabled ? '' : ' ready'}`} style={{ position: "relative", width: "480px", height: "480px", animation: v.wheelAnim }}>
                    <div className="pvr-halo" />
                    {Array.from({ length: 24 }, (_, i) => <i key={i} className="pvr-bulb" style={{ left: `${50 + 52.5 * Math.sin((i * Math.PI) / 12)}%`, top: `${50 - 52.5 * Math.cos((i * Math.PI) / 12)}%`, animationDelay: `${-(i % 3) * 0.2}s` }} />)}
                    <div className="pvr-ptr" style={{ position: "absolute", left: "50%", top: "-6px", transform: "translateX(-50%)", zIndex: "5", width: "0", height: "0", borderLeft: "24px solid transparent", borderRight: "24px solid transparent", borderTop: `48px solid ${v.t.bad}`, filter: "drop-shadow(0 4px 0 #000)" }}>
                    </div>
                    <div style={{ position: "absolute", inset: "0", borderRadius: "50%", background: "#000", boxShadow: "0 12px 0 rgba(0,0,0,.4)" }}>
                    </div>
                    <div style={{ position: "absolute", inset: "9px", borderRadius: "50%", overflow: "hidden", transform: `rotate(${v.rot}deg)`, transition: "transform 4.6s cubic-bezier(.16,.86,.24,1)" }}>
                      <svg viewBox="0 0 620 620" style={{ width: "100%", height: "100%", display: "block" }}>
                        {v.segments.map((sg: any, sgI: number) => (<Fragment key={sgI}>
                          <path d={sg.d} fill={sg.fill} stroke="#000" strokeWidth="4" />
                        </Fragment>))}
                      </svg>
                      {v.segments.map((sg: any, sgI: number) => (<Fragment key={sgI}>
                        <div style={{ position: "absolute", whiteSpace: "nowrap", fontFamily: "'Fredoka',sans-serif", fontWeight: "700", fontSize: "19px", color: "#fff", textShadow: "2px 2px 0 #000, -2px 2px 0 #000, 2px -2px 0 #000, -2px -2px 0 #000, 0 3px 0 #000", left: `${sg.lx}%`, top: `${sg.ly}%`, transform: `translate(-50%,-50%) rotate(${sg.lrot}deg)` }}>
                          {sg.label}
                        </div>
                      </Fragment>))}
                      {v.segments.map((sg: any, sgI: number) => (<Fragment key={sgI}>
                        {sg.bonus ? (<>
                          <div style={{ position: "absolute", width: "46px", height: "46px", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "22px", borderRadius: "50%", border: "4px solid #000", background: "#FBD000", boxShadow: "0 0 0 4px rgba(255,255,255,.55)", left: `${sg.bx}%`, top: `${sg.by}%`, transform: "translate(-50%,-50%)" }}>
                            {"🧰"}
                          </div>
                        </>) : null}
                      </Fragment>))}
                    </div>
                    <div style={{ position: "absolute", left: "50%", top: "50%", transform: "translate(-50%,-50%)", width: "104px", height: "104px", borderRadius: "50%", border: "8px solid #000", display: "flex", alignItems: "center", justifyContent: "center", zIndex: "4", boxShadow: "inset 0 -8px 0 rgba(0,0,0,.2)", background: v.t.accent }}>
                      <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "30px", color: v.t.titleShadow, animation: v.hubAnim }}>
                        {"★"}
                      </span>
                    </div>
                  </div>
                  <button className={`pv-press${v.spinDisabled ? '' : ' pvr-go'}`} onClick={v.spin} disabled={v.spinDisabled} style={{ marginTop: "18px", fontSize: "24px", padding: "22px 56px", border: "6px solid #000", boxShadow: "0 10px 0 #000", letterSpacing: "2px", background: v.spinBg, color: v.t.accentInk }}>
                    {v.spinLabel}
                  </button>
                  <div style={{ marginTop: "18px", width: "480px", border: "6px solid #000", boxShadow: "0 8px 0 rgba(0,0,0,.4)", background: v.t.panel, padding: "16px" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "16px" }}>
                      <span style={{ fontSize: "40px" }}>
                        {"⏱"}
                      </span>
                      <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "64px", lineHeight: "1", color: v.timerColor }}>
                        {v.timeLabel}
                      </span>
                    </div>
                    <div style={{ height: "16px", border: "4px solid #000", marginTop: "14px", background: "rgba(0,0,0,.45)" }}>
                      <div style={{ height: "100%", transition: "width .95s linear", background: v.timerColor, width: `${v.timePct}%` }}>
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: "10px", marginTop: "14px" }}>
                      <button className="pv-press" onClick={v.toggleTimer} disabled={v.noCard} style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "15px", padding: "18px 8px", border: "5px solid #000", boxShadow: "0 6px 0 #000", background: v.toggleTimerBg, color: "#fff" }}>
                        {v.toggleTimerLabel}
                      </button>
                      <button className="pv-press" onClick={v.addTime} disabled={v.noCard} style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "13px", padding: "18px 8px", border: "5px solid #000", boxShadow: "0 6px 0 #000", background: v.addTimeBg, color: "#fff" }}>
                        {v.addTimeLabel}
                      </button>
                    </div>
                  </div>
                </div>
                <div style={{ height: "846px", minHeight: "0", display: "flex", flexDirection: "column" }}>
                  {v.hasCard ? (<>
                    <div style={{ flex: "1", minHeight: "0", display: "flex", flexDirection: "column", border: "6px solid #000", boxShadow: "9px 9px 0 rgba(0,0,0,.4)", animation: "pv-popIn .42s ease-out", background: v.t.card }}>
                      <div style={{ flex: "1", minHeight: "0", overflowY: "auto", padding: "18px 18px 4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "16px" }}>
                          <span style={{ fontSize: "64px" }}>
                            {v.cardEmoji}
                          </span>
                          <div style={{ flex: "1", minWidth: "0" }}>
                            <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "12px", opacity: ".65", color: v.t.cardInk }}>
                              {v.cardFamily}{" FAMILY"}
                            </div>
                            <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "44px", marginTop: "12px", lineHeight: "1.3", textWrap: "balance", color: v.cardColor, textShadow: "3px 3px 0 rgba(0,0,0,.18)" }}>
                              {v.cardPv}
                            </div>
                          </div>
                          <div style={{ display: "flex", flexDirection: "column", gap: "7px", alignItems: "flex-end" }}>
                            <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "13px", border: "4px solid #000", padding: "8px 10px", background: v.cardColor, color: "#fff" }}>
                              {v.cardLevel}
                            </span>
                            {v.hasMult ? (<>
                              <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "14px", border: "4px solid #000", padding: "8px 10px", background: v.multBg, color: "#000", animation: "pv-coinSpin 2.6s ease-in-out infinite" }}>
                                {v.multLabel}
                              </span>
                            </>) : null}
                          </div>
                        </div>
                        <div style={{ border: "4px solid #000", padding: "16px", marginBottom: "12px", background: v.t.taskBg }}>
                          <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "10px", marginBottom: "10px", color: v.t.taskInk }}>
                            {"YOUR TASK"}
                          </div>
                          <div style={{ fontSize: "23px", fontWeight: "600", lineHeight: "1.45", color: v.t.cardInk }}>
                            {"Say an original example sentence using "}
                            <b style={{ color: v.cardColor }}>
                              {v.cardPv}
                            </b>
                            {"."}
                          </div>
                        </div>
                        {v.hasTense ? (<>
                          <div style={{ display: "flex", alignItems: "center", gap: "18px", border: "4px solid #000", padding: "18px 20px", marginBottom: "12px", animation: "pv-rise .32s ease-out", background: v.t.panel2 }}>
                            <span style={{ fontSize: "46px", animation: "pv-coinSpin 3.2s ease-in-out infinite" }}>
                              {"🎲"}
                            </span>
                            <div style={{ flex: "1" }}>
                              <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "12px", marginBottom: "10px", color: v.t.muted }}>
                                {"GRAMMAR CHALLENGE"}
                              </div>
                              <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "24px", lineHeight: "1.4", color: v.t.accent }}>
                                {v.tenseName}
                              </div>
                              <div style={{ fontSize: "26px", fontWeight: "700", marginTop: "10px", color: v.t.text }}>
                                {v.tenseHint}
                              </div>
                            </div>
                          </div>
                        </>) : null}
                        {v.hasExtra ? (<>
                          <div style={{ display: "flex", gap: "10px", marginBottom: "12px" }}>
                            {v.hasSubject ? (<>
                              <div style={{ flex: "0 0 232px", border: "4px solid #000", padding: "13px 15px", animation: "pv-rise .32s ease-out", background: v.t.taskBg }}>
                                <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "10px", marginBottom: "9px", color: v.t.taskInk }}>
                                  {"SUBJECT USED"}
                                </div>
                                <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "18px", lineHeight: "1.4", color: v.t.cardInk }}>
                                  {v.subjectLabel}
                                </div>
                              </div>
                            </>) : null}
                            {v.hasContext ? (<>
                              <div style={{ flex: "1", minWidth: "0", border: "4px solid #000", padding: "13px 15px", animation: "pv-rise .32s ease-out", background: v.t.defBg }}>
                                <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "10px", marginBottom: "9px", color: v.t.taskInk }}>
                                  {"SITUATION"}
                                </div>
                                <div style={{ fontSize: "20px", fontWeight: "700", lineHeight: "1.4", color: v.t.defInk }}>
                                  {v.contextLabel}
                                </div>
                              </div>
                            </>) : null}
                          </div>
                        </>) : null}
                        {v.wagerOn ? (<>
                          <div style={{ display: "flex", alignItems: "center", gap: "9px", border: "4px solid #000", padding: "9px 11px", marginBottom: "10px", background: v.t.panel }}>
                            <span style={{ fontSize: "19px" }}>
                              {"🎯"}
                            </span>
                            <div style={{ display: "flex", gap: "6px", flex: "1" }}>
                              {v.wagerOpts.map((w: any, wI: number) => (<Fragment key={wI}>
                                <button className="pv-press" onClick={w.onClick} disabled={w.off} style={{ flex: "1", fontSize: "11px", padding: "11px 2px", border: "4px solid #000", boxShadow: "0 4px 0 #000", background: w.bg, color: w.fg }}>
                                  {w.label}
                                </button>
                              </Fragment>))}
                            </div>
                            <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "11px", whiteSpace: "nowrap", color: v.t.accent }}>
                              {v.wagerNote}
                            </span>
                          </div>
                        </>) : null}
                        {v.aidsOn ? (<>
                          <div style={{ display: "flex", alignItems: "center", gap: "9px", border: "4px solid #000", padding: "9px 11px", marginBottom: "10px", background: v.t.panel }}>
                            <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "11px", whiteSpace: "nowrap", color: v.t.accent }}>
                              {"🧰 "}{v.aidsLeft}
                            </span>
                            {v.aidGain ? (<>
                              <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "9px", lineHeight: "1.7", whiteSpace: "nowrap", padding: "7px 9px", border: "3px solid #000", animation: "pv-rise .3s ease-out", background: v.t.good, color: "#fff" }}>
                                {"🧰 LUCKY!"}
                                <br />
                                {"+1 HELP"}
                              </span>
                            </>) : null}
                            <div style={{ display: "flex", gap: "6px", flex: "1" }}>
                              {v.aids.map((a: any, aI: number) => (<Fragment key={aI}>
                                <button className="pv-press" onClick={a.onClick} disabled={a.off} style={{ flex: "1", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", fontSize: "8px", lineHeight: "1.4", padding: "8px 2px", border: "4px solid #000", boxShadow: "0 4px 0 #000", background: a.bg, color: "#fff" }}>
                                  <span style={{ fontSize: "17px" }}>
                                    {a.icon}
                                  </span>
                                  <span>
                                    {a.short}
                                  </span>
                                </button>
                              </Fragment>))}
                            </div>
                          </div>
                        </>) : null}
                        {v.defHidden ? (<>
                          <button className="pv-press" onClick={v.revealDef} style={{ width: "100%", fontSize: "13px", padding: "17px", border: "5px solid #000", boxShadow: "0 6px 0 #000", background: v.t.alt, color: "#fff" }}>
                            {"👁 REVEAL DEFINITION"}
                          </button>
                        </>) : null}
                        {v.defShown ? (<>
                          <div style={{ border: "4px solid #000", padding: "16px", animation: "pv-rise .3s ease-out", background: v.t.defBg }}>
                            <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "10px", marginBottom: "10px", color: v.t.defInk, opacity: ".7" }}>
                              {"DEFINITION"}
                            </div>
                            <div style={{ fontSize: "23px", fontWeight: "600", lineHeight: "1.4", color: v.t.defInk }}>
                              {v.cardDef}
                            </div>
                          </div>
                        </>) : null}
                        {v.conjShown ? (<>
                          <div style={{ marginTop: "12px", border: "4px solid #000", padding: "14px 16px", animation: "pv-rise .3s ease-out", background: v.t.defBg }}>
                            <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "10px", marginBottom: "12px", color: v.t.defInk, opacity: ".7" }}>
                              {"CONJUGATION"}
                            </div>
                            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
                              {v.conjForms.map((c: any, cI: number) => (<Fragment key={cI}>
                                <div style={{ border: "3px solid #000", padding: "11px 12px", background: "rgba(0,0,0,.06)" }}>
                                  <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "8px", lineHeight: "1.7", marginBottom: "7px", color: v.t.defInk, opacity: ".6" }}>
                                    {c.label}
                                  </div>
                                  <div style={{ fontSize: "21px", fontWeight: "700", color: v.t.defInk }}>
                                    {c.form}
                                  </div>
                                </div>
                              </Fragment>))}
                            </div>
                          </div>
                        </>) : null}
                        {v.teacherHelp ? (<>
                          <div style={{ marginTop: "12px", border: "4px solid #000", padding: "14px 16px", animation: "pv-rise .3s ease-out", background: v.t.alt, color: "#fff" }}>
                            <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "10px", lineHeight: "1.9" }}>
                              {"🙋 TEACHER HELP — TIMER PAUSED"}
                            </div>
                            <div style={{ marginTop: "9px", fontSize: "19px", fontWeight: "600" }}>
                              {"The teacher gives one clue or builds the sentence together. Restart the timer when the student is ready."}
                            </div>
                          </div>
                        </>) : null}
                        <div style={{ marginTop: "12px", display: "flex", flexDirection: "column", gap: "10px" }}>
                          <button className="pv-press" onClick={v.toggleEs} style={{ alignSelf: "flex-start", fontSize: "11px", padding: "12px 14px", border: "4px solid #000", boxShadow: "0 5px 0 #000", background: v.t.good, color: "#fff" }}>
                            {v.esLabel}
                          </button>
                          {v.esShown ? (<>
                            <div style={{ border: "4px solid #000", padding: "14px 16px", fontSize: "21px", fontWeight: "600", background: v.t.defBg, color: v.t.defInk }}>
                              {"🇪🇸 "}{v.cardEs}
                            </div>
                          </>) : null}
                        </div>
                        {v.exShown ? (<>
                          <div style={{ marginTop: "12px", border: "4px dashed #000", padding: "15px", fontSize: "20px", background: v.t.taskBg, color: v.t.cardInk }}>
                            {"Model: "}
                            <i>
                              {v.cardEx}
                            </i>
                          </div>
                        </>) : null}
                      </div>
                      {v.wasPassed ? (<>
                        <div style={{ flex: "0 0 auto", margin: "0 14px", border: "4px solid #000", padding: "11px 14px", fontFamily: "'Press Start 2P',monospace", fontSize: "10px", lineHeight: "1.9", background: v.t.titleShadow, color: "#fff" }}>
                          {v.passNote}
                        </div>
                      </>) : null}
                      <div style={{ flex: "0 0 auto", display: "grid", gridTemplateColumns: "1.35fr 1.35fr 1fr 1fr", gap: "8px", padding: "11px 14px 14px", borderTop: "5px solid #000" }}>
                        <button className="pv-press" onClick={v.markCorrect} style={{ minHeight: "60px", fontSize: "13px", lineHeight: "1.6", padding: "8px 6px", border: "5px solid #000", boxShadow: "0 6px 0 #000", background: v.t.good, color: "#fff" }}>
                          {"✔ CORRECT "}{v.pointsLabel}
                        </button>
                        <button className="pv-press" onClick={v.markWrong} style={{ minHeight: "60px", fontSize: "13px", lineHeight: "1.6", padding: "8px 6px", border: "5px solid #000", boxShadow: "0 6px 0 #000", background: v.t.bad, color: "#fff" }}>
                          {"✘ "}{v.wrongLabel}
                        </button>
                        <button className="pv-press" onClick={v.passTurn} disabled={v.passDisabled} style={{ minHeight: "60px", fontSize: "10px", lineHeight: "1.7", padding: "8px 4px", border: "5px solid #000", boxShadow: "0 6px 0 #000", background: v.passBg, color: "#fff" }}>
                          {"🔀 PASS"}
                          <br />
                          {"RANDOM"}
                        </button>
                        <button className="pv-press" onClick={v.showModel} style={{ minHeight: "60px", fontSize: "10px", lineHeight: "1.7", padding: "8px 4px", border: "5px solid #000", boxShadow: "0 6px 0 #000", background: v.t.alt, color: "#fff" }}>
                          {"📖 MODEL"}
                          <br />
                          {"SENTENCE"}
                        </button>
                      </div>
                    </div>
                  </>) : null}
                  {v.noCard ? (<>
                    <div style={{ flex: "1", minHeight: "0", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", border: "5px dashed #fff", padding: "40px 28px", textAlign: "center", background: "rgba(0,0,0,.35)" }}>
                      <div style={{ fontSize: "150px", marginBottom: "34px", animation: v.spinning ? "pv-shake .35s steps(4) infinite" : "pv-floaty 2.4s ease-in-out infinite" }}>
                        {"🎰"}
                      </div>
                      <div className="pvr-idle-msg" style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "30px", lineHeight: "1.8", color: "#fff", whiteSpace: "pre-line", textShadow: "4px 4px 0 rgba(0,0,0,.35)" }}>
                        {v.idleMessage}
                      </div>
                    </div>
                  </>) : null}
                </div>
              </div>
            </div>
            <div style={{ border: "6px solid #000", boxShadow: "9px 9px 0 rgba(0,0,0,.4)", padding: "18px", height: "964px", display: "flex", flexDirection: "column", background: v.t.panel }}>
              <h2 style={{ margin: "0 0 4px", fontFamily: "'Press Start 2P',monospace", fontSize: "16px", color: v.t.accent }}>
                {"🏆 LEADERBOARD"}
              </h2>
              <p style={{ margin: "0 0 14px", fontSize: "14px", color: v.t.muted }}>
                {v.boardNote}
              </p>
              {v.teamBoard.map((tm: any, tmI: number) => (<Fragment key={tmI}>
                <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", marginBottom: "8px", border: "4px solid #000", background: tm.bg }}>
                  <span style={{ width: "16px", height: "16px", border: "3px solid #000", background: tm.color }}>
                  </span>
                  <div style={{ flex: "1", minWidth: "0" }}>
                    <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "11px", color: "#fff" }}>
                      {tm.name}
                    </div>
                    <div style={{ fontSize: "12px", marginTop: "5px", color: v.t.muted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {tm.members}
                    </div>
                  </div>
                  <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "16px", color: v.t.accent }}>
                    {tm.score}
                  </span>
                </div>
              </Fragment>))}
              <div style={{ flex: "1", minHeight: "0", display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", paddingRight: "4px" }}>
                {v.board.map((p: any, pI: number) => (<Fragment key={pI}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "11px 12px", border: "4px solid #000", transition: "transform .25s", background: p.bg, transform: `scale(${p.scale})` }}>
                    <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "13px", minWidth: "32px", color: p.rankColor }}>
                      {p.rank}
                    </span>
                    <div style={{ flex: "1", minWidth: "0" }}>
                      <div style={{ fontSize: "18px", fontWeight: "600", color: p.nameColor, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.name}
                      </div>
                      <div style={{ fontSize: "13px", marginTop: "3px", color: p.aidColor }}>
                        {p.aidDots}
                      </div>
                    </div>
                    <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "15px", color: v.t.accent }}>
                      {p.score}
                    </span>
                  </div>
                </Fragment>))}
              </div>
              <div style={{ marginTop: "12px", paddingTop: "12px", borderTop: "4px dashed rgba(255,255,255,.22)", display: "flex", gap: "8px" }}>
                <input value={v.joinInput} onChange={v.onJoinChange} onKeyDown={v.onJoinKey} placeholder="Late arrival…" style={{ flex: "1", minWidth: "0", fontSize: "15px", fontWeight: "600", padding: "10px", border: "4px solid #000", background: v.t.panel2, color: "#fff", outline: "none" }} />
                <button className="pv-press" onClick={v.joinStudent} disabled={v.joinDisabled} style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "10px", padding: "10px 12px", border: "4px solid #000", boxShadow: "0 5px 0 #000", background: v.t.good, color: "#fff" }}>
                  {"JOIN"}
                </button>
              </div>
            </div>
          </div>
        </>) : null}
        {v.isPodium ? (<>
          <div style={{ position: "relative", height: "100%", padding: "26px 40px 96px", textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center" }}>
            <div style={{ display: "inline-block", background: "#000", padding: "16px 44px", animation: "pv-glowPulse 2s ease-in-out infinite", border: `6px solid ${v.t.accent}` }}>
              <h1 style={{ margin: "0", fontFamily: "'Press Start 2P',monospace", fontSize: "36px", color: v.t.accent, textShadow: `5px 5px 0 ${v.t.titleShadow}` }}>
                {"GAME OVER"}
              </h1>
            </div>
            <p style={{ margin: "16px 0 22px", fontSize: "25px", fontWeight: "600", color: v.t.subInk }}>
              {v.winnerLine}
            </p>
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "center", gap: "20px", marginBottom: "24px" }}>
              {v.podium.map((p: any, pI: number) => (<Fragment key={pI}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", width: "236px" }}>
                  <div style={{ fontSize: "48px", marginBottom: "8px", animation: "pv-coinSpin 2.4s ease-in-out infinite" }}>
                    {p.medal}
                  </div>
                  <div style={{ fontSize: "24px", fontWeight: "700", marginBottom: "10px", color: v.t.subInk }}>
                    {p.name}
                  </div>
                  <div style={{ width: "100%", border: "6px solid #000", boxShadow: "0 8px 0 rgba(0,0,0,.35)", display: "flex", alignItems: "center", justifyContent: "center", height: `${p.h}px`, background: p.color }}>
                    <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "24px", color: "#000" }}>
                      {p.score}
                    </span>
                  </div>
                </div>
              </Fragment>))}
            </div>
            <div style={{ width: "620px", border: "6px solid #000", padding: "18px", textAlign: "left", display: "flex", flexDirection: "column", minHeight: "0", flex: "1", background: v.t.panel }}>
              <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "13px", marginBottom: "12px", color: v.t.accent }}>
                {"FINAL SCORES"}
              </div>
              <div style={{ flex: "1", minHeight: "0", display: "flex", flexDirection: "column", gap: "8px", overflowY: "auto", paddingRight: "4px" }}>
                {v.board.map((p: any, pI: number) => (<Fragment key={pI}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", border: "4px solid #000", background: p.bg }}>
                    <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "12px", minWidth: "32px", color: p.rankColor }}>
                      {p.rank}
                    </span>
                    <span style={{ flex: "1", fontSize: "19px", fontWeight: "600", color: p.nameColor }}>
                      {p.name}
                    </span>
                    <span style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "14px", color: v.t.accent }}>
                      {p.score}
                    </span>
                  </div>
                </Fragment>))}
              </div>
            </div>
            <div style={{ display: "flex", gap: "14px", justifyContent: "center", marginTop: "18px" }}>
              <button className="pv-press" onClick={v.revealPrize} style={{ fontSize: "17px", padding: "20px 30px", border: "6px solid #000", boxShadow: "0 8px 0 #000", background: v.t.accent, color: v.t.accentInk }}>
                {"🏆 REVEAL THE PRIZE ▶"}
              </button>
            </div>
            <div style={{ position: "absolute", inset: "0", zIndex: "80", background: "#000", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "34px", textAlign: "center", padding: "60px", transition: "opacity 1.5s ease", opacity: v.endOpacity, pointerEvents: v.endPointer }}>
              {v.endShowPrize ? (<>
                <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "22px", letterSpacing: "2px", color: "#9aa0b5", animation: "pv-rise .6s ease-out" }}>
                  {"THE WINNER IS"}
                </div>
                <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "64px", lineHeight: "1.3", color: v.t.accent, textShadow: `6px 6px 0 ${v.t.titleShadow}`, animation: "pv-rise .8s ease-out" }}>
                  {v.winnerName}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "18px", animation: "pv-rise 1.2s ease-out" }}>
                  <div style={{ fontFamily: "'Press Start 2P',monospace", fontSize: "18px", color: "#fff" }}>
                    {"🏆 AND WINS"}
                  </div>
                  <div style={{ maxWidth: "1300px", fontSize: "56px", fontWeight: "700", lineHeight: "1.2", color: "#fff", textWrap: "balance" }}>
                    {v.finalPrize}
                  </div>
                </div>
                <div style={{ display: "flex", gap: "20px", marginTop: "30px", animation: "pv-rise 1.6s ease-out" }}>
                  <button className="pv-press" onClick={v.playAgain} style={{ fontSize: "19px", padding: "22px 34px", border: "6px solid #fff", boxShadow: "0 8px 0 #444", background: v.t.accent, color: v.t.accentInk }}>
                    {"🔁 NEW MATCH"}
                  </button>
                  <button className="pv-press" onClick={v.quitGame} style={{ fontSize: "19px", padding: "22px 34px", border: "6px solid #fff", boxShadow: "0 8px 0 #444", background: v.t.alt, color: "#fff" }}>
                    {"🏠 MAIN MENU"}
                  </button>
                </div>
              </>) : null}
            </div>
          </div>
        </>) : null}
      </div>
    </div>
    </>
  );
}
