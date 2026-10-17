import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Languages, NotebookPen } from 'lucide-react';
import { Sheet } from '@/features/portfolio/Sheet';
import { TranslatorHost, registerTranslatorNoteSaver, useTranslator } from '@/components/learning/Translator';
import { useAuth } from '@/store/auth';
import { useNotes } from '@/store/notes';
import { cn } from '@/lib/cn';
import { NotesPanel } from './NotesPanel';
import { currentPageInfo } from './pageInfo';

/**
 * The floating dock (bottom-right, above the mobile tab bar): "Mis notas" and
 * the translator, available on every page of the app shell.
 */
export function NotesDock() {
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const tOpen = useTranslator((s) => s.open);
  const toggleT = useTranslator((s) => s.toggle);
  const closeT = useTranslator((s) => s.close);

  // "A mis notas" in the translator saves a note tagged with this page.
  useEffect(() => {
    registerTranslatorNoteSaver((text) => {
      const page = currentPageInfo();
      useNotes.getState().create({ body: text, pageTitle: page.title, pagePath: page.path, owner: useAuth.getState().session?.user.id ?? null });
    });
    return () => registerTranslatorNoteSaver(null);
  }, []);

  // Navigating closes the sheet (e.g. "back to the page of this note").
  useEffect(() => setOpen(false), [pathname]);

  // Alt+N opens the notes from anywhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.altKey && !e.ctrlKey && !e.metaKey && (e.key === 'n' || e.key === 'N' || e.code === 'KeyN')) {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const onNotesPage = pathname === '/notes';
  const btn =
    'inline-flex h-10 w-10 lg:h-9 lg:w-9 items-center justify-center rounded-full transition-[transform,background-color] active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--blue)]';

  return (
    <>
      <div
        className={cn(
          'material shadow-float border-separator fixed right-3 z-40 flex gap-0.5 rounded-full border p-1',
          'bottom-[calc(env(safe-area-inset-bottom)+60px)] lg:right-1 lg:bottom-5 lg:flex-col lg:p-0.5',
        )}
        role="toolbar"
        aria-label="Herramientas"
      >
        {!onNotesPage && (
          <button
            type="button"
            className={cn(btn, 'text-ink-yellow hover:bg-fill-2', open && 'bg-fill-2')}
            onClick={() => {
              closeT();
              setOpen(true);
            }}
            aria-label="Mis notas (Alt+N)"
            title="Mis notas (Alt+N)"
            aria-haspopup="dialog"
          >
            <NotebookPen size={20} strokeWidth={2.1} />
          </button>
        )}
        <button
          type="button"
          className={cn(btn, 'text-ink-indigo hover:bg-fill-2', tOpen && 'bg-[color-mix(in_srgb,var(--indigo)_16%,transparent)]')}
          onMouseDown={(e) => e.preventDefault()}
          onClick={toggleT}
          aria-label="Traductor"
          title="Traductor inglés ↔ español"
          aria-expanded={tOpen}
          aria-haspopup="dialog"
        >
          <Languages size={20} strokeWidth={2.1} />
        </button>
      </div>

      <TranslatorHost />

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Mis notas"
        trailing={
          <Link to="/notes" className="text-ink-blue h-9 rounded-[10px] px-2 text-[17px] leading-9 whitespace-nowrap hover:opacity-70">
            Ver todo
          </Link>
        }
      >
        <NotesPanel variant="sheet" onNavigate={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
