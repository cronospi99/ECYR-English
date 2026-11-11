import { useEffect, useState } from 'react';
import { Check, Clock, RotateCcw } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { CefrLevel } from '@/content/types';
import { useProgress } from '@/store/progress';
import { fmtClock, fmtDuration, type PodcastEpisode } from '@/lib/podcasts';
import type { Worksheet } from '@/lib/worksheet';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';

// ------------------------------------------------------------------ levels --

interface GuideLevel {
  plan: string[];
  predictions: number;
  expect: string;
  whileTask: string;
  ideasHint: string;
  summary: string;
  extra?: { q: string; lines: number };
  checks: string[];
}

const BASE_CHECKS = ['Entendí de qué trata el episodio en general.', 'Reconocí palabras clave sin pausar el audio.', 'Aprendí al menos 5 palabras o expresiones nuevas.'];

const GUIDE: Record<CefrLevel, GuideLevel> = {
  A1: {
    plan: [
      'Escucha 1: solo escucha a 0,75×, sin escribir. Relájate: no tienes que entender todo.',
      'Escucha 2: anota las palabras que reconoces (números, nombres, lugares).',
      'Escucha 3: comprueba tus notas. Usa ⟲10 para repetir partes difíciles.',
    ],
    predictions: 1,
    expect: 'Escribe 3 palabras en inglés que crees que vas a escuchar.',
    whileTask: 'Anota palabras sueltas que entiendas. Toca "Marcar minuto" para guardar el momento exacto.',
    ideasHint: 'Puedes escribir en español o con palabras sueltas en inglés.',
    summary: '¿De qué trata? Una frase (en español o en inglés sencillo).',
    checks: [...BASE_CHECKS, 'Puedo decir el tema en inglés con 3–5 palabras.'],
  },
  A2: {
    plan: [
      'Escucha 1: a 0,9× para captar el tema general.',
      'Escucha 2: toma notas de palabras clave y ejemplos.',
      'Escucha 3 (opcional): a velocidad normal para comprobar.',
    ],
    predictions: 2,
    expect: 'Escribe 5 palabras en inglés que esperas escuchar.',
    whileTask: 'Anota palabras clave, ejemplos y números. Marca el minuto de lo que no entiendas para repetirlo.',
    ideasHint: 'Frases cortas en inglés; si no sabes una palabra, escríbela en español.',
    summary: 'Resume el episodio en 1–2 frases en inglés sencillo.',
    checks: [...BASE_CHECKS, 'Puedo contar una idea principal en inglés.'],
  },
  B1: {
    plan: ['Escucha 1: a velocidad normal, para la idea general.', 'Escucha 2: pausa para tomar notas de detalles y ejemplos.'],
    predictions: 2,
    expect: 'Escribe 5 palabras o expresiones que esperas escuchar.',
    whileTask: 'Toma notas de ideas, ejemplos y expresiones útiles con su minuto.',
    ideasHint: 'Escribe en inglés, con tus propias palabras.',
    summary: 'Resume el episodio en 2–3 frases en inglés.',
    extra: { q: '¿Estás de acuerdo con algo que se dijo? Explica por qué en 2–3 frases en inglés.', lines: 3 },
    checks: [...BASE_CHECKS, 'Puedo contar las ideas principales en inglés.', 'Entendí los ejemplos que dieron.'],
  },
  B2: {
    plan: [
      'Listen 1: at normal speed, no pauses, for the main idea and the tone.',
      'Listen 2: note details, opinions and how they justify them.',
    ],
    predictions: 2,
    expect: 'Write 5 words, collocations or expressions you expect to hear.',
    whileTask: 'Tell facts from opinions. Note idiomatic expressions with their minute.',
    ideasHint: 'In English; include at least one detail or example per idea.',
    summary: 'Summarise the episode in 3–4 sentences in English, as if for a classmate who didn’t listen to it.',
    extra: { q: 'What does the speaker think and how do you know? What is your opinion? (60–80 words in English)', lines: 4 },
    checks: [...BASE_CHECKS, 'I identified the speakers’ opinion or attitude.', 'I can explain the main arguments in English.'],
  },
  C1: {
    plan: ['Listen 1: at 1× or 1.25×, straight through, like a real podcast.', 'Listen 2: go back to the key fragments and analyse the language and the arguments.'],
    predictions: 2,
    expect: 'Write 5 advanced expressions or terms on the topic that you expect to hear.',
    whileTask: 'Note arguments, nuances, humour or irony, and idiomatic expressions with their minute.',
    ideasHint: 'In English, precisely: ideas, nuances and evidence.',
    summary: 'Write a 60–80 word summary in English with the ideas and how they connect.',
    extra: { q: 'Critical response (80–120 words): how convincing was it? What was missing or what would you add?', lines: 5 },
    checks: [
      ...BASE_CHECKS,
      'I caught nuances: humour, irony, register or accent.',
      'I can summarise and critique the arguments in English.',
      'I understood without needing the slow speed.',
    ],
  },
  C2: {
    plan: ['Listen 1: at 1.25× or 1.5×, no pauses, like an expert speaker.', 'Listen 2: analyse rhetoric, irony, implicatures and register; compare it with another source.'],
    predictions: 2,
    expect: 'Write 5 idioms, collocations or technical terms you expect to hear.',
    whileTask: 'Note each speaker’s stance, what is hinted without being said, and the expressions with their minute.',
    ideasHint: 'In English, precisely and concisely: thesis, nuances, evidence and tone.',
    summary: 'Write an 80–100 word summary in English that synthesises and evaluates the ideas.',
    extra: { q: 'Critical evaluation (120–160 words): what assumptions does the argument make? How would you rebut it?', lines: 6 },
    checks: [...BASE_CHECKS, 'I caught implicatures, irony and changes of register.', 'I can critically evaluate the arguments in English.', 'I understood at real speed, with varied accents.'],
  },
};

