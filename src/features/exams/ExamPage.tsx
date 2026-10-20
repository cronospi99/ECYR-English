import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Clock, Eye, FileText, Headphones, Loader2, Mic, RotateCcw, Send, Square, Trophy, Volume2 } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Misc';
import { ProgressBar } from '@/components/ui/Progress';
import { QuestionList, grade, type Answer } from '@/components/learning/QuestionSet';
import { useAsync } from '@/hooks/useAsync';
import { EXAM_SECTIONS, PASS_PCT, levelName, levelPath, loadExam, toGrade, wordCount, type Exam, type ExamSection } from '@/content/exams';
import type { LibQuestion } from '@/content/library';
import { getRecognition, speakSequence, stopSpeaking } from '@/lib/speech';
import { markMarkdown, markSpeaking, markWriting, type ExamMark } from '@/lib/examAi';
import { saveWork } from '@/lib/work';
import { useExamResults, type ExamResult } from '@/store/exams';
import { useProgress } from '@/store/progress';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';
import NotFound from '../NotFound';

type Objective = 'listening' | 'reading' | 'grammar' | 'vocabulary';
const OBJECTIVE: Objective[] = ['listening', 'reading', 'grammar', 'vocabulary'];
const MAX_PLAYS = 2;

interface Draft {
  answers: Record<Objective, Answer[]>;
  writing: string;
  /** Live transcripts of the spoken answers (the audio itself is not stored). */
  spoken: string[];
  plays: number;
  startedAt: number;
}

const draftKey = (id: string) => `ecyr:exam-draft:${id}`;
const blankDraft = (e: Exam): Draft => ({
  answers: { listening: e.listening.questions.map(() => undefined), reading: e.reading.questions.map(() => undefined), grammar: e.grammar.map(() => undefined), vocabulary: e.vocabulary.map(() => undefined) },
  writing: '',
  spoken: e.speaking.prompts.map(() => ''),
  plays: 0,
  startedAt: Date.now(),
});
function readDraft(e: Exam): Draft | null {
  try {
    const d = JSON.parse(localStorage.getItem(draftKey(e.id)) ?? 'null') as Draft | null;
    return d && d.answers ? d : null;
  } catch {
    return null;
  }
}

const questionsOf = (e: Exam, s: Objective): LibQuestion[] => (s === 'listening' ? e.listening.questions : s === 'reading' ? e.reading.questions : e[s]);
const answered = (a: Answer[]) => a.filter((x) => x !== undefined && x !== '' && !(Array.isArray(x) && !x.length)).length;
const objectiveScore = (e: Exam, s: Objective, a: Answer[]) => {
  const qs = questionsOf(e, s);
  return qs.length ? Math.round((qs.filter((q, i) => grade(q, a[i]) !== 'wrong').length / qs.length) * 100) : 0;
};

export default function ExamPage() {
  const { examId = '' } = useParams();
  const { data: exam, loading } = useAsync(() => loadExam(examId), [examId]);
  if (loading) return <PageLoader />;
  if (!exam) return <NotFound />;
  return <ExamRunner key={exam.id} exam={exam} />;
}

type Phase = 'intro' | 'taking' | 'marking' | 'done';
interface Take {
  blob?: Blob;
  url?: string;
}
interface Outcome {
  result: ExamResult;
  writing: ExamMark | null;
  speaking: (ExamMark | null)[];
  errors: string[];
}

