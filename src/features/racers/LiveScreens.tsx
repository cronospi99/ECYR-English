/* English Racers — live class mode screens: the landing (teacher or student), joining with a code,
   the teacher's projector screen (QR, settings, students, a TV camera on the race, live scores,
   results and the session podium) and the student's waiting room, live score, results and podium. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Check, ChevronLeft, ChevronRight, Coins, Flag, Home, Music, Pause, Play, Shuffle, SkipForward, Square, Trophy, Users, Volume2, VolumeX, Wifi, WifiOff, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TOONS } from '@/features/toons3d/runtime';
import { GameTitle } from '@/components/brand/GameTitle';
import { GameLangToggle } from '@/components/GameLangToggle';
import { JoinQr } from '@/components/ui/JoinQr';
import { makeCode, makeId, relayConfigured } from '@/lib/relay';
import { t, useGameLang } from '@/lib/gameLang';
import { RUN_LEVELS } from '@/features/run/questions';
import { MAX_BOTS, MAX_LAPS, RaceGame, fmt, ordinal, type Hud } from './engine';
import { TRACKS, trackInfo, type TrackId } from './tracks';
import { GP_NEXT_S, RacersHost, RacersClient, cleanName, type LivePlayer, type LivePub } from './live';
import { SCORE } from './racer';
import { CSS, Btn, Dot, PLACE_COL, Seg, Stepper, Toggle, initialToon, useClient } from './ui';
import { prefs, setPref, unlock } from './audio';

const toonOf = (id: string) => TOONS.find((x) => x.id === id) ?? TOONS[0];
const tname = (o: { en: string; es: string }) => (t('en', 'es') === 'en' ? o.en : o.es);
const savedName = () => { try { return localStorage.getItem('racers:name') ?? ''; } catch { return ''; } };
const store = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="rc-root relative h-dvh w-full overflow-hidden select-none" style={{ background: 'linear-gradient(135deg,#10204a 0%,#3b1d7a 55%,#ff3d6e 120%)' }}>
      <style>{CSS}</style>
      {children}
    </div>
  );
}
function Rule({ className }: { className?: string }) {
  return (
    <div className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] font-extrabold', className)}>
      <span className="text-[#7dff9a]">✓ +{SCORE.right}</span>
      <span className="text-[#ff8a8a]">✗ {SCORE.wrong}</span>
      <span className="inline-flex items-center gap-1 text-[#ffd23f]"><Coins size={14} /> +{SCORE.coin}</span>
      <span className="text-white/60">{t('fewest mistakes + most coins wins', 'gana quien menos se equivoca + más monedas')}</span>
    </div>
  );
}
function SoundToggles({ onChange }: { onChange: () => void }) {
  return (
    <>
      <Toggle on={prefs.music} onClick={() => { setPref('music', !prefs.music); onChange(); }} label={t('Music', 'Música')}><Music size={19} /></Toggle>
      <Toggle on={prefs.sfx} onClick={() => { setPref('sfx', !prefs.sfx); onChange(); }} label={t('Sound effects', 'Efectos')}>{prefs.sfx ? <Volume2 size={19} /> : <VolumeX size={19} />}</Toggle>
    </>
  );
}

/* ------------------------------------------------------------------ landing */
export function LiveClassHome() {
  useGameLang();
  useEffect(() => { requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready'))); }, []);
  return (
    <Shell>
      <div className="rc-scroll h-full px-4 pt-[max(14px,env(safe-area-inset-top))] pb-10">
        <div className="mx-auto flex max-w-[760px] flex-col items-center">
          <div className="flex w-full items-center justify-between">
            <Link to="/racers" className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12 hover:bg-white/20" aria-label={t('Back', 'Volver')}><ArrowLeft /></Link>
            <GameLangToggle />
          </div>
          <GameTitle word="RACERS" theme="racers" className="mt-2 h-auto w-[260px] sm:w-[380px]" />
          <div className="mt-1 rounded-full bg-[#ffd23f] px-4 py-1 text-[15px] font-black text-[#2a1d00]">{t('LIVE WITH YOUR CLASS', 'EN VIVO CON TU CLASE')}</div>
          <p className="mt-3 max-w-[560px] text-center text-[16px] font-bold text-white/85">
            {t('The teacher opens a room on the projector, the students scan the QR and everybody races together: a Grand Prix on random tracks, points adding up race after race. Every gate is a question.', 'El profe abre una sala en el proyector, los estudiantes escanean el QR y todos corren juntos: un Gran Premio en pistas al azar, con puntos que se suman carrera tras carrera. Cada arco es una pregunta.')}
          </p>
          <div className="rc-panel mt-4 px-4 py-2.5"><Rule /></div>
          <div className="mt-5 grid w-full max-w-[540px] gap-3 sm:grid-cols-2">
            <Link to="/racers/host"><Btn tone="yellow" className="h-16 w-full text-[19px]">{t("I'm the teacher", 'Soy el profe')}</Btn></Link>
            <Link to="/racers/join"><Btn tone="white" className="h-16 w-full text-[19px]">{t('Join with a code', 'Unirme con código')}</Btn></Link>
          </div>
          <div className="mt-6 grid w-full gap-3 sm:grid-cols-3">
            {[
              { n: 1, h: t('Scan and pick', 'Escanea y elige'), p: t('Name and teacher-driver on your phone, in seconds.', 'Nombre y profe-piloto en tu celular, en segundos.') },
              { n: 2, h: t('Race together', 'Corran juntos'), p: t('You see your classmates on the track. Items hit them too!', 'Ves a tus compañeros en la pista. ¡Los objetos también les pegan!') },
              { n: 3, h: t('Answer well', 'Responde bien'), p: t('Drive through the right answer. Mistakes cost points, coins add them.', 'Pasa por la respuesta correcta. Los errores restan, las monedas suman.') },
            ].map((x) => (
              <div key={x.n} className="rc-panel p-4">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-[#ff3d6e] text-[17px] font-black">{x.n}</div>
                <div className="mt-2 text-[18px] font-black">{x.h}</div>
                <div className="text-[14px] font-semibold text-white/75">{x.p}</div>
              </div>
            ))}
          </div>
          {!relayConfigured() && <p className="mt-4 rounded-2xl bg-black/30 px-4 py-3 text-center text-[14px] font-bold">{t('The live game server is not set up in this deployment (VITE_RELAY_URL).', 'El servidor de juego en vivo no está configurado en este despliegue (VITE_RELAY_URL).')}</p>}
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ join */
export function LiveJoin() {
  useGameLang();
  const { code: param } = useParams();
  const nav = useNavigate();
  const [code, setCode] = useState((param ?? '').toUpperCase());
  const [name, setName] = useState(savedName);
  const [toon, setToon] = useState(initialToon);
  useEffect(() => { requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready'))); }, []);
  const ok = /^[A-Z0-9]{4,8}$/.test(code) && cleanName(name).length >= 2;
  const go = () => { if (!ok) return; store('racers:name', cleanName(name)); store('racers:toon', toon); nav(`/racers/live/${code}`); };
  const i = TOONS.findIndex((x) => x.id === toon), cur = toonOf(toon);
  const pick = (d: number) => setToon(TOONS[(i + d + TOONS.length) % TOONS.length].id);
  return (
    <Shell>
      <div className="grid h-full place-items-center overflow-y-auto p-4">
        <div className="rc-panel w-full max-w-[440px] p-5">
          <div className="mb-3 flex items-center gap-3">
            <Link to="/racers/class" className="grid h-10 w-10 place-items-center rounded-2xl bg-white/12" aria-label={t('Back', 'Volver')}><ArrowLeft /></Link>
            <h1 className="text-[26px] font-black">{t('Join the race', 'Unirme a la carrera')}</h1>
          </div>
          <label htmlFor="rc-code" className="text-[12px] font-extrabold tracking-wide text-white/60 uppercase">{t('Room code', 'Código de la sala')}</label>
          <input id="rc-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="ABCD" autoCapitalize="characters" autoComplete="off" onKeyDown={(e) => e.key === 'Enter' && go()}
            className="mt-1 h-16 w-full rounded-2xl border-[3px] border-white/20 bg-white text-center text-[38px] font-black tracking-[0.2em] text-[#10204a] outline-none focus:border-[#ffd23f]" />
          <label htmlFor="rc-name" className="mt-4 block text-[12px] font-extrabold tracking-wide text-white/60 uppercase">{t('Your name', 'Tu nombre')}</label>
          <input id="rc-name" value={name} onChange={(e) => setName(e.target.value.slice(0, 18))} placeholder={t('Your name', 'Tu nombre')} autoFocus={!!param} onKeyDown={(e) => e.key === 'Enter' && go()}
            className="mt-1 h-12 w-full rounded-2xl border-[3px] border-white/20 bg-white px-4 text-[18px] font-extrabold text-[#10204a] outline-none focus:border-[#ffd23f]" />
          <div className="mt-4 text-[12px] font-extrabold tracking-wide text-white/60 uppercase">{t('Your driver', 'Tu piloto')}</div>
          <div className="mt-1 flex items-center gap-2">
            <button type="button" onClick={() => pick(-1)} className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12" aria-label={t('Previous', 'Anterior')}><ChevronLeft /></button>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-2 rounded-2xl bg-white/8 py-2.5 text-[19px] font-black"><Dot color={cur.color} size={14} /><span className="truncate">{cur.name}</span></div>
            <button type="button" onClick={() => pick(1)} className="grid h-11 w-11 place-items-center rounded-2xl bg-white/12" aria-label={t('Next', 'Siguiente')}><ChevronRight /></button>
          </div>
          <Btn tone="green" className="mt-5 h-14 w-full text-[20px]" disabled={!ok} onClick={go}>{t('Join!', '¡Entrar!')}</Btn>
        </div>
      </div>
    </Shell>
  );
}

/* ------------------------------------------------------------------ student */
export function LivePlayRoute({ Screen }: { Screen: (p: { client: RacersClient }) => ReactNode }) {
  const { code = '' } = useParams();
  const nav = useNavigate();
  const [client, setClient] = useState<RacersClient | null>(null);
  useEffect(() => {
    const name = savedName();
    if (cleanName(name).length < 2) { nav(`/racers/join/${code}`, { replace: true }); return; }
    let peer = '';
    try { peer = sessionStorage.getItem('racers:peer:' + code) ?? ''; } catch { /* ignore */ }
    if (!peer) { peer = 'p' + makeId(); try { sessionStorage.setItem('racers:peer:' + code, peer); } catch { /* ignore */ } }
    const c = new RacersClient(code.toUpperCase(), peer, cleanName(name), initialToon());
    setClient(c);
    if (import.meta.env.DEV) (window as unknown as { __rcc: unknown }).__rcc = c;
    return () => c.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);
  useClient(client);
  if (!client) return null;
  if (client.status !== 'ok') {
    return (
      <Shell>
        <div className="grid h-full place-items-center p-6 text-center">
          <div>
            <div className="text-[24px] font-black">{client.status === 'kicked' ? t('The teacher removed you from the room', 'El profe te sacó de la sala') : t('The room is full', 'La sala está llena')}</div>
            <Link to="/racers/class" className="mt-4 inline-block"><Btn tone="white">{t('Back', 'Volver')}</Btn></Link>
          </div>
        </div>
      </Shell>
    );
  }
  return <Screen client={client} />;
}

/** A countdown that re-renders itself while the next race is scheduled. */
function useCountdown(at: number) {
  const [, force] = useState(0);
  useEffect(() => { if (!at) return; const id = setInterval(() => force((n) => n + 1), 500); return () => clearInterval(id); }, [at]);
  return at ? Math.max(0, Math.ceil((at - Date.now()) / 1000)) : 0;
}
/** "Grand Prix · race 2 of 4" (or null for a single race). */
function gpLabel(pub: LivePub | null) {
  const gp = pub?.gp; if (!gp) return null;
  return `${t('Grand Prix', 'Gran Premio')} · ${t('race', 'carrera')} ${Math.max(1, gp.round)} ${t('of', 'de')} ${gp.tracks.length}`;
}
/** What comes next in the Grand Prix, with the seconds left. */
function GpNext({ client }: { client: RacersClient }) {
  const secs = useCountdown(client.nextAt), gp = client.pub?.gp;
  if (!gp || client.pub?.ph !== 'results') return null;
  const more = gp.round < gp.tracks.length, nxt = more ? trackInfo(gp.tracks[gp.round]) : null;
  return (
    <div className="mt-2 flex items-center justify-center gap-2 rounded-xl bg-[#ffd23f] px-3 py-2 text-[14px] font-black text-[#2a1d00]">
      {more ? <><Flag size={16} />{t('Next', 'Siguiente')}: {tname(nxt!.name)} ({gp.round + 1}/{gp.tracks.length})</> : <><Trophy size={16} />{t('Grand Prix podium', 'Podio del Gran Premio')}</>}
      {secs > 0 && <span className="rounded-full bg-black/15 px-2 tabular-nums">{secs} s</span>}
    </div>
  );
}

/** The student's waiting room (over the 3D view of their kart). */
export function LiveLobby({ client, driver, onPick, gasSeg }: { client: RacersClient; driver: { name: string; color: string }; onPick: (d: number) => void; gasSeg: ReactNode }) {
  useGameLang();
  const [, force] = useState(0);
  const pub = client.pub;
  const me = pub?.players.find((p) => p.peer === client.peer);
  const others = (pub?.players ?? []).filter((p) => p.online);
  let status: ReactNode;
  if (client.net !== 'open' || !pub) status = <>{t('Connecting to room', 'Conectando a la sala')} <b>{client.code}</b>…</>;
  else if (pub.ph === 'race') status = pub.gp ? t('A Grand Prix race is on. You will join the next one!', 'Hay una carrera del Gran Premio en curso. ¡Entras en la siguiente!') : t('A race is on. You will join the next one!', 'Hay una carrera en curso. ¡Entras en la siguiente!');
  else if (pub.ph === 'results' || pub.ph === 'podium') status = t('Results on the big screen. Get ready for the next race!', 'Resultados en la pantalla grande. ¡Prepárate para la siguiente!');
  else status = pub.set.mode === 'gp' ? t("You're in! Your teacher will start the Grand Prix: several tracks, points add up.", '¡Ya estás! Tu profe va a empezar el Gran Premio: varias pistas, los puntos se suman.') : t("You're in! Your teacher will start the race.", '¡Ya estás! Tu profe va a empezar la carrera.');
  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col p-3 pt-[max(12px,env(safe-area-inset-top))] pb-[max(12px,env(safe-area-inset-bottom))] sm:p-5">
      <div className="pointer-events-auto flex items-center gap-2">
        <Link to="/racers/class" className="grid h-11 w-11 place-items-center rounded-2xl bg-[#10204a]/60 text-white hover:bg-[#10204a]/80" aria-label={t('Leave', 'Salir')}><ArrowLeft /></Link>
        <div className="rc-panel flex items-center gap-2 px-3 py-2 text-[14px] font-black">{client.net === 'open' ? <Wifi size={16} className="text-[#7dff9a]" /> : <WifiOff size={16} className="text-[#ff8a8a]" />}{t('Room', 'Sala')} {client.code}</div>
        <div className="ml-auto flex gap-1.5"><GameLangToggle /><SoundToggles onChange={() => force((n) => n + 1)} /></div>
      </div>
      <div className="pointer-events-auto rc-panel rc-scroll mt-auto flex max-h-[calc(100dvh-90px)] w-full max-w-[460px] flex-col gap-2.5 self-center p-3 sm:self-start">
        <div className="flex items-center gap-2">
          <button type="button" onClick={() => onPick(-1)} disabled={client.racing} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/12 hover:bg-white/22" aria-label={t('Previous', 'Anterior')}><ChevronLeft /></button>
          <div className="min-w-0 flex-1 text-center">
            <div className="text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{client.name}</div>
            <div className="flex items-center justify-center gap-2 truncate text-[20px] font-black"><Dot color={driver.color} size={14} />{driver.name}</div>
          </div>
          <button type="button" onClick={() => onPick(1)} disabled={client.racing} className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/12 hover:bg-white/22" aria-label={t('Next', 'Siguiente')}><ChevronRight /></button>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white/8 px-3 py-2.5 text-[15px] font-black">
          <span className="relative flex h-3 w-3 shrink-0"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#7dff9a] opacity-70" /><span className="relative inline-flex h-3 w-3 rounded-full bg-[#2fd27a]" /></span>
          <span>{status}</span>
        </div>
        {me && me.total !== 0 && <div className="flex items-center gap-2 px-1 text-[14px] font-black"><Trophy size={16} className="text-[#ffd23f]" />{t('Your points so far', 'Tus puntos hasta ahora')}: {me.total}</div>}
        <Rule className="px-1" />
        {gasSeg}
        {others.length > 0 && (
          <div className="flex flex-wrap gap-1.5 [@media(max-height:520px)]:hidden">
            <span className="flex items-center gap-1 text-[12px] font-extrabold text-white/60"><Users size={14} /> {others.length}</span>
            {others.slice(0, 30).map((p) => <span key={p.peer} className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[12px] font-extrabold', p.peer === client.peer ? 'bg-white text-[#10204a]' : 'bg-white/10')}><Dot color={toonOf(p.toon).color} size={9} />{p.name}</span>)}
          </div>
        )}
      </div>
    </div>
  );
}

/** Live score in the race HUD: mine, and the best ones (tall screens). */
export function LiveScore({ live }: { live: NonNullable<Hud['live']> }) {
  const rows = live.rows, mine = rows.findIndex((r) => r.me);
  const top = rows.slice(0, 5);
  return (
    <div className="absolute top-[86px] left-3 flex flex-col gap-1 sm:top-[96px] sm:left-4">
      <div className="rc-panel flex items-center gap-2 px-2.5 py-1.5 text-[13px] font-black">
        <span className="rc-num text-[22px] leading-none text-[#ffd23f]">{live.score}</span>
        <span className="text-[#7dff9a]">✓{live.right}</span><span className="text-[#ff8a8a]">✗{live.wrong}</span>
        <span className="inline-flex items-center gap-0.5 text-[#ffd23f]"><Coins size={13} />{live.bank}</span>
      </div>
      <div className="hidden flex-col gap-1 [@media(min-height:560px)]:flex">
        {top.map((r, i) => (
          <div key={i} className={cn('flex h-[24px] w-[170px] items-center gap-1.5 rounded-lg px-1.5 text-[12.5px] font-extrabold', r.me ? 'bg-white text-[#10204a]' : 'bg-[#10204a]/55 text-white')}>
            <span className="w-4 text-right tabular-nums">{i + 1}</span><Dot color={r.color} size={10} /><span className="min-w-0 flex-1 truncate">{r.name}</span><span className="tabular-nums">{r.score}</span>
          </div>
        ))}
        {mine >= 5 && <div className="flex h-[24px] w-[170px] items-center gap-1.5 rounded-lg bg-white px-1.5 text-[12.5px] font-extrabold text-[#10204a]"><span className="w-4 text-right tabular-nums">{mine + 1}</span><Dot color={rows[mine].color} size={10} /><span className="min-w-0 flex-1 truncate">{rows[mine].name}</span><span className="tabular-nums">{rows[mine].score}</span></div>}
      </div>
    </div>
  );
}

function ResultTable({ rows, me }: { rows: { peer: string; name: string; toon: string; right: number; wrong: number; bank: number; score: number; total: number; place: number }[]; me?: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2 px-2 text-[11px] font-extrabold tracking-wide text-white/50 uppercase">
        <span className="w-5" /><span className="min-w-0 flex-1">{t('Driver', 'Piloto')}</span><span className="w-7 text-center">✓</span><span className="w-7 text-center">✗</span><span className="w-8 text-center"><Coins size={12} className="inline" /></span><span className="w-12 text-right">{t('Pts', 'Pts')}</span><span className="w-12 text-right">{t('Total', 'Total')}</span>
      </div>
      {rows.map((r) => (
        <div key={r.peer} className={cn('flex items-center gap-2 rounded-lg px-2 py-1 text-[13.5px] font-bold tabular-nums', r.peer === me ? 'bg-white text-[#10204a]' : 'bg-white/6')}>
          <span className="w-5 text-right font-black" style={{ color: r.peer === me ? undefined : PLACE_COL[r.place - 1] }}>{r.place}</span>
          <span className="flex min-w-0 flex-1 items-center gap-1.5"><Dot color={toonOf(r.toon).color} size={10} /><span className="truncate">{r.name}</span></span>
          <span className="w-7 text-center text-[#16a34a]">{r.right}</span><span className="w-7 text-center text-[#ef4444]">{r.wrong}</span><span className="w-8 text-center">{r.bank}</span>
          <b className="w-12 text-right">{r.score}</b><span className="w-12 text-right opacity-80">{r.total}</span>
        </div>
      ))}
    </div>
  );
}

/** A student's results: own score and questions, then the class table from the teacher. */
export function LiveResults({ client, hud }: { client: RacersClient; hud: Hud }) {
  useGameLang();
  const [review, setReview] = useState(false);
  const res = client.results, live = hud.live, rv = hud.results?.review ?? [];
  const mine = res?.find((r) => r.peer === client.peer);
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="absolute inset-x-0 bottom-0 flex justify-center p-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:top-0 sm:items-center sm:justify-end sm:p-5">
      <div className="rc-panel rc-scroll flex max-h-[calc(100dvh-24px)] w-full max-w-[460px] flex-col p-4">
        {mine ? (
          <div className="flex items-end justify-center gap-2">
            <span className="rc-num text-[50px] leading-none" style={{ color: PLACE_COL[mine.place - 1] ?? '#fff' }}>{ordinal(mine.place)}</span>
            <span className="mb-1 text-[15px] font-black text-white/75">{t('of', 'de')} {res!.length}</span>
          </div>
        ) : <div className="rc-num text-center text-[32px] text-[#ffd23f]">{hud.results && hud.results.laps.length >= hud.laps ? t('FINISH!', '¡META!') : t("TIME'S UP!", '¡SE ACABÓ!')}</div>}
        {live && (
          <div className="mt-1 flex items-center justify-center gap-3 text-[16px] font-black">
            <span className="text-[#7dff9a]">✓ {live.right}</span><span className="text-[#ff8a8a]">✗ {live.wrong}</span>
            <span className="inline-flex items-center gap-1 text-[#ffd23f]"><Coins size={16} /> {live.bank}</span>
            <span className="rc-num text-[24px]">= {live.score}</span>
          </div>
        )}
        {hud.results && <div className="text-center text-[12.5px] font-bold text-white/60">{gpLabel(client.pub) && <>{gpLabel(client.pub)} · </>}{tname(trackInfo(hud.track).name)} · {fmt(hud.results.total)}</div>}
        {hud.results && hud.results.earned > 0 && <div className="mt-1 flex items-center justify-center gap-1.5 text-[13px] font-black text-[#ffe27a]"><Coins size={15} />+{hud.results.earned} {t('coins for the garage', 'monedas para el garaje')}</div>}
        <div className="mt-2.5">
          {res ? <ResultTable rows={res} me={client.peer} /> : (
            <div className="rounded-xl bg-white/8 px-3 py-2.5 text-center text-[14px] font-bold text-white/80">
              {t('Waiting for your classmates…', 'Esperando a tus compañeros…')}{client.pub && client.pub.left > 0 && <b className="ml-1 text-[#ffd23f]">{Math.ceil(client.pub.left / 1000)} s</b>}
            </div>
          )}
        </div>
        {rv.length > 0 && (
          <div className="mt-2.5">
            <button type="button" onClick={() => setReview((v) => !v)} className="flex w-full items-center justify-between rounded-xl bg-white/8 px-3 py-2 text-[13.5px] font-black">
              <span>{t('My questions', 'Mis preguntas')}: <span className="text-[#7dff9a]">{rv.filter((r) => r.ok).length} ✓</span> · <span className="text-[#ff8a8a]">{rv.filter((r) => !r.ok).length} ✗</span></span>
              <span className="text-white/60">{review ? t('Hide', 'Ocultar') : t('Review', 'Repasar')}</span>
            </button>
            {review && (
              <div className="mt-1 flex flex-col gap-1">
                {rv.map((r, i) => (
                  <div key={i} className="rounded-xl bg-white/6 px-2.5 py-1.5 text-[12.5px] font-semibold">
                    <div className="flex items-start gap-1.5 font-black">{r.ok ? <Check size={15} className="mt-0.5 shrink-0 text-[#7dff9a]" /> : <X size={15} className="mt-0.5 shrink-0 text-[#ff8a8a]" />}{r.q}</div>
                    <div className="pl-5 text-white/75">{r.ok ? r.a : <>{t('You', 'Tú')}: <s>{r.picked}</s> · {t('Answer', 'Respuesta')}: <b className="text-[#7dff9a]">{r.a}</b></>}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        <GpNext client={client} />
        {!client.pub?.gp && <div className="mt-3 text-center text-[12.5px] font-bold text-white/60">{t('Your teacher starts the next race from the big screen.', 'Tu profe empieza la siguiente carrera desde la pantalla grande.')}</div>}
      </div>
    </motion.div>
  );
}

function TotalsList({ players, me }: { players: LivePlayer[]; me?: string }) {
  const rows = [...players].sort((a, b) => b.total - a.total);
  return (
    <div className="flex flex-col gap-0.5">
      {rows.map((p, i) => (
        <div key={p.peer} className={cn('flex items-center gap-2 rounded-lg px-2 py-1 text-[14px] font-bold', p.peer === me ? 'bg-white text-[#10204a]' : 'bg-white/6')}>
          <span className="w-5 text-right font-black tabular-nums" style={{ color: p.peer === me ? undefined : PLACE_COL[i] }}>{i + 1}</span><Dot color={toonOf(p.toon).color} size={11} />
          <span className="min-w-0 flex-1 truncate">{p.name}</span><b className="tabular-nums">{p.total} {t('pts', 'pts')}</b>
        </div>
      ))}
    </div>
  );
}

export function LivePodium({ client }: { client: RacersClient }) {
  useGameLang();
  const players = (client.pub?.players ?? []).map((p) => ({ ...p, total: client.totals?.[p.peer] ?? p.total }));
  return (
    <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }} className="absolute inset-x-0 bottom-0 flex justify-center p-3 pb-[max(12px,env(safe-area-inset-bottom))] sm:top-0 sm:left-auto sm:items-center sm:p-5">
      <div className="rc-panel rc-scroll max-h-[48dvh] w-full max-w-[460px] p-4 sm:max-h-[calc(100dvh-24px)] sm:w-[360px]">
        <div className="rc-num text-center text-[26px] text-[#ffd23f] sm:text-[32px]">{client.pub?.gp ? t('GRAND PRIX PODIUM', 'PODIO DEL GRAN PREMIO') : t('CLASS PODIUM', 'PODIO DE LA CLASE')}</div>
        <div className="mt-2"><TotalsList players={players} me={client.peer} /></div>
      </div>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ teacher */
export function LiveHostRoute() {
  const [host, setHost] = useState<RacersHost | null>(null);
  useEffect(() => {
    if (!relayConfigured()) return;
    const h = new RacersHost(makeCode());
    setHost(h);
    if (import.meta.env.DEV) (window as unknown as { __rch: unknown }).__rch = h;
    return () => h.close();
  }, []);
  useEffect(() => { requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready'))); }, []);
  if (!relayConfigured()) return <Shell><div className="grid h-full place-items-center p-6 text-center text-[18px] font-bold">{t('The live game server is not set up.', 'El servidor de juego en vivo no está configurado.')}</div></Shell>;
  if (!host) return null;
  return <HostScreen host={host} />;
}

function useHost(h: RacersHost) {
  const [, force] = useState(0);
  useEffect(() => h.subscribe(() => force((n) => n + 1)), [h]);
}

function HostScreen({ host }: { host: RacersHost }) {
  useGameLang();
  useHost(host);
  const div = useRef<HTMLDivElement>(null);
  const [game, setGame] = useState<RaceGame | null>(null);
  const [hud, setHud] = useState<Hud | null>(null);
  const [, force] = useState(0);
  const [err, setErr] = useState(false);
  useEffect(() => {
    const prev = document.title;
    document.title = 'English Racers · Live';
    let g: RaceGame | null = null;
    try {
      g = new RaceGame(div.current!, { toon: TOONS[0].id, live: 'spectator' });
      g.onHud = setHud;
      const gg = g;
      host.onStart = (cfg) => { unlock(); gg.startLive(cfg, null); };
      host.onSnap = (l) => gg.liveSnapshot(l);
      host.onLobby = () => gg.liveLobby();
      host.onPodium = (tot) => gg.livePodium(tot);
      setGame(g);
      if (import.meta.env.DEV) (window as unknown as { __racers: unknown }).__racers = g;
    } catch { setErr(true); }
    return () => { document.title = prev; host.onStart = host.onSnap = host.onLobby = host.onPodium = null; g?.dispose(); };
  }, [host]);

  const ph = host.phase, set = host.set, online = host.online;
  const live = ph === 'race' ? host.live() : [];
  const ti = host.cfg ? trackInfo(host.cfg.track) : null;
  const left = Math.ceil(host.left / 1000);
  return (
    <div className="rc-root relative h-dvh w-full overflow-hidden select-none" onPointerDown={unlock}>
      <style>{CSS}</style>
      <div ref={div} className="absolute inset-0" />
      {err && <div className="absolute inset-0 grid place-items-center bg-[#10204a] text-[18px] font-bold">{t('This browser cannot show 3D (WebGL).', 'Este navegador no puede mostrar 3D (WebGL).')}</div>}

      {/* top bar */}
      <div className="pointer-events-none absolute inset-x-0 top-0 flex items-start gap-2 p-3 sm:p-4">
        <Link to="/racers/class" className="pointer-events-auto grid h-11 w-11 place-items-center rounded-2xl bg-[#10204a]/60 text-white hover:bg-[#10204a]/80" aria-label={t('Exit', 'Salir')}><ArrowLeft /></Link>
        <div className="pointer-events-auto rc-panel flex items-center gap-2 px-2 py-1.5">
          <JoinQr path="/racers/join" code={host.code} size={40} label={t('Show the QR full screen', 'Mostrar el QR en grande')} />
          <div className="pr-1"><div className="text-[11px] font-extrabold text-white/60 uppercase">{t('Code', 'Código')}</div><div className="text-[22px] leading-none font-black tracking-[0.12em]">{host.code}</div></div>
          <span className={cn('ml-1 h-2.5 w-2.5 rounded-full', host.net === 'open' ? 'bg-[#2fd27a]' : 'bg-[#ff8a8a]')} title={host.net} />
        </div>
        {ph === 'race' && ti && (
          <div className="rc-panel px-3 py-1.5">
            <div className="text-[11px] font-extrabold tracking-wide text-white/60 uppercase">{host.gp ? `${t('Grand Prix', 'Gran Premio')} · ${t('race', 'carrera')} ${host.gp.round}/${host.gp.tracks.length}` : `${t('Race', 'Carrera')} ${host.race}`} · {host.cfg!.laps} {t('laps', 'vueltas')}</div>
            <div className="text-[18px] leading-tight font-black" style={{ color: ti.color }}>{tname(ti.name)}</div>
          </div>
        )}
        {ph === 'race' && left > 0 && <div className="rc-panel animate-[rc-pulse_1s_infinite] px-3 py-2 text-[18px] font-black text-[#ffd23f]">{t('Ends in', 'Termina en')} {left} s</div>}
        <div className="pointer-events-auto ml-auto flex gap-1.5"><GameLangToggle /><SoundToggles onChange={() => force((n) => n + 1)} /></div>
      </div>

      {/* lobby: QR, settings and the students */}
      {ph === 'lobby' && (
        <div className="absolute inset-0 overflow-y-auto bg-[#0a1230]/45 p-3 pt-[76px] sm:p-5 sm:pt-[84px]">
          <div className="mx-auto grid max-w-[1180px] gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
            <div className="rc-panel flex flex-col items-center gap-3 p-5 text-center">
              <div className="text-[15px] font-black text-white/80">{t('Scan to join', 'Escanea para entrar')}</div>
              <JoinQr path="/racers/join" code={host.code} size={230} label={t('Show the QR full screen', 'Mostrar el QR en grande')} />
              <div className="rounded-2xl bg-white px-5 py-1 text-[46px] leading-none font-black tracking-[0.15em] text-[#10204a]">{host.code}</div>
              <div className="text-[14px] font-bold text-white/70">{location.host}/racers/join</div>
              <div className="rc-panel w-full px-3 py-2"><Rule className="justify-center" /></div>
            </div>
            <div className="rc-panel flex flex-col gap-3 p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <div><div className="mb-1 px-1 text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{t('Mode', 'Modo')}</div>
                  <Seg<'gp' | 'single'> value={set.mode} onChange={(m) => host.configure({ mode: m })} options={[{ id: 'gp', label: t('Grand Prix', 'Gran Premio') }, { id: 'single', label: t('One race', 'Una carrera') }]} /></div>
                {set.mode === 'gp' && <div><div className="mb-1 px-1 text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{t('Races', 'Carreras')}</div>
                  <Seg value={String(set.races) as '4'} onChange={(v) => host.configure({ races: Number(v) })} options={['3', '4', '5', '6'].map((v) => ({ id: v as '4', label: v }))} /></div>}
              </div>
              {set.mode === 'gp' ? (
                <div className="rounded-2xl bg-white/8 p-2.5">
                  <div className="mb-1.5 flex items-center justify-between gap-2 px-0.5">
                    <span className="text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{host.gpOn ? t('Grand Prix in progress', 'Gran Premio en curso') : t('Random tracks', 'Pistas al azar')}</span>
                    {!host.gpOn && <button type="button" onClick={() => host.shuffle()} className="inline-flex items-center gap-1 rounded-full bg-white/14 px-2.5 py-1 text-[12px] font-black hover:bg-white/24"><Shuffle size={13} /> {t('Shuffle', 'Otras pistas')}</button>}
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {(host.gp && host.gpOn ? host.gp.tracks : host.plan).map((id, i) => { const tr = trackInfo(id); const done = !!host.gp && host.gpOn && i < host.gp.round; return (
                      <span key={id + i} className={cn('inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[12.5px] font-extrabold', done && 'opacity-45')}>
                        <span className="grid h-4 w-4 place-items-center rounded-full text-[10px] text-[#10204a]" style={{ background: tr.color }}>{done ? <Check size={11} /> : i + 1}</span>{tname(tr.name)}
                      </span>
                    ); })}
                  </div>
                  <div className="mt-1.5 px-0.5 text-[12px] font-bold text-white/60">{t(`Each race starts by itself ${GP_NEXT_S} s after the results (you can pause it). Points add up; podium at the end.`, `Cada carrera empieza sola ${GP_NEXT_S} s después de los resultados (puedes pausar). Los puntos se suman; podio al final.`)}</div>
                </div>
              ) : (
              <div>
                <div className="mb-1 px-1 text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{t('Track', 'Pista')}</div>
                <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
                  {[{ id: 'random' as const, color: '#ffffff', name: { en: 'Random', es: 'Al azar' } }, ...TRACKS].map((tr) => (
                    <button key={tr.id} type="button" onClick={() => host.configure({ track: tr.id as TrackId | 'random' })} aria-pressed={set.track === tr.id}
                      className={cn('flex min-w-0 items-center gap-2 rounded-2xl px-2.5 py-2 text-left text-[13.5px] font-black transition-colors', set.track === tr.id ? 'bg-white text-[#10204a]' : 'bg-white/8 hover:bg-white/14')}>
                      <span className="h-6 w-1.5 shrink-0 rounded-full" style={{ background: tr.color }} /><span className="truncate">{tname(tr.name)}</span>
                    </button>
                  ))}
                </div>
              </div>
              )}
              <div className="grid gap-2 sm:grid-cols-2">
                <div><div className="mb-1 px-1 text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{t('English level', 'Nivel de inglés')}</div>
                  <Seg value={set.level} onChange={(l) => host.configure({ level: l })} options={RUN_LEVELS.map((l) => ({ id: l.id, label: l.id }))} /></div>
                <div><div className="mb-1 px-1 text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{t('Laps', 'Vueltas')}</div>
                  <Stepper value={set.laps} min={1} max={MAX_LAPS} onChange={(laps) => host.configure({ laps })} label={t('Laps', 'Vueltas')} /></div>
                <div><div className="mb-1 px-1 text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{t('Bots on every phone', 'Bots en cada celular')}</div>
                  <Stepper value={set.bots} min={0} max={MAX_BOTS} onChange={(bots) => host.configure({ bots })} label={t('Bots', 'Bots')} /></div>
                <div><div className="mb-1 px-1 text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{t('Items', 'Objetos')}</div>
                  <Seg value={set.items ? 'on' : 'off'} onChange={(v) => host.configure({ items: v === 'on' })} options={[{ id: 'on', label: t('On', 'Sí') }, { id: 'off', label: t('Off', 'No') }]} /></div>
                <div><div className="mb-1 px-1 text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase">{t('After the first finishes', 'Tras el primero en llegar')}</div>
                  <Seg value={String(set.wait) as '30'} onChange={(v) => host.configure({ wait: Number(v) })} options={['30', '45', '60', '90'].map((v) => ({ id: v as '30', label: `${v} s` }))} /></div>
              </div>
              <div>
                <div className="mb-1 flex items-center gap-1.5 px-1 text-[11.5px] font-extrabold tracking-wide text-white/60 uppercase"><Users size={14} /> {t('Students', 'Estudiantes')} ({online.length})</div>
                {online.length === 0 ? <div className="rounded-2xl bg-white/6 px-3 py-4 text-center text-[14px] font-bold text-white/60">{t('Waiting for students… they scan the QR or type the code.', 'Esperando estudiantes… escanean el QR o escriben el código.')}</div> : (
                  <div className="flex flex-wrap gap-1.5">
                    {online.map((p) => (
                      <span key={p.peer} className="inline-flex items-center gap-1.5 rounded-full bg-white/10 py-1 pr-1 pl-2.5 text-[13.5px] font-extrabold">
                        <Dot color={toonOf(p.toon).color} size={10} />{p.name}{p.total !== 0 && <span className="text-[#ffd23f]">{p.total}</span>}
                        <button type="button" onClick={() => host.kick(p.peer)} className="grid h-5 w-5 place-items-center rounded-full bg-white/10 hover:bg-[#ff4757]" aria-label={`${t('Remove', 'Quitar')} ${p.name}`}><X size={12} /></button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <div className="mt-auto flex gap-2">
                <Btn tone="green" className="h-14 flex-1 text-[20px]" disabled={!online.length || host.net !== 'open'} onClick={() => { unlock(); host.start(); }}><Play size={22} fill="currentColor" /> {set.mode !== 'gp' ? t('START RACE', 'EMPEZAR CARRERA') : host.gpOn ? `${t('CONTINUE', 'SEGUIR')} · ${host.gp!.round + 1}/${host.gp!.tracks.length}` : t('START GRAND PRIX', 'EMPEZAR GRAN PREMIO')}</Btn>
                {host.race > 0 && <Btn tone="ghost" className="h-14" onClick={() => host.podium()}><Trophy size={19} /> {t('Podium', 'Podio')}</Btn>}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* race: countdown, live scores (click a name to follow it), minimap, end button */}
      {ph === 'race' && hud && (
        <>
          {hud.state === 'countdown' && hud.count <= 3 && hud.count >= 1 && <div className="rc-num pointer-events-none absolute top-[30%] left-1/2 -translate-x-1/2 text-[#ffd23f]" style={{ fontSize: 'min(140px, 22vh)' }}>{hud.count}</div>}
          <div className="absolute top-[74px] right-3 bottom-3 flex w-[min(330px,46vw)] flex-col gap-2 sm:top-[84px] sm:right-4">
            <div className="rc-panel rc-scroll flex min-h-0 flex-col gap-0.5 p-2">
              <div className="flex items-center justify-between px-1 pb-1 text-[12px] font-extrabold text-white/60 uppercase"><span>{t('Live score', 'Puntaje en vivo')}</span>{hud.live?.focus && <span className="normal-case">🎥 {hud.live.focus}</span>}</div>
              {live.map((r, i) => (
                <button key={r.peer} type="button" onClick={() => game?.watch(r.peer)} className={cn('flex items-center gap-1.5 rounded-lg px-1.5 py-1 text-left text-[13.5px] font-bold tabular-nums hover:bg-white/14', hud.live?.focus === r.name ? 'bg-white/16' : 'bg-white/5', !r.online && 'opacity-50')}>
                  <span className="w-5 text-right font-black" style={{ color: PLACE_COL[i] }}>{i + 1}</span><Dot color={toonOf(r.toon).color} size={10} />
                  <span className="min-w-0 flex-1 truncate">{r.name}</span>
                  {r.fin && <Flag size={13} className="text-[#7dff9a]" />}
                  <span className="text-[#7dff9a]">{r.right}</span><span className="text-[#ff8a8a]">{r.wrong}</span><span className="text-[#ffd23f]">{r.bank}</span>
                  <b className="w-11 text-right">{r.score}</b>
                </button>
              ))}
            </div>
            <Btn tone="white" className="shrink-0" onClick={() => host.endRace()}><Square size={17} fill="currentColor" /> {t('End race', 'Terminar carrera')}</Btn>
          </div>
          <svg viewBox="-8 -8 116 116" className="absolute bottom-3 left-3 h-[130px] w-[130px] drop-shadow-[0_2px_4px_rgba(0,0,0,.35)] sm:h-[170px] sm:w-[170px]">
            <path d={hud.mapPath} fill="none" stroke="#10204a" strokeWidth={9} strokeLinejoin="round" opacity={0.75} />
            <path d={hud.mapPath} fill="none" stroke="#fff" strokeWidth={4.5} strokeLinejoin="round" />
            {hud.dots.map((d, i) => <circle key={i} cx={d.x * 100} cy={d.z * 100} r={4} fill={d.color} stroke="#10204a" strokeWidth={1.5} />)}
          </svg>
        </>
      )}

      {/* results of the race */}
      {ph === 'results' && host.results && (
        <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-[#0a1230]/55 p-3 pt-[76px]">
          <div className="rc-panel w-full max-w-[640px] p-4">
            <div className="rc-num text-center text-[30px] text-[#ffd23f]">{t('RESULTS', 'RESULTADOS')} · {host.gp ? `${host.gp.round}/${host.gp.tracks.length}` : `${t('Race', 'Carrera')} ${host.race}`}</div>
            {ti && <div className="mb-2 text-center text-[13px] font-bold text-white/65">{host.gp ? `${t('Grand Prix', 'Gran Premio')} · ` : ''}{tname(ti.name)}</div>}
            <ResultTable rows={host.results} />
            <Rule className="mt-2 justify-center" />
            {host.gp ? (
              <div className="mt-3 flex flex-wrap gap-2">
                <Btn tone={host.gpOn ? 'green' : 'yellow'} className="min-w-[220px] flex-1" onClick={() => host.next()}>
                  {host.gpOn ? <><SkipForward size={19} /> {t('Next', 'Siguiente')}: {tname(trackInfo(host.gpNext!).name)} ({host.gp.round + 1}/{host.gp.tracks.length})</> : <><Trophy size={19} /> {t('Grand Prix podium', 'Podio del Gran Premio')}</>}
                  {host.nextAt > 0 && <span className="rounded-full bg-black/15 px-2 py-0.5 text-[14px] tabular-nums">{Math.ceil(host.nextIn / 1000)} s</span>}
                </Btn>
                {host.nextAt > 0 && <Btn tone="white" onClick={() => host.hold()}><Pause size={18} /> {t('Wait', 'Esperar')}</Btn>}
                {host.gpOn && <Btn tone="ghost" onClick={() => host.podium()}><Trophy size={19} /> {t('End here', 'Terminar aquí')}</Btn>}
              </div>
            ) : (
              <div className="mt-3 flex gap-2">
                <Btn tone="green" className="flex-1" onClick={() => host.toLobby()}><Flag size={19} /> {t('Next race', 'Siguiente carrera')}</Btn>
                <Btn tone="yellow" onClick={() => host.podium()}><Trophy size={19} /> {t('Final podium', 'Podio final')}</Btn>
              </div>
            )}
          </div>
        </div>
      )}

      {/* session podium */}
      {ph === 'podium' && (
        <div className="absolute inset-x-0 bottom-0 flex justify-center p-3 sm:top-0 sm:left-auto sm:items-center sm:p-5">
          <div className="rc-panel rc-scroll max-h-[50dvh] w-full max-w-[460px] p-4 sm:max-h-[calc(100dvh-110px)] sm:w-[380px]">
            <div className="rc-num text-center text-[28px] text-[#ffd23f]">{host.gp ? t('GRAND PRIX PODIUM', 'PODIO DEL GRAN PREMIO') : t('CLASS PODIUM', 'PODIO DE LA CLASE')}</div>
            <div className="mt-2"><TotalsList players={host.ranking()} /></div>
            <div className="mt-3 flex gap-2">
              <Btn tone="green" className="flex-1" onClick={() => host.toLobby()}><Flag size={19} /> {host.set.mode === 'gp' ? t('New Grand Prix', 'Nuevo Gran Premio') : t('Another race', 'Otra carrera')}</Btn>
              <Link to="/racers/class"><Btn tone="ghost"><Home size={19} /></Btn></Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
