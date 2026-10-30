/* ECYR English — branch floor plan (world units).
   Coordinates below are written in "plan units" and multiplied by MAP_SCALE at load time,
   so rooms, halls and doors are roomier while characters keep their size. */

export interface Rect { x: number; y: number; w: number; h: number }

export type Floor = "wood" | "tile" | "carpet" | "check" | "lab" | "marble" | "hall" | "rug";

export interface Room {
  id: string;
  en: string;
  es: string;
  /* one-line description used when a mission is completed in that room */
  about: string;
  r: Rect;
  floor: Floor;
  accent: string;
}

export interface Station {
  id: string;
  room: string;
  x: number;
  y: number;
  mission: string; // mission id
  label: string;
}

export const MAP_SCALE = 1.3;
export const WORLD = { w: 2780, h: 1900 };

export const rooms: Room[] = [
  { id: "kids", en: "Kids Classroom", es: "Aula Kids", about: "Where the youngest students learn with songs and games.", r: { x: 80, y: 60, w: 540, h: 440 }, floor: "rug", accent: "#7bbf5a" },
  { id: "library", en: "Library", es: "Biblioteca", about: "A quiet room where you borrow books and graded readers.", r: { x: 720, y: 60, w: 520, h: 440 }, floor: "carpet", accent: "#b4441f" },
  { id: "lab", en: "Language Lab", es: "Laboratorio", about: "Computers and headphones for listening practice.", r: { x: 1340, y: 60, w: 520, h: 440 }, floor: "lab", accent: "#3fa7d6" },
  { id: "teens", en: "Teens Classroom", es: "Aula Teens", about: "The classroom for teenage groups.", r: { x: 1960, y: 60, w: 380, h: 440 }, floor: "wood", accent: "#f07a1a" },
  { id: "cafe", en: "Cafeteria", es: "Cafetería", about: "Grab a coffee and a snack during the break.", r: { x: 80, y: 740, w: 540, h: 440 }, floor: "check", accent: "#e94f64" },
  { id: "reception", en: "Reception", es: "Recepción", about: "The front desk: enrolment, information and the emergency bell.", r: { x: 720, y: 740, w: 980, h: 440 }, floor: "marble", accent: "#f5c518" },
  { id: "adults", en: "Adults Classroom", es: "Aula Adultos", about: "Evening classes for adults and professionals.", r: { x: 1800, y: 740, w: 540, h: 440 }, floor: "wood", accent: "#9b6bd3" },
  { id: "teachers", en: "Teachers' Room", es: "Sala de Profesores", about: "Teachers plan lessons and mark tests here.", r: { x: 80, y: 1420, w: 540, h: 420 }, floor: "tile", accent: "#4fb39a" },
  { id: "exam", en: "Exam Room", es: "Sala de Exámenes", about: "Silence please! Official exams take place here.", r: { x: 720, y: 1420, w: 520, h: 420 }, floor: "tile", accent: "#d9d4c4" },
  { id: "office", en: "Director's Office", es: "Dirección", about: "The director signs certificates and meets parents.", r: { x: 1340, y: 1420, w: 520, h: 420 }, floor: "carpet", accent: "#c9a227" },
  { id: "speaking", en: "Speaking Corner", es: "Rincón de Conversación", about: "Sofas and plants: the place to practise conversation.", r: { x: 1960, y: 1420, w: 380, h: 420 }, floor: "rug", accent: "#e98fc0" },
  { id: "bath", en: "Bathrooms", es: "Baños", about: "Wash your hands! (When the bathrooms are open…)", r: { x: 2440, y: 740, w: 260, h: 440 }, floor: "tile", accent: "#3fa7d6" }
];

