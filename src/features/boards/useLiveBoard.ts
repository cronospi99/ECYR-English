import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/store/auth';
import {
  BoardError,
  addCard,
  closeBoard,
  deleteCard,
  getBoard,
  getCardImages,
  joinBoardChannel,
  likeCard,
  updateBoard,
  updateCard,
  type BoardBundle,
  type BoardChannel,
  type BoardPatch,
  type CardDraft,
  type CardPatch,
  type LiveCard,
} from '@/lib/boards';

const POLL_MS = 4000;

/**
 * One live board: loads it, keeps it fresh (broadcast "changed" + polling
 * every 4 s while the tab is visible) and applies the user's own writes
 * optimistically. While a write is in flight, fetched snapshots are ignored
 * (they could be older than the optimistic state); a refetch follows it.
 */
export function useLiveBoard(id: string) {
  const ready = useAuth((s) => s.ready);
  const signedIn = useAuth((s) => !!s.session);
  const myName = useAuth((s) => s.profile?.full_name ?? null);

  const [bundle, setBundle] = useState<BoardBundle | null>(null);
  const [fatal, setFatal] = useState<BoardError | null>(supabase ? null : new BoardError('offline', 'Necesitas conexión para usar el muro en vivo.'));
  const [netDown, setNetDown] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [online, setOnline] = useState<number | null>(null);
  const [images, setImages] = useState<Record<string, { rev: string; url: string }>>({});

  const inflight = useRef(0);
  const seq = useRef(0);
  const fetching = useRef(false);
  const again = useRef(false);
  const dragging = useRef<string | null>(null);
  const channel = useRef<BoardChannel | null>(null);
  const imagesRef = useRef(images);
  imagesRef.current = images;
  const loadingImages = useRef(new Set<string>());
  // Polling stops for good when the server says the board cannot work (no migration, no access).
  const dead = useRef(false);

  const say = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((t) => (t === msg ? null : t)), 3200);
  }, []);

  const refetch = useCallback(async () => {
    if (!supabase || !id || dead.current) return;
    if (fetching.current) {
      again.current = true;
      return;
    }
    fetching.current = true;
    const startSeq = seq.current;
    try {
      const data = await getBoard(id);
      setNetDown(false);
      setFatal(null);
      // A write started meanwhile: this snapshot may predate it.
      if (inflight.current > 0 || seq.current !== startSeq) return;
      setBundle((prev) => {
        const drag = dragging.current;
        if (!drag || !prev) return data;
        const local = prev.cards.find((c) => c.id === drag);
        return local ? { ...data, cards: data.cards.map((c) => (c.id === drag ? { ...c, x: local.x, y: local.y } : c)) } : data;
      });
    } catch (e) {
      const err = e instanceof BoardError ? e : new BoardError('other', String(e));
      if (err.kind === 'network') setNetDown(true);
      else if (err.kind === 'other' || err.kind === 'denied') say(err.message);
      else {
        if (err.kind === 'missing' || err.kind === 'not_found' || err.kind === 'offline') dead.current = true;
        setFatal(err);
      }
    } finally {
      fetching.current = false;
      if (again.current) {
        again.current = false;
        void refetch();
      }
    }
  }, [id, say]);

  // First load, live channel, polling.
  useEffect(() => {
    if (!supabase || !ready || !signedIn || !id) return;
    void refetch();
    let timer: number | undefined;
    let debounce: number | undefined;
    channel.current = joinBoardChannel(
      id,
      () => {
        window.clearTimeout(debounce);
        debounce = window.setTimeout(() => void refetch(), 120);
      },
      (s) => {
        setLive(s.live);
        setOnline(s.online);
      },
    );
    const tick = () => {
      if (document.visibilityState === 'visible') void refetch();
    };
    timer = window.setInterval(tick, POLL_MS);
    const onVis = () => {
      if (document.visibilityState === 'visible') void refetch();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      window.clearInterval(timer);
      window.clearTimeout(debounce);
      document.removeEventListener('visibilitychange', onVis);
      channel.current?.close();
      channel.current = null;
    };
  }, [id, ready, signedIn, refetch]);

  // Drawings: fetch the ones we do not have (or that changed).
  useEffect(() => {
    if (!bundle) return;
    const need = bundle.cards
      .filter((c) => c.has_image && !c.pending && imagesRef.current[c.id]?.rev !== c.rev && !loadingImages.current.has(c.id + c.rev))
      .map((c) => c);
    if (!need.length) return;
    need.forEach((c) => loadingImages.current.add(c.id + c.rev));
    getCardImages(id, need.map((c) => c.id))
      .then((got) => {
        setImages((prev) => {
          const next = { ...prev };
          for (const c of need) if (got[c.id]) next[c.id] = { rev: c.rev, url: got[c.id]! };
          return next;
        });
      })
      .catch(() => {
        need.forEach((c) => loadingImages.current.delete(c.id + c.rev));
      });
  }, [bundle, id]);

  /** Runs a write: optimistic change now, RPC, tell the others, refetch. */
  const write = useCallback(
    async <T,>(apply: ((b: BoardBundle) => BoardBundle) | null, op: () => Promise<T>): Promise<T | undefined> => {
      if (apply) setBundle((b) => (b ? apply(b) : b));
      inflight.current++;
      seq.current++;
      try {
        const r = await op();
        channel.current?.ping();
        return r;
      } catch (e) {
        say(e instanceof Error ? e.message : 'No se pudo guardar.');
        return undefined;
      } finally {
        inflight.current--;
        void refetch();
      }
    },
    [refetch, say],
  );

  const mapCard = (cardId: string, f: (c: LiveCard) => LiveCard) => (b: BoardBundle) => ({
    ...b,
    cards: b.cards.map((c) => (c.id === cardId ? f(c) : c)),
  });

  const add = useCallback(
    async (d: CardDraft) => {
      const temp = `tmp-${Math.random().toString(36).slice(2)}`;
      const now = new Date().toISOString();
      if (d.image) setImages((p) => ({ ...p, [temp]: { rev: now, url: d.image! } }));
      const realId = await write(
        (b) => ({
          ...b,
          cards: [
            ...b.cards,
            {
              id: temp,
              text: d.text.trim(),
              color: d.color,
              has_image: !!d.image,
              col: d.col ?? 0,
              x: d.x ?? 0,
              y: d.y ?? 0,
              position: Math.max(0, ...b.cards.map((c) => c.position)) + 1,
              likes: 0,
              liked: false,
              mine: true,
              by_teacher: b.role === 'teacher',
              author_id: null,
              author_name: myName,
              created_at: now,
              rev: now,
              pending: true,
            },
          ],
        }),
        () => addCard(id, d),
      );
      if (realId && d.image) {
        // Keep showing the local drawing until the server copy is fetched.
        setImages((p) => {
          const { [temp]: mine, ...rest } = p;
          return mine ? { ...rest, [realId]: { rev: '', url: mine.url } } : rest;
        });
      }
      if (!realId) setBundle((b) => (b ? { ...b, cards: b.cards.filter((c) => c.id !== temp) } : b));
      return realId;
    },
    [id, myName, write],
  );

  const patch = useCallback(
    (cardId: string, p: CardPatch) => {
      if (p.image) setImages((prev) => ({ ...prev, [cardId]: { rev: '', url: p.image! } }));
      return write(
        mapCard(cardId, (c) => ({ ...c, ...p, has_image: p.image !== undefined ? !!p.image : c.has_image })),
        () => updateCard(cardId, p),
      );
    },
    [write],
  );

  /** Moves a card locally only (while dragging). */
  const moveLocal = useCallback((cardId: string, x: number, y: number) => {
    setBundle((b) => (b ? mapCard(cardId, (c) => ({ ...c, x, y }))(b) : b));
  }, []);

  const remove = useCallback(
    (cardId: string) =>
      write(
        (b) => ({ ...b, cards: b.cards.filter((c) => c.id !== cardId), board: b.board.spotlight === cardId ? { ...b.board, spotlight: null } : b.board }),
        () => deleteCard(cardId),
      ),
    [write],
  );

  const like = useCallback(
    (cardId: string) =>
      write(
        mapCard(cardId, (c) => ({ ...c, liked: !c.liked, likes: Math.max(0, c.likes + (c.liked ? -1 : 1)) })),
        () => likeCard(cardId),
      ),
    [write],
  );

  const setBoard = useCallback(
    (p: BoardPatch) => write((b) => ({ ...b, board: { ...b.board, ...p } }), () => updateBoard(id, p)),
    [id, write],
  );

  const close = useCallback(
    (closed: boolean) =>
      write(
        (b) => ({ ...b, board: { ...b.board, closed_at: closed ? new Date().toISOString() : null, spotlight: null } }),
        () => closeBoard(id, closed),
      ),
    [id, write],
  );

  const shownFatal = fatal ?? (ready && !signedIn ? new BoardError('denied', 'Inicia sesión para entrar al muro.') : null);
  return {
    bundle,
    fatal: shownFatal,
    loading: !bundle && !shownFatal,
    netDown,
    toast,
    say,
    live,
    online,
    images,
    dragging,
    refetch,
    add,
    patch,
    moveLocal,
    remove,
    like,
    setBoard,
    close,
  };
}

export type LiveBoardApi = ReturnType<typeof useLiveBoard>;
