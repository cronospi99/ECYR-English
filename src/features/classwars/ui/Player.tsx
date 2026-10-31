/* Class Wars — student side: join with a code → pick a character in the lobby → play → podium. */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Pencil, Users } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { isDemoCode, makeId, relayConfigured } from '@/lib/relay';
import { TEACHERS } from '@/features/cards/teachers';
import { ClientSession } from '../game/client';
import { POWERS } from '../game/defs';
import { CharacterPicker } from './CharacterPicker';
import { GameView } from './GameView';
import { Podium } from './Podium';
import { Btn, GameIcon, Loading, Panel, Toon, useSessionKey } from './kit';
import { t, tx } from '../i18n';
import { RelayNotice } from './Host';

const CODE_RE = /^[A-Z0-9]{4,8}$/;
const savedChar = () => { try { const v = Number(localStorage.getItem('cw:char')); return Number.isFinite(v) && v >= 0 && v < TEACHERS.length ? v : Math.floor(Math.random() * TEACHERS.length); } catch { return 0; } };
const saveChar = (c: number) => { try { localStorage.setItem('cw:char', String(c)); } catch { /* ignore */ } };

export function JoinScreen() {
  const { code: codeParam } = useParams();
  const profile = useAuth((s) => s.profile);
  const nav = useNavigate();
  const [code, setCode] = useState((codeParam ?? '').toUpperCase());
  const [name, setName] = useState(() => { try { return sessionStorage.getItem('cw:name') ?? ''; } catch { return ''; } });
  const [editName, setEditName] = useState(false);
  useEffect(() => { if (profile?.full_name && !name) setName(profile.full_name); }, [profile, name]);
  const ok = CODE_RE.test(code) && name.trim().length >= 2;
  const go = () => {
    if (!ok) return;
    try { sessionStorage.setItem('cw:name', name.trim()); } catch { /* ignore */ }
    nav(`/classwars/play/${code}`);
  };
  return (
    <div className="grid h-full place-items-center overflow-y-auto p-4">
      <Panel className="w-full max-w-[420px] p-6">
        <div className="mb-4 flex items-center gap-3">
          <Link to="/classwars" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={t('Back', 'Volver')}><ArrowLeft /></Link>
          <h1 className="cw-title text-[26px]">{t('Join', 'Unirme')}</h1>
        </div>
        {!relayConfigured() && <RelayNotice />}
        <label className="text-[13px] font-extrabold tracking-wide text-white/60 uppercase" htmlFor="cw-code">{t('Game code', 'Código de la partida')}</label>
        <input id="cw-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="ABCD" autoCapitalize="characters" autoComplete="off"
          className="mt-1 h-16 w-full rounded-2xl border-[3px] border-white/15 bg-white text-center text-[38px] font-black tracking-[0.2em] text-[#1b2350] outline-none focus:border-[#ffd23f]" onKeyDown={(e) => e.key === 'Enter' && go()} />
        <div className="mt-4 text-[13px] font-extrabold tracking-wide text-white/60 uppercase">{t('Your name', 'Tu nombre')}</div>
        {profile?.full_name && !editName ? (
          <div className="mt-1 flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3">
            <span className="flex-1 truncate text-[18px] font-extrabold">{name}</span>
            <button type="button" onClick={() => setEditName(true)} className="flex items-center gap-1 text-[13px] font-bold text-white/70 hover:text-white"><Pencil size={14} /> {t('Change', 'Cambiar')}</button>
          </div>
        ) : (
          <input value={name} onChange={(e) => setName(e.target.value.slice(0, 24))} placeholder={t('First and last name', 'Nombre y apellido')} className="mt-1 h-12 w-full rounded-2xl border-[3px] border-white/15 bg-white px-4 text-[18px] font-bold text-[#1b2350] outline-none focus:border-[#ffd23f]" onKeyDown={(e) => e.key === 'Enter' && go()} aria-label={t('Your name', 'Tu nombre')} />
        )}
        {!profile && <p className="mt-2 text-[12.5px] font-semibold text-white/55">{t('Playing as a guest: card points are not saved.', 'Juegas como invitado: tus puntos de carta no se guardan.')} <Link to="/profile" className="underline">{t('Sign in', 'Inicia sesión')}</Link> {t('to keep them.', 'para guardarlos.')}</p>}
        <Btn big tone="green" className="mt-5 w-full" disabled={!ok} onClick={go}>{t('Join!', '¡Entrar!')}</Btn>
      </Panel>
    </div>
  );
}

