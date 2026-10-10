import { useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Lightbulb,
  Mic,
  PenLine,
  Repeat,
  Sparkles,
  Target,
  Users,
  Volume2,
  Wand2,
} from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Button, ButtonLink } from '@/components/ui/Button';
import { LevelChip, PageLoader } from '@/components/ui/Misc';
import { Quiz, type QuizItem } from '@/components/learning/Quiz';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { Callout, DataTable } from '@/components/learning/Callout';
import { WritingPad } from '@/components/learning/WritingPad';
import { useAsync } from '@/hooks/useAsync';
import { loadLevel, levelMeta } from '@/content/levels';
import type { GrammarPoint, Unit, VocabItem } from '@/content/types';
import { useProgress } from '@/store/progress';
import { speak } from '@/lib/speech';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/cn';
import { unitTitle } from './LevelPage';
import NotFound from '../NotFound';
import { UnitVerbTools } from '../verblab/unitTools';

type Tab = 'overview' | 'vocab' | 'grammar' | 'practice' | 'produce';

export default function UnitPage() {
  const { level = '', unit = '' } = useParams();
  const meta = levelMeta(level);
  const { data, loading } = useAsync(() => (meta ? loadLevel(meta.id) : Promise.resolve(null)), [meta?.id]);
  const [tab, setTab] = useState<Tab>('overview');
  const done = useProgress((s) => (meta ? s.units[`${meta.id}-${unit}`] : undefined));
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
      subtitle={u.theme}
      actions={
        done && (
          <span className="text-ios-green inline-flex items-center gap-1.5 text-[15px] font-semibold">
            <CheckCircle2 size={20} /> Completada · {done.score}%
          </span>
        )
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
        {tab === 'overview' && <Overview u={u} onStart={() => setTab('vocab')} />}
        {tab === 'vocab' && <Vocabulary items={u.vocab} />}
        {tab === 'grammar' && (
          <div className="space-y-5">
            {u.grammar.map((g) => (
              <GrammarCard key={g.name} g={g} />
            ))}
            <UnitVerbTools unit={u} />
          </div>
        )}
        {tab === 'practice' && (
          <Practice
            u={u}
            onFinish={(score) =>
              score >= 70
                ? completeUnit(meta.id, u.n, score, `${meta.id} · ${unitTitle(u.title)}`)
                : award({ kind: 'unit', title: `Práctica: ${meta.id} · ${unitTitle(u.title)}`, skill: 'grammar', xp: 5, score, level: meta.id })
            }
          />
        )}
        {tab === 'produce' && <Produce u={u} levelId={meta.id} />}
      </motion.div>

      <div className="mt-10 flex items-center justify-between gap-3">
        {prev ? (
          <Link to={`/learn/${level}/${prev.n}`} onClick={() => setTab('overview')} className="text-ios-blue inline-flex items-center gap-1 text-[15px] font-medium">
            <ChevronLeft size={18} /> Unidad {prev.n}
          </Link>
        ) : (
          <span />
        )}
        {next && (
          <Link to={`/learn/${level}/${next.n}`} onClick={() => setTab('overview')} className="text-ios-blue inline-flex items-center gap-1 text-[15px] font-medium">
            Unidad {next.n} <ChevronRight size={18} />
          </Link>
        )}
      </div>
    </Page>
  );
}

// ------------------------------------------------------------------ overview --

