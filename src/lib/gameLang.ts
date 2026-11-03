/* Games language: one choice for every game (English by default — the games are English
   practice; Spanish on request). Strings sit next to their use as t('English', 'Español'). */
import { useSyncExternalStore } from 'react';

export type GameLang = 'en' | 'es';
/** [English, Spanish] */
export type Tx = readonly [string, string];

const KEY = 'games:lang';
let lang: GameLang = (() => { try { return localStorage.getItem(KEY) === 'es' ? 'es' : 'en'; } catch { return 'en'; } })();
const subs = new Set<() => void>();

export const getGameLang = () => lang;
export function setGameLang(l: GameLang) {
  if (l === lang) return;
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
/** Re-renders the component when the language changes. */
export const useGameLang = () => useSyncExternalStore(subscribe, getGameLang, getGameLang);

/** Pick the string for the current language (call it during render after useGameLang()). */
export const t = (en: string, es: string) => (lang === 'en' ? en : es);
export const tx = (v: Tx) => (lang === 'en' ? v[0] : v[1]);
/** Locale-formatted number. */
export const num = (n: number) => n.toLocaleString(lang === 'en' ? 'en-US' : 'es-CO');
