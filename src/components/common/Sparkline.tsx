"use client";

import { SparkLineChart } from "@mui/x-charts/SparkLineChart";
import { toNumber } from "@/lib/format";
import { usePalette } from "@/theme/usePalette";
import type { Candle } from "@/types/trading";

// Closes of the given candles; green when the window ended higher than it began.
export function Sparkline({ candles, width = 112, height = 36 }: { candles: Candle[]; width?: number; height?: number }) {
  const p = usePalette();
  if (candles.length < 2) return null;
  const data = candles.map((c) => toNumber(c.close));
  const up = data[data.length - 1] >= toNumber(candles[0].open);
  return (
    <SparkLineChart
      data={data}
      width={width}
      height={height}
      color={up ? p.success.main : p.error.main}
      curve="linear"
      yAxis={{ min: Math.min(...data), max: Math.max(...data) }}
      aria-hidden
    />
  );
}
