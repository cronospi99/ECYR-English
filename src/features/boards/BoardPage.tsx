import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  Copy,
  Database,
  Download,
  Ellipsis,
  Eye,
  EyeOff,
  Focus,
  Lock,
  LockOpen,
  LogIn,
  MonitorPlay,
  Pencil,
  Plus,
  Printer,
  RotateCcw,
  Archive,
  Trash2,
  WifiOff,
  X,
} from 'lucide-react';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Misc';
import { Sheet } from '@/features/portfolio/Sheet';
import { cn } from '@/lib/cn';
import {
  BOARDS_MISSING_MSG,
  COLOR_STYLE,
  LAYOUTS,
  boardToCSV,
  boardToText,
  exportRows,
  ordered,
  between,
  type BoardBundle,
  type CardDraft,
  type LiveCard,
} from '@/lib/boards';
import { useLiveBoard } from './useLiveBoard';
import { Composer } from './Composer';
import { StickyCard, LikeButton, authorLabel } from './StickyCard';
import { ColumnsView, JamCanvas, StoryView } from './layouts';

type ComposerState = { mode: 'new'; col?: number } | { mode: 'edit'; card: LiveCard } | null;

export default function BoardPage() {
  const { id = '' } = useParams();
  const api = useLiveBoard(id);
  const { bundle, fatal, loading } = api;

  useEffect(() => {
    requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready')));
  }, []);
  useEffect(() => {
    if (!bundle) return;
    document.title = `${bundle.board.title} · Muro en vivo`;
    return () => {
      document.title = 'ECYR English';
    };
  }, [bundle?.board.title]); // eslint-disable-line react-hooks/exhaustive-deps

  if (fatal && !bundle) return <FatalState kind={fatal.kind} message={fatal.message} />;
  if (loading || !bundle)
    return (
      <div className="bg-bg text-label-2 relative flex h-dvh flex-col items-center justify-center gap-3">
        <Spinner className="h-8 w-8" />
        <span className="text-[15px]">Abriendo el muro…</span>
      </div>
    );
  if (fatal && (fatal.kind === 'closed' || fatal.kind === 'not_found')) return <FatalState kind={fatal.kind} message={fatal.message} />;
  return <Board api={api} bundle={bundle} />;
}

