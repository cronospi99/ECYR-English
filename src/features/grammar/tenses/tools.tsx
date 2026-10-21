import type { ComponentType } from 'react';
import type { TenseId } from './data';
import { TenseLab } from './TenseTools';

/**
 * Tense Timeline pieces that lessons embed (src/features/grammar/unitTools.tsx):
 * the same Write / Build / Practice lab, focused on the unit's tenses.
 */
const lab = (focus: TenseId[] | undefined, title: string, passiveDefault = false): ComponentType =>
  function UnitTenseLab() {
    return <TenseLab focus={focus} title={title} passiveDefault={passiveDefault} />;
  };

export const TENSE_TOOLS: Record<string, { title: string; Component: ComponentType }> = {
  present: { title: 'Presente simple y continuo', Component: lab(['presentSimple', 'presentContinuous'], 'Línea del tiempo · presente') },
  past: { title: 'Pasado simple y continuo', Component: lab(['pastSimple', 'pastContinuous'], 'Línea del tiempo · pasado') },
  perfect: { title: 'Presente perfecto', Component: lab(['presentPerfect', 'presentPerfectContinuous', 'pastSimple'], 'Línea del tiempo · presente perfecto') },
  narrative: { title: 'Tiempos narrativos', Component: lab(['pastSimple', 'pastContinuous', 'pastPerfect', 'pastPerfectContinuous'], 'Línea del tiempo · tiempos narrativos') },
  future: { title: 'Futuro', Component: lab(['futureSimple', 'goingTo', 'presentContinuous', 'futureContinuous', 'futurePerfect'], 'Línea del tiempo · futuro') },
  'future-perfect': { title: 'Futuro perfecto y continuo', Component: lab(['futurePerfect', 'futurePerfectContinuous', 'futureContinuous'], 'Línea del tiempo · futuro perfecto') },
  habits: { title: 'Used to y would', Component: lab(['usedTo', 'wouldHabit', 'pastSimple'], 'Línea del tiempo · hábitos pasados') },
  compare: { title: 'Comparar tiempos', Component: lab(['presentSimple', 'pastSimple', 'presentPerfect', 'futureSimple', 'goingTo'], 'Línea del tiempo · comparar tiempos') },
  passive: { title: 'Pasiva', Component: lab(['presentSimple', 'pastSimple', 'presentContinuous', 'presentPerfect', 'futureSimple'], 'Línea del tiempo · pasiva', true) },
  all: { title: 'Tense Timeline', Component: lab(undefined, 'Tense Timeline') },
};
