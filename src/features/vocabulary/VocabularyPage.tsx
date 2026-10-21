import { lazy, Suspense, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Search, Sparkles } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Chip, PageLoader } from '@/components/ui/Misc';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { QuestionSet, questionsToSections } from '@/components/learning/QuestionSet';
import { PdfButton } from '@/components/learning/PdfButton';
import { GrammarCuts } from '@/components/visuals/GrammarCuts';
import { Highlight } from '@/features/verblab/highlight';
import { useAsync } from '@/hooks/useAsync';
import { loadAdjectives, loadAdverbs, loadLinking, type AdjectiveCategory, type AdverbType, type LibQuestion, type LinkingCategory } from '@/content/library';
import { cutsWhere } from '@/content/visuals';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import type { Worksheet } from '@/lib/worksheet';
import { cn } from '@/lib/cn';
import { ink } from '@/lib/color';

const VisualVocab = lazy(() => import('./VisualVocab').then((m) => ({ default: m.VisualVocab })));

type Tab = 'visual' | 'linking' | 'adjectives' | 'adverbs';
const TABS: { value: Tab; label: string }[] = [
  { value: 'visual', label: '🖼️ Vocabulario visual' },
  { value: 'linking', label: '🔗 Linking words' },
  { value: 'adjectives', label: '🎨 Adjetivos' },
  { value: 'adverbs', label: '⚡ Adverbios' },
];

export default function VocabularyPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.value === params.get('tab'))?.value ?? 'visual') as Tab;
  return (
    <Page
      back={{ to: '/practice', label: 'Práctica' }}
      eyebrow="Palabras que hacen fluido tu inglés"
      title="Vocabulario"
      subtitle="Vocabulario con imágenes por nivel (A1–C2), conectores para unir ideas, cientos de adjetivos y adverbios por tipo, con ejemplos, audio, quiz y tarea en PDF."
      wide
    >
      <div className="no-scrollbar mb-5 overflow-x-auto">
        <Segmented<Tab> value={tab} onChange={(t) => setParams({ tab: t })} options={TABS} />
      </div>
      {tab === 'visual' && (
        <Suspense fallback={<PageLoader />}>
          <VisualVocab />
        </Suspense>
      )}
      {tab === 'linking' && <Linking />}
      {tab === 'adjectives' && <Adjectives />}
      {tab === 'adverbs' && <Adverbs />}
    </Page>
  );
}

// ------------------------------------------------------------------ shared --

interface Word {
  w: string;
  es: string;
  ex: string;
  level: string;
  emoji?: string;
  badges?: string[];
  note?: string;
  extra?: string;
}

