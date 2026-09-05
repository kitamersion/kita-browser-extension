import { useCallback, useEffect, useState } from "react";
import IndexedDB from "@/db/index";

export function useAnilistCollectionCache<T>(cacheKey: string, ttlMs: number, fetchFn: () => Promise<T>) {
  const [data, setData] = useState<T | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [retryNonce, setRetryNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      setLoading(true);
      setError(null);

      try {
        const cached = await IndexedDB.getAniListCache(cacheKey);
        if (cached !== undefined) {
          if (!cancelled) {
            setData(cached);
            setLoading(false);
          }
          return;
        }

        const fetched = await fetchFn();
        if (!cancelled) {
          setData(fetched);
          setLoading(false);
        }

        try {
          await IndexedDB.setAniListCache(cacheKey, fetched, ttlMs);
        } catch {
          // Non-fatal: the value was already fetched and delivered above.
          // Losing the cache write just means this falls back to a fetch
          // again next time, instead of silently discarding good data.
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err : new Error(String(err)));
          setLoading(false);
        }
      }
    };

    load().catch((err) => {
      if (!cancelled) {
        setError(err instanceof Error ? err : new Error(String(err)));
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // fetchFn is intentionally omitted: this hook fetches once per
    // cacheKey/ttlMs pair, not on every render of a new inline fetchFn.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cacheKey, ttlMs, retryNonce]);

  // Bumps retryNonce to force the effect above to run again for the same
  // cacheKey (e.g. a "Retry" button after a failed fetch, which never wrote
  // a cache entry in the first place, so this naturally re-fetches).
  const refetch = useCallback(() => setRetryNonce((n) => n + 1), []);

  return { data, loading, error, refetch };
}
