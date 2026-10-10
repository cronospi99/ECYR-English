import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ModuleFrame } from '@/components/learning/ModuleFrame';
import { moduleBySlug } from '@/content/catalog';
import { useProgress } from '@/store/progress';
import NotFound from '../NotFound';

export default function PlayerPage() {
  const { slug = '' } = useParams();
  const m = moduleBySlug(slug);
  const playGame = useProgress((s) => s.playGame);

  useEffect(() => {
    if (!m) return;
    // Count a play after a minute of real use, not on every accidental open.
    const t = setTimeout(() => playGame(m.slug, m.title), 60_000);
    return () => clearTimeout(t);
  }, [m, playGame]);

  if (!m) return <NotFound />;
  const backTo = m.kind === 'book' ? `/learn/${m.levels[0]!.toLowerCase()}` : m.kind === 'course' ? '/learn/foundations' : '/games';
  return <ModuleFrame src={m.src} title={m.title} backTo={backTo} accent={m.accent} />;
}
