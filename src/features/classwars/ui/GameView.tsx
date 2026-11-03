/* Class Wars — the in-game screen: canvas + HUD + controls (keyboard/mouse and touch),
   announcements, KO card, quiz and shop. Used by players (ClientSession) and, in spectator
   mode, by the projector (HostSession). */
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, Loader2, LogOut, Map as MapIcon, Music, Pause, Play, Square, Users, Volume2, VolumeX, Crosshair } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TEACHERS } from '@/features/cards/teachers';
import type { ClientSession, RenderSource, RP } from '../game/client';
import { FLAG, TEAM_COLORS, TEAM_NAMES, respawnMs, type Game } from '../game/constants';

/** On-screen messages (box cards, kill feed) never stay longer than this. */
const MSG_MS = 3500;
import { BOX_EFFECTS, CHAR_IDS, DIA_OUTCOMES, INF, POWERS, WEAPONS, blasterTier, outcomeColor, outcomeLabel } from '../game/defs';
import { num, t, tx } from '../i18n';
import { hostSource, type HostSession } from '../game/host';
import type { Fxq } from '../game/vis';
import { Renderer, type CamMode } from '../render/renderer';
import { isMuted, isMusicOn, playMusic, setMuted, setMusicOn, sfx, unlockAudio } from '../render/audio';
import { Btn, Diamond, GameIcon, fmtTime, useMobile } from './kit';
import type { IconKey } from '../game/icons';
import { QuizOverlay } from './Quiz';

interface Hud {
  me: RP | null;
  remaining: number;
  board: { idx: number; name: string; char: number; dia: number; alive: boolean; bot: boolean; team: number }[];
  feed: { at: number; text: string; color: string }[];
  powerLeft: number;
  bonusLeft: number;
  paused: boolean;
  fps: number;
  quality: string;
  rank: number;
  total: number;
  teams: number[];
}
interface Announce { id: number; ic: IconKey; title: string; desc: string; color: string }

