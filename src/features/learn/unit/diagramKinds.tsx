import { useCallback, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Check, Shapes, X } from 'lucide-react';
import { motion, useReducedMotion, type MotionProps } from 'motion/react';
import { deep, ink, tint } from '@/lib/color';
import { Es } from './Es';

/**
 * DIAGRAMAS POR DATOS — guía para el equipo pedagógico
 * =====================================================
 *
 * Un diagrama es un objeto JSON pequeño. No hay que dibujar SVG: el renderer `<SpecDiagram>` lo pinta
 * (responsive de 320 a 560 px, modo claro y oscuro, animado salvo que el usuario pida menos movimiento).
 *
 * DÓNDE SE ESCRIBE
 *   `src/content/generated/diagrams-{a1|a2|b1|b2|c1|c2}.json`
 *   Un objeto que mapea la clave del punto "NIVEL-unidad-punto" a un diagrama (o a una lista de ellos):
 *
 *     { "A2-11-0": { "kind": "transform", "title": "...", ... },
 *       "B1-4-1":  [ { "kind": "sequence", ... }, { "kind": "compare", ... } ] }
 *
 *   - Clave: nivel + número de unidad (`n` en level-*.json, empieza en 1) + posición del punto de
 *     gramática dentro de la unidad (empieza en 0). "A2-11-1" = A2, unidad 11, segundo punto.
 *   - Si el punto ya tiene un diagrama dibujado a mano en `Diagrams.tsx`, ese manda y el JSON se ignora.
 *   - Valida con `node scripts/validate-diagrams.mjs` antes de entregar.
 *
 * CAMPOS COMUNES (todos los tipos)
 *   kind      obligatorio  "transform" | "slots" | "scale" | "sequence" | "polarity" | "compare" | "timeline"
 *   title     obligatorio  título corto en INGLÉS (≤ 60 caracteres), p. ej. "Active to passive".
 *   note_es   recomendado  explicación en ESPAÑOL, 1–2 frases (≤ 220 caracteres). Se muestra bajo el
 *                          diagrama y respeta el nivel de ayuda en español de la unidad.
 *   tone      opcional     color del marco: blue green orange purple pink teal yellow red indigo mint.
 *   point     opcional     nombre del punto de gramática tal cual está en level-*.json. Solo sirve para
 *                          que el validador detecte claves equivocadas; no se muestra.
 *   Regla de idioma: ejemplos y palabras objeto de estudio en inglés; todo rótulo de ayuda en español
 *   y en campos que terminan en `_es`.
 *   Límites para móvil: cada ficha/palabra ≤ 24 caracteres, cada ejemplo ≤ 70, rótulos ≤ 40.
 *
 * ROLES (colores de las fichas en `transform` y `slots`)
 *   subject (sujeto, azul) · aux (auxiliar, morado) · verb (verbo, verde) · object (objeto, naranja) ·
 *   complement (complemento, turquesa) · extra (añadido, rosa) · link (enlace, índigo) · other (neutro).
 *   Si no pones `role`, la ficha sale en gris neutro.
 *
 * ----------------------------------------------------------------------------------------------
 * 1) transform — oración A → oración B con flechas (activa→pasiva, directo→indirecto, preguntas indirectas)
 * ----------------------------------------------------------------------------------------------
 *   {
 *     "kind": "transform", "title": "Active to passive",
 *     "from": { "label_es": "Activa",  "tokens": [ {"t":"Maria","role":"subject","id":"s"}, {"t":"wrote","role":"verb","id":"v"}, {"t":"the letter","role":"object","id":"o"} ] },
 *     "to":   { "label_es": "Pasiva",  "tokens": [ {"t":"The letter","role":"object","id":"o"}, {"t":"was written","role":"verb","id":"v"}, {"t":"by","role":"extra","add":true}, {"t":"Maria","role":"subject","id":"s"} ] },
 *     "note_es": "..."
 *   }
 *   Cada ficha: `t` (texto, obligatorio), `role`, `id`, `add`, `drop`.
 *   - `id`: si una ficha de `from` y otra de `to` comparten `id`, se dibuja una flecha entre ellas.
 *     Mismo texto = flecha continua ("se mueve"); texto distinto = flecha punteada ("cambia").
 *   - `add: true` (solo en `to`): palabra que aparece; borde discontinuo con "+".
 *   - `drop: true` (solo en `from`): palabra que desaparece; tachada y atenuada.
 *   Los `id` no pueden repetirse dentro de una misma fila. Más de 6–7 fichas por fila se vuelven apretadas.
 *
 * ----------------------------------------------------------------------------------------------
 * 2) slots — orden de palabras en casillas de color (cláusulas relativas, adverbios, partículas)
 * ----------------------------------------------------------------------------------------------
 *   {
 *     "kind": "slots", "title": "Relative clause: who",
 *     "rows": [ { "label_es": "Personas", "slots": [
 *        {"t":"The man","role":"subject"},
 *        {"t":"who lives here","role":"extra","inserted":true,"label_es":"se inserta"},
 *        {"t":"is a doctor","role":"verb"} ] } ]
 *   }
 *   Cada fila es una oración; varias filas permiten comparar ejemplos alineados.
 *   Casilla: `t`, `role`, `label_es` (rótulo encima; por defecto el nombre del rol), `inserted: true`
 *   (casilla que se inserta: borde discontinuo y "+"), `optional: true` (se puede omitir: más tenue y "(opcional)").
 *
 * ----------------------------------------------------------------------------------------------
 * 3) scale — escala graduada (obligación, certeza, frecuencia, formalidad)
 * ----------------------------------------------------------------------------------------------
 *   {
 *     "kind": "scale", "title": "How strong is the rule?",
 *     "from_es": "Tú decides", "to_es": "La regla manda",
 *     "marks": [ {"t":"don't have to","at":15,"tone":"teal","label_es":"no es necesario","ex":"You don't have to pay."},
 *                {"t":"must","at":85,"tone":"red","label_es":"es obligatorio","ex":"You must wear a helmet."} ]
 *   }
 *   Marca: `t` (palabra en inglés, obligatorio), `at` (posición 0–100, obligatorio), `tone`, `label_es`,
 *   `ex` (ejemplo en inglés). Entre 2 y 6 marcas; separa las posiciones al menos 15 puntos entre sí.
 *   `from_es` / `to_es` rotulan los extremos de la escala.
 *
 * ----------------------------------------------------------------------------------------------
 * 4) sequence — pasos numerados enlazados (first, then, after that, finally)
 * ----------------------------------------------------------------------------------------------
 *   { "kind": "sequence", "title": "...", "steps": [ {"t":"First","ex":"First, I wake up.","label_es":"el primer paso"}, ... ] }
 *   Paso: `t` (obligatorio), `ex` (ejemplo en inglés), `label_es`. De 2 a 6 pasos.
 *
 * ----------------------------------------------------------------------------------------------
 * 5) polarity — afirmación (+/−) y coletilla de signo invertido (question tags)
 * ----------------------------------------------------------------------------------------------
 *   { "kind": "polarity", "title": "Question tags",
 *     "pairs": [ {"statement":"You like pizza,","tag":"don't you?","positive":true,"hint_es":"..."} ] }
 *   `positive`: signo de la oración principal (true = afirmativa). La coletilla se pinta con el signo
 *   contrario automáticamente. `hint_es` opcional.
 *
 * ----------------------------------------------------------------------------------------------
 * 6) compare — 2 o 3 columnas con contraste y marcas ✓/✗ (for vs since, say vs tell)
 * ----------------------------------------------------------------------------------------------
 *   { "kind": "compare", "title": "For vs since",
 *     "columns": [ {"head":"for","head_es":"duración","use_es":"Cuánto tiempo dura.","tone":"blue",
 *                   "items":[ {"t":"for three years","ok":true}, {"t":"for 2020","ok":false} ] }, ... ] }
 *   Elemento: `t` (inglés) y `ok` (true = ✓, false = ✗, omitido = viñeta neutra). Máx. 5 elementos por columna.
 *
 * ----------------------------------------------------------------------------------------------
 * 7) timeline — línea de tiempo (tiempos verbales, expresiones de tiempo)
 * ----------------------------------------------------------------------------------------------
 *   { "kind": "timeline", "title": "...", "now": 70,
 *     "marks": [ {"x":30,"label":"yesterday","tone":"orange"} ],
 *     "spans": [ {"from":10,"to":50,"label":"was cooking","tone":"blue","row":0,"dashed":false,"open":false} ],
 *     "examples": [ {"t":"I cooked yesterday.","tone":"orange"} ] }
 *   Todas las posiciones son 0–100 sobre la línea. `now` = posición de "NOW". Marca (punto): `x`, `label`,
 *   `tone`. Tramo (barra): `from`, `to`, `label`, `tone`, `row` (0 por defecto; sube para apilar tramos que
 *   se solapan), `dashed` (hábito o plan, sin certeza), `open` (flecha: sigue hasta ahora o más allá).
 *   `examples` (obligatorio, ≥ 1): oraciones en inglés con el color de su marca/tramo.
 *
 * ACCESIBILIDAD: el renderer añade `role="img"` y un `aria-label` generado con el contenido del spec;
 * no hace falta escribirlo. Escribe oraciones completas y claras: eso es lo que escuchará un lector de pantalla.
 */

