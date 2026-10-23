import { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Minus, Pause, Play, Plus, RotateCcw, SkipForward, X } from 'lucide-react';
import type { CefrLevel } from '@/content/types';
import { AUDIENCES, balanceTeams, challengeDeck, mixTotal, suggestedTeams, type Audience, type Mix } from '@/lib/engagement';

const TEAMS = [
  { name: 'Lions', emoji: '🦁', color: '#ff9f0a' },
  { name: 'Foxes', emoji: '🦊', color: '#ff453a' },
  { name: 'Pandas', emoji: '🐼', color: '#64d2ff' },
  { name: 'Frogs', emoji: '🐸', color: '#30d158' },
];

/** A short beep when time runs out (no audio files needed). */
function beep() {
  try {
    const ctx = new AudioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.frequency.value = 880;
    g.gain.setValueAtTime(0.25, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    o.connect(g).connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.6);
  } catch {
    /* no audio */
  }
}

/**
 * Full-screen team game for the projector: challenge cards made from the
 * selected units' words and grammar, a big countdown and a scoreboard.
 */
export function TeamChallenge({ audience, mix, level, vocab, grammar, onClose }: { audience: Audience; mix: Mix; level: CefrLevel; vocab: string[]; grammar: string[]; onClose: () => void }) {
  const [seed] = useState(() => Math.floor(Math.random() * 1000));
  const deck = useMemo(() => challengeDeck(audience, level, vocab, grammar, seed), [audience, level, vocab, grammar, seed]);
  const [teams, setTeams] = useState(() => suggestedTeams(mixTotal(mix)));
  const members = useMemo(() => balanceTeams(mix, teams), [mix, teams]);
  const [scores, setScores] = useState([0, 0, 0, 0]);
  const [i, setI] = useState(0);
  const card = deck[i % deck.length]!;
  const [left, setLeft] = useState(card.seconds);
  const [running, setRunning] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    timer.current = window.setInterval(() => setLeft((s) => s - 1), 1000);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [running]);
  useEffect(() => {
    if (left <= 0 && running) {
      setRunning(false);
      beep();
    }
  }, [left, running]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === ' ') {
        e.preventDefault();
        setRunning((r) => !r);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const next = () => {
    const n = i + 1;
    setI(n);
    setLeft(deck[n % deck.length]!.seconds);
    setRunning(false);
  };
  const award = (t: number, d: number) => setScores((s) => s.map((v, k) => (k === t ? Math.max(0, v + d) : v)));
  const pct = Math.max(0, left) / card.seconds;
  const R = 54;
  const C = 2 * Math.PI * R;
  const leader = Math.max(...scores.slice(0, teams));

  return (
    <div className="fixed inset-0 z-[60] flex flex-col overflow-y-auto bg-[#0b0b1e] text-white" role="dialog" aria-modal="true" aria-label="Reto por equipos">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_10%,#5e2bff55,transparent_45%),radial-gradient(circle_at_85%_90%,#ff2d8a44,transparent_45%)]" />
      <header className="relative flex items-center gap-3 p-4">
        <span className="truncate text-[13px] font-bold tracking-widest uppercase opacity-70">
          ⚡ <span className="hidden sm:inline">Reto por equipos · </span>
          {level}
        </span>
        <div className="ml-auto flex items-center gap-1 rounded-full bg-white/10 p-1">
          {[2, 3, 4].map((n) => (
            <button key={n} type="button" onClick={() => setTeams(n)} aria-label={`${n} equipos`} className={`h-8 rounded-full px-3 text-[13px] font-semibold whitespace-nowrap ${teams === n ? 'bg-white text-black' : 'opacity-70'}`}>
              {n} <span className="hidden sm:inline">equipos</span>
              <span className="sm:hidden">👥</span>
            </button>
          ))}
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar (Esc)" className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
          <X size={20} />
        </button>
      </header>

      <main className="relative flex flex-1 flex-col items-center justify-center gap-6 px-4 pb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 30, rotate: -2, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, rotate: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 260, damping: 22 }}
            className="w-full max-w-3xl rounded-[28px] bg-white/[0.07] p-6 text-center ring-1 ring-white/15 backdrop-blur sm:p-10"
          >
            <div className="text-[64px] leading-none sm:text-[88px]">{card.emoji}</div>
            <div className="mt-3 text-[14px] font-bold tracking-widest uppercase opacity-70">
              {card.kind} · +{card.points} {card.points === 1 ? 'punto' : 'puntos'}
            </div>
            <p className="mt-3 text-[28px] leading-tight font-bold text-balance sm:text-[44px]">{card.task}</p>
          </motion.div>
        </AnimatePresence>

        <div className="flex items-center gap-5">
          <button type="button" onClick={() => setLeft(card.seconds)} aria-label="Reiniciar tiempo" className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <RotateCcw size={20} />
          </button>
          <button type="button" onClick={() => setRunning((r) => !r)} aria-label={running ? 'Pausar' : 'Empezar'} className="relative h-[128px] w-[128px]">
            <svg viewBox="0 0 128 128" className="absolute inset-0 -rotate-90">
              <circle cx="64" cy="64" r={R} fill="none" stroke="rgba(255,255,255,.12)" strokeWidth="10" />
              <circle cx="64" cy="64" r={R} fill="none" stroke={left <= 5 ? '#ff453a' : '#30d158'} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct)} style={{ transition: 'stroke-dashoffset 1s linear, stroke .3s' }} />
            </svg>
            <span className={`absolute inset-0 flex flex-col items-center justify-center ${left <= 5 && running ? 'animate-pulse' : ''}`}>
              <span className="text-[40px] leading-none font-bold tabular-nums">{Math.max(0, left)}</span>
              <span className="mt-1 opacity-70">{running ? <Pause size={16} /> : <Play size={16} />}</span>
            </span>
          </button>
          <button type="button" onClick={next} aria-label="Siguiente reto" className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-white/10 hover:bg-white/20">
            <SkipForward size={20} />
          </button>
        </div>
      </main>

      <footer className="relative grid gap-3 p-4" style={{ gridTemplateColumns: `repeat(${teams}, minmax(0, 1fr))` }}>
        {TEAMS.slice(0, teams).map((t, k) => (
          <div key={t.name} className="rounded-[20px] p-3 text-center ring-2" style={{ background: `${t.color}22`, boxShadow: scores[k] === leader && leader > 0 ? `0 0 0 2px ${t.color}, 0 0 30px ${t.color}66` : undefined, ['--tw-ring-color' as string]: `${t.color}66` }}>
            <div className="text-[15px] font-semibold">
              {t.emoji} {t.name} {scores[k] === leader && leader > 0 && '👑'}
            </div>
            <div className="text-[12px] opacity-75">
              {AUDIENCES.filter((a) => members[k]![a.id]).map((a) => `${members[k]![a.id]}${a.emoji}`).join(' ')}
            </div>
            <motion.div key={scores[k]} initial={{ scale: 1.4 }} animate={{ scale: 1 }} className="text-[44px] leading-tight font-bold tabular-nums">
              {scores[k]}
            </motion.div>
            <div className="flex justify-center gap-2">
              <button type="button" onClick={() => award(k, -1)} aria-label={`Restar a ${t.name}`} className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-white/10">
                <Minus size={16} />
              </button>
              <button type="button" onClick={() => award(k, card.points)} aria-label={`Sumar ${card.points} a ${t.name}`} className="h-9 rounded-full px-3 text-[14px] font-bold text-black" style={{ background: t.color }}>
                <Plus size={14} className="inline" /> {card.points}
              </button>
            </div>
          </div>
        ))}
      </footer>
    </div>
  );
}
