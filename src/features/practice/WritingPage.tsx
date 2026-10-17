import { useMemo, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Chip, LevelChip, PageLoader } from '@/components/ui/Misc';
import { useAsync } from '@/hooks/useAsync';
import { loadWritingTasks } from '@/content/writing';
import { CEFR_LEVELS, type CefrLevel } from '@/content/types';
import { cn } from '@/lib/cn';
import { unitTitle } from '../learn/LevelPage';
import { WritingTasksPanel, UnitWritingTasks } from './UnitWritingTasks'; // HARNESS

const hasDraft = (key: string) => {
  try {
    return !!localStorage.getItem(key)?.trim();
  } catch {
    return false;
  }
};

// Book tasks (C1: ECYR's own, src/content/c1-writing.json) + three extra tasks per unit (src/content/generated/writing-extra-*.json).
export default function WritingPage() {
  const [params, setParams] = useSearchParams();
  const level: CefrLevel = CEFR_LEVELS.find((l) => l === params.get('level')?.toUpperCase()) ?? 'A1';
  const { data, loading } = useAsync(() => loadWritingTasks(level), [level]);
  const units = useMemo(() => (data ?? []).filter((u) => u.tasks.length), [data]);
  const u = units.find((x) => String(x.n) === params.get('unit')) ?? units[0];
  const k = Number(params.get('task') ?? NaN);
  const detail = useRef<HTMLDivElement>(null);

  const go = (next: { level?: CefrLevel; unit?: number; task?: number }) => {
    const p: Record<string, string> = { level: next.level ?? level };
    const n = next.level ? undefined : (next.unit ?? u?.n);
    if (n != null) p.unit = String(n);
    if (next.task != null) p.task = String(next.task);
    setParams(p, { replace: true });
  };

  const pickUnit = (n: number) => {
    go({ unit: n });
    if (window.matchMedia('(max-width: 1023px)').matches) requestAnimationFrame(() => detail.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  };

  // Drafts per unit, refreshed whenever the selection changes.
  const started = useMemo(
    () => new Map(units.map((x) => [x.n, x.tasks.filter((t) => hasDraft(t.storageKey)).length])),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [units, u?.n, k],
  );
  const total = units.reduce((s, x) => s + x.tasks.length, 0);

  return (
    <Page
      back={{ to: '/practice', label: 'Práctica' }}
      title="Writing"
      subtitle="Varias tareas por unidad, con criterios concretos y una respuesta modelo. El AI Coach te da feedback detallado."
    >
      <div className="no-scrollbar -mx-1 mb-5 flex items-center gap-2 overflow-x-auto px-1 py-1">
        {CEFR_LEVELS.map((l) => (
          <Chip key={l} active={level === l} onClick={() => go({ level: l })}>
            {l}
          </Chip>
        ))}
        {!loading && total > 0 && <span className="text-label-2 ml-auto shrink-0 pl-2 text-[13px]">{total} tareas</span>}
      </div>
      {params.has('harness') && u && <div className="mb-5"><UnitWritingTasks level={level} unit={u.n} /></div> /* HARNESS */}
      {loading || !u ? (
        <PageLoader />
      ) : (
        <div className="grid gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <Card className="max-h-[42vh] overflow-y-auto p-2 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:self-start">
            {units.map((x) => {
              const active = x.n === u.n;
              const s = started.get(x.n) ?? 0;
              return (
                <button
                  key={x.n}
                  type="button"
                  onClick={() => pickUnit(x.n)}
                  aria-current={active || undefined}
                  className={cn('flex w-full items-center gap-3 rounded-[12px] px-3 py-2.5 text-left transition-colors', active ? 'bg-ios-purple text-white' : 'hover:bg-fill-2')}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium">
                      U{x.n} · {unitTitle(x.title)}
                    </span>
                    <span className={cn('block truncate text-[12px]', active ? 'text-white/80' : 'text-label-2')}>{x.theme}</span>
                  </span>
                  <span
                    className={cn('shrink-0 rounded-full px-2 py-0.5 text-[12px] font-semibold tabular-nums', active ? 'bg-white/20 text-white' : 'bg-fill-2 text-label-2')}
                    title={`${x.tasks.length} tareas${s ? ` · ${s} con borrador` : ''}`}
                  >
                    {s ? `${s}/${x.tasks.length}` : x.tasks.length}
                  </span>
                </button>
              );
            })}
          </Card>
          <div ref={detail} className="min-w-0 scroll-mt-4">
            <Card className="p-5 sm:p-6">
              <div className="text-label-2 mb-4 flex flex-wrap items-center gap-2 text-[13px]">
                <LevelChip level={level} />
                <span className="font-semibold">
                  Unidad {u.n} · {unitTitle(u.title)}
                </span>
                <span className="text-label-3">·</span>
                <span>{u.tasks.length} tareas</span>
              </div>
              <WritingTasksPanel
                key={`${level}-${u.n}`}
                unit={u}
                k={u.tasks.some((t) => t.k === k) ? k : u.tasks[0]!.k}
                onK={(t) => go({ task: t })}
                taskRef={(t) => `practice:writing:${level}-${u.n}-${t}`}
              />
            </Card>
          </div>
        </div>
      )}
    </Page>
  );
}
