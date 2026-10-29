import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Check, Download, ImagePlus, Redo2, Trash2, Undo2, X, Square as SquareIcon, Circle as CircleIcon, Blend } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/Button';
import {
  FREEHAND,
  SHAPES,
  UNITS,
  applyStrokeStyle,
  composite,
  drawDot,
  drawSegment,
  drawShape,
  drawText,
  exportCompressed,
  floodFill,
  hexToRgb,
  loadImage,
  paintBackground,
  rgbToHex,
  toPixelRect,
  unionRect,
  widthAt,
  type Background,
  type Pt,
  type Rect,
  type StrokeStyle,
  type Tool,
} from './engine';
import {
  BACKGROUNDS,
  COMPACT_PALETTE,
  COMPACT_SIZES,
  COMPACT_TOOLS,
  KEY_TO_TOOL,
  PALETTE,
  SIZE_MAX,
  SIZE_MIN,
  TEXT_MAX,
  TEXT_MIN,
  TOOLS,
  TOOL_GROUPS,
} from './tools';
import { CustomColor, Group, RANGE_CSS, Slider, Swatch, ToolButton } from './parts';
import { StampOverlay, TextEditor, type StampDraft, type TextDraft } from './overlays';

export type { Background, Tool } from './engine';

export interface DrawingBoardProps {
  /** Shows a primary button that hands back the drawing as a compressed image data URL (webp/png, ≤ ~300 KB). */
  onDone?: (dataUrl: string) => void;
  doneLabel?: string;
  /** Image to start from (data URL or same-origin URL). */
  initial?: string;
  /** Width / height of the drawing surface (default 4/3). */
  aspect?: number;
  /** Fewer tools, bigger buttons (widgets, phones). */
  compact?: boolean;
  className?: string;
  /** Paper to start with (default 'white'). */
  defaultBackground?: Background;
  /** Tallest the drawing surface may get, as CSS length (default '72dvh', compact '60dvh'). */
  maxHeight?: string;
  /** Hide the “Descargar PNG” button. */
  hideDownload?: boolean;
  /** Called after every change with whether the board has any ink. */
  onChange?: (hasInk: boolean) => void;
  /**
   * Fill the parent's width AND height (the parent needs a definite height, e.g. a resizable
   * widget). The surface is contain-fitted, keeping `aspect`; `maxHeight` is ignored.
   */
  fill?: boolean;
}

interface HistoryEntry {
  x: number;
  y: number;
  before: ImageData;
  after: ImageData;
}

const MAX_HISTORY = 40;
const MAX_HISTORY_BYTES = 280 * 1024 * 1024;

/* Only one board on the page answers keyboard shortcuts: the last one touched. */
let activeBoard: symbol | null = null;

type Stroke = {
  pointerId: number;
  tool: Tool;
  pts: Pt[];
  start: { x: number; y: number };
  pen: boolean;
  bounds: Rect | null;
  style: StrokeStyle;
};

