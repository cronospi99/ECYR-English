import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Page } from '@/components/ui/Page';
import { Chip } from '@/components/ui/Misc';
import { Segmented } from '@/components/ui/Segmented';
import { VisualCard, Lightbox } from '@/components/visuals/Visuals';
import { VISUALS, type Visual, type VisualPlace } from '@/content/visuals';
import { CEFR_LEVELS, type CefrLevel } from '@/content/types';

type Kind = 'all' | Visual['kind'];

const MODULE_NAME: Record<string, string> = { modals: 'Modal Verbs', 'time-machine': 'Time Machine', 'time-family': 'Time & Family', verbs: 'Verb Lab' };
const PRACTICE_NAME: Record<string, string> = { reading: 'Reading', listening: 'Listening', speaking: 'Speaking', writing: 'Writing', 'phrasal-verbs': 'Phrasal Verbs' };
const SECTION: Record<string, string> = { overview: 'resumen', vocab: 'vocabulario', grammar: 'gramática' };

function placeLink(p: VisualPlace): { to: string; label: string } {
  if ('unit' in p) {
    const [lv, n] = p.unit.split('-');
    const tab = p.section === 'overview' ? '' : `?tab=${p.section}`;
    return { to: `/learn/${lv!.toLowerCase()}/${n}${tab}`, label: `${lv} · U${n} · ${SECTION[p.section]}` };
  }
  if ('module' in p) return { to: p.module === 'verbs' ? '/practice/verbs' : `/learn/grammar/${p.module}`, label: MODULE_NAME[p.module] ?? p.module };
  if ('guide' in p) return { to: '/practice/reading', label: `Guía: ${p.guide}` };
  return { to: `/practice/${p.practice}`, label: PRACTICE_NAME[p.practice] ?? p.practice };
}

export default function VisualsPage() {
  const [level, setLevel] = useState<CefrLevel | 'all'>('all');
  const [kind, setKind] = useState<Kind>('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<number | null>(null);
  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    return VISUALS.filter(
      (v) =>
        (level === 'all' || v.levels.includes(level)) &&
        (kind === 'all' || v.kind === kind) &&
        (!term || `${v.title} ${v.titleEs} ${v.tags.join(' ')}`.toLowerCase().includes(term)),
    );
  }, [level, kind, q]);

  return (
    <Page
      back={{ to: '/learn', label: 'Aprender' }}
      title="Biblioteca visual"
      subtitle="Infografías para explicar y repasar de un vistazo. Cada una aparece también en las unidades donde se enseña ese tema; ábrelas a pantalla completa para proyectarlas en clase."
      wide
    >
      <div className="mb-5 flex flex-wrap items-center gap-2">
        <label className="bg-card shadow-card flex h-10 min-w-[220px] flex-1 items-center gap-2 rounded-full px-4 sm:max-w-xs">
          <Search size={16} className="text-label-2" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar tema (conditionals, get…)"
            aria-label="Buscar infografía"
            className="placeholder:text-label-3 min-w-0 flex-1 bg-transparent text-[16px] outline-none"
          />
        </label>
        <Segmented<Kind>
          size="sm"
          value={kind}
          onChange={setKind}
          options={[
            { value: 'all', label: 'Todas' },
            { value: 'grammar', label: 'Gramática' },
            { value: 'vocabulary', label: 'Vocabulario' },
            { value: 'functions', label: 'Funciones' },
          ]}
        />
      </div>
      <div className="no-scrollbar -mx-1 mb-5 flex gap-2 overflow-x-auto px-1 py-1">
        <Chip active={level === 'all'} onClick={() => setLevel('all')}>
          Todos los niveles
        </Chip>
        {CEFR_LEVELS.map((l) => (
          <Chip key={l} active={level === l} onClick={() => setLevel(l)}>
            {l}
          </Chip>
        ))}
      </div>

      {list.length === 0 ? (
        <p className="text-label-2 py-16 text-center">No hay infografías con esos filtros.</p>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {list.map((v, i) => (
            <div key={v.id} className="flex flex-col gap-2">
              <VisualCard v={v} size="lg" onOpen={() => setOpen(i)} />
              <div className="flex flex-wrap gap-1.5 px-1">
                {v.places.slice(0, 6).map((p, k) => {
                  const l = placeLink(p);
                  return (
                    <Link key={k} to={l.to} className="bg-fill-2 hover:bg-fill text-label-2 rounded-full px-2.5 py-1 text-[11px] font-medium">
                      {l.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
      <Lightbox items={list} index={open} onClose={() => setOpen(null)} onIndex={setOpen} />
    </Page>
  );
}
