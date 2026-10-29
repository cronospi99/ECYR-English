import { useEffect, useRef, useState } from 'react';
import { Mic, MicOff, Square } from 'lucide-react';
import { cn } from '@/lib/cn';
import { chime, type WidgetProps } from '../util';
import { Act, Empty } from './ui';

interface D {
  threshold: number;
  sound: boolean;
}

type Status = 'off' | 'asking' | 'on' | 'denied' | 'unsupported';

export default function Noise({ data, set }: WidgetProps<D>) {
  const threshold = data.threshold ?? 70;
  const sound = data.sound ?? true;
  const [status, setStatus] = useState<Status>('off');
  const [level, setLevel] = useState(0);
  const [alert, setAlert] = useState(false);
  const [count, setCount] = useState(0);
  const live = useRef<{ stream: MediaStream; ctx: AudioContext; raf: number } | null>(null);
  const cfg = useRef({ threshold, sound });
  cfg.current = { threshold, sound };

  const stop = () => {
    const l = live.current;
    live.current = null;
    if (!l) return;
    cancelAnimationFrame(l.raf);
    l.stream.getTracks().forEach((t) => t.stop());
    void l.ctx.close().catch(() => {});
  };
  useEffect(() => stop, []);

  const start = async () => {
    if (!navigator.mediaDevices?.getUserMedia) return setStatus('unsupported');
    setStatus('asking');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } });
      const ctx = new AudioContext();
      const src = ctx.createMediaStreamSource(stream);
      const an = ctx.createAnalyser();
      an.fftSize = 1024;
      src.connect(an);
      const buf = new Float32Array(an.fftSize);
      let smooth = 0;
      let overSince = 0;
      let lastAlert = 0;
      let lastPaint = 0;
      const loop = (t: number) => {
        an.getFloatTimeDomainData(buf);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) sum += buf[i]! * buf[i]!;
        const rms = Math.sqrt(sum / buf.length);
        const db = 20 * Math.log10(rms || 1e-8); // ~ -90 (silence) … 0
        const v = Math.max(0, Math.min(100, ((db + 65) / 55) * 100));
        smooth = v > smooth ? smooth * 0.6 + v * 0.4 : smooth * 0.92 + v * 0.08;
        if (smooth > cfg.current.threshold) {
          overSince ||= t;
          if (t - overSince > 700 && t - lastAlert > 6000) {
            lastAlert = t;
            setAlert(true);
            setCount((c) => c + 1);
            if (cfg.current.sound) chime();
            setTimeout(() => setAlert(false), 2500);
          }
        } else overSince = 0;
        if (t - lastPaint > 60) {
          lastPaint = t;
          setLevel(smooth);
        }
        if (live.current) live.current.raf = requestAnimationFrame(loop);
      };
      live.current = { stream, ctx, raf: requestAnimationFrame(loop) };
      setStatus('on');
    } catch {
      setStatus('denied');
    }
  };

  if (status !== 'on')
    return (
      <Empty
        icon={status === 'denied' || status === 'unsupported' ? <MicOff size={44} className="text-ink-red" /> : <Mic size={44} className="text-ink-teal" />}
        text={
          status === 'denied'
            ? 'Sin permiso de micrófono. Actívalo en el candado de la barra del navegador.'
            : status === 'unsupported'
              ? 'Este navegador no permite usar el micrófono aquí.'
              : 'Mide el ruido de la clase con el micrófono.'
        }
      >
        {status !== 'unsupported' && (
          <Act solid color="var(--teal)" onClick={() => void start()} disabled={status === 'asking'}>
            <Mic size={18} /> {status === 'denied' ? 'Reintentar' : status === 'asking' ? 'Esperando…' : 'Activar micrófono'}
          </Act>
        )}
      </Empty>
    );

  const over = level > threshold;
  const face = alert || level > threshold ? '😣' : level > threshold * 0.7 ? '😐' : '😊';
  return (
    <div className={cn('flex h-full flex-col gap-2 p-3', alert && 'scr-flash')}>
      <div className="flex min-h-0 flex-1 items-center justify-center gap-[4cqw] [container-type:size]">
        <span style={{ fontSize: 'min(55cqh, 30cqw)' }} className="leading-none">
          {face}
        </span>
        {alert && (
          <span className="font-rounded text-ink-red leading-tight font-black" style={{ fontSize: 'min(16cqh, 9cqw)' }}>
            ¡Shhh!
            <br />
            Más bajo
          </span>
        )}
      </div>
      <div className="relative h-10 overflow-hidden rounded-full bg-fill-2">
        <div
          className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-75"
          style={{ width: `${level}%`, background: 'linear-gradient(90deg,#34c759 0%,#a3e635 45%,#ffcc00 65%,#ff9500 80%,#ff3b30 100%)', backgroundSize: `${100 / Math.max(level, 1) * 100}% 100%` }}
        />
        <div className="absolute inset-y-0 w-1 -translate-x-1/2 rounded-full bg-label" style={{ left: `${threshold}%` }} />
      </div>
      <label className="flex items-center gap-3 text-[13px] font-semibold">
        <span className="text-label-2 shrink-0">Límite</span>
        <input type="range" min={10} max={95} value={threshold} onChange={(e) => set({ threshold: Number(e.target.value) })} className="flex-1 accent-[var(--red)]" aria-label="Límite de ruido" />
      </label>
      <div className="flex items-center justify-between gap-2">
        <span className={cn('text-[14px] font-semibold', over ? 'text-ink-red' : 'text-label-2')}>Alertas: {count}</span>
        <div className="flex gap-2">
          <Act color="var(--label)" onClick={() => set({ sound: !sound })} className="h-9 text-[13px]">
            {sound ? '🔔 Sonido' : '🔕 Mudo'}
          </Act>
          <Act
            color="var(--red)"
            className="h-9"
            onClick={() => {
              stop();
              setStatus('off');
              setLevel(0);
            }}
            aria-label="Detener micrófono"
          >
            <Square size={14} fill="currentColor" />
          </Act>
        </div>
      </div>
    </div>
  );
}
