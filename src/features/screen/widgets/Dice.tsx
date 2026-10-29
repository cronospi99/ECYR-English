import { useEffect, useId, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Dices } from 'lucide-react';
import { tick, useSpace, type WidgetProps } from '../util';
import { Act, Stepper } from './ui';

interface D {
  n: number;
  values: number[];
}

const PIPS: Record<number, [number, number][]> = {
  1: [[50, 50]],
  2: [[28, 28], [72, 72]],
  3: [[26, 26], [50, 50], [74, 74]],
  4: [[28, 28], [72, 28], [28, 72], [72, 72]],
  5: [[27, 27], [73, 27], [50, 50], [27, 73], [73, 73]],
  6: [[29, 25], [71, 25], [29, 50], [71, 50], [29, 75], [71, 75]],
};
const COLORS = ['#ef4444', '#3b82f6', '#22c55e', '#f59e0b', '#a855f7', '#ec4899'];

function Die({ v, color, rolling }: { v: number; color: string; rolling: boolean }) {
  const gid = 'd' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  return (
    <motion.svg
      viewBox="0 0 100 100"
      className="h-full max-h-full w-full"
      animate={rolling ? { rotate: [0, -25, 20, -12, 0], y: [0, -14, 0, -6, 0] } : { rotate: 0, y: 0 }}
      transition={{ duration: 0.6, repeat: rolling ? Infinity : 0 }}
    >
      <rect x="6" y="6" width="88" height="88" rx="20" fill={color} />
      <rect x="6" y="6" width="88" height="88" rx="20" fill={`url(#${gid})`} />
      <defs>
        <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#fff" stopOpacity=".35" />
          <stop offset=".6" stopColor="#fff" stopOpacity="0" />
        </linearGradient>
      </defs>
      {(PIPS[v] ?? PIPS[1]!).map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="8.5" fill="#fff" />
      ))}
    </motion.svg>
  );
}

const rnd = () => 1 + Math.floor(Math.random() * 6);

export default function Dice({ data, set, focused }: WidgetProps<D>) {
  const n = Math.min(6, Math.max(1, data.n ?? 2));
  const saved = data.values ?? [];
  const [shown, setShown] = useState<number[] | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const values = shown ?? Array.from({ length: n }, (_, i) => saved[i] ?? i + 1);
  const rolling = shown !== null;

  const roll = () => {
    if (rolling) return;
    const iv = setInterval(() => {
      setShown(Array.from({ length: n }, rnd));
      tick();
    }, 80);
    setShown(Array.from({ length: n }, rnd));
    timers.current.push(
      setTimeout(() => {
        clearInterval(iv);
        setShown(null);
        set({ values: Array.from({ length: n }, rnd) });
      }, 800),
    );
  };
  useSpace(focused, roll);

  const cols = n <= 3 ? n : n === 4 ? 2 : 3;
  const sum = values.reduce((a, b) => a + b, 0);
  return (
    <div className="flex h-full flex-col">
      <button type="button" onClick={roll} aria-label="Lanzar dados" className="grid min-h-0 flex-1 place-items-center gap-[3%] p-4" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {values.map((v, i) => (
          <div key={i} className="flex aspect-square h-full max-h-full max-w-full items-center justify-center">
            <Die v={v} color={COLORS[i % COLORS.length]!} rolling={rolling} />
          </div>
        ))}
      </button>
      <div className="flex flex-wrap items-center justify-center gap-2 px-3 pb-3">
        <Stepper value={n} min={1} max={6} onChange={(k) => set({ n: k })} label="🎲" />
        <Act solid color="var(--orange)" onClick={roll} className="px-5">
          <Dices size={20} /> Lanzar
        </Act>
        {n > 1 && !rolling && <span className="font-rounded text-[22px] font-black tabular-nums">= {sum}</span>}
      </div>
    </div>
  );
}
