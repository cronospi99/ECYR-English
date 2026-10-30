/**
 * Classroom screen state: several "pantallas" (scenes), each with a background
 * and free-floating widgets. Everything lives in localStorage (best effort).
 */
import { create } from 'zustand';

export type WidgetKind =
  | 'timer'
  | 'stopwatch'
  | 'random'
  | 'groups'
  | 'clock'
  | 'traffic'
  | 'symbols'
  | 'noise'
  | 'poll'
  | 'text'
  | 'image'
  | 'video'
  | 'spotify'
  | 'dice'
  | 'score'
  | 'agenda'
  | 'draw'
  | 'qr'
  | 'countdown';

export interface WidgetInstance {
  id: string;
  kind: WidgetKind;
  x: number;
  y: number;
  w: number;
  h: number;
  z: number;
  min?: boolean;
  data: Record<string, unknown>;
}

export interface Scene {
  id: string;
  bg: string;
  widgets: WidgetInstance[];
}

interface ScreenState {
  scenes: Scene[];
  cur: number;
  focused: string | null;
  saveError: boolean;
  add: (w: Omit<WidgetInstance, 'id' | 'z'>) => string;
  patch: (id: string, p: Partial<WidgetInstance>) => void;
  setData: (id: string, d: Record<string, unknown>) => void;
  remove: (id: string) => void;
  focus: (id: string) => void;
  clear: () => void;
  setBg: (bg: string) => void;
  go: (i: number) => void;
  addScene: () => void;
  removeScene: () => void;
}

const KEY = 'ecyr.screen.v1';
export const uid = () => Math.random().toString(36).slice(2, 10);
const newScene = (bg = 'g:ocean'): Scene => ({ id: uid(), bg, widgets: [] });

function load(): Pick<ScreenState, 'scenes' | 'cur'> {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const v = JSON.parse(raw) as { scenes?: Scene[]; cur?: number };
      if (Array.isArray(v.scenes) && v.scenes.length) {
        const scenes = v.scenes
          .filter((s) => s && Array.isArray(s.widgets))
          .map((s) => ({
            id: String(s.id || uid()),
            bg: typeof s.bg === 'string' ? s.bg : 'g:ocean',
            widgets: s.widgets.filter((w) => w && typeof w.kind === 'string' && typeof w.x === 'number').map((w) => ({ ...w, data: w.data && typeof w.data === 'object' ? w.data : {} })),
          }));
        if (scenes.length) return { scenes, cur: Math.min(Math.max(0, v.cur ?? 0), scenes.length - 1) };
      }
    }
  } catch {
    /* corrupted or blocked storage */
  }
  return { scenes: [newScene()], cur: 0 };
}

const mapScene = (s: ScreenState, f: (sc: Scene) => Scene) => s.scenes.map((sc, i) => (i === s.cur ? f(sc) : sc));
const mapWidget = (s: ScreenState, id: string, f: (w: WidgetInstance) => WidgetInstance) =>
  mapScene(s, (sc) => ({ ...sc, widgets: sc.widgets.map((w) => (w.id === id ? f(w) : w)) }));
const topZ = (sc: Scene) => sc.widgets.reduce((m, w) => Math.max(m, w.z), 0);

export const useScreen = create<ScreenState>()((set) => ({
  ...load(),
  focused: null,
  saveError: false,
  add: (w) => {
    const id = uid();
    set((s) => ({ scenes: mapScene(s, (sc) => ({ ...sc, widgets: [...sc.widgets, { ...w, id, z: topZ(sc) + 1 }] })), focused: id }));
    return id;
  },
  patch: (id, p) => set((s) => ({ scenes: mapWidget(s, id, (w) => ({ ...w, ...p })) })),
  setData: (id, d) => set((s) => ({ scenes: mapWidget(s, id, (w) => ({ ...w, data: { ...w.data, ...d } })) })),
  remove: (id) => set((s) => ({ scenes: mapScene(s, (sc) => ({ ...sc, widgets: sc.widgets.filter((w) => w.id !== id) })) })),
  focus: (id) =>
    set((s) => {
      const sc = s.scenes[s.cur];
      const w = sc?.widgets.find((x) => x.id === id);
      if (!sc || !w) return {};
      const z = topZ(sc);
      if (w.z === z && s.focused === id) return {};
      return { focused: id, scenes: w.z === z ? s.scenes : mapWidget(s, id, (x) => ({ ...x, z: z + 1 })) };
    }),
  clear: () => set((s) => ({ scenes: mapScene(s, (sc) => ({ ...sc, widgets: [] })), focused: null })),
  setBg: (bg) => set((s) => ({ scenes: mapScene(s, (sc) => ({ ...sc, bg })) })),
  go: (i) => set((s) => ({ cur: Math.min(Math.max(0, i), s.scenes.length - 1), focused: null })),
  addScene: () => set((s) => ({ scenes: [...s.scenes, newScene(s.scenes[s.cur]?.bg)], cur: s.scenes.length, focused: null })),
  removeScene: () =>
    set((s) => {
      if (s.scenes.length <= 1) return { scenes: [newScene(s.scenes[0]?.bg)], cur: 0 };
      const scenes = s.scenes.filter((_, i) => i !== s.cur);
      return { scenes, cur: Math.min(s.cur, scenes.length - 1), focused: null };
    }),
}));

// Debounced save; a full quota (big images) only flags an error.
let timer: ReturnType<typeof setTimeout> | undefined;
useScreen.subscribe((s, prev) => {
  if (s.scenes === prev.scenes && s.cur === prev.cur) return;
  clearTimeout(timer);
  timer = setTimeout(() => {
    let ok = true;
    try {
      localStorage.setItem(KEY, JSON.stringify({ scenes: s.scenes, cur: s.cur }));
    } catch {
      ok = false;
    }
    if (useScreen.getState().saveError === ok) useScreen.setState({ saveError: !ok });
  }, 300);
});
