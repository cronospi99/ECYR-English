import { useSearchParams } from 'react-router-dom';
import { VisualsFor } from '@/components/visuals/UnitVisuals';
import { Page } from '@/components/ui/Page';
import { Segmented } from '@/components/ui/Segmented';
import { EdSoundDrill, EdSoundRules, PhrasalFamilies, VerbExplorer, VerbFormsQuiz, VerbPatterns, WithVerbLab } from './components';

type Tab = 'verbs' | 'ed' | 'quiz' | 'phrasal' | 'patterns';
const TABS: { value: Tab; label: string }[] = [
  { value: 'verbs', label: 'Verbos' },
  { value: 'ed', label: 'Pronunciación -ed' },
  { value: 'quiz', label: 'Quiz de formas' },
  { value: 'phrasal', label: 'Phrasal verbs' },
  { value: 'patterns', label: 'Patrones' },
];

export default function VerbLabPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.value === params.get('tab'))?.value ?? 'verbs') as Tab;
  return (
    <Page
      back={{ to: '/practice', label: 'Práctica' }}
      eyebrow="Herramientas para enseñar y aprender verbos"
      title="Verb Lab"
      subtitle="750 verbos con sus tres formas, los sonidos de -ed, 32 familias de phrasal verbs y los 10 patrones verbales del inglés."
      wide
    >
      <div className="no-scrollbar mb-5 overflow-x-auto">
        <Segmented<Tab> value={tab} onChange={(t) => setParams({ tab: t })} options={TABS} />
      </div>
      <WithVerbLab>
        {(data) => (
          <>
            {tab === 'verbs' && <VerbExplorer data={data} />}
            {tab === 'ed' && (
              <div className="space-y-5">
                <EdSoundRules data={data} />
                <div className="mx-auto max-w-xl">
                  <EdSoundDrill data={data} />
                </div>
              </div>
            )}
            {tab === 'quiz' && (
              <div className="mx-auto max-w-xl">
                <VerbFormsQuiz data={data} />
              </div>
            )}
            {tab === 'phrasal' && <PhrasalFamilies data={data} />}
            {tab === 'patterns' && <VerbPatterns data={data} />}
          </>
        )}
      </WithVerbLab>
      <VisualsFor where={(p) => 'module' in p && p.module === 'verbs'} />
    </Page>
  );
}
