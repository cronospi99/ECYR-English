/** Saxon genitive ('s): rules, multiple-choice rewrite quiz and a type-it builder. */
import { useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { LevelChip } from '@/components/ui/Misc';
import { ProgressBar } from '@/components/ui/Progress';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { GENITIVE, GENITIVE_BUILD, GENITIVE_RULES, type GenitiveRule } from './data';
import { checkPossessive, possessive, possessiveForms, possessiveWhy } from './genitive';
import { Feedback, OptionButton, RoundSummary, ToolHeader, awardPractice, optState, shuffle, useSay, useShowEs } from './shared';
import { useTimeFamily } from './store';

const RULE_TITLE = Object.fromEntries(GENITIVE_RULES.map((r) => [r.id, r.title])) as Record<GenitiveRule, string>;

/** The seven rules of the possessive ’s with examples. */
export function GenitiveRules({ rules }: { rules?: GenitiveRule[] }) {
  const list = GENITIVE_RULES.filter((r) => !rules || rules.includes(r.id));
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {list.map((r) => (
        <Card key={r.id} className="p-4">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-headline">{r.title}</h4>
            <LevelChip level={r.level} />
          </div>
          <p className="text-label-2 mt-1 text-[14px]">{r.rule}</p>
          <ul className="mt-2 space-y-1">
            {r.examples.map((ex) => (
              <li key={ex} className="bg-fill-2 flex items-center justify-between gap-2 rounded-[10px] py-1 pr-1 pl-3 text-[15px] font-medium">
                <span className="min-w-0">{ex}</span>
                <SpeakButton text={ex.replace(/\s*\(.*\)$/, '').replace(/ = /, ', or, ')} size={15} />
              </li>
            ))}
          </ul>
        </Card>
      ))}
    </div>
  );
}

/** "The mother of Laura is Clara." → choose "Laura’s mother is Clara." */
export function GenitiveQuiz({ rules, rounds = 10 }: { rules?: GenitiveRule[]; rounds?: number }) {
  const answer = useTimeFamily((s) => s.answer);
  const say = useSay();
  const showEs = useShowEs();
  const source = useMemo(() => GENITIVE.filter((g) => !rules || rules.includes(g.rule)), [rules]);
  const total = Math.min(rounds, source.length);
  const [pool, setPool] = useState(() => shuffle(source).slice(0, total));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);
  const item = pool[i]!;
  const options = useMemo(() => shuffle([item.a, ...item.w]), [item]);

  const choose = (o: string) => {
    if (picked) return;
    setPicked(o);
    const ok = o === item.a;
    answer(ok);
    if (ok) setRight((r) => r + 1);
    say(item.a);
  };
  const next = () => {
    if (i + 1 >= pool.length) {
      awardPractice({ tool: 'genitive-quiz', title: 'Saxon genitive', skill: 'grammar', correct: right, total: pool.length });
      setDone(true);
      return;
    }
    setI(i + 1);
    setPicked(null);
  };
  const again = () => {
    setPool(shuffle(source).slice(0, total));
    setI(0);
    setPicked(null);
    setRight(0);
    setDone(false);
  };

  return (
    <Card className="p-5">
      <ToolHeader title="Saxon genitive · El genitivo sajón" sub="Reescribe la frase con ’s o ’." />
      {done ? (
        <RoundSummary correct={right} total={pool.length} onAgain={again} />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <ProgressBar value={(i + (picked ? 1 : 0)) / pool.length} className="flex-1" />
            <span className="text-label-2 text-[13px] font-medium tabular-nums">
              {i + 1}/{pool.length} · ✓ {right}
            </span>
          </div>
          <div className="bg-fill-2 mb-4 rounded-[16px] p-4">
            <div className="text-label-2 text-[12px] font-semibold uppercase">{picked ? RULE_TITLE[item.rule] : 'Rewrite · Reescribe'}</div>
            <p className="mt-0.5 text-[21px] leading-snug font-bold tracking-tight">{item.q}</p>
          </div>
          <div className="space-y-2.5">
            {options.map((o, k) => (
              <OptionButton key={o} label={o} letter={String.fromCharCode(65 + k)} state={optState(picked, o, item.a)} onClick={() => choose(o)} />
            ))}
          </div>
          {picked && (
            <Feedback ok={picked === item.a} className="mt-3">
              <b>{picked === item.a ? '¡Correcto! ' : `The right one is: ${item.a} `}</b>
              {showEs || picked !== item.a ? <span>{item.why}</span> : null}
            </Feedback>
          )}
          {picked && (
            <Button className="mt-3 w-full" size="lg" onClick={next}>
              {i + 1 >= pool.length ? 'Ver resultado' : 'Next · Siguiente'}
            </Button>
          )}
          <p className="text-label-2 mt-4 text-[13px]">
            Singular: <b>Laura’s mother</b> · Plural en -s: <b>my parents’ house</b> · Plural irregular: <b>the children’s dog</b>. El poseedor va primero, después el apóstrofo.
          </p>
        </>
      )}
    </Card>
  );
}

