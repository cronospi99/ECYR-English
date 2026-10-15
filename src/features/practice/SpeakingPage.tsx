import { useEffect, useMemo, useRef, useState } from 'react';
import { Eye, FileAudio, Mic, MicOff, Shuffle, Sparkles, Upload, Volume2 } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip, PageLoader } from '@/components/ui/Misc';
import { useAsync } from '@/hooks/useAsync';
import { loadJeopardy } from '@/content/levels';
import { CEFR_LEVELS, type CefrLevel } from '@/content/types';
import { useProgress } from '@/store/progress';
import { getRecognition, speak } from '@/lib/speech';
import { cn } from '@/lib/cn';
import { MAX_ANSWER_AUDIO, assessSpokenAnswer, isAudioFile, type SpeakingFeedback } from '@/lib/speakingAi';

interface Prompt {
  topic: string;
  cat: string;
  points: number;
  q: string;
  a: string;
}

export default function SpeakingPage() {
  const { data, loading } = useAsync(loadJeopardy, []);
  const [level, setLevel] = useState<CefrLevel>('A1');
  const [topic, setTopic] = useState('all');
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e6));
  const [i, setI] = useState(0);

  const prompts = useMemo<Prompt[]>(() => {
    if (!data) return [];
    const out: Prompt[] = [];
    for (const t of data) {
      if (topic !== 'all' && t.id !== topic) continue;
      const bank = t.q[level] ?? {};
      for (const [key, qs] of Object.entries(bank)) {
        const [ci, pts] = key.split('-');
        for (const [q, a] of qs)
          out.push({
            topic: t.name,
            cat: t.cats[Number(ci)] ?? '',
            points: Number(pts),
            q,
            a,
          });
      }
    }
    return shuffle(out, seed);
  }, [data, level, topic, seed]);

  const p = prompts[i % Math.max(1, prompts.length)];

  return (
    <Page
      back={{ to: '/practice', label: 'Práctica' }}
      title="Speaking"
      subtitle="Responde en voz alta o sube un audio grabado. La IA puede transcribirlo y corregirte."
    >
      {loading || !data ? (
        <PageLoader />
      ) : (
        <>
          <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1 py-1">
            {CEFR_LEVELS.map((l) => (
              <Chip
                key={l}
                active={level === l}
                onClick={() => {
                  setLevel(l);
                  setI(0);
                }}
              >
                {l}
              </Chip>
            ))}
          </div>
          <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 py-1">
            <Chip active={topic === 'all'} onClick={() => (setTopic('all'), setI(0))}>
              Todos los temas
            </Chip>
            {data.map((t) => (
              <Chip key={t.id} active={topic === t.id} onClick={() => (setTopic(t.id), setI(0))}>
                {t.name}
              </Chip>
            ))}
          </div>
          {p && (
            <PromptCard
              key={`${level}-${topic}-${seed}-${i}`}
              p={p}
              level={level}
              index={i}
              total={prompts.length}
              onNext={() => setI((x) => x + 1)}
              onShuffle={() => {
                setSeed(Math.floor(Math.random() * 1e6));
                setI(0);
              }}
            />
          )}
        </>
      )}
    </Page>
  );
}

