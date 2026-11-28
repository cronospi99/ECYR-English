import { useEffect, useRef } from 'react';
import { sfx } from './sfx';

interface P { x: number; y: number; vx: number; vy: number; life: number; max: number; hue: number; r: number }

/** Canvas fireworks (celebration). Fewer bursts when the user prefers reduced motion. */
export function Fireworks({ sound = true }: { sound?: boolean }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!, ctx = cv.getContext('2d')!;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const parts: P[] = [];
    let raf = 0, last = performance.now(), nextBurst = 0;
    const fit = () => { cv.width = cv.clientWidth; cv.height = cv.clientHeight; };
    fit();
    const burst = () => {
      const x = cv.width * (0.1 + Math.random() * 0.8), y = cv.height * (0.12 + Math.random() * 0.4), hue = [38, 45, 330, 290, 175, 22][Math.floor(Math.random() * 6)]!;
      const n = reduce ? 20 : 70;
      for (let i = 0; i < n; i++) { const a = (i / n) * Math.PI * 2, v = (0.7 + Math.random() * 0.9) * cv.width * 0.0016 * 60; parts.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0, max: 1.1 + Math.random() * 0.8, hue: hue + (Math.random() * 20 - 10), r: 2 + Math.random() * 2.2 }); }
      if (sound && Math.random() < 0.5) sfx.boom();
    };
    const frame = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000); last = now;
      ctx.globalCompositeOperation = 'destination-out'; ctx.fillStyle = 'rgba(0,0,0,.22)'; ctx.fillRect(0, 0, cv.width, cv.height);
      ctx.globalCompositeOperation = 'lighter';
      nextBurst -= dt; if (nextBurst <= 0) { burst(); nextBurst = (reduce ? 1.6 : 0.55) + Math.random() * 0.7; }
      for (let i = parts.length - 1; i >= 0; i--) {
        const p = parts[i]!; p.life += dt; if (p.life > p.max) { parts.splice(i, 1); continue; }
        p.vy += cv.width * 0.0006 * 60 * dt * 0.6; p.vx *= 0.985; p.vy *= 0.985; p.x += p.vx * dt; p.y += p.vy * dt;
        ctx.globalAlpha = 1 - p.life / p.max; ctx.fillStyle = `hsl(${p.hue} 100% 62%)`;
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 7); ctx.fill();
      }
      ctx.globalAlpha = 1; raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    addEventListener('resize', fit);
    return () => { cancelAnimationFrame(raf); removeEventListener('resize', fit); };
  }, [sound]);
  return <canvas ref={ref} aria-hidden />;
}
