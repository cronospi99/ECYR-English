/* Class Wars — game language. English by default (it is an English class); Spanish on request.
   Strings live next to their use as t('English', 'Español'); game content in defs.ts uses Tx pairs. */
import { useSyncExternalStore } from 'react';

export type Lang = 'en' | 'es';
/** [English, Spanish] */
export type Tx = readonly [string, string];

const KEY = 'cw:lang';
let lang: Lang = (() => { try { return localStorage.getItem(KEY) === 'es' ? 'es' : 'en'; } catch { return 'en'; } })();
const subs = new Set<() => void>();

export const getLang = () => lang;
export function setLang(l: Lang) {
  lang = l;
  try { localStorage.setItem(KEY, l); } catch { /* ignore */ }
  subs.forEach((f) => f());
}
/** Re-render on language change (only screens with the language switch need it). */
export const useLang = () => useSyncExternalStore((f) => { subs.add(f); return () => { subs.delete(f); }; }, getLang);

export const t = (en: string, es: string) => (lang === 'en' ? en : es);
export const tx = (v: Tx) => (lang === 'en' ? v[0] : v[1]);
/** Locale-formatted number. */
export const num = (n: number) => n.toLocaleString(lang === 'en' ? 'en-US' : 'es-CO');
