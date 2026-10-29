import { useEffect, useRef, useState } from 'react';
import { Check, X } from 'lucide-react';
import { TEXT_LINE, UNITS, textFont } from './engine';

let measureCtx: CanvasRenderingContext2D | null = null;
function measure(text: string, size: number) {
  measureCtx ??= document.createElement('canvas').getContext('2d');
  if (!measureCtx) return text.length * size * 0.6;
  measureCtx.font = textFont(size);
  return Math.max(...text.split('\n').map((l) => measureCtx!.measureText(l).width));
}

export interface TextDraft {
  x: number; // units, top-left
  y: number;
  value: string;
}

/** Inline textarea that sits exactly where the text will be painted. */
export function TextEditor({
  draft,
  boardH,
  scale,
  size,
  color,
  opacity,
  onChange,
  onCommit,
  onCancel,
}: {
  draft: TextDraft;
  boardH: number;
  scale: number; // css px per unit
  size: number; // units
  color: string;
  opacity: number;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    // Focus after the pointerdown that opened us has finished.
    const id = requestAnimationFrame(() => ref.current?.focus());
    return () => cancelAnimationFrame(id);
  }, []);
  const lines = draft.value.split('\n').length;
  const widthUnits = measure(draft.value || 'M', size) + size * 0.8;
  const maxW = (UNITS - draft.x) * scale;
  return (
    <textarea
      ref={ref}
      value={draft.value}
      aria-label="Escribe tu texto"
      placeholder="Escribe…"
      spellCheck={false}
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onPointerDown={(e) => e.stopPropagation()}
      onKeyDown={(e) => {
        e.stopPropagation();
        if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        } else if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault();
          onCommit();
        }
      }}
      className="absolute z-20 m-0 resize-none overflow-hidden border-0 bg-transparent p-0 placeholder:text-black/30"
      style={{
        left: `${(draft.x / UNITS) * 100}%`,
        top: `${(draft.y / boardH) * 100}%`,
        width: Math.min(widthUnits * scale, maxW),
        height: lines * size * TEXT_LINE * scale + 2,
        font: textFont(size * scale),
        lineHeight: TEXT_LINE,
        color,
        opacity,
        outline: '1.5px dashed color-mix(in srgb, var(--blue) 80%, transparent)',
        outlineOffset: 4,
        borderRadius: 2,
        whiteSpace: 'pre',
        letterSpacing: 0,
      }}
    />
  );
}

export interface StampDraft {
  src: string;
  img: HTMLImageElement;
  x: number;
  y: number;
  w: number;
  h: number;
}

/** A placed image you can drag and resize before stamping it onto the board. */
export function StampOverlay({
  stamp,
  boardH,
  scale,
  onChange,
  onCommit,
  onCancel,
}: {
  stamp: StampDraft;
  boardH: number;
  scale: number;
  onChange: (s: StampDraft) => void;
  onCommit: () => void;
  onCancel: () => void;
}) {
  const drag = useRef<{ mode: 'move' | 'size'; cx: number; cy: number; s: StampDraft } | null>(null);
  const [grabbing, setGrabbing] = useState(false);
  const ratio = stamp.w / stamp.h;

  const down = (mode: 'move' | 'size') => (e: React.PointerEvent) => {
    e.stopPropagation();
    e.preventDefault();
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { mode, cx: e.clientX, cy: e.clientY, s: stamp };
    setGrabbing(true);
  };
  const move = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.cx) / scale;
    const dy = (e.clientY - d.cy) / scale;
    if (d.mode === 'move') onChange({ ...d.s, x: d.s.x + dx, y: d.s.y + dy });
    else {
      const w = Math.max(24, d.s.w + Math.max(dx, dy * ratio));
      onChange({ ...d.s, w, h: w / ratio });
    }
  };
  const up = () => {
    drag.current = null;
    setGrabbing(false);
  };

  return (
    <>
      <div
        className="absolute z-20 touch-none select-none"
        style={{
          left: `${(stamp.x / UNITS) * 100}%`,
          top: `${(stamp.y / boardH) * 100}%`,
          width: `${(stamp.w / UNITS) * 100}%`,
          height: `${(stamp.h / boardH) * 100}%`,
          cursor: grabbing ? 'grabbing' : 'grab',
          outline: '2px dashed var(--blue)',
          outlineOffset: 2,
        }}
        onPointerDown={down('move')}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
      >
        <img src={stamp.src} alt="" draggable={false} className="pointer-events-none h-full w-full" />
        <span
          role="presentation"
          className="bg-ios-blue absolute -right-3 -bottom-3 h-6 w-6 cursor-nwse-resize rounded-full border-[3px] border-white shadow-md"
          onPointerDown={down('size')}
          onPointerMove={move}
          onPointerUp={up}
          onPointerCancel={up}
        />
      </div>
      <div className="material absolute top-2 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-full p-1 shadow-[0_6px_20px_-6px_rgb(0_0_0/0.35)]">
        <button
          type="button"
          onClick={onCommit}
          className="bg-ios-blue flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[14px] font-semibold text-white"
        >
          <Check size={17} strokeWidth={2.6} /> Fijar
        </button>
        <button
          type="button"
          onClick={onCancel}
          aria-label="Quitar imagen"
          title="Quitar imagen"
          className="text-label hover:bg-fill grid h-9 w-9 place-items-center rounded-full"
        >
          <X size={18} strokeWidth={2.4} />
        </button>
      </div>
    </>
  );
}
