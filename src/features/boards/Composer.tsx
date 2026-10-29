import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Check, Paintbrush, Pencil, X } from 'lucide-react';
import { DrawingBoard } from '@/components/draw/DrawingBoard';
import { Sheet, SheetAction } from '@/features/portfolio/Sheet';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import { CARD_COLORS, COLOR_STYLE, MAX_IMAGE, MAX_TEXT, type BoardLayout, type CardColor, type CardDraft } from '@/lib/boards';
import { PAPER_INK } from './StickyCard';

/** Re-encodes a drawing smaller when it is over the server's limit. */
async function fitImage(url: string): Promise<string | null> {
  if (url.length <= MAX_IMAGE) return url;
  const img = new Image();
  img.src = url;
  await img.decode().catch(() => {});
  for (const [w, type, q] of [
    [1000, 'image/webp', 0.8],
    [800, 'image/jpeg', 0.75],
    [640, 'image/jpeg', 0.6],
  ] as const) {
    const scale = Math.min(1, w / (img.naturalWidth || w));
    const cv = document.createElement('canvas');
    cv.width = Math.max(1, Math.round((img.naturalWidth || w) * scale));
    cv.height = Math.max(1, Math.round((img.naturalHeight || w * 0.75) * scale));
    const ctx = cv.getContext('2d');
    if (!ctx) return null;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.drawImage(img, 0, 0, cv.width, cv.height);
    const out = cv.toDataURL(type, q);
    if (out.length <= MAX_IMAGE && /^data:image\/(png|jpeg|webp);base64,/.test(out)) return out;
  }
  return null;
}

export function ColorSwatches({ value, onChange }: { value: CardColor; onChange: (c: CardColor) => void }) {
  return (
    <div role="radiogroup" aria-label="Color" className="flex flex-wrap gap-2 sm:gap-2.5">
      {CARD_COLORS.map((c) => (
        <button
          key={c}
          type="button"
          role="radio"
          aria-checked={value === c}
          aria-label={COLOR_STYLE[c].label}
          onClick={() => onChange(c)}
          className={cn(
            'flex h-9 w-9 items-center justify-center rounded-full transition-transform duration-200 active:scale-90 sm:h-10 sm:w-10',
            value === c ? 'scale-110 ring-[3px] ring-[var(--label)] ring-offset-2 ring-offset-[var(--bg)]' : 'hover:scale-105',
          )}
          style={{ background: COLOR_STYLE[c].paper, boxShadow: `inset 0 0 0 1.5px ${COLOR_STYLE[c].edge}` }}
        >
          {value === c && <Check size={18} strokeWidth={3} color={PAPER_INK} />}
        </button>
      ))}
    </div>
  );
}

/** Full-screen drawing pad (above the sheet). */
export function DrawModal({ open, initial, onClose, onDone }: { open: boolean; initial?: string | null; onClose: () => void; onDone: (url: string) => void }) {
  const [narrow, setNarrow] = useState(() => typeof window !== 'undefined' && window.innerWidth < 640);
  useEffect(() => {
    const on = () => setNarrow(window.innerWidth < 640);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  useEffect(() => {
    if (!open) return;
    const k = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [open, onClose]);
  if (typeof document === 'undefined') return null;
  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="bg-bg fixed inset-0 z-[120] flex flex-col"
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.98 }}
          transition={{ duration: 0.22 }}
          role="dialog"
          aria-modal="true"
          aria-label="Dibujar"
        >
          <div className="material hairline-b flex h-14 shrink-0 items-center gap-2 px-3">
            <button type="button" onClick={onClose} className="text-ink-blue h-10 rounded-[10px] px-2 text-[17px] hover:opacity-70">
              Cancelar
            </button>
            <h2 className="text-headline flex-1 text-center">🎨 Dibujo</h2>
            <span className="w-[84px]" />
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-6">
            <DrawingBoard
              className="mx-auto w-full max-w-[920px]"
              onDone={onDone}
              doneLabel="Usar dibujo"
              initial={initial ?? undefined}
              aspect={4 / 3}
              compact={narrow}
              hideDownload
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  );
}

