import { useEffect, useState } from "react";
/* "Lingo" — the game's original mascot. Drawn around the feet at (0,0),
   roughly 80 wide × 100 tall, heavy black outline (industrial cartoon). */
import type { Look } from "./types";

export const COLORS: { name: string; c: string; d: string }[] = [
  { name: "Hazard", c: "#f5c518", d: "#c99d00" },
  { name: "Rust", c: "#d0552a", d: "#97361a" },
  { name: "Orange", c: "#f07a1a", d: "#b8570c" },
  { name: "Cherry", c: "#e23d4f", d: "#a5232f" },
  { name: "Pink", c: "#ef8fc4", d: "#c4609a" },
  { name: "Grape", c: "#9b6bd3", d: "#6c45a0" },
  { name: "Navy", c: "#3a5bc7", d: "#253c8c" },
  { name: "Sky", c: "#4fb7e8", d: "#2a86b3" },
  { name: "Teal", c: "#2fb3a0", d: "#1d7d70" },
  { name: "Lime", c: "#8fd14f", d: "#5f9a2b" },
  { name: "Forest", c: "#3f8f4a", d: "#285f30" },
  { name: "Steel", c: "#8b969c", d: "#5b666d" },
  { name: "Snow", c: "#eeeae0", d: "#b9b4a6" },
  { name: "Coal", c: "#3b4349", d: "#22282c" },
  { name: "Cocoa", c: "#8a5a3b", d: "#5e3b25" },
  { name: "Sand", c: "#e3c58f", d: "#b39462" }
];

export const HATS = ["none", "hardhat", "gradcap", "beanie", "headphones", "cap", "crown", "beret", "tophat", "flower", "chef"] as const;
export const FACES = ["none", "glasses", "shades", "monocle", "freckles", "mustache", "stars", "sleepy"] as const;
export const EXTRAS = ["none", "hello", "lanyard", "scarf", "bowtie", "tie", "book", "pinEN", "pinES"] as const;

export const LABELS: Record<string, { en: string; es: string }> = {
  none: { en: "None", es: "Nada" }, hardhat: { en: "Hard hat", es: "Casco" }, gradcap: { en: "Grad cap", es: "Birrete" },
  beanie: { en: "Beanie", es: "Gorro" }, headphones: { en: "Headphones", es: "Cascos" }, cap: { en: "Cap", es: "Gorra" },
  crown: { en: "Crown", es: "Corona" }, beret: { en: "Beret", es: "Boina" }, tophat: { en: "Top hat", es: "Chistera" },
  flower: { en: "Flower", es: "Flor" }, chef: { en: "Chef", es: "Chef" },
  glasses: { en: "Glasses", es: "Gafas" }, shades: { en: "Shades", es: "Gafas de sol" }, monocle: { en: "Monocle", es: "Monóculo" },
  freckles: { en: "Freckles", es: "Pecas" }, mustache: { en: "Moustache", es: "Bigote" }, stars: { en: "Star eyes", es: "Ojos estrella" },
  sleepy: { en: "Sleepy", es: "Dormilón" },
  hello: { en: "Hi! badge", es: "Chapa Hi!" }, lanyard: { en: "ID card", es: "Credencial" }, scarf: { en: "Scarf", es: "Bufanda" },
  bowtie: { en: "Bow tie", es: "Pajarita" }, tie: { en: "Tie", es: "Corbata" }, book: { en: "Book", es: "Libro" },
  pinEN: { en: "EN pin", es: "Pin EN" }, pinES: { en: "ES pin", es: "Pin ES" }
};

export const randomLook = (seed = Math.random()): Look => ({
  color: Math.floor(seed * COLORS.length) % COLORS.length,
  hat: HATS[Math.floor(seed * 97) % HATS.length],
  face: "none",
  extra: EXTRAS[Math.floor(seed * 53) % EXTRAS.length]
});

const K = "#0e1113";
const SW = 4;

const BODY = "M -31 -10 C -35 -44 -29 -82 0 -83 C 29 -82 35 -44 31 -10 C 22 -3 -22 -3 -31 -10 Z";

