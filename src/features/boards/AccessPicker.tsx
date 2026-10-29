import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Lock, Search, Users, X } from 'lucide-react';
import { Sheet, SheetAction } from '@/features/portfolio/Sheet';
import { Spinner } from '@/components/ui/Misc';
import { useClass } from '@/features/teacher/useClass';
import { cn } from '@/lib/cn';

const AVATAR = ['var(--blue)', 'var(--orange)', 'var(--green)', 'var(--purple)', 'var(--pink)', 'var(--teal)', 'var(--indigo)'];
const norm = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase();
function hue(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return AVATAR[Math.abs(h) % AVATAR.length]!;
}

/** "🔒 Privado · 3" — the badge of a wall that is not for the whole class. */
export function PrivateBadge({ count, className, short = false }: { count: number | null | undefined; className?: string; short?: boolean }) {
  if (count === null || count === undefined) return null;
  return (
    <span
      className={cn('inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-bold whitespace-nowrap', className)}
      style={{ background: 'color-mix(in srgb, var(--indigo) 15%, transparent)', color: 'color-mix(in srgb, var(--indigo) 70%, var(--label))' }}
    >
      {count === 1 ? '👤' : '🔒'}
      {short ? <span className="tabular-nums">{count}</span> : <span>Privado · <span className="tabular-nums">{count}</span></span>}
    </span>
  );
}

/**
 * Who can enter a wall: the whole class (null) or a chosen list of students.
 * The roster comes from the teacher's class.
 */
