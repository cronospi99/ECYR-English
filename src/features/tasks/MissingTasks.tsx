import { useState } from 'react';
import { Copy, Database } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/cn';

const FILE = 'supabase/migrations/09_assignments.sql';

/** "Tareas is not set up on the server yet" — with the exact fix for the admin. */
export function MissingTasksCard({ className, onRetry, bare = false }: { className?: string; onRetry?: () => void; bare?: boolean }) {
  const [copied, setCopied] = useState(false);
  const body = (
    <div className="flex items-start gap-3 text-left" role="alert">
      <span className="text-ink-orange flex h-10 w-10 shrink-0 items-center justify-center rounded-[12px] bg-[color-mix(in_srgb,var(--orange)_15%,transparent)]">
        <Database size={20} aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h3 className="text-headline">Falta activar Tareas</h3>
        <p className="text-subhead text-label-2 mt-0.5">
          Ejecuta <code className="bg-fill text-label rounded px-1 text-[0.92em] break-all">{FILE}</code> en Supabase → <b className="text-label">SQL Editor</b> (o vuelve a pegar{' '}
          <code className="bg-fill text-label rounded px-1 text-[0.92em]">supabase/setup.sql</code>, que es seguro re-ejecutar). Después recarga esta página.
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="gray"
            onClick={() => {
              void navigator.clipboard?.writeText(FILE);
              setCopied(true);
              setTimeout(() => setCopied(false), 1500);
            }}
          >
            <Copy size={14} aria-hidden /> {copied ? 'Copiado' : 'Copiar ruta del archivo'}
          </Button>
          {onRetry && (
            <Button size="sm" variant="tinted" onClick={onRetry}>
              Ya lo ejecuté · reintentar
            </Button>
          )}
        </div>
      </div>
    </div>
  );
  if (bare) return <div className={className}>{body}</div>;
  return <Card className={cn('p-5', className)}>{body}</Card>;
}
