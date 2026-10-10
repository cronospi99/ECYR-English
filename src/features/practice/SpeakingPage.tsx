import { useMemo, useRef, useState } from 'react';
import { Eye, Mic, MicOff, Shuffle, Volume2 } from 'lucide-react';
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
        for (const [q, a] of qs) out.push({ topic: t.name, cat: t.cats[Number(ci)] ?? '', points: Number(pts), q, a });
      }
    }
    return shuffle(out, seed);
  }, [data, level, topic, seed]);

  const p = prompts[i % Math.max(1, prompts.length)];

  return (
    <Page
      back={{ to: '/practice', label: 'Práctica' }}
      title="Speaking"
      subtitle="Responde en voz alta. Si tu navegador lo permite, verás la transcripción de lo que dijiste."
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
  const rec = useRef<{ stop(): void } | null>(null);
  const award = useProgress((s) => s.award);
  const Recognition = getRecognition();

  const toggleMic = () => {
    if (!Recognition) return;
    if (listening) {
      rec.current?.stop();
      return;
    }
    const r = new Recognition();
    r.lang = 'en-US';
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let text = '';
      for (let k = 0; k < e.results.length; k++) text += e.results[k]![0]!.transcript;
      setTranscript(text);
    };
    r.onerror = (e) => setError(e.error === 'not-allowed' ? 'Permite el acceso al micrófono para grabar.' : 'No se pudo reconocer el audio.');
    r.onend = () => setListening(false);
    rec.current = r;
    setError(null);
    setTranscript('');
    setListening(true);
    r.start();
  };

  const next = () => {
    award({ kind: 'speaking', title: `Speaking: ${p.topic}`, skill: 'speaking', xp: transcript ? 8 : 5, level, ref: 'practice:speaking' });
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
          {Recognition ? (
            <div className="flex flex-col items-center">
              <button
                type="button"
                onClick={toggleMic}
                aria-label={listening ? 'Detener grabación' : 'Grabar respuesta'}
                className={cn(
                  'flex h-20 w-20 items-center justify-center rounded-full text-white shadow-float transition-transform active:scale-95',
                  listening ? 'bg-ios-red animate-pulse' : 'bg-ios-orange',
                )}
              >
                {listening ? <MicOff size={32} /> : <Mic size={32} />}
              </button>
              <p className="text-label-2 mt-2 text-[13px]">{listening ? 'Escuchando… toca para terminar' : 'Toca para responder'}</p>
            </div>
          ) : (
            <p className="text-label-2 text-center text-[14px]">
              Tu navegador no ofrece reconocimiento de voz (prueba con Chrome o Safari). Responde en voz alta y compara con la respuesta modelo.
            </p>
          )}
          {transcript && (
            <div className="bg-fill-2 mt-4 rounded-[14px] p-4">
              <div className="text-label-2 mb-1 text-[12px] font-semibold uppercase">Dijiste</div>
              <p className="text-[16px]">{transcript}</p>
            </div>
          )}
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
            <Button onClick={next}>Siguiente</Button>
            <Button variant="plain" onClick={onShuffle}>
              <Shuffle size={16} /> Mezclar
            </Button>
          </div>
        </div>
      </Card>
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
