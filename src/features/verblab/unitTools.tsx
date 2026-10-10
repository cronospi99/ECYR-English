import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Wrench, ChevronRight } from 'lucide-react';
import type { Unit, VerbLabData } from '@/content/types';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { EdSoundDrill, EdSoundRules, PatternCard, PatternQuizCard, PhrasalFamilies, VerbFormsQuiz, useVerbLab } from './components';

/**
 * Picks the Verb Lab tools that fit a unit's grammar, so a lesson on the past
 * simple gets the -ed sounds and the irregular-verb drill, a lesson on
 * gerunds gets the matching verb patterns, and so on.
 */
type Tool =
  | { kind: 'ed-rules' }
  | { kind: 'ed-drill' }
  | { kind: 'forms'; field: 'past' | 'part'; only: 'all' | 'irregular' }
  | { kind: 'pattern'; id: number }
  | { kind: 'pattern-quiz'; id: string }
  | { kind: 'phrasal' };

const RULES: { test: RegExp; tools: Tool[]; label: string }[] = [
  {
    test: /simple past|past simple|ordinary verbs|used to|was \/ were|past continuous|accomplishments/i,
    label: 'Pasado y -ed',
    tools: [{ kind: 'ed-rules' }, { kind: 'ed-drill' }, { kind: 'forms', field: 'past', only: 'irregular' }],
  },
  {
    test: /present perfect|past participle|participles|passive|future perfect|should have|would have|past modals|have something done|past perfect/i,
    label: 'Participios',
    tools: [{ kind: 'forms', field: 'part', only: 'irregular' }],
  },
  {
    test: /gerund|infinitive|verb patterns|verbs \+ infinitives|would rather/i,
    label: 'Patrones verbales',
    tools: [{ kind: 'pattern', id: 1 }, { kind: 'pattern', id: 2 }, { kind: 'pattern-quiz', id: 'q1' }],
  },
  { test: /by \+ gerund|prepositions? .*gerund|need \+ gerund/i, label: 'Preposición + gerundio', tools: [{ kind: 'pattern', id: 6 }, { kind: 'pattern-quiz', id: 'q3' }] },
  { test: /reported speech|reporting clauses|tell.*say/i, label: 'Verbos de reporte', tools: [{ kind: 'pattern', id: 7 }, { kind: 'pattern-quiz', id: 'q3' }] },
  { test: /review of verb patterns|gerund & infinitive constructions/i, label: 'Ambas formas', tools: [{ kind: 'pattern', id: 9 }, { kind: 'pattern', id: 10 }, { kind: 'pattern-quiz', id: 'q5' }] },
  { test: /phrasal verbs|two-part verbs/i, label: 'Phrasal verbs', tools: [{ kind: 'phrasal' }] },
];

export function toolsForUnit(u: Unit) {
  const text = [u.title, u.theme, ...u.grammar.map((g) => g.name)].join(' · ');
  return RULES.filter((r) => r.test.test(text));
}

function ToolView({ t, data }: { t: Tool; data: VerbLabData }) {
  switch (t.kind) {
    case 'ed-rules':
      return <EdSoundRules data={data} />;
    case 'ed-drill':
      return <EdSoundDrill data={data} rounds={8} />;
    case 'forms':
      return <VerbFormsQuiz data={data} field={t.field} only={t.only} />;
    case 'pattern': {
      const p = data.patterns.patterns.find((x) => x.id === t.id);
      return p ? <PatternCard p={p} compact /> : null;
    }
    case 'pattern-quiz':
      return <PatternQuizCard data={data} quizId={t.id} />;
    case 'phrasal':
      return <PhrasalFamilies data={data} />;
  }
}

export function UnitVerbTools({ unit }: { unit: Unit }) {
  const groups = useMemo(() => toolsForUnit(unit), [unit]);
  const [active, setActive] = useState(0);
  const { data } = useVerbLab();
  if (!groups.length) return null;
  const g = groups[Math.min(active, groups.length - 1)]!;
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3 px-1">
        <h3 className="text-title-2 flex items-center gap-2">
          <Wrench size={22} className="text-ios-orange" /> Verb Lab
        </h3>
        <Link to="/practice/verbs" className="text-ios-blue inline-flex items-center text-[15px] font-medium">
          Abrir el laboratorio completo <ChevronRight size={16} />
        </Link>
      </div>
      {groups.length > 1 && (
        <Segmented
          className="mb-4"
          size="sm"
          value={String(active)}
          onChange={(v) => setActive(Number(v))}
          options={groups.map((x, i) => ({ value: String(i), label: x.label }))}
        />
      )}
      {!data ? (
        <Card className="text-label-2 p-6 text-center">Cargando herramientas…</Card>
      ) : (
        <div className="space-y-4">
          {g.tools.map((t, i) => (
            <ToolView key={`${g.label}-${i}`} t={t} data={data} />
          ))}
        </div>
      )}
    </section>
  );
}
