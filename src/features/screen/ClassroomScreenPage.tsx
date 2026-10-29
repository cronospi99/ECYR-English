import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight, Ellipsis, Eraser, House, ImageUp, Lock, Maximize, Minimize, Palette, Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/auth';
import { ButtonLink } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Misc';
import { useScreen, type WidgetKind } from './state';
import { WIDGETS, widgetDef, type WidgetDef } from './registry';
import { bgStyle, fileToDataUrl, GRADIENTS, PATTERNS, SOLIDS, type Bg } from './backgrounds';
import { WidgetFrame, type Area } from './WidgetFrame';

const DOCK = 92; // px reserved at the bottom on desktop
const STACK_BELOW = 720; // narrower: widgets stack in one column

const CSS = `
.scr-dragging, .scr-dragging * { user-select: none !important; }
.scr-dragging iframe { pointer-events: none; }
@keyframes scr-flash { 0%,100% { background-color: transparent } 50% { background-color: color-mix(in srgb, var(--red) 28%, transparent) } }
.scr-flash { animation: scr-flash 0.9s ease-in-out infinite; }
`;

function useViewport() {
  const [v, setV] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }));
  useEffect(() => {
    const on = () => setV({ width: window.innerWidth, height: window.innerHeight });
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return v;
}

function useFullscreen() {
  const [full, setFull] = useState(() => typeof document !== 'undefined' && !!document.fullscreenElement);
  useEffect(() => {
    const on = () => setFull(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', on);
    return () => document.removeEventListener('fullscreenchange', on);
  }, []);
  const toggle = () => {
    try {
      if (document.fullscreenElement) void document.exitFullscreen();
      else void document.documentElement.requestFullscreen?.()?.catch(() => {});
    } catch {
      /* not allowed */
    }
  };
  return { full, toggle, supported: typeof document !== 'undefined' && !!document.documentElement.requestFullscreen };
}

export default function ClassroomScreenPage() {
  const ready = useAuth((s) => s.ready);
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);
  const [waited, setWaited] = useState(false);
  useEffect(() => {
    // No app shell here: tell the boot intro (index.html) that the page is up.
    requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready')));
    const t = setTimeout(() => setWaited(true), 5000);
    return () => clearTimeout(t);
  }, []);

  if (!ready || (session && !profile && !waited))
    return (
      <div className="bg-bg grid min-h-dvh place-items-center">
        <Spinner />
      </div>
    );
  if (profile?.role !== 'teacher') return <TeachersOnly />;
  return <Screen />;
}

function TeachersOnly() {
  return (
    <div className="bg-bg grid min-h-dvh place-items-center p-4">
      <div className="bg-card shadow-card rounded-card flex w-full max-w-sm flex-col items-center gap-3 p-6 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-[16px] bg-[color-mix(in_srgb,var(--orange)_16%,transparent)] text-ink-orange">
          <Lock size={28} />
        </span>
        <h1 className="text-title-2">Solo docentes</h1>
        <p className="text-subhead text-label-2">La pantalla de clase es para proyectar desde una cuenta docente.</p>
        <ButtonLink to="/profile" variant="tinted" className="mt-1 w-full">
          Ir a mi perfil
        </ButtonLink>
      </div>
    </div>
  );
}

function Screen() {
  const scenes = useScreen((s) => s.scenes);
  const cur = useScreen((s) => s.cur);
  const focused = useScreen((s) => s.focused);
  const add = useScreen((s) => s.add);
  const saveError = useScreen((s) => s.saveError);
  const scene = scenes[cur] ?? scenes[0]!;
  const vp = useViewport();
  const stacked = vp.width < STACK_BELOW;
  const area: Area = { width: vp.width, height: vp.height - DOCK };
  const [pop, setPop] = useState<null | 'more' | 'bg'>(null);
  const bg = bgStyle(scene.bg);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setPop(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Pantalla de clase · ECYR';
    return () => {
      document.title = prev;
    };
  }, []);

  const spawn = (kind: WidgetKind) => {
    const def = widgetDef(kind);
    if (!def) return;
    setPop(null);
    const w = Math.min(def.w, area.width - 16);
    const h = Math.min(def.h, area.height - 16);
    const { x, y } = freeSpot(w, h, area, scene.widgets);
    add({ kind, x, y, w, h, data: {} });
    if (stacked) requestAnimationFrame(() => document.getElementById('scr-stack')?.scrollTo({ top: 1e6, behavior: 'smooth' }));
  };

  const topId = focused ?? scene.widgets.reduce<{ id: string | null; z: number }>((m, w) => (w.z > m.z ? { id: w.id, z: w.z } : m), { id: null, z: -1 }).id;

  return (
    <div className="relative h-dvh w-full overflow-hidden" style={{ background: bg.css }}>
      <style>{CSS}</style>
      {bg.image && <img src={bg.image} alt="" className="pointer-events-none absolute inset-0 h-full w-full object-cover" />}

      {stacked ? (
        <div id="scr-stack" className="absolute inset-x-0 top-0 flex flex-col gap-3 overflow-y-auto p-3" style={{ bottom: DOCK }}>
          {scene.widgets.map((w) => {
            const def = widgetDef(w.kind);
            return def ? <WidgetFrame key={w.id} w={w} def={def} area={area} stacked focused={topId === w.id} /> : null;
          })}
          {!scene.widgets.length && <Welcome onAdd={spawn} light={bg.light} />}
        </div>
      ) : (
        <div className="absolute inset-x-0 top-0" style={{ height: area.height }}>
          {scene.widgets.map((w) => {
            const def = widgetDef(w.kind);
            return def ? <WidgetFrame key={w.id} w={w} def={def} area={area} stacked={false} focused={topId === w.id} /> : null;
          })}
          {!scene.widgets.length && <Welcome onAdd={spawn} light={bg.light} />}
        </div>
      )}

      <AnimatePresence>
        {saveError && (
          <motion.div initial={{ y: -40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -40, opacity: 0 }} className="material-strong text-ink-red absolute top-3 left-1/2 z-[9999] -translate-x-1/2 rounded-full px-4 py-2 text-[14px] font-semibold shadow-card">
            No se pudo guardar: quita alguna imagen grande
          </motion.div>
        )}
      </AnimatePresence>

      <Dock pop={pop} setPop={setPop} onAdd={spawn} compact={vp.width < 1180} />
    </div>
  );
}