// ------------------------------------------------------------------- notes --

interface Notes {
  predict: string[];
  expect: string;
  from: string;
  to: string;
  notes: string;
  ideas: string[];
  words: [string, string][];
  summary: string;
  extra: string;
  checks: boolean[];
}

const emptyNotes = (g: GuideLevel): Notes => ({
  predict: Array<string>(g.predictions).fill(''),
  expect: '',
  from: '',
  to: '',
  notes: '',
  ideas: ['', '', ''],
  words: Array.from({ length: 5 }, () => ['', ''] as [string, string]),
  summary: '',
  extra: '',
  checks: g.checks.map(() => false),
});

const notesKey = (ep: PodcastEpisode, level: CefrLevel) => `ecyr:podcasts:notes:${ep.key}:${level}`;

function loadNotes(ep: PodcastEpisode, level: CefrLevel): Notes {
  const g = GUIDE[level];
  const base = emptyNotes(g);
  try {
    const raw = JSON.parse(localStorage.getItem(notesKey(ep, level)) ?? 'null') as Partial<Notes> | null;
    if (!raw) return base;
    return {
      ...base,
      ...raw,
      predict: base.predict.map((_, i) => raw.predict?.[i] ?? ''),
      ideas: base.ideas.map((_, i) => raw.ideas?.[i] ?? ''),
      words: base.words.map((_, i) => [raw.words?.[i]?.[0] ?? '', raw.words?.[i]?.[1] ?? ''] as [string, string]),
      checks: base.checks.map((_, i) => !!raw.checks?.[i]),
    };
  } catch {
    return base;
  }
}

// --------------------------------------------------------------------- UI --

const COLOR = 'var(--skill-listening)';
const field =
  'bg-fill-2 placeholder:text-label-3 w-full rounded-[10px] px-3 py-2 text-[15px] outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--blue)_40%,transparent)]';

/**
 * A guided listening worksheet for any episode — always available, no AI
 * needed: before / while / after listening, plus a self-check. Notes are kept
 * in this browser as a draft.
 */
