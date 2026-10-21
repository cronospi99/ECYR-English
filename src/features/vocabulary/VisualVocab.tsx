import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { PageLoader } from '@/components/ui/Misc';
import { useAsync } from '@/hooks/useAsync';
import { loadVisualTopics, VISUAL_LEVELS, type VisualTopic } from '@/content/vocabVisual';
import type { CefrLevel } from '@/content/types';
import { currentLevel, useProgress } from '@/store/progress';
import { ink } from '@/lib/color';
import { VisualLesson } from './VisualLesson';

const LEVEL_ES: Record<CefrLevel, string> = { A1: 'Principiante', A2: 'Básico', B1: 'Intermedio', B2: 'Intermedio alto', C1: 'Avanzado', C2: 'Maestría' };

function TopicCard({ t, onOpen, i }: { t: VisualTopic; onOpen: () => void; i: number }) {
  const preview = t.items.filter((x) => x.img || x.emoji).slice(0, 4);
  return (
    <motion.button
      type="button"
      onClick={onOpen}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: i * 0.03 }}
      whileHover={{ y: -3 }}
      whileTap={{ scale: 0.98 }}
      className="bg-card shadow-card group flex flex-col overflow-hidden rounded-[20px] text-left"
    >
      <div className="grid h-32 grid-cols-4 gap-1 p-2" style={{ background: `color-mix(in srgb, ${t.color} 14%, var(--card))` }}>
        {t.cover ? (
          <div className="col-span-2 row-span-1 overflow-hidden rounded-[12px] bg-white">
            <img src={t.cover} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
          </div>
        ) : (
          <div className="col-span-2 flex items-center justify-center rounded-[12px] bg-white text-[48px]">{t.emoji}</div>
        )}
        <div className="col-span-2 grid grid-cols-2 gap-1">
          {preview.map((w) => (
            <div key={w.id} className="flex items-center justify-center overflow-hidden rounded-[9px] bg-white">
              {w.img ? <img src={w.img} alt="" loading="lazy" className="h-full w-full object-contain p-0.5" /> : <span className="text-[22px]">{w.emoji}</span>}
            </div>
          ))}
        </div>
      </div>
      <div className="flex flex-1 items-start gap-2 p-3.5">
        <div className="min-w-0 flex-1">
          <div className="text-[16.5px] leading-tight font-bold">
            {t.emoji} {t.title}
          </div>
          <div className="text-label-2 mt-0.5 text-[13px] leading-snug">
            {t.titleEs} · {t.items.length}
          </div>
        </div>
        <ChevronRight size={18} className="text-label-3 mt-0.5 shrink-0 transition-transform group-hover:translate-x-0.5" style={{ color: ink(t.color) }} />
      </div>
    </motion.button>
  );
}

/** Práctica › Vocabulario › Vocabulario visual: levels → topics → lesson. */
export function VisualVocab() {
  const [params, setParams] = useSearchParams();
  const myLevel = useProgress((s) => currentLevel(s.units));
  const level = (VISUAL_LEVELS.find((l) => l === params.get('level')) ?? (VISUAL_LEVELS.includes(myLevel) ? myLevel : 'A1')) as CefrLevel;
  const topicId = params.get('topic');
  const { data, loading } = useAsync(() => loadVisualTopics(level), [level]);
  const topic = data?.find((t) => t.id === topicId) ?? null;
  const go = (next: { level?: CefrLevel; topic?: string | null }) => {
    const p = new URLSearchParams(params);
    p.set('tab', 'visual');
    if (next.level) p.set('level', next.level);
    if (next.topic) p.set('topic', next.topic);
    else if (next.topic === null) p.delete('topic');
    setParams(p, { replace: !next.topic });
  };
  useEffect(() => {
    if (topicId) window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [topicId]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="no-scrollbar max-w-full overflow-x-auto">
          <Segmented<CefrLevel> value={level} onChange={(l) => go({ level: l, topic: null })} options={VISUAL_LEVELS.map((l) => ({ value: l, label: l }))} />
        </div>
        <span className="text-label-2 text-[14px]">
          {LEVEL_ES[level]}
          {data ? ` · ${data.length} temas` : ''}
        </span>
      </div>
      {loading || !data ? (
        <PageLoader />
      ) : (
        <AnimatePresence mode="wait">
          {topic ? (
            <motion.div key={topic.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
              <button type="button" onClick={() => go({ topic: null })} className="text-ink-blue mb-3 -ml-1 inline-flex items-center text-[15px] font-semibold hover:opacity-70">
                <ChevronLeft size={20} /> Temas de {level}
              </button>
              <VisualLesson topic={topic} />
              <OtherTopics topics={data} current={topic.id} onOpen={(id) => go({ topic: id })} />
            </motion.div>
          ) : (
            <motion.div key={`grid-${level}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {data.length ? (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {data.map((t, i) => (
                    <TopicCard key={t.id} t={t} i={i} onOpen={() => go({ topic: t.id })} />
                  ))}
                </div>
              ) : (
                <Card className="text-label-2 p-6 text-center">Los temas de este nivel se están preparando.</Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      )}
    </div>
  );
}

function OtherTopics({ topics, current, onOpen }: { topics: VisualTopic[]; current: string; onOpen: (id: string) => void }) {
  const rest = topics.filter((t) => t.id !== current);
  if (!rest.length) return null;
  return (
    <div className="mt-8">
      <h3 className="text-title-3 mb-3 px-1">Más temas de este nivel</h3>
      <div className="no-scrollbar -mx-4 flex gap-2.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {rest.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => onOpen(t.id)}
            className="bg-card shadow-card flex w-[220px] shrink-0 items-center gap-3 rounded-[16px] p-2.5 text-left"
          >
            <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-white text-[26px]">
              {t.cover ? <img src={t.cover} alt="" loading="lazy" className="h-full w-full object-contain p-0.5" /> : t.emoji}
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[14.5px] font-bold">{t.title}</span>
              <span className="text-label-2 block truncate text-[12px]">{t.titleEs}</span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