export function DrawingBoard({
  onDone,
  doneLabel = 'Listo',
  initial,
  aspect = 4 / 3,
  compact = false,
  className,
  defaultBackground = 'white',
  maxHeight,
  hideDownload = false,
  onChange,
  fill = false,
}: DrawingBoardProps) {
  const boardH = UNITS / aspect;
  const id = useMemo(() => Symbol('board'), []);

  /* ---------------------------------------------------------------- state */
  const [tool, setToolState] = useState<Tool>('pencil');
  const [color, setColor] = useState('#111111');
  const [sizes, setSizes] = useState<Record<Tool, number>>(
    () => Object.fromEntries(Object.values(TOOLS).map((t) => [t.id, t.size])) as Record<Tool, number>,
  );
  const [textSize, setTextSize] = useState(44);
  const [opacity, setOpacity] = useState(1);
  const [filled, setFilled] = useState(false);
  const [tolerance, setTolerance] = useState(24);
  const [bg, setBg] = useState<Background>(defaultBackground);
  const [hist, setHist] = useState({ u: 0, r: 0 });
  const [text, setText] = useState<TextDraft | null>(null);
  const [stamp, setStamp] = useState<StampDraft | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);
  const [busy, setBusy] = useState(false);
  const [scale, setScale] = useState(0.5); // css px per board unit

  const [fit, setFit] = useState<{ w: number; h: number } | null>(null);

  /* ---------------------------------------------------------------- refs */
  const rootRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const surfaceRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLCanvasElement>(null);
  const inkRef = useRef<HTMLCanvasElement>(null);
  const previewRef = useRef<HTMLCanvasElement>(null);
  const cursorRef = useRef<HTMLDivElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const committed = useRef<HTMLCanvasElement | null>(null);
  const kRef = useRef(1);
  const undoStack = useRef<HistoryEntry[]>([]);
  const redoStack = useRef<HistoryEntry[]>([]);
  const stroke = useRef<Stroke | null>(null);
  const prevTool = useRef<Tool>('pencil');
  const hasBase = useRef(false);
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const sizeTool: Tool = TOOLS[tool].size > 0 ? tool : prevTool.current;
  const size = sizes[sizeTool] ?? 6;

  const setTool = useCallback((t: Tool) => {
    setToolState((cur) => {
      if (TOOLS[cur].size > 0 && cur !== 'eraser') prevTool.current = cur;
      return t;
    });
  }, []);

  /* ---------------------------------------------------------------- setup */
  const ctxOf = (c: HTMLCanvasElement | null, read = false) =>
    c?.getContext('2d', read ? { willReadFrequently: true } : undefined) ?? null;

  /** Units transform on the ink + preview contexts. */
  const resetTransforms = useCallback(() => {
    const k = kRef.current;
    ctxOf(inkRef.current)?.setTransform(k, 0, 0, k, 0, 0);
    ctxOf(previewRef.current)?.setTransform(k, 0, 0, k, 0, 0);
  }, []);

  useLayoutEffect(() => {
    const surface = surfaceRef.current;
    const ink = inkRef.current;
    const prev = previewRef.current;
    const bgc = bgRef.current;
    if (!surface || !ink || !prev || !bgc) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 3);
    const cssW = Math.max(surface.clientWidth, Math.min(window.innerWidth, 1100));
    const W = Math.round(Math.min(2048, Math.max(900, cssW * dpr)));
    const H = Math.round(W / aspect);
    for (const c of [ink, prev, bgc]) {
      c.width = W;
      c.height = H;
    }
    const cm = document.createElement('canvas');
    cm.width = W;
    cm.height = H;
    committed.current = cm;
    kRef.current = W / UNITS;
    resetTransforms();
    undoStack.current = [];
    redoStack.current = [];
    setHist({ u: 0, r: 0 });
    hasBase.current = false;
  }, [aspect, resetTransforms]);

  // Paper
  useEffect(() => {
    const c = bgRef.current;
    const ctx = ctxOf(c);
    if (c && ctx) paintBackground(ctx, c.width, c.height, bg);
  }, [bg, aspect]);

  // Starting image (contain-fit, under any ink already there; not undoable)
  useEffect(() => {
    if (!initial) return;
    let live = true;
    loadImage(initial)
      .then((img) => {
        const ink = inkRef.current;
        const ctx = ctxOf(ink);
        const cm = committed.current;
        if (!live || !ink || !ctx || !cm) return;
        const s = Math.min(ink.width / img.width, ink.height / img.height);
        const w = img.width * s;
        const h = img.height * s;
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalCompositeOperation = 'destination-over';
        ctx.drawImage(img, (ink.width - w) / 2, (ink.height - h) / 2, w, h);
        ctx.restore();
        const cctx = ctxOf(cm, true)!;
        cctx.clearRect(0, 0, cm.width, cm.height);
        cctx.drawImage(ink, 0, 0);
        hasBase.current = true;
        onChangeRef.current?.(true);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [initial, aspect]);

  // Display scale (css px per unit) for overlays, cursor and the size preview
  useEffect(() => {
    const el = surfaceRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(el.clientWidth / UNITS || 0.5));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // fill mode: contain-fit the surface inside the stage (the space left under the toolbar)
  useEffect(() => {
    const el = stageRef.current;
    if (!fill || !el) return;
    const ro = new ResizeObserver(() => {
      const sw = el.clientWidth;
      const sh = el.clientHeight;
      if (!sw || !sh) return setFit(null);
      const w = Math.floor(Math.min(sw, sh * aspect));
      setFit({ w, h: Math.floor(w / aspect) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [fill, aspect]);

  // Active-board bookkeeping for shortcuts
  useEffect(() => {
    if (!activeBoard) activeBoard = id;
    return () => {
      if (activeBoard === id) activeBoard = null;
    };
  }, [id]);

  /* ---------------------------------------------------------------- history */
  const notify = () => onChangeRef.current?.(undoStack.current.length > 0 || hasBase.current);

  /** Records the change inside `px` (pixel rect) as one undo step. */
  const commit = useCallback((px: Rect | null) => {
    const ink = inkRef.current;
    const cm = committed.current;
    if (!px || !ink || !cm) return;
    const ctx = ctxOf(ink)!;
    const cctx = ctxOf(cm, true)!;
    const before = cctx.getImageData(px.x, px.y, px.w, px.h);
    const after = ctx.getImageData(px.x, px.y, px.w, px.h);
    cctx.putImageData(after, px.x, px.y);
    const u = undoStack.current;
    u.push({ x: px.x, y: px.y, before, after });
    let bytes = u.reduce((n, e) => n + e.before.data.length * 2, 0);
    while (u.length > MAX_HISTORY || (bytes > MAX_HISTORY_BYTES && u.length > 1)) {
      bytes -= u.shift()!.before.data.length * 2;
    }
    redoStack.current = [];
    setHist({ u: u.length, r: 0 });
    notify();
  }, []);

  const undo = useCallback(() => {
    const e = undoStack.current.pop();
    if (!e) return;
    ctxOf(inkRef.current)?.putImageData(e.before, e.x, e.y);
    ctxOf(committed.current, true)?.putImageData(e.before, e.x, e.y);
    redoStack.current.push(e);
    setHist({ u: undoStack.current.length, r: redoStack.current.length });
    notify();
  }, []);

  const redo = useCallback(() => {
    const e = redoStack.current.pop();
    if (!e) return;
    ctxOf(inkRef.current)?.putImageData(e.after, e.x, e.y);
    ctxOf(committed.current, true)?.putImageData(e.after, e.x, e.y);
    undoStack.current.push(e);
    setHist({ u: undoStack.current.length, r: redoStack.current.length });
    notify();
  }, []);

  const clearAll = useCallback(() => {
    const ink = inkRef.current;
    if (!ink) return;
    const ctx = ctxOf(ink)!;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, ink.width, ink.height);
    ctx.restore();
    commit({ x: 0, y: 0, w: ink.width, h: ink.height });
    setConfirmClear(false);
  }, [commit]);

  useEffect(() => {
    if (!confirmClear) return;
    const t = setTimeout(() => setConfirmClear(false), 4000);
    return () => clearTimeout(t);
  }, [confirmClear]);

  /* ---------------------------------------------------------------- helpers */
  const toUnits = (e: { clientX: number; clientY: number }) => {
    const r = surfaceRef.current!.getBoundingClientRect();
    return { x: ((e.clientX - r.left) / r.width) * UNITS, y: ((e.clientY - r.top) / r.height) * boardH };
  };

  const clearPreview = () => {
    const c = previewRef.current;
    const ctx = ctxOf(c);
    if (!c || !ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.restore();
  };

  const toPx = (r: Rect | null) => {
    const ink = inkRef.current;
    return r && ink ? toPixelRect(r, kRef.current, ink.width, ink.height) : null;
  };

  const pickColor = (u: { x: number; y: number }) => {
    const ink = inkRef.current;
    const ctx = ctxOf(ink);
    if (!ink || !ctx) return;
    const k = kRef.current;
    const px = Math.min(ink.width - 1, Math.max(0, Math.floor(u.x * k)));
    const py = Math.min(ink.height - 1, Math.max(0, Math.floor(u.y * k)));
    const d = ctx.getImageData(px, py, 1, 1).data;
    const a = d[3] / 255;
    // Over white paper (what you see), so semi-transparent ink picks its visible colour.
    setColor(rgbToHex(d[0] * a + 255 * (1 - a), d[1] * a + 255 * (1 - a), d[2] * a + 255 * (1 - a)));
    setTool(prevTool.current);
  };

  const textRef = useRef<TextDraft | null>(null);
  const editText = (t: TextDraft | null) => {
    textRef.current = t;
    setText(t);
  };

  const commitText = () => {
    const t = textRef.current;
    if (!t) return;
    editText(null);
    if (!t.value.trim()) return;
    const ctx = ctxOf(inkRef.current);
    if (!ctx) return;
    ctx.save();
    ctx.globalAlpha = opacity;
    const b = drawText(ctx, t.value.replace(/\s+$/, ''), t.x, t.y, textSize, color);
    ctx.restore();
    commit(toPx(b));
  };

  const commitStamp = () => {
    if (!stamp) return;
    const ctx = ctxOf(inkRef.current);
    if (ctx) {
      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(stamp.img, stamp.x, stamp.y, stamp.w, stamp.h);
      ctx.restore();
      commit(toPx({ x: stamp.x, y: stamp.y, w: stamp.w, h: stamp.h }));
    }
    setStamp(null);
  };

  const onFile = async (file: File | undefined) => {
    if (!file || !file.type.startsWith('image/')) return;
    const src = await new Promise<string>((res, rej) => {
      const fr = new FileReader();
      fr.onload = () => res(String(fr.result));
      fr.onerror = rej;
      fr.readAsDataURL(file);
    });
    const img = await loadImage(src).catch(() => null);
    if (!img) return;
    const s = Math.min((UNITS * 0.6) / img.width, (boardH * 0.6) / img.height);
    const w = img.width * s;
    const h = img.height * s;
    setStamp({ src, img, x: (UNITS - w) / 2, y: (boardH - h) / 2, w, h });
  };

  /* ---------------------------------------------------------------- pointer */
  const updateCursor = (e: React.PointerEvent, show: boolean) => {
    const el = cursorRef.current;
    if (!el) return;
    const visible = show && e.pointerType !== 'touch' && (FREEHAND.includes(tool) || tool === 'eraser');
    el.style.opacity = visible ? '1' : '0';
    if (!visible) return;
    const r = surfaceRef.current!.getBoundingClientRect();
    const d = Math.max(4, (tool === 'brush' ? size * 1.15 : size) * scale);
    el.style.width = el.style.height = `${d}px`;
    el.style.transform = `translate(${e.clientX - r.left - d / 2}px, ${e.clientY - r.top - d / 2}px)`;
  };

  const onPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activeBoard = id;
    if (!e.isPrimary || (e.pointerType === 'mouse' && e.button !== 0)) return;
    if (text) {
      e.preventDefault();
      commitText();
      return;
    }
    if (stamp) return;
    const u = toUnits(e);
    const ink = inkRef.current;
    const k = kRef.current;
    if (!ink) return;

    if (tool === 'eyedropper') return pickColor(u);
    if (tool === 'fill') {
      const ctx = ctxOf(ink)!;
      const [r, g, b] = hexToRgb(color);
      const rect = floodFill(ctx, u.x * k, u.y * k, [r, g, b, Math.round(opacity * 255)], tolerance, k > 1.6 ? 2 : 1);
      commit(rect);
      return;
    }
    if (tool === 'text') {
      e.preventDefault();
      editText({ x: u.x, y: Math.max(0, u.y - textSize * 0.6), value: '' });
      return;
    }

    e.currentTarget.setPointerCapture(e.pointerId);
    const pen = e.pointerType === 'pen';
    const style: StrokeStyle = { tool, color, size, k };
    const pt: Pt = { ...u, p: pen ? e.pressure || 0.5 : 0.5 };
    stroke.current = { pointerId: e.pointerId, tool, pts: [pt], start: u, pen, bounds: null, style };

    const prev = previewRef.current!;
    prev.style.opacity = String(tool === 'highlighter' ? opacity * 0.42 : opacity);
    prev.style.mixBlendMode = tool === 'highlighter' ? 'multiply' : 'normal';

    if (FREEHAND.includes(tool)) {
      const ctx = ctxOf(tool === 'eraser' ? ink : prev)!;
      ctx.save();
      applyStrokeStyle(ctx, style);
      const w = widthAt(style, pt.p, pen);
      drawDot(ctx, style, pt, w);
      ctx.restore();
      const pad = size * 1.4 + 4;
      stroke.current.bounds = { x: u.x - pad, y: u.y - pad, w: pad * 2, h: pad * 2 };
    }
  };

  const onPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    updateCursor(e, true);
    const s = stroke.current;
    if (!s || e.pointerId !== s.pointerId) return;
    const events = typeof e.nativeEvent.getCoalescedEvents === 'function' ? e.nativeEvent.getCoalescedEvents() : [];
    const list = events.length ? events : [e.nativeEvent];

    if (FREEHAND.includes(s.tool)) {
      const ctx = ctxOf(s.tool === 'eraser' ? inkRef.current : previewRef.current)!;
      ctx.save();
      applyStrokeStyle(ctx, s.style);
      const pad = s.style.size * 1.4 + 4;
      for (const ev of list) {
        const u = toUnits(ev);
        const last = s.pts[s.pts.length - 1];
        if (Math.hypot(u.x - last.x, u.y - last.y) < 0.6) continue;
        s.pts.push({ ...u, p: s.pen ? ev.pressure || 0.5 : 0.5 });
        drawSegment(ctx, s.style, s.pts, s.pen);
        s.bounds = unionRect(s.bounds, { x: u.x - pad, y: u.y - pad, w: pad * 2, h: pad * 2 });
      }
      ctx.restore();
    } else if (SHAPES.includes(s.tool)) {
      clearPreview();
      const ctx = ctxOf(previewRef.current)!;
      s.bounds = drawShape(ctx, { tool: s.tool, color: s.style.color, size: s.style.size, filled, constrain: e.shiftKey }, s.start, toUnits(e));
    }
  };

  const finishStroke = (e: React.PointerEvent<HTMLCanvasElement>, cancelled = false) => {
    const s = stroke.current;
    if (!s || e.pointerId !== s.pointerId) return;
    stroke.current = null;
    const ink = inkRef.current!;
    const prev = previewRef.current!;
    if (FREEHAND.includes(s.tool) && s.pts.length > 1) {
      const ctx = ctxOf(s.tool === 'eraser' ? ink : prev)!;
      ctx.save();
      applyStrokeStyle(ctx, s.style);
      drawSegment(ctx, s.style, s.pts, s.pen, true);
      ctx.restore();
    }
    if (s.tool !== 'eraser' && !cancelled) {
      const ctx = ctxOf(ink)!;
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.globalAlpha = Number(prev.style.opacity || 1);
      ctx.globalCompositeOperation = s.tool === 'highlighter' ? 'multiply' : 'source-over';
      ctx.drawImage(prev, 0, 0);
      ctx.restore();
    }
    clearPreview();
    prev.style.mixBlendMode = 'normal';
    commit(toPx(s.bounds));
  };

  /* ---------------------------------------------------------------- export */
  const flushPending = () => {
    if (text) commitText();
    if (stamp) commitStamp();
  };

  const download = () => {
    flushPending();
    requestAnimationFrame(() => {
      const ink = inkRef.current;
      if (!ink) return;
      composite(ink, bg).toBlob((blob) => {
        if (!blob) return;
        const a = document.createElement('a');
        const d = new Date();
        const pad = (n: number) => String(n).padStart(2, '0');
        a.download = `pizarra-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}.png`;
        a.href = URL.createObjectURL(blob);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(a.href), 4000);
      }, 'image/png');
    });
  };

  const done = () => {
    if (!onDone) return;
    flushPending();
    setBusy(true);
    // Let the commit paint and the spinner show before the (sync) encode.
    setTimeout(() => {
      const ink = inkRef.current;
      try {
        if (ink) onDone(exportCompressed(ink, bg));
      } finally {
        setBusy(false);
      }
    }, 30);
  };

  /* ---------------------------------------------------------------- keyboard */
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  useLayoutEffect(() => {
    keyHandler.current = (e: KeyboardEvent) => {
      if (activeBoard !== id) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) {
        if (!(t instanceof HTMLInputElement && t.type === 'range')) return;
      }
      const mod = e.ctrlKey || e.metaKey;
      const key = e.key.toLowerCase();
      if (stamp) {
        if (e.key === 'Enter') commitStamp();
        if (e.key === 'Escape') setStamp(null);
        return;
      }
      if (mod && key === 'z') {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && key === 'y') {
        e.preventDefault();
        redo();
        return;
      }
      if (mod || e.altKey) return;
      if (e.key === '[' || e.key === ']') {
        e.preventDefault();
        const dir = e.key === ']' ? 1 : -1;
        if (tool === 'text') setTextSize((v) => Math.min(TEXT_MAX, Math.max(TEXT_MIN, v + dir * 4)));
        else
          setSizes((s) => {
            const v = s[sizeTool];
            const step = v < 10 ? 1 : v < 30 ? 2 : 4;
            return { ...s, [sizeTool]: Math.min(SIZE_MAX, Math.max(SIZE_MIN, v + dir * step)) };
          });
        return;
      }
      const next = KEY_TO_TOOL[key];
      if (next && (!compact || COMPACT_TOOLS.includes(next))) {
        e.preventDefault();
        setTool(next);
      }
    };
  });
  useEffect(() => {
    const h = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, []);

  /* ---------------------------------------------------------------- ui bits */
  const chooseColor = (hex: string) => {
    setColor(hex);
    if (tool === 'eraser' || tool === 'eyedropper') setTool(prevTool.current);
  };

  const setSize = (v: number) => {
    if (tool === 'text') setTextSize(v);
    else setSizes((s) => ({ ...s, [sizeTool]: v }));
  };

  const palette = compact ? COMPACT_PALETTE.map((hex) => ({ hex, name: PALETTE.find((p) => p.hex === hex)?.name ?? hex })) : PALETTE;
  const inPalette = palette.some((p) => p.hex === color);
  const toolList = compact ? [COMPACT_TOOLS] : TOOL_GROUPS;
  const showSize = FREEHAND.includes(tool) || SHAPES.includes(tool) || tool === 'text';
  const dot = Math.max(3, Math.min(30, size * scale * (tool === 'brush' ? 1.15 : 1)));
  const mh = maxHeight ?? (compact ? '60dvh' : '72dvh');
  const cursor =
    tool === 'text' ? 'text' : tool === 'eyedropper' || tool === 'fill' ? 'crosshair' : FREEHAND.includes(tool) ? 'none' : 'crosshair';

  const sizePreview = (
    <span className="grid h-8 w-8 shrink-0 place-items-center" aria-hidden>
      <span
        className="block rounded-full"
        style={{
          width: dot,
          height: dot,
          background: tool === 'eraser' ? 'transparent' : color,
          opacity: tool === 'highlighter' ? opacity * 0.5 : opacity,
          boxShadow: tool === 'eraser' || color === '#ffffff' ? 'inset 0 0 0 1.5px var(--label-3)' : '0 0 0 1px color-mix(in srgb, var(--label) 14%, transparent)',
          filter: tool === 'brush' ? `blur(${Math.min(4, dot * 0.15)}px)` : undefined,
        }}
      />
    </span>
  );

  const historyButtons = (
    <Group className={compact ? 'ml-auto' : 'order-2 sm:order-5'}>
      <ToolButton big={compact} label="Deshacer (Ctrl+Z)" onClick={undo} disabled={hist.u === 0}>
        <Undo2 size={compact ? 22 : 19} strokeWidth={2.2} />
      </ToolButton>
      <ToolButton big={compact} label="Rehacer (Ctrl+Shift+Z)" onClick={redo} disabled={hist.r === 0}>
        <Redo2 size={compact ? 22 : 19} strokeWidth={2.2} />
      </ToolButton>
    </Group>
  );

  const clearButton = confirmClear ? (
    <Group className={cn('bg-[color-mix(in_srgb,var(--red)_14%,transparent)]', !compact && 'order-3 sm:order-7')}>
      <button
        type="button"
        onClick={clearAll}
        className={cn('bg-ios-red rounded-[12px] px-3 text-[14px] font-semibold text-white', compact ? 'h-11' : 'h-9 sm:h-10')}
      >
        ¿Borrar todo?
      </button>
      <ToolButton big={compact} label="Cancelar" onClick={() => setConfirmClear(false)}>
        <X size={18} strokeWidth={2.4} />
      </ToolButton>
    </Group>
  ) : (
    <Group className={compact ? undefined : 'order-3 sm:order-7'}>
      <ToolButton big={compact} label="Borrar todo" onClick={() => setConfirmClear(true)} disabled={hist.u === 0 && !hasBase.current}>
        <Trash2 size={compact ? 22 : 19} strokeWidth={2.1} />
      </ToolButton>
    </Group>
  );

  return (
    <div
      ref={rootRef}
      className={cn('flex w-full min-w-0 flex-col gap-2.5', fill && 'h-full min-h-0', className)}
      onPointerDownCapture={() => (activeBoard = id)}
      onFocusCapture={() => (activeBoard = id)}
    >
      <style>{RANGE_CSS}</style>

      {/* ------------------------------------------------ toolbar */}
      <div className="bg-card shadow-card flex flex-col gap-2 rounded-[18px] p-2">
        <div className={cn('flex flex-wrap items-center', compact ? 'gap-1' : 'gap-1.5')}>
          {toolList.map((group, gi) => (
            <Group key={gi} className={compact ? undefined : ['order-1', 'order-4 sm:order-2', 'order-5 sm:order-3'][gi]}>
              {group.map((t) => {
                const M = TOOLS[t];
                const Icon = M.icon;
                return (
                  <ToolButton key={t} big={compact} label={`${M.label} (${M.key})`} active={tool === t} onClick={() => setTool(t)}>
                    <Icon size={compact ? 23 : 19} strokeWidth={2.1} />
                  </ToolButton>
                );
              })}
            </Group>
          ))}
          {compact && (
            <Group>
              {COMPACT_SIZES.map((s) => (
                <button
                  key={s}
                  type="button"
                  aria-label={`Grosor ${s}`}
                  title={`Grosor ${s}`}
                  aria-pressed={size === s}
                  onClick={() => setSize(s)}
                  className={cn(
                    'grid h-9 w-10 shrink-0 place-items-center rounded-[12px] transition-colors',
                    size === s ? 'bg-card shadow-[0_2px_8px_-2px_rgb(0_0_0/0.2)]' : 'hover:bg-fill-2',
                  )}
                >
                  <span className="bg-label block rounded-full" style={{ width: 4 + s * 0.6, height: 4 + s * 0.6 }} />
                </button>
              ))}
            </Group>
          )}
          {!compact && <div className="hidden flex-1 sm:order-4 sm:block" />}
          {historyButtons}
          {!compact && (
            <Group className="order-6">
              <ToolButton label="Insertar imagen" onClick={() => fileRef.current?.click()}>
                <ImagePlus size={19} strokeWidth={2.1} />
              </ToolButton>
              {!hideDownload && (
                <ToolButton label="Descargar PNG" onClick={download}>
                  <Download size={19} strokeWidth={2.1} />
                </ToolButton>
              )}
            </Group>
          )}
          {clearButton}
        </div>

        {/* ------------------------------------------------ properties */}
        <div className={cn('flex flex-wrap items-center gap-x-4 gap-y-2', compact ? 'px-0.5' : 'px-1')}>
          <div className={cn('flex flex-wrap items-center', compact ? 'gap-2' : 'gap-1.5')} role="group" aria-label="Colores">
            {palette.map((p) => (
              <Swatch key={p.hex} hex={p.hex} name={p.name} big={compact} active={color === p.hex} onClick={() => chooseColor(p.hex)} />
            ))}
            <CustomColor value={color} onChange={chooseColor} big={compact} active={!inPalette} />
          </div>
          {!compact && (
            <div className="flex min-w-[260px] flex-1 flex-wrap items-center gap-x-4 gap-y-2">
              {showSize && (
                <Slider
                  className="min-w-[180px] flex-1"
                  label={tool === 'text' ? 'Tamaño de letra ([ ])' : 'Grosor ([ ])'}
                  value={tool === 'text' ? textSize : size}
                  min={tool === 'text' ? TEXT_MIN : SIZE_MIN}
                  max={tool === 'text' ? TEXT_MAX : SIZE_MAX}
                  onChange={setSize}
                  preview={
                    tool === 'text' ? (
                      <span className="text-label relative grid h-8 w-8 shrink-0 place-items-center text-[17px] font-bold" aria-hidden>
                        Aa
                        <span className="absolute inset-x-1.5 bottom-0.5 h-[3px] rounded-full" style={{ background: color }} />
                      </span>
                    ) : (
                      sizePreview
                    )
                  }
                />
              )}
              {(tool === 'rect' || tool === 'ellipse') && (
                <div className="bg-fill-2 flex items-center gap-0.5 rounded-[11px] p-0.5" role="group" aria-label="Estilo de forma">
                  {[false, true].map((f) => (
                    <button
                      key={String(f)}
                      type="button"
                      title={f ? 'Relleno' : 'Contorno'}
                      aria-label={f ? 'Relleno' : 'Contorno'}
                      aria-pressed={filled === f}
                      onClick={() => setFilled(f)}
                      className={cn(
                        'flex h-8 items-center gap-1.5 rounded-[9px] px-2.5 text-[13px] font-semibold transition-colors',
                        filled === f ? 'bg-card text-label shadow-[0_2px_6px_-2px_rgb(0_0_0/0.25)]' : 'text-label-2 hover:text-label',
                      )}
                    >
                      {tool === 'rect' ? (
                        <SquareIcon size={15} strokeWidth={2.4} fill={f ? 'currentColor' : 'none'} />
                      ) : (
                        <CircleIcon size={15} strokeWidth={2.4} fill={f ? 'currentColor' : 'none'} />
                      )}
                      {f ? 'Relleno' : 'Contorno'}
                    </button>
                  ))}
                </div>
              )}
              {tool === 'fill' && (
                <Slider
                  className="min-w-[180px] flex-1"
                  label="Tolerancia del relleno"
                  value={tolerance}
                  min={0}
                  max={100}
                  onChange={setTolerance}
                  display={`${tolerance}%`}
                  preview={
                    <span className="text-label-2 grid h-8 w-8 shrink-0 place-items-center" aria-hidden>
                      <Blend size={18} />
                    </span>
                  }
                />
              )}
              {tool !== 'eraser' && tool !== 'eyedropper' && (
                <Slider
                  className="min-w-[150px] flex-1"
                  label="Opacidad"
                  value={Math.round(opacity * 100)}
                  min={10}
                  max={100}
                  step={5}
                  onChange={(v) => setOpacity(v / 100)}
                  display={`${Math.round(opacity * 100)}%`}
                  preview={
                    <span className="grid h-8 w-8 shrink-0 place-items-center" aria-hidden>
                      <span
                        className="relative block h-6 w-6 overflow-hidden rounded-full"
                        style={{
                          background: 'repeating-conic-gradient(#c7cad1 0 25%, #fff 0 50%) 50% / 8px 8px',
                          boxShadow: '0 0 0 1px color-mix(in srgb, var(--label) 14%, transparent)',
                        }}
                      >
                        <span className="absolute inset-0" style={{ background: color, opacity }} />
                      </span>
                    </span>
                  }
                />
              )}
              <div className="ml-auto flex items-center gap-0.5" role="group" aria-label="Fondo">
                {BACKGROUNDS.map((b) => {
                  const Icon = b.icon;
                  return (
                    <button
                      key={b.id}
                      type="button"
                      title={`Fondo: ${b.label}`}
                      aria-label={`Fondo: ${b.label}`}
                      aria-pressed={bg === b.id}
                      onClick={() => setBg(b.id)}
                      className={cn(
                        'grid h-8 w-8 place-items-center rounded-[9px] transition-colors',
                        bg === b.id ? 'bg-label text-bg' : 'text-label-2 hover:bg-fill-2',
                      )}
                    >
                      <Icon size={16} strokeWidth={2.2} />
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ------------------------------------------------ surface */}
      <div
        ref={stageRef}
        className={cn(fill ? 'relative grid min-h-[120px] flex-1 place-items-center' : 'contents')}
      >
      <div
        ref={surfaceRef}
        className="relative mx-auto touch-none overflow-hidden rounded-[16px] shadow-[0_1px_2px_rgb(0_0_0/0.06),0_10px_30px_-14px_rgb(0_0_0/0.3),0_0_0_0.5px_var(--separator)] select-none"
        style={{
          aspectRatio: String(aspect),
          ...(fill
            ? fit
              ? { width: fit.w, height: fit.h }
              : { width: '100%', maxHeight: '100%' }
            : { width: `min(100%, calc(${mh} * ${aspect}))` }),
          background:
            bg === 'none'
              ? 'repeating-conic-gradient(#e9ebef 0 25%, #f8f9fa 0 50%) 0 0 / 20px 20px'
              : '#fff',
        }}
        onContextMenu={(e) => e.preventDefault()}
      >
        <canvas ref={bgRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        <canvas ref={inkRef} className="pointer-events-none absolute inset-0 h-full w-full" />
        <canvas
          ref={previewRef}
          className="absolute inset-0 h-full w-full touch-none"
          style={{ cursor }}
          aria-label="Lienzo de dibujo"
          role="img"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={(e) => finishStroke(e)}
          onPointerCancel={(e) => finishStroke(e, true)}
          onPointerLeave={(e) => updateCursor(e, false)}
          onLostPointerCapture={(e) => finishStroke(e)}
        />
        <div
          ref={cursorRef}
          aria-hidden
          className="pointer-events-none absolute top-0 left-0 rounded-full opacity-0"
          style={{ boxShadow: '0 0 0 1px rgb(0 0 0 / 0.65), inset 0 0 0 1px rgb(255 255 255 / 0.9)' }}
        />
        {text && (
          <TextEditor
            draft={text}
            boardH={boardH}
            scale={scale}
            size={textSize}
            color={color}
            opacity={opacity}
            onChange={(value) => textRef.current && editText({ ...textRef.current, value })}
            onCommit={commitText}
            onCancel={() => editText(null)}
          />
        )}
        {stamp && (
          <StampOverlay
            stamp={stamp}
            boardH={boardH}
            scale={scale}
            onChange={setStamp}
            onCommit={commitStamp}
            onCancel={() => setStamp(null)}
          />
        )}
      </div>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          void onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />

      {onDone && (
        <div className="flex justify-end">
          <Button variant="brand" size={compact && !fill ? 'lg' : 'md'} onClick={done} disabled={busy} className={cn(compact && 'w-full sm:w-auto')}>
            <Check size={19} strokeWidth={2.6} />
            {busy ? 'Guardando…' : doneLabel}
          </Button>
        </div>
      )}
    </div>
  );
}

export default DrawingBoard;