// ------------------------------------------------------------------ types --

export type Tone = 'blue' | 'green' | 'orange' | 'purple' | 'pink' | 'teal' | 'yellow' | 'red' | 'indigo' | 'mint';
export type Role = 'subject' | 'aux' | 'verb' | 'object' | 'complement' | 'extra' | 'link' | 'other';

interface SpecBase {
  /** Grammar point name as in level-*.json (validator only). */
  point?: string;
  /** Short English title. */
  title: string;
  /** Spanish explanation under the diagram. */
  note_es?: string;
  tone?: Tone;
}

export interface TransformChip {
  t: string;
  role?: Role;
  id?: string;
  add?: boolean;
  drop?: boolean;
}
export interface TransformRow {
  label_es?: string;
  tokens: TransformChip[];
}
export interface TransformSpec extends SpecBase {
  kind: 'transform';
  from: TransformRow;
  to: TransformRow;
}

export interface SlotItem {
  t: string;
  role?: Role;
  label_es?: string;
  inserted?: boolean;
  optional?: boolean;
}
export interface SlotsSpec extends SpecBase {
  kind: 'slots';
  rows: { label_es?: string; slots: SlotItem[] }[];
}

export interface ScaleMark {
  t: string;
  /** Position 0–100. */
  at: number;
  tone?: Tone;
  label_es?: string;
  ex?: string;
}
export interface ScaleSpec extends SpecBase {
  kind: 'scale';
  from_es?: string;
  to_es?: string;
  marks: ScaleMark[];
}

