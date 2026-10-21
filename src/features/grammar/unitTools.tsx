import { lazy, Suspense, useMemo, useState, type ComponentType } from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight, Sigma } from 'lucide-react';
import type { CefrLevel, Unit } from '@/content/types';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';

/**
 * Picks the interactive grammar tools (Modal Verbs, Time & Family, Time Machine)
 * that fit a unit's grammar, the same way Verb Lab does for verb forms.
 * Each module's registry is code-split and only loaded when a unit needs it.
 */
type ModuleId = 'modals' | 'time-family' | 'time-machine' | 'do-make' | 'tenses';
type Registry = Record<string, { title: string; Component: ComponentType }>;

const REGISTRIES: Record<ModuleId, () => Promise<Registry>> = {
  modals: () => import('./modals/tools').then((m) => m.MODAL_TOOLS as unknown as Registry),
  'time-family': () => import('./time-family/tools').then((m) => m.TIME_FAMILY_TOOLS as unknown as Registry),
  'time-machine': () => import('./time-machine/tools').then((m) => m.TIME_MACHINE_TOOLS as unknown as Registry),
  'do-make': () => import('./do-make/tools').then((m) => m.DO_MAKE_TOOLS),
  tenses: () => import('./tenses/tools').then((m) => m.TENSE_TOOLS),
};

const MODULE_INFO: Record<ModuleId, { title: string; to: string }> = {
  modals: { title: 'Modal Verbs', to: '/learn/grammar/modals' },
  'time-family': { title: 'Time & Family', to: '/learn/grammar/time-family' },
  'time-machine': { title: 'Time Machine', to: '/learn/grammar/time-machine' },
  'do-make': { title: 'Do vs Make', to: '/learn/grammar/do-make' },
  tenses: { title: 'Tense Timeline', to: '/learn/grammar/tenses' },
};

interface Rule {
  test: RegExp;
  label: string;
  module: ModuleId;
  tools: string[];
  levels?: CefrLevel[];
}

const RULES: Rule[] = [
  // Modal Verbs
  { test: /modals “can” and “should”|recommendations with infinitives/i, label: 'Consejos', module: 'modals', tools: ['advice'] },
  { test: /suggestions and requests with can|making suggestions with modals/i, label: 'Sugerencias', module: 'modals', tools: ['suggestions'] },
  { test: /requests with “would”|requests with modals|would you mind/i, label: 'Peticiones', module: 'modals', tools: ['requests'] },
  { test: /modals for necessity and suggestion/i, label: 'Obligación', module: 'modals', tools: ['obligation', 'suggestions'] },
  { test: /permission, obligation and prohibition/i, label: 'Permiso y obligación', module: 'modals', tools: ['permission', 'obligation'] },
  { test: /degrees of certainty/i, label: 'Certeza', module: 'modals', tools: ['deduction'] },
  { test: /past modals of obligation/i, label: 'Obligación pasada', module: 'modals', tools: ['obligation-focus'] },
  { test: /should have|past modals for judgments|regret with should/i, label: 'Modales en pasado', module: 'modals', tools: ['past-modals'] },
  { test: /would rather and would prefer/i, label: 'Would rather', module: 'modals', tools: ['semi-modals'] },
  { test: /used to|past habits|will & would for habits/i, label: 'Hábitos', module: 'modals', tools: ['habits'] },
  // Time Machine
  { test: /past simple with ordinary verbs|simple past: ordinary verbs/i, label: 'Pasado simple', module: 'time-machine', tools: ['ed-rules', 'was-were'] },
  { test: /past continuous vs simple past|past perfect/i, label: 'Tiempos narrativos', module: 'time-machine', tools: ['tense-chart', 'timeline'], levels: ['A2', 'B1', 'B2'] },
  { test: /referring to time in the past|sequence adverbs/i, label: 'Expresiones de tiempo', module: 'time-machine', tools: ['time-words'] },
  // Time & Family
  { test: /time expressions/i, label: 'La hora', module: 'time-family', tools: ['time-rules', 'clock'], levels: ['A1', 'A2'] },
  // Do vs Make: daily routines and chores (A1), "how to do things" (A2 Payload)
  { test: /my day, my routine|imperatives and infinitives for giving suggestions/i, label: 'Do vs Make', module: 'do-make', tools: ['lesson', 'sort'], levels: ['A1', 'A2'] },
  { test: /possessive adjectives|possessive ’s|family/i, label: 'Familia y ’s', module: 'time-family', tools: ['genitive-rules', 'riddles'], levels: ['A1', 'A2'] },
  // Tense Timeline (grammar point names start after " · ", so "if + past perfect" doesn't count)
  { test: /present simple wh-questions|present continuous: yes|adverbs of frequency/i, label: 'Línea: presente', module: 'tenses', tools: ['present'], levels: ['A1'] },
  { test: /past simple with ordinary verbs|simple past: ordinary verbs/i, label: 'Línea: pasado', module: 'tenses', tools: ['past'] },
  { test: /(?:^|· )(?:present perfect|simple past vs\.? present perfect|accomplishments with the simple past)/i, label: 'Línea: perfecto', module: 'tenses', tools: ['perfect'] },
  { test: /(?:^|· )(?:past continuous vs|past perfect)|narrative tenses/i, label: 'Línea: narrativos', module: 'tenses', tools: ['narrative'] },
  { test: /(?:^|· )(?:future with|predicting the future)/i, label: 'Línea: futuro', module: 'tenses', tools: ['future'] },
  { test: /(?:^|· )(?:future perfect|goals with the future perfect)/i, label: 'Línea: futuro perfecto', module: 'tenses', tools: ['future-perfect'] },
  { test: /used to|past habits|would for habits/i, label: 'Línea: hábitos', module: 'tenses', tools: ['habits'] },
  { test: /comparing tenses|time contrast: past, present, future/i, label: 'Línea: comparar', module: 'tenses', tools: ['compare'] },
  { test: /passive (?:in|of) (?:the )?present continuous|passive with(?:out)? “by”/i, label: 'Línea: pasiva', module: 'tenses', tools: ['passive'] },
  { test: /aspect and nuance: perfect and continuous/i, label: 'Línea: aspecto', module: 'tenses', tools: ['all'], levels: ['C2'] },
  { test: /advanced future forms: future perfect/i, label: 'Línea: futuro perfecto', module: 'tenses', tools: ['future-perfect'], levels: ['C2'] },
  { test: /future forms in the past/i, label: 'Línea: futuro en el pasado', module: 'tenses', tools: ['future'], levels: ['C2'] },
  { test: /will and would for assumption and characteristic/i, label: 'Línea: hábitos', module: 'tenses', tools: ['habits'], levels: ['C2'] },
];

