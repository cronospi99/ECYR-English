import { useEffect, useState } from 'react';
import { Eye, EyeOff, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Misc';
import { QuestionSet } from '@/components/learning/QuestionSet';
import type { CefrLevel } from '@/content/types';
import { useAuth } from '@/store/auth';
import { useProgress } from '@/store/progress';
import { isSupabaseConfigured } from '@/lib/supabase';
import { PodcastError, fetchQuizzes, generateQuiz, type PodcastEpisode, type PodcastQuiz, type PodcastQuizRow } from '@/lib/podcasts';
import { ink, tint } from '@/lib/color';

const COLOR = 'var(--skill-listening)';

/**
 * Questions about the episode, written by Gemini after listening to it (the
 * `podcast` Edge Function). Made once per episode and level, then shared with
 * everyone: a quiz a teacher generated is ready for the whole class.
 */
export function AiQuiz({ ep, level, showName, onLevel }: { ep: PodcastEpisode; level: CefrLevel; showName: string; onLevel: (l: CefrLevel) => void }) {
  const session = useAuth((s) => s.session);
  const [rows, setRows] = useState<PodcastQuizRow[] | null>(null);
  const [quiz, setQuiz] = useState<PodcastQuiz | null>(null);
  const [busy, setBusy] = useState(false);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState<PodcastError | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchQuizzes(ep.key).then((r) => {
      if (!alive) return;
      setRows(r);
      setQuiz(r.find((x) => x.level === level)?.quiz ?? null);
    });
    return () => {
      alive = false;
    };
  }, [ep.key, level]);

  useEffect(() => {
    if (!busy) return;
    setSecs(0);
    const t = setInterval(() => setSecs((s) => s + 1), 1000);
    return () => clearInterval(t);
  }, [busy]);

  const generate = async () => {
    setBusy(true);
    setError(null);
    try {
      setQuiz(await generateQuiz(ep, level));
    } catch (e) {
      setError(e instanceof PodcastError ? e : new PodcastError('The questions could not be generated.', 'server'));
    } finally {
      setBusy(false);
    }
  };

  if (!rows) {
    return (
      <Card className="text-label-2 flex items-center justify-center p-8">
        <Spinner />
      </Card>
    );
  }

  if (quiz) return <QuizView quiz={quiz} ep={ep} level={level} showName={showName} />;

  const others = rows.filter((r) => r.level !== level);
  return (
    <Card className="p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px]" style={{ background: tint(COLOR, 16), color: ink(COLOR) }}>
          <Sparkles size={22} />
        </span>
        <div className="min-w-0">
          <h4 className="text-[17px] font-bold">There are no level {level} questions for this episode yet</h4>
          <p className="text-label-2 mt-1 text-[14px] leading-snug">
            The AI listens to the episode and writes 8–10 questions (multiple choice, true/false and fill-in) with explanations in Spanish. They are made only once and stay available for all your classmates. If the episode is long, the questions cover only the first part.
          </p>
        </div>
      </div>

      {others.length > 0 && (
        <div className="mt-4 flex flex-wrap items-center gap-2 text-[14px]">
          <span className="text-label-2">Questions already exist at:</span>
          {others.map((r) => (
            <Button key={r.level} size="sm" variant="tinted" onClick={() => onLevel(r.level)}>
              {r.level}
            </Button>
          ))}
        </div>
      )}

      <div className="mt-5">
        {!isSupabaseConfigured ? (
          <p className="text-label-2 text-[14px]">AI questions are not available in this serverless version. Use the listening guide.</p>
        ) : !session ? (
          <p className="text-label-2 text-[14px]">Sign in to generate AI questions. In the meantime, the listening guide is ready to use.</p>
        ) : (
          <Button onClick={() => void generate()} disabled={busy}>
            {busy ? <Spinner className="h-4 w-4" /> : <Sparkles size={16} />} {busy ? 'Listening to the episode…' : 'Generate AI questions'}
          </Button>
        )}
        {busy && (
          <p className="text-label-2 mt-2 text-[13px]">
            The AI is listening to the audio and writing the questions ({secs} s). It can take up to a minute; you can keep listening meanwhile.
          </p>
        )}
        {error && (
          <div className="mt-3 rounded-[12px] px-3 py-2.5 text-[14px] leading-snug" style={{ background: tint('var(--red)', 12) }}>
            <span className="text-ink-red font-semibold">{error.message}</span>
            {error.code !== 'limit' && <span className="text-label-2 block">In the meantime, work with the listening guide: it doesn’t need AI.</span>}
          </div>
        )}
      </div>
    </Card>
  );
}

function QuizView({ quiz, ep, level, showName }: { quiz: PodcastQuiz; ep: PodcastEpisode; level: CefrLevel; showName: string }) {
  const award = useProgress((s) => s.award);
  const [summary, setSummary] = useState(false);
  return (
    <div className="space-y-4">
      <div className="text-label-2 flex items-start gap-2 px-1 text-[13px] leading-snug">
        <Sparkles size={15} className="mt-0.5 shrink-0" style={{ color: ink(COLOR) }} />
        <span>
          Questions generated by AI from the audio of “{showName}”; they may contain mistakes. {quiz.partial && quiz.covered_minutes ? ` They cover roughly the first ${quiz.covered_minutes} minutes.` : ''} </span>
      </div>

      {quiz.vocab.length > 0 && (
        <Card className="p-4 sm:p-5">
          <h4 className="text-[16px] font-bold">Key vocabulary</h4>
          <p className="text-label-2 text-[13px]">Review it before listening.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            {quiz.vocab.map(([en, es]) => (
              <span key={en} className="bg-fill-2 rounded-full px-3 py-1 text-[14px]">
                <b>{en}</b> <span className="text-label-2">· {es}</span>
              </span>
            ))}
          </div>
        </Card>
      )}

      <QuestionSet
        questions={quiz.questions}
        color={COLOR}
        onChecked={(right, total) =>
          award({
            kind: 'listening',
            title: `Podcast: ${ep.title}`.slice(0, 120),
            skill: 'listening',
            xp: 6 + right,
            score: Math.round((right / total) * 100),
            level,
            ref: `listening:podcast-${ep.collectionId}-${ep.trackId}`,
          })
        }
      />

      {quiz.summary_es && (
        <Card className="p-4 sm:p-5">
          <Button variant="gray" size="sm" onClick={() => setSummary((s) => !s)}>
            {summary ? <EyeOff size={15} /> : <Eye size={15} />} {summary ? 'Hide summary' : 'See summary (after listening)'}
          </Button>
          {summary && <p className="mt-3 text-[15px] leading-relaxed">{quiz.summary_es}</p>}
        </Card>
      )}
    </div>
  );
}
