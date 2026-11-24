import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Page } from '@/components/ui/Page';
import { Button } from '@/components/ui/Button';
import { PageLoader } from '@/components/ui/Misc';
import { useAsync } from '@/hooks/useAsync';
import { levelMeta, loadLevel } from '@/content/levels';
import { dominant } from '@/lib/engagement';
import { aiBridges, aiFill } from '@/lib/thread/aiCore';
import { chooseBridges, makeBridge } from '@/lib/thread/bridges';
import { addAnchor, buildPlanLocal, namesFor, planContext } from '@/lib/thread/plan';
import { clearDraft, loadDraft, loadPrefs, recentBridgeIds, saveDraft, savePrefs } from '@/lib/thread/storage';
import type { Anchor, Bridge, Thread } from '@/lib/thread/types';
import { knownWords } from '@/lib/thread/validate';
import { Planner, type PlannerState, type Proposal } from './Planner';
import { PlanView } from './PlanView';
import { PresentMode } from './PresentMode';
import { aiAvailable, gen } from './aiClient';

const TeamChallenge = lazy(() => import('../TeamChallenge').then((m) => ({ default: m.TeamChallenge })));

const sameAnchor = (a: Anchor, b: Anchor) =>
  a.type === b.type && (a.type === 'grammar' ? a.unit === (b as typeof a).unit && a.point === (b as typeof a).point : a.type === 'vocab' ? a.unit === (b as typeof a).unit && a.terms.join() === (b as typeof a).terms.join() : a.text === (b as typeof a).text);

