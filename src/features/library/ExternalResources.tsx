import { ExternalLink } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { cn } from '@/lib/cn';

/**
 * Sites that inspired parts of this section. Their material stays on their
 * sites: we link to them and credit them; everything inside ECYR English is
 * our own writing.
 */
export const EXTERNAL_RESOURCES = [
  {
    name: 'ELC Study Zone · University of Victoria',
    url: 'https://continuingstudies.uvic.ca/elc/studyzone/',
    emoji: '🎧',
    what: 'Lecturas y audios por niveles (200–500) con ejercicios de comprensión, gramática y vocabulario.',
    owner: '© University of Victoria, English Language Centre',
  },
  {
    name: 'Test English',
    url: 'https://test-english.com/',
    emoji: '📝',
    what: 'Gramática, vocabulario, reading, listening y writing de A1 a C1, organizados por nivel y tema.',
    owner: '© Test-English.com',
  },
  {
    name: 'Games to Learn English',
    url: 'https://www.gamestolearnenglish.com/',
    emoji: '🎮',
    what: 'Juegos en línea para practicar vocabulario, gramática y ortografía.',
    owner: '© Games to Learn English',
  },
  {
    name: 'Englishan · Linking words',
    url: 'https://englishan.com/',
    emoji: '🔗',
    what: 'Infografía de conectores que sirvió de base para la lista de linking words.',
    owner: '© englishan.com',
  },
] as const;

export function ExternalResources({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <section className={className}>
      <h2 className="text-[17px] font-bold">Más práctica en la web</h2>
      <p className="text-label-2 mt-1 text-[13.5px]">
        Las lecturas, audios, talleres y juegos de ECYR English son material original. Estos sitios inspiraron su organización; su contenido les pertenece y se
        abre en su página.
      </p>
      <div className={cn('mt-3 grid gap-2.5', compact ? 'sm:grid-cols-2' : 'sm:grid-cols-2 lg:grid-cols-4')}>
        {EXTERNAL_RESOURCES.map((r) => (
          <a key={r.url} href={r.url} target="_blank" rel="noopener noreferrer" className="block">
            <Card className="flex h-full items-start gap-3 p-3.5 transition-transform active:scale-[0.99]">
              <span className="text-[26px] leading-none">{r.emoji}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1 text-[14.5px] font-semibold">
                  <span className="truncate">{r.name}</span> <ExternalLink size={13} className="text-label-3 shrink-0" />
                </span>
                <span className="text-label-2 mt-0.5 block text-[12.5px] leading-snug">{r.what}</span>
                <span className="text-label-3 mt-1 block text-[11px]">{r.owner}</span>
              </span>
            </Card>
          </a>
        ))}
      </div>
    </section>
  );
}
