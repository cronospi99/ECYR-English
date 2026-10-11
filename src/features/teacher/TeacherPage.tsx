import { useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Award,
  BookOpen,
  CalendarRange,
  ChevronRight,
  Copy,
  Dumbbell,
  FileUp,
  FolderOpen,
  Gamepad2,
  GraduationCap,
  ImageIcon,
  Headphones,
  Mic,
  PenLine,
  RefreshCw,
  School,
  Search,
  Sigma,
  Sparkles,
  Users,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { IconTile } from '@/components/ui/IconTile';
import { LevelChip, Spinner, Toggle, EmptyState } from '@/components/ui/Misc';
import { Avatar } from '@/components/layout/Avatar';
import { useSettings } from '@/store/settings';
import { currentLevel, unitsDone, xpLevel } from '@/store/progress';
import { evaluatePlan } from '@/lib/planner';
import { LEVELS } from '@/content/levels';
import { GAMES, MODULES } from '@/content/catalog';
import { relativeTime } from '@/lib/date';
import type { StudentData } from '@/lib/teacher';
import { cn } from '@/lib/cn';
import { useClass } from './useClass';
import { AssignmentsManager } from '@/features/tasks/teacher';

type Tab = 'class' | 'tasks' | 'material' | 'practice';
type Sort = 'name' | 'recent' | 'xp' | 'level';

export default function TeacherPage() {
  const { isTeacher, classCode, students, error, loading, reload } = useClass();
  const [params, setParams] = useSearchParams();
  const tab: Tab = (['tasks', 'material', 'practice'] as const).find((t) => t === params.get('tab')) ?? 'class';

  if (!isTeacher)
    return (
      <Page title="Sala del docente">
        <Card className="mx-auto max-w-xl p-6 text-center">
          <School size={40} className="text-ios-orange mx-auto" />
          <h2 className="text-title-3 mt-3">Solo para docentes</h2>
          <p className="text-label-2 mt-1">
            Entra con una cuenta de docente para ver el progreso de tu clase, el material completo y tu espacio de práctica libre.
          </p>
          <ButtonLink to="/profile" className="mt-4">
            Ir a mi perfil
          </ButtonLink>
        </Card>
      </Page>
    );

  return (
    <Page
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <School size={15} className="text-ios-orange" /> Docente
        </span>
      }
      title="Sala del docente"
      subtitle="El progreso de tu clase, todo el material sin restricciones y tu propio espacio para practicar."
      wide
    >
      <div className="no-scrollbar mb-5 overflow-x-auto">
        <Segmented<Tab>
          value={tab}
          onChange={(t) => setParams(t === 'class' ? {} : { tab: t })}
          options={[
            { value: 'class', label: 'Mi clase' },
            { value: 'tasks', label: 'Tareas' },
            { value: 'material', label: 'Material' },
            { value: 'practice', label: 'Práctica libre' },
          ]}
        />
      </div>
      {tab === 'class' && <ClassTab classCode={classCode} students={students} error={error} loading={loading} reload={reload} />}
      {tab === 'tasks' && <AssignmentsManager />}
      {tab === 'material' && <MaterialTab />}
      {tab === 'practice' && <PracticeTab />}
    </Page>
  );
}

// ------------------------------------------------------------- my class ----

function rowStats(s: StudentData) {
  const p = s.progress;
  const plan = s.plan?.current ? evaluatePlan(s.plan.current, p.activity, s.plan.manual) : null;
  const lastActivity = p.activity[0]?.at ?? null;
  return {
    level: currentLevel(p.units),
    xp: p.xp,
    rank: xpLevel(p.xp).rank,
    streak: p.streak.current,
    units: unitsDone(p.units),
    plan: plan ? Math.round(plan.ratio * 100) : null,
    games: s.games.filter((g) => g.status === 'valid').length,
    flagged: s.games.filter((g) => g.status === 'invalid').length,
    ielts: s.ielts.overall,
    last: lastActivity ?? s.syncedAt,
  };
}