/* four glass-walled sales offices around the reception lobby */
export interface Office { id: string; en: string; es: string; r: Rect }
export const offices: Office[] = [
  { id: "sales1", en: "Sales Office 1", es: "Oficina de Ventas 1", r: { x: 720, y: 740, w: 190, h: 140 } },
  { id: "sales2", en: "Sales Office 2", es: "Oficina de Ventas 2", r: { x: 1510, y: 740, w: 190, h: 140 } },
  { id: "sales3", en: "Sales Office 3", es: "Oficina de Ventas 3", r: { x: 720, y: 1040, w: 190, h: 140 } },
  { id: "sales4", en: "Sales Office 4", es: "Oficina de Ventas 4", r: { x: 1510, y: 1040, w: 190, h: 140 } }
];
/* glass walls between the offices and the lobby; each office has a wide door gap on its lobby side */
export const glassWalls: Rect[] = offices.flatMap(({ r }) => {
  const left = r.x < 1200, top = r.y < 960, G = 16, DOOR = 96;
  const vx = left ? r.x + r.w : r.x - G;
  const hy = top ? r.y + r.h : r.y - G;
  const hx = left ? r.x : r.x - G;
  /* door gap in the vertical wall, next to the lobby corridor */
  const gapA = top ? r.y + r.h - DOOR : r.y, gapB = gapA + DOOR;
  return [
    { x: hx, y: hy, w: r.w + G, h: G },
    top ? { x: vx, y: r.y, w: G, h: gapA - r.y } : { x: vx, y: gapB, w: G, h: r.y + r.h - gapB }
  ];
});

export const halls: Rect[] = [
  { x: 80, y: 560, w: 2620, h: 120 },
  { x: 80, y: 1240, w: 2620, h: 120 }
];

export const BATH_DOOR: Rect & { v: boolean } = { x: 2490, y: 650, w: 160, h: 120, v: true };

/* doors: v = vertical passage (connects top/bottom), h = horizontal passage */
export const doors: (Rect & { v: boolean })[] = [
  // top rooms → upper hall
  { x: 270, y: 470, w: 160, h: 120, v: true },
  { x: 900, y: 470, w: 160, h: 120, v: true },
  { x: 1520, y: 470, w: 160, h: 120, v: true },
  { x: 2070, y: 470, w: 160, h: 120, v: true },
  // middle rooms ↔ halls
  { x: 270, y: 650, w: 160, h: 120, v: true },
  { x: 945, y: 650, w: 160, h: 120, v: true },
  { x: 1325, y: 650, w: 160, h: 120, v: true },
  { x: 1990, y: 650, w: 160, h: 120, v: true },
  { x: 270, y: 1150, w: 160, h: 120, v: true },
  { x: 1140, y: 1150, w: 160, h: 120, v: true },
  { x: 1990, y: 1150, w: 160, h: 120, v: true },
  // bottom rooms ← lower hall
  { x: 270, y: 1330, w: 160, h: 120, v: true },
  { x: 900, y: 1330, w: 160, h: 120, v: true },
  { x: 1520, y: 1330, w: 160, h: 120, v: true },
  { x: 2070, y: 1330, w: 160, h: 120, v: true },
  // reception side doors
  { x: 590, y: 880, w: 160, h: 160, v: false },
  { x: 1670, y: 880, w: 160, h: 160, v: false },
  BATH_DOOR
];

