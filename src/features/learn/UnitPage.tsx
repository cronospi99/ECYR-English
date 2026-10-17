import { useMemo, useState } from 'react';
import { useParams, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Mic,
  Repeat,
  Trophy,
  Users,
} from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { IconTile } from '@/components/ui/IconTile';
import { Button, ButtonLink } from '@/components/ui/Button';
import { LevelChip, PageLoader } from '@/components/ui/Misc';
import { Quiz, type QuizItem } from '@/components/learning/Quiz';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { UnitWritingTasks } from '@/features/practice/UnitWritingTasks';
import { UnitReadings } from '@/features/practice/UnitReadings';
import { AssignButton } from '@/features/tasks/AssignButton';
import { VisualFigure } from '@/components/visuals/Visuals';
import { unitVisualPlan, type Visual } from '@/content/visuals';
import { useAsync } from '@/hooks/useAsync';
import { loadLevel, levelMeta } from '@/content/levels';
import type { CefrLevel, Unit, VocabItem } from '@/content/types';
import { useProgress } from '@/store/progress';
import { unitTitle } from './LevelPage';
import NotFound from '../NotFound';
import { UnitVerbTools } from '../verblab/unitTools';
import { UnitGrammarTools } from '../grammar/unitTools';
import { UnitOverview } from './unit/UnitOverview';
import { VocabGrid } from './unit/VocabGrid';
import { GrammarLessons } from './unit/GrammarLesson';
import { tint, ink } from './unit/ui';
import { deep } from '@/lib/color';

type Tab = 'overview' | 'vocab' | 'grammar' | 'practice' | 'produce';
const TAB_IDS: Tab[] = ['overview', 'vocab', 'grammar', 'practice', 'produce'];

