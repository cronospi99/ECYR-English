import { useEffect, useState } from 'react';
import { Sparkles, Check } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Misc';
import { Markdown } from '@/components/learning/Markdown';
import { askCoach, CoachError } from '@/lib/ai';
import { useProgress } from '@/store/progress';
import { cn } from '@/lib/cn';
import type { CefrLevel } from '@/content/types';

const countWords = (t: string) => (t.trim() ? t.trim().split(/\s+/).length : 0);

export function WritingPad({
  storageKey,
  criteria,
  prompt,
  level,
  title,
}: {
  storageKey: string;
  criteria?: string[];
  prompt: string;
  level: string;
  title: string;
}) {
  const [text, setText] = useState(() => {
    try {
      return localStorage.getItem(storageKey) ?? '';
    } catch {
      return '';
    }
  });
  const [checks, setChecks] = useState<boolean[]>([]);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const award = useProgress((s) => s.award);

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

  const words = countWords(text);

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
      award({ kind: 'writing', title, skill: 'writing', xp: 25, level: level as CefrLevel });
    } catch (e) {
      setError(e instanceof CoachError ? e.message : 'No se pudo obtener feedback.');
    } finally {
      setBusy(false);
    }
  };

  const selfCheck = () => {
    award({ kind: 'writing', title, skill: 'writing', xp: 15, level: level as CefrLevel });
    setFeedback('✅ Texto guardado. Revisa la lista de criterios y marca los que cumples.');
  };

  return (
    <div className="mt-4">
      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={8}
        placeholder="Escribe tu texto en inglés aquí…"
        className="bg-fill-2 placeholder:text-label-3 focus:ring-ios-blue/40 w-full resize-y rounded-[14px] p-4 text-[16px] leading-relaxed outline-none focus:ring-2"
      />
      <div className="text-label-2 mt-1 flex justify-between text-[13px]">
        <span>{words} palabras</span>
        <span>Guardado automáticamente</span>
      </div>

      {criteria && criteria.length > 0 && (
        <ul className="mt-4 space-y-2">
          {criteria.map((c, i) => (
            <li key={c}>
              <button
                type="button"
                onClick={() => setChecks((s) => Object.assign([...s], { [i]: !s[i] }))}
                className="flex w-full items-start gap-3 text-left text-[14px]"
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

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="brand" onClick={getFeedback} disabled={busy || words < 10}>
          {busy ? <Spinner className="h-4 w-4" /> : <Sparkles size={16} />} Feedback con IA
        </Button>
        <Button variant="gray" onClick={selfCheck} disabled={words < 10}>
          Autoevaluar
        </Button>
      </div>
      {error && <p className="text-ios-red mt-3 text-[14px]">{error}</p>}
      {feedback && (
        <div className="bg-fill-2 mt-4 rounded-[14px] p-4 text-[15px]">
          <Markdown text={feedback} />
        </div>
      )}
    </div>
  );
}
