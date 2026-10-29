import { AlignCenter, AlignLeft, Bold, Minus, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { WidgetProps } from '../util';

interface D {
  text: string;
  size: number;
  color: string;
  bold: boolean;
  center: boolean;
}

const NOTES: { id: string; bg: string; fg: string }[] = [
  { id: 'yellow', bg: '#fef08a', fg: '#1c1917' },
  { id: 'pink', bg: '#fbcfe8', fg: '#1c1917' },
  { id: 'blue', bg: '#bfdbfe', fg: '#0f172a' },
  { id: 'green', bg: '#bbf7d0', fg: '#052e16' },
  { id: 'card', bg: 'var(--card)', fg: 'var(--label)' },
  { id: 'dark', bg: '#111827', fg: '#f9fafb' },
];
const SIZES = [18, 24, 32, 44, 60, 80, 110];

export default function Text({ data, set, editing }: WidgetProps<D>) {
  const note = NOTES.find((n) => n.id === data.color) ?? NOTES[0]!;
  const size = Math.min(SIZES.length - 1, Math.max(0, data.size ?? 2));
  return (
    <div className="flex h-full flex-col" style={{ background: note.bg, color: note.fg }}>
      <textarea
        value={data.text ?? ''}
        onChange={(e) => set({ text: e.target.value })}
        placeholder="Escribe aquí…"
        aria-label="Texto"
        className={cn('min-h-0 w-full flex-1 resize-none bg-transparent p-4 leading-[1.2] outline-none placeholder:opacity-40', data.bold !== false && 'font-bold', data.center && 'text-center')}
        style={{ fontSize: SIZES[size], color: 'inherit' }}
      />
      {editing && (
        <div className="flex flex-wrap items-center gap-1.5 bg-black/5 px-3 py-2">
          <button type="button" aria-label="Más pequeño" onClick={() => set({ size: Math.max(0, size - 1) })} className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-black">
            <Minus size={16} />
          </button>
          <button type="button" aria-label="Más grande" onClick={() => set({ size: Math.min(SIZES.length - 1, size + 1) })} className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-black">
            <Plus size={16} />
          </button>
          <button type="button" aria-label="Negrita" aria-pressed={data.bold !== false} onClick={() => set({ bold: data.bold === false })} className={cn('grid h-9 w-9 place-items-center rounded-full text-black', data.bold !== false ? 'bg-white' : 'bg-white/50')}>
            <Bold size={16} />
          </button>
          <button type="button" aria-label="Centrar" onClick={() => set({ center: !data.center })} className="grid h-9 w-9 place-items-center rounded-full bg-white/70 text-black">
            {data.center ? <AlignLeft size={16} /> : <AlignCenter size={16} />}
          </button>
          <span className="mx-1 h-6 w-px bg-black/15" />
          {NOTES.map((n) => (
            <button key={n.id} type="button" aria-label={`Color ${n.id}`} onClick={() => set({ color: n.id })} className={cn('h-8 w-8 rounded-full border border-black/15', n.id === note.id && 'ring-2 ring-black/60 ring-offset-1')} style={{ background: n.bg }} />
          ))}
        </div>
      )}
    </div>
  );
}
