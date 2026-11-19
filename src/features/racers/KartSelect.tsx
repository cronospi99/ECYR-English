/* English Racers — the kart selection and upgrade screen (Blur style): a carousel of the six karts, a
   3D preview that turns, the four attribute bars (with the next upgrade previewed in green), buy /
   upgrade / choose buttons. Opened from the solo menu ("Kart"), before the first race and from the
   live lobby (where only the base attributes count: no upgrades).

   ONE WebGL context: the game already owns a renderer for the whole page (RaceGame). This screen
   does not create a second one: it draws its own small scene with `game.renderer` (viewport +
   scissor on a corner of the game's canvas) and copies the pixels to a 2D canvas right away in the
   same task (so no preserveDrawingBuffer is needed), then restores the renderer state. The screen
   is opaque, so the game's canvas behind it is never seen. */
import * as THREE from 'three';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Coins, Lock, Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { t, useGameLang } from '@/lib/gameLang';
import { TOONS, ToonActor } from '@/features/toons3d/runtime';
import { KartView } from './kartModel';
import { Kart } from './kart';
import { ATTRS, KARTS, UPGRADE_LEVELS, kartDef, type Attr, type KartId } from './karts';
import { garage } from './garage';
import type { RaceGame } from './engine';
import type { RacersClient } from './live';


const ACCENT: Record<KartId, string> = { balanced: '#4aa3ff', offroad: '#ff9a2e', drifter: '#b26bff', tank: '#ff5a5f', speedster: '#19e3ff', rocket: '#ff2bd6' };
/** Length / width / height factors of every body (spec B), for the card silhouettes. */
const SHAPE: Record<KartId, { l: number; w: number; wheel: number; wing: number }> = {
  balanced: { l: 1, w: 1, wheel: 1, wing: 1 }, speedster: { l: 1.18, w: 0.92, wheel: 0.9, wing: 0.8 }, drifter: { l: 1, w: 1.18, wheel: 1, wing: 1.3 },
  tank: { l: 1.05, w: 1.15, wheel: 1.1, wing: 0.6 }, rocket: { l: 0.85, w: 0.9, wheel: 1, wing: 1.1 }, offroad: { l: 1.05, w: 1.1, wheel: 1.25, wing: 0 },
};
const LABEL: Record<Attr, [string, string]> = { accel: ['Acceleration', 'Aceleración'], speed: ['Top speed', 'Velocidad'], grip: ['Grip / drift', 'Agarre/Derrape'], control: ['Control', 'Control'] };
const fmt1 = (n: number) => (Math.round(n * 10) / 10).toString();

