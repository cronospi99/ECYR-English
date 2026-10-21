import { useEffect, useMemo, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent, type ReactNode } from 'react';
import { Info, Pause, Play, RotateCcw, SkipBack } from 'lucide-react';
import { Spinner } from '@/components/ui/Misc';
import type { PlayerSnapshot, SeekablePlayer } from '@/lib/tts/seekable';
import { cn } from '@/lib/cn';
import { deep, tint } from '@/lib/color';

/** 75 → "01:15". */
export function clock(sec: number): string {
  const s = Math.max(0, Math.floor(Number.isFinite(sec) ? sec : 0));
  const h = Math.floor(s / 3600);
  const mm = String(Math.floor((s % 3600) / 60)).padStart(2, '0');
  const ss = String(s % 60).padStart(2, '0');
  return h ? `${h}:${mm}:${ss}` : `${mm}:${ss}`;
}

/** A player made once per `deps`, stopped when the component goes away. */
export function usePlayer(make: () => SeekablePlayer, deps: unknown[]): SeekablePlayer {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const player = useMemo(make, deps);
  useEffect(() => () => player.destroy(), [player]);
  return player;
}

/** The player's state, re-rendering on every change. */
export function usePlayerState(player: SeekablePlayer): PlayerSnapshot {
  return useSyncExternalStore(player.subscribe, player.getSnapshot);
}

export type ScrubTone = 'onColor' | 'plain';

const DEVICE_HINT = 'Con la voz del dispositivo, al saltar el audio empieza desde el inicio de la frase más cercana.';

/**
 * The progress bar on its own: click or drag to a second, or use the keys
 * (← → 5 s, Re Pág / Av Pág 10 s, Inicio / Fin, espacio = reproducir / pausar).
 * While dragging only the bar moves; the audio jumps when it is let go.
 */
export function SeekBar({
  time,
  duration,
  onSeek,
  onToggle,
  approx = false,
  hint,
  tone = 'plain',
  color = 'var(--blue)',
  label = 'Posición del audio',
  right,
}: {
  time: number;
  duration: number;
  onSeek: (sec: number) => void;
  onToggle?: () => void;
  /** The length is still an estimate: shown as "≈". */
  approx?: boolean;
  /** Tooltip (e.g. how seeking works with the device voice). */
  hint?: string;
  tone?: ScrubTone;
  color?: string;
  label?: string;
  /** Extra text at the right of the time row. */
  right?: ReactNode;
}) {
  const track = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const shown = drag ?? time;
  const pct = duration > 0 ? Math.min(100, Math.max(0, (shown / duration) * 100)) : 0;
  const onColor = tone === 'onColor';

  const secAt = (clientX: number) => {
    const r = track.current?.getBoundingClientRect();
    if (!r || !r.width || !duration) return 0;
    return Math.min(duration, Math.max(0, ((clientX - r.left) / r.width) * duration));
  };
  const down = (e: PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 || !duration) return;
    e.currentTarget.setPointerCapture(e.pointerId);
    e.currentTarget.focus({ preventScroll: true });
    setDrag(secAt(e.clientX));
  };
  const move = (e: PointerEvent<HTMLDivElement>) => {
    if (drag !== null) setDrag(secAt(e.clientX));
  };
  const up = (e: PointerEvent<HTMLDivElement>) => {
    if (drag === null) return;
    const t = secAt(e.clientX);
    setDrag(null);
    onSeek(t);
  };
  const key = (e: KeyboardEvent<HTMLDivElement>) => {
    const to = (t: number) => {
      e.preventDefault();
      onSeek(Math.min(duration, Math.max(0, t)));
    };
    switch (e.key) {
      case 'ArrowLeft':
      case 'ArrowDown':
        return to(time - 5);
      case 'ArrowRight':
      case 'ArrowUp':
        return to(time + 5);
      case 'PageDown':
        return to(time - 10);
      case 'PageUp':
        return to(time + 10);
      case 'Home':
        return to(0);
      case 'End':
        return to(duration);
      case ' ':
      case 'Spacebar':
      case 'k':
        if (!onToggle) return;
        e.preventDefault();
        onToggle();
    }
  };

  return (
    <div className="min-w-0">
      <div
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={Math.round(shown)}
        aria-valuetext={`${clock(shown)} de ${approx ? 'unos ' : ''}${clock(duration)}`}
        aria-disabled={!duration || undefined}
        title={hint}
        onPointerDown={down}
        onPointerMove={move}
        onPointerUp={up}
        onPointerCancel={() => setDrag(null)}
        onKeyDown={key}
        className={cn(
          'group relative -my-2 cursor-pointer touch-pan-y rounded-full py-2.5 outline-none select-none',
          onColor ? 'focus-visible:ring-2 focus-visible:ring-white/80' : 'focus-visible:ring-2 focus-visible:ring-[color-mix(in_srgb,var(--blue)_45%,transparent)]',
        )}
      >
        <div ref={track} className={cn('relative h-1.5 rounded-full', onColor ? 'bg-white/25' : 'bg-fill-2')}>
          <div className={cn('absolute inset-y-0 left-0 rounded-full', onColor && 'bg-white')} style={{ width: `${pct}%`, background: onColor ? undefined : color }} />
          <div
            className={cn(
              'absolute top-1/2 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_1px_4px_rgba(0,0,0,.3)] transition-transform group-hover:scale-110',
              drag !== null && 'scale-125',
              onColor ? 'bg-white' : 'bg-card',
            )}
            style={{ left: `${pct}%`, boxShadow: onColor ? undefined : `0 0 0 2px ${color}, 0 1px 4px rgba(0,0,0,.25)` }}
            aria-hidden
          />
        </div>
      </div>
      <div className={cn('mt-1.5 flex items-center justify-between gap-2 text-[12px] font-medium tabular-nums', onColor ? 'opacity-90' : 'text-label-2')}>
        <span>
          {clock(shown)} / {approx && duration ? '≈' : ''}
          {duration ? clock(duration) : '--:--'}
          {hint && (
            <span title={hint} className="ml-1 inline-flex cursor-help align-[-2px]">
              <Info size={13} aria-hidden />
              <span className="sr-only">{hint}</span>
            </span>
          )}
        </span>
        {right}
      </div>
    </div>
  );
}

