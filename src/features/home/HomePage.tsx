import { Link } from 'react-router-dom';
import {
  ArrowRight,
  BookOpen,
  Check,
  ChevronRight,
  Flame,
  Headphones,
  Mic,
  PenLine,
  Play,
  Sparkles,
  Trophy,
  Zap,
  Award,
} from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card, CardHeader } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Progress';
import { IconTile } from '@/components/ui/IconTile';
import { LevelChip } from '@/components/ui/Misc';
import { ButtonLink } from '@/components/ui/Button';
import { MountainClimb, SKY_VARS } from '@/components/mountain/MountainClimb';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { SkillRings } from '@/components/charts/SkillRings';
import { useProgress, climbProgress, currentLevel, levelCompletion, xpLevel } from '@/store/progress';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { useNextUnit } from '@/hooks/useNextUnit';
import { GAMES } from '@/content/catalog';
import { LEVELS } from '@/content/levels';
import { CEFR_LEVELS } from '@/content/types';
import { dayKey, greeting, relativeTime } from '@/lib/date';
import { readIelts } from '@/lib/ielts';
import { cn } from '@/lib/cn';

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

  return (
    <Page
      eyebrow={`${greeting()}${name ? `, ${name}` : ''} 👋`}
      title={
        <>
          Llega a la cima <span className="brand-text">en inglés</span> 🏔️
        </>
      }
      subtitle="Practica, sigue tu progreso y sube nivel a nivel, de A1 a C1."
      wide
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* ------------------------------------------------ main column */}
        <div className="min-w-0 space-y-5">
          {/* Hero: level + mountain */}
          <Card className="relative overflow-hidden">
            <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <div className="relative z-10 flex flex-col justify-between gap-6 p-6">
                <div>
                  <div className="text-label-2 text-subhead font-medium">Tu nivel actual</div>
                  <div className="mt-1 flex items-end gap-4">
                    <span className="text-[84px] leading-[0.9] font-extrabold tracking-[-0.05em]">{level}</span>
                    <div className="pb-2">
                      <div className="text-headline">{LEVELS.find((l) => l.id === level)?.nameEs}</div>
                      <div className="text-label-2 text-footnote">
                        {lvl.done}/{lvl.total} unidades
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-between text-[15px]">
                    <span className="text-label-2">
                      Meta: <span className="text-label font-semibold">{target}</span>
                    </span>
                    <span className="text-label-2 tabular-nums">{Math.round(climb * 100)}% de la montaña</span>
                  </div>
                  <ProgressBar value={climb} color="linear-gradient(90deg,var(--brand-from),var(--brand-to))" height={8} />
                  <p className="text-label-2 text-footnote mt-2">
                    {levelsToGo > 0
                      ? `${levelsToGo} ${levelsToGo === 1 ? 'nivel' : 'niveles'} para tu meta. ¡Sigue subiendo!`
                      : '¡Estás en tu nivel meta! Completa sus unidades para coronar.'}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {next.unit && (
                    <ButtonLink to={`/learn/${next.level.toLowerCase()}/${next.unit.n}`} variant="brand">
                      <Play size={16} fill="currentColor" /> Continuar: Unidad {next.unit.n}
                    </ButtonLink>
                  )}
                  <ButtonLink to="/progress" variant="gray">
                    Ver progreso
                  </ButtonLink>
                </div>
              </div>
              <div className="relative flex flex-col justify-end" style={{ ...SKY_VARS, background: 'var(--sky-a)' }}>
                <div className="brand-gradient absolute top-4 left-4 z-10 rounded-[14px] md:top-5 md:right-5 md:left-auto px-3.5 py-2 text-white shadow-[0_10px_30px_-10px_rgb(91_92_255/0.7)]">
                  <div className="text-[22px] leading-none font-extrabold">{target}</div>
                  <div className="mt-0.5 text-[11px] font-medium opacity-90">Tu meta</div>
                </div>
                <MountainClimb progress={climb} />
              </div>
            </div>
          </Card>

          {/* Stat tiles */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatTile icon={Flame} color="var(--orange)" label="Racha" value={`${p.streak.current} d`} sub={`Mejor: ${p.streak.best} d`} />
            <StatTile icon={Zap} color="var(--yellow)" label="Hoy" value={`${today} XP`} sub={`Meta: ${p.dailyGoal} XP`} progress={today / p.dailyGoal} />
            <StatTile icon={Trophy} color="var(--purple)" label="Rango" value={`Nv. ${rank.rank}`} sub={`${rank.into}/${rank.need} XP`} progress={rank.ratio} />
            <StatTile icon={Check} color="var(--green)" label="Unidades" value={`${Object.keys(p.units).length}`} sub="completadas" />
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <Card className="pb-5">
              <CardHeader
                title="Habilidades"
                subtitle="XP por destreza"
                action={
                  <Link to="/progress" className="text-ios-blue text-[15px] font-medium">
                    Detalles
                  </Link>
                }
              />
              <div className="px-4 pt-5">
                <SkillRings skillXp={p.skillXp} />
              </div>
            </Card>
            <Card className="pb-4">
              <CardHeader title="Actividad" subtitle="XP diaria · últimas 2 semanas" />
              <div className="px-4 pt-2">
                <ActivityChart daily={p.dailyXp} goal={p.dailyGoal} />
              </div>
            </Card>
          </div>

          {/* Levels strip */}
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-title-3">Niveles CEFR</h3>
              <Link to="/learn" className="text-ios-blue text-[15px] font-medium">
                Ver todos
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
              {LEVELS.map((l) => {
                const c = levelCompletion(p.units, l.id);
                return (
                  <Link
                    key={l.id}
                    to={`/learn/${l.id.toLowerCase()}`}
                    className={cn(
                      'group relative overflow-hidden rounded-[18px] bg-gradient-to-br p-4 text-white transition-transform active:scale-[0.98]',
                      l.tint,
                    )}
                  >
                    <div className="text-[28px] leading-none font-extrabold">{l.id}</div>
                    <div className="mt-1 text-[13px] font-medium opacity-90">{l.nameEs}</div>
                    <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-white/30">
                      <div className="h-full rounded-full bg-white" style={{ width: `${c.ratio * 100}%` }} />
                    </div>
                    <div className="mt-1.5 text-[11px] font-medium opacity-90">
                      {c.done}/{c.total} unidades
                    </div>
                  </Link>
                );
              })}
            </div>
          </Card>

          {/* Games */}
          <div>
            <div className="mb-3 flex items-end justify-between px-1">
              <h2 className="text-title-2">Juegos</h2>
              <Link to="/games" className="text-ios-blue text-[15px] font-medium">
                Ver todos
              </Link>
            </div>
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:-mx-6 sm:px-6 lg:mx-0 lg:px-0">
              {GAMES.slice(0, 8).map((g) => (
                <Link
                  key={g.slug}
                  to={`/play/${g.slug}`}
                  className="bg-card w-[220px] shrink-0 snap-start overflow-hidden rounded-[20px] shadow-card transition-transform active:scale-[0.98]"
                >
                  <div
                    className="relative aspect-[16/10] bg-cover bg-center"
                    style={{
                      backgroundImage: g.cover ? `url(${g.cover})` : undefined,
                      background: g.cover ? undefined : `linear-gradient(135deg, ${g.accent}, color-mix(in srgb, ${g.accent} 50%, #000))`,
                    }}
                  >
                    {!g.cover && <span className="absolute inset-0 flex items-center justify-center text-5xl">{g.emoji}</span>}
                  </div>
                  <div className="p-3">
                    <div className="truncate text-[15px] font-semibold">{g.title}</div>
                    <div className="text-label-2 truncate text-[12px]">{g.subtitle}</div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </div>

        {/* ------------------------------------------------ side column */}
        <div className="min-w-0 space-y-5">
          <Card className="p-5">
            <h3 className="text-title-3">Empieza a practicar</h3>
            <p className="text-label-2 text-subhead mt-0.5">Elige una destreza o sigue tu ruta.</p>
            {next.unit && (
              <Link
                to={`/learn/${next.level.toLowerCase()}/${next.unit.n}`}
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

          <StudyPlan nextUnitTo={next.unit ? `/learn/${next.level.toLowerCase()}/${next.unit.n}` : '/learn'} />

          <IeltsCard />

          <Card className="relative overflow-hidden p-5">
            <div className="flex items-center gap-2">
              <Sparkles className="text-ios-purple" size={20} />
              <h3 className="text-title-3">AI Coach</h3>
            </div>
            <p className="text-label-2 text-subhead mt-1 max-w-[230px]">
              Conversa, corrige tus textos y recibe explicaciones a tu nivel.
            </p>
            <ButtonLink to="/coach" variant="tinted" className="mt-4">
              Hablar con el coach <ArrowRight size={16} />
            </ButtonLink>
            <div className="pointer-events-none absolute -right-3 -bottom-4 text-[88px] opacity-90" aria-hidden>
              🤖
            </div>
          </Card>

          {p.activity.length > 0 && (
            <Card className="pb-2">
              <CardHeader title="Actividad reciente" />
              <ul className="mt-2">
                {p.activity.slice(0, 5).map((a) => (
                  <li key={a.id} className="flex items-center gap-3 px-5 py-2.5">
                    <span className="text-label-2 w-12 shrink-0 text-[12px]">{relativeTime(a.at)}</span>
                    <span className="min-w-0 flex-1 truncate text-[15px]">{a.title}</span>
                    {a.level && <LevelChip level={a.level} />}
                    <span className="text-ios-green text-[13px] font-semibold tabular-nums">+{a.xp}</span>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </div>
      </div>
    </Page>
  );
}

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

function StatTile({
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
    <Card className="p-4">
      <div className="flex items-center gap-2">
        <IconTile icon={icon} color={color} size={26} />
        <span className="text-label-2 text-[13px] font-medium">{label}</span>
      </div>
      <div className="mt-2 text-[24px] font-bold tracking-tight tabular-nums">{value}</div>
      <div className="text-label-2 text-[12px]">{sub}</div>
      {progress !== undefined && <ProgressBar value={progress} color={color} className="mt-2" height={4} />}
    </Card>
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

function StudyPlan({ nextUnitTo }: { nextUnitTo: string }) {
  const activity = useProgress((s) => s.activity);
  const todayKey = dayKey();
  const doneToday = (kind: string) => activity.some((a) => a.kind === kind && dayKey(new Date(a.at)) === todayKey);
  const tasks = [
    { label: 'Completa una unidad o un tema', to: nextUnitTo, done: doneToday('unit') || doneToday('topic') },
    { label: 'Lee un texto y responde', to: '/practice/reading', done: doneToday('reading') },
    { label: 'Escucha un diálogo', to: '/practice/listening', done: doneToday('listening') },
    { label: 'Juega una partida', to: '/games', done: doneToday('game') },
    { label: 'Repasa 10 phrasal verbs', to: '/practice/phrasal-verbs', done: doneToday('flashcards') },
  ];
  const n = tasks.filter((t) => t.done).length;
  return (
    <Card className="pb-2">
      <CardHeader title="Plan de hoy" subtitle={`${n} de ${tasks.length} tareas completadas`} />
      <ul className="mt-2">
        {tasks.map((t) => (
          <li key={t.label}>
            <Link to={t.to} className="hover:bg-fill-2 flex items-center gap-3 px-5 py-2.5 transition-colors">
              <span
                className={cn(
                  'flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full border-[1.5px]',
                  t.done ? 'bg-ios-blue border-ios-blue text-white' : 'border-label-3',
                )}
              >
                {t.done && <Check size={14} strokeWidth={3} />}
              </span>
              <span className={cn('flex-1 text-[15px]', t.done && 'text-label-2 line-through')}>{t.label}</span>
              <ChevronRight size={16} className="text-label-3" />
            </Link>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function IeltsCard() {
  const ielts = readIelts();
  return (
    <Link to="/ielts" className="block">
      <Card className="relative overflow-hidden p-5 transition-transform active:scale-[0.99]">
        <div className="flex items-center gap-2">
          <IconTile icon={Award} color="var(--indigo)" size={28} />
          <h3 className="text-title-3">IELTS Simulator</h3>
        </div>
        <div className="mt-3 flex items-end gap-3">
          <span className={cn('text-[44px] leading-none font-extrabold tracking-tight', ielts.overall == null && 'text-label-3')}>
            {ielts.overall != null ? ielts.overall.toFixed(1) : '–'}
          </span>
          <span className="text-label-2 pb-1 text-[13px]">
            {ielts.overall != null ? 'Banda estimada' : 'Haz tu primer mock test'}
          </span>
        </div>
        <div className="mt-3 grid grid-cols-4 gap-2 text-center">
          {(['listening', 'reading', 'writing', 'speaking'] as const).map((m) => (
            <div key={m} className="bg-fill-2 rounded-[12px] py-2">
              <div className={cn('text-[15px] font-bold tabular-nums', ielts.scores[m] == null && 'text-label-3')}>{ielts.scores[m]?.toFixed(1) ?? '–'}</div>
              <div className="text-label-2 text-[10px] capitalize">{m}</div>
            </div>
          ))}
        </div>
        <div className="text-ios-indigo mt-3 flex items-center gap-1 text-[15px] font-semibold">
          Abrir simulador <ChevronRight size={16} />
        </div>
      </Card>
    </Link>
  );
}
