import { useId, useState } from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, Check, FileCheck2, MessageSquareText, Play, RotateCcw, Sparkles, Upload } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { LevelChip, Spinner } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import { dueInfo, isAutoDetectable, isFinished, validateTo } from '@/lib/assignments';
import { DUE_COLOR, KIND_META, STATUS_META, VIA_LABEL, formatDate } from './meta';
import type { TaskView } from './useMyTasks';
import { ink } from '@/lib/color';

/** One task in the student's list. */
export function TaskCard({
  view,
  onMarkDone,
  onUndo,
  onSubmit,
}: {
  view: TaskView;
  onMarkDone: () => Promise<unknown>;
  onUndo: () => Promise<unknown>;
  onSubmit: () => void;
}) {
  const { a, s, eff } = view;
  const kind = KIND_META[a.kind];
  const st = STATUS_META[eff];
  const finished = isFinished(eff);
  const due = dueInfo(a.due_at);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const textId = useId();
  const instr = a.instructions?.trim() ?? '';
  const long = instr.length > 140 || instr.includes('\n');
  const to = a.target.to && validateTo(a.target.to) ? a.target.to : null;
  const auto = isAutoDetectable(a);
  const urgent = !finished && (due.tone === 'overdue' || due.tone === 'soon');

  const run = async (fn: () => Promise<unknown>) => {
    setBusy(true);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      className={cn('relative overflow-hidden p-4 sm:p-5', urgent && 'ring-[1.5px] ring-[color:var(--tone)]')}
      style={urgent ? ({ '--tone': DUE_COLOR[due.tone as 'overdue' | 'soon'] } as React.CSSProperties) : undefined}
    >
      <div className="flex items-start gap-3">
        <IconTile icon={kind.icon} color={kind.color} size={40} soft />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-footnote font-semibold" style={{ color: ink(kind.color) }}>
              {kind.label}
            </span>
            {a.level && <LevelChip level={a.level} className="h-5 px-2 text-[11px]" />}
            <span
              className="text-footnote ml-auto inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-semibold"
              style={{ color: ink(st.color), background: `color-mix(in srgb, ${st.color} 13%, transparent)` }}
            >
              <st.icon size={13} strokeWidth={2.5} aria-hidden /> {st.label}
            </span>
          </div>
          <h3 className="text-headline mt-1 text-pretty">{a.title}</h3>
          {a.target.label && a.target.label !== a.title && <p className="text-footnote text-label-2 mt-0.5">{a.target.label}</p>}
        </div>
      </div>

      {instr && (
        <div className="mt-3">
          <p id={textId} className={cn('text-subhead text-label whitespace-pre-line', !open && long && 'line-clamp-2')}>
            {instr}
          </p>
          {long && (
            <button
              type="button"
              className="text-ink-blue text-footnote mt-1 font-semibold hover:opacity-70"
              aria-expanded={open}
              aria-controls={textId}
              onClick={() => setOpen((v) => !v)}
            >
              {open ? 'Ver menos' : 'Ver más'}
            </button>
          )}
        </div>
      )}

      <div className="text-footnote mt-3 flex flex-wrap items-center gap-x-4 gap-y-1">
        {!finished && (
          <span className="inline-flex items-center gap-1 font-medium" style={{ color: ink(DUE_COLOR[due.tone]) }} title={due.exact || undefined}>
            <CalendarClock size={14} aria-hidden /> {due.label}
            {due.exact && <span className="sr-only"> ({due.exact})</span>}
          </span>
        )}
        {finished && s?.done_at && (
          <span className="text-label-2 inline-flex items-center gap-1">
            <Check size={14} aria-hidden /> {formatDate(s.done_at)}
            {s.via && <span className="text-label-3">· {VIA_LABEL[s.via]}</span>}
          </span>
        )}
        {!finished && auto && (
          <span className="text-label-2 inline-flex items-center gap-1">
            <Sparkles size={14} className="text-ink-purple" aria-hidden /> Se marca sola al completarla
          </span>
        )}
        {a.requires_submission && !finished && (
          <span className="text-label-2 inline-flex items-center gap-1">
            <Upload size={14} aria-hidden /> Requiere entrega
          </span>
        )}
      </div>

      {s?.portfolio_item_id && (
        <Link to="/portfolio" className="text-ink-blue text-footnote mt-2 inline-flex items-center gap-1 font-semibold hover:opacity-70">
          <FileCheck2 size={14} aria-hidden /> Ver el trabajo entregado
        </Link>
      )}

      {(s?.teacher_feedback || (s?.reviewed_at && s.score != null)) && (
        <div className="bg-fill-2 mt-3 rounded-[12px] p-3">
          <div className="text-footnote text-label-2 flex items-center gap-1.5 font-semibold">
            <MessageSquareText size={14} aria-hidden /> Tu profesor
            {s.score != null && (
              <span className="text-label ml-auto rounded-full bg-[color-mix(in_srgb,var(--green)_16%,transparent)] px-2 py-0.5 tabular-nums">
                {Math.round(s.score * 10) / 10} / 100
              </span>
            )}
          </div>
          {s.teacher_feedback && <p className="text-subhead mt-1 whitespace-pre-line">{s.teacher_feedback}</p>}
        </div>
      )}

      {err && (
        <p role="alert" className="text-ink-red text-footnote mt-2">
          {err}
        </p>
      )}

      {eff !== 'excused' && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          {to && !finished && (
            <ButtonLink to={to} size="sm" variant="filled">
              <Play size={14} fill="currentColor" aria-hidden /> Empezar
            </ButtonLink>
          )}
          {!finished &&
            (a.requires_submission ? (
              <Button size="sm" variant="tinted" onClick={onSubmit} disabled={busy}>
                <Upload size={15} aria-hidden /> Entregar
              </Button>
            ) : (
              <Button size="sm" variant="tinted" onClick={() => run(onMarkDone)} disabled={busy}>
                {busy ? <Spinner className="h-4 w-4" /> : <Check size={15} strokeWidth={2.6} aria-hidden />} Marcar como hecha
              </Button>
            ))}
          {finished && s?.via === 'manual' && !s.reviewed_at && (
            <Button size="sm" variant="plain" onClick={() => run(onUndo)} disabled={busy}>
              <RotateCcw size={14} aria-hidden /> Deshacer
            </Button>
          )}
          {finished && s?.via === 'submission' && (
            <Button size="sm" variant="plain" onClick={onSubmit} disabled={busy}>
              <Upload size={14} aria-hidden /> Entregar otra versión
            </Button>
          )}
          {finished && to && (
            <ButtonLink to={to} size="sm" variant="gray">
              Repasar
            </ButtonLink>
          )}
        </div>
      )}
    </Card>
  );
}
