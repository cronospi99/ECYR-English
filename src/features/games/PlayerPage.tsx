import { useEffect } from 'react';
import { useParams, Navigate } from 'react-router-dom';
import { ModuleFrame } from '@/components/learning/ModuleFrame';
import { moduleBySlug } from '@/content/catalog';
import { useProgress } from '@/store/progress';
import { useAuth } from '@/store/auth';
import { TRACKED_GAMES } from '@/store/games';
import NotFound from '../NotFound';

/** Team games that can also be played by one learner (they report 'solo' then). */
const SOLO_CAPABLE = new Set(['two-truths-colombia', 'too-good-to-be-true']);

declare const __BUILD_ID__: string;

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
  // Games that live inside the app have their own route instead of an iframe.
  if (!m.src.includes('.')) return <Navigate to={m.src} replace />;
  const backTo = m.kind === 'book' ? `/learn/${m.levels[0]!.toLowerCase()}` : m.kind === 'course' ? '/learn/foundations' : '/games';
  // A learner playing a team game on their own device plays solo (and is graded);
  // a teacher runs it for the class on the projector.
  // v=<build> makes the browser fetch the module again after every deploy (they are plain HTML files with a fixed address).
  // A join QR (e.g. Da World's class room) lands here as /play/<slug>#join=CODE: the code goes on to the game.
  const join = /^#join=[A-Za-z0-9]{4,8}$/.test(location.hash) ? location.hash : '';
  const src = `${m.src}?v=${__BUILD_ID__}${SOLO_CAPABLE.has(m.slug) && role !== 'teacher' ? '&mode=solo' : ''}${join}`;
  return <ModuleFrame src={src} title={m.title} backTo={backTo} accent={m.accent} immersive={m.kind === 'game'} />;
}
