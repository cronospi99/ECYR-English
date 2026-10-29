import { memo, useCallback, useRef, useState, type PointerEvent as RPointerEvent } from 'react';
import { ChevronDown, ChevronUp, Settings2, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useScreen, type WidgetInstance } from './state';
import type { WidgetDef } from './registry';

export const HEADER = 44;
const GAP = 8;

export interface Area {
  width: number;
  height: number;
}

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** Keeps a widget fully inside the usable area (smaller screens shrink it). */
export function clampRect(r: Rect, area: Area, def: Pick<WidgetDef, 'minW' | 'minH'>, min = false): Rect {
  const w = Math.max(Math.min(def.minW, area.width - GAP * 2), Math.min(r.w, area.width - GAP * 2));
  const h = Math.max(Math.min(def.minH, area.height - GAP * 2), Math.min(r.h, area.height - GAP * 2));
  const vh = min ? HEADER : h;
  return {
    w,
    h,
    x: Math.round(Math.min(Math.max(GAP, r.x), Math.max(GAP, area.width - w - GAP))),
    y: Math.round(Math.min(Math.max(GAP, r.y), Math.max(GAP, area.height - vh - GAP))),
  };
}

type Mode = 'move' | 'se' | 'e' | 's';

function Frame({ w, def, area, stacked, focused }: { w: WidgetInstance; def: WidgetDef; area: Area; stacked: boolean; focused: boolean }) {
  const patch = useScreen((s) => s.patch);
  const setData = useScreen((s) => s.setData);
  const remove = useScreen((s) => s.remove);
  const focus = useScreen((s) => s.focus);
  const [tmp, setTmp] = useState<Rect | null>(null);
  const [editing, setEditing] = useState(false);
  const drag = useRef<{ px: number; py: number; r: Rect; mode: Mode } | null>(null);

  const rect = clampRect(tmp ?? w, area, def, w.min);
  const set = useCallback((d: Record<string, unknown>) => setData(w.id, d), [setData, w.id]);

  const down = (e: RPointerEvent<HTMLElement>, mode: Mode) => {
    if (stacked || e.button !== 0) return;
    if (mode === 'move' && (e.target as HTMLElement).closest('button')) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { px: e.clientX, py: e.clientY, r: rect, mode };
    document.body.classList.add('scr-dragging');
  };
  const move = (e: RPointerEvent<HTMLElement>) => {
    const d = drag.current;
    if (!d) return;
    const dx = e.clientX - d.px;
    const dy = e.clientY - d.py;
    const r = { ...d.r };
    if (d.mode === 'move') {
      r.x += dx;
      r.y += dy;
    } else {
      if (d.mode !== 's') r.w = Math.max(def.minW, Math.min(d.r.w + dx, area.width - d.r.x - GAP));
      if (d.mode !== 'e') r.h = Math.max(def.minH, Math.min(d.r.h + dy, area.height - d.r.y - GAP));
    }
    setTmp(r);
  };
  const up = () => {
    if (!drag.current) return;
    drag.current = null;
    document.body.classList.remove('scr-dragging');
    if (tmp) patch(w.id, clampRect(tmp, area, def, w.min));
    setTmp(null);
  };

  const Icon = def.icon;
  const C = def.Component as unknown as React.ComponentType<{
    id: string;
    data: Record<string, unknown>;
    set: (d: Record<string, unknown>) => void;
    focused: boolean;
    editing: boolean;
    setEditing: (v: boolean) => void;
  }>;
  const stackH = Math.min(Math.max(w.h, def.minH), 520);

  return (
    <section
      aria-label={def.label}
      onPointerDownCapture={() => focus(w.id)}
      className={cn(
        'bg-card text-label flex flex-col overflow-hidden rounded-[20px] shadow-[0_18px_50px_-14px_rgb(0_0_0/0.45),0_0_0_0.5px_rgb(0_0_0/0.08)]',
        stacked ? 'relative w-full shrink-0' : 'absolute',
        focused && !stacked && 'shadow-[0_24px_60px_-12px_rgb(0_0_0/0.55),0_0_0_3px_rgb(255_255_255/0.55)]',
        tmp && 'transition-none',
      )}
      style={stacked ? { height: w.min ? HEADER : stackH, zIndex: 1 } : { left: rect.x, top: rect.y, width: rect.w, height: w.min ? HEADER : rect.h, zIndex: w.z }}
      data-widget={w.kind}
    >
      <header
        onPointerDown={(e) => down(e, 'move')}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={up}
        onDoubleClick={(e) => !(e.target as HTMLElement).closest('button') && patch(w.id, { min: !w.min })}
        className={cn('flex h-11 shrink-0 items-center gap-2 pr-1.5 pl-3 select-none', !stacked && 'cursor-grab touch-none active:cursor-grabbing', !w.min && 'hairline-b')}
      >
        <span className="grid h-7 w-7 shrink-0 place-items-center rounded-[8px] text-white" style={{ background: def.color }}>
          <Icon size={16} strokeWidth={2.4} />
        </span>
        <span className="text-label-2 min-w-0 flex-1 truncate text-[14px] font-semibold">{def.label}</span>
        {def.settings && !w.min && (
          <button type="button" aria-label="Ajustes" aria-pressed={editing} onClick={() => setEditing(!editing)} className={cn('grid h-8 w-8 place-items-center rounded-full transition-colors', editing ? 'bg-label text-bg' : 'text-label-2 hover:bg-fill-2')}>
            <Settings2 size={17} />
          </button>
        )}
        <button type="button" aria-label={w.min ? 'Restaurar' : 'Minimizar'} onClick={() => patch(w.id, { min: !w.min })} className="text-label-2 hover:bg-fill-2 grid h-8 w-8 place-items-center rounded-full">
          {w.min ? <ChevronDown size={18} /> : <ChevronUp size={18} />}
        </button>
        <button type="button" aria-label="Cerrar" onClick={() => remove(w.id)} className="text-label-2 hover:bg-[color-mix(in_srgb,var(--red)_14%,transparent)] hover:text-ink-red grid h-8 w-8 place-items-center rounded-full">
          <X size={18} />
        </button>
      </header>
      {!w.min && (
        <div className="relative min-h-0 flex-1">
          <C id={w.id} data={w.data} set={set} focused={focused} editing={editing} setEditing={setEditing} />
        </div>
      )}
      {!stacked && !w.min && (
        <>
          <div onPointerDown={(e) => down(e, 'e')} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="absolute top-12 right-0 bottom-6 w-2 cursor-ew-resize touch-none" />
          <div onPointerDown={(e) => down(e, 's')} onPointerMove={move} onPointerUp={up} onPointerCancel={up} className="absolute right-6 bottom-0 left-6 h-2 cursor-ns-resize touch-none" />
          <div onPointerDown={(e) => down(e, 'se')} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-hidden className="absolute right-0 bottom-0 h-6 w-6 cursor-nwse-resize touch-none" title="Cambiar tamaño">
            <svg viewBox="0 0 24 24" className="text-label-3 absolute right-1 bottom-1 h-3.5 w-3.5">
              <path d="M20 8 8 20M20 14l-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
            </svg>
          </div>
        </>
      )}
    </section>
  );
}

export const WidgetFrame = memo(Frame);
