/* Class Wars — the in-game screen: canvas + HUD + controls (keyboard/mouse and touch),
   announcements, KO card, quiz and shop. Used by players (ClientSession) and, in spectator
   mode, by the projector (HostSession). */
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BookOpen, LogOut, Map as MapIcon, Pause, Play, Square, Users, Volume2, VolumeX, Crosshair, Zap } from 'lucide-react';
import { cn } from '@/lib/cn';
import { TEACHERS } from '@/features/cards/teachers';
import type { ClientSession, RenderSource, RP } from '../game/client';
import { FLAG, START_ENERGY } from '../game/constants';
import { BOX_EFFECTS, CHAR_IDS, INF, POWERS, WEAPONS } from '../game/defs';
import { hostSource, type HostSession } from '../game/host';
import type { Fxq } from '../game/vis';
import { Renderer, type CamMode } from '../render/renderer';
import { isMuted, setMuted, sfx, unlockAudio } from '../render/audio';
import { Btn, Diamond, fmtTime, useMobile } from './kit';
import { QuizOverlay } from './Quiz';

interface Hud {
  me: RP | null;
  remaining: number;
  board: { idx: number; name: string; char: number; dia: number; alive: boolean; bot: boolean }[];
  feed: { at: number; text: string; color: string }[];
  powerLeft: number;
  bonusLeft: number;
  paused: boolean;
  fps: number;
  quality: string;
  rank: number;
  total: number;
}
interface Announce { id: number; icon: string; title: string; desc: string; color: string }

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
  const [cam, setCam] = useState<CamMode>(client ? 'follow' : 'auto');
  const [ko, setKo] = useState<null | { at: number; killer: string; lost: number }>(null);
  const [startAt] = useState(() => performance.now());
  const [showIntro] = useState(() => (client ? client.joinedAtMs < 1500 : (host?.sim?.now ?? 0) < 1500));
  const debug = typeof location !== 'undefined' && location.search.includes('debug');
  const mouse = useRef<{ x: number; y: number } | null>(null);
  const keys = useRef(new Set<string>());
  const annId = useRef(0);

  const spectator = !client;

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
    const players = src.players().filter((p) => !p.decoy);
    const me = players.find((p) => p.me) ?? null;
    const board = (client ? client.leaderboard() : host!.leaderboard()).map((b) => ({ idx: b.idx, name: b.name, char: b.char, dia: b.dia, alive: b.alive, bot: b.bot }));
    const now = performance.now();
    return {
      me,
      remaining: src.remainingMs(),
      board,
      feed: src.vis.feed.filter((f) => now - f.at < 6000).slice(0, 4),
      powerLeft: client ? Math.max(0, client.powerReadyAt - now) : 0,
      bonusLeft: client ? Math.max(0, client.bonusReadyAt - now) : 0,
      paused: src.paused(),
      fps: rRef.current?.fps ?? 0,
      quality: rRef.current?.qualityLabel ?? '',
      rank: me ? board.findIndex((b) => b.idx === me.idx) + 1 : 0,
      total: board.length,
    };
  };

  const onFx = (f: Fxq, me: RP | null) => {
    if (!client || !me) return;
    if (f.t === 'box' && f.idx === me.idx) {
      const e = BOX_EFFECTS[f.eff];
      if (!e) return;
      let desc = '';
      switch (e.id) {
        case 'gadget': { const w = WEAPONS[f.param]; desc = `${w.icon} ${w.name}: ${w.desc}`; break; }
        case 'power': { const t = TEACHERS[f.param]; const p = POWERS[t.id]; desc = `${p.icon} ${p.name} de ${t.name} · 3 usos (tecla R)`; break; }
        case 'costume': { const t = TEACHERS[f.param]; desc = `¡Ahora eres ${t.name} durante 40 s… y tienes su poder!`; break; }
        case 'healer': desc = '¡Te curas automáticamente cada segundo!'; break;
        case 'shield': desc = 'Escudo al máximo y +50 extra.'; break;
        case 'speed': desc = '¡Corres muchísimo más rápido!'; break;
        case 'magnet': desc = 'Atraes todos los diamantes cercanos.'; break;
        case 'jackpot': desc = `¡Cofre lleno de diamantes!`; break;
        case 'happy': desc = 'Tus respuestas dan el doble de energía durante 30 s.'; break;
        case 'trap': desc = f.param ? `Perdiste ${f.param} diamantes… ¡recógelos rápido!` : '¡Uy! Por suerte no tenías diamantes.'; break;
      }
      if (f.dia > 0) desc = `+${f.dia} 💎 · ${desc}`;
      const id = ++annId.current;
      setAnn({ id, icon: e.icon, title: e.title, desc, color: e.color });
      setTimeout(() => setAnn((a) => (a?.id === id ? null : a)), 2800);
    }
    if (f.t === 'ko' && f.idx === me.idx) {
      setKo({ at: performance.now(), killer: f.killer >= 0 && f.killer !== me.idx ? client.roster.get(f.killer)?.name ?? '' : '', lost: f.lost });
      setQuiz(false);
      client.setQuiz(false);
    }
    if (f.t === 'tp' && f.idx === me.idx && f.kind === 'spawn') setKo(null);
  };

  /* ---------------------------------------------------------- input */
  const applyKeys = () => {
    if (!client) return;
    const k = keys.current;
    let mx = 0, my = 0;
    if (k.has('a') || k.has('arrowleft')) mx -= 1;
    if (k.has('d') || k.has('arrowright')) mx += 1;
    if (k.has('w') || k.has('arrowup')) my -= 1;
    if (k.has('s') || k.has('arrowdown')) my += 1;
    if (!joy.current.active) { client.input.mx = mx; client.input.my = my; }
  };
  const aimFromMouse = () => {
    const r = rRef.current;
    if (!client || !r || !mouse.current || joy.current.aiming) return;
    const w = r.worldFromScreen(mouse.current.x, mouse.current.y);
    const me = client.me;
    client.input.aim = Math.atan2(w.y - (me.y - 30), w.x - me.x);
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
      if (k === 'e' || k === ' ' || k === '2') { e.preventDefault(); client.powerPress(); }
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
  }, [client, quiz, openQuiz, closeQuiz]);

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
      client.input.target = w;
      rRef.current!.marker = { ...w, at: performance.now() };
    }
  };
  const onPointerMove = (e: React.PointerEvent) => {
    if (e.pointerType !== 'mouse') return;
    const rect = canvasRef.current!.getBoundingClientRect();
    mouse.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };
  const onPointerUp = (e: React.PointerEvent) => { if (client && e.pointerType === 'mouse' && e.button === 0) client.input.held = false; };

  /* ----------------------------------------------------- touch sticks */
  const joy = useRef({ active: false, id: -1, ox: 0, oy: 0, x: 0, y: 0, aiming: false, aid: -1 });
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
  const atkRef = useRef<HTMLDivElement>(null);
  const atkDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    unlockAudio();
    if (!client) return;
    const j = joy.current;
    j.aid = e.pointerId; j.aiming = false;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    autoAim();
    client.input.held = true;
    client.attackPress();
  };
  const atkMove = (e: React.PointerEvent) => {
    const j = joy.current;
    if (e.pointerId !== j.aid || !client || !atkRef.current) return;
    const r = atkRef.current.getBoundingClientRect();
    const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
    if (Math.hypot(dx, dy) > 20) { j.aiming = true; client.input.aim = Math.atan2(dy, dx); client.input.ad = Math.min(600, Math.hypot(dx, dy) * 5); }
  };
  const atkUp = (e: React.PointerEvent) => {
    const j = joy.current;
    if (e.pointerId !== j.aid || !client) return;
    j.aid = -1; j.aiming = false;
    client.input.held = false;
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
        style={{ cursor: client ? 'crosshair' : 'default' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        aria-label="Campo de batalla"
      />

      {/* top-left: diamonds + bars */}
      {client && me && (
        <div className="pointer-events-none absolute top-[max(10px,env(safe-area-inset-top))] left-3 flex flex-col gap-1.5">
          <motion.div key={me.dia} initial={{ scale: 1.18 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 600, damping: 15 }} className="flex w-max items-center gap-2 rounded-2xl border-2 border-white/15 bg-[#141a3f]/85 py-1.5 pr-4 pl-2.5 shadow-lg">
            <Diamond size={26} />
            <span className="text-[24px] leading-none font-black tabular-nums">{me.dia}</span>
            {goal ? <span className="text-[13px] font-bold text-white/55">/ {goal}</span> : null}
          </motion.div>
          <Energy value={me.en} tired={!!(me.flags & FLAG.tired)} />
          <Bar value={me.hp} max={me.maxHp} color="#34d058" />
          <Bar value={me.sh} max={100} color="#2f8cff" />
        </div>
      )}

      {/* out of energy: frozen until you answer */}
      {client && me && alive && !quiz && me.flags & FLAG.tired ? (
        <div className="absolute inset-x-0 top-[38%] z-30 flex justify-center px-4">
          <motion.div initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 420, damping: 18 }}
            className="w-[min(92vw,440px)] rounded-[24px] border-[3px] border-[#ff9f0a] bg-[#252b5e]/95 px-5 pt-4 pb-5 text-center shadow-[0_12px_0_rgba(0,0,0,.3)]">
            <div className="text-[44px] leading-none">🪫</div>
            <div className="cw-title mt-1 text-[28px] text-[#ffb547] uppercase">¡Sin energía!</div>
            <div className="mt-1 text-[15px] font-bold text-white/85">No puedes moverte ni atacar. Responde preguntas para recargar ⚡</div>
            <Btn tone="yellow" big className="cw-pulse mt-4 w-full" onClick={() => openQuiz('q')}><BookOpen size={22} /> Recargar energía {!mobile && <kbd className="rounded-md bg-black/20 px-1.5 text-[12px]">Q</kbd>}</Btn>
          </motion.div>
        </div>
      ) : null}

      {/* top-center: timer */}
      <div className="pointer-events-none absolute top-[max(10px,env(safe-area-inset-top))] left-1/2 flex -translate-x-1/2 flex-col items-center gap-1">
        <div className={cn('rounded-2xl border-2 border-white/15 bg-[#141a3f]/85 px-4 py-1 text-center shadow-lg', lowTime && 'cw-pulse border-[#ff4d5e]')}>
          <div className={cn('text-[22px] leading-tight font-black tabular-nums sm:text-[26px]', lowTime && 'text-[#ff8a95]')}>{fmtTime(remaining)}</div>
        </div>
        {spectator && code && <div className="rounded-full bg-[#ffd23f] px-3 py-0.5 text-[13px] font-black text-[#2a1d00]">Código: {code}</div>}
        {client && hud && hud.rank > 0 && <div className="rounded-full bg-black/35 px-2.5 py-0.5 text-[12px] font-extrabold text-white/90">#{hud.rank} de {hud.total}</div>}
      </div>

      {/* top-right: minimap + leaderboard + feed */}
      <div className="absolute top-[max(10px,env(safe-area-inset-top))] right-3 flex flex-col items-end gap-2">
        <div className="flex gap-2">
          {debug && <div className="rounded-lg bg-black/50 px-2 py-1 font-mono text-[11px]">{hud?.fps} fps · {hud?.quality} · {rRef.current?.workMs.toFixed(1)} ms</div>}
          <button type="button" aria-label={muted ? 'Activar sonido' : 'Silenciar'} onClick={() => { const m = !muted; setMute(m); setMuted(m); unlockAudio(); }} className="grid h-10 w-10 place-items-center rounded-xl bg-[#141a3f]/80 text-white hover:bg-[#141a3f]">{muted ? <VolumeX size={19} /> : <Volume2 size={19} />}</button>
          {spectator && (
            <>
              <button type="button" aria-label="Cámara" title={cam === 'auto' ? 'Ver mapa completo' : 'Seguir la acción'} onClick={() => setCam(cam === 'auto' ? 'map' : 'auto')} className="grid h-10 w-10 place-items-center rounded-xl bg-[#141a3f]/80 text-white hover:bg-[#141a3f]">{cam === 'auto' ? <MapIcon size={19} /> : <Crosshair size={19} />}</button>
              <button type="button" aria-label={hud?.paused ? 'Reanudar' : 'Pausar'} onClick={() => host!.setPaused(!hud?.paused)} className="grid h-10 w-10 place-items-center rounded-xl bg-[#141a3f]/80 text-white hover:bg-[#141a3f]">{hud?.paused ? <Play size={19} /> : <Pause size={19} />}</button>
              <button type="button" aria-label="Terminar partida" onClick={() => { if (confirm('¿Terminar la partida ahora?')) host!.endNow(); }} className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff4d5e]/85 text-white hover:bg-[#ff4d5e]"><Square size={17} /></button>
            </>
          )}
          {client && <button type="button" aria-label="Salir" onClick={() => { if (confirm('¿Salir de la partida?')) onExit(); }} className="grid h-10 w-10 place-items-center rounded-xl bg-[#141a3f]/80 text-white hover:bg-[#141a3f]"><LogOut size={18} /></button>}
        </div>
        <canvas ref={miniRef} width={spectator ? 220 : mobile ? 120 : 168} height={spectator ? 165 : mobile ? 90 : 126} className="rounded-xl border-2 border-white/25 shadow-lg" style={{ width: spectator ? 220 : mobile ? 120 : 168, height: spectator ? 165 : mobile ? 90 : 126 }} />
        {hud && (!mobile || spectator) && (
          <div className="pointer-events-none w-[220px] overflow-hidden rounded-2xl border-2 border-white/10 bg-[#141a3f]/95 shadow-lg">
            {hud.board.slice(0, spectator ? 8 : 5).map((b, i) => (
              <div key={b.idx} className={cn('flex items-center gap-2 px-2.5 py-1 text-[13.5px] font-extrabold', me && b.idx === me.idx && 'bg-[#ffd23f]/25', !b.alive && 'opacity-50')}>
                <span className={cn('w-5 text-center', i === 0 ? 'text-[#ffd23f]' : i === 1 ? 'text-[#d8e1ea]' : i === 2 ? 'text-[#e8a066]' : 'text-white/55')}>{i + 1}</span>
                <span className="h-3 w-3 shrink-0 rounded-full border border-black/40" style={{ background: TEACHERS[b.char]?.look.top }} />
                <span className="min-w-0 flex-1 truncate">{b.name}</span>
                <span className="flex items-center gap-1 tabular-nums">{b.dia}<Diamond size={13} /></span>
              </div>
            ))}
          </div>
        )}
        <div className="pointer-events-none flex flex-col items-end gap-1">
          <AnimatePresence>
            {hud?.feed.map((f) => (
              <motion.div key={f.at + f.text} initial={{ x: 40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ opacity: 0 }} className="max-w-[190px] truncate rounded-lg bg-black/45 px-2.5 py-1 text-[12px] font-bold sm:max-w-[260px] sm:text-[12.5px]" style={{ color: f.color }}>
                💥 {f.text}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* announcement card */}
      <AnimatePresence>
        {ann && (
          <motion.div key={ann.id} initial={{ y: -40, scale: 0.7, opacity: 0 }} animate={{ y: 0, scale: 1, opacity: 1 }} exit={{ y: -20, opacity: 0, scale: 0.9 }} transition={{ type: 'spring', stiffness: 420, damping: 20 }}
            className="pointer-events-none absolute top-[17%] left-1/2 z-30 w-[min(92vw,520px)] -translate-x-1/2">
            <div className="relative mt-8 rounded-[20px] border-[3px] border-[#ffd23f] bg-[#252b5e] px-5 pt-10 pb-4 text-center shadow-[0_12px_0_rgba(0,0,0,.3)]">
              <div className="absolute -top-9 left-1/2 grid h-[72px] w-[72px] -translate-x-1/2 place-items-center rounded-full border-[3px] border-[#ffd23f] bg-[#252b5e] text-[34px]">
                <div className="grid h-[54px] w-[54px] place-items-center rounded-full" style={{ background: ann.color + '44' }}>{ann.icon}</div>
              </div>
              <div className="cw-title text-[26px] leading-none tracking-wide uppercase sm:text-[30px]">{ann.title}</div>
              <div className="mt-2 text-[14.5px] font-bold text-white/90 sm:text-[16px]">{ann.desc}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* bottom-left: answer questions */}
      {client && !quiz && (
        <div className={cn('absolute left-3 flex flex-col gap-2', mobile ? 'top-[186px]' : 'bottom-[max(14px,env(safe-area-inset-bottom))]')}>
          <Btn tone="blue" big={!mobile} className={cn(mobile && 'h-12 px-4 text-[15px]')} onClick={() => openQuiz('q')} disabled={!alive}>
            <BookOpen size={mobile ? 18 : 22} /> {mobile ? 'Preguntas' : 'Responder preguntas'} {!mobile && <kbd className="rounded-md bg-black/25 px-1.5 text-[12px]">Q</kbd>}
          </Btn>
          {!mobile && <Btn tone="purple" onClick={() => openQuiz('shop')} disabled={!alive}><Zap size={18} /> Mejoras <kbd className="rounded-md bg-black/25 px-1.5 text-[12px]">B</kbd></Btn>}
        </div>
      )}

      {/* hotbar */}
      {client && me && hud && !quiz && (
        <div className={cn('absolute flex items-end gap-2', mobile ? 'right-3 bottom-[max(14px,env(safe-area-inset-bottom))] flex-col-reverse items-end' : 'bottom-[max(14px,env(safe-area-inset-bottom))] left-1/2 -translate-x-1/2')}>
          {!mobile && (
            <>
              <Slot k="1" active label={weapon.name} onClick={() => client.attackPress()}>
                <span className="text-[30px]">{weapon.icon}</span>
                <span className="absolute right-1.5 bottom-0.5 text-[13px] font-black">{me.ammo === INF ? '∞' : me.ammo}</span>
                <span className="absolute bottom-0.5 left-1.5 text-[11px] font-black text-[#ffe14d]">⚡{weapon.en}</span>
              </Slot>
              <Slot k="E" label={pw.name} cd={hud!.powerLeft / 1000} cdMax={pw.cd} color={pw.color} onClick={() => client.powerPress()}>
                <span className="text-[30px]">{pw.icon}</span>
              </Slot>
              {borrowed && (
                <Slot k="R" label={borrowed.name} cd={hud!.bonusLeft / 1000} cdMax={1.2} color={borrowed.color} onClick={() => client.bonusPress()}>
                  <span className="text-[28px]">{borrowed.icon}</span>
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
          <div className="absolute bottom-0 left-0 h-[46%] w-[48%]" onPointerDown={joyDown} onPointerMove={joyMove} onPointerUp={joyUp} onPointerCancel={joyUp}>
            {!joyVis && <div className="absolute bottom-[max(30px,env(safe-area-inset-bottom))] left-8 h-[112px] w-[112px] rounded-full border-[3px] border-white/25 bg-black/15" />}
          </div>
          {joyVis && (
            <div className="pointer-events-none fixed z-20" style={{ left: joyVis.ox - 56, top: joyVis.oy - 56 }}>
              <div className="h-[112px] w-[112px] rounded-full border-[3px] border-white/40 bg-black/20" />
              <div className="absolute h-[52px] w-[52px] rounded-full border-[3px] border-white bg-white/50" style={{ left: 30 + joyVis.x - joyVis.ox, top: 30 + joyVis.y - joyVis.oy }} />
            </div>
          )}
          <div className="absolute right-4 bottom-[max(20px,env(safe-area-inset-bottom))] flex items-end gap-3">
            <div className="flex flex-col items-center gap-3">
              {borrowed && (
                <TouchBtn onDown={powerTap(true)} color={borrowed.color} cd={hud.bonusLeft / 1000} cdMax={1.2} size={54}>
                  <span className="text-[24px]">{borrowed.icon}</span><span className="absolute -right-1 -bottom-1 rounded-full bg-black/60 px-1.5 text-[11px] font-black">×{me!.charges}</span>
                </TouchBtn>
              )}
              <TouchBtn onDown={powerTap(false)} color={pw.color} cd={hud.powerLeft / 1000} cdMax={pw.cd} size={64}><span className="text-[28px]">{pw.icon}</span></TouchBtn>
            </div>
            <div ref={atkRef} onPointerDown={atkDown} onPointerMove={atkMove} onPointerUp={atkUp} onPointerCancel={atkUp}
              className="relative grid h-[92px] w-[92px] place-items-center rounded-full border-[4px] border-white/80 bg-[#ff4d5e]/85 shadow-[0_6px_0_rgba(0,0,0,.3)] active:scale-95">
              <span className="text-[36px]">{weapon.icon}</span>
              <span className="absolute right-1 bottom-0 text-[14px] font-black">{me?.ammo === INF ? '∞' : me?.ammo}</span>
            </div>
          </div>
        </>
      )}

      {/* KO card */}
      {client && ko && !alive && (
        <div className="pointer-events-none absolute inset-0 z-30 grid place-items-center bg-[#0e1230]/40">
          <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="rounded-[24px] border-[3px] border-[#ff4d5e] bg-[#252b5e] px-8 py-6 text-center shadow-2xl">
            <div className="cw-title text-[44px] text-[#ff8a95]">¡K.O.!</div>
            <div className="text-[16px] font-bold text-white/85">{ko.killer ? `Te noqueó ${ko.killer}` : 'Quedaste fuera de combate'}</div>
            {ko.lost > 0 && <div className="mt-1 flex items-center justify-center gap-1 text-[16px] font-extrabold text-[#7ef0ff]">−{ko.lost} <Diamond size={18} /> (¡recupéralos!)</div>}
            <Respawn at={ko.at} />
          </motion.div>
        </div>
      )}

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
          <Users size={16} /> {hud.board.length} jugadores
        </div>
      )}

      {client && quiz && <QuizOverlay client={client} tab={quiz} setTab={(t) => setQuiz(t)} onClose={closeQuiz} />}

      {client && client.net === 'open' && !hud?.paused && hud && performance.now() - client.lastSnapLocal > 4000 && (
        <div className="absolute top-1/3 left-1/2 z-50 -translate-x-1/2 rounded-2xl bg-[#141a3f]/95 px-5 py-3 text-center text-[15px] font-extrabold shadow-xl">📡 Sin señal del profe… esperando que vuelva a conectarse</div>
      )}
      {client && client.net !== 'open' && (
        <div className="absolute bottom-24 left-1/2 z-50 -translate-x-1/2 rounded-full bg-[#ff9f0a] px-4 py-1.5 text-[13px] font-extrabold text-[#2a1d00]">Reconectando…</div>
      )}
      {client && me && hud && !mobile && !quiz && (
        <div className="pointer-events-none absolute bottom-[max(14px,env(safe-area-inset-bottom))] right-3 text-right text-[11.5px] leading-snug font-semibold text-white/70 drop-shadow">
          WASD moverse · clic atacar · clic derecho caminar<br />E poder · R poder prestado · Q preguntas · B mejoras<br /><span className="text-[#ffe14d]">Cada paso y disparo gasta ⚡ · responde para recargar</span>
        </div>
      )}
    </div>
  );
});

function Energy({ value, tired }: { value: number; tired: boolean }) {
  const k = Math.max(0, Math.min(1, value / START_ENERGY));
  const low = value < START_ENERGY * 0.15;
  return (
    <div className={cn('flex w-[136px] items-center gap-1.5 rounded-xl bg-[#141a3f]/85 p-1 pr-2 shadow sm:w-[180px]', (tired || low) && 'cw-pulse')}>
      <Zap size={17} className={cn('shrink-0', tired ? 'text-[#ff6b6b]' : 'text-[#ffe14d]')} fill="currentColor" />
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

function Slot({ k, children, active, label, cd = 0, cdMax = 1, color, onClick }: { k: string; children: React.ReactNode; active?: boolean; label: string; cd?: number; cdMax?: number; color?: string; onClick: () => void }) {
  const f = cd > 0 ? Math.min(1, cd / cdMax) : 0;
  return (
    <button type="button" onClick={onClick} title={label} className={cn('relative grid h-[74px] w-[92px] place-items-center rounded-2xl border-[3px] shadow-[0_6px_0_rgba(0,0,0,.3)]', active ? 'border-[#ffd23f] bg-gradient-to-b from-[#53d47a] to-[#2fa356]' : 'border-white/40 bg-gradient-to-b from-[#3d8bff] to-[#2a5fd0]')} style={!active && color ? { background: `linear-gradient(180deg, ${color}, #2a3577)` } : undefined}>
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

function Respawn({ at }: { at: number }) {
  const [, f] = useState(0);
  useEffect(() => { const t = setInterval(() => f((n) => n + 1), 200); return () => clearInterval(t); }, []);
  const left = Math.max(0, 4000 - (performance.now() - at));
  return <div className="mt-3 text-[15px] font-bold text-white/70">Reapareces en {Math.ceil(left / 1000)}…</div>;
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
        {n > 0 ? n : '¡YA!'}
      </motion.div>
    </div>
  );
}

