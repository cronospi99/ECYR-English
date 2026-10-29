import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { Archive, ArrowRight, Database, EyeOff, Lock, Plus, RotateCcw, Trash2, Users, WifiOff, X } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState, PageLoader, Spinner, Toggle } from '@/components/ui/Misc';
import { useAuth } from '@/store/auth';
import { supabase } from '@/lib/supabase';
import { cn } from '@/lib/cn';
import {
  BoardError,
  COLOR_STYLE,
  LAYOUTS,
  closeBoard,
  createBoard,
  deleteBoard,
  listBoards,
  type BoardLayout,
  type BoardSummary,
  type CardColor,
} from '@/lib/boards';
import { AccessPicker, PrivateBadge } from './AccessPicker';

const COLUMN_PRESETS: string[][] = [
  ['Ideas', 'Preguntas', 'Vocabulario'],
  ['Antes', 'Durante', 'Después'],
  ['👍 Me gusta', '👎 No me gusta', '❓ Pregunta'],
  ['Who', 'Where', 'When', 'What'],
];

const PROMPT_LABEL: Record<BoardLayout, { label: string; ph: string }> = {
  jam: { label: 'Pregunta', ph: 'What did you do last weekend?' },
  columns: { label: 'Instrucción', ph: 'Share ideas about the reading' },
  story: { label: 'Primera línea', ph: 'Once upon a time, in a small town…' },
};

export default function BoardsPage() {
  const ready = useAuth((s) => s.ready);
  const session = useAuth((s) => s.session);
  const profile = useAuth((s) => s.profile);

  if (!supabase)
    return (
      <Page title="Muro en vivo">
        <EmptyState icon={<WifiOff size={44} />} title="Necesitas conexión" body="El muro en vivo funciona con tu cuenta en línea." />
      </Page>
    );
  if (!ready || (session && !profile)) return <PageLoader />;
  if (!session)
    return (
      <Page title="Muro en vivo">
        <EmptyState icon={<span className="text-[48px]">🗒️</span>} title="Inicia sesión" body="Entra con tu cuenta para ver los muros de tu clase." action={<ButtonLink to="/profile">Iniciar sesión</ButtonLink>} />
      </Page>
    );
  return profile!.role === 'teacher' ? <TeacherBoards /> : <StudentBoards teacherId={profile!.teacher_id} />;
}

/** Loads the list; refreshes every `every` ms while the tab is visible. */
function useBoardList(every: number) {
  const [boards, setBoards] = useState<BoardSummary[] | null>(null);
  const [error, setError] = useState<BoardError | null>(null);
  const reload = useCallback(async () => {
    try {
      setBoards(await listBoards());
      setError(null);
    } catch (e) {
      setError(e instanceof BoardError ? e : new BoardError('other', String(e)));
      setBoards((b) => b ?? []);
    }
  }, []);
  useEffect(() => {
    void reload();
    const t = window.setInterval(() => document.visibilityState === 'visible' && void reload(), every);
    return () => window.clearInterval(t);
  }, [reload, every]);
  return { boards, error, reload, setBoards };
}

function ErrorBanner({ error }: { error: BoardError }) {
  const missing = error.kind === 'missing';
  return (
    <Card className="mb-5 flex items-start gap-3 p-4">
      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[color-mix(in_srgb,var(--purple)_16%,transparent)] text-ink-purple">
        {missing ? <Database size={20} /> : <WifiOff size={20} />}
      </span>
      <div className="min-w-0 text-[15px]">
        <div className="font-semibold">{missing ? 'Falta activar el Muro en vivo' : 'No se pudo cargar'}</div>
        <div className="text-label-2 mt-0.5">
          {missing ? (
            <>
              Ejecuta <code className="bg-fill rounded px-1.5 py-0.5 text-[13px] break-all">supabase/migrations/16_live_boards.sql</code> en Supabase → SQL Editor.
            </>
          ) : (
            error.message
          )}
        </div>
      </div>
    </Card>
  );
}