export interface SequenceStep {
  t: string;
  ex?: string;
  label_es?: string;
}
export interface SequenceSpec extends SpecBase {
  kind: 'sequence';
  steps: SequenceStep[];
}

export interface PolarityPair {
  statement: string;
  tag: string;
  /** Sign of the main sentence; the tag gets the opposite one. */
  positive: boolean;
  hint_es?: string;
}
export interface PolaritySpec extends SpecBase {
  kind: 'polarity';
  pairs: PolarityPair[];
}

export interface CompareColumn {
  head: string;
  head_es?: string;
  use_es?: string;
  tone?: Tone;
  items: { t: string; ok?: boolean }[];
}
export interface CompareSpec extends SpecBase {
  kind: 'compare';
  columns: CompareColumn[];
}

export interface TimelineSpec extends SpecBase {
  kind: 'timeline';
  now: number;
  spans?: { from: number; to: number; label: string; tone?: Tone; row?: number; dashed?: boolean; open?: boolean }[];
  marks?: { x: number; label: string; tone?: Tone }[];
  examples: { t: string; tone?: Tone }[];
}

export type DiagramSpec = TransformSpec | SlotsSpec | ScaleSpec | SequenceSpec | PolaritySpec | CompareSpec | TimelineSpec;
export type DiagramKind = DiagramSpec['kind'];

/** Kinds the renderer understands (used by the validator script too). */
export const DIAGRAM_KINDS: DiagramKind[] = ['transform', 'slots', 'scale', 'sequence', 'polarity', 'compare', 'timeline'];

// ----------------------------------------------------------------- tokens --

const TONE: Record<Tone, string> = {
  blue: 'var(--blue)',
  green: 'var(--green)',
  orange: 'var(--orange)',
  purple: 'var(--purple)',
  pink: 'var(--pink)',
  teal: 'var(--teal)',
  yellow: 'var(--yellow)',
  red: 'var(--red)',
  indigo: 'var(--indigo)',
  mint: 'var(--mint)',
};
/** A tone name or an already-resolved CSS colour (hand-drawn diagrams pass `var(--x)` directly). */
const col = (c: string | undefined, fallback: Tone = 'blue') => (c && c in TONE ? TONE[c as Tone] : (c ?? TONE[fallback]));
/** Fill dark enough for white text. */
const fillOf = (c: string) => deep(c, c === TONE.yellow ? 48 : 78);

const ROLE: Record<Role, { color: string | null; es: string }> = {
  subject: { color: TONE.blue, es: 'Sujeto' },
  aux: { color: TONE.purple, es: 'Auxiliar' },
  verb: { color: TONE.green, es: 'Verbo' },
  object: { color: TONE.orange, es: 'Objeto' },
  complement: { color: TONE.teal, es: 'Complemento' },
  extra: { color: TONE.pink, es: 'Añadido' },
  link: { color: TONE.indigo, es: 'Enlace' },
  other: { color: null, es: 'Otro' },
};
const roleOf = (r?: Role) => ROLE[r && r in ROLE ? r : 'other'];

const DEFAULT_TONE: Record<DiagramKind, Tone> = {
  transform: 'purple',
  slots: 'blue',
  scale: 'orange',
  sequence: 'green',
  polarity: 'pink',
  compare: 'teal',
  timeline: 'blue',
};

/** Entrance animation, off with prefers-reduced-motion. */
function appear(reduce: boolean | null, i = 0): MotionProps {
  if (reduce) return {};
  return {
    initial: { opacity: 0, y: 8 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.2 },
    transition: { delay: Math.min(i, 8) * 0.07, duration: 0.3 },
  };
}

// ------------------------------------------------------------------ frame --

