import { useEffect } from 'react';
import { VisualsFor } from '@/components/visuals/UnitVisuals';
import { GrammarCuts } from '@/components/visuals/GrammarCuts';
import { cutsWhere } from '@/content/visuals';
import { useSearchParams } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Segmented } from '@/components/ui/Segmented';
import { Button } from '@/components/ui/Button';
import { ArcadeHud, CertaintyScale, FormBuilder, FunctionMap, ModalExplorer, ModalIntro, ModalRules, ObligationScale, SemiModals } from './components';
import { BonusStage, FunctionQuiz, TrapSpotter } from './games';
import { useCollect, useModalsArcade } from './arcade';
import type { SectionId } from './data';

export { MODAL_TOOLS, FunctionFocus, type ModalToolId } from './tools';
export * from './components';
export { BonusStage, FunctionQuiz, TrapSpotter } from './games';

const TABS: { value: SectionId; label: string }[] = [
  { value: 'intro', label: 'Inicio' },
  { value: 'core', label: 'Los 9 core' },
  { value: 'marginal', label: 'Marginales' },
  { value: 'semi', label: 'Semi-modales' },
  { value: 'functions', label: 'Funciones' },
  { value: 'rules', label: 'Reglas' },
  { value: 'traps', label: 'Trampas' },
  { value: 'bonus', label: 'Bonus' },
];

export default function ModalsPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.value === params.get('tab'))?.value ?? 'intro';
  const collect = useCollect();
  const idx = TABS.findIndex((t) => t.value === tab);
  const next = TABS[idx + 1];

  // The section you land on counts as visited (silently: no gesture yet for audio).
  useEffect(() => {
    useModalsArcade.getState().collect(tab);
  }, [tab]);

  const go = (t: SectionId) => {
    if (t === tab) return;
    collect(t);
    setParams({ tab: t });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <Page
      back={{ to: '/learn/grammar', label: 'Gramática' }}
      eyebrow="Gramática · A1–C1"
      title="Modal Verbs"
      subtitle="Todos los modales, todos sus usos y todas sus excepciones: explicación paso a paso, tablas comparativas, trampas y un bonus stage."
      actions={<ArcadeHud />}
      wide
    >
      <div className="no-scrollbar -mx-4 mb-5 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <Segmented<SectionId> value={tab} onChange={go} options={TABS} />
      </div>

      {tab === 'intro' && <ModalIntro onNavigate={go} />}
      {tab === 'core' && <ModalExplorer key="core" group="core" />}
      {tab === 'marginal' && <ModalExplorer key="marginal" group="marginal" />}
      {tab === 'semi' && <SemiModals />}
      {tab === 'functions' && (
        <div className="space-y-10">
          <FunctionMap />
          <ObligationScale />
          <CertaintyScale />
          <div className="mx-auto max-w-xl">
            <FunctionQuiz />
          </div>
        </div>
      )}
      {tab === 'rules' && (
        <div className="space-y-8">
          <FormBuilder />
          <ModalRules />
        </div>
      )}
      {tab === 'traps' && (
        <div className="mx-auto max-w-2xl">
          <TrapSpotter />
        </div>
      )}
      {tab === 'bonus' && (
        <div className="mx-auto max-w-3xl">
          <BonusStage />
        </div>
      )}

      <GrammarCuts bleed={false} title="Can, could, should y must por partes" cuts={cutsWhere((c) => c.of === 'could' || c.of.startsWith('modals-'))} />
      <VisualsFor title="Modales en imágenes" where={(p) => 'module' in p && p.module === 'modals'} />

      {next && (
        <div className="mt-8 flex justify-end">
          <Button variant="tinted" onClick={() => go(next.value)}>
            Siguiente: {next.label} <ArrowRight size={16} />
          </Button>
        </div>
      )}
    </Page>
  );
}
