import { Fragment, useMemo } from 'react';
import { ArrowRight, Sigma } from 'lucide-react';
import { SpeakButton } from '@/components/learning/SpeakButton';
import { parseForm, type Chip, type FormLine, type KeySpec, type Polarity, type Role } from './formula';
import { Hl, Kicker, RoleLegend, ink, roleBg, roleText, tint } from './ui';
import { deep } from '@/lib/color';

const POL: Record<Exclude<Polarity, null>, { sym: string; color: string; label: string }> = {
  '+': { sym: '+', color: 'var(--green)', label: 'Afirmativa' },
  '-': { sym: '−', color: 'var(--red)', label: 'Negativa' },
  '?': { sym: '?', color: 'var(--blue)', label: 'Pregunta' },
  '-?': { sym: '−?', color: 'var(--orange)', label: 'Negativa y pregunta' },
};

function PolBadge({ p }: { p: Polarity }) {
  if (!p) return <span className="mt-[7px] h-2.5 w-2.5 justify-self-center rounded-full bg-[var(--label-3)]" aria-hidden />;
  const d = POL[p];
  return (
    <span
      className="inline-flex h-7 min-w-7 items-center justify-center rounded-full px-1 text-[15px] font-bold text-white"
      style={{ background: deep(d.color) }}
      title={d.label}
    >
      <span aria-hidden>{d.sym}</span>
      <span className="sr-only">{d.label}</span>
    </span>
  );
}

export function FormulaChip({ chip }: { chip: Chip }) {
  return (
    <span
      className="inline-flex min-h-8 items-center rounded-[9px] px-2.5 py-1 text-[15px] leading-tight font-semibold"
      style={{
        background: roleBg(chip.role, chip.slot ? 12 : 18),
        color: ink(roleText(chip.role)),
        boxShadow: chip.optional ? `inset 0 0 0 1.5px ${roleBg(chip.role, 45)}` : undefined,
        borderStyle: chip.optional ? 'dashed' : undefined,
        fontStyle: chip.slot ? 'italic' : undefined}}
    >
      {chip.text}
      {chip.optional && <span className="sr-only"> (opcional)</span>}
    </span>
  );
}

const Plus = () => (
  <span className="text-label-3 text-[15px] font-bold" aria-hidden>
    +
  </span>
);

function Example({ text, spec }: { text: string; spec?: KeySpec }) {
  return (
    <div className="mt-2 flex items-start gap-1.5">
      <ArrowRight size={15} className="text-label-3 mt-[5px] shrink-0" aria-hidden />
      <span className="min-w-0 flex-1 text-[15px] text-pretty">
        <Hl text={text} spec={spec} />
      </span>
      <SpeakButton text={text.replace(/[“”]/g, '')} size={15} className="-mt-1" />
    </div>
  );
}

function Row({ line, spec, color }: { line: FormLine; spec?: KeySpec; color: string }) {
  const showLabel = line.label && !(line.polarity && /^(positive|negative|question|affirmative|statement)$/i.test(line.label));
  return (
    <li className="grid grid-cols-[28px_minmax(0,1fr)] items-start gap-3 py-3 [&:not(:first-child)]:shadow-[inset_0_0.5px_0_var(--separator)]">
      <PolBadge p={line.polarity} />
      <div className="min-w-0">
        {showLabel && (
          <div className="mb-1.5 text-[12px] font-bold tracking-[0.05em] uppercase" style={{ color: ink(color) }}>
            {line.label}
          </div>
        )}

        {line.kind === 'formula' && (
          <>
            <div className="flex flex-wrap items-center gap-1.5">
              {line.tokens!.map((t, i) => {
                const prevChip = i > 0 && line.tokens![i - 1]!.t === 'chip';
                if (t.t === 'comma')
                  return (
                    <span key={i} className="text-label-2 -ml-1 text-[18px] font-bold" aria-label="coma">
                      ,
                    </span>
                  );
                if (t.t === 'q')
                  return (
                    <span key={i} className="text-ink-blue text-[18px] font-bold" aria-label="signo de pregunta">
                      ?
                    </span>
                  );
                return (
                  <Fragment key={i}>
                    {prevChip && <Plus />}
                    <FormulaChip chip={t.chip} />
                  </Fragment>
                );
              })}
            </div>
            {line.note && <div className="text-label-2 mt-1.5 text-[13px] italic">= {line.note}</div>}
            {line.example && <Example text={line.example} spec={spec} />}
          </>
        )}

        {line.kind === 'transform' && (
          <div className="flex flex-wrap gap-2">
            {line.chains!.map((c, i) => (
              <span key={i} className="bg-fill-2 inline-flex flex-wrap items-center gap-1 rounded-[10px] px-2 py-1 text-[15px]">
                {c.map((x, j) => (
                  <Fragment key={j}>
                    {j > 0 && <ArrowRight size={13} className="text-label-3" aria-label="se convierte en" />}
                    <span className={j === c.length - 1 ? 'font-semibold' : undefined} style={j > 0 ? { color: ink(color) } : undefined}>
                      <Hl text={x} spec={spec} />
                    </span>
                  </Fragment>
                ))}
              </span>
            ))}
            {line.note && <span className="text-label-2 self-center text-[13px] italic">({line.note})</span>}
          </div>
        )}

        {line.kind === 'list' && (
          <div className="flex flex-wrap gap-1.5">
            {line.items!.map((x) => (
              <span key={x} className="rounded-full px-2.5 py-1 text-[14px] font-medium" style={{ background: tint(color, 11) }}>
                <Hl text={x} spec={spec} />
              </span>
            ))}
            {line.note && <span className="text-label-2 self-center text-[13px] italic">({line.note})</span>}
            {line.example && (
              <div className="basis-full">
                <Example text={line.example} spec={spec} />
              </div>
            )}
          </div>
        )}

        {(line.kind === 'labelled' || line.kind === 'plain') && (
          <div className="flex items-start gap-1.5">
            <span className="min-w-0 flex-1 text-[15px] text-pretty">
              <Hl text={line.text!} spec={spec} />
              {line.note && <span className="text-label-2 text-[13px] italic"> ({line.note})</span>}
            </span>
            {line.kind === 'labelled' && <SpeakButton text={line.text!.replace(/[“”]/g, '')} size={15} className="-mt-1" />}
          </div>
        )}
      </div>
    </li>
  );
}

/** The `form[]` lines as colour-coded formula rows with +/−/? badges. */
export function FormulaBlock({ form, spec, color, bare = false }: { form: string[]; spec?: KeySpec; color: string; /** No "Fórmula" heading (inside a disclosure). */ bare?: boolean }) {
  const lines = useMemo(() => parseForm(form), [form]);
  const roles = useMemo(() => {
    const s = new Set<Role>();
    lines.forEach((l) => l.tokens?.forEach((t) => t.t === 'chip' && s.add(t.chip.role)));
    return [...s];
  }, [lines]);
  if (!lines.length) return null;
  return (
    <section aria-label="Fórmula">
      {!bare && (
        <Kicker icon={Sigma} color={color}>
          Fórmula
        </Kicker>
      )}
      <div className="rounded-[18px] p-3 sm:p-4" style={{ background: tint(color, 6), boxShadow: `inset 0 0 0 1px ${tint(color, 18)}` }}>
        <ul>
          {lines.map((l, i) => (
            <Row key={i} line={l} spec={spec} color={color} />
          ))}
        </ul>
        {roles.length > 1 && <RoleLegend roles={roles} />}
      </div>
    </section>
  );
}