export function ListeningGuide({ ep, level, now }: { ep: PodcastEpisode; level: CefrLevel; now: () => number }) {
  const g = GUIDE[level];
  const [n, setN] = useState<Notes>(() => loadNotes(ep, level));
  const [done, setDone] = useState(false);
  const award = useProgress((s) => s.award);
  const long = ep.durationMs > 20 * 60000;

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(notesKey(ep, level), JSON.stringify(n));
      } catch {
        /* storage full or unavailable */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [n, ep, level]);

  const set = (p: Partial<Notes>) => {
    setN((s) => ({ ...s, ...p }));
    setDone(false);
  };
  const ideas = n.ideas.filter((x) => x.trim()).length;
  const words = n.words.filter(([en]) => en.trim()).length;
  const checks = n.checks.filter(Boolean).length;

  const finish = () => {
    setDone(true);
    const score = Math.round(((ideas / 3) * 0.4 + (Math.min(words, 5) / 5) * 0.3 + (checks / g.checks.length) * 0.3) * 100);
    award({
      kind: 'listening',
      title: `Podcast: ${ep.title}`.slice(0, 120),
      skill: 'listening',
      xp: 6 + ideas + Math.min(words, 5),
      score,
      level,
      ref: `listening:podcast-${ep.collectionId}-${ep.trackId}-guide`,
    });
  };

  return (
    <div className="space-y-4">
      <Step n={1} title="Before listening">
        <p className="text-label-2 text-[14px]">Read the episode’s title and description.</p>
        <Label>{g.predictions === 1 ? 'What do you think it is about? Write a prediction.' : `What do you think it is about? Write ${g.predictions} predictions.`}</Label>
        {n.predict.map((v, i) => (
          <input key={i} value={v} onChange={(e) => set({ predict: n.predict.map((x, k) => (k === i ? e.target.value : x)) })} placeholder={`Prediction ${i + 1}…`} className={cn(field, 'mt-2')} />
        ))}
        <Label>{g.expect}</Label>
        <input value={n.expect} onChange={(e) => set({ expect: e.target.value })} placeholder="word, word, word…" autoCapitalize="off" className={cn(field, 'mt-2')} />
      </Step>

      <Step n={2} title="While listening">
        <ul className="text-label-2 list-disc space-y-1 pl-5 text-[14px] leading-snug">
          {g.plan.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
        {long && (
          <div className="mt-3">
            <Label>This episode lasts {fmtDuration(ep.durationMs)}: pick a 5–10 minute fragment.</Label>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-[14px]">
              From
              <TimeField value={n.from} onChange={(from) => set({ from })} now={now} label="Fragment start" />
              hasta
              <TimeField value={n.to} onChange={(to) => set({ to })} now={now} label="Fragment end" />
            </div>
          </div>
        )}
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
          <Label className="mt-0">Notes</Label>
          <Button
            size="sm"
            variant="tinted"
            onClick={() => {
              const stamp = `[${fmtClock(now())}] `;
              set({ notes: n.notes && !n.notes.endsWith('\n') ? `${n.notes}\n${stamp}` : `${n.notes}${stamp}` });
            }}
          >
            <Clock size={14} /> Mark minute
          </Button>
        </div>
        <p className="text-label-2 mt-1 text-[13px]">{g.whileTask}</p>
        <textarea value={n.notes} onChange={(e) => set({ notes: e.target.value })} rows={5} placeholder="[2:15] weather — rainy season…" className={cn(field, 'mt-2 resize-y')} />
      </Step>

      <Step n={3} title="After listening">
        <Label>Escribe 3 ideas principales</Label>
        <p className="text-label-2 text-[13px]">{g.ideasHint}</p>
        {n.ideas.map((v, i) => (
          <input key={i} value={v} onChange={(e) => set({ ideas: n.ideas.map((x, k) => (k === i ? e.target.value : x)) })} placeholder={`Idea ${i + 1}…`} className={cn(field, 'mt-2')} />
        ))}

        <Label>5 new words</Label>
        <p className="text-label-2 text-[13px]">The word or expression in English and what it means (look it up if needed).</p>
        <div className="mt-1 space-y-2">
          {n.words.map(([en, es], i) => (
            <div key={i} className="grid grid-cols-2 gap-2">
              <input
                value={en}
                onChange={(e) => set({ words: n.words.map((w, k) => (k === i ? [e.target.value, w[1]] : w)) })}
                placeholder={`Palabra ${i + 1}`}
                aria-label={`New word ${i + 1} in English`}
                autoCapitalize="off"
                className={field}
              />
              <input
                value={es}
                onChange={(e) => set({ words: n.words.map((w, k) => (k === i ? [w[0], e.target.value] : w)) })}
                placeholder="Meaning"
                aria-label={`Meaning of word ${i + 1}`}
                className={field}
              />
            </div>
          ))}
        </div>

        <Label>{g.summary}</Label>
        <textarea value={n.summary} onChange={(e) => set({ summary: e.target.value })} rows={3} className={cn(field, 'mt-2 resize-y')} />
        {g.extra && (
          <>
            <Label>{g.extra.q}</Label>
            <textarea value={n.extra} onChange={(e) => set({ extra: e.target.value })} rows={g.extra.lines} className={cn(field, 'mt-2 resize-y')} />
          </>
        )}
      </Step>

      <Step n={4} title="Self-assessment">
        <div className="space-y-2">
          {g.checks.map((c, i) => {
            const on = n.checks[i];
            return (
              <button
                key={c}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => set({ checks: n.checks.map((x, k) => (k === i ? !x : x)) })}
                className={cn('flex w-full items-start gap-2.5 rounded-[12px] px-3 py-2.5 text-left text-[14.5px] leading-snug transition-colors', on ? '' : 'bg-fill-2')}
                style={on ? { background: tint(COLOR, 16) } : undefined}
              >
                <span
                  className={cn('mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-[6px] border-2', on ? 'border-transparent text-white' : 'border-label-3')}
                  style={on ? { background: 'var(--green)' } : undefined}
                >
                  {on && <Check size={13} strokeWidth={3} />}
                </span>
                {c}
              </button>
            );
          })}
        </div>
        <p className="text-label-2 mt-3 text-[13px]">
          {checks < g.checks.length / 2
            ? 'Tip: listen again at a lower speed or pick a shorter episode.'
            : checks === g.checks.length
              ? 'Excellent! Try an episode from a higher level.'
              : 'You’re doing well: repeat the fragments you marked and review your new words.'}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Button onClick={finish} disabled={!ideas && !checks}>
            <Check size={16} /> I finished the guide
          </Button>
          <Button variant="gray" onClick={() => (setN(emptyNotes(g)), setDone(false))}>
            <RotateCcw size={15} /> Clear
          </Button>
          {done && <span className="text-ink-green text-[14px] font-semibold">Saved to your progress! 🎧</span>}
        </div>
      </Step>
      <p className="text-label-2 px-1 text-[12px]">Your notes are saved as a draft on this device.</p>
    </div>
  );
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <Card className="p-4 sm:p-5">
      <div className="mb-2 flex items-center gap-2.5">
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-bold" style={{ background: tint(COLOR, 16), color: ink(COLOR) }}>
          {n}
        </span>
        <h4 className="text-[17px] font-bold">{title}</h4>
      </div>
      {children}
    </Card>
  );
}

