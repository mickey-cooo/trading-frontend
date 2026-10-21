"use client";

import Alert from "@mui/material/Alert";
import { useMarketHours } from "@/hooks/trading/useMarketHours";

// Shown while trading is closed; the backend refuses new orders then (cancelling still works).
export function MarketHoursBanner() {
  const { data } = useMarketHours();
  if (!data || data.isOpen) return null;
  const opensAt = data.nextChange
    ? new Date(data.nextChange).toLocaleString([], { weekday: "short", hour: "2-digit", minute: "2-digit" })
    : undefined;
  return (
    <Alert severity="warning" sx={{ mb: 1.5 }}>
      Market is closed. Trading is open {data.open}–{data.close} UTC
      {opensAt ? `, next opening ${opensAt} (your time)` : ""}. New orders are refused and open limit orders wait until then.
    </Alert>
  );
}