/** New / edit card: the post-it itself is the editor. */
export function Composer({
  open,
  onClose,
  heading,
  initial,
  layout,
  columns,
  storyBefore,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  heading: string;
  initial?: Partial<CardDraft>;
  layout: BoardLayout;
  columns: string[];
  /** Story: the last part, shown above so the writer continues it. */
  storyBefore?: string | null;
  onSubmit: (d: CardDraft) => Promise<boolean>;
}) {
  const [text, setText] = useState('');
  const [color, setColor] = useState<CardColor>('yellow');
  const [image, setImage] = useState<string | null>(null);
  const [col, setCol] = useState(0);
  const [drawing, setDrawing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const area = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!open) return;
    setText(initial?.text ?? '');
    setColor(initial?.color ?? (CARD_COLORS[Math.floor(Math.random() * 6)] as CardColor));
    setImage(initial?.image ?? null);
    setCol(initial?.col ?? 0);
    setErr(null);
    setBusy(false);
    const t = window.setTimeout(() => area.current?.focus(), 350);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const can = (text.trim().length > 0 || !!image) && !busy;
  const submit = async () => {
    if (!can) return;
    setBusy(true);
    const ok = await onSubmit({ text: text.trim(), color, image, col });
    setBusy(false);
    if (ok) onClose();
  };

  const paper = COLOR_STYLE[color];
  const left = MAX_TEXT - text.length;

  return (
    <>
      <Sheet
        open={open}
        onClose={onClose}
        title={heading}
        closeLabel="Cancelar"
        trailing={
          <SheetAction bold disabled={!can} onClick={() => void submit()}>
            {busy ? <Spinner className="h-4 w-4" /> : 'Publicar'}
          </SheetAction>
        }
      >
        <div className="flex flex-col gap-5 p-4 sm:p-6">
          {layout === 'story' && storyBefore && (
            <div className="bg-fill-2 text-label-2 rounded-[14px] px-4 py-3 text-[15px] italic">
              <span className="text-label-3 mr-1 not-italic">…</span>
              {storyBefore.length > 160 ? `…${storyBefore.slice(-160)}` : storyBefore}
            </div>
          )}

          <motion.div
            layout
            className="relative mx-auto w-full max-w-[440px] rounded-[8px] p-4 shadow-[0_2px_2px_rgb(0_0_0/0.06),0_18px_36px_-18px_rgb(0_0_0/0.45)] transition-colors duration-300 dark:brightness-[0.93]"
            style={{ background: paper.paper, color: PAPER_INK, rotate: -1 }}
          >
            <span aria-hidden className="absolute -top-3 left-1/2 h-6 w-20 -translate-x-1/2 rotate-[-2deg] rounded-[2px] bg-white/60 shadow-[0_1px_2px_rgb(0_0_0/0.1)]" />
            {image && (
              <div className="relative mb-3 overflow-hidden rounded-[6px] bg-white/80" style={{ aspectRatio: '4 / 3' }}>
                <img src={image} alt="Tu dibujo" className="h-full w-full object-contain" />
                <div className="absolute top-2 right-2 flex gap-1.5">
                  <button type="button" onClick={() => setDrawing(true)} aria-label="Editar dibujo" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white">
                    <Pencil size={16} />
                  </button>
                  <button type="button" onClick={() => setImage(null)} aria-label="Quitar dibujo" className="flex h-9 w-9 items-center justify-center rounded-full bg-black/55 text-white">
                    <X size={18} />
                  </button>
                </div>
              </div>
            )}
            <textarea
              ref={area}
              value={text}
              onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void submit();
              }}
              rows={image ? 2 : 5}
              maxLength={MAX_TEXT}
              aria-label="Texto de la tarjeta"
              placeholder={layout === 'story' ? 'And then…' : 'Escribe tu idea…'}
              className="font-rounded w-full resize-none bg-transparent text-[20px] leading-[1.35] font-semibold outline-none placeholder:text-black/35"
            />
            <div className={cn('text-right text-[12px] font-semibold tabular-nums', left < 20 ? 'text-[#c8102e]' : 'text-black/40')}>{left}</div>
          </motion.div>

          <ColorSwatches value={color} onChange={setColor} />

          {layout === 'columns' && columns.length > 1 && (
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Columna">
              {columns.map((name, i) => (
                <button
                  key={i}
                  type="button"
                  role="radio"
                  aria-checked={col === i}
                  onClick={() => setCol(i)}
                  className={cn('h-9 rounded-full px-4 text-[15px] font-semibold transition-colors', col === i ? 'bg-label text-bg' : 'bg-fill text-label')}
                >
                  {name}
                </button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="tinted" onClick={() => setDrawing(true)} className="flex-1 sm:flex-none">
              <Paintbrush size={18} /> {image ? 'Editar dibujo' : 'Dibujar'}
            </Button>
            <Button type="button" variant="brand" disabled={!can} onClick={() => void submit()} className="flex-1">
              {busy ? <Spinner className="h-5 w-5" /> : 'Publicar'}
            </Button>
          </div>
          {err && <p className="text-ink-red text-[14px]">{err}</p>}
        </div>
      </Sheet>
      <DrawModal
        open={drawing}
        initial={image}
        onClose={() => setDrawing(false)}
        onDone={(url) => {
          setDrawing(false);
          void fitImage(url).then((ok) => {
            if (ok) setImage(ok);
            else setErr('El dibujo es demasiado grande. Prueba con menos detalle.');
          });
        }}
      />
    </>
  );
}
