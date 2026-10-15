import { useMemo, useState } from 'react';
import { PenLine } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Chip, PageLoader } from '@/components/ui/Misc';
import { WritingPad } from '@/components/learning/WritingPad';
import { useAsync } from '@/hooks/useAsync';
import { loadLevel } from '@/content/levels';
import type { CefrLevel } from '@/content/types';
import { cn } from '@/lib/cn';
import { unitTitle } from '../learn/LevelPage';

// C1's tasks are ECYR's own (src/content/c1-writing.json); the rest come from the books.
const WRITING_LEVELS: CefrLevel[] = ['A1', 'A2', 'B1', 'B2', 'C1'];

export default function WritingPage() {
  const [level, setLevel] = useState<CefrLevel>('A1');
  const { data, loading } = useAsync(() => loadLevel(level), [level]);
  const tasks = useMemo(() => (data?.units ?? []).filter((u) => u.writing), [data]);
  const [sel, setSel] = useState<number | null>(null);
  const u = tasks.find((t) => t.n === sel) ?? tasks[0];

  return (
    <Page
      back={{ to: '/practice', label: 'Práctica' }}
      title="Writing"
      subtitle="Escribe con un objetivo claro y criterios concretos. El AI Coach te da feedback detallado."
    >
      <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 py-1">
        {WRITING_LEVELS.map((l) => (
          <Chip
            key={l}
            active={level === l}
            onClick={() => {
              setLevel(l);
              setSel(null);
            }}
          >
            {l}
          </Chip>
        ))}
      </div>
      {loading || !u?.writing ? (
        <PageLoader />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
          <Card className="max-h-[70vh] overflow-y-auto p-2">
            {tasks.map((t) => (
              <button
                key={t.n}
                type="button"
                onClick={() => setSel(t.n)}
                className={cn('w-full rounded-[12px] px-3 py-2.5 text-left transition-colors', t.n === u.n ? 'bg-ios-purple text-white' : 'hover:bg-fill-2')}
              >
                <div className="truncate text-[15px] font-medium">{t.writing!.title}</div>
                <div className={cn('truncate text-[12px]', t.n === u.n ? 'text-white/75' : 'text-label-2')}>
                  U{t.n} · {unitTitle(t.title)}
                </div>
              </button>
            ))}
          </Card>
          <Card className="p-6">
            <h3 className="text-title-3 flex items-center gap-2">
              <PenLine size={20} className="text-ios-purple" /> {u.writing.title}
            </h3>
            <p className="mt-2 text-[16px] text-pretty">{u.writing.brief}</p>
            {u.writing.length && <p className="text-label-2 mt-1 text-[13px]">{u.writing.length}</p>}
            <WritingPad
              key={`${level}-${u.n}`}
              storageKey={`ecyr:writing:${level}-${u.n}`}
              criteria={u.writing.criteria}
              prompt={`${u.writing.title}: ${u.writing.brief}`}
              level={level}
              title={`Writing ${level} · ${u.writing.title}`}
            />
          </Card>
        </div>
      )}
    </Page>
  );
}
