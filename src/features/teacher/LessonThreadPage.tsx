import { lazy, Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import { School } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Misc';
import { useClass } from './useClass';

const ThreadApp = lazy(() => import('./thread/ThreadApp'));
const ClassicThread = lazy(() => import('./thread/ClassicThread'));

/**
 * Hilo de la clase (solo docentes). v2 por defecto: contexto puente + plan PPP editable
 * (docs/hilo-clase-v2.md). `?v=1` abre el modo clásico (un texto central y un capítulo por punto).
 */
export default function LessonThreadPage() {
  const { isTeacher } = useClass();
  const [sp] = useSearchParams();
  if (!isTeacher)
    return (
      <Page title="Hilo de la clase">
        <Card className="mx-auto max-w-md p-6 text-center">
          <School size={40} className="text-ink-orange mx-auto" />
          <h2 className="text-title-3 mt-3">Solo para docentes</h2>
          <ButtonLink to="/profile" className="mt-4">
            Ir a mi perfil
          </ButtonLink>
        </Card>
      </Page>
    );
  return <Suspense fallback={<PageLoader />}>{sp.get('v') === '1' ? <ClassicThread /> : <ThreadApp />}</Suspense>;
}
