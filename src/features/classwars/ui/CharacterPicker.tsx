/* Class Wars — character picker: all 25 teachers, each with a unique power. */
import { useEffect, useRef } from 'react';
import { ChevronLeft, ChevronRight, Timer } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { TEACHERS } from '@/features/cards/teachers';
import { cn } from '@/lib/cn';
import { POWERS } from '../game/defs';
import { Btn, GameIcon, Toon } from './kit';

export function CharacterPicker({ value, onChange, onConfirm, confirmLabel = '¡Listo!', busy }: { value: number; onChange: (ci: number) => void; onConfirm?: () => void; confirmLabel?: string; busy?: boolean }) {
  const t = TEACHERS[value];
  const pw = POWERS[t.id];
  const grid = useRef<HTMLDivElement>(null);
  useEffect(() => {
    grid.current?.querySelector(`[data-ci="${value}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  }, [value]);
  const step = (d: number) => onChange((value + d + TEACHERS.length) % TEACHERS.length);
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') step(1);
      else if (e.key === 'ArrowLeft') step(-1);
      else if (e.key === 'Enter' && onConfirm) onConfirm();
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  return (
    <div className="flex min-h-0 w-full flex-1 flex-col gap-3 md:flex-row md:gap-5">
      {/* preview */}
      <div className="relative flex shrink-0 flex-col items-center rounded-[26px] border-2 border-white/10 bg-gradient-to-b from-[#2b377d] to-[#1b2257] p-3 md:w-[340px] md:p-5">
        <div className="flex w-full items-center justify-between">
          <button type="button" aria-label="Anterior" onClick={() => step(-1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ChevronLeft /></button>
          <div className="text-center">
            <div className="cw-title text-[24px] leading-none md:text-[28px]">{t.name}</div>
            <div className="mt-1 text-[12px] font-bold tracking-wider text-white/60 uppercase">{t.role === 'Teacher' ? 'Teacher' : t.role}</div>
          </div>
          <button type="button" aria-label="Siguiente" onClick={() => step(1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20"><ChevronRight /></button>
        </div>
        <div className="relative my-1 flex h-[112px] w-full items-end justify-center md:h-[230px]">
          <div className="cw-lawn absolute inset-x-6 bottom-2 h-10 rounded-[50%] opacity-80 blur-[1px]" />
          <AnimatePresence mode="popLayout">
            <motion.div key={value} initial={{ scale: 0.6, y: 20, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.8, opacity: 0 }} transition={{ type: 'spring', stiffness: 420, damping: 22 }} className="relative">
              <Toon ci={value} size={96} live className="drop-shadow-[0_8px_0_rgba(0,0,0,.2)] md:hidden" />
              <Toon ci={value} size={190} live className="hidden drop-shadow-[0_8px_0_rgba(0,0,0,.2)] md:block" />
            </motion.div>
          </AnimatePresence>
        </div>
        <p className="mb-2 hidden text-center text-[13px] font-semibold text-white/70 italic sm:block">“{t.about}”</p>
        <div className="w-full rounded-2xl border-2 p-3" style={{ borderColor: pw.color + '88', background: `linear-gradient(135deg, ${pw.color}33, transparent)` }}>
          <div className="flex items-center gap-3">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-full border-[3px] border-[#0e1230] text-[24px]" style={{ background: pw.color }}><GameIcon k={pw.ic} size={30} /></div>
            <div className="min-w-0">
              <div className="text-[11px] font-extrabold tracking-wider text-white/60 uppercase">Poder especial</div>
              <div className="text-[18px] leading-tight font-black">{pw.name}</div>
            </div>
            <div className="ml-auto flex items-center gap-1 rounded-full bg-black/25 px-2 py-1 text-[12px] font-bold text-white/80"><Timer size={13} />{pw.cd}s</div>
          </div>
          <p className="mt-2 text-[13px] leading-snug font-medium text-white/85 sm:text-[13.5px]">{pw.desc}</p>
        </div>
        {onConfirm && (
          <Btn big tone="green" className="mt-2 w-full md:mt-3" onClick={onConfirm} disabled={busy}>{confirmLabel}</Btn>
        )}
      </div>
      {/* grid */}
      <div ref={grid} className="cw-scroll grid min-h-0 flex-1 auto-rows-max grid-cols-4 gap-2 overflow-y-auto p-1 sm:grid-cols-5 md:gap-3 lg:grid-cols-5">
        {TEACHERS.map((tc, i) => {
          const p = POWERS[tc.id];
          const on = i === value;
          return (
            <button
              key={tc.id}
              type="button"
              data-ci={i}
              onClick={() => onChange(i)}
              className={cn(
                'group relative flex flex-col items-center overflow-hidden rounded-2xl border-[3px] pt-1 pb-1.5 transition-transform duration-150 hover:-translate-y-0.5',
                on ? 'border-[#ffd23f] bg-[#3a4796] shadow-[0_0_0_3px_rgba(255,210,63,.35)]' : 'border-white/10 bg-[#253070] hover:border-white/30',
              )}
              aria-pressed={on}
              aria-label={`${tc.name}: ${p.name}`}
            >
              <span className="absolute top-1 right-1 grid h-6 w-6 place-items-center rounded-full text-[13px]" style={{ background: p.color }}><GameIcon k={p.ic} size={17} /></span>
              <div className={cn('h-[64px] w-full overflow-hidden sm:h-[78px]', on && 'cw-bob')}>
                <Toon ci={i} size={70} className="mx-auto -mt-1 sm:hidden" />
                <Toon ci={i} size={84} className="mx-auto -mt-1 hidden sm:block" />
              </div>
              <span className="w-full truncate px-1 text-center text-[12px] font-extrabold sm:text-[13px]">{tc.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
