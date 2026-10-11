import type { Meeting } from "./schemas";
const cache = new Map<
  string,
  { expires: number; data?: Meeting; promise: Promise<Meeting | null> }
>();
export function clearMeetingCache() {
  cache.clear();
}
export function prefetchMeeting(
  id: string,
  prefetch: (href: string) => void,
): Promise<Meeting | null> {
  prefetch("/meetings");
  const prior = cache.get(id);
  if (prior && prior.expires > Date.now()) return prior.promise;
  const promise = fetch(`/api/meetings/${encodeURIComponent(id)}`, {
    cache: "no-store",
  })
    .then(async (response) =>
      response.ok ? ((await response.json()) as Meeting) : null,
    )
    .catch(() => null);
  cache.set(id, { expires: Date.now() + 30000, promise });
  void promise.then((data) => {
    const entry = cache.get(id);
    if (data && entry?.promise === promise) entry.data = data;
  });
  if (cache.size > 30) cache.delete(cache.keys().next().value!);
  return promise;
}

export function cachedMeeting(id: string): Meeting | undefined {
  const entry = cache.get(id);
  return entry && entry.expires > Date.now() ? entry.data : undefined;
}
