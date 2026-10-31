/* Class Wars — end of match: animated podium, stats table and card points. */
import { useEffect, useRef } from 'react';
import { motion } from 'motion/react';
import { Crown, Swords, Package, CheckCircle2, Flame, Sparkles } from 'lucide-react';
import { TEACHERS } from '@/features/cards/teachers';
import { RANK_AT, rankOf } from '@/features/cards/api';
import { cn } from '@/lib/cn';
import type { Result } from '../game/host';
import { sfx } from '../render/audio';
import { Btn, Diamond, GameIcon, Toon } from './kit';
import { t } from '../i18n';

const RANK_ES = { bronze: 'Bronce', silver: 'Plata', gold: 'Oro', diamond: 'Diamante' } as const;
const RANK_EN = { bronze: 'Bronze', silver: 'Silver', gold: 'Gold', diamond: 'Diamond' } as const;

export function Podium({ results, myIdx = -1, saved, onAgain, onExit, againLabel = t('New game', 'Nueva partida'), exitLabel = t('Leave', 'Salir') }: {
  results: Result[]; myIdx?: number; saved?: string; onAgain?: () => void; onExit: () => void; againLabel?: string; exitLabel?: string;
}) {
  const conf = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    sfx.end();
    const c = conf.current;
    if (!c) return;
    const g = c.getContext('2d')!;
    const dpr = Math.min(2, devicePixelRatio || 1);
    const resize = () => { c.width = c.clientWidth * dpr; c.height = c.clientHeight * dpr; };
    resize();
    const cols = ['#ffd23f', '#8f6bff', '#ff5ce1', '#30d158', '#64d2ff', '#ff7a1a'];
    const ps = Array.from({ length: 140 }, () => ({ x: Math.random() * c.width, y: -Math.random() * c.height, vy: (1 + Math.random() * 2.5) * dpr, vx: (Math.random() - 0.5) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.2, s: (5 + Math.random() * 6) * dpr, c: cols[Math.floor(Math.random() * cols.length)] }));
    let raf = 0;
    const start = performance.now();
    const loop = (t: number) => {
      g.clearRect(0, 0, c.width, c.height);
      const fade = Math.max(0, 1 - (t - start - 6000) / 2000);
      g.globalAlpha = fade;
      for (const p of ps) {
        p.y += p.vy; p.x += p.vx + Math.sin(t / 500 + p.r) * 0.5; p.r += p.vr;
        if (p.y > c.height && fade > 0.5) { p.y = -20; p.x = Math.random() * c.width; }
        g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.fillStyle = p.c; g.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2); g.restore();
      }
      if (fade > 0) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);

  const top = results.slice(0, 3);
  const order = [top[1], top[0], top[2]];
  const heights = [120, 165, 92];
  const mine = results.find((r) => r.idx === myIdx);

  return (
    <div className="relative flex h-full w-full flex-col overflow-hidden">
      <canvas ref={conf} className="pointer-events-none absolute inset-0 z-10 h-full w-full" />
      <div className="cw-scroll relative z-0 flex-1 overflow-y-auto px-4 pt-[max(16px,env(safe-area-inset-top))] pb-36">
        <motion.h1 initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="cw-title text-center text-[34px] sm:text-[46px]">
          <GameIcon k="trophy" size={44} className="-mt-2 mr-2" />{t('Game over!', '¡Fin de la partida!')}
        </motion.h1>
        {mine && (
          <p className="mt-1 text-center text-[18px] font-extrabold text-[#ffd23f]">{t(`You finished #${mine.place} of ${results.length}`, `Quedaste #${mine.place} de ${results.length}`)}</p>
        )}
        {/* podium */}
        <div className="mx-auto mt-6 flex max-w-[640px] items-end justify-center gap-2 sm:gap-4">
          {order.map((r, i) => {
            if (!r) return <div key={i} className="flex-1" />;
            const place = r.place;
            const col = place === 1 ? '#ffd23f' : place === 2 ? '#cfd8e3' : '#e8a066';
            return (
              <motion.div key={r.idx} className="flex flex-1 flex-col items-center" initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.25 + (place === 1 ? 0.6 : place === 2 ? 0.3 : 0), type: 'spring', stiffness: 200, damping: 16 }}>
                {place === 1 && <Crown className="mb-1 text-[#ffd23f] drop-shadow" size={34} fill="#ffd23f" />}
                <div className={cn(place === 1 && 'cw-bob')}><Toon ci={r.char} size={place === 1 ? 110 : 88} live={place === 1} /></div>
                <div className="mt-1 max-w-full truncate px-1 text-center text-[15px] font-black sm:text-[17px]">{r.name}</div>
                <div className="flex items-center gap-1 text-[15px] font-extrabold text-[#7ef0ff]">{r.dia} <Diamond size={16} /></div>
                <div className="mt-1 flex w-full flex-col items-center justify-start rounded-t-2xl border-[3px] border-b-0 border-black/20 pt-2" style={{ height: heights[i], background: `linear-gradient(180deg, ${col}, ${col}aa)` }}>
                  <span className="cw-title text-[40px] text-[#1b2350]/80">{place}</span>
                </div>
              </motion.div>
            );
          })}
        </div>
        {/* table */}
        <div className="mx-auto mt-0 max-w-[820px] overflow-hidden rounded-2xl border-2 border-white/10 bg-[#1b2257]">
          <div className="grid grid-cols-[26px_1fr_52px_34px_34px_34px] items-center gap-1 border-b border-white/10 px-3 py-2 text-[12px] font-extrabold tracking-wide text-white/55 uppercase sm:grid-cols-[40px_1fr_90px_60px_60px_60px_60px_90px]">
            <span>#</span><span>{t('Player', 'Jugador')}</span><span className="flex items-center gap-1"><Diamond size={13} /></span>
            <span title={t('Correct answers', 'Respuestas correctas')}><CheckCircle2 size={15} /></span><span title="KOs"><Swords size={15} /></span><span title={t('Boxes', 'Cajas')}><Package size={15} /></span>
            <span className="hidden sm:block" title={t('Best streak', 'Mejor racha')}><Flame size={15} /></span><span className="hidden sm:block">{t('Points', 'Puntos')}</span>
          </div>
          {results.map((r, i) => (
            <motion.div key={r.idx} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 + i * 0.04 }}
              className={cn('grid grid-cols-[26px_1fr_52px_34px_34px_34px] items-center gap-1 px-3 py-1.5 text-[14px] font-bold sm:grid-cols-[40px_1fr_90px_60px_60px_60px_60px_90px]', r.idx === myIdx && 'bg-[#ffd23f]/20')}>
              <span className="font-black text-white/60">{r.place}</span>
              <span className="flex min-w-0 items-center gap-2"><span className="h-6 w-6 shrink-0 overflow-hidden rounded-full border-2 border-white/30 bg-[#2b377d]"><Toon ci={r.char} size={32} className="-mt-0.5 -ml-1" /></span><span className="truncate">{r.name}</span>{r.bot && <span className="rounded bg-white/10 px-1 text-[10px]">BOT</span>}</span>
              <span className="tabular-nums text-[#7ef0ff]">{r.dia}</span>
              <span className="tabular-nums">{r.correct}</span>
              <span className="tabular-nums">{r.kos}</span>
              <span className="tabular-nums">{r.boxes}</span>
              <span className="hidden tabular-nums sm:block">{r.streak}</span>
              <span className="hidden text-[#ffd23f] sm:block">{r.bot ? '—' : `+${r.points}`}</span>
            </motion.div>
          ))}
        </div>
        {mine && !mine.bot && (
          <motion.div initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ delay: 1.4 }} className="mx-auto mt-4 flex max-w-[520px] items-center gap-4 rounded-2xl border-2 border-[#ffd23f]/60 bg-gradient-to-r from-[#3a2f7d] to-[#25307a] p-4">
            <Toon ci={mine.char} size={64} />
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5 text-[13px] font-extrabold tracking-wide text-white/60 uppercase"><Sparkles size={14} /> {t(`${TEACHERS[mine.char]?.name} card`, `Carta de ${TEACHERS[mine.char]?.name}`)}</div>
              <div className="text-[26px] font-black text-[#ffd23f]">+{mine.points} {t('points', 'puntos')}</div>
              <div className="text-[13px] font-semibold text-white/70">{mine.guest ? t('Guest: points are not saved. Sign in to rank up your cards.', 'Invitado: los puntos no se guardan. Inicia sesión para subir tus cartas de rango.') : t(`Ranks: Silver ${RANK_AT.silver} · Gold ${RANK_AT.gold} · Diamond ${RANK_AT.diamond} (${RANK_EN[rankOf(mine.points)]} with this game)`, `Rangos: Plata ${RANK_AT.silver} · Oro ${RANK_AT.gold} · Diamante ${RANK_AT.diamond} (${RANK_ES[rankOf(mine.points)]} con esta partida)`)}</div>
            </div>
          </motion.div>
        )}
        {saved && <p className="mt-3 text-center text-[13px] font-semibold text-white/55">{saved}</p>}
      </div>
      <div className="absolute inset-x-0 bottom-0 z-20 flex justify-center gap-3 bg-gradient-to-t from-[#0e1230] to-transparent px-4 pt-8 pb-[max(16px,env(safe-area-inset-bottom))]">
        {onAgain && <Btn big tone="green" onClick={onAgain}>{againLabel}</Btn>}
        <Btn big tone="ghost" onClick={onExit}>{exitLabel}</Btn>
      </div>
    </div>
  );
}
