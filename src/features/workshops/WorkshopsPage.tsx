import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, BookOpen, ChevronRight, Dumbbell } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Chip, LevelChip, PageLoader } from '@/components/ui/Misc';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { QuestionSet, questionsToSections } from '@/components/learning/QuestionSet';
import { PdfButton } from '@/components/learning/PdfButton';
import { GrammarCuts } from '@/components/visuals/GrammarCuts';
import { useAsync } from '@/hooks/useAsync';
import { loadWorkshops, type LibQuestion, type Workshop } from '@/content/library';
import { cutsFor } from '@/content/visuals';
import { CEFR_LEVELS, type CefrLevel } from '@/content/types';
import { useProgress } from '@/store/progress';
import type { Worksheet } from '@/lib/worksheet';
import { ExternalResources } from '@/features/library/ExternalResources';
import { ink } from '@/lib/color';

/** Workshop items take their type from their set. */
const setQuestions = (s: Workshop['sets'][number]) => s.items.map((it) => ({ ...it, type: s.type }) as LibQuestion);

const LEVEL_COLOR: Record<string, string> = { A1: 'var(--green)', A2: 'var(--teal)', B1: 'var(--blue)', B2: 'var(--indigo)', C1: 'var(--purple)', C2: 'var(--pink)' };

export default function WorkshopsPage() {
  const { id } = useParams();
  const { data, loading } = useAsync(loadWorkshops, []);
  if (loading || !data) return <PageLoader />;
  const w = id ? data.find((x) => x.id === id) : undefined;
  return w ? <WorkshopView w={w} /> : <WorkshopList all={data} />;
}

function WorkshopList({ all }: { all: Workshop[] }) {
  const [level, setLevel] = useState<CefrLevel | 'all'>('all');
  const done = useProgress((s) => s.activity);
  const doneIds = useMemo(() => new Set(done.filter((a) => a.ref?.startsWith('workshop:')).map((a) => a.ref!.slice(9))), [done]);
  const list = all.filter((w) => level === 'all' || w.level === level);
  return (
    <Page
      back={{ to: '/practice', label: 'Práctica' }}
      eyebrow="Gramática por niveles"
      title="Talleres"
      subtitle={`${all.length} talleres de A1 a C1: explicación corta, errores típicos, cuatro tipos de ejercicio y tarea en PDF.`}
      wide
    >
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-1">
        <Chip active={level === 'all'} onClick={() => setLevel('all')}>
          Todos · {all.length}
        </Chip>
        {CEFR_LEVELS.filter((l) => all.some((w) => w.level === l)).map((l) => (
          <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
            {l} · {all.filter((w) => w.level === l).length}
          </Chip>
        ))}
      </div>
      {!all.length && <p className="text-label-2">Los talleres se están preparando.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((w, i) => {
          const color = LEVEL_COLOR[w.level] ?? 'var(--blue)';
          return (
            <motion.div key={w.id} className="min-w-0" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i * 0.015, 0.4) }}>
              <Link to={`/practice/workshops/${w.id}`}>
                <Card className="flex h-full items-center gap-3.5 p-4 transition-transform active:scale-[0.99]" style={{ background: `linear-gradient(135deg, color-mix(in srgb, ${color} 12%, var(--card)), var(--card) 65%)` }}>
                  <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] text-[30px]" style={{ background: `color-mix(in srgb, ${color} 16%, transparent)` }}>
                    {w.emoji}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <LevelChip level={w.level} />
                      {doneIds.has(w.id) && <span className="text-ink-green text-[12px] font-semibold">✓ Hecho</span>}
                    </span>
                    <span className="mt-1 block truncate text-[16px] font-bold">{w.title}</span>
                    <span className="text-label-2 block truncate text-[13px]">{w.titleEs}</span>
                  </span>
                  <ChevronRight className="text-label-3 shrink-0" size={18} />
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>
      <ExternalResources className="mt-8" />
    </Page>
  );
}

export function workshopSheet(w: Workshop, sets = w.sets): Worksheet {
  return {
    title: w.title,
    subtitle: `${w.titleEs} · ${w.level}`,
    level: w.level,
    intro: w.summary_es,
    sections: [
      { kind: 'rules', title: 'Remember', rules: w.rules.map((r) => ({ h: r.h, body: r.body_es, examples: r.examples })) },
      ...sets.flatMap((s) => questionsToSections(setQuestions(s)).map((sec) => ('items' in sec && sec.kind !== 'words' ? { ...sec, title: s.title } : sec))),
    ],
    credits: 'Material original de ECYR English.',
  };
}

