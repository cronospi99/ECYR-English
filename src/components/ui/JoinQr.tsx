/* Join-by-QR card for live games: students point the phone camera at it and land on the game's
   join page with the room code already filled in. Click it to show it full screen (projector). */
import { useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { Maximize2, X } from 'lucide-react';
import { cn } from '@/lib/cn';

function qrPath(text: string): { d: string; n: number } | null {
  try {
    const q = qrcode(0, 'M');
    q.addData(text);
    q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
    return { d, n };
  } catch {
    return null;
  }
}

function QrSvg({ url, className, px }: { url: string; className?: string; px?: number }) {
  const qr = useMemo(() => qrPath(url), [url]);
  if (!qr) return null;
  return (
    <svg viewBox={`-2 -2 ${qr.n + 4} ${qr.n + 4}`} className={cn('rounded-2xl bg-white', className)} style={px ? { width: px, height: px } : undefined} shapeRendering="crispEdges" role="img" aria-label={`QR: ${url}`}>
      <path d={qr.d} fill="#1b1640" />
    </svg>
  );
}

/** Full-screen QR for the projector. `caption` is the big line under it (a room or class code). */
export function QrOverlay({ url, caption, title, onClose }: { url: string; caption?: string; title?: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4" onClick={onClose} role="dialog" aria-modal>
      <div className="flex flex-col items-center gap-3">
        {title && <div className="max-w-[88vw] truncate text-center text-[clamp(20px,3.4vh,34px)] font-black text-white">{title}</div>}
        <QrSvg url={url} className="h-[min(72vh,88vw)] w-[min(72vh,88vw)] p-2" />
        {caption && <div className="rounded-2xl bg-white px-6 py-1 text-[44px] leading-none font-black tracking-[0.15em] text-[#1b1640]">{caption}</div>}
        <div className="max-w-[92vw] text-center text-[15px] font-bold break-all text-white/85">{url.replace(/^https?:\/\//, '')}</div>
      </div>
      <button type="button" onClick={onClose} className="absolute top-4 right-4 grid h-11 w-11 place-items-center rounded-full bg-white/15 text-white" aria-label="Close"><X /></button>
    </div>
  );
}

/**
 * `path` is the join route without the code, e.g. "/doodle/join"; or pass a full `url`
 * (then `code` is only the caption shown under the big QR, and may be omitted).
 */
export function JoinQr({ path, code, url: fullUrl, title, size = 170, label, className }: { path?: string; code?: string; url?: string; title?: string; size?: number; label?: string; className?: string }) {
  const [big, setBig] = useState(false);
  const url = fullUrl ?? `${location.origin}${path ?? ''}/${code ?? ''}`;
  return (
    <>
      <button type="button" onClick={() => setBig(true)} className={cn('group relative shrink-0 rounded-2xl', className)} aria-label={label ?? 'QR'} title={label}>
        <QrSvg url={url} className="block" px={size} />
        <span className="absolute right-1.5 bottom-1.5 grid h-7 w-7 place-items-center rounded-lg bg-black/60 text-white opacity-80 group-hover:opacity-100"><Maximize2 size={15} /></span>
      </button>
      {big && <QrOverlay url={url} caption={code} title={title} onClose={() => setBig(false)} />}
    </>
  );
}
