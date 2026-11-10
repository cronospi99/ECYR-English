/* You Draw (route /youdraw/*, full screen): the teacher runs the room on the projector, a random
   student draws one of three words on the phone, the rest guess it live.
   /youdraw             home
   /youdraw/host        teacher: room, settings, projector
   /youdraw/join[/CODE] student: name + character
   /youdraw/play/CODE   student: play on the phone */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Link, Route, Routes, useNavigate, useParams } from 'react-router-dom';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowLeft, Check, Crown, Eraser, Pencil, Play, Redo2, Send, SkipForward, Trash2, Undo2, Users, Volume2, VolumeX, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useAuth } from '@/store/auth';
import { makeCode, makeId, relayConfigured } from '@/lib/relay';
import { PetFace, PetMaker } from '@/features/games/PetAvatar';
import { savedPet, storePet } from '@/features/games/pet';
import { MusicBtn, MusicCredit, useGameMusic } from '@/features/games/music';
import { JoinQr } from '@/components/ui/JoinQr';
import { setLang, t, useLang } from '@/features/classwars/i18n';
import { CHOOSE_SECS, INK_COLORS, INK_H, INK_SIZES, INK_W, YD_REVEALS, YD_TIMES, YdClient, YdHost, type FeedE, type Ink, type PubPlayer, type Stroke } from './game';
import { YD_LEVELS, YD_WORDS } from './words';
import { isMuted, setMuted, sfx, unlockAudio } from './sfx';

const CSS = `
.yd-root{font-family:Inter,system-ui,-apple-system,sans-serif;-webkit-font-smoothing:antialiased;color:#fff;
  background:radial-gradient(900px 500px at 85% -10%,rgba(255,71,87,.35),transparent 60%),radial-gradient(800px 500px at -10% 110%,rgba(56,189,248,.28),transparent 60%),linear-gradient(160deg,#17123a 0%,#221a55 55%,#151034 100%);}
.yd-root:before{content:'';position:absolute;inset:0;pointer-events:none;opacity:.07;
  background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='180' height='180' fill='none' stroke='white' stroke-width='3' stroke-linecap='round'%3E%3Cpath d='M20 40c14-16 26 14 40 0s26 14 40 0'/%3E%3Cpath d='M130 120l18-30 8 4-18 30-10 4z'/%3E%3Ccircle cx='40' cy='130' r='14'/%3E%3Cpath d='M120 30l10 10m0-10l-10 10'/%3E%3C/svg%3E");}
.yd-title{font-weight:900;letter-spacing:-.02em}
.yd-card{border-radius:24px;background:rgba(255,255,255,.97);color:#1d1840;box-shadow:0 10px 0 rgba(10,6,40,.35),0 22px 44px rgba(0,0,0,.25)}
.yd-glass{border-radius:22px;background:rgba(255,255,255,.08);box-shadow:inset 0 0 0 1.5px rgba(255,255,255,.12)}
.yd-btn{display:inline-flex;align-items:center;justify-content:center;gap:.5rem;border-radius:16px;font-weight:900;transition:transform .08s}
.yd-btn:active{transform:translateY(3px)}
.yd-btn:disabled{opacity:.45;pointer-events:none}
.yd-tile{display:inline-grid;place-items:center;border-radius:10px;font-weight:900;text-transform:uppercase}
@keyframes yd-pop{0%{transform:scale(.4);opacity:0}60%{transform:scale(1.15);opacity:1}100%{transform:scale(1)}}
@keyframes yd-fall{0%{transform:translateY(-10vh) rotate(0)}100%{transform:translateY(110vh) rotate(720deg)}}
@keyframes yd-sweep{0%{transform:rotate(-28deg)}50%{transform:rotate(28deg)}100%{transform:rotate(-28deg)}}
@keyframes yd-glow{0%,100%{opacity:.55}50%{opacity:1}}
`;

function Btn({ tone = 'red', className, children, ...rest }: React.ButtonHTMLAttributes<HTMLButtonElement> & { tone?: 'red' | 'yellow' | 'green' | 'white' | 'ghost' }) {
  const tones = {
    red: 'bg-[#ff4757] text-white shadow-[0_5px_0_#b8232f]',
    yellow: 'bg-[#ffd23f] text-[#2a1d00] shadow-[0_5px_0_#c79a00]',
    green: 'bg-[#2fd27a] text-[#062a15] shadow-[0_5px_0_#16924d]',
    white: 'bg-white text-[#2a2170] shadow-[0_5px_0_#c9c3f2]',
    ghost: 'bg-white/12 text-white hover:bg-white/20',
  };
  return <button type="button" {...rest} className={cn('yd-btn h-12 px-5 text-[16px]', tones[tone], className)}>{children}</button>;
}

const savedName = () => { try { return localStorage.getItem('dd:name') ?? ''; } catch { return ''; } };
const store = (k: string, v: string) => { try { localStorage.setItem(k, v); } catch { /* ignore */ } };

function useSub(x: { subscribe: (f: () => void) => () => void } | null) {
  const [, f] = useState(0);
  useEffect(() => (x ? x.subscribe(() => f((n) => n + 1)) : undefined), [x]);
}
function useNow(ms = 250) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), ms); return () => clearInterval(i); }, [ms]);
  return now;
}