function PromptCard({
  p,
  level,
  index,
  total,
  onNext,
  onShuffle,
}: {
  p: Prompt;
  level: CefrLevel;
  index: number;
  total: number;
  onNext: () => void;
  onShuffle: () => void;
}) {
  const [reveal, setReveal] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [audio, setAudio] = useState<{
    blob: Blob;
    url: string;
    name: string;
  } | null>(null);
  const [fb, setFb] = useState<SpeakingFeedback | null>(null);
  const [aiBusy, setAiBusy] = useState(false);
  const [aiError, setAiError] = useState<string | null>(null);
  const [over, setOver] = useState(false);
  const rec = useRef<{ stop(): void } | null>(null);
  const media = useRef<MediaRecorder | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const award = useProgress((s) => s.award);
  const Recognition = getRecognition();
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  // Object URLs belong to this card: free them when the take changes or the card goes.
  useEffect(() => () => void (audio && URL.revokeObjectURL(audio.url)), [audio]);
  useEffect(
    () => () => {
      rec.current?.stop();
      if (media.current?.state === 'recording') media.current.stop();
    },
    [],
  );

  const keep = (blob: Blob, name: string) => {
    setAudio({ blob, url: URL.createObjectURL(blob), name });
    setFb(null);
    setAiError(null);
  };

  const stop = () => {
    rec.current?.stop();
    if (media.current?.state === 'recording') media.current.stop();
    setListening(false);
  };

  const start = async () => {
    setError(null);
    setTranscript('');
    // The recording itself (for playback and AI feedback), when the browser allows it.
    if (canRecord) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
        const mr = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        mr.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          if (chunks.length) keep(new Blob(chunks, { type: mr.mimeType || 'audio/webm' }), 'Grabación');
        };
        media.current = mr;
        mr.start();
      } catch {
        setError('Permite el acceso al micrófono para grabar.');
        return;
      }
    }
    // The live transcript, when the browser offers speech recognition.
    if (Recognition) {
      const r = new Recognition();
      r.lang = 'en-US';
      r.interimResults = true;
      r.continuous = true;
      r.maxAlternatives = 1;
      r.onresult = (e) => {
        let text = '';
        for (let k = 0; k < e.results.length; k++) text += e.results[k]![0]!.transcript;
        setTranscript(text);
      };
      r.onerror = (e) =>
        e.error !== 'no-speech' &&
        e.error !== 'aborted' &&
        !canRecord &&
        setError(e.error === 'not-allowed' ? 'Permite el acceso al micrófono para grabar.' : 'No se pudo reconocer el audio.');
      // Without a recorder the recogniser is the take: its end is the end.
      r.onend = () => !media.current && setListening(false);
      rec.current = r;
      r.start();
    }
    setListening(true);
  };

  const onFile = (f: File | undefined) => {
    if (!f) return;
    if (!isAudioFile(f)) return setError(`"${f.name}" no es un archivo de audio.`);
    if (f.size > MAX_ANSWER_AUDIO) return setError(`El archivo pesa ${(f.size / 1048576).toFixed(1)} MB; el máximo es 18 MB.`);
    setError(null);
    setTranscript('');
    keep(f, f.name);
  };

  const assess = async () => {
    if (!audio) return;
    setAiBusy(true);
    setAiError(null);
    try {
      setFb(await assessSpokenAnswer(audio.blob, p.q, level));
    } catch (e) {
      setAiError(e instanceof Error ? e.message : String(e));
    } finally {
      setAiBusy(false);
    }
  };

  const next = () => {
    award({
      kind: 'speaking',
      title: `Speaking: ${p.topic}`,
      skill: 'speaking',
      xp: fb ? 10 : transcript || audio ? 8 : 5,
      level,
      ref: 'practice:speaking',
    });
    onNext();
  };

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="overflow-hidden">
        <div className="brand-gradient p-6 text-white">
          <div className="flex items-center justify-between text-[13px] font-semibold opacity-90">
            <span>
              {p.topic} · {p.cat}
            </span>
            <span className="tabular-nums">
              {index + 1}/{total} · {p.points} pts
            </span>
          </div>
          <p className="mt-4 text-[24px] leading-snug font-semibold text-balance">{p.q}</p>
          <button type="button" onClick={() => speak(p.q)} className="mt-3 inline-flex items-center gap-1.5 text-[14px] opacity-90 hover:opacity-100">
            <Volume2 size={16} /> Escuchar pregunta
          </button>
        </div>
        <div className="p-6">
          {Recognition || canRecord ? (
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={listening ? stop : start}
                aria-label={listening ? 'Detener grabación' : 'Grabar respuesta'}
                className={cn(
                  'flex h-20 w-20 items-center justify-center rounded-full text-white shadow-float transition-transform active:scale-95',
                  listening ? 'bg-ios-red animate-pulse' : 'bg-ios-orange',
                )}
              >
                {listening ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
              <p className="text-label-2 mt-2 text-[13px]">{listening ? 'Grabando… toca para terminar' : 'Toca para responder'}</p>
            </div>
          ) : (
            <p className="text-label-2 text-center text-[14px]">
              Tu navegador no permite grabar aquí. Responde en voz alta, o graba con tu celular y sube el audio.
            </p>
          )}

          {/* a pre-recorded answer */}
          <div
            role="button"
            tabIndex={0}
            onClick={() => fileRef.current?.click()}
            onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), fileRef.current?.click())}
            onDragOver={(e) => (e.preventDefault(), setOver(true))}
            onDragLeave={() => setOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setOver(false);
              onFile(e.dataTransfer.files[0]);
            }}
            className={cn(
              'mt-5 flex cursor-pointer items-center gap-3 rounded-[16px] border-[1.5px] border-dashed px-4 py-3 transition-colors',
              over ? 'border-ios-blue bg-[color-mix(in_srgb,var(--blue)_12%,transparent)]' : 'border-separator hover:bg-fill-2',
            )}
          >
            <span className="bg-ios-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] text-white">
              <Upload size={18} />
            </span>
            <span className="min-w-0">
              <span className="block text-[15px] font-semibold">{audio ? 'Reemplazar con otro audio' : 'Subir un audio grabado'}</span>
              <span className="text-label-2 block text-[12.5px]">Arrastra el archivo o toca para elegirlo · MP3, M4A, WAV, OGG · hasta 18 MB</span>
            </span>
            <input
              ref={fileRef}
              type="file"
              accept="audio/*,.mp3,.m4a,.wav,.ogg,.opus,.webm,.aac"
              hidden
              onChange={(e) => (onFile(e.target.files?.[0]), (e.target.value = ''))}
            />
          </div>

          {audio && (
            <div className="bg-fill-2 mt-4 rounded-[14px] p-3">
              <div className="text-label-2 mb-2 flex items-center gap-1.5 text-[12.5px] font-semibold">
                <FileAudio size={14} /> <span className="truncate">{audio.name}</span>
              </div>
              <audio controls src={audio.url} className="w-full" />
              {!fb && (
                <Button className="mt-3 w-full" variant="tinted" onClick={assess} disabled={aiBusy}>
                  <Sparkles size={16} /> {aiBusy ? 'La IA está escuchando…' : 'Transcribir y corregir con IA'}
                </Button>
              )}
              {aiError && <p className="text-ios-red mt-2 text-[13px]">{aiError}</p>}
            </div>
          )}

          {transcript && !fb && (
            <div className="bg-fill-2 mt-4 rounded-[14px] p-4">
              <div className="text-label-2 mb-1 text-[12px] font-semibold uppercase">Dijiste</div>
              <p className="text-[16px]">{transcript}</p>
            </div>
          )}
          {fb && <FeedbackView fb={fb} />}
          {error && <p className="text-ios-red mt-3 text-center text-[14px]">{error}</p>}
          {reveal && (
            <div className="mt-4 rounded-[14px] bg-[color-mix(in_srgb,var(--green)_10%,transparent)] p-4">
              <div className="text-ios-green mb-1 text-[12px] font-semibold uppercase">Respuesta modelo</div>
              <p className="text-[16px]">{p.a}</p>
            </div>
          )}
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            {!reveal && (
              <Button variant="gray" onClick={() => setReveal(true)}>
                <Eye size={16} /> Ver respuesta
              </Button>
            )}
            <Button onClick={next} disabled={listening}>
              Siguiente
            </Button>
            <Button variant="plain" onClick={onShuffle}>
              <Shuffle size={16} /> Mezclar
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

