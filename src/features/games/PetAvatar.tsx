/* Animal avatar (SVG) and the quick maker players use to build one: animal, colour, hat, face extra. */
import { useState, type ReactNode } from 'react';
import { Dices } from 'lucide-react';
import { cn } from '@/lib/cn';
import { t } from '@/features/classwars/i18n';
import { ANIMALS, FACES, FURS, HATS, decodePet, encodePet, randomPet, type Pet } from './pet';

const INK = '#1d1840';
const S = { stroke: INK, strokeWidth: 3, strokeLinejoin: 'round' as const, strokeLinecap: 'round' as const };

/** Mix a hex colour toward black (k < 1) or white (k > 1). */
function tint(hex: string, k: number) {
  const n = parseInt(hex.slice(1), 16);
  const ch = [n >> 16, (n >> 8) & 255, n & 255].map((v) => Math.round(k < 1 ? v * k : v + (255 - v) * (k - 1)));
  return `#${ch.map((v) => Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')).join('')}`;
}

function Eyes({ white }: { white?: boolean }) {
  return (
    <g>
      {[40, 60].map((x) => (
        <g key={x}>
          <circle cx={x} cy={56} r={4} fill={white ? '#fff' : INK} />
          <circle cx={x + 1.3} cy={54.6} r={1.4} fill={white ? INK : '#fff'} />
        </g>
      ))}
    </g>
  );
}
const Smile = ({ y = 70 }: { y?: number }) => <path d={`M44 ${y}q3 4 6 0q3 4 6 0`} fill="none" {...S} strokeWidth={2.5} />;
const Nose = ({ y = 64, fill = INK }: { y?: number; fill?: string }) => <ellipse cx={50} cy={y} rx={4.5} ry={3.2} fill={fill} />;

