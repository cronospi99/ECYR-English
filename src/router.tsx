import { lazy, Suspense, type ComponentType } from 'react';
import { createBrowserRouter, Navigate } from 'react-router-dom';
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
      { path: 'learn/grammar', element: page(() => import('./features/grammar/GrammarHubPage')) },
      { path: 'learn/grammar/time-machine', element: page(() => import('./features/grammar/time-machine/TimeMachinePage')) },
      { path: 'learn/grammar/modals', element: page(() => import('./features/grammar/modals/ModalsPage')) },
      { path: 'learn/grammar/do-make', element: page(() => import('./features/grammar/do-make/DoMakePage')) },
      { path: 'learn/grammar/tenses', element: page(() => import('./features/grammar/tenses/TensesPage')) },
      { path: 'learn/grammar/time-family', element: page(() => import('./features/grammar/time-family/TimeFamilyPage')) },
      { path: 'learn/:level', element: page(() => import('./features/learn/LevelPage')) },
      { path: 'learn/:level/:unit', element: page(() => import('./features/learn/UnitPage')) },
      { path: 'exams/:examId', element: page(() => import('./features/exams/ExamPage')) },
      { path: 'practice', element: page(() => import('./features/practice/PracticePage')) },
      { path: 'practice/verbs', element: page(() => import('./features/verblab/VerbLabPage')) },
      { path: 'practice/phrasal-verbs', element: page(() => import('./features/practice/PhrasalVerbsPage')) },
      { path: 'practice/reading', element: page(() => import('./features/practice/ReadingPage')) },
      { path: 'practice/listening', element: page(() => import('./features/practice/ListeningPage')) },
      { path: 'practice/speaking', element: page(() => import('./features/practice/SpeakingPage')) },
      { path: 'practice/writing', element: page(() => import('./features/practice/WritingPage')) },
      { path: 'practice/vocabulary', element: page(() => import('./features/vocabulary/VocabularyPage')) },
      { path: 'practice/workshops', element: page(() => import('./features/workshops/WorkshopsPage')) },
      { path: 'practice/workshops/:id', element: page(() => import('./features/workshops/WorkshopsPage')) },
      { path: 'notes', element: page(() => import('./features/notes/NotesPage')) },
      { path: 'portfolio', element: page(() => import('./features/portfolio/PortfolioPage')) },
      { path: 'import', element: page(() => import('./features/migrate/ImportPage')) },
      { path: 'teacher', element: page(() => import('./features/teacher/TeacherPage')) },
      { path: 'admin/teachers', element: page(() => import('./features/admin/TeacherInvitesPage')) },
      { path: 'boards', element: page(() => import('./features/boards/BoardsPage')) },
      { path: 'practice/draw', element: page(() => import('./features/draw/DrawPage')) },
      { path: 'teacher/thread', element: page(() => import('./features/teacher/LessonThreadPage')) },
      { path: 'teacher/student/:id', element: page(() => import('./features/teacher/StudentPage')) },
      { path: 'tasks', element: page(() => import('./features/tasks/TasksPage')) },
      { path: 'learn/visuals', element: page(() => import('./features/visuals/VisualsPage')) },
      { path: 'plan', element: page(() => import('./features/plan/PlanPage')) },
      { path: 'games', element: page(() => import('./features/games/GamesPage')) },
      { path: 'ielts/:mod?', element: page(() => import('./features/ielts/IeltsPage')) },
      { path: 'coach', element: page(() => import('./features/coach/CoachPage')) },
      { path: 'progress', element: page(() => import('./features/progress/ProgressPage')) },
      { path: 'profile', element: page(() => import('./features/profile/ProfilePage')) },
      { path: '*', element: page(() => import('./features/NotFound')) },
    ],
  },
  // Former "games" that are now grammar modules: keep old links working.
  ...(
    [
      ['time-machine', 'time-machine'],
      ['time-family', 'time-family'],
      ['modal-verbs-zone', 'modals'],
    ] as const
  ).map(([from, to]) => ({ path: `play/${from}`, element: <Navigate to={`/learn/grammar/${to}`} replace /> })),
  // Full-screen players (no chrome)
  { path: 'board/:id', element: page(() => import('./features/boards/BoardPage')), errorElement: <RouteError /> },
  { path: 'teacher/screen', element: page(() => import('./features/screen/ClassroomScreenPage')), errorElement: <RouteError /> },
  // Live classroom games: own screens, nested routes inside each app.
  { path: 'classwars/*', element: page(() => import('./features/classwars/ClassWarsApp')), errorElement: <RouteError /> },
  { path: 'impostor/*', element: page(() => import('./features/impostor/ImpostorApp')), errorElement: <RouteError /> },
  { path: 'play/:slug', element: page(() => import('./features/games/PlayerPage')), errorElement: <RouteError /> },
]);
