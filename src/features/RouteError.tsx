import { useEffect, useState } from 'react';
import { useLocation, useRouteError } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { reloadOnce } from '@/lib/chunks';

/** Where the error happened, short enough to read from a photo of the screen. */
function whereOf(err: unknown): string[] {
  const stack = err instanceof Error && typeof err.stack === 'string' ? err.stack : '';
  return stack
    .split('\n')
    .slice(1)
    .map((l) => l.trim().replace(/^at /, '').replace(/https?:\/\/[^/]+\//g, '/').replace(/\?[^:)]*/g, ''))
    .filter((l) => l && !/node_modules|react-dom|chunk-|\/vendor/.test(l))
    .slice(0, 4);
}

export function RouteError() {
  const err = useRouteError() as Error | undefined;
  const loc = useLocation();
  const [reloading] = useState(() => reloadOnce(err));
  const [open, setOpen] = useState(false);
  const where = whereOf(err);

  useEffect(() => {
    if (!reloading) console.error('[route error]', loc.pathname, err);
  }, [err, loc.pathname, reloading]);

  if (reloading) return null;
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 p-8 text-center">
      <TriangleAlert size={44} className="text-ink-orange" />
      <h1 className="text-title-2">Something went wrong</h1>
      <p className="text-label-2 max-w-md">{err?.message ?? 'Unexpected error.'}</p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" onClick={() => window.location.reload()} className="bg-fill-2 rounded-full px-5 py-2.5 font-semibold">
          Try again
        </button>
        {/* A full page load, not a router link: the app starts clean. */}
        <a href="/" className="text-ink-blue font-semibold">
          Back to home
        </a>
      </div>
      <button type="button" onClick={() => setOpen((o) => !o)} className="text-label-3 text-[13px] underline">
        {open ? 'Hide details' : 'Details for your teacher'}
      </button>
      {open && (
        <pre className="bg-fill-2 text-label-2 max-w-full overflow-x-auto rounded-xl p-3 text-left text-[11px] leading-snug whitespace-pre-wrap select-all">
          {[`Page: ${loc.pathname}${loc.search}`, ...where.map((w) => `· ${w}`), navigator.userAgent.slice(0, 120)].join('\n')}
        </pre>
      )}
    </div>
  );
}
