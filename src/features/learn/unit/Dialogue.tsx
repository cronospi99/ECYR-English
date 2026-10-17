import { useEffect, useMemo, useRef, useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Languages, Play, Square, Volume2 } from 'lucide-react';
import { canSpeak, speakAs, stopSpeaking } from '@/lib/speech';
import { useSettings } from '@/store/settings';
import type { CastMember } from '@/content/dialogues';
import { cn } from '@/lib/cn';
import { deep, ink, tint } from '@/lib/color';
import type { KeySpec } from './formula';
import { Hl } from './ui';

const SPEAKER_COLORS = ['var(--blue)', 'var(--orange)', 'var(--green)', 'var(--purple)', 'var(--pink)', 'var(--teal)'];
const DEFAULT_VOICES: Omit<CastMember, 'name'>[] = [
  { voice: 'female', accent: 'us' },
  { voice: 'male', accent: 'uk' },
  { voice: 'female', accent: 'au' },
  { voice: 'male', accent: 'us' },
];
const ACCENT_LABEL = { us: '🇺🇸', uk: '🇬🇧', au: '🇦🇺' } as const;

const initials = (name: string) => {
  const w = name.trim().split(/\s+/);
  return (w.length > 1 ? w[0]![0]! + w[1]![0]! : name.slice(0, 1)).toUpperCase();
};

export interface DialogueProps {
  lines: { sp: string; line: string; es?: string }[];
  spec?: KeySpec;
  bare?: boolean;
  /** Voices per speaker name; speakers not listed get alternating default voices. */
  cast?: CastMember[];
  title?: string;
  /** Spanish subtitle (e.g. the title in Spanish). */
  subtitle?: string;
  /** One emoji + a short Spanish context line. */
  scene?: string;
}

