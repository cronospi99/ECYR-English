import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { VisualsFor } from '@/components/visuals/UnitVisuals';
import { Page } from '@/components/ui/Page';
import { Segmented } from '@/components/ui/Segmented';
import { AcademicVerbs } from './academic';
import { IrregularPatterns } from './irregular';
import { EdSoundDrill, EdSoundRules, PhrasalFamilies, VerbExplorer, VerbFormsQuiz, VerbPatterns, WithVerbLab } from './components';

const TenseLab = lazy(() => import('@/features/grammar/tenses/TenseTools').then((m) => ({ default: m.TenseLab })));

type Tab = 'verbs' | 'irregular' | 'academic' | 'ed' | 'quiz' | 'tenses' | 'phrasal' | 'patterns';
const TABS: { value: Tab; label: string }[] = [
  { value: 'verbs', label: 'Verbs' },
  { value: 'irregular', label: 'Irregulars by pattern' },
  { value: 'academic', label: '🎓 C1 academic' },
  { value: 'ed', label: '-ed pronunciation' },
  { value: 'quiz', label: 'Forms quiz' },
  { value: 'tenses', label: '⏱ Verb tenses' },
  { value: 'phrasal', label: 'Phrasal verbs' },
  { value: 'patterns', label: 'Patterns' },
];

export default function VerbLabPage() {
  const [params, setParams] = useSearchParams();
  const tab = (TABS.find((t) => t.value === params.get('tab'))?.value ?? 'verbs') as Tab;
  return (
    <Page
      back={{ to: '/practice', label: 'Practice' }}
      eyebrow="Tools for teaching and learning verbs"
      title="Verb Lab"
      subtitle="More than 1,500 verbs with their three forms, a C1 academic verbs section, the -ed sounds, phrasal verb families and the 10 English verb patterns."
      wide
    >
      <div className="no-scrollbar mb-5 overflow-x-auto">
        <Segmented<Tab> value={tab} onChange={(t) => setParams({ tab: t })} options={TABS} />
      </div>
      <WithVerbLab>
        {(data) => (
          <>
            {tab === 'verbs' && <VerbExplorer data={data} />}
            {tab === 'irregular' && <IrregularPatterns />}
            {tab === 'academic' && <AcademicVerbs />}
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
            {tab === 'tenses' && (
              <Suspense fallback={null}>
                <div className="mx-auto max-w-3xl">
                  <TenseLab title="Tense Timeline: escribe, construye, practica" />
                </div>
              </Suspense>
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
