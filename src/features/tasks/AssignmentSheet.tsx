import { useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { Link2, Sparkles, UserCheck } from 'lucide-react';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner, Toggle } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import { LEVELS, loadLevel } from '@/content/levels';
import { useAsync } from '@/hooks/useAsync';
import type { CefrLevel } from '@/content/types';
import { Sheet, SheetAction } from '@/features/portfolio/Sheet';
import { inputCls, labelCls } from '@/features/portfolio/UploadSheet';
import { unitTitle } from '@/features/learn/LevelPage';
import {
  MAX_INSTRUCTIONS,
  MAX_TITLE,
  createAssignment,
  isAutoDetectable,
  updateAssignment,
  validateTo,
  type Assignment,
  type AssignmentAudience,
  type StudentLite,
} from '@/lib/assignments';
import {
  GAME_OPTIONS,
  GRAMMAR_OPTIONS,
  IELTS_OPTIONS,
  PRACTICE_OPTIONS,
  SOURCE_LABEL,
  UNIT_TABS,
  buildTarget,
  pickerFromTarget,
  type PickerSource,
  type PickerState,
  type UnitTab,
} from './targets';

const pad = (n: number) => String(n).padStart(2, '0');
const localDate = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const localTime = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

interface Form {
  title: string;
  instructions: string;
  picker: PickerState;
  /** 'auto' = take the level from the chosen content. */
  levelOverride: CefrLevel | 'none' | 'auto';
  hasDue: boolean;
  dueDate: string;
  dueTime: string;
  requiresSubmission: boolean;
  audience: AssignmentAudience;
  students: string[];
}

function initial(a?: Assignment | null): Form {
  const nextWeek = new Date(Date.now() + 7 * 86_400_000);
  const due = a?.due_at ? new Date(a.due_at) : null;
  const base: PickerState = {
    source: 'unit',
    level: 'A1',
    unit: null,
    unitTab: 'practice',
    grammar: GRAMMAR_OPTIONS[0]?.id ?? '',
    practice: PRACTICE_OPTIONS[0]!.id,
    game: GAME_OPTIONS[0]?.id ?? '',
    ielts: IELTS_OPTIONS[0]!.id,
    customTo: '',
    minScore: '',
  };
  return {
    title: a?.title ?? '',
    instructions: a?.instructions ?? '',
    picker: a ? { ...base, ...pickerFromTarget(a.target, a.level) } : base,
    levelOverride: a ? (a.level ?? 'none') : 'auto',
    hasDue: a ? Boolean(a.due_at) : true,
    dueDate: localDate(due ?? nextWeek),
    dueTime: due ? localTime(due) : '23:59',
    requiresSubmission: a?.requires_submission ?? false,
    audience: a?.audience ?? 'class',
    students: a?.targets ?? [],
  };
}