function ExamRunner({ exam }: { exam: Exam }) {
  const saved = useMemo(() => readDraft(exam), [exam]);
  const [phase, setPhase] = useState<Phase>('intro');
  const [draft, setDraft] = useState<Draft>(() => saved ?? blankDraft(exam));
  const [sec, setSec] = useState<ExamSection>('listening');
  const [takes, setTakes] = useState<Take[]>(() => exam.speaking.prompts.map(() => ({})));
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [confirm, setConfirm] = useState(false);
  const best = useExamResults((s) => s.results[exam.id]);
  const record = useExamResults((s) => s.record);
  const award = useProgress((s) => s.award);
  const sandbox = useSettings((s) => s.practiceSandbox);

  useEffect(() => {
    if (phase !== 'taking') return;
    try {
      localStorage.setItem(draftKey(exam.id), JSON.stringify(draft));
    } catch {
      /* storage full or blocked: the exam still works */
    }
  }, [draft, phase, exam.id]);
  useEffect(() => () => void stopSpeaking(), []);
  useEffect(() => () => takes.forEach((t) => t.url && URL.revokeObjectURL(t.url)), [takes]);

  const setAnswer = (s: Objective) => (i: number, a: Answer) => setDraft((d) => ({ ...d, answers: { ...d.answers, [s]: d.answers[s].map((x, k) => (k === i ? a : x)) } }));
  const start = (fresh: boolean) => {
    if (fresh) setDraft(blankDraft(exam));
    setSec('listening');
    setPhase('taking');
    window.scrollTo({ top: 0 });
  };

  const progressOf = (s: ExamSection): [number, number] =>
    s === 'writing'
      ? [draft.writing.trim() ? 1 : 0, 1]
      : s === 'speaking'
        ? [takes.filter((t, i) => t.blob || draft.spoken[i]?.trim()).length, exam.speaking.prompts.length]
        : [answered(draft.answers[s]), questionsOf(exam, s).length];

  const submit = async () => {
    stopSpeaking();
    setConfirm(false);
    setPhase('marking');
    window.scrollTo({ top: 0 });
    const errors: string[] = [];
    const sections: ExamResult['sections'] = {};
    for (const s of OBJECTIVE) sections[s] = objectiveScore(exam, s, draft.answers[s]);

    const level = levelName(exam.level) === 'Pre-A1' ? 'Pre-A1 (absolute beginner)' : exam.level;
    let writing: ExamMark | null = null;
    if (draft.writing.trim()) {
      try {
        writing = await markWriting({ text: draft.writing, prompt: exam.writing.prompt, level, criteria: exam.writing.criteria, minWords: exam.writing.minWords, maxWords: exam.writing.maxWords });
        sections.writing = writing.score;
      } catch (e) {
        errors.push(`Writing: ${(e as Error).message}`);
        sections.writing = null;
      }
    } else sections.writing = 0;

    const speaking = await Promise.all(
      exam.speaking.prompts.map(async (p, i) => {
        const t = takes[i]!;
        const transcript = draft.spoken[i]?.trim();
        if (!t.blob && !transcript) return null;
        try {
          return await markSpeaking({ audio: t.blob, transcript, prompt: p.text, level, seconds: p.seconds });
        } catch (e) {
          errors.push(`Speaking ${i + 1}: ${(e as Error).message}`);
          return undefined;
        }
      }),
    );
    // A prompt left unanswered scores 0; one the AI could not mark leaves the section to the teacher.
    sections.speaking = speaking.some((m) => m === undefined) ? null : Math.round(speaking.reduce((n, m) => n + (m?.score ?? 0), 0) / exam.speaking.prompts.length);

    const marked = Object.values(sections).filter((v): v is number => typeof v === 'number');
    const pct = Math.round(marked.reduce((a, b) => a + b, 0) / Math.max(1, marked.length));
    const result: ExamResult = { pct, grade: toGrade(pct), sections, at: new Date().toISOString() };
    const speakingMarks = speaking.map((m) => m ?? null);
    record(exam.id, result);
    award({ kind: 'exam', title: `${exam.title} · ${levelName(exam.level)}`, skill: 'grammar', xp: 30 + Math.round(pct / 4), score: pct, level: exam.level === 'PreA1' ? 'A1' : exam.level, ref: `exam:${exam.id}` });
    void sendToTeacher(exam, draft, result, writing, speakingMarks);
    try {
      localStorage.removeItem(draftKey(exam.id));
    } catch {
      /* ignore */
    }
    setOutcome({ result, writing, speaking: speakingMarks, errors });
    setPhase('done');
  };

  const idx = EXAM_SECTIONS.findIndex((s) => s.id === sec);
  const meta = EXAM_SECTIONS[idx]!;
  const back = { to: levelPath(exam.level), label: levelName(exam.level) };

  if (phase === 'intro')
    return (
      <Page back={back} eyebrow={`${levelName(exam.level)} · ${exam.kind === 'final' ? 'Examen final' : `Parcial ${exam.n}`}`} title={exam.title} subtitle={exam.intro_es}>
        <div className="mx-auto max-w-2xl space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap gap-4 text-[15px]">
              <span className="inline-flex items-center gap-1.5">
                <Clock size={17} className="text-ink-blue" /> {exam.minutes} minutos sugeridos
              </span>
              <span className="inline-flex items-center gap-1.5">
                <FileText size={17} className="text-ink-blue" /> Unidades {exam.units[0]}–{exam.units[exam.units.length - 1]}
              </span>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {EXAM_SECTIONS.map((s) => (
                <div key={s.id} className="rounded-[14px] p-3" style={{ background: tint(s.color, 12) }}>
                  <div className="text-[20px]">{s.emoji}</div>
                  <div className="text-[14px] font-bold" style={{ color: ink(s.color) }}>
                    {s.label}
                  </div>
                  <div className="text-label-2 text-[12px]">{sectionSize(exam, s.id)}</div>
                </div>
              ))}
            </div>
            <ul className="text-label-2 mt-4 list-disc space-y-1 pl-5 text-[14px]">
              <li>Cada habilidad vale lo mismo (1/6 de la nota). Nota sobre 5,0: apruebas con 3,0 ({PASS_PCT}%).</li>
              <li>El audio del listening se puede escuchar {MAX_PLAYS} veces, como en un examen real.</li>
              <li>Writing y speaking los califica la IA al entregar (con sesión iniciada); tu docente recibe tus respuestas.</li>
              <li>Tus respuestas se guardan en este navegador mientras presentas el examen.</li>
            </ul>
            {sandbox && <p className="text-ink-orange mt-3 text-[13px] font-semibold">Modo práctica docente: el resultado no se registra.</p>}
          </Card>
          {best && (
            <Card className="flex items-center gap-3 p-4">
              <Trophy size={22} className="text-ink-orange" />
              <span className="text-[15px]">
                Mejor resultado: <b>{best.best.grade.toFixed(1)}</b> ({best.best.pct}%) · {best.attempts} {best.attempts === 1 ? 'intento' : 'intentos'}
              </span>
            </Card>
          )}
          <div className="flex flex-wrap gap-3">
            {saved ? (
              <>
                <Button onClick={() => start(false)}>Continuar donde quedaste</Button>
                <Button variant="gray" onClick={() => start(true)}>
                  Empezar de nuevo
                </Button>
              </>
            ) : (
              <Button onClick={() => start(true)}>Empezar el examen</Button>
            )}
          </div>
        </div>
      </Page>
    );

  if (phase === 'marking')
    return (
      <Page back={back} title={exam.title}>
        <Card className="mx-auto flex max-w-md flex-col items-center gap-3 p-8 text-center">
          <Loader2 size={34} className="text-ink-blue animate-spin" />
          <div className="text-headline">Calificando tu examen…</div>
          <p className="text-label-2 text-[14px]">La IA está leyendo tu writing y escuchando tus respuestas de speaking. Puede tardar un minuto.</p>
        </Card>
      </Page>
    );

  if (phase === 'done' && outcome) return <Results exam={exam} draft={draft} outcome={outcome} back={back} onRetry={() => (setOutcome(null), setTakes(exam.speaking.prompts.map(() => ({}))), start(true))} />;

  return (
    <Page back={back} eyebrow={`${levelName(exam.level)} · ${exam.kind === 'final' ? 'Examen final' : `Parcial ${exam.n}`}`} title={exam.title}>
      <div className="material sticky top-12 z-20 -mx-4 mb-5 px-4 py-2 sm:-mx-6 sm:px-6 lg:top-0 lg:mx-0 lg:rounded-[14px] lg:px-2">
        <div className="flex items-center gap-2">
          <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
            {EXAM_SECTIONS.map((s) => {
              const [d, t] = progressOf(s.id);
              const on = s.id === sec;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => (stopSpeaking(), setSec(s.id))}
                  className={cn('shrink-0 rounded-full px-3 py-1.5 text-[13px] font-semibold transition-colors', on ? 'text-white' : 'bg-fill-2')}
                  style={on ? { background: s.color } : undefined}
                >
                  {s.emoji} {s.label} <span className={cn('tabular-nums', on ? 'opacity-85' : 'text-label-2')}>{d}/{t}</span>
                </button>
              );
            })}
          </div>
          <Timer startedAt={draft.startedAt} minutes={exam.minutes} />
        </div>
      </div>

      <motion.div key={sec} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mx-auto max-w-3xl">
        <h2 className="text-title-2 mb-3 flex items-center gap-2" style={{ color: ink(meta.color) }}>
          <span>{meta.emoji}</span> {meta.label}
        </h2>
        {sec === 'listening' && (
          <>
            <ListeningPlayer exam={exam} plays={draft.plays} onPlay={() => setDraft((d) => ({ ...d, plays: d.plays + 1 }))} />
            <QuestionList questions={exam.listening.questions} answers={draft.answers.listening} onAnswer={setAnswer('listening')} checked={false} color={meta.color} />
          </>
        )}
        {sec === 'reading' && (
          <>
            <ReadingText exam={exam} />
            <QuestionList questions={exam.reading.questions} answers={draft.answers.reading} onAnswer={setAnswer('reading')} checked={false} color={meta.color} />
          </>
        )}
        {(sec === 'grammar' || sec === 'vocabulary') && (
          <QuestionList questions={exam[sec]} answers={draft.answers[sec]} onAnswer={setAnswer(sec)} checked={false} color={meta.color} />
        )}
        {sec === 'writing' && <WritingTask exam={exam} text={draft.writing} onChange={(writing) => setDraft((d) => ({ ...d, writing }))} />}
        {sec === 'speaking' && (
          <div className="space-y-4">
            {exam.speaking.prompts.map((p, i) => (
              <SpeakingPrompt
                key={i}
                n={i + 1}
                prompt={p}
                take={takes[i]!}
                transcript={draft.spoken[i] ?? ''}
                onTake={(t) => setTakes((all) => all.map((x, k) => (k === i ? t : x)))}
                onTranscript={(text) => setDraft((d) => ({ ...d, spoken: d.spoken.map((x, k) => (k === i ? text : x)) }))}
              />
            ))}
          </div>
        )}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          {idx > 0 ? (
            <Button variant="gray" onClick={() => (stopSpeaking(), setSec(EXAM_SECTIONS[idx - 1]!.id), window.scrollTo({ top: 0 }))}>
              <ChevronLeft size={17} /> {EXAM_SECTIONS[idx - 1]!.label}
            </Button>
          ) : (
            <span />
          )}
          {idx < EXAM_SECTIONS.length - 1 ? (
            <Button onClick={() => (stopSpeaking(), setSec(EXAM_SECTIONS[idx + 1]!.id), window.scrollTo({ top: 0 }))}>
              {EXAM_SECTIONS[idx + 1]!.label} <ChevronRight size={17} />
            </Button>
          ) : (
            <Button onClick={() => setConfirm(true)}>
              <Send size={16} /> Entregar examen
            </Button>
          )}
        </div>
        {confirm && (
          <Card className="mt-4 p-5">
            {(() => {
              const missing = EXAM_SECTIONS.filter((s) => {
                const [d, t] = progressOf(s.id);
                return d < t;
              });
              return (
                <>
                  <div className="text-headline flex items-center gap-2">
                    <AlertTriangle size={18} className="text-ink-orange" /> ¿Entregar el examen?
                  </div>
                  <p className="text-label-2 mt-1 text-[14px]">
                    {missing.length
                      ? `Te falta completar: ${missing.map((s) => s.label).join(', ')}. Lo que no respondas cuenta como incorrecto.`
                      : 'Respondiste todas las secciones. Después de entregar verás tu nota y las respuestas correctas.'}
                  </p>
                  <div className="mt-3 flex gap-2">
                    <Button onClick={submit}>Sí, entregar</Button>
                    <Button variant="gray" onClick={() => setConfirm(false)}>
                      Seguir revisando
                    </Button>
                  </div>
                </>
              );
            })()}
          </Card>
        )}
      </motion.div>
    </Page>
  );
}

