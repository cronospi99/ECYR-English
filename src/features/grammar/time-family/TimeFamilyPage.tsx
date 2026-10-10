import { useSearchParams } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Toggle } from '@/components/ui/Misc';
import { useSettings } from '@/store/settings';
import { AGENDA } from './data';
import { ClockTool, TimeQuiz, TimeRules } from './clock';
import { FamilyHomework, FamilyRiddles, FamilyTree, FamilyVocabQuiz, FamilyWords } from './family';
import { GenitiveBuilder, GenitiveQuiz, GenitiveRules } from './genitiveTools';
import { SayingCard, ScorePills } from './shared';

export { ClockFace, ClockTool, TimeQuiz, TimeRules } from './clock';
export { FamilyHomework, FamilyRiddles, FamilyTree, FamilyVocabQuiz, FamilyWords, TreeQuiz } from './family';
export { GenitiveBuilder, GenitiveQuiz, GenitiveRules } from './genitiveTools';
export { SayingCard } from './shared';
export { TIME_FAMILY_TOOLS, type TimeFamilyTool, type TimeFamilyToolId } from './tools';

type Tab = 'home' | 'clock' | 'timequiz' | 'vocab' | 'riddles' | 'tree' | 'genitive' | 'homework';
const TABS: { value: Tab; label: string }[] = [
  { value: 'home', label: 'Inicio' },
  { value: 'clock', label: 'Reloj' },
  { value: 'timequiz', label: '¿Qué hora es?' },
  { value: 'vocab', label: 'La familia' },
  { value: 'riddles', label: 'Adivina' },
  { value: 'tree', label: 'Árbol' },
  { value: 'genitive', label: 'Genitivo ’s' },
  { value: 'homework', label: 'Tarea' },
];

const AGENDA_COLOR: Record<string, string> = { clock: 'var(--teal)', vocab: 'var(--green)', genitive: 'var(--purple)', homework: 'var(--orange)' };
const MORE: { tab: Tab; title: string; body: string }[] = [
  { tab: 'timequiz', title: 'Time quiz', body: 'Lee el reloj o pon la hora tú.' },
  { tab: 'riddles', title: 'Guess who', body: 'Adivinanzas de parentesco.' },
  { tab: 'tree', title: 'Family tree', body: 'Crea tu árbol y responde preguntas.' },
];

export default function TimeFamilyPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.value === params.get('tab'))?.value ?? 'home') as Tab;
  const go = (t: Tab) => {
    setParams({ tab: t });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const showEs = useSettings((s) => s.spanishHints);
  const setSettings = useSettings((s) => s.set);

  return (
    <Page
      back={{ to: '/learn/grammar', label: 'Gramática' }}
      eyebrow="A1 · La hora, la familia y el genitivo sajón"
      title="Time & Family"
      subtitle="Di la hora con un reloj interactivo, aprende el vocabulario de la familia, crea tu árbol genealógico y domina el ’s."
      wide
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <ScorePills />
          <label className="flex items-center gap-2 text-[14px] font-medium">
            <Toggle checked={showEs} onChange={(v) => setSettings({ spanishHints: v })} label="Mostrar español" />
            Español
          </label>
        </div>
      }
    >
      <div className="no-scrollbar -mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Segmented<Tab> value={tab} onChange={(t) => setParams({ tab: t })} options={TABS} />
      </div>

      {tab === 'home' && (
        <div className="space-y-5">
          <SayingCard />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {AGENDA.map((a) => (
              <Card key={a.n} className="flex flex-col p-5">
                <span className="flex h-11 w-11 items-center justify-center rounded-full text-[17px] font-bold text-white" style={{ background: AGENDA_COLOR[a.tab] }}>
                  {a.n}
                </span>
                <h3 className="text-title-3 mt-3">{a.title}</h3>
                <p className="text-label-2 mt-1 flex-1 text-[15px]">{a.body}</p>
                <button type="button" onClick={() => go(a.tab)} className="text-ios-blue mt-3 inline-flex items-center gap-0.5 self-start text-[15px] font-semibold">
                  Start · Empezar <ChevronRight size={16} />
                </button>
              </Card>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {MORE.map((m) => (
              <button key={m.tab} type="button" onClick={() => go(m.tab)} className="bg-card shadow-card hover:bg-fill-2 flex items-center gap-3 rounded-[16px] p-4 text-left transition-colors">
                <span className="min-w-0 flex-1">
                  <span className="text-headline block">{m.title}</span>
                  <span className="text-label-2 block text-[14px]">{m.body}</span>
                </span>
                <ChevronRight size={18} className="text-label-3" />
              </button>
            ))}
          </div>
        </div>
      )}

      {tab === 'clock' && (
        <div className="space-y-8">
          <ClockTool />
          <section>
            <h2 className="text-title-2 mb-3 px-1">How to tell the time · Cómo decir la hora</h2>
            <TimeRules />
          </section>
        </div>
      )}
      {tab === 'timequiz' && (
        <div className="mx-auto max-w-4xl">
          <TimeQuiz />
        </div>
      )}
      {tab === 'vocab' && (
        <div className="space-y-8">
          <FamilyWords />
          <div className="mx-auto max-w-2xl">
            <FamilyVocabQuiz />
          </div>
        </div>
      )}
      {tab === 'riddles' && (
        <div className="mx-auto max-w-4xl">
          <FamilyRiddles />
        </div>
      )}
      {tab === 'tree' && <FamilyTree />}
      {tab === 'genitive' && (
        <div className="space-y-6">
          <GenitiveRules />
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            <GenitiveQuiz />
            <GenitiveBuilder />
          </div>
        </div>
      )}
      {tab === 'homework' && <FamilyHomework />}
    </Page>
  );
}
