import { useRouteError, Link } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';

export function RouteError() {
  const err = useRouteError() as Error | undefined;
  // A new deploy invalidates old chunk hashes; one reload fetches the new ones.
  if (err?.message && /dynamically imported module|Importing a module script failed/i.test(err.message)) {
    if (!sessionStorage.getItem('ecyr:reloaded')) {
      sessionStorage.setItem('ecyr:reloaded', '1');
      window.location.reload();
      return null;
    }
  }
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <TriangleAlert size={44} className="text-ink-orange" />
      <h1 className="text-title-2">Algo salió mal</h1>
      <p className="text-label-2 max-w-md">{err?.message ?? 'Error inesperado.'}</p>
      <Link to="/" className="text-ink-blue font-semibold">
        Volver al inicio
      </Link>
    </div>
  );
}
