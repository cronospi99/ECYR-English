import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import { FileDown, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { downloadBlob, fileName, worksheetPdf, type Worksheet } from '@/lib/worksheet';

function useStoredFlag(key: string, initial: boolean) {
  const [v, setV] = useState(() => {
    try {
      const raw = localStorage.getItem(key);
      return raw == null ? initial : raw === '1';
    } catch {
      return initial;
    }
  });
  const set = (x: boolean) => {
    setV(x);
    try {
      localStorage.setItem(key, x ? '1' : '0');
    } catch {
      /* storage unavailable */
    }
  };
  return [v, set] as const;
}

/** "Tarea en PDF": builds a printable worksheet of whatever is on screen. */
export function PdfButton({ build, label = 'Tarea en PDF', size = 'sm' }: { build: () => Worksheet; label?: string; size?: 'sm' | 'md' }) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [answerKey, setAnswerKey] = useStoredFlag('ecyr:pdf:key', true);
  const [fields, setFields] = useStoredFlag('ecyr:pdf:fields', true);
  const [teacher, setTeacher] = useState(() => {
    try {
      return localStorage.getItem('ecyr:pdf:teacher') ?? '';
    } catch {
      return '';
    }
  });

  const make = async () => {
    setBusy(true);
    setError(null);
    try {
      const ws = build();
      try {
        localStorage.setItem('ecyr:pdf:teacher', teacher);
      } catch {
        /* storage unavailable */
      }
      downloadBlob(await worksheetPdf(ws, { answerKey, studentFields: fields, teacher: teacher.trim() || undefined }), fileName(ws.title));
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo crear el PDF.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="tinted" size={size} onClick={() => setOpen(true)}>
        <FileDown size={16} /> {label}
      </Button>
      {open &&
        createPortal(
          <div className="fixed inset-0 z-[95] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label="Crear tarea en PDF">
            <motion.div className="absolute inset-0 bg-black/40" initial={{ opacity: 0 }} animate={{ opacity: 1 }} onClick={() => setOpen(false)} />
            <motion.div
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              className="bg-card pb-safe relative w-full max-w-md rounded-t-[24px] p-5 shadow-float sm:rounded-[24px]"
            >
              <div className="flex items-center justify-between">
                <div className="text-[19px] font-bold">Tarea en PDF</div>
                <button type="button" onClick={() => setOpen(false)} className="bg-fill-2 flex h-8 w-8 items-center justify-center rounded-full" aria-label="Cerrar">
                  <X size={16} />
                </button>
              </div>
              <p className="text-label-2 mt-1 text-[14px]">Una hoja lista para imprimir o enviar, con los ejercicios de esta actividad.</p>
              <div className="mt-4 space-y-3">
                <Toggle on={answerKey} set={setAnswerKey} label="Incluir la clave de respuestas" sub="En una página aparte al final, para el docente." />
                <Toggle on={fields} set={setFields} label="Campos de nombre, fecha y nota" />
                <label className="block">
                  <span className="text-label-2 text-[13px] font-semibold">Docente (opcional)</span>
                  <input
                    value={teacher}
                    onChange={(e) => setTeacher(e.target.value)}
                    placeholder="Tu nombre"
                    className="bg-fill-2 placeholder:text-label-3 mt-1 w-full rounded-[10px] px-3 py-2 text-[15px] outline-none"
                  />
                </label>
              </div>
              {error && <p className="text-ink-red mt-3 text-[13px]">{error}</p>}
              <Button className="mt-5 w-full" onClick={make} disabled={busy}>
                {busy ? <Loader2 size={16} className="animate-spin" /> : <FileDown size={16} />} Descargar PDF
              </Button>
            </motion.div>
          </div>,
          document.body,
        )}
    </>
  );
}

function Toggle({ on, set, label, sub }: { on: boolean; set: (v: boolean) => void; label: string; sub?: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} onClick={() => set(!on)} className="flex w-full items-center gap-3 text-left">
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium">{label}</span>
        {sub && <span className="text-label-2 block text-[12.5px]">{sub}</span>}
      </span>
      <span className={`relative h-[30px] w-[50px] shrink-0 rounded-full transition-colors ${on ? 'bg-ios-green' : 'bg-fill'}`}>
        <span className={`absolute top-[2px] h-[26px] w-[26px] rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[22px]' : 'translate-x-[2px]'}`} />
      </span>
    </button>
  );
}
