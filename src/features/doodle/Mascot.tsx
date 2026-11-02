/* Pío — the game's own mascot: a round little parakeet with a big orange beak, a crest and a
   pencil, drawn in SVG and animated with CSS (bob, blink, wing flap, scribble). Poses: idle,
   draw (scribbling), think (looking at a "?"), party (wings up) and fly (loading screens). */
import type { CSSProperties } from 'react';

export type Pose = 'idle' | 'draw' | 'think' | 'party' | 'fly';

export const MASCOT_CSS = `
@keyframes pio-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}
@keyframes pio-fly{0%,100%{transform:translateY(0) rotate(-3deg)}50%{transform:translateY(-16px) rotate(3deg)}}
@keyframes pio-blink{0%,92%,100%{transform:scaleY(1)}95%{transform:scaleY(.1)}}
@keyframes pio-flap{0%,100%{transform:rotate(0)}50%{transform:rotate(-38deg)}}
@keyframes pio-flapR{0%,100%{transform:rotate(0)}50%{transform:rotate(38deg)}}
@keyframes pio-scribble{0%,100%{transform:rotate(-8deg) translate(0,0)}25%{transform:rotate(6deg) translate(3px,-2px)}50%{transform:rotate(-4deg) translate(-2px,2px)}75%{transform:rotate(8deg) translate(2px,1px)}}
@keyframes pio-pop{0%{transform:scale(.6);opacity:0}60%{transform:scale(1.1);opacity:1}100%{transform:scale(1)}}
@keyframes pio-dash{to{stroke-dashoffset:0}}
.pio{overflow:visible}
.pio .body{transform-origin:100px 150px}
.pio.idle .body,.pio.draw .body,.pio.think .body{animation:pio-bob 1.8s ease-in-out infinite}
.pio.party .body{animation:pio-bob .6s ease-in-out infinite}
.pio.fly .body{animation:pio-fly 1.1s ease-in-out infinite}
.pio .eye{transform-box:fill-box;transform-origin:center;animation:pio-blink 4s infinite}
.pio .wl{transform-box:fill-box;transform-origin:85% 15%}
.pio .wr{transform-box:fill-box;transform-origin:15% 15%}
.pio.fly .wl,.pio.party .wl{animation:pio-flap .32s ease-in-out infinite}
.pio.fly .wr,.pio.party .wr{animation:pio-flapR .32s ease-in-out infinite}
.pio .pen{transform-box:fill-box;transform-origin:20% 80%}
.pio.draw .pen{animation:pio-scribble .5s linear infinite}
.pio .scrib{stroke-dasharray:160;stroke-dashoffset:160;animation:pio-dash 1.6s ease-in-out infinite alternate}
.pio .bubble{animation:pio-pop .5s ease-out both}
`;

const INK = '#1d1a33';

