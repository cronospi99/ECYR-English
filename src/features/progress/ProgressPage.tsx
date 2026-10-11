import { ArrowRight, FileUp, Flame, FolderOpen, Mountain, Target, Trophy, Zap } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { Page } from '@/components/ui/Page';
import { Card, CardHeader } from '@/components/ui/Card';
import { ProgressBar } from '@/components/ui/Progress';
import { Segmented } from '@/components/ui/Segmented';
import { IconTile } from '@/components/ui/IconTile';
import { LevelChip, EmptyState } from '@/components/ui/Misc';
import { MountainClimb } from '@/components/mountain/MountainClimb';
import { ActivityChart } from '@/components/charts/ActivityChart';
import { SkillRings } from '@/components/charts/SkillRings';
import { useProgress, climbProgress, levelCompletion, xpLevel, currentLevel, type ProgressData } from '@/store/progress';
import { useGames } from '@/store/games';
import { readIelts } from '@/lib/ielts';
import { GameProgressView } from '@/features/games/GameProgress';
import { IeltsSummary } from './IeltsSummary';
import { LEVELS } from '@/content/levels';
import { CEFR_LEVELS, type CefrLevel } from '@/content/types';
import { relativeTime } from '@/lib/date';

type Tab = 'general' | 'games' | 'ielts';

export default function ProgressPage() {
  const p = useProgress();
  const sessions = useGames((s) => s.sessions);
  const defenders = useGames((s) => s.defenders);
  const [params, setParams] = useSearchParams();
  const tab: Tab = (['games', 'ielts'] as const).find((t) => t === params.get('tab')) ?? 'general';

  return (
    <Page title="Progreso" subtitle="Cada unidad completada es un paso más hacia la cima." wide>
      <div className="no-scrollbar mb-5 overflow-x-auto">
        <Segmented<Tab>
          value={tab}
          onChange={(t) => setParams(t === 'general' ? {} : { tab: t })}
          options={[
            { value: 'general', label: 'General' },
            { value: 'games', label: 'Juegos' },
            { value: 'ielts', label: 'IELTS' },
          ]}
        />
      </div>
      {tab === 'general' && (
        <>
          <ProgressOverview p={p} editable />
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            <LinkCard to="/portfolio" icon={FolderOpen} color="var(--teal)" title="Mis trabajos" text="Escritos, tareas y trabajos que ya hiciste, con la revisión de tu docente." />
            <LinkCard to="/import" icon={FileUp} color="var(--indigo)" title="Importar y migrar" text="Trae tu progreso del IELTS Simulator original o de otro dispositivo." />
          </div>
        </>
      )}
      {tab === 'games' && <GameProgressView sessions={sessions} defenders={defenders} />}
      {tab === 'ielts' && <IeltsSummary data={readIelts()} own />}
    </Page>
  );
}

function LinkCard({ to, icon, color, title, text }: { to: string; icon: typeof Zap; color: string; title: string; text: string }) {
  return (
    <Link to={to} className="block">
      <Card className="flex items-center gap-4 p-4 transition-transform active:scale-[0.99]">
        <IconTile icon={icon} color={color} size={40} />
        <div className="min-w-0 flex-1">
          <div className="text-[16px] font-semibold">{title}</div>
          <p className="text-label-2 text-[13px]">{text}</p>
        </div>
        <ArrowRight size={18} className="text-label-3 shrink-0" />
      </Card>
    </Link>
  );
}

/**
 * The learner's overall progress. `editable` (own page) shows the goal settings;
 * a teacher passes a student's synced record read-only.
 */