/** Ears, manes… drawn behind the head, then face details on top. */
function animal(a: number, c: string): { back?: ReactNode; head?: string; front: ReactNode } {
  const dark = tint(c, 0.7), light = tint(c, 1.55), pink = '#ff9fbf';
  switch (ANIMALS[a]) {
    case 'cat': return {
      back: <>{[[26, 46, 28, 16, 46, 32], [74, 46, 72, 16, 54, 32]].map((p, i) => <polygon key={i} points={`${p[0]},${p[1]} ${p[2]},${p[3]} ${p[4]},${p[5]}`} fill={c} {...S} />)}</>,
      front: <><Eyes /><path d="M46 63h8l-4 4z" fill={pink} {...S} strokeWidth={2} /><Smile y={68} />{[-1, 1].map((d) => <path key={d} d={`M${50 + d * 14} 66l${d * 12} -3M${50 + d * 14} 69l${d * 12} 2`} {...S} strokeWidth={2} />)}</>,
    };
    case 'dog': return {
      front: <>{[-1, 1].map((d) => <ellipse key={d} cx={50 + d * 27} cy={56} rx={8} ry={17} transform={`rotate(${d * -14} ${50 + d * 27} 56)`} fill={dark} {...S} />)}<ellipse cx={50} cy={69} rx={13} ry={9} fill={light} {...S} strokeWidth={2.5} /><Eyes /><Nose y={64} /><path d="M47 73q3 7 6 0" fill="#ff6b81" {...S} strokeWidth={2} /></>,
    };
    case 'bear': return {
      back: <>{[28, 72].map((x) => <g key={x}><circle cx={x} cy={34} r={10} fill={c} {...S} /><circle cx={x} cy={34} r={5} fill={light} /></g>)}</>,
      front: <><ellipse cx={50} cy={68} rx={12} ry={9} fill={light} {...S} strokeWidth={2.5} /><Eyes /><Nose y={64} /><Smile y={69} /></>,
    };
    case 'rabbit': return {
      back: <>{[38, 62].map((x, i) => <g key={x} transform={`rotate(${i ? 8 : -8} ${x} 34)`}><ellipse cx={x} cy={18} rx={7.5} ry={19} fill={c} {...S} /><ellipse cx={x} cy={19} rx={3.5} ry={13} fill={pink} /></g>)}</>,
      front: <><Eyes /><Nose y={63} fill={pink} /><rect x={46.5} y={67} width={7} height={7} rx={1.5} fill="#fff" {...S} strokeWidth={2} /><path d="M50 67v7" {...S} strokeWidth={1.5} /></>,
    };
    case 'fox': return {
      back: <>{[[24, 50, 26, 14, 46, 32], [76, 50, 74, 14, 54, 32]].map((p, i) => <polygon key={i} points={`${p[0]},${p[1]} ${p[2]},${p[3]} ${p[4]},${p[5]}`} fill={c} {...S} />)}</>,
      front: <><path d="M23 62q14-2 27 10q13-12 27-10q-6 22-27 24q-21-2-27-24z" fill="#fff" /><Eyes /><Nose y={70} /></>,
    };
    case 'panda': return {
      back: <>{[28, 72].map((x) => <circle key={x} cx={x} cy={35} r={10} fill={INK} />)}</>,
      front: <>{[-1, 1].map((d) => <ellipse key={d} cx={50 + d * 10} cy={57} rx={7} ry={9} transform={`rotate(${d * 25} ${50 + d * 10} 57)`} fill={INK} />)}<Eyes white /><Nose y={66} /><Smile y={70} /></>,
    };
    case 'frog': return {
      back: <>{[35, 65].map((x) => <circle key={x} cx={x} cy={36} r={12} fill={c} {...S} />)}</>,
      front: <>{[35, 65].map((x) => <g key={x}><path d={`M${x - 11} 40a11 11 0 0 1 22 0`} fill={c} /><circle cx={x} cy={35} r={7} fill="#fff" /><circle cx={x} cy={36} r={3.5} fill={INK} /></g>)}<path d="M32 66q18 14 36 0" fill="none" {...S} /><circle cx={30} cy={64} r={4} fill={pink} opacity={0.7} /><circle cx={70} cy={64} r={4} fill={pink} opacity={0.7} /></>,
    };
    case 'pig': return {
      back: <>{[[28, 42, 30, 22, 44, 33], [72, 42, 70, 22, 56, 33]].map((p, i) => <polygon key={i} points={`${p[0]},${p[1]} ${p[2]},${p[3]} ${p[4]},${p[5]}`} fill={dark} {...S} />)}</>,
      front: <><Eyes /><ellipse cx={50} cy={67} rx={11} ry={8} fill={tint(c, 0.85)} {...S} strokeWidth={2.5} /><ellipse cx={46} cy={67} rx={1.8} ry={2.6} fill={INK} /><ellipse cx={54} cy={67} rx={1.8} ry={2.6} fill={INK} /></>,
    };
    case 'owl': return {
      back: <>{[[28, 40, 30, 20, 42, 32], [72, 40, 70, 20, 58, 32]].map((p, i) => <polygon key={i} points={`${p[0]},${p[1]} ${p[2]},${p[3]} ${p[4]},${p[5]}`} fill={dark} {...S} />)}</>,
      front: <>{[39, 61].map((x) => <g key={x}><circle cx={x} cy={55} r={10} fill="#fff" {...S} strokeWidth={2.5} /><circle cx={x} cy={55} r={4.5} fill={INK} /><circle cx={x + 1.5} cy={53.5} r={1.5} fill="#fff" /></g>)}<path d="M45 64h10l-5 8z" fill="#ffb020" {...S} strokeWidth={2} /><path d="M34 76q4-3 8 0q4-3 8 0q4-3 8 0q4-3 8 0" fill="none" stroke={dark} strokeWidth={2.5} strokeLinecap="round" /></>,
    };
    case 'penguin': return {
      head: tint(c, 0.45),
      front: <><path d="M50 40q-20-4-20 18q0 22 20 26q20-4 20-26q0-22-20-18z" fill="#fff" /><Eyes /><path d="M43 63h14l-7 8z" fill="#ffb020" {...S} strokeWidth={2} /><circle cx={34} cy={68} r={4} fill={pink} opacity={0.7} /><circle cx={66} cy={68} r={4} fill={pink} opacity={0.7} /></>,
    };
    case 'lion': return {
      back: <>{Array.from({ length: 12 }, (_, i) => { const r = (i / 12) * Math.PI * 2; return <circle key={i} cx={50 + Math.cos(r) * 31} cy={58 + Math.sin(r) * 31} r={11} fill={dark} {...S} strokeWidth={2.5} />; })}<circle cx={50} cy={58} r={33} fill={dark} /></>,
      front: <><ellipse cx={50} cy={69} rx={11} ry={8} fill={light} {...S} strokeWidth={2.5} /><Eyes /><Nose y={64} /><Smile y={70} /></>,
    };
    default: return { // axolotl
      back: <>{[-1, 1].map((d) => [-38, 0, 38].map((r) => { const x2 = 50 + d * (26 + Math.cos(r * Math.PI / 180) * 18), y2 = 50 + Math.sin(r * Math.PI / 180) * 18; return <g key={`${d}${r}`}><path d={`M${50 + d * 22} 50L${x2} ${y2}`} stroke={INK} strokeWidth={9} strokeLinecap="round" /><path d={`M${50 + d * 22} 50L${x2} ${y2}`} stroke={pink} strokeWidth={4} strokeLinecap="round" /></g>; }))}</>,
      front: <><g transform="translate(0 2)"><Eyes /></g><path d="M38 68q12 8 24 0" fill="none" {...S} /><circle cx={32} cy={66} r={4} fill={pink} opacity={0.8} /><circle cx={68} cy={66} r={4} fill={pink} opacity={0.8} /></>,
    };
  }
}

