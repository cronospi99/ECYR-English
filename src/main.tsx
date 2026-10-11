import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router-dom';
import { MotionConfig } from 'motion/react';
import { router } from './router';
import { useAuth } from './store/auth';
import { useSettings, applyTheme } from './store/settings';
import { startSync } from './lib/sync';
import { startGameBridge } from './lib/gameBridge';
import './styles/index.css';

applyTheme(useSettings.getState().theme);
matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
  if (useSettings.getState().theme === 'system') applyTheme('system');
});

startGameBridge();
void useAuth.getState().init().then(startSync);

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MotionConfig reducedMotion="user">
      <RouterProvider router={router} />
    </MotionConfig>
  </StrictMode>,
);
