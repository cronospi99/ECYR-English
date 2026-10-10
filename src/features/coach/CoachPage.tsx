import { useEffect, useRef, useState } from 'react';
import { ArrowUp, Sparkles, Trash2, LogIn } from 'lucide-react';
import { motion } from 'motion/react';
import { Page } from '@/components/ui/Page';
import { Card } from '@/components/ui/Card';
import { Segmented } from '@/components/ui/Segmented';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Misc';
import { Markdown } from '@/components/learning/Markdown';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { askCoach, CoachError, type ChatMessage, type CoachMode } from '@/lib/ai';
import { useAuth } from '@/store/auth';
import { useProgress, currentLevel } from '@/store/progress';
import { CEFR_LEVELS, type CefrLevel } from '@/content/types';
import { isSupabaseConfigured } from '@/lib/supabase';
import { cn } from '@/lib/cn';

const STARTERS: Record<CoachMode, string[]> = {
  chat: ['Let’s talk about my weekend', 'Practice a job interview with me', 'Ask me questions about travel', 'Role-play: ordering food in a restaurant'],
  correct: ['Yesterday I go to the cinema with my friends and we watch a very good movie.', 'I am agree with you but I think is more better study in the morning.'],
  explain: ['¿Cuándo uso present perfect y cuándo past simple?', 'Diferencia entre “make” y “do”', 'Explícame los condicionales con ejemplos', '¿Cómo uso “used to”?'],
  'writing-feedback': [],
};

const STORAGE = 'ecyr:coach-chat';

export default function CoachPage() {
  const session = useAuth((s) => s.session);
  const units = useProgress((s) => s.units);
  const award = useProgress((s) => s.award);
  const [mode, setMode] = useState<CoachMode>('chat');
  const [level, setLevel] = useState<CefrLevel>(currentLevel(units));
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(STORAGE) ?? '[]') as ChatMessage[];
    } catch {
      return [];
    }
  });
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE, JSON.stringify(messages.slice(-40)));
    } catch {
      /* ignore */
    }
    end.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages, busy]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || busy) return;
    const next = [...messages, { role: 'user' as const, text: t }];
    setMessages(next);
    setInput('');
    setBusy(true);
    setError(null);
    try {
      const reply = await askCoach({ messages: next, mode, level });
      setMessages([...next, { role: 'model', text: reply || '…' }]);
      if (next.filter((m) => m.role === 'user').length % 3 === 1) {
        award({ kind: 'coach', title: 'Conversación con el AI Coach', skill: mode === 'chat' ? 'speaking' : 'grammar', xp: 5, level, ref: `coach:${mode}` });
      }
    } catch (e) {
      setError(e instanceof CoachError ? e.message : 'No se pudo contactar al coach.');
    } finally {
      setBusy(false);
    }
  };

  const gated = !isSupabaseConfigured || !session;

  return (
    <Page
      title={
        <span className="inline-flex items-center gap-2">
          <Sparkles className="text-ios-purple" /> AI Coach
        </span>
      }
      subtitle="Tu tutor personal: conversa en inglés, corrige tus frases y entiende la gramática a tu nivel."
      actions={
        messages.length > 0 && (
          <Button variant="gray" size="sm" onClick={() => setMessages([])}>
            <Trash2 size={14} /> Nueva conversación
          </Button>
        )
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Segmented<CoachMode>
          value={mode}
          onChange={setMode}
          options={[
            { value: 'chat', label: 'Conversar' },
            { value: 'correct', label: 'Corregir' },
            { value: 'explain', label: 'Explicar' },
          ]}
        />
        <div className="flex gap-1.5">
          {CEFR_LEVELS.map((l) => (
            <Chip key={l} active={level === l} onClick={() => setLevel(l)} className="h-8 px-3">
              {l}
            </Chip>
          ))}
        </div>
      </div>

      <Card className="flex h-[calc(100dvh-330px)] min-h-[420px] flex-col overflow-hidden lg:h-[calc(100dvh-300px)]">
        <div className="flex-1 space-y-3 overflow-y-auto p-4 sm:p-6">
          {gated ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="text-[64px]">🤖</div>
              <h3 className="text-title-3 mt-2">Inicia sesión para chatear</h3>
              <p className="text-label-2 mt-1 max-w-sm text-[15px]">
                {isSupabaseConfigured
                  ? 'El coach usa la IA de tu clase de forma segura: tu cuenta protege la clave y tu cuota.'
                  : 'Este despliegue aún no tiene Supabase configurado (variables VITE_SUPABASE_*).'}
              </p>
              {isSupabaseConfigured && (
                <ButtonLink to="/profile" className="mt-5">
                  <LogIn size={16} /> Iniciar sesión
                </ButtonLink>
              )}
            </div>
          ) : messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="text-[56px]">👋</div>
              <h3 className="text-title-3 mt-2">
                {mode === 'chat' ? 'Hi! What would you like to talk about?' : mode === 'correct' ? 'Escribe una frase y la corrijo' : '¿Qué tema quieres entender?'}
              </h3>
              <div className="mt-5 flex max-w-xl flex-wrap justify-center gap-2">
                {STARTERS[mode].map((s) => (
                  <button key={s} type="button" onClick={() => void send(s)} className="bg-fill-2 hover:bg-fill rounded-full px-4 py-2 text-[14px] transition-colors">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}
              >
                <div
                  className={cn(
                    'max-w-[85%] rounded-[20px] px-4 py-2.5 text-[16px]',
                    m.role === 'user' ? 'bg-ios-blue rounded-br-[6px] text-white' : 'bg-fill rounded-bl-[6px]',
                  )}
                >
                  {m.role === 'model' ? (
                    <div className="flex items-start gap-1">
                      <div className="min-w-0 flex-1">
                        <Markdown text={m.text} />
                      </div>
                      <SpeakButton text={m.text.replace(/[*#`]/g, '')} size={15} className="-mr-2 shrink-0" />
                    </div>
                  ) : (
                    <span className="whitespace-pre-wrap">{m.text}</span>
                  )}
                </div>
              </motion.div>
            ))
          )}
          {busy && (
            <div className="flex justify-start">
              <div className="bg-fill flex gap-1 rounded-[20px] rounded-bl-[6px] px-4 py-3.5">
                {[0, 1, 2].map((k) => (
                  <motion.span
                    key={k}
                    className="bg-label-2 h-2 w-2 rounded-full"
                    animate={{ opacity: [0.3, 1, 0.3] }}
                    transition={{ duration: 1, repeat: Infinity, delay: k * 0.2 }}
                  />
                ))}
              </div>
            </div>
          )}
          {error && <p className="text-ios-red text-center text-[14px]">{error}</p>}
          <div ref={end} />
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send(input);
          }}
          className="hairline-t flex items-end gap-2 p-3"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send(input);
              }
            }}
            disabled={gated}
            rows={1}
            placeholder={gated ? 'Inicia sesión para escribir…' : mode === 'correct' ? 'Pega tu frase o párrafo…' : 'Escribe un mensaje…'}
            className="bg-fill-2 placeholder:text-label-3 max-h-40 min-h-[40px] flex-1 resize-none rounded-[20px] px-4 py-2.5 text-[16px] outline-none"
          />
          <button
            type="submit"
            disabled={gated || busy || !input.trim()}
            aria-label="Enviar"
            className="bg-ios-blue flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-30"
          >
            <ArrowUp size={20} strokeWidth={2.6} />
          </button>
        </form>
      </Card>
    </Page>
  );
}
