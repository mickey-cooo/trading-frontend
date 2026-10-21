import { useSyncExternalStore } from "react";

const KEY = "favoritePairs";
const listeners = new Set<() => void>();
let cache: string | null | undefined;

function raw() {
  if (cache === undefined) {
    try {
      cache = localStorage.getItem(KEY);
    } catch {
      cache = null;
    }
  }
  return cache;
}

function parse(json: string | null = raw()): string[] {
  try {
    const v = JSON.parse(json ?? "[]");
    return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function toggleFavorite(pair: string) {
  const set = new Set(parse());
  if (!set.delete(pair)) set.add(pair);
  cache = JSON.stringify([...set]);
  try {
    localStorage.setItem(KEY, cache);
  } catch {
    // storage blocked: the star still works for this session
  }
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

const EMPTY = "[]";
// the snapshot is the raw JSON string, so React sees a stable value between changes
export function useFavorites(): string[] {
  const json = useSyncExternalStore(subscribe, () => raw() ?? EMPTY, () => EMPTY);
  return parse(json);
}
