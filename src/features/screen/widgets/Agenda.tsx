import { Check, Plus, RotateCcw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { uid } from '../state';
import type { WidgetProps } from '../util';
import { Act } from './ui';

interface Item {
  id: string;
  time: string;
  text: string;
  done: boolean;
}
interface D {
  title: string;
  items: Item[];
}

const DEFAULT: Item[] = [
  { id: 'a', time: "5'", text: 'Warm-up', done: false },
  { id: 'b', time: "15'", text: 'Vocabulario nuevo', done: false },
  { id: 'c', time: "15'", text: 'Práctica en parejas', done: false },
  { id: 'd', time: "10'", text: 'Juego / reto', done: false },
  { id: 'e', time: "5'", text: 'Cierre y tarea', done: false },
];

export default function Agenda({ data, set, editing }: WidgetProps<D>) {
  const items = data.items ?? DEFAULT;
  const current = items.findIndex((i) => !i.done);
  const upd = (id: string, p: Partial<Item>) => set({ items: items.map((x) => (x.id === id ? { ...x, ...p } : x)) });
  const doneCount = items.filter((i) => i.done).length;
  return (
    <div className="flex h-full flex-col [container-type:inline-size]">
      <div className="mx-3 mt-2 h-2 overflow-hidden rounded-full bg-fill-2">
        <div className="h-full rounded-full bg-[var(--green)] transition-[width] duration-500" style={{ width: `${items.length ? (doneCount / items.length) * 100 : 0}%` }} />
      </div>
      <ol className="min-h-0 flex-1 space-y-1.5 overflow-auto p-3">
        {items.map((it, i) => (
          <li
            key={it.id}
            className={cn('flex items-center gap-3 rounded-[14px] px-3 py-2 transition-colors', i === current ? 'bg-[color-mix(in_srgb,var(--blue)_14%,transparent)] shadow-[inset_4px_0_0_var(--blue)]' : 'bg-fill-2')}
          >
            <button
              type="button"
              aria-label={it.done ? 'Marcar pendiente' : 'Marcar hecho'}
              onClick={() => upd(it.id, { done: !it.done })}
              className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-full border-2 transition-colors', it.done ? 'border-transparent bg-[var(--green)] text-white' : 'border-[var(--label-3)]')}
            >
              {it.done && <Check size={18} strokeWidth={3} />}
            </button>
            {editing ? (
              <>
                <input value={it.time} onChange={(e) => upd(it.id, { time: e.target.value })} aria-label="Tiempo" className="bg-card w-16 rounded-[8px] px-2 py-1 text-[15px] font-semibold outline-none" />
                <input value={it.text} onChange={(e) => upd(it.id, { text: e.target.value })} aria-label="Paso" className="bg-card min-w-0 flex-1 rounded-[8px] px-2 py-1 text-[17px] outline-none" />
                <button type="button" aria-label="Quitar" onClick={() => set({ items: items.filter((x) => x.id !== it.id) })} className="text-ink-red shrink-0">
                  <Trash2 size={18} />
                </button>
              </>
            ) : (
              <>
                <span className={cn('min-w-0 flex-1 text-[clamp(16px,6cqw,26px)] leading-tight font-semibold', it.done && 'text-label-3 line-through')}>{it.text}</span>
                {it.time && <span className="text-label-2 shrink-0 text-[15px] font-bold tabular-nums">{it.time}</span>}
              </>
            )}
          </li>
        ))}
      </ol>
      <div className="flex justify-center gap-2 px-3 pb-3">
        {editing && (
          <Act color="var(--blue)" onClick={() => set({ items: [...items, { id: uid(), time: "5'", text: 'Nuevo paso', done: false }] })}>
            <Plus size={18} /> Paso
          </Act>
        )}
        <Act color="var(--label)" disabled={!doneCount} onClick={() => set({ items: items.map((x) => ({ ...x, done: false })) })}>
          <RotateCcw size={18} /> Reiniciar
        </Act>
      </div>
    </div>
  );
}
