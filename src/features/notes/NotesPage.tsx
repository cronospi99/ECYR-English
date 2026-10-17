import { NotebookPen } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { NotesPanel } from './NotesPanel';

/** /notes — "Mis notas", full page. */
export default function NotesPage() {
  return (
    <Page
      eyebrow={
        <span className="inline-flex items-center gap-1.5">
          <NotebookPen size={15} className="text-ink-yellow" aria-hidden /> Notas privadas
        </span>
      }
      title="Mis notas"
      subtitle="Apuntes que solo tú puedes ver. Se guardan solas mientras escribes y recuerdan la página donde las tomaste."
      wide
    >
      <NotesPanel variant="page" />
    </Page>
  );
}
