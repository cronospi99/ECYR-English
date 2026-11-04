/* English Racers — the garage panel: wallet, part tabs (paint, rims, wing, flames), buy & equip;
   the kart in the 3D view behind the panel changes as you pick. */
import { useState } from 'react';
import { ArrowLeft, Check, Coins, Lock } from 'lucide-react';
import { cn } from '@/lib/cn';
import { t, useGameLang } from '@/lib/gameLang';
import { PARTS, garage, type PartKind } from './garage';
import type { RaceGame } from './engine';
import { Seg } from './ui';

export function GaragePanel({ game, onClose }: { game: RaceGame | null; onClose: () => void }) {
  const lang = useGameLang();
  const [tab, setTab] = useState<PartKind>('paint');
  const [msg, setMsg] = useState('');
  const [, force] = useState(0);
  const parts = PARTS.filter((p) => p.kind === tab);
  return (
    <div className="flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <button type="button" onClick={onClose} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/12 hover:bg-white/22" aria-label={t('Back', 'Volver')}><ArrowLeft /></button>
        <div className="min-w-0 flex-1 text-[20px] font-black">{t('Garage', 'Garaje')}</div>
        <div className="flex items-center gap-1.5 rounded-2xl bg-[#ffd23f] px-3 py-1.5 text-[16px] font-black text-[#2a1d00]"><Coins size={17} />{garage.coins}</div>
      </div>
      <Seg<PartKind> value={tab} onChange={(v) => { setTab(v); setMsg(''); }} options={[
        { id: 'paint', label: t('Paint', 'Pintura') }, { id: 'rim', label: t('Rims', 'Llantas') }, { id: 'wing', label: t('Wing', 'Alerón') }, { id: 'flame', label: t('Flames', 'Llamas') },
      ]} />
      <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-4">
        {parts.map((p) => {
          const owned = garage.owns(p.id), on = garage.equipped(p);
          return (
            <button key={p.id} type="button" aria-pressed={on}
              onClick={() => { if (garage.take(p)) { game?.setStyle(garage.style); setMsg(''); } else setMsg(t(`You need ${p.price - garage.coins} more coins`, `Te faltan ${p.price - garage.coins} monedas`)); force((n) => n + 1); }}
              className={cn('flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1.5 py-2 text-center transition-colors', on ? 'bg-white text-[#10204a]' : 'bg-white/8 hover:bg-white/14')}>
              <span className="relative h-9 w-9 rounded-full border-2 border-white/70 shadow" style={{ background: p.swatch }}>
                {on && <Check size={16} className="absolute -right-1 -bottom-1 rounded-full bg-[#2fd27a] p-0.5 text-white" />}
              </span>
              <span className="w-full truncate text-[11.5px] font-black">{lang === 'en' ? p.name.en : p.name.es}</span>
              <span className={cn('flex items-center gap-0.5 text-[11px] font-extrabold', on ? 'text-[#10204a]/60' : 'text-white/60')}>
                {owned ? (on ? t('Equipped', 'Equipado') : t('Owned', 'Tuyo')) : <>{garage.coins < p.price ? <Lock size={11} /> : <Coins size={11} />}{p.price}</>}
              </span>
            </button>
          );
        })}
      </div>
      {msg && <div className="rounded-xl bg-[#ff4757]/25 px-3 py-1.5 text-center text-[13px] font-bold">{msg}</div>}
      <div className="px-1 text-[11.5px] leading-snug font-semibold text-white/60">{t('Earn coins in every race: coins you keep, +2 per right answer and a bonus for your place.', 'Gana monedas en cada carrera: las monedas que conservas, +2 por respuesta correcta y un bono por tu puesto.')}</div>
    </div>
  );
}
