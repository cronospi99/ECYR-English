/**
 * Teacher side of "Tareas". Mount inside the teacher hub:
 *   <AssignmentsManager />                 list + create / edit / delete + per-student detail
 *   <AssignmentDetail id="…" />            one assignment's per-student table (standalone)
 *   <StudentAssignments studentId="…" />   one student's tasks, for the student page
 */
import { useCallback, useEffect, useId, useMemo, useState, type ReactNode } from 'react';
import { CalendarClock, ChevronDown, ClipboardList, ExternalLink, FileText, MessageSquareText, Pencil, Plus, RefreshCw, Trash2, Upload, Users } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { ProgressBar } from '@/components/ui/Progress';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, LevelChip, Spinner, Toggle } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import { portfolioSignedUrl } from '@/lib/portfolio';
import { Sheet } from '@/features/portfolio/Sheet';
import { inputCls, labelCls } from '@/features/portfolio/UploadSheet';
import {
  MAX_FEEDBACK,
  audienceOf,
  classStatus,
  deleteAssignment,
  dueInfo,
  effectiveStatus,
  isAutoDetectable,
  isTasksMissing,
  listMyAssignments,
  listMyStudents,
  review,
  studentStatus,
  submissionItems,
  type Assignment,
  type AssignmentStatus,
  type EffectiveStatus,
  type StudentLite,
  type SubmissionItem,
} from '@/lib/assignments';
import { AssignmentSheet } from './AssignmentSheet';
import { MissingTasksCard } from './MissingTasks';
import { DUE_COLOR, KIND_META, STATUS_META, VIA_LABEL, formatDate } from './meta';
import { ink } from '@/lib/color';

const key = (a: string, s: string) => `${a}:${s}`;
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e));
const nameOf = (s: StudentLite | undefined) => s?.full_name || s?.email || 'Estudiante';

// ------------------------------------------------------------------ data --

interface ClassTasks {
  assignments: Assignment[];
  students: StudentLite[];
  statuses: Record<string, AssignmentStatus>; // key(assignment, student)
  items: Record<string, SubmissionItem>;
}

function useClassTasks() {
  const [data, setData] = useState<ClassTasks | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [assignments, students] = await Promise.all([listMyAssignments(), listMyStudents()]);
      const rows = await classStatus(assignments.map((a) => a.id));
      const items = await submissionItems(rows.map((r) => r.portfolio_item_id ?? '')).catch(() => ({}));
      setData({ assignments, students, statuses: Object.fromEntries(rows.map((r) => [key(r.assignment_id, r.student_id), r])), items });
    } catch (e) {
      setError(errText(e));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const putStatus = (r: AssignmentStatus) =>
    setData((d) => (d ? { ...d, statuses: { ...d.statuses, [key(r.assignment_id, r.student_id)]: r } } : d));
  const putAssignment = (a: Assignment) =>
    setData((d) => (d ? { ...d, assignments: d.assignments.some((x) => x.id === a.id) ? d.assignments.map((x) => (x.id === a.id ? a : x)) : [a, ...d.assignments] } : d));
  const dropAssignment = (id: string) => setData((d) => (d ? { ...d, assignments: d.assignments.filter((x) => x.id !== id) } : d));

  return { data, error, loading, reload, putStatus, putAssignment, dropAssignment };
}

interface Tally {
  total: number;
  done: number;
  late: number;
  excused: number;
  overdue: number;
}

function tally(a: Assignment, students: StudentLite[], statuses: Record<string, AssignmentStatus>, now = new Date()): Tally {
  const ids = audienceOf(a, students.map((s) => s.id));
  const t: Tally = { total: ids.length, done: 0, late: 0, excused: 0, overdue: 0 };
  for (const id of ids) {
    const e = effectiveStatus(a, statuses[key(a.id, id)], now);
    if (e === 'done') t.done++;
    else if (e === 'late') t.late++;
    else if (e === 'excused') t.excused++;
    else if (e === 'overdue') t.overdue++;
  }
  return t;
}

// ------------------------------------------------------------- manager --

type Filter = 'active' | 'past' | 'all';

