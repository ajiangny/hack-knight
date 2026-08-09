// Shared fetch-on-mount hook with an in-memory, session-lifetime cache.
//
// Every public page used to fetch its data fresh on each mount, so every
// navigation rendered a loading state (a blank register page, static
// fallbacks flashing before real data) while the same endpoints were hit
// again. Caching the last response per path lets a remount render the real
// data instantly; when a cached entry is older than STALE_MS the hook
// serves it anyway and revalidates in the background, so admin edits still
// propagate without a reload.

import { useEffect, useState } from "react";

const API_URL = import.meta.env.VITE_API_URL ?? "";

// How long a cached response is served without a background refresh. Admin
// changes (e.g. the registration toggle) can lag by up to this much for a
// visitor who keeps navigating without reloading.
const STALE_MS = 60_000;

interface CacheEntry {
  data: unknown;
  fetchedAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<unknown>>();

// Deduplicates concurrent requests for the same path (the Navbar and the
// countdown both read /settings on first paint) and records the result.
function load(path: string): Promise<unknown> {
  const pending = inflight.get(path);
  if (pending) return pending;

  const request = (async () => {
    const res = await fetch(`${API_URL}${path}`);
    if (!res.ok) throw new Error(`Failed to fetch ${path}`);
    const data: unknown = await res.json();
    cache.set(path, { data, fetchedAt: Date.now() });
    return data;
  })().finally(() => inflight.delete(path));

  inflight.set(path, request);
  return request;
}

// Resolves with a fresh-enough cached value, otherwise (re)fetches. A stale
// entry still refetches, but the hook keeps showing it until the fresh
// response lands (stale-while-revalidate).
function read(path: string): Promise<unknown> {
  const entry = cache.get(path);
  if (entry && Date.now() - entry.fetchedAt < STALE_MS) {
    return Promise.resolve(entry.data);
  }
  return load(path);
}

// Pass `enabled: false` to skip the fetch entirely (e.g. when a caller
// already has its own values, such as the admin live preview).
//
// `data` is undefined until the first response for that path arrives;
// callers keep supplying their own fallbacks, so an unreachable API still
// degrades to the bundled behavior.
export function useApiData<T>(
  path: string,
  { enabled = true }: { enabled?: boolean } = {},
) {
  const cached = cache.get(path);
  const [data, setData] = useState<T | undefined>(
    cached?.data as T | undefined,
  );
  const [loading, setLoading] = useState(enabled && cached === undefined);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    read(path).then(
      (fresh) => {
        if (cancelled) return;
        setData(fresh as T);
        setLoading(false);
      },
      (err) => {
        if (cancelled) return;
        // Keep any previously cached data; only the refresh failed.
        setError(err as Error);
        setLoading(false);
      },
    );

    return () => {
      cancelled = true;
    };
  }, [path, enabled]);

  return { data, loading, error };
}
