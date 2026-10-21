"use client";

import { getMarkets } from "@/services/market.service";
import { usePolling } from "./usePolling";

export function useMarkets() {
  return usePolling(getMarkets, 60_000);
}
