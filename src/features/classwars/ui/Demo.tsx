/* Class Wars — solo demo against bots on one device. The host and the player both live in this
   tab and talk through the relay's in-memory "DEMO" bus, so it exercises the real netcode
   without any network. */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { makeCode, makeId } from '@/lib/relay';
import { cn } from '@/lib/cn';
import { HostSession } from '../game/host';
import { ClientSession } from '../game/client';
import { LEVELS, curriculumQuestions, shuffleOptions, type Level } from '../game/questions';
import { CharacterPicker } from './CharacterPicker';
import { GameView } from './GameView';
import { Podium } from './Podium';
import { Loading } from './kit';

export function DemoScreen() {
  const profile = useAuth((s) => s.profile);
  const nav = useNavigate();
  const [char, setChar] = useState(() => { try { const v = Number(localStorage.getItem('cw:char')); return Number.isFinite(v) && v >= 0 && v < 25 ? v : 7; } catch { return 7; } });
  const [level, setLevel] = useState<Level>(() => { try { return (localStorage.getItem('cw:demoLevel') as Level) || 'A2'; } catch { return 'A2'; } });
  const [minutes, setMinutes] = useState(5);
  const [run, setRun] = useState(0);
  const [pair, setPair] = useState<{ host: HostSession; client: ClientSession } | null>(null);
  const [, force] = useState(0);

  useEffect(() => {
    if (!run) return;
    let cancelled = false;
    let made: { host: HostSession; client: ClientSession } | null = null;
    let offs: (() => void)[] = [];
    let wait: ReturnType<typeof setInterval> | undefined;
    void (async () => {
      const qs = shuffleOptions(await curriculumQuestions(level));
      if (cancelled) return;
      const code = 'DEMO' + makeCode();
      const host = new HostSession({ code, matchId: makeId(), durationMin: minutes, startEnergy: 1200, goal: 0, maxPlayers: 1, questions: qs, source: `Demo ${level}`, bots: 7, demo: true, hostName: 'Demo' });
      const name = (profile?.full_name ?? 'Tú').split(' ')[0];
      const client = new ClientSession(code, 'me' + makeId().slice(0, 6), name, char, null);
      made = { host, client };
      let last = '';
      const onBump = () => { const k = client.phase; if (k !== last) { last = k; force((n) => n + 1); } };
      offs = [host.subscribe(onBump), client.subscribe(onBump)];
      // start as soon as the host sees us in its lobby
      wait = setInterval(() => { if (host.lobby.size > 0) { clearInterval(wait); host.start(); } }, 50);
      setPair(made);
      if (import.meta.env.DEV) (window as unknown as { __cw: unknown }).__cw = made;
    })();
    return () => {
      cancelled = true;
      if (made) {
        clearInterval(wait);
        offs.forEach((f) => f());
        made.client.close();
        made.host.close();
      }
      setPair(null);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run]);

  if (run && pair) {
    const { client } = pair;
    if (client.phase === 'playing') return <GameView client={client} onExit={() => setRun(0)} />;
    if (client.phase === 'ended') return <Podium results={client.results} myIdx={client.myIdx} saved="Demo: los puntos de carta no se guardan." onAgain={() => setRun((r) => r + 1)} againLabel="Jugar otra vez" onExit={() => setRun(0)} exitLabel="Menú" />;
    return <div className="grid h-full place-items-center"><Loading text="Preparando el campo…" /></div>;
  }
  if (run) return <div className="grid h-full place-items-center"><Loading text="Preparando el campo…" /></div>;

  return (
    <div className="flex h-full flex-col p-3 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => nav('/classwars')} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Volver"><ArrowLeft /></button>
        <div>
          <h1 className="cw-title text-[24px] leading-tight sm:text-[30px]">Demo contra bots</h1>
          <p className="text-[13px] font-semibold text-white/60">Elige personaje y nivel de las preguntas.</p>
        </div>
        <div className="cw-scroll -mx-1 flex w-full items-center gap-1.5 overflow-x-auto px-1 pb-1 sm:ml-auto sm:w-auto">
          {LEVELS.map((l) => (
            <button key={l} type="button" onClick={() => { setLevel(l); try { localStorage.setItem('cw:demoLevel', l); } catch { /* ignore */ } }} className={cn('h-9 shrink-0 rounded-xl px-3 text-[14px] font-black', level === l ? 'bg-[#ffd23f] text-[#2a1d00]' : 'bg-white/10')}>{l}</button>
          ))}
          <span className="mx-1 h-6 w-px shrink-0 bg-white/20" />
          {[3, 5, 8].map((m) => (
            <button key={m} type="button" onClick={() => setMinutes(m)} className={cn('h-9 shrink-0 rounded-xl px-3 text-[14px] font-black', minutes === m ? 'bg-white text-[#1b2350]' : 'bg-white/10')}>{m}′</button>
          ))}
        </div>
      </div>
      <CharacterPicker value={char} onChange={(c) => { setChar(c); try { localStorage.setItem('cw:char', String(c)); } catch { /* ignore */ } }} onConfirm={() => setRun((r) => r + 1)} confirmLabel="¡Jugar!" />
      <Link to="/classwars" className="sr-only">Volver</Link>
    </div>
  );
}