/** Create or edit an assignment. */
export function AssignmentSheet({
  open,
  onClose,
  onSaved,
  assignment,
  students,
}: {
  open: boolean;
  onClose: () => void;
  onSaved: (a: Assignment) => void;
  assignment?: Assignment | null;
  students: StudentLite[];
}) {
  const [f, setF] = useState<Form>(() => initial(assignment));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tried, setTried] = useState(false);
  const formId = useId();
  const ids = { title: useId(), instr: useId(), level: useId(), unit: useId(), item: useId(), link: useId(), min: useId(), date: useId(), time: useId(), lvl: useId(), src: useId() };

  useEffect(() => {
    if (open) {
      setF(initial(assignment));
      setError(null);
      setTried(false);
    }
  }, [open, assignment]);

  const p = f.picker;
  const setP = (patch: Partial<PickerState>) => setF((x) => ({ ...x, picker: { ...x.picker, ...patch } }));
  const set = <K extends keyof Form>(k: K, v: Form[K]) => setF((x) => ({ ...x, [k]: v }));

  const book = useAsync(() => (p.source === 'unit' ? loadLevel(p.level) : Promise.resolve(null)), [p.source, p.level]);
  const units = book.data?.units ?? [];
  const chosenUnit = units.find((u) => u.n === p.unit);

  const built = useMemo(
    () => buildTarget({ ...p, unitTitle: chosenUnit ? unitTitle(chosenUnit.title) : undefined }),
    [p, chosenUnit],
  );
  const level: CefrLevel | null = f.levelOverride === 'auto' ? built.level : f.levelOverride === 'none' ? null : f.levelOverride;
  const auto = isAutoDetectable({ target: built.target, requires_submission: f.requiresSubmission });

  const problems = {
    title: !f.title.trim() ? 'Escribe un título.' : f.title.length > MAX_TITLE ? `Máximo ${MAX_TITLE} caracteres.` : null,
    unit: p.source === 'unit' && !p.unit ? 'Elige una unidad.' : null,
    link: p.source === 'custom' && !validateTo(p.customTo.trim()) ? 'Debe ser una ruta de la plataforma que empiece por "/", p. ej. /practice/reading.' : null,
    min: p.minScore.trim() !== '' && !(Number(p.minScore) >= 0 && Number(p.minScore) <= 100) ? 'Entre 0 y 100.' : null,
    due: f.hasDue && (!f.dueDate || !f.dueTime) ? 'Indica fecha y hora.' : null,
    students: f.audience === 'students' && !f.students.length ? 'Elige al menos un estudiante.' : null,
  };
  const invalid = Object.values(problems).some(Boolean) || f.instructions.length > MAX_INSTRUCTIONS;

  const submit = async (e?: FormEvent) => {
    e?.preventDefault();
    setTried(true);
    if (invalid || busy) return;
    setBusy(true);
    setError(null);
    try {
      const due = f.hasDue ? new Date(`${f.dueDate}T${f.dueTime}`).toISOString() : null;
      const draft = {
        title: f.title,
        instructions: f.instructions,
        kind: built.kind,
        target: { ...built.target, level: level ?? undefined },
        level,
        due_at: due,
        requires_submission: f.requiresSubmission,
        audience: f.audience,
        students: f.audience === 'students' ? f.students : [],
      };
      const saved = assignment ? await updateAssignment(assignment.id, draft) : await createAssignment(draft);
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  };

  const show = (k: keyof typeof problems) => (tried ? problems[k] : null);
  const sources = Object.keys(SOURCE_LABEL) as PickerSource[];

  return (
    <Sheet
      open={open}
      onClose={onClose}
      dismissible={!busy}
      title={assignment ? 'Editar tarea' : 'Nueva tarea'}
      leading={
        <SheetAction onClick={onClose} disabled={busy}>
          Cancelar
        </SheetAction>
      }
      trailing={
        <SheetAction type="submit" form={formId} bold disabled={busy}>
          {busy ? <Spinner className="h-4 w-4" /> : assignment ? 'Guardar' : 'Asignar'}
        </SheetAction>
      }
    >
      <form id={formId} onSubmit={submit} className="space-y-6 px-4 pt-4 sm:px-5" noValidate>
        {error && (
          <p role="alert" className="text-ink-red text-subhead rounded-[12px] bg-[color-mix(in_srgb,var(--red)_10%,transparent)] px-3 py-2">
            {error}
          </p>
        )}

        <Field label="Título" htmlFor={ids.title} required error={show('title')} hint={`${f.title.length}/${MAX_TITLE}`}>
          <input
            id={ids.title}
            value={f.title}
            maxLength={MAX_TITLE}
            onChange={(e) => set('title', e.target.value)}
            placeholder="p. ej. Practica la unidad 3"
            className={inputCls}
            aria-invalid={Boolean(show('title'))}
          />
        </Field>

        <Field label="Instrucciones (opcional)" htmlFor={ids.instr} hint={`${f.instructions.length}/${MAX_INSTRUCTIONS}`} error={f.instructions.length > MAX_INSTRUCTIONS ? 'Demasiado largo.' : null}>
          <textarea
            id={ids.instr}
            rows={3}
            value={f.instructions}
            onChange={(e) => set('instructions', e.target.value)}
            placeholder="Qué deben hacer y cómo lo vas a evaluar."
            className={cn(inputCls, 'h-auto min-h-[88px] resize-y py-3 leading-[22px]')}
          />
        </Field>

        {/* ---- what to do */}
        <fieldset className="space-y-4">
          <legend className={labelCls} id={ids.src}>
            Qué deben hacer
          </legend>
          <div role="radiogroup" aria-labelledby={ids.src} className="flex flex-wrap gap-2">
            {sources.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={p.source === s}
                onClick={() => setP({ source: s })}
                className={cn(
                  'h-8 rounded-full px-3.5 text-[14px] font-medium transition-colors',
                  p.source === s ? 'bg-label text-bg' : 'bg-card dark:bg-elevated text-label shadow-card hover:bg-fill-2',
                )}
              >
                {SOURCE_LABEL[s]}
              </button>
            ))}
          </div>

          {p.source === 'unit' && (
            <>
              <div className="grid grid-cols-[110px_minmax(0,1fr)] gap-3">
                <Field label="Nivel" htmlFor={ids.level}>
                  <select id={ids.level} value={p.level} onChange={(e) => setP({ level: e.target.value as CefrLevel, unit: null })} className={inputCls}>
                    {LEVELS.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.id}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Unidad" htmlFor={ids.unit} error={show('unit')}>
                  <select
                    id={ids.unit}
                    value={p.unit ?? ''}
                    onChange={(e) => setP({ unit: e.target.value ? Number(e.target.value) : null })}
                    className={inputCls}
                    disabled={book.loading}
                    aria-invalid={Boolean(show('unit'))}
                  >
                    <option value="">{book.loading ? 'Cargando…' : 'Elige una unidad'}</option>
                    {units.map((u) => (
                      <option key={u.n} value={u.n}>
                        {u.n}. {unitTitle(u.title)}
                      </option>
                    ))}
                  </select>
                </Field>
              </div>
              <div>
                <span className={labelCls}>Parte</span>
                <Segmented<UnitTab> className="w-full" size="sm" value={p.unitTab} onChange={(unitTab) => setP({ unitTab })} options={UNIT_TABS} />
              </div>
            </>
          )}

          {p.source === 'grammar' && (
            <Field label="Módulo" htmlFor={ids.item}>
              <select id={ids.item} value={p.grammar} onChange={(e) => setP({ grammar: e.target.value })} className={inputCls}>
                {GRAMMAR_OPTIONS.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.label} ({g.levels.join('–')})
                  </option>
                ))}
              </select>
            </Field>
          )}

          {p.source === 'practice' && (
            <Field label="Práctica" htmlFor={ids.item}>
              <select id={ids.item} value={p.practice} onChange={(e) => setP({ practice: e.target.value })} className={inputCls}>
                {PRACTICE_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {p.source === 'game' && (
            <Field label="Juego" htmlFor={ids.item}>
              <select id={ids.item} value={p.game} onChange={(e) => setP({ game: e.target.value })} className={inputCls}>
                {GAME_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {p.source === 'ielts' && (
            <Field label="Módulo IELTS" htmlFor={ids.item}>
              <select id={ids.item} value={p.ielts} onChange={(e) => setP({ ielts: e.target.value })} className={inputCls}>
                {IELTS_OPTIONS.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.label}
                  </option>
                ))}
              </select>
            </Field>
          )}

          {p.source === 'custom' && (
            <Field label="Enlace dentro de la plataforma (opcional)" htmlFor={ids.link} error={show('link')}>
              <input
                id={ids.link}
                value={p.customTo}
                onChange={(e) => setP({ customTo: e.target.value })}
                placeholder="/practice/reading"
                className={inputCls}
                inputMode="url"
                autoCapitalize="off"
                spellCheck={false}
                aria-invalid={Boolean(show('link'))}
              />
            </Field>
          )}

          {p.source !== 'custom' && (
            <Field label="Nota mínima para darla por hecha (opcional)" htmlFor={ids.min} error={show('min')}>
              <input
                id={ids.min}
                type="number"
                min={0}
                max={100}
                inputMode="numeric"
                value={p.minScore}
                onChange={(e) => setP({ minScore: e.target.value })}
                placeholder="Cualquier nota"
                className={cn(inputCls, 'max-w-[200px]')}
              />
            </Field>
          )}

          <div className="bg-fill-2 text-footnote text-label-2 flex items-start gap-2 rounded-[12px] p-3">
            {auto ? <Sparkles size={16} className="text-ink-purple mt-px shrink-0" aria-hidden /> : <Link2 size={16} className="mt-px shrink-0" aria-hidden />}
            <span>
              {built.target.label && <strong className="text-label block font-semibold">{built.target.label}</strong>}
              {auto
                ? 'Se marcará sola cuando el estudiante complete esta actividad después de asignarla.'
                : f.requiresSubmission
                  ? 'El estudiante la entrega subiendo un archivo o texto desde "Mis trabajos".'
                  : 'El estudiante la marcará como hecha.'}
            </span>
          </div>
        </fieldset>

        <Field label="Nivel (opcional)" htmlFor={ids.lvl}>
          <select
            id={ids.lvl}
            value={level ?? 'none'}
            onChange={(e) => set('levelOverride', e.target.value as CefrLevel | 'none')}
            className={cn(inputCls, 'max-w-[200px]')}
          >
            <option value="none">Sin nivel</option>
            {LEVELS.map((l) => (
              <option key={l.id} value={l.id}>
                {l.id} · {l.nameEs}
              </option>
            ))}
          </select>
        </Field>

        {/* ---- due date */}
        <div className="space-y-3">
          <ToggleRow label="Fecha límite" checked={f.hasDue} onChange={(v) => set('hasDue', v)} />
          {f.hasDue && (
            <div className="grid grid-cols-[minmax(0,1fr)_120px] gap-3">
              <Field label="Día" htmlFor={ids.date} error={show('due')}>
                <input id={ids.date} type="date" value={f.dueDate} onChange={(e) => set('dueDate', e.target.value)} className={cn(inputCls, 'min-w-0')} />
              </Field>
              <Field label="Hora" htmlFor={ids.time}>
                <input id={ids.time} type="time" value={f.dueTime} onChange={(e) => set('dueTime', e.target.value)} className={cn(inputCls, 'min-w-0')} />
              </Field>
            </div>
          )}
          <ToggleRow
            label="Requiere entrega"
            hint="Archivo o texto desde “Mis trabajos”"
            checked={f.requiresSubmission}
            onChange={(v) => set('requiresSubmission', v)}
          />
        </div>

        {/* ---- audience */}
        <div className="space-y-3">
          <span className={labelCls}>Para</span>
          <Segmented<AssignmentAudience>
            className="w-full"
            value={f.audience}
            onChange={(v) => set('audience', v)}
            options={[
              { value: 'class', label: 'Toda la clase' },
              { value: 'students', label: 'Elegir estudiantes' },
            ]}
          />
          {f.audience === 'students' && (
            <div>
              {students.length ? (
                <>
                  <div className="mb-1.5 flex items-center justify-between px-1">
                    <span className={cn('text-footnote', show('students') ? 'text-ink-red' : 'text-label-2')}>
                      {show('students') ?? `${f.students.length} de ${students.length} elegidos`}
                    </span>
                    <button
                      type="button"
                      className="text-ink-blue text-footnote font-semibold hover:opacity-70"
                      onClick={() => set('students', f.students.length === students.length ? [] : students.map((s) => s.id))}
                    >
                      {f.students.length === students.length ? 'Quitar todos' : 'Elegir todos'}
                    </button>
                  </div>
                  <ul className="bg-card dark:bg-elevated max-h-[260px] overflow-y-auto rounded-[14px] shadow-card">
                    {students.map((s) => {
                      const on = f.students.includes(s.id);
                      return (
                        <li key={s.id} className="[&:not(:last-child)]:shadow-[inset_0_-0.5px_0_var(--separator)]">
                          <label className="flex min-h-[44px] cursor-pointer items-center gap-3 px-4 py-2">
                            <input
                              type="checkbox"
                              checked={on}
                              onChange={() => set('students', on ? f.students.filter((x) => x !== s.id) : [...f.students, s.id])}
                              className="accent-[var(--blue)] h-5 w-5 shrink-0"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="text-body block truncate">{s.full_name || s.email || 'Estudiante'}</span>
                              {s.full_name && s.email && <span className="text-footnote text-label-2 block truncate">{s.email}</span>}
                            </span>
                          </label>
                        </li>
                      );
                    })}
                  </ul>
                </>
              ) : (
                <p className="text-footnote text-label-2 flex items-center gap-1.5 px-1">
                  <UserCheck size={14} aria-hidden /> Aún no hay estudiantes en tu clase.
                </p>
              )}
            </div>
          )}
        </div>
        <div className="h-2" />
      </form>
    </Sheet>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string | null;
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
        {hint && <span className="text-caption text-label-2 mb-1.5 px-1 tabular-nums">{hint}</span>}
      </div>
      {children}
      {error && (
        <p className="text-ink-red text-footnote mt-1 px-1" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

function ToggleRow({ label, hint, checked, onChange }: { label: string; hint?: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="bg-card dark:bg-elevated flex min-h-[52px] items-center gap-3 rounded-[14px] px-4 py-2 shadow-card">
      <span className="min-w-0 flex-1">
        <span className="text-body block">{label}</span>
        {hint && <span className="text-footnote text-label-2 block">{hint}</span>}
      </span>
      <Toggle checked={checked} onChange={onChange} label={label} />
    </div>
  );
}
