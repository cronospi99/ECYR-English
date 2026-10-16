import { Fragment, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, BookOpen, Clock, Square, Volume2 } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip, LevelChip, PageLoader } from '@/components/ui/Misc';
import { QuestionSet, questionsToSections } from '@/components/learning/QuestionSet';
import { PdfButton } from '@/components/learning/PdfButton';
import { useAsync } from '@/hooks/useAsync';
import { loadLibReadings, type LibReading } from '@/content/library';
import { CEFR_LEVELS, type CefrLevel } from '@/content/types';
import { useProgress } from '@/store/progress';
import { speak, stopSpeaking } from '@/lib/speech';
import type { Worksheet } from '@/lib/worksheet';
import { cn } from '@/lib/cn';

const GENRE_ES: Record<string, string> = {
  story: 'Historia',
  email: 'Correo',
  article: 'Artículo',
  news: 'Noticia',
  biography: 'Biografía',
  blog: 'Blog',
  review: 'Reseña',
  interview: 'Entrevista',
  notice: 'Aviso',
  guide: 'Guía',
  opinion: 'Opinión',
  science: 'Ciencia',
  report: 'Informe',
  essay: 'Ensayo',
};
const minutes = (words: number) => Math.max(1, Math.round(words / 130));

export function ReadingLibrary() {
  const { data, loading } = useAsync(loadLibReadings, []);
  const [params, setParams] = useSearchParams();
  const [level, setLevel] = useState<CefrLevel | 'all'>('all');
  const [genre, setGenre] = useState('all');
  const done = useProgress((s) => s.readings);
  if (loading || !data) return <PageLoader />;

  const open = data.find((r) => r.id === params.get('lib'));
  if (open) return <Reader r={open} onBack={() => setParams({ tab: 'library' })} />;

  const genres = [...new Set(data.map((r) => r.genre))];
  const list = data.filter((r) => (level === 'all' || r.level === level) && (genre === 'all' || r.genre === genre));
  return (
    <div>
      <div className="no-scrollbar -mx-1 mb-2 flex gap-2 overflow-x-auto px-1 py-1">
        <Chip active={level === 'all'} onClick={() => setLevel('all')}>
          Todos · {data.length}
        </Chip>
        {CEFR_LEVELS.filter((l) => data.some((r) => r.level === l)).map((l) => (
          <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
            {l}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-1">
        <Chip active={genre === 'all'} onClick={() => setGenre('all')}>
          Todos los tipos
        </Chip>
        {genres.map((g) => (
          <Chip key={g} active={genre === g} onClick={() => setGenre(g)}>
            {GENRE_ES[g] ?? g}
          </Chip>
        ))}
      </div>
      {!data.length && <p className="text-label-2">Las lecturas se están preparando.</p>}
      <p className="text-label-2 mb-3 text-[12.5px]">
        Textos originales de ECYR English. Las personas, empresas, estudios y cifras de las noticias, informes e historias son ficticios, salvo en las
        biografías y temas históricos.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((r, i) => (
          <motion.button
            key={r.id}
            type="button"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.015, 0.4) }}
            onClick={() => setParams({ tab: 'library', lib: r.id })}
            className="bg-card shadow-card flex items-start gap-3 rounded-[18px] p-4 text-left transition-transform active:scale-[0.99]"
          >
            <span className="bg-fill-2 flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-[26px]">{r.emoji}</span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-1.5">
                <LevelChip level={r.level} />
                <span className="text-label-2 text-[12px] font-semibold">{GENRE_ES[r.genre] ?? r.genre}</span>
                {done[`lib-${r.id}`] && <span className="text-ink-green text-[12px] font-semibold">✓ {done[`lib-${r.id}`]!.score}%</span>}
              </span>
              <span className="mt-1 block text-[16px] leading-snug font-bold">{r.title}</span>
              <span className="text-label-2 mt-0.5 flex items-center gap-1 text-[12.5px]">
                {r.topic} · <Clock size={12} /> {minutes(r.words)} min · {r.questions.length} preguntas
              </span>
            </span>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

export function readingSheet(r: LibReading): Worksheet {
  return {
    title: r.title,
    subtitle: `Reading · ${r.level} · ${r.topic}`,
    level: r.level,
    intro: 'Read the text carefully, then answer the questions.',
    sections: [
      { kind: 'text', paragraphs: r.paragraphs },
      { kind: 'words', title: 'Glossary', items: r.glossary.map(([en, es]) => ({ en, es })) },
      ...questionsToSections(r.questions),
    ],
    credits: 'Texto original de ECYR English.',
  };
}

function Reader({ r, onBack }: { r: LibReading; onBack: () => void }) {
  const [reading, setReading] = useState<number | null>(null);
  const [gloss, setGloss] = useState<string | null>(null);
  const completeReading = useProgress((s) => s.completeReading);
  const glossary = useMemo(() => new Map(r.glossary.map(([en, es]) => [en.toLowerCase(), es])), [r]);
  const terms = useMemo(() => [...glossary.keys()].sort((a, b) => b.length - a.length), [glossary]);

  const read = (i: number) => {
    if (reading === i) {
      stopSpeaking();
      setReading(null);
      return;
    }
    setReading(i);
    speak(r.paragraphs[i]!, { rate: 0.92, onEnd: () => setReading((x) => (x === i ? null : x)) });
  };

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="plain" onClick={onBack}>
          <ArrowLeft size={16} /> Biblioteca
        </Button>
        <PdfButton build={() => readingSheet(r)} />
      </div>
      <Card className="overflow-hidden">
        <div className="brand-gradient p-5 text-white sm:p-6">
          <div className="flex items-center gap-2 text-[13px] font-semibold opacity-90">
            <span className="rounded-full bg-white/20 px-2 py-0.5">{r.level}</span> {GENRE_ES[r.genre] ?? r.genre} · {r.topic} · {minutes(r.words)} min
          </div>
          <h2 className="mt-2 text-[26px] leading-tight font-extrabold">
            {r.emoji} {r.title}
          </h2>
          <p className="mt-1 text-[13px] opacity-85">Toca las palabras subrayadas para ver su traducción.</p>
        </div>
        <div className="space-y-4 p-5 sm:p-6">
          {r.paragraphs.map((p, i) => (
            <div key={i} className={cn('group flex gap-2 rounded-[12px] transition-colors', reading === i && 'bg-[color-mix(in_srgb,var(--blue)_8%,transparent)]')}>
              <p className="flex-1 text-[17px] leading-[1.7]">
                <Glossed text={p} terms={terms} onTap={setGloss} />
              </p>
              <button type="button" onClick={() => read(i)} className="text-ink-blue mt-1 h-8 w-8 shrink-0 rounded-full hover:bg-fill-2" aria-label={reading === i ? 'Detener' : 'Escuchar párrafo'}>
                {reading === i ? <Square size={15} className="mx-auto" /> : <Volume2 size={16} className="mx-auto" />}
              </button>
            </div>
          ))}
          {gloss && (
            <div className="bg-fill-2 sticky bottom-20 flex items-center justify-between gap-3 rounded-[14px] px-4 py-2.5 shadow-float sm:bottom-4">
              <span>
                <b>{gloss}</b> — {glossary.get(gloss.toLowerCase())}
              </span>
              <button type="button" className="text-ink-blue text-[14px] font-semibold" onClick={() => setGloss(null)}>
                OK
              </button>
            </div>
          )}
        </div>
      </Card>

      {r.glossary.length > 0 && (
        <Card className="mt-4 p-5">
          <div className="text-label-2 mb-2 flex items-center gap-2 text-[12px] font-bold tracking-wide uppercase">
            <BookOpen size={14} /> Glosario
          </div>
          <div className="grid gap-x-6 gap-y-1.5 sm:grid-cols-2">
            {r.glossary.map(([en, es]) => (
              <div key={en} className="text-[15px]">
                <b>{en}</b> <span className="text-label-2">— {es}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <h3 className="mt-6 mb-2 text-[20px] font-bold">Preguntas</h3>
      <QuestionSet
        questions={r.questions}
        onChecked={(right, total) => completeReading(`lib-${r.id}`, Math.round((right / total) * 100), r.title, r.level)}
      />
    </div>
  );
}

/** Underlines glossary words; tapping one shows its translation. */
function Glossed({ text, terms, onTap }: { text: string; terms: string[]; onTap: (t: string) => void }) {
  if (!terms.length) return <>{text}</>;
  const re = new RegExp(`\\b(${terms.map((t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})\\b`, 'gi');
  const parts = text.split(re);
  return (
    <>
      {parts.map((p, i) =>
        i % 2 ? (
          <button key={i} type="button" onClick={() => onTap(p)} className="decoration-ios-blue/60 underline decoration-dotted decoration-2 underline-offset-4">
            {p}
          </button>
        ) : (
          <Fragment key={i}>{p}</Fragment>
        ),
      )}
    </>
  );
}
