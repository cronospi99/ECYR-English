/* Class Wars — teacher side: match setup → lobby on the projector (code + QR) → live
   spectator view (or the teacher's own player view) → podium. */
import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import qrcode from 'qrcode-generator';
import { ArrowLeft, Bot, Clock, Gamepad2, ListChecks, Trophy, Users, X, Pencil, Eye, Swords } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { makeCode, makeId, relayConfigured } from '@/lib/relay';
import { cn } from '@/lib/cn';
import { TEACHERS } from '@/features/cards/teachers';
import { HostSession } from '../game/host';
import { ClientSession } from '../game/client';
import { LEVELS, curriculumQuestions, listSets, loadBank, shuffleOptions, type Level, type QSet } from '../game/questions';
import { POWERS } from '../game/defs';
import { CharacterPicker } from './CharacterPicker';
import { GameView } from './GameView';
import { Podium } from './Podium';
import { Btn, Diamond, Loading, Panel, Toon, useSessionKey } from './kit';

interface Setup {
  mode: 'classic' | 'race';
  minutes: number;
  goal: number;
  source: 'curriculum' | 'set';
  level: Level;
  units: number[];
  setId: string;
  maxPlayers: number;
  teacherPlays: boolean;
  teacherChar: number;
  bots: number;
}

const DEFAULT: Setup = { mode: 'classic', minutes: 8, goal: 1000, source: 'curriculum', level: 'A2', units: [], setId: '', maxPlayers: 40, teacherPlays: false, teacherChar: 0, bots: 0 };

export function HostApp() {
  const profile = useAuth((s) => s.profile);
  const ready = useAuth((s) => s.ready);
  const session = useAuth((s) => s.session);
  const [waited, setWaited] = useState(false);
  useEffect(() => { const t = setTimeout(() => setWaited(true), 4000); return () => clearTimeout(t); }, []);
  const [host, setHost] = useState<HostSession | null>(null);
  const [me, setMe] = useState<ClientSession | null>(null);
  const [cfg, setCfg] = useState<Setup | null>(null);

  useEffect(() => () => { host?.close(); }, [host]);
  useEffect(() => () => { me?.close(); }, [me]);

  if (!ready || (session && !profile && !waited)) return <Center><Loading /></Center>;
  if (profile?.role !== 'teacher') return <TeachersOnly />;
  if (!host || !cfg) return <SetupScreen onCreate={async (s, questions, label) => {
    const code = makeCode();
    const h = new HostSession({ code, matchId: crypto.randomUUID?.() ?? makeId() + makeId(), durationMin: s.minutes, goal: s.mode === 'race' ? s.goal : 0, maxPlayers: s.maxPlayers, questions, source: label, bots: s.bots, demo: false, hostName: profile.full_name ?? 'Profe' });
    setHost(h);
    setCfg(s);
    if (import.meta.env.DEV) (window as unknown as { __cwHost: unknown }).__cwHost = h;
    if (s.teacherPlays) {
      const c = new ClientSession(code, 'teacher-' + makeId().slice(0, 8), (profile.full_name ?? 'Profe').split(' ')[0], s.teacherChar, profile.id);
      setMe(c);
    }
  }} />;
  return <HostLive host={host} me={me} cfg={cfg} onRematch={() => {
    const h = new HostSession({ ...host.cfg, matchId: crypto.randomUUID?.() ?? makeId() + makeId() });
    host.close();
    setHost(h);
    if (import.meta.env.DEV) (window as unknown as { __cwHost: unknown }).__cwHost = h;
    if (me) setTimeout(() => me.hello(), 400);
  }} onExit={() => { host.close(); me?.close(); setHost(null); setMe(null); setCfg(null); }} />;
}

function Center({ children }: { children: React.ReactNode }) {
  return <div className="grid h-full place-items-center p-6">{children}</div>;
}

function TeachersOnly() {
  return (
    <Center>
      <Panel className="max-w-[440px] p-7 text-center">
        <div className="text-[44px]">🧑‍🏫</div>
        <h1 className="cw-title mt-2 text-[26px]">Solo para docentes</h1>
        <p className="mt-2 text-[15px] font-semibold text-white/70">Para crear una partida necesitas una cuenta de docente de ECYR English. Los estudiantes se unen con el código que muestra el profe.</p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link to="/classwars/unirme"><Btn tone="yellow">Unirme con código</Btn></Link>
          <Link to="/classwars/demo"><Btn tone="ghost">Probar demo</Btn></Link>
        </div>
      </Panel>
    </Center>
  );
}

