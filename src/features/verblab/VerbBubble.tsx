import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { ArrowRight, Play, Star, Volume2, X } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import { loadVerbExamples } from '@/content/levels';
import type { EdSound, LabVerb } from '@/content/types';
import { speak } from '@/lib/speech';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/cn';
import { Highlight } from './highlight';

const SOUND: Record<EdSound, { label: string; color: string; tip: string }> = {
  t: { label: '-ed /t/', color: 'var(--blue)', tip: 'Termina en sonido sordo (p, k, s, ch, sh, f, x): la -ed suena /t/.' },
  d: { label: '-ed /d/', color: 'var(--green)', tip: 'Termina en sonido sonoro o vocal: la -ed suena /d/.' },
  id: { label: '-ed /ɪd/', color: 'var(--orange)', tip: 'Termina en t o d: la -ed añade una sílaba /ɪd/.' },
};

const STAGES = [
  { key: 'base', label: 'Presente', sub: 'base form', color: 'var(--green)' },
  { key: 'past', label: 'Pasado', sub: 'past simple', color: 'var(--blue)' },
  { key: 'part', label: 'Participio', sub: 'past participle', color: 'var(--purple)' },
] as const;

/** Speaks "dreamed / dreamt" as two words, not "slash". */
const spoken = (s: string) => s.replace(/\s*\/\s*/g, ', ');

/**
 * The verb "bubble" from the original Verb Quest: the three forms on a track,
 * each with its own example sentence and audio. Anchored to the tapped card on
 * wide screens; a bottom sheet on phones.
 */