function Eyes({ face, dir, dead, blink = false, lx = 0, ly = 0, scared = false }: { face: string; dir: number; dead?: boolean; blink?: boolean; lx?: number; ly?: number; scared?: boolean }) {
  const px = dir * 2.5 + lx;
  if (dead) {
    return (
      <g stroke={K} strokeWidth={3.5} strokeLinecap="round">
        <path d="M -17 -58 L -7 -48 M -7 -58 L -17 -48" />
        <path d="M 7 -58 L 17 -48 M 17 -58 L 7 -48" />
      </g>
    );
  }
  if (face === "stars") {
    const star = (cx: number) => `M ${cx} -62 L ${cx + 3} -55 L ${cx + 10} -54 L ${cx + 4.5} -49 L ${cx + 6} -42 L ${cx} -46 L ${cx - 6} -42 L ${cx - 4.5} -49 L ${cx - 10} -54 L ${cx - 3} -55 Z`;
    return <g fill="#f5c518" stroke={K} strokeWidth={2.5} strokeLinejoin="round"><path d={star(-12)} /><path d={star(12)} /></g>;
  }
  if (face === "sleepy") {
    return <g fill="none" stroke={K} strokeWidth={3.5} strokeLinecap="round"><path d="M -19 -52 Q -12 -46 -5 -52" /><path d="M 5 -52 Q 12 -46 19 -52" /></g>;
  }
  if (blink) {
    return <g fill="none" stroke={K} strokeWidth={3.5} strokeLinecap="round"><path d="M -20 -52 Q -12 -49 -4 -52" /><path d="M 4 -52 Q 12 -49 20 -52" /></g>;
  }
  const pr = scared ? 2.6 : 4.2;
  return (
    <g>
      <ellipse cx={-12} cy={-53} rx={8.5} ry={scared ? 12 : 10.5} fill="#fff" stroke={K} strokeWidth={3} />
      <ellipse cx={12} cy={-53} rx={8.5} ry={scared ? 12 : 10.5} fill="#fff" stroke={K} strokeWidth={3} />
      <circle cx={-12 + px} cy={-51 + ly} r={pr} fill={K} />
      <circle cx={12 + px} cy={-51 + ly} r={pr} fill={K} />
      <circle cx={-10.5 + px} cy={-53 + ly} r={1.4} fill="#fff" />
      <circle cx={13.5 + px} cy={-53 + ly} r={1.4} fill="#fff" />
    </g>
  );
}

/* text-bearing extras must not be mirrored when the character turns */
const TEXT_EXTRAS = new Set(["hello", "lanyard", "pinEN", "pinES"]);

const hash = (s: string) => { let h = 7; for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 9973; return h / 9973; };

function Face({ face }: { face: string }) {
  switch (face) {
    case "glasses":
      return <g fill="none" stroke={K} strokeWidth={3}><circle cx={-12} cy={-53} r={11.5} /><circle cx={12} cy={-53} r={11.5} /><path d="M -0.5 -54 L 0.5 -54 M -23 -55 L -30 -58 M 23 -55 L 30 -58" /></g>;
    case "shades":
      return <g stroke={K} strokeWidth={3}><path d="M -25 -60 L 25 -60 L 22 -47 Q 12 -42 3 -48 L 0 -52 L -3 -48 Q -12 -42 -22 -47 Z" fill="#141a1d" /><path d="M -18 -57 L -12 -57" stroke="#6d787e" strokeWidth={2} /></g>;
    case "monocle":
      return <g fill="none" stroke="#c9a227" strokeWidth={3}><circle cx={12} cy={-53} r={12} /><path d="M 22 -46 Q 26 -30 18 -20" strokeWidth={2} /></g>;
    case "freckles":
      return <g fill="#9a4a2a">{[[-20, -40], [-15, -37], [-22, -35], [20, -40], [15, -37], [22, -35]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={1.6} />)}</g>;
    case "mustache":
      return <path d="M -15 -33 Q -8 -40 0 -35 Q 8 -40 15 -33 Q 8 -30 0 -32 Q -8 -30 -15 -33 Z" fill="#3a2a1e" stroke={K} strokeWidth={2} />;
    default:
      return null;
  }
}

