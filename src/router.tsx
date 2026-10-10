import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { PageLoader } from './components/ui/Misc';
import { RouteError } from './features/RouteError';

function page(load: () => Promise<{ default: ComponentType }>) {
  const C = lazy(load);
  return (
    <Suspense fallback={<PageLoader />}>
      <C />
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    element: <AppShell />,
    errorElement: <RouteError />,
    children: [
      { index: true, element: page(() => import('./features/home/HomePage')) },
      { path: 'learn', element: page(() => import('./features/learn/LearnPage')) },
      { path: 'learn/foundations', element: page(() => import('./features/foundations/FoundationsPage')) },
      { path: 'learn/foundations/:topicId', element: page(() => import('./features/foundations/TopicPage')) },
      { path: 'learn/:level', element: page(() => import('./features/learn/LevelPage')) },
      { path: 'learn/:level/:unit', element: page(() => import('./features/learn/UnitPage')) },
      { path: 'practice', element: page(() => import('./features/practice/PracticePage')) },
      { path: 'practice/phrasal-verbs', element: page(() => import('./features/practice/PhrasalVerbsPage')) },
      { path: 'practice/reading', element: page(() => import('./features/practice/ReadingPage')) },
      { path: 'practice/listening', element: page(() => import('./features/practice/ListeningPage')) },
      { path: 'practice/speaking', element: page(() => import('./features/practice/SpeakingPage')) },
      { path: 'practice/writing', element: page(() => import('./features/practice/WritingPage')) },
      { path: 'games', element: page(() => import('./features/games/GamesPage')) },
      { path: 'ielts', element: page(() => import('./features/ielts/IeltsPage')) },
      { path: 'coach', element: page(() => import('./features/coach/CoachPage')) },
      { path: 'progress', element: page(() => import('./features/progress/ProgressPage')) },
      { path: 'profile', element: page(() => import('./features/profile/ProfilePage')) },
      { path: '*', element: page(() => import('./features/NotFound')) },
    ],
  },
  // Full-screen players (no chrome)
  { path: 'play/:slug', element: page(() => import('./features/games/PlayerPage')), errorElement: <RouteError /> },
  { path: 'ielts/simulator', element: page(() => import('./features/ielts/IeltsSimulatorPage')), errorElement: <RouteError /> },
]);
