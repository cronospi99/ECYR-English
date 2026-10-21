import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { PageLoader } from '@/components/ui/Misc';
import { useAsync } from '@/hooks/useAsync';
import { loadVisualTopic } from '@/content/vocabVisual';
import type { CefrLevel } from '@/content/types';
import { VisualLesson } from '@/features/vocabulary/VisualLesson';

/** A topic of Práctica › Vocabulario › Vocabulario visual, placed inside a unit's Vocabulary tab. */
export function VisualVocabInsert({ level, topic }: { level: CefrLevel; topic: string }) {
  const { data, loading } = useAsync(() => loadVisualTopic(level, topic), [level, topic]);
  if (loading) return <PageLoader />;
  if (!data) return null;
  return (
    <div className="space-y-3">
      <VisualLesson topic={data} header={false} />
      <Card className="p-0">
        <Link
          to={`/practice/vocabulary?tab=visual&level=${level}&topic=${topic}`}
          className="flex items-center justify-between gap-2 px-4 py-3 text-[15px] font-semibold hover:opacity-80"
        >
          <span>🖼️ Más vocabulario visual de {level}</span>
          <ChevronRight size={18} className="text-label-3" />
        </Link>
      </Card>
    </div>
  );
}