/** The teacher's assignments with completion bars, filters, create / edit / delete and per-student detail. */
export function AssignmentsManager({ className }: { className?: string }) {
  const { data, error, loading, reload, putStatus, putAssignment, dropAssignment } = useClassTasks();
  const [filter, setFilter] = useState<Filter>('active');
  const [openId, setOpenId] = useState<string | null>(null);
  const [sheet, setSheet] = useState<{ open: boolean; a: Assignment | null }>({ open: false, a: null });
  const [confirm, setConfirm] = useState<Assignment | null>(null);

  const now = Date.now();
  const isPast = (a: Assignment) => Boolean(a.due_at && new Date(a.due_at).getTime() < now);
  const list = useMemo(() => {
    const xs = data?.assignments ?? [];
    const f = filter === 'active' ? xs.filter((a) => !isPast(a)) : filter === 'past' ? xs.filter(isPast) : xs;
    // Active: soonest due first; others: newest first.
    return filter === 'active'
      ? [...f].sort((a, b) => (a.due_at ?? '9999').localeCompare(b.due_at ?? '9999') || b.created_at.localeCompare(a.created_at))
      : f;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.assignments, filter]);
  const counts = useMemo(() => {
    const xs = data?.assignments ?? [];
    const past = xs.filter(isPast).length;
    return { active: xs.length - past, past, all: xs.length };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.assignments]);

  return (
    <section className={className} aria-labelledby="assignments-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <h2 id="assignments-title" className="text-title-2 flex items-center gap-2">
            <ClipboardList size={22} className="text-ink-blue" aria-hidden /> Tareas
          </h2>
          <p className="text-subhead text-label-2">Asigna trabajo a tu clase y mira quién lo completó.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="gray" size="sm" onClick={() => void reload()} disabled={loading} aria-label="Actualizar">
            <RefreshCw size={15} className={loading ? 'animate-spin' : undefined} aria-hidden />
          </Button>
          {!(error && isTasksMissing(error)) && (
            <Button variant="brand" size="sm" onClick={() => setSheet({ open: true, a: null })} disabled={!data}>
              <Plus size={16} strokeWidth={2.6} aria-hidden /> Nueva tarea
            </Button>
          )}
        </div>
      </div>

      <Segmented<Filter>
        className="mb-4 w-full sm:w-auto"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'active', label: `Activas (${counts.active})` },
          { value: 'past', label: `Vencidas (${counts.past})` },
          { value: 'all', label: `Todas (${counts.all})` },
        ]}
      />

      {error && isTasksMissing(error) ? (
        <MissingTasksCard onRetry={() => void reload()} />
      ) : error ? (
        <Card className="p-5 text-center">
          <p className="text-ink-red text-subhead" role="alert">
            {error}
          </p>
          <Button className="mt-3" size="sm" variant="tinted" onClick={() => void reload()}>
            Reintentar
          </Button>
        </Card>
      ) : !data ? (
        <div className="text-label-2 flex justify-center py-12">
          <Spinner className="h-6 w-6" />
        </div>
      ) : !list.length ? (
        <Card>
          <EmptyState
            icon={<ClipboardList size={44} strokeWidth={1.6} />}
            title={data.assignments.length ? 'Nada en este filtro' : 'Aún no has asignado tareas'}
            body={
              data.assignments.length
                ? 'Cambia el filtro para ver el resto.'
                : 'Crea una tarea para toda la clase o para algunos estudiantes: una unidad, un juego, una práctica o una entrega.'
            }
            action={
              !data.assignments.length && (
                <Button variant="brand" onClick={() => setSheet({ open: true, a: null })}>
                  <Plus size={16} aria-hidden /> Nueva tarea
                </Button>
              )
            }
          />
        </Card>
      ) : (
        <ul className="space-y-3">
          {list.map((a) => (
            <li key={a.id}>
              <AssignmentRow
                a={a}
                t={tally(a, data.students, data.statuses)}
                open={openId === a.id}
                onToggle={() => setOpenId((x) => (x === a.id ? null : a.id))}
                onEdit={() => setSheet({ open: true, a })}
                onDelete={() => setConfirm(a)}
              >
                <AssignmentDetail id={a.id} embedded assignment={a} students={data.students} statuses={data.statuses} items={data.items} onStatus={putStatus} />
              </AssignmentRow>
            </li>
          ))}
        </ul>
      )}

      {data && (
        <AssignmentSheet
          open={sheet.open}
          assignment={sheet.a}
          students={data.students}
          onClose={() => setSheet((s) => ({ ...s, open: false }))}
          onSaved={(a) => {
            putAssignment(a);
            if (!sheet.a) setFilter(a.due_at && new Date(a.due_at).getTime() < Date.now() ? 'past' : 'active');
          }}
        />
      )}
      <ConfirmDelete
        a={confirm}
        onClose={() => setConfirm(null)}
        onDeleted={(id) => {
          dropAssignment(id);
          setConfirm(null);
        }}
      />
    </section>
  );
}

