"use client";

import { getMarketHours } from "@/services/market.service";
import { usePolling } from "./usePolling";

export function useMarketHours() {
  return usePolling(getMarketHours, 30_000);
}