const CSS = `
.ks-root{position:fixed;inset:0;z-index:50;display:grid;grid-template-columns:60% 40%;grid-template-rows:minmax(0,1fr) auto;color:#fff;font-family:Inter,system-ui,sans-serif;
  background:radial-gradient(ellipse at 30% 40%,rgba(255,255,255,.06),transparent 60%),linear-gradient(135deg,#10204a 0%,#3b1d7a 60%,#ff3d6e 130%);animation:ks-in .24s ease-out}
.ks-root *{box-sizing:border-box}
.ks-stage{position:relative;grid-column:1;grid-row:1;min-height:0;touch-action:none;cursor:grab;overflow:hidden}
.ks-stage:active{cursor:grabbing}
.ks-stage canvas{position:absolute;inset:0;width:100%;height:100%;display:block}
.ks-vig{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 55%,transparent 45%,rgba(8,12,40,.75) 100%),radial-gradient(ellipse at 50% 90%,var(--ks-acc),transparent 55%);mix-blend-mode:normal;opacity:.9}
.ks-glow{position:absolute;inset:0;pointer-events:none;background:radial-gradient(ellipse at 50% 95%,var(--ks-acc) 0%,transparent 50%);opacity:.28;mix-blend-mode:screen}
.ks-top{position:absolute;top:max(12px,env(safe-area-inset-top));left:12px;right:12px;display:flex;align-items:center;gap:8px;pointer-events:none}
.ks-top>*{pointer-events:auto}
.ks-icon{display:grid;place-items:center;min-width:48px;height:48px;border-radius:16px;background:rgba(20,26,85,.85);border:1px solid rgba(255,255,255,.14);color:#fff;cursor:pointer;transition:transform .15s,background .15s}
.ks-icon:hover{background:rgba(40,52,140,.95);transform:translateY(-2px)}
.ks-coins{margin-left:auto;display:flex;align-items:center;gap:6px;height:44px;padding:0 14px;border-radius:999px;background:#ffd23f;color:#2a1d00;font-weight:900;font-size:16px;font-variant-numeric:tabular-nums;box-shadow:0 3px 0 #c79a00}
.ks-sheet{grid-column:2;grid-row:1;min-height:0;overflow-y:auto;margin:12px 12px 0 0;padding:20px 20px 16px;background:rgba(20,26,85,.92);border:1px solid rgba(255,255,255,.14);
  clip-path:polygon(0 0,calc(100% - 28px) 0,100% 28px,100% 100%,28px 100%,0 calc(100% - 28px));border-top:3px solid var(--ks-acc);scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent;display:flex;flex-direction:column;gap:12px}
.ks-name{font-weight:900;font-style:italic;font-size:28px;line-height:1.05;letter-spacing:.01em;text-shadow:0 0 18px var(--ks-acc)}
.ks-blurb{color:#c9d2f0;font-size:15px;font-weight:600;margin-top:2px}
.ks-chip{display:inline-flex;align-items:center;gap:5px;min-height:24px;padding:0 10px;border-radius:999px;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;background:rgba(255,255,255,.12);color:#fff}
.ks-chip.use{background:#fff;color:#10204a}
.ks-chip.lock{background:#1a2150;color:#c9d2f0;border:1px dashed #5a6390}
.ks-row{display:grid;grid-template-columns:132px 1fr auto;align-items:center;gap:8px;min-height:44px;padding:0 6px;border-radius:12px;cursor:pointer;border:2px solid transparent}
.ks-row[data-on=true]{background:rgba(255,255,255,.07);border-color:rgba(125,255,154,.5)}
.ks-lab{all:unset;box-sizing:border-box;min-height:44px;display:flex;flex-direction:column;justify-content:center;font-size:12px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#c9d2f0;cursor:pointer;border-radius:10px;padding:0 4px}
.ks-lab small{font-size:12px;font-weight:700;color:#8e9acb;text-transform:none;letter-spacing:0}
.ks-lab:focus-visible,.ks-card:focus-visible,.ks-btn:focus-visible,.ks-icon:focus-visible,.ks-list:focus-visible,.ks-dot:focus-visible{outline:3px solid #fff;outline-offset:2px}
.ks-meter{display:flex;gap:3px}
.ks-seg{position:relative;width:14px;height:10px;border-radius:2px;background:rgba(255,255,255,.14);overflow:hidden;flex:none}
.ks-seg i{position:absolute;left:0;top:0;bottom:0;display:block}
.ks-seg .pv{background:repeating-linear-gradient(45deg,#7dff9a 0 3px,#3fbf62 3px 6px)}
.ks-seg .cu{background:#4aa3ff}
.ks-seg.pop i.cu{animation:ks-pop .5s both}
.ks-num{font-weight:900;font-size:16px;font-variant-numeric:tabular-nums;min-width:62px;text-align:right}
.ks-num b{color:#7dff9a;font-size:13px;margin-left:4px}
.ks-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;min-height:52px;padding:0 16px;border:0;border-radius:16px;font:inherit;font-weight:900;font-size:16px;cursor:pointer;
  background:#ffd23f;color:#2a1d00;box-shadow:0 5px 0 #c79a00;transition:transform .08s,box-shadow .08s,filter .15s}
.ks-btn:hover:not([aria-disabled=true]){filter:brightness(1.06)}
.ks-btn:active:not([aria-disabled=true]){transform:translateY(3px);box-shadow:0 2px 0 #c79a00}
.ks-btn.nocoin{background:#3a4272;color:#fff;box-shadow:0 5px 0 #262c52}
.ks-btn.nocoin .cost{color:#ff8a8a}
.ks-btn.max{background:#7dff9a;color:#062a15;box-shadow:0 5px 0 #3fbf62;opacity:.8;cursor:default}
.ks-btn.pick{background:#fff;color:#10204a;box-shadow:0 5px 0 #b9c6e6}
.ks-btn.go{background:#2fd27a;color:#062a15;box-shadow:0 5px 0 #16924d}
.ks-btn.dim{background:#2a3166;color:#c9d2f0;box-shadow:0 5px 0 #1b2147;cursor:default}
.ks-btn.ghost{background:rgba(255,255,255,.12);color:#fff;box-shadow:none;min-height:44px;font-size:14px}
.ks-msg{min-height:20px;font-size:13px;font-weight:700;color:#ffb0b0}
.ks-msg.ok{color:#7dff9a}
.ks-note{padding:8px 12px;border-radius:12px;background:rgba(255,210,63,.14);color:#ffe27a;font-size:13.5px;font-weight:800}
.ks-car{grid-column:1/3;grid-row:2;display:flex;align-items:center;justify-content:center;gap:8px;padding:14px 12px calc(14px + env(safe-area-inset-bottom));min-width:0}
.ks-list{display:flex;align-items:center;gap:10px;padding:14px 12px;overflow-x:auto;scroll-snap-type:x mandatory;scrollbar-width:none;min-width:0;max-width:100%;border-radius:12px}
.ks-list::-webkit-scrollbar{display:none}
.ks-card{position:relative;flex:none;width:120px;height:88px;scroll-snap-align:center;border-radius:14px;background:rgba(20,26,85,.9);border:1px solid rgba(255,255,255,.14);color:#fff;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:2px;
  transition:transform .28s cubic-bezier(.2,.8,.2,1),box-shadow .28s,border-color .28s;font:inherit;padding:0}
.ks-card:hover{transform:translateY(-4px)}
.ks-card[data-view=true]{transform:scale(1.15);border-color:var(--c);z-index:1;box-shadow:0 0 18px color-mix(in srgb,var(--c) 60%,transparent)}
.ks-card[data-view=true]:hover{transform:scale(1.15) translateY(-4px)}
.ks-card[data-use=true]{border:3px solid #fff;box-shadow:0 0 16px color-mix(in srgb,var(--c) 80%,transparent)}
.ks-card[data-use=true][data-view=true]{transform:scale(1.2)}
.ks-card[data-lock=true]{background:#1a2150;color:#a7b0d8}
.ks-card[data-lock=true] svg.glyph{opacity:.6}
.ks-card .nm{font-weight:900;font-style:italic;font-size:13px}
.ks-card .sub{display:flex;align-items:center;gap:3px;font-size:12px;font-weight:800}
.ks-card .badge{position:absolute;top:4px;right:4px;display:grid;place-items:center;width:20px;height:20px;border-radius:50%;background:#7dff9a;color:#062a15}
.ks-card .badge.lk{background:#5a6390;color:#fff}
.ks-dots{display:none}
.ks-dot{all:unset;box-sizing:border-box;width:44px;height:44px;display:grid;place-items:center;cursor:pointer;border-radius:50%}
.ks-dot i{display:block;width:10px;height:10px;border-radius:50%;background:#5a6390}
.ks-dot[aria-current=true] i{background:#fff;transform:scale(1.4)}
.ks-arrow{display:grid;place-items:center;flex:none;width:48px;height:48px;border-radius:50%;background:rgba(20,26,85,.9);border:1px solid rgba(255,255,255,.14);color:#fff;cursor:pointer}
.ks-arrow:hover{background:rgba(60,72,160,.95)}
.ks-foot{display:none}
@keyframes ks-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
@keyframes ks-pop{0%{filter:brightness(3);transform:scaleY(1.7)}100%{filter:none;transform:none}}
@media (max-width:1023px) and (min-height:521px){
  .ks-root{grid-template-columns:100%;grid-template-rows:40vh auto minmax(0,1fr) auto}
  .ks-stage{grid-column:1;grid-row:1}
  .ks-car{grid-column:1;grid-row:2;padding:0 4px}
  .ks-sheet{grid-column:1;grid-row:3;margin:0;clip-path:none;border-radius:0;border-width:3px 0 0;padding:14px 16px}
  .ks-card{width:96px;height:72px}
  .ks-arrow{display:none}
  .ks-seg{width:8px}
  .ks-act{display:none}
  .ks-foot{display:flex;grid-row:4;flex-direction:column;gap:8px;padding:10px 16px calc(10px + env(safe-area-inset-bottom));background:#0e1638;border-top:1px solid rgba(255,255,255,.14)}
  .ks-name{font-size:22px}
}
@media (max-height:520px){
  .ks-root{grid-template-columns:50% 50%;grid-template-rows:minmax(0,1fr)}
  .ks-stage{grid-column:1;grid-row:1}
  .ks-sheet{grid-column:2;grid-row:1;margin:8px 8px 8px 0;padding:12px 14px}
  .ks-car{position:absolute;left:0;width:50%;bottom:0;top:0;grid-column:auto;grid-row:auto;padding:0 6px;justify-content:space-between;pointer-events:none}
  .ks-car>*{pointer-events:auto}
  .ks-list{display:none}
  .ks-dots{display:flex;position:absolute;left:50%;transform:translateX(-50%);bottom:calc(4px + env(safe-area-inset-bottom));background:rgba(20,26,85,.7);border-radius:999px}
  .ks-seg{width:8px}
  .ks-name{font-size:22px}
  .ks-blurb{font-size:13px}
}
@media (prefers-reduced-motion:reduce){
  .ks-root{animation:ks-fade .12s linear}.ks-card,.ks-icon,.ks-btn{transition:none}.ks-seg.pop i.cu{animation:none}.ks-card:hover{transform:none}
  @keyframes ks-fade{from{opacity:0}to{opacity:1}}
}
`;

