/* Background music for the party games, played only on the host screen (projector), never on phones.
   Only a fragment of the song ships (public/audio/hoodie-weather.mp3, 58 s, looped). */
import { useEffect, useState } from 'react';
import { Music } from 'lucide-react';
import { cn } from '@/lib/cn';
import { t } from '@/features/classwars/i18n';

export const TRACK = {
  title: 'Hoodie Weather',
  /** Fill in the artist's name and a link to their page to credit them. */
  author: '',
  url: '',
};
const SRC = '/audio/hoodie-weather.mp3';
const KEY = 'game:music';

let el: HTMLAudioElement | null = null;
let on = (() => { try { return localStorage.getItem(KEY) !== '0'; } catch { return true; } })();
let users = 0;
const subs = new Set<() => void>();

function apply() {
  if (users > 0 && on) {
    if (!el) { el = new Audio(SRC); el.loop = true; el.volume = 0.3; }
    if (el.paused) void el.play().catch(() => {});
  } else el?.pause();
}

export const musicOn = () => on;
export function setMusicOn(v: boolean) {
  on = v;
  try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* ignore */ }
  apply(); subs.forEach((f) => f());
}

/** Play the music while the calling screen is mounted. A tap retries if the browser blocked autoplay. */
export function useGameMusic() {
  useEffect(() => {
    users++; apply();
    const retry = () => apply();
    window.addEventListener('pointerdown', retry);
    return () => { window.removeEventListener('pointerdown', retry); users--; apply(); };
  }, []);
}

export function MusicBtn({ className }: { className?: string }) {
  const [m, setM] = useState(on);
  useEffect(() => { const f = () => setM(on); subs.add(f); return () => { subs.delete(f); }; }, []);
  return (
    <button type="button" onClick={() => setMusicOn(!m)} aria-pressed={m} aria-label={m ? t('Music off', 'Quitar música') : t('Music on', 'Poner música')}
      className={cn('relative grid h-10 w-10 place-items-center rounded-full bg-white/12 hover:bg-white/20', !m && 'opacity-60', className)}>
      <Music size={18} />
      {!m && <span className="absolute h-[2.5px] w-6 rotate-45 rounded bg-current" />}
    </button>
  );
}

/** Credit line for the song. */
export function MusicCredit({ className }: { className?: string }) {
  const who = TRACK.author
    ? TRACK.url ? <a href={TRACK.url} target="_blank" rel="noreferrer" className="underline">{TRACK.author}</a> : TRACK.author
    : null;
  return (
    <p className={cn('text-center text-[12.5px] font-bold opacity-70', className)}>
      ♪ {t('Music', 'Música')}: “{TRACK.title}”{who && <> {t('by', 'de')} {who}</>}. {t('Only a fragment is used. Support the artist!', 'Solo se usa un fragmento. ¡Apoya a quien la creó!')}
    </p>
  );
}
