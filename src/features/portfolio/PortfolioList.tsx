import { useId, useMemo, useState, type ReactNode } from 'react';
import {
  BookOpen,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  FolderOpen,
  GraduationCap,
  Headphones,
  MessageSquareText,
  Pencil,
  RotateCw,
  Search,
  Trash2,
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Button } from '@/components/ui/Button';
import { IconTile } from '@/components/ui/IconTile';
import { EmptyState, LevelChip, Spinner } from '@/components/ui/Misc';
import { cn } from '@/lib/cn';
import {
  KIND_INFO,
  PORTFOLIO_KINDS,
  PORTFOLIO_LEVELS,
  PORTFOLIO_SKILLS,
  SKILL_LABEL,
  formatBytes,
  formatScore,
  portfolioSignedUrl,
  removePortfolioItem,
  reviewPortfolioItem,
  type PortfolioItem,
  type PortfolioKind,
} from '@/lib/portfolio';
import { Sheet, SheetAction } from './Sheet';
import { inputCls } from './UploadSheet';
import { usePortfolio, type PortfolioState } from './usePortfolio';
import { ink } from '@/lib/color';

// ===================================================================== API ==

/**
 * Self-loading, read-only portfolio of one user — for the teacher's student page.
 * Owner actions (edit / delete) are hidden; `canReview` adds the "Revisar" form.
 */
export function PortfolioList({ userId, canReview = false }: { userId: string; canReview?: boolean }) {
  const state = usePortfolio(userId);
  return <PortfolioListView state={state} canReview={canReview} />;
}

export interface PortfolioListViewProps {
  state: PortfolioState;
  /** Show owner actions (edit / delete). */
  owner?: boolean;
  /** Show the teacher's review form. */
  canReview?: boolean;
  /** Owner: open the edit sheet for an item. */
  onEdit?: (item: PortfolioItem) => void;
  /** Owner: shown as the empty-state action. */
  onAdd?: () => void;
}

type KindFilter = PortfolioKind | 'all';

