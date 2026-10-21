import { Link } from 'react-router-dom';
import { Award, BookOpen, Check, ChevronRight, ClipboardList, Flame, Gamepad2, Headphones, Mic, PenLine, Play, School, Sigma, Sparkles, Trophy, Zap } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Progress';
import { IconTile } from '@/components/ui/IconTile';
import { ButtonLink } from '@/components/ui/Button';
import { MountainClimb, SKY_VARS } from '@/components/mountain/MountainClimb';
import { useProgress, climbProgress, currentLevel, levelCompletion, xpLevel } from '@/store/progress';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { useNextUnit } from '@/hooks/useNextUnit';
import { GAMES } from '@/content/catalog';
import { LEVELS } from '@/content/levels';
import { CEFR_LEVELS } from '@/content/types';
import { dayKey, greeting } from '@/lib/date';
import { readIelts } from '@/lib/ielts';
import { WeekPlanCard } from '@/features/plan/WeekPlanCard';
import { TasksWidget } from '@/features/tasks/TasksWidget';
import { AssignButton } from '@/features/tasks/AssignButton';

export default function HomePage() {
  const p = useProgress();
  const profile = useAuth((s) => s.profile);
  const localName = useSettings((s) => s.name);
  const name = (profile?.full_name || localName || '').split(' ')[0];
  const level = currentLevel(p.units);
  const lvl = levelCompletion(p.units, level);
  const target = p.targetLevel;
  const levelsToGo = Math.max(0, CEFR_LEVELS.indexOf(target) - CEFR_LEVELS.indexOf(level));
  const climb = climbProgress(p.units);
  const rank = xpLevel(p.xp);
  const today = p.dailyXp[dayKey()] ?? 0;
  const next = useNextUnit();
  const nextTo = next.unit ? `/learn/${next.level.toLowerCase()}/${next.unit.n}` : '/learn';

  return (
    <Page
      eyebrow={`${greeting()}${name ? `, ${name}` : ''} 👋`}
      title={
        <>
          <span className="brand-text">Go For It!</span> 🏔️
        </>
      }
      subtitle="Tu escalada de A1 a C2, paso a paso."
      wide
    >
      <div className="space-y-5">
        {/* Hero: the mountain spans the full width, level and goal ride on top */}
        <Card className="relative overflow-hidden">
          <div className="relative" style={{ ...SKY_VARS, background: 'var(--sky-a)' }}>
            <div className="pointer-events-none relative px-4 pt-4 sm:absolute sm:top-0 sm:left-0 sm:p-6">
              <div className="text-label-2 text-[13px] font-medium sm:text-subhead">Tu nivel actual</div>
              <div className="mt-0.5 flex items-end gap-3">
                <span className="text-[52px] leading-[0.9] font-extrabold tracking-[-0.05em] sm:text-[80px]">{level}</span>
                <div className="pb-1 sm:pb-2">
                  <div className="text-[15px] font-semibold sm:text-headline">{LEVELS.find((l) => l.id === level)?.nameEs}</div>
                  <div className="text-label-2 text-[12px] sm:text-footnote">
                    {lvl.done}/{lvl.total} unidades
                  </div>
                </div>
              </div>
            </div>
            <MountainClimb wide progress={climb} />
          </div>
          <div className="border-separator flex flex-col gap-4 border-t p-4 sm:p-5 md:flex-row md:items-center md:gap-6">
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 text-[15px]">
                <span className="text-label-2">
                  Meta <span className="text-label font-bold">{target}</span>
                  <span className="mx-1.5">·</span>
                  {levelsToGo > 0
                    ? `${levelsToGo} ${levelsToGo === 1 ? 'nivel' : 'niveles'} por delante`
                    : '¡Estás en tu nivel meta!'}
                </span>
                <span className="text-label-2 tabular-nums">{Math.round(climb * 100)}% de la montaña</span>
              </div>
              <ProgressBar value={climb} color="linear-gradient(90deg,var(--brand-from),var(--brand-to))" height={8} />
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              {next.unit && (
                <ButtonLink to={nextTo} variant="brand" className="flex-1 md:flex-none">
                  <Play size={16} fill="currentColor" /> Continuar: {next.level} · U{next.unit.n}
                </ButtonLink>
              )}
              <ButtonLink to="/progress" variant="gray" className="flex-1 md:flex-none">
                Ver progreso
              </ButtonLink>
            </div>
          </div>
        </Card>

        {/* Compact stats strip */}
        <Card className="overflow-hidden">
          <dl className="bg-separator grid grid-cols-2 gap-px sm:grid-cols-4">
            <Stat icon={Flame} color="var(--orange)" label="Racha" value={`${p.streak.current} d`} sub={`Mejor: ${p.streak.best} d`} />
            <Stat icon={Zap} color="var(--yellow)" label="Hoy" value={`${today} XP`} sub={`Meta: ${p.dailyGoal} XP`} progress={today / p.dailyGoal} />
            <Stat icon={Trophy} color="var(--purple)" label="Rango" value={`Nv. ${rank.rank}`} sub={`${rank.into}/${rank.need} XP`} progress={rank.ratio} />
            <Stat icon={Check} color="var(--green)" label="Unidades" value={`${Object.keys(p.units).length}`} sub="completadas" />
          </dl>
        </Card>

        {profile?.role === 'teacher' ? <TeacherCard /> : <TasksWidget />}

        <div className="grid gap-5 lg:grid-cols-2">
          <WeekPlanCard />
          <Card className="p-5">
            <h3 className="text-title-3">Empieza a practicar</h3>
            <p className="text-label-2 text-subhead mt-0.5">Sigue tu ruta o elige una destreza.</p>
            {next.unit && (
              <Link
                to={nextTo}
                className="brand-gradient mt-4 flex items-center gap-4 rounded-[18px] p-4 text-white shadow-[0_10px_30px_-10px_rgb(91_92_255/0.7)] transition-transform active:scale-[0.98]"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-[12px] bg-white/20">
                  <BookOpen size={22} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[17px] font-semibold">
                    {next.level} · Unidad {next.unit.n}
                  </span>
                  <span className="block truncate text-[13px] opacity-85">{titleCase(next.unit.title)}</span>
                </span>
                <ChevronRight size={22} />
              </Link>
            )}
            <div className="mt-3 grid grid-cols-2 gap-3">
              <QuickTile to="/practice/listening" icon={Headphones} color="var(--skill-listening)" title="Listening" />
              <QuickTile to="/practice/reading" icon={BookOpen} color="var(--skill-reading)" title="Reading" />
              <QuickTile to="/practice/writing" icon={PenLine} color="var(--skill-writing)" title="Writing" />
              <QuickTile to="/practice/speaking" icon={Mic} color="var(--skill-speaking)" title="Speaking" />
            </div>
          </Card>
        </div>

        {/* Explore: one compact row instead of four big cards */}
        <div>
          <h2 className="text-title-3 mb-3 px-1">Explora</h2>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            <ExploreTile to="/ielts" icon={Award} color="var(--indigo)" title="IELTS Simulator" sub={ieltsLine()} />
            <ExploreTile to="/learn/grammar" icon={Sigma} color="var(--teal)" title="Gramática" sub="Fechas, la hora, modales" />
            <ExploreTile to="/games" icon={Gamepad2} color="var(--pink)" title="Juegos" sub={`${GAMES.length} para practicar`} />
            <ExploreTile to="/coach" icon={Sparkles} color="var(--purple)" title="AI Coach" sub="Conversa y corrige" />
          </div>
        </div>
      </div>
    </Page>
  );
}