function Hat({ hat }: { hat: string }) {
  switch (hat) {
    case "hardhat":
      return <g stroke={K} strokeWidth={SW} strokeLinejoin="round"><path d="M -30 -74 Q -30 -102 0 -103 Q 30 -102 30 -74 Z" fill="#f5c518" /><path d="M -37 -74 L 37 -74 L 37 -68 L -37 -68 Z" fill="#f5c518" /><path d="M -6 -102 L -6 -76 M 6 -102 L 6 -76" strokeWidth={2.5} /></g>;
    case "gradcap":
      return <g stroke={K} strokeWidth={SW} strokeLinejoin="round"><path d="M -20 -84 L -20 -74 Q 0 -66 20 -74 L 20 -84 Z" fill="#1b2023" /><path d="M -40 -88 L 0 -102 L 40 -88 L 0 -76 Z" fill="#22282c" /><path d="M 0 -89 L 30 -84 L 30 -66" fill="none" stroke="#f5c518" strokeWidth={2.5} /><circle cx={30} cy={-64} r={3.5} fill="#f5c518" strokeWidth={2} /></g>;
    case "beanie":
      return <g stroke={K} strokeWidth={SW}><path d="M -29 -72 Q -30 -104 0 -104 Q 30 -104 29 -72 Z" fill="#e23d4f" /><rect x={-31} y={-78} width={62} height={10} rx={4} fill="#eeeae0" /><circle cx={0} cy={-108} r={7} fill="#eeeae0" /></g>;
    case "headphones":
      return <g stroke={K} strokeWidth={SW}><path d="M -32 -58 Q -36 -98 0 -98 Q 36 -98 32 -58" fill="none" strokeWidth={6} /><rect x={-41} y={-66} width={14} height={22} rx={5} fill="#3fa7d6" /><rect x={27} y={-66} width={14} height={22} rx={5} fill="#3fa7d6" /></g>;
    case "cap":
      return <g stroke={K} strokeWidth={SW} strokeLinejoin="round"><path d="M -28 -74 Q -28 -100 0 -100 Q 28 -100 28 -74 Z" fill="#3a5bc7" /><path d="M 2 -76 L 46 -76 Q 44 -68 26 -69 L 2 -70 Z" fill="#3a5bc7" /><circle cx={0} cy={-100} r={3} fill={K} /></g>;
    case "crown":
      return <g stroke={K} strokeWidth={SW} strokeLinejoin="round"><path d="M -22 -76 L -26 -104 L -12 -90 L 0 -108 L 12 -90 L 26 -104 L 22 -76 Z" fill="#f5c518" /><circle cx={0} cy={-84} r={3.5} fill="#e23d4f" strokeWidth={2} /></g>;
    case "beret":
      return <g stroke={K} strokeWidth={SW}><ellipse cx={-4} cy={-82} rx={34} ry={12} fill="#b4441f" /><path d="M -2 -94 L 0 -101" strokeWidth={3} /></g>;
    case "tophat":
      return <g stroke={K} strokeWidth={SW} strokeLinejoin="round"><rect x={-19} y={-118} width={38} height={40} fill="#1b2023" /><rect x={-19} y={-90} width={38} height={7} fill="#b4441f" /><rect x={-32} y={-82} width={64} height={8} rx={3} fill="#1b2023" /></g>;
    case "flower":
      return <g stroke={K} strokeWidth={2.5}>{[0, 72, 144, 216, 288].map((a) => <ellipse key={a} cx={18} cy={-84} rx={6} ry={9} fill="#ef8fc4" transform={`rotate(${a} 18 -78)`} />)}<circle cx={18} cy={-78} r={5} fill="#f5c518" /></g>;
    case "chef":
      return <g stroke={K} strokeWidth={SW} strokeLinejoin="round"><path d="M -22 -76 L -22 -92 Q -36 -96 -28 -108 Q -20 -118 -8 -110 Q 0 -122 10 -110 Q 24 -118 30 -106 Q 36 -96 22 -92 L 22 -76 Z" fill="#fff" /><path d="M -22 -82 L 22 -82" strokeWidth={2.5} /></g>;
    default:
      /* default hair tuft */
      return <path d="M -4 -82 Q -6 -96 6 -98 Q 0 -92 4 -84" fill="none" stroke={K} strokeWidth={3.5} strokeLinecap="round" />;
  }
}

