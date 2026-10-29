import { useMemo, useState } from 'react';
import qrcode from 'qrcode-generator';
import { Check, Copy, Link2 } from 'lucide-react';
import type { WidgetProps } from '../util';
import { Act, inputCls, Label, Panel } from './ui';

interface D {
  url: string;
  label: string;
}

export const defaultQrUrl = () => (typeof location !== 'undefined' ? `${location.origin}/boards` : '/boards');

/** One SVG path for all dark modules (crisp at any size). */
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
    return null; // too long
  }
}

export default function Qr({ data, set, editing, setEditing }: WidgetProps<D>) {
  const url = data.url || defaultQrUrl();
  const label = data.label ?? 'Pizarras en vivo';
  const qr = useMemo(() => qrPath(url), [url]);
  const [copied, setCopied] = useState(false);

  if (editing)
    return (
      <Panel>
        <Label>Enlace</Label>
        <input className={inputCls} value={data.url ?? url} onChange={(e) => set({ url: e.target.value })} inputMode="url" aria-label="Enlace" />
        <Label>Título</Label>
        <input className={inputCls} value={label} onChange={(e) => set({ label: e.target.value })} aria-label="Título" />
        <div className="flex gap-2">
          <Act color="var(--blue)" onClick={() => set({ url: defaultQrUrl(), label: 'Pizarras en vivo' })}>
            <Link2 size={16} /> Pizarras
          </Act>
          <Act solid color="var(--blue)" className="ml-auto" onClick={() => setEditing(false)}>
            Listo
          </Act>
        </div>
      </Panel>
    );

  return (
    <div className="flex h-full flex-col items-center gap-2 p-3 [container-type:size]">
      {label && <div className="font-rounded text-center leading-tight font-bold" style={{ fontSize: 'min(8cqh, 9cqw)' }}>{label}</div>}
      <div className="flex min-h-0 w-full flex-1 items-center justify-center">
        {qr ? (
          <svg viewBox={`-2 -2 ${qr.n + 4} ${qr.n + 4}`} className="aspect-square h-full max-h-full max-w-full rounded-[12px] bg-white" shapeRendering="crispEdges" role="img" aria-label={`Código QR: ${url}`}>
            <path d={qr.d} fill="#000" />
          </svg>
        ) : (
          <p className="text-ink-red text-center text-[15px]">Enlace demasiado largo para un QR.</p>
        )}
      </div>
      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }).catch(() => {});
        }}
        className="text-label-2 flex max-w-full items-center gap-1.5 text-[14px] font-semibold"
        title="Copiar enlace"
      >
        {copied ? <Check size={14} className="text-ink-green shrink-0" /> : <Copy size={14} className="shrink-0" />}
        <span className="truncate">{url.replace(/^https?:\/\//, '')}</span>
      </button>
    </div>
  );
}
