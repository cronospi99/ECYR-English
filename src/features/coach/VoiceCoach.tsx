import { useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { Mic, Square, Languages, Lightbulb } from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Toggle } from '@/components/ui/Misc';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { askVoiceCoach, CoachError, type ChatMessage } from '@/lib/ai';
import { getRecognition, getSpeechState, speak, stopSpeaking, subscribeSpeech } from '@/lib/speech';
import { prefetchVoice, defaultPersona } from '@/lib/voice';
import { saveWork } from '@/lib/work';
import { useSettings } from '@/store/settings';
import { useProgress } from '@/store/progress';
import type { CefrLevel } from '@/content/types';
import { deep, ink, tint } from '@/lib/color';
import { looksSpanish, transcribeTurn } from './transcribe';

type Phase = 'idle' | 'listening' | 'thinking' | 'speaking';

interface Turn {
  role: 'user' | 'model';
  text: string;
  english_version?: string;
  tip_es?: string;
  /** User turn spoken in Spanish / model turn answering one. */
  spanish?: boolean;
}

const GREETING: Record<string, string> = {
  A1: "Hi! I'm your English coach. How are you today?",
  A2: "Hi! I'm your English coach. What did you do today?",
  B1: "Hi there! I'm your English coach. What would you like to talk about today?",
  B2: "Hey! Great to hear you. What's been on your mind lately? Let's talk about it.",
  C1: "Hello! Let's have a proper chat. What's something interesting you've been thinking about recently?",
};

const SILENCE_AFTER_SPEECH = 1400;
const SILENCE_AFTER_INTERIM = 2400;
const MAX_IDLE_RESTARTS = 3;

