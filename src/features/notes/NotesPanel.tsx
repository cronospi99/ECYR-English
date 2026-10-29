import { useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import {
  ALargeSmall,
  AlignCenter,
  AlignLeft,
  AlignRight,
  Bold,
  Check,
  ChevronLeft,
  Cloud,
  CloudOff,
  Ellipsis,
  Eraser,
  Heading1,
  Heading2,
  Highlighter,
  Italic,
  List,
  ListChecks,
  ListOrdered,
  MapPin,
  NotebookPen,
  Plus,
  RemoveFormatting,
  Search,
  Strikethrough,
  Trash2,
  Type,
  Underline,
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Misc';
import { useAuth } from '@/store/auth';
import { MAX_NOTE_BODY, noteTitle, useNotes, visibleNotes, type Note } from '@/store/notes';
import { relativeTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import { FONTS, HIGHLIGHTS, PLAIN, SIZES, TEXT_COLORS, TEXT_SWATCH, segments, segStyle, stripHighlights, type HighlightColor, type ListKind, type Segment } from '@/lib/highlights';
import { EMPTY_FORMAT, RichNoteEditor, type BlockStyle, type FormatState, type RichEditorHandle, type ToggleKey } from './RichNoteEditor';
import { currentPageInfo } from './pageInfo';
import { refreshNotes, useNotesSync } from './sync';

const fold = (s: string) => stripHighlights(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

/** null = list; 'new' = a draft not stored until the first character. */
type Sel = string | 'new' | null;

/**
 * The notes list + editor. `sheet`: one column (list ↔ editor), used by the
 * floating dock. `page`: two columns on wide screens (/notes).
 */
export function NotesPanel({ variant, onNavigate, startNew = false }: { variant: 'sheet' | 'page'; onNavigate?: () => void; startNew?: boolean }) {
  const uid = useAuth((s) => s.session?.user.id ?? null);
  const all = useNotes((s) => s.notes);
  const notes = useMemo(() => visibleNotes(all, uid), [all, uid]);
  const [sel, setSel] = useState<Sel>(startNew ? 'new' : null);
  const [q, setQ] = useState('');
  // Where a new note is being written: captured when "Nueva nota" is pressed.
  const [draftPage, setDraftPage] = useState(() => currentPageInfo());
  // One editor "session" per opened note (a draft keeps its editor once stored).
  const [edKey, setEdKey] = useState(0);
  const open = (s: Sel) => {
    setEdKey((k) => k + 1);
    setSel(s);
  };
  const searchId = useId();

  useEffect(() => {
    refreshNotes();
  }, []);

  const shown = useMemo(() => {
    const t = fold(q.trim());
    return t ? notes.filter((n) => fold(`${n.body} ${n.pageTitle}`).includes(t)) : notes;
  }, [notes, q]);

  const current = sel && sel !== 'new' ? (notes.find((n) => n.id === sel) ?? null) : null;
  // The selected note was deleted elsewhere (another device / tab): back to the list.
  useEffect(() => {
    if (sel && sel !== 'new' && !current) setSel(null);
  }, [sel, current]);

  const newNote = () => {
    setDraftPage(currentPageInfo());
    open('new');
  };

  const editor =
    sel === 'new' || current ? (
      <NoteEditor
        key={edKey}
        note={current}
        draftPage={draftPage}
        owner={uid}
        onCreated={(id) => setSel(id)}
        onBack={() => setSel(null)}
        onNavigate={onNavigate}
        variant={variant}
      />
    ) : null;

  const list = (
    <div className="flex min-h-0 flex-col">
      <div className="flex items-center gap-2 px-4 pt-3 pb-2">
        <label htmlFor={searchId} className="bg-fill-2 flex h-10 min-w-0 flex-1 items-center gap-2 rounded-[11px] px-3">
          <Search size={16} className="text-label-2 shrink-0" aria-hidden />
          <input
            id={searchId}
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar en mis notas"
            className="placeholder:text-label-3 min-w-0 flex-1 bg-transparent text-[16px] outline-none"
            type="search"
          />
        </label>
        <Button size="sm" variant="filled" onClick={newNote} className="h-10 rounded-[11px]">
          <Plus size={16} strokeWidth={2.6} aria-hidden /> Nueva
        </Button>
      </div>
      {shown.length === 0 ? (
        <EmptyState
          icon={<NotebookPen size={40} strokeWidth={1.6} />}
          title={notes.length ? 'Sin coincidencias' : 'Aún no tienes notas'}
          body={notes.length ? 'Prueba con otra palabra.' : 'Apunta palabras, reglas o dudas mientras estudias. Cada nota recuerda la página donde la escribiste.'}
          action={
            !notes.length && (
              <Button variant="tinted" onClick={newNote}>
                <Plus size={16} aria-hidden /> Escribir una nota
              </Button>
            )
          }
        />
      ) : (
        <ul className="px-2 pb-2" aria-label="Mis notas">
          {shown.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => open(n.id)}
                aria-current={sel === n.id || undefined}
                className={cn(
                  'flex w-full flex-col items-start gap-0.5 rounded-[12px] px-3 py-2.5 text-left transition-colors',
                  sel === n.id ? 'bg-[color-mix(in_srgb,var(--yellow)_16%,transparent)]' : 'hover:bg-fill-2',
                )}
              >
                <span className="w-full truncate text-[15px] font-semibold">{noteTitle(n)}</span>
                <span className="text-label-2 line-clamp-1 w-full text-[13px]">
                  <Formatted segs={snippet(n)} />
                </span>
                <span className="text-label-2 flex w-full items-center gap-1.5 text-[12px]">
                  <span className="shrink-0">{relativeTime(n.updatedAt)}</span>
                  {n.pageTitle && (
                    <>
                      <span aria-hidden>·</span>
                      <MapPin size={11} className="shrink-0" aria-hidden />
                      <span className="truncate">{n.pageTitle}</span>
                    </>
                  )}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );

  if (variant === 'page')
    return (
      <div className="grid min-h-[420px] gap-4 lg:grid-cols-[340px_minmax(0,1fr)]">
        <div className={cn('bg-card shadow-card rounded-card min-w-0 overflow-hidden', editor && 'hidden lg:block')}>
          {list}
          <SyncLine className="px-4 pb-3" />
        </div>
        {/* No overflow clipping here: it would stop the format bar from sticking while the page scrolls. */}
        <div className={cn('bg-card shadow-card rounded-card min-w-0', !editor && 'hidden lg:flex lg:items-center lg:justify-center')}>
          {editor ?? <p className="text-label-2 p-6 text-center text-[15px]">Elige una nota o escribe una nueva.</p>}
        </div>
      </div>
    );

  return (
    <div>
      {editor ?? list}
      {!editor && <SyncLine className="px-4 pb-1" />}
    </div>
  );
}

/** The note after its first line, on one line, keeping bold / italics / highlights. */
function snippet(n: Note): Segment[] {
  const out: Segment[] = [];
  let seenFirst = false;
  let started = false;
  let len = 0;
  for (const g of segments(n.body)) {
    let t = g.text;
    if (!seenFirst) {
      // Skip leading blank space and the title line (as noteTitle does).
      const lead = t.match(/^\s*/)![0].length;
      if (!started && lead === t.length) continue;
      if (!started) t = t.slice(lead);
      started = true;
      const nl = t.indexOf('\n');
      if (nl < 0) continue;
      t = t.slice(nl + 1);
      seenFirst = true;
    }
    t = t.replace(/\s*\n\s*/g, ' ');
    if (!out.length) t = t.trimStart();
    if (!t) continue;
    out.push({ ...g, text: t.slice(0, 240 - len) });
    len += t.length;
    if (len >= 240) break;
  }
  return out.length ? out : [{ text: '\u00A0', ...PLAIN }];
}

/** Read-only rendering of formatted stretches. */
export function Formatted({ segs }: { segs: Segment[] }) {
  return (
    <>
      {segs.map((g, i) =>
        g.color || g.bold || g.italic || g.underline || g.strike || g.fg ? (
          <span key={i} style={segStyle({ ...g, size: 0, font: 0 })}>
            {g.text}
          </span>
        ) : (
          g.text
        ),
      )}
    </>
  );
}

function NoteEditor({
  note,
  draftPage,
  owner,
  onCreated,
  onBack,
  onNavigate,
  variant,
}: {
  note: Note | null;
  draftPage: { title: string; path: string };
  owner: string | null;
  onCreated: (id: string) => void;
  onBack: () => void;
  onNavigate?: () => void;
  variant: 'sheet' | 'page';
}) {
  const showBack = variant === 'sheet';
  const bar = useRef<HTMLDivElement>(null);
  const create = useNotes((s) => s.create);
  const update = useNotes((s) => s.update);
  const remove = useNotes((s) => s.remove);
  const [text, setText] = useState(note?.body ?? '');
  const [saved, setSaved] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const latest = useRef({ id: note?.id ?? null, text });
  const stored = useRef(note?.body ?? '');
  const editor = useRef<RichEditorHandle>(null);
  const [fmt, setFmt] = useState<FormatState>(EMPTY_FORMAT);
  const labelId = useId();

  latest.current.text = text;

  // Autosave while typing (debounced); the very first character creates the note.
  useEffect(() => {
    const id = latest.current.id;
    if (text === stored.current) return;
    if (!id) {
      if (!text.trim()) return;
      const nid = create({ body: text, pageTitle: draftPage.title, pagePath: draftPage.path, owner });
      latest.current.id = nid;
      stored.current = text;
      setSaved(true);
      onCreated(nid);
      return;
    }
    setSaved(false);
    const t = setTimeout(() => {
      update(id, text);
      stored.current = text;
      setSaved(true);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [text]);

  // Leaving the editor: flush the last keystrokes; drop a note left empty.
  useEffect(
    () => () => {
      const { id, text: t } = latest.current;
      if (!id) return;
      if (!t.trim()) remove(id);
      else update(id, t);
    },
    [remove, update],
  );

  const page = note ? { title: note.pageTitle, path: note.pagePath } : draftPage;

  return (
    <div className="flex h-full flex-col">
      <div className="hairline-b flex min-h-[48px] items-center gap-2 px-3 py-1.5">
        {showBack && (
          <button type="button" onClick={onBack} className="text-ink-blue -ml-1 inline-flex h-9 items-center gap-0.5 rounded-[10px] pr-2 text-[16px] hover:opacity-70">
            <ChevronLeft size={22} strokeWidth={2.4} aria-hidden /> Notas
          </button>
        )}
        <span className="text-label-2 min-w-0 flex-1 truncate text-[12px]" aria-live="polite">
          {latest.current.id ? (saved ? `Guardado${note ? ` · ${relativeTime(note.updatedAt)}` : ''}` : 'Guardando…') : 'Nueva nota'}
        </span>
        {latest.current.id &&
          (confirm ? (
            <span className="flex items-center gap-1">
              <Button
                size="sm"
                variant="destructive"
                onClick={() => {
                  const id = latest.current.id;
                  latest.current.id = null;
                  if (id) remove(id);
                  onBack();
                }}
              >
                Eliminar
              </Button>
              <Button size="sm" variant="gray" onClick={() => setConfirm(false)}>
                No
              </Button>
            </span>
          ) : (
            <button
              type="button"
              onClick={() => setConfirm(true)}
              aria-label="Eliminar nota"
              className="text-ink-red hover:bg-fill-2 inline-flex h-9 w-9 items-center justify-center rounded-full"
            >
              <Trash2 size={17} />
            </button>
          ))}
      </div>
      {page.title && page.path && (
        <div className="px-4 pt-3">
          <Link
            to={page.path}
            onClick={onNavigate}
            className="text-ink-blue inline-flex max-w-full items-center gap-1.5 rounded-full bg-[color-mix(in_srgb,var(--blue)_11%,transparent)] px-2.5 py-1 text-[13px] font-medium"
            title="Volver a la página donde escribiste esta nota"
          >
            <MapPin size={13} className="shrink-0" aria-hidden /> <span className="truncate">{page.title}</span>
          </Link>
        </div>
      )}
      <FormatBar editor={editor} fmt={fmt} barRef={bar} variant={variant} />
      <span id={labelId} className="sr-only">
        Texto de la nota
      </span>
      <div className="min-h-[260px] flex-1">
        <RichNoteEditor
          ref={editor}
          initial={note?.body ?? ''}
          onChange={setText}
          onFormat={setFmt}
          maxLength={MAX_NOTE_BODY}
          labelledBy={labelId}
          autoFocus
          placeholder="Escribe tu nota… (la primera línea es el título)"
          className={cn(NOTE_TEXT, 'min-h-[260px]')}
          topInset={() => bar.current?.getBoundingClientRect().bottom ?? 0}
          bottomInset={variant === 'page' ? tabBarHeight : undefined}
        />
      </div>
      <div className="text-label-2 flex justify-between gap-3 px-4 pb-3 text-[12px]">
        <SyncLine />
        <span className="shrink-0 tabular-nums">
          {stripHighlights(text).length.toLocaleString('es')}/{MAX_NOTE_BODY.toLocaleString('es')}
        </span>
      </div>
    </div>
  );
}

const NOTE_TEXT = 'whitespace-pre-wrap break-words px-4 py-3 text-[16px] leading-relaxed';

/** Height of the mobile tab bar covering the bottom of the page (0 when hidden). */
function tabBarHeight() {
  const n = document.querySelector('nav[aria-label="Pestañas"]');
  if (!n || getComputedStyle(n).display === 'none') return 0;
  return Math.max(0, window.innerHeight - n.getBoundingClientRect().top);
}

/** Nearest ancestor the sticky bar sticks inside (null: the page). */
function stickyPort(el: HTMLElement): HTMLElement | null {
  for (let n = el.parentElement; n && n !== document.body; n = n.parentElement) {
    const oy = getComputedStyle(n).overflowY;
    if (oy === 'auto' || oy === 'scroll' || oy === 'hidden') return n;
  }
  return null;
}

/**
 * Whether the bar is stuck (scrolled past its place), and how far to push it
 * down so it stays under the top of the visual viewport when a phone's
 * keyboard pans the page (iOS), via the --kb custom property.
 */
function useStickyBar(bar: RefObject<HTMLDivElement | null>, sentinel: RefObject<HTMLDivElement | null>) {
  const [stuck, setStuck] = useState(false);
  const [kb, setKb] = useState(0);
  const kbRef = useRef(0);
  useEffect(() => {
    const b = bar.current;
    const s = sentinel.current;
    if (!b || !s) return;
    let raf = 0;
    const measure = () => {
      raf = 0;
      const bt = b.getBoundingClientRect().top;
      setStuck(bt - s.getBoundingClientRect().top > 1);
      const vv = window.visualViewport;
      let next = 0;
      if (vv && Math.abs(vv.scale - 1) < 0.01 && vv.offsetTop > 0) {
        const port = stickyPort(b);
        const portTop = port ? port.getBoundingClientRect().top : 0;
        const baseTop = (parseFloat(getComputedStyle(b).top) || 0) - kbRef.current;
        next = Math.max(0, Math.round(vv.offsetTop - portTop - baseTop));
      }
      if (next !== kbRef.current) {
        kbRef.current = next;
        setKb(next);
      }
    };
    const schedule = () => {
      if (!raf) raf = requestAnimationFrame(measure);
    };
    measure();
    const vv = window.visualViewport;
    window.addEventListener('scroll', schedule, { capture: true, passive: true });
    window.addEventListener('resize', schedule);
    vv?.addEventListener('resize', schedule);
    vv?.addEventListener('scroll', schedule);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('scroll', schedule, { capture: true });
      window.removeEventListener('resize', schedule);
      vv?.removeEventListener('resize', schedule);
      vv?.removeEventListener('scroll', schedule);
    };
  }, [bar, sentinel]);
  return { stuck, kb };
}

type Menu = 'fg' | 'hl' | 'more' | null;

/**
 * The format bar, sticky at the top of the scroll area: bold, italics,
 * underline, strikethrough, text colour, highlighter pens, lists, headings,
 * alignment, size and font. On narrow widths the less used tools move into
 * "Más". Select text, then tap a tool (keyboard shortcuts in the tooltips).
 */
function FormatBar({
  editor,
  fmt,
  barRef,
  variant,
}: {
  editor: RefObject<RichEditorHandle | null>;
  fmt: FormatState;
  barRef: RefObject<HTMLDivElement | null>;
  variant: 'sheet' | 'page';
}) {
  const [hint, setHint] = useState<string | null>(null);
  const [menu, setMenu] = useState<Menu>(null);
  const [pen, setPen] = useState<HighlightColor>('yellow');
  const sentinel = useRef<HTMLDivElement>(null);
  const { stuck, kb } = useStickyBar(barRef, sentinel);
  useEffect(() => {
    if (fmt.range) setHint(null);
  }, [fmt.range]);
  // A tap outside the bar closes its menu.
  useEffect(() => {
    if (!menu) return;
    const onDown = (e: PointerEvent) => {
      if (!barRef.current?.contains(e.target as Node)) setMenu(null);
    };
    document.addEventListener('pointerdown', onDown);
    return () => document.removeEventListener('pointerdown', onDown);
  }, [menu, barRef]);
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const kb_ = mac ? '⌘' : 'Ctrl+';
  const sh = mac ? '⇧⌘' : 'Ctrl+Mayús+';
  const ed = () => editor.current;
  const paint = (color: HighlightColor | null) => {
    setMenu(null);
    if (color) setPen(color);
    if (!ed()?.highlight(color)) {
      setHint('Selecciona primero el texto que quieres resaltar.');
      ed()?.focus();
    } else setHint(null);
  };
  const clear = () => {
    setMenu(null);
    if (!ed()?.clearFormat()) {
      setHint('Selecciona el texto al que quieres quitar el formato.');
      ed()?.focus();
    } else setHint(null);
  };
  const toggle = (k: ToggleKey) => ed()?.toggle(k);
  const list = (k: ListKind) => ed()?.toggleList(k);
  const block = (b: BlockStyle) => ed()?.setBlock(fmt.block === b ? 'normal' : b);
  // Keep the selection: a mousedown on a button would blur the editor first.
  const keep = (e: React.MouseEvent) => e.preventDefault();
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape' && menu) {
      e.stopPropagation();
      setMenu(null);
      ed()?.focus();
    }
  };

  const fgCss = fmt.fg ? TEXT_SWATCH[fmt.fg] : 'var(--label)';
  const penBg = HIGHLIGHTS.find((h) => h.id === pen)!.bg;
  const sep = <span className="bg-separator mx-1 h-5 w-px shrink-0" aria-hidden />;
  const stickTop = variant === 'page' ? 'top-[calc(env(safe-area-inset-top)+48px+var(--kb,0px))] lg:top-[var(--kb,0px)]' : 'top-[var(--kb,0px)]';

  const alignBtns = (
    <>
      {[
        { i: 0, Icon: AlignLeft, label: 'Alinear a la izquierda' },
        { i: 1, Icon: AlignCenter, label: 'Centrar' },
        { i: 2, Icon: AlignRight, label: 'Alinear a la derecha' },
      ].map(({ i, Icon, label }) => (
        <Tool key={i} label={label} pressed={fmt.align === i} onClick={() => ed()?.setAlign(i)}>
          <Icon size={17} />
        </Tool>
      ))}
    </>
  );

  return (
    <>
      <div ref={sentinel} className="h-0" aria-hidden />
      <div
        ref={barRef}
        role="toolbar"
        aria-label="Formato del texto"
        onKeyDown={onKeyDown}
        style={{ '--kb': `${kb}px` } as CSSProperties}
        className={cn(
          '@container sticky z-20 px-3 pt-2 pb-1.5 transition-[box-shadow,background-color] duration-200',
          stickTop,
          stuck && 'shadow-[inset_0_-0.5px_0_var(--separator),0_10px_18px_-14px_rgb(0_0_0/0.45)] backdrop-blur-md',
          stuck &&
            (variant === 'page'
              ? 'bg-[color-mix(in_srgb,var(--card)_93%,transparent)]'
              : 'bg-[color-mix(in_srgb,var(--bg)_93%,transparent)] dark:bg-[color-mix(in_srgb,var(--card)_93%,transparent)]'),
        )}
      >
        <div className="flex items-center">
          <Tool label={`Negrita (${kb_}B)`} pressed={fmt.bold} onClick={() => toggle('bold')}>
            <Bold size={17} strokeWidth={2.8} />
          </Tool>
          <Tool label={`Cursiva (${kb_}I)`} pressed={fmt.italic} onClick={() => toggle('italic')}>
            <Italic size={17} strokeWidth={2.4} />
          </Tool>
          <Tool label={`Subrayado (${kb_}U)`} pressed={fmt.underline} onClick={() => toggle('underline')}>
            <Underline size={17} strokeWidth={2.4} />
          </Tool>
          <Tool label={`Tachado (${sh}X)`} pressed={fmt.strike} onClick={() => toggle('strike')} className="hidden @min-[410px]:inline-flex">
            <Strikethrough size={17} strokeWidth={2.4} />
          </Tool>
          {sep}
          <Tool label="Color del texto" expanded={menu === 'fg'} onClick={() => setMenu(menu === 'fg' ? null : 'fg')}>
            <span className="flex flex-col items-center leading-none" aria-hidden>
              <span className="text-[16px] font-bold">A</span>
              <span className="mt-[2px] h-[3px] w-4 rounded-full" style={{ background: fgCss }} />
            </span>
          </Tool>
          <Tool label="Resaltador" expanded={menu === 'hl'} onClick={() => setMenu(menu === 'hl' ? null : 'hl')}>
            <span className="flex flex-col items-center leading-none" aria-hidden>
              <Highlighter size={15} />
              <span className="mt-[2px] h-[3px] w-4 rounded-full" style={{ background: penBg }} />
            </span>
          </Tool>
          {sep}
          <Tool label={`Viñetas (${sh}8)`} pressed={fmt.list === 'bullet'} onClick={() => list('bullet')}>
            <List size={18} />
          </Tool>
          <Tool label={`Lista numerada (${sh}7)`} pressed={fmt.list === 'num'} onClick={() => list('num')}>
            <ListOrdered size={18} />
          </Tool>
          <Tool label={`Lista de tareas (${sh}9)`} pressed={fmt.list === 'check'} onClick={() => list('check')}>
            <ListChecks size={18} />
          </Tool>
          <span className="hidden items-center @min-[480px]:flex">
            {sep}
            <Tool label="Título" pressed={fmt.block === 'title'} onClick={() => block('title')}>
              <Heading1 size={18} />
            </Tool>
            <Tool label="Subtítulo" pressed={fmt.block === 'subtitle'} onClick={() => block('subtitle')}>
              <Heading2 size={18} />
            </Tool>
          </span>
          <span className="hidden items-center @min-[620px]:flex">
            {sep}
            {alignBtns}
            <Tool label={`Quitar formato (${kb_}\\)`} onClick={clear}>
              <RemoveFormatting size={17} />
            </Tool>
          </span>
          <span className="min-w-1 flex-1" />
          <Tool label="Más opciones de formato" expanded={menu === 'more'} onClick={() => setMenu(menu === 'more' ? null : 'more')}>
            <Ellipsis size={18} />
          </Tool>
        </div>
        {hint && (
          <p className="text-label-2 px-1 pt-1 text-[12px]" role="status">
            {hint}
          </p>
        )}

        {menu === 'fg' && (
          <Pop label="Paleta de color del texto" anchor="Color del texto">
            <div className="grid grid-cols-5 gap-1.5">
              {TEXT_COLORS.map((c, i) => (
                <button
                  key={c.label}
                  type="button"
                  onMouseDown={keep}
                  onClick={() => {
                    setMenu(null);
                    ed()?.setColor(i);
                  }}
                  title={c.label}
                  aria-label={`Texto ${c.label.toLowerCase()}`}
                  aria-pressed={fmt.fg === i}
                  className={cn(
                    'relative inline-flex h-9 w-9 items-center justify-center rounded-full text-[17px] font-bold transition-transform active:scale-90',
                    fmt.fg === i ? 'bg-fill ring-2 ring-[var(--blue)]' : 'bg-fill-2 hover:bg-fill',
                  )}
                  style={{ color: c.css ?? 'var(--label)' }}
                >
                  A
                </button>
              ))}
            </div>
          </Pop>
        )}

        {menu === 'hl' && (
          <Pop label="Colores del resaltador" anchor="Resaltador">
            <div className="grid grid-cols-6 gap-1.5">
              {HIGHLIGHTS.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onMouseDown={keep}
                  onClick={() => paint(h.id)}
                  title={`Resaltar en ${h.label.toLowerCase()}`}
                  aria-label={`Resaltar en ${h.label.toLowerCase()}`}
                  className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-black/10 transition-transform active:scale-90"
                  style={{ background: h.bg }}
                >
                  {pen === h.id && <Check size={15} strokeWidth={3} className="text-label" aria-hidden />}
                </button>
              ))}
              <button
                type="button"
                onMouseDown={keep}
                onClick={() => paint(null)}
                title="Quitar resaltado"
                aria-label="Quitar resaltado"
                className="bg-fill-2 hover:bg-fill text-label-2 inline-flex h-9 w-9 items-center justify-center rounded-full"
              >
                <Eraser size={16} />
              </button>
            </div>
          </Pop>
        )}

        {menu === 'more' && (
          <Pop label="Más opciones de formato" wide>
            <div className="flex flex-col gap-2.5">
              <div className="flex flex-wrap items-center gap-1 @min-[480px]:hidden">
                <Seg label="Normal" pressed={fmt.block === 'normal'} onClick={() => ed()?.setBlock('normal')}>
                  <span className="text-[13px]">Normal</span>
                </Seg>
                <Seg label="Título" pressed={fmt.block === 'title'} onClick={() => ed()?.setBlock('title')}>
                  <Heading1 size={16} /> <span className="text-[13px]">Título</span>
                </Seg>
                <Seg label="Subtítulo" pressed={fmt.block === 'subtitle'} onClick={() => ed()?.setBlock('subtitle')}>
                  <Heading2 size={16} /> <span className="text-[13px]">Subtítulo</span>
                </Seg>
              </div>
              <div className="flex items-center gap-1 @min-[620px]:hidden">
                {alignBtns}
                <span className="flex-1" />
                <Tool label={`Tachado (${sh}X)`} pressed={fmt.strike} onClick={() => toggle('strike')} className="@min-[410px]:hidden">
                  <Strikethrough size={17} strokeWidth={2.4} />
                </Tool>
                <Tool label={`Quitar formato (${kb_}\\)`} onClick={clear}>
                  <RemoveFormatting size={17} />
                </Tool>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <label className="bg-fill-2 text-label flex h-9 min-w-0 items-center gap-1 rounded-[10px] pl-2" title="Tamaño de letra">
                  <ALargeSmall size={16} className="text-label-2 shrink-0" aria-hidden />
                  <select
                    value={fmt.size ?? ''}
                    onChange={(e) => ed()?.setSize(Number(e.target.value))}
                    aria-label="Tamaño de letra"
                    className="h-full min-w-0 flex-1 bg-transparent pr-1 text-[14px] outline-none"
                  >
                    {fmt.size === null && <option value="">Mixto</option>}
                    {SIZES.map((z, i) => (
                      <option key={z.label} value={i}>
                        {z.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="bg-fill-2 text-label flex h-9 min-w-0 items-center gap-1 rounded-[10px] pl-2" title="Tipo de letra">
                  <Type size={15} className="text-label-2 shrink-0" aria-hidden />
                  <select
                    value={fmt.font ?? ''}
                    onChange={(e) => ed()?.setFont(Number(e.target.value))}
                    aria-label="Fuente"
                    className="h-full min-w-0 flex-1 bg-transparent pr-1 text-[14px] outline-none"
                  >
                    {fmt.font === null && <option value="">Mixta</option>}
                    {FONTS.map((f, i) => (
                      <option key={f.label} value={i}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </div>
          </Pop>
        )}
      </div>
    </>
  );
}

/** A format-bar button (keeps the editor's selection when pressed). */
function Tool({
  label,
  pressed,
  expanded,
  onClick,
  className,
  children,
}: {
  label: string;
  pressed?: boolean;
  expanded?: boolean;
  onClick: () => void;
  className?: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-pressed={pressed}
      aria-expanded={expanded}
      aria-haspopup={expanded === undefined ? undefined : 'true'}
      title={label}
      aria-label={label}
      className={cn(
        'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-[transform,background-color] active:scale-90 @max-[340px]:w-8',
        pressed ? 'bg-label text-bg' : expanded ? 'bg-fill text-label' : 'text-label hover:bg-fill-2',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** A pill in the "Más" menu. */
function Seg({ label, pressed, onClick, children }: { label: string; pressed: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      aria-pressed={pressed}
      aria-label={label}
      className={cn('inline-flex h-9 items-center gap-1 rounded-full px-3 transition-colors', pressed ? 'bg-label text-bg' : 'bg-fill-2 text-label hover:bg-fill')}
    >
      {children}
    </button>
  );
}

/** A menu hanging under the format bar: centred under the button named `anchor` (kept inside the bar), or right-aligned. */
function Pop({ label, wide, anchor, children }: { label: string; wide?: boolean; anchor?: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [left, setLeft] = useState<number | null>(null);
  useLayoutEffect(() => {
    const pop = ref.current;
    const bar = pop?.parentElement;
    const btn = anchor ? bar?.querySelector<HTMLElement>(`[aria-label="${anchor}"]`) : null;
    if (!pop || !bar || !btn) return;
    const b = btn.getBoundingClientRect();
    const r = bar.getBoundingClientRect();
    const x = b.left - r.left + b.width / 2 - pop.offsetWidth / 2;
    setLeft(Math.max(12, Math.min(x, r.width - pop.offsetWidth - 12)));
  }, [anchor]);
  return (
    <div
      ref={ref}
      role="group"
      aria-label={label}
      style={left === null ? undefined : { left, right: 'auto' }}
      className={cn(
        'bg-elevated border-separator shadow-float absolute top-full right-3 z-30 mt-1 rounded-[16px] border p-2.5',
        wide ? 'w-[min(300px,calc(100%-24px))]' : 'w-max max-w-[calc(100%-24px)]',
      )}
    >
      {children}
    </div>
  );
}

function SyncLine({ className }: { className?: string }) {
  const uid = useAuth((s) => s.session?.user.id ?? null);
  const status = useNotesSync((s) => s.status);
  const cloud = uid && (status === 'synced' || status === 'syncing');
  const text = !uid
    ? 'Solo en este navegador · inicia sesión para guardarlas en la nube'
    : status === 'missing'
      ? 'Solo en este navegador · falta activar la nube (12_notes.sql)'
      : status === 'error'
        ? 'Sin conexión · se sincronizarán luego'
        : status === 'syncing'
          ? 'Sincronizando…'
          : 'En la nube · solo tú puedes verlas';
  return (
    <p className={cn('text-label-2 flex min-w-0 items-center gap-1.5 text-[12px]', className)}>
      {cloud ? <Cloud size={13} className="shrink-0" aria-hidden /> : <CloudOff size={13} className="shrink-0" aria-hidden />}
      <span className="truncate">{text}</span>
    </p>
  );
}
