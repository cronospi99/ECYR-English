import { useEffect } from 'react';

/* The live games (Impostor, the cards) use Archivo Black / Archivo / Space Mono.
   They are loaded only while one of those screens is open, never app-wide. */
const HREF =
  'https://fonts.googleapis.com/css2?family=Archivo+Black&family=Archivo:wght@500;600;700;800&family=Space+Mono:wght@400;700&display=swap';
let users = 0;

export function useGameFonts() {
  useEffect(() => {
    users++;
    let link = document.querySelector<HTMLLinkElement>('link[data-game-fonts]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = HREF;
      link.dataset.gameFonts = '1';
      document.head.appendChild(link);
    }
    return () => {
      users--;
      // Keep it a moment: navigating between game screens should not refetch.
      setTimeout(() => {
        if (users <= 0) document.querySelector('link[data-game-fonts]')?.remove();
      }, 4000);
    };
  }, []);
}
