import type { CheckpointIcon } from '@/lib/clueHunt/types';
import type { Bi } from '@/lib/clueHunt/types';

/** Images extracted from the Bingo (scripts/extract-diwali-img.mjs) → public/modules/diwali/img. */
export const IMG = '/modules/diwali/img';
export const img = (name: string) => `${IMG}/${name}.webp`;

export const ICON_IMG: Record<CheckpointIcon, string> = {
  diya: 'diya', rangoli: 'rangoli', fireworks: 'sparklers', lotus: 'lotus', lantern: 'x_lanternG', sweets: 'sweets', rama: 'triumph', lakshmi: 'fortune',
};

export interface Emblem { id: string; img: string; name: Bi }
export const EMBLEMS: Emblem[] = [
  { id: 'diya', img: 'diya', name: { en: 'Diya', fr: 'Diya' } },
  { id: 'lotus', img: 'lotus', name: { en: 'Lotus', fr: 'Lotus' } },
  { id: 'rangoli', img: 'rangoli', name: { en: 'Rangoli', fr: 'Rangoli' } },
  { id: 'lantern', img: 'x_lanternG', name: { en: 'Lantern', fr: 'Lanterne' } },
  { id: 'fireworks', img: 'sparklers', name: { en: 'Fireworks', fr: 'Feux d’artifice' } },
  { id: 'sweets', img: 'sweets', name: { en: 'Sweets', fr: 'Douceurs' } },
  { id: 'gold', img: 'gold', name: { en: 'Gold', fr: 'Or' } },
  { id: 'gifts', img: 'gifts', name: { en: 'Gifts', fr: 'Cadeaux' } },
];
export const emblemOf = (id: string): Emblem => EMBLEMS.find((e) => e.id === id) ?? EMBLEMS[0]!;
export const isEmblem = (id: unknown): id is string => EMBLEMS.some((e) => e.id === id);
export const shortOf = (b: Bi): Bi => ({ en: b.en.split(' — ')[0]!, fr: b.fr.split(' — ')[0]! });
/** Label of a card before it is solved (never gives the answer away). */
export const shortLabel = (c: { label: Bi; shortLabel?: Bi }): Bi => c.shortLabel ?? shortOf(c.label);
