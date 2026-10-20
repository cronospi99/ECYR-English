import { useMemo, useState } from 'react';
import { ChevronDown, Shuffle } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { speak } from '@/lib/speech';
import { useProgress } from '@/store/progress';
import { cn } from '@/lib/cn';
import { ink, tint } from '@/lib/color';
import { CODE_INFO, CODED, CONFUSING, GROUPS, MINIMAL_PAIRS, SOUND_LAB, TRAPS, type Code, type IrregularGroup } from './irregularPatterns';

const COLUMN3: [string, string, string][] = [
  ['Present perfect', 'have / has + participio', 'I have seen that film.'],
  ['Past perfect', 'had + participio', 'He had gone before I arrived.'],
  ['Passive voice', 'be + participio', 'The letter was written by Ana.'],
  ['Perfect modals', 'modal + have + participio', 'You should have told me.'],
  ['Adjetivos', 'participio solo', 'a broken window, frozen food'],
];

/** The pattern method for irregular verbs: codes, six families, traps, sounds and a sorting game. */
export function IrregularPatterns({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState<number | null>(compact ? null : 1);
  return (
    <div className="space-y-5">
      <Card className="p-5">
        <h3 className="text-title-3">Irregulares por patrones</h3>
        <p className="text-label-2 mt-1 text-[14.5px] text-pretty">
          No memorices 200 verbos en orden alfabético: el orden alfabético no enseña nada. Agrúpalos por la relación entre sus tres columnas
          (base · pasado · participio) y por cómo suenan. Primero lee el código; el código solo ya evita la mayoría de errores.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
          {(['AAA', 'ABB', 'ABA', 'ABC'] as const).map((c) => (
            <div key={c} className="bg-fill-2 rounded-[14px] p-3">
              <div className="text-[17px] font-extrabold tracking-wide">{CODE_INFO[c].label}</div>
              <div className="text-label-2 text-[13px]">{CODE_INFO[c].es}</div>
              <div className="mt-1 text-[13.5px] font-semibold italic">{CODE_INFO[c].ex}</div>
            </div>
          ))}
        </div>
        {!compact && (
          <details className="mt-4">
            <summary className="text-ink-blue cursor-pointer text-[14.5px] font-semibold">¿Para qué sirve la tercera columna?</summary>
            <div className="mt-2 overflow-x-auto">
              <table className="w-full text-left text-[14px]">
                <tbody>
                  <tr className="border-separator border-b">
                    <td className="py-1.5 pr-3 font-semibold">Past simple</td>
                    <td className="py-1.5 pr-3">columna 2</td>
                    <td className="text-label-2 py-1.5 italic">I saw her yesterday.</td>
                  </tr>
                  {COLUMN3.map(([a, b, c]) => (
                    <tr key={a} className="border-separator border-b">
                      <td className="py-1.5 pr-3 font-semibold">{a}</td>
                      <td className="py-1.5 pr-3">{b}</td>
                      <td className="text-label-2 py-1.5 italic">{c}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-label-2 mt-2 text-[13px]">Ninguna de estas estructuras acepta el pasado simple: por eso hace falta la columna 3.</p>
            </div>
          </details>
        )}
      </Card>

      <div className="space-y-3">
        {GROUPS.map((g) => (
          <GroupCard key={g.n} g={g} open={open === g.n} onToggle={() => setOpen((o) => (o === g.n ? null : g.n))} />
        ))}
      </div>

      <CodeSorter />

      {!compact && (
        <>
          <Card className="p-5">
            <h3 className="text-title-3">Pares confusos y trampas</h3>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[560px] text-left text-[14px]">
                <thead className="text-label-2 text-[12px] uppercase">
                  <tr>
                    <th className="pb-1.5">Base</th>
                    <th className="pb-1.5">Pasado</th>
                    <th className="pb-1.5">Participio</th>
                    <th className="pb-1.5">Significado</th>
                    <th className="pb-1.5">Cómo distinguirlos</th>
                  </tr>
                </thead>
                <tbody>
                  {CONFUSING.map(([a, b, c, es, how]) => (
                    <tr key={a + b} className="border-separator border-t">
                      <td className="py-1.5 pr-2 font-bold">{a}</td>
                      <td className="py-1.5 pr-2">{b}</td>
                      <td className="py-1.5 pr-2">{c}</td>
                      <td className="py-1.5 pr-2">{es}</td>
                      <td className="text-label-2 py-1.5">{how}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="mt-4 space-y-1.5 text-[14.5px]">
              {TRAPS.map((t) => (
                <li key={t} className="flex gap-2">
                  <span>⚠️</span> {t}
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <h3 className="text-title-3">Laboratorio de pronunciación</h3>
            <div className="mt-3 grid gap-2 md:grid-cols-2">
              {SOUND_LAB.map((s) => (
                <div key={s.family} className="bg-fill-2 rounded-[14px] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-bold">{s.family}</span>
                    <SpeakButton text={s.verbs.replace(/\s*\/[^/]+\//g, '').replace(/\(.*?\)/g, '')} size={16} />
                  </div>
                  <div className="mt-1 text-[14px]">{s.verbs}</div>
                  <div className="text-label-2 mt-1 text-[13px]">{s.note}</div>
                </div>
              ))}
            </div>
            <h4 className="text-headline mt-5">Pares mínimos</h4>
            <p className="text-label-2 text-[13.5px]">Toca cada par y repítelo dos veces exagerando la diferencia. Luego di solo uno y que tu compañero adivine cuál.</p>
            <div className="mt-2 space-y-2">
              {MINIMAL_PAIRS.map(([focus, pairs]) => (
                <div key={focus} className="flex flex-wrap items-center gap-1.5">
                  <span className="text-label-2 w-full text-[12.5px] font-semibold sm:w-48">{focus}</span>
                  {pairs.map((p) => (
                    <button key={p} type="button" onClick={() => speak(p.replace('–', ','), { rate: 0.8 })} className="bg-card shadow-card rounded-full px-3 py-1 text-[14px] font-semibold">
                      🔊 {p}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <p className="text-label-2 mt-4 text-[13px]">
              ¿Por qué existen los irregulares? Son la capa más antigua del idioma: antes del -ed, los verbos cambiaban su vocal (como el alemán singen – sang –
              gesungen). Los que la gente usaba sin parar nunca se regularizaron.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}

function GroupCard({ g, open, onToggle }: { g: IrregularGroup; open: boolean; onToggle: () => void }) {
  return (
    <Card className="overflow-hidden" style={{ boxShadow: `inset 4px 0 0 ${g.color}` }}>
      <button type="button" onClick={onToggle} className="flex w-full items-center gap-3 p-4 text-left">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[13px] text-[22px]" style={{ background: tint(g.color, 15) }}>
          {g.emoji}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[16px] font-bold">
            {g.n}. {g.name}
          </span>
          <span className="block text-[13px] font-bold tracking-wide" style={{ color: ink(g.color) }}>
            {CODE_INFO[g.code].label}
          </span>
        </span>
        <ChevronDown size={18} className={cn('text-label-2 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="space-y-4 px-4 pb-5">
          <p className="text-[15px]">{g.summary}</p>
          <div className="rounded-[14px] p-3 text-[14.5px]" style={{ background: tint(g.color, 10) }}>
            <b>★ Truco:</b> {g.trick}
          </div>
          {g.families.map((f) => (
            <div key={f.title}>
              <div className="text-headline">{f.title}</div>
              {f.hint && <div className="text-label-2 text-[13px]">{f.hint}</div>}
              <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
                {f.verbs.map(([a, b, c, es]) => (
                  <div key={a} className="bg-fill-2 flex items-center gap-2 rounded-[12px] px-3 py-2">
                    <SpeakButton text={`${a}, ${b.replace(' / ', ' or ')}, ${c.replace(' / ', ' or ')}`} size={15} />
                    <span className="min-w-0 flex-1 text-[14.5px]">
                      <b>{a}</b> · {b} · <span style={{ color: ink(g.color) }} className="font-semibold">{c}</span>
                      <span className="text-label-2 block text-[12.5px]">{es}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {g.watch && (
            <div className="bg-fill-2 rounded-[14px] p-3 text-[14.5px]">
              <b>⚠ {g.watch.title}:</b> {g.watch.body}
            </div>
          )}
          <ul className="text-label-2 space-y-1 text-[14px] italic">
            {g.examples.map((e) => (
              <li key={e}>▶ {e}</li>
            ))}
          </ul>
        </div>
      )}
    </Card>
  );
}

const CODES: Code[] = ['AAA', 'ABB', 'ABA', 'ABC', 'REBEL'];

/** Read the base form, pick its code, then see its three forms. */
export function CodeSorter() {
  const [seed, setSeed] = useState(() => Math.floor(Math.random() * 1e5));
  const round = useMemo(() => {
    const a = [...CODED];
    let s = seed;
    for (let i = a.length - 1; i > 0; i--) {
      s = (s * 9301 + 49297) % 233280;
      const j = Math.floor((s / 233280) * (i + 1));
      [a[i], a[j]] = [a[j]!, a[i]!];
    }
    return a.slice(0, 10);
  }, [seed]);
  const [i, setI] = useState(0);
  const [picked, setPicked] = useState<Code | null>(null);
  const [right, setRight] = useState(0);
  const award = useProgress((s) => s.award);
  const item = round[i];
  const finished = i >= round.length;

  const choose = (c: Code) => {
    if (picked || !item) return;
    setPicked(c);
    if (c === item.code) setRight((r) => r + 1);
    speak(item.v.join(', ').replace(' / ', ' or '), { rate: 0.85 });
  };
  const next = () => {
    const n = i + 1;
    setI(n);
    setPicked(null);
    if (n >= round.length) award({ kind: 'game', title: 'Irregulares por patrones', skill: 'grammar', xp: 10, score: right * 10, ref: 'verblab:patterns-code' });
  };
  const restart = () => {
    setSeed(Math.floor(Math.random() * 1e5));
    setI(0);
    setPicked(null);
    setRight(0);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h3 className="text-title-3">¿Qué código tiene?</h3>
          <p className="text-label-2 text-[14px]">Lee el verbo y elige su patrón antes de ver las formas.</p>
        </div>
        <span className="text-[15px] font-bold tabular-nums">
          {right}/{Math.min(i + (picked ? 1 : 0), round.length)}
        </span>
      </div>
      {finished ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <span className="text-[18px] font-bold">
            {right}/10 {right === 10 ? '🏆' : right >= 7 ? '👏' : '💪'}
          </span>
          <Button variant="gray" onClick={restart}>
            <Shuffle size={16} /> Otra ronda
          </Button>
        </div>
      ) : (
        item && (
          <div className="mt-4">
            <div className="text-center text-[34px] font-extrabold tracking-tight">{item.v[0]}</div>
            {picked && (
              <div className="mt-1 text-center text-[17px]">
                {item.v[0]} · {item.v[1]} · <b>{item.v[2]}</b> —{' '}
                <span className={picked === item.code ? 'text-ink-green font-bold' : 'text-ink-red font-bold'}>
                  {picked === item.code ? '¡Correcto!' : `Es ${CODE_INFO[item.code].label}`}
                </span>
              </div>
            )}
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              {CODES.map((c) => (
                <button
                  key={c}
                  type="button"
                  disabled={!!picked}
                  onClick={() => choose(c)}
                  className={cn(
                    'rounded-full px-4 py-2 text-[14px] font-bold transition-colors',
                    picked && c === item.code ? 'bg-ios-green text-white' : picked === c ? 'bg-ios-red text-white' : 'bg-fill-2',
                  )}
                >
                  {CODE_INFO[c].label}
                </button>
              ))}
            </div>
            {picked && (
              <div className="mt-4 text-center">
                <Button onClick={next}>{i + 1 < round.length ? 'Siguiente' : 'Ver resultado'}</Button>
              </div>
            )}
          </div>
        )
      )}
    </Card>
  );
}
