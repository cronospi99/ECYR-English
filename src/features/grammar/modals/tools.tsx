/**
 * Embeddable Modal Verbs tools, keyed by id, so lessons can drop in exactly
 * the piece that matches their grammar point (e.g. MODAL_TOOLS.deduction).
 * Each entry lists the CEFR levels and syllabus topics it fits.
 */
import type { ComponentType } from 'react';
import type { CefrLevel } from '@/content/types';
import { Callout } from '@/components/learning/Callout';
import { TriangleAlert } from 'lucide-react';
import { ALL_MODALS, BONUS, FUNCTION_BY_ID, type FunctionId } from './data';
import {
  CertaintyScale,
  FormBuilder,
  FunctionCard,
  FunctionMap,
  ModalExplorer,
  ModalIntro,
  ModalRules,
  ObligationScale,
  SemiModals,
} from './components';
import { BonusStage, FunctionQuiz, TrapSpotter } from './games';

/**
 * One function (ability, permission…) in focus: its comparison card, the
 * danger boxes of the modals involved and the Bonus questions that test it.
 */
export function FunctionFocus({ fn, modals = [], extra = [] }: { fn: FunctionId; modals?: string[]; extra?: (FunctionId | 'form')[] }) {
  const f = FUNCTION_BY_ID[fn];
  const qs = BONUS.filter((q) => q.fn === fn || extra.includes(q.fn));
  const warns = ALL_MODALS.filter((m) => modals.includes(m.id));
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="space-y-3">
        <FunctionCard fn={fn} />
        {warns.map((m) => (
          <Callout key={m.id} tone="red" icon={<TriangleAlert size={16} />} title={`Zona de peligro · ${m.w}`}>
            {m.warn}
          </Callout>
        ))}
      </div>
      {qs.length > 0 && <BonusStage key={fn} items={qs} tool={fn} title={`Reto: ${f.es.toLowerCase()}`} />}
    </div>
  );
}

export interface ModalTool {
  title: string;
  description: string;
  levels: CefrLevel[];
  /** Syllabus grammar topics this tool fits (for mapping into units). */
  topics: string[];
  Component: ComponentType;
}