function hat(h: number): ReactNode {
  switch (HATS[h]) {
    case 'tophat': return <><rect x={36} y={4} width={28} height={24} rx={2} fill={INK} /><rect x={36} y={20} width={28} height={5} fill="#ff4757" /><rect x={27} y={26} width={46} height={6} rx={3} fill={INK} /></>;
    case 'crown': return <><path d="M32 32V14l9 8 9-12 9 12 9-8v18z" fill="#ffd23f" {...S} /><circle cx={50} cy={24} r={3} fill="#ff4757" /><circle cx={39} cy={27} r={2} fill="#4dabf7" /><circle cx={61} cy={27} r={2} fill="#4dabf7" /></>;
    case 'party': return <><path d="M37 32L50 2l13 30z" fill="#4dabf7" {...S} /><path d="M41 22l14-6M39 28l20-8" stroke="#ffd23f" strokeWidth={3.5} /><circle cx={50} cy={3} r={4.5} fill="#ff4757" {...S} strokeWidth={2} /></>;
    case 'propeller': return <><path d="M32 34a18 18 0 0 1 36 0z" fill="#ff4757" {...S} /><path d="M50 16a18 18 0 0 1 18 18H50z" fill="#ffd23f" /><path d="M32 34a18 18 0 0 1 36 0z" fill="none" {...S} /><path d="M50 16V8" {...S} /><path d="M36 8q14-6 28 0q-14 6-28 0z" fill="#4dabf7" {...S} strokeWidth={2} /></>;
    case 'viking': return <><path d="M30 36q-14-6-12-24q6 12 18 14z" fill="#fff4d6" {...S} /><path d="M70 36q14-6 12-24q-6 12-18 14z" fill="#fff4d6" {...S} /><path d="M28 38a22 20 0 0 1 44 0z" fill="#a4b0be" {...S} /><path d="M50 18v20" stroke="#6b7685" strokeWidth={3} /></>;
    case 'chef': return <><path d="M34 34v-8a9 9 0 0 1 4-17a12 12 0 0 1 24 0a9 9 0 0 1 4 17v8z" fill="#fff" {...S} /><path d="M34 28h32" {...S} strokeWidth={2} /></>;
    case 'unicorn': return <><path d="M44 32L50 2l6 30z" fill="#ffe066" {...S} /><path d="M46 24l8-3M47 16l6-2M48 9l3-1" stroke="#ff8fb1" strokeWidth={2.5} /></>;
    case 'halo': return <ellipse cx={50} cy={12} rx={17} ry={5} fill="none" stroke="#ffd23f" strokeWidth={5} />;
    case 'banana': return <><path d="M30 26q20 12 40-6q2 4-1 7q-18 16-40 3z" fill="#ffe066" {...S} /><path d="M70 20l3-5" {...S} /></>;
    case 'flower': return <g transform="translate(68 30)">{[0, 72, 144, 216, 288].map((r) => <ellipse key={r} cx={0} cy={-8} rx={5} ry={8} transform={`rotate(${r})`} fill="#ff8fb1" {...S} strokeWidth={2} />)}<circle r={5} fill="#ffd23f" {...S} strokeWidth={2} /></g>;
    case 'egg': return <><path d="M30 30q-4-12 10-12q6-8 16-2q14-2 14 10q4 8-8 8H38q-10 0-8-4z" fill="#fff" {...S} /><circle cx={50} cy={24} r={6} fill="#ffb020" {...S} strokeWidth={2} /></>;
    default: return null;
  }
}

