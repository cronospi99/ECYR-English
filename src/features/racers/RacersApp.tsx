/* English Racers (route /racers): 3D kart racing with the teachers. Phase 2 — the full game for one
   player: Grand Prix (4 tracks, points, podium), single race or time trial; seven teacher bots on
   three difficulty levels; items and coins; question gates in English by level, reviewed after the
   race. Menu (driver, mode, track, level, difficulty), HUD (place, lap, times, coins, item,
   question, standings, minimap with every kart), touch buttons on phones (accelerate and item
   buttons), pause, results and the podium. */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Coins, Flag, Home, Music, Pause, Play, RotateCcw, Smartphone, Trophy, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TOONS } from '@/features/toons3d/runtime';
import { GameTitle } from '@/components/brand/GameTitle';
import { GameLangToggle } from '@/components/GameLangToggle';
import { t, useGameLang } from '@/lib/gameLang';
import { RUN_LEVELS } from '@/features/run/questions';
import { GP_TRACKS, RaceGame, fmt, ordinal, type Hud, type Mode, type Toast, type TouchState } from './engine';
import { TRACKS, trackInfo } from './tracks';
import { ITEMS, itemIcon } from './items';
import { LANE_COLORS, LANE_LETTERS } from './gates';
import type { Difficulty } from './ai';
import { prefs, setPref, unlock } from './audio';

const CSS = `
.rc-root{font-family:Inter,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;color:#fff;background:#cfe6fb}
.rc-num{font-weight:900;font-variant-numeric:tabular-nums;-webkit-text-stroke:2.5px #10204a;paint-order:stroke fill;text-shadow:0 3px 0 #10204a}
.rc-panel{border-radius:22px;background:rgba(14,22,56,.78);backdrop-filter:blur(8px);box-shadow:0 10px 30px rgba(0,0,0,.25),inset 0 0 0 1.5px rgba(255,255,255,.12)}
.rc-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:18px;font-weight:900;transition:transform .08s}
.rc-btn:active{transform:translateY(3px) scale(.99)}
.rc-btn:disabled{opacity:.55}
.rc-pad{touch-action:none;-webkit-user-select:none;user-select:none;-webkit-touch-callout:none}
.rc-scroll{overflow-y:auto;scrollbar-width:thin;scrollbar-color:rgba(255,255,255,.25) transparent}
@keyframes rc-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
@keyframes rc-spin{0%{transform:rotate(-8deg) scale(.9)}50%{transform:rotate(8deg) scale(1.05)}100%{transform:rotate(-8deg) scale(.9)}}
`;