// =============================================================== TEACHER ====
function TeacherBoards() {
  const { boards, error, reload, setBoards } = useBoardList(30_000);
  const [creating, setCreating] = useState(false);
  const open = (boards ?? []).filter((b) => !b.closed_at);
  const closed = (boards ?? []).filter((b) => b.closed_at);

  const act = async (b: BoardSummary, what: 'close' | 'reopen' | 'delete') => {
    setBoards((list) =>
      what === 'delete'
        ? (list ?? []).filter((x) => x.id !== b.id)
        : (list ?? []).map((x) => (x.id === b.id ? { ...x, closed_at: what === 'close' ? new Date().toISOString() : null } : x)),
    );
    try {
      if (what === 'delete') await deleteBoard(b.id);
      else await closeBoard(b.id, what === 'close');
    } finally {
      void reload();
    }
  };

  return (
    <Page
      title="Muro en vivo"
      subtitle="Ideas en tarjetas, en vivo con tu clase."
      actions={
        !creating && (
          <Button variant="brand" onClick={() => setCreating(true)}>
            <Plus size={20} strokeWidth={2.6} /> Nuevo muro
          </Button>
        )
      }
    >
      {error && <ErrorBanner error={error} />}
      <AnimatePresence initial={false}>{creating && <CreateBoard key="create" onCancel={() => setCreating(false)} />}</AnimatePresence>

      {boards === null ? (
        <div className="text-label-2 flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : open.length === 0 && closed.length === 0 && !creating ? (
        <button type="button" onClick={() => setCreating(true)} className="w-full">
          <Card className="flex flex-col items-center gap-3 px-6 py-14 text-center transition-transform hover:scale-[1.01]">
            <LayoutArt layout="jam" className="h-24 w-36" />
            <h2 className="text-title-3">Crea tu primer muro</h2>
            <p className="text-label-2 text-[15px]">Jam, columnas o una historia en cadena.</p>
          </Card>
        </button>
      ) : (
        <>
          {open.length > 0 && (
            <section className="mb-8">
              <h2 className="text-title-3 mb-3 px-1">Abiertos</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence initial={false}>
                  {open.map((b) => (
                    <BoardTile key={b.id} b={b} teacher onClose={() => void act(b, 'close')} onDelete={() => void act(b, 'delete')} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
          {closed.length > 0 && (
            <section>
              <h2 className="text-title-3 text-label-2 mb-3 px-1">Cerrados</h2>
              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <AnimatePresence initial={false}>
                  {closed.map((b) => (
                    <BoardTile key={b.id} b={b} teacher onReopen={() => void act(b, 'reopen')} onDelete={() => void act(b, 'delete')} />
                  ))}
                </AnimatePresence>
              </div>
            </section>
          )}
        </>
      )}
    </Page>
  );
}

function BoardTile({ b, teacher, onClose, onReopen, onDelete }: { b: BoardSummary; teacher?: boolean; onClose?: () => void; onReopen?: () => void; onDelete?: () => void }) {
  const L = LAYOUTS[b.layout] ?? LAYOUTS.jam;
  const [confirm, setConfirm] = useState(false);
  const isClosed = !!b.closed_at;
  return (
    <motion.div layout initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }}>
      <Card className={cn('flex h-full flex-col overflow-hidden', isClosed && 'opacity-70')}>
        <Link to={`/board/${b.id}`} className="group flex flex-1 items-start gap-3 p-4">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-[16px] text-[28px] transition-transform group-hover:scale-105 group-hover:rotate-[-4deg]" style={{ background: `color-mix(in srgb, ${L.color} 20%, transparent)` }}>
            {L.emoji}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-headline line-clamp-2">{b.title}</h3>
            {b.prompt && <p className="text-label-2 mt-0.5 line-clamp-1 text-[14px]">{b.prompt}</p>}
            <div className="text-label-2 mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] font-medium">
              <span>{L.label}</span>
              <span className="tabular-nums">🗒 {b.cards}</span>
              <PrivateBadge count={b.member_count} />
              {!b.show_names && (
                <span className="inline-flex items-center gap-1">
                  <EyeOff size={13} /> Anónimo
                </span>
              )}
              {b.locked && (
                <span className="inline-flex items-center gap-1">
                  <Lock size={13} /> Bloqueado
                </span>
              )}
              <span>{new Date(b.created_at).toLocaleDateString('es', { day: 'numeric', month: 'short' })}</span>
            </div>
          </div>
          <ArrowRight size={20} className="text-label-3 mt-1 shrink-0 transition-transform group-hover:translate-x-0.5" />
        </Link>
        {teacher && (
          <div className="hairline-t flex items-center gap-1 px-2 py-1.5">
            {isClosed ? (
              <button type="button" onClick={onReopen} className="text-ink-blue hover:bg-fill-2 flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold">
                <RotateCcw size={16} /> Reabrir
              </button>
            ) : (
              <button type="button" onClick={onClose} className="text-label-2 hover:bg-fill-2 flex h-9 items-center gap-1.5 rounded-full px-3 text-[14px] font-semibold">
                <Archive size={16} /> Cerrar
              </button>
            )}
            <span className="flex-1" />
            {confirm ? (
              <>
                <button type="button" onClick={() => setConfirm(false)} aria-label="Cancelar" className="text-label-2 hover:bg-fill-2 flex h-9 w-9 items-center justify-center rounded-full">
                  <X size={17} />
                </button>
                <button type="button" onClick={onDelete} className="text-ink-red flex h-9 items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--red)_12%,transparent)] px-3 text-[14px] font-semibold">
                  <Trash2 size={16} /> Borrar todo
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirm(true)} aria-label="Eliminar muro" className="text-label-3 hover:text-ink-red hover:bg-fill-2 flex h-9 w-9 items-center justify-center rounded-full">
                <Trash2 size={17} />
              </button>
            )}
          </div>
        )}
      </Card>
    </motion.div>
  );
}

// ------------------------------------------------------------ create form ---
function CreateBoard({ onCancel }: { onCancel: () => void }) {
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [layout, setLayout] = useState<BoardLayout>('jam');
  const [prompt, setPrompt] = useState('');
  const [columns, setColumns] = useState<string[]>(COLUMN_PRESETS[0]!);
  const [showNames, setShowNames] = useState(true);
  const [members, setMembers] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const cols = columns.map((c) => c.trim()).filter(Boolean);
  const can = title.trim().length > 0 && (layout !== 'columns' || cols.length > 0) && (members === null || members.length > 0) && !busy;

  const submit = async () => {
    if (!can) return;
    setBusy(true);
    setErr(null);
    try {
      const id = await createBoard({ title, layout, prompt, columns: cols, showNames, members });
      navigate(`/board/${id}`);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'No se pudo crear.');
      setBusy(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.3, ease: [0.32, 0.72, 0, 1] }} className="overflow-hidden">
      <Card className="mb-8 p-4 sm:p-6">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
          className="flex flex-col gap-5"
        >
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-title-3">Nuevo muro</h2>
            <button type="button" onClick={onCancel} aria-label="Cancelar" className="bg-fill text-label-2 flex h-9 w-9 items-center justify-center rounded-full">
              <X size={18} />
            </button>
          </div>

          <input
            value={title}
            onChange={(e) => setTitle(e.target.value.slice(0, 120))}
            placeholder="Título · My weekend"
            aria-label="Título"
            autoFocus
            className="bg-fill-2 placeholder:text-label-3 h-14 rounded-[14px] px-4 text-[19px] font-semibold outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--blue)_45%,transparent)]"
          />

          <div role="radiogroup" aria-label="Tipo de muro" className="grid grid-cols-3 gap-2 sm:gap-3">
            {(Object.keys(LAYOUTS) as BoardLayout[]).map((k) => {
              const L = LAYOUTS[k];
              const on = layout === k;
              return (
                <button
                  key={k}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setLayout(k)}
                  className={cn(
                    'relative flex flex-col items-center gap-2 rounded-[18px] p-2.5 text-center transition-all duration-200 sm:p-4',
                    on ? 'scale-[1.02] shadow-[0_10px_30px_-14px_rgb(0_0_0/0.4)]' : 'bg-fill-2 hover:bg-fill',
                  )}
                  style={on ? { background: `color-mix(in srgb, ${L.color} 16%, var(--card))`, boxShadow: `inset 0 0 0 2.5px ${L.color}` } : undefined}
                >
                  <LayoutArt layout={k} className="h-16 w-full max-w-[150px] sm:h-24" />
                  <span className="text-[15px] font-bold sm:text-[17px]">
                    {L.emoji} {L.label}
                  </span>
                  <span className="text-label-2 hidden text-[13px] leading-tight sm:block">{L.hint}</span>
                </button>
              );
            })}
          </div>

          <label className="flex flex-col gap-1.5">
            <span className="text-label-2 px-1 text-[13px] font-semibold">{PROMPT_LABEL[layout].label} · opcional</span>
            <input
              value={prompt}
              onChange={(e) => setPrompt(e.target.value.slice(0, 500))}
              placeholder={PROMPT_LABEL[layout].ph}
              className="bg-fill-2 placeholder:text-label-3 h-12 rounded-[12px] px-4 text-[16px] outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--blue)_45%,transparent)]"
            />
          </label>

          <AnimatePresence initial={false}>
            {layout === 'columns' && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <ColumnsEditor columns={columns} onChange={setColumns} />
              </motion.div>
            )}
          </AnimatePresence>

          <div className="bg-fill-2 flex items-center gap-3 rounded-[14px] px-4 py-3">
            <Users size={20} className="text-label-2 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[16px] font-semibold">Mostrar nombres</div>
              <div className="text-label-2 text-[13px]">Puedes cambiarlo en vivo 👁</div>
            </div>
            <Toggle checked={showNames} onChange={setShowNames} label="Mostrar nombres" />
          </div>

          <div className="flex flex-col gap-1.5">
            <span className="text-label-2 px-1 text-[13px] font-semibold">¿Quién puede entrar?</span>
            <AccessPicker value={members} onChange={setMembers} />
          </div>

          {err && <p className="text-ink-red text-[14px]">{err}</p>}
          <Button type="submit" variant="brand" size="lg" disabled={!can}>
            {busy ? <Spinner className="h-5 w-5" /> : <>Crear y abrir <ArrowRight size={20} /></>}
          </Button>
        </form>
      </Card>
    </motion.div>
  );
}