/** "Conversación por voz": speak, the coach answers aloud, and it listens again — hands-free until you stop. */
export function VoiceCoach({ level }: { level: CefrLevel }) {
  const speechRate = useSettings((s) => s.speechRate);
  const award = useProgress((s) => s.award);
  const [phase, setPhaseState] = useState<Phase>('idle');
  const [turns, setTurns] = useState<Turn[]>([]);
  const [interim, setInterim] = useState('');
  const [spanish, setSpanish] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [meter, setMeter] = useState(0);
  const speech = useSyncExternalStore(subscribeSpeech, getSpeechState);

  const Recognition = getRecognition();
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';
  const supported = !!Recognition || canRecord;

  // Refs: the loop runs across callbacks that outlive any one render.
  const active = useRef(false);
  const phaseRef = useRef<Phase>('idle');
  const turnsRef = useRef<Turn[]>([]);
  const spanishRef = useRef(false);
  const rec = useRef<InstanceType<NonNullable<ReturnType<typeof getRecognition>>> | null>(null);
  const heard = useRef('');
  const silence = useRef<ReturnType<typeof setTimeout> | null>(null);
  const restarts = useRef(0);
  const stream = useRef<MediaStream | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);
  const meterLoop = useRef<number | null>(null);
  const audioCtx = useRef<AudioContext | null>(null);
  const speakId = useRef(-1);
  const end = useRef<HTMLDivElement>(null);
  const levelRef = useRef(level);
  levelRef.current = level;

  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const pushTurn = (t: Turn) => {
    turnsRef.current = [...turnsRef.current, t];
    setTurns(turnsRef.current);
  };

  useEffect(() => {
    spanishRef.current = spanish;
  }, [spanish]);

  // Something else took over the voice (a ▶ in the transcript, another page): pause the loop.
  useEffect(() => {
    if (phaseRef.current === 'speaking' && speech.id !== speakId.current) setPhase('idle');
  }, [speech]);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [turns, interim, phase]);

  // ------------------------------------------------------------ speaking --

  const say = (text: string) => {
    setPhase('speaking');
    speakId.current = speak(text, {
      persona: defaultPersona().id,
      rate: speechRate,
      onEnd: () => {
        if (active.current && phaseRef.current === 'speaking') listen();
      },
    });
  };

  // ----------------------------------------------------------- listening --

  const clearSilence = () => {
    if (silence.current) clearTimeout(silence.current);
    silence.current = null;
  };

  const stopListening = (submit: boolean) => {
    clearSilence();
    if (rec.current) {
      const r = rec.current;
      if (!submit) {
        r.onend = null;
        r.onresult = null;
        r.onerror = null;
        rec.current = null;
        try {
          (r.abort ?? r.stop).call(r);
        } catch {
          /* already stopped */
        }
      } else {
        try {
          r.stop();
        } catch {
          /* already stopped */
        }
      }
    }
    if (recorder.current && recorder.current.state !== 'inactive') {
      if (!submit) recorder.current.ondataavailable = null;
      recorder.current.stop();
    }
    if (meterLoop.current) cancelAnimationFrame(meterLoop.current);
    meterLoop.current = null;
    setMeter(0);
  };

  const listen = () => {
    if (!active.current) return;
    setError(null);
    setInterim('');
    heard.current = '';
    setPhase('listening');
    if (Recognition) listenWithRecognition();
    else void listenWithRecorder();
  };

  const listenWithRecognition = () => {
    const r = new Recognition!();
    rec.current = r;
    r.lang = spanishRef.current ? 'es-CO' : 'en-US';
    r.continuous = true;
    r.interimResults = true;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      let fin = '';
      let mid = '';
      for (let i = 0; i < e.results.length; i++) {
        const res = e.results[i]!;
        const t = res[0]?.transcript ?? '';
        if (res.isFinal) fin += `${t} `;
        else mid += t;
      }
      heard.current = `${fin}${mid}`.replace(/\s+/g, ' ').trim();
      setInterim(heard.current);
      clearSilence();
      silence.current = setTimeout(() => stopListening(true), mid.trim() ? SILENCE_AFTER_INTERIM : SILENCE_AFTER_SPEECH);
    };
    r.onerror = (e) => {
      if (e.error === 'not-allowed' || e.error === 'service-not-allowed') {
        setError('Permite el micrófono en tu navegador para hablar con el coach.');
        stopSession();
      } else if (e.error === 'language-not-supported' && spanishRef.current) {
        setNotice('Tu navegador no reconoce español aquí; escucho en inglés.');
        setSpanish(false);
        spanishRef.current = false;
      }
    };
    r.onend = () => {
      if (rec.current !== r) return;
      rec.current = null;
      clearSilence();
      const text = heard.current;
      if (!active.current) return;
      if (text) {
        restarts.current = 0;
        void submit(text, spanishRef.current);
      } else if (restarts.current < MAX_IDLE_RESTARTS) {
        // Chrome ends a silent session after a few seconds: keep listening.
        restarts.current += 1;
        listen();
      } else {
        restarts.current = 0;
        setNotice('¿Sigues ahí? Toca el micrófono para seguir hablando.');
        pause();
      }
    };
    try {
      r.start();
    } catch {
      setError('No se pudo iniciar el micrófono.');
      stopSession();
    }
  };

  const listenWithRecorder = async () => {
    try {
      if (!stream.current) stream.current = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
    } catch {
      setError('Permite el micrófono en tu navegador para hablar con el coach.');
      stopSession();
      return;
    }
    if (!active.current || phaseRef.current !== 'listening') return;
    const chunks: Blob[] = [];
    const mr = new MediaRecorder(stream.current);
    recorder.current = mr;
    mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
    mr.onstop = () => {
      if (recorder.current === mr) recorder.current = null;
      if (!active.current || !mr.ondataavailable || !chunks.length) return;
      const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
      setPhase('thinking');
      transcribeTurn(blob)
        .then((t) => {
          if (!active.current) return;
          if (t.text) void submit(t.text, t.lang === 'es' || spanishRef.current);
          else listen();
        })
        .catch((e: unknown) => {
          setError(e instanceof Error ? e.message : 'No se pudo transcribir tu voz.');
          pause();
        });
    };
    mr.start();

    // Voice activity: stop after a pause once they have spoken (or after 30 s).
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    audioCtx.current ??= new Ctx();
    const an = audioCtx.current.createAnalyser();
    an.fftSize = 1024;
    audioCtx.current.createMediaStreamSource(stream.current).connect(an);
    const buf = new Uint8Array(an.fftSize);
    const started = performance.now();
    let spoke = false;
    let lastLoud = started;
    const tick = () => {
      if (recorder.current !== mr) return;
      an.getByteTimeDomainData(buf);
      let sum = 0;
      for (const v of buf) sum += ((v - 128) / 128) ** 2;
      const rms = Math.sqrt(sum / buf.length);
      setMeter(Math.min(1, rms * 6));
      const now = performance.now();
      if (rms > 0.035) {
        spoke = true;
        lastLoud = now;
      }
      if ((spoke && now - lastLoud > 1500) || now - started > 30_000) return stopListening(true);
      if (!spoke && now - started > 12_000) {
        mr.ondataavailable = null;
        stopListening(false);
        setNotice('¿Sigues ahí? Toca el micrófono para seguir hablando.');
        return pause();
      }
      meterLoop.current = requestAnimationFrame(tick);
    };
    meterLoop.current = requestAnimationFrame(tick);
  };

  // ------------------------------------------------------------- a turn --

  const submit = async (text: string, saidSpanish: boolean) => {
    const isEs = saidSpanish || looksSpanish(text);
    pushTurn({ role: 'user', text, spanish: isEs });
    setInterim('');
    setPhase('thinking');
    const history: ChatMessage[] = turnsRef.current.map((t) => ({ role: t.role, text: t.text }));
    try {
      const r = await askVoiceCoach({ messages: history, level: levelRef.current, spanish: isEs });
      if (!active.current) return;
      pushTurn({ role: 'model', text: r.reply, english_version: r.english_version, tip_es: r.tip_es, spanish: r.student_spanish || isEs });
      if (r.english_version) prefetchVoice(r.english_version, defaultPersona().id);
      const userTurns = turnsRef.current.filter((t) => t.role === 'user').length;
      if (userTurns % 3 === 1) {
        award({ kind: 'coach', title: 'Conversación por voz con el AI Coach', skill: 'speaking', xp: 5, level: levelRef.current, ref: 'coach:voice' });
      }
      // They answered in Spanish and were shown the English: listen in English for the repeat.
      if ((r.student_spanish || isEs) && r.english_version && spanishRef.current) {
        setSpanish(false);
        spanishRef.current = false;
        setNotice('Ahora repítelo en inglés: te escucho en inglés.');
      }
      say(r.reply);
    } catch (e) {
      if (!active.current) return;
      setError(e instanceof CoachError ? e.message : 'No se pudo contactar al coach.');
      pause();
    }
  };

  // ------------------------------------------------------------ session --

  const save = () => {
    const list = turnsRef.current;
    const userTurns = list.filter((t) => t.role === 'user');
    if (userTurns.length < 2) return;
    const content = list.map((t) => `${t.role === 'user' ? 'Estudiante' : 'Coach'}: ${t.text}`).join('\n');
    void saveWork({
      module: 'speaking',
      task: 'coach:live',
      prompt: 'AI Coach · conversación por voz',
      content,
      report: { turns: userTurns.length, level: levelRef.current, spanishTurns: userTurns.filter((t) => t.spanish).length },
    }).catch(() => undefined);
  };

  /** Stops the loop but keeps the conversation (tap the mic to go on). */
  const pause = () => {
    stopListening(false);
    stopSpeaking();
    setInterim('');
    setPhase('idle');
  };

  const stopSession = () => {
    const wasActive = active.current;
    active.current = false;
    pause();
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    if (wasActive) save();
  };

  const start = () => {
    setError(null);
    setNotice(null);
    active.current = true;
    restarts.current = 0;
    if (!turnsRef.current.length) {
      const hello = GREETING[levelRef.current] ?? GREETING.B1!;
      pushTurn({ role: 'model', text: hello });
      say(hello);
    } else listen();
  };

  /** The big button: start · finish my turn · barge in while the coach talks. */
  const tapMic = () => {
    setNotice(null);
    if (!active.current || phaseRef.current === 'idle') return start();
    if (phaseRef.current === 'listening') {
      if (heard.current || recorder.current) stopListening(true);
      return;
    }
    if (phaseRef.current === 'speaking') {
      stopSpeaking();
      listen();
    }
  };

  const restart = () => {
    stopSession();
    turnsRef.current = [];
    setTurns([]);
    setError(null);
    setNotice(null);
  };

  // Leaving the page ends the session (and saves it).
  useEffect(
    () => () => {
      stopSession();
      void audioCtx.current?.close().catch(() => undefined);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const toggleSpanish = (v: boolean) => {
    setSpanish(v);
    spanishRef.current = v;
    setNotice(v ? 'Te escucho en español: te diré cómo decirlo en inglés.' : null);
    // Restart recognition in the new language right away.
    if (phaseRef.current === 'listening' && Recognition) {
      stopListening(false);
      listen();
    }
  };

  // ------------------------------------------------------------------ UI --

  const voiceLoading = phase === 'speaking' && speech.id === speakId.current && speech.phase === 'loading';
  const shown: Phase = voiceLoading ? 'thinking' : phase;
  const label =
    shown === 'listening'
      ? spanish
        ? 'Escuchando (español)…'
        : 'Escuchando…'
      : shown === 'thinking'
        ? 'Pensando…'
        : shown === 'speaking'
          ? 'Hablando… toca para interrumpir'
          : turns.length
            ? 'En pausa · toca para seguir'
            : 'Toca para empezar a hablar';
  const color = shown === 'listening' ? 'var(--red)' : shown === 'speaking' ? 'var(--purple)' : shown === 'thinking' ? 'var(--orange)' : 'var(--blue)';
  const userTurns = turns.filter((t) => t.role === 'user').length;

  return (
    <Card className="flex h-[calc(100dvh-330px)] min-h-[480px] flex-col overflow-hidden lg:h-[calc(100dvh-300px)]">
      <div className="hairline-b flex flex-wrap items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex items-center gap-2 text-[15px] font-semibold">
          <Mic size={16} className="text-ink-red" /> Conversación por voz
        </div>
        <label className="flex items-center gap-2 text-[14px]">
          <Languages size={16} className="text-ink-green" />
          Hablo en español
          <Toggle checked={spanish} onChange={toggleSpanish} label="Hablo en español" />
        </label>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6" aria-live="polite">
        {!supported ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="text-[56px]">🎙️</div>
            <h3 className="text-title-3 mt-2">Tu navegador no permite usar el micrófono</h3>
            <p className="text-label-2 mt-1 max-w-sm text-[15px]">Prueba con Chrome, Edge o Safari actualizados, o usa el chat escrito.</p>
          </div>
        ) : turns.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="text-[56px]">🗣️</div>
            <h3 className="text-title-3 mt-2">Habla con el coach, sin escribir</h3>
            <p className="text-label-2 mt-1 max-w-md text-[15px]">
              Toca el micrófono y habla en inglés. El coach te responde en voz alta y vuelve a escucharte. Si no sabes cómo decir algo, activa “Hablo en español”.
            </p>
          </div>
        ) : (
          turns.map((t, i) => <Bubble key={i} t={t} />)
        )}
        {phase === 'listening' && interim && (
          <div className="flex justify-end">
            <div className="max-w-[85%] rounded-[20px] rounded-br-[6px] px-4 py-2.5 text-[16px] italic" style={{ background: tint('var(--blue)', 14), color: ink('var(--blue)') }}>
              {interim}
            </div>
          </div>
        )}
        {phase === 'thinking' && !voiceLoading && (
          <div className="flex justify-start">
            <div className="bg-fill flex gap-1 rounded-[20px] rounded-bl-[6px] px-4 py-3.5">
              {[0, 1, 2].map((k) => (
                <motion.span key={k} className="bg-label-2 h-2 w-2 rounded-full" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1, repeat: Infinity, delay: k * 0.2 }} />
              ))}
            </div>
          </div>
        )}
        {error && <p className="text-ink-red text-center text-[14px]">{error}</p>}
        <div ref={end} />
      </div>

      <div className="hairline-t flex flex-col items-center gap-2 px-4 pt-4 pb-3">
        <AnimatePresence>
          {notice && (
            <motion.p initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="text-label-2 text-center text-[13px]">
              {notice}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="flex w-full items-center justify-center gap-4">
          <div className="w-24 text-right">
            {turns.length > 0 && phase === 'idle' && (
              <Button variant="gray" size="sm" onClick={restart}>
                Nueva
              </Button>
            )}
          </div>
          <button
            type="button"
            onClick={tapMic}
            disabled={!supported || (phase === 'thinking' && !voiceLoading)}
            aria-label={label}
            className="relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full text-white transition-transform duration-200 active:scale-95 disabled:opacity-60"
            style={{ background: deep(color, 78) }}
          >
            {shown === 'listening' && (
              <>
                <motion.span className="absolute inset-0 rounded-full" style={{ background: tint(color, 30) }} animate={{ scale: [1, 1.45 + meter * 0.4], opacity: [0.7, 0] }} transition={{ duration: 1.4, repeat: Infinity }} />
                <motion.span className="absolute inset-0 rounded-full" style={{ background: tint(color, 30) }} animate={{ scale: [1, 1.45], opacity: [0.6, 0] }} transition={{ duration: 1.4, repeat: Infinity, delay: 0.7 }} />
              </>
            )}
            {shown === 'thinking' && (
              <motion.span className="absolute -inset-1 rounded-full border-[3px] border-transparent" style={{ borderTopColor: color }} animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }} />
            )}
            <span className="relative">
              {shown === 'speaking' ? <Bars /> : <Mic size={32} strokeWidth={2.2} />}
            </span>
          </button>
          <div className="w-24">
            {phase !== 'idle' && (
              <Button variant="destructive" size="sm" onClick={stopSession}>
                <Square size={12} fill="currentColor" /> Terminar
              </Button>
            )}
          </div>
        </div>
        <div className="text-[14px] font-semibold" style={{ color: ink(color) }} role="status">
          {label}
        </div>
        {userTurns > 0 && <div className="text-label-2 text-[12px]">{userTurns === 1 ? '1 turno' : `${userTurns} turnos`} · se guarda en tus trabajos al terminar</div>}
      </div>
    </Card>
  );
}

