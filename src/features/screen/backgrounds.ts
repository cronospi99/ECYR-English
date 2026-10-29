/** Backgrounds that work offline: gradients, patterns, solid colours or an uploaded image (data URL). */
export interface Bg {
  id: string;
  label: string;
  css: string;
  /** Light backgrounds get dark dock text. */
  light?: boolean;
}

export const GRADIENTS: Bg[] = [
  { id: 'g:ocean', label: 'Océano', css: 'linear-gradient(135deg,#1e3a8a 0%,#2563eb 45%,#06b6d4 100%)' },
  { id: 'g:sunset', label: 'Atardecer', css: 'linear-gradient(135deg,#f97316 0%,#ec4899 55%,#7c3aed 100%)' },
  { id: 'g:forest', label: 'Bosque', css: 'linear-gradient(160deg,#064e3b 0%,#059669 55%,#a3e635 100%)' },
  { id: 'g:aurora', label: 'Aurora', css: 'radial-gradient(120% 90% at 10% 10%,#22d3ee 0%,transparent 55%),radial-gradient(120% 90% at 90% 20%,#a855f7 0%,transparent 55%),radial-gradient(140% 100% at 50% 100%,#10b981 0%,#0f172a 70%)' },
  { id: 'g:candy', label: 'Caramelo', css: 'linear-gradient(135deg,#fbcfe8 0%,#c4b5fd 50%,#93c5fd 100%)', light: true },
  { id: 'g:peach', label: 'Durazno', css: 'linear-gradient(135deg,#fde68a 0%,#fca5a5 60%,#f9a8d4 100%)', light: true },
  { id: 'g:night', label: 'Noche', css: 'radial-gradient(100% 80% at 80% 0%,#4338ca 0%,transparent 60%),linear-gradient(180deg,#0f172a 0%,#020617 100%)' },
  { id: 'g:sky', label: 'Cielo', css: 'linear-gradient(180deg,#bae6fd 0%,#e0f2fe 60%,#fef9c3 100%)', light: true },
];

export const PATTERNS: Bg[] = [
  { id: 'p:dots', label: 'Puntos', css: 'radial-gradient(rgba(255,255,255,.22) 1.5px,transparent 1.6px) 0 0/26px 26px,linear-gradient(135deg,#4f46e5,#7c3aed)' },
  { id: 'p:grid', label: 'Cuadrícula', css: 'linear-gradient(rgba(37,99,235,.13) 1px,transparent 1px) 0 0/32px 32px,linear-gradient(90deg,rgba(37,99,235,.13) 1px,transparent 1px) 0 0/32px 32px,#f8fafc', light: true },
  { id: 'p:chalk', label: 'Pizarra', css: 'radial-gradient(120% 120% at 50% 0%,rgba(255,255,255,.08),transparent 60%),repeating-linear-gradient(45deg,rgba(255,255,255,.025) 0 2px,transparent 2px 6px),#14532d' },
  { id: 'p:lines', label: 'Cuaderno', css: 'linear-gradient(90deg,transparent 70px,rgba(239,68,68,.35) 70px 72px,transparent 72px),repeating-linear-gradient(180deg,#fffdf5 0 31px,rgba(59,130,246,.25) 31px 32px)', light: true },
  { id: 'p:stripes', label: 'Rayas', css: 'repeating-linear-gradient(135deg,#0ea5e9 0 40px,#38bdf8 40px 80px)' },
  { id: 'p:confetti', label: 'Confeti', css: 'radial-gradient(circle at 20% 30%,#f472b6 0 5px,transparent 6px) 0 0/90px 90px,radial-gradient(circle at 70% 60%,#facc15 0 4px,transparent 5px) 0 0/70px 70px,radial-gradient(circle at 40% 80%,#34d399 0 4px,transparent 5px) 0 0/110px 110px,#1e1b4b' },
];

export const SOLIDS: Bg[] = [
  { id: 's:#0f172a', label: 'Grafito', css: '#0f172a' },
  { id: 's:#1d4ed8', label: 'Azul', css: '#1d4ed8' },
  { id: 's:#047857', label: 'Verde', css: '#047857' },
  { id: 's:#b91c1c', label: 'Rojo', css: '#b91c1c' },
  { id: 's:#6d28d9', label: 'Morado', css: '#6d28d9' },
  { id: 's:#f1f5f9', label: 'Claro', css: '#f1f5f9', light: true },
  { id: 's:#fef3c7', label: 'Crema', css: '#fef3c7', light: true },
  { id: 's:#ffffff', label: 'Blanco', css: '#ffffff', light: true },
];

const ALL = [...GRADIENTS, ...PATTERNS, ...SOLIDS];

/** `bg` is a preset id or "img:<dataURL>". */
export function bgStyle(bg: string): { css: string; light: boolean; image?: string } {
  if (bg.startsWith('img:')) return { css: '#0f172a', light: false, image: bg.slice(4) };
  const b = ALL.find((x) => x.id === bg) ?? GRADIENTS[0]!;
  return { css: b.css, light: !!b.light };
}

/** Downscales an image file to a JPEG data URL small enough for localStorage. */
export function fileToDataUrl(file: File, max = 1600, quality = 0.82): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const k = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * k);
      c.height = Math.round(img.height * k);
      const ctx = c.getContext('2d');
      URL.revokeObjectURL(url);
      if (!ctx) return reject(new Error('canvas'));
      ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL(file.type === 'image/png' && k === 1 && file.size < 400_000 ? 'image/png' : 'image/jpeg', quality));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('image'));
    };
    img.src = url;
  });
}