export default function UnitPage() {
  const { level = '', unit = '' } = useParams();
  const meta = levelMeta(level);
  const { data, loading } = useAsync(() => (meta ? loadLevel(meta.id) : Promise.resolve(null)), [meta?.id]);
  const [params, setParams] = useSearchParams();
  const tab: Tab = TAB_IDS.find((t) => t === params.get('tab')) ?? 'overview';
  const setTab = (t: Tab) => setParams(t === 'overview' ? {} : { tab: t }, { replace: true });
  const done = useProgress((s) => (meta ? s.units[`${meta.id}-${unit}`] : undefined));
  const u0 = data?.units.find((x) => String(x.n) === unit);
  const plan = useMemo(() => (meta && u0 ? unitVisualPlan(`${meta.id}-${u0.n}`, u0.grammar.map((g) => g.name)) : null), [meta, u0]);
  const completeUnit = useProgress((s) => s.completeUnit);
  const award = useProgress((s) => s.award);

  if (!meta) return <NotFound />;
  if (loading || !data) return <PageLoader />;
  const idx = data.units.findIndex((u) => String(u.n) === unit);
  const u = data.units[idx];
  if (!u) return <NotFound />;
  const prev = data.units[idx - 1];
  const next = data.units[idx + 1];

  return (
    <Page
      back={{ to: `/learn/${level}`, label: meta.id }}
      eyebrow={
        <span className="inline-flex items-center gap-2">
          <LevelChip level={meta.id} /> Unidad {u.n}
          {u.world && !u.world.includes('/') && <span className="text-label-3">· {u.world}</span>}
        </span>
      }
      title={unitTitle(u.title)}
      subtitle={tab === 'overview' ? undefined : u.theme}
      actions={
        <span className="inline-flex flex-wrap items-center gap-3">
          {done && (
            <span className="text-ink-green inline-flex items-center gap-1.5 text-[15px] font-semibold">
              <CheckCircle2 size={20} /> Completada · {done.score}%
            </span>
          )}
          <AssignButton preset={{ source: 'unit', level: meta.id, unit: u.n, tab: tab === 'produce' ? 'practice' : tab }} />
        </span>
      }
    >
      <div className="material sticky top-12 z-20 -mx-4 mb-5 px-4 py-2 sm:-mx-6 sm:px-6 lg:top-0 lg:mx-0 lg:rounded-[14px] lg:px-2">
        <div className="no-scrollbar overflow-x-auto">
          <Segmented<Tab>
            value={tab}
            onChange={setTab}
            className="material min-w-full sm:min-w-0"
            options={[
              { value: 'overview', label: 'Resumen' },
              { value: 'vocab', label: 'Vocabulario' },
              { value: 'grammar', label: 'Gramática' },
              { value: 'practice', label: 'Práctica' },
              { value: 'produce', label: 'Producción' },
            ]}
          />
        </div>
      </div>

      <motion.div key={tab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>
        {tab === 'overview' && (
          <UnitOverview
            u={u}
            practiceCount={practiceItems(u).length + vocabItems(u).length}
            onGo={setTab}
            extra={plan && plan.overview.length > 0 && <VisualFigure items={plan.overview} title="Para empezar" color={u.color} className="max-w-3xl" />}
          />
        )}
        {tab === 'vocab' && (
          <div className="space-y-6">
            <Vocabulary items={u.vocab} visuals={plan?.vocab} color={u.color} />
          </div>
        )}
        {tab === 'grammar' && (
          <div className="space-y-5">
            <GrammarLessons key={`${meta.id}-${u.n}`} points={u.grammar} color={u.color} unitKey={`${meta.id}-${u.n}`} />
            <UnitVerbTools unit={u} />
            <UnitGrammarTools unit={u} level={meta.id} />
          </div>
        )}
        {tab === 'practice' && (
          <Practice
            u={u}
            onFinish={(score) =>
              score >= 70
                ? completeUnit(meta.id, u.n, score, `${meta.id} · ${unitTitle(u.title)}`)
                : award({ kind: 'unit', title: `Práctica: ${meta.id} · ${unitTitle(u.title)}`, skill: 'grammar', xp: 5, score, level: meta.id, ref: `unit:${meta.id}-${u.n}` })
            }
          />
        )}
        {tab === 'produce' && <Produce u={u} levelId={meta.id} />}
      </motion.div>

      <div className="mt-10 flex items-center justify-between gap-3">
        {prev ? (
          <Link to={`/learn/${level}/${prev.n}`} onClick={() => setTab('overview')} className="text-ink-blue inline-flex items-center gap-1 text-[15px] font-medium">
            <ChevronLeft size={18} /> Unidad {prev.n}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/learn/${level}/${next.n}`} onClick={() => setTab('overview')} className="text-ink-blue inline-flex items-center gap-1 text-[15px] font-medium">
            Unidad {next.n} <ChevronRight size={18} />
          </Link>
        )}
      </div>
    </Page>
  );
}

// ---------------------------------------------------------------- vocabulary --

function Vocabulary({ items, visuals, color }: { items: VocabItem[]; visuals?: Visual[]; color?: string }) {
  const [mode, setMode] = useState<'list' | 'cards'>('list');
  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-title-3 flex items-center gap-2">
          <IconTile icon={BookOpen} color="var(--blue)" size={28} /> {items.length} palabras y expresiones
        </h2>
        <Segmented
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'list', label: 'Tarjetas' },
            { value: 'cards', label: 'Flashcards' },
          ]}
        />
      </div>
      {visuals && visuals.length > 0 && <VisualFigure items={visuals} title="Mira y aprende" color={color} className="mb-5 max-w-3xl" />}
      {mode === 'list' ? <VocabGrid items={items} /> : <Flashcards items={items} />}
    </div>
  );
}

function Flashcards({ items }: { items: VocabItem[] }) {
  const [i, setI] = useState(0);
  const [flip, setFlip] = useState(false);
  const award = useProgress((s) => s.award);
  const v = items[i]!;
  const go = (d: number) => {
    setFlip(false);
    const n = (i + d + items.length) % items.length;
    if (d > 0 && n === 0) award({ kind: 'flashcards', title: 'Flashcards de vocabulario', skill: 'vocabulary', xp: 10, ref: 'vocab:flashcards' });
    setI(n);
  };
  return (
    <div className="mx-auto max-w-md">
      <button
        type="button"
        onClick={() => setFlip((f) => !f)}
        className="relative block aspect-[4/3] w-full [perspective:1200px]"
        aria-label="Voltear tarjeta"
      >
        <motion.div
          className="relative h-full w-full [transform-style:preserve-3d]"
          animate={{ rotateY: flip ? 180 : 0 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
        >
          <div className="brand-gradient absolute inset-0 flex flex-col items-center justify-center rounded-[28px] p-6 text-white shadow-float [backface-visibility:hidden]">
            <div className="text-[34px] font-bold tracking-tight">{v.term}</div>
            {v.pos && <div className="mt-1 text-[15px] italic opacity-80">{v.pos}</div>}
            <div className="mt-6 text-[13px] opacity-70">Toca para ver el significado</div>
          </div>
          <div className="bg-card absolute inset-0 flex flex-col items-center justify-center rounded-[28px] p-6 text-center shadow-float [backface-visibility:hidden] [transform:rotateY(180deg)]">
            <div className="text-[19px] font-semibold text-pretty">{v.def}</div>
            {v.examples?.[0] && <div className="text-label-2 mt-4 text-[15px] italic">“{v.examples[0]}”</div>}
          </div>
        </motion.div>
      </button>
      <div className="mt-5 flex items-center justify-between">
        <Button variant="gray" onClick={() => go(-1)} aria-label="Anterior">
          <ChevronLeft size={18} />
        </Button>
        <div className="flex items-center gap-3">
          <SpeakButton text={v.term} />
          <span className="text-label-2 text-[14px] tabular-nums">
            {i + 1} / {items.length}
          </span>
        </div>
        <Button variant="gray" onClick={() => go(1)} aria-label="Siguiente">
          <ChevronRight size={18} />
        </Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------- grammar --

export { Dialogue } from './unit/Dialogue';

// ------------------------------------------------------------------ practice --

function practiceItems(u: Unit): QuizItem[] {
  const all = [...(u.quiz ? [u.quiz] : []), ...(u.test ?? [])];
  const seen = new Set<string>();
  return all
    .filter((q) => (seen.has(q.q) ? false : (seen.add(q.q), true)))
    .map((q) => ({ q: q.q, options: q.options, answer: q.answer, explain: q.explain }));
}

/** Builds vocabulary questions (definition → term) so every unit has enough practice. */
function vocabItems(u: Unit): QuizItem[] {
  const pool = u.vocab.filter((v) => v.def);
  return pool.slice(0, 6).map((v, k) => {
    const distractors = pool.filter((x) => x.term !== v.term);
    const picks = [distractors[(k + 1) % distractors.length], distractors[(k + 3) % distractors.length]]
      .filter(Boolean)
      .map((x) => x!.term)
      .filter((t, i, a) => a.indexOf(t) === i && t !== v.term);
    const options = [v.term, ...picks];
    // deterministic shuffle so the answer is not always first
    const rot = k % options.length;
    const rotated = [...options.slice(rot), ...options.slice(0, rot)];
    return {
      q: `Which word or expression means: “${v.def}”`,
      options: rotated,
      answer: rotated.indexOf(v.term),
      explain: v.examples?.[0] ? `Ejemplo: “${v.examples[0]}”` : undefined,
    };
  });
}

function Practice({ u, onFinish }: { u: Unit; onFinish: (score: number) => void }) {
  const items = useMemo(() => [...practiceItems(u), ...vocabItems(u)], [u]);
  const grammarN = practiceItems(u).length;
  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <div className="flex flex-wrap items-center gap-3 px-1">
        <IconTile icon={Repeat} color="var(--green)" size={36} />
        <div className="min-w-0 flex-1">
          <h2 className="text-title-3">Práctica de la unidad</h2>
          <p className="text-label-2 text-[14px]">
            {items.length} preguntas · {grammarN} de gramática y {items.length - grammarN} de vocabulario
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold" style={{ background: tint('var(--yellow)', 22), color: ink('var(--orange)') }}>
          <Trophy size={14} aria-hidden /> 70% para completar
        </span>
      </div>
      <Card className="p-6">
        <Quiz key={u.n} items={items} onFinish={onFinish} title="Práctica de la unidad" />
      </Card>
    </div>
  );
}

// ------------------------------------------------------------------- produce --

function SectionHead({ icon, color, title, meta }: { icon: typeof Mic; color: string; title: React.ReactNode; meta?: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <IconTile icon={icon} color={color} size={34} />
      <div className="min-w-0">
        <h3 className="text-title-3 leading-tight">{title}</h3>
        {meta && <p className="text-label-2 text-[13px]">{meta}</p>}
      </div>
    </div>
  );
}

const KIND_COLORS = ['var(--orange)', 'var(--pink)', 'var(--indigo)', 'var(--teal)'];

function Produce({ u, levelId }: { u: Unit; levelId: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {u.speaking && u.speaking.length > 0 && (
        <Card className="p-6">
          <SectionHead icon={Mic} color="var(--orange)" title="Speaking" meta={`${u.speaking.length} ${u.speaking.length === 1 ? 'tarea' : 'tareas'}`} />
          <ol className="space-y-2.5">
            {u.speaking.map((s, k) => {
              const c = KIND_COLORS[k % KIND_COLORS.length]!;
              return (
                <li key={s.text} className="bg-fill-2 flex gap-3 rounded-[14px] p-3.5">
                  <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: deep(c) }}>
                    {k + 1}
                  </span>
                  <div className="min-w-0">
                    {s.kind && (
                      <span className="rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase" style={{ background: tint(c, 14), color: ink(c) }}>
                        {s.kind}
                      </span>
                    )}
                    <p className="mt-1 text-[15px] leading-snug text-pretty">{s.text}</p>
                  </div>
                </li>
              );
            })}
          </ol>
          <ButtonLink to="/practice/speaking" variant="tinted" className="mt-4">
            <Mic size={17} /> Practicar speaking con micrófono
          </ButtonLink>
        </Card>
      )}

      <UnitWritingTasks level={levelId as CefrLevel} unit={u.n} />

      <div className="lg:col-span-2">
        <UnitReadings level={levelId as CefrLevel} unit={u.n} />
      </div>

      {u.dynamics && u.dynamics.length > 0 && (
        <Card className="p-6 lg:col-span-2">
          <SectionHead icon={Users} color="var(--teal)" title="Dinámicas para clase" meta={`${u.dynamics.length} actividades`} />
          <div className="grid gap-3 md:grid-cols-2">
            {u.dynamics.map((d) => (
              <div key={d.name} className="bg-fill-2 rounded-[14px] p-4" style={{ boxShadow: 'inset 3px 0 0 var(--teal)' }}>
                <div className="flex items-start justify-between gap-2">
                  <div className="text-headline">{d.name}</div>
                  {d.minutes && <span className="bg-card text-label-2 shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold">⏱ {d.minutes}</span>}
                </div>
                {d.mode && <div className="text-ink-teal text-[12px] font-semibold">{d.mode}</div>}
                {d.how && <p className="mt-2 text-[14px] text-pretty">{d.how}</p>}
                {d.payoff && <p className="text-label-2 mt-2 text-[13px] italic">{d.payoff}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {u.homework && (
        <Card className="flex items-start gap-3 p-6 lg:col-span-2">
          <IconTile icon={ClipboardList} color="var(--blue)" size={34} />
          <div className="min-w-0">
            <h3 className="text-headline">Tarea · {u.homework.title}</h3>
            <p className="text-label-2 mt-1 text-[15px] text-pretty">{u.homework.task}</p>
          </div>
        </Card>
      )}
    </div>
  );
}
