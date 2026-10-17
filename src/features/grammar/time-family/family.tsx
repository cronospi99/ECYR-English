/**
 * Family vocabulary: word cards, a vocabulary quiz, the "Guess who" riddles,
 * the family-tree builder with its quiz, and the printable homework.
 */
import { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ClipboardCopy, Minus, Plus, Printer, Sparkles, Trash2, UserPlus, Volume2, X } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Misc';
import { ProgressBar, ProgressRing } from '@/components/ui/Progress';
import { Quiz, type QuizItem } from '@/components/learning/Quiz';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { Callout } from '@/components/learning/Callout';
import { useSettings } from '@/store/settings';
import { cn } from '@/lib/cn';
import { GENS, HOMEWORK, REL_ES, RIDDLES, RIDDLE_ANSWERS, TINTS, VOCAB, VOCAB_GROUPS, type VocabGroup } from './data';
import { Feedback, OptionButton, RoundSummary, ToolHeader, awardPractice, optState, shuffle, speakEs, useSay, useShowEs } from './shared';
import { useTimeFamily, type Member } from './store';

const esOf = (en: string) => VOCAB.find((v) => v.en === en)?.es ?? REL_ES[en] ?? '';
/** Spanish relation for "tu …": "Primo / Prima" → "primo/a". */
const esRel = (rel: string) => (REL_ES[rel] ?? rel).toLowerCase().replace(/^(\S+)o \/ \S+a$/, '$1o/a');

// ------------------------------------------------------------ word cards --

