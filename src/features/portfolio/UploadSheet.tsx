import { useId, useRef, useState, type DragEvent, type FormEvent, type ReactNode } from 'react';
import { CloudUpload, FileText, X } from 'lucide-react';
import { motion } from 'motion/react';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import {
  ACCEPT_ATTR,
  ACCEPT_HUMAN,
  KIND_INFO,
  MAX_TEXT_CHARS,
  PORTFOLIO_KINDS,
  PORTFOLIO_LEVELS,
  PORTFOLIO_SKILLS,
  SKILL_LABEL,
  createPortfolioItem,
  extOf,
  formatBytes,
  updatePortfolioItem,
  validatePortfolioFile,
  type PortfolioItem,
  type PortfolioKind,
  type PortfolioLevel,
  type PortfolioSkill,
  type ScoreScale,
} from '@/lib/portfolio';
import { Sheet, SheetAction } from './Sheet';
import { deep } from '@/lib/color';

type Mode = 'file' | 'text';

interface Form {
  mode: Mode;
  file: File | null;
  text: string;
  kind: PortfolioKind;
  kindTouched: boolean;
  title: string;
  level: PortfolioLevel | '';
  skill: PortfolioSkill | '';
  doneAt: string;
  score: string;
  scale: ScoreScale;
  description: string;
}

const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function initialForm(item?: PortfolioItem | null): Form {
  return {
    mode: item ? (item.text_content != null && !item.file_path ? 'text' : 'file') : 'file',
    file: null,
    text: item?.text_content ?? '',
    kind: item?.kind ?? 'writing',
    kindTouched: Boolean(item),
    title: item?.title ?? '',
    level: item?.level ?? '',
    skill: item?.skill ?? '',
    doneAt: item?.done_at ?? '',
    score: item?.score != null ? String(item.score) : '',
    scale: item?.score_scale ?? 'percent',
    description: item?.description ?? '',
  };
}

/** Create a portfolio item (file or pasted text), or edit an existing one's metadata. */
export function UploadSheet({
  open,
  onClose,
  onSaved,
  item,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (item: PortfolioItem) => void;
  /** When given, the sheet edits this item instead of creating one. */
  item?: PortfolioItem | null;
}) {
  return <SheetShell open={open} onClose={onClose} onSaved={onSaved} item={item ?? null} />;
}

