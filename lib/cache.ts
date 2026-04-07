// Tiny in-memory cache to avoid refetching identical data during navigation.
// Keeps the UI fast on low-spec machines and slow networks.

type CacheEntry<T> = {
  ts: number;
  data: T;
};

const cache = new Map<string, CacheEntry<unknown>>();

export async function cachedJson<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number
): Promise<T> {
  const now = Date.now();
  const hit = cache.get(key) as CacheEntry<T> | undefined;
  if (hit && now - hit.ts < ttlMs) return hit.data;

  const data = await fetcher();
  cache.set(key, { ts: now, data });
  return data;
}

export function clearCache(prefix?: string) {
  if (!prefix) {
    cache.clear();
    return;
  }
  for (const k of cache.keys()) {
    if (k.startsWith(prefix)) cache.delete(k);
  }
}
