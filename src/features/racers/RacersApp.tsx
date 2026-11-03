/* English Racers (route /racers): 3D kart racing with the teachers. Phase 1 — the driving
   prototype: Campus ECYR track, time trial over 3 laps, drift with mini-turbos, rocket start,
   ramps with tricks, boost pads. Menu (pick your teacher), HUD (lap, times, speed, minimap),
   touch buttons on phones (accelerate button, as asked), pause and results. */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ChevronLeft, ChevronRight, Flag, Home, Music, Pause, Play, RotateCcw, Smartphone, Trophy, Volume2, VolumeX } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TOONS } from '@/features/toons3d/runtime';
import { GameTitle } from '@/components/brand/GameTitle';
import { GameLangToggle } from '@/components/GameLangToggle';
import { t, useGameLang } from '@/lib/gameLang';
import { RaceGame, fmt, type Hud, type Toast, type TouchState } from './engine';
import { prefs, setPref, unlock } from './audio';

const CSS = `
.rc-root{font-family:Inter,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;color:#fff;background:#cfe6fb}
.rc-num{font-weight:900;font-variant-numeric:tabular-nums;-webkit-text-stroke:2.5px #10204a;paint-order:stroke fill;text-shadow:0 3px 0 #10204a}
.rc-panel{border-radius:22px;background:rgba(14,22,56,.78);backdrop-filter:blur(8px);box-shadow:0 10px 30px rgba(0,0,0,.25),inset 0 0 0 1.5px rgba(255,255,255,.12)}
.rc-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:18px;font-weight:900;transition:transform .08s}
.rc-btn:active{transform:translateY(3px) scale(.99)}
.rc-pad{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
@keyframes rc-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
`;

const initialToon = () => { try { const v = localStorage.getItem('racers:toon'); if (v && TOONS.some((t) => t.id === v)) return v; } catch { /* ignore */ } return TOONS[Math.floor(Math.random() * TOONS.length)].id; };
const TIER = ['', '#4cc3ff', '#ff9a2e', '#d36bff'];

