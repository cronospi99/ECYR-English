import { memo } from "react";
import { ALARM_PANELS, BATH_DOOR, BELL, FUSE, GUARD, SCANNER, WORLD, doors, furniture, glassWalls, halls, offices, rooms, stations, vents, type Furniture } from "./map";
import { TeacherToon } from "@/features/cards/TeacherToon";
import { WATCHMAN } from "@/features/cards/teachers";

const K = "#0e1113";

export const MapDefs = memo(function MapDefs() {
  return (
    <defs>
      <pattern id="f-wood" width="80" height="24" patternUnits="userSpaceOnUse">
        <rect width="80" height="24" fill="#a8774a" />
        <path d="M0 23.5H80M40 0V24" stroke="#7d5432" strokeWidth="2" />
        <path d="M6 8h20M50 15h18" stroke="#b98a5c" strokeWidth="2" />
      </pattern>
      <pattern id="f-tile" width="60" height="60" patternUnits="userSpaceOnUse">
        <rect width="60" height="60" fill="#c9cfc9" />
        <path d="M0 59H60M59 0V60" stroke="#9aa39c" strokeWidth="2" />
      </pattern>
      <pattern id="f-carpet" width="20" height="20" patternUnits="userSpaceOnUse">
        <rect width="20" height="20" fill="#7a3a33" />
        <circle cx="10" cy="10" r="2" fill="#8d4840" />
      </pattern>
      <pattern id="f-check" width="80" height="80" patternUnits="userSpaceOnUse">
        <rect width="80" height="80" fill="#eeeae0" />
        <rect width="40" height="40" fill="#2b3236" /><rect x="40" y="40" width="40" height="40" fill="#2b3236" />
      </pattern>
      <pattern id="f-lab" width="50" height="50" patternUnits="userSpaceOnUse">
        <rect width="50" height="50" fill="#2d5b74" />
        <path d="M0 49H50M49 0V50" stroke="#24485c" strokeWidth="2" />
        <circle cx="25" cy="25" r="2" fill="#3fa7d6" opacity=".5" />
      </pattern>
      <pattern id="f-marble" width="120" height="120" patternUnits="userSpaceOnUse">
        <rect width="120" height="120" fill="#e5e0d2" />
        <path d="M0 119H120M119 0V120" stroke="#c6bfac" strokeWidth="2" />
        <path d="M10 30 Q 40 10 70 40 T 115 60" fill="none" stroke="#d3ccb8" strokeWidth="2" />
      </pattern>
      <pattern id="f-hall" width="56" height="56" patternUnits="userSpaceOnUse">
        <rect width="56" height="56" fill="#59636a" />
        <path d="M0 55H56M55 0V56" stroke="#4a5359" strokeWidth="2" />
        <circle cx="8" cy="8" r="2.5" fill="#6d787e" /><circle cx="48" cy="48" r="2.5" fill="#6d787e" />
      </pattern>
      <pattern id="f-rug" width="60" height="60" patternUnits="userSpaceOnUse">
        <rect width="60" height="60" fill="#3f8f4a" />
        <rect x="0" y="0" width="30" height="30" fill="#46994f" /><rect x="30" y="30" width="30" height="30" fill="#46994f" />
      </pattern>
      <pattern id="hazard" width="28" height="28" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
        <rect width="14" height="28" fill="#f5c518" /><rect x="14" width="14" height="28" fill={K} />
      </pattern>
      <radialGradient id="lamp" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stopColor="#fff6c8" stopOpacity="0.22" />
        <stop offset="100%" stopColor="#fff6c8" stopOpacity="0" />
      </radialGradient>
    </defs>
  );
});

