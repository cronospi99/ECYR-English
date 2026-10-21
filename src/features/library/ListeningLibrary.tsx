import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Check, Eye, EyeOff, Play, Volume2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip, LevelChip, PageLoader } from '@/components/ui/Misc';
import { Segmented } from '@/components/ui/Segmented';
import { QuestionSet, questionsToSections } from '@/components/learning/QuestionSet';
import { PdfButton } from '@/components/learning/PdfButton';
import { useAsync } from '@/hooks/useAsync';
import { checkTyped, loadLibTracks, type LibTrack } from '@/content/library';
import { CEFR_LEVELS, type CefrLevel } from '@/content/types';
import { useProgress } from '@/store/progress';
import { speakAs } from '@/lib/speech';
import { sequencePlayer } from '@/lib/tts/seekable';
import { AudioScrubber, usePlayer, usePlayerState } from '@/components/learning/AudioScrubber';
import type { Worksheet } from '@/lib/worksheet';
import { cn } from '@/lib/cn';
import { ink } from '@/lib/color';

const KIND_ES: Record<string, string> = {
  dialogue: 'Diálogo',
  conversation: 'Conversación',
  monologue: 'Monólogo',
  voicemail: 'Mensaje de voz',
  announcement: 'Anuncio',
  interview: 'Entrevista',
  podcast: 'Podcast',
  'phone-call': 'Llamada',
  news: 'Noticias',
  'radio-report': 'Reportaje',
  instructions: 'Instrucciones',
  lecture: 'Clase',
  debate: 'Debate',
  tour: 'Visita guiada',
  seminar: 'Seminario',
};
const SPEAKER_COLORS = ['var(--blue)', 'var(--orange)', 'var(--purple)', 'var(--green)'];
const words = (t: LibTrack) => t.lines.reduce((n, l) => n + l.text.split(/\s+/).length, 0);

export function ListeningLibrary() {
  const { data, loading } = useAsync(loadLibTracks, []);
  const [params, setParams] = useSearchParams();
  const [level, setLevel] = useState<CefrLevel | 'all'>('all');
  const activity = useProgress((s) => s.activity);
  if (loading || !data) return <PageLoader />;
  const open = data.find((t) => t.id === params.get('track'));
  if (open) return <Player t={open} onBack={() => setParams({})} />;
  const doneIds = new Set(activity.filter((a) => a.ref?.startsWith('listening:lib-')).map((a) => a.ref!.slice(14)));
  const list = data.filter((t) => level === 'all' || t.level === level);

  return (
    <div>
      <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-1">
        <Chip active={level === 'all'} onClick={() => setLevel('all')}>
          Todos · {data.length}
        </Chip>
        {CEFR_LEVELS.filter((l) => data.some((t) => t.level === l)).map((l) => (
          <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
            {l}
          </Chip>
        ))}
      </div>
      {!data.length && <p className="text-label-2">Los audios se están preparando.</p>}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {list.map((t, i) => (
          <TrackCard key={t.id} t={t} i={i} done={doneIds.has(t.id)} onOpen={() => setParams({ track: t.id })} />
        ))}
      </div>
    </div>
  );
}

