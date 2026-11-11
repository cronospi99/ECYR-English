import { useState, type ReactNode } from 'react';
import { Shapes } from 'lucide-react';
import { Segmented } from '@/components/ui/Segmented';
import { deep, ink, tint } from '@/lib/color';
import { Es } from './Es';

/**
 * Diagrams drawn in code for the grammar points that are easier to see than to read:
 * the IN / ON / AT funnel, timelines for the tenses, quantity jars, the comparison
 * stairs, near/far demonstratives, the conditionals ladder and the reported-speech
 * step back. Keyed like the aids ("A1-2-1" = level-unit-point) and shown in "See it".
 */

const GREEN = 'var(--mint)';
const PINK = 'var(--pink)';
const PURPLE = 'var(--purple)';
const BLUE = 'var(--blue)';
const ORANGE = 'var(--orange)';

function Frame({ title, color, es, children }: { title: string; color: string; es?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[20px]" style={{ background: tint(color, 5), boxShadow: `inset 0 0 0 1px ${tint(color, 20)}` }}>
      <header className="flex items-center gap-2.5 px-4 pt-3.5 pb-1">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-white" style={{ background: deep(color) }} aria-hidden>
          <Shapes size={17} />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-bold tracking-[0.07em] uppercase" style={{ color: ink(color) }}>
            Diagram
          </div>
          <h5 className="text-[16px] leading-snug font-semibold text-balance">{title}</h5>
        </div>
      </header>
      <div className="px-3 pt-2 pb-3.5 sm:px-4">
        {children}
        {es && (
          <Es part="explain">
            <p className="text-label-2 mt-3 text-[13.5px] leading-snug">{es}</p>
          </Es>
        )}
      </div>
    </section>
  );
}

// ------------------------------------------------------------ IN / ON / AT --

type Pair = [category: string, example: string];
const FUNNEL: { word: string; tag: string; size: string; color: string; time: Pair[]; place: Pair[] }[] = [
  {
    word: 'IN',
    tag: 'General',
    size: 'bigger',
    color: GREEN,
    time: [
      ['Centuries', 'in the 1900s'],
      ['Decades', 'in the 90s'],
      ['Years', 'in 2026'],
      ['Seasons', 'in spring'],
      ['Months', 'in March'],
      ['Weeks', 'in the first week'],
      ['Parts of the day', 'in the morning'],
    ],
    place: [
      ['Continents', 'in South America'],
      ['Countries', 'in Colombia'],
      ['Cities', 'in Paris'],
      ['Neighbourhoods', 'in Manhattan'],
      ['Rooms', 'in the kitchen'],
      ['Closed spaces', 'in a car · in a box'],
    ],
  },
  {
    word: 'ON',
    tag: 'Specific',
    size: 'smaller',
    color: PINK,
    time: [
      ['Days', 'on Monday'],
      ['Dates', 'on 3 April'],
      ['Special days', 'on my birthday'],
      ['Day + part', 'on Sunday morning'],
      ['Holidays with “Day”', 'on Christmas Day'],
    ],
    place: [
      ['Streets', 'on Columbus Street'],
      ['Surfaces', 'on the floor · on the wall'],
      ['Floors', 'on the second floor'],
      ['Public transport', 'on a bus · on a plane'],
      ['Media', 'on TV · on the radio'],
    ],
  },
  {
    word: 'AT',
    tag: 'Very specific',
    size: 'smallest',
    color: PURPLE,
    time: [
      ['Clock times', 'at 8 a.m.'],
      ['Points of the day', 'at noon · at midnight'],
      ['Exception', 'at night'],
      ['Moments', 'at the moment'],
    ],
    place: [
      ['Addresses', 'at 456 State Street'],
      ['Exact points', 'at the door · at the bus stop'],
      ['Places of activity', 'at school · at work'],
      ['Events', 'at a party'],
    ],
  },
];
const ROWS = [5, 3.6, 2.8];
const TOTAL = ROWS.reduce((a, b) => a + b, 0);
/** Funnel width (0–1) at a height fraction: full at the top, a blunt tip at the bottom. */
const widthAt = (f: number) => 1 - 0.78 * f;

