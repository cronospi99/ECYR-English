import { useMemo, useState } from 'react';
import { Search } from 'lucide-react';
import { VisualsFor } from '@/components/visuals/UnitVisuals';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Chip, PageLoader } from '@/components/ui/Misc';
import { Segmented } from '@/components/ui/Segmented';
import { Quiz, type QuizItem } from '@/components/learning/Quiz';
import { ButtonLink } from '@/components/ui/Button';
import { useAsync } from '@/hooks/useAsync';
import { loadPhrasalVerbs } from '@/content/levels';
import { CEFR_LEVELS, type CefrLevel, type PhrasalVerb } from '@/content/types';
import { useProgress } from '@/store/progress';
import { PhrasalExplorer, familiesFromList } from '@/features/verblab/mindmap';

export default function PhrasalVerbsPage() {
  const { data, loading } = useAsync(loadPhrasalVerbs, []);
  const [level, setLevel] = useState<CefrLevel | 'all'>('A1');
  const [family, setFamily] = useState<string>('all');
  const [mode, setMode] = useState<'browse' | 'quiz'>('browse');
  const [q, setQ] = useState('');
  const [round, setRound] = useState(0);
  const award = useProgress((s) => s.award);

  const families = useMemo(() => [...new Set((data ?? []).map((v) => v.family))].sort(), [data]);
  const list = useMemo(
    () => (data ?? []).filter((v) => (level === 'all' || v.level === level) && (family === 'all' || v.family === family)),
    [data, level, family],
  );
  const shown = useMemo(() => {
    const n = q.trim().toLowerCase();
    return n ? list.filter((v) => [v.pv, v.def, v.es].some((x) => x.toLowerCase().includes(n))) : list;
  }, [list, q]);
  const quiz = useMemo(() => buildQuiz(list, data ?? [], round), [list, data, round]);

  return (
    <Page
      back={{ to: '/practice', label: 'Práctica' }}
      title="Phrasal Verbs"
      subtitle={`${data?.length ?? 1143} phrasal verbs organizados por nivel y familia.`}
      actions={
        <ButtonLink to="/play/phrasal-roulette" variant="tinted">
          🎡 Jugar la ruleta
        </ButtonLink>
      }
    >
      {loading || !data ? (
        <PageLoader />
      ) : (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 py-1">
              <Chip active={level === 'all'} onClick={() => setLevel('all')}>
                Todos
              </Chip>
              {CEFR_LEVELS.map((l) => (
                <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
                  {l}
                </Chip>
              ))}
            </div>
            <Segmented
              size="sm"
              value={mode}
              onChange={(m) => {
                setMode(m);
                setRound((r) => r + 1);
              }}
              options={[
                { value: 'browse', label: 'Explorar' },
                { value: 'quiz', label: 'Quiz' },
              ]}
            />
          </div>
          {mode === 'quiz' && (
          <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 py-1">
            <Chip active={family === 'all'} onClick={() => setFamily('all')}>
              Todas las familias
            </Chip>
            {families.map((f) => (
              <Chip key={f} active={family === f} onClick={() => setFamily(f)}>
                {f}
              </Chip>
            ))}
          </div>
          )}

          {mode === 'browse' && (
            <label className="bg-card mb-4 flex h-11 items-center gap-2 rounded-[12px] px-3 shadow-card">
              <Search size={18} className="text-label-3" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Busca un phrasal verb, su significado o su traducción…"
                className="placeholder:text-label-3 h-full flex-1 bg-transparent text-[16px] outline-none"
              />
            </label>
          )}

          {mode === 'browse' ? (
            shown.length ? (
              <PhrasalExplorer families={familiesFromList(shown)} />
            ) : (
              <p className="text-label-2">No hay phrasal verbs con ese filtro.</p>
            )
          ) : (
            <Card className="mx-auto max-w-2xl p-6">
              {quiz.length >= 3 ? (
                <Quiz
                  key={round}
                  items={quiz}
                  title={`Phrasal verbs ${level === 'all' ? '' : level}`}
                  onFinish={(score) =>
                    award({ kind: 'flashcards', title: 'Quiz de phrasal verbs', skill: 'vocabulary', xp: 10 + Math.round(score / 10), score, ref: 'practice:phrasal' })
                  }
                />
              ) : (
                <p className="text-label-2">Elige un filtro con más phrasal verbs para el quiz.</p>
              )}
            </Card>
          )}
        </>
      )}
      <VisualsFor where={(p) => 'practice' in p && p.practice === 'phrasal-verbs'} />
    </Page>
  );
}

function buildQuiz(list: PhrasalVerb[], all: PhrasalVerb[], seed: number): QuizItem[] {
  const pool = [...list].sort((a, b) => hash(a.pv + seed) - hash(b.pv + seed)).slice(0, 10);
  return pool.map((v) => {
    const others = all.filter((x) => x.pv !== v.pv && x.family === v.family);
    const fill = others.length >= 3 ? others : all.filter((x) => x.pv !== v.pv);
    const distract = [...fill].sort((a, b) => hash(a.pv + v.pv) - hash(b.pv + v.pv)).slice(0, 3).map((x) => x.pv);
    const options = [...new Set([v.pv, ...distract])].sort((a, b) => hash(a + seed) - hash(b + seed));
    return {
      q: `“${v.def}” ${v.emoji}`,
      options,
      answer: options.indexOf(v.pv),
      explain: `${v.pv} — ${v.es}. “${v.ex}”`,
    };
  });
}

function hash(s: string) {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return h;
}