export function grammarToolsForUnit(u: Unit, level: CefrLevel) {
  const text = [u.title, u.theme, ...u.grammar.map((g) => g.name)].join(' · ');
  return RULES.filter((r) => r.test.test(text) && (!r.levels || r.levels.includes(level)));
}

const cache = new Map<string, ComponentType>();
function toolComponent(module: ModuleId, id: string): ComponentType {
  const key = `${module}:${id}`;
  if (!cache.has(key))
    cache.set(
      key,
      lazy(() =>
        REGISTRIES[module]().then((reg) => ({
          default: reg[id]?.Component ?? (() => null),
        })),
      ),
    );
  return cache.get(key)!;
}

export function UnitGrammarTools({ unit, level }: { unit: Unit; level: CefrLevel }) {
  const groups = useMemo(() => grammarToolsForUnit(unit, level), [unit, level]);
  const [active, setActive] = useState(0);
  if (!groups.length) return null;
  const g = groups[Math.min(active, groups.length - 1)]!;
  const info = MODULE_INFO[g.module];
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <h3 className="text-title-2 flex items-center gap-2">
          <Sigma size={22} className="text-ink-teal" /> Gramática interactiva
        </h3>
        <Link to={info.to} className="text-ink-blue inline-flex items-center text-[15px] font-medium">
          Abrir {info.title} <ChevronRight size={16} />
        </Link>
      </div>
      {groups.length > 1 && (
        <div className="no-scrollbar mb-4 overflow-x-auto">
          <Segmented
            size="sm"
            value={String(active)}
            onChange={(v) => setActive(Number(v))}
            options={groups.map((x, i) => ({ value: String(i), label: x.label }))}
          />
        </div>
      )}
      <Suspense fallback={<Card className="text-label-2 p-6 text-center">Cargando herramienta…</Card>}>
        <div className="space-y-4">
          {g.tools.map((id) => {
            const T = toolComponent(g.module, id);
            return <T key={`${g.module}-${id}`} />;
          })}
        </div>
      </Suspense>
    </section>
  );
}
