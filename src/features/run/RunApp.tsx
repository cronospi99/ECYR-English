/* English Run (route /run): 3D endless runner with the teachers' 3D models. Menu (teacher + level),
   HUD (score, multiplier, coins, power-ups, the question of the next word gate), pause, revive by
   answering a question, and a results card with every answer to review. */
import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Coins, Home, Music, Pause, Play, RotateCcw, Trophy, Volume2, VolumeX, MessageCircle, X, Check } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TOONS } from '@/features/toons3d/runtime';
import { RunGame, type Hud, type Toast } from './engine';
import { POWER_COLORS, type PowerKind } from './gfx';
import { prefs, setPref, unlock } from './audio';
import { RUN_LEVELS, type RunLevel } from './questions';
import { THEME_LIST, THEMES, type ThemeId } from './themes';

const CSS = `
.er-root{font-family:Inter,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;color:#fff;background:#d9ecff}
.er-logo{font-weight:900;font-style:italic;letter-spacing:-.03em;line-height:.86;color:#ffd23f;-webkit-text-stroke:3px #10204a;paint-order:stroke fill;
  text-shadow:0 5px 0 #10204a,0 9px 0 rgba(16,32,74,.35)}
.er-num{font-weight:900;font-variant-numeric:tabular-nums;-webkit-text-stroke:2.5px #10204a;paint-order:stroke fill;text-shadow:0 3px 0 #10204a}
.er-panel{border-radius:22px;background:rgba(14,22,56,.78);backdrop-filter:blur(8px);box-shadow:0 10px 30px rgba(0,0,0,.25),inset 0 0 0 1.5px rgba(255,255,255,.12)}
.er-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:18px;font-weight:900;transition:transform .08s}
.er-btn:active{transform:translateY(3px) scale(.99)}
@keyframes er-lines{from{background-position:0 0}to{background-position:0 400px}}
.er-speed{background:repeating-conic-gradient(from 0deg at 50% 45%,rgba(255,255,255,.0) 0deg,rgba(255,255,255,.0) 5deg,rgba(255,255,255,.55) 5.4deg,rgba(255,255,255,0) 6deg);
  -webkit-mask:radial-gradient(ellipse at 50% 45%,transparent 38%,#000 75%);mask:radial-gradient(ellipse at 50% 45%,transparent 38%,#000 75%)}
@keyframes er-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
`;

const POWER_ES: Record<PowerKind, [string, string]> = { magnet: ['Imán', 'M'], double: ['x2', '2'], shield: ['Escudo', 'S'], jump: ['Súper salto', 'J'] };

const initialToon = () => { try { const v = localStorage.getItem('run:toon'); if (v && TOONS.some((t) => t.id === v)) return v; } catch { /* ignore */ } return TOONS[Math.floor(Math.random() * TOONS.length)].id; };
const initialTheme = (): ThemeId => { try { const v = localStorage.getItem('run:theme'); if (v && v in THEMES) return v as ThemeId; } catch { /* ignore */ } return 'city'; };
const THEME_BG: Record<ThemeId, string> = {
  city: 'linear-gradient(160deg,#5aa7ff,#e4f2ff 70%,#c4553f)',
  beach: 'linear-gradient(170deg,#1f8ef0,#bff0ff 55%,#19aec4 56%,#f2dfae)',
  roofs: 'linear-gradient(170deg,#2c3e8f,#f2885b 55%,#ffd59e 70%,#6a6f78)',
  neon: 'linear-gradient(170deg,#07031c,#2b0b52 50%,#ff4f8b 72%,#1a1236)',
};
const initialLevel = (): RunLevel => { try { const v = localStorage.getItem('run:level'); if (v && RUN_LEVELS.some((l) => l.id === v)) return v as RunLevel; } catch { /* ignore */ } return 'A1'; };

function Btn({ tone = 'yellow', className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'yellow' | 'green' | 'white' | 'ghost' | 'red' }) {
  const tones = {
    yellow: 'bg-[#ffd23f] text-[#2a1d00] shadow-[0_5px_0_#c79a00]',
    green: 'bg-[#2fd27a] text-[#062a15] shadow-[0_5px_0_#16924d]',
    white: 'bg-white text-[#10204a] shadow-[0_5px_0_#b9c6e6]',
    red: 'bg-[#ff4757] text-white shadow-[0_5px_0_#b8232f]',
    ghost: 'bg-white/14 text-white hover:bg-white/22',
  };
  return <button type="button" {...rest} className={cn('er-btn h-12 px-5 text-[16px]', tones[tone], className)}>{children}</button>;
}