/** The free-est spot for a new widget: least overlap with others, then closest to the centre. */
function freeSpot(w: number, h: number, area: Area, others: { x: number; y: number; w: number; h: number; min?: boolean }[]) {
  const cx = (area.width - w) / 2;
  const cy = (area.height - h) / 2;
  let best = { x: cx, y: cy, score: Infinity };
  const step = 24;
  for (let y = 12; y <= Math.max(12, area.height - h - 12); y += step)
    for (let x = 12; x <= Math.max(12, area.width - w - 12); x += step) {
      let overlap = 0;
      for (const o of others) {
        const oh = o.min ? 44 : o.h;
        const ix = Math.max(0, Math.min(x + w + 12, o.x + o.w) - Math.max(x - 12, o.x));
        const iy = Math.max(0, Math.min(y + h + 12, o.y + oh) - Math.max(y - 12, o.y));
        overlap += ix * iy;
      }
      const score = overlap * 10 + Math.hypot(x - cx, y - cy);
      if (score < best.score) best = { x, y, score };
    }
  return best;
}

function Welcome({ onAdd, light }: { onAdd: (k: WidgetKind) => void; light?: boolean }) {
  const quick = ['timer', 'random', 'groups', 'clock'] as WidgetKind[];
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center p-4 max-[719px]:relative max-[719px]:min-h-[60vh]">
      <div className={cn('pointer-events-auto flex flex-col items-center gap-4 text-center', light ? 'text-[#0f172a]' : 'text-white')}>
        <p className="font-rounded text-[clamp(28px,5vw,64px)] leading-none font-black drop-shadow-[0_2px_12px_rgb(0_0_0/0.25)]">Pantalla de clase</p>
        <div className="flex flex-wrap justify-center gap-2">
          {quick.map((k) => {
            const d = widgetDef(k)!;
            return (
              <button key={k} type="button" onClick={() => onAdd(k)} className="material-strong text-label flex h-12 items-center gap-2 rounded-full pr-5 pl-2 text-[16px] font-semibold shadow-card transition-transform active:scale-95">
                <span className="grid h-8 w-8 place-items-center rounded-full text-white" style={{ background: d.color }}>
                  <d.icon size={18} />
                </span>
                {d.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function DockBtn({ icon, label, color, onClick, active, to, danger }: { icon: ReactNode; label: string; color?: string; onClick?: () => void; active?: boolean; to?: string; danger?: boolean }) {
  const inner = (
    <>
      <span
        className={cn('grid h-10 w-10 place-items-center rounded-[12px] transition-transform group-active:scale-90', !color && 'bg-fill text-label', danger && 'bg-[var(--red)] text-white')}
        style={color ? { background: color, color: '#fff' } : undefined}
      >
        {icon}
      </span>
      <span className={cn('max-w-[92px] truncate text-[11px] leading-none font-semibold', danger ? 'text-ink-red' : 'text-label')}>{label}</span>
    </>
  );
  const cls = cn('group flex min-w-[62px] shrink-0 px-1 flex-col items-center gap-1 rounded-[14px] py-1.5 transition-colors hover:bg-fill-2', active && 'bg-fill');
  return to ? (
    <Link to={to} className={cls} aria-label={label}>
      {inner}
    </Link>
  ) : (
    <button type="button" onClick={onClick} className={cls} aria-label={label} aria-expanded={active}>
      {inner}
    </button>
  );
}

function Dock({ pop, setPop, onAdd, compact }: { pop: null | 'more' | 'bg'; setPop: (p: null | 'more' | 'bg') => void; onAdd: (k: WidgetKind) => void; compact: boolean }) {
  const fs = useFullscreen();
  const clear = useScreen((s) => s.clear);
  const count = useScreen((s) => s.scenes[s.cur]?.widgets.length ?? 0);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [confirm]);

  const main = WIDGETS.filter((w) => w.main).slice(0, compact ? 4 : 99);
  const more = WIDGETS.filter((w) => !main.includes(w));
  const sep = <span className="bg-separator mx-1 h-10 w-px shrink-0" />;

  return (
    <>
      <AnimatePresence>
        {pop && (
          <>
            <div className="absolute inset-0 z-[9990]" onPointerDown={() => setPop(null)} />
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 500, damping: 36 }}
              className="bg-card/95 absolute left-1/2 z-[9991] backdrop-blur-xl max-h-[calc(100dvh-120px)] w-[min(560px,calc(100vw-24px))] -translate-x-1/2 overflow-auto rounded-[22px] p-3 shadow-[0_20px_60px_-10px_rgb(0_0_0/0.5)]"
              style={{ bottom: DOCK + 4 }}
              role="dialog"
              aria-label={pop === 'bg' ? 'Fondo' : 'Más widgets'}
            >
              {pop === 'more' ? (
                <>
                  <div className="mb-2 flex justify-center sm:hidden">
                    <Pager />
                  </div>
                  <MoreGrid items={more} onAdd={onAdd} />
                </>
              ) : (
                <BgPicker />
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <div className="absolute inset-x-0 bottom-0 z-[9992] flex items-end gap-2 px-2 pb-2 sm:px-3" style={{ height: DOCK }}>
        <nav aria-label="Herramientas" className="material-strong no-scrollbar mx-auto flex max-w-full min-w-0 items-center overflow-x-auto rounded-[22px] px-1.5 py-1 shadow-[0_12px_40px_-10px_rgb(0_0_0/0.45)]">
          <DockBtn to="/teacher" icon={<House size={20} />} label="Inicio" />
          <DockBtn icon={<Palette size={20} />} label="Fondo" color="linear-gradient(135deg,#f97316,#ec4899,#6366f1)" active={pop === 'bg'} onClick={() => setPop(pop === 'bg' ? null : 'bg')} />
          {sep}
          {main.map((w) => (
            <DockBtn key={w.kind} icon={<w.icon size={20} strokeWidth={2.3} />} label={w.label} color={w.color} onClick={() => onAdd(w.kind)} />
          ))}
          <DockBtn icon={<Ellipsis size={22} />} label="Más" active={pop === 'more'} onClick={() => setPop(pop === 'more' ? null : 'more')} />
          {sep}
          {fs.supported && <DockBtn icon={fs.full ? <Minimize size={20} /> : <Maximize size={20} />} label={fs.full ? 'Salir' : 'Pantalla'} onClick={fs.toggle} />}
          <DockBtn
            icon={<Eraser size={20} />}
            label={confirm ? '¿Seguro?' : 'Limpiar'}
            danger={confirm}
            onClick={() => {
              if (!count) return;
              if (confirm) {
                clear();
                setConfirm(false);
              } else setConfirm(true);
            }}
          />
        </nav>
        <div className="max-sm:hidden">
          <Pager />
        </div>
      </div>
    </>
  );
}

function MoreGrid({ items, onAdd }: { items: WidgetDef[]; onAdd: (k: WidgetKind) => void }) {
  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(96px,1fr))] gap-1">
      {items.map((w) => (
        <button key={w.kind} type="button" onClick={() => onAdd(w.kind)} className="hover:bg-fill-2 flex flex-col items-center gap-1.5 rounded-[14px] p-2.5 transition-colors active:scale-95">
          <span className="grid h-12 w-12 place-items-center rounded-[14px] text-white shadow-card" style={{ background: w.color }}>
            <w.icon size={24} strokeWidth={2.2} />
          </span>
          <span className="text-label text-[13px] leading-tight font-semibold">{w.label}</span>
        </button>
      ))}
    </div>
  );
}

function BgPicker() {
  const bg = useScreen((s) => s.scenes[s.cur]?.bg ?? '');
  const setBg = useScreen((s) => s.setBg);
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const swatches = (title: string, list: Bg[]) => (
    <div className="space-y-1.5">
      <div className="text-label-2 px-1 text-[12px] font-semibold tracking-wide uppercase">{title}</div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(72px,1fr))] gap-2">
        {list.map((b) => (
          <button
            key={b.id}
            type="button"
            title={b.label}
            aria-label={b.label}
            aria-pressed={bg === b.id}
            onClick={() => setBg(b.id)}
            className={cn('h-12 rounded-[12px] shadow-[inset_0_0_0_1px_rgb(0_0_0/0.1)] transition-transform active:scale-95', bg === b.id && 'ring-label ring-[3px] ring-offset-2 ring-offset-[var(--card)]')}
            style={{ background: b.css }}
          />
        ))}
      </div>
    </div>
  );
  return (
    <div className="space-y-3">
      {swatches('Degradados', GRADIENTS)}
      {swatches('Patrones', PATTERNS)}
      {swatches('Colores', SOLIDS)}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <input
          ref={input}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = '';
            if (!f) return;
            setBusy(true);
            try {
              setBg('img:' + (await fileToDataUrl(f, 1920, 0.78)));
            } catch {
              /* unreadable image */
            }
            setBusy(false);
          }}
        />
        <button type="button" onClick={() => input.current?.click()} className="bg-[color-mix(in_srgb,var(--blue)_15%,transparent)] text-ink-blue flex h-11 items-center gap-2 rounded-full px-4 text-[15px] font-semibold">
          {busy ? <Spinner className="h-4 w-4" /> : <ImageUp size={18} />} Tu imagen
        </button>
        {bg.startsWith('img:') && <img src={bg.slice(4)} alt="Fondo actual" className="h-11 w-16 rounded-[10px] object-cover ring-label ring-[3px]" />}
      </div>
    </div>
  );
}

