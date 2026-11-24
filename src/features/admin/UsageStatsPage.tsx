import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { BarChart3, Clock, Download, Layers, RefreshCw, ShieldCheck, Users, type LucideIcon } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner } from '@/components/ui/Misc';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/cn';
import { StudentUsage } from './StudentUsage';
import { categoryOf, CATEGORIES } from '@/lib/usageFeatures';
import {
  UsageMissingError,
  byCategory,
  fetchBaseline,
  fetchByRole,
  fetchDaily,
  fetchOverview,
  fetchSummary,
  mergeRows,
  toCsv,
  type BaselineStat,
  type DayStat,
  type FeatureRow,
  type Overview,
} from '@/lib/usageStats';

type Metric = 'users' | 'minutes' | 'opens';
const METRICS: { value: Metric; label: string; unit: string }[] = [
  { value: 'users', label: 'Usuarios', unit: 'usuarios' },
  { value: 'minutes', label: 'Minutos', unit: 'min' },
  { value: 'opens', label: 'Aperturas', unit: 'aperturas' },
];
const RANGES = [
  { value: '7', label: '7 días' },
  { value: '30', label: '30 días' },
  { value: '90', label: '90 días' },
] as const;

const nf = new Intl.NumberFormat('es');
const fmt = (n: number) => nf.format(Math.round(n * 10) / 10);
const fmtDate = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString('es', { day: 'numeric', month: 'short', year: '2-digit' }) : '—');

export default function UsageStatsPage() {
  const { ready, session, profile } = useAuth();
  const loading = !ready || (session && !profile);
  if (!profile?.is_admin)
    return (
      <Page title="Estadísticas de uso">
        <Card className="mx-auto max-w-xl p-6 text-center">
          {loading ? <Spinner className="mx-auto h-8 w-8" /> : <ShieldCheck size={40} className="text-ink-purple mx-auto" />}
          <h2 className="text-title-3 mt-3">Solo para la cuenta dueña</h2>
          <p className="text-label-2 mt-1">Aquí se ve qué funcionalidades usa la gente, para decidir cuáles conservar.</p>
          <ButtonLink to="/profile" className="mt-4">
            Ir a mi perfil
          </ButtonLink>
        </Card>
      </Page>
    );
  return <Stats />;
}

