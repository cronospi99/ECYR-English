/**
 * Students' output work for the teacher: writing texts and speaking
 * transcripts from `public.submissions` (ECYR WritingPad / Speaking / AI Coach
 * and the IELTS Simulator), with the AI feedback rendered as Markdown.
 *
 *   <StudentWork studentId />   one student ("Trabajos" tab of StudentPage)
 *   <ClassWork students />      latest across the class (teacher hub)
 */
import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight, FileText, Mic, PenLine, RefreshCw } from 'lucide-react';
import { Card, CardHeader } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Segmented } from '@/components/ui/Segmented';
import { EmptyState, Spinner } from '@/components/ui/Misc';
import { Markdown } from '@/components/learning/Markdown';
import { loadClassSubmissions, loadSubmissionReport, loadSubmissions, type StudentData, type Submission } from '@/lib/teacher';
import { relativeTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';

const MODULES = ['writing', 'speaking'];
type Filter = 'all' | 'writing' | 'speaking';

// ------------------------------------------------------------ helpers --

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/** "B1-4-2" → "B1 · U4 · #2", "B1-4" → "B1 · U4", "A1" → "A1". */
function refDetail(r: string) {
  const m = /^(pre-?a1|a1|a2|b1|b2|c1|c2)(?:-(\d+))?(?:-(\d+))?$/i.exec(r);
  if (m) return [m[1]!.toUpperCase(), m[2] && `Unidad ${m[2]}`, m[3] && `#${m[3]}`].filter(Boolean).join(' · ');
  return r.replace(/[-_:]+/g, ' ').trim();
}

/** Where a piece of work was done, from its task ref ("unit:A1-3", "practice:writing:B1-4-2", "coach:live", IELTS "task2"…). */
export function humanTask(module: string, task: string | null): string {
  const t = (task ?? '').trim();
  const skill = cap(module);
  let m: RegExpExecArray | null;
  if (!t) return MODULES.includes(module) ? `IELTS Simulator · ${skill}` : skill;
  if ((m = /^unit:(.+)$/i.exec(t))) return `Curso · ${refDetail(m[1]!)}`;
  if ((m = /^practice:(writing|speaking|reading|listening)(?::(.+))?$/i.exec(t))) return `Práctica de ${cap(m[1]!)}${m[2] ? ` · ${refDetail(m[2])}` : ''}`;
  if (t === 'coach:live') return 'AI Coach · conversación en vivo';
  if ((m = /^coach(?::(.+))?$/i.exec(t))) return `AI Coach${m[1] ? ` · ${m[1].replace(/[-_]+/g, ' ')}` : ''}`;
  if ((m = /^task\s*([12])$/i.exec(t))) return `IELTS · Writing Task ${m[1]}`;
  if ((m = /^part\s*([123])$/i.exec(t))) return `IELTS · Speaking Part ${m[1]}`;
  if (t === 'practice') return `IELTS · práctica de ${skill}`;
  if ((m = /^topic:(.+)$/i.exec(t))) return `Pre-A1 · ${m[1]!.replace(/[-_]+/g, ' ')}`;
  if ((m = /^(grammar|reading|game|workshop|foundations):(.+)$/i.exec(t))) return `${cap(m[1]!)} · ${m[2]!.replace(/[-_]+/g, ' ')}`;
  return t;
}

const isIelts = (s: Pick<Submission, 'task'>) => !s.task || /^(task\s*[12]|part\s*[123]|practice)$/i.test(s.task);

const HIDDEN_KEYS = new Set(['material', 'kind', '__text', 'audio', 'raw']);
const label = (k: string) => cap(k.replace(/_/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').toLowerCase());

/** Any report shape → readable Markdown (AI feedback first, then scores and lists). */
export function reportToMarkdown(report: unknown): string {
  if (report == null) return '';
  if (typeof report === 'string') return report;
  if (typeof report !== 'object' || Array.isArray(report)) return '';
  const r = report as Record<string, unknown>;
  if (typeof r.feedback === 'string' && r.feedback.trim()) return r.feedback;
  const out: string[] = [];
  const scalars: string[] = [];
  for (const [k, v] of Object.entries(r)) {
    if (HIDDEN_KEYS.has(k) || v == null || v === '') continue;
    if (typeof v === 'number' || typeof v === 'boolean') scalars.push(`- **${label(k)}:** ${String(v)}`);
    else if (typeof v === 'string') {
      if (v.length < 60 && !v.includes('\n')) scalars.push(`- **${label(k)}:** ${v}`);
      else out.push(`### ${label(k)}`, v);
    } else if (Array.isArray(v)) {
      const items = v
        .slice(0, 20)
        .map((x) =>
          typeof x === 'string' || typeof x === 'number'
            ? String(x)
            : x && typeof x === 'object'
              ? Object.values(x as Record<string, unknown>)
                  .filter((y) => typeof y === 'string' || typeof y === 'number')
                  .join(' → ')
              : '',
        )
        .filter(Boolean);
      if (items.length) out.push(`### ${label(k)}`, ...items.map((x) => `- ${x.replace(/\n+/g, ' ')}`));
    } else if (typeof v === 'object') {
      const lines = Object.entries(v as Record<string, unknown>)
        .filter(([kk, x]) => !HIDDEN_KEYS.has(kk) && (typeof x === 'string' || typeof x === 'number'))
        .map(([kk, x]) => `- **${label(kk)}:** ${String(x).replace(/\n+/g, ' ')}`);
      if (lines.length) out.push(`### ${label(k)}`, ...lines);
    }
  }
  return [...(scalars.length ? scalars : []), ...out].join('\n');
}

const MOD_META: Record<string, { icon: typeof PenLine; color: string; label: string }> = {
  writing: { icon: PenLine, color: 'var(--skill-writing)', label: 'Writing' },
  speaking: { icon: Mic, color: 'var(--skill-speaking)', label: 'Speaking' },
};

const words = (s: string | null) => (s?.trim() ? s.trim().split(/\s+/).length : 0);
const dateFmt = (iso: string) => new Date(iso).toLocaleString('es', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

// --------------------------------------------------------------- list --

function WorkItems({ list, names, linkStudent }: { list: Submission[]; names?: Map<string, string>; linkStudent?: boolean }) {
  const [open, setOpen] = useState<string | null>(null);
  const [reports, setReports] = useState<Record<string, string | null>>({});

  const toggle = (x: Submission) => {
    const next = open === x.id ? null : x.id;
    setOpen(next);
    if (next && !(x.id in reports)) {
      setReports((r) => ({ ...r, [x.id]: null }));
      void loadSubmissionReport(x.id).then((rep) => setReports((r) => ({ ...r, [x.id]: reportToMarkdown(rep) || '' })));
    }
  };

  return (
    <ul className="border-separator divide-separator divide-y border-t">
      {list.map((x) => {
        const meta = MOD_META[x.module] ?? { icon: FileText, color: 'var(--label-2)', label: cap(x.module) };
        const Icon = meta.icon;
        const isOpen = open === x.id;
        const rep = reports[x.id];
        const name = names?.get(x.student_id);
        return (
          <li key={x.id}>
            <button
              type="button"
              className="hover:bg-fill-2 flex w-full items-start gap-3 px-4 py-3 text-left transition-colors sm:px-5"
              aria-expanded={isOpen}
              onClick={() => toggle(x)}
            >
              <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[9px]" style={{ background: tint(meta.color, 16), color: ink(meta.color) }}>
                <Icon size={16} aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-baseline gap-x-2">
                  {name && <span className="truncate text-[15px] font-semibold">{name}</span>}
                  <span className={cn('text-[14px]', name ? 'text-label-2' : 'font-semibold')}>{humanTask(x.module, x.task)}</span>
                  {x.band != null && (
                    <span className="text-ink-indigo text-[12px] font-bold tabular-nums">Banda {Number(x.band).toFixed(1)}</span>
                  )}
                </span>
                {x.prompt && <span className="text-label-2 block truncate text-[13px]">{x.prompt}</span>}
                {!isOpen && x.content && <span className="text-label block truncate text-[13px] italic">“{x.content.slice(0, 160)}”</span>}
              </span>
              <span className="text-label-2 shrink-0 text-right text-[12px]">
                <span className="block" title={dateFmt(x.created_at)}>
                  {relativeTime(x.created_at)}
                </span>
                <span className="block tabular-nums">{words(x.content)} pal.</span>
              </span>
              <ChevronDown size={16} className={cn('text-label-3 mt-1 shrink-0 transition-transform', isOpen && 'rotate-180')} aria-hidden />
            </button>
            {isOpen && (
              <div className="space-y-3 px-4 pb-4 sm:px-5">
                <div className="text-label-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px]">
                  <span>{meta.label}</span>
                  <span>{dateFmt(x.created_at)}</span>
                  {linkStudent && name && (
                    <Link to={`/teacher/student/${x.student_id}?tab=work`} className="text-ink-blue inline-flex items-center font-semibold">
                      Ver estudiante <ChevronRight size={14} aria-hidden />
                    </Link>
                  )}
                </div>
                {x.prompt && (
                  <div>
                    <div className="text-label-2 mb-1 text-[12px] font-semibold uppercase">Consigna</div>
                    <p className="text-[14px] whitespace-pre-wrap">{x.prompt}</p>
                  </div>
                )}
                <div>
                  <div className="text-label-2 mb-1 text-[12px] font-semibold uppercase">{x.module === 'speaking' ? 'Transcripción' : 'Texto del estudiante'}</div>
                  <p className="bg-fill-2 max-h-[420px] overflow-y-auto rounded-[12px] p-3 text-[15px] leading-relaxed whitespace-pre-wrap">{x.content || '—'}</p>
                </div>
                <div>
                  <div className="text-label-2 mb-1 text-[12px] font-semibold uppercase">Feedback de la IA</div>
                  {rep === undefined || rep === null ? (
                    <div className="text-label-2 flex items-center gap-2 text-[13px]">
                      <Spinner className="h-4 w-4" /> Cargando…
                    </div>
                  ) : rep ? (
                    <div className="max-h-[420px] overflow-y-auto rounded-[12px] bg-[color-mix(in_srgb,var(--purple)_8%,transparent)] p-3 text-[14.5px]">
                      <Markdown text={rep} />
                    </div>
                  ) : (
                    <p className="text-label-2 text-[13px]">Sin feedback de IA (el estudiante lo envió directamente).</p>
                  )}
                </div>
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function useFiltered(list: Submission[] | null, filter: Filter) {
  return useMemo(() => (list ?? []).filter((x) => filter === 'all' || x.module === filter), [list, filter]);
}

function FilterBar({ filter, setFilter, list, onReload, loading }: { filter: Filter; setFilter: (f: Filter) => void; list: Submission[] | null; onReload: () => void; loading: boolean }) {
  const n = (m: string) => (list ?? []).filter((x) => x.module === m).length;
  return (
    <div className="flex flex-wrap items-center gap-2 px-4 pt-3 pb-3 sm:px-5">
      <Segmented<Filter>
        size="sm"
        value={filter}
        onChange={setFilter}
        options={[
          { value: 'all', label: `Todos (${list?.length ?? 0})` },
          { value: 'writing', label: `Writing (${n('writing')})` },
          { value: 'speaking', label: `Speaking (${n('speaking')})` },
        ]}
      />
      <Button variant="gray" size="sm" className="ml-auto" onClick={onReload} disabled={loading} aria-label="Actualizar trabajos">
        <RefreshCw size={15} className={loading ? 'animate-spin' : undefined} aria-hidden />
      </Button>
    </div>
  );
}

// ------------------------------------------------------------- public --

/** One student's writing texts and speaking transcripts. `source` narrows to the IELTS Simulator or the rest. */
export function StudentWork({ studentId, source = 'all', className }: { studentId: string; source?: 'all' | 'ielts' | 'ecyr'; className?: string }) {
  const [list, setList] = useState<Submission[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');
  const [n, setN] = useState(0);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    void loadSubmissions(studentId, { modules: source === 'ielts' ? undefined : MODULES, limit: 150 }).then((r) => {
      if (!alive) return;
      setList(source === 'ielts' ? r.filter(isIelts) : source === 'ecyr' ? r.filter((x) => !isIelts(x)) : r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
  }, [studentId, source, n]);

  const shown = useFiltered(list, filter);
  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader
        title={source === 'ielts' ? 'Writings y speakings del IELTS Simulator' : 'Writing y Speaking'}
        subtitle={
          source === 'ielts'
            ? 'Incluye los migrados del IELTS Simulator original'
            : 'Textos y transcripciones que el estudiante hizo en la plataforma (unidades, práctica, AI Coach e IELTS), con el feedback de la IA.'
        }
      />
      {source !== 'ielts' && <FilterBar filter={filter} setFilter={setFilter} list={list} onReload={() => setN((x) => x + 1)} loading={loading} />}
      {list === null ? (
        <div className="py-10 text-center">
          <Spinner className="mx-auto h-5 w-5" />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<PenLine size={40} strokeWidth={1.6} />}
          title={list.length ? 'Nada en este filtro' : 'Aún no hay trabajos'}
          body={list.length ? undefined : 'Cuando el estudiante pida feedback a la IA, envíe un texto o responda en Speaking, aparecerá aquí.'}
        />
      ) : (
        <div className={source === 'ielts' ? 'mt-3' : undefined}>
          <WorkItems list={shown} />
        </div>
      )}
    </Card>
  );
}

/** "Trabajos recientes": the latest writing / speaking across the class, linking to each student. */
export function ClassWork({ students, limit = 80, compact = false, className }: { students: StudentData[] | null; limit?: number; compact?: boolean; className?: string }) {
  const [list, setList] = useState<Submission[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState<Filter>('all');
  const [n, setN] = useState(0);
  const ids = useMemo(() => (students ?? []).map((s) => s.profile.id), [students]);
  const names = useMemo(() => new Map((students ?? []).map((s) => [s.profile.id, s.profile.full_name || s.profile.email || 'Estudiante'])), [students]);
  const idKey = ids.join(',');

  useEffect(() => {
    if (!students) return;
    let alive = true;
    setLoading(true);
    void loadClassSubmissions(ids, { modules: MODULES, limit }).then((r) => {
      if (!alive) return;
      setList(r);
      setLoading(false);
    });
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey, limit, n, students === null]);

  const shown = useFiltered(list, filter).slice(0, compact ? 5 : undefined);

  return (
    <Card className={cn('overflow-hidden', className)}>
      <CardHeader
        title="Trabajos recientes"
        subtitle="Lo último que escribieron o dijeron tus estudiantes, con el feedback de la IA."
        action={
          compact && (
            <Link to="/teacher?tab=work" className="text-ink-blue shrink-0 text-[15px] font-semibold">
              Ver todos
            </Link>
          )
        }
      />
      {!compact && <FilterBar filter={filter} setFilter={setFilter} list={list} onReload={() => setN((x) => x + 1)} loading={loading} />}
      {list === null ? (
        <div className="py-10 text-center">
          <Spinner className="mx-auto h-5 w-5" />
        </div>
      ) : shown.length === 0 ? (
        <EmptyState
          icon={<PenLine size={40} strokeWidth={1.6} />}
          title={list.length ? 'Nada en este filtro' : 'Aún no hay trabajos'}
          body={list.length ? undefined : 'Los textos y transcripciones que envíen tus estudiantes aparecerán aquí.'}
        />
      ) : (
        <div className={compact ? 'mt-3' : undefined}>
          <WorkItems list={shown} names={names} linkStudent />
        </div>
      )}
    </Card>
  );
}