/** The card every diagram sits in: tinted background, icon, English title, optional Spanish note. */
export function DiagramFrame({ title, color, es, children }: { title: string; color: string; es?: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-[20px]" style={{ background: tint(color, 5), boxShadow: `inset 0 0 0 1px ${tint(color, 20)}` }}>
      <header className="flex items-center gap-2.5 px-4 pt-3.5 pb-1">
        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px] text-white" style={{ background: deep(color) }} aria-hidden>
          <Shapes size={17} />
        </span>
        <div className="min-w-0">
          <div className="text-[11px] font-bold tracking-[0.07em] uppercase" style={{ color: ink(color) }}>
            Diagram
          </div>
          <h5 className="text-[16px] leading-snug font-semibold text-balance">{title}</h5>
        </div>
      </header>
      <div className="px-3 pt-2 pb-3.5 sm:px-4">
        {children}
        {es && (
          <Es part="explain">
            <p className="text-label-2 mt-3 text-[13.5px] leading-snug">{es}</p>
          </Es>
        )}
      </div>
    </section>
  );
}

function Legend({ items }: { items: { color?: string; label: string; glyph?: string }[] }) {
  if (!items.length) return null;
  return (
    <ul className="text-label-2 mt-3 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[12.5px] font-semibold" aria-hidden>
      {items.map((it) => (
        <li key={it.label} className="inline-flex items-center gap-1.5">
          {it.glyph ? (
            <span className="font-black">{it.glyph}</span>
          ) : (
            <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ background: it.color ? fillOf(it.color) : 'var(--label-3)' }} />
          )}
          {it.label}
        </li>
      ))}
    </ul>
  );
}

function Chip({ c, reg }: { c: { t: string; role?: Role; add?: boolean; drop?: boolean; inserted?: boolean; optional?: boolean }; reg?: (el: HTMLElement | null) => void }) {
  const r = roleOf(c.role);
  const dashed = c.add || c.inserted;
  const style: CSSProperties = dashed
    ? { background: tint(r.color ?? 'var(--label)', 12), color: r.color ? ink(r.color, 80) : 'var(--label)', border: `2px dashed ${r.color ? fillOf(r.color) : 'var(--label-3)'}` }
    : r.color
      ? { background: fillOf(r.color), color: '#fff', border: '2px solid transparent' }
      : { background: 'var(--fill)', color: 'var(--label)', border: '2px solid transparent' };
  return (
    <span
      ref={reg}
      className="inline-flex min-h-[38px] items-center gap-1 rounded-[10px] px-2.5 py-1 text-[15px] leading-tight font-bold"
      style={{ ...style, opacity: c.drop ? 0.6 : c.optional ? 0.85 : 1, textDecoration: c.drop ? 'line-through' : undefined }}
    >
      {dashed && <span aria-hidden>+</span>}
      {c.t}
    </span>
  );
}

// -------------------------------------------------------------- transform --

interface Arrow {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  change: boolean;
  color: string;
}

