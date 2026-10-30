import { useEffect, useState } from 'react';

/* One shared requestAnimationFrame loop for every animated card portrait. */
const subs = new Set<(now: number) => void>();
let raf = 0;
function loop(now: number) {
  subs.forEach((fn) => fn(now / 1000));
  raf = subs.size ? requestAnimationFrame(loop) : 0;
}

/** Seconds since page load, updated at most `fps` times a second while `active`. */
export function useCardClock(active = true, fps = 24) {
  const [t, setT] = useState(() => performance.now() / 1000);
  useEffect(() => {
    if (!active) return;
    let last = 0;
    const fn = (now: number) => {
      if (now - last >= 1 / fps) {
        last = now;
        setT(now);
      }
    };
    subs.add(fn);
    if (!raf) raf = requestAnimationFrame(loop);
    return () => {
      subs.delete(fn);
    };
  }, [active, fps]);
  return t;
}
