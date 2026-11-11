import { NotebookPen } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { NotesPanel } from './NotesPanel';

/** /notes — "Mis notas", full page. */
export default function NotesPage() {
  return (
    <Page
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <NotebookPen size={15} className="text-ink-yellow" aria-hidden /> Private notes
        </span>
      }
      title="My notes"
      subtitle="Notes only you can see. They save themselves as you type and remember the page where you took them."
      wide
    >
      <NotesPanel variant="page" />
    </Page>
  );
}
