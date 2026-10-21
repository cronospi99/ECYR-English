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
  { value: 'verbs', label: 'Verbos' },
  { value: 'irregular', label: 'Irregulares por patrones' },
  { value: 'academic', label: '🎓 C1 académicos' },
  { value: 'ed', label: 'Pronunciación -ed' },
  { value: 'quiz', label: 'Quiz de formas' },
  { value: 'tenses', label: '⏱ Tiempos verbales' },
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
      subtitle="Más de 1.400 verbos con sus tres formas, una sección de verbos académicos C1, los sonidos de -ed, familias de phrasal verbs y los 10 patrones verbales del inglés."
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