function Btn({ tone = 'yellow', className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'yellow' | 'green' | 'white' | 'ghost' }) {
  const tones = {
    yellow: 'bg-[#ffd23f] text-[#2a1d00] shadow-[0_5px_0_#c79a00]',
    green: 'bg-[#2fd27a] text-[#062a15] shadow-[0_5px_0_#16924d]',
    white: 'bg-white text-[#10204a] shadow-[0_5px_0_#b9c6e6]',
    ghost: 'bg-white/14 text-white hover:bg-white/22',
  };
  return <button type="button" {...rest} className={cn('rc-btn h-12 px-5 text-[16px]', tones[tone], className)}>{children}</button>;
}
function Toggle({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={on} className={cn('grid h-11 w-11 place-items-center rounded-2xl transition-colors', on ? 'bg-white text-[#10204a]' : 'bg-[#10204a]/55 text-white/60')}>{children}</button>;
}

/** A hold button for touch screens (each finger independent). */
function Pad({ k, game, className, children, label }: { k: keyof TouchState; game: RaceGame | null; className?: string; children: React.ReactNode; label: string }) {
  const [on, setOn] = useState(false);
  const set = (v: boolean) => { setOn(v); game?.setTouch({ [k]: v }); };
  return (
    <button type="button" aria-label={label}
      onPointerDown={(e) => { e.preventDefault(); (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); set(true); }}
      onPointerUp={() => set(false)} onPointerCancel={() => set(false)} onLostPointerCapture={() => set(false)}
      onContextMenu={(e) => e.preventDefault()}
      className={cn('rc-pad grid place-items-center rounded-full border-[3px] border-white/70 font-black text-white shadow-[0_6px_0_rgba(0,0,0,.25)] transition-transform', on && 'translate-y-[3px] scale-95 brightness-110', className)}>
      {children}
    </button>
  );
}

export default function RacersApp() {
  const host = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<RaceGame | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toon, setToon] = useState(initialToon);
  const [err, setErr] = useState(false);
  const [, force] = useState(0);
  const [touchUi] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(pointer: coarse)').matches);
  const [portrait, setPortrait] = useState(false);
  const lang = useGameLang();

  useEffect(() => {
    requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready')));
    const prev = document.title;
    document.title = 'English Racers · ECYR English';
    let g: RaceGame | null = null;
    try {
      g = new RaceGame(host.current!, { toon });
      g.onHud = setHud;
      g.onToast = (t) => { setToasts((a) => [...a.slice(-2), t]); setTimeout(() => setToasts((a) => a.filter((x) => x.id !== t.id)), 1800); };
      setGame(g);
      if (import.meta.env.DEV) (window as unknown as { __racers: unknown }).__racers = g;
    } catch { setErr(true); }
    const orient = () => setPortrait(window.innerHeight > window.innerWidth * 1.05);
    orient();
    window.addEventListener('resize', orient);
    return () => { document.title = prev; window.removeEventListener('resize', orient); g?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const st = hud?.state ?? 'loading';
  const idx = TOONS.findIndex((t) => t.id === toon);
  const cur = TOONS[idx] ?? TOONS[0];
  const pickToon = (d: number) => { const n = TOONS[(idx + d + TOONS.length) % TOONS.length]; setToon(n.id); void game?.setToon(n.id); };
  const go = () => { unlock(); game?.start(); };

  if (err) return <div className="grid h-dvh place-items-center bg-[#10204a] p-6 text-center text-[17px] font-bold text-white">{t('This browser cannot show 3D (WebGL).', 'Este navegador no puede mostrar 3D (WebGL).')}<Link to="/games" className="mt-4 underline">{t('Back', 'Volver')}</Link></div>;

  const racing = st === 'race' || st === 'countdown';
  return (
    <div className="rc-root relative h-dvh w-full overflow-hidden select-none" onPointerDown={unlock}>
      <style>{CSS}</style>
      <div ref={host} className="absolute inset-0" />

      {/* ------------------------------------------------------------ menu */}
      {(st === 'menu' || st === 'loading') && (
        <div className="pointer-events-none absolute inset-0 flex flex-col p-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(14px,env(safe-area-inset-bottom))] sm:p-5">
          <div className="pointer-events-auto flex items-center gap-2">
            <Link to="/games" className="grid h-11 w-11 place-items-center rounded-2xl bg-[#10204a]/60 text-white hover:bg-[#10204a]/80" aria-label={t('Back', 'Volver')}><ArrowLeft /></Link>
            <div className="ml-auto flex gap-1.5">
              <GameLangToggle />
              <Toggle on={prefs.music} onClick={() => { setPref('music', !prefs.music); force((n) => n + 1); }} label={t('Music', 'Música')}><Music size={19} /></Toggle>
              <Toggle on={prefs.sfx} onClick={() => { setPref('sfx', !prefs.sfx); force((n) => n + 1); }} label={t('Sound effects', 'Efectos')}>{prefs.sfx ? <Volume2 size={19} /> : <VolumeX size={19} />}</Toggle>
            </div>
          </div>
          <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }} className="mt-1 text-center sm:mt-3 sm:text-left">
            <GameTitle word="RACERS" theme="racers" className="mx-auto block h-auto w-[250px] sm:mx-0 sm:w-[430px] [@media(max-height:520px)]:w-[175px]" />
            <div className="mt-2 inline-block rounded-full bg-[#10204a]/70 px-3 py-1 text-[12.5px] font-extrabold tracking-wide text-white/90 uppercase [@media(max-height:520px)]:hidden">{t('Prototype · phase 1 · time trial', 'Prototipo · fase 1 · contrarreloj')}</div>
          </motion.div>
          <div className="mt-auto flex flex-col items-center gap-3 sm:items-start">
            <div className="pointer-events-auto rc-panel flex w-full max-w-[470px] flex-col gap-3 p-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => pickToon(-1)} className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12 hover:bg-white/22" aria-label={t('Previous', 'Anterior')}><ChevronLeft /></button>
                <div className="min-w-0 flex-1 text-center">
                  <div className="text-[12px] font-extrabold tracking-wide text-white/60 uppercase">{t('Driver', 'Piloto')}</div>
                  <div className="flex items-center justify-center gap-2 truncate text-[22px] font-black"><span className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/30" style={{ background: cur.color }} />{cur.name}</div>
                </div>
                <button type="button" onClick={() => pickToon(1)} className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12 hover:bg-white/22" aria-label={t('Next', 'Siguiente')}><ChevronRight /></button>
              </div>
              <div className="flex items-center gap-3 rounded-2xl bg-white/8 px-3 py-2.5">
                <Flag size={20} className="shrink-0 text-[#ffd23f]" />
                <div className="min-w-0 flex-1">
                  <div className="text-[15px] font-black">{t('Campus ECYR · 3 laps', 'Campus ECYR · 3 vueltas')}</div>
                  <div className="text-[12.5px] font-semibold text-white/65">{t('Banked curve, hairpin, chicane, hill and a jump over the pond', 'Curva peraltada, horquilla, chicana, colina y salto sobre el estanque')}</div>
                </div>
                {hud?.record && <div className="shrink-0 text-right text-[12px] font-bold text-white/70"><Trophy size={14} className="inline text-[#ffd23f]" /> {fmt(hud.record.total)}<br />{t('lap', 'vuelta')} {fmt(hud.record.lap)}</div>}
              </div>
              <Btn tone="green" className="h-14 w-full text-[21px]" onClick={go} disabled={st === 'loading'}>{st === 'loading' ? t('Loading…', 'Cargando…') : <><Play size={22} fill="currentColor" /> {t('RACE!', '¡A CORRER!')}</>}</Btn>
            </div>
            <div className="pointer-events-auto rc-panel max-w-[470px] px-4 py-2.5 text-[12.5px] leading-relaxed font-semibold text-white/80 [@media(max-height:520px)]:hidden">
              {touchUi
                ? (lang === 'en'
                  ? <>Green button: accelerate · arrows: steer · <b className="text-[#ffb547]">DRIFT</b>: hold it while turning to charge the turbo (blue → orange → purple), then let go · in the air, tap DRIFT for a trick · accelerate just as the last red light goes out for a perfect start</>
                  : <>Botón verde: acelerar · flechas: girar · <b className="text-[#ffb547]">DERRAPE</b>: mantén mientras giras para cargar el turbo (azul → naranja → morado) y suéltalo · en el aire, toca DERRAPE para hacer un truco · acelera justo cuando se apaga la última luz roja para una salida perfecta</>)
                : (lang === 'en'
                  ? <><b>W/↑</b> accelerate · <b>S/↓</b> brake · <b>A D/← →</b> steer · <b>Space/Shift</b> hop and drift (hold: blue → orange → purple, let go = turbo) · in the air = trick · <b>C</b> look back · <b>R</b> back on track · <b>Esc</b> pause · gamepads work too</>
                  : <><b>W/↑</b> acelerar · <b>S/↓</b> frenar · <b>A D/← →</b> girar · <b>Espacio/Shift</b> saltar y derrapar (mantén: azul → naranja → morado, suelta = turbo) · en el aire = truco · <b>C</b> mirar atrás · <b>R</b> volver a la pista · <b>Esc</b> pausa · control de consola compatible</>)}
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ race HUD */}
      {hud && (racing || st === 'paused') && (
        <div className="pointer-events-none absolute inset-0 p-3 pt-[max(10px,env(safe-area-inset-top))] sm:p-4">
          <div className="flex items-start gap-2">
            <button type="button" onClick={() => game?.togglePause()} className="pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#10204a]/60 text-white" aria-label={t('Pause', 'Pausa')}><Pause size={20} /></button>
            <div className="rc-panel px-3 py-1.5">
              <div className="text-[11px] font-extrabold tracking-wide text-white/65 uppercase">{t('Lap', 'Vuelta')}</div>
              <div className="rc-num text-[30px] leading-none">{hud.lap}<span className="text-[18px] text-white/70">/{hud.laps}</span></div>
            </div>
            <div className="rc-panel px-3 py-1.5">
              <div className="rc-num text-[24px] leading-none">{fmt(hud.time)}</div>
              <div className="mt-0.5 text-[12px] font-bold text-white/70 tabular-nums">{t('Lap', 'Vuelta')} {fmt(hud.lapTime)}{hud.bestLap !== null && <span className="ml-2 text-[#7dff9a]">{t('Best', 'Mejor')} {fmt(hud.bestLap)}</span>}</div>
            </div>
            <div className="ml-auto">
              <svg viewBox="-8 -8 116 116" className="h-[92px] w-[92px] drop-shadow-[0_2px_4px_rgba(0,0,0,.35)] sm:h-[128px] sm:w-[128px]">
                <path d={game?.mapPath} fill="none" stroke="#10204a" strokeWidth={9} strokeLinejoin="round" opacity={0.75} />
                <path d={game?.mapPath} fill="none" stroke="#fff" strokeWidth={4.5} strokeLinejoin="round" />
                <circle cx={hud.x * 100} cy={hud.z * 100} r={6} fill={cur.color} stroke="#10204a" strokeWidth={2.5} />
              </svg>
            </div>
          </div>
          {/* speedometer */}
          <div className={cn('absolute flex flex-col', touchUi ? 'top-[max(84px,calc(env(safe-area-inset-top)+74px))] left-4 items-start' : 'right-5 bottom-5 items-end')}>
            <div className="rc-num text-[44px] leading-none sm:text-[56px]" style={{ color: hud.boost ? '#ffd23f' : '#fff' }}>{hud.speed}</div>
            <div className="text-[12px] font-extrabold tracking-widest text-white/80 uppercase [text-shadow:0_2px_0_#10204a]">km/h</div>
            {hud.tier > 0 && <div className="mt-1 rounded-full px-2.5 py-0.5 text-[12px] font-black" style={{ background: TIER[hud.tier], color: '#10204a' }}>TURBO {hud.tier}</div>}
          </div>
          {hud.wrongWay && <div className="absolute top-[35%] left-1/2 -translate-x-1/2 animate-[rc-pulse_.7s_infinite] rounded-2xl bg-[#ff3d3d] px-5 py-2 text-[22px] font-black text-white shadow-lg">{t('WRONG WAY!', '¡SENTIDO CONTRARIO!')}</div>}
        </div>
      )}

      {/* countdown */}
      <AnimatePresence>
        {st === 'countdown' && hud && hud.count <= 3 && hud.count >= 1 && (
          <motion.div key={hud.count} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="rc-num pointer-events-none absolute top-[24%] left-1/2 -ml-[60px] w-[120px] text-center leading-none text-[#ffd23f]" style={{ fontSize: 'min(120px, 20vh)' }}>{hud.count}</motion.div>
        )}
      </AnimatePresence>

      {/* toasts */}
      <div className="pointer-events-none absolute top-[22%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div key={t.id} initial={{ scale: 0.4, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="text-center">
              <div className="rc-num text-[34px] whitespace-nowrap sm:text-[44px]" style={{ color: t.color }}>{t.text}</div>
              {t.sub && <div className="text-[14px] font-extrabold text-white [text-shadow:0_2px_0_#10204a]">{t.sub}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* touch controls (accelerate with a button) */}
      {touchUi && racing && (
        <>
          <div className="absolute bottom-[max(18px,env(safe-area-inset-bottom))] left-4 flex gap-3">
            <Pad k="left" game={game} label={t('Left', 'Izquierda')} className="h-[86px] w-[86px] bg-[#10204a]/55"><ChevronLeft size={46} /></Pad>
            <Pad k="right" game={game} label={t('Right', 'Derecha')} className="h-[86px] w-[86px] bg-[#10204a]/55"><ChevronRight size={46} /></Pad>
          </div>
          <div className="absolute right-4 bottom-[max(18px,env(safe-area-inset-bottom))] flex items-end gap-3">
            <div className="flex flex-col items-center gap-3">
              <Pad k="drift" game={game} label={t('Drift', 'Derrape')} className="h-[72px] w-[72px] bg-[#ff8a1f]/85 text-[12px]">{t('DRIFT', 'DERRAPE')}</Pad>
              <Pad k="brake" game={game} label={t('Brake', 'Frenar')} className="h-[54px] w-[54px] bg-[#ff4757]/80 text-[11px]">{t('BRAKE', 'FRENO')}</Pad>
            </div>
            <Pad k="gas" game={game} label={t('Accelerate', 'Acelerar')} className="h-[104px] w-[104px] bg-[#2fd27a]/90 text-[15px]">{t('GO', 'ACELERAR')}</Pad>
          </div>
        </>
      )}

      {/* pause */}
      {st === 'paused' && (
        <div className="absolute inset-0 grid place-items-center bg-[#0a1230]/55 p-4">
          <div className="rc-panel flex w-full max-w-[340px] flex-col gap-3 p-5 text-center">
            <div className="rc-num text-[34px]">{t('PAUSED', 'PAUSA')}</div>
            <Btn tone="green" onClick={() => game?.togglePause()}><Play size={20} fill="currentColor" /> {t('Resume', 'Continuar')}</Btn>
            <Btn tone="white" onClick={() => game?.restart()}><RotateCcw size={20} /> {t('Restart race', 'Reiniciar carrera')}</Btn>
            <Btn tone="ghost" onClick={() => game?.toMenu()}><Home size={20} /> {t('Menu', 'Menú')}</Btn>
            <div className="flex justify-center gap-2">
              <GameLangToggle />
              <Toggle on={prefs.music} onClick={() => { setPref('music', !prefs.music); force((n) => n + 1); }} label={t('Music', 'Música')}><Music size={19} /></Toggle>
              <Toggle on={prefs.sfx} onClick={() => { setPref('sfx', !prefs.sfx); force((n) => n + 1); }} label={t('Sound effects', 'Efectos')}>{prefs.sfx ? <Volume2 size={19} /> : <VolumeX size={19} />}</Toggle>
            </div>
          </div>
        </div>
      )}

      {/* results */}
      {st === 'finish' && hud?.results && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.2 }} className="absolute inset-x-0 bottom-0 flex justify-center p-3 pb-[max(14px,env(safe-area-inset-bottom))] sm:top-0 sm:items-center sm:justify-end sm:p-6">
          <div className="rc-panel w-full max-w-[380px] p-4">
            <div className="rc-num text-center text-[36px] text-[#ffd23f]">{t('FINISH!', '¡META!')}</div>
            <div className="text-center text-[13px] font-bold text-white/70 uppercase">{t('Total time', 'Tiempo total')}</div>
            <div className="rc-num text-center text-[42px] leading-none">{fmt(hud.results.total)}</div>
            {hud.results.newBestTotal && <div className="mt-1 text-center text-[14px] font-black text-[#7dff9a]">{t('New record!', '¡Nuevo récord!')}</div>}
            <div className="mt-3 flex flex-col gap-1">
              {hud.results.laps.map((l, i) => (
                <div key={i} className={cn('flex items-center justify-between rounded-xl px-3 py-1.5 text-[15px] font-bold tabular-nums', l === hud.results!.best ? 'bg-[#2fd27a]/25 text-[#b7ffcf]' : 'bg-white/8')}>
                  <span>{t('Lap', 'Vuelta')} {i + 1}</span><span>{fmt(l)}{l === hud.results!.best && ' ★'}</span>
                </div>
              ))}
            </div>
            {hud.record && <div className="mt-2 text-center text-[12.5px] font-semibold text-white/65">{t('Record', 'Récord')}: {fmt(hud.record.total)} · {t('best lap', 'mejor vuelta')} {fmt(hud.record.lap)}</div>}
            <div className="mt-3 flex gap-2">
              <Btn tone="green" className="flex-1" onClick={() => game?.restart()}><RotateCcw size={19} /> {t('Again', 'Otra vez')}</Btn>
              <Btn tone="ghost" onClick={() => game?.toMenu()}><Home size={19} /> {t('Menu', 'Menú')}</Btn>
            </div>
          </div>
        </motion.div>
      )}

      {touchUi && portrait && (
        <div className="absolute inset-0 grid place-items-center bg-[#0a1230]/85 p-6 text-center">
          <div><Smartphone size={54} className="mx-auto mb-3 rotate-90 text-[#ffd23f]" /><div className="text-[22px] font-black">{t('Turn your phone', 'Gira tu celular')}</div><div className="mt-1 text-[15px] font-semibold text-white/75">{t('English Racers is played in landscape.', 'English Racers se juega en horizontal.')}</div></div>
        </div>
      )}
    </div>
  );
}
