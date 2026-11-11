import { lazy, Suspense, useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FlaskConical, Languages, MonitorPlay, NotebookPen, StickyNote } from 'lucide-react';
import { PageLoader } from '@/components/ui/Misc';
import { Sheet } from '@/features/portfolio/Sheet';
import { TranslatorHost, registerTranslatorNoteSaver, useTranslator } from '@/components/learning/Translator';
import { useAuth } from '@/store/auth';
import { useNotes } from '@/store/notes';
import { cn } from '@/lib/cn';
import { NotesPanel } from './NotesPanel';
import { currentPageInfo } from './pageInfo';

// The quick Verb Lab (conjugation + phrasal verbs) loads only when first opened.
const QuickVerbLab = lazy(() => import('@/features/verblab/QuickVerbLab'));
const VERB_LAB_PATH = '/practice/verbs';

/**
 * The floating dock (bottom-right above the mobile tab bar; a vertical column
 * at the right edge on desktop): the classroom screen (teachers), quick Verb Lab, "Mis notas" and the
 * translator, available on every page of the app shell. AppShell keeps a
 * right gutter on desktop so the column never covers page content.
 */
export function NotesDock() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const isTeacher = useAuth((s) => s.profile?.role === 'teacher');
  const session = useAuth((s) => !!s.session);
  const [open, setOpen] = useState(false);
  const [verbs, setVerbs] = useState(false);
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
  useEffect(() => {
    setOpen(false);
    setVerbs(false);
  }, [pathname]);

  const onVerbLab = pathname === VERB_LAB_PATH;

  // Alt+N opens the notes, Alt+V the quick Verb Lab, Alt+P (teachers) the classroom screen, from anywhere (e.code: Option+V on a Mac types √).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.code === 'KeyN' || e.key === 'n' || e.key === 'N') {
        e.preventDefault();
        setVerbs(false);
        setOpen((v) => !v);
      } else if ((e.code === 'KeyV' || e.key === 'v' || e.key === 'V') && !onVerbLab) {
        e.preventDefault();
        setOpen(false);
        closeT();
        setVerbs((v) => !v);
      } else if ((e.code === 'KeyP' || e.key === 'p' || e.key === 'P') && isTeacher) {
        e.preventDefault();
        navigate('/teacher/screen');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onVerbLab, closeT, isTeacher, navigate]);

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
        aria-label="Tools"
      >
        {isTeacher && (
          <Link
            to="/teacher/screen"
            className={cn(btn, 'text-ink-blue hover:bg-fill-2')}
            aria-label="Class screen (Alt+P)"
            title="Class screen: timer, wheel, groups… (Alt+P)"
          >
            <MonitorPlay size={20} strokeWidth={2.1} />
          </Link>
        )}
        {session && !pathname.startsWith('/boards') && (
          <Link to="/boards" className={cn(btn, 'text-ink-pink hover:bg-fill-2')} aria-label="Live board" title="Live board: cards with your class">
            <StickyNote size={20} strokeWidth={2.1} />
          </Link>
        )}
        {!onVerbLab && (
          <button
            type="button"
            className={cn(btn, 'text-ink-orange hover:bg-fill-2', verbs && 'bg-fill-2')}
            onClick={() => {
              closeT();
              setOpen(false);
              setVerbs(true);
            }}
            aria-label="Verb Lab: conjugation and phrasal verbs (Alt+V)"
            title="Verb Lab: conjugation and phrasal verbs (Alt+V)"
            aria-haspopup="dialog"
          >
            <FlaskConical size={20} strokeWidth={2.1} />
          </button>
        )}
        {!onNotesPage && (
          <button
            type="button"
            className={cn(btn, 'text-ink-yellow hover:bg-fill-2', open && 'bg-fill-2')}
            onClick={() => {
              closeT();
              setVerbs(false);
              setOpen(true);
            }}
            aria-label="My notes (Alt+N)"
            title="My notes (Alt+N)"
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
          aria-label="Translator"
          title="English ↔ Spanish translator"
          aria-expanded={tOpen}
          aria-haspopup="dialog"
        >
          <Languages size={20} strokeWidth={2.1} />
        </button>
      </div>

      <TranslatorHost />

      <Sheet open={verbs} onClose={() => setVerbs(false)} title="Verb Lab" className="h-[90dvh] sm:h-[min(84vh,780px)]">
        <Suspense fallback={<PageLoader />}>
          <QuickVerbLab onNavigate={() => setVerbs(false)} />
        </Suspense>
      </Sheet>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="My notes"
        trailing={
          <Link to="/notes" className="text-ink-blue h-9 rounded-[10px] px-2 text-[17px] leading-9 whitespace-nowrap hover:opacity-70">
            See all
          </Link>
        }
      >
        <NotesPanel variant="sheet" onNavigate={() => setOpen(false)} />
      </Sheet>
    </>
  );
}
