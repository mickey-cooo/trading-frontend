import { toNumber } from "@/lib/format";
import type { Candle } from "@/types/trading";

export interface Stats24h {
  change: number; // percent
  high: number;
  low: number;
  hours: number; // how many 1h candles back this covers (<24 for a young market)
}

// Derived from the last 24 one-hour candles; the API has no ticker endpoint.
export function stats24h(hourly: Candle[], lastPrice?: number): Stats24h | null {
  if (hourly.length === 0) return null;
  const last = lastPrice ?? toNumber(hourly[hourly.length - 1].close);
  const open = toNumber(hourly[0].open);
  return {
    change: open > 0 ? ((last - open) / open) * 100 : NaN,
    high: Math.max(...hourly.map((c) => toNumber(c.high))),
    low: Math.min(...hourly.map((c) => toNumber(c.low))),
    hours: hourly.length,
  };
}