export function Mascot({ pose = 'idle', size = 160, className, style }: { pose?: Pose; size?: number; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 200 200" width={size} height={size} className={`pio ${pose} ${className ?? ''}`} style={style} role="img" aria-label="Pío">
      {/* shadow */}
      {pose !== 'fly' && <ellipse cx="100" cy="188" rx="46" ry="8" fill="rgba(0,0,0,.18)" />}
      {pose === 'draw' && (
        <g>
          <rect x="128" y="132" width="62" height="46" rx="6" fill="#fff" stroke={INK} strokeWidth="4" />
          <path className="scrib" d="M138 160c8-14 14 10 22-4s10 8 18-2" fill="none" stroke="#ff5c8a" strokeWidth="4" strokeLinecap="round" />
        </g>
      )}
      {pose === 'think' && (
        <g className="bubble">
          <circle cx="150" cy="62" r="6" fill="#fff" stroke={INK} strokeWidth="3" />
          <ellipse cx="170" cy="32" rx="24" ry="20" fill="#fff" stroke={INK} strokeWidth="4" />
          <text x="170" y="42" textAnchor="middle" fontSize="28" fontWeight="900" fill="#7b5cff" fontFamily="Inter, system-ui, sans-serif">?</text>
        </g>
      )}
      <g className="body">
        {/* feet */}
        {pose !== 'fly' && (
          <g fill="#ff9a1f" stroke={INK} strokeWidth="4" strokeLinejoin="round">
            <path d="M80 168l-8 14h20z" />
            <path d="M114 168l-6 14h20z" />
          </g>
        )}
        {/* tail */}
        <path d="M58 140c-22 6-32 22-30 34 14-2 30-12 38-24z" fill="#2f9be8" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        {/* body */}
        <ellipse cx="100" cy="112" rx="58" ry="62" fill="#4cd07a" stroke={INK} strokeWidth="5" />
        {/* belly */}
        <ellipse cx="104" cy="128" rx="36" ry="38" fill="#ffe36b" />
        <path d="M86 118q6 4 12 0M104 132q6 4 12 0M90 146q6 4 12 0" fill="none" stroke="#f4c33d" strokeWidth="3" strokeLinecap="round" />
        {/* crest */}
        <path d="M92 52c-6-18 2-30 12-34-2 10 4 14 2 22 6-8 14-8 20-4-8 4-10 12-14 18z" fill="#ff5c8a" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        {/* wings */}
        <path className="wl" d="M46 104c-18 8-24 34-12 50 10-4 22-18 24-38z" fill="#36b866" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path className="wr" d="M152 102c18 8 22 32 10 48-10-4-20-18-22-36z" fill="#36b866" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        {/* cheeks */}
        <ellipse cx="66" cy="102" rx="9" ry="6" fill="#ff8fb0" opacity=".85" />
        <ellipse cx="138" cy="102" rx="9" ry="6" fill="#ff8fb0" opacity=".85" />
        {/* eyes */}
        <g className="eye"><ellipse cx="80" cy="84" rx="9" ry="11" fill={INK} /><circle cx="83" cy="80" r="3.4" fill="#fff" /></g>
        <g className="eye"><ellipse cx="122" cy="84" rx="9" ry="11" fill={INK} /><circle cx="125" cy="80" r="3.4" fill="#fff" /></g>
        {pose === 'party' && <path d="M70 70q10-8 20 0M112 70q10-8 20 0" fill="none" stroke={INK} strokeWidth="3.5" strokeLinecap="round" />}
        {/* beak */}
        <path d="M86 96c4-8 24-8 30 0 6 8 2 20-14 26-14-6-20-18-16-26z" fill="#ff9a1f" stroke={INK} strokeWidth="4" strokeLinejoin="round" />
        <path d="M89 104q12 6 25 0" fill="none" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        {/* pencil (in the right wing) */}
        {pose !== 'fly' && (
          <g className="pen">
            <g transform={pose === 'draw' ? 'translate(146 112) rotate(35)' : 'translate(150 96) rotate(-20)'}>
              <rect x="-5" y="-30" width="10" height="34" rx="2" fill="#ffcf3a" stroke={INK} strokeWidth="3" />
              <rect x="-5" y="-36" width="10" height="8" rx="2" fill="#ff8fb0" stroke={INK} strokeWidth="3" />
              <path d="M-5 4l5 10 5-10z" fill="#f2d2a2" stroke={INK} strokeWidth="3" strokeLinejoin="round" />
              <path d="M-1.5 11l1.5 3 1.5-3z" fill={INK} />
            </g>
          </g>
        )}
      </g>
    </svg>
  );
}

/** Full-screen "please wait" with Pío flying and a message. */
export function PioLoading({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-10 text-center">
      <Mascot pose="fly" size={170} />
      <div className="dd-title text-[26px]">{text}</div>
      {sub && <div className="max-w-[360px] text-[15px] font-semibold text-white/75">{sub}</div>}
      <div className="mt-2 flex gap-1.5">{[0, 1, 2].map((i) => <span key={i} className="h-2.5 w-2.5 animate-bounce rounded-full bg-white/80" style={{ animationDelay: `${i * 0.15}s` }} />)}</div>
    </div>
  );
}