function ClassTab({
  classCode,
  students,
  error,
  loading,
  reload,
}: {
  classCode: string | null;
  students: StudentData[] | null;
  error: string | null;
  loading: boolean;
  reload: () => Promise<void>;
}) {
  const [q, setQ] = useState('');
  const [sort, setSort] = useState<Sort>('recent');
  const [copied, setCopied] = useState(false);
  const rows = useMemo(() => {
    const list = (students ?? []).map((s) => ({ s, st: rowStats(s) }));
    const term = q.trim().toLowerCase();
    const f = term ? list.filter(({ s }) => `${s.profile.full_name ?? ''} ${s.profile.email ?? ''}`.toLowerCase().includes(term)) : list;
    const lv = (l: string) => LEVELS.findIndex((x) => x.id === l);
    return f.sort((a, b) =>
      sort === 'name'
        ? (a.s.profile.full_name ?? '').localeCompare(b.s.profile.full_name ?? '')
        : sort === 'xp'
          ? b.st.xp - a.st.xp
          : sort === 'level'
            ? lv(b.st.level) - lv(a.st.level) || b.st.xp - a.st.xp
            : (b.st.last ?? '').localeCompare(a.st.last ?? ''),
    );
  }, [students, q, sort]);

  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const all = (students ?? []).map(rowStats);
  const active = all.filter((r) => r.last && r.last >= weekAgo).length;
  const flagged = all.reduce((n, r) => n + r.flagged, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4">
          <div className="text-label-2 text-[13px] font-medium">Código de clase</div>
          <div className="mt-1 flex items-center gap-2">
            <span className="font-mono text-[24px] font-bold tracking-[0.18em]">{classCode ?? '—'}</span>
            {classCode && (
              <button
                type="button"
                className="text-ios-blue rounded-full p-1.5 hover:bg-fill-2"
                aria-label="Copiar código"
                onClick={() => {
                  void navigator.clipboard?.writeText(classCode);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
              >
                <Copy size={16} />
              </button>
            )}
          </div>
          <div className="text-label-2 text-[12px]">{copied ? '¡Copiado!' : 'Tus estudiantes lo usan en Perfil → Unirme a una clase'}</div>
        </Card>
        <Kpi icon={Users} color="var(--blue)" label="Estudiantes" value={String(students?.length ?? 0)} />
        <Kpi icon={CalendarRange} color="var(--green)" label="Activos esta semana" value={String(active)} />
        <Kpi icon={AlertTriangle} color="var(--orange)" label="Resultados por revisar" value={String(flagged)} hint="Partidas que no pasaron la validación" />
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center gap-2 p-3">
          <label className="bg-fill-2 flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[11px] px-3">
            <Search size={16} className="text-label-2 shrink-0" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Buscar estudiante"
              className="placeholder:text-label-3 min-w-0 flex-1 bg-transparent text-[16px] outline-none"
              aria-label="Buscar estudiante"
            />
          </label>
          <Segmented<Sort>
            size="sm"
            value={sort}
            onChange={setSort}
            options={[
              { value: 'recent', label: 'Recientes' },
              { value: 'name', label: 'Nombre' },
              { value: 'xp', label: 'XP' },
              { value: 'level', label: 'Nivel' },
            ]}
          />
          <Button variant="gray" size="sm" onClick={() => void reload()} disabled={loading} aria-label="Actualizar">
            {loading ? <Spinner className="h-4 w-4" /> : <RefreshCw size={15} />}
          </Button>
        </div>
        {error && <p className="text-ios-red px-4 pb-3 text-[13px]">{error}</p>}
        {students === null ? (
          <div className="text-label-2 flex items-center justify-center gap-2 py-12">
            <Spinner className="h-5 w-5" /> Cargando tu clase…
          </div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<Users size={44} />}
            title={students.length ? 'Sin coincidencias' : 'Aún no hay estudiantes'}
            body={students.length ? undefined : 'Comparte tu código de clase. Cuando se unan, aquí verás su progreso.'}
          />
        ) : (
          <ul className="border-separator divide-separator divide-y border-t">
            {rows.map(({ s, st }) => (
              <li key={s.profile.id}>
                <Link to={`/teacher/student/${s.profile.id}`} className="hover:bg-fill-2 flex items-center gap-3 px-4 py-3 transition-colors">
                  <Avatar name={s.profile.full_name ?? s.profile.email ?? '?'} config={s.avatar} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-[16px] font-semibold">{s.profile.full_name || s.profile.email}</span>
                      <LevelChip level={st.level} />
                      {st.flagged > 0 && (
                        <span className="text-ios-orange inline-flex items-center gap-0.5 text-[12px] font-semibold" title="Resultados no válidos">
                          <AlertTriangle size={13} /> {st.flagged}
                        </span>
                      )}
                    </div>
                    <div className="text-label-2 mt-0.5 flex flex-wrap gap-x-3 gap-y-0.5 text-[12px]">
                      <span>{st.xp} XP · Nv. {st.rank}</span>
                      <span>{st.units} unidades</span>
                      <span>🔥 {st.streak} d</span>
                      {st.plan != null && <span>Plan {st.plan}%</span>}
                      {st.ielts != null && <span>IELTS {st.ielts.toFixed(1)}</span>}
                      <span>{st.games} partidas</span>
                      <span>{st.last ? `activo ${relativeTime(st.last)}` : 'sin actividad'}</span>
                    </div>
                  </div>
                  <ChevronRight size={18} className="text-label-3 shrink-0" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}

function Kpi({ icon, color, label, value, hint }: { icon: LucideIcon; color: string; label: string; value: string; hint?: string }) {
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <IconTile icon={icon} color={color} size={26} />
        <span className="text-label-2 text-[13px] font-medium">{label}</span>
      </div>
      <div className="mt-1.5 text-[26px] font-bold tabular-nums">{value}</div>
      {hint && <div className="text-label-3 text-[11px]">{hint}</div>}
    </Card>
  );
}

// ------------------------------------------------------------- material ----

interface Item {
  to: string;
  title: string;
  sub: string;
  icon: LucideIcon;
  color: string;
}

function MaterialTab() {
  const groups: { title: string; items: Item[] }[] = [
    {
      title: 'Cursos por nivel',
      items: [
        { to: '/learn/foundations', title: 'English Foundations', sub: 'A1 · curso de cómic', icon: BookOpen, color: 'var(--red)' },
        ...LEVELS.map((l) => ({ to: `/learn/${l.id.toLowerCase()}`, title: `${l.id} · ${l.book}`, sub: `${l.units} unidades · ${l.nameEs}`, icon: GraduationCap, color: l.color })),
      ],
    },
    {
      title: 'Gramática y herramientas',
      items: [
        { to: '/learn/grammar/time-machine', title: 'Time Machine', sub: 'Fechas, años y pasado', icon: Sigma, color: 'var(--teal)' },
        { to: '/learn/grammar/time-family', title: 'Time & Family', sub: 'La hora y el genitivo', icon: Sigma, color: 'var(--mint)' },
        { to: '/learn/grammar/modals', title: 'Modal Verbs', sub: 'Modales y semi-modales', icon: Sigma, color: 'var(--yellow)' },
        { to: '/practice/verbs', title: 'Verb Lab', sub: '750 verbos, -ed, patrones', icon: Wrench, color: 'var(--orange)' },
        { to: '/learn/visuals', title: 'Biblioteca visual', sub: 'Infografías para proyectar', icon: ImageIcon, color: 'var(--pink)' },
      ],
    },
    {
      title: 'Práctica por destreza',
      items: [
        { to: '/practice/reading', title: 'Reading', sub: 'Historias y guías de viaje', icon: BookOpen, color: 'var(--skill-reading)' },
        { to: '/practice/listening', title: 'Listening', sub: 'Diálogos A1–C1 y dictado', icon: Headphones, color: 'var(--skill-listening)' },
        { to: '/practice/speaking', title: 'Speaking', sub: '3.600+ preguntas', icon: Mic, color: 'var(--skill-speaking)' },
        { to: '/practice/writing', title: 'Writing', sub: 'Tareas con feedback', icon: PenLine, color: 'var(--skill-writing)' },
        { to: '/practice/phrasal-verbs', title: 'Phrasal Verbs', sub: '487 con quiz', icon: Dumbbell, color: 'var(--pink)' },
      ],
    },
    {
      title: 'Juegos y dinámicas de clase',
      items: GAMES.map((g) => ({ to: `/play/${g.slug}`, title: g.title, sub: g.mode === 'class' ? 'Dinámica grupal' : g.subtitle, icon: Gamepad2, color: g.accent })),
    },
    {
      title: 'Libros interactivos',
      items: MODULES.filter((m) => m.kind === 'book').map((m) => ({ to: `/play/${m.slug}`, title: m.title, sub: m.subtitle, icon: BookOpen, color: m.accent })),
    },
    {
      title: 'IELTS y herramientas docentes',
      items: [
        { to: '/ielts', title: 'IELTS Simulator', sub: 'Mock tests y práctica', icon: Award, color: 'var(--indigo)' },
        { to: '/ielts/class', title: 'Mi clase (IELTS)', sub: 'Tareas, comentarios e historial', icon: Users, color: 'var(--green)' },
        { to: '/ielts/descriptors', title: 'Descriptores de banda', sub: 'Criterios oficiales', icon: Award, color: 'var(--label-2)' },
        { to: '/coach', title: 'AI Coach', sub: 'Conversación y corrección', icon: Sparkles, color: 'var(--purple)' },
        { to: '/plan', title: 'Planes semanales', sub: 'Genera planes de estudio', icon: CalendarRange, color: 'var(--indigo)' },
        { to: '/portfolio', title: 'Mis trabajos', sub: 'Archivos y escritos', icon: FolderOpen, color: 'var(--teal)' },
        { to: '/import', title: 'Importar y migrar', sub: 'IELTS Simulator y archivos', icon: FileUp, color: 'var(--indigo)' },
      ],
    },
  ];
  return (
    <div className="space-y-7">
      {groups.map((g) => (
        <section key={g.title}>
          <h2 className="text-title-3 mb-3 px-1">{g.title}</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {g.items.map((i) => (
              <Link key={i.to + i.title} to={i.to} className="bg-card shadow-card flex items-center gap-3 rounded-[16px] p-3 transition-transform active:scale-[0.98]">
                <IconTile icon={i.icon} color={i.color} size={38} />
                <span className="min-w-0">
                  <span className="block truncate text-[15px] font-semibold">{i.title}</span>
                  <span className="text-label-2 block truncate text-[12px]">{i.sub}</span>
                </span>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}

// ------------------------------------------------------- free practice ----

function PracticeTab() {
  const sandbox = useSettings((s) => s.practiceSandbox);
  const set = useSettings((s) => s.set);
  return (
    <div className="space-y-5">
      <Card className={cn('p-5', sandbox && 'shadow-[inset_0_0_0_2px_var(--orange)]')}>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-title-3">Modo práctica libre</h2>
            <p className="text-label-2 mt-1 max-w-prose text-[15px]">
              Prueba cualquier lección, quiz, juego o simulacro como lo haría un estudiante, sin que se guarde nada: no suma XP, no marca
              unidades, no registra partidas ni afecta tus estadísticas. Ideal para preparar una clase.
            </p>
          </div>
          <Toggle checked={sandbox} onChange={(v) => set({ practiceSandbox: v })} label="Modo práctica libre" />
        </div>
        <p className={cn('mt-3 text-[13px] font-semibold', sandbox ? 'text-ios-orange' : 'text-label-2')}>
          {sandbox ? 'Activo: verás un aviso arriba mientras practicas.' : 'Desactivado: tu actividad se registra normalmente.'}
        </p>
      </Card>
      <MaterialTab />
    </div>
  );
}
