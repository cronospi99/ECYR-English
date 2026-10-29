import { useState } from 'react';
import { Pin, PinOff, Shuffle, Users, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { HEX, shuffle, useNames, type NameSource, type WidgetProps } from '../util';
import { Act, Empty, inputCls, Label, Panel, Pills, Stepper } from './ui';

interface D {
  source: NameSource;
  custom: string;
  by: 'count' | 'size';
  n: number;
  groups: string[][] | null;
  /** Names the teacher placed by hand → group index (kept on every shuffle). */
  pins?: Record<string, number>;
}

export const groupCount = (total: number, by: 'count' | 'size', n: number) =>
  Math.max(1, Math.min(Math.max(1, total), by === 'count' ? n : Math.ceil(total / Math.max(1, n))));

/**
 * Pinned names go to their group first; the rest are shuffled and each goes to
 * the smallest group, so sizes still differ by one at most where pins allow.
 */
export function makeGroups(names: string[], by: 'count' | 'size', n: number, pins: Record<string, number> = {}): string[][] {
  if (!names.length) return [];
  const k = groupCount(names.length, by, n);
  const out: string[][] = Array.from({ length: k }, () => []);
  const free: string[] = [];
  for (const x of names) {
    const g = pins[x];
    if (g != null && g >= 0 && g < k) out[g]!.push(x);
    else free.push(x);
  }
  for (const x of shuffle(free)) {
    let best = 0;
    out.forEach((g, i) => g.length < out[best]!.length && (best = i));
    out[best]!.push(x);
  }
  return out;
}

export default function Groups({ data, set, editing, setEditing }: WidgetProps<D>) {
  const { names, src, rosterCount, loading } = useNames(data.source, data.custom);
  const by = data.by ?? 'count';
  const n = data.n ?? (by === 'count' ? 4 : 3);
  const groups = data.groups ?? null;
  const pins = data.pins ?? {};
  const pinned = names.filter((x) => pins[x] != null).length;
  const [picked, setPicked] = useState<string | null>(null);
  const make = (b = by, k = n) => set({ groups: makeGroups(names, b, k, pins), by: b, n: k });

  /** Moves a name to group `to` and pins it there. */
  const moveTo = (name: string, to: number) => {
    if (!groups) return;
    const next = groups.map((g) => g.filter((x) => x !== name));
    next[to]!.push(name);
    set({ groups: next, pins: { ...pins, [name]: to } });
    setPicked(null);
  };
  const unpin = (name: string) => {
    const { [name]: _, ...rest } = pins;
    set({ pins: rest });
  };
  const k = groups?.length ?? groupCount(names.length, by, n);

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
        {src === 'custom' && <textarea className={cn(inputCls, 'min-h-28 resize-none')} placeholder={'Un nombre por línea'} value={data.custom ?? ''} onChange={(e) => set({ custom: e.target.value, groups: null })} />}
        {names.length > 0 && (
          <>
            <div className="flex items-center justify-between gap-2">
              <Label>Asignar a un grupo</Label>
              {pinned > 0 && (
                <button type="button" className="text-ink-red text-[13px] font-semibold" onClick={() => set({ pins: {} })}>
                  Quitar fijados ({pinned})
                </button>
              )}
            </div>
            <ul className="divide-separator -mt-1 divide-y">
              {names.map((x) => (
                <li key={x} className="flex items-center gap-2 py-1.5">
                  <span className="min-w-0 flex-1 truncate text-[15px] font-medium">{x}</span>
                  <select
                    aria-label={`Grupo de ${x}`}
                    value={pins[x] != null && pins[x]! < k ? String(pins[x]) : ''}
                    onChange={(e) => (e.target.value === '' ? unpin(x) : set({ pins: { ...pins, [x]: Number(e.target.value) } }))}
                    className="bg-fill-2 h-9 rounded-full px-3 text-[14px] font-semibold outline-none"
                    style={pins[x] != null && pins[x]! < k ? { background: HEX[pins[x]! % HEX.length], color: '#fff' } : undefined}
                  >
                    <option value="">Al azar</option>
                    {Array.from({ length: k }, (_, i) => (
                      <option key={i} value={i}>
                        Grupo {i + 1}
                      </option>
                    ))}
                  </select>
                </li>
              ))}
            </ul>
          </>
        )}
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
      {groups?.length ? (
        <div className={cn('mx-3 mb-2 flex items-center gap-2 rounded-full px-3 py-1.5 text-[13px] font-medium', picked ? 'bg-label text-bg' : 'bg-fill-2 text-label-2')}>
          {picked ? (
            <>
              <span className="min-w-0 flex-1 truncate">
                Toca un grupo para mover a <b>{picked}</b>
              </span>
              <button type="button" aria-label="Cancelar" onClick={() => setPicked(null)}>
                <X size={16} />
              </button>
            </>
          ) : (
            <span className="min-w-0 flex-1 truncate">
              Toca o arrastra un nombre para cambiarlo de grupo{pinned ? ` · 📌 ${pinned} fijados (no se mezclan)` : ''}
            </span>
          )}
        </div>
      ) : null}
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
                <div
                  key={i}
                  className={cn('overflow-hidden rounded-[16px] transition-transform', picked && !g.includes(picked) && 'cursor-pointer hover:scale-[1.02]')}
                  style={{ background: `color-mix(in srgb, ${c} 14%, var(--card))`, boxShadow: `inset 0 0 0 ${picked && !g.includes(picked) ? 3 : 2}px color-mix(in srgb, ${c} ${picked && !g.includes(picked) ? 85 : 40}%, transparent)` }}
                  onClick={() => picked && !g.includes(picked) && moveTo(picked, i)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => {
                    e.preventDefault();
                    const name = e.dataTransfer.getData('text/plain');
                    if (name && !g.includes(name)) moveTo(name, i);
                  }}
                >
                  <div className="flex items-center justify-between px-3 py-1.5 text-[15px] font-bold text-white" style={{ background: c }}>
                    <span>Grupo {i + 1}</span>
                    <span className="opacity-80">{g.length}</span>
                  </div>
                  <ul className="px-3 py-2 text-[17px] leading-snug font-semibold">
                    {g.map((x) => (
                      <li
                        key={x}
                        draggable
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', x);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          setPicked((p) => (p === x ? null : x));
                        }}
                        className={cn('-mx-1.5 flex cursor-grab items-center gap-1 rounded-[8px] px-1.5', picked === x && 'bg-label text-bg')}
                      >
                        <span className="min-w-0 flex-1 truncate">{x}</span>
                        {pins[x] === i && (
                          <button
                            type="button"
                            aria-label={`Soltar a ${x}`}
                            title="Fijado: no se mezcla. Toca para soltar."
                            className="group/pin shrink-0 opacity-70 hover:opacity-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              unpin(x);
                            }}
                          >
                            <Pin size={14} className="group-hover/pin:hidden" />
                            <PinOff size={14} className="hidden group-hover/pin:block" />
                          </button>
                        )}
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
