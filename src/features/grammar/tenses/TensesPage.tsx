import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion } from 'motion/react';
import { Page } from '@/components/ui/Page';
import { Segmented } from '@/components/ui/Segmented';
import { BuildMode, PracticeMode, TenseMap, WithLexicon, WriteMode } from './TenseTools';

type Tab = 'write' | 'build' | 'practice' | 'map';
const TABS: { value: Tab; label: string }[] = [
  { value: 'write', label: 'Escribe' },
  { value: 'build', label: 'Construye' },
  { value: 'practice', label: 'Practica' },
  { value: 'map', label: 'Los 15 tiempos' },
];

export default function TensesPage() {
  const [params, setParams] = useSearchParams();
  const tab = TABS.find((t) => t.value === params.get('tab'))?.value ?? 'write';
  const [seed, setSeed] = useState<string | undefined>(undefined);
  return (
    <Page
      back={{ to: '/learn/grammar', label: 'Gramática' }}
      eyebrow="A1 – C2 · Todos los tiempos verbales en una línea"
      title="Tense Timeline"
      subtitle="Escribe una frase y mira cómo se mueve la línea del tiempo, constrúyela pieza a pieza o practica dibujando el tiempo correcto."
      wide
    >
      <div className="no-scrollbar mb-5 overflow-x-auto">
        <Segmented<Tab> value={tab} onChange={(t) => setParams({ tab: t }, { replace: true })} options={TABS} />
      </div>
      <WithLexicon>
        {(lex) => (
          <motion.div key={tab + (seed ?? '')} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className={tab === 'map' ? '' : 'mx-auto max-w-4xl'}>
            {tab === 'write' && <WriteMode lex={lex} initial={seed} />}
            {tab === 'build' && <BuildMode lex={lex} />}
            {tab === 'practice' && <PracticeMode lex={lex} />}
            {tab === 'map' && (
              <TenseMap
                lex={lex}
                onOpen={(s) => {
                  setSeed(s);
                  setParams({ tab: 'write' }, { replace: true });
                }}
              />
            )}
          </motion.div>
        )}
      </WithLexicon>
    </Page>
  );
}