function Overview({ u, onStart }: { u: Unit; onStart: () => void }) {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
      <div className="space-y-5">
        <Card className="p-6">
          <p className="text-body text-pretty">{u.overview.intro}</p>
          <h3 className="text-headline mt-6 mb-3 flex items-center gap-2">
            <Target size={18} className="text-ios-blue" /> Objetivos
          </h3>
          <ul className="space-y-2.5">
            {u.overview.goals.map((g) => (
              <li key={g} className="flex gap-3 text-[16px]">
                <CheckCircle2 size={20} className="text-ios-green mt-0.5 shrink-0" />
                {g}
              </li>
            ))}
          </ul>
          <Callout tone="purple" icon={<Sparkles size={16} />} title="Al terminar" className="mt-6">
            {u.overview.outcome}
          </Callout>
          <Button variant="brand" size="lg" className="mt-6 w-full sm:w-auto" onClick={onStart}>
            Empezar la lección <ChevronRight size={18} />
          </Button>
        </Card>
      </div>
      <div className="space-y-5">
        <Card className="p-5">
          <h3 className="text-headline mb-3">En esta unidad</h3>
          <ul className="text-[15px]">
            <SummaryRow icon={BookOpen} color="var(--blue)" label="Palabras y expresiones" value={u.vocab.length} />
            <SummaryRow icon={Wand2} color="var(--purple)" label="Puntos de gramática" value={u.grammar.length} />
            <SummaryRow icon={Repeat} color="var(--green)" label="Preguntas de práctica" value={practiceItems(u).length} />
            <SummaryRow icon={Mic} color="var(--orange)" label="Tareas de speaking" value={u.speaking?.length ?? 0} />
          </ul>
        </Card>
        {u.tips && u.tips.length > 0 && (
          <Card className="p-5">
            <h3 className="text-headline mb-3 flex items-center gap-2">
              <Lightbulb size={18} className="text-ios-yellow" /> Tips
            </h3>
            <ul className="space-y-3 text-[15px]">
              {u.tips.map((t) => (
                <li key={t} className="text-label-2 text-pretty">
                  {t}
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function SummaryRow({ icon: Icon, color, label, value }: { icon: typeof BookOpen; color: string; label: string; value: number }) {
  return (
    <li className="flex items-center gap-3 py-2 [&:not(:last-child)]:shadow-[inset_0_-0.5px_0_var(--separator)]">
      <Icon size={18} style={{ color }} />
      <span className="flex-1">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </li>
  );
}

// ---------------------------------------------------------------- vocabulary --

function Vocabulary({ items }: { items: VocabItem[] }) {
  const [mode, setMode] = useState<'list' | 'cards'>('list');
  return (
    <div>
      <div className="mb-4 flex justify-end">
        <Segmented
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'list', label: 'Lista' },
            { value: 'cards', label: 'Flashcards' },
          ]}
        />
      </div>
      {mode === 'list' ? (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((v) => (
            <Card key={v.term} className="p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="text-title-3">{v.term}</div>
                  {v.pos && <div className="text-ios-blue text-[13px] font-medium italic">{v.pos}</div>}
                </div>
                <SpeakButton text={v.term} />
              </div>
              <p className="mt-2 text-[15px]">{v.def}</p>
              {v.use && <p className="text-label-2 mt-2 text-[14px] text-pretty">{v.use}</p>}
              {v.examples && (
                <ul className="mt-3 space-y-1.5">
                  {v.examples.map((e) => (
                    <li key={e} className="bg-fill-2 flex items-center gap-2 rounded-[10px] py-1.5 pr-1 pl-3 text-[14px]">
                      <span className="flex-1 italic">{e}</span>
                      <SpeakButton text={e} size={16} />
                    </li>
                  ))}
                </ul>
              )}
              {v.colloc && <p className="text-label-2 mt-3 text-[13px]">🔗 {v.colloc}</p>}
            </Card>
          ))}
        </div>
      ) : (
        <Flashcards items={items} />
      )}
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
    if (d > 0 && n === 0) award({ kind: 'flashcards', title: 'Flashcards de vocabulario', skill: 'vocabulary', xp: 10 });
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

function GrammarCard({ g }: { g: GrammarPoint }) {
  const [deep, setDeep] = useState(false);
  return (
    <Card className="p-6">
      <h3 className="text-title-2">{g.name}</h3>
      {g.short && <p className="text-ios-blue mt-1 text-[16px] font-medium">{g.short}</p>}
      {g.rule && <p className="text-body mt-4 text-pretty">{g.rule}</p>}

      {g.form && (
        <div className="bg-fill-2 mt-5 rounded-[14px] p-4">
          <div className="text-label-2 mb-2 text-[12px] font-semibold tracking-wide uppercase">Forma</div>
          <ul className="space-y-1.5 font-mono text-[14px]">
            {g.form.map((f) => (
              <li key={f}>{f}</li>
            ))}
          </ul>
        </div>
      )}

      {g.chart && (
        <div className="mt-5">
          <DataTable title={g.chart.title} cols={g.chart.cols} rows={g.chart.rows} />
        </div>
      )}

      {g.examples && (
        <div className="mt-5">
          <div className="text-label-2 mb-2 text-[12px] font-semibold tracking-wide uppercase">Ejemplos</div>
          <ul className="space-y-2">
            {[...g.examples, ...(g.more ?? [])].map((e) => (
              <li key={e} className="flex items-center gap-2 text-[16px]">
                <SpeakButton text={e} size={16} />
                <span className="italic">{e}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {g.notes && (
        <ul className="mt-5 space-y-2">
          {g.notes.map((n) => (
            <li key={n} className="flex gap-2.5 text-[15px]">
              <span className="bg-ios-blue mt-2 h-1.5 w-1.5 shrink-0 rounded-full" />
              <span className="text-pretty">{n}</span>
            </li>
          ))}
        </ul>
      )}

      {g.watch && (
        <Callout tone="orange" icon={<AlertTriangle size={16} />} title="Cuidado" className="mt-5">
          {g.watch}
        </Callout>
      )}

      {g.fix && g.fix.length > 0 && (
        <div className="mt-5 space-y-2.5">
          <div className="text-label-2 text-[12px] font-semibold tracking-wide uppercase">Errores comunes</div>
          {g.fix.map((f) => (
            <div key={f.wrong} className="bg-fill-2 rounded-[14px] p-4 text-[15px]">
              <div className="text-ios-red line-through decoration-2">{f.wrong}</div>
              <div className="text-ios-green mt-1 font-semibold">{f.right}</div>
              <div className="text-label-2 mt-1 text-[14px]">{f.why}</div>
            </div>
          ))}
        </div>
      )}

      {g.contrast && (
        <div className="mt-5">
          <DataTable title={g.contrast.title} cols={g.contrast.cols} rows={g.contrast.rows} />
        </div>
      )}

      {g.dialogue && g.dialogue.length > 0 && <Dialogue lines={g.dialogue} />}

      {g.sound && (
        <Callout tone="purple" icon={<Volume2 size={16} />} title="Pronunciación" className="mt-5">
          {g.sound}
        </Callout>
      )}

      {g.drill?.items && (
        <div className="mt-5">
          <div className="text-label-2 mb-2 text-[12px] font-semibold tracking-wide uppercase">
            Drill{g.drill.name ? ` · ${g.drill.name}` : ''}
          </div>
          {g.drill.prompt && <p className="mb-2 text-[15px]">{g.drill.prompt}</p>}
          <ol className="list-decimal space-y-1 pl-5 text-[15px]">
            {g.drill.items.map((d) => (
              <li key={d}>{d}</li>
            ))}
          </ol>
        </div>
      )}

      {g.deep && (
        <div className="mt-5">
          <button type="button" onClick={() => setDeep((d) => !d)} className="text-ios-blue text-[15px] font-semibold">
            {deep ? 'Ocultar explicación profunda' : 'Profundizar ›'}
          </button>
          {deep && <p className="text-label-2 mt-3 text-[15px] leading-relaxed text-pretty">{g.deep}</p>}
        </div>
      )}
    </Card>
  );
}

export function Dialogue({ lines }: { lines: { sp: string; line: string }[] }) {
  const { speechRate } = useSettings();
  const [playing, setPlaying] = useState<number | null>(null);
  const playAll = (k = 0) => {
    if (k >= lines.length) return setPlaying(null);
    setPlaying(k);
    // alternate accents so the two speakers sound different
    speak(lines[k]!.line, { accent: k % 2 ? 'en-GB' : 'en-US', rate: speechRate, onEnd: () => playAll(k + 1) });
  };
  return (
    <div className="mt-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="text-label-2 text-[12px] font-semibold tracking-wide uppercase">Diálogo</div>
        <Button size="sm" variant="tinted" onClick={() => playAll()}>
          <Volume2 size={14} /> Escuchar
        </Button>
      </div>
      <div className="space-y-2">
        {lines.map((l, k) => (
          <div key={k} className={cn('flex', k % 2 ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[80%] rounded-[18px] px-4 py-2.5 text-[15px] transition-shadow',
                k % 2 ? 'bg-ios-blue rounded-br-[6px] text-white' : 'bg-fill rounded-bl-[6px]',
                playing === k && 'ring-ios-orange ring-2',
              )}
            >
              <div className={cn('mb-0.5 text-[11px] font-semibold', k % 2 ? 'text-white/70' : 'text-label-2')}>{l.sp}</div>
              {l.line}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

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
  return (
    <Card className="mx-auto max-w-2xl p-6">
      <Quiz key={u.n} items={items} onFinish={onFinish} title="Práctica de la unidad" />
    </Card>
  );
}

// ------------------------------------------------------------------- produce --

function Produce({ u, levelId }: { u: Unit; levelId: string }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {u.speaking && u.speaking.length > 0 && (
        <Card className="p-6">
          <h3 className="text-title-3 mb-4 flex items-center gap-2">
            <Mic size={20} className="text-ios-orange" /> Speaking
          </h3>
          <ul className="space-y-3">
            {u.speaking.map((s) => (
              <li key={s.text} className="bg-fill-2 rounded-[14px] p-4">
                {s.kind && <div className="text-ios-orange text-[12px] font-bold tracking-wide uppercase">{s.kind}</div>}
                <p className="mt-1 text-[15px] text-pretty">{s.text}</p>
              </li>
            ))}
          </ul>
          <ButtonLink to="/practice/speaking" variant="tinted" className="mt-4">
            Practicar speaking con micrófono
          </ButtonLink>
        </Card>
      )}

      {u.writing && (
        <Card className="p-6">
          <h3 className="text-title-3 mb-1 flex items-center gap-2">
            <PenLine size={20} className="text-ios-purple" /> Writing · {u.writing.title}
          </h3>
          <p className="text-[15px] text-pretty">{u.writing.brief}</p>
          {u.writing.length && <p className="text-label-2 mt-1 text-[13px]">{u.writing.length}</p>}
          <WritingPad
            storageKey={`ecyr:writing:${levelId}-${u.n}`}
            criteria={u.writing.criteria}
            prompt={`${u.writing.title}: ${u.writing.brief}`}
            level={levelId}
            title={`Writing ${levelId} · U${u.n}`}
          />
        </Card>
      )}

      {u.dynamics && u.dynamics.length > 0 && (
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-title-3 mb-4 flex items-center gap-2">
            <Users size={20} className="text-ios-teal" /> Dinámicas para clase
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {u.dynamics.map((d) => (
              <div key={d.name} className="bg-fill-2 rounded-[14px] p-4">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-headline">{d.name}</div>
                  {d.minutes && <span className="text-label-2 text-[12px]">{d.minutes}</span>}
                </div>
                {d.mode && <div className="text-ios-teal text-[12px] font-semibold">{d.mode}</div>}
                {d.how && <p className="mt-2 text-[14px] text-pretty">{d.how}</p>}
                {d.payoff && <p className="text-label-2 mt-2 text-[13px] italic">{d.payoff}</p>}
              </div>
            ))}
          </div>
        </Card>
      )}

      {u.homework && (
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-headline">📝 Tarea · {u.homework.title}</h3>
          <p className="text-label-2 mt-1 text-[15px] text-pretty">{u.homework.task}</p>
        </Card>
      )}
    </div>
  );
}