export default function YouDrawApp() {
  useLang();
  useEffect(() => {
    requestAnimationFrame(() => window.dispatchEvent(new Event('app:ready')));
    const prev = document.title;
    document.title = 'You Draw · ECYR English';
    return () => { document.title = prev; };
  }, []);
  return (
    <div className="yd-root relative h-dvh w-full overflow-hidden" onPointerDown={unlockAudio}>
      <style>{CSS}</style>
      <div className="relative h-full">
        <Routes>
          <Route index element={<Home />} />
          <Route path="host" element={<HostRoute />} />
          <Route path="join" element={<Join />} />
          <Route path="join/:code" element={<Join />} />
          <Route path="play/:code" element={<PlayRoute />} />
        </Routes>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ bits */
function Logo({ size = 64 }: { size?: number }) {
  return (
    <svg viewBox="0 0 64 64" width={size} height={size} aria-hidden>
      <circle cx="32" cy="32" r="30" fill="#ff4757" />
      <circle cx="32" cy="32" r="30" fill="none" stroke="#fff" strokeOpacity=".25" strokeWidth="3" />
      <path d="M18 44l4-12 20-20 8 8-20 20z" fill="#ffd23f" stroke="#1d1840" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M18 44l4-12 8 8z" fill="#f5c49a" stroke="#1d1840" strokeWidth="2.5" strokeLinejoin="round" />
      <path d="M38 16l8 8" stroke="#1d1840" strokeWidth="2.5" />
      <path d="M12 52c8-3 14 3 22 0s12-3 18 0" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

const Face = ({ ci, size }: { ci: number; size: number }) => <PetFace av={ci} size={size} />;

function LangSwitch() {
  const lang = useLang();
  return (
    <div className="flex rounded-full bg-white/12 p-1 text-[13px] font-black">
      {(['en', 'es'] as const).map((l) => <button key={l} type="button" onClick={() => setLang(l)} className={cn('rounded-full px-3 py-1', lang === l ? 'bg-white text-[#2a2170]' : 'text-white/80')}>{l.toUpperCase()}</button>)}
    </div>
  );
}

function MuteBtn() {
  const [m, setM] = useState(isMuted());
  return (
    <button type="button" onClick={() => { setMuted(!m); setM(!m); }} className="grid h-10 w-10 place-items-center rounded-full bg-white/12 hover:bg-white/20" aria-label={m ? t('Sound on', 'Activar sonido') : t('Mute', 'Silenciar')}>
      {m ? <VolumeX size={18} /> : <Volume2 size={18} />}
    </button>
  );
}

function Center({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn('grid h-full place-items-center overflow-y-auto p-4', className)}>{children}</div>;
}

function Loading({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <motion.div animate={{ rotate: [0, -12, 12, 0], y: [0, -6, 0] }} transition={{ repeat: Infinity, duration: 1.4 }}><Logo size={96} /></motion.div>
      <div className="yd-title text-[24px]">{text}</div>
      {sub && <div className="max-w-[320px] text-[15px] font-bold text-white/75">{sub}</div>}
    </div>
  );
}

/* ------------------------------------------------------------------ home */
function Home() {
  return (
    <div className="h-full overflow-y-auto px-4 pt-[max(14px,env(safe-area-inset-top))] pb-10">
      <div className="mx-auto flex max-w-[780px] flex-col items-center">
        <div className="flex w-full items-center justify-between">
          <Link to="/games" className="grid h-10 w-10 place-items-center rounded-full bg-white/12 hover:bg-white/20" aria-label={t('Back', 'Volver')}><ArrowLeft /></Link>
          <LangSwitch />
        </div>
        <motion.div initial={{ scale: 0.6, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', stiffness: 260, damping: 14 }} className="mt-4"><Logo size={120} /></motion.div>
        <h1 className="yd-title mt-2 text-center text-[52px] leading-none sm:text-[68px]">You Draw</h1>
        <p className="mt-3 max-w-[560px] text-center text-[17px] font-bold text-white/80">
          {t('The teacher runs the game. One student draws a word in English, everyone else watches it appear live and races to guess it.', 'El profe dirige el juego. Un estudiante dibuja una palabra en inglés y los demás la ven aparecer en vivo y corren a adivinarla.')}
        </p>
        <div className="mt-6 grid w-full max-w-[540px] gap-3 sm:grid-cols-2">
          <Link to="/youdraw/host"><Btn tone="red" className="h-16 w-full text-[19px]">{t("I'm the teacher", 'Soy el profe')}</Btn></Link>
          <Link to="/youdraw/join"><Btn tone="white" className="h-16 w-full text-[19px]">{t('Join with a code', 'Unirme con código')}</Btn></Link>
        </div>
        <div className="mt-8 grid w-full gap-3 sm:grid-cols-3">
          {[
            { n: 1, h: t('A random student', 'Un estudiante al azar'), p: t('The game picks who draws and gives 3 words of the class level.', 'El juego elige quién dibuja y le da 3 palabras del nivel.') },
            { n: 2, h: t('Draw it live', 'Dibuja en vivo'), p: t('Everyone sees the drawing on their phone as it is made.', 'Todos ven el dibujo en su celular mientras se hace.') },
            { n: 3, h: t('Guess fast', 'Adivina rápido'), p: t('Type the word. Letters appear as time runs out. Faster = more points.', 'Escribe la palabra. Aparecen letras con el tiempo. Más rápido = más puntos.') },
          ].map((s) => (
            <div key={s.n} className="yd-glass p-4">
              <div className="grid h-9 w-9 place-items-center rounded-full bg-[#ff4757] text-[17px] font-black">{s.n}</div>
              <div className="mt-2 text-[18px] font-black">{s.h}</div>
              <div className="text-[14px] font-semibold text-white/75">{s.p}</div>
            </div>
          ))}
        </div>
        <p className="mt-6 text-center text-[13.5px] font-bold text-white/60">{YD_LEVELS.map((l) => `${l.label}: ${YD_WORDS[l.id].length}`).join(' · ')} {t('words', 'palabras')}</p>
        <MusicCredit className="mt-5" />
        {!relayConfigured() && <p className="mt-4 rounded-2xl bg-black/30 px-4 py-3 text-center text-[14px] font-bold">{t('The live game server is not set up in this deployment (VITE_RELAY_URL).', 'El servidor de juego en vivo no está configurado en este despliegue (VITE_RELAY_URL).')}</p>}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ join */
function Join() {
  const { code: param } = useParams();
  const nav = useNavigate();
  const profile = useAuth((s) => s.profile);
  const [code, setCode] = useState((param ?? '').toUpperCase());
  const [name, setName] = useState(() => savedName() || (profile?.full_name ?? '').split(' ')[0] || '');
  const [av, setAv] = useState(savedPet);
  const ok = /^[A-Z0-9]{4,8}$/.test(code) && name.trim().length >= 2;
  const go = () => { if (!ok) return; store('dd:name', name.trim()); storePet(av); nav(`/youdraw/play/${code}`); };
  return (
    <Center>
      <div className="yd-card w-full max-w-[440px] p-6">
        <div className="mb-3 flex items-center gap-3">
          <Link to="/youdraw" className="grid h-10 w-10 place-items-center rounded-full bg-[#eeeaff] text-[#2a2170]" aria-label={t('Back', 'Volver')}><ArrowLeft /></Link>
          <h1 className="text-[26px] font-black">{t('Join', 'Unirme')}</h1>
          <div className="ml-auto"><Logo size={52} /></div>
        </div>
        <label htmlFor="yd-code" className="text-[13px] font-extrabold tracking-wide text-[#7a70b8] uppercase">{t('Room code', 'Código de la sala')}</label>
        <input id="yd-code" value={code} onChange={(e) => setCode(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8))} placeholder="ABCD" autoCapitalize="characters" autoComplete="off" onKeyDown={(e) => e.key === 'Enter' && go()}
          className="mt-1 h-16 w-full rounded-2xl border-[3px] border-[#ddd6ff] text-center text-[38px] font-black tracking-[0.2em] text-[#1d1840] outline-none focus:border-[#ff4757]" />
        <div className="mt-4 mb-1 text-[13px] font-extrabold tracking-wide text-[#7a70b8] uppercase">{t('You', 'Tú')}</div>
        <input value={name} onChange={(e) => setName(e.target.value.slice(0, 18))} placeholder={t('Your name', 'Tu nombre')} aria-label={t('Your name', 'Tu nombre')} autoFocus={!!param}
          className="h-12 w-full rounded-2xl border-[3px] border-[#ddd6ff] bg-white px-4 text-[18px] font-extrabold text-[#1d1840] outline-none focus:border-[#ff4757]" onKeyDown={(e) => e.key === 'Enter' && go()} />
        <div className="mt-2"><PetMaker av={av} onChange={setAv} /></div>
        <Btn tone="red" className="mt-5 h-14 w-full text-[19px]" disabled={!ok} onClick={go}>{t('Join!', '¡Entrar!')}</Btn>
      </div>
    </Center>
  );
}

/* ------------------------------------------------------------- drawing */
/** Draws an Ink (white paper, 4:3) and keeps up with it stroke by stroke. */
function InkCanvas({ ink, className, children }: { ink: Ink; className?: string; children?: ReactNode }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current!;
    const g = cv.getContext('2d')!;
    let drawn = new Map<number, number>();
    let k = 1;
    const seg = (s: Stroke, from: number) => {
      const p = s.p;
      if (!p.length) return;
      const lw = Math.max(1, INK_SIZES[s.w] * k);
      g.strokeStyle = g.fillStyle = INK_COLORS[s.c];
      g.lineWidth = lw;
      if (p.length === 2) { g.beginPath(); g.arc(p[0] * k, p[1] * k, lw / 2, 0, Math.PI * 2); g.fill(); return; }
      const st = Math.max(0, from - 2);
      g.beginPath();
      g.moveTo(p[st] * k, p[st + 1] * k);
      for (let i = st + 2; i < p.length; i += 2) g.lineTo(p[i] * k, p[i + 1] * k);
      g.stroke();
    };
    const full = () => {
      g.fillStyle = '#fff';
      g.fillRect(0, 0, cv.width, cv.height);
      drawn = new Map();
      for (const s of ink.strokes) { seg(s, 0); drawn.set(s.id, s.p.length); }
    };
    const inc = () => {
      for (let i = ink.strokes.length - 1; i >= 0; i--) {
        const s = ink.strokes[i];
        const d = drawn.get(s.id) ?? 0;
        if (d >= s.p.length) break;
        seg(s, d);
        drawn.set(s.id, s.p.length);
      }
    };
    const resize = () => {
      const w = cv.clientWidth || 1;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(w * dpr * (INK_H / INK_W));
      k = cv.width / INK_W;
      g.lineCap = 'round';
      g.lineJoin = 'round';
      full();
    };
    const ro = new ResizeObserver(resize);
    ro.observe(cv);
    resize();
    const off = ink.on((f) => (f ? full() : inc()));
    return () => { ro.disconnect(); off(); };
  }, [ink]);
  return (
    <div className={cn('relative aspect-[4/3] w-full overflow-hidden rounded-[18px] bg-white shadow-[0_8px_0_rgba(10,6,40,.35)]', className)}>
      <canvas ref={ref} className="absolute inset-0 h-full w-full" />
      {children}
    </div>
  );
}

/** The drawer's pad: draw with finger, pen or mouse; colours, sizes, eraser, undo, clear. */
function DrawPad({ client, maxH }: { client: YdClient; maxH: string }) {
  const [c, setC] = useState(0);
  const [w, setW] = useState(1);
  const [eraser, setEraser] = useState(false);
  const id = useRef(Math.floor(Date.now() / 7) % 1_000_000_000);
  const cur = useRef<{ id: number; x: number; y: number } | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const pt = (e: { clientX: number; clientY: number }) => {
    const r = box.current!.getBoundingClientRect();
    return [Math.round(((e.clientX - r.left) / r.width) * INK_W), Math.round(((e.clientY - r.top) / r.height) * INK_H)];
  };
  const col = eraser ? 1 : c;
  const down = (e: React.PointerEvent) => {
    if (e.button > 0) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    const [x, y] = pt(e);
    const sid = ++id.current;
    cur.current = { id: sid, x, y };
    client.draw(sid, col, w, [x, y]);
  };
  const move = (e: React.PointerEvent) => {
    const s = cur.current;
    if (!s) return;
    const evs = (e.nativeEvent as PointerEvent).getCoalescedEvents?.() ?? [e.nativeEvent];
    const pts: number[] = [];
    for (const ev of evs.length ? evs : [e.nativeEvent]) {
      const [x, y] = pt(ev);
      if ((x - s.x) ** 2 + (y - s.y) ** 2 < 6) continue;
      // light smoothing: halfway to the finger
      const sx = Math.round((s.x + x) / 2 * 0.4 + x * 0.6), sy = Math.round((s.y + y) / 2 * 0.4 + y * 0.6);
      pts.push(sx, sy);
      s.x = sx; s.y = sy;
    }
    if (pts.length) client.draw(s.id, col, w, pts);
  };
  const up = (e: React.PointerEvent) => {
    const s = cur.current;
    if (s) { const [x, y] = pt(e); if ((x - s.x) ** 2 + (y - s.y) ** 2 >= 4) client.draw(s.id, col, w, [x, y]); }
    cur.current = null;
  };
  return (
    <div className="flex w-full flex-col items-center gap-2">
      <div ref={box} className="w-full touch-none select-none" style={{ maxWidth: `calc(${maxH} * 4 / 3)` }} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} onLostPointerCapture={() => { cur.current = null; }}>
        <InkCanvas ink={client.ink} className="cursor-crosshair" />
      </div>
      <div className="flex w-full max-w-[760px] flex-wrap items-center justify-center gap-1.5 rounded-[18px] bg-black/25 p-1.5">
        {INK_COLORS.map((hex, i) => (
          <button key={hex} type="button" onClick={() => { setC(i); setEraser(false); }} aria-label={`${t('Colour', 'Color')} ${i + 1}`}
            className={cn('h-8 w-8 rounded-full border-2 transition-transform', !eraser && c === i ? 'scale-110 border-white ring-2 ring-[#ff4757]' : 'border-white/40')} style={{ background: hex }} />
        ))}
        <span className="mx-1 h-7 w-px bg-white/20" />
        {INK_SIZES.map((s, i) => (
          <button key={s} type="button" onClick={() => setW(i)} aria-label={`${t('Size', 'Tamaño')} ${i + 1}`} className={cn('grid h-9 w-9 place-items-center rounded-xl', w === i ? 'bg-white text-[#1d1840]' : 'bg-white/10')}>
            <span className="rounded-full bg-current" style={{ width: 4 + i * 5, height: 4 + i * 5 }} />
          </button>
        ))}
        <span className="mx-1 h-7 w-px bg-white/20" />
        <button type="button" onClick={() => setEraser(!eraser)} aria-label={t('Eraser', 'Borrador')} className={cn('grid h-9 w-9 place-items-center rounded-xl', eraser ? 'bg-white text-[#1d1840]' : 'bg-white/10')}><Eraser size={18} /></button>
        <button type="button" onClick={() => client.undo()} aria-label={t('Undo', 'Deshacer')} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><Undo2 size={18} /></button>
        <button type="button" onClick={() => { if (client.ink.strokes.length && confirm(t('Clear the drawing?', '¿Borrar todo el dibujo?'))) client.clearInk(); }} aria-label={t('Clear', 'Borrar todo')} className="grid h-9 w-9 place-items-center rounded-xl bg-white/10"><Trash2 size={18} /></button>
      </div>
    </div>
  );
}

/** The word as letter tiles: "_" for hidden letters. */
function Mask({ mask, big }: { mask: string; big?: boolean }) {
  const words = mask.split(' ');
  const letters = [...mask].filter((ch) => ch !== ' ' && ch !== '-' && ch !== "'").length;
  const sz = big ? (mask.length > 18 ? 'h-9 w-7 text-[22px]' : 'h-12 w-10 text-[30px]') : mask.length > 12 ? 'h-7 w-[18px] text-[15px]' : 'h-8 w-6 text-[19px]';
  return (
    <div className={cn('flex flex-wrap items-center justify-center gap-y-1.5', big ? 'gap-x-4' : 'gap-x-2.5')} aria-label={mask.replace(/_/g, '?')}>
      {words.map((w, wi) => (
        <div key={wi} className={cn('flex', big ? 'gap-1' : 'gap-[3px]')}>
          {[...w].map((ch, i) => (
            <motion.span key={`${i}-${ch}`} initial={ch !== '_' ? { scale: 0.3, rotate: -20 } : false} animate={{ scale: 1, rotate: 0 }}
              className={cn('yd-tile', sz, ch === '_' ? 'bg-white/14 text-transparent shadow-[inset_0_-4px_0_rgba(255,255,255,.35)]' : /[a-z0-9]/i.test(ch) ? 'bg-[#ffd23f] text-[#2a1d00] shadow-[0_3px_0_#c79a00]' : 'w-auto bg-transparent px-0.5 text-white')}>
              {ch === '_' ? '·' : ch}
            </motion.span>
          ))}
        </div>
      ))}
      <span className="text-[13px] font-black text-white/60">{letters}</span>
    </div>
  );
}

function TimerBar({ endsAt, total, className }: { endsAt: number; total: number; className?: string }) {
  const now = useNow(200);
  const left = Math.max(0, Math.ceil((endsAt - now) / 1000));
  const k = Math.max(0, Math.min(1, (endsAt - now) / 1000 / Math.max(1, total)));
  const low = left <= 10;
  return (
    <div className={cn('flex items-center gap-2', className)}>
      <div className="h-3.5 min-w-[90px] flex-1 overflow-hidden rounded-full bg-black/30"><div className="h-full rounded-full transition-[width] duration-200 ease-linear" style={{ width: `${k * 100}%`, background: low ? '#ff4757' : '#ffd23f' }} /></div>
      <span className={cn('w-12 text-right text-[20px] font-black tabular-nums', low && 'text-[#ff8a95]')}>{left}s</span>
    </div>
  );
}

function FeedList({ feed, max = 40, small }: { feed: FeedE[]; max?: number; small?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => { ref.current?.scrollTo({ top: ref.current.scrollHeight, behavior: 'smooth' }); }, [feed.length]);
  return (
    <div ref={ref} className={cn('flex min-h-0 flex-col gap-1 overflow-y-auto', small ? 'text-[13.5px]' : 'text-[15px]')}>
      {feed.slice(-max).map((e, i) => (
        <div key={i} className={cn('flex items-center gap-2 rounded-xl px-2 py-1', e.ok ? 'bg-[#2fd27a]/20 text-[#9ff5c4]' : e.sys ? 'text-white/60 italic' : 'bg-white/6')}>
          {e.av !== undefined && <Face ci={e.av} size={small ? 22 : 28} />}
          {e.ok ? <span className="font-black">{e.n} {t('guessed it!', '¡la adivinó!')}</span> : e.sys ? <span className="font-bold">{e.sys}</span> : <span className="min-w-0 truncate"><b className="font-black">{e.n}:</b> {e.g}</span>}
          {e.ok && <Check size={16} className="ml-auto shrink-0" />}
        </div>
      ))}
    </div>
  );
}

function Scoreboard({ players, drawer, onKick, compact }: { players: PubPlayer[]; drawer: string | null; onKick?: (p: string) => void; compact?: boolean }) {
  const sorted = [...players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
  return (
    <div className="flex min-h-0 flex-col gap-1 overflow-y-auto">
      <AnimatePresence initial={false}>
        {sorted.map((p, i) => (
          <motion.div key={p.peer} layout initial={{ opacity: 0, x: -20 }} animate={{ opacity: p.online ? 1 : 0.45, x: 0 }} exit={{ opacity: 0 }}
            className={cn('group flex items-center gap-2 rounded-2xl px-2 py-1', p.peer === drawer ? 'bg-[#ff4757]/30 ring-2 ring-[#ff4757]' : p.guessed ? 'bg-[#2fd27a]/20' : 'bg-white/6')}>
            <span className="w-5 text-right text-[13px] font-black text-white/60">{i + 1}</span>
            <Face ci={p.av} size={compact ? 30 : 38} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-[15px] font-black">{p.name}</div>
              <div className="text-[12.5px] font-bold text-white/70 tabular-nums">{p.score} pts{p.gain ? <span className="ml-1 text-[#9ff5c4]">+{p.gain}</span> : null}</div>
            </div>
            {p.peer === drawer && <Pencil size={17} className="shrink-0 text-[#ffb3ba]" />}
            {p.guessed && <Check size={18} className="shrink-0 text-[#2fd27a]" />}
            {onKick && <button type="button" onClick={() => { if (confirm(t(`Remove ${p.name} from the room?`, `¿Sacar a ${p.name} de la sala?`))) onKick(p.peer); }} className="hidden h-7 w-7 shrink-0 place-items-center rounded-lg bg-white/10 group-hover:grid" aria-label={t('Remove', 'Sacar')}><X size={15} /></button>}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------- roulette */
/** Hops a highlight over the candidates, slowing down, and lands on the drawer. */
function useSpin(n: number, target: number, key: string, total = 3000) {
  const [i, setI] = useState(0);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (n <= 0 || target < 0) return;
    setDone(false);
    const hops = Math.max(n * 2, 14) + ((target - (Math.max(n * 2, 14) % n) + n) % n);
    const delays: number[] = [];
    let sum = 0;
    for (let h = 0; h < hops; h++) { const d = 40 + 300 * (h / hops) ** 2.4; delays.push(d); sum += d; }
    const k = (total - 300) / sum;
    let at = 0;
    const ts: ReturnType<typeof setTimeout>[] = [];
    for (let h = 1; h <= hops; h++) {
      at += delays[h - 1] * k;
      const idx = h % n;
      ts.push(setTimeout(() => { setI(idx); if (h === hops) { setDone(true); sfx.land(); } else sfx.hop(); }, at));
    }
    setI(0);
    return () => ts.forEach(clearTimeout);
  }, [n, target, key, total]);
  return { i, done };
}

function Roulette({ cands, drawer, round, big }: { cands: PubPlayer[]; drawer: string | null; round: number; big?: boolean }) {
  const target = cands.findIndex((p) => p.peer === drawer);
  const { i, done } = useSpin(cands.length, target, `${round}:${drawer}`);
  const cur = cands[i];
  if (!big) {
    return (
      <div className="flex flex-col items-center">
        <motion.div key={cur?.peer} initial={{ scale: 0.85 }} animate={{ scale: done ? 1.15 : 1 }} className={cn('rounded-[28px] p-2', done ? 'bg-[#ff4757]' : 'bg-white/10')}>
          <Face ci={cur?.av ?? 0} size={150} />
        </motion.div>
        <div className="yd-title mt-2 text-[26px]">{cur?.name}</div>
      </div>
    );
  }
  return (
    <div className="flex w-full max-w-[1100px] flex-wrap justify-center gap-2">
      {cands.map((p, k) => (
        <motion.div key={p.peer} animate={{ scale: k === i ? (done ? 1.25 : 1.1) : 1, opacity: done && k !== i ? 0.35 : 1 }} transition={{ type: 'spring', stiffness: 500, damping: 22 }}
          className={cn('flex w-[110px] flex-col items-center rounded-2xl p-1.5', k === i ? 'bg-[#ff4757] shadow-[0_0_40px_rgba(255,71,87,.7)]' : 'bg-white/8')}>
          <Face ci={p.av} size={76} />
          <div className="w-full truncate text-center text-[14px] font-black">{p.name}</div>
        </motion.div>
      ))}
    </div>
  );
}

/* --------------------------------------------------------------- podium */
type Ranked = { peer: string; name: string; av: number; score: number };
function Podium({ ranking, me, children }: { ranking: Ranked[]; me?: string; children?: ReactNode }) {
  const [stage, setStage] = useState(0); // 0 black · 1 words · 2 red wipe · 3 podium
  useEffect(() => {
    sfx.roll(2.6);
    const ts = [setTimeout(() => setStage(1), 700), setTimeout(() => setStage(2), 3000), setTimeout(() => { setStage(3); sfx.fanfare(); }, 3900)];
    return () => ts.forEach(clearTimeout);
  }, []);
  const top = ranking.slice(0, 3);
  const rest = ranking.slice(3, 12);
  const myRank = me ? ranking.findIndex((r) => r.peer === me) : -1;
  const slots = [
    { r: top[1], place: 2, h: 'h-[22vh]', delay: 0.9, bg: 'linear-gradient(180deg,#f1f5f9,#94a3b8)', ink: '#334155' },
    { r: top[0], place: 1, h: 'h-[31vh]', delay: 1.7, bg: 'linear-gradient(180deg,#fff1a8,#f5b301)', ink: '#5a3d00' },
    { r: top[2], place: 3, h: 'h-[15vh]', delay: 0.2, bg: 'linear-gradient(180deg,#ffd0a8,#c26a2c)', ink: '#4a2207' },
  ];
  const confetti = useMemo(() => Array.from({ length: 70 }, (_, i) => ({ l: Math.random() * 100, d: 2.6 + Math.random() * 2.4, dl: 1.8 + Math.random() * 2.5, c: ['#ffd23f', '#ffffff', '#2fd27a', '#38bdf8', '#ff9ff3'][i % 5], s: 6 + Math.random() * 8 })), []);
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black">
      <AnimatePresence>
        {stage >= 1 && stage < 3 && (
          <motion.div key="words" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.8 }}
            className="absolute inset-0 z-10 grid place-items-center text-center">
            <div className="yd-title px-6 text-[clamp(30px,6vw,72px)] text-white">{t('And the winners are…', 'Y los ganadores son…')}</div>
          </motion.div>
        )}
      </AnimatePresence>
      <motion.div className="absolute inset-0" initial={{ clipPath: 'circle(0% at 50% 62%)' }} animate={stage >= 2 ? { clipPath: 'circle(150% at 50% 62%)' } : {}} transition={{ duration: 1.1, ease: [0.7, 0, 0.3, 1] }}
        style={{ background: 'radial-gradient(ellipse at 50% 30%,#ff3b3b 0%,#d1121f 38%,#7d0010 78%,#3a0008 100%)' }}>
        {stage >= 3 && (
          <>
            <div className="pointer-events-none absolute -top-[20vh] left-[18%] h-[120vh] w-[26vw] origin-top bg-[linear-gradient(180deg,rgba(255,255,255,.35),transparent_75%)] [clip-path:polygon(45%_0,55%_0,100%_100%,0_100%)]" style={{ animation: 'yd-sweep 6s ease-in-out infinite' }} />
            <div className="pointer-events-none absolute -top-[20vh] right-[18%] h-[120vh] w-[26vw] origin-top bg-[linear-gradient(180deg,rgba(255,255,255,.35),transparent_75%)] [clip-path:polygon(45%_0,55%_0,100%_100%,0_100%)]" style={{ animation: 'yd-sweep 6s ease-in-out infinite reverse' }} />
            {confetti.map((c, i) => <span key={i} className="pointer-events-none absolute top-0 rounded-sm" style={{ left: `${c.l}%`, width: c.s, height: c.s * 0.5, background: c.c, animation: `yd-fall ${c.d}s linear ${c.dl}s infinite` }} />)}
          </>
        )}
        <div className="relative flex h-full flex-col items-center overflow-y-auto px-3 pt-[max(18px,env(safe-area-inset-top))] pb-28">
          {stage >= 3 && <motion.div initial={{ y: -30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="yd-title flex items-center gap-2 text-[clamp(26px,4.4vw,52px)] text-white drop-shadow-[0_4px_0_rgba(0,0,0,.35)]"><Crown className="text-[#ffd23f]" size={40} /> {t('Winners', 'Ganadores')}</motion.div>}
          <div className="mt-auto flex w-full max-w-[860px] items-end justify-center gap-2 sm:gap-4">
            {slots.map((s) => (
              <div key={s.place} className="flex w-[31%] max-w-[240px] flex-col items-center">
                {stage >= 3 && s.r && (
                  <motion.div initial={{ y: 40, opacity: 0, scale: 0.5 }} animate={{ y: 0, opacity: 1, scale: 1 }} transition={{ delay: s.delay + 0.45, type: 'spring', stiffness: 300, damping: 15 }} className="mb-1 flex flex-col items-center text-center">
                    {s.place === 1 && <Crown size={34} className="text-[#ffd23f] drop-shadow" style={{ animation: 'yd-glow 1.6s ease-in-out infinite' }} />}
                    <div className={cn('rounded-full bg-white/15 p-1', s.r.peer === me && 'ring-4 ring-[#ffd23f]')}><Face ci={s.r.av} size={s.place === 1 ? 104 : 84} /></div>
                    <div className="mt-1 max-w-full truncate text-[clamp(15px,2.2vw,24px)] font-black text-white">{s.r.name}</div>
                    <div className="text-[clamp(13px,1.6vw,18px)] font-extrabold text-white/85 tabular-nums">{s.r.score} pts</div>
                  </motion.div>
                )}
                <motion.div initial={{ scaleY: 0 }} animate={stage >= 3 ? { scaleY: 1 } : {}} transition={{ delay: s.delay, type: 'spring', stiffness: 120, damping: 16 }} style={{ background: s.bg, transformOrigin: 'bottom' }}
                  className={cn('grid w-full place-items-start justify-center rounded-t-[20px] pt-2 shadow-[inset_0_-12px_0_rgba(0,0,0,.15),0_10px_30px_rgba(0,0,0,.35)]', s.h)}>
                  <span className="text-[clamp(38px,6vw,76px)] leading-none font-black" style={{ color: s.ink }}>{s.place}</span>
                </motion.div>
              </div>
            ))}
          </div>
          {stage >= 3 && rest.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.6 }} className="mt-4 grid w-full max-w-[860px] gap-1.5 rounded-[22px] bg-black/30 p-2 sm:grid-cols-3">
              {rest.map((r, k) => (
                <div key={r.peer} className={cn('flex items-center gap-2 rounded-xl px-2 py-1', r.peer === me ? 'bg-[#ffd23f] text-[#2a1d00]' : 'bg-white/8 text-white')}>
                  <span className="w-6 text-right font-black">{k + 4}</span><Face ci={r.av} size={30} /><span className="min-w-0 flex-1 truncate font-black">{r.name}</span><span className="font-bold tabular-nums">{r.score}</span>
                </div>
              ))}
            </motion.div>
          )}
          {stage >= 3 && myRank >= 0 && <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.9 }} className="mt-3 rounded-2xl bg-white px-4 py-2 text-[18px] font-black text-[#7d0010]">{t(`You finished #${myRank + 1}`, `Quedaste de #${myRank + 1}`)}</motion.div>}
          {children}
        </div>
      </motion.div>
    </div>
  );
}

/* ----------------------------------------------------------------- host */
function HostRoute() {
  const nav = useNavigate();
  const [host, setHost] = useState<YdHost | null>(null);
  useEffect(() => {
    if (!relayConfigured()) return;
    const h = new YdHost(makeCode());
    h.onSound = (s) => { if (s !== 'spin') sfx[s](); };
    if (import.meta.env.DEV) (window as unknown as { __yd: unknown }).__yd = h;
    setHost(h);
    return () => h.close();
  }, []);
  if (!relayConfigured()) return <Center><Loading text={t('The live game server is not set up.', 'El servidor de juego en vivo no está configurado.')} /></Center>;
  if (!host) return null;
  return <HostScreen host={host} onExit={() => nav('/youdraw')} />;
}

function Chip({ on, children, onClick }: { on: boolean; children: ReactNode; onClick: () => void }) {
  return <button type="button" onClick={onClick} className={cn('rounded-xl px-3 py-2 text-[15px] font-black transition-colors', on ? 'bg-[#ff4757] text-white shadow-[0_3px_0_#b8232f]' : 'bg-[#f0edff] text-[#3a3180] hover:bg-[#e4dfff]')}>{children}</button>;
}

function HostScreen({ host, onExit }: { host: YdHost; onExit: () => void }) {
  useSub(host);
  useGameMusic();
  const ph = host.phase;
  const players = host.list;
  const online = players.filter((p) => p.online);
  const drawer = host.drawer ? host.players.get(host.drawer) : null;
  const s = host.set;

  const bar = (
    <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-2 rounded-[22px] bg-[#0f0b29]/85 p-2 shadow-xl backdrop-blur">
      <JoinQr path="/youdraw/join" code={host.code} size={40} label={t('Show the QR full screen', 'Mostrar el QR en grande')} />
      <span className="rounded-xl bg-white px-3 py-1 text-[20px] font-black tracking-[0.15em] text-[#2a2170]">{host.code}</span>
      {ph !== 'lobby' && ph !== 'end' && <span className="px-1 text-[14px] font-extrabold">{t('Round', 'Ronda')} {host.round}/{s.rounds}</span>}
      {(ph === 'spin' || ph === 'choose') && <Btn tone="ghost" className="h-11" onClick={() => host.reroll()}><Redo2 size={18} /> {t('Another student', 'Otro estudiante')}</Btn>}
      {ph === 'draw' && <Btn tone="ghost" className="h-11" onClick={() => host.endRound()}><SkipForward size={18} /> {t('End turn', 'Terminar turno')}</Btn>}
      {ph === 'result' && <Btn tone="yellow" className="h-11" onClick={() => host.next()}><SkipForward size={18} /> {host.round >= s.rounds ? t('See the winners', 'Ver ganadores') : t('Next round', 'Siguiente ronda')}</Btn>}
      {ph !== 'lobby' && ph !== 'end' && (
        <label className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-white/10 px-2.5 py-2 text-[13px] font-black">
          <input type="checkbox" checked={host.auto} onChange={(e) => host.setAuto(e.target.checked)} className="h-4 w-4 accent-[#ff4757]" /> {t('Auto next', 'Auto')}
        </label>
      )}
      {ph !== 'lobby' && ph !== 'end' && <button type="button" onClick={() => { if (confirm(t('End the game now and show the winners?', '¿Terminar el juego y mostrar los ganadores?'))) host.endGame(); }} className="rounded-xl bg-white/10 px-3 py-2 text-[13px] font-extrabold hover:bg-white/20">{t('End game', 'Terminar juego')}</button>}
      {ph === 'end' && <Btn tone="yellow" className="h-11" onClick={() => host.again()}>{t('Play again', 'Jugar otra vez')}</Btn>}
      <MuteBtn />
      <MusicBtn />
      <button type="button" onClick={() => { if (confirm(t('Close the room?', '¿Cerrar la sala?'))) onExit(); }} className="rounded-xl bg-white/10 px-3 py-2 text-[13px] font-extrabold hover:bg-white/20">{t('Close', 'Cerrar')}</button>
    </div>
  );

  let body: ReactNode;
  if (ph === 'lobby') {
    body = (
      <div className="flex h-full flex-col gap-4 overflow-y-auto px-4 pt-5 pb-28 lg:flex-row lg:px-8">
        <div className="flex flex-col items-center gap-3 lg:w-[34%] lg:justify-center">
          <div className="flex items-center gap-3"><Logo size={64} /><div className="yd-title text-[40px]">You Draw</div></div>
          <div className="text-center text-[17px] font-bold text-white/80">{t('Scan the QR or go to', 'Escanea el QR o entra a')} <span className="text-[#ffd23f]">{location.host}/youdraw</span></div>
          <div className="rounded-[26px] bg-white px-8 py-2 text-[66px] leading-none font-black tracking-[0.12em] text-[#2a2170] shadow-[0_8px_0_#c9c3f2]">{host.code}</div>
          <JoinQr path="/youdraw/join" code={host.code} size={190} label={t('Show the QR full screen', 'Mostrar el QR en grande')} />
          <div className="text-[13px] font-bold text-white/60">{t('Students can also join after the game starts.', 'Los estudiantes también pueden entrar con el juego empezado.')}</div>
          <MusicCredit />
        </div>
        <div className="flex min-h-0 flex-1 flex-col gap-4">
          <div className="yd-card p-4">
            <div className="mb-3 flex items-center gap-2 text-[20px] font-black"><Pencil size={20} /> {t('Game settings', 'Ajustes de la partida')}</div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="mb-1.5 text-[13px] font-extrabold tracking-wide text-[#7a70b8] uppercase">{t('Level (words)', 'Nivel (palabras)')}</div>
                <div className="flex flex-wrap gap-1.5">{YD_LEVELS.map((l) => <Chip key={l.id} on={s.level === l.id} onClick={() => host.configure({ level: l.id })}>{l.label}</Chip>)}</div>
                <div className="mt-1 text-[12.5px] font-semibold text-[#6b61a8]">{YD_WORDS[s.level].length} {t('words in this level', 'palabras en este nivel')} · {t('e.g.', 'ej.')} {YD_WORDS[s.level].slice(5, 8).join(', ')}</div>
              </div>
              <div>
                <div className="mb-1.5 text-[13px] font-extrabold tracking-wide text-[#7a70b8] uppercase">{t('Time to draw', 'Tiempo para dibujar')}</div>
                <div className="flex flex-wrap gap-1.5">{YD_TIMES.map((v) => <Chip key={v} on={s.time === v} onClick={() => host.configure({ time: v })}>{v} s</Chip>)}</div>
              </div>
              <div>
                <div className="mb-1.5 text-[13px] font-extrabold tracking-wide text-[#7a70b8] uppercase">{t('Letters revealed', 'Letras que se revelan')}</div>
                <div className="flex flex-wrap gap-1.5">{YD_REVEALS.map((v) => <Chip key={v} on={s.reveal === v} onClick={() => host.configure({ reveal: v })}>{v}%</Chip>)}</div>
                <div className="mt-1 text-[12.5px] font-semibold text-[#6b61a8]">{t('Shown little by little as time runs out.', 'Se muestran poco a poco mientras pasa el tiempo.')}</div>
              </div>
              <div>
                <div className="mb-1.5 text-[13px] font-extrabold tracking-wide text-[#7a70b8] uppercase">{t('Rounds', 'Rondas')}: <span className="text-[#1d1840]">{s.rounds}</span></div>
                <input type="range" min={3} max={30} value={s.rounds} onChange={(e) => host.configure({ rounds: Number(e.target.value) })} className="w-full accent-[#ff4757]" aria-label={t('Rounds', 'Rondas')} />
                <div className="text-[12.5px] font-semibold text-[#6b61a8]">{t('One round = one student draws.', 'Una ronda = un estudiante dibuja.')}</div>
              </div>
            </div>
          </div>
          <div className="yd-glass flex min-h-[200px] flex-1 flex-col p-3">
            <div className="mb-2 flex items-center gap-2 text-[18px] font-black"><Users size={20} /> {online.length} {t('students', 'estudiantes')}
              <Btn tone="green" className="ml-auto h-12 text-[18px]" disabled={online.length < 2} onClick={() => host.start()}><Play size={18} fill="currentColor" /> {t('Start', 'Empezar')}</Btn>
            </div>
            <div className="grid auto-rows-max grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-5 xl:grid-cols-7">
              <AnimatePresence>
                {players.map((p) => (
                  <motion.div key={p.peer} layout initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.4, opacity: 0 }} className="group relative flex flex-col items-center rounded-2xl bg-white/10 pt-1 pb-1.5">
                    <Face ci={p.av} size={62} />
                    <div className="w-full truncate px-1.5 text-center text-[13px] font-black">{p.name}</div>
                    <button type="button" onClick={() => host.kick(p.peer)} className="absolute top-1 right-1 hidden h-6 w-6 place-items-center rounded-lg bg-black/40 group-hover:grid" aria-label={t('Remove', 'Sacar')}><X size={14} /></button>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
            {players.length === 0 && <div className="grid flex-1 place-items-center text-[17px] font-bold text-white/70">{t('Waiting for students…', 'Esperando estudiantes…')}</div>}
            {players.length === 1 && <div className="mt-2 text-center text-[14px] font-bold text-white/70">{t('At least 2 students are needed.', 'Se necesitan al menos 2 estudiantes.')}</div>}
          </div>
        </div>
      </div>
    );
  } else if (ph === 'end') {
    body = <Podium ranking={host.ranking()} />;
  } else {
    const endsAt = host.endsAt;
    body = (
      <div className="flex h-full flex-col gap-3 px-3 pt-3 pb-24 lg:flex-row lg:px-5">
        <div className="yd-glass order-2 flex min-h-0 flex-col p-2 lg:order-1 lg:w-[250px]">
          <div className="mb-1 px-1 text-[14px] font-black text-white/70">{t('Scores', 'Puntos')}</div>
          <Scoreboard players={players} drawer={host.drawer} onKick={(p) => host.kick(p)} />
        </div>
        <div className="order-1 flex min-h-0 flex-1 flex-col items-center gap-2 lg:order-2">
          <div className="flex w-full max-w-[1000px] flex-wrap items-center justify-center gap-x-5 gap-y-2">
            {drawer && <div className="flex items-center gap-2"><Face ci={drawer.av} size={46} /><div><div className="text-[12.5px] font-bold text-white/70">{ph === 'draw' ? t('Drawing', 'Dibuja') : t('Turn of', 'Turno de')}</div><div className="text-[20px] leading-tight font-black">{drawer.name}</div></div></div>}
            <div className="min-w-[200px] flex-1">{ph === 'draw' && <Mask mask={host.mask} big />}{ph === 'result' && <div className="text-center text-[34px] font-black text-[#ffd23f] uppercase">{host.word}</div>}</div>
            {ph !== 'result' && <TimerBar endsAt={endsAt} total={host.total} className="w-[240px]" />}
          </div>
          <div className="relative flex min-h-0 w-full flex-1 items-start justify-center">
            <div className="w-full" style={{ maxWidth: 'calc((100dvh - 230px) * 4 / 3)' }}>
              <InkCanvas ink={host.ink}>
                {ph === 'spin' && (
                  <div className="absolute inset-0 grid place-items-center overflow-y-auto bg-[#1b1546] p-4">
                    <div className="flex flex-col items-center gap-4">
                      <div className="yd-title text-[30px]">{t('Who draws now?', '¿Quién dibuja ahora?')}</div>
                      <Roulette cands={online.length ? online : players} drawer={host.drawer} round={host.round} big />
                    </div>
                  </div>
                )}
                {ph === 'choose' && drawer && (
                  <div className="absolute inset-0 grid place-items-center bg-[#1b1546] p-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                      <motion.div animate={{ rotate: [0, -6, 6, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}><Face ci={drawer.av} size={150} /></motion.div>
                      <div className="yd-title text-[34px]">{t(`${drawer.name} is choosing a word…`, `${drawer.name} está eligiendo una palabra…`)}</div>
                      <div className="text-[16px] font-bold text-white/70">{t('Get ready to guess!', '¡Prepárate para adivinar!')}</div>
                    </div>
                  </div>
                )}
                {ph === 'result' && <ResultCard players={players} drawer={host.drawer} drawerGain={host.drawerGain} word={host.word} endsAt={host.auto ? endsAt : 0} />}
              </InkCanvas>
            </div>
          </div>
        </div>
        <div className="yd-glass order-3 flex min-h-[140px] flex-col p-2 lg:w-[290px]">
          <div className="mb-1 px-1 text-[14px] font-black text-white/70">{t('Guesses', 'Intentos')}</div>
          <FeedList feed={host.feed} />
        </div>
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col">
      <div className="pointer-events-none absolute inset-x-0 bottom-[max(10px,env(safe-area-inset-bottom))] z-[60] flex justify-center px-2">{bar}</div>
      {body}
    </div>
  );
}

function ResultCard({ players, drawer, drawerGain, word, endsAt }: { players: PubPlayer[]; drawer: string | null; drawerGain: number; word: string | null; endsAt: number }) {
  const now = useNow(250);
  const gs = players.filter((p) => p.guessed).sort((a, b) => b.gain - a.gain);
  const dr = players.find((p) => p.peer === drawer);
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 grid place-items-center overflow-y-auto bg-[#120d33]/88 p-4 backdrop-blur-[2px]">
      <motion.div initial={{ scale: 0.7, y: 20 }} animate={{ scale: 1, y: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} className="flex w-full max-w-[560px] flex-col items-center text-center">
        <div className="text-[16px] font-bold text-white/70">{t('The word was', 'La palabra era')}</div>
        <div className="yd-title text-[clamp(34px,6vw,64px)] text-[#ffd23f] uppercase">{word}</div>
        <div className="mt-2 text-[15px] font-bold text-white/80">{gs.length ? t(`${gs.length} guessed it`, `${gs.length} la adivinaron`) : t('Nobody guessed it', 'Nadie la adivinó')}</div>
        <div className="mt-3 grid w-full gap-1.5 sm:grid-cols-2">
          {dr && <div className="flex items-center gap-2 rounded-xl bg-[#ff4757]/30 px-2 py-1"><Face ci={dr.av} size={30} /><span className="min-w-0 flex-1 truncate text-left font-black">{dr.name} <Pencil size={13} className="inline" /></span><span className="font-black text-[#9ff5c4]">+{drawerGain}</span></div>}
          {gs.slice(0, 9).map((p) => <div key={p.peer} className="flex items-center gap-2 rounded-xl bg-white/10 px-2 py-1"><Face ci={p.av} size={30} /><span className="min-w-0 flex-1 truncate text-left font-black">{p.name}</span><span className="font-black text-[#9ff5c4]">+{p.gain}</span></div>)}
        </div>
        {endsAt > 0 && <div className="mt-3 text-[14px] font-bold text-white/60">{t('Next round in', 'Siguiente ronda en')} {Math.max(0, Math.ceil((endsAt - now) / 1000))}s</div>}
      </motion.div>
    </motion.div>
  );
}

/* --------------------------------------------------------------- player */
function PlayRoute() {
  const { code = '' } = useParams();
  const nav = useNavigate();
  const [client, setClient] = useState<YdClient | null>(null);
  useEffect(() => {
    const name = savedName();
    if (!name) { nav(`/youdraw/join/${code}`, { replace: true }); return; }
    let peer = '';
    try { peer = sessionStorage.getItem('yd:peer:' + code) ?? ''; } catch { /* ignore */ }
    if (!peer) { peer = 'p' + makeId(); try { sessionStorage.setItem('yd:peer:' + code, peer); } catch { /* ignore */ } }
    const c = new YdClient(code.toUpperCase(), peer, name, savedPet());
    c.onSound = (s) => sfx[s]();
    setClient(c);
    if (import.meta.env.DEV) (window as unknown as { __ydc: unknown }).__ydc = c;
    return () => c.close();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);
  if (!client) return null;
  return <PlayScreen client={client} code={code.toUpperCase()} />;
}

function PlayScreen({ client, code }: { client: YdClient; code: string }) {
  useSub(client);
  const [slow, setSlow] = useState(false);
  useEffect(() => { const tm = setTimeout(() => setSlow(true), 7000); return () => clearTimeout(tm); }, []);
  const st = client.st;
  if (client.status === 'kicked') return <Center><Loading text={t('The teacher removed you from the room', 'El profe te sacó de la sala')} /></Center>;
  if (client.status === 'full') return <Center><Loading text={t('The room is full', 'La sala está llena')} /></Center>;
  if (!st) return <Center><Loading text={t('Finding the room…', 'Buscando la sala…')} sub={slow ? t(`Room ${code} did not answer. Check the code.`, `La sala ${code} no responde. Revisa el código.`) : undefined} /></Center>;
  const me = client.me;
  const drawer = st.players.find((p) => p.peer === st.drawer);
  const mine = st.drawer === client.peer;

  if (st.ph === 'lobby') {
    return (
      <div className="flex h-full flex-col items-center overflow-y-auto px-4 pt-8 pb-6 text-center">
        <Logo size={80} />
        <div className="yd-title mt-2 text-[28px]">{t(`You're in, ${client.name}!`, `¡Estás dentro, ${client.name}!`)}</div>
        <div className="text-[15px] font-bold text-white/75">{t('Room', 'Sala')} {code} · {t('wait for the teacher to start', 'espera a que el profe empiece')}</div>
        <div className="mt-4 w-full max-w-[420px]"><PetMaker av={client.av} onChange={(v) => { storePet(v); client.setAvatar(v); }} dark /></div>
        <div className="mt-5 flex items-center gap-2 text-[16px] font-black"><Users size={18} /> {st.players.filter((p) => p.online).length} {t('in the room', 'en la sala')}</div>
        <div className="mt-2 flex max-w-[520px] flex-wrap justify-center gap-1.5">
          {st.players.map((p) => <div key={p.peer} className="flex items-center gap-1 rounded-full bg-white/10 py-0.5 pr-2.5 pl-0.5"><Face ci={p.av} size={26} /><span className="text-[13px] font-black">{p.name}</span></div>)}
        </div>
        <div className="mt-6 text-[13.5px] font-bold text-white/60">{t('Level', 'Nivel')} {YD_LEVELS.find((l) => l.id === st.set.level)?.label} · {st.set.time}s · {st.set.rounds} {t('rounds', 'rondas')}</div>
      </div>
    );
  }
  if (st.ph === 'end') return <Podium ranking={[...st.players].sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))} me={client.peer} />;

  const header = (
    <div className="mx-auto flex w-full max-w-[900px] items-center gap-2 px-1">
      <div className="text-[13px] font-black whitespace-nowrap text-white/70">{st.round}/{st.rounds}</div>
      <div className="min-w-0 flex-1">
        {st.ph === 'draw' && (mine || client.word ? <div className="truncate text-center text-[24px] font-black text-[#ffd23f] uppercase">{client.word}</div> : <Mask mask={st.mask} />)}
        {st.ph === 'result' && <div className="truncate text-center text-[24px] font-black text-[#ffd23f] uppercase">{st.word}</div>}
        {(st.ph === 'spin' || st.ph === 'choose') && <div className="truncate text-center text-[16px] font-black text-white/80">{drawer ? (mine ? t('Your turn!', '¡Tu turno!') : t(`${drawer.name}'s turn`, `Turno de ${drawer.name}`)) : ''}</div>}
      </div>
      <div className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-1 text-[13px] font-black tabular-nums">{me?.score ?? 0} pts</div>
    </div>
  );

  let main: ReactNode;
  if (st.ph === 'spin') {
    main = (
      <Center>
        <div className="flex flex-col items-center gap-3 text-center">
          <div className="yd-title text-[26px]">{t('Who draws now?', '¿Quién dibuja ahora?')}</div>
          <Roulette cands={st.players.filter((p) => p.online)} drawer={st.drawer} round={st.round} />
        </div>
      </Center>
    );
  } else if (st.ph === 'choose') {
    main = mine && client.choices.length ? (
      <Center>
        <div className="flex w-full max-w-[460px] flex-col items-center gap-3 text-center">
          <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="yd-title text-[34px] text-[#ffd23f]">{t('Your turn to draw!', '¡Te toca dibujar!')}</motion.div>
          <div className="text-[16px] font-bold text-white/80">{t('Choose a word:', 'Elige una palabra:')}</div>
          {client.choices.map((w, i) => (
            <motion.button key={w} type="button" initial={{ x: -40, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: i * 0.08 }} onClick={() => client.pick(i)}
              className="yd-btn h-16 w-full bg-white text-[22px] text-[#2a2170] shadow-[0_5px_0_#c9c3f2]">{w}</motion.button>
          ))}
          <TimerBar endsAt={client.endsAt} total={CHOOSE_SECS} className="w-full" />
          <div className="text-[13px] font-bold text-white/60">{t('If you don’t choose, one is picked for you.', 'Si no eliges, se escoge una por ti.')}</div>
        </div>
      </Center>
    ) : (
      <Center>
        <div className="flex flex-col items-center gap-2 text-center">
          {drawer && <motion.div animate={{ rotate: [0, -6, 6, 0] }} transition={{ repeat: Infinity, duration: 1.2 }}><Face ci={drawer.av} size={130} /></motion.div>}
          <div className="yd-title text-[24px]">{mine ? t('Getting your words…', 'Preparando tus palabras…') : t(`${drawer?.name ?? ''} is choosing a word…`, `${drawer?.name ?? ''} está eligiendo una palabra…`)}</div>
          <div className="text-[15px] font-bold text-white/70">{t('Get ready to guess!', '¡Prepárate para adivinar!')}</div>
        </div>
      </Center>
    );
  } else if (st.ph === 'draw' && mine) {
    main = (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 overflow-y-auto px-2 pb-3">
        <TimerBar endsAt={client.endsAt} total={st.total} className="w-full max-w-[760px]" />
        <DrawPad client={client} maxH="calc(100dvh - 230px)" />
        <div className="text-[13px] font-bold text-white/70">{st.players.filter((p) => p.guessed).length}/{Math.max(0, st.players.filter((p) => p.online).length - 1)} {t('guessed it', 'la adivinaron')} · {t('no letters in the drawing!', '¡sin letras en el dibujo!')}</div>
      </div>
    );
  } else {
    // guessing (or the round result)
    main = (
      <div className="flex min-h-0 flex-1 flex-col items-center gap-2 px-2 pb-2">
        {st.ph === 'draw' && <TimerBar endsAt={client.endsAt} total={st.total} className="w-full max-w-[760px]" />}
        <div className="w-full" style={{ maxWidth: 'calc((100dvh - 290px) * 4 / 3)' }}>
          <InkCanvas ink={client.ink}>
            {st.ph === 'result' && <ResultCard players={st.players} drawer={st.drawer} drawerGain={st.drawerGain} word={st.word} endsAt={st.auto ? client.endsAt : 0} />}
          </InkCanvas>
        </div>
        {st.ph === 'draw' && <GuessBox client={client} />}
      </div>
    );
  }
  return (
    <div className="flex h-full flex-col pt-[max(8px,env(safe-area-inset-top))]">
      {header}
      <div className="mt-1 flex min-h-0 flex-1 flex-col">{main}</div>
    </div>
  );
}

function GuessBox({ client }: { client: YdClient }) {
  const [g, setG] = useState('');
  const [wait, setWait] = useState(false);
  const send = () => {
    if (!g.trim() || wait) return;
    client.guess(g);
    setG('');
    setWait(true);
    setTimeout(() => setWait(false), 600);
  };
  if (client.word) {
    return (
      <motion.div initial={{ scale: 0.6 }} animate={{ scale: 1 }} className="w-full max-w-[640px] rounded-2xl bg-[#2fd27a] px-4 py-3 text-center text-[#062a15]">
        <div className="text-[20px] font-black">{t('You got it!', '¡La adivinaste!')} +{client.gain}</div>
        <div className="text-[13.5px] font-bold">{t('Wait for the others…', 'Espera a los demás…')}</div>
      </motion.div>
    );
  }
  return (
    <div className="flex w-full max-w-[640px] min-h-0 flex-1 flex-col gap-1.5">
      <div className="min-h-0 flex-1 rounded-2xl bg-black/20 p-1.5"><FeedList feed={client.feed} max={20} small /></div>
      <AnimatePresence>{client.close_ && <motion.div initial={{ y: 10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ opacity: 0 }} className="rounded-xl bg-[#ffd23f] px-3 py-1.5 text-center text-[15px] font-black text-[#2a1d00]">“{client.close_}” {t('is close!', '¡está cerca!')}</motion.div>}</AnimatePresence>
      <form className="flex gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <input value={g} onChange={(e) => setG(e.target.value.slice(0, 40))} placeholder={t('Type your guess…', 'Escribe tu respuesta…')} aria-label={t('Your guess', 'Tu respuesta')} autoComplete="off" autoCorrect="off" autoCapitalize="none" spellCheck={false} enterKeyHint="send"
          className="h-13 min-w-0 flex-1 rounded-2xl border-[3px] border-transparent bg-white px-4 py-2.5 text-[19px] font-extrabold text-[#1d1840] outline-none focus:border-[#ff4757]" />
        <Btn tone="red" className="h-[52px] w-[60px] px-0" disabled={!g.trim() || wait} aria-label={t('Send', 'Enviar')} onClick={send}><Send size={20} /></Btn>
      </form>
    </div>
  );
}