/* furniture players walk around: [rect, kind] */
export type Furniture = Rect & { kind: string; label?: string };
export const furniture: Furniture[] = [
  // kids
  { x: 150, y: 90, w: 300, h: 26, kind: "board", label: "red · blue · green" },
  { x: 150, y: 220, w: 110, h: 70, kind: "kidtable" }, { x: 330, y: 220, w: 110, h: 70, kind: "kidtable" },
  { x: 150, y: 360, w: 110, h: 70, kind: "kidtable" }, { x: 470, y: 330, w: 110, h: 110, kind: "toybox" },
  // library
  { x: 740, y: 90, w: 30, h: 360, kind: "shelf" }, { x: 1190, y: 90, w: 30, h: 360, kind: "shelf" },
  { x: 860, y: 110, w: 240, h: 30, kind: "shelfH" }, { x: 880, y: 260, w: 200, h: 90, kind: "readtable" },
  // lab
  { x: 1380, y: 120, w: 440, h: 50, kind: "labdesk" }, { x: 1380, y: 260, w: 180, h: 50, kind: "labdesk" }, { x: 1640, y: 260, w: 180, h: 50, kind: "labdesk" },
  // teens
  { x: 2000, y: 90, w: 300, h: 26, kind: "board", label: "Present Perfect" },
  { x: 2010, y: 200, w: 120, h: 60, kind: "desk" }, { x: 2180, y: 200, w: 120, h: 60, kind: "desk" },
  { x: 2010, y: 330, w: 120, h: 60, kind: "desk" },
  // cafe
  { x: 100, y: 770, w: 300, h: 50, kind: "counter" },
  { x: 160, y: 920, w: 90, h: 90, kind: "cafetable" }, { x: 380, y: 920, w: 90, h: 90, kind: "cafetable" }, { x: 270, y: 1060, w: 90, h: 90, kind: "cafetable" },
  // reception
  { x: 1125, y: 772, w: 180, h: 48, kind: "frontdesk" },
  { x: 1110, y: 900, w: 140, h: 140, kind: "bell" },
  // sales offices
  { x: 736, y: 758, w: 100, h: 40, kind: "salesdesk", label: "1" }, { x: 1590, y: 758, w: 100, h: 40, kind: "salesdesk", label: "2" },
  { x: 736, y: 1130, w: 100, h: 40, kind: "salesdesk", label: "3" }, { x: 1590, y: 1130, w: 100, h: 40, kind: "salesdesk", label: "4" },
  // bathrooms
  { x: 2620, y: 760, w: 70, h: 400, kind: "stalls" }, { x: 2452, y: 820, w: 34, h: 260, kind: "sinks" },
  // AC unit on the adults' classroom wall
  { x: 2190, y: 744, w: 130, h: 30, kind: "ac" },
  // the watchman's post in the south hallway
  { x: 1318, y: 1262, w: 44, h: 40, kind: "npc" },
  // adults
  { x: 1840, y: 770, w: 300, h: 26, kind: "board", label: "Phrasal verbs" },
  { x: 1890, y: 880, w: 330, h: 70, kind: "meeting" }, { x: 1890, y: 1040, w: 330, h: 70, kind: "meeting" },
  // teachers
  { x: 100, y: 1450, w: 40, h: 300, kind: "lockers" },
  { x: 240, y: 1560, w: 260, h: 120, kind: "bigtable" },
  { x: 460, y: 1760, w: 140, h: 60, kind: "sofa" },
  // exam
  { x: 780, y: 1520, w: 70, h: 50, kind: "examdesk" }, { x: 940, y: 1520, w: 70, h: 50, kind: "examdesk" }, { x: 1100, y: 1520, w: 70, h: 50, kind: "examdesk" },
  { x: 780, y: 1660, w: 70, h: 50, kind: "examdesk" }, { x: 940, y: 1660, w: 70, h: 50, kind: "examdesk" }, { x: 1100, y: 1660, w: 70, h: 50, kind: "examdesk" },
  { x: 920, y: 1780, w: 110, h: 40, kind: "clock" },
  // office
  { x: 1480, y: 1560, w: 240, h: 80, kind: "bossdesk" }, { x: 1360, y: 1450, w: 30, h: 220, kind: "frames" },
  { x: 1760, y: 1740, w: 80, h: 80, kind: "plant" },
  // speaking corner
  { x: 1990, y: 1460, w: 60, h: 160, kind: "sofaV" }, { x: 2250, y: 1460, w: 60, h: 160, kind: "sofaV" },
  { x: 2100, y: 1660, w: 100, h: 60, kind: "coffeetable" }, { x: 2260, y: 1760, w: 60, h: 60, kind: "plant" }
];

export const stations: Station[] = [
  { id: "s-kids", room: "kids", x: 520, y: 230, mission: "picture", label: "Picture cards" },
  { id: "s-library", room: "library", x: 980, y: 400, mission: "sort", label: "Shelve the words" },
  { id: "s-lab", room: "lab", x: 1600, y: 400, mission: "listen", label: "Listening booth" },
  { id: "s-teens", room: "teens", x: 2250, y: 360, mission: "unscramble", label: "Sentence builder" },
  { id: "s-cafe", room: "cafe", x: 470, y: 800, mission: "order", label: "Take the order" },
  { id: "s-reception", room: "reception", x: 1215, y: 852, mission: "phone", label: "Answer the phone" },
  { id: "s-ac", room: "adults", x: 2250, y: 830, mission: "ac", label: "Fix the AC" },
  { id: "s-books", room: "library", x: 1130, y: 200, mission: "books", label: "Find the missing books" },
  { id: "s-guard", room: "reception", x: 1300, y: 1305, mission: "security", label: "Security check" },
  { id: "s-bath", room: "bath", x: 2540, y: 1000, mission: "sign", label: "Fix the bathroom sign" },
  { id: "s-adults", room: "adults", x: 2080, y: 1150 - 30, mission: "grammar", label: "Fix the email" },
  { id: "s-teachers", room: "teachers", x: 370, y: 1740, mission: "spot", label: "Mark the test" },
  { id: "s-exam", room: "exam", x: 1180, y: 1460, mission: "gap", label: "Exam paper" },
  { id: "s-office", room: "office", x: 1600, y: 1720, mission: "levels", label: "File certificates" },
  { id: "s-speaking", room: "speaking", x: 2150, y: 1775, mission: "reply", label: "Small talk" }
];

