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
import { curriculumQuestions, savePick, savedPick, shuffleOptions, type Pick } from '../game/questions';
import { BOT_LEVELS, type Game } from '../game/constants';
import { UnitPicker } from './UnitPicker';
import { BOT_LEVEL_NAMES } from './Host';
import { GameIcon } from './kit';
import type { IconKey } from '../game/icons';

interface DemoSet { game: Game; bots: number; botLevel: number; minutes: number }
const DEMO_KEY = 'cw:demoSet';
const loadSet = (): DemoSet => {
  const d: DemoSet = { game: 'arena', bots: 7, botLevel: 0, minutes: 5 };
  try { const v = JSON.parse(localStorage.getItem(DEMO_KEY) || '{}'); return { game: ['arena', 'paint', 'kb'].includes(v.game) ? v.game : d.game, bots: Math.min(20, Math.max(1, Number(v.bots) || d.bots)), botLevel: Math.min(2, Math.max(0, Number(v.botLevel) || 0)), minutes: [3, 5, 8].includes(v.minutes) ? v.minutes : d.minutes }; } catch { return d; }
};
const GAME_INFO: Record<Game, { ic: IconKey; name: [string, string] }> = {
  arena: { ic: 'gem', name: ['Classic', 'Clásico'] }, paint: { ic: 'splat', name: ['Color Clash', 'Color Clash'] }, kb: { ic: 'launch', name: ['Knockback', 'Knockback'] },
};
import { CharacterPicker } from './CharacterPicker';
import { GameView } from './GameView';
import { Podium } from './Podium';
import { Loading } from './kit';
import { t } from '../i18n';

