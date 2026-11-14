/* Phrasal Verb Roulette (route /roulette): the class game runs inside the app, no iframe.
   engine.ts holds the game itself (unchanged rules, timer, coins and sounds); View.tsx and
   Front.tsx draw it. This component connects the two and cleans up on leaving. */
import { useEffect, useMemo, useReducer } from 'react';
import { useNavigate } from 'react-router-dom';
import { Engine } from './engine';
import { View } from './View';
import './roulette.css';

const FONTS = 'https://fonts.googleapis.com/css2?family=Press+Start+2P&family=Fredoka:wght@400;500;600;700&family=Pixelify+Sans:wght@400;500;600;700&display=swap';

export default function RouletteApp() {
  const navigate = useNavigate();
  const [, redraw] = useReducer((n: number) => n + 1, 0);
  const engine = useMemo(() => new Engine(), []);
  engine.props = {
    pointsPerCorrect: 10,
    onExit: () => { if (document.fullscreenElement) void document.exitFullscreen(); navigate('/games'); },
  };

  useEffect(() => {
    if (!document.querySelector(`link[href="${FONTS}"]`)) {
      const l = document.createElement('link');
      l.rel = 'stylesheet'; l.href = FONTS;
      document.head.appendChild(l);
    }
    const title = document.title, overflow = document.body.style.overflow;
    document.title = 'Phrasal Verb Roulette';
    document.body.style.overflow = 'hidden';
    const off = engine.subscribe(redraw);
    engine.componentDidMount();
    return () => {
      off();
      engine.componentWillUnmount();
      (engine as unknown as { _ac: AudioContext | null })._ac = null;
      document.title = title;
      document.body.style.overflow = overflow;
    };
  }, [engine]);

  return <div className="pvr"><View v={engine.renderVals()} /></div>;
}