function sectionSize(e: Exam, s: ExamSection) {
  switch (s) {
    case 'listening':
      return `${e.listening.questions.length} preguntas`;
    case 'reading':
      return `${e.reading.questions.length} preguntas`;
    case 'grammar':
      return `${e.grammar.length} preguntas`;
    case 'vocabulary':
      return `${e.vocabulary.length} preguntas`;
    case 'writing':
      return `${e.writing.minWords}–${e.writing.maxWords} palabras`;
    case 'speaking':
      return `${e.speaking.prompts.length} respuestas orales`;
  }
}

function Timer({ startedAt, minutes }: { startedAt: number; minutes: number }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);
  const left = Math.round(minutes * 60 - (now - startedAt) / 1000);
  const m = Math.floor(Math.abs(left) / 60);
  const s = Math.abs(left) % 60;
  return (
    <span className={cn('bg-fill-2 inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1.5 text-[13px] font-semibold tabular-nums', left < 0 && 'text-ink-red')} title="Tiempo sugerido restante">
      <Clock size={13} /> {left < 0 ? '+' : ''}
      {m}:{String(s).padStart(2, '0')}
    </span>
  );
}

function ListeningPlayer({ exam, plays, onPlay, reveal = false }: { exam: Exam; plays: number; onPlay?: () => void; reveal?: boolean }) {
  const [playing, setPlaying] = useState(false);
  const [line, setLine] = useState(-1);
  const left = MAX_PLAYS - plays;
  const L = exam.listening;
  const play = () => {
    if (playing) {
      stopSpeaking();
      setPlaying(false);
      setLine(-1);
      return;
    }
    if (!reveal && left <= 0) return;
    onPlay?.();
    setPlaying(true);
    speakSequence(
      L.lines.map((l) => ({ text: l.text, speaker: L.speakers[l.s] ?? L.speakers[0]! })),
      { gapMs: 320, onLine: setLine, onEnd: () => (setPlaying(false), setLine(-1)) },
    );
  };
  return (
    <Card className="mb-4 p-5">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-[13px]" style={{ background: tint('var(--purple)', 14), color: ink('var(--purple)') }}>
          <Headphones size={22} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="text-headline">{L.title}</div>
          <div className="text-label-2 text-[13px]">{L.speakers.map((s) => s.name).join(' · ')}</div>
        </div>
        <Button onClick={play} disabled={!playing && !reveal && left <= 0} variant={playing ? 'gray' : 'filled'}>
          {playing ? <Square size={15} fill="currentColor" /> : <Volume2 size={17} />} {playing ? 'Detener' : reveal ? 'Escuchar' : left > 0 ? `Escuchar (${left})` : 'Sin reproducciones'}
        </Button>
      </div>
      {!reveal && <p className="text-label-2 mt-3 text-[13px]">Lee las preguntas antes de escuchar. Puedes reproducir el audio {MAX_PLAYS} veces; detenerlo cuenta como una reproducción.</p>}
      {reveal && (
        <div className="mt-4 space-y-1.5">
          {L.lines.map((l, i) => (
            <p key={i} className={cn('rounded-[10px] px-2 py-1 text-[15px]', line === i && 'bg-[color-mix(in_srgb,var(--purple)_10%,transparent)]')}>
              <b>{L.speakers[l.s]?.name}:</b> {l.text}
            </p>
          ))}
        </div>
      )}
    </Card>
  );
}

