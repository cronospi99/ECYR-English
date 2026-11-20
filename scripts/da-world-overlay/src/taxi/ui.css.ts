/** Taxi Rush — the retro arcade look of every screen (injected once). */
export const TAXI_CSS = /* css */ `
@import url('https://fonts.googleapis.com/css2?family=Bungee&family=Bungee+Shade&family=Racing+Sans+One&family=Russo+One&family=Rubik:wght@500;700;900&display=swap');
.tx { position: fixed; inset: 0; z-index: 60; pointer-events: none; font-family: 'Rubik', system-ui, sans-serif; color: #fff; user-select: none; -webkit-user-select: none; }
.tx * { box-sizing: border-box; }
.tx button { pointer-events: auto; font-family: inherit; cursor: pointer; }
.tx .big { font-family: 'Bungee', 'Rubik', sans-serif; letter-spacing: .02em; }
.tx .outline { -webkit-text-stroke: 3px #10131a; paint-order: stroke fill; text-shadow: 0 5px 0 #10131a; }

/* ---------- setup (one screen, no scroll) ---------- */
.tx-setup { position: absolute; inset: 0; height: 100dvh; pointer-events: auto; overflow: hidden; touch-action: none; overscroll-behavior: none; background:
  radial-gradient(90% 70% at 70% 10%, rgba(255,210,26,.28), transparent 60%),
  radial-gradient(60% 60% at 10% 90%, rgba(232,56,79,.18), transparent 70%),
  repeating-linear-gradient(115deg, rgba(255,255,255,.025) 0 2px, transparent 2px 9px),
  linear-gradient(180deg, #17181c, #0b0b0d); }
.tx-setup::after { content: ''; position: absolute; left: 0; right: 0; top: 0; height: 8px; background: repeating-linear-gradient(135deg, #ffd21a 0 18px, #0b0b0c 18px 36px); z-index: 2; pointer-events: none; }
.tx-wrap { position: relative; height: 100%; max-width: 1180px; margin: 0 auto; display: grid; gap: clamp(6px, 1.6dvh, 16px) clamp(10px, 2.4vw, 28px);
  padding: calc(14px + env(safe-area-inset-top)) calc(clamp(10px, 2.4vw, 28px) + env(safe-area-inset-right)) calc(10px + env(safe-area-inset-bottom)) calc(clamp(10px, 2.4vw, 28px) + env(safe-area-inset-left));
  grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); grid-template-rows: auto minmax(0, 1fr) auto;
  grid-template-areas: "view logo" "view opts" "view go"; }
@media (orientation: portrait) { .tx-wrap { grid-template-columns: minmax(0, 1fr); grid-template-rows: auto 35dvh minmax(0, 1fr) auto; grid-template-areas: "logo" "view" "opts" "go"; max-width: 640px; } }
.tx-logo { grid-area: logo; display: flex; align-items: center; justify-content: center; min-height: 0; }
.tx-logo .tr-logo { margin: 0 0 0 clamp(20px, 6vw, 44px); gap: 4px; filter: drop-shadow(0 6px 0 rgba(0,0,0,.35)); }
.tx-logo .tr-taxi { font-size: clamp(34px, 10dvh, 84px); -webkit-text-stroke-width: 2px; text-shadow: 3px 3px 0 #0b0b0c, 6px 6px 0 #e8384f; }
.tx-logo .tr-rush { font-size: clamp(18px, 5dvh, 44px); border-width: 3px; box-shadow: 4px 4px 0 #0b0b0c; }
.tx-logo .tr-flag { height: clamp(6px, 1.6dvh, 12px); background-size: 10px 10px; }
.tx-logo .tr-tag { display: none; }
.tx-view { grid-area: view; min-height: 0; display: flex; }
.tx-view .tx-card { flex: 1; min-height: 0; display: flex; padding: 6px; }
.tx-opts-main { grid-area: opts; min-height: 0; display: flex; flex-direction: column; justify-content: center; gap: clamp(4px, 1.2dvh, 12px); }
.tx-bottom { grid-area: go; display: flex; flex-direction: column; gap: 6px; }
.tx-card { background: #10131a; border: 4px solid #ffd21f; border-radius: 18px; padding: 16px 18px; box-shadow: 6px 6px 0 #e8384f; }
.tx-row { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; align-items: center; }
.tx-lbl { width: 100%; font-weight: 900; font-size: 12px; letter-spacing: .16em; text-transform: uppercase; color: #9fb3d9; }
.tx-chip { min-width: 44px; min-height: 44px; border: 3px solid #2b3550; background: #1b2235; color: #fff; border-radius: 12px; padding: 6px 13px; font-weight: 900; font-size: 15px; touch-action: manipulation; }
.tx-chip.on { border-color: #ffd21f; background: #ffd21f; color: #10131a; }
.tx-sw { width: 44px; height: 44px; border-radius: 50%; border: 3px solid #2b3550; padding: 0; touch-action: manipulation; }
.tx-sw.on { border-color: #fff; box-shadow: 0 0 0 3px #ffd21f; transform: scale(1.08); }
.tx-preview { position: relative; flex: 1; min-height: 0; border-radius: 12px; overflow: hidden; background: radial-gradient(circle at 50% 70%, #3a4a6b, #141a29 70%); }
.tx-preview canvas { width: 100% !important; height: 100% !important; display: block; }
.tx-go { width: 100%; min-height: 52px; border: 0; border-radius: 16px; padding: 8px; font: 400 clamp(22px, 3.4vw, 32px) 'Bungee', sans-serif; color: #10131a; background: linear-gradient(#ffe34f, #ffb800); box-shadow: 0 6px 0 #b37400, 0 10px 20px rgba(0,0,0,.4); transform: skewX(-6deg); animation: txPulse 1.2s ease-in-out infinite; touch-action: manipulation; }
.tx-go:active { transform: skewX(-6deg) translateY(4px); box-shadow: 0 2px 0 #b37400; }
.tx-back { min-height: 44px; border: 3px solid #fff; background: rgba(16,19,26,.6); color: #fff; border-radius: 12px; padding: 6px 14px; font-weight: 900; touch-action: manipulation; }
.tx-btns { display: flex; gap: 8px; flex-wrap: wrap; }
.tx-btns .tx-chip { flex: 1 1 auto; }
.tx-note { font-size: 13px; color: #c9d6f2; line-height: 1.4; }
.tx-room { padding: 8px 12px; border-radius: 12px; background: #1b2235; font-weight: 700; font-size: 13px; text-align: center; }
.tx-cust { position: absolute; inset: 0; z-index: 5; display: grid; place-items: center; background: rgba(5,10,25,.8); padding: calc(10px + env(safe-area-inset-top)) 10px calc(10px + env(safe-area-inset-bottom)); }
.tx-cust .tx-card { position: relative; width: min(96vw, 860px); max-height: 100%; overflow-y: auto; padding: 12px 16px 14px; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 22px; align-content: start; overscroll-behavior: contain; }
.tx-cust h2 { grid-column: 1 / -1; margin: 0; padding-right: 54px; font: 400 20px 'Bungee', sans-serif; color: #ffd21f; transform: skewX(-6deg); }
.tx-cust .tx-note { grid-column: 1 / -1; }
.tx-cust-x { position: absolute; right: 10px; top: 8px; width: 46px; height: 46px; border: 3px solid #fff; border-radius: 12px; background: #e8384f; color: #fff; font: 900 20px 'Rubik'; z-index: 1; }
@media (max-height: 500px) and (orientation: landscape) { .tx-row.sws { gap: 2px; flex-wrap: nowrap; } .tx-row.sws .tx-lbl { display: none; } .tx-logo { padding-bottom: 8px; } .tx-logo .tr-taxi { font-size: 7.5dvh; } .tx-logo .tr-rush { font-size: 4dvh; } .tx-logo .tr-flag { height: 5px; } .tx-sw { flex: 0 0 44px; } .tx-cust .tx-note { display: none; } .tx-cust .tx-card { padding: 8px 14px 10px; gap: 4px 20px; } .tx-cust h2 { font-size: 17px; } .tx-cust-x { top: 4px; } .tx-cust .tx-lbl { font-size: 11px; } }
@media (orientation: portrait) { .tx-cust .tx-card { grid-template-columns: 1fr; } }
@keyframes txPulse { 50% { filter: brightness(1.12); transform: skewX(-6deg) scale(1.02); } }

/* ---------- HUD (docs/taxi-arte-v2.md, section C) ---------- */
.tx-hud { position: absolute; inset: 0; --m: 24px; font-family: 'Russo One', 'Rubik', sans-serif; }
.tx-hud .tx-k, .tx-hud .tx-dn, .tx-hud .tx-fare, .tx-hud .tx-prog, .tx-time, .tx-earn, .tx-gpsl { -webkit-text-stroke: 3px #0b0b0c; paint-order: stroke fill; text-shadow: 3px 3px 0 #0b0b0c; }
.tx-tl { position: absolute; left: calc(var(--m) + env(safe-area-inset-left)); top: var(--m); display: flex; align-items: center; gap: 14px; max-width: calc(50% - 140px); transform: skewX(-8deg); transform-origin: left top; }
.tx-arrow { flex: 0 0 auto; width: 96px; height: 96px; transition: transform .15s linear; animation: txArrowPulse .67s ease-in-out infinite; }
.tx-arrow svg { width: 100%; height: 100%; display: block; overflow: visible; padding: 8px; }
.tx-arrow path { fill: #ff3fa4; stroke: #0b0b0c; stroke-width: 6; stroke-linejoin: round; }
.tx-arrow.pick path { fill: #ffd21a; }
@keyframes txArrowPulse { 50% { scale: 1.06; } }
.tx-info { min-width: 0; }
.tx-k { font-size: 14px; letter-spacing: .12em; color: #ffd21a; }
.tx-dn { font-size: 32px; line-height: 1.05; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tx-fare { font-size: 22px; color: #ffd21a; white-space: nowrap; }
.tx-prog { font-size: 14px; color: #fff; margin-top: 2px; }
.tx-tc { position: absolute; left: 50%; top: var(--m); width: 220px; height: 150px; transform: translateX(-50%); border: 4px solid #0b0b0c; border-radius: 10px; box-shadow: 0 0 0 2px #ffd21a, 4px 4px 0 2px #0b0b0c; background: #2b4a6b; overflow: hidden; }
.tx-tc canvas { width: 100%; height: 100%; display: block; }
.tx-tr { position: absolute; right: calc(var(--m) + env(safe-area-inset-right)); top: var(--m); width: 40%; max-width: 540px; text-align: right; transform: skewX(-8deg); transform-origin: right top; }
.tx-time { position: relative; display: inline-block; font-size: 36px; line-height: 1; color: #ffd21a; font-variant-numeric: tabular-nums; }
.tx-time.idle { color: #fff; }
.tx-time.hot { color: #e8384f; animation: txBlink 1s steps(1) infinite; }
.tx-bonus { position: absolute; right: 100%; margin-right: 10px; top: 0; font-style: normal; color: #3ddc84; opacity: 0; }
.tx-bonus.go { animation: txBonus 1.1s ease-out both; }
@keyframes txBonus { 0% { opacity: 1; transform: translateY(8px) scale(1.3); } 70% { opacity: 1; } 100% { opacity: 0; transform: translateY(-14px); } }
.tx-earn { font-size: 22px; color: #fff; margin-top: 2px; }
.tx-earn b { display: inline-block; color: #3ddc84; font-weight: 400; font-variant-numeric: tabular-nums; }
.tx-earn b.pop { animation: txEarnPop .35s ease-out; }
@keyframes txEarnPop { 40% { transform: scale(1.15); } }
.tx-gps { margin-top: 8px; pointer-events: auto; cursor: pointer; touch-action: none; }
.tx-gpsl { font: 400 34px/1.05 'Russo One', 'Bungee', sans-serif; color: #ffd21a; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; text-transform: uppercase; }
.tx-gps.on .tx-gpsl, .tx-gps.on .tx-gpss { animation: txGpsIn .2s ease-out; }
.tx-gpss { margin-top: 4px; font: 400 20px/1.1 'Russo One', 'Rubik', sans-serif; color: #fff; -webkit-text-stroke: 2px #0b0b0c; paint-order: stroke fill; text-shadow: 2px 2px 0 #0b0b0c; }
.tx-gpss:empty { display: none; }
@keyframes txGpsIn { from { transform: translateX(24px); opacity: 0; } }
@keyframes txBlink { 50% { opacity: .35; } }
.tx-call { position: absolute; left: 50%; top: 30%; transform: translate(-50%, -50%); font-size: clamp(26px, 5vw, 64px); color: #fff; white-space: nowrap; animation: txCall 1.4s cubic-bezier(.2,1.4,.4,1) both; transform-origin: center; }
@keyframes txCall { 0% { opacity: 0; transform: translate(-50%, -50%) scale(.3) rotate(-8deg); } 18% { opacity: 1; transform: translate(-50%, -50%) scale(1.15) rotate(-4deg); } 30% { transform: translate(-50%, -50%) scale(1) rotate(-4deg); } 80% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -70%) scale(1) rotate(-4deg); } }
.tx-speed { position: absolute; right: calc(var(--m) + env(safe-area-inset-right)); bottom: 18px; text-align: right; transform: skewX(-8deg); }
.tx-speed .n { font-size: clamp(36px, 5vw, 60px); line-height: 1; color: #fff; }
.tx-speed .u { font: 900 13px 'Rubik'; letter-spacing: .2em; text-shadow: 0 2px 0 #10131a; }
.tx-boost { width: 160px; height: 14px; margin: 6px 0 0 auto; border: 3px solid #10131a; border-radius: 8px; background: #2b3550; overflow: hidden; }
.tx-boost i { display: block; height: 100%; background: linear-gradient(90deg, #ff8a1f, #ffd21f); }
.tx-bubble { position: absolute; left: 0; top: 0; z-index: 1; max-width: 260px; margin-top: -12px; padding: 8px 14px; border: 3px solid #0b0b0c; border-radius: 14px; background: #fff; color: #10131a; font: 800 20px/1.2 'Rubik', sans-serif; text-align: center; pointer-events: none; will-change: transform; }
.tx-bubble::after { content: ''; position: absolute; left: 50%; bottom: -14px; margin-left: -9px; border: 9px solid transparent; border-top: 11px solid #0b0b0c; border-bottom: 0; }
.tx-bubble::before { content: ''; position: absolute; left: 50%; bottom: -9px; margin-left: -6px; border: 6px solid transparent; border-top: 8px solid #fff; border-bottom: 0; z-index: 1; }
.tx-home { position: absolute; left: calc(var(--m) + env(safe-area-inset-left)); bottom: 18px; pointer-events: auto; min-height: 44px; border: 3px solid #fff; background: rgba(16,19,26,.7); color: #fff; border-radius: 12px; padding: 8px 12px; font-weight: 900; font-size: 14px; }
.tx-mates { position: absolute; left: calc(var(--m) + env(safe-area-inset-left)); bottom: 74px; display: flex; flex-direction: column; gap: 4px; align-items: flex-start; font-weight: 800; font-size: 13px; }
.tx-mates span { background: rgba(16,19,26,.72); border-radius: 8px; padding: 4px 8px; }
.tx-combo { position: absolute; left: calc(var(--m) + env(safe-area-inset-left)); top: 150px; text-align: left; transition: opacity .3s; opacity: 0; pointer-events: none; transform: skewX(-8deg); transform-origin: left top; }
.tx-combo .t { font-size: clamp(20px, 2.4vw, 30px); color: #fff4b0; }
.tx-combo .c { font: 900 15px 'Rubik', sans-serif; letter-spacing: .1em; color: #fff; text-shadow: 0 2px 0 #10131a; }
.tx-combo .c b { font-size: clamp(30px, 4vw, 48px); color: #ffd21f; margin-right: 6px; }
.tx-combo.pop { animation: txComboPop .35s cubic-bezier(.2,1.6,.4,1); }
@keyframes txComboPop { from { transform: skewX(-8deg) scale(1.35); } to { transform: skewX(-8deg) scale(1); } }

/* phones, landscape (and any short screen): the compact HUD */
@media (max-height: 520px), (max-width: 900px) {
  .tx-hud { --m: 12px; }
  .tx-tl { gap: 8px; max-width: calc(50% - 90px); top: calc(var(--m) + env(safe-area-inset-top)); }
  .tx-arrow { width: 64px; height: 64px; }
  .tx-k { font-size: 11px; }
  .tx-dn { font-size: 18px; -webkit-text-stroke-width: 2px; text-shadow: 2px 2px 0 #0b0b0c; }
  .tx-fare { font-size: 14px; -webkit-text-stroke-width: 2px; text-shadow: 2px 2px 0 #0b0b0c; }
  .tx-prog { font-size: 12px; -webkit-text-stroke-width: 2px; }
  .tx-tc { width: 140px; height: 96px; border-width: 3px; top: calc(var(--m) + env(safe-area-inset-top)); }
  .tx-tr { top: calc(var(--m) + env(safe-area-inset-top)); width: 41%; }
  .tx-time { font-size: 24px; -webkit-text-stroke-width: 2px; text-shadow: 2px 2px 0 #0b0b0c; }
  .tx-earn { font-size: 16px; -webkit-text-stroke-width: 2px; text-shadow: 2px 2px 0 #0b0b0c; }
  .tx-gps { margin-top: 4px; }
  .tx-gpsl { font-size: 21px; -webkit-text-stroke-width: 2px; text-shadow: 2px 2px 0 #0b0b0c; }
  .tx-gpss { font-size: 14px; -webkit-text-stroke-width: 1.5px; }
  .tx-bubble { font-size: 15px; max-width: 180px; padding: 6px 10px; }
  .tx-combo { top: 96px; }
  .tx-speed { bottom: calc(10px + env(safe-area-inset-bottom)); }
}
@media (max-height: 340px) { .tx-gpss { display: none; } }
/* phones held upright: the same blocks, smaller still */
@media (orientation: portrait) and (max-width: 700px) {
  .tx-tl { max-width: calc(50% - 60px); }
  .tx-arrow { width: 44px; height: 44px; }
  .tx-dn { font-size: 14px; } .tx-fare { font-size: 11px; } .tx-prog { display: none; }
  .tx-tc { width: 100px; height: 70px; }
  .tx-tr { width: 42%; } .tx-time { font-size: 18px; } .tx-earn { font-size: 13px; } .tx-gpsl { font-size: 17px; } .tx-gpss { display: none; }
}

html.tx-touchmode, html.tx-touchmode body { overflow: hidden; overscroll-behavior: none; touch-action: none; -webkit-user-select: none; user-select: none; }
html.tx-touchmode canvas { touch-action: none; }
/* touch: Crazy Taxi style, arrows left, D / R right */
.tx-touch { position: absolute; inset: 0; pointer-events: none; touch-action: none; }
.tx-pad { position: absolute; bottom: calc(18px + env(safe-area-inset-bottom)); width: clamp(76px, 22dvh, 112px); height: clamp(76px, 22dvh, 112px); border-radius: 50%; border: 4px solid rgba(255,255,255,.8); background: rgba(16,19,26,.42); color: #fff; font: 400 clamp(30px, 9dvh, 46px) 'Bungee', sans-serif; padding: 0; pointer-events: auto; touch-action: none; -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; user-select: none; }
.tx-pad.on { background: rgba(255,210,31,.8); color: #10131a; }
.tx-pad.d { background: rgba(60,200,90,.45); }
.tx-pad.d.on { background: rgba(125,255,106,.85); }
.tx-pad.rv { background: rgba(232,56,79,.45); }
.tx-pad.rv.on { background: rgba(255,90,90,.85); }
.tx-pad.pl { left: calc(16px + env(safe-area-inset-left)); }
.tx-pad.pr { left: calc(16px + clamp(76px, 22dvh, 112px) + 16px + env(safe-area-inset-left)); }
.tx-pad.pd { right: calc(16px + env(safe-area-inset-right)); }
html.tx-touchmode .tx-home { left: calc(50% + 52px); bottom: calc(10px + env(safe-area-inset-bottom)); top: auto; right: auto; min-width: 44px; padding: 4px 10px; font-size: 13px; touch-action: none; }
html.tx-touchmode .tx-mates, html.tx-touchmode .tx-boost { display: none; }
html.tx-touchmode .tx-speed { right: auto; left: 50%; transform: translateX(-50%) skewX(-8deg); }
html.tx-touchmode .tx-speed .n { font-size: clamp(22px, 7dvh, 34px); } html.tx-touchmode .tx-speed .u { font-size: 10px; }
.tx-pad.pv { right: calc(16px + clamp(76px, 22dvh, 112px) + 16px + env(safe-area-inset-right)); }

/* ---------- quiz card ---------- */
.tx-modal { z-index: 10; position: absolute; inset: 0; display: grid; place-items: center; background: rgba(5,10,25,.55); pointer-events: auto; animation: txFade .2s both; }
@keyframes txFade { from { opacity: 0; } }
.tx-q { width: min(94vw, 620px); background: #10131a; border: 5px solid #ffd21f; border-radius: 22px; padding: 18px 20px 20px; box-shadow: 10px 10px 0 #e8384f; animation: txPop2 .3s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes txPop2 { from { transform: scale(.7) rotate(-3deg); opacity: 0; } }
.tx-q .k { font: 400 18px 'Bungee', sans-serif; color: #ff4a3d; transform: skewX(-6deg); }
.tx-q .k.go { color: #7dff6a; }
.tx-q .qq { margin: 8px 0 14px; font-weight: 800; font-size: clamp(18px, 2.4vw, 23px); line-height: 1.3; }
.tx-q .say { margin: 6px 0 14px; padding: 10px 14px; border-radius: 14px; background: #fffbe6; color: #10131a; font-weight: 800; font-size: clamp(18px, 2.3vw, 22px); }
.tx-opts { display: grid; gap: 9px; }
.tx-opt { display: flex; align-items: center; gap: 12px; text-align: left; border: 3px solid #2b3550; background: #1b2235; color: #fff; border-radius: 14px; padding: 11px 14px; font-weight: 800; font-size: 17px; }
.tx-opt b { display: grid; place-items: center; width: 32px; height: 32px; border-radius: 9px; background: #ffd21f; color: #10131a; font: 400 17px 'Bungee', sans-serif; flex: 0 0 auto; }
.tx-opt:hover { border-color: #ffd21f; }
.tx-opt.ok { border-color: #7dff6a; background: #1f4a2a; }
.tx-opt.bad { border-color: #ff4a3d; background: #4a1f22; }
.tx-q .ex { margin-top: 12px; font-weight: 700; color: #c9d6f2; }

/* ---------- results ---------- */
.tx-res { z-index: 10; position: absolute; inset: 0; display: grid; place-items: center; background: rgba(5,10,25,.7); pointer-events: auto; }
.tx-res .box { width: min(94vw, 640px); text-align: center; background: #10131a; border: 5px solid #ffd21f; border-radius: 24px; padding: 22px; box-shadow: 10px 10px 0 #e8384f; }
.tx-res .rank { font: 400 clamp(40px, 8vw, 84px) 'Bungee Shade', 'Bungee', sans-serif; color: #ffd21f; transform: skewX(-8deg); text-shadow: 5px 5px 0 #e8384f; }
.tx-res .stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin: 14px 0; }
.tx-res .stats div { background: #1b2235; border-radius: 14px; padding: 10px; font-weight: 800; font-size: 13px; color: #9fb3d9; }
.tx-res .stats b { display: block; font: 400 26px 'Bungee', sans-serif; color: #fff; }
.tx-res .row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }
.tx-loading { position: absolute; inset: 0; display: grid; place-items: center; background: #0e98d8; pointer-events: auto; font: 400 28px 'Bungee', sans-serif; }

/* ---------- the racing-taxi wordmark (also in taxi.html's loading screen) ---------- */
.tr-logo { position: relative; display: inline-flex; flex-direction: column; align-items: flex-start; gap: 7px; transform: skewX(-11deg); filter: drop-shadow(0 12px 0 rgba(0,0,0,.35)); }
.tr-word { display: flex; align-items: center; }
.tr-taxi { position: relative; font: 400 clamp(64px, 10vw, 132px)/.84 'Racing Sans One', 'Russo One', 'Arial Black', sans-serif; color: #ffd21a; -webkit-text-stroke: 3px #0b0b0c; paint-order: stroke fill; text-shadow: 5px 5px 0 #0b0b0c, 10px 10px 0 #e8384f; padding-right: .1em; letter-spacing: .01em; }
.tr-taxi::before { content: ''; position: absolute; right: 100%; top: 20%; width: .9em; height: 60%; margin-right: .08em; background: repeating-linear-gradient(180deg, #ffd21a 0 7px, transparent 7px 15px); -webkit-mask: linear-gradient(90deg, transparent, #000); mask: linear-gradient(90deg, transparent, #000); }
.tr-rush { font: 400 clamp(32px, 4.8vw, 66px)/1 'Russo One', 'Arial Black', sans-serif; color: #0b0b0c; background: linear-gradient(#ffe24a, #ffc400); padding: .12em .38em .1em; border: 4px solid #0b0b0c; border-radius: 10px; box-shadow: 6px 6px 0 #0b0b0c; letter-spacing: .08em; margin-left: .18em; }
.tr-flag { width: 100%; height: 14px; border: 2px solid #0b0b0c; background: repeating-conic-gradient(#0b0b0c 0 25%, #f4f4f4 0 50%) 0 0 / 14px 14px; }
.tr-flag-b { width: 72%; }
.tr-tag { font: 400 clamp(11px, 1.3vw, 15px) 'Russo One', sans-serif; letter-spacing: .34em; color: #ffd21a; background: #0b0b0c; padding: 5px 12px; border-radius: 4px; }

`;
