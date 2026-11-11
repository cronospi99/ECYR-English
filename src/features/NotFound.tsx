import { Compass } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { EmptyState } from '@/components/ui/Misc';
import { ButtonLink } from '@/components/ui/Button';

export default function NotFound() {
  return (
    <Page>
      <EmptyState
        icon={<Compass size={56} />}
        title="Page not found"
        body="This path is not on the map. Let’s get back to the main route."
        action={<ButtonLink to="/">Go home</ButtonLink>}
      />
    </Page>
  );
}