function extra(f: number): ReactNode {
  switch (FACES[f]) {
    case 'shades': return <><rect x={30} y={50} width={17} height={11} rx={4} fill={INK} /><rect x={53} y={50} width={17} height={11} rx={4} fill={INK} /><path d="M47 54h6M30 53l-6-2M70 53l6-2" {...S} /><path d="M33 53l4 0" stroke="#fff" strokeWidth={2} opacity={0.6} /></>;
    case 'hearts': return <>{[39, 61].map((x) => <path key={x} d={`M${x} 63l-8-8a4.5 4.5 0 0 1 8-5a4.5 4.5 0 0 1 8 5z`} fill="#ff4d8d" {...S} strokeWidth={2} />)}<path d="M47 55h6" {...S} strokeWidth={2} /></>;
    case 'monocle': return <><circle cx={60} cy={56} r={8} fill="#cdeaff" fillOpacity={0.35} stroke="#ffd23f" strokeWidth={3} /><path d="M66 62q4 12 0 22" fill="none" stroke="#ffd23f" strokeWidth={2} /></>;
    case 'mustache': return <path d="M50 67q-6-5-12-1q-4 3-9 0q3 7 10 6q7 0 11-5q4 5 11 5q7 1 10-6q-5 3-9 0q-6-4-12 1z" fill={INK} />;
    case 'patch': return <><path d="M24 44L76 62" stroke={INK} strokeWidth={2.5} /><ellipse cx={40} cy={56} rx={8} ry={7} fill={INK} /></>;
    case 'clown': return <><circle cx={50} cy={64} r={7} fill="#ff3b3b" {...S} strokeWidth={2} /><circle cx={48} cy={62} r={2} fill="#fff" opacity={0.7} /></>;
    case 'bowtie': return <><path d="M50 90l-12-7v14zM50 90l12-7v14z" fill="#ff4757" {...S} strokeWidth={2.5} /><circle cx={50} cy={90} r={3} fill="#ffd23f" {...S} strokeWidth={2} /></>;
    case '3d': return <><rect x={30} y={50} width={17} height={11} rx={2} fill="#ff4757" fillOpacity={0.75} {...S} strokeWidth={2.5} /><rect x={53} y={50} width={17} height={11} rx={2} fill="#4dabf7" fillOpacity={0.75} {...S} strokeWidth={2.5} /><path d="M47 54h6" {...S} /></>;
    case 'gum': return <><circle cx={54} cy={76} r={9} fill="#ff9fd6" fillOpacity={0.9} {...S} strokeWidth={2} /><circle cx={51} cy={73} r={2.5} fill="#fff" opacity={0.7} /></>;
    case 'googly': return <>{[[39, 2, 3], [61, -2, 2]].map(([x, dx, dy]) => <g key={x}><circle cx={x} cy={55} r={8.5} fill="#fff" {...S} strokeWidth={2} /><circle cx={x + dx} cy={55 + dy} r={4} fill={INK} /></g>)}</>;
    default: return null;
  }
}