function Extra({ extra }: { extra: string }) {
  switch (extra) {
    case "hello":
      return <g stroke={K} strokeWidth={2.5}><path d="M 4 -30 h 22 a 4 4 0 0 1 4 4 v 10 a 4 4 0 0 1 -4 4 h -14 l -6 5 l 1 -5 h -3 a 4 4 0 0 1 -4 -4 v -10 a 4 4 0 0 1 4 -4 Z" fill="#fff" /><text x={15.5} y={-18} textAnchor="middle" fontSize={10} fontFamily="Archivo Black,Arial Black,sans-serif" fill={K} stroke="none">Hi!</text></g>;
    case "lanyard":
      return <g stroke={K} strokeWidth={2.5}><path d="M -14 -42 L 0 -26 L 14 -42" fill="none" stroke="#3fa7d6" strokeWidth={3} /><rect x={-10} y={-27} width={20} height={16} rx={2} fill="#fff" /><rect x={-10} y={-27} width={20} height={5} fill="#f5c518" /><text x={0} y={-14} textAnchor="middle" fontSize={5.5} fontFamily="Space Mono,monospace" fontWeight={700} fill={K} stroke="none">ECYR</text></g>;
    case "scarf":
      return <g stroke={K} strokeWidth={3} strokeLinejoin="round"><path d="M -29 -36 Q 0 -26 29 -36 L 30 -28 Q 0 -18 -30 -28 Z" fill="#e23d4f" /><path d="M 14 -28 L 22 -8 L 12 -8 L 8 -26 Z" fill="#e23d4f" /><path d="M -20 -32 L -20 -26 M -8 -29 L -8 -23 M 4 -29 L 4 -23" stroke="#eeeae0" strokeWidth={2} /></g>;
    case "bowtie":
      return <g stroke={K} strokeWidth={2.5} strokeLinejoin="round" fill="#e23d4f"><path d="M 0 -30 L -13 -37 L -13 -23 Z" /><path d="M 0 -30 L 13 -37 L 13 -23 Z" /><circle cx={0} cy={-30} r={3.5} /></g>;
    case "tie":
      return <g stroke={K} strokeWidth={2.5} strokeLinejoin="round" fill="#3a5bc7"><path d="M -5 -32 L 5 -32 L 3 -27 L -3 -27 Z" /><path d="M -3 -27 L 3 -27 L 7 -10 L 0 -5 L -7 -10 Z" /></g>;
    case "book":
      return <g stroke={K} strokeWidth={2.5} strokeLinejoin="round"><rect x={22} y={-40} width={20} height={26} rx={2} fill="#b4441f" transform="rotate(12 32 -27)" /><path d="M 26 -33 L 37 -31" stroke="#f5c518" strokeWidth={2} transform="rotate(12 32 -27)" /></g>;
    case "pinEN":
    case "pinES":
      return <g stroke={K} strokeWidth={2.5}><circle cx={-16} cy={-24} r={8} fill={extra === "pinEN" ? "#3a5bc7" : "#e23d4f"} /><text x={-16} y={-21} textAnchor="middle" fontSize={7} fontFamily="Archivo Black,Arial Black,sans-serif" fill={extra === "pinEN" ? "#fff" : "#f5c518"} stroke="none">{extra === "pinEN" ? "EN" : "ES"}</text></g>;
    default:
      return null;
  }
}

/* ---- shared animation clock (one rAF for every badge on screen) ---- */
const clockSubs = new Set<(t: number) => void>();
let clockRaf = 0;
function clockLoop(ms: number) {
  clockSubs.forEach((fn) => fn(ms / 1000));
  clockRaf = clockSubs.size ? requestAnimationFrame(clockLoop) : 0;
}
export function useClock(active = true, fps = 30) {
  const [t, setT] = useState(() => performance.now() / 1000);
  useEffect(() => {
    if (!active) return;
    let last = 0;
    const fn = (now: number) => { if (now - last >= 1 / fps) { last = now; setT(now); } };
    clockSubs.add(fn);
    if (!clockRaf) clockRaf = requestAnimationFrame(clockLoop);
    return () => { clockSubs.delete(fn); };
  }, [active, fps]);
  return t;
}