function FeedbackView({ fb }: { fb: SpeakingFeedback }) {
  return (
    <div className="mt-4 space-y-3">
      <div className="bg-fill-2 rounded-[14px] p-4">
        <div className="text-label-2 mb-1 flex items-center justify-between text-[12px] font-semibold uppercase">
          <span>La IA escuchó</span>
          {fb.level && <span className="bg-ios-blue rounded-full px-2 py-0.5 text-[11px] text-white normal-case">Nivel estimado {fb.level}</span>}
        </div>
        <p className="text-[16px]">{fb.transcript || '—'}</p>
      </div>
      {fb.summary && <p className="text-[15px] leading-snug">{fb.summary}</p>}
      {fb.corrections.length > 0 && (
        <ul className="space-y-2">
          {fb.corrections.map((c, i) => (
            <li key={i} className="rounded-[14px] bg-[color-mix(in_srgb,var(--orange)_9%,transparent)] p-3 text-[14.5px]">
              <span className="text-label-2 line-through">{c.original}</span> → <b className="text-ios-green">{c.correction}</b>
              {c.why && <span className="text-label-2 block text-[13px]">{c.why}</span>}
            </li>
          ))}
        </ul>
      )}
      {fb.better && (
        <div className="rounded-[14px] bg-[color-mix(in_srgb,var(--purple)_9%,transparent)] p-4">
          <div className="mb-1 flex items-center justify-between text-[12px] font-semibold uppercase" style={{ color: 'var(--purple)' }}>
            <span>Así sonaría más natural</span>
            <button type="button" onClick={() => speak(fb.better, { rate: 0.92 })} aria-label="Escuchar versión mejorada" className="text-ios-blue">
              <Volume2 size={16} />
            </button>
          </div>
          <p className="text-[15.5px]">{fb.better}</p>
        </div>
      )}
    </div>
  );
}

function shuffle<T>(a: T[], seed: number) {
  const out = [...a];
  let s = seed || 1;
  for (let i = out.length - 1; i > 0; i--) {
    s = (s * 16807) % 2147483647;
    const j = s % (i + 1);
    [out[i], out[j]] = [out[j]!, out[i]!];
  }
  return out;
}
