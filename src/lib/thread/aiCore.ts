/**
 * Orquestación de la IA sin dependencias de red: recibe un generador `gen(parts) => texto`
 * (en la app es examAi.generate; en los tests, un simulacro). Cada recurso se pide por separado,
 * se valida, se reintenta una vez con "Fix: …" y, si falla, cae al borrador local SOLO de esa tarjeta.
 */
import type { Unit } from '../../content/types';
import { transitionOk } from './bridges';
import { countHits } from './profiles';
import { bridgePrompt, parseBridges, parseJsonLoose, normalizeContent, resourcePrompt, type ProposedBridge } from './prompts';
import { allowedWords, planContext, validateAll } from './plan';
import { localResource, type LocalOpts } from './resources';
import type { Anchor, PlanContext, Resource, ResourceKind, Thread } from './types';
import { uid } from './types';
import { hitText, knownWords, validateResource } from './validate';

export type Gen = (parts: unknown[]) => Promise<string>;

export interface AiOpts extends LocalOpts {
  avoid?: string;
  stage?: 'Presentation' | 'Production' | 'Warm-up' | 'Closing';
  known?: Set<string>;
}

/** Resumen corto del contenido anterior, para pedir "otra versión". */
export const summarize = (r: Resource) => JSON.stringify(r.content).replace(/\*\*/g, '').slice(0, 280);

export async function aiResource(gen: Gen, kind: ResourceKind, ctx: PlanContext, anchorId: string | undefined, o: AiOpts = {}): Promise<Resource> {
  const ts = anchorId ? ctx.targets.filter((t) => t.anchorId === anchorId) : ctx.targets;
  const use = ts.length ? ts : ctx.targets;
  const allowed = allowedWords(ctx);
  let fix: string[] | undefined;
  let reason = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    let text: string;
    try {
      text = await gen([{ text: resourcePrompt(kind, ctx, anchorId, { avoid: o.avoid, fix, stage: o.stage, exerciseType: o.exerciseType }) }]);
    } catch (e) {
      reason = (e as Error).message;
      break; // el servicio no responde: no se reintenta
    }
    try {
      const content = normalizeContent(kind, parseJsonLoose(text));
      const res: Resource = {
        id: uid('r'), kind, title: `${kind[0]!.toUpperCase()}${kind.slice(1)} · ${use.map((t) => t.label).join(' + ')}`, content,
        targets: use.map((t) => ({ anchorId: t.anchorId, hits: countHits(hitText({ kind, content }), t, true) })),
        source: 'ia', locked: false, edited: false,
      };
      const v = validateResource(res, { level: ctx.level, targets: ctx.targets, known: o.known, allowed });
      if (v.ok) return { ...res, validation: v };
      fix = v.errors;
      reason = v.errors.join('; ');
    } catch (e) {
      fix = [(e as Error).message];
      reason = (e as Error).message;
    }
  }
  const loc = localResource(kind, ctx, anchorId, o);
  return { ...loc, fallback: true, validation: { ...validateResource(loc, { level: ctx.level, targets: ctx.targets, known: o.known, allowed }), warnings: [`Respaldo local: ${reason || 'la IA no respondió'}`] } };
}

/** Tres contextos puente propuestos por la IA (reintenta una vez); null si falla (se usa el determinista). */
export async function aiBridges(gen: Gen, anchors: Anchor[], level: Thread['level'], mix: Thread['mix'], names: [string, string, string], userContext?: string): Promise<ProposedBridge[] | null> {
  let note = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await gen([{ text: bridgePrompt(anchors, level, { mix, userContext }) + note }]);
      const list = parseBridges(text, anchors, names);
      return list.map((p) => ({ ...p, transitions: Object.fromEntries(Object.entries(p.transitions).filter(([, tr]) => transitionOk(tr, p.bridge))) }));
    } catch (e) {
      note = `\nFix: your previous answer was not usable (${(e as Error).message}).`;
    }
  }
  return null;
}

export interface FillResult {
  ok: number;
  fallback: number;
}

type Update = (f: (t: Thread) => Thread) => void;

/**
 * Rellena con IA cada recurso no bloqueado ni editado, de uno en uno (concurrencia 2).
 * Cada tarjeta se reemplaza en cuanto llega; si el docente la editó o bloqueó mientras tanto, se respeta.
 */
export async function aiFill(gen: Gen, thread: Thread, units: Unit[], update: Update, onBusy?: (id: string, busy: boolean) => void, only?: { stageId?: string; resId?: string }): Promise<FillResult> {
  const ctx = planContext(thread, units);
  const known = knownWords(units);
  const jobs: { stageId: string; res: Resource; anchorId?: string; stage: AiOpts['stage']; use?: 'opener' | 'closer' }[] = [];
  for (const s of thread.stages) {
    if (s.locked || (only?.stageId && s.id !== only.stageId)) continue;
    for (const r of s.resources) {
      if (r.locked || r.edited || (only?.resId && r.id !== only.resId)) continue;
      jobs.push({
        stageId: s.id, res: r, anchorId: s.anchorId,
        stage: s.kind === 'presentation' ? 'Presentation' : s.kind === 'production' ? 'Production' : s.kind === 'closing' ? 'Closing' : 'Warm-up',
        use: r.kind === 'game' && !s.anchorId ? (s.kind === 'closing' ? 'closer' : 'opener') : undefined,
      });
    }
  }
  const out: FillResult = { ok: 0, fallback: 0 };
  for (const j of jobs) if (!j.use) onBusy?.(j.res.id, true);
  let next = 0;
  const worker = async () => {
    while (next < jobs.length) {
      const j = jobs[next++]!;
      // El juego de apertura/cierre es una plantilla del plan: se deja en local.
      const fresh = j.use ? null : await aiResource(gen, j.res.kind, ctx, j.anchorId, { stage: j.stage, known, avoid: only?.resId ? summarize(j.res) : undefined, variant: (Date.now() % 997) });
      if (fresh) {
        if (fresh.fallback) out.fallback++;
        else out.ok++;
        update((t) => ({
          ...t,
          stages: t.stages.map((s) =>
            s.id !== j.stageId ? s : { ...s, resources: s.resources.map((r) => (r.id === j.res.id && !r.locked && !r.edited ? { ...fresh, id: r.id } : r)) },
          ),
          source: fresh.fallback ? t.source : 'ia',
        }));
      }
      onBusy?.(j.res.id, false);
    }
  };
  await Promise.all([worker(), worker()]);
  update((t) => validateAll(t, ctx, known));
  return out;
}