/** A small top-down silhouette of a kart (the cards have no pictures): proportions from spec B. */
function Glyph({ id, color, lock }: { id: KartId; color: string; lock: boolean }) {
  const s = SHAPE[id], L = 40 * s.l, W = 22 * s.w, r = 5 * s.wheel;
  const c = lock ? '#3a4272' : color;
  return (
    <svg className="glyph" viewBox="-30 -20 60 40" width="64" height="40" aria-hidden="true">
      <g>
        {[-1, 1].map((sx) => [-1, 1].map((sz) => <rect key={`${sx}${sz}`} x={sz * L * 0.32 - r} y={sx * (W / 2 + 1) - r * 0.6} width={r * 2} height={r * 1.2} rx="1.5" fill={lock ? '#222a5c' : '#10204a'} />))}
        <path d={`M ${L / 2} 0 L ${L * 0.2} ${-W / 2} L ${-L / 2} ${-W / 2} L ${-L / 2} ${W / 2} L ${L * 0.2} ${W / 2} Z`} fill={c} stroke="#10204a" strokeWidth="1.5" strokeLinejoin="round" />
        {s.wing > 0 && <rect x={-L / 2 - 3} y={-W * 0.62 * s.wing} width="4" height={W * 1.24 * s.wing} rx="1" fill={lock ? '#2a3166' : '#fff'} />}
        <circle cx={-L * 0.05} cy="0" r="3.2" fill="#10204a" />
      </g>
    </svg>
  );
}

