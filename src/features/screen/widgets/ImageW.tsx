import { useRef, useState } from 'react';
import { ImagePlus, Maximize2, Minimize2, Upload } from 'lucide-react';
import { fileToDataUrl } from '../backgrounds';
import type { WidgetProps } from '../util';
import { Act, Empty } from './ui';

interface D {
  src: string | null;
  cover: boolean;
}

export default function ImageW({ data, set }: WidgetProps<D>) {
  const input = useRef<HTMLInputElement>(null);
  const [err, setErr] = useState<string | null>(null);
  const [over, setOver] = useState(false);

  const load = async (f?: File | null) => {
    if (!f || !f.type.startsWith('image/')) return;
    setErr(null);
    try {
      set({ src: await fileToDataUrl(f, 1400, 0.8) });
    } catch {
      setErr('No se pudo leer la imagen.');
    }
  };

  return (
    <div
      className="relative h-full"
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        void load(e.dataTransfer.files?.[0]);
      }}
    >
      <input ref={input} type="file" accept="image/*" hidden onChange={(e) => void load(e.target.files?.[0])} />
      {data.src ? (
        <>
          <img src={data.src} alt="" className="h-full w-full" style={{ objectFit: data.cover ? 'cover' : 'contain' }} draggable={false} />
          <div className="absolute right-2 bottom-2 flex gap-1.5 opacity-70 transition-opacity hover:opacity-100">
            <Act solid color="rgb(0 0 0 / .55)" className="h-9 min-w-9 px-2.5" onClick={() => set({ cover: !data.cover })} aria-label={data.cover ? 'Ajustar' : 'Llenar'}>
              {data.cover ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </Act>
            <Act solid color="rgb(0 0 0 / .55)" className="h-9 min-w-9 px-2.5" onClick={() => input.current?.click()} aria-label="Cambiar imagen">
              <Upload size={16} />
            </Act>
          </div>
        </>
      ) : (
        <Empty icon={<ImagePlus size={44} className="text-ink-pink" />} text={err ?? 'Sube o arrastra una imagen'}>
          <Act solid color="var(--pink)" onClick={() => input.current?.click()}>
            <Upload size={18} /> Subir imagen
          </Act>
        </Empty>
      )}
      {over && <div className="pointer-events-none absolute inset-2 rounded-[16px] border-4 border-dashed border-[var(--pink)] bg-[color-mix(in_srgb,var(--pink)_10%,transparent)]" />}
    </div>
  );
}
