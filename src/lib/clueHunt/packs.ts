/* Registry of clue-hunt packs: every src/content/clue-hunts/<slug>.json. `modes` says what else a pack offers
   (the Diwali pack also has the Bingo). Adding an event = adding a JSON (+ optional entry in EXTRAS). */
import type { Bi, HuntPack } from './types';

const loaders = import.meta.glob<HuntPack>(['/src/content/clue-hunts/*.json', '!/src/content/clue-hunts/*.cases.json'], { import: 'default' });

export interface PackExtras {
  /** Second mode: a standalone HTML game (opened full screen from the hub). */
  bingo?: { src: string; title: Bi; blurb: Bi };
  /** Image folder with the emblems / icons (public/…). */
  art: string;
}
const EXTRAS: Record<string, PackExtras> = {
  diwali: {
    art: '/modules/diwali/img',
    bingo: {
      src: '/modules/diwali/diwali-bingo.html',
      title: { en: 'Diwali Bingo', fr: 'Bingo de Diwali' },
      blurb: { en: 'Bilingual bingo on the big screen, run by the teacher. No phones needed.', fr: 'Bingo bilingue sur grand écran, animé par l’enseignant. Pas besoin de téléphones.' },
    },
  },
};
export const extrasOf = (slug: string): PackExtras => EXTRAS[slug] ?? { art: '/modules/diwali/img' };

export const packSlugs = (): string[] => Object.keys(loaders).map((k) => k.replace(/^.*\//, '').replace(/\.json$/, '')).sort();
const cache = new Map<string, Promise<HuntPack | null>>();
export function loadPack(slug: string): Promise<HuntPack | null> {
  const key = Object.keys(loaders).find((k) => k.endsWith(`/${slug}.json`));
  if (!key) return Promise.resolve(null);
  let p = cache.get(slug);
  if (!p) { p = loaders[key]!().then((m) => m, () => null); cache.set(slug, p); }
  return p;
}
