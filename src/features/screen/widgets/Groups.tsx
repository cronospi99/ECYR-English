import { Shuffle, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { HEX, shuffle, useNames, type NameSource, type WidgetProps } from '../util';
import { Act, Empty, inputCls, Label, Panel, Pills, Stepper } from './ui';

interface D {
  source: NameSource;
  custom: string;
  by: 'count' | 'size';
  n: number;
  groups: string[][] | null;
}

/** Shuffled names dealt round-robin, so group sizes differ by one at most. */
export function makeGroups(names: string[], by: 'count' | 'size', n: number): string[][] {
  if (!names.length) return [];
  const k = Math.max(1, Math.min(names.length, by === 'count' ? n : Math.ceil(names.length / Math.max(1, n))));
  const out: string[][] = Array.from({ length: k }, () => []);
  shuffle(names).forEach((x, i) => out[i % k]!.push(x));
  return out;
}

export default function Groups({ data, set, editing, setEditing }: WidgetProps<D>) {
  const { names, src, rosterCount, loading } = useNames(data.source, data.custom);
  const by = data.by ?? 'count';
  const n = data.n ?? (by === 'count' ? 4 : 3);
  const groups = data.groups ?? null;
  const make = (b = by, k = n) => set({ groups: makeGroups(names, b, k), by: b, n: k });

  if (editing)
    return (
      <Panel>
        <Label>Nombres</Label>
        <Pills
          value={src}
          onChange={(v) => set({ source: v, groups: null })}
          options={[
            { value: 'class', label: `Mi clase (${loading ? '…' : rosterCount})` },
            { value: 'custom', label: 'Lista propia' },
          ]}
        />
        {src === 'custom' && <textarea className={cn(inputCls, 'min-h-28 flex-1 resize-none')} placeholder={'Un nombre por línea'} value={data.custom ?? ''} onChange={(e) => set({ custom: e.target.value, groups: null })} />}
        <Act
          solid
          color="var(--blue)"
          onClick={() => {
            make();
            setEditing(false);
          }}
        >
          Listo
        </Act>
      </Panel>
    );

  const cols = groups ? (groups.length <= 2 ? groups.length : groups.length <= 4 ? 2 : groups.length <= 9 ? 3 : 4) : 1;

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-wrap items-center justify-center gap-2 px-3 pt-2 pb-2">
        <Pills
          value={by}
          onChange={(v) => make(v, v === 'count' ? 4 : 3)}
          options={[
            { value: 'count', label: 'Nº grupos' },
            { value: 'size', label: 'Por grupo' },
          ]}
        />
        <Stepper value={n} min={1} max={by === 'count' ? 12 : 20} onChange={(k) => make(by, k)} />
        <Act solid color="var(--green)" onClick={() => make()} disabled={!names.length} aria-label="Mezclar">
          <Shuffle size={18} /> Mezclar
        </Act>
      </div>
      <div className="min-h-0 flex-1 overflow-auto px-3 pb-3">
        {!names.length ? (
          <Empty icon={<Users size={40} />} text={src === 'class' ? (loading ? 'Cargando tu clase…' : 'Tu clase no tiene estudiantes. Usa una lista propia.') : 'Escribe los nombres.'}>
            <Act color="var(--blue)" onClick={() => setEditing(true)}>
              Editar nombres
            </Act>
          </Empty>
        ) : !groups?.length ? (
          <Empty icon={<Users size={40} />} text={`${names.length} nombres listos`}>
            <Act solid color="var(--green)" onClick={() => make()}>
              <Shuffle size={18} /> Hacer grupos
            </Act>
          </Empty>
        ) : (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(auto-fill, minmax(min(100%, ${cols > 2 ? 150 : 180}px), 1fr))` }}>
            {groups.map((g, i) => {
              const c = HEX[i % HEX.length]!;
              return (
                <div key={i} className="overflow-hidden rounded-[16px]" style={{ background: `color-mix(in srgb, ${c} 14%, var(--card))`, boxShadow: `inset 0 0 0 2px color-mix(in srgb, ${c} 40%, transparent)` }}>
                  <div className="flex items-center justify-between px-3 py-1.5 text-[15px] font-bold text-white" style={{ background: c }}>
                    <span>Grupo {i + 1}</span>
                    <span className="opacity-80">{g.length}</span>
                  </div>
                  <ul className="px-3 py-2 text-[17px] leading-snug font-semibold">
                    {g.map((x, j) => (
                      <li key={j} className="truncate">
                        {x}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