function Toggle({ on, onClick, label, children }: { on: boolean; onClick: () => void; label: string; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} aria-label={label} title={label} aria-pressed={on} className={cn('grid h-11 w-11 place-items-center rounded-2xl transition-colors', on ? 'bg-white text-[#10204a]' : 'bg-[#10204a]/55 text-white/60')}>{children}</button>;
}

export default function RunApp() {
  const host = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<RunGame | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toon, setToon] = useState(initialToon);
  const [level, setLevel] = useState<RunLevel>(initialLevel);
  const [theme, setTheme] = useState<ThemeId>(initialTheme);
  const [, force] = useState(0);
  const [err, setErr] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready')));
    const prev = document.title;
    document.title = 'English Run · ECYR English';
    let g: RunGame | null = null;
    try {
      g = new RunGame(host.current!, { toon, level, theme });
      g.onHud = setHud;
      g.onToast = (t) => { setToasts((a) => [...a.slice(-2), t]); setTimeout(() => setToasts((a) => a.filter((x) => x.id !== t.id)), 1900); };
      setGame(g);
      if (import.meta.env.DEV) (window as unknown as { __run: unknown }).__run = g;
    } catch { setErr(true); }
    return () => { document.title = prev; g?.dispose(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const st = hud?.state ?? 'loading';
  const idx = TOONS.findIndex((t) => t.id === toon);
  const cur = TOONS[idx] ?? TOONS[0];
  const pickToon = (d: number) => { const n = TOONS[(idx + d + TOONS.length) % TOONS.length]; setToon(n.id); void game?.setToon(n.id); };
  const run = () => { unlock(); game?.setLevel(level); game?.start(); };

  if (err) return <div className="grid h-dvh place-items-center bg-[#10204a] p-6 text-center text-[17px] font-bold text-white">Este navegador no puede mostrar 3D (WebGL).<Link to="/games" className="mt-4 underline">Volver</Link></div>;

  const speedK = hud && (st === 'run' || st === 'intro') ? Math.max(0, Math.min(1, (hud.speed - 16) / 9)) : 0;
  return (
    <div className="er-root relative h-dvh w-full overflow-hidden select-none" onPointerDown={unlock}>
      <style>{CSS}</style>
      <div ref={host} className="absolute inset-0" />
      {speedK > 0 && <div className="er-speed pointer-events-none absolute inset-0" style={{ opacity: speedK * 0.35 }} />}

      {/* ------------------------------------------------------------ menu */}
      {(st === 'menu' || st === 'loading') && (
        <div className="pointer-events-none absolute inset-0 flex flex-col p-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(14px,env(safe-area-inset-bottom))] sm:p-5">
          <div className="pointer-events-auto flex items-center gap-2">
            <Link to="/games" className="grid h-11 w-11 place-items-center rounded-2xl bg-[#10204a]/60 text-white hover:bg-[#10204a]/80" aria-label="Volver"><ArrowLeft /></Link>
            <div className="ml-auto flex gap-1.5">
              <Toggle on={prefs.music} onClick={() => { setPref('music', !prefs.music); force((n) => n + 1); }} label="Música"><Music size={19} /></Toggle>
              <Toggle on={prefs.sfx} onClick={() => { setPref('sfx', !prefs.sfx); force((n) => n + 1); }} label="Efectos">{prefs.sfx ? <Volume2 size={19} /> : <VolumeX size={19} />}</Toggle>
              <Toggle on={prefs.voice} onClick={() => { setPref('voice', !prefs.voice); force((n) => n + 1); }} label="Voz en inglés"><MessageCircle size={19} /></Toggle>
            </div>
          </div>
          <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 200, damping: 16 }} className="mt-2 text-center sm:mt-4 sm:text-left">
            <div className="er-logo text-[58px] sm:text-[92px]">ENGLISH<br />RUN</div>
          </motion.div>
          <div className="mt-auto flex flex-col items-center gap-3 sm:items-start">
            <div className="pointer-events-auto er-panel flex w-full max-w-[460px] flex-col gap-3 p-3">
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => pickToon(-1)} className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12 hover:bg-white/22" aria-label="Anterior"><ChevronLeft /></button>
                <div className="min-w-0 flex-1 text-center">
                  <div className="text-[12px] font-extrabold tracking-wide text-white/60 uppercase">Corredor</div>
                  <div className="flex items-center justify-center gap-2 truncate text-[22px] font-black"><span className="h-3.5 w-3.5 shrink-0 rounded-full border border-black/30" style={{ background: cur.color }} />{cur.name}</div>
                </div>
                <button type="button" onClick={() => pickToon(1)} className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12 hover:bg-white/22" aria-label="Siguiente"><ChevronRight /></button>
              </div>
              <div>
                <div className="mb-1 text-[12px] font-extrabold tracking-wide text-white/60 uppercase">Escenario</div>
                <div className="grid grid-cols-4 gap-1.5">
                  {THEME_LIST.map((th) => (
                    <button key={th.id} type="button" onClick={() => { setTheme(th.id); game?.setTheme(th.id); }} aria-pressed={theme === th.id}
                      className={cn('flex h-[54px] items-end justify-center rounded-xl pb-1 text-[12.5px] font-black shadow-[inset_0_-22px_14px_-10px_rgba(0,0,0,.55)] transition-transform', theme === th.id ? 'scale-[1.04] ring-3 ring-[#ffd23f]' : 'opacity-85 hover:opacity-100')}
                      style={{ background: THEME_BG[th.id] }}>{th.name}</button>
                  ))}
                </div>
              </div>
              <div>
                <div className="mb-1 text-[12px] font-extrabold tracking-wide text-white/60 uppercase">Nivel de las preguntas</div>
                <div className="flex gap-1.5">
                  {RUN_LEVELS.map((l) => (
                    <button key={l.id} type="button" onClick={() => setLevel(l.id)} className={cn('h-10 flex-1 rounded-xl text-[14px] font-black', level === l.id ? 'bg-[#ffd23f] text-[#2a1d00]' : 'bg-white/10 hover:bg-white/18')}>{l.label}</button>
                  ))}
                </div>
              </div>
              <Btn tone="green" className="h-16 w-full text-[26px]" disabled={st === 'loading'} onClick={run}>
                {st === 'loading' ? 'Cargando…' : <><Play size={26} fill="currentColor" /> ¡CORRER!</>}
              </Btn>
              <div className="flex items-center justify-between text-[14px] font-extrabold text-white/85">
                <span className="flex items-center gap-1.5"><Trophy size={16} className="text-[#ffd23f]" /> Récord {(hud?.best ?? 0).toLocaleString('es-CO')}</span>
                <span className="flex items-center gap-1.5"><Coins size={16} className="text-[#ffd23f]" /> {(game?.totalCoins ?? 0).toLocaleString('es-CO')}</span>
              </div>
            </div>
            <div className="er-panel pointer-events-auto max-w-[460px] px-3 py-2 text-[13px] font-semibold text-white/85">
              <b>Cómo se juega:</b> desliza (o usa las flechas) ← → para cambiar de carril, ↑ para saltar, ↓ para deslizarte. Pasa por la respuesta correcta de cada puerta para subir el multiplicador. Sube a los buses por las rampas.
            </div>
          </div>
        </div>
      )}

      {/* ------------------------------------------------------------- HUD */}
      {hud && (st === 'run' || st === 'intro' || st === 'dead' || st === 'paused' || st === 'revive') && (
        <div className="pointer-events-none absolute inset-0 p-3 pt-[max(10px,env(safe-area-inset-top))] sm:p-4">
          <div className="flex items-start gap-2">
            <div>
              <div className="er-num text-[34px] leading-none sm:text-[44px]">{hud.score.toLocaleString('es-CO')}</div>
              <div className="mt-1 flex items-center gap-1.5">
                <motion.span key={hud.mult} initial={{ scale: 1.6 }} animate={{ scale: 1 }} className={cn('rounded-xl px-2.5 py-0.5 text-[17px] font-black shadow-[0_3px_0_rgba(0,0,0,.25)]', hud.mult > 1 ? 'bg-[#ffd23f] text-[#2a1d00]' : 'bg-white/80 text-[#10204a]')}>x{hud.mult}</motion.span>
                <span className="rounded-xl bg-[#10204a]/55 px-2 py-0.5 text-[13px] font-extrabold">{hud.dist} m</span>
              </div>
            </div>
            <div className="ml-auto flex items-start gap-2">
              <div className="flex items-center gap-1.5 rounded-2xl bg-[#10204a]/60 py-1 pr-3 pl-1.5">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-[#ffc531] text-[#7a4b00] shadow-[inset_0_-3px_0_#e09a00]"><Coins size={17} /></span>
                <span className="er-num text-[24px] leading-none">{hud.coins}</span>
              </div>
              {(st === 'run' || st === 'paused') && <button type="button" onClick={() => game?.togglePause()} className="pointer-events-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#10204a]/60 hover:bg-[#10204a]/80" aria-label="Pausa"><Pause size={20} fill="currentColor" /></button>}
            </div>
          </div>

          {/* word gate question */}
          <AnimatePresence>
            {hud.gate && st === 'run' && (
              <motion.div key={hud.gate.q} initial={{ y: -30, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} exit={{ y: -20, opacity: 0 }}
                className="mx-auto mt-2 w-full max-w-[560px] rounded-[22px] bg-white/95 p-2 text-center text-[#10204a] shadow-[0_8px_0_rgba(16,32,74,.35)]">
                <div className="text-[12px] font-extrabold tracking-wide text-[#00897b] uppercase">Corre por la respuesta correcta · {Math.max(0, Math.round(hud.gate.dist))} m</div>
                <div className="text-[21px] leading-tight font-black sm:text-[25px]">{hud.gate.q}</div>
                <div className="mt-1.5 grid grid-cols-3 gap-1.5">
                  {hud.gate.opts.map((o, i) => (
                    <div key={i} className={cn('flex min-h-[44px] items-center justify-center gap-1 rounded-xl px-1.5 py-1 text-[14px] leading-tight font-black sm:text-[16px]', hud.gate!.lane === i ? 'bg-[#ffd23f] ring-2 ring-[#10204a]' : 'bg-[#eef2fb]')}>
                      {i === 0 && <ArrowLeft size={14} className="shrink-0" />}<span className="min-w-0 break-words">{o}</span>{i === 2 && <ArrowRight size={14} className="shrink-0" />}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* toasts */}
          <div className="absolute inset-x-0 top-[38%] flex flex-col items-center gap-2 px-4">
            <AnimatePresence>
              {toasts.map((t) => (
                <motion.div key={t.id} initial={{ scale: 0.5, opacity: 0, y: 10 }} animate={{ scale: 1, opacity: 1, y: 0 }} exit={{ opacity: 0, y: -16 }} transition={{ type: 'spring', stiffness: 420, damping: 20 }}
                  className={cn('rounded-2xl px-4 py-2 text-center text-[20px] font-black shadow-[0_5px_0_rgba(0,0,0,.25)] sm:text-[24px]', t.tone === 'good' ? 'bg-[#2fd27a] text-[#062a15]' : t.tone === 'bad' ? 'bg-[#ff4757] text-white' : 'bg-white text-[#10204a]')}>
                  {t.text}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>

          {/* power-ups */}
          <div className="absolute bottom-[max(14px,env(safe-area-inset-bottom))] left-3 flex gap-2">
            {hud.powers.map((p) => {
              const k = p.left / p.total;
              return (
                <div key={p.kind} className="relative grid h-14 w-14 place-items-center" title={POWER_ES[p.kind][0]}>
                  <svg viewBox="0 0 56 56" className="absolute inset-0 -rotate-90"><circle cx="28" cy="28" r="24" fill="rgba(16,32,74,.6)" stroke="rgba(255,255,255,.25)" strokeWidth="5" /><circle cx="28" cy="28" r="24" fill="none" stroke={POWER_COLORS[p.kind]} strokeWidth="5" strokeDasharray={`${k * 150.8} 150.8`} strokeLinecap="round" /></svg>
                  <span className="relative text-[12px] font-black">{POWER_ES[p.kind][0]}</span>
                </div>
              );
            })}
          </div>
          {hud.chasing && st === 'run' && <div className="absolute right-3 bottom-[max(14px,env(safe-area-inset-bottom))] rounded-2xl bg-[#ff4757] px-3 py-1.5 text-[14px] font-black" style={{ animation: 'er-pulse .6s infinite' }}>¡Cuidado! Otro tropiezo y te atrapan</div>}
        </div>
      )}

      {/* ----------------------------------------------------------- pause */}
      {st === 'paused' && (
        <div className="absolute inset-0 grid place-items-center bg-[#10204a]/55 p-4 backdrop-blur-sm">
          <div className="er-panel flex w-full max-w-[340px] flex-col items-center gap-3 p-5">
            <div className="er-logo text-[44px]">PAUSA</div>
            <Btn tone="green" className="h-14 w-full text-[20px]" onClick={() => game?.togglePause()}><Play size={20} fill="currentColor" /> Seguir</Btn>
            <Btn tone="ghost" className="w-full" onClick={() => game?.toMenu()}><Home size={18} /> Menú</Btn>
          </div>
        </div>
      )}

      {/* ---------------------------------------------------------- revive */}
      {st === 'revive' && hud?.revive && <Revive hud={hud} onAnswer={(i) => game?.answerRevive(i)} />}

      {/* -------------------------------------------------------- game over */}
      {st === 'over' && hud && (
        <div className="absolute inset-0 flex items-end justify-center overflow-y-auto bg-gradient-to-t from-[#10204a]/85 via-[#10204a]/35 to-transparent p-3 pb-[max(14px,env(safe-area-inset-bottom))] sm:items-center sm:justify-end sm:p-6">
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="er-panel flex w-full max-w-[440px] flex-col gap-3 p-4">
            {hud.newBest && <motion.div initial={{ scale: 0.3, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 12 }} className="self-center rounded-2xl bg-[#ffd23f] px-4 py-1 text-[20px] font-black text-[#2a1d00]">¡NUEVO RÉCORD!</motion.div>}
            <div className="text-center">
              <div className="text-[13px] font-extrabold tracking-wide text-white/60 uppercase">Puntaje</div>
              <div className="er-num text-[54px] leading-none">{hud.score.toLocaleString('es-CO')}</div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat label="Récord" value={hud.best.toLocaleString('es-CO')} />
              <Stat label="Monedas" value={String(hud.coins)} />
              <Stat label="Distancia" value={`${hud.dist} m`} />
            </div>
            {hud.answers.length > 0 && (
              <div>
                <div className="mb-1 text-[13px] font-extrabold tracking-wide text-white/60 uppercase">Tus respuestas ({hud.answers.filter((a) => a.ok).length}/{hud.answers.length})</div>
                <div className="flex max-h-[30vh] flex-col gap-1 overflow-y-auto">
                  {hud.answers.map((a, i) => (
                    <div key={i} className={cn('flex items-center gap-2 rounded-xl px-2 py-1.5 text-[14px]', a.ok ? 'bg-[#2fd27a]/20' : 'bg-[#ff4757]/20')}>
                      {a.ok ? <Check size={16} className="shrink-0 text-[#2fd27a]" /> : <X size={16} className="shrink-0 text-[#ff8a95]" />}
                      <span className="min-w-0 flex-1 font-bold">{a.q}</span>
                      <span className="font-black text-[#ffd23f]">{a.a}</span>
                      {!a.ok && a.chosen !== '—' && <span className="text-white/55 line-through">{a.chosen}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-2">
              <Btn tone="ghost" onClick={() => game?.toMenu()}><Home size={18} /> Menú</Btn>
              <Btn tone="green" onClick={() => { unlock(); game?.start(); }}><RotateCcw size={18} /> Otra vez</Btn>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl bg-white/10 py-2"><div className="text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{label}</div><div className="text-[19px] font-black tabular-nums">{value}</div></div>;
}

function Revive({ hud, onAnswer }: { hud: Hud; onAnswer: (i: number) => void }) {
  const r = hud.revive!;
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 100); return () => clearInterval(i); }, []);
  const left = Math.max(0, r.endsAt - now);
  return (
    <div className="absolute inset-0 grid place-items-center bg-[#10204a]/60 p-4 backdrop-blur-sm">
      <motion.div initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="er-panel flex w-full max-w-[480px] flex-col gap-3 p-4 text-center">
        <div className="er-logo text-[34px]">¡SIGUE CORRIENDO!</div>
        <div className="text-[14px] font-bold text-white/75">Responde bien para revivir ({hud.revivesLeft} {hud.revivesLeft === 1 ? 'oportunidad' : 'oportunidades'})</div>
        <div className="rounded-2xl bg-white px-3 py-3 text-[24px] font-black text-[#10204a]">{r.q}</div>
        <div className="grid gap-2">
          {r.opts.map((o, i) => <Btn key={i} tone="white" className="h-14 text-[19px]" onClick={() => onAnswer(i)}>{o}</Btn>)}
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full bg-[#ffd23f] transition-[width] duration-100 ease-linear" style={{ width: `${(left / 10000) * 100}%` }} /></div>
      </motion.div>
    </div>
  );
}