function ColumnsEditor({ columns, onChange }: { columns: string[]; onChange: (c: string[]) => void }) {
  return (
    <div className="flex flex-col gap-3">
      <span className="text-label-2 px-1 text-[13px] font-semibold">Columnas</span>
      <div className="flex flex-wrap gap-2">
        {columns.map((c, i) => (
          <div key={i} className="bg-fill-2 flex h-11 items-center rounded-full pr-1 pl-3" style={{ boxShadow: `inset 3px 0 0 ${['var(--blue)', 'var(--orange)', 'var(--green)', 'var(--purple)', 'var(--pink)', 'var(--teal)', 'var(--yellow)', 'var(--indigo)'][i % 8]}` }}>
            <input
              value={c}
              onChange={(e) => onChange(columns.map((x, j) => (j === i ? e.target.value.slice(0, 40) : x)))}
              aria-label={`Columna ${i + 1}`}
              size={Math.max(6, Math.min(18, c.length + 1))}
              className="min-w-0 bg-transparent text-[15px] font-semibold outline-none"
            />
            <button type="button" aria-label="Quitar columna" onClick={() => onChange(columns.filter((_, j) => j !== i))} disabled={columns.length <= 1} className="text-label-3 hover:text-label flex h-9 w-9 items-center justify-center rounded-full disabled:opacity-30">
              <X size={16} />
            </button>
          </div>
        ))}
        {columns.length < 8 && (
          <button type="button" onClick={() => onChange([...columns, `Columna ${columns.length + 1}`])} className="text-ink-blue flex h-11 items-center gap-1 rounded-full border-2 border-dashed border-[var(--separator)] px-4 text-[15px] font-semibold">
            <Plus size={17} /> Columna
          </button>
        )}
      </div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1">
        {COLUMN_PRESETS.map((p) => (
          <button key={p.join()} type="button" onClick={() => onChange(p)} className="bg-card text-label-2 shadow-card hover:text-label h-8 shrink-0 rounded-full px-3 text-[13px] font-medium">
            {p.join(' · ')}
          </button>
        ))}
      </div>
    </div>
  );
}