function Piece({ f }: { f: Furniture }) {
  const { x, y, w, h } = f;
  const box = (fill: string, rx = 4) => <rect x={x} y={y} width={w} height={h} rx={rx} fill={fill} stroke={K} strokeWidth={4} />;
  switch (f.kind) {
    case "board":
      return <g>{box("#f2efe6", 2)}<text x={x + w / 2} y={y + h - 7} textAnchor="middle" fontSize={15} fontFamily="'Space Mono',monospace" fontWeight={700} fill="#3a5bc7">{f.label}</text></g>;
    case "kidtable":
      return <g>{box("#f5c518", 14)}{[0, 1].map((i) => <circle key={i} cx={x + 24 + i * (w - 48)} cy={y + h + 14} r={11} fill="#e23d4f" stroke={K} strokeWidth={3} />)}</g>;
    case "toybox":
      return <g>{box("#3a5bc7")}<text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fontSize={40}>🧸</text></g>;
    case "shelf": case "shelfH": {
      const books = [];
      const vert = f.kind === "shelf";
      const n = Math.floor((vert ? h : w) / 22);
      for (let i = 0; i < n; i++) {
        const c = ["#e23d4f", "#3a5bc7", "#f5c518", "#2fb3a0", "#9b6bd3"][i % 5];
        books.push(vert
          ? <rect key={i} x={x + 4} y={y + 6 + i * 22} width={w - 8} height={16} fill={c} stroke={K} strokeWidth={1.5} />
          : <rect key={i} x={x + 6 + i * 22} y={y + 4} width={16} height={h - 8} fill={c} stroke={K} strokeWidth={1.5} />);
      }
      return <g>{box("#6b4a2e", 2)}{books}</g>;
    }
    case "readtable": case "bigtable": case "meeting":
      return <g>{box("#a8774a", 8)}<rect x={x + 12} y={y + 12} width={w - 24} height={h - 24} rx={4} fill="none" stroke="#7d5432" strokeWidth={2} />
        {f.kind === "readtable" && <text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle" fontSize={28}>📖</text>}
        {f.kind === "bigtable" && <text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontSize={30}>☕ 📝</text>}</g>;
    case "labdesk": {
      const n = Math.floor(w / 90);
      return <g>{box("#1b2023")}{Array.from({ length: n }, (_, i) => (
        <g key={i}><rect x={x + 14 + i * 90} y={y + 6} width={54} height={30} rx={3} fill="#3fa7d6" stroke={K} strokeWidth={2.5} /><path d={`M ${x + 30 + i * 90} ${y + 44} q 11 -10 22 0`} fill="none" stroke="#f5c518" strokeWidth={3} /></g>
      ))}</g>;
    }
    case "desk":
      return <g>{box("#c9a36d")}<rect x={x + w / 2 - 14} y={y + h + 6} width={28} height={18} rx={4} fill="#4a5359" stroke={K} strokeWidth={3} /></g>;
    case "examdesk":
      return <g>{box("#d9d4c4", 2)}<rect x={x + 18} y={y + 10} width={34} height={26} fill="#fff" stroke={K} strokeWidth={1.5} /></g>;
    case "counter":
      return <g>{box("#b4441f")}<text x={x + 40} y={y + 36} fontSize={28}>☕</text><text x={x + 110} y={y + 36} fontSize={28}>🥐</text><text x={x + 180} y={y + 36} fontSize={28}>🍩</text><text x={x + 250} y={y + 36} fontSize={28}>🧃</text></g>;
    case "cafetable":
      return <g><circle cx={x + w / 2} cy={y + h / 2} r={w / 2} fill="#eeeae0" stroke={K} strokeWidth={4} /><text x={x + w / 2} y={y + h / 2 + 10} textAnchor="middle" fontSize={26}>🍰</text></g>;
    case "frontdesk":
      return <g>{box("#2b3236")}<rect x={x} y={y + h - 14} width={w} height={14} fill="url(#hazard)" stroke={K} strokeWidth={3} />
        <text x={x + w / 2} y={y + 30} textAnchor="middle" fontSize={17} fontFamily="'Archivo Black',sans-serif" fill="#f5c518">ECYR</text>
        <text x={x + w / 2} y={y + 44} textAnchor="middle" fontSize={10} fontFamily="'Space Mono',monospace" fontWeight={700} fill="#f2efe6" letterSpacing="6">ENGLISH</text></g>;
    case "bell":
      return <g><circle cx={BELL.x} cy={BELL.y} r={70} fill="#2b3236" stroke={K} strokeWidth={5} /><circle cx={BELL.x} cy={BELL.y} r={58} fill="url(#hazard)" stroke={K} strokeWidth={3} />
        <circle cx={BELL.x} cy={BELL.y} r={36} fill="#e23d4f" stroke={K} strokeWidth={5} /><circle cx={BELL.x - 10} cy={BELL.y - 10} r={9} fill="#ff8f8f" /></g>;
    case "sofa": case "sofaV":
      return <g>{box("#9b6bd3", 14)}<rect x={x + 8} y={y + 8} width={w - 16} height={h - 16} rx={10} fill="#b48ae0" stroke={K} strokeWidth={2} /></g>;
    case "plants": case "plant":
      return <g>{box("#8a5a3b", 6)}<text x={x + w / 2} y={y + h / 2 + 14} textAnchor="middle" fontSize={40}>🪴</text></g>;
    case "lockers":
      return <g>{box("#8b969c", 2)}{Array.from({ length: Math.floor(h / 50) }, (_, i) => <path key={i} d={`M ${x} ${y + 50 * (i + 1)} h ${w}`} stroke={K} strokeWidth={2} />)}</g>;
    case "clock":
      return <g>{box("#1b2023", 6)}<text x={x + w / 2} y={y + 28} textAnchor="middle" fontSize={20} fontFamily="'Space Mono',monospace" fontWeight={700} fill="#e23d4f">00:45</text></g>;
    case "bossdesk":
      return <g>{box("#6b4a2e")}<text x={x + 30} y={y + 50} fontSize={30}>🖋️</text><text x={x + w - 70} y={y + 50} fontSize={30}>🏅</text></g>;
    case "frames":
      return <g>{box("#c9a227", 2)}{[0, 1, 2].map((i) => <rect key={i} x={x + 5} y={y + 14 + i * 70} width={w - 10} height={50} fill="#f2efe6" stroke={K} strokeWidth={2} />)}</g>;
    case "salesdesk":
      return <g>{box("#f2efe6", 4)}<rect x={x + 8} y={y + 6} width={30} height={20} rx={2} fill="#3fa7d6" stroke={K} strokeWidth={2} /><text x={x + w - 26} y={y + 27} textAnchor="middle" fontSize={16}>📈</text><circle cx={x + w / 2} cy={y + h + 16} r={12} fill="#4a5359" stroke={K} strokeWidth={3} /></g>;
    case "stalls":
      return <g>{[0, 1, 2].map((i) => (
        <g key={i}><rect x={x} y={y + i * (h / 3)} width={w} height={h / 3 - 6} rx={3} fill="#9bc4d6" stroke={K} strokeWidth={4} /><circle cx={x + 12} cy={y + i * (h / 3) + h / 6} r={4} fill="#c9a227" stroke={K} strokeWidth={1.5} /><text x={x + w / 2 + 6} y={y + i * (h / 3) + h / 6 + 8} textAnchor="middle" fontSize={22}>🚽</text></g>
      ))}</g>;
    case "sinks":
      return <g>{box("#f2efe6", 4)}{[0, 1, 2].map((i) => <g key={i}><ellipse cx={x + w / 2} cy={y + 40 + i * 90} rx={11} ry={16} fill="#9bc4d6" stroke={K} strokeWidth={2.5} /><text x={x + w / 2} y={y + 22 + i * 90} textAnchor="middle" fontSize={16}>🧼</text></g>)}</g>;
    case "ac":
      return (
        <g>
          {box("#e6e2d6", 6)}
          {[0, 1, 2, 3, 4].map((i) => <path key={i} d={`M ${x + 10} ${y + 8 + i * 4} h ${w - 20}`} stroke="#9aa39c" strokeWidth={2} />)}
          <text x={x + w - 14} y={y + 21} textAnchor="middle" fontSize={11} fontFamily="'Space Mono',monospace" fontWeight={700} fill="#e23d4f">ERR</text>
          {[0, 1, 2].map((i) => (
            <circle key={i} cx={x + 30 + i * 30} cy={y + h + 10} r={8} fill="#8b969c" opacity={0.7}>
              <animate attributeName="cy" values={`${y + h + 4};${y + h + 60}`} dur={`${1.6 + i * 0.3}s`} repeatCount="indefinite" />
              <animate attributeName="r" values="6;18" dur={`${1.6 + i * 0.3}s`} repeatCount="indefinite" />
              <animate attributeName="opacity" values="0.7;0" dur={`${1.6 + i * 0.3}s`} repeatCount="indefinite" />
            </circle>
          ))}
          <text x={x + w / 2} y={y + h + 34} textAnchor="middle" fontSize={14} fontFamily="'Archivo Black',sans-serif" fill="#e23d4f" stroke={K} strokeWidth={3} paintOrder="stroke">AC BROKEN
            <animate attributeName="opacity" values="1;0.2;1" dur="1s" repeatCount="indefinite" />
          </text>
        </g>
      );
    case "npc":
      return null;
    case "coffeetable":
      return <g>{box("#a8774a", 10)}<text x={x + w / 2} y={y + h / 2 + 12} textAnchor="middle" fontSize={30}>💬</text></g>;
    default:
      return box("#6d787e");
  }
}

export function VentArt({ x, y, open = 0 }: { x: number; y: number; open?: number }) {
  return (
    <g transform={`translate(${x},${y})`}>
      <ellipse cx={0} cy={4} rx={34} ry={12} fill="rgba(0,0,0,0.35)" />
      <rect x={-30} y={-14} width={60} height={28} rx={5} fill="#1b2023" stroke={K} strokeWidth={4} />
      <g transform={`translate(0 ${-open * 18}) rotate(${-open * 12})`}>
        <rect x={-30} y={-14} width={60} height={28} rx={5} fill="#8b969c" stroke={K} strokeWidth={4} />
        {[-18, -6, 6, 18].map((gx) => <rect key={gx} x={gx - 3} y={-9} width={6} height={18} rx={2} fill="#3b4349" />)}
      </g>
    </g>
  );
}

/* static floor plan — rendered once */
const receptionRect = rooms.find((r) => r.id === "reception")!.r;
const RECEPTION_MID = receptionRect.y + receptionRect.h / 2;

export const MapStatic = memo(function MapStatic({ labels = true }: { labels?: boolean }) {
  return (
    <g>
      <rect x={-400} y={-400} width={WORLD.w + 800} height={WORLD.h + 800} fill="#141a1d" />
      {/* walls: each room drawn larger in dark, floors on top */}
      {rooms.map((r) => <rect key={"w" + r.id} x={r.r.x - 16} y={r.r.y - 16} width={r.r.w + 32} height={r.r.h + 32} rx={6} fill="#4a5359" stroke={K} strokeWidth={5} />)}
      {halls.map((h, i) => <rect key={"wh" + i} x={h.x - 16} y={h.y - 16} width={h.w + 32} height={h.h + 32} rx={6} fill="#4a5359" stroke={K} strokeWidth={5} />)}
      {halls.map((h, i) => <rect key={"h" + i} x={h.x} y={h.y} width={h.w} height={h.h} fill="url(#f-hall)" />)}
      {rooms.map((r) => <rect key={"f" + r.id} x={r.r.x} y={r.r.y} width={r.r.w} height={r.r.h} fill={`url(#f-${r.floor})`} />)}
      {offices.map((o) => <rect key={o.id} x={o.r.x} y={o.r.y} width={o.r.w} height={o.r.h} fill="url(#f-carpet)" opacity={0.85} />)}
      {doors.map((d, i) => (
        <g key={"d" + i}>
          <rect x={d.x} y={d.y} width={d.w} height={d.h} fill="url(#f-hall)" />
          {d.v
            ? <><rect x={d.x - 6} y={d.y + d.h / 2 - 10} width={8} height={20} fill="#f5c518" stroke={K} strokeWidth={2} /><rect x={d.x + d.w - 2} y={d.y + d.h / 2 - 10} width={8} height={20} fill="#f5c518" stroke={K} strokeWidth={2} /></>
            : <><rect x={d.x + d.w / 2 - 10} y={d.y - 6} width={20} height={8} fill="#f5c518" stroke={K} strokeWidth={2} /><rect x={d.x + d.w / 2 - 10} y={d.y + d.h - 2} width={20} height={8} fill="#f5c518" stroke={K} strokeWidth={2} /></>}
        </g>
      ))}
      {/* hallway hazard edging + signs */}
      {halls.map((h, i) => (
        <g key={"hz" + i}>
          <text x={h.x + h.w / 2} y={h.y + h.h / 2 + 10} textAnchor="middle" fontSize={30} fontFamily="'Archivo Black',sans-serif" fill="rgba(242,239,230,0.12)" letterSpacing="18">{i === 0 ? "MAIN HALLWAY · PASILLO" : "SOUTH HALLWAY · PASILLO SUR"}</text>
        </g>
      ))}
      {rooms.map((r) => <ellipse key={"l" + r.id} cx={r.r.x + r.r.w / 2} cy={r.r.y + r.r.h / 2} rx={r.r.w * 0.6} ry={r.r.h * 0.6} fill="url(#lamp)" />)}
      {furniture.map((f, i) => <Piece key={i} f={f} />)}
      {stations.map((s) => (
        <g key={s.id}>
          <circle cx={s.x} cy={s.y} r={22} fill="#1b2023" stroke={K} strokeWidth={4} />
          <circle cx={s.x} cy={s.y} r={14} fill="none" stroke="#6d787e" strokeWidth={3} strokeDasharray="5 4" />
        </g>
      ))}
      {vents.map((v) => <VentArt key={v.id} x={v.x} y={v.y} />)}
      {glassWalls.map((g, i) => <rect key={"gl" + i} x={g.x} y={g.y} width={g.w} height={g.h} fill="rgba(160,214,240,0.55)" stroke={K} strokeWidth={3} />)}
      {offices.map((o) => (
        <g key={"ol" + o.id} transform={`translate(${o.r.x + o.r.w / 2},${o.r.y + (o.r.y < RECEPTION_MID ? o.r.h - 14 : 22)})`}>
          <rect x={-58} y={-13} width={116} height={22} rx={3} fill="#f5c518" stroke={K} strokeWidth={3} />
          <text y={3} textAnchor="middle" fontSize={11} fontFamily="'Space Mono',monospace" fontWeight={700} fill={K}>{o.en.toUpperCase()}</text>
        </g>
      ))}
      {/* scanner arch at the lobby's south door */}
      <g>
        <rect x={SCANNER.x - 8} y={SCANNER.y - 20} width={16} height={70} rx={3} fill="#8b969c" stroke={K} strokeWidth={3} />
        <rect x={SCANNER.x + SCANNER.w - 8} y={SCANNER.y - 20} width={16} height={70} rx={3} fill="#8b969c" stroke={K} strokeWidth={3} />
        <rect x={SCANNER.x - 8} y={SCANNER.y - 30} width={SCANNER.w + 16} height={14} rx={3} fill="#3b4349" stroke={K} strokeWidth={3} />
        <text x={SCANNER.x + SCANNER.w / 2} y={SCANNER.y - 19} textAnchor="middle" fontSize={9} fontFamily="'Space Mono',monospace" fontWeight={700} fill="#7bbf5a">SECURITY SCAN</text>
      </g>
      <g transform={`translate(${FUSE.x},${FUSE.y - 46})`}>
        <rect x={-34} y={-14} width={68} height={50} rx={4} fill="#4a5359" stroke={K} strokeWidth={4} />
        <rect x={-26} y={-6} width={52} height={10} fill="url(#hazard)" stroke={K} strokeWidth={2} />
        {[-18, -6, 6, 18].map((x) => <rect key={x} x={x - 3} y={10} width={6} height={16} rx={2} fill="#1b2023" stroke={K} strokeWidth={1.5} />)}
        <text y={-20} textAnchor="middle" fontSize={13} fontFamily="'Space Mono',monospace" fontWeight={700} fill="#f5c518">⚡ FUSE BOX</text>
      </g>
      {ALARM_PANELS.map((a) => (
        <g key={a.id} transform={`translate(${a.x},${a.y})`}>
          <rect x={-26} y={-30} width={52} height={44} rx={5} fill="#b4441f" stroke={K} strokeWidth={4} />
          <circle cx={0} cy={-8} r={11} fill="#e23d4f" stroke={K} strokeWidth={3} />
          <text y={-38} textAnchor="middle" fontSize={13} fontFamily="'Space Mono',monospace" fontWeight={700} fill="#f07a1a">ALARM {a.id}</text>
        </g>
      ))}
      {labels && rooms.map((r) => (
        <g key={"s" + r.id} transform={`translate(${r.r.x + r.r.w / 2},${r.r.y + 4})`}>
          <rect x={-r.en.length * 8 - 18} y={-26} width={r.en.length * 16 + 36} height={44} rx={4} fill="#1b2023" stroke={K} strokeWidth={4} />
          <rect x={-r.en.length * 8 - 18} y={-26} width={10} height={44} fill={r.accent} stroke={K} strokeWidth={3} />
          <text x={4} y={-2} textAnchor="middle" fontSize={20} fontFamily="'Archivo Black',sans-serif" fill="#f2efe6">{r.en.toUpperCase()}</text>
          <text x={4} y={13} textAnchor="middle" fontSize={11} fontFamily="'Space Mono',monospace" fontWeight={700} fill={r.accent} letterSpacing="1.5">{r.es.toUpperCase()}</text>
        </g>
      ))}
    </g>
  );
});

/* the watchman NPC: idles, breathes and turns to look at whoever is nearby */
export function Watchman({ t = 0, lookDir = 1, alert = false }: { t?: number; lookDir?: number; alert?: boolean }) {
  return (
    <g transform={`translate(${GUARD.x},${GUARD.y + 6}) scale(${lookDir < 0 ? -0.82 : 0.82} 0.82)`}>
      <TeacherToon look={WATCHMAN} t={t} seed={3} />
      {alert && <text x={0} y={-215} textAnchor="middle" fontSize={40} fontFamily="'Archivo Black',sans-serif" fill="#f5c518" stroke={K} strokeWidth={5} paintOrder="stroke" transform={lookDir < 0 ? "scale(-1 1)" : undefined}>!</text>}
    </g>
  );
}

/* scanner arch light + locked bathroom door, drawn on top of the static map */
export function MapDynamic({ bathLocked, scanFlash = 0 }: { bathLocked?: boolean; scanFlash?: number }) {
  return (
    <g>
      {scanFlash > 0 && <rect x={SCANNER.x} y={SCANNER.y - 16} width={SCANNER.w} height={60} fill={`rgba(123,191,90,${0.45 * scanFlash})`} />}
      {bathLocked && (
        <g>
          <rect x={BATH_DOOR.x} y={BATH_DOOR.y + 20} width={BATH_DOOR.w} height={BATH_DOOR.h - 40} fill="#5a3d26" stroke={K} strokeWidth={4} />
          <g transform={`translate(${BATH_DOOR.x + BATH_DOOR.w / 2},${BATH_DOOR.y + BATH_DOOR.h / 2})`}>
            <rect x={-80} y={-12} width={160} height={24} fill="url(#hazard)" stroke={K} strokeWidth={3} transform="rotate(-14)" />
            <rect x={-80} y={-12} width={160} height={24} fill="url(#hazard)" stroke={K} strokeWidth={3} transform="rotate(14)" />
          </g>
          <g transform={`translate(${BATH_DOOR.x + BATH_DOOR.w / 2},${BATH_DOOR.y - 34})`}>
            <rect x={-150} y={-26} width={300} height={52} rx={5} fill="#f2efe6" stroke={K} strokeWidth={4} />
            <text y={-5} textAnchor="middle" fontSize={15} fontFamily="'Archivo Black',sans-serif" fill="#e23d4f">🚫 OUT OF ORDER 💩</text>
            <text y={15} textAnchor="middle" fontSize={13} fontFamily="'Space Mono',monospace" fontWeight={700} fill={K}>It's been bad-pooped!</text>
          </g>
        </g>
      )}
    </g>
  );
}