export function VerbBubble({
  verb,
  anchor,
  saved,
  onToggleSaved,
  onClose,
}: {
  verb: LabVerb;
  anchor: HTMLElement | null;
  saved: boolean;
  onToggleSaved: () => void;
  onClose: () => void;
}) {
  const { data: examples } = useAsync(loadVerbExamples, []);
  const showEs = useSettings((s) => s.spanishHints);
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number; arrow: number; above: boolean } | null>(null);
  const [mobile, setMobile] = useState(() => window.innerWidth < 640);
  const ex = examples?.[verb.en];

  useLayoutEffect(() => {
    const place = () => {
      const isMobile = window.innerWidth < 640;
      setMobile(isMobile);
      if (isMobile || !anchor || !box.current) return setPos(null);
      const r = anchor.getBoundingClientRect();
      const bw = box.current.offsetWidth;
      const bh = box.current.offsetHeight;
      const left = Math.min(Math.max(12, r.left + r.width / 2 - bw / 2), window.innerWidth - bw - 12);
      const above = r.bottom + bh + 16 > window.innerHeight && r.top - bh - 16 > 0;
      setPos({ left, top: above ? r.top - bh - 12 : r.bottom + 12, arrow: r.left + r.width / 2 - left, above });
    };
    place();
    window.addEventListener('resize', place);
    window.addEventListener('scroll', place, true);
    return () => {
      window.removeEventListener('resize', place);
      window.removeEventListener('scroll', place, true);
    };
  }, [anchor, ex]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const onDown = (e: PointerEvent) => {
      const t = e.target as Node;
      if (box.current?.contains(t) || anchor?.contains(t)) return;
      onClose();
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('pointerdown', onDown);
    };
  }, [anchor, onClose]);

  const forms = { base: verb.en, past: verb.past, part: verb.part };
  const content = (
    <motion.div
      ref={box}
      role="dialog"
      aria-label={`${verb.en}: ${verb.past}, ${verb.part}`}
      initial={mobile ? { y: '100%' } : { opacity: 0, scale: 0.92, y: pos?.above ? 8 : -8 }}
      animate={mobile ? { y: 0 } : { opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
      className={cn(
        'bg-card text-label z-[80] shadow-[0_18px_50px_-12px_rgb(0_0_0/0.45)]',
        mobile ? 'pb-safe fixed inset-x-0 bottom-0 max-h-[85dvh] overflow-y-auto rounded-t-[28px] p-5' : 'fixed w-[min(560px,calc(100vw-24px))] rounded-[24px] p-5',
      )}
      style={!mobile ? { left: pos?.left ?? -9999, top: pos?.top ?? -9999 } : undefined}
    >
      {!mobile && pos && (
        <span
          className="bg-card absolute h-4 w-4 rotate-45"
          style={{ left: pos.arrow - 8, [pos.above ? 'bottom' : 'top']: -7 } as React.CSSProperties}
          aria-hidden
        />
      )}
      {mobile && <div className="bg-separator mx-auto mb-3 h-1 w-10 rounded-full" />}
      <div className="relative flex items-center gap-3">
        <span className="bg-fill-2 flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] text-[32px]">{verb.emoji}</span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-[24px] leading-tight font-extrabold">{verb.en}</span>
            <span
              className="rounded-full px-2 py-0.5 text-[11px] font-bold"
              style={{
                color: verb.type === 'irregular' ? 'var(--purple)' : 'var(--teal)',
                background: `color-mix(in srgb, ${verb.type === 'irregular' ? 'var(--purple)' : 'var(--teal)'} 14%, transparent)`,
              }}
            >
              {verb.type === 'irregular' ? 'Irregular' : 'Regular'}
            </span>
            {verb.sound && (
              <span className="rounded-full px-2 py-0.5 text-[11px] font-bold" style={{ color: SOUND[verb.sound].color, background: `color-mix(in srgb, ${SOUND[verb.sound].color} 14%, transparent)` }}>
                {SOUND[verb.sound].label}
              </span>
            )}
          </div>
          {showEs && <div className="text-label-2 text-[14px]">{verb.es}</div>}
        </div>
        <button type="button" onClick={onClose} className="bg-fill-2 hover:bg-fill flex h-9 w-9 shrink-0 items-center justify-center rounded-full" aria-label="Cerrar">
          <X size={17} />
        </button>
      </div>

      {/* the three forms on a track */}
      <div className="mt-4 grid grid-cols-[1fr_auto_1fr_auto_1fr] items-stretch gap-1.5">
        {STAGES.map((s, i) => (
          <StageCell key={s.key} i={i} label={s.label} sub={s.sub} color={s.color} word={forms[s.key]} />
        )).flatMap((el, i) => (i < 2 ? [el, <ArrowRight key={`a${i}`} size={16} className="text-label-3 self-center" aria-hidden />] : [el]))}
      </div>

      {/* one example per form */}
      <div className="mt-4 space-y-2">
        {STAGES.map((s, i) => {
          const sentence = ex?.[s.key];
          if (!sentence) return null;
          return (
            <motion.div
              key={s.key}
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.12 + i * 0.07 }}
              className="bg-fill-2 flex items-start gap-2.5 rounded-[14px] py-2 pr-2 pl-3"
              style={{ borderLeft: `4px solid ${s.color}` }}
            >
              <span className="w-[74px] shrink-0 pt-0.5 text-[11px] font-bold uppercase" style={{ color: s.color }}>
                {s.label}
              </span>
              <span className="flex-1 text-[15px] leading-snug">
                <Highlight text={sentence} terms={forms[s.key].split(/\s*\/\s*/)} color={s.color} />
              </span>
              <button type="button" onClick={() => speak(sentence, { rate: 0.92 })} className="text-ios-blue shrink-0 rounded-full p-1.5 hover:bg-fill" aria-label={`Escuchar: ${sentence}`}>
                <Volume2 size={15} />
              </button>
            </motion.div>
          );
        })}
      </div>

      {verb.sound && <p className="text-label-2 mt-3 text-[13px]">💡 {SOUND[verb.sound].tip}</p>}

      <div className="mt-4 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => speak(`${spoken(verb.en)}. ${spoken(verb.past)}. ${spoken(verb.part)}.`, { rate: 0.85 })}
          className="brand-gradient inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold text-white"
        >
          <Play size={14} fill="currentColor" /> Escuchar las 3 formas
        </button>
        <button type="button" onClick={onToggleSaved} className="bg-fill-2 hover:bg-fill inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[14px] font-semibold">
          <Star size={15} fill={saved ? 'currentColor' : 'none'} className={saved ? 'text-ios-yellow' : ''} /> {saved ? 'En mi lista' : 'Guardar'}
        </button>
      </div>
    </motion.div>
  );

  return createPortal(
    <>
      {mobile && <motion.div className="fixed inset-0 z-[79] bg-black/35" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={onClose} />}
      {content}
    </>,
    document.body,
  );
}

function StageCell({ i, label, sub, color, word }: { i: number; label: string; sub: string; color: string; word: string }) {
  return (
    <motion.button
      type="button"
      onClick={() => speak(spoken(word), { rate: 0.85 })}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 + i * 0.1, type: 'spring', stiffness: 400, damping: 26 }}
      className="flex min-w-0 flex-col items-center rounded-[16px] px-1.5 py-2.5 text-center"
      style={{ background: `color-mix(in srgb, ${color} 13%, var(--card))`, boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${color} 35%, transparent)` }}
      aria-label={`${label}: ${word}. Escuchar`}
    >
      <span className="text-[10px] font-bold tracking-wide uppercase" style={{ color }}>
        {label}
      </span>
      <span className="mt-0.5 max-w-full text-[17px] leading-tight font-extrabold break-words">{word}</span>
      <span className="text-label-3 mt-0.5 inline-flex items-center gap-0.5 text-[10px]">
        <Volume2 size={10} /> {sub}
      </span>
    </motion.button>
  );
}