function WorkshopView({ w }: { w: Workshop }) {
  const [set, setSet] = useState(0);
  const award = useProgress((s) => s.award);
  const color = LEVEL_COLOR[w.level] ?? 'var(--blue)';
  const cuts = useMemo(() => cutsFor(w.title, w.titleEs), [w]);
  const cur = w.sets[set];
  const curQuestions = useMemo(() => (cur ? setQuestions(cur) : []), [cur]);

  return (
    <Page
      back={{ to: '/practice/workshops', label: 'Talleres' }}
      eyebrow={`Taller · ${w.level}`}
      title={`${w.emoji} ${w.title}`}
      subtitle={w.titleEs}
      actions={<PdfButton build={() => workshopSheet(w)} />}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        <Card className="p-5" style={{ background: `linear-gradient(160deg, color-mix(in srgb, ${color} 14%, var(--card)), var(--card) 70%)` }}>
          <p className="text-[16px] leading-relaxed">{w.summary_es}</p>
        </Card>

        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-wide uppercase" style={{ color: ink(color) }}>
            <BookOpen size={16} /> La regla
          </h2>
          {w.rules.map((r, i) => (
            <Card key={i} className="p-4">
              <div className="text-[16px] font-bold">{r.h}</div>
              <p className="text-label-2 mt-1 text-[15px] leading-snug">{r.body_es}</p>
              {r.table && r.table.length > 0 && (
                <div className="no-scrollbar mt-3 overflow-x-auto">
                  <table className="w-full min-w-[320px] border-collapse text-[14px]">
                    <tbody>
                      {r.table.map((row, ri) => (
                        <tr key={ri} className="border-separator border-b last:border-0">
                          {row.map((c, ci) => (
                            <td key={ci} className={ci === 0 ? 'py-1.5 pr-3 font-semibold' : 'py-1.5 pr-3'} style={ci === row.length - 1 ? { color: ink(color) } : undefined}>
                              {c}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {r.examples && r.examples.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {r.examples.map((e) => (
                    <li key={e} className="flex items-center gap-2 rounded-[10px] px-3 py-1.5 text-[15px]" style={{ background: `color-mix(in srgb, ${color} 8%, transparent)` }}>
                      <span className="flex-1">{e}</span>
                      <SpeakButton text={e} size={15} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          ))}
        </section>

        {cuts.length > 0 && (
          <Card className="p-5">
            <GrammarCuts cuts={cuts} color={color} />
          </Card>
        )}

        {w.mistakes.length > 0 && (
          <section className="space-y-2">
            <h2 className="text-ink-orange flex items-center gap-2 text-[13px] font-bold tracking-wide uppercase">
              <AlertTriangle size={16} /> Errores típicos
            </h2>
            <div className="grid gap-2 sm:grid-cols-2">
              {w.mistakes.map((m, i) => (
                <Card key={i} className="p-3.5 text-[14.5px]">
                  <div className="text-label-2 line-through">{m.wrong}</div>
                  <div className="text-ink-green font-semibold">{m.right}</div>
                  <div className="text-label-2 mt-1 text-[13px]">{m.why_es}</div>
                </Card>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="flex items-center gap-2 text-[13px] font-bold tracking-wide uppercase" style={{ color: ink(color) }}>
              <Dumbbell size={16} /> Practica
            </h2>
            {cur && <PdfButton label="Solo este ejercicio" build={() => workshopSheet(w, [cur])} />}
          </div>
          <div className="no-scrollbar mb-4 overflow-x-auto">
            <Segmented size="sm" value={String(set)} onChange={(v) => setSet(Number(v))} options={w.sets.map((s, i) => ({ value: String(i), label: `${i + 1}. ${s.title}` }))} />
          </div>
          {cur && (
            <QuestionSet
              key={`${w.id}-${set}`}
              questions={curQuestions}
              color={color}
              onChecked={(right, total) =>
                award({ kind: 'topic', title: `Taller: ${w.title}`, skill: 'grammar', xp: 4 + right, score: Math.round((right / total) * 100), level: w.level, ref: `workshop:${w.id}` })
              }
            />
          )}
        </section>
      </div>
    </Page>
  );
}
