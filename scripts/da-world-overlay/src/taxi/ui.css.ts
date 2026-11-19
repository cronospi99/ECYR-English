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

/* ---------- HUD ---------- */
.tx-hud { position: absolute; inset: 0; }
.tx-money { position: absolute; left: 18px; top: 14px; font-size: clamp(32px, 4.6vw, 56px); color: #7dff6a; transform: skewX(-8deg); }
.tx-sub { position: absolute; left: 22px; top: calc(14px + clamp(40px, 5.4vw, 66px)); font-weight: 900; font-size: 15px; text-shadow: 0 2px 0 #10131a; display: flex; gap: 10px; flex-wrap: wrap; }
.tx-sub span { background: rgba(16,19,26,.72); border-radius: 10px; padding: 5px 10px; }
.tx-timer { position: absolute; left: 50%; top: 10px; transform: translateX(-50%) skewX(-8deg); text-align: center; }
.tx-timer .n { font-size: clamp(44px, 7vw, 86px); line-height: 1; color: #ffd21f; }
.tx-timer .n.hot { color: #ff4a3d; animation: txBlink .5s steps(1) infinite; }
.tx-timer .l { font: 900 13px 'Rubik'; letter-spacing: .2em; text-shadow: 0 2px 0 #10131a; }
.tx-call { position: absolute; left: 50%; top: 26%; transform: translate(-50%, -50%); font-size: clamp(30px, 6vw, 74px); color: #fff; white-space: nowrap; animation: txCall 1.4s cubic-bezier(.2,1.4,.4,1) both; transform-origin: center; }
@keyframes txCall { 0% { opacity: 0; transform: translate(-50%, -50%) scale(.3) rotate(-8deg); } 18% { opacity: 1; transform: translate(-50%, -50%) scale(1.15) rotate(-4deg); } 30% { transform: translate(-50%, -50%) scale(1) rotate(-4deg); } 80% { opacity: 1; } 100% { opacity: 0; transform: translate(-50%, -70%) scale(1) rotate(-4deg); } }
@keyframes txBlink { 50% { opacity: .35; } }
.tx-dest { position: absolute; left: 50%; bottom: 18px; transform: translateX(-50%); display: flex; align-items: center; gap: 12px; padding: 10px 18px; border-radius: 16px; background: rgba(16,19,26,.82); border: 3px solid #7dff6a; max-width: min(94vw, 720px); }
.tx-dest .e { font-size: 36px; }
.tx-dest .t { font: 900 12px 'Rubik'; letter-spacing: .16em; color: #9fb3d9; text-transform: uppercase; }
.tx-dest .nm { font: 400 clamp(18px, 2.6vw, 28px) 'Bungee', sans-serif; color: #fff; line-height: 1.05; }
.tx-dest .d { font: 400 22px 'Bungee', sans-serif; color: #7dff6a; margin-left: auto; white-space: nowrap; }
.tx-speed { position: absolute; right: 20px; bottom: 16px; text-align: right; transform: skewX(-8deg); }
.tx-speed .n { font-size: clamp(36px, 5vw, 60px); line-height: 1; color: #fff; }
.tx-speed .u { font: 900 13px 'Rubik'; letter-spacing: .2em; text-shadow: 0 2px 0 #10131a; }
.tx-boost { width: 160px; height: 14px; margin: 6px 0 0 auto; border: 3px solid #10131a; border-radius: 8px; background: #2b3550; overflow: hidden; }
.tx-boost i { display: block; height: 100%; background: linear-gradient(90deg, #ff8a1f, #ffd21f); }
.tx-map { position: absolute; right: 14px; top: 14px; width: 190px; height: 190px; border-radius: 50%; border: 4px solid #ffd21f; background: rgba(16,19,26,.78); box-shadow: 0 6px 0 #10131a; overflow: hidden; }
.tx-map canvas { width: 100%; height: 100%; display: block; }
.tx-say { position: absolute; left: 50%; bottom: 96px; transform: translateX(-50%); max-width: min(92vw, 640px); padding: 12px 18px; border-radius: 18px; background: #fffbe6; color: #10131a; font-weight: 800; font-size: clamp(16px, 2vw, 21px); box-shadow: 0 6px 0 #10131a; text-align: center; animation: txPop .3s cubic-bezier(.2,1.4,.4,1) both; }
@keyframes txPop { from { transform: translateX(-50%) scale(.6); opacity: 0; } }
.tx-home { position: absolute; left: 18px; bottom: 18px; pointer-events: auto; border: 3px solid #fff; background: rgba(16,19,26,.7); color: #fff; border-radius: 12px; padding: 8px 12px; font-weight: 900; font-size: 14px; }
.tx-mates { position: absolute; right: 14px; top: 214px; display: flex; flex-direction: column; gap: 4px; align-items: flex-end; font-weight: 800; font-size: 13px; }
.tx-mates span { background: rgba(16,19,26,.72); border-radius: 8px; padding: 4px 8px; }

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
.tx-pad.pv { right: calc(16px + clamp(76px, 22dvh, 112px) + 16px + env(safe-area-inset-right)); }
html.tx-touchmode .tx-map { width: clamp(84px, 24dvh, 130px); height: clamp(84px, 24dvh, 130px); top: 8px; right: 8px; border-width: 3px; opacity: .85; }
html.tx-touchmode .tx-mates, html.tx-touchmode .tx-boost, html.tx-touchmode .tx-sub { display: none; }
html.tx-touchmode .tx-home { left: auto; bottom: auto; top: 8px; right: calc(clamp(84px, 24dvh, 130px) + 18px); min-width: 44px; min-height: 44px; padding: 4px 10px; font-size: 13px; touch-action: none; }
html.tx-touchmode .tx-money { left: 10px; top: 6px; font-size: clamp(22px, 7dvh, 34px); }
html.tx-touchmode .tx-timer { top: 4px; } html.tx-touchmode .tx-timer .n { font-size: clamp(28px, 9dvh, 48px); } html.tx-touchmode .tx-timer .l { font-size: 10px; }
html.tx-touchmode .tx-dest { top: 6px; bottom: auto; left: 10px; transform: none; padding: 4px 10px; gap: 8px; max-width: 34vw; top: calc(6px + clamp(26px, 8dvh, 40px)); }
html.tx-touchmode .tx-dest .e { font-size: 20px; } html.tx-touchmode .tx-dest .nm { font-size: 14px; } html.tx-touchmode .tx-dest .d { font-size: 14px; } html.tx-touchmode .tx-dest .t { display: none; }
html.tx-touchmode .tx-speed { right: auto; left: 50%; transform: translateX(-50%) skewX(-8deg); bottom: calc(14px + env(safe-area-inset-bottom)); }
html.tx-touchmode .tx-speed .n { font-size: clamp(22px, 7dvh, 34px); } html.tx-touchmode .tx-speed .u { font-size: 10px; }
html.tx-touchmode .tx-combo { bottom: auto; top: 30%; right: 10px; }
html.tx-touchmode .tx-say { bottom: 30%; }

/* ---------- quiz card ---------- */
.tx-modal { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(5,10,25,.55); pointer-events: auto; animation: txFade .2s both; }
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
.tx-res { position: absolute; inset: 0; display: grid; place-items: center; background: rgba(5,10,25,.7); pointer-events: auto; }
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

/* ECYR rebuild: the combo counter (near misses, drifts) */
.tx-combo { position: absolute; right: 22px; bottom: 150px; text-align: right; transition: opacity .3s; opacity: 0; pointer-events: none; transform: skewX(-8deg); }
.tx-combo .t { font-size: clamp(22px, 3vw, 36px); color: #fff4b0; }
.tx-combo .c { font: 900 16px 'Rubik', sans-serif; letter-spacing: .1em; color: #fff; text-shadow: 0 2px 0 #10131a; }
.tx-combo .c b { font-size: clamp(34px, 5vw, 60px); color: #ffd21f; margin-right: 6px; }
.tx-combo.pop { animation: txComboPop .35s cubic-bezier(.2,1.6,.4,1); }
@keyframes txComboPop { from { transform: skewX(-8deg) scale(1.35); } to { transform: skewX(-8deg) scale(1); } }
`;