export const MODAL_TOOLS = {
  intro: {
    title: '¿Qué es un modal?',
    description: 'Hecho frente a actitud con un selector de modales y el mapa de las familias.',
    levels: ['A1', 'A2'],
    topics: ['Introducción a los modales', 'can / should'],
    Component: () => <ModalIntro />,
  },
  'core-modals': {
    title: 'Los 9 modales centrales',
    description: 'Explorador paso a paso: usos, negativa, pasado y zona de peligro de cada modal.',
    levels: ['A1', 'A2', 'B1'],
    topics: ['Modals overview', 'can / could / may / might / must / shall / should / will / would'],
    Component: () => <ModalExplorer group="core" />,
  },
  'marginal-modals': {
    title: 'Modales marginales',
    description: 'ought to, need, dare y used to: formas modales frente a verbos normales.',
    levels: ['A2', 'B1', 'B2'],
    topics: ['ought to', "needn't / needn't have", 'dare', 'used to'],
    Component: () => <ModalExplorer group="marginal" />,
  },
  'semi-modals': {
    title: 'Semi-modales',
    description: 'have to, had better, be able to, be supposed to, be allowed to, would rather…',
    levels: ['A2', 'B1', 'B2'],
    topics: ['have to', 'had better', 'be able to', 'be supposed to', 'would rather / would prefer', 'be allowed to'],
    Component: () => <SemiModals />,
  },
  'function-map': {
    title: 'Mapa de funciones',
    description: 'Tabla comparativa de significados (tarjetas filtrables y matriz modal × función).',
    levels: ['A2', 'B1', 'B2'],
    topics: ['Modals review', 'Meaning of modals'],
    Component: () => <FunctionMap />,
  },
  'function-quiz': {
    title: 'Quiz: ¿qué expresa?',
    description: '12 frases: identifica la función del modal (Quiz con opciones barajadas).',
    levels: ['A2', 'B1'],
    topics: ['Modals review'],
    Component: () => <FunctionQuiz />,
  },
  ability: {
    title: 'Habilidad: can, could, be able to',
    description: 'Comparativa de la habilidad + la trampa de could + reto.',
    levels: ['A1', 'A2', 'B1'],
    topics: ['can / can’t for ability', 'could for past ability', 'be able to', 'Accomplishments (managed to)'],
    Component: () => <FunctionFocus fn="ability" modals={['can', 'could']} />,
  },
  permission: {
    title: 'Permiso',
    description: 'can, could, may y be allowed to, con la ambigüedad de may not.',
    levels: ['A1', 'A2'],
    topics: ['Permission, obligation and prohibition', 'Asking for permission'],
    Component: () => <FunctionFocus fn="permission" modals={['may']} />,
  },
  requests: {
    title: 'Peticiones y ofrecimientos',
    description: 'can / could / will / would / shall I para pedir y ofrecer.',
    levels: ['A1', 'A2', 'B1'],
    topics: ['Yes/no questions with would', 'Requests with would', 'Requests with modals and “Would you mind…?”', 'will for responding to requests', 'Requests with modals, if-clauses and gerunds'],
    Component: () => <FunctionFocus fn="requests" modals={['shall', 'would']} />,
  },
  suggestions: {
    title: 'Sugerencias',
    description: 'shall we, could, might as well (+ consejo).',
    levels: ['A1', 'A2', 'B1'],
    topics: ['Suggestions and requests with can, could and should', 'Modals for necessity and suggestion', 'Making suggestions with modals'],
    Component: () => <FunctionFocus fn="suggestion" extra={['advice']} />,
  },
  advice: {
    title: 'Consejo: should, ought to, had better',
    description: 'Consejo y recomendación, con la zona de peligro de should y ought to.',
    levels: ['A1', 'A2', 'B1'],
    topics: ['Modals “can” and “should” for recommendations', 'had better', 'Recommendations and opinions with passive modals'],
    Component: () => <FunctionFocus fn="advice" modals={['should', 'ought']} />,
  },
  obligation: {
    title: "Obligación: must, have to, mustn't, don't have to",
    description: 'Escala necesario / recomendable / opcional / prohibido + reto de señales.',
    levels: ['A2', 'B1'],
    topics: ['Modals for necessity and suggestion', 'Permission, obligation and prohibition', 'must vs have to', "mustn't vs don't have to"],
    Component: () => <ObligationScale />,
  },
  'obligation-focus': {
    title: 'Obligación y prohibición (reto)',
    description: 'Tarjeta de obligación + zona de peligro de must y need + preguntas del Bonus.',
    levels: ['A2', 'B1', 'B2'],
    topics: ['Past modals of obligation', "needn't have vs didn't need to"],
    Component: () => <FunctionFocus fn="obligation" modals={['must', 'need']} extra={['no-obligation', 'prohibition']} />,
  },
  possibility: {
    title: 'Posibilidad: may, might, could',
    description: 'Posibilidad presente, futura y pasada.',
    levels: ['A2', 'B1'],
    topics: ['Modals and adverbs for degrees of certainty', 'may / might / could for possibility'],
    Component: () => <FunctionFocus fn="possibility" modals={['may', 'might']} />,
  },
  deduction: {
    title: "Deducción: must, might, can't (+ have)",
    description: 'Escala de certeza presente/pasado y detective de pistas.',
    levels: ['B1', 'B2'],
    topics: ['Modals and adverbs for degrees of certainty', 'Past modals for degrees of certainty', 'Modals for degrees of certainty about the past'],
    Component: () => <CertaintyScale />,
  },
  'past-modals': {
    title: 'Modales en pasado: should have, could have…',
    description: 'Crítica y arrepentimiento (modal + have + participio) + reto.',
    levels: ['A2', 'B1', 'B2'],
    topics: ['Past modals: should have and would have', 'Regret with should (not) have', 'Past modals for judgments and suggestions'],
    Component: () => <FunctionFocus fn="criticism" modals={['should', 'could']} />,
  },
  habits: {
    title: 'Hábitos pasados: used to y would',
    description: 'used to frente a would (acciones vs estados) + reto.',
    levels: ['A2', 'B1', 'B2', 'C1'],
    topics: ['Past habits and states with “used to”', 'Past habits: used to and would', 'will & would for habits'],
    Component: () => <FunctionFocus fn="habit" modals={['usedto', 'would']} />,
  },
  'form-rules': {
    title: 'Las diez leyes',
    description: 'Reglas de forma (sin -s, sin to, sin do, un modal, modal + have) con OK / NO.',
    levels: ['A1', 'A2', 'B1'],
    topics: ['Modals: form', 'Modals review'],
    Component: () => <ModalRules />,
  },
  'form-builder': {
    title: 'Constructor de frases',
    description: 'Afirmativa, negativa, pregunta y pasado de 8 modales, con significado y avisos.',
    levels: ['A1', 'A2', 'B1'],
    topics: ['Modals: form', 'Past modals'],
    Component: () => <FormBuilder />,
  },
  traps: {
    title: 'Cazador de trampas',
    description: '¿Correcta o incorrecta? 12 frases, tres vidas y combo.',
    levels: ['A2', 'B1', 'B2'],
    topics: ['Modals review', 'Common mistakes'],
    Component: () => <TrapSpotter />,
  },
  bonus: {
    title: 'Bonus stage',
    description: 'Las 14 preguntas del módulo original, un anillo por acierto.',
    levels: ['A2', 'B1', 'B2'],
    topics: ['Modals review'],
    Component: () => <BonusStage />,
  },
} satisfies Record<string, ModalTool>;

export type ModalToolId = keyof typeof MODAL_TOOLS;
