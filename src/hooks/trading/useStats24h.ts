"use client";

import { stats24h } from "@/lib/stats";
import { getCandles } from "@/services/market.service";
import { usePolling } from "./usePolling";

export function useStats24h(pair: string | undefined, lastPrice?: number) {
  const { data } = usePolling(
    async () => (await getCandles(pair!, "1h", 24)),
    60_000,
    !!pair,
    pair,
  );
  return { stats: data ? stats24h(data, lastPrice) : null, hourly: data };
}
