/* Parametric cartoon portrait for the teacher badge cards.
   Full-body chibi drawn around the feet at (0,0). */
import { SKIN, type TeacherLook } from "./teachers";

const K = "#0e1113";

function darken(hex: string, f = 0.75) {
  const n = parseInt(hex.slice(1), 16);
  const r = Math.round(((n >> 16) & 255) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

function HairBack({ l }: { l: TeacherLook }) {
  const c = l.hairColor;
  const st = { fill: c, stroke: K, strokeWidth: 3.5, strokeLinejoin: "round" as const };
  switch (l.hair) {
    case "straightLong":
    case "styledLong":
      return <path d="M -34 -6 L -35 56 Q 0 64 35 56 L 34 -6 Z" {...st} />;
    case "wavyLong":
      return <path d="M -34 -8 Q -42 12 -33 26 Q -42 42 -31 58 Q 0 66 31 58 Q 42 42 33 26 Q 42 12 34 -8 Z" {...st} />;
    case "longCurly":
      return <g {...st}>{[[-33, 0], [-36, 16], [-34, 32], [-30, 48], [33, 0], [36, 16], [34, 32], [30, 48], [-16, 54], [0, 56], [16, 54]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={11} />)}</g>;
    case "afro":
      return <g {...st}>{Array.from({ length: 16 }, (_, i) => { const a = (i / 16) * Math.PI * 2; return <circle key={i} cx={Math.cos(a) * 36} cy={-10 + Math.sin(a) * 33} r={13} />; })}<circle cx={0} cy={-10} r={38} stroke="none" /></g>;
    case "midCurly":
      return <g {...st}>{[[-32, -4], [-34, 10], [-30, 22], [32, -4], [34, 10], [30, 22]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={10} />)}</g>;
    case "bob":
      return <path d="M -35 -6 L -35 20 Q -30 26 -22 22 L 22 22 Q 30 26 35 20 L 35 -6 Z" {...st} />;
    case "emoFringe":
      return <path d="M -34 -6 L -34 30 Q -20 36 -10 28 L 10 28 Q 20 36 34 30 L 34 -6 Z" {...st} />;
    case "bun":
      return <circle cx={0} cy={-36} r={14} {...st} />;
    case "ponytail":
      return <path d="M 24 -24 Q 46 -14 40 24 Q 36 36 30 30 Q 34 6 20 -14 Z" {...st} />;
    case "shortCurly":
      return <g {...st}>{[[-30, -6], [-32, 8], [30, -6], [32, 8]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={9} />)}</g>;
    default:
      return null;
  }
}

function HairFront({ l }: { l: TeacherLook }) {
  const c = l.hairColor;
  const st = { fill: c, stroke: K, strokeWidth: 3.5, strokeLinejoin: "round" as const };
  const shine = <path d="M -12 -28 Q 0 -32 12 -28" fill="none" stroke="rgba(255,255,255,0.35)" strokeWidth={3} strokeLinecap="round" />;
  switch (l.hair) {
    case "straightLong":
    case "wavyLong":
      return <g><path d="M -31 6 Q -33 -34 0 -34 Q 33 -34 31 6 Q 24 -16 3 -22 Q -20 -16 -31 6 Z" {...st} />{shine}</g>;
    case "styledLong":
      return <g><path d="M -31 8 Q -34 -34 4 -35 Q 33 -32 31 2 Q 22 -14 -2 -20 Q -6 -6 -31 8 Z" {...st} /><path d="M -16 -26 Q -2 -31 12 -27" fill="none" stroke="rgba(255,255,255,0.45)" strokeWidth={3} strokeLinecap="round" /></g>;
    case "longCurly":
    case "midCurly":
      return <g {...st}>{[[-24, -22], [-10, -30], [6, -31], [21, -24], [-30, -8], [29, -8]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={11} />)}</g>;
    case "afro":
      return <g {...st}>{[[-22, -26], [-6, -32], [10, -32], [24, -24]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={11} />)}</g>;
    case "shortCurly":
      return <g {...st}>{[[-24, -20], [-12, -29], [2, -32], [16, -29], [26, -18]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={10} />)}</g>;
    case "bob":
      return <path d="M -32 2 Q -33 -34 0 -34 Q 33 -34 32 2 L 30 -8 L -30 -8 Z M -30 -8 L 30 -8" {...st} />;
    case "emoFringe":
      return <path d="M -31 4 Q -33 -34 2 -35 Q 33 -32 31 -2 L 14 -12 Q -2 4 -18 18 Q -26 12 -31 4 Z" {...st} />;
    case "shortNeat":
    case "silverNeat":
      return <g><path d="M -30 -4 Q -31 -35 0 -35 Q 31 -35 30 -4 Q 27 -20 12 -22 Q -8 -26 -30 -4 Z" {...st} />{shine}</g>;
    case "slick":
    case "bun":
    case "ponytail":
      return <g><path d="M -30 -6 Q -29 -36 0 -36 Q 29 -36 30 -6 Q 24 -26 0 -28 Q -24 -26 -30 -6 Z" {...st} />{shine}</g>;
    case "sporty":
      return <path d="M -29 -8 Q -30 -30 -18 -34 L -12 -40 L -6 -34 L 0 -41 L 6 -34 L 13 -40 L 18 -33 Q 30 -30 29 -8 Q 20 -22 0 -24 Q -20 -22 -29 -8 Z" {...st} />;
    case "receding":
      return <g {...st}><path d="M -31 4 Q -32 -14 -24 -20 Q -22 -6 -26 6 Z" /><path d="M 31 4 Q 32 -14 24 -20 Q 22 -6 26 6 Z" /><path d="M -6 -30 Q 0 -34 6 -30" fill="none" /><path d="M -10 -24 Q 0 -30 10 -24" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth={3} /></g>;
    default:
      return null;
  }
}

function Face({ l, blink }: { l: TeacherLook; blink: boolean }) {
  const ey = 2;
  const mysterious = l.smile === "mysterious";
  const lip = l.lips || K;
  return (
    <g>
      {/* brows */}
      <g stroke={darken(l.hairColor, 0.8)} strokeWidth={3} strokeLinecap="round" fill="none">
        {l.smile === "serious"
          ? <><path d="M -17 -9 L -6 -7" /><path d="M 6 -7 L 17 -9" /></>
          : mysterious
            ? <><path d="M -17 -8 L -6 -8" /><path d="M 6 -10 Q 12 -13 17 -11" /></>
            : <><path d="M -17 -8 Q -11 -12 -6 -9" /><path d="M 6 -9 Q 11 -12 17 -8" /></>}
      </g>
      {blink
        ? <g stroke={K} strokeWidth={3} strokeLinecap="round" fill="none"><path d="M -15 3 Q -11 6 -7 3" /><path d="M 7 3 Q 11 6 15 3" /></g>
        : (
          <g>
            <ellipse cx={-11} cy={ey} rx={3.8} ry={mysterious ? 3 : 4.8} fill={K} />
            <ellipse cx={11} cy={ey} rx={3.8} ry={mysterious ? 3 : 4.8} fill={K} />
            <circle cx={-9.8} cy={ey - 1.6} r={1.3} fill="#fff" />
            <circle cx={12.2} cy={ey - 1.6} r={1.3} fill="#fff" />
            {mysterious && <path d="M -16 -1 L -6 -1 M 6 -1 L 16 -1" stroke={K} strokeWidth={2.5} />}
          </g>
        )}
      <circle cx={-18} cy={11} r={4.5} fill="#ff8f8f" opacity={l.smile === "shy" ? 0.8 : 0.45} />
      <circle cx={18} cy={11} r={4.5} fill="#ff8f8f" opacity={l.smile === "shy" ? 0.8 : 0.45} />
      {/* beard sits under the mouth */}
      {l.beard === "stubble" && <path d="M -25 8 Q -22 30 0 31 Q 22 30 25 8 Q 18 22 0 22 Q -18 22 -25 8 Z" fill={l.hairColor} opacity={0.35} />}
      {l.beard === "short" && <path d="M -26 6 Q -24 32 0 33 Q 24 32 26 6 Q 18 23 0 22 Q -18 23 -26 6 Z" fill={l.hairColor} stroke={K} strokeWidth={3} strokeLinejoin="round" />}
      {l.beard === "full" && <path d="M -28 2 Q -28 40 0 42 Q 28 40 28 2 Q 20 22 0 22 Q -20 22 -28 2 Z" fill={l.hairColor} stroke={K} strokeWidth={3} strokeLinejoin="round" />}
      {l.beard !== "none" && l.beard !== "stubble" && <path d="M -10 13 Q 0 9 10 13" fill="none" stroke={darken(l.hairColor, 0.7)} strokeWidth={4} strokeLinecap="round" />}
      {l.smile === "big" && <g><path d="M -10 14 Q 0 28 10 14 Z" fill="#5a1d1d" stroke={lip} strokeWidth={2.5} strokeLinejoin="round" /><path d="M -5 21 Q 0 25 5 21" fill="#ff8f8f" /></g>}
      {l.smile === "soft" && <path d="M -8 15 Q 0 22 8 15" fill="none" stroke={lip} strokeWidth={3} strokeLinecap="round" />}
      {l.smile === "serious" && <path d="M -6 17 L 6 17" fill="none" stroke={lip} strokeWidth={3} strokeLinecap="round" />}
      {l.smile === "shy" && <path d="M -4 16 Q 0 19 4 16" fill="none" stroke={lip} strokeWidth={3} strokeLinecap="round" />}
      {(l.smile === "smirk" || mysterious) && <path d="M -7 17 Q 2 20 9 13" fill="none" stroke={lip} strokeWidth={3} strokeLinecap="round" />}
      {/* glasses */}
      {l.glasses === "round" && <g fill="rgba(255,255,255,0.12)" stroke={K} strokeWidth={2.6}><circle cx={-11} cy={2} r={8.5} /><circle cx={11} cy={2} r={8.5} /><path d="M -2.5 1 L 2.5 1 M -19.5 0 L -28 -3 M 19.5 0 L 28 -3" /></g>}
      {l.glasses === "rect" && <g fill="rgba(255,255,255,0.12)" stroke={K} strokeWidth={2.6}><rect x={-20} y={-4} width={17} height={12} rx={3} /><rect x={3} y={-4} width={17} height={12} rx={3} /><path d="M -3 1 L 3 1 M -20 0 L -28 -3 M 20 0 L 28 -3" /></g>}
      {l.glasses === "cat" && <g fill="rgba(255,255,255,0.12)" stroke={K} strokeWidth={2.6} strokeLinejoin="round"><path d="M -22 -6 L -3 -3 L -4 8 L -18 8 Z" /><path d="M 22 -6 L 3 -3 L 4 8 L 18 8 Z" /><path d="M -3 1 L 3 1" /></g>}
    </g>
  );
}

function Torso({ l, sw, top, bottom }: { l: TeacherLook; sw: number; top: number; bottom: number }) {
  const h = bottom - top;
  const c = l.top, d = darken(l.top, 0.72);
  const base = <rect x={-sw} y={top} width={sw * 2} height={h + 4} rx={13} fill={c} stroke={K} strokeWidth={3.5} />;
  const neck = SKIN[l.skin].c;
  switch (l.outfit) {
    case "blazer":
    case "suit":
      return (
        <g>
          {base}
          <path d={`M -10 ${top + 2} L 0 ${top + 26} L 10 ${top + 2} Z`} fill="#f2efe6" stroke={K} strokeWidth={2.5} />
          {l.outfit === "suit" && <path d={`M -3 ${top + 6} L 3 ${top + 6} L 4 ${top + 24} L 0 ${top + 29} L -4 ${top + 24} Z`} fill="#b4441f" stroke={K} strokeWidth={2} />}
          <path d={`M -10 ${top + 2} L -16 ${top + 14} L -4 ${top + 22} M 10 ${top + 2} L 16 ${top + 14} L 4 ${top + 22}`} fill="none" stroke={d} strokeWidth={3} />
          <circle cx={-6} cy={top + h * 0.75} r={2} fill={d} />
        </g>
      );
    case "shirt":
      return <g>{base}<path d={`M -10 ${top + 1} L 0 ${top + 10} L 10 ${top + 1} L 6 ${top + 12} L 0 ${top + 10} L -6 ${top + 12} Z`} fill={d} stroke={K} strokeWidth={2} /><path d={`M 0 ${top + 12} L 0 ${bottom}`} stroke={d} strokeWidth={2} />{[0.4, 0.62, 0.84].map((f) => <circle key={f} cx={0} cy={top + h * f} r={1.6} fill={d} />)}</g>;
    case "polo":
      return <g>{base}<path d={`M -12 ${top + 1} L -2 ${top + 9} L -9 ${top + 14} Z M 12 ${top + 1} L 2 ${top + 9} L 9 ${top + 14} Z`} fill={d} stroke={K} strokeWidth={2} /><path d={`M 0 ${top + 8} L 0 ${top + 20}`} stroke={d} strokeWidth={3} /><circle cx={0} cy={top + 14} r={1.5} fill="#f2efe6" /></g>;
    case "sweater":
      return <g>{base}<path d={`M -8 ${top + 1} L 0 ${top + 9} L 8 ${top + 1}`} fill="#f2efe6" stroke={K} strokeWidth={2} /><rect x={-sw} y={bottom - 6} width={sw * 2} height={8} rx={4} fill={d} stroke={K} strokeWidth={2} /><path d={`M -${sw - 8} ${top + 20} L ${sw - 8} ${top + 20}`} stroke={d} strokeWidth={2} strokeDasharray="3 4" /></g>;
    case "cardigan":
      return <g>{base}<rect x={-7} y={top} width={14} height={h + 2} fill="#f2efe6" stroke={K} strokeWidth={2} />{[0.3, 0.55, 0.8].map((f) => <circle key={f} cx={-9} cy={top + h * f} r={2} fill={d} />)}</g>;
    case "tracksuit":
      return <g>{base}<path d={`M 0 ${top + 2} L 0 ${bottom}`} stroke="#f2efe6" strokeWidth={2.5} /><path d={`M -10 ${top + 1} Q 0 ${top + 8} 10 ${top + 1}`} fill="none" stroke="#f2efe6" strokeWidth={3} /></g>;
    case "hoodieBlack":
      return <g>{base}<path d={`M -12 ${top + 2} Q 0 ${top + 14} 12 ${top + 2}`} fill="none" stroke="#3b3b3b" strokeWidth={3} /><path d={`M -4 ${top + 8} L -5 ${top + 22} M 4 ${top + 8} L 5 ${top + 22}`} stroke="#9a9a9a" strokeWidth={2} /><rect x={-sw + 8} y={top + h * 0.55} width={sw * 2 - 16} height={h * 0.3} rx={5} fill="none" stroke="#3b3b3b" strokeWidth={2.5} /></g>;
    case "stripes":
      return (
        <g>
          <clipPath id={"cl" + top}><rect x={-sw} y={top} width={sw * 2} height={h + 4} rx={13} /></clipPath>
          <rect x={-sw} y={top} width={sw * 2} height={h + 4} rx={13} fill="#f2efe6" />
          <g clipPath={`url(#cl${top})`}>{Array.from({ length: 8 }, (_, i) => <rect key={i} x={-sw} y={top + 6 + i * 8} width={sw * 2} height={4} fill={c} />)}</g>
          <rect x={-sw} y={top} width={sw * 2} height={h + 4} rx={13} fill="none" stroke={K} strokeWidth={3.5} />
          <path d={`M -9 ${top + 1} Q 0 ${top + 9} 9 ${top + 1}`} fill={neck} stroke={K} strokeWidth={2} />
        </g>
      );
    case "vest":
      return <g><rect x={-sw} y={top} width={sw * 2} height={h + 4} rx={13} fill="#f2efe6" stroke={K} strokeWidth={3.5} /><path d={`M -${sw} ${top + 10} L -6 ${bottom + 2} L -${sw - 2} ${bottom + 2} Z M ${sw} ${top + 10} L 6 ${bottom + 2} L ${sw - 2} ${bottom + 2} Z`} fill={c} stroke={K} strokeWidth={2.5} /><path d={`M -${sw - 4} ${top + 4} L -6 ${top + 30} L -6 ${bottom} M ${sw - 4} ${top + 4} L 6 ${top + 30} L 6 ${bottom}`} fill="none" stroke={c} strokeWidth={8} /><path d={`M -3 ${top + 4} L 3 ${top + 4} L 3 ${top + 26} L 0 ${top + 30} L -3 ${top + 26} Z`} fill="#22282c" stroke={K} strokeWidth={1.5} /></g>;
    case "uniform":
      return (
        <g>
          {base}
          <path d={`M -9 ${top + 1} L 0 ${top + 10} L 9 ${top + 1} L 6 ${top + 12} L 0 ${top + 10} L -6 ${top + 12} Z`} fill={d} stroke={K} strokeWidth={2} />
          <rect x={-sw + 1} y={top + 1} width={10} height={5} fill="#f5c518" stroke={K} strokeWidth={1.5} />
          <rect x={sw - 11} y={top + 1} width={10} height={5} fill="#f5c518" stroke={K} strokeWidth={1.5} />
          <path d={`M ${-sw + 10} ${top + 15} l 3 6 l 6 1 l -4 4 l 1 6 l -6 -3 l -6 3 l 1 -6 l -4 -4 l 6 -1 Z`} fill="#f5c518" stroke={K} strokeWidth={1.5} />
          <rect x={4} y={top + 16} width={sw - 10} height={6} rx={1} fill="#f2efe6" stroke={K} strokeWidth={1.2} />
          <rect x={-sw} y={bottom - 8} width={sw * 2} height={7} fill="#1b2023" stroke={K} strokeWidth={2} />
          <rect x={-5} y={bottom - 9} width={10} height={9} fill="#c9a227" stroke={K} strokeWidth={1.5} />
        </g>
      );
    default: // blouse
      return <g>{base}<path d={`M -9 ${top + 1} Q 0 ${top + 14} 9 ${top + 1} Z`} fill={neck} stroke={K} strokeWidth={2} /><path d={`M -${sw - 6} ${top + h * 0.5} Q 0 ${top + h * 0.6} ${sw - 6} ${top + h * 0.5}`} fill="none" stroke={d} strokeWidth={2} /></g>;
  }
}

export function TeacherToon({ look: l, t = 0, seed = 0, silhouette = false }: { look: TeacherLook; t?: number; seed?: number; silhouette?: boolean }) {
  const skin = SKIN[l.skin];
  const h = l.height;
  const legLen = 30 * h;
  const torsoLen = 42 * h;
  const sw = l.build === "slim" ? 21 : l.build === "broad" ? 30 : 24;
  const hipY = -legLen;
  const shoulderY = hipY - torsoLen;
  const headY = shoulderY - 27;
  const tt = t + seed * 1.7;
  const breathe = Math.sin(tt * 2.2) * 1.2;
  const blink = (tt % 4.2) < 0.13;
  const sway = Math.sin(tt * 1.1) * 1.5;
  const pants = l.outfit === "hoodieBlack" ? "#141414" : l.outfit === "suit" ? l.top : l.outfit === "tracksuit" ? l.top : "#2b3a55";
  const armSkin = l.outfit === "vest" || l.outfit === "polo";
  const sleeve = l.outfit === "vest" ? "#f2efe6" : l.outfit === "stripes" ? "#f2efe6" : l.top;
  const has = (p: string) => l.props.includes(p as never);

  const body = (
    <g>
      <ellipse cx={0} cy={0} rx={30} ry={6} fill="rgba(0,0,0,0.3)" />
      {/* legs + shoes */}
      <rect x={-sw + 5} y={hipY} width={sw - 6} height={legLen - 4} rx={4} fill={pants} stroke={K} strokeWidth={3.5} />
      <rect x={1} y={hipY} width={sw - 6} height={legLen - 4} rx={4} fill={pants} stroke={K} strokeWidth={3.5} />
      {l.outfit === "tracksuit" && <path d={`M ${-sw + 9} ${hipY + 4} L ${-sw + 9} ${-6} M ${sw - 9} ${hipY + 4} L ${sw - 9} ${-6}`} stroke="#f2efe6" strokeWidth={2.5} />}
      <ellipse cx={-sw / 2 + 1} cy={-4} rx={sw / 2 + 2} ry={6} fill="#1b2023" stroke={K} strokeWidth={3} />
      <ellipse cx={sw / 2 - 1} cy={-4} rx={sw / 2 + 2} ry={6} fill="#1b2023" stroke={K} strokeWidth={3} />
      <g transform={`translate(0 ${-breathe * 0.5}) rotate(${sway * 0.4} 0 ${hipY})`}>
        {/* long hair hangs behind the shoulders */}
        <g transform={`translate(0 ${headY})`}><HairBack l={l} /></g>
        {/* hood behind the head */}
        {l.outfit === "hoodieBlack" && <path d={`M -26 ${shoulderY + 6} Q -34 ${headY - 10} 0 ${headY - 30} Q 34 ${headY - 10} 26 ${shoulderY + 6} Z`} fill="#1f1f1f" stroke={K} strokeWidth={3.5} />}
        {/* arms */}
        <g transform={`rotate(${8 + sway} ${-sw} ${shoulderY + 8})`}>
          <rect x={-sw - 9} y={shoulderY + 4} width={12} height={torsoLen * 0.82} rx={6} fill={sleeve} stroke={K} strokeWidth={3} />
          {armSkin && <rect x={-sw - 8} y={shoulderY + 4 + torsoLen * 0.38} width={10} height={torsoLen * 0.42} rx={5} fill={skin.c} stroke={K} strokeWidth={2.5} />}
          {has("tattoos") && <path d={`M ${-sw - 6} ${shoulderY + torsoLen * 0.5} q 3 4 6 0 m -5 7 q 3 4 6 0`} fill="none" stroke="#2b3a55" strokeWidth={1.6} />}
          <circle cx={-sw - 3} cy={shoulderY + 4 + torsoLen * 0.82} r={6} fill={skin.c} stroke={K} strokeWidth={3} />
        </g>
        <g transform={`rotate(${-8 - sway} ${sw} ${shoulderY + 8})`}>
          <rect x={sw - 3} y={shoulderY + 4} width={12} height={torsoLen * 0.82} rx={6} fill={sleeve} stroke={K} strokeWidth={3} />
          {armSkin && <rect x={sw - 2} y={shoulderY + 4 + torsoLen * 0.38} width={10} height={torsoLen * 0.42} rx={5} fill={skin.c} stroke={K} strokeWidth={2.5} />}
          {has("tattoos") && <path d={`M ${sw} ${shoulderY + torsoLen * 0.52} l 5 3 l -5 3 m 1 4 q 3 3 5 0`} fill="none" stroke="#2b3a55" strokeWidth={1.6} />}
          <circle cx={sw + 3} cy={shoulderY + 4 + torsoLen * 0.82} r={6} fill={skin.c} stroke={K} strokeWidth={3} />
        </g>
        <Torso l={l} sw={sw} top={shoulderY} bottom={hipY} />
        {/* neck */}
        <rect x={-6} y={shoulderY - 8} width={12} height={10} fill={skin.c} stroke={K} strokeWidth={3} />
        {/* props on the body */}
        {has("whistle") && <g><path d={`M -9 ${shoulderY + 1} L 0 ${shoulderY + 22} L 9 ${shoulderY + 1}`} fill="none" stroke="#f5c518" strokeWidth={2} /><rect x={-4} y={shoulderY + 20} width={9} height={6} rx={2} fill="#c9cfc9" stroke={K} strokeWidth={2} /></g>}
        {has("lanyard") && <g><path d={`M -10 ${shoulderY + 1} L -2 ${shoulderY + 22} M 10 ${shoulderY + 1} L 2 ${shoulderY + 22}`} stroke="#f5c518" strokeWidth={2.5} /><rect x={-9} y={shoulderY + 22} width={18} height={14} rx={2} fill="#fff" stroke={K} strokeWidth={2} /><text x={0} y={shoulderY + 32} textAnchor="middle" fontSize={5.5} fontWeight={800} fontFamily="Arial,sans-serif" fill={K}>COORD</text></g>}
        {has("scarf") && <g><path d={`M -16 ${shoulderY - 2} Q 0 ${shoulderY + 8} 16 ${shoulderY - 2} L 16 ${shoulderY + 5} Q 0 ${shoulderY + 14} -16 ${shoulderY + 5} Z`} fill="#e23d4f" stroke={K} strokeWidth={2.5} /><path d={`M 8 ${shoulderY + 6} L 13 ${shoulderY + 24} L 6 ${shoulderY + 24} L 4 ${shoulderY + 8} Z`} fill="#e23d4f" stroke={K} strokeWidth={2.5} /></g>}
        {has("pinFR") && <g transform={`translate(${-sw + 9} ${shoulderY + 14})`}><rect x={-6} y={-4} width={4} height={8} fill="#3a5bc7" /><rect x={-2} y={-4} width={4} height={8} fill="#fff" /><rect x={2} y={-4} width={4} height={8} fill="#e23d4f" /><rect x={-6} y={-4} width={12} height={8} fill="none" stroke={K} strokeWidth={1.5} /></g>}
        {/* hand props */}
        {has("book") && <g transform={`translate(${sw - 2} ${shoulderY + torsoLen * 0.66}) rotate(-12)`}><rect x={-6} y={-12} width={22} height={28} rx={2} fill="#3a5bc7" stroke={K} strokeWidth={2.5} /><path d="M -2 -6 L 12 -6 M -2 -1 L 10 -1" stroke="#f5c518" strokeWidth={2} /></g>}
        {has("coffee") && <g transform={`translate(${sw + 3} ${shoulderY + torsoLen * 0.72})`}><rect x={-7} y={-14} width={14} height={16} rx={3} fill="#f2efe6" stroke={K} strokeWidth={2.5} /><path d="M 7 -10 q 6 0 6 5 q 0 5 -6 5" fill="none" stroke={K} strokeWidth={2.5} /><path d="M -2 -18 q 2 -4 0 -8 M 3 -18 q 2 -4 0 -8" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth={2} /></g>}
        {has("clipboard") && <g transform={`translate(${-sw - 6} ${shoulderY + torsoLen * 0.6}) rotate(10)`}><rect x={-10} y={-14} width={20} height={26} rx={2} fill="#a8774a" stroke={K} strokeWidth={2.5} /><rect x={-7} y={-10} width={14} height={18} fill="#fff" /><path d="M -5 -6 L 5 -6 M -5 -2 L 5 -2 M -5 2 L 3 2" stroke={K} strokeWidth={1.4} /></g>}
        {has("scanner") && <g transform={`translate(${sw + 4} ${shoulderY + torsoLen * 0.78}) rotate(-25)`}><rect x={-4} y={-30} width={9} height={34} rx={3} fill="#1b2023" stroke={K} strokeWidth={2.5} /><rect x={-6} y={-40} width={13} height={12} rx={4} fill="#3fa7d6" stroke={K} strokeWidth={2.5} /><circle cx={0.5} cy={-34} r={2.5} fill="#e23d4f" /></g>}
        {has("pointer") && <path d={`M ${sw + 3} ${shoulderY + torsoLen * 0.82} L ${sw + 26} ${shoulderY - 6}`} stroke="#6b4a2e" strokeWidth={3.5} strokeLinecap="round" />}
        {/* head */}
        <g transform={`translate(0 ${headY})`}>
          <circle cx={-30} cy={4} r={6} fill={skin.c} stroke={K} strokeWidth={3} />
          <circle cx={30} cy={4} r={6} fill={skin.c} stroke={K} strokeWidth={3} />
          {has("earrings") && <><circle cx={-30} cy={13} r={3} fill="#f5c518" stroke={K} strokeWidth={1.5} /><circle cx={30} cy={13} r={3} fill="#f5c518" stroke={K} strokeWidth={1.5} /></>}
          <ellipse cx={0} cy={2} rx={29} ry={30} fill={skin.c} stroke={K} strokeWidth={3.5} />
          <path d="M -20 22 Q 0 34 20 22" fill="none" stroke={skin.d} strokeWidth={4} opacity={0.5} />
          <Face l={l} blink={blink} />
          <HairFront l={l} />
          {has("guardCap") && <g><path d="M -30 -20 Q -30 -42 0 -42 Q 30 -42 30 -20 Z" fill="#22305a" stroke={K} strokeWidth={3.5} /><path d="M -32 -20 L 32 -20 L 26 -12 L -26 -12 Z" fill="#1b2023" stroke={K} strokeWidth={3} /><path d="M -6 -36 l 6 -4 l 6 4 l -2 6 l -8 0 Z" fill="#f5c518" stroke={K} strokeWidth={1.5} /></g>}
          {has("beretFR") && <g><ellipse cx={-4} cy={-30} rx={30} ry={10} fill="#22305a" stroke={K} strokeWidth={3.5} /><path d="M -2 -40 L 0 -46" stroke={K} strokeWidth={3} /></g>}
        </g>
      </g>
    </g>
  );

  if (!silhouette) return body;
  return <g style={{ filter: "brightness(0)" }} opacity={0.55}>{body}</g>;
}