export function FamilyWords({ group: fixed }: { group?: VocabGroup }) {
  const [group, setGroup] = useState<VocabGroup | 'all'>(fixed ?? 'Immediate');
  const say = useSay();
  const showEs = useShowEs();
  const rate = useSettings((s) => s.speechRate);
  const list = VOCAB.filter((v) => group === 'all' || v.g === group);
  return (
    <div>
      {!fixed && (
        <div className="no-scrollbar -mx-1 mb-4 flex gap-2 overflow-x-auto px-1 py-1">
          {VOCAB_GROUPS.map((g) => (
            <Chip key={g.id} active={group === g.id} onClick={() => setGroup(g.id)}>
              {g.id}
              {showEs && <span className="opacity-60"> · {g.es}</span>}
            </Chip>
          ))}
          <Chip active={group === 'all'} onClick={() => setGroup('all')}>
            Todas · {VOCAB.length}
          </Chip>
        </div>
      )}
      <div className="grid grid-cols-2 gap-2.5 sm:gap-3 lg:grid-cols-3 xl:grid-cols-4">
        {list.map((v) => (
          <Card key={v.en} className="flex min-w-0 flex-col p-3.5 sm:p-4">
            <div className="text-[18px] leading-tight font-bold tracking-tight [overflow-wrap:anywhere] sm:text-[21px]">{v.en}</div>
            {showEs && <div className="text-label-2 text-[14px] sm:text-[15px]">{v.es}</div>}
            <div className="text-label-2 mt-1 font-mono text-[12.5px] tracking-wide">/ {v.say} /</div>
            {v.note && <div className="text-ink-indigo mt-1 text-[13px]">{v.note}</div>}
            <div className="mt-auto flex gap-2 pt-3">
              <Button size="sm" variant="tinted" className="flex-1" onClick={() => say(v.en)} aria-label={`Escuchar ${v.en}`}>
                <Volume2 size={14} /> EN
              </Button>
              <Button size="sm" variant="gray" className="flex-1" onClick={() => speakEs(v.es.split(/ \/ | \(/)[0]!, rate)} aria-label={`Escuchar ${v.es}`}>
                <Volume2 size={14} /> ES
              </Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------- vocabulary quiz --

function makeVocabItems(n: number, group?: VocabGroup): QuizItem[] {
  const pool = VOCAB.filter((v) => !group || v.g === group);
  return shuffle(pool)
    .slice(0, n)
    .map((v, i) => {
      const same = shuffle(VOCAB.filter((x) => x.en !== v.en && x.g === v.g));
      const other = shuffle(VOCAB.filter((x) => x.en !== v.en && x.g !== v.g));
      const wrong = [...same, ...other].slice(0, 3);
      return i % 2 === 0
        ? { q: `¿Cómo se dice “${v.es}” en inglés?`, options: [v.en, ...wrong.map((w) => w.en)], answer: 0, explain: `${v.en} = ${v.es}` }
        : { q: `What does “${v.en}” mean?`, options: [v.es, ...wrong.map((w) => w.es)], answer: 0, explain: `${v.en} /${v.say}/ = ${v.es}` };
    });
}

/** Ten-question vocabulary quiz (EN ⇄ ES), shuffled options. */
export function FamilyVocabQuiz({ group, count = 10 }: { group?: VocabGroup; count?: number }) {
  const [seed, setSeed] = useState(0);
  const items = useMemo(() => makeVocabItems(count, group), [count, group, seed]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Card className="p-5">
      <ToolHeader title="Family words quiz" sub="Inglés ⇄ español" right={<Button size="sm" variant="gray" onClick={() => setSeed((s) => s + 1)}>Nuevas palabras</Button>} />
      <Quiz
        key={seed}
        items={items}
        shuffle
        onFinish={(score) => awardPractice({ tool: 'vocab', title: 'Family words', skill: 'vocabulary', correct: Math.round((score / 100) * items.length), total: items.length })}
      />
    </Card>
  );
}

// ------------------------------------------------------------- riddles --

/** "Guess who": Your mother's brother is your… */
export function FamilyRiddles({ rounds = 10 }: { rounds?: number }) {
  const answer = useTimeFamily((s) => s.answer);
  const say = useSay();
  const showEs = useShowEs();
  const [pool, setPool] = useState(() => shuffle(RIDDLES).slice(0, rounds));
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<string | null>(null);
  const [right, setRight] = useState(0);
  const [done, setDone] = useState(false);
  const r = pool[i]!;
  const options = useMemo(() => shuffle([r.a, ...shuffle(RIDDLE_ANSWERS.filter((a) => a !== r.a)).slice(0, 3)]), [r]);

  const choose = (o: string) => {
    if (picked) return;
    setPicked(o);
    const ok = o === r.a;
    answer(ok);
    if (ok) setRight((x) => x + 1);
    say(`${r.q.replace('…', '')} ${r.a.toLowerCase()}.`);
  };
  const next = () => {
    if (i + 1 >= pool.length) {
      awardPractice({ tool: 'riddles', title: 'Guess who', skill: 'vocabulary', correct: right, total: pool.length });
      setDone(true);
      return;
    }
    setI(i + 1);
    setPicked(null);
  };
  const again = () => {
    setPool(shuffle(RIDDLES).slice(0, rounds));
    setI(0);
    setPicked(null);
    setRight(0);
    setDone(false);
  };

  return (
    <Card className="p-5">
      <ToolHeader title="Guess who · Adivina el parentesco" />
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
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
            <div className="bg-fill-2 rounded-[18px] p-5">
              <p className="text-[24px] leading-snug font-bold tracking-tight">{r.q}</p>
              {showEs && <p className="text-label-2 mt-1 text-[16px]">{r.qEs}</p>}
              <SpeakButton text={r.q.replace('…', '')} className="mt-2" />
            </div>
            <div className="space-y-2.5">
              {options.map((o, k) => (
                <OptionButton key={o} label={o} sub={showEs ? esOf(o) : undefined} letter={String.fromCharCode(65 + k)} state={optState(picked, o, r.a)} onClick={() => choose(o)} />
              ))}
              {picked && (
                <Feedback ok={picked === r.a}>
                  <b>{picked === r.a ? `Yes! ${r.a}.` : `No — it is your ${r.a.toLowerCase()}.`}</b>
                  {showEs && <span className="text-label-2"> {esOf(r.a)}</span>}
                </Feedback>
              )}
              {picked && (
                <Button className="w-full" size="lg" onClick={next}>
                  {i + 1 >= pool.length ? 'Ver resultado' : 'Next riddle · Siguiente'}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </Card>
  );
}

// ---------------------------------------------------------- family tree --

const sentenceFor = (m: Member) => (m.rel === 'Me' ? `My name is ${m.name}.` : `${m.name} is my ${m.rel.toLowerCase()}.`);

function TreeView({ members, onRemove }: { members: Member[]; onRemove?: (id: string) => void }) {
  const say = useSay();
  const showEs = useShowEs();
  const reduce = useReducedMotion();
  const rows = GENS.map((g, gi) => ({ g, gi, cards: members.filter((m) => g.rels.includes(m.rel)) })).filter((r) => r.cards.length);
  if (!rows.length)
    return <p className="text-label-2 py-10 text-center text-[16px]">Elige un parentesco, escribe un nombre y tu árbol crecerá aquí.</p>;
  return (
    <div className="flex flex-col items-center">
      {rows.map(({ g, gi, cards }, ri) => (
        <div key={g.key} className="flex w-full flex-col items-center">
          <div className="text-label-2 mb-2 text-[12px] font-semibold tracking-wide uppercase">
            {g.title}
            {showEs && <span className="opacity-70"> · {g.titleEs}</span>}
          </div>
          <div className="flex w-full flex-wrap justify-center gap-2.5">
            <AnimatePresence initial={false}>
              {cards.map((m, i) => {
                const tint = m.rel === 'Me' ? 'var(--blue)' : TINTS[(gi + i) % TINTS.length]!;
                return (
                  <motion.div
                    key={m.id}
                    layout={!reduce}
                    initial={reduce ? false : { opacity: 0, scale: 0.85 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.85 }}
                    className="relative w-[calc(50%-5px)] min-w-0 rounded-[16px] p-3 sm:w-[168px]"
                    style={{ background: `color-mix(in srgb, ${tint} ${m.rel === 'Me' ? 20 : 14}%, var(--card))`, boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${tint} 30%, transparent)` }}
                  >
                    <div className="truncate pr-6 text-[18px] leading-tight font-bold">{m.name}</div>
                    <div className="truncate text-[13px] font-semibold" style={{ color: `color-mix(in srgb, ${tint} 70%, var(--label))` }}>
                      {m.rel}
                    </div>
                    {showEs && <div className="text-label-2 truncate text-[12.5px]">{REL_ES[m.rel]}</div>}
                    <button type="button" onClick={() => say(sentenceFor(m))} className="text-ink-blue mt-1.5 inline-flex items-center gap-1 text-[13px] font-semibold" aria-label={`Decir: ${sentenceFor(m)}`}>
                      <Volume2 size={13} /> Say
                    </button>
                    {onRemove && (
                      <button
                        type="button"
                        onClick={() => onRemove(m.id)}
                        className="text-label-2 hover:bg-fill absolute top-1.5 right-1.5 rounded-full p-1"
                        aria-label={`Quitar a ${m.name}`}
                      >
                        <X size={14} />
                      </button>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
          {ri < rows.length - 1 && <div className="my-2 h-6 w-0 border-l-2 border-dashed border-[var(--separator)]" aria-hidden />}
        </div>
      ))}
    </div>
  );
}

/** Build your own family tree (saved on this device). */
export function FamilyTree({ withQuiz = true }: { withQuiz?: boolean }) {
  const { members, addMember, removeMember, loadSample, clearTree } = useTimeFamily();
  const [rel, setRel] = useState('Me');
  const [name, setName] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const showEs = useShowEs();
  const add = () => {
    if (!name.trim()) return input.current?.focus();
    addMember(name, rel);
    setName('');
    input.current?.focus();
  };
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <ToolHeader title="Family tree generator · Generador de árbol familiar" sub="1. Elige el parentesco · 2. Escribe el nombre · 3. Añádelo" />
        <div className="space-y-3">
          {GENS.map((g) => (
            <div key={g.key}>
              <div className="text-label-2 mb-1.5 text-[12px] font-semibold tracking-wide uppercase">
                {g.title}
                {showEs && <span className="opacity-70"> · {g.titleEs}</span>}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {g.rels.map((r) => (
                  <Chip key={r} active={rel === r} onClick={() => setRel(r)} className="h-8 px-3 text-[13.5px]">
                    {r}
                  </Chip>
                ))}
              </div>
            </div>
          ))}
        </div>
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            add();
          }}
        >
          <label className="bg-fill-2 flex h-11 min-w-0 flex-[1_1_220px] items-center rounded-[12px] px-3">
            <span className="sr-only">Nombre</span>
            <input
              ref={input}
              value={name}
              maxLength={40}
              onChange={(e) => setName(e.target.value)}
              placeholder={rel === 'Me' ? 'Your name · Tu nombre' : `Name of your ${rel.toLowerCase()} · Nombre`}
              className="placeholder:text-label-3 h-full w-full min-w-0 bg-transparent text-[16px] outline-none"
            />
          </label>
          <Button type="submit" className="flex-[0_0_auto]">
            <UserPlus size={16} /> Add {rel}
          </Button>
        </form>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button size="sm" variant="gray" onClick={loadSample}>
            <Sparkles size={14} /> Example tree
          </Button>
          {members.length > 0 &&
            (confirmClear ? (
              <>
                <Button size="sm" variant="destructive" onClick={() => (clearTree(), setConfirmClear(false))}>
                  <Trash2 size={14} /> ¿Borrar todo?
                </Button>
                <Button size="sm" variant="plain" onClick={() => setConfirmClear(false)}>
                  Cancelar
                </Button>
              </>
            ) : (
              <Button size="sm" variant="gray" onClick={() => setConfirmClear(true)}>
                <Trash2 size={14} /> Clear
              </Button>
            ))}
        </div>
      </Card>
      <Card className="p-5">
        <TreeView members={members} onRemove={removeMember} />
      </Card>
      {withQuiz && <TreeQuiz />}
    </div>
  );
}

interface TreeQ {
  q: string;
  qEs: string;
  correct: string;
  options: string[];
}

function makeTreeQ(members: Member[]): TreeQ | null {
  const ms = members.filter((m) => m.rel !== 'Me');
  if (ms.length < 3 || new Set(ms.map((m) => m.rel)).size < 2) return null;
  const p = ms[Math.floor(Math.random() * ms.length)]!;
  // never offer a second person with the same relation (two cousins would both be right)
  const others = shuffle(ms.filter((m) => m.rel !== p.rel));
  if (Math.random() < 0.5) {
    const names = [...new Set(others.map((m) => m.name))].filter((n) => n !== p.name).slice(0, 3);
    if (names.length) return { q: `Who is your ${p.rel.toLowerCase()}?`, qEs: `¿Quién es tu ${esRel(p.rel)}?`, correct: p.name, options: shuffle([p.name, ...names]) };
  }
  const rels = [...new Set(others.map((m) => m.rel))].slice(0, 3);
  return { q: `What is ${p.name} to you?`, qEs: `¿Qué es ${p.name} para ti?`, correct: p.rel, options: shuffle([p.rel, ...rels]) };
}

/** Questions about the learner's own tree. */
export function TreeQuiz({ rounds = 5 }: { rounds?: number }) {
  const members = useTimeFamily((s) => s.members);
  const answer = useTimeFamily((s) => s.answer);
  const showEs = useShowEs();
  const say = useSay();
  const [q, setQ] = useState<TreeQ | null>(null);
  const [picked, setPicked] = useState<string | null>(null);
  const [n, setN] = useState(0);
  const [right, setRight] = useState(0);
  const ask = () => {
    setQ(makeTreeQ(members));
    setPicked(null);
  };
  const choose = (o: string) => {
    if (!q || picked) return;
    setPicked(o);
    const ok = o === q.correct;
    answer(ok);
    const r = right + (ok ? 1 : 0);
    setRight(r);
    const done = n + 1;
    setN(done);
    if (done % rounds === 0) awardPractice({ tool: 'tree', title: 'My family tree', skill: 'vocabulary', correct: r, total: rounds });
    if (done % rounds === 0) setRight(0);
    say(q.correct);
  };
  const can = makeTreeQ(members) !== null;
  return (
    <Card className="p-5">
      <ToolHeader title="Quiz me on my tree · Pregúntame" sub={`Rondas de ${rounds} preguntas sobre tu propio árbol.`} right={<span className="text-label-2 text-[13px] tabular-nums">{n % rounds}/{rounds}</span>} />
      {!q ? (
        <p className="text-label-2 text-[15px]">{can ? 'Pulsa “Ask me” para empezar.' : 'Añade al menos 3 personas con 2 parentescos distintos (además de ti).'}</p>
      ) : (
        <>
          <p className="text-[22px] font-bold tracking-tight">{q.q}</p>
          {showEs && <p className="text-label-2 text-[15px]">{q.qEs}</p>}
          <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {q.options.map((o, k) => (
              <OptionButton key={o} label={o} letter={String.fromCharCode(65 + k)} state={optState(picked, o, q.correct)} onClick={() => choose(o)} />
            ))}
          </div>
          {picked && (
            <Feedback ok={picked === q.correct} className="mt-3">
              {picked === q.correct ? '¡Correcto! ' : 'The answer was '}
              <b>{q.correct}</b>.
            </Feedback>
          )}
        </>
      )}
      <Button className="mt-4" variant={q && !picked ? 'gray' : 'filled'} onClick={ask} disabled={!can}>
        {q ? 'Ask me another' : 'Ask me'}
      </Button>
    </Card>
  );
}

// ------------------------------------------------------------- homework --

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

function printTree(members: Member[], showEs: boolean) {
  const rows = GENS.map((g) => ({ g, ms: members.filter((m) => g.rels.includes(m.rel)) })).filter((r) => r.ms.length);
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>My family tree</title><style>
    body{font-family:-apple-system,system-ui,'Segoe UI',Roboto,sans-serif;color:#111;margin:32px;text-align:center}
    h1{font-size:28px;margin:0 0 4px}p.sub{color:#666;margin:0 0 24px}
    .gen{margin:0 0 18px}.gen h2{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:#888;margin:0 0 8px}
    .row{display:flex;flex-wrap:wrap;justify-content:center;gap:10px}
    .card{border:1.5px solid #bbb;border-radius:12px;padding:8px 14px;min-width:120px}
    .card.me{border-color:#007aff;background:#eef5ff}.n{font-weight:700;font-size:17px}.r{font-size:13px;color:#444}.e{font-size:12px;color:#888}
    .link{height:14px;border-left:2px dashed #bbb;width:0;margin:0 auto 6px}
  </style></head><body><h1>My family tree</h1><p class="sub">${esc(HOMEWORK.task)}</p>${rows
    .map(
      ({ g, ms }, i) =>
        `${i ? '<div class="link"></div>' : ''}<div class="gen"><h2>${esc(g.title)}${showEs ? ' · ' + esc(g.titleEs) : ''}</h2><div class="row">${ms
          .map((m) => `<div class="card${m.rel === 'Me' ? ' me' : ''}"><div class="n">${esc(m.name)}</div><div class="r">${esc(m.rel)}</div>${showEs ? `<div class="e">${esc(REL_ES[m.rel] ?? '')}</div>` : ''}</div>`)
          .join('')}</div></div>`,
    )
    .join('')}</body></html>`;
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;';
  document.body.appendChild(frame);
  const doc = frame.contentWindow?.document;
  if (!doc) return frame.remove();
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    frame.contentWindow?.focus();
    frame.contentWindow?.print();
    setTimeout(() => frame.remove(), 1000);
  }, 150);
}

/** Homework: a tree with at least N named relatives — print it or copy it. */
export function FamilyHomework() {
  const { members, homeworkMin, setHomeworkMin } = useTimeFamily();
  const showEs = useShowEs();
  const [copied, setCopied] = useState(false);
  const named = members.filter((m) => m.name && m.rel !== 'Me').length;
  const complete = named >= homeworkMin;
  const copy = async () => {
    const txt = 'My family tree\n' + members.map((m) => `${m.name} — ${m.rel}${REL_ES[m.rel] ? ` (${REL_ES[m.rel]})` : ''}`).join('\n');
    try {
      await navigator.clipboard.writeText(txt);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card className="p-5 sm:p-6">
        <div className="text-label-2 text-[13px] font-semibold tracking-wide uppercase">Homework · Tarea</div>
        <p className="mt-1 text-[20px] leading-snug font-semibold">{HOMEWORK.task}</p>
        {showEs && <p className="text-label-2 mt-1 text-[15px]">{HOMEWORK.taskEs}</p>}
        <p className="text-label-2 mt-2 text-[15px] italic">{HOMEWORK.note}</p>
        <div className="mt-5 flex items-center gap-4 rounded-[16px] p-4" style={{ background: `color-mix(in srgb, ${complete ? 'var(--green)' : 'var(--orange)'} 12%, transparent)` }}>
          <ProgressRing value={named / homeworkMin} size={64} stroke={7} color={complete ? 'var(--green)' : 'var(--orange)'}>
            <span className="text-[14px] font-bold tabular-nums">
              {named}/{homeworkMin}
            </span>
          </ProgressRing>
          <div className="min-w-0">
            <div className="text-headline">{complete ? 'Homework complete! · ¡Tarea completa!' : `Add ${homeworkMin - named} more · Añade ${homeworkMin - named} más`}</div>
            <div className="text-label-2 text-[14px]">{complete ? 'Imprímela o cópiala como texto.' : 'Hazlo en la pestaña Árbol.'}</div>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 text-[14px]">
          <span className="text-label-2">Mínimo de miembros</span>
          <div className="bg-fill-2 flex items-center rounded-[10px]">
            <button type="button" className="flex h-8 w-8 items-center justify-center" aria-label="Menos" onClick={() => setHomeworkMin(homeworkMin - 1)}>
              <Minus size={14} />
            </button>
            <span className="w-6 text-center font-semibold tabular-nums">{homeworkMin}</span>
            <button type="button" className="flex h-8 w-8 items-center justify-center" aria-label="Más" onClick={() => setHomeworkMin(homeworkMin + 1)}>
              <Plus size={14} />
            </button>
          </div>
        </div>
        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => printTree(members, showEs)} disabled={!members.length}>
            <Printer size={16} /> Print · Imprimir
          </Button>
          <Button variant="gray" onClick={copy} disabled={!members.length}>
            <ClipboardCopy size={16} /> {copied ? 'Copied! · ¡Copiado!' : 'Copy as text'}
          </Button>
        </div>
      </Card>
      <Card className="p-5">
        <h3 className="text-headline mb-2">My tree so far · Mi árbol</h3>
        {members.length ? (
          <ul>
            {members.map((m) => (
              <li key={m.id} className={cn('flex items-baseline gap-3 py-2 [&:not(:last-child)]:shadow-[inset_0_-0.5px_0_var(--separator)]')}>
                <span className="min-w-0 flex-[0_1_40%] truncate text-[17px] font-semibold">{m.name}</span>
                <span className="text-[15px]">{m.rel}</span>
                {showEs && <span className="text-label-2 truncate text-[14px]">{REL_ES[m.rel]}</span>}
              </li>
            ))}
          </ul>
        ) : (
          <Callout tone="blue">Nothing yet — build your tree in the Family Tree tab. · Aún no hay nadie: crea tu árbol en la pestaña Árbol.</Callout>
        )}
      </Card>
    </div>
  );
}