function SheetShell({
  open,
  onClose,
  onSaved,
  item,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (item: PortfolioItem) => void;
  item: PortfolioItem | null;
}) {
  const editing = Boolean(item);
  const [f, setF] = useState<Form>(() => initialForm(item));
  const [fileError, setFileError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<null | { stage: 'upload' | 'save'; progress: number }>(null);
  const [dragging, setDragging] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const formId = useId();
  const ids = { title: useId(), date: useId(), score: useId(), desc: useId(), text: useId(), kind: useId(), level: useId(), skill: useId() };

  // Fresh form every time the sheet opens (state is kept while it animates out).
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    if (open) {
      setF(initialForm(item));
      setFileError(null);
      setError(null);
      setDragging(false);
    }
  }

  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const pick = (file: File | undefined | null) => {
    if (!file) return;
    const check = validatePortfolioFile(file);
    if (!check.ok) {
      setFileError(check.error);
      return;
    }
    setFileError(null);
    setF((x) => ({
      ...x,
      file,
      kind: !x.kindTouched && check.kind ? check.kind : x.kind,
      title: x.title.trim() ? x.title : prettyTitle(file.name),
    }));
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    pick(e.dataTransfer.files?.[0]);
  };

  const scoreNum = f.score.trim() === '' ? null : Number(f.score.replace(',', '.'));
  const scoreMax = f.scale === 'band' ? 9 : 100;
  const scoreInvalid = scoreNum != null && (!Number.isFinite(scoreNum) || scoreNum < 0 || scoreNum > scoreMax);
  const hasContent = editing || (f.mode === 'file' ? Boolean(f.file) : f.text.trim().length > 0);
  const textTooLong = f.text.length > MAX_TEXT_CHARS;
  const valid = f.title.trim().length > 0 && hasContent && !scoreInvalid && !textTooLong;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    if (!valid || busy) return;
    setError(null);
    const meta = {
      kind: f.kind,
      title: f.title,
      description: f.description,
      level: f.level || null,
      skill: f.skill || null,
      done_at: f.doneAt || null,
      score: scoreNum,
      score_scale: scoreNum == null ? null : f.scale,
    };
    try {
      let saved: PortfolioItem;
      if (item) {
        setBusy({ stage: 'save', progress: 1 });
        const textEditable = item.text_content != null || !item.file_path;
        saved = await updatePortfolioItem(item.id, textEditable ? { ...meta, text_content: f.text } : meta);
      } else if (f.mode === 'file' && f.file) {
        setBusy({ stage: 'upload', progress: 0 });
        saved = await createPortfolioItem(meta, f.file, {
          onProgress: (p) => setBusy({ stage: p >= 1 ? 'save' : 'upload', progress: p }),
        });
      } else {
        setBusy({ stage: 'save', progress: 1 });
        saved = await createPortfolioItem({ ...meta, text_content: f.text });
      }
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(null);
    }
  };

  const banner = busy ? (
    <div className="px-4 pb-2.5" aria-live="polite">
      <div className="text-footnote text-label-2 mb-1 flex items-center justify-between">
        <span className="inline-flex items-center gap-1.5">
          <Spinner className="h-3.5 w-3.5" />
          {busy.stage === 'upload' ? 'Subiendo archivo…' : 'Guardando…'}
        </span>
        {busy.stage === 'upload' && <span className="tabular-nums">{Math.round(busy.progress * 100)} %</span>}
      </div>
      <div
        className="bg-fill h-1.5 overflow-hidden rounded-full"
        role="progressbar"
        aria-label="Progreso de la subida"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(busy.progress * 100)}
      >
        <motion.div
          className="bg-ios-blue h-full rounded-full"
          animate={{ width: `${Math.max(4, busy.progress * 100)}%` }}
          transition={{ ease: 'easeOut', duration: 0.25 }}
        />
      </div>
    </div>
  ) : null;

  const textEditable = !item || item.text_content != null || !item.file_path;

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={editing ? 'Editar trabajo' : 'Subir trabajo'}
      closeLabel="Cancelar"
      dismissible={!busy}
      banner={banner}
      trailing={
        <SheetAction type="submit" form={formId} bold disabled={!valid || Boolean(busy)}>
          {editing ? 'Guardar' : 'Subir'}
        </SheetAction>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-6 px-4 pt-4 sm:px-5" noValidate>
        {/* ---- content: file or pasted text */}
        {!editing && (
          <Segmented<Mode>
            className="w-full"
            value={f.mode}
            onChange={(mode) => setF((x) => ({ ...x, mode, kind: !x.kindTouched && mode === 'text' ? 'writing' : x.kind }))}
            options={[
              { value: 'file', label: 'Archivo' },
              { value: 'text', label: 'Pegar texto' },
            ]}
          />
        )}

        {editing && item?.file_path && (
          <div className="bg-card dark:bg-elevated flex items-center gap-3 rounded-[14px] p-3 shadow-card">
            <FileText size={22} className="text-label-2 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <div className="text-subhead truncate font-medium">{item.file_name}</div>
              <div className="text-footnote text-label-2">
                {formatBytes(item.file_size)} · el archivo no se puede cambiar; elimina y vuelve a subir si hace falta.
              </div>
            </div>
          </div>
        )}

        {!editing && f.mode === 'file' && (
          <div>
            <input
              ref={fileInput}
              type="file"
              accept={ACCEPT_ATTR}
              className="sr-only"
              tabIndex={-1}
              aria-hidden
              onChange={(e) => {
                pick(e.target.files?.[0]);
                e.target.value = '';
              }}
            />
            {f.file ? (
              <div className="bg-card dark:bg-elevated flex items-center gap-3 rounded-[14px] p-3 shadow-card">
                <span
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[11px] text-[11px] font-bold tracking-wide text-white uppercase"
                  style={{ background: deep(KIND_INFO[f.kind].color) }}
                  aria-hidden
                >
                  {extOf(f.file.name).slice(0, 4) || 'file'}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="text-subhead truncate font-medium">{f.file.name}</div>
                  <div className="text-footnote text-label-2">{formatBytes(f.file.size)}</div>
                </div>
                <button
                  type="button"
                  onClick={() => set('file', null)}
                  disabled={Boolean(busy)}
                  className="bg-fill text-label-2 flex h-8 w-8 shrink-0 items-center justify-center rounded-full hover:opacity-70"
                  aria-label="Quitar archivo"
                >
                  <X size={16} strokeWidth={2.5} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInput.current?.click()}
                onDragOver={(e) => {
                  e.preventDefault();
                  setDragging(true);
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={cn(
                  'flex w-full flex-col items-center justify-center gap-2 rounded-[18px] border-2 border-dashed px-4 py-8 text-center transition-colors',
                  dragging ? 'border-ios-blue bg-[color-mix(in_srgb,var(--blue)_8%,transparent)]' : 'border-separator bg-card dark:bg-elevated hover:bg-fill-2',
                )}
              >
                <span className="bg-[color-mix(in_srgb,var(--blue)_14%,transparent)] text-ink-blue flex h-12 w-12 items-center justify-center rounded-full">
                  <CloudUpload size={24} aria-hidden />
                </span>
                <span className="text-headline">
                  <span className="text-ink-blue sm:hidden">Elige un archivo</span>
                  <span className="hidden sm:inline">
                    Arrastra un archivo o <span className="text-ink-blue">elige uno</span>
                  </span>
                </span>
                <span className="text-footnote text-label-2 max-w-[360px] text-pretty">{ACCEPT_HUMAN}. Máximo 20 MB.</span>
              </button>
            )}
            {fileError && (
              <p className="text-footnote text-ink-red mt-2 px-1" role="alert">
                {fileError}
              </p>
            )}
          </div>
        )}

        {textEditable && (editing ? item?.text_content != null || !item?.file_path : f.mode === 'text') && (
          <Field label="Texto" htmlFor={ids.text} hint={`${f.text.length.toLocaleString('es')} / ${MAX_TEXT_CHARS.toLocaleString('es')}`} hintBad={textTooLong}>
            <textarea
              id={ids.text}
              value={f.text}
              onChange={(e) => set('text', e.target.value)}
              rows={8}
              placeholder="Pega aquí tu redacción, ensayo o respuesta…"
              className={cn(inputCls, 'min-h-[180px] resize-y py-3 leading-[22px]')}
            />
          </Field>
        )}

        {/* ---- kind */}
        <fieldset>
          <legend className={labelCls} id={ids.kind}>
            Tipo de trabajo
          </legend>
          <div role="radiogroup" aria-labelledby={ids.kind} className="flex flex-wrap gap-2">
            {PORTFOLIO_KINDS.map((k) => {
              const info = KIND_INFO[k];
              const Icon = info.icon;
              const on = f.kind === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setF((x) => ({ ...x, kind: k, kindTouched: true }))}
                  className={cn(
                    'inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-medium transition-colors',
                    on ? 'text-white' : 'bg-card dark:bg-elevated text-label shadow-card hover:bg-fill-2',
                  )}
                  style={on ? { background: info.color } : undefined}
                >
                  <Icon size={16} aria-hidden style={on ? undefined : { color: info.color }} />
                  {info.label}
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* ---- title */}
        <Field label="Título" htmlFor={ids.title} required>
          <input
            id={ids.title}
            value={f.title}
            maxLength={200}
            onChange={(e) => set('title', e.target.value)}
            placeholder="p. ej. Essay: Technology in education"
            className={inputCls}
            autoComplete="off"
            required
          />
        </Field>

        {/* ---- level + skill */}
        <ChipPicker
          label="Nivel"
          id={ids.level}
          value={f.level}
          onChange={(v) => set('level', v as Form['level'])}
          options={[{ value: '', label: 'Sin nivel' }, ...PORTFOLIO_LEVELS.map((l) => ({ value: l, label: l }))]}
        />
        <ChipPicker
          label="Habilidad"
          id={ids.skill}
          value={f.skill}
          onChange={(v) => set('skill', v as Form['skill'])}
          options={[{ value: '', label: 'Ninguna' }, ...PORTFOLIO_SKILLS.map((s) => ({ value: s, label: SKILL_LABEL[s] }))]}
        />

        {/* ---- date + score */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field label="Fecha en que lo hiciste" htmlFor={ids.date}>
            <input id={ids.date} type="date" value={f.doneAt} max={today()} onChange={(e) => set('doneAt', e.target.value)} className={cn(inputCls, 'min-w-0')} />
          </Field>
          <Field
            label="Nota obtenida (opcional)"
            htmlFor={ids.score}
            hint={scoreInvalid ? (f.scale === 'band' ? 'De 0 a 9' : 'De 0 a 100') : undefined}
            hintBad={scoreInvalid}
          >
            <div className="flex min-w-0 items-center gap-2">
              <input
                id={ids.score}
                inputMode="decimal"
                value={f.score}
                onChange={(e) => set('score', e.target.value.replace(/[^\d.,]/g, '').slice(0, 5))}
                placeholder={f.scale === 'band' ? '6.5' : '85'}
                aria-invalid={scoreInvalid || undefined}
                className={cn(inputCls, 'w-0 min-w-0 flex-1', scoreInvalid && 'shadow-[inset_0_0_0_1.5px_var(--red)]')}
              />
              <Segmented<ScoreScale>
                size="sm"
                className="shrink-0"
                value={f.scale}
                onChange={(v) => set('scale', v)}
                options={[
                  { value: 'percent', label: '%' },
                  { value: 'band', label: 'Band' },
                ]}
              />
            </div>
          </Field>
        </div>

        {/* ---- description */}
        <Field label="Descripción (opcional)" htmlFor={ids.desc}>
          <textarea
            id={ids.desc}
            value={f.description}
            maxLength={2000}
            onChange={(e) => set('description', e.target.value)}
            rows={3}
            placeholder="¿De qué trata? ¿Para qué clase o examen fue?"
            className={cn(inputCls, 'resize-y py-3 leading-[22px]')}
          />
        </Field>

        {error && (
          <p className="text-subhead text-ink-red rounded-[12px] bg-[color-mix(in_srgb,var(--red)_10%,transparent)] px-3.5 py-2.5" role="alert">
            {error}
          </p>
        )}
        <div className="h-2" />
      </form>
    </Sheet>
  );
}

// ------------------------------------------------------------------ bits --

export const inputCls =
  'bg-card dark:bg-elevated text-label placeholder:text-label-3 block h-11 w-full rounded-[12px] px-3.5 text-[16px] shadow-card outline-none focus-visible:shadow-[inset_0_0_0_2px_var(--blue)]';
export const labelCls = 'text-footnote text-label-2 mb-1.5 block px-1 font-medium uppercase tracking-wide';

function Field({
  label,
  htmlFor,
  hint,
  hintBad,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  hintBad?: boolean;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className={labelCls}>
          {label}
          {required && <span aria-hidden> *</span>}
        </label>
        {hint && <span className={cn('text-caption mb-1.5 px-1 tabular-nums', hintBad ? 'text-ink-red' : 'text-label-2')}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function ChipPicker({
  label,
  id,
  value,
  onChange,
  options,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <span className={labelCls} id={id}>
        {label}
      </span>
      <div role="radiogroup" aria-labelledby={id} className="flex flex-wrap gap-2">
        {options.map((o) => {
          const on = value === o.value;
          return (
            <button
              key={o.value || 'none'}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => onChange(o.value)}
              className={cn(
                'h-8 rounded-full px-3.5 text-[14px] font-medium transition-colors',
                on ? 'bg-label text-bg' : 'bg-card dark:bg-elevated text-label shadow-card hover:bg-fill-2',
              )}
            >
              {o.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function prettyTitle(fileName: string) {
  const ext = extOf(fileName);
  const base = ext ? fileName.slice(0, -(ext.length + 1)) : fileName;
  const t = base.replace(/[_]+/g, ' ').replace(/\s+/g, ' ').trim();
  return (t.charAt(0).toUpperCase() + t.slice(1)).slice(0, 200);
}