export function PlayScreen() {
  const { code: raw } = useParams();
  const code = (raw ?? '').toUpperCase();
  const ready = useAuth((s) => s.ready);
  const uid = useAuth((s) => s.session?.user.id ?? null);
  const nav = useNavigate();
  const name = (() => { try { return sessionStorage.getItem('cw:name') ?? ''; } catch { return ''; } })();
  const [client, setClient] = useState<ClientSession | null>(null);
  const [char, setChar] = useState(savedChar);
  const [picking, setPicking] = useState(false);
  const [timedOut, setTimedOut] = useState(false);
  useSessionKey(client, () => `${client?.phase}|${client?.lobby.map((l) => l.peer + l.char).join(',')}`);

  useEffect(() => {
    if (!ready) return;
    if (!name || !CODE_RE.test(code) || isDemoCode(code)) { nav(`/classwars/join/${code}`, { replace: true }); return; }
    let peer = '';
    try { peer = sessionStorage.getItem('cw:peer:' + code) ?? ''; } catch { /* ignore */ }
    if (!peer) { peer = 'p' + makeId(); try { sessionStorage.setItem('cw:peer:' + code, peer); } catch { /* ignore */ } }
    const c = new ClientSession(code, peer, name, savedChar(), uid);
    setClient(c);
    if (import.meta.env.DEV) (window as unknown as { __cwClient: unknown }).__cwClient = c;
    const t = setTimeout(() => setTimedOut(true), 6000);
    return () => { clearTimeout(t); c.close(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, ready]);

  if (!client) return <div className="grid h-full place-items-center"><Loading /></div>;
  if (client.phase === 'playing') return <GameView client={client} onExit={() => nav('/classwars')} goal={client.goal || undefined} />;
  if (client.phase === 'ended') return <Podium results={client.results} myIdx={client.myIdx} onExit={() => nav('/classwars')} exitLabel={t('Leave', 'Salir')} />;
  if (client.phase === 'kicked' || client.phase === 'full') return (
    <div className="grid h-full place-items-center p-4"><Panel className="max-w-[400px] p-6 text-center">
      <div className="text-[44px]"><GameIcon k={client.phase === 'full' ? 'robot' : 'flag'} size={52} className="mx-auto" /></div>
      <h1 className="cw-title mt-2 text-[24px]">{client.phase === 'full' ? t('The room is full', 'La sala está llena') : t('You left the room', 'Saliste de la sala')}</h1>
      <Link to="/classwars"><Btn className="mt-4">{t('Back', 'Volver')}</Btn></Link>
    </Panel></div>
  );
  if (client.phase === 'connecting') return (
    <div className="grid h-full place-items-center p-4 text-center">
      <div>
        <Loading text={t(`Looking for room ${code}…`, `Buscando la sala ${code}…`)} />
        {timedOut && <div className="mt-2 max-w-[340px] text-[14px] font-semibold text-white/70">{t('Room not found. Check the code or ask your teacher to open it.', 'No encontramos la sala. Revisa el código o pide al profe que la abra.')} <Link to={`/classwars/join/${code}`} className="font-extrabold text-[#ffd23f] underline">{t('Change code', 'Cambiar código')}</Link></div>}
      </div>
    </div>
  );

  // lobby
  if (picking) return (
    <div className="flex h-full flex-col p-3 sm:p-5">
      <div className="mb-3 flex items-center gap-3"><button type="button" onClick={() => setPicking(false)} className="grid h-10 w-10 place-items-center rounded-full bg-white/10" aria-label={t('Back', 'Volver')}><ArrowLeft /></button><h1 className="cw-title text-[24px]">{t('Choose your character', 'Elige tu personaje')}</h1></div>
      <CharacterPicker value={char} onChange={(c) => { setChar(c); saveChar(c); client.pick(c); }} onConfirm={() => setPicking(false)} />
    </div>
  );
  const pw = POWERS[TEACHERS[char].id];
  return (
    <div className="cw-scroll flex h-full flex-col items-center overflow-y-auto px-4 pt-[max(16px,env(safe-area-inset-top))] pb-8">
      <div className="text-[13px] font-extrabold tracking-wider text-white/55 uppercase">{t('Room', 'Sala')} {code}</div>
      <motion.h1 initial={{ scale: 0.8 }} animate={{ scale: 1 }} className="cw-title mt-1 text-center text-[30px]">{t(`You're in, ${client.name.split(' ')[0]}!`, `¡Estás dentro, ${client.name.split(' ')[0]}!`)}</motion.h1>
      <p className="text-[15px] font-bold text-white/65">{t('Wait for your teacher to start the game…', 'Espera a que el profe empiece la partida…')}</p>
      <button type="button" onClick={() => setPicking(true)} className="group relative mt-4 flex flex-col items-center rounded-[28px] border-[3px] border-[#ffd23f]/70 bg-gradient-to-b from-[#2b377d] to-[#1b2257] px-8 pt-4 pb-4">
        <div className="cw-bob"><Toon ci={char} size={130} live /></div>
        <div className="cw-title text-[24px]">{TEACHERS[char].name}</div>
        <div className="mt-1 flex items-center gap-2 rounded-full px-3 py-1 text-[14px] font-extrabold" style={{ background: pw.color + '55' }}><GameIcon k={pw.ic} size={20} /> {tx(pw.name)}</div>
        <div className="mt-3 flex items-center gap-1.5 rounded-full bg-[#ffd23f] px-4 py-1.5 text-[14px] font-black text-[#2a1d00] shadow-[0_4px_0_#c79a00]"><Pencil size={14} /> {t('Change character', 'Cambiar personaje')}</div>
      </button>
      <div className="mt-6 flex w-full max-w-[640px] items-center gap-2 text-[15px] font-black"><Users size={18} /> {t(`${client.lobby.length} in the room`, `${client.lobby.length} en la sala`)}</div>
      <div className="mt-2 grid w-full max-w-[640px] grid-cols-4 gap-2 sm:grid-cols-6">
        {client.lobby.map((p) => (
          <div key={p.peer} className="flex flex-col items-center rounded-xl bg-white/5 py-1">
            <div className="h-[52px] overflow-hidden"><Toon ci={p.char} size={50} /></div>
            <div className="w-full truncate px-1 text-center text-[11.5px] font-extrabold">{p.name}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
