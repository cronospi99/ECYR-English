/**
 * "En imágenes": a grammar point at a glance, in Spanish — what it is for, the
 * formula as coloured blocks joined by arrows (each block with its piece of the
 * example under it), a timeline, Spanish next to English, the classic mistake
 * and one trick. Shown before the full lesson so the class is not a wall of text.
 * Content: src/content/generated/explainers-<level>.json, keyed "A1-2-0".
 */
import { useId } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { ArrowDown, ArrowRight, Check, Lightbulb, X } from 'lucide-react';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { cn } from '@/lib/cn';
import { deep, ink } from '@/lib/color';

export type Role =
  | 'subject'
  | 'aux'
  | 'be'
  | 'modal'
  | 'verb'
  | 'neg'
  | 'object'
  | 'complement'
  | 'time'
  | 'place'
  | 'question'
  | 'connector'
  | 'particle'
  | 'adjective'
  | 'noun'
  | 'end';
export interface Chip {
  role: Role;
  label_es: string;
  en: string;
}
export type TimelineType =
  | 'habit'
  | 'now'
  | 'past-point'
  | 'past-span'
  | 'past-before-past'
  | 'past-to-now'
  | 'future-plan'
  | 'future-point'
  | 'future-before'
  | 'unreal-present'
  | 'unreal-past'
  | 'none';
export interface Explainer {
  icon: string;
  purpose_es: string;
  idea_es: string;
  formula: Chip[];
  example: { en: string; es: string };
  formula2?: { title_es: string; parts: Chip[]; example: { en: string; es: string } };
  timeline?: { type: TimelineType; label_es?: string };
  compare?: { es: string; en: string; note_es: string };
  mistake?: { wrong: string; right: string; why_es: string };
  tip_es?: string;
}

const ROLE: Record<Role, string> = {
  subject: 'var(--blue)',
  aux: 'var(--purple)',
  be: 'var(--purple)',
  modal: 'var(--indigo)',
  verb: 'var(--green)',
  neg: 'var(--red)',
  object: 'var(--orange)',
  complement: 'var(--orange)',
  time: 'var(--teal)',
  place: 'var(--teal)',
  question: 'var(--pink)',
  connector: 'var(--indigo)',
  particle: 'var(--yellow)',
  adjective: 'var(--mint)',
  noun: 'var(--brown, #a2845e)',
  end: 'var(--gray, #8e8e93)',
};

export function ExplainerCard({ e, color }: { e: Explainer; color: string }) {
  return (
    <div className="space-y-4">
      {/* what for */}
      <div className="flex items-start gap-3">
        <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-[28px]" style={{ background: `color-mix(in srgb, ${color} 15%, transparent)` }}>
          {e.icon}
        </span>
        <div className="min-w-0">
          <div className="text-[17px] leading-snug font-bold text-balance">{e.purpose_es}</div>
          <p className="text-label-2 mt-0.5 text-[15px] leading-snug text-pretty">{e.idea_es}</p>
        </div>
      </div>

      <Formula parts={e.formula} example={e.example} />
      {e.formula2 && <Formula title={e.formula2.title_es} parts={e.formula2.parts} example={e.formula2.example} />}

      {e.timeline && e.timeline.type !== 'none' && <Timeline type={e.timeline.type} label={e.timeline.label_es} color={color} />}

      <div className="grid gap-3 sm:grid-cols-2">
        {e.compare && (
          <div className="bg-fill-2 rounded-[16px] p-3.5">
            <div className="text-label-2 mb-2 text-[11px] font-bold tracking-wide uppercase">Español → inglés</div>
            <div className="flex items-start gap-2 text-[15px]">
              <span className="shrink-0" aria-hidden>
                🇨🇴
              </span>
              <span className="text-label-2">{e.compare.es}</span>
            </div>
            <ArrowDown size={16} className="text-label-3 my-1 ml-1" aria-hidden />
            <div className="flex items-start gap-2 text-[15px] font-semibold">
              <span className="shrink-0" aria-hidden>
                🇬🇧
              </span>
              <span className="flex-1">{e.compare.en}</span>
              <SpeakButton text={e.compare.en} size={15} />
            </div>
            <p className="text-label-2 mt-2 text-[13px] leading-snug">{e.compare.note_es}</p>
          </div>
        )}
        {e.mistake && (
          <div className="rounded-[16px] p-3.5" style={{ background: 'color-mix(in srgb, var(--orange) 9%, transparent)' }}>
            <div className="text-ink-orange mb-2 text-[11px] font-bold tracking-wide uppercase">Error típico</div>
            <div className="flex items-start gap-2 text-[15px]">
              <X size={17} className="text-ink-red mt-0.5 shrink-0" />
              <span className="text-label-2 line-through decoration-1">{e.mistake.wrong}</span>
            </div>
            <ArrowDown size={16} className="text-label-3 my-1 ml-0.5" aria-hidden />
            <div className="flex items-start gap-2 text-[15px] font-semibold">
              <Check size={17} className="text-ink-green mt-0.5 shrink-0" />
              <span>{e.mistake.right}</span>
            </div>
            <p className="text-label-2 mt-2 text-[13px] leading-snug">{e.mistake.why_es}</p>
          </div>
        )}
      </div>

      {e.tip_es && (
        <div className="flex items-start gap-2.5 rounded-[14px] px-3.5 py-3 text-[14.5px] leading-snug" style={{ background: 'color-mix(in srgb, var(--yellow) 16%, transparent)' }}>
          <Lightbulb size={18} className="mt-0.5 shrink-0" style={{ color: 'color-mix(in srgb, var(--yellow) 60%, var(--label))' }} />
          <span>
            <b>Truco: </b>
            {e.tip_es.replace(/^truco:\s*/i, '')}
          </span>
        </div>
      )}
    </div>
  );
}