const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** "Either…or" → ["Either", "or"]; "First/firstly" → ["First", "firstly"]. */
const parts = (w: string) => w.split(/…|\.\.\.|\//).map((x) => x.trim()).filter(Boolean);

/** Gap-fill questions from example sentences: the word is blanked; options come from its group and the rest. */
function gapQuiz(group: Word[], others: Word[], n = 10): LibQuestion[] {
  const pool = shuffle(group.filter((x) => parts(x.w).every((p) => new RegExp(`\\b${esc(p)}\\b`, 'i').test(x.ex)))).slice(0, n);
  return pool.map((x) => {
    let q = x.ex;
    for (const p of parts(x.w)) q = q.replace(new RegExp(`\\b${esc(p)}\\b`, 'i'), '____');
    const wrong = shuffle([...group, ...others].filter((y) => y.w.toLowerCase() !== x.w.toLowerCase()))
      .map((y) => y.w)
      .filter((w, i, a) => a.indexOf(w) === i)
      .slice(0, 3);
    const options = shuffle([x.w, ...wrong]);
    return { type: 'mc' as const, q, options, answer: options.indexOf(x.w), explain_es: `${x.w} = ${x.es}${x.note ? `. ${x.note}` : ''}` };
  });
}

function shuffle<T>(a: T[]) {
  const out = [...a];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}

function sheet(title: string, subtitle: string, intro: string, words: Word[], quiz: LibQuestion[]): Worksheet {
  return {
    title,
    subtitle,
    intro,
    sections: [{ kind: 'words', title: 'Word bank', items: words.map((x) => ({ en: x.w, es: x.es, note: x.ex })) }, ...questionsToSections(quiz)],
    credits: 'Material original de ECYR English.',
  };
}

function WordGrid({ words, color }: { words: Word[]; color: string }) {
  const [open, setOpen] = useState<string | null>(null);
  const showEs = useSettings((s) => s.spanishHints);
  const [limit, setLimit] = useState(60);
  return (
    <>
      <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {words.slice(0, limit).map((x, i) => {
          const on = open === x.w;
          return (
            <motion.div
              key={x.w + i}
              role="button"
              tabIndex={0}
              layout
              onClick={() => setOpen(on ? null : x.w)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && e.target === e.currentTarget && (e.preventDefault(), setOpen(on ? null : x.w))}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min((i % 60) * 0.01, 0.4) }}
              className={cn('bg-card shadow-card relative cursor-pointer rounded-[18px] p-3 text-left', on && 'col-span-2 sm:col-span-2')}
              style={{ background: `linear-gradient(180deg, color-mix(in srgb, ${color} 10%, var(--card)), var(--card) 70%)`, boxShadow: on ? `0 0 0 2px ${color}` : undefined }}
              aria-expanded={on}
            >
              <div className="flex items-start gap-2">
                {x.emoji && <span className="text-[30px] leading-none">{x.emoji}</span>}
                <div className="min-w-0 flex-1">
                  <div className="text-[16.5px] leading-tight font-bold">{x.w}</div>
                  {(showEs || on) && <div className="text-label-2 text-[12.5px] leading-snug">{x.es}</div>}
                </div>
                <span className="text-label-2 text-[10.5px] font-bold">{x.level}</span>
              </div>
              {x.badges && x.badges.length > 0 && (
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {x.badges.map((b) => (
                    <span key={b} className="rounded-full px-1.5 py-0.5 text-[10px] font-semibold" style={{ color: ink(color), background: `color-mix(in srgb, ${color} 13%, transparent)` }}>
                      {b}
                    </span>
                  ))}
                </div>
              )}
              <AnimatePresence>
                {on && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                    <div className="mt-2.5 flex items-start gap-2 rounded-[12px] px-2.5 py-2 text-[14.5px] leading-snug" style={{ background: `color-mix(in srgb, ${color} 8%, transparent)` }}>
                      <span className="flex-1">
                        <Highlight text={x.ex} terms={parts(x.w)} color={color} />
                      </span>
                      <span onClick={(e) => e.stopPropagation()}>
                        <SpeakButton text={x.ex} size={15} />
                      </span>
                    </div>
                    {x.extra && <div className="text-label-2 mt-1.5 text-[12.5px]">{x.extra}</div>}
                    {x.note && <div className="text-ink-orange mt-1.5 text-[12.5px]">⚠️ {x.note}</div>}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
      {words.length > limit && (
        <div className="mt-4 text-center">
          <button type="button" className="bg-fill rounded-full px-4 py-2 text-[14px] font-semibold" onClick={() => setLimit((l) => l + 120)}>
            Ver más ({words.length - limit})
          </button>
        </div>
      )}
    </>
  );
}

function GroupTiles<G extends { id: string; en: string; es: string; emoji: string; color: string; items: unknown[] }>({
  groups,
  value,
  onChange,
  sub,
}: {
  groups: G[];
  value: string;
  onChange: (id: string) => void;
  sub?: (g: G) => string;
}) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
      {groups.map((g) => {
        const on = value === g.id;
        return (
          <motion.button
            key={g.id}
            type="button"
            whileHover={{ y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => onChange(g.id)}
            aria-pressed={on}
            className={cn('overflow-hidden rounded-[16px] text-left', on ? 'text-white shadow-float' : 'bg-card shadow-card')}
            style={on ? { background: `linear-gradient(135deg, ${g.color}, color-mix(in srgb, ${g.color} 60%, #3b1d8f))` } : undefined}
          >
            <div className="h-1.5" style={{ background: g.color }} />
            <div className="flex items-center gap-2 px-3 py-2.5">
              <span className="text-[22px] leading-none">{g.emoji}</span>
              <span className="min-w-0">
                <span className="block truncate text-[14px] leading-tight font-bold">{g.en}</span>
                <span className={cn('block truncate text-[11.5px]', on ? 'opacity-85' : 'text-label-2')}>{sub ? sub(g) : `${g.es} · ${g.items.length}`}</span>
              </span>
            </div>
          </motion.button>
        );
      })}
    </div>
  );
}

function Quiz({ title, make, color, refId, pdf }: { title: string; make: () => LibQuestion[]; color: string; refId: string; pdf: (q: LibQuestion[]) => Worksheet }) {
  const [round, setRound] = useState(0);
  const questions = useMemo(make, [round, refId]); // eslint-disable-line react-hooks/exhaustive-deps
  const award = useProgress((s) => s.award);
  if (questions.length < 3) return null;
  return (
    <Card className="mt-6 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-[18px] font-bold">
          <Sparkles size={18} style={{ color: ink(color) }} /> {title}
        </div>
        <div className="flex gap-2">
          <button type="button" className="bg-fill-2 rounded-full px-3 py-1.5 text-[13px] font-semibold" onClick={() => setRound((r) => r + 1)}>
            Otras preguntas
          </button>
          <PdfButton build={() => pdf(questions)} />
        </div>
      </div>
      <QuestionSet
        key={round}
        questions={questions}
        color={color}
        onChecked={(right, total) =>
          award({ kind: 'flashcards', title: `Vocabulario · ${title}`, skill: 'vocabulary', xp: 3 + right, score: Math.round((right / total) * 100), ref: `vocab:${refId}` })
        }
      />
    </Card>
  );
}

// ---------------------------------------------------------- linking words --

const REGISTER_ES = { formal: 'formal', neutral: 'neutral', informal: 'informal' };
const POS_ES = { start: 'al inicio', mid: 'entre ideas', both: 'inicio o medio' };

function Linking() {
  const { data, loading } = useAsync(loadLinking, []);
  const [sel, setSel] = useState('addition');
  if (loading || !data) return <PageLoader />;
  if (!data.length) return <p className="text-label-2">Los conectores se están preparando.</p>;
  const g = data.find((x) => x.id === sel) ?? data[0]!;
  const toWord = (c: LinkingCategory) => (x: LinkingCategory['items'][number]): Word => ({
    w: x.w,
    es: x.es,
    ex: x.ex,
    level: x.level,
    note: x.note_es || undefined,
    badges: [REGISTER_ES[x.register], POS_ES[x.pos]],
    extra: c.en,
  });
  const words = g.items.map(toWord(g));
  const others = data.filter((x) => x.id !== g.id).flatMap((c) => c.items.map(toWord(c)));
  return (
    <div>
      <GroupTiles groups={data} value={g.id} onChange={setSel} />
      <AnimatePresence mode="wait">
        <motion.div key={g.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5">
          <Card className="mb-4 flex flex-wrap items-start gap-4 p-5" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${g.color} 14%, var(--card)), var(--card) 70%)` }}>
            <span className="text-[44px] leading-none">{g.emoji}</span>
            <div className="min-w-[220px] flex-1">
              <div className="text-[22px] font-extrabold" style={{ color: ink(g.color) }}>
                {g.en} <span className="text-label-2 text-[15px] font-semibold">· {g.es}</span>
              </div>
              <p className="mt-1 text-[15px]">{g.use_es}</p>
              <p className="text-label-2 mt-2 text-[13.5px]">💡 {g.tip_es}</p>
            </div>
            <PdfButton
              build={() => sheet(`Linking words: ${g.en}`, `${g.es} · conectores`, g.use_es, words, gapQuiz(words, others, 10))}
            />
          </Card>
          <WordGrid words={words} color={g.color} />
          <Quiz
            title={`¿Qué conector va? · ${g.en}`}
            color={g.color}
            refId={`linking:${g.id}`}
            make={() => gapQuiz(words, others, 8)}
            pdf={(q) => sheet(`Linking words: ${g.en}`, `${g.es} · conectores`, g.use_es, words, q)}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

// -------------------------------------------------------------- adjectives --

const ORDER = [
  ['Opinion', 'beautiful'],
  ['Size', 'big'],
  ['Age', 'old'],
  ['Shape', 'round'],
  ['Colour', 'blue'],
  ['Origin', 'Mexican'],
  ['Material', 'wooden'],
  ['Purpose', 'dining'],
];

function Adjectives() {
  const { data, loading } = useAsync(loadAdjectives, []);
  const [sel, setSel] = useState('all');
  const [q, setQ] = useState('');
  if (loading || !data) return <PageLoader />;
  if (!data.length) return <p className="text-label-2">La lista de adjetivos se está preparando.</p>;
  const toWord = (x: AdjectiveCategory['items'][number]): Word => ({
    w: x.w,
    es: x.es,
    ex: x.ex,
    level: x.level,
    emoji: x.emoji,
    badges: [x.opp ? `≠ ${x.opp}` : '', x.comp ?? ''].filter(Boolean),
  });
  const total = data.reduce((n, c) => n + c.items.length, 0);
  const cat = data.find((c) => c.id === sel);
  const n = q.trim().toLowerCase();
  const items = (cat ? cat.items : data.flatMap((c) => c.items)).filter((x) => !n || [x.w, x.es, x.opp ?? ''].some((s) => s.toLowerCase().includes(n)));
  const words = items.map(toWord);
  const color = cat?.color ?? 'var(--pink)';
  const cuts = cat ? cutsWhere((c) => c.adjectives === cat.id) : [];
  const allWords = data.flatMap((c) => c.items.map(toWord));
  return (
    <div>
      <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 py-1">
        <Chip active={sel === 'all'} onClick={() => setSel('all')}>
          Todos · {total}
        </Chip>
        {data.map((c) => (
          <Chip key={c.id} active={sel === c.id} onClick={() => setSel(c.id)}>
            {c.emoji} {c.en} · {c.items.length}
          </Chip>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="bg-card flex h-11 min-w-[220px] flex-1 items-center gap-2 rounded-[12px] px-3 shadow-card">
          <Search size={18} className="text-label-3" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Busca un adjetivo en inglés o español…"
            className="placeholder:text-label-3 h-full flex-1 bg-transparent text-[16px] outline-none"
          />
        </label>
        <PdfButton
          build={() =>
            sheet(
              `Adjectives${cat ? `: ${cat.en}` : ''}`,
              cat ? cat.es : 'Adjetivos',
              cat?.tip_es ?? 'Study the words and complete the exercises.',
              words.slice(0, 40),
              gapQuiz(words.slice(0, 40), allWords, 12),
            )
          }
        />
      </div>
      {cat?.tip_es && <p className="text-label-2 mb-3 text-[14px]">💡 {cat.tip_es}</p>}
      {cuts.length > 0 && (
        <Card className="mb-4 p-4">
          <GrammarCuts cuts={cuts} color={color} title="En imágenes" bleed={false} />
        </Card>
      )}
      <WordGrid words={words} color={color} />
      {sel === 'all' && !n && (
        <Card className="mt-6 p-5">
          <div className="text-[18px] font-bold">El orden de los adjetivos</div>
          <p className="text-label-2 mt-1 text-[14px]">Cuando usas varios adjetivos antes de un sustantivo, siguen este orden (nunca como en español: el sustantivo va al final).</p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {ORDER.map(([k, ex], i) => (
              <span key={k} className="bg-fill-2 rounded-[10px] px-2.5 py-1.5 text-[13px]">
                <b>
                  {i + 1}. {k}
                </b>{' '}
                <span className="text-label-2">{ex}</span>
              </span>
            ))}
          </div>
          <p className="mt-3 text-[15px]">
            a <b>beautiful big old round blue Mexican wooden dining</b> table <SpeakButton text="a beautiful big old round blue Mexican wooden dining table" size={15} />
          </p>
        </Card>
      )}
      <Quiz
        title={cat ? `Completa con el adjetivo · ${cat.en}` : 'Completa con el adjetivo'}
        color={color}
        refId={`adjectives:${cat?.id ?? 'all'}`}
        make={() => gapQuiz(cat ? words : shuffle(allWords).slice(0, 60), allWords, 8)}
        pdf={(qs) => sheet(`Adjectives${cat ? `: ${cat.en}` : ''}`, cat?.es ?? 'Adjetivos', 'Complete the sentences.', words.slice(0, 30), qs)}
      />
    </div>
  );
}

// ----------------------------------------------------------------- adverbs --

function Adverbs() {
  const { data, loading } = useAsync(loadAdverbs, []);
  const [sel, setSel] = useState('manner');
  if (loading || !data) return <PageLoader />;
  if (!data.length) return <p className="text-label-2">Los adverbios se están preparando.</p>;
  const t = data.find((x) => x.id === sel) ?? data[0]!;
  const toWord = (x: AdverbType['items'][number]): Word => ({
    w: x.w,
    es: x.es,
    ex: x.ex,
    level: x.level,
    badges: [x.from ? `de ${x.from}` : '', x.expr ? 'expresión' : ''].filter(Boolean),
  });
  const words = t.items.map(toWord);
  const others = data.filter((x) => x.id !== t.id).flatMap((x) => x.items.map(toWord));
  return (
    <div>
      <GroupTiles groups={data} value={t.id} onChange={setSel} sub={(g) => `${g.q_es} · ${g.items.length}`} />
      <AnimatePresence mode="wait">
        <motion.div key={t.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5">
          <Card className="mb-4 flex flex-wrap items-start gap-4 p-5" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${t.color} 14%, var(--card)), var(--card) 70%)` }}>
            <span className="text-[44px] leading-none">{t.emoji}</span>
            <div className="min-w-[220px] flex-1">
              <div className="text-[22px] font-extrabold" style={{ color: ink(t.color) }}>
                {t.en} <span className="text-label-2 text-[15px] font-semibold">· {t.es}</span>
              </div>
              <div className="mt-1 inline-flex rounded-full px-2.5 py-0.5 text-[13px] font-bold" style={{ color: ink(t.color), background: `color-mix(in srgb, ${t.color} 14%, transparent)` }}>
                {t.q} · {t.q_es}
              </div>
              <p className="mt-2 text-[15px]">{t.rule_es}</p>
              {t.formation_es && <p className="text-label-2 mt-1.5 text-[13.5px]">🛠️ {t.formation_es}</p>}
            </div>
            <PdfButton build={() => sheet(t.en, t.es, t.rule_es, words, gapQuiz(words, others, 10))} />
          </Card>
          <p className="text-label-2 mb-3 text-[13px]">Toca una tarjeta para ver el ejemplo y escucharlo.</p>
          <WordGrid words={words} color={t.color} />
          <Quiz
            title={`¿Qué adverbio va? · ${t.en}`}
            color={t.color}
            refId={`adverbs:${t.id}`}
            make={() => gapQuiz(words, others, 8)}
            pdf={(qs) => sheet(t.en, t.es, t.rule_es, words, qs)}
          />
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
