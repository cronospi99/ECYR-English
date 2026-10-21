import { useEffect, useImperativeHandle, useRef, useState, type Ref } from 'react';
import { Pause, Play, RotateCcw, RotateCw } from 'lucide-react';
import { Spinner } from '@/components/ui/Misc';
import { SeekBar } from '@/components/learning/AudioScrubber';
import { fmtClock, getPosition, savePosition, type PodcastEpisode } from '@/lib/podcasts';

export interface PlayerHandle {
  /** Current position in seconds. */
  time: () => number;
  seek: (sec: number) => void;
}

const RATES = ['0.75', '0.9', '1', '1.25', '1.5'];
const SAVE_EVERY = 5;

/**
 * Streams the episode from the publisher's own server (no copy is made).
 * Remembers where you stopped, per episode, in this browser.
 */
export function EpisodePlayer({ ep, handle, defaultRate = '1' }: { ep: PodcastEpisode; handle?: Ref<PlayerHandle>; defaultRate?: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [waiting, setWaiting] = useState(false);
  const [t, setT] = useState(0);
  const [d, setD] = useState(ep.durationMs / 1000);
  const [rate, setRate] = useState(defaultRate);
  const [error, setError] = useState(false);
  const [resumed, setResumed] = useState<number | null>(null);
  const lastSave = useRef(0);
  const restored = useRef(false);

  useImperativeHandle(handle, () => ({
    time: () => audio.current?.currentTime ?? 0,
    seek: (sec) => {
      if (audio.current) audio.current.currentTime = Math.max(0, sec);
    },
  }));

  // Save where we are when leaving the episode.
  useEffect(() => {
    const a = audio.current;
    return () => {
      if (a && a.currentTime > 1) savePosition(ep.key, a.currentTime, a.duration || ep.durationMs / 1000);
      a?.pause();
    };
  }, [ep.key, ep.durationMs]);

  useEffect(() => {
    if (audio.current) audio.current.playbackRate = Number(rate);
  }, [rate]);

  const save = (done = false) => {
    const a = audio.current;
    if (!a) return;
    savePosition(ep.key, done ? 0 : a.currentTime, a.duration || d, done);
    lastSave.current = a.currentTime;
  };

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (a.paused) {
      setError(false);
      a.playbackRate = Number(rate);
      void a.play().catch((e: unknown) => {
        if ((e as { name?: string })?.name !== 'AbortError') setError(true);
      });
    } else a.pause();
  };
  const skip = (s: number) => {
    const a = audio.current;
    if (a) a.currentTime = Math.min(Math.max(0, a.currentTime + s), a.duration || Infinity);
  };

  return (
    <div>
      <audio
        ref={audio}
        src={ep.audioUrl}
        preload="metadata"
        onLoadedMetadata={(e) => {
          const a = e.currentTarget;
          if (Number.isFinite(a.duration) && a.duration > 0) setD(a.duration);
          if (restored.current) return;
          restored.current = true;
          const pos = getPosition(ep.key);
          const dur = Number.isFinite(a.duration) ? a.duration : d;
          if (pos && pos.t > 5 && (!dur || pos.t < dur - 10)) {
            a.currentTime = pos.t;
            setT(pos.t);
            setResumed(pos.t);
          }
        }}
        onTimeUpdate={(e) => {
          const now = e.currentTarget.currentTime;
          setT(now);
          if (Math.abs(now - lastSave.current) >= SAVE_EVERY) save();
        }}
        onPlay={() => setPlaying(true)}
        onPause={() => {
          setPlaying(false);
          save();
        }}
        onEnded={() => {
          setPlaying(false);
          save(true);
        }}
        onWaiting={() => setWaiting(true)}
        onPlaying={() => setWaiting(false)}
        onCanPlay={() => setWaiting(false)}
        onError={() => {
          setError(true);
          setPlaying(false);
          setWaiting(false);
        }}
      />
      <div className="flex items-center gap-2 sm:gap-3">
        <button
          type="button"
          onClick={() => skip(-5)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20"
          aria-label="Retroceder 5 segundos"
        >
          <span className="relative flex items-center justify-center">
            <RotateCcw size={20} />
            <span className="absolute text-[7.5px] font-bold">5</span>
          </span>
        </button>
        <button
          type="button"
          onClick={() => skip(-10)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20"
          aria-label="Retroceder 10 segundos"
        >
          <span className="relative flex items-center justify-center">
            <RotateCcw size={20} />
            <span className="absolute text-[7.5px] font-bold">10</span>
          </span>
        </button>
        <button
          type="button"
          onClick={toggle}
          className="shadow-float flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white text-[#1c1c1e]"
          aria-label={playing ? 'Pausar' : 'Reproducir'}
        >
          {waiting && playing ? <Spinner className="h-7 w-7" /> : playing ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" className="ml-1" />}
        </button>
        <button
          type="button"
          onClick={() => skip(10)}
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white/20"
          aria-label="Adelantar 10 segundos"
        >
          <span className="relative flex items-center justify-center">
            <RotateCw size={20} />
            <span className="absolute text-[7.5px] font-bold">10</span>
          </span>
        </button>
        <div className="flex-1" />
        <select
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          className="rounded-full bg-white/20 px-2.5 py-1.5 text-[13px] font-semibold text-white outline-none [&>option]:text-[#1c1c1e]"
          aria-label="Velocidad"
        >
          {RATES.map((r) => (
            <option key={r} value={r}>
              {r.replace('.', ',')}×
            </option>
          ))}
        </select>
      </div>
      <div className="mt-4">
        <SeekBar
          time={t}
          duration={d}
          tone="onColor"
          label="Posición del episodio"
          onToggle={toggle}
          onSeek={(v) => {
            setT(v);
            if (audio.current) audio.current.currentTime = v;
          }}
          right={<span>{d ? `-${fmtClock(Math.max(0, d - t))}` : ''}</span>}
        />
      </div>
      {resumed !== null && !error && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-[12.5px] opacity-95">
          Continúas en {fmtClock(resumed)}.
          <button
            type="button"
            className="font-semibold underline underline-offset-2"
            onClick={() => {
              if (audio.current) audio.current.currentTime = 0;
              setT(0);
              setResumed(null);
            }}
          >
            Empezar desde el inicio
          </button>
        </div>
      )}
      {error && (
        <div className="mt-3 rounded-[12px] bg-black/25 px-3 py-2 text-[13px] leading-snug">
          No se pudo cargar el audio desde la fuente original. Revisa tu conexión o ábrelo en Apple Podcasts.
        </div>
      )}
    </div>
  );
}