function AssignmentRow({
  a,
  t,
  open,
  onToggle,
  onEdit,
  onDelete,
  children,
}: {
  a: Assignment;
  t: Tally;
  open: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
  children: ReactNode;
}) {
  const k = KIND_META[a.kind];
  const due = dueInfo(a.due_at);
  const detailId = useId();
  const denom = Math.max(0, t.total - t.excused);
  const finished = t.done + t.late;
  const ratio = denom ? finished / denom : 0;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <IconTile icon={k.icon} color={k.color} size={38} soft />
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2">
            <h3 className="text-headline min-w-0 flex-1 text-pretty">{a.title}</h3>
            <div className="-mt-1 -mr-1 flex shrink-0 items-center">
              <IconButton label={`Editar "${a.title}"`} onClick={onEdit}>
                <Pencil size={16} />
              </IconButton>
              <IconButton label={`Eliminar "${a.title}"`} onClick={onDelete} danger>
                <Trash2 size={16} />
              </IconButton>
            </div>
          </div>
          <div className="text-footnote text-label-2 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            {a.level && <LevelChip level={a.level} className="h-5 px-2 text-[11px]" />}
            <span className="inline-flex items-center gap-1">
              <Users size={13} aria-hidden /> {a.audience === 'class' ? 'Toda la clase' : `${a.targets?.length ?? 0} estudiante${a.targets?.length === 1 ? '' : 's'}`}
            </span>
            <span className="inline-flex items-center gap-1 font-medium" style={{ color: ink(DUE_COLOR[due.tone]) }} title={due.exact || undefined}>
              <CalendarClock size={13} aria-hidden /> {due.label}
            </span>
            {a.requires_submission && (
              <span className="inline-flex items-center gap-1">
                <Upload size={13} aria-hidden /> Con entrega
              </span>
            )}
          </div>
          {a.target.label && a.target.label !== a.title && <p className="text-footnote text-label-3 mt-0.5 truncate">{a.target.label}</p>}

          <div className="mt-3 flex items-center gap-3">
            <ProgressBar value={ratio} color={ratio >= 1 ? 'var(--green)' : 'var(--blue)'} className="flex-1" />
            <span className="text-footnote shrink-0 font-semibold tabular-nums">
              {finished}/{denom}
            </span>
          </div>
          <p className="text-caption text-label-2 mt-1">
            {t.total === 0
              ? 'Sin estudiantes asignados'
              : [
                  `${finished} hecha${finished === 1 ? '' : 's'}`,
                  t.late ? `${t.late} tarde` : '',
                  t.overdue ? `${t.overdue} sin entregar` : '',
                  t.excused ? `${t.excused} eximida${t.excused === 1 ? '' : 's'}` : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={detailId}
        className="text-ink-blue hairline-t hover:bg-fill-2/60 flex h-11 w-full items-center justify-center gap-1 text-[15px] font-semibold"
      >
        {open ? 'Ocultar estudiantes' : 'Ver estudiantes'}
        <ChevronDown size={17} className={cn('transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div id={detailId} className="hairline-t">
          {children}
        </div>
      )}
    </Card>
  );
}

function IconButton({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className={cn('hover:bg-fill-2 flex h-9 w-9 items-center justify-center rounded-full transition-colors', danger ? 'text-ink-red' : 'text-label-2')}
    >
      {children}
    </button>
  );
}

function ConfirmDelete({ a, onClose, onDeleted }: { a: Assignment | null; onClose: () => void; onDeleted: (id: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  useEffect(() => setErr(null), [a]);
  const go = async () => {
    if (!a) return;
    setBusy(true);
    try {
      await deleteAssignment(a.id);
      onDeleted(a.id);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={Boolean(a)} onClose={onClose} dismissible={!busy} title="Eliminar tarea" closeLabel="Cancelar" className="sm:max-w-[440px]">
      <div className="space-y-4 p-5 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--red)_14%,transparent)] text-ink-red">
          <Trash2 size={22} aria-hidden />
        </span>
        <p className="text-body">
          ¿Eliminar <strong>“{a?.title}”</strong>?
        </p>
        <p className="text-subhead text-label-2">Desaparece para tus estudiantes junto con su estado y tus comentarios. Los trabajos que subieron siguen en su portafolio.</p>
        {err && (
          <p className="text-ink-red text-footnote" role="alert">
            {err}
          </p>
        )}
        <div className="flex flex-col gap-2 sm:flex-row-reverse">
          <Button variant="destructive" className="flex-1" onClick={() => void go()} disabled={busy}>
            {busy ? <Spinner className="h-4 w-4" /> : 'Eliminar'}
          </Button>
          <Button variant="gray" className="flex-1" onClick={onClose} disabled={busy}>
            Cancelar
          </Button>
        </div>
      </div>
    </Sheet>
  );
}

// -------------------------------------------------------------- detail --

/**
 * Per-student status of one assignment, with a review form per student.
 * Standalone: pass only `id` and it loads what it needs. Inside
 * AssignmentsManager it receives the already-loaded data.
 */
export function AssignmentDetail({
  id,
  embedded = false,
  assignment,
  students,
  statuses,
  items,
  onStatus,
}: {
  id: string;
  embedded?: boolean;
  assignment?: Assignment;
  students?: StudentLite[];
  statuses?: Record<string, AssignmentStatus>;
  items?: Record<string, SubmissionItem>;
  onStatus?: (r: AssignmentStatus) => void;
}) {
  const given = Boolean(assignment && students && statuses);
  const [own, setOwn] = useState<ClassTasks | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (given) return;
    let alive = true;
    (async () => {
      try {
        const [as, st] = await Promise.all([listMyAssignments(), listMyStudents()]);
        const rows = await classStatus([id]);
        const it = await submissionItems(rows.map((r) => r.portfolio_item_id ?? '')).catch(() => ({}));
        if (alive)
          setOwn({ assignments: as.filter((a) => a.id === id), students: st, statuses: Object.fromEntries(rows.map((r) => [key(r.assignment_id, r.student_id), r])), items: it });
      } catch (e) {
        if (alive) setError(errText(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [id, given]);

  const a = assignment ?? own?.assignments[0];
  const roster = students ?? own?.students ?? [];
  const [local, setLocal] = useState<Record<string, AssignmentStatus>>({});
  const st = { ...(statuses ?? own?.statuses ?? {}), ...local };
  const its = items ?? own?.items ?? {};
  const put = (r: AssignmentStatus) => {
    setLocal((x) => ({ ...x, [key(r.assignment_id, r.student_id)]: r }));
    onStatus?.(r);
  };

  if (error)
    return isTasksMissing(error) ? (
      <MissingTasksCard bare className="p-4" />
    ) : (
      <p className="text-ink-red text-subhead p-4" role="alert">
        {error}
      </p>
    );
  if (!a)
    return own ? (
      <p className="text-label-2 text-subhead p-4">Esta tarea ya no existe.</p>
    ) : (
      <div className="text-label-2 flex justify-center p-6">
        <Spinner />
      </div>
    );

  const ids = audienceOf(a, roster.map((s) => s.id));
  const byId = new Map(roster.map((s) => [s.id, s]));
  const order: Record<EffectiveStatus, number> = { overdue: 0, pending: 1, late: 2, done: 3, excused: 4 };
  const now = new Date();
  const rows = ids
    .map((sid) => ({ sid, s: st[key(a.id, sid)] ?? null }))
    .sort((x, y) => order[effectiveStatus(a, x.s, now)] - order[effectiveStatus(a, y.s, now)] || nameOf(byId.get(x.sid)).localeCompare(nameOf(byId.get(y.sid))));

  const body = !rows.length ? (
    <p className="text-subhead text-label-2 p-4">{roster.length ? 'Ningún estudiante tiene asignada esta tarea.' : 'Aún no hay estudiantes en tu clase.'}</p>
  ) : (
    <ul>
      {rows.map(({ sid, s }) => (
        <StatusRow
          key={sid}
          a={a}
          studentId={sid}
          s={s}
          item={s?.portfolio_item_id ? its[s.portfolio_item_id] : undefined}
          leading={<Initials name={nameOf(byId.get(sid))} />}
          title={nameOf(byId.get(sid))}
          onSaved={put}
        />
      ))}
    </ul>
  );

  if (embedded) return body;
  return (
    <Card className="overflow-hidden">
      <div className="flex items-start gap-3 p-4">
        <IconTile icon={KIND_META[a.kind].icon} color={KIND_META[a.kind].color} size={38} soft />
        <div className="min-w-0 flex-1">
          <h3 className="text-headline">{a.title}</h3>
          <p className="text-footnote text-label-2">{dueInfo(a.due_at).label}</p>
        </div>
      </div>
      <div className="hairline-t">{body}</div>
    </Card>
  );
}

function Initials({ name }: { name: string }) {
  const ini = name
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <span className="bg-fill text-label-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-bold" aria-hidden>
      {ini || '?'}
    </span>
  );
}

/** One (assignment, student) pair: status, submission, student note and the review form. */
function StatusRow({
  a,
  studentId,
  s,
  item,
  leading,
  title,
  subtitle,
  onSaved,
}: {
  a: Assignment;
  studentId: string;
  s: AssignmentStatus | null;
  item?: SubmissionItem;
  leading: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  onSaved: (r: AssignmentStatus) => void;
}) {
  const eff = effectiveStatus(a, s);
  const meta = STATUS_META[eff];
  const [open, setOpen] = useState(false);
  const [showText, setShowText] = useState(false);
  const [fileErr, setFileErr] = useState<string | null>(null);
  const panelId = useId();

  const openFile = async () => {
    if (!item?.file_path) return;
    setFileErr(null);
    const w = window.open('', '_blank');
    try {
      const url = await portfolioSignedUrl(item.file_path);
      if (w) {
        w.opener = null;
        w.location.href = url;
      } else window.location.assign(url);
    } catch (e) {
      w?.close();
      setFileErr(errText(e));
    }
  };

  return (
    <li className="[&:not(:last-child)]:shadow-[inset_0_-0.5px_0_var(--separator)]">
      <div className="flex items-start gap-3 px-4 py-3">
        {leading}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="text-body min-w-0 truncate font-medium">{title}</span>
            <span
              className="text-caption inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
              style={{ color: ink(meta.color), background: `color-mix(in srgb, ${meta.color} 13%, transparent)` }}
            >
              <meta.icon size={12} strokeWidth={2.5} aria-hidden /> {meta.label}
            </span>
            {s?.score != null && <span className="text-footnote text-label font-semibold tabular-nums">{Math.round(s.score * 10) / 10}/100</span>}
          </div>
          {subtitle}
          <div className="text-footnote text-label-2 mt-0.5 flex flex-wrap gap-x-3">
            {s?.done_at && <span>{formatDate(s.done_at)}</span>}
            {s?.via && <span>{VIA_LABEL[s.via]}</span>}
            {!s?.done_at && isAutoDetectable(a) && eff !== 'excused' && <span>Se marcará sola al completarla</span>}
          </div>
          {s?.student_note && <p className="text-subhead text-label-2 mt-1.5 border-l-2 border-[var(--separator)] pl-2 italic">“{s.student_note}”</p>}
          {item && (
            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
              {item.file_path && (
                <button type="button" onClick={() => void openFile()} className="text-ink-blue text-footnote inline-flex items-center gap-1 font-semibold hover:opacity-70">
                  <ExternalLink size={13} aria-hidden /> {item.file_name || 'Abrir archivo'}
                </button>
              )}
              {item.text_content && (
                <button
                  type="button"
                  onClick={() => setShowText((v) => !v)}
                  aria-expanded={showText}
                  className="text-ink-blue text-footnote inline-flex items-center gap-1 font-semibold hover:opacity-70"
                >
                  <FileText size={13} aria-hidden /> {showText ? 'Ocultar texto' : `Leer “${item.title}”`}
                </button>
              )}
            </div>
          )}
          {s?.portfolio_item_id && !item && <p className="text-footnote text-label-3 mt-1">Entregó un trabajo (no disponible).</p>}
          {fileErr && (
            <p className="text-ink-red text-footnote mt-1" role="alert">
              {fileErr}
            </p>
          )}
          {showText && item?.text_content && (
            <div className="bg-fill-2 text-subhead mt-2 max-h-[320px] overflow-y-auto rounded-[12px] p-3 whitespace-pre-wrap">{item.text_content}</div>
          )}
          {s?.teacher_feedback && !open && (
            <p className="text-footnote text-label-2 mt-1.5 flex items-start gap-1">
              <MessageSquareText size={13} className="mt-0.5 shrink-0" aria-hidden /> <span className="line-clamp-2">{s.teacher_feedback}</span>
            </p>
          )}
        </div>
        <Button size="sm" variant={open ? 'gray' : 'tinted'} onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={panelId} className="shrink-0">
          {open ? 'Cerrar' : s?.reviewed_at ? 'Editar' : 'Revisar'}
        </Button>
      </div>
      {open && (
        <div id={panelId} className="px-4 pb-4">
          <ReviewForm
            a={a}
            studentId={studentId}
            s={s}
            onSaved={(r) => {
              onSaved(r);
              setOpen(false);
            }}
          />
        </div>
      )}
    </li>
  );
}

function ReviewForm({ a, studentId, s, onSaved }: { a: Assignment; studentId: string; s: AssignmentStatus | null; onSaved: (r: AssignmentStatus) => void }) {
  const [feedback, setFeedback] = useState(s?.teacher_feedback ?? '');
  const [score, setScore] = useState(s?.score != null ? String(s.score) : '');
  const [excused, setExcused] = useState(s?.status === 'excused');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const ids = { fb: useId(), sc: useId() };
  const scoreNum = score.trim() === '' ? null : Number(score);
  const scoreBad = scoreNum != null && !(scoreNum >= 0 && scoreNum <= 100);

  const save = async () => {
    if (scoreBad || feedback.length > MAX_FEEDBACK) return;
    setBusy(true);
    setErr(null);
    try {
      const wasExcused = s?.status === 'excused';
      const r = await review(a.id, studentId, { feedback, score: scoreNum, excused: excused ? true : wasExcused ? false : null });
      onSaved(r);
    } catch (e) {
      setErr(errText(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="bg-fill-2 space-y-3 rounded-[14px] p-3"
      onSubmit={(e) => {
        e.preventDefault();
        void save();
      }}
    >
      <div>
        <div className="flex items-baseline justify-between">
          <label htmlFor={ids.fb} className={labelCls}>
            Comentario
          </label>
          <span className={cn('text-caption mb-1.5 px-1 tabular-nums', feedback.length > MAX_FEEDBACK ? 'text-ink-red' : 'text-label-2')}>
            {feedback.length}/{MAX_FEEDBACK}
          </span>
        </div>
        <textarea
          id={ids.fb}
          rows={3}
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          placeholder="Qué hizo bien y qué debe mejorar."
          className={cn(inputCls, 'h-auto min-h-[84px] resize-y py-3 leading-[22px]')}
        />
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label htmlFor={ids.sc} className={labelCls}>
            Nota (0–100)
          </label>
          <input
            id={ids.sc}
            type="number"
            min={0}
            max={100}
            step="any"
            inputMode="decimal"
            value={score}
            onChange={(e) => setScore(e.target.value)}
            className={cn(inputCls, 'w-[120px]', scoreBad && 'shadow-[inset_0_0_0_1.5px_var(--red)]')}
            aria-invalid={scoreBad}
          />
        </div>
        <label className="flex h-11 items-center gap-2">
          <Toggle checked={excused} onChange={setExcused} label="Eximir de esta tarea" />
          <span className="text-subhead">Eximir</span>
        </label>
        <Button type="submit" size="md" className="ml-auto" disabled={busy || scoreBad || feedback.length > MAX_FEEDBACK}>
          {busy ? <Spinner className="h-4 w-4" /> : 'Guardar'}
        </Button>
      </div>
      {err && (
        <p className="text-ink-red text-footnote" role="alert">
          {err}
        </p>
      )}
    </form>
  );
}

// ------------------------------------------------------------- student --

/** One student's tasks (from the signed-in teacher) with status and review, for the student page. */
export function StudentAssignments({ studentId, className }: { studentId: string; className?: string }) {
  const [data, setData] = useState<{ a: Assignment[]; st: Record<string, AssignmentStatus>; items: Record<string, SubmissionItem> } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    setData(null);
    (async () => {
      try {
        const [as, rows] = await Promise.all([listMyAssignments(), studentStatus(studentId)]);
        const mine = as.filter((a) => a.audience === 'class' || a.targets?.includes(studentId));
        const items = await submissionItems(rows.map((r) => r.portfolio_item_id ?? '')).catch(() => ({}));
        if (alive) setData({ a: mine, st: Object.fromEntries(rows.map((r) => [r.assignment_id, r])), items });
      } catch (e) {
        if (alive) setError(errText(e));
      }
    })();
    return () => {
      alive = false;
    };
  }, [studentId]);

  if (error && isTasksMissing(error)) return <MissingTasksCard className={className} />;
  if (error)
    return (
      <Card className={cn('p-5', className)}>
        <p className="text-ink-red text-subhead" role="alert">
          {error}
        </p>
      </Card>
    );
  if (!data)
    return (
      <div className={cn('text-label-2 flex justify-center py-10', className)}>
        <Spinner className="h-6 w-6" />
      </div>
    );

  const now = new Date();
  const views = data.a
    .map((a) => ({ a, s: data.st[a.id] ?? null, eff: effectiveStatus(a, data.st[a.id], now) }))
    .sort((x, y) => (y.a.due_at ?? y.a.created_at).localeCompare(x.a.due_at ?? x.a.created_at));
  const done = views.filter((v) => v.eff === 'done' || v.eff === 'late').length;
  const excused = views.filter((v) => v.eff === 'excused').length;
  const overdue = views.filter((v) => v.eff === 'overdue').length;
  const denom = views.length - excused;

  return (
    <Card className={cn('overflow-hidden', className)}>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <IconTile icon={ClipboardList} color="var(--blue)" size={34} />
          <div className="min-w-0 flex-1">
            <h3 className="text-headline">Tareas</h3>
            <p className="text-footnote text-label-2">
              {views.length ? `${done} de ${denom} hechas${overdue ? ` · ${overdue} vencida${overdue === 1 ? '' : 's'}` : ''}` : 'Sin tareas asignadas'}
            </p>
          </div>
        </div>
        {views.length > 0 && <ProgressBar value={denom ? done / denom : 0} className="mt-3" color={overdue ? 'var(--orange)' : 'var(--green)'} />}
      </div>
      {views.length > 0 && (
        <ul className="hairline-t">
          {views.map(({ a, s, eff }) => (
            <StatusRow
              key={a.id}
              a={a}
              studentId={studentId}
              s={s}
              item={s?.portfolio_item_id ? data.items[s.portfolio_item_id] : undefined}
              leading={<IconTile icon={KIND_META[a.kind].icon} color={KIND_META[a.kind].color} size={34} soft />}
              title={a.title}
              subtitle={
                <span
                  className="text-footnote block font-medium"
                  style={{ color: eff === 'pending' || eff === 'overdue' ? DUE_COLOR[dueInfo(a.due_at).tone] : 'var(--label-2)' }}
                >
                  {dueInfo(a.due_at).label}
                </span>
              }
              onSaved={(r) => setData((d) => (d ? { ...d, st: { ...d.st, [r.assignment_id]: r } } : d))}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}

