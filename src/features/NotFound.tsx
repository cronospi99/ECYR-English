import { Compass } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { EmptyState } from '@/components/ui/Misc';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <Page>
      <EmptyState
        icon={<Compass size={56} />}
        title="Página no encontrada"
        body="Este camino no está en el mapa. Volvamos a la ruta principal."
        action={<ButtonLink to="/">Ir al inicio</ButtonLink>}
      />
    </Page>
  );
}