function Pager() {
  const n = useScreen((s) => s.scenes.length);
  const cur = useScreen((s) => s.cur);
  const go = useScreen((s) => s.go);
  const addScene = useScreen((s) => s.addScene);
  const removeScene = useScreen((s) => s.removeScene);
  const [confirm, setConfirm] = useState(false);
  useEffect(() => {
    if (!confirm) return;
    const t = setTimeout(() => setConfirm(false), 3000);
    return () => clearTimeout(t);
  }, [confirm]);
  const btn = 'grid h-10 w-10 place-items-center rounded-full text-label transition-colors hover:bg-fill-2 disabled:opacity-30 active:scale-90';
  return (
    <div className="material-strong flex shrink-0 items-center gap-0.5 rounded-[22px] p-1 shadow-[0_12px_40px_-10px_rgb(0_0_0/0.45)]">
      <button type="button" className={btn} aria-label="Pantalla anterior" disabled={cur === 0} onClick={() => go(cur - 1)}>
        <ChevronLeft size={20} />
      </button>
      <span className="text-label min-w-10 text-center text-[15px] font-bold tabular-nums" aria-live="polite">
        {cur + 1}/{n}
      </span>
      <button type="button" className={btn} aria-label="Pantalla siguiente" disabled={cur >= n - 1} onClick={() => go(cur + 1)}>
        <ChevronRight size={20} />
      </button>
      <button type="button" className={btn} aria-label="Nueva pantalla" onClick={addScene}>
        <Plus size={20} />
      </button>
      {n > 1 && (
        <button
          type="button"
          className={cn(btn, confirm ? 'w-auto bg-[var(--red)] px-3 text-[13px] font-bold text-white hover:bg-[var(--red)]' : 'text-ink-red')}
          aria-label="Borrar esta pantalla"
          onClick={() => {
            if (confirm) {
              removeScene();
              setConfirm(false);
            } else setConfirm(true);
          }}
        >
          {confirm ? '¿Borrar?' : <Trash2 size={18} />}
        </button>
      )}
    </div>
  );
}
