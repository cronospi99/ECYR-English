import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpDown, Download, Search, UserRound } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import { categoryOf, featureDef } from '@/lib/usageFeatures';
import {
  KIND_LABEL,
  UsageMissingError,
  fetchStudentDaily,
  fetchStudentDetail,
  fetchStudentTimeline,
  fetchStudents,
  studentDetailToCsv,
  studentsToCsv,
  withInventory,
  type StudentContext,
  type StudentDay,
  type StudentFeature,
  type StudentRow,
  type TimelineEvent,
} from '@/lib/usageStats';

const nf = new Intl.NumberFormat('es');
const fmt = (n: number) => nf.format(Math.round(n * 10) / 10);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' }) : '—');
const fmtDateTime = (iso: string) => new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
const label = (s: StudentRow) => s.name || s.email || 'Sin nombre';

function save(name: string, csv: string) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}

type SortKey = 'name' | 'teacher' | 'activeDays' | 'minutes' | 'features' | 'lastAt';

export function StudentUsage({ days, refresh = 0 }: { days: number; refresh?: number }) {
  const [rows, setRows] = useState<StudentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [who, setWho] = useState<'student' | 'all'>('student');
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 }>({ key: 'minutes', dir: -1 });
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setRows(null);
    setError(null);
    fetchStudents(days)
      .then((r) => live && setRows(r))
      .catch((e) => {
        if (!live) return;
        setError(e instanceof UsageMissingError ? 'Falta aplicar supabase/migrations/24_usage_by_student.sql en Supabase (SQL Editor) y pulsar Actualizar.' : (e as Error).message);
      });
    return () => {
      live = false;
    };
  }, [days, refresh]);

  const shown = useMemo(() => {
    if (!rows) return [];
    const term = q.trim().toLowerCase();
    const list = rows.filter(
      (r) => (who === 'all' || r.role === 'student') && (!term || `${r.name} ${r.email} ${r.teacher}`.toLowerCase().includes(term)),
    );
    const { key, dir } = sort;
    const val = (r: StudentRow) => (key === 'name' ? label(r).toLowerCase() : key === 'teacher' ? r.teacher.toLowerCase() : key === 'lastAt' ? r.lastAt ?? '' : r[key]);
    return list.sort((a, b) => {
      const x = val(a);
      const y = val(b);
      return (x < y ? -1 : x > y ? 1 : 0) * dir || label(a).localeCompare(label(b), 'es');
    });
  }, [rows, q, who, sort]);

  const current = rows?.find((r) => r.id === openId) ?? null;
  if (current) return <Detail student={current} days={days} onBack={() => setOpenId(null)} />;

  const th = (key: SortKey, text: string, cls = '') => (
    <th className={cn('py-2 pr-3 font-medium', cls)} aria-sort={sort.key === key ? (sort.dir === 1 ? 'ascending' : 'descending') : 'none'}>
      <button
        type="button"
        className={cn('inline-flex items-center gap-1 whitespace-nowrap', sort.key === key && 'text-label font-semibold')}
        onClick={() => setSort((s) => (s.key === key ? { key, dir: (s.dir * -1) as 1 | -1 } : { key, dir: key === 'name' || key === 'teacher' ? 1 : -1 }))}
      >
        {text} <ArrowUpDown size={11} aria-hidden />
      </button>
    </th>
  );

  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-title-3">Uso por estudiante</h2>
        <Button variant="gray" size="sm" disabled={!shown.length} onClick={() => save(`uso-estudiantes-${days}d`, studentsToCsv(shown, days))}>
          <Download size={15} /> Exportar CSV
        </Button>
      </div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <label className="bg-fill-2 flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[10px] px-3 sm:max-w-sm">
          <Search size={16} className="text-label-2 shrink-0" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar por nombre, correo o profesor"
            aria-label="Buscar estudiante"
            className="text-label min-w-0 flex-1 bg-transparent text-[14px] outline-none"
          />
        </label>
        <Segmented
          value={who}
          onChange={setWho}
          size="sm"
          options={[
            { value: 'student', label: 'Alumnos' },
            { value: 'all', label: 'Todos' },
          ]}
        />
      </div>
      {error && (
        <p className="text-ink-red text-[14px]" role="alert">
          {error}
        </p>
      )}
      {!rows && !error && <Spinner className="mx-auto my-10 h-7 w-7" />}
      {rows && (
        <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <table className="w-full text-left text-[13px]" data-testid="students-table">
            <thead className="text-label-2 text-[12px]">
              <tr className="border-b border-separator">
                {th('name', 'Nombre')}
                {th('teacher', 'Profesor', 'hidden md:table-cell')}
                {th('activeDays', 'Días', 'hidden text-right sm:table-cell')}
                {th('minutes', 'Min', 'text-right')}
                {th('features', 'Herram.', 'text-right')}
                {th('lastAt', 'Último uso', 'hidden sm:table-cell')}
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {shown.map((r) => (
                <tr key={r.id} className="border-b border-separator/60">
                  <td className="max-w-[210px] py-1.5 pr-3">
                    <button type="button" onClick={() => setOpenId(r.id)} className="block w-full min-w-0 text-left hover:opacity-70">
                      <span className={cn('block truncate font-medium', r.events === 0 && 'text-label-2')}>{label(r)}</span>
                      <span className="text-label-2 block truncate text-[11px] md:hidden">
                        {r.teacher || (r.role === 'teacher' ? 'Docente' : 'Sin profesor')} · {fmtDate(r.lastAt)}
                      </span>
                    </button>
                  </td>
                  <td className="hidden py-1.5 pr-3 md:table-cell">
                    {r.role === 'teacher' ? <span className="text-label-2">Docente</span> : r.teacher || <span className="text-label-2">—</span>}
                  </td>
                  <td className="hidden py-1.5 pr-3 text-right sm:table-cell">{fmt(r.activeDays)}</td>
                  <td className="py-1.5 pr-3 text-right">{fmt(r.minutes)}</td>
                  <td className="py-1.5 pr-3 text-right">{fmt(r.features)}</td>
                  <td className="hidden py-1.5 pr-3 whitespace-nowrap sm:table-cell">{fmtDate(r.lastAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {!shown.length && <p className="text-label-2 py-6 text-center text-[14px]">Nadie coincide con el filtro.</p>}
        </div>
      )}
      <p className="text-label-2 mt-3 text-[12px]">
        {rows ? `${shown.length} de ${rows.length} cuentas · ` : ''}Toca un nombre para ver todo lo que usa y con qué profesores trabaja.
      </p>
    </Card>
  );
}

// --------------------------------------------------------------- detail ----
function ctxText(c: StudentContext) {
  const kind = KIND_LABEL[c.kind ?? ''] ?? 'Contexto';
  return `${kind}${c.teacherName ? ` de ${c.teacherName}` : ''}`;
}

function Detail({ student, days, onBack }: { student: StudentRow; days: number; onBack: () => void }) {
  const [feat, setFeat] = useState<StudentFeature[] | null>(null);
  const [daily, setDaily] = useState<StudentDay[]>([]);
  const [line, setLine] = useState<TimelineEvent[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const [f, d, t] = await Promise.all([
        fetchStudentDetail(student.id, days),
        fetchStudentDaily(student.id, days),
        fetchStudentTimeline(student.id, days, 100),
      ]);
      setFeat(f);
      setDaily(d);
      setLine(t);
    } catch (e) {
      setError((e as Error).message);
    }
  }, [student.id, days]);

  useEffect(() => {
    setFeat(null);
    void load();
  }, [load]);

  const all = useMemo(
    () => (feat ? withInventory(feat).sort((a, b) => b.minutes - a.minutes || b.opens - a.opens || b.events - a.events || featureDef(a.feature).label.localeCompare(featureDef(b.feature).label, 'es')) : []),
    [feat],
  );
  const contexts = useMemo(() => {
    const m = new Map<string, { c: StudentContext; features: Set<string>; n: number }>();
    for (const f of feat ?? [])
      for (const c of f.contexts) {
        const k = `${c.kind}|${c.teacherId ?? ''}`;
        const e = m.get(k) ?? { c, features: new Set<string>(), n: 0 };
        e.features.add(featureDef(f.feature).label);
        e.n += c.n;
        m.set(k, e);
      }
    return [...m.values()].sort((a, b) => Number(b.c.other) - Number(a.c.other) || b.n - a.n);
  }, [feat]);

  const max = Math.max(1, ...all.map((r) => r.minutes));
  const used = all.filter((r) => r.events > 0).length;

  return (
    <div className="space-y-5" data-testid="student-detail">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="gray" size="sm" onClick={onBack} aria-label="Volver a la lista">
            <ArrowLeft size={15} /> Estudiantes
          </Button>
          <span className="bg-fill-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full" aria-hidden>
            <UserRound size={22} className="text-label-2" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-title-3 truncate">{label(student)}</h2>
            <p className="text-label-2 truncate text-[13px]">
              {student.email}
              {student.teacher ? ` · Profesor: ${student.teacher}` : ''}
              {student.classCode ? ` · Clase ${student.classCode}` : ''}
            </p>
          </div>
          <Button variant="gray" size="sm" disabled={!feat} onClick={() => feat && save(`uso-${label(student).replace(/\W+/g, '-').toLowerCase()}-${days}d`, studentDetailToCsv(label(student), all, days))}>
            <Download size={15} /> Exportar CSV
          </Button>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ['Días activos', fmt(student.activeDays)],
            ['Minutos', fmt(student.minutes)],
            ['Herramientas', `${used} / ${all.length || '…'}`],
            ['Último uso', fmtDate(student.lastAt)],
          ].map(([k, v]) => (
            <div key={k} className="bg-fill-2 rounded-[12px] px-3 py-2">
              <dt className="text-label-2 text-[12px]">{k}</dt>
              <dd className="text-[20px] font-bold tabular-nums">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      {error && (
        <Card className="text-ink-red p-4" role="alert">
          {error}
        </Card>
      )}
      {!feat && !error && <Spinner className="mx-auto my-10 h-7 w-7" />}

      {feat && (
        <>
          <Card className="p-4 sm:p-5">
            <h3 className="text-title-3 mb-1">Herramientas que usa</h3>
            <p className="text-label-2 mb-3 text-[13px]">Minutos activos en los últimos {days} días. Las de 0 son las que no ha tocado.</p>
            <ul className="space-y-2" aria-label="Uso por funcionalidad de este estudiante">
              {all.map((r) => {
                const d = featureDef(r.feature);
                const c = categoryOf(d.category);
                const others = r.contexts.filter((x) => x.other);
                return (
                  <li
                    key={r.feature}
                    title={`${d.label}: ${fmt(r.opens)} aperturas · ${fmt(r.minutes)} min · último uso ${fmtDate(r.lastAt)}`}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(150px,240px)_minmax(0,1fr)_auto]"
                  >
                    <span className="flex min-w-0 items-center gap-1.5 text-[14px]">
                      <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
                      <span className={cn('truncate', r.events === 0 && 'text-label-2')}>{d.label}</span>
                      {others.length > 0 && (
                        <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--orange)_18%,transparent)] px-1.5 text-[10px] font-semibold text-ink-orange">otro prof.</span>
                      )}
                    </span>
                    <span className="text-[13px] font-semibold tabular-nums sm:order-3 sm:w-28 sm:text-right">
                      {fmt(r.minutes)} min
                      <span className="text-label-2 ml-1 text-[11px] font-normal">· {fmt(r.opens)} ap.</span>
                    </span>
                    <span className="bg-fill-2 col-span-2 h-3 overflow-hidden rounded-full sm:order-2 sm:col-span-1" aria-hidden>
                      <span className="block h-full rounded-full" style={{ width: r.minutes > 0 ? `max(${(r.minutes / max) * 100}%, 6px)` : r.events > 0 ? '6px' : 0, background: c.color }} />
                    </span>
                  </li>
                );
              })}
            </ul>
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="p-4 sm:p-5">
              <h3 className="text-title-3 mb-1">Profesores y contextos</h3>
              <p className="text-label-2 mb-3 text-[13px]">Muros, juegos en vivo y tareas donde ha entrado, también de otros profesores.</p>
              {contexts.length === 0 ? (
                <p className="text-label-2 text-[14px]">Sin contexto de clase en este periodo (solo trabajo individual).</p>
              ) : (
                <ul className="space-y-2">
                  {contexts.map((e) => (
                    <li key={`${e.c.kind}|${e.c.teacherId}`} className="flex items-start justify-between gap-3 text-[14px]">
                      <span className="min-w-0">
                        <span className="font-medium">{e.c.teacherName ?? (e.c.kind === 'room' ? 'Anfitrión desconocido' : KIND_LABEL[e.c.kind ?? ''] ?? 'Contexto')}</span>
                        {e.c.other && <span className="ml-1.5 rounded-full bg-[color-mix(in_srgb,var(--orange)_18%,transparent)] px-1.5 text-[10px] font-semibold text-ink-orange">otro profesor</span>}
                        <span className="text-label-2 block truncate text-[12px]">
                          {ctxText(e.c)} · {[...e.features].join(', ')}
                        </span>
                      </span>
                      <span className="text-label-2 shrink-0 tabular-nums">{fmt(e.n)} ev.</span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            <Card className="p-4 sm:p-5">
              <h3 className="text-title-3 mb-3">Actividad diaria (minutos)</h3>
              <DayBars data={daily} />
            </Card>
          </div>

          <Card className="p-4 sm:p-5">
            <h3 className="text-title-3 mb-3">Cronología reciente</h3>
            {line.length === 0 ? (
              <p className="text-label-2 text-[14px]">Sin eventos en este periodo.</p>
            ) : (
              <ol className="divide-y divide-separator/60" aria-label="Eventos recientes">
                {line.map((e) => (
                  <li key={e.id} className="flex flex-wrap items-baseline gap-x-3 gap-y-0.5 py-1.5 text-[13px]">
                    <span className="text-label-2 w-[108px] shrink-0 tabular-nums">{fmtDateTime(e.at)}</span>
                    <span className="min-w-0 flex-1 font-medium">
                      {featureDef(e.feature).label} <span className="text-label-2 font-normal">· {e.action}</span>
                    </span>
                    {e.context && (
                      <span className={cn('max-w-full truncate text-[12px]', e.other ? 'text-ink-orange font-medium' : 'text-label-2')}>{e.context}</span>
                    )}
                  </li>
                ))}
              </ol>
            )}
          </Card>
        </>
      )}
    </div>
  );
}

function DayBars({ data }: { data: StudentDay[] }) {
  const [hover, setHover] = useState<number | null>(null);
  if (!data.length) return <p className="text-label-2 text-[14px]">Sin datos.</p>;
  const W = 480;
  const H = 150;
  const B = 22;
  const max = Math.max(1, ...data.map((d) => d.minutes));
  const bw = W / data.length;
  const every = Math.max(1, Math.ceil(data.length / 6));
  const lab = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });
  const h = hover != null ? data[hover] : null;
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Minutos por día: máximo ${fmt(max)}`} onPointerLeave={() => setHover(null)}>
        <line x1={0} x2={W} y1={H - B} y2={H - B} stroke="var(--separator)" />
        {data.map((d, i) => {
          const bh = d.minutes > 0 || d.events > 0 ? Math.max(3, (d.minutes / max) * (H - B - 8)) : 0;
          return (
            <g key={d.day} onPointerEnter={() => setHover(i)} onPointerDown={() => setHover(i)}>
              <rect x={i * bw} y={0} width={bw} height={H - B} fill="transparent" />
              <rect x={i * bw + bw * 0.15} y={H - B - bh} width={Math.max(1, bw * 0.7)} height={bh} rx={2} fill={hover === i ? 'var(--pink)' : 'var(--blue)'} />
              {i % every === 0 && (
                <text x={i * bw + bw / 2} y={H - 6} textAnchor="middle" fontSize={10} fill="var(--label-2)">
                  {lab(d.day)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <p className="text-label-2 mt-1 min-h-[18px] text-[12px]" role="status">
        {h ? `${lab(h.day)}: ${fmt(h.minutes)} min · ${fmt(h.events)} eventos` : `Total: ${fmt(data.reduce((t, d) => t + d.minutes, 0))} min · ${data.filter((d) => d.events > 0).length} días con actividad`}
      </p>
    </div>
  );
}
