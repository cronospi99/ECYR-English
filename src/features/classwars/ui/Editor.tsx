/* Class Wars — teacher-only editor for custom question sets (Supabase, migration 20). */
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, FileText, Plus, Save, Trash2, Eye } from 'lucide-react';
import { useAuth } from '@/store/auth';
import { cn } from '@/lib/cn';
import { LEVELS, SET_LIMITS, deleteSet, listSets, parseText, saveSet, validItem, type Q, type QSet } from '../game/questions';
import { Btn, Loading, Panel } from './kit';

const TILE = ['#d8343f', '#f07a1e', '#26a34a', '#2f6fe0'];

export function EditorScreen() {
  const profile = useAuth((s) => s.profile);
  const ready = useAuth((s) => s.ready);
  const [sets, setSets] = useState<QSet[] | null>(null);
  const [err, setErr] = useState('');
  const [edit, setEdit] = useState<QSet | null>(null);
  const reload = () => listSets().then((s) => { setSets(s); setErr(''); }).catch((e: Error) => { setSets([]); setErr(e.message); });
  useEffect(() => { if (profile?.role === 'teacher') void reload(); }, [profile]);

  if (!ready) return <div className="grid h-full place-items-center"><Loading /></div>;
  if (profile?.role !== 'teacher') return (
    <div className="grid h-full place-items-center p-4"><Panel className="max-w-[420px] p-6 text-center">
      <div className="text-[44px]">🔒</div><h1 className="cw-title mt-2 text-[24px]">Solo para docentes</h1>
      <p className="mt-2 text-[14px] font-semibold text-white/70">El editor de preguntas es para profes.</p>
      <Link to="/classwars"><Btn className="mt-4">Volver</Btn></Link>
    </Panel></div>
  );
  if (edit) return <SetEditor initial={edit} onDone={() => { setEdit(null); void reload(); }} />;

  return (
    <div className="cw-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-[860px] px-4 pt-[max(16px,env(safe-area-inset-top))] pb-16">
        <div className="mb-4 flex items-center gap-3">
          <Link to="/classwars" className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Volver"><ArrowLeft /></Link>
          <h1 className="cw-title text-[28px]">Mis preguntas</h1>
          <Btn tone="green" className="ml-auto" onClick={() => setEdit({ id: '', title: '', level: 'A2', items: [] })}><Plus size={18} /> Nuevo set</Btn>
        </div>
        {err && <p className="mb-3 rounded-xl bg-[#ff4d5e]/20 p-3 text-[14px] font-semibold text-[#ffb3ba]">No se pudieron cargar tus sets: {err}</p>}
        {sets === null ? <Loading /> : sets.length === 0 ? (
          <Panel className="p-8 text-center"><div className="text-[44px]">📝</div><p className="mt-2 text-[16px] font-bold text-white/75">Crea tu primer set de preguntas para usarlo en Class Wars.</p></Panel>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {sets.map((s) => (
              <Panel key={s.id} className="flex items-center gap-3 p-4">
                <span className="rounded-lg bg-[#ffd23f] px-2 py-0.5 text-[13px] font-black text-[#2a1d00]">{s.level}</span>
                <div className="min-w-0 flex-1"><div className="truncate text-[17px] font-black">{s.title}</div><div className="text-[13px] font-semibold text-white/60">{s.items.length} preguntas</div></div>
                <Btn tone="ghost" className="h-10 px-3" onClick={() => setEdit(s)}>Editar</Btn>
                <button type="button" aria-label={`Borrar ${s.title}`} onClick={async () => { if (confirm(`¿Borrar «${s.title}»?`)) { try { await deleteSet(s.id); void reload(); } catch (e) { alert((e as Error).message); } } }} className="grid h-10 w-10 place-items-center rounded-xl bg-[#ff4d5e]/20 text-[#ff8a95] hover:bg-[#ff4d5e]/35"><Trash2 size={18} /></button>
              </Panel>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

const blank = (): Q => ({ q: '', o: ['', '', '', ''], a: 0 });

function SetEditor({ initial, onDone }: { initial: QSet; onDone: () => void }) {
  const [title, setTitle] = useState(initial.title);
  const [level, setLevel] = useState(initial.level || 'A2');
  const [items, setItems] = useState<Q[]>(() => (initial.items.length ? initial.items.map((i) => ({ ...i, o: [...i.o, '', '', '', ''].slice(0, 4) })) : [blank()]));
  const [importing, setImporting] = useState(false);
  const [text, setText] = useState('');
  const [preview, setPreview] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const upd = (i: number, p: Partial<Q>) => setItems((arr) => arr.map((x, k) => (k === i ? { ...x, ...p } : x)));
  const clean = items.map((i) => {
    const o = i.o.map((x) => x.trim());
    const keep = o.map((x, k) => [x, k] as const).filter(([x]) => x);
    return { q: i.q.trim(), o: keep.map(([x]) => x), a: Math.max(0, keep.findIndex(([, k]) => k === i.a)) };
  }).filter((i) => i.q || i.o.length);
  const problems = clean.map(validItem);
  const firstBad = problems.findIndex(Boolean);
  const canSave = title.trim().length >= 2 && clean.length > 0 && firstBad < 0 && clean.length <= SET_LIMITS.items;

  const save = async () => {
    setSaving(true); setMsg('');
    try { await saveSet({ id: initial.id || null, title, level, items: clean }); onDone(); }
    catch (e) { setMsg((e as Error).message); }
    finally { setSaving(false); }
  };

  return (
    <div className="cw-scroll h-full overflow-y-auto">
      <div className="mx-auto max-w-[900px] px-4 pt-[max(16px,env(safe-area-inset-top))] pb-32">
        <div className="mb-4 flex items-center gap-3">
          <button type="button" onClick={onDone} className="grid h-10 w-10 place-items-center rounded-full bg-white/10 hover:bg-white/20" aria-label="Volver"><ArrowLeft /></button>
          <h1 className="cw-title text-[26px]">{initial.id ? 'Editar set' : 'Nuevo set'}</h1>
        </div>
        <Panel className="mb-4 flex flex-col gap-3 p-4 sm:flex-row sm:items-end">
          <label className="flex-1"><span className="text-[12px] font-extrabold tracking-wide text-white/60 uppercase">Título</span>
            <input value={title} onChange={(e) => setTitle(e.target.value.slice(0, SET_LIMITS.title))} placeholder="Ej.: Past simple — unidad 4" className="mt-1 h-12 w-full rounded-xl bg-white px-3 text-[17px] font-bold text-[#1b2350] outline-none" /></label>
          <div><span className="text-[12px] font-extrabold tracking-wide text-white/60 uppercase">Nivel</span>
            <div className="mt-1 flex gap-1">{LEVELS.map((l) => <button key={l} type="button" onClick={() => setLevel(l)} className={cn('h-12 rounded-xl px-3 text-[14px] font-black', level === l ? 'bg-[#ffd23f] text-[#2a1d00]' : 'bg-white/10')}>{l}</button>)}</div>
          </div>
        </Panel>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <div className="text-[15px] font-black">{clean.length} / {SET_LIMITS.items} preguntas</div>
          <Btn tone="ghost" className="ml-auto h-10" onClick={() => setImporting(!importing)}><FileText size={17} /> Importar texto</Btn>
          <Btn tone="blue" className="h-10" onClick={() => setItems((a) => [...a, blank()])} disabled={items.length >= SET_LIMITS.items}><Plus size={17} /> Pregunta</Btn>
        </div>
        {importing && (
          <Panel className="mb-4 p-4">
            <p className="text-[13.5px] font-semibold text-white/75">Una pregunta por línea: <code className="rounded bg-black/30 px-1">Pregunta | correcta | incorrecta | incorrecta | incorrecta</code><br />o un bloque: la pregunta y debajo las opciones, con <code className="rounded bg-black/30 px-1">*</code> delante de la correcta (línea en blanco entre preguntas).</p>
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} className="mt-2 w-full rounded-xl bg-white p-3 font-mono text-[14px] text-[#1b2350] outline-none" placeholder={'She ___ to school every day. | goes | go | going | gone\n\nWhat is the past of "buy"?\n*bought\nbuyed\nbuys\nbrought'} />
            <div className="mt-2 flex items-center gap-2">
              <span className="text-[13px] font-bold text-white/60">{parseText(text).length} preguntas detectadas</span>
              <Btn tone="green" className="ml-auto h-10" disabled={!parseText(text).length} onClick={() => { const add = parseText(text).map((q) => ({ ...q, o: [...q.o, '', '', '', ''].slice(0, 4) })); setItems((a) => [...a.filter((x) => x.q.trim() || x.o.some((o) => o.trim())), ...add].slice(0, SET_LIMITS.items)); setText(''); setImporting(false); }}>Añadir</Btn>
            </div>
          </Panel>
        )}
        <div className="flex flex-col gap-3">
          {items.map((it, i) => (
            <Panel key={i} className={cn('p-3 sm:p-4', problems[i] && (it.q || it.o.some(Boolean)) && 'border-[#ff4d5e]/50')}>
              <div className="flex items-start gap-2">
                <span className="mt-2.5 w-7 shrink-0 text-center text-[14px] font-black text-white/50">{i + 1}</span>
                <textarea value={it.q} onChange={(e) => upd(i, { q: e.target.value.slice(0, SET_LIMITS.q) })} rows={1} placeholder="Escribe la pregunta" className="min-h-[44px] flex-1 resize-y rounded-xl bg-white px-3 py-2.5 text-[16px] font-bold text-[#1b2350] outline-none" aria-label={`Pregunta ${i + 1}`} />
                <button type="button" onClick={() => setPreview(i)} className="grid h-11 w-11 place-items-center rounded-xl bg-white/10 hover:bg-white/20" aria-label="Vista previa"><Eye size={18} /></button>
                <button type="button" onClick={() => setItems((a) => a.filter((_, k) => k !== i))} className="grid h-11 w-11 place-items-center rounded-xl bg-[#ff4d5e]/20 text-[#ff8a95] hover:bg-[#ff4d5e]/35" aria-label="Borrar pregunta"><Trash2 size={18} /></button>
              </div>
              <div className="mt-2 grid gap-2 pl-9 sm:grid-cols-2">
                {it.o.map((o, k) => (
                  <div key={k} className="flex items-center gap-2 rounded-xl p-1 pr-2" style={{ background: TILE[k] + (it.a === k ? 'ff' : '55') }}>
                    <button type="button" onClick={() => upd(i, { a: k })} className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-lg border-2', it.a === k ? 'border-white bg-white text-[#26a34a]' : 'border-white/60')} aria-label={`Marcar opción ${k + 1} como correcta`}>{it.a === k && <Check strokeWidth={4} size={18} />}</button>
                    <input value={o} onChange={(e) => upd(i, { o: it.o.map((x, j) => (j === k ? e.target.value.slice(0, SET_LIMITS.o) : x)) })} placeholder={k < 2 ? `Opción ${k + 1}` : `Opción ${k + 1} (opcional)`} className="h-9 min-w-0 flex-1 bg-transparent text-[15px] font-bold text-white placeholder:text-white/60 outline-none" aria-label={`Opción ${k + 1}`} />
                  </div>
                ))}
              </div>
            </Panel>
          ))}
        </div>
      </div>
      <div className="fixed inset-x-0 bottom-0 flex flex-col items-center gap-1 bg-gradient-to-t from-[#0e1230] via-[#0e1230]/90 to-transparent px-4 pt-8 pb-[max(16px,env(safe-area-inset-bottom))]">
        {(msg || (firstBad >= 0 && clean.length > 0)) && <div className="text-[13px] font-bold text-[#ffb3ba]">{msg || `Pregunta ${firstBad + 1}: ${problems[firstBad]}`}</div>}
        <Btn big tone="green" className="w-full max-w-[420px]" disabled={!canSave || saving} onClick={save}><Save /> {saving ? 'Guardando…' : 'Guardar set'}</Btn>
      </div>
      {preview !== null && items[preview] && (
        <div className="fixed inset-0 z-50 flex flex-col bg-[#10153a]" onClick={() => setPreview(null)}>
          <div className="flex min-h-[30%] items-center justify-center bg-gradient-to-b from-[#3657e8] to-[#2a45c4] p-5"><h2 className="text-center text-[clamp(20px,4vmin,40px)] font-extrabold">{items[preview].q || '…'}</h2></div>
          <div className="grid flex-1 grid-cols-1 gap-3 p-3 sm:grid-cols-2">
            {items[preview].o.filter((o) => o.trim()).map((o, k) => <div key={k} className="flex items-center justify-center rounded-2xl text-[clamp(18px,3vmin,30px)] font-extrabold" style={{ background: TILE[k] }}>{o}</div>)}
          </div>
          <div className="p-3 text-center text-[13px] font-bold text-white/60">Vista previa · toca para cerrar</div>
        </div>
      )}
    </div>
  );
}