/** A track in a list: emoji, level, kind, length and focus. */
export function TrackCard({ t, i, done, onOpen }: { t: LibTrack; i: number; done: boolean; onOpen: () => void }) {
  return (
    <motion.button
      type="button"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(i * 0.015, 0.4) }}
      onClick={onOpen}
      className="bg-card shadow-card flex items-start gap-3 rounded-[18px] p-4 text-left transition-transform active:scale-[0.99]"
    >
      <span className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] text-[26px]" style={{ background: 'color-mix(in srgb, var(--skill-listening) 16%, transparent)' }}>
        {t.emoji}
        <span className="bg-card absolute -right-1 -bottom-1 flex h-5 w-5 items-center justify-center rounded-full shadow">
          <Play size={10} fill="currentColor" className="text-ink-blue" />
        </span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex flex-wrap items-center gap-1.5">
          <LevelChip level={t.level} />
          <span className="text-label-2 text-[12px] font-semibold">{KIND_ES[t.kind] ?? t.kind}</span>
          {done && <span className="text-ink-green text-[12px] font-semibold">✓</span>}
        </span>
        <span className="mt-1 block text-[16px] leading-snug font-bold">{t.title}</span>
        <span className="text-label-2 mt-0.5 block text-[12.5px]">
          {t.topic} · {t.speakers.length === 1 ? '1 voz' : `${t.speakers.length} voces`} · ~{Math.max(1, Math.round(words(t) / 140))} min
        </span>
        {t.focus && <span className="text-ink-indigo mt-1 block text-[12px] font-semibold">🎯 {t.focus}</span>}
      </span>
    </motion.button>
  );
}

export function trackSheet(t: LibTrack): Worksheet {
  return {
    title: t.title,
    subtitle: `Listening · ${t.level} · ${t.topic}`,
    level: t.level,
    intro: `Listen to the track in ECYR English (Práctica → Listening → Biblioteca → "${t.title}"), then answer. You can listen twice.`,
    sections: [
      ...questionsToSections(t.questions),
      ...(t.dictation?.length ? [{ kind: 'write' as const, title: 'Dictation: write what you hear', items: t.dictation.map((d) => ({ q: '', answer: d })), lines: 2 }] : []),
    ],
    credits: 'Audio y guion originales de ECYR English.',
  };
}

function Player({ t, onBack }: { t: LibTrack; onBack: () => void }) {
  return <TrackPlayer t={t} onBack={onBack} backLabel="Biblioteca" />;
}

/**
 * One listening track: the scrubbable player (header), the transcript with
 * the line being heard highlighted (a tap on a line jumps there), and the
 * questions / dictation. Shared by the library and the unit listenings.
 */
