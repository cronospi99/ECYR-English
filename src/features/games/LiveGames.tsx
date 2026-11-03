import { Link } from 'react-router-dom';
import type { ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { MASCOT_CSS, Mascot } from '@/features/doodle/Mascot';

/** The live multiplayer games (projector + phones) and the shared character cards. */
const LIVE: { to: string; emoji: string; art?: ReactNode; title: string; sub: string; from: string; to2: string; accent: string }[] = [
  {
    to: '/classwars',
    emoji: '⚔️',
    title: 'Class Wars',
    sub: 'Arena en vivo con 3 modos (clásico, Color Clash por equipos y Knockback en plataformas): responde para recargar energía y usa el poder de tu profe. Hay demo contra bots.',
    from: '#1e3a8a',
    to2: '#16a34a',
    accent: '#fde047',
  },
  {
    to: '/impostor',
    emoji: '🕵️',
    title: 'Impostor',
    sub: 'Misiones de inglés en la academia… y alguien es adicto al celular. Clásico, videojuego y demo.',
    from: '#1b2023',
    to2: '#3b4349',
    accent: '#f5c518',
  },
  {
    to: '/doodle',
    emoji: '✏️',
    art: <Mascot pose="draw" size={64} />,
    title: 'Pass the Doodle',
    sub: 'Escribe una frase en inglés, el siguiente la dibuja, otro describe el dibujo… y al final se revelan las historias. Con Pío, nuestra mascota.',
    from: '#6a4cff',
    to2: '#1fb4c9',
    accent: '#ffe36b',
  },
  {
    to: '/youdraw',
    emoji: '🎨',
    title: 'You Draw',
    sub: 'El profe dirige: un estudiante al azar dibuja una palabra de su nivel y los demás la ven en vivo y la adivinan escribiendo. Letras que se revelan, podio final.',
    from: '#221a55',
    to2: '#ff4757',
    accent: '#ffd23f',
  },
  {
    to: '/games/cards',
    emoji: '🃏',
    title: 'Cartas de profes',
    sub: 'Los 25 personajes. Sube cada carta de bronce a diamante jugando con ella.',
    from: '#5b3a12',
    to2: '#c99d00',
    accent: '#fff2a8',
  },
];

export function LiveGames() {
  return (
    <section className="mb-8">
      <style>{MASCOT_CSS}</style>
      <Link to="/run" className="group relative mb-6 flex min-h-[150px] items-center gap-4 overflow-hidden rounded-card p-5 text-white shadow-card transition-transform active:scale-[0.99] sm:p-6"
        style={{ background: 'linear-gradient(120deg,#2f7df0 0%,#58b3ff 45%,#ffb347 100%)' }}>
        <span aria-hidden className="absolute -right-8 -bottom-16 h-64 w-64 rounded-full bg-white/15 transition-transform group-hover:scale-110" />
        <span className="relative min-w-0 flex-1">
          <span className="block text-[13px] font-extrabold tracking-wide text-white/85 uppercase">Nuevo · 3D</span>
          <span className="block text-[38px] leading-none font-black tracking-tight text-[#ffd23f] italic [-webkit-text-stroke:2px_#10204a] [paint-order:stroke_fill] [text-shadow:0_4px_0_#10204a] sm:text-[48px]">ENGLISH RUN</span>
          <span className="mt-2 block max-w-[560px] text-[15px] leading-snug font-semibold text-white">Corre por la ciudad con tu profe en 3D: esquiva buses y barreras, recoge monedas y poderes, y pasa por la respuesta correcta para multiplicar tu puntaje. Preguntas de A1 a C2.</span>
        </span>
        <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#2fd27a] text-[#062a15] shadow-[0_5px_0_#16924d]"><ChevronRight size={30} /></span>
      </Link>
      <Link to="/racers" className="group relative mb-6 flex min-h-[150px] items-center gap-4 overflow-hidden rounded-card p-5 text-white shadow-card transition-transform active:scale-[0.99] sm:p-6"
        style={{ background: 'linear-gradient(120deg,#ff3d6e 0%,#ff8a3d 45%,#ffd23f 100%)' }}>
        <span aria-hidden className="absolute -right-8 -bottom-16 h-64 w-64 rounded-full bg-white/15 transition-transform group-hover:scale-110" />
        <span className="relative min-w-0 flex-1">
          <span className="block text-[13px] font-extrabold tracking-wide text-white/90 uppercase">Nuevo · 3D · prototipo</span>
          <span className="block text-[38px] leading-none font-black tracking-tight text-[#ffd23f] italic [-webkit-text-stroke:2px_#10204a] [paint-order:stroke_fill] [text-shadow:0_4px_0_#10204a] sm:text-[48px]">ENGLISH RACERS</span>
          <span className="mt-2 block max-w-[560px] text-[15px] leading-snug font-semibold text-white">Carreras de karts con tu profe en 3D: derrapa para cargar turbos, salta rampas con trucos y bate tu récord en el Campus ECYR. Fase 1: contrarreloj.</span>
        </span>
        <span className="relative grid h-14 w-14 shrink-0 place-items-center rounded-full bg-[#2fd27a] text-[#062a15] shadow-[0_5px_0_#16924d]"><ChevronRight size={30} /></span>
      </Link>
      <h2 className="text-title-2 mb-3 px-1">En vivo con tu clase</h2>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {LIVE.map((g) => (
          <Link
            key={g.to}
            to={g.to}
            className="group relative flex min-h-[132px] items-center gap-4 overflow-hidden rounded-card p-5 text-white shadow-card transition-transform active:scale-[0.99]"
            style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to2})` }}
          >
            {!g.art && (
              <span aria-hidden className="absolute -right-6 -bottom-8 text-[120px] leading-none opacity-15 transition-transform group-hover:scale-110">
                {g.emoji}
              </span>
            )}
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[18px] bg-white/12 text-[38px] shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.15)]">{g.art ?? g.emoji}</span>
            <span className="relative min-w-0 flex-1">
              <span className="block text-[22px] font-extrabold tracking-tight" style={{ color: g.accent }}>
                {g.title}
              </span>
              <span className="mt-0.5 block text-[14px] leading-snug text-white/80">{g.sub}</span>
            </span>
            <ChevronRight className="relative shrink-0 text-white/60" />
          </Link>
        ))}
      </div>
    </section>
  );
}
