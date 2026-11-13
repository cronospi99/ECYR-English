/* Title screen of Phrasal Verb Roulette, built in code: painted 8-bit scenery, the logo plaque,
   the wheel on its stand (one pointer, fixed to the stand), the teacher and the mode tiles. */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { PixelIcon, Scene, Teacher } from './pixel';

const SLICES: [string, string][] = [['look up', '#ff5fa2'], ['take off', '#35d0c8'], ['give in', '#a56bff'], ['carry on', '#ffc21f'], ['set up', '#3fd07a'], ['bring out', '#5a8bff']];
const TILES: [string, string, string, string][] = [
  ['practice', 'PRACTICE', 'Relaxed turns, no penalties', 'frontPractice'], ['learn', 'LEARN', 'Every aid on, no penalties', 'frontLearn'],
  ['compete', 'COMPETE', 'Wagers, multipliers, penalties', 'frontCompete'], ['teams', 'TEAMS', 'Two teams take turns', 'frontTeams'], ['rewards', 'REWARDS', 'Set a real-world prize', 'frontRewards'],
];

function Wheel() {
  const n = SLICES.length, step = 360 / n, R = 50;
  const pt = (deg: number, r: number) => [60 + r * Math.cos(((deg - 90) * Math.PI) / 180), 60 + r * Math.sin(((deg - 90) * Math.PI) / 180)];
  return (
    <div className="pvf-wheel" aria-hidden="true">
      <div className="pvf-stand"><i /><i /><i /><i /><i /></div>
      <svg viewBox="0 0 120 120" className="pvf-disc">
        <circle cx="60" cy="60" r="59" fill="#1b1035" />
        <circle cx="60" cy="60" r="56.5" fill="#ff8a1f" />
        <circle cx="60" cy="60" r="51.5" fill="#1b1035" />
        <g className="pvf-spin">
          {SLICES.map(([label, fill], i) => {
            const [x0, y0] = pt(i * step, R), [x1, y1] = pt((i + 1) * step, R), [tx, ty] = pt(i * step + step / 2, R * 0.62), [a, b] = label.split(' ');
            return (
              <g key={label}>
                <path d={`M60 60 L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z`} fill={fill} stroke="#1b1035" strokeWidth="1.2" />
                <text x={tx} y={ty} textAnchor="middle" className="pvf-seg"><tspan x={tx} dy="-1">{a}</tspan><tspan x={tx} dy="7.4">{b}</tspan></text>
              </g>
            );
          })}
        </g>
        {Array.from({ length: 16 }, (_, i) => { const [x, y] = pt(i * 22.5, 54); return <rect key={i} x={x - 1.6} y={y - 1.6} width="3.2" height="3.2" className={i % 2 ? 'pvf-bulb b' : 'pvf-bulb'} />; })}
        <circle cx="60" cy="60" r="11" fill="#1b1035" />
        <circle cx="60" cy="60" r="8.6" fill="#ffd21f" />
        <circle cx="60" cy="60" r="6.6" fill="#171a52" />
        <text x="60.6" y="64.6" textAnchor="middle" className="pvf-q">?</text>
      </svg>
      <svg viewBox="0 0 20 26" className="pvf-pointer"><path d="M2 2 H18 V10 L10 24 L2 10 Z" fill="#ffd21f" stroke="#1b1035" strokeWidth="2.4" strokeLinejoin="miter" /><rect x="5" y="4" width="4" height="4" fill="#fff3a0" /></svg>
    </div>
  );
}

export function Front({ v }: { v: any }) {
  return (
    <div className="pvf">
      <Scene />
      <div className="pvf-hud pvf-hud-l"><span className="pvf-box"><PixelIcon name="heart" scale={5} /><PixelIcon name="heart" scale={5} /><PixelIcon name="heart" scale={5} /></span><span className="pvf-box"><b>1UP</b> 000000</span></div>
      <div className="pvf-hud pvf-hud-r"><span className="pvf-box"><PixelIcon name="coin" scale={4} /> ×000</span><span className="pvf-box"><PixelIcon name="star" scale={4} /> ×00</span></div>

      <div className="pvf-title">
        <div className="pvf-plaque">
          <span className="pvf-ray a" /><span className="pvf-ray b" /><span className="pvf-ray c" /><span className="pvf-ray d" />
          <div className="pvf-top">PHRASAL VERB</div>
          <h1 className="pvf-main" aria-label="Phrasal Verb Roulette">{'ROULETTE'.split('').map((ch, i) => <span key={i} style={{ animationDelay: `${i * 0.09}s` }}>{ch}</span>)}</h1>
        </div>
        <div className="pvf-tag">SPIN <i>·</i> PRACTICE <i>·</i> BUILD <i>·</i> WIN</div>
        <p className="pvf-say">Spin the wheel · get a phrasal verb ·<br />build your own sentence · win coins!</p>
      </div>

      <Teacher scale={4} className="pvf-teacher" />
      <Wheel />

      <div className="pvf-tiles">
        {TILES.map(([icon, label, hint, fn], i) => (
          <button key={label} type="button" className="pvf-tile" style={{ animationDelay: `${0.1 + i * 0.07}s` }} onClick={v[fn]} title={hint} aria-label={`${label}: ${hint}`}>
            <PixelIcon name={icon} scale={6} />
            <span>{label}</span>
          </button>
        ))}
      </div>
      <button type="button" className="pvf-start" onClick={v.frontStart}>▶ START GAME</button>
      <div className="pvf-insert">PRESS START · 2 TO 24 PLAYERS</div>
    </div>
  );
}

/** The teacher hosts every screen after the title: he stands on the ground strip and comments on
    what is happening (whose turn it is, the verb in play, the result). */
export function Host({ v }: { v: any }) {
  const pop = String(v.popText || '');
  const line = v.isPodium ? (v.winnerName ? `${v.winnerName} takes it! What a game!` : 'What a game!')
    : v.isMenu ? (v.cantStart ? 'Add your players and pick the levels. I will keep the score!' : 'All set? Press START GAME!')
    : v.popShown && pop.startsWith('+') ? 'Great sentence! Coins for you!'
    : v.popShown && pop.startsWith('-') ? 'Not quite… you will get the next one!'
    : !v.hasCard ? (v.spinDisabled ? 'Round and round it goes…' : `${v.currentName}, spin the wheel!`)
    : v.teacherHelp ? 'Teacher help is on: ask me about this verb.'
    : v.timeLabel === '00s' ? 'Time is up!'
    : `${v.currentName}: make a sentence with “${v.cardPv}”.`;
  return (
    <div className="pvr-host" aria-live="polite">
      <Teacher scale={1.25} className="pvr-host-me" />
      <p className="pvr-say" key={line}>{line}</p>
      <div className="pvr-loot" aria-hidden="true">
        <PixelIcon name="coin" scale={5} /><PixelIcon name="coin" scale={5} /><PixelIcon name="coin" scale={5} /><PixelIcon name="star" scale={5} /><PixelIcon name="heart" scale={5} />
      </div>
    </div>
  );
}