export const BELL = { x: 1180, y: 970 };
export const RANGE = { use: 110, kill: 130, report: 150, bell: 150, vent: 95, fix: 110 };
export const VISION = { crew: 440, impostor: 560, lightsOut: 0.42 };

/* impostor vents: linked vents form a network you can hop through */
export interface Vent { id: string; x: number; y: number; room: string; links: string[] }
export const vents: Vent[] = [
  { id: "v-kids", x: 380, y: 462, room: "kids", links: ["v-cafe"] },
  { id: "v-cafe", x: 530, y: 1120, room: "cafe", links: ["v-kids", "v-teachers"] },
  { id: "v-teachers", x: 210, y: 1800, room: "teachers", links: ["v-cafe"] },
  { id: "v-library", x: 1150, y: 445, room: "library", links: ["v-reception"] },
  { id: "v-reception", x: 1600, y: 965, room: "reception", links: ["v-library", "v-exam"] },
  { id: "v-exam", x: 1185, y: 1785, room: "exam", links: ["v-reception"] },
  { id: "v-lab", x: 1410, y: 445, room: "lab", links: ["v-adults"] },
  { id: "v-adults", x: 1860, y: 1140, room: "adults", links: ["v-lab", "v-office", "v-speaking"] },
  { id: "v-office", x: 1410, y: 1790, room: "office", links: ["v-adults"] },
  { id: "v-speaking", x: 2060, y: 1790, room: "speaking", links: ["v-adults"] }
];

/* sabotage repair points */
export const FUSE = { x: 1300, y: 1290, label: "Fuse box" };
export const ALARM_PANELS: { id: "A" | "B"; x: number; y: number; room: string }[] = [
  { id: "A", x: 820, y: 430, room: "library" },
  { id: "B", x: 1790, y: 1500, room: "office" }
];


/* the watchman and his scanner arch */
export const GUARD = { x: 1340, y: 1300 };
export const SCANNER: Rect = { x: 1150, y: 1186, w: 140, h: 34 };

/* spots where the missing student books can be hidden */
export const BOOK_SPOTS = [
  { x: 815, y: 845 }, { x: 1605, y: 845 }, { x: 815, y: 1080 }, { x: 1605, y: 1080 },
  { x: 560, y: 120 }, { x: 160, y: 1130 }, { x: 1440, y: 1790 }, { x: 2600, y: 1300 },
  { x: 160, y: 620 }, { x: 1810, y: 620 }, { x: 1010, y: 1790 }, { x: 2210, y: 1680 },
  { x: 2300, y: 430 }, { x: 1800, y: 430 }, { x: 560, y: 1500 }
];

/* ---- apply MAP_SCALE once, to every coordinate above ---- */
(function scaleMap() {
  const k = MAP_SCALE, seen = new Set<object>();
  const sc = (o: { x: number; y: number; w?: number; h?: number }) => {
    if (seen.has(o)) return;
    seen.add(o);
    o.x = Math.round(o.x * k); o.y = Math.round(o.y * k);
    if (o.w !== undefined) o.w = Math.round(o.w * k);
    if (o.h !== undefined) o.h = Math.round(o.h * k);
  };
  WORLD.w = Math.round(WORLD.w * k); WORLD.h = Math.round(WORLD.h * k);
  rooms.forEach((r) => sc(r.r)); offices.forEach((o) => sc(o.r));
  [...glassWalls, ...halls, ...doors, ...furniture, ...stations, ...vents, ...ALARM_PANELS, ...BOOK_SPOTS].forEach(sc);
  [BELL, FUSE, GUARD, SCANNER].forEach(sc);
})();

/* ---- line of sight: walls block vision (furniture doesn't) ---- */
const CELL = 10;
const GW = Math.ceil(WORLD.w / CELL), GH = Math.ceil(WORLD.h / CELL);
let floorGrid: Uint8Array | null = null;
function grid() {
  if (floorGrid) return floorGrid;
  const g = new Uint8Array(GW * GH);
  const mark = (r: Rect) => {
    for (let y = Math.floor(r.y / CELL); y < Math.ceil((r.y + r.h) / CELL); y++)
      for (let x = Math.floor(r.x / CELL); x < Math.ceil((r.x + r.w) / CELL); x++)
        if (x >= 0 && y >= 0 && x < GW && y < GH) g[y * GW + x] = 1;
  };
  rooms.forEach((r) => mark(r.r));
  halls.forEach(mark);
  doors.forEach(mark);
  floorGrid = g;
  return g;
}
export function isFloor(x: number, y: number) {
  const cx = Math.floor(x / CELL), cy = Math.floor(y / CELL);
  if (cx < 0 || cy < 0 || cx >= GW || cy >= GH) return false;
  return grid()[cy * GW + cx] === 1;
}