/** Owner + thing → type the possessive phrase ("my parents’ car"). */
export function GenitiveBuilder({ rounds = 8 }: { rounds?: number }) {
  const answer = useTimeFamily((s) => s.answer);
  const say = useSay();
  const showEs = useShowEs();
  const [pool, setPool] = useState(() => shuffle(GENITIVE_BUILD).slice(0, rounds));
  const [i, setI] = useState(0);
  const [text, setText] = useState('');
  const [result, setResult] = useState<boolean | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const it = pool[i]!;
  const model = `${possessive(it.owner, it.kind)} ${it.thing}`;

  const check = () => {
    if (result !== null || !text.trim()) return;
    const ok = checkPossessive(text, it.owner, it.kind, it.thing);
    setResult(ok);
    answer(ok);
    if (ok) setRight((r) => r + 1);
    say(model);
  };
  const next = () => {
    if (i + 1 >= pool.length) {
      awardPractice({ tool: 'genitive-builder', title: 'Build the genitive', skill: 'grammar', correct: right, total: pool.length });
      setDone(true);
      return;
    }
    setI(i + 1);
    setText('');
    setResult(null);
    setTimeout(() => input.current?.focus(), 0);
  };
  const again = () => {
    setPool(shuffle(GENITIVE_BUILD).slice(0, rounds));
    setI(0);
    setText('');
    setResult(null);
    setRight(0);
    setDone(false);
  };
  const insertApos = () => {
    setText((t) => t + '’');
    input.current?.focus();
  };

  return (
    <Card className="p-5">
      <ToolHeader title="Build it · Escríbelo tú" sub="Escribe la frase con el genitivo sajón." />
      {done ? (
        <RoundSummary correct={right} total={pool.length} onAgain={again} />
      ) : (
        <>
          <div className="mb-4 flex items-center gap-3">
            <ProgressBar value={(i + (result !== null ? 1 : 0)) / pool.length} className="flex-1" />
            <span className="text-label-2 text-[13px] font-medium tabular-nums">
              {i + 1}/{pool.length} · ✓ {right}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-[20px] font-bold">
            <span className="rounded-[10px] bg-[color-mix(in_srgb,var(--blue)_14%,transparent)] px-3 py-1">{it.owner}</span>
            <span className="text-label-2">+</span>
            <span className="rounded-[10px] bg-[color-mix(in_srgb,var(--purple)_14%,transparent)] px-3 py-1">{it.thing}</span>
          </div>
          {showEs && <p className="text-label-2 mt-1.5 text-[15px]">{it.es}</p>}
          <form
            className="mt-4 flex flex-wrap gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (result === null) check();
              else next();
            }}
          >
            <label className="bg-fill-2 flex h-11 min-w-0 flex-[1_1_220px] items-center rounded-[12px] px-3">
              <span className="sr-only">Tu respuesta</span>
              <input
                ref={input}
                value={text}
                onChange={(e) => setText(e.target.value)}
                readOnly={result !== null}
                autoCapitalize="off"
                autoCorrect="off"
                spellCheck={false}
                placeholder={`${it.owner}… ${it.thing}`}
                className="placeholder:text-label-3 h-full w-full min-w-0 bg-transparent text-[17px] outline-none"
              />
            </label>
            <Button type="button" variant="gray" onClick={insertApos} disabled={result !== null} aria-label="Insertar apóstrofo">
              ’
            </Button>
            {result === null ? (
              <Button type="submit" disabled={!text.trim()}>
                <Check size={16} /> Comprobar
              </Button>
            ) : (
              <Button type="submit">{i + 1 >= pool.length ? 'Ver resultado' : 'Siguiente'}</Button>
            )}
          </form>
          {result !== null && (
            <Feedback ok={result} className="mt-3">
              <b>{result ? '¡Correcto! ' : 'Not quite. '}</b>
              {possessiveForms(it.owner, it.kind).map((f) => `${f} ${it.thing}`).join('  ·  ')}
              <div className="text-label-2 text-[14px]">{possessiveWhy(it.owner, it.kind)}</div>
            </Feedback>
          )}
        </>
      )}
    </Card>
  );
}
