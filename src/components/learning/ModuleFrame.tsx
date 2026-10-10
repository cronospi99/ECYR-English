import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Expand, ExternalLink, LayoutGrid, Minus, RotateCw, Shrink } from 'lucide-react';
import { Spinner } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';

/**
 * Full-viewport player for the legacy interactive modules (served from
 * /public as same-origin pages). A floating glass bar keeps the platform's
 * navigation one tap away without stealing space from the game.
 */
export function ModuleFrame({
  src,
  title,
  backTo,
  accent = 'var(--blue)',
}: {
  src: string;
  title: string;
  backTo: string;
  accent?: string;
}) {
  const navigate = useNavigate();
  const frame = useRef<HTMLIFrameElement>(null);
  const shell = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [full, setFull] = useState(false);
  // The bar tucks itself away so it never covers the module's own header.
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    if (!loaded) return;
    const t = setTimeout(() => setCollapsed(true), 3500);
    return () => clearTimeout(t);
  }, [loaded]);

  useEffect(() => {
    window.dispatchEvent(new Event('app:ready'));
    document.title = `${title} · ECYR English`;
    const onFs = () => setFull(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      document.title = 'ECYR English';
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [title]);

  const toggleFull = () => {
    if (document.fullscreenElement) void document.exitFullscreen();
    else void shell.current?.requestFullscreen?.();
  };

  return (
    <div ref={shell} className="fixed inset-0 bg-black">
      {!loaded && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-white/80">
          <Spinner className="h-8 w-8" />
          <span className="text-[15px]">Cargando {title}…</span>
        </div>
      )}
      <iframe
        ref={frame}
        src={src}
        title={title}
        onLoad={() => setLoaded(true)}
        allow="microphone; autoplay; fullscreen; clipboard-write; speaker-selection"
        className={cn('h-full w-full border-0 transition-opacity duration-500', loaded ? 'opacity-100' : 'opacity-0')}
      />
      {collapsed ? (
        <FloatingHandle onOpen={() => setCollapsed(false)} />
      ) : (
        <div className="pb-safe pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-4">
          <div className="material-strong pointer-events-auto flex items-center gap-1 rounded-full p-1 shadow-float">
            <button
              type="button"
              onClick={() => (window.history.length > 1 ? navigate(-1) : navigate(backTo))}
              className="text-label flex h-9 items-center gap-0.5 rounded-full pr-3 pl-1.5 text-[15px] font-semibold hover:bg-fill-2"
            >
              <ChevronLeft size={22} strokeWidth={2.5} /> Salir
            </button>
            <span className="bg-separator h-5 w-px" />
            <span className="flex items-center gap-2 px-3 text-[14px] font-semibold">
              <span className="h-2 w-2 rounded-full" style={{ background: accent }} />
              <span className="max-w-[34vw] truncate">{title}</span>
            </span>
            <span className="bg-separator h-5 w-px" />
            <IconBtn label="Recargar" onClick={() => frame.current?.contentWindow?.location.reload()}>
              <RotateCw size={17} />
            </IconBtn>
            <IconBtn label={full ? 'Salir de pantalla completa' : 'Pantalla completa'} onClick={toggleFull}>
              {full ? <Shrink size={17} /> : <Expand size={17} />}
            </IconBtn>
            <IconBtn label="Abrir en pestaña nueva" onClick={() => window.open(src, '_blank', 'noopener')}>
              <ExternalLink size={17} />
            </IconBtn>
            <IconBtn label="Ocultar controles" onClick={() => setCollapsed(true)}>
              <Minus size={17} />
            </IconBtn>
          </div>
        </div>
      )}
    </div>
  );
}

function IconBtn({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" aria-label={label} title={label} onClick={onClick} className="text-label flex h-9 w-9 items-center justify-center rounded-full hover:bg-fill-2">
      {children}
    </button>
  );
}

/**
 * Small draggable handle shown while the controls are tucked away. It starts
 * on the right edge (the area these modules use least); drag it anywhere, tap
 * to bring the controls back. Its position is remembered per browser.
 */
function FloatingHandle({ onOpen }: { onOpen: () => void }) {
  const [pos, setPos] = useState<{ x: number; y: number }>(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('ecyr:handle') ?? 'null') as { x: number; y: number } | null;
      if (saved) return saved;
    } catch {
      /* ignore */
    }
    return { x: window.innerWidth - 52, y: Math.round(window.innerHeight / 2) - 22 };
  });
  const drag = useRef<{ dx: number; dy: number; moved: boolean } | null>(null);
  const clamp = (x: number, y: number) => ({
    x: Math.min(window.innerWidth - 48, Math.max(4, x)),
    y: Math.min(window.innerHeight - 48, Math.max(4, y)),
  });
  return (
    <button
      type="button"
      aria-label="Mostrar controles"
      title="Mostrar controles (arrastra para mover)"
      style={{ left: clamp(pos.x, pos.y).x, top: clamp(pos.x, pos.y).y }}
      className="material-strong text-label absolute flex h-11 w-11 touch-none items-center justify-center rounded-full opacity-70 shadow-float transition-opacity hover:opacity-100"
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId);
        drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, moved: false };
      }}
      onPointerMove={(e) => {
        const d = drag.current;
        if (!d) return;
        const next = clamp(e.clientX - d.dx, e.clientY - d.dy);
        if (Math.abs(next.x - pos.x) + Math.abs(next.y - pos.y) > 3) d.moved = true;
        setPos(next);
      }}
      onPointerUp={() => {
        const d = drag.current;
        drag.current = null;
        if (d?.moved) {
          try {
            localStorage.setItem('ecyr:handle', JSON.stringify(pos));
          } catch {
            /* ignore */
          }
        } else onOpen();
      }}
    >
      <LayoutGrid size={19} />
    </button>
  );
}
