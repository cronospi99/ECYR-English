/* Pass the Doodle (route /doodle/*, full screen): write → draw → describe → … then reveal the chains.
   /doodle            home
   /doodle/create     create a room (this device hosts; play too or just show it on the projector)
   /doodle/join       enter a code
   /doodle/play/CODE  play on a phone */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import qrcode from 'qrcode-generator';
import { ArrowLeft, ChevronLeft, ChevronRight, Lightbulb, Pause, Play, SkipForward, Users } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/auth';
import { makeCode, makeId, relayConfigured } from '@/lib/relay';
import { TEACHERS } from '@/features/cards/teachers';
import { DrawingBoard } from '@/components/draw/DrawingBoard';
import { TeacherToon } from '@/features/cards/TeacherToon';
import { setLang, t, useLang } from '@/features/classwars/i18n';
import { DoodleClient, DoodleHost, IDEAS, MAX_DRAWING, SPEEDS, TEXT_MAX, type Kind, type Shown, type Speed } from './game';
import { MASCOT_CSS, Mascot, PioLoading } from './Mascot';

const CSS = `
${MASCOT_CSS}
.dd-root{font-family:Inter,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;color:#fff;
  background:radial-gradient(1200px 600px at 20% -10%,rgba(255,255,255,.14),transparent 60%),linear-gradient(160deg,#6a4cff 0%,#4b6bff 45%,#1fb4c9 100%);}
.dd-root:before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.12;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160' fill='none' stroke='white' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M20 30c10-10 20 10 30 0'/%3E%3Ccircle cx='120' cy='34' r='10'/%3E%3Cpath d='M30 120l14-14 14 14-14 14z'/%3E%3Cpath d='M104 112c4 12 20 12 24 0'/%3E%3Cpath d='M80 70l6 6m0-6l-6 6'/%3E%3C/svg%3E");}
.dd-title{font-weight:900;letter-spacing:-.02em;text-shadow:0 3px 0 rgba(0,0,0,.25)}
.dd-card{border-radius:26px;background:rgba(255,255,255,.96);color:#251d52;box-shadow:0 12px 0 rgba(26,16,90,.25),0 20px 40px rgba(0,0,0,.18)}
.dd-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:18px;font-weight:900;transition:transform .08s}
.dd-btn:active{transform:translateY(3px)}
.dd-btn:disabled{opacity:.45;pointer-events:none}
`;

function Btn({ tone = 'yellow', className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'yellow' | 'green' | 'white' | 'ghost' }) {
  const tones = {
    yellow: 'bg-[#ffd23f] text-[#2a1d00] shadow-[0_5px_0_#c79a00]',
    green: 'bg-[#30d158] text-white shadow-[0_5px_0_#1d9a3e]',
    white: 'bg-white text-[#3b2bb5] shadow-[0_5px_0_#c9c3f2]',
    ghost: 'bg-white/15 text-white hover:bg-white/25',
  };
  return <button type="button" {...rest} className={cn('dd-btn h-12 px-5 text-[16px]', tones[tone], className)}>{children}</button>;
}

const savedName = () => { try { return localStorage.getItem('dd:name') ?? ''; } catch { return ''; } };
const savedAv = () => { try { const raw = localStorage.getItem('dd:av'); const v = raw === null ? NaN : Number(raw); return Number.isInteger(v) && v >= 0 && v < TEACHERS.length ? v : Math.floor(Math.random() * TEACHERS.length); } catch { return 0; } };
const store = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

function useSub(x: { subscribe: (f: () => void) => () => void } | null) {
  const [, f] = useState(0);
  useEffect(() => (x ? x.subscribe(() => f((n) => n + 1)) : undefined), [x]);
}