export function AccessPicker({ value, onChange }: { value: string[] | null; onChange: (v: string[] | null) => void }) {
  const { students, loading, error } = useClass();
  const [q, setQ] = useState('');
  const roster = students ?? [];
  const some = value !== null;
  const chosen = new Set(value ?? []);
  const shown = roster.filter((s) => !q || norm(`${s.profile.full_name ?? ''} ${s.profile.email ?? ''}`).includes(norm(q.trim())));

  const toggle = (id: string) => onChange(chosen.has(id) ? (value ?? []).filter((x) => x !== id) : [...(value ?? []), id]);

  return (
    <div className="flex flex-col gap-3">
      <div role="radiogroup" aria-label="Quién puede entrar" className="grid grid-cols-2 gap-2">
        {[
          { on: !some, icon: <Users size={22} />, title: 'Toda la clase', sub: students ? `${roster.length} estudiantes` : 'Como siempre', tone: 'var(--green)', pick: () => onChange(null) },
          { on: some, icon: <Lock size={21} />, title: 'Solo algunos', sub: some ? `${chosen.size} ${chosen.size === 1 ? 'elegido' : 'elegidos'}` : 'Privado, 1 a 1…', tone: 'var(--indigo)', pick: () => !some && onChange([]) },
        ].map((o) => (
          <button
            key={o.title}
            type="button"
            role="radio"
            aria-checked={o.on}
            onClick={o.pick}
            className={cn('flex items-center gap-2 rounded-[16px] p-2.5 text-left transition-all duration-200 sm:gap-2.5 sm:p-3', o.on ? 'scale-[1.01]' : 'bg-fill-2 hover:bg-fill')}
            style={o.on ? { background: `color-mix(in srgb, ${o.tone} 14%, var(--card))`, boxShadow: `inset 0 0 0 2.5px ${o.tone}` } : undefined}
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] sm:h-10 sm:w-10 sm:rounded-[12px]" style={{ background: `color-mix(in srgb, ${o.tone} 18%, transparent)`, color: `color-mix(in srgb, ${o.tone} 70%, var(--label))` }}>
              {o.icon}
            </span>
            <span className="min-w-0">
              <span className="block text-[14px] leading-tight font-bold sm:text-[15px]">{o.title}</span>
              <span className="text-label-2 block truncate text-[12px] font-medium">{o.sub}</span>
            </span>
          </button>
        ))}
      </div>

      <AnimatePresence initial={false}>
        {some && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="bg-fill-2 flex flex-col gap-2 rounded-[16px] p-2">
              <div className="flex items-center gap-2">
                <label className="bg-card flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[12px] px-3">
                  <Search size={17} className="text-label-3 shrink-0" />
                  <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar estudiante" aria-label="Buscar estudiante" className="placeholder:text-label-3 min-w-0 flex-1 bg-transparent text-[15px] outline-none" />
                  {q && (
                    <button type="button" aria-label="Borrar búsqueda" onClick={() => setQ('')} className="text-label-3">
                      <X size={16} />
                    </button>
                  )}
                </label>
                <button
                  type="button"
                  onClick={() => onChange(chosen.size && shown.every((s) => chosen.has(s.profile.id)) ? (value ?? []).filter((id) => !shown.some((s) => s.profile.id === id)) : [...new Set([...(value ?? []), ...shown.map((s) => s.profile.id)])])}
                  disabled={!shown.length}
                  className="text-ink-blue h-10 shrink-0 rounded-[12px] px-2.5 text-[14px] font-semibold disabled:opacity-40"
                >
                  {chosen.size && shown.length && shown.every((s) => chosen.has(s.profile.id)) ? 'Ninguno' : 'Todos'}
                </button>
              </div>
              <div className="flex max-h-[264px] flex-col overflow-y-auto overscroll-contain">
                {loading && !students ? (
                  <div className="text-label-2 flex justify-center py-6">
                    <Spinner className="h-6 w-6" />
                  </div>
                ) : !roster.length ? (
                  <p className="text-label-2 px-3 py-5 text-center text-[14px]">{error ? 'No se pudo cargar tu clase.' : 'Aún no tienes estudiantes. Comparte tu código de clase.'}</p>
                ) : !shown.length ? (
                  <p className="text-label-2 px-3 py-5 text-center text-[14px]">Sin resultados</p>
                ) : (
                  shown.map((s) => {
                    const on = chosen.has(s.profile.id);
                    const name = s.profile.full_name?.trim() || s.profile.email?.split('@')[0] || 'Estudiante';
                    return (
                      <button
                        key={s.profile.id}
                        type="button"
                        role="checkbox"
                        aria-checked={on}
                        onClick={() => toggle(s.profile.id)}
                        className={cn('flex min-h-[52px] items-center gap-3 rounded-[12px] px-2.5 py-1.5 text-left transition-colors', on ? 'bg-card' : 'hover:bg-card/60')}
                      >
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white" style={{ background: hue(s.profile.id) }}>
                          {name.charAt(0).toUpperCase()}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold">{name}</span>
                          {s.profile.email && <span className="text-label-2 block truncate text-[12px]">{s.profile.email}</span>}
                        </span>
                        <motion.span
                          animate={{ scale: on ? 1 : 0.85 }}
                          className={cn('flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2', on ? 'border-transparent bg-[var(--indigo)] text-white' : 'border-[var(--separator)]')}
                        >
                          {on && <Check size={16} strokeWidth={3.2} />}
                        </motion.span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
            {chosen.size === 0 && <p className="text-ink-orange mt-2 px-1 text-[13px] font-semibold">Elige al menos un estudiante 👆</p>}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Teacher: change who can enter an existing wall. */
export function AccessSheet({ open, initial, onClose, onSave }: { open: boolean; initial: string[] | null; onClose: () => void; onSave: (members: string[] | null) => void }) {
  const [value, setValue] = useState<string[] | null>(initial);
  useEffect(() => {
    if (open) setValue(initial);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  const can = value === null || value.length > 0;
  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="¿Quién puede entrar?"
      closeLabel="Cancelar"
      trailing={
        <SheetAction bold disabled={!can} onClick={() => onSave(value)}>
          Guardar
        </SheetAction>
      }
    >
      <div className="p-4 sm:p-6">
        <AccessPicker value={value} onChange={setValue} />
      </div>
    </Sheet>
  );
}
