/* Class Wars — live classroom battle game (route /classwars/*, full screen, no app shell).
   Nested routes: home, teacher setup/host, join/play, solo demo vs bots, question-set editor. */
import { useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, ChevronRight, Gamepad2, Link2, ListChecks, Music, Play } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/auth';
import { TEACHERS } from '@/features/cards/teachers';
import { CW_CSS, GameIcon, Toon } from './ui/kit';
import { isMusicOn, playMusic, setMusicOn, sfx, stopMusic, unlockAudio } from './render/audio';
import { HostApp } from './ui/Host';
import { JoinScreen, PlayScreen } from './ui/Player';
import { DemoScreen } from './ui/Demo';
import { EditorScreen } from './ui/Editor';
import { POWERS } from './game/defs';

export default function ClassWarsApp() {
  useEffect(() => {
    // No app shell here: tell the boot intro (index.html) that the page is up.
    requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready')));
    const prev = document.title;
    document.title = 'Class Wars · ECYR English';
    playMusic(0);
    const unlock = () => unlockAudio();
    window.addEventListener('pointerdown', unlock, { once: true });
    return () => { document.title = prev; stopMusic(); window.removeEventListener('pointerdown', unlock); };
  }, []);
  return (
    <div className="cw-root relative h-dvh w-full overflow-hidden">
      <style>{CW_CSS}</style>
      <Routes>
        <Route index element={<Home />} />
        <Route path="crear" element={<HostApp />} />
        <Route path="unirme" element={<JoinScreen />} />
        <Route path="join/:code" element={<JoinScreen />} />
        <Route path="play/:code" element={<PlayScreen />} />
        <Route path="demo" element={<DemoScreen />} />
        <Route path="preguntas" element={<EditorScreen />} />
        <Route path="*" element={<Home />} />
      </Routes>
    </div>
  );
}