/* ------------------------------------------------------------------ setup */
function SetupScreen({ onCreate }: { onCreate: (s: Setup, q: { q: string; o: string[]; a: number }[], label: string) => Promise<void> }) {
  const [s, set] = useState<Setup>(() => {
    try {
      const v: Setup = { ...DEFAULT, ...JSON.parse(localStorage.getItem('cw:setup') || '{}') };
      if (![500, 1000, 2000, 3000].includes(v.goal)) v.goal = DEFAULT.goal;
      return v;
    } catch { return DEFAULT; }
  });
  const up = (p: Partial<Setup>) => set((o) => ({ ...o, ...p }));
  const [units, setUnits] = useState<[number, string][]>([]);
  const [count, setCount] = useState(0);
  const [sets, setSets] = useState<QSet[] | null>(null);
  const [setsErr, setSetsErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [picking, setPicking] = useState(false);
  const live = relayConfigured();

  useEffect(() => { try { localStorage.setItem('cw:setup', JSON.stringify(s)); } catch { /* ignore */ } }, [s]);
  useEffect(() => { void loadBank(s.level).then((b) => setUnits(b.units)); }, [s.level]);
  useEffect(() => { void curriculumQuestions(s.level, s.units).then((q) => setCount(q.length)); }, [s.level, s.units]);
  useEffect(() => {
    listSets().then(setSets).catch((e: Error) => { setSets([]); setSetsErr(e.message); });
  }, []);
  const chosenSet = sets?.find((x) => x.id === s.setId);
  const qCount = s.source === 'set' ? chosenSet?.items.length ?? 0 : count;

  const create = async () => {
    setBusy(true);
    try {
      let q, label;
      if (s.source === 'set' && chosenSet) { q = chosenSet.items; label = chosenSet.title; }
      else { q = await curriculumQuestions(s.level, s.units); label = `Curso ${s.level}${s.units.length ? ' · unidades ' + s.units.join(', ') : ''}`; }
      await onCreate(s, shuffleOptions(q), label);
    } finally { setBusy(false); }
  };

  if (picking) return (
    <div className="flex h-full flex-col p-3 sm:p-5">
      <div className="mb-3 flex items-center gap-3"><button type="button" onClick={() => setPicking(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10"><ArrowLeft /></button><h1 className="cw-title text-[24px]">Tu personaje</h1></div>
      <CharacterPicker value={s.teacherChar} onChange={(c) => up({ teacherChar: c })} onConfirm={() => setPicking(false)} confirmLabel="Elegir" />
    </div>
  );

  return (
    <div className="cw-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-[920px] px-4 pt-[max(16px,env(safe-area-inset-top))] pb-32">
        <div className="mb-4 flex items-center gap-3">
          <Link to="/classwars" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Volver"><ArrowLeft /></Link>
          <h1 className="cw-title text-[28px] sm:text-[34px]">Nueva partida</h1>
        </div>
        {!live && <RelayNotice />}
        <div className="grid gap-4 md:grid-cols-2">
          <Panel className="p-4">
            <H icon={<Trophy size={18} />}>Modo</H>
            <div className="grid grid-cols-2 gap-2">
              <Choice on={s.mode === 'classic'} onClick={() => up({ mode: 'classic' })} title="Clásico" sub="Gana quien tenga más 💎 al final" />
              <Choice on={s.mode === 'race'} onClick={() => up({ mode: 'race' })} title="Carrera" sub="Primero en llegar a la meta" />
            </div>
            {s.mode === 'race' && (
              <div className="mt-3 flex flex-wrap gap-2">{[500, 1000, 2000, 3000].map((g) => <Pill key={g} on={s.goal === g} onClick={() => up({ goal: g })}>{g} 💎</Pill>)}</div>
            )}
            <H icon={<Clock size={18} />} className="mt-4">Duración</H>
            <div className="flex flex-wrap gap-2">{[3, 5, 8, 10, 15, 20].map((m) => <Pill key={m} on={s.minutes === m} onClick={() => up({ minutes: m })}>{m} min</Pill>)}</div>
            <H icon={<Users size={18} />} className="mt-4">Máximo de jugadores: <span className="text-[#ffd23f]">{s.maxPlayers}</span></H>
            <input type="range" min={4} max={60} value={s.maxPlayers} onChange={(e) => up({ maxPlayers: Number(e.target.value) })} className="w-full accent-[#ffd23f]" aria-label="Máximo de jugadores" />
            <H icon={<Bot size={18} />} className="mt-4">Bots de relleno</H>
            <div className="flex flex-wrap gap-2">{[0, 3, 6, 10].map((b) => <Pill key={b} on={s.bots === b} onClick={() => up({ bots: b })}>{b === 0 ? 'Ninguno' : b}</Pill>)}</div>
            <label className="mt-4 flex cursor-pointer items-center gap-3 rounded-2xl bg-white/5 p-3">
              <input type="checkbox" checked={s.teacherPlays} onChange={(e) => up({ teacherPlays: e.target.checked })} className="h-5 w-5 accent-[#30d158]" />
              <div className="flex-1"><div className="font-extrabold">Yo también juego</div><div className="text-[12.5px] font-semibold text-white/60">El proyector muestra tu personaje (puedes cambiar a vista general).</div></div>
              {s.teacherPlays && <button type="button" onClick={(e) => { e.preventDefault(); setPicking(true); }} className="flex items-center gap-1 rounded-xl bg-white/10 px-2 py-1"><span className="h-9 w-9 overflow-hidden"><Toon ci={s.teacherChar} size={40} className="-mt-1" /></span><Pencil size={14} /></button>}
            </label>
          </Panel>
          <Panel className="p-4">
            <H icon={<ListChecks size={18} />}>Preguntas</H>
            <div className="grid grid-cols-2 gap-2">
              <Choice on={s.source === 'curriculum'} onClick={() => up({ source: 'curriculum' })} title="Del curso" sub="Banco de ECYR por nivel" />
              <Choice on={s.source === 'set'} onClick={() => up({ source: 'set' })} title="Mis preguntas" sub="Tus sets personalizados" />
            </div>
            {s.source === 'curriculum' ? (
              <>
                <div className="mt-3 flex flex-wrap gap-2">{LEVELS.map((l) => <Pill key={l} on={s.level === l} onClick={() => up({ level: l, units: [] })}>{l}</Pill>)}</div>
                <div className="mt-3 text-[13px] font-bold text-white/60">Unidades (vacío = todo el nivel)</div>
                <div className="cw-scroll mt-1 flex max-h-[190px] flex-wrap gap-1.5 overflow-y-auto">
                  {units.map(([n, title]) => {
                    const on = s.units.includes(n);
                    return <button key={n} type="button" onClick={() => up({ units: on ? s.units.filter((u) => u !== n) : [...s.units, n].sort((a, b) => a - b) })} className={cn('rounded-xl px-2.5 py-1 text-left text-[12.5px] font-bold', on ? 'bg-[#ffd23f] text-[#2a1d00]' : 'bg-white/8 text-white/80 hover:bg-white/15')}>{n}. {title}</button>;
                  })}
                </div>
              </>
            ) : (
              <div className="mt-3 flex flex-col gap-2">
                {sets === null ? <Loading text="Cargando tus sets…" /> : sets.length === 0 ? (
                  <p className="text-[14px] font-semibold text-white/65">{setsErr ? `No se pudieron cargar tus sets (${setsErr}).` : 'Aún no tienes sets.'}</p>
                ) : sets.map((x) => (
                  <button key={x.id} type="button" onClick={() => up({ setId: x.id })} className={cn('flex items-center gap-3 rounded-xl p-2.5 text-left', s.setId === x.id ? 'bg-[#ffd23f] text-[#2a1d00]' : 'bg-white/8 hover:bg-white/15')}>
                    <span className="rounded-lg bg-black/20 px-2 py-0.5 text-[12px] font-black">{x.level}</span>
                    <span className="flex-1 truncate font-extrabold">{x.title}</span>
                    <span className="text-[12px] font-bold opacity-70">{x.items.length} preg.</span>
                  </button>
                ))}
                <Link to="/classwars/preguntas" className="text-[14px] font-extrabold text-[#7ab8ff] hover:underline">✏️ Crear o editar mis preguntas</Link>
              </div>
            )}
            <div className="mt-4 rounded-xl bg-black/25 px-3 py-2 text-[14px] font-bold">{qCount} preguntas disponibles</div>
          </Panel>
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 flex justify-center bg-gradient-to-t from-[#0e1230] via-[#0e1230]/90 to-transparent px-4 pt-8 pb-[max(16px,env(safe-area-inset-bottom))]">
        <Btn big tone="green" className="w-full max-w-[420px]" disabled={!live || busy || qCount < 1} onClick={create}><Gamepad2 /> Crear sala</Btn>
      </div>
    </div>
  );
}

export function RelayNotice() {
  return (
    <div className="mb-4 rounded-2xl border-2 border-[#ff9f0a]/60 bg-[#ff9f0a]/15 p-3 text-[14px] font-semibold text-[#ffd8a0]">
      ⚠️ El servidor de juego en vivo no está configurado en este despliegue (falta <code className="rounded bg-black/30 px-1">VITE_RELAY_URL</code>). Las partidas en vivo no funcionarán; el <Link to="/classwars/demo" className="font-extrabold underline">modo demo</Link> sí.
    </div>
  );
}

function H({ children, icon, className }: { children: React.ReactNode; icon: React.ReactNode; className?: string }) {
  return <div className={cn('mb-2 flex items-center gap-2 text-[15px] font-black tracking-wide text-white/90 uppercase', className)}>{icon}{children}</div>;
}
function Choice({ on, onClick, title, sub }: { on: boolean; onClick: () => void; title: string; sub: string }) {
  return (
    <button type="button" onClick={onClick} className={cn('rounded-2xl border-[3px] p-3 text-left transition-colors', on ? 'border-[#ffd23f] bg-[#ffd23f]/15' : 'border-white/10 bg-white/5 hover:border-white/25')}>
      <div className="text-[16px] font-black">{title}</div>
      <div className="text-[12.5px] font-semibold text-white/65">{sub}</div>
    </button>
  );
}
function Pill({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return <button type="button" onClick={onClick} className={cn('h-10 rounded-xl px-4 text-[15px] font-extrabold', on ? 'bg-[#ffd23f] text-[#2a1d00] shadow-[0_3px_0_#c79a00]' : 'bg-white/10 hover:bg-white/15')}>{children}</button>;
}

/* ---------------------------------------------------------------- lobby+ */
function HostLive({ host, me, cfg, onRematch, onExit }: { host: HostSession; me: ClientSession | null; cfg: Setup; onRematch: () => void; onExit: () => void }) {
  useSessionKey(host, () => `${host.phase}|${host.saved}|${[...host.lobby.values()].map((p) => p.peer + p.char).join(',')}`);
  useSessionKey(me, () => `${me?.phase}`);
  const nav = useNavigate();
  const [view, setView] = useState<'play' | 'watch'>('play');
  const code = host.cfg.code;
  const url = `${location.origin}/classwars/join/${code}`;

  if (host.phase === 'lobby') return <Lobby host={host} url={url} cfg={cfg} onExit={() => { onExit(); nav('/classwars'); }} />;
  if (host.phase === 'ended') {
    const saved = host.saved === 'saved' ? '✅ Puntos de carta guardados.' : host.saved === 'saving' ? 'Guardando puntos…' : host.saved === 'error' ? '⚠️ No se pudieron guardar los puntos de carta.' : '';
    return <Podium results={host.results} myIdx={me ? me.myIdx : -1} saved={saved} onAgain={onRematch} againLabel="Revancha (mismo código)" onExit={() => { onExit(); nav('/classwars'); }} />;
  }
  const playing = me && me.phase === 'playing' && view === 'play';
  return (
    <div className="relative h-full w-full">
      {playing ? <GameView key="p" client={me!} onExit={() => setView('watch')} goal={host.cfg.goal || undefined} /> : <GameView key="w" host={host} code={code} onExit={onExit} goal={host.cfg.goal || undefined} />}
      {me && (
        <button type="button" onClick={() => setView(view === 'play' ? 'watch' : 'play')} className="absolute bottom-3 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-[#141a3f]/85 px-4 py-2 text-[13px] font-extrabold text-white shadow-lg hover:bg-[#141a3f]" style={playing ? { bottom: 100 } : undefined}>
          {view === 'play' ? <><Eye size={16} /> Vista general</> : <><Swords size={16} /> Volver a jugar</>}
        </button>
      )}
    </div>
  );
}

function Lobby({ host, url, cfg, onExit }: { host: HostSession; url: string; cfg: Setup; onExit: () => void }) {
  const code = host.cfg.code;
  const qr = useMemo(() => {
    const q = qrcode(0, 'M');
    q.addData(url);
    q.make();
    const n = q.getModuleCount();
    let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) d += `M${c},${r}h1v1h-1z`;
    return { d, n };
  }, [url]);
  const players = [...host.lobby.values()];
  const canStart = players.length > 0 || host.cfg.bots > 0;
  return (
    <div className="flex h-full flex-col lg:flex-row">
      <div className="flex shrink-0 flex-col items-center justify-center gap-4 bg-gradient-to-b from-[#2b377d] to-[#1a2156] p-5 lg:w-[42%] lg:p-8">
        <div className="flex w-full items-center justify-between">
          <button type="button" onClick={() => { if (confirm('¿Cerrar la sala?')) onExit(); }} className="flex items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-[13px] font-bold hover:bg-white/20"><X size={15} /> Cerrar</button>
          <div className="text-[13px] font-bold text-white/60">{host.cfg.source}</div>
        </div>
        <div className="cw-title text-[30px] lg:text-[38px]">⚔️ Class Wars</div>
        <div className="text-center text-[16px] font-bold text-white/75 lg:text-[19px]">Entra a <span className="text-[#ffd23f]">{location.host}/classwars</span> y usa el código</div>
        <div className="rounded-[28px] bg-white px-8 py-3 text-[64px] leading-none font-black tracking-[0.12em] text-[#1b2350] shadow-[0_8px_0_#b9c2e6] lg:text-[96px]" aria-label={`Código ${code}`}>{code}</div>
        <div className="flex items-center gap-4">
          <svg viewBox={`-2 -2 ${qr.n + 4} ${qr.n + 4}`} className="h-[150px] w-[150px] rounded-2xl bg-white lg:h-[210px] lg:w-[210px]" shapeRendering="crispEdges" role="img" aria-label={`Código QR: ${url}`}><path d={qr.d} fill="#141a3f" /></svg>
          <div className="max-w-[200px] text-[14px] font-semibold text-white/70">o escanea el QR con el celular 📱</div>
        </div>
        <div className="flex flex-wrap justify-center gap-2 text-[13px] font-bold">
          <span className="rounded-full bg-black/25 px-3 py-1">⏱ {cfg.minutes} min</span>
          <span className="rounded-full bg-black/25 px-3 py-1">{cfg.mode === 'race' ? `🏁 Meta ${cfg.goal} 💎` : '🏆 Más diamantes gana'}</span>
          {host.cfg.bots > 0 && <span className="rounded-full bg-black/25 px-3 py-1">🤖 {host.cfg.bots} bots</span>}
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col p-4 lg:p-8">
        <div className="mb-3 flex items-center gap-3">
          <div className="cw-title text-[26px]">Jugadores</div>
          <div className="rounded-full bg-[#ffd23f] px-3 py-0.5 text-[16px] font-black text-[#2a1d00]">{players.length} / {host.cfg.maxPlayers}</div>
          <Btn big tone="green" className="ml-auto" disabled={!canStart} onClick={() => host.start()}>¡Empezar! ▶</Btn>
        </div>
        <div className="cw-scroll grid min-h-0 flex-1 auto-rows-max grid-cols-3 gap-3 overflow-y-auto sm:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
          <AnimatePresence>
            {players.map((p) => (
              <motion.div key={p.peer} layout initial={{ scale: 0.3, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.3, opacity: 0 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}
                className="group relative flex flex-col items-center rounded-2xl border-2 border-white/10 bg-[#232d6b] pt-2 pb-2">
                <button type="button" onClick={() => host.kick(p.peer)} className="absolute top-1 right-1 hidden h-7 w-7 place-items-center rounded-full bg-[#ff4d5e] group-hover:grid" aria-label={`Expulsar a ${p.name}`}><X size={15} /></button>
                <div className="cw-bob" style={{ animationDelay: `${(p.char % 5) * 0.2}s` }}><Toon ci={p.char} size={86} /></div>
                <div className="mt-1 w-full truncate px-2 text-center text-[14px] font-black">{p.name}</div>
                <div className="truncate px-2 text-[11px] font-bold text-white/55">{POWERS[TEACHERS[p.char].id].icon} {TEACHERS[p.char].name}</div>
              </motion.div>
            ))}
          </AnimatePresence>
          {players.length === 0 && (
            <div className="col-span-full flex flex-col items-center gap-2 py-16 text-center">
              <div className="cw-float text-[56px]">📱</div>
              <div className="text-[18px] font-bold text-white/70">Esperando a que se unan los estudiantes…</div>
            </div>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2 text-[13px] font-semibold text-white/55"><Diamond size={14} /> Todos empiezan con 1200 ⚡ de energía: caminar y disparar la gastan y solo se recarga respondiendo · los diamantes salen de las cajas sorpresa (se reactivan a los 10 s) · noquear a un rival le roba diamantes.</div>
      </div>
    </div>
  );
}