const initialToon = () => { try { const v = localStorage.getItem('racers:toon'); if (v && TOONS.some((x) => x.id === v)) return v; } catch { /* ignore */ } return TOONS[Math.floor(Math.random() * TOONS.length)].id; };
const TIER = ['', '#4cc3ff', '#ff9a2e', '#d36bff'];
const PLACE_COL = ['#ffd23f', '#e3e8f0', '#e59a5c'];

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
function Seg<T extends string>({ value, options, onChange }: { value: T; options: { id: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex gap-1 rounded-2xl bg-white/8 p-1">
      {options.map((o) => (
        <button key={o.id} type="button" onClick={() => onChange(o.id)} aria-pressed={value === o.id}
          className={cn('h-9 min-w-0 flex-1 truncate rounded-xl px-2 text-[13.5px] font-black transition-colors', value === o.id ? 'bg-white text-[#10204a]' : 'text-white/75 hover:bg-white/10')}>{o.label}</button>
      ))}
    </div>
  );
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

function Dot({ color, size = 12 }: { color: string; size?: number }) {
  return <span className="inline-block shrink-0 rounded-full border border-black/30" style={{ background: color, width: size, height: size }} />;
}

export default function RacersApp() {
  const host = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<RaceGame | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toon, setToon] = useState(initialToon);
  const [err, setErr] = useState(false);
  const [, force] = useState(0);
  const [showReview, setShowReview] = useState(false);
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
      g.onToast = (x) => { setToasts((a) => [...a.slice(-2), x]); setTimeout(() => setToasts((a) => a.filter((y) => y.id !== x.id)), 1900); };
      setGame(g);
      if (import.meta.env.DEV) (window as unknown as { __racers: unknown }).__racers = g;
    } catch { setErr(true); }
    const orient = () => setPortrait(window.innerHeight > window.innerWidth * 1.05);
    orient();
    window.addEventListener('resize', orient);
    return () => { document.title = prev; window.removeEventListener('resize', orient); g?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => { if (hud?.state !== 'finish') setShowReview(false); }, [hud?.state]);

  const st = hud?.state ?? 'loading';
  const idx = TOONS.findIndex((x) => x.id === toon);
  const cur = TOONS[idx] ?? TOONS[0];
  const pickToon = (d: number) => { const n = TOONS[(idx + d + TOONS.length) % TOONS.length]; setToon(n.id); void game?.setToon(n.id); };
  const go = () => { unlock(); game?.start(); };
  const s = game?.settings;
  const conf = (p: Parameters<RaceGame['configure']>[0]) => { game?.configure(p); force((n) => n + 1); };
  const name = (o: { en: string; es: string }) => (lang === 'en' ? o.en : o.es);

  if (err) return <div className="grid h-dvh place-items-center bg-[#10204a] p-6 text-center text-[17px] font-bold text-white">{t('This browser cannot show 3D (WebGL).', 'Este navegador no puede mostrar 3D (WebGL).')}<Link to="/games" className="mt-4 underline">{t('Back', 'Volver')}</Link></div>;

  const racing = st === 'race' || st === 'countdown';
  const solo = hud?.mode === 'time';
  const ti = hud ? trackInfo(hud.track) : TRACKS[0];
  const res = hud?.results;
  const shown = hud?.rolling ?? hud?.item ?? null;
  return (
    <div className="rc-root relative h-dvh w-full overflow-hidden select-none" onPointerDown={unlock}>
      <style>{CSS}</style>
      <div ref={host} className="absolute inset-0" />

      {/* ------------------------------------------------------------ menu */}
      {(st === 'menu' || st === 'loading') && s && (
        <div className="pointer-events-none absolute inset-0 flex flex-col p-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] sm:p-5">
          <div className="pointer-events-auto flex items-center gap-2">
            <Link to="/games" className="grid h-11 w-11 place-items-center rounded-2xl bg-[#10204a]/60 text-white hover:bg-[#10204a]/80" aria-label={t('Back', 'Volver')}><ArrowLeft /></Link>
            <div className="ml-auto flex gap-1.5">
              <GameLangToggle />
              <Toggle on={prefs.music} onClick={() => { setPref('music', !prefs.music); force((n) => n + 1); }} label={t('Music', 'Música')}><Music size={19} /></Toggle>
              <Toggle on={prefs.sfx} onClick={() => { setPref('sfx', !prefs.sfx); force((n) => n + 1); }} label={t('Sound effects', 'Efectos')}>{prefs.sfx ? <Volume2 size={19} /> : <VolumeX size={19} />}</Toggle>
            </div>
          </div>
          <div className="mt-1 flex min-h-0 flex-1 flex-col gap-2 sm:mt-2">
            <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }} className="text-center sm:text-left [@media(max-height:520px)]:hidden">
              <GameTitle word="RACERS" theme="racers" className="mx-auto block h-auto w-[230px] sm:mx-0 sm:w-[360px]" />
            </motion.div>
            <div className="pointer-events-auto rc-panel rc-scroll mt-auto flex max-h-[calc(100dvh-120px)] min-h-0 w-full max-w-[480px] flex-col gap-2.5 self-center p-3 pb-0 sm:self-start">
              {/* driver */}
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => pickToon(-1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/12 hover:bg-white/22" aria-label={t('Previous', 'Anterior')}><ChevronLeft /></button>
                <div className="min-w-0 flex-1 text-center">
                  <div className="text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{t('Your driver', 'Tu piloto')}</div>
                  <div className="flex items-center justify-center gap-2 truncate text-[20px] font-black"><Dot color={cur.color} size={14} />{cur.name}</div>
                </div>
                <button type="button" onClick={() => pickToon(1)} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/12 hover:bg-white/22" aria-label={t('Next', 'Siguiente')}><ChevronRight /></button>
              </div>
              {/* mode */}
              <Seg<Mode> value={s.mode} onChange={(m) => conf({ mode: m })} options={[
                { id: 'gp', label: t('Grand Prix', 'Gran Premio') },
                { id: 'race', label: t('Race', 'Carrera') },
                { id: 'time', label: t('Time trial', 'Contrarreloj') },
              ]} />
              {/* track(s) */}
              {s.mode === 'gp' ? (
                <div className="rounded-2xl bg-white/8 px-3 py-2">
                  <div className="flex items-center gap-2 text-[14px] font-black"><Trophy size={17} className="text-[#ffd23f]" />{t('4 tracks · points for every place', '4 pistas · puntos por puesto')}</div>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {GP_TRACKS.map((id, i) => { const tr = trackInfo(id); return <span key={id} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[12px] font-extrabold"><span className="grid h-4 w-4 place-items-center rounded-full text-[10px] text-[#10204a]" style={{ background: tr.color }}>{i + 1}</span>{name(tr.name)}</span>; })}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {TRACKS.map((tr) => (
                    <button key={tr.id} type="button" onClick={() => conf({ track: tr.id })} aria-pressed={s.track === tr.id}
                      className={cn('flex min-w-0 items-center gap-2 rounded-2xl px-2.5 py-2 text-left transition-colors', s.track === tr.id ? 'bg-white text-[#10204a]' : 'bg-white/8 hover:bg-white/14')}>
                      <span className="h-8 w-1.5 shrink-0 rounded-full" style={{ background: tr.color }} />
                      <span className="min-w-0"><span className="block truncate text-[14px] font-black">{name(tr.name)}</span><span className={cn('block truncate text-[11px] font-semibold [@media(max-height:520px)]:hidden', s.track === tr.id ? 'text-[#10204a]/60' : 'text-white/55')}>{name(tr.desc)}</span></span>
                    </button>
                  ))}
                </div>
              )}
              {/* English level and difficulty */}
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <div>
                  <div className="mb-1 px-1 text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{t('English level', 'Nivel de inglés')}</div>
                  <Seg value={s.level} onChange={(l) => conf({ level: l })} options={RUN_LEVELS.map((l) => ({ id: l.id, label: l.id }))} />
                </div>
                {s.mode !== 'time' && (
                  <div>
                    <div className="mb-1 px-1 text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{t('Rivals', 'Rivales')}</div>
                    <Seg<Difficulty> value={s.difficulty} onChange={(d) => conf({ difficulty: d })} options={[
                      { id: 'easy', label: t('Easy', 'Fácil') }, { id: 'normal', label: t('Normal', 'Normal') }, { id: 'hard', label: t('Hard', 'Difícil') },
                    ]} />
                  </div>
                )}
              </div>
              {s.mode === 'time' && hud?.record && <div className="flex items-center gap-2 px-1 text-[12.5px] font-bold text-white/75"><Trophy size={14} className="text-[#ffd23f]" />{t('Record', 'Récord')} {fmt(hud.record.total)} · {t('best lap', 'mejor vuelta')} {fmt(hud.record.lap)}</div>}
              <div className="px-1 text-[11.5px] leading-relaxed font-semibold text-white/65 [@media(max-height:520px)]:hidden">
                {touchUi
                  ? t('Green button: accelerate · arrows: steer · DRIFT: hold while turning, let go for a turbo · ITEM: use what you picked up · drive through the lane with the right answer for a big turbo.', 'Botón verde: acelerar · flechas: girar · DERRAPE: mantén mientras giras y suelta para el turbo · OBJETO: usa lo que recogiste · pasa por el carril con la respuesta correcta para un gran turbo.')
                  : t('W/↑ accelerate · S/↓ brake · A D/← → steer · Space hop & drift (hold, let go = turbo) · E/X use item · C look back · R back on track · Esc pause · drive through the lane with the right answer for a big turbo.', 'W/↑ acelerar · S/↓ frenar · A D/← → girar · Espacio saltar y derrapar (mantén, suelta = turbo) · E/X usar objeto · C mirar atrás · R volver a la pista · Esc pausa · pasa por el carril con la respuesta correcta para un gran turbo.')}
              </div>
              {/* the start button stays in view at the bottom of the panel, even when it scrolls */}
              <div className="sticky bottom-0 -mx-3 shrink-0 rounded-b-[22px] bg-[#0e1638]/95 px-3 pt-1 pb-3">
                <Btn tone="green" className="h-14 w-full text-[20px] [@media(max-height:520px)]:h-12" onClick={go} disabled={st === 'loading' || hud?.waiting}>
                  {st === 'loading' || hud?.waiting ? t('Loading…', 'Cargando…') : <><Play size={22} fill="currentColor" /> {s.mode === 'gp' ? t('START GRAND PRIX', 'EMPEZAR GRAN PREMIO') : t('RACE!', '¡A CORRER!')}</>}
                </Btn>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------ race HUD */}
      {hud && (racing || st === 'paused') && (
        <div className="pointer-events-none absolute inset-0 p-3 pt-[max(10px,env(safe-area-inset-top))] sm:p-4">
          <div className="flex items-start gap-2">
            <button type="button" onClick={() => game?.togglePause()} className="pointer-events-auto grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[#10204a]/60 text-white" aria-label={t('Pause', 'Pausa')}><Pause size={20} /></button>
            {!solo && (
              <div className="rc-panel flex items-baseline px-3 py-1">
                <span className="rc-num text-[38px] leading-none sm:text-[46px]" style={{ color: PLACE_COL[hud.place - 1] ?? '#ffffff' }}>{hud.place}</span>
                <span className="rc-num ml-0.5 text-[17px] leading-none text-white/80">{lang === 'en' ? ordinal(hud.place).replace(String(hud.place), '') : '.º'}<span className="ml-1 text-white/55">/{hud.n}</span></span>
              </div>
            )}
            <div className="rc-panel px-3 py-1.5">
              <div className="text-[11px] font-extrabold tracking-wide text-white/65 uppercase">{t('Lap', 'Vuelta')}</div>
              <div className="rc-num text-[26px] leading-none">{hud.lap}<span className="text-[16px] text-white/70">/{hud.laps}</span></div>
            </div>
            <div className="rc-panel hidden px-3 py-1.5 min-[560px]:block">
              <div className="rc-num text-[22px] leading-none">{fmt(hud.time)}</div>
              <div className="mt-0.5 text-[12px] font-bold text-white/70 tabular-nums">{t('Lap', 'Vuelta')} {fmt(hud.lapTime)}{hud.bestLap !== null && <span className="ml-2 text-[#7dff9a]">{t('Best', 'Mejor')} {fmt(hud.bestLap)}</span>}</div>
            </div>
            {/* item slot and coins */}
            {!solo && (
              <div className="mx-auto flex items-center gap-2">
                <div className={cn('relative grid h-[62px] w-[62px] place-items-center rounded-[20px] border-[3px] bg-[#10204a]/70 sm:h-[72px] sm:w-[72px]', shown ? 'border-white' : 'border-white/30')}>
                  {shown && <img src={itemIcon(shown)} alt={name(ITEMS[shown])} className={cn('h-[78%] w-[78%]', hud.rolling && 'animate-[rc-spin_.25s_linear_infinite]')} />}
                  {hud.item && hud.itemN > 1 && <span className="rc-num absolute -right-2 -bottom-2 text-[20px]">×{hud.itemN}</span>}
                  {hud.item && !touchUi && <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-md bg-white px-1.5 text-[10px] font-black text-[#10204a]">E</span>}
                </div>
                <div className="rc-panel flex items-center gap-1 px-2.5 py-1.5">
                  <Coins size={18} className="text-[#ffd23f]" />
                  <span className="rc-num text-[22px] leading-none" style={{ color: hud.coins >= 10 ? '#ffd23f' : '#fff' }}>{hud.coins}</span>
                  <span className="text-[12px] font-black text-white/55">/10</span>
                </div>
              </div>
            )}
            <div className={cn(solo && 'ml-auto')}>
              <svg viewBox="-8 -8 116 116" className="h-[88px] w-[88px] drop-shadow-[0_2px_4px_rgba(0,0,0,.35)] sm:h-[124px] sm:w-[124px]">
                <path d={hud.mapPath} fill="none" stroke="#10204a" strokeWidth={9} strokeLinejoin="round" opacity={0.75} />
                <path d={hud.mapPath} fill="none" stroke="#fff" strokeWidth={4.5} strokeLinejoin="round" />
                {hud.dots.filter((d) => !d.me).map((d, i) => <circle key={i} cx={d.x * 100} cy={d.z * 100} r={3.8} fill={d.color} stroke="#10204a" strokeWidth={1.5} />)}
                <circle cx={hud.x * 100} cy={hud.z * 100} r={6} fill={cur.color} stroke="#fff" strokeWidth={2.5} />
              </svg>
            </div>
          </div>

          {/* standings (screens tall enough) */}
          {!solo && (
            <div className="absolute top-[86px] left-3 hidden flex-col gap-1 sm:top-[96px] sm:left-4 [@media(min-height:560px)]:flex">
              {hud.standings.map((r, i) => (
                <div key={i} className={cn('flex h-[24px] w-[150px] items-center gap-1.5 rounded-lg px-1.5 text-[12.5px] font-extrabold', r.me ? 'bg-white text-[#10204a]' : 'bg-[#10204a]/55 text-white')}>
                  <span className="w-4 text-right tabular-nums">{i + 1}</span><Dot color={r.color} size={10} /><span className="truncate">{r.name}</span>
                </div>
              ))}
            </div>
          )}

          {/* the question ahead */}
          <AnimatePresence>
            {hud.q && hud.q.dist < 190 && (
              <motion.div key={hud.q.text} initial={{ y: -14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -10, opacity: 0 }}
                className="absolute top-[78px] left-1/2 w-[min(560px,calc(100%-24px))] -translate-x-1/2 sm:top-[96px] [@media(max-height:520px)]:top-[70px] [@media(max-height:520px)]:w-[min(460px,calc(100%-24px))]">
                <div className="rc-panel px-3 py-2 [@media(max-height:520px)]:py-1.5">
                  <div className="flex items-center gap-2">
                    <span className="shrink-0 rounded-md bg-[#ffd23f] px-1.5 text-[11px] font-black text-[#2a1d00] uppercase">{t('Question', 'Pregunta')}</span>
                    <span className="min-w-0 flex-1 truncate text-[15px] font-black sm:text-[17px] [@media(max-height:520px)]:text-[14px]">{hud.q.text}</span>
                    <span className="shrink-0 text-[12px] font-bold text-white/60 tabular-nums">{hud.q.dist} m</span>
                  </div>
                  <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                    {hud.q.answers.map((a, i) => (
                      <div key={i} className={cn('flex min-w-0 items-center gap-1.5 rounded-xl px-1.5 py-1 text-[13px] font-black sm:text-[14.5px] [@media(max-height:520px)]:py-0.5 [@media(max-height:520px)]:text-[12.5px]', hud.q!.lane === i ? 'bg-white text-[#10204a] ring-[3px]' : 'bg-white/10')} style={{ ['--tw-ring-color' as string]: LANE_COLORS[i] }}>
                        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full text-[11px] text-white" style={{ background: LANE_COLORS[i] }}>{LANE_LETTERS[i]}</span>
                        <span className="truncate">{a}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* speedometer */}
          <div className={cn('absolute flex flex-col', touchUi ? 'top-[max(84px,calc(env(safe-area-inset-top)+74px))] left-4 items-start [@media(min-height:560px)]:top-auto [@media(min-height:560px)]:bottom-[150px]' : 'right-5 bottom-5 items-end')}>
            <div className="rc-num text-[40px] leading-none sm:text-[54px]" style={{ color: hud.boost ? '#ffd23f' : '#fff' }}>{hud.speed}</div>
            <div className="text-[12px] font-extrabold tracking-widest text-white/80 uppercase [text-shadow:0_2px_0_#10204a]">km/h</div>
            {hud.tier > 0 && <div className="mt-1 rounded-full px-2.5 py-0.5 text-[12px] font-black" style={{ background: TIER[hud.tier], color: '#10204a' }}>TURBO {hud.tier}</div>}
            {hud.shield && <div className="mt-1 rounded-full bg-[#2fd27a] px-2.5 py-0.5 text-[12px] font-black text-[#062a15]">{t('SHIELD', 'ESCUDO')}</div>}
          </div>
          {hud.wrongWay && <div className="absolute top-[45%] left-1/2 -translate-x-1/2 animate-[rc-pulse_.7s_infinite] rounded-2xl bg-[#ff3d3d] px-5 py-2 text-[22px] font-black text-white shadow-lg">{t('WRONG WAY!', '¡SENTIDO CONTRARIO!')}</div>}
        </div>
      )}

      {/* countdown */}
      <AnimatePresence>
        {st === 'countdown' && hud && hud.count <= 3 && hud.count >= 1 && (
          <motion.div key={hud.count} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="rc-num pointer-events-none absolute top-[30%] left-1/2 -ml-[60px] w-[120px] text-center leading-none text-[#ffd23f]" style={{ fontSize: 'min(120px, 20vh)' }}>{hud.count}</motion.div>
        )}
      </AnimatePresence>
      {st === 'countdown' && hud && hud.count === 4 && (
        <div className="pointer-events-none absolute top-[30%] left-1/2 -translate-x-1/2 text-center">
          <div className="rc-num text-[34px] whitespace-nowrap sm:text-[48px]" style={{ color: ti.color }}>{name(ti.name)}</div>
          {hud.mode === 'gp' && <div className="rc-num text-[18px] text-white">{t('Race', 'Carrera')} {hud.gpRace + 1}/4</div>}
        </div>
      )}

      {/* toasts */}
      <div className="pointer-events-none absolute top-[36%] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
        <AnimatePresence>
          {toasts.map((x) => (
            <motion.div key={x.id} initial={{ scale: 0.4, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="text-center">
              <div className="rc-num text-[32px] whitespace-nowrap sm:text-[42px]" style={{ color: x.color }}>{x.text}</div>
              {x.sub && <div className="text-[14px] font-extrabold text-white [text-shadow:0_2px_0_#10204a]">{x.sub}</div>}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* touch controls (accelerate with a button) */}
      {touchUi && racing && (
        <>
          <div className="absolute bottom-[max(18px,env(safe-area-inset-bottom))] left-4 flex gap-3">
            <Pad k="left" game={game} label={t('Left', 'Izquierda')} className="h-[84px] w-[84px] bg-[#10204a]/55"><ChevronLeft size={46} /></Pad>
            <Pad k="right" game={game} label={t('Right', 'Derecha')} className="h-[84px] w-[84px] bg-[#10204a]/55"><ChevronRight size={46} /></Pad>
          </div>
          <div className="absolute right-4 bottom-[max(18px,env(safe-area-inset-bottom))] flex items-end gap-3">
            <div className="flex flex-col items-center gap-2.5">
              {!solo && <Pad k="item" game={game} label={t('Use item', 'Usar objeto')} className={cn('h-[60px] w-[60px] text-[10.5px]', hud?.item ? 'bg-[#7a5cff]/90' : 'bg-[#10204a]/50 opacity-70')}>{hud?.item ? <img src={itemIcon(hud.item)} alt="" className="h-9 w-9" /> : t('ITEM', 'OBJETO')}</Pad>}
              <Pad k="drift" game={game} label={t('Drift', 'Derrape')} className="h-[70px] w-[70px] bg-[#ff8a1f]/85 text-[12px]">{t('DRIFT', 'DERRAPE')}</Pad>
              <Pad k="brake" game={game} label={t('Brake', 'Frenar')} className="h-[50px] w-[50px] bg-[#ff4757]/80 text-[10.5px]">{t('BRAKE', 'FRENO')}</Pad>
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
            <Btn tone="white" onClick={() => game?.restart()}><RotateCcw size={20} /> {hud?.mode === 'gp' ? t('Restart Grand Prix', 'Reiniciar Gran Premio') : t('Restart race', 'Reiniciar carrera')}</Btn>
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
      {st === 'finish' && hud && res && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.1 }} className="absolute inset-x-0 bottom-0 flex justify-center p-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:top-0 sm:items-center sm:justify-end sm:p-5">
          <div className="rc-panel rc-scroll flex max-h-[calc(100dvh-24px)] w-full max-w-[420px] flex-col p-4">
            {solo ? (
              <>
                <div className="rc-num text-center text-[34px] text-[#ffd23f]">{t('FINISH!', '¡META!')}</div>
                <div className="text-center text-[13px] font-bold text-white/70 uppercase">{t('Total time', 'Tiempo total')}</div>
                <div className="rc-num text-center text-[40px] leading-none">{fmt(res.total)}</div>
                {res.newBestTotal && <div className="mt-1 text-center text-[14px] font-black text-[#7dff9a]">{t('New record!', '¡Nuevo récord!')}</div>}
                <div className="mt-3 flex flex-col gap-1">
                  {res.laps.map((l, i) => (
                    <div key={i} className={cn('flex items-center justify-between rounded-xl px-3 py-1.5 text-[15px] font-bold tabular-nums', l === res.best ? 'bg-[#2fd27a]/25 text-[#b7ffcf]' : 'bg-white/8')}>
                      <span>{t('Lap', 'Vuelta')} {i + 1}</span><span>{fmt(l)}{l === res.best && ' ★'}</span>
                    </div>
                  ))}
                </div>
                {hud.record && <div className="mt-2 text-center text-[12.5px] font-semibold text-white/65">{t('Record', 'Récord')}: {fmt(hud.record.total)} · {t('best lap', 'mejor vuelta')} {fmt(hud.record.lap)}</div>}
              </>
            ) : (
              <>
                <div className="flex items-end justify-center gap-2">
                  <span className="rc-num text-[54px] leading-none" style={{ color: PLACE_COL[res.place - 1] ?? '#fff' }}>{ordinal(res.place)}</span>
                  <span className="rc-num mb-1 text-[20px] text-white/80">{fmt(res.total)}</span>
                </div>
                <div className="text-center text-[12.5px] font-bold text-white/65">{name(ti.name)}{hud.mode === 'gp' && ` · ${t('Race', 'Carrera')} ${res.gpRace + 1}/4`}</div>
                <div className="mt-2.5 flex flex-col gap-0.5">
                  {res.rows.map((r) => (
                    <div key={r.place} className={cn('flex items-center gap-2 rounded-lg px-2 py-1 text-[13.5px] font-bold', r.me ? 'bg-white text-[#10204a]' : 'bg-white/6')}>
                      <span className="w-5 text-right font-black tabular-nums">{r.place}</span><Dot color={r.color} size={11} />
                      <span className="min-w-0 flex-1 truncate">{r.name}</span>
                      <span className="tabular-nums opacity-80">{res.final || (r.time !== null && r.place <= res.place) ? (r.time !== null ? fmt(r.time) : '—') : '…'}</span>
                      {hud.mode === 'gp' && res.final && <span className="w-[64px] text-right tabular-nums"><span className="text-[#2fd27a]">+{r.points}</span> <b>{r.total}</b></span>}
                    </div>
                  ))}
                </div>
                {!res.final && (
                  <div className="mt-1.5 flex items-center justify-center gap-2 text-[12px] font-semibold text-white/60">
                    {t('Waiting for the others…', 'Esperando a los demás…')}
                    <button type="button" onClick={() => game?.skipWait()} className="rounded-lg bg-white/14 px-2.5 py-1 font-black text-white hover:bg-white/22">{t('Skip', 'Saltar')}</button>
                  </div>
                )}
              </>
            )}
            {/* the questions of this race */}
            {res.review.length > 0 && (
              <div className="mt-2.5">
                <button type="button" onClick={() => setShowReview((v) => !v)} className="flex w-full items-center justify-between rounded-xl bg-white/8 px-3 py-2 text-[13.5px] font-black">
                  <span>{t('Questions', 'Preguntas')}: <span className="text-[#7dff9a]">{res.right} ✓</span> · <span className="text-[#ff8a8a]">{res.wrong} ✗</span></span>
                  <span className="text-white/60">{showReview ? t('Hide', 'Ocultar') : t('Review', 'Repasar')}</span>
                </button>
                {showReview && (
                  <div className="mt-1 flex flex-col gap-1">
                    {res.review.map((r, i) => (
                      <div key={i} className="rounded-xl bg-white/6 px-2.5 py-1.5 text-[12.5px] font-semibold">
                        <div className="flex items-start gap-1.5 font-black">{r.ok ? <Check size={15} className="mt-0.5 shrink-0 text-[#7dff9a]" /> : <X size={15} className="mt-0.5 shrink-0 text-[#ff8a8a]" />}{r.q}</div>
                        <div className="pl-5 text-white/75">{r.ok ? r.a : <>{t('You', 'Tú')}: <s>{r.picked}</s> · {t('Answer', 'Respuesta')}: <b className="text-[#7dff9a]">{r.a}</b></>}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              {hud.mode === 'gp' ? (
                <Btn tone="green" className="flex-1" disabled={!res.final} onClick={() => game?.nextRace()}>{res.gpOver ? <><Trophy size={19} /> {t('Podium', 'Podio')}</> : <><Flag size={19} /> {t('Next race', 'Siguiente carrera')}</>}</Btn>
              ) : (
                <Btn tone="green" className="flex-1" onClick={() => game?.restart()}><RotateCcw size={19} /> {t('Again', 'Otra vez')}</Btn>
              )}
              <Btn tone="ghost" onClick={() => game?.toMenu()}><Home size={19} /> {t('Menu', 'Menú')}</Btn>
            </div>
          </div>
        </motion.div>
      )}

      {/* podium */}
      {st === 'podium' && hud && (
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="absolute inset-x-0 bottom-0 flex justify-center p-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:top-0 sm:left-auto sm:items-center sm:p-5">
          <div className="rc-panel rc-scroll max-h-[48dvh] w-full max-w-[460px] p-4 sm:max-h-[calc(100dvh-24px)] sm:w-[360px]">
            <div className="rc-num text-center text-[26px] text-[#ffd23f] sm:text-[34px]">{t('GRAND PRIX COMPLETE!', '¡GRAN PREMIO TERMINADO!')}</div>
            <div className="mt-2 flex flex-col gap-0.5">
              {hud.standings.map((r, i) => (
                <div key={i} className={cn('flex items-center gap-2 rounded-lg px-2 py-1 text-[14px] font-bold', r.me ? 'bg-white text-[#10204a]' : 'bg-white/6')}>
                  <span className="w-5 text-right font-black tabular-nums" style={{ color: r.me ? undefined : PLACE_COL[i] }}>{i + 1}</span><Dot color={r.color} size={11} />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span><b className="tabular-nums">{r.points} {t('pts', 'pts')}</b>
                </div>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              <Btn tone="green" className="flex-1" onClick={() => game?.restart()}><RotateCcw size={19} /> {t('New Grand Prix', 'Nuevo Gran Premio')}</Btn>
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