export default function DoodleApp() {
  useLang();
  useEffect(() => {
    requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready')));
    const prev = document.title;
    document.title = 'Pass the Doodle · ECYR English';
    return () => { document.title = prev; };
  }, []);
  return (
    <div className="dd-root relative h-dvh w-full overflow-hidden">
      <style>{CSS}</style>
      <div className="relative h-full">
        <Routes>
          <Route index element={<Home />} />
          <Route path="create" element={<Create />} />
          <Route path="join" element={<Join />} />
          <Route path="join/:code" element={<Join />} />
          <Route path="play/:code" element={<PlayRoute />} />
        </Routes>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ home */
function Home() {
  const lang = useLang();
  return (
    <div className="h-full overflow-y-auto px-4 pt-[max(14px,env(safe-area-inset-top))] pb-10">
      <div className="mx-auto flex max-w-[760px] flex-col items-center">
        <div className="flex w-full items-center justify-between">
          <Link to="/games" className="grid h-10 w-10 place-items-center rounded-full bg-white/15 hover:bg-white/25" aria-label={t('Back', 'Volver')}><ArrowLeft /></Link>
          <div className="flex rounded-full bg-white/15 p-1 text-[13px] font-black">
            {(['en', 'es'] as const).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={cn('rounded-full px-3 py-1', lang === l ? 'bg-white text-[#3b2bb5]' : 'text-white/80')}>{l.toUpperCase()}</button>)}
          </div>
        </div>
        <Mascot pose="party" size={190} className="mt-2" />
        <h1 className="dd-title -mt-2 text-center text-[44px] leading-none sm:text-[60px]">Pass the Doodle</h1>
        <p className="mt-2 max-w-[520px] text-center text-[17px] font-bold text-white/85">{t('Write a sentence in English, draw what you read, describe what you see… and laugh at how the story changes!', 'Escribe una frase en inglés, dibuja lo que lees, describe lo que ves… ¡y ríete de cómo cambia la historia!')}</p>
        <div className="mt-6 grid w-full max-w-[520px] gap-3 sm:grid-cols-2">
          <Link to="/doodle/create"><Btn tone="yellow" className="h-16 w-full text-[20px]">{t('Create room', 'Crear sala')}</Btn></Link>
          <Link to="/doodle/join"><Btn tone="white" className="h-16 w-full text-[20px]">{t('Join with a code', 'Unirme con código')}</Btn></Link>
        </div>
        <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
          {[
            { pose: 'think' as const, n: 1, h: t('Write', 'Escribe'), p: t('A funny sentence in English.', 'Una frase divertida en inglés.') },
            { pose: 'draw' as const, n: 2, h: t('Draw', 'Dibuja'), p: t('Draw the sentence you get.', 'Dibuja la frase que te llega.') },
            { pose: 'idle' as const, n: 3, h: t('Describe', 'Describe'), p: t('Say in English what the drawing shows.', 'Di en inglés qué muestra el dibujo.') },
          ].map((s) => (
            <div key={s.n} className="dd-card flex flex-col items-center px-4 pt-2 pb-4 text-center">
              <Mascot pose={s.pose} size={110} />
              <div className="text-[19px] font-black">{s.n}. {s.h}</div>
              <div className="text-[14px] font-semibold text-[#5b4f99]">{s.p}</div>
            </div>
          ))}
        </div>
        {!relayConfigured() && <p className="mt-6 rounded-2xl bg-black/25 px-4 py-3 text-center text-[14px] font-bold">{t('The live game server is not set up in this deployment (VITE_RELAY_URL).', 'El servidor de juego en vivo no está configurado en este despliegue (VITE_RELAY_URL).')}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------- name + avatar form */
function Identity({ name, setName, av, setAv }: { name: string; setName: (s: string) => void; av: number; setAv: (n: number) => void }) {
  const n = TEACHERS.length;
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => setAv((av + n - 1) % n)} className="grid h-9 w-9 place-items-center rounded-full bg-[#ece8ff] text-[#3b2bb5]" aria-label={t('Previous', 'Anterior')}><ChevronLeft size={18} /></button>
        <Face ci={av} size={80} />
        <button type="button" onClick={() => setAv((av + 1) % n)} className="grid h-9 w-9 place-items-center rounded-full bg-[#ece8ff] text-[#3b2bb5]" aria-label={t('Next', 'Siguiente')}><ChevronRight size={18} /></button>
      </div>
      <input value={name} onChange={(e) => setName(e.target.value.slice(0, 20))} placeholder={t('Your name', 'Tu nombre')} aria-label={t('Your name', 'Tu nombre')}
        className="h-12 min-w-0 flex-1 rounded-2xl border-[3px] border-[#ddd6ff] bg-white px-4 text-[18px] font-extrabold text-[#251d52] outline-none focus:border-[#7b5cff]" />
    </div>
  );
}

function Join() {
  const { code: param } = useParams();
  const nav = useNavigate();
  const profile = useAuth((s) => s.profile);
  const [code, setCode] = useState((param ?? '').toUpperCase());
  const [name, setName] = useState(() => savedName() || (profile?.full_name ?? '').split(' ')[0] || '');
  const [av, setAv] = useState(savedAv);
  const ok = /^[A-Z0-9]{4,8}$/.test(code) && name.trim().length >= 2;
  const go = () => { if (!ok) return; store('dd:name', name.trim()); store('dd:av', String(av)); nav(`/doodle/play/${code}`); };
  return (
    <div className="grid h-full place-items-center overflow-y-auto p-4">
      <div className="dd-card w-full max-w-[440px] p-6">
        <div className="mb-3 flex items-center gap-3">
          <Link to="/doodle" className="grid h-10 w-10 place-items-center rounded-full bg-[#ece8ff] text-[#3b2bb5]" aria-label={t('Back', 'Volver')}><ArrowLeft /></Link>
          <h1 className="text-[26px] font-black">{t('Join', 'Unirme')}</h1>
          <Mascot pose="idle" size={64} className="ml-auto" />
        </div>
        <label htmlFor="dd-code" className="text-[13px] font-extrabold tracking-wide text-[#7a70b8] uppercase">{t('Room code', 'Código de la sala')}</label>
        <input id="dd-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="ABCD" autoCapitalize="characters" autoComplete="off" onKeyDown={(e) => e.key === 'Enter' && go()}
          className="mt-1 h-16 w-full rounded-2xl border-[3px] border-[#ddd6ff] text-center text-[38px] font-black tracking-[0.2em] text-[#251d52] outline-none focus:border-[#7b5cff]" />
        <div className="mt-4 mb-1 text-[13px] font-extrabold tracking-wide text-[#7a70b8] uppercase">{t('You', 'Tú')}</div>
        <Identity name={name} setName={setName} av={av} setAv={setAv} />
        <Btn tone="green" className="mt-5 h-14 w-full text-[19px]" disabled={!ok} onClick={go}>{t('Join!', '¡Entrar!')}</Btn>
      </div>
    </div>
  );
}

/* --------------------------------------------------------------- create */
function Create() {
  const profile = useAuth((s) => s.profile);
  const nav = useNavigate();
  const [name, setName] = useState(() => savedName() || (profile?.full_name ?? '').split(' ')[0] || '');
  const [av, setAv] = useState(savedAv);
  const [plays, setPlays] = useState(true);
  const [room, setRoom] = useState<{ host: DoodleHost; me: DoodleClient } | null>(null);
  useEffect(() => () => { room?.me.close(); room?.host.close(); }, [room]);

  if (room) return <HostScreen host={room.host} me={room.me} onExit={() => { setRoom(null); nav('/doodle'); }} />;
  const ok = !plays || name.trim().length >= 2;
  return (
    <div className="grid h-full place-items-center overflow-y-auto p-4">
      <div className="dd-card w-full max-w-[460px] p-6">
        <div className="mb-3 flex items-center gap-3">
          <Link to="/doodle" className="grid h-10 w-10 place-items-center rounded-full bg-[#ece8ff] text-[#3b2bb5]" aria-label={t('Back', 'Volver')}><ArrowLeft /></Link>
          <h1 className="text-[26px] font-black">{t('New room', 'Nueva sala')}</h1>
          <Mascot pose="draw" size={70} className="ml-auto" />
        </div>
        <label className="flex cursor-pointer items-center gap-3 rounded-2xl bg-[#f3f0ff] p-3">
          <input type="checkbox" checked={plays} onChange={(e) => setPlays(e.target.checked)} className="h-5 w-5 accent-[#7b5cff]" />
          <div><div className="font-extrabold">{t('I play too', 'Yo también juego')}</div><div className="text-[12.5px] font-semibold text-[#6b61a8]">{t('Uncheck it to use this screen only as the projector.', 'Desmárcalo para usar esta pantalla solo como proyector.')}</div></div>
        </label>
        {plays && <div className="mt-4"><Identity name={name} setName={setName} av={av} setAv={setAv} /></div>}
        <Btn tone="green" className="mt-5 h-14 w-full text-[19px]" disabled={!ok || !relayConfigured()} onClick={() => {
          store('dd:name', name.trim()); store('dd:av', String(av));
          const code = makeCode();
          const host = new DoodleHost(code);
          const me = new DoodleClient(code, 'p' + makeId(), name.trim() || 'Host', av, !plays);
          if (import.meta.env.DEV) (window as unknown as { __dd: unknown }).__dd = { host, me };
          setRoom({ host, me });
        }}>{t('Create room', 'Crear sala')}</Btn>
      </div>
    </div>
  );
}

function HostScreen({ host, me, onExit }: { host: DoodleHost; me: DoodleClient; onExit: () => void }) {
  useSub(host);
  const [speed, setSpeed] = useState<Speed>('normal');
  const [steps, setSteps] = useState(6);
  const [auto, setAuto] = useState(false);
  const n = host.lobby.size;
  useEffect(() => {
    if (!auto || host.phase !== 'reveal') return;
    const tm = setTimeout(() => host.next(), 4200);
    return () => clearTimeout(tm);
  });
  const bar = (
    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-[22px] bg-[#1d1550]/80 p-2 shadow-xl backdrop-blur">
      <span className="rounded-xl bg-white px-3 py-1 text-[20px] font-black tracking-[0.15em] text-[#3b2bb5]">{host.code}</span>
      {host.phase === 'lobby' && (
        <>
          <div className="flex rounded-xl bg-white/10 p-0.5 text-[13px] font-black">
            {(Object.keys(SPEEDS) as Speed[]).map((s) => <button key={s} type="button" onClick={() => setSpeed(s)} className={cn('rounded-lg px-2.5 py-1.5', speed === s ? 'bg-white text-[#3b2bb5]' : 'text-white/80')}>{s === 'slow' ? t('Slow', 'Lento') : s === 'normal' ? 'Normal' : t('Fast', 'Rápido')}</button>)}
          </div>
          <label className="flex items-center gap-2 rounded-xl bg-white/10 px-2.5 py-1 text-[13px] font-black">
            {t('Rounds', 'Rondas')} <input type="range" min={2} max={10} value={steps} onChange={(e) => setSteps(Number(e.target.value))} className="w-24 accent-[#ffd23f]" aria-label={t('Rounds', 'Rondas')} /> {Math.min(steps, Math.max(2, n))}
          </label>
          <Btn tone="green" className="h-11" disabled={n < 2} onClick={() => host.start(speed, steps)}><Play size={18} fill="currentColor" /> {t('Start', 'Empezar')} ({n})</Btn>
        </>
      )}
      {host.phase === 'play' && <span className="px-2 text-[14px] font-extrabold">{t('Round', 'Ronda')} {host.step + 1}/{host.steps}</span>}
      {host.phase === 'reveal' && (
        <>
          <Btn tone="yellow" className="h-11" onClick={() => host.next()}><SkipForward size={18} /> {t('Next', 'Siguiente')}</Btn>
          <Btn tone="ghost" className="h-11" onClick={() => setAuto((a) => !a)}>{auto ? <Pause size={18} /> : <Play size={18} />} {t('Auto', 'Auto')}</Btn>
        </>
      )}
      {host.phase === 'end' && <Btn tone="yellow" className="h-11" onClick={() => host.again()}>{t('Play again', 'Jugar otra vez')}</Btn>}
      <button type="button" onClick={() => { if (confirm(t('Close the room?', '¿Cerrar la sala?'))) onExit(); }} className="rounded-xl bg-white/10 px-3 py-2 text-[13px] font-extrabold hover:bg-white/20">{t('Close', 'Cerrar')}</button>
    </div>
  );
  return (
    <div className="flex h-full flex-col">
      <div className="pointer-events-none absolute inset-x-0 bottom-[max(10px,env(safe-area-inset-bottom))] z-40 flex justify-center px-2">{bar}</div>
      {host.phase === 'lobby' && me.watch ? <Projector host={host} /> : <PlayScreen client={me} code={host.code} isHost />}
    </div>
  );
}

/** Projector lobby: the code, a QR and everyone who joined. */
function Projector({ host }: { host: DoodleHost }) {
  const url = `${location.origin}/doodle/join/${host.code}`;
  const qr = useMemo(() => {
    const q = qrcode(0, 'M'); q.addData(url); q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
    return { d, n };
  }, [url]);
  const players = [...host.lobby.values()];
  return (
    <div className="flex h-full flex-col items-center overflow-y-auto px-4 pt-6 pb-28 lg:flex-row lg:items-stretch lg:gap-8 lg:px-10">
      <div className="flex flex-col items-center justify-center gap-3 lg:w-[40%]">
        <Mascot pose="party" size={150} />
        <div className="dd-title text-[30px]">Pass the Doodle</div>
        <div className="text-center text-[17px] font-bold text-white/85">{t('Go to', 'Entra a')} <span className="text-[#ffe36b]">{location.host}/doodle</span> {t('and use the code', 'y usa el código')}</div>
        <div className="rounded-[28px] bg-white px-8 py-2 text-[72px] leading-none font-black tracking-[0.12em] text-[#3b2bb5] shadow-[0_8px_0_#c9c3f2]">{host.code}</div>
        <svg viewBox={`-2 -2 ${qr.n + 4} ${qr.n + 4}`} className="h-[170px] w-[170px] rounded-2xl bg-white" shapeRendering="crispEdges" role="img" aria-label={`QR: ${url}`}><path d={qr.d} fill="#251d52" /></svg>
      </div>
      <PlayerGrid players={players} />
    </div>
  );
}

function PlayerGrid({ players, done }: { players: { peer: string; name: string; av: number }[]; done?: string[] }) {
  return (
    <div className="mt-4 flex min-h-0 w-full flex-1 flex-col">
      <div className="mb-2 flex items-center gap-2 text-[18px] font-black"><Users size={20} /> {players.length} {t('players', 'jugadores')}</div>
      <div className="grid auto-rows-max grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-6">
        <AnimatePresence>
          {players.map((p) => (
            <motion.div key={p.peer} layout initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }}
              className={cn('relative flex flex-col items-center rounded-2xl bg-white/15 pt-1 pb-1.5', done && !done.includes(p.peer) && 'opacity-60')}>
              {done?.includes(p.peer) && <span className="absolute top-1 right-1 rounded-full bg-[#30d158] px-1.5 text-[11px] font-black">OK</span>}
              <Face ci={p.av} size={64} />
              <div className="w-full truncate px-1.5 text-center text-[13px] font-black">{p.name}</div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
      {players.length === 0 && <div className="py-10 text-center text-[17px] font-bold text-white/75">{t('Waiting for players…', 'Esperando jugadores…')}</div>}
    </div>
  );
}

/* --------------------------------------------------------------- player */
function PlayRoute() {
  const { code = '' } = useParams();
  const nav = useNavigate();
  const [client, setClient] = useState<DoodleClient | null>(null);
  useEffect(() => {
    const name = savedName();
    if (!name) { nav(`/doodle/join/${code}`, { replace: true }); return; }
    let peer = '';
    try { peer = sessionStorage.getItem('dd:peer:' + code) ?? ''; } catch { /* ignore */ }
    if (!peer) { peer = 'p' + makeId(); try { sessionStorage.setItem('dd:peer:' + code, peer); } catch { /* ignore */ } }
    const c = new DoodleClient(code.toUpperCase(), peer, name, savedAv());
    setClient(c);
    if (import.meta.env.DEV) (window as unknown as { __ddc: unknown }).__ddc = c;
    return () => c.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);
  if (!client) return null;
  return <PlayScreen client={client} code={code.toUpperCase()} />;
}

function PlayScreen({ client, code, isHost }: { client: DoodleClient; code: string; isHost?: boolean }) {
  useSub(client);
  const [slow, setSlow] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setSlow(true), 7000); return () => clearTimeout(tm); }, []);
  const ph = client.phase;
  const pad = isHost ? 'pb-28' : 'pb-6';
  if (ph === 'connecting') return <Center><PioLoading text={t('Finding the room…', 'Buscando la sala…')} sub={slow ? t(`Room ${code} did not answer. Check the code.`, `La sala ${code} no responde. Revisa el código.`) : undefined} /></Center>;
  if (ph === 'full') return <Center><PioLoading text={t('The room is full', 'La sala está llena')} /></Center>;
  if (ph === 'lobby') return (
    <div className={cn('flex h-full flex-col items-center overflow-y-auto px-4 pt-6', pad)}>
      <Mascot pose="idle" size={130} />
      <div className="dd-title text-center text-[28px]">{client.watch ? t('Waiting for players', 'Esperando jugadores') : t(`You're in, ${client.name}!`, `¡Estás dentro, ${client.name}!`)}</div>
      <div className="text-[15px] font-bold text-white/80">{t('Room', 'Sala')} {code} · {isHost ? t('start when everyone is in', 'empieza cuando estén todos') : t('wait for the host to start', 'espera a que empiece el anfitrión')}</div>
      {!client.watch && (
        <div className="mt-3 flex items-center gap-1 rounded-2xl bg-white/15 p-1">
          <button type="button" onClick={() => { const v = (client.av + TEACHERS.length - 1) % TEACHERS.length; store('dd:av', String(v)); client.setAvatar(v); }} className="grid h-9 w-9 place-items-center rounded-full bg-white/20" aria-label={t('Previous', 'Anterior')}><ChevronLeft size={18} /></button>
          <Face ci={client.av} size={68} />
          <button type="button" onClick={() => { const v = (client.av + 1) % TEACHERS.length; store('dd:av', String(v)); client.setAvatar(v); }} className="grid h-9 w-9 place-items-center rounded-full bg-white/20" aria-label={t('Next', 'Siguiente')}><ChevronRight size={18} /></button>
        </div>
      )}
      <div className="w-full max-w-[900px]"><PlayerGrid players={client.players} /></div>
    </div>
  );
  if (ph === 'play') {
    const task = client.task;
    if (client.watch || !task) return <Watching client={client} pad={pad} />;
    if (task.done) return <Center pad={pad}><Waiting client={client} /></Center>;
    return <TaskScreen key={task.s} client={client} pad={pad} />;
  }
  return <Reveal client={client} pad={pad} />;
}

/** A player's face: the teacher character, cropped to head and shoulders. */
function Face({ ci, size }: { ci: number; size: number }) {
  const look = TEACHERS[ci]?.look ?? TEACHERS[0].look;
  return (
    <svg viewBox="-64 -186 128 128" width={size} height={size} className="shrink-0" aria-hidden>
      <TeacherToon look={look} t={1 + ci * 0.37} />
    </svg>
  );
}

function Center({ children, pad = '' }: { children: ReactNode; pad?: string }) {
  return <div className={cn('grid h-full place-items-center overflow-y-auto p-4', pad)}>{children}</div>;
}

function useLeft(endsAt: number) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(i); }, []);
  return Math.max(0, Math.ceil((endsAt - now) / 1000));
}