function Home() {
  const profile = useAuth((s) => s.profile);
  const teacher = profile?.role === 'teacher';
  const nav = useNavigate();
  const [code, setCode] = useState('');
  const [parade] = useState(() => [...TEACHERS.keys()].sort(() => Math.random() - 0.5).slice(0, 9));
  const join = () => code.length >= 4 && nav(`/classwars/join/${code}`);
  return (
    <div className="relative h-full overflow-hidden">
      {/* the arena (castle stands, banners, chests) */}
      <div className="cw-arena pointer-events-none absolute inset-0" aria-hidden />
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {SPARKS.map(([l, t, d, s], i) => <span key={i} className="cw-spark" style={{ left: `${l}%`, top: `${t}%`, animationDelay: `${d}s`, fontSize: s }}>✦</span>)}
      </div>

      <div className="cw-scroll absolute inset-0 overflow-x-hidden overflow-y-auto">
      <div className="relative z-10 mx-auto flex min-h-full max-w-[1000px] flex-col px-3 pt-[max(12px,env(safe-area-inset-top))] sm:px-4">
        <div className="flex items-center justify-between">
          <Link to="/" className="flex w-max items-center gap-1.5 rounded-full border border-white/20 bg-[#0b1a6b]/60 px-3 py-1.5 text-[13px] font-bold text-white/90 backdrop-blur hover:bg-[#0b1a6b]/80"><ArrowLeft size={15} /> ECYR English</Link>
          <MusicToggle />
        </div>

        <motion.div initial={{ y: -40, opacity: 0, scale: 0.9 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 16 }} className="mx-auto mt-1 w-full max-w-[760px] sm:mt-0">
          <h1 className="relative z-10">
            <img src="/classwars/logo.webp" alt="ECYR English presenta Class Wars" width={1112} height={358} className="cw-logo block h-auto w-full select-none" draggable={false} />
          </h1>
          <p className="cw-bubble relative mx-auto -mt-[5.5%] w-[min(96%,max(54%,330px))] px-4 pt-[max(14px,2.6%)] pb-3 text-center text-[clamp(13.5px,1.9vw,17px)] leading-snug font-bold text-white">
            Responde en inglés para <b className="text-[#5ff3ff]">recargar energía</b>, abre <b className="text-[#ffe14d]">cajas sorpresa</b> para ganar <b className="text-[#5ff3ff]">diamantes</b>, usa el <b className="text-[#d58cff]">poder de tu profe favorito</b>… ¡y <b className="text-[#ff5c8a]">roba los diamantes de tus rivales!</b>
          </p>
        </motion.div>

        <motion.div initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.15, type: 'spring', stiffness: 240, damping: 20 }} className="mx-auto mt-5 grid w-full max-w-[640px] grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="cw-joinbox flex flex-col gap-2 rounded-[24px] p-3 sm:col-span-2 sm:flex-row sm:items-center sm:gap-3 sm:p-3.5">
            <div className="flex items-center gap-2 pl-1 text-[14px] leading-tight font-extrabold text-white/95"><Link2 size={19} className="shrink-0" /> <span>Unirme con<br className="hidden sm:block" /> código</span></div>
            <div className="flex flex-1 gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} onKeyDown={(e) => e.key === 'Enter' && join()} placeholder="CÓDIGO" aria-label="Código de la partida"
                className="h-12 min-w-0 flex-1 rounded-2xl bg-white px-4 text-center text-[22px] font-black tracking-[0.2em] text-[#1b2350] shadow-[inset_0_3px_0_rgba(0,0,0,.08)] outline-none placeholder:text-[#1b2350]/30 focus:ring-4 focus:ring-[#ffd23f]/60" />
              <button type="button" disabled={code.length < 4} onClick={() => { unlockAudio(); sfx.click(); join(); }} className="cw-gbtn cw-gbtn-yellow h-12 rounded-2xl px-6 text-[18px] text-[#3a2600] disabled:cursor-not-allowed disabled:opacity-85">Entrar</button>
            </div>
          </div>
          {teacher && (
            <>
              <BigBtn tone="green" icon={<Gamepad2 size={26} />} onClick={() => nav('/classwars/crear')}>Crear partida</BigBtn>
              <BigBtn tone="purple" icon={<ListChecks size={26} />} onClick={() => nav('/classwars/preguntas')}>Mis preguntas</BigBtn>
            </>
          )}
          <BigBtn tone="glass" icon={<Play size={22} />} className="sm:col-span-2" onClick={() => nav('/classwars/demo')}>Probar demo contra bots</BigBtn>
        </motion.div>

        <div className="mt-auto flex items-end justify-center gap-0 overflow-hidden pt-6 sm:gap-2">
          {parade.map((ci, i) => (
            <motion.div key={ci} initial={{ y: 140 }} animate={{ y: 0 }} transition={{ delay: 0.25 + i * 0.06, type: 'spring', stiffness: 220, damping: 16 }} className="group relative flex flex-col items-center">
              <div className="cw-bob" style={{ animationDelay: `${i * 0.18}s` }}><Toon ci={ci} size={i === 4 ? 92 : 70} flip={i > 4} className="drop-shadow-[0_6px_4px_rgba(0,40,0,.35)]" /></div>
              <div className="pointer-events-none absolute -top-8 hidden rounded-lg bg-[#141a3f] px-2 py-1 text-[12px] font-extrabold whitespace-nowrap group-hover:flex items-center gap-1"><GameIcon k={POWERS[TEACHERS[ci].id].ic} size={16} /> {POWERS[TEACHERS[ci].id].name}</div>
            </motion.div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}

function MusicToggle() {
  const [on, set] = useState(isMusicOn());
  return (
    <button type="button" onClick={() => { const v = !on; set(v); setMusicOn(v); unlockAudio(); }} aria-pressed={on} aria-label={on ? 'Apagar música' : 'Encender música'}
      className={cn('flex items-center gap-1.5 rounded-full border border-white/20 bg-[#0b1a6b]/60 px-3 py-1.5 text-[13px] font-bold text-white/90 backdrop-blur hover:bg-[#0b1a6b]/80', !on && 'opacity-60')}>
      <Music size={15} /> {on ? 'Música' : 'Sin música'}
    </button>
  );
}

/** Twinkles in the sky: left %, top %, delay s, size. */
const SPARKS: [number, number, number, number][] = [[8, 9, 0, 14], [22, 4, 1.2, 10], [35, 14, 0.5, 12], [64, 6, 1.8, 11], [78, 12, 0.9, 15], [91, 5, 2.4, 10], [50, 3, 1.5, 9], [15, 26, 2, 9], [86, 28, 0.3, 9]];

function BigBtn({ tone, icon, children, className, onClick }: { tone: 'green' | 'purple' | 'glass'; icon: React.ReactNode; children: React.ReactNode; className?: string; onClick: () => void }) {
  return (
    <button type="button" onClick={() => { unlockAudio(); sfx.click(); onClick(); }} className={cn('cw-gbtn group relative flex items-center justify-center gap-3 rounded-[20px] px-6 text-white', tone === 'glass' ? 'cw-gbtn-glass h-14 text-[19px]' : `h-[66px] text-[22px] cw-gbtn-${tone}`, className)}>
      {icon}
      <span>{children}</span>
      <ChevronRight size={22} strokeWidth={3} className="absolute right-4 opacity-90 transition-transform group-hover:translate-x-0.5" />
    </button>
  );
}
