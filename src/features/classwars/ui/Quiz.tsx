/* Class Wars — the question screen (4 big coloured tiles) and the upgrade shop. */
import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Check, Flame, ShoppingBag, X, BookOpen, ShieldAlert, Shield } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { ClientSession, ServedQ } from '../game/client';
import { FLAG } from '../game/constants';
import { UPGRADES, answerGain, upValue } from '../game/defs';
import { sfx } from '../render/audio';
import { Btn, Diamond, GameIcon } from './kit';

const TILE = [
  { bg: '#d8343f', sh: '#9e1f2a' },
  { bg: '#f07a1e', sh: '#b4520c' },
  { bg: '#26a34a', sh: '#18712f' },
  { bg: '#2f6fe0', sh: '#1d4aa3' },
];

export function QuizOverlay({ client, onClose, tab, setTab }: { client: ClientSession; onClose: () => void; tab: 'q' | 'shop'; setTab: (t: 'q' | 'shop') => void }) {
  const [, force] = useState(0);
  useEffect(() => client.subscribe(() => force((n) => n + 1)), [client]); // quiz needs dia/streak/queue
  const row = client.myRow();
  const dia = row?.[6] ?? 0;
  const en = row?.[14] ?? 0;
  const combat = !!(row && row[7] & FLAG.combat);
  const genius = !!(row && row[7] & FLAG.genius);
  const per = answerGain(client.ups, client.streak, genius);

  return (
    <div className="absolute inset-0 z-40 flex flex-col bg-[#10153a]/97" onPointerDown={(e) => e.stopPropagation()}>
      <div className="flex shrink-0 items-center gap-2 px-3 pt-[max(8px,env(safe-area-inset-top))] pb-2 sm:gap-3 sm:px-5">
        <div className="flex items-center gap-1 rounded-full bg-black/30 py-1.5 pr-3.5 pl-2 text-[18px] font-black tabular-nums text-[#ffe14d]"><GameIcon k="bolt" size={20} />{en}</div>
        <div className="flex items-center gap-1.5 rounded-full bg-black/30 py-1.5 pr-3.5 pl-2 text-[18px] font-black tabular-nums"><Diamond size={22} />{dia}</div>
        <div className={cn('flex items-center gap-1 rounded-full px-3 py-1.5 text-[15px] font-black', client.streak >= 3 ? 'bg-[#ff7a1a] text-white' : 'bg-black/30 text-white/80')}><Flame size={16} />{client.streak}</div>
        <div className="hidden rounded-full bg-black/30 px-3 py-1.5 text-[13px] font-bold text-white/75 md:block"><span className="inline-flex items-center gap-1">+{per} <GameIcon k="bolt" size={14} /> por acierto{genius && ' · ×2'}</span></div>
        <div className="ml-auto flex rounded-full bg-black/30 p-1">
          <button type="button" aria-label="Preguntas" onClick={() => setTab('q')} className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-extrabold', tab === 'q' ? 'bg-white text-[#1b2350]' : 'text-white/80')}><BookOpen size={16} /><span className="hidden sm:inline">Preguntas</span></button>
          <button type="button" aria-label="Mejoras" onClick={() => setTab('shop')} className={cn('flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[14px] font-extrabold', tab === 'shop' ? 'bg-white text-[#1b2350]' : 'text-white/80')}><ShoppingBag size={16} /><span className="hidden sm:inline">Mejoras</span></button>
        </div>
        <button type="button" onClick={onClose} aria-label="Volver al mapa (Esc)" className="grid h-11 w-11 place-items-center rounded-full bg-white/12 text-white hover:bg-white/20"><X size={24} /></button>
      </div>
      <div className={cn('mx-3 mb-2 flex shrink-0 items-center gap-2 rounded-xl px-3 py-1.5 text-[12.5px] font-bold sm:mx-5', combat ? 'bg-[#ff4d5e]/25 text-[#ffb3ba]' : 'bg-[#30d158]/15 text-[#9df0b4]')}>
        {combat ? <ShieldAlert size={15} /> : <Shield size={15} />}
        {combat ? '¡En combate! Eres vulnerable mientras respondes (3 s sin pelear para estar a salvo).' : 'Estás a salvo en tu burbuja de estudio. Cada acierto recarga energía y cura +5.'}
      </div>
      {tab === 'q' ? <Questions client={client} /> : <Shop client={client} en={en} />}
    </div>
  );
}

function Questions({ client }: { client: ClientSession }) {
  const [cur, setCur] = useState<ServedQ | null>(() => client.queue[0] ?? null);
  const [res, setRes] = useState<null | { choice: number; ok: boolean; gain: number }>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!cur && client.queue[0]) setCur(client.queue[0]);
  });
  useEffect(() => () => { if (timer.current) clearTimeout(timer.current); }, []);
  const next = () => {
    if (timer.current) clearTimeout(timer.current);
    setRes(null);
    setCur(client.queue[0] ?? null);
  };
  const pick = (i: number) => {
    if (!cur || res) return;
    if (i >= cur.o.length) return;
    const r = client.answer(cur, i);
    setRes({ choice: i, ...r });
    if (r.ok) { sfx.correct(client.streak); timer.current = setTimeout(next, 750); }
    else { sfx.wrong(); timer.current = setTimeout(next, 2600); }
  };
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if (['1', '2', '3', '4'].includes(e.key)) { e.preventDefault(); pick(Number(e.key) - 1); }
      else if ((e.key === 'Enter' || e.key === ' ') && res && !res.ok) { e.preventDefault(); next(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });

  if (!cur) return <div className="grid flex-1 place-items-center text-[18px] font-bold text-white/70">Cargando preguntas…</div>;
  const n = cur.o.length;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <AnimatePresence mode="wait">
        <motion.div key={cur.id + ':' + cur.q} initial={{ y: -18, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 10, opacity: 0 }} transition={{ duration: 0.18 }} className="flex min-h-0 flex-1 flex-col">
          <div className="flex min-h-[26%] shrink-0 items-center justify-center bg-gradient-to-b from-[#3657e8] to-[#2a45c4] px-5 py-4 shadow-[0_6px_0_rgba(0,0,0,.25)]">
            <h2 className="max-w-[1100px] text-center text-[clamp(20px,4.2vmin,44px)] leading-tight font-extrabold text-white">{cur.q}</h2>
          </div>
          <div className={cn('relative grid min-h-0 flex-1 gap-2 p-2 sm:gap-3 sm:p-3', n === 2 ? 'grid-cols-2' : n === 3 ? 'grid-cols-1 sm:grid-cols-3' : 'grid-cols-1 grid-rows-4 sm:grid-cols-2 sm:grid-rows-2')}>
            {cur.o.map((o, i) => {
              const isAns = i === cur.a;
              const chosen = res?.choice === i;
              const dim = res && !isAns && !chosen;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => pick(i)}
                  className={cn(
                    'relative flex min-h-[54px] items-center justify-center rounded-2xl px-4 text-center text-[clamp(17px,3.2vmin,34px)] leading-tight font-extrabold text-white transition-[transform,opacity,filter] duration-150 active:translate-y-1',
                    !res && 'hover:brightness-110',
                    dim && 'opacity-35',
                    res && chosen && !res.ok && 'cw-shake',
                    res && isAns && 'ring-[6px] ring-white',
                  )}
                  style={{ background: TILE[i].bg, boxShadow: `0 6px 0 ${TILE[i].sh}` }}
                >
                  <span className="absolute top-2 left-3 text-[13px] font-black text-white/60">{i + 1}</span>
                  {o}
                  {res && isAns && <span className="absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-white text-[#26a34a]"><Check strokeWidth={4} /></span>}
                  {res && chosen && !res.ok && <span className="absolute top-2 right-2 grid h-9 w-9 place-items-center rounded-full bg-white text-[#d8343f]"><X strokeWidth={4} /></span>}
                </button>
              );
            })}
            <AnimatePresence>
              {res?.ok && (
                <motion.div initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ opacity: 0, y: -30 }} transition={{ type: 'spring', stiffness: 500, damping: 18 }} className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="flex items-center gap-3 rounded-[28px] border-4 border-white bg-[#26a34a] px-8 py-4 text-[clamp(30px,7vmin,64px)] font-black text-white shadow-[0_10px_0_#18712f]">
                    ¡Correcto! +{res.gain} <GameIcon k="bolt" size={50} />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          {res && !res.ok && (
            <div className="flex shrink-0 items-center gap-3 bg-[#d8343f] px-4 py-3">
              <div className="min-w-0 flex-1 text-[15px] font-bold sm:text-[18px]">Respuesta correcta: <span className="font-black">{cur.o[cur.a]}</span></div>
              <Btn tone="white" onClick={next}>Seguir</Btn>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

function Shop({ client, en }: { client: ClientSession; en: number }) {
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => { setPending(null); }, [client.ups]);
  return (
    <div className="cw-scroll min-h-0 flex-1 overflow-y-auto px-3 pb-6 sm:px-5">
      <p className="mb-3 text-center text-[14px] font-semibold text-white/70">Invierte tu energía en mejoras: recarga más con cada pregunta, saca más diamantes de las cajas y gasta menos al moverte.</p>
      <div className="mx-auto grid max-w-[1100px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {UPGRADES.map((u) => {
          const lvl = client.ups[u.id];
          const max = lvl >= u.values.length - 1;
          const cost = max ? 0 : u.costs[lvl + 1];
          const can = !max && en >= cost && pending !== u.id;
          return (
            <div key={u.id} className="flex flex-col rounded-2xl border-2 border-white/10 bg-[#232d6b] p-4">
              <div className="flex items-center gap-3">
                <div className="grid h-12 w-12 place-items-center rounded-xl bg-white/10"><GameIcon k={u.ic} size={32} /></div>
                <div className="min-w-0">
                  <div className="text-[17px] leading-tight font-black">{u.name}</div>
                  <div className="text-[12.5px] font-semibold text-white/65">{u.desc}</div>
                </div>
              </div>
              <div className="mt-3 flex gap-1">
                {u.values.slice(1).map((_, i) => <div key={i} className={cn('h-2.5 flex-1 rounded-full', i < lvl ? 'bg-[#ffd23f]' : 'bg-white/15')} />)}
              </div>
              <div className="mt-3 flex items-center gap-2">
                <div className="text-[15px] font-extrabold">{u.fmt(upValue(u.id, lvl))}{!max && <span className="text-white/60"> → <span className="text-[#ffd23f]">{u.fmt(u.values[lvl + 1])}</span></span>}</div>
                <Btn tone={can ? 'green' : 'ghost'} className="ml-auto h-10 px-4" disabled={!can} onClick={() => { setPending(u.id); client.buy(u.id); sfx.buy(); setTimeout(() => setPending(null), 1500); }}>
                  {max ? 'MÁX' : <>{cost.toLocaleString('es-CO')} <GameIcon k="bolt" size={17} /></>}
                </Btn>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
