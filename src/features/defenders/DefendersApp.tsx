/* Language Defenders (route /defenders): 3D lane defence where every defender is earned with an
   English answer. The game runs inside the app — no iframe. This component owns the page: it
   mounts the screens, boots the engine and tears everything down when the player leaves.
   The engine and UI logic under ./legacy are ported from the first version of the game; the
   cast (./characters) is modelled in code. */
import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { MARKUP } from './markup';
import './legacy.css';
import './skin.css';

const FONTS = 'https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Nunito:wght@600;700;800;900&display=swap';

function loadOnce(tag: 'link' | 'script', url: string) {
  if (document.querySelector(`[data-ld="${url}"]`)) return;
  const el = document.createElement(tag);
  el.dataset.ld = url;
  if (el instanceof HTMLLinkElement) { el.rel = 'stylesheet'; el.href = url; } else (el as HTMLScriptElement).src = url;
  document.head.appendChild(el);
}

export default function DefendersApp() {
  const root = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const el = root.current!;
    loadOnce('link', FONTS);
    loadOnce('script', '/defenders/vendor/peerjs.min.js'); // Class Mode transport
    el.innerHTML = MARKUP;
    const prevTitle = document.title;
    document.title = 'Language Defenders — Learn · Defend · Win';
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    let gone = false;
    let dispose: (() => void) | null = null;
    void import('./legacy/main').then((m) => {
      if (gone) return;
      dispose = m.dispose;
      void m.boot();
    });

    const onClick = (e: MouseEvent) => {
      const t = (e.target as HTMLElement).closest('button');
      if (!t) return;
      if (t.id === 'btn-exit') {
        if (document.fullscreenElement) void document.exitFullscreen();
        navigate('/games');
      } else if (t.id === 'btn-full') {
        if (document.fullscreenElement) void document.exitFullscreen();
        else void el.requestFullscreen?.().catch(() => undefined);
      }
    };
    el.addEventListener('click', onClick);

    return () => {
      gone = true;
      el.removeEventListener('click', onClick);
      dispose?.();
      el.innerHTML = '';
      document.title = prevTitle;
      document.body.style.overflow = prevOverflow;
    };
  }, [navigate]);

  return <div id="ld-app" ref={root} />;
}
