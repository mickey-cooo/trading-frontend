"use client";

import { isAxiosError } from "axios";
import { getCandles, getQuote } from "@/services/market.service";
import type { Candle, Market, Quote } from "@/types/trading";
import { usePolling } from "./usePolling";

export interface MarketSnapshot {
  market: Market;
  hourly: Candle[];
  quote: Quote | null;
}

// One round trip per market: 24 hourly candles for change/high/low/sparkline, and the quote.
// A market with no quote yet (404) is shown with a dash rather than failing the table.
export function useMarketSnapshots(markets: Market[] | undefined) {
  return usePolling<MarketSnapshot[]>(
    async () => {
      // one failing market is left out instead of blanking every market
      const results = await Promise.allSettled(
        markets!.map(async (market) => {
          const [hourly, quote] = await Promise.all([
            getCandles(market.pair, "1h", 24),
            getQuote(market.pair).catch((e) => {
              if (isAxiosError(e) && e.response?.status === 404) return null;
              throw e;
            }),
          ]);
          return { market, hourly, quote };
        }),
      );
      const ok = results.filter((r) => r.status === "fulfilled").map((r) => r.value);
      const failed = results.find((r) => r.status === "rejected");
      if (failed && ok.length === 0) throw failed.reason;
      return ok;
    },
    15_000,
    !!markets,
    markets?.map((m) => m.pair).join(",") ?? "",
  );
}
