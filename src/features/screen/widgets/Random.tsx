import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Dices, RotateCcw, Shuffle, Users, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Toggle } from '@/components/ui/Misc';
import { fanfare, HEX, tick, useNames, useSpace, type NameSource, type WidgetProps } from '../util';
import { Act, Empty, inputCls, Label, Panel, Pills } from './ui';

interface D {
  mode: 'name' | 'number';
  source: NameSource;
  custom: string;
  noRepeat: boolean;
  removed: string[];
  min: number;
  max: number;
  last: string | null;
}

const short = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1) + '…' : s);

function Wheel({ names, rot, spinning }: { names: string[]; rot: number; spinning: boolean }) {
  const n = names.length;
  const a = 360 / n;
  const fs = n <= 6 ? 7 : n <= 12 ? 5.6 : n <= 20 ? 4.2 : n <= 32 ? 3.2 : 2.4;
  const maxChars = n <= 12 ? 14 : 12;
  const color = (i: number) => (n > 1 && i === n - 1 && (n - 1) % HEX.length === 0 ? HEX[4]! : HEX[i % HEX.length]!);
  return (
    <div className="relative aspect-square h-full max-h-full max-w-full">
      <svg viewBox="0 0 100 100" className="h-full w-full drop-shadow-[0_6px_16px_rgb(0_0_0/0.2)]">
        <g style={{ transform: `rotate(${rot}deg)`, transformOrigin: '50px 50px', transition: spinning ? 'transform 4.2s cubic-bezier(.12,.67,.1,1)' : 'none' }}>
          {n === 1 ? (
            <circle cx="50" cy="50" r="48" fill={HEX[0]} />
          ) : (
            names.map((_, i) => {
              const a0 = ((i * a - 90) * Math.PI) / 180;
              const a1 = (((i + 1) * a - 90) * Math.PI) / 180;
              return (
                <path
                  key={i}
                  d={`M50,50L${50 + 48 * Math.cos(a0)},${50 + 48 * Math.sin(a0)}A48,48 0 ${a > 180 ? 1 : 0},1 ${50 + 48 * Math.cos(a1)},${50 + 48 * Math.sin(a1)}Z`}
                  fill={color(i)}
                  stroke="#fff"
                  strokeWidth={n > 40 ? 0.15 : 0.4}
                />
              );
            })
          )}
          {names.map((name, i) => (
            <text
              key={i}
              x="50"
              y="50"
              transform={`rotate(${(i + 0.5) * a - 90} 50 50) translate(44 0)`}
              textAnchor="end"
              dominantBaseline="central"
              fill="#fff"
              fontSize={fs}
              fontWeight="700"
              style={{ paintOrder: 'stroke', stroke: 'rgb(0 0 0 / .18)', strokeWidth: 0.4 }}
            >
              {short(name, maxChars)}
            </text>
          ))}
        </g>
        <circle cx="50" cy="50" r="7" fill="#fff" stroke="rgb(0 0 0 / .1)" />
        <circle cx="50" cy="50" r="3" fill="#0f172a" />
      </svg>
      {/* pointer */}
      <svg viewBox="0 0 20 20" className="absolute top-[-2%] left-1/2 h-[11%] w-[11%] -translate-x-1/2 drop-shadow">
        <path d="M2,2 L18,2 L10,18 Z" fill="#0f172a" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
      </svg>
    </div>
  );
}

