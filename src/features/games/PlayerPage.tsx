import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { ModuleFrame } from '@/components/learning/ModuleFrame';
import { moduleBySlug } from '@/content/catalog';
import { useProgress } from '@/store/progress';
import { useAuth } from '@/store/auth';
import { TRACKED_GAMES } from '@/store/games';
import NotFound from '../NotFound';

/** Team games that can also be played by one learner (they report 'solo' then). */
const SOLO_CAPABLE = new Set(['two-truths-colombia', 'too-good-to-be-true']);

export default function PlayerPage() {
  const { slug = '' } = useParams();
  const m = moduleBySlug(slug);
  const playGame = useProgress((s) => s.playGame);
  const role = useAuth((s) => s.profile?.role);

  useEffect(() => {
    // Games that report results are counted by the bridge (src/lib/gameBridge.ts).
    if (!m || TRACKED_GAMES[m.slug]) return;
    // Others: count a play after a minute of real use, not on every accidental open.
    const t = setTimeout(() => playGame(m.slug, m.title), 60_000);
    return () => clearTimeout(t);
  }, [m, playGame]);

  if (!m) return <NotFound />;
  const backTo = m.kind === 'book' ? `/learn/${m.levels[0]!.toLowerCase()}` : m.kind === 'course' ? '/learn/foundations' : '/games';
  // A learner playing a team game on their own device plays solo (and is graded);
  // a teacher runs it for the class on the projector.
  const src = SOLO_CAPABLE.has(m.slug) && role !== 'teacher' ? `${m.src}?mode=solo` : m.src;
  return <ModuleFrame src={src} title={m.title} backTo={backTo} accent={m.accent} />;
}
