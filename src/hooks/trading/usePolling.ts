"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getErrorMessage } from "@/lib/axios/client";

interface Polled<T> {
  data: T | undefined;
  error: string | undefined;
  loading: boolean;
  reload: () => void;
}

// Runs `fetcher` now and every `intervalMs`. Keeps the last good data across failures,
// but drops it when `key` changes so one pair's data never shows under another.
// `refreshSignal` refetches without dropping.
// `enabled` false pauses it (e.g. signed out). The latest fetcher is always used.
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  enabled = true,
  key: string = "",
  refreshSignal = 0, // bump to refetch now while keeping the data on screen
): Polled<T> {
  const [state, setState] = useState<{ key: string; data?: T; error?: string }>({ key });
  const [tick, setTick] = useState(0);
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    const run = async () => {
      try {
        const data = await fetcherRef.current();
        if (!cancelled) setState({ key, data });
      } catch (e) {
        if (!cancelled)
          setState((s) => ({ key, data: s.key === key ? s.data : undefined, error: getErrorMessage(e) }));
      }
      if (!cancelled && intervalMs > 0) timer = setTimeout(run, intervalMs);
    };
    run();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [intervalMs, enabled, key, tick, refreshSignal]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  const current = state.key === key;
  const data = current ? state.data : undefined;
  const error = current ? state.error : undefined;
  return { data, error, loading: enabled && data === undefined && error === undefined, reload };
}
