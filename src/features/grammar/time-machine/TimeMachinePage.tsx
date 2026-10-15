import { useEffect, useRef } from 'react';
import { VisualsFor } from '@/components/visuals/UnitVisuals';
import { GrammarCuts } from '@/components/visuals/GrammarCuts';
import { cutsWhere } from '@/content/visuals';
import { useSearchParams } from 'react-router-dom';
import { Page } from '@/components/ui/Page';
import { Segmented } from '@/components/ui/Segmented';
import { Toggle } from '@/components/ui/Misc';
import { useSettings } from '@/store/settings';
import { StagePanel, TimeMachineHub, type StageMode } from './components';
import type { StageId } from './data';

export {
  DateBuilderGame,
  DateFormatsTool,
  DaysOfWeek,
  EdSpellingDrill,
  IngSpellingTool,
  IrregularVerbsTable,
  MonthsGallery,
  OrdinalsTool,
  PastSimpleEdRules,
  SentenceTimeline,
  StageLesson,
  StageQuiz,
  TenseTimelineChart,
  TimeWords,
  VideoActivity,
  VideoNotebook,
  WasWereTool,
  YearReader,
} from './components';
export { TIME_MACHINE_TOOLS, type TimeMachineToolId } from './tools';

type Tab = 'home' | StageId;
const TABS: { value: Tab; label: string }[] = [
  { value: 'home', label: 'Inicio' },
  { value: 'months', label: 'Meses' },
  { value: 'dates', label: 'Fechas' },
  { value: 'years', label: 'Años' },
  { value: 'days', label: 'Días' },
  { value: 'past', label: 'Past simple' },
  { value: 'tobe', label: 'Was / Were' },
  { value: 'cont', label: 'Past continuous' },
  { value: 'perfect', label: 'Past perfect' },
  { value: 'timeline', label: 'Línea de tiempo' },
  { value: 'video', label: 'Video' },
];

export default function TimeMachinePage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.value === params.get('tab'))?.value ?? 'home') as Tab;
  const mode: StageMode = params.get('mode') === 'practice' ? 'practice' : 'learn';
  const es = useSettings((s) => s.spanishHints);
  const setSettings = useSettings((s) => s.set);
  const strip = useRef<HTMLDivElement>(null);

  // keep the active section visible in the horizontally scrolling strip (mobile)
  useEffect(() => {
    const box = strip.current;
    const el = box?.querySelector<HTMLElement>('[aria-selected="true"]');
    if (!box || !el) return;
    box.scrollLeft = el.offsetLeft - box.clientWidth / 2 + el.offsetWidth / 2;
  }, [tab]);

  const go = (t: Tab, m: StageMode = 'learn') => {
    setParams(t === 'home' ? {} : m === 'practice' ? { tab: t, mode: m } : { tab: t });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Page
      back={{ to: '/learn/grammar', label: 'Gramática' }}
      eyebrow="Fechas · días · tiempos pasados"
      title="Time Machine"
      subtitle="Meses, fechas, años y días de la semana, y las cuatro formas de hablar del pasado: past simple, was / were, past continuous y past perfect."
      actions={
        <label className="bg-card shadow-card flex items-center gap-2.5 rounded-full py-1 pr-1 pl-3.5 text-[14px] font-medium">
          Pistas ES
          <Toggle checked={es} onChange={(v) => setSettings({ spanishHints: v })} label="Pistas en español" />
        </label>
      }
      wide
    >
      <div ref={strip} className="no-scrollbar relative -mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Segmented<Tab> value={tab} onChange={(t) => go(t)} options={TABS} />
      </div>
      {tab === 'home' ? (
        <>
          <TimeMachineHub onOpen={(id) => go(id)} />
          <GrammarCuts bleed={false} title="Cada pasado, paso a paso" cuts={cutsWhere((c) => c.of === 'past-tenses')} />
          <VisualsFor title="Los pasados en una imagen" where={(p) => 'module' in p && p.module === 'time-machine'} />
        </>
      ) : (
        <StagePanel key={tab} id={tab} mode={mode} onMode={(m) => go(tab, m)} onNext={(next) => go(next ?? 'home')} />
      )}
    </Page>
  );
}
