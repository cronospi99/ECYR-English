/* Class Wars — game language: the shared games language (English by default, Spanish on request).
   Strings live next to their use as t('English', 'Español'); game content in defs.ts uses Tx pairs. */
import { getGameLang, num, setGameLang, t, tx, useGameLang, type GameLang, type Tx } from '@/lib/gameLang';

export type Lang = GameLang;
export type { Tx };
export const getLang = getGameLang;
export const setLang = setGameLang;
/** Re-render on language change (only screens with the language switch need it). */
export const useLang = useGameLang;
export { t, tx, num };