/** Teachers: the class shortcuts, with "Asignar tarea" right on Home. */
function TeacherCard() {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-4">
        <IconTile icon={School} color="var(--orange)" size={44} />
        <div className="min-w-0 flex-1">
          <h3 className="text-title-3">Sala del docente</h3>
          <p className="text-label-2 text-subhead mt-0.5">Asigna tareas, revisa los trabajos de tu clase y sigue su progreso.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <AssignButton variant="brand" size="md" />
          <ButtonLink to="/teacher?tab=work" variant="gray">
            <PenLine size={16} aria-hidden /> Trabajos
          </ButtonLink>
          <ButtonLink to="/teacher?tab=tasks" variant="gray">
            <ClipboardList size={16} aria-hidden /> Tareas
          </ButtonLink>
          <ButtonLink to="/teacher" variant="gray">
            Mi clase
          </ButtonLink>
        </div>
      </div>
    </Card>
  );
}

function ieltsLine() {
  const ielts = readIelts();
  return ielts.overall != null ? `Banda estimada ${ielts.overall.toFixed(1)}` : 'Haz tu primer mock test';
}

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function Stat({
  icon,
  color,
  label,
  value,
  sub,
  progress,
}: {
  icon: typeof Flame;
  color: string;
  label: string;
  value: string;
  sub: string;
  progress?: number;
}) {
  return (
    <div className="bg-card p-4">
      <dt className="flex items-center gap-2">
        <IconTile icon={icon} color={color} size={24} />
        <span className="text-label-2 text-[13px] font-medium">{label}</span>
      </dt>
      <dd className="mt-1.5 text-[22px] font-bold tracking-tight tabular-nums">{value}</dd>
      <dd className="text-label-2 text-[12px]">{sub}</dd>
      {progress !== undefined && (
        <dd>
          <ProgressBar value={progress} color={color} className="mt-2" height={4} />
        </dd>
      )}
    </div>
  );
}

function ExploreTile({ to, icon, color, title, sub }: { to: string; icon: typeof Flame; color: string; title: string; sub: string }) {
  return (
    <Link to={to} className="bg-card shadow-card flex items-center gap-3 rounded-[18px] p-3.5 transition-transform active:scale-[0.98]">
      <IconTile icon={icon} color={color} size={40} />
      <span className="min-w-0">
        <span className="block truncate text-[15px] font-semibold">{title}</span>
        <span className="text-label-2 block truncate text-[12px]">{sub}</span>
      </span>
    </Link>
  );
}

function QuickTile({ to, icon, color, title }: { to: string; icon: typeof Flame; color: string; title: string }) {
  return (
    <Link
      to={to}
      className="bg-fill-2 hover:bg-fill flex items-center gap-3 rounded-[16px] p-3 transition-colors active:scale-[0.98]"
    >
      <IconTile icon={icon} color={color} size={38} soft />
      <span className="min-w-0">
        <span className="block text-[15px] font-semibold">{title}</span>
        <span className="text-label-2 block text-[12px]">Practicar</span>
      </span>
    </Link>
  );
}
