import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { MASCOT_CSS, Mascot } from '@/features/doodle/Mascot';
import { Logo } from '@/features/youdraw/Logo';
import { GameLangToggle } from '@/components/GameLangToggle';
import { t, useGameLang, type Tx } from '@/lib/gameLang';

/** Stroked italic wordmark used by the 3D games (English Run, English Racers). */
const WORD = 'block leading-none font-black tracking-tight text-[#ffd23f] italic [-webkit-text-stroke:2px_#10204a] [paint-order:stroke_fill] [text-shadow:0_4px_0_#10204a]';
const TITLE = 'block text-[26px] leading-none font-black tracking-tight [text-shadow:0_3px_0_rgb(0_0_0/0.25)]';

/** Translated text that follows the games-language toggle (safe to build outside render). */
function Tt({ x }: { x: Tx }) { useGameLang(); return <>{t(...x)}</>; }

/** The live multiplayer games (projector + phones) and the shared character cards: each with its own logo. */
const LIVE: { to: string; art?: ReactNode; logo: ReactNode; sub: Tx; from: string; to2: string }[] = [
  {
    to: '/classwars',
    logo: <img src="/classwars/logo.webp" alt="Class Wars" width={1112} height={358} className="block h-auto w-[220px] max-w-full drop-shadow-[0_6px_10px_rgb(0_10_60/0.4)] select-none" draggable={false} />,
    sub: ['Live arena · 3 modes', 'Arena en vivo · 3 modos'],
    from: '#1e3a8a',
    to2: '#16a34a',
  },
  {
    to: '/racers/class',
    logo: <span className="flex flex-wrap items-center gap-2"><span className={`${WORD} text-[24px] whitespace-nowrap`}>ENGLISH RACERS</span><span className="rounded-md bg-[#ff3d6e] px-1.5 py-0.5 text-[12px] font-black tracking-wide not-italic shadow-[0_2px_0_#10204a]">LIVE</span></span>,
    sub: ['The whole class races from their phones', 'Toda la clase corre desde el celular'],
    from: '#ff3d6e',
    to2: '#3b1d7a',
  },
  {
    to: '/impostor',
    logo: <span className="flex items-center gap-2"><span className="grid h-9 w-9 place-items-center rounded border-[3px] border-[#0e1113] bg-[#f5c518] text-[20px] font-black text-[#0e1113] shadow-[inset_0_-3px_0_rgb(0_0_0/0.18)]">?</span><span className="text-[28px] leading-none font-black tracking-wide text-[#f5c518] uppercase">Impostor</span></span>,
    sub: ['English missions… and an impostor', 'Misiones en inglés… y un impostor'],
    from: '#1b2023',
    to2: '#3b4349',
  },
  {
    to: '/doodle',
    art: <Mascot pose="draw" size={64} />,
    logo: <span className={`${TITLE} text-[#ffe36b]`}>Pass the Doodle</span>,
    sub: ['Write, draw, describe… and laugh', 'Escribe, dibuja, describe… y ríe'],
    from: '#6a4cff',
    to2: '#1fb4c9',
  },
  {
    to: '/youdraw',
    art: <Logo size={56} />,
    logo: <span className={`${TITLE} text-white`}>You Draw</span>,
    sub: ['One draws, everyone guesses', 'Uno dibuja, todos adivinan'],
    from: '#221a55',
    to2: '#ff4757',
  },
  {
    to: '/games/cards',
    art: <span className="text-[38px]">🃏</span>,
    logo: <span className={`${TITLE} text-[#fff2a8]`}><Tt x={['Teacher cards', 'Cartas de profes']} /></span>,
    sub: ['25 characters, bronze to diamond', '25 personajes, de bronce a diamante'],
    from: '#5b3a12',
    to2: '#c99d00',
  },
];

export function LiveGames() {
  useGameLang();
  return (
    <section className="mb-8">
      <style>{MASCOT_CSS}</style>
      <div className="mb-3 flex items-center justify-end gap-2 px-1 text-[13px] font-semibold text-label-2">{t('Games language', 'Idioma de los juegos')} <GameLangToggle dark={false} /></div>
      <Link to="/run" className="group relative mb-6 flex min-h-[120px] items-center gap-4 overflow-hidden rounded-card p-5 text-white shadow-card transition-transform active:scale-[0.99] sm:p-6"
        style={{ background: 'linear-gradient(120deg,#2f7df0 0%,#58b3ff 45%,#ffb347 100%)' }}>
        <span aria-hidden className="absolute -right-8 -bottom-16 h-64 w-64 rounded-full bg-white/15 transition-transform group-hover:scale-110" />
        <span className="relative min-w-0 flex-1">
          <span className="block text-[13px] font-extrabold tracking-wide text-white/85 uppercase">{t('New · 3D', 'Nuevo · 3D')}</span>
          <span className={`${WORD} text-[38px] sm:text-[48px]`}>ENGLISH RUN</span>
          <span className="mt-2 block max-w-[560px] text-[15px] leading-snug font-semibold text-white">{t('Run, dodge and pick the right answer · A1–C2', 'Corre, esquiva y elige la respuesta correcta · A1–C2')}</span>
        </span>
        <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#2fd27a] text-[#062a15] shadow-[0_5px_0_#16924d]"><ChevronRight size={30} /></span>
      </Link>
      <Link to="/racers" className="group relative mb-6 flex min-h-[120px] items-center gap-4 overflow-hidden rounded-card p-5 text-white shadow-card transition-transform active:scale-[0.99] sm:p-6"
        style={{ background: 'linear-gradient(120deg,#ff3d6e 0%,#ff8a3d 45%,#ffd23f 100%)' }}>
        <span aria-hidden className="absolute -right-8 -bottom-16 h-64 w-64 rounded-full bg-white/15 transition-transform group-hover:scale-110" />
        <span className="relative min-w-0 flex-1">
          <span className="block text-[13px] font-extrabold tracking-wide text-white/90 uppercase">{t('New · 3D · prototype', 'Nuevo · 3D · prototipo')}</span>
          <span className={`${WORD} text-[38px] sm:text-[48px]`}>ENGLISH RACERS</span>
          <span className="mt-2 block max-w-[560px] text-[15px] leading-snug font-semibold text-white">{t('3D karts · 11 tracks · solo or with your class', 'Karts en 3D · 11 pistas · solo o con tu clase')}</span>
        </span>
        <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#2fd27a] text-[#062a15] shadow-[0_5px_0_#16924d]"><ChevronRight size={30} /></span>
      </Link>
      <h2 className="text-title-2 mb-3 px-1">{t('Live with your class', 'En vivo con tu clase')}</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {LIVE.map((g) => (
          <Link
            key={g.to}
            to={g.to}
            className="group relative flex min-h-[112px] items-center gap-4 overflow-hidden rounded-card p-5 text-white shadow-card transition-transform active:scale-[0.99]"
            style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to2})` }}
          >
            {g.art && <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[18px] bg-white/12 shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.15)]">{g.art}</span>}
            <span className="relative min-w-0 flex-1">
              {g.logo}
              <span className="mt-1.5 block text-[14px] leading-snug font-semibold text-white/80">{t(...g.sub)}</span>
            </span>
            <ChevronRight className="relative shrink-0 text-white/60" />
          </Link>
        ))}
      </div>
    </section>
  );
}