function ReadingText({ exam }: { exam: Exam }) {
  const R = exam.reading;
  return (
    <Card className="mb-4 p-5 sm:p-6">
      <div className="text-label-2 text-[12px] font-bold tracking-wide uppercase">{R.genre}</div>
      <h3 className="mt-1 text-[22px] leading-tight font-extrabold">{R.title}</h3>
      <div className="mt-3 space-y-3">
        {R.paragraphs.map((p, i) => (
          <p key={i} className="text-[16.5px] leading-[1.7]">
            {p}
          </p>
        ))}
      </div>
      {R.glossary.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {R.glossary.map(([en, es]) => (
            <span key={en} className="bg-fill-2 rounded-full px-2.5 py-1 text-[13px]">
              <b>{en}</b> <span className="text-label-2">· {es}</span>
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}

function WritingTask({ exam, text, onChange }: { exam: Exam; text: string; onChange: (t: string) => void }) {
  const W = exam.writing;
  const n = wordCount(text);
  const inRange = n >= W.minWords && n <= W.maxWords;
  return (
    <Card className="p-5">
      <span className="rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ background: tint('var(--orange)', 14), color: ink('var(--orange)') }}>
        {W.genre_es}
      </span>
      <p className="mt-2 text-[16px] leading-snug font-semibold text-pretty">{W.prompt}</p>
      <p className="text-label-2 mt-1 text-[14px]">{W.prompt_es}</p>
      <ul className="mt-3 space-y-1 text-[14px]">
        {W.criteria.map((c) => (
          <li key={c} className="flex gap-2">
            <CheckCircle2 size={15} className="text-ink-green mt-0.5 shrink-0" /> {c}
          </li>
        ))}
      </ul>
      <textarea
        value={text}
        onChange={(e) => onChange(e.target.value)}
        rows={10}
        spellCheck={false}
        autoCorrect="off"
        placeholder="Write your answer here…"
        className="bg-fill-2 placeholder:text-label-3 mt-4 w-full rounded-[14px] p-4 text-[16px] leading-relaxed outline-none focus:ring-2"
      />
      <div className={cn('mt-1 text-right text-[13px] font-semibold tabular-nums', inRange ? 'text-ink-green' : 'text-label-2')}>
        {n} palabras · objetivo {W.minWords}–{W.maxWords}
      </div>
      <p className="text-label-2 mt-2 text-[12.5px]">En el examen no hay traductor ni corrector: escribe con lo que sabes.</p>
    </Card>
  );
}

function SpeakingPrompt({
  n,
  prompt,
  take,
  transcript,
  onTake,
  onTranscript,
}: {
  n: number;
  prompt: Exam['speaking']['prompts'][number];
  take: Take;
  transcript: string;
  onTake: (t: Take) => void;
  onTranscript: (t: string) => void;
}) {
  const [rec, setRec] = useState(false);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const media = useRef<MediaRecorder | null>(null);
  const recog = useRef<{ stop(): void } | null>(null);
  const Recognition = getRecognition();
  const canRecord = typeof window !== 'undefined' && !!navigator.mediaDevices?.getUserMedia && typeof MediaRecorder !== 'undefined';

  useEffect(() => {
    if (!rec) return;
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [rec]);
  useEffect(
    () => () => {
      recog.current?.stop();
      if (media.current?.state === 'recording') media.current.stop();
    },
    [],
  );

  const stop = () => {
    recog.current?.stop();
    if (media.current?.state === 'recording') media.current.stop();
    setRec(false);
  };
  const start = async () => {
    setError(null);
    setSecs(0);
    onTranscript('');
    if (canRecord) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mr = new MediaRecorder(stream);
        const chunks: Blob[] = [];
        mr.ondataavailable = (e) => e.data.size && chunks.push(e.data);
        mr.onstop = () => {
          stream.getTracks().forEach((t) => t.stop());
          if (!chunks.length) return;
          const blob = new Blob(chunks, { type: mr.mimeType || 'audio/webm' });
          onTake({ blob, url: URL.createObjectURL(blob) });
        };
        media.current = mr;
        mr.start();
      } catch {
        setError('Permite el acceso al micrófono para responder.');
        return;
      }
    }
    if (Recognition) {
      const r = new Recognition();
      r.lang = 'en-US';
      r.interimResults = true;
      r.continuous = true;
      r.onresult = (e) => {
        let text = '';
        for (let k = 0; k < e.results.length; k++) text += e.results[k]![0]!.transcript;
        onTranscript(text);
      };
      r.onend = () => !media.current && setRec(false);
      recog.current = r;
      r.start();
    }
    if (!canRecord && !Recognition) {
      setError('Este navegador no puede grabar audio. Prueba con Chrome o Safari actualizados.');
      return;
    }
    setRec(true);
  };

  return (
    <Card className="p-5">
      <div className="flex gap-3">
        <span className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[13px] font-bold text-white" style={{ background: 'var(--pink)' }}>
          {n}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[16px] leading-snug font-semibold text-pretty">{prompt.text}</p>
          <p className="text-label-2 mt-0.5 text-[13.5px]">{prompt.text_es}</p>
          {prompt.tips && prompt.tips.length > 0 && <p className="text-label-2 mt-1.5 text-[13px]">💡 {prompt.tips.join(' · ')}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Button onClick={rec ? stop : start} variant={rec ? 'destructive' : take.blob || transcript ? 'gray' : 'filled'}>
              {rec ? <Square size={14} fill="currentColor" /> : take.blob || transcript ? <RotateCcw size={15} /> : <Mic size={16} />}
              {rec ? 'Terminar' : take.blob || transcript ? 'Grabar de nuevo' : 'Grabar respuesta'}
            </Button>
            <span className={cn('text-[13px] font-semibold tabular-nums', secs > prompt.seconds ? 'text-ink-orange' : 'text-label-2')}>
              {rec ? `● ${secs}s` : ''} / ~{prompt.seconds}s
            </span>
            {take.url && !rec && <audio src={take.url} controls className="h-9 max-w-full" />}
          </div>
          {transcript && <p className="bg-fill-2 mt-3 rounded-[12px] px-3 py-2 text-[14px] italic">“{transcript}”</p>}
          {error && <p className="text-ink-red mt-2 text-[13px]">{error}</p>}
        </div>
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ results --

function Results({ exam, draft, outcome, back, onRetry }: { exam: Exam; draft: Draft; outcome: Outcome; back: { to: string; label: string }; onRetry: () => void }) {
  const { result, writing, speaking, errors } = outcome;
  const passed = result.pct >= PASS_PCT;
  const [review, setReview] = useState<ExamSection | null>(null);
  return (
    <Page back={back} eyebrow={`${levelName(exam.level)} · Resultados`} title={exam.title}>
      <div className="mx-auto max-w-3xl space-y-4">
        <Card className="overflow-hidden">
          <div className={cn('p-6 text-white', passed ? 'bg-[linear-gradient(135deg,#1f8a3d,#1a7f92)]' : 'bg-[linear-gradient(135deg,#c2410c,#be185d)]')}>
            <div className="text-[14px] font-semibold opacity-90">{passed ? '¡Aprobaste!' : 'Aún no alcanzas el 3,0'}</div>
            <div className="mt-1 flex items-end gap-3">
              <span className="text-[56px] leading-none font-extrabold tabular-nums">{result.grade.toFixed(1)}</span>
              <span className="mb-1.5 text-[18px] font-semibold opacity-90">/ 5,0 · {result.pct}%</span>
            </div>
            {Object.values(result.sections).some((v) => v === null) && (
              <p className="mt-2 text-[13px] opacity-90">Una parte quedó pendiente de calificación por tu docente: la nota se calculó con las demás secciones.</p>
            )}
          </div>
          <div className="space-y-3 p-5">
            {EXAM_SECTIONS.map((s) => {
              const v = result.sections[s.id];
              return (
                <button key={s.id} type="button" onClick={() => setReview((r) => (r === s.id ? null : s.id))} className="block w-full text-left">
                  <div className="flex items-center justify-between text-[15px]">
                    <span className="font-semibold">
                      {s.emoji} {s.label}
                    </span>
                    <span className="text-label-2 inline-flex items-center gap-1.5 tabular-nums">
                      {v === null || v === undefined ? 'Pendiente (docente)' : `${v}%`} <Eye size={14} />
                    </span>
                  </div>
                  <ProgressBar value={(v ?? 0) / 100} color={s.color} className="mt-1.5" height={7} />
                </button>
              );
            })}
          </div>
        </Card>

        {errors.length > 0 && (
          <Card className="p-4 text-[13.5px]">
            <div className="text-ink-orange font-semibold">La IA no pudo calificar algunas partes</div>
            <ul className="text-label-2 mt-1 list-disc pl-5">
              {errors.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </Card>
        )}

        {review && OBJECTIVE.includes(review as Objective) && (
          <div>
            <h3 className="text-title-3 mb-2">Revisión · {EXAM_SECTIONS.find((s) => s.id === review)!.label}</h3>
            {review === 'listening' && <ListeningPlayer exam={exam} plays={0} reveal />}
            {review === 'reading' && <ReadingText exam={exam} />}
            <QuestionList questions={questionsOf(exam, review as Objective)} answers={draft.answers[review as Objective]} onAnswer={() => undefined} checked />
          </div>
        )}
        {review === 'writing' && (
          <Card className="space-y-3 p-5">
            <h3 className="text-title-3">Tu writing</h3>
            <p className="bg-fill-2 rounded-[12px] p-3 text-[15px] whitespace-pre-wrap">{draft.writing || '— (sin respuesta)'}</p>
            {writing && <Feedback m={writing} />}
            <details>
              <summary className="text-ink-blue cursor-pointer text-[14px] font-semibold">Ver un modelo de respuesta</summary>
              <p className="mt-2 text-[15px] whitespace-pre-wrap">{exam.writing.model}</p>
            </details>
          </Card>
        )}
        {review === 'speaking' && (
          <div className="space-y-3">
            {exam.speaking.prompts.map((p, i) => (
              <Card key={i} className="space-y-2 p-5">
                <div className="text-headline">
                  {i + 1}. {p.text}
                </div>
                <p className="bg-fill-2 rounded-[12px] p-3 text-[14.5px] italic">{speaking[i]?.transcript || draft.spoken[i] || '— (sin respuesta)'}</p>
                {speaking[i] && <Feedback m={speaking[i]!} />}
              </Card>
            ))}
          </div>
        )}
        {!review && <p className="text-label-2 text-center text-[13.5px]">Toca una sección para revisar tus respuestas y las explicaciones.</p>}

        <div className="flex flex-wrap gap-3">
          <Button variant="gray" onClick={onRetry}>
            <RotateCcw size={16} /> Presentar de nuevo
          </Button>
          <Link to={back.to} className="text-ink-blue inline-flex items-center px-2 text-[15px] font-semibold">
            Volver a {back.label}
          </Link>
        </div>
      </div>
    </Page>
  );
}

function Feedback({ m }: { m: ExamMark }) {
  return (
    <div className="text-[14px]">
      <div className="font-semibold">
        IA: {m.score}/100{m.level ? ` · nivel estimado ${m.level}` : ''}
      </div>
      {m.summary && <p className="text-label-2 mt-1">{m.summary}</p>}
      {m.corrections.length > 0 && (
        <ul className="mt-2 space-y-1">
          {m.corrections.map((c, i) => (
            <li key={i}>
              <span className="text-ink-red line-through">{c.original}</span> → <b className="text-ink-green">{c.correction}</b>
              {c.why && <span className="text-label-2"> — {c.why}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** The attempt for the teacher: the writing (with the whole score sheet) and each spoken answer. */
async function sendToTeacher(exam: Exam, draft: Draft, result: ExamResult, writing: ExamMark | null, speaking: (ExamMark | null)[]) {
  const sheet = [
    `## ${exam.title} · ${levelName(exam.level)}`,
    `**Nota:** ${result.grade.toFixed(1)} / 5,0 (${result.pct}%)`,
    ...EXAM_SECTIONS.map((s) => {
      const v = result.sections[s.id];
      return `- ${s.label}: ${v === null || v === undefined ? 'pendiente de calificación' : `${v}%`}`;
    }),
  ].join('\n');
  const report = { exam: exam.id, level: exam.level, pct: result.pct, grade: result.grade, sections: result.sections };
  await saveWork({
    module: 'writing',
    task: `exam:${exam.id}`,
    prompt: `${exam.title} — Writing: ${exam.writing.prompt}`,
    content: draft.writing.trim() || '(El estudiante no escribió el writing.)',
    report: { ...report, feedback: [sheet, writing ? `### Writing\n${markMarkdown(writing)}` : ''].filter(Boolean).join('\n\n') },
  });
  for (const [i, p] of exam.speaking.prompts.entries()) {
    const text = speaking[i]?.transcript?.trim() || draft.spoken[i]?.trim();
    if (!text) continue;
    await saveWork({
      module: 'speaking',
      task: `exam:${exam.id}:speaking-${i + 1}`,
      prompt: `${exam.title} — Speaking ${i + 1}: ${p.text}`,
      content: text,
      report: { ...report, feedback: speaking[i] ? markMarkdown(speaking[i]!) : undefined },
    });
  }
}