/** Chat between speakers: coloured avatars, a voice per speaker, per-line replay, "Escuchar todo" and translations. */
export function Dialogue({ lines, spec, bare = false, cast, title, subtitle, scene }: DialogueProps) {
  const { speechRate } = useSettings();
  const reduce = useReducedMotion();
  const [playing, setPlaying] = useState<number | null>(null);
  const [all, setAll] = useState(false);
  const [showEs, setShowEs] = useState(false);
  const run = useRef(0);
  useEffect(
    () => () => {
      if (run.current) stopSpeaking();
      run.current++;
    },
    [],
  );

  const people = useMemo(() => {
    const names = [...new Set(lines.map((l) => l.sp))];
    return new Map(
      names.map((n, i) => {
        const c = cast?.find((m) => m.name.toLowerCase() === n.toLowerCase());
        return [n, { side: i % 2 ? 'right' : 'left', color: SPEAKER_COLORS[i % SPEAKER_COLORS.length]!, who: c ?? { name: n, ...DEFAULT_VOICES[i % DEFAULT_VOICES.length]! } }] as const;
      }),
    );
  }, [lines, cast]);
  const hasEs = lines.some((l) => l.es);
  const speech = canSpeak();

  const stop = () => {
    run.current++;
    stopSpeaking();
    setPlaying(null);
    setAll(false);
  };
  const play = (k: number, chain: boolean) => {
    const id = ++run.current;
    if (k >= lines.length) return stop();
    const l = lines[k]!;
    setPlaying(k);
    setAll(chain);
    speakAs(l.line, people.get(l.sp)!.who, {
      rate: speechRate,
      onEnd: () => {
        if (id !== run.current) return;
        if (chain) play(k + 1, true);
        else setPlaying(null);
      },
    });
  };

  return (
    <div className={bare ? undefined : 'mt-5'}>
      {(title || scene) && (
        <div className="mb-3">
          {scene && <div className="text-label-2 text-[14px] leading-snug text-pretty">{scene}</div>}
          {title && (
            <div className="mt-0.5 text-[16px] leading-snug font-semibold">
              {title}
              {subtitle && <span className="text-label-2 font-normal"> · {subtitle}</span>}
            </div>
          )}
        </div>
      )}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {!bare && !title && <div className="text-label-2 mr-auto text-[12px] font-semibold tracking-wide uppercase">Diálogo</div>}
        <ul className="mr-auto flex flex-wrap gap-1.5" aria-label="Personajes">
          {[...people.entries()].map(([n, p]) => (
            <li key={n} className="inline-flex items-center gap-1.5 rounded-full py-0.5 pr-2.5 pl-0.5 text-[13px] font-semibold" style={{ background: tint(p.color, 12), color: ink(p.color) }}>
              <Avatar name={n} color={p.color} size={22} />
              {n}
              <span aria-label={`acento ${p.who.accent}`} className="text-[12px]">
                {ACCENT_LABEL[p.who.accent]}
              </span>
            </li>
          ))}
        </ul>
        {hasEs && (
          <button
            type="button"
            aria-pressed={showEs}
            onClick={() => setShowEs((s) => !s)}
            className={cn('inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-colors', !showEs && 'bg-fill-2')}
            style={showEs ? { background: tint('var(--indigo)', 16), color: ink('var(--indigo)') } : undefined}
          >
            <Languages size={14} aria-hidden /> {showEs ? 'Ocultar traducción' : 'Ver traducción'}
          </button>
        )}
        {speech && (
          <button
            type="button"
            onClick={() => (all ? stop() : play(0, true))}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold text-white"
            style={{ background: deep(all ? 'var(--red)' : 'var(--blue)') }}
          >
            {all ? <Square size={13} fill="currentColor" aria-hidden /> : <Play size={13} fill="currentColor" aria-hidden />}
            {all ? 'Parar' : 'Escuchar todo'}
          </button>
        )}
      </div>
      <ol className="space-y-2.5" aria-live="off">
        {lines.map((l, k) => {
          const p = people.get(l.sp)!;
          const right = p.side === 'right';
          const on = playing === k;
          const prevSame = k > 0 && lines[k - 1]!.sp === l.sp;
          return (
            <motion.li
              key={k}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: Math.min(k, 6) * 0.05, duration: 0.25 }}
              className={cn('flex items-end gap-2', right ? 'flex-row-reverse' : 'flex-row')}
            >
              <span className={cn(prevSame && 'invisible')}>
                <Avatar name={l.sp} color={p.color} />
              </span>
              <div className={cn('flex max-w-[82%] min-w-0 flex-col sm:max-w-[72%]', right ? 'items-end' : 'items-start')}>
                {!prevSame && l.sp.length > 1 && (
                  <span className="mb-0.5 px-1 text-[12px] font-bold" style={{ color: ink(p.color) }}>
                    {l.sp}
                  </span>
                )}
                <div
                  className={cn(
                    'relative flex items-start gap-1 rounded-[18px] py-2 pr-1 pl-3.5 text-[15.5px] leading-snug transition-[box-shadow,transform] duration-200',
                    right ? 'rounded-br-[6px]' : 'rounded-bl-[6px]',
                    on && 'motion-safe:scale-[1.015]',
                  )}
                  style={{
                    background: tint(p.color, on ? 20 : 11),
                    boxShadow: on ? `inset 0 0 0 2px ${p.color}` : `inset 0 0 0 1px ${tint(p.color, 18)}`,
                  }}
                >
                  <span className="min-w-0 flex-1 pt-0.5 text-pretty">
                    <span className="sr-only">{l.sp}: </span>
                    <Hl text={l.line} spec={spec} />
                    {showEs && l.es && (
                      <motion.span initial={reduce ? false : { opacity: 0 }} animate={{ opacity: 1 }} className="text-label-2 mt-1 block text-[13.5px] italic" lang="es">
                        {l.es}
                      </motion.span>
                    )}
                  </span>
                  {speech && (
                    <button
                      type="button"
                      onClick={() => (on ? stop() : play(k, false))}
                      aria-label={`Escuchar a ${l.sp}: ${l.line}`}
                      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-[var(--fill)]"
                      style={{ color: ink(p.color) }}
                    >
                      <Volume2 size={15} className={cn(on && 'animate-pulse')} />
                    </button>
                  )}
                </div>
              </div>
            </motion.li>
          );
        })}
      </ol>
    </div>
  );
}

function Avatar({ name, color, size = 32 }: { name: string; color: string; size?: number }) {
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `linear-gradient(145deg, ${deep(color, 78)}, ${deep(color, 56)})` }}
      aria-hidden
    >
      {initials(name)}
    </span>
  );
}