export function InOnAt({ start = 'time' }: { start?: 'time' | 'place' }) {
  const [mode, setMode] = useState<'time' | 'place'>(start);
  let acc = 0;
  return (
    <Frame
      title="IN · ON · AT — from big to small"
      color={GREEN}
      es="Piensa en un embudo: IN es para lo grande y general, ON para algo más concreto (días, superficies) y AT para un punto exacto (una hora, una dirección)."
    >
      <div className="mb-3 flex justify-center">
        <Segmented
          size="sm"
          value={mode}
          onChange={setMode}
          options={[
            { value: 'time', label: '🕒 Time' },
            { value: 'place', label: '📍 Place' },
          ]}
        />
      </div>
      <div className="mx-auto grid h-[430px] max-w-[620px] grid-cols-[44%_1fr] gap-x-2 sm:grid-cols-[46%_1fr] sm:gap-x-4" style={{ gridTemplateRows: ROWS.map((r) => `${r}fr`).join(' ') }}>
        {FUNNEL.map((t, i) => {
          const top = widthAt(acc / TOTAL);
          acc += ROWS[i]!;
          const bottom = widthAt(acc / TOTAL);
          const pct = (v: number) => `${(v * 100).toFixed(2)}%`;
          const clip = `polygon(${pct((1 - top) / 2)} 0, ${pct((1 + top) / 2)} 0, ${pct((1 + bottom) / 2)} 100%, ${pct((1 - bottom) / 2)} 100%)`;
          return (
            <div key={t.word} className="contents">
              <div className="flex flex-col items-center justify-center text-center text-white" style={{ background: deep(t.color, 78), clipPath: clip }}>
                <span className="text-[10.5px] leading-none font-bold tracking-wide uppercase opacity-90 sm:text-[12px]">{i === 2 ? 'Exact' : t.tag}</span>
                <span className="font-black tracking-tight text-[#ffe94a]" style={{ fontSize: [44, 34, 26][i], lineHeight: 1.05 }}>
                  {t.word}
                </span>
                {i < 2 && <span className="text-[11px] leading-none opacity-85">({t.size})</span>}
              </div>
              <ul className="flex min-w-0 flex-col justify-center gap-[3px] py-1">
                {t[mode].map(([cat, ex]) => (
                  <li key={cat} className="text-[12.5px] leading-tight sm:text-[14px]">
                    <span className="font-bold" style={{ color: ink(t.color, 70) }}>
                      {cat}
                    </span>{' '}
                    <span className="text-label-2">·</span> <span className="font-medium">{ex}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[13px]">
        {mode === 'time' ? (
          <>
            <b>in</b> the morning / afternoon / evening — but <b>at</b> night
          </>
        ) : (
          <>
            <b>in</b> a car or taxi — but <b>on</b> a bus, train or plane (you can walk inside)
          </>
        )}
      </p>
    </Frame>
  );
}

// ---------------------------------------------------------------- timeline --

interface TL {
  title: string;
  es: string;
  now: number;
  /** Bars above the line: from–to on a 0–100 scale. */
  spans?: { from: number; to: number; label: string; color: string; row?: number; dashed?: boolean; open?: boolean }[];
  /** Points on the line. */
  marks?: { x: number; label: string; color: string }[];
  examples: { text: string; color: string }[];
}

const TIMELINES: Record<string, TL> = {
  ppVsPs: {
    title: 'Past simple vs present perfect',
    es: 'Past simple: un momento terminado y con fecha (yesterday, in 2019). Present perfect: desde el pasado hasta ahora, sin decir cuándo.',
    now: 72,
    marks: [{ x: 22, label: 'in 2019', color: ORANGE }],
    spans: [{ from: 38, to: 72, label: 'any time up to now', color: BLUE }],
    examples: [
      { text: 'I visited Cartagena in 2019. (finished time)', color: ORANGE },
      { text: 'I have visited Cartagena. (in my life, no date)', color: BLUE },
    ],
  },
  pcPs: {
    title: 'A long action, cut by a short one',
    es: 'Past continuous (was/were + -ing) es la acción larga de fondo; past simple es la acción corta que la interrumpe.',
    now: 88,
    spans: [{ from: 18, to: 62, label: 'was cooking', color: BLUE }],
    marks: [{ x: 44, label: 'the phone rang', color: PINK }],
    examples: [
      { text: 'I was cooking when the phone rang.', color: BLUE },
      { text: 'While I was cooking, the phone rang.', color: PINK },
    ],
  },
  pastPerfect: {
    title: 'Past perfect: the past before the past',
    es: 'Dos acciones pasadas: la que ocurrió primero va con had + participio; la segunda, en past simple.',
    now: 88,
    marks: [
      { x: 24, label: '1 · had left', color: PURPLE },
      { x: 56, label: '2 · arrived', color: ORANGE },
    ],
    examples: [{ text: 'When I arrived, the bus had already left.', color: PURPLE }],
  },
  usedTo: {
    title: 'Used to: true before, not now',
    es: 'Used to + verbo: hábitos o estados del pasado que ya no son verdad.',
    now: 76,
    spans: [{ from: 10, to: 52, label: 'used to play', color: ORANGE, dashed: true }],
    examples: [
      { text: 'I used to play football every day. (not now)', color: ORANGE },
      { text: 'Did you use to live here?', color: BLUE },
    ],
  },
  ppc: {
    title: 'Present perfect continuous: started before, still going',
    es: 'Have/has been + -ing: una actividad que empezó en el pasado y sigue ahora (o acaba de terminar).',
    now: 74,
    spans: [{ from: 26, to: 74, label: 'have been studying', color: GREEN, open: true }],
    marks: [{ x: 26, label: 'since 8', color: GREEN }],
    examples: [
      { text: 'I have been studying since eight o’clock.', color: GREEN },
      { text: 'She has been working here for two years.', color: BLUE },
    ],
  },
  goingTo: {
    title: 'Be going to: the plan already exists',
    es: 'Be going to: decidiste antes de hablar. La decisión está en el pasado; la acción, en el futuro.',
    now: 40,
    marks: [
      { x: 16, label: 'decision', color: PURPLE },
      { x: 76, label: 'the trip', color: BLUE },
    ],
    spans: [{ from: 16, to: 76, label: 'I’m going to travel', color: BLUE, dashed: true }],
    examples: [
      { text: 'I’m going to visit my grandma on Saturday. (plan)', color: BLUE },
      { text: 'I’m meeting Ana at six. (arranged: present continuous)', color: PURPLE },
    ],
  },
  timeContrast: {
    title: 'Past · present · future',
    es: 'Tres zonas: antes (used to / past simple), ahora (present + these days) y después (will / might).',
    now: 50,
    spans: [
      { from: 6, to: 40, label: 'people used to…', color: ORANGE },
      { from: 44, to: 58, label: 'these days', color: GREEN, row: 1 },
      { from: 62, to: 95, label: 'soon, people will…', color: BLUE },
    ],
    examples: [
      { text: 'People used to write letters.', color: ORANGE },
      { text: 'These days, they send messages.', color: GREEN },
      { text: 'Soon, they will talk to their glasses.', color: BLUE },
    ],
  },
  future: {
    title: 'Three ways to see the future',
    es: 'Will: predicción. Will be + -ing: en progreso en ese momento. Will have + participio: ya terminado antes de ese momento.',
    now: 14,
    marks: [
      { x: 40, label: 'will change', color: BLUE },
      { x: 90, label: 'by 2050', color: PURPLE },
    ],
    spans: [
      { from: 50, to: 72, label: 'will be living', color: GREEN },
      { from: 22, to: 90, label: 'will have finished', color: PURPLE, row: 1, dashed: true },
    ],
    examples: [
      { text: 'Cities will change a lot.', color: BLUE },
      { text: 'In 2040, we will be living in smart homes.', color: GREEN },
      { text: 'By 2050, we will have stopped using petrol.', color: PURPLE },
    ],
  },
  timeWords: {
    title: 'Since, for, ago, during, from … to',
    es: 'Since = punto de inicio. For = duración. Ago = hacia atrás desde hoy. During = dentro de un periodo. From … to = inicio y fin.',
    now: 82,
    marks: [{ x: 50, label: '5 years ago', color: PINK }],
    spans: [
      { from: 8, to: 34, label: 'from 1990 to 2000', color: ORANGE },
      { from: 14, to: 26, label: 'during', color: PURPLE, row: 1 },
      { from: 58, to: 82, label: 'for 3 years', color: GREEN, row: 1 },
      { from: 58, to: 82, label: 'since 2023', color: BLUE, open: true },
    ],
    examples: [
      { text: 'She lived there from 1990 to 2000. During that time, she studied.', color: ORANGE },
      { text: 'He moved five years ago.', color: PINK },
      { text: 'I have worked here since 2023 / for three years.', color: BLUE },
    ],
  },
};

function Timeline({ id }: { id: keyof typeof TIMELINES }) {
  const t = TIMELINES[id]!;
  const W = 360;
  const x = (v: number) => 14 + (v / 100) * (W - 34);
  const rows = Math.max(0, ...(t.spans ?? []).map((s) => (s.row ?? 0) + 1));
  const axis = 26 + rows * 24;
  const H = axis + 44;
  return (
    <Frame title={t.title} color={BLUE} es={t.es}>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full max-w-[600px]" role="img" aria-label={`Timeline: ${t.title}`}>
        <text x={x(t.now) - 30} y={12} fontSize={9} fontWeight={700} textAnchor="end" fill="var(--label-3)">
          PAST
        </text>
        <text x={x(t.now) + 30} y={12} fontSize={9} fontWeight={700} fill="var(--label-3)">
          FUTURE
        </text>
        <line x1={x(t.now)} y1={4} x2={x(t.now)} y2={axis + 10} stroke="var(--red)" strokeWidth={1.4} strokeDasharray="3 3" />
        <text x={x(t.now)} y={axis + 22} fontSize={10} fontWeight={800} textAnchor="middle" fill="var(--red)">
          NOW
        </text>
        <line x1={8} y1={axis} x2={W - 14} y2={axis} stroke="var(--label-2)" strokeWidth={2} strokeLinecap="round" />
        <path d={`M${W - 16} ${axis - 5} L${W - 7} ${axis} L${W - 16} ${axis + 5}`} fill="none" stroke="var(--label-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {(t.spans ?? []).map((s, k) => {
          const y = axis - 24 * ((s.row ?? 0) + 1);
          const x1 = x(s.from);
          const x2 = x(s.to);
          return (
            <g key={k}>
              <rect x={x1} y={y} width={x2 - x1} height={17} rx={8.5} fill={s.dashed ? tint(s.color, 14) : deep(s.color, 80)} stroke={s.dashed ? deep(s.color, 80) : 'none'} strokeWidth={1.3} strokeDasharray={s.dashed ? '4 3' : undefined} />
              {s.open && <path d={`M${x2 - 9} ${y + 4} L${x2 - 3} ${y + 8.5} L${x2 - 9} ${y + 13}`} fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
              <text x={(x1 + x2) / 2} y={y + 12} fontSize={9.5} fontWeight={700} textAnchor="middle" fill={s.dashed ? 'var(--label)' : '#fff'}>
                {s.label}
              </text>
            </g>
          );
        })}
        {(t.marks ?? []).map((m, k) => (
          <g key={k}>
            <circle cx={x(m.x)} cy={axis} r={6} fill={deep(m.color, 80)} stroke="var(--bg, #fff)" strokeWidth={2} />
            <text x={x(m.x)} y={axis + (k % 2 ? 36 : 22)} fontSize={9.5} fontWeight={700} textAnchor="middle" fill="var(--label)">
              {m.label}
            </text>
          </g>
        ))}
      </svg>
      <ul className="mt-2 space-y-1">
        {t.examples.map((e) => (
          <li key={e.text} className="flex items-baseline gap-2 text-[14.5px] leading-snug font-medium">
            <span className="inline-block h-2.5 w-2.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: deep(e.color, 80) }} aria-hidden />
            {e.text}
          </li>
        ))}
      </ul>
    </Frame>
  );
}

// ---------------------------------------------------------- demonstratives --

function Demonstratives() {
  const cell = (word: string, emoji: string, far: boolean, n: number) => (
    <div className="bg-bg-2 flex flex-col items-center justify-end rounded-[14px] px-2 py-3 text-center" style={{ boxShadow: `inset 0 0 0 1px ${tint(far ? PURPLE : GREEN, 30)}` }}>
      <span aria-hidden style={{ fontSize: far ? 20 : 38, opacity: far ? 0.75 : 1, lineHeight: 1.2 }}>
        {emoji.repeat(n)}
      </span>
      <span className="mt-1 text-[19px] font-extrabold" style={{ color: ink(far ? PURPLE : GREEN, 70) }}>
        {word}
      </span>
      <span className="text-label-2 text-[12.5px]">
        {word} {n > 1 ? 'shoes' : 'shoe'}
      </span>
    </div>
  );
  return (
    <Frame title="This, that, these, those" color={GREEN} es="Dos preguntas: ¿está cerca o lejos? ¿Es una cosa o son varias? Cerca = this/these; lejos = that/those.">
      <div className="mx-auto grid max-w-[520px] grid-cols-[auto_1fr_1fr] items-stretch gap-2">
        <span />
        <div className="text-center text-[13px] font-bold">👇 HERE · near</div>
        <div className="text-center text-[13px] font-bold">👉 THERE · far</div>
        <div className="text-label-2 flex items-center text-[12.5px] font-bold">ONE</div>
        {cell('this', '👟', false, 1)}
        {cell('that', '👟', true, 1)}
        <div className="text-label-2 flex items-center text-[12.5px] font-bold">MANY</div>
        {cell('these', '👟', false, 3)}
        {cell('those', '👟', true, 3)}
      </div>
    </Frame>
  );
}

// ------------------------------------------------------------------ stairs --

const STAIRS: { base: string; steps: [string, string, string]; rule: string; emoji: [string, string, string] }[] = [
  { base: 'short adjective', steps: ['tall', 'taller than', 'the tallest'], rule: '+ -er / the + -est', emoji: ['🏠', '🏢', '🏙️'] },
  { base: 'long adjective', steps: ['expensive', 'more expensive than', 'the most expensive'], rule: 'more / the most', emoji: ['🚲', '🚗', '🏎️'] },
  { base: 'irregular', steps: ['good', 'better than', 'the best'], rule: 'new words', emoji: ['🙂', '😀', '🤩'] },
];

function Stairs() {
  const [i, setI] = useState(0);
  const s = STAIRS[i]!;
  return (
    <Frame title="Comparing: one step up, then the top" color={ORANGE} es="Comparativo = dos cosas (un escalón más, con than). Superlativo = la número uno de todo el grupo (con the).">
      <div className="mb-3 flex justify-center">
        <Segmented size="sm" value={String(i)} onChange={(v) => setI(Number(v))} options={STAIRS.map((x, k) => ({ value: String(k), label: x.base }))} />
      </div>
      <div className="mx-auto flex h-[190px] max-w-[520px] items-end gap-2">
        {s.steps.map((w, k) => (
          <div key={w} className="flex h-full flex-1 flex-col items-center justify-end">
            <span aria-hidden className="text-[30px] leading-none">
              {s.emoji[k]}
            </span>
            <div className="mt-1 flex w-full items-start justify-center rounded-t-[12px] px-1 pt-2 text-center text-white" style={{ height: [64, 104, 144][k], background: deep([GREEN, ORANGE, PINK][k]!, 78) }}>
              <span className="text-[14px] leading-tight font-bold sm:text-[16px]">{w}</span>
            </div>
          </div>
        ))}
      </div>
      <div className="text-label-2 mx-auto mt-1 grid max-w-[520px] grid-cols-3 gap-2 text-center text-[12px] font-semibold">
        <span>base</span>
        <span>comparative (2 things)</span>
        <span>superlative (no. 1)</span>
      </div>
      <p className="mt-2 text-center text-[13.5px]">
        Rule: <b>{s.rule}</b>
      </p>
    </Frame>
  );
}

// -------------------------------------------------------------- quantities --

const JARS: { fill: number; count: string; non: string }[] = [
  { fill: 0, count: 'no / not any', non: 'no / not any' },
  { fill: 14, count: 'a few', non: 'a little' },
  { fill: 42, count: 'some / several', non: 'some' },
  { fill: 76, count: 'many / a lot of', non: 'much / a lot of' },
  { fill: 100, count: 'all', non: 'all' },
];

function Jars() {
  return (
    <Frame title="How much is in the jar?" color={BLUE} es="Contables (se pueden contar: apples) usan many / a few. No contables (no se cuentan: water, rice) usan much / a little. Some, a lot of y all sirven para los dos.">
      <div className="mx-auto grid max-w-[600px] grid-cols-5 gap-1.5 sm:gap-3">
        {JARS.map((j) => (
          <div key={j.fill} className="flex flex-col items-center text-center">
            <div className="bg-bg-2 relative h-[92px] w-full max-w-[72px] overflow-hidden rounded-[6px_6px_16px_16px] border-2 border-t-4" style={{ borderColor: 'var(--label-3)' }}>
              <div className="absolute inset-x-0 bottom-0" style={{ height: `${j.fill}%`, background: `linear-gradient(${tint(BLUE, 55)}, ${deep(BLUE, 85)})` }} />
            </div>
            <span className="mt-1.5 text-[12px] leading-tight font-bold sm:text-[13.5px]" style={{ color: ink(ORANGE, 70) }}>
              {j.count}
            </span>
            <span className="text-[12px] leading-tight font-bold sm:text-[13.5px]" style={{ color: ink(BLUE, 70) }}>
              {j.non}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px]">
        <span>
          <b style={{ color: ink(ORANGE, 70) }}>Count</b> 🍎🍎🍎 How <b>many</b> apples?
        </span>
        <span>
          <b style={{ color: ink(BLUE, 70) }}>Noncount</b> 💧 How <b>much</b> water?
        </span>
      </div>
    </Frame>
  );
}

const PEOPLE: [string, number][] = [
  ['all', 10],
  ['nearly all', 9],
  ['a lot of / many', 7],
  ['not many', 3],
  ['few', 2],
  ['no one', 0],
];

function PeopleScale() {
  return (
    <Frame title="How many people? From all to no one" color={PURPLE} es="Cada fila muestra cuántas personas de diez: de all (todas) a no one (nadie).">
      <ul className="mx-auto max-w-[460px] space-y-1.5">
        {PEOPLE.map(([word, n]) => (
          <li key={word} className="flex items-center gap-3">
            <span className="w-[112px] shrink-0 text-right text-[14.5px] font-bold">{word}</span>
            <span className="flex gap-[3px]" aria-label={`${n} of 10`}>
              {Array.from({ length: 10 }, (_, k) => (
                <span key={k} className="h-5 w-5 rounded-full sm:h-6 sm:w-6" style={{ background: k < n ? deep(PURPLE, 80) : tint(PURPLE, 14) }} />
              ))}
            </span>
          </li>
        ))}
      </ul>
    </Frame>
  );
}

// ------------------------------------------------------------ conditionals --

const CONDS: { n: string; when: string; ifPart: string; result: string; ex: string; color: string }[] = [
  { n: 'Zero', when: 'always true', ifPart: 'if + present', result: 'present', ex: 'If you heat ice, it melts.', color: GREEN },
  { n: 'First', when: 'real and possible', ifPart: 'if + present', result: 'will + verb', ex: 'If it rains, I will stay home.', color: BLUE },
  { n: 'Second', when: 'imaginary now', ifPart: 'if + past', result: 'would + verb', ex: 'If I had wings, I would fly.', color: ORANGE },
  { n: 'Third', when: 'imaginary past', ifPart: 'if + past perfect', result: 'would have + participle', ex: 'If I had studied, I would have passed.', color: PINK },
];

function Conditionals({ focus }: { focus: number }) {
  return (
    <Frame title="The conditionals ladder: from real to imaginary" color={ORANGE} es="Cuanto más abajo, menos real: cero y primero hablan de cosas posibles; segundo y tercero, de cosas imaginarias. El verbo da un paso atrás en cada escalón.">
      <ol className="mx-auto max-w-[620px] space-y-1.5">
        {CONDS.map((c, k) => (
          <li
            key={c.n}
            className="rounded-[14px] px-3 py-2"
            style={{ background: tint(c.color, k === focus ? 16 : 6), boxShadow: `inset 0 0 0 ${k === focus ? 2 : 1}px ${tint(c.color, k === focus ? 70 : 22)}`, opacity: k === focus ? 1 : 0.72 }}
          >
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[13px]">
              <b className="rounded-full px-2 py-0.5 text-white" style={{ background: deep(c.color, 78) }}>
                {c.n}
              </b>
              <span className="text-label-2 font-semibold">{c.when}</span>
              {k === focus && <span className="text-[11px] font-bold tracking-wide uppercase">← this lesson</span>}
            </div>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[13.5px] font-bold">
              <span className="bg-bg-2 rounded-[8px] px-2 py-1">{c.ifPart}</span>
              <span aria-hidden>→</span>
              <span className="bg-bg-2 rounded-[8px] px-2 py-1">{c.result}</span>
            </div>
            <p className="mt-1 text-[14px] font-medium">{c.ex}</p>
          </li>
        ))}
      </ol>
    </Frame>
  );
}

// --------------------------------------------------------------- backshift --

const SHIFT: [string, string][] = [
  ['am / is / are', 'was / were'],
  ['work', 'worked'],
  ['worked', 'had worked'],
  ['will', 'would'],
  ['can', 'could'],
  ['now · today', 'then · that day'],
  ['here · this', 'there · that'],
  ['tomorrow', 'the next day'],
];

function Backshift() {
  return (
    <Frame title="Reported speech: everything takes one step back" color={PURPLE} es="Al contar lo que alguien dijo, el verbo retrocede un tiempo y las palabras de tiempo y lugar se alejan.">
      <div className="mx-auto max-w-[520px]">
        <div className="mb-1.5 grid grid-cols-[1fr_auto_1fr] gap-2 text-center text-[12px] font-bold tracking-wide uppercase">
          <span style={{ color: ink(GREEN, 70) }}>💬 “Direct”</span>
          <span />
          <span style={{ color: ink(PURPLE, 70) }}>🗣️ Reported</span>
        </div>
        <ul className="space-y-1.5">
          {SHIFT.map(([a, b]) => (
            <li key={a} className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 text-center text-[14px] font-bold">
              <span className="rounded-[10px] px-2 py-1.5" style={{ background: tint(GREEN, 14) }}>
                {a}
              </span>
              <span aria-hidden className="text-label-2">
                ⟶
              </span>
              <span className="rounded-[10px] px-2 py-1.5" style={{ background: tint(PURPLE, 14) }}>
                {b}
              </span>
            </li>
          ))}
        </ul>
        <p className="mt-2.5 text-[14px] font-medium">“I am tired today.” ⟶ She said (that) she was tired that day.</p>
      </div>
    </Frame>
  );
}

// ----------------------------------------------------------------- mapping --

const tl = (id: keyof typeof TIMELINES) => () => <Timeline id={id} />;
const cond = (focus: number) => () => <Conditionals focus={focus} />;

/** "<level>-<unit>-<point>" → the diagrams of that grammar point. */
const DIAGRAMS: Record<string, (() => ReactNode)[]> = {
  'A1-2-1': [() => <InOnAt start="time" />],
  'A1-3-0': [() => <Demonstratives />],
  'A1-3-1': [() => <Stairs />],
  'A1-5-1': [() => <PeopleScale />],
  'A1-8-0': [() => <InOnAt start="place" />],
  'A1-8-1': [() => <Jars />],
  'A1-10-1': [tl('ppVsPs')],
  'A1-14-0': [() => <Stairs />],
  'A1-15-0': [tl('goingTo')],
  'A1-16-0': [tl('ppVsPs')],
  'A2-1-1': [tl('usedTo')],
  'A2-2-0': [() => <Jars />],
  'A2-4-0': [tl('ppVsPs')],
  'A2-9-0': [tl('timeContrast')],
  'A2-9-1': [cond(1)],
  'A2-12-0': [tl('pcPs')],
  'A2-12-1': [tl('ppc')],
  'A2-15-0': [cond(2)],
  'A2-16-0': [() => <Backshift />],
  'B1-4-0': [tl('pcPs')],
  'B1-4-1': [tl('pastPerfect')],
  'B1-10-0': [tl('future')],
  'B1-10-1': [tl('timeWords')],
  'B1-11-1': [cond(3)],
  'B2-6-0': [tl('ppVsPs')],
  'B2-6-1': [tl('ppc')],
  'B2-6-2': [tl('pastPerfect')],
  'B2-9-1': [tl('usedTo')],
  'B2-11-0': [cond(2)],
  'B2-12-0': [tl('future')],
  'B2-12-1': [cond(3)],
};

export const hasDiagrams = (key: string | undefined) => !!key && !!DIAGRAMS[key];

export function Diagrams({ pointKey }: { pointKey?: string }) {
  const list = pointKey ? DIAGRAMS[pointKey] : undefined;
  if (!list) return null;
  return (
    <div className="space-y-4">
      {list.map((Render, k) => (
        <div key={k}>{Render()}</div>
      ))}
    </div>
  );
}
