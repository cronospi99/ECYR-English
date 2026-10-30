/* Class Wars — live classroom battle game (route /classwars/*, full screen, no app shell).
   Nested routes: home, teacher setup/host, join/play, solo demo vs bots, question-set editor. */
import { useEffect, useState } from 'react';
import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Gamepad2, KeyRound, ListChecks, Play } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { TEACHERS } from '@/features/cards/teachers';
import { CW_CSS, Btn, Toon } from './ui/kit';
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
    return () => { document.title = prev; };
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
  return (
    <div className="cw-scroll relative h-full overflow-y-auto">
      <div className="cw-lawn absolute inset-x-0 bottom-0 h-[34%] opacity-95" />
      <div className="absolute inset-x-0 bottom-[34%] h-10 bg-gradient-to-b from-transparent to-[#0e1230]/0" />
      <div className="relative z-10 mx-auto flex min-h-full max-w-[980px] flex-col px-4 pt-[max(14px,env(safe-area-inset-top))]">
        <Link to="/" className="flex w-max items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-bold text-white/80 hover:bg-white/20"><ArrowLeft size={15} /> ECYR English</Link>
        <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 18 }} className="mt-6 text-center sm:mt-10">
          <div className="text-[13px] font-extrabold tracking-[0.3em] text-[#ffd23f] uppercase">ECYR English presenta</div>
          <h1 className="cw-title mt-1 text-[56px] leading-[0.95] sm:text-[88px]" style={{ textShadow: '0 4px 0 #0e1230, 0 -2px 0 #0e1230, 2px 0 0 #0e1230, -2px 0 0 #0e1230, 0 10px 24px rgba(0,0,0,.45)' }}>
            <span className="text-[#ffd23f]">CLASS</span> <span className="text-white">WARS</span>
          </h1>
          <p className="mx-auto mt-3 max-w-[560px] text-[16px] font-semibold text-white/75 sm:text-[18px]">Responde en inglés para ganar diamantes 💎, abre cajas sorpresa, usa el poder de tu profe favorito… ¡y roba los diamantes de tus rivales!</p>
        </motion.div>

        <div className="mx-auto mt-7 grid w-full max-w-[640px] grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex flex-col gap-2 rounded-[22px] border-2 border-white/10 bg-[#202a63]/90 p-4 sm:col-span-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-[15px] font-black"><KeyRound size={18} /> Unirme con código</div>
            <div className="flex flex-1 gap-2">
              <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} onKeyDown={(e) => e.key === 'Enter' && code.length >= 4 && nav(`/classwars/join/${code}`)} placeholder="CÓDIGO" aria-label="Código de la partida"
                className="h-12 min-w-0 flex-1 rounded-2xl bg-white px-4 text-center text-[22px] font-black tracking-[0.2em] text-[#1b2350] outline-none placeholder:text-[#1b2350]/30" />
              <Btn tone="yellow" className="h-12" disabled={code.length < 4} onClick={() => nav(`/classwars/join/${code}`)}>Entrar</Btn>
            </div>
          </div>
          {teacher && (
            <>
              <Btn big tone="green" onClick={() => nav('/classwars/crear')}><Gamepad2 /> Crear partida</Btn>
              <Btn big tone="purple" onClick={() => nav('/classwars/preguntas')}><ListChecks /> Mis preguntas</Btn>
            </>
          )}
          <Btn big tone={teacher ? 'ghost' : 'blue'} className="sm:col-span-2" onClick={() => nav('/classwars/demo')}><Play /> Probar demo contra bots</Btn>
        </div>

        <div className="mt-auto flex items-end justify-center gap-0 overflow-hidden pt-8 sm:gap-2">
          {parade.map((ci, i) => (
            <motion.div key={ci} initial={{ y: 120 }} animate={{ y: 0 }} transition={{ delay: 0.15 + i * 0.06, type: 'spring', stiffness: 220, damping: 16 }} className="group relative flex flex-col items-center">
              <div className="cw-bob" style={{ animationDelay: `${i * 0.18}s` }}><Toon ci={ci} size={i === 4 ? 96 : 74} flip={i > 4} /></div>
              <div className="pointer-events-none absolute -top-8 hidden rounded-lg bg-[#141a3f] px-2 py-1 text-[12px] font-extrabold whitespace-nowrap group-hover:block">{POWERS[TEACHERS[ci].id].icon} {POWERS[TEACHERS[ci].id].name}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