/* ray-marched visibility polygon around the eye: flat [x0, y0, x1, y1, …] */
export function sightPoints(ex: number, ey: number, radius: number, rays = 160): Float32Array {
  const pts = new Float32Array(rays * 2);
  const step = 8;
  for (let i = 0; i < rays; i++) {
    const a = (i / rays) * Math.PI * 2;
    const dx = Math.cos(a), dy = Math.sin(a);
    let d = 0;
    while (d < radius) {
      d += step;
      /* step a little into the wall so the wall itself stays lit */
      if (!isFloor(ex + dx * d, ey + dy * d)) { d += 22; break; }
    }
    d = Math.min(d, radius);
    pts[i * 2] = ex + dx * d;
    pts[i * 2 + 1] = ey + dy * d;
  }
  return pts;
}

/* ghosts float through walls but stay inside the building */
export function ghostMove(x: number, y: number, dx: number, dy: number) {
  return { x: Math.max(60, Math.min(WORLD.w - 60, x + dx)), y: Math.max(60, Math.min(WORLD.h - 40, y + dy)) };
}
export const SPEED = 390; // units / second
export const RADIUS = 20;

export function spawnPoint(i: number, n: number) {
  const a = (i / Math.max(1, n)) * Math.PI * 2 - Math.PI / 2;
  return { x: Math.round(BELL.x + Math.cos(a) * 190), y: Math.round(BELL.y + Math.sin(a) * 150) };
}

const inside = (x: number, y: number, r: Rect, mx: number, my: number) =>
  x >= r.x + mx && x <= r.x + r.w - mx && y >= r.y + my && y <= r.y + r.h - my;

/* doors that are locked this game (e.g. the bathrooms) */
let blocked: Rect[] = [];
export function setBlocked(r: Rect[]) { blocked = r; }

export function walkable(x: number, y: number): boolean {
  const m = RADIUS;
  if (blocked.some((b) => x > b.x - 4 && x < b.x + b.w + 4 && y > b.y - 4 && y < b.y + b.h + 4)) return false;
  if (glassWalls.some((w) => x > w.x - 14 && x < w.x + w.w + 14 && y > w.y - 14 && y < w.y + w.h + 16)) return false;
  const onFloor =
    rooms.some((rm) => inside(x, y, rm.r, m, m)) ||
    halls.some((h) => inside(x, y, h, m, m)) ||
    doors.some((d) => inside(x, y, d, d.v ? m : 0, d.v ? 0 : m));
  if (!onFloor) return false;
  return !furniture.some((f) => x > f.x - m * 0.7 && x < f.x + f.w + m * 0.7 && y > f.y - m * 0.5 && y < f.y + f.h + m * 0.9);
}

/* axis-separated move so players slide along walls */
export function moveWithin(x: number, y: number, dx: number, dy: number) {
  let nx = x, ny = y;
  if (walkable(x + dx, y)) nx = x + dx;
  if (walkable(nx, y + dy)) ny = y + dy;
  return { x: nx, y: ny };
}

export function roomAt(x: number, y: number): Room | null {
  const o = offices.find((of) => inside(x, y, of.r, 0, 0));
  if (o) return { id: o.id, en: o.en, es: o.es, about: "", r: o.r, floor: "carpet", accent: "#f5c518" };
  return rooms.find((rm) => inside(x, y, rm.r, 0, 0)) || null;
}

export const dist = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.hypot(a.x - b.x, a.y - b.y);

/* true when nothing but floor lies between a and b */
export function lineOfSight(a: { x: number; y: number }, b: { x: number; y: number }) {
  const d = Math.hypot(b.x - a.x, b.y - a.y);
  const n = Math.ceil(d / 9);
  for (let i = 1; i < n; i++) {
    if (!isFloor(a.x + ((b.x - a.x) * i) / n, a.y + ((b.y - a.y) * i) / n)) return false;
  }
  return true;
}