export function PortfolioListView({ state, owner = false, canReview = false, onEdit, onAdd }: PortfolioListViewProps) {
  const { items, loading, error, reload, put, drop, thumbs } = state;
  const [kind, setKind] = useState<KindFilter>('all');
  const [skill, setSkill] = useState('');
  const [level, setLevel] = useState('');
  const [q, setQ] = useState('');
  const [reading, setReading] = useState<PortfolioItem | null>(null);
  const ids = { q: useId(), skill: useId(), level: useId() };

  const counts = useMemo(() => {
    const c = Object.fromEntries(PORTFOLIO_KINDS.map((k) => [k, 0])) as Record<PortfolioKind, number>;
    for (const i of items) c[i.kind]++;
    return c;
  }, [items]);
  const reviewed = items.filter((i) => i.reviewed_at).length;

  const filtered = useMemo(() => {
    const needle = norm(q.trim());
    return items.filter(
      (i) =>
        (kind === 'all' || i.kind === kind) &&
        (!skill || i.skill === skill) &&
        (!level || i.level === level) &&
        (!needle || norm(`${i.title} ${i.description ?? ''} ${i.file_name ?? ''} ${i.teacher_note ?? ''}`).includes(needle)),
    );
  }, [items, kind, skill, level, q]);

  const groups = useMemo(() => groupByMonth(filtered), [filtered]);
  const filtering = kind !== 'all' || skill || level || q.trim();
  const clear = () => {
    setKind('all');
    setSkill('');
    setLevel('');
    setQ('');
  };

  if (loading && !items.length)
    return (
      <div className="text-label-2 flex min-h-[200px] items-center justify-center">
        <Spinner className="h-7 w-7" />
      </div>
    );

  if (error && !items.length)
    return (
      <div className="bg-card rounded-card p-6 text-center shadow-card" role="alert">
        <p className="text-headline">The work could not be loaded</p>
        <p className="text-subhead text-label-2 mx-auto mt-1 max-w-md">{error}</p>
        <Button variant="gray" size="sm" className="mt-4" onClick={() => void reload()}>
          <RotateCw size={15} aria-hidden /> Retry
        </Button>
      </div>
    );

  if (!items.length)
    return (
      <div className="bg-card rounded-card shadow-card">
        <EmptyState
          icon={<FolderOpen size={44} strokeWidth={1.6} />}
          title={owner ? 'You haven’t uploaded any work yet' : 'There is no work yet'}
          body={
            owner
              ? 'Upload essays, assignments, exams, certificates, audios or photos of your notebook. Your teacher will be able to see and review them.'
              : 'When this student uploads work it will appear here.'
          }
          action={
            owner && onAdd ? (
              <Button variant="brand" onClick={onAdd}>
                Upload my first work
              </Button>
            ) : undefined
          }
        />
      </div>
    );

  return (
    <div className="min-w-0">
      {/* ---- counts by kind (also the kind filter) */}
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pt-1 pb-3" role="group" aria-label="Filter by type">
        <KindTile
          active={kind === 'all'}
          onClick={() => setKind('all')}
          count={items.length}
          label={reviewed ? `Todos · ${reviewed} revisado${reviewed === 1 ? '' : 's'}` : 'All'}
        />
        {PORTFOLIO_KINDS.filter((k) => counts[k] > 0).map((k) => (
          <KindTile
            key={k}
            kind={k}
            active={kind === k}
            onClick={() => setKind(kind === k ? 'all' : k)}
            count={counts[k]}
            label={counts[k] === 1 ? KIND_INFO[k].label : KIND_INFO[k].plural}
          />
        ))}
      </div>

      {/* ---- search + skill + level */}
      <div className="mb-5 grid grid-cols-2 gap-2 sm:flex">
        <label htmlFor={ids.q} className="relative col-span-2 min-w-0 sm:flex-1">
          <span className="sr-only">Search</span>
          <Search size={17} className="text-label-2 pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" aria-hidden />
          <input
            id={ids.q}
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by title, grade…"
            className={cn(inputCls, 'h-10 pl-9')}
          />
        </label>
        <Select id={ids.skill} label="Skill" value={skill} onChange={setSkill}>
          <option value="">All skills</option>
          {PORTFOLIO_SKILLS.map((s) => (
            <option key={s} value={s}>
              {SKILL_LABEL[s]}
            </option>
          ))}
        </Select>
        <Select id={ids.level} label="Level" value={level} onChange={setLevel}>
          <option value="">All levels</option>
          {PORTFOLIO_LEVELS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
      </div>

      {error && (
        <p className="text-footnote text-ink-red mb-3 px-1" role="alert">
          {error}
        </p>
      )}

      {!filtered.length ? (
        <div className="bg-card rounded-card shadow-card">
          <EmptyState
            icon={<Search size={40} strokeWidth={1.6} />}
            title="Nothing matches"
            body="Try another search or remove the filters."
            action={
              filtering ? (
                <Button variant="gray" size="sm" onClick={clear}>
                  Remove filters
                </Button>
              ) : undefined
            }
          />
        </div>
      ) : (
        <div className="space-y-7">
          {groups.map((g) => (
            <section key={g.key} aria-labelledby={`pf-${g.key}`}>
              <h3 id={`pf-${g.key}`} className="text-footnote text-label-2 mb-2 px-1 font-semibold tracking-wide uppercase">
                {g.label} <span className="text-label-3">· {g.items.length}</span>
              </h3>
              <ul className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <AnimatePresence initial={false}>
                  {g.items.map((item) => (
                    <motion.li
                      key={item.id}
                      layout
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.97 }}
                      transition={{ duration: 0.22 }}
                      className="min-w-0"
                    >
                      <ItemCard
                        item={item}
                        thumb={item.file_path ? thumbs[item.file_path] : undefined}
                        owner={owner}
                        canReview={canReview}
                        onEdit={onEdit}
                        onRead={() => setReading(item)}
                        onChanged={put}
                        onDeleted={drop}
                      />
                    </motion.li>
                  ))}
                </AnimatePresence>
              </ul>
            </section>
          ))}
        </div>
      )}

      <ReaderSheet item={reading} onClose={() => setReading(null)} />
    </div>
  );
}

// ================================================================= pieces ==