export function DemoScreen() {
  const profile = useAuth((s) => s.profile);
  const nav = useNavigate();
  const [char, setChar] = useState(() => { try { const v = Number(localStorage.getItem('cw:char')); return Number.isFinite(v) && v >= 0 && v < 25 ? v : 7; } catch { return 7; } });
  const [pick, setPick] = useState<Pick>(() => savedPick() ?? { lv: 'A2', un: 0 });
  const [set, setSet] = useState<DemoSet>(loadSet);
  const up = (p: Partial<DemoSet>) => setSet((o) => { const n = { ...o, ...p }; try { localStorage.setItem(DEMO_KEY, JSON.stringify(n)); } catch { /* ignore */ } return n; });
  const [showSet, setShowSet] = useState(false);
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
      const qs = shuffleOptions(await curriculumQuestions(pick.lv, pick.un ? [pick.un] : []));
      if (cancelled) return;
      const code = 'DEMO' + makeCode();
      const host = new HostSession({
        code, matchId: makeId(), durationMin: set.minutes, startEnergy: 1200, goal: 0, maxPlayers: 1, questions: qs, source: `Demo ${pick.lv}${pick.un ? ' · U' + pick.un : ''}`,
        bots: set.bots, demo: true, hostName: 'Demo', game: set.game, teams: 2, botLevel: set.botLevel,
      });
      const name = (profile?.full_name ?? t('You', 'Tú')).split(' ')[0];
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
    if (client.phase === 'ended') return <Podium results={client.results} myIdx={client.myIdx} saved={t('Demo: card points are not saved.', 'Demo: los puntos de carta no se guardan.')} onAgain={() => setRun((r) => r + 1)} againLabel={t('Play again', 'Jugar otra vez')} onExit={() => setRun(0)} exitLabel={t('Menu', 'Menú')} />;
    return <div className="grid h-full place-items-center"><Loading text={t('Getting the field ready…', 'Preparando el campo…')} /></div>;
  }
  if (run) return <div className="grid h-full place-items-center"><Loading text={t('Getting the field ready…', 'Preparando el campo…')} /></div>;

  return (
    <div className="flex h-full flex-col p-3 sm:p-5">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <button type="button" onClick={() => nav('/classwars')} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label={t('Back', 'Volver')}><ArrowLeft /></button>
        <div>
          <h1 className="cw-title text-[24px] leading-tight sm:text-[30px]">{t('Demo vs bots', 'Demo contra bots')}</h1>
          <p className="text-[13px] font-semibold text-white/60">{t('Choose a character and the question level.', 'Elige personaje y nivel de las preguntas.')}</p>
        </div>
        <button type="button" onClick={() => setShowSet((v) => !v)} className="flex items-center gap-2 rounded-2xl bg-white/10 px-3 py-2 text-[13.5px] font-extrabold hover:bg-white/15 sm:ml-auto">
          <GameIcon k={GAME_INFO[set.game].ic} size={20} /> {t(...GAME_INFO[set.game].name)} · {pick.lv}{pick.un ? ` U${pick.un}` : ''} · {set.bots} bots · {t(...BOT_LEVEL_NAMES[set.botLevel])} · {set.minutes}′
          <span className="text-[#ffd23f]">{showSet ? t('Close', 'Cerrar') : t('Change', 'Cambiar')}</span>
        </button>
      </div>
      {showSet && (
        <div className="cw-scroll mb-3 grid max-h-[46vh] gap-3 overflow-y-auto rounded-[22px] border-2 border-white/10 bg-white/5 p-3 md:grid-cols-2">
          <div>
            <Label>{t('Mode', 'Modo')}</Label>
            <div className="flex flex-wrap gap-2">
              {(['arena', 'paint', 'kb'] as Game[]).map((g) => (
                <button key={g} type="button" onClick={() => up({ game: g })} className={cn('flex h-10 items-center gap-1.5 rounded-xl px-3 text-[14px] font-black', set.game === g ? 'bg-[#ffd23f] text-[#2a1d00]' : 'bg-white/10')}><GameIcon k={GAME_INFO[g].ic} size={18} />{t(...GAME_INFO[g].name)}</button>
              ))}
            </div>
            <Label className="mt-3">{t('Bots', 'Bots')}: <span className="text-[#ffd23f]">{set.bots}</span></Label>
            <input type="range" min={1} max={20} value={set.bots} onChange={(e) => up({ bots: Number(e.target.value) })} className="cw-range w-full" aria-label="Bots"
              style={{ background: `linear-gradient(90deg,#ffd23f ${((set.bots - 1) / 19) * 100}%,rgba(255,255,255,.15) ${((set.bots - 1) / 19) * 100}%)` }} />
            <div className="mt-2 flex flex-wrap gap-2">
              {BOT_LEVELS.map((_, i) => <button key={i} type="button" onClick={() => up({ botLevel: i })} className={cn('h-9 rounded-xl px-3 text-[14px] font-black', set.botLevel === i ? 'bg-white text-[#1b2350]' : 'bg-white/10')}>{t(...BOT_LEVEL_NAMES[i])}</button>)}
              <span className="mx-1 h-6 w-px self-center bg-white/20" />
              {[3, 5, 8].map((m) => <button key={m} type="button" onClick={() => up({ minutes: m })} className={cn('h-9 rounded-xl px-3 text-[14px] font-black', set.minutes === m ? 'bg-white text-[#1b2350]' : 'bg-white/10')}>{m}′</button>)}
            </div>
          </div>
          <div>
            <Label>{t('Questions: level and unit', 'Preguntas: nivel y unidad')}</Label>
            <UnitPicker value={pick} onChange={(p) => { setPick(p); savePick(p); }} compact />
          </div>
        </div>
      )}
      <CharacterPicker value={char} onChange={(c) => { setChar(c); try { localStorage.setItem('cw:char', String(c)); } catch { /* ignore */ } }} onConfirm={() => setRun((r) => r + 1)} confirmLabel={t('Play!', '¡Jugar!')} />
      <Link to="/classwars" className="sr-only">{t('Back', 'Volver')}</Link>
    </div>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mb-1.5 text-[13px] font-extrabold tracking-wide text-white/70 uppercase', className)}>{children}</div>;
}
