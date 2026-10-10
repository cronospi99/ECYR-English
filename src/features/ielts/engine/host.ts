/**
 * Runs the IELTS Simulator engine inside the platform — same document, same
 * router, same Supabase client and session, styled by the platform's skin.
 *
 * The engine is the simulator's own logic (imported by scripts/import-ielts.mjs)
 * and renders into `#panel` with plain DOM. It boots once; its root element is
 * moved into whichever React container is showing the IELTS section, and
 * parked (hidden, still in the document) when the learner goes elsewhere, so a
 * running exam clock or a recording keeps its state.
 */
import overlaysHtml from './overlays.html?raw';
import { supabase, supabaseConfig } from '@/lib/supabase';

export type IeltsModule =
  | 'dashboard'
  | 'listening'
  | 'reading'
  | 'writing'
  | 'speaking'
  | 'practice'
  | 'mock'
  | 'progress'
  | 'history'
  | 'class'
  | 'descriptors';

export interface IeltsApi {
  state: { mod: IeltsModule; [k: string]: unknown };
  AUTH: { enabled: boolean; profile: { role: string; teacher_id: string | null } | null; [k: string]: unknown };
  setModule(m: IeltsModule): void;
  render(): void;
  adoptSession(session: unknown): Promise<void>;
  openSettings(): void;
  openSessionPanel(): void;
  toggleNotifications(): void;
  notificationCount(): number;
  refreshGreeting(): void;
}

declare global {
  interface Window {
    __ielts?: IeltsApi;
    __ieltsBoot?: () => Promise<void>;
    SUPABASE_CONFIG?: { url: string; anonKey: string };
    supabase?: { createClient: (...args: unknown[]) => unknown };
  }
}

const ICON = {
  session:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/></svg>',
  ai: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l1.9 5.8L20 11l-6.1 2.2L12 19l-1.9-5.8L4 11l6.1-2.2z"/></svg>',
};

// Ids the engine looks up at boot. The visible ones are restyled; the rest are
// kept as hidden stubs because the platform shell replaces them.
const TEMPLATE = `
<div class="ix-toolbar topbar-actions">
  <div class="ix-cand">
    <span>Candidato <b id="candNo">—</b></span>
    <span>Fecha <b id="testDate">—</b></span>
    <span>Módulo <b id="modLabel">Home</b></span>
  </div>
  <div class="ix-actions">
    <button id="bellBtn" title="Mensajes de tu docente" aria-label="Mensajes de tu docente"><span class="ico ico-bell"></span></button>
    <button id="sessionBtn" class="ix-pill" title="Guardar o cargar sesión">${ICON.session}<span>Sesión</span></button>
    <button id="settingsBtn" class="ix-pill" title="Motor de IA">${ICON.ai}<span>Motor IA</span></button>
  </div>
  <div class="ix-hidden" aria-hidden="true">
    <nav class="tabs" id="tabs">
      <button data-mod="dashboard" class="active">Home</button><button data-mod="listening">Listening</button>
      <button data-mod="reading">Reading</button><button data-mod="writing">Writing</button>
      <button data-mod="speaking">Speaking</button><button data-mod="practice">Free Practice</button>
      <button data-mod="mock">Full Mock Test</button><button data-mod="progress">Progress</button>
      <button data-mod="descriptors">Band descriptors</button>
    </nav>
    <div class="acct-cluster">
      <button id="acctBtn"><span id="acctInitial"></span><b id="acctHello"></b><span id="acctSub"></span></button>
      <div id="acctMenu" style="display:none;"><button id="accountBtn" class="btn" style="display:none;"></button></div>
    </div>
    <p id="sideQuote"></p>
    <div class="search-wrap"><input id="globalSearch" type="search" tabindex="-1" /><div id="searchPop" style="display:none;"></div></div>
  </div>
</div>
${overlaysHtml}
<main><div class="panel" id="panel"></div></main>
`;

let rootEl: HTMLDivElement | null = null;
let parking: HTMLDivElement | null = null;
let booting: Promise<IeltsApi> | null = null;

function loadScript(src: string) {
  return new Promise<void>((resolve, reject) => {
    if (document.querySelector(`script[data-ix-src="${src}"]`)) return resolve();
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.dataset.ixSrc = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`No se pudo cargar ${src}`));
    document.head.appendChild(s);
  });
}

function root() {
  if (!rootEl) {
    rootEl = document.createElement('div');
    rootEl.id = 'ielts-root';
    rootEl.className = 'ielts-app';
    rootEl.innerHTML = TEMPLATE;
  }
  return rootEl;
}

/** Shows the simulator inside `container`, booting the engine the first time. */
export async function mountIelts(container: HTMLElement): Promise<IeltsApi> {
  container.appendChild(root());
  if (!booting) {
    booting = (async () => {
      // Charts (2D + 3D) are global scripts the engine expects, self-hosted.
      await Promise.all([loadScript('/vendor/chart.umd.min.js'), loadScript('/vendor/three.min.js')]);
      // Google sign-in is only needed for the optional Drive audio library.
      void loadScript('https://accounts.google.com/gsi/client').catch(() => undefined);
      // One Supabase client for the whole platform: the engine gets ours.
      if (supabase && supabaseConfig) {
        window.SUPABASE_CONFIG = supabaseConfig;
        window.supabase = { createClient: () => supabase };
      }
      const { default: code } = await import('./ielts-engine.js?raw');
      const s = document.createElement('script');
      s.textContent = code;
      document.head.appendChild(s);
      if (!window.__ieltsBoot || !window.__ielts) throw new Error('El motor IELTS no arrancó.');
      await window.__ieltsBoot();
      return window.__ielts;
    })();
    booting.catch(() => {
      booting = null;
    });
  }
  return booting;
}

/** Moves the simulator out of the page without destroying its state. */
export function parkIelts() {
  if (!rootEl) return;
  if (!parking) {
    parking = document.createElement('div');
    parking.hidden = true;
    parking.id = 'ielts-parking';
    document.body.appendChild(parking);
  }
  parking.appendChild(rootEl);
}

export const ieltsApi = () => window.__ielts;