function KindTile({
  kind,
  active,
  onClick,
  count,
  label,
}: {
  kind?: PortfolioKind;
  active: boolean;
  onClick: () => void;
  count: number;
  label: string;
}) {
  const info = kind ? KIND_INFO[kind] : null;
  const color = info?.color ?? 'var(--blue)';
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'bg-card flex min-w-[104px] shrink-0 flex-col items-start gap-2 rounded-[16px] p-3 text-left shadow-card transition-[box-shadow,transform] active:scale-[0.97]',
      )}
      style={active ? { boxShadow: `inset 0 0 0 2px ${color}` } : undefined}
    >
      {info ? <IconTile icon={info.icon} color={info.color} size={28} /> : <IconTile icon={FolderOpen} color="var(--blue)" size={28} />}
      <span>
        <span className="text-title-3 block tabular-nums">{count}</span>
        <span className="text-footnote text-label-2 block whitespace-nowrap">{label}</span>
      </span>
    </button>
  );
}

function Select({
  id,
  label,
  value,
  onChange,
  children,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  children: ReactNode;
}) {
  return (
    <div className="min-w-0 sm:w-[200px]">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputCls, 'h-10 appearance-none truncate bg-[length:16px] bg-[right_10px_center] bg-no-repeat pr-8 text-[15px]')}
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%238e8e93' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")"}}
      >
        {children}
      </select>
    </div>
  );
}

