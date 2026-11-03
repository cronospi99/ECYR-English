/* The 3D games' title: an "ENGLISH" ribbon over a big extruded word with a glossy gradient, a
   light sweep that passes every few seconds and speed streaks (plus a checkered strip for the
   racing game). Pure SVG, so it is sharp at any size; the display font loads once from Google
   Fonts and falls back to a heavy system font. */
import { useId } from 'react';

const FONT_URL = 'https://fonts.googleapis.com/css2?family=Lilita+One&display=swap';
let fontAsked = false;
function askFont() {
  if (fontAsked || typeof document === 'undefined') return;
  fontAsked = true;
  const l = document.createElement('link');
  l.rel = 'stylesheet';
  l.href = FONT_URL;
  document.head.appendChild(l);
}

interface Theme { fill: [string, string, string, string]; ribbon: [string, string]; checker?: boolean }
const THEMES: Record<'racers' | 'run', Theme> = {
  racers: { fill: ['#fff7b8', '#ffe24a', '#ffb81c', '#ff7a1a'], ribbon: ['#ff3d6e', '#ff8a3d'], checker: true },
  run: { fill: ['#f1ffc4', '#b8ff4a', '#3fe08a', '#16a7a0'], ribbon: ['#2e6bff', '#36c2ff'] },
};

export function GameTitle({ word, theme, className }: { word: string; theme: 'racers' | 'run'; className?: string }) {
  askFont();
  const t = THEMES[theme];
  const id = useId().replace(/:/g, '');
  const ink = '#10204a';
  const wordW = Math.max(300, word.length * 96), W = wordW + 90, H = t.checker ? 262 : 240;
  const font = "'Lilita One', 'Arial Black', Impact, system-ui, sans-serif";
  const wx = 52, wy = 205;
  const base = { fontFamily: font, fontSize: 168, textLength: wordW, lengthAdjust: 'spacingAndGlyphs', strokeLinejoin: 'round' } as const;
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={className} role="img" aria-label={`English ${word.toLowerCase()}`}>
      <defs>
        <linearGradient id={`${id}f`} x1="0" y1={wy - 130} x2="0" y2={wy + 10} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={t.fill[0]} />
          <stop offset="0.44" stopColor={t.fill[1]} />
          <stop offset="0.45" stopColor={t.fill[2]} />
          <stop offset="1" stopColor={t.fill[3]} />
        </linearGradient>
        <linearGradient id={`${id}r`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={t.ribbon[0]} />
          <stop offset="1" stopColor={t.ribbon[1]} />
        </linearGradient>
        <linearGradient id={`${id}s`} x1="0" y1="0" x2="160" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#fff" stopOpacity="0" />
          <stop offset="0.5" stopColor="#fff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#fff" stopOpacity="0" />
          <animateTransform attributeName="gradientTransform" type="translate" values={`-260 0; ${W + 100} 0; ${W + 100} 0`} keyTimes="0; 0.4; 1" dur="4.2s" repeatCount="indefinite" />
        </linearGradient>
        <pattern id={`${id}c`} width="24" height="24" patternUnits="userSpaceOnUse">
          <rect width="24" height="24" fill="#fff" /><rect width="12" height="12" fill={ink} /><rect x="12" y="12" width="12" height="12" fill={ink} />
        </pattern>
        <filter id={`${id}d`} x="-10%" y="-10%" width="120%" height="130%">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodColor={ink} floodOpacity="0.35" />
        </filter>
      </defs>
      <g transform="skewX(-9) translate(26 0)" filter={`url(#${id}d)`}>
        {/* speed streaks behind the word */}
        {[[wy - 118, 64], [wy - 84, 96], [wy - 46, 52]].map(([y, w], i) => (
          <rect key={i} x={wx - w - 14} y={y} width={w} height={12} rx={6} fill="#fff" opacity={0.85 - i * 0.18}>
            <animate attributeName="x" values={`${wx - w - 14}; ${wx - w - 30}; ${wx - w - 14}`} dur={`${0.9 + i * 0.25}s`} repeatCount="indefinite" />
          </rect>
        ))}
        {/* extruded body: stacked dark copies give the 3D depth, then the outlined front face */}
        {Array.from({ length: 8 }, (_, i) => <text key={i} {...base} x={wx + 1.2 * (8 - i)} y={wy + 1.7 * (8 - i)} fill={ink} stroke={ink} strokeWidth={16}>{word}</text>)}
        <text {...base} x={wx} y={wy} fill={`url(#${id}f)`} stroke={ink} strokeWidth={11} paintOrder="stroke fill">{word}</text>
        <text {...base} x={wx} y={wy} fill={`url(#${id}s)`}>{word}</text>
        {/* ribbon */}
        <g transform="rotate(-3 200 40)">
          <path d={`M${wx + 6} 14 h296 l-14 56 h-296 z`} fill={`url(#${id}r)`} stroke={ink} strokeWidth="6" strokeLinejoin="round" />
          <path d={`M${wx + 12} 20 h282 l-3 12 h-282 z`} fill="#fff" opacity="0.28" />
          <text x={wx + 147} y={60} textAnchor="middle" fontFamily={font} fontSize={44} letterSpacing={7} fill="#fff" stroke={ink} strokeWidth={6} paintOrder="stroke fill" strokeLinejoin="round">ENGLISH</text>
        </g>
        {t.checker && <rect x={wx + 8} y={wy + 26} width={wordW - 16} height={22} rx={5} fill={`url(#${id}c)`} stroke={ink} strokeWidth={5} />}
      </g>
    </svg>
  );
}
