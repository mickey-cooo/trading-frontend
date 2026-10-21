"use client";

import { useEffect, useState } from "react";
import { getErrorMessage } from "@/lib/axios/client";
import { API_BASE_URL } from "@/lib/config";
import { getCandles } from "@/services/market.service";
import type { Candle, CandleInterval } from "@/types/trading";

export interface Print {
  id: number;
  at: number; // ms, when the client received it
  price: number;
  dir: 1 | -1;
}

export interface CandleFeed {
  prints: Print[]; // price moves seen on the stream, newest first
  history: Candle[]; // snapshot, replaced when pair or interval changes
  tick: Candle | undefined; // newest candle from the live stream
  live: boolean;
  loading: boolean; // true until the first snapshot settles, so an empty history can mean "no data"
  error: string | undefined;
}

const CANDLE_LIMIT = 500;
const STEP_SECONDS: Record<CandleInterval, number> = { "1m": 60, "5m": 300, "1h": 3600 };
// one identity for "no data yet", so effects keyed on `history` do not re-run on every render of a switch
const NO_DATA: CandleFeed["history"] = [];
const NO_PRINTS: Print[] = [];

const RETRY_MS = [1000, 2000, 5000, 10000, 30000];
const retryDelay = (attempt: number) => RETRY_MS[Math.min(attempt, RETRY_MS.length - 1)];

// the chart rejects unordered or repeated times; the later of two candles with one time wins
const byTime = (list: Candle[]) => [...new Map(list.map((c) => [c.time, c])).values()].sort((a, b) => a.time - b.time);

// History over REST, then the backend's SSE stream (one candle JSON per committed quote).
export function useCandleFeed(pair: string | undefined, interval: CandleInterval): CandleFeed {
  const [state, setState] = useState<CandleFeed & { key: string }>({
    key: "",
    history: [],
    tick: undefined,
    prints: [],
    live: false,
    loading: true,
    error: undefined,
  });
  const key = `${pair}:${interval}`;

  useEffect(() => {
    if (!pair) return;
    let cancelled = false;
    let source: EventSource | undefined;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const abort = new AbortController();
    const url = `${API_BASE_URL}/markets/${encodeURIComponent(pair)}/stream?interval=${interval}`;
    const fetchHistory = () => getCandles(pair, interval, CANDLE_LIMIT, abort.signal).then(byTime);

    // outside stream(): each reconnect calls stream() again and must keep counting
    let failures = 0;
    const stream = (newest: number | undefined) => {
      const es = new EventSource(url);
      source = es;
      let dropped = false;
      // the stream only sends the newest candle, so refill what a gap missed
      const refill = () =>
        fetchHistory()
          .then((fresh) => {
            if (cancelled) return;
            newest = fresh.at(-1)?.time;
            setState((s) => (s.key === key ? { ...s, history: fresh } : s));
          })
          .catch(() => {
            dropped = true; // retry on the next reconnect
          });
      es.onopen = () => {
        failures = 0;
        setState((s) => (s.key === key ? { ...s, live: true } : s));
        if (dropped) {
          dropped = false;
          refill();
        }
      };
      es.onerror = () => {
        dropped = true;
        setState((s) => (s.key === key ? { ...s, live: false } : s));
        // the browser reconnects by itself unless the server answered with an error, which closes it for good
        if (es.readyState === EventSource.CLOSED) {
          es.close();
          timer = setTimeout(() => !cancelled && stream(newest), retryDelay(failures++));
        }
      };
      es.onmessage = (e) => {
        try {
          const tick = JSON.parse(e.data) as Candle;
          const price = Number(tick.close);
          if (!Number.isFinite(tick.time) || !Number.isFinite(price)) return;
          // a candle skipped between the snapshot and the first frame is never streamed, so fetch it
          if (newest !== undefined && tick.time - newest > STEP_SECONDS[interval]) refill();
          newest = Math.max(newest ?? 0, tick.time);
          setState((s) => {
            if (s.key !== key) return s;
            const last = s.prints[0];
            if (last && last.price === price) return { ...s, tick };
            const dir: 1 | -1 = !last || price >= last.price ? 1 : -1;
            const next = { id: (last?.id ?? 0) + 1, at: Date.now(), price, dir };
            return { ...s, tick, prints: [next, ...s.prints].slice(0, 40) };
          });
        } catch {
          // a malformed frame is skipped; the next quote sends a fresh candle
        }
      };
    };

    const load = (attempt: number) => {
      fetchHistory()
        .then((history) => {
          if (cancelled) return;
          setState({ key, history, tick: history.at(-1), prints: [], live: false, loading: false, error: undefined });
          stream(history.at(-1)?.time);
        })
        .catch((e) => {
          if (cancelled) return;
          setState({ key, history: [], tick: undefined, prints: [], live: false, loading: false, error: getErrorMessage(e) });
          timer = setTimeout(() => load(attempt + 1), retryDelay(attempt));
        });
    };
    load(0);

    return () => {
      cancelled = true;
      abort.abort();
      clearTimeout(timer);
      source?.close();
    };
  }, [pair, interval, key]);

  // a stale snapshot for another pair/interval must never reach the chart
  return state.key === key
    ? state
    : { history: NO_DATA, tick: undefined, prints: NO_PRINTS, live: false, loading: pair !== undefined, error: undefined };
}
