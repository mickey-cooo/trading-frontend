"use client";

import { useMarkets } from "./useMarkets";
import { usePolling } from "./usePolling";
import { getQuote } from "@/services/market.service";

// Round-trip time of a real public request (the first market's quote), sampled every 5 s.
export function useApiLatency() {
  const markets = useMarkets();
  const pair = markets.data?.[0]?.pair;
  const { data } = usePolling(
    async () => {
      const t0 = performance.now();
      await getQuote(pair!);
      return Math.round(performance.now() - t0);
    },
    5000,
    !!pair,
    pair,
  );
  return data;
}