export default function Random({ data, set, focused, editing, setEditing }: WidgetProps<D>) {
  const mode = data.mode ?? 'name';
  const { names: all, src, rosterCount, loading } = useNames(data.source, data.custom);
  const removed = data.removed ?? [];
  const names = data.noRepeat ? all.filter((x) => !removed.includes(x)) : all;
  const [rot, setRot] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [winner, setWinner] = useState<string | null>(null);
  const [num, setNum] = useState<number | null>(data.last && mode === 'number' ? Number(data.last) : null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const min = data.min ?? 1;
  const max = data.max ?? 30;

  const spin = () => {
    if (spinning) return;
    if (mode === 'number') {
      setSpinning(true);
      const lo = Math.min(min, max);
      const hi = Math.max(min, max);
      const roll = () => lo + Math.floor(Math.random() * (hi - lo + 1));
      const iv = setInterval(() => {
        setNum(roll());
        tick();
      }, 60);
      timers.current.push(
        setTimeout(() => {
          clearInterval(iv);
          const v = roll();
          setNum(v);
          set({ last: String(v) });
          setSpinning(false);
          fanfare();
        }, 1100),
      );
      return;
    }
    if (!names.length) return;
    setWinner(null);
    const i = Math.floor(Math.random() * names.length);
    const a = 360 / names.length;
    const jitter = (Math.random() - 0.5) * a * 0.6;
    const target = -((i + 0.5) * a + jitter);
    const base = rot - (((rot % 360) + 360) % 360);
    let next = base + 360 * 6 + (((target % 360) + 360) % 360);
    if (next - rot < 360 * 4) next += 360;
    setSpinning(true);
    setRot(next);
    // a few ticks that slow down
    [0, 150, 320, 520, 760, 1050, 1400, 1850, 2400, 3050, 3700].forEach((t) => timers.current.push(setTimeout(tick, t)));
    timers.current.push(
      setTimeout(() => {
        const w = names[i]!;
        setSpinning(false);
        setWinner(w);
        fanfare();
        set({ last: w, ...(data.noRepeat ? { removed: [...removed, w] } : {}) });
      }, 4300),
    );
  };
  useSpace(focused && !editing, spin);

  if (editing)
    return (
      <Panel>
        <Label>Modo</Label>
        <Pills value={mode} onChange={(v) => set({ mode: v })} options={[{ value: 'name', label: 'Nombres' }, { value: 'number', label: 'Número' }]} />
        {mode === 'name' ? (
          <>
            <Label>Lista</Label>
            <Pills
              value={src}
              onChange={(v) => set({ source: v, removed: [] })}
              options={[
                { value: 'class', label: `Mi clase (${loading ? '…' : rosterCount})` },
                { value: 'custom', label: 'Lista propia' },
              ]}
            />
            {src === 'custom' && <textarea className={cn(inputCls, 'min-h-28 flex-1 resize-none')} placeholder={'Un nombre por línea\nAna\nLuis\nSofía'} value={data.custom ?? ''} onChange={(e) => set({ custom: e.target.value, removed: [] })} />}
            <label className="flex items-center justify-between gap-3 text-[15px] font-medium">
              No repetir (quitar elegido)
              <Toggle checked={!!data.noRepeat} onChange={(v) => set({ noRepeat: v, removed: [] })} label="No repetir" />
            </label>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <input type="number" className={inputCls} value={min} onChange={(e) => set({ min: Number(e.target.value) || 0 })} aria-label="Mínimo" />
            <span className="text-label-2">a</span>
            <input type="number" className={inputCls} value={max} onChange={(e) => set({ max: Number(e.target.value) || 0 })} aria-label="Máximo" />
          </div>
        )}
        <Act solid color="var(--blue)" onClick={() => setEditing(false)}>
          Listo
        </Act>
      </Panel>
    );

  if (mode === 'number')
    return (
      <div className="flex h-full flex-col">
        <div className="flex min-h-0 flex-1 flex-col items-center justify-center [container-type:size]">
          <motion.span key={spinning ? 'r' : String(num)} initial={{ scale: spinning ? 1 : 0.6 }} animate={{ scale: 1 }} className="font-rounded font-black tabular-nums" style={{ fontSize: 'min(60cqh, 40cqw)', color: spinning ? 'var(--label-3)' : 'var(--purple)' }}>
            {num ?? '?'}
          </motion.span>
          <span className="text-label-2 text-[15px] font-semibold">
            {Math.min(min, max)} – {Math.max(min, max)}
          </span>
        </div>
        <div className="flex justify-center p-3">
          <Act solid color="var(--purple)" onClick={spin} disabled={spinning} className="px-6">
            <Dices size={20} /> Número
          </Act>
        </div>
      </div>
    );

  return (
    <div className="flex h-full flex-col">
      <div className="relative flex min-h-0 flex-1 items-center justify-center p-3">
        {names.length ? (
          <button type="button" onClick={spin} className="flex h-full max-w-full items-center justify-center" aria-label="Girar ruleta">
            <Wheel names={names} rot={rot} spinning={spinning} />
          </button>
        ) : (
          <Empty icon={<Users size={40} />} text={all.length ? '¡Ya salieron todos!' : src === 'class' ? (loading ? 'Cargando tu clase…' : 'Tu clase no tiene estudiantes. Escribe una lista propia.') : 'Escribe los nombres de tu lista.'}>
            {all.length ? (
              <Act color="var(--blue)" onClick={() => set({ removed: [] })}>
                <RotateCcw size={18} /> Reiniciar
              </Act>
            ) : (
              <Act color="var(--blue)" onClick={() => setEditing(true)}>
                Editar lista
              </Act>
            )}
          </Empty>
        )}
        <AnimatePresence>
          {winner && (
            <motion.div
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 380, damping: 24 }}
              className="absolute inset-0 grid place-items-center p-4 [container-type:size]"
              onClick={() => setWinner(null)}
            >
              <div className="bg-card relative max-w-full rounded-[24px] px-[6cqw] py-[5cqh] text-center shadow-[0_20px_60px_-10px_rgb(0_0_0/0.45)]">
                <button type="button" aria-label="Cerrar" className="text-label-3 absolute top-2 right-2 p-1">
                  <X size={20} />
                </button>
                <div className="text-[clamp(14px,5cqmin,22px)]">🎉</div>
                <div className="font-rounded leading-tight font-black break-words" style={{ fontSize: 'min(14cqh, 11cqw)' }}>
                  {winner}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-center gap-2 px-3 pb-3">
        <Act solid color="var(--pink)" onClick={spin} disabled={spinning || !names.length} className="px-6">
          <Shuffle size={20} /> Girar
        </Act>
        {data.noRepeat && (
          <Act color="var(--label)" onClick={() => set({ removed: [] })} disabled={!removed.length} title="Reiniciar lista">
            <RotateCcw size={18} /> {names.length}/{all.length}
          </Act>
        )}
      </div>
    </div>
  );
}
