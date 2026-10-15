import type { GrammarChart } from '@/content/types';
import type { KeySpec } from './formula';
import { Hl, ink, tint } from './ui';

/**
 * Colour-banded table: tinted header in the unit colour, first column as a
 * coloured band, zebra rows. Below `sm` every row becomes a small stacked card
 * so nothing scrolls sideways on a phone.
 */
export function ColorTable({ chart, color, spec }: { chart: GrammarChart; color: string; spec?: KeySpec }) {
  const { cols, rows, title } = chart;
  return (
    <figure className="overflow-hidden rounded-[18px]" style={{ boxShadow: `inset 0 0 0 1px ${tint(color, 22)}` }}>
      {title && (
        <figcaption className="px-4 py-2.5 text-[14px] font-bold" style={{ background: tint(color, 16), color: ink(color) }}>
          {title}
        </figcaption>
      )}

      {/* desktop / tablet */}
      <div className="hidden sm:block">
        <table className="w-full text-left text-[14px]">
          <thead>
            <tr style={{ background: tint(color, 9) }}>
              {cols.map((c, j) => (
                <th key={j} scope="col" className="px-4 py-2 text-[12px] font-bold tracking-[0.05em] uppercase" style={{ color: ink(color) }}>
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} style={{ background: i % 2 ? tint(color, 4) : undefined }}>
                {r.map((cell, j) =>
                  j === 0 ? (
                    <th
                      key={j}
                      scope="row"
                      className="px-4 py-2.5 align-top font-semibold"
                      style={{ boxShadow: `inset 4px 0 0 ${color}`, color: ink(color) }}
                    >
                      {cell}
                    </th>
                  ) : (
                    <td key={j} className="px-4 py-2.5 align-top">
                      <Hl text={cell} spec={spec} />
                    </td>
                  ),
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* phone: stacked cards */}
      <ul className="space-y-2 p-2 sm:hidden">
        {rows.map((r, i) => (
          <li key={i} className="bg-card rounded-[12px] p-3" style={{ boxShadow: `inset 4px 0 0 ${color}` }}>
            <div className="pl-1 text-[15px] font-bold" style={{ color: ink(color) }}>
              {r[0]}
            </div>
            <dl className="mt-1 space-y-1 pl-1 text-[14px]">
              {r.slice(1).map((cell, j) => (
                <div key={j} className="grid grid-cols-[minmax(0,38%)_minmax(0,1fr)] gap-2">
                  <dt className="text-label-2 text-[12px] font-semibold tracking-wide uppercase">{cols[j + 1]}</dt>
                  <dd>
                    <Hl text={cell} spec={spec} />
                  </dd>
                </div>
              ))}
            </dl>
          </li>
        ))}
      </ul>
    </figure>
  );
}