function Timer({ endsAt, total }: { endsAt: number; total: number }) {
  const left = useLeft(endsAt);
  const k = Math.min(1, left / Math.max(1, total));
  return (
    <div className="flex items-center gap-2">
      <div className="h-3 w-[min(40vw,220px)] overflow-hidden rounded-full bg-black/25"><div className="h-full rounded-full transition-[width] duration-300" style={{ width: `${k * 100}%`, background: left <= 10 ? '#ff5c6c' : '#ffd23f' }} /></div>
      <span className={cn('w-10 text-[18px] font-black tabular-nums', left <= 10 && 'text-[#ffb3ba]')}>{left}s</span>
    </div>
  );
}

const KIND_INFO: Record<Kind, { title: [string, string]; hint: [string, string]; pose: 'think' | 'draw' | 'idle' }> = {
  write: { title: ['Write a sentence', 'Escribe una frase'], hint: ['In English! Something fun that can be drawn.', '¡En inglés! Algo divertido que se pueda dibujar.'], pose: 'think' },
  draw: { title: ['Draw this sentence', 'Dibuja esta frase'], hint: ['No letters or words in your drawing!', '¡Sin letras ni palabras en el dibujo!'], pose: 'draw' },
  describe: { title: ['What is happening?', '¿Qué está pasando?'], hint: ['Describe the drawing in one English sentence.', 'Describe el dibujo en una frase en inglés.'], pose: 'idle' },
};