// ================================================================ STUDENT ====
function StudentBoards({ teacherId }: { teacherId: string | null }) {
  if (!teacherId)
    return (
      <Page title="Muro en vivo">
        <EmptyState icon={<span className="text-[52px]">🧑‍🏫</span>} title="Únete a una clase primero" body="Con el código de tu profe verás sus muros aquí." action={<ButtonLink to="/profile">Unirme a una clase</ButtonLink>} />
      </Page>
    );
  return <StudentList />;
}

function StudentList() {
  const { boards, error } = useBoardList(10_000);
  return (
    <Page title="Muro en vivo" subtitle="Entra y comparte tus ideas.">
      {error && <ErrorBanner error={error} />}
      {boards === null ? (
        <div className="text-label-2 flex justify-center py-16">
          <Spinner className="h-7 w-7" />
        </div>
      ) : boards.length === 0 ? (
        !error && (
          <EmptyState
            icon={
              <motion.span className="inline-block text-[56px]" animate={{ rotate: [-5, 5, -5] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}>
                🗒️
              </motion.span>
            }
            title="Tu profe no tiene muros abiertos"
            body="Cuando abra uno, aparecerá aquí."
          />
        )
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {boards.map((b, i) => (
            <JoinCard key={b.id} b={b} i={i} />
          ))}
        </div>
      )}
    </Page>
  );
}

const JOIN_COLORS: CardColor[] = ['yellow', 'pink', 'blue', 'green', 'purple', 'orange', 'teal'];

function JoinCard({ b, i }: { b: BoardSummary; i: number }) {
  const L = LAYOUTS[b.layout] ?? LAYOUTS.jam;
  const paper = COLOR_STYLE[JOIN_COLORS[i % JOIN_COLORS.length]!];
  return (
    <motion.div initial={{ opacity: 0, y: 14, rotate: 0 }} animate={{ opacity: 1, y: 0, rotate: i % 2 ? 0.8 : -0.8 }} whileHover={{ rotate: 0, scale: 1.02 }} transition={{ type: 'spring', stiffness: 300, damping: 24, delay: i * 0.04 }}>
      <Link
        to={`/board/${b.id}`}
        className="relative flex min-h-[180px] flex-col gap-2 rounded-[10px] p-5 shadow-[0_2px_3px_rgb(0_0_0/0.06),0_18px_34px_-18px_rgb(0_0_0/0.45)] dark:brightness-[0.93]"
        style={{ background: paper.paper, color: '#1f1f24' }}
      >
        <span aria-hidden className="absolute -top-2.5 left-1/2 h-5 w-16 -translate-x-1/2 rotate-[-2deg] rounded-[2px] bg-white/60 shadow-[0_1px_2px_rgb(0_0_0/0.1)]" />
        <div className="flex items-center gap-2 text-[13px] font-bold text-black/55">
          <span className="text-[20px]">{L.emoji}</span> {L.label}
          {b.locked && <Lock size={14} />}
          {b.member_count !== null && b.member_count !== undefined && (
            <span className="rounded-full bg-black/[0.08] px-2 py-0.5 text-[12px] whitespace-nowrap">{b.member_count === 1 ? '👤 Solo para ti' : '🔒 Privado'}</span>
          )}
          <span className="flex-1" />
          <span className="tabular-nums">🗒 {b.cards}</span>
        </div>
        <h3 className="font-rounded text-[24px] leading-tight font-bold">{b.title}</h3>
        {b.prompt && <p className="line-clamp-2 text-[15px] text-black/65">{b.prompt}</p>}
        <span className="mt-auto inline-flex h-11 items-center justify-center gap-1.5 self-start rounded-full bg-[#1f1f24] px-5 text-[16px] font-bold text-white">
          Entrar <ArrowRight size={18} />
        </span>
      </Link>
    </motion.div>
  );
}

// ------------------------------------------------------------ layout art ----
/** Tiny drawings of each layout for the picker. */
function LayoutArt({ layout, className }: { layout: BoardLayout; className?: string }) {
  const note = (c: CardColor, extra: string, key?: string | number): ReactNode => (
    <span key={key} className={cn('absolute rounded-[3px] shadow-[0_2px_4px_-1px_rgb(0_0_0/0.25)]', extra)} style={{ background: COLOR_STYLE[c].paper }} />
  );
  if (layout === 'jam')
    return (
      <div className={cn('relative', className)} aria-hidden>
        {note('yellow', 'left-[6%] top-[10%] h-[42%] w-[30%] rotate-[-6deg]')}
        {note('pink', 'left-[38%] top-[4%] h-[40%] w-[28%] rotate-[4deg]')}
        {note('blue', 'left-[66%] top-[18%] h-[42%] w-[28%] rotate-[-3deg]')}
        {note('green', 'left-[18%] top-[52%] h-[40%] w-[30%] rotate-[3deg]')}
        {note('purple', 'left-[52%] top-[56%] h-[38%] w-[28%] rotate-[-5deg]')}
      </div>
    );
  if (layout === 'columns')
    return (
      <div className={cn('flex gap-[6%] px-[4%]', className)} aria-hidden>
        {(['yellow', 'blue', 'green'] as CardColor[]).map((c, i) => (
          <div key={c} className="bg-fill flex flex-1 flex-col gap-[8%] rounded-[6px] p-[6%]">
            {Array.from({ length: 3 - (i % 2) }).map((_, j) => (
              <span key={j} className="h-[26%] rounded-[3px] shadow-[0_1px_2px_rgb(0_0_0/0.2)]" style={{ background: COLOR_STYLE[(['yellow', 'pink', 'blue', 'green', 'orange'] as CardColor[])[(i + j) % 5]!].paper }} />
            ))}
          </div>
        ))}
      </div>
    );
  return (
    <div className={cn('flex flex-col items-center justify-center gap-[3%]', className)} aria-hidden>
      {(['purple', 'yellow', 'pink'] as CardColor[]).map((c, i) => (
        <div key={c} className="flex w-[70%] flex-col items-center">
          {i > 0 && <span className="mb-[2px] h-[6px] w-0 border-l-2 border-dotted border-[color-mix(in_srgb,var(--purple)_60%,transparent)]" />}
          <span className="flex h-[18px] w-full items-center gap-1 rounded-[3px] px-1 shadow-[0_1px_2px_rgb(0_0_0/0.2)] sm:h-[22px]" style={{ background: COLOR_STYLE[c].paper }}>
            <span className="h-2 w-2 shrink-0 rounded-full bg-black/25" />
            <span className="h-1 flex-1 rounded-full bg-black/15" />
          </span>
        </div>
      ))}
    </div>
  );
}