/** Blocks joined by arrows; each block shows its role in Spanish on top and its words from the example below. */
function Formula({ parts, example, title }: { parts: Chip[]; example: { en: string; es: string }; title?: string }) {
  const reduce = useReducedMotion();
  const chips = parts.filter((p) => p.role !== 'end');
  return (
    <div className="bg-card rounded-[18px] p-3.5 shadow-[inset_0_0_0_1px_var(--separator)] sm:p-4">
      <div className="text-label-2 mb-2.5 text-[11px] font-bold tracking-wide uppercase">{title ?? 'Fórmula'}</div>
      <div className="flex flex-wrap items-center gap-y-2">
        {chips.map((c, i) => {
          const col = ROLE[c.role] ?? 'var(--blue)';
          // The arrow travels with the block after it, so a line never ends on an arrow.
          return (
            <motion.div
              key={i}
              initial={reduce ? false : { opacity: 0, y: 6, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.08, type: 'spring', stiffness: 380, damping: 26 }}
              className="flex items-end"
            >
              {i > 0 && (
                <motion.span
                  className="text-label-2 px-1 pb-2.5"
                  aria-hidden
                  initial={reduce ? false : { opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 + 0.05, duration: 0.3 }}
                >
                  <ArrowRight size={18} strokeWidth={2.5} />
                </motion.span>
              )}
              <span className="flex flex-col items-center">
                <span
                  className="w-full rounded-t-[11px] px-2.5 pt-1 pb-0.5 text-center text-[11px] font-bold tracking-wide whitespace-nowrap text-white uppercase"
                  style={{ background: deep(col, 58) }}
                >
                  {c.label_es}
                </span>
                <span
                  className="w-full rounded-b-[11px] px-3 py-1.5 text-center text-[17px] leading-tight font-bold whitespace-nowrap"
                  style={{ color: ink(col), background: `color-mix(in srgb, ${col} 14%, transparent)`, boxShadow: `inset 0 0 0 1.5px color-mix(in srgb, ${col} 40%, transparent)` }}
                >
                  {c.en}
                </span>
              </span>
            </motion.div>
          );
        })}
      </div>
      <div className="mt-3.5 flex items-start gap-2 border-t border-[var(--separator)] pt-3">
        <span className="flex-1">
          <span className="block text-[16.5px] font-semibold">{example.en}</span>
          <span className="text-label-2 block text-[13.5px]">{example.es}</span>
        </span>
        <SpeakButton text={example.en} size={16} />
      </div>
    </div>
  );
}

// --------------------------------------------------------------- timeline --

const TL_TEXT: Record<Exclude<TimelineType, 'none'>, string> = {
  habit: 'Se repite siempre',
  now: 'Está pasando ahora',
  'past-point': 'Terminó en un momento del pasado',
  'past-span': 'Estaba en progreso en el pasado',
  'past-before-past': 'Una acción antes de otra, en el pasado',
  'past-to-now': 'Empezó en el pasado y llega hasta hoy',
  'future-plan': 'Plan o intención para el futuro',
  'future-point': 'Predicción o hecho futuro',
  'future-before': 'Terminará antes de un momento futuro',
  'unreal-present': 'Imaginario: no es real ahora',
  'unreal-past': 'Imaginario: no pasó así en el pasado',
};