function Label({ children, className }: { children: React.ReactNode; className?: string }) {
  return <div className={cn('mt-4 text-[14.5px] font-semibold', className)}>{children}</div>;
}

function TimeField({ value, onChange, now, label }: { value: string; onChange: (v: string) => void; now: () => number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1">
      <input value={value} onChange={(e) => onChange(e.target.value)} placeholder="0:00" aria-label={label} inputMode="numeric" className={cn(field, 'w-20 text-center')} />
      <button type="button" onClick={() => onChange(fmtClock(now()))} className="text-ink-blue text-[13px] font-semibold" aria-label={`${label}: usar el minuto actual`}>
        ahora
      </button>
    </span>
  );
}

// --------------------------------------------------------------------- PDF --

export function guideSheet(ep: PodcastEpisode, level: CefrLevel, showName: string, publisher: string): Worksheet {
  const g = GUIDE[level];
  const long = ep.durationMs > 20 * 60000;
  return {
    title: ep.title,
    subtitle: `Listening · Podcast · ${level} · ${showName}`,
    level,
    intro: `Listen to the episode in ECYR English (Practice → Listening → Podcasts) or on Apple Podcasts${ep.durationMs ? ` (${fmtDuration(ep.durationMs)})` : ''}.`,
    sections: [
      { kind: 'text', title: 'Listening plan', paragraphs: [...g.plan, ...(long ? ['Pick a 5–10 minute fragment and note the start and end minute.'] : [])] },
      {
        kind: 'write',
        title: '1. Before listening',
        items: [...Array.from({ length: g.predictions }, (_, i) => ({ q: `Prediction ${i + 1}: what do you think it is about?` })), { q: g.expect }],
        lines: 1,
      },
      { kind: 'write', title: '2. While you listen: notes with the minute', items: [{ q: g.whileTask }], lines: 6 },
      { kind: 'write', title: '3. After listening: 3 main ideas', items: [{ q: 'Idea 1' }, { q: 'Idea 2' }, { q: 'Idea 3' }], lines: 1 },
      { kind: 'write', title: '5 new words (English → meaning)', items: Array.from({ length: 5 }, (_, i) => ({ q: `${i + 1}. ________________  →  ________________` })), lines: 0 },
      { kind: 'write', title: 'Summary', items: [{ q: g.summary }, ...(g.extra ? [{ q: g.extra.q }] : [])], lines: 3 },
      { kind: 'text', title: '4. Self-assessment (tick what you achieved)', paragraphs: g.checks.map((c) => `[  ]  ${c}`) },
    ],
    credits: `Audio: "${showName}"${publisher ? `, ${publisher}` : ''}, via Apple Podcasts. Third-party content, played from its official source; all rights belong to their authors. ECYR English guide.`,
  };
}