function Stats() {
  const [days, setDays] = useState<'7' | '30' | '90'>('30');
  const [view, setView] = useState<'features' | 'students'>('features');
  const [metric, setMetric] = useState<Metric>('users');
  const [rows, setRows] = useState<FeatureRow[] | null>(null);
  const [overview, setOverview] = useState<Overview | null>(null);
  const [daily, setDaily] = useState<DayStat[]>([]);
  const [dailyFeature, setDailyFeature] = useState<DayStat[] | null>(null);
  const [feature, setFeature] = useState('');
  const [missing, setMissing] = useState(false);
  const [tick, setTick] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(true);
  const n = Number(days);

  const load = useCallback(async () => {
    setBusy(true);
    setError(null);
    setMissing(false);
    try {
      const [summary, roles, ov, d, base] = await Promise.all([
        fetchSummary(n),
        fetchByRole(n),
        fetchOverview(n),
        fetchDaily(n, null),
        fetchBaseline() as Promise<BaselineStat[]>,
      ]);
      setRows(mergeRows(summary, roles, base));
      setOverview(ov);
      setDaily(d);
    } catch (e) {
      if (e instanceof UsageMissingError) setMissing(true);
      else setError((e as Error).message);
      setRows(null);
    } finally {
      setBusy(false);
    }
  }, [n]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!feature || missing) {
      setDailyFeature(null);
      return;
    }
    let live = true;
    fetchDaily(n, feature)
      .then((d) => live && setDailyFeature(d))
      .catch(() => live && setDailyFeature(null));
    return () => {
      live = false;
    };
  }, [feature, n, missing]);

  const value = useCallback((r: FeatureRow) => (metric === 'users' ? r.users : metric === 'minutes' ? r.minutes : r.opens), [metric]);
  const sorted = useMemo(() => (rows ? [...rows].sort((a, b) => value(b) - value(a) || b.users - a.users || a.label.localeCompare(b.label, 'es')) : []), [rows, value]);
  const byUsers = useMemo(() => (rows ? [...rows].sort((a, b) => b.users - a.users || b.minutes - a.minutes || a.label.localeCompare(b.label, 'es')) : []), [rows]);
  const used = rows?.filter((r) => r.events > 0).length ?? 0;
  const top = byUsers.filter((r) => r.users > 0).slice(0, 10);
  const least = [...byUsers].reverse().slice(0, 10);
  const cats = useMemo(() => (rows ? byCategory(rows) : []), [rows]);

  const download = () => {
    if (!rows) return;
    const blob = new Blob([toCsv(byUsers, n)], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `uso-ecyr-${n}d-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  };

  return (
    <Page
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck size={15} className="text-ink-purple" /> Admin
        </span>
      }
      title="Estadísticas de uso"
      subtitle="Qué funcionalidades se usan de verdad, para decidir cuáles conservar y cuáles quitar."
      back={{ to: '/profile', label: 'Perfil' }}
      wide
      actions={
        <Button variant="gray" size="sm" onClick={() => {
            setTick((t) => t + 1);
            void load();
          }}
          aria-label="Actualizar" disabled={busy}>
          <RefreshCw size={15} className={cn(busy && 'animate-spin')} /> <span className="hidden sm:inline">Actualizar</span>
        </Button>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented value={view} onChange={setView} options={[{ value: 'features', label: 'Funcionalidades' }, { value: 'students', label: 'Por estudiante' }]} />
        <Segmented value={days} onChange={setDays} options={[...RANGES]} />
        <span className="text-label-2 text-[13px]">Excluye cuentas sin sesión. Los minutos cuentan solo con la pestaña visible.</span>
      </div>

      {missing && view === 'features' && (
        <Card className="mx-auto max-w-2xl p-6 text-center">
          <BarChart3 size={40} className="text-ink-purple mx-auto" />
          <h2 className="text-title-3 mt-3">Aún no hay datos de uso</h2>
          <p className="text-label-2 mt-1">
            Falta crear la tabla. Aplica <code className="font-mono">supabase/migrations/23_usage_analytics.sql</code> y <code className="font-mono">24_usage_by_student.sql</code> en Supabase, SQL Editor, y pulsa Actualizar.
          </p>
        </Card>
      )}
      {error && view === 'features' && (
        <Card className="text-ink-red p-4" role="alert">
          {error}
        </Card>
      )}
      {view === 'features' && busy && !rows && !missing && !error && <Spinner className="mx-auto my-16 h-8 w-8" />}

      {view === 'students' && <StudentUsage days={n} refresh={tick} />}

      {view === 'features' && rows && overview && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Kpi icon={Users} color="var(--blue)" value={fmt(overview.students)} label="alumnos activos" hint={`de ${fmt(overview.total_students)} · ${fmt(overview.teachers)} docentes activos`} />
            <Kpi icon={Layers} color="var(--green)" value={`${used} / ${rows.length}`} label="funcionalidades usadas" hint={`${rows.length - used} sin uso en ${n} días`} />
            <Kpi icon={Clock} color="var(--orange)" value={fmt(overview.minutes)} label="minutos totales" hint={`${fmt(overview.events)} eventos registrados`} />
          </div>

          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-title-3">Uso por funcionalidad</h2>
              <Segmented value={metric} onChange={setMetric} options={METRICS.map((m) => ({ value: m.value, label: m.label }))} size="sm" />
            </div>
            <Legend />
            <BarList rows={sorted} metric={metric} value={value} />
          </Card>

          <div className="grid gap-5 lg:grid-cols-2">
            <RankCard title="Más usadas" rows={top} empty="Todavía nadie ha usado nada en este periodo." />
            <RankCard title="Menos usadas" rows={least} empty="Sin datos." hint="Candidatas a quitar o a promocionar." />
          </div>

          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-title-3">Actividad diaria (usuarios activos)</h2>
              <label className="text-label-2 flex items-center gap-2 text-[14px]">
                Comparar con
                <select
                  value={feature}
                  onChange={(e) => setFeature(e.target.value)}
                  className="bg-fill-2 text-label h-9 max-w-[220px] rounded-[9px] px-2 text-[14px]"
                  aria-label="Funcionalidad a comparar"
                >
                  <option value="">Ninguna</option>
                  {[...rows].sort((a, b) => a.label.localeCompare(b.label, 'es')).map((r) => (
                    <option key={r.feature} value={r.feature}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <LineChart total={daily} second={dailyFeature} secondLabel={rows.find((r) => r.feature === feature)?.label} />
          </Card>

          <Card className="p-4 sm:p-5">
            <h2 className="text-title-3 mb-3">Por categoría</h2>
            <CategoryBars cats={cats} />
          </Card>

          <Card className="p-4 sm:p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-title-3">Tabla completa</h2>
              <Button variant="gray" size="sm" onClick={download}>
                <Download size={15} /> Exportar CSV
              </Button>
            </div>
            <FeatureTable rows={byUsers} />
            <p className="text-label-2 mt-3 text-[12px]">
              Histórico (estimado): usuarios distintos que ya aparecen en las tablas anteriores (progreso, tareas, IA, portafolio…). Solo orientativo: el progreso guarda las últimas actividades de cada alumno.
            </p>
          </Card>
        </div>
      )}
    </Page>
  );
}

function Kpi({ icon: Icon, color, value, label, hint }: { icon: LucideIcon; color: string; value: string; label: string; hint?: string }) {
  return (
    <Card className="flex items-center gap-3 p-4">
      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[12px]" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)`, color }}>
        <Icon size={22} aria-hidden />
      </span>
      <div className="min-w-0">
        <div className="text-[26px] leading-none font-bold tabular-nums">{value}</div>
        <div className="text-label text-[14px] font-medium">{label}</div>
        {hint && <div className="text-label-2 truncate text-[12px]">{hint}</div>}
      </div>
    </Card>
  );
}