function TaskScreen({ client, pad }: { client: DoodleClient; pad: string }) {
  const task = client.task!;
  const info = KIND_INFO[task.kind];
  const [text, setText] = useState('');
  const exportRef = useRef<(() => string | null) | null>(null);
  const hasInk = useRef(false);
  const total = useMemo(() => Math.round((task.endsAt - Date.now()) / 1000), [task.endsAt]);
  const textRef = useRef(text);
  textRef.current = text;
  useEffect(() => {
    client.flush = () => {
      if (task.kind === 'draw') client.submit(hasInk.current ? exportRef.current?.() ?? null : null);
      else client.submit(textRef.current.trim() || null);
    };
    return () => { client.flush = null; };
  }, [client, task.kind]);
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  const idea = () => {
    const pool = [...IDEAS.easy, ...IDEAS.mid, ...IDEAS.hard];
    setText(pool[Math.floor(Math.random() * pool.length)]);
  };
  return (
    <div className={cn('flex h-full flex-col overflow-y-auto px-3 pt-[max(10px,env(safe-area-inset-top))]', pad)}>
      <div className="mx-auto flex w-full max-w-[920px] flex-wrap items-center gap-x-3 gap-y-1">
        <Mascot pose={info.pose} size={52} />
        <div className="min-w-0 flex-1">
          <div className="dd-title text-[21px] leading-tight sm:text-[26px]">{t(...info.title)}</div>
          <div className="line-clamp-2 text-[13px] font-bold text-white/80">{t('Round', 'Ronda')} {task.s + 1}/{task.steps} · {t(...info.hint)}</div>
        </div>
        <div className="flex w-full justify-end sm:w-auto"><Timer endsAt={task.endsAt} total={total} /></div>
      </div>
      <div className="mx-auto mt-3 w-full max-w-[920px] flex-1">
        {task.kind === 'draw' ? (
          <div className="flex flex-col gap-2">
            <div className="dd-card px-4 py-3 text-center text-[19px] font-black sm:text-[22px]">“{task.prompt ?? t('(no sentence — draw anything!)', '(sin frase: ¡dibuja lo que quieras!)')}”</div>
            <div className="dd-card overflow-hidden p-2">
              <DrawingBoard compact hideDownload aspect={4 / 3} maxHeight="56dvh" exportMax={MAX_DRAWING} exportRef={exportRef} onChange={(ink) => { hasInk.current = ink; }} onDone={(img) => client.submit(img)} doneLabel={t('Done!', '¡Listo!')} />
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {task.kind === 'describe' && (
              <div className="dd-card mx-auto w-full max-w-[640px] overflow-hidden p-2">
                {task.prompt ? <img src={task.prompt} alt={t('Drawing to describe', 'Dibujo para describir')} className="mx-auto max-h-[44dvh] w-auto max-w-full rounded-[18px] bg-white object-contain" /> : <div className="grid aspect-[4/3] place-items-center text-[18px] font-bold text-[#7a70b8]">{t('(empty drawing — imagine something!)', '(dibujo vacío: ¡imagina algo!)')}</div>}
              </div>
            )}
            <div className="dd-card mx-auto w-full max-w-[640px] p-3">
              <textarea value={text} onChange={(e) => setText(e.target.value.slice(0, TEXT_MAX))} rows={2} autoFocus placeholder={task.kind === 'write' ? 'A cat is driving a bus…' : 'I think it is…'} aria-label={t(...info.title)}
                className="w-full resize-none rounded-2xl border-[3px] border-[#ddd6ff] px-4 py-3 text-[20px] font-bold text-[#251d52] outline-none focus:border-[#7b5cff]" onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && words >= 3) { e.preventDefault(); client.submit(text.trim()); } }} />
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {task.kind === 'write' && <button type="button" onClick={idea} className="flex items-center gap-1.5 rounded-xl bg-[#f3f0ff] px-3 py-2 text-[14px] font-extrabold text-[#5b3fd6]"><Lightbulb size={16} /> {t('Give me an idea', 'Dame una idea')}</button>}
                <span className={cn('text-[13px] font-bold', words >= 3 ? 'text-[#1d9a3e]' : 'text-[#9a8fd6]')}>{words} {t('words (min. 3)', 'palabras (mín. 3)')}</span>
                <Btn tone="green" className="ml-auto" disabled={words < 3} onClick={() => client.submit(text.trim())}>{t('Done!', '¡Listo!')}</Btn>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Waiting({ client }: { client: DoodleClient }) {
  const total = client.order.length || client.players.length;
  return (
    <div className="flex flex-col items-center text-center">
      <Mascot pose="draw" size={160} />
      <div className="dd-title text-[26px]">{t('Nice! Waiting for the others…', '¡Bien! Esperando a los demás…')}</div>
      <div className="mt-1 text-[16px] font-bold text-white/85">{client.progress.length} / {total} {t('ready', 'listos')}</div>
      {client.task && <div className="mt-3"><Timer endsAt={client.task.endsAt} total={SPEEDS.normal[client.task.kind]} /></div>}
    </div>
  );
}

/** Projector during the rounds: who is done. */
function Watching({ client, pad }: { client: DoodleClient; pad: string }) {
  const players = client.players.filter((p) => !client.order.length || client.order.includes(p.peer));
  return (
    <div className={cn('flex h-full flex-col items-center overflow-y-auto px-4 pt-6', pad)}>
      <Mascot pose="draw" size={140} />
      <div className="dd-title text-[28px]">{t('Everyone is working…', 'Todos están trabajando…')}</div>
      <div className="text-[16px] font-bold text-white/85">{client.progress.length} / {players.length} {t('ready', 'listos')}</div>
      <div className="w-full max-w-[1000px]"><PlayerGrid players={players} done={client.progress} /></div>
    </div>
  );
}

/* --------------------------------------------------------------- reveal */
function Reveal({ client, pad }: { client: DoodleClient; pad: string }) {
  const end = client.phase === 'end';
  const last = client.album[client.album.length - 1];
  const [view, setView] = useState(0);
  const chainIdx = end ? view : last?.c ?? 0;
  const items = client.album.filter((a) => a.c === chainIdx).sort((a, b) => a.i - b.i);
  const chains = Math.max(1, last?.n ?? 1);
  const listRef = useRef<HTMLDivElement>(null);
  useEffect(() => { listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: 'smooth' }); }, [items.length]);
  if (!last) return <Center pad={pad}><PioLoading text={t('Getting the album ready…', 'Preparando el álbum…')} /></Center>;
  return (
    <div className={cn('flex h-full flex-col px-3 pt-[max(10px,env(safe-area-inset-top))]', pad)}>
      <div className="mx-auto flex w-full max-w-[820px] items-center gap-3">
        <Mascot pose={end ? 'party' : 'idle'} size={58} />
        <div className="min-w-0 flex-1">
          <div className="dd-title truncate text-[22px] sm:text-[26px]">{end ? t('The album', 'El álbum') : t(`${items[0]?.owner ?? last.owner}'s story`, `La historia de ${items[0]?.owner ?? last.owner}`)}</div>
          <div className="text-[13px] font-bold text-white/80">{t('Story', 'Historia')} {chainIdx + 1}/{chains}</div>
        </div>
        {end && (
          <div className="flex gap-1.5">
            <button type="button" disabled={view <= 0} onClick={() => setView((v) => v - 1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/20 disabled:opacity-40" aria-label={t('Previous story', 'Historia anterior')}><ChevronLeft /></button>
            <button type="button" disabled={view >= chains - 1} onClick={() => setView((v) => v + 1)} className="grid h-10 w-10 place-items-center rounded-full bg-white/20 disabled:opacity-40" aria-label={t('Next story', 'Historia siguiente')}><ChevronRight /></button>
          </div>
        )}
      </div>
      <div ref={listRef} className="mx-auto mt-3 flex w-full max-w-[820px] flex-1 flex-col gap-3 overflow-y-auto pb-4">
        {items.map((it) => <AlbumItem key={`${it.c}-${it.i}`} it={it} />)}
      </div>
    </div>
  );
}

function AlbumItem({ it }: { it: Shown }) {
  const left = it.i % 2 === 0;
  return (
    <motion.div initial={{ y: 30, opacity: 0, scale: 0.95 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 320, damping: 24 }}
      className={cn('flex items-end gap-2', !left && 'flex-row-reverse')}>
      <div className="flex w-[64px] shrink-0 flex-col items-center">
        <Face ci={it.byAv} size={56} />
        <div className="w-full truncate text-center text-[11.5px] font-black">{it.by}</div>
      </div>
      {it.kind === 'draw' ? (
        <div className="dd-card w-[min(78vw,520px)] overflow-hidden p-2">
          {it.v ? <img src={it.v} alt={t(`Drawing by ${it.by}`, `Dibujo de ${it.by}`)} className="w-full rounded-[18px] bg-white" /> : <div className="grid aspect-[4/3] place-items-center font-bold text-[#7a70b8]">{t('(no drawing)', '(sin dibujo)')}</div>}
        </div>
      ) : (
        <div className={cn('dd-card max-w-[min(78vw,560px)] px-4 py-3 text-[18px] font-extrabold sm:text-[21px]', left ? 'rounded-bl-md' : 'rounded-br-md')}>{it.v ?? <span className="text-[#9a8fd6]">{t('(no answer)', '(sin respuesta)')}</span>}</div>
      )}
    </motion.div>
  );
}
