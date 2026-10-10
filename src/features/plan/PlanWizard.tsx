import { useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { BookOpenCheck, Check, ClipboardList, Compass, Mountain, RotateCcw, Sparkles, Wand2, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { Spinner, Toggle } from '@/components/ui/Misc';
import { CEFR_LEVELS, type CefrLevel, type CourseUnit, type LevelBook } from '@/content/types';
import { loadFoundations, loadLevel } from '@/content/levels';
import { useProgress } from '@/store/progress';
import { usePlan } from '@/store/plan';
import {
  ALL_SKILLS,
  GOAL_INFO,
  SKILL_INFO,
  WEEKDAYS,
  generatePlan,
  skillProfile,
  weakestSkills,
  type PlanGoal,
  type PlanPrefs,
  type PlanSummary,
  type WeekPlan,
} from '@/lib/planner';
import { cn } from '@/lib/cn';
import { PlanWeek } from './PlanWeek';

const GOAL_ICON: Record<PlanGoal, LucideIcon> = {
  advance: Mountain,
  review: RotateCcw,
  exam: ClipboardList,
  balanced: Compass,
};
const MINUTES = [15, 20, 30, 45, 60] as const;

/** Builds a plan from the learner's choices, previews it, then starts it. */
export function PlanWizard({
  initial,
  archive,
  onDone,
  onCancel,
}: {
  initial: PlanPrefs;
  /** Summary of the plan being replaced, stored in history when the new one starts. */
  archive?: PlanSummary;
  onDone: () => void;
  onCancel?: () => void;
}) {
  const [prefs, setPrefs] = useState<PlanPrefs>(initial);
  const [preview, setPreview] = useState<WeekPlan | null>(null);
  const [busy, setBusy] = useState(false);
  const [books, setBooks] = useState<Partial<Record<CefrLevel, LevelBook>>>({});
  const [foundations, setFoundations] = useState<CourseUnit[] | undefined>();
  const p = useProgress();
  const start = usePlan((s) => s.start);
  const set = <K extends keyof PlanPrefs>(k: K, v: PlanPrefs[K]) => {
    setPreview(null);
    setPrefs((x) => ({ ...x, [k]: v }));
  };

  const suggested = useMemo(() => weakestSkills(skillProfile(p.activity, p.skillXp), 2), [p.activity, p.skillXp]);

  // Unit titles for the review picker.
  useEffect(() => {
    let alive = true;
    void loadLevel(prefs.level).then((b) => alive && setBooks((x) => ({ ...x, [prefs.level]: b })));
    return () => {
      alive = false;
    };
  }, [prefs.level]);

  const reviewable = useMemo(() => {
    const book = books[prefs.level];
    if (!book) return [];
    return book.units.map((u) => ({ key: `${prefs.level}-${u.n}`, n: u.n, title: u.title, score: p.units[`${prefs.level}-${u.n}`]?.score }));
  }, [books, prefs.level, p.units]);

  const build = async () => {
    setBusy(true);
    try {
      const levels = new Set<CefrLevel>([prefs.level, ...prefs.reviewUnits.map((k) => k.split('-')[0] as CefrLevel)]);
      const loaded: Partial<Record<CefrLevel, LevelBook>> = { ...books };
      await Promise.all([...levels].map(async (l) => (loaded[l] = loaded[l] ?? (await loadLevel(l)))));
      const f = prefs.level === 'A1' ? (foundations ?? (await loadFoundations())) : undefined;
      setBooks(loaded);
      setFoundations(f);
      setPreview(
        generatePlan(prefs, {
          units: p.units,
          topics: p.topics,
          activity: p.activity,
          skillXp: p.skillXp,
          books: loaded,
          foundations: f,
        }),
      );
    } finally {
      setBusy(false);
    }
  };

  if (preview)
    return (
      <div className="space-y-5">
        <Card className="p-5 sm:p-6">
          <div className="text-label-2 text-subhead font-medium">Vista previa</div>
          <h2 className="text-title-2 mt-0.5">{preview.title}</h2>
          <p className="text-label-2 text-subhead mt-1">
            {preview.tasks.length} tareas · {preview.tasks.reduce((n, t) => n + t.minutes, 0)} min en {new Set(preview.tasks.map((t) => t.day)).size} días
            {preview.prefs.note ? ` · ${preview.prefs.note}` : ''}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              variant="brand"
              onClick={() => {
                start(preview, archive);
                onDone();
              }}
            >
              <Check size={18} /> Empezar este plan
            </Button>
            <Button variant="gray" onClick={() => setPreview(null)}>
              Ajustar
            </Button>
          </div>
        </Card>
        <PlanWeek plan={preview} />
      </div>
    );

  return (
    <div className="max-w-3xl space-y-5">
      <Section n={1} title="¿Qué quieres lograr esta semana?">
        <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Objetivo">
          {(Object.keys(GOAL_INFO) as PlanGoal[]).map((g) => {
            const Icon = GOAL_ICON[g];
            const active = prefs.goal === g;
            return (
              <button
                key={g}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => set('goal', g)}
                className={cn(
                  'flex items-start gap-3 rounded-[18px] p-4 text-left transition-[background-color,box-shadow]',
                  active ? 'bg-[color-mix(in_srgb,var(--blue)_12%,var(--card))] shadow-[inset_0_0_0_2px_var(--blue)]' : 'bg-fill-2 hover:bg-fill',
                )}
              >
                <span
                  className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px]', active ? 'brand-gradient text-white' : 'bg-card text-label-2')}
                >
                  <Icon size={21} />
                </span>
                <span className="min-w-0">
                  <span className="block text-[16px] font-semibold">{GOAL_INFO[g].label}</span>
                  <span className="text-label-2 mt-0.5 block text-[13px] leading-snug">{GOAL_INFO[g].description}</span>
                </span>
              </button>
            );
          })}
        </div>
      </Section>

      <Section n={2} title="Nivel">
        <Segmented<CefrLevel>
          value={prefs.level}
          onChange={(l) => {
            set('level', l);
            set('reviewUnits', []);
          }}
          options={CEFR_LEVELS.map((l) => ({ value: l, label: l }))}
        />
      </Section>

      {(prefs.goal === 'review' || prefs.goal === 'balanced') && (
        <Section
          n={3}
          title="¿Qué quieres repasar?"
          hint="Elige unidades o déjalo vacío: el motor escoge las de nota más baja."
        >
          {!books[prefs.level] ? (
            <Spinner className="h-5 w-5" />
          ) : (
            <div className="flex flex-wrap gap-2">
              {reviewable.map((u) => {
                const on = prefs.reviewUnits.includes(u.key);
                return (
                  <button
                    key={u.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => set('reviewUnits', on ? prefs.reviewUnits.filter((k) => k !== u.key) : [...prefs.reviewUnits, u.key])}
                    className={cn(
                      'flex max-w-full items-center gap-2 rounded-full py-1.5 pr-3 pl-1.5 text-[14px] transition-colors',
                      on ? 'bg-label text-bg' : 'bg-fill-2 hover:bg-fill',
                    )}
                  >
                    <span
                      className={cn(
                        'flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12px] font-bold',
                        on ? 'bg-bg/20' : 'bg-card',
                      )}
                    >
                      {u.n}
                    </span>
                    <span className="truncate">{titleCase(u.title)}</span>
                    {u.score != null && (
                      <span className={cn('text-[12px] font-semibold tabular-nums', !on && (u.score < 70 ? 'text-ios-orange' : 'text-ios-green'))}>
                        {u.score}%
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </Section>
      )}

      <Section
        n={prefs.goal === 'review' || prefs.goal === 'balanced' ? 4 : 3}
        title="Destrezas a reforzar"
        hint={prefs.focus.length ? 'Tendrán el doble de tareas.' : `Automático: reforzaremos ${suggested.map((s) => SKILL_INFO[s].label).join(' y ')}.`}
      >
        <div className="flex flex-wrap gap-2">
          {ALL_SKILLS.map((s) => {
            const on = prefs.focus.includes(s);
            return (
              <button
                key={s}
                type="button"
                aria-pressed={on}
                onClick={() => set('focus', on ? prefs.focus.filter((x) => x !== s) : [...prefs.focus, s].slice(-3))}
                className={cn(
                  'inline-flex h-9 items-center gap-2 rounded-full px-3.5 text-[14px] font-medium transition-colors',
                  on ? 'text-white' : 'bg-fill-2 hover:bg-fill',
                )}
                style={on ? { background: SKILL_INFO[s].color } : undefined}
              >
                <span className="h-2 w-2 rounded-full" style={{ background: on ? '#fff' : SKILL_INFO[s].color }} />
                {SKILL_INFO[s].label}
                {suggested.includes(s) && !on && <Sparkles size={13} className="text-ios-purple" aria-label="recomendado" />}
              </button>
            );
          })}
        </div>
      </Section>

      <Section n={prefs.goal === 'review' || prefs.goal === 'balanced' ? 5 : 4} title="Tu semana">
        <div className="space-y-4">
          <div>
            <div className="text-label-2 mb-2 text-[13px] font-medium">Días de estudio</div>
            <div className="flex flex-wrap gap-2">
              {[1, 2, 3, 4, 5, 6, 0].map((d) => {
                const on = prefs.days.includes(d);
                return (
                  <button
                    key={d}
                    type="button"
                    aria-pressed={on}
                    aria-label={WEEKDAYS[d]}
                    onClick={() => set('days', on ? prefs.days.filter((x) => x !== d) : [...prefs.days, d])}
                    className={cn(
                      'h-11 w-11 rounded-full text-[14px] font-semibold transition-colors',
                      on ? 'bg-ios-blue text-white' : 'bg-fill-2 text-label hover:bg-fill',
                    )}
                  >
                    {WEEKDAYS[d]!.slice(0, 2)}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <div className="text-label-2 mb-2 text-[13px] font-medium">Minutos por día</div>
            <Segmented<string>
              value={String(prefs.minutes)}
              onChange={(m) => set('minutes', Number(m))}
              options={MINUTES.map((m) => ({ value: String(m), label: `${m}′` }))}
            />
          </div>
          <div className="divide-separator divide-y">
            <label className="flex items-center justify-between gap-3 py-2.5">
              <span>
                <span className="block text-[15px]">Incluir un juego</span>
                <span className="text-label-2 block text-[12px]">Práctica sin presión al final de la semana.</span>
              </span>
              <Toggle checked={prefs.includeGames} onChange={(v) => set('includeGames', v)} label="Incluir un juego" />
            </label>
            {prefs.goal !== 'exam' && (
              <label className="flex items-center justify-between gap-3 py-2.5">
                <span>
                  <span className="block text-[15px]">Práctica IELTS</span>
                  <span className="text-label-2 block text-[12px]">Añade módulos del simulador (B1 en adelante).</span>
                </span>
                <Toggle checked={prefs.includeIelts} onChange={(v) => set('includeIelts', v)} label="Práctica IELTS" />
              </label>
            )}
          </div>
          <label className="block">
            <span className="text-label-2 mb-1.5 block text-[13px] font-medium">Propósito (opcional)</span>
            <input
              value={prefs.note ?? ''}
              maxLength={60}
              onChange={(e) => set('note', e.target.value)}
              placeholder="Ej. entrevista de trabajo, viaje, examen del colegio…"
              className="bg-fill-2 placeholder:text-label-3 h-11 w-full rounded-[12px] px-3.5 text-[16px] outline-none focus:shadow-[inset_0_0_0_2px_var(--blue)]"
            />
          </label>
        </div>
      </Section>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="brand" size="lg" onClick={() => void build()} disabled={busy || prefs.days.length === 0}>
          {busy ? <Spinner className="h-5 w-5" /> : <Wand2 size={19} />} Generar mi plan
        </Button>
        {onCancel && (
          <Button variant="gray" size="lg" onClick={onCancel}>
            Cancelar
          </Button>
        )}
        <span className="text-label-2 inline-flex items-center gap-1.5 text-[13px]">
          <BookOpenCheck size={15} /> Las tareas se marcan solas cuando las completas.
        </span>
      </div>
    </div>
  );
}

function Section({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <Card className="p-5">
        <div className="mb-3 flex items-baseline gap-2.5">
          <span className="text-ios-blue text-[13px] font-bold tabular-nums">{n}</span>
          <h3 className="text-headline">{title}</h3>
        </div>
        {children}
        {hint && <p className="text-label-2 mt-3 text-[13px]">{hint}</p>}
      </Card>
    </motion.div>
  );
}

const titleCase = (s: string) => s.charAt(0) + s.slice(1).toLowerCase();