/** Hilo de la clase v2: contexto puente + plan PPP editable, guardable y proyectable. */
export default function ThreadApp() {
  const [sp, setSp] = useSearchParams();
  const prefs0 = useMemo(loadPrefs, []);
  const [s, setS] = useState<PlannerState>({ level: prefs0.level, anchors: [], duration: prefs0.duration, mix: prefs0.mix, style: prefs0.style ?? '', userContext: '', useAi: prefs0.useAi });
  const set = useCallback((p: Partial<PlannerState>) => setS((x) => ({ ...x, ...p })), []);
  const [thread, setThread] = useState<Thread | null>(null);
  const [proposals, setProposals] = useState<(Proposal & { transitions?: Record<string, { teacher_es: string; student_en: string }> })[] | null>(null);
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [thinking, setThinking] = useState(false);
  const [notice, setNotice] = useState('');
  const [present, setPresent] = useState(false);
  const [game, setGame] = useState(false);
  const [draft, setDraft] = useState<Thread | null>(() => loadDraft());
  const seed = useRef(Math.floor(Math.random() * 1000));
  const color = levelMeta(s.level)?.color ?? 'var(--purple)';

  const { data: book, loading } = useAsync(() => loadLevel(s.level), [s.level]);
  const units = useMemo(() => (book && book.level === s.level ? book.units : []), [book, s.level]);
  const ready = !!thread && units.length > 0 && thread.level === s.level;
  const ctx = useMemo(() => (ready ? planContext(thread!, units) : null), [ready, thread, units]);
  const known = useMemo(() => knownWords(units), [units]);

  useEffect(() => {
    savePrefs({ level: s.level, duration: s.duration, mix: s.mix, useAi: s.useAi, style: s.style || undefined });
  }, [s.level, s.duration, s.mix, s.useAi, s.style]);

  // Autoguardado del borrador (600 ms después de la última edición)
  useEffect(() => {
    if (!thread) return;
    const h = setTimeout(() => saveDraft(thread), 600);
    return () => clearTimeout(h);
  }, [thread]);

  const update = useCallback((f: (t: Thread) => Thread) => setThread((t) => (t ? f(t) : t)), []);
  const aiOn = s.useAi && aiAvailable;

  const open = useCallback((t: Thread) => {
    setThread(t);
    setS((x) => ({ ...x, level: t.level, anchors: t.anchors, duration: t.duration, mix: t.mix, style: t.style ?? '', userContext: t.userContext ?? '' }));
    setProposals(null);
    setDraft(null);
  }, []);

  // ?present=1 abre la presentación con el borrador
  useEffect(() => {
    if (sp.get('present') === '1') {
      const d = loadDraft();
      if (d) {
        open(d);
        setPresent(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const setPresentation = (v: boolean) => {
    setPresent(v);
    const n = new URLSearchParams(sp);
    if (v) n.set('present', '1');
    else n.delete('present');
    setSp(n, { replace: true });
  };

  const runAi = useCallback(
    async (t: Thread, only?: { stageId?: string; resId?: string }) => {
      if (!units.length) return;
      setNotice('La IA está escribiendo las tarjetas una a una…');
      const r = await aiFill(gen, t, units, update, (id, b) => setBusyIds((x) => { const n = new Set(x); if (b) n.add(id); else n.delete(id); return n; }), only);
      setNotice(r.fallback ? `${r.ok} tarjeta(s) con IA y ${r.fallback} con borrador local porque la IA no respondió bien. Puedes pedir «Otra versión» en cada una.` : `${r.ok} tarjeta(s) escritas por IA.`);
    },
    [units, update],
  );

  const detProposals = (): Proposal[] => {
    const names = namesFor(s.mix, seed.current);
    return chooseBridges(s.anchors, s.level, seed.current, recentBridgeIds()).map((p) => ({ bridge: makeBridge(p.def, s.anchors, names) }));
  };

  const start = (bridge: Bridge, alts: Bridge[], transitions?: Record<string, { teacher_es: string; student_en: string }>) => {
    let t = buildPlanLocal({ level: s.level, units, anchors: s.anchors, duration: s.duration, mix: s.mix, bridge, alternatives: alts, seed: seed.current, style: s.style || undefined, userContext: s.userContext || undefined });
    if (transitions)
      t = {
        ...t,
        stages: t.stages.map((st) => {
          const k = t.anchors.findIndex((a) => a.id === st.anchorId);
          const tr = st.kind === 'presentation' && k > 0 ? transitions[st.anchorId!] : undefined;
          return tr ? { ...st, transition: { ...tr, from: st.transition?.from } } : st;
        }),
      };
    // los ids de las anclas cambian al ordenarlas: el rationale ya usa los ids de `s.anchors` (se conservan)
    setThread(t);
    setProposals(null);
    setNotice('Plan listo: puente + PPP. Todo se puede editar, bloquear o regenerar.');
    if (aiOn) void runAi(t);
  };

  const best = () => {
    const p = detProposals();
    start(p[0]!.bridge, p.slice(1).map((x) => x.bridge));
  };
  const propose = async () => {
    const det = detProposals();
    setProposals(det);
    if (!aiOn) return;
    setThinking(true);
    const names = namesFor(s.mix, seed.current);
    const ai = await aiBridges(gen, s.anchors, s.level, s.mix, names, s.userContext || undefined);
    setThinking(false);
    if (ai?.length) setProposals(ai.map((p) => ({ bridge: p.bridge, transitions: p.transitions })));
    else setNotice('La IA no propuso contextos válidos: te muestro los del catálogo.');
  };
  const choose = (b: Bridge) => {
    const list = proposals ?? [];
    const chosen = list.find((p) => p.bridge.id === b.id);
    start(b, list.filter((p) => p.bridge.id !== b.id).map((p) => p.bridge), chosen?.transitions);
  };

  const addToPlan = () => {
    if (!thread) return;
    const fresh = s.anchors.filter((a) => !thread.anchors.some((x) => sameAnchor(x, a)));
    if (!fresh.length) {
      setNotice('Todas las anclas ya están en el plan.');
      return;
    }
    let next = thread;
    for (const a of fresh) next = addAnchor(next, a, units);
    setThread(next);
    setNotice(`Añadí ${fresh.length} ancla(s) con borrador local; usa «Otra versión» para pedir IA.`);
  };

  const challenge = thread?.teamChallenge;

  return (
    <Page
      back={{ to: '/teacher?tab=material', label: 'Sala de profesores' }}
      eyebrow="Solo docentes"
      title="Hilo de la clase"
      subtitle="Elige las anclas (frases, temas o puntos de distintas unidades): el hilo crea un contexto puente y un plan PPP que puedes editar, guardar y proyectar."
      wide
      actions={<Link to="?v=1" className="text-ink-blue text-[14px] font-semibold underline">Modo clásico</Link>}
    >
      <div role="status" aria-live="polite" className="no-print">
        {notice && (
          <p className="bg-fill-2 mb-3 flex items-start justify-between gap-3 rounded-[12px] px-3.5 py-2 text-[14px]">
            <span>{notice}</span>
            <button type="button" onClick={() => setNotice('')} className="text-label-2 shrink-0 text-[12.5px] font-semibold">Cerrar</button>
          </p>
        )}
      </div>

      {draft && !thread && (
        <div className="bg-fill-2 no-print mb-4 flex flex-wrap items-center gap-3 rounded-[14px] px-4 py-3 text-[14.5px]">
          <span className="min-w-0 flex-1">Hay un borrador sin guardar: <b>{draft.name || draft.bridge.title}</b> · {draft.level} · {new Date(draft.updatedAt).toLocaleString()}</span>
          <Button size="sm" onClick={() => open(draft)}>Recuperar borrador</Button>
          <Button size="sm" variant="gray" onClick={() => { clearDraft(); setDraft(null); }}>Descartar</Button>
        </div>
      )}

      <Planner
        s={s}
        set={set}
        units={units}
        loading={loading || !units.length}
        color={color}
        aiOk={aiAvailable}
        busy={thinking}
        onPropose={() => void propose()}
        onBest={best}
        proposals={proposals}
        onChoose={choose}
        hasPlan={!!thread && thread.level === s.level}
        onAddToPlan={addToPlan}
      />

      {thread && !ready && <PageLoader />}
      {thread && ready && ctx && (
        <div className="mx-auto max-w-4xl">
          <PlanView thread={thread} units={units} ctx={ctx} known={known} update={update} busy={busyIds} useAi={aiOn} onAi={(only) => void runAi(thread, only)} onPresent={() => setPresentation(true)} onChallenge={() => setGame(true)} onOpen={open} onNotice={setNotice} color={color} />
        </div>
      )}
      {thread && ready && ctx && present && <PresentMode thread={thread} ctx={ctx} color={color} onClose={() => setPresentation(false)} />}
      {thread && game && challenge && (
        <Suspense fallback={null}>
          <TeamChallenge audience={thread.audience ?? dominant(thread.mix)} mix={thread.mix} level={thread.level} vocab={challenge.vocab} grammar={challenge.grammar} onClose={() => setGame(false)} />
        </Suspense>
      )}
    </Page>
  );
}