function Legend() {
  return (
    <ul className="mb-3 flex flex-wrap gap-x-3 gap-y-1" aria-label="Categorías">
      {CATEGORIES.map((c) => (
        <li key={c.id} className="text-label-2 flex items-center gap-1.5 text-[12px]">
          <span className="h-2.5 w-2.5 rounded-full" style={{ background: c.color }} aria-hidden /> {c.label}
        </li>
      ))}
    </ul>
  );
}

function BarList({ rows, metric, value }: { rows: FeatureRow[]; metric: Metric; value: (r: FeatureRow) => number }) {
  const max = Math.max(1, ...rows.map(value));
  const unit = METRICS.find((m) => m.value === metric)!.unit;
  return (
    <ul className="space-y-2" aria-label={`Funcionalidades ordenadas por ${unit}`}>
      {rows.map((r) => {
        const v = value(r);
        const c = categoryOf(r.category);
        return (
          <li
            key={r.feature}
            title={`${r.label}: ${fmt(r.users)} usuarios · ${fmt(r.minutes)} min · ${fmt(r.opens)} aperturas · último uso ${fmtDate(r.last_at)}`}
            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-1 sm:grid-cols-[minmax(150px,240px)_minmax(0,1fr)_auto]"
          >
            <span className="flex min-w-0 items-center gap-1.5 text-[14px]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: c.color }} aria-hidden />
              <span className={cn('truncate', v === 0 && 'text-label-2')}>{r.label}</span>
            </span>
            <span className="text-[13px] font-semibold tabular-nums sm:order-3 sm:w-24 sm:text-right">
              {fmt(v)}
              {r.histUsers > 0 && v === 0 && <span className="text-label-2 ml-1 text-[11px] font-normal">hist. ~{r.histUsers}</span>}
            </span>
            <span className="bg-fill-2 col-span-2 h-3 overflow-hidden rounded-full sm:order-2 sm:col-span-1" aria-hidden>
              <span className="block h-full rounded-full" style={{ width: v > 0 ? `max(${(v / max) * 100}%, 6px)` : 0, background: c.color }} />
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function RankCard({ title, rows, empty, hint }: { title: string; rows: FeatureRow[]; empty: string; hint?: string }) {
  return (
    <Card className="p-4 sm:p-5">
      <h2 className="text-title-3">{title}</h2>
      {hint && <p className="text-label-2 text-[13px]">{hint}</p>}
      {rows.length === 0 ? (
        <p className="text-label-2 mt-3 text-[14px]">{empty}</p>
      ) : (
        <ol className="mt-3 space-y-1.5">
          {rows.map((r, i) => (
            <li key={r.feature} className="flex items-center gap-2 text-[14px]">
              <span className="text-label-2 w-5 text-right tabular-nums">{i + 1}</span>
              <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: categoryOf(r.category).color }} aria-hidden />
              <span className="min-w-0 flex-1 truncate">{r.label}</span>
              <span className="text-label-2 shrink-0 tabular-nums">
                {fmt(r.users)} usr · {fmt(r.minutes)} min
              </span>
            </li>
          ))}
        </ol>
      )}
    </Card>
  );
}

function CategoryBars({ cats }: { cats: ReturnType<typeof byCategory> }) {
  const max = Math.max(1, ...cats.map((c) => c.minutes));
  return (
    <ul className="space-y-3">
      {cats.map((c) => (
        <li key={c.id}>
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 text-[14px]">
            <span className="font-semibold">
              <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full" style={{ background: c.color }} aria-hidden />
              {c.label}
            </span>
            <span className="text-label-2 text-[13px] tabular-nums">
              {c.used}/{c.total} usadas · {fmt(c.minutes)} min · {fmt(c.opens)} aperturas
            </span>
          </div>
          <div className="bg-fill-2 mt-1 h-2.5 overflow-hidden rounded-full" aria-hidden>
            <div className="h-full rounded-full" style={{ width: c.minutes > 0 ? `max(${(c.minutes / max) * 100}%, 6px)` : 0, background: c.color }} />
          </div>
        </li>
      ))}
    </ul>
  );
}

function niceMax(v: number) {
  if (v <= 5) return 5;
  const p = 10 ** Math.floor(Math.log10(v));
  return Math.ceil(v / p) * p;
}

function LineChart({ total, second, secondLabel }: { total: DayStat[]; second: DayStat[] | null; secondLabel?: string }) {
  const W = 640;
  const H = 230;
  const L = 34;
  const R = 10;
  const T = 10;
  const B = 26;
  const [hover, setHover] = useState<number | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const pts = total.length;
  if (!pts) return <p className="text-label-2 text-[14px]">Sin datos en este periodo.</p>;
  const max = niceMax(Math.max(1, ...total.map((d) => d.users), ...(second ?? []).map((d) => d.users)));
  const x = (i: number) => L + (pts === 1 ? 0 : (i / (pts - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  const path = (s: DayStat[]) => s.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(d.users).toFixed(1)}`).join(' ');
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(max * f));
  const every = Math.max(1, Math.ceil(pts / 6));
  const label = (iso: string) => new Date(iso + 'T12:00:00').toLocaleDateString('es', { day: 'numeric', month: 'short' });

  const onMove = (e: React.PointerEvent) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(pts - 1, Math.round(((px - L) / (W - L - R)) * (pts - 1)))));
  };
  const h = hover != null ? total[hover] : null;
  const h2 = hover != null && second ? second[hover] : null;

  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-4 text-[12px]">
        <li className="flex items-center gap-1.5">
          <span className="h-0.5 w-5 rounded" style={{ background: 'var(--blue)' }} aria-hidden /> Total
        </li>
        {second && (
          <li className="flex items-center gap-1.5">
            <span className="h-0.5 w-5 rounded" style={{ background: 'var(--pink)' }} aria-hidden /> {secondLabel}
          </li>
        )}
      </ul>
      <div ref={box} className="relative touch-pan-y" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Usuarios activos por día: máximo ${Math.max(...total.map((d) => d.users))}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={L} x2={W - R} y1={y(t)} y2={y(t)} stroke="var(--separator)" strokeWidth={1} />
              <text x={L - 6} y={y(t) + 4} textAnchor="end" fontSize={11} fill="var(--label-2)">
                {t}
              </text>
            </g>
          ))}
          {total.map((d, i) =>
            i % every === 0 ? (
              <text key={d.day} x={x(i)} y={H - 7} textAnchor="middle" fontSize={11} fill="var(--label-2)">
                {label(d.day)}
              </text>
            ) : null,
          )}
          <path d={path(total)} fill="none" stroke="var(--blue)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
          {second && <path d={path(second)} fill="none" stroke="var(--pink)" strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />}
          {hover != null && (
            <g>
              <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} stroke="var(--label-2)" strokeDasharray="3 3" />
              <circle cx={x(hover)} cy={y(total[hover]!.users)} r={4} fill="var(--blue)" />
              {second?.[hover] && <circle cx={x(hover)} cy={y(second[hover]!.users)} r={4} fill="var(--pink)" />}
            </g>
          )}
        </svg>
        {h && (
          <div
            className="material-strong pointer-events-none absolute top-1 rounded-[10px] px-2.5 py-1.5 text-[12px] shadow-float"
            style={{ left: `${(x(hover!) / W) * 100}%`, transform: `translateX(${hover! > pts / 2 ? '-105%' : '5%'})` }}
            role="status"
          >
            <div className="font-semibold">{label(h.day)}</div>
            <div>Total: {h.users} usuarios · {fmt(h.minutes)} min</div>
            {h2 && <div>{secondLabel}: {h2.users} usuarios</div>}
          </div>
        )}
      </div>
      <table className="sr-only">
        <caption>Usuarios activos por día</caption>
        <thead>
          <tr>
            <th>Día</th>
            <th>Usuarios</th>
          </tr>
        </thead>
        <tbody>
          {total.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{d.users}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function FeatureTable({ rows }: { rows: FeatureRow[] }) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <table className="w-full min-w-[720px] text-left text-[13px]">
        <thead className="text-label-2 text-[12px]">
          <tr className="border-b border-separator">
            <th className="py-2 pr-3 font-medium">Funcionalidad</th>
            <th className="py-2 pr-3 font-medium">Categoría</th>
            <th className="py-2 pr-3 text-right font-medium">Usuarios</th>
            <th className="py-2 pr-3 text-right font-medium">Alumnos</th>
            <th className="py-2 pr-3 text-right font-medium">Docentes</th>
            <th className="py-2 pr-3 text-right font-medium">Aperturas</th>
            <th className="py-2 pr-3 text-right font-medium">Minutos</th>
            <th className="py-2 pr-3 font-medium">Último uso</th>
            <th className="py-2 text-right font-medium">Histórico (estimado)</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {rows.map((r) => (
            <tr key={r.feature} className={cn('border-b border-separator/60', r.events === 0 && 'text-label-2')}>
              <td className="py-1.5 pr-3 font-medium">{r.label}</td>
              <td className="py-1.5 pr-3">
                <span className="mr-1.5 inline-block h-2 w-2 rounded-full" style={{ background: categoryOf(r.category).color }} aria-hidden />
                {categoryOf(r.category).label}
              </td>
              <td className="py-1.5 pr-3 text-right">{fmt(r.users)}</td>
              <td className="py-1.5 pr-3 text-right">{fmt(r.studentUsers)}</td>
              <td className="py-1.5 pr-3 text-right">{fmt(r.teacherUsers)}</td>
              <td className="py-1.5 pr-3 text-right">{fmt(r.opens)}</td>
              <td className="py-1.5 pr-3 text-right">{fmt(r.minutes)}</td>
              <td className="py-1.5 pr-3 whitespace-nowrap">{fmtDate(r.last_at)}</td>
              <td className="py-1.5 text-right">{r.histUsers > 0 ? `~${fmt(r.histUsers)} usr · ${fmt(r.histEvents)}` : '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
