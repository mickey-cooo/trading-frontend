const recent = new Map<string, { at: number; promise: Promise<unknown> }>();

// Components that poll the same endpoint share one request made within ttlMs.
export function shared<T>(key: string, load: () => Promise<T>, ttlMs = 1500): Promise<T> {
  const hit = recent.get(key);
  if (hit && Date.now() - hit.at < ttlMs) return hit.promise as Promise<T>;
  const promise = load();
  recent.set(key, { at: Date.now(), promise });
  // a failure must not be replayed to the next caller
  promise.catch(() => recent.get(key)?.promise === promise && recent.delete(key));
  return promise;
}
