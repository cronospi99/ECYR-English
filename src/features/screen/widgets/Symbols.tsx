import { Ear, Hand, Handshake, MessagesSquare, VolumeX, type LucideIcon } from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '@/lib/cn';
import type { WidgetProps } from '../util';

export const SYMBOLS: { id: string; label: string; en: string; icon: LucideIcon; color: string }[] = [
  { id: 'silence', label: 'Silencio', en: 'Silence', icon: VolumeX, color: '#ef4444' },
  { id: 'whisper', label: 'Susurrar', en: 'Whisper', icon: Ear, color: '#f59e0b' },
  { id: 'partner', label: 'Pregunta a un compañero', en: 'Ask a partner', icon: MessagesSquare, color: '#3b82f6' },
  { id: 'team', label: 'Trabajo en equipo', en: 'Teamwork', icon: Handshake, color: '#22c55e' },
  { id: 'hand', label: 'Levanta la mano', en: 'Raise your hand', icon: Hand, color: '#a855f7' },
];

interface D {
  sel: string;
}

export default function Symbols({ data, set }: WidgetProps<D>) {
  const cur = SYMBOLS.find((s) => s.id === data.sel) ?? SYMBOLS[0]!;
  const Icon = cur.icon;
  return (
    <div className="flex h-full flex-col">
      <motion.div
        key={cur.id}
        initial={{ scale: 0.85, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 400, damping: 26 }}
        className="m-3 mb-2 flex min-h-0 flex-1 flex-col items-center justify-center gap-[3cqh] rounded-[20px] p-3 text-center text-white [container-type:size]"
        style={{ background: `linear-gradient(160deg, ${cur.color}, color-mix(in srgb, ${cur.color} 70%, #000))` }}
      >
        <Icon strokeWidth={2.2} style={{ width: 'min(48cqh, 50cqw)', height: 'min(48cqh, 50cqw)' }} />
        <div className="font-rounded leading-tight font-black" style={{ fontSize: 'min(13cqh, 11cqw)' }}>
          {cur.label}
        </div>
        <div className="font-semibold opacity-80" style={{ fontSize: 'min(7cqh, 6cqw)' }}>
          {cur.en}
        </div>
      </motion.div>
      <div className="flex justify-center gap-1.5 px-3 pb-3">
        {SYMBOLS.map((s) => (
          <button
            key={s.id}
            type="button"
            title={s.label}
            aria-label={s.label}
            aria-pressed={s.id === cur.id}
            onClick={() => set({ sel: s.id })}
            className={cn('grid h-11 w-11 place-items-center rounded-full transition-transform active:scale-90', s.id === cur.id && 'ring-label ring-2 ring-offset-2 ring-offset-[var(--card)]')}
            style={{ background: `color-mix(in srgb, ${s.color} 18%, transparent)`, color: s.color }}
          >
            <s.icon size={22} strokeWidth={2.4} />
          </button>
        ))}
      </div>
    </div>
  );
}