export const GameView = memo(function GameView({ client, host, onExit, code, goal }: { client?: ClientSession; host?: HostSession; onExit: () => void; code?: string; goal?: number }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const miniRef = useRef<HTMLCanvasElement>(null);
  const rRef = useRef<Renderer | null>(null);
  const srcRef = useRef<RenderSource | null>(null);
  const mobile = useMobile();
  const [hud, setHud] = useState<Hud | null>(null);
  const [ann, setAnn] = useState<Announce | null>(null);
  const [quiz, setQuiz] = useState<false | 'q' | 'shop'>(false);
  const [muted, setMute] = useState(isMuted());
  const [music, setMusic] = useState(isMusicOn());
  useEffect(() => { playMusic(1); return () => playMusic(0); }, []);
  const [cam, setCam] = useState<CamMode>(client ? 'follow' : 'auto');
  const [ko, setKo] = useState<null | { at: number; killer: string; lost: number }>(null);
  const [startAt] = useState(() => performance.now());
  const [stamp, setStamp] = useState(() => performance.now());
  const [showIntro] = useState(() => (client ? client.joinedAtMs < 1500 : (host?.sim?.now ?? 0) < 1500));
  const debug = typeof location !== 'undefined' && location.search.includes('debug');
  const mouse = useRef<{ x: number; y: number } | null>(null);
  const keys = useRef(new Set<string>());
  const annId = useRef(0);

  const spectator = !client;
  const game: Game = client?.game ?? host?.sim?.game ?? 'arena';
  const kb = game === 'kb', paint = game === 'paint', side = kb || paint;

  // Source + render loop.
  useEffect(() => {
    const canvas = canvasRef.current!;
    const r = new Renderer(canvas);
    rRef.current = r;
    r.mode = client ? 'follow' : 'auto';
    const src: RenderSource = client ?? hostSource(host!);
    srcRef.current = src;
    r.setMap(src.map);
    r.onFx = (f, me) => onFx(f, me);
    const ro = new ResizeObserver(() => r.resize());
    ro.observe(canvas);
    let raf = 0, last = performance.now(), lastHud = 0, lastMini = 0;
    let lastTick = -1;
    let errs = 0;
    const loop = (t: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.05, Math.max(0.001, (t - last) / 1000));
      last = t;
      try {
      if (client) {
        applyKeys();
        aimFromMouse();
        trackTap();
        client.update(dt);
        client.holdFire();
      } else host?.vis?.update(dt);
      r.frame(src, dt);
      if (t - lastMini > 140 && miniRef.current) { lastMini = t; r.drawMinimap(miniRef.current, src); }
      if (t - lastHud > 100) {
        lastHud = t;
        const h = readHud(src);
        setHud(h);
        const sec = Math.ceil(h.remaining / 1000);
        if (sec <= 10 && sec > 0 && sec !== lastTick && !h.paused) { lastTick = sec; sfx.tick(); }
        playMusic(h.remaining < 30000 ? 2 : 1);
      }
      } catch (e) {
        // never let one bad frame stop the game loop
        if (errs++ < 3) console.warn('[classwars] frame error', e);
      }
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, host]);

  useEffect(() => { if (rRef.current) rRef.current.mode = cam; }, [cam]);

  const readHud = (src: RenderSource): Hud => {
    const players = src.players();
    const me = players.find((p) => p.me) ?? null;
    const board = (client ? client.leaderboard() : host!.leaderboard()).map((b) => ({ idx: b.idx, name: b.name, char: b.char, dia: b.dia, alive: b.alive, bot: b.bot, team: b.team }));
    const now = performance.now();
    return {
      me,
      remaining: src.remainingMs(),
      board,
      feed: src.vis.feed.filter((f) => now - f.at < MSG_MS).slice(0, 4),
      powerLeft: client ? Math.max(0, client.powerReadyAt - now) : 0,
      bonusLeft: client ? Math.max(0, client.bonusReadyAt - now) : 0,
      paused: src.paused(),
      fps: rRef.current?.fps ?? 0,
      quality: rRef.current?.qualityLabel ?? '',
      rank: me ? board.findIndex((b) => b.idx === me.idx) + 1 : 0,
      total: board.length,
      teams: src.vis.teamCells,
    };
  };

  const onFx = (f: Fxq, me: RP | null) => {
    if (!client || !me) return;
    if (f.t === 'box' && f.idx === me.idx && f.out < 0) {
      const e = BOX_EFFECTS[f.eff];
      const id = ++annId.current;
      setAnn({ id, ic: e?.ic ?? 'bomb', title: t('Paint bomb!', '¡Bomba de pintura!'), desc: t(`+${num(f.dia)} blocks for your team · +1 jump in the air`, `+${num(f.dia)} bloques para tu equipo · +1 salto en el aire`) + (e ? ` · ${tx(e.title)}` : ''), color: TEAM_COLORS[me.team] ?? '#ffd23f' });
      setTimeout(() => setAnn((a) => (a?.id === id ? null : a)), MSG_MS - 500);
    } else if (f.t === 'box' && f.idx === me.idx) {
      // Title: the diamond outcome (+500, ×2, −50%); text: the item, if the box had one.
      const o = DIA_OUTCOMES[f.out] ?? DIA_OUTCOMES[0];
      const e = BOX_EFFECTS[f.eff];
      const gain = f.dia > 0 ? `+${num(f.dia)}` : f.dia < 0 ? `−${num(-f.dia)}` : '0';
      let desc = o.kind === 'cut' ? t(`You lost ${gain.slice(1)} diamonds — grab them back!`, `Perdiste ${gain.slice(1)} diamantes: ¡recógelos!`)
        : o.kind === 'mul' ? t(`Your diamonds ×${o.v}: ${gain}`, `Tus diamantes ×${o.v}: ${gain}`) : t(`${gain} diamonds`, `${gain} diamantes`);
      if (e) {
        let item = '';
        switch (e.id) {
          case 'gadget': { const w = WEAPONS[f.param]; item = `${tx(w.name)}: ${tx(w.desc)}`; break; }
          case 'power': { const tc = TEACHERS[f.param]; item = t(`${tx(POWERS[tc.id].name)} (${tc.name}) · 3 uses`, `${tx(POWERS[tc.id].name)} de ${tc.name} · 3 usos`); break; }
          case 'costume': item = t(`You are ${TEACHERS[f.param].name} for 40 s… with their power!`, `¡Eres ${TEACHERS[f.param].name} 40 s… con su poder!`); break;
          case 'healer': item = t('You heal every second!', '¡Te curas cada segundo!'); break;
          case 'shield': item = t('Full shield +50 extra.', 'Escudo al máximo y +50 extra.'); break;
          case 'speed': item = t('You run much faster!', '¡Corres muchísimo más rápido!'); break;
          case 'magnet': item = t('You pull in nearby diamonds.', 'Atraes los diamantes cercanos.'); break;
          case 'happy': item = t('Answers give double energy for 30 s.', 'Tus respuestas dan el doble de energía 30 s.'); break;
        }
        desc = `${desc} · ${tx(e.title)}: ${item}`;
      }
      const id = ++annId.current;
      setAnn({ id, ic: e?.ic ?? (o.kind === 'cut' ? 'bomb' : o.kind === 'mul' ? 'chest' : 'gem'), title: `${outcomeLabel(o)} ${o.kind === 'add' ? t('DIAMONDS', 'DIAMANTES') : ''}`.trim(), desc, color: e?.color ?? outcomeColor(o) });
      setTimeout(() => setAnn((a) => (a?.id === id ? null : a)), MSG_MS - 500);
    }
    if (f.t === 'ko' && f.idx === me.idx) {
      setKo({ at: performance.now(), killer: f.killer >= 0 && f.killer !== me.idx ? client.roster.get(f.killer)?.name ?? '' : '', lost: f.lost });
      setQuiz(false);
      client.setQuiz(false);
    }
    if (f.t === 'tp' && f.idx === me.idx && f.kind === 'spawn') { setKo(null); setStamp(performance.now()); }
  };

  /* ---------------------------------------------------------- input */
  const applyKeys = () => {
    if (!client) return;
    const k = keys.current;
    let mx = 0, my = 0;
    if (k.has('a') || k.has('arrowleft')) mx -= 1;
    if (k.has('d') || k.has('arrowright')) mx += 1;
    if (!side && (k.has('w') || k.has('arrowup'))) my -= 1;
    if (k.has('s') || k.has('arrowdown')) my += 1;
    if (!joy.current.active) { client.input.mx = mx; client.input.my = my; }
  };
  const aimFromMouse = () => {
    const r = rRef.current;
    if (!client || !r || !mouse.current || joy.current.aiming) return;
    const w = r.worldFromScreen(mouse.current.x, mouse.current.y);
    const me = client.me;
    client.input.aim = Math.atan2(w.y - (me.y - 18), w.x - me.x);
    client.input.ad = Math.hypot(w.x - me.x, w.y - me.y);
  };

  const openQuiz = useCallback((tab: 'q' | 'shop' = 'q') => {
    if (!client) return;
    const row = client.myRow();
    if (row && !(row[7] & FLAG.alive)) return;
    setQuiz(tab);
    client.setQuiz(true);
  }, [client]);
  const closeQuiz = useCallback(() => { setQuiz(false); client?.setQuiz(false); }, [client]);

  useEffect(() => {
    if (!client) return;
    const down = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      unlockAudio();
      const k = e.key.toLowerCase();
      if (quiz) {
        if (k === 'escape' || (k === 'q' && quiz === 'shop')) { e.preventDefault(); closeQuiz(); }
        return;
      }
      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) { e.preventDefault(); keys.current.add(k); }
      if (e.repeat) return;
      if (side && (k === 'w' || k === 'arrowup' || k === ' ')) { e.preventDefault(); client.jumpPress(); }
      else if (k === 'e' || k === ' ' || k === '2') { e.preventDefault(); client.powerPress(); }
      else if (k === 'r' || k === '3') client.bonusPress();
      else if (k === '1') client.attackPress();
      else if (k === 'q') { e.preventDefault(); openQuiz('q'); }
      else if (k === 'b') openQuiz('shop');
    };
    const up = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase());
    const blur = () => { keys.current.clear(); client.input.held = false; };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, [client, quiz, openQuiz, closeQuiz, side]);

  // Canvas pointer: mouse aims/attacks (right click walks there); touch taps walk there.
  const onPointerDown = (e: React.PointerEvent) => {
    unlockAudio();
    if (!client || quiz) return;
    const rect = canvasRef.current!.getBoundingClientRect();
    const sx = e.clientX - rect.left, sy = e.clientY - rect.top;
    const w = rRef.current!.worldFromScreen(sx, sy);
    if (e.pointerType === 'mouse') {
      mouse.current = { x: sx, y: sy };
      if (e.button === 2) { client.input.target = w; rRef.current!.marker = { ...w, at: performance.now() }; return; }
      if (e.button === 0) { aimFromMouse(); client.input.held = true; client.attackPress(); (e.target as HTMLElement).setPointerCapture(e.pointerId); }
    } else {
      // Touch: tapping a rival shoots at it (and keeps shooting while the finger stays down).
      const foe = foeAt(w.x, w.y);
      if (!foe) return;
      tap.current = { id: e.pointerId, idx: foe.idx };
      aimAt(foe);
      client.input.held = true;
      client.attackPress();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    }
  };
  const tap = useRef<{ id: number; idx: number } | null>(null);
  const foeAt = (x: number, y: number) => {
    let best: RP | null = null, bd = 75;
    for (const p of srcRef.current?.players() ?? []) {
      if (p.me || !(p.flags & FLAG.alive) || p.flags & FLAG.invis) continue;
      const d = Math.hypot(p.x - x, p.y - 35 - y);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };
  const aimAt = (p: RP) => {
    if (!client) return;
    const me = client.me;
    client.input.aim = Math.atan2(p.y - 22 - (me.y - 18), p.x - me.x);
    client.input.ad = Math.hypot(p.x - me.x, p.y - me.y);
  };
  /** Each frame: keep aiming at the tapped rival; stop when it is gone. */
  const trackTap = () => {
    if (!tap.current || !client) return;
    const p = srcRef.current?.players().find((q) => q.idx === tap.current!.idx);
    if (p && p.flags & FLAG.alive && !(p.flags & FLAG.invis)) aimAt(p);
    else { tap.current = null; client.input.held = false; }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const rect = canvasRef.current!.getBoundingClientRect();
    mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onPointerUp = (e: React.PointerEvent) => {
    if (!client) return;
    if (e.pointerType === 'mouse' && e.button === 0) client.input.held = false;
    if (tap.current?.id === e.pointerId) { tap.current = null; client.input.held = false; }
  };

  /* ----------------------------------------------------- touch sticks */
  const joy = useRef({ active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, aiming: false, aid: -1, up: false });
  const [joyVis, setJoyVis] = useState<null | { ox: number; oy: number; x: number; y: number }>(null);
  const joyDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    unlockAudio();
    const j = joy.current;
    j.active = true; j.id = e.pointerId; j.ox = e.clientX; j.oy = e.clientY; j.x = e.clientX; j.y = e.clientY;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setJoyVis({ ox: j.ox, oy: j.oy, x: j.x, y: j.y });
  };
  const joyMove = (e: React.PointerEvent) => {
    const j = joy.current;
    if (!j.active || e.pointerId !== j.id || !client) return;
    let dx = e.clientX - j.ox, dy = e.clientY - j.oy;
    const d = Math.hypot(dx, dy), R = 56;
    if (d > R) { dx = (dx / d) * R; dy = (dy / d) * R; }
    j.x = j.ox + dx; j.y = j.oy + dy;
    client.input.mx = d > 8 ? dx / R : 0;
    client.input.my = d > 8 ? dy / R : 0;
    if (side) {
      // side view: pushing the stick up jumps once (push again to double jump)
      const up = dy < -R * 0.6;
      if (up && !j.up) client.jumpPress();
      j.up = up;
    }
    client.input.target = null;
    if (!j.aiming && d > 8 && !client.input.held) client.input.aim = Math.atan2(dy, dx);
    setJoyVis({ ox: j.ox, oy: j.oy, x: j.x, y: j.y });
  };
  const joyUp = (e: React.PointerEvent) => {
    const j = joy.current;
    if (e.pointerId !== j.id || !client) return;
    j.active = false;
    client.input.mx = client.input.my = 0;
    setJoyVis(null);
  };
  const autoAim = () => {
    if (!client || !srcRef.current) return;
    const me = client.me;
    let best: RP | null = null, bd = 520;
    for (const p of srcRef.current.players()) {
      if (p.me || !(p.flags & FLAG.alive) || p.flags & FLAG.invis) continue;
      const d = Math.hypot(p.x - me.x, p.y - me.y);
      if (d < bd) { bd = d; best = p; }
    }
    if (best) { client.input.aim = Math.atan2(best.y - me.y, best.x - me.x); client.input.ad = bd; }
  };
  const powerTap = (bonus: boolean) => (e: React.PointerEvent) => {
    e.stopPropagation();
    unlockAudio();
    if (!client) return;
    const pw = POWERS[CHAR_IDS[bonus ? hud?.me?.borrowed ?? 0 : hud?.me?.look ?? 0]];
    if (pw?.aimed && !joy.current.aiming && mobile) autoAim();
    if (bonus) client.bonusPress(); else client.powerPress();
  };

  /* --------------------------------------------------------------- UI */
  const me = hud?.me ?? null;
  const alive = me ? !!(me.flags & FLAG.alive) : true;
  const weapon = WEAPONS[me?.weapon ?? 0] ?? WEAPONS[0];
  const powerChar = me?.look ?? client?.char ?? 0;
  const pw = POWERS[CHAR_IDS[powerChar]];
  const borrowed = me && me.borrowed >= 0 ? POWERS[CHAR_IDS[me.borrowed]] : null;
  const intro = showIntro && performance.now() - startAt < 2600;
  const remaining = hud?.remaining ?? 0;
  const lowTime = remaining < 30000;

  return (
    <div className="cw-noselect relative h-full w-full overflow-hidden bg-[#2f8a3a]" onContextMenu={(e) => e.preventDefault()}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 h-full w-full"
        style={{ cursor: client ? (kb ? RETICLE : 'crosshair') : 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        aria-label={t('Battlefield', 'Campo de batalla')}
      />

      {/* top-left: diamonds + bars */}
      {client && me && (
        <div className="pointer-events-none absolute top-[max(10px,env(safe-area-inset-top))] left-3 flex flex-col gap-1.5">
          <motion.div key={me.dia} initial={{ scale: 1.18 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 15 }} className="flex w-max items-center gap-2 rounded-2xl border-2 border-white/15 bg-[#141a3f]/85 py-1.5 pr-4 pl-2.5 shadow-lg">
            {paint ? <GameIcon k="brush" size={26} /> : <Diamond size={26} />}
            <span className="text-[24px] leading-none font-black tabular-nums">{me.dia}</span>
            {goal ? <span className="text-[13px] font-bold text-white/55">/ {goal}</span> : null}
          </motion.div>
          {!kb && <><Energy value={me.en} max={client.startEnergy} tired={!!(me.flags & FLAG.tired)} /><Bar value={me.hp} max={me.maxHp} color="#34d058" /><Bar value={me.sh} max={100} color="#2f8cff" /></>}
          {paint && me.team >= 0 && <div className="w-max rounded-full px-3 py-0.5 text-[13px] font-black text-white shadow" style={{ background: TEAM_COLORS[me.team] }}>{t('Team', 'Equipo')} {tx(TEAM_NAMES[me.team])}</div>}
        </div>
      )}

      {/* out of energy: frozen until you answer */}
      {client && me && alive && !quiz && me.flags & FLAG.tired ? (
        <div className="absolute inset-x-0 top-[38%] z-30 flex justify-center px-4">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="w-[min(92vw,440px)] rounded-[24px] border-[3px] border-[#ff9f0a] bg-[#252b5e]/95 px-5 pt-4 pb-5 text-center shadow-[0_12px_0_rgba(0,0,0,.3)]">
            <GameIcon k="batteryLow" size={52} className="mx-auto" />
            <div className="cw-title mt-1 text-[28px] text-[#ffb547] uppercase">{t('Out of energy!', '¡Sin energía!')}</div>
            <div className="mt-1 text-[15px] font-bold text-white/85">{t('You cannot move or attack. Answer questions to recharge.', 'No puedes moverte ni atacar. Responde preguntas para recargar energía.')}</div>
            <Btn tone="yellow" big className="cw-pulse mt-4 w-full" onClick={() => openQuiz('q')}><BookOpen size={22} /> {t('Recharge energy', 'Recargar energía')} {!mobile && <kbd className="rounded-md bg-black/20 px-1.5 text-[12px]">Q</kbd>}</Btn>
          </motion.div>
        </div>
      ) : null}

      {/* running low: a reminder to answer (before you run dry) */}
      {client && me && alive && !quiz && !(me.flags & FLAG.tired) && me.en < client.startEnergy * 0.25 && (
        <motion.button type="button" initial={{ x: 60, opacity: 0 }} animate={{ x: 0, opacity: 1 }} onClick={() => openQuiz('q')}
          className="absolute top-[38%] right-3 z-20 flex w-[min(78vw,280px)] items-start gap-2.5 rounded-2xl border-2 border-[#ff9f0a] bg-white px-3.5 py-3 text-left text-[#1b2350] shadow-[0_8px_0_rgba(0,0,0,.25)]">
          <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#ff7a1a] text-[17px] font-black text-white">!</span>
          <span><span className="block text-[17px] leading-tight font-black">{t('Low on energy', 'Poca energía')}</span><span className="text-[13.5px] font-semibold text-[#1b2350]/75">{t('Answer some questions to recharge before you run out!', '¡Responde preguntas para recargar antes de quedarte sin nada!')}</span></span>
        </motion.button>
      )}

      {/* top-center: timer */}
      <div className="pointer-events-none absolute top-[max(10px,env(safe-area-inset-top))] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
        <div className={cn('rounded-2xl border-2 border-white/15 bg-[#141a3f]/85 px-4 py-1 text-center shadow-lg', lowTime && 'cw-pulse border-[#ff4d5e]')}>
          <div className={cn('text-[22px] leading-tight font-black tabular-nums sm:text-[26px]', lowTime && 'text-[#ff8a95]')}>{fmtTime(remaining)}</div>
        </div>
        {paint && hud && hud.teams.length > 0 && <TeamBar cells={hud.teams} wide={spectator} />}
        {spectator && code && <div className="rounded-full bg-[#ffd23f] px-3 py-0.5 text-[13px] font-black text-[#2a1d00]">{t('Code', 'Código')}: {code}</div>}
        {client && hud && hud.rank > 0 && <div className="rounded-full bg-black/35 px-2.5 py-0.5 text-[12px] font-extrabold text-white/90">#{hud.rank} {t('of', 'de')} {hud.total}</div>}
      </div>

      {/* top-right: minimap + leaderboard + feed */}
      <div className="absolute top-[max(10px,env(safe-area-inset-top))] right-3 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          {debug && <div className="rounded-lg bg-black/50 px-2 py-1 font-mono text-[11px]">{hud?.fps} fps · {hud?.quality} · {rRef.current?.workMs.toFixed(1)} ms</div>}
          <button type="button" aria-label={music ? t('Music off', 'Apagar música') : t('Music on', 'Encender música')} title={t('Music', 'Música')} onClick={() => { const m = !music; setMusic(m); setMusicOn(m); unlockAudio(); }} className={cn('grid h-10 w-10 place-items-center rounded-xl bg-[#141a3f]/80 text-white hover:bg-[#141a3f]', !music && 'opacity-50')}><Music size={18} /></button>
          <button type="button" aria-label={muted ? t('Sound on', 'Activar sonido') : t('Mute', 'Silenciar')} onClick={() => { const m = !muted; setMute(m); setMuted(m); unlockAudio(); }} className="grid h-10 w-10 place-items-center rounded-xl bg-[#141a3f]/80 text-white hover:bg-[#141a3f]">{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
          {spectator && (
            <>
              <button type="button" aria-label={t('Camera', 'Cámara')} title={cam === 'auto' ? t('Whole map', 'Ver mapa completo') : t('Follow the action', 'Seguir la acción')} onClick={() => setCam(cam === 'auto' ? 'map' : 'auto')} className="grid h-10 w-10 place-items-center rounded-xl bg-[#141a3f]/80 text-white hover:bg-[#141a3f]">{cam === 'auto' ? <MapIcon size={19} /> : <Crosshair size={19} />}</button>
              <button type="button" aria-label={hud?.paused ? t('Resume', 'Reanudar') : t('Pause', 'Pausar')} onClick={() => host!.setPaused(!hud?.paused)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#141a3f]/80 text-white hover:bg-[#141a3f]">{hud?.paused ? <Play size={19} /> : <Pause size={19} />}</button>
              <button type="button" aria-label={t('End game', 'Terminar partida')} onClick={() => { if (confirm(t('End the game now?', '¿Terminar la partida ahora?'))) host!.endNow(); }} className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff4d5e]/85 text-white hover:bg-[#ff4d5e]"><Square size={17} /></button>
            </>
          )}
          {client && <button type="button" aria-label={t('Leave', 'Salir')} onClick={() => { if (confirm(t('Leave the game?', '¿Salir de la partida?'))) onExit(); }} className="grid h-10 w-10 place-items-center rounded-xl bg-[#141a3f]/80 text-white hover:bg-[#141a3f]"><LogOut size={18} /></button>}
        </div>
        {!kb && <canvas ref={miniRef} width={spectator ? 220 : mobile ? 120 : 168} height={spectator ? 165 : mobile ? 90 : 126} className="rounded-xl border-2 border-white/25 shadow-lg" style={{ width: spectator ? 220 : mobile ? 120 : 168, height: spectator ? 165 : mobile ? 90 : 126 }} />}
        {hud && (!mobile || spectator) && (
          <div className="pointer-events-none w-[220px] overflow-hidden rounded-2xl border-2 border-white/10 bg-[#141a3f]/95 shadow-lg">
            {hud.board.slice(0, spectator ? 8 : 5).map((b, i) => (
              <div key={b.idx} className={cn('flex items-center gap-2 px-2.5 py-1 text-[13.5px] font-extrabold', me && b.idx === me.idx && 'bg-[#ffd23f]/25', !b.alive && 'opacity-50')}>
                <span className={cn('w-5 text-center', i === 0 ? 'text-[#ffd23f]' : i === 1 ? 'text-[#d8e1ea]' : i === 2 ? 'text-[#e8a066]' : 'text-white/55')}>{i + 1}</span>
                <span className="h-3 w-3 shrink-0 rounded-full border border-black/40" style={{ background: b.team >= 0 ? TEAM_COLORS[b.team] : TEACHERS[b.char]?.look.top }} />
                <span className="min-w-0 flex-1 truncate">{b.name}</span>
                <span className="flex items-center gap-1 tabular-nums">{b.dia}{paint ? <GameIcon k="brush" size={13} /> : <Diamond size={13} />}</span>
              </div>
            ))}
          </div>
        )}
        <div className="pointer-events-none flex flex-col items-end gap-1">
          <AnimatePresence>
            {hud?.feed.map((f) => (
              <motion.div key={f.at + f.text} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[190px] truncate rounded-lg bg-black/45 px-2.5 py-1 text-[12px] font-bold sm:max-w-[260px] sm:text-[12.5px]" style={{ color: f.color }}>
                <GameIcon k="burst" size={14} className="-mt-0.5 mr-1" />{f.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* announcement card */}
      <AnimatePresence>
        {ann && (
          <motion.div key={ann.id} initial={{ y: -40, scale: 0.7, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -20, opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 420, damping: 20 }}
            onClick={() => setAnn(null)} className="absolute top-[17%] left-1/2 z-30 w-[min(86vw,480px)] -translate-x-1/2 cursor-pointer">
            <div className="relative mt-8 rounded-[20px] border-[3px] border-[#ffd23f] bg-[#252b5e] px-5 pt-10 pb-4 text-center shadow-[0_12px_0_rgba(0,0,0,.3)]">
              <div className="absolute -top-9 left-1/2 grid h-[72px] w-[72px] -translate-x-1/2 place-items-center rounded-full border-[3px] border-[#ffd23f] bg-[#252b5e] text-[34px]">
                <div className="grid h-[54px] w-[54px] place-items-center rounded-full" style={{ background: ann.color + '44' }}><GameIcon k={ann.ic} size={38} /></div>
              </div>
              <div className="cw-title text-[26px] leading-none tracking-wide uppercase sm:text-[30px]">{ann.title}</div>
              <div className="mt-2 text-[14.5px] font-bold text-white/90 sm:text-[16px]">{ann.desc}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* bottom-left: answer questions */}
      {client && !quiz && (alive || !kb) && (
        <div className={cn('absolute left-3 flex flex-col gap-2', mobile ? (kb ? 'top-[70px]' : 'top-[186px]') : 'bottom-[max(14px,env(safe-area-inset-bottom))]')}>
          {kb && me && <KbStatus en={me.en} max={client.startEnergy} tired={!!(me.flags & FLAG.tired)} weapon={tx(weapon.name)} lvl={me.lvl} small={mobile} />}
          <Btn tone="blue" big={!mobile} className={cn(mobile && 'h-12 px-4 text-[15px]')} onClick={() => openQuiz('q')} disabled={!alive}>
            <BookOpen size={mobile ? 18 : 22} /> {mobile ? t('Questions', 'Preguntas') : t('Answer questions', 'Responder preguntas')} {!mobile && <kbd className="rounded-md bg-black/25 px-1.5 text-[12px]">Q</kbd>}
          </Btn>
          {!mobile && <Btn tone="purple" onClick={() => openQuiz('shop')} disabled={!alive}><GameIcon k="arrowUp" size={18} /> {t('Upgrades', 'Mejoras')} <kbd className="rounded-md bg-black/25 px-1.5 text-[12px]">B</kbd></Btn>}
        </div>
      )}

      {/* hotbar */}
      {client && me && hud && !quiz && (
        <div className={cn('absolute flex items-end gap-2', mobile ? (kb ? 'bottom-[max(14px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2 gap-1.5' : 'right-3 bottom-[max(14px,env(safe-area-inset-bottom))] flex-col-reverse items-end') : 'bottom-[max(14px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2')}>
          {kb && !mobile && <BlasterSlot ammo={me.ammo} lvl={me.lvl} reloading={!!(me.flags & FLAG.reload)} />}
          {!mobile && (
            <>
              {!kb && <Slot k="1" active label={tx(weapon.name)} onClick={() => client.attackPress()}>
                <GameIcon k={weapon.ic} size={38} />
                <span className="absolute right-1.5 bottom-0.5 text-[13px] font-black">{me.ammo === INF ? '∞' : me.ammo}</span>
                <span className="absolute bottom-0.5 left-1 flex items-center text-[11px] font-black text-[#ffe14d]"><GameIcon k="bolt" size={12} />{weapon.en}</span>
              </Slot>}
              <Slot k="E" label={tx(pw.name)} cd={hud!.powerLeft / 1000} cdMax={pw.cd} color={pw.color} onClick={() => client.powerPress()}>
                <GameIcon k={pw.ic} size={38} />
              </Slot>
              {borrowed && (
                <Slot k="R" label={tx(borrowed.name)} cd={hud!.bonusLeft / 1000} cdMax={1.2} color={borrowed.color} onClick={() => client.bonusPress()}>
                  <GameIcon k={borrowed.ic} size={36} />
                  <span className="absolute right-1 bottom-0.5 rounded bg-black/40 px-1 text-[12px] font-black">×{me.charges}</span>
                </Slot>
              )}
            </>
          )}
        </div>
      )}

      {/* touch controls */}
      {client && mobile && !quiz && alive && me && hud && (
        <>
          <div className="absolute bottom-0 left-0 h-[40%] w-[44%]" onPointerDown={joyDown} onPointerMove={joyMove} onPointerUp={joyUp} onPointerCancel={joyUp}>
            {!joyVis && <div className="absolute bottom-[max(30px,env(safe-area-inset-bottom))] left-8 h-[112px] w-[112px] rounded-full border-[3px] border-white/25 bg-black/15" />}
          </div>
          {joyVis && (
            <div className="pointer-events-none fixed z-20" style={{ left: joyVis.ox - 56, top: joyVis.oy - 56 }}>
              <div className="h-[112px] w-[112px] rounded-full border-[3px] border-white/40 bg-black/20" />
              <div className="absolute h-[52px] w-[52px] rounded-full border-[3px] border-white bg-white/50" style={{ left: 30 + joyVis.x - joyVis.ox, top: 30 + joyVis.y - joyVis.oy }} />
            </div>
          )}
          {/* one button: your power; while it recharges, a borrowed power takes its place */}
          {(() => {
            const useB = !!borrowed && hud.powerLeft > 0;
            const sp = useB ? borrowed! : pw;
            return (
              <div className={cn('absolute right-5 bottom-[max(26px,env(safe-area-inset-bottom))] flex items-end gap-3', side ? 'flex-row' : 'flex-col items-center')}>
                <div className="flex flex-col items-center gap-2">
                  {kb ? <AmmoPill ammo={me.ammo} lvl={me.lvl} reloading={!!(me.flags & FLAG.reload)} /> : <div className="pointer-events-none flex items-center gap-1 rounded-full bg-[#141a3f]/80 px-2 py-0.5 text-[12px] font-black"><GameIcon k={weapon.ic} size={18} />{me.ammo === INF ? '∞' : me.ammo}</div>}
                  <TouchBtn onDown={powerTap(useB)} color={sp.color} cd={useB ? hud.bonusLeft / 1000 : hud.powerLeft / 1000} cdMax={useB ? 1.2 : pw.cd} size={side ? 70 : 84}>
                    <GameIcon k={sp.ic} size={side ? 38 : 46} />
                    {useB && <span className="absolute -right-1 -bottom-1 rounded-full bg-black/70 px-1.5 text-[12px] font-black">×{me.charges}</span>}
                  </TouchBtn>
                </div>
                {side && <TouchBtn onDown={(e) => { e.stopPropagation(); unlockAudio(); client.jumpPress(); }} color="#30d158" cd={0} cdMax={1} size={88}><GameIcon k="arrowUp" size={48} /></TouchBtn>}
              </div>
            );
          })()}
        </>
      )}

      {/* KO card */}
      {client && ko && !alive && kb && (
        <div className="pointer-events-none absolute inset-0 z-30 bg-[#0e1230]/25">
          <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="absolute top-[18%] left-1/2 -translate-x-1/2 text-center">
            <div className="text-[17px] font-extrabold text-white drop-shadow-[0_2px_0_rgba(0,0,0,.5)]">{ko.killer ? t(`${ko.killer} launched you off the stage`, `${ko.killer} te sacó del escenario`) : t('You fell off the stage', 'Te caíste del escenario')}</div>
            {ko.lost > 0 && <div className="mt-1 flex items-center justify-center gap-1 text-[16px] font-extrabold text-[#7ef0ff] drop-shadow">−{ko.lost} <Diamond size={18} /></div>}
          </motion.div>
          <div className="absolute bottom-[max(22px,env(safe-area-inset-bottom))] left-5 flex items-center gap-3">
            <Loader2 size={30} className="animate-spin text-white" />
            <span className="cw-title text-[30px] text-white drop-shadow-[0_3px_0_rgba(0,0,0,.45)]">{t('Respawning…', 'Reapareciendo…')}</span>
          </div>
        </div>
      )}
      {client && ko && !alive && !kb && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-[#0e1230]/40">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-[24px] border-[3px] border-[#ff4d5e] bg-[#252b5e] px-8 py-6 text-center shadow-2xl">
            <div className="cw-title text-[44px] text-[#ff8a95]">K.O.!</div>
            <div className="text-[16px] font-bold text-white/85">{ko.killer ? t(`${ko.killer} knocked you out`, `Te noqueó ${ko.killer}`) : t('You are out', 'Quedaste fuera de combate')}</div>
            {ko.lost > 0 && <div className="mt-1 flex items-center justify-center gap-1 text-[16px] font-extrabold text-[#7ef0ff]">−{ko.lost} <Diamond size={18} /> {t('(grab them back!)', '(¡recupéralos!)')}</div>}
            <Respawn at={ko.at} ms={respawnMs(game)} />
          </motion.div>
        </div>
      )}

      {/* Color Clash: "TEAM …" stamp at the start and after each respawn */}
      {paint && me && me.team >= 0 && stamp && <TeamStamp key={stamp} team={me.team} />}

      {/* countdown */}
      {intro && <Countdown startAt={startAt} />}

      {/* paused */}
      {hud?.paused && !quiz && (
        <div className="absolute inset-0 z-30 grid place-items-center bg-[#0e1230]/60">
          <div className="cw-title rounded-3xl bg-[#252b5e] px-10 py-6 text-[40px]">⏸ Pausa</div>
        </div>
      )}

      {/* spectator: players count */}
      {spectator && hud && (
        <div className="pointer-events-none absolute bottom-3 left-3 flex items-center gap-2 rounded-xl bg-[#141a3f]/80 px-3 py-2 text-[14px] font-extrabold">
          <Users size={16} /> {hud.board.length} {t('players', 'jugadores')}
        </div>
      )}

      {client && quiz && <QuizOverlay client={client} tab={quiz} setTab={(t) => setQuiz(t)} onClose={closeQuiz} />}

      {client && client.net === 'open' && !hud?.paused && hud && performance.now() - client.lastSnapLocal > 4000 && (
        <div className="absolute top-1/3 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[#141a3f]/95 px-5 py-3 text-center text-[15px] font-extrabold shadow-xl">{t('No signal from the teacher… waiting for them to reconnect', 'Sin señal del profe… esperando que vuelva a conectarse')}</div>
      )}
      {client && client.net !== 'open' && (
        <div className="absolute bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#ff9f0a] px-4 py-1.5 text-[13px] font-extrabold text-[#2a1d00]">{t('Reconnecting…', 'Reconectando…')}</div>
      )}
      {client && me && hud && !mobile && !quiz && performance.now() - startAt < 30000 && (
        <div className="pointer-events-none absolute bottom-[max(14px,env(safe-area-inset-bottom))] right-3 max-w-[calc(50%-150px)] text-right text-[11.5px] leading-snug font-semibold text-white/70 drop-shadow">
          {kb ? t('A/D move (walk off an edge to go down) · W or Space jump, twice in the air · click to shoot', 'A/D moverse (para bajar, sal por el borde) · W o Espacio saltar, dos veces en el aire · clic disparar') : side ? t('A/D move · W or Space jump (twice in the air) · S drop down · aim with the mouse · click to shoot', 'A/D moverse · W o Espacio saltar (dos veces en el aire) · S bajar · apunta con el mouse · clic disparar') : t('WASD move · aim with the mouse · click to shoot · right click to walk', 'WASD moverse · apunta con el mouse · clic disparar · clic derecho caminar')}<br />{kb ? t('E power · Q questions · B upgrade your blaster · the higher their %, the farther they fly!', 'E poder · Q preguntas · B mejorar el bláster · ¡cuanto más % tengan, más lejos vuelan!') : paint ? t('E power · Q questions · stand on blocks to paint them your colour! Boxes give extra jumps.', 'E poder · Q preguntas · ¡párate en los bloques para pintarlos! Las cajas dan saltos extra.') : t('E power · R borrowed power · Q questions · B upgrades', 'E poder · R poder prestado · Q preguntas · B mejoras')}<br /><span className="text-[#ffe14d]">{t('Every step and shot costs energy · answer to recharge', 'Cada paso y disparo gasta energía · responde para recargar')}</span>
        </div>
      )}
    </div>
  );
});

function Energy({ value, max, tired }: { value: number; max: number; tired: boolean }) {
  const k = Math.max(0, Math.min(1, value / max));
  const low = value < max * 0.15;
  return (
    <div className={cn('flex w-[136px] items-center gap-1.5 rounded-xl bg-[#141a3f]/85 p-1 pr-2 shadow sm:w-[180px]', (tired || low) && 'cw-pulse')}>
      <GameIcon k={tired ? 'batteryLow' : 'bolt'} size={19} />
      <div className="relative h-4 flex-1 overflow-hidden rounded-lg bg-black/40">
        <div className="absolute inset-y-0 left-0 rounded-lg transition-[width] duration-200" style={{ width: `${k * 100}%`, background: low ? 'linear-gradient(90deg,#ff6b3d,#ff9f0a)' : 'linear-gradient(90deg,#ffb800,#ffe14d)' }} />
        <div className="absolute inset-x-0 top-0 h-1.5 bg-white/25" />
      </div>
      <span className={cn('min-w-[34px] text-right text-[14px] font-black tabular-nums', tired && 'text-[#ff8a8a]')}>{Math.max(0, Math.round(value))}</span>
    </div>
  );
}

function Bar({ value, max, color }: { value: number; max: number; color: string }) {
  const k = Math.max(0, Math.min(1, value / max));
  return (
    <div className="flex w-[136px] items-center gap-2 rounded-xl bg-[#141a3f]/80 p-1 pr-2.5 shadow sm:w-[180px]">
      <div className="relative h-4 flex-1 overflow-hidden rounded-lg bg-black/40">
        <div className="absolute inset-y-0 left-0 rounded-lg transition-[width] duration-200" style={{ width: `${k * 100}%`, background: color }} />
        <div className="absolute inset-x-0 top-0 h-1.5 bg-white/20" />
      </div>
      <span className="w-8 text-right text-[14px] font-black tabular-nums">{Math.max(0, Math.round(value))}</span>
    </div>
  );
}

function Slot({ k, children, active, label, cd = 0, cdMax = 1, color, small, onClick }: { k: string; children: React.ReactNode; active?: boolean; label: string; cd?: number; cdMax?: number; color?: string; small?: boolean; onClick: () => void }) {
  const f = cd > 0 ? Math.min(1, cd / cdMax) : 0;
  return (
    <button type="button" onClick={onClick} onPointerDown={(e) => e.stopPropagation()} title={label} className={cn('relative grid place-items-center', small ? 'h-[50px] w-[54px]' : 'h-[74px] w-[92px]', ' rounded-2xl border-[3px] shadow-[0_6px_0_rgba(0,0,0,.3)]', active ? 'border-[#ffd23f] bg-gradient-to-b from-[#53d47a] to-[#2fa356]' : 'border-white/40 bg-gradient-to-b from-[#3d8bff] to-[#2a5fd0]')} style={!active && color ? { background: `linear-gradient(180deg, ${color}, #2a3577)` } : undefined}>
      {children}
      <span className="absolute top-0.5 left-1.5 text-[12px] font-black text-white/80">{k}</span>
      {f > 0 && (
        <div className="absolute inset-0 grid place-items-center rounded-[13px]" style={{ background: `conic-gradient(rgba(10,14,40,.72) ${f * 360}deg, transparent 0)` }}>
          <span className="text-[22px] font-black">{Math.ceil(cd)}</span>
        </div>
      )}
    </button>
  );
}

function TouchBtn({ children, onDown, color, cd, cdMax, size }: { children: React.ReactNode; onDown: (e: React.PointerEvent) => void; color: string; cd: number; cdMax: number; size: number }) {
  const f = cd > 0 ? Math.min(1, cd / cdMax) : 0;
  return (
    <div onPointerDown={onDown} className="relative grid place-items-center rounded-full border-[3px] border-white/80 shadow-[0_5px_0_rgba(0,0,0,.3)] active:scale-95" style={{ width: size, height: size, background: color }}>
      {children}
      {f > 0 && <div className="absolute inset-0 grid place-items-center rounded-full text-[18px] font-black" style={{ background: `conic-gradient(rgba(10,14,40,.75) ${f * 360}deg, transparent 0)` }}>{Math.ceil(cd)}</div>}
    </div>
  );
}

function Respawn({ at, ms }: { at: number; ms: number }) {
  const [, f] = useState(0);
  useEffect(() => { const t = setInterval(() => f((n) => n + 1), 200); return () => clearInterval(t); }, []);
  const left = Math.max(0, ms - (performance.now() - at));
  return <div className="mt-3 text-[15px] font-bold text-white/70">{t('Back in', 'Reapareces en')} {Math.ceil(left / 1000)}…</div>;
}

function Countdown({ startAt }: { startAt: number }) {
  const [n, setN] = useState(3);
  useEffect(() => {
    sfx.tick();
    const t = setInterval(() => {
      const k = 3 - Math.floor((performance.now() - startAt) / 650);
      setN((old) => { if (k !== old) { if (k > 0) sfx.tick(); else if (k === 0) sfx.go(); } return k; });
    }, 50);
    return () => clearInterval(t);
  }, [startAt]);
  if (n < 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-40 grid place-items-center">
      <motion.div key={n} initial={{ scale: 2.2, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="cw-title text-[110px] text-white" style={{ textShadow: '0 6px 0 #1b2350, 0 -3px 0 #1b2350, 3px 0 0 #1b2350, -3px 0 0 #1b2350, 0 14px 0 rgba(0,0,0,.25)' }}>
        {n > 0 ? n : t('GO!', '¡YA!')}
      </motion.div>
    </div>
  );
}

/** Knockback hotbar: the pixel blaster in its tier colour, the magazine and the reload bar. */
function BlasterSlot({ ammo, lvl, reloading }: { ammo: number; lvl: number; reloading: boolean }) {
  const tier = blasterTier(lvl);
  return (
    <div className="pointer-events-none flex flex-col items-center drop-shadow-[0_3px_0_rgba(0,0,0,.35)]">
      <div className="relative flex h-[74px] w-[118px] items-center justify-center rounded-2xl border-[3px] bg-[#141a3f]/85" style={{ borderColor: tier.color, boxShadow: `0 0 18px ${tier.color}55 inset` }}>
        <GameIcon k="pixel" size={46} />
        <span className="absolute top-0.5 left-1.5 text-[10.5px] font-black tracking-wide uppercase" style={{ color: tier.color }}>{tx(tier.name)}</span>
        <span className={cn('absolute right-1.5 bottom-0.5 text-[15px] font-black tabular-nums', ammo <= 5 && !reloading && 'text-[#ffb547]')}>{reloading ? '' : ammo}<span className="text-[11px] text-white/55">/{tier.mag}</span></span>
        {reloading && <ReloadBar secs={tier.reload} color={tier.color} />}
      </div>
      <div className="mt-1 max-w-[150px] truncate text-[12px] font-extrabold text-white/85">{tx(WEAPONS[7].name)}</div>
    </div>
  );
}

/** Touch: magazine above the power button. */
function AmmoPill({ ammo, lvl, reloading }: { ammo: number; lvl: number; reloading: boolean }) {
  const tier = blasterTier(lvl);
  return (
    <div className="pointer-events-none relative flex min-w-[64px] items-center justify-center gap-1 overflow-hidden rounded-full border-2 bg-[#141a3f]/85 px-2 py-0.5 text-[12px] font-black tabular-nums" style={{ borderColor: tier.color }}>
      <GameIcon k="pixel" size={18} />{reloading ? t('Reload', 'Recarga') : ammo}
      {reloading && <ReloadBar secs={tier.reload} color={tier.color} />}
    </div>
  );
}

function ReloadBar({ secs, color }: { secs: number; color: string }) {
  return (
    <span className="absolute inset-x-1.5 bottom-1 h-1.5 overflow-hidden rounded-full bg-white/15">
      <motion.span className="block h-full rounded-full" style={{ background: color }} initial={{ width: '0%' }} animate={{ width: '100%' }} transition={{ duration: secs, ease: 'linear' }} />
    </span>
  );
}

/** A round aiming reticle for the mouse (knockback). */
const RETICLE = `url("data:image/svg+xml,${encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40"><circle cx="20" cy="20" r="14" fill="none" stroke="#1b1f3a" stroke-width="5"/><circle cx="20" cy="20" r="14" fill="none" stroke="#fff" stroke-width="2.5"/><circle cx="20" cy="20" r="3.5" fill="#1b1f3a"/><circle cx="20" cy="20" r="1.8" fill="#fff"/></svg>')}") 20 20, crosshair`;

/** Knockback, bottom left: energy left over what you started with, and the weapon in hand. */
function KbStatus({ en, max, tired, weapon, lvl, small }: { en: number; max: number; tired: boolean; weapon: string; lvl: number; small: boolean }) {
  const low = en < max * 0.2;
  return (
    <div className="pointer-events-none drop-shadow-[0_2px_0_rgba(0,0,0,.45)]">
      <div className={cn('flex items-center gap-1.5 font-black tabular-nums', small ? 'text-[22px]' : 'text-[34px]', (tired || low) && 'cw-pulse text-[#ffb547]')}>
        {num(Math.max(0, Math.round(en)))}<span className={cn('text-white/70', small ? 'text-[15px]' : 'text-[20px]')}>/{num(max)}</span>
        <GameIcon k={tired ? 'batteryLow' : 'bolt'} size={small ? 20 : 28} />
      </div>
      <div className={cn('cw-title -mt-1 tracking-wide text-white uppercase', small ? 'text-[13px]' : 'text-[18px]')}>{weapon} <span style={{ color: blasterTier(lvl).color }}>· {tx(blasterTier(lvl).name)}</span></div>
    </div>
  );
}

function TeamStamp({ team }: { team: number }) {
  const [on, setOn] = useState(true);
  useEffect(() => { const tm = setTimeout(() => setOn(false), 2200); return () => clearTimeout(tm); }, []);
  if (!on) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center">
      <motion.div initial={{ scale: 2.4, rotate: -14, opacity: 0 }} animate={{ scale: 1, rotate: -8, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 14 }}
        className="text-center leading-[0.9] font-black uppercase" style={{ color: TEAM_COLORS[team], textShadow: '0 4px 0 #1d1a33, 3px 0 0 #1d1a33, -3px 0 0 #1d1a33, 0 -3px 0 #1d1a33, 0 10px 0 rgba(0,0,0,.2)' }}>
        <div className="text-[38px]">{t('Team', 'Equipo')}</div>
        <div className="text-[64px]">{tx(TEAM_NAMES[team])}</div>
      </motion.div>
    </div>
  );
}

/** Color Clash: blocks painted by each team. */
function TeamBar({ cells, wide }: { cells: number[]; wide: boolean }) {
  const total = Math.max(1, cells.reduce((a, b) => a + b, 0));
  return (
    <div className={cn('overflow-hidden rounded-full border-2 border-white/30 bg-white/60 shadow-lg', wide ? 'w-[min(60vw,520px)]' : 'w-[min(56vw,300px)]')}>
      <div className="flex h-6">
        {cells.map((c, i) => (
          <div key={i} className="flex items-center justify-center text-[12px] font-black text-white transition-[width] duration-300" style={{ width: `${(c / total) * 100}%`, background: TEAM_COLORS[i], textShadow: '0 1px 2px rgba(0,0,0,.5)' }}>
            {c / total > 0.08 ? num(c) : ''}
          </div>
        ))}
      </div>
    </div>
  );
}