function TransformBody({ s }: { s: TransformSpec }) {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const els = useRef(new Map<string, HTMLElement>());
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const reg = (key: string) => (el: HTMLElement | null) => {
    if (el) els.current.set(key, el);
    else els.current.delete(key);
  };

  const measure = useCallback(() => {
    const root = wrap.current;
    if (!root) return;
    const r = root.getBoundingClientRect();
    const out: Arrow[] = [];
    for (const c of s.from.tokens) {
      if (!c.id || c.drop) continue;
      const a = els.current.get(`a:${c.id}`);
      const b = els.current.get(`b:${c.id}`);
      const target = s.to.tokens.find((x) => x.id === c.id);
      if (!a || !b || !target) continue;
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      out.push({
        id: c.id,
        x1: ra.left + ra.width / 2 - r.left,
        y1: ra.bottom - r.top,
        x2: rb.left + rb.width / 2 - r.left,
        y2: rb.top - r.top,
        change: target.t.toLowerCase() !== c.t.toLowerCase(),
        color: roleOf(target.role ?? c.role).color ?? 'var(--label-2)',
      });
    }
    setSize({ w: r.width, h: r.height });
    setArrows(out);
  }, [s]);

  useLayoutEffect(() => {
    measure();
    let live = true;
    const ro = new ResizeObserver(() => measure());
    if (wrap.current) ro.observe(wrap.current);
    document.fonts?.ready.then(() => live && measure());
    return () => {
      live = false;
      ro.disconnect();
    };
  }, [measure]);

  const row = (r: TransformRow, side: 'a' | 'b') => (
    <div className="flex flex-wrap items-center gap-1.5">
      {r.label_es && <span className="text-label-2 mr-1 text-[12px] font-bold tracking-wide uppercase">{r.label_es}</span>}
      {r.tokens.map((c, k) => (
        <Chip key={`${c.t}-${k}`} c={c} reg={c.id ? reg(`${side}:${c.id}`) : undefined} />
      ))}
    </div>
  );

  const all = [...s.from.tokens, ...s.to.tokens];
  const roles = [...new Set(all.map((c) => c.role).filter((r): r is Role => !!r && r !== 'other'))];
  const legend = [
    ...roles.map((r) => ({ color: ROLE[r].color ?? undefined, label: ROLE[r].es })),
    ...(arrows.some((a) => !a.change) ? [{ glyph: '→', label: 'se mueve' }] : []),
    ...(arrows.some((a) => a.change) ? [{ glyph: '⇢', label: 'cambia' }] : []),
    ...(s.to.tokens.some((c) => c.add) ? [{ glyph: '+', label: 'aparece' }] : []),
    ...(s.from.tokens.some((c) => c.drop) ? [{ glyph: '–', label: 'desaparece' }] : []),
  ];

  return (
    <div role="img" aria-label={describe(s)}>
      <div ref={wrap} className="relative mx-auto flex max-w-[560px] flex-col gap-12">
        {row(s.from, 'a')}
        {row(s.to, 'b')}
        <svg className="pointer-events-none absolute inset-0 overflow-visible" width={size.w} height={size.h} aria-hidden>
          {arrows.map((a, k) => {
            const d = (a.y2 - a.y1) * 0.55;
            const path = `M${a.x1} ${a.y1 + 2} C${a.x1} ${a.y1 + 2 + d}, ${a.x2} ${a.y2 - 3 - d}, ${a.x2} ${a.y2 - 3}`;
            const common = { fill: 'none', stroke: a.color, strokeWidth: 2.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
            return (
              <g key={a.id}>
                {a.change || reduce ? (
                  <motion.path d={path} {...common} strokeDasharray={a.change ? '5 4' : undefined} initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + k * 0.1 }} />
                ) : (
                  <motion.path d={path} {...common} initial={{ pathLength: 0, opacity: 0 }} whileInView={{ pathLength: 1, opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.2 + k * 0.12, duration: 0.5 }} />
                )}
                <motion.path d={`M${a.x2 - 4.5} ${a.y2 - 9} L${a.x2} ${a.y2 - 3} L${a.x2 + 4.5} ${a.y2 - 9}`} {...common} initial={reduce ? false : { opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true }} transition={{ delay: 0.5 + k * 0.12 }} />
              </g>
            );
          })}
        </svg>
      </div>
      <Legend items={legend} />
    </div>
  );
}

// ------------------------------------------------------------------ slots --