export interface LingoProps {
  look: Look;
  dir?: number;
  moving?: boolean;
  ghost?: boolean;
  dead?: boolean;
  /* seconds — drives every animation */
  t?: number;
  /* per-character offset so a crowd doesn't breathe in sync */
  seed?: string;
  /* emotion overlays */
  scared?: boolean;
  happy?: boolean;
}

export function Lingo({ look, dir = 1, moving = false, ghost = false, dead = false, t = 0, seed = "", scared = false, happy = false }: LingoProps) {
  const col = COLORS[look.color] || COLORS[0];
  const ph = hash(seed || String(look.color) + look.hat) * 10;
  const tt = t + ph;

  if (dead) {
    const spin = (tt * 120) % 360;
    return (
      <g>
        <ellipse cx={0} cy={0} rx={46} ry={9} fill="rgba(0,0,0,0.3)" />
        <g transform="translate(0,-14) rotate(-84)">
          <g transform="translate(0,40)">
            <path d={BODY} fill={col.c} stroke={K} strokeWidth={SW} strokeLinejoin="round" />
            <Eyes face="none" dir={1} dead />
            <path d="M -8 -34 Q 0 -30 8 -34" fill="none" stroke={K} strokeWidth={3} strokeLinecap="round" />
          </g>
        </g>
        <g transform={`translate(0,-46) rotate(${spin})`} fill="#f5c518" stroke={K} strokeWidth={2}>
          {[0, 120, 240].map((a) => {
            const x = Math.cos((a * Math.PI) / 180) * 26, y = Math.sin((a * Math.PI) / 180) * 9;
            return <path key={a} d={`M ${x} ${y - 7} L ${x + 2} ${y - 2} L ${x + 7} ${y} L ${x + 2} ${y + 2} L ${x} ${y + 7} L ${x - 2} ${y + 2} L ${x - 7} ${y} L ${x - 2} ${y - 2} Z`} />;
          })}
        </g>
      </g>
    );
  }

  /* --- rig --- */
  const walk = moving ? tt * 13 : 0;
  const stepS = Math.sin(walk);
  const bob = moving ? -Math.abs(stepS) * 7 : 0;
  const breathe = moving ? 0 : Math.sin(tt * 2.6) * 0.03;
  const squash = moving ? Math.abs(Math.cos(walk)) * 0.07 : 0;
  const sx = 1 + squash * 0.6 - breathe * 0.6;
  const sy = 1 - squash + breathe;
  const lean = moving ? dir * 7 + stepS * 2 : Math.sin(tt * 0.9) * 1.5;
  const legL = moving ? stepS * 7 : 0;
  const liftL = moving ? Math.max(0, -stepS) * 5 : 0;
  const liftR = moving ? Math.max(0, stepS) * 5 : 0;
  const arm = moving ? stepS * 14 : Math.sin(tt * 2.6) * 3;
  const blinkCycle = (tt % 3.9);
  const blink = !scared && blinkCycle < 0.13;
  const glance = moving ? 0 : Math.sin(tt * 0.7) > 0.6 ? 2.5 : Math.sin(tt * 0.7) < -0.7 ? -2.5 : 0;
  const lookUp = !moving && Math.sin(tt * 0.45) > 0.85 ? -2 : 0;
  const tuft = Math.sin(tt * (moving ? 10 : 2)) * (moving ? 10 : 4);
  const ghostFloat = ghost ? Math.sin(tt * 2.2) * 6 - 10 : 0;
  const wave = ghost ? Math.sin(tt * 5) * 3 : 0;
  const flip = dir < 0 ? -1 : 1;

  return (
    <g opacity={ghost ? 0.55 : 1}>
      {!ghost && <ellipse cx={0} cy={0} rx={30 - Math.abs(bob) * 0.8} ry={7} fill="rgba(0,0,0,0.28)" />}
      <g transform={`translate(0,${bob + ghostFloat})`}>
        {/* feet stay under the body; they lift and slide with the step */}
        {!ghost && (
          <>
            <ellipse cx={-13 + legL} cy={-5 - liftL} rx={11} ry={7} fill={col.d} stroke={K} strokeWidth={SW} />
            <ellipse cx={13 - legL} cy={-5 - liftR} rx={11} ry={7} fill={col.d} stroke={K} strokeWidth={SW} />
          </>
        )}
        <g transform={`rotate(${lean} 0 -10) scale(${sx} ${sy}) translate(0 ${(1 - sy) * -10})`}>
          <g transform={`scale(${flip} 1)`}>
            {ghost ? (
              <path d={`M -31 -10 C -35 -44 -29 -82 0 -83 C 29 -82 35 -44 31 -10 Q 24 ${-2 + wave} 18 -10 Q 10 ${0 - wave} 3 -10 Q -5 ${0 + wave} -12 -10 Q -20 ${-2 - wave} -31 -10 Z`} fill={col.c} stroke={K} strokeWidth={SW} strokeLinejoin="round" />
            ) : (
              <path d={BODY} fill={col.c} stroke={K} strokeWidth={SW} strokeLinejoin="round" />
            )}
            <path d="M -22 -24 C -24 -40 -22 -64 -10 -72" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={5} strokeLinecap="round" />
            <path d="M 24 -18 C 28 -30 28 -50 22 -66" fill="none" stroke={col.d} strokeWidth={6} strokeLinecap="round" opacity={0.6} />
            {/* arms swing opposite to the feet */}
            <g transform={`rotate(${arm} -33 -42)`}><ellipse cx={-35} cy={-33} rx={6} ry={9.5} fill={col.c} stroke={K} strokeWidth={3.5} /></g>
            <g transform={`rotate(${-arm} 33 -42)`}><ellipse cx={35} cy={-33} rx={6} ry={9.5} fill={col.c} stroke={K} strokeWidth={3.5} /></g>
            <circle cx={-21} cy={-39} r={4.5} fill="#ff8f8f" opacity={happy ? 0.9 : 0.55} />
            <circle cx={21} cy={-39} r={4.5} fill="#ff8f8f" opacity={happy ? 0.9 : 0.55} />
            <Eyes face={look.face} dir={1} blink={blink} lx={glance} ly={lookUp} scared={scared} />
            {scared
              ? <ellipse cx={0} cy={-34} rx={4} ry={5} fill={K} />
              : happy
                ? <path d="M -8 -38 Q 0 -27 8 -38 Z" fill={K} />
                : <path d="M -6 -37 Q 0 -32 6 -37" fill="none" stroke={K} strokeWidth={3} strokeLinecap="round" />}
            <Face face={look.face} />
            {!TEXT_EXTRAS.has(look.extra) && <Extra extra={look.extra} />}
            <g transform={look.hat === "none" ? `rotate(${tuft} 0 -82)` : `rotate(${tuft * 0.25} 0 -80)`}>
              <Hat hat={look.hat} />
            </g>
          </g>
          {TEXT_EXTRAS.has(look.extra) && <g transform={`translate(${flip < 0 && look.extra.startsWith("pin") ? 32 : 0} 0)`}><Extra extra={look.extra} /></g>}
        </g>
        {ghost && <ellipse cx={0} cy={-114} rx={16} ry={5} fill="none" stroke="#f5c518" strokeWidth={3} opacity={0.6 + Math.sin(tt * 4) * 0.4} />}
      </g>
    </g>
  );
}

/* standalone animated SVG for menus, lobby, voting */
export function LingoBadge({ look, size = 80, ghost, dead, style, animate = true, seed, happy, scared }: { look: Look; size?: number; ghost?: boolean; dead?: boolean; style?: React.CSSProperties; animate?: boolean; seed?: string; happy?: boolean; scared?: boolean }) {
  const t = useClock(animate, 24);
  return (
    <svg viewBox="-50 -124 100 132" width={size} height={size * 1.32} style={{ display: "block", overflow: "visible", ...style }} aria-hidden>
      <Lingo look={look} ghost={ghost} dead={dead} t={animate ? t : 0} seed={seed} happy={happy} scared={scared} />
    </svg>
  );
}