export function TrackPlayer({ t, onBack, backLabel }: { t: LibTrack; onBack: () => void; backLabel: string }) {
  const [show, setShow] = useState(false);
  const [plays, setPlays] = useState(0);
  const [mode, setMode] = useState<'questions' | 'dictation'>('questions');
  const award = useProgress((s) => s.award);
  // The whole track in one go: each speaker keeps a distinct voice, the next segment loads while one plays.
  const player = usePlayer(
    () => sequencePlayer(t.lines.map((l) => ({ text: l.text, speaker: t.speakers[l.s] ?? t.speakers[0]! })), { gapMs: 280 }),
    [t],
  );
  const ps = usePlayerState(player);
  const line = ps.status === 'idle' ? -1 : ps.line;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <Button variant="plain" onClick={onBack}>
          <ArrowLeft size={16} /> {backLabel}
        </Button>
        <PdfButton build={() => trackSheet(t)} />
      </div>
      <Card className="overflow-hidden">
        <div className="p-5 text-white sm:p-6" style={{ background: 'linear-gradient(135deg, var(--skill-listening), color-mix(in srgb, var(--skill-listening) 50%, #5b2bd9))' }}>
          <div className="flex items-center gap-2 text-[13px] font-semibold opacity-90">
            <span className="rounded-full bg-white/20 px-2 py-0.5">{t.level}</span> {KIND_ES[t.kind] ?? t.kind} · {t.topic}{t.focus ? ` · 🎯 ${t.focus}` : ''}
          </div>
          <h2 className="mt-2 text-[26px] leading-tight font-extrabold">
            {t.emoji} {t.title}
          </h2>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {t.speakers.map((s, i) => (
              <span key={i} className="rounded-full bg-white/18 px-2.5 py-0.5 text-[12.5px]">
                {s.name} · {s.accent.toUpperCase()}
              </span>
            ))}
          </div>
          <AudioScrubber
            className="mt-5"
            player={player}
            tone="onColor"
            restart
            label={`Posición en "${t.title}"`}
            onPlay={(before) => (before.status === 'idle' || before.status === 'ended' || before.time < 0.3) && setPlays((n) => n + 1)}
            right={
              <span>
                {line < 0 ? `${t.lines.length} intervenciones` : `${line + 1} / ${t.lines.length}`} · escuchado {plays}×
              </span>
            }
          />
        </div>
        <div className="p-4 sm:p-5">
          <Button variant="gray" size="sm" onClick={() => setShow((x) => !x)}>
            {show ? <EyeOff size={15} /> : <Eye size={15} />} {show ? 'Ocultar transcripción' : 'Ver transcripción'}
          </Button>
          {show && (
            <div className="mt-3 space-y-1">
              {t.lines.map((l, i) => {
                const color = SPEAKER_COLORS[l.s % SPEAKER_COLORS.length]!;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => player.seek(player.lineStart?.(i) ?? 0)}
                    aria-current={line === i || undefined}
                    title="Escuchar desde aquí"
                    className={cn('flex w-full gap-2 rounded-[12px] px-3 py-2 text-left transition-colors', line === i ? 'bg-fill-2' : 'hover:bg-fill-2')}
                    style={line === i ? { boxShadow: `inset 3px 0 0 ${color}` } : undefined}
                  >
                    <span className="w-20 shrink-0 truncate text-[13px] font-bold" style={{ color: ink(color) }}>
                      {t.speakers[l.s]?.name}
                    </span>
                    <span className="flex-1 text-[15px] leading-snug">{l.text}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </Card>

      <div className="mt-6 mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[20px] font-bold">Actividades</h3>
        {t.dictation?.length ? (
          <Segmented
            size="sm"
            value={mode}
            onChange={setMode}
            options={[
              { value: 'questions', label: 'Preguntas' },
              { value: 'dictation', label: 'Dictado' },
            ]}
          />
        ) : null}
      </div>
      {mode === 'questions' ? (
        <QuestionSet
          questions={t.questions}
          color="var(--skill-listening)"
          onChecked={(right, total) =>
            award({ kind: 'listening', title: `Listening: ${t.title}`, skill: 'listening', xp: 6 + right, score: Math.round((right / total) * 100), level: t.level, ref: `listening:lib-${t.id}` })
          }
        />
      ) : (
        <Dictation t={t} />
      )}
    </div>
  );
}

function Dictation({ t }: { t: LibTrack }) {
  const items = t.dictation ?? [];
  const [vals, setVals] = useState(() => items.map(() => ''));
  const [checked, setChecked] = useState(false);
  const speakerOf = (sentence: string) => t.speakers[t.lines.find((l) => l.text.includes(sentence))?.s ?? 0] ?? t.speakers[0]!;
  return (
    <div className="space-y-3">
      {items.map((d, i) => {
        const v = checkTyped(vals[i]!, d);
        return (
          <Card key={i} className="p-4">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="tinted" onClick={() => speakAs(d, speakerOf(d), { rate: 0.85 })}>
                <Volume2 size={15} /> Frase {i + 1}
              </Button>
              {checked && (v === 'wrong' ? <X className="text-ink-red" size={18} /> : <Check className="text-ink-green" size={18} />)}
            </div>
            <textarea
              value={vals[i]}
              onChange={(e) => setVals((s) => s.map((x, k) => (k === i ? e.target.value : x)))}
              rows={2}
              placeholder="Escribe lo que escuchas…"
              className="bg-fill-2 placeholder:text-label-3 mt-2 w-full resize-none rounded-[10px] px-3 py-2 text-[15px] outline-none"
            />
            {checked && v !== 'right' && <p className="text-label-2 mt-1 text-[14px]">✓ {d}</p>}
          </Card>
        );
      })}
      <Button onClick={() => setChecked(true)} disabled={vals.every((v) => !v.trim())}>
        <Check size={16} /> Comprobar
      </Button>
    </div>
  );
}