function ItemCard({
  item,
  thumb,
  owner,
  canReview,
  onEdit,
  onRead,
  onChanged,
  onDeleted,
}: {
  item: PortfolioItem;
  thumb?: string;
  owner: boolean;
  canReview: boolean;
  onEdit?: (item: PortfolioItem) => void;
  onRead: () => void;
  onChanged: (item: PortfolioItem) => void;
  onDeleted: (id: string) => void;
}) {
  const info = KIND_INFO[item.kind];
  const [confirm, setConfirm] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [thumbFailed, setThumbFailed] = useState(false);
  const isAudio = Boolean(item.file_path && (item.file_type?.startsWith('audio/') || item.file_type === 'application/ogg'));
  const score = formatScore(item.score, item.score_scale);
  const date = item.done_at ?? item.created_at;

  const run = async (key: string, fn: () => Promise<void>) => {
    setBusy(key);
    setErr(null);
    try {
      await fn();
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(null);
    }
  };

  const open = () =>
    run('open', async () => {
      // Open the tab synchronously (popup blockers), then point it at the signed URL.
      const w = window.open('about:blank', '_blank');
      try {
        const url = await portfolioSignedUrl(item.file_path!);
        if (w) {
          w.opener = null;
          w.location.href = url;
        } else window.location.assign(url);
      } catch (e) {
        w?.close();
        throw e;
      }
    });

  const download = () =>
    run('download', async () => {
      const url = await portfolioSignedUrl(item.file_path!, { download: item.file_name || true });
      const a = document.createElement('a');
      a.href = url;
      a.rel = 'noopener';
      document.body.appendChild(a);
      a.click();
      a.remove();
    });

  const listen = () =>
    run('listen', async () => {
      if (audioUrl) {
        setAudioUrl(null);
        return;
      }
      setAudioUrl(await portfolioSignedUrl(item.file_path!));
    });

  const remove = () =>
    run('delete', async () => {
      await removePortfolioItem(item);
      onDeleted(item.id);
    });

  return (
    <article className="bg-card flex h-full min-w-0 gap-3 rounded-[18px] p-3.5 shadow-card" aria-label={item.title}>
      {/* thumbnail */}
      <div className="shrink-0">
        {thumb && !thumbFailed ? (
          <button
            type="button"
            onClick={open}
            className="bg-fill-2 block h-14 w-14 overflow-hidden rounded-[12px]"
            aria-label={`Ver imagen: ${item.title}`}
          >
            <img src={thumb} alt="" loading="lazy" decoding="async" onError={() => setThumbFailed(true)} className="h-full w-full object-cover" />
          </button>
        ) : (
          <IconTile icon={info.icon} color={info.color} size={44} soft className="mt-0.5" />
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className="text-headline line-clamp-2 min-w-0 break-words">{item.title}</h4>
          {score && (
            <span
              className="text-footnote shrink-0 rounded-full px-2 py-0.5 font-semibold tabular-nums"
              style={{ background: `color-mix(in srgb, ${info.color} 14%, transparent)`, color: ink(info.color) }}
              title="Grade you got"
            >
              {score}
            </span>
          )}
        </div>

        <div className="text-footnote text-label-2 mt-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span style={{ color: ink(info.color) }} className="font-semibold">
            {info.label}
          </span>
          {item.level && <LevelChip level={item.level} className="h-5 px-2 text-[11px]" />}
          {item.skill && <span>{SKILL_LABEL[item.skill]}</span>}
          <span>{fmtDate(date)}</span>
          {item.file_size ? <span>{formatBytes(item.file_size)}</span> : null}
          {item.source !== 'upload' && <span className="text-label-3">importado</span>}
          {item.reviewed_at ? (
            <span className="text-ink-green inline-flex items-center gap-0.5 font-semibold">
              <CheckCircle2 size={13} aria-hidden /> Reviewed
            </span>
          ) : canReview ? (
            <span className="text-ink-orange font-semibold">Not reviewed</span>
          ) : null}
        </div>

        {item.description && <p className="text-subhead text-label-2 mt-1.5 line-clamp-2 break-words">{item.description}</p>}

        {/* teacher review */}
        {item.reviewed_at && (item.teacher_note || item.teacher_score != null) && !reviewing && (
          <div className="mt-2.5 rounded-[12px] bg-[color-mix(in_srgb,var(--green)_10%,transparent)] px-3 py-2.5">
            <div className="text-footnote flex flex-wrap items-center justify-between gap-x-2 gap-y-0.5">
              <span className="text-ink-green inline-flex items-center gap-1 font-semibold">
                <GraduationCap size={14} aria-hidden /> {canReview ? 'Your review' : 'Teacher’s review'}
              </span>
              <span className="text-label-2">
                {item.teacher_score != null && (
                  <span className="text-label mr-1.5 font-semibold tabular-nums">
                    {formatScore(item.teacher_score, item.score_scale === 'band' ? 'band' : 'percent')}
                  </span>
                )}
                {fmtDate(item.reviewed_at)}
              </span>
            </div>
            {item.teacher_note && <p className="text-subhead mt-1 break-words whitespace-pre-wrap">{item.teacher_note}</p>}
          </div>
        )}

        {audioUrl && (
          <audio src={audioUrl} controls autoPlay className="mt-2.5 h-10 w-full" aria-label={`Audio: ${item.title}`}>
            Your browser can’t play this audio.
          </audio>
        )}

        {/* actions */}
        {!confirm && !reviewing && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {item.text_content && (
              <Act icon={BookOpen} onClick={onRead}>
                Read
              </Act>
            )}
            {isAudio && (
              <Act icon={Headphones} onClick={listen} busy={busy === 'listen'} pressed={Boolean(audioUrl)}>
                {audioUrl ? 'Hide' : 'Listen'}
              </Act>
            )}
            {item.file_path && !isAudio && (
              <Act icon={ExternalLink} onClick={open} busy={busy === 'open'}>
                Open
              </Act>
            )}
            {item.file_path && (
              <Act icon={Download} onClick={download} busy={busy === 'download'} label={`Descargar ${item.file_name ?? ''}`}>
                Download
              </Act>
            )}
            {canReview && (
              <Act icon={MessageSquareText} onClick={() => setReviewing(true)} tone="blue">
                {item.reviewed_at ? 'Edit review' : 'Review'}
              </Act>
            )}
            {owner && onEdit && (
              <Act icon={Pencil} onClick={() => onEdit(item)}>
                Edit
              </Act>
            )}
            {owner && (
              <Act icon={Trash2} onClick={() => setConfirm(true)} tone="red" label={`Eliminar ${item.title}`}>
                Delete
              </Act>
            )}
          </div>
        )}

        {confirm && (
          <div className="mt-3 rounded-[12px] bg-[color-mix(in_srgb,var(--red)_8%,transparent)] p-3" role="alertdialog" aria-label="Confirm deletion">
            <p className="text-subhead font-medium">Delete this work?</p>
            <p className="text-footnote text-label-2">
              {item.file_path ? 'The file will be deleted too. ' : ''} {item.reviewed_at ? 'Your teacher will no longer see their review. ' : ''}This cannot be undone.
            </p>
            <div className="mt-2.5 flex gap-2">
              <Button size="sm" variant="gray" onClick={() => setConfirm(false)} disabled={busy === 'delete'} autoFocus>
                Cancel
              </Button>
              <Button size="sm" variant="destructive" onClick={remove} disabled={busy === 'delete'}>
                {busy === 'delete' ? <Spinner className="h-4 w-4" /> : <Trash2 size={15} aria-hidden />} Delete
              </Button>
            </div>
          </div>
        )}

        {reviewing && (
          <ReviewForm
            item={item}
            onCancel={() => setReviewing(false)}
            onSaved={(it) => {
              onChanged(it);
              setReviewing(false);
            }}
          />
        )}

        {err && (
          <p className="text-footnote text-ink-red mt-2" role="alert">
            {err}
          </p>
        )}
      </div>
    </article>
  );
}

function Act({
  icon: Icon,
  onClick,
  children,
  busy,
  tone,
  label,
  pressed,
}: {
  icon: typeof Pencil;
  onClick: () => void;
  children: ReactNode;
  busy?: boolean;
  tone?: 'red' | 'blue';
  label?: string;
  pressed?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      aria-pressed={pressed}
      className={cn(
        'inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold transition-[opacity,transform] active:scale-95 disabled:opacity-50',
        tone === 'red'
          ? 'text-ink-red bg-[color-mix(in_srgb,var(--red)_12%,transparent)]'
          : tone === 'blue'
            ? 'text-ink-blue bg-[color-mix(in_srgb,var(--blue)_14%,transparent)]'
            : 'bg-fill text-label',
      )}
    >
      {busy ? <Spinner className="h-3.5 w-3.5" /> : <Icon size={14} strokeWidth={2.4} aria-hidden />}
      {children}
    </button>
  );
}

function ReviewForm({ item, onCancel, onSaved }: { item: PortfolioItem; onCancel: () => void; onSaved: (item: PortfolioItem) => void }) {
  const band = item.score_scale === 'band';
  const [note, setNote] = useState(item.teacher_note ?? '');
  const [score, setScore] = useState(item.teacher_score != null ? String(item.teacher_score) : '');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const noteId = useId();
  const scoreId = useId();
  const n = score.trim() === '' ? null : Number(score.replace(',', '.'));
  const bad = n != null && (!Number.isFinite(n) || n < 0 || n > (band ? 9 : 100));

  const save = async (clear = false) => {
    setBusy(true);
    setErr(null);
    try {
      onSaved(await reviewPortfolioItem(item.id, clear ? null : note, clear ? null : n));
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  return (
    <form
      className="bg-fill-2 mt-3 space-y-3 rounded-[14px] p-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (!bad && (note.trim() || n != null)) void save();
      }}
    >
      <div>
        <label htmlFor={noteId} className="text-footnote text-label-2 mb-1 block font-medium">
          Comment for the student
        </label>
        <textarea
          id={noteId}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={4000}
          rows={3}
          autoFocus
          placeholder="What is good, what to improve…"
          className={cn(inputCls, 'resize-y py-2.5 leading-[22px]')}
        />
      </div>
      <div className="flex flex-wrap items-end gap-2">
        <div className="w-[130px]">
          <label htmlFor={scoreId} className="text-footnote text-label-2 mb-1 block font-medium">
            {band ? 'Band (0–9)' : 'Grade (0–100)'}
          </label>
          <input
            id={scoreId}
            inputMode="decimal"
            value={score}
            onChange={(e) => setScore(e.target.value.replace(/[^\d.,]/g, '').slice(0, 5))}
            placeholder={band ? '7' : '85'}
            aria-invalid={bad || undefined}
            className={cn(inputCls, 'h-10', bad && 'shadow-[inset_0_0_0_1.5px_var(--red)]')}
          />
        </div>
        <div className="ml-auto flex flex-wrap gap-2">
          {item.reviewed_at && (
            <Button type="button" size="sm" variant="plain" className="text-ink-red" onClick={() => void save(true)} disabled={busy}>
              Remove
            </Button>
          )}
          <Button type="button" size="sm" variant="gray" onClick={onCancel} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={busy || bad || (!note.trim() && n == null)}>
            {busy ? <Spinner className="h-4 w-4" /> : <Check size={15} aria-hidden />} Save
          </Button>
        </div>
      </div>
      {err && (
        <p className="text-footnote text-ink-red" role="alert">
          {err}
        </p>
      )}
    </form>
  );
}

/** Full-screen reader for pasted writing. */
export function ReaderSheet({ item, onClose }: { item: PortfolioItem | null; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [last, setLast] = useState(item);
  if (item && item !== last) setLast(item);
  const shown = item ?? last;
  const words = shown?.text_content ? shown.text_content.trim().split(/\s+/).filter(Boolean).length : 0;

  const copy = async () => {
    if (!shown?.text_content) return;
    try {
      await navigator.clipboard.writeText(shown.text_content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };

  return (
    <Sheet
      open={Boolean(item)}
      onClose={onClose}
      title={shown?.title ?? ''}
      closeLabel="Close"
      trailing={
        <SheetAction onClick={copy}>
          <span className="inline-flex items-center gap-1">
            {copied ? <Check size={17} aria-hidden /> : <Copy size={17} aria-hidden />}
            {copied ? 'Copied' : 'Copy'}
          </span>
        </SheetAction>
      }
    >
      {shown && (
        <div className="px-5 pt-4 sm:px-7">
          <div className="text-footnote text-label-2 mb-4 flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-semibold" style={{ color: ink(KIND_INFO[shown.kind].color) }}>
              {KIND_INFO[shown.kind].label}
            </span>
            {shown.level && <LevelChip level={shown.level} className="h-5 px-2 text-[11px]" />}
            <span>{fmtDate(shown.done_at ?? shown.created_at)}</span>
            <span>
              {words.toLocaleString('en')} {words === 1 ? 'word' : 'words'}
            </span>
          </div>
          <article lang="en" className="text-[17px] leading-[28px] break-words whitespace-pre-wrap">
            {shown.text_content}
          </article>
          {shown.teacher_note && (
            <div className="mt-6 rounded-[14px] bg-[color-mix(in_srgb,var(--green)_10%,transparent)] p-3.5">
              <div className="text-footnote text-ink-green mb-1 inline-flex items-center gap-1 font-semibold">
                <GraduationCap size={14} aria-hidden /> Teacher’s review {shown.teacher_score != null && ( <span className="text-label ml-1">{formatScore(shown.teacher_score, shown.score_scale === 'band' ? 'band' : 'percent')}</span> )} </div>
              <p className="text-subhead whitespace-pre-wrap">{shown.teacher_note}</p>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

// ================================================================ helpers ==

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');

function parseDate(s: string) {
  // date-only strings are local dates, not UTC midnight
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(s + 'T00:00:00') : new Date(s);
}

function fmtDate(s: string) {
  const d = parseDate(s);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString('en', { day: 'numeric', month: 'short', ...(sameYear ? {} : { year: 'numeric' }) });
}

function groupByMonth(items: PortfolioItem[]) {
  const sorted = items
    .map((i) => ({ i, d: parseDate(i.done_at ?? i.created_at) }))
    .sort((a, b) => b.d.getTime() - a.d.getTime() || b.i.created_at.localeCompare(a.i.created_at));
  const out: { key: string; label: string; items: PortfolioItem[] }[] = [];
  for (const { i, d } of sorted) {
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    let g = out[out.length - 1];
    if (!g || g.key !== key) {
      const label = d.toLocaleDateString('en', { month: 'long', year: 'numeric' });
      g = { key, label: label.charAt(0).toUpperCase() + label.slice(1), items: [] };
      out.push(g);
    }
    g.items.push(i);
  }
  return out;
}