// ------------------------------------------------------------- the board ----
function Board({ api, bundle }: { api: ReturnType<typeof useLiveBoard>; bundle: BoardBundle }) {
  const { board } = bundle;
  const isTeacher = bundle.role === 'teacher';
  const closed = !!board.closed_at;
  const [presenting, setPresenting] = useState(false);
  const [composer, setComposer] = useState<ComposerState>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [dismissedSpot, setDismissedSpot] = useState<string | null>(null);
  const spotRef = useRef<(() => { x: number; y: number }) | null>(null);

  // The projector shows what the class may see; the teacher's own screen always shows names.
  const names = presenting ? board.show_names : isTeacher || board.show_names;
  const canAdd = !closed && (isTeacher || !board.locked) && !presenting;
  const canEdit = useCallback((c: LiveCard) => !c.pending && (isTeacher || (c.mine && !board.locked && !closed)), [isTeacher, board.locked, closed]);
  const cards = useMemo(() => ordered(bundle.cards), [bundle.cards]);
  const openCard = cards.find((c) => c.id === openId) ?? null;
  const spot = board.spotlight && board.spotlight !== dismissedSpot ? (cards.find((c) => c.id === board.spotlight) ?? null) : null;

  useEffect(() => {
    if (!presenting) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && !board.spotlight && setPresenting(false);
    const onFs = () => !document.fullscreenElement && setPresenting(false);
    window.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => {
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
    };
  }, [presenting, board.spotlight]);

  const present = (on: boolean) => {
    setPresenting(on);
    try {
      if (on && !document.fullscreenElement) void document.documentElement.requestFullscreen?.().catch(() => {});
      if (!on && document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    } catch {
      /* fullscreen is optional */
    }
  };

  const startAdd = (opts?: { col?: number }) => setComposer({ mode: 'new', col: opts?.col });
  const submit = async (d: CardDraft): Promise<boolean> => {
    if (composer?.mode === 'edit') {
      const c = composer.card;
      const patch: Parameters<typeof api.patch>[1] = { text: d.text, color: d.color };
      const before = api.images[c.id]?.url ?? null;
      if ((d.image ?? null) !== before) patch.image = d.image ?? null;
      if (board.layout === 'columns' && d.col !== c.col) patch.col = d.col;
      void api.patch(c.id, patch);
      return true;
    }
    const spotXY = board.layout === 'jam' ? (spotRef.current?.() ?? { x: 700, y: 400 }) : { x: 0, y: 0 };
    void api.add({ ...d, col: board.layout === 'columns' ? (d.col ?? composer?.col ?? 0) : 0, ...spotXY });
    return true;
  };

  const lastStory = board.layout === 'story' ? (cards[cards.length - 1]?.text ?? board.prompt) : null;
  const viewProps = {
    bundle,
    images: api.images,
    names,
    isTeacher,
    canAdd,
    canEdit,
    onOpen: (c: LiveCard) => setOpenId(c.id),
    onLike: (c: LiveCard) => void api.like(c.id),
    onAdd: startAdd,
    big: presenting,
  };

  return (
    <div
      className="bg-bg text-label relative flex h-dvh flex-col overflow-hidden"
      style={{
        backgroundImage:
          'radial-gradient(circle at 12% 8%, color-mix(in srgb, var(--yellow) 14%, transparent), transparent 40%), radial-gradient(circle at 88% 92%, color-mix(in srgb, var(--pink) 12%, transparent), transparent 42%)',
      }}
    >
      <TopBar
        bundle={bundle}
        isTeacher={isTeacher}
        presenting={presenting}
        live={api.live}
        netDown={api.netDown}
        online={api.online}
        onPresent={present}
        onNames={() => void api.setBoard({ show_names: !board.show_names })}
        onLock={() => void api.setBoard({ locked: !board.locked })}
        onClose={(c) => void api.close(c)}
        say={api.say}
        images={api.images}
      />

      {(board.prompt && board.layout !== 'story') || (!isTeacher && (board.locked || !board.show_names)) || closed ? (
        <div className="flex shrink-0 flex-wrap items-center justify-center gap-2 px-4 pt-3">
          {board.prompt && board.layout !== 'story' && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn('bg-card shadow-card font-rounded max-w-full rounded-full px-4 py-1.5 text-center font-semibold', presenting ? 'text-[26px]' : 'text-[15px] sm:text-[17px]')}
            >
              💭 {board.prompt}
            </motion.div>
          )}
          {closed && <Pill tone="var(--red)">Cerrado</Pill>}
          {!isTeacher && board.locked && <Pill tone="var(--orange)">🔒 Bloqueado</Pill>}
          {!isTeacher && !board.show_names && <Pill tone="var(--indigo)">🙈 Anónimo</Pill>}
        </div>
      ) : null}

      <main className="relative min-h-0 flex-1">
        {board.layout === 'jam' && (
          <JamCanvas
            {...viewProps}
            moveLocal={api.moveLocal}
            commitMove={(cid, x, y) => void api.patch(cid, { x, y })}
            dragging={api.dragging}
            spotRef={spotRef}
          />
        )}
        {board.layout === 'columns' && <ColumnsView {...viewProps} />}
        {board.layout === 'story' && <StoryView {...viewProps} onReorder={(c, position) => void api.patch(c.id, { position })} />}

        {cards.length === 0 && board.layout === 'jam' && (
          <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center">
            <motion.div animate={{ rotate: [-6, 6, -6], y: [0, -6, 0] }} transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }} className="text-[56px]">
              🗒️
            </motion.div>
            <p className="text-title-3">¡Sé el primero!</p>
            {canAdd && <p className="text-label-2 text-[15px]">Toca + para añadir una idea</p>}
          </div>
        )}
      </main>

      {canAdd && board.layout === 'jam' && (
        <motion.button
          type="button"
          aria-label="Añadir tarjeta"
          onClick={() => startAdd()}
          initial={{ scale: 0, rotate: -90 }}
          animate={{ scale: 1, rotate: 0 }}
          whileHover={{ scale: 1.06 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          className="brand-gradient fixed right-5 bottom-[max(env(safe-area-inset-bottom),20px)] z-20 flex h-16 items-center gap-2 rounded-full px-5 text-white shadow-[0_14px_34px_-10px_rgb(47_107_255/0.75)] sm:right-8 sm:bottom-8"
        >
          <Plus size={30} strokeWidth={2.6} />
          <span className="hidden pr-1 text-[17px] font-bold sm:inline">Añadir</span>
        </motion.button>
      )}
      {canAdd && board.layout !== 'jam' && (
        <motion.button
          type="button"
          aria-label="Añadir tarjeta"
          onClick={() => startAdd(board.layout === 'columns' ? { col: 0 } : undefined)}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          whileTap={{ scale: 0.92 }}
          transition={{ type: 'spring', stiffness: 420, damping: 20 }}
          className="brand-gradient fixed right-5 bottom-[max(env(safe-area-inset-bottom),20px)] z-20 flex h-16 w-16 items-center justify-center rounded-full text-white shadow-[0_14px_34px_-10px_rgb(47_107_255/0.75)] sm:right-8 sm:bottom-8"
        >
          <Plus size={30} strokeWidth={2.6} />
        </motion.button>
      )}

      <Composer
        open={composer !== null}
        onClose={() => setComposer(null)}
        heading={composer?.mode === 'edit' ? 'Editar tarjeta' : board.layout === 'story' ? 'Continúa la historia' : 'Nueva tarjeta'}
        initial={
          composer?.mode === 'edit'
            ? { text: composer.card.text, color: composer.card.color, image: api.images[composer.card.id]?.url ?? null, col: composer.card.col }
            : { col: composer?.col ?? 0 }
        }
        layout={board.layout}
        columns={board.columns}
        storyBefore={composer?.mode === 'new' ? lastStory : null}
        onSubmit={submit}
      />

      <CardSheet
        card={openCard}
        index={openCard ? cards.indexOf(openCard) : -1}
        bundle={bundle}
        image={openCard ? api.images[openCard.id]?.url : undefined}
        names={names}
        isTeacher={isTeacher}
        canEdit={openCard ? canEdit(openCard) : false}
        onClose={() => setOpenId(null)}
        onLike={(c) => void api.like(c.id)}
        onEdit={(c) => {
          setOpenId(null);
          window.setTimeout(() => setComposer({ mode: 'edit', card: c }), 250);
        }}
        onDelete={(c) => {
          setOpenId(null);
          void api.remove(c.id);
        }}
        onSpotlight={(c) => {
          setOpenId(null);
          setDismissedSpot(null);
          void api.setBoard({ spotlight: c.id });
        }}
        onMoveCol={(c, col) => void api.patch(c.id, { col, position: Math.max(0, ...cards.map((x) => x.position)) + 1 })}
        onReorder={(c, position) => void api.patch(c.id, { position })}
        cards={cards}
      />

      <AnimatePresence>
        {spot && (
          <Spotlight
            key="spot"
            card={spot}
            index={cards.indexOf(spot)}
            total={cards.length}
            layout={board.layout}
            column={board.layout === 'columns' ? board.columns[spot.col] : undefined}
            image={api.images[spot.id]?.url}
            names={isTeacher && !presenting ? true : board.show_names}
            isTeacher={isTeacher}
            onLike={() => void api.like(spot.id)}
            onClose={() => (isTeacher ? void api.setBoard({ spotlight: null }) : setDismissedSpot(spot.id))}
            onStep={(dir) => {
              const i = cards.indexOf(spot);
              const next = cards[(i + dir + cards.length) % cards.length];
              if (next) void api.setBoard({ spotlight: next.id });
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {api.toast && (
          <motion.div
            key={api.toast}
            role="status"
            initial={{ opacity: 0, y: 20, x: '-50%' }}
            animate={{ opacity: 1, y: 0, x: '-50%' }}
            exit={{ opacity: 0, y: 20, x: '-50%' }}
            className="bg-label text-bg shadow-float fixed bottom-24 left-1/2 z-[130] max-w-[calc(100vw-32px)] rounded-full px-5 py-2.5 text-center text-[15px] font-semibold"
          >
            {api.toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Pill({ tone, children }: { tone: string; children: ReactNode }) {
  return (
    <span className="rounded-full px-3 py-1 text-[13px] font-bold" style={{ background: `color-mix(in srgb, ${tone} 16%, var(--bg))`, color: `color-mix(in srgb, ${tone} 62%, var(--label))` }}>
      {children}
    </span>
  );
}

// --------------------------------------------------------------- top bar ----
function IconBtn({ label, onClick, active, tone = 'var(--blue)', children, wideLabel }: { label: string; onClick: () => void; active?: boolean; tone?: string; children: ReactNode; wideLabel?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      aria-pressed={active}
      className={cn('flex h-10 shrink-0 items-center justify-center gap-1.5 rounded-full text-[14px] font-semibold transition-colors', wideLabel ? 'w-10 lg:w-auto lg:px-3.5' : 'w-10', !active && 'hover:bg-fill-2 text-label')}
      style={active ? { background: `color-mix(in srgb, ${tone} 18%, transparent)`, color: `color-mix(in srgb, ${tone} 62%, var(--label))` } : undefined}
    >
      {children}
      {wideLabel && <span className="hidden lg:inline">{wideLabel}</span>}
    </button>
  );
}

function TopBar({
  bundle,
  isTeacher,
  presenting,
  live,
  netDown,
  online,
  onPresent,
  onNames,
  onLock,
  onClose,
  say,
  images,
}: {
  bundle: BoardBundle;
  isTeacher: boolean;
  presenting: boolean;
  live: boolean;
  netDown: boolean;
  online: number | null;
  onPresent: (on: boolean) => void;
  onNames: () => void;
  onLock: () => void;
  onClose: (closed: boolean) => void;
  say: (m: string) => void;
  images: Record<string, { url: string }>;
}) {
  const { board } = bundle;
  const L = LAYOUTS[board.layout];
  const [menu, setMenu] = useState(false);
  const people = online && online > 0 ? online : bundle.authors;
  const status = netDown ? { c: 'var(--red)', t: 'Sin conexión' } : live ? { c: 'var(--green)', t: 'En vivo' } : { c: 'var(--orange)', t: 'Actualizando' };

  return (
    <header className="material-strong hairline-b relative z-30 flex h-[60px] shrink-0 items-center gap-1.5 px-2 sm:gap-2 sm:px-4">
      {presenting ? (
        <button type="button" onClick={() => onPresent(false)} className="hover:bg-fill-2 flex h-10 items-center gap-1 rounded-full pr-3 pl-2 text-[15px] font-semibold">
          <X size={20} /> Salir
        </button>
      ) : (
        <Link to="/boards" aria-label="Volver a muros" className="text-ink-blue hover:bg-fill-2 flex h-10 w-10 shrink-0 items-center justify-center rounded-full">
          <ChevronLeft size={26} strokeWidth={2.4} />
        </Link>
      )}
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-[19px]"
        style={{ background: `color-mix(in srgb, ${L.color} 22%, transparent)` }}
        title={L.label}
        aria-label={L.label}
      >
        {L.emoji}
      </span>
      <div className="min-w-0 flex-1">
        <h1 className={cn('truncate leading-tight font-bold', presenting ? 'text-[22px]' : 'text-[16px] sm:text-[17px]')}>{board.title}</h1>
        <div className="text-label-2 flex items-center gap-1.5 text-[12px] font-medium whitespace-nowrap sm:text-[13px]">
          <span className="relative flex h-2 w-2 shrink-0">
            {live && !netDown && <span className="absolute inset-0 animate-ping rounded-full opacity-60" style={{ background: status.c }} />}
            <span className="relative h-2 w-2 rounded-full" style={{ background: status.c }} />
          </span>
          <span className="hidden sm:inline">{status.t} ·</span>
          <span className="tabular-nums">🗒 {bundle.cards.length}</span>
          <span className="tabular-nums">· 👥 {people}</span>
        </div>
      </div>

      {isTeacher && (
        <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
          <IconBtn label={board.show_names ? 'Ocultar nombres' : 'Mostrar nombres'} onClick={onNames} active={!board.show_names} tone="var(--indigo)" wideLabel={board.show_names ? 'Nombres' : 'Anónimo'}>
            {board.show_names ? <Eye size={20} /> : <EyeOff size={20} />}
          </IconBtn>
          {!presenting && (
            <>
              <IconBtn label={board.locked ? 'Desbloquear' : 'Bloquear'} onClick={onLock} active={board.locked} tone="var(--orange)" wideLabel={board.locked ? 'Bloqueado' : 'Abierto'}>
                {board.locked ? <Lock size={19} /> : <LockOpen size={19} />}
              </IconBtn>
              <IconBtn label="Proyectar" onClick={() => onPresent(true)} wideLabel="Proyectar">
                <MonitorPlay size={20} />
              </IconBtn>
              <div className="relative">
                <IconBtn label="Más opciones" onClick={() => setMenu((m) => !m)} active={menu}>
                  <Ellipsis size={20} />
                </IconBtn>
                <AnimatePresence>
                  {menu && (
                    <>
                      <div className="fixed inset-0 z-40" onClick={() => setMenu(false)} aria-hidden />
                      <motion.div
                        role="menu"
                        initial={{ opacity: 0, scale: 0.92, y: -6 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        transition={{ duration: 0.16 }}
                        className="bg-elevated shadow-float absolute top-12 right-0 z-50 w-60 origin-top-right overflow-hidden rounded-[16px] py-1.5"
                      >
                        <MenuItem
                          icon={<Copy size={18} />}
                          onClick={() => {
                            setMenu(false);
                            void navigator.clipboard?.writeText(boardToText(bundle, true)).then(
                              () => say('Texto copiado ✓'),
                              () => say('No se pudo copiar'),
                            );
                          }}
                        >
                          Copiar como texto
                        </MenuItem>
                        <MenuItem
                          icon={<Download size={18} />}
                          onClick={() => {
                            setMenu(false);
                            download(`${slug(board.title)}.csv`, boardToCSV(bundle, true), 'text/csv;charset=utf-8');
                          }}
                        >
                          Descargar CSV
                        </MenuItem>
                        <MenuItem
                          icon={<Printer size={18} />}
                          onClick={() => {
                            setMenu(false);
                            printBoard(bundle, images);
                          }}
                        >
                          Imprimir
                        </MenuItem>
                        <div className="bg-separator mx-3 my-1 h-px" />
                        {board.closed_at ? (
                          <MenuItem
                            icon={<RotateCcw size={18} />}
                            onClick={() => {
                              setMenu(false);
                              onClose(false);
                            }}
                          >
                            Reabrir muro
                          </MenuItem>
                        ) : (
                          <MenuItem
                            icon={<Archive size={18} />}
                            danger
                            onClick={() => {
                              setMenu(false);
                              onClose(true);
                            }}
                          >
                            Cerrar muro
                          </MenuItem>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            </>
          )}
        </div>
      )}
    </header>
  );
}

function MenuItem({ icon, children, onClick, danger }: { icon: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} className={cn('hover:bg-fill-2 flex h-11 w-full items-center gap-3 px-4 text-left text-[15px] font-medium', danger ? 'text-ink-red' : 'text-label')}>
      {icon}
      {children}
    </button>
  );
}

// ---------------------------------------------------------- card details ----
function CardSheet({
  card,
  index,
  bundle,
  image,
  names,
  isTeacher,
  canEdit,
  cards,
  onClose,
  onLike,
  onEdit,
  onDelete,
  onSpotlight,
  onMoveCol,
  onReorder,
}: {
  card: LiveCard | null;
  index: number;
  bundle: BoardBundle;
  image?: string;
  names: boolean;
  isTeacher: boolean;
  canEdit: boolean;
  cards: LiveCard[];
  onClose: () => void;
  onLike: (c: LiveCard) => void;
  onEdit: (c: LiveCard) => void;
  onDelete: (c: LiveCard) => void;
  onSpotlight: (c: LiveCard) => void;
  onMoveCol: (c: LiveCard, col: number) => void;
  onReorder: (c: LiveCard, position: number) => void;
}) {
  const [confirm, setConfirm] = useState(false);
  const last = useRef<LiveCard | null>(null);
  if (card) last.current = card;
  const c = card ?? last.current;
  useEffect(() => setConfirm(false), [card?.id]);
  const { board } = bundle;
  const title = board.layout === 'story' ? `Parte ${index + 1}` : board.layout === 'columns' && c ? (board.columns[c.col] ?? 'Tarjeta') : 'Tarjeta';
  const who = c ? authorLabel(c, names) : null;

  return (
    <Sheet open={!!card} onClose={onClose} title={title}>
      {c && (
        <div className="flex flex-col gap-5 p-4 sm:p-6">
          <div className="mx-auto w-full max-w-[460px]" style={{ rotate: '-0.8deg' }}>
            <StickyCard card={c} image={image} names={names} tape className="min-h-[160px] p-5" />
          </div>
          <div className="text-label-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-[14px]">
            {who && <span className="text-label font-semibold">✍️ {who}</span>}
            {!who && !names && <span>🙈 Anónimo</span>}
            <span>{new Date(c.created_at).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <LikeButton card={c} onLike={() => onLike(c)} big />
            {canEdit && (
              <Button variant="gray" onClick={() => onEdit(c)}>
                <Pencil size={18} /> Editar
              </Button>
            )}
            {isTeacher && (
              <Button variant="tinted" onClick={() => onSpotlight(c)}>
                <Focus size={18} /> Proyectar
              </Button>
            )}
            {canEdit &&
              (confirm ? (
                <Button variant="destructive" onClick={() => onDelete(c)}>
                  <Trash2 size={18} /> ¿Seguro?
                </Button>
              ) : (
                <Button variant="destructive" onClick={() => setConfirm(true)} aria-label="Eliminar">
                  <Trash2 size={18} /> Eliminar
                </Button>
              ))}
          </div>
          {canEdit && board.layout === 'columns' && board.columns.length > 1 && (
            <div className="flex flex-col items-center gap-2">
              <span className="text-label-2 text-[13px] font-semibold">Mover a</span>
              <div className="flex flex-wrap justify-center gap-2">
                {board.columns.map((name, i) => (
                  <button
                    key={i}
                    type="button"
                    disabled={i === c.col}
                    onClick={() => onMoveCol(c, i)}
                    className={cn('h-9 rounded-full px-4 text-[14px] font-semibold', i === c.col ? 'bg-label text-bg' : 'bg-fill text-label hover:bg-fill-2')}
                  >
                    {name}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isTeacher && board.layout === 'story' && cards.length > 1 && (
            <div className="flex justify-center gap-2">
              <Button variant="gray" size="sm" disabled={index <= 0} onClick={() => onReorder(c, between(cards[index - 2]?.position, cards[index - 1]!.position))}>
                <ArrowLeft size={16} className="rotate-90" /> Antes
              </Button>
              <Button variant="gray" size="sm" disabled={index >= cards.length - 1} onClick={() => onReorder(c, between(cards[index + 1]!.position, cards[index + 2]?.position))}>
                <ArrowRight size={16} className="rotate-90" /> Después
              </Button>
            </div>
          )}
        </div>
      )}
    </Sheet>
  );
}

// ------------------------------------------------------------- spotlight ----
function Spotlight({
  card,
  index,
  total,
  layout,
  column,
  image,
  names,
  isTeacher,
  onLike,
  onClose,
  onStep,
}: {
  card: LiveCard;
  index: number;
  total: number;
  layout: BoardBundle['board']['layout'];
  column?: string;
  image?: string;
  names: boolean;
  isTeacher: boolean;
  onLike: () => void;
  onClose: () => void;
  onStep: (dir: 1 | -1) => void;
}) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (isTeacher && e.key === 'ArrowRight') onStep(1);
      if (isTeacher && e.key === 'ArrowLeft') onStep(-1);
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [isTeacher, onClose, onStep]);
  const label = layout === 'story' ? `Parte ${index + 1}` : column;
  return (
    <motion.div
      className="fixed inset-0 z-[95] flex flex-col items-center justify-center p-4 sm:p-10"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      role="dialog"
      aria-modal="true"
      aria-label="Tarjeta en foco"
    >
      <div className="absolute inset-0 bg-black/70 backdrop-blur-md" onClick={onClose} aria-hidden />
      <div className="relative flex w-full max-w-[880px] flex-col items-center gap-5">
        {label && <span className="rounded-full bg-white/15 px-4 py-1.5 text-[15px] font-bold text-white">{label}</span>}
        <AnimatePresence mode="popLayout">
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.6, rotate: -8, y: 40 }}
            animate={{ opacity: 1, scale: 1, rotate: -1.2, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, rotate: 6 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="w-full"
          >
            <StickyCard card={card} image={image} names={names} onLike={onLike} big tape className="max-h-[72dvh] min-h-[38dvh] overflow-y-auto" />
          </motion.div>
        </AnimatePresence>
        <div className="flex items-center gap-2">
          {isTeacher && total > 1 && (
            <button type="button" aria-label="Anterior" onClick={() => onStep(-1)} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
              <ArrowLeft size={22} />
            </button>
          )}
          <button type="button" onClick={onClose} className="flex h-12 items-center gap-2 rounded-full bg-white px-5 text-[16px] font-bold text-black">
            <X size={20} /> {isTeacher ? 'Quitar foco' : 'Cerrar'}
          </button>
          {isTeacher && total > 1 && (
            <button type="button" aria-label="Siguiente" onClick={() => onStep(1)} className="flex h-12 w-12 items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25">
              <ArrowRight size={22} />
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}

// ----------------------------------------------------------- full states ----
function FatalState({ kind, message }: { kind: string; message: string }) {
  const map: Record<string, { icon: ReactNode; title: string; tone: string }> = {
    offline: { icon: <WifiOff size={34} />, title: 'Necesitas conexión', tone: 'var(--orange)' },
    network: { icon: <WifiOff size={34} />, title: 'Sin conexión', tone: 'var(--orange)' },
    missing: { icon: <Database size={34} />, title: 'Falta activar el muro', tone: 'var(--purple)' },
    closed: { icon: <Archive size={34} />, title: 'Muro cerrado', tone: 'var(--red)' },
    not_found: { icon: <span className="text-[34px]">🔍</span>, title: 'No encontramos este muro', tone: 'var(--blue)' },
    denied: { icon: <LogIn size={34} />, title: 'Inicia sesión', tone: 'var(--blue)' },
  };
  const m = map[kind] ?? { icon: <span className="text-[34px]">😕</span>, title: 'Algo salió mal', tone: 'var(--red)' };
  return (
    <div className="bg-bg text-label relative flex h-dvh items-center justify-center p-6">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="bg-card shadow-card flex w-full max-w-[420px] flex-col items-center gap-3 rounded-[28px] p-8 text-center">
        <span className="flex h-20 w-20 items-center justify-center rounded-[24px]" style={{ background: `color-mix(in srgb, ${m.tone} 16%, transparent)`, color: `color-mix(in srgb, ${m.tone} 62%, var(--label))` }}>
          {m.icon}
        </span>
        <h1 className="text-title-2">{m.title}</h1>
        <p className="text-label-2 text-[15px]">
          {kind === 'missing' ? (
            <>
              Ejecuta <code className="bg-fill rounded px-1.5 py-0.5 text-[13px]">supabase/migrations/16_live_boards.sql</code> en Supabase → SQL Editor.
            </>
          ) : (
            message || BOARDS_MISSING_MSG
          )}
        </p>
        <div className="mt-2 flex gap-2">
          {kind === 'denied' ? (
            <ButtonLink to="/profile">Iniciar sesión</ButtonLink>
          ) : (
            <ButtonLink to="/boards" variant="gray">
              <ChevronLeft size={18} /> Muros
            </ButtonLink>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ---------------------------------------------------------------- export ----
function slug(s: string) {
  return (
    s
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 50) || 'muro'
  );
}

function download(name: string, text: string, type: string) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1500);
}

const esc = (s: string) => s.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]!);

/** A clean printable sheet (names follow the board's switch: printouts go to the class). */
function printBoard(bundle: BoardBundle, images: Record<string, { url: string }>) {
  const { board } = bundle;
  const names = board.show_names;
  const rows = exportRows(bundle, names);
  const list = board.layout === 'columns' ? [...ordered(bundle.cards)].sort((a, b) => a.col - b.col || a.position - b.position) : ordered(bundle.cards);
  let group = '';
  const body = list
    .map((c, i) => {
      const r = rows[i]!;
      const head = board.layout === 'columns' && r.group !== group ? `<h2>${esc((group = r.group))}</h2>` : '';
      const img = images[c.id]?.url && /^data:image\/(png|jpeg|webp);base64,/.test(images[c.id]!.url) ? `<img src="${images[c.id]!.url}" alt="">` : '';
      return `${head}<div class="card" style="background:${COLOR_STYLE[c.color].paper}">${board.layout === 'story' ? `<b class="part">${esc(r.group)}</b>` : ''}${img}<p>${esc(c.text)}</p><small>${esc(r.author)}${c.likes ? ` · ❤ ${c.likes}` : ''}</small></div>`;
    })
    .join('');
  const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>${esc(board.title)}</title><style>
  body{font-family:-apple-system,system-ui,Segoe UI,Roboto,sans-serif;margin:28px;color:#1f1f24}
  h1{margin:0 0 4px;font-size:26px} .prompt{margin:0 0 18px;color:#555;font-size:16px;font-style:italic}
  h2{column-span:all;font-size:18px;margin:18px 0 8px;border-bottom:2px solid #ddd;padding-bottom:4px}
  .wrap{columns:${board.layout === 'story' ? 1 : 3} 220px;column-gap:14px}
  .card{break-inside:avoid;border-radius:8px;padding:12px 14px;margin:0 0 12px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .card p{margin:0;font-size:15px;line-height:1.4;white-space:pre-wrap} .card small{display:block;margin-top:6px;color:#666;font-size:12px}
  .card img{width:100%;border-radius:4px;background:#fff;margin-bottom:6px} .part{display:block;font-size:11px;text-transform:uppercase;color:#777;margin-bottom:4px}
  </style></head><body><h1>${esc(board.title)}</h1>${board.prompt ? `<p class="prompt">${esc(board.prompt)}</p>` : ''}<div class="wrap">${body || '<p>(sin tarjetas)</p>'}</div></body></html>`;
  const w = window.open('', '_blank');
  if (!w) return;
  w.document.write(html);
  w.document.close();
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    try {
      w.focus();
      w.print();
    } catch {
      /* the window was closed */
    }
  };
  w.onload = go;
  window.setTimeout(go, 600);
}
