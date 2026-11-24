import { Fragment } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import { AutoText, IconBtn } from './ui';
import type { Highlighter } from './highlight';

const LABEL: Record<string, string> = {
  headline: 'Titular', lede: 'Entradilla', body: 'Cuerpo', quote: 'Cita', speaker: 'Quién lo dice', text: 'Texto', title: 'Título', subject: 'Asunto', intro: 'Introducción',
  q: 'Pregunta', a: 'Respuesta', answer: 'Respuesta', prompt: 'Enunciado', instructions: 'Instrucciones', distractors: 'Distractores', role: 'Rol', situation: 'Situación',
  goal: 'Objetivo', usefulLanguage: 'Lenguaje útil', name: 'Nombre', mode: 'Agrupación', minutes: 'Minutos', materials: 'Materiales', steps: 'Pasos', targetLanguage: 'Lenguaje meta',
  sections: 'Secciones', lines: 'Líneas', sentences: 'Frases', questions: 'Preguntas', items: 'Ítems', point: 'Punto', type: 'Tipo', stance: 'Postura', fictionalNote: 'Nota de ficción',
  characters: 'Personajes', format: 'Formato', qa: 'Preguntas y respuestas', cards: 'Tarjetas', sp: 'Habla',
};
const ANSWER_KEYS = ['answer', 'distractors'];
const SHORT_KEYS = ['type', 'mode', 'format', 'stance', 'minutes', 'sp', 'speaker', 'role', 'point', 'name'];

type Path = (string | number)[];

function setAt<T>(obj: T, path: Path, value: unknown): T {
  if (!path.length) return value as T;
  const [k, ...rest] = path;
  const copy: unknown = Array.isArray(obj) ? [...obj] : { ...(obj as object) };
  (copy as Record<string | number, unknown>)[k!] = setAt((obj as Record<string | number, unknown>)?.[k!], rest, value);
  return copy as T;
}

const blank = (v: unknown): unknown => (typeof v === 'string' ? '' : typeof v === 'number' ? 0 : Array.isArray(v) ? [] : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, blank(x)])) : '');

interface Props {
  content: Record<string, unknown>;
  editing?: boolean;
  onChange?: (c: Record<string, unknown>) => void;
  answers?: boolean;
  hl?: Highlighter;
  /** Pantalla de proyección: sin etiquetas pequeñas. */
  big?: boolean;
}

export function ContentView({ content, editing, onChange, answers = true, hl, big }: Props) {
  const set = (path: Path, v: unknown) => onChange?.(setAt(content, path, v));
  return <div className={cn('space-y-3', big ? 'space-y-5' : 'text-[14.5px]')}>{Object.entries(content).map(([k, v]) => <Fragment key={k}>{field(k, v, [k])}</Fragment>)}</div>;

  function field(k: string, v: unknown, path: Path): React.ReactNode {
    if (!editing && !answers && ANSWER_KEYS.includes(k)) return null;
    if (v === undefined || v === null || (Array.isArray(v) && !v.length && !editing)) return null;
    if (!editing && v === '') return null;
    const label = LABEL[k] ?? k;
    const lab = <span className={cn('text-label-2 font-semibold tracking-wide uppercase', big ? 'mr-3 text-[0.55em]' : 'text-[11px]')}>{label}</span>;
    const isAns = ANSWER_KEYS.includes(k);

    if (typeof v === 'string' || typeof v === 'number') {
      const s = String(v);
      if (editing)
        return (
          <label className="block">
            {lab}
            {SHORT_KEYS.includes(k) || typeof v === 'number' ? (
              <input
                value={s}
                aria-label={label}
                onChange={(e) => set(path, typeof v === 'number' ? Number(e.target.value) || 0 : e.target.value)}
                className="bg-fill-2/70 focus:bg-fill-2 mt-0.5 block w-full rounded-[8px] px-2 py-1 outline-none focus:ring-2 focus:ring-[color-mix(in_srgb,var(--blue)_45%,transparent)]"
              />
            ) : (
              <AutoText aria-label={label} value={s} onChange={(e) => set(path, e.target.value)} />
            )}
          </label>
        );
      if (k === 'sp' || k === 'speaker') return null;
      const paras = s.split(/\n+/);
      return (
        <div className={cn(isAns && 'text-label-2 italic')}>
          {['text', 'body', 'lede', 'headline', 'title', 'prompt', 'q', 'line', 'a', 'intro', 'subject'].includes(k) ? null : lab}
          {paras.map((p, i) => (
            <p key={i} className={cn(k === 'headline' && 'text-[1.15em] font-bold', k === 'title' && 'font-semibold', i > 0 && 'mt-2', big && 'leading-snug')}>
              {isAns && !big && <span className="text-label-2 mr-1 text-[11px] font-semibold not-italic">✓</span>}
              {hl && !isAns ? hl(p) : p}
            </p>
          ))}
        </div>
      );
    }

    if (Array.isArray(v)) {
      const first = v[0];
      const objects = first !== null && typeof first === 'object';
      return (
        <div>
          {k === 'lines' || k === 'sentences' || k === 'questions' || k === 'items' || k === 'qa' || k === 'cards' || k === 'sections' ? null : lab}
          <ul className={cn('space-y-1.5', !objects && !editing && 'list-disc pl-5', objects && 'space-y-2')}>
            {v.map((item, i) => (
              <li key={i} className={cn(objects && 'bg-fill-2/50 rounded-[12px] px-3 py-2', editing && 'flex items-start gap-1')}>
                <div className="min-w-0 flex-1">
                  {objects ? (
                    k === 'lines' && !editing ? (
                      <p>
                        <b>{String((item as Record<string, unknown>).sp)}</b>: {hl ? hl(String((item as Record<string, unknown>).line)) : String((item as Record<string, unknown>).line)}
                      </p>
                    ) : (
                      <div className="space-y-1.5">{Object.entries(item as Record<string, unknown>).map(([ik, iv]) => <Fragment key={ik}>{field(ik, iv, [...path, i, ik])}</Fragment>)}</div>
                    )
                  ) : editing ? (
                    <AutoText aria-label={`${label} ${i + 1}`} value={String(item)} onChange={(e) => set([...path, i], e.target.value)} />
                  ) : (
                    <span className={cn(isAns && 'text-label-2 italic')}>{hl && !isAns ? hl(String(item)) : String(item)}</span>
                  )}
                </div>
                {editing && <IconBtn label={`Quitar ${label} ${i + 1}`} onClick={() => set(path, v.filter((_, j) => j !== i))}><Trash2 size={14} /></IconBtn>}
              </li>
            ))}
          </ul>
          {editing && (
            <button type="button" onClick={() => set(path, [...v, blank(first ?? '')])} className="text-ink-blue mt-1.5 inline-flex items-center gap-1 text-[13px] font-semibold">
              <Plus size={14} /> Añadir {label.toLowerCase()}
            </button>
          )}
        </div>
      );
    }

    // objeto anidado (p. ej. quote)
    return (
      <div>
        {lab}
        <div className="border-separator mt-0.5 space-y-1.5 border-l-[3px] pl-3">{Object.entries(v as Record<string, unknown>).map(([ik, iv]) => <Fragment key={ik}>{field(ik, iv, [...path, ik])}</Fragment>)}</div>
      </div>
    );
  }
}