/** A player's avatar. `av` is the packed number from pet.ts. */
export function PetFace({ av, size, pet }: { av?: number; size: number; pet?: Pet }) {
  const p = pet ?? decodePet(av ?? 0);
  const fur = FURS[p.c];
  const parts = animal(p.a, fur);
  return (
    <svg viewBox="0 0 100 100" width={size} height={size} className="shrink-0" aria-hidden>
      {parts.back}
      <circle cx={50} cy={58} r={28} fill={parts.head ?? fur} {...S} />
      {parts.front}
      {extra(p.f)}
      {hat(p.h)}
    </svg>
  );
}

const TABS = [
  { k: 'a', en: 'Animal', es: 'Animal' },
  { k: 'c', en: 'Colour', es: 'Color' },
  { k: 'h', en: 'Hat', es: 'Head' },
  { k: 'f', en: 'Face', es: 'Face' },
] as const;
const SIZES = { a: ANIMALS.length, c: FURS.length, h: HATS.length, f: FACES.length };

/** Quick avatar maker: big preview, dice for a random one, then a tab per part. */
export function PetMaker({ av, onChange, dark }: { av: number; onChange: (av: number) => void; dark?: boolean }) {
  const [tab, setTab] = useState<keyof Pet>('a');
  const p = decodePet(av);
  const set = (k: keyof Pet, v: number) => onChange(encodePet({ ...p, [k]: v }));
  return (
    <div className={cn('w-full rounded-2xl p-2', dark ? 'bg-white/10' : 'bg-[#f3f0ff]')}>
      <div className="flex items-center gap-2">
        <div className={cn('rounded-full p-1', dark ? 'bg-white/15' : 'bg-white')}><PetFace pet={p} size={84} /></div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <div className={cn('flex rounded-xl p-0.5 text-[12.5px] font-black', dark ? 'bg-black/20' : 'bg-white')}>
            {TABS.map((x) => (
              <button key={x.k} type="button" onClick={() => setTab(x.k)}
                className={cn('flex-1 rounded-lg px-1 py-1.5', tab === x.k ? (dark ? 'bg-white text-[#2a2170]' : 'bg-[#6a4cff] text-white') : dark ? 'text-white/80' : 'text-[#5b4f99]')}>
                {t(x.en, x.es)}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => onChange(randomPet())} className={cn('flex h-9 items-center justify-center gap-1.5 rounded-xl text-[13px] font-black', dark ? 'bg-white/15 text-white' : 'bg-white text-[#3b2bb5]')}>
            <Dices size={16} /> {t('Surprise me', 'Surprise me')}
          </button>
        </div>
      </div>
      <div className="mt-2 grid grid-cols-6 gap-1.5">
        {Array.from({ length: SIZES[tab] }, (_, i) => (
          <button key={i} type="button" onClick={() => set(tab, i)} aria-label={`${t(TABS.find((x) => x.k === tab)!.en, TABS.find((x) => x.k === tab)!.es)} ${i + 1}`}
            className={cn('grid aspect-square place-items-center rounded-xl', dark ? 'bg-white/10' : 'bg-white', p[tab] === i && (dark ? 'ring-3 ring-[#ffd23f]' : 'ring-3 ring-[#6a4cff]'))}>
            {tab === 'c'
              ? <span className="h-7 w-7 rounded-full border-[3px] border-[#1d1840]" style={{ background: FURS[i] }} />
              : <PetFace pet={{ ...p, [tab]: i, ...(tab === 'a' ? { h: 0, f: 0 } : {}) }} size={44} />}
          </button>
        ))}
      </div>
    </div>
  );
}