function Bars() {
  return (
    <span className="flex h-8 items-center gap-[3px]" aria-hidden>
      {[0, 1, 2, 3, 4].map((k) => (
        <motion.span key={k} className="w-[4px] rounded-full bg-white" animate={{ height: [8, 26, 12, 22, 8] }} transition={{ duration: 0.9, repeat: Infinity, delay: k * 0.12 }} />
      ))}
    </span>
  );
}

function Bubble({ t }: { t: Turn }) {
  if (t.role === 'user') {
    return (
      <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex flex-col items-end">
        <div className="bg-ios-blue max-w-[85%] rounded-[20px] rounded-br-[6px] px-4 py-2.5 text-[16px] whitespace-pre-wrap text-white">{t.text}</div>
        {t.spanish && <span className="text-label-2 mt-0.5 mr-2 text-[11px]">🇨🇴 en español</span>}
      </motion.div>
    );
  }
  return (
    <motion.div initial={{ opacity: 0, y: 6, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} className="flex flex-col items-start gap-2">
      <div className="bg-fill flex max-w-[85%] items-start gap-1 rounded-[20px] rounded-bl-[6px] px-4 py-2.5 text-[16px]">
        <span className="min-w-0 flex-1">{t.text}</span>
        <SpeakButton text={t.text} size={15} className="-mr-2 shrink-0" />
      </div>
      {(t.english_version || t.tip_es) && (
        <div className="max-w-[85%] rounded-[16px] px-3.5 py-2.5 text-[14px]" style={{ background: tint('var(--yellow)', 16) }}>
          <div className="flex items-center gap-1.5 text-[12px] font-semibold tracking-wide uppercase" style={{ color: ink('var(--orange)') }}>
            <Lightbulb size={13} /> {t.spanish ? 'En inglés puedes decir' : 'Más natural'}
          </div>
          {t.english_version && (
            <div className="mt-1 flex items-center gap-1 text-[16px] font-semibold">
              <span className="min-w-0 flex-1">{t.english_version}</span>
              <SpeakButton text={t.english_version} size={15} className="-mr-1.5 shrink-0" />
            </div>
          )}
          {t.tip_es && <p className="text-label-2 mt-0.5">{t.tip_es}</p>}
        </div>
      )}
    </motion.div>
  );
}
