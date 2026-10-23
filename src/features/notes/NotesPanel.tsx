import { useEffect, useId, useMemo, useRef, useState, type RefObject } from 'react';
import { Link } from 'react-router-dom';
import { Bold, ChevronLeft, Cloud, CloudOff, Eraser, Highlighter, Italic, MapPin, NotebookPen, Plus, RemoveFormatting, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Misc';
import { useAuth } from '@/store/auth';
import { MAX_NOTE_BODY, noteTitle, useNotes, visibleNotes, type Note } from '@/store/notes';
import { relativeTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import { FONTS, HIGHLIGHTS, PLAIN, SIZES, segments, segStyle, stripHighlights, type HighlightColor, type Segment } from '@/lib/highlights';
import { RichNoteEditor, type FormatState, type RichEditorHandle } from './RichNoteEditor';
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
        showBack={variant === 'sheet'}
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
        <div className={cn('bg-card shadow-card rounded-card min-w-0 overflow-hidden', !editor && 'hidden lg:flex lg:items-center lg:justify-center')}>
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
        g.color || g.bold || g.italic ? (
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
  showBack,
}: {
  note: Note | null;
  draftPage: { title: string; path: string };
  owner: string | null;
  onCreated: (id: string) => void;
  onBack: () => void;
  onNavigate?: () => void;
  showBack: boolean;
}) {
  const create = useNotes((s) => s.create);
  const update = useNotes((s) => s.update);
  const remove = useNotes((s) => s.remove);
  const [text, setText] = useState(note?.body ?? '');
  const [saved, setSaved] = useState(true);
  const [confirm, setConfirm] = useState(false);
  const latest = useRef({ id: note?.id ?? null, text });
  const stored = useRef(note?.body ?? '');
  const editor = useRef<RichEditorHandle>(null);
  const [fmt, setFmt] = useState<FormatState>({ bold: false, italic: false, size: 0, font: 0, range: false });
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
      <FormatBar editor={editor} fmt={fmt} />
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

/** Bold, italics and highlighter pens: select text, then tap a button (Ctrl/⌘+B, Ctrl/⌘+I also work). */
function FormatBar({ editor, fmt }: { editor: RefObject<RichEditorHandle | null>; fmt: FormatState }) {
  const [hint, setHint] = useState<string | null>(null);
  useEffect(() => {
    if (fmt.range) setHint(null);
  }, [fmt.range]);
  const mac = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);
  const kb = mac ? '⌘' : 'Ctrl+';
  const paint = (color: HighlightColor | null) => {
    if (!editor.current?.highlight(color)) {
      setHint('Selecciona primero el texto que quieres resaltar.');
      editor.current?.focus();
    } else setHint(null);
  };
  const clear = () => {
    if (!editor.current?.clearFormat()) {
      setHint('Selecciona el texto al que quieres quitar el formato.');
      editor.current?.focus();
    } else setHint(null);
  };
  // Keep the selection: a mousedown on a button would blur the editor first.
  const keep = (e: React.MouseEvent) => e.preventDefault();
  const tool = 'inline-flex h-8 w-8 items-center justify-center rounded-[9px] transition-colors active:scale-90';
  return (
    <div className="flex flex-wrap items-center gap-1.5 px-4 pt-3" role="toolbar" aria-label="Formato del texto">
      <button
        type="button"
        onMouseDown={keep}
        onClick={() => editor.current?.toggle('bold')}
        aria-pressed={fmt.bold}
        title={`Negrita (${kb}B)`}
        aria-label={`Negrita (${kb}B)`}
        className={cn(tool, fmt.bold ? 'bg-label text-bg' : 'text-label hover:bg-fill-2')}
      >
        <Bold size={16} strokeWidth={2.8} />
      </button>
      <button
        type="button"
        onMouseDown={keep}
        onClick={() => editor.current?.toggle('italic')}
        aria-pressed={fmt.italic}
        title={`Cursiva (${kb}I)`}
        aria-label={`Cursiva (${kb}I)`}
        className={cn(tool, fmt.italic ? 'bg-label text-bg' : 'text-label hover:bg-fill-2')}
      >
        <Italic size={16} strokeWidth={2.4} />
      </button>
      <select
        value={fmt.size ?? ''}
        onChange={(e) => editor.current?.setSize(Number(e.target.value))}
        aria-label="Tamaño de letra"
        title="Tamaño de letra"
        className="bg-fill-2 text-label h-8 max-w-[108px] rounded-[9px] px-1.5 text-[13px] outline-none"
      >
        {fmt.size === null && <option value="">Mixto</option>}
        {SIZES.map((z, i) => (
          <option key={z.label} value={i}>
            {z.label}
          </option>
        ))}
      </select>
      <select
        value={fmt.font ?? ''}
        onChange={(e) => editor.current?.setFont(Number(e.target.value))}
        aria-label="Fuente"
        title="Tipo de letra"
        className="bg-fill-2 text-label h-8 max-w-[150px] rounded-[9px] px-1.5 text-[13px] outline-none"
      >
        {fmt.font === null && <option value="">Mixta</option>}
        {FONTS.map((f, i) => (
          <option key={f.label} value={i}>
            {f.label}
          </option>
        ))}
      </select>
      <span className="bg-separator mx-0.5 h-5 w-px" aria-hidden />
      <Highlighter size={15} className="text-label-2" aria-hidden />
      {HIGHLIGHTS.map((h) => (
        <button
          key={h.id}
          type="button"
          onMouseDown={keep}
          onClick={() => paint(h.id)}
          title={`Resaltar en ${h.label.toLowerCase()}`}
          aria-label={`Resaltar en ${h.label.toLowerCase()}`}
          className="h-7 w-7 rounded-full border border-black/10 transition-transform active:scale-90"
          style={{ background: h.bg }}
        />
      ))}
      <button type="button" onMouseDown={keep} onClick={() => paint(null)} title="Quitar resaltado" aria-label="Quitar resaltado" className={cn(tool, 'text-label-2 hover:bg-fill-2 rounded-full')}>
        <Eraser size={15} />
      </button>
      <button type="button" onMouseDown={keep} onClick={clear} title="Quitar todo el formato" aria-label="Quitar todo el formato" className={cn(tool, 'text-label-2 hover:bg-fill-2 rounded-full')}>
        <RemoveFormatting size={15} />
      </button>
      {hint && (
        <span className="text-label-2 w-full text-[12px]" role="status">
          {hint}
        </span>
      )}
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
