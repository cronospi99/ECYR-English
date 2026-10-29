import { Minus, Plus, RotateCcw, Trash2, Trophy } from 'lucide-react';
import { HEX, type WidgetProps } from '../util';
import { Act } from './ui';

interface Team {
  name: string;
  score: number;
}
interface D {
  teams: Team[];
}

const DEFAULT: Team[] = [
  { name: 'Equipo 1', score: 0 },
  { name: 'Equipo 2', score: 0 },
];

export default function Score({ data, set, editing }: WidgetProps<D>) {
  const teams = data.teams?.length ? data.teams : DEFAULT;
  const top = Math.max(...teams.map((t) => t.score));
  const upd = (i: number, p: Partial<Team>) => set({ teams: teams.map((t, j) => (j === i ? { ...t, ...p } : t)) });
  return (
    <div className="flex h-full flex-col">
      <div className="grid min-h-0 flex-1 gap-2 overflow-auto p-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(min(100%, 150px), 1fr))`, gridAutoRows: 'minmax(150px, 1fr)' }}>
        {teams.map((t, i) => {
          const c = HEX[i % HEX.length]!;
          const lead = top > 0 && t.score === top;
          return (
            <div key={i} className="relative flex min-h-0 flex-col items-center justify-between overflow-hidden rounded-[18px] p-2 [container-type:size]" style={{ background: `color-mix(in srgb, ${c} 16%, var(--card))`, boxShadow: `inset 0 0 0 2px color-mix(in srgb, ${c} 45%, transparent)` }}>
              {lead && <Trophy className="absolute top-2 right-2 text-[#eab308]" size={20} fill="currentColor" />}
              <input value={t.name} onChange={(e) => upd(i, { name: e.target.value })} aria-label={`Nombre equipo ${i + 1}`} className="w-full bg-transparent px-6 text-center text-[17px] font-bold outline-none" style={{ color: `color-mix(in srgb, ${c} 70%, var(--label))` }} />
              <span className="font-rounded leading-none font-black tabular-nums" style={{ fontSize: 'min(42cqh, 45cqw)' }}>
                {t.score}
              </span>
              <div className="flex w-full justify-center gap-2">
                <button type="button" aria-label="Restar punto" onClick={() => upd(i, { score: t.score - 1 })} className="bg-card grid h-11 flex-1 place-items-center rounded-full shadow-card active:scale-95">
                  <Minus size={20} />
                </button>
                <button type="button" aria-label="Sumar punto" onClick={() => upd(i, { score: t.score + 1 })} className="grid h-11 flex-[2] place-items-center rounded-full text-white active:scale-95" style={{ background: c }}>
                  <Plus size={22} strokeWidth={3} />
                </button>
              </div>
              {editing && teams.length > 1 && (
                <button type="button" aria-label="Quitar equipo" onClick={() => set({ teams: teams.filter((_, j) => j !== i) })} className="text-ink-red absolute top-2 left-2">
                  <Trash2 size={18} />
                </button>
              )}
            </div>
          );
        })}
      </div>
      <div className="flex justify-center gap-2 px-3 pb-3">
        {teams.length < 6 && (
          <Act color="var(--blue)" onClick={() => set({ teams: [...teams, { name: `Equipo ${teams.length + 1}`, score: 0 }] })}>
            <Plus size={18} /> Equipo
          </Act>
        )}
        <Act color="var(--label)" onClick={() => set({ teams: teams.map((t) => ({ ...t, score: 0 })) })} disabled={!teams.some((t) => t.score)}>
          <RotateCcw size={18} /> Ceros
        </Act>
      </div>
    </div>
  );
}
