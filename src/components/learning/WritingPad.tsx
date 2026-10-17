import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Sparkles, Check, Send, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Misc';
import { Markdown } from '@/components/learning/Markdown';
import { TranslatorButton } from '@/components/learning/Translator';
import { askCoach, CoachError } from '@/lib/ai';
import { saveWork, wasRecentlySent } from '@/lib/work';
import { useProgress } from '@/store/progress';
import { useAuth } from '@/store/auth';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/cn';
import type { CefrLevel } from '@/content/types';

const countWords = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

/**
 * Where the text was written, when the caller gives no `taskRef`: the unit or
 * the writing-practice page (from the route), else a ref built from the title.
 */
function deriveRef(storageKey: string, pathname: string, title: string) {
  const key = storageKey.replace(/^ecyr:writing:/, '').slice(0, 60);
  if (pathname.startsWith('/learn/')) return `unit:${key}`;
  if (pathname.startsWith('/practice/writing')) return `practice:writing:${key}`;
  const m = /Writing\s+(\w+)\s*·\s*U(\d+)/i.exec(title);
  if (m) return `unit:${m[1]!.toUpperCase()}-${m[2]}`;
  return `writing:${title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || key}`;
}

export function WritingPad({
  taskRef,
  storageKey,
  criteria,
  prompt,
  level,
  title,
}: {
  /** Where the text was written, e.g. "unit:A1-3" (kept with the student's work for the teacher). */
  taskRef?: string;
  storageKey: string;
  criteria?: string[];
  prompt: string;
  level: string;
  title: string;
}) {
  const { pathname } = useLocation();
  const task = taskRef || deriveRef(storageKey, pathname, title);
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(storageKey) ?? '';
    } catch {
      return '';
    }
  });
  const [checks, setChecks] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  /** The text the AI feedback above belongs to. */
  const [feedbackFor, setFeedbackFor] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  /** The exact text last handed to the teacher (sent ✓ while unchanged). */
  const [sentText, setSentText] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const award = useProgress((s) => s.award);
  const signedIn = useAuth((s) => Boolean(s.session));
  const profile = useAuth((s) => s.profile);
  const sandbox = useSettings((s) => s.practiceSandbox);
  const hasTeacher = signedIn && profile?.role === 'student' && Boolean(profile.teacher_id) && !sandbox;

  useEffect(() => {
    const t = setTimeout(() => {
      try {
        localStorage.setItem(storageKey, text);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => clearTimeout(t);
  }, [text, storageKey]);

  // Already sent in this session (e.g. after a reload): show it as sent.
  useEffect(() => {
    if (text.trim() && wasRecentlySent(task, text)) setSentText(text);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [task]);

  const words = countWords(text);
  const sent = sentText !== null && sentText.trim() === text.trim() && Boolean(text.trim());

  const send = async (withFeedback: string | null, explicit: boolean) => {
    if (explicit) {
      setSending(true);
      setSendError(null);
    }
    const r = await saveWork({
      module: 'writing',
      task,
      prompt,
      content: text,
      report: { ...(withFeedback ? { feedback: withFeedback } : {}), title, level, words, ...(criteria?.length ? { criteria } : {}), sentBy: explicit ? 'student' : 'ai-feedback' },
    });
    if (explicit) setSending(false);
    if (r.ok && (r.saved || r.skipped === 'duplicate')) setSentText(text);
    else if (!r.ok && explicit) setSendError(r.error);
  };

  const getFeedback = async () => {
    setBusy(true);
    setError(null);
    try {
      const reply = await askCoach({
        mode: 'writing-feedback',
        level,
        messages: [{ role: 'user', text: `TASK: ${prompt}\n\nCRITERIA:\n${(criteria ?? []).map((c) => `- ${c}`).join('\n')}\n\nMY TEXT:\n${text}` }],
      });
      setFeedback(reply);
      setFeedbackFor(text);
      award({ kind: 'writing', title, skill: 'writing', xp: 25, level: level as CefrLevel, ref: 'practice:writing' });
      // Kept for the teacher with the AI feedback (silently; never blocks the UI).
      void send(reply, false);
    } catch (e) {
      setError(e instanceof CoachError ? e.message : 'No se pudo obtener feedback.');
    } finally {
      setBusy(false);
    }
  };

  const selfCheck = () => {
    award({ kind: 'writing', title, skill: 'writing', xp: 15, level: level as CefrLevel, ref: 'practice:writing' });
    setFeedback('✅ Texto guardado. Revisa la lista de criterios y marca los que cumples.');
    setFeedbackFor(null);
  };

  return (
    <div className="mt-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="Escribe tu texto en inglés aquí…"
        aria-label="Tu texto en inglés"
        className="bg-fill-2 placeholder:text-label-3 focus:ring-ios-blue/40 w-full resize-y rounded-[14px] p-4 text-[16px] leading-relaxed outline-none focus:ring-2"
      />
      <div className="text-label-2 mt-1 flex flex-wrap items-center justify-between gap-2 text-[13px]">
        <span>{words} palabras · guardado automáticamente</span>
        <TranslatorButton />
      </div>

      {criteria && criteria.length > 0 && (
        <ul className="mt-4 space-y-2">
          {criteria.map((c, i) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => setChecks((s) => Object.assign([...s], { [i]: !s[i] }))}
                className="flex w-full items-start gap-3 text-left text-[14px]"
                aria-pressed={Boolean(checks[i])}
              >
                <span
                  className={cn(
                    'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-[1.5px]',
                    checks[i] ? 'bg-ios-green border-ios-green text-white' : 'border-label-3',
                  )}
                >
                  {checks[i] && <Check size={12} strokeWidth={3} />}
                </span>
                <span className={cn(checks[i] && 'text-label-2')}>{c}</span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button variant="brand" onClick={getFeedback} disabled={busy || words < 10}>
          {busy ? <Spinner className="h-4 w-4" /> : <Sparkles size={16} />} Feedback con IA
        </Button>
        <Button variant="gray" onClick={selfCheck} disabled={words < 10}>
          Autoevaluar
        </Button>
        {hasTeacher &&
          (sent ? (
            <span role="status" className="text-ink-green inline-flex h-11 items-center gap-1.5 px-1 text-[15px] font-semibold">
              <Check size={17} strokeWidth={2.6} aria-hidden /> Enviado ✓ · tu docente puede verlo
            </span>
          ) : (
            <Button variant="tinted" onClick={() => void send(feedbackFor === text ? feedback : null, true)} disabled={sending || words < 10}>
              {sending ? <Spinner className="h-4 w-4" /> : <Send size={16} aria-hidden />} Enviar a mi docente
            </Button>
          ))}
      </div>
      {hasTeacher && (
        <p className="text-label-2 mt-2 flex items-start gap-1.5 text-[12.5px]">
          <Eye size={14} className="mt-px shrink-0" aria-hidden />
          Tu docente puede ver los textos que envías y los que corriges con la IA.
        </p>
      )}
      {sendError && <p className="text-ink-red mt-2 text-[14px]">{sendError}</p>}
      {error && <p className="text-ink-red mt-3 text-[14px]">{error}</p>}
      {feedback && (
        <div className="bg-fill-2 mt-4 rounded-[14px] p-4 text-[15px]">
          <Markdown text={feedback} />
        </div>
      )}
    </div>
  );
}