const SPEEDS = [0.8, 1, 1.15];

function Back({ sec, onClick, tone, size = 40 }: { sec: number; onClick: () => void; tone: ScrubTone; size?: number }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn('flex shrink-0 items-center justify-center rounded-full transition-transform active:scale-95', tone === 'onColor' ? 'bg-white/20' : 'bg-fill-2 text-label')}
      style={{ width: size, height: size }}
      aria-label={`Retroceder ${sec} segundos`}
      title={`Retroceder ${sec} s`}
    >
      <span className="relative flex items-center justify-center">
        <RotateCcw size={size * 0.5} aria-hidden />
        <span className="absolute text-[8px] font-bold">{sec}</span>
      </span>
    </button>
  );
}

/**
 * Full controls for a SeekablePlayer: play / pause, ⟲ 5 s and ⟲ 10 s, the
 * draggable bar with "mm:ss / mm:ss", and a speed button.
 * `compact` fits in one row (dialogues); `onColor` is for coloured headers.
 */
export function AudioScrubber({
  player,
  tone = 'plain',
  color = 'var(--blue)',
  compact = false,
  speeds = SPEEDS,
  restart = false,
  onPlay,
  right,
  label,
  className,
}: {
  player: SeekablePlayer;
  tone?: ScrubTone;
  color?: string;
  compact?: boolean;
  /** Speed choices (multipliers); [] hides the speed button. */
  speeds?: number[];
  /** Show a "from the start" button. */
  restart?: boolean;
  /** The learner pressed play (with the state just before). */
  onPlay?: (before: PlayerSnapshot) => void;
  right?: ReactNode;
  label?: string;
  className?: string;
}) {
  const s = usePlayerState(player);
  const live = s.status === 'playing' || s.status === 'loading';
  const onColor = tone === 'onColor';
  const toggle = () => {
    if (!live) onPlay?.(player.getSnapshot());
    player.toggle();
  };
  const hint = s.device ? DEVICE_HINT : undefined;
  const speedBtn = speeds.length > 1 && (
    <button
      type="button"
      onClick={() => player.setSpeed(speeds[(speeds.indexOf(s.speed) + 1) % speeds.length] ?? 1)}
      className={cn(
        'h-8 min-w-[52px] shrink-0 rounded-full px-2.5 text-[13px] font-semibold tabular-nums transition-colors',
        onColor ? 'bg-white/20' : 'bg-fill-2 text-label',
      )}
      aria-label={`Velocidad ${String(s.speed).replace('.', ',')}×. Toca para cambiarla`}
      title="Velocidad"
    >
      {String(s.speed).replace('.', ',')}×
    </button>
  );
  const playBtn = (size: number) => (
    <button
      type="button"
      onClick={toggle}
      className={cn('flex shrink-0 items-center justify-center rounded-full transition-transform active:scale-95', onColor ? 'shadow-float bg-white text-[#1c1c1e]' : 'text-white')}
      style={{ width: size, height: size, background: onColor ? undefined : deep(color) }}
      aria-label={live ? 'Pausar' : s.status === 'ended' ? 'Escuchar otra vez' : 'Reproducir'}
    >
      {s.status === 'loading' ? (
        <Spinner className={size > 48 ? 'h-7 w-7' : 'h-4 w-4'} />
      ) : live ? (
        <Pause size={size * 0.42} fill="currentColor" aria-hidden />
      ) : (
        <Play size={size * 0.42} fill="currentColor" className="ml-[8%]" aria-hidden />
      )}
    </button>
  );
  const bar = (
    <SeekBar
      time={s.time}
      duration={s.duration}
      approx={!s.exact}
      onSeek={(t) => player.seek(t)}
      onToggle={toggle}
      hint={hint}
      tone={tone}
      color={color}
      label={label}
      right={right}
    />
  );

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2 rounded-[16px] px-2.5 py-2', className)} style={onColor ? undefined : { background: tint(color, 8) }}>
        {playBtn(38)}
        <div className="min-w-0 flex-1 pt-1">{bar}</div>
        <Back sec={5} onClick={() => player.skip(-5)} tone={tone} size={32} />
        <Back sec={10} onClick={() => player.skip(-10)} tone={tone} size={32} />
        {speedBtn}
      </div>
    );
  }
  return (
    <div className={className}>
      {bar}
      <div className="mt-3 flex items-center gap-2.5 sm:gap-3">
        {restart && (
          <button
            type="button"
            onClick={() => player.seek(0)}
            className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', onColor ? 'bg-white/20' : 'bg-fill-2 text-label')}
            aria-label="Desde el inicio"
            title="Desde el inicio"
          >
            <SkipBack size={18} aria-hidden />
          </button>
        )}
        <Back sec={10} onClick={() => player.skip(-10)} tone={tone} />
        <Back sec={5} onClick={() => player.skip(-5)} tone={tone} />
        {playBtn(64)}
        <div className="flex-1" />
        {speedBtn}
      </div>
    </div>
  );
}
