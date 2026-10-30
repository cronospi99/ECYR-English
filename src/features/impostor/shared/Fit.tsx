import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from "react";

/* Lays its content out at the available width and, when that is taller (or wider)
   than the space it has, scales everything down uniformly so the whole screen is
   visible with no scrolling and nothing cropped. */
export function Fit({ children, min = 0.25, align = "center", style }: { children: ReactNode; min?: number; align?: "center" | "top"; style?: CSSProperties }) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const o = outer.current, i = inner.current;
    if (!o || !i) return;
    let raf = 0;
    let lastKey = "";
    const fits = (sc: number, W: number, H: number) => {
      i.style.width = W / sc + "px";
      const h = i.scrollHeight, w = i.scrollWidth;
      return h * sc <= H + 0.5 && w * sc <= W + 0.5;
    };
    const run = () => {
      raf = 0;
      const W = o.clientWidth, H = o.clientHeight;
      if (!W || !H) return;
      let sc = 1;
      if (!fits(1, W, H)) {
        let lo = min, hi = 1;
        for (let k = 0; k < 9; k++) {
          const mid = (lo + hi) / 2;
          if (fits(mid, W, H)) lo = mid; else hi = mid;
        }
        sc = lo;
      }
      i.style.width = W / sc + "px";
      const h = i.scrollHeight;
      const top = align === "center" ? Math.max(0, (H - h * sc) / 2) : 0;
      const key = `${W}x${H}:${sc.toFixed(4)}:${Math.round(top)}`;
      if (key === lastKey) return;
      lastKey = key;
      i.style.transform = `translate(0px, ${top}px) scale(${sc})`;
    };
    const schedule = () => { if (!raf) raf = requestAnimationFrame(run); };
    run();
    const ro = new ResizeObserver(() => { lastKey = ""; schedule(); });
    ro.observe(o);
    ro.observe(i);
    /* web fonts change text metrics once they arrive */
    document.fonts?.ready.then(() => { lastKey = ""; schedule(); }).catch(() => {});
    return () => { ro.disconnect(); if (raf) cancelAnimationFrame(raf); };
  }, [min, align]);

  return (
    <div ref={outer} style={{ flex: 1, minHeight: 0, width: "100%", overflow: "hidden", position: "relative", ...style }}>
      <div ref={inner} style={{ position: "absolute", left: 0, top: 0, transformOrigin: "0 0" }}>{children}</div>
    </div>
  );
}