export function ProgressOverview({ p, editable = false }: { p: ProgressData; editable?: boolean }) {
  const climb = climbProgress(p.units);
  const rank = xpLevel(p.xp);
  const level = currentLevel(p.units);
  const setTargetLevel = useProgress((s) => s.setTargetLevel);
  const setDailyGoal = useProgress((s) => s.setDailyGoal);

  return (
    <>
      <Card className="relative mb-5 overflow-hidden">
        <MountainClimb wide progress={climb} />
        <div className="material absolute top-4 left-4 flex items-center gap-3 rounded-[16px] px-4 py-3">
          <Mountain className="text-ios-indigo" />
          <div>
            <div className="text-label-2 text-[12px]">Altura alcanzada</div>
            <div className="text-[24px] leading-tight font-extrabold tabular-nums">{Math.round(climb * 100)}%</div>
          </div>
        </div>
        <div className="material absolute top-4 right-4 rounded-[16px] px-4 py-3 text-right">
          <div className="text-label-2 text-[12px]">Nivel actual</div>
          <div className="text-[24px] leading-tight font-extrabold">{level}</div>
        </div>
      </Card>

      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat icon={Zap} color="var(--yellow)" label="XP total" value={p.xp.toLocaleString('es')} />
        <Stat icon={Trophy} color="var(--purple)" label={`Rango ${rank.rank}`} value={`${rank.into}/${rank.need}`} progress={rank.ratio} />
        <Stat icon={Flame} color="var(--orange)" label="Racha actual" value={`${p.streak.current} días`} />
        <Stat icon={Flame} color="var(--red)" label="Mejor racha" value={`${p.streak.best} días`} />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card className="pb-5">
          <CardHeader title="Por nivel" subtitle="Unidades completadas en cada tramo" />
          <div className="space-y-4 px-5 pt-4">
            {LEVELS.map((l) => {
              const c = levelCompletion(p.units, l.id);
              return (
                <div key={l.id}>
                  <div className="mb-1.5 flex items-center justify-between text-[14px]">
                    <span className="flex items-center gap-2">
                      <LevelChip level={l.id} /> {l.nameEs}
                    </span>
                    <span className="text-label-2 tabular-nums">
                      {c.done}/{c.total}
                    </span>
                  </div>
                  <ProgressBar value={c.ratio} color={l.color} />
                </div>
              );
            })}
          </div>
        </Card>
        <Card className="pb-5">
          <CardHeader title="Habilidades" subtitle="XP acumulada por destreza" />
          <div className="px-4 pt-6">
            <SkillRings skillXp={p.skillXp} goal={500} />
          </div>
          <div className="text-label-2 mt-5 grid grid-cols-2 gap-2 px-5 text-[14px]">
            <div className="bg-fill-2 flex justify-between rounded-[12px] px-3 py-2">
              <span>Grammar</span>
              <b className="text-label tabular-nums">{p.skillXp.grammar} XP</b>
            </div>
            <div className="bg-fill-2 flex justify-between rounded-[12px] px-3 py-2">
              <span>Vocabulary</span>
              <b className="text-label tabular-nums">{p.skillXp.vocabulary} XP</b>
            </div>
          </div>
        </Card>
        <Card className="pb-4 lg:col-span-2">
          <CardHeader title="Actividad" subtitle="XP diaria · últimos 30 días" />
          <div className="px-4 pt-2">
            <ActivityChart daily={p.dailyXp} goal={p.dailyGoal} days={30} />
          </div>
        </Card>

        {editable && (
        <Card className="p-5">
          <h3 className="text-title-3 mb-1 flex items-center gap-2">
            <Target size={20} className="text-ios-blue" /> Metas
          </h3>
          <p className="text-label-2 mb-4 text-[14px]">Ajusta tu nivel objetivo y tu meta diaria de XP.</p>
          <div className="text-[13px] font-semibold">Nivel objetivo</div>
          <Segmented<CefrLevel>
            className="mt-2 w-full"
            value={p.targetLevel}
            onChange={setTargetLevel}
            options={CEFR_LEVELS.map((l) => ({ value: l, label: l }))}
          />
          <div className="mt-5 text-[13px] font-semibold">Meta diaria</div>
          <Segmented<string>
            className="mt-2 w-full"
            value={String(p.dailyGoal)}
            onChange={(v) => setDailyGoal(Number(v))}
            options={[20, 50, 100, 150].map((n) => ({ value: String(n), label: `${n} XP` }))}
          />
        </Card>
        )}

        <Card className={editable ? 'pb-2' : 'pb-2 lg:col-span-2'}>
          <CardHeader title="Historial" subtitle={`${p.activity.length} actividades`} />
          {p.activity.length === 0 ? (
            <EmptyState icon={<Mountain size={44} />} title="Aún no hay actividad" body="Completa tu primera unidad para empezar a escalar." />
          ) : (
            <ul className="mt-2 max-h-[360px] overflow-y-auto">
              {p.activity.map((a) => (
                <li key={a.id} className="flex items-center gap-3 px-5 py-2.5 [&:not(:last-child)]:shadow-[inset_0_-0.5px_0_var(--separator)]">
                  <span className="text-label-2 w-20 shrink-0 text-[12px]">{relativeTime(a.at)}</span>
                  <span className="min-w-0 flex-1 truncate text-[15px]">{a.title}</span>
                  {a.score !== undefined && <span className="text-label-2 text-[13px] tabular-nums">{a.score}%</span>}
                  <span className="text-ios-green w-12 text-right text-[13px] font-semibold tabular-nums">+{a.xp}</span>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

function Stat({ icon, color, label, value, progress }: { icon: typeof Zap; color: string; label: string; value: string; progress?: number }) {
  return (
    <Card className="p-4">
      <IconTile icon={icon} color={color} size={28} />
      <div className="text-label-2 mt-2 text-[13px]">{label}</div>
      <div className="text-[22px] font-bold tabular-nums">{value}</div>
      {progress !== undefined && <ProgressBar value={progress} color={color} height={4} className="mt-2" />}
    </Card>
  );
}