function Meter({ label, value, to, popKey }: { label: string; value: number; to: number; popKey: number }) {
  return (
    <div className="ks-meter" role="meter" aria-label={label} aria-valuemin={1} aria-valuemax={10} aria-valuenow={Math.round(value * 10) / 10}
      aria-valuetext={`${fmt1(value)} / 10${to > value ? ` (+${fmt1(to - value)})` : ''}`}>
      {Array.from({ length: 10 }, (_, i) => {
        const cu = Math.max(0, Math.min(1, value - i)), pv = Math.max(0, Math.min(1, to - i));
        return (
          <span key={`${i}-${popKey}`} className={cn('ks-seg', popKey > 0 && 'pop')}>
            {pv > cu && <i className="pv" style={{ width: `${pv * 100}%` }} />}
            {cu > 0 && <i className="cu" style={{ width: `${cu * 100}%`, animationDelay: `${i * 60}ms` }} />}
          </span>
        );
      })}
    </div>
  );
}

/** One scene, drawn with the game's own renderer (see the header). */
function usePreview(game: RaceGame | null, box: React.RefObject<HTMLDivElement | null>, cv: React.RefObject<HTMLCanvasElement | null>, id: KartId, toonId: string, color: string, accent: string) {
  const live = useRef<{ setKart: (id: KartId, paint: string, accent: string) => void; drag: (dx: number) => void; hold: () => void; release: () => void } | null>(null);
  useEffect(() => {
    if (!game || !box.current || !cv.current) return;
    const el = box.current, canvas = cv.current, ctx = canvas.getContext('2d')!;
    const r = game.renderer;
    const scene = new THREE.Scene();
    scene.environment = game.scene.environment;
    scene.add(new THREE.HemisphereLight(0xcfe0ff, 0x1a1f4a, 0.9));
    const key = new THREE.DirectionalLight(0xffe6b8, 2.6); key.position.set(4, 6, 5); scene.add(key);
    const fill = new THREE.DirectionalLight(0x4a7fff, 1.3); fill.position.set(-5, 2.5, -3); scene.add(fill);
    const discMat = new THREE.MeshBasicMaterial({ color: 0x0b1030, transparent: true, opacity: 0.85 });
    const ringMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(color) });
    const disc = new THREE.Mesh(new THREE.CircleGeometry(2.4, 56), discMat); disc.rotation.x = -Math.PI / 2; disc.position.y = -0.02;
    const ring = new THREE.Mesh(new THREE.RingGeometry(2.1, 2.4, 56), ringMat); ring.rotation.x = -Math.PI / 2; ring.position.y = -0.01;
    scene.add(disc, ring);
    const cam = new THREE.PerspectiveCamera(32, 1, 0.1, 60);
    const kart = new Kart(game.track);
    let view: KartView | null = null, dead = false;
    let yaw = 0.6, dragging = false, resumeAt = 0, w = 1, h = 1;
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
    const info = TOONS.find((x) => x.id === toonId) ?? TOONS[0];

    const build = (kid: KartId, paint: string) => {
      const old = view;
      const drv = old?.takeDriver() ?? null;
      const v = new KartView(paint, info.name, garage.style, kartDef(kid).style);
      if (drv) v.setDriver(drv);
      scene.add(v.root);
      if (old) { scene.remove(old.root); old.dispose(); }
      view = v;
      v.update(0.016, kart, 0, false);
    };
    const size = () => {
      w = Math.max(2, el.clientWidth); h = Math.max(2, el.clientHeight);
      const pr = r.getPixelRatio();
      canvas.width = Math.round(w * pr); canvas.height = Math.round(h * pr);
      cam.aspect = w / h;
      const half = Math.min(THREE.MathUtils.degToRad(cam.fov) / 2, Math.atan(Math.tan(THREE.MathUtils.degToRad(cam.fov) / 2) * cam.aspect));
      const dist = 2.4 / Math.sin(half);
      cam.position.set(0.62, 0.36, 0.78).normalize().multiplyScalar(dist); cam.position.y += 0.5;
      cam.lookAt(0, 0.55, 0); cam.updateProjectionMatrix();
    };
    size();
    const ro = new ResizeObserver(size); ro.observe(el);
    build(id, color);
    void ToonActor.create(toonId, true).then((a) => { if (dead) { a.dispose(); return; } view?.setDriver(a); }).catch(() => { /* a kart without a driver */ });

    live.current = {
      setKart: (kid, paint, acc) => { ringMat.color.set(paint); void acc; build(kid, paint); },
      drag: (dx) => { yaw += dx * 0.012; },
      hold: () => { dragging = true; },
      release: () => { dragging = false; resumeAt = performance.now() + 2000; },
    };

    const c0 = new THREE.Color(), vp0 = new THREE.Vector4(), sc0 = new THREE.Vector4();
    let raf = 0, last = performance.now();
    const tick = (tm: number) => {
      raf = requestAnimationFrame(tick);
      const dt = Math.min(0.05, (tm - last) / 1000); last = tm;
      if (!reduce && !dragging && tm > resumeAt) yaw += dt * 0.6;
      kart.yaw = yaw;
      view?.update(dt, kart, tm / 1000, false);
      // save the game's renderer state, draw in the corner, copy, restore
      const pr = r.getPixelRatio(), W = canvas.width, H = canvas.height;
      r.getViewport(vp0); r.getScissor(sc0);
      const sct = r.getScissorTest(), ca = r.getClearAlpha(), exp = r.toneMappingExposure; r.getClearColor(c0);
      const keep = c0.clone();
      r.setViewport(0, 0, W / pr, H / pr); r.setScissor(0, 0, W / pr, H / pr); r.setScissorTest(true);
      r.setClearColor(0x141a55, 1); r.toneMappingExposure = 1.05;
      r.render(scene, cam);
      const src = r.domElement;
      ctx.drawImage(src, 0, src.height - H, W, H, 0, 0, W, H);
      r.setViewport(vp0); r.setScissor(sc0); r.setScissorTest(sct); r.setClearColor(keep, ca); r.toneMappingExposure = exp;
    };
    raf = requestAnimationFrame(tick);
    return () => {
      dead = true; cancelAnimationFrame(raf); ro.disconnect(); live.current = null;
      if (view) { scene.remove(view.root); view.dispose(); view = null; }
      disc.geometry.dispose(); ring.geometry.dispose(); discMat.dispose(); ringMat.dispose();
      // (no forceContextLoss: the context belongs to the game, which frees it when it is disposed)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [game, toonId]);
  useEffect(() => { live.current?.setKart(id, color, accent); }, [id, color, accent]);
  return live;
}

export interface KartSelectProps {
  game: RaceGame | null;
  /** The driver in the kart (id and colour). */
  toon: { id: string; color: string };
  client?: RacersClient;
  /** Opened before a race: the main button also starts it. */
  onRace?: () => void;
  onClose: () => void;
}

export function KartSelect({ game, toon, client, onRace, onClose }: KartSelectProps) {
  useGameLang();
  const inLive = !!client;
  const [sel, setSel] = useState(() => Math.max(0, KARTS.findIndex((k) => k.id === garage.kart)));
  const [attr, setAttr] = useState<Attr>('accel');
  const [msg, setMsg] = useState<{ text: string; ok?: boolean } | null>(null);
  const [pop, setPop] = useState<{ attr: Attr; n: number } | null>(null);
  const [, force] = useState(0);
  const rootEl = useRef<HTMLDivElement>(null);
  useEffect(() => { rootEl.current?.focus(); }, []);
  const box = useRef<HTMLDivElement>(null), cv = useRef<HTMLCanvasElement>(null), list = useRef<HTMLDivElement>(null);
  const def = KARTS[sel], id = def.id, acc = ACCENT[id];
  const paint = garage.style.paint ?? toon.color;
  const owned = garage.ownsKart(id), using = garage.kart === id;
  const coins = garage.coins;
  const preview = usePreview(game, box, cv, id, toon.id, paint, acc);

  const stats = inLive ? def.stats : garage.kartStats(id);
  const up = useMemo(() => (inLive || !owned ? null : garage.previewUpgrade(id, attr)), [inLive, owned, id, attr, coins, pop]); // eslint-disable-line react-hooks/exhaustive-deps
  const bump = () => { force((n) => n + 1); game?.setKart(garage.kart); };

  const go = useCallback((d: number) => { setSel((s) => (s + d + KARTS.length) % KARTS.length); setMsg(null); }, []);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') { e.preventDefault(); onClose(); } };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  useEffect(() => { list.current?.querySelector<HTMLElement>('[data-view=true]')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' }); }, [sel]);
  useEffect(() => { // first attribute that can still be upgraded
    if (inLive || !owned) return;
    if (garage.previewUpgrade(id, attr).maxed) { const a = ATTRS.find((x) => !garage.previewUpgrade(id, x).maxed); if (a) setAttr(a); }
  }, [id, owned, attr, inLive]);

  const choose = (): boolean => {
    if (!owned) return false;
    if (using) return true;
    if (garage.selectKart(id) !== 'ok') return false;
    game?.setKart(id); client?.setKart(id);
    force((n) => n + 1);
    return true;
  };
  const unlock = () => {
    const r = garage.buyKart(id);
    if (r === 'ok') { setMsg({ text: t(`${def.name} unlocked!`, `¡${def.name} desbloqueado!`), ok: true }); bump(); }
    else if (r === 'coins') setMsg({ text: t(`You need ${def.price - coins} more coins`, `Te faltan ${def.price - coins} monedas`) });
  };
  const doUpgrade = () => {
    if (!up) return;
    if (up.maxed) return;
    if (!up.affordable) { setMsg({ text: t(`You need ${(up.cost ?? 0) - coins} more coins`, `Te faltan ${(up.cost ?? 0) - coins} monedas`) }); return; }
    if (garage.upgrade(id, attr) === 'ok') { setMsg({ text: t('Upgraded!', '¡Mejorado!'), ok: true }); setPop({ attr, n: (pop?.n ?? 0) + 1 }); bump(); }
  };
  const pick = () => { if (choose()) { if (onRace) onRace(); else onClose(); } };

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
    else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
    else if (e.key === 'Home') { e.preventDefault(); setSel(0); }
    else if (e.key === 'End') { e.preventDefault(); setSel(KARTS.length - 1); }
    else if ((e.key === 'Enter' || e.key === ' ') && !(e.target as HTMLElement).closest('button')) { e.preventDefault(); if (owned) pick(); else unlock(); }
  };
  const drag = useRef<number | null>(null);
  const price = def.price;
  const missing = (n: number) => (n > coins ? t(`You need ${n - coins} more coins`, `Te faltan ${n - coins} monedas`) : '');

  /* the main buttons (in the sheet, or fixed at the bottom on a vertical phone) */
  const actions = (
    <>
      {!owned ? (
        <button type="button" className={cn('ks-btn', coins < price && 'nocoin')} aria-disabled={coins < price} aria-describedby="ks-msg" onClick={unlock}>
          <Lock size={18} />{t('Unlock', 'Desbloquear')} · <Coins size={16} /><span className="cost">{price}</span>
        </button>
      ) : inLive ? null : up && (
        <button type="button" className={cn('ks-btn', up.maxed ? 'max' : !up.affordable && 'nocoin')} aria-disabled={up.maxed || !up.affordable} aria-describedby="ks-msg" onClick={doUpgrade}>
          {up.maxed ? <><Check size={18} />{t('Max', 'Máximo')}</> : <>{t('Upgrade', 'Mejorar')} · {t('Level', 'Nivel')} {up.level}/{UPGRADE_LEVELS} <Coins size={16} /><span className="cost">{up.cost}</span></>}
        </button>
      )}
      <button type="button" className={cn('ks-btn', onRace ? 'go' : 'pick', (!owned || (using && !onRace)) && 'dim')} aria-disabled={!owned || (using && !onRace)} onClick={pick}>
        {!owned ? <><Lock size={18} />{t('Locked', 'Bloqueado')}</> : onRace ? <><Play size={18} fill="currentColor" />{t('Choose and race', 'Elegir y correr')}</> : using ? <><Check size={18} />{t('In use', 'En uso')}</> : t('Choose', 'Elegir')}
      </button>
      {onRace && !owned && <button type="button" className="ks-btn ghost" onClick={() => { onRace(); }}>{t(`Race with ${garage.kartDef.name}`, `Correr con ${garage.kartDef.name}`)}</button>}
    </>
  );

  return (
    <div ref={rootEl} tabIndex={-1} onKeyDown={onKey} className="ks-root" role="dialog" aria-modal="true" aria-label={t('Choose your kart', 'Elige tu kart')} style={{ ['--ks-acc' as string]: acc }}>
      <style>{CSS}</style>
      <div ref={box} className="ks-stage" data-testid="ks-stage"
        onPointerDown={(e) => { drag.current = e.clientX; preview.current?.hold(); try { e.currentTarget.setPointerCapture(e.pointerId); } catch { /* ignore */ } }}
        onPointerMove={(e) => { if (drag.current === null) return; preview.current?.drag(e.clientX - drag.current); drag.current = e.clientX; }}
        onPointerUp={() => { drag.current = null; preview.current?.release(); }} onPointerCancel={() => { drag.current = null; preview.current?.release(); }}>
        <canvas ref={cv} aria-label={t(`3D view of ${def.name}`, `Vista 3D de ${def.name}`)} role="img" />
        <div className="ks-vig" /><div className="ks-glow" />
        <div className="ks-top">
          <button type="button" className="ks-icon" onClick={onClose} aria-label={t('Close', 'Cerrar')}><ArrowLeft /></button>
          <div className="ks-coins" aria-label={t(`${coins} coins`, `${coins} monedas`)}><Coins size={18} />{coins}</div>
        </div>
      </div>

      <aside className="ks-sheet" aria-label={t('Kart details', 'Ficha del kart')}>
        <div>
          <div className="ks-name">{def.name}</div>
          <div className="ks-blurb">{t(def.blurb.en, def.blurb.es)}</div>
          <div style={{ marginTop: 8, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {using && <span className="ks-chip use"><Check size={13} />{t('In use', 'En uso')}</span>}
            {!using && owned && <span className="ks-chip"><Check size={13} />{t('Owned', 'Comprado')}</span>}
            {!owned && <span className="ks-chip lock"><Lock size={13} />{t('Locked', 'Bloqueado')}</span>}
          </div>
        </div>
        <div role="group" aria-label={t('Attributes', 'Atributos')}>
          {ATTRS.map((a) => {
            const p = !inLive && owned ? garage.previewUpgrade(id, a) : null;
            const on = !!p && !p.maxed && a === attr;
            const value = stats[a], to = on && p ? p.to : value;
            const lab = t(LABEL[a][0], LABEL[a][1]);
            return (
              <div key={a} className="ks-row" data-on={on} onClick={() => p && !p.maxed && setAttr(a)}>
                <button type="button" className="ks-lab" aria-pressed={on} disabled={!p || p.maxed} onClick={() => setAttr(a)} style={{ opacity: 1 }}>
                  {lab}{p && <small>{t('Level', 'Nivel')} {p.level}/{UPGRADE_LEVELS}{p.maxed ? ` · ${t('max', 'máx.')}` : ''}</small>}
                </button>
                <Meter label={lab} value={value} to={to} popKey={pop?.attr === a ? pop.n : 0} />
                <div className="ks-num">{fmt1(value)}{to > value && <b>+{fmt1(to - value)}</b>}</div>
              </div>
            );
          })}
        </div>
        {inLive && <div className="ks-note">{t('Live: no upgrades (base attributes only)', 'Live: sin mejoras (solo atributos base)')}</div>}
        <div id="ks-msg" className={cn('ks-msg', msg?.ok && 'ok')} role="status" aria-live="polite">
          {msg?.text ?? (!owned ? missing(price) : up && !up.maxed ? missing(up.cost ?? 0) : '')}
        </div>
        <div className="ks-act" style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 'auto' }}>{actions}</div>
      </aside>

      <div className="ks-car">
        <button type="button" className="ks-arrow" onClick={() => go(-1)} aria-label={t('Previous kart', 'Kart anterior')}><ChevronLeft /></button>
        <div ref={list} className="ks-list" role="listbox" tabIndex={0} aria-label={t('Karts', 'Karts')} aria-activedescendant={`ks-c-${id}`}>
          {KARTS.map((k, i) => {
            const own = garage.ownsKart(k.id), use = garage.kart === k.id;
            return (
              <div key={k.id} id={`ks-c-${k.id}`} role="option" aria-selected={i === sel} tabIndex={-1} className="ks-card" style={{ ['--c' as string]: ACCENT[k.id] }}
                data-view={i === sel} data-use={use} data-lock={!own} onClick={() => { setSel(i); setMsg(null); }}
                aria-label={`${k.name}, ${use ? t('in use', 'en uso') : own ? t('owned', 'comprado') : t(`locked, ${k.price} coins`, `bloqueado, ${k.price} monedas`)}`}>
                <Glyph id={k.id} color={ACCENT[k.id]} lock={!own} />
                <span className="nm">{k.name}</span>
                <span className="sub">{use ? t('In use', 'En uso') : own ? t('Owned', 'Comprado') : <><Coins size={12} />{k.price}</>}</span>
                {own ? <span className="badge"><Check size={12} /></span> : <span className="badge lk"><Lock size={11} /></span>}
              </div>
            );
          })}
        </div>
        <button type="button" className="ks-arrow" onClick={() => go(1)} aria-label={t('Next kart', 'Kart siguiente')}><ChevronRight /></button>
        <div className="ks-dots" role="group" aria-label={t('Choose a kart', 'Elegir kart')}>
          {KARTS.map((k, i) => <button key={k.id} type="button" className="ks-dot" aria-current={i === sel} aria-label={k.name} onClick={() => setSel(i)}><i /></button>)}
        </div>
      </div>

      <div className="ks-foot">{actions}</div>
    </div>
  );
}
