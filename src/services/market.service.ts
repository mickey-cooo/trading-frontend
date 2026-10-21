import { apiClient } from "@/lib/axios/client";
import { shared } from "@/lib/shared";
import type { Candle, CandleInterval, Market, MarketHours, Quote } from "@/types/trading";

export const getMarketHours = () =>
  shared("hours", async () => (await apiClient.get<MarketHours>("/markets/hours")).data);

export const getMarkets = () =>
  shared("markets", async () => (await apiClient.get<Market[]>("/markets")).data);

export const getQuote = (pair: string) =>
  shared(`quote:${pair}`, async () => (await apiClient.get<Quote>(`/markets/${encodeURIComponent(pair)}/quote`)).data);

export function getCandles(pair: string, interval: CandleInterval, limit = 300, signal?: AbortSignal) {
  const load = async () =>
    (await apiClient.get<Candle[]>(`/markets/${encodeURIComponent(pair)}/candles`, { params: { interval, limit }, signal })).data;
  // a cancellable request is not shared: one caller's abort would fail the others
  return signal ? load() : shared(`candles:${pair}:${interval}:${limit}`, load);
}
