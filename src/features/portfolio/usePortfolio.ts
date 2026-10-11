import { useCallback, useEffect, useRef, useState } from 'react';
import { listPortfolio, portfolioSignedUrls, type PortfolioItem } from '@/lib/portfolio';

export interface PortfolioState {
  items: PortfolioItem[];
  loading: boolean;
  error: string | null;
  reload: () => Promise<void>;
  /** Insert or replace one item locally (after create / update / review). */
  put: (item: PortfolioItem) => void;
  /** Drop one item locally (after delete). */
  drop: (id: string) => void;
  /** Signed thumbnail URLs for image items, keyed by file_path. */
  thumbs: Record<string, string>;
}

/** Loads one user's portfolio and keeps it in sync with local edits. */
export function usePortfolio(userId: string | null | undefined): PortfolioState {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState<string | null>(null);
  const [thumbs, setThumbs] = useState<Record<string, string>>({});
  const req = useRef(0);
  const tried = useRef(new Set<string>());

  const reload = useCallback(async () => {
    if (!userId) {
      setItems([]);
      setLoading(false);
      return;
    }
    const n = ++req.current;
    setLoading(true);
    setError(null);
    try {
      const list = await listPortfolio(userId);
      if (n === req.current) setItems(list);
    } catch (e) {
      if (n === req.current) setError(e instanceof Error ? e.message : String(e));
    } finally {
      if (n === req.current) setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  // Thumbnails: sign only the image paths we do not have yet, in one request.
  useEffect(() => {
    const missing = items
      .filter((i) => i.file_path && i.file_type?.startsWith('image/') && !tried.current.has(i.file_path))
      .map((i) => i.file_path!);
    if (!missing.length) return;
    missing.forEach((p) => tried.current.add(p));
    portfolioSignedUrls(missing)
      .then((urls) => setThumbs((t) => ({ ...t, ...urls })))
      .catch(() => missing.forEach((p) => tried.current.delete(p)));
  }, [items]);

  const put = useCallback((item: PortfolioItem) => {
    setItems((list) => {
      const i = list.findIndex((x) => x.id === item.id);
      if (i === -1) return [item, ...list];
      const next = list.slice();
      next[i] = item;
      return next;
    });
  }, []);

  const drop = useCallback((id: string) => setItems((list) => list.filter((x) => x.id !== id)), []);

  return { items, loading, error, reload, put, drop, thumbs };
}
