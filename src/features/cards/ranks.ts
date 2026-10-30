import type { CardRank } from './api';

/* Look of each rank: frame metal, accents and the portrait backdrop. */
export interface RankLook {
  label: string;
  en: string;
  /** Frame gradient (metal). */
  metal: string;
  /** Main accent (bars, text on dark). */
  accent: string;
  /** Darker accent for stripes and outlines. */
  deep: string;
  /** Portrait backdrop. */
  portrait: string;
  /** Glow around the card. */
  glow: string;
  /** Gem stops for the emblem. */
  gem: [string, string, string];
}

export const RANK_LOOK: Record<CardRank, RankLook> = {
  bronze: {
    label: 'Bronce',
    en: 'Bronze',
    metal: 'linear-gradient(135deg,#6e3c1a 0%,#c9864c 18%,#8f5428 36%,#f2c38e 52%,#7a4520 70%,#d79a5f 86%,#6e3c1a 100%)',
    accent: '#e0a56a',
    deep: '#8f5428',
    portrait: 'radial-gradient(circle at 50% 34%,#7d553a 0%,#3a2516 55%,#1c120b 100%)',
    glow: 'rgba(224,165,106,0.0)',
    gem: ['#f6cf9f', '#c47a3d', '#6e3c1a'],
  },
  silver: {
    label: 'Plata',
    en: 'Silver',
    metal: 'linear-gradient(135deg,#6c7680 0%,#dfe5ea 18%,#8e9aa6 36%,#ffffff 52%,#76818b 70%,#c9d1d8 86%,#6c7680 100%)',
    accent: '#d3dbe2',
    deep: '#7d8892',
    portrait: 'radial-gradient(circle at 50% 34%,#73818d 0%,#343d45 55%,#161b1f 100%)',
    glow: 'rgba(211,219,226,0.25)',
    gem: ['#ffffff', '#aeb8c2', '#5d6872'],
  },
  gold: {
    label: 'Oro',
    en: 'Gold',
    metal: 'linear-gradient(135deg,#8a5d00 0%,#f5c518 16%,#b8860b 33%,#fff3b8 50%,#a87400 67%,#ffe27a 84%,#8a5d00 100%)',
    accent: '#f5c518',
    deep: '#b8860b',
    portrait: 'radial-gradient(circle at 50% 34%,#8a6a16 0%,#3d2e08 55%,#1c1504 100%)',
    glow: 'rgba(245,197,24,0.45)',
    gem: ['#fff6c8', '#f5c518', '#8a5d00'],
  },
  diamond: {
    label: 'Diamante',
    en: 'Diamond',
    metal: 'linear-gradient(135deg,#5ec8ff 0%,#ffffff 14%,#a78bfa 30%,#e0f7ff 44%,#5eead4 58%,#c4b5fd 72%,#ffffff 86%,#5ec8ff 100%)',
    accent: '#8be9ff',
    deep: '#6d5bd0',
    portrait: 'radial-gradient(circle at 50% 34%,#4a6fb8 0%,#23285e 55%,#0f0c26 100%)',
    glow: 'rgba(139,233,255,0.6)',
    gem: ['#ffffff', '#8be9ff', '#7c5cff'],
  },
};
