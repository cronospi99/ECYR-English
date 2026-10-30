import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';

/** The live multiplayer games (projector + phones) and the shared character cards. */
const LIVE = [
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
      <h2 className="text-title-2 mb-3 px-1">En vivo con tu clase</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {LIVE.map((g) => (
          <Link
            key={g.to}
            to={g.to}
            className="group relative flex min-h-[132px] items-center gap-4 overflow-hidden rounded-card p-5 text-white shadow-card transition-transform active:scale-[0.99]"
            style={{ background: `linear-gradient(135deg, ${g.from}, ${g.to2})` }}
          >
            <span aria-hidden className="absolute -right-6 -bottom-8 text-[120px] leading-none opacity-15 transition-transform group-hover:scale-110">
              {g.emoji}
            </span>
            <span className="grid h-16 w-16 shrink-0 place-items-center rounded-[18px] bg-white/12 text-[38px] shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.15)]">{g.emoji}</span>
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
