import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, Cloud, CloudOff, MapPin, NotebookPen, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/Misc';
import { useAuth } from '@/store/auth';
import { MAX_NOTE_BODY, noteTitle, useNotes, visibleNotes, type Note } from '@/store/notes';
import { relativeTime } from '@/lib/date';
import { cn } from '@/lib/cn';
import { currentPageInfo } from './pageInfo';
import { refreshNotes, useNotesSync } from './sync';

const fold = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

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
                <span className="text-label-2 line-clamp-1 w-full text-[13px]">{snippet(n)}</span>
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

function snippet(n: Note) {
  const rest = n.body.trim().split('\n').slice(1).join(' ').trim();
  return rest || ' ';
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
  const area = useRef<HTMLTextAreaElement>(null);
  const areaId = useId();

  // Focus with the caret at the end (not the start) of an existing note.
  useEffect(() => {
    const el = area.current;
    if (!el) return;
    el.focus({ preventScroll: true });
    el.setSelectionRange(el.value.length, el.value.length);
  }, []);

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
      <label htmlFor={areaId} className="sr-only">
        Texto de la nota
      </label>
      <textarea
        id={areaId}
        ref={area}
        value={text}
        maxLength={MAX_NOTE_BODY}
        onChange={(e) => setText(e.target.value)}
        placeholder="Escribe tu nota… (la primera línea es el título)"
        className="placeholder:text-label-3 min-h-[260px] w-full flex-1 resize-none bg-transparent px-4 py-3 text-[16px] leading-relaxed outline-none"
      />
      <div className="text-label-2 flex justify-between gap-3 px-4 pb-3 text-[12px]">
        <SyncLine />
        <span className="shrink-0 tabular-nums">
          {text.length.toLocaleString('es')}/{MAX_NOTE_BODY.toLocaleString('es')}
        </span>
      </div>
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
