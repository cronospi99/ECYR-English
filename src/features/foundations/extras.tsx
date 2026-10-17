import { useMemo, useState } from 'react';
import { Play, Square, Volume2 } from 'lucide-react';
import type { CourseBlock } from '@/content/types';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Misc';
import { Segmented } from '@/components/ui/Segmented';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { speak, speakSequence, stopSpeaking } from '@/lib/speech';
import { ink, tint } from '@/lib/color';
import { cn } from '@/lib/cn';
import { arr, str, Es, Section } from './kit';
import { cardinal } from './numbers';

// ------------------------------------------------------------ phrasebook ----

type Reg = 'formal' | 'neutral' | 'informal';
const REG: Record<Reg, { label: string; color: string }> = {
  formal: { label: 'Formal', color: 'var(--indigo)' },
  neutral: { label: 'Neutro', color: 'var(--teal)' },
  informal: { label: 'Informal', color: 'var(--orange)' },
};

function RegTag({ reg }: { reg: Reg }) {
  const r = REG[reg] ?? REG.neutral;
  return (
    <span className="shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold tracking-wide uppercase" style={{ background: tint(r.color, 14), color: ink(r.color) }}>
      {r.label}
    </span>
  );
}

/** Greetings guide: categories × register, every expression with audio. */
export function PhrasebookBlock({ b }: { b: CourseBlock }) {
  const cats = arr<{ id: string; label: string; e: string }>(b.cats);
  const items = arr<{ cat: string; en: string; es: string; reg: Reg; note?: string }>(b.items);
  const [cat, setCat] = useState<string>('all');
  const [reg, setReg] = useState<'all' | Reg>('all');
  const [playing, setPlaying] = useState<number | null>(null);
  const shown = items.filter((it) => (cat === 'all' || it.cat === cat) && (reg === 'all' || it.reg === reg));
  const groups = cats.map((c) => ({ ...c, items: shown.filter((it) => it.cat === c.id) })).filter((g) => g.items.length);

  const playAll = () => {
    setPlaying(0);
    speakSequence(
      shown.map((it) => ({ text: it.en.replace(/\s*\/\s*/g, '. ') })),
      { rate: 0.9, gapMs: 350, onLine: setPlaying, onEnd: () => setPlaying(null) },
    );
  };
  const stop = () => {
    stopSpeaking();
    setPlaying(null);
  };

  return (
    <Section b={b}>
      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>
          Todas · {items.length}
        </Chip>
        {cats.map((c) => (
          <Chip key={c.id} active={cat === c.id} onClick={() => setCat(c.id)}>
            <span aria-hidden>{c.e}</span> {c.label}
          </Chip>
        ))}
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <Segmented
          size="sm"
          value={reg}
          onChange={setReg}
          options={[
            { value: 'all', label: 'Todos' },
            { value: 'formal', label: 'Formal' },
            { value: 'neutral', label: 'Neutro' },
            { value: 'informal', label: 'Informal' },
          ]}
        />
        {playing === null ? (
          <Button size="sm" variant="tinted" onClick={() => playAll()} disabled={!shown.length}>
            <Play size={14} fill="currentColor" /> Escuchar {shown.length}
          </Button>
        ) : (
          <Button size="sm" variant="gray" onClick={stop}>
            <Square size={12} fill="currentColor" /> Detener
          </Button>
        )}
      </div>
      <div className="mt-4 space-y-5">
        {groups.map((g) => (
          <div key={g.id}>
            {cat === 'all' && (
              <h4 className="text-label-2 mb-2 text-[13px] font-semibold tracking-wide uppercase">
                <span aria-hidden>{g.e}</span> {g.label}
              </h4>
            )}
            <ul className="divide-separator bg-fill-2 divide-y overflow-hidden rounded-[14px]">
              {g.items.map((it) => {
                const k = shown.indexOf(it);
                return (
                  <li key={it.en + it.es} className={cn('flex items-start gap-2 px-3 py-2.5 transition-colors', playing === k && 'bg-[color-mix(in_srgb,var(--yellow)_22%,transparent)]')}>
                    <SpeakButton text={it.en.replace(/\s*\/\s*/g, '. ')} size={16} className="-mt-0.5 shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="text-[15px] font-semibold">{it.en}</span>
                        <RegTag reg={it.reg} />
                      </div>
                      <div className="text-label-2 text-[14px]">{it.es}</div>
                      {it.note && <div className="text-label-2 mt-0.5 text-[12px] italic">{it.note}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
        {!groups.length && <p className="text-label-2 text-[14px]">No hay expresiones con ese filtro.</p>}
      </div>
    </Section>
  );
}

// --------------------------------------------------------------- formula ----

const ROLES: Record<string, { label: string; color?: string }> = {
  wh: { label: 'Palabra WH', color: 'var(--purple)' },
  be: { label: 'Be / auxiliar', color: 'var(--orange)' },
  subj: { label: 'Sujeto', color: 'var(--blue)' },
  neg: { label: 'Negación', color: 'var(--red)' },
  verb: { label: 'Verbo', color: 'var(--green)' },
  own: { label: 'Dueño / determinante', color: 'var(--teal)' },
  thing: { label: 'Cosa / sustantivo', color: 'var(--indigo)' },
  rest: { label: 'Resto' },
};

const sentence = (parts: [string, string][]) =>
  parts
    .map(([w]) => w)
    .join(' ')
    .replace(/\s+([.?!,])/g, '$1')
    .replace(/\s+'/g, "'");

/** Colour-coded sentence patterns; tap a row to hear it. */
export function FormulaBlock({ b }: { b: CourseBlock }) {
  const rows = arr<{ parts: [string, string][]; es?: string }>(b.rows);
  const used = [...new Set(rows.flatMap((r) => r.parts.map((p) => p[1])))].filter((r) => r !== 'p' && ROLES[r]);
  return (
    <Section b={b}>
      <div className="mb-4 flex flex-wrap gap-1.5">
        {used.map((r) => {
          const c = ROLES[r]!.color;
          return (
            <span key={r} className={cn('rounded-full px-2.5 py-0.5 text-[12px] font-semibold', !c && 'bg-fill text-label-2')} style={c ? { background: tint(c, 14), color: ink(c) } : undefined}>
              {ROLES[r]!.label}
            </span>
          );
        })}
      </div>
      <ul className="space-y-2.5">
        {rows.map((r, i) => (
          <li key={i}>
            <button type="button" onClick={() => speak(sentence(r.parts))} className="hover:bg-fill-2 group flex w-full items-start gap-2 rounded-[14px] p-1.5 text-left transition-colors">
              <Volume2 size={16} className="text-ink-blue mt-2 shrink-0 opacity-70 group-hover:opacity-100" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  {r.parts.map(([w, role], k) => {
                    if (role === 'p') return <span key={k} className="-ml-1 text-[18px] font-bold">{w}</span>;
                    const c = ROLES[role]?.color;
                    return (
                      <span
                        key={k}
                        className={cn('rounded-[9px] px-2.5 py-1 text-[16px] font-semibold', !c && 'bg-fill text-label')}
                        style={c ? { background: tint(c, 16), color: ink(c), boxShadow: `inset 0 -2px 0 ${tint(c, 45)}` } : undefined}
                      >
                        {w}
                      </span>
                    );
                  })}
                </span>
                <Es text={r.es} className="mt-1 pl-0.5" />
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Section>
  );
}

// --------------------------------------------------------------- speller ----

const SYMBOL_NAMES: Record<string, string> = {
  '@': 'at', '.': 'dot', ',': 'comma', '_': 'underscore', '-': 'dash', '/': 'slash', ':': 'colon', ';': 'semicolon',
  '!': 'exclamation mark', '?': 'question mark', '#': 'hashtag', '&': 'ampersand', '*': 'asterisk', '+': 'plus',
  '=': 'equals', '%': 'percent', '$': 'dollar sign', "'": 'apostrophe', '"': 'quotation mark', '(': 'open bracket', ')': 'close bracket', ' ': 'space',
};

/** "Anna_88@mail.com" → ["capital A", "double N", "A", "underscore", "eight", "eight", "at", …] */
export function spellOut(text: string): string[] {
  const out: string[] = [];
  const chars = [...text];
  let i = 0;
  while (i < chars.length) {
    const c = chars[i]!;
    let run = 1;
    while (chars[i + run] === c) run++;
    if (/[a-z]/i.test(c)) {
      const name = c.toUpperCase();
      const cap = c !== c.toLowerCase() && /[a-z]/.test(text) ? 'capital ' : '';
      if (run === 2) out.push(`${cap}double ${name}`);
      else for (let k = 0; k < run; k++) out.push(cap + name);
    } else if (/\d/.test(c)) {
      for (let k = 0; k < run; k++) out.push(c === '0' ? 'zero' : cardinal(Number(c)));
    } else {
      for (let k = 0; k < run; k++) out.push(SYMBOL_NAMES[c] ?? c);
    }
    i += run;
  }
  return out;
}

export function SpellerBlock({ b }: { b: CourseBlock }) {
  const samples = arr<string>(b.samples);
  const [text, setText] = useState(samples[0] ?? 'Valentina');
  const tokens = useMemo(() => spellOut(text.slice(0, 60)), [text]);
  const say = () => speak(tokens.join(', '), { rate: 0.8 });
  return (
    <Section b={b}>
      <div className="flex gap-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          aria-label="Texto para deletrear"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={60}
          className="bg-fill-2 h-11 min-w-0 flex-1 rounded-[12px] px-3 text-[16px] font-medium outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--blue)_40%,transparent)]"
        />
        <Button onClick={say} disabled={!tokens.length}>
          <Volume2 size={16} /> Deletrear
        </Button>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {samples.map((s) => (
          <button key={s} type="button" onClick={() => setText(s)} className="bg-fill-2 hover:bg-fill rounded-full px-3 py-1 text-[13px] break-all">
            {s}
          </button>
        ))}
      </div>
      {tokens.length > 0 && (
        <div className="bg-fill-2 mt-4 flex flex-wrap gap-1.5 rounded-[14px] p-3">
          {tokens.map((t, k) => (
            <button
              key={k}
              type="button"
              onClick={() => speak(t)}
              className={cn(
                'bg-card rounded-[9px] px-2.5 py-1 text-[14px] font-semibold shadow-card',
                /capital|double/.test(t) && 'text-ink-orange',
                t.length > 2 && !/capital|double/.test(t) && 'text-ink-indigo',
              )}
            >
              {t}
            </button>
          ))}
        </div>
      )}
    </Section>
  );
}

// ----------------------------------------------------------------- scene ----

const SETS = [
  { id: 'class', label: 'Clase', items: { ns: ['📕', 'book', 'libro'], np: ['✏️', 'pencils', 'lápices'], fs: ['🕰️', 'clock', 'reloj'], fp: ['🪑', 'chairs', 'sillas'] } },
  { id: 'street', label: 'Calle', items: { ns: ['🐶', 'dog', 'perro'], np: ['🌷', 'flowers', 'flores'], fs: ['🚌', 'bus', 'bus'], fp: ['🌳', 'trees', 'árboles'] } },
  { id: 'clothes', label: 'Ropa', items: { ns: ['🧢', 'cap', 'gorra'], np: ['👟', 'sneakers', 'tenis'], fs: ['🧥', 'jacket', 'chaqueta'], fp: ['👗', 'dresses', 'vestidos'] } },
  { id: 'food', label: 'Comida', items: { ns: ['☕', 'coffee', 'café'], np: ['🍌', 'bananas', 'bananos'], fs: ['🍕', 'pizza', 'pizza'], fp: ['🥭', 'mangoes', 'mangos'] } },
] as const;

type Slot = 'ns' | 'np' | 'fs' | 'fp';
const DEM: Record<Slot, { dem: string; be: string; es: string }> = {
  ns: { dem: 'This', be: 'is', es: 'Este / esta (cerca, uno)' },
  np: { dem: 'These', be: 'are', es: 'Estos / estas (cerca, varios)' },
  fs: { dem: 'That', be: 'is', es: 'Ese / aquel (lejos, uno)' },
  fp: { dem: 'Those', be: 'are', es: 'Esos / aquellos (lejos, varios)' },
};

const line = (slot: Slot, word: string) => {
  const d = DEM[slot];
  const plural = slot.endsWith('p');
  const art = plural ? '' : /^[aeiou]/.test(word) ? 'an ' : word === 'coffee' || word === 'pizza' ? '' : 'a ';
  return `${d.dem} ${d.be} ${art}${word}.`;
};

/** Near / far × one / many: tap an object to hear the demonstrative. */
export function SceneBlock({ b }: { b: CourseBlock }) {
  const [set, setSet] = useState<(typeof SETS)[number]['id']>('class');
  const [sel, setSel] = useState<Slot>('ns');
  const s = SETS.find((x) => x.id === set)!;
  const tap = (slot: Slot) => {
    setSel(slot);
    speak(line(slot, s.items[slot][1]));
  };
  const tile = (slot: Slot) => {
    const [e, , es] = s.items[slot];
    const far = slot.startsWith('f');
    const many = slot.endsWith('p');
    return (
      <button
        type="button"
        onClick={() => tap(slot)}
        aria-label={line(slot, s.items[slot][1])}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-[16px] p-3 transition-all active:scale-95',
          far ? 'min-h-[92px]' : 'min-h-[120px]',
          sel === slot ? 'ring-ios-blue bg-card shadow-card ring-2' : 'bg-card/60 hover:bg-card',
        )}
      >
        <span className={cn('leading-none tracking-tight whitespace-nowrap', far ? (many ? 'text-[18px] opacity-80' : 'text-[26px] opacity-80') : many ? 'text-[28px]' : 'text-[46px]')} aria-hidden>
          {many ? `${e}${e}${e}` : e}
        </span>
        <span className="text-label-2 mt-2 text-[12px]">{es}</span>
      </button>
    );
  };
  const word = s.items[sel][1];
  return (
    <Section b={b}>
      <Segmented size="sm" value={set} onChange={setSet} options={SETS.map((x) => ({ value: x.id, label: x.label }))} />
      <div className="mt-4 overflow-hidden rounded-[20px] bg-gradient-to-b from-[color-mix(in_srgb,var(--blue)_14%,transparent)] to-[color-mix(in_srgb,var(--green)_14%,transparent)] p-3">
        <div className="text-label-2 mb-1 grid grid-cols-[64px_1fr_1fr] gap-2 text-center text-[12px] font-semibold tracking-wide uppercase">
          <span />
          <span>Uno</span>
          <span>Varios</span>
        </div>
        <div className="grid grid-cols-[64px_1fr_1fr] items-center gap-2">
          <span className="text-center text-[12px] font-semibold">
            <span className="block text-[20px]" aria-hidden>🔭</span>
            <span className="text-ink-purple">there</span>
          </span>
          {tile('fs')}
          {tile('fp')}
          <span className="text-center text-[12px] font-semibold">
            <span className="block text-[24px]" aria-hidden>🙋</span>
            <span className="text-ink-blue">here</span>
          </span>
          {tile('ns')}
          {tile('np')}
        </div>
      </div>
      <div className="bg-fill-2 mt-4 flex items-center gap-3 rounded-[14px] p-4">
        <SpeakButton text={line(sel, word)} />
        <div className="min-w-0">
          <div className="text-[20px] font-bold">
            <span className={sel.startsWith('n') ? 'text-ink-blue' : 'text-ink-purple'}>{DEM[sel].dem}</span> {line(sel, word).split(' ').slice(1).join(' ')}
          </div>
          <div className="text-label-2 text-[13px]">{DEM[sel].es}</div>
        </div>
      </div>
      {str(b.note) && <p className="text-label-2 mt-3 text-[14px]">{str(b.note)}</p>}
    </Section>
  );
}