/** A small line from PAST to FUTURE with NOW in the middle, marked for each kind of time. */
function Timeline({ type, label, color }: { type: Exclude<TimelineType, 'none'>; label?: string; color: string }) {
  const reduce = useReducedMotion();
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const W = 320;
  const Y = 44;
  const NOW = 190;
  const c = color;
  const dot = (x: number, k: string, fill = c) => (
    <motion.circle
      key={k}
      cx={x}
      cy={Y}
      r={7}
      style={{ fill }}
      initial={reduce ? false : { scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 20, delay: 0.15 + (x / W) * 0.4 }}
    />
  );
  const bar = (x1: number, x2: number, k: string, dashed = false) => (
    <motion.line
      key={k}
      x1={x1}
      y1={Y}
      x2={x2}
      y2={Y}
      stroke={c}
      strokeWidth={8}
      strokeLinecap="round"
      strokeDasharray={dashed ? '2 10' : undefined}
      initial={reduce ? false : { pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.7 }}
    />
  );
  const arc = (x1: number, x2: number, k: string) => (
    <motion.path
      key={k}
      d={`M${x1} ${Y - 9} Q ${(x1 + x2) / 2} ${Y - 40} ${x2} ${Y - 9}`}
      fill="none"
      stroke={c}
      strokeWidth={2.5}
      markerEnd={`url(#${uid}a)`}
      initial={reduce ? false : { pathLength: 0 }}
      animate={{ pathLength: 1 }}
      transition={{ duration: 0.7, delay: 0.2 }}
    />
  );
  const tag = (x: number, text: string, k: string) => (
    <text key={k} x={x} y={Y + 27} textAnchor="middle" fontSize="12.5" fontWeight={800} style={{ fill: `color-mix(in srgb, ${c} 70%, var(--label))` }}>
      {text}
    </text>
  );

  const marks: React.ReactNode[] = [];
  switch (type) {
    case 'habit':
      [40, 85, 130, 175, 220, 265].forEach((x, i) => marks.push(dot(x, `h${i}`)));
      break;
    case 'now':
      marks.push(bar(NOW - 30, NOW + 30, 'n'), dot(NOW, 'nd'));
      break;
    case 'past-point':
      marks.push(dot(85, 'p'), tag(85, '✔ terminó', 'pt'));
      break;
    case 'past-span':
      marks.push(bar(55, 135, 'ps'), dot(100, 'pd', 'var(--label)'), tag(100, 'en progreso', 'pt'));
      break;
    case 'past-before-past':
      marks.push(dot(60, 'a'), dot(135, 'b', 'var(--label)'), tag(60, '1º', 'ta'), tag(135, '2º', 'tb'), arc(66, 128, 'ab'));
      break;
    case 'past-to-now':
      marks.push(bar(60, NOW, 'pn'), dot(60, 'pa'), tag(60, 'empezó', 'tp'));
      break;
    case 'future-plan':
      marks.push(arc(NOW + 6, 268, 'fp'), dot(272, 'fd'), tag(272, 'plan', 'tf'));
      break;
    case 'future-point':
      marks.push(dot(262, 'f'), tag(262, '¿pasará?', 'tf'));
      break;
    case 'future-before':
      marks.push(dot(235, 'fa'), dot(290, 'fb', 'var(--label)'), tag(235, 'hecho', 'ta'), tag(290, 'momento', 'tb'), arc(241, 284, 'fab'));
      break;
    case 'unreal-present':
      marks.push(bar(NOW - 40, NOW + 70, 'u', true), tag(NOW + 15, '☁ imaginario', 'tu'));
      break;
    case 'unreal-past':
      marks.push(bar(50, 140, 'up', true), tag(95, '☁ no pasó así', 'tu'));
      break;
  }

  return (
    <div className="bg-card rounded-[18px] p-3.5 shadow-[inset_0_0_0_1px_var(--separator)]">
      <div className="text-label-2 text-[11px] font-bold tracking-wide uppercase">Línea de tiempo</div>
      <svg viewBox={`0 0 ${W} 92`} className="mt-1 h-auto w-full max-w-[520px]" role="img" aria-label={label || TL_TEXT[type]}>
        <defs>
          <marker id={`${uid}a`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M0 0 L10 5 L0 10 z" style={{ fill: c }} />
          </marker>
          <marker id={`${uid}x`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto">
            <path d="M0 0 L10 5 L0 10 z" style={{ fill: 'var(--label-3)' }} />
          </marker>
        </defs>
        <line x1={12} y1={Y} x2={W - 8} y2={Y} strokeWidth={2} markerEnd={`url(#${uid}x)`} style={{ stroke: 'var(--label-3)' }} />
        <line x1={NOW} y1={Y - 16} x2={NOW} y2={Y + 14} strokeWidth={2.5} strokeDasharray="3 3" style={{ stroke: 'var(--label)' }} />
        <rect x={NOW - 26} y={Y + 31} width={52} height={17} rx={8.5} style={{ fill: 'var(--label)' }} />
        <text x={NOW} y={Y + 43.5} textAnchor="middle" fontSize="11" fontWeight={800} style={{ fill: 'var(--card)' }}>
          AHORA
        </text>
        <text x={14} y={Y + 43.5} fontSize="11.5" fontWeight={700} style={{ fill: 'var(--label-2)' }}>
          ← PASADO
        </text>
        <text x={W - 10} y={Y + 43.5} textAnchor="end" fontSize="11.5" fontWeight={700} style={{ fill: 'var(--label-2)' }}>
          FUTURO →
        </text>
        {marks}
      </svg>
      <div className={cn('text-[15px] font-semibold')} style={{ color: `color-mix(in srgb, ${color} 70%, var(--label))` }}>
        {label || TL_TEXT[type]}
      </div>
    </div>
  );
}