function SlotsBody({ s }: { s: SlotsSpec }) {
  const reduce = useReducedMotion();
  const roles = [...new Set(s.rows.flatMap((r) => r.slots.map((x) => x.role)).filter((r): r is Role => !!r && r !== 'other'))];
  return (
    <div role="img" aria-label={describe(s)}>
      <div className="mx-auto max-w-[560px] space-y-4">
        {s.rows.map((row, i) => (
          <motion.div key={i} {...appear(reduce, i)}>
            {row.label_es && <p className="text-label-2 mb-1.5 text-[12px] font-bold tracking-wide uppercase">{row.label_es}</p>}
            <div className="flex flex-wrap items-end gap-x-1.5 gap-y-2.5">
              {row.slots.map((sl, k) => {
                const r = roleOf(sl.role);
                const cap = sl.label_es ?? (sl.role ? r.es : '');
                return (
                  <div key={`${sl.t}-${k}`} className="flex flex-col items-start gap-0.5">
                    <span className="text-[11.5px] leading-none font-bold tracking-wide uppercase" style={{ color: r.color ? ink(r.color, 75) : 'var(--label-2)' }}>
                      {cap}
                      {sl.optional && ' (opcional)'}
                    </span>
                    <Chip c={sl} />
                  </div>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
      <Legend items={[...roles.map((r) => ({ color: ROLE[r].color ?? undefined, label: ROLE[r].es })), ...(s.rows.some((r) => r.slots.some((x) => x.inserted)) ? [{ glyph: '+', label: 'se inserta' }] : [])]} />
    </div>
  );
}

// ------------------------------------------------------------------ scale --

function labelStyle(above: boolean, align: 'left' | 'right' | 'center', color: string): CSSProperties {
  const v: CSSProperties = above ? { bottom: 82 } : { top: 86 };
  const h: CSSProperties = align === 'left' ? { left: -12, textAlign: 'left' } : align === 'right' ? { right: -12, textAlign: 'right' } : { left: 0, transform: 'translateX(-50%)', textAlign: 'center' };
  return { ...v, ...h, color };
}

function ScaleBody({ s }: { s: ScaleSpec }) {
  const reduce = useReducedMotion();
  const marks = [...s.marks].sort((a, b) => a.at - b.at);
  const gradient = `linear-gradient(90deg, ${marks.map((m) => `${tint(col(m.tone, 'blue'), 55)} ${Math.min(100, Math.max(0, m.at))}%`).join(', ')})`;
  return (
    <div role="img" aria-label={describe(s)}>
      <div className="relative mx-auto h-[132px] max-w-[540px] px-3">
        <div className="relative h-full">
          <div className="absolute inset-x-0 top-[61px] h-[10px] rounded-full" style={{ background: marks.length > 1 ? gradient : 'var(--fill)' }} />
          {marks.map((m, i) => {
            const c = col(m.tone, 'blue');
            const at = Math.min(100, Math.max(0, m.at));
            const above = i % 2 === 0;
            const align = at < 14 ? 'left' : at > 86 ? 'right' : 'center';
            return (
              <div key={`${m.t}-${i}`} className="absolute top-0 h-full w-0" style={{ left: `${at}%` }}>
                <div className="absolute top-[54px] -translate-x-1/2">
                  <motion.span
                    className="flex h-6 w-6 items-center justify-center rounded-full text-[13px] font-black text-white"
                    style={{ background: fillOf(c), boxShadow: '0 0 0 3px var(--card)' }}
                    {...(reduce ? {} : { initial: { scale: 0 }, whileInView: { scale: 1 }, viewport: { once: true }, transition: { delay: i * 0.1, type: 'spring' as const, stiffness: 400, damping: 18 } })}
                  >
                    {i + 1}
                  </motion.span>
                </div>
                <div
                  className="absolute w-max max-w-[118px] text-[14px] leading-tight font-bold"
                  style={labelStyle(above, align, ink(c, 78))}
                >
                  {m.t}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      {(s.from_es || s.to_es) && (
        <div className="text-label-2 mx-auto flex max-w-[540px] items-center justify-between gap-2 px-3 text-[12.5px] font-semibold">
          <span>{s.from_es}</span>
          <span aria-hidden className="bg-separator h-px flex-1" />
          <span>{s.to_es}</span>
        </div>
      )}
      <ol className="mx-auto mt-3 max-w-[540px] space-y-1.5">
        {marks.map((m, i) => (
          <motion.li key={`${m.t}-${i}`} className="flex items-start gap-2.5" {...appear(reduce, i)}>
            <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[13px] font-black text-white" style={{ background: fillOf(col(m.tone, 'blue')) }} aria-hidden>
              {i + 1}
            </span>
            <span className="min-w-0 text-[14.5px] leading-snug">
              <b style={{ color: ink(col(m.tone, 'blue'), 78) }}>{m.t}</b>
              {m.label_es && <span className="text-label-2"> · {m.label_es}</span>}
              {m.ex && <span className="block font-medium">{m.ex}</span>}
            </span>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}

// --------------------------------------------------------------- sequence --

const SEQ_TONES: Tone[] = ['blue', 'teal', 'green', 'orange', 'pink', 'purple'];

function SequenceBody({ s }: { s: SequenceSpec }) {
  const reduce = useReducedMotion();
  return (
    <ol role="img" aria-label={describe(s)} className="mx-auto max-w-[520px]">
      {s.steps.map((st, i) => {
        const c = TONE[SEQ_TONES[i % SEQ_TONES.length]!];
        const last = i === s.steps.length - 1;
        return (
          <motion.li key={`${st.t}-${i}`} className="flex gap-3" {...appear(reduce, i)}>
            <span className="flex flex-col items-center">
              <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[16px] font-black text-white" style={{ background: fillOf(c) }} aria-hidden>
                {i + 1}
              </span>
              {!last && <span className="my-1 w-[3px] flex-1 rounded-full" style={{ background: tint(c, 40), minHeight: 14 }} aria-hidden />}
            </span>
            <div className={last ? 'min-w-0 pt-1' : 'min-w-0 pt-1 pb-3'}>
              <div className="text-[18px] leading-tight font-extrabold" style={{ color: ink(c, 78) }}>
                {st.t}
              </div>
              {st.label_es && <div className="text-label-2 text-[13.5px] leading-snug">{st.label_es}</div>}
              {st.ex && <p className="mt-0.5 text-[15px] leading-snug font-medium">{st.ex}</p>}
            </div>
          </motion.li>
        );
      })}
    </ol>
  );
}

// --------------------------------------------------------------- polarity --

function Side({ positive, text }: { positive: boolean; text: string }) {
  const c = positive ? TONE.green : TONE.red;
  return (
    <span className="inline-flex items-center gap-2 rounded-[12px] px-2.5 py-1.5" style={{ background: tint(c, 14), boxShadow: `inset 0 0 0 1.5px ${tint(c, 55)}` }}>
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[16px] leading-none font-black text-white" style={{ background: fillOf(c) }} aria-hidden>
        {positive ? '+' : '−'}
      </span>
      <span className="text-[15px] leading-tight font-bold">{text}</span>
    </span>
  );
}

function PolarityBody({ s }: { s: PolaritySpec }) {
  const reduce = useReducedMotion();
  return (
    <div role="img" aria-label={describe(s)}>
      <ul className="mx-auto max-w-[520px] space-y-3">
        {s.pairs.map((p, i) => (
          <motion.li key={`${p.statement}-${i}`} {...appear(reduce, i)}>
            <div className="flex flex-wrap items-center gap-2">
              <Side positive={p.positive} text={p.statement} />
              <span aria-hidden className="text-label-2 text-[20px] leading-none font-black">
                ⇄
              </span>
              <Side positive={!p.positive} text={p.tag} />
            </div>
            {p.hint_es && <p className="text-label-2 mt-1 text-[13px] leading-snug">{p.hint_es}</p>}
          </motion.li>
        ))}
      </ul>
      <Legend
        items={[
          { color: TONE.green, label: '+ afirmativa' },
          { color: TONE.red, label: '− negativa' },
        ]}
      />
    </div>
  );
}

// ---------------------------------------------------------------- compare --

function CompareBody({ s }: { s: CompareSpec }) {
  const reduce = useReducedMotion();
  const cols = s.columns.slice(0, 3);
  return (
    <div role="img" aria-label={describe(s)} className="mx-auto grid max-w-[560px] gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 150px), 1fr))' }}>
      {cols.map((c, i) => {
        const color = col(c.tone ?? (['blue', 'orange', 'purple'] as Tone[])[i % 3]);
        return (
          <motion.div key={`${c.head}-${i}`} className="bg-bg-2 flex flex-col overflow-hidden rounded-[14px]" style={{ boxShadow: `inset 0 0 0 1px ${tint(color, 30)}` }} {...appear(reduce, i)}>
            <div className="px-3 py-2 text-white" style={{ background: fillOf(color) }}>
              <div className="text-[20px] leading-tight font-black">{c.head}</div>
              {c.head_es && <div className="text-[13px] leading-snug font-semibold opacity-90">{c.head_es}</div>}
            </div>
            <div className="flex-1 px-3 py-2">
              {c.use_es && <p className="text-label-2 mb-1.5 text-[13px] leading-snug">{c.use_es}</p>}
              <ul className="space-y-1.5">
                {c.items.map((it, k) => (
                  <li key={`${it.t}-${k}`} className="flex items-start gap-2 text-[14.5px] leading-snug font-medium">
                    {it.ok === undefined ? (
                      <span className="mt-[7px] ml-1.5 inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: 'var(--label-3)' }} aria-hidden />
                    ) : (
                      <span className="mt-px inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-white" style={{ background: fillOf(it.ok ? TONE.green : TONE.red) }} aria-hidden>
                        {it.ok ? <Check size={13} strokeWidth={3.5} /> : <X size={13} strokeWidth={3.5} />}
                      </span>
                    )}
                    <span>{it.t}</span>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        );
      })}
    </div>
  );
}

// --------------------------------------------------------------- timeline --

export interface TimelineData {
  title: string;
  now: number;
  /** Bars above the line: from–to on a 0–100 scale. Colours are tone names or CSS colours. */
  spans?: { from: number; to: number; label: string; color?: string; row?: number; dashed?: boolean; open?: boolean }[];
  /** Points on the line. */
  marks?: { x: number; label: string; color?: string }[];
  examples: { text: string; color?: string }[];
}

/** The past/now/future line plus its example list. Shared by hand-drawn (`Diagrams.tsx`) and data-driven timelines. */
export function TimelineBody({ title, now, spans, marks, examples }: TimelineData) {
  const W = 360;
  const x = (v: number) => 14 + (Math.min(100, Math.max(0, v)) / 100) * (W - 34);
  const rows = Math.max(0, ...(spans ?? []).map((s) => (s.row ?? 0) + 1));
  const axis = 26 + rows * 24;
  const H = axis + 44;
  return (
    <>
      <svg viewBox={`0 0 ${W} ${H}`} className="mx-auto block w-full max-w-[600px]" role="img" aria-label={`Timeline: ${title}. ${examples.map((e) => e.text).join(' ')}`}>
        <title>{`Timeline: ${title}`}</title>
        <text x={x(now) - 30} y={12} fontSize={9} fontWeight={700} textAnchor="end" fill="var(--label-3)">
          PAST
        </text>
        <text x={x(now) + 30} y={12} fontSize={9} fontWeight={700} fill="var(--label-3)">
          FUTURE
        </text>
        <line x1={x(now)} y1={4} x2={x(now)} y2={axis + 10} stroke="var(--red)" strokeWidth={1.4} strokeDasharray="3 3" />
        <text x={x(now)} y={axis + 22} fontSize={10} fontWeight={800} textAnchor="middle" fill="var(--red)">
          NOW
        </text>
        <line x1={8} y1={axis} x2={W - 14} y2={axis} stroke="var(--label-2)" strokeWidth={2} strokeLinecap="round" />
        <path d={`M${W - 16} ${axis - 5} L${W - 7} ${axis} L${W - 16} ${axis + 5}`} fill="none" stroke="var(--label-2)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
        {(spans ?? []).map((s, k) => {
          const c = col(s.color);
          const y = axis - 24 * ((s.row ?? 0) + 1);
          const x1 = x(s.from);
          const x2 = x(s.to);
          return (
            <g key={k}>
              <rect x={x1} y={y} width={x2 - x1} height={17} rx={8.5} fill={s.dashed ? tint(c, 14) : deep(c, 80)} stroke={s.dashed ? deep(c, 80) : 'none'} strokeWidth={1.3} strokeDasharray={s.dashed ? '4 3' : undefined} />
              {s.open && <path d={`M${x2 - 9} ${y + 4} L${x2 - 3} ${y + 8.5} L${x2 - 9} ${y + 13}`} fill="none" stroke="#fff" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />}
              <text x={(x1 + x2) / 2} y={y + 12} fontSize={9.5} fontWeight={700} textAnchor="middle" fill={s.dashed ? 'var(--label)' : '#fff'}>
                {s.label}
              </text>
            </g>
          );
        })}
        {(marks ?? []).map((m, k) => (
          <g key={k}>
            <circle cx={x(m.x)} cy={axis} r={6} fill={deep(col(m.color), 80)} stroke="var(--bg, #fff)" strokeWidth={2} />
            <text x={x(m.x)} y={axis + (k % 2 ? 36 : 22)} fontSize={9.5} fontWeight={700} textAnchor="middle" fill="var(--label)">
              {m.label}
            </text>
          </g>
        ))}
      </svg>
      <ul className="mt-2 space-y-1">
        {examples.map((e) => (
          <li key={e.text} className="flex items-baseline gap-2 text-[14.5px] leading-snug font-medium">
            <span className="inline-block h-2.5 w-2.5 shrink-0 translate-y-[-1px] rounded-full" style={{ background: deep(col(e.color), 80) }} aria-hidden />
            {e.text}
          </li>
        ))}
      </ul>
    </>
  );
}

// --------------------------------------------------------------- describe --

const join = (c: { t: string }[]) => c.map((x) => x.t).join(' ');

/** Plain-text description of a spec, used as the `aria-label` of the diagram. */
export function describe(s: DiagramSpec): string {
  switch (s.kind) {
    case 'transform':
      return `${s.title}. "${join(s.from.tokens)}" becomes "${join(s.to.tokens)}".`;
    case 'slots':
      return `${s.title}. Word order: ${s.rows.map((r) => `"${join(r.slots)}"`).join('; ')}.`;
    case 'scale':
      return `${s.title}. Scale${s.from_es && s.to_es ? ` from ${s.from_es} to ${s.to_es}` : ''}: ${[...s.marks]
        .sort((a, b) => a.at - b.at)
        .map((m) => (m.ex ? `${m.t} (${m.ex})` : m.t))
        .join(', then ')}.`;
    case 'sequence':
      return `${s.title}. Steps: ${s.steps.map((p, i) => `${i + 1}, ${p.t}${p.ex ? ` (${p.ex})` : ''}`).join('; ')}.`;
    case 'polarity':
      return `${s.title}. ${s.pairs.map((p) => `${p.statement} ${p.tag} (${p.positive ? 'positive statement, negative tag' : 'negative statement, positive tag'})`).join('; ')}.`;
    case 'compare':
      return `${s.title}. Comparison: ${s.columns.map((c) => `${c.head}: ${c.items.map((i) => `${i.t}${i.ok === undefined ? '' : i.ok ? ' (correct)' : ' (wrong)'}`).join(', ')}`).join('; ')}.`;
    case 'timeline':
      return `Timeline: ${s.title}. ${s.examples.map((e) => e.t).join(' ')}`;
  }
}

// --------------------------------------------------------------- renderer --

/** Renders one data-driven diagram. Unknown kinds render nothing (the validator catches them). */
export function SpecDiagram({ spec }: { spec: DiagramSpec }) {
  const color = TONE[spec.tone ?? DEFAULT_TONE[spec.kind] ?? 'blue'];
  let body: ReactNode = null;
  switch (spec.kind) {
    case 'transform':
      body = <TransformBody s={spec} />;
      break;
    case 'slots':
      body = <SlotsBody s={spec} />;
      break;
    case 'scale':
      body = <ScaleBody s={spec} />;
      break;
    case 'sequence':
      body = <SequenceBody s={spec} />;
      break;
    case 'polarity':
      body = <PolarityBody s={spec} />;
      break;
    case 'compare':
      body = <CompareBody s={spec} />;
      break;
    case 'timeline':
      body = (
        <TimelineBody
          title={spec.title}
          now={spec.now}
          spans={spec.spans?.map((x) => ({ ...x, color: x.tone }))}
          marks={spec.marks?.map((x) => ({ ...x, color: x.tone }))}
          examples={spec.examples.map((e) => ({ text: e.t, color: e.tone }))}
        />
      );
      break;
    default:
      return null;
  }
  return (
    <DiagramFrame title={spec.title} color={color} es={spec.note_es}>
      {body}
    </DiagramFrame>
  );
}
